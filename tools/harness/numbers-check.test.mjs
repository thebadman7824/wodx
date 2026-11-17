/* Book-number check (B7050-B7052): the checker's text readers, and the rows the first pass corrected against their pages. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const NC = await import("../books/numbers-check.mjs");
const K = await import("../../modules/wodx-actions/scripts/kindred-rules.js");
const J = f => JSON.parse(fs.readFileSync(path.join(root, "modules/wodx-actions/data", f), "utf8")).powers;
const byId = (list, id) => list.find(p => p.id === id);
const V20 = J("disciplines-v20.json"), DA = J("disciplines-daw.json");

test("the text reader mends line-end hyphens and mojibake, and reads difficulties (B7050)", () => {
  const n = NC.norm("rolls Charisma + Survival (dif-\nficulty 6) toâ€™s");
  assert.match(n, /difficulty 6/);
  assert.deepEqual([...NC.difficultiesIn(n)], [6]);
  assert.deepEqual([...NC.difficultiesIn("a difficulty of seven or the difficulty is 8")], [7, 8]);
  assert.ok(NC.numbersIn("three successes and 10 dice").has(3));
});

test("the roll reader finds a page's first roll and its difficulty (B7050)", () => {
  assert.deepEqual(NC.proposeRoll("system roll manipulation + self control or instinct difficulty 8 to activate"), {pool: "manipulation+selfcontrol|instinct", diff: 8});
  assert.deepEqual(NC.proposeRoll("the player rolls willpower difficulty 6"), {pool: "willpower", diff: 6});
  assert.deepEqual(NC.proposeRoll("no dice here"), {});
});

test("the page offset is the commonest gap between pdf and printed page numbers (B7050)", () => {
  const pages = new Map([[10, "2\nCHAPTER\ntext"], [11, "3\ntext"], [12, "text\n4"], [13, "no number"]]);
  assert.equal(NC.offsetOf(pages), 8);
});

test("a row the book says differently is flagged, one that matches is not (B7050)", () => {
  const win = NC.norm("System: The player rolls Charisma + Survival (difficulty 6) to call them.");
  assert.deepEqual(NC.checkRow({pool: "charisma+survival", diff: 6, cost: "", effect: ""}, win), []);
  assert.ok(NC.checkRow({pool: "charisma+survival", diff: 7, cost: "", effect: ""}, win).some(x => /text says 6/.test(x)));
  assert.ok(NC.checkRow({pool: "", diff: "", cost: "", effect: ""}, win).some(x => /no roll in the row/.test(x)));
});

test("V20 rows corrected against their pages (B7051)", () => {
  // V20 pdf 228: three Willpower with the blood point
  assert.deepEqual(K.discCost(byId(V20, "v20-flowing-wall").c), {blood: 1, willpower: 3, variable: false, optional: false});
  assert.match(byId(V20, "v20-lightning-strike").e, /Perception \+ Occult/);
});

test("V20 Dark Ages rows corrected against their pages (B7052)", () => {
  for ( const id of ["presence-awe", "presence-entrancement", "presence-summon"] ) assert.equal(K.discCost(byId(DA, id).c).blood, 1, id);
  assert.equal(K.discCost(byId(DA, "quietus-hematus-blood-sweat").c).willpower, 1);
  assert.equal(byId(DA, "daimoinon-fear-of-the-void").r, "wits+intimidation");
  assert.equal(K.discDifficulty(byId(DA, "daimoinon-fear-of-the-void").diff, {t: {courage: 3}}), 7);
  assert.equal(K.discDifficulty(byId(DA, "mytherceria-changeling-ward").diff, {t: {willpower: 6}}), 8);
  assert.equal(K.discDifficulty(byId(DA, "mytherceria-changeling-ward").diff, {t: null}), 7);
  assert.equal(byId(DA, "dementation-eyes-of-chaos").r, "perception+enigmas");
  assert.equal(byId(DA, "ogham-thirst-of-donn").r, "strength+occult");
  assert.equal(byId(DA, "quietus-cruscitus-blood-essence").r, "willpower");
  assert.equal(byId(DA, "bardo-restore-humanitas").diff, "var");
  assert.equal(K.discCost(byId(DA, "bardo-restore-humanitas").c).variable, true);
});
