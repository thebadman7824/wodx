import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

// WoDX NPC 0.55.0 and Storyteller 0.62.0: family lines, ties after a jump in time, wills and estates (B2770-B2775).
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const imp = p => import(pathToFileURL(join(root, p)));
const K = await imp("modules/wodx-npc/scripts/kin-rules.mjs");
const TR = await imp("modules/wodx-npc/scripts/ties-rules.mjs");
const WR = await imp("modules/wodx-storyteller/scripts/will-rules.mjs");
const WORLD = await imp("modules/wodx-chronicle/scripts/world-rules.mjs");

const start = (id = "t", members = []) => K.newLine({id, founder: {id: "a", name: "Jan Novák"}, family: "Novák", year: 1240, founderBorn: 1215, members});
const namer = ({sex}) => (sex === "female" ? "Anna" : "Petr");

test("a line starts with the founder and the kin the Relationships tab knows, filled to two", () => {
  const l = start("t", [{name: "Eliška", relation: "sibling"}, {name: "Václav", relation: "child"}]);
  assert.equal(l.members[0].founder, true);
  assert.ok(l.members.some(m => m.name === "Eliška" && m.gen === 0));
  const kid = l.members.find(m => m.name === "Václav");
  assert.equal(kid.gen, 1); assert.equal(kid.parent, "m0"); assert.equal(kid.direct, true);
  const lone = start("u");
  assert.equal(lone.members.filter(m => !m.founder).length, 2, "two unnamed siblings");
});

test("growing a line is the same for the same seed, and never changes the line given", () => {
  const l = start();
  const a = K.grow(l, 1400, {nameFor: namer, dying: y => K.dyingFor(y, {})});
  const b = K.grow(l, 1400, {nameFor: namer, dying: y => K.dyingFor(y, {})});
  assert.deepEqual(a.line, b.line);
  assert.equal(l.year, 1240);
  assert.equal(a.line.year, 1400);
  assert.ok(a.events.some(e => e.kind === "birth"));
});

test("lines seldom die out, keep at most fourteen living, and stay small enough to store", () => {
  let out = 0;
  for ( let i = 0; i < 30; i++ ) {
    const r = K.grow(start(`s${i}`), 1700, {nameFor: namer, dying: y => K.dyingFor(y, {region: "moravia", sphere: "latin"})});
    const liv = K.livingAt(r.line, 1700);
    if ( !liv.length ) out++;
    assert.ok(liv.length <= K.KEEP_LIVING);
    assert.ok(JSON.stringify(r.line).length < 60000);
  }
  assert.ok(out <= 6, `${out} of 30 died out`);
});

test("the founder is never aged or killed by the line, and a member with a sheet is left alone", () => {
  const l = start("s", [{name: "Bára", relation: "sibling", actorId: "b1"}]);
  const r = K.grow(l, 1600, {nameFor: namer});
  assert.equal(r.line.members.find(m => m.founder).died, null);
  assert.equal(r.line.members.find(m => m.actorId === "b1").died ?? null, null);
});

test("life tables run from the medieval to the far future, and other ways of life start later", () => {
  assert.equal(K.lifeFor(1197).key, "medieval");
  assert.equal(K.lifeFor(1950).key, "c20");
  assert.equal(K.lifeFor(2100).key, "future");
  assert.equal(K.lifeFor(1910, "bantu").key, "industrial");
  assert.ok(K.dyingFor(1348, {sphere: "latin"}) > 0.05);
  assert.equal(K.dyingFor(1348, {sphere: "sinic"}), 0);
  assert.ok(K.dyingFor(1630, {region: "moravia", sphere: "latin"}) > 0);
  assert.equal(K.dyingFor(1630, {region: "france", sphere: "latin"}), 0);
  for ( const s of Object.keys(WORLD.SPHERES) ) assert.ok(s in K.SPHERE_SHIFT, `life shift for ${s}`);
});

