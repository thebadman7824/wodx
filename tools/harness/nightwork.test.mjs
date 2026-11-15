import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The night's work (B6220-B6229): what the Hand did, listed and taken back in one Undo. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/nightwork-rules.mjs")));
const src = p => readFileSync(join(root, p), "utf8");

/** A small world of plain documents, changed the way Foundry changes them, for the rules to read. */
function world() {
  const docs = new Map();
  const settings = new Map();
  const get = (o, p) => p.split(".").reduce((c, k) => c?.[k], o);
  const apply = (o, changes) => {
    for ( const [k, v] of Object.entries(changes) ) {
      const keys = k.split(".");
      let c = o;
      for ( const x of keys.slice(0, -1) ) { c[x] ??= {}; c = c[x]; }
      const last = keys.at(-1);
      if ( last.startsWith("-=") ) delete c[last.slice(2)]; else c[last] = structuredClone(v);
    }
  };
  return {
    docs, settings,
    make(uuid, source) { docs.set(uuid, {source: structuredClone(source), lastBy: "gm", lastAt: 0}); },
    /** Change a document as the Hand does, writing the op as nightwork.mjs's hooks would. */
    hand(uuid, changes, t, by = "gm") {
      const d = docs.get(uuid);
      const paths = R.pathsOf(changes);
      const {set, gone} = R.beforeOf(d.source, paths);
      apply(d.source, changes);
      d.lastBy = by; d.lastAt = t;
      return {t, doc: "Actor", uuid, name: uuid, act: "update", set, gone, after: R.afterOf(d.source, paths), by};
    },
    player(uuid, changes, t, by = "p1") { const d = docs.get(uuid); apply(d.source, changes); d.lastBy = by; d.lastAt = t; },
    revert(op, skip) { apply(docs.get(op.uuid).source, R.revertUpdate(op, {skip})); },
    look(op) {
      if ( op.act === "setting" ) return {exists: settings.has(op.key), value: settings.get(op.key)};
      const d = docs.get(op.uuid);
      return d ? {exists: true, source: d.source, lastBy: d.lastBy, lastAt: d.lastAt} : {exists: false};
    },
    get
  };
}

test("an update is written with what each field held before and after", () => {
  const W = world();
  W.make("Actor.a", {system: {blood: {value: 10}}, flags: {}});
  const op = W.hand("Actor.a", {"system.blood.value": 7, "flags.wodx-npc.mood": {anger: 2}}, 1000);
  assert.deepEqual(op.set, {"system.blood.value": 10});
  assert.deepEqual(op.gone, ["flags.wodx-npc"], "a field that was not there is removed whole, at its shallowest missing part");
  assert.equal(op.after["system.blood.value"], 7);
  W.revert(op, []);
  assert.deepEqual(W.docs.get("Actor.a").source, {system: {blood: {value: 10}}, flags: {}});
});

test("Foundry's remove and replace marks and plain nested objects give plain paths", () => {
  assert.deepEqual(R.pathsOf({"flags.x.-=old": null}), ["flags.x.old"]);
  assert.deepEqual(R.pathsOf({system: {a: 1, b: {c: 2}}, _stats: {modifiedTime: 3}}), ["system.a", "system.b.c"]);
  assert.deepEqual(R.pathsOf({"system.==list": [1]}), ["system.list"]);
  assert.deepEqual(R.revertUpdate({set: {"system.a": 1}, gone: ["flags.w.x"]}), {"system.a": 1, "flags.w.-=x": null});
});

test("one Undo takes back two pieces of work newest first, so the oldest value comes back", () => {
  const W = world();
  W.make("Actor.a", {system: {hp: 7}});
  const e1 = {id: "e1", at: 1000, ops: [W.hand("Actor.a", {"system.hp": 5}, 1000)]};
  const e2 = {id: "e2", at: 2000, ops: [W.hand("Actor.a", {"system.hp": 2}, 2000)]};
  const order = R.orderOps([e1, e2], ["e1", "e2"]);
  assert.deepEqual(order.map(s => s.entry), ["e2", "e1"]);
  for ( const s of order ) {
    const a = R.stepAction(s.op, W.look(s.op), {keep: true});
    assert.equal(a.action, "revert", "a value only the Hand changed is taken back");
    W.revert(s.op, a.skip);
  }
  assert.equal(W.docs.get("Actor.a").source.system.hp, 7);
});

