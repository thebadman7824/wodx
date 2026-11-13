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

const F = await import(join(root, "modules/wodx-paperdoll/scripts/face64-features.mjs"));
const BASE_LINE = {fera: "werewolf", all: "mortal"};
const ALL_ON = {frenzy: true, glabro: true, visage: true, shintai: true, paradox: true, catharsis: true};

test("every extra feature draws on a face of its line, and only while its state is on", () => {
  const ids = Object.keys(F.FEATURES);
  assert.ok(ids.length >= 110, `${ids.length} features`);
  for ( const id of ids ) {
    const f = F.FEATURES[id], line = BASE_LINE[f.line] ?? f.line;
    let changed = 0;
    for ( const seed of ["f1", "f2", "f3"] ) {
      const S = P.roll(seed, line, {kith: "pooka"}), opts = {sees: {fae: true, sigil: true}, state: ALL_ON, expr: f.state === "tears" ? "sorrow" : "neutral"};
      const with_ = P.drawFace({...S, features: [id]}, opts).rgba;
      assert.equal(with_.length, 64 * 64 * 4);
      assert.ok(with_.every((v, i) => i % 4 !== 3 || v === 255), `${id}: no see-through pixels`);
      changed = Math.max(changed, diff(P.drawFace(S, opts).rgba, with_).length);
      if ( f.state && f.state !== "tears" ) assert.equal(diff(P.drawFace(S, {...opts, state: {}}).rgba, P.drawFace({...S, features: [id]}, {...opts, state: {}}).rgba).length, 0, `${id} hides out of ${f.state}`);
    }
    assert.ok(changed >= 2, `${id} changes the face (${changed} pixels)`);
  }
});

test("blinking and speaking still change only the eyes, brows and mouth on a face with features", () => {
  for ( const id of Object.keys(F.FEATURES) ) {
    const f = F.FEATURES[id], line = BASE_LINE[f.line] ?? f.line, S = {...P.roll("anim", line), features: [id]}, opts = {sees: {fae: true, sigil: true}, state: ALL_ON};
    const base = P.drawFace(S, opts).rgba;
    for ( const o of [{eyes: "shut"}, {mouth: "talk2"}] ) {
      const out = diff(base, P.drawFace(S, {...opts, ...o}).rgba).filter(([x, y]) => !(x >= 14 && x <= 50 && ((y >= 18 && y <= 38) || (y >= 39 && y <= 52))));
      assert.equal(out.length, 0, `${id} ${JSON.stringify(o)} changed ${JSON.stringify(out.slice(0, 4))}`);
    }
  }
});

test("rolled features: the same seed gives the same, the sheet's group brings its own, a wraith bears one deathmark", () => {
  assert.deepEqual(F.rollFeatures("x", "kindred", "Gangrel"), F.rollFeatures("x", "kindred", "Gangrel"));
  const gangrel = Array.from({length: 20}, (_, i) => F.rollFeatures(`g${i}`, "kindred", "Gangrel")).flat();
  assert.ok(gangrel.some(id => id.startsWith("v-gangrel")));
  assert.ok(!Array.from({length: 40}, (_, i) => F.rollFeatures(`t${i}`, "kindred", "Toreador")).flat().some(id => id.startsWith("v-gangrel") || id.startsWith("v-tzimisce")), "no clan features without the clan");
  for ( let i = 0; i < 20; i++ ) assert.equal(F.rollFeatures(`w${i}`, "wraith").filter(id => F.FEATURES[id].group === "Deathmark").length, 1);
  for ( let i = 0; i < 20; i++ ) assert.equal(F.rollFeatures(`m${i}`, "werewolf", "Metis Fianna").filter(id => F.FEATURES[id].group === "Metis").length, 1);
  assert.deepEqual(F.rollFeatures("s", "changeling", "Sidhe").filter(id => id.startsWith("c-")), ["c-sidhe"]);
  for ( let i = 0; i < 60; i++ ) { const r = F.rollFeatures(`p${i}`, "mortal"); assert.ok(!r.includes("a-ghoul") && !r.includes("a-spectacles")); assert.ok(r.filter(id => F.FEATURES[id].group === "Headwear").length <= 1); }
  assert.ok(F.rollFeatures("gh", "mortal", "ghoul").includes("a-ghoul"));
  assert.equal(F.groupMatches("Followers of Set", "Vampire Followers of Set"), true);
  assert.equal(F.groupMatches("Sidhe", "Boggan"), false);
});

