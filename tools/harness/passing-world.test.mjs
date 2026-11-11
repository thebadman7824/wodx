import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Weather in hardship, bodies left behind (Storyteller 0.25.0), standing that spills over and calls to passers-by
   (NPC 0.16.0), and a clue's first look that teaches (Interactables 0.24.0) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const H = await imp("modules/wodx-storyteller/scripts/hardship-rules.mjs");
const RM = await imp("modules/wodx-storyteller/scripts/remains-rules.mjs");
const F = await imp("modules/wodx-npc/scripts/faction-rules.mjs");
const TK = await imp("modules/wodx-npc/scripts/talk-rules.mjs");
const IR = await imp("modules/wodx-interactables/scripts/interact-rules.mjs");

test("hardship: Atmosphere's day sets how harsh it is", () => {
  assert.equal(H.severityFromDay(null), "none");
  assert.equal(H.severityFromDay({tempDay: 18, tempNight: 10, precip: "rain", intensity: "light", wind: "breeze"}), "none");
  assert.equal(H.severityFromDay({tempDay: 2, tempNight: -4, precip: "none", wind: "calm"}), "harsh");
  assert.equal(H.severityFromDay({tempDay: 0, tempNight: -5, precip: "snow", intensity: "moderate", wind: "wind"}), "severe");
  assert.equal(H.severityFromDay({tempDay: -8, tempNight: -14, precip: "snow", intensity: "heavy", wind: "gale"}), "deadly");
  assert.equal(H.severityFromDay({tempDay: 36, tempNight: 22, precip: "none", wind: "calm"}), "severe");
  assert.equal(H.severityFromDay({tempDay: 10, tempNight: 6, precip: "none", wind: "calm", deepSnow: true}), "severe");
  assert.equal(H.AUTO, "auto");
  const s = src("modules/wodx-storyteller/scripts/hardship.mjs");
  assert.match(s, /H\.severityFromDay\(skyFor\(scene\)\)/);
  assert.match(s, /isOutdoor\?\.\(scene\) === false/);
});

test("bodies: stages by warm days, place and temperature", () => {
  assert.equal(RM.stageFor(0).id, "fresh");
  assert.equal(RM.stageFor(3).id, "bloated");
  assert.equal(RM.stageFor(10).id, "rotting");
  assert.equal(RM.stageFor(30).id, "decayed");
  assert.equal(RM.stageFor(100).id, "bones");
  const D = RM.DAY;
  assert.equal(Math.round(RM.warmDays(0, 10 * D, "open")), 10);
  assert.equal(Math.round(RM.warmDays(0, 10 * D, "buried")), 3);
  assert.ok(RM.warmDays(0, 10 * D, "open", () => -5) < 2, "a freezing spell keeps a body");
  assert.ok(RM.warmDays(0, 10 * D, "open", () => 30) > 15, "heat speeds it");
  assert.ok(RM.warmDays(0, 5000 * D, "open") <= RM.MAX_DAYS);
  const r = RM.normRemains({place: "nowhere", cause: "?", found: ["a", 3]}, 50);
  assert.deepEqual([r.since, r.place, r.cause, r.found], [50, "open", "unknown", ["a"]]);
});

