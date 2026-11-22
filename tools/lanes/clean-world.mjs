/**
 * The clean testbed world, wodx-clean (Chronicle Packs Desk c2 and e2, Ben 18 Nov 2026). It is the shared game with no
 * story chronicle: every WoDX module on except the chronicle modules (a module with a chronicle.mjs at its root, such
 * as wodx-rothenstein), the same other modules as the lane's default world, the Gamemaster Test and Player Test
 * accounts, and Start a chronicle run once with its defaults. Nothing else is made by hand.
 *   node tools/lanes/lanes.mjs setup-clean --lane 2 [--again]     makes it on a lane and takes its known-good copy
 *   node tools/lanes/lanes.mjs reset --lane 2 --world clean        puts the clean known-good copy back and starts it
 *   node tools/lanes/run-gate.mjs --world clean --clean-set        the clean smoke set (gate-map-extra.json "clean")
 *   node tools/lanes/lanes.mjs reset --lane 2                      back to rothenstein-wodx
 * The pure parts are here so the harness can test them; lanes.mjs does the lane work.
 */
import fs from "node:fs";
import path from "node:path";

/** The WoDX modules in a checkout, and which of them are chronicle modules (a chronicle.mjs at the module's root). */
export function repoModules(repo) {
  const dir = path.join(repo, "modules");
  const ids = fs.readdirSync(dir).filter(d => fs.existsSync(path.join(dir, d, "module.json"))).sort();
  return {ids, chronicles: ids.filter(d => fs.existsSync(path.join(dir, d, "chronicle.mjs")))};
}

/**
 * core.moduleConfiguration for the clean world: every WoDX module on but the chronicle modules (set off, so a later
 * look at the setting says so), and the default world's other modules (from its clean fingerprint) on.
 */
export function cleanModuleConfig({ids, chronicles}, defaultModules = {}) {
  const out = {}, chron = new Set(chronicles), wodx = new Set(ids);
  for ( const id of Object.keys(defaultModules).sort() ) if ( !wodx.has(id) ) out[id] = true;
  for ( const id of ids ) out[id] = !chron.has(id);
  return out;
}

/** world.json for the clean world, from the template's: its own id and title, and flags.wodx.clean. */
export function cleanWorldJson(template, {world, title}) {
  const w = structuredClone(template);
  w.id = world;
  w.title = title ?? "WoDX Clean (testbed)";
  w.description = "<p>WoDX clean testbed world: the shared game with no story chronicle (every WoDX module on except the chronicle modules). Made by tools/lanes/lanes.mjs setup-clean; testbed lanes only, never Live. Private use only.</p>";
  w.flags = {...(w.flags ?? {}), wodx: {...(w.flags?.wodx ?? {}), clean: true}};
  return w;
}

/** What Start a chronicle is given in the clean world: its own defaults (the date it offers, no homeland change). */
export const CLEAN_START = {name: "Clean world", year: 1197, month: 1, day: 1, hour: 21,
  lines: ["vampire", "werewolf", "mage", "changeling", "wraith", "hunter", "mortal"], setDate: true};

/**
 * Runs in the page as the world's first Gamemaster: adds the two test accounts and sets the modules.
 * Returns the module ids asked for that the server does not have.
 */
export async function BOOTSTRAP(moduleCfg) {
  const R = globalThis.CONST.USER_ROLES;
  for ( const [name, role] of [["Gamemaster Test", R.GAMEMASTER], ["Player Test", R.PLAYER]] ) {
    if ( !globalThis.game.users.getName(name) ) await globalThis.User.create({name, role});
  }
  const cfg = {...(globalThis.game.settings.get("core", "moduleConfiguration") ?? {})};
  const missing = [];
  for ( const [id, on] of Object.entries(moduleCfg) ) {
    if ( !globalThis.game.modules.get(id) ) { if ( on ) missing.push(id); continue; }
    cfg[id] = on;
  }
  await globalThis.game.settings.set("core", "moduleConfiguration", cfg);
  return missing;
}

/** Runs in the page as Gamemaster Test after the modules are on: Start a chronicle once, then what the world holds. */
export async function START(opts) {
  const g = globalThis.game, st = g.modules.get("wodx-storyteller")?.api;
  if ( !st?.setup?.run ) return {error: "WoDX Storyteller has no setup api"};
  const res = await st.setup.run(opts);
  const chron = g.modules.get("wodx-chronicle")?.api;
  const chronicleMods = [...g.modules].filter(m => m.active && m.api?.chronicle?.module === m.id).map(m => m.id);
  return {error: res?.error ?? null, done: res?.done ?? [], inPlay: chron?.chronicle?.currentId?.() ?? null, chronicleMods,
    active: [...g.modules].filter(m => m.active).map(m => m.id).sort()};
}
