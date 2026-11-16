/**
 * The archive of the dead, by itself (B6414). No Foundry calls here.
 *
 * With the world setting "Archive the long dead by itself" set to a number of years, the clock moving on sends to the
 * archive everyone the archive window lists (the dead, and the copies Pass the Years keeps) who has been dead, or kept
 * as a copy, at least that many years, unless they must stay (a player's character, a linked token on a scene).
 * Links written in journals before the move are pointed at the archive's entry, and back when one is brought back.
 */

/** The choices for the setting: years, 0 for never. */
import {DAY} from "../../wodx-chronicle/scripts/terms.mjs";
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
  const out = String(text ?? "");
  // B6770: one pass over the text with a set of ids, so a world of thousands of sheets relinks quickly
  if ( !out.includes("Actor") ) return out;
  const set = new Set([...ids].map(String).filter(id => /^[A-Za-z0-9]{16}$/.test(id)));
  if ( !set.size ) return out;
  const P = PACK_UUID.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if ( toArchive ) {
    return out.replace(/@UUID\[Actor\.([A-Za-z0-9]{16})\]|@Actor\[([A-Za-z0-9]{16})\]|data-uuid="Actor\.([A-Za-z0-9]{16})"/g, (m, a, b, c) => {
      const id = a ?? b ?? c;
      if ( !set.has(id) ) return m;
      return c ? `data-uuid="${PACK_UUID}${id}"` : `@UUID[${PACK_UUID}${id}]`;
    });
  }
  const re = new RegExp(`@UUID\\[${P}([A-Za-z0-9]{16})\\]|data-uuid="${P}([A-Za-z0-9]{16})"`, "g");
  return out.replace(re, (m, a, c) => {
    const id = a ?? c;
    if ( !set.has(id) ) return m;
    return c ? `data-uuid="Actor.${id}"` : `@UUID[Actor.${id}]`;
  });
}

/** The text fields of a character sheet that can hold links (the system's bio boxes, and the PC sheet's bio). */
export const ACTOR_TEXT = ["system.appearance", "system.background", "system.roleplaytip", "system.notes", "system.gear",
  "system.bio.appearance", "system.bio.background", "system.bio.roleplaytip"];
/** The text fields of an item that can hold links. */
export const ITEM_TEXT = ["system.description"];

const at = (o, path) => path.split(".").reduce((v, k) => (v == null ? undefined : v[k]), o);

/**
 * B6770: the update that points one document's text fields at the archive (or back), or null when nothing changes.
 * doc: a plain object or a document (read by path); fields: the paths above.
 */
export function relinkFields(doc, fields = [], ids = [], toArchive = true) {
  const up = {};
  for ( const f of fields ) {
    const was = at(doc, f);
    if ( typeof was !== "string" || !was ) continue;
    const now = relink(was, ids, toArchive);
    if ( now !== was ) up[f] = now;
  }
  return Object.keys(up).length ? up : null;
}

/** Whether the clock crossed into a new day since the last look (one look a day at most). */
export const newDay = (last, now) => Math.floor(Number(now) / DAY) !== Math.floor(Number(last) / DAY);