test("a field a player changed since is kept unless the Storyteller says to put it back", () => {
  const W = world();
  W.make("Actor.a", {system: {hp: 7, xp: 0}});
  const op = W.hand("Actor.a", {"system.hp": 4, "system.xp": 3}, 1000);
  W.player("Actor.a", {"system.hp": 6}, 5000);
  const c = R.changedSince(op, W.look(op));
  assert.deepEqual(c.paths, ["system.hp"]);
  assert.equal(c.by, "p1");
  const keep = R.stepAction(op, W.look(op), {keep: true});
  assert.deepEqual(keep.skip, ["system.hp"]);
  W.revert(op, keep.skip);
  assert.deepEqual(W.docs.get("Actor.a").source.system, {hp: 6, xp: 0}, "the player's hp stays, the Hand's xp goes");
  const W2 = world();
  W2.make("Actor.a", {system: {hp: 7}});
  const op2 = W2.hand("Actor.a", {"system.hp": 4}, 1000);
  W2.player("Actor.a", {"system.hp": 6}, 5000);
  assert.equal(R.stepAction(op2, W2.look(op2), {keep: true}).action, "kept");
  const all = R.stepAction(op2, W2.look(op2), {keep: false});
  assert.equal(all.action, "revert");
  W2.revert(op2, all.skip);
  assert.equal(W2.docs.get("Actor.a").source.system.hp, 7);
});

test("the list warns of a player's change and names them, and of later Hand work without a warning", () => {
  const W = world();
  W.make("Actor.a", {system: {hp: 7}});
  W.make("Actor.b", {system: {hp: 7}});
  const e1 = {id: "e1", at: 1000, label: "A wound", kind: "auto", ops: [W.hand("Actor.a", {"system.hp": 5}, 1000)]};
  const e2 = {id: "e2", at: 2000, label: "Another", kind: "clock", ops: [W.hand("Actor.a", {"system.hp": 3}, 2000), W.hand("Actor.b", {"system.hp": 1}, 2000)]};
  W.player("Actor.b", {"system.hp": 4}, 9000, "p1");
  const names = id => (id === "p1" ? {name: "Dana", isGM: false} : {name: "you", isGM: true});
  const rows = R.rows({entries: [e1, e2]}, {since: 0, look: op => W.look(op), names});
  assert.deepEqual(rows.map(r => r.id), ["e2", "e1"], "newest first");
  assert.equal(rows[0].playerWarn, 1);
  assert.deepEqual(rows[0].warnBy, ["Dana"]);
  assert.equal(rows[1].warn, 0, "a later piece of the Hand's own work is not a warning");
  assert.equal(rows[1].lines[0].hand, true);
  const html = R.listHTML(rows);
  assert.match(html, /Dana changed one of these since/);
  assert.match(html, /data-action="undo"/);
  assert.match(html, /Keep the later change \(recommended\)/);
});

test("documents the Hand made are removed, ones it removed come back, and one changed by a player since is kept", () => {
  const made = {t: 1000, doc: "Token", uuid: "Scene.s.Token.t", act: "create", by: "gm"};
  assert.equal(R.stepAction(made, {exists: true, lastBy: "gm", lastAt: 1500}).action, "revert");
  assert.equal(R.stepAction(made, {exists: true, lastBy: "p1", lastAt: 9000}, {keep: true}).action, "kept");
  assert.equal(R.stepAction(made, {exists: false}).action, "none");
  const gone = {t: 1000, doc: "Item", uuid: "Actor.a.Item.i", act: "delete", data: {_id: "i", name: "Knife"}};
  assert.equal(R.stepAction(gone, {exists: false}).action, "revert");
  assert.equal(R.stepAction(gone, {exists: true}).action, "none", "already back");
});

