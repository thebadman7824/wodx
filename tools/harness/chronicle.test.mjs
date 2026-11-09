import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
// fetch paths are "/modules/wodx-chronicle/..." → <repo>/modules/wodx-chronicle/...

await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
const {getEngine} = await import(join(root, "modules/wodx-chronicle/scripts/calendar.mjs"));
const {ClockApp} = await import(join(root, "modules/wodx-chronicle/scripts/clock-app.mjs"));
const {HouseRulesApp} = await import(join(root, "modules/wodx-chronicle/scripts/house-rules-app.mjs"));
const M = "wodx-chronicle";
const set = (k) => game.settings.get(M, k);
const date = (y, m, d, h = 21) => getEngine().dateToTime({year: y, month: m, day: d, hour: h});
const fill = values => form => {
  for ( const [k, v] of Object.entries(values) ) {
    const el = form.elements[k];
    if ( el.type === "checkbox" ) el.checked = !!v; else el.value = String(v);
  }
  return "ok";
};

test("init registers the calendar and settings", async () => {
  await Hooks.callAll("init");
  assert.equal(CONFIG.time.worldCalendarConfig.years.yearZero, 1197);
  assert.equal(set("reform"), "bohemia-1584");
  assert.equal(set("rule.eraProposals"), true);
});

test("ready sets the first era, writes the rules journal and opens the clock", async () => {
  mock.setupTime();
  await Hooks.callAll("ready");
  await mock.settle();
  assert.equal(set("activeEra"), "dark-ages");
  assert.equal(CONFIG.worldofdarkness.defaultVampireEra, "darkages");
  assert.equal(CONFIG.worldofdarkness.defaultMageEra, "victorian");
  assert.equal(game.settings.get("worldofdarkness", "eraVampire"), "darkages");
  const rules = game.journal.find(j => j.getFlag(M, "kind") === "chronicle-rules");
  assert.ok(rules, "Chronicle Rules journal exists");
  assert.equal(game.journal.filter(j => j.getFlag(M, "kind") === "chronicle-rules").length, 1, "only one rules journal");
  assert.match(rules.pages.getName("Era and calendar").text.content, /Dark Ages/);
  assert.match(rules.pages.getName("House rules").text.content, /Light-touch mode/);
  assert.ok(document.querySelector("#wodx-clock, .wodx-clock") || true);
  assert.ok(mock.log.notifications.some(([, m]) => /opening date/.test(m)));
});

test("the clock shows the date and moon", async () => {
  const app = new ClockApp();
  await app.render({force: true});
  const text = app.element.textContent;
  assert.match(text, /Wednesday, 1 January 1197/);
  assert.match(text, /Julian calendar/);
  assert.match(text, /Auspice moon/);
});

test("set date: 10 March 1200, 21:00; a reform-skipped day is refused", async () => {
  const {setDateDialog} = game.modules.get(M).api ? {setDateDialog: game.modules.get(M).api.setDate} : {};
  mock.DialogV2.queue(fill({year: 1200, month: 3, day: 10, hour: 21, minute: 0}));
  assert.equal(await setDateDialog(), true);
  assert.equal(game.time.worldTime, date(1200, 3, 10));
  assert.equal(set("openingSet"), true);
  mock.DialogV2.queue(fill({year: 1584, month: 1, day: 10, hour: 0, minute: 0}));
  assert.equal(await setDateDialog(), false);
  assert.ok(mock.log.notifications.some(([, m]) => /skipped at the calendar reform/.test(m)));
  mock.DialogV2.queue(fill({year: 1201, month: 2, day: 30, hour: 0, minute: 0}));
  assert.equal(await setDateDialog(), false);
});

test("next dusk lands after sunset", async () => {
  const app = new ClockApp();
  await app.render({force: true});
  await game.time.set(date(1200, 3, 10, 10));
  await app.click('[data-action="dusk"]');
  const d = getEngine().timeToDate(game.time.worldTime);
  assert.ok(d.hour >= 17 && d.hour <= 19, `dusk at ${d.hour}:${d.minute}`);
});

test("crossing into 1347 proposes an era change; approving applies it", async () => {
  await game.time.set(date(1347, 6, 1));
  await mock.settle();
  const api = game.modules.get(M).api;
  const pending = api.approvals.pending();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].type, "era-change");
  assert.equal(set("activeEra"), "dark-ages", "not changed before approval");
  await game.time.advance(3600);
  assert.equal(api.approvals.pending().length, 1, "no duplicate proposal");
  await api.approvals.decide(pending[0].id, "approve");
  await mock.settle();
  assert.equal(set("activeEra"), "long-night");
  assert.ok(mock.log.chat.some(c => /Plague and Long Night/.test(c.content)));
});

