/**
 * WoDX Storyteller 0.17.0: hardship on the road for the living. No Foundry calls here.
 *
 *   Weather: harsh weather deals 1 bashing at intervals the Storyteller sets, from once an hour to four times an
 *     hour; a Stamina roll resists each one (M20 p. 435; Sorcerers Crusade p. 208).
 *   Thirst and hunger: each day without, a Stamina roll puts the harm off a day, difficulty 6 and +1 a day; after 1
 *     day per Stamina dot without water, or 3 days per dot without food, the damage comes without a roll (M20
 *     pp. 435-436). Willpower can hold off hunger a day per point, never thirst.
 *   Sleep: each day past the first without sleep, a Stamina roll or the character is tired, 1 die off every roll,
 *     more each day; sleeping clears it (HH2 p. 90; lost sleep on later days as Wraith 20th pdf p. 355).
 * The difficulty for weather (6) and the bashing level a day of thirst or hunger deals are house rules.
 */

export const HOUR = 3600, DAY = 86400;
export const WEATHER = {
  none: {label: "No hardship", every: 0},
  harsh: {label: "Harsh: a roll an hour", every: HOUR},
  severe: {label: "Severe: a roll every half hour", every: HOUR / 2},
  deadly: {label: "Deadly: a roll every quarter hour", every: HOUR / 4}
};
export const WEATHER_DIFF = 6;
/** Storyteller 0.25.0: a scene left on "From the sky" takes its harshness from WoDX Atmosphere's weather for the day. */
export const AUTO = "auto";
export const AUTO_LABEL = "From the sky (WoDX Atmosphere's weather)";

/**
 * How harsh a day of WoDX Atmosphere weather is for someone out in it (house rule, B840): the books leave the
 * harshness to the Storyteller (M20 p. 435). d: Atmosphere's day {tempDay, tempNight, precip, intensity, wind,
 * deepSnow}. Bitter cold in a gale or a blizzard, or heat of 40°C, is deadly; freezing with snow, sleet or a gale, or
 * deep snow, or heat of 35°C, is severe; freezing nights, a gale, heavy cold rain or heat of 31°C is harsh.
 */
export function severityFromDay(d) {
  if ( !d || typeof d !== "object" ) return "none";
  const cold = Math.min(Number(d.tempNight ?? 10), Number(d.tempDay ?? 10)), hot = Number(d.tempDay ?? 10);
  const snow = d.precip === "snow", sleet = d.precip === "sleet", gale = d.wind === "gale", heavy = d.intensity === "heavy";
  const wet = ["rain", "sleet", "snow", "hail"].includes(d.precip);
  if ( (cold <= -10 && (gale || (snow && heavy))) || hot >= 40 ) return "deadly";
  if ( (cold <= -2 && (snow || sleet || gale)) || d.deepSnow || cold <= -15 || hot >= 35 ) return "severe";
  if ( cold <= -2 || gale || (heavy && wet && cold <= 5) || hot >= 31 ) return "harsh";
  return "none";
}
export const MAX_TIRED = 3;
export const MAX_ROLLS = 24;
export const REFS = {weather: "M20 p. 435; Sorcerers Crusade p. 208", thirst: "M20 pp. 435-436", hunger: "M20 pp. 435-436", sleep: "HH2 p. 90; Wraith 20th pdf p. 355"};

/** Who has these needs: the living. Vampires, wraiths and groups don't; a "PC" sheet with a clan is a vampire. */
export function isLiving(type, clan = "") {
  if ( /^(vampire|wraith|group|creature)$/i.test(String(type ?? "")) ) return false;
  if ( /^pc$/i.test(String(type ?? "")) && String(clan ?? "").trim() ) return false;
  return true;
}

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** A character's needs as stored, started at `now` for anything missing (a new character is fed and rested). */
export function normNeeds(x = {}, now = 0) {
  const o = x && typeof x === "object" ? x : {};
  const at = k => (Number.isFinite(Number(o[k])) && o[k] !== null && o[k] !== undefined ? Number(o[k]) : now);
  return {water: at("water"), food: at("food"), sleep: at("sleep"), exposed: at("exposed"), tired: Math.max(0, Math.min(MAX_TIRED, Math.round(n(o.tired)))),
    checked: {water: n(o.checked?.water), food: n(o.checked?.food), sleep: n(o.checked?.sleep)}, off: !!o.off};
}

export const daysSince = (t, now) => Math.max(0, Math.floor((now - t) / DAY));

/**
 * The checks due for thirst or hunger: one per new whole day without. Returns [{day, auto, diff}].
 * perDot: days of grace per Stamina dot (1 water, 3 food).
 */
export function needChecks(last, checkedDay, now, stamina, perDot) {
  const days = daysSince(last, now), out = [];
  const limit = Math.max(1, n(stamina)) * perDot;
  for ( let d = Math.max(1, checkedDay + 1); d <= days && out.length < 30; d++ ) out.push({day: d, auto: d > limit, diff: Math.min(10, 5 + d)});
  return out;
}

/** The sleep checks due: one per whole day awake past the first. */
export function sleepChecks(last, checkedDay, now) {
  const days = daysSince(last, now), out = [];
  for ( let d = Math.max(2, checkedDay + 1); d <= days && out.length < 30; d++ ) out.push({day: d, diff: 6});
  return out;
}

/** How many weather rolls are due since the last one. */
export function weatherRolls(exposedAt, now, severity) {
  const every = WEATHER[severity]?.every ?? 0;
  if ( !every || now <= exposedAt ) return 0;
  return Math.min(MAX_ROLLS, Math.floor((now - exposedAt) / every));
}

/** The penalty in dice for being tired. */
export const tiredPenalty = tired => -Math.max(0, Math.min(MAX_TIRED, Math.round(n(tired))));
