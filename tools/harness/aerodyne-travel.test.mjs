// B6628: travel by aerodyne and aerocab on the World of Future Darkness branch (desk 2026-11-16).
import assert from "node:assert/strict";
import {test} from "node:test";
import * as R from "../../modules/wodx-storyteller/scripts/road-rules.mjs";
import * as C from "../../modules/wodx-storyteller/scripts/country-rules.mjs";
import * as D from "../../modules/wodx-storyteller/data/country.mjs";

const at = (town, km = 0, dir = "N") => ({at: {town, km, dir}, name: D.TOWNS[town][0]});

test("an aerodyne flies over any road or water, only on the branch, when asked for or owned", () => {
  assert.equal(R.tripByDistance({km: 60, road: "road", year: 2030, future: true}).mode, "car");
  const t = R.tripByDistance({km: 60, road: "water", year: 2030, future: true, want: "aerodyne"});
  assert.equal(t.mode, "aerodyne"); assert.equal(t.minutes, 18);
  // its Storyteller chart's speeds less a tenth: the News Copter's safe 140 and top 220 mph, a quarter more from 2040
  assert.equal(R.airKmh(2030), 203); assert.equal(R.airKmh(2030, "flat"), 319); assert.equal(R.airKmh(2040), 253);
  assert.equal(R.tripByDistance({km: 60, road: "water", year: 2030, future: true, want: "aerodyne", cruise: "flat"}).minutes, 11);
  // owning one makes it the fastest way
  assert.equal(R.tripByDistance({km: 60, road: "road", year: 2030, future: true, owns: ["aerodyne"]}).mode, "aerodyne");
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

test("one of their own: an aerodyne is the best way; flat out is faster; it sets down where asked (B6628)", () => {
  const towns = Object.keys(D.TOWNS);
  const a = at(towns[0]), b = at(towns[towns.length - 1]), mid = at(towns[Math.floor(towns.length / 2)]);
  const owned = C.countryTrip(a, b, {year: 2030, future: true, wage: 600, owns: ["aerodyne"]});
  assert.equal(owned.mode, "aerodyne");
  assert.deepEqual(owned.flight, {cruise: "safe", via: []});
  const flat = C.countryTrip(a, b, {year: 2030, future: true, wage: 600, want: "aerodyne", cruise: "flat"});
  assert.ok(flat.minutes < owned.minutes && flat.flight.cruise === "flat");
  const via = C.countryTrip(a, b, {year: 2030, future: true, wage: 600, want: "aerodyne", via: [mid]});
  assert.deepEqual(via.flight.via, [mid.name]);
  assert.ok(via.legs.some(l => l.to === mid.name && l.setDown), "lands at the stop");
  assert.ok(via.minutes >= owned.minutes);
});

test("an aerocab: hired, door to door, dear (B6628)", () => {
  const towns = Object.keys(D.TOWNS);
  const a = at(towns[0], 3, "E"), b = at(towns[towns.length - 1], 3, "W");
  const cab = C.countryTrip(a, b, {year: 2030, future: true, wage: 600, want: "aerocab"});
  assert.equal(cab.mode, "hire:aerocab");
  assert.equal(cab.legs.length, 1, "one ride, no walk to a stop");
  assert.ok(cab.legs[0].from.startsWith("the pickup") && cab.legs[0].to === b.name);
  const bus = C.countryTrip(a, b, {year: 2030, future: true, wage: 600, want: "hire:bus"});
  assert.ok(cab.fare > bus.fare * 5, `${cab.fare} against ${bus.fare}`);
  assert.ok(!C.hiredModes(2030).some(m => m.id === "hire:aerocab"), "not on the classic timeline");
  assert.ok(!C.hiredModes(2020, {future: true}).some(m => m.id === "hire:aerocab"), "not before 2023");
});