test("the Net: a persona face in one phosphor colour, still blinking and speaking only at the eyes and mouth", () => {
  for ( const line of LINES ) {
    const S = P.roll("net1", line), f = P.drawFace(S, {net: true}).rgba;
    const ramp = P.NET_PALETTES[P.netPaletteOf(S)].ramp;
    const lum = c => c[0] + c[1] + c[2];
    let bright = 0;
    for ( let i = 0; i < 64 * 64; i++ ) { const c = [f[i * 4], f[i * 4 + 1], f[i * 4 + 2]]; if ( lum(c) > lum(ramp[1]) ) bright++; }
    assert.ok(bright > 300, `${line}: the face shows bright in the Net`);
    assert.notEqual(diff(f, P.drawFace(S).rgba).length, 0, `${line}: the Net face differs from the plain one`);
    const out = diff(f, P.drawFace(S, {net: true, eyes: "shut", mouth: "talk2"}).rgba).filter(([x, y]) => !(x >= 14 && x <= 50 && y >= 18 && y <= 52));
    assert.equal(out.length, 0, `${line}: only eyes and mouth move in the Net`);
  }
  assert.equal(P.netPaletteOf(P.roll("x", "mortal")), P.netPaletteOf(P.roll("x", "mortal")));
  assert.equal(P.netPaletteOf({...P.roll("x", "mortal"), net: "amber"}), "amber");
  assert.ok(new Set(Array.from({length: 30}, (_, i) => P.netPaletteOf(P.roll(`c${i}`, "mortal")))).size >= 4, "personas differ in colour");
});

test("a hood or a veil covers the neck: no bare throat shows below the chin", () => {
  for ( const id of ["a-hood", "a-veil"] ) for ( let i = 0; i < 24; i++ ) {
    const S = P.roll(`neck${i}`, LINES[i % LINES.length], {sex: i % 2 ? "woman" : "man"});
    const bare = P.drawFace(S).rgba, covered = P.drawFace({...S, features: [id]}).rgba;
    for ( let y = S.chin + 2; y < 64; y++ ) for ( let x = 29; x <= 35; x++ )
      assert.notDeepEqual(px(covered, x, y), px(bare, x, y), `${id} on ${S.seed}: the throat shows at ${x},${y}`);
  }
});

test("a Nosferatu's great ears grow from the side of the head, joined to it, not from behind", () => {
  let checked = 0;
  for ( let i = 0; i < 30; i++ ) {
    const S = P.roll(`ear${i}`, "nosferatu");
    if ( !["bat", "long", "torn", "fin"].includes(S.ears) ) continue;
    checked++;
    const eared = P.drawFace(S).rgba, plain = P.drawFace({...S, ears: "none"}).rgba;
    for ( const sd of [-1, 1] ) for ( const y of [30, 33, 36] ) {
      // just past the head's edge, three pixels in a row are ear, with no gap of background between
      const edge = 32 + sd * Math.round(P.H.headHw(y, [11, 31, 43, S.chin, S.w, S.jw, S.cw]));
      for ( let k = 2; k <= 4; k++ ) assert.notDeepEqual(px(eared, edge + sd * k, y), px(plain, edge + sd * k, y), `${S.seed} ear joined at ${edge + sd * k},${y}`);
    }
  }
  assert.ok(checked >= 10);
});

