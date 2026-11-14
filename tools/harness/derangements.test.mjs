import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import * as D from "../../modules/wodx-chronicle/scripts/derangement-rules.mjs";

/* Derangements in play (B3913): what sets them off, the Willpower roll, a bout's roll effects, one from a loss */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = f => readFileSync(join(root, f), "utf8");

test("derangements: the box text names the table's entries", () => {
  assert.deepEqual(D.keysIn("Paranoia\nA phobia of fire"), ["paranoia", "phobia"]);
  assert.deepEqual(D.keysIn("Hears voices; perfectionist"), ["schizophrenia", "perfection"]);
  assert.deepEqual(D.keysIn(""), []);
});

test("derangements: every entry has a trigger, a hold difficulty and a roll effect", () => {
  for ( const [k, e] of Object.entries(D.TABLE) ) {
    assert.ok(e.label && e.trigger && e.grip, k);
    assert.ok(e.hold >= 6 && e.hold <= 8, k);
    assert.ok(e.mods.length && e.mods.every(m => Array.isArray(m.tags) && m.diff), k);
  }
});

test("derangements: a bout makes the named rolls harder, and only those", () => {
  const social = D.boutEffects(["paranoia"], {channel: "roll", tags: ["social", "voice"]});
  assert.equal(social.length, 1);
  assert.equal(social[0].diff, 2);
  assert.deepEqual(D.boutEffects(["paranoia"], {channel: "roll", tags: ["melee"]}), []);
  assert.deepEqual(D.boutEffects(["paranoia"], {channel: "resist", tags: ["social"]}), []);
  // Phobia and the low of Manic-depression reach every roll
  assert.equal(D.boutEffects(["phobia"], {channel: "roll", tags: ["melee"]})[0].diff, 2);
  assert.equal(D.boutEffects(["manic"], {channel: "roll", tags: []})[0].diff, 1);
});

test("derangements: a bout lasts the scene (an hour of game time)", () => {
  assert.ok(D.boutLive({keys: ["fugue"], at: 100}, 100 + 3599));
  assert.ok(!D.boutLive({keys: ["fugue"], at: 100}, 100 + 3600));
  assert.ok(!D.boutLive({keys: [], at: 100}, 101));
  assert.ok(!D.boutLive(null, 0));
  // the clock put back before the bout began
  assert.ok(!D.boutLive({keys: ["fugue"], at: 100}, 50));
});

test("derangements: the Willpower roll holds it off on a success", () => {
  assert.ok(D.holdResult("hysteria", {successes: 1}).held);
  assert.ok(!D.holdResult("hysteria", {successes: 0}).held);
  const b = D.holdResult("hysteria", {successes: 0, botch: true});
  assert.ok(!b.held && b.botch);
});

test("derangements: a loss writes a new one into the box, never one already held", () => {
  assert.equal(D.pickNew("frenzy", [], 0), "hysteria");
  assert.equal(D.pickNew("frenzy", ["hysteria"], 0), "bulimia");
  assert.equal(D.pickNew("frenzy", D.FROM_CAUSE.frenzy, 0.5), null);
  assert.equal(D.pickNew("nonsense", [], 0.99), D.FROM_CAUSE.other.at(-1));
  assert.equal(D.addToBox("", "hysteria", "a frenzy botch"), "Hysteria (a frenzy botch)");
  assert.equal(D.addToBox("Paranoia", "hysteria", ""), "Paranoia\nHysteria");
  assert.equal(D.addToBox("Paranoid", "paranoia", "x"), "Paranoid");
  assert.deepEqual(D.keysIn(D.addToBox("", "bulimia", "")), ["bulimia"]);
});

test("derangements: Chronicle wires the bout into roll effects and the api", () => {
  const f = src("modules/wodx-chronicle/scripts/derangements.mjs"), m = src("modules/wodx-chronicle/scripts/main.mjs");
  assert.match(f, /addSource\(\(actor, ctx\) =>/);
  assert.match(f, /registerCondition\(\{id: "deranged"/);
  assert.match(m, /derangements\.setupDerangements\(\)/);
  assert.match(m, /derangements: derangements\.derangementsApi/);
});
