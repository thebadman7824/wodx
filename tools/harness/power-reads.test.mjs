import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath, pathToFileURL} from "node:url";

/*
 * B6000-B6016 (Ben 2026-11-15): a power or ritual must DO what its card says, not leave a marker nothing reads. Before
 * this guard, a Ward put "Warded" on the sheet and no soak read it; a Curse put "Cursed" there and no roll read it; a
 * talisman, a banishing or a Gauntlet rite was a line of text. The powers inventory counted all of them as applying.
 * This test fails when any applying power's result is a marker no system reads, or when a reader goes away.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const imp = p => import(pathToFileURL(path.join(root, p)).href);
const RR = await imp("tools/powers/read-rules.mjs");
const PM = await imp("modules/wodx-actions/scripts/power-mods.js");
const PW = await imp("modules/wodx-actions/scripts/power-effects.js");
const BR = await imp("modules/wodx-actions/scripts/book-rituals.js");
const E = await imp("modules/wodx-actions/scripts/effects-rules.js");
const MH = await imp("modules/wodx-actions/scripts/mummy-hekau.js");

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "wodx-reads-")), "inv.json");
execFileSync(process.execPath, [path.join(root, "tools/powers/inventory.mjs"), "--out", out]);
const inv = JSON.parse(fs.readFileSync(out, "utf8"));

/** Ceilings: never raise. Kiss of Lachesis's sight of the future is the Storyteller's to tell (Time keyword). */
const MOST_PARTLY = 1, MOST_TOLD = 1;

test("no applying power leaves only a marker that nothing reads", () => {
  const unread = inv.rows.filter(r => r.read === "unread").map(r => `${r.line}: ${r.name}`);
  assert.deepEqual(unread, [], `unread: ${unread.slice(0, 12).join("; ")}`);
  assert.ok((inv.reads.partly ?? 0) <= MOST_PARTLY, `partly read rose to ${inv.reads.partly}`);
  assert.ok((inv.reads.told ?? 0) <= MOST_TOLD, `text-only applying powers rose to ${inv.reads.told}`);
  assert.ok((inv.reads.read ?? 0) >= 2200, `only ${inv.reads.read} powers read`);
});

test("every reader the guard counts on is still in the code", () => {
  for ( const [file, words] of RR.READERS ) {
    const text = fs.readFileSync(path.join(root, file), "utf8");
    assert.ok(text.includes(words), `${file} no longer reads: ${words}`);
  }
});

test("every timed keyword is read, and every other keyword has a real kind", () => {
  for ( const key of Object.keys(E.KEYWORDS) ) {
    const o = E.outcome(key, {ok: true, strength: 3, duration: 1, targets: 0}, {});
    if ( !o ) continue;
    const r = RR.readOf(key, o);
    if ( ["time", "free"].includes(key) ) assert.equal(r, "told", key);
    else assert.equal(r, "read", `${key} (${o.kind}) is ${r}`);
  }
});

test("a Ward is armour on soak, against its own kind of harm only", () => {
  const ward = (dice, against) => ({id: "w", name: "Warded", key: PM.KEYS.ward, data: {dice, ...(against ? {against} : {})}});
  assert.equal(PM.modsFrom([ward(3)], {soak: true, harm: {type: "lethal"}}).dice, 3);
  assert.equal(PM.modsFrom([ward(3, "fire")], {soak: true, harm: {type: "aggravated", of: "fire"}}).dice, 3);
  assert.equal(PM.modsFrom([ward(3, "fire")], {soak: true, harm: {type: "lethal"}}).dice, 0);
  assert.equal(PM.modsFrom([ward(3)], {tags: ["dexterity"]}).dice, 0, "a Ward is not a roll bonus");
  assert.equal(PM.modsFrom([ward(2), {...ward(4), id: "x"}], {soak: true}).dice, 4, "the stronger Ward counts");
});

test("a Boost reaches its kind of roll; a Blessing or Curse is spent on the next roll; a Calm eases frenzy", () => {
  const b = {id: "b", name: "Boosted", key: PM.KEYS.boost, data: {dice: 2, on: "physical"}};
  assert.equal(PM.modsFrom([b], {tags: ["dexterity", "melee"]}).dice, 2);
  assert.equal(PM.modsFrom([b], {tags: ["social"]}).dice, 0);
  assert.equal(PM.modsFrom([{...b, data: {dice: 2, on: "soak"}}], {soak: true}).dice, 2);
  const c = {id: "c", name: "Cursed", key: PM.KEYS.fortune, data: {shift: 2, once: true}};
  const m = PM.modsFrom([c], {tags: ["perception"]});
  assert.equal(m.diff, 2); assert.deepEqual(m.once, ["c"]);
  const k = {id: "k", name: "Calmed", key: PM.KEYS.calm, data: {shift: -2}};
  assert.equal(PM.modsFrom([k], {tags: ["frenzy"], frenzy: true}).diff, -2);
  const h = {id: "h", name: "Hastened", key: PM.KEYS.hasten, data: {actions: 1}};
  assert.equal(PM.modsFrom([h], {actions: true}).dice, 1);
  assert.equal(PM.modsFrom([{...h, data: {actions: 2, slow: true}}], {initiative: true}).dice, -4);
});

