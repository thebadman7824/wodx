import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

// WoDX NPC 0.56.0, Actions 3.59.0, Sheets 0.18.0: bonds from the books as relationships (B2840-B2846).
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const imp = p => import(pathToFileURL(join(root, p)));
const BR = await imp("modules/wodx-npc/scripts/bond-rules.mjs");
const TR = await imp("modules/wodx-npc/scripts/ties-rules.mjs");
const XH = await imp("modules/wodx-sheets/scripts/extras-html.mjs");

test("every bond kind reads back from the other end and has a line saying what it does", () => {
  for ( const [k, v] of Object.entries(BR.BOND_KINDS) ) {
    assert.ok(TR.KINDS[k], `${k} is a tie kind`);
    assert.ok(TR.KINDS[v.back], `${k} reads back as ${v.back}`);
    assert.equal(TR.KINDS[v.back].back, k, `${v.back} reads back as ${k}`);
    assert.ok(BR.RULE_OF[k], `${k} says what it does`);
    assert.ok(TR.HAND_ROLES.includes(k), `${k} can be made by hand`);
  }
  assert.ok(TR.GROUPS.bonds);
});

test("the blood bond step from the lineage, WoDX Actions' oaths and the Vinculum", () => {
  assert.equal(BR.stepToward({lineageBonds: {r: {drinks: 2}}, regnantId: "r"}), 2);
  assert.equal(BR.stepToward({lineageBonds: {r: {drinks: 5}}, regnantId: "r"}), 3);
  assert.equal(BR.stepToward({oaths: {k: {uuid: "Actor.r", stage: 3}}, regnantId: "r"}), 3);
  assert.equal(BR.stepToward({vinculum: {"t>r": 8}, thrallId: "t", regnantId: "r"}), 3);
  assert.equal(BR.stepToward({vinculum: {"t>r": 6}, thrallId: "t", regnantId: "r"}), 2);
  assert.equal(BR.stepToward({vinculum: {"r>t": 9}, thrallId: "t", regnantId: "r"}), 0, "the Vinculum runs one way");
  assert.deepEqual([0, 1, 2, 3].map(BR.socialShift), [0, 0, -1, -2]);
  assert.equal(BR.harmNeedsWillpower(1), false); assert.equal(BR.harmNeedsWillpower(2), true);
});

test("packmates from a shared pack name, Fetters that name someone, the Vinculum on the tie", () => {
  const actors = [{id: "g1", name: "Ana", type: "Werewolf", system: {packname: "Silver Moon", packtotem: "Wolf"}}, {id: "g2", name: "Bo", type: "Werewolf", system: {packname: "silver moon"}},
    {id: "g3", name: "Cy", type: "Werewolf", system: {packname: ""}}, {id: "w", name: "Wren", type: "Wraith", items: [{name: "Ana", system: {type: "wod.types.fetter", value: 3}}, {name: "Nobody", system: {type: "wod.types.fetter", value: 1}}]}];
  const e = TR.edges(actors, {vinculum: {"g1>g2": 7}});
  const p = e.find(x => x.from === "g1" && x.kind === "packmate" && x.to.id === "g2");
  assert.ok(p); assert.match(p.note, /Silver Moon, totem Wolf; Vinculum 7/); assert.match(p.rule, /totem/);
  assert.ok(e.some(x => x.from === "g2" && x.kind === "packmate" && x.to.id === "g1"));
  assert.equal(e.filter(x => x.from === "g3").length, 0);
  assert.ok(e.some(x => x.from === "w" && x.kind === "fetter" && x.to.id === "g1" && x.note === "Fetter 3"));
  assert.ok(e.some(x => x.from === "g1" && x.kind === "fetterOf" && x.to.id === "w"));
  assert.equal(e.filter(x => x.kind === "fetter").length, 1, "a Fetter naming nobody in the world makes no tie");
});

test("cards: a thrall striking the regnant, a Fetter hurt or gone, a packmate or cellmate down", () => {
  const atk = BR.cardsFor({kind: "attack", by: "t", of: "r"}, [], {stepOf: () => 2});
  assert.equal(atk.length, 1); assert.match(atk[0].text, /Willpower roll first/);
  assert.equal(BR.cardsFor({kind: "attack", by: "t", of: "r"}, [], {stepOf: () => 1}).length, 0);
  const edges = [{from: "w", to: {id: "f", name: "Ana"}, kind: "fetter"}, {from: "p", to: {id: "f", name: "Ana"}, kind: "packmate"},
    {from: "h", to: {id: "f", name: "Ana"}, kind: "cellmate"}, {from: "c", to: {id: "f", name: "Ana"}, kind: "dreamer"}];
  const hurt = BR.cardsFor({kind: "harm", of: "f"}, edges);
  assert.deepEqual(hurt.map(c => c.to), ["w"]);
  const dead = BR.cardsFor({kind: "death", of: "f"}, edges);
  assert.deepEqual(dead.map(c => c.to).sort(), ["c", "h", "p", "w"]);
  assert.match(dead.find(c => c.to === "w").text, /Harrowing/);
  assert.match(dead.find(c => c.to === "h").text, /Willpower/);
});

test("the Relationships tab shows what a bond does under the tie", () => {
  const html = XH.relationsHtml([{kind: "fetter", label: "Fetter", groupLabel: "Oaths, packs and circles", name: "Ana", uuid: "Actor.x", note: "Fetter 3", source: "fetter", rule: "A Fetter: the wraith feels it."}], {editable: false});
  assert.match(html, /wodx-tie-rule">A Fetter: the wraith feels it\./);
  assert.match(html, /from a Fetter on the sheet/);
});

test("wiring: the setting, the hooks, Actions' social roll and the API", () => {
  const b = src("modules/wodx-npc/scripts/bonds.mjs"), main = src("modules/wodx-npc/scripts/main.mjs"), people = src("modules/wodx-npc/scripts/people.mjs"), social = src("modules/wodx-actions/scripts/social.js");
  assert.match(b, /register\(MOD, "bondCards"/);
  for ( const h of ["wodxAttackRolled", "wodxDamageApplied", "updateActor", "preDeleteActor"] ) assert.match(b, new RegExp(`Hooks\\.on\\("${h}"`));
  assert.match(main, /BONDS\.listen\(\);/); assert.match(main, /bonds: \{stepToward: BONDS\.stepToward/);
  assert.match(people, /vinculum: BONDS\.vinculum\(\)/);
  assert.match(social, /bonds\?\.socialShift\?\.\(actor, npc\)/); assert.match(social, /shift \+ bondShift/);
});
