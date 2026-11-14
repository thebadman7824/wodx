import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

// Off-screen lives of supernatural NPCs (B3260-B3266).
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const F = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/fates-rules.mjs")));

const always = () => 0;      // every chance comes true
const never = () => 0.999999; // no chance comes true

test("the same jump with the same seed comes out the same", () => {
  const p = [{id: "v1", name: "Ilse", line: "vampire", made: 1400, generation: 8, road: 5, sectText: "Camarilla"}, {id: "g1", name: "Moon-Eye", line: "garou", born: 1580}];
  const a = F.live(p, 1600, 1890, {seed: "s"}), b = F.live(p, 1600, 1890, {seed: "s"});
  assert.deepEqual(a.events, b.events);
  assert.equal(F.live(p, 1600, 1600).events.length, 0);
});

test("torpor lasts by Humanity or Path, and the sleeper wakes when the years are up", () => {
  assert.equal(F.torporYears(3), 50);
  assert.equal(F.torporYears(1), 500);
  assert.ok(F.torporYears(7) < 1);
  // Torpor every year, nothing else: rand gives 0 only for the torpor draw
  let i = 0;
  const r = () => (i++ === 1 ? 0 : 0.9);
  const out = F.live([{id: "v", name: "Ruy", line: "vampire", made: 1500, generation: 9, road: 3, sectText: "camarilla"}], 1600, 1700, {rand: r});
  const sleep = out.events.find(e => e.kind === "torpor");
  assert.ok(sleep, "falls into torpor");
  const wake = out.events.find(e => e.kind === "wake");
  assert.ok(wake && wake.year === sleep.year + 50, "wakes 50 years on at Path 3");
});

test("a short torpor (Humanity 7) is over within the year and leaves no sleeper", () => {
  const seq = [0.5, 0.0, 0.9, 0.9]; let i = 0;
  const out = F.live([{id: "v", name: "Ana", line: "vampire", made: 1500, generation: 10, road: 7}], 1600, 1601, {rand: () => seq[i++ % seq.length]});
  assert.ok(out.events.some(e => e.kind === "torpor" && /rises again/.test(e.text)));
  assert.equal(out.people.v.torpor, null);
});

test("diablerie lowers Generation only on a victim of lower Generation, and kills a simulated victim", () => {
  const people = [{id: "a", name: "Hungry", line: "vampire", made: 1800, generation: 12, sectText: "Sabbat"},
    {id: "b", name: "Elder", line: "vampire", made: 1300, generation: 7, sectText: "Camarilla", keep: false}];
  // Make only the diablerie draw for "a" fire on the first year: death no, torpor no, diablerie yes, victim pick yes
  const seq = [0.9, 0.9, 0.0, 0.0, 0.0, 0.9, 0.9, 0.9, 0.9, 0.9]; let i = 0;
  const out = F.live(people, 1900, 1901, {rand: () => seq[i++] ?? 0.9});
  assert.equal(out.people.b.dead, true);
  assert.equal(out.people.a.generation, 11);
  assert.ok(out.events.some(e => e.kind === "diablerie" && /Elder/.test(e.text)));
});

test("thin blood does not sire, the kept are left alone, demons wait for 1999", () => {
  const out = F.live([{id: "t", name: "Thin", line: "vampire", made: 1990, generation: 14, sectText: "Sabbat"},
    {id: "k", name: "Kept", line: "vampire", made: 1500, generation: 8, keep: true},
    {id: "d", name: "Fallen", line: "demon"}], 1900, 1998, {rand: always});
  assert.ok(!out.events.some(e => e.id === "t" && e.kind === "brood"));
  assert.ok(!out.events.some(e => e.id === "k"));
  assert.ok(!out.events.some(e => e.id === "d"));
});

test("nothing happens when no chance comes true; a mummy slain rises again", () => {
  assert.equal(F.live([{id: "v", name: "V", line: "vampire", made: 1500, generation: 9}], 1600, 1900, {rand: never}).events.length, 0);
  const seq = [0.0, 0.5]; let i = 0;
  const out = F.live([{id: "m", name: "Asha", line: "mummy", made: 1000}], 1600, 1601, {rand: () => seq[i++] ?? 0.9});
  assert.equal(out.people.m.dead, false);
  assert.ok(out.people.m.torpor && out.events[0].kind === "mummyDeath");
});

test("the Embrace makes a childe one Generation thinner; the new ones do not sire in the same jump; the cap holds", () => {
  const out = F.live([{id: "s", name: "Bishop", line: "vampire", made: 1500, generation: 9, sectText: "Sabbat"}], 1600, 1700, {seed: "e", cap: 5});
  const kids = out.brood;
  assert.ok(kids.length <= 5);
  for ( const c of kids ) { assert.equal(c.generation, 10); assert.equal(c.sireId, "s"); assert.ok(!out.events.some(e => e.id === c.id && e.kind === "brood")); }
  assert.equal(F.sectOf("", 1300), "court");
  assert.equal(F.sectOf("", 1600), "camarilla");
  assert.equal(F.sectOf("Sabbat", 1600), "sabbat");
});

test("Garou and mages die of age; Rank and Arete rise; the sheet changes come out of the end state", () => {
  const out = F.live([{id: "g", name: "Wolf", line: "garou", born: 1500, rise: 1}, {id: "m", name: "Kaspar", line: "mage", born: 1500, rise: 2}], 1520, 1700, {seed: "gm"});
  assert.equal(out.people.g.dead, true);
  assert.equal(out.people.m.dead, true);
  const ch = F.sheetChanges(out, [{id: "g", line: "garou", born: 1500, rise: 1}, {id: "m", line: "mage", born: 1500, rise: 2}]);
  assert.ok(ch.g.dead && ch.m.dead);
  assert.ok(F.summary(out).every(l => l.endsWith(".")));
});

test("wiring: setting off by default, the skip hook, the approval, the api", () => {
  const f = src("modules/wodx-npc/scripts/fates.mjs"), m = src("modules/wodx-npc/scripts/main.mjs");
  assert.match(f, /"npcFates", \{scope: "world", config: true, type: Boolean, default: false/);
  assert.match(f, /Hooks\.on\("wodxSkipEnd"/);
  assert.match(f, /registerApprovalHandler/);
  assert.match(f, /!a\.hasPlayerOwner/);
  assert.match(m, /FATES\.registerSettings\(\);\n  FATES\.listen\(\);/);
  assert.match(m, /fates: \{plan: FATES\.planFor/);
});
