import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import * as RV from "../../modules/wodx-npc/scripts/rivalry-rules.mjs";
import * as NR from "../../modules/wodx-npc/scripts/npc-rules.mjs";
import * as R from "../../modules/wodx-npc/scripts/routine-rules.mjs";
import * as S from "../../modules/wodx-combat/scripts/start-rules.js";

/* Natural rivalries and more NPC behaviour (WoDX NPC 0.18.0, Combat 3.10.0) */

const side = (line, sheet = {}, more = {}) => RV.sidesOf({line, sheet, ...more});
const garou = side("lupine", {tribe: "Shadow Lords"});
const tzim = side("kindred", {clan: "Tzimisce", sect: "Sabbat"});
const tremere = side("kindred", {clan: "Tremere", sect: "Camarilla"});
const inquisitor = side("hunter", {}, {factions: [{name: "The Holy Inquisition", kind: "hunters"}]});

test("every rivalry row is whole: an id, two sides, steps from -3 to 0, years in order, a reason and a book", () => {
  const ids = new Set();
  for ( const r of RV.RIVALRIES ) {
    assert.ok(r.id && !ids.has(r.id), r.id); ids.add(r.id);
    assert.ok(r.a && r.b, r.id);
    for ( const s of [r.ab ?? 0, r.ba ?? 0] ) assert.ok(s >= -3 && s <= 0, r.id);
    assert.ok(r.ab || r.ba, r.id);
    if ( r.from !== null && r.to !== null ) assert.ok(r.from <= r.to, r.id);
    assert.ok(r.note && r.book, r.id);
    assert.doesNotMatch(r.note, /—/, r.id);
  }
  assert.ok(RV.RIVALRIES.length >= 55);
});

test("every line has a rivalry in force in every era, 1197 to the Future Darkness", () => {
  const lines = {kindred: tremere, lupine: garou, mage: side("mage", {affiliation: "Traditions", sect: "Order of Hermes"}), fae: side("fae", {court: "Seelie"}),
    wraith: side("wraith"), hunter: inquisitor};
  const foes = [tremere, tzim, garou, side("mage", {affiliation: "Technocracy"}), side("fae", {court: "Unseelie"}), side("wraith", {}, {variant: "Spectre"}),
    side("kindred", {clan: "Giovanni"}), inquisitor, side("fae", {}, {written: ["dauntain"]})];
  for ( const y of [1197, 1300, 1450, 1500, 1700, 1850, 1950, 1999, 2030] ) for ( const [line, mine] of Object.entries(lines) ) {
    const any = foes.some(f => RV.rowsBetween(mine, f, y).some(x => x.step < 0));
    assert.ok(any, `${line} in ${y}`);
  }
});

test("sides come from the line, the sheet, the factions and what the Storyteller writes", () => {
  const s = side("kindred", {clan: "Tremere", sect: "Camarilla"}, {factions: [{name: "Chantry of Brno", kind: "kindred"}], written: ["sect:camarilla", "open hand"]});
  for ( const x of ["line:kindred", "clan:tremere", "sect:camarilla", "kind:kindred", "faction:chantry of brno", "side:open hand"] ) assert.ok(s.includes(x), x);
  assert.ok(RV.matches("clan:tremere|clan:tzimisce", s));
  assert.ok(!RV.matches("clan:tzimisce", s));
  assert.ok(RV.matches("chantry", s), "a bare word matches any side");
});

test("a Garou smells the Leech but not its clan; a Kindred of the same city knows the clan", () => {
  const byNose = RV.knownSides({line: "lupine", senses: ["scent"]}, {sides: tzim});
  assert.deepEqual(byNose, ["line:kindred"]);
  const bySight = RV.knownSides({line: "mortal", senses: []}, {sides: tzim});
  assert.deepEqual(bySight, [], "a mortal sees nothing in one who passes for human");
  const obvious = RV.knownSides({line: "mortal"}, {sides: garou, obvious: true});
  assert.ok(obvious.includes("line:lupine") && obvious.includes("tribe:shadow lords"));
  const kin = RV.knownSides({line: "kindred", senses: ["auspex"]}, {sides: tzim});
  assert.ok(kin.includes("clan:tzimisce") && kin.includes("sect:sabbat"));
  const noSense = RV.knownSides({line: "kindred", senses: []}, {sides: tzim});
  assert.deepEqual(noSense, [], "without Auspex one Cainite cannot tell another");
  assert.ok(RV.knownSides({line: "mortal", metThem: true}, {sides: tzim}).includes("clan:tzimisce"), "a face once met is known");
  assert.ok(RV.knownSides({line: "mortal"}, {sides: inquisitor, openSides: ["kind:hunters"]}).includes("kind:hunters"));
});

