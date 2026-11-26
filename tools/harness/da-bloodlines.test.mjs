import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {findClan, clanDisciplines, clanOpen} from "../../modules/wodx-rules/creation/rules.mjs";
import {BLOODLINES} from "../../modules/wodx-chronicle/data/signatures.mjs";
import {bloodlinePowerDiff} from "../../modules/wodx-rules/actions/kindred-rules.js";
import {clanKey, ruleFor, nourishment} from "../../modules/wodx-rules/actions/feeding-rules.js";

// B7661: the Dark Ages lines the full check of V20 Dark Ages found missing (chapter 2, pp. 70-105).
const BOOK = {bonsam: ["Abombwe", "Obfuscate", "Potence"], danava: ["Dominate", "Fortitude", "Thaumaturgy"],
  impundulu: ["Fortitude", "Necromancy", "Presence"], ramanga: ["Obfuscate", "Obtenebration", "Presence"],
  "salubri-watcher": ["Auspex", "Obfuscate", "Valeren"], valkyrjer: ["Animalism", "Potence", "Spiritus"], "children-of-osiris": ["Bardo"]};

test("each line has its row and the book's Disciplines", () => {
  for ( const [id, d] of Object.entries(BOOK) ) assert.deepEqual(clanDisciplines(findClan(id), "darkages").sort(), d.sort(), id);
  assert.equal(findClan("Salubri (Watcher)").id, "salubri-watcher");
  assert.equal(findClan("Children of Osiris (Brujah)").id, "children-of-osiris");
});

test("the Valkyrjer are the Dark Ages Ahrimanes; the later Ahrimanes open from 1493", () => {
  assert.equal(clanOpen(findClan("valkyrjer"), {year: 1230}), true);
  assert.equal(clanOpen(findClan("valkyrjer"), {year: 1500}), false);
  assert.equal(clanOpen(findClan("ahrimanes"), {year: 1500}), true);
  assert.ok(findClan("valkyrjer").noBondNoGhoul);
  assert.ok(findClan("children-of-osiris").noEmbrace);
});

test("every new line finds its own signature row before an older line's", () => {
  const first = name => BLOODLINES.find(r => r.match.some(m => name.toLowerCase().includes(m)))?.key;
  assert.equal(first("Danava"), "danava");
  assert.equal(first("Children of Osiris (Brujah)"), "osiris");
  assert.equal(first("Salubri (Watcher)"), "watcher");
  assert.equal(first("Valkyrjer"), "valkyrjer");
  for ( const k of ["bonsam", "impundulu", "ramanga"] ) assert.equal(first(k), k);
});

test("a Ramanga's Presence on another is one harder, unless a piece of the victim is held", () => {
  assert.equal(bloodlinePowerDiff("Ramanga", "Presence").diff, 1);
  assert.equal(bloodlinePowerDiff("Ramanga", "Obtenebration", {piece: true}).diff, 0);
  assert.equal(bloodlinePowerDiff("Ramanga", "Presence", {onOther: false}).diff, 0);
  assert.equal(bloodlinePowerDiff("Ramanga", "Obfuscate").diff, 0);
  assert.equal(bloodlinePowerDiff("Toreador", "Presence").diff, 0);
});

test("an Impundulu is fed only by the Bomkazi witch", () => {
  const r = ruleFor(clanKey("Impundulu"), {darkAges: true});
  assert.equal(nourishment(r, {fits: false}).factor, 0);
  assert.equal(nourishment(r, {fits: true}).factor, 1);
});
