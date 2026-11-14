import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The Southwest in the People generator (B3930 to B3934): the Pueblos and the Diné with clans, the Apache by band */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
const SW = await import(join(root, "modules/wodx-creation/data/people-southwest.mjs"));
const HN = await import(join(root, "modules/wodx-creation/data/people-haudenosaunee.mjs"));
const split = s => s.split(",").map(x => x.trim()).filter(Boolean);
const WEST = W.cultureOf("north-america-west");
const people = (era, origin, n = 200) => Array.from({length: n}, (_, i) => PR.nameOf({rand: G.stream("sw", origin + era, i),
  tables: id => G.resolveTable(PEOPLE_TABLES, id, {era, culture: WEST}), origin, sex: i % 2 ? "female" : "male"}));
const LISTS = [SW.PU_MEN, SW.PU_WOMEN, SW.PU_CLANS, SW.PU_FAMILY, SW.DI_MEN, SW.DI_WOMEN, SW.DI_CLANS, SW.DI_FAMILY, SW.AP_MEN, SW.AP_WOMEN, SW.AP_BANDS, SW.AP_FAMILY];

test("southwest: no list repeats itself, no pronoun words", () => {
  for ( const l of LISTS.map(split) ) {
    assert.equal(new Set(l).size, l.length, l.join());
    for ( const n of l ) assert.doesNotMatch(n, /\b(he|she|her|hers|him|his)\b/i, n);
  }
});

test("southwest: the Hopi and Diné clan from the mother before 1800, Apache women by band, family names after", () => {
  for ( const [o, clans] of [["pueblo", SW.PU_CLANS], ["dine", SW.DI_CLANS]] ) {
    const med = people("medieval", o);
    assert.ok(med.every(p => split(clans).map(HN.clanName).includes(p.family) && !p.name.includes("{")), `${o}: ${med.find(p => !HN.CLAN.test(p.family))?.name}`);
  }
  const ap = people("medieval", "apache");
  assert.ok(ap.every(p => !p.family && !p.name.includes("{")));
  assert.ok(ap.some(p => /^A woman of the /.test(p.name)));
  const pu = people("early-modern", "pueblo");
  assert.ok(pu.some((p, i) => i % 2 === 0 && /^(Juan|Pedro|Francisco|Diego|Antonio|José|Domingo|Luis|Alonso|Bartolomé|Cristóbal|Esteban) /.test(p.given)), "church names at the missions from 1598");
  assert.ok(people("early-modern", "dine").every((p, i) => i % 2 || split(SW.DI_MEN).includes(p.given)), "no church names for the Diné before 1800");
  for ( const [o, fam] of [["pueblo", SW.PU_FAMILY], ["dine", SW.DI_FAMILY], ["apache", SW.AP_FAMILY]] ) {
    assert.ok(people("modern", o, 60).every(p => split(fam).includes(p.family)), o);
  }
});
