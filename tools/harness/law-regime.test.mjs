import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Regime change (B3618-B3619) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const R = await imp("modules/wodx-chronicle/scripts/law-regime-rules.mjs");
const L = await imp("modules/wodx-chronicle/scripts/law-rules.mjs");

test("regime: the turns of rule come from the law records", () => {
  const t = R.turnsBetween(L.rowsFor("moravia"), 1197, 2022);
  const years = t.map(x => x.year);
  for ( const y of [1918, 1939, 1948, 1993] ) assert.ok(years.includes(y), String(y));
  assert.ok(t.every(x => x.year > 1197 && x.year <= 2022 && R.SWEEP[x.cause]));
  assert.equal(t.find(x => x.year === 1948).cause, "form");
  assert.ok(t.find(x => x.year === 1948).amnesty);
  assert.deepEqual(R.turnsBetween(L.rowsFor("moravia"), 1950, 1960), []);
  assert.ok(R.turnsBetween(L.rowsFor("russia"), 1900, 1920).some(x => x.year === 1917 && x.cause === "form"));
});

test("regime: a sweep empties seats, an election takes only one", () => {
  const seats = [0, 1, 2, 3, 4].map(rank => ({rank, holder: {id: `a${rank}`, name: `N${rank}`}, since: 1}));
  const all = R.sweepSeats(seats, {chance: 1, rand: () => 0.5});
  assert.equal(all.gone.length, 5);
  assert.ok(all.seats.every(s => !s.holder));
  const none = R.sweepSeats(seats, {chance: 0, rand: () => 0.5});
  assert.equal(none.gone.length, 0);
  const one = R.sweepSeats(seats, {only: "a2", rand: () => 0.99});
  assert.deepEqual(one.gone.map(g => g.id), ["a2"]);
  assert.equal(one.seats.filter(s => s.holder).length, 4);
  const pawn = R.sweepSeats([{rank: 1, holder: {id: "p", name: "P", pawnOf: "boss"}, since: 1}], {only: "boss"});
  assert.equal(pawn.gone.length, 1);
});

test("regime: elections only where a parliament is chosen by vote", () => {
  const at = r => y => L.lawOf(r, y);
  assert.ok(R.electionsBetween(at("moravia"), "latin", 1920, 1936).length > 0);
  assert.deepEqual(R.electionsBetween(at("moravia"), "latin", 1950, 1985), []);
  assert.deepEqual(R.electionsBetween(at("china"), "chinese", 1950, 2020), []);
  assert.deepEqual(R.electionsBetween(at("british-isles"), "common", 1300, 1700), []);
  assert.ok(R.electionsBetween(at("british-isles"), "common", 1840, 1860).every(y => y % 5 === 0));
  assert.ok(!R.electoral({year: 1700, rule: {council: "Parliament"}}, "latin"));
  assert.ok(!R.electoral({year: 1960, rule: {form: "A one-party state", council: "The National Assembly"}}, "latin"));
  const req = R.electionRequest({rank: 3, year: 1990, name: "Ana"});
  assert.equal(req.diff, 8);
  assert.deepEqual(req.pools, [["manipulation", "politics"]]);
});

test("regime: every line has a hook, and the wiring is in place", () => {
  for ( const k of ["vampire", "ghoul", "werewolf", "mage", "changeling", "wraith", "hunter", "mummy", "demon", "revenant"] ) assert.ok(R.LINE_REGIME[k], k);
  assert.match(src("modules/wodx-chronicle/scripts/main.mjs"), /registerRegimeHooks\(\)/);
  assert.match(src("modules/wodx-chronicle/scripts/law.mjs"), /checkTurns\(seen, y\)/);
  assert.match(src("modules/wodx-chronicle/scripts/law-regime.mjs"), /Hooks\.on\("wodxTown"/);
  assert.match(src("modules/wodx-storyteller/scripts/institutions.mjs"), /Hooks\.on\("wodxRegimeTurn"/);
  assert.match(src("modules/wodx-storyteller/scripts/towns.mjs"), /callAll\("wodxTown", \{[^}]*name, region\}/);
});
