import test from "node:test";
import assert from "node:assert/strict";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const P = await import(join(root, "modules/wodx-paperdoll/scripts/face64-rules.mjs"));

const LINES = Object.keys(P.LINES);
const px = (rgba, x, y) => [rgba[(y * 64 + x) * 4], rgba[(y * 64 + x) * 4 + 1], rgba[(y * 64 + x) * 4 + 2]];
const diff = (a, b) => { const out = []; for ( let i = 0; i < 64 * 64; i++ ) if ( a[i * 4] !== b[i * 4] || a[i * 4 + 1] !== b[i * 4 + 1] || a[i * 4 + 2] !== b[i * 4 + 2] ) out.push([i % 64, Math.floor(i / 64)]); return out; };
const isBlood = ([r, g, b]) => r > 95 && g < 30 && b < 32;

test("the same seed and line always give the same face, and seeds differ", () => {
  for ( const line of LINES ) {
    const a = P.drawFace(P.roll("actor-1", line)).rgba, b = P.drawFace(P.roll("actor-1", line)).rgba;
    assert.equal(diff(a, b).length, 0, line);
  }
  const looks = new Set(["a", "b", "c", "d", "e", "f"].map(s => Buffer.from(P.drawFace(P.roll(s, "mortal")).rgba).toString("base64")));
  assert.ok(looks.size >= 5, "six seeds give at least five different faces");
});

test("every line, expression, eye state, mouth and health level draws a full 64 by 64 picture", () => {
  for ( const line of LINES ) for ( const expr of P.EXPRESSIONS ) for ( const level of [0, 3, 7] ) {
    const f = P.drawFace(P.roll("s1", line), {expr, level});
    assert.equal(f.rgba.length, 64 * 64 * 4);
    assert.ok(f.rgba.every((v, i) => i % 4 !== 3 || v === 255), "no see-through pixels");
  }
  for ( const eyes of P.EYES_STATES ) for ( const mouth of [null, ...P.TALK_MOUTHS] ) assert.equal(P.drawFace(P.roll("s2", "kindred"), {eyes, mouth}).rgba.length, 64 * 64 * 4);
});

test("the sheet decides the line: Nosferatu by clan, the small lines by type or kind", () => {
  assert.equal(P.lineOf({type: "Vampire", clan: "Nosferatu"}), "nosferatu");
  assert.equal(P.lineOf({type: "Vampire", clan: "Toreador"}), "kindred");
  assert.equal(P.lineOf({type: "Vampire", variant: "kuei-jin"}), "kuei-jin");
  assert.equal(P.lineOf({type: "Werewolf"}), "werewolf");
  assert.equal(P.lineOf({type: "Mortal", kind: "hunter"}), "hunter");
  assert.equal(P.lineOf({type: "Mortal"}), "mortal");
  assert.equal(P.lineOf({}), "mortal");
});

test("blinking, speaking and reacting change only the eyes, brows and mouth", () => {
  for ( const line of LINES ) {
    const S = P.roll("anim", line), base = P.drawFace(S).rgba;
    for ( const opts of [{eyes: "half"}, {eyes: "shut"}, {mouth: "talk1"}, {mouth: "talk2"}, {mouth: "talk3"}, {expr: "smile"}, {expr: "smirk"}, {expr: "anger"}, {expr: "fear"}, {expr: "sorrow"}] ) {
      const changed = diff(base, P.drawFace(S, opts).rgba);
      // eyes and brows sit in rows 24 to 35, the mouth in rows 42 to 50, between columns 18 and 46; a mage's light and a demon's glow ride on the eyes
      const out = changed.filter(([x, y]) => !(x >= 16 && x <= 48 && ((y >= 24 && y <= 36) || (y >= 41 && y <= 51))));
      assert.equal(out.length, 0, `${line} ${JSON.stringify(opts)} changed ${JSON.stringify(out.slice(0, 5))}`);
    }
  }
});

test("Kindred fangs are off by default and show only when turned on", () => {
  const plain = P.roll("vamp", "kindred"), fanged = P.roll("vamp", "kindred", {fangs: true});
  assert.equal(plain.fangs, false);
  for ( const opts of [{}, {mouth: "talk2"}, {mouth: "talk3"}, {expr: "anger"}] )
    assert.equal(diff(P.drawFace(plain, opts).rgba, P.drawFace(fanged, opts).rgba).length > 0, true, `fangs show with ${JSON.stringify(opts)} when on`);
  // a mortal given the same switch shows nothing
  assert.equal(diff(P.drawFace(P.roll("m", "mortal"), {mouth: "talk3"}).rgba, P.drawFace(P.roll("m", "mortal", {fangs: true}), {mouth: "talk3"}).rgba).length, 0);
});

