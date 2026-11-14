import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Making each line's supernatural items: fetishes, klaives, talens, Fera fetishes, Kinfolk (B3630-B3636) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const W = await imp("modules/wodx-library/scripts/wonder-rules.mjs");
const T = await imp("modules/wodx-storyteller/scripts/tasks-rules.mjs");

const garou = (o = {}) => W.makerOf({profile: "lupine", gnosis: 5, willpower: 6, rituals: 3, rites: ["Rite of the Fetish", "Rite of Binding"], ...o});

test("wonders: every row is complete, with a court the spirits system knows and a page", () => {
  const courts = ["bird", "beast", "elemental", "wyld", "weaver", "wyrm", "totem"];
  const keys = new Set();
  for ( const w of W.WONDERS ) {
    assert.ok(!keys.has(w.key), `duplicate ${w.key}`); keys.add(w.key);
    assert.ok(["fetish", "talen"].includes(w.kind), w.key);
    assert.ok(w.gnosis >= 1 && w.gnosis <= 10, w.key);
    if ( w.kind === "fetish" ) assert.ok(w.level >= 1 && w.level <= 5, w.key);
    assert.ok(courts.includes(w.court), `${w.key} court ${w.court}`);
    assert.ok(w.spirit && w.does && w.book && w.pdf, w.key);
    assert.ok(!/—/.test(w.does + w.spirit), `${w.key}: em-dash`);
    assert.ok(W.LINES[w.line], w.key);
  }
  assert.ok(W.WONDERS.filter(w => w.kind === "fetish" && !w.breeds).length >= 25);
  assert.ok(W.WONDERS.filter(w => w.kind === "talen").length >= 9);
});

test("wonders: klaive and grand klaive follow W20 (Gnosis, damage, difficulty, silver)", () => {
  const k = W.byKey.klaive, g = W.byKey["grand-klaive"];
  assert.equal(k.level, 4); assert.equal(k.gnosis, 6); assert.equal(k.silver, 1);
  assert.deepEqual([k.weapon.bonus, k.weapon.type, k.weapon.diff], [2, "aggravated", 6]);
  assert.equal(g.level, 5); assert.equal(g.gnosis, 7); assert.equal(g.silver, 2);
  assert.deepEqual([g.weapon.bonus, g.weapon.type, g.weapon.diff], [3, "aggravated", 7]);
  assert.match(k.spirit, /war/);
});

test("wonders: who may make them, and what stops them", () => {
  const w = W.byKey.klaive;
  assert.deepEqual(W.blockers(w, garou()), []);
  assert.ok(W.blockers(w, garou({rites: []})).some(x => /Rite of the Fetish/.test(x)));
  assert.ok(W.blockers(w, garou({rituals: 2})).some(x => /Rituals 3/.test(x)));
  assert.ok(W.blockers(w, garou(), {spend: 9}).some(x => /has 5/.test(x)));
  assert.ok(W.blockers(W.byKey["bane-arrow"], garou(), {spend: 0}).some(x => /at least 1 Gnosis/.test(x)));
  // a mortal can't; Kinfolk can't by the books (B3680) unless craftKinfolk keeps the house reading; never without Gnosis
  assert.equal(W.makerOf({profile: "mortal", gnosis: 2}).kind, null);
  assert.equal(W.makerOf({profile: "mortal", kinfolk: "Fianna", gnosis: 1}).kind, null);
  assert.equal(W.makerOf({profile: "mortal", kinfolk: "Fianna", kinfolkMay: true, gnosis: 1}).kind, "kinfolk");
  assert.equal(W.makerOf({profile: "mortal", kinfolk: "Fianna", gnosis: 0}).kind, null);
  assert.ok(W.MAKERS.kinfolk.house);
});

test("wonders: the lists by breed and year", () => {
  const g = W.listFor(garou(), {year: 1300});
  assert.ok(g.some(w => w.key === "klaive"));
  assert.ok(!g.some(w => w.breeds), "Garou don't see breed fetishes");
  assert.ok(!g.some(w => w.key === "puda"), "no digital device in 1300");
  assert.ok(W.listFor(garou(), {year: 2000}).some(w => w.key === "puda"));
  const mok = W.listFor(garou({breed: "Mokolé"}), {year: 1300});
  assert.ok(mok.some(w => w.key === "blade-of-the-kings") && mok.some(w => w.key === "klaive"));
  assert.ok(!mok.some(w => w.key === "pipes-of-the-swarm"));
  assert.deepEqual(W.listFor(W.makerOf({profile: "mage"})), []);
});

test("wonders: difficulty and the task (cleansing, one roll, delicate, Willpower for talens)", () => {
  const k = W.byKey.klaive;
  assert.equal(W.difficulty(k, {}), 10);
  assert.equal(W.difficulty(k, {spend: 2}), 6);
  assert.equal(W.difficulty(k, {spend: 2, persuasion: 2, court: 1}), 5);
  assert.equal(W.difficulty(k, {spend: 5}), 2);
  const t = T.normTask(W.taskFor(k, garou(), {spend: 1}));
  assert.equal(t.kind, "fetish"); assert.equal(t.wonder, "klaive"); assert.equal(t.diff, 8); assert.equal(t.goal, 1);
  assert.equal(t.delay, 3); assert.ok(t.delicate); assert.equal(t.spend, 1);
  const b = W.byKey["bane-arrow"];
  assert.equal(W.difficulty(b, {spend: 1}), 3);
  const tb = T.normTask(W.taskFor(b, garou(), {spend: 1, strength: "jaggling"}));
  assert.equal(tb.pool, "willpower"); assert.equal(tb.delay, 0); assert.equal(tb.power, "jaggling");
  // recipes keep their own strength flag
  assert.equal(T.normTask({strength: true}).strength, true);
});

