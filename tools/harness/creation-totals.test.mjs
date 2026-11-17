import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";
import {installActors} from "./actors-mock.mjs";

/* Creation totals by book, death into a wraith and the Awakening (WoDX Creation 0.8.0) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
await installActors(root);
globalThis.canvas = {tokens: {controlled: []}};
const M = "wodx-creation";
await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await import(join(root, "modules/wodx-creation/scripts/main.mjs"));
game.modules.set(M, {});
const api = () => game.modules.get(M).api;
const R = await import(join(root, "modules/wodx-creation/scripts/totals-rules.mjs"));
const {defaultLine} = await import(join(root, "modules/wodx-creation/data/creation-totals.mjs"));

test("ready", async () => {
  await Hooks.callAll("init");
  mock.setupTime();
  await Hooks.callAll("ready");
  await mock.settle();
  assert.ok(api().deathToWraith && api().awaken && api().check && api().totals);
});

test("every book's totals are whole and carry page refs", () => {
  for ( const [k, t] of Object.entries(R.TOTALS) ) {
    assert.equal(t.attributes.length, 3, k);
    assert.equal(t.abilities.length, 3, k);
    assert.match(t.ref, /pdf \d+.*printed \d+/, k);
    assert.match(t.costRef, /pdf \d+ \/ printed \d+/, k);
    assert.ok(t.freebies > 0 && t.costs.attribute === 5 && t.costs.ability === 2, k);
  }
  assert.deepEqual([R.TOTALS.v20.powers[0].dots, R.TOTALS.vtda20.powers[0].dots], [3, 4], "V20 3 Disciplines, Dark Ages 4");
  assert.equal(R.TOTALS.m20.backgrounds, 7);
  assert.equal(R.TOTALS.ghoul.freebies, 21);
  assert.deepEqual(R.TOTALS.ghoul.attributes, [6, 4, 3]);
  assert.equal(defaultLine("Vampire", {eraId: "dark-ages"}), "vtda20");
  assert.equal(defaultLine("Mortal", {variant: "ghoul"}), "ghoul");
  assert.equal(defaultLine("Werewolf", {eraId: "modern"}), "w20");
});

// B6443: the book check of 15 November 2026 pins every line's figures, read again on the cited pages
const BOOK = {
  v20: {a: [7, 5, 3], b: [13, 9, 5], bg: 5, p: [3], v: 7, f: 15, c: {attribute: 5, ability: 2, discipline: 7, background: 1, virtue: 2, road: 2, willpower: 1}},
  vtda20: {a: [7, 5, 3], b: [13, 9, 5], bg: 5, p: [4], v: 7, f: 15, c: {discipline: 7, bloodPath: 4, virtue: 2, road: 2, willpower: 1}},
  w20: {a: [7, 5, 3], b: [13, 9, 5], bg: 5, p: [3], f: 15, c: {gift: 7, rage: 1, gnosis: 2, willpower: 1}},
  daw: {a: [7, 5, 3], b: [13, 9, 5], bg: 5, p: [3], f: 15, c: {gift: 7, rage: 1, gnosis: 2, willpower: 1}},
  m20: {a: [7, 5, 3], b: [13, 9, 5], bg: 7, p: [6], f: 15, c: {sphere: 7, arete: 4, willpower: 1, quintessence: 0.25}},
  dam: {a: [7, 5, 3], b: [13, 9, 5], bg: 5, p: [3], f: 15, c: {foundation: 5, pillar: 3, willpower: 1}},
  wr20: {a: [7, 5, 3], b: [13, 9, 5], bg: 7, p: [5, 10, 10], f: 15, c: {arcanoi: 5, passion: 2, fetter: 1, willpower: 2, pathos: 0.5}},
  c20: {a: [7, 5, 3], b: [13, 9, 5], bg: 5, p: [3, 5], f: 15, c: {art: 5, realm: 2, glamour: 3, willpower: 1}},
  dafae: {a: [7, 5, 3], b: [13, 9, 5], bg: 5, p: [2], f: 15, c: {dominion: 7, willpower: 2, weaving: 4}},
  htr: {a: [6, 4, 3], b: [11, 7, 4], bg: 5, p: [3], f: 21, c: {willpower: 1, conviction: 1}},
  demon: {a: [7, 5, 3], b: [13, 9, 5], bg: 5, p: [3], v: 3, f: 15, c: {lore: 7, faith: 6, virtue: 2, willpower: 1}},
  kote: {a: [7, 5, 3], b: [13, 9, 5], bg: 5, p: [3], f: 15, c: {martialArts: 3, discipline: 10, chi: 3, hun: 3, po: 1, willpower: 1}},
  mummy: {a: [6, 4, 3], b: [11, 7, 4], bg: 3, p: [3], f: 5, c: {hekau: 5, balance: 4, sekhem: 1, spell: 1, ritual: 1, willpower: 1}},
  orpheus: {a: [6, 4, 3], b: [11, 7, 4], bg: 4, p: [], f: 15, c: {horror: 7, otherHorror: 10, vitality: 5, willpower: 3}}
};

test("each book's totals and costs match the book check", () => {
  for ( const [k, e] of Object.entries(BOOK) ) {
    const t = R.TOTALS[k];
    assert.deepEqual([t.attributes, t.abilities, t.backgrounds, t.freebies], [e.a, e.b, e.bg, e.f], k);
    assert.deepEqual(t.powers.map(p => p.dots), e.p, `${k} powers`);
    assert.equal(t.virtues, e.v, `${k} virtues`);
    assert.equal(t.abilityCap, 3, k);
    assert.equal(t.costs.background, 1, k);
    for ( const [c, v] of Object.entries(e.c) ) assert.equal(t.costs[c], v, `${k} ${c}`);
  }
  assert.deepEqual(R.TOTALS.mummy.rebirth, {attributes: 2, abilities: 5, backgrounds: 2, freebies: 10}, "the Rebirth adds 2, 5, 2 and 10 freebies");
  assert.match(R.TOTALS.kote.costRef, /pdf 71 \/ printed 79/);
  assert.match(R.TOTALS.mummy.costRef, /pdf 52 \/ printed 56/);
  assert.match(R.TOTALS.orpheus.costRef, /pdf 125 \/ printed 124/);
});

test("assign gives the largest allotment to the fullest group", () => {
  const rows = R.assign({physical: 3, social: 8, mental: 5}, [7, 5, 3]);
  assert.deepEqual(rows.map(r => [r.group, r.allowed, r.over]), [["social", 7, 1], ["mental", 5, 0], ["physical", 3, 0]]);
});

test("a V20 sheet on its totals spends no freebies; extra dots cost the book's price", () => {
  const exact = {attributes: {physical: 7, social: 5, mental: 3}, abilities: {talent: {dots: 13, aboveCap: 0}, skill: {dots: 9, aboveCap: 0}, knowledge: {dots: 5, aboveCap: 0}},
    backgrounds: 5, powers: {discipline: 3}, virtues: 7};
  const a = R.checkCreation(exact, "v20");
  assert.equal(a.freebies.used, 0);
  assert.ok(a.ok);
  const more = {...exact, attributes: {physical: 8, social: 5, mental: 3}, abilities: {...exact.abilities, talent: {dots: 13, aboveCap: 1}}, powers: {discipline: 4}};
  const b = R.checkCreation(more, "v20");
  assert.equal(b.freebies.used, 5 + 2 + 7, "an Attribute 5, an Ability dot past 3 2, a Discipline 7");
  assert.equal(b.freebies.left, 1);
  const c = R.checkCreation({...more, powers: {discipline: 8}}, "v20");
  assert.equal(c.ok, false, "past the freebies and the Flaws");
});

test("Mummy counts the Rebirth's extra dots; hand-counted powers are marked", () => {
  const v = {attributes: {physical: 7, social: 5, mental: 3}, abilities: {talent: {dots: 13, aboveCap: 0}, skill: {dots: 7, aboveCap: 0}, knowledge: {dots: 4, aboveCap: 1}},
    backgrounds: 5, powers: {hekau: 3}};
  const r = R.checkCreation(v, "mummy");
  assert.equal(r.freebies.used, 0, "2 Attribute and 5 Ability dots come with the Rebirth");
  assert.equal(r.freebies.allowed, 15);
  const d = R.checkCreation({...v, powers: {pillar: null}}, "dam");
  assert.equal(d.rows.find(x => x.label === "Pillars").have, null);
});

test("Angst: ones do not cancel, at least 1, never above Willpower", () => {
  assert.equal(R.angstFrom([1, 1, 2, 3, 4], 5), 1);
  assert.equal(R.angstFrom([6, 7, 1, 1, 10], 5), 3);
  assert.equal(R.angstFrom([6, 7, 8, 9, 10, 10], 4), 4);
  assert.equal(R.pathosStart(3), 8);
  assert.equal(R.pathosStart(9), 10);
  assert.deepEqual(R.wraithStart({willpower: 3, memoriam: 2}).willpower, 5);
  assert.deepEqual(R.wraithStart({willpower: 7}).willpower, 7);
});

test("leaving the Caul", () => {
  const s = R.caul("self", {dice: [4, 5, 1, 2]});
  assert.deepEqual([s.successes, s.extraPathos, s.freed], [1, 1, true]);
  const r = R.caul("reaper", {dice: [7, 2], memoriam: 2});
  assert.deepEqual([r.difficulty, r.freed, r.reaperPathos], [7, true, 4]);
  assert.equal(R.caul("reaper", {dice: [9], memoriam: 9}).difficulty, 2);
  assert.equal(R.caul("harvest").freed, true);
});

test("death into a wraith keeps the mortal's Traits and links the sheets", async () => {
  const mortal = await Actor.create({name: "Ilse", type: "Mortal", system: {}});
  mortal.system.attributes.wits.value = 4;
  mortal.system.abilities.alertness.value = 3;
  mortal.system.advantages.willpower.permanent = 4;
  mortal.system.nature = "Caregiver";
  const w = await api().deathToWraith(mortal, {memoriam: 2, caulWay: "self", angstDice: [6, 6, 2, 1, 1], caulDice: [4, 4, 9, 1, 3]});
  assert.equal(w.type, "Wraith");
  assert.equal(w.system.attributes.wits.value, 4);
  assert.equal(w.system.abilities.alertness.value, 3);
  assert.equal(w.system.nature, "Caregiver");
  assert.equal(w.system.advantages.corpus.permanent, 10);
  assert.equal(w.system.advantages.angst.permanent, 2);
  assert.equal(w.system.advantages.willpower.permanent, 5);
  assert.equal(w.system.advantages.willpower.temporary, 4, "1 Willpower spent on the Caul");
  assert.equal(w.system.advantages.pathos.temporary, 7 + 2, "5 + Memoriam, plus 2 from the Caul");
  assert.ok([...w.items.values()].some(i => i.name === "Memoriam" && i.system.value === 2));
  assert.equal(w.flags[M].lineage.formerly.id, mortal.id);
  assert.equal(mortal.flags[M].lineage.became.id, w.id);
  assert.ok(w.flags[M].chronology.died !== undefined);
  await assert.rejects(() => api().deathToWraith(mortal, {}), /not a living mortal/);
});

test("the Awakening: Arete 1, the Affinity Sphere, Avatar and Quintessence", async () => {
  const mortal = await Actor.create({name: "Matthias", type: "Mortal", system: {}});
  mortal.system.advantages.willpower.permanent = 3;
  mortal.system.abilities.occult.value = 2;
  await mortal.createEmbeddedDocuments("Item", [{name: "Resources", type: "Feature", system: {type: "wod.types.background", value: 2}}]);
  const m = await api().awaken(mortal, {affinity: "forces", paradigm: "Hermetic", practice: "High Ritual Magick"});
  assert.equal(m.type, "Mage");
  assert.equal(m.system.advantages.arete.permanent, 1);
  assert.equal(m.system.spheres.forces.value, 1);
  assert.equal(m.system.quintessence.permanent, 1);
  assert.equal(m.system.advantages.willpower.permanent, 3, "Willpower stays");
  assert.equal(m.system.abilities.occult.value, 2);
  const items = [...m.items.values()];
  assert.ok(items.some(i => i.name === "Avatar" && i.system.value === 1));
  assert.ok(items.some(i => i.name === "Resources" && i.system.value === 2));
  assert.equal(m.system.focus.paradigm, "Hermetic");
  const {lineFor} = await import(join(root, "modules/wodx-creation/scripts/totals-check.mjs"));
  assert.equal(lineFor(m), "m20", "an Awakened mage is checked by M20 in any era");
  assert.throws(() => R.awakenStart({affinity: "nope"}), /Affinity/);
});

test("the creation check reads a sheet", async () => {
  const {totalsView} = await import(join(root, "modules/wodx-creation/scripts/totals-check.mjs"));
  const v = await Actor.create({name: "Check", type: "Vampire", system: {}});
  v.system.attributes.strength.value = 3;
  v.system.abilities.brawl.value = 4;
  await v.createEmbeddedDocuments("Item", [{name: "Potence", type: "Power", system: {type: "wod.types.discipline", value: 2}},
    {name: "Herd", type: "Feature", system: {type: "wod.types.background", value: 3}}]);
  const view = totalsView(v, "v20");
  assert.equal(view.attributes.physical, 2);
  assert.equal(view.abilities.talent.dots, 3);
  assert.equal(view.abilities.talent.aboveCap, 1);
  assert.equal(view.powers.discipline, 2);
  assert.equal(view.backgrounds, 3);
  const r = R.checkCreation(view, "v20");
  assert.ok(r.rows.length >= 8);
});
