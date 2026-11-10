/**
 * Gear by era, the pure part: turns one row of the book tables (docs/research/gear-tables) into the system's own
 * item data, and picks what an era's characters can carry. No Foundry in here, so the build script and the tests
 * use it too.
 */

export const MOD = "wodx-library";

/** Which eras each book's gear belongs to (a house rule where a book does not say; see PENDING-REVIEW). */
export const SOURCES = {
  "v20-dark-ages": {label: "Vampire: The Dark Ages 20th Anniversary", short: "V20 Dark Ages", eras: ["dark-ages", "long-night"]},
  "sorcerers-crusade": {label: "Mage: The Sorcerers Crusade", short: "Sorcerers Crusade", eras: ["renaissance"]},
  "v20-wild-west": {label: "V20 The Wild West", short: "V20 Wild West", eras: ["victorian", "wild-west"]},
  "great-war": {label: "Wraith: The Great War", short: "Great War", eras: ["great-war"]},
  "v20-core": {label: "Vampire: The Masquerade 20th Anniversary", short: "V20", eras: ["victorian", "wild-west", "great-war", "modern", "time-of-judgment", "future-darkness"]},
  "world-of-future-darkness": {label: "World of Future Darkness (White Wolf Magazine)", short: "World of Future Darkness", eras: ["future-darkness"]},
  "cyberpunk-2020": {label: "Cyberpunk 2020", short: "Cyberpunk 2020", eras: ["future-darkness"]}
};
/** V20 firearms are modern guns: from the Great War on. Its blades, clubs and armor serve from the Victorian era. */
export const V20_FIREARM_ERAS = ["great-war", "modern", "time-of-judgment", "future-darkness"];

/** An era that carries another's gear and books: the Time of Future Judgement (2099) is Future Darkness's last year. */
export const ERA_LIKE = {"time-of-future-judgement": "future-darkness"};
export const ERA_ORDER = ["dark-ages", "long-night", "renaissance", "victorian", "wild-west", "great-war", "modern", "time-of-judgment", "future-darkness", "time-of-future-judgement"];

const BLUNT = /\b(sap|club|mace|staff|quarterstaff|hammer|warhammer|war hammer|rock|sling|flail|chair|table|tankard|candlestick|branch|knucks|whip|cat-o)/i;
const dash = v => { const s = String(v ?? "").trim(); return s === "" || s === "—" || s === "-" || /^n\/?a$/i.test(s) ? "" : s; };
/** A cell with the chart's "no entry" mark and any long dash made plain. */
export const clean = v => dash(v).replace(/\s*—\s*/g, ", ");
const int = v => { const m = String(v ?? "").match(/-?\d+/); return m ? Number(m[0]) : 0; };

/** Split a markdown table into rows of cells keyed by the header. */
export function parseTable(md) {
  const lines = String(md).split(/\r?\n/).filter(l => l.trim().startsWith("|"));
  if ( lines.length < 2 ) return [];
  const cells = l => l.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
  const head = cells(lines[0]).map(h => h.toLowerCase());
  return lines.slice(2).map(l => Object.fromEntries(cells(l).map((c, i) => [head[i] ?? `c${i}`, c])));
}

