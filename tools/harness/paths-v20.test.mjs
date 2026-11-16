// B6724: the V20 Paths of Enlightenment on the system sheet are read as Paths (Virtues, hierarchy of sins, event sins).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const K = await import("../../modules/wodx-actions/scripts/kindred-rules.js");
const PATHS = JSON.parse(read("modules/wodx-actions/data/paths-v20.json"));
const ROADS = JSON.parse(read("modules/wodx-actions/data/roads-daw.json"));
const BIO = read("system/worldofdarkness/assets/data/sheet/bio.js");

test("B6724: every Path the system sheet offers (but Humanity) has ten sins, two Virtues and a page", () => {
  const keys = [...BIO.matchAll(/"(\w+)": "wod\.advantages\.path\.\w+"/g)].map(m => m[1]).filter(k => k !== "humanity");
  assert.equal(keys.length, 12);
  for (const k of keys) {
    const p = PATHS.paths[k];
    assert.ok(p, k);
    assert.equal(p.sins.length, 10, k);
    assert.equal(p.virtues.length, 2, k);
    assert.ok(p.virtues.every(v => v in PATHS.virtueLabels), k);
    assert.ok(p.hp >= 317 && p.hp <= 340, k);
    assert.ok(`v20-${k}` in K.SIN_EVENTS, k);
  }
});

test("B6724: the sheet's choice finds the Path; Humanity and Dark Ages Roads stay with the Roads data", () => {
  const f = K.v20PathFor(PATHS, "wod.advantages.path.caine");
  assert.equal(f.key, "v20-caine");
  assert.equal(f.road.name, "Path of Caine");
  assert.equal(f.road.book, "V20");
  assert.equal(K.v20PathFor(PATHS, "wod.advantages.path.humanity"), null);
  assert.equal(K.v20PathFor(PATHS, "custom", "Path of Night").key, "v20-night");
  assert.equal(K.v20PathFor(PATHS, "custom", "Road of Kings"), null);
  assert.equal(K.v20PathFor(PATHS, "custom", "Path of Chivalry"), null);
  // The old fuzzy match read "Path of Blood" as the Road of Yasa (nickname Bloodbrothers)
  assert.equal(K.roadFor(ROADS, "Path of Blood").key, "yasa");
  assert.equal(K.v20PathFor(PATHS, "wod.advantages.path.blood").key, "v20-blood");
});

test("B6724: the Path decides Conviction and Instinct", () => {
  const v = k => K.roadVirtues(K.v20PathFor(PATHS, `wod.advantages.path.${k}`));
  assert.deepEqual(v("caine"), { conviction: true, instinct: true });
  assert.deepEqual(v("blood"), { conviction: true, instinct: false });
  assert.deepEqual(v("accord"), { conviction: false, instinct: false });
  assert.deepEqual(v("feralheart"), { conviction: true, instinct: true });
});

test("B6724: event sins follow each Path's hierarchy", () => {
  const s = (k, e) => K.sinForEvent(K.v20PathFor(PATHS, `wod.advantages.path.${k}`), e);
  assert.equal(s("blood", "killFeed"), 10);
  assert.equal(s("blood", "kill"), null);
  assert.equal(s("blood", "frenzy"), 6);
  assert.equal(s("bones", "killFeed"), 8);
  assert.equal(s("caine", "notRidden"), 6);
  assert.equal(s("caine", "diablerie"), null);
  assert.equal(s("lilith", "killFeed"), 4);   // no killFeed row: a killing counts
  assert.equal(s("feralheart", "killFeed"), null);
  assert.equal(s("night", "killFeed"), 10);
  assert.equal(s("night", "kill"), 4);
  assert.equal(s("paradox", "kill"), 5);
  assert.equal(s("metamorphosis", "notRidden"), 5);
  assert.equal(s("innervoice", "kill"), null);
  assert.equal(K.sinAt(PATHS.paths.night.sins, 10), PATHS.paths.night.sins[0]);
  // Humanity and the Dark Ages Roads keep their rows; a feeding kill counts as a kill there
  assert.equal(K.sinForEvent(K.roadFor(ROADS, "Humanity"), "killFeed"), 3);
});

test("B6724: roadOf reads the V20 Path first, and a vessel drained while feeding is the killFeed event", () => {
  const kx = read("modules/wodx-actions/scripts/kindred.js");
  const body = kx.slice(kx.indexOf("export function roadOf"));
  assert.ok(body.indexOf("K.v20PathFor(DATA.paths") > 0 && body.indexOf("K.v20PathFor(DATA.paths") < body.indexOf("K.roadFor(DATA.roads"));
  assert.match(kx, /get\("paths-v20\.json"\)/);
  assert.match(read("modules/wodx-actions/scripts/main.js"), /isfrenzy \? "killFrenzy" : "killFeed", `\$\{vesselActor/);
});
