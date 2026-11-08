// Seeds data/tags.json from the powers' own data; keeps every tag already in the file (reviewed by eye).
// node seed.mjs [--report lib]
import {readFileSync, writeFileSync, existsSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {allPowers} from "./powers.mjs";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = await import(pathToFileURL(join(root, "modules/wodx-targeting/scripts/target-rules.mjs")));
const file = join(root, "modules/wodx-targeting/data/tags.json");
const table = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
const powers = await allPowers();
const rep = process.argv.indexOf("--report");
if ( rep > 0 ) {
  const lib = process.argv[rep + 1];
  for ( const p of powers.filter(x => x.lib === lib) ) {
    const s = T.seedTag(p);
    console.log(`${table[lib]?.[p.id] ?? T.tagCode(s)}|${p.id}|${p.group}|${p.name}|${p.diff ?? ""}|${p.text}`);
  }
} else {
  let added = 0;
  for ( const p of powers ) {
    table[p.lib] ??= {};
    if ( !table[p.lib][p.id] ) { table[p.lib][p.id] = T.tagCode(T.seedTag(p)); added++; }
  }
  const out = {};
  for ( const lib of Object.keys(table) ) out[lib] = Object.fromEntries(Object.entries(table[lib]));
  writeFileSync(file, JSON.stringify(out, null, 1) + "\n");
  console.log(`added ${added}`);
}
