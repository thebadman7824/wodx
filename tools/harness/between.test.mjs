import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* WoDX Storyteller 0.18.0: between sessions (next session sheet, scene kits, quick extras, hooks, absent players, the recap, downtime). */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const S = p => join(root, "modules/wodx-storyteller/scripts", p);
const P = await import(S("prep-rules.mjs"));
const K = await import(S("kits-rules.mjs"));

test("next session sheet: sections in order, empty ones left out, only open tasks and letters on the way", () => {
  const s = P.nextSession({now: 0, clocks: [{at: 3600, what: "Dawn"}], consequences: [{due: null, kind: "Oath", from: {name: "Anna"}, to: {name: "Bo"}, what: "a favour"}],
    letters: [{fromName: "Anna", toName: "the Bishop", dueAt: 86400, state: "way"}, {fromName: "X", toName: "Y", dueAt: 10, state: "done"}],
    tasks: [{actor: "Bo", name: "A sword", total: 3, goal: 10, next: 7200, status: "open"}, {actor: "Bo", name: "Old", status: "done"}],
    threads: [], ahead: [{name: "Anna", ahead: 7200}, {name: "Bo", ahead: 60}]});
  assert.deepEqual(s.map(x => x.key), ["due", "letters", "tasks", "ahead"]);
  assert.match(s[0].lines[0], /in 1 h: Dawn/);
  assert.match(s[0].lines[1], /^No date: Oath, Anna to Bo, a favour/);
  assert.equal(s[1].lines.length, 1);
  assert.equal(s[2].lines.length, 1);
  assert.deepEqual(s[3].lines, ["Anna is ahead by 2 h"]);
  assert.deepEqual(P.nextSession({}), []);
});

test("last time: only the last session, only what players saw, one line a night", () => {
  const e = [ // newest first, as the log keeps them
    {kind: "session", text: "The session ended.", night: 2},
    {kind: "solo", text: "Anna hunted alone", night: 2},
    {kind: "convene", text: "Called to the mill", night: 2},
    {kind: "arrive", text: "Anna arrived at the mill.", night: 2},
    {kind: "dawn", text: "Dawn came", night: 1},
    {kind: "breach", text: "A breach", night: 1},
    {kind: "session", text: "The session ended.", night: 0},
    {kind: "arrive", text: "Older", night: 0}];
  const last = P.lastSession(e);
  assert.deepEqual(last.map(x => x.text), ["A breach", "Dawn came", "Anna arrived at the mill.", "Called to the mill", "Anna hunted alone"]);
  const lines = P.recapLines(last, {nightLabel: n => `N${n}`});
  assert.deepEqual(lines, ["N1: Dawn came.", "N2: Anna arrived at the mill; Called to the mill."]);
  assert.equal(P.lastSession([{kind: "arrive", text: "x"}]).length, 1, "no session line yet: everything");
});

test("absent players and the hooks board read plain data", () => {
  assert.deepEqual(P.normAbsent({u1: {at: 5, runBy: "st"}, u2: false, u3: {runBy: "x"}}), {u1: {at: 5, runBy: "st"}, u3: {at: 0, runBy: "none"}});
  const h = P.hooksOf({name: "Anna", nature: "Survivor", demeanor: "Caregiver", derangement: "Paranoia; Fugue",
    morality: {name: "Humanity", value: 6},
    features: [{name: "Hunted", kind: "wod.types.flaw", value: 4}, {name: "Allies", kind: "wod.types.background", value: 2}, {name: "Resources", kind: "wod.types.background", value: 3},
      {name: "Eat Food", kind: "wod.types.merit", value: 1}]});
  assert.deepEqual(h.flaws, ["Hunted (4)"]);
  assert.deepEqual(h.people, ["Allies 2"]);
  assert.deepEqual(h.derangements, ["Paranoia", "Fugue"]);
  assert.equal(h.morality, "Humanity 6");
  assert.match(P.hooksText(h), /survivor.*hunted/);
});

