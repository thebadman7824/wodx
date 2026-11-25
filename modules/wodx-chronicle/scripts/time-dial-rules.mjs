/**
 * #2510: the time dial's rules (no Foundry). A small dial on screen for everyone: the sun by day and the moon by
 * night travel round it, noon at the top and midnight at the foot, with the hour and the moon's phase in words.
 */

/** Degrees the hand turns from the top for an hour of the day (0 to 24): noon is 0, midnight is 180. */
export function dialAngle(hours = 0) {
  const h = ((Number(hours) || 0) % 24 + 24) % 24;
  return Math.round(((h - 12) / 24) * 360 * 10) / 10 % 360;
}

/** What the dial shows: {angle, night, icon, label, title}. t: a described time (calendar.mjs describeTime). */
export function dialView(t = {}) {
  const hours = (Number(t.hour) || 0) + (Number(t.minute) || 0) / 60;
  const night = !!t.isNight;
  const moon = String(t.moon?.name ?? "").trim();
  const label = String(t.timeLabel ?? "");
  const sun = [t.sunrise ? `sunrise ${t.sunrise}` : "", t.sunset ? `sunset ${t.sunset}` : ""].filter(Boolean).join(", ");
  const title = [`${label}, ${night ? "night" : "day"}`, night && moon ? `the moon: ${moon.toLowerCase()}` : "", sun].filter(Boolean).join("; ");
  return {angle: dialAngle(hours), night, icon: night ? "fa-moon" : "fa-sun", label, title: `${title}.`};
}
