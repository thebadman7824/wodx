import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* WoDX Actions (B3560 to B3565): debts and oaths, the Beast at the wheel, low Humanity, long torpor, diablerie's marks. */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const D = await import(join(root, "modules/wodx-actions/scripts/debts-rules.js"));
const B = await import(join(root, "modules/wodx-actions/scripts/beast-marks-rules.js"));
const YEAR = 365.25 * 86400;

test("the hunt takes the form of its age and sect", () => {
  assert.equal(D.huntFormFor(1230, "camarilla"), "lord");
  assert.equal(D.huntFormFor(1230, ""), "lord");
  assert.equal(D.huntFormFor(1600, "camarilla"), "camarilla");
  assert.equal(D.huntFormFor(1470, "sabbat"), "lord");
  assert.equal(D.huntFormFor(1999, "sabbat"), "sabbat");
  assert.equal(D.huntFormFor(1999, "anarch"), "anarch");
  assert.equal(D.huntFormFor(1999, ""), "independent");
  assert.equal(D.huntFormFor(1500, "camarilla", {camarillaFrom: 1550}), "lord");
  for (const f of Object.values(D.HUNT_FORMS)) assert.match(f.page, /V20/);
});

test("a hunt plan takes Status, names the ground, and ends by death or lifting", () => {
  const p = D.huntPlan({target: "Ilse", caller: "Prince Vaclav", form: "camarilla", ground: "lifeBoon", bounty: "a haven", pardon: true, year: 1890, status: 3});
  assert.equal(p.label, "the Blood Hunt");
  assert.equal(p.status.before, 3); assert.equal(p.status.during, 0);
  assert.equal(p.pardon, true); assert.match(p.rumour, /Ilse/); assert.match(p.rumour, /courier/);
  assert.equal(D.huntPlan({form: "sabbat", pardon: true}).pardon, false);
  assert.equal(D.huntPlan({ground: "nonsense"}).ground, "other");
  const lifted = D.huntEnd(p, "lifted");
  assert.equal(lifted.active, false); assert.equal(lifted.restoreStatus, 3);
  const dead = D.huntEnd(p, "dead");
  assert.equal(dead.ended, "dead"); assert.equal(dead.restoreStatus, null);
  assert.equal(D.huntEnd(dead, "lifted"), null);
  assert.match(D.huntRumour("lord", "X", "", 1200), /mouth to mouth/);
  assert.match(D.huntRumour("camarilla", "X", "", 2005), /phones/);
});

test("broken changeling oaths cost what the book sets", () => {
  const clasped = D.c20Backlash({kind: "clasped"});
  assert.deepEqual(clasped.breaker.changes, {willpower: -2}); assert.deepEqual(clasped.others.changes, {willpower: -2});
  assert.deepEqual(D.c20Backlash({kind: "fealty"}).others.changes, {});
  assert.equal(D.c20Backlash({kind: "crossedBlades"}).breaker.changes.permWillpower, -1);
  const deal = D.c20Backlash({kind: "doneDeal", successes: 3, bane: "place", baneName: "the mill"});
  assert.ok(deal.lines.some(l => /the mill/.test(l) && /3 scenes/.test(l)));
  assert.ok(D.c20Backlash({kind: "doneDeal", successes: 2}).lines.some(l => /2 automatic botches/.test(l)));
  assert.ok(D.c20Backlash({kind: "burden"}, {willing: false}).lines.some(l => /atone/.test(l)));
  assert.ok(D.c20Backlash({kind: "custom", penalty: "lose your shadow"}).lines.some(l => /lose your shadow/.test(l)));
  assert.equal(D.c20Backlash({kind: "weird"}).label, D.C20_OATHS.custom.label);
  for (const o of Object.values(D.C20_OATHS)) assert.ok(o.page >= 174 && o.page <= 267);
});