test("scene kits: steps follow the kit and the modules on", () => {
  const k = K.normKit({id: "k", sceneId: "s", minutes: 30, mood: "tension", pull: "called", actorIds: ["a", "a", "b"], note: "Bells at midnight"});
  assert.deepEqual(k.actorIds, ["a", "b"]);
  assert.deepEqual(K.kitSteps(k, {atmosphere: true}).map(s => s.key), ["clock", "view", "convene", "mood", "opening", "note"]);
  assert.deepEqual(K.kitSteps({...k, pull: "all", mood: "", opening: false, note: "", minutes: 0}, {}).map(s => s.key), ["activate"]);
  assert.deepEqual(K.kitSteps(k, {}).map(s => s.key), ["clock", "view", "convene", "note"], "no Atmosphere: no music, no card");
  assert.equal(K.normKit({mood: "disco"}).mood, "");
  assert.equal(K.normKits([{id: "x"}, {id: "y", sceneId: "s"}]).length, 1);
});

test("quick extras: early and late eras, pools from the template, actor data the system reads", () => {
  const early = K.extrasFor(1197).map(e => e.key), late = K.extrasFor(1999).map(e => e.key);
  assert.ok(early.includes("watch") && !early.includes("police") && early.includes("wolf_da"));
  assert.ok(late.includes("police") && !late.includes("manatarms") && late.includes("ghoul"));
  const cop = K.EXTRAS.find(e => e.key === "police");
  assert.equal(K.poolOn(cop, "perception", "alertness"), 5);
  const d = K.extraActorData(cop, {n: 2, folder: "f"});
  assert.equal(d.name, "Police officer 2");
  assert.equal(d.system.attributes.dexterity.value, 3);
  assert.equal(d.prototypeToken.actorLink, false);
  assert.match(K.extraSummary(cop), /Attack 5, Notice 5/);
  for ( const e of K.EXTRAS ) { assert.equal(Object.keys(e.attrs).length, 9, e.key); assert.ok(e.ref, e.key); }
  assert.ok(early.includes("wolf_da") && !early.includes("dog_large") && late.includes("dog_large"));
  assert.match(K.extraSummary(cop), /Soak 3 bashing, none against lethal; .*health Hurt -1, Maimed -3, Incapacitated, Dead/);
  const wolf = K.EXTRAS.find(e => e.key === "wolf");
  assert.match(K.extraSummary(wolf), /Soak 3; Bite 4, claw 4 \(damage 4\); Willpower 3; health OK, -1, -1, -3, -5, Incapacitated/);
  assert.equal(K.extraActorData(wolf).flags["wodx-storyteller"].extra.health, wolf.health);
});

test("downtime requests: clean data and a title for the queue", () => {
  const d = K.normDowntime({actorId: "a", kind: "nonsense", nights: 99, what: "Reads the old books"});
  assert.deepEqual([d.kind, d.nights], ["other", 60]);
  assert.equal(K.downtimeTitle(K.normDowntime({kind: "study", nights: 1}), "Anna"), "Downtime: Anna, study or train (1 night)");
});

test("wiring: the tools join the hand, the setting clears at the session's end, absent players leave the spotlight", () => {
  const src = p => readFileSync(join(root, p), "utf8");
  const m = src("modules/wodx-storyteller/scripts/main.mjs");
  for ( const s of ["Between.registerBetweenSettings()", "Between.registerBetweenTools()", "Between.registerBetweenHandlers()", "Hand.registerHandKeys()", "Hand.watchTimer()", "req.call", "wodxHand", "wodxDowntime"] ) assert.ok(m.includes(s), s);
  const c = src("modules/wodx-storyteller/scripts/core.mjs");
  assert.match(c, /game\.settings\.set\(MOD, "absent", \{\}\)/);
  const a = src("modules/wodx-storyteller/scripts/apps.mjs");
  assert.match(a, /!away\.has\(u\.id\)/);
  const b = src("modules/wodx-storyteller/scripts/between.mjs");
  for ( const box of ['searchBox(".wst-hooks"', 'searchBox("select[name=sceneId]"', 'searchBox(".wst-prep-scenes"', 'searchBox("ul.wst-kits"'] ) assert.ok(b.includes(box), box);
  assert.equal(JSON.parse(src("modules/wodx-storyteller/module.json")).version, "0.18.0");
});