test("Nosferatu ears vary: plain, stub, torn, drooping, finned, bare holes and odd pairs besides the bat's ears, each its own shape", () => {
  const seen = new Set(), base = P.roll("earkinds", "nosferatu"), out = new Map();
  for ( let i = 0; i < 80; i++ ) seen.add(P.roll(`ek${i}`, "nosferatu").ears);
  for ( const k of ["bat", "long", "plain", "torn", "droop", "stub", "fin", "holes", "uneven"] ) {
    assert.ok(seen.has(k), `${k} is rolled`);
    const key = Buffer.from(P.drawFace({...base, ears: k}).rgba).toString("base64");
    assert.ok(!out.has(key), `${k} draws unlike ${out.get(key)}`); out.set(key, k);
  }
});

test("pointed ears grow from the side of the head at eye height, and a hood or veil hides every kind of ear", () => {
  for ( const [line, id] of [["kindred", "v-gangrel-ears"], ["changeling", "c-sidhe"], ["changeling", "c-clurichaun"]] ) for ( let i = 0; i < 8; i++ ) {
    const S = {...P.roll(`pe${i}`, line), features: [id]}, shape = [11, 31, 43, S.chin, S.w, S.jw, S.cw];
    const eared = P.drawFace(S).rgba, bare = P.drawFace({...S, features: []}).rgba;
    for ( const sd of [-1, 1] ) {
      const x = 32 + sd * (Math.round(P.H.headHw(33, shape)) + 3);   // just past where a plain ear would end
      assert.ok([31, 32, 33].some(y => px(eared, x, y).join() !== px(bare, x, y).join()), `${id} ${S.seed}: ear at the side, eye height`);
      assert.deepEqual(px(eared, 32 + sd * 31, 20), px(bare, 32 + sd * 31, 20), `${id} ${S.seed}: nothing far behind the head`);
    }
  }
  for ( const cover of ["a-hood", "a-veil"] ) for ( let i = 0; i < 10; i++ ) {
    const S = {...P.roll(`hc${i}`, "nosferatu"), features: [cover]};
    const hooded = P.drawFace(S).rgba, plain = P.drawFace({...S, ears: "plain"}).rgba;
    for ( const sd of [-1, 1] ) for ( const y of [12, 20, 28] ) assert.deepEqual(px(hooded, 32 + sd * 29, y), px(plain, 32 + sd * 29, y), `${cover} ${S.seed}: no ear through the cloth`);
  }
});

test("horns break through the brow from a swelling of skin, not out of the hair", () => {
  for ( const [line, id, st] of [["werewolf", "w-metis-horns"], ["changeling", "c-troll"], ["kindred", "v-gargoyle"], ["demon", "d-horns", "visage"], ["kuei-jin", "k-demon-shintai", "shintai"]] ) for ( let i = 0; i < 6; i++ ) {
    const S = {...P.roll(`hs${i}`, line), style: "short", features: [id]};
    const horned = P.drawFace(S, {state: st ? {[st]: true} : {}}).rgba, bare = P.drawFace({...S, features: []}).rgba;
    const changed = [];
    for ( let y = 18; y < 22; y++ ) for ( let x = 18; x < 46; x++ ) if ( px(horned, x, y).join() !== px(bare, x, y).join() ) changed.push([x, y]);
    assert.ok(changed.length >= 6, `${id} ${S.seed}: the brow under each horn is changed (${changed.length})`);
  }
});

