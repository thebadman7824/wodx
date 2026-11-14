/**
 * Builds modules/wodx-library/data/gear.json from the book tables in docs/research/gear-tables.
 *   node tools/library/build-gear.mjs
 * World of Future Darkness gives the cyberware its WoD figures; Cyberpunk 2020 adds the surgery and Humanity cost
 * to the same names, and its other cyberware comes in as items with those two figures.
 */
import {readFileSync, writeFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";
import * as G from "../../modules/wodx-library/scripts/gear-rules.mjs";
import {GEAR_WAYS, LOCAL_GEAR} from "../../modules/wodx-library/data/gear-ways.mjs";
import {GEAR_FX, PLAIN_STORY} from "../../modules/wodx-library/data/gear-effects.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const md = f => readFileSync(join(root, "docs/research/gear-tables", `${f}.md`), "utf8");
const key = n => String(n).toLowerCase().replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]/g, "");

export function build() {
  const items = [];
  for ( const src of ["v20-dark-ages", "sorcerers-crusade", "v20-wild-west", "great-war", "v20-core"] )
    for ( const row of G.parseTable(md(src)) ) {
      // The Great War's guns are crew-served or penetration dice, not a soldier's own weapon: kept as reference items
      // "HE" is the book's short form for high explosive
      const r = src === "great-war" ? Object.fromEntries(Object.entries({...row, kind: `${row.kind} (heavy)`}).map(([k, v]) => [k, String(v).replace(/\bHE\b/g, "high explosive")])) : row;
      const it = G.rowToItem(r, src);
      if ( it ) items.push(it);
    }
  const cp = G.parseTable(md("cyberpunk-2020"));
  const cpBy = new Map(cp.map(r => [key(r.name), r]));
  const wofd = G.parseTable(md("world-of-future-darkness"));
  const seen = new Set();
  for ( const row of wofd ) {
    const k = key(row.name), c = cpBy.get(k) ?? cpBy.get(k.replace(/^linear/, "")) ?? cpBy.get(`${k}boosterware`);
    const extra = c ? {surgery: G.clean(c.surgery), humanity: G.clean(c["humanity cost"])} : {};
    if ( c ) seen.add(key(c.name));
    const it = G.rowToItem({...row, surgery: c?.surgery ?? "", "humanity cost": c?.["humanity cost"] ?? ""}, "world-of-future-darkness", {cyber: true, ...extra});
    if ( it ) items.push(it);
  }
  for ( const row of cp ) {
    if ( seen.has(key(row.name)) ) continue;
    const it = G.rowToItem({...row, kind: "cyberware"}, "cyberpunk-2020", {cyber: true, surgery: G.clean(row.surgery), humanity: G.clean(row["humanity cost"])});
    if ( it ) items.push(it);
  }
  // Library 0.21.0 (B3020, B3021): where each piece is at home, and the weapons of other lands
  for ( const it of items ) if ( GEAR_WAYS[it.name] ) it.flags[G.MOD].ways = GEAR_WAYS[it.name];
  items.push(...G.localGear(items, LOCAL_GEAR));
  return items.map(withFx).map(withArms);
}

/** B3795: what a piece of cyberware does once it is in the body, on the item itself. */
export function withFx(it) {
  const f = it.flags?.[G.MOD];
  if ( !f?.cyber ) return it;
  const fx = GEAR_FX[it.name] ?? {};
  let out = it.type === "Item" && fx.weapon ? G.fxWeapon(it, fx.weapon) : it;
  out = {...out, system: {...out.system}, flags: {...out.flags, [G.MOD]: {...f, fx: JSON.parse(JSON.stringify(fx))}}};
  if ( out.type === "Item" && fx.bonus?.length ) out.system.bonuslist = G.fxBonusList(it.name, fx, false);
  const said = G.fxSummary(fx);
  const lines = [said && `<b>Installed:</b> ${said}`, `<b>Storyteller:</b> ${fx.story ?? (said || out.type !== "Item" ? "" : PLAIN_STORY)}`.replace(/<b>Storyteller:<\/b> $/, "")].filter(Boolean);
  if ( lines.length ) out.system.description = `${out.system.description ?? ""}<p>${lines.join("<br>")}</p>`;
  return out;
}