test("a beard never covers an open mouth", () => {
  let checked = 0;
  for ( let i = 0; i < 60 && checked < 6; i++ ) {
    const S = P.roll(`b${i}`, "mortal", {sex: "man"});
    if ( S.beard !== "full" ) continue;
    checked++;
    for ( const mouth of P.TALK_MOUTHS ) {
      const shut = P.drawFace(S).rgba, open = P.drawFace(S, {mouth}).rgba;
      assert.ok(diff(shut, open).some(([x, y]) => y >= 45 && y <= 47 && Math.abs(x - 32) <= 1), `the mouth opens through the beard (${S.seed}, ${mouth})`);
      const [r, g, b] = px(open, 32, 45 + (mouth === "talk1" ? 0 : 1));
      assert.ok(r < 80 && g < 40 && b < 50, `the open mouth is dark inside (${S.seed}, ${mouth})`);
    }
  }
  assert.ok(checked >= 3, "found bearded faces to check");
});

test("a woman's face has no facial hair; a man's may", () => {
  for ( let i = 0; i < 40; i++ ) assert.equal(P.roll(`w${i}`, "mortal", {sex: "woman"}).beard, "");
  assert.ok(Array.from({length: 40}, (_, i) => P.roll(`m${i}`, "mortal", {sex: "man"}).beard).some(Boolean));
});

test("the health track: more blood with each level, and Incapacitated shuts the eyes and slackens the jaw", () => {
  const S = P.roll("hurt", "hunter");
  const blood = lv => { const f = P.drawFace(S, {level: lv}).rgba; let n = 0; for ( let y = 0; y < 64; y++ ) for ( let x = 0; x < 64; x++ ) if ( isBlood(px(f, x, y)) ) n++; return n; };
  let last = -1;
  for ( let lv = 0; lv <= 7; lv++ ) { const n = blood(lv); assert.ok(n >= last, `level ${lv} keeps the wounds before it`); last = n; }
  assert.equal(blood(0), 0, "no blood on a hale face");
  const f = P.drawFace(S, {level: 7, mouth: "talk2", expr: "smile"});
  assert.equal(f.shut, true); assert.equal(f.expr, "slack"); assert.equal(f.eyes, "shut"); assert.equal(f.mouth, null);
});

test("a changeling's mien and a hunter's sigil show only to those who may see them", () => {
  for ( const [line, key] of [["changeling", "fae"], ["hunter", "sigil"]] ) {
    let found = false;
    for ( let i = 0; i < 12 && !found; i++ ) {
      const S = P.roll(`h${i}`, line, {kith: line === "changeling" ? "satyr" : ""});
      const seen = P.drawFace(S, {sees: {fae: true, sigil: true}}).rgba, hidden = P.drawFace(S, {sees: {fae: key !== "fae", sigil: key !== "sigil"}}).rgba;
      if ( diff(seen, hidden).length > 10 ) found = true;
    }
    assert.ok(found, `${line} marks are hidden from those who cannot see them`);
  }
  assert.equal(P.roll("x", "changeling", {kith: "satyr"}).horns, true);
  assert.equal(P.roll("x", "changeling", {kith: "pooka"}).horns, false);
});

test("speaking: the mouth opens on letters, closes at commas and full stops, and the whole line is shown by the end", () => {
  const st = P.speechSteps("Well. Sit down, then.");
  assert.ok(st.some(s => s.mouth));
  assert.ok(st.filter(s => s.mouth === null).length >= 3, "rests at each stop and comma and at the end");
  assert.equal(st.at(-1).shown, "Well. Sit down, then.".length);
  assert.equal(st.at(-1).mouth, null, "the mouth ends shut");
  for ( let i = 1; i < st.length; i++ ) assert.ok(st[i].shown >= st[i - 1].shown);
  assert.equal(P.mouthFor("a"), "talk2"); assert.equal(P.mouthFor("e"), "talk3"); assert.equal(P.mouthFor("m"), "talk1"); assert.equal(P.mouthFor(" "), null);
  assert.deepEqual(P.speechSteps(""), [{mouth: null, ms: 270, shown: 0}]);
  for ( let i = 0; i < 50; i++ ) { const n = P.nextBlink(); assert.ok(n >= 2000 && n < 6000); }
});

test("reactions: a sway first, then frenzy, mood, attitude, and pain at rest", () => {
  assert.equal(P.reactionFor({sway: "charmed", step: -3}).expr, "smile");
  assert.equal(P.reactionFor({sway: "intimidated"}).expr, "fear");
  assert.equal(P.reactionFor({sway: "bribed"}).expr, "smirk");
  assert.equal(P.reactionFor({frenzy: true, step: 3}).expr, "anger");
  assert.equal(P.reactionFor({mood: "angry", step: 3}).expr, "anger");
  assert.equal(P.reactionFor({mood: "afraid"}).expr, "fear");
  assert.equal(P.reactionFor({step: -2}).expr, "anger");
  assert.equal(P.reactionFor({step: -1}).expr, "smirk");
  assert.equal(P.reactionFor({step: 2}).expr, "smile");
  assert.deepEqual(P.reactionFor({}), {expr: "neutral", rest: "neutral"});
  assert.equal(P.reactionFor({level: 4}).rest, "sorrow");
  assert.equal(P.reactionFor({level: 7, sway: "charmed"}).expr, "slack");
  for ( const e of [P.reactionFor({sway: "fooled"}).expr, P.reactionFor({mood: "wary"}).expr] ) assert.ok(P.EXPRESSIONS.includes(e));
});
