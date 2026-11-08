import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* WoDX Sheets 0.2: the Dark Ages sheets (B74) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SR = await import(join(root, "modules/wodx-sheets/scripts/sheet-rules.mjs"));
const main = readFileSync(join(root, "modules/wodx-sheets/scripts/main.mjs"), "utf8");

test("six Dark Ages sheets, each on its own actor type, with three header columns of fields", () => {
  assert.deepEqual(SR.DA_SHEETS, ["faeDA", "mageDA", "inqDA", "werewolfDA", "kindredDA", "ghoulDA"]);
  assert.deepEqual(SR.DA_SHEETS.map(k => SR.SHEETS[k].type), ["Changeling", "Mage", "Hunter", "Werewolf", "Vampire", "Mortal"]);
  for ( const [id, s] of SR.DA_SHEETS.map(k => [k, SR.SHEETS[k]]) ) {
    assert.equal(s.header.length, 2, id); for ( const c of s.header ) assert.equal(c.length, 3, id);
    assert.ok(s.book && s.sheetPage && s.title, id);
  }
});

test("Abilities in the printed sheets' order; ten a column (nine Talents for the Dark Ages Garou: Leadership is a Skill)", () => {
  for ( const [id, s] of SR.DA_SHEETS.map(k => [k, SR.SHEETS[k]]) ) {
    const n = Object.values(s.abilities).map(c => c.length);
    assert.deepEqual(n, id === "werewolfDA" ? [9, 10, 10] : [10, 10, 10], id);
    for ( const c of Object.values(s.abilities) ) for ( const row of c ) assert.ok(row && row[0] && row[1], `${id}: ${JSON.stringify(row)}`);
  }
  assert.equal(SR.SHEETS.faeDA.abilities.talents[6][0], "Kenning");
  assert.equal(SR.SHEETS.mageDA.abilities.skills[4][0], "Herbalism");
  assert.equal(SR.SHEETS.inqDA.abilities.knowledges[9][0], "Theology");
  assert.equal(SR.SHEETS.werewolfDA.abilities.talents[7][0], "Primal Urge");
  assert.equal(SR.SHEETS.werewolfDA.abilities.knowledges[9][1], "rituals");
  assert.equal(SR.SHEETS.kindredDA.abilities.talents[8][0], "Legerdemain");
});

test("every block a sheet names is built by main.mjs", () => {
  const cases = new Set([...main.matchAll(/case "([a-zA-Z0-9]+)"/g)].map(m => m[1]));
  for ( const [id, s] of Object.entries(SR.SHEETS) ) for ( const b of SR.blocksOf(s) ) assert.ok(cases.has(b), `${id}: ${b}`);
});

test("ability rows: the system's own keys, secondary-ability items by name, and missing ones", () => {
  const flat = {alertness: {value: 2}, kenning: {value: 3}};
  const items = [{id: "i1", name: "Legerdemain", type: "Trait", system: {type: "wod.types.talentsecondability", value: 2}}];
  const r = SR.abilityRows(SR.SHEETS.faeDA, flat, items);
  const leg = r.talents.find(x => x.label === "Legerdemain");
  assert.deepEqual([leg.id, leg.value, leg.secondary, leg.missing], ["i1", 2, true, false]);
  const arch = r.skills.find(x => x.label === "Archery");
  assert.equal(arch.missing, true); assert.equal(arch.group, "skill");
});

test("tracks, dots, paths", () => {
  const t = SR.track(4, 2);
  assert.equal(t.filter(x => x.dot).length, 4); assert.equal(t.filter(x => x.box).length, 2);
  assert.equal(SR.clickValue(3, 3), 3); assert.equal(SR.clickValue(1, 1), 0); assert.equal(SR.clickValue(1, 4), 4);
  assert.equal(SR.propPath("flag:wodx-actions.daFae.court"), "flags.wodx-actions.daFae.court");
  assert.equal(SR.propPath("system.nature"), "system.nature");
});

test("wiring: each sheet extends the system's own, replaces only Core (and the fae's Dreaming), follows the era", () => {
  for ( const b of ["ChangelingActorSheet", "MageActorSheet", "HunterActorSheet", "WerewolfActorSheet", "VampireActorSheet", "MortalActorSheet"] ) assert.match(main, new RegExp(`wodxSheet\\(${b}`));
  assert.match(main, /\.tab\.core/); assert.match(main, /page2Tab/);
  assert.match(main, /isFaeDA\(actor\)/); assert.match(main, /isMageDA\(actor\)/);
  const t = ["core.hbs", "block.hbs", "page2.hbs"].map(f => readFileSync(join(root, "modules/wodx-sheets/templates", f), "utf8")).join("\n");
  for ( const part of ["attributes.html", "stats_health_old.html", "getGetStatArea", "wodxBlock", "data-add-ability"] ) assert.ok(t.includes(part), part);
  const words = /\b(he|she|him|her|his|hers)\b/i;
  const strings = (main.match(/"[^"\n]{12,}"/g) ?? []).join(" ") + t.replace(/<[^>]+>|{{[^}]*}}/g, " ");
  assert.ok(!words.test(strings), strings.match(words)?.[0]);
});
