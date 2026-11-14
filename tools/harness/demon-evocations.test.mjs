/* Powers pass p1 (B3741-B3743): every Demon evocation says what it does, the running ones count against Faith, and the
   apocalyptic form puts its numbers on the sheet. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const D = await import("../../modules/wodx-actions/scripts/demon-rules.js");
const DE = await import("../../modules/wodx-actions/scripts/demon-evocations.js");
const E = await import("../../modules/wodx-actions/scripts/effects-rules.js");
const x = a => a ?? [];

test("every evocation in the Lore table has a card with effect, duration, range and high Torment (B3741)", () => {
  let count = 0;
  for ( const [id, l] of Object.entries(D.LORES) ) l.evo.forEach((e, k) => {
    const c = DE.evocationCard(id, k + 1);
    assert.ok(c, `${e.name} (${id} ${k + 1}) has no card`);
    for ( const f of ["fx", "lasts", "range", "high"] ) assert.ok(String(c[f] ?? "").length > 3, `${e.name}: no ${f}`);
    for ( const s of [c.spec, c.highSpec].filter(Boolean) ) assert.ok(E.KEYWORDS[s.kw], `${e.name}: unknown keyword ${s.kw}`);
    count++;
  });
  assert.equal(count, Object.keys(DE.EVOCATIONS).length, "a card for an evocation the Lore table does not have");
});

test("an evocation's card results land on the effects card, with Faith-long durations (B3741)", () => {
  const ob = DE.evocationResults("longing", 4, 2, {faith: 4, name: "Obsession"});
  assert.equal(ob[0].key, "sway");
  assert.equal(ob[0].out.timed.seconds, 4 * 86400, "Obsession lasts Faith days");
  const decay = DE.evocationResults("death", 2, 3, {name: "Decay"});
  assert.equal(decay[0].out.kind, "damage");
  assert.equal(decay[0].out.levels, 3);
  assert.equal(decay[0].out.type, "aggravated");
  assert.equal(decay[0].who, "one");
  const wide = DE.evocationResults("death", 2, 3, {high: true, name: "Decay"});
  assert.equal(wide[0].who, "all", "high Torment decays everything around her");
  const heal = DE.evocationResults("flesh", 4, 2, {name: "Restore Flesh"});
  assert.equal(heal[0].out.kind, "heal");
  assert.deepEqual(DE.evocationResults("death", 2, 0), [], "no successes, nothing on the card");
});

test("instant evocations do not count toward the running limit; lasting ones do (B3742)", () => {
  assert.equal(DE.lingers("death", 2), false, "Decay is instant");
  assert.equal(DE.lingers("longing", 4), true, "Obsession runs for days");
  assert.equal(DE.lingerSeconds("storms", 2, 3), 18, "Water Form runs Faith turns");
  const plan = D.evocationPlan({attr: 3, ability: 3, level: 1, loreRating: 2, permFaith: 2, faithPool: 3, active: 2});
  assert.ok(plan.notes.some(x => /limit/.test(x)), "the plan names the limit");
  const src = fs.readFileSync(path.join(root, "modules/wodx-actions/scripts/demon.js"), "utf8");
  assert.match(src, /live\.length >= i\.faith\.perm/, "Evoke refuses a new lasting evocation past the permanent Faith");
});

test("every form power of every visage has text; size, allure, acuity, initiative and hides add numbers (B3743)", () => {
  for ( const l of Object.values(D.LORES).filter(x => x.form) ) for ( const nm of [...x(l.form), ...x(l.high)] )
    assert.ok(DE.formPower(nm, l.visage), `${l.visage}: ${nm} has no entry`);
  const bel = DE.formTotals(["Increased Size", "Scales", "Wings"], "Bel");
  assert.deepEqual(bel.attrs, {strength: 1, dexterity: 2, stamina: 1});
  assert.equal(bel.armor, 4);
  assert.equal(bel.lines.length, 3);
  assert.deepEqual(DE.formTotals(["Increased Size"], "Kishar, the Visage of Earth").attrs, {strength: 2, dexterity: 1, stamina: 1});
  assert.equal(DE.formTotals(["Improved Initiative"], "Nusku").init, 2);
  const main = fs.readFileSync(path.join(root, "modules/wodx-actions/scripts/main.js"), "utf8");
  assert.match(main, /registerReverter\?\.\("wodx-actions\.demonForm"/, "the form's numbers come off at the end of the scene");
});
