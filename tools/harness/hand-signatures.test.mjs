/* The Storyteller's Hand, features that act by themselves (B4874-B4878). */
import "./win-paths.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = p => import(pathToFileURL(join(root, p)));
const S = await load("modules/wodx-chronicle/scripts/signature-rules.mjs");
const D = await load("modules/wodx-chronicle/data/signatures.mjs");

test("soak dice come from the feature and its condition", () => {
  assert.equal(S.sigSoak({ ahroun: true, crinos: true, wyrmFoe: true }).dice, 1);
  assert.equal(S.sigSoak({ ahroun: true, crinos: false, wyrmFoe: true }).dice, 0);
  assert.equal(S.sigSoak({ troll: true, oathHeld: true }).dice, 1);
  assert.equal(S.sigSoak({ defender: true, beside: true, monsterFoe: false }).dice, 0);
  assert.equal(S.sigSoak({ defender: true, beside: true, monsterFoe: true, troll: true, oathHeld: true }).dice, 2);
});

test("the awards that now happen at once", () => {
  for (const k of ["glamour", "rage", "renown", "willpower", "chi", "boon", "breach"]) assert.ok(S.autoAct(k), k);
  assert.equal(S.autoAct("truce"), false);
  assert.equal(S.autoAct("refuse"), false);
});

test("counts, verdicts and triggers", () => {
  assert.equal(S.packDice(5), 3);
  assert.equal(S.choirDiff(2), 0);
  assert.equal(S.choirDiff(3), -1);
  assert.ok(S.isChurchName("St. Wenceslas Church"));
  assert.ok(S.isYamaServant("Akuma"));
  assert.ok(!S.isYamaServant("Stephan the baker"));
  assert.ok(S.isBunyip("Bunyip spirit"));
  assert.equal(S.judgeVerdict({ kind: "mortal" }).key, "none");
  assert.equal(S.judgeVerdict({ kind: "kindred", harmed: true }).key, "guilty");
  assert.equal(S.judgeVerdict({ kind: "lupine", harmed: false }).key, "unproven");
  assert.ok(S.piskieGift({ mode: "barter", give: "a ribbon", owe: 0 }));
  assert.ok(!S.piskieGift({ mode: "buy", give: null, owe: 5 }));
});

test("the feature texts no longer leave the point to the Storyteller", () => {
  const src = readFileSync(join(root, "modules/wodx-chronicle/data/signatures.mjs"), "utf8");
  for (const gone of ["which the Storyteller adds", "the Storyteller counts", "the Storyteller can call for", "the Storyteller says when", "the Storyteller's call)"]) assert.ok(!src.includes(gone), gone);
  assert.ok(D);
});

test("the wiring is in place", () => {
  const s = readFileSync(join(root, "modules/wodx-chronicle/scripts/signatures.mjs"), "utf8");
  for (const k of ["soakFor", "runSnap", "devilTiger", "craving", "bunyip", "shame", "piskie", "harmedInnocents", "servantToken"]) assert.ok(s.includes(k), k);
  assert.match(readFileSync(join(root, "modules/wodx-combat/scripts/main.js"), "utf8"), /signatures\?\.soakFor/);
  assert.match(readFileSync(join(root, "modules/wodx-actions/scripts/m20.js"), "utf8"), /TH\.traitMods\(actor, \["magick"/);
  assert.match(readFileSync(join(root, "modules/wodx-storyteller/scripts/tasks.mjs"), "utf8"), /ironLegion/);
});
