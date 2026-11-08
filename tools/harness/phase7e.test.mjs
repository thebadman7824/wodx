import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* Phase 7e: the open world's rules (WoDX Storyteller 0.1.0, world-rules.mjs). */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const W = await import(join(root, "modules/wodx-storyteller/scripts/world-rules.mjs"));
const H = 3600;

test("the log: newest first, cleaned, capped", () => {
  let log = W.blankLog();
  for ( let i = 0; i < 12; i++ ) log = W.addEntry(log, {id: `e${i}`, kind: i % 2 ? "roll" : "nonsense", at: i, text: "x".repeat(900)}, {cap: 10});
  assert.equal(log.entries.length, 10);
  assert.equal(log.entries[0].id, "e11");
  assert.equal(log.entries[1].kind, "note", "an unknown kind becomes a note");
  assert.equal(log.entries[0].text.length, 400);
  assert.deepEqual(W.normLog(null), W.blankLog());
  assert.deepEqual(W.normLog({entries: [null, 3, {id: "a"}]}).entries, [{id: "a"}]);
});

test("attention: frenzy, breach, sin, voice and the others, and nothing for a plain roll", () => {
  assert.equal(W.attentionOf("Rötschreck! The Red Fear takes hold"), "A frenzy");
  assert.equal(W.attentionOf("Frenzy check: 2 successes"), "A frenzy");
  assert.equal(W.attentionOf("A breach of the Masquerade at the market"), "A Masquerade breach");
  assert.equal(W.attentionOf("Conscience roll after the killing"), "A sin");
  assert.equal(W.attentionOf("Degeneration: loses a dot of Humanity"), "A sin");
  assert.equal(W.attentionOf("The inner voice proposes a cruelty"), "A voice's proposal");
  assert.equal(W.attentionOf("Paradox backlash"), "Paradox");
  assert.equal(W.attentionOf("Diablerie!"), "Diablerie");
  assert.equal(W.attentionOf("Dexterity + Stealth, 3 successes"), null);
  assert.equal(W.attentionOf(""), null);
  assert.equal(W.plain("<p>A&nbsp;<b>roll</b> &amp; more</p>"), "A roll & more");
});

test("filters: by character, place, kind, attention, time and words", () => {
  const es = [
    W.normEntry({id: "1", kind: "roll", actor: "a", name: "Anna", place: "The Tavern", at: 10, text: "Wits + Streetwise"}),
    W.normEntry({id: "2", kind: "travel", actor: "b", name: "Bo", place: "Kranzfels Keep", at: 20, text: "To the keep"}),
    W.normEntry({id: "3", kind: "roll", actor: "a", name: "Anna", place: "Kranzfels Keep", at: 30, text: "Frenzy", attention: "A frenzy"})
  ];
  assert.deepEqual(W.filterEntries(es, {actor: "a"}).map(e => e.id), ["1", "3"]);
  assert.deepEqual(W.filterEntries(es, {place: "Kranzfels Keep"}).map(e => e.id), ["2", "3"]);
  assert.deepEqual(W.filterEntries(es, {kind: "travel"}).map(e => e.id), ["2"]);
  assert.deepEqual(W.filterEntries(es, {attention: true}).map(e => e.id), ["3"]);
  assert.deepEqual(W.filterEntries(es, {since: 15, until: 30}).map(e => e.id), ["2"]);
  assert.deepEqual(W.filterEntries(es, {text: "streetwise"}).map(e => e.id), ["1"]);
});

test("personal time: their own or the clock's; advancing; dawn catches up a night left behind", () => {
  assert.equal(W.personalOf(undefined, 500), 500);
  assert.equal(W.personalOf({t: 800}, 500), 800);
  assert.equal(W.aheadOf({t: 300}, 500), -200);
  assert.equal(W.advance(undefined, 90, 500).t, 590);
  assert.equal(W.advance({t: 800, warned: 1}, 60, 500).warned, 1, "other fields kept");
  assert.equal(W.advance({t: 800}, -60, 500).t, 800, "never backwards");
  // The world passed dawn at 1000; a night still at 900 catches up, one past it does not
  assert.deepEqual(W.dawnCatchUp({t: 900}, 1200, 1000), {rec: {t: 1200}, caught: true});
  assert.equal(W.dawnCatchUp({t: 1100}, 1200, 1000).caught, false);
  assert.equal(W.dawnCatchUp(undefined, 1200, 1000).caught, false, "a character with no time of their own follows the clock already");
  // One warning a dawn, inside the lead
  assert.equal(W.dawnWarning(1800, 5000, null), true);
  assert.equal(W.dawnWarning(1800, 5000, 5000), false, "already warned for this dawn");
  assert.equal(W.dawnWarning(2 * H, 5000, null), false, "too far off");
  assert.equal(W.spanLabel(30), "on time");
  assert.equal(W.spanLabel(80 * 60), "1 h 20 min");
  assert.equal(W.spanLabel(2 * H), "2 h");
  assert.equal(W.aheadLabel(-45 * 60), "45 min behind");
  assert.equal(W.aheadLabel(10), "with the clock");
});

