import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as R from "../../modules/wodx-creation/scripts/first-night-rules.mjs";
import * as TR from "../../modules/wodx-chronicle/scripts/trait-rules.mjs";
import * as RV from "../../modules/wodx-npc/scripts/rivalry-rules.mjs";
import EVENTS from "../../modules/wodx-chronicle/data/events.mjs";
import {readFileSync} from "node:fs";

/* WoDX Creation 0.12.0: Before the First Night (Chronicle Start Desk, approved 2026-11-12). */

const tables = {PULLS: TR.PULLS, LEDGER: TR.LEDGER, PROMPTS: TR.PROMPTS, TRIGGERS: TR.TRIGGERS, BG_WORLD: TR.BG_WORLD};

test("the steps: every desk step, sign-off last, keys unique", () => {
  assert.deepEqual(R.STEP_KEYS, ["sessionZero", "ties", "concept", "lifepath", "build", "meritsFlaws", "fit", "prelude", "forecast", "signoff"]);
  assert.equal(R.STEPS.at(-1).last, true);
  assert.equal(new Set(R.STEP_KEYS).size, R.STEP_KEYS.length);
});

test("the record is cleaned: unknown steps, a bad dial and a bad hook are dropped", () => {
  const r = R.normRecord({steps: {concept: {done: true, at: 5}, junk: {done: true}, build: {done: false}}, dial: "loud", hook: {text: ""}});
  assert.deepEqual(Object.keys(r.steps), ["concept"]);
  assert.equal(r.dial, "normal");
  assert.equal(r.hook, null);
  assert.equal(R.normRecord({dial: "often"}).dial, "often");
});

test("steps tick themselves from the sheet; sign-off waits for the rest but not the lifepath", () => {
  const view = {concept: "Smith", nature: "Survivor", demeanor: "Loner", lifepath: false, build: {ok: true}, flawPoints: 3, flawsApproved: true, sessionZero: true};
  const st = R.stepStates({steps: {ties: {done: true}, fit: {done: true}, prelude: {done: true}}}, view, ["forecast"]);
  const by = Object.fromEntries(st.map(s => [s.key, s.state]));
  assert.equal(by.concept, "done");
  assert.equal(by.build, "done");
  assert.equal(by.forecast, "waiting");
  assert.equal(by.lifepath, "open");
  assert.deepEqual(R.canSignOff(st).missing, ["Trouble ahead"]);
  const all = R.stepStates({steps: {ties: {done: true}, fit: {done: true}, prelude: {done: true}, forecast: {done: true}}}, view);
  assert.equal(R.canSignOff(all).ok, true);
});

test("flaws: counted against the V20 cap of 7", () => {
  assert.equal(R.FLAW_CAP, 7);
  assert.equal(R.flawPoints([{kind: "flaw", value: 3}, {kind: "flaw", value: 5}, {kind: "merit", value: 4}]), 8);
  assert.equal(R.autoDone({flawPoints: 8, flawsApproved: true}).meritsFlaws, false);
  assert.equal(R.autoDone({flawPoints: 7, flawsApproved: true}).meritsFlaws, true);
});

test("the trouble dial scales the night's draw and stays under 0.9", () => {
  assert.equal(R.scaledChance(0.25, "quiet"), 0.125);
  assert.equal(R.scaledChance(0.25, "normal"), 0.25);
  assert.equal(R.scaledChance(0.33, "often"), 0.495);
  assert.equal(R.scaledChance(0.8, "often"), 0.9);
});

test("the story hook is due after four sessions, once agreed and not yet used", () => {
  assert.equal(R.hookDue({agreed: true, sessions: 4}), true);
  assert.equal(R.hookDue({agreed: false, sessions: 9}), false);
  assert.equal(R.hookDue({agreed: true, sessions: 4, used: true}), false);
});

