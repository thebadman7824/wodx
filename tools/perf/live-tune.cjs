// Make a world lighter for slow computers, offline, with Foundry STOPPED (the databases must be unlocked).
//
//   node live-tune.cjs <classic-level path> <world folder> <Data folder> <plan|apply|undo> [--twins] [--sharp <sharp path>]
//
// plan   prints what would change and changes nothing.
// apply  makes the changes. Back up the world folder first.
// undo   puts back everything apply changed (it reads what it saved in each document's flags).
//
// What apply does:
//  1. Lights: per scene, keeps the animation on every light that is not a torch (flame, pulse, ghost, fog...)
//     and on the KEEP_TORCHES largest torch lights; the other torches keep their light but stop flickering.
//     The old animation is saved in flags["wodx-perf"].animation.
//  2. Importer modules used only to prepare (IMPORTERS) are turned off. undo turns them back on.
//  3. Token Drag Vision (a world setting) is turned off if the world has it on.
//  4. With --twins: each Penumbra or Shadowlands level background gets a half-size copy (<name>--half.webp,
//     made with sharp next to the original) and the level points at it. The old path is saved in
//     flags["wodx-perf"].src. Originals are never changed or deleted.
const { ClassicLevel } = require(process.argv[2]);
const fs = require("fs"), path = require("path");
const [, , , WORLD, DATA, MODE = "plan", ...rest] = process.argv;
const TWINS = rest.includes("--twins");
const SHARP = rest.includes("--sharp") ? rest[rest.indexOf("--sharp") + 1] : null;
const KEEP_TORCHES = 8;
const IMPORTERS = ["bindery-pdf-importer", "fantasy-town-generator-import", "mkah-compendium-importer", "quick-battlemap-importer", "roll-table-importer"];
const FLAG = "wodx-perf";
if ( !["plan", "apply", "undo"].includes(MODE) ) { console.error("mode must be plan, apply or undo"); process.exit(2); }
const write = MODE !== "plan";
const log = [];
const say = s => { log.push(s); console.log(s); };

async function open(name) {
  const db = new ClassicLevel(path.join(WORLD, "data", name), { valueEncoding: "utf8" });
  await db.open(); // throws when Foundry still holds the lock
  return db;
}
async function all(db) { const out = []; for await (const [k, v] of db.iterator()) out.push([k, JSON.parse(v)]); return out; }
const radius = l => Math.max(Number(l.config?.dim) || 0, Number(l.config?.bright) || 0);
const animType = l => l.config?.animation?.type ?? null;

async function lights(db, names) {
  const rows = (await all(db)).filter(([k]) => k.startsWith("!scenes.lights!"));
  const byScene = {};
  for ( const [k, v] of rows ) (byScene[k.split("!")[2].split(".")[0]] ??= []).push([k, v]);
  let stilled = 0, restored = 0;
  const batch = db.batch();
  for ( const [sid, list] of Object.entries(byScene) ) {
    if ( MODE === "undo" ) {
      for ( const [k, v] of list ) {
        const saved = v.flags?.[FLAG]?.animation;
        if ( saved === undefined ) continue;
        v.config = {...(v.config ?? {}), animation: saved};
        delete v.flags[FLAG].animation;
        if ( !Object.keys(v.flags[FLAG]).length ) delete v.flags[FLAG];
        batch.put(k, JSON.stringify(v)); restored++;
      }
      continue;
    }
    const torches = list.filter(([, v]) => animType(v) === "torch" && v.flags?.[FLAG]?.animation === undefined);
    torches.sort((a, b) => radius(b[1]) - radius(a[1]));
    const still = torches.slice(KEEP_TORCHES);
    if ( still.length ) say(`lights | ${names[sid] ?? sid} | ${list.length} lights, ${torches.length} torches: ${still.length} stop flickering, ${Math.min(KEEP_TORCHES, torches.length)} torches and ${list.filter(([, v]) => animType(v) && animType(v) !== "torch").length} other animated lights keep it`);
    for ( const [k, v] of still ) {
      v.flags = {...(v.flags ?? {}), [FLAG]: {...(v.flags?.[FLAG] ?? {}), animation: v.config.animation}};
      v.config = {...v.config, animation: {...v.config.animation, type: null}};
      batch.put(k, JSON.stringify(v)); stilled++;
    }
  }
  if ( write ) await batch.write(); else batch.close?.();
  say(MODE === "undo" ? `lights: ${restored} restored` : `lights: ${stilled} ${write ? "stopped" : "would stop"} flickering`);
}

