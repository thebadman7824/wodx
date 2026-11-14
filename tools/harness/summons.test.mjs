import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* WoDX Actions B4820-B4829: the rules summoned beings live by, and the books' specs for every summoning power */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SR = await import(join(root, "modules/wodx-actions/scripts/summon-rules.js"));
const SS = await import(join(root, "modules/wodx-actions/scripts/summon-specs.js"));
const src = p => readFileSync(join(root, p), "utf8");

test("how many come: by successes, a fixed number, Faith, spent points; never fewer than one, held to the book's limit", () => {
  assert.equal(SR.countOf({by: "successes"}, {successes: 4}), 4);
  assert.equal(SR.countOf({by: "successes", mult: 0.5, max: 5}, {successes: 7}), 4);
  assert.equal(SR.countOf({by: "successes", mult: 50}, {successes: 3}), 150);
  assert.equal(SR.countOf({by: "fixed", fixed: 1}, {successes: 9}), 1);
  assert.equal(SR.countOf({by: "faith", max: "faith"}, {faith: 3}), 3);
  assert.equal(SR.countOf({by: "rage+gnosis-spent"}, {rageSpent: 2, gnosisSpent: 1}), 3);
  assert.equal(SR.countOf({by: "successes"}, {successes: 0}), 1);
  assert.equal(SR.countOf({by: "successes", max: "limit"}, {successes: 9, limit: 4}), 4);
});

test("how long it stays, in WoDX Chronicle's terms", () => {
  assert.deepEqual(SR.timedOf({kind: "rounds", n: 1, perSuccess: true}, {successes: 3}), {kind: "rounds", rounds: 3});
  assert.deepEqual(SR.timedOf({kind: "scene"}), {kind: "scene"});
  assert.deepEqual(SR.timedOf({kind: "night"}), {kind: "night"});
  assert.deepEqual(SR.timedOf({kind: "night", n: 1, perSuccess: true}, {successes: 3}), {kind: "time", seconds: 3 * 86400});
  assert.deepEqual(SR.timedOf({kind: "hours", n: 2}), {kind: "time", seconds: 7200});
  assert.equal(SR.timedOf({kind: "until-destroyed"}), null);
  assert.equal(SR.lastsText({kind: "night", n: 1, perSuccess: true}, {successes: 2}), "2 nights");
  assert.equal(SR.lastsText({kind: "upkeep"}), "while it is kept fed");
});

test("nothing a summoning makes stays for ever by accident: no timer and no other ending means the scene", () => {
  const r = SR.resolve({what: "spirit", profile: "called", lasts: {kind: "nonsense"}}, {successes: 2});
  assert.deepEqual(r.timed, {kind: "scene"});
  assert.equal(r.lasts, "the scene");
  for ( const kind of ["until-destroyed", "task", "upkeep", "until-dismissed"] ) {
    const x = SR.resolve({what: "corpse", profile: "servant", lasts: {kind}}, {successes: 1});
    assert.equal(x.timed, null, kind);
    assert.equal(x.dismiss, true, kind);
  }
});

test("control: servants obey, the called take orders, the wild go for the nearest; a Bind on the same casting holds a called being", () => {
  assert.equal(SR.resolve({what: "corpse", profile: "servant"}).control, "direct");
  assert.equal(SR.resolve({what: "spirit", profile: "called"}).control, "orders");
  assert.equal(SR.resolve({what: "shade", profile: "wild"}).control, "hostile");
  assert.equal(SR.resolve({what: "spirit", profile: "called"}, {bound: true}).control, "direct");
  assert.equal(SR.resolve({what: "shade", profile: "wild"}, {bound: true}).control, "hostile");
});

