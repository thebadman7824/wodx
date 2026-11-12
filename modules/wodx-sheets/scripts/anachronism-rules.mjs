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

/* -------------------------------------------------------------- */
/*  Things on the maps (0.14.0)                                    */
/* -------------------------------------------------------------- */

/** Where a year falls in a span: "early" before from, "late" after until, "ok" inside, null with no year or span. */
export function spanStatus(span, year) {
  const y = Number(year) || 0, from = span?.from, until = span?.until;
  if ( !y || (!Number.isFinite(from) && !Number.isFinite(until)) ) return null;
  if ( Number.isFinite(from) && y < from ) return "early";
  if ( Number.isFinite(until) && y > until ) return "late";
  return "ok";
}
/** A container's line as a name and a count: "silver pennies (7)" is 7 of "silver pennies". */
export function lineOf(line) {
  const m = /^(.+?)\s+\((\d+)\)$/.exec(String(line ?? "").trim());
  return m ? {ref: m[1], count: Number(m[2])} : {ref: String(line ?? "").trim(), count: 1};
}
const keptKey = v => String(v ?? "").trim().toLowerCase();
/**
 * What a jump puts out of its time on the maps. things: [{scene, sceneName, id, wall, name, parts: [{key, label, from,
 * until}], goods: [lines], kept, keptGoods: [lines]}], as WoDX Interactables' datedParts gives them for each wall and
 * tile; lookLine(line) -> {name, eraInfo} for a line inside a container. With an empty `before`, everything out of its
 * time now is returned. Returns [{scene, sceneName, id, wall, key, name, status, note}], by scene and name.
 */
export function mapNewlyOut(things = [], lookLine = () => null, before = {}, after = {}) {
  const out = [], b = before ?? {};
  for ( const t of things ) {
    const base = {scene: t.scene, sceneName: t.sceneName ?? "", id: t.id, wall: !!t.wall};
    if ( !t.kept ) for ( const p of t.parts ?? [] ) {
      const now = spanStatus(p, after.year);
      if ( now !== "early" && now !== "late" ) continue;
      if ( spanStatus(p, b.year) === now ) continue;
      const own = t.name && t.name !== p.label ? `${t.name} (${p.label.toLowerCase()})` : p.label;
      out.push({...base, key: p.key, name: own, status: now, note: NOTE[now](after.year)});
    }
    const kept = new Set((t.keptGoods ?? []).map(keptKey)), seen = new Set();
    for ( const line of t.goods ?? [] ) {
      const k = keptKey(line);
      if ( !k || kept.has(k) || seen.has(k) ) continue;
      seen.add(k);
      const L = lookLine(line) ?? {};
      const now = eraStatus(L.eraInfo ?? null, after.era ?? null, after.year ?? 0);
      if ( now !== "early" && now !== "late" ) continue;
      if ( eraStatus(L.eraInfo ?? null, b.era ?? null, b.year ?? 0) === now ) continue;
      out.push({...base, key: `goods:${k}`, name: `${L.name ?? lineOf(line).ref}, in ${t.name ? t.name.toLowerCase() : "a container"}`, status: now, note: NOTE[now](after.year || "this year")});
    }
  }
  return out.sort((x, y) => x.sceneName.localeCompare(y.sceneName) || x.name.localeCompare(y.name));
}
/** The most rows of map things one card shows; the rest are counted. */
export const MAP_ROWS = 60;

/** Is the check on? "on", "off", or "auto": on everywhere but the Live world until the Storyteller turns it on there. */
export const isOn = (mode, live) => mode === "on" || (mode !== "off" && !live);
