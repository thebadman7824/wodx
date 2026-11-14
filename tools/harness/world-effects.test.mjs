// Powers that reach the world (B3757): the WORLD_POWERS table, the sweep that checks it, the
// thresholds and routes, and the town figures in WoDX Storyteller.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const W = await import("../../modules/wodx-actions/scripts/world-effects.js");
const TR = await import("../../modules/wodx-storyteller/scripts/town-rules.mjs");

const sweep = (() => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "wodx-ws-")), "s.json");
  execFileSync(process.execPath, [path.join(ROOT, "tools/powers/world-sweep.mjs"), "--out", out], { stdio: "ignore" });
  return JSON.parse(fs.readFileSync(out, "utf8"));
})();

test("every name in the table is a power WoDX lists", () => {
  assert.deepEqual(sweep.missing, []);
  assert.ok(sweep.total >= 48, `${sweep.total} wired`);
  for ( const kinds of Object.values(W.WORLD_POWERS) ) for ( const k of kinds ) assert.ok(W.WORLD[k], k);
});

test("the powers the words flag but the table leaves out were each read and left out", () => {
  // Each one: senses or hides taint, a single burning weapon or person, a drink, a river crossing, a caern's upkeep
  const LEFT_OUT = ["Consecration of Esus", "Into the Chasm", "Sense Wyrm", "Wrath of Gaia", "Infest", "Burning Blade", "Mask Taint",
    "Engulf", "Howling Gale", "The Beltane Blade", "Simple Philtre", "Whispers to the Heart", "Witch's Nimbus", "Moot Rite"];
  const unread = [...new Set(sweep.unread.map(h => h.name.replace(/^[•\s]+/, "")))];
  assert.deepEqual(unread.filter(n => !LEFT_OUT.includes(n)), [], "a new power the words flag: read it and add it to WORLD_POWERS or here");
});

test("the question that started it: a Demon floods with Summon Water and storms the town with Command the Storm", () => {
  const water = W.worldResults({ name: "• Summon Water", line: "Demon (DtF)" }, 4);
  assert.equal(water.length, 1);
  assert.equal(water[0].out.world, "water");
  assert.equal(W.worldRoute(water[0].out), "area");
  assert.equal(water[0].out.area, 15, "no Faith given: the usual 15 feet");
  assert.equal(W.worldResults({ name: "Summon Water", line: "Demon (DtF)", faith: 4 }, 4)[0].out.area, 12, "Faith yards");
  assert.equal(W.reachFeet("Summon Water", { faith: 500 }), 300);
  assert.equal(W.worldResults({ name: "Summon Water", line: "Demon (DtF)" }, 2).length, 0, "a shower is not a flood");
  const storm = W.worldResults({ name: "Command the Storm", line: "Demon (DtF)" }, 5);
  assert.equal(storm[0].out.world, "storm");
  assert.equal(storm[0].out.scale, 2);
  assert.equal(W.worldRoute(storm[0].out), "queue", "town-wide waits for the Storyteller");
  assert.equal(storm[0].out.kind, "world", "the effects card applies it as a world result");
  assert.equal(water[0].out.kind, "world");
  assert.match(storm[0].out.text, /Storyteller approves/);
});

test("a name keyed to one line does not reach another line's power of the same name", () => {
  assert.deepEqual(W.worldKinds("Ignite", "Demon (DtF)"), ["blaze"]);
  assert.deepEqual(W.worldKinds("Ignite", "Wraith (W20)"), []);
  assert.deepEqual(W.worldKinds("Earthquake"), ["quake", "rubble"]);
  assert.equal(W.worldResults({ name: "Nothing at all" }, 9).length, 0);
});

test("thresholds and scale", () => {
  assert.equal(W.townScale(3), 1); assert.equal(W.townScale(5), 2); assert.equal(W.townScale(8), 3);
  assert.equal(W.worldResults({ world: ["flood"] }, 2).length, 0);
  assert.equal(W.worldResults({ world: ["flood"] }, 3).length, 1);
  assert.equal(W.worldResults({ world: ["blaze"] }, 1)[0].out.dice, 2);
  assert.equal(W.worldResults({ world: ["blaze"] }, 7)[0].out.dice, 4);
  assert.equal(W.worldResults({ world: ["taint"] }, 2)[0].out.scope, "taint");
  assert.equal(W.worldResults({ world: ["plague"] }, 0).length, 0);
});

test("every town kind lands as a town event, scaled", () => {
  const kinds = [...new Set(Object.values(W.WORLD).map(K => K.town).filter(Boolean))].sort();
  assert.deepEqual(kinds, Object.keys(TR.POWER_TOWN).sort());
  const one = TR.powerEvent("flood", "t1", { scale: 1, label: "A demon: Grip the Water" });
  const three = TR.powerEvent("flood", "t1", { scale: 3 });
  assert.equal(one.town, "t1");
  assert.match(one.text, /^A demon: Grip the Water: the river/);
  assert.ok(three.prosperity < one.prosperity && three.dead > one.dead);
  assert.ok(TR.powerEvent("calm", "t1").unrest < 0);
  assert.equal(TR.powerEvent("nonsense", "t1"), null);
  const st = TR.applyNow({ towns: { t1: { id: "t1", people: 2000 } } }, [TR.powerEvent("quake", "t1", { scale: 2 })], { year: 1450 });
  assert.equal(st.events.length > 0, true);
});

test("the effects card wiring passes the power's name from every window", () => {
  const src = f => fs.readFileSync(path.join(ROOT, "modules/wodx-actions/scripts", f), "utf8");
  for ( const [f, line] of [["demon.js", "Demon (DtF)"], ["mummy.js", "Mummy (2nd)"], ["garou.js", "Werewolf (Changing Breeds)"], ["c20.js", "Changeling (C20)"],
    ["hunter.js", "Hunter (HH2/DA)"], ["kote.js", "Kuei-jin (KotE)"], ["orpheus.js", "Orpheus"], ["kindred.js", "Vampire (V20)"], ["wraith.js", "Wraith (W20)"], ["reckoning.js", "Hunter (HtR)"]] )
    assert.ok(src(f).includes(`"${line}"`), `${f} names ${line}`);
  assert.match(src("effects.js"), /case "world"|kind === "world"/);
});
