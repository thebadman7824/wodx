import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/*
 * WoDX Senses (B3540-B3547): the other-world sights, the pure rules. The gate (tools/gate/gateothersight.mjs) checks
 * the drawing, the echoes and the ties in Foundry.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const O = await import(join(root, "modules/wodx-senses/scripts/otherworld-sight-rules.mjs"));
const DA = await import(join(root, "modules/wodx-actions/scripts/mage-da-rules.js"));
const src = f => readFileSync(join(root, f), "utf8");

test("who has which sight", () => {
  assert.deepEqual(O.otherSightsFor({profile: "mortal"}), []);
  assert.deepEqual(O.otherSightsFor({profile: "lupine", peeking: true}), ["penumbra"]);
  assert.deepEqual(O.otherSightsFor({profile: "mage", spheres: {prime: 1, time: 0, entropy: 2, correspondence: 0}}), ["prime", "entropy"]);
  assert.deepEqual(O.otherSightsFor({profile: "fae"}), ["chimerical"]);
  assert.deepEqual(O.otherSightsFor({profile: "mortal", enchanted: true}), ["chimerical"]);
  assert.deepEqual(O.otherSightsFor({profile: "wraith"}), ["shroud"]);
  // a Dark Ages Hermetic sees Prime through Primus
  assert.deepEqual(O.otherSightsFor({profile: "mage", da: {fellowship: "hermes", foundation: 2, pillars: {primus: 2}}}), ["prime"]);
});

test("a character's own eyes: a peek first, then a wraith's or a changeling's", () => {
  assert.equal(O.autoSight({profile: "wraith", peeking: true}), "penumbra");
  assert.equal(O.autoSight({profile: "wraith"}), "shroud");
  assert.equal(O.autoSight({profile: "fae"}), "chimerical");
  assert.equal(O.autoSight({profile: "mortal", enchanted: true}), "chimerical");
  assert.equal(O.autoSight({profile: "kindred"}), null);
});

test("a mage's sight costs the book's roll and its successes set how long it holds", () => {
  const m = O.mageRoll({spheres: {prime: 1}, arete: 3}, "prime");
  assert.equal(m.system, "m20"); assert.equal(m.dice, 3); assert.equal(m.difficulty, 4);
  assert.match(m.ref, /M20 pdf 521/); assert.match(m.ref, /pdf 502/);
  const d = O.mageRoll({spheres: {}, da: {fellowship: "hermes", foundation: 2, pillars: {primus: 3}}}, "prime", {castPlan: DA.castPlan});
  assert.equal(d.system, "da"); assert.equal(d.pillar, "primus"); assert.equal(d.dice, 5); assert.equal(d.difficulty, 5);
  assert.equal(O.mageRoll({spheres: {}}, "time"), null);
  assert.deepEqual(O.holdFor(0), {seconds: 0, words: "none"});
  assert.deepEqual(O.holdFor(2), {seconds: 3600, words: "one scene"});
  assert.equal(O.holdFor(4, "da").words, "a month");
  assert.ok(O.holding({sight: "prime", until: 100}, "prime", 99));
  assert.ok(!O.holding({sight: "prime", until: 100}, "prime", 101));
  assert.ok(!O.holding({sight: "time", until: 100}, "prime", 1));
});

test("the Penumbra: Banes from the taint, the web veil only without a map file, the Gauntlet's pull", () => {
  const a = O.penumbraLayer({place: {level: 6, banes: 2}, gauntlet: 3, web: 0.9, hasMap: false});
  assert.equal(a.banes, 2); assert.ok(a.webVeil > 0.8);
  assert.ok(a.lines.some(l => /2 Banes/.test(l)) && a.lines.some(l => /thick over everything/.test(l)) && a.lines.some(l => /thin/.test(l)));
  const b = O.penumbraLayer({place: null, gauntlet: 9, web: 0.2, hasMap: true});
  assert.equal(b.webVeil, 0); assert.equal(b.banes, 0); assert.ok(b.veil < a.veil);
  assert.equal(O.spiritWord({refuses: true}), "hostile");
  assert.equal(O.spiritWord({diff: -1}), "friendly");
  assert.equal(O.spiritWord({diff: 2}), "wary");
  assert.equal(O.courtOf("Glass Spider"), "weaver");
  assert.equal(O.courtOf("Scrag bane"), "wyrm");
  assert.equal(O.courtOf("Anything", "bird"), "bird");
});

test("vulgar strain fades; echoes keep the newest and Time 1 sees only the last day", () => {
  let st = O.addStrain([], {x: 10, y: 20, kind: "coincidental"}, 0);
  assert.equal(st.length, 0);
  st = O.addStrain(st, {x: 10, y: 20, kind: "vulgar", highest: 3, by: "Ottilie"}, 0);
  assert.equal(st.length, 1); assert.equal(st[0].until, 30 * 86400);
  assert.equal(O.addStrain([], {kind: "witnessed", botch: true}, 0)[0].until, 120 * 86400);
  assert.ok(O.strainStrength(st[0], 0) > O.strainStrength(st[0], 20 * 86400));
  assert.equal(O.pruneStrain(st, 31 * 86400).length, 0);
  let e = [];
  for ( let i = 0; i < 90; i++ ) e = O.addEcho(e, {x: 0, y: 0, at: i * 3600, text: `event ${i}`});
  assert.equal(e.length, 80);
  const now = 89 * 3600;
  assert.equal(O.echoesSeen(e, now, 1).length, 25);
  assert.equal(O.echoesSeen(e, now, 2).length, 80);
  assert.equal(O.echoesSeen(e, now, 2)[0].text, "event 89");
  assert.equal(O.ago(30), "moments ago"); assert.equal(O.ago(3 * 86400), "3 days ago");
  assert.equal(O.echoOfMapEvent({kind: "open", scene: "s", noise: "quiet"}), null);
  assert.match(O.echoOfMapEvent({kind: "break", scene: "s", whoName: "Jan", objectName: "the door", at: 5}).text, /Jan broke the door/);
  assert.equal(O.echoOfMapEvent({kind: "break", scene: "s", undone: true}), null);
});

test("Entropy, Correspondence, Prime words", () => {
  assert.equal(O.frailWord(0), null);
  assert.equal(O.frailWord(0.9).words, "near death");
  assert.match(O.frailWord(0.5).words, /badly hurt/);
  assert.deepEqual(O.linkWords([{x: 0, y: 0, to: "Brno"}, {x: 1, y: 1, to: "Brno"}, {x: 0, y: 0}]).map(l => l.words), ["bound to Brno"]);
  assert.match(O.primeWords({kind: "node", rating: 3, resonance: "grief", store: {quint: 4, tass: 2}, tassForm: "salt"}), /Node 3, resonant with grief; 4 Quintessence pooled and 2 Tass \(salt\)/);
  assert.match(O.primeWords({kind: "freehold"}), /balefire/);
});

test("chimerical sight: Banality greys, freeholds are dressed, enchantment lasts a day a point", () => {
  assert.equal(O.banalityGrey(4), 0);
  assert.ok(O.banalityGrey(10) > 0.8);
  assert.match(O.chimericalFilter({banality: 9}), /grayscale/);
  assert.doesNotMatch(O.chimericalFilter({banality: 9, dressed: true}), /grayscale/);
  assert.ok(O.dullPerson(8) && !O.dullPerson(7));
  assert.equal(O.enchantUntil(3, 100), 100 + 3 * 86400);
  assert.ok(O.isEnchanted({until: 200}, 150) && !O.isEnchanted({until: 100}, 150) && O.isEnchanted({kinain: true}, 1e9));
});

test("the view from the Shadowlands: heavier in the Great War's years; Fetters by a tie or by name", () => {
  const g = s => Number(/grayscale\(([\d.]+)\)/.exec(s)[1]);
  assert.ok(g(O.shroudFilter({shroud: 7, year: 1916})) > g(O.shroudFilter({shroud: 7, year: 2000})));
  assert.ok(g(O.shroudFilter({shroud: 9, year: 1200})) > g(O.shroudFilter({shroud: 5, year: 1200})));
  const things = [{uuid: "T1", name: "Wedding ring"}, {uuid: "T2", name: "Anna Novak"}, {uuid: "T3", name: "Old mill"}];
  const m = O.fetterMatches([{id: "f1", name: "My wedding ring"}, {id: "f2", name: "My daughter", link: "T2"}, {id: "f3", name: "The sea"}], things);
  assert.deepEqual(m.map(x => [x.fetter, x.uuid]), [["f1", "T1"], ["f2", "T2"]]);
});

test("wiring: the sight button steps through the new sights, Actions says when magick is worked, the socket keeps echoes", () => {
  const sight = src("modules/wodx-senses/scripts/sight.mjs"), main = src("modules/wodx-senses/scripts/main.mjs"), m20 = src("modules/wodx-actions/scripts/m20.js");
  assert.match(sight, /OW\.otherSightsOf\(a\)/);
  assert.match(sight, /OW\.rollFor\(a, next\)/);
  assert.match(sight, /wodxSightTies[\s\S]*?visible: game\.user\.isGM/);
  assert.match(main, /action === "ties"/);
  assert.match(main, /type === "keep"/);
  assert.match(m20, /Hooks\.callAll\("wodxMagickWorked", actor, \{ kind: fd\.kind/);
  const ow = src("modules/wodx-senses/scripts/otherworld-sight.mjs");
  for ( const h of ["wodxCrossing", "wodxMapEvent", "wodxDamageApplied", "wodxMagickWorked"] ) assert.ok(ow.includes(`Hooks.on("${h}"`), h);
  assert.ok(ow.includes("searchBox("), "the Fetter list has a search box");
  // Foundry 14's PIXI takes a plain colour for a text outline; an object stops the whole layer (testbed find)
  for ( const f of ["modules/wodx-senses/scripts/otherworld-sight.mjs", "modules/wodx-senses/scripts/sight.mjs", "modules/wodx-otherworlds/scripts/senses.mjs"] )
    assert.doesNotMatch(src(f), /stroke: \{color/, f);
});
