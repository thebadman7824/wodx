// Looks on the map (B3758): the kinds, a look's record, its end, and what each player's level draws.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const R = await import("../../modules/wodx-chronicle/scripts/looks-rules.mjs");

test("a look's record: kind, where, how long", () => {
  assert.equal(R.normLook({ kind: "nonsense" }), null);
  const fire = R.normLook({ kind: "fire", at: { x: 100, y: 200, radius: 50 }, until: { seconds: 60 }, source: "Command the Flame" }, { now: 1000, newId: () => "a" });
  assert.deepEqual(fire.at, { x: 100, y: 200, radius: 50 });
  assert.deepEqual(fire.until, { worldTime: 1060 });
  assert.equal(fire.id, "look-a");
  assert.equal(fire.label, "Fire");
  assert.equal(R.normLook({ kind: "storm" }).at, null, "no spot: the whole scene");
  assert.equal(R.normLook({ kind: "water", at: { x: 0, y: 0 } }).at.radius, 150, "a spot with no size gets a usual size");
  assert.deepEqual(R.normLook({ kind: "smoke", at: { shape: "Scene.a.Region.b" } }).at, { shape: "Scene.a.Region.b" });
  assert.deepEqual(R.normLook({ kind: "fire", until: { rounds: 2 } }, { round: 5 }).until, { round: 7 });
  assert.equal(R.normLook({ kind: "fire", fade: 99999 }).fade, 5000);
});

test("a look ends by the clock or the round, and one with no end stays", () => {
  assert.equal(R.expired({ until: { worldTime: 100 } }, { now: 99 }), false);
  assert.equal(R.expired({ until: { worldTime: 100 } }, { now: 100 }), true);
  assert.equal(R.expired({ until: { round: 4 } }, { round: 3 }), false);
  assert.equal(R.expired({ until: { round: 4 } }, { round: null }), false, "out of combat a round count waits");
  assert.equal(R.expired({ until: { round: 4 } }, { round: 4 }), true);
  assert.equal(R.expired({ until: null }, { now: 1e9 }), false);
});

test("each player's level: full draws all, light fewer and fainter with no shake, off only the shape", () => {
  const all = { sequencer: true, tokenmagic: true, fxmaster: true };
  const fire = { kind: "fire", at: { x: 0, y: 0, radius: 100 } };
  const full = R.renderPlan(fire, "full", all), light = R.renderPlan(fire, "light", all), off = R.renderPlan(fire, "off", all);
  assert.equal(full.shape, true);
  assert.equal(full.seq.copies, 3);
  assert.equal(light.seq.copies, 1);
  assert.ok(light.seq.alpha < full.seq.alpha);
  assert.equal(full.tmfx.type, "fire");
  assert.deepEqual([off.shape, off.seq, off.tmfx], [true, null, null]);
  const quake = { kind: "quake", at: null };
  assert.ok(R.renderPlan(quake, "full", all).shake.px > 0);
  assert.equal(R.renderPlan(quake, "light", all).shake, null);
  assert.equal(R.renderPlan(fire, "full", {}).seq, null, "no Sequencer: the shape only");
  assert.equal(R.renderPlan(fire, "bogus", all).seq.copies, 3, "an unknown level counts as full");
  assert.deepEqual([R.weatherAlpha("full"), R.weatherAlpha("light"), R.weatherAlpha("off")], [1, 0.5, 0]);
});

test("scene-wide weather: FXMaster's particles when it is on, else Foundry's own", () => {
  const storm = { kind: "storm", at: null };
  const fx = R.weatherPlan(storm, { fxmaster: true }).fxmaster;
  assert.ok(fx.particles.some(p => p.type === "rain") && fx.filters.some(f => f.type === "lightning"));
  assert.deepEqual(R.weatherPlan(storm, {}), { core: "rainStorm" });
  assert.equal(R.weatherPlan({ kind: "fire", at: { x: 0, y: 0, radius: 5 } }, { fxmaster: true }), null, "an area has no scene weather");
  assert.equal(R.weatherPlan({ kind: "rubble", at: null }, {}), null);
  for ( const [k, K] of Object.entries(R.KINDS) ) {
    assert.match(K.colour, /^#[0-9a-f]{6}$/i, k);
    for ( const p of K.weather?.particles ?? [] ) assert.ok(["rain", "clouds", "embers", "fog", "snowstorm", "snow", "hail"].includes(p.type), `${k}: ${p.type} is an FXMaster particle`);
    for ( const f of K.weather?.filters ?? [] ) assert.ok(["lightning", "color", "underwater", "fog", "bloom", "screenShake"].includes(f.type), `${k}: ${f.type} is an FXMaster filter`);
  }
});

test("the animation picked from Sequencer's database by name, whole words only", () => {
  const paths = ["jb2a.fireball.explosion.orange", "jb2a.flames.01.orange", "jb2a.smoke.puff.ring", "jb2a.liquid.splash.blue", "jb2a.firework.01"];
  assert.equal(R.pickPath(paths, ["flames", "fire"]), "jb2a.flames.01.orange");
  assert.equal(R.pickPath(paths, ["fire"]), null, "fire is not firework or fireball");
  assert.equal(R.pickPath(paths, ["water", "liquid"]), "jb2a.liquid.splash.blue");
  assert.equal(R.pickPath([], ["smoke"]), null);
});

test("WoDX Actions' world kinds each have a look, and Chronicle offers the layer", () => {
  const fx = fs.readFileSync(path.join(ROOT, "modules/wodx-actions/scripts/effects.js"), "utf8");
  const map = fx.match(/const LOOK_KIND = \{([^}]+)\}/)[1];
  for ( const [, , look] of map.matchAll(/(\w+): "(\w+)"/g) ) assert.ok(R.isKind(look), look);
  const W = fs.readFileSync(path.join(ROOT, "modules/wodx-actions/scripts/world-effects.js"), "utf8");
  for ( const k of ["water", "blaze", "rubble", "flood", "fire", "quake", "storm", "plague", "taint"] ) assert.match(W, new RegExp(`\\b${k}: \\{`), k);
  for ( const k of ["water", "blaze", "rubble", "flood", "fire", "quake", "storm", "plague", "taint", "calm", "cleanse", "dread"] ) assert.match(map, new RegExp(`\\b${k}: "`), `${k} has a look`);
  const main = fs.readFileSync(path.join(ROOT, "modules/wodx-chronicle/scripts/main.mjs"), "utf8");
  assert.match(main, /looks: looks\.api\(\)/);
  assert.match(main, /looks\.registerLooks\(\)/);
});
