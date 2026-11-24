import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Fae oaths kept by the village (Storyteller, B7866-B7869; Dark Ages: Fae pp. 33-39, 67-74, 85, 94, 108-110, 183, 204) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const R = await imp("modules/wodx-storyteller/scripts/fae-oaths-rules.mjs");
const F = await imp("modules/wodx-actions/scripts/fae-da-rules.js");
const U = await imp("modules/wodx-storyteller/scripts/upkeep-rules.mjs");
const TR = await imp("modules/wodx-storyteller/scripts/town-rules.mjs");
const DAY = 86400;

const oath = (x = {}) => R.normOath({tier: "iron", rating: 2, court: "summer", fae: [{id: "f1", name: "Ash"}], humans: [{id: "h1", name: "Ola"}],
  deal: "bring a stag each week", duty: "cook it and give half back", faeBreaks: "no stag comes", humanBreaks: "the half is kept",
  punishFae: "always fail the hunt", punishHuman: "never eat venison again without falling ill", ...x});

test("B7866: an oath has five parts, and the tiers keep their ratings (pp. 108-110)", () => {
  assert.deepEqual(R.missingParts(oath()), []);
  assert.ok(R.missingParts(oath({deal: "", humanBreaks: ""})).includes("what the fae does"));
  assert.ok(R.missingParts(oath({fae: []})).includes("the fae who swore it"));
  assert.equal(R.normOath({tier: "iron", rating: 5}).rating, 3);
  assert.equal(R.normOath({tier: "gold", rating: 1}).rating, 4);
  assert.equal(R.normOath({tier: "iron", humans: ["a", "b", "c", "d", "e", "f"]}).humans.length, 4);
  const sh = R.sheetOath(oath());
  assert.equal(sh.kind, "iron"); assert.equal(sh.active, true); assert.ok(sh.ledgerId);
});

test("B7866: breaking an oath ends its shield and carries the Court's way with breakers", () => {
  const b = R.breakOath(oath(), "human", {why: "kept the half"});
  assert.equal(b.oath.state, "broken"); assert.equal(R.shields(b.oath), false);
  assert.match(b.punishment, /venison/); assert.match(b.court, /Summer/);
  assert.equal(R.sheetOath(b.oath).active, false);
  const f = R.breakOath(oath(), "fae");
  assert.match(f.punishment, /fail the hunt/); assert.equal(f.court, "");
  // Spring pities a human tricked into it (p. 67)
  const sp = R.breakOath(oath({court: "spring", tricked: true}), "human");
  assert.equal(sp.punishment, ""); assert.match(sp.court, /pities/);
  // An Iron Oath a side cannot keep is inactive, not broken (p. 109); Stone does not go inactive
  assert.equal(R.inactive(oath()).state, "inactive");
  assert.equal(R.inactive(R.inactive(oath()), false).state, "kept");
  assert.equal(R.inactive(oath({tier: "stone", rating: 3})).state, "kept");
});

test("B7866: baptism washes Iron and Stone Oaths, not Gold (p. 108); a rising breaks the oaths that rule a town (p. 204)", () => {
  const gold = oath({id: "g", tier: "gold", rating: 4, humans: [{id: "h1", name: "Ola"}]});
  const stone = oath({id: "s", tier: "stone", rating: 3});
  const other = oath({id: "o", humans: [{id: "h2", name: "Ivo"}]});
  const r = R.baptise([gold, stone, other], {id: "h1", name: "Ola"});
  assert.deepEqual(r.gone, ["s"]);
  assert.equal(r.oaths.find(o => o.id === "g").state, "kept");
  assert.equal(r.oaths.find(o => o.id === "o").state, "kept");
  const rule = oath({id: "l", lordship: true, town: "dolany"}), elsewhere = oath({id: "m", lordship: true, town: "other"});
  const ri = R.rising([rule, elsewhere, stone], "dolany");
  assert.deepEqual(ri.gone, ["l"]);
  assert.equal(ri.oaths.find(o => o.id === "l").state, "broken");
  assert.match(ri.oaths.find(o => o.id === "l").broke.why, /rose/);
  // Gold Oaths are only customs to the village (p. 108); the book's models fill all five parts
  assert.match(R.customLine(gold), /always been done|half/i);
  for ( const M of Object.values(R.MODELS) ) assert.deepEqual(R.missingParts({...M, fae: [{name: "x"}]}), []);
  assert.equal(R.COURTS.solstice.none, true);
});

