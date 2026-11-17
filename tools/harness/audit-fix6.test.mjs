import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* Done-claims audit fixes, group 6 (B6175 to B6179): Sheets, Creation, Library */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const RR = await imp("modules/wodx-sheets/scripts/sheet-roll-rules.mjs");
const U = await imp("modules/wodx-library/scripts/use-rules.mjs");
const G = await imp("modules/wodx-library/scripts/gear-rules.mjs");
const D = await imp("modules/wodx-library/scripts/gadget-rules.mjs");
const src = p => readFileSync(join(root, p), "utf8");

test("B6175: a sheet roll sums the trait effects, the powers and the conditions", () => {
  const m = RR.combine({traits: {dice: -1, diff: 1, parts: ["Drunk -1", "Nightmares +1 diff"]}, powers: {dice: 2, diff: 0, parts: ["Boost +2"]},
    conditions: [{name: "Drained", mods: {ownDiff: 1}}, {name: "Blinded", mods: {ownDiffVision: 2}}, {name: "Held", mods: {attackDiceVs: 2}}]});
  assert.deepEqual(m, {dice: 1, diff: 2, parts: ["Drunk -1", "Nightmares +1 diff", "Boost +2", "Drained +1 diff"]});
  // a Perception roll counts what spoils sight
  assert.equal(RR.combine({conditions: [{name: "Blinded", mods: {ownDiffVision: 2}}], sight: true}).diff, 2);
  assert.deepEqual(RR.combine({}), {dice: 0, diff: 0, parts: []});
});

test("B6175: the system window's bonus and difficulty with the parts on, held between the lowest and 10", () => {
  assert.deepEqual(RR.applyTo({bonus: 0, difficulty: 6}, {dice: -1, diff: 1}), {bonus: -1, difficulty: 7, capped: false});
  assert.deepEqual(RR.applyTo({bonus: 2, difficulty: 9}, {dice: 0, diff: 3}), {bonus: 2, difficulty: 10, capped: true});
  assert.equal(RR.applyTo({bonus: 0, difficulty: 3}, {diff: -4}, 2).difficulty, 2);
  assert.match(RR.cardLine({dice: -1, diff: 1, parts: ["Drunk -1", "Nightmares +1 diff"]}), /^WoDX: Drunk -1; Nightmares \+1 diff \(-1 dice, \+1 difficulty\)$/);
  assert.equal(RR.cardLine({parts: []}), "");
});

test("B6175: the general roll window is wrapped once, its fields put back, behind a world setting", () => {
  const s = src("modules/wodx-sheets/scripts/sheet-rolls.mjs");
  assert.match(s, /DialogGeneralRoll/);
  assert.match(s, /proto\._generalRoll = wrapped/);
  assert.match(s, /o\.bonus = keep\.bonus; o\.difficulty = keep\.difficulty/);
  assert.match(s, /"sheetRollMods"[\s\S]*default: true/);
  assert.match(src("modules/wodx-sheets/scripts/main.mjs"), /SROLL\.setup\(\)/);
});

test("B6178: the Nature row on the system's own layout", () => {
  const s = src("modules/wodx-sheets/scripts/main.mjs");
  assert.match(s, /Hooks\.on\("renderActorSheet", natureRow\)/);
  assert.match(s, /"nature" in actor\.system/);
});

test("B6177: first aid reads the card's result and puts the patient under care", () => {
  assert.deepEqual(U.careResult(`<div class="vta-res">Failure</div><div class="vta-res good">2 successes: moderate</div>`), {successes: 2, botch: false});
  assert.deepEqual(U.careResult(`<div class="vta-res bad">BOTCH</div>`), {successes: 0, botch: true});
  assert.equal(U.careResult("<p>no roll</p>"), null);
  assert.equal(U.careOutcome({successes: 1, botch: false}).treated, true);
  assert.equal(U.careOutcome({successes: 0, botch: false}).treated, false);
  assert.equal(U.careOutcome({successes: 0, botch: true}).treated, false);
  assert.equal(U.careOutcome(null).treated, false);
});

test("B6177: an item named in free text finds the book's Gear by era item", () => {
  const data = JSON.parse(src("modules/wodx-library/data/gear.json"));
  const ax = G.byName(data.items, "a battle-axe", "dark-ages");
  assert.equal(ax?.name, "Battle-Ax");
  assert.equal(ax?.type, "Melee Weapon");
  assert.equal(G.byName(data.items, "Battle-Ax (fine)")?.name, "Battle-Ax");
  assert.equal(G.byName(data.items, "Pistol, Hvy.")?.type, "Ranged Weapon");
  assert.equal(G.byName(data.items, "no such thing"), null);
});

test("B6177: a planting is ready once its days are past (the clock ripens it)", () => {
  const crop = D.cropOf("seed potatoes");
  assert.ok(crop);
  assert.equal(D.plantState({at: 0}, crop, (crop.days - 1) * 86400).state, "growing");
  assert.equal(D.plantState({at: 0}, crop, crop.days * 86400).state, "ready");
  assert.match(src("modules/wodx-library/scripts/use.mjs"), /DU\.ripenTick\(t\)/);
});

test("B6177: the ward waits for Chronicle when its api is not there yet", () => {
  assert.match(src("modules/wodx-library/scripts/faith-use.mjs"), /Hooks\.once\("wodxChronicleReady"/);
  assert.match(src("modules/wodx-actions/scripts/m20.js"), /TH\.resistMods\(target, \["magic"/);
});

test("B6176, B6179: a change of state hands the player the new sheet; lineage links follow the archive", () => {
  for ( const f of ["change-of-state.mjs", "states.mjs", "first-change.mjs"] ) assert.match(src(`modules/wodx-creation/scripts/${f}`), /await handOver\(/);
  assert.match(src("modules/wodx-creation/scripts/lineage.mjs"), /Compendium\.world\.wodx-archive\.Actor\./);
  assert.match(src("modules/wodx-creation/scripts/advance.mjs"), /api\?\.upkeep;/);
});
