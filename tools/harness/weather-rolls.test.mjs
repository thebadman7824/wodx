// B6796: the night's weather reaches the rolls it names (ranged attacks, tracking, footing) through WoDX Chronicle's roll effects.
import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root, worldFlags: {wodx: {phase: 8}}});
mock.asGM();
mock.setupTime?.();
const W = await import(join(root, "modules/wodx-rules/atmosphere/weather-rules.mjs"));
const A = await import(join(root, "modules/wodx-atmosphere/scripts/main.mjs"));
await Hooks.callAll("init");
game.modules.set("wodx-atmosphere", {active: true});
await A.prime();

const fog = {sky: "storm", precip: "none", intensity: null, fog: "thick", wind: "calm", tempNight: 4, tempDay: 9, thunder: false, snowLying: false, leaves: false};
const snow = {sky: "overcast", precip: "snow", intensity: "moderate", fog: "none", wind: "calm", tempNight: -4, tempDay: -1, thunder: false, snowLying: true, leaves: false};
const street = {id: "street", name: "Street", flags: {"wodx-atmosphere": {outdoors: "on"}}};
const hall = {id: "hall", name: "Hall", flags: {"wodx-atmosphere": {outdoors: "off"}}};
globalThis.canvas = {scene: street};
const on = sc => ({name: "Vera", getActiveTokens: () => [{document: {parent: sc}}]});
const roll = tags => ({channel: "roll", tags});
const set = async over => A.setNight(A.nightJdn(game.time.worldTime, street), over, street);

test("the rules: which modifier fits which roll's tags", () => {
  const d = W.weatherFor("seed", "central-europe", 2460000, {override: fog});
  assert.deepEqual(W.rollEffects(d, ["dexterity", "ranged", "firearms"]).map(e => e.diff), [2]);
  assert.deepEqual(W.rollEffects(d, ["dexterity", "melee"]), []);
  assert.deepEqual(W.rollEffects(d, ["perception"]), [], "sight stays with WoDX Senses");
});

test("fog out of doors: a firearms attack is 2 harder; indoors it is not (B6796)", async () => {
  await set(fog);
  const e = A.weatherRollSource(on(street), roll(["dexterity", "ranged", "firearms"]));
  assert.equal(e.length, 1);
  assert.equal(e[0].diff, 2);
  assert.match(e[0].name, /Thick fog.*tonight's weather/);
  assert.deepEqual(A.weatherRollSource(on(hall), roll(["dexterity", "ranged", "firearms"])), []);
});

test("lying snow: a tracking roll is 1 easier, and running, riding and driving 1 harder", async () => {
  await set(snow);
  const track = A.weatherRollSource(on(street), roll(["perception", "survival"]));
  assert.deepEqual(track.map(e => [e.key, e.diff]), [["weather-tracks", -1]]);
  for ( const tags of [["dexterity", "athletics"], ["dexterity", "drive"], ["dexterity", "ride"]] ) {
    assert.deepEqual(A.weatherRollSource(on(street), roll(tags)).map(e => [e.key, e.diff]), [["weather-footing", 1]], tags.join("+"));
  }
  assert.deepEqual(A.weatherRollSource(on(street), roll(["stamina", "athletics"])), [], "swimming is not footing");
});

test("the source reaches WoDX Chronicle's roll effects even when Chronicle's api comes after Atmosphere's ready", async () => {
  game.modules.set("wodx-chronicle", {active: true});
  const got = [];
  await Hooks.callAll("ready");
  await new Promise(r => setTimeout(r, 50));
  await Hooks.callAll("wodxChronicleReady", {traits: {addSource: fn => got.push(fn)}});
  assert.ok(got.includes(A.weatherRollSource), "registered once Chronicle is ready");
});
