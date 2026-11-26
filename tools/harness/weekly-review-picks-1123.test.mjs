// The improvement desk's 23 November 2026 picks (weekly review): mc1 willing Road Mentors, mc2 domain events on the
// hunt, mc3 an oath as a Road of Kings Moment of Truth, im1 the domain's season turn, im2 the Road and domain on the
// sheet, us2b the daily PC tally.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as RF from "../../modules/wodx-rules/actions/road-faith-rules.js";
import * as D from "../../modules/wodx-rules/actions/domain-da-rules.js";
import * as ST from "../../modules/wodx-rules/sheets/standing-rules.mjs";
import * as SP from "../pcq/status-push.mjs";

const src = p => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

test("mc3: an oath is a Road of Kings catalyst and goes to the approval queue", () => {
  assert.deepEqual(RF.truthFromEvent("kings", "oath"), {event: "oath", catalyst: "event", label: "An oath sworn to a liege or a vassal", src: "Road of Kings, PDF p. 62"});
  assert.equal(RF.truthFromEvent("beast", "oath"), null);
  assert.equal(RF.truthFromEvent(null, "oath"), null);
  assert.equal(RF.truthFromEvent("kings", "nothing"), null);
  // the prompt the Road window shows names the same page
  assert.ok(RF.ROAD_PROMPTS.kings.some(p => p.src === RF.ROAD_EVENTS.oath.src));
  const dom = src("modules/wodx-actions/scripts/domain-da.js"), rf = src("modules/wodx-actions/scripts/road-faith.js"), main = src("modules/wodx-actions/scripts/main.js");
  assert.match(dom, /ctx\.proposeTruth\?\.\(a, "oath"/);
  assert.match(rf, /approvals\?\.registerHandler\?\.\(T_TRUTH/);
  assert.match(rf, /openTruth\(a, "event"/);
  assert.match(main, /proposeTruth: \(a, ev, note\) => rf\(\)\.proposeTruth\(a, ev, note\)/);
  assert.match(main, /rf\(\)\.registerHandlers\(\)/);
});

test("mc1: a Road Mentor has to be willing, as a teacher does", () => {
  const price = {kind: "boon", size: "minor", what: "a boon owed for the teaching"};
  assert.deepEqual(RF.mentorAllowed({will: "teach", why: "Ana trusts them and teaches freely", blocks: false, price: null}), {ok: true, note: "Ana trusts them and teaches freely.", price: null});
  const asks = RF.mentorAllowed({will: "price", why: "Ana will teach for a price", blocks: false, price}, {gm: true});
  assert.equal(asks.ok, true); assert.equal(asks.price, price); assert.match(asks.note, /\(in the Ledger\)/);
  assert.match(RF.mentorAllowed({will: "price", why: "Ana will teach for a price", blocks: false, price}).note, /the Storyteller writes it in the Ledger/);
  const no = {will: "refuse", why: "Ana is hostile to them and will not teach", blocks: true, price: null};
  assert.equal(RF.mentorAllowed(no).ok, false);
  assert.match(RF.mentorAllowed(no, {gm: true}).note, /Storyteller's word/);
  assert.equal(RF.mentorAllowed(no, {gm: true}).ok, true);
  // a name typed by hand: the player is told the Storyteller confirms it
  assert.match(RF.mentorAllowed(null).note, /Storyteller confirms/);
  assert.equal(RF.mentorAllowed(null, {gm: true}).note, "");
  const rf = src("modules/wodx-actions/scripts/road-faith.js"), learn = src("modules/wodx-creation/scripts/learn.mjs"), cm = src("modules/wodx-creation/scripts/main.mjs");
  assert.match(rf, /creationLearn\(\)\?\.terms\?\.\(actor, m/);
  assert.match(rf, /if \( gm \) \{ try \{ await storytellerApi\(\)\?\.ledger\?\.save\?\.\(/);
  assert.match(learn, /export function teacherTerms\(learner, teacher/);
  assert.match(cm, /terms: learn\.teacherTerms/);
});

test("mc2: a siege or a disaster that takes Area shrinks Domain on the hunt; Herd events are named", () => {
  const events = [{key: "famine", name: "Famine", bg: "populace", delta: -1, restore: 0, until: 100},
    {key: "invasion", name: "Invasion", bg: "area", delta: -1, restore: 0, until: 100},
    {key: "pilgrims", name: "Pilgrims", bg: "resources", delta: 1, restore: 0, until: 100},
    {key: "outlaws", name: "Outlaws", bg: "populace", delta: -1, restore: 0, until: 100, ended: 50}];
  const r = D.huntFromDomain({aspects: {area: 3}, effective: {area: 2}, events});
  assert.equal(r.domainShift, -1);
  assert.equal(r.lines.length, 2);
  assert.match(r.lines[0], /^Famine in the domain: Herd -1 \(on the sheet already\), for a season \(V20 Dark Ages Companion p\. 114\)$/);
  assert.match(r.lines[1], /Area -1, so Domain -1 on the hunt/);
  assert.deepEqual(D.huntFromDomain({}), {domainShift: 0, lines: []});
  const main = src("modules/wodx-actions/scripts/main.js");
  assert.match(main, /DMR\.huntFromDomain\(/);
  assert.match(main, /name="domain" value="\$\{domainDots\}"/);
});

test("im1: the season turn proposes one event or none each season, with the maturation price", () => {
  const day = 86400, season = D.SEASON_DAYS * day;
  assert.equal(D.seasonOf(0), 0); assert.equal(D.seasonOf(season * 2 + 5), 2);
  // never turned: only marked, nothing proposed
  assert.deepEqual(D.seasonTurn({last: null, now: season * 3}), {due: false, season: 3, event: null, first: true});
  // the same season again: nothing
  assert.equal(D.seasonTurn({last: 3, now: season * 3 + 10}).due, false);
  // a new season: a d10 of 1 to 5 is quiet, 6 to 10 rolls the table
  assert.equal(D.seasonTurn({last: 3, now: season * 4, d10: 5}).event, null);
  assert.equal(D.seasonTurn({last: 3, now: season * 4, d10: 5}).due, true);
  assert.equal(D.seasonTurn({last: 3, now: season * 4, d10: 6, rand: 0}).event, D.EVENT_KEYS[0]);
  assert.equal(D.eventWords("famine", 1197), "Famine");
  assert.match(D.eventWords("pilgrims", 1990), /tourists/);
  assert.equal(D.eventWords("miracle", 1990), "Miracle");
  const dom = src("modules/wodx-actions/scripts/domain-da.js"), main = src("modules/wodx-actions/scripts/main.js");
  assert.match(dom, /type: T_SEASON, key: `domainSeason:\$\{a\.id\}:\$\{t\.season\}`/);
  assert.match(dom, /D\.maturationCost\(bg\(a, "domain"\)/);
  assert.match(dom, /try \{ await seasonTurn\(now\); \}/);
  assert.match(main, /dmx\(\)\.registerHandlers\(\)/);
});

test("im2: the sheet shows the Road and the domain at a glance", () => {
  const road = {road: {name: "Road of Kings", value: 6}, rank: {label: "Adherent"}, faith: {status: null}, mentor: {name: "Ana", rating: 8}, truth: {key: "event"}, change: null};
  const domain = {domain: 4, aspects: {area: 2, defense: 1, prosperity: 1, secret: 0}, events: [{name: "Famine"}, {name: "Outlaws", ended: 10}]};
  const oaths = [{liege: "Count Ota", vassal: "Ilse", status: "sworn"}, {liege: "Ilse", vassal: "Jan", status: "sworn"}, {liege: "Ilse", vassal: "Old", status: "released"}];
  const L = ST.standingLines({road, domain, oaths, name: "Ilse"});
  assert.deepEqual(L.road, ["Road of Kings 6: Adherent", "Mentor: Ana (8 dots)", "A Moment of Truth is open this story"]);
  assert.deepEqual(L.domain, ["Domain 4: Area 2, Defense 1, Prosperity 1, Secret Ways 0", "Now: Famine", "Sworn to Count Ota", "Vassals: Jan"]);
  assert.deepEqual(ST.standingLines({road: {road: {name: "Humanity", value: 0}}, domain: {domain: 0}}), {road: [], domain: []});
  const m = src("modules/wodx-sheets/scripts/main.mjs");
  assert.match(m, /await standingStrip\(this\.actor, el\)/);
  assert.match(m, /act\.roadFaith\?\.\(actor\)/);
  assert.match(m, /act\.domainDA\?\.\(actor\)/);
});

test("us2b: the daily PC tally adds each five minutes, by lane, GPU class, renders and OCR", () => {
  const s1 = {host: "main", time: "2026-11-23T10:00:00.000Z", runnerUp: true, lanes: [{id: 2, up: true}, {id: 3, up: false}], laneBusy: {2: true, 3: false},
    gpu: {loadPct: 90, jobHeld: true, class: "art"}, comfy: {doneLast5: 3}, ocr: {workers: 2, lastOutputMin: 4}};
  const t1 = SP.addSample(null, s1);
  assert.deepEqual(t1.lanes, {2: {upMin: 5, busyMin: 5}, 3: {upMin: 0, busyMin: 0}});
  assert.deepEqual(t1.gpu, {busyMin: 5, heldMin: {art: 5}});
  assert.equal(t1.comfyRenders, 3); assert.equal(t1.ocrWorkingMin, 5); assert.equal(t1.runnerUpMin, 5); assert.equal(t1.laneBusyKnown, true);
  const t2 = SP.addSample(t1, {host: "main", time: "2026-11-23T10:05:00.000Z", runnerUp: false, lanes: [{id: 2, up: true}], gpu: {loadPct: 10, jobHeld: false}, ocr: {workers: 1, lastOutputMin: 40}});
  assert.equal(t2.samples, 2); assert.equal(t2.lanes[2].upMin, 10); assert.equal(t2.lanes[2].busyMin, 5); assert.equal(t2.gpu.busyMin, 5); assert.equal(t2.ocrWorkingMin, 5);
  assert.equal(t1.samples, 1, "the earlier tally is not changed");
  // a new UTC day starts a new tally
  assert.equal(SP.addSample(t2, {host: "main", time: "2026-11-24T00:00:00.000Z", lanes: []}).samples, 1);
  // renders: only prompts finished after the time count
  assert.equal(SP.doneSince({a: {status: {messages: [["execution_success", {timestamp: 200}]]}}, b: {status: {messages: [["execution_success", {timestamp: 50}]]}}, c: {status: {messages: [["execution_error", {timestamp: 300}]]}}}, 100), 1);
  // lane folders as the lanes tools read lanes.json
  const cfg = {lanes: [{id: 2, dataPath: "%LD%/l2"}, {id: 8, host: "benjamin-pc", dataPath: "D:/l8"}], hosts: {"benjamin-pc": {}}};
  assert.deepEqual(Object.keys(SP.laneStateDirs(cfg, [2, 8], "DESKTOP-X", {LD: "C:/F"})), ["2"]);
  assert.deepEqual(Object.keys(SP.laneStateDirs(cfg, [2, 8], "Benjamin-PC", {})), ["8"]);
  assert.equal(SP.lockHeld({pid: 1, until: "2026-01-01T00:00:00Z"}, Date.parse("2026-02-01T00:00:00Z"), () => true), false);
  assert.equal(SP.lockHeld({pid: 1}, Date.now(), () => true), true);
  assert.equal(SP.lockHeld(null), false);
  const sp = src("tools/pcq/status-push.mjs");
  assert.match(sp, /\$\{REL\}\/daily\/\$\{NAME\}-\$\{mine\.time\.slice\(0, 10\)\}\.json/);
});
