import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* Responsive maps, the world's side: marks and repairs (WoDX NPC), wrongs against a faction, and map beats and log lines (WoDX Storyteller). Pure rules. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const AR = await import(join(root, "modules/wodx-npc/scripts/alert-rules.mjs"));
const F = await import(join(root, "modules/wodx-npc/scripts/faction-rules.mjs"));
const W = await import(join(root, "modules/wodx-storyteller/scripts/world-rules.mjs"));
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const streamFor = key => G.stream("test-seed", key);

const ev = (o = {}) => ({kind: "force", scene: "keep", place: "Scene.keep", at: 1000, noise: "loud", who: "Scene.keep.Token.t1", whoName: "Anna",
  object: "w1", objectName: "The cellar door", objectType: "Wall", state: "forced", heard: ["Scene.keep.Token.t2"], message: "m1", undone: false, ...o});

test("marks: a forced door or a broken pane in an owned place is put right at the next dawn; nothing else is", () => {
  const m = AR.markFor(ev(), {owned: true, toDawn: () => 5000});
  assert.deepEqual([m.id, m.object, m.objectType, m.kind, m.repairAt], ["m1", "w1", "Wall", "force", 6000]);
  assert.equal(AR.markFor(ev(), {owned: false}).repairAt, null, "no one lives there: it stays");
  assert.equal(AR.markFor(ev({kind: "break", state: "breached"}), {owned: true}), null, "a wall broken through needs the Storyteller");
  for ( const kind of ["theft", "fire", "desecrate", "open", "noise"] ) assert.equal(AR.markFor(ev({kind}), {owned: true}), null, kind);
  assert.equal(AR.markFor(ev({undone: true}), {owned: true}), null);
  assert.equal(AR.markFor(ev(), {owned: true, toDawn: () => 0}).repairAt, 1060, "at least a minute");
  const marks = [m, AR.markFor(ev({message: "m2", at: 9000}), {owned: true, toDawn: () => 5000}), AR.markFor(ev({message: "m3"}))];
  assert.deepEqual(AR.dueMarks(marks, 6000).map(x => x.id), ["m1"]);
  assert.deepEqual(AR.dueMarks(marks, 99999).map(x => x.id), ["m1", "m2"]);
});

test("wrongs: kept on the state, counted since a time, and a wronged faction looks to its defences", () => {
  const base = {factions: [{id: "court", name: "The court", kind: "kindred", places: ["keep"], assets: {domain: 3}}, {id: "council", name: "The council", kind: "mortal", places: ["square"]}]};
  const s0 = F.normState(base);
  assert.deepEqual(s0.wrongs, []);
  const s1 = F.normState({...base, wrongs: [{id: "m1", at: 1000, faction: "court", kind: "theft", place: "keep", by: "Anna", what: "A chest"}, {faction: "court", kind: "nonsense"}, {kind: "fire"}]});
  assert.equal(s1.wrongs.length, 2, "one with no faction is dropped");
  assert.equal(s1.wrongs[1].kind, "break", "an unknown kind reads as something broken");
  assert.equal(F.wrongsSince(s1, "court", 0).length, 2);
  assert.equal(F.wrongsSince(s1, "court", 500).length, 1, "one with no time counts as long ago");
  assert.equal(F.wrongsSince(s1, "court", 1500).length, 0);
  assert.equal(F.wrongsSince(s1, "council", 0).length, 0);
  let d0 = 0, d1 = 0;
  for ( let i = 0; i < 300; i++ ) {
    if ( F.pickMove(s0, s0.factions[0], streamFor(`w${i}`), {turn: 1, since: 0}).move === "defend" ) d0++;
    if ( F.pickMove(s1, s1.factions[0], streamFor(`w${i}`), {turn: 1, since: 0}).move === "defend" ) d1++;
  }
  assert.ok(d1 > d0 + 40, `defend ${d1} against ${d0}`);
  for ( const k of Object.keys(F.WRONG_KINDS) ) assert.ok(!/—/.test(F.WRONG_KINDS[k]));
});

test("map beats: the scene, then the kind or the new state; a character's own beat only for them", () => {
  const b = W.normBeat({id: "b1", name: "The cellar", on: "map", place: "Scene.keep", value: "force"});
  assert.equal(b.on, "map");
  const e = {type: "map", actor: "anna", place: "Scene.keep", kind: "force", state: "forced"};
  assert.equal(W.beatFires(b, e), true);
  assert.equal(W.beatFires({...b, value: "forced"}, e), true, "the state matches too");
  assert.equal(W.beatFires({...b, value: null}, e), true, "blank: any change");
  assert.equal(W.beatFires({...b, value: "theft"}, e), false);
  assert.equal(W.beatFires(b, {...e, place: "Scene.mill"}), false);
  assert.equal(W.beatFires({...b, place: null}, {...e, place: "Scene.mill"}), true, "no place: anywhere");
  assert.equal(W.beatFires({...b, actor: "bo"}, e), false);
  assert.equal(W.beatFires(b, {...e, type: "place"}), false);
  assert.equal(W.beatFires({...b, fired: true}, e), false);
});

test("map log lines: what a character did, in a sentence; noise nobody heard and small changes stay out", () => {
  const e = W.mapEntry({...ev(), objectName: "The cellar door"});
  assert.equal(e.id, "map:m1");
  assert.equal(e.kind, "world");
  assert.equal(e.text, "Anna forced the cellar door (heard by 1).");
  assert.equal(e.attention, "A change on the map");
  assert.equal(W.mapEntry(ev({kind: "open", heard: []})).text, "Anna opened the cellar door.");
  assert.equal(W.mapEntry(ev({kind: "open"})).attention, null);
  assert.equal(W.mapEntry(ev({kind: "noise", heard: []})), null);
  assert.ok(W.mapEntry(ev({kind: "noise"})));
  for ( const kind of ["hazard", "holy", "light", "dark"] ) assert.equal(W.mapEntry(ev({kind})), null, kind);
  assert.equal(W.mapEntry(ev({undone: true})), null);
  for ( const kind of ["noise", "open", "force", "break", "alarm", "theft", "fire", "fireOut", "desecrate", "trap", "disarm", "found", "use"] ) {
    const t = W.mapEntry(ev({kind})).text;
    assert.ok(!/—|\b(he|she|him|her|his)\b/i.test(t), t);
  }
});
