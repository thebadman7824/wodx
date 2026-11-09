import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as AR from "../../modules/wodx-atmosphere/scripts/adaptive-rules.mjs";
import * as K from "../../modules/wodx-atmosphere/scripts/kits-rules.mjs";

/* WoDX Atmosphere 0.8.0: adaptive sound. */
test("the tension: frenzy beats combat beats the hunt beats quiet; a tension held by hand wins", () => {
  assert.equal(AR.tensionOf({}), "quiet");
  assert.equal(AR.tensionOf({statuses: ["invisible"]}), "hunt");
  assert.equal(AR.tensionOf({combat: true, statuses: ["invisible"]}), "combat");
  assert.equal(AR.tensionOf({combat: true, statuses: ["Frenzy"]}), "frenzy");
  assert.equal(AR.tensionOf({statuses: ["rotschreck"]}), "frenzy");
  assert.equal(AR.tensionOf({set: "hunt", combat: true}), "hunt");
  assert.equal(AR.tensionOf({set: "nonsense", combat: true}), "combat");
});
test("the mood for a tension falls back when the kit lacks a playlist", () => {
  const has = list => m => list.includes(m);
  assert.equal(AR.moodFor("frenzy", "calm", has(["frenzy", "combat"])), "frenzy");
  assert.equal(AR.moodFor("frenzy", "calm", has(["combat"])), "combat");
  assert.equal(AR.moodFor("frenzy", "calm", has([])), null);
  assert.equal(AR.moodFor("hunt", "calm", has(["tension"])), "tension");
  assert.equal(AR.moodFor("quiet", "sorrow", has(["sorrow"])), "sorrow");
  assert.equal(AR.moodFor("quiet", "", has(["calm"])), "calm");
  assert.ok(K.MOODS.frenzy, "the kits have a frenzy mood");
});
test("the heartbeat: only with a blood pool, from 4 (or a third of a small pool), quicker and louder as it empties", () => {
  assert.equal(AR.heartbeat({blood: 1, max: 10}), null);
  assert.equal(AR.heartbeat({blood: 5, max: 10, hasBlood: true}), null);
  assert.deepEqual(AR.heartbeat({blood: 4, max: 10, hasBlood: true}), {bpm: 50, volume: 0.15});
  assert.deepEqual(AR.heartbeat({blood: 0, max: 10, hasBlood: true}), {bpm: 110, volume: 0.5});
  assert.ok(AR.heartbeat({blood: 2, max: 10, hasBlood: true}).bpm > AR.heartbeat({blood: 3, max: 10, hasBlood: true}).bpm);
  assert.equal(AR.heartbeat({blood: 2, max: 3, hasBlood: true}), null);
  assert.ok(AR.heartbeat({blood: 1, max: 3, hasBlood: true}));
  assert.equal(AR.heartbeat({blood: "x", hasBlood: true}), null);
  assert.equal(AR.beatGap(60), 1000);
  assert.equal(AR.beatGap(0), 1000);
  assert.equal(AR.beatGap(1000), 300);
});
test("adaptive sound is wired: settings, effect hooks, the old combat switch kept for when it is off, the api", () => {
  const main = readFileSync(new URL("../../modules/wodx-atmosphere/scripts/main.mjs", import.meta.url), "utf8");
  assert.match(main, /world\("adaptive"/);
  assert.match(main, /world\("tension"/);
  assert.match(main, /register\(MOD, "heartbeat"/);
  assert.match(main, /Hooks\.on\("createActiveEffect", onEffect\)/);
  assert.match(main, /if \( setting\("adaptive"\) \) return adaptSoon\(\);\n  if \( !playlistFor\(currentKit\(\), "combat"\) \) return;/);
  assert.match(main, /adaptive: \{tension: tensionNow, adapt,/);
});