test("the forecast reads flaws, blood, people, factions, rivals, events, language and gear", () => {
  const items = R.forecast({name: "Anna", line: "vampire", year: 1343, nowEra: {id: "dark-ages", end: 1346}, tables,
    traits: [{key: "hunted", name: "Hunted", kind: "flaw", value: 4}, {key: "dark-secret", name: "Dark Secret", kind: "flaw", value: 1},
      {key: "addiction", name: "Addiction", kind: "flaw", value: 2}, {key: "garlic", name: "Repulsed by Garlic", kind: "flaw", value: 1}],
    plan: [{key: "allies", label: "Allies", count: 2, made: 0}],
    splat: [{title: "Muse and Obsession", text: "A muse.", label: "Toreador"}],
    generation: 14, road: {name: "Humanity", value: 3},
    lifepath: {people: [{role: "your sire's rival", year: 1320}, {role: "a sibling", year: 1310}], kept: ["flaw Enemy", "bg Allies"]},
    standing: [{faction: "The Prince's court", step: -2, word: "hostile"}, {faction: "The guild", step: 1}],
    rivals: [{theirSide: "clan:tzimisce", step: -3, note: "An old war."}],
    events: EVENTS.events.map(e => ({...e, on: true})),
    troupeLanguages: {shared: false}, gear: [{name: "Pistol", note: "not made yet in 1340"}]});
  const keys = items.map(i => i.key);
  for ( const k of ["pull:hunted", "ledger:dark-secret", "prompt:addiction", "trigger:garlic", "bg:allies", "gen:thin", "road:low",
    "past:your sire's rival:1320", "kept:Enemy", "faction:The Prince's court", "rival:clan:tzimisce", "event:black-death", "lang", "gear:Pistol"] ) assert.ok(keys.includes(k), k);
  assert.ok(!keys.includes("past:a sibling:1310"), "friends are not trouble");
  assert.ok(!keys.includes("faction:The guild"));
  assert.equal(items.find(i => i.key === "ledger:dark-secret").known, false, "a secret's clock is for the Storyteller");
  assert.equal(items.find(i => i.key === "event:black-death").known, false, "the future is for the Storyteller");
  assert.ok(R.playerView(items).every(i => i.known));
  assert.ok(items.find(i => i.key === "past:your sire's rival:1320").seed, "a living enemy can be made an NPC");
  assert.match(items.find(i => i.key === "pull:hunted").text, /Anna/);
  // Groups come in order
  const order = Object.keys(R.GROUPS);
  assert.deepEqual(items.map(i => order.indexOf(i.group)), [...items.map(i => order.indexOf(i.group))].sort((a, b) => a - b));
});

test("dated events: five years ahead, or to the next era's first year if sooner; only the character's line", () => {
  assert.equal(R.horizonOf(1340, {end: 1346}), 1345);
  assert.equal(R.horizonOf(1344, {end: 1346}), 1347);
  assert.equal(R.horizonOf(2000, null), 2005);
  const ev = [{id: "a", name: "A", year: 1350, lines: ["changeling"]}, {id: "b", name: "B", year: 1350, lines: ["all"]}, {id: "c", name: "C", year: 1360, lines: ["all"]}, {id: "d", name: "D", year: 1352, lines: ["vampire"], on: false}];
  const keys = R.forecast({line: "ghoul", year: 1348, events: ev}).map(i => i.key);
  assert.deepEqual(keys, ["event:b"]);
  assert.deepEqual(R.forecast({line: "changeling", year: 1348, events: ev}).map(i => i.key), ["event:a", "event:b"]);
});

test("every era: the forecast runs from 1197 to the World of Future Darkness without error", () => {
  const all = EVENTS.events.map(e => ({...e, on: true}));
  for ( let y = 1197; y <= 2300; y += 7 ) for ( const line of ["vampire", "werewolf", "mage", "changeling", "wraith", "hunter", "mummy", "demon", "mortal"] ) {
    const items = R.forecast({line, year: y, events: all, generation: 10, tables, traits: [{key: "enemy", name: "Enemy", kind: "flaw", value: 2}]});
    assert.ok(Array.isArray(items) && items.some(i => i.key === "pull:enemy"), `${line} ${y}`);
  }
});

test("rivalries: the other side's hostility toward the character's own sides", () => {
  const out = R.enemiesOf(["clan:tremere", "line:kindred"], 1300, RV.RIVALRIES, RV);
  assert.ok(out.some(o => /tzimisce/.test(o.theirSide) && o.step <= -2), "Tzimisce hate Tremere in 1300");
  assert.equal(new Set(out.map(o => o.theirSide)).size, out.length);
  assert.equal(R.sideLabel("clan:tzimisce|clan:koldun"), "Tzimisce");
});

