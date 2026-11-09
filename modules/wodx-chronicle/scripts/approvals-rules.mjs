/**
 * Queue relief, the pure rules: where a new proposal goes (approved on its own, held back, or queued) and which
 * entries a bulk decision takes. No Foundry here: the harness tests every function.
 */

/** A player's own request always waits for the Storyteller; no standing rule approves it. */
export const NEVER_AUTO = ["request"];
/** Proposals from WoDX NPC (faction moves and the like) count toward the per-session cap. */
export const isNpcType = type => /^wodx-npc[.:-]/.test(String(type ?? ""));

/**
 * Where a new proposal goes. auto: {type: true} standing rules; cap: NPC proposals allowed this session (0: no cap);
 * used: NPC proposals already queued this session. Returns "auto", "hold" or "queue".
 */
export function routeProposal(type, {auto = {}, cap = 0, used = 0} = {}) {
  if ( auto?.[type] === true && !NEVER_AUTO.includes(type) ) return "auto";
  const c = Math.max(0, Math.trunc(Number(cap) || 0));
  if ( c && isNpcType(type) && Number(used) >= c ) return "hold";
  return "queue";
}

/** The pending ids a bulk decision takes: every one, less the exceptions, in queue order. */
export function bulkIds(pending = [], except = []) {
  const skip = new Set(except ?? []);
  return (pending ?? []).map(p => p?.id).filter(id => id && !skip.has(id));
}

/** The standing rules kept clean: known types only, never a player request, true values only. */
export function cleanAuto(auto = {}, known = null) {
  const out = {};
  for ( const [k, v] of Object.entries(auto ?? {}) ) {
    if ( v !== true || NEVER_AUTO.includes(k) ) continue;
    if ( known && !known.includes(k) ) continue;
    out[k] = true;
  }
  return out;
}
