import assert from "node:assert/strict";
import {test} from "node:test";
import * as WR from "../../modules/wodx-chronicle/scripts/world-rules.mjs";
import * as PR from "../../modules/wodx-npc/scripts/passerby-rules.mjs";
import {LOCAL_LOOKS, LOCAL_AGES, localTable} from "../../modules/wodx-npc/scripts/passerby-local.mjs";

/* Local looks for passers-by within one way of life (NPC 0.52.0, B2674) */

const banned = /\b(man|woman|men|women|boy|girl|he|she|his|her|him|wife|husband|mother|father|son|daughter)\b/i;
const AGES = Object.keys(PR.AGES);
const yearsOf = age => age === "medieval" ? [1197, 1300, 1450] : [PR.AGES[age].from, PR.AGES[age].from + 10];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

test("every local change names a real region, way of life and age, and every kind is whole", () => {
  for ( const [region, bySphere] of Object.entries(LOCAL_LOOKS) ) {
    assert.ok(WR.WORLD_REGIONS[region], `${region} is a world region`);
    for ( const [sphere, byAge] of Object.entries(bySphere) ) {
      assert.ok(WR.SPHERES[sphere], `${region}: ${sphere} is a way of life`);
      const kept = WR.REGION_SPHERE[region].some(([, s]) => s === sphere);
      assert.ok(kept, `${region} keeps ${sphere} at some time`);
      for ( const [age, part] of Object.entries(byAge) ) {
        assert.ok(AGES.includes(age) || age in LOCAL_AGES, `${region}.${sphere}: age ${age}`);
        for ( const [k, p] of Object.entries(part) ) {
          if ( p === null ) continue;
          const text = [p.who ?? "", ...(p.looks ?? [])].join(" ");
          assert.ok(!banned.test(text), `${region}.${sphere}.${age}.${k} is gender-neutral: ${text}`);
          assert.ok(!/—/.test(text), `${region}.${k}: no em-dash`);
          if ( p.looks ) assert.ok(p.looks.length && p.looks.every(l => typeof l === "string" && l.length), `${region}.${k} looks`);
          if ( p.who ) {
            assert.ok(typeof p.day === "number" && typeof p.night === "number", `${region}.${k} weights`);
            assert.ok(p.looks?.length, `${region}.${k} has looks`);
          }
        }
      }
    }
  }
});

test("lands of one way of life no longer walk the same street", () => {
  const pairs = [["persia", "maghreb"], ["egypt", "arabia"], ["anatolia", "levant"], ["central-asia", "persia"], ["china", "korea"],
    ["north-america-east", "australia"], ["caribbean", "mexico"], ["brazil", "andes"], ["aotearoa", "pacific-islands"]];
  for ( const [a, b] of pairs ) for ( const y of [1300, 1450] ) {
    if ( WR.sphereFor(a, y) !== WR.sphereFor(b, y) ) continue;
    assert.ok(!same(PR.streetTable(y, a), PR.streetTable(y, b)), `${a} and ${b} differ in ${y}`);
  }
  for ( const y of [1300, 1600, 1850, 1950, 2000, 2050] ) assert.ok(!same(PR.streetTable(y, "persia"), PR.streetTable(y, "maghreb")), `Persia and Morocco ${y}`);
  for ( const y of [1600, 1850, 2000] ) assert.ok(!same(PR.streetTable(y, "mexico"), PR.streetTable(y, "north-america-east")), `New Spain and the English colonies ${y}`);
});

test("every street is drawable in every region and age, and Moravia stays as it was", () => {
  for ( const region of Object.keys(WR.WORLD_REGIONS) ) for ( const age of AGES ) for ( const y of yearsOf(age) ) {
    const t = PR.streetTable(y, region);
    assert.ok(Object.keys(t).length >= 4, `${region} ${y} has a crowd`);
    for ( const [k, p] of Object.entries(t) ) assert.ok(p.who && p.looks?.length, `${region} ${y} ${k} is whole`);
    for ( const h of [3, 12, 20] ) {
      const one = PR.makePasserby({year: y, hour: h, region, rng: () => 0.37});
      assert.ok(one.name && one.who, `${region} ${y} ${h}h draws someone`);
    }
  }
  for ( const age of AGES ) assert.equal(PR.streetTable(PR.AGES[age].from + 1 || 1300, "moravia"), PR.PEOPLE[age]);
});

test("changes follow the way of life a land keeps that year", () => {
  assert.ok(PR.streetTable(1400, "caribbean").fisher, "Taino fishers before 1492");
  assert.ok(!PR.streetTable(1600, "caribbean").fisher, "and not the same street after");
  assert.ok(PR.streetTable(1600, "caribbean").hand.who.includes("sugar"));
  assert.ok(PR.streetTable(1300, "australia").gatherer && !PR.streetTable(1300, "australia").burgher);
  assert.ok(PR.streetTable(1790, "australia").convict, "a convict gang after 1788");
  assert.ok(PR.streetTable(1300, "egypt").mamluk && !PR.streetTable(1600, "egypt").mamluk, "mamluks only in the medieval street");
  assert.equal(PR.streetTable(1300, "maghreb").peasant.who, "a Berber farmer come to market");
  assert.ok(PR.streetTable(2000, "persia").shopper.looks.includes("in a black chador"));
  assert.ok(PR.streetTable(1960, "persia").shopper.looks.includes("in a printed headscarf"));
  /* a looks-only change keeps the kind's weights */
  const base = PR.streetTable(1300, "egypt"), t = localTable({friar: base.friar}, "persia", "islamic", "medieval");
  assert.ok(t.friar.who.includes("dervish"));
  const merged = localTable({burgher: {who: "x", looks: ["y"], day: 9, night: 9}}, "anatolia", "islamic", "medieval");
  assert.equal(merged.burgher.day, 9);
  assert.ok(merged.burgher.looks.includes("in a tall turban"));
  assert.equal(localTable(base, "nowhere", "islamic", "medieval"), base);
});

test("the tags still carry the region and the land's faith", () => {
  const one = PR.makePasserby({year: 1600, hour: 12, region: "persia", rng: () => 0.2});
  assert.ok(one.tags.includes("persia"));
});

test("every whole local kind has a station for its tags", () => {
  for ( const s of Object.values(LOCAL_LOOKS) ) for ( const ages of Object.values(s) ) for ( const t of Object.values(ages) )
    for ( const [k, p] of Object.entries(t) ) if ( p?.who ) assert.ok(p.cat, `${k} has a cat`);
  const t = PR.streetTable(1300, "maghreb");
  assert.equal(t.tanner.cat, "worker");
  assert.equal(t.burgher.cat, "gentry", "a looks-only change keeps the kind's station");
});
