/**
 * The Live worlds (Chronicle Packs Desk d4, B7564): one list every WoDX module reads, instead of a copy in each. A
 * Live world is one players reach; WoDX modules never seed, build, test or change it without the owner.
 *
 * LIVE_WORLDS starts with the Live world that exists today, so the guard holds even with every chronicle module off,
 * and grows when a chronicle module registers (its manifest's `live` list; chronicle-data.mjs registerChronicle).
 * A world with flags.wodx.liveWorld counts too. Pure: no Foundry calls.
 */
export const LIVE_WORLDS = ["rothenstein-live"];

/** Add a chronicle's Live worlds (from its manifest). */
export function addLiveWorlds(ids = []) {
  for ( const id of ids ) if ( id && !LIVE_WORLDS.includes(String(id)) ) LIVE_WORLDS.push(String(id));
  return LIVE_WORLDS;
}

/** Is this world a Live world? world: a world id, or a world ({id, flags}). */
export function isLiveWorld(world) {
  const id = typeof world === "string" ? world : world?.id;
  return LIVE_WORLDS.includes(String(id ?? "")) || !!(typeof world === "object" && world?.flags?.wodx?.liveWorld);
}
