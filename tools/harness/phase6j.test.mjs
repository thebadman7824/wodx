import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* Phase 6j: the Kuei-jin (WoDX Actions 3.10.0, Kindred of the East) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const K = await import(join(root, "modules/wodx-actions/scripts/kote-rules.js"));
const V = await import(join(root, "modules/wodx-actions/scripts/voice-rules.js"));

test("five Dharmas with their Virtues; the Dharma chart (p. 54)", () => {
  assert.equal(Object.keys(K.DHARMAS).length, 5);
  assert.deepEqual(Object.values(K.DHARMAS).map(d => d.virtue), ["po", "hun", "yin", "balance", "yang"]);
  assert.deepEqual([0, 3, 4, 5, 6, 7, 8, 9].map(K.chiPerTurn), [1, 1, 2, 2, 3, 4, 6, 8]);
  assert.deepEqual([5, 6, 9].map(d => K.dharmaLevel(d).pair), [10, 12, 18]);
  assert.equal(K.dharmaOf("Howl of the Devil-Tiger"), "devilTiger");
  assert.equal(K.dharmaOf("Thousand Whispers"), "whispers");
});

test("Dharma rolls: the Virtue (Balance the average of highest and lowest) against the P'o (p. 53)", () => {
  assert.equal(K.dharmaVirtue("whispers", {yin: 4, yang: 2, hun: 1, po: 3}), 2);
  assert.equal(K.dharmaVirtue("crane", {hun: 4}), 4);
  assert.equal(K.dharmaOutcome("auspicious", 3, 1).dharma, 1);
  assert.equal(K.dharmaOutcome("auspicious", 1, 3).poTakes, true);
  assert.equal(K.dharmaOutcome("blindness", 1, 3).dharma, -1);
  assert.equal(K.dharmaOutcome("blindness", 2, 2).dharma, 0);
});

test("Chi: imbalance permanent and temporary; the explosion; hunger (pp. 136, 139–140)", () => {
  assert.equal(K.permImbalance(6, 3), "yin");
  assert.equal(K.permImbalance(4, 3), "");
  assert.deepEqual(K.tempImbalance({yin: 4, yang: 3, yinChi: 2, yangChi: 0}), ["yin"]);
  assert.deepEqual(K.tempImbalance({yin: 4, yang: 4, yinChi: 3, yangChi: 6}), ["yang"]);
  assert.deepEqual(K.chiExplosion({yin: 3, yang: 3, yinChi: 5, yangChi: 4}).aggravated, 3);
  assert.equal(K.hunger(6), "fed");
  assert.equal(K.hunger(4), "hungry");
  assert.equal(K.hunger(2), "ravenous");
  assert.equal(K.hunger(4, true), "ravenous");
  assert.equal(K.hunger(1, true), "uncontrollable");
});

test("feeding: blood the lesser kind first then alternating (the book's example); a mood; flesh; ten at most (pp. 134, 137)", () => {
  assert.deepEqual(K.feedBlood({yinChi: 3, yangChi: 1}, 3), {yinChi: 4, yangChi: 3, wasted: 0});
  assert.deepEqual(K.feedBlood({yinChi: 0, yangChi: 0}, 2, "yin"), {yinChi: 2, yangChi: 0, wasted: 0});
  assert.equal(K.feedBlood({yinChi: 10, yangChi: 10}, 2).wasted, 2);
  assert.deepEqual(K.FLESH.cold, [8, 2]);
  assert.equal(K.FEEDING.breath.dharma, 5);
});

test("the soul's states: two successes, five turns, ravenous and imbalance (pp. 136, 139, 150–151)", () => {
  assert.equal(K.NATURES.fire.resist, "yin");
  assert.equal(K.NATURES.wave.resist, "yang");
  assert.equal(K.NATURES.shadow.resist, "hun");
  assert.deepEqual(K.natureNeed("fire", {ravenous: true}).po, 1);
  assert.deepEqual(K.natureNeed("fire", {imbalance: "yin"}).po, 3);
  let s = K.natureStep(undefined, 1, 1);
  assert.equal(s.done, false);
  s = K.natureStep(s, 0, 1);
  assert.equal(s.result, "lapses");
  let t = {virtue: 0, po: 0, turn: 0};
  for ( let k = 0; k < 5; k++ ) t = K.natureStep(t, 0, 0);
  assert.equal(t.result, "passes");
});