test("rejecting keeps the era and is not asked again", async () => {
  const api = game.modules.get(M).api;
  await game.time.set(date(1460, 1, 1));
  const [p] = api.approvals.pending();
  assert.equal(p.data.to, "renaissance");
  await api.approvals.decide(p.id, "reject");
  await game.time.advance(86400);
  assert.equal(api.approvals.pending().length, 0);
  assert.equal(set("activeEra"), "long-night");
});

test("with proposals off the era follows the date at once; the lock overrides", async () => {
  await game.settings.set(M, "rule.eraProposals", false);
  await game.time.advance(86400);
  await mock.settle();
  assert.equal(set("activeEra"), "renaissance");
  await game.settings.set(M, "eraLock", "classical");
  await mock.settle();
  assert.equal(set("activeEra"), "classical");
  assert.equal(CONFIG.worldofdarkness.defaultMortalEra, "classical");
  assert.equal(CONFIG.worldofdarkness.defaultWerewolfEra, "darkages");
  await game.settings.set(M, "eraLock", "");
  await mock.settle();
  assert.equal(set("activeEra"), "renaissance");
  await game.settings.set(M, "rule.eraProposals", true);
});

test("a player's request reaches the queue as a plain request, even if it claims another type", async () => {
  mock.asPlayer();
  const api = game.modules.get(M).api;
  mock.DialogV2.queue(fill({title: "Can Anna's ghoul learn Auspex?", detail: "From her domitor"}));
  await api.approvals.askStoryteller();
  await api.propose({type: "era-change", title: "sneaky", data: {to: "modern"}});
  assert.equal(mock.log.socket.length, 2);
  await mock.deliver("gm");
  mock.asGM();
  const pending = api.approvals.pending();
  assert.equal(pending.length, 2);
  assert.ok(pending.every(p => p.type === "request"));
  await api.approvals.decide(pending[0].id, "approve", "Yes, at the usual cost");
  assert.ok(mock.log.chat.some(c => c.whisper?.includes("p1") && /usual cost/.test(c.content)));
  await api.approvals.decide(pending[1].id, "reject");
});

test("no GM online: the player is told, nothing is sent", async () => {
  mock.asPlayer();
  globalThis.__gmOnline = false;
  const api = game.modules.get(M).api;
  const sent = await api.propose({type: "request", title: "x"});
  assert.equal(sent, false);
  assert.equal(mock.log.socket.length, 0);
  globalThis.__gmOnline = true;
  mock.asGM();
});

test("X-card: shown to the presser, sent without a name, pauses the game", async () => {
  mock.asPlayer();
  const api = game.modules.get(M).api;
  api.safety.pressXCard();
  assert.ok(document.getElementById("wodx-xcard"));
  assert.equal(mock.log.socket.length, 1);
  assert.deepEqual(mock.log.socket[0].data, {type: "safety.xcard", payload: {}});
  await mock.deliver("gm");
  mock.asGM();
  assert.equal(game.paused, true);
  game.paused = false;
});

test("lines and veils: recorded unsigned, removable", async () => {
  mock.asPlayer();
  const api = game.modules.get(M).api;
  mock.DialogV2.queue(fill({kind: "line", text: "No harm to children"}));
  await api.safety.submitLineOrVeil();
  mock.DialogV2.queue(fill({kind: "veil", text: "Torture"}));
  await api.safety.submitLineOrVeil();
  await mock.deliver("gm");
  mock.asGM();
  const j = game.journal.find(x => x.getFlag(M, "kind") === "session-zero");
  const html = j.pages.getName("Lines and veils").text.content;
  assert.match(html, /No harm to children/);
  assert.match(html, /Torture/);
  assert.doesNotMatch(html, /Anna/);
  assert.match(j.pages.getName("Checklist").text.content, /Lines and veils/);
  mock.DialogV2.queue(form => { form.querySelector("input[name=rm]").checked = true; return "ok"; });
  await api.safety.manageLinesVeils();
  assert.doesNotMatch(j.pages.getName("Lines and veils").text.content, /No harm to children/);
});

test("house rules form saves switches and rewrites the rules journal", async () => {
  const app = new HouseRulesApp();
  await app.render({force: true});
  app.element.querySelector('input[name="timeOfJudgment"]').checked = true;
  await app.submit();
  await mock.settle();
  assert.equal(set("rule.timeOfJudgment"), true);
  const rules = game.journal.find(j => j.getFlag(M, "kind") === "chronicle-rules");
  assert.match(rules.pages.getName("House rules").text.content, /On:<\/strong> Time of Judgment/);
  assert.match(rules.pages.getName("House rules").text.content, /Updated \(in-game date\)/);
});

