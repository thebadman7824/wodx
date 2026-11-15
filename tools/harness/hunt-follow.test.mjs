// NPC Motives Desk part four (B5699-B5703): the hunters follow through. Pure rules.
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HF = await import(pathToFileURL(join(root, "modules/wodx-storyteller/scripts/hunt-follow-rules.mjs")));
const K = await import(pathToFileURL(join(root, "modules/wodx-storyteller/scripts/kits-rules.mjs")));

test("h1: proof by who hunts, and the imbued burn", () => {
  assert.equal(HF.proofFor(1200, "church-courts").key, "church-courts");
  assert.equal(HF.proofFor(1450, "inquisition").to, "the Inquisition, as proof for a trial");
  assert.equal(HF.proofFor(1900, "leopold").short, "the reliquary");
  assert.equal(HF.proofFor(1960, "agency").key, "agency");
  assert.equal(HF.proofFor(2005, "leopold", "reckoning").burn, true);
  assert.equal(HF.proofFor(1890, null).key, "arcanum");
  assert.equal(HF.proofFor(1100, null).key, "church-courts");
  assert.ok(HF.isSupernatural("Vampire") && HF.isSupernatural("Werewolf") && !HF.isSupernatural("Mortal"));
  assert.equal(HF.PROOF_EASE, -2);
});

test("h2: how a raid ends", () => {
  assert.equal(HF.raidEnd({hunters: [{down: false}], quarry: null}), "missed");
  assert.equal(HF.raidEnd({hunters: [{down: false}], quarry: {present: true, down: true}}), "won");
  assert.equal(HF.raidEnd({hunters: [{down: true}, {down: true}, {down: false}], quarry: {present: true, down: false}}), "beaten");
  assert.equal(HF.raidEnd({hunters: [{down: false}, {down: false}, {down: true}], quarry: {present: true, down: false}}), "held");
  assert.equal(HF.RAID_AFTER.beaten.file, 1);
  assert.equal(HF.RAID_AFTER.missed.watch, true);
  assert.equal(HF.watchUntil(100), 100 + 3 * 86400);
});

test("h3: the investigator's day and whether they stay", () => {
  const b = HF.investigatorBlocks({market: "M", tavern: "T", church: "C"});
  assert.deepEqual(b.slice(0, 3).map(x => x.place), ["M", "T", "C"]);
  assert.ok(b.some(x => x.from === 0 && x.place === "T"));
  assert.ok(HF.investigatorBlocks({church: "C"}).every(x => x.place === "C"));
  assert.equal(HF.investigatorStays({harmed: true}), "harmed");
  assert.equal(HF.investigatorStays({step: 2}), "won");
  assert.equal(HF.investigatorStays({days: 3}), "done");
  assert.equal(HF.investigatorStays({days: 1}), "stays");
  const ext = K.EXTRAS.find(e => e.key === "investigator");
  assert.ok(ext && ext.abilities.investigation === 3 && Object.keys(ext.attrs).length === 9);
});

test("h5: a found body feeds the hunters by cause and year, and the morgue from 1840", () => {
  assert.equal(HF.bodyPressure("violence", 1500), 0);
  assert.equal(HF.bodyPressure("drained", 1500), 2);
  assert.equal(HF.bodyPressure("savaged", 1800), 1);
  assert.equal(HF.bodyPressure("drained", 1990), 2);
  assert.equal(HF.toMorgue(1830, "drained"), false);
  assert.equal(HF.toMorgue(1850, "drained"), true);
  assert.equal(HF.toMorgue(1850, "sickness"), false);
});
