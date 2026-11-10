import test from "node:test";
import assert from "node:assert/strict";
import * as RR from "../../modules/wodx-storyteller/scripts/rumour-rules.mjs";
import * as G from "../../modules/wodx-chronicle/scripts/gen-core.mjs";

/* WoDX Storyteller 0.8.0: the rumour network. */
const rand = k => G.stream("seed", k);
test("who talks to whom: a faction or a scene links everyone in it", () => {
  const c = RR.buildContacts({groups: [["a", "b", "c"], ["c", "d"], ["e"], [null, "a", "a"]]});
  assert.deepEqual(c, {a: ["b", "c"], b: ["a", "c"], c: ["a", "b", "d"], d: ["c"]});
  assert.deepEqual(RR.buildContacts({}), {});
});
test("a night's spreading: each knower tells up to two new people, seeded; nothing new for three nights and it goes quiet", () => {
  const c = RR.buildContacts({groups: [["a", "b", "c", "d", "e", "f"], ["f", "g"]]});
  const r0 = RR.normRumour({id: "r", text: "They say", knownBy: ["a"]});
  const n1 = RR.spreadNight(r0, c, rand("r:1"));
  assert.equal(n1.heard.length, 2);
  assert.equal(n1.rumour.knownBy.length, 3);
  assert.deepEqual(RR.spreadNight(r0, c, rand("r:1")).heard, n1.heard, "the same seed spreads the same way");
  let r = n1.rumour;
  for ( let i = 2; i < 8; i++ ) r = RR.spreadNight(r, c, rand(`r:${i}`)).rumour;
  assert.equal(r.knownBy.length, 7, "it reaches g through f");
  for ( let i = 0; i < RR.QUIET_NIGHTS; i++ ) r = RR.spreadNight(r, c, rand(`q:${i}`)).rumour;
  assert.ok(!RR.live(r));
  assert.deepEqual(RR.spreadNight(r, c, rand("x")).heard, []);
  assert.deepEqual(RR.spreadNight({...r0, ended: true}, c, rand("x")).heard, []);
  assert.equal(RR.spreadNight(r0, c, rand("r:1"), {heat: 5}).heard.length, 5);
});
test("the nights due run from the night after the last one to tonight, capped", () => {
  assert.deepEqual(RR.nightsDue({id: "r", text: "x", night: 10}, 13), [11, 12, 13]);
  assert.deepEqual(RR.nightsDue({id: "r", text: "x", night: 13}, 13), []);
  assert.deepEqual(RR.nightsDue({id: "r", text: "x"}, 13), [13]);
  assert.equal(RR.nightsDue({id: "r", text: "x", night: 0}, 1000).length, RR.MAX_NIGHTS);
  assert.deepEqual(RR.nightsDue({id: "r", text: "x", night: 10, ended: true}, 13), []);
  assert.deepEqual(RR.nightsDue({id: "r", text: "x", night: 10}, null), []);
});
test("the first teller: someone in the scene in view with contacts, else anyone with contacts", () => {
  const c = RR.buildContacts({groups: [["a", "b"], ["c", "d"]]});
  assert.ok(["c", "d"].includes(RR.firstTeller(c, rand("f"), ["c", "d", "z"])));
  assert.ok(["a", "b", "c", "d"].includes(RR.firstTeller(c, rand("f"), ["z"])));
  assert.equal(RR.firstTeller({}, rand("f")), null);
  assert.deepEqual(RR.normRumours([{id: "a", text: ""}, {id: "", text: "x"}, {id: "b", text: " t "}]).map(r => r.text), ["t"]);
});
