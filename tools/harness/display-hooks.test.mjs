import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as S from "../../modules/wodx-senses/scripts/sight-rules.mjs";
import * as B from "../../modules/wodx-combat/scripts/body-rules.js";
import * as R from "../../modules/wodx-combat/scripts/rules.js";
import * as L from "../../modules/wodx-interactables/scripts/living-rules.mjs";

/* The Display-Only Systems Desk, batch A (B2900-B2904): systems that used to show something now feed the rules. */

test("B2900: Aura Perception shows only what a reading showed", () => {
  assert.equal(S.ringFor("aura", "kindred", {needsRead: true, read: null}), null);
  const one = S.ringFor("aura", "kindred", {needsRead: true, read: {n: 1}});
  assert.equal(one.words, "pale");
  assert.equal(S.ringFor("aura", "mortal", {needsRead: true, read: {n: 1}}).words, "bright");
  assert.equal(S.ringFor("aura", "lupine", {needsRead: true, read: {n: 2}}).words, "bright and wild");
  assert.equal(S.ringFor("aura", "lupine", {needsRead: true, read: {botch: true}}).words, "pale", "a botch shows a false colour");
  assert.equal(S.ringFor("aura", "lupine", {needsRead: false}).words, "bright and wild", "setting off: as before");
  assert.ok(S.ringFor("lifesight", "mortal", {needsRead: true}), "Lifesight needs no reading");
  assert.equal(S.ringFor("aura", "kindred", {needsRead: true, safe: true, read: {n: 1}}).colour, S.SAFE.kindred);
});

test("B2900: a reading holds for an hour of game time", () => {
  const reads = {a: {n: 3, at: 100}, b: {n: 0, at: 100}, c: {botch: true, at: 100}};
  assert.equal(S.readFor(reads, "a", 200).n, 3);
  assert.equal(S.readFor(reads, "a", 100 + S.AURA_READ_SECONDS + 1), null);
  assert.equal(S.readFor(reads, "a", 50), null, "a reading from the future (time went back) does not hold");
  assert.equal(S.readFor(reads, "b", 200), null, "no success: nothing shown");
  assert.equal(S.readFor(reads, "c", 200).botch, true);
  assert.equal(S.readFor(reads, "x", 200), null);
  const many = Object.fromEntries(Array.from({length: 50}, (_, i) => [`t${i}`, {n: 2, at: 1000 + i}]));
  const kept = S.pruneReads({...many, old: {n: 2, at: 0}}, 2000);
  assert.equal(Object.keys(kept).length, 40);
  assert.ok(!("old" in kept) && "t49" in kept && !("t0" in kept));
});

test("B2901: loud noise and guns overwhelm Heightened Senses", () => {
  assert.equal(S.overwhelms({noise: "loud"}), true);
  assert.equal(S.overwhelms({noise: "quiet"}), false);
  for ( const w of ["Wheellock pistol", "Matchlock musket", "Hand cannon", "Assault rifle", "Revolver"] ) assert.equal(S.overwhelms({ranged: true, weapon: w}), true, w);
  for ( const w of ["Longbow", "Crossbow", "Sling", "Throwing knife"] ) assert.equal(S.overwhelms({ranged: true, weapon: w}), false, w);
  assert.equal(S.overwhelms({ranged: false, weapon: "Pistol"}), false, "a pistol-whip makes no bang");
  assert.match(S.overloadText("Ada"), /Willpower at difficulty 6/);
  assert.doesNotMatch(S.overloadText("Ada"), /\b(he|she|his|her)\b/i);
});

test("B2902: a crippled part counts on the attack", () => {
  assert.equal(B.crippledAttackDiff(["arm-r"], {name: "Sword"}), 2);
  assert.equal(B.crippledAttackDiff(["hand-l"], {name: "Punch"}), 2);
  assert.equal(B.crippledAttackDiff(["arm-r"], {name: "Kick"}), 0);
  assert.equal(B.crippledAttackDiff(["leg-l"], {name: "Kick"}), 2);
  assert.equal(B.crippledAttackDiff(["arm-r"], {name: "Bite"}), 0);
  assert.equal(B.crippledAttackDiff([], {name: "Sword"}), 0);
  const p = R.attackPool({attribute: 3, ability: 2, baseDifficulty: 6, crippledDiff: 2});
  assert.equal(p.difficulty, 8);
  assert.ok(p.parts.some(x => /Crippled limb \+2 diff/.test(x)));
  assert.equal(R.attackPool({attribute: 3, ability: 2, baseDifficulty: 6}).difficulty, 6, "no crippled part: as before");
});

