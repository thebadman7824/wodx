import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as SC from "../../modules/wodx-actions/scripts/spirit-charms.js";

const src = p => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

/* B5650-B5659: every spirit Charm of W20 pp. 366-368 plays from the Spirit Charms window */
test("the whole W20 list is here, each with a page in 366-368 and a summary in WoDX's words", () => {
  assert.equal(SC.CHARMS.length, 32);
  const keys = new Set();
  for (const c of SC.CHARMS) {
    assert.ok(c.p >= 366 && c.p <= 368, `${c.name} page`);
    assert.ok(c.fx.length > 10 && c.fx.length < 200, `${c.name} summary`);
    assert.ok(["always", "roll", "free"].includes(c.kind), `${c.name} kind`);
    assert.ok(SC.GROUPS[c.group], `${c.name} group`);
    assert.ok(!keys.has(c.key), `${c.key} twice`);
    keys.add(c.key);
    assert.doesNotMatch(c.fx, /—/, `${c.name}: no em-dash`);
    assert.doesNotMatch(c.fx, /\b(he|she|him|her|his|hers)\b/i, `${c.name}: neutral words`);
    if (c.roll) assert.ok(["gnosis", "rage", "willpower"].includes(c.roll), `${c.name} rolls a spirit trait`);
  }
});

test("each Charm does something on the table (standing rule 31)", () => {
  for (const c of SC.CHARMS) assert.ok(c.does || c.spec || c.world?.length, `${c.name} has no effect`);
  const f = src("modules/wodx-actions/scripts/charms.js");
  assert.match(f, /async function blight\(spirit, target\)/);
  for (const d of new Set(SC.CHARMS.map(c => c.does).filter(d => d && d !== "blight"))) assert.match(f, new RegExp(`case "${d}"`), `no handler for ${d}`);
});

test("a sheet item's name finds its Charm", () => {
  assert.equal(SC.charmOf("Blast")?.key, "blast");
  assert.equal(SC.charmOf("Open Moon Bridge")?.key, "moonbridge");
  assert.equal(SC.charmOf("Armour")?.key, "armor");
  assert.equal(SC.charmOf("Re-Form")?.key, "reform");
  assert.equal(SC.charmOf("Cleanse the Blight (Gaian)")?.key, "cleanse");
  assert.equal(SC.charmOf("Fireball"), null);
});

test("a spirit's traits: dots of Rage, Gnosis and Willpower, Essence its pool", () => {
  const t = SC.traitsOf({ advantages: { rage: { permanent: 6 }, gnosis: { permanent: 7 }, willpower: { permanent: 5 }, essence: { temporary: 12, max: 18 } } });
  assert.deepEqual(t, { rage: 6, gnosis: 7, willpower: 5, essence: 12, essenceMax: 18 });
  assert.equal(SC.poolOf(SC.BY_KEY.healing, t), 7);
  assert.equal(SC.poolOf(SC.BY_KEY.healing, t, { static: true }), 5);
  assert.equal(SC.poolOf(SC.BY_KEY.blast, t), 0);
});

test("difficulties: the size, the target's Willpower, the Gauntlet", () => {
  const F = SC.BY_KEY.createfires;
  assert.equal(SC.diffOf(F, { size: "torch" }), 3);
  assert.equal(SC.diffOf(F, { size: "inferno" }), 9);
  assert.equal(SC.diffOf(SC.BY_KEY.healing, { size: "aggravated" }), 8);
  assert.equal(SC.diffOf(SC.BY_KEY.corruption, { targetWillpower: 8 }), 8);
  assert.equal(SC.diffOf(SC.BY_KEY.possession, { targetWillpower: 7, object: true }), 4);
  assert.equal(SC.diffOf(SC.BY_KEY.disorient, { gauntlet: 8 }), 8);
  assert.equal(SC.diffOf(SC.BY_KEY.disorient, { gauntlet: 3 }), 6);
  assert.equal(SC.diffOf(SC.BY_KEY.cleanse), 7);
});

test("Essence: Armor two, Blast one, a town flood three and Gnosis 6", () => {
  const t = { rage: 4, gnosis: 5, willpower: 4, essence: 2 };
  assert.equal(SC.canPay(SC.BY_KEY.armor, t).ok, true);
  assert.equal(SC.canPay(SC.BY_KEY.armor, { ...t, essence: 1 }).ok, false);
  assert.equal(SC.canPay(SC.BY_KEY.flood, t, { size: "block" }).essence, 1);
  assert.equal(SC.canPay(SC.BY_KEY.flood, { ...t, essence: 5 }, { size: "streets" }).ok, false);
  assert.equal(SC.canPay(SC.BY_KEY.flood, { ...t, essence: 5, gnosis: 6 }, { size: "streets" }).ok, true);
});

