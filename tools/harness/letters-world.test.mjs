/**
 * Letters that take the journey time across the world map (Storyteller 0.59.0, B2700 to B2704).
 */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as L from "../../modules/wodx-storyteller/scripts/letters-rules.mjs";
import * as WM from "../../modules/wodx-storyteller/scripts/world-map-rules.mjs";
import * as D from "../../modules/wodx-storyteller/scripts/discovery-rules.mjs";
import {WORLD_REGIONS} from "../../modules/wodx-chronicle/scripts/world-rules.mjs";
import {mediaYear} from "../../modules/wodx-chronicle/scripts/media-rules.mjs";

const D1 = 86400;
const go = (how, from, to, year, extra = {}) => {
  const j = WM.journey(WM.regionCentre(from), WM.regionCentre(to), {year, ...(extra.known ? {known: extra.known} : {})});
  return L.worldPlan(how, {from, to, year, j, internet: {from: mediaYear("internet", from), to: mediaYear("internet", to)}, ...extra});
};

test("letters: every world region has its years for the post, the telegraph and the telephone", () => {
  for ( const id of Object.keys(WORLD_REGIONS) ) {
    const r = L.REGION_LINES[id];
    assert.ok(r, `${id} has lines`);
    for ( const k of ["post", "telegraph", "telephone"] ) assert.ok(r[k] === null || (r[k] >= 1300 && r[k] <= 2000), `${id} ${k} ${r[k]}`);
    assert.ok(r.telephone === null || r.telegraph === null || r.telephone > r.telegraph, `${id}: the telephone comes after the telegraph`);
  }
  assert.deepEqual(Object.keys(L.REGION_LINES).sort(), Object.keys(WORLD_REGIONS).sort());
});

test("letters: the ways open where and when each land has them", () => {
  assert.ok(L.carriersFor(1600, {region: "moravia"}).some(c => c.id === "post"));
  assert.ok(!L.carriersFor(1600, {region: "aegean"}).some(c => c.id === "post"), "no public post in the Ottoman Aegean before 1840");
  assert.ok(L.carriersFor(1450, {region: "china"}).some(c => c.id === "post"), "China's letter offices");
  assert.ok(!L.carriersFor(1880, {region: "arabia"}).some(c => c.id === "telegraph"));
  assert.ok(!L.carriersFor(2000, {region: "central-africa", internet: mediaYear("internet", "central-africa")}).some(c => c.id === "email"));
  assert.ok(L.carriersFor(2020, {region: "central-africa", internet: mediaYear("internet", "central-africa")}).some(c => c.id === "email"));
  assert.ok(!L.carriersFor(1910).some(c => c.id === "traveller"), "after 1900 no one sends by a passing traveller");
});

test("letters: across the world the time follows the world map's journey for the year", () => {
  const near = go("messenger", "moravia", "german-lands", 1250), far = go("messenger", "moravia", "china", 1300);
  assert.ok(near.ok && near.days >= 2 && near.days <= 14, `Moravia to the German lands in 1250: ${near.days} days`);
  assert.ok(far.ok && far.days > 60, `Moravia to China in 1300: ${far.days} days`);
  const sail = go("post", "british-isles", "north-america-east", 1700), steam = go("post", "british-isles", "north-america-east", 1880);
  assert.ok(sail.days > 35 && steam.days < sail.days / 2, `the Atlantic post: ${sail.days} days under sail, ${steam.days} by steam`);
  const air = go("post", "moravia", "japan", 1950);
  assert.ok(air.ok && air.days < 8 && air.words.join(" ").includes("air"), `air mail to Japan in 1950: ${air.days}`);
  const trav = go("traveller", "moravia", "italy", 1300), mess = go("messenger", "moravia", "italy", 1300);
  assert.ok(trav.days > mess.days, "a passing traveller is slower than a messenger");
});

test("letters: relays, cables and calls", () => {
  const yam = go("messenger", "persia", "china", 1300), before = go("messenger", "persia", "china", 1200);
  assert.ok(yam.days < before.days / 1.5 && yam.words.join(" ").includes("Mongol"), `the yam: ${yam.days} against ${before.days}`);
  assert.equal(go("telegraph", "british-isles", "north-america-east", 1860).ok, false, "no Atlantic cable before 1866");
  const cable = go("telegraph", "british-isles", "north-america-east", 1870);
  assert.ok(cable.ok && cable.seconds <= 6 * 3600);
  assert.equal(go("telephone", "british-isles", "north-america-east", 1920).ok, false);
  assert.equal(go("telephone", "british-isles", "north-america-east", 1930).seconds, 0);
  assert.equal(go("telephone", "moravia", "german-lands", 1900).ok, false, "long lines from 1910");
  assert.equal(go("telegraph", "moravia", "australia", 1870).ok, false);
  assert.equal(go("telegraph", "moravia", "arabia", 1890).ok, false, "Arabia has no telegraph before 1900");
  assert.equal(go("net", "moravia", "brazil", 2030, {future: true}).seconds, 0);
});

test("letters: the known world, the same land, and losses", () => {
  const known = D.knownRegions("iberia", 1400, WM.REGION_IDS, []);
  const p = go("messenger", "iberia", "caribbean", 1400, {known});
  assert.equal(p.ok, false); assert.match(p.why, /knows the way/);
  const same = L.worldPlan("messenger", {from: "moravia", to: "moravia", year: 1300, reach: "region"});
  assert.equal(same.seconds, D1);
  assert.equal(L.worldPlan("post", {from: "aegean", to: "aegean", year: 1600}).ok, false);
  assert.ok(L.lostChance("traveller", 30 * D1) > L.lostChance("messenger", 30 * D1));
  assert.ok(L.lostChance("messenger", 60 * D1) > L.lostChance("messenger", 3 * D1));
  assert.equal(L.lostChance("telephone", 0), 0);
  assert.ok(L.lostChance("traveller", 9999 * D1) <= 40);
});

test("letters: stored with their parts of the world, put back, and listed on the way", () => {
  const l = L.normLetter({id: "a", fromRegion: "moravia", toRegion: "china", dueAt: 100, readBy: "x".repeat(300), lost: 250});
  assert.equal(l.fromRegion, "moravia"); assert.equal(l.readBy.length, 120); assert.equal(l.lost, 100);
  const later = L.delay(l, 3);
  assert.equal(later.dueAt, 100 + 3 * D1); assert.equal(later.late, 3);
  const list = [l, {...l, id: "b", dueAt: 50}, {...l, id: "c", state: "done"}];
  assert.deepEqual(L.inTransit(list).map(x => x.id), ["b", "a"]);
  const times = L.letterTimes({from: "moravia", to: "british-isles", year: 1900, j: WM.journey(WM.regionCentre("moravia"), WM.regionCentre("british-isles"), {year: 1900})});
  assert.deepEqual(times.map(t => t.id), ["messenger", "traveller", "post", "telegraph"]);
});

test("letters: the window and the Storyteller's list are wired", () => {
  const s = readFileSync(new URL("../../modules/wodx-storyteller/scripts/letters.mjs", import.meta.url), "utf8");
  for ( const k of ["Letters on the way", "data-wst-answer", "readOnTheWay", "delayLetter", "planFor", "WMap.knownNow"] ) assert.ok(s.includes(k), k);
  const m = readFileSync(new URL("../../modules/wodx-storyteller/scripts/world-map.mjs", import.meta.url), "utf8");
  assert.ok(m.includes("LR.letterTimes"));
});
