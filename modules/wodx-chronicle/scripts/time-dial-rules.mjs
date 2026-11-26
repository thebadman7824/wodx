/**
 * #2510: the time dial's rules (no Foundry). A small dial on screen for everyone: the sun by day and the moon by
 * night travel round it, noon at the top and midnight at the foot, with the hour and the moon's phase in words.
 * Under the hour: the day, month and season where the scene stands (desk pick, 25 Nov).
 */

const SEASONS_N = ["winter", "winter", "spring", "spring", "spring", "summer", "summer", "summer", "autumn", "autumn", "autumn", "winter"];
const SEASONS_S = ["summer", "summer", "autumn", "autumn", "autumn", "winter", "winter", "winter", "spring", "spring", "spring", "summer"];
/** The season for a month (1 to 12), turned round south of the equator. */
export function seasonOf(month = 1, latitude = 50) {
  const m = Math.min(12, Math.max(1, Math.round(Number(month) || 1)));
  return (Number(latitude) < 0 ? SEASONS_S : SEASONS_N)[m - 1];
}

/** Degrees the hand turns from the top for an hour of the day (0 to 24): noon is 0, midnight is 180. */
export function dialAngle(hours = 0) {
  const h = ((Number(hours) || 0) % 24 + 24) % 24;
  return Math.round(((h - 12) / 24) * 360 * 10) / 10 % 360;
}

/** What the dial shows: {angle, night, icon, label, date, title}. t: a described time (place.mjs describeAt). */
export function dialView(t = {}) {
  const hours = (Number(t.hour) || 0) + (Number(t.minute) || 0) / 60;
  const night = !!t.isNight;
  const moon = String(t.moon?.name ?? "").trim();
  const label = String(t.timeLabel ?? "");
  const sun = [t.sunrise ? `sunrise ${t.sunrise}` : "", t.sunset ? `sunset ${t.sunset}` : ""].filter(Boolean).join(", ");
  const season = seasonOf(t.month, t.latitude);
  const year = Number(t.year);
  const yearWords = Number.isFinite(year) ? (year < 1 ? `${1 - year} BCE` : String(year)) : "";
  const date = t.day && t.monthName ? `${t.day} ${t.monthName}${yearWords ? ` ${yearWords}` : ""}, ${season}` : season;
  const title = [`${label}, ${night ? "night" : "day"}`, t.dateLabel ? `${t.dateLabel}, ${season}` : "", night && moon ? `the moon: ${moon.toLowerCase()}` : "", sun].filter(Boolean).join("; ");
  return {angle: dialAngle(hours), night, icon: night ? "fa-moon" : "fa-sun", label, date, season, title: `${title}.`};
}
