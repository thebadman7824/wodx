import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* What things weigh, and loose gear on the map (B6080 to B6089). Pure rules of WoDX Library weight-rules.mjs,
   WoDX Interactables loose-rules.mjs and haul-rules.mjs, WoDX Combat movement-rules.js, plus the wiring. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const imp = p => import(pathToFileURL(join(root, p)));
const W = await imp("modules/wodx-library/scripts/weight-rules.mjs");
const L = await imp("modules/wodx-interactables/scripts/loose-rules.mjs");
const H = await imp("modules/wodx-interactables/scripts/haul-rules.mjs");
const MV = await imp("modules/wodx-combat/scripts/movement-rules.js");
const R = await imp("modules/wodx-interactables/scripts/interact-rules.mjs");
const {GOODS} = await imp("modules/wodx-library/data/goods.mjs");
const gear = JSON.parse(src("modules/wodx-library/data/gear.json")).items;

test("every good and every piece of gear weighs something, and nothing silly", () => {
  for ( const g of GOODS ) {
    const kg = W.kgOf({name: g.name, kind: g.kind, conceal: g.conceal}, Math.max(1197, g.from)).kg;
    assert.ok(kg > 0 && kg <= 120, `${g.name}: ${kg}`);
  }
  for ( const i of gear ) {
    const f = i.flags["wodx-library"];
    const kg = W.kgOf({name: i.name, type: i.type, kind: f.kind, conceal: i.system.conceal, soak: i.system.soak?.lethal}, 1500).kg;
    assert.ok(kg >= 0 && kg <= 120, `${i.name}: ${kg}`);
  }
});

test("named figures: a knife is light, an anvil is not, the first match wins", () => {
  assert.equal(W.kgOf({name: "a pocket knife", kind: "tools", conceal: "J"}).kg, 0.3);
  assert.equal(W.kgOf({name: "an anvil", kind: "tools", conceal: "N"}).kg, 100);
  assert.equal(W.kgOf({name: "a pair of saddlebags", kind: "containers", conceal: "N"}).kg, 3, "saddlebags are not a saddle");
  assert.equal(W.kgOf({name: "a saddle", kind: "travel", conceal: "N"}).kg, 12);
  assert.equal(W.kgOf({name: "a wheelchair", kind: "travel", conceal: "N"}).kg, 25 * 1, "a wheelchair of 1800");
  assert.equal(W.kgOf({name: "Gatling Gun, .50", type: "Ranged Weapon", kind: "ranged"}).kg, 40);
  assert.equal(W.kgOf({name: "Something unknown", kind: "tools", conceal: "N"}).why, "kind");
  assert.equal(W.kgOf({name: "Something unknown", kind: "tools", conceal: "P"}).kg, 0.2);
  assert.equal(W.kgOf({name: "anything", own: 7}).kg, 7, "the Storyteller's own figure wins");
});

test("by the year: makes change across the eras (B6081)", () => {
  assert.equal(W.stagedKg("2.3>1960:0.6>1995:0.25", 1944), 2.3);
  assert.equal(W.stagedKg("2.3>1960:0.6>1995:0.25", 1970), 0.6);
  assert.equal(W.stagedKg("2.3>1960:0.6>1995:0.25", 2010), 0.25);
  assert.equal(W.kgOf({name: "a wheelchair", kind: "travel"}, 2010).kg, 13);
  assert.equal(W.kgOf({name: "a walkie-talkie", kind: "tech"}, 1944).kg, 2.3);
  assert.equal(W.kgOf({name: "a walkie-talkie", kind: "tech"}, 2070).kg, 0.2, "Future Darkness gadgets lose a fifth");
  // Armor: mail and plate before 1900, aramid after, composites in Future Darkness
  assert.equal(W.armorKg({soak: 5, year: 1300}), 25);
  assert.equal(W.armorKg({soak: 3, year: 1990}), 5);
  assert.ok(W.armorKg({soak: 3, year: 2080}) < 5);
  assert.equal(W.armorKg({soak: 2, year: 1200, shield: true}), 5);
  assert.equal(W.kgOf({name: "Mail", type: "Armor", kind: "armor", soak: 4}, 1500).kg, 18);
  assert.equal(W.kgOf({name: "Full Plate", type: "Armor", kind: "armor", soak: 5}, 1500).kg, 25);
});