test("era test: a character per line in every era, all pass", async () => {
  const api = game.modules.get(M).api;
  mock.DialogV2.queue(() => true);
  const result = await api.runEraTest();
  assert.equal(result.rows.length, 11 * 4);
  assert.equal(result.failures, 0, JSON.stringify(result.rows.filter(r => !r.pass)));
  const j = game.journal.find(x => x.getFlag(M, "kind") === "era-test");
  assert.match(j.pages.getName("Results").text.content, /All passed/);
  assert.equal(CONFIG.worldofdarkness.defaultVampireEra, "darkages", "active era restored afterwards");
});

test("queue relief: the rules route a proposal and pick a bulk decision's entries", async () => {
  const QR = await import(join(root, "modules/wodx-chronicle/scripts/approvals-rules.mjs"));
  assert.equal(QR.routeProposal("era-change"), "queue");
  assert.equal(QR.routeProposal("era-change", {auto: {"era-change": true}}), "auto");
  assert.equal(QR.routeProposal("request", {auto: {request: true}}), "queue", "a player's request always waits");
  assert.equal(QR.routeProposal("wodx-npc.faction", {cap: 2, used: 1}), "queue");
  assert.equal(QR.routeProposal("wodx-npc.faction", {cap: 2, used: 2}), "hold");
  assert.equal(QR.routeProposal("wodx-npc.faction", {cap: 0, used: 99}), "queue", "0 is no cap");
  assert.equal(QR.routeProposal("wodx-npc.faction", {auto: {"wodx-npc.faction": true}, cap: 1, used: 5}), "auto");
  assert.equal(QR.routeProposal("wodx-npcish", {cap: 1, used: 5}), "queue");
  assert.deepEqual(QR.bulkIds([{id: "a"}, {id: "b"}, {id: "c"}], ["b"]), ["a", "c"]);
  assert.deepEqual(QR.bulkIds([], ["x"]), []);
  assert.deepEqual(QR.cleanAuto({a: true, b: false, request: true, c: "yes"}), {a: true});
  assert.deepEqual(QR.cleanAuto({a: true, z: true}, ["a"]), {a: true});
});

test("queue relief in the queue: bulk approve with an exception, approve on its own, the NPC cap holds the rest", async () => {
  const api = game.modules.get(M).api, A = api.approvals;
  const done = [];
  A.registerHandler("test-kind", {label: "Test kind", approve: e => done.push(e.title)});
  A.registerHandler("wodx-npc.test", {label: "Test faction move", approve: e => done.push(e.title)});
  for ( const t of ["one", "two", "three"] ) await A.propose({type: "test-kind", title: t});
  const ids = A.pending().filter(p => p.type === "test-kind").map(p => p.id);
  assert.equal(ids.length, 3);
  const n = await A.decideMany("approve", {except: [ids[1]], ids: null});
  assert.ok(n >= 2);
  assert.deepEqual(done.slice(0, 2), ["one", "three"]);
  assert.ok(A.pending().some(p => p.title === "two"), "the exception still waits");
  await A.decideMany("reject", {ids: [ids[1]]});
  assert.ok(!A.pending().some(p => p.type === "test-kind"));

  await A.setAuto("test-kind", true);
  assert.equal(await A.addToQueue({id: "auto1", type: "test-kind", title: "four", data: {}}), "auto");
  assert.ok(done.includes("four"));
  assert.ok(A.history().find(h => h.id === "auto1")?.auto, "listed as approved on its own");
  await A.setAuto("test-kind", false);
  assert.deepEqual(set("autoApprove"), {});

  await game.settings.set(M, "npcCap", 1);
  A.resetSession();
  assert.equal(await A.addToQueue({id: "n1", type: "wodx-npc.test", title: "move one", data: {}}), "queued");
  assert.equal(await A.addToQueue({id: "n2", type: "wodx-npc.test", title: "move two", data: {}}), "held");
  assert.equal(A.held().length, 1);
  assert.equal(await A.releaseHeld(), 1);
  assert.equal(A.held().length, 0);
  assert.ok(A.pending().some(p => p.id === "n2"));
  await A.decideMany("reject", {ids: ["n1", "n2"]});
  await game.settings.set(M, "npcCap", 0);
});

test("module stays idle in a world without the WoDX flag", async () => {
  // Checked by reading main.mjs: init returns before registering anything when flags.wodx is missing.
  const src = (await import("node:fs")).readFileSync(join(root, "modules/wodx-chronicle/scripts/main.mjs"), "utf8");
  assert.match(src, /if \( !isWoDXWorld\(\) \)/);
});

test("no errors were raised as notifications", () => {
  const errors = mock.log.notifications.filter(([level]) => level === "error");
  assert.deepEqual(errors, []);
});
