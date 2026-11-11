import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* "Only when" and "Then" lists (WoDX Chronicle 0.14.0) and NPC phases (WoDX NPC 0.9.0) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const W = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/when-rules.mjs")));
const NR = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/npc-rules.mjs")));
const ERAS = JSON.parse(src("modules/wodx-chronicle/data/eras.json"));
const eraIds = ERAS.profiles.map(e => String(e.id).toLowerCase());

const kindred = (o = {}) => ({pc: true, name: "Anna of Rothenstein", kind: "kindred", fields: {clan: "Tremere"}, factions: ["court"], items: ["Silver crucifix", "Purse"],
  codex: ["The abbot's letter"], conditions: [], traits: {blood: 3, willpower: 4, humanity: 6, wounds: 0, generation: 11}, ...o});
const night1300 = (actor = kindred()) => ({year: 1300, era: "dark-ages", hour: 23, night: true, moon: "Full moon", feast: "", fast: "Friday", season: "Lent", actor});

test("an empty list always passes", () => {
  assert.equal(W.checkWhen("", night1300()).ok, true);
  assert.equal(W.checkWhen("  # only a note\n", night1300()).ok, true);
});

test("every line must pass; not turns a line round", () => {
  const ctx = night1300();
  assert.equal(W.checkWhen("year 1200-1492\nnight\nkind kindred", ctx).ok, true);
  assert.equal(W.checkWhen("not clan Tremere", ctx).ok, false);
  assert.equal(W.checkWhen("clan Ventrue, Tremere", ctx).ok, true);
  const r = W.checkWhen("year 1200-1492\nday", ctx);
  assert.deepEqual(r.failed, ["day"]);
});

test("years, before and from, hours that wrap past midnight", () => {
  const at = (year, hour) => ({...night1300(), year, hour});
  assert.equal(W.checkWhen("before 1890", at(1889, 1)).ok, true);
  assert.equal(W.checkWhen("before 1890", at(1890, 1)).ok, false);
  assert.equal(W.checkWhen("from 1890", at(1890, 1)).ok, true);
  assert.equal(W.checkWhen("year >= 2026", at(2030, 1)).ok, true);
  assert.equal(W.checkWhen("hour 22-4", at(1300, 23)).ok, true);
  assert.equal(W.checkWhen("hour 22-4", at(1300, 3)).ok, true);
  assert.equal(W.checkWhen("hour 22-4", at(1300, 12)).ok, false);
  assert.equal(W.checkWhen("hour 9-17", at(1300, 12)).ok, true);
});

test("pools, ratings and named wound levels", () => {
  assert.equal(W.checkWhen("blood <= 3", night1300()).ok, true);
  assert.equal(W.checkWhen("blood < 3", night1300()).ok, false);
  assert.equal(W.checkWhen("humanity >= 5; willpower = 4", night1300()).ok, true);
  const hurt = night1300(kindred({traits: {wounds: 5}}));
  assert.equal(W.checkWhen("wounds >= mauled", hurt).ok, true);
  assert.equal(W.checkWhen("wounds >= crippled", hurt).ok, false);
  assert.equal(W.checkWhen("wounded", hurt).ok, true);
  assert.equal(W.checkWhen("wounded", night1300()).ok, false);
});

test("a trait the character lacks fails and is reported as unknown", () => {
  const r = W.checkWhen("rage >= 1", night1300());
  assert.equal(r.ok, false);
  assert.deepEqual(r.unknown, ["rage >= 1"]);
});

test("tests about a character fail when there is none; world tests still work", () => {
  const ctx = night1300(null);
  assert.equal(W.checkWhen("night", ctx).ok, true);
  assert.equal(W.checkWhen("pc", ctx).ok, false);
  assert.equal(W.checkWhen("not pc", ctx).ok, false, "no character: neither pc nor not pc");
});

test("groups: any of, 2 of, the one-line form", () => {
  const ctx = night1300();
  assert.equal(W.checkWhen("any of:\n- frenzy\n- blood <= 3", ctx).ok, true);
  assert.equal(W.checkWhen("2 of:\n- frenzy\n- blood <= 3\n- carries silver", ctx).ok, true);
  assert.equal(W.checkWhen("2 of:\n- frenzy\n- blood <= 1\n- carries silver", ctx).ok, false);
  assert.equal(W.checkWhen("night; any of: frenzy / knows abbot", ctx).ok, true);
  assert.equal(W.checkWhen("all of: night / frenzy", ctx).ok, false);
  const p = W.parseWhen("3 of:\n- night\n- day");
  assert.ok(p.problems.some(x => /asks for 3/.test(x)));
});

