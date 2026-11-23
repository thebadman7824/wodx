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
  // The old fuzzy match read "Path of Blood" as the Road of Yasa (nickname Bloodbrothers); B7669: with the Road of Blood
  // in the data (V20 Dark Ages p. 432) an exact name wins, and the Road of Yasa is still found by its own names
  assert.equal(K.roadFor(ROADS, "Path of Blood").key, "blood");
  assert.equal(K.roadFor(ROADS, "Road of Blood").key, "blood");
  assert.equal(K.roadFor(ROADS, "Bloodbrothers").key, "yasa");
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

test("B6725: a Bastet's own tribe's Gifts are its own; another tribe's are not; other Fera groups unchanged", async () => {
  const G = await import("../../modules/wodx-actions/scripts/garou-rules.js");
  const FERA = JSON.parse(read("modules/wodx-actions/data/gifts-fera.json")).gifts;
  const bagheera = FERA.find(g => g.breed === "Bastet" && g.sub === "Bagheera");
  const simba = FERA.find(g => g.breed === "Bastet" && g.sub === "Simba");
  const feline = FERA.find(g => g.breed === "Bastet" && g.sub === "Feline");
  const i = { feraKey: "Bastet", tribe: G.tribeKey("wod.bio.tribename.bagheera") };
  assert.equal(i.tribe, "bagheera");
  assert.equal(G.feraGiftIsOwn(bagheera, i), true);
  assert.equal(G.feraGiftIsOwn(simba, i), false);
  assert.equal(G.feraGiftIsOwn(feline, i), true);
  assert.equal(G.feraGiftIsOwn(FERA.find(g => g.breed === "Gurahl"), { feraKey: "Gurahl", tribe: "forest-walkers" }), true);
  assert.equal(G.feraGiftIsOwn(simba, { feraKey: "Gurahl" }), false);
  for (const t of ["bagheera", "balam", "bubasti", "ceilican", "pumonca", "qualmi", "simba", "swara"])
    assert.match(read("system/worldofdarkness/lang/en.json"), new RegExp(`"${t}": "`), t);
  assert.match(read("modules/wodx-actions/scripts/garou.js"), /g\.breed \? G\.feraGiftIsOwn\(g, i\)/);
});

// B7080-B7081: each Path's bearing (V20 p. 310 and the Path pages), and the two other names the book gives
const R = await import("../../modules/wodx-actions/scripts/rules.js");
const path = k => K.v20PathFor(PATHS, `wod.advantages.path.${k}`);

test("B7080: the bearing table in the data gives the V20 p. 310 steps, the same as the Road aura", () => {
  for (let r = 0; r <= 10; r++) assert.equal(K.bearingStep(PATHS.bearingSteps, r), R.auraModifier(r), `rating ${r}`);
  assert.equal(PATHS.bearingPage, 310);
});

test("B7080: every Path has a named bearing with what it covers, and the tags are roll tags", () => {
  const TAGS = new Set(["willpower", "stealth", "seduce", "intimidation", "manipulation", "leadership"]);
  for (const [k, p] of Object.entries(PATHS.paths)) {
    assert.ok(p.bearing?.name && p.bearing?.covers, k);
    assert.equal(p.bearing.name, p.aura, k);
    for (const t of p.bearing.tags) assert.ok(TAGS.has(t), `${k}: ${t}`);
  }
});

test("B7080: the bearing counts by itself on the Path's own rolls and not on others", () => {
  const b = (k, rating, o) => K.pathBearing(PATHS, path(k), rating, o);
  // Bones 10 sneaking: 2 easier
  assert.deepEqual([b("bones", 10, { tags: ["stealth"] }).applies, b("bones", 10, { tags: ["stealth"] }).step], [true, -2]);
  assert.match(b("bones", 10, { tags: ["stealth"] }).part, /Silence bearing \(Path of the Bones 10\) -2 diff, V20 p\. 310/);
  // Bones on a seduction roll: nothing
  assert.equal(b("bones", 10, { tags: ["seduce", "social"] }).applies, false);
  assert.equal(b("bones", 10, { tags: ["seduce"] }).part, "");
  // A low Path of Blood makes Willpower rolls harder
  assert.equal(b("blood", 2, { tags: ["willpower"] }).step, 1);
  assert.equal(b("blood", 2, { tags: ["willpower"] }).applies, true);
  // Lilith: only when the roll takes a wound penalty
  assert.equal(b("lilith", 9, { tags: ["brawl"] }).applies, false);
  assert.equal(b("lilith", 9, { tags: ["brawl"], wounded: true }).applies, true);
  // Caine has no roll tags: only the player's tick
  assert.equal(b("caine", 8, { tags: ["social"] }).applies, false);
  assert.equal(b("caine", 8, { tags: ["social"], ticked: true }).applies, true);
  assert.equal(b("caine", 8).byItself, false);
  // A middle rating is no step, so no card line even when it applies
  assert.equal(b("cathari", 6, { tags: ["seduce"] }).part, "");
  // Humanity and the Dark Ages Roads have no Path bearing here
  assert.equal(K.pathBearing(PATHS, K.roadFor(ROADS, "Road of Kings"), 8, { tags: ["leadership"] }), null);
  assert.equal(K.pathBearing(PATHS, null, 8), null);
});

test("B7081: Death and the Soul is the Path of the Bones; Harmony is the Feral Heart with Conscience", () => {
  assert.equal(K.v20PathFor(PATHS, "custom", "Path of Death and the Soul").key, "v20-bones");
  assert.equal(K.v20PathFor(PATHS, "", "the Path of Death and the Soul").key, "v20-bones");
  const h = K.v20PathFor(PATHS, "custom", "Path of Harmony");
  assert.equal(h.key, "v20-harmony");
  assert.deepEqual(K.roadVirtues(h), { conviction: false, instinct: true });
  assert.deepEqual(h.road.sins, PATHS.paths.feralheart.sins);
  // It sins as the Feral Heart does
  assert.equal(K.sinForEvent(h, "kill"), K.sinForEvent(path("feralheart"), "kill"));
  assert.equal(K.sinForEvent(h, "killFeed"), null);
  assert.equal(K.pathBearing(PATHS, h, 10, { tags: ["intimidation"] }).step, -2);
});

test("B7080: the general roll window and the Seduction window read the Path's bearing", () => {
  const src = read("modules/wodx-actions/scripts/main.js");
  assert.match(src, /const pb = pathBearingFor\(actor, rd, fd, pool\);/);
  // B7646: the Road's aura comes from road(), doubled for an Excommunicate
  assert.match(src, /aura: fd\.aura && !pb \? rd\.aura : 0/);
  assert.match(src, /aura: RFR\.auraFor\(R\.auraModifier\(value\), status\)/);
  assert.match(src, /\$\{bearingBox\(rd\)\}/);
  assert.match(src, /pbS \? \(fd\.aura && pbS\.auto \? pbS\.step : 0\)/);
});
