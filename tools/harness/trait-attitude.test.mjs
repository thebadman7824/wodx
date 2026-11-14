import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Trait effects step 5 (Chronicle 0.20.0, NPC 0.19.0, Actions 3.34.0): first-meeting seeds, Sway and Fear on NPCs */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/trait-rules.mjs")));
const AT = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/attitude-rules.mjs")));
const PW = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/power-effects.js")));
const src = p => readFileSync(join(root, p), "utf8");
const feat = (name, kind = "merit") => ({id: name, name, kind, value: 1});

test("Friendly Face warms any first meeting; the Masquerade flaws chill only mortals", () => {
  assert.deepEqual(T.attitudeSeed({kind: "mortal", features: [feat("Friendly Face")]}, "kindred"), {delta: 1, names: ["Friendly Face"]});
  const k = {kind: "kindred", features: [feat("Smell of the Grave", "flaw"), feat("Glowing Eyes", "flaw")]};
  assert.equal(T.attitudeSeed(k, "mortal").delta, -2);
  assert.equal(T.attitudeSeed(k, "kindred").delta, 0);
  assert.equal(T.attitudeSeed(k, null).delta, 0);
  assert.equal(T.attitudeSeed({kind: "mortal", features: [feat("Smell of the Grave", "flaw")]}, "mortal").delta, 0);
  assert.equal(T.attitudeSeed({kind: "kindred", features: [feat("Monstrous", "flaw"), feat("Eerie Presence", "flaw"), feat("Cold Breeze", "flaw")]}, "mortal").delta, -2);
  for ( const key of Object.keys(T.ATTITUDE) ) assert.ok(T.buildIndex().byKey.has(key), key);
});

test("the seed carries the traits into the first-meeting log", () => {
  const s = AT.withTraits({step: 1, from: "the Watch"}, {delta: -1, names: ["Smell of the Grave"]});
  assert.equal(s.step, 0);
  assert.match(s.from, /the Watch, and the look of them \(Smell of the Grave\)/);
  assert.deepEqual(AT.withTraits({step: 2, from: ""}, {delta: 2, names: ["Friendly Face"]}).step, 3);
  const e = AT.changed({}, "c1", {delta: 0, why: "met"}, AT.withTraits({step: 0, from: ""}, {delta: 1, names: ["Harmless"]}));
  assert.match(e.log[0].why, /Harmless/);
  assert.equal(e.log[0].step, 1);
  assert.match(src("modules/wodx-npc/scripts/attitude.mjs"), /traits\?\.attitudeSeed\?\.\(ch, npc[,)]/);
});

test("Sway warms an NPC toward the caster, Fear chills; Awe and calming do not count", () => {
  assert.equal(PW.moodDelta("sway", {kind: "note"}), 1);
  assert.equal(PW.moodDelta("sway", {awe: true}), 0);
  assert.equal(PW.moodDelta("fear", {name: "Afraid"}), -1);
  assert.equal(PW.moodDelta("fear", {name: "Calmed"}), 0);
  assert.equal(PW.moodDelta("harm", {}), 0);
  const fx = src("modules/wodx-actions/scripts/effects.js");
  assert.match(fx, /rec\.attitude = mood/);
  assert.match(fx, /r\.attitude\.met \? AT\.apply/);
});

test("an Afraid NPC flees in a fight", () => {
  const m = src("modules/wodx-npc/scripts/main.mjs");
  assert.match(m, /wodx-effect-fear/);
  assert.match(m, /fight\.state\.self\.afraid && !fight\.state\.self\.rotschreck/);
});
