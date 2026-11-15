/**
 * WoDX Storyteller: NPCs who make their own supernatural items (B5970 to B5974). Pure: no Foundry calls.
 *
 * Once a month of world time the active Storyteller's client looks over the NPCs who could make something in a line
 * whose crafting switch is on (WoDX Library's wonder kits). A few of them, picked by chance, start one piece of work
 * as a long task, as a player would but with no approval card; the finished task puts the item on their sheet.
 */
import {MONTH} from "../../wodx-chronicle/scripts/terms.mjs";
export {MONTH};
/** At most this many NPCs start work in one month, so a large world is not flooded. */
export const PER_MONTH = 3;
/** The chance that one able NPC starts work in a month. */
export const CHANCE = 1 / 3;
/** The opts tried for a row, plainest first: some rows ask for Gnosis spent or the like (the kit's own blockers decide). */
export const TRIES = [{}, {spend: 1}, {spend: 2}];

/** Is a month gone since the last look? */
export const due = (last, now) => !Number(last) || Number(now) - Number(last) >= MONTH;

/**
 * Which NPCs start what. candidates: [{id, busy, works: [{line, key, opts, blocked}]}] (works already tried by the
 * caller against the kit's blockers). rand: () => [0, 1). Returns [{id, line, key, opts}], at most PER_MONTH.
 */
export function chooseWork(candidates = [], rand = Math.random, {perMonth = PER_MONTH, chance = CHANCE} = {}) {
  const out = [];
  for ( const c of candidates ) {
    if ( out.length >= perMonth ) break;
    if ( c.busy ) continue;
    const open = (c.works ?? []).filter(w => !w.blocked);
    if ( !open.length ) continue;
    if ( rand() >= chance ) continue;
    const w = open[Math.floor(rand() * open.length) % open.length];
    out.push({id: c.id, line: w.line, key: w.key, opts: w.opts ?? {}});
  }
  return out;
}

/** The first opts from TRIES that a row's blockers let through, or null. blockersOf(opts) -> [reasons]. */
export function optsFor(blockersOf) {
  for ( const o of TRIES ) { try { if ( !(blockersOf(o) ?? []).length ) return o; } catch (e) { /* try the next */ } }
  return null;
}