test("world settings are taken back by their parts, keys with dots and all", () => {
  const before = {state: {"Actor.1": {hp: 3}}, other: 1}, after = {state: {"Actor.1": {hp: 2}, "Actor.2": {hp: 1}}, other: 1};
  const op = R.settingOp("wodx-npc.factions", before, after, 1000);
  const now = {state: {"Actor.1": {hp: 2}, "Actor.2": {hp: 1}}, other: 9};
  assert.deepEqual(R.revertSetting(op, now).value, {state: {"Actor.1": {hp: 3}}, other: 9}, "a part the Hand did not touch stays as it is now");
  const later = {state: {"Actor.1": {hp: 8}, "Actor.2": {hp: 1}}, other: 1};
  const c = R.changedSince(op, {exists: true, value: later});
  assert.equal(c.paths.length, 1);
  const a = R.stepAction(op, {exists: true, value: later}, {keep: true});
  assert.deepEqual(R.revertSetting(op, later, {skip: a.skip}).value, {state: {"Actor.1": {hp: 8}}, other: 1});
  const plain = R.settingOp("wodx-x.on", false, true);
  assert.equal(plain.whole, true);
  assert.deepEqual(R.revertSetting(plain, true), {value: false, had: true});
  assert.equal(R.settingOp("wodx-x.on", true, true), null);
  for ( const k of ["core.time", "wodx-chronicle.nightWork", "wodx-chronicle.approvals", "wodx-solo.log"] ) assert.ok(R.skipSetting(k), k);
  assert.ok(!R.skipSetting("wodx-npc.factions"));
});

test("the journal keeps inside its caps, marks work too big to take back, and a card loses its buttons", () => {
  let j = R.normJournal(null);
  const caps = {...R.CAPS, entries: 3, opsPerEntry: 2};
  for ( let i = 0; i < 5; i++ ) j = R.addEntry(j, {id: `e${i}`, at: 1000 + i, ops: [{t: 1, act: "create"}, {t: 2, act: "create"}, {t: 3, act: "create"}]}, {now: 2000, caps});
  assert.deepEqual(j.entries.map(e => e.id), ["e2", "e3", "e4"]);
  assert.ok(j.entries.every(e => e.tooBig && e.ops.length === 2));
  const rows = R.rows(j, {since: 0, look: () => ({exists: true})});
  assert.ok(rows.every(r => !r.canUndo), "work too big to keep whole is not offered for Undo");
  const old = R.addEntry(R.normJournal(null), {id: "old", at: 0, ops: [{t: 0, act: "create"}]}, {now: 40 * 24 * 3600e3});
  assert.equal(old.entries.length, 0, "older than 30 days goes");
  const card = R.takenBackCard('<div><p>Done</p><button type="button" data-action="x">Undo</button></div>');
  assert.doesNotMatch(card, /<button/);
  assert.match(card, /Taken back with the night's work/);
  assert.match(R.summary([{entry: "a", action: "revert", skip: []}, {entry: "a", action: "kept", skip: ["x"]}]), /1 piece .* 1 change put back; 1 left as they are now/);
});

test("since: the session mark, the last hour and a time of the Storyteller's choosing", () => {
  const now = 10 * 3600e3;
  assert.equal(R.sinceMs("hour", {now}), now - 3600e3);
  assert.equal(R.sinceMs("session", {now, session: 5000}), 5000);
  assert.equal(R.sinceMs("session", {now, session: null}), now - 24 * 3600e3);
  assert.equal(R.sinceMs("time", {now, time: 1234}), 1234);
  assert.equal(R.sinceMs("all", {now}), 0);
});

test("the wiring: approvals carried out, the clock, the seat's choices, the hand tool and the solo tools", () => {
  const ap = src("modules/wodx-chronicle/scripts/approvals.mjs");
  assert.match(ap, /recordNight\(entry\.title, \(\) => handler\?\.approve\?\.\(entry\)/);
  assert.match(ap, /export async function markTakenBack/);
  const nw = src("modules/wodx-chronicle/scripts/nightwork.mjs");
  for ( const h of ["preUpdate${type}", "preCreate${type}", "preDelete${type}", "updateWorldTime", "createChatMessage"] ) assert.ok(nw.includes(h), h);
  assert.match(nw, /hand\.addTool\(\{key: "nightWork"/);
  assert.match(nw, /wodxNightUndo: true/, "the Undo's own changes are never written down as the Hand's");
  const main = src("modules/wodx-chronicle/scripts/main.mjs");
  assert.match(main, /nightwork: nightwork\.api\(\)/);
  assert.match(main, /nightwork\.registerNightSettings\(\)/);
  const solo = src("modules/wodx-solo/scripts/main.mjs");
  assert.match(solo, /function seatClick/);
  assert.doesNotMatch(solo, /\bel\.click\(\);\s*\n\s*return log/, "every seat click goes through seatClick");
  const st = src("modules/wodx-solo/scripts/st-tools.mjs");
  assert.match(st, /"ask\.st\.nightUndo": nightUndo/);
  assert.ok(R.DOC_TYPES.includes("Token") && R.DOC_TYPES.includes("Setting") && R.DOC_TYPES.includes("ActorDelta"));
});
