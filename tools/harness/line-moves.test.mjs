import test from "node:test";
import assert from "node:assert/strict";
import {join, dirname} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {execFileSync} from "node:child_process";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LR = await import(pathToFileURL(join(root, "modules/wodx-paperdoll/scripts/line-rules.mjs")));
const SR = await import(pathToFileURL(join(root, "modules/wodx-paperdoll/scripts/sprite-rules.mjs")));

test("a Garou goes through the forms between (B5813)", () => {
  assert.deepEqual(LR.stagesBetween("homid", "lupus"), ["glabro", "crinos", "hispo", "lupus"]);
  assert.deepEqual(LR.stagesBetween("lupus", "glabro"), ["hispo", "crinos", "glabro"]);
  assert.deepEqual(LR.stagesBetween("crinos", "crinos"), ["crinos"]);
  assert.deepEqual(LR.stagesBetween("homid", "bear"), []);
  assert.equal(LR.formOf("Crinos form"), "crinos");
  assert.equal(LR.formOf("Ursus"), null);
});

test("a mage's gesture follows the focus (B5814)", () => {
  const all = ["staff", "cards", "pour", "device", "pray"];
  assert.equal(LR.focusMove({paradigm: "Hermetic", instruments: ["wand", "book"]}, all), "staff");
  assert.equal(LR.focusMove({practice: "Hypertech", instruments: ["computer"]}, all), "device");
  assert.equal(LR.focusMove({practice: "Faith", instruments: ["prayer"]}, all), "pray");
  assert.equal(LR.focusMove({instruments: ["tarot cards"]}, all), "cards");
  assert.equal(LR.focusMove({instruments: ["potions"]}, all), "pour");
  assert.equal(LR.focusMove({instruments: ["wand"]}, []), "cast", "a sprite without the gesture casts as before");
});

test("powers of one line show as that line's move, look or veil (B5810 to B5818)", () => {
  assert.equal(LR.powerMove({power: "Earth Meld", group: "Protean"}).veil, "meld");
  assert.equal(LR.powerMove({power: "Unseen Presence", group: "Obfuscate"}).veil, "unseen");
  assert.equal(LR.powerMove({power: "Skinride", group: "Puppetry"}).veil, "ride");
  assert.deepEqual(LR.powerMove({power: "True Faith"}, ["brandish"]), {move: "brandish", look: "halo", veil: null});
  assert.equal(LR.powerMove({power: "Second Sight", line: "Hunter"}, ["search"]).look, "ring");
  assert.equal(LR.powerMove({power: "Call of the Wyld"}, ["howl", "cup"]).move, "howl");
  assert.equal(LR.powerMove({power: "Call of the Wyld"}, ["cup"]).move, "cup");
  assert.equal(LR.powerMove({power: "Rite of Cleansing"}, ["dance"]).move, "dance");
  assert.equal(LR.powerMove({power: "Celestial Hekau", line: "Mummy"}, ["hekau"]).move, "hekau");
  assert.equal(LR.powerMove({power: "Apocalyptic Form", line: "Demon"}).look, "wings");
  assert.equal(LR.powerMove({power: "Chicanery", line: "Changeling"}).look, "motes");
  assert.equal(LR.powerMove({power: "Catharsis", line: "Wraith"}).look, "smoke");
  assert.deepEqual(LR.powerMove({power: "Dominate"}), {move: null, look: null, veil: null}, "anything else casts as before");
});

test("a character's own state holds its pose (B5811, B5817)", () => {
  const has = ["daysleep", "earthsleep", "sleep", "frenzy", "shake", "sit"];
  assert.deepEqual(LR.lineHold({daySleep: true, has}), {pose: "daysleep", look: null});
  assert.deepEqual(LR.lineHold({daySleep: true, has, open: true}), {pose: "earthsleep", look: null});
  assert.deepEqual(LR.lineHold({daySleep: true, has, open: true, coffin: true}), {pose: "daysleep", look: null});
  assert.deepEqual(LR.lineHold({torpor: true, has}), {pose: "daysleep", look: "grey"});
  assert.deepEqual(LR.lineHold({frenzy: true, has}), {pose: "frenzy", look: "red"});
  assert.deepEqual(LR.lineHold({frenzy: true, has: ["claw"]}), {pose: "claw", look: "red"}, "a Crinos claws the air");
  assert.deepEqual(LR.lineHold({need: true, has}), {pose: "shake", look: null});
  assert.equal(LR.lineHold({has}), null);
  assert.equal(LR.lineHold({daySleep: true, has: []}), null);
});

