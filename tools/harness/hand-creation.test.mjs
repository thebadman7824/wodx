/* Maelstroms, era notes, Fallen hosts and wizard traits act without the Storyteller's hand (B5021-B5024). */
import "./win-paths.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const W = await load("modules/wodx-actions/scripts/wraith-rules.js");
const A = await load("modules/wodx-creation/scripts/advance-rules.mjs");
const WR = await load("modules/wodx-creation/scripts/wizard-rules.mjs");
const D = await load("modules/wodx-creation/scripts/derived-rules.mjs");
const MDA = await load("modules/wodx-actions/scripts/mage-da-rules.js");
const FDA = await load("modules/wodx-actions/scripts/fae-da-rules.js");

test("the Great Maelstroms set the force in their years once their event has come", () => {
  assert.equal(W.greatMaelstrom(1917)?.force, 5);
  assert.equal(W.greatMaelstrom(1920), null);
  assert.equal(W.greatMaelstrom(1999, id => id !== "sixth-great-maelstrom"), null);
  const s = src("modules/wodx-actions/scripts/wraith.js");
  assert.ok(/async function autoStorm/.test(s) && /await autoStorm\(\)/.test(s));
  assert.ok(/autoStorm\(\)/.test(src("modules/wodx-actions/scripts/main.js")));
});

test("era notes become changes", () => {
  const base = {fromYear: 1500, toYear: 1950, years: 450, awakeYears: 450, fromEra: {id: "dark-ages"}, toEra: {id: "victorian"}};
  const g = A.propose({line: "garou", tribe: "Croatan"}, base);
  assert.ok(g.changes.some(c => c.kind === "adv.lostTribe" && c.checked));
  const w = A.propose({line: "wraith", fetters: [{id: "f1", name: "My sister Anna"}], deadNames: ["Anna"]}, {...base, fromEra: {id: "x"}, toEra: {id: "x"}});
  assert.ok(w.changes.some(c => c.kind === "adv.fetterLost" && c.data.itemId === "f1"));
  const d = A.propose({line: "demon", born: 1900}, {...base, fromYear: 1999, toYear: 2000, fromEra: {id: "x"}, toEra: {id: "x"}});
  assert.ok(d.changes.some(c => c.kind === "adv.hostDies"));
  const r = A.propose({line: "vampire", road: {key: "nosuchroad", label: "Road of Ash", rating: 6}}, base);
  assert.ok(r.changes.some(c => c.kind === "adv.road" && c.data.choice === "humanity"));
  const adv = src("modules/wodx-creation/scripts/advance.mjs");
  assert.ok(/case "adv.fetterLost"/.test(adv) && /case "adv.hostDies"/.test(adv) && /system.custom.tribe/.test(adv));
});

test("a Fallen takes a body on a sheet", () => {
  const s = src("modules/wodx-creation/scripts/states.mjs");
  assert.ok(/async function takeBody\(demon, host\)/.test(s) && /name="host"/.test(s));
});

test("Pillars, Dominions and edges are stored; a wilder's point is a pick", () => {
  assert.equal(WR.POWER_KIND.pillar.store, "flagmap");
  assert.equal(WR.POWER_KIND.edge.sub, "wod.types.edge");
  const first = Object.keys(MDA.FELLOWSHIPS)[0];
  assert.equal(WR.flagPowerIds("pillar", {fellowships: MDA.FELLOWSHIPS, fellowship: first}).length, 4);
  assert.equal(WR.flagPowerIds("dominion", {dominions: FDA.DOMINIONS}).length, 4);
  const sys = {seeming: "wilder"};
  const g = D.derivedTraits("c20", sys, {wilder: "glamour"}), w = D.derivedTraits("c20", sys, {wilder: "willpower"});
  const want = (d, k) => d.rows.find(r => r.key === k)?.want;
  assert.equal(want(g, "glamour"), 5); assert.equal(want(w, "willpower"), 5); assert.equal(want(w, "glamour"), 4);
  assert.equal(WR.normWizard({wilder: "willpower"}).wilder, "willpower");
});
