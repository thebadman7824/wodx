// B6792: WoDX Atmosphere's fog out of doors thins the Shroud where a token stands, as the weather card says.
import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
installMock({dataRoot: root});
const {placeOf} = await import(join(root, "modules/wodx-otherworlds/scripts/ratings.mjs"));
const W = await import(join(root, "modules/wodx-atmosphere/scripts/weather-rules.mjs"));

const scene = (id, outdoors) => ({id, name: id, regions: [], flags: {"wodx-otherworlds": {ratings: {settlement: "town", shroud: 7}}, outdoors},
  getFlag(s, k) { return this.flags?.[s]?.[k]; }});
const token = sc => ({id: "t1", parent: sc, regions: new Set(), x: 0, y: 0, width: 1, height: 1});
const fogNight = {sky: "storm", precip: "none", fog: "thick", wind: "calm", tags: ["fog"]};
function weather(day) {
  game.modules.set("wodx-atmosphere", {active: true, api: {weather: {
    now: () => day, isOutdoor: sc => sc?.flags?.outdoors === true, modifiers: d => W.modifiers(d)}}});
}

test("fog out of doors takes the Shroud a step down where the token stands (B6792)", () => {
  weather(fogNight);
  const p = placeOf(token(scene("street", true)));
  assert.equal(p.ratings.shroud, 6);
  assert.ok(p.notes.some(n => /Fog tonight: Shroud -1/.test(n)), p.notes.join(" | "));
});

test("fog leaves the Shroud indoors alone, and a clear night changes nothing", () => {
  weather(fogNight);
  assert.equal(placeOf(token(scene("chapel", false))).ratings.shroud, 7);
  weather({sky: "clear", precip: "none", fog: "none", wind: "calm", tags: []});
  assert.equal(placeOf(token(scene("street", true))).ratings.shroud, 7);
});

test("without WoDX Atmosphere the Shroud is the place's own", () => {
  game.modules.delete("wodx-atmosphere");
  assert.equal(placeOf(token(scene("street", true))).ratings.shroud, 7);
});
