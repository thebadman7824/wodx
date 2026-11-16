/* B6924: a no-botch roll effect. C20 p. 89: a Boggan's Crafts roll never botches. The effect kind runs from the
 * Chronicle trait and signature effects through sumEffects to the system's dice roller and WoDX Actions' rolls. */
import "./win-paths.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {join, dirname} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = p => import(pathToFileURL(join(root, p)));
const S = await load("modules/wodx-chronicle/scripts/signature-rules.mjs");
const T = await load("modules/wodx-chronicle/scripts/trait-rules.mjs");
const M = await load("system/worldofdarkness/module/scripts/wodx-roll-mods.js");
const read = p => readFileSync(join(root, p), "utf8");
const row = k => S.faeRows({kith: [k]})[0];

test("B6924: the Boggan row carries a Crafts no-botch effect, and only Crafts reads it", () => {
  const boggan = row("wod.bio.changeling.boggans");
  assert.deepEqual(boggan.effects, [{tags: ["crafts"], noBotch: true}]);
  const list = boggan.effects.map(e => ({...e, why: boggan.label}));
  const crafts = S.sigRollEffects(list, {tags: T.rollTags("dexterity", "crafts")});
  assert.equal(crafts.length, 1);
  assert.equal(crafts[0].noBotch, true);
  assert.equal(S.sigRollEffects(list, {tags: T.rollTags("dexterity", "athletics")}).length, 0);
});

test("B6924: sumEffects says noBotch and names it on the card, without moving dice or difficulty", () => {
  const s = T.sumEffects([{name: "Boggans", dice: 0, diff: 0, noBotch: true}, {name: "Tired", dice: -1, diff: 0}]);
  assert.equal(s.noBotch, true);
  assert.equal(s.dice, -1);
  assert.ok(s.parts.includes("Boggans: cannot botch"));
  assert.equal(T.sumEffects([{name: "Tired", dice: -1, diff: 0}]).noBotch, undefined, "no flag when nothing stops a botch");
});

test("B6924: the system's roller turns botching off for a no-botch roll, from a power window or the general one", () => {
  const dr = {actor: {id: "a"}, origin: "item", numDices: 4, difficulty: 6, targetlist: []};
  M.applyWodxRollMods(dr, {modsFor: () => ({dice: 0, diff: 0, parts: ["Boggans: cannot botch"], noBotch: true})});
  assert.equal(dr.wodxNoBotch, true);
  const general = {actor: {id: "a"}, origin: "general", numDices: 4, difficulty: 6, targetlist: []};
  assert.equal(M.wodxNoBotch(general, {modsFor: () => ({noBotch: true}), on: true}), true);
  assert.equal(M.wodxNoBotch({...general, origin: "soak"}, {modsFor: () => ({noBotch: true}), on: true}), false);
  assert.equal(M.wodxNoBotch(general, {modsFor: () => ({noBotch: true}), on: false}), false);
  assert.match(read("system/worldofdarkness/module/scripts/roll-dice.js"), /if \(wodxNoBotch\(diceRoll, wodxSrc\)\) canBotch = false;/);
});

test("B6924: WoDX Sheets and WoDX Actions carry it to their rolls", () => {
  assert.match(read("modules/wodx-sheets/scripts/sheet-roll-rules.mjs"), /noBotch/);
  const main = read("modules/wodx-actions/scripts/main.js");
  assert.match(main, /canBotch: !built\.noBotch/);
});
