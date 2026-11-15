import test from "node:test";
import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MR = await import(join(root, "modules/wodx-paperdoll/scripts/mount-rules.mjs"));
const IR = await import(join(root, "modules/wodx-interactables/scripts/interact-rules.mjs"));
const folder = join(root, MR.FOLDER);
const manifest = JSON.parse(readFileSync(join(folder, "mounts.json"), "utf8"));
MR.learn(manifest);

/* width and height of a PNG, from its header */
const size = file => { const b = readFileSync(file); return {w: b.readUInt32BE(16), h: b.readUInt32BE(20)}; };

test("every kind of mount the game knows has drawn looks (B4970)", () => {
  for ( const kind of Object.keys(IR.MOUNTS) ) assert.ok(MR.looksOf(kind).length >= 3, `${kind} has looks`);
  for ( const kind of ["bicycle", "motorbike", "camel", "ghoulhorse", "szlachta", "chimera", "stygian", "gryphon"] ) assert.ok(MR.looksOf(kind).length >= 3, kind);
});

test("every look has its sheet, of its frames by four facings, and every kind a still picture", () => {
  for ( const kind of MR.kinds() ) {
    assert.ok(existsSync(join(root, MR.stillPath(kind))), `${kind} still`);
    for ( const look of MR.looksOf(kind) ) {
      const file = join(root, MR.sheetPath(kind, look));
      assert.ok(existsSync(file), `${kind}/${look.id}`);
      assert.deepEqual(size(file), {w: look.w * MR.kindOf(kind).frames, h: look.h * 4}, `${kind}/${look.id} size`);
      assert.ok(look.ground > look.h / 2 && look.ground <= look.h, `${kind}/${look.id} ground line`);
      assert.ok(MR.schemesOf(look).length >= 1, `${kind}/${look.id} colours`);
    }
  }
});

test("a mount is drawn no wider than eight squares and to the people's scale", () => {
  for ( const kind of MR.kinds() ) for ( const look of MR.looksOf(kind) ) assert.ok(look.w <= 8 * 56 && look.h <= 8 * 56, `${kind}/${look.id}`);
  assert.equal(MR.pixel(112), 2);
});

test("the look follows the year: the latest era not after it, the oldest before them all", () => {
  assert.deepEqual(MR.erasOf("car"), [1900, 1920, 1940, 1960, 1990, 2040]);
  assert.equal(MR.lookFor("car", 1925, {seed: "a"}).from, 1920);
  assert.equal(MR.lookFor("car", 1959, {seed: "a"}).from, 1940);
  assert.equal(MR.lookFor("car", 2090, {seed: "a"}).from, 2040);
  assert.equal(MR.lookFor("car", 1850, {seed: "a"}).from, 1900);
  assert.equal(MR.lookFor("horse", 1197, {seed: "a"}).from, 0);
  assert.equal(MR.lookFor("horse", 1888, {seed: "a"}).from, 1800);
  assert.equal(MR.lookFor("nothing", 1900), null);
});

test("the same thing keeps its look; different things vary in shape and colour", () => {
  const a = MR.lookFor("car", 1965, {seed: "tile-a"});
  assert.equal(MR.lookFor("car", 1965, {seed: "tile-a"}).id, a.id);
  const shapes = new Set(), paints = new Set();
  for ( let i = 0; i < 60; i++ ) { const l = MR.lookFor("car", 1965, {seed: `t${i}`}); shapes.add(l.id); paints.add(MR.schemeFor(l, {seed: `t${i}`}).id); }
  assert.equal(shapes.size, 3);
  assert.ok(paints.size >= 5);
});

test("a picked shape wins over the year, and a picked style is kept as the years pass", () => {
  assert.equal(MR.lookFor("car", 1990, {look: "1900-runabout"}).id, "1900-runabout");
  assert.equal(MR.lookFor("car", 1945, {style: "sedan", seed: "x"}).id, "1940-sedan");
  assert.equal(MR.lookFor("car", 1995, {style: "sedan", seed: "x"}).id, "1990-sedan");
  // a style the era has not: the nearest earlier era that has it
  assert.equal(MR.lookFor("car", 1930, {style: "runabout", seed: "x"}).id, "1900-runabout");
});

test("colours: a picked scheme, the sheet's paint by name or by nearness, else by chance", () => {
  const look = MR.lookFor("car", 1995, {style: "sedan"});
  assert.equal(MR.schemeFor(look, {scheme: "red"}).id, "red");
  assert.equal(MR.schemeFor(look, {colour: "silver"}).id, "silver");
  assert.equal(MR.schemeFor(look, {colour: "navy"}).id, "blue");
  assert.equal(MR.schemeFor(look, {colour: "maroon"}).id, "red");
  assert.ok(MR.schemeFor(look, {seed: "q"}));
});

test("a scheme replaces the three key ramps and leaves the rest of the picture alone", () => {
  const K = MR.keys(), s = MR.schemeFor(MR.lookFor("car", 1995, {style: "sedan"}), {scheme: "red"});
  const px = new Uint8ClampedArray([...K.a[2], 255, ...K.b[4], 255, ...K.c[0], 255, 10, 20, 30, 255, ...K.a[2], 0]);
  assert.equal(MR.recolour(px, s), 3);
  assert.deepEqual([...px.slice(0, 3)], s.a[2]);
  assert.deepEqual([...px.slice(4, 7)], s.b[4]);
  assert.deepEqual([...px.slice(8, 11)], s.c[0]);
  assert.deepEqual([...px.slice(12, 15)], [10, 20, 30]);
  assert.deepEqual([...px.slice(16, 19)], K.a[2]);
});

