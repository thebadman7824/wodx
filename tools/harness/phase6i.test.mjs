import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* Phase 6i: the fallen (WoDX Actions 3.10.0, Demon: The Fallen) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const D = await import(join(root, "modules/wodx-actions/scripts/demon-rules.js"));
const V = await import(join(root, "modules/wodx-actions/scripts/voice-rules.js"));

test("seven Houses with their starting Torment and three lores; 23 lore paths of five evocations (pp. 99–112, 171–215)", () => {
  assert.equal(Object.keys(D.HOUSES).length, 7);
  assert.deepEqual(Object.values(D.HOUSES).map(h => h.torment), [4, 3, 3, 3, 3, 4, 4]);
  assert.equal(Object.keys(D.LORES).length, 23);
  for ( const L of Object.values(D.LORES) ) {
    assert.equal(L.evo.length, 5);
    if ( L.house ) { assert.equal(L.form.length, 4); assert.equal(L.high.length, 4); assert.ok(L.visage); }
  }
  for ( const h of Object.values(D.HOUSES) ) for ( const l of h.lores ) assert.equal(D.LORES[l].house, Object.keys(D.HOUSES).find(k => D.HOUSES[k] === h));
  assert.equal(D.houseOf("wod.bio.demon.devil"), "devil");
  assert.equal(D.houseOf("Halaku"), "slayer");
  assert.equal(D.loreOf("Lore of the Flame"), "flame");
  assert.equal(D.loreOf("Lore of Awakenings"), "awakening");
  assert.deepEqual(D.startingLores("scourge"), ["awakening", "firmament", "winds", "fundament", "humanity"]);
});

test("known evocations: a rating opens its level and those below (p. 171)", () => {
  const k = D.evocationsKnown({flame: 2, humanity: 1});
  assert.deepEqual(k.map(e => e.name), ["Fuel", "Ignite", "Translate"]);
  assert.equal(D.visageOf("flame"), "Nusku, the Visage of Flame");
});

test("an evocation: traits at 6, Faith for successes, ravaging capped at Faith, unbelievers raise the difficulty (pp. 171, 251–253)", () => {
  const p = D.evocationPlan({attr: 3, ability: 2, level: 2, loreRating: 2, faithCost: 1, faithSpent: 1, ravage: 9, permFaith: 4, faithPool: 3, unbelievers: 2});
  assert.deepEqual([p.dice, p.difficulty, p.autoSuccesses, p.cost, p.ravaged], [9, 8, 1, 2, 4]);
  assert.equal(D.evocationPlan({attr: 3, ability: 2, level: 3, loreRating: 2}).ok, false);
  assert.equal(D.evocationPlan({attr: 3, ability: 2, level: 1, loreRating: 1, faithCost: 1, faithPool: 0}).ok, false);
});

test("Torment twists the evocation: a success die at or below Torment (p. 161), or the successes rule (p. 169)", () => {
  // Torment 3 at difficulty 6: no success die can show 3 or less; the dark effect needs Torment 6 or more
  assert.equal(D.tormentBites({faces: [6, 7, 2], difficulty: 6, successes: 2, torment: 3}), false);
  assert.equal(D.tormentBites({faces: [6, 9], difficulty: 6, successes: 2, torment: 6}), true);
  assert.equal(D.tormentBites({faces: [6, 9], difficulty: 6, successes: 2, torment: 3, rule: "count"}), true);
  assert.equal(D.evocationOutcome({successes: 2, faces: [8, 9], difficulty: 6}, {torment: 4, chooseHigh: true}).tormentGain, 1);
  assert.equal(D.evocationOutcome({botch: true, successes: 0, faces: [1]}, {torment: 4}).faithLoss, 1);
  assert.equal(D.evocationOutcome({successes: 0, faces: [3]}, {torment: 4}).effect, "none");
});

test("the apocalyptic form: high-Torment powers from Torment 7, the look by Torment and Willpower (pp. 162, 170, 254)", () => {
  assert.deepEqual([3, 6, 7, 8, 10].map(D.highSlots), [0, 0, 1, 2, 4]);
  assert.equal(D.visageLook(2, 5), "glorious");
  assert.equal(D.visageLook(4, 5), "either");
  assert.equal(D.visageLook(6, 5), "nightmarish");
  assert.equal(D.formOutcome({successes: 0, botch: true}).faithLoss, 1);
  assert.equal(D.formOutcome({}, true).ok, true);
});

test("Revelation: 10 less the scene's Faith; a witness's reaction (pp. 253–254)", () => {
  assert.equal(D.revelationDifficulty(3), 7);
  assert.equal(D.revelationDifficulty(12), 0);
  assert.equal(D.mortalReaction({botch: true}).key, "collapse");
  assert.equal(D.mortalReaction({successes: 0}).key, "rapt");
  assert.match(D.mortalReaction({successes: 3}).text, /exactly/);
});