test("the numbers ride in the effect", () => {
  const [w] = E.stOutcomes(["ward"], {strength: 3, ctx: {fire: true}});
  assert.deepEqual(PM.timedData(w.out), {dice: 3, against: "fire"});
  const [f] = E.stOutcomes(["fortune"], {strength: 2, ctx: {curse: true}});
  assert.deepEqual(PM.timedData(f.out), {shift: 2, once: true});
  assert.equal(PM.keyFor({key: "fear", name: "Calmed"}), PM.KEYS.calm, "a Calm is not a Fear that holds the token away");
});

test("book rituals: no keyword is dropped, a flavour lands, a self-cast Calm works", () => {
  for ( const [set, b] of Object.entries(BR.BOOK_RITUALS) ) for ( const r of b.list ) {
    for ( const k of r.k ?? [] ) assert.ok(BR.knownKeyword(k), `${set} ${r.n}: ${k}`);
    assert.ok(BR.ritualResults(r, 3, {hasTarget: !/^self/i.test(r.who)}).length > 0, `${set} ${r.n} does nothing`);
  }
  const jackal = BR.BOOK_RITUALS.w20.list.find(r => r.n === "Voice of the Jackal");
  assert.ok(BR.ritualResults(jackal, 2, {hasTarget: true}).some(x => x.out.name === "Cursed" && x.out.shift > 0), "Voice of the Jackal curses");
  const rush = BR.BOOK_RITUALS.v20.list.find(r => r.n === "Blood Rush");
  assert.ok(BR.ritualResults(rush, 2, {hasTarget: false}).some(x => x.out.name === "Calmed" && x.who === "self"), "Blood Rush calms the caster");
  const haven = BR.BOOK_RITUALS.v20.list.find(r => r.n === "Defense of the Sacred Haven");
  assert.ok(BR.ritualResults(haven, 2, {hasTarget: false}).some(x => x.out.against === "sunlight"), "the haven is warded against the sun");
  assert.ok(BR.bookRitual("v20", BR.BOOK_RITUALS.v20.list.indexOf(rush)), "the Storyteller's window takes a flavoured ritual");
});

test("Hekau: a figurine is a summoning, a ward has dice, a salve gives sight", () => {
  assert.ok(MH.hekauResults("simple-servitor", 3, {name: "Simple Servitor"}).some(r => r.out.kind === "summon"));
  assert.ok(MH.hekauResults("wood-ward", 3, {name: "Wood Ward"}).some(r => r.key === "ward" && r.out.dice > 0) || !MH.SPELLS["wood-ward"]);
  assert.ok(MH.hekauResults("eyes-of-the-ka", 3, {name: "Eyes of the Ka"}).some(r => r.out.vision));
});

test("the keywords that were text now change the world", () => {
  const one = k => E.stOutcomes([k], {strength: 3})[0].out;
  assert.equal(one("banish").kind, "banish");
  assert.equal(one("place").kind, "place");
  assert.equal(one("work").kind, "work");
  assert.equal(one("imbue").kind, "give");
  assert.equal(one("sway").kind, "timed");
  assert.equal(PW.moodDelta("bind", {}), 2, "a binding warms an NPC to the one who bound it");
});

test("a Forbiddance keeps the being off the mummy; shadow soul sends the body's moves to the Storyteller (B6018)", async () => {
  const B = await imp("modules/wodx-actions/scripts/binds.js");
  const shadow = {flags: {"wodx-chronicle": {timed: {key: "wodx-kote-soul"}}}, statuses: new Set(["wodx-shadow-soul"])};
  const fire = {flags: {"wodx-chronicle": {timed: {key: "wodx-kote-soul"}}}, statuses: new Set(["wodx-frenzy"])};
  assert.deepEqual(B.bindingsOn({effects: [shadow]}).map(b => b.rule), ["ask"]);
  assert.deepEqual(B.bindingsOn({effects: [fire]}), []);
  assert.equal(B.judgeMove(B.bindingsOn({effects: [shadow]}), {from: {x: 0, y: 0}, to: {x: 100, y: 0}}).ask, true);
  const mummy = fs.readFileSync(path.join(root, "modules/wodx-actions/scripts/mummy.js"), "utf8");
  assert.match(mummy, /"flags\.wodx-actions\.bindBy": actor\.id, "flags\.wodx-actions\.forbiddenBy": actor\.id/);
  const combat = fs.readFileSync(path.join(root, "modules/wodx-combat/scripts/main.js"), "utf8");
  assert.equal((combat.match(/if \(forbiddenFrom\(attacker, target\)\)/g) ?? []).length, 2, "both the player's and the NPC's attack check a Forbiddance");
});
