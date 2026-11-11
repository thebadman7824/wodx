import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Trait effects step 11 (Chronicle 0.24.0): the other lines' merits and flaws in the table */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const D = await import(pathToFileURL(join(root, "modules/wodx-chronicle/data/trait-effects.mjs")));
const L = await import(pathToFileURL(join(root, "modules/wodx-chronicle/data/trait-lines.mjs")));
const T = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/trait-rules.mjs")));
const KINDS = ["any", "kindred", "ghoul", "mortal", "hunter", "lupine", "mage", "fae", "wraith", "spirit", "beast", "demon", "mummy", "exalted", ...Object.keys(T.ALSO)];
const feat = (name, kind = "merit") => ({id: name, name, kind, value: 1});

test("every line row is clean: a page, a known pattern, known kinds, and no clash with the table", () => {
  assert.ok(L.LINE_MERITS_FLAWS.length >= 300);
  assert.deepEqual(T.problems(), []);
  for ( const e of L.LINE_MERITS_FLAWS ) {
    assert.ok(L.LINE_BOOKS.includes(e.book), e.key);
    assert.ok(e.holders.every(h => KINDS.includes(h)), `${e.key}: ${e.holders}`);
    assert.ok(/^[A-Z][A-Za-z '\-:,()/&.]+$/.test(e.name), e.name);
  }
  assert.equal(D.MERITS_FLAWS.filter(e => e.book === "V20").length, 162);
  for ( const b of L.LINE_BOOKS ) assert.ok(D.BOOKS_DONE.includes(b), b);
  assert.ok(!JSON.stringify(L.LINE_MERITS_FLAWS).includes("—"));
});

test("a line's merit works for its own kind only, and shared V20 entries take the other lines' holders", () => {
  const w = L.LINE_MERITS_FLAWS.find(e => e.book === "W20" && !e.holders.includes("any"));
  const onGarou = T.traitsOf({kind: "lupine", features: [feat(w.name, w.kind)]}).matched[0];
  const onMage = T.traitsOf({kind: "mage", features: [feat(w.name, w.kind)]}).matched[0];
  assert.equal(onGarou.wrongKind, false);
  assert.equal(onMage.wrongKind, w.holders.includes("mage") ? false : true);
  for ( const [key, kinds] of Object.entries(L.WIDEN) ) {
    const e = D.MERITS_FLAWS.find(x => x.key === key);
    assert.ok(e.holders.includes("any") || kinds.every(k => e.holders.includes(k)), key);
  }
});
