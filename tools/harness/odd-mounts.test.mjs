import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Bicycles as a tile and mounts out of the books (B4960-B4965): ghouled horses, fleshcrafted steeds, chimerical
   steeds, Stygian steeds and gryphons. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)).href);
const IR = await imp("modules/wodx-interactables/scripts/interact-rules.mjs");
const C = await imp("modules/wodx-interactables/scripts/chase-rules.mjs");
const MT = await imp("modules/wodx-combat/scripts/mounted-rules.js");
const ch = (abilities = {}, {year = 1990, kind = "mortal"} = {}) => ({actorId: "a1", year, kind, dexterity: 3, abilities});
const opts = (kind, c) => IR.optionsFor(IR.describeMount({mount: true, mountKind: kind}), c);

test("a bicycle is a tile from 1885, ridden with Athletics", () => {
  assert.equal(IR.MOUNTS.bicycle.skill, "athletics");
  assert.equal(opts("bicycle", ch({athletics: 1})).find(o => o.id === "mount").roll, null);
  assert.equal(opts("bicycle", ch({}, {year: 1850}))[0].id, "eraNote");
  const r = C.rideInFight("bicycle", 1990, "road");
  assert.ok(r && r.saddle && !r.motor, "astride, no motor");
});

test("only the fae ride a chimerical steed, only the dead a Stygian one", () => {
  assert.equal(opts("chimera", ch({ride: 3}))[0].id, "onlyNote");
  assert.ok(opts("chimera", ch({ride: 3}, {kind: "fae"})).some(o => o.id === "mount"));
  assert.equal(opts("stygian", ch({ride: 3}, {kind: "kindred"}))[0].id, "onlyNote");
  assert.ok(opts("stygian", ch({ride: 1}, {kind: "wraith"})).some(o => o.id === "mount"));
  assert.ok(opts("chimera", {...ch({ride: 3}), kept: true}).some(o => o.id === "mount"), "a kept tile is the Storyteller's call");
});

test("exotic beasts need Ride 3; a ghouled horse does not", () => {
  assert.ok(opts("szlachta", ch({ride: 2})).find(o => o.id === "skillNote")?.disabled);
  assert.match(opts("gryphon", ch({ride: 1})).find(o => o.id === "skillNote").note, /Mage 20th p\. 298/);
  assert.equal(opts("gryphon", ch({ride: 3})).find(o => o.id === "mount").roll, null);
  assert.equal(opts("ghoulhorse", ch({ride: 1})).find(o => o.id === "mount").roll, null);
});

test("the beasts run, fly and fight", () => {
  const g = C.rideInFight("gryphon", 1200, "rough");
  assert.ok(g.air && g.yards > 0, "a gryphon flies over rough ground");
  assert.ok(C.rideInFight("stygian", 1200, "open").yards > C.rideInFight("horse", 1200, "open").yards, "swifter than a horse");
  assert.equal(C.canGo("szlachta", "indoors"), false);
  const ride = k => ({...C.rideInFight(k, 1200, "open"), kind: k, role: "reins"});
  assert.equal(MT.traitsOf(ride("szlachta")).brawl, 4, "the book's war ghoul");
  assert.equal(MT.strikeAttr(ride("ghoulhorse"), "strength", 2).value, 7, "the ghoul's Potence in the blow");
  assert.equal(MT.mountDodge(ride("ghoulhorse"), {rideDots: 3, ranged: true}).diff, 6, "Celerity: no +2 against shots");
  assert.equal(MT.mountDodge(ride("horse"), {rideDots: 3, ranged: true}).diff, 8);
});
