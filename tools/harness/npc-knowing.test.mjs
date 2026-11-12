import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import * as RV from "../../modules/wodx-npc/scripts/rivalry-rules.mjs";
import * as TK from "../../modules/wodx-npc/scripts/talk-rules.mjs";
import * as F from "../../modules/wodx-npc/scripts/faces-rules.mjs";

/* What an NPC can tell of a character, and what a player sees before meeting one (WoDX NPC 0.33.0, B1380-B1382) */

test("tellsLine: plainly inhuman, a sense, or seen; a mortal has nothing to tell", () => {
  assert.deepEqual(RV.tellsLine({}, {line: "kindred"}), {tells: false, how: null});
  assert.equal(RV.tellsLine({}, {line: "lupine", obvious: true}).how, "obvious");
  assert.equal(RV.tellsLine({senses: ["auspex"]}, {line: "kindred"}).how, "auspex");
  assert.equal(RV.tellsLine({senses: ["scent"]}, {line: "kindred"}).how, "scent");
  assert.equal(RV.tellsLine({senses: ["scent"]}, {line: "mage"}).tells, false);
  assert.equal(RV.tellsLine({senses: ["kenning"]}, {line: "fae"}).tells, true);
  assert.equal(RV.tellsLine({sawIt: true}, {line: "kindred"}).how, "saw it");
  assert.equal(RV.tellsLine({senses: ["auspex"], sawIt: true}, {line: "mortal", obvious: true}).tells, false);
  assert.equal(RV.tellsLine({senses: ["Second Sight"]}, {line: "Wraith"}).tells, true);
});

test("sawSecret: a recorded witness remembers until made to forget", () => {
  const entries = [{byUuid: "Actor.v", witnesses: [{uuid: "Actor.m", state: "saw"}, {uuid: "Actor.f", state: "forgot"}]}];
  assert.equal(RV.sawSecret(entries, ["Actor.m"], ["Actor.v"]), true);
  assert.equal(RV.sawSecret(entries, ["Actor.f"], ["Actor.v"]), false);
  assert.equal(RV.sawSecret(entries, ["Actor.m"], ["Actor.x"]), false);
  assert.equal(RV.sawSecret(entries, ["Scene.s.Token.t.Actor.m", "Actor.m"], ["Actor.v"]), true);
  assert.equal(RV.sawSecret([{byUuid: "Actor.v", witnesses: [{uuid: "Actor.m", state: "told"}]}], ["Actor.m"], ["Actor.v"]), true);
  assert.equal(RV.sawSecret(null, ["Actor.m"], ["Actor.v"]), false);
  assert.equal(RV.sawSecret(entries, [], ["Actor.v"]), false);
});

test("knownSides: a witness who saw it knows the line, as a sense would show it", () => {
  const sides = RV.sidesOf({line: "kindred", sheet: {clan: "Brujah"}});
  assert.ok(!RV.knownSides({line: "mortal"}, {sides}).includes("line:kindred"));
  assert.ok(RV.knownSides({line: "mortal", sawIt: true}, {sides}).includes("line:kindred"));
  assert.ok(RV.knownSides({line: "mortal", senses: ["auspex"]}, {sides}).includes("line:kindred"));
  const mortal = RV.sidesOf({line: "mortal"});
  assert.ok(!RV.knownSides({line: "mortal", sawIt: true}, {sides: mortal}).includes("line:mortal"));
});

test("noticesTell: tells always notice; otherwise a steady seeded roll", () => {
  assert.equal(TK.noticesTell({tells: true, pool: 0, seed: 1}), true);
  for ( const seed of [1, 2, 99, 12345] ) assert.equal(TK.noticesTell({seed, pool: 4}), TK.noticesTell({seed, pool: 4}));
  let yes = 0;
  for ( let i = 0; i < 2000; i++ ) if ( TK.noticesTell({seed: TK.hashSeed("npc", "pc", i), pool: 0}) ) yes++;
  assert.ok(yes > 900 && yes < 1700, `three dice at 7 notice about two times in three (${yes}/2000)`);
  let sharp = 0;
  for ( let i = 0; i < 2000; i++ ) if ( TK.noticesTell({seed: TK.hashSeed("npc", "pc", i), pool: 8}) ) sharp++;
  assert.ok(sharp > yes, "a sharper eye notices more");
  assert.ok(TK.KIND_NOTICES.includes("kindred") && !TK.KIND_NOTICES.includes("wounded") && TK.NOTICE_ALWAYS.has("wounded"));
  assert.equal(TK.seededSuccesses(0, 6, 5), 0);
});

test("swapsFor and maskText: unmet NPCs become the stranger's words", () => {
  const people = [{name: "Anna Weber", flags: {stranger: "a woman in grey"}}, {name: "Anna", flags: {metBy: ["pc1"]}}, {name: "Bo", flags: {}},
    {name: "Kasimir", flags: {}, playerOwned: true}, {name: "Mira", flags: {}}];
  const sw = F.swapsFor({people, mine: ["pc1"], own: ["Mira"]});
  assert.deepEqual(sw.map(s => s.name), ["Anna Weber", "Bo"]);
  assert.equal(F.maskText("Anna Weber greets Bo. Annabel and Bob too. Anna.", sw), "A woman in grey greets A stranger. Annabel and Bob too. Anna.");
  assert.equal(F.maskText("Then Anna Weber left.", sw), "Then a woman in grey left.");
  assert.deepEqual(F.swapsFor({people, gm: true}), []);
  assert.deepEqual(F.swapsFor({people, on: false}), []);
  assert.equal(F.maskText("Žofie (Anna Weber)", sw), "Žofie (a woman in grey)");
  assert.equal(F.maskText("", sw), "");
  assert.equal(F.maskText("a+b", [{name: "a+b", as: "x"}]), "X");
});

