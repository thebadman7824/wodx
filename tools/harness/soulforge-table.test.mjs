import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Soulforged Artifacts and relics through the shared crafting table (B3720-B3723; Ben's Item Crafting Desk) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
await imp("modules/wodx-library/scripts/wonder-lines.mjs");
const Reg = await imp("modules/wodx-library/scripts/wonder-registry.mjs");
const S = await imp("modules/wodx-actions/scripts/soulforge-rules.js");
const T = await imp("modules/wodx-storyteller/scripts/tasks-rules.mjs");
const K = Reg.kitFor("wraith");

const sheet = (o = {}) => ({system: {advantages: {pathos: {temporary: 6}, corpus: {temporary: 10, max: 10}, willpower: {permanent: 5}},
  attributes: {dexterity: {value: 3}}, abilities: {crafts: {value: 2}}}, items: [], ...o});
const wraith = (o = {}, ctx = {}) => K.makerOf({...K.factsFrom(sheet(), {profile: "wraith", year: 1700, ...ctx}), ...o});

test("the Wraith kit is registered, with its rows, its maker and its switch", () => {
  assert.ok(K, "the wraith kit");
  assert.equal(K.setting, "craftWraith");
  assert.ok(K.settingName && K.settingHint && K.ref);
  const rows = K.rows();
  assert.deepEqual(rows.map(w => w.product).sort(), ["artifact", "relic"]);
  for ( const w of rows ) {
    assert.equal(K.row(w.key), w);
    assert.equal(S.PRODUCTS[w.product].kind, "artifact", w.key);
    assert.ok(w.does && w.book === "Wraith 20th" && w.pdf === 109 && w.house, w.key);
    assert.doesNotMatch(w.does, /—/, w.key);
  }
  const m = wraith();
  assert.deepEqual([m.kind, m.pathos, m.dexterity, m.crafts, m.corpus], ["wraith", 6, 3, 2, 10]);
  assert.equal(K.listFor(m).length, 2);
  assert.equal(K.makerOf(K.factsFrom(sheet(), {profile: "lupine"})).kind, null);
  assert.equal(K.listFor(K.makerOf({profile: "mage"})).length, 0);
  assert.ok(K.makerOf(K.factsFrom(sheet({items: [{type: "Background", name: "Artificers' Guild", system: {}}]}), {profile: "wraith"})).artificer);
  assert.equal(Reg.kitFor("garou").listFor(Reg.kitFor("garou").makerOf({profile: "wraith"})).length, 0, "a wraith sees no fetishes");
});

test("the table uses the forge's own numbers, with Stygia's law before 1999", () => {
  const art = K.row("soulforged-artifact"), relic = K.row("reworked-relic");
  const t = K.taskFor(art, wraith(), {source: "soul"});
  const pl = S.plan({product: "artifact", source: "soul", year: 1700, dexterity: 3, crafts: 2});
  assert.deepEqual([t.kind, t.line, t.goal, t.diff, t.spend, t.opts.pledge, t.opts.illicit], ["soulforge", "wraith", pl.goal, pl.diff, pl.pathos, false, true]);
  const nt = T.normTask({...t, wonder: art.key});
  assert.deepEqual([nt.kind, nt.line, nt.wonder, nt.spend, nt.opts.source, nt.interval, nt.workshop, nt.delicate], ["soulforge", "wraith", art.key, pl.pathos, "soul", "week", "soulforge", true]);
  assert.equal(K.taskFor(art, wraith({artificer: true}), {}).diff, 6);
  assert.equal(K.taskFor(art, wraith(), {artificer: true}).diff, 6, "the window's Guild box wins");
  assert.equal(K.taskFor(art, wraith({}, {}), {artificer: false}).diff, 8);
  assert.equal(K.taskFor(art, wraith({}, {year: 2005}), {}).diff, 7, "no outsider penalty after the fall");
  assert.ok(T.normTask(K.taskFor(art, wraith({artificer: true}), {source: "self"})).opts.pledge);
  assert.equal(K.taskFor(relic, wraith(), {source: "soul"}).opts.source, "relic", "a relic always uses the relic");
});

test("what stops a wraith, and what the Storyteller is told", () => {
  const art = K.row("soulforged-artifact"), relic = K.row("reworked-relic");
  assert.deepEqual(K.blockers(art, wraith(), {source: "soul"}), []);
  assert.ok(K.blockers(art, wraith({pathos: 1}), {}).some(x => /Pathos/.test(x)));
  assert.ok(K.blockers(art, wraith(), {source: "self", artificer: false}).some(x => /Artificer/.test(x)));
  assert.ok(K.blockers(art, wraith({artificer: true, corpus: 1}), {source: "self"}).some(x => /Corpus/.test(x)));
  assert.deepEqual(K.blockers(relic, wraith(), {source: "soul"}), []);
  assert.ok(K.blockers(art, K.makerOf({profile: "lupine"})).some(x => /wraiths/.test(x)));
  assert.ok(K.cautions(art, wraith()).some(x => /illicit/.test(x)));
  assert.ok(!K.cautions(art, wraith({artificer: true})).some(x => /illicit/.test(x)));
  assert.ok(!K.cautions(art, wraith({}, {year: 2005})).some(x => /illicit/.test(x)));
  assert.ok(K.cautions(relic, wraith()).some(x => /hold the relic/.test(x)));
  assert.match(K.detail(art, K.taskFor(art, wraith(), {})), /Illicit/);
  assert.deepEqual(K.fields(wraith()).map(f => f.name), ["source", "artificer"]);
});

test("the finished work makes the forge's item, and the price is paid when it ends", () => {
  const art = K.row("soulforged-artifact");
  const [a] = K.itemsFor(art, {maker: "Ilse", at: 5});
  assert.deepEqual([a.type, a.name], ["Item", "Soulforged Artifact"]);
  assert.equal(a.flags["wodx-actions"].soulforged.product, "artifact");
  assert.equal(a.flags["wodx-library"].wonder.key, "soulforged-artifact");
  assert.match(a.system.description, /Ilse/);
  assert.equal(K.itemsFor(K.row("reworked-relic"))[0].name, "Reworked relic");
  const t = K.taskFor(art, wraith({artificer: true}), {source: "self"});
  const paid = Reg.applyCosts(K.costs(art, t), {"system.advantages.pathos.temporary": 6, "system.advantages.corpus.max": 10, "system.advantages.corpus.temporary": 10});
  assert.deepEqual(paid.updates, {"system.advantages.pathos.temporary": 6 - t.spend, "system.advantages.corpus.max": 9, "system.advantages.corpus.temporary": 9});
  assert.deepEqual(K.costs(art, {spend: 0, opts: {}}), []);
  assert.match(K.after({status: "ruined"})[0], /botch/i);
});

test("the forge window hands Artifacts on; a soulforge long task opens the forge", () => {
  const sf = src("modules/wodx-actions/scripts/soulforge.js");
  assert.match(sf, /kind === "artifact"\) return toTable/);
  assert.match(sf, /W\.start\(actor, key, \{ line: "wraith"/);
  assert.match(src("modules/wodx-library/scripts/wonder-lines.mjs"), /wonders-wraith\.mjs/);
  assert.match(src("modules/wodx-storyteller/scripts/tasks.mjs"), /kind === "soulforge" && game\.modules\.get\("wodx-actions"\)\?\.api\?\.soulforge/);
  for ( const f of ["modules/wodx-actions/scripts/soulforge.js", "modules/wodx-library/scripts/wonders-wraith.mjs"] ) {
    const t = src(f);
    assert.doesNotMatch(t, /—/, f);
    assert.doesNotMatch(t, /\b(he|she|him|her|his|hers|himself|herself)\b/i, f);
  }
});
