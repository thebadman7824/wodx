import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* An installed table its module no longer ships stands aside, so the tables that replaced it are drawn (B4720) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const hash = results => G.hash128(JSON.stringify(results.map(r => [r.text, r.weight ?? 1]))).join("-");
// A world Roll Table as Foundry holds it: the flag and the results
const table = (flag, results) => ({name: flag.id, results, getFlag: () => flag});
const ALL = ["medieval", "early-modern", "industrial", "modern"];
const old = [{text: "norse", weight: 100}];
const edited = [{text: "norse", weight: 60}, {text: "inuit", weight: 40}];
globalThis.game = {user: {isGM: false}, users: {}, tables: [
  // installed when the Arctic had one mix for every age; that key is no longer shipped
  table({id: "people.origin", era: ALL, culture: ["arctic"], source: "wodx-creation", shipped: hash(old)}, old),
  // the same, but the Storyteller changed it: it still wins
  table({id: "people.origin", era: ALL, culture: ["edited"], source: "wodx-creation", shipped: hash(old)}, edited)
]};
const gen = await import(join(root, "modules/wodx-chronicle/scripts/gen.mjs"));
gen.registerTables("wodx-creation", [
  {id: "people.origin", era: ["medieval"], culture: ["arctic"], results: [{text: "inuit", weight: 70}, {text: "norse", weight: 30}]},
  {id: "people.origin", era: ["medieval"], culture: ["edited"], results: [{text: "inuit", weight: 70}, {text: "norse", weight: 30}]}
]);
const origin = culture => gen.lookup({era: "medieval", culture})("people.origin")?.results.map(r => r.text);

test("retired tables: an untouched table under a key no longer shipped gives way to the new tables", () => {
  assert.deepEqual(origin("arctic"), ["inuit", "norse"]);
});

test("retired tables: a table the Storyteller edited is kept and drawn", () => {
  assert.deepEqual(origin("edited"), ["norse", "inuit"]);
});
