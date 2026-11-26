import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* B6779b: fetishes whose book names a roll of their own get it as a Use button */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const W = await import(pathToFileURL(join(root, "modules/wodx-rules/library/wonder-rules.mjs")));
const P = await import(pathToFileURL(join(root, "modules/wodx-library/scripts/wonder-powers.mjs")));
const D = (await import(pathToFileURL(join(root, "modules/wodx-library/data/wonders.mjs")))).WONDERS;
const flagOf = key => W.itemsFor(D.find(x => x.key === key))[0].flags["wodx-library"].wonder;

test("the flute, the Bane arrow and the swarm pipes carry their rolls", () => {
  assert.deepEqual(P.powerOf(flagOf("harmony-flute"), "play").roll, {attr: "dexterity", ability: "performance", diff: 6});
  assert.deepEqual(P.powerOf(flagOf("bane-arrow"), "strike").roll.dice, 3);
  assert.equal(P.powerOf(flagOf("pipes-of-the-swarm"), "call").roll.diff, 4);
  for ( const k of ["harmony-flute", "bane-arrow", "pipes-of-the-swarm"] ) for ( const p of P.powersOf(flagOf(k)) ) assert.ok(!/—/.test(p.text + p.label), k);
});

test("a fetish with no roll of its own still has none (it wakes through WoDX Actions)", () => {
  assert.equal(P.powersOf(flagOf("apeskin")).length, 0);
});
