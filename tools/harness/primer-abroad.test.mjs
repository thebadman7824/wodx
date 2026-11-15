/** The primer for a scene far from home (Storyteller, B5940 to B5942). */
import {test} from "node:test";
import assert from "node:assert/strict";
import * as S from "../../modules/wodx-storyteller/scripts/setup-rules.mjs";

const era = {id: "long-night", name: "The Long Night", start: 1347};

test("B5940: abroad in Japan the page tells what everyone knows there", () => {
  const out = S.abroadPrimer(era, {homeSphere: "latin", hereSphere: "japanese", hereLabel: "Japan", placeLabel: "Japan", year: 1400});
  assert.equal(out.abroad, true);
  assert.equal(out.key, "japanese");
  assert.match(out.html, /Where you are now: Japan</);
  assert.doesNotMatch(out.html, /Japan, Japan/);
  assert.ok(out.html.length > 200);
});

test("B5940: at home, or with no land on the scene, a line says so", () => {
  for ( const o of [{homeSphere: "latin", hereSphere: "latin"}, {homeSphere: "latin", hereSphere: null}] ) {
    const out = S.abroadPrimer(era, {...o, year: 1400});
    assert.equal(out.abroad, false);
    assert.equal(out.key, "");
    assert.match(out.html, /Among your own people/);
  }
});

test("B5940: from a homeland in Egypt, Christendom reads as the era's own lines", () => {
  const out = S.abroadPrimer(era, {homeSphere: "islamic", hereSphere: "latin", hereLabel: "Western Christendom", year: 1400});
  assert.equal(out.abroad, true);
  assert.match(out.html, /Far from home/);
});