test("a changeling's fae mien is seen only by those who may (B5819)", () => {
  assert.equal(LR.seesFae({isGM: true}), true);
  assert.equal(LR.seesFae({line: "Changeling"}), true);
  assert.equal(LR.seesFae({line: "Mortal", enchanted: true}), true);
  assert.equal(LR.seesFae({line: "Vampire"}), false);
});

test("looks: passing ones end, lasting ones hide the figure from others but not its owner", () => {
  assert.equal(LR.lookAt("flush", 0).done, false);
  assert.equal(LR.lookAt("flush", LR.LOOK_MS.flush).done, true);
  assert.notEqual(LR.lookAt("flush", LR.LOOK_MS.flush / 2).tint, 0xffffff);
  assert.equal(LR.lookAt("unseen", 0).alpha, 0);
  assert.ok(LR.lookAt("unseen", 0, {own: true}).alpha > 0);
  assert.equal(LR.lookAt("meld", 0).alpha, 0);
  assert.equal(LR.lookAt("sink", LR.LOOK_MS.sink - 1).alpha < .05, true);
  assert.equal(LR.lookAt("grey", 99999).done, false);
  assert.equal(LR.mix(0x000000, 0xffffff, .5), 0x808080);
});

test("the move tables know every line move, and the test figures carry theirs", () => {
  for ( const m of Object.keys(LR.LINE_LABELS) ) assert.ok(SR.ACT_LABELS[m], m);
  for ( const m of LR.LINE_LOOP ) assert.ok(SR.LOOP.includes(m) && SR.HOLD.includes(m), m);
  for ( const m of ["frenzy", "embrace", "daysleep", "earthsleep", "swoon"] ) assert.ok(SR.hasAct("kindred-elder-1888", m), m);
  for ( const m of ["cup", "dance"] ) assert.ok(SR.hasAct("garou-homid", m), m);
  assert.ok(SR.hasAct("garou-lupus", "howl"));
});

test("a Garou's forms and a changeling's seeming are learned from the manifest (B5813, B5819)", () => {
  const n = SR.learn("worlds/x/wodx-sprites", {sprites: {
    w1: {name: "Rolf", key: "ab", acts: ["claw"], forms: {glabro: "w1g", crinos: "w1c", hispo: "w1h", lupus: "w1l", bad: "zz"}},
    w1g: {name: "Rolf (glabro)", key: "ab", acts: [], of: "w1"}, w1c: {name: "Rolf (crinos)", key: "ab", acts: [], of: "w1"},
    w1h: {name: "Rolf (hispo)", key: "ab", acts: [], of: "w1"}, w1l: {name: "Rolf (lupus)", key: "ab", acts: ["howl"], of: "w1"},
    c1: {name: "Fen", key: "ab", acts: [], seeming: "c1m"}, c1m: {name: "Fen (mortal)", key: "ab", acts: [], of: "c1"}}});
  assert.equal(n, 7);
  const w = SR.ownName("w1");
  assert.equal(SR.formSprite(w, "lupus"), SR.ownName("w1l"));
  assert.equal(SR.formSprite(SR.ownName("w1c"), "homid"), w);
  assert.equal(SR.formShown(SR.ownName("w1h")), "hispo");
  assert.equal(SR.formShown(w), "homid");
  assert.equal(SR.SEEMING[SR.ownName("c1")], SR.ownName("c1m"));
  assert.ok(SR.hasAct(SR.ownName("w1l"), "howl"));
  SR.learn("worlds/x/wodx-sprites", {sprites: {}});
  assert.equal(SR.formSprite(w, "lupus"), null);
});

const py = (() => { for ( const c of ["python3", "python"] ) try { execFileSync(c, ["-c", "import numpy, PIL"], {stdio: "ignore"}); return c; } catch (e) { /* next */ } return null; })();
test("line move sprites: the Python checks pass (B5810 to B5819)", {skip: !py && "needs Python 3 with numpy and Pillow", timeout: 900000}, () => {
  const out = execFileSync(py, [join(root, "tools/sprites/test_lines.py")], {encoding: "utf8"});
  assert.match(out, /line moves ok/);
});
