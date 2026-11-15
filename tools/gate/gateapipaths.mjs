/**
 * Cross-module api paths (B6200), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateapipaths.mjs?${Date.now()}`)).run()
 * The done-claims audit (15 November 2026) found features wired to an api path that does not exist, so they did
 * nothing and no error showed: WoDX Chronicle read Storyteller api.towns (it is api.upkeep.towns) and Storyteller's
 * hunters read NPC api.carry.orderCarry (it is api.orderCarry). tools/audit/api-paths.mjs lists every path one module
 * reads from another's api into tools/gate/fixtures/api-paths.json; this gate walks each one on the live api objects.
 *   1. the fixture loads and every WoDX module named in it is active with an api
 *   2. every place in the code that reads an api finds at least one of the paths it tries (a `a ?? b` fallback
 *      counts as one place); the misses are listed with file and line
 * Makes nothing, moves nothing. Result: Data/wodx-gate/gateapipaths-result.json.
 */
import {gate} from "./kit.mjs";

/** Does the api hold this path? A key that is there but null or undefined still counts: it is set later. */
export function holds(api, path) {
  let o = api;
  for ( const k of path ) {
    if ( o === null || o === undefined ) return false;
    if ( (typeof o !== "object" && typeof o !== "function") || !(k in o) ) return false;
    o = o[k];
  }
  return true;
}

export async function run() {
  const G = gate("gateapipaths");
  try {
    let list = [];
    await G.step("1. fixture and apis", async () => {
      list = await G.fixture("api-paths.json");
      const targets = [...new Set(list.map(r => r.target))];
      const missing = targets.filter(t => game.modules.get(t)?.active && !game.modules.get(t)?.api);
      const inactive = targets.filter(t => !game.modules.get(t)?.active);
      G.ok("1. fixture and apis", list.length > 100 && !missing.length, {paths: list.length, targets: targets.length, missing, inactive});
    });

    await G.step("2. every api read finds its path", async () => {
      // group by the place that reads (file:line) and the module read from
      const places = new Map();
      for ( const r of list ) {
        if ( !game.modules.get(r.target)?.active ) continue;
        for ( const u of r.uses ) {
          const k = `${u} ${r.target}`;
          if ( !places.has(k) ) places.set(k, []);
          places.get(k).push(r.path);
        }
      }
      const misses = [], partial = [];
      for ( const [k, paths] of places ) {
        const api = game.modules.get(k.split(" ")[1])?.api;
        const found = paths.filter(p => holds(api, p));
        if ( !found.length ) misses.push(`${k.replace(/^modules\//, "").replace(" wodx-", ">")} ${paths.map(p => p.join(".")).join("|")}`);
        else if ( found.length < paths.length ) partial.push(`${k}: ${paths.filter(p => !holds(api, p)).map(p => p.join(".")).join(" | ")}`);
      }
      // what Library's api holds, and why its look could be missing (B6203)
      const lib = game.modules.get("wodx-library")?.api;
      let lookStart = lib?.look ? "started" : null;
      if ( !lookStart ) try { const Lk = await import("/modules/wodx-library/scripts/look.mjs"); await Lk.setupLook(); lookStart = `restartable: ${Object.keys(Lk.api()).length} keys`; } catch (e) { lookStart = `error: ${e?.message ?? e}`; }
      G.ok("2. every api read finds its path", !misses.length, {lookStart, libraryKeyCount: Object.keys(lib ?? {}).length, misses, places: places.size, partialFallbacks: partial.length, partial: partial.slice(0, 40)});
    });
  } finally { return G.finish(); }
}
