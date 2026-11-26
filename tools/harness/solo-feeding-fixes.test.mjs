import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The feeding fixes from the first solo test (25 Nov 2026): #2484, #2493, #2507, #2478, #2477. */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = f => readFileSync(join(root, f), "utf8");
const MAIN = src("modules/wodx-actions/scripts/main.js");
const R = await import(pathToFileURL(join(root, "modules/wodx-rules/solo/solo-rules.mjs")));

test("#2484: a status on a vessel the player does not own goes through the Storyteller's computer", () => {
  const fn = MAIN.slice(MAIN.indexOf("async function statusEffect("), MAIN.indexOf("async function statusEffect(") + 400);
  assert.match(fn, /!actor\.isOwner\) \{ requestGM\(\{ action: "status"/);
  assert.match(MAIN, /p\.action === "status" && \["dead", "unconscious"\]\.includes\(p\.id\)/);
});

test("#2493: a vessel drained dry gets no roll to stay conscious", () => {
  assert.match(MAIN, /if \(risk && vRemaining > 0\)/);
});

test("#2507: with a target, a player sees the vessel's details but cannot edit them", () => {
  assert.match(MAIN, /const fixed = !!vessel && !game\.user\?\.isGM;/);
  assert.match(MAIN, /fixed \? fixedFields\(\{ vType, vState, vtags \}\)/);
  assert.match(MAIN, /fd\.vtags !== undefined && !fixed/);
  const ff = MAIN.slice(MAIN.indexOf("function fixedFields("), MAIN.indexOf("function stateFields("));
  for ( const name of ["vessel", "cold", "vstate"] ) assert.match(ff, new RegExp(`type="hidden" name="${name}"`));
  assert.doesNotMatch(ff, /<select|<input type="(?:text|number)"/);
});

test("#2478: Give my blood is on the vampire's own menu and asks through WoDX Creation", async () => {
  const {MENUS} = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/profile-menus.js"))).catch(() => ({}));
  const menus = src("modules/wodx-actions/scripts/profile-menus.js");
  assert.match(menus, /\["Blood", \[\["api:hunt", "Hunt", "fa-paw"\], \["api:feed", "Feed on target", "fa-tint"\], \["api:giveBlood"/);
  if ( MENUS?.kindred ) {
    const roll = MENUS.kindred.sections.find(([t]) => t === "Roll")[1].map(([s]) => s);
    assert.ok(!roll.includes("api:hunt"), "Hunt left the Roll row");
  }
  assert.match(MAIN, /const API = \{[^}]*giveBlood, isVampire,/);
  const fn = MAIN.slice(MAIN.indexOf("export async function giveBlood("), MAIN.indexOf("/** Shared feeding:"));
  assert.match(fn, /api\?\.animals/);
  assert.match(fn, /animals\.canDrink/);
  assert.match(fn, /return animals\.feed\(tok, mine\)/);
});

test("#2477: a hunt's hours move the clock in solo play", () => {
  assert.equal(R.huntHours(0), 1);
  assert.equal(R.huntHours(5.5 * 3600), 5);
  assert.equal(R.huntHours(30 * 3600), R.HUNT_MAX_HOURS);
  assert.equal(R.spendSeconds(-5), 0);
  assert.equal(R.spendSeconds(3 * 3600), 10800);
  assert.equal(R.spendSeconds(99 * 3600), R.HUNT_MAX_HOURS * 3600);
  assert.match(MAIN, /body \+= huntTime\(used\);/);
  assert.match(MAIN, /solo\.api\.panel\.spend\(h \* 3600, "Hunting"\)/);
  const panel = src("modules/wodx-solo/scripts/panel.mjs");
  assert.match(panel, /"ask\.spend": p => spendTime\(p\.userId, p\.seconds, p\.label\)/);
  assert.match(panel, /pick === "hunt"/);
  assert.match(panel, /spend: \(seconds, label\) => ask\("ask\.spend"/);
});
