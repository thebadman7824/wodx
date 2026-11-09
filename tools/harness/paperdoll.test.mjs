import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {createRequire} from "node:module";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* WoDX Paperdoll: looks, the health track and moods, fitting garments to every head, the ring */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const D = await imp("modules/wodx-paperdoll/scripts/doll-rules.mjs");
const F = await imp("modules/wodx-paperdoll/scripts/fit-rules.mjs");
const V = await imp("modules/wodx-paperdoll/vendor/dicebear-lorelei.mjs");
let Resvg = null;
try { ({Resvg} = createRequire(import.meta.url)("@resvg/resvg-js")); } catch (e) { /* the fitting tests skip */ }
const pixels = svg => { const r = new Resvg(svg, {fitTo: {mode: "width", value: F.SIZE}}).render(); return {width: r.width, height: r.height, data: r.pixels}; };
const av = o => V.createAvatar(V.lorelei, o).toString();
const measureLook = look => F.measure(pixels(D.keySvg(look, av(D.loreleiOptions(look, "own", {key: true})))), D.buildOf(look));
const headOf = (look, mood = "own") => D.headLayers({look, head: D.innerSvg(av(D.loreleiOptions(look, mood))), mask: D.innerSvg(av(D.loreleiOptions(look, mood, {mask: true})))});
const veiled = (over = {}) => D.normalize({...D.defaultLook("Ada Brandt"), clothes: {...D.defaultLook().clothes, headwear: "fillet"}, ...over});

test("the face parts match Lorelei's own lists", () => {
  const p = V.lorelei.schema.properties;
  for ( const k of ["head", "eyes", "eyebrows", "nose", "mouth", "hair", "beard", "glasses", "earrings"] )
    assert.deepEqual(D.PARTS[k].filter(v => k !== "beard" ? v : /^variant/.test(v)).slice().sort(), p[k].items.enum.slice().sort(), k);
  for ( const m of Object.values(D.MOODS) ) {
    if ( m.eyebrows ) assert.ok(D.PARTS.eyebrows.includes(m.eyebrows));
    if ( m.mouth ) assert.ok(D.PARTS.mouth.includes(m.mouth));
    if ( m.eyes ) assert.ok(D.PARTS.eyes.includes(m.eyes));
  }
});

test("a look: bad values fall back, steps wrap, random looks repeat by seed", () => {
  const l = D.normalize({face: {eyes: "variant99", hair: "variant10", beard: "nope"}, colors: {skin: "<script>"}, clothes: {headwear: "crown", gown: "9c3b30"}, mood: "smug"});
  assert.equal(l.face.eyes, "variant05");
  assert.equal(l.face.hair, "variant10");
  assert.equal(l.face.beard, "");
  assert.equal(l.colors.skin, "f0d6bf");
  assert.equal(l.clothes.headwear, "none");
  assert.equal(l.clothes.gown, "9c3b30");
  assert.equal(l.mood, "own");
  assert.equal(D.step(l, "head", -1).face.head, "variant04");
  assert.equal(D.step(D.step(l, "beard", 1), "beard", 1).face.beard, "variant02");
  assert.equal(D.step(l, "beard", -1).face.beard, D.PARTS.beard.at(-1));
  assert.deepEqual(D.randomLook("Ilse"), D.randomLook("Ilse"));
  assert.notDeepEqual(D.randomLook("Ilse").face, D.randomLook("Wilhelm").face);
});

test("the health track: levels from damage boxes", () => {
  const h = (b, l = 0, a = 0) => ({damage: {bashing: b, lethal: l, aggravated: a}, ...Object.fromEntries(D.LEVELS.map(k => [k, {value: 1, total: 1}]))});
  assert.equal(D.healthLevel(h(0)), 0);
  assert.equal(D.healthLevel(h(1)), 1);
  assert.equal(D.healthLevel(h(1, 1, 1)), 3);
  assert.equal(D.healthLevel(h(9)), 7);
  const twoBruised = {...h(2), bruised: {value: 2, total: 2}};
  assert.equal(D.healthLevel(twoBruised), 1);
  assert.equal(D.healthLevel(undefined), 0);
});

