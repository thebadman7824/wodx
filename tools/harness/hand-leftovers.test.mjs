import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The Storyteller's Hand, round two (B5170-B5178): what each approval or moment now does by itself */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const U = await imp("modules/wodx-library/scripts/use-rules.mjs");
const TB = await imp("modules/wodx-chronicle/scripts/trait-bite-rules.mjs");
const LH = await imp("modules/wodx-chronicle/scripts/law-heat-rules.mjs");
const E = await imp("modules/wodx-actions/scripts/effects-rules.js");
const CH = await imp("modules/wodx-interactables/scripts/chase.mjs");

test("B5178: a stimulant crashes about an hour later, softer and sooner when weak, later when strong", () => {
  assert.deepEqual(U.crashOf({}), {after: 3600, lasts: 86400});
  assert.equal(U.crashOf({strength: "weak"}).after, 1800);
  assert.equal(U.crashOf({strength: "weak"}).lasts, 43200);
  assert.equal(U.crashOf({scale: "stronger"}).after, 7200);
  assert.equal(U.CRASH.dice, -1);
  assert.ok(U.CRASH.tags.includes("all"));
  assert.equal(U.crashDue({at: 100}, 99), false);
  assert.equal(U.crashDue({at: 100}, 100), true);
  assert.equal(U.crashDue(null, 100), false);
  assert.match(src("modules/wodx-library/scripts/use.mjs"), /updateWorldTime[^\n]*crashTick/);
  assert.match(src("modules/wodx-storyteller/scripts/hardship.mjs"), /sleptOff/);
});

test("B5175: the feeding flaws and Berserker bite on their own", () => {
  assert.equal(TB.BITES["infectious-bite"].fail.infect, 0.2);
  assert.equal(TB.BITES["conspicuous-consumption"].fail.consume, true);
  assert.equal(TB.BITES["berserker"].fail.berserk, true);
  assert.equal(TB.infects(0.2, 2), true);
  assert.equal(TB.infects(0.2, 3), false);
  assert.equal(TB.FEVER.dice, -1);
  assert.equal(TB.FEVER.seconds, 7 * 86400);
  assert.match(src("modules/wodx-actions/scripts/main.js"), /vessel: vesselActor\?\.uuid/);
});

test("B5174: Untamable shrugs off Domination and the commanding Gifts only", () => {
  for ( const n of ["Command", "Mesmerize", "The Forgetful Mind", "Conditioning", "Possession", "Roll Over", "Mastery"] ) assert.equal(E.untamableStops(n), true, n);
  for ( const n of ["Awe", "Celerity", "Razor Claws"] ) assert.equal(E.untamableStops(n), false, n);
});

test("B5177: blackmail is a deed the law can heat", () => {
  assert.equal(LH.GRAVITY.extortion, 2);
  assert.equal(LH.DEED_WORDS.extortion, "blackmail");
  assert.match(src("modules/wodx-npc/scripts/trust.mjs"), /heat\?\.add\?\.\(by, "extortion"/);
});

test("B5176: a player breaking clear of a fight starts a chase", () => {
  assert.ok(CH.FLEE.close < CH.FLEE.broke);
  assert.equal(typeof CH.pcMoved, "function");
  assert.match(src("modules/wodx-interactables/scripts/main.mjs"), /chase\?\.pcMoved\?\./);
});

test("B5170-B5173: holy ground, Martyr, Marauder, the winds act", () => {
  assert.match(src("modules/wodx-actions/scripts/hunter.js"), /onHoly\(actor\) \? Math\.min\(10, f \+ 1\)|min\(10, ?f ?\+ ?1\)/);
  const sig = src("modules/wodx-chronicle/scripts/signatures.mjs");
  assert.match(sig, /wodxDamageApplied/);
  assert.match(sig, /registerTokenLook\("signatures\.marauder"/);
  assert.match(src("modules/wodx-actions/scripts/m20.js"), /marauder/);
  assert.match(src("modules/wodx-actions/scripts/demon.js"), /lore === "winds"/);
});