test("travel: route minutes either way, then the place's own, then the default; one check an hour; at most one encounter", () => {
  const keep = {id: "keep", travel: {minutes: 90, routes: {tavern: 20}}};
  const tavern = {id: "tavern", travel: {}};
  const mill = {id: "mill", travel: {minutes: 45}};
  assert.equal(W.travelMinutes(tavern, keep), 20, "the keep's route from the tavern");
  assert.equal(W.travelMinutes(keep, tavern), 20, "the same route the other way");
  assert.equal(W.travelMinutes(tavern, mill), 45, "the mill's own time");
  assert.equal(W.travelMinutes(mill, tavern, 30), 30, "the default");
  assert.equal(W.travelMinutes(null, tavern, 0), 30, "a bad default is 30");
  assert.equal(W.encounterChecks(0), 0);
  assert.equal(W.encounterChecks(20), 1);
  assert.equal(W.encounterChecks(61), 2);
  const seq = vals => { let i = 0; return () => vals[i++] ?? 0.99; };
  assert.equal(W.rollRoad(150, 10, seq([0.5, 0.05, 0.01])), 1, "the second hour");
  assert.equal(W.rollRoad(150, 10, seq([0.5, 0.5, 0.5])), -1);
  assert.equal(W.rollRoad(150, 0, seq([0])), -1, "no chance, no encounter");
  assert.equal(W.rollRoad(0, 100, seq([0])), -1, "no road, no encounter");
  assert.equal(W.normPlace({minutes: 99999, routes: {a: -3, b: "15"}}).minutes, 1440);
  assert.deepEqual(W.normPlace({routes: {a: -3, b: "15"}}).routes, {b: 15});
});

test("travel: a place that asks first, or a vampire's trip into the dawn, waits for the Storyteller", () => {
  assert.match(W.travelNeedsAsk({place: {travel: {ask: true}}, arrive: 0}), /asks the Storyteller/);
  assert.match(W.travelNeedsAsk({place: {travel: {}}, arrive: 900, dawnAt: 800, sunBurns: true}), /after dawn/);
  assert.equal(W.travelNeedsAsk({place: {travel: {}}, arrive: 900, dawnAt: 800, sunBurns: false}), null, "a mortal may walk into the morning");
  assert.equal(W.travelNeedsAsk({place: {travel: {}}, arrive: 700, dawnAt: 800, sunBurns: true}), null);
});

test("solo play: the night's limit, the pause while convened, the hours", () => {
  assert.equal(W.soloAllowed({count: 3, limit: 0}).ok, true, "0 is no limit");
  assert.equal(W.soloAllowed({count: 2, limit: 2}).ok, false);
  assert.match(W.soloAllowed({count: 2, limit: 2}).why, /2 solo actions a night/);
  assert.match(W.soloAllowed({count: 0, limit: 1, convened: true}).why, /called this character/);
  const es = [{kind: "solo", actor: "a", night: 5}, {kind: "solo", actor: "a", night: 5}, {kind: "solo", actor: "a", night: 6}, {kind: "roll", actor: "a", night: 5}, {kind: "solo", actor: "b", night: 5}];
  assert.equal(W.soloCount(es, "a", 5), 2);
  assert.equal(W.soloHours("downtime", null), 2, "the kind's usual");
  assert.equal(W.soloHours("hunt", 0.1), 0.25);
  assert.equal(W.soloHours("hunt", 30), 12);
  assert.equal(W.soloHours("hunt", 1.3), 1.25);
  assert.equal(Object.keys(W.SOLO_KINDS).length, 6);
});

test("convening: the scene starts at the latest time; the one ahead waits, those behind sum up the gap", () => {
  const r = W.reconcile([{id: "a", rec: {t: 1000 + 2 * H}}, {id: "b", rec: {t: 1000 - H}}, {id: "c"}], 1000);
  assert.equal(r.target, 1000 + 2 * H);
  assert.deepEqual(r.rows.map(x => [x.id, x.status, x.gap]), [["a", "ahead", 0], ["b", "behind", 3 * H], ["c", "behind", 2 * H]]);
  const s = W.reconcile([{id: "a", rec: {t: 500}}, {id: "b"}], 1000);
  assert.equal(s.target, 1000, "never before the world clock");
  assert.deepEqual(s.rows.map(x => x.status), ["behind", "with"]);
});

