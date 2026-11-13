import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";
import {installActors} from "./actors-mock.mjs";

/* WoDX Creation 0.26.0: the Traits that follow from the others, in the wizard (B3000 to B3004) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
await installActors(root);
globalThis.canvas = {tokens: {controlled: []}};
const M = "wodx-creation";
await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await import(join(root, "modules/wodx-creation/scripts/main.mjs"));
game.modules.set(M, {});
const api = () => game.modules.get(M).api;
const D = await import(join(root, "modules/wodx-creation/scripts/derived-rules.mjs"));
const {TOTALS} = await import(join(root, "modules/wodx-creation/data/creation-totals.mjs"));

test("ready", async () => {
  await Hooks.callAll("init");
  mock.setupTime();
  await Hooks.callAll("ready");
  await mock.settle();
  assert.equal(typeof api().derived, "function");
});

const V = (o = {}) => ({advantages: {virtues: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, {permanent: v, isvisible: true}]))}});
const row = (d, key) => d.rows.find(r => r.key === key);

test("Kindred: Humanity from Conscience and Self-Control, a Path from Conviction and Instinct, Willpower from Courage", () => {
  const d = D.derivedTraits("v20", V({conscience: 3, selfcontrol: 2, courage: 4}));
  assert.equal(row(d, "road").want, 5);
  assert.equal(row(d, "willpower").want, 4);
  const p = D.derivedTraits("v20", V({conviction: 2, instinct: 3, courage: 2}));
  assert.equal(row(p, "road").want, 5);
  assert.match(row(p, "road").how, /Conviction \+ Instinct/);
  const da = D.derivedTraits("vtda20", V({conscience: 1, selfcontrol: 4, courage: 2}));
  assert.equal(row(da, "road").label, "Road");
  assert.equal(row(da, "road").want, 5);
  assert.equal(row(da, "road").set["system.advantages.path.value"], 5);
});

test("freebie dots and the prelude's Willpower go on top", () => {
  const d = D.derivedTraits("v20", V({conscience: 2, selfcontrol: 2, courage: 3}), {bought: {willpower: 2, road: 1}, prelude: 1});
  assert.equal(row(d, "willpower").want, 6);
  assert.equal(row(d, "road").want, 5);
  assert.match(row(d, "willpower").how, /2 bought with freebies.*1 from the prelude/);
});

test("Garou: Rage by auspice, Gnosis by breed, Willpower by tribe; unknown ones wait", () => {
  const d = D.derivedTraits("w20", {auspice: "Ahroun", breed: "Lupus", tribe: "Bone Gnawers"});
  assert.deepEqual(["rage", "gnosis", "willpower"].map(k => row(d, k).want), [5, 5, 4]);
  const pc = D.derivedTraits("w20", {bio: {splatfields: {auspice: {value: "Theurge"}, breed: {value: "Metis"}, tribe: {value: "Fianna"}}}});
  assert.deepEqual(["rage", "gnosis", "willpower"].map(k => row(pc, k).want), [2, 3, 3]);
  const none = D.derivedTraits("w20", {});
  assert.equal(row(none, "rage").want, null);
  assert.match(row(none, "rage").how, /auspice/);
  assert.equal(D.derivedTraits("daw", {tribe: "Fenrir"}).rows.find(r => r.key === "willpower").want, 3);
});

test("Mage, Wraith, Changeling, Demon and Mummy starts", () => {
  const m = D.derivedTraits("m20", {}, {backgrounds: {avatar: 3}});
  assert.deepEqual(["arete", "willpower", "quintessence"].map(k => row(m, k).want), [1, 5, 3]);
  const w = D.derivedTraits("wr20", {}, {backgrounds: {memoriam: 2}});
  assert.deepEqual(["corpus", "pathos", "willpower"].map(k => row(w, k).want), [10, 7, 5]);
  const c = D.derivedTraits("c20", {});
  assert.deepEqual(["willpower", "glamour", "banality"].map(k => row(c, k).want), [4, 4, 3]);
  assert.deepEqual(["willpower", "glamour"].map(k => row(D.derivedTraits("c20", {seeming: "Childling"}), k).want), [4, 5]);
  assert.deepEqual(["willpower", "glamour"].map(k => row(D.derivedTraits("c20", {seeming: "Grump"}), k).want), [5, 4]);
  assert.match(D.derivedTraits("c20", {seeming: "Wilder"}).notes.join(" "), /wilder adds 1/);
  assert.equal(row(D.derivedTraits("demon", {house: "Devils"}), "torment").want, 4);
  assert.equal(row(D.derivedTraits("demon", {house: "Defilers"}), "torment").want, 3);
  assert.equal(row(D.derivedTraits("daw", {tribe: "Children of Gaia"}), "willpower").want, 3);
  assert.equal(row(D.derivedTraits("w20", {tribe: "Children of Gaia"}), "willpower").want, 4);
  const dm = D.derivedTraits("demon", {house: "Slayers", ...V({conscience: 2, conviction: 4, courage: 3})});
  assert.deepEqual(["faith", "torment", "willpower"].map(k => row(dm, k).want), [3, 4, 7]);
  const mu = D.derivedTraits("mummy", {advantages: {balance: {permanent: 2}}});
  assert.deepEqual(["balance", "sekhem", "willpower"].map(k => row(mu, k).want), [2, 2, 5]);
});

test("every line gives rows or notes, and the sheet value is read back", () => {
  for ( const id of Object.keys(TOTALS) ) {
    const d = D.derivedTraits(id, {});
    assert.ok(d.rows.length || d.notes.length, id);
    assert.ok(d.ref, id);
  }
  const d = D.derivedTraits("w20", {auspice: "Ragabash", advantages: {rage: {permanent: 1}}});
  assert.equal(row(d, "rage").have, 1);
  assert.equal(row(d, "rage").off, false);
  assert.deepEqual(D.startingBlood("vtda20", {backgrounds: {domain: 1, herd: 2}}), {roll: 1, plus: 3, how: "One die + Domain + Herd"});
  assert.equal(D.startingBlood("ghoul").plus, 1);
  assert.equal(D.startingBlood("m20"), null);
});

test("the wizard's Virtues page sets the derived Traits on the sheet", async () => {
  game.user.isGM = true;
  const a = await Actor.create({name: "Derived Brujah", type: "Vampire", system: {clan: "Brujah"}});
  await a.update({"system.advantages.virtues.conscience.permanent": 3, "system.advantages.virtues.selfcontrol.permanent": 3, "system.advantages.virtues.courage.permanent": 4});
  const app = await api().wizard(a, "virtues");
  const act = (name, el) => app.options.actions[name].call(app, {}, el);
  assert.match(app.element.textContent, /Traits that follow from the others/);
  assert.ok(api().derived(a).rows.some(r => r.off));
  await act("derive", {dataset: {key: ""}});
  assert.equal(a.system.advantages.path.permanent, 6);
  assert.equal(a.system.advantages.willpower.permanent, 4);
  assert.ok(api().derived(a).rows.every(r => !r.off));
  await act("go", {dataset: {page: "review"}});
  assert.doesNotMatch(app.element.textContent, /the book gives/);
  await a.update({"system.advantages.willpower.permanent": 2});
  app.render();
  await act("go", {dataset: {page: "review"}});
  assert.match(app.element.textContent, /Willpower: the sheet has 2, the book gives 4/);
  await app.close();
});

/* WoDX Creation 0.29.0: short Trait explanations (B3007 to B3009) */
const T = await import(join(root, "modules/wodx-creation/data/trait-notes.mjs"));

