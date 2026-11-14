/**
 * The Storyteller's Hand, the Actions part (B4869-B4873): witnesses act on their line's rule, frenzy ends by itself,
 * derangements drawn by cause, the court's Blood Hunts and favours owed as boons.
 */
import "./win-paths.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const A = f => join(root, "modules/wodx-actions/scripts", f);
const load = p => import(pathToFileURL(p));
const W = await load(A("witness-rules.js"));
const G = await load(A("garou-rules.js"));
const M = await load(A("mummy-rules.js"));
const Dm = await load(A("demon-rules.js"));
const DR = await load(A("debts-rules.js"));
const SR = await load(A("social-rules.js"));
const D = await load(join(root, "modules/wodx-chronicle/scripts/derangement-rules.mjs"));
const H = await load(join(root, "modules/wodx-npc/scripts/hearts-rules.mjs"));
const table = JSON.parse(readFileSync(join(root, "modules/wodx-actions/data/garou.json"), "utf8")).delirium;

test("each line's rule gives a witness something to do on the map", () => {
  assert.equal(W.lineRule("lupine"), "delirium");
  assert.equal(W.lineRule("mummy"), "veil");
  assert.equal(W.lineRule("demon"), "revelation");
  assert.equal(W.lineRule("fae"), "mists");
  assert.equal(W.lineRule("wraith"), "hysteria");
  assert.equal(W.lineRule("kindred"), null);
  assert.equal(W.witnessAct(G.delirium(1, "w20", table).reaction), "freeze");
  assert.equal(W.witnessAct(G.delirium(2, "w20", table).reaction), "flee");
  assert.equal(W.witnessAct(G.delirium(4, "w20", table).reaction), "fight");
  assert.equal(W.witnessAct(M.veil(1)), "freeze");
  assert.equal(W.witnessAct(Dm.mortalReaction({ successes: 0 }).key), "freeze");
  assert.equal(W.witnessAct("curiosity"), null);
});

test("who keeps what they saw", () => {
  assert.equal(W.remembers("delirium", { memory: G.delirium(2, "w20", table).memory }), false);
  assert.equal(W.remembers("delirium", { memory: G.delirium(9, "w20", table).memory }), true);
  assert.equal(W.remembers("veil", { willpower: 4 }), false);
  assert.equal(W.remembers("veil", { willpower: 8 }), true);
  assert.equal(W.remembers("revelation", { reveal: "copes" }), true);
  assert.equal(W.remembers("mists", { banality: 7 }), false);
  assert.equal(W.remembers("mists", { banality: 3 }), true);
  assert.equal(W.remembers(null), true);
});

test("derangements are drawn by what caused them", () => {
  for (const c of ["frenzy", "sin", "fear", "loss", "binding", "other"]) {
    const k = D.pickNew(c, [], 0.5);
    assert.ok(D.TABLE[k], `${c}: ${k}`);
    assert.ok(D.FROM_CAUSE[c].includes(k));
  }
  assert.equal(D.pickNew("loss", D.FROM_CAUSE.loss, 0.5), null);
});

test("grief is rolled and does something", () => {
  assert.equal(H.griefDiff(true), 8);
  assert.equal(H.griefDiff(false), 7);
  assert.deepEqual(H.griefResult({ successes: 1 }, true), { held: true, lose: 0, derange: false });
  assert.deepEqual(H.griefResult({ successes: 0 }, false), { held: false, lose: 1, derange: false });
  assert.deepEqual(H.griefResult({ successes: 0, botch: true }, true), { held: false, lose: 1, derange: true });
  assert.ok(H.GREAT.includes("spouse"));
});

test("the court calls a hunt for fresh diablerie or a severe breach", () => {
  assert.equal(DR.huntDue({}), null);
  assert.equal(DR.huntDue({ marks: [{ at: 50, victim: "Old One" }], since: 100 }), null);
  assert.equal(DR.huntDue({ marks: [{ at: 150, victim: "Old One" }], since: 100 }).ground, "diablerie");
  const w = s => ({ state: s });
  assert.equal(DR.huntDue({ breaches: [{ id: "b", spread: true, witnesses: [w("saw"), w("saw")] }] }), null);
  assert.equal(DR.huntDue({ breaches: [{ id: "b", spread: false, witnesses: [w("saw"), w("saw"), w("told")] }] }), null);
  assert.equal(DR.huntDue({ breaches: [{ id: "b", spread: true, witnesses: [w("saw"), w("saw"), w("forgot"), w("told")] }] }).entry, "b");
  assert.equal(DR.huntDue({ breaches: [{ id: "b", huntSeen: true, spread: true, witnesses: [w("saw"), w("saw"), w("told")] }] }), null);
});

test("a favour won from another Kindred is owed back", () => {
  assert.equal(SR.favourBoon("persuade", "win", 1, true), "trivial");
  assert.equal(SR.favourBoon("persuade", "win", 3, true), "minor");
  assert.equal(SR.favourBoon("persuade", "win", 3, false), null);
  assert.equal(SR.favourBoon("persuade", "lose", 3, true), null);
  assert.equal(SR.favourBoon("intimidate", "win", 3, true), null);
});

test("the wiring is in place", () => {
  const k = readFileSync(A("kindred.js"), "utf8"), m = readFileSync(A("main.js"), "utf8"), dm = readFileSync(A("debts-marks.js"), "utf8");
  assert.match(k, /return witnessStep\(a, w, \{ secret: "lupine"/);
  assert.match(k, /setting\("autoWitness"\) !== false\) return witnessStep/);
  assert.match(m, /markBotch\(actor, fear, d\.diff\)/);
  assert.match(m, /frenzyHooks\(\);/);
  assert.match(dm, /Hooks\.on\("wodxFactionTurn"/);
  assert.match(readFileSync(join(root, "modules/wodx-npc/scripts/factions.mjs"), "utf8"), /Hooks\.callAll\("wodxFactionTurn"/);
  assert.ok(!/Storyteller's choice\)/.test(readFileSync(join(root, "modules/wodx-library/scripts/wonders-demon.mjs"), "utf8")));
});
