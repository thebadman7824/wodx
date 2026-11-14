import { test } from "node:test";
import assert from "node:assert/strict";
import * as O from "../../modules/wodx-storyteller/scripts/omen-rules.mjs";
import * as D from "../../modules/wodx-storyteller/scripts/dreams-rules.mjs";

const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

test("omens: who dreams true", () => {
  assert.equal(O.giftOf({}), 0);
  assert.equal(O.giftOf({powers: ["Auspex"]}), 1);
  assert.equal(O.giftOf({traits: ["oracular-ability"]}), 2);
  assert.equal(O.giftOf({clan: "Malkavian", powers: ["Auspex"], traits: ["oracular-ability"]}), 3);
  assert.equal(O.giftOf({creed: "Visionary", year: 1990}), 0);
  assert.equal(O.giftOf({creed: "Visionary", year: 2001}), 1);
  assert.equal(O.giftOf({backgrounds: [{name: "Dream", value: 4}]}), 2);
  assert.equal(O.giftOf({auspice: "Theurge"}), 1);
});

test("omens: dreams come closest to the dreamer, once a week at most", () => {
  const d = {id: "a", gift: 2, region: "moravia"};
  const mine = {kind: "grudge", about: "a", weight: 2}, near = {kind: "hunters", region: "moravia", weight: 2}, far = {kind: "war", region: "japan", weight: 2};
  assert.ok(O.chanceFor(mine, d) > O.chanceFor(near, d));
  assert.ok(O.chanceFor(near, d) > O.chanceFor(far, d));
  assert.equal(O.chanceFor(mine, {...d, gift: 0}), 0);
  const got = O.tonight({signals: [far, near, mine], dreamers: [d], now: 10 * O.DAY, rand: seq(0, 0.99, 0, 0.5)});
  assert.equal(got.length, 1);
  assert.equal(got[0].signal, mine);
  assert.equal(got[0].lie, false);
  assert.equal(got[0].symbols.length, 2);
  assert.notEqual(got[0].symbols[0], got[0].symbols[1]);
  assert.equal(O.tonight({signals: [mine], dreamers: [{...d, last: 9 * O.DAY}], now: 10 * O.DAY, rand: () => 0}).length, 0);
  // a lie borrows another kind's symbols
  const lie = O.tonight({signals: [mine], dreamers: [d], now: 0, rand: seq(0, 0, 0.3, 0.1, 0.2)});
  assert.equal(lie[0].lie, true);
  assert.notEqual(lie[0].kind, "grudge");
});

test("omens: the symbols follow the way of life", () => {
  assert.ok(O.symbolsFor("hunters", "latin").length > O.symbolsFor("hunters", "sinic").length);
  assert.ok(O.symbolsFor("nope").length > 0);
  assert.match(O.dreamWords(["a", "b"]), /^In the dream there is a\. Then, without any change of place, b\./);
});

test("omens: reading says more with more successes, and finds a lie", () => {
  const om = {kind: "grudge", who: "Ota"};
  assert.match(O.reading(om, 0), /will not open/);
  assert.equal(O.reading(om, 1), O.MEANINGS.grudge[0]);
  assert.equal(O.reading(om, 3), "Ota holds a grudge and is close to acting on it.");
  assert.equal(O.reading(om, 9), "Ota holds a grudge and is close to acting on it.");
  assert.match(O.reading({...om, lie: true}, 4), /false/);
  assert.equal(O.reading({...om, lie: true}, 3), "Ota holds a grudge and is close to acting on it.");
  assert.match(O.reading({kind: "change", what: "The Shattering."}, 3), /Shattering/);
});

test("omens: signs in the world, event kinds, and dreams keep their omen", () => {
  assert.equal(O.omenFor({kind: "war", weight: 2}), null);
  assert.ok(O.omenFor({kind: "war", weight: 3}, () => 0));
  assert.equal(O.kindOfEvent({name: "The Black Death", summary: "Plague reaches Europe."}), "plague");
  assert.equal(O.kindOfEvent({name: "The siege of Vienna"}), "war");
  assert.equal(O.kindOfEvent({name: "The Shattering"}), "change");
  const d = D.normDream({id: "x", actorId: "a", omen: {kind: "fire", lie: 1}});
  assert.deepEqual(d.omen, {kind: "fire", who: "", where: "", what: "", lie: true});
  assert.equal(D.normDream({id: "x", actorId: "a"}).omen, null);
});