test("Torment: ten points to a permanent point; the Hierarchy by row; sins at 8; kindness (pp. 159–161)", () => {
  assert.deepEqual(D.addTorment({perm: 4, temp: 9}, 1), {perm: 5, temp: 0, gained: 1, lost: false});
  assert.equal(D.addTorment({perm: 9, temp: 9}, 1).lost, true);
  assert.equal(D.sinCounts(4, 3), false);
  assert.equal(D.sinCounts(4, 7), true);
  assert.equal(D.sinCounts(10, 9), false);
  assert.equal(D.SINS.length, 9);
  assert.equal(D.sinOutcome({successes: 0}).torment, 1);
  assert.equal(D.kindnessOutcome(3, 2).torment, -1);
  assert.equal(D.kindnessOutcome(2, 2).tie, true);
});

test("Faith: reaping, thralls' offerings at dawn, gifts, ravaging (pp. 250–253)", () => {
  assert.equal(D.reapOutcome(3, 1).faith, 1);
  assert.equal(D.reapOutcome(3, 1, {resonant: true}).faith, 2);
  assert.equal(D.reapOutcome(1, 1).faith, 0);
  assert.deepEqual([1, 2, 3, 4, 5].map(D.offerCap), [1, 1, 2, 2, 3]);
  assert.equal(D.dawnOffering([{potential: 3, offered: 1}, {potential: 5, offered: 9}, {potential: 4, offered: 2, broken: true}]), 4);
  assert.deepEqual(D.giftsCost(3, [{k: "freebies"}, {k: "enhancement"}, {k: "innate"}]), {spent: 3, left: 0, ok: true});
  assert.equal(D.giftsCost(2, [{k: "evocation", level: 3}]).ok, false);
  assert.deepEqual(D.ravageThrall({willpower: 3}, 5), {willpower: 0, wpLoss: 3, lethal: 2, derangement: true});
});

test("Faith heals; the holy burns at Torment 4; prayers; experience and creation (pp. 123, 164, 171, 248, 254–256)", () => {
  assert.deepEqual(D.faithHeal({bashing: 3, lethal: 2}, "bashing").damage, {bashing: 0, lethal: 2, aggravated: 0});
  assert.equal(D.faithHeal({lethal: 2}, "lethal").damage.lethal, 1);
  assert.equal(D.faithHeal({aggravated: 2}, "aggravated").ok, false);
  assert.equal(D.holy(3, 4).harmed, false);
  assert.equal(D.holy(4, 4).lethal, 4);
  assert.equal(Object.keys(D.PRAYERS).length, 4);
  assert.equal(D.unbelieverDice(3, 20), 6);
  assert.equal(D.illusionDifficulty(), 7);
  assert.equal(D.illusionDifficulty(5, 8), 8);
  assert.deepEqual([D.xpCost("lore", 0), D.xpCost("lore", 0, {otherHouse: true}), D.xpCost("lore", 2), D.xpCost("faith", 3), D.xpCost("torment", 5)], [7, 10, 10, 21, 10]);
  assert.equal(D.startingTraits("devil").torment, 4);
});

test("the inner voice of the fallen: the Torment (pp. 159–170)", () => {
  assert.equal(V.kindFor("demon"), "torment");
  assert.equal(V.pressure("torment", {perm: 3, temp: 0}).level, "calm");
  assert.equal(V.pressure("torment", {perm: 4, temp: 3}).level, "stirring");
  assert.equal(V.pressure("torment", {perm: 7, temp: 0}).level, "breaking");
  assert.ok(V.PROPOSALS.torment.length >= 3);
});

test("wiring: Actions 3.10, the Demon menu and API, gender-neutral text (B48)", () => {
  assert.match(JSON.parse(readFileSync(join(root, "modules/wodx-actions/module.json"), "utf8")).version, /^3\.1\d\./);
  const main = readFileSync(join(root, "modules/wodx-actions/scripts/main.js"), "utf8");
  for ( const k of ["demonEvoke", "demonForm", "demonRevelation", "demonReap", "demonThralls", "demonSin", "demonKindness", "demonHeal", "demonHoly", "demonName", "demonIllusion"] ) assert.match(main, new RegExp(`${k}: withActor`));
  const pm = readFileSync(join(root, "modules/wodx-actions/scripts/profile-menus.js"), "utf8");
  assert.match(pm, /MENUS\.demon = /);
  const words = /\b(he|she|him|her|his|hers|himself|herself)\b/i;
  for ( const f of ["demon.js", "demon-rules.js"] ) {
    const src = readFileSync(join(root, "modules/wodx-actions/scripts", f), "utf8");
    const strings = src.match(/`[^`]*`|"[^"\n]*"/g) ?? [];
    for ( const s of strings ) assert.ok(!words.test(s), `${f}: ${s.slice(0, 80)}`);
  }
});