test("B2903: wounds that add up get the maiming offer once", () => {
  const arm = {id: "arm-r", type: "arm", side: "r"};
  assert.ok(B.addedUpOffer({"arm-r": {l: 2, a: 1}}, [], arm, {thisBlow: 1}));
  assert.equal(B.addedUpOffer({"arm-r": {l: 2}}, [], arm, {thisBlow: 1}), null, "two levels are not enough");
  assert.equal(B.addedUpOffer({"arm-r": {l: 3, b: 4}}, ["arm-r"], arm), null, "offered once");
  assert.equal(B.addedUpOffer({"arm-r": {l: 3}}, [], arm, {thisBlow: 3}), null, "a single heavy blow has its own offer");
  assert.equal(B.addedUpOffer({"body": {l: 5}}, [], {id: "body", type: "torso"}), null, "the torso cannot be lost");
  assert.deepEqual(B.healedParts(["arm-r", "leg-l"], {"leg-l": {l: 1}, "arm-r": {b: 2}}), ["arm-r"]);
});

test("B2904: living tiles switch walls, doors and lights", () => {
  assert.equal(L.cleanRule({mode: "show", when: ["day"]}).also, "none");
  assert.equal(L.cleanRule({mode: "show", when: ["day"], also: "lock"}).also, "lock");
  assert.equal(L.cleanRule({mode: "show", when: ["day"], also: "nonsense"}).also, "none");
  const rect = {x: 100, y: 100, width: 200, height: 200};
  assert.equal(L.wallInside([110, 110, 290, 110], rect), true);
  assert.equal(L.wallInside([110, 110, 400, 110], rect), false);
  assert.deepEqual(L.linkedChange("block", true, "wall", {door: 0, move: 0, sight: 0}), {move: 20, sight: 20});
  assert.deepEqual(L.linkedChange("block", false, "wall", {door: 0, move: 20, sight: 20}), {move: 0, sight: 0});
  assert.equal(L.linkedChange("block", true, "wall", {door: 1, move: 20, sight: 20}), null, "doors are not walls to block");
  assert.deepEqual(L.linkedChange("lock", true, "wall", {door: 1, ds: 0}), {ds: 2, wodxLocked: true});
  assert.deepEqual(L.linkedChange("lock", false, "wall", {door: 1, ds: 2, wodxLocked: true}), {ds: 0, wodxLocked: false});
  assert.equal(L.linkedChange("lock", false, "wall", {door: 1, ds: 2, wodxLocked: false}), null, "a door locked by hand stays locked");
  assert.deepEqual(L.linkedChange("light", true, "light", {hidden: true}), {hidden: false});
  assert.equal(L.linkedChange("light", true, "light", {hidden: false}), null);
  assert.match(L.ruleWords({mode: "show", when: ["fast"], also: "lock"}), /doors inside it are locked while it holds/);
});

/* ---- Batch C (B2910-B2915) ---- */
import * as GO from "../../modules/wodx-storyteller/scripts/go-rules.mjs";
import * as DR from "../../modules/wodx-storyteller/scripts/dreams-rules.mjs";
import * as MK from "../../modules/wodx-otherworlds/scripts/mark-rules.mjs";
import * as WT from "../../modules/wodx-npc/scripts/wanted-rules.mjs";
import {moodRule} from "../../modules/wodx-atmosphere/scripts/mood.mjs";

test("B2910: Go turns a journey into days, meetings and seconds", () => {
  const j = {surface: {days: 12, legs: []}, air: {days: 1, words: "by air"}};
  const p = GO.goPlan(j, {chance: 50, rand: () => 0.1});
  assert.equal(p.days, 12); assert.equal(p.seconds, 12 * 86400); assert.equal(p.meetings.length, GO.MAX_MEETINGS);
  assert.equal(GO.goPlan(j, {way: "air", chance: 50, rand: () => 0.2}).meetings.length, 0); // a quarter of 50 is 12.5
  assert.equal(GO.goPlan({unknown: "x"}), null);
  assert.equal(GO.goPlan(j, {chance: 0}).meetings.length, 0);
  assert.match(GO.goLines(p, {from: "Moravia", to: "The British Isles", names: ["Ilse"]})[0], /^Ilse goes from Moravia/);
});

