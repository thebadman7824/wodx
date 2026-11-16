// Twists on the table (B6650-B6659): every twist shows something and sets someone moving, the hearts pick their own
// actions, favours are debts called in from their chapter, and the third murder turns the Lower Town cold.
import {test} from "node:test";
import assert from "node:assert/strict";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const RR = await import(join(root, "modules/wodx-chronicle/scripts/reveal-rules.mjs"));

test("every twist shows a thing, a mark or a sound, and its people act", () => {
  assert.deepEqual(RR.validate(), []);
  for ( let n = 1; n <= 24; n++ ) {
    const s = RR.showOf(n);
    assert.ok(s.item || s.sight || s.sound, `twist ${n} shows`);
    assert.ok(RR.afterOf(n, n === 24 ? "turned" : n === 22 ? "seer" : "").length, `twist ${n} acts`);
  }
});

test("a heart picks its own actions", () => {
  const killed = RR.afterOf(24, "killed").map(a => a.do), turned = RR.afterOf(24, "turned").map(a => a.do);
  assert.ok(killed.includes("runs") && !turned.includes("runs"));
  assert.ok(turned.includes("talk") && !killed.includes("talk"));
});

test("favours are debts called in from their chapter, once", () => {
  let st = RR.normState({});
  st = RR.owe(st, RR.favourOf(21), 5);
  st = RR.owe(st, RR.favourOf(21), 9);
  assert.equal(st.debts["Old Vlasta"].at, 5);
  assert.match(RR.whyNotCall(st, "Old Vlasta", ["c1", "c2"]), /from chapter 8/);
  assert.throws(() => RR.call(st, "Old Vlasta", {played: ["c1"]}), /chapter 8/);
  st = RR.call(st, "Old Vlasta", {now: 20, played: ["c1", "c2", "c3", "c4", "c5", "c6", "c7"]});
  assert.equal(st.debts["Old Vlasta"].called, 20);
  assert.match(RR.whyNotCall(st, "Old Vlasta", ["c1", "c2", "c3", "c4", "c5", "c6", "c7"]), /Already/);
  assert.equal(RR.judgedFavour("reinhold", "truth").who, "Reinhold");
  assert.equal(RR.judgedFavour("reinhold", "lied"), null);
  assert.equal(RR.favourOf(23).who, "Baba Yaroslava");
});

test("the third murder turns the Lower Town cold, once", () => {
  let st = RR.normState({});
  let r = RR.murder(st, "Havel", 1); st = r.state;
  assert.equal(r.count, 1); assert.equal(r.cold, false);
  r = RR.murder(st, "Someone else", 2);
  assert.equal(r.count, 1);
  r = RR.murder(st, "Old Vlasta", 3); st = r.state;
  r = RR.murder(st, "Havel", 4); st = r.state;
  assert.equal(r.count, 2); assert.equal(st.murders.Havel, 1);
  r = RR.murder(st, "Ctibor's clerk", 5); st = r.state;
  assert.equal(r.cold, true); assert.equal(st.cold, 5);
  assert.equal(RR.murder(st, "Ctibor's clerk", 6).cold, false);
  assert.equal(RR.unmurder(st, "Havel").cold, null);
  // the sounds of reveals survive the state's other changes
  assert.deepEqual(RR.normState({sounds: {3: {scene: "Dolany", text: "x", until: 9}}}).sounds[3].until, 9);
});