test("oath changes respect the tempers' bounds", () => {
  const t = {willpower: {temp: 1, perm: 5}, glamour: {temp: 4, perm: 6}, banality: {temp: 2, perm: 3}};
  const a = D.applyOathChanges(t, {willpower: -3, banality: 2});
  assert.equal(a.willpower.temp, 0); assert.equal(a.banality.temp, 4);
  const b = D.applyOathChanges({willpower: {temp: 5, perm: 5}, glamour: {temp: 4, perm: 6}}, {permWillpower: -1, glamourAll: true});
  assert.equal(b.willpower.perm, 4); assert.equal(b.willpower.temp, 4); assert.equal(b.glamour.temp, 0);
  assert.equal(D.changesText({willpower: -2, banality: 1}), "Willpower −2, Banality +1");
});

test("Dark Ages fae oaths carry their own punishment", () => {
  const r = D.daBacklash({kind: "stone", rating: 3, penalty: "the house loses its luck"});
  assert.ok(r.lines.some(l => /loses its luck/.test(l)));
  assert.ok(D.daBacklash({kind: "iron", rating: 1, among: "fae"}).lines.some(l => /no magic follows/.test(l)));
  assert.ok(D.daBacklash({kind: "gold", rating: 5}).lines.some(l => /whole people/.test(l)));
  assert.match(r.page, /109-110/);
});

test("the Beast goes for the nearest foe, then blood, and runs from fire", () => {
  const near = [{name: "Anna", yards: 3, kind: "friend"}, {name: "Guard", yards: 9, kind: "foe"}, {name: "Thug", yards: 5, kind: "foe"}, {name: "Torch", yards: 4, kind: "fire"}];
  assert.equal(B.beastWants("frenzy", near).target, "Thug");
  assert.equal(B.beastWants("frenzy", near.filter(x => x.kind !== "foe")).action, "feed");
  assert.equal(B.beastWants("rotschreck", near).from, "Torch");
  assert.equal(B.beastWants("frenzy", []).action, "rage");
  assert.equal(B.canHold(0).ok, false);
  assert.equal(B.canHold(2, "a:1:2", "a:1:2").ok, false);
  assert.equal(B.canHold(2, "a:1:1", "a:1:2").ok, true);
});

test("low Humanity: bearing, looks, seeming alive and the hour of rising", () => {
  assert.deepEqual([10, 9, 8, 7, 4, 3, 2, 1, 0].map(B.bearing), [-2, -1, -1, 0, 0, 1, 1, 2, 2]);
  assert.deepEqual([7, 4, 3, 2, 1, 0].map(r => B.lookOf(r)), [0, 0, 1, 1, 2, 2]);
  assert.equal(B.lookOf(1, {humanity: false}), 0);
  assert.equal(B.seemAliveCost(9), 0); assert.equal(B.seemAliveCost(8), 0); assert.equal(B.seemAliveCost(3), 5);
  assert.ok(B.riseOffset(8) < 0); assert.equal(B.riseOffset(5), 0); assert.equal(B.riseOffset(1), 60);
  for (let r = 1; r < 10; r++) assert.ok(B.riseOffset(r) >= B.riseOffset(r + 1));
  assert.equal(B.riseText(8), "just before sunset"); assert.equal(B.riseText(3), "35 minutes after sunset"); assert.equal(B.riseText(0), "an hour after sunset");
  assert.equal(B.riseAt(1000, 4), 1000 + 20 * 60);
});

test("a long torpor: what changed, old tongues, Abilities behind", () => {
  assert.equal(B.wakeReport({startYear: 1800, endYear: 1860}), null);
  const r = B.wakeReport({startYear: 1700, endYear: 1999, langs: ["Czech", "Latin", "Czech"],
    abilities: [{key: "firearms", value: 2}, {key: "melee", value: 0}, {key: "brawl", value: 3}, {key: "Drive", value: 1}],
    events: [{year: 1650, name: "old", lines: ["all"]}, {year: 1914, name: "war", lines: ["all"]}, {year: 1950, name: "garou", lines: ["werewolf"]}, {year: 1999, name: "end", lines: ["vampire"]}]});
  assert.equal(r.years, 299); assert.equal(r.centuries, 2);
  assert.deepEqual(r.events.map(e => e.name), ["war", "end"]);
  assert.deepEqual(r.oldTongues, ["Czech", "Latin"]);
  assert.deepEqual(r.behind.map(b => b.key), ["firearms", "Drive"]);
  assert.equal(r.behind[0].xp, 2); assert.equal(r.behind[0].months, 3);
  assert.deepEqual(B.wakeReport({startYear: 1900, endYear: 1980, langs: ["German"]}).oldTongues, []);
  assert.equal(Math.round(B.sleptYears(0, 80 * YEAR)), 80);
});

