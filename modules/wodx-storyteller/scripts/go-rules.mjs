/**
 * WoDX Storyteller 0.64.0 (B2910): "Go" on the world map. A journey read off the map becomes a trip the party makes:
 * the clock moves on by the days it takes, each day on the way may bring a meeting, and the party arrives in the
 * part of the world at the far end (its money and its people). Pure rules, no Foundry.
 */

/** Most meetings one long journey can bring, so a voyage of months is not a page of cards. */
export const MAX_MEETINGS = 3;
/** A day by sea or by air brings fewer meetings than a day on the road. */
export const WAY_FACTOR = {surface: 1, air: 0.25};

/**
 * The trip for a journey {surface: {days, legs}, air: {days}} and a way ("surface" or "air").
 * chance: the road's chance in a hundred for one check (the Storyteller's encounter chance); rand: () => 0..1.
 * Returns null when the journey cannot be made, else {way, days, seconds, meetings: [day index...], legs}.
 */
export function goPlan(j, {way = "surface", chance = 10, rand = Math.random} = {}) {
  if ( !j || j.unknown || j.noWay ) return null;
  const by = way === "air" && j.air ? "air" : "surface";
  const leg = by === "air" ? j.air : j.surface;
  const days = Math.max(1, Math.round(Number(leg?.days) || 0));
  if ( !leg ) return null;
  const p = Math.max(0, Math.min(100, Number(chance) || 0)) / 100 * WAY_FACTOR[by];
  const meetings = [];
  for ( let d = 0; d < days && meetings.length < MAX_MEETINGS; d++ ) if ( p && rand() < p ) meetings.push(d);
  return {way: by, days, seconds: days * 86400, meetings, legs: by === "surface" ? (leg.legs ?? []) : []};
}

/** The words for the Storyteller's card. */
export function goLines(plan, {from = "", to = "", names = []} = {}) {
  if ( !plan ) return ["No known way leads there in this year."];
  const n = d => (d === 1 ? "1 day" : `${d} days`);
  const out = [`${names.length ? names.join(", ") : "The party"} ${names.length === 1 ? "goes" : "go"} from ${from} to ${to}: ${n(plan.days)} ${plan.way === "air" ? "by air" : "by land and sea"}.`];
  out.push(plan.meetings.length ? `On the way: ${plan.meetings.map(d => `day ${d + 1}`).join(", ")} ${plan.meetings.length === 1 ? "brings a meeting" : "each bring a meeting"}.` : "Nothing meets them on the way.");
  return out;
}
