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

/* WoDX Atmosphere 0.6.0: places that age. */
test("a place that ages shows the latest picture whose year has come, else its own map", () => {
  const ages = {base: "maps/town.webp", variants: [{from: 1348, img: "maps/town-plague.webp"}, {from: 1620, img: "maps/town-1620.webp"}, {from: 1890, img: "maps/town-1890.webp"}]};
  assert.equal(K.ageFor(ages, 1200), "maps/town.webp");
  assert.equal(K.ageFor(ages, 1348), "maps/town-plague.webp");
  assert.equal(K.ageFor(ages, 1700), "maps/town-1620.webp");
  assert.equal(K.ageFor(ages, 2020), "maps/town-1890.webp");
  assert.equal(K.ageFor(ages, null), "maps/town.webp");
  assert.equal(K.ageFor({variants: [{from: 1500, img: "a.webp"}]}, 1400), null);
  assert.deepEqual(K.cleanAges([{from: 1890, img: "b"}, {from: "1348.7", img: "a"}, {from: 1890, img: "c"}, {from: 1500}, {img: "x"}]),
    [{from: 1348, img: "a"}, {from: 1890, img: "c"}]);
  const src = readFileSync(join(root, "modules/wodx-atmosphere/scripts/main.mjs"), "utf8");
  assert.match(src, /data-action="addAge"/);
  assert.match(src, /Hooks\.on\("wodxSkipEnd".*ageEverything/);
  assert.match(src, /const ageEverything = .*applyAges\(\)/);
});

/* WoDX Atmosphere 0.7.0: faces that age. */
test("who ages: mortals and the living lines do, the undead do not, ghouls by the blood", () => {
  assert.equal(K.faceKind("Mortal", "ghoul"), "ghoul");
  assert.equal(K.faceKind("Mortal", "mortal"), "ages");
  assert.equal(K.faceKind("Hunter"), "ages");
  assert.equal(K.faceKind("Vampire"), "never");
  assert.equal(K.faceKind("Wraith"), "never");
  assert.equal(K.faceKind("Mummy"), "never");
  assert.equal(K.faceKind("Vampire", null, "ages"), "ages");
  assert.equal(K.faceKind("Mortal", null, "nonsense"), "ages");
});
test("the age a face shows: the true age, a ghoul's stilled age until cut off from the blood", () => {
  assert.equal(K.apparentAge({born: 1170, kind: "ages"}, 1197), 27);
  assert.equal(K.apparentAge({born: 1170, kind: "never"}, 1300), null);
  assert.equal(K.apparentAge({kind: "ages"}, 1300), null);
  assert.equal(K.apparentAge({born: 1170, kind: "ages"}, null), null);
  assert.equal(K.apparentAge({born: 1100, kind: "ghoul", still: 35}, 1300), 35);
  assert.equal(K.apparentAge({born: 1100, kind: "ghoul", still: 35, lost: true}, 1300), 200);
  assert.equal(K.apparentAge({born: 1180, kind: "ghoul", still: 35}, 1200), 20, "never older than the true age");
  assert.equal(K.apparentAge({born: 1100, kind: "ghoul"}, 1150), 50, "no stilled age yet: the true age");
  assert.equal(K.apparentAge({born: 1300, kind: "ages"}, 1250), 0);
});
test("the filter steps once a decade from forty, and a hand-made picture wins", () => {
  assert.deepEqual([20, 39, 40, 49, 55, 68, 79, 80, 140].map(K.faceStage), [0, 0, 1, 1, 2, 3, 4, 5, 5]);
  assert.equal(K.faceStage(null), 0);
  assert.equal(K.STAGE_WORDS.length, 6);
  const face = {born: 1150, kind: "ages", variants: [{from: 60, img: "old.webp"}]};
  assert.deepEqual(K.faceFor(face, 1200), {age: 50, stage: 2, img: null});
  assert.deepEqual(K.faceFor(face, 1215), {age: 65, stage: 3, img: "old.webp"});
  assert.deepEqual(K.faceFor({born: 1150, kind: "never"}, 1400), {age: null, stage: 0, img: null});
});
test("the aging filter drains colour and softens contrast, more with each step, and leaves alpha alone", () => {
  const px = () => new Uint8ClampedArray([220, 40, 40, 200, 0, 0, 0, 255, 255, 255, 255, 255]);
  assert.deepEqual([...K.agePixels(px(), 0)], [...px()]);
  const spread = d => Math.max(d[0], d[1], d[2]) - Math.min(d[0], d[1], d[2]);
  let last = spread(px());
  for ( let k = 1; k <= 5; k++ ) {
    const d = K.agePixels(px(), k);
    assert.ok(spread(d) < last, `step ${k} has less colour`);
    last = spread(d);
    assert.equal(d[3], 200);
    assert.ok(d[4] > 0, "black lifts");
    assert.ok(d[8] < 255 || d[10] < 255, "white fades");
  }
  assert.equal(K.agePixels(px(), 9)[0], K.agePixels(px(), 5)[0], "capped at five");
});
test("aged pictures get names tied to the picture they came from", () => {
  const a = K.agedName("abc", "img", 2, "faces/a.webp"), b = K.agedName("abc", "img", 2, "faces/b.webp");
  assert.match(a, /^abc-portrait-age2-[0-9a-z]+\.webp$/);
  assert.notEqual(a, b);
  assert.match(K.agedName("a/b", "token", 3, "x"), /^ab-token-age3-/);
  const src = readFileSync(join(root, "modules/wodx-atmosphere/scripts/main.mjs"), "utf8");
  assert.match(src, /data-action="setFace"/);
  assert.match(src, /searchBox\("table\.watmo-faces"/);
  assert.match(src, /searchBox\("select\[name=faceActor\]"/);
  assert.match(src, /faces: \{set: setFace/);
});
