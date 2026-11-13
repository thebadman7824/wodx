import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* NPC memory and grudges (B3346-B3349) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const M = await imp("modules/wodx-npc/scripts/memory-rules.mjs");
const {YEAR, SEASON} = M;

test("memory: notes are cleaned and kept short", () => {
  const x = M.normNote({kind: "insult", at: 5, text: "  called them  a coward "});
  assert.equal(x.weight, -2);
  assert.equal(x.text, "called them a coward");
  assert.equal(x.seen, true);
  assert.equal(M.normNote({weight: -3}).kind, "cold");
  assert.equal(M.normNote({kind: "harm", weight: 40}).weight, 9);
  let m = {};
  for ( let i = 0; i < 30; i++ ) m = M.remember(m, "c1", {kind: "gift", at: i});
  assert.equal(m.c1.length, M.KEEP);
  assert.equal(new Set(m.c1.map(x => x.id)).size, M.KEEP, "ids stay distinct");
});

test("memory: a Nature sets how fast a wrong fades", () => {
  assert.equal(M.temperOf("Judge"), "unforgiving");
  assert.equal(M.temperOf("caregiver"), "kind");
  assert.equal(M.temperOf("Thrill-Seeker"), "fickle");
  assert.equal(M.temperOf(""), "even");
  const wrong = {kind: "betrayed", weight: -5, at: 0};
  assert.equal(M.weightNow(wrong, 300 * YEAR, "unforgiving"), -5, "some never forget, even over centuries");
  assert.ok(Math.abs(M.weightNow(wrong, 5 * YEAR, "even") + 2.5) < 0.01);
  assert.ok(M.weightNow(wrong, 5 * YEAR, "kind") > -0.2);
  const b = M.balance([wrong, {kind: "saved", weight: 4, at: 0}], 0, "even");
  assert.deepEqual(b, {grudge: 5, favour: 4, net: -1});
});

test("memory: a strong grudge picks a move it has the means for, then rests", () => {
  assert.equal(M.pickMove({grudge: 4, means: {rumours: true}}), null);
  assert.equal(M.pickMove({grudge: 5, means: {rumours: true}}).key, "talk");
  assert.equal(M.pickMove({grudge: 5, means: {rumours: true, boon: true}}).key, "boon");
  assert.equal(M.pickMove({grudge: 7, means: {}}), null, "no means, no move");
  assert.equal(M.pickMove({grudge: 9, means: {hunters: true}}).key, "hunters");
  assert.equal(M.pickMove({grudge: 9, means: {rumours: true}, last: {talk: 10}, now: 10 + SEASON}), null, "a cooldown of two seasons");
  assert.equal(M.pickMove({grudge: 9, means: {rumours: true}, last: {talk: 10}, now: 10 + 2 * SEASON}).key, "talk");
  assert.ok(M.seasonDue(0, SEASON) && !M.seasonDue(10, 10 + SEASON - 1));
});

test("memory: heirs inherit a strong grudge at half weight, and players see only what was done to the NPC's face", () => {
  const mem = {c1: [{kind: "kin", weight: -6, at: 0}], c2: [{kind: "insult", weight: -2, at: 0}]};
  const h = M.inherited(mem, 0, "even", "Old Hana");
  assert.deepEqual(Object.keys(h), ["c1"]);
  assert.equal(h.c1[0].weight, -3);
  assert.equal(h.c1[0].seen, false);
  assert.match(h.c1[0].text, /Old Hana/);
  const s = M.seenBy([{kind: "betrayed", at: 0}, {kind: "harm", at: 0, seen: false}], 0, "even");
  assert.equal(s.notes.length, 1);
  assert.equal(s.word, "Holds a grudge");
  assert.equal(M.seenBy([], 0).word, "Nothing much");
});

test("memory: attitude and trust feed it", () => {
  assert.equal(M.noteFromAttitude({delta: 0}), null);
  assert.equal(M.noteFromAttitude({delta: -2, why: "Intimidated"}, 7).kind, "cold");
  assert.equal(M.noteFromAttitude({delta: 1}).weight, 1);
  assert.equal(M.TRUST_KIND.betrayed, "betrayed");
  const f = src("modules/wodx-npc/scripts/memory.mjs");
  assert.match(f, /Hooks\.on\("wodxAttitude"/);
  assert.match(f, /propose\?\.\(\{type: TYPE/, "a move waits for the Storyteller");
  assert.match(f, /chronology\?\.died/);
  assert.match(src("modules/wodx-npc/scripts/trust.mjs"), /memory\?\.fromTrust/);
  const main = src("modules/wodx-npc/scripts/main.mjs");
  assert.match(main, /MEMORY\.registerHandler\(\)/);
  assert.match(main, /memory: \{remember: MEMORY\.remember/);
});
