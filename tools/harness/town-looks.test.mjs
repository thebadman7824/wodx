import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as L from "../../modules/wodx-storyteller/scripts/town-look-rules.mjs";

/* Town events shown on the town's scenes (B4620) */

const rect = {x: 200, y: 100, width: 3000, height: 2000};

test("town looks: each event leaves seeded marks inside the scene, timed", () => {
  const a = L.looksFor("fire", {rect, grid: 100, now: 1000, seed: "t1"}), b = L.looksFor("fire", {rect, grid: 100, now: 1000, seed: "t1"});
  assert.deepEqual(a, b, "same seed, same marks");
  assert.deepEqual(a.map(x => x.kind), ["fire", "fire", "fire", "smoke", "rubble", "rubble", "rubble"]);
  for ( const x of a.filter(l => l.at) ) {
    assert.ok(x.at.x >= rect.x && x.at.x <= rect.x + rect.width && x.at.y >= rect.y && x.at.y <= rect.y + rect.height, JSON.stringify(x.at));
  }
  assert.equal(a.find(x => x.kind === "smoke").at, null);
  assert.equal(a[0].until.worldTime, 1000 + 86400);
  const flood = L.looksFor("flood", {rect, grid: 100, now: 0, seed: "t2"}).filter(x => x.kind === "flood");
  for ( const x of flood ) assert.ok(x.at.y >= rect.y + rect.height * 2 / 3, "water lies in the low third");
  assert.deepEqual(L.looksFor("boom", {rect}), []);
  assert.ok(L.isOver({until: {worldTime: 10}}, 10) && !L.isOver({until: {worldTime: 10}}, 9));
  for ( const k of Object.values(L.TOWN_LOOKS).flat().map(p => p.kind) ) assert.ok(L.FALLBACK[k], `${k} has a fallback colour`);
});

test("town looks: every disaster the town turn can raise has a look", () => {
  for ( const k of ["fire", "flood", "storm", "quake", "riot", "rising", "sack"] ) assert.ok(L.TOWN_LOOKS[k], k);
});

/* Sickness in a town shown on its scenes (B4622) */
test("sick looks: crosses grow to the height, the cart and fog come at the worst, none when over", () => {
  const count = ph => L.sickLooksFor(ph, {rect, grid: 100, seed: "m:s"});
  assert.equal(count("arriving").length, 1);
  assert.equal(count("rising").length, 3);
  const h = count("height");
  assert.equal(h.filter(l => l.mark === "cross").length, 6);
  assert.ok(h.some(l => l.mark === "cart") && h.some(l => l.kind === "fog" && !l.at));
  assert.deepEqual(count("over"), []);
  assert.deepEqual(count("rising")[0].at, h[0].at, "the first doors keep their crosses");
  assert.equal(L.signatureOf(count("rising")), L.signatureOf(count("rising")));
  assert.notEqual(L.signatureOf(count("rising")), L.signatureOf(h));
  for ( const l of h ) assert.equal(l.until, null, "they follow the outbreak, not the clock");
});

/* Hunters closing in shown on the town's scenes (B4623) */
test("hunter looks: notices from Watching, lanterns from Hunting, more at a Purge; a torch crowd for a night", () => {
  const at = (st, sought = "") => L.hunterLooksFor(st, {rect, grid: 100, seed: "m:s", sought});
  assert.deepEqual(at("quiet"), []);
  assert.deepEqual(at("rumours"), []);
  assert.equal(at("watching").filter(l => l.mark === "notice").length, 2);
  assert.equal(at("watching").filter(l => l.mark === "lantern").length, 0);
  assert.equal(at("hunting").filter(l => l.mark === "lantern").length, 4);
  assert.ok(at("purge").length > at("hunting").length);
  assert.equal(at("watching", "Anna")[0].text, "Sought: Anna");
  assert.notEqual(L.signatureOf(at("watching", "Anna")), L.signatureOf(at("watching")), "a new name redraws the notices");
  const c = L.torchCrowd({rect, grid: 100, now: 50, seed: "x"});
  assert.equal(c.length, L.TORCH_CROWD.spots);
  for ( const l of c ) { assert.equal(l.until.worldTime, 50 + 12 * 3600); assert.ok(l.at.x >= rect.x - 300 && l.at.x <= rect.x + rect.width + 300); }
});

/* A siege at a town shown on its scenes (B4624) */
test("siege looks: a camp round the edges with smoke; a breach adds fallen stone", () => {
  const a = L.siegeLooksFor({breached: false}, {rect, grid: 100, seed: "m:s"});
  const b = L.siegeLooksFor({breached: true}, {rect, grid: 100, seed: "m:s"});
  assert.equal(a.filter(l => l.mark === "tent").length, 6);
  assert.equal(a.filter(l => l.kind === "smoke").length, 3);
  assert.equal(a.filter(l => l.kind === "rubble").length, 0);
  assert.equal(b.filter(l => l.kind === "rubble").length, 2);
  // every spot sits in the strip round the edge, not the middle of the town
  for ( const l of b ) {
    const d = Math.min(l.at.x - rect.x, rect.x + rect.width - l.at.x, l.at.y - rect.y, rect.y + rect.height - l.at.y);
    assert.ok(d >= 0 && d <= l.at.radius + 1, JSON.stringify(l.at));
  }
});

