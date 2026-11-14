/**
 * Town scars (B3759): a town's fire, flood, storm, quake, battle, sack or riot leaves lasting damage on that town's
 * scenes (WoDX Chronicle api.scars; this module's api.upkeep.townScars): burnt or flooded buildings, burst doors and broken walls, lights out, rubble.
 * Each week of the town turn rebuilds a share of it, faster in a thriving town; the town card's Undo takes it back.
 */
import * as MK from "./market-rules.mjs";
import * as Markets from "./markets.mjs";
import {MOD, chron, isActiveGM, setting} from "./core.mjs";

const scars = () => chron()?.scars ?? null;

export function registerTownScarSettings() {
  game.settings.register(MOD, "townScars", {name: "Disasters leave lasting damage on the map", hint: "A town's fire, flood, storm, earthquake, battle, sack or riot burns, floods or wrecks buildings on that town's scenes: darkened rooms, burst doors, broken walls, lights out and rubble. The town rebuilds a little each week; the town card's Undo puts the map back.",
    scope: "world", config: true, type: Boolean, default: true});
}

/** Scar every scene of a town for one event. Returns [{scene, id}]. */
export async function scarTown({town, kind, prosperity = 0} = {}, {seed = ""} = {}) {
  const S = scars();
  if ( !game.user.isGM || !S || setting("townScars") === false || !S.rules.SCAR_OF[kind] ) return [];
  const m = MK.marketById(Markets.state(), town);
  if ( !m ) return [];
  const severity = S.rules.severityOf({kind, prosperity});
  const out = [];
  for ( const sid of m.scenes ?? [] ) {
    const scene = game.scenes.get(sid);
    if ( !scene ) continue;
    const id = await S.scar({scene, kind, severity, source: `town:${town}`, seed: `${town}:${sid}:${seed || (game.time?.worldTime ?? 0)}`});
    if ( id ) out.push({scene: sid, id});
  }
  return out;
}

/** The week's rebuilding: each town's scenes mend a share of their scars by its prosperity. towns: {id: {prosperity}}. */
export async function healTowns(towns = {}) {
  const S = scars();
  if ( !game.user.isGM || !S ) return 0;
  let done = 0;
  for ( const m of Markets.state().markets ?? [] ) {
    const share = S.rules.healShare(towns[m.id]?.prosperity ?? 3);
    for ( const sid of m.scenes ?? [] ) {
      const scene = game.scenes.get(sid);
      if ( scene && S.list(scene).length ) done += await S.heal({scene, share});
    }
  }
  return done;
}

/** The town card's Undo: the damage its events left goes with it. */
export async function undoFor({towns = [], since = 0} = {}) {
  const S = scars();
  if ( !game.user.isGM || !S ) return 0;
  let n = 0;
  for ( const t of towns ) n += await S.undoFor({source: `town:${t}`, since});
  return n;
}

export function setupTownScars() {
  Hooks.on("wodxTown", p => {
    if ( !isActiveGM() ) return;
    scarTown(p).catch(e => console.error(`${MOD} | town scars`, e));
  });
}

export const api = () => ({scarTown, healTowns, undoFor});
