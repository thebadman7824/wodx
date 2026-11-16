import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* B6777: the clans and bloodlines the lifepath offers have their in-clan Disciplines (V20, V20DA, Ebony Kingdom) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(join(root, "modules/wodx-creation/scripts/rules.mjs"));
const W = await import(join(root, "modules/wodx-creation/scripts/wizard-rules.mjs"));

test("B6777: Giovanni and the bloodlines have their own Disciplines, by era", () => {
  const d = (n, era = "modern") => R.clanDisciplines(R.findClan(n), era).join(", ");
  assert.equal(d("Giovanni"), "Dominate, Necromancy, Potence");
  assert.equal(d("Giovanni", "darkages"), "Auspex, Fortitude, Necromancy");
  assert.equal(d("Rossellini"), "Dominate, Necromancy, Potence");
  assert.equal(d("Samedi"), "Fortitude, Obfuscate, Thanatosis");
  assert.equal(d("True Brujah"), "Potence, Presence, Temporis");
  assert.equal(d("Daughters of Cacophony"), "Fortitude, Melpominee, Presence");
  assert.equal(d("Gargoyles"), "Flight, Fortitude, Potence, Visceratika");
  assert.equal(d("Gargoyle", "darkages"), "Flight, Fortitude, Potence");
  assert.equal(d("Harbingers of Skulls"), "Auspex, Fortitude, Necromancy");
  assert.equal(d("Lamia"), "Fortitude, Necromancy, Potence");
  assert.equal(d("Nagaraja"), "Auspex, Dominate, Necromancy");
  assert.equal(d("Xi Dundu"), "Dominate, Obtenebration, Potence");
  assert.equal(d("Osebo"), "Auspex, Celerity, Potence");
  assert.equal(d("Telyavelic Tremere"), "Auspex, Presence, Thaumaturgy");
  assert.equal(d("Tremere"), "Auspex, Dominate, Thaumaturgy");
  assert.equal(d("Serpents of the Light"), "Obfuscate, Presence, Serpentis");
  assert.equal(d("Nictuku", "darkages"), "Auspex, Celerity, Potence");
  for ( const n of ["Kiasyd", "Ahrimanes", "Anda", "Lhiannan", "Noiad", "Blood Brothers", "Akunanse", "Guruhi", "Ishtarri", "Nagloper", "Shango"] )
    assert.equal(R.clanDisciplines(R.findClan(n), "modern").length, 3, n);
  assert.ok(W.allDisciplines().includes("Thanatosis") && W.allDisciplines().includes("Temporis"), "the freebie list offers them");
});

test("B6777: the longest clan name inside a longer name wins", () => {
  assert.equal(R.findClan("True Brujah antitribu")?.id, "true-brujah");
  assert.equal(R.findClan("Brujah antitribu")?.id, "brujah");
  assert.equal(R.findClan("Old Clan Tzimisce")?.id, "tzimisce");
});
