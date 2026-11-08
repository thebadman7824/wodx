import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* WoDX Sheets 0.1: the Dark Ages: Fae character sheet (B74) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SR = await import(join(root, "modules/wodx-sheets/scripts/sheet-rules.mjs"));

test("the Dark Ages: Fae sheet: thirty Abilities in the book's three columns, four Dominions (pdf p. 224)", () => {
  const A = SR.FAE_DA.abilities;
  assert.deepEqual([A.talents.length, A.skills.length, A.knowledges.length], [10, 10, 10]);
  assert.equal(A.talents[6][0], "Kenning"); assert.equal(A.knowledges[1][1], "gremayre");
  assert.deepEqual(SR.FAE_DA.dominions.map(d => d[1]), ["day", "dawn", "dusk", "night"]);
});

test("ability rows: the system's own keys, secondary-ability items by name, and missing ones", () => {
  const flat = {alertness: {value: 2}, kenning: {value: 3}};
  const items = [{id: "i1", name: "Legerdemain", type: "Trait", system: {type: "wod.types.talentsecondability", value: 2}}];
  const r = SR.abilityRows(SR.FAE_DA, flat, items);
  const leg = r.talents.find(x => x.label === "Legerdemain");
  assert.deepEqual([leg.id, leg.value, leg.secondary, leg.missing], ["i1", 2, true, false]);
  assert.equal(r.talents.find(x => x.label === "Kenning").value, 3);
  const arch = r.skills.find(x => x.label === "Archery");
  assert.equal(arch.missing, true); assert.equal(arch.group, "skill");
  assert.equal(r.skills.find(x => x.label === "Crafts").missing, true, "no flat key on this test actor");
});

test("tracks and dots; clicking the same dot lowers by one", () => {
  const t = SR.track(4, 2);
  assert.equal(t.length, 10); assert.equal(t.filter(x => x.dot).length, 4); assert.equal(t.filter(x => x.box).length, 2);
  assert.equal(SR.dots(3).filter(d => d.on).length, 3);
  assert.equal(SR.clickValue(3, 3), 2); assert.equal(SR.clickValue(1, 4), 4);
});

test("wiring: the sheet extends the system's Changeling sheet, follows the era, and is registered for Changelings", () => {
  const m = readFileSync(join(root, "modules/wodx-sheets/scripts/main.mjs"), "utf8");
  assert.match(m, /extends ChangelingActorSheet/);
  assert.match(m, /isFaeDA\(this\.actor\)/);
  assert.match(m, /types: \["Changeling"\]/);
  const t = readFileSync(join(root, "modules/wodx-sheets/templates/fae-da.hbs"), "utf8");
  for ( const part of ["attributes.html", "stats_health_old.html", "combat.html", "gear.html", "notes.html", "settings.html"] ) assert.ok(t.includes(part), part);
  for ( const w of ["Court", "Origin", "Agenda", "Dominions", "Backgrounds", "Cantrips", "Other Traits", "Mists &amp; Weaving", "Oaths", "Echoes", "Features"] ) assert.ok(t.includes(w), w);
  const words = /\b(he|she|him|her|his|hers)\b/i;
  assert.ok(!words.test(t.replace(/<[^>]+>|{{[^}]*}}/g, " ")));
});
