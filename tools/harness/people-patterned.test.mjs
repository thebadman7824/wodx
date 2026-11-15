import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* Names made by pattern (B5600): only the same people's recorded parts, kept apart from the recorded names */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PW = await import(join(root, "modules/wodx-creation/data/people-world.mjs"));
const {PATTERNED} = await import(join(root, "modules/wodx-creation/data/people-patterned.mjs"));
const table = id => PW.WORLD_PEOPLE_TABLES.find(t => t.id === id);
const own = (o, sex) => (table(`names.native.${sex}.${o}`)?.results ?? []).map(r => r.text).filter(s => !s.includes("{"));

test("made names use only parts the same people's records hold, and repeat no recorded name", () => {
  for ( const [o, lists] of Object.entries(PATTERNED) ) {
    const rec = [...own(o, "male"), ...own(o, "female")];
    const firsts = new Set(rec.map(n => n.replace(/ Woman$/, "").split(" ")[0]));
    const lasts = new Set(rec.map(n => n.replace(/ Woman$/, "").split(" ").at(-1)));
    for ( const sex of ["male", "female"] ) for ( const n of lists[sex] ) {
      const [a, b] = n.replace(/ Woman$/, "").split(" ");
      assert.ok(firsts.has(a) && lasts.has(b), `${o}: ${n}`);
      assert.ok(!rec.includes(n), `${o}: ${n} is recorded`);
    }
    if ( !own(o, "female").length ) assert.equal(lists.female.length, 0, `${o}: no recorded women's names, none made`);
  }
});

test("made names have their own table, drawn a third as often as the recorded own names", () => {
  for ( const o of Object.keys(PATTERNED) ) {
    const t = table(`names.native.male.${o}`);
    const ref = t.results.find(r => r.text === `{names.patterned.male.${o}}`);
    const rec = t.results.filter(r => !r.text.includes("{")).length;
    assert.ok(ref && table(`names.patterned.male.${o}`), o);
    assert.ok(Math.abs(ref.weight - rec / 2) <= 1, `${o}: ${ref.weight} vs ${rec}`);
  }
});
