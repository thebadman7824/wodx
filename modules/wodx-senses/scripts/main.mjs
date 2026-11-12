/**
 * WoDX Senses (the version is in module.json): what a character sees, hears, smells and feels, answered in chat.
 *
 *   Asking     /look, /listen, /smell, /touch, or /sense for all four (a word after it puts lines about that first:
 *              "/look door"). The player toolbar button "What do I notice?" opens the same choice. A plain question in
 *              chat ("what do I smell?") gets a small button under it that asks for the player.
 *   Answering  The active Storyteller's client puts the answer together (senses-rules.mjs) from the place's lines, the
 *              hour, sky, moon and calendar, the live sources on the map (lights, fire, doors, people, noise,
 *              hiding places, traps, clues, and anything another module adds through the hook wodxSensesGather),
 *              trimmed by light, walls and distance. A plain look is free; Look closer rolls Perception + Alertness,
 *              blind, and each success adds a line. The answer is whispered to the player, with Share; the
 *              Storyteller gets a fuller copy with the roll, each line's need and what was held back.
 *   Remembered The answer is kept on the character for that place, hour and sense: asking again repeats it until
 *              the hour turns, the character moves, or something there changes.
 *   Powers     Heightened Senses (Auspex, the Gift), Eyes of the Cat, wolf forms, Sense Wyrm, Sense the Unnatural,
 *              Scent of the True Form, Awareness and its like, Spheres at 1, the fae sight, hunter second sight and a
 *              wraith's senses in the Shadowlands. The Penumbra and Shadowlands have lines of their own.
 *   Places     The Storyteller's own lines for a scene or region (the Place senses window), indoors or out, and the
 *              Penumbra's resonance there. Kinds of place come from WoDX NPC's place tags.
 * Nothing here changes the world, so nothing goes through the approval queue.
 */
import * as R from "./senses-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";
import {registerPerceptionSettings, setupPerception, refreshScreen} from "./perception.mjs";
import {registerQuiet, applyQuiet, quietCard} from "./quiet.mjs";
import {registerSight, setupSight, cycleSight, colourSafe} from "./sight.mjs";


const MOD = "wodx-senses";
const VERSION = "0.7.0";
const SOCKET = `module.${MOD}`;
const num = v => Number(v) || 0;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const H3 = "background:none!important;border:0!important;box-shadow:none!important;color:inherit!important";
const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const isActiveGM = () => game.user.isGM && (game.users.activeGM ? game.users.activeGM.id === game.user.id : true);
const modOn = id => !!game.modules.get(id)?.active;
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : "";
const TABLES = {places: null, conditions: null, sources: null, otherworlds: null, channels: null};
const NOISES = [];

/* ------------------------------------------------------------------ */
/*  Settings and data                                                  */
/* ------------------------------------------------------------------ */

