import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");

/* Storyteller hardship: bedding against the cold, shade against the heat (B3906) */
const H = await imp("modules/wodx-storyteller/scripts/hardship-rules.mjs");

test("the weather's danger is cold or heat", () => {
  assert.equal(H.weatherCause({tempDay: 2, tempNight: -6}), "cold");
  assert.equal(H.weatherCause({tempDay: 50, tempNight: 30}), "heat");
  assert.equal(H.weatherCause({tempDay: 15, tempNight: 8}), null);
  assert.equal(H.weatherCause(null), null);
});

test("bedding eases the cold roll, shade the heat roll, never the wrong one", () => {
  const warm = {cold: true, names: {cold: "a bedroll"}}, shade = {heat: true, names: {heat: "an umbrella"}};
  assert.equal(H.weatherDiffFor("cold", warm).diff, H.WEATHER_DIFF - 1);
  assert.match(H.weatherDiffFor("cold", warm).part, /a bedroll/);
  assert.equal(H.weatherDiffFor("heat", warm).diff, H.WEATHER_DIFF);
  assert.equal(H.weatherDiffFor("heat", shade).diff, H.WEATHER_DIFF - 1);
  assert.equal(H.weatherDiffFor("cold", shade).diff, H.WEATHER_DIFF);
  assert.equal(H.weatherDiffFor(null, {...warm, ...shade, names: {...warm.names, ...shade.names}}).diff, H.WEATHER_DIFF - 1, "set by hand: either counts, once");
  assert.equal(H.weatherDiffFor("cold", {}).diff, H.WEATHER_DIFF);
  assert.match(src("modules/wodx-storyteller/scripts/hardship.mjs"), /rollStamina\(a, wd\.diff, dice\)/);
});
