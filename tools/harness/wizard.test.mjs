import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";
import {installActors} from "./actors-mock.mjs";

/* WoDX Creation 0.24.0: the step-by-step character wizard (B2760 to B2766) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
await installActors(root);
globalThis.canvas = {tokens: {controlled: []}};
const M = "wodx-creation";
await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await import(join(root, "modules/wodx-creation/scripts/main.mjs"));
game.modules.set(M, {});
const api = () => game.modules.get(M).api;
const W = await import(join(root, "modules/wodx-creation/scripts/wizard-rules.mjs"));
const R = await import(join(root, "modules/wodx-creation/scripts/first-night-rules.mjs"));
const {MERITS_FLAWS, BACKGROUNDS} = await import(join(root, "modules/wodx-chronicle/data/trait-effects.mjs"));

const exact = () => ({attributes: {physical: 7, social: 5, mental: 3}, abilities: {talent: {dots: 13, aboveCap: 0}, skill: {dots: 9, aboveCap: 0}, knowledge: {dots: 5, aboveCap: 0}},
  backgrounds: 5, powers: {discipline: 3}, virtues: 7});

test("ready", async () => {
  await Hooks.callAll("init");
  mock.setupTime();
  await Hooks.callAll("ready");
  await mock.settle();
  assert.equal(typeof api().wizard, "function");
  assert.equal(typeof api().wizardLedger, "function");
});

test("pages follow the book's order and skip what a line lacks", () => {
  assert.deepEqual(W.pagesFor("v20").map(p => p.key), ["book", "attributes", "abilities", "powers", "backgrounds", "virtues", "meritsFlaws", "freebies", "review"]);
  assert.ok(!W.pagesFor("w20").some(p => p.key === "virtues"), "W20 has no Virtues");
  assert.ok(!W.pagesFor("orpheus").some(p => p.key === "powers"), "Orpheus has no creation powers on the totals");
  assert.equal(W.nextPage(W.pagesFor("v20"), "review", 1), "review");
  assert.equal(W.nextPage(W.pagesFor("v20"), "book", -1), "book");
});

test("the player's priorities change the count", () => {
  const v = exact();
  assert.equal(W.ledger(v, "v20").spent, 0);
  const swapped = W.ledger(v, "v20", {wizard: {order: {attributes: ["mental", "social", "physical"]}}});
  assert.equal(swapped.check.freebies.used, 20, "7 Physical dots on a tertiary 3 cost 4 x 5");
  assert.deepEqual(W.setRank(["physical", "social", "mental"], "mental", 0), ["mental", "social", "physical"]);
  assert.ok(!W.goodOrder(["physical", "physical", "mental"], W.ATTR_GROUPS));
  assert.deepEqual(W.suggestedOrder({physical: 1, social: 4, mental: 4}), ["social", "mental", "physical"]);
});

test("early pages spend only inside the allotment; the freebie page charges the book's cost", () => {
  const v = {...exact(), attributes: {physical: 6, social: 5, mental: 3}};
  const order = {wizard: {order: {attributes: ["physical", "social", "mental"]}}};
  assert.equal(W.canRaise(v, "v20", {kind: "attribute", group: "physical"}, {page: "attributes", value: 3, ...order}).ok, true);
  assert.equal(W.canRaise(v, "v20", {kind: "attribute", group: "social"}, {page: "attributes", value: 3, ...order}).ok, false);
  const fb = W.canRaise(v, "v20", {kind: "attribute", group: "social"}, {page: "freebies", value: 3, ...order});
  assert.deepEqual([fb.ok, fb.cost], [true, 5]);
  assert.equal(W.stepCost(exact(), "v20", {kind: "ability", group: "talent", above: true}), 2, "a dot past 3 costs 2");
  assert.equal(W.stepCost(exact(), "v20", {kind: "power", key: "discipline"}), 7);
  assert.equal(W.stepCost(exact(), "v20", {kind: "background"}), 1);
  assert.equal(W.stepCost(exact(), "v20", {kind: "virtue"}), 2);
  assert.equal(W.canRaise(exact(), "v20", {kind: "attribute", group: "physical"}, {page: "freebies", value: 5}).ok, false, "5 is the most");
  const broke = W.canRaise(exact(), "v20", {kind: "power", key: "discipline"}, {page: "freebies", value: 1, wizard: {other: 10}});
  assert.equal(broke.ok, false, "7 points with 5 left");
});

test("Merits cost, Flaws give up to the cap, the prelude pays its own gains", () => {
  const v = {...exact(), powers: {discipline: 5}};
  const a = W.ledger(v, "v20", {merits: 3, flaws: 9, prelude: 2});
  assert.equal(a.budget, 15 + 7 + 2);
  assert.equal(a.spent, 14 + 3);
  assert.equal(a.flawsOver, 2);
  assert.equal(a.ok, false, "Flaws past the cap");
  assert.equal(W.ledger(v, "v20", {merits: 3, flaws: 7}).ok, true);
  assert.equal(W.preludeAllowance([{kind: "reward", cost: 2, undo: {kind: "ability"}}, {kind: "reward", cost: 1, undo: {kind: "willpower"}},
    {kind: "reward", cost: 1, undone: true, undo: {kind: "background"}}, {kind: "stake"}]), 2);
  const bought = W.ledger(exact(), "v20", {wizard: {bought: {willpower: 2, road: 1, nonsense: 4}}});
  assert.equal(bought.spent, 2 * 1 + 1 * 2, "Willpower 1 each, Humanity 2");
  assert.deepEqual(bought.unspent, []);
  assert.deepEqual(W.ledger({...exact(), backgrounds: 3}, "v20").unspent, [{label: "Backgrounds", dots: 2}]);
});

test("the Mummy's Rebirth dots still soak up overage before freebies", () => {
  const v = {attributes: {physical: 8, social: 4, mental: 3}, abilities: {talent: {dots: 11, aboveCap: 0}, skill: {dots: 7, aboveCap: 0}, knowledge: {dots: 4, aboveCap: 0}}, backgrounds: 5, powers: {hekau: 3}};
  const L = W.ledger(v, "mummy", {wizard: {order: {attributes: ["physical", "social", "mental"]}}});
  assert.equal(L.check.freebies.used, 0, "2 Physical over and 2 Backgrounds over, all from the Rebirth");
  assert.equal(L.budget, 15);
});

test("pick lists: Merits by the line's kind, Backgrounds by its book, powers by clan and era", () => {
  const kin = W.meritOptions("v20", MERITS_FLAWS), garou = W.meritOptions("w20", MERITS_FLAWS);
  assert.ok(kin.length > 50 && garou.length > 50);
  assert.ok(kin.some(t => t.key === "eat-food") && !garou.some(t => t.key === "eat-food"), "Eat Food is for Kindred");
  assert.ok(kin.every(t => t.choices.length), "every cost reads");
  assert.deepEqual(W.costChoices("1-3"), [1, 2, 3]);
  assert.deepEqual(W.costChoices("2/4"), [2, 4]);
  assert.deepEqual(W.costChoices("varies"), []);
  for ( const line of Object.keys(W.BG_BOOKS) ) assert.ok(W.backgroundOptions(line, BACKGROUNDS).length >= 5, line);
  assert.ok(W.backgroundOptions("m20", BACKGROUNDS).some(b => b.name === "Avatar"));
  assert.ok(!W.backgroundOptions("v20", BACKGROUNDS).some(b => b.name === "Avatar"));
  assert.deepEqual(W.clanDisciplines("Assamite", {dark: true}), ["Auspex", "Presence", "Quietus"]);
  assert.deepEqual(W.clanDisciplines("assamite", {dark: false}), ["Celerity", "Obfuscate", "Quietus"]);
  assert.deepEqual(W.powerSuggestions("discipline", "ghoul").first, ["Potence"]);
  assert.equal(W.powerSuggestions("sphere", "m20").first.length, 9);
  assert.equal(W.extrasFor("m20").find(e => e.key === "arete").max, 3);
  assert.deepEqual(W.extrasFor("w20").map(e => e.key).sort(), ["gnosis", "rage", "willpower"]);
});

test("every line's powers have a way onto the sheet", async () => {
  const {TOTALS} = await import(join(root, "modules/wodx-creation/scripts/totals-rules.mjs"));
  for ( const [line, L] of Object.entries(TOTALS) ) for ( const p of L.powers ?? [] ) assert.ok(W.POWER_KIND[p.key], `${line} ${p.key}`);
});

test("the hub has a check after the prelude, done only when the prelude is and the build fits", () => {
  const i = R.STEP_KEYS.indexOf("recheck");
  assert.equal(i, R.STEP_KEYS.indexOf("prelude") + 1);
  assert.equal(R.autoDone({recheck: {ok: true}}).recheck, true);
  assert.equal(R.autoDone({recheck: null}).recheck, false);
  const states = R.stepStates({}, {recheck: null});
  assert.ok(R.canSignOff(states).missing.includes("Check after the prelude"));
});

test("the wizard window walks a vampire through the book and writes to the sheet", async () => {
  game.user.isGM = true;
  const a = await Actor.create({name: "Wizard Toreador", type: "Vampire", system: {clan: "Toreador"}});
  const app = await api().wizard(a);
  const act = (name, el) => app.options.actions[name].call(app, {}, el);
  assert.match(app.element.textContent, /Which book builds this character/);
  // Attributes: make Social primary, then spend a Social dot
  await act("go", {dataset: {page: "attributes"}});
  assert.ok(app.element.querySelectorAll("select[data-rank]").length === 3);
  const w0 = api().wizardLedger(a);
  assert.ok(["v20", "vtda20"].includes(w0.line), w0.line);
  const plus = [...app.element.querySelectorAll("button[data-action=step][data-d='1']")].find(b => b.dataset.path === "system.attributes.charisma.value");
  assert.ok(plus && !plus.disabled);
  await act("step", plus);
  assert.equal(a.system.attributes.charisma.value, 2);
  assert.ok(a.flags[M].wizard.order.attributes, "the priorities are saved on the first dot");
  // Disciplines: the clan's are offered and one goes on the sheet
  await act("go", {dataset: {page: "powers"}});
  assert.match(app.element.innerHTML, /Auspex|Celerity|Presence/);
  const box = app.element.querySelector(".wodx-wz-add[data-key=discipline]");
  box.querySelector("input[name=name-discipline]").value = "Presence";
  await act("addItem", box.querySelector("button[data-action=addItem]"));
  const pres = [...a.items].find(i => i.name === "Presence");
  assert.equal(pres?.system?.type, "wod.types.discipline");
  // Backgrounds and a Merit
  await act("go", {dataset: {page: "backgrounds"}});
  const bg = app.element.querySelector(".wodx-wz-add");
  bg.querySelector("input[name=name-bg]").value = "Resources";
  await act("addFeature", bg.querySelector("button[data-action=addFeature]"));
  assert.ok([...a.items].some(i => i.name === "Resources" && i.system.type === "wod.types.background"));
  await act("go", {dataset: {page: "meritsFlaws"}});
  const mf = app.element.querySelector(".wodx-wz-add");
  mf.querySelector("select[name=pick-mf]").value = "eat-food";
  await act("addFeature", mf.querySelector("button[data-action=addFeature]"));
  assert.ok([...a.items].some(i => i.name === "Eat Food" && i.system.value === 1));
  // Freebies: Willpower goes up and is in the ledger
  await act("go", {dataset: {page: "freebies"}});
  const wpBefore = a.system.advantages.willpower.permanent;
  await act("extra", {dataset: {key: "willpower", d: "1"}});
  assert.equal(a.system.advantages.willpower.permanent, wpBefore + 1);
  const L = api().wizardLedger(a);
  assert.equal(L.extras.find(e => e.key === "willpower").bought, 1);
  assert.equal(L.merits, 1);
  await act("extra", {dataset: {key: "willpower", d: "-1"}});
  assert.equal(a.system.advantages.willpower.permanent, wpBefore);
  // The last look lists what is still unspent
  await act("go", {dataset: {page: "review"}});
  assert.match(app.element.textContent, /still to spend/);
  // Removing an item
  await act("removeItem", {dataset: {item: pres.id}});
  assert.ok(![...a.items].some(i => i.name === "Presence"));
  await app.close?.();
});