test("beats: a time (the world's, or a character's own), a place, a flag; a fired beat stays quiet", () => {
  const t = {id: "1", on: "time", time: 5000};
  assert.equal(W.beatFires(t, {type: "time", world: 4999}), false);
  assert.equal(W.beatFires(t, {type: "time", world: 5000}), true);
  assert.equal(W.beatFires({...t, fired: true}, {type: "time", world: 9000}), false);
  assert.equal(W.beatFires({...t, actor: "a"}, {type: "time", world: 1000, personal: {a: 6000}}), true, "by the character's own time");
  assert.equal(W.beatFires({...t, actor: "a"}, {type: "time", world: 9000, personal: {a: 1000}}), false);
  assert.equal(W.beatFires(t, {type: "place", actor: "a", place: "Scene.x"}), false, "a time beat ignores arrivals");
  const p = {id: "2", on: "place", place: "Scene.keep"};
  assert.equal(W.beatFires(p, {type: "place", actor: "a", place: "Scene.keep"}), true);
  assert.equal(W.beatFires(p, {type: "place", actor: "a", place: "Scene.mill"}), false);
  assert.equal(W.beatFires({...p, actor: "b"}, {type: "place", actor: "a", place: "Scene.keep"}), false, "someone else's beat");
  const f = {id: "3", on: "flag", flag: "world.metBishop"};
  assert.equal(W.beatFires(f, {type: "flag", actor: "a", flags: {world: {metBishop: true}}}), true);
  assert.equal(W.beatFires(f, {type: "flag", actor: "a", flags: {world: {}}}), false);
  assert.equal(W.beatFires({...f, value: "angry"}, {type: "flag", actor: "a", flags: {world: {metBishop: "calm"}}}), false);
  assert.equal(W.beatFires({...f, value: "angry"}, {type: "flag", actor: "a", flags: {world: {metBishop: "angry"}}}), true);
  const n = W.normBeat({on: "bogus", convene: ["a", 7], value: ""});
  assert.equal(n.on, "time");
  assert.deepEqual(n.convene, ["a", "7"]);
  assert.equal(n.value, null);
});

test("spotlight: acts and hours for each player, the quietest first", () => {
  const es = [
    {kind: "solo", user: "u1", hours: 2, at: 10}, {kind: "roll", user: "u1", at: 11}, {kind: "travel", user: "u1", hours: 0.5, at: 12},
    {kind: "roll", user: "u2", at: 13}, {kind: "convene", user: "u2", at: 14}, {kind: "session", user: "u2", at: 15},
    {kind: "solo", user: "u1", hours: 1, at: 1}
  ];
  const r = W.spotlight(es, [{id: "u1", name: "Ana"}, {id: "u2", name: "Bea"}, {id: "u3", name: "Cy"}], {since: 5});
  assert.deepEqual(r.map(x => [x.name, x.acts, x.hours, x.scenes]), [["Cy", 0, 0, 0], ["Bea", 2, 0, 1], ["Ana", 3, 2.5, 0]]);
  assert.equal(r.at(-1).share, 100);
});

test("tonight's summary and the report between sessions", () => {
  let log = W.blankLog();
  const add = e => { log = W.addEntry(log, e); };
  add({kind: "travel", actor: "a", name: "Anna", place: "The Tavern", at: 100});
  add({kind: "roll", actor: "a", name: "Anna", place: "The Tavern", at: 110, text: "Frenzy check", attention: "A frenzy"});
  add({kind: "solo", actor: "a", name: "Anna", place: "The Tavern", at: 120, text: "Hunt or feed (1 h)"});
  add({kind: "travel", actor: "a", name: "Anna", place: "Kranzfels Keep", at: 130});
  add({kind: "arrive", actor: "b", name: "Bo", place: "The Mill", at: 140});
  add({kind: "roll", actor: "b", name: "Bo", place: "The Mill", at: 20, text: "Before the night"});
  const lines = W.nightSummary(log.entries, {since: 50});
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^Anna: went to The Tavern, then Kranzfels Keep; on their own: Hunt or feed \(1 h\); 1 roll; look at: A frenzy\.$/);
  assert.match(lines[1], /^Bo: went to The Mill\.$/);
  const rep = W.sessionReport({entries: log.entries, since: 50,
    factionLog: [{at: 120, lines: ["The Church now holds the mill (applied)", "The Guild schemes against the Church (queued)"]}, {at: 10, lines: ["Old news holds"]}],
    pending: [{title: "Bo wants to go to the keep"}], breaches: [{event: "A body by the well", stage: "The Prince hears"}], beats: [{name: "The bishop arrives"}]});
  const by = Object.fromEntries(rep.map(s => [s.title, s.lines]));
  assert.deepEqual(by["Who moved"], ["Anna: The Tavern, then Kranzfels Keep", "Bo: The Mill"]);
  assert.deepEqual(by["What changed hands"], ["The Church now holds the mill (applied)"]);
  assert.deepEqual(by["The factions' other moves"], ["The Guild schemes against the Church (queued)"]);
  assert.equal(by["What needs a look"].length, 1);
  assert.deepEqual(by["What is brewing"], ["Waiting for you: Bo wants to go to the keep", "A rumour: A body by the well (The Prince hears)", "A beat still to come: The bishop arrives"]);
});
