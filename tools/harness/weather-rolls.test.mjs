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
const W = await import(join(root, "modules/wodx-atmosphere/scripts/weather-rules.mjs"));
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
  // B7054: V20 p. 229: fog shortens shots (WoDX Combat halves the reach) and makes Perception by sight or hearing 1 harder
  assert.deepEqual(W.rollEffects(d, ["dexterity", "ranged", "firearms"]), []);
  assert.deepEqual(W.rollEffects(d, ["dexterity", "melee"]), []);
  assert.deepEqual(W.rollEffects(d, ["perception", "sight"]).map(e => e.diff), [1]);
  assert.deepEqual(W.rollEffects(d, ["perception"]), [], "a Perception roll that names no sense is left alone");
});

test("fog out of doors: a Perception roll by sight is 1 harder; indoors it is not (B6796, B7054)", async () => {
  await set(fog);
  const e = A.weatherRollSource(on(street), roll(["perception", "sight"]));
  assert.equal(e.length, 1);
  assert.equal(e[0].diff, 1);
  assert.match(e[0].name, /Fog.*tonight's weather/);
  assert.equal(e[0].note, "V20 p. 229");
  assert.deepEqual(A.weatherRollSource(on(hall), roll(["perception", "sight"])), []);
});

test("lying snow: a tracking roll is 1 easier, and running, riding and driving 1 harder", async () => {
  await set(snow);
  const track = A.weatherRollSource(on(street), roll(["perception", "survival"]));
  assert.deepEqual(track.map(e => [e.key, e.diff]), [["weather-tracks", -1]]);
  for ( const tags of [["dexterity", "athletics"], ["dexterity", "ride"]] ) {
    assert.deepEqual(A.weatherRollSource(on(street), roll(tags)).map(e => [e.key, e.diff]), [["weather-footing", 1]], tags.join("+"));
  }
  // B7054: snow still falling adds V20's +2 to Drive (p. 229) to the ice underfoot
  assert.deepEqual(A.weatherRollSource(on(street), roll(["dexterity", "drive"])).map(e => [e.key, e.diff]), [["weather-drive", 2], ["weather-footing", 1]]);
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
