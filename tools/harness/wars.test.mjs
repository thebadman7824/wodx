import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* NPC + Storyteller: factions that go to war by themselves, mortal and supernatural wars (B2211-B2216) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const W = await import(join(root, "modules/wodx-npc/scripts/war-rules.mjs"));
const F = await import(join(root, "modules/wodx-npc/scripts/faction-rules.mjs"));
const B = await import(join(root, "modules/wodx-storyteller/scripts/battle-rules.mjs"));

const fac = (id, kind, o = {}) => F.normFaction({id, name: o.name ?? id, kind, assets: {status: 3, retainers: 3, resources: 2, domain: 1, ...(o.assets ?? {})}, places: o.places ?? [], standing: o.standing ?? {}, ...o.extra});
const st = (...fs) => F.normState({factions: fs});

test("the kind of war: hidden against hidden, or hunters against the hidden, is supernatural; else mortal", () => {
  assert.equal(W.warKind(fac("a", "kindred"), fac("b", "garou")), "supernatural");
  assert.equal(W.warKind(fac("a", "hunters"), fac("b", "kindred")), "supernatural");
  assert.equal(W.warKind(fac("a", "kindred"), fac("b", "church")), "mortal", "a hidden faction fights a mortal one through its mortal followers");
  assert.equal(W.warKind(fac("a", "mortal"), fac("b", "church")), "mortal");
});

test("a faction Hostile or worse toward a rival that holds a place may take up arms; players' factions and the busy do not", () => {
  const s = st(fac("lords", "mortal", {standing: {abbey: -3}}), fac("abbey", "church", {places: ["p1"], assets: {domain: 3}}));
  const w = W.pickWar(s, {rand: () => 0, year: 1230, places: [{id: "p1", name: "Velehrad"}]});
  assert.deepEqual([w.attacker, w.defender, w.place, w.placeName, w.kind, w.siege], ["lords", "abbey", "p1", "Velehrad", "mortal", true]);
  assert.equal(W.pickWar(s, {rand: () => 0.5, year: 1230}), null, "Hunted is 1 in 3");
  assert.equal(W.pickWar(s, {rand: () => 0, busy: new Set(["abbey"])}), null);
  const calm = st(fac("lords", "mortal", {standing: {abbey: -1}}), fac("abbey", "church", {places: ["p1"]}));
  assert.equal(W.pickWar(calm, {rand: () => 0}), null, "Distrusted is not enough");
  const theirs = st(fac("lords", "mortal", {standing: {abbey: -3}, extra: {owners: ["u1"]}}), fac("abbey", "church", {places: ["p1"]}));
  assert.equal(W.pickWar(theirs, {rand: () => 0}), null, "players give their own faction's orders");
  const noMen = st(fac("lords", "mortal", {standing: {abbey: -3}, assets: {retainers: 0}}), fac("abbey", "church", {places: ["p1"]}));
  assert.equal(W.pickWar(noMen, {rand: () => 0}), null);
});

test("forces: the book's units in the Dark Ages, men and quality later; Cainite and Garou units only in a supernatural war", () => {
  const k = fac("court", "kindred", {assets: {status: 4, retainers: 2, herd: 3}});
  const sup = W.forcesFor(k, "supernatural", {year: 1230});
  assert.ok(sup.units.cainiteCavalry >= 1 && sup.units.ghoulKnights === 3, JSON.stringify(sup.units));
  assert.ok(sup.supernatural >= 1);
  const mort = W.forcesFor(k, "mortal", {year: 1230});
  assert.ok(!mort.units.cainiteCavalry && mort.units.peasants >= 1 && mort.supernatural === 0);
  const g = W.forcesFor(fac("sept", "garou"), "supernatural", {year: 1300});
  assert.ok(g.units.garouPack >= 1);
  const late = W.forcesFor(fac("town", "mortal"), "mortal", {year: 1805, defends: true, siege: true});
  assert.deepEqual([late.men, late.quality, late.position, late.stores], [900, 3, "starfort", 42]);
  assert.equal(late.units, undefined);
  // the sides make a book battle in 1230 and a house one in 1805
  const b1 = B.normBattle({sides: [W.forcesFor(fac("a", "mortal"), "mortal", {year: 1230}), W.forcesFor(fac("b", "church"), "mortal", {year: 1230, defends: true})], war: {attacker: "a", defender: "b", place: "p", kind: "mortal", auto: true}});
  assert.equal(b1.book, true);
  assert.deepEqual([b1.war.attacker, b1.war.auto, b1.war.kind], ["a", true, "mortal"]);
  assert.equal(B.normBattle({sides: [late, late]}).book, false);
  assert.ok(W.usesPowers(k, "supernatural") && !W.usesPowers(k, "mortal") && !W.usesPowers(fac("x", "church"), "supernatural"));
});

test("after a war: the place goes to a winning attacker, and a supernatural war leaves a breach where it was fought", () => {
  const s = st(fac("court", "kindred"), fac("sept", "garou", {places: ["p1"]}));
  const won = {name: "The fight at the caern", realm: "world", over: {winner: 0, how: "rout"}, phases: [{kind: "phase"}], war: {attacker: "court", defender: "sept", place: "p1", kind: "supernatural"}};
  const ch = W.warChanges(s, won);
  assert.deepEqual(ch.find(c => c.op === "place"), {op: "place", place: "p1", from: "sept", to: "court"});
  assert.equal(ch.find(c => c.op === "breach").faction, "sept", "the beaten side's flight is what is seen");
  const mortal = W.warChanges(s, {...won, war: {...won.war, kind: "mortal"}, over: {winner: 1, how: "rout"}});
  assert.deepEqual(mortal, [], "a mortal war the attacker lost changes no place and breaks no Masquerade");
  assert.equal(W.warChanges(s, {...won, realm: "umbra"}).some(c => c.op === "breach"), false);
  assert.ok(F.BIG_OPS.has("place"), "the place waits for the Storyteller");
});

test("the wiring: NPC runs the wars after each faction turn, quietly, and stops where the characters are", () => {
  const src = readFileSync(join(root, "modules/wodx-npc/scripts/factions.mjs"), "utf8");
  assert.match(src, /setting\("factionWars"\) !== false \) await warTurn/);
  assert.match(src, /WR\.warChanges\(s, battle\)/);
  assert.match(src, /auto: !near/);
  assert.match(src, /quiet: true/);
  const bt = readFileSync(join(root, "modules/wodx-storyteller/scripts/battles.mjs"), "utf8");
  assert.match(bt, /if \( !quiet \) await cards/);
});

test("a test can keep the war step to its own factions", () => {
  const s = st(fac("lords", "mortal", {standing: {abbey: -3}}), fac("abbey", "church", {places: ["p1"]}));
  assert.equal(W.pickWar(s, {rand: () => 0, only: new Set(["other"])}), null);
  assert.equal(W.pickWar(s, {rand: () => 0, only: new Set(["lords", "abbey"])}).attacker, "lords");
});