test("cyberware in the body weighs nothing extra; loose, it does (B6080)", () => {
  assert.equal(W.kgOf({name: "Ripper Hand", kind: "cyber hand", installed: true}).kg, 0);
  assert.equal(W.kgOf({name: "Ripper Hand", kind: "cyber hand"}).kg, 1);
  assert.equal(W.kgOf({name: "Arm", kind: "cyber limb"}).kg, 4);
});

test("counts: '(7)' and '7 pennies' weigh seven (B6082)", () => {
  const plurals = {"silver pennies": "a silver penny"};
  assert.deepEqual(W.readCount("claret (3)"), {name: "claret", count: 3});
  assert.deepEqual(W.readCount("7 silver pennies", plurals), {name: "a silver penny", count: 7});
  assert.deepEqual(W.readCount("a knife"), {name: "a knife", count: 1});
  const lookup = n => ({"a silver penny": {name: n, kind: "coin", conceal: "P"}, "an anvil": {name: n, kind: "tools", conceal: "N"}})[n] ?? null;
  const r = W.linesKg(["7 silver pennies", "an anvil", "a mystery"], {lookup, plurals});
  assert.equal(r.rows[0].kg, 0.035);
  assert.equal(r.kg, Math.round(0.035 + 100 + W.PLAIN_KG));
});

test("what a character carries: worn armor apart, traits weigh nothing, natural weapons stay", () => {
  const r = W.itemsKg([
    {name: "Mail", type: "Armor", kind: "armor", soak: 4, worn: true},
    {name: "Broadsword", type: "Melee Weapon", kind: "melee"},
    {name: "Claws", type: "Melee Weapon", natural: true},
    {name: "Brawl", type: "Ability"},
    {name: "silver pennies", type: "Item", kind: "coin", conceal: "P", count: 10}
  ], 1300);
  assert.equal(r.worn, 18);
  assert.equal(r.carried, 1.6);
  assert.equal(r.rows.length, 3);
});

test("containers weigh their contents, not a kilo a thing (B6083)", () => {
  assert.equal(H.thingOf({container: true, kind: "chest"}, 12.4).kg, 42.4);
  assert.equal(H.thingOf({container: true, kind: "chest"}, 12.4).inside, 12.4);
  assert.equal(H.thingOf({container: true, kind: "chest", haulKg: 90}, 12).inside, 0, "the Storyteller's weight is the whole thing");
  const p = H.thingOf({container: true, kind: "pile"}, 3.2);
  assert.equal(p.kg, 3.2);
  assert.equal(p.pile, true, "a pile is hauled like a sack");
  assert.equal(p.label, "pile of gear");
});

test("the swimmer's load reads the gear's weight against the lifting chart (B6085)", () => {
  assert.equal(MV.weighedBurden(10, 45), 0);
  assert.equal(MV.weighedBurden(12, 45), 1);
  assert.equal(MV.weighedBurden(30, 45), 2);
  assert.equal(MV.weighedBurden(50, 45), 3);
  assert.equal(MV.weighedBurden(50, 0), 0, "no chart, no weighed burden");
  const l = MV.swimLoad({strength: 2, gearKg: 30, liftKg: 45});
  assert.equal(l.steps, 2);
  assert.match(l.note, /30 kg of gear/);
  // The hand-set burden still counts when it is the bigger
  assert.equal(MV.swimLoad({strength: 2, burden: 3, gearKg: 5, liftKg: 45}).steps, 3);
  // Strength is in the chart already: it takes nothing more off the gear
  assert.equal(MV.swimLoad({strength: 4, gearKg: 100, liftKg: 180}).steps, 2);
  // Old calls still read as before
  assert.equal(MV.swimLoad({armorPenalty: 2, burden: 1, strength: 4}).steps, 2);
});

