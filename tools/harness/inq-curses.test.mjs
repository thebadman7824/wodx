import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Hunters' sins and Curses from play (B7883-B7890; Dark Ages: Inquisitor pp. 62-71, 129-139, 159, 166-169, 201-213) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const C = await imp("modules/wodx-rules/actions/inq-curses-rules.js");
const RR = await imp("modules/wodx-rules/storyteller/recipe-rules.mjs");
const {ROTHENSTEIN} = await imp("modules/wodx-rothenstein/data/recipe.mjs");
const L = await imp("modules/wodx-chronicle/data/trait-lines.mjs");
const T = await imp("modules/wodx-rules/chronicle/trait-rules.mjs");

test("B7883, B7934: 25 Curses of the core book and 20 of the Companion, stages 2-2-1 and 2-1-1, every category an order's", () => {
  assert.equal(C.CURSES.length, 45);
  for ( const k of Object.keys(C.CATEGORIES) ) {
    const core = C.CURSES.filter(c => c.cat === k && !c.p), comp = C.CURSES.filter(c => c.cat === k && c.p);
    assert.deepEqual(core.map(c => c.stage).sort(), [1, 1, 2, 2, 3], k);
    assert.deepEqual(comp.map(c => c.stage).sort(), [1, 1, 2, 3], `${k}: the Companion's`);
    for ( const c of comp ) assert.ok(c.p >= 118 && c.p <= 124 && C.pageOf(c) === `Companion p. ${c.p}`, c.id);
    assert.ok(C.categoryOf(C.CATEGORIES[k].order) === k);
  }
  assert.equal(new Set(C.CURSES.map(c => c.id)).size, 45);
  // B7934: Divinely Favored, Curse Prone, Grace and Order Prodigy (Companion pp. 126-127)
  assert.equal(C.curseRollMods({favored: true}).mod, -2);
  assert.equal(C.curseRollMods({prone: true}).mod, 2);
  assert.deepEqual([C.callousWith([], 7, 5), C.callousWith([], 7, 5, {grace: true}), C.callousWith([], 8, 5, {grace: true}), C.callousWith([], 10, 8, {grace: true})], [true, false, true, false]);
  assert.deepEqual([C.prodigySpares({prodigy: true, order: "acre", own: true}), C.prodigySpares({prodigy: true, order: "red", own: true}), C.prodigySpares({prodigy: true, order: "acre"})], [true, false, false]);
  assert.deepEqual(C.curseMods(["lux-dei"], ["stealth"]).diff, 2);
  for ( const c of C.CURSES ) assert.ok(c.fx && !/—/.test(c.fx + (c.check ?? "")), c.id);
});

test("B7884: the Curse roll's table and its eight modifiers (p. 202)", () => {
  assert.deepEqual([0, 2, 5, 7, 8, 9, 10, 11].map(t => [C.curseOutcome(t).conviction, C.curseOutcome(t).stage]),
    [[1, 0], [0, 0], [-2, 0], [0, 1], [0, 1], [0, 2], [0, 2], [0, 3]]);
  const m = C.curseRollMods({callous: true, held: ["unclean", "false-witness", "lamb-of-god"], from: "primary", newCategory: true, legacy: true, order: "red", sv: {faith: 1, wisdom: 5, zeal: 5}});
  // +1 Callous, +2 heavy Curses, +1 primary botch, +1 new kind, +1 Legacy, -1 every Virtue, -2 two at 5
  assert.equal(m.mod, 3);
  assert.equal(C.curseRollMods({from: "other"}).mod, -1);
  assert.equal(C.curseRollMods({legacy: true, order: "murnau"}).mod, 0, "a Murnau learning a Legacy adds nothing");
  assert.equal(C.curseRollMods({order: "murnau", benefit: true}).mod, 1, "the House of Murnau's drawback");
});

test("B7884: the first Curse of a stage comes from the order's category, later ones from any (p. 204)", () => {
  const first = C.cursesFor("john", 2, ["book-of-revelations"]);
  assert.equal(first.forced, true);
  assert.deepEqual(first.list.map(c => c.cat), ["visitations", "visitations", "visitations"], "two of the core book, one of the Companion (B7934)");
  const later = C.cursesFor("john", 2, ["glossolalia"]);
  assert.equal(later.forced, false);
  assert.equal(later.list.length, 14, "9 of the core book and the Companion's 5 (B7934)");
  assert.equal(C.cursesFor("", 1, []).forced, false, "a precursor without an order picks from any");
});

test("B7886: Cocytus at stages equal to Piety plus the Superior Virtues; the bank pays too", () => {
  assert.deepEqual(C.cocytus(["lamb-of-god", "unclean", "false-witness"], 4, {faith: 2}), {stages: 6, limit: 6, fallen: true});
  assert.equal(C.cocytus(["lamb-of-god", "unclean", "false-witness"], 5, {faith: 2}).fallen, false);
  assert.equal(C.cocytus([], 0, {}).fallen, false);
  assert.equal(C.cocytusDrain(7, 2), 5);
  assert.equal(C.cocytusDrain(1, 3), 0);
});

