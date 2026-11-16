import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* B6931: each faith has a founding year from history and is not kept before it (the desk's faith-eras ruling). */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const F = await import(join(root, "modules/wodx-chronicle/scripts/faith-rules.mjs"));
const L = await import(join(root, "modules/wodx-chronicle/scripts/local-reckoning-rules.mjs"));
const {gregorianToJDN, julianToJDN} = await import(join(root, "modules/wodx-chronicle/scripts/calendar-math.mjs")).catch(() => ({}));

test("every faith but a count of their own has a founding year and a source note", () => {
  for ( const [id, f] of Object.entries(F.FAITHS) ) {
    if ( id === "own" ) { assert.equal(f.founded, undefined); continue; }
    assert.ok(Number.isInteger(f.founded) && f.founded > -3000 && f.founded < 1100, `${id} founded`);
    assert.ok(typeof f.source === "string" && f.source.length > 10, `${id} source`);
  }
  assert.equal(F.FAITHS.islamic.founded, 622);
  assert.ok(F.FAITHS.western.founded >= 30 && F.FAITHS.western.founded <= 33);
});

test("a land keeps its own count before its faith was founded", () => {
  assert.equal(F.faithFor("egypt", 500), "own", "no Muslim year before the Hijra");
  assert.equal(F.faithFor("egypt", 700), "islamic");
  assert.equal(F.faithFor("moravia", -100), "own", "no church year before Christianity");
  assert.equal(F.faithFor("moravia", 1197), "western");
  assert.equal(F.faithFor("tibet-himalaya", 600), "own");
  assert.equal(F.faithFor("tibet-himalaya", 1197), "tibetan");
  assert.equal(F.faithFounded("own", -9999), true);
  assert.equal(F.faithIn("islamic", 600), "own");
});

test("a picked faith answers as a count of their own before its founding, and others' days leave it out", () => {
  const d = {year: 500, month: 3, day: 20, calendar: "julian", jdn: julianToJDN(500, 3, 20), dayOfWeek: 0};
  assert.equal(F.faithDay("islamic", d, {}).faith, "own");
  assert.ok(!F.otherDays(d, "western").some(x => x.faith === "islamic"));
  assert.equal(L.countOf({reckonFaith: "islamic"}, null, "western", 500).faith, "western", "a character cannot count by a faith not yet founded");
  assert.equal(L.countOf({reckonFaith: "islamic"}, null, "western", 1300).faith, "islamic");
});