test("moods follow the health track and frenzy, unless turned off", () => {
  const l = D.defaultLook("x");
  assert.equal(D.moodFor(l, {level: 0}), "own");
  assert.equal(D.moodFor(l, {level: 1}), "disgruntled");
  assert.equal(D.moodFor({...l, mood: "grim"}, {level: 2}), "grim");
  assert.equal(D.moodFor(l, {level: 4}), "upset");
  assert.equal(D.moodFor(l, {level: 6}), "grim");
  assert.equal(D.moodFor(l, {level: 7}), "unconscious");
  assert.deepEqual(D.loreleiOptions(l, "unconscious").eyes, ["variant19"]);
  assert.equal(D.moodFor(l, {level: 1, frenzy: true}), "snarling");
  assert.equal(D.moodFor(l, {level: 7, frenzy: true}), "unconscious");
  assert.equal(D.moodFor({...l, followHealth: false}, {level: 5}), "own");
  assert.equal(D.moodFor(l, {level: 5, follow: false}), "own");
  const o = D.loreleiOptions(l, "upset");
  assert.deepEqual([o.eyebrows, o.mouth], [["variant01"], ["sad01"]]);
  const k = D.loreleiOptions(l, "upset", {key: true});
  assert.deepEqual([k.skinColor, k.hairColor, k.mouth], [["00ff00"], ["ff0000"], ["happy05"]]);
});

test("under a veil the head is drawn with close hair, and the fit follows it", () => {
  const l = veiled({face: {...D.defaultLook().face, hair: "variant31"}});
  assert.deepEqual(D.loreleiOptions(l).hair, [D.CLOSE_HAIR]);
  assert.equal(D.fitKey(l), `variant01|${D.CLOSE_HAIR}||`);
  assert.deepEqual(D.loreleiOptions({...l, clothes: {...l.clothes, headwear: "none"}}).hair, ["variant31"]);
});

test("bake keys change with what is drawn, and only with that", () => {
  const l = D.defaultLook("x"), base = {look: l, mood: "own", level: 0, frame: D.DEFAULT_FRAME, ring: true};
  const k = D.bakeKey(base);
  assert.match(k, /^[0-9a-f]{16}$/);
  assert.equal(D.bakeKey({...base, look: {...l, portrait: true}}), k);
  assert.notEqual(D.bakeKey({...base, level: 1}), k);
  assert.notEqual(D.bakeKey({...base, mood: "upset"}), k);
  assert.notEqual(D.bakeKey({...base, ring: false}), k);
  assert.notEqual(D.bakeKey({...base, look: {...l, clothes: {...l.clothes, gown: "9c3b30"}}}), k);
});

test("fitting: the measured head matches the anchors the samples were drawn from", {skip: !Resvg && "@resvg/resvg-js is not installed"}, () => {
  const A = measureLook(veiled());
  assert.equal(A.blobTop, 815);
  assert.deepEqual(A.blob, [278, 658]);
  assert.equal(A.neckMid, 468);
  assert.equal(A.face.length, 24);
  assert.equal(A.headTop.length, 31);
  assert.ok(Math.abs(A.crown - 120) < 2);
  const b = D.filletBox(A);
  assert.ok(b.x0 >= 232 && b.x1 <= 788 && b.x1 - b.x0 > 400 && b.top === A.crown + 30, JSON.stringify(b));
});

test("every face shape, hair and beard is measured, and headwear stays inside the ring", {skip: !Resvg && "@resvg/resvg-js is not installed"}, () => {
  const fails = [], tight = [];
  const hairs = D.PARTS.hair.filter((_, i) => i % 4 === 0).concat(["variant31", "variant21"]);
  const builds = ["", "narrow-short", "wide-long", "narrow-long", "wide-short"];
  let n = 0;
  for ( const head of D.PARTS.head ) for ( const hair of hairs ) for ( const beard of ["", "variant02"] ) for ( const headwear of ["none", "fillet"] ) {
    const build = builds[n++ % builds.length];
    const look = D.normalize({...D.defaultLook("t"), face: {...D.defaultLook().face, head, hair, beard, build}, clothes: {...D.defaultLook().clothes, headwear}});
    const A = measureLook(look);
    if ( !A ) { fails.push(`${head} ${hair} ${beard}`); continue; }
    for ( const frame of [D.DEFAULT_FRAME, {kit: "victorian", shape: "square", color: 0xa07a3a, double: true, width: 0.045}, {kit: "modern", shape: "square", color: 0x9aa3ad, width: 0.045}] ) {
      const c = D.cropFor(A, frame, D.headwear(A, look.clothes).tops);
      if ( c.clearance < 0 ) tight.push(`${head} ${hair} ${build} ${headwear} ${frame.kit}: ${Math.round(c.clearance)}`);
    }
  }
  assert.deepEqual(fails, []);
  assert.deepEqual(tight, []);
});

