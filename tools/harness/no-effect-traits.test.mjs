import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The no-effect audit, merits and flaws (B3780-B3782): more roll effects, tick boxes, cards, the OCR names fixed */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/trait-rules.mjs")));
const D = await import(pathToFileURL(join(root, "modules/wodx-chronicle/data/trait-effects.mjs")));
const M = await import(pathToFileURL(join(root, "modules/wodx-chronicle/data/trait-effects-more.mjs")));

const feat = (name, kind = "merit") => ({id: name, name, kind, value: 0});
const view = (kind, ...features) => ({kind, features});

test("every key the audit names is in the table", () => {
  const keys = new Set(D.MERITS_FLAWS.map(e => e.key));
  for ( const o of [M.MORE_EFFECTS, M.MORE_PROMPTS, M.RENAMES] ) for ( const k of Object.keys(o) ) assert.ok(keys.has(k), k);
  assert.deepEqual(T.problems(), []);
});

test("a ticked situation changes the roll, and only on the kind of roll it names", () => {
  const v = view("mortal", feat("Introspection"));
  assert.deepEqual(T.ticksOf(v).map(t => t.key), ["same-nature"]);
  const hit = T.sumEffects(T.effectsFor(v, {channel: "roll", tags: ["perception", "same-nature"]}));
  assert.equal(hit.dice, 2);
  assert.ok(hit.parts[0].startsWith("Introspection"));
  // ticked but not a Perception roll: nothing
  assert.equal(T.sumEffects(T.effectsFor(v, {channel: "roll", tags: ["social", "same-nature"]})).dice, 0);
  // a Perception roll with nothing ticked: nothing
  assert.equal(T.sumEffects(T.effectsFor(v, {channel: "roll", tags: ["perception"]})).dice, 0);
});

test("effects that need no tick work from the roll alone, against the right kind", () => {
  const fae = view("fae", feat("Faerie Affinity"));
  const mage = view("mage", feat("Faerie Affinity"));
  assert.equal(T.sumEffects(T.effectsFor(mage, {channel: "roll", tags: ["social"], against: "fae"})).diff, -2);
  assert.equal(T.sumEffects(T.effectsFor(mage, {channel: "roll", tags: ["social"], against: "mortal"})).diff, 0);
  assert.equal(fae.features.length, 1);
  const st = view("kindred", feat("Stereotype", "flaw"));
  assert.equal(T.sumEffects(T.effectsFor(st, {channel: "roll", tags: T.rollTags("manipulation", "subterfuge"), against: "kindred"})).diff, 2);
  const novice = view("fae", feat("Crack Shot"));
  assert.equal(T.sumEffects(T.effectsFor(novice, {channel: "roll", tags: T.rollTags("dexterity", "firearms")})).diff, -1);
});

test("story traits become cards to the Storyteller at their moment", () => {
  const v = view("hunter", feat("Combat Novice", "flaw"));
  const cards = T.promptsOn(v, "fight");
  assert.equal(cards.length, 1);
  assert.equal(cards[0].key, "combat-novice");
  assert.equal(T.promptsOn(v, "feed").length, 0);
  assert.ok(T.describe({entry: D.MERITS_FLAWS.find(e => e.key === "nine-lives")}).includes("a card to the Storyteller"));
});

test("names the OCR spoiled read as the book has them, and the old spelling still matches", () => {
  const e = D.MERITS_FLAWS.find(x => x.key === "seducttve");
  assert.equal(e.name, "Seductive");
  assert.ok(e.aliases.includes("Seducttve"));
  assert.equal(T.matchFeature({name: "Seducttve", kind: "merit"})?.key, "seducttve");
  assert.equal(T.matchFeature({name: "Defiled", kind: "flaw"})?.key, "the-ten-thousand-defjud");
});

test("two lines' merits of one name match the one the character can hold", () => {
  assert.equal(T.traitsOf(view("mage", feat("Unbondable"))).matched[0].key, "onbondable");
  assert.equal(T.traitsOf(view("kindred", feat("Unbondable"))).matched[0].key, "unbondable");
  assert.equal(T.traitsOf(view("fae", feat("Boon"))).matched[0].key, "character-creation-and-traits-boon");
  assert.equal(T.traitsOf(view("kindred", feat("Boon"))).matched[0].key, "boon");
});

test("fewer merits and flaws do nothing: the count may only fall (408 before the audit)", () => {
  const none = D.MERITS_FLAWS.filter(e => T.describe({entry: e}).includes("no automatic effect yet")).length;
  assert.ok(none <= 354, `${none} merits and flaws with no automatic effect`);
});