test("the year decides: the Omen War, the sects after 1493, the Inquisition from 1231", () => {
  const knownTz = RV.knownSides({line: "kindred", senses: ["auspex"]}, {sides: tzim});
  assert.equal(RV.regard({mine: tremere, known: knownTz, year: 1230}).step, -3);
  assert.equal(RV.regard({mine: tremere, known: knownTz, year: 1600}).step, -2);
  const sab = side("kindred", {sect: "Sabbat"}), cam = side("kindred", {sect: "Camarilla"});
  assert.equal(RV.regard({mine: sab, known: cam, year: 1400}).step, 0, "no Sabbat before 1493");
  assert.equal(RV.regard({mine: sab, known: cam, year: 1600}).step, -2);
  assert.equal(RV.regard({mine: inquisitor, known: ["line:kindred"], year: 1250}).step, -3);
  assert.equal(RV.regard({mine: ["line:kindred"], known: inquisitor, year: 1250}).step, -2, "the hunted count the Inquisition Hostile");
  assert.equal(RV.regard({mine: inquisitor, known: ["line:kindred"], year: 1200}).step, -2, "before 1231 the Church's hunters, not the Inquisition");
  assert.equal(RV.regard({mine: garou, known: ["line:kindred"], year: 1197}).step, -2);
  assert.equal(RV.regard({mine: side("lupine", {tribe: "Black Spiral Dancers"}), known: side("lupine", {tribe: "Black Spiral Dancers"}), year: 1500}).step, 0,
    "the fallen tribe has no quarrel with itself");
  assert.equal(RV.regard({mine: side("mortal", {}, {written: ["hussite"]}), known: side("mortal", {}, {written: ["catholic"]}), year: 1420}).step, -3);
});

test("a Rivals line wins, then the Storyteller's standing, then the table; a follower is one step milder", () => {
  const k = ["line:kindred"];
  assert.equal(RV.regard({mine: garou, known: k, year: 1500, rivals: [{matcher: "line:kindred", step: 0}]}).step, 0);
  assert.equal(RV.regard({mine: garou, known: k, year: 1500, standing: 1}).step, 1);
  assert.equal(RV.regard({mine: garou, known: k, year: 1500, standing: null}).step, -2);
  assert.equal(RV.regard({mine: garou, known: k, year: 1500, follower: true}).step, -1);
  const parsed = RV.parseRivals("clan:tremere -3\nnonsense\n# a note\nsect:anarch 1");
  assert.deepEqual(parsed.rivals, [{matcher: "clan:tremere", step: -3}, {matcher: "sect:anarch", step: 1}]);
  assert.equal(parsed.problems.length, 1);
});

test("flashpoints: tense never fights on sight, truce ground never, the rest by the odds", () => {
  assert.equal(RV.flashpoint({step: -1}).odds, 0);
  assert.equal(RV.flashpoint({step: -3, truce: true}).odds, 0);
  assert.equal(RV.flashpoint({step: -2, aggression: 1}).odds, 35);
  assert.equal(RV.flashpoint({step: -3, aggression: 1, mine: garou, night: true, ownGround: true}).odds, 95, "capped at 95");
  const cam = side("kindred", {sect: "Camarilla"}), sab = side("kindred", {sect: "Sabbat"});
  assert.equal(RV.flashpoint({step: -2, aggression: 1, mine: cam, witnesses: 3}).odds, 5);
  assert.equal(RV.flashpoint({step: -2, aggression: 1, mine: sab, witnesses: 3}).odds, 20, "the Sabbat cares half as much");
  assert.equal(RV.flashpoint({step: -2, aggression: 1, us: 1, them: 3}).odds, 10);
  assert.equal(RV.flashpoint({step: -2, aggression: 1, parley: true}).odds, 18);
  assert.equal(RV.flashpoint({step: -2, aggression: 1, parley: true, parleyed: true}).odds, 35);
  assert.ok(RV.flashpoint({step: -2, aggression: 0.2}).odds < RV.flashpoint({step: -2, aggression: 1.5}).odds);
  assert.deepEqual(RV.rollFlashpoint(35, () => 0.34), {roll: 35, fight: true});
  assert.deepEqual(RV.rollFlashpoint(35, () => 0.35), {roll: 36, fight: false});
});

