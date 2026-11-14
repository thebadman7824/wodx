/**
 * A Gauntlet that moves, the pure part. No Foundry in here.
 *
 * The era's chart already sets the Gauntlet for each kind of place (Dark Ages: Werewolf, W20, Wyld West), so a
 * Dark Ages village and a 1990s village differ by the books. On top of that, a place drifts with what happens there:
 * Wyrm taint or a desecration thickens it, a caern's rites thin it, and an untended caern lets it close. House rule:
 * each step is 1, the drift stays between -3 and +3, and the result stays inside the chart's 1 to 10.
 *
 * Banality drifts the same way, on its own track (C20 rates a place's Banality 0 to 10): Glamour fed by art and
 * dreams lowers it, crowds of disbelief raise it. It only moves a place that has a Banality rating.
 *
 * The Shroud drifts too (Otherworlds 0.18.0, B2357): mass death thins it, a point for a year and a day after a
 * battle (Wraith 20th puts the Shroud lowest at places of death and grief), and it heals back. Only a place with a
 * Shroud rating moves, inside Wraith 20th's 4 to 10.
 */

export const DRIFT = {min: -3, max: 3};

export const DRIFT_KINDS = {
  taint: {label: "Wyrm taint or a desecration", step: 1},
  weaver: {label: "The Weaver builds (a factory, a railway, a city block)", step: 1},
  rite: {label: "A rite at the caern (it is tended and grows)", step: -1},
  wild: {label: "The Wyld returns (a ruin overgrown, a place abandoned)", step: -1},
  neglect: {label: "The caern goes untended", step: 1},
  mend: {label: "The taint is cleansed", step: -1},
  dreaming: {label: "Dreams and art feed the place's Glamour (Banality)", step: -1, track: "banality"},
  disbelief: {label: "Crowds, routine and disbelief (Banality)", step: 1, track: "banality"},
  massdeath: {label: "Mass death: a battle, a massacre, a plague pit (the Shroud thins)", step: -1, track: "shroud"},
  shroudheals: {label: "The Shroud heals as the grief fades", step: 1, track: "shroud"},
  // B3526: the Storyteller's crisis lever for a region; its step and track are given each time
  lever: {label: "The Storyteller's lever for the region", step: 0}
};
export const TRACKS = ["value", "banality", "shroud"];
const trackOf = (kind, e = null) => (kind === "lever" && TRACKS.includes(e?.track) ? e.track : DRIFT_KINDS[kind]?.track ?? "value");

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function normDrift(d = {}) {
  const log = Array.isArray(d.log) ? d.log.slice(-30).map(e => ({at: num(e.at), kind: DRIFT_KINDS[e.kind] ? e.kind : "taint", step: num(e.step), why: String(e.why ?? "").slice(0, 200),
    ...(e.kind === "lever" && TRACKS.includes(e.track) ? {track: e.track} : {})})) : [];
  const clampD = v => Math.max(DRIFT.min, Math.min(DRIFT.max, Math.round(num(v))));
  return {value: clampD(d.value), banality: clampD(d.banality), shroud: clampD(d.shroud), log};
}

/** Move a place's drift one step for a kind of event. Returns the new record and whether it changed. */
export function addDrift(d, kind, {at = 0, why = ""} = {}) {
  const cur = normDrift(d), k = DRIFT_KINDS[kind];
  const t = trackOf(kind);
  if ( !k ) return {...cur, changed: false, before: cur[t]};
  const v = Math.max(DRIFT.min, Math.min(DRIFT.max, cur[t] + k.step));
  const changed = v !== cur[t];
  return {...cur, [t]: v, log: changed ? [...cur.log, {at, kind, step: v - cur[t], why: String(why).slice(0, 200)}].slice(-30) : cur.log, changed, before: cur[t]};
}

/**
 * B3526: move one track by a given step for the Storyteller's lever (any size; the drift still stays inside -3 to +3).
 * Returns the new record, whether it changed, and the step that was actually taken.
 */
export function leverDrift(d, track, step, {at = 0, why = ""} = {}) {
  const cur = normDrift(d), t = TRACKS.includes(track) ? track : "value";
  const v = Math.max(DRIFT.min, Math.min(DRIFT.max, cur[t] + Math.round(num(step))));
  const taken = v - cur[t];
  return {...cur, [t]: v, log: taken ? [...cur.log, {at, kind: "lever", track: t, step: taken, why: String(why).slice(0, 200)}].slice(-30) : cur.log, changed: !!taken, taken};
}

/** Undo the last step. */
export function undoDrift(d) {
  const cur = normDrift(d), last = cur.log.at(-1);
  if ( !last ) return cur;
  const t = trackOf(last.kind, last);
  return {...cur, [t]: Math.max(DRIFT.min, Math.min(DRIFT.max, cur[t] - last.step)), log: cur.log.slice(0, -1)};
}

/** The Gauntlet with drift on top: 0 stays 0 (no roll needed), otherwise 1 to 10. */
export function withDrift(gauntlet, drift) {
  if ( gauntlet === null || gauntlet === undefined ) return gauntlet;
  if ( gauntlet === 0 ) return 0;
  return Math.max(1, Math.min(10, gauntlet + num(drift)));
}

/** A place's Banality with its drift: only a rated place moves, inside 0 to 10. */
export function banalityWithDrift(banality, drift) {
  if ( banality === null || banality === undefined || banality === "" ) return null;
  return Math.max(0, Math.min(10, num(banality) + num(drift)));
}

/** A place's Shroud with its drift: only a rated place moves, inside 4 to 10 (Wraith 20th). */
export function shroudWithDrift(shroud, drift) {
  if ( shroud === null || shroud === undefined || shroud === "" ) return null;
  return Math.max(4, Math.min(10, num(shroud) + num(drift)));
}
