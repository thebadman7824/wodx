/* NPCs act on what the Storyteller used to settle by hand (B4880-B4885). */
import "./win-paths.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const BR = await load("modules/wodx-npc/scripts/bond-rules.mjs");
const H = await load("modules/wodx-npc/scripts/hearts-rules.mjs");
const TRR = await load("modules/wodx-npc/scripts/trust-rules.mjs");
const RR = await load("modules/wodx-storyteller/scripts/reach-rules.mjs");

test("a familiar's death costs Willpower and Quintessence, the shortfall as Paradox", () => {
  const c = BR.familiarCost(3, { willPerm: 6, willTemp: 6, quint: 4, paradox: 1 });
  assert.deepEqual(c.willpower, { permanent: 5, temporary: 5 });
  assert.equal(c.need, 6);
  assert.equal(c.quintessence, 0);
  assert.equal(c.short, 2);
  assert.equal(c.paradox, 3);
  const rich = BR.familiarCost(1, { willPerm: 3, willTemp: 1, quint: 10, paradox: 0 });
  assert.equal(rich.quintessence, 8);
  assert.equal(rich.paradox, 0);
  assert.equal(rich.willpower.temporary, 1);
  assert.ok(!/Storyteller rules/.test(src("modules/wodx-npc/scripts/bond-rules.mjs")));
});

test("a heartbreak comes from warmth of 2 or more broken", () => {
  assert.equal(H.heartbreakDue(3, 1, "betrayal"), true);
  assert.equal(H.heartbreakDue(2, 1, "roll", true), true);
  assert.equal(H.heartbreakDue(2, 1, "roll", false), false);
  assert.equal(H.heartbreakDue(1, -1, "betrayal"), false);
  assert.equal(H.heartbreakDue(3, 3, "cruelty"), false);
});

test("a call for help brings the watch or the police after the era's delay", () => {
  assert.deepEqual([RR.helpPlan("phone", 1950).minutes, RR.helpPlan("phone", 1950).words], [10, "the police"]);
  assert.equal(RR.helpPlan("phone", 1800).minutes, 30);
  assert.equal(RR.helpPlan("bell", 1300).minutes, 20);
  assert.equal(RR.helpPlan("bell", 1300).words, "the watch");
  assert.equal(RR.helpDue([{ at: 5 }, { at: 50 }], 10).length, 1);
});

test("a blackmailed NPC strikes back by its traits", () => {
  assert.equal(TRR.strikeMeans({ fight: 6 }), "attack");
  assert.equal(TRR.strikeMeans({ retainers: 2 }), "attack");
  assert.equal(TRR.strikeMeans({ mortal: true, byMonster: true }), "hunters");
  assert.equal(TRR.strikeMeans({}), "rumour");
  for (const k of ["attack", "hunters", "rumour"]) assert.ok(TRR.STRIKE_WORDS[k]);
});

test("the hand-off words are gone from the NPC tactics, letters, calls and losses", () => {
  const npc = src("modules/wodx-npc/scripts/main.mjs");
  assert.ok(!/the Storyteller rolls them as they come/.test(npc));
  assert.ok(!/the Storyteller decides who and rolls it/.test(npc));
  assert.ok(/routines\.noticeBy\(tok, t\)/.test(npc));
  const ix = src("modules/wodx-interactables/scripts/main.mjs");
  assert.ok(!/the Storyteller plays the other end\.`\);/.test(ix));
  assert.ok(/openLine/.test(ix) && /callHelp/.test(ix));
  assert.ok(/npcAnswer\(l\)/.test(src("modules/wodx-storyteller/scripts/letters.mjs")));
  assert.ok(/letterReply/.test(src("modules/wodx-npc/scripts/talk.mjs")));
  assert.ok(/moveMentorPoints/.test(src("modules/wodx-npc/scripts/legacy.mjs")));
  assert.ok(/shieldOf\(target\)/.test(src("modules/wodx-combat/scripts/main.js")));
  assert.ok(/wodxFactionTurn/.test(src("modules/wodx-npc/scripts/trust.mjs")));
});
