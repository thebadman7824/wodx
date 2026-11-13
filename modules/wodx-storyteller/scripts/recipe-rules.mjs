/**
 * WoDX Storyteller 0.61.0: the chronicle builder's rules (Rothenstein Rebuild Desk, B2780-B2785). Pure, so the harness
 * can test them: checking a recipe, where the builder may work, which steps are ready, how each document of an old
 * world is sorted for the carry-over, and how anchors are found.
 *
 * builder.mjs runs the steps in Foundry; tools/gate/carryexport.mjs uses classify() to write the inventory.
 */

export const RECIPE_VERSION = 1;

/** Worlds the builder never touches, forced or not. Live is locked (B2781). */
export const FORBIDDEN_WORLDS = ["rothenstein-live"];

/**
 * The builder's steps, in order. phase: the rebuild phase that brings the step (1 now; the rest come later).
 * needs: the modules and lowest versions the step relies on. undo: whether the step can be taken back.
 */
export const STEPS = [
  {id: "check", phase: 1, label: "Check the world", undo: false, needs: {}},
  {id: "settings", phase: 1, label: "Homeland, opening night and lines", undo: false, needs: {"wodx-chronicle": "0.48.0"}},
  {id: "carry", phase: 1, label: "Bring across the old world's scenes, journals and cast", undo: true, needs: {}},
  {id: "anchors", phase: 1, label: "Mark the anchor places and people", undo: true, needs: {}},
  {id: "ground", phase: 2, label: "Generate the town around the anchors", undo: true, needs: {"wodx-interactables": "0.36.0"}},
  {id: "realms", phase: 2, label: "Penumbra, Shadowlands and Dreaming over the town", undo: true, needs: {"wodx-otherworlds": "0.24.0"}},
  {id: "people", phase: 3, label: "Households, residents, routines and prayers", undo: true, needs: {"wodx-npc": "0.54.0"}},
  {id: "crowds", phase: 3, label: "Passers-by, overheard talk, sprites and faces", undo: true, needs: {"wodx-npc": "0.54.0", "wodx-paperdoll": "0.14.1"}},
  {id: "factions", phase: 4, label: "Factions from what they hold, rivalries and politics", undo: true, needs: {"wodx-npc": "0.54.0"}},
  {id: "trade", phase: 4, label: "Purses, markets, caravans, ventures and letters", undo: true, needs: {"wodx-storyteller": "0.61.0"}},
  {id: "spine", phase: 5, label: "Dated events, clocks and the Legends book", undo: true, needs: {"wodx-chronicle": "0.51.0"}},
  {id: "ages", phase: 5, label: "The town at every settlement age, with heirs", undo: true, needs: {}},
  {id: "characters", phase: 6, label: "Rothenstein origins for the start hub and wizard", undo: true, needs: {"wodx-creation": "0.23.0"}},
  {id: "run", phase: 7, label: "Play a week, then cross every age to 2030", undo: false, needs: {}}
];
export const PHASE_NOW = 1;
export const stepOf = id => STEPS.find(s => s.id === id) ?? null;

