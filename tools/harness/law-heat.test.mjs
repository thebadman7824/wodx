import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The law's heat (B3606-B3607) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const H = await imp("modules/wodx-chronicle/scripts/law-heat-rules.mjs");
const L = await imp("modules/wodx-chronicle/scripts/law-rules.mjs");
const D = H.DAY;

test("law heat: a deed's weight follows the land's law and the age's catch", () => {
  const m1300 = L.lawOf("moravia", 1300), m2000 = L.lawOf("moravia", 2000);
  assert.ok(H.gainFor("fire", m1300) > H.gainFor("fight", m1300));
  assert.ok(H.gainFor("theft", m2000) > H.gainFor("theft", m1300), "a modern police force catches more");
  assert.ok(H.gainFor("desecrate", {catch: 0.3, crimes: ["heresy"]}) > H.gainFor("desecrate", {catch: 0.3, crimes: []}), "sacrilege counts more where heresy is a crime");
  assert.ok(H.gainFor("theft", m1300, {named: true}) > H.gainFor("theft", m1300));
  assert.equal(H.halfLife(m1300), 14);
  assert.equal(H.halfLife(m2000), 365);
});

test("law heat: it rises through the stages and cools by the age's means", () => {
  const law = L.lawOf("moravia", 1300);
  let e = {}, crossed = [];
  for ( let i = 0; i < 6; i++ ) { const r = H.addDeed(e, {deed: "fire", law, now: i * 60, id: "a1", name: "Someone", line: "vampire"}); e = r.entry; if ( r.crossed ) crossed.push(r.crossed.key); }
  assert.deepEqual(crossed, ["asked", "warrant", "manhunt"]);
  assert.ok(e.heat <= H.MAX);
  assert.ok(H.cooled(e, 14 * D, law) < e.heat * 0.55 && H.cooled(e, 14 * D, law) > e.heat * 0.45, "halves in 14 days");
  const late = L.lawOf("moravia", 2000);
  assert.ok(H.cooled(e, 14 * D, late) > e.heat * 0.95, "a database barely forgets in a fortnight");
  assert.equal(H.lower(e, 0, law, 0).heat, 0);
  assert.ok(H.lower(e, 0, law, 0.5).heat > 0);
  assert.match(H.summary(e, 0, law), /Manhunt/);
  const s = H.normState({regions: {moravia: {a1: e}}});
  assert.equal(s.regions.moravia.a1.id, "a1");
});

test("law heat: each line has its hook, the bribe chance stays in bounds", () => {
  for ( const l of ["vampire", "ghoul", "werewolf", "mage", "changeling", "wraith", "hunter", "mummy", "demon", "revenant"] ) assert.ok(H.LINE_HOOKS[l], l);
  for ( const b of [1, 3, 5] ) for ( const h of [0, 5, 10] ) { const c = H.bribeChance({bribe: b}, h); assert.ok(c >= 0.02 && c <= 0.8); }
  assert.ok(H.bribeChance({bribe: 1}, 2) > H.bribeChance({bribe: 5}, 2), "1 is cheap, 5 is dangerous to try");
});

test("law heat: the wiring", () => {
  const w = src("modules/wodx-npc/scripts/wanted.mjs"), h = src("modules/wodx-chronicle/scripts/law-heat.mjs"), m = src("modules/wodx-chronicle/scripts/main.mjs");
  assert.match(w, /Hooks\.callAll\("wodxCrimeSeen"/);
  assert.match(h, /Hooks\.on\("wodxCrimeSeen"/);
  assert.match(h, /Hooks\.callAll\("wodxArrest"/);
  assert.match(m, /registerHeatSettings\(\)/);
  assert.match(m, /registerHeatHooks\(\)/);
});
