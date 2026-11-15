import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* B5160-B5162: Strengthening the Demon and a fomor's Numbing are played, and their after-costs follow */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");

test("Strengthening the Demon: two Demon Chi a success, at most 10, a turn a success", async () => {
  const KA = await imp("modules/wodx-actions/scripts/kote-arts.js");
  const p = KA.POWERS.find(x => x.name === "Strengthening the Demon");
  assert.ok(p && p.stoke && p.art === "chiiumuh" && p.roll === "po" && p.diff === 6 && p.cost.wp === 1 && p.p === 74);
  assert.equal(KA.artKeyOf("Chi'iu Muh"), "chiiumuh");
  assert.ok(KA.powersOf("chiiumuh", 2).some(x => x.id === p.id));
  assert.deepEqual(KA.stokePlan(3, 2), {ok: true, chi: 7, added: 4, turns: 2});
  assert.deepEqual(KA.stokePlan(8, 3), {ok: true, chi: 10, added: 2, turns: 3});
  assert.equal(KA.stokePlan(5, 0).ok, false);
  assert.equal(KA.stokeFade(6, 3), 3);
  assert.equal(KA.stokeFade(1, 3), 1);
});

test("the after-costs name both powers, by their pages", async () => {
  const AC = await imp("modules/wodx-actions/scripts/after-cost-rules.js");
  assert.equal(AC.costOf({name: "Strengthening the Demon"})?.cost.kind, "hunRoll");
  assert.equal(AC.costOf({name: "Numbing"})?.cost.kind, "fomorEnd");
});

test("Numbing: the condition gives Combat three Bruised levels and no wound penalties, and the launcher offers it", async () => {
  const s = src("modules/wodx-actions/scripts/fomor.js");
  assert.match(s, /mods: \{ bodyBruised: 3, bodyEase: 99 \}/);
  assert.match(s, /Stamina \+ Medicine/);
  assert.match(src("modules/wodx-actions/scripts/profile-menus.js"), /api:fomorPower/);
  assert.match(src("modules/wodx-actions/scripts/main.js"), /fomorPower: withActor/);
});