test("the book's numbers: Materialize, Possession, Freeze, Umbraquake, Swift Flight, Incite Frenzy, Calcify", () => {
  assert.equal(SC.canMaterialize(5, 6), false);
  assert.equal(SC.canMaterialize(6, 6), true);
  assert.equal(SC.canMaterialize(2, null), true);
  assert.equal(SC.possessionTime(1).label, "six hours");
  assert.equal(SC.possessionTime(4).seconds, 900);
  assert.equal(SC.possessionTime(9).seconds, 0);
  assert.equal(SC.freezeDice(5), 4);
  assert.equal(SC.quakeDice(7), 3);
  assert.equal(SC.flightCap(5), 75);
  assert.equal(SC.frenzyOf(0), null);
  assert.equal(SC.frenzyOf(2), "frenzy");
  assert.equal(SC.frenzyOf(6), "thrall");
  assert.equal(SC.calcifyDots(4, 1), 3);
  assert.equal(SC.calcifyDots(1, 3), 0);
});

test("Healing: once a scene for each target", () => {
  let used = SC.healUsed({}, 3, "a1");
  assert.equal(SC.healLeft(used, 3, "a1"), false);
  assert.equal(SC.healLeft(used, 3, "a2"), true);
  assert.equal(SC.healLeft(used, 4, "a1"), true);
});

test("the effects card: Corruption sways, Disorient curses all, Tracking marks the quarry", () => {
  const cor = SC.resultsOf(SC.BY_KEY.corruption, 2);
  assert.equal(cor[0].key, "sway");
  assert.equal(cor[0].out.timed.kind, "scene");
  const dis = SC.resultsOf(SC.BY_KEY.disorient, 1);
  assert.equal(dis[0].who, "all");
  assert.equal(SC.resultsOf(SC.BY_KEY.tracking, 0)[0].out.name, "Tracked by a spirit");
  assert.deepEqual(SC.resultsOf(SC.BY_KEY.corruption, 0), []);
  assert.deepEqual(SC.BY_KEY.cleanse.world, ["cleanse"]);
  assert.deepEqual(SC.BY_KEY.shatterglass.world, ["rubble"]);
});

test("the wiring of the modern world waits for 1880", () => {
  assert.equal(SC.fitsEra(SC.BY_KEY.shortout, 1300), false);
  assert.equal(SC.fitsEra(SC.BY_KEY.shortout, 1999), true);
  assert.equal(SC.fitsEra(SC.BY_KEY.blast, 1197), true);
  assert.equal(SC.fitsEra(SC.BY_KEY.shortout, null), true);
});

test("NPC spirits choose only Charms that need using", () => {
  const ch = SC.choosable(SC.CHARMS);
  assert.ok(ch.every(c => c.kind !== "always" && c.keywords.length));
  assert.ok(ch.some(c => c.key === "blast"));
  assert.ok(!ch.some(c => c.key === "blightedtouch"));
});

test("the window, the menus, Combat's soak and the NPC choice are wired", () => {
  const f = src("modules/wodx-actions/scripts/charms.js");
  assert.match(f, /registerReverter\?\.\("wodx-actions\.charmOff"/);
  assert.match(f, /Hooks\.on\("wodxAttackRolled"/);
  assert.match(f, /whisper: gmIds\(\)/);
  const m = src("modules/wodx-actions/scripts/main.js");
  assert.match(m, /useCharm: a => chmx\(\)\.power\(a\)/);
  assert.match(m, /CHM\.isSpirit\(actor\)\) from\.push\(\.\.\.chmx\(\)\.powersFor/);
  assert.match(m, /spiritCharm: withActor/);
  assert.match(m, /CHM\.setup\(\)/);
  assert.match(src("modules/wodx-actions/scripts/theme-rules.js"), /"api:spiritCharm"/);
  assert.match(src("modules/wodx-actions/scripts/profile-menus.js"), /"api:spiritCharm", "Spirit Charms"/);
  for (const p of ["modules/wodx-actions/scripts/profiles.js", "modules/wodx-combat/scripts/profiles.js"])
    assert.match(src(p), /key === "beast" && \/\\bspirit\\b\/\.test\(variant\)/);
  const cm = src("modules/wodx-combat/scripts/main.js");
  assert.match(cm, /profile === "spirit" && actor\?\.type === "Creature"/);
  assert.match(cm, /R\.sheetBonus\(actor\?\.items, "soak_buff", type\)/);
});