test("Demon Chi: P'o against Hun + 3; four successes bring fire soul; it returns at dusk (p. 91)", () => {
  assert.equal(K.demonDiff(2), 5);
  assert.equal(K.demonDiff(9), 10);
  assert.equal(K.demonEvoke({successes: 1}).open, true);
  assert.equal(K.demonEvoke({successes: 4}).fire, true);
  assert.equal(K.demonRefresh(1, 3, 5), 3);
  assert.deepEqual(K.spendPlan({demonChi: 3, stamina: 2}, "demon", 3).ok, false);
  assert.deepEqual(K.spendPlan({dharma: 2, yangChi: 4}, "yang", 2).ok, false);
  assert.deepEqual(K.spendPlan({dharma: 6, yangChi: 4}, "yang", 3).aura, true);
});

test("rising, the sun, healing, slumber, Willpower, Horoscope, experience (pp. 86, 91, 139, 142, 145, 151)", () => {
  assert.deepEqual(K.awaken({yinChi: 2, yangChi: 2}, "yin").nights, 10);
  assert.equal(K.awaken({yinChi: 2, yangChi: 2, permImb: "yin"}, "yang").aspect, "yin");
  assert.equal(K.awaken({yinChi: 0, yangChi: 0}).rot, 1);
  assert.equal(K.awaken({yinChi: 0, yangChi: 3}, "yin").aspect, "yang");
  assert.equal(K.sunGrace({stamina: 5, yinChi: 3}), 2);
  assert.equal(K.sunGrace({stamina: 5, yinChi: 0}), 5);
  assert.equal(K.sunGrace({stamina: 3, yangImbalanced: true}), 15);
  assert.equal(K.healCost("aggravated"), 5);
  assert.equal(K.slumberPool(2, 4), 4);
  assert.equal(K.willpowerMax(3), 8);
  assert.equal(K.horoscopeHits([2, 7, 10, 5], "devilTiger", "South"), 2);
  assert.deepEqual([K.xpCost("discipline", 0), K.xpCost("discipline", 2), K.xpCost("virtue", 3), K.xpCost("virtue", 3, {imbalancedToward: true}), K.xpCost("po", 4)], [10, 16, 9, 6, 4]);
});

test("the inner voice of a Kuei-jin: the P'o and the Chi left", () => {
  assert.equal(V.pressure("beast", {kote: true, chi: 8, po: 3, hun: 3}).level, "calm");
  assert.equal(V.pressure("beast", {kote: true, chi: 4, po: 3, hun: 3}).level, "rising");
  assert.equal(V.pressure("beast", {kote: true, chi: 2, po: 3, hun: 3}).level, "breaking");
});

test("wiring: the Kuei-jin menu by the sheet's variant, the API, gender-neutral text (B48)", () => {
  const main = readFileSync(join(root, "modules/wodx-actions/scripts/main.js"), "utf8");
  for ( const k of ["kotFeed", "kotSpend", "kotNature", "kotDharma", "kotDemon", "kotRise", "kotSun", "kotHeal", "kotSight", "kotSetup"] ) assert.match(main, new RegExp(`${k}: withActor`));
  const pm = readFileSync(join(root, "modules/wodx-actions/scripts/profile-menus.js"), "utf8");
  assert.match(pm, /kind === "kindred" && ctx\.isKotE\?\.\(actor\)\) \? MENUS\.kote/);
  const words = /\b(he|she|him|her|his|hers|himself|herself)\b/i;
  for ( const f of ["kote.js", "kote-rules.js"] ) {
    const src = readFileSync(join(root, "modules/wodx-actions/scripts", f), "utf8");
    for ( const s of src.match(/`[^`]*`|"[^"\n]*"/g) ?? [] ) assert.ok(!words.test(s), `${f}: ${s.slice(0, 80)}`);
  }
});
