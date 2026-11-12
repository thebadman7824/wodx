/**
 * WoDX Storyteller 0.17.0: hardship on the road for the living. No Foundry calls here.
 *
 *   Weather: harsh weather deals 1 bashing at intervals the Storyteller sets, from once an hour to four times an
 *     hour; a Stamina roll resists each one (M20 p. 435).
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
 * How harsh a day of WoDX Atmosphere weather is for someone out in it (B840, thresholds per M20 p. 435 in 0.25.1,
 * B860). M20 names the dangers: below freezing, above about 120°F (49°C), ice storms and hurricane winds; milder
 * weather is narration and penalties only, with no harm. How often the harm comes is the Storyteller's call (house
 * rule): below freezing or 49°C is harsh; -10°C, or below freezing with a gale, heavy snow or sleet (an ice storm), or
 * 52°C is severe; -20°C, or -10°C with a gale or heavy snow, or 55°C is deadly. d: Atmosphere's day {tempDay,
 * tempNight, precip, intensity, wind}.
 */
export const FREEZING = 0, SCORCHING = 49;
export function severityFromDay(d) {
  if ( !d || typeof d !== "object" ) return "none";
  const cold = Math.min(Number(d.tempNight ?? 10), Number(d.tempDay ?? 10)), hot = Number(d.tempDay ?? 10);
  const gale = d.wind === "gale", heavySnow = d.precip === "snow" && d.intensity === "heavy", sleet = d.precip === "sleet";
  if ( cold <= -20 || (cold <= -10 && (gale || heavySnow)) || hot >= 55 ) return "deadly";
  if ( cold <= -10 || (cold < FREEZING && (gale || heavySnow || sleet)) || hot >= 52 ) return "severe";
  if ( cold < FREEZING || hot >= SCORCHING ) return "harsh";
  return "none";
}
export const MAX_TIRED = 3;
export const MAX_ROLLS = 24;
export const REFS = {weather: "M20 p. 435", thirst: "M20 pp. 435-436", hunger: "M20 pp. 435-436", sleep: "HH2 p. 90; Wraith 20th pdf p. 355"};

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

/**
 * Storyteller 0.30.0 (Traits With Teeth step 9): the weather roll is Stamina + Survival (house reading of M20 p. 435:
 * knowing how to shelter and dress for it counts), so a hunter or a Gangrel of the wilds weathers more than a clerk.
 */
export const weatherDice = (stamina, survival = 0) => Math.max(1, Math.round(n(stamina)) + Math.max(0, Math.round(n(survival))));