function registerSettings() {
  game.settings.register(MOD, "mode", {
    name: "Sense answers", hint: "Send at once: the player gets the answer straight away. Storyteller reviews first: the Storyteller's copy waits with a Send button. Off: nobody can ask.",
    scope: "world", config: true, type: String, default: "send",
    choices: {send: "Send at once", review: "Storyteller reviews first", off: "Off"}
  });
  game.settings.register(MOD, "questionButton", {
    name: "Offer an answer under questions in chat", hint: "When a player writes a question like \"what do I smell?\", a small button under it asks for them. It never rolls by itself.",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(MOD, "arrival", {
    name: "Describe a place when the party arrives", hint: "When the Storyteller activates a scene, post what anyone would notice there for everyone to read.",
    scope: "world", config: true, type: Boolean, default: false
  });
}

async function loadTables() {
  const get = async f => { try { const r = await fetch(`modules/${MOD}/data/${f}`); return r.ok ? r.json() : null; } catch (e) { return null; } };
  const [places, world] = await Promise.all([get("places.json"), get("world.json")]);
  TABLES.places = places ?? {kinds: {}};
  Object.assign(TABLES, {conditions: world?.conditions ?? {}, sources: world?.sources ?? {}, otherworlds: world?.otherworlds ?? {}, channels: world?.channels ?? {}});
  if ( !places || !world ) console.warn(`${MOD} | the line tables did not load`);
}

/* ------------------------------------------------------------------ */
/*  Reading the world                                                  */
/* ------------------------------------------------------------------ */

const chron = () => game.modules.get("wodx-chronicle")?.api;
const centerOf = (td, scene) => {
  const g = scene?.grid?.size ?? canvas?.grid?.size ?? 100;
  return {x: num(td.x) + num(td.width || 1) * g / 2, y: num(td.y) + num(td.height || 1) * g / 2};
};
const regionEl = r => { const e = r?.elevation?.bottom; return Number.isFinite(e) ? e : 0; };
const inRegion = (r, p) => { try { return !!r.testPoint({x: p.x, y: p.y, elevation: regionEl(r)}, regionEl(r)); } catch (e) { return false; } };
const onCanvas = scene => canvas?.ready && canvas.scene?.id === scene?.id;

function yardsBetween(a, b, scene) {
  try {
    if ( onCanvas(scene) ) {
      const units = scene.grid?.units ?? "ft";
      const d = canvas.grid.measurePath([a, b]).distance;
      return /m|meter|metre|yd|yard/i.test(units) ? d : d / 3;
    }
  } catch (e) { /* below */ }
  const g = scene?.grid?.size ?? 100, dist = num(scene?.grid?.distance) || 5, units = scene?.grid?.units ?? "ft";
  const d = Math.hypot(a.x - b.x, a.y - b.y) / g * dist;
  return /m|meter|metre|yd|yard/i.test(units) ? d : d / 3;
}
function wallsBetween(a, b, scene) {
  if ( !onCanvas(scene) ) return 0;
  try {
    const hits = CONFIG.Canvas.polygonBackends.sound.testCollision(a, b, {type: "sound", mode: "all"});
    return Array.isArray(hits) ? hits.length : hits ? 1 : 0;
  } catch (e) { return 0; }
}
function sightBlocked(a, b, scene) {
  if ( !onCanvas(scene) ) return false;
  try { return !!CONFIG.Canvas.polygonBackends.sight.testCollision(a, b, {type: "sight", mode: "any"}); } catch (e) { return false; }
}
/** Is a point inside one of the scene's lights (or under the scene's global light)? */
function litAt(p, scene) {
  if ( !onCanvas(scene) ) return false;
  try {
    if ( canvas.environment?.globalLightSource?.active ) return true;
    for ( const s of canvas.effects?.lightSources ?? [] ) {
      if ( !s?.active || s.isPreview ) continue;
      if ( /darkness/i.test(s.constructor?.name ?? "") ) continue;
      if ( s.shape?.contains?.(p.x, p.y) ) return true;
    }
  } catch (e) { /* none */ }
  return false;
}

/** The place under a point: a tagged region first, else the scene. {kind, io, resonance, own, replace, name, id} */
function placeAt(scene, p) {
  const read = doc => ({...(doc.flags?.[MOD] ?? {}), kind: doc.flags?.["wodx-npc"]?.place?.kind ?? ""});
  for ( const r of scene?.regions ?? [] ) {
    const f = r.flags ?? {};
    if ( !(f[MOD] || f["wodx-npc"]?.place) ) continue;
    if ( inRegion(r, p) ) { const o = read(r); return {...o, kind: o.kind || read(scene).kind || "other", name: r.name, id: `r.${r.id}`}; }
  }
  const o = read(scene);
  return {...o, kind: o.kind || guessKind(scene?.navName || scene?.name) || "other", name: scene?.navName || scene?.name || "", id: `s.${scene?.id}`};
}
let guessPlace = null;
const guessKind = name => { try { return guessPlace?.(name) || ""; } catch (e) { return ""; } };

function timeNow() {
  try {
    const lat = game.settings.get("wodx-chronicle", "latitude");
    return CAL.describeTime(game.time.worldTime, lat);
  } catch (e) { return null; }
}
let CAL = null;
const hoursOf = s => { const m = String(s ?? "").match(/(\d+):(\d+)/); return m ? num(m[1]) + num(m[2]) / 60 : null; };

function moment(scene, p) {
  const t = timeNow();
  const hours = t ? num(t.hour) + num(t.minute) / 60 : 0;
  const part = R.partOfDay({hours, sunrise: hoursOf(t?.sunrise), sunset: hoursOf(t?.sunset), isNight: t?.isNight ?? true});
  const place = placeAt(scene, p);
  const indoor = R.isIndoor(place);
  let sky = "clear";
  try { sky = game.settings.get("wodx-actions", "sky") || "clear"; } catch (e) { /* clear */ }
  // WoDX Atmosphere's weather, when it is on: its tags pick the weather lines and steps
  let weather = null;
  try { weather = modOn("wodx-atmosphere") ? (game.modules.get("wodx-atmosphere")?.api?.weather?.now?.() ?? null) : null; } catch (e) { weather = null; }
  if ( weather?.sky ) sky = weather.sky;
  const moon = R.moonWord(t?.moon?.index);
  const year = num(t?.year) || num(chron()?.eras?.currentYear?.());
  const darkness = num(scene?.environment?.darknessLevel ?? scene?.darkness);
  const lit = litAt(p, scene);
  const light = R.lightLevel({daylight: darkness < 0.5 && part !== "night", lit, indoor, moon: num(t?.moon?.illumination), part, sky, darkness});
  let feast = null, curfew = false;
  try {
    const RR = game.modules.get("wodx-npc")?.api?.routineRules;
    const CH = game.modules.get("wodx-chronicle")?.api?.church;
    if ( RR && t ) {
      // The whole date (with its day number), so the feasts counted from Easter are found too
      const extra = [...(RR.parseFeasts?.(game.settings.get("wodx-npc", "feasts") ?? "") ?? []), ...(CH?.extra?.() ?? [])];
      feast = RR.feastOn?.({year: t.year, month: t.month, day: t.day, calendar: t.calendar, jdn: t.jdn}, extra) ?? null;
      const c = CH?.on?.(t);
      let start = 21;
      try { start = Number(game.settings.get("wodx-npc", "curfewStart")) || 21; } catch (e) { start = 21; }
      if ( c?.active && c.curfewStart ) start = Math.max(start, c.curfewStart);
      curfew = !!RR.isCurfew?.({hour: t.hour, minute: t.minute, isNight: t.isNight}, start);
    }
  } catch (e) { /* no calendar extras */ }
  return {t, hours, hour: Math.floor(hours), part, place, indoor, sky, moon, era: R.eraBand(year), year, light, feast, curfew, viewing: onCanvas(scene),
    wx: weather ? weather.tags : null, heavy: weather?.intensity === "heavy", weather};
}

/** The world layer a token stands in: physical, penumbra or shadowlands. */
function layerOf(td) {
  try {
    const lvl = td?.parent?.levels?.get?.(td._source?.level ?? td.level);
    return lvl?.flags?.["wodx-otherworlds"]?.layer ?? "physical";
  } catch (e) { return "physical"; }
}

/* ---- the character ---- */

const attrOf = (actor, k) => { const a = actor?.system?.attributes?.[k]; return a ? num(a.total ?? a.value) : 0; };
function abilityOf(actor, key) {
  let v = num(actor?.system?.abilities?.[key]?.value);
  for ( const i of actor?.items ?? [] ) {
    if ( i.type !== "Ability" && !(i.type === "Trait" && String(i.system?.type ?? "").includes("secondability")) ) continue;
    const k = String(i.system?.id || i.name || "").trim().toLowerCase().replace(/[\s-]+/g, "");
    if ( k === key ) v = Math.max(v, num(i.system?.value));
  }
  return v;
}
const powerDots = (actor, re) => {
  let best = 0;
  for ( const i of actor?.items ?? [] ) if ( i.type === "Power" && re.test(String(i.name ?? "").trim()) ) best = Math.max(best, num(i.system?.value) || 1);
  return best;
};
const hasPower = (actor, re) => (actor?.items ?? []).some(i => i.type === "Power" && re.test(String(i.name ?? "").trim()));
const kindOf = actor => { try { return game.wodxActions?.getKind?.(actor) ?? "mortal"; } catch (e) { return "mortal"; } };
const formOf = actor => {
  const sh = actor?.system?.shapes ?? {};
  for ( const k of ["homid", "glabro", "crinos", "hispo", "lupus"] ) if ( sh?.[k]?.isactive ) return k;
  return "homid";
};
/** The body plan's senses (WoDX Combat 3.13.0): "wolf" or "bat" for a vampire in Shape of the Beast, and the like. */
const bodySensesOf = actor => { try { return game.wodxCombat?.body?.of?.(actor)?.senses ?? null; } catch (e) { return null; } };
const secondSightOn = (actor, scene) => {
  try { return actor?.flags?.["wodx-actions"]?.sightScene === `${scene?.id ?? "none"}:${num(game.settings.get("wodx-actions", "wraithScene"))}`; } catch (e) { return false; }
};

export function traitsOf(actor, {scene = null, layer = "physical", useAuspex = true} = {}) {
  const sp = actor?.system?.spheres ?? {};
  return {
    perception: attrOf(actor, "perception"), alertness: abilityOf(actor, "alertness"), awareness: abilityOf(actor, "awareness"),
    kenning: abilityOf(actor, "kenning"), primalUrge: abilityOf(actor, "primalurge"),
    auspex: powerDots(actor, /^(auspex|aura perception)$/i), useAuspex,
    heightened: hasPower(actor, /^heightened senses$/i) && kindOf(actor) === "lupine",
    eyesOfCat: hasPower(actor, /^eyes of the cat$/i), senseWyrm: hasPower(actor, /^sense wyrm$/i),
    senseUnnatural: hasPower(actor, /^sense the unnatural$/i), trueForm: hasPower(actor, /^scent of the true form$/i),
    form: formOf(actor), body: bodySensesOf(actor), kind: kindOf(actor), layer, fae: kindOf(actor) === "fae", secondSight: secondSightOn(actor, scene),
    spheres: {life: num(sp.life?.value), spirit: num(sp.spirit?.value), entropy: num(sp.entropy?.value), prime: num(sp.prime?.value)},
    woundPenalty: actor?.system?.conditions?.isignoringpain ? 0 : num(actor?.system?.health?.damage?.woundpenalty),
    // merits and flaws from WoDX Chronicle's trait table: Acute Sense, Bad Sight, Blind, Deaf, Medium, Deathsight
    traitSenses: (() => { try { return chron()?.traits?.senses?.(actor) ?? null; } catch (e) { return null; } })()
  };
}

/* ------------------------------------------------------------------ */
/*  Gathering the live sources                                         */
/* ------------------------------------------------------------------ */

const linesFor = (key, sense) => (TABLES.sources?.[key]?.[sense] ?? []);

/**
 * Everything on the map that gives something off. A source: {id, key, at: {x, y}, loud, strong, glows, need, vars, secret, name}.
 * Another module adds its own by answering the hook: Hooks.on("wodxSensesGather", ({scene, token, actor, sources}) => sources.push(...)).
 */
export function gatherSources(scene, td, actor) {
  const out = [];
  const me = centerOf(td, scene);
  const IX = scene?.tiles ?? [];
  // Interactables tiles, read through its own rules so the meaning stays the same
  for ( const tile of IX ) {
    const f = tile.flags?.["wodx-interactables"];
    if ( !f || !IR ) continue;
    const at = {x: num(tile.x) + num(tile.width) / 2, y: num(tile.y) + num(tile.height) / 2};
    try {
      if ( f.light ) {
        const lights = lightsNear(tile, scene);
        const o = IR.describeLight(f, {on: lights.some(l => !l.hidden), count: lights.length});
        if ( o.on ) out.push({id: `light.${tile.id}:on`, key: `light.${o.kind}`, at, glows: true, loud: "quiet", name: o.title});
      } else if ( f.hazard ) {
        const o = IR.describeHazard(f);
        if ( o.kind === "fire" && o.live ) out.push({id: `fire.${tile.id}`, key: "fire", at, glows: true, strong: true, loud: "normal", name: o.title});
        else if ( o.kind === "brazier" && o.live ) out.push({id: `fire.${tile.id}`, key: "fire", at, glows: true, strong: true, loud: "normal", name: o.title});
        else if ( o.kind === "brazier" && f.burning !== false ) out.push({id: `brazier.${tile.id}`, key: "brazier", at, glows: true, loud: "quiet", name: o.title});
        else if ( o.live ) out.push({id: `${o.kind}.${tile.id}`, key: o.kind, at, loud: "quiet", name: o.title});
      } else if ( f.hide ) {
        const o = IR.describeHide(f);
        if ( o.occupants.length ) {
          const need = Math.min(...o.occupants.map(occ => IR.hideNeed(o, occ)));
          out.push({id: `hidden.${tile.id}:${o.occupants.length}`, key: "hidden", at, loud: "quiet", need: need + 1, secret: true, name: o.title || IR.HIDES[o.kind]?.label});
        }
      } else if ( f.trap ) {
        const o = IR.describeTrap(f);
        if ( o.armed && !o.found ) out.push({id: `trap.${tile.id}`, key: "trap", at, need: 1 + num(IR.TRAP_GRADES[o.grade]?.hide), secret: true, name: IR.TRAPS?.[o.kind]?.label ?? "A trap"});
      } else if ( f.clue ) {
        const o = IR.describeClue(f);
        const label = o.title || IR.CLUES?.[o.kind]?.label || "Something";
        if ( tile.hidden && !o.found ) out.push({id: `clue.${tile.id}`, key: "clue", at, need: o.need, secret: true, vars: {name: label}, name: label});
        else out.push({id: `clue.${tile.id}`, key: "clue", at, vars: {name: label}, name: label});
      }
    } catch (e) { console.warn(`${MOD} | could not read tile ${tile.id}`, e); }
  }
  // Doors standing open or broken
  const DS = CONST.WALL_DOOR_STATES ?? {OPEN: 1};
  for ( const w of scene?.walls ?? [] ) {
    if ( !(w.door > 0) ) continue;
    const at = {x: (num(w.c[0]) + num(w.c[2])) / 2, y: (num(w.c[1]) + num(w.c[3])) / 2};
    if ( Math.hypot(at.x - me.x, at.y - me.y) > (scene.grid?.size ?? 100) * 6 ) continue;
    const broken = !!w.flags?.["wodx-interactables"]?.broken;
    if ( broken ) out.push({id: `door.${w.id}:broken`, key: "door.broken", at});
    else if ( w.ds === DS.OPEN ) out.push({id: `door.${w.id}:open`, key: "door.open", at});
  }
  // People: visible tokens, and what each is doing
  const seen = [];
  for ( const t of scene?.tokens ?? [] ) {
    if ( t.id === td.id || !t.actor ) continue;
    const at = centerOf(t, scene);
    const veil = veiledBy(t);
    if ( t.hidden || obfuscated(t) || invisible(t) || veil ) {
      if ( veil && !t.hidden && !obfuscated(t) ) out.push({id: `veil.${t.id}`, key: "veiled", at, secret: true, name: t.name, diff: veil});
      if ( obfuscated(t) ) out.push({id: `obf.${t.id}`, key: "obfuscated", at, secret: true, name: t.name, obf: powerDots(t.actor, /^obfuscate$/i) || 1, kind: kindOf(t.actor)});
      continue;
    }
    seen.push({t, at});
    // what others can sense about this one: Smell of the Grave, Glowing Eyes, Cold Breeze and the like (WoDX Chronicle)
    try {
      for ( const sh of chron()?.traits?.shows?.(t.actor) ?? [] ) {
        if ( sh.indoor && !R.isIndoor(placeAt(scene, at) ?? {}) ) continue;
        out.push({id: `shows.${t.id}.${sh.key}`, key: `shows.${sh.key}`, lines: sh.lines, at, glows: sh.glows, strong: sh.strong, loud: "quiet", name: `${t.name}: ${sh.name}`, person: true});
      }
    } catch (e) { console.warn(`${MOD} | trait signs`, e); }
    const act = t.actor.flags?.["wodx-npc"]?.where?.activity;
    if ( act && TABLES.sources?.[`activity.${act}`] ) out.push({id: `act.${t.id}:${act}`, key: `activity.${act}`, at, loud: act === "sleep" || act === "hunt" || act === "hide" ? "quiet" : "normal", name: t.name, person: true});
  }
  if ( seen.length ) out.push({id: `people:${seen.length}`, key: "people", at: me, people: seen.map(s => s.at), vars: {people: R.peopleWord(seen.length)}});
  // Recent noise from Interactables (the last few minutes, on this scene)
  const now = Date.now();
  for ( const n of NOISES ) if ( n.scene === scene?.id && now - n.at < 3 * 60000 && n.noise !== "silent" ) {
    out.push({id: `noise.${n.at}`, key: n.noise === "loud" ? "noise.loud" : "noise.quiet", at: n.pos, loud: n.noise === "loud" ? "loud" : "normal"});
  }
  // Presences of the supernatural, for the channels
  const presences = [];
  for ( const t of scene?.tokens ?? [] ) {
    if ( t.id === td.id || !t.actor ) continue;
    presences.push({at: centerOf(t, scene), kind: kindOf(t.actor), wyrm: !!t.actor.flags?.[MOD]?.wyrm, hurt: num(t.actor.system?.health?.damage?.woundlevel) > 0 || num(t.actor.system?.health?.damage?.woundpenalty) < 0, name: t.name});
  }
  const extra = [];
  try { Hooks.callAll("wodxSensesGather", {scene, token: td, actor, sources: extra}); } catch (e) { console.error(`${MOD} |`, e); }
  for ( const s of extra ) if ( s && s.id && (s.key || s.lines) ) out.push(s);
  return {sources: out, presences, me};
}
const invisible = t => !!t.actor?.statuses?.has?.("invisible");
/** A Veil keyword on the token's actor (WoDX Actions): the difficulty to notice them, or 0. */
const veiledBy = t => {
  const e = (t.actor?.effects ?? []).find?.(x => !x.disabled && x.flags?.["wodx-chronicle"]?.timed?.key === "wodx-effect-veil");
  return e ? (num(e.flags["wodx-chronicle"].timed.data?.difficulty) || 7) : 0;
};
const obfuscated = t => !!t.actor?.statuses?.has?.("wodx-obfuscated") || !!chron()?.conditions?.hasCondition?.(t.actor, "obfuscated");
let IR = null;
/** The scene's own lights a light tile works: the ones it names, else those on or next to it (as Interactables reads them). */
function lightsNear(tile, scene) {
  const all = [...(scene?.lights ?? [])];
  const set = String(tile.flags?.["wodx-interactables"]?.lightIds ?? "").split(/[\s,;]+/).filter(Boolean);
  const g = scene?.grid?.size ?? 100, x = num(tile.x), y = num(tile.y), w = num(tile.width), h = num(tile.height);
  const near = l => l.x >= x - g && l.x <= x + w + g && l.y >= y - g && l.y <= y + h + g;
  return all.filter(l => !l.flags?.["wodx-otherworlds"]?.twinOf && (set.length ? set.includes(l.id) : near(l)));
}

/* ------------------------------------------------------------------ */
/*  Putting an answer together (on the active Storyteller's client)    */
/* ------------------------------------------------------------------ */

async function rollPool(dice, diff) {
  const roll = new Roll(`${Math.max(0, dice)}d10`);
  await roll.evaluate();
  const faces = roll.dice[0]?.results?.map(x => x.result) ?? [];
  let hits = 0, ones = 0;
  for ( const f of faces ) { if ( f >= diff ) hits++; if ( f === 1 ) ones++; }
  return {roll, faces, successes: Math.max(0, hits - ones), botch: hits === 0 && ones > 0, dice, diff};
}

function sourceLines(sense, src, ctx, pw, gathered) {
  const out = [];
  const t = ctx.traits;
  for ( const s of src ) {
    if ( s.key === "people" ) {
      if ( sense !== "sight" ) continue;
      const visible = (s.people ?? []).filter(at => R.reachOf("sight", {yards: yardsBetween(gathered.me, at, ctx.scene), sightBlocked: sightBlocked(gathered.me, at, ctx.scene)}, {light: ctx.light, darkSight: !!pw.darkSight}) !== null).length;
      if ( !visible ) continue;
      for ( const l of linesFor("people", sense) ) out.push({...l, id: s.id, vars: {people: R.peopleWord(visible)}});
      continue;
    }
    if ( s.key === "obfuscated" ) {
      const chk = R.obfuscateCheck(t.auspex, s.obf, {secondSight: t.secondSight});
      if ( sense !== "sight" || !chk.canTry ) { out.push({t: "", n: 99, id: s.id, name: s.name, why: "hidden by Obfuscate", held: true}); continue; }
      out.push({t: chk.auto ? "Someone stands {{dir}} that the others can't see, and it is not human." : "Someone is here, hidden from ordinary eyes, {{dir}}.",
        n: chk.auto ? 0 : 1, id: s.id, name: s.name, vars: {dir: R.directionWord(gathered.me, s.at)}, obfDiff: chk.diff, auto: chk.auto});
      continue;
    }
    if ( s.key === "veiled" ) {
      if ( sense !== "sight" ) continue;
      out.push({t: "Someone stands {{dir}} that the eye keeps sliding past.", n: 1, id: s.id, name: s.name, vars: {dir: R.directionWord(gathered.me, s.at)}, obfDiff: s.diff, failWhy: "veiled (the roll failed)"});
      continue;
    }
    const base = s.lines?.[sense] ?? linesFor(s.key, sense);
    if ( !base.length ) continue;
    const yards = yardsBetween(gathered.me, s.at ?? gathered.me, ctx.scene);
    const walls = wallsBetween(gathered.me, s.at ?? gathered.me, ctx.scene);
    const extra = R.reachOf(sense, {yards, walls, sightBlocked: sense === "sight" ? sightBlocked(gathered.me, s.at ?? gathered.me, ctx.scene) : false, loud: s.loud, strong: s.strong, glows: s.glows},
      {light: ctx.light, darkSight: !!pw.darkSight, extra: pw.reach});
    if ( extra === null ) { if ( s.secret ) out.push({t: "", n: 99, id: s.id, name: s.name, why: `out of reach for ${sense}`, held: true}); continue; }
    for ( const l of base ) out.push({...l, n: Math.max(num(l.n), num(s.need)) + extra, id: s.id, name: s.name, secret: !!s.secret,
      vars: {...(s.vars ?? {}), dir: R.directionWord(gathered.me, s.at ?? gathered.me)}});
  }
  return out;
}

function channelLines(sense, pw, ctx, gathered) {
  const out = [];
  const near = gathered.presences.filter(p => yardsBetween(gathered.me, p.at, ctx.scene) <= 30);
  const living = near.filter(p => !["kindred", "wraith", "spirit"].includes(p.kind));
  const superN = near.filter(p => !["mortal", "beast"].includes(p.kind));
  const dir = list => list.length ? R.directionWord(gathered.me, list[0].at) : "nearby";
  for ( const ch of pw.channels ) {
    const C = TABLES.channels?.[ch];
    if ( !C || (sense !== C.sense) ) continue;
    const add = (key, list, extra = {}) => { for ( const l of C[key] ?? [] ) out.push({...l, id: `ch.${ch}.${key}`, channel: ch, vars: {count: String(list.length), dir: dir(list), ...extra}}); };
    if ( ch === "uncanny" ) { if ( superN.length && ctx.uncanny ) add("any", superN); continue; }
    if ( ch === "taint" ) {
      const k = near.filter(p => p.kind === "kindred"), w = near.filter(p => p.wyrm);
      if ( k.length ) add("kindred", k);
      if ( w.length ) add("wyrm", w);
      if ( ctx.place.resonance === "wyrm" ) add("place", []);
      continue;
    }
    if ( ch === "trueform" ) {
      for ( const kind of ["lupine", "kindred", "fae", "mage"] ) { const l = near.filter(p => p.kind === kind); if ( l.length ) add(kind, l); }
      const m = near.filter(p => p.kind === "mortal"); if ( m.length ) add("mortal", m);
      const o = near.filter(p => !["lupine", "kindred", "fae", "mage", "mortal"].includes(p.kind)); if ( o.length ) add("any", o);
      continue;
    }
    if ( ch === "unnatural" ) { if ( superN.length ) add("any", superN); continue; }
    if ( ch === "sphere-life" ) { if ( living.length ) add("living", living); const k = near.filter(p => p.kind === "kindred"); if ( k.length ) add("kindred", k); continue; }
    if ( ch === "sphere-spirit" ) { const s = near.filter(p => ["spirit", "wraith"].includes(p.kind)); if ( s.length ) add("spirit", s); if ( ["caern", "church"].includes(ctx.place.kind) ) add("place", []); continue; }
    if ( ch === "sphere-entropy" ) { add("any", []); const k = near.filter(p => p.kind === "kindred"); if ( k.length ) add("kindred", k); continue; }
    if ( ch === "sphere-prime" ) { const m = near.filter(p => p.kind === "mage"); if ( m.length ) add("mage", m); if ( ctx.place.kind === "caern" ) add("place", []); continue; }
    if ( ch === "chimerical" ) { const f = near.filter(p => p.kind === "fae"); if ( f.length ) add("fae", f); if ( ctx.place.chimerical ) add("place", []); continue; }
    if ( ch === "restless" ) { const g = near.filter(p => ["wraith", "spirit"].includes(p.kind)); if ( g.length ) add("dead", g); if ( ["graveyard", "church"].includes(ctx.place.kind) ) add("place", []); continue; }
    if ( ch === "deathsight" ) { const h = near.filter(p => p.hurt && !["wraith", "spirit"].includes(p.kind)); if ( h.length ) add("hurt", h); continue; }
    if ( ch === "lifesight" ) { if ( living.length ) add("living", living); if ( living.some(p => p.hurt) ) add("hurt", living.filter(p => p.hurt)); continue; }
  }
  return out;
}

/**
 * Answer one ask. req: {user, token (uuid), sense ("all" or one), closer, focus}. Posts the cards; returns the answer.
 * Runs on the active Storyteller's client (or a test's).
 */
export async function answer(req) {
  const td = await fromUuid(req.token);
  const actor = td?.actor;
  const scene = td?.parent;
  if ( !actor || !scene ) return null;
  const user = game.users.get(req.user) ?? game.user;
  const me = centerOf(td, scene);
  const ctx = {...moment(scene, me), scene};
  ctx.layer = layerOf(td);
  ctx.traits = traitsOf(actor, {scene, layer: ctx.layer, useAuspex: req.useAuspex !== false});
  const pw = R.powersFor(ctx.traits);
  const gathered = gatherSources(scene, td, actor);
  let senses = req.sense === "all" ? [...R.SENSE_KEYS] : [req.sense].filter(s => R.SENSES[s]);
  if ( pw.smellFirst && senses.length > 1 ) senses = ["smell", ...senses.filter(s => s !== "smell")];
  const memory = foundry.utils.deepClone(actor.flags?.[MOD]?.memory ?? {});
  const seed = (() => { try { return chron()?.gen?.seed?.() ?? game.world.id; } catch (e) { return game.world.id; } })();
  const rolls = [];
  const sections = [];
  // Sensing the uncanny is its own roll (Perception + Awareness, 7), only on a closer look with something there
  if ( req.closer && pw.channels.includes("uncanny") && gathered.presences.some(p => !["mortal", "beast"].includes(p.kind) && yardsBetween(me, p.at, scene) <= 30) ) {
    const t = ctx.traits, ab = Math.max(t.awareness, t.kenning, t.primalUrge);
    const r = await rollPool(t.perception + ab + t.woundPenalty, 7);
    rolls.push(r.roll);
    ctx.uncanny = r.successes > 0;
    ctx.uncannyRoll = r;
  }
  for ( const sense of senses ) {
    const ctxL = {era: ctx.era, part: ctx.part, sky: ctx.sky, indoor: ctx.indoor, moon: ctx.moon, wx: ctx.wx};
    const src = sourceLines(sense, gathered.sources, ctx, pw, gathered);
    const heldOut = src.filter(l => l.held);
    const live = src.filter(l => !l.held);
    const crowd = gathered.sources.some(s => s.key === "activity.drink") || ["tavern", "market"].includes(ctx.place.kind) && ctx.part !== "night";
    const masked = gathered.sources.some(s => (s.key === "fire" || s.key === "brazier") && yardsBetween(me, s.at, scene) <= 10);
    const D = R.difficulty(sense, {light: ctx.light, crowd, sky: ctx.sky, indoor: ctx.indoor, masked, wx: ctx.wx, heavy: ctx.heavy}, pw);
    if ( D.lost ) { live.length = 0; heldOut.length = 0; }
    // what is there and how hard each is to catch: a new wall or light changes the answer
    const fp = R.fingerprint([...live.map(l => `${l.id}:${l.n}`), ...(sense === "sight" ? [`light:${ctx.light}`] : [])]);
    const key = R.memoryKey({scene: scene.id, place: ctx.place.id, hour: `${ctx.t?.year ?? 0}-${ctx.t?.month ?? 0}-${ctx.t?.day ?? 0}-${ctx.hour}`, sense});
    const memo = memory[key];
    let successes = 0, botch = false, roll = null, rolled = false;
    const sameAsBefore = memo && memo.fp === fp;
    if ( req.closer && R.canRoll(memo, fp) && !D.blind ) {
      const dice = ctx.traits.perception + ctx.traits.alertness + ctx.traits.woundPenalty;
      roll = await rollPool(dice, D.diff);
      rolls.push(roll.roll);
      successes = roll.successes; botch = roll.botch; rolled = true;
    } else if ( sameAsBefore ) { successes = num(memo.best); botch = !!memo.botch; }
    // Obfuscate: one more roll for each hidden one the Auspex can reach
    if ( sense === "sight" && req.closer ) {
      for ( const l of live.filter(x => x.obfDiff) ) {
        const r = await rollPool(ctx.traits.perception + ctx.traits.awareness + ctx.traits.woundPenalty, l.obfDiff);
        rolls.push(r.roll);
        if ( r.successes > 0 ) l.n = 0; else { l.held = true; l.why = l.failWhy ?? "hidden by Obfuscate (the roll failed)"; }
      }
    }
    const usable = live.filter(l => !l.held && !(l.obfDiff && !req.closer && !(sameAsBefore && memo.obfSeen?.includes(l.id))));
    let placeL, condL;
    if ( ctx.layer !== "physical" ) { placeL = R.layerLines(TABLES, ctx.layer, ctx.place, sense, ctxL); condL = []; }
    else { placeL = R.placeLines(TABLES, ctx.place, sense, ctxL); condL = R.conditionLines(TABLES, sense, ctxL, {feast: ctx.feast, curfew: ctx.curfew}); }
    if ( sense === "sight" && D.blind ) { placeL = placeL.filter(l => l.own && /dark/i.test(l.t)); condL = []; }
    if ( D.lost ) { placeL = []; condL = []; }
    const chanL = channelLines(sense, pw, ctx, gathered);
    const rand = R.seedFor(seed, {scene: scene.id, place: ctx.place.id, hour: `${ctx.t?.day ?? 0}-${ctx.hour}`, sense, actor: actor.id});
    const ordered = c => R.byFocus(c, req.focus);
    const res = R.compose({place: ordered(placeL), cond: condL, sources: ordered(usable.filter(l => l.t)), channel: chanL, successes, botch, rand});
    const lines = R.render(res.lines, rand, {place: ctx.place.name});
    if ( D.blind ) lines.unshift(D.lost ? R.lostLine(sense) : "It is pitch dark. Nothing can be seen.");
    const held = [...heldOut, ...res.held.filter(l => l.secret || l.channel), ...live.filter(l => l.held)];
    memory[key] = {fp, best: Math.max(successes, sameAsBefore ? num(memo.best) : 0), botch: rolled ? botch : !!memo?.botch, closer: !!(req.closer || (sameAsBefore && memo.closer)), at: Date.now(),
      obfSeen: usable.filter(l => l.obfDiff && l.n === 0).map(l => l.id)};
    sections.push({sense, lines, diff: D, successes, botch, rolled, roll, chosen: res.lines, held, repeat: !rolled && sameAsBefore});
  }
  try { await actor.update({[`flags.${MOD}.memory`]: R.trimMemory(memory)}); } catch (e) { console.warn(`${MOD} | could not remember the answer`, e); }
  const result = {actor: actor.id, actorName: actor.name, token: req.token, user: user.id, scene: scene.id, ctx: {part: ctx.part, light: ctx.light, sky: ctx.sky, place: ctx.place, era: ctx.era, layer: ctx.layer, viewing: ctx.viewing, wx: ctx.wx},
    sections, closer: !!req.closer, uncanny: ctx.uncannyRoll ? {successes: ctx.uncannyRoll.successes} : null};
  await postAnswer(result, rolls, user, td);
  return result;
}

/* ------------------------------------------------------------------ */
/*  Cards                                                              */
/* ------------------------------------------------------------------ */

function cardHtml({title, line = "", body = "", buttons = ""}) {
  return `<div class="vta-card wodx-x wsn"><header class="vta-head"><h3 style="${H3}">${title}</h3></header>`
    + `<div class="vta-body">${line ? `<p class="wodx-quiet">${esc(line)}</p>` : ""}${body}${buttons ? `<div class="wsn-buttons">${buttons}</div>` : ""}</div></div>`;
}
const sensesTitle = secs => secs.length > 1 ? "Senses" : R.SENSES[secs[0]?.sense]?.verb ?? "Senses";
function playerBody(res) {
  return res.sections.map(s => `${res.sections.length > 1 ? `<h4>${esc(R.SENSES[s.sense].label)}</h4>` : ""}`
    + (s.lines.length ? s.lines.map(l => `<p>${esc(l)}</p>`).join("") : `<p class="wodx-quiet">Nothing stands out.</p>`)).join("");
}
function stBody(res) {
  const ctx = res.ctx;
  const head = `<p class="wodx-quiet">${esc(cap(ctx.place.kind))}${ctx.place.name ? ` (${esc(ctx.place.name)})` : ""}, ${esc(ctx.part)}, ${esc(ctx.light)} light, sky ${esc(ctx.sky)}${ctx.wx?.length ? ` (${esc(ctx.wx.join(", "))})` : ""}, ${esc(ctx.era)}${ctx.layer !== "physical" ? `, in the ${esc(cap(ctx.layer))}` : ""}${ctx.viewing ? "" : ". View the scene for walls and light to count"}.</p>`;
  return head + res.sections.map(s => {
    const roll = s.rolled ? `Perception + Alertness at ${s.diff.diff}${s.diff.parts.length ? ` (${esc(s.diff.parts.join(", "))})` : ""}: ${s.botch ? "a botch" : `${s.successes} success${s.successes === 1 ? "" : "es"}`}`
      : s.repeat ? `The same answer as before (${s.successes} success${s.successes === 1 ? "" : "es"})` : s.diff.lost ? `No roll: ${s.diff.lost}` : s.diff.blind ? "Too dark to see" : "A plain look, no roll";
    const lines = s.chosen.map((l, i) => `<li>${esc(s.lines[i + (s.diff.blind ? 1 : 0)] ?? l.t)} <span class="wodx-quiet">(need ${num(l.n)}${l.own ? ", your line" : ""}${l.channel ? `, ${esc(l.channel)}` : ""})</span></li>`).join("");
    const held = s.held.length ? `<p class="wodx-quiet">Held back: ${s.held.map(h => esc(`${h.name || h.channel || h.id}${h.why ? `: ${h.why}` : ` (needs ${num(h.n)})`}`)).join("; ")}.</p>` : "";
    return `<h4>${esc(R.SENSES[s.sense].label)}</h4><p class="wodx-quiet">${roll}.</p><ul>${lines}</ul>${held}${s.botch ? `<p class="wodx-quiet">A botch: the player got only what anyone would notice. Add a wrong detail if you want one.</p>` : ""}`;
  }).join("") + (res.uncanny ? `<p class="wodx-quiet">Sense the uncanny (Perception + Awareness at 7): ${res.uncanny.successes} success${res.uncanny.successes === 1 ? "" : "es"}.</p>` : "");
}

async function postAnswer(res, rolls, user, td) {
  const mode = setting("mode") ?? "send";
  const title = `${esc(res.actorName)}: ${esc(sensesTitle(res.sections))}`;
  const where = res.ctx.place.name ? `${res.ctx.place.name}, ${res.ctx.part}` : res.ctx.part;
  const speaker = {alias: res.actorName};
  const data = {res: {actor: res.actor, actorName: res.actorName, token: res.token, user: res.user, sections: res.sections.map(s => ({sense: s.sense, lines: s.lines, closer: s.rolled || s.repeat})), where}};
  const notRolled = res.sections.some(s => !s.rolled && !s.repeat && !s.diff.blind);
  const pButtons = `<button type="button" data-wsn="share">Share with the party</button>${notRolled ? `<button type="button" data-wsn="closer">Look closer</button>` : ""}`;
  const toPlayer = user && !user.isGM;
  if ( toPlayer && mode === "send" ) {
    await ChatMessage.create({speaker, whisper: [user.id, ...gmIds()].filter((v, i, a) => a.indexOf(v) === i), content: cardHtml({title, line: where, body: playerBody(res), buttons: pButtons}),
      flags: {[MOD]: {answer: data.res, player: true}}});
  }
  const stButtons = `${toPlayer && mode === "review" ? `<button type="button" data-wsn="send">Send to the player</button>` : ""}<button type="button" data-wsn="everyone">Send to everyone</button>`
    + `${toPlayer ? `<button type="button" data-wsn="add">Add a line</button>` : ""}<button type="button" data-wsn="forget">Forget, so they can roll again</button>`;
  await ChatMessage.create({speaker: {alias: "WoDX Senses"}, whisper: gmIds(), blind: true, rolls, sound: rolls.length ? CONFIG.sounds?.dice : undefined,
    content: cardHtml({title: `${title} (Storyteller)`, body: (toPlayer ? "" : playerBody(res)) + stBody(res), buttons: stButtons}), flags: {[MOD]: {answer: data.res, st: true}}});
  if ( !toPlayer && !user?.isGM ) return;
}

/* ------------------------------------------------------------------ */
/*  Asking                                                             */
/* ------------------------------------------------------------------ */

function myToken() {
  const c = canvas?.tokens?.controlled?.[0];
  if ( c?.actor ) return c.document;
  const ch = game.user.character;
  if ( ch ) { const t = canvas?.tokens?.placeables?.find(p => p.actor?.id === ch.id); if ( t ) return t.document; }
  const owned = canvas?.tokens?.placeables?.filter(p => p.actor?.isOwner && !game.user.isGM) ?? [];
  return owned.length === 1 ? owned[0].document : null;
}

/** Send an ask to the Storyteller's table (or answer it here, on the Storyteller's client). */
export async function ask({sense = "all", closer = false, focus = "", token = null, useAuspex = true} = {}) {
  if ( setting("mode") === "off" ) return ui.notifications.warn("Sense answers are switched off in this world."), null;
  const td = token ?? myToken();
  if ( !td ) return ui.notifications.warn("Select your character's token first."), null;
  const req = {user: game.user.id, token: td.uuid, sense, closer: !!closer, focus: String(focus ?? ""), useAuspex};
  if ( isActiveGM() ) return answer(req);
  if ( !game.users.activeGM ) return ui.notifications.warn("No Storyteller is connected to answer."), null;
  game.socket.emit(SOCKET, {type: "ask", payload: req});
  ui.notifications.info(closer ? "Looking closer…" : "The Storyteller's table is putting the answer together.");
  return req;
}

/** The choice window: which sense, and whether to look closer. */
export async function openAsk({sense = null, focus = ""} = {}) {
  const td = myToken();
  if ( !td ) return ui.notifications.warn("Select your character's token first."), null;
  const actor = td.actor, t = traitsOf(actor, {scene: td.parent});
  const opts = [...R.SENSE_KEYS.map(k => [k, R.SENSES[k].label]), ["all", "Everything at once"]];
  const content = `<p class="wodx-quiet">${esc(td.name)}: a plain look is free and shows what anyone would notice. Looking closer rolls Perception + Alertness, and each success adds a detail.</p>
    <div class="wodx-field"><label>Sense</label><select name="sense" data-fixed>${opts.map(([k, l]) => `<option value="${k}"${k === (sense ?? "all") ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
    <div class="wodx-field"><label>Anything in particular</label><input type="text" name="focus" value="${esc(focus)}" placeholder="a door, the street, the stranger"></div>
    <label class="wix-check"><input type="checkbox" name="closer"> Look closer (roll)</label>
    ${t.auspex ? `<label class="wix-check"><input type="checkbox" name="useAuspex" checked> Use Heightened Senses (Auspex ${t.auspex})</label>` : ""}`;
  const fd = await foundry.applications.api.DialogV2.wait({
    window: {title: `What does ${td.name} notice?`}, classes: ["wodx-dialog", "wsn-dialog"], position: {width: 420, height: "auto"}, content,
    buttons: [{action: "ask", label: "Ask", default: true, callback: (ev, b) => new foundry.applications.ux.FormDataExtended(b.form).object}, {action: "cancel", label: "Cancel"}],
    rejectClose: false
  }).then(r => (r && r !== "cancel" ? r : null));
  if ( !fd ) return null;
  return ask({sense: fd.sense, focus: fd.focus, closer: !!fd.closer, useAuspex: t.auspex ? !!fd.useAuspex : true, token: td});
}

/** Storyteller: post what anyone would notice in the place on view, for everyone. */
export async function describePlace({scene = canvas?.scene, point = null} = {}) {
  if ( !game.user.isGM || !scene ) return null;
  const p = point ?? {x: num(scene.dimensions?.width ?? scene.width) / 2, y: num(scene.dimensions?.height ?? scene.height) / 2};
  const ctx = moment(scene, p);
  const ctxL = {era: ctx.era, part: ctx.part, sky: ctx.sky, indoor: ctx.indoor, moon: ctx.moon, wx: ctx.wx};
  const seed = (() => { try { return chron()?.gen?.seed?.() ?? game.world.id; } catch (e) { return game.world.id; } })();
  const body = [];
  for ( const sense of ["sight", "sound", "smell"] ) {
    const rand = R.seedFor(seed, {scene: scene.id, place: ctx.place.id, hour: ctx.hour, sense, actor: "all"});
    let placeL = R.placeLines(TABLES, ctx.place, sense, ctxL);
    const condL = R.conditionLines(TABLES, sense, ctxL, {feast: ctx.feast, curfew: ctx.curfew});
    if ( sense === "sight" && ctx.light === "pitch" ) placeL = [];
    const res = R.compose({place: placeL, cond: condL, successes: 0, rand});
    body.push(...R.render(res.lines, rand, {place: ctx.place.name}));
  }
  if ( !body.length ) return null;
  return ChatMessage.create({speaker: {alias: ctx.place.name || "WoDX Senses"}, content: cardHtml({title: esc(ctx.place.name || "Here"), line: ctx.part, body: body.map(l => `<p>${esc(l)}</p>`).join("")}), flags: {[MOD]: {describe: true}}});
}

/* ------------------------------------------------------------------ */
/*  Card buttons                                                       */
/* ------------------------------------------------------------------ */

async function onButton(msg, action) {
  const a = msg.flags?.[MOD]?.answer;
  if ( !a ) return;
  const lines = a.sections.flatMap(s => s.lines);
  const body = a.sections.map(s => `${a.sections.length > 1 ? `<h4>${esc(R.SENSES[s.sense]?.label ?? s.sense)}</h4>` : ""}${s.lines.map(l => `<p>${esc(l)}</p>`).join("")}`).join("");
  const title = `${esc(a.actorName)}: ${esc(sensesTitle(a.sections))}`;
  if ( action === "share" ) {
    if ( !lines.length ) return ui.notifications.info("Nothing to share.");
    return ChatMessage.create({speaker: {alias: a.actorName}, content: cardHtml({title, line: `${a.where}. Shared by ${game.user.name}.`, body}), flags: {[MOD]: {shared: true}}});
  }
  if ( action === "closer" ) {
    const td = await fromUuid(a.token);
    return ask({sense: a.sections.length > 1 ? "all" : a.sections[0].sense, closer: true, token: td});
  }
  if ( !game.user.isGM ) return;
  if ( action === "send" ) {
    await ChatMessage.create({speaker: {alias: a.actorName}, whisper: [a.user, ...gmIds()], content: cardHtml({title, line: a.where, body, buttons: `<button type="button" data-wsn="share">Share with the party</button>`}), flags: {[MOD]: {answer: a, player: true}}});
    return ui.notifications.info("Sent.");
  }
  if ( action === "everyone" ) return ChatMessage.create({speaker: {alias: a.actorName}, content: cardHtml({title, line: a.where, body}), flags: {[MOD]: {shared: true}}});
  if ( action === "add" ) {
    const fd = await foundry.applications.api.DialogV2.prompt({window: {title: "Add a line"}, content: `<div class="wodx-field"><label>What else ${esc(a.actorName)} notices</label><textarea name="t" rows="3"></textarea></div>`,
      ok: {label: "Send", callback: (ev, b) => new foundry.applications.ux.FormDataExtended(b.form).object}, rejectClose: false});
    if ( !fd?.t?.trim() ) return;
    return ChatMessage.create({speaker: {alias: a.actorName}, whisper: [a.user, ...gmIds()], content: cardHtml({title, body: `<p>${esc(fd.t.trim())}</p>`})});
  }
  if ( action === "forget" ) {
    const td = await fromUuid(a.token);
    if ( !td?.actor ) return;
    const memory = foundry.utils.deepClone(td.actor.flags?.[MOD]?.memory ?? {});
    for ( const k of Object.keys(memory) ) if ( a.sections.some(s => k.endsWith(`|${s.sense}`)) ) delete memory[k];
    await td.actor.update({[`flags.${MOD}.memory`]: memory}, {diff: false, recursive: false});
    return ui.notifications.info(`${a.actorName} can look again with a new roll.`);
  }
}

/* ------------------------------------------------------------------ */
/*  The Storyteller's lines for a place                                */
/* ------------------------------------------------------------------ */

export async function openPlaceLines(scene = canvas?.scene) {
  if ( !game.user.isGM || !scene ) return null;
  const docs = [{doc: scene, label: `The whole scene: ${scene.navName || scene.name}`}, ...[...(scene.regions ?? [])].map(r => ({doc: r, label: `Region: ${r.name}`}))];
  const kindOfDoc = d => d.flags?.["wodx-npc"]?.place?.kind ?? "";
  const rows = docs.map((d, i) => `<option value="${i}">${esc(d.label)}${kindOfDoc(d.doc) ? ` (${esc(kindOfDoc(d.doc))})` : ""}</option>`).join("");
  const field = (k, label) => `<div class="wodx-field wsn-own"><label>${esc(label)}</label><textarea name="${k}" rows="3"></textarea></div>`;
  const content = `<p class="wodx-quiet">Your own lines for a place, one a line. They come first, before the built-in lines for its kind. Start a line with a number and a colon ("2: ...") to make it need that many successes. The kind of place is set in WoDX NPC's Places window.</p>
    ${docs.length > 6 ? searchBox("select[name=target] option", "Search…", "Search places") : ""}
    <div class="wodx-field"><label>Place</label><select name="target" data-fixed>${rows}</select></div>
    <div class="wodx-field"><label>Indoors or out</label><select name="io" data-fixed><option value="">By its kind</option><option value="in">Indoors</option><option value="out">Outdoors</option></select></div>
    <div class="wodx-field"><label>In the Penumbra</label><select name="resonance" data-fixed><option value="">No particular feel</option><option value="wyld">Wyld</option><option value="weaver">Weaver</option><option value="wyrm">Wyrm-tainted</option><option value="quiet">Quiet</option></select></div>
    <label class="wix-check"><input type="checkbox" name="chimerical"> Chimerical things here (the fae sight sees them)</label>
    <label class="wix-check"><input type="checkbox" name="replace"> Use only my lines here</label>
    ${R.SENSE_KEYS.map(k => field(k, R.SENSES[k].label)).join("")}`;
  const fill = (root, i) => {
    const f = docs[i]?.doc?.flags?.[MOD] ?? {};
    root.querySelector("[name=io]").value = f.io ?? "";
    root.querySelector("[name=resonance]").value = f.resonance ?? "";
    root.querySelector("[name=chimerical]").checked = !!f.chimerical;
    root.querySelector("[name=replace]").checked = !!f.replace;
    for ( const k of R.SENSE_KEYS ) root.querySelector(`[name=${k}]`).value = f.own?.[k] ?? "";
  };
  const fd = await foundry.applications.api.DialogV2.wait({
    window: {title: "Place senses", resizable: true}, classes: ["wodx-dialog", "wsn-dialog"], position: {width: 520, height: "auto"}, content,
    render: (ev, dlg) => { const root = dlg.element; fill(root, 0); root.querySelector("[name=target]").addEventListener("change", e => fill(root, num(e.target.value))); },
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => new foundry.applications.ux.FormDataExtended(b.form).object}, {action: "cancel", label: "Cancel"}],
    rejectClose: false
  }).then(r => (r && r !== "cancel" ? r : null));
  if ( !fd ) return null;
  const doc = docs[num(fd.target)]?.doc;
  if ( !doc ) return null;
  const value = {io: fd.io || "", resonance: fd.resonance || "", chimerical: !!fd.chimerical, replace: !!fd.replace, own: Object.fromEntries(R.SENSE_KEYS.map(k => [k, String(fd[k] ?? "").trim()]))};
  await doc.update({[`flags.${MOD}`]: value});
  ui.notifications.info(`Saved the senses for ${doc.name}.`);
  return value;
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

Hooks.once("init", () => {
  registerSettings();
  registerPerceptionSettings();
  registerQuiet(() => refreshScreen());
  registerSight();
  setupSight({powerDots});
  const perception = setupPerception({attrOf, abilityOf, powerDots, formOf, sightBlocked, esc, gmIds});
  const api = {perception, sight: {cycle: cycleSight, colourSafe}, version: VERSION, rules: R, tables: TABLES, ask, openAsk, answer, describePlace, openPlaceLines, gatherSources, traitsOf, noises: NOISES};
  game.modules.get(MOD).api = api;
  game.wodx = Object.assign(game.wodx ?? {}, {senses: api});
});

Hooks.once("ready", async () => {
  applyQuiet();
  await loadTables();
  try { CAL = await import("../../wodx-chronicle/scripts/calendar.mjs"); } catch (e) { CAL = null; }
  try { guessPlace = (await import("../../wodx-npc/scripts/routine-rules.mjs")).guessPlace; } catch (e) { guessPlace = null; }
  try { IR = await import("../../wodx-interactables/scripts/interact-rules.mjs"); } catch (e) { IR = null; }
  game.socket.on(SOCKET, async msg => {
    if ( msg?.type === "ask" && isActiveGM() ) {
      try { await answer(msg.payload); } catch (e) { console.error(`${MOD} |`, e); }
    }
  });
});

Hooks.on("wodxInteractablesNoise", ({scene, wall, token, noise} = {}) => {
  try {
    const sc = game.scenes.get(scene);
    const w = sc?.walls?.get?.(wall), t = sc?.tiles?.get?.(wall);
    const pos = w ? {x: (num(w.c[0]) + num(w.c[2])) / 2, y: (num(w.c[1]) + num(w.c[3])) / 2} : t ? {x: num(t.x) + num(t.width) / 2, y: num(t.y) + num(t.height) / 2} : null;
    if ( !pos ) return;
    NOISES.push({scene, pos, noise, at: Date.now()});
    while ( NOISES.length > 20 ) NOISES.shift();
  } catch (e) { /* ignore */ }
});

Hooks.on("chatMessage", (log, message) => {
  const c = R.parseCommand(message);
  if ( !c ) return true;
  ask({sense: c.sense, focus: c.focus});
  return false;
});

Hooks.on("renderChatMessageHTML", (message, el) => {
  el = el?.[0] ?? el;
  if ( !el?.querySelectorAll ) return;
  quietCard(el);
  el.querySelectorAll("button[data-wsn]").forEach(b => {
    const act = b.dataset.wsn;
    const gmOnly = ["send", "everyone", "add", "forget"].includes(act);
    if ( gmOnly && !game.user.isGM ) { b.remove(); return; }
    b.addEventListener("click", ev => { ev.preventDefault(); onButton(message, act); });
  });
  // A plain question in chat: offer an answer to its author
  if ( !setting("questionButton") || setting("mode") === "off" ) return;
  if ( Object.keys(message.flags ?? {}).some(k => k !== "core") || message.rolls?.length ) return;
  const author = message.author?.id ?? message.author ?? message.user?.id;
  if ( author !== game.user.id || game.user.isGM ) return;
  const text = (el.querySelector(".message-content")?.textContent ?? "").trim();
  const sense = R.questionSense(text);
  if ( !sense ) return;
  const body = el.querySelector(".message-content");
  if ( !body || body.querySelector(".wsn-offer") ) return;
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "wsn-offer";
  btn.textContent = sense === "all" ? "What do I notice?" : `${R.SENSES[sense].verb}: what do I notice?`;
  btn.addEventListener("click", ev => { ev.preventDefault(); openAsk({sense}); });
  body.append(btn);
});

Hooks.on("updateScene", (scene, change) => {
  if ( !change?.active || !isActiveGM() || !setting("arrival") ) return;
  setTimeout(() => describePlace({scene}), 1500);
});

Hooks.on("getSceneControlButtons", controls => {
  const tokens = controls.tokens ?? controls.token;
  if ( !tokens?.tools ) return;
  tokens.tools.wodxSenses = {name: "wodxSenses", title: "What do I notice? (sight, hearing, smell, touch)", icon: "fa-solid fa-eye", order: 107,
    button: true, visible: true, onChange: () => openAsk()};
  tokens.tools.wodxSensesPlace = {name: "wodxSensesPlace", title: "Place senses: your own lines for this scene or a region", icon: "fa-solid fa-feather-pointed", order: 115,
    button: true, visible: game.user.isGM, onChange: () => openPlaceLines()};
  tokens.tools.wodxSensesDescribe = {name: "wodxSensesDescribe", title: "Describe this place to everyone", icon: "fa-solid fa-scroll", order: 116,
    button: true, visible: game.user.isGM, onChange: () => describePlace()};
});