test("diablerie leaves veins for the Generation gap and a taint a month a step", () => {
  const m = B.diablerieMarks({victimGen: 9, originalGen: 12, at: 100});
  assert.equal(m.years, 3); assert.equal(m.months, 3);
  assert.equal(m.veinsUntil, 100 + 3 * YEAR);
  const up = B.diablerieMarks({victimGen: 13, originalGen: 12});
  assert.equal(up.years, 1); assert.equal(up.months, 1);
  const now = B.marksNow([m], 100 + 0.5 * YEAR);
  assert.equal(now.veins.length, 1); assert.equal(now.taint.length, 0);
  assert.equal(B.marksNow([m], 100 + 4 * YEAR).veins.length, 0);
  assert.equal(B.taintDifficulty(7), 5); assert.equal(B.taintDifficulty(1), 10); assert.equal(B.taintDifficulty(10), 2);
  assert.equal(B.taintDifficulty(7, {onPath: true}), null);
});

test("the victim's soul: the book's trigger, then the house roll", () => {
  assert.equal(B.soulMayPush({victimGen: 6, originalGen: 10, victimWillpower: 10}), true);
  assert.equal(B.soulMayPush({victimGen: 9, originalGen: 10, victimWillpower: 10}), false);
  assert.equal(B.soulMayPush({victimGen: 6, originalGen: 10, victimWillpower: 9}), false);
  assert.equal(B.diablerieMarks({victimGen: 6, originalGen: 10, victimWillpower: 10}).soul, true);
  assert.equal(B.soulDifficulty(6, 10), 9); assert.equal(B.soulDifficulty(9, 11), 8); assert.equal(B.soulDifficulty(12, 11), 6);
  assert.equal(B.soulResult({botch: true}).length, "night");
  assert.equal(B.soulResult({successes: 0}).length, "scene");
  assert.equal(B.soulResult({successes: 2}).pushes, false);
});

test("the menus and the API reach every new part", () => {
  const menus = readFileSync(join(root, "modules/wodx-actions/scripts/profile-menus.js"), "utf8");
  const main = readFileSync(join(root, "modules/wodx-actions/scripts/main.js"), "utf8");
  for (const k of ["bloodHunt", "oaths", "diablerieMarks"]) {
    assert.ok(menus.includes(`"api:${k}"`), `menu ${k}`);
    assert.ok(new RegExp(`\\b${k}: `).test(main), `API ${k}`);
  }
  assert.ok(main.includes(":not([data-dm])"), "the generic button binder skips the new buttons");
  const kin = readFileSync(join(root, "modules/wodx-actions/scripts/kindred.js"), "utf8");
  assert.ok(kin.includes("riseLines") && kin.includes("auraNote") && kin.includes("prestationJournal"));
});

test("the pixel face shows low Humanity (Paperdoll, B3566)", async () => {
  const F = await import(join(root, "modules/wodx-paperdoll/scripts/face64-rules.mjs"));
  assert.deepEqual([7, 4, 3, 2, 1, 0].map(r => F.lowHumanityFor(r)), [0, 0, 1, 1, 2, 2]);
  assert.equal(F.lowHumanityFor(1, {humanity: false}), 0);
  assert.equal(F.lowHumanityLevel(5), 2); assert.equal(F.lowHumanityLevel(undefined), 0);
  const S = F.roll("low-humanity-test", "kindred", {});
  const plain = F.drawFace(S, {state: {}}).rgba, low = F.drawFace(S, {state: {lowHumanity: 2}}).rgba;
  const diff = plain.length === low.length ? [...plain].filter((v, i) => v !== low[i]).length : -1;
  assert.ok(diff > 50, `the face changes (${diff} values)`);
  assert.deepEqual(F.drawFace(S, {state: {lowHumanity: 0}}).rgba, plain);
});
