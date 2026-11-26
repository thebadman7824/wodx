// #2505: the older lifepath scenes name the Czech lands; they show only for a life lived there
import test from "node:test";
import assert from "node:assert/strict";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(join(root, "modules/wodx-creation/scripts/lifepath-rules.mjs"));

const at = region => new Set(["line:mortal", ...(region ? [`region:${region}`] : [])]);

test("a choice naming Prague shows in Moravia, not in France", () => {
  const o = {label: "A student's child in Prague", g: "ab Academics"};
  assert.equal(R.optionShown(o, at("moravia")), true);
  assert.equal(R.optionShown(o, at("france")), false);
  assert.equal(R.optionShown(o, at(null)), true, "an older record with no region keeps every choice");
  assert.equal(R.optionShown({label: "A smith's child"}, at("france")), true);
  assert.equal(R.optionShown({label: "Husband"}, at("france")), true, "a word that only starts like Hus is not the Czech lands");
});

test("no scene that names the Czech lands is offered for a life in France", () => {
  const czech = e => R.CZECH_WORDS.test(`${e.title} ${e.text}`);
  const some = R.allEvents().filter(czech);
  assert.ok(some.length >= 5, "the older scenes do name the Czech lands");
  for ( const e of some ) {
    const flags = at("france");
    assert.equal(R.fits(e, {line: "mortal", steps: []}, e.stage, flags, 1400), false, e.id);
  }
});