test("pairs on the map are NPC against NPC; quiet pairs stay quiet in world time", () => {
  const p = RV.rivalPairs({id: "a"}, [{id: "b"}, {id: "c", pc: true}, {id: "d", down: true}, {id: "e", hidden: true}, {id: "a"}]);
  assert.deepEqual(p, [{a: "a", b: "b"}]);
  assert.deepEqual(RV.rivalPairs({id: "a", pc: true}, [{id: "b"}]), []);
  assert.equal(RV.pairKey("b", "a"), RV.pairKey("a", "b"));
  assert.ok(RV.quietPair(100, 300));
  assert.ok(!RV.quietPair(100, 800));
  assert.ok(!RV.quietPair(500, 100), "time put back clears it");
});

test("sides in a fight: rivals and their helpers, kin stand with whoever brought them", () => {
  const m = RV.sidesForFight("a", "b", ["a2"], ["b2", "a2"]);
  assert.deepEqual(m, {a: "a", a2: "a", b: "b", b2: "b"});
  assert.equal(RV.enemiesBySide(m, "a", "b"), true);
  assert.equal(RV.enemiesBySide(m, "a", "a2"), false);
  assert.equal(RV.enemiesBySide(m, "a", "zz"), null);
  assert.deepEqual(S.sidesWithKin({a: "a", b: "b"}, {a: ["k1"], b: ["k2", "a"]}), {a: "a", b: "b", k1: "a", k2: "b"});
  assert.equal(S.sidesWithKin(null, {}), null);
  assert.ok(S.SOURCES.rivalry);
});

test("the Storyteller's own rows, and rows switched off", () => {
  const r = RV.parseExtraRows("sect:sabbat > clan:ventrue: -2 / -1, 1500-1700, an old feud\nfoo > bar: -3\nbad");
  assert.equal(r.rows.length, 2);
  assert.deepEqual([r.rows[0].ab, r.rows[0].ba, r.rows[0].from, r.rows[0].to], [-2, -1, 1500, 1700]);
  assert.deepEqual([r.rows[1].ab, r.rows[1].ba, r.rows[1].from], [-3, -3, null]);
  assert.equal(r.problems.length, 1);
  const rows = RV.rowsInUse({off: ["garou-kindred"], extra: "foo > bar: -3"});
  assert.ok(!rows.some(x => x.id === "garou-kindred"));
  assert.equal(RV.regard({mine: garou, known: ["line:kindred"], year: 1500, rows}).step, 0);
  assert.equal(RV.regard({mine: ["side:foo"], known: ["side:bar"], year: 1500, rows}).step, -3);
});

test("senses by line: Aura Perception at Auspex 2, a Garou's nose and Sense Wyrm, Kenning, Second Sight", () => {
  assert.deepEqual(RV.sensesOf({kind: "kindred", auspex: 1}), {auto: [], roll: []});
  assert.deepEqual(RV.sensesOf({kind: "kindred", auspex: 2}).auto, ["auspex"]);
  assert.deepEqual(RV.sensesOf({kind: "lupine", senseWyrm: true}), {auto: [], roll: ["scent", "sense wyrm"]});
  assert.deepEqual(RV.sensesOf({kind: "fae"}).auto, ["kenning"]);
  assert.deepEqual(RV.sensesOf({kind: "hunter", imbued: true}).auto, ["second sight"]);
  assert.deepEqual(RV.sensesOf({kind: "hunter"}).auto, []);
  assert.deepEqual(RV.sensesOf({kind: "mage"}).roll, ["awareness"]);
});

test("new templates: each rival kind starts from its own temperament", () => {
  assert.equal(NR.templateFor({kind: "kindred", sides: ["sect:sabbat"]}), "sabbat");
  assert.equal(NR.templateFor({kind: "kindred", generation: 7, sides: ["sect:camarilla"]}), "elder");
  assert.equal(NR.templateFor({kind: "mage"}), "mage");
  assert.equal(NR.templateFor({kind: "mage", sides: ["aff:technocracy"]}), "technocrat");
  assert.equal(NR.templateFor({kind: "fae"}), "changeling");
  assert.equal(NR.templateFor({kind: "hunter", sides: ["faction:the holy inquisition"]}), "inquisitor");
  assert.equal(NR.templateFor({kind: "spirit", sides: ["variant:spectre"]}), "spectre");
  assert.equal(NR.templateFor({kind: "mortal", sides: ["side:fomor"]}), "fomor");
  assert.equal(NR.templateFor({kind: "mortal", melee: 3}), "guard");
  for ( const t of Object.values(NR.TEMPLATES) ) for ( const x of t.tactics ) assert.ok(NR.TACTICS[x], x);
});