test("B7885: Curses on the inquisitor's rolls, and the rules they change", () => {
  const social = C.curseMods(["scent-of-hyacinth", "crowned-by-thorns"], ["social"]);
  assert.equal(social.diff, 3);
  assert.equal(C.curseMods(["scent-of-hyacinth"], ["social", "intimidation"]).diff, 0, "not on Intimidation");
  assert.equal(C.curseMods(["false-witness"], ["social", "subterfuge"]).dice, -3);
  assert.equal(C.curseMods(["allure-of-gentle-hades"], ["stealth"]).diff, 2);
  assert.equal(C.curseMods(["speared-by-destiny"], ["melee"]).dice, -1);
  assert.equal(C.curseMods(["speared-by-destiny"], []).dice, 0);
  assert.equal(C.callousWith(["lamb-of-god"], 5, 5), true);
  assert.equal(C.callousWith([], 5, 5), false);
});

test("B7887: order benefits from 1223 (the Oculi after 1227), and the drawbacks in play", () => {
  assert.equal(C.benefitOpen("acre", 1202).ok, false);
  assert.match(C.benefitOpen("acre", 1202).why, /1223/);
  assert.equal(C.benefitOpen("acre", 1223).ok, true);
  assert.equal(C.benefitOpen("oculi", 1227).ok, false);
  assert.equal(C.benefitOpen("oculi", 1228).ok, true);
  assert.equal(C.pietyFor(6, {order: "acre", benefit: true, relic: true}), 7);
  assert.equal(C.pietyFor(6, {order: "acre", benefit: true, relic: false}), 6);
  assert.equal(C.impulseDiff({order: "red", benefit: true, callous: true}), 7);
  assert.equal(C.benefitDots("red", true).exposure, 3);
  assert.deepEqual(C.benefitDots("red", false), {});
});

test("B7888: the sins play sees, at their level on the Hierarchy (p. 159)", () => {
  assert.equal(C.pietyEvent("kill"), 1);
  assert.equal(C.pietyEvent("lie"), 8);
  assert.equal(C.pietyEvent("wordBroken"), 8);
  assert.equal(C.pietyEvent("theft"), 6);
  assert.equal(C.pietyEvent("starve"), null);
  assert.equal(C.christianVictim(null), true);
  assert.equal(C.christianVictim("jewish"), false);
});

test("B7889: the DA:I merits and flaws are in the trait table with their effects", () => {
  const rows = L.LINE_MERITS_FLAWS.filter(e => e.book === "DA:I");
  assert.equal(rows.length, 18);
  assert.ok(L.LINE_BOOKS.includes("DA:I"));
  assert.deepEqual(T.problems(), []);
  const ev = rows.find(e => e.key === "evangelist");
  assert.equal(ev.effects[0].diff, -2);
  assert.equal(rows.find(e => e.key === "weak-lungs").effects[0].tags[0], "athletics");
  const v = T.traitsOf({kind: "mortal", features: [{id: "a", name: "Uncanny Logic", kind: "merit", value: 2}]});
  assert.equal(v.matched[0]?.key, "uncanny-logic");
});

test("B7890: Anselm and Thibault are precursors, with no order before 1223", () => {
  const plan = RR.castPlan(ROTHENSTEIN, [{id: "x", name: "Brother Anselm", playerOwned: false}]);
  const th = plan.make.find(p => p.name === "Thibault de Montfaucon");
  assert.equal(th.sheet["flags.wodx-actions.inquisitor"].precursor, "crusader");
  assert.equal(th.sheet["flags.wodx-actions.inquisitor"].order, "");
  const an = plan.set.find(s => s.id === "x");
  assert.equal(RR.castFields(an)["flags.wodx-actions.inquisitor"].precursor, "faithful");
  assert.equal(RR.castPlan(ROTHENSTEIN, [{id: "x", name: "Brother Anselm", playerOwned: false, hunter: true}]).set.length, 0, "an inquisitor sheet already there is left alone");
  for ( const k of RR.HUNTER_PRECURSORS ) assert.ok(C.PRECURSORS[k], k);
});

test("B7883-B7890: wiring: the botches, the card buttons, the rolls, the kills", () => {
  const h = src("modules/wodx-actions/scripts/hunter.js"), m = src("modules/wodx-actions/scripts/main.js"), k = src("modules/wodx-actions/scripts/kindred.js");
  assert.match(h, /curseRoll\(actor, \{ why: "A botched Piety roll" \}\)/);
  assert.match(h, /from: sk === primaryOf\(i\) \? "primary" : "other"/);
  assert.match(h, /offerCurse\(actor, want/);
  assert.match(h, /endless-penitence/);
  assert.match(h, /CR\.cocytus\(after\.curses/);
  assert.match(h, /data-hx=/);
  assert.match(m, /button\.vta-btn\[data-hx\]/);
  assert.match(m, /CUR\.curseMods\(held/);
  assert.match(m, /hx\(\)\.pietyPrompt\(actor, ev/);
  assert.match(k, /pietyPrompt\?\.\(killer, "kill"/);
});