test("what a member knows of an undying founder fades with the generations", () => {
  const l = start();
  assert.match(K.storyOf({gen: 1}, l, {year: 1260, undying: true}), /remembers them/);
  assert.match(K.storyOf({gen: 3}, l, {year: 1320, undying: true}), /never seemed to age/);
  assert.match(K.storyOf({gen: 5}, l, {year: 1950, undying: true}), /photographs/);
  assert.match(K.storyOf({gen: 5}, l, {year: 1400, undying: true}), /prayers/);
  assert.match(K.storyOf({gen: 9}, l, {year: 1500, undying: true}), /legend/);
  assert.equal(K.relationWord({gen: 2, direct: true}), "grandchild");
  assert.equal(K.relationWord({gen: 7, direct: true}), "5 times great-grandchild");
  assert.equal(K.relationWord({gen: 1, direct: false}), "niece or nephew");
});

test("a brought-in descendant shows as Descendant and Ancestor at both ends", () => {
  const actors = [{id: "a", name: "Jan", type: "Vampire", flags: {}}, {id: "d", name: "Petr", type: "Mortal", flags: {"wodx-npc": {kin: {founder: {id: "a", name: "Jan"}, relation: "grandchild"}}}}];
  const e = TR.edges(actors);
  assert.ok(e.some(x => x.from === "d" && x.kind === "ancestor" && x.to.id === "a"));
  assert.ok(e.some(x => x.from === "a" && x.kind === "descendant" && x.to.id === "d"));
  const t = TR.treeFor("a", e, {viewer: {gm: true}, names: {a: "Jan", d: "Petr"}});
  assert.ok(t.lines.some(L => L.key === "line" && L.down.some(n => n.id === "d")));
});

test("ties after a jump: who died, who is old, bonds fading, debts due, family lines", () => {
  const people = [{id: "pc", name: "Hero", type: "Vampire", pc: true, born: 1200, died: null, undying: true},
    {id: "w", name: "Wife", type: "Mortal", pc: false, born: 1215, died: 1270, undying: false},
    {id: "s", name: "Squire", type: "Mortal", pc: false, born: 1225, died: null, undying: false},
    {id: "r", name: "Regnant", type: "Vampire", pc: false, born: 1100, died: null, undying: true}];
  const edges = [{from: "pc", to: {id: "w", name: "Wife"}, kind: "spouse"}, {from: "pc", to: {id: "s", name: "Squire"}, kind: "retainer"}, {from: "pc", to: {id: "r", name: "Regnant"}, kind: "bondTo"}];
  const r = K.agedTies({fromYear: 1240, toYear: 1310, people, edges, due: [{from: {id: "pc"}, to: {id: "r"}, kind: "boon", what: "a minor boon"}],
    grown: [{line: {founder: {id: "pc"}}, summary: "The Novák family: 3 born."}]});
  const row = r.rows.find(x => x.actorId === "pc");
  assert.equal(r.years, 70);
  assert.ok(row.lines.some(l => /Wife \(spouse\) died in 1270/.test(l)));
  assert.ok(row.lines.some(l => /Squire .* 85/.test(l)));
  assert.ok(row.lines.some(l => /blood bond with Regnant fades/.test(l)));
  assert.ok(row.lines.some(l => /a minor boon/.test(l)));
  assert.ok(row.lines.some(l => /Novák/.test(l)));
  assert.equal(r.rows.filter(x => x.actorId === "w").length, 0, "only player characters get a report");
});

test("the law by region and year", () => {
  assert.equal(WR.lawFor("moravia", 1300).key, "eldest");
  assert.equal(WR.lawFor("moravia", 1900).key, "civil");
  assert.equal(WR.lawFor("france", 1803).key, "eldest");
  assert.equal(WR.lawFor("france", 1804).key, "civil");
  assert.equal(WR.lawFor("russia", 1920).key, "state");
  assert.equal(WR.lawFor("egypt", 1500, "islamic").key, "shares");
  assert.equal(WR.lawFor("india", 1700, "indic").key, "joint");
  assert.equal(WR.lawFor("japan", 1700, "japanese").key, "house");
  assert.equal(WR.lawFor("andes", 1400, "andean").key, "custom");
  for ( const id of Object.keys(WR.BY_REGION) ) assert.ok(WORLD.regionOf(id), `${id} is a world region`);
  for ( const s of Object.keys(WORLD.SPHERES) ) assert.ok(WR.BY_SPHERE[s], `a law for ${s}`);
});

