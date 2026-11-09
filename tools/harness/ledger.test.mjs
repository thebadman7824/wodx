import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The ledger (WoDX Storyteller 0.2.0): rules, then the runtime on a small stand-in for Foundry */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const L = await import(join(root, "modules/wodx-storyteller/scripts/ledger-rules.mjs"));
const DAY = 86400;

test("entries: kinds, boon sizes and status are cleaned", () => {
  const e = L.normEntry({kind: "boon", size: "huge", from: {id: "a", name: "Radu"}, to: "Marta", what: "a favour", due: "100"});
  assert.equal(e.size, "minor");
  assert.deepEqual(e.to, {id: null, name: "Marta"});
  assert.equal(e.due, 100);
  assert.equal(L.normEntry({kind: "debt", size: "life"}).size, null);
  assert.equal(L.normEntry({kind: "nonsense"}).kind, "debt");
});

test("due dates: open, dated, not yet announced; going back un-announces", () => {
  const s = L.normLedger({entries: [{id: "1", due: 50}, {id: "2", due: 150}, {id: "3", due: 40, status: "kept"}, {id: "4"}, {id: "5", due: 200, announced: true}]});
  assert.deepEqual(L.comingDue(s, 100).map(e => e.id), ["1"]);
  assert.deepEqual(L.noLongerDue(s, 100).map(e => e.id), ["5"]);
});

test("the Veil: severity by witnesses, bands, mending after quiet months", () => {
  assert.deepEqual([1, 2, 4, 5, 9].map(n => L.breachSeverity({witnesses: Array(n).fill({})})), [1, 2, 2, 3, 3]);
  assert.equal(L.veilBand(10).name, "Sound");
  assert.equal(L.veilBand(3).name, "Hunted");
  assert.equal(L.veilBand(0).name, "Torn");
  const m = L.moveVeil({value: 8}, -2);
  assert.deepEqual([m.before, m.value, m.crossed?.name], [8, 6, "Talk"]);
  assert.equal(L.moveVeil({value: 1}, -5).value, 0);
  assert.equal(L.mendSteps({value: 6, lastBreach: 0}, 95 * DAY), 3);
  assert.equal(L.mendSteps({value: 9, lastBreach: 0}, 95 * DAY), 1);
  assert.equal(L.mendSteps({value: 6, lastBreach: 0}, 20 * DAY), 0);
});

test("inheritance and succession", () => {
  const s = L.normLedger({entries: [{id: "1", from: {id: "dead", name: "Old Graff"}, to: {id: "x", name: "Bo"}, what: "50 groschen"}, {id: "2", from: {id: "y"}, to: {id: "dead"}}, {id: "3", from: {id: "dead"}, status: "kept"}]});
  const rows = L.inheritance(s, "dead", {id: "heir", name: "Young Graff"});
  assert.deepEqual(rows.map(r => [r.entry.id, r.side]), [["1", "from"], ["2", "to"]]);
  const passed = L.passToHeir(rows[0].entry, "from", {id: "heir", name: "Young Graff"}, "Old Graff");
  assert.deepEqual(passed.from, {id: "heir", name: "Young Graff"});
  assert.match(passed.history.at(-1).what, /Passed from Old Graff to Young Graff/);
  const f = {members: ["dead", "a", "b"]};
  assert.equal(L.successor(f, "dead"), "a");
  assert.equal(L.successor(f, "dead", {heirOf: () => "b"}), "b");
  assert.equal(L.successor(f, "dead", {alive: id => id !== "a"}), "b");
  assert.equal(L.successor({members: ["dead"]}, "dead"), null);
});

/* ---- runtime ---- */
const store = new Map();
const hooks = new Map();
globalThis.Hooks = {on: (k, f) => (hooks.get(k) ?? hooks.set(k, []).get(k)).push(f), once: () => {}, callAll: (k, ...a) => (hooks.get(k) ?? []).forEach(f => f(...a))};
let idn = 0;
globalThis.foundry = {utils: {deepClone: o => (o === undefined ? o : structuredClone(o)), randomID: () => `id${++idn}`}};
const chat = [];
globalThis.ChatMessage = {create: async d => { chat.push(structuredClone(d)); return d; }};
globalThis.ui = {notifications: {info() {}, warn() {}, error() {}}};
class Coll extends Map { get contents() { return [...this.values()]; } find(f) { return this.contents.find(f); } filter(f) { return this.contents.filter(f); } getName(n) { return this.find(a => a.name === n); } [Symbol.iterator]() { return this.values(); } }
const users = new Coll([["gm", {id: "gm", isGM: true}]]);
users.activeGM = users.get("gm");
const time = {worldTime: 0};
globalThis.game = {user: users.get("gm"), users, time, actors: new Coll(), scenes: new Coll(), modules: new Map(), socket: {emit() {}},
  settings: {register: (m, k, cfg) => { if ( !store.has(`${m}.${k}`) ) store.set(`${m}.${k}`, structuredClone(cfg.default)); },
    get: (m, k) => { if ( !store.has(`${m}.${k}`) ) throw new Error(`no setting ${m}.${k}`); return structuredClone(store.get(`${m}.${k}`)); },
    set: async (m, k, v) => { store.set(`${m}.${k}`, structuredClone(v)); return v; }}};
