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

/* B7054: the four Book Numbers Desk picks */
const PM = await import("../../modules/wodx-actions/scripts/power-mods.js");
const PE = await import("../../modules/wodx-actions/scripts/path-effects.js");
const FC = await import("../../modules/wodx-actions/scripts/fae-da-cantrips.js");
const W = await import("../../modules/wodx-atmosphere/scripts/weather-rules.mjs");
const fx = (outs) => outs.map((o, i) => ({id: `e${i}`, name: o.out.name ?? o.out.label, key: PM.keyFor(o.out), data: PM.timedData(o.out)}));

test("Hush makes a voice roll fail outright and leaves other rolls alone (Dark Ages: Fae p. 141)", async () => {
  const DAE = await import("../../modules/wodx-actions/scripts/mage-da-effects.js");
  const e = fx(DAE.outcomesOf(FC.CANTRIPS["hush"].spec, {key: "fortune", label: "Hush"}, 2));
  const voice = PM.modsFrom(e, {tags: ["charisma", "voice"]});
  assert.match(voice.blocked, /Hushed: the voice will not work/);
  assert.equal(voice.diff, 0);
  assert.equal(PM.modsFrom(e, {tags: ["dexterity", "athletics"]}).blocked, undefined);
  assert.match(FC.HUSH_BAR ?? "", /voice will not work/);
});

test("a hedge curse below level 5 reaches only the named group; level 5 reaches every roll (HH2 pp. 73-75)", () => {
  const c3 = PE.numinaOutcomes("curses", 3, 3, null, {group: "social"});
  const e3 = fx(c3);
  assert.equal(PM.modsFrom(e3, {tags: ["charisma", "subterfuge"]}).diff, 3);
  assert.equal(PM.modsFrom(e3, {tags: ["dexterity", "melee", "physical"]}).diff, 0);
  const c4 = fx(PE.numinaOutcomes("curses", 4, 3, null, {group: "mental"}));
  assert.deepEqual([PM.modsFrom(c4, {tags: ["perception", "awareness"]}).diff, PM.modsFrom(c4, {tags: ["perception", "awareness"]}).dice], [3, -1]);
  assert.equal(PM.modsFrom(c4, {tags: ["strength", "brawl"]}).dice, 0);
  const c5 = fx(PE.numinaOutcomes("curses", 5, 3, null, {group: "mental"}));
  for ( const tags of [["strength", "brawl"], ["charisma", "etiquette"], ["wits", "occult"]] ) {
    const m = PM.modsFrom(c5, {tags});
    assert.deepEqual([m.diff, m.dice], [4, -2], tags.join("+"));
  }
});

test("fog and rain take V20's Weather Control figures (V20 p. 229)", () => {
  const fog = W.finish({sky: "storm", precip: "none", fog: "thick", wind: "calm", tempNight: 4, tempDay: 8, snowLying: false});
  const rain = W.finish({sky: "overcast", precip: "rain", intensity: "moderate", fog: "none", wind: "breeze", tempNight: 8, tempDay: 12});
  const f = W.modifiers(fog).find(m => m.id === "senses"), r = W.modifiers(rain).find(m => m.id === "senses");
  assert.deepEqual([f.n, f.range, r.n, r.range], [1, 0.5, 2, 0.5]);
  assert.deepEqual(W.rollEffects(fog, ["perception", "sight"]).map(e => e.diff), [1]);
  assert.deepEqual(W.rollEffects(fog, ["dexterity", "ranged", "firearms"]), [], "fog shortens shots; it does not make them harder");
  assert.deepEqual(W.rollEffects(rain, ["perception", "hearing"]).map(e => e.diff), [2]);
  assert.deepEqual(W.rollEffects(rain, ["dexterity", "drive"]).map(e => [e.key, e.diff]), [["weather-drive", 2]]);
});

test("Invade the Mind costs a Willpower point only on a vampire (V20 Dark Ages p. 198)", () => {
  const c = byId(DA, "auspex-invade-the-mind").c;
  assert.equal(K.discCost(c, {t: {isVampire: true}}).willpower, 1);
  assert.equal(K.discCost(c, {t: {isVampire: false}}).willpower, 0);
  assert.equal(K.discCost(c).willpower, 0);
  assert.equal(K.discCost(c).when, "vampire");
});
