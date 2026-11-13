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
  return items;
}

if ( import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("build-gear.mjs") ) {
  const items = build();
  writeFileSync(join(root, "modules/wodx-library/data/gear.json"), JSON.stringify({version: 2, items}, null, 1) + "\n");
  const by = {}; for ( const i of items ) by[i.type] = (by[i.type] ?? 0) + 1;
  console.log(`${items.length} items`, by);
}