test("B7867: household helpers: a brownie is offended by a gift, then leaves or turns; praise drives it off; the sun, seven days", () => {
  let b = R.normHelper({kind: "brownie", name: "Hob"});
  assert.ok(R.doesChores(b));
  let s = R.slight(b, "gift");
  assert.equal(s.helper.mood, "offended"); assert.equal(s.spite, false); assert.equal(R.doesChores(s.helper), false);
  const turned = R.slight(s.helper, "gift", {rng: () => 0.1});
  assert.equal(turned.helper.mood, "spiteful"); assert.equal(turned.spite, true);
  assert.equal(R.slight(s.helper, "gift", {rng: () => 0.9}).helper.mood, "gone");
  assert.equal(R.slight(b, "praise").helper.mood, "gone");
  const sun = R.slight(b, "sun", {now: 100});
  assert.equal(sun.helper.mood, "mushrooms");
  assert.equal(R.helperBack(sun.helper, 100 + 6 * DAY).mood, "mushrooms");
  assert.equal(R.helperBack(sun.helper, 100 + 7 * DAY).mood, "content");
  // A sprite is spurned by the Church or an unkept small oath (p. 183), and takes no notice of a gift
  const sp = R.normHelper({kind: "sprite"});
  assert.equal(R.slight(sp, "holy").helper.mood, "spiteful");
  assert.equal(R.slight(sp, "neglect").spite, true);
  assert.equal(R.slight(sp, "gift").helper.mood, "content");
});

test("B7867: faerie food costs a success for a day (p. 85); the retinue's limits (p. 94); Retinue and Sprites are ties", () => {
  const flag = {at: 0, until: F.FOOD.lasts};
  assert.equal(F.afterFood(3, flag, 10), 2);
  assert.equal(F.afterFood(0, flag, 10), 0);
  assert.equal(F.afterFood(3, flag, DAY + 1), 3);
  assert.equal(R.afterFood, F.afterFood);
  assert.equal(R.RETINUE.betrayDiff, 10);
  assert.equal(R.harmDamage(4), 4);
  assert.equal(U.tieKindOfBackground("Retinue"), "retinue");
  assert.equal(U.tieKindOfBackground("Sprites"), "sprites");
  assert.equal(U.lapseAction("retinue"), "dot");
  assert.equal(U.lapseAction("sprites"), "dot");
  // The hetman's anger lands on the town's unrest (p. 204)
  const e = TR.powerEvent("hetman", "dolany", {label: "The hetman"});
  assert.ok(e.unrest > 0.5); assert.match(e.text, /hetman/i);
});

test("B7866-B7869: wiring: the window, the sheet sync, the rising hook, faerie food on the fae rolls", () => {
  const ui = src("modules/wodx-storyteller/scripts/fae-oaths.mjs"), main = src("modules/wodx-storyteller/scripts/main.mjs");
  assert.match(main, /faeOaths: FaeOaths\.api\(\)/);
  assert.match(main, /wodxFaeOaths/);
  assert.match(ui, /kind === "rising"/);
  assert.match(ui, /setFlag\(ACT, "daFae"/);
  assert.match(ui, /kind: "hetman"/);
  assert.match(ui, /applyDamage\?\.\(servant, "aggravated"/);
  const fae = src("modules/wodx-actions/scripts/fae-da.js");
  assert.match(fae, /F\.afterFood\(wr\.successes/);
  assert.match(fae, /ate faerie food: -1/);
});
