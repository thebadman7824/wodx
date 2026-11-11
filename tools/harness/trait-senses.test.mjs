import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Trait effects step 3 (Chronicle 0.19.0, Senses 0.6.0): merits and flaws on the senses, signs others sense, the Veil keyword */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/trait-rules.mjs")));
const S = await import(pathToFileURL(join(root, "modules/wodx-senses/scripts/senses-rules.mjs")));
const src = p => readFileSync(join(root, p), "utf8");
const feat = (name, kind = "merit") => ({id: name, name, kind, value: 1});

test("a character's own senses: Acute Sense on the sense it names, Bad Sight on sight, Deaf takes hearing", () => {
  const v = {kind: "mortal", features: [feat("Acute Sense (Smell)"), feat("Bad Sight", "flaw"), feat("Deaf", "flaw")]};
  const s = T.senseEffects(v);
  assert.deepEqual(s.mods.find(m => m.label === "Acute Sense"), {label: "Acute Sense", n: -2, senses: ["smell"]});
  assert.equal(s.mods.find(m => m.label === "Bad Sight").senses[0], "sight");
  assert.deepEqual(s.cannot, ["sound"]);
  const pw = S.powersFor({traitSenses: s});
  assert.equal(S.difficulty("smell", {}, pw).diff, 4);
  assert.equal(S.difficulty("sight", {light: "bright"}, pw).diff, 8);
  const deaf = S.difficulty("sound", {}, pw);
  assert.equal(deaf.blind, true);
  assert.equal(deaf.lost, "Deaf");
  assert.match(S.lostLine("sound"), /Deaf/);
});

test("Medium and Deathsight open their channels, and the channel lines are there", () => {
  const s = T.senseEffects({kind: "kindred", features: [feat("Medium"), feat("Deathsight")]});
  assert.deepEqual(s.channels.sort(), ["deathsight", "restless"]);
  const pw = S.powersFor({traitSenses: s});
  assert.ok(pw.channels.includes("restless") && pw.channels.includes("deathsight"));
  const ch = JSON.parse(src("modules/wodx-senses/data/world.json")).channels;
  assert.ok(ch.restless.dead.length && ch.deathsight.hurt.length);
  const m = src("modules/wodx-senses/scripts/main.mjs");
  assert.match(m, /ch === "restless"/);
  assert.match(m, /ch === "deathsight"/);
});

test("signs others sense: Smell of the Grave on a Kindred, nothing on a mortal who cannot hold it", () => {
  const k = T.showsOf({kind: "kindred", features: [feat("Smell of the Grave", "flaw"), feat("Cast No Reflection", "flaw"), feat("Iron Will")]});
  assert.deepEqual(k.map(x => x.key).sort(), ["cast-no-reflection", "smell-of-the-grave"]);
  assert.ok(k.find(x => x.key === "smell-of-the-grave").lines.smell[0].t.includes("{{dir}}"));
  assert.equal(k.find(x => x.key === "cast-no-reflection").indoor, true);
  assert.deepEqual(T.showsOf({kind: "mortal", features: [feat("Smell of the Grave", "flaw")]}), []);
  for ( const [key, sh] of Object.entries(T.SHOWS) ) {
    assert.ok(T.buildIndex().byKey.has(key), key);
    for ( const sense of ["sight", "sound", "smell", "touch"] ) for ( const l of sh[sense] ?? [] ) {
      assert.ok(!/\b(he|she|his|her|him)\b/i.test(l.t) && !/—/.test(l.t), key);
      assert.ok(Number.isFinite(l.n), key);
    }
  }
});

test("a merit with no sense effect leaves the senses alone", () => {
  const pw = S.powersFor({traitSenses: T.senseEffects({kind: "mortal", features: [feat("Iron Will")]})});
  assert.deepEqual(pw.traitMods, []);
  assert.deepEqual(pw.cannot, []);
  assert.equal(S.difficulty("sight", {light: "bright"}, S.powersFor({})).diff, 6);
});

test("the Veil keyword keeps its difficulty on the timed effect, and Senses reads it", () => {
  assert.match(src("modules/wodx-chronicle/scripts/timed.mjs"), /data: o\.data \?\? null/);
  assert.match(src("modules/wodx-actions/scripts/effects.js"), /data: o\.difficulty \? \{difficulty: o\.difficulty\} : null/);
  const m = src("modules/wodx-senses/scripts/main.mjs");
  assert.match(m, /wodx-effect-veil/);
  assert.match(m, /key: "veiled"/);
  assert.match(m, /traits\?\.shows\?\.\(t\.actor\)/);
  assert.match(m, /traits\?\.senses\?\.\(actor\)/);
});
