import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The Inheritance step (B3530 to B3533): heir choices, what passes, ties, and how the heir's line remembers the dead. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const IR = await import(pathToFileURL(join(root, "modules/wodx-storyteller/scripts/inherit-rules.mjs")).href);
const tpl = JSON.parse(readFileSync(join(root, "system/worldofdarkness/template.json"), "utf8"));

test("heirs are offered best first and never twice, the dead never", () => {
  const c = IR.heirChoices({dead: "d", will: "w", named: "w", made: "m", kin: [{id: "k", why: "child or heir"}, {id: "d"}], others: [{id: "o"}, {id: "k"}]});
  assert.deepEqual(c.map(x => x.id), ["w", "m", "k", "o"]);
  assert.equal(c[0].why, "named in the will");
});

test("every part has words, the purse waits for the estate card, and items are carried types only", () => {
  for ( const k of IR.PART_KEYS ) assert.ok(IR.PARTS[k].label && IR.PARTS[k].hint);
  assert.equal(IR.defaults({estate: true}).purse, false);
  assert.equal(IR.defaults({estate: false}).purse, true);
  for ( const t of IR.ITEM_TYPES ) assert.ok(tpl.Item.types.includes(t), `${t} is a system item type`);
  for ( const t of ["Power", "Trait", "Feature", "Ability", "Advantage", "Experience"] ) assert.ok(!IR.ITEM_TYPES.includes(t), `${t} stays with the dead`);
});

test("ties pass marked as known through the dead, without the heir or doubles", () => {
  const ties = [{uuid: "Actor.h", role: "child"}, {uuid: "Actor.x", role: "rival", note: "old wound"}, {uuid: "Actor.y", role: "friend", hidden: true}];
  const add = IR.tiesFor(ties, {heirUuid: "Actor.h", deadName: "Old Jan"});
  assert.deepEqual(add.map(t => t.uuid), ["Actor.x", "Actor.y"]);
  assert.match(add[0].note, /^Known through Old Jan: old wound/);
  assert.equal(add[1].hidden, true);
  assert.equal(IR.mergeTies([{uuid: "Actor.x"}], add).length, 2);
});

test("Ancestors need the blood and the Background; a mage's Past Lives or Avatar reach anyone", () => {
  assert.equal(IR.memoryKind({line: "werewolf", backgrounds: ["Ancestors"], kin: true}), "ancestor");
  assert.equal(IR.memoryKind({line: "werewolf", backgrounds: ["Ancestors"], kin: false}), null);
  assert.equal(IR.memoryKind({line: "kinfolk", backgrounds: ["Ancestors"], kin: true}), "ancestor");
  assert.equal(IR.memoryKind({line: "mage", backgrounds: ["Avatar"]}), "pastLife");
  assert.equal(IR.memoryKind({line: "mage", backgrounds: []}), null);
  assert.equal(IR.memoryKind({line: "vampire", backgrounds: ["Ancestors"], kin: true}), null);
});

test("the summary names what passed in plain words", () => {
  assert.equal(IR.summary({items: 2, ledger: 1, memory: "pastLife"}, {dead: "A", heir: "B"}), "B inherits from A: 2 items, 1 Ledger entry, a past life to recall.");
  assert.equal(IR.summary({}, {dead: "A", heir: "B"}), "B inherits from A: nothing.");
});

test("the step is offered on a death and sits in the Storyteller's hand", () => {
  const led = readFileSync(join(root, "modules/wodx-storyteller/scripts/ledger.mjs"), "utf8");
  assert.match(led, /import\("\.\/inherit\.mjs"\)\)\.onDeath\(dead\)/);
  const src = readFileSync(join(root, "modules/wodx-storyteller/scripts/inherit.mjs"), "utf8");
  assert.match(src, /addTool\(\{key: "inherit"/);
  for ( const m of src.matchAll(/<select name="(\w+)"/g) ) assert.match(src, new RegExp(`searchBox\\("select\\[name=${m[1]}\\]`), `${m[1]} has a search box`);
});