test("languages, fit warnings and cost lines", () => {
  assert.equal(R.sharesLanguage(["Czech", "Latin"], [["latin"], ["German", "Czech"]]), true);
  assert.equal(R.sharesLanguage(["Czech"], [["German"]]), false);
  assert.equal(R.sharesLanguage(["Czech"], []), true);
  const w = R.fitWarnings({lineOpen: {ok: false, note: "Not before 1999."}, splatOpen: {ok: true}, troupeLanguages: {shared: false}, gear: [{name: "Radio", note: "not made yet in 1400"}]});
  assert.deepEqual(w.map(x => x.key), ["line", "lang", "gear:Radio"]);
  assert.match(R.costLine("hunted", tables), /night's draw/);
  assert.match(R.costLine("dark-secret", tables), /clock/);
  assert.match(R.costLine("allies", tables), /people/);
  assert.equal(R.costLine("no-such-thing", tables), "");
});

test("the HTML hides nothing from the Storyteller and escapes text", () => {
  const esc = s => String(s).replaceAll("<", "&lt;");
  const html = R.forecastHtml([{key: "x", group: "times", title: "<b>", text: "t", known: false, when: ""}], {gm: true, esc});
  assert.match(html, /Storyteller only/);
  assert.ok(!html.includes("<b><"));
  assert.match(R.forecastHtml([]), /Nothing ahead/);
});

test("the window is wired: setting, approval types, sheet button, Clock, setup wizard, session hook", () => {
  const fn = readFileSync(new URL("../../modules/wodx-creation/scripts/first-night.mjs", import.meta.url), "utf8");
  for ( const s of ["wodx-first-night-step", "wodx-first-night-hook", "\"firstNight\"", "getHeaderControlsActorSheetV2", "wodxSessionEnded", "rothenstein-live"] ) assert.ok(fn.includes(s), s);
  const main = readFileSync(new URL("../../modules/wodx-creation/scripts/main.mjs", import.meta.url), "utf8");
  assert.match(main, /firstNight: actor =>/);
  assert.match(readFileSync(new URL("../../modules/wodx-chronicle/scripts/clock-app.mjs", import.meta.url), "utf8"), /data-action="firstNight"/);
  assert.match(readFileSync(new URL("../../modules/wodx-storyteller/scripts/setup.mjs", import.meta.url), "utf8"), /api\?\.firstNight/);
  assert.match(readFileSync(new URL("../../modules/wodx-storyteller/scripts/core.mjs", import.meta.url), "utf8"), /callAll\("wodxSessionEnded"\)/);
});

test("starting standing: own sides warm by Status, old enemies cool, set standing left alone", () => {
  const out = R.suggestStanding({sides: ["line:kindred", "sect:camarilla", "clan:tremere"], status: 3,
    factions: [{id: "a", name: "Camarilla of Brno"}, {id: "b", name: "Tzimisce voivodate"}, {id: "c", name: "Bakers' guild"}, {id: "d", name: "Tremere chantry", current: 2}],
    rivals: [{theirSide: "clan:tzimisce", step: -3}]});
  assert.deepEqual(out.map(o => [o.id, o.to]), [["a", 2], ["b", -2]]);
  assert.equal(R.suggestStanding({sides: ["sect:camarilla"], status: 9, factions: [{id: "a", name: "Camarilla"}]})[0].to, 3);
});

test("seed cards: one per enemy and hook, one for the Backgrounds, one for several Ledger flaws, one per faction", () => {
  const items = R.forecast({name: "Anna", line: "vampire", year: 1343, nowEra: {end: 1346}, tables,
    traits: [{key: "dark-secret", name: "Dark Secret", kind: "flaw", value: 1}, {key: "old-flame", name: "Old Flame", kind: "flaw", value: 2}],
    plan: [{key: "allies", label: "Allies", count: 2, made: 0}, {key: "contacts", label: "Contacts", count: 1, made: 0}],
    lifepath: {people: [{role: "your murderer", year: 1330}]}, events: EVENTS.events.map(e => ({...e, on: true}))});
  const cards = R.seedCards(items, [{id: "f1", name: "Camarilla", to: 1, why: "One of their own"}]);
  const kinds = cards.map(c => c.kind);
  assert.deepEqual(kinds.filter(k => k === "background"), ["background"]);
  assert.deepEqual(kinds.filter(k => k === "ledger"), ["ledger"]);
  assert.ok(kinds.includes("enemy") && kinds.includes("hook") && kinds.includes("standing"));
  assert.equal(cards.find(c => c.kind === "standing").title, "Camarilla: start at Tolerated");
  assert.equal(cards.find(c => c.kind === "hook").data.event, "black-death");
});

test("the trouble dial reaches the night's draw", () => {
  const night = readFileSync(new URL("../../modules/wodx-storyteller/scripts/night.mjs", import.meta.url), "utf8");
  assert.match(night, /dialScale/);
  assert.match(readFileSync(new URL("../../modules/wodx-creation/scripts/first-night-seed.mjs", import.meta.url), "utf8"), /data-wodx-fn-undo/);
});