async function twins(db, names) {
  let sharp = null;
  if ( MODE === "apply" ) { try { sharp = require(SHARP); } catch (e) { say(`twins: sharp not found at ${SHARP}; skipped`); return; } }
  const rows = (await all(db)).filter(([k]) => k.startsWith("!scenes.levels!"));
  const batch = db.batch(); let n = 0;
  for ( const [k, v] of rows ) {
    const sid = k.split("!")[2].split(".")[0];
    if ( MODE === "undo" ) {
      const saved = v.flags?.[FLAG]?.src;
      if ( !saved ) continue;
      v.background = {...v.background, src: saved};
      delete v.flags[FLAG].src;
      if ( !Object.keys(v.flags[FLAG]).length ) delete v.flags[FLAG];
      batch.put(k, JSON.stringify(v)); n++; continue;
    }
    const src = v.background?.src;
    if ( !src || !/penumbra|shadowlands/i.test(v.name ?? "") || v.flags?.[FLAG]?.src || /--half\.webp$/.test(src) ) continue;
    const half = src.replace(/\.[a-z0-9]+$/i, "") + "--half.webp";
    say(`twins | ${names[sid] ?? sid} | ${v.name}: ${src} -> ${half}`);
    if ( MODE === "apply" ) {
      const from = path.join(DATA, decodeURIComponent(src)), to = path.join(DATA, decodeURIComponent(half));
      if ( !fs.existsSync(to) ) {
        const meta = await sharp(from).metadata();
        await sharp(from).resize(Math.round(meta.width / 2), Math.round(meta.height / 2)).webp({ quality: 82 }).toFile(to);
      }
      v.flags = {...(v.flags ?? {}), [FLAG]: {...(v.flags?.[FLAG] ?? {}), src}};
      v.background = {...v.background, src: half};
      batch.put(k, JSON.stringify(v));
    }
    n++;
  }
  if ( write ) await batch.write(); else batch.close?.();
  say(`twins: ${n} level${n === 1 ? "" : "s"} ${MODE === "undo" ? "restored" : write ? "switched to half size" : "would switch to half size"}`);
}

const STATE = path.join(WORLD, "wodx-perf-state.json");
function readState() { try { return JSON.parse(fs.readFileSync(STATE, "utf8")); } catch { return {modules: [], settings: []}; } }

async function settings() {
  const db = await open("settings");
  const state = readState(); // what apply changed, so undo puts back only that
  const mine = MODE === "undo" ? state : {modules: [...state.modules], settings: [...state.settings]};
  const rows = await all(db);
  const batch = db.batch();
  for ( const [k, v] of rows ) {
    if ( v.key === "core.moduleConfiguration" ) {
      const asString = typeof v.value === "string";
      const conf = asString ? JSON.parse(v.value) : v.value;
      const changed = [];
      for ( const id of (MODE === "undo" ? state.modules : IMPORTERS) ) {
        if ( !(id in conf) ) continue;
        const want = MODE === "undo";
        if ( conf[id] !== want ) { conf[id] = want; changed.push(id); if ( MODE === "apply" && !mine.modules.includes(id) ) mine.modules.push(id); }
      }
      say(`modules: ${changed.length ? changed.join(", ") : "none"} ${MODE === "undo" ? "turned back on" : "turned off"}${write ? "" : " (plan)"}`);
      v.value = asString ? JSON.stringify(conf) : conf;
      if ( changed.length ) batch.put(k, JSON.stringify(v));
    }
    if ( /tokenDrag/i.test(v.key ?? "") && (MODE !== "undo" || state.settings.includes(v.key)) ) {
      const val = typeof v.value === "string" ? JSON.parse(v.value) : v.value;
      const want = MODE === "undo";
      say(`setting ${v.key} is ${JSON.stringify(val)}${typeof val === "boolean" && val !== want ? `: set to ${want}` : ""}`);
      if ( typeof val === "boolean" && val !== want ) { if ( MODE === "apply" && !mine.settings.includes(v.key) ) mine.settings.push(v.key); v.value = typeof v.value === "string" ? JSON.stringify(want) : want; batch.put(k, JSON.stringify(v)); }
    }
  }
  if ( write ) await batch.write(); else batch.close?.();
  await db.close();
  if ( MODE === "apply" ) fs.writeFileSync(STATE, JSON.stringify(mine, null, 1));
  if ( MODE === "undo" ) fs.rmSync(STATE, {force: true});
}

(async () => {
  say(`live-tune ${MODE} on ${WORLD} at ${new Date().toISOString()}`);
  const scenes = await open("scenes");
  const names = {};
  for ( const [k, v] of await all(scenes) ) { const m = k.match(/^!scenes!(\w+)$/); if ( m ) names[m[1]] = v.name; }
  await lights(scenes, names);
  if ( TWINS || MODE === "undo" ) await twins(scenes, names);
  await scenes.close();
  await settings();
  if ( write ) fs.writeFileSync(path.join(WORLD, `wodx-perf-${MODE}-${Date.now()}.log`), log.join("\n") + "\n");
  say("done");
})().catch(e => { console.error("live-tune error:", e.message); process.exit(1); });
