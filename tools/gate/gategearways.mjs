/**
 * WoDX Library 0.21.0 and Interactables 0.40.0 gate (gear by region), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gategearways.mjs?${Date.now()}`)).run()
 * Read-only: it never moves the clock, never changes the homeland, makes nothing and leaves the compendium as the
 * module's own start-up left it.
 *   1. WoDX Library 0.21.0+ and Interactables 0.40.0+, gear.json version 2, the compendium holds the weapons of other lands
 *   2. the compendium's items carry where they are at home (flags.wodx-library.ways): the katana says Japan
 *   3. Gear by era for the Dark Ages in Mexico in 1400 has the macuahuitl and no crossbow; in France in 1300 the
 *      broadsword and no macuahuitl
 *   4. Fill by place and era (api.fill.draw) with a place given: a Japanese draw in 1600 never turns up a rapier, a
 *      Mexican one in 1400 never a crossbow (20 draws each)
 *   5. the Gear window opens with the Lands choice for the scene's land, a fixed list, and Every land shows more
 * Result: Data/wodx-gate/gategearways-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LIB = "wodx-library", INT = "wodx-interactables";

async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const newer = (a, b) => {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for ( let i = 0; i < 3; i++ ) if ( (pa[i] ?? 0) !== (pb[i] ?? 0) ) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return true;
};

async function runGate(K) {
  const R = {started: new Date().toISOString(), steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 4).join(" | ")}); } };
  const t0 = game.time.worldTime;
  const lib = () => game.modules.get(LIB).api, int = () => game.modules.get(INT).api;
  // The Library refreshes the gear compendium on the first GM load after a deploy; wait for it (up to 60 s)
  // so the gate never reads a half-filled compendium.
  const want = (await lib().gear()).version;
  const w0 = Date.now();
  while ( game.settings.get(LIB, "installed") < want && Date.now() - w0 < 60000 ) await sleep(1000);
  R.notes.push(`waited ${Math.round((Date.now() - w0) / 1000)} s for the gear compendium (installed ${game.settings.get(LIB, "installed")}, data ${want})`);

  await step("1. versions", async () => {
    const lv = game.modules.get(LIB).version, iv = game.modules.get(INT).version;
    const data = await lib().gear();
    const idx = await int().fill.index();
    const local = idx.filter(i => i.flags?.[LIB]?.local);
    ok("1. Library 0.21.0+, Interactables 0.40.0+, gear data version 2, the weapons of other lands in the compendium",
      newer(lv, "0.21.0") && newer(iv, "0.40.0") && data.version >= 2 && local.length >= 50, {lv, iv, version: data.version, local: local.length});
  });

  await step("2. ways", async () => {
    const idx = await int().fill.index();
    const k = idx.find(i => i.name === "Katana" && i.flags?.[LIB]?.source === "sorcerers-crusade");
    ok("2. the compendium's katana is at home in Japan only", k?.flags?.[LIB]?.ways?.japanese === null && k?.flags?.[LIB]?.ways?.["*"] === false, {ways: k?.flags?.[LIB]?.ways});
  });

  await step("3. Gear by era by place", async () => {
    const data = await lib().gear(), G = lib().rules;
    const names = (era, where) => new Set(G.forEra(data.items, era, where).map(i => i.name));
    const mex = names("dark-ages", {year: 1400, way: "mesoamerican", region: "mexico"}), fr = names("dark-ages", {year: 1300, way: "latin", region: "france"});
    ok("3. Mexico 1400: macuahuitl, no crossbow; France 1300: broadsword, no macuahuitl",
      mex.has("Macuahuitl") && !mex.has("Crossbow") && fr.has("Broadsword") && !fr.has("Macuahuitl"), {mex: mex.size, fr: fr.size});
  });

  await step("4. the fill", async () => {
    const bad = [];
    for ( let i = 0; i < 20; i++ ) {
      const jp = await int().fill.draw({era: "renaissance", place: "home", container: "chest", count: 6, where: {year: 1600, way: "japanese", region: "japan"}});
      const mx = await int().fill.draw({era: "dark-ages", place: "home", container: "chest", count: 6, where: {year: 1400, way: "mesoamerican", region: "mexico"}});
      bad.push(...jp.filter(x => /rapier|full plate/i.test(x.name)).map(x => `jp:${x.name}`), ...mx.filter(x => /crossbow|broadsword|longbow/i.test(x.name)).map(x => `mx:${x.name}`));
    }
    ok("4. Fill by place and era keeps to the land: no rapier in Japan in 1600, no crossbow in Mexico in 1400", bad.length === 0, {bad});
  });

  await step("5. the window", async () => {
    const here = game.modules.get("wodx-chronicle")?.api?.world?.here?.(canvas?.scene);
    await lib().open();
    await sleep(800);
    const el = document.getElementById("wodx-gear");
    const sel = el?.querySelector("select[name=lands]");
    const countOf = () => el?.querySelectorAll("li.wodx-gear-row").length ?? 0;
    const atHome = countOf();
    let all = atHome;
    if ( sel ) { sel.value = "all"; sel.dispatchEvent(new Event("change")); await sleep(800); all = document.getElementById("wodx-gear")?.querySelectorAll("li.wodx-gear-row").length ?? 0; }
    const fixed = sel?.hasAttribute("data-fixed");
    // put the window back to the scene's land
    const s2 = document.getElementById("wodx-gear")?.querySelector("select[name=lands]");
    if ( s2 ) { s2.value = "here"; s2.dispatchEvent(new Event("change")); await sleep(500); }
    document.getElementById("wodx-gear")?.querySelector("[data-action=close], .header-control[data-action=close]")?.click();
    ok("5. the Gear window shows the scene's land, a fixed Lands list, and Every land shows at least as much",
      (!here?.id && !sel) || (!!sel && fixed && all >= atHome && atHome > 0), {region: here?.id ?? null, atHome, all});
  });

  ok("6. nothing changed: the clock is where it was", game.time.worldTime === t0);
  return save(R, "gategearways-result.json");
}

// The gate kit (B3733): its own scratch scene, cleaned up after.
import {kitRun} from "./kit.mjs";
export const run = kitRun("gategearways", runGate);