test("estates divide to the whole, and a will is held to what the law lets it give", () => {
  const kin = {spouse: {id: "s", name: "Spouse"}, children: [{id: "d", name: "Daughter", sex: "female", born: 1280}, {id: "b", name: "Son", sex: "male", born: 1282}]};
  const sum = r => r.shares.reduce((x, s) => x + s.share, 0) + r.free;
  for ( const key of Object.keys(WR.RULES) ) {
    const r = WR.settle({law: {key, ...WR.RULES[key]}, kin});
    assert.ok(Math.abs(sum(r) - 1) < 0.01, `${key} adds to the whole`);
  }
  const eldest = WR.settle({law: WR.lawFor("moravia", 1300), kin});
  assert.equal(eldest.shares.find(s => s.id === "b").why, "the eldest takes the rest");
  assert.equal(eldest.shares.find(s => s.id === "d"), undefined);
  const shares = WR.settle({law: WR.lawFor("egypt", 1500, "islamic"), kin, will: {heirs: [{name: "The mosque", share: 1}]}});
  assert.equal(shares.shares.find(s => s.name === "The mosque").share, 0.333);
  assert.ok(shares.shares.find(s => s.id === "b").share > shares.shares.find(s => s.id === "d").share);
  const free = WR.settle({law: WR.lawFor("france", 1500), kin: {}});
  assert.equal(free.free, 1, "no heir: it goes to the lord, the Church or the state");
  const parts = WR.splitMoney(100, eldest.shares);
  assert.equal(parts.reduce((x, p) => x + p.amount, 0), 100);
  assert.equal(WR.passingsFor(39), 0); assert.equal(WR.passingsFor(120), 3);
});

test("wiring: settings, hooks, approval types, the tree's buttons and the APIs", () => {
  const kin = src("modules/wodx-npc/scripts/kin.mjs"), main = src("modules/wodx-npc/scripts/main.mjs"), people = src("modules/wodx-npc/scripts/people.mjs");
  assert.match(kin, /register\(MOD, "familyLines"/); assert.match(kin, /register\(MOD, "tiesAgeing"/);
  assert.match(kin, /Hooks\.on\("wodxSkipEnd"/);
  assert.match(main, /KIN\.registerSettings\(\);/); assert.match(main, /KIN\.listen\(\);/); assert.match(main, /kin: \{lines: KIN\.lines/);
  assert.match(people, /KIN\.treeSection\(actor\)/); assert.match(people, /KIN\.wireTree\(/);
  const st = src("modules/wodx-storyteller/scripts/main.mjs"), led = src("modules/wodx-storyteller/scripts/ledger.mjs");
  assert.match(st, /Wills\.registerHandlers\(\)/); assert.match(st, /Wills\.listen\(\)/); assert.match(st, /wills: \{of: Wills\.willOf/);
  assert.match(led, /Wills\.willHeir\(deadId\)/); assert.match(led, /Wills\.onDeath\(dead\)/);
  const atLeast = (v, w) => { const a = v.split(".").map(Number), b = w.split(".").map(Number); for ( let i = 0; i < 3; i++ ) if ( a[i] !== b[i] ) return a[i] > b[i]; return true; };
  assert.ok(atLeast(JSON.parse(src("modules/wodx-npc/module.json")).version, "0.55.0"));
  assert.ok(atLeast(JSON.parse(src("modules/wodx-storyteller/module.json")).version, "0.62.0"));
});