test("B2911: tied dreams wait for the sleep; Nightmares costs a die on a failure", () => {
  assert.equal(DR.normDream({id: "a", actorId: "x", source: "nonsense"}).source, "");
  const list = [{id: "a", actorId: "x", source: "auspex"}, {id: "b", actorId: "x"}, {id: "c", actorId: "y", source: "nightmares"}];
  assert.deepEqual(DR.tiedDue(list, 100, 50).map(d => d.id), ["a", "c"]);
  assert.deepEqual(DR.tiedDue(list, 100, 150), []);
  assert.deepEqual(DR.tiedDue(list, 100, 50, d => d.actorId === "x").map(d => d.id), ["a"]);
  assert.equal(DR.nightmareResult(0).lose, 1); assert.equal(DR.nightmareResult(2).lose, 0); assert.equal(DR.nightmareResult(3, true).lose, 1);
  assert.equal(DR.nextSleep(100, 50), 100); assert.equal(DR.nextSleep(100, 100), 86500);
});

test("B2912, B2913: marks and mood rules move the Gauntlet and Shroud, two steps at most", () => {
  const g = MK.groundShift(["loom", "loom", "relic"], []);
  assert.equal(g.gauntlet, -2); assert.equal(g.notes.length, 2);
  assert.equal(MK.groundShift(["blight"], [{name: "Factory", rule: {gauntlet: 3}}]).gauntlet, 2);
  assert.equal(MK.groundShift(["thin"], [{name: "Wake", rule: {shroud: -1, banality: 1}}]).shroud, -2);
  assert.equal(MK.shiftRating(0, -1), 0); assert.equal(MK.shiftRating(null, 1), null); assert.equal(MK.shiftRating(3, -2, {min: 2}), 2);
  assert.deepEqual(moodRule({gauntlet: 9, shroud: "-1", fire: -2}), {gauntlet: 3, shroud: -1, banality: 0, fire: 0});
});

test("B2914: a foreigner's description lasts longer and survives new clothes", () => {
  const marks = {station: 2, dress: ["a fur hat"], foreign: true};
  const d = WT.writeDesc({id: "d", of: "a", marks, at: 0, scene: "s", year: 1400});
  const plain = WT.writeDesc({id: "e", of: "a", marks: {...marks, foreign: false}, at: 0, scene: "s", year: 1400});
  const day = 86400;
  assert.ok(WT.strength(d, 10 * day) > WT.strength(plain, 10 * day));
  assert.equal(WT.matchOf(d, {station: 2, dress: ["a cloak"], foreign: true}).level, "partial");
  assert.equal(WT.matchOf(d, {station: 2, dress: ["a cloak"], foreign: false}).level, "none");
  assert.ok(WT.isForeign("europe", "asia")); assert.ok(!WT.isForeign("europe", "europe")); assert.ok(!WT.isForeign(null, "asia"));
});

test("B2915: realm Go rolls the realm's dangers each day", async () => {
  const RW = await import("../../modules/wodx-otherworlds/scripts/realm-worlds-rules.mjs");
  const p = RW.goPlan({days: 2.5, squares: 10}, {hazards: ["a storm", "a hunter"], rand: () => 0.05});
  assert.equal(p.chance, 20); assert.equal(p.meetings.length, 3); assert.ok(["a storm", "a hunter"].includes(p.meetings[0].what));
  assert.equal(RW.goPlan({hidden: true}), null);
  assert.equal(RW.goPlan({days: 0.2, squares: 3}, {rand: () => 0.99}).seconds, Math.round(0.2 * 86400));
});

/* ---- Batch B (B3130-B3133) ---- */
import * as DPR from "../../modules/wodx-actions/scripts/deeper-rules.js";

test("B3130-B3133: Nightmares, a stranger in a crowd and codex research change the roll", () => {
  assert.equal(DPR.nightmareDice([{flags: {"wodx-storyteller": {diceLess: 1}}}, {disabled: true, flags: {"wodx-storyteller": {diceLess: 3}}}, {}]), 1);
  const m = DPR.deeperMods({nightmares: 1, crowd: 1, research: true});
  assert.equal(m.dice, -1); assert.equal(m.diff, 0); assert.equal(m.parts.length, 3);
  assert.deepEqual(DPR.deeperMods(), {dice: 0, diff: 0, parts: []});
  assert.ok(DPR.researchHelps("occult")); assert.ok(DPR.researchHelps("x", "Kindred Lore")); assert.ok(!DPR.researchHelps("brawl", "Brawl"));
});