/** "Str+2 (L)", "Str+2L", "Str+0B", "Str+5", "4", "3L", "8 (16)" → {attribute, bonus, type}. */
export function parseDamage(text, name = "") {
  const s = dash(text);
  const str = /^str/i.test(s);
  const rest = str ? s.replace(/^str\s*/i, "") : s;
  const bonus = int(rest);
  const letter = (rest.match(/\d\s*\(?\s*([BLA])\b/) ?? rest.match(/\(([BLA])\)/))?.[1];
  let type = {B: "bashing", L: "lethal", A: "aggravated"}[letter] ?? (BLUNT.test(name) ? "bashing" : "lethal");
  if ( /aggravated/i.test(s) ) type = "aggravated";
  return {attribute: str ? "strength" : "", bonus, type};
}

/** A weapon's difficulty: a number, "+1" on top of 6, or 6 when the chart gives none. */
export function parseDifficulty(text) {
  const s = dash(text);
  if ( /^\+\d/.test(s) ) return 6 + int(s);
  const n = s.match(/^\d+/);
  return n ? Number(n[0]) : 6;
}

function pageRef(row, source) {
  return `${SOURCES[source].short}, ${dash(row.page)}`;
}

function notesOf(row) {
  const out = [];
  const name = row.name ?? "";
  const paren = name.match(/\(([^)]*)\)/g)?.map(x => x.slice(1, -1)) ?? [];
  out.push(...paren);
  const page = dash(row.page);
  const extra = page.match(/\(([^)]*)\)\s*$/)?.[1];
  if ( extra ) out.push(extra);
  return out.filter(Boolean);
}

const cleanName = n => String(n ?? "").replace(/\s*\([^)]*\)/g, "").replace(/\*\*/g, "").trim();

/**
 * One table row → item data for the system ({name, type, system, flags}), or null for a category heading.
 * kind decides the item type: melee → Melee Weapon; ranged and thrown → Ranged Weapon; armor → Armor; the rest
 * (cyberware, crew-served guns, shields and parries) → Item, with soak-giving implants as Armor.
 */
