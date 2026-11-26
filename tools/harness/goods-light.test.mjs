import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* B6779c: of the goods that only told, the ones with a light to give now light the token */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const U = await import(pathToFileURL(join(root, "modules/wodx-rules/library/use-rules.mjs")));
const C = await import(pathToFileURL(join(root, "modules/wodx-rules/interactables/carry-rules.mjs")));
const G = await import(pathToFileURL(join(root, "modules/wodx-library/data/goods.mjs")));
const rows = G.GOODS ?? G.ALL_ROWS ?? G.ROWS;

test("glow sticks and the stone fat lamp are carried lights", () => {
  for ( const g of rows.filter(x => /glow ?stick|stone lamp/i.test(x.name)) ) {
    assert.deepEqual(U.abilitiesOf(g), ["light"], g.name);
    assert.ok(C.CARRIED[U.lightOf(g)], g.name);
  }
  assert.equal(C.kindsFor(1960).some(k => k.id === "glow"), false);
  assert.equal(C.kindsFor(1990).some(k => k.id === "glow"), true);
  assert.ok(C.lightData("glow", "ft").dim > 0);
});

test("no food, drink, medicine or clothing good is left with only a told use", () => {
  const told = rows.filter(g => { const ab = U.abilitiesOf(g); return !ab.some(a => U.ABILITIES[a]?.effect !== "note"); });
  const bad = told.filter(g => ["food", "drink", "clothing", "clothes"].includes(g.kind) || (g.kind === "medicine" && !/condom/i.test(g.name)));
  assert.deepEqual(bad.map(g => g.name), []);
});