test("wheels turn as the thing moves and stand still when it does", () => {
  assert.equal(MR.colOf("car", {moving: false, dist: 500}, 100), 0);
  assert.equal(MR.colOf("car", {moving: true, dist: 0}, 100), 0);
  assert.equal(MR.colOf("car", {moving: true, dist: 30}, 100), 1);
  assert.equal(MR.colOf("horse", {moving: true, dist: 50}, 100), 4);
  assert.deepEqual(MR.rectOf({w: 224, h: 112}, "down", 1), {x: 224, y: 224, width: 224, height: 112});
});

test("every look seats at least the riders its kind carries, for every facing, inside its frame", () => {
  for ( const kind of MR.kinds() ) for ( const look of MR.looksOf(kind) ) for ( const f of MR.ROWS ) {
    const seats = look.seats[f];
    assert.ok(seats.length >= 1, `${kind}/${look.id} ${f}`);
    seats.forEach((_, i) => { const s = MR.seatOf(look, f, i); assert.ok(s.x >= 0 && s.x <= look.w && s.cut >= 0 && s.cut <= 112, `${kind}/${look.id} ${f} seat ${i}`); });
    // the one at the reins is seen from the side
    if ( ["left", "right"].includes(f) ) assert.ok(MR.seatOf(look, f, 0).cut > 0, `${kind}/${look.id} ${f} driver shows`);
  }
});

test("a rider is drawn in the seat: saddle riders whole and folded, those inside a car only head and shoulders", () => {
  const horse = MR.lookFor("horse", 1888, {style: "riding"}), car = MR.lookFor("car", 1995, {style: "sedan"});
  const hs = MR.seatOf(horse, "right", 0), cs = MR.seatOf(car, "right", 0);
  assert.equal(hs.pose, "ride");
  assert.equal(cs.pose, "sit");
  assert.ok(cs.cut < 80 && cs.cut > 40);
  const ground = {x: 1000, y: 1000}, k = 2, p = MR.seatPoint(car, cs, ground, k), d = MR.riderDraw(cs, p, k);
  assert.equal(p.x, 1000 + (cs.x - car.w / 2) * 2);
  assert.equal(d.rows, cs.cut);
  assert.equal(d.height, cs.cut * 2);
  // the rows shown keep their place: the frame's anchor row stays where a whole frame would have it
  assert.ok(Math.abs(d.anchorY * d.rows - MR.RIDER.anchorY * MR.RIDER.h) < 1e-9);
  // more riders than seats: out of sight inside
  assert.equal(MR.riderDraw(MR.seatOf(car, "right", 40), p, k).hidden, true);
});

test("the Future Darkness looks join the row before them from 2023 and never show on the main timeline (B4976)", () => {
  assert.ok(!MR.erasOf("helicopter").includes(2023));
  const at = year => { const ids = new Set(); for ( let i = 0; i < 200; i++ ) ids.add(MR.lookFor("helicopter", year, {seed: `h${i}`}).id); return ids; };
  const classic = at(2022), future = at(2030), late = at(2045);
  assert.ok(![...classic].some(id => id.startsWith("2023")));
  assert.ok(future.has("2023-flyingcar") && future.has("2023-tiltrotor") && future.has("2000-executive"));
  assert.ok(![...late].some(id => id.startsWith("2023")) && late.has("2040-quad"));
  for ( const [kind, id] of [["motorbike", "2023-hoverbike"], ["armoured", "2023-hovercraft"], ["car", "2023-armedcab"], ["balloon", "2023-liner"], ["tank", "2023-capsule"]] )
    assert.ok(MR.looksOf(kind).some(l => l.id === id && l.adds), id);
});

test("a vehicle sheet's style narrows the shapes of its year, and worn takes rusted paint (B4977)", () => {
  for ( let i = 0; i < 40; i++ ) {
    assert.equal(MR.lookFor("car", 1995, {finish: "rugged", seed: `c${i}`}).id, "1990-fourbyfour");
    assert.equal(MR.lookFor("car", 1925, {finish: "sporting", seed: `c${i}`}).id, "1920-roadster");
    assert.equal(MR.lookFor("truck", 1950, {finish: "working", seed: `t${i}`}).from, 1940);
    // nothing of the year suits: the year's own shapes stand
    assert.equal(MR.lookFor("tank", 1944, {finish: "taxi", seed: `k${i}`}).id, MR.lookFor("tank", 1944, {seed: `k${i}`}).id);
  }
  // a picked shape still wins
  assert.equal(MR.lookFor("car", 1995, {finish: "rugged", style: "hatch"}).id, "1990-hatch");
  // every shape named is one that is drawn
  const drawn = new Set(MR.kinds().flatMap(k => MR.looksOf(k).map(l => l.style)));
  for ( const [f, list] of Object.entries(MR.FINISH) ) for ( const s of list ) assert.ok(drawn.has(s), `${f}: ${s}`);
  const car = MR.lookFor("car", 1995, {style: "sedan"});
  assert.equal(MR.schemeFor(car, {finish: "worn", seed: "x"}).id, "rust");
  assert.equal(MR.schemeFor(car, {finish: "worn", colour: "red", seed: "x"}).id, "red");
});