/**
 * B3798: shields and parrying weapons (V20 Dark Ages p. 350, Sorcerers Crusade p. 202) and the Great War's heavy guns
 * and armour (pp. 70 to 77) carry their figures as data WoDX Combat reads.
 */
export function withArms(it) {
  const f = it.flags?.[G.MOD];
  if ( !f ) return it;
  const text = String(it.system?.description ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const n = re => { const m = text.match(re); return m ? Number(m[1]) : null; };
  let add = null, line = "";
  if ( f.kind === "armor (shield)" || f.kind === "(parry)" ) {
    const parry = n(/parry diff (\d+)/i);
    const attack = n(/attack \+(\d+)/i) ?? n(/\+(\d+) to attacker's difficulty/i) ?? 0;
    const closeOnly = /hand-to-hand only/i.test(text);
    if ( f.kind === "armor (shield)" ) { add = {shield: {parry, attack, closeOnly}}; line = "Carried (equipped):"; }
    else { add = {parryWith: {weapon: /dagger/i.test(it.name) ? "dagger" : "sword", parry, attack, closeOnly}}; line = "With that weapon in hand:"; }
    const bits = [parry ? `parry at difficulty ${parry}` : "", attack ? `+${attack} to the difficulty of attacks against the bearer${closeOnly ? " in close combat" : ""}` : ""].filter(Boolean);
    line = bits.length ? `<b>${line}</b> ${bits.join("; ")}.` : "";
  } else if ( /\(heavy\)/.test(f.kind) && /^ranged/.test(f.kind) ) {
    const pen = n(/(\d+) (?:armor-)?penetration di(?:c)?e/i) ?? (/treat as light artillery, high explosive/i.test(text) ? 3 : null);
    const blast = n(/(\d+) dice \+ (?:1 per success|successes)/i);
    const naval = /\(ship\)/.test(f.kind) ? n(/Damage: (?:damage rating )?(\d+)/i) : null;
    const diff = n(/Difficulty: (\d+)/i) ?? 6;
    add = {heavy: {pen, blast, naval, diff, radius: n(/(\d+)-foot radius/i) ?? n(/full damage to (\d+) ft/i) ?? n(/(\d+) ft \//i)}};
    line = `<b>Heavy fire (WoDX Combat):</b> ${pen ? `${pen} penetration dice against armour` : naval ? `damage rating ${naval} against a ship` : blast ? `${blast} dice of damage on each person in the blast` : "as light artillery"}.`;
  } else if ( /^armor/.test(f.kind) && /\(heavy\)/.test(f.kind) ) {
    const pen = n(/penetration diff (\d+)/i), ship = n(/Protection: (\d+)/i);
    add = {hardArmor: pen ? {pen} : {ship}};
    line = `<b>Heavy fire (WoDX Combat):</b> ${pen ? `a heavy gun needs successes at difficulty ${pen} to get through` : `a ship's guns roll against difficulty ${ship}`}.`;
  }
  if ( !add ) return it;
  return {...it, system: {...it.system, description: `${it.system.description ?? ""}${line ? `<p>${line}</p>` : ""}`}, flags: {...it.flags, [G.MOD]: {...f, ...add}}};
}

if ( import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("build-gear.mjs") ) {
  const items = build();
  writeFileSync(join(root, "modules/wodx-library/data/gear.json"), JSON.stringify({version: 2, items}, null, 1) + "\n");
  const by = {}; for ( const i of items ) by[i.type] = (by[i.type] ?? 0) + 1;
  console.log(`${items.length} items`, by);
}
