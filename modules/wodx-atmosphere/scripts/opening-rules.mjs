/**
 * WoDX Atmosphere 0.10.0: a scene's opening card. Pure rules, harness-tested.
 *
 * When a player's view moves to another scene, a short card shows the place, the date as the era tells it and, out
 * of doors, tonight's weather, then fades. Battle maps (named "⚔ BATTLEMAP · ...") and scenes the Storyteller marks
 * "no opening card" show none, and the same scene is not shown twice in a row.
 */

/** The place's name to show: the navigation name, else the scene's, without the battle map mark. */
export function placeName(scene) {
  const raw = String(scene?.navName || scene?.name || "").trim();
  return raw.replace(/^⚔\s*BATTLEMAP\s*·\s*/u, "").trim();
}

/** Should this scene get a card? last: the id of the scene that last showed one. */
export function wantsCard(scene, {last = null, on = true} = {}) {
  if ( !on || !scene?.id || scene.id === last ) return false;
  if ( /^⚔\s*BATTLEMAP/u.test(String(scene.name ?? "")) ) return false;
  if ( scene.flags?.["wodx-atmosphere"]?.noCard ) return false;
  return !!placeName(scene);
}

/** The card's lines: {place, when, weather}. told: {date, time} as the era tells it; weather: the night's label. */
export function cardLines(scene, {told = null, dateLabel = "", weather = "", outdoors = false} = {}) {
  const when = told ? `${told.date}, ${told.time}` : dateLabel;
  return {place: placeName(scene), when: String(when ?? ""), weather: outdoors && weather ? String(weather) : ""};
}
