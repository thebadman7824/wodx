import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Simulated systems: between nights, ties that need tending, hunting grounds and heat (Storyteller 0.12.0) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const U = await imp("modules/wodx-storyteller/scripts/upkeep-rules.mjs");
const DAY = U.DAY;

test("nights between two times are whole days", () => {
  assert.equal(U.nightsBetween(0, DAY - 1), 0);
  assert.equal(U.nightsBetween(0, 7 * DAY + 5), 7);
  assert.equal(U.nightsBetween(10, 5), 0);
});

test("between nights: a vampire pays a blood a night and gets Willpower back", () => {
  const c = {vampire: true, blood: {value: 10, max: 10}, willpower: {temp: 2, perm: 6}};
  const p = U.betweenPlan(c, {nights: 3});
  assert.deepEqual(p.delta, {blood: -3, willpower: 3});
  assert.equal(p.nights, 3);
  // Willpower stops at the permanent rating
  assert.equal(U.betweenPlan(c, {nights: 10}).delta.willpower, 4);
  // Blood never goes below zero, and the card warns
  const dry = U.betweenPlan({...c, blood: {value: 2, max: 10}}, {nights: 5});
  assert.equal(dry.delta.blood, -2);
  assert.match(dry.lines.find(l => l.key === "blood").warn, /No blood left/);
});

test("between nights: torpor, Golconda, settings and the nightfall card", () => {
  const c = {vampire: true, blood: {value: 10, max: 10}, willpower: {temp: 2, perm: 6}};
  assert.deepEqual(U.betweenPlan({...c, torpor: true}, {nights: 4}).delta, {});
  assert.equal(U.betweenPlan({...c, golconda: true}, {nights: 14}).delta.blood, -2);
  assert.equal(U.betweenPlan(c, {nights: 3, nightlyBlood: false}).delta.blood, undefined);
  assert.equal(U.betweenPlan(c, {nights: 3, willpowerMode: "story"}).delta.willpower, undefined);
  assert.deepEqual(U.betweenPlan(c, {nights: 3, lastNightHandled: true}).delta, {blood: -2, willpower: 2});
  assert.equal(U.betweenPlan(c, {nights: 1, lastNightHandled: true}).nights, 0);
  // A mortal only gets Willpower back
  assert.deepEqual(U.betweenPlan({willpower: {temp: 1, perm: 3}}, {nights: 2}).delta, {willpower: 2});
});

test("ties come from the sheet: ghoul vitae, Fetters, Passions, people-backgrounds", () => {
  const view = {ghoul: {domitor: {id: "dom1", name: "Lady Ysolde"}, lastDrink: 100},
    items: [{id: "f1", name: "Her chapel", type: "fetter", value: 3}, {id: "p1", name: "Protect my son", type: "passion", value: 2},
      {id: "b1", name: "Herd", type: "background", value: 2}, {id: "b2", name: "Resources", type: "background", value: 3},
      {id: "b3", name: "Retainers", type: "background", value: 0}],
    stored: {}};
  const {ties, fresh} = U.deriveTies(view, 5000);
  const kinds = ties.map(t => t.kind).sort();
  assert.deepEqual(kinds, ["fetter", "herd", "passion", "vitae"]);
  assert.equal(ties.find(t => t.kind === "vitae").last, 100);
  assert.equal(ties.find(t => t.kind === "fetter").last, 5000);
  assert.equal(fresh.length, 3); // the vitae clock starts at the lineage's last drink
  for ( const t of ties ) assert.doesNotMatch(t.key, /\./);
});

test("the later of the lineage drink and a stored tending wins for vitae", () => {
  const key = U.tieKey("vitae", "dom1");
  const view = {ghoul: {domitor: {id: "dom1", name: "D"}, lastDrink: 100}, items: [], stored: {[key]: {last: 900, every: 20}}};
  const t = U.deriveTies(view, 1000).ties[0];
  assert.equal(t.last, 900);
  assert.equal(t.every, 20);
});