/* A shut shop boarded up (B4625) */
test("shut shop: boards over the trader's place, named, no end time", () => {
  const l = L.shutLook({x: 450, y: 350, size: 100}, "Jana");
  assert.deepEqual(l.at, {x: 450, y: 350, radius: 60});
  assert.equal(l.mark, "boards");
  assert.equal(l.until, null);
  assert.match(l.note, /Jana/);
  assert.ok(L.MARK_TEXT.boards && L.MARK_COLOR.boards);
});

/* A haven set on fire by a rival (B4626) */
test("haven fire: starts in the middle of the scene, smoke while it burns, scorch marks for weeks; the area burns", () => {
  const {at, looks} = L.havenFireFor({rect, grid: 100, now: 10, seed: "h"});
  assert.ok(at.x >= rect.x + rect.width / 4 && at.x <= rect.x + rect.width * 3 / 4 && at.y >= rect.y + rect.height / 4 && at.y <= rect.y + rect.height * 3 / 4);
  assert.equal(looks.find(l => l.kind === "smoke").until.worldTime, 10 + L.HAVEN_FIRE.smoke);
  const scorch = looks.filter(l => l.kind === "rubble");
  assert.equal(scorch.length, 3);
  for ( const l of scorch ) assert.equal(l.until.worldTime, 10 + L.HAVEN_FIRE.scorch.last);
  const area = L.havenFireArea("Old Rival");
  assert.equal(area.out.world, "blaze");
  assert.equal(area.out.dice, 2);
  assert.match(area.out.text, /Old Rival/);
});

/* Hardship weather on the scene (B4627) */
test("hardship look: cold snows, wet rains, heat glares; storms when severe; none hands back to the sky", async () => {
  const H = await import("../../modules/wodx-storyteller/scripts/hardship-rules.mjs");
  assert.equal(H.hardshipLook("none"), null);
  assert.equal(H.hardshipLook("auto"), null);
  assert.deepEqual(H.hardshipLook("harsh", "cold"), {weather: "snow", glare: false});
  assert.deepEqual(H.hardshipLook("deadly", "cold"), {weather: "blizzard", glare: false});
  assert.deepEqual(H.hardshipLook("harsh", null), {weather: "rain", glare: false});
  assert.deepEqual(H.hardshipLook("severe", null), {weather: "rainStorm", glare: false});
  assert.deepEqual(H.hardshipLook("severe", "heat"), {weather: "", glare: true});
});

/* Signs and great events in the sky (B4628) */
test("omen looks: every sign that can be seen shows for a night; great events darken the sky", () => {
  const crows = L.omenLooksFor("Crows gather on the roofs and do not leave.", {rect, now: 0, seed: "a"});
  assert.equal(crows.length, 8);
  assert.ok(crows.every(l => l.mark === "bird" && l.until.worldTime === L.OMEN_LASTS));
  assert.equal(L.omenLooksFor("A red glow lights the sky to the east before dawn.", {rect})[0].at, null);
  assert.deepEqual(L.omenLooksFor("Milk sours in every house on the same morning.", {rect}), []);
  for ( const line of ["A cold wind blows through the town though the trees are still.", "Dogs howl all night at nothing anyone can see.", "Rats come out by daylight, slow and unafraid.", "Swallows leave the eaves all at once.", "The frogs sing out of season.", "An owl calls by day."] )
    assert.ok(L.omenLooksFor(line, {rect}).length > 0, line);
  assert.equal(L.eventLookFor("fourth-great-maelstrom").kind, "storm");
  assert.equal(L.eventLookFor("avatar-storm").kind, "storm");
  assert.equal(L.eventLookFor("black-death").kind, "plague");
  assert.equal(L.eventLookFor("first-printed-bible"), null);
  for ( const m of Object.keys(L.MARK_TEXT) ) assert.ok(L.MARK_TEXT[m].length >= 1);
});

/* Prosperity and unrest on the town's scenes (B4629) */
test("prosperity looks: rich towns light their windows, poor ones have beggars, angry ones daubed walls", () => {
  const at = t => L.prosperityLooksFor(t, {rect, grid: 100, seed: "m:s"});
  assert.deepEqual(at({prosperity: 3, unrest: 1}), []);
  assert.equal(at({prosperity: 5, unrest: 1}).filter(l => l.mark === "window").length, 10);
  assert.equal(at({prosperity: 4, unrest: 1}).filter(l => l.mark === "window").length, 6);
  assert.equal(at({prosperity: 0.6, unrest: 1}).filter(l => l.mark === "beggar").length, 3);
  const angry = at({prosperity: 2, unrest: 4.4});
  assert.equal(angry.filter(l => l.text).length, 4);
  for ( const l of angry ) assert.ok(L.SLOGANS.includes(l.text));
  assert.equal(L.signatureOf(at({prosperity: 4.2, unrest: 1})), L.signatureOf(at({prosperity: 3.8, unrest: 1})), "small moves inside a band draw nothing new");
});
