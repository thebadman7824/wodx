import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as SC from "../../modules/wodx-actions/scripts/spirit-charms.js";
import * as PM from "../../modules/wodx-actions/scripts/power-mods.js";
import * as SR from "../../modules/wodx-rules/actions/summon-rules.js";
import { SPECS, specKey } from "../../modules/wodx-actions/scripts/summon-specs.js";

const src = p => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

/* B7672: the demons of V20 Dark Ages pp. 400-402 */
test("the eight demon Charms are on the list, and a demon's Possession is its own", () => {
  const keys = SC.CHARMS.filter(c => c.group === "demon").map(c => c.name).sort();
  assert.deepEqual(keys, ["Answer", "Harvest Soul", "Immunity to Fire", "Possession", "Reap Essence", "Summon Hellhounds", "Teleportation", "Wish"]);
  assert.equal(SC.charmOf("Possession").key, "possession", "a W20 spirit keeps its own");
  assert.equal(SC.charmOf("Possession", { demon: true }).key, "demonpossession");
  assert.equal(SC.charmOf("Immune to Fire").key, "fireimmunity");
  assert.ok(SC.isDemonOf({ names: ["Reap Essence", "Possession"] }));
  assert.ok(!SC.isDemonOf({ names: ["Blast", "Possession"] }));
  assert.ok(SC.isDemonOf({ flag: true }));
});

test("the book's prices: Answer 10, Wish 20 or 10 under contract, Hellhounds and Possession 5, Teleportation 1 below a third", () => {
  const t = { essence: 20, essenceMax: 20, rage: 4, gnosis: 10, willpower: 6 };
  assert.equal(SC.costOf(SC.BY_KEY.answer), 10);
  assert.equal(SC.costOf(SC.BY_KEY.wish, { size: "free" }), 20);
  assert.equal(SC.costOf(SC.BY_KEY.wish, { size: "contract" }), 10);
  assert.equal(SC.costOf(SC.BY_KEY.hellhounds), 5);
  assert.equal(SC.costOf(SC.BY_KEY.demonpossession), 5);
  assert.ok(!SC.canPay(SC.BY_KEY.teleportation, t).ok, "full Essence: it cannot flee");
  assert.ok(!SC.canPay(SC.BY_KEY.teleportation, { ...t, essence: 7 }).ok, "7 of 20 is not below a third");
  assert.ok(SC.canPay(SC.BY_KEY.teleportation, { ...t, essence: 6 }).ok);
  assert.ok(!SC.canPay(SC.BY_KEY.teleportation, { ...t, essence: 0 }).ok, "no Essence to spend");
});

test("Reap, Harvest, Possession and Exorcism numbers", () => {
  assert.equal(SC.reapGain(4), 4);
  assert.equal(SC.harvestGain({ willpower: 5, perception: 2, intelligence: 3, wits: 2, xp: 12 }), 24);
  assert.deepEqual(SC.possessRoll(5, 10), { pool: 5, diff: 10 });
  assert.ok(SC.POSSESSABLE.has("kindred") && SC.POSSESSABLE.has("mortal") && !SC.POSSESSABLE.has("lupine"));
  assert.equal(SC.exorcismPool(3, 2), 5);
  assert.deepEqual(SC.exorcismHit(6, 2), { left: 4, taken: 2, gone: false });
  assert.deepEqual(SC.exorcismHit(2, 5), { left: 0, taken: 2, gone: true });
  assert.equal(SC.EXILE_YEARS, 100);
});

test("Immunity to Fire: fire does no harm, other harm still lands", () => {
  const items = [{ type: "Power", name: "Immunity to Fire", system: { type: "wod.types.charm" } }];
  const fx = PM.standingOf(items);
  assert.equal(fx.length, 1);
  assert.equal(PM.modsFrom(fx, { soak: true, harm: { type: "aggravated", of: "fire" } }).immune, "Immunity to Fire");
  assert.equal(PM.modsFrom(fx, { soak: true, harm: { type: "lethal", fireSun: true } }).immune, "Immunity to Fire");
  assert.equal(PM.modsFrom(fx, { soak: true, harm: { type: "lethal" } }).immune, "");
  assert.equal(PM.standingOf([{ type: "Power", name: "Immunity to Fire", system: { type: "wod.types.power" } }]).length, 0, "a Fallen's evocation is not always on");
  const cm = src("modules/wodx-combat/scripts/main.js");
  assert.match(cm, /if \(sp\.immune\) \{ left\.levels = 0;/);
  assert.match(cm, /if \(immune\) \{ left = \{ levels: 0, halved: false \};/);
});

test("Summon Hellhounds: one for each dot of the demon's Rage", () => {
  const spec = SPECS[specKey("Vampire (Dark Ages)", "Summon Hellhounds")];
  assert.ok(spec);
  assert.equal(SR.countOf(spec.count, { rage: 4, successes: 1 }), 4);
  assert.equal(SR.resolve(spec, { rage: 4, successes: 1 }).count, 4);
  assert.match(src("modules/wodx-actions/scripts/effects.js"), /rage: n\(adv\.rage\?\.permanent\)/);
});

test("the three sample demons, as Creatures with their Charms", () => {
  assert.deepEqual(SC.SAMPLE_DEMONS.map(d => [d.name, d.willpower, d.rage, d.gnosis, d.essence]),
    [["The Scapegoat", 2, 2, 2, 6], ["The Man at the Crossroads", 6, 4, 10, 20], ["The Horror", 6, 15, 5, 26]]);
  for (const d of SC.SAMPLE_DEMONS) {
    const a = SC.demonActorData(d);
    assert.equal(a.type, "Creature");
    assert.equal(a.system.advantages.essence.temporary, d.essence);
    assert.equal(a.flags.world.wodx.profile, "spirit");
    assert.equal(a.items.length, d.charms.length);
    for (const i of a.items) assert.ok(SC.charmOf(i.name, { demon: true }), `${d.name}: ${i.name}`);
    assert.doesNotMatch(d.about, /\b(he|she|him|her|his|hers)\b/i);
  }
});

test("the window, the menus and the API are wired", () => {
  const f = src("modules/wodx-actions/scripts/charms.js");
  for (const d of ["answer", "teleport", "reap", "harvest", "wish", "dpossess"]) assert.match(f, new RegExp(`case "${d}"`));
  assert.match(f, /async function exorcise\(actor, o = \{\}\)/);
  assert.match(f, /async function sampleDemon\(\)/);
  const m = src("modules/wodx-actions/scripts/main.js");
  assert.match(m, /exorcise: withActor\(a => chmx\(\)\.exorcise\(a\)\)/);
  assert.match(m, /sampleDemon: \(\) => chmx\(\)\.sampleDemon\(\)/);
  const pm = src("modules/wodx-actions/scripts/profile-menus.js");
  assert.equal((pm.match(/"api:exorcise", "Exorcism \(rite\)"/g) ?? []).length, 4);
  assert.match(pm, /"api:sampleDemon", "A demon \(V20 Dark Ages\)"/);
});