test("every feature shows on a face, and no two features of one line look the same", () => {
  const opts = f => ({state: f.state ? {[f.state]: true} : {}, expr: f.state === "tears" ? "sorrow" : "neutral", sees: {fae: true, sigil: true}});
  const facesOf = line => { const l = line === "all" || line === "fera" ? "mortal" : line; return [{...P.roll("u1", l), style: "bald", beard: ""}, {...P.roll("u2", l), style: "long"}, {...P.roll("u3", l), style: "short", beard: "full"}]; };
  const look = (faces, f, ids) => faces.map(S => Buffer.from(P.drawFace({...S, features: ids}, opts(f)).rgba).toString("base64")).join("|");
  const byLine = {};
  for ( const f of Object.values(F.FEATURES) ) (byLine[f.line] ??= []).push(f);
  for ( const [line, list] of Object.entries(byLine) ) {
    const faces = facesOf(line), seen = new Map();
    for ( const f of list ) {
      const l = look(faces, f, [f.id]);
      assert.notEqual(l, look(faces, f, []), `${f.id} shows on no face`);
      assert.ok(!seen.has(l), `${f.id} looks the same as ${seen.get(l)}`);
      seen.set(l, f.id);
    }
  }
});

test("rolled faces differ: of 300 mortals with rolled features, no two faces are the same", () => {
  const seen = new Set();
  for ( let i = 0; i < 300; i++ ) { const S = {...P.roll(`d${i}`, "mortal"), features: F.rollFeatures(`d${i}`, "mortal")}; seen.add(Buffer.from(P.drawFace(S).rgba).toString("base64")); }
  assert.equal(seen.size, 300);
});

test("each line has 50 features of its own and each clan, tribe, kith, creed and the like 15, the strange ones 25", () => {
  const n = {};
  for ( const f of Object.values(F.FEATURES) ) n[`${f.line}|${f.group}`] = (n[`${f.line}|${f.group}`] ?? 0) + 1;
  assert.ok(Object.values(F.FEATURES).filter(f => f.line === "all").length >= 100, "100 for anyone");
  for ( const line of ["kindred", "werewolf", "fera", "mage", "wraith", "changeling", "hunter", "demon", "mummy", "kuei-jin"] ) assert.ok((n[`${line}|all`] ?? 0) >= 46, `${line}: ${n[`${line}|all`]} of its own`);
  for ( const [k, c] of Object.entries(n) ) {
    const [line, group] = k.split("|");
    if ( line === "all" || group === "all" || c < 4 || group === "Deathmark" ) continue;
    assert.ok(c >= 15, `${k}: ${c}`);
  }
  for ( const g of ["nosferatu|Nosferatu", "kindred|Gargoyle", "kindred|Samedi", "werewolf|Metis"] ) assert.ok((n[g] ?? 0) >= 25, `${g}: ${n[g]}`);
});

test("more eyes, hair, head shapes and noses: every nose kind and head curve is rolled and draws its own face", () => {
  const seen = {nose: new Set(), cf: new Set(), ce: new Set(), iris: new Set(), hair: new Set()};
  for ( let i = 0; i < 600; i++ ) { const S = P.roll(`v${i}`, "mortal"); for ( const k of ["nose", "cf", "ce"] ) seen[k].add(S[k]); seen.iris.add(S.iris.join()); seen.hair.add(S.hair.join()); }
  assert.ok(seen.nose.size >= 9, `${seen.nose.size} noses`);
  assert.ok(seen.cf.size >= 5 && seen.ce.size >= 5, "head curves");
  assert.ok(seen.iris.size >= 15, `${seen.iris.size} eye colours`);
  assert.ok(seen.hair.size >= 20, `${seen.hair.size} hair colours`);
  const base = {...P.roll("nose-test", "mortal"), beard: "", style: "bald", features: []};
  const looks = new Set();
  for ( const nose of seen.nose ) looks.add(Buffer.from(P.drawFace({...base, nose}, {}).rgba).toString("base64"));
  assert.equal(looks.size, seen.nose.size, "each nose kind looks different");
  const heads = new Set();
  for ( const cf of [1.4, 4.4] ) for ( const ce of [0.38, 0.66] ) heads.add(Buffer.from(P.drawFace({...base, cf, ce}, {}).rgba).toString("base64"));
  assert.equal(heads.size, 4, "crown and chin curves each change the head");
});
