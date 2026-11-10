import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* WoDX Storyteller 0.18.0: the Storyteller's hand (rules at a glance, call for a roll, before play, the wrap-up, the timer). */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const S = p => join(root, "modules/wodx-storyteller/scripts", p);
const G = await import(S("glance-rules.mjs"));
const CR = await import(S("callroll-rules.mjs"));
const PF = await import(S("preflight-rules.mjs"));
const WR = await import(S("wrapup-rules.mjs"));

test("rules at a glance: shared sections always, line sections only for the lines at the table", () => {
  const ids = s => s.map(x => x.id);
  const v = G.sections({lines: ["vampire"]});
  assert.ok(ids(v).includes("difficulty") && ids(v).includes("health") && ids(v).includes("checks"));
  assert.ok(ids(v).includes("frenzy") && ids(v).includes("rotschreck") && ids(v).includes("burns"));
  assert.ok(!ids(v).includes("paradox") && !ids(v).includes("gauntlet"));
  const m = G.sections({lines: ["mage", "wraith"]});
  assert.ok(ids(m).includes("paradox") && ids(m).includes("gauntlet") && ids(m).includes("harrowing") && !ids(m).includes("frenzy"));
  assert.equal(G.sections({lines: ["mortal"], every: true}).length, G.sections({}).length, "every line, or no line known, shows all");
  for ( const s of G.sections({}) ) for ( const l of s.lines ) assert.ok(l.label && !/undefined|\[object/.test(`${l.label} ${l.value}`), `${s.id}: ${l.label}`);
});

test("rules at a glance: the Gauntlet follows the era's chart", () => {
  const da = G.sections({lines: ["werewolf"], profile: {rules: {gauntletChart: "dark-ages"}}}).find(s => s.id === "gauntlet");
  const mod = G.sections({lines: ["werewolf"], profile: {rules: {gauntletChart: "w20"}}}).find(s => s.id === "gauntlet");
  assert.match(da.title, /Dark Ages/);
  assert.match(mod.title, /Werewolf 20th/);
  assert.equal(G.gauntletChart({rules: {gauntletChart: "nonsense"}}), "w20");
  assert.equal(da.lines.find(l => l.label === "City").value, "rating 8");
  assert.ok(G.searchText(da, da.lines[0]).includes("gauntlet"));
});

test("call for a roll: the pool comes from the sheet, untrained Skills cost a difficulty, untrained Knowledges can't be tried", () => {
  const sheet = {attributes: {perception: 3, wits: 2, intelligence: 2, dexterity: 3}, abilities: {alertness: {value: 2}, stealth: {value: 0, shown: true}}, wounds: -1};
  const a = CR.poolOf({pools: [["perception", "alertness"]], diff: 6}, sheet);
  assert.deepEqual([a.dice, a.diff, a.blocked], [4, 6, null]);
  assert.match(a.text, /wounds -1/);
  const s = CR.poolOf({pools: [["dexterity", "stealth"]], diff: 7, bonus: 1}, sheet);
  assert.deepEqual([s.dice, s.diff], [3, 8]);
  const k = CR.poolOf({pools: [["intelligence", "occult"]], diff: 6}, sheet);
  assert.match(k.blocked, /Knowledge/);
  const alt = CR.poolOf({pools: [["perception", "kenning"], ["perception", "alertness"]], diff: 7}, sheet);
  assert.equal(alt.ability, "alertness", "the first pool the character has wins");
  assert.equal(CR.normRequest({diff: 99}).diff, 10);
  assert.equal(CR.normRequest({mode: "nonsense"}).mode, "open");
  assert.equal(CR.normRequest({pools: [["notanattr", "x"]]}).pools[0][0], "perception");
});

test("call for a roll: results, contests and the gathered card's order", () => {
  assert.deepEqual(CR.resultOf([7, 8, 1, 3], 6), {successes: 1, ones: 1, botch: false, net: 1, wins: true});
  assert.equal(CR.resultOf([1, 2, 3], 6).botch, true);
  const c = CR.resultOf([9, 9, 9], 6, {contest: {successes: 2}});
  assert.deepEqual([c.net, c.wins], [1, true]);
  assert.equal(CR.resultOf([9, 9], 6, {contest: {successes: 2}}).wins, false, "a tie goes to the contest");
  const list = [{name: "B", successes: 1, net: 1, wins: true}, {name: "A", botch: true, net: 0}, {name: "C", successes: 3, net: 3, wins: true}, {name: "D", pending: true}];
  assert.deepEqual(CR.sortAnswers(list).map(x => x.name), ["C", "B", "A", "D"]);
  const sum = CR.summary(list);
  assert.match(sum, /2 of 3 succeeded/);
  assert.match(sum, /1 botched/);
  assert.match(sum, /best: C/);
  assert.match(sum, /1 still to roll/);
});

test("before the players arrive: clashes fail, the rest warn, a live world offers no fixes", () => {
  const base = {modules: {"wodx-chronicle": true, "wodx-actions": true, "vtda20-actions": false}, era: {year: 1197, name: "The Dark Ages", label: "midnight"},
    queue: 0, players: 2, playersWithout: [], testActors: [], scene: "The mill", xcard: true, beats: true};
  assert.equal(PF.worst(PF.checks(base)), "ok");
  const bad = PF.checks({...base, modules: {...base.modules, "vtda20-actions": true, "wodx-npc": false}, queue: 3, playersWithout: ["Bea"], scene: null, era: {year: null}});
  const st = Object.fromEntries(bad.map(c => [c.id, c.state]));
  assert.deepEqual([st.clash, st.wodx, st.queue, st.players, st.scene, st.era], ["fail", "warn", "warn", "warn", "warn", "fail"]);
  assert.equal(bad.find(c => c.id === "clash").fix, "modules");
  const live = PF.checks({...base, live: true, queue: 2});
  assert.ok(live.every(c => c.fix === null));
  assert.ok(live.some(c => c.id === "live"));
  assert.equal(PF.checks({...base, testActors: ["Ghoul (gate)"], testWorld: true}).find(c => c.id === "tests").state, "ok");
  assert.equal(PF.checks({...base, testActors: ["Ghoul (gate)"]}).find(c => c.id === "tests").state, "warn");
  assert.ok(PF.TEST_NAME.test("Anna (gate)") && !PF.TEST_NAME.test("Brother Tomas"));
});

test("the wrap-up: ticked reasons add up, the note names them, steps follow the modules on", () => {
  const r = WR.reasonsFor("vampire", {story: true});
  assert.equal(r.length, 8);
  assert.ok(WR.reasonsFor("werewolf").some(x => x.key === "concept") && WR.reasonsFor("mage", {story: true}).some(x => x.key === "drama"));
  assert.ok(WR.reasonsFor("wraith", {story: true}).some(x => x.key === "shadow") && !WR.reasonsFor("hunter").some(x => x.key === "inspired"));
  assert.match(WR.lineReasons("vampire", {early: true}).ref, /V20 Dark Ages gives no list/);
  assert.match(WR.lineReasons("mummy").ref, /house rule/);
  for ( const l of Object.values(WR.LINE_REASONS) ) assert.match(l.ref, /p\. ?\d|pdf \d/);
  const cols = WR.columnsFor(["vampire", "werewolf"], {story: true}).map(x => x.key);
  assert.ok(cols.includes("inspired") && cols.includes("concept") && new Set(cols).size === cols.length);
  assert.equal(WR.totalFor(["there", "acting", "danger"], r), 3);
  assert.equal(WR.totalFor(["there"], r, -5), 0);
  assert.match(WR.noteFor(["there", "heroism"], r, 1), /took part.*risked.*\+1 by the Storyteller/);
  assert.deepEqual(WR.steps({chronicle: true}).map(s => s.key), ["scene", "session", "timer"]);
  assert.deepEqual(WR.steps({chronicle: true, npc: true, creation: true}).map(s => s.key), ["scene", "factions", "xp", "session", "timer"]);
});

test("the session timer: breaks push the end back, one warning, words for the clock", () => {
  const m = 60000;
  let t = WR.startTimer(0, 240, 30);
  assert.equal(WR.readTimer(t, 100 * m).left, 140 * m);
  assert.equal(WR.readTimer(t, 100 * m).warn, false);
  t = WR.pauseTimer(t, 100 * m);
  assert.equal(WR.readTimer(t, 130 * m).paused, true);
  assert.equal(WR.readTimer(t, 130 * m).played, 100 * m, "a break doesn't count as play");
  t = WR.resumeTimer(t, 130 * m);
  assert.equal(t.end, 270 * m);
  assert.equal(WR.readTimer(t, 245 * m).warn, true);
  assert.equal(WR.readTimer({...t, warned: true}, 245 * m).warn, false);
  assert.equal(WR.readTimer(t, 280 * m).over, true);
  assert.equal(WR.clockWords(65 * m), "1 h 05 min");
  assert.equal(WR.clockWords(-4 * m), "4 min over");
  assert.equal(WR.readTimer(WR.blankTimer(), 0).running, false);
});

/* ---- The runtime, on a small stand-in for Foundry ---- */
const store = new Map();
let idn = 0;
globalThis.Hooks = {on: () => {}, once: () => {}, callAll: () => {}};
globalThis.foundry = {utils: {deepClone: o => structuredClone(o), randomID: () => `id${++idn}`, expandObject: o => o},
  applications: {api: {ApplicationV2: class { render() { return this; } }, DialogV2: {wait: async () => null}}}};
const chat = new Map();
const notes = [];
globalThis.ui = {notifications: {info: m => notes.push(m), warn: m => notes.push(m), error: m => notes.push(m)}};
class Coll extends Map { get contents() { return [...this.values()]; } find(f) { return this.contents.find(f); } filter(f) { return this.contents.filter(f); } }
globalThis.ChatMessage = {create: async d => { const m = {id: `m${++idn}`, ...structuredClone(d), async update(u) { for ( const [k, v] of Object.entries(u) ) { const p = k.split("."); let o = m; for ( const x of p.slice(0, -1) ) o = (o[x] ??= {}); o[p.at(-1)] = structuredClone(v); } }}; chat.set(m.id, m); return m; }};
let nextFaces = [];
globalThis.Roll = class { constructor(f) { this.n = Number(f.split("d")[0]); } async evaluate() { this.dice = [{results: Array.from({length: this.n}, (_, i) => ({result: nextFaces[i] ?? 5}))}]; } };
const users = new Coll([["gm", {id: "gm", name: "ST", isGM: true}], ["u1", {id: "u1", name: "Ana", isGM: false, character: null}]]);
const sheet = (per, al) => ({attributes: {perception: {value: per}, wits: {value: 2}}, abilities: {alertness: {value: al}}, health: {damage: {woundpenalty: 0}}});
const mk = (id, name, owner, system) => ({id, name, type: "Mortal", hasPlayerOwner: !!owner, flags: {}, system, testUserPermission: (u, l) => !!owner && u.id === owner && l === "OWNER"});
const actors = new Coll([["a1", mk("a1", "Anna", "u1", sheet(3, 2))], ["a2", mk("a2", "Bo", "u1", sheet(2, 0))]]);
const emitted = [];
globalThis.game = {user: users.get("gm"), users: Object.assign(users, {activeGM: users.get("gm")}), actors, messages: chat, modules: new Coll(), scenes: {active: {name: "The mill"}},
  world: {id: "rothenstein-wodx", flags: {wodx: {}}}, folders: new Coll(), macros: new Coll(), time: {worldTime: 0},
  socket: {emit: (c, m) => emitted.push(m)},
  settings: {register: (m, k, cfg) => { if ( !store.has(`${m}.${k}`) ) store.set(`${m}.${k}`, structuredClone(cfg.default)); },
    get: (m, k) => { if ( !store.has(`${m}.${k}`) ) throw new Error(`no setting ${m}.${k}`); return structuredClone(store.get(`${m}.${k}`)); },
    set: async (m, k, v) => { store.set(`${m}.${k}`, structuredClone(v)); return v; }}};
globalThis.canvas = {tokens: {controlled: []}};
const Core = await import(S("core.mjs"));
Core.registerSettings();
const H = await import(S("hand.mjs"));
H.registerHandSettings();

test("runtime: an open call rolls every pool on the Storyteller's computer and posts one card", async () => {
  nextFaces = [8, 7, 1, 9, 2];
  const msg = await H.callRoll({label: "Notice the cart", pools: [["perception", "alertness"]], diff: 6, mode: "open", actorIds: ["a1", "a2"]});
  const st = msg.flags["wodx-storyteller"].call;
  assert.equal(st.answers.length, 2);
  assert.equal(st.answers.find(a => a.name === "Anna").dice, 5);
  assert.equal(st.answers.find(a => a.name === "Anna").successes, 2);
  assert.equal(msg.whisper, undefined, "open: everyone sees it");
  assert.match(msg.content, /Notice the cart/);
  assert.match(Core.entries()[0].text, /Called for a roll/);
});

test("runtime: a secret call is whispered to the Storyteller only", async () => {
  const msg = await H.callRoll({label: "Hidden", mode: "secret", actorIds: ["a1"]});
  assert.deepEqual(msg.whisper, ["gm"]);
});

test("runtime: an asked call gathers each player's roll on the Storyteller's card; only an owner may answer", async () => {
  const before = chat.size;
  const card = await H.callRoll({label: "Resist", pools: [["wits", ""]], diff: 6, mode: "ask", actorIds: ["a1", "a2"]});
  const asks = [...chat.values()].slice(before + 1);
  assert.equal(asks.length, 2);
  assert.deepEqual(asks[0].whisper, ["u1", "gm"]);
  assert.match(card.content, /still to roll/);
  nextFaces = [9, 9];
  assert.equal(await H.answerAsk({askId: asks[0].id, userId: "nobody"}), null, "a stranger's answer is ignored");
  const ans = await H.answerAsk({askId: asks[0].id, userId: "u1"});
  assert.equal(ans.successes, 2);
  assert.equal(await H.answerAsk({askId: asks[0].id, userId: "u1"}), null, "one answer each");
  assert.match(card.content, /1 still to roll/);
  assert.ok(asks[0].flags["wodx-storyteller"].callAsk.done);
});

test("runtime: the snapshot for Before the players arrive reads the world without changing it", () => {
  const s = H.snapshot();
  assert.equal(s.scene, "The mill");
  assert.deepEqual(s.playersWithout, ["Ana"]);
  assert.equal(s.live, false);
  assert.equal(PF.worst(PF.checks(s)), "fail", "no Chronicle: no date");
});

test("runtime: the session timer lives in a world setting", async () => {
  await H.startTimer(60);
  assert.equal(H.readTimer().running, true);
  await H.pauseTimer();
  assert.equal(H.readTimer().paused, true);
  await H.stopTimer();
  assert.equal(H.readTimer().running, false);
});

test("runtime: absent tonight is set, logged and cleared when the session ends", async () => {
  const B = await import(S("between.mjs"));
  B.registerBetweenSettings();
  await B.setAbsent("u1", true, {runBy: "st"});
  assert.deepEqual(Core.absentIds(), ["u1"]);
  assert.match(Core.entries()[0].text, /Ana is away tonight; the Storyteller plays/);
  await Core.endSession({factions: false});
  assert.deepEqual(Core.absentIds(), []);
});

test("runtime: a downtime request goes to the queue; approving logs it and tells the player", async () => {
  const B = await import(S("between.mjs"));
  const queue = [], handlers = new Map();
  game.modules.set("wodx-chronicle", {active: true, api: {approvals: {propose: async r => queue.push(r), registerHandler: (t, h) => handlers.set(t, h), pending: () => queue}}});
  B.registerBetweenHandlers();
  game.user = users.get("u1");
  actors.get("a1").isOwner = true;
  await B.requestDowntime({actorId: "a1", kind: "study", nights: 3, what: "Reads the old books"});
  game.user = users.get("gm");
  assert.equal(queue.length, 1);
  assert.equal(queue[0].type, "wodx-storyteller.downtime");
  const before = chat.size;
  await handlers.get("wodx-storyteller.downtime").approve(queue[0]);
  assert.match(Core.entries()[0].text, /Downtime, study or train: Reads the old books/);
  assert.equal(Core.entries()[0].hours, 24);
  assert.equal(chat.size, before + 1);
  assert.deepEqual([...chat.values()].at(-1).whisper, ["u1", "gm"]);
  game.modules.delete("wodx-chronicle");
});

test("runtime: Willpower for acting by Nature adds one point, never past the permanent rating", async () => {
  const B = await import(S("between.mjs"));
  const a = actors.get("a2");
  a.system.advantages = {willpower: {permanent: 5, temporary: 4}};
  a.system.nature = "Survivor";
  a.update = async u => { a.system.advantages.willpower.temporary = u["system.advantages.willpower.temporary"]; };
  assert.equal(await B.willpowerForNature("a2"), 5);
  assert.equal(await B.willpowerForNature("a2"), null);
  assert.match(Core.entries()[0].text, /Bo regained a Willpower point by acting by their Nature \(Survivor\)/);
});
