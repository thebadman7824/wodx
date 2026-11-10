/**
 * WoDX Chronicle 0.9.0: time as the era tells it. Pure rules, harness-tested.
 *
 * The Storyteller's clock keeps the exact minute. A player's clock shows the date and the hour the way their character
 * would hear them told:
 *   Before 1350   the church's hours (Matins, Lauds, Prime, Terce, Sext, None, Vespers, Compline), and the day by its
 *                 feast or the season, "in the year of Our Lord".
 *   1350 to 1839  a striking clock: the hour to the nearest quarter, morning, afternoon or night.
 *   1840 on       railway and then standard time: 12-hour clock to the minute.
 *   The World of Future Darkness era: a 24-hour readout to the minute.
 * House rules: public clocks spread across Europe in the 14th century and railway time began in 1840; the books leave
 * timekeeping to the Storyteller.
 */

const ORD = n => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};
const HOUR_WORDS = ["twelve", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven"];

/** Which way the era tells time: "hours" | "striking" | "railway" | "digital". */
export function styleFor(year, eraId = "") {
  const y = Number(year) || 0;
  if ( eraId === "future-darkness" || eraId === "time-of-future-judgement" ) return "digital";
  if ( y >= 1840 ) return "railway";
  if ( y >= 1350 ) return "striking";
  return "hours";
}

/** The church hour for a time of day. hour: decimal hours; sunrise, sunset: decimal hours or null. */
export function canonicalHour(hour, sunrise = 6, sunset = 18) {
  const h = Number(hour) || 0;
  const rise = Number.isFinite(sunrise) ? sunrise : 6, set = Number.isFinite(sunset) ? sunset : 18;
  if ( h >= set - 1 && h < set + 1 ) return "Vespers, at dusk";
  if ( h >= set + 1 && h < Math.max(set + 2.5, 21) ) return "Compline, as the day ends";
  if ( h >= Math.max(set + 2.5, 21) || h < 2 ) return "the dead of night";
  if ( h < rise - 1 ) return "Matins, in the dark before dawn";
  if ( h < rise + 0.75 ) return "Lauds, at first light";
  if ( h < 8 ) return "Prime, early morning";
  if ( h < 11 ) return "Terce, mid-morning";
  if ( h < 14 ) return "Sext, about midday";
  return "None, the afternoon";
}

/** A striking clock's hour: "a quarter past three in the morning". */
export function strikingHour(hour, minute) {
  let total = Math.round(((Number(hour) || 0) * 60 + (Number(minute) || 0)) / 15) * 15;
  total %= 1440;
  const h = Math.floor(total / 60), q = (total % 60) / 15;
  const next = (h + (q === 3 ? 1 : 0)) % 24;
  const word = HOUR_WORDS[(q === 3 ? next : h) % 12];
  const part = hh => hh === 0 && !q ? "midnight" : hh === 12 && !q ? "noon" : hh < 5 || hh >= 21 ? "at night" : hh < 12 ? "in the morning" : hh < 18 ? "in the afternoon" : "in the evening";
  const p = part(q === 3 ? next : h);
  if ( p === "midnight" || p === "noon" ) return p;
  if ( q === 0 ) return `${word} o'clock ${p}`;
  if ( q === 1 ) return `a quarter past ${word} ${p}`;
  if ( q === 2 ) return `half past ${word} ${p}`;
  return `a quarter to ${word} ${p}`;
}

/** "3:15 a.m." */
export function railwayHour(hour, minute) {
  const h = (Number(hour) || 0) % 24, m = Number(minute) || 0;
  return `${(h % 12) || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "a.m." : "p.m."}`;
}

/**
 * The date and hour as the character would have them. d: describeTime()'s result (year, month, day, hour, minute,
 * weekday, monthName, sunrise/sunset as "HH:MM" or null); church: church.on()'s result or null.
 * Returns {style, date, time}.
 */
export function reckon(d, {church = null, eraId = ""} = {}) {
  const style = styleFor(d?.year, eraId);
  const hm = s => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s ?? "")); return m ? Number(m[1]) + Number(m[2]) / 60 : null; };
  const hour = (Number(d?.hour) || 0) + (Number(d?.minute) || 0) / 60;
  if ( style === "hours" ) {
    const named = church?.day || null;
    const season = church?.season && !/ordinary/i.test(church.season) ? church.season : null;
    const date = named ? `${d.weekday}, ${named}, in the year of Our Lord ${d.year}`
      : `${d.weekday}, the ${ORD(d.day)} day of ${d.monthName}${season ? `, in ${season}` : ""}, in the year of Our Lord ${d.year}`;
    return {style, date, time: canonicalHour(hour, hm(d.sunrise), hm(d.sunset))};
  }
  if ( style === "striking" ) return {style, date: `${d.weekday}, ${ORD(d.day)} ${d.monthName} ${d.year}`, time: strikingHour(d.hour, d.minute)};
  if ( style === "railway" ) return {style, date: `${d.weekday}, ${d.day} ${d.monthName} ${d.year}`, time: railwayHour(d.hour, d.minute)};
  return {style, date: `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`,
    time: `${String(d.hour).padStart(2, "0")}:${String(d.minute).padStart(2, "0")}`};
}