test("wonders: items made (fetish plus weapon, talens by successes, silver carried)", () => {
  const [f, wpn] = W.itemsFor(W.byKey.klaive, {spirit: "a war-spirit of Griffin's brood", at: 100});
  assert.equal(f.type, "Fetish"); assert.equal(f.system.gnosis, 6); assert.equal(f.system.type, "wod.types.fetish");
  assert.equal(f.flags["wodx-library"].wonder.key, "klaive");
  assert.match(f.system.description, /Griffin/);
  assert.equal(wpn.type, "Melee Weapon"); assert.equal(wpn.system.damage.bonus, 2); assert.equal(wpn.system.damage.type, "aggravated");
  assert.deepEqual(W.silverCarried([f, wpn]), {klaive: 1, grand: 0});
  const [gk, gw] = W.itemsFor(W.byKey["grand-klaive"], {at: 200});
  assert.deepEqual(W.silverCarried([f, wpn, gk, gw]), {klaive: 1, grand: 1});
  assert.equal(W.itemsFor(W.byKey["harmony-flute"]).length, 1);
  const tal = W.itemsFor(W.byKey["bane-arrow"], {successes: 3});
  assert.equal(tal.length, 3);
  assert.equal(tal[0].flags["wodx-actions"].talen, true); assert.equal(tal[0].system.type, "wod.types.talen");
  assert.equal(W.itemsFor(W.byKey["bane-arrow"], {successes: 2, strength: "greater"}).length, 5);
  assert.equal(W.talenCount(0, "greater"), 0);
});

test("wonders: player characters' gender never blocks the labrys", () => {
  assert.deepEqual(W.cautions(W.byKey["labrys-of-isthmene"], garou({gender: ""})).filter(c => /male/.test(c)), []);
  assert.ok(W.cautions(W.byKey["labrys-of-isthmene"], garou({gender: "male"})).some(c => /male/.test(c)));
});

test("wonders: Storyteller wiring (fetish kind opens the picker, approval, finish on task end)", () => {
  const t = src("modules/wodx-storyteller/scripts/tasks.mjs");
  assert.match(t, /kind === "fetish" && W\.available\(a\)/);
  assert.match(t, /t\.pool === "willpower"/);
  assert.match(t, /t\.delay \* R\.DAY/);
  const w = src("modules/wodx-storyteller/scripts/wonders.mjs");
  assert.match(w, /wodxTaskDone/);
  assert.match(w, /registerHandler\?\.\(T_WONDER/);
  const m = src("modules/wodx-storyteller/scripts/main.mjs");
  assert.match(m, /Wonders\.registerWonderApproval\(\)/);
  assert.match(m, /Wonders\.registerWonderHooks\(\)/);
  const lib = src("modules/wodx-library/scripts/main.mjs");
  assert.match(lib, /"craftGarou"/);
  assert.match(lib, /api\.wonders/);
});

test("wonders: carried silver lowers a shapechanger's Gnosis dice for fetishes and spirits (WoDX Actions)", () => {
  const g = src("modules/wodx-actions/scripts/garou.js");
  assert.match(g, /export function silverPenalty\(actor\)/);
  assert.match(g, /banesOf\(actor\)\.includes\("silver"\)/);
  assert.match(g, /rollPool\(effectiveGnosis\(actor\), gn\)/);
});

test("wonders: Bane fetishes and the baneklaive (W20 Book of the Wyrm pdf 184-185) are for Black Spiral Dancers alone", () => {
  const b = W.byKey.baneklaive;
  assert.equal(b.level, 5); assert.equal(b.gnosis, 7); assert.equal(b.silver, 2); assert.equal(b.court, "wyrm"); assert.ok(b.wyrm);
  assert.deepEqual([b.weapon.bonus, b.weapon.type, b.weapon.diff], [3, "aggravated", 7]);
  assert.equal(W.byKey.devilwhip.weapon.bonus, 1);
  const bane = ["brush-of-the-ancients", "stolen-eye", "bane-lantern", "devilwhip", "wyrmflesh", "baneklaive"];
  for ( const k of bane ) assert.ok(W.byKey[k]?.wyrm, k);
  const bsd = garou({tribe: "Black Spiral Dancers"});
  assert.equal(bsd.kind, "spiral");
  const sl = W.listFor(bsd).map(w => w.key);
  assert.deepEqual([...sl].sort(), [...bane].sort(), "a Spiral sees only the Bane fetishes");
  assert.ok(!W.listFor(garou()).some(w => w.wyrm), "a Gaian sees none of them");
  assert.ok(W.blockers(b, garou()).some(x => /Wyrm/.test(x)));
  assert.ok(W.blockers(W.byKey.klaive, bsd).some(x => /Banes/.test(x)));
  assert.deepEqual(W.blockers(b, bsd, {spend: 1}), []);
  assert.ok(W.cautions(W.byKey.wyrmflesh, bsd).some(c => /living victim/.test(c)));
  const [f, wpn] = W.itemsFor(b, {at: 5});
  assert.equal(f.system.gnosis, 7); assert.equal(wpn.system.damage.bonus, 3);
  assert.deepEqual(W.silverCarried([f, wpn]), {klaive: 0, grand: 1});
  assert.equal(W.isSpiral("wod.tribes.blackspiraldancers"), true);
  assert.equal(W.isSpiral("Silver Fangs"), false);
});

test("wonders: Kinfolk making is a world setting, off by default (WoDX Library, B3680)", () => {
  const lib = src("modules/wodx-library/scripts/main.mjs");
  assert.match(lib, /"craftKinfolk"[\s\S]*?default: false/);
  assert.match(src("modules/wodx-storyteller/scripts/wonders.mjs"), /kinfolkMay/);
});