const fight = (over = {}) => ({self: {kind: "kindred", wounds: 0, willpower: 3, blood: 10, selfcontrol: 3, hasPowers: true, ...(over.self ?? {})},
  enemies: [{id: "e1", name: "One", visible: true, distance: 2, reach: true, wounds: 0, attackDice: 5}, {id: "e2", name: "Two", visible: true, distance: 2, reach: true, wounds: 0, attackDice: 5, hurtByAllies: true}],
  allies: [{id: "a1", name: "Ally"}], bestAttackDice: 5, ...over, self2: undefined});

test("new tactics: the pack piles on, the Masquerade holds back powers, own ground holds longer", () => {
  const pack = NR.scoreOptions(NR.profileOf({template: "sabbat"}), fight());
  const att = pack.filter(o => o.action === "attack");
  assert.equal(att[0].target, "e2", "the one already bleeding");
  assert.match(att[0].why, /pack/);
  const plain = NR.scoreOptions(NR.profileOf({template: "mage"}), fight());
  const hid = NR.scoreOptions(NR.profileOf({template: "mage"}), fight({witnesses: 2}));
  assert.ok(hid.find(o => o.action === "power").score < plain.find(o => o.action === "power").score);
  assert.ok(hid.find(o => o.action === "flee"), "slipping away is offered");
  const shown = NR.scoreOptions(NR.profileOf({template: "mage"}), {...fight({witnesses: 2}), enemies: fight().enemies.map(e => ({...e, obvious: true}))});
  assert.equal(shown.find(o => o.action === "power").score, plain.find(o => o.action === "power").score, "the secret is out already");
  const hurt = {self: {kind: "mortal", wounds: 4}};
  const away = NR.scoreOptions(NR.profileOf({template: "soldier"}), fight(hurt)).find(o => o.action === "flee");
  const home = NR.scoreOptions(NR.profileOf({template: "soldier"}), fight({self: {kind: "mortal", wounds: 4, onGround: true}})).find(o => o.action === "flee");
  assert.ok(!home || home.score < away.score, "on its own ground it bears one wound more");
  const alive = NR.scoreOptions(NR.profileOf({template: "inquisitor"}), {...fight(), enemies: [{...fight().enemies[0], supernatural: true, wounds: 4}]});
  assert.match(alive.find(o => o.action === "attack").why, /alive/);
});

test("new routines: every new preset and age is valid, and the rival templates have one", () => {
  for ( const k of ["sabbat-pack", "sheriff", "tremere", "mage", "technocrat", "changeling", "wraith", "inquisitor", "soldier", "beggar", "noble", "monk"] ) {
    const p = R.PRESETS[k];
    assert.ok(p, k);
    assert.deepEqual(R.checkBlocks(p.blocks), [], k);
    for ( const [a, b] of Object.entries(p.ages ?? {}) ) { assert.ok(R.AGES[a], `${k}.${a}`); assert.deepEqual(R.checkBlocks(b), [], `${k}.${a}`); }
  }
  assert.ok(!R.presetsFor(1200).inquisitor, "no Inquisition before 1231");
  assert.ok(R.presetsFor(1250).inquisitor);
  assert.ok(!R.presetsFor(1400)["sabbat-pack"]);
  for ( const t of ["sabbat", "sheriff", "mage", "technocrat", "changeling", "inquisitor", "soldier"] ) assert.ok(R.PRESETS[R.DEFAULT_PRESET[t]], t);
  assert.notDeepEqual(R.presetBlocks("technocrat", "modern"), R.presetBlocks("technocrat", "medieval"));
});

test("the wiring: the starter carries sides, the NPC reads them, rivalries seed first meetings", () => {
  const start = readFileSync(new URL("../../modules/wodx-combat/scripts/start.js", import.meta.url), "utf8");
  assert.match(start, /sides = null/);
  assert.match(start, /setFlag\(MOD, "sides"/);
  const main = readFileSync(new URL("../../modules/wodx-npc/scripts/main.mjs", import.meta.url), "utf8");
  assert.match(main, /getFlag\?\.\("wodx-combat", "sides"\)/);
  assert.match(main, /rivalry\.registerSettings\(\)/);
  const att = readFileSync(new URL("../../modules/wodx-npc/scripts/attitude.mjs", import.meta.url), "utf8");
  assert.match(att, /rivalry\.seedFor/);
  const riv = readFileSync(new URL("../../modules/wodx-npc/scripts/rivalry.mjs", import.meta.url), "utf8");
  assert.match(riv, /source: "rivalry"/);
  assert.match(riv, /searchBox\(/);
});
