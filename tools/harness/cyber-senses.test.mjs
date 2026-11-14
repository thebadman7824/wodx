import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* B3799: installed cyberware reaches the senses */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(pathToFileURL(join(root, "modules/wodx-senses/scripts/senses-rules.mjs")));

test("low-light optics take away the darkness step; sharper hearing makes hearing easier", () => {
  const none = R.powersFor({});
  const dark0 = R.difficulty("sight", {light: "dark"}, none).diff;
  const pw = R.powersFor({gear: {dark: "Low-light optics", mods: [{label: "Amplified Hearing", n: 1, senses: ["sound"]}]}});
  assert.equal(pw.darkSight, "Low-light optics");
  assert.ok(R.difficulty("sight", {light: "dark"}, pw).diff < dark0);
  assert.equal(R.difficulty("sound", {}, pw).diff, R.difficulty("sound", {}, none).diff - 1);
  assert.equal(R.difficulty("smell", {}, pw).diff, R.difficulty("smell", {}, none).diff);
  assert.equal(R.powersFor({eyesOfCat: true, gear: {dark: "Infrared optics"}}).darkSight, "Eyes of the Cat");
});

test("the senses read the Library's installed pieces", () => {
  assert.match(readFileSync(join(root, "modules/wodx-senses/scripts/main.mjs"), "utf8"), /api\?\.cyber\?\.installedFx\?\.\(actor\)\?\.senses/);
});
