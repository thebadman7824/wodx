import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Trials (B3608-B3609) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const T = await imp("modules/wodx-chronicle/scripts/law-trial-rules.mjs");
const L = await imp("modules/wodx-chronicle/scripts/law-rules.mjs");

test("trials: the land's law decides the form", () => {
  assert.ok(T.formsFor(L.lawOf("moravia", 1197)).includes("ordeal"));
  assert.ok(T.formsFor(L.lawOf("moravia", 1197)).includes("combat"));
  assert.equal(T.formsFor(L.lawOf("british-isles", 1700))[0], "jury");
  assert.equal(T.formsFor(L.lawOf("china", 1700))[0], "confession");
  assert.equal(T.formsFor(L.lawOf("russia", 1950))[0], "show");
  assert.ok(!T.formsFor(L.lawOf("moravia", 1900)).includes("ordeal"));
  assert.deepEqual(T.formsFor({}), ["judge"]);
  for ( const r of Object.keys(L.REGION_FAMILY) ) for ( const y of [1197, 1600, 1900, 2000] ) for ( const f of T.formsFor(L.lawOf(r, y)) ) assert.ok(T.FORMS[f], `${r} ${y} ${f}`);
});

test("trials: the roll, the bribe, the friend on the bench and the line", () => {
  const law = L.lawOf("british-isles", 1800);
  const base = T.trialRequest(law, {actorId: "a1", name: "Someone"});
  assert.equal(base.form, "jury");
  assert.ok(base.request.contest.dice >= 3);
  assert.deepEqual(base.request.actorIds, ["a1"]);
  const bribed = T.trialRequest(law, {bribed: true});
  assert.ok(bribed.request.diff < base.request.diff || law.bribe > 4);
  assert.ok(T.trialRequest(law, {courtRank: 3}).request.diff <= base.request.diff - 2);
  assert.ok(T.trialRequest(law, {line: "vampire"}).request.diff > base.request.diff, "the court sits by day");
  assert.ok(T.trialRequest(law, {deeds: 4}).request.contest.dice > base.request.contest.dice);
  assert.ok(T.trialRequest(L.lawOf("moravia", 1197), {form: "combat"}).combat);
  const ordeal = T.trialRequest(L.lawOf("moravia", 1197), {form: "ordeal", line: "vampire"});
  assert.equal(ordeal.request.contest, null);
  assert.ok(ordeal.notes.some(n => /fire/.test(n)));
  const show = T.trialRequest(L.lawOf("russia", 1950));
  assert.ok(show.request.diff >= 9);
  for ( const f of Object.keys(T.FORMS) ) { const t = T.trialRequest({proof: ["witnesses"], bribe: 3}, {form: f}); assert.ok(t.combat || (t.request.diff >= 3 && t.request.diff <= 10), f); }
});

test("trials: the verdict", () => {
  assert.equal(T.verdictOf({wins: true}).guilty, false);
  assert.equal(T.verdictOf({wins: false}).guilty, true);
  assert.equal(T.verdictOf({wins: true, botch: true}, "ordeal").guilty, true);
  assert.equal(T.verdictOf({pending: true}).guilty, null);
  for ( const l of Object.keys(T.LINE_TRIAL) ) assert.ok(l === "mortal" || T.LINE_TRIAL[l].note, l);
});

test("trials: the wiring", () => {
  const t = src("modules/wodx-chronicle/scripts/law-trial.mjs"), m = src("modules/wodx-chronicle/scripts/main.mjs");
  assert.match(t, /Hooks\.on\("wodxArrest"/);
  assert.match(t, /Hooks\.callAll\("wodxVerdict"/);
  assert.match(t, /hand\?\.call/);
  assert.match(m, /registerTrialHooks\(\)/);
});