test("Trait notes: the player view's help comes first, the wizard's own notes fill the rest", () => {
  const help = label => (/^strength$/i.test(label) ? "From the sheet help." : "");
  assert.equal(T.traitNote("Strength", "v20", {help}).text, "From the sheet help.");
  assert.match(T.traitNote("Torment", "demon", {help}).text, /Abyss/);
  assert.match(T.traitNote("Sekhem", "mummy").text, /Hekau/);
  assert.equal(T.traitNote("Nothing Here", "v20").text, "");
  assert.equal(T.traitNote("Torment", "demon", {help: () => { throw new Error("x"); }}).text.length > 0, true);
  for ( const [k, v] of Object.entries(T.NOTES) ) {
    assert.equal(k, T.noteKey(k), k);
    assert.ok(v.length < 160 && !/—/.test(v), k);
  }
  for ( const [line, refs] of Object.entries(T.REFS) ) {
    assert.ok(TOTALS[line], line);
    for ( const r of Object.values(refs) ) assert.match(r, /^pdf \d+/);
  }
});

test("the wizard shows what a Mummy's Balance and Sekhem mean", async () => {
  const a = await Actor.create({name: "Notes Mummy", type: "Mummy", system: {}});
  const app = await api().wizard(a, "review");
  const html = app.element.innerHTML;
  await app.close();
  assert.equal(api().wizardLedger(a).line, "mummy");
  assert.match(html, /What these mean[\s\S]*Sekhem<\/dt><dd>The life force/);
});
