import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

// WoDX NPC: every line gets its own equivalent of the Kindred-only tools (B6310-B6318).
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const LR = await imp("modules/wodx-npc/scripts/lines-rules.mjs");
const AC = await imp("modules/wodx-npc/scripts/aftercare-rules.mjs");
const H = await imp("modules/wodx-npc/scripts/hearts-rules.mjs");
const F = await imp("modules/wodx-npc/scripts/fates-rules.mjs");
const SW = await imp("modules/wodx-npc/scripts/servant-world-rules.mjs");
const SR = await imp("modules/wodx-npc/scripts/servant-rules.mjs");
const RS = await imp("modules/wodx-npc/scripts/resident-rules.mjs");
const DU = await imp("modules/wodx-npc/scripts/duty-rules.mjs");
const TRR = await imp("modules/wodx-npc/scripts/trust-rules.mjs");

test("one key per line: a Kuei-jin is never Kindred, a Fera never a mortal", () => {
  assert.equal(LR.lineKey({type: "Vampire", system: {settings: {variant: "kindredeast"}}}), "kuei-jin");
  assert.equal(LR.lineKey({type: "Vampire", system: {settings: {variant: ""}}}), "vampire");
  assert.equal(LR.lineKey({type: "Changing Breed"}), "fera");
  assert.equal(LR.lineKey({type: "Mortal", system: {settings: {variant: "ghoul"}}}), "ghoul");
  assert.equal(LR.lineKey({type: "Mortal", flags: {"wodx-creation": {lineage: {kinfolk: {id: "g"}}}}}), "kinfolk");
  assert.equal(LR.lineKey({type: "Mortal"}), "mortal");
  assert.equal(LR.lineKey(null), "mortal");
  assert.equal(LR.lineKey({type: "Mortal"}, {of: () => "kinain"}), "kinain", "Creation's helper wins when it answers");
  assert.equal(LR.lineKey({type: "Mage"}, {of: () => { throw new Error("off"); }}), "mage", "a broken helper falls back");
  assert.equal(LR.tableLine("kuei-jin"), "kueijin");
  assert.equal(LR.tableLine("fera"), "werewolf");
  for ( const k of LR.KEYS ) assert.ok(LR.familyOf(k));
});

test("after a fight each line mends with its own power, by its book", () => {
  const chi = AC.lineMend("kuei-jin", {bashing: 2, lethal: 1, aggravated: 1}, 10);
  assert.deepEqual([chi.bashing, chi.lethal, chi.aggravated, chi.spent, chi.what], [2, 1, 1, 8, "Chi"], "a Chi a level, five for aggravated, two kept");
  const pathos = AC.lineMend("wraith", {bashing: 3, lethal: 1}, 4);
  assert.deepEqual([pathos.bashing, pathos.lethal, pathos.spent], [3, 1, 3], "a Pathos mends two bashing or one lethal");
  assert.equal(AC.lineMend("wraith", {aggravated: 2}, 9).aggravated, 0, "Pathos cannot mend aggravated");
  const faith = AC.lineMend("demon", {bashing: 3, lethal: 2}, 3);
  assert.deepEqual([faith.bashing, faith.lethal, faith.spent], [3, 1, 2], "one Faith for all bashing, one each lethal, one kept");
  const blood = AC.lineMend("vampire", {bashing: 1, lethal: 2}, 5);
  assert.deepEqual([blood.bashing, blood.lethal, blood.spent], [1, 2, 3], "the Kindred as before");
  assert.equal(AC.lineMend("ghoul", {lethal: 3}, 3).spent, 2, "a ghoul keeps one back");
  assert.equal(AC.lineMend("mage", {lethal: 3}, 9), null, "a mage heals with time");
  assert.equal(AC.lineMend("kuei-jin", {lethal: 3}, 2).spent, 0, "nothing past the reserve");
});