test("bodies: what each era learns", () => {
  assert.match(RM.findings(1230, "fresh", "drained").who, /priest/);
  assert.match(RM.findings(1230, "fresh", "drained").drained, /sickness|curse|wolf/);
  assert.match(RM.findings(1650, "bloated").who, /physician/);
  assert.match(RM.findings(1890, "fresh").who, /police/);
  assert.match(RM.findings(1925, "fresh").identity, /Fingerprints/);
  assert.match(RM.findings(1999, "bones").identity, /whatever is left/);
  assert.match(RM.findings(2040, "fresh", "drained").who, /scanners/);
  assert.equal(RM.findings(1999, "rotting", "drained").drained, "");
  assert.ok(RM.heatDue({}, "fresh"));
  assert.ok(!RM.heatDue({heated: true}, "fresh"));
  assert.ok(!RM.heatDue({}, "bones"));
  assert.ok(!RM.heatDue({cause: "sickness"}, "fresh"));
  const U = src("modules/wodx-storyteller/scripts/upkeep-rules.mjs");
  assert.match(U, /body: 2/);
  const m = src("modules/wodx-storyteller/scripts/main.mjs");
  assert.match(m, /remains: \{open: Remains\.remainsDialog/);
  assert.match(src("modules/wodx-storyteller/scripts/remains.mjs"), /default: false/);
});

test("factions: standing spills to friends and enemies", () => {
  const st = F.normState({factions: [
    {id: "a", name: "Prince's court", standing: {}},
    {id: "b", name: "The Toreador", standing: {a: 2}},
    {id: "c", name: "The Anarchs", standing: {a: -3}},
    {id: "d", name: "The guild", standing: {a: 1}},
    {id: "e", name: "Sleepers", standing: {a: 3}, dormant: true}
  ]});
  const ch = F.spillFrom(st, "a", "pc1", -1);
  assert.deepEqual(ch.map(c => [c.faction, c.delta, c.why]), [["b", -1, "friend"], ["c", 1, "enemy"]]);
  assert.deepEqual(F.spillFrom(st, "a", "pc1", 0), []);
  const r = F.applyChanges(st, ch);
  assert.equal(r.state.factions.find(f => f.id === "b").people.pc1, -1);
  assert.equal(r.state.factions.find(f => f.id === "c").people.pc1, 1);
  const back = F.applyChanges(r.state, r.inverse);
  assert.equal(back.state.factions.find(f => f.id === "b").people?.pc1 ?? 0, 0);
  assert.equal(F.sizeOf(ch, {pcActors: new Set(["pc1"])}), "big");
  const s = src("modules/wodx-npc/scripts/factions.mjs");
  assert.match(s, /"spillover"/);
  assert.match(s, /proposeSpill\(r\.faction, actorId, r\.moved\)/);
});

test("talk: a call as someone passes", () => {
  assert.ok(TK.mayCallOut({last: null, now: 100, chance: 0.5, roll: 0.2}));
  assert.ok(!TK.mayCallOut({last: null, now: 100, chance: 0.5, roll: 0.7}));
  assert.ok(!TK.mayCallOut({last: 50, now: 100, chance: 1, roll: 0}), "once a day");
  assert.ok(TK.mayCallOut({last: 0, now: TK.PASS_GAP + 1, chance: 1, roll: 0}));
  assert.equal(TK.passingLine({say: "Evening.", then: {aloud: false}}, "Good day."), "Good day.");
  assert.equal(TK.passingLine({say: "Evening.", then: {aloud: true}}, "Good day."), "Evening.");
  assert.equal(TK.passingLine(null, ""), "");
  const t = src("modules/wodx-npc/scripts/talk.mjs");
  assert.match(t, /"passGreet"[\s\S]{0,400}default: false/);
  assert.match(t, /Hooks\.on\("updateToken", \(doc, changes\) => \{ onPass/);
});

test("clues: the first look that reaches the mark fills the codex once", () => {
  const o = IR.describeClue({clue: true, codexPage: "JournalEntry.x.JournalEntryPage.y", codexAt: 2});
  assert.ok(!IR.codexDue(o, "pc1", 1));
  assert.ok(IR.codexDue(o, "pc1", 2));
  assert.ok(!IR.codexDue({...o, codexed: {pc1: true}}, "pc1", 3));
  assert.ok(!IR.codexDue(IR.describeClue({clue: true}), "pc1", 3));
  assert.equal(IR.cleanClue({clue: true, codexAt: 9}).codexAt, 3);
  assert.match(src("modules/wodx-interactables/scripts/main.mjs"), /await clueCodex\(o, doc, out, actor\)/);
});
