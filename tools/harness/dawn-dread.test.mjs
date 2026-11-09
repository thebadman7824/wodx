import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync, existsSync} from "node:fs";

/* WoDX Atmosphere 0.3.0: dawn dread, the mirror of the Sunset cue. */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const K = await import(join(root, "modules/wodx-atmosphere/scripts/kits-rules.mjs"));

test("dawn dread runs the last half hour before sunrise and grows toward it", () => {
  assert.equal(K.dawnDread(1801), null);
  assert.equal(K.dawnDread(0), null);
  assert.equal(K.dawnDread(NaN), null);
  const a = K.dawnDread(1800), b = K.dawnDread(900), c = K.dawnDread(60);
  assert.equal(a.strength, 0); assert.equal(b.strength, 0.5); assert.ok(c.strength > 0.95);
  assert.equal(a.birds, false); assert.equal(K.dawnDread(1200).birds, true);
  assert.equal(K.dawnDread(601).cock, false); assert.equal(K.dawnDread(600).cock, true);
  assert.equal(K.dawnDread(601).rotschreck, 0); assert.equal(K.dawnDread(300).rotschreck, 1);
  assert.equal(b.minutes, 15);
});

test("birdsong and cock-crow sound once, when the clock crosses their mark", () => {
  assert.deepEqual(K.dreadCuesCrossed(1190, 20), ["birds"]);
  assert.deepEqual(K.dreadCuesCrossed(1190, 5), []);
  assert.deepEqual(K.dreadCuesCrossed(500, 3600), ["birds", "cock"]);
  assert.deepEqual(K.dreadCuesCrossed(590, 30), ["cock"]);
  assert.deepEqual(K.dreadCuesCrossed(590, 0), []);
  assert.deepEqual(K.dreadCuesCrossed(0, 100), []);
});

test("the two dawn cues ship once for every era, and the kit window can play them", () => {
  for ( const c of K.COMMON_CUES ) {
    assert.ok(K.CUES[c], c);
    assert.ok(existsSync(join(root, `modules/wodx-atmosphere/sounds/common/${c}.ogg`)), c);
  }
  const src = readFileSync(join(root, "modules/wodx-atmosphere/scripts/main.mjs"), "utf8");
  assert.match(src, /sounds\/common\/\$\{cue\}\.ogg/);
  assert.match(src, /dread: \{now: dread, rotschreck: dreadRotschreck/);
  assert.match(readFileSync(join(root, "modules/wodx-atmosphere/styles/wodx-atmosphere.css"), "utf8"), /body\.wodx-dawn-dread::after/);
});

test("the Rötschreck window takes dawn's step only while WoDX Atmosphere is on", () => {
  const src = readFileSync(join(root, "modules/wodx-actions/scripts/main.js"), "utf8");
  assert.match(src, /at\?\.active \? Number\(at\.api\?\.dread\?\.rotschreck\?\.\(\)\) \|\| 0 : 0/);
  assert.match(src, /name="mod" value="\$\{dawn\}"/);
});

/* WoDX Atmosphere 0.4.0: sound through walls. */
test("a placed sound is stopped by walls and heard muffled through them, or let through", () => {
  assert.deepEqual(K.muffleChanges({}), {walls: true, "effects.muffled.type": "lowpass", "effects.muffled.intensity": 5});
  assert.deepEqual(K.muffleChanges({walls: true, effects: {muffled: {type: null, intensity: 8}}}), {walls: true, "effects.muffled.type": "lowpass", "effects.muffled.intensity": 8});
  const done = {walls: true, effects: {muffled: {type: "lowpass", intensity: 5}}};
  assert.equal(K.muffleChanges(done), null);
  assert.ok(K.isMuffled(done));
  assert.deepEqual(K.muffleChanges(done, false), {walls: false});
  assert.equal(K.muffleChanges({walls: false}, false), null);
  assert.ok(!K.isMuffled({walls: false, effects: {muffled: {type: "lowpass"}}}));
  const src = readFileSync(join(root, "modules/wodx-atmosphere/scripts/main.mjs"), "utf8");
  assert.match(src, /Hooks\.on\("preCreateAmbientSound"/);
  assert.match(src, /data-action="muffle"/);
});

/* WoDX Atmosphere 0.5.0: personal themes. */
test("a personal theme plays at most once a minute, unless the Storyteller presses Spotlight", () => {
  const th = {src: "music/themes/anezka.ogg", volume: 0.8};
  assert.deepEqual(K.themeToPlay(th, {last: 0, now: 100000}), {src: th.src, volume: 0.8});
  assert.equal(K.themeToPlay(th, {last: 90000, now: 100000}), null);
  assert.deepEqual(K.themeToPlay(th, {last: 90000, now: 100000, force: true}), {src: th.src, volume: 0.8});
  assert.equal(K.themeToPlay({src: ""}), null);
  assert.equal(K.themeToPlay({src: "notes.txt"}), null);
  assert.equal(K.themeToPlay(null), null);
  assert.equal(K.themeToPlay({src: "a.mp3"}, {now: 1e9}).volume, 0.6);
  assert.equal(K.themeToPlay({src: "a.mp3", volume: 4}, {now: 1e9}).volume, 1);
  const src = readFileSync(join(root, "modules/wodx-atmosphere/scripts/main.mjs"), "utf8");
  assert.match(src, /Hooks\.on\("updateCombat"/);
  assert.match(src, /searchBox\("table\.watmo-themes"/);
});
