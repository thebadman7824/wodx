import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Influence over institutions (B3355-B3360) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const I = await imp("modules/wodx-storyteller/scripts/institution-rules.mjs");
const R = await imp("modules/wodx-storyteller/scripts/tasks-rules.mjs");

test("institutions: what a town has depends on its year and size", () => {
  assert.deepEqual(I.kindsFor(1200, 500).sort(), ["council", "watch", "worship"]);
  assert.ok(I.kindsFor(1400, 12000).includes("university") && I.kindsFor(1400, 12000).includes("guild") && !I.kindsFor(1400, 12000).includes("press"));
  assert.ok(!I.kindsFor(1900, 12000).includes("guild") && I.kindsFor(1900, 12000).includes("company"));
  assert.equal(I.labelOf("watch", 1700), "Watch");
  assert.equal(I.labelOf("watch", 1900), "Police");
  assert.equal(I.labelOf("press", 1600), "Print shop");
  assert.equal(I.labelOf("press", 1900), "Newspaper");
  assert.equal(I.labelOf("press", 2005), "News site");
  assert.equal(I.ranksOf("worship", 1300, "islamic")[4], "Mufti");
  assert.equal(I.ranksOf("worship", 1300, "nonsense")[0], "Helper");
  assert.equal(I.ranksOf("council", 1900)[4], "Mayor");
  for ( const k of Object.keys(I.KINDS) ) assert.equal(I.ranksOf(k, 1500).length, I.RANKS, k);
});

test("institutions: towns open and close them with the years", () => {
  let r = I.reconcile([], {town: "brno", year: 1400, people: 6000, name: "Brno"});
  assert.ok(r.list.some(i => i.kind === "guild"));
  assert.ok(r.events.every(e => e.kind === "opened"));
  r = I.reconcile(r.list, {town: "brno", year: 1870, people: 6000, name: "Brno"});
  assert.ok(r.list.find(i => i.kind === "guild").closed === 1870);
  assert.ok(r.list.some(i => i.kind === "press" && !i.closed));
  const again = I.reconcile(r.list, {town: "brno", year: 1870, people: 6000, name: "Brno"});
  assert.equal(again.events.length, 0, "nothing new the second time");
});

test("institutions: climbing takes the next seat, bumps the newest when full, and pawns stop at Influence", () => {
  let inst = I.normInst({id: "x", kind: "council", town: "t"});
  assert.equal(inst.seats.length, 16);
  let r = I.promote(inst, {id: "pc", name: "Ada"}, {at: 1});
  assert.equal(r.to, 0);
  r = I.promote(r.inst, {id: "pc", name: "Ada"}, {at: 2});
  assert.equal(r.to, 1);
  assert.equal(I.bestSeat(r.inst, "pc").rank, 1);
  assert.equal(r.inst.seats.filter(s => s.holder?.id === "pc").length, 1, "the old seat is given up");
  let top = I.normInst({id: "y", kind: "council", seats: I.blankSeats().map(s => (s.rank === 4 ? {...s, holder: {id: "m", name: "Mayor"}, since: 5} : s))});
  top = I.promote(top, {id: "pc", name: "Ada"}, {at: 9}).inst;
  for ( let k = 0; k < 3; k++ ) top = I.promote(top, {id: "pc", name: "Ada"}, {at: 9}).inst;
  const last = I.promote(top, {id: "pc", name: "Ada"}, {at: 10});
  assert.equal(last.to, 4);
  assert.equal(last.bumped.name, "Mayor");
  assert.ok(last.inst.seats.some(s => s.rank === 3 && s.holder?.id === "m"), "the one bumped drops a rank");
  assert.match(I.promote(last.inst, {id: "pc", name: "Ada"}).why, /top/);
  assert.equal(I.pawnCap(2), 1);
  assert.equal(I.pawnCap(0), -1);
  const p = I.promote(I.normInst({kind: "watch"}), {id: "g", name: "Ghoul", pawnOf: "pc"}, {cap: I.pawnCap(0)});
  assert.match(p.why, /Influence/);
  assert.equal(I.climbGoal(0), 5);
  assert.equal(I.climbGoal(4), 17);
});

test("institutions: levers by rank, control by faction, and the month", () => {
  assert.deepEqual(I.leversFor("press", 0), []);
  assert.deepEqual(I.leversFor("press", 2).map(l => l.key), ["rumour", "print"]);
  let inst = I.normInst({kind: "watch", seats: I.blankSeats()});
  const npcs = [{id: "a", name: "A", faction: "Guild"}, {id: "b", name: "B", faction: "Guild"}, {id: "c", name: "C", faction: "Church"}];
  const r = I.monthTurn(inst, {npcs, rand: () => 0.1, at: 5});
  assert.equal(r.inst.seats.filter(s => s.holder).length, 3, "one empty seat each for those free");
  assert.equal(I.control(r.inst)[0].who, "Guild");
  const pcSeat = I.normInst({kind: "watch", seats: I.blankSeats().map(s => (s.rank === 3 ? {...s, holder: {id: "pc", name: "Ada"}} : s))});
  const m = I.monthTurn(pcSeat, {isPc: id => id === "pc", rand: () => 0.01});
  const ev = m.events.find(e => e.kind === "scandal");
  assert.ok(ev && ev.pc, "a scandal on a player character's seat waits for the Storyteller");
  assert.ok(m.inst.seats.some(s => s.holder?.id === "pc"), "and leaves them seated until then");
  assert.equal(I.monthTurn({...pcSeat, closed: 1900}, {rand: () => 0}).events.length, 0);
});

test("institutions: climbing is a downtime project, and the press and pulpit start tales", () => {
  assert.ok(R.KINDS.climb && R.KINDS.climb.target);
  assert.equal(R.normTask({kind: "climb", institution: "brno:watch"}).institution, "brno:watch");
  const s = src("modules/wodx-storyteller/scripts/institutions.mjs");
  assert.match(s, /Hooks\.on\("wodxTaskDone"/);
  assert.match(s, /Rumours\.startTale\(/);
  assert.match(s, /propose\?\.\(\{type: T_LEVER/);
  assert.match(src("modules/wodx-storyteller/scripts/main.mjs"), /institutions: Inst\.api\(\)/);
  assert.match(src("modules/wodx-npc/scripts/memory.mjs"), /institutions\?\.seatsOf\?\.\(/);
});
