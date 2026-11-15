// WoDX Atmosphere 0.17.0: the climate's history by part of the world (B5950-B5955).
import {test} from "node:test";
import assert from "node:assert/strict";
import * as W from "../../modules/wodx-atmosphere/scripts/weather-rules.mjs";
import {WORLD_REGIONS} from "../../modules/wodx-chronicle/scripts/world-rules.mjs";
import {gregorianToJDN} from "../../modules/wodx-chronicle/scripts/calendar-math.mjs";

const at = (region) => ({region, climate: WORLD_REGIONS[region].climate});

test("the Little Ice Age is deepest around the North Atlantic and faint in the tropics", () => {
  const bohemia = W.eraShift(1690, 1, at("moravia")).t, java = W.eraShift(1690, 1, at("nusantara")).t;
  assert.ok(bohemia <= -0.9, `Bohemia ${bohemia}`);
  assert.ok(java > -0.4 && java < 0, `Java ${java}`);
  assert.equal(W.eraShift(1690, 1, at("moravia")).age.name, "The Maunder low");
  // Warming runs fastest near the poles
  assert.ok(W.eraShift(2000, 1, at("arctic")).t > W.eraShift(2000, 1, at("india")).t);
});

test("left without a place, the shift is central Europe's as before", () => {
  assert.equal(W.eraShift(1690).t, -1);
  assert.ok(W.eraShift(1816, 7).t < W.eraShift(1816, 1).t);
  assert.equal(W.eraShift(1900).t, 0);
});

test("each hard year strikes where it struck, and nowhere else", () => {
  const has = (y, m, r, id) => W.eraShift(y, m, at(r)).episodes.some(e => e.id === id);
  assert.ok(has(1816, 7, "moravia", "tambora"));
  assert.ok(has(1816, 7, "north-america-east", "tambora"));
  assert.ok(!has(1816, 7, "india", "tambora"));
  assert.ok(!has(1816, 1, "moravia", "tambora"), "a summer's cold, not a winter's");
  assert.ok(has(1934, 5, "north-america-west", "dust-bowl"));
  assert.ok(!has(1934, 5, "north-america-east", "dust-bowl"));
  assert.ok(has(1973, 3, "west-africa", "sahel-drought"));
  assert.ok(has(1877, 3, "india", "great-drought") && has(1877, 3, "china", "great-drought") && has(1877, 3, "brazil", "great-drought"));
  assert.ok(has(1640, 6, "china", "ming-drought") && !has(1640, 6, "japan", "ming-drought"));
  assert.ok(has(1316, 6, "british-isles", "great-famine") && !has(1316, 6, "italy", "great-famine"));
  assert.ok(has(1783, 7, "france", "laki-summer") && has(1784, 1, "moravia", "laki-winter") && !has(1784, 6, "moravia", "laki-winter"));
  // World-wide years reach everywhere
  for ( const r of ["moravia", "india", "pacific-islands", "andes"] ) assert.ok(has(1884, 5, r, "krakatoa"), r);
});

test("a drought means fewer wet days and a wet year more, in the weather itself", () => {
  const wetDays = (region, y) => {
    const c = WORLD_REGIONS[region].climate; let n = 0;
    for ( let j = gregorianToJDN(y, 1, 1); j < gregorianToJDN(y + 1, 1, 1); j++ ) if ( W.weatherFor("hist", c, j, {region}).precip !== "none" ) n++;
    return n;
  };
  const plainsDust = wetDays("north-america-west", 1935), plainsAfter = wetDays("north-america-west", 1955);
  assert.ok(plainsDust < plainsAfter * 0.85, `Dust years ${plainsDust} vs ${plainsAfter}`);
  const rainy = wetDays("british-isles", 1315), plain = wetDays("british-isles", 1325);
  assert.ok(rainy > plain * 1.1, `The great rains ${rainy} vs ${plain}`);
  // The same place without a region keeps its climate's own reading
  const c = WORLD_REGIONS["north-america-west"].climate;
  assert.ok(W.weatherFor("hist", c, gregorianToJDN(1935, 6, 1), {}).eraHard.length > 0, "the climate alone still knows the dust years");
});

test("the year without a summer is cold where it struck: snow can lie in a Bohemian June", () => {
  const meanOf = (y, region) => { let s = 0, n = 0; for ( let d = 1; d <= 30; d++ ) { s += W.weatherFor("hist", "central-europe", gregorianToJDN(y, 6, d), {region}).mean; n++; } return s / n; };
  assert.ok(meanOf(1816, "moravia") < meanOf(1820, "moravia") - 1.5);
});

test("the weather names a hard year in words, and an ordinary year names only its age", () => {
  const d = W.weatherFor("hist", "great-plains", gregorianToJDN(1935, 6, 1), {region: "north-america-west"});
  assert.match(d.eraHard, /dust/i);
  assert.equal(d.eraName, "The dust years");
  const q = W.weatherFor("hist", "central-europe", gregorianToJDN(1500, 6, 1), {region: "moravia"});
  assert.equal(q.eraHard, "");
  assert.match(q.eraAge, /Little Ice Age/);
  const now = W.weatherFor("hist", "central-europe", gregorianToJDN(1950, 6, 1), {region: "moravia"});
  assert.equal(now.eraAge, "");
});

test("every hard year is well formed: dated, placed in known regions and climates, told in plain words", () => {
  const ids = new Set();
  for ( const ep of W.EPISODES ) {
    assert.ok(!ids.has(ep.id)); ids.add(ep.id);
    assert.ok(ep.from >= 1197 && ep.to >= ep.from && ep.to <= 2025, ep.id);
    assert.ok(ep.all || ep.regions?.length || ep.climates?.length, ep.id);
    for ( const r of ep.regions ?? [] ) assert.ok(WORLD_REGIONS[r], `${ep.id}: ${r}`);
    for ( const c of ep.climates ?? [] ) assert.ok(W.CLIMATES[c], `${ep.id}: ${c}`);
    assert.ok(ep.line.length > 20 && !/—/.test(ep.line) && !/\b(he|she|his|her|him)\b/i.test(ep.line), ep.id);
  }
  for ( const c of Object.keys(W.CLIMATES) ) assert.ok(W.ERA_WEIGHT[c] !== undefined, `weight for ${c}`);
});