/* ---- Batch B, Chronicle (B3160-B3163) ---- */
import * as LST from "../../modules/wodx-chronicle/scripts/legend-standing-rules.mjs";
import * as LGR from "../../modules/wodx-chronicle/scripts/legends-rules.mjs";
import * as LNG from "../../modules/wodx-chronicle/scripts/languages-rules.mjs";

test("B3160, B3161: Legends deeds suggest Renown and Status for player characters only", () => {
  const lines = [
    {id: "office:k:a:won:1", kind: "office", text: "Took the seat.", people: [{id: "a", name: "Ilse"}]},
    {id: "ledger:1:broken", kind: "ledger", text: "Broken: a boon.", people: [{id: "b", name: "Jan"}, {id: "a", name: "Ilse"}]},
    {id: "ledger:2:kept", kind: "ledger", text: "Kept: an oath.", people: [{id: "a", name: "Ilse"}, {id: "b", name: "Jan"}]},
    ...LGR.deedLines([{id: "f1", at: 0, text: "The pack routed the bandits.", people: [{id: "a", name: "Ilse"}, {id: "n", name: "Bandit"}], won: true}])
  ];
  const s = LST.suggestionsFor(lines, {a: {pc: true, kind: "lupine"}, b: {pc: true, kind: "kindred"}, n: {pc: false, kind: "mortal"}});
  assert.deepEqual(s.map(x => [x.actorId, x.trait, x.step]), [["a", "honor", 1], ["b", "status", -1], ["a", "honor", 1], ["a", "glory", 1]]);
  assert.match(LST.suggestionText(s[1]), /-1 Status/);
  assert.equal(LGR.normEntry({id: "deed:x", kind: "deed", won: 1}).won, true);
  assert.equal(LGR.normEntry({id: "event:x", kind: "event", won: 1}).won, undefined);
});

test("B3162, B3163: the language allowance holds, and a kindred tongue gives a roll for the gist", () => {
  assert.equal(LNG.allowance({linguistics: 0, merits: 0}), 1);
  assert.equal(LNG.allowance({linguistics: 3}), 5);
  assert.equal(LNG.allowance({merits: 2}), 3);
  assert.ok(!LNG.listAllowed(["Czech"], ["Czech", "Latin"], 1));
  assert.ok(LNG.listAllowed(["Czech", "Latin", "German"], ["Czech", "Latin"], 1));
  assert.equal(LNG.kinOf([["Czech", "German"]], "Polish"), "Czech");
  assert.equal(LNG.kinOf([["Czech"]], "Mandarin"), null);
  assert.equal(LNG.GIST.difficulty, 7);
});

/* ---- Batch B, Combat and Storyteller (B3170, B3171) ---- */
import * as AFR from "../../modules/wodx-combat/scripts/aftermath-rules.js";
import * as WUR from "../../modules/wodx-storyteller/scripts/wrapup-rules.mjs";

test("B3170, B3171: a fight becomes a deed and marks real danger for the experience draft", () => {
  assert.ok(AFR.fightWon([{pc: true}, {pc: false, down: true}]));
  assert.ok(!AFR.fightWon([{pc: true, down: true}, {pc: false, down: true}]));
  assert.ok(!AFR.fightWon([{pc: true}, {pc: false}]));
  assert.ok(!AFR.fightWon([{pc: false, down: true}]));
  assert.equal(AFR.deedText({won: true, place: "Brno", pcs: ["Ilse"], foes: ["the bandits"]}), "Ilse fought against the bandits at Brno and won.");
  const d = WUR.dangerFrom([{id: "c", rows: [{id: "a", pc: true, taken: 3}, {id: "b", pc: true, taken: 1}, {id: "c", pc: true, down: true}, {id: "n", pc: false, taken: 7}]}]);
  assert.deepEqual([...d].sort(), ["a", "c"]);
});

/* ---- Batch D (B3440 to B3444) ---- */
import * as GAR from "../../modules/wodx-actions/scripts/garou-rules.js";
import * as DRD from "../../modules/wodx-actions/scripts/deeper-rules.js";
import * as LKR from "../../modules/wodx-library/scripts/look-rules.mjs";
import * as SEEN from "../../modules/wodx-paperdoll/scripts/face64-seen.mjs";
import {FEATURES as F64} from "../../modules/wodx-paperdoll/scripts/face64-features.mjs";
import * as TKR from "../../modules/wodx-npc/scripts/talk-rules.mjs";
import * as WNR from "../../modules/wodx-npc/scripts/wanted-rules.mjs";