test("wiring: fights, talk and faces use what the NPC can tell", () => {
  const main = readFileSync(new URL("../../modules/wodx-npc/scripts/main.mjs", import.meta.url), "utf8");
  assert.match(main, /supernatural: canTell\(tok, t\)/);
  assert.match(main, /tells: \(a, b\) => rivalry\.tells\(a, b\)/);
  const talk = readFileSync(new URL("../../modules/wodx-npc/scripts/talk.mjs", import.meta.url), "utf8");
  assert.match(talk, /TK\.noticesTell\(/);
  const faces = readFileSync(new URL("../../modules/wodx-npc/scripts/faces.mjs", import.meta.url), "utf8");
  assert.match(faces, /renderChatMessageHTML/);
  assert.match(faces, /renderCombatTracker/);
  const rv = readFileSync(new URL("../../modules/wodx-npc/scripts/rivalry.mjs", import.meta.url), "utf8");
  assert.match(rv, /knownTo, tells, knowledgeOf, regardOf/);
});

test("noteSeen and hasSeen: the witness keeps who it saw for what", () => {
  let m = RV.noteSeen({}, "abc123", "kindred", 50);
  assert.deepEqual(m, {abc123: {secret: "kindred", at: 50}});
  assert.equal(RV.hasSeen(m, "abc123"), true);
  assert.equal(RV.hasSeen(m, "zzz"), false);
  assert.equal(RV.hasSeen(null, "abc123"), false);
  m = RV.noteSeen(m, "bad id!", "mage", 1);
  assert.equal(Object.keys(m).length, 1);
  let big = {};
  for ( let i = 0; i < 205; i++ ) big = RV.noteSeen(big, `id${i}`, "fae", i);
  assert.equal(Object.keys(big).length, 200);
  assert.equal(RV.hasSeen(big, "id204"), true);
  assert.equal(RV.hasSeen(big, "id0"), false);
  const rv = readFileSync(new URL("../../modules/wodx-npc/scripts/rivalry.mjs", import.meta.url), "utf8");
  assert.match(rv, /Hooks\.on\("wodxSecretSeen"/);
});

test("fedMemory and noteFed: what a fed-on vessel keeps (B1384)", () => {
  assert.equal(RV.fedMemory({willing: true}), "nothing");
  assert.equal(RV.fedMemory({vessel: {kind: "mortal"}}), "lost time");
  assert.equal(RV.fedMemory({fought: true, vessel: {kind: "mortal"}}), "saw");
  assert.equal(RV.fedMemory({vessel: {kind: "ghoul"}}), "saw");
  assert.equal(RV.fedMemory({vessel: {kind: "Kindred"}}), "saw");
  assert.equal(RV.fedMemory({vessel: {kind: "mortal", knows: ["kindred"]}}), "saw");
  assert.equal(RV.fedMemory({vessel: {kind: "mortal", knows: "*"}}), "saw");
  assert.equal(RV.fedMemory({vessel: {kind: "mortal", knows: ["lupine"]}}), "lost time");
  let f = RV.noteFed({}, "v1", {at: 10});
  f = RV.noteFed(f, "v1", {at: 20, saw: true});
  f = RV.noteFed(f, "v1", {at: 30});
  assert.deepEqual(f.v1, {at: 30, times: 3, saw: true});
  assert.deepEqual(RV.noteFed(f, "no good!", {at: 1}), f);
  let big = {};
  for ( let i = 0; i < 60; i++ ) big = RV.noteFed(big, `k${i}`, {at: i});
  assert.equal(Object.keys(big).length, 50);
});

test("wiring: Actions sends wodxFed with the vessel; NPC hears it; nameFor in the API and the windows", () => {
  const am = readFileSync(new URL("../../modules/wodx-actions/scripts/main.js", import.meta.url), "utf8");
  assert.match(am, /Hooks\.callAll\("wodxFed", \{ by: \{ uuid: actor\.uuid/);
  const rv = readFileSync(new URL("../../modules/wodx-npc/scripts/rivalry.mjs", import.meta.url), "utf8");
  assert.match(rv, /Hooks\.on\("wodxFed"/);
  const main = readFileSync(new URL("../../modules/wodx-npc/scripts/main.mjs", import.meta.url), "utf8");
  assert.match(main, /nameFor: Faces\.nameFor, knowledgeOf:/);
  const so = readFileSync(new URL("../../modules/wodx-actions/scripts/social.js", import.meta.url), "utf8");
  assert.match(so, /npcApi\(\)\?\.nameFor\?\.\(tok\)/);
  assert.match(so, /dialog\(`With \$\{viewName\(npcTok\)\}`/);
  const tr = readFileSync(new URL("../../modules/wodx-actions/scripts/trade.js", import.meta.url), "utf8");
  assert.match(tr, /Trade with \$\{viewName\(npcTok\)\}/);
});