test("loose gear: what can go down, piles join on a square, items come back as they were (B6086, B6088)", () => {
  assert.equal(L.canSetDown({type: "Melee Weapon"}), true);
  assert.equal(L.canSetDown({type: "Melee Weapon", natural: true}), false);
  assert.equal(L.canSetDown({type: "Item", kind: "cyber hand", installed: true}), false);
  assert.equal(L.canSetDown({type: "Ability"}), false);
  const f = L.pileFlags([{name: "Knife", data: {name: "Knife", type: "Melee Weapon"}}]);
  assert.equal(f.container && f.pile && f.kind === "pile" && f.ds === "open", true);
  assert.deepEqual(f.items, ["Knife"]);
  const more = L.addToPile(f, [{name: "Knife", data: {name: "Knife", type: "Melee Weapon", system: {x: 2}}}, {name: "Rope", data: {name: "Rope"}}]);
  assert.deepEqual(more.items, ["Knife", "Knife", "Rope"]);
  assert.equal(L.addToPile({...f, taken: true}, [{name: "Rope", data: {}}]).items.length, 1, "a picked-up pile starts afresh");
  const m = L.matchLoose(["Knife", "Knife", "a candle"], more.loose);
  assert.equal(m[1].data.system.x, 2, "each set-down thing comes back once, in order");
  assert.equal(m[2].data, null);
  assert.deepEqual(L.squareOf({x: 250, y: 140}, 100), {x: 200, y: 100});
});

test("the heap: inside its square, bigger when heavier, the same each time (B6087)", () => {
  const light = L.heapOf([{name: "Knife", kg: 0.3, type: "Melee Weapon"}], 100);
  const heavy = L.heapOf([{name: "Mail", kg: 18, type: "Armor"}, {name: "Sword", kg: 1.5, type: "Melee Weapon"}, {name: "Rope", kg: 2, kind: "tools"}], 100);
  for ( const b of [...light, ...heavy] ) assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= 100 && b.y + b.h <= 100, JSON.stringify(b));
  const area = bs => bs.reduce((a, b) => a + b.w * b.h, 0);
  assert.ok(area(heavy) > area(light) * 3);
  assert.deepEqual(L.heapOf([{name: "Knife", kg: 0.3}], 100), L.heapOf([{name: "Knife", kg: 0.3}], 100));
  assert.equal(L.colourOf({type: "Armor", name: "Mail"}), L.COLOURS.iron);
  assert.equal(L.colourOf({kind: "coin"}), L.COLOURS.gold);
  assert.equal(L.pileLabel("", 12.4), "Gear on the ground, about 12 kg");
});

test("the Interact menu names the weight; a pile is picked up, never locked (B6086, B6087)", () => {
  const o = R.describeContainer({container: true, kind: "pile", ds: "open", items: ["Knife", "Rope"]});
  assert.equal(R.kgPart({...o, kg: 2.3}), "2 things, about 2.3 kg");
  assert.equal(R.kgPart(o), "2 things", "no weight without WoDX Library");
  assert.match(R.nameOf({...o, kg: 2.3}), /^Gear on the ground \(2 things, about 2.3 kg\)$/);
});

test("wiring: the Library serves weights; Interactables and Combat read them", () => {
  assert.match(src("modules/wodx-library/scripts/main.mjs"), /api\.weight = await setupWeight\(\)/);
  const hl = src("modules/wodx-interactables/scripts/haul.mjs");
  assert.match(hl, /H\.thingOf\(f, f\.container \? contentsKg\(f\) : 0\)/, "containers weigh their contents");
  assert.match(hl, /gearKg\(actor\)\.kg/, "a body weighs what it has on it");
  assert.match(hl, /op: "setdown"/);
  const mn = src("modules/wodx-interactables/scripts/main.mjs");
  assert.match(mn, /giveItems\(actor, o\.items, doc\.flags\?\.\[MOD\]\?\.loose/, "a pile gives back the items it holds");
  assert.match(mn, /setupLoose\(/);
  assert.match(src("modules/wodx-interactables/scripts/loose.mjs"), /contentsKg\(f = \{\}\) \{\n\s+if \( f\.taken \) return 0;/, "a taken container weighs nothing inside");
  assert.match(src("modules/wodx-combat/scripts/movement.js"), /W\.actorKg\(actor\)\.carried/);
});