test("B3440: Crinos on the sheet or a war-form sprite brings the Delirium; Hispo does not", () => {
  assert.ok(GAR.bringsDelirium({form: "crinos"}));
  assert.ok(GAR.bringsDelirium({sprite: "garou-crinos"}));
  assert.ok(GAR.bringsDelirium({form: "homid", sprite: "bastet-crinos"}));
  assert.ok(!GAR.bringsDelirium({form: "hispo"}));
  assert.ok(!GAR.bringsDelirium({form: "homid", sprite: "garou-homid"}));
  assert.ok(!GAR.bringsDelirium({}));
});

test("B3441: dress against the other's station moves Etiquette and Subterfuge by a die", () => {
  assert.ok(DRD.dressCounts("etiquette") && DRD.dressCounts("", "Subterfuge") && !DRD.dressCounts("brawl"));
  assert.equal(DRD.deeperMods({dressed: "fine"}).dice, 1);
  assert.equal(DRD.deeperMods({dressed: "poor"}).dice, -1);
  assert.equal(DRD.deeperMods({dressed: "even"}).dice, 0);
  assert.match(DRD.deeperMods({dressed: "poor"}).parts[0], /below their station/);
});

test("B3442: the figure's worn places, not what is held, are dress", () => {
  const names = LKR.figureNames({body: {n: "a frock coat"}, hand: {n: "Mace"}, head: {n: "a top hat"}, feet: {n: ""}});
  assert.deepEqual(names, ["a frock coat", "a top hat"]);
  assert.deepEqual(LKR.figureNames(null), []);
});

test("B3443: uncanny Kindred marks reach the witness; a mask or another line hides them", () => {
  const nos = {line: "nosferatu", features: ["vn-boils", "a-scar-brow", "v-pallor-blue"]};
  assert.deepEqual(SEEN.uncannyMarks(nos, F64), [F64["vn-boils"].label]);
  assert.deepEqual(SEEN.uncannyMarks(nos, F64, {hidden: true}), []);
  assert.deepEqual(SEEN.uncannyMarks({line: "kindred", features: ["vc-gan-whiskers", "v-pallor-blue"]}, F64), [F64["vc-gan-whiskers"].label]);
  assert.deepEqual(SEEN.uncannyMarks({line: "werewolf", features: ["w-shaggy"]}, F64), [], "the Masquerade guards Kindred faces");
  assert.deepEqual(SEEN.uncannyMarks({line: "kindred", features: ["v-beast-eyes"]}, F64), [], "a form mark shows only in its state");
  assert.equal(SEEN.uncannyMarks({line: "kindred", features: ["v-beast-eyes"]}, F64, {state: {frenzy: true}}).length, 1);
  for ( const id of SEEN.UNCANNY_IDS ) assert.ok(F64[id], `${id} is a face feature`);
  assert.ok(SEEN.masked({face: {n: "a gas mask"}}) && SEEN.masked({head: {n: "a balaclava"}}) && !SEEN.masked({head: {n: "a top hat"}}));
  const m = WNR.normMarks({station: 2, uncanny: ["Weeping boils"]});
  assert.deepEqual(m.uncanny, ["Weeping boils"]);
  assert.match(LKR.describeMarks({...m, face: "monstrous"}), /with weeping boils/);
});

test("B3444: a face read against a straight face; the lie mark on a talk line", () => {
  const won = DRD.faceRead({successes: 3}, {successes: 1}, {lie: true, step: 1});
  assert.ok(won.won && won.face === "smirk");
  assert.match(won.lines.join(" "), /warm to you/);
  assert.match(won.lines.join(" "), /not the truth/);
  assert.ok(!DRD.faceRead({successes: 1}, {successes: 1}).won, "a tie keeps the face");
  assert.match(DRD.faceRead({botch: true, successes: 0}, {successes: 0}).lines[0], /misread/);
  assert.equal(DRD.faceRead({successes: 2}, {successes: 0}, {mood: "Afraid"}).face, "fear");
  assert.equal(TKR.parseThen("teach the mill; lie").lie, true);
  assert.equal(TKR.parseThen("aloud").lie, false);
});
