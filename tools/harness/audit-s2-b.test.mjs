import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Final audit, second sweep, worker b (B6815 to B6817): the system's health boxes, Library weights, Paperdoll face groups */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));

test("B6815: two health tracks drawn at the same time keep their own damage", async () => {
  globalThis.CONFIG ??= {};
  CONFIG.worldofdarkness ??= {sheettype: {mortal: "Mortal", changeling: "Changeling", wraith: "Wraith"}};
  const H = await imp("system/worldofdarkness/module/scripts/health.js");
  const lv = p => ({total: 1, penalty: p, label: "x"});
  const actor = d => ({items: [], system: {health: {damage: d, bruised: lv(0), hurt: lv(-1), injured: lv(-1), wounded: lv(-2), mauled: lv(-2), crippled: lv(-5), incapacitated: lv(-99)}}});
  const [a, b] = await Promise.all([H.calculateHealth(actor({bashing: 0, lethal: 6, aggravated: 0}), "Mortal"), H.calculateHealth(actor({bashing: 1, lethal: 0, aggravated: 1}), "Mortal")]);
  assert.deepEqual(a.map(x => x.status), ["x", "x", "x", "x", "x", "x", ""]);
  assert.equal(a.woundPenalty, -5);
  assert.deepEqual(b.map(x => x.status), ["*", "/", "", "", "", "", ""]);
  assert.equal(b.woundPenalty, -1);
});

test("B6816: a Possessions stack weighs its whole count", async () => {
  const W = await imp("modules/wodx-library/scripts/weight.mjs");
  const stack = {name: "a sack of grain", type: "Item", flags: {"wodx-sheets": {qty: 4}}, system: {}};
  assert.equal(W.viewOf(stack).count, 4);
  assert.equal(W.itemKg(stack, 1500), W.itemKg({...stack, flags: {}}, 1500) * 4);
  assert.equal(W.viewOf({name: "claret (3)", type: "Item", flags: {"wodx-sheets": {qty: 9}}, system: {}}).count, 3, "a count in the name still wins");
});

test("B6817: a face reads the sheet's picked clan, tribe or Tradition by its name, not its key", async () => {
  const names = {"wod.bio.mage.hermes": "Order of Hermes", "wod.bio.werewolf.getoffenris": "Get of Fenris"};
  globalThis.game = {...(globalThis.game ?? {}), i18n: {localize: k => names[k] ?? k}};
  const F = await imp("modules/wodx-paperdoll/scripts/face64.mjs");
  const FF = await imp("modules/wodx-paperdoll/scripts/face64-features.mjs");
  const mage = F.groupText({type: "Mage", system: {affiliation: "wod.bio.mage.hermes"}});
  assert.ok(FF.groupMatches("Order of Hermes", mage), mage);
  assert.ok(FF.groupMatches("Get of Fenris", F.groupText({type: "Werewolf", system: {tribe: "wod.bio.werewolf.getoffenris"}})));
  assert.ok(FF.groupMatches("Brujah", F.groupText({type: "Vampire", system: {clan: "custom", custom: {clan: "Brujah"}}})), "typed names pass as they are");
  const rolled = FF.rollFeatures("x1", "mage", mage).map(id => FF.FEATURES[id]);
  assert.ok(rolled.some(f => f.group === "Order of Hermes"), "a Hermetic face rolls Hermetic features");
});

test("B6818: a metis Ratkin's Crinos gets the metis table when the sheet stores the breed's key", async () => {
  globalThis.FormApplication ??= class {}; globalThis.Application ??= class {};
  globalThis.foundry ??= {applications: {api: {HandlebarsApplicationMixin: c => c, ApplicationV2: class {}, DialogV2: class {}}}};
  globalThis.CONFIG ??= {};
  CONFIG.worldofdarkness = {...(CONFIG.worldofdarkness ?? {}), sheettype: {changingbreed: "Changing Breed", werewolf: "Werewolf", mortal: "Mortal", changeling: "Changeling", wraith: "Wraith"},
    damageTypes: {bashing: "", lethal: "", aggravated: ""}, woundLevels: {bruised: ""}, wererwolfrageSettings: false};
  globalThis.game = {...(globalThis.game ?? {}), actors: {get: () => undefined}};
  const {calculateTotals} = await imp("system/worldofdarkness/module/scripts/totals.js");
  const mk = breed => ({_id: "x", type: "Changing Breed", items: [], system: {changingbreed: "Ratkin", breed,
    shapes: {homid: {isactive: false, label: "wod.shapes.homid"}, crinos: {isactive: true, label: "wod.shapes.crinos"}},
    attributes: Object.fromEntries(["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"].map(a => [a, {value: 2, bonus: 0, total: 2, label: `wod.attributes.${a}`}])),
    settings: {soak: {bashing: {isrollable: true}, lethal: {isrollable: false}, aggravated: {isrollable: false}}, variant: "general"},
    soak: {}, health: {damage: {woundpenalty: 0}, bruised: {value: 1}}, initiative: {bonus: 0}, conditions: {}, advantages: {}}});
  const metis = await calculateTotals(mk("wod.bio.breedname.metis"));
  assert.equal(metis.system.attributes.strength.total, 5, "Strength +3");
  assert.equal(metis.system.attributes.stamina.total, 3, "Stamina +1");
  const homid = await calculateTotals(mk("wod.bio.breedname.homid"));
  assert.equal(homid.system.attributes.strength.total, 3, "the other breeds keep Strength +1");
});
