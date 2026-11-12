/**
 * WoDX Chronicle 0.37.0: a scene's own place for the sun, the rules (no Foundry).
 *
 * The world clock tells the time at home (the chronicle's latitude). A scene far from home (Cairo, London, the Wild
 * West Americas) can carry its own latitude and an offset in hours from home, kept in the scene flag
 * wodx-chronicle.place {latitude, offset}. Sun, sky and the scene's own hour read it; the world clock, dusk and dawn
 * on the Clock, routines and every timed rule keep home time (B1709). Before standard time zones the offset is the
 * difference in sun time; a whole number of hours is close enough at the table.
 */

export const OFFSET_MIN = -12, OFFSET_MAX = 14;

/** A stored place kept clean: {latitude: number|null, offset: number}. */
export function cleanPlace(p = {}) {
  const lat = p?.latitude === "" || p?.latitude === null || p?.latitude === undefined ? NaN : Number(p.latitude);
  const off = Number(p?.offset);
  return {
    latitude: Number.isFinite(lat) ? Math.max(-89, Math.min(89, lat)) : null,
    offset: Number.isFinite(off) ? Math.max(OFFSET_MIN, Math.min(OFFSET_MAX, Math.round(off * 2) / 2)) : 0
  };
}

/** Does the scene keep its own place? */
export const hasOwnPlace = p => { const c = cleanPlace(p); return c.latitude !== null || c.offset !== 0; };

/** The latitude and the world time to use for a scene: {latitude, time, own}. */
export function placeTime(p, worldTime, homeLatitude) {
  const c = cleanPlace(p);
  const home = Number.isFinite(Number(homeLatitude)) ? Number(homeLatitude) : 50.1;
  return {latitude: c.latitude ?? home, time: Number(worldTime) + c.offset * 3600, own: hasOwnPlace(c), offset: c.offset};
}

/** The offset in words: "same hour as home", "3 hours ahead of home". */
export function offsetWords(offset) {
  const o = Number(offset) || 0;
  if ( !o ) return "same hour as home";
  const h = Math.abs(o);
  return `${h} hour${h === 1 ? "" : "s"} ${o > 0 ? "ahead of" : "behind"} home`;
}
