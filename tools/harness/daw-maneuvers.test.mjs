import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as R from "../../modules/wodx-rules/combat/rules.js";
import {outcomesOf} from "../../modules/wodx-actions/scripts/mage-da-effects.js";

const src = p => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

/* B7937: the Garou's maneuvers and pack tactics, Dark Ages: Werewolf pp. 102-105 */
test("DA:W maneuvers: difficulties over a claw or bite, forms and pack needs", () => {
  const base = 6;
  assert.deepEqual(["hamstring", "jawlock", "leapingrake", "furgnarl", "gnarled"].map(k => base + R.DAW[k].diff), [8, 6, 8, 7, 8]);
  assert.equal(R.DAW.hamstring.dmg, -1, "Strength, a point under a claw's Strength + 1");
  assert.equal(R.DAW.jawlock.noDamage, true);
  assert.equal(R.DAW.leapingrake.actions, 2);
  assert.equal(R.dawWhy("hamstring", {shifter: false}), "Hamstring is a Garou maneuver");
  assert.match(R.dawWhy("hamstring", {shifter: true, form: "homid"}), /Crinos or Hispo or Lupus/);
  assert.equal(R.dawWhy("hamstring", {shifter: true, form: "lupus", brawlAttack: true}), "");
  assert.match(R.dawWhy("leapingrake", {shifter: true, form: "lupus"}), /Glabro or Crinos/);
  assert.equal(R.dawWhy("leapingrake", {shifter: true, form: "crinos", brawlAttack: false}), "", "a weapon may stand in for the claw");
  assert.match(R.dawWhy("savage", {shifter: true, form: "hispo", down: false}), /knocked down/);
  assert.equal(R.dawWhy("savage", {shifter: true, form: "hispo", down: true}), "");
  assert.equal(R.maneuverKey(R.DAW.furgnarl), "furgnarl");
});

test("DA:W maneuvers: the numbers the marks use", () => {
  assert.deepEqual([0, 1, 2, 3, 5].map(R.gnarlPoints), [0, 0, 1, 1, 2]);
  assert.deepEqual([1, 3, 6, 9].map(R.savageStandDiff), [5, 7, 10, 10]);
  assert.equal(R.jawLockResult(3, 2).pinned, true);
  assert.equal(R.jawLockResult(2, 2).bite, true);
  assert.equal(R.tauntDiff(3), 7);
  assert.deepEqual([1, 2, 5].map(R.tauntDice), [0, 1, 2]);
  assert.deepEqual(R.harryResult(2, 1), {driven: true, willpower: 1, pursuitUp: 0, line: "driven on into another of the pack: -1 Willpower"});
  assert.equal(R.harryResult(1, 3).pursuitUp, 2);
});

test("DA:W maneuvers are wired: the table for a shapechanger, the checks, soak, taunt, stand and the marks", () => {
  const main = src("modules/wodx-combat/scripts/main.js");
  assert.match(main, /isShifterActor\(actor\) \? \{ \.\.\.t2, \.\.\.R\.DAW \}/);
  assert.match(main, /R\.dawWhy\(mkey,/);
  assert.match(main, /fd\.maneuver === "gnarled" \? GM\.gnarlOf\(target\)/);
  assert.match(main, /Taunted -\$\{tz\}/);
  assert.match(main, /R\.savageStandDiff\(savaged\)/);
  assert.match(main, /GM\.afterHit\(mkey,/);
  assert.match(main, /name: "WoDX: Taunt"/);
  assert.match(main, /name: "WoDX: Harry the prey"/);
  const gm = src("modules/wodx-combat/scripts/garou-maneuvers.js");
  for ( const re of [/Crippled: leg \(hamstrung\)/, /"Pinned by the jaws"/, /setFlag\(MOD, "gnarl"/, /setFlag\(MOD, "savaged"/, /setFlag\(MOD, "taunted"/, /"system\.advantages\.willpower\.temporary": wp/] ) assert.match(gm, re);
});

/* B7936: Survivor (Bone Gnawers, level 5, Dark Ages: Werewolf p. 131) */
test("Survivor: +3 soak dice and a ward against poison, a day a success", () => {
  const d = JSON.parse(src("modules/wodx-actions/data/gifts-daw.json"));
  const g = d.gifts.find(x => x.id === "survivor");
  assert.ok(g && g.l === 5 && g.p === 131 && g.g.includes("bone-gnawers") && g.r === "stamina+survival" && g.d === 7);
  const out = outcomesOf(g.spec, {label: g.n, source: "DA:W p. 131"}, 2, g.e);
  assert.equal(out.length, 2);
  assert.deepEqual([out[0].key, out[0].out.on, out[0].out.dice, out[0].out.timed.seconds], ["boost", "soak", 3, 2 * 86400]);
  assert.deepEqual([out[1].key, out[1].out.against, out[1].out.dice], ["ward", "poison", 3]);
  assert.match(src("modules/wodx-actions/scripts/garou.js"), /\(g\?\.book === "W20 CB" \|\| g\?\.spec\)/);
});