store.set("wodx-chronicle.latitude", 50.1);
const queue = [], handlers = new Map();
let skipping = false;
game.modules.set("wodx-chronicle", {api: {propose: async r => { if ( !queue.some(q => q.key === r.key) ) queue.push(structuredClone(r)); }, registerApprovalHandler: (t, h) => handlers.set(t, h), isSkipping: () => skipping, isHeld: () => false}});
let factions = {factions: [{id: "f1", name: "The German council", leader: "graff", members: ["graff", "jan", "young"]}]};
game.modules.set("wodx-npc", {api: {factions: {state: () => structuredClone(factions), mutate: async fn => { const out = await fn(structuredClone(factions)); factions = out.state; }}}});
const actor = (id, name, flags = {}) => { const a = {id, name, flags}; game.actors.set(id, a); return a; };

const cal = await import(join(root, "modules/wodx-chronicle/scripts/calendar.mjs"));
cal.setReform?.("bohemia-1584");
const Led = await import(join(root, "modules/wodx-storyteller/scripts/ledger.mjs"));
const C = await import(join(root, "modules/wodx-storyteller/scripts/core.mjs"));
C.registerSettings();
Led.registerLedgerSettings();
Led.registerLedgerHooks();
Led.registerLedgerHandlers();
const settle = () => new Promise(r => setTimeout(r, 5));

test("a debt comes due once as the clock passes it, on one card; a skip waits until it ends", async () => {
  const graff = actor("graff", "Graff");
  await Led.saveEntry({kind: "debt", from: {id: "graff", name: "Graff"}, to: {id: null, name: "the Weavers"}, what: "50 groschen", due: 10 * DAY});
  await Led.saveEntry({kind: "consequence", from: {name: "The fire"}, what: "the bishop's visit", due: 20 * DAY});
  time.worldTime = 5 * DAY; Hooks.callAll("updateWorldTime"); await settle(); await Led.checkDue();
  assert.equal(chat.length, 0);
  skipping = true;
  time.worldTime = 30 * DAY; Hooks.callAll("updateWorldTime"); await settle(); await Led.checkDue();
  assert.equal(chat.length, 0, "nothing while a skip runs");
  skipping = false;
  Hooks.callAll("wodxSkipEnd", {label: "Pass the Years"}); await settle(); await Led.checkDue();
  assert.equal(chat.filter(c => /Comes due/.test(c.content)).length, 1);
  assert.match(chat.at(-1).content, /during Pass the Years/);
  assert.match(chat.at(-1).content, /50 groschen/);
  assert.match(chat.at(-1).content, /bishop/);
  assert.deepEqual(chat.at(-1).whisper, ["gm"]);
  await Led.checkDue();
  assert.equal(chat.filter(c => /Comes due/.test(c.content)).length, 1, "only once");
});

test("a breach lowers the Veil by its severity, with an undo; quiet months mend it", async () => {
  store.set("wodx-storyteller.veilOn", true);
  const before = chat.length;
  Hooks.callAll("wodxBreach", {entry: {event: "fed in the square", witnesses: [{}, {}, {}]}}); await settle(); await settle();
  assert.equal(Led.ledger().veil.value, 8);
  const card = chat.slice(before).find(c => /The Veil: 10 to 8/.test(c.content));
  assert.ok(card);
  assert.equal(card.flags["wodx-storyteller"].veilUndo, 2);
  time.worldTime += 65 * DAY;
  await Led.mend();
  assert.equal(Led.ledger().veil.value, 10);
});

test("a death: open entries go to the queue for the heir; a faction's leader is succeeded by the heir", async () => {
  const young = actor("young", "Young Graff", {"wodx-creation": {lineage: {family: {heirOf: {id: "graff", name: "Graff"}}}}});
  actor("jan", "Jan");
  assert.equal(Led.heirOf("graff")?.id, "young");
  Hooks.callAll("updateActor", game.actors.get("graff"), {flags: {"wodx-creation": {chronology: {died: time.worldTime}}}}); await settle(); await settle();
  const inherit = queue.find(q => q.type === "wodx-storyteller.inherit");
  const succeed = queue.find(q => q.type === "wodx-storyteller.succeed");
  assert.match(inherit.title, /pass "50 groschen" to Young Graff/);
  assert.match(succeed.title, /Young Graff succeeds Graff/);
  await handlers.get(inherit.type).approve(inherit);
  await handlers.get(succeed.type).approve(succeed);
  const e = Led.ledger().entries.find(x => x.what === "50 groschen");
  assert.deepEqual(e.from, {id: "young", name: "Young Graff"});
  assert.equal(factions.factions[0].leader, "young");
  // The same death does not queue twice
  const n = queue.length;
  Hooks.callAll("updateActor", game.actors.get("graff"), {flags: {"wodx-creation": {chronology: {died: time.worldTime}}}}); await settle();
  assert.equal(queue.length, n);
});

test("an actor sent to the archive is not a new death", async () => {
  const old = actor("old", "Old Ota");
  await Led.saveEntry({kind: "oath", from: {id: "old", name: "Old Ota"}, what: "to guard the bridge"});
  store.set("wodx-creation.archived", {old: {name: "Old Ota"}});
  const n = queue.length;
  Hooks.callAll("deleteActor", old); await settle();
  assert.equal(queue.length, n);
});