test("the picture: one SVG with face, marks by level, clothes and ring; nothing carried", {skip: !Resvg && "@resvg/resvg-js is not installed"}, () => {
  const look = veiled();
  const A = measureLook(look);
  const head = headOf(look);
  const at = lvl => D.compose({look, head, anchors: A, level: lvl}).svg;
  assert.ok(!at(0).includes("url(#wpd-bruise)"));
  assert.ok(at(1).includes("url(#wpd-bruise)") && !at(1).includes("url(#wpd-blackeye)"));
  assert.ok(at(3).includes("url(#wpd-blackeye)"));
  assert.ok(at(6).includes("#efe8d8"));
  const noRing = D.compose({look, head, anchors: A, ring: false}).svg;
  assert.ok(at(0).includes('stroke="#4f4943"') && !noRing.includes('stroke="#4f4943"'));
  assert.ok(!/<metadata>/.test(at(0)));
  // it renders, at token size
  const png = new Resvg(at(4), {fitTo: {mode: "width", value: 128}}).render();
  assert.equal(png.width, 128);
});

test("enough choices that two random characters almost never match", () => {
  const seen = new Set(), used = {};
  for ( let i = 0; i < 3000; i++ ) {
    const l = D.randomLook(`npc ${i}`);
    seen.add(JSON.stringify([l.face, l.colors]));
    for ( const k of ["build", "age", "cheeks", "marks", "scar", "beard"] ) (used[k] ??= new Set()).add(l.face[k]);
    assert.ok(D.FACE.SKIN_HUMAN.includes(l.colors.skin), "random looks use human skin tones");
  }
  assert.equal(seen.size, 3000);
  // every choice comes up, except that a random face is never a child
  for ( const k of ["build", "age", "cheeks", "marks", "scar", "beard"] ) assert.equal(used[k].size, D.PARTS[k].length - (k === "age" ? 1 : 0), k);
  assert.ok(!used.age.has("child"));
  for ( const k of D.FACE_ORDER ) { assert.ok(D.PART_LABELS[k], k); assert.ok(D.PARTS[k].length > 1, k); }
  for ( const k of ["build", "age", "cheeks", "marks", "scar", "beard"] ) for ( const v of D.PARTS[k] ) assert.ok(D.PART_NAMES[k][v], `${k} ${v} has a name`);
  // a bad value falls back; an old look without the new parts still reads
  const l = D.normalize({face: {build: "huge", age: 7, scar: "nope"}});
  assert.deepEqual([l.face.build, l.face.age, l.face.scar], ["", "", ""]);
});

test("every new part is drawn on visible skin only, and shows on every face shape and build", {skip: !Resvg && "@resvg/resvg-js is not installed"}, () => {
  const W = 490, at = (p, x, y) => (y * W + x) * 4;
  const render = look => { const r = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 980 980">${headOf(look)}</svg>`, {fitTo: {mode: "width", value: W}}).render(); return r.pixels; };
  const skin = "c99a6e", sk = [0xc9, 0x9a, 0x6e];
  const builds = ["", "narrow-short", "wide-long", "slim", "broad-short"];
  const bad = [], hidden = [];
  let n = 0;
  for ( const k of ["age", "cheeks", "marks", "scar", "beard"] ) for ( const v of D.PARTS[k] ) {
    if ( !v || /^variant/.test(v) ) continue;
    const head = D.PARTS.head[n % 4], build = builds[n++ % builds.length];
    const base = D.normalize({...D.defaultLook("t"), face: {...D.defaultLook().face, head, build, hair: "variant02"}, colors: {skin, hair: "3b2a20"}});
    const a = render(base), b = render({...base, face: {...base.face, [k]: v}});
    // skin pixels of the plain face, grown by 3 pixels for soft edges
    const onSkin = new Uint8Array(W * W);
    for ( let y = 0; y < W; y++ ) for ( let x = 0; x < W; x++ ) { const i = at(a, x, y); if ( Math.abs(a[i] - sk[0]) + Math.abs(a[i + 1] - sk[1]) + Math.abs(a[i + 2] - sk[2]) < 12 ) onSkin[y * W + x] = 1; }
    const near = (x, y) => { for ( let dy = -3; dy <= 3; dy++ ) for ( let dx = -3; dx <= 3; dx++ ) if ( onSkin[(y + dy) * W + x + dx] ) return true; return false; };
    let changed = 0, off = 0;
    for ( let y = 3; y < W - 3; y++ ) for ( let x = 3; x < W - 3; x++ ) {
      const i = at(a, x, y), d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) + Math.abs(a[i + 3] - b[i + 3]);
      if ( d < 12 ) continue;
      changed++;
      if ( !near(x, y) ) off++;
    }
    if ( off > 4 ) bad.push(`${k} ${v} on ${head} ${build || "average"}: ${off} pixels off the skin`);
    if ( changed < 20 ) hidden.push(`${k} ${v} on ${head} ${build || "average"}: ${changed} pixels`);
  }
  assert.deepEqual(bad, []);
  assert.deepEqual(hidden, []);
});
