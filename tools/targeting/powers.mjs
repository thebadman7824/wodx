// Every tagged power WoDX ships, as {lib, id, name, text, diff, passive}. Used by the tag report and the harness.
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const A = join(root, "modules/wodx-actions");
const J = f => JSON.parse(readFileSync(join(A, "data", f), "utf8"));
export async function allPowers() {
  const out = [];
  for ( const p of J("disciplines-daw.json").powers ) out.push({lib: "disc", id: p.id, name: p.n, group: `${p.d} ${p.l}`, text: p.e, diff: p.diff, passive: !!p.passive});
  for ( const p of J("arcanoi-w20.json").arts ) out.push({lib: "w20", id: p.id, name: p.n, group: `${p.d} ${p.l}`, text: p.e, diff: p.diff});
  for ( const p of J("arcanoi-gw.json").arts ) out.push({lib: "gw", id: p.id, name: p.n, group: `${p.d} ${p.l}`, text: p.e, diff: p.diff});
  for ( const p of J("gifts-daw.json").gifts ) out.push({lib: "gift", id: p.id, name: p.n, group: `${(p.g ?? []).join(",")} ${p.l}`, text: p.e, diff: p.d});
  const D = await import(pathToFileURL(join(A, "scripts/demon-rules.js")));
  for ( const [k, L] of Object.entries(D.LORES) ) L.evo.forEach((e, i) => out.push({lib: "evo", id: `${k}:${i + 1}`, name: e.name, group: `${L.label} ${i + 1}`, text: ""}));
  const R = await import(pathToFileURL(join(A, "scripts/reckoning-rules.js")));
  for ( const e of R.EDGES ) out.push({lib: "edge", id: e.id, name: e.name ?? e.id, group: `${e.virtue ?? e.path} ${e.level}`, text: e.e ?? e.text ?? "", diff: e.diff});
  const O = await import(pathToFileURL(join(A, "scripts/orpheus-rules.js")));
  for ( const [k, h] of Object.entries(O.HORRORS) ) out.push({lib: "horror", id: k, name: h.label, group: h.shade, text: ""});
  return out;
}
