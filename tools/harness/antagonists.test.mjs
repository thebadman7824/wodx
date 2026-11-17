// Antagonist Lines Desk (B6670-B6709): the dated table, the Fall ledger's effects, marks and scheme clocks.
import assert from "node:assert/strict";
import {test} from "node:test";
import * as A from "../../modules/wodx-chronicle/scripts/antagonist-rules.mjs";
import * as SR from "../../modules/wodx-npc/scripts/scheme-rules.mjs";
import * as SW from "../../modules/wodx-npc/scripts/servant-world-rules.mjs";
import * as RV from "../../modules/wodx-npc/scripts/rivalry-rules.mjs";
import * as SV from "../../modules/wodx-npc/scripts/servant-rules.mjs";
import {SOURCES} from "../../modules/wodx-otherworlds/scripts/corruption-rules.mjs";
import * as SIGS from "../../modules/wodx-chronicle/data/signatures.mjs";

test("every group has a key, words to match, eras and a book; every fall names a real servant bond", () => {
  const keys = new Set();
  for ( const g of A.ANTAGONISTS ) {
    assert.ok(g.key && !keys.has(g.key), g.key); keys.add(g.key);
    assert.ok(g.match.length && g.eras.length && g.page, g.key);
    if ( g.fall ) assert.ok(A.FALLS[g.fall], g.key);
  }
  for ( const [k, f] of Object.entries(A.FALLS) ) assert.ok(SV.KINDS[f.end], `${k} ends in ${f.end}`);
});

test("groups are found by whole words on the sheet, not inside other words", () => {
  assert.equal(A.groupOf(["Black Spiral Dancers"])?.key, "wyrm");
  assert.equal(A.groupOf(["Followers of Set"])?.key, "setite");
  assert.equal(A.groupOf(["Barabbi"])?.key, "nephandi");
  assert.equal(A.groupOf(["Banebridge"]), null);
  assert.equal(A.groupOf(["Settlers"]), null);
  assert.equal(A.groupOfActor({system: {tribe: {value: "Black Spiral Dancers"}}})?.key, "wyrm");
  assert.equal(A.groupOfActor({system: {clan: "Brujah"}, flags: {"wodx-chronicle": {antagonist: "infernal"}}})?.key, "infernal");
});

test("Pentex starts in 1916 everywhere and goes by its name of the year", () => {
  assert.equal(A.PENTEX_FROM, 1916);
  assert.equal(A.pentexName(1915), null);
  assert.equal(A.pentexName(1916), "Premium Oil");
  assert.equal(A.pentexName(1920), "Endron Oil");
  assert.equal(A.pentexName(1990), "Pentex");
  assert.equal(A.activeIn("pentex", 1910).active, false);
  assert.equal(SOURCES.pentex.from, 1916);
  assert.equal(RV.RIVALRIES.find(r => r.id === "garou-pentex").from, 1916);
  const pentex = {id: "p", kind: "pentex"};
  assert.equal(SW.wyrmMaster([pentex], {year: 1915}), null);
  assert.equal(SW.wyrmMaster([pentex], {year: 1916})?.id, "p");
});

test("the Technocracy goes by the name of its age", () => {
  assert.match(A.activeIn("technocracy", 1200).name, /Craftmasons/);
  assert.equal(A.activeIn("technocracy", 1500).name, "the Order of Reason");
  assert.equal(A.activeIn("technocracy", 1950).name, "the Technocratic Union");
  assert.equal(A.activeIn("dauntain", 1800).active, false);
  assert.equal(A.activeIn("inquisition", 1200).active, false);
});

test("the Fall ledger does something: harder resisting, warmer attitude, and a bond at the last step", () => {
  assert.equal(A.resistShift({step: 0}), 0);
  assert.equal(A.resistShift({step: 3}), 3);
  assert.equal(A.resistShift({step: 9}), 5);
  assert.deepEqual(A.thresholds("wyrm", []), []);
  const three = A.thresholds("nephandi", [3]);
  assert.equal(three.length, 1);
  assert.equal(three[0].attitude, 1);
  assert.equal(three[0].bind, null);
  const five = A.thresholds("wyrm", [3, 5]);
  assert.equal(five[1].bind, "fomor");
  assert.equal(A.thresholds("infernal", [5])[0].bind, "pact");
  assert.equal(A.thresholds("apophis", [5])[0].bind, "cult");
});

test("every corrupter row on a signature sheet names its Fall", () => {
  const rows = Object.values(SIGS).filter(Array.isArray).flat().filter(r => r?.feature === "corruption" || r?.also?.includes?.("corruption"));
  assert.ok(rows.length >= 6, `${rows.length} corrupter rows`);
  for ( const r of rows ) if ( r.key !== "setite" && r.key !== "defilers" ) assert.ok(A.FALLS[r.fall], `${r.key} has fall ${r.fall}`);
});

test("marks: the foe shows to the sights that catch it; a victim from step 2", () => {
  const neph = A.groupByKey("nephandi");
  assert.ok(A.markFor("prime", {group: neph}));
  assert.equal(A.markFor("penumbra", {group: neph}), null);
  assert.ok(A.markFor("penumbra", {group: "wyrm"}));
  assert.equal(A.markFor("penumbra", {fallKind: "wyrm", step: 1}), null);
  assert.match(A.markFor("penumbra", {fallKind: "wyrm", step: 2}).words, /^touched by/);
  assert.deepEqual(A.deepestFall({a: {step: 1, kind: "setite"}, b: {step: 4, kind: "wyrm"}}), {kind: "wyrm", step: 4});
});

test("scheme clocks: due only for antagonist factions in their years; four steps; the last changes the world", () => {
  const factions = [{id: "c", name: "The Endron works", assets: {influence: {}}}, {id: "m", name: "The town council", assets: {influence: {}}},
    {id: "s", name: "A Wyrm cult in the mill", assets: {influence: {}}}];
  assert.deepEqual(SR.due(factions, {}, {year: 1900}).map(d => d.faction), ["s"]);
  assert.deepEqual(SR.due(factions, {}, {year: 1950}).map(d => d.faction).sort(), ["c", "s"]);
  assert.deepEqual(SR.due(factions, {s: {paused: true}}, {year: 1950}).map(d => d.faction), ["c"]);
  let clock = {};
  for ( let i = 0; i < SR.STEPS - 1; i++ ) {
    const r = SR.stepOf(factions[2], "wyrm", clock.step ?? 0);
    assert.equal(r.finished, false);
    assert.equal(r.changes.length, 0);
    assert.ok(r.sign.length > 10);
    clock = SR.advanced(clock, r, "wyrm", i);
  }
  const last = SR.stepOf(factions[2], "wyrm", clock.step);
  assert.equal(last.finished, true);
  assert.equal(last.source, "cult");
  assert.deepEqual(last.changes.map(c => c.op), ["bg", "goal"]);
  clock = SR.advanced(clock, last, "wyrm", 9);
  assert.equal(clock.step, 0);
  assert.equal(clock.done, 1);
  // No sign uses meta words or gendered pronouns
  for ( const p of [...Object.values(SR.PLANS), SR.GENERAL] ) for ( const w of [...p.signs, p.done] ) assert.doesNotMatch(w, /\b(he|she|his|her|him|step|clock|faction)\b/i, w);
});
