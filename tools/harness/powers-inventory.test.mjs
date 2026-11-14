/* Powers pass (B3740): every power WoDX lists is counted, and the powers with no effect can only go down. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "wodx-powers-")), "inv.json");
execFileSync(process.execPath, [path.join(root, "tools/powers/inventory.mjs"), "--out", out]);
const inv = JSON.parse(fs.readFileSync(out, "utf8"));
const line = l => inv.rows.filter(r => r.line === l);

/** Ceilings: raise none of them. Lower each when a line is built (powers pass, desk order). */
const MOST_ROLL_ONLY = 22, MOST_NOTHING = 2;

test("every line WoDX has powers for is in the list", () => {
  assert.ok(inv.rows.length >= 2100, `only ${inv.rows.length} powers listed`);
  for ( const l of ["Vampire (Dark Ages)", "Vampire (V20)", "Werewolf (W20)", "Wraith (W20)", "Mage (M20)", "Changeling (C20)", "Demon (DtF)", "Hunter (HtR)", "Mummy (2nd)", "Orpheus", "Kuei-jin (KotE)", "Combat"] )
    assert.ok(line(l).length, `${l} is missing`);
});

test("powers with no effect can only go down", () => {
  assert.ok((inv.counts.roll ?? 0) <= MOST_ROLL_ONLY, `roll-only powers rose to ${inv.counts.roll}`);
  assert.ok((inv.counts.none ?? 0) <= MOST_NOTHING, `powers with nothing rose to ${inv.counts.none}`);
});

test("Wraith arts with an applying keyword put it on the effects card (B3740)", async () => {
  const PW = await import("../../modules/wodx-actions/scripts/power-effects.js");
  const arts = [...line("Wraith (W20)"), ...line("Wraith (Great War)")];
  assert.ok(arts.filter(a => a.status === "applies").length >= 150);
  const w = JSON.parse(fs.readFileSync(path.join(root, "modules/wodx-actions/data/arcanoi-w20.json"), "utf8"));
  const a = Object.values(w.arts).find(x => x.r && PW.powerKeywords("wraith", x.id)?.keywords?.includes("harm"));
  const got = PW.powerOutcomes(PW.powerKeywords("wraith", a.id), 3, {label: a.n, hasTarget: true});
  assert.ok(got.results.some(r => r.key === "harm"), `${a.n} does no harm on the card`);
});

test("Dark Ages powers with no roll and the always-on combat Disciplines take effect (B3751)", async () => {
  const PW = await import("../../modules/wodx-actions/scripts/power-effects.js");
  const da = [...line("Vampire (Dark Ages)"), ...line("Werewolf (Dark Ages)")];
  assert.ok(da.filter(r => r.status === "card").length <= 118, "Dark Ages card-only powers rose");
  for ( const d of ["Celerity", "Fortitude", "Potence"] )
    assert.ok(line("Vampire (Dark Ages)").filter(r => r.group === d && r.passive).every(r => r.status === "applies"), `${d} is read by WoDX Combat`);
  const claws = PW.powerOutcomes(PW.powerKeywords("disc", "protean-feral-weapons"), 1, {label: "Feral Weapons", noRoll: true});
  assert.ok(!claws.results.some(r => r.key === "harm"), "no damage without the attack roll");
  const ready = claws.results.find(r => r.key === "boost");
  assert.equal(ready?.who, "self"); assert.equal(ready.out.timed.kind, "scene");
  const hit = PW.powerOutcomes(PW.powerKeywords("disc", "protean-feral-weapons"), 2, {label: "Feral Weapons", hasTarget: true});
  assert.ok(hit.results.some(r => r.key === "harm"), "a rolled use still harms");
});
