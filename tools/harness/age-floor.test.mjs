import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

// WoDX Chronicle 0.53.0, NPC 0.68.0, Actions 3.63.0: nothing romantic or sexual with anyone under 18, in any era (B3140-B3142).
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const AR = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/age-rules.mjs")));
const yearOf = t => t; // in these tests a world time is the year itself

test("the floor is 18 in every era: a birth year, the age the body stopped, a child sign, the Storyteller's mark", () => {
  assert.equal(AR.ADULT_AGE, 18);
  const at = (flags, type = "Mortal") => AR.ageFacts({type, flags}, yearOf);
  for ( const year of [1197, 1500, 1800, 1950, 2025, 2300] ) {
    assert.equal(AR.isMinor(at({"wodx-creation": {chronology: {bornYear: year - 15}}}), year), true, `15 in ${year}`);
    assert.equal(AR.isMinor(at({"wodx-creation": {chronology: {bornYear: year - 17}}}), year), true, `17 in ${year}`);
    assert.equal(AR.isMinor(at({"wodx-creation": {chronology: {bornYear: year - 18}}}), year), false, `18 in ${year}`);
  }
  // Embraced at 15 in 1300: still a minor in 1900, though born six centuries ago
  assert.equal(AR.isMinor(at({"wodx-creation": {chronology: {bornYear: 1285, embraced: 1300}}}, "Vampire"), 1900), true);
  assert.equal(AR.isMinor(at({"wodx-creation": {chronology: {bornYear: 1270, embraced: 1300}}}, "Vampire"), 1900), false);
  assert.equal(AR.isMinor(at({"wodx-creation": {chronology: {bornYear: 1990, died: 2004}}}, "Wraith"), 2050), true, "a ghost who died at 14");
  assert.equal(AR.isMinor(at({"wodx-npc": {resident: {role: "child"}}}), 1400), true);
  assert.equal(AR.isMinor(at({"wodx-npc": {behavior: {template: "child"}}}), 1400), true);
  assert.equal(AR.isMinor(at({"wodx-npc": {child: {kind: "kinfolk"}}}), 1400), true, "a game-made child with no birth year");
  assert.equal(AR.isMinor(at({"wodx-chronicle": {minor: true}, "wodx-creation": {chronology: {bornYear: 1000}}}), 1400), true, "the mark wins over a birth year");
  assert.equal(AR.isMinor(at({"wodx-chronicle": {minor: false}, "wodx-npc": {resident: {role: "child"}}}), 1400), true, "the mark never makes a child an adult");
  assert.equal(AR.isMinor(at({}), 1400), false, "no sign at all: an adult");
});

test("the romance check names who is too young; romantic ties to or from a minor are dropped", () => {
  assert.deepEqual(AR.romanceAllowed([{name: "A", minor: false}, {name: "B", minor: false}]), {ok: true, why: ""});
  const r = AR.romanceAllowed([{name: "Ana", minor: false}, {name: "Bo", minor: true}]);
  assert.equal(r.ok, false); assert.match(r.why, /^Bo is under 18\./);
  const ties = [{uuid: "Actor.k", role: "lover"}, {uuid: "Actor.k", role: "friend"}, {uuid: "Actor.a", role: "spouse"}, {uuid: "Actor.k", role: "troth"}];
  assert.deepEqual(AR.safeTies(ties, false, u => u === "Actor.k").map(t => t.role), ["friend", "spouse"]);
  assert.deepEqual(AR.safeTies(ties, true).map(t => t.role), ["friend"]);
});

test("wiring: Chronicle's guard and API, and every romantic action checks first", () => {
  const age = src("modules/wodx-chronicle/scripts/age.mjs"), cm = src("modules/wodx-chronicle/scripts/main.mjs");
  assert.match(age, /Hooks\.on\("preUpdateActor"/); assert.match(age, /Hooks\.on\("preCreateActor"/);
  assert.match(cm, /age\.listen\(\);/); assert.match(cm, /age: \{minor: age\.minor, romance: age\.romance/);
  const h = src("modules/wodx-npc/scripts/hearts.mjs");
  for ( const fn of ["court", "marry", "haveChild"] ) {
    const body = h.slice(h.indexOf(`export async function ${fn}(`)).split("\n").slice(0, 8).join("\n");
    assert.match(body, /ageCheck\(a, b\)/, fn);
  }
  assert.match(h, /api\?\.age\?\.romance/);
  const m = src("modules/wodx-actions/scripts/main.js");
  const sed = m.slice(m.indexOf("export async function seduction("), m.indexOf("export async function seduction(") + 900);
  assert.match(sed, /age\?\.romance\?\.\(actor, target\)/);
});
