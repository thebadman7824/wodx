import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* Phase 6k: the Reborn (WoDX Actions 3.10.0, Mummy: The Resurrection) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const M = await import(join(root, "modules/wodx-actions/scripts/mummy-rules.js"));

test("six Amenti, their soul parts and paths; six paths of Hekau (p. 56, Chapters Two and Four)", () => {
  assert.equal(Object.keys(M.AMENTI).length, 6);
  assert.deepEqual(Object.values(M.AMENTI).map(a => a.hekau), ["amulets", "alchemy", "celestial", "effigy", "necromancy", null]);
  assert.equal(Object.keys(M.HEKAU).length, 6);
  assert.equal(M.amentiOf("Kher-minu"), "kherminu");
  assert.equal(M.amentiOf("Udja-sen"), "udjasen");
  assert.equal(M.hekauOf("Amulet"), "amulets");
});

test("a spell: path + Trait, Sekhem spent, bought successes capped at the path; a ritual's extended successes (p. 78)", () => {
  const p = M.spellPlan({path: 2, trait: 3, level: 2, cost: 1, extra: 4, pool: 6, difficulty: 7});
  assert.deepEqual([p.dice, p.difficulty, p.autoSuccesses, p.spend, p.capped], [5, 7, 2, 3, true]);
  assert.equal(M.spellPlan({path: 1, level: 2}).ok, false);
  assert.equal(M.spellPlan({path: 3, level: 1, cost: 2, pool: 1}).ok, false);
  let s = M.ritualStep(undefined, 2, 3); assert.equal(s.done, false);
  s = M.ritualStep(s, 1, 3); assert.equal(s.done, true);
  assert.equal(M.ritualStep({got: 2}, 0, 3, true).failed, true);
  assert.equal(M.activeObjects(3, 2, 4), 7);
});

test("Sekhem: at the Balance; the Blessing a point a success, a botch costs one; semektet (pp. 143–144)", () => {
  assert.equal(M.sekhemCap(3, 5), 3);
  assert.deepEqual(M.blessing({successes: 4}, {pool: 1, cap: 3}), {pool: 3, gained: 2});
  assert.deepEqual(M.blessing({botch: true}, {pool: 1, cap: 3}), {pool: 0, gained: -1});
  assert.equal(M.semektet({pool: 0, inWeb: false, days: 75}).attributeLoss, 5);
  assert.equal(M.semektet({pool: 0, inWeb: false, days: 76, bandaged: true}).attributeLoss, 2);
  assert.equal(M.semektet({pool: 1}).weakened, false);
});

test("Ma'at: ten rows of offenses by Balance; the judges' verdict (pp. 141–143)", () => {
  assert.equal(M.OFFENSES.length, 10);
  assert.equal(M.offenseCounts(3, 3), true);
  assert.equal(M.offenseCounts(3, 7), false);
  assert.deepEqual(M.judgment({balance: 2, hekau: {amulets: 4, alchemy: 2}, traitsAbove5: {strength: 7}}), {hekau: {amulets: 2, alchemy: 1}, traits: {strength: 5}});
});

test("death and the resurrection: the khat's five levels, the Ba, at 8, the khat mended first (pp. 64, 136–138)", () => {
  assert.equal(M.KHAT.length, 5);
  assert.equal(M.BA[2].rest, "70 days");
  assert.deepEqual(M.resurrectPlan({spend: "sekhem", willpower: 5, ba: 2}), {pool: 7, difficulty: 8, cost: "sekhem"});
  assert.deepEqual(M.resurrectPlan({spend: "willpower", sekhem: 3, ba: 2}).pool, 5);
  const burned = M.resurrectOutcome({successes: 5}, {khat: 5, levels: 7});
  assert.equal(burned.risen, true); assert.equal(burned.conscious, false); assert.equal(burned.remaining, 7);
  assert.equal(M.resurrectOutcome({successes: 2}, {khat: 4}).risen, false);
  assert.equal(M.resurrectOutcome({successes: 9}, {khat: 1, levels: 7, rollsThisYear: 1}).attributeLoss, 1);
});

test("the Veil, mummy blood, experience, creation (pp. 56, 140, 145–146)", () => {
  assert.equal(M.veil(1), "catatonia");
  assert.equal(M.veil(10), "blasé");
  assert.deepEqual(M.bloodDrunk(3), {vampireGains: 6, sekhemLost: 3});
  assert.deepEqual([M.xpCost("hekau", 0), M.xpCost("hekau", 2, {favored: true}), M.xpCost("hekau", 2), M.xpCost("hekau", 2, {udjasen: true}), M.xpCost("balance", 3), M.xpCost("background", 0)], [7, 8, 12, 10, 21, 4]);
  assert.equal(M.STARTING.rebirth.balanceMax, 3);
});

test("wiring: the Mummy menu and API; gender-neutral text (B48)", () => {
  const main = readFileSync(join(root, "modules/wodx-actions/scripts/main.js"), "utf8");
  for ( const k of ["mummyCast", "mummySekhem", "mummyBalance", "mummyOffense", "mummyResurrect", "mummyVeil", "mummySetup"] ) assert.match(main, new RegExp(`${k}: withActor`));
  assert.match(readFileSync(join(root, "modules/wodx-actions/scripts/profile-menus.js"), "utf8"), /MENUS\.mummy = /);
  const words = /\b(he|she|him|her|his|hers|himself|herself)\b/i;
  for ( const f of ["mummy.js", "mummy-rules.js"] ) {
    const src = readFileSync(join(root, "modules/wodx-actions/scripts", f), "utf8");
    for ( const s of src.match(/`[^`]*`|"[^"\n]*"/g) ?? [] ) assert.ok(!words.test(s), `${f}: ${s.slice(0, 80)}`);
  }
});
