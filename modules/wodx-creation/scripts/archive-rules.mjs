/**
 * The archive of the dead, by itself (B6414). No Foundry calls here.
 *
 * With the world setting "Archive the long dead by itself" set to a number of years, the clock moving on sends to the
 * archive everyone the archive window lists (the dead, and the copies Pass the Years keeps) who has been dead, or kept
 * as a copy, at least that many years, unless they must stay (a player's character, a linked token on a scene).
 * Links written in journals before the move are pointed at the archive's entry, and back when one is brought back.
 */

/** The choices for the setting: years, 0 for never. */
export const AUTO_YEARS = {0: "Never (by hand only)", 1: "After a year", 5: "After five years", 10: "After ten years", 25: "After twenty-five years", 50: "After fifty years"};
export const AUTO_DEFAULT = 10;

/**
 * Whether a candidate is due. c: {kind, died, stay, year}; diedYear: the calendar year of c.died (or null);
 * copyYear: the year a Pass the Years copy was kept from (its skip's end); nowYear; years: the setting.
 */
export function due(c, {diedYear = null, copyYear = null, nowYear, years} = {}) {
  const y = Number(years) || 0;
  if ( !(y > 0) || !c || c.stay || !Number.isFinite(Number(nowYear)) ) return false;
  const from = c.kind === "copy" ? copyYear : diedYear;
  if ( from === null || from === undefined || !Number.isFinite(Number(from)) ) return false;
  return Number(nowYear) - Number(from) >= y;
}

const PACK_UUID = "Compendium.world.wodx-archive.Actor.";

/**
 * A text's links to these actors, pointed at the archive (toArchive) or back at the world. Handles @UUID[Actor.id],
 * the old @Actor[id] form and the archive's own form. Returns the same string when nothing changed.
 */
export function relink(text, ids = [], toArchive = true) {
  let out = String(text ?? "");
  for ( const id of ids ) {
    if ( !/^[A-Za-z0-9]{16}$/.test(String(id)) ) continue;
    if ( toArchive ) {
      out = out.split(`@UUID[Actor.${id}]`).join(`@UUID[${PACK_UUID}${id}]`).split(`@Actor[${id}]`).join(`@UUID[${PACK_UUID}${id}]`)
        .split(`data-uuid="Actor.${id}"`).join(`data-uuid="${PACK_UUID}${id}"`);
    } else {
      out = out.split(`@UUID[${PACK_UUID}${id}]`).join(`@UUID[Actor.${id}]`).split(`data-uuid="${PACK_UUID}${id}"`).join(`data-uuid="Actor.${id}"`);
    }
  }
  return out;
}

/** Whether the clock crossed into a new day since the last look (one look a day at most). */
export const newDay = (last, now) => Math.floor(Number(now) / 86400) !== Math.floor(Number(last) / 86400);