export function rowToItem(row, source, extra = {}) {
  const kind = dash(row.kind).toLowerCase();
  const rawName = row.name ?? "";
  if ( /\(category\)/i.test(rawName) || /^[A-Z ,()]+$/.test(cleanName(rawName)) && /category/i.test(rawName) ) return null;
  const name = cleanName(rawName) || rawName;
  const ref = pageRef(row, source);
  const notes = notesOf(row);
  let eras = [...SOURCES[source].eras];
  if ( source === "v20-core" && kind === "ranged" ) eras = [...V20_FIREARM_ERAS];
  const flags = {[MOD]: {source, page: dash(row.page), eras, kind, notes, ...extra}};
  const base = {reference: ref, description: notes.length ? `<p>${notes.join("; ")}</p>` : "", isequipped: false};
  const conceal = dash(row.conceal).replace(/\s*\(.*$/, "");
  const minstrength = int(row["min strength"]);
  const soakText = dash(row["armor rating or soak"]);
  const dexText = dash(row["dex penalty"]);

  if ( kind === "melee" || kind === "cyberweapon" && /str/i.test(row.damage ?? "") || /^cyber (hand|foot)$/.test(kind) && /str/i.test(row.damage ?? "") ) {
    const d = parseDamage(row.damage, name);
    return {name, type: "Melee Weapon", img: "icons/svg/sword.svg", system: {...base, difficulty: parseDifficulty(row.difficulty),
      damage: {attribute: d.attribute || "strength", bonus: d.bonus, type: d.type, isrollable: true},
      attack: {attribute: "dexterity", ability: kind === "melee" ? "melee" : "brawl", accuracy: 0, isrollable: true},
      minstrength, conceal, istwohanded: /two-handed|2 hands/i.test(rawName + row.page)}, flags};
  }
  if ( kind === "ranged" || kind === "thrown" || kind === "ranged (firearm)" ) {
    const d = parseDamage(row.damage, name);
    const rate = dash(row.rate);
    const clip = dash(row.clip);
    if ( rate && !/^\d+$/.test(rate.replace(/\*$/, "")) ) flags[MOD].notes.push(`Rate ${rate}`);
    if ( clip && !/^\d+(\+1)?$/.test(clip) ) flags[MOD].notes.push(`Clip ${clip}`);
    return {name: kind === "thrown" ? `${name}, thrown` : name, type: "Ranged Weapon", img: "icons/svg/target.svg",
      system: {...base, description: flags[MOD].notes.length ? `<p>${flags[MOD].notes.join("; ")}</p>` : "",
        difficulty: parseDifficulty(row.difficulty), damage: {attribute: d.attribute, bonus: d.bonus, type: d.type, isrollable: true},
        attack: {attribute: "dexterity", ability: kind === "thrown" ? "athletics" : /bow|crossbow/i.test(name) ? "archery" : "firearms", accuracy: 0, isrollable: true},
        range: int(row.range), rate: Math.max(1, int(rate)), clip: {value: int(clip) + (/\+1/.test(clip) ? 1 : 0), max: int(clip) + (/\+1/.test(clip) ? 1 : 0)},
        mode: {hasreload: true, hasburst: /burst/i.test(rawName), hasfullauto: /full auto/i.test(rawName), hasspray: /shotgun/i.test(name)},
        minstrength, conceal}, flags};
  }
  const soakDice = int(soakText);
  const bodyKinds = /^(implant|bioware|armor \(exoarmor\))/;
  const soakGiving = kind === "armor" ? !!soakDice : bodyKinds.test(kind) && soakDice > 0 && /soak/i.test(soakText) && !/−|^-/.test(soakText.trim());
  if ( soakGiving ) {
    const implant = kind !== "armor";
    if ( implant ) flags[MOD].implant = true;
    const dex = Math.abs(int(dexText));
    // Armor adds its rating to soak against bashing and lethal damage, and against aggravated damage from
    // claws, fangs and the like (V20); fire and sunlight ignore it, which the soak roll's own options cover.
    return {name, type: "Armor", img: "icons/svg/shield.svg", system: {...base, isequipped: implant,
      soak: {bashing: soakDice, lethal: soakDice, aggravated: soakDice}, dexpenalty: dex}, flags};
  }
  return {name, type: "Item", img: "icons/svg/item-bag.svg", system: {...base, description: describeItem(row, notes)}, flags};
}

function describeItem(row, notes) {
  const bits = [];
  for ( const [k, label] of [["difficulty", "Difficulty"], ["damage", "Damage"], ["range", "Range"], ["rate", "Rate"], ["min strength", "Strength"],
    ["armor rating or soak", "Protection"], ["dex penalty", "Effect"], ["surgery", "Surgery"], ["humanity cost", "Humanity cost"]] ) {
    const v = clean(row[k]);
    if ( v ) bits.push(`<b>${label}:</b> ${v}`);
  }
  if ( notes.length ) bits.push(notes.join("; "));
  return bits.length ? `<p>${bits.join("<br>")}</p>` : "";
}

/** The gear an era's characters can carry, by kind and then name. */
export function forEra(items, eraId) {
  const order = {"Melee Weapon": 0, "Ranged Weapon": 1, Armor: 2, Item: 3};
  const id = ERA_LIKE[eraId] ?? eraId;
  return items.filter(i => !eraId || (i.flags?.[MOD]?.eras ?? []).some(e => e === eraId || e === id))
    .sort((a, b) => (order[a.type] - order[b.type]) || a.name.localeCompare(b.name));
}

/** A one-line summary as the sheet's Combat box shows it. */
export function summary(i) {
  const s = i.system ?? {};
  if ( i.type === "Armor" ) return `soak ${s.soak?.bashing ?? 0}${s.dexpenalty ? `, Dex -${s.dexpenalty}` : ""}${i.flags?.[MOD]?.implant ? ", implant" : ""}`;
  if ( i.type === "Melee Weapon" || i.type === "Ranged Weapon" ) {
    const d = s.damage ?? {}, t = {bashing: "B", lethal: "L", aggravated: "A"}[d.type] ?? "";
    const dmg = `${d.attribute === "strength" ? "Str+" : ""}${d.bonus}${t ? ` ${t}` : ""}`;
    return [`diff ${s.difficulty}`, dmg, i.type === "Ranged Weapon" && s.range ? `range ${s.range}` : ""].filter(Boolean).join(", ");
  }
  return "";
}
