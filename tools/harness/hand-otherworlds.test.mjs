/* Turning to spirit, the Pattern Web, far realm time and the dying cross without the Storyteller's hand (B5017-B5020). */
import "./win-paths.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const F = await load("modules/wodx-otherworlds/scripts/fading-rules.mjs");
const J = await load("modules/wodx-otherworlds/scripts/journey-rules.mjs");

test("turning to spirit rises a step a lunar month and bites", () => {
  assert.equal(F.stepOf(0), 1);
  assert.equal(F.stepOf(F.MONTH * 2.1), 3);
  assert.equal(F.stepOf(F.MONTH * 99), 5);
  assert.deepEqual(F.stepEffects("spirit", 1), []);
  assert.equal(F.stepEffects("spirit", 4)[0].diff, 2);
  assert.deepEqual(F.stepEffects("spirit", 4, {inFlesh: false}), []);
  assert.equal(F.stepEffects("disembodied", 3)[0].dice, -3);
  assert.ok(F.lookOf(5).flicker && !F.lookOf(0));
  const c = src("modules/wodx-otherworlds/scripts/crossing.mjs"), r = src("modules/wodx-otherworlds/scripts/realms.mjs");
  assert.ok(!/Storyteller decides/.test(c + r));
  assert.ok(/fading\.setupFading\(\)/.test(src("modules/wodx-otherworlds/scripts/main.mjs")));
});

test("the lost come back from the Pattern Web; the dying who see the dead cross", () => {
  const c = src("modules/wodx-otherworlds/scripts/crossing.mjs");
  assert.ok(/returnAt: now \+ lostDays\(\) \* 86400/.test(c));
  assert.ok(/export async function returnLost/.test(c) && /export async function dyingCross/.test(c));
  const m = src("modules/wodx-otherworlds/scripts/main.mjs");
  assert.ok(/returnLost\(\)/.test(m) && /registerDyingCross\(\)/.test(m));
});

test("the Far Dreaming's and the Labyrinth's time are drawn (B5179)", () => {
  assert.equal(J.drawSlip(() => 0).factor, 1 / 24);
  assert.equal(J.drawSlip(() => 0.99).factor, 365);
  const t = J.timeOutside({realm: "far-dreaming", hours: 4, slip: J.drawSlip(() => 0.75)});
  assert.equal(t.seconds, 4 * 3600 * 7);
  assert.equal(J.timeOutside({realm: "deep-umbra", hours: 3}).seconds, 3 * 3600);
  assert.equal(J.REALM_TIME.labyrinth.rule, "random");
  assert.equal(J.drawSlip(() => 0.99, "labyrinth").factor, 30);
  assert.equal(J.drawSlip(() => 0, "labyrinth").factor, 1 / 24);
  assert.equal(J.timeOutside({realm: "labyrinth", hours: 2, slip: J.drawSlip(() => 0.5, "labyrinth")}).seconds, 2 * 3600);
});