/** "0.9.10" against "0.10.0" and the like. Missing parts count as 0; anything after a hyphen is ignored. */
export function versionAtLeast(have, want) {
  if ( !want ) return true;
  if ( !have ) return false;
  const p = v => String(v).split("-")[0].split(".").map(n => Number.parseInt(n, 10) || 0);
  const a = p(have), b = p(want);
  for ( let i = 0; i < Math.max(a.length, b.length); i++ ) {
    if ( (a[i] ?? 0) !== (b[i] ?? 0) ) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return true;
}

const LINES = ["vampire", "werewolf", "mage", "changeling", "wraith", "hunter", "demon", "mummy", "kote", "mortal"];

/**
 * Check a recipe. ctx: {regions: [region ids], placeKinds: [kinds]} (either may be left out to skip that check).
 * Returns a list of problems in plain words; empty means it can be built.
 */
export function validate(r, ctx = {}) {
  const out = [];
  if ( !r || typeof r !== "object" ) return ["There is no recipe."];
  if ( !r.id ) out.push("The recipe has no id.");
  if ( !r.world ) out.push("The recipe names no world to build in.");
  if ( FORBIDDEN_WORLDS.includes(r.world) ) out.push(`The recipe names ${r.world}, which is locked.`);
  if ( !r.title ) out.push("The recipe has no title.");
  const y = Number(r.opening?.year);
  if ( !Number.isInteger(y) || y < 1197 || y > 2300 ) out.push("The opening year must be a whole year from 1197 to 2300.");
  if ( ctx.regions && !ctx.regions.includes(r.homeland) ) out.push(`The homeland ${r.homeland} is not a WoDX world region.`);
  const bad = (r.lines ?? []).filter(l => !LINES.includes(l));
  if ( bad.length ) out.push(`Unknown lines: ${bad.join(", ")}.`);
  if ( !(r.lines ?? []).length ) out.push("The recipe names no game lines.");
  const keys = new Set();
  for ( const p of r.anchors?.places ?? [] ) {
    if ( keys.has(p.key) ) out.push(`The anchor ${p.key} is named twice.`);
    keys.add(p.key);
    try { new RegExp(p.match, "i"); } catch (e) { out.push(`The anchor ${p.key} has a match that is not a pattern.`); }
    if ( ctx.placeKinds && !ctx.placeKinds.includes(p.kind) ) out.push(`The anchor ${p.key} has an unknown kind of place (${p.kind}).`);
  }
  for ( const p of r.anchors?.people ?? [] ) {
    if ( keys.has(p.key) ) out.push(`The anchor ${p.key} is named twice.`);
    keys.add(p.key);
    if ( !p.name ) out.push(`The anchor ${p.key} has no name to look for.`);
    if ( p.home && !(r.anchors.places ?? []).some(x => x.key === p.home) ) out.push(`${p.name} lives at ${p.home}, which is not an anchor place.`);
  }
  for ( const h of r.reach ?? [] ) {
    if ( ctx.regions && h.region && !ctx.regions.includes(h.region) ) out.push(`The away hub ${h.place} names the unknown region ${h.region}.`);
    if ( !(h.from <= h.to) ) out.push(`The away hub ${h.place} ends before it begins.`);
  }
  const ages = r.ages ?? [];
  if ( ages.some((a, i) => i && a <= ages[i - 1]) ) out.push("The ages are not in order.");
  return out;
}

/**
 * May the builder work in this world? Live never, even forced (B2781). Another world than the recipe's only when forced,
 * so a click in the gate world cannot fill it by mistake.
 */
export function canBuildHere(worldId, recipe, {force = false} = {}) {
  if ( FORBIDDEN_WORLDS.includes(worldId) ) return {ok: false, reason: `${worldId} is locked. The builder never works there.`};
  if ( !recipe?.world ) return {ok: false, reason: "The recipe names no world."};
  if ( worldId !== recipe.world && !force ) return {ok: false, reason: `This recipe builds ${recipe.world}, and this world is ${worldId}.`};
  return {ok: true, reason: worldId === recipe.world ? "" : "Forced in another world."};
}

/**
 * The state of every step. have: {modules: {id: version or null}, record: {steps: {id: {at}}}}.
 * Each row: {id, phase, label, undo, state: "done" | "ready" | "blocked" | "later", reason}.
 * A step is blocked when a module it needs is missing or too old, or a step before it in the same phase is not done.
 */
export function planSteps(have = {}) {
  const mods = have.modules ?? {};
  const done = have.record?.steps ?? {};
  let open = false;
  return STEPS.map(s => {
    const row = {id: s.id, phase: s.phase, label: s.label, undo: s.undo};
    if ( done[s.id]?.at ) return {...row, state: "done", reason: ""};
    if ( s.phase > PHASE_NOW ) return {...row, state: "later", reason: `Comes with phase ${s.phase}.`};
    const short = Object.entries(s.needs).filter(([id, v]) => !versionAtLeast(mods[id], v));
    if ( short.length ) { open = true; return {...row, state: "blocked", reason: short.map(([id, v]) => `${id} ${v} or later`).join(", ")}; }
    if ( open ) return {...row, state: "blocked", reason: "A step before it is not done."};
    open = true;
    return {...row, state: "ready", reason: ""};
  });
}

/* ---- Sorting an old world's documents (desk x2, B2783) ---- */

const GATE_NAME = /^(WoDX gate|Gate )|\(gate\)/i;
const RUNTIME_FOLDER = /^WoDX (residents|passers-by)\b/i;
const NEVER_CARRY = ["ChatMessage", "Combat", "User", "Setting", "FogExploration"];

/**
 * Sort one document. entry: {type, name, folder (a folder path such as "WoDX residents/Market"), playerOwned, flags}.
 * Returns {verdict: "carry" | "rebuild" | "leave", reason}.
 *  - leave: gate fixtures and anything a gate made, chat, fights, users, and player characters (they come from a Live
 *    backup only on Ben's word, desk p3).
 *  - rebuild: what the builder makes again from the recipe (residents, passers-by, the wizard's own journals, the
 *    Legends book).
 *  - carry: the rest, the authored chronicle.
 */
export function classify(e = {}) {
  const f = e.flags ?? {};
  if ( NEVER_CARRY.includes(e.type) ) return {verdict: "leave", reason: "Play records stay with the old world."};
  if ( f["wodx-gate"] || GATE_NAME.test(e.name ?? "") || /(^|\/)WoDX gate/i.test(e.folder ?? "") ) return {verdict: "leave", reason: "Made by a gate."};
  if ( e.type === "Actor" && e.playerOwned ) return {verdict: "leave", reason: "A player's character comes across only from a Live backup, on Ben's word."};
  const npc = f["wodx-npc"] ?? {};
  if ( npc.resident || npc.passerby || npc.passerbyBase || RUNTIME_FOLDER.test(e.folder ?? "") ) return {verdict: "rebuild", reason: "Generated people are made again from the town."};
  const st = f["wodx-storyteller"] ?? {};
  if ( st.template ) return {verdict: "rebuild", reason: "The Start a chronicle step writes it again."};
  if ( st.built ) return {verdict: "rebuild", reason: "The builder made it."};
  const ch = f["wodx-chronicle"] ?? {};
  if ( ch.kind === "legends" ) return {verdict: "rebuild", reason: "The Legends book is rebuilt from the new world."};
  return {verdict: "carry", reason: ""};
}

/** Counts of an inventory: {carry: {Scene: n, ...}, rebuild: {...}, leave: {...}}. */
export function tally(entries = []) {
  const out = {carry: {}, rebuild: {}, leave: {}};
  for ( const e of entries ) { const v = e.verdict ?? classify(e).verdict; out[v][e.type] = (out[v][e.type] ?? 0) + 1; }
  return out;
}

/** The order documents are made in, so links between them hold (folders first, scenes last). */
export const CARRY_ORDER = ["Folder", "Actor", "Item", "JournalEntry", "RollTable", "Cards", "Playlist", "Macro", "Adventure", "Scene"];

/* ---- Anchors (desk r3, B2782) ---- */

/** The scenes an anchor place claims: [{key, kind, ids: [scene ids]}]. scenes: [{id, name}]. */
export function placeAnchors(recipe, scenes = []) {
  return (recipe?.anchors?.places ?? []).map(p => {
    const rx = new RegExp(p.match, "i");
    return {key: p.key, kind: p.kind, ids: scenes.filter(s => rx.test(s.name ?? "")).map(s => s.id)};
  });
}

/**
 * The actor an anchor person names: the shortest non-player name holding it, as the factions window finds leaders.
 * actors: [{id, name, playerOwned}]. Returns [{key, id or null, name}].
 */
export function peopleAnchors(recipe, actors = []) {
  return (recipe?.anchors?.people ?? []).map(p => {
    const want = p.name.toLowerCase();
    const hit = actors.filter(a => !a.playerOwned && (a.name ?? "").toLowerCase().includes(want)).sort((a, b) => a.name.length - b.name.length)[0];
    return {key: p.key, id: hit?.id ?? null, name: hit?.name ?? p.name, home: p.home ?? null, faction: p.faction ?? null};
  });
}
