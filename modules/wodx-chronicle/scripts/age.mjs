/**
 * WoDX Chronicle 0.53.0: the age floor at play (the rules are in age-rules.mjs). api.age.minor(actor) says whether a
 * character is under 18 now; api.age.romance(...actors) is the check every romantic or sexual action calls first.
 * A world-wide guard also takes a lover, spouse or troth tie off a sheet when either end is a minor, whatever made it.
 */
import * as AR from "./age-rules.mjs";
import {getEngine} from "./calendar.mjs";

const yearOf = t => { try { return getEngine().timeToDate(Number(t) || 0).year; } catch (e) { return null; } };
const actorOf = x => (x?.documentName === "Actor" ? x : x?.actor ?? (typeof x === "string" ? game.actors.get(x) ?? (x.includes(".") ? fromUuidSync(x) : null) : null));

/** Under 18 now (or at the year given). Unknown actors count as adults. */
export function minor(x, year = yearOf(game.time.worldTime)) {
  const a = actorOf(x);
  return a ? AR.isMinor(AR.ageFacts(a, yearOf), year) : false;
}
/** The check before anything romantic or sexual: {ok, why}. */
export function romance(...people) {
  return AR.romanceAllowed(people.map(actorOf).filter(Boolean).map(a => ({name: a.name, minor: minor(a)})));
}
/** Refuse with a short note to the one who tried; true when it may go on. */
export function allowRomance(...people) {
  const r = romance(...people);
  if ( !r.ok ) ui.notifications?.warn?.(r.why);
  return r.ok;
}

/** Take romantic ties to or from a minor off a tie list being written to a sheet. */
function guardTies(actor, ties) {
  if ( !Array.isArray(ties) ) return null;
  const minorUuid = uuid => { try { const d = uuid ? fromUuidSync(uuid) : null; return d?.documentName === "Actor" ? minor(d) : false; } catch (e) { return false; } };
  const safe = AR.safeTies(ties, minor(actor), minorUuid);
  return safe.length === ties.length ? null : safe;
}
export function listen() {
  Hooks.on("preUpdateActor", (actor, change) => {
    const ties = foundry.utils.getProperty(change, "flags.wodx-sheets.ties");
    const safe = guardTies(actor, ties);
    if ( !safe ) return;
    foundry.utils.setProperty(change, "flags.wodx-sheets.ties", safe);
    ui.notifications?.warn?.(`A lover, spouse or troth tie was not kept: WoDX does not allow romance with anyone under ${AR.ADULT_AGE}.`);
  });
  Hooks.on("preCreateActor", (actor, data) => {
    const safe = guardTies(actor, foundry.utils.getProperty(data, "flags.wodx-sheets.ties"));
    if ( safe ) actor.updateSource({"flags.wodx-sheets.ties": safe});
  });
}
export const rules = AR;
