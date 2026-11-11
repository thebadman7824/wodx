/**
 * WoDX Sheets 0.8.0: the anachronism check. Pure rules, harness-tested; the card and the hooks are in anachronism.mjs.
 *
 * When the clock jumps a year or more, or the era changes, each player character's possessions are read against the
 * new year with the same lists the Possessions tab uses (WoDX Library's gear by era and the era goods). What was fine
 * before and is out of its time now is put to the Storyteller on one card: things not made yet, and things no longer
 * made, which are rare antiques now. What was already out of its time before the jump, or that the Storyteller kept,
 * is not raised again.
 */
import {eraStatus, POSSESSION_TYPES, isKept} from "./extras-rules.mjs";

export const NOTE = {
  early: year => `not made yet in ${year}`,
  late: year => `no longer made in ${year}: a rare antique now`
};

/** A jump worth a check: a different era, or a year or more either way. at: {era, year}. */
export function jumped(before, after) {
  if ( !before || !after ) return false;
  if ( (before.era ?? null) !== (after.era ?? null) ) return true;
  return Math.abs((Number(after.year) || 0) - (Number(before.year) || 0)) >= 1;
}

/**
 * What a jump puts out of its time. items: an actor's items; look(item) -> {eraInfo}; before, after: {era, year}.
 * Returns [{id, name, status: "early" | "late", note}], sorted by name.
 */
export function newlyOut(items = [], look = () => ({}), before = {}, after = {}) {
  const out = [];
  for ( const it of items ) {
    if ( !POSSESSION_TYPES.includes(it.type) || isKept(it) ) continue;
    const info = look(it)?.eraInfo ?? null;
    const now = eraStatus(info, after.era ?? null, after.year ?? 0);
    if ( now !== "early" && now !== "late" ) continue;
    const was = eraStatus(info, before.era ?? null, before.year ?? 0);
    if ( was === now ) continue;
    out.push({id: it.id, name: it.name, status: now, note: NOTE[now](after.year || "this year")});
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Is the check on? "on", "off", or "auto": on everywhere but the Live world until the Storyteller turns it on there. */
export const isOn = (mode, live) => mode === "on" || (mode !== "off" && !live);