test("tie status: due, overdue days, warned once", () => {
  const tie = {key: "fetter-f1", kind: "fetter", last: 0, every: 30};
  assert.equal(U.tieStatus(tie, 29 * DAY).due, false);
  const s = U.tieStatus(tie, 40 * DAY);
  assert.equal(s.due, true);
  assert.equal(s.overdueDays, 10);
  assert.equal(U.newlyDue([tie], 40 * DAY).length, 1);
  assert.equal(U.newlyDue([{...tie, warned: 35 * DAY}], 40 * DAY).length, 0);
  assert.equal(U.newlyDue([{...tie, off: true}], 40 * DAY).length, 0);
  // A warning from before it came due does not count
  assert.equal(U.newlyDue([{...tie, warned: 10 * DAY}], 40 * DAY).length, 1);
});

test("custom ties keep their kind and name", () => {
  const view = {items: [], stored: {"custom-x": {custom: true, kind: "kinfolk", name: "A sister in Lübeck", every: 14, last: 0}}};
  const t = U.deriveTies(view, 0).ties[0];
  assert.equal(t.name, "A sister in Lübeck");
  assert.equal(t.kind, "kinfolk");
  assert.equal(t.every, 14);
});

test("background names map to tie kinds", () => {
  assert.equal(U.tieKindOfBackground("Herd"), "herd");
  assert.equal(U.tieKindOfBackground("Domain"), "domain");
  assert.equal(U.tieKindOfBackground("Hunting Grounds"), "domain");
  assert.equal(U.tieKindOfBackground("Allies"), "people");
  assert.equal(U.tieKindOfBackground("Kinfolk"), "kinfolk");
  assert.equal(U.tieKindOfBackground("Resources"), null);
});

test("heat: hunts add, botches add more, a quiet week cools it", () => {
  let h = {heat: 0, since: 0};
  h = U.addHeat(h, "hunt", 0);
  assert.equal(h.heat, 1);
  h = U.addHeat(h, "botch", DAY);
  assert.equal(h.heat, 3);
  assert.equal(h.crossed, true);
  assert.equal(U.heatBand(h.heat).name, "Uneasy");
  assert.equal(U.cooled(3, DAY, DAY + 14 * DAY), 1);
  const later = U.addHeat(h, "hunt", DAY + 21 * DAY);
  assert.equal(later.before, 0);
  assert.equal(later.heat, 1);
  assert.equal(U.addHeat({heat: 10, since: 0}, "seen", 0).heat, U.HEAT.max);
});

test("heat bands and their difficulty", () => {
  assert.equal(U.heatDifficulty(0), 0);
  assert.equal(U.heatDifficulty(3), 1);
  assert.equal(U.heatDifficulty(5), 2);
  assert.equal(U.heatBand(8).name, "Hunted");
});

test("the response follows the era's hunters", () => {
  assert.match(U.responseFor(1197).who, /Inquisition/);
  assert.match(U.responseFor(1650).who, /Witch/);
  assert.match(U.responseFor(1850).who, /constables/);
  assert.match(U.responseFor(1998).text, /Hunters Hunted II/);
  assert.match(U.responseFor(1999).text, /Reckoning/);
  assert.match(U.responseFor(2400).who, /imbued/);
});

test("wiring: hooks, handlers, socket and the Hunt dialog", () => {
  const m = src("modules/wodx-storyteller/scripts/main.mjs"), u = src("modules/wodx-storyteller/scripts/upkeep.mjs");
  const a = src("modules/wodx-actions/scripts/main.js");
  assert.match(m, /Up\.registerUpkeepHooks\(\)/);
  assert.match(m, /Up\.registerUpkeepHandlers\(\)/);
  assert.match(m, /req\.hunted/);
  assert.match(u, /wodxSkipEnd/);
  assert.match(u, /info\?\.eraHandled/);
  assert.match(a, /Hooks\.callAll\("wodxHunted"/);
  assert.match(a, /upkeep\?\.huntHere/);
  // Other modules' flags are read straight from the document
  assert.doesNotMatch(u, /getFlag\("wodx-creation"/);
});
