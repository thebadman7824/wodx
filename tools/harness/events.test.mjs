import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(join(root, "modules/wodx-chronicle/scripts/events-rules.mjs"));
const DATA = (await import(join(root, "modules/wodx-chronicle/data/events.mjs"))).default;
const E = DATA.events;

test("event data: unique ids, real dates, a source and a summary for each", () => {
  const ids = new Set();
  for ( const ev of E ) {
    assert.ok(!ids.has(ev.id), `duplicate ${ev.id}`); ids.add(ev.id);
    assert.ok(Number.isInteger(ev.year) && ev.year >= 1197 && ev.year <= 2100, ev.id);
    if ( ev.month ) assert.ok(ev.month >= 1 && ev.month <= 12, ev.id);
    if ( ev.day ) assert.ok(ev.day >= 1 && ev.day <= 31, ev.id);
    assert.ok(["classic", "future", "both"].includes(ev.branch), ev.id);
    assert.ok(ev.source && ev.summary && ev.name, ev.id);
    assert.ok(Array.isArray(ev.lines) && ev.lines.length, ev.id);
  }
});

test("metaplot events start off; the rest start on", () => {
  const t = R.eventTable(E);
  assert.equal(t.find(e => e.id === "avatar-storm").on, false);
  assert.equal(t.find(e => e.id === "sixth-great-maelstrom").on, false);
  assert.equal(t.find(e => e.id === "black-death").on, true);
});

test("fired by date, oldest first, by timeline", () => {
  assert.deepEqual(R.firedAt(E, {year: 1346, month: 12, day: 31}), []);
  assert.deepEqual(R.firedAt(E, {year: 1347, month: 10, day: 1}), ["black-death"]);
  const y1500 = R.firedAt(E, {year: 1500, month: 1, day: 1});
  assert.deepEqual(y1500, ["black-death", "shattering", "camarilla", "cappadocians", "grand-convocation", "first-conclave", "thorns"]);
  const classic = R.firedAt(E, {year: 2030, month: 1, day: 1});
  assert.ok(classic.includes("reckoning") && !classic.includes("masquerade-frays") && !classic.includes("avatar-storm"));
  const future = R.firedAt(E, {year: 2030, month: 1, day: 1}, {futureBranch: true});
  assert.ok(future.includes("masquerade-frays") && !future.includes("reckoning") && future.includes("resurgence"));
});

test("overrides move and switch events", () => {
  const overrides = {"third-great-maelstrom": {year: 1650}, "avatar-storm": {on: true}, "black-death": {on: false}};
  const at1620 = R.firedAt(E, {year: 1620, month: 1, day: 1}, {overrides});
  assert.ok(!at1620.includes("third-great-maelstrom") && !at1620.includes("black-death"));
  assert.ok(R.firedAt(E, {year: 1999, month: 7, day: 1}, {overrides}).includes("avatar-storm"));
  assert.equal(R.effective(E.find(e => e.id === "third-great-maelstrom"), overrides).moved, true);
});

test("diff: forward fires in order, back undoes newest first", () => {
  const before = R.firedAt(E, {year: 1300, month: 1, day: 1});
  const now = R.firedAt(E, {year: 1490, month: 1, day: 1});
  const d = R.diffFired(E, before, now);
  assert.deepEqual(d.fired, ["black-death", "shattering", "camarilla", "cappadocians", "grand-convocation", "first-conclave"]);
  const back = R.diffFired(E, now, R.firedAt(E, {year: 1440, month: 1, day: 1}));
  assert.deepEqual(back.undone, ["first-conclave", "grand-convocation", "cappadocians"]);
});

test("labels and override cleaning", () => {
  assert.equal(R.dateLabel({year: 1916, month: 7, day: 1}), "1 July 1916");
  assert.equal(R.dateLabel({year: 1435}), "1435");
  assert.deepEqual(R.cleanOverride({on: true, year: "1650", month: "", day: "40"}), {on: true, year: 1650});
  assert.deepEqual(R.cleanOverride({year: "abc"}), {});
});

/* Runtime, on the Foundry stand-in */
const mock = installMock({dataRoot: root});
await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
const {getEngine} = await import(join(root, "modules/wodx-chronicle/scripts/calendar.mjs"));
const M = "wodx-chronicle";
const date = (y, m, d) => getEngine().dateToTime({year: y, month: m, day: d, hour: 21});

test("first check records the past silently; crossing an event posts a card", async () => {
  await Hooks.callAll("init");
  mock.setupTime();
  await game.time.set(date(1340, 1, 1));
  await Hooks.callAll("ready");
  await mock.settle();
  const api = game.modules.get(M).api;
  assert.deepEqual(game.settings.get(M, "eventsFired"), []);
  assert.ok(!mock.log.chat.some(c => /The world turns/.test(c.content)));
  const seen = [];
  Hooks.on("wodxEventFired", ev => seen.push(ev.id));
  await game.time.set(date(1348, 1, 1));
  await api.events.check();
  assert.deepEqual(seen, ["black-death"]);
  assert.ok(api.events.has("black-death"));
  assert.ok(mock.log.chat.some(c => /Black Death/.test(c.content)));
});

test("a time skip posts one card for every event it crosses", async () => {
  const api = game.modules.get(M).api;
  const before = mock.log.chat.length;
  await api.timeSkip(date(1500, 1, 1), {label: "Pass the Years", eraHandled: true});
  await mock.settle(); await mock.settle();
  const cards = mock.log.chat.slice(before).filter(c => /The world turns/.test(c.content));
  assert.equal(cards.length, 1);
  assert.match(cards[0].content, /Convention of Thorns/);
  assert.match(cards[0].content, /during Pass the Years/);
  const rules = game.journal.find(j => j.getFlag(M, "kind") === "chronicle-rules");
  await api.eras.refreshRulesJournal(); await mock.settle();
  assert.match(rules.pages.getName("Dated events").text.content, /Happened/);
});

test("setting the clock back undoes events", async () => {
  const api = game.modules.get(M).api;
  await game.time.set(date(1440, 1, 1));
  await api.events.check(); await mock.settle();
  assert.ok(!api.events.has("thorns"));
  assert.ok(api.events.has("camarilla"));
  assert.ok(mock.log.chat.some(c => /Not yet happened/.test(c.content)));
});

test("holding the world: the clock moves, nothing reacts; releasing catches up", async () => {
  const api = game.modules.get(M).api;
  await api.hold(true);
  assert.equal(api.isHeld(), true);
  assert.equal(api.isSkipping(), true, "per-tick work in every module waits");
  let skipHooks = 0;
  Hooks.on("wodxSkipEnd", () => skipHooks++);
  await api.timeSkip(date(1600, 1, 1), {label: "flashback"});
  await api.events.check(); await mock.settle();
  assert.equal(skipHooks, 0);
  assert.ok(!api.events.has("thorns"), "nothing fired while held");
  await api.hold(false); await mock.settle(); await mock.settle();

  assert.ok(api.events.has("thorns"), "the world caught up on release");
});