test("loved ones and lovers: each line's own checks and truths", () => {
  const k = H.weakSpotChecks("kueijin", "spouse", "harm", {name: "Mei"}).map(c => c.text).join(" ");
  assert.match(k, /fire soul/); assert.match(k, /Yin against the P'o/); assert.doesNotMatch(k, /Beast/);
  assert.match(H.weakSpotChecks("wraith", "child", "taken").map(c => c.text).join(" "), /Angst/);
  // B6453, checked against the books: no Torment for a demon's fear (Demon pdf 162: sins only), no Banality for a
  // changeling's grief (C20 pdf 268); the Garou roll Rage by the moon, the Kuei-jin Yin against the P'o
  assert.doesNotMatch(H.weakSpotChecks("demon", "lover", "harm").map(c => c.text).join(" "), /Torment/);
  assert.deepEqual(H.weakSpotChecks("demon", "lover", "harm")[0].roll, {pool: "willpower", diff: 7, fail: "willpower"});
  assert.deepEqual(H.weakSpotChecks("kueijin", "lover", "harm")[0].roll, {via: "fire", fail: "frenzy"});
  assert.deepEqual(H.weakSpotChecks("werewolf", "friend", "harm")[0].roll, {via: "rage", fail: "frenzy"});
  assert.equal(H.weakSpotChecks("werewolf", "friend", "death").find(c => c.roll).roll.via, "rage");
  assert.ok(!H.weakSpotChecks("changeling", "friend", "death").some(c => /Banality/.test(c.text) || c.roll?.fail === "banality"));
  assert.ok(H.lovedFailed({pool: "willpower"}, 0) && !H.lovedFailed({pool: "willpower"}, 1));
  assert.equal(H.lovedFailed({via: "beast"}, 0), false, "the Beast is Actions' own roll");
  assert.equal(H.lovedFailed({via: "rage"}, 9), false, "the Rage roll is decided by Actions' frenzy rules");
  // B6451: a household that talks starts a rumour
  assert.ok(H.householdTalks(2, 2) && !H.householdTalks(2, 3) && !H.householdTalks(0, 1));
  assert.match(H.householdRumour("Ana", "vampire"), /never seen by day/);
  assert.match(H.weakSpotChecks("vampire", "lover", "harm").map(c => c.text).join(" "), /Beast/, "the Kindred keep theirs");
  assert.equal(H.hindrance({line: "kueijin", humanity: 2}, {line: "mortal"}).cap, 2);
  assert.equal(H.hindrance({line: "demon", torment: 8}, {line: "mortal"}).cap, 2);
  assert.ok(H.hindrance({line: "mummy"}, {line: "mortal"}).notes.length);
  const house = [{id: "a", role: "spouse"}, {id: "b", role: "child"}, {id: "c", role: "servant"}];
  assert.equal(H.masqueradeRisk("vampire", house), 2);
  assert.equal(H.masqueradeRisk("kueijin", house), 2);
  assert.equal(H.masqueradeRisk("werewolf", house, {kinfolk: ["a", "b", "c"]}), 0, "Kinfolk know the truth");
  assert.equal(H.masqueradeRisk("werewolf", house, {kinfolk: ["a"]}), 1, "two who do not know");
  assert.equal(H.masqueradeRisk("mage", house), 0);
  assert.match(H.riskWords("werewolf", 1), /Veil/);
  assert.equal(H.riskWords("vampire", 1), " Mortals in a Kindred's haven: a risk to the Masquerade.", "the old words stay");
});

test("Fates, servants, households and duties follow the right line", () => {
  assert.equal(F.fatesLine("Vampire", "kindredeast"), "kuei-jin");
  assert.equal(F.fatesLine("Vampire", ""), "vampire");
  assert.ok(F.UNDYING.has("kuei-jin"));
  assert.equal(SW.keeperLine("kuei-jin"), "kuei-jin");
  assert.equal(SW.keeperLine("fera"), "werewolf");
  assert.equal(SW.keeperLine("hunter"), "");
  assert.ok(!SR.keeperRows({line: SW.keeperLine("kuei-jin"), year: 1500}).some(x => x.kind === "ghoul"), "a Kuei-jin never keeps ghouls");
  assert.deepEqual(RS.householdServes("werewolf"), {kind: "kinfolk", words: "Kinfolk of"});
  assert.equal(RS.householdServes("kuei-jin").kind, "cult");
  assert.equal(RS.householdServes("mage", "Order of Hermes"), null);
  assert.equal(RS.householdServes("mage", "Iteration X (Technocratic Union)").kind, "social");
  assert.equal(RS.householdServes("hunter"), null);
  assert.deepEqual(RS.parseServes("kinfolk:abc"), {kind: "kinfolk", id: "abc"});
  assert.deepEqual(RS.parseServes("abc"), {kind: "ghoul", id: "abc"}, "an old pick is a ghoul pick");
  assert.equal(DU.servantDuty("cult", "P", "kuei-jin").when, "day");
  assert.notEqual(DU.servantDuty("cult", "P", "mummy")?.when, "day");
  assert.ok(TRR.sensesFor("wraith").some(s => s.power === "Lifesight"));
  assert.ok(!TRR.sensesFor("kueijin").some(s => /Auspex/.test(s.power)), "no Auspex for a Cathayan");
});

// B6319: NPCs of every line refill their own pools
const RF = await imp("modules/wodx-npc/scripts/line-refill-rules.mjs");
const {readFileSync} = await import("node:fs");

test("refills: lines WoDX Actions rolls daily are marked once, the others are rolled here by their books", () => {
  assert.deepEqual(RF.enrollPatch("werewolf", {}), {key: "meditates", value: {hours: 2}});
  assert.equal(RF.enrollPatch("fera", {meditates: {hours: 4}}), null, "a mark already there is kept");
  assert.deepEqual(RF.enrollPatch("mage", {m20: {x: 1}}, {node: 3}).value, {x: 1, draws: {node: 3}});
  assert.equal(RF.enrollPatch("mummy", {}).value.dailyRegain.k, "haven");
  assert.equal(RF.enrollPatch("vampire", {}), null);
  for ( const l of ["vampire", "kuei-jin", "hunter", "mortal", "ghoul"] ) assert.deepEqual(RF.refillSteps(l, {}, {}, 5), [], l);
  const fae = RF.refillSteps("changeling", {glamour: {temp: 1, cap: 5}, holdings: 2}, {}, 10);
  assert.equal(fae[0].word, "Sanctuary"); assert.equal(fae[0].fixed, 2);
  // B6453, C20 pdf 170, 262-263: study first (Perception + Kenning at 8, a success a Dreamers dot), then the musing
  const sheet = {glamour: {temp: 1, cap: 5}, dreamers: 2, perception: 3, kenning: 2, manipulation: 3, inspire: 2};
  const study = RF.refillSteps("changeling", sheet, {}, 14);
  assert.equal(study[0].reverie, "study"); assert.equal(study[0].dice, 5); assert.equal(study[0].diff, 8); assert.equal(study[0].auto, 2);
  assert.equal(RF.stepGain(study[0], {mine: 4}, sheet.glamour), 0, "studying gives no Glamour yet");
  assert.deepEqual(RF.reverieMark(study[0], {succ: 3}, 14), {reverieDue: 21}, "three successes: a week");
  assert.deepEqual(RF.reverieMark(study[0], {succ: 1}, 14), {reverieDue: 44}, "one success: a month");
  assert.deepEqual(RF.reverieMark(study[0], {succ: 5}, 14), {reverieDue: 14}, "five: a few hours");
  assert.deepEqual(RF.reverieMark(study[0], {succ: 0}, 14), {}, "nothing found: next week");
  assert.deepEqual(RF.refillSteps("changeling", sheet, {reverieWeek: 2}, 14), [], "one study a week");
  assert.deepEqual(RF.refillSteps("changeling", sheet, {reverieDue: 21}, 18), [], "still musing");
  const muse = RF.refillSteps("changeling", sheet, {reverieDue: 21}, 21);
  assert.equal(muse[0].reverie, "inspire"); assert.equal(muse[0].dice, 5); assert.equal(muse[0].diff, 6);
  assert.equal(RF.stepGain(muse[0], {mine: 3}, sheet.glamour), 3, "a Glamour a success");
  assert.deepEqual(RF.reverieMark(muse[0], {succ: 0}, 21), {reverieDue: 28}, "a failure: another week");
  assert.equal(RF.reverieMark(muse[0], {succ: 0, botch: true}, 21).reverieDue, null, "a botch: start over");
  assert.ok(RF.botched([1, 3], 6) && !RF.botched([1, 7], 6) && !RF.botched([3, 4], 6));
  assert.deepEqual(RF.refillSteps("changeling", {glamour: {temp: 5, cap: 5}, holdings: 2}, {}, 10), [], "a full pool rolls nothing");
  const w = RF.refillSteps("wraith", {pathos: {temp: 2, cap: 10}, passion: 4, memoriam: 2}, {}, 7);
  assert.deepEqual(w.map(s => [s.word, s.dice, s.diff]), [["Passion", 4, 6], ["Memoriam", 2, 8]]);
  assert.equal(RF.refillSteps("wraith", {pathos: {temp: 2, cap: 10}, passion: 4}, {night: 7}, 7).length, 0, "once a night");
  const d = RF.refillSteps("demon", {faith: {temp: 1, cap: 4}, willpower: 5}, {}, 3);
  assert.equal(d[0].word, "Reaping"); assert.equal(d[0].contest.vs, 3);
  assert.equal(RF.refillSteps("demon", {faith: {temp: 1, cap: 4}, willpower: 5, thralls: 2}, {}, 3).length, 0, "thralls already offer Faith at dawn");
  assert.equal(RF.successes([10, 6, 1, 3], 6), 1);
  assert.equal(RF.stepGain({contest: {}}, {mine: 2, theirs: 1}, {temp: 1, cap: 4}), 1);
  assert.equal(RF.stepGain({}, {mine: 5}, {temp: 8, cap: 10}), 2, "never past the cap");
  assert.equal(RF.stepGain({fixed: 3}, {}, {temp: 0, cap: 5}), 3);
  assert.equal(RF.gainWord("pathos", 2, "Passion"), "+2 Pathos (Passion)");
});

test("wiring: the refill runs on the clock and the NPC api keeps every entry after the lines api", () => {
  const main = readFileSync(join(root, "modules/wodx-npc/scripts/main.mjs"), "utf8");
  const apiLine = main.split("\n").find(l => l.includes("const api = {version"));
  assert.ok(!/\/\/.*factionLooks/.test(apiLine), "no line comment swallows the rest of the api");
  assert.match(main, /REFILL\.listen\(\)/);
  const rf = readFileSync(join(root, "modules/wodx-npc/scripts/line-refill.mjs"), "utf8");
  assert.match(rf, /Hooks\.on\("updateWorldTime"/); assert.match(rf, /Hooks\.on\("wodxSkipEnd"/);
  assert.match(rf, /floatOver/); assert.match(rf, /whisper: gmIds\(\)/);
});

test("B6452: looking someone over rolls the viewer's line's sense for a hidden loyalty", async () => {
  const T = await imp("modules/wodx-npc/scripts/trust-rules.mjs");
  const wr = T.pickSense(T.sensesFor("wraith"), {powers: {}});
  assert.equal(wr.power, "Lifesight", "a wraith's own sense before plain Empathy");
  assert.equal(T.senseResult(wr, 2), "hint"); assert.equal(T.senseResult(wr, 3), "found"); assert.equal(T.senseResult(wr, 0), "none");
  const vNo = T.pickSense(T.sensesFor("vampire"), {powers: {}});
  assert.equal(vNo.power, "Empathy", "no Auspex: only Empathy");
  const vYes = T.pickSense(T.sensesFor("vampire"), {powers: {auspex: 4}});
  assert.equal(vYes.power, "Auspex (Telepathy)"); assert.equal(T.senseResult(vYes, 1), "found");
  assert.equal(T.senseDifficulty(vYes, {willpower: 7}), 7);
  assert.equal(T.senseDifficulty(T.LOYALTY_SENSES.find(s => s.line === "mortal"), {manipulation: 3, subterfuge: 2}), 5);
  assert.deepEqual(T.senseParts(wr), ["perception", "empathy"]);
  const src = readFileSync(join(root, "modules/wodx-npc/scripts/trust.mjs"), "utf8");
  assert.match(src, /Hooks\.on\("wodxLookOver"/); assert.match(src, /type: "trust\.found"/);
});

test("B6453: the Rage and fire soul rolls the loved-one checks use, as the books set them", async () => {
  const G = await import("../../modules/wodx-actions/scripts/garou-rules.js");
  const K = await import("../../modules/wodx-actions/scripts/kote-rules.js");
  // W20 p. 262: new moon 8 down to full 4, one less for the auspice's moon or in Crinos
  assert.equal(G.rageDifficulty({b: "w20", phaseIndex: 0, auspice: "philodox", form: "homid"}), 8);
  assert.equal(G.rageDifficulty({b: "w20", phaseIndex: 4, auspice: "philodox", form: "homid"}), 4);
  assert.equal(G.rageDifficulty({b: "w20", phaseIndex: 2, auspice: "philodox", form: "crinos"}), 5);
  assert.equal(G.frenzyCheck(4).result, "frenzy"); assert.equal(G.frenzyCheck(6).result, "thrall"); assert.equal(G.frenzyCheck(3).result, "none");
  // Kindred of the East pdf 138: two successes to either side decide; five turns and the urge passes
  const need = K.natureNeed("fire");
  assert.equal(K.natureStep({virtue: 0, po: 1, turn: 1}, 0, 1, need).result, "lapses");
  assert.equal(K.natureStep({virtue: 1, po: 0, turn: 1}, 1, 0, need).result, "resists");
  assert.equal(K.natureStep({virtue: 0, po: 0, turn: 4}, 0, 0, need).result, "passes");
});
