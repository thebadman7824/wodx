import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* Ben's Golconda Desk (B5090-B5099): losing it, trait caps, powers beyond it, the road, the aura, the sun, the Jyhad */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const KR = await import(join(root, "modules/wodx-actions/scripts/kindred-rules.js"));
const CR = await import(join(root, "modules/wodx-creation/scripts/rules.mjs"));
const SR = await import(join(root, "modules/wodx-senses/scripts/sight-rules.mjs"));
const RV = await import(join(root, "modules/wodx-npc/scripts/rivalry-rules.mjs"));

const saint = {flags: {"wodx-actions": {golconda: true}}};

test("go1: Golconda holds at Humanity 7 and Conscience 4, and falls below either (V20 Dark Ages p. 359)", () => {
  assert.equal(KR.golcondaHolds({road: 7, conscience: 4}), true);
  assert.equal(KR.golcondaHolds({road: 6, conscience: 5}), false);
  assert.equal(KR.golcondaHolds({road: 9, conscience: 3}), false);
});

test("go2: Traits to 10 whatever the Generation, back to the Generation's limit without it", () => {
  assert.equal(KR.golcondaTraitMax(true, 5), 10);
  assert.equal(KR.golcondaTraitMax(false, 5), 5);
  assert.equal(CR.traitMax({line: "vampire", kind: "attribute", generation: 13, golconda: true}), 10);
  assert.equal(CR.traitMax({line: "vampire", kind: "attribute", generation: 13}), 5);
  assert.equal(CR.traitMax({line: "vampire", kind: "virtue", generation: 13, golconda: true}), 5, "Virtues stay at 5");
});

test("go3: the powers that name Golconda cannot reach it", () => {
  assert.equal(KR.beyondGolconda("Speak Through the Blood"), true);
  assert.equal(KR.beyondGolconda("Summon Soul"), true);
  assert.equal(KR.beyondGolconda("Insight"), true);
  assert.equal(KR.beyondGolconda("Dread Gaze"), false);
});

test("go5, go6: a still aura and the halo", () => {
  const plain = SR.ringFor("aura", "kindred", {});
  const still = SR.ringFor("aura", "kindred", {golconda: true});
  assert.equal(plain.words, "pale");
  assert.equal(still.words, "pale and still");
  assert.equal(SR.ringFor("aura", "lupine", {golconda: true}).words, "bright and wild", "only a vampire's aura stills");
  assert.equal(SR.isGolconda(saint), true);
  assert.ok(SR.GOLCONDA_HALO.colour);
});

test("go7: the sun one step weaker; faint stays faint", () => {
  assert.equal(KR.golcondaSun("direct"), "cloudy");
  assert.equal(KR.golcondaSun("cloudy"), "indirect");
  assert.equal(KR.golcondaSun("faint"), "faint");
  assert.equal(KR.golcondaSun("shade"), "shade");
});

test("go8: masters of Golconda are drawn into no rivalry", () => {
  assert.equal(RV.inGolconda(saint), true);
  assert.equal(RV.inGolconda({flags: {}}), false);
});

test("go6: Read the Soul finds a vampire in Golconda still: no frenzy ripples, a stillness", async () => {
  globalThis.CONFIG ??= {}; globalThis.game ??= {};
  const OS = await import(join(root, "modules/wodx-otherworlds/scripts/senses.mjs"));
  const v = {type: "Vampire", system: {conditions: {isfrenzy: true}}, flags: {"wodx-actions": {golconda: true}}, getFlag: () => null};
  const r = OS.reading(v, 4);
  assert.ok(r.lines.some(l => /stillness/.test(l)), r.lines.join(" | "));
  assert.ok(!r.lines.some(l => /rippling/i.test(l)));
  assert.ok(r.draw.patterns.includes("still"));
  const plain = OS.reading({...v, flags: {}}, 4);
  assert.ok(!plain.lines.some(l => /stillness/.test(l)));
});

test("go4: the Grant button needs Humanity 7 and Conscience 4; other Roads go to the Storyteller", async () => {
  const src = (await import("node:fs")).readFileSync(join(root, "modules/wodx-chronicle/scripts/pod.mjs"), "utf8");
  assert.match(src, /export function readiness/);
  assert.match(src, /podGolcondaGrant/);
});
