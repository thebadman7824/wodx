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

/* Part 2 (B3783-B3785): how people take the character */

test("part 2: every key is in the table, and the roll effects work", () => {
  const keys = new Set(D.MERITS_FLAWS.map(e => e.key));
  for ( const o of [M.MORE_EFFECTS_2, M.MORE_ATTITUDE, M.MORE_PROMPTS_2] ) for ( const k of Object.keys(o) ) assert.ok(keys.has(k), k);
  const garou = view("lupine", feat("Feral Appearance"));
  assert.equal(T.sumEffects(T.effectsFor(garou, {channel: "roll", tags: ["appearance"], against: "lupine"})).dice, 1);
  assert.equal(T.sumEffects(T.effectsFor(garou, {channel: "roll", tags: ["appearance"], against: "mortal"})).dice, 0);
  const goat = view("fae", feat("Parfum de Goat", "flaw"));
  assert.equal(T.sumEffects(T.effectsFor(goat, {channel: "roll", tags: T.rollTags("charisma", "empathy")})).diff, 3);
  const tape = view("mage", feat("Red Tape", "flaw"));
  assert.deepEqual(T.ticksOf(tape).map(t => t.key), ["bureaucracy"]);
  assert.equal(T.sumEffects(T.effectsFor(tape, {channel: "roll", tags: ["social", "bureaucracy"]})).diff, 2);
});

test("part 2: a first meeting reads the NPC's sect, seat and title", () => {
  const v = {...view("kindred", feat("Bishop Friendship")), groups: ["Sabbat"]};
  const bishop = {kind: "kindred", groups: ["Sabbat"], words: ["bishop"], office: true};
  assert.equal(T.attitudeSeed(v, bishop).delta, 2);
  assert.equal(T.attitudeSeed(v, {...bishop, office: false}).delta, 0);
  assert.equal(T.attitudeSeed(v, {...bishop, groups: ["Camarilla"]}).delta, 0);
  assert.equal(T.attitudeSeed(v, "kindred").delta, 0);
  const law = view("kindred", feat("Lawman's Friend"));
  assert.equal(T.attitudeSeed(law, {kind: "kindred", words: ["sheriff"], office: true}).delta, 1);
  assert.equal(T.attitudeSeed(law, {kind: "kindred", words: ["harpy"], office: true}).delta, 0);
  const bigot = view("mage", feat("Bigot (Tremere)", "flaw"));
  assert.equal(T.attitudeSeed(bigot, {kind: "kindred", groups: ["Tremere"]}).delta, -1);
  assert.equal(T.attitudeSeed(bigot, {kind: "kindred", groups: ["Ventrue"]}).delta, 0);
  assert.equal(T.attitudeSeed(view("mortal", feat("Sanctity")), "mortal").delta, 1);
});

test("part 2: the count of merits and flaws with no effect falls again", () => {
  const none = D.MERITS_FLAWS.filter(e => T.describe({entry: e}).includes("no automatic effect yet")).length;
  assert.ok(none <= 278, `${none} merits and flaws with no automatic effect`);
});

/* Part 3 (B3786-B3787): W20 core, printed pp. 472-485 */

test("part 3: the W20 core traits are in the table and change rolls", () => {
  const keys = new Set(D.MERITS_FLAWS.map(e => e.key));
  for ( const o of [M.MORE_EFFECTS_3, M.MORE_PROMPTS_3] ) for ( const k of Object.keys(o) ) assert.ok(keys.has(k), k);
  const dupe = view("mage", feat("Gullible", "flaw"));
  assert.equal(T.sumEffects(T.effectsFor(dupe, {channel: "roll", tags: T.rollTags("manipulation", "subterfuge")})).dice, -3);
  const wolf = view("lupine", feat("Moon-Bound"));
  assert.deepEqual(T.ticksOf(wolf).map(t => t.key), ["own-moon-waxing", "own-moon-waning"]);
  assert.equal(T.sumEffects(T.effectsFor(wolf, {channel: "roll", tags: ["melee", "own-moon-waxing"]})).dice, 1);
  const pack = view("lupine", feat("Pack Mentality", "flaw"));
  assert.equal(T.sumEffects(T.effectsFor(pack, {channel: "roll", tags: ["athletics", "without-pack"]})).diff, 2);
  assert.ok(T.promptsOn(view("lupine", feat("Pierced Veil", "flaw")), "fight").some(c => c.key === "pierced-veil"));
});

test("part 3: the count of merits and flaws with no effect falls again", () => {
  const none = D.MERITS_FLAWS.filter(e => T.describe({entry: e}).includes("no automatic effect yet")).length;
  assert.ok(none <= 234, `${none} merits and flaws with no automatic effect`);
});

/* Part 4 (B3788-B3790): the rest outside combat */

test("part 4: keys exist, rolls change, cards come, first meetings move", () => {
  const keys = new Set(D.MERITS_FLAWS.map(e => e.key));
  for ( const o of [M.MORE_EFFECTS_4, M.MORE_ATTITUDE_2, M.MORE_PROMPTS_4] ) for ( const k of Object.keys(o) ) assert.ok(keys.has(k), k);
  const liar = view("mage", feat("Rotten Liar", "flaw"));
  assert.equal(T.sumEffects(T.effectsFor(liar, {channel: "roll", tags: T.rollTags("manipulation", "subterfuge")})).diff, 2);
  const shade = view("kindred", feat("Cloaked in Shadow", "flaw"));
  assert.equal(T.sumEffects(T.effectsFor(shade, {channel: "roll", tags: ["social"], against: "kindred"})).diff, 1);
  assert.equal(T.attitudeSeed(view("fae", feat("Calming Presence")), "beast").delta, 2);
  assert.ok(T.promptsOn(view("kindred", feat("Dulled Bite", "flaw")), "feed").some(c => c.key === "dulled-bite"));
  const none = D.MERITS_FLAWS.filter(e => T.describe({entry: e}).includes("no automatic effect yet")).length;
  assert.ok(none <= 103, `${none} merits and flaws with no automatic effect`);
});

/* Part 5 (B3791-B3792): the last outside combat */

test("part 5: keys exist, rolls change, and only combat and body traits are left", () => {
  const keys = new Set(D.MERITS_FLAWS.map(e => e.key));
  for ( const o of [M.MORE_EFFECTS_5, M.MORE_PROMPTS_5] ) for ( const k of Object.keys(o) ) assert.ok(keys.has(k), k);
  const pious = view("hunter", feat("Holy Aura"));
  assert.equal(T.sumEffects(T.effectsFor(pious, {channel: "roll", tags: ["social"]})).diff, -1);
  const fan = view("mortal", feat("True Faith"));
  assert.equal(T.sumEffects(T.effectsFor(fan, {channel: "roll", tags: ["willpower"]})).dice, 1);
  assert.ok(T.promptsOn(view("kindred", feat("Territorial", "flaw")), "night").some(c => c.key === "territorial"));
  const none = D.MERITS_FLAWS.filter(e => T.describe({entry: e}).includes("no automatic effect yet")).length;
  assert.ok(none <= 22, `${none} merits and flaws with no automatic effect`);
});
