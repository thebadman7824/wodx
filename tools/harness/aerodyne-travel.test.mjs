// B6628: travel by aerodyne on the World of Future Darkness branch.
import assert from "node:assert/strict";
import {test} from "node:test";
import * as R from "../../modules/wodx-storyteller/scripts/road-rules.mjs";
import * as C from "../../modules/wodx-storyteller/scripts/country-rules.mjs";
import * as D from "../../modules/wodx-storyteller/data/country.mjs";

const at = (town, km = 0, dir = "N") => ({at: {town, km, dir}, name: D.TOWNS[town][0]});

test("an aerodyne flies over any road or water, only on the branch, only when asked for", () => {
  assert.equal(R.tripByDistance({km: 60, road: "road", year: 2030, future: true}).mode, "car");
  const t = R.tripByDistance({km: 60, road: "water", year: 2030, future: true, want: "aerodyne"});
  assert.equal(t.mode, "aerodyne"); assert.equal(t.minutes, 24);
  assert.notEqual(R.tripByDistance({km: 60, road: "road", year: 2030, future: false, want: "aerodyne"}).mode, "aerodyne");
  assert.notEqual(R.tripByDistance({km: 60, road: "road", year: 2020, future: true, want: "aerodyne"}).mode, "aerodyne");
});

test("only the sky slows it: a gale, fog, a storm; mud and snow on the ground do not", () => {
  assert.deepEqual(R.weatherFactor({wind: "gale"}, "road", "aerodyne", 2030).why, ["a gale aloft"]);
  assert.equal(R.weatherFactor({snowLying: true, precip: "rain"}, "path", "aerodyne", 2030).factor, 1);
});

test("across the country map it goes straight over hills and rivers, when asked for", () => {
  const towns = Object.keys(D.TOWNS);
  const a = at(towns[0]), b = at(towns[towns.length - 1]);
  const car = C.countryTrip(a, b, {year: 2030, future: true, wage: 600});
  const air = C.countryTrip(a, b, {year: 2030, future: true, wage: 600, want: "aerodyne"});
  assert.notEqual(car.mode, "aerodyne", "not picked unless asked");
  assert.equal(air.mode, "aerodyne");
  const drive = C.countryTrip(a, b, {year: 2030, future: true, wage: 600, want: "car"});
  assert.ok(air.minutes < drive.minutes, `${air.minutes} < ${drive.minutes}`);
  assert.ok(car.options.some(o => o.id === "aerodyne"), "offered among the options");
  assert.ok(!C.ownModes(2030).some(m => m.id === "aerodyne"), "not on the classic timeline");
});