test("the keeping roll: Torment, the casting's successes + 4, the being's Willpower; ladders by successes; a botch turns it", () => {
  assert.equal(SR.diffOf("torment", {torment: 7}), 7);
  assert.equal(SR.diffOf("successes+4", {successes: 3}), 7);
  assert.equal(SR.diffOf("successes+4", {successes: 9}), 10);
  assert.equal(SR.diffOf("creature-willpower", {creatureWillpower: 8}), 8);
  const ladder = {fail: "free", ladder: [{min: 1, control: "none"}, {min: 3, control: "orders"}, {min: 5, control: "direct"}]};
  assert.equal(SR.controlAfter(ladder, {successes: 0}).mode, "hostile");
  assert.equal(SR.controlAfter(ladder, {successes: 1}).mode, "none");
  assert.equal(SR.controlAfter(ladder, {successes: 4}).mode, "orders");
  assert.equal(SR.controlAfter(ladder, {successes: 6}).mode, "direct");
  assert.equal(SR.controlAfter(ladder, {botch: true}).fail, "attack-summoner");
  const each = {fail: "attack-nearest"};
  assert.equal(SR.controlAfter(each, {successes: 1}).mode, "kept");
  assert.equal(SR.controlAfter(each, {successes: 0}).mode, "hostile");
  assert.equal(SR.slipOf("attack-nearest").attack, "nearest");
  assert.equal(SR.slipOf("attack-summoner").attack, "summoner");
  assert.equal(SR.slipOf("leave").leaves, true);
});

test("upkeep and familiars (Mage 20th pp. 316-317)", () => {
  assert.deepEqual(SR.upkeepDue({every: "week"}, 0, 3 * 86400).periods, 0);
  assert.equal(SR.upkeepDue({every: "week"}, 0, 15 * 86400).periods, 2);
  assert.equal(SR.upkeepDue({every: "month"}, 0, 31 * 86400).periods, 1);
  const F = SR.familiarOf(3);
  assert.deepEqual(F.upkeep, {pool: "quintessence", points: 3, every: "week", fail: "leaves"});
  assert.equal(F.paradoxCap, 15);
  assert.deepEqual(SR.familiarDeath(3, 2), {willpower: 1, quintessence: 2, paradox: 4});
  assert.deepEqual(SR.familiarDeath(1, 9), {willpower: 1, quintessence: 2, paradox: 0});
});

test("the card says how long, who commands it and the keeping roll", () => {
  const r = SR.resolve({what: "animal", profile: "wild", count: {by: "successes"}, lasts: {kind: "scene"},
    roll: {when: "each-turn", who: "summoner", pool: "willpower", diff: "torment", fail: "attack-nearest"}}, {successes: 3, torment: 6});
  const lines = SR.cardLines(r, {caster: "Azrael"});
  assert.match(lines[0], /3 of them \(animal\), for the scene/);
  assert.match(lines.join(" "), /Each of its turns: Azrael rolls Willpower at 6; failing, it goes for the nearest living thing/);
  assert.ok(!lines.join(" ").match(/\b(she|her|he|him|his)\b/i));
});

test("every summoning power in the inventory has a spec, or is marked as not a summoning", () => {
  assert.ok(Object.keys(SS.SPECS).length >= 80, `${Object.keys(SS.SPECS).length} specs`);
  for ( const [k, s] of Object.entries(SS.SPECS) ) {
    assert.ok(SR.WHAT[s.what], `${k}: what ${s.what}`);
    assert.ok(SR.PROFILES[s.profile], `${k}: profile ${s.profile}`);
    assert.ok(s.page, `${k}: page`);
    const r = SR.resolve(s, {successes: 3, faith: 3, torment: 5});
    assert.ok(r.timed || ["task", "until-destroyed", "upkeep", "until-dismissed"].includes(r.lastsKind), `${k}: no ending`);
    assert.ok(r.count >= 1, `${k}: count`);
    if ( s.upkeep ) assert.ok(["day", "week", "month"].includes(s.upkeep.every), `${k}: upkeep`);
    assert.ok(!/\b(she|her|he|him|his)\b/i.test(s.note ?? ""), `${k}: pronoun in note`);
  }
});

test("the effects card gives a Summon its rules and the Foundry side places, times, fights, keeps and dismisses", () => {
  const fx = src("modules/wodx-actions/scripts/effects.js");
  assert.match(fx, /export function summonResult/);
  assert.match(fx, /SUM\.bring\(/);
  const sm = src("modules/wodx-actions/scripts/summons.js");
  for ( const needle of ["applyTimed", "wodx-actions.summonEnd", "createEmbeddedDocuments(\"Combatant\"", "keepingRoll", "renderTokenHUD", "summonDismiss", "sweepUpkeep", "looks?.show", "serves"] )
    assert.ok(sm.includes(needle), needle);
  const main = src("modules/wodx-actions/scripts/main.js");
  assert.match(main, /SUM\.setup\(\)/);
  assert.match(main, /SUM\.connect\(/);
  assert.match(main, /summonDismiss/);
});