test("items, codex pages, factions, names, conditions, moon and church days", () => {
  const ctx = night1300(kindred({conditions: ["obfuscated"]}));
  assert.equal(W.checkWhen("carries silver", ctx).ok, true);
  assert.equal(W.checkWhen("carries \"holy water\"", ctx).ok, false);
  assert.equal(W.checkWhen("knows letter", ctx).ok, true);
  assert.equal(W.checkWhen("faction court", ctx).ok, true);
  assert.equal(W.checkWhen("named anna", ctx).ok, true);
  assert.equal(W.checkWhen("obfuscated", ctx).ok, true);
  assert.equal(W.checkWhen("moon full", ctx).ok, true);
  assert.equal(W.checkWhen("fast", ctx).ok, true);
  assert.equal(W.checkWhen("feast", ctx).ok, false);
  assert.equal(W.checkWhen("season lent", ctx).ok, true);
});

test("kind accepts the books' names for each line", () => {
  assert.equal(W.checkWhen("kind vampire", night1300()).ok, true);
  assert.equal(W.checkWhen("kind garou, mage", night1300(kindred({kind: "lupine"}))).ok, true);
  assert.ok(W.parseWhen("kind elf").problems.length);
});

test("eras are checked against the chronicle's own list, 1197 to 2099", () => {
  assert.ok(eraIds.length >= 5);
  const first = eraIds[0], last = eraIds.at(-1);
  assert.equal(W.parseWhen(`era ${first}, ${last}`, {eras: eraIds}).problems.length, 0);
  assert.ok(W.parseWhen("era atlantis", {eras: eraIds}).problems.length);
  assert.equal(W.checkWhen(`era ${last}`, {era: last}).ok, true);
  assert.equal(W.checkWhen(`era ${last}`, {era: first}).ok, false);
});

test("a list with a mistake never passes, and says what is wrong", () => {
  const r = W.checkWhen("night\nblood is low", night1300());
  assert.equal(r.ok, false);
  assert.equal(r.problems.length, 1);
  assert.match(r.problems[0], /blood is low/);
});

test("Then lists: outcomes, ledger kinds, the one-line form and filled names", () => {
  const r = W.parseThen("tell {name} reached the crypt; cue notice; alarm; ledger debt: owes the abbot a candle; event");
  assert.deepEqual(r.actions.map(a => a.does), ["tell", "cue", "alarm", "ledger", "event"]);
  assert.equal(r.actions[3].kind, "debt");
  assert.equal(W.fillText(r.actions[0].text, {name: "Anna"}), "Anna reached the crypt");
  assert.ok(W.parseThen("explode").problems.length);
  assert.ok(W.parseThen("ledger owes money").problems.length);
  assert.ok(W.parseThen("tell").problems.length);
});

test("NPC phases: parse, the first that fits, laid over the profile", () => {
  const {phases, problems} = NR.parsePhases("Cornered: wounds >= mauled => aggression 2, caution 0, fleeAt 8\nStarving: blood <= 1 => template neonate, tactics melee\nbad line");
  assert.equal(phases.length, 2);
  assert.equal(problems.length, 1);
  assert.equal(NR.parsePhases("X: night => template nobody").problems.length, 1);
  const base = NR.profileOf({}, "elder");
  const check = when => W.checkWhen(when, night1300(kindred({traits: {blood: 1, wounds: 5}}))).ok;
  const p = NR.withPhase(base, NR.phaseNow(phases, check));
  assert.equal(p.phase, "Cornered");
  assert.equal(p.aggression, 2);
  assert.equal(p.fleeAt, 8);
  const q = NR.withPhase(base, NR.phaseNow(phases, when => W.checkWhen(when, night1300(kindred({traits: {blood: 1, wounds: 0}}))).ok));
  assert.equal(q.phase, "Starving");
  assert.equal(q.template, "neonate");
  assert.deepEqual(q.tactics, ["melee"]);
  assert.equal(NR.withPhase(base, NR.phaseNow(phases, () => false)), base);
});

test("the Foundry side and the Trigger region are wired", () => {
  const main = src("modules/wodx-chronicle/scripts/main.mjs");
  assert.match(main, /when: \{check: when\.check, run: when\.run/);
  const r = src("modules/wodx-npc/scripts/routines.mjs");
  assert.match(r, /when: new f\.StringField/);
  assert.match(r, /W\.check\(system\.when/);
  assert.match(r, /W\.run\(system\.then/);
  const npc = src("modules/wodx-npc/scripts/main.mjs");
  assert.match(npc, /NR\.withPhase\(p, NR\.phaseNow/);
});
