/**
 * WoDX Actions 3.45.0: how the night itself changes a hunt (house rule, missed connections x6).
 *
 * The hunting grounds of V20 p. 334 set the base difficulty. On top of that, the street can be emptier than the ground
 * suggests: the hour and the era decide how many people are out (the same crowd numbers as WoDX NPC passers-by), and
 * bad weather keeps people indoors. The hunt window shows the result as a suggestion the player or Storyteller can change.
 */
import {CROWD, AREA_CROWD, DENSITY, ageOf, bandOf} from "../../wodx-npc/scripts/passerby-rules.mjs";
import {tagsOf} from "../../wodx-atmosphere/scripts/weather-rules.mjs";

const INDOORS_WEATHER = ["storm", "downpour", "gale", "thunder", "sleet", "blizzard"];

/**
 * {n, reasons[]}: extra difficulty, at most +3. year and hour from the chronicle clock; area: a hunting ground key;
 * density: the scene's crowd setting (quiet, normal, busy); weather: Atmosphere's weather for the night, or null.
 */
export function huntNudge({year = 0, hour = 22, area = "market", density = "normal", weather = null, indoor = false} = {}) {
  const reasons = [];
  let n = 0;
  const age = ageOf(year), band = bandOf(hour);
  const out = (CROWD[age]?.[band] ?? 0) * (AREA_CROWD[area] ?? 1) * (DENSITY[density]?.mult ?? 1);
  const when = {day: "by day", evening: "in the evening", night: "at night", late: "in the small hours"}[band];
  if ( out < 0.75 ) { n += 2; reasons.push(`the streets are all but empty ${when}`); }
  else if ( out < 1.75 ) { n += 1; reasons.push(`few people are out ${when}`); }
  if ( !indoor && weather ) {
    const base = weather.tags ?? (() => { try { return tagsOf(weather); } catch (e) { return []; } })();
    const tags = new Set([...base, weather.sky, weather.intensity === "heavy" && base.includes("snow") ? "blizzard" : null].filter(Boolean));
    const bad = INDOORS_WEATHER.find(t => tags.has(t));
    if ( bad ) { n += 1; reasons.push(bad === "blizzard" ? "heavy snow keeps people indoors" : "the weather keeps people indoors"); }
  }
  return {n: Math.min(3, n), reasons};
}

/** One line for the window: "+2: the streets are all but empty in the small hours; the weather keeps people indoors". */
export const nudgeText = nd => nd.n ? `+${nd.n}: ${nd.reasons.join("; ")}` : "";
