import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* B6779: merits and flaws whose book gives a number now carry it on the roll (a tick box) or roll it (a bite) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/trait-rules.mjs")));
const D = await import(pathToFileURL(join(root, "modules/wodx-chronicle/data/trait-effects.mjs")));
const B = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/trait-bite-rules.mjs")));
const feat = (name, kind = "flaw") => ({id: name, name, kind, value: 0});
const view = (kind, ...features) => ({kind, features});
const sum = (v, tags) => T.sumEffects(T.effectsFor(v, {channel: "roll", tags}));

test("the situational numbers are tick boxes that change only the rolls they name", () => {
  const ic = view("kinfolk", feat("Inferiority Complex"));
  assert.deepEqual(T.ticksOf(ic).map(t => t.key), ["in-charge"]);
  assert.equal(sum(ic, ["social", "in-charge"]).diff, 1);
  assert.equal(sum(ic, ["social"]).diff, 0);
  const road = view("kindred", feat("Initiate of the Road", "merit"));
  assert.equal(sum(road, ["selfcontrol", "road-frenzy"]).diff, 1);
  const saints = view("kindred", feat("The Company of Saints and Heroes", "merit"));
  assert.equal(sum(saints, ["social", "famous-friend"]).diff, -1);
  assert.equal(sum(saints, ["mental", "famous-friend"]).diff, 0);
  const hf = view("mage", feat("Hyperfocus", "merit"));
  assert.equal(T.ticksOf(hf).length, 3);
  assert.equal(sum(hf, ["intelligence", "focus-hour-1", "focus-hour-2", "focus-hour-3"]).dice, 3);
});

test("a flaw with no effect and no card gets a card, and the book's rolls roll themselves", () => {
  assert.ok(D.PROMPTS["extreme-kink"]?.text);
  for ( const [k, n] of [["soft-hearted", 8], ["botched-presentation", 7], ["flesh-eater", 8], ["possessive", 7], ["combat-novice", 7], ["banned-transformation", 8], ["wyld-mind", 4]] ) {
    const b = B.biteOf(k);
    assert.deepEqual(b?.roll, ["willpower", n], k);
    assert.ok(b.fail.tell && !/—/.test(b.fail.tell), k);
    assert.ok(D.PROMPTS[k], `${k} has a moment to bite at`);
  }
  // the older bites are not overwritten
  assert.equal(B.biteOf("impatient").fail.name, "Out of patience");
});
