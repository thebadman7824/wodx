import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* WoDX Solo, step 3 of The Lone Chronicle: card scenes for places with no map (B6040 to B6044) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const K = await import(pathToFileURL(join(root, "modules/wodx-solo/scripts/card-rules.mjs")));
const Country = await import(pathToFileURL(join(root, "modules/wodx-storyteller/scripts/country-rules.mjs")));

test("card towns: standing in the year, and not drawn already", () => {
  const towns = [{id: "brno", name: "Brno", since: 0}, {id: "ostrava", name: "Ostrava", since: 1267}, {id: "olomouc", name: "Olomouc", since: 0}];
  assert.deepEqual(K.cardTowns({towns, year: 1197, mapped: ["olomouc"]}).map(t => t.id), ["brno"]);
  assert.deepEqual(K.cardTowns({towns, year: 1300}).map(t => t.name), ["Brno", "Olomouc", "Ostrava"]);
  assert.deepEqual(K.cardTowns({towns: [{id: "x", name: "X", since: Infinity}], year: 2000}), []);
});

test("a scene stands for a town only at the town itself", () => {
  assert.equal(K.sceneTown({at: {town: "brno", km: 0}}), "brno");
  assert.equal(K.sceneTown({at: {town: "brno", km: 12, dir: "NE"}}), null);
  assert.equal(K.sceneTown({}), null);
  assert.equal(K.sceneTown(null), null);
});

test("the card says where the character is, from the country map", () => {
  const land = Country.landAt({town: "brno", km: 0, dir: "N"}, 1197);
  assert.ok(land);
  const card = K.cardLines({name: "Brno", year: 1197, time: "Sunday, 15 November, 22:10 by night", weather: "Rain, light, a breeze.", land});
  assert.equal(card.title, "Brno");
  assert.equal(card.lines[0], "The year 1197, Sunday, 15 November, 22:10 by night.");
  assert.equal(card.lines[1], "Rain, light, a breeze.");
  assert.ok(card.lines.some(l => /^The best way in is|^No made road/.test(l)));
  assert.match(card.lines.at(-1), /Look around/);
  const text = K.cardText(card);
  assert.ok(text.startsWith("BRNO\n\n"));
  for ( const l of card.lines ) {
    assert.doesNotMatch(l, /\b(he|she|his|her|him|hers)\b/i);
    assert.doesNotMatch(l, /—/);
  }
});

test("the card without a land or weather still reads", () => {
  const card = K.cardLines({name: "Nowhere"});
  assert.equal(card.lines.length, 1);
  const river = K.cardLines({name: "T", land: {words: "open plain", woods: 0.8, road: null, river: {name: "Morava", km: 0}}});
  assert.ok(river.lines.includes("The Morava runs through the town."));
  assert.ok(river.lines.includes("Deep forest, broken only by clearings and the track."));
  assert.ok(river.lines.includes("No made road comes here; tracks and paths only."));
  const far = K.cardLines({name: "T", land: {words: "hills", woods: 0.1, road: "highway", river: {name: "Svratka", km: 10, side: "SW"}}});
  assert.ok(far.lines.includes("The Svratka runs 10 km to the south-west."));
  assert.ok(far.lines.includes("The best way in is a highway."));
});

test("the card scene: room for the card, the arrival spot below it, a grid", () => {
  const s = K.CARD_SCENE, b = K.CARD_BOX, a = K.CARD_ARRIVE;
  assert.ok(b.x + b.width <= s.width && b.y + b.height <= s.height);
  assert.ok(a.y >= b.y + b.height && a.y + s.grid.size <= s.height && a.x >= 0 && a.x < s.width);
  assert.ok(s.grid.size > 0 && s.grid.type === 1);
  assert.equal(K.LOOK_MINUTES, 30);
});

test("the seat's side: the panel, the socket, the trip and the look", () => {
  const src = readFileSync(join(root, "modules/wodx-solo/scripts/card.mjs"), "utf8");
  for ( const k of ["ask.places", "ask.card", "ask.look", "places.rows"] ) assert.ok(src.includes(`"${k}"`), k);
  assert.match(src, /st\.travel\(\{actorId: actor\.id, destId: scene\.id, userId\}\)/, "the trip is the Travel window's own");
  assert.match(src, /travel: \{on: true, at: \{town, km: 0, dir: "N"\}\}/, "the card scene sits at the town on the country map");
  assert.match(src, /advancePersonal\?\.\(actor\.id, K\.LOOK_MINUTES \* 60\)/);
  assert.match(src, /searchBox\("ul\.wsolo-places"/);
  const main = readFileSync(join(root, "modules/wodx-solo/scripts/main.mjs"), "utf8");
  assert.match(main, /installCard\(/);
  assert.match(main, /card: cardApi/);
});
