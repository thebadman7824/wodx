import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

// WoDX NPC 0.60.0, Sheets 0.18.1: past lives, lines of teaching, the web, scene ideas and who sees what (B2835-B2839).
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const imp = p => import(pathToFileURL(join(root, p)));
const LR = await imp("modules/wodx-npc/scripts/legacy-rules.mjs");
const TR = await imp("modules/wodx-npc/scripts/ties-rules.mjs");
const DAY = 86400;

test("past lives: a tie to an undying person or a later family line, hidden until recalled, then shown to the one who recalled it", () => {
  const actors = [
    {id: "m", name: "Mira", type: "Mage", flags: {"wodx-npc": {pastLives: [{id: "p1", name: "Agnes of Brno", year: 1340, ties: [{id: "k", name: "Old Count", kind: "lover"}, {line: "L1", name: "Jan", kind: "friend"}]}]}}},
    {id: "k", name: "The Count", type: "Vampire"}, {id: "d", name: "Petr", type: "Mortal"}];
  const lines = [{id: "L1", members: [{id: "m0", founder: true, actorId: "x"}, {id: "m3", actorId: "d", name: "Petr", gen: 3}]}];
  const e = TR.edges(actors, {lines});
  const toCount = e.find(x => x.from === "m" && x.kind === "pastLife" && x.to.id === "k");
  assert.ok(toCount && toCount.hidden); assert.match(toCount.note, /Agnes of Brno, 1340: lover/);
  assert.ok(e.some(x => x.from === "k" && x.kind === "pastLifeOf" && x.hidden));
  assert.ok(e.some(x => x.from === "m" && x.kind === "pastLife" && x.to.id === "d" && /descendant/.test(x.note)));
  const player = {gm: false, mine: new Set(["m"]), found: new Set()};
  assert.equal(TR.visibleTo(toCount, player), false, "not yet recalled");
  actors[0].flags["wodx-npc"].pastLives[0].recalled = {m: 5};
  const after = TR.edges(actors, {lines}).find(x => x.from === "m" && x.kind === "pastLife" && x.to.id === "k");
  assert.equal(TR.visibleTo(after, player), true, "recalled, so the player sees it");
  assert.equal(TR.visibleTo(after, {gm: false, mine: new Set(["z"])}), false);
  assert.deepEqual(LR.recallRoll(4), {pool: 4, difficulty: 6}); assert.equal(LR.recallRoll(0).pool, 0);
  assert.equal(LR.backgroundFor("changeling", ["Remembrance"]).name, "Remembrance");
});

test("teaching: what each line teaches, how each age teaches, and the line up and down", () => {
  for ( const l of ["vampire", "werewolf", "mage", "changeling", "wraith", "hunter", "mummy", "demon", "kueijin", "mortal"] ) assert.ok(LR.TEACHABLE[l], l);
  assert.match(LR.teachingFor(1197).text, /master/); assert.match(LR.teachingFor(1400).text, /Guild/); assert.match(LR.teachingFor(2010).text, /net/); assert.match(LR.teachingFor(2200).text, /net/);
  const edges = [{from: "s", kind: "mentor", to: {id: "t", name: "T"}}, {from: "t", kind: "mentor", to: {id: "g", name: "G"}}, {from: "g", kind: "mentor", to: {id: "s", name: "S"}},
    {from: "t", kind: "apprentice", to: {id: "s", name: "S"}}, {from: "s", kind: "apprentice", to: {id: "s2", name: "S2"}}];
  const l = LR.teachingLine(edges, "t");
  assert.deepEqual(l.up.map(x => x.id), ["g", "s"], "up the line, and a cycle stops when it comes back");
  assert.deepEqual(l.down.map(x => [x.id, x.depth]), [["s", 1], ["s2", 2]]);
});

test("the web: filtered by group, person, region and year, one link per pair and group", () => {
  const people = {a: {name: "Ana", born: 1300, died: null}, b: {name: "Bo", born: 1320, died: 1360}, c: {name: "Cy", born: 1400, died: null, region: "italy"}};
  const groupOf = k => TR.KINDS[k]?.group ?? "other";
  const edges = [{from: "a", to: {id: "b"}, kind: "friend"}, {from: "b", to: {id: "a"}, kind: "friend"}, {from: "a", to: {id: "c"}, kind: "mentor"}, {from: "b", to: {id: "c"}, kind: "enemy"}];
  const all = LR.webOf(edges, {people, groupOf});
  assert.equal(all.links.length, 3); assert.equal(all.nodes.length, 3);
  assert.equal(LR.webOf(edges, {people, groupOf, year: 1350}).links.length, 1, "in 1350 Cy is not yet born");
  assert.equal(LR.webOf(edges, {people, groupOf, groups: ["teaching"]}).links.length, 1);
  assert.equal(LR.webOf(edges, {people, groupOf, only: "c"}).links.length, 0, "Cy's own list is empty here");
  assert.equal(LR.webOf(edges, {people, groupOf, only: "a"}).links.length, 3);
  const pos = LR.circleLayout(all.nodes);
  assert.equal(Object.keys(pos).length, 3); assert.ok(Object.values(pos).every(p => p.x >= 0 && p.y >= 0));
});

test("scene ideas: boons called in, hostages, feuds boiling over, objections, descendants", () => {
  const ideas = LR.sceneIdeas({now: 0, due: [{id: "e", kind: "boon", due: 3 * DAY, what: "a minor boon", from: {name: "A"}, to: {name: "B"}}, {id: "late", kind: "debt", due: 30 * DAY, what: "x"}],
    held: [{victim: {id: "v", name: "Vi"}, captor: {name: "Cap"}}], feuds: [{id: "f", a: {name: "Kessler"}, b: {name: "Novak"}}],
    objections: [{a: {id: "1", name: "Ana"}, b: {id: "2", name: "Bo"}}], descendants: [{member: "L:m3", name: "Petr", relation: "great-grandchild", founder: "Mira"}]});
  assert.equal(ideas.length, 5);
  assert.match(ideas[0].text, /B calls in the boon A owes/);
  assert.ok(ideas.some(i => /Kessler and Novak/.test(i.text))); assert.ok(ideas.some(i => /Petr, great-grandchild of Mira/.test(i.text)));
});

test("who sees what: trust and warmth only for the one who feels them", () => {
  const e = {from: "a", to: {id: "b"}, kind: "friend", trust: "Trusts", warmth: "Fond"};
  assert.equal(TR.feelingsFor(e, {gm: true}).trust, "Trusts");
  assert.equal(TR.feelingsFor(e, {gm: false, mine: new Set(["a"])}).warmth, "Fond");
  const other = TR.feelingsFor(e, {gm: false, mine: new Set(["b"])});
  assert.equal(other.trust, undefined); assert.equal(other.warmth, undefined); assert.equal(other.kind, "friend");
  // A hidden loyalty found out shows to the finder
  const actors = [{id: "s", name: "Spy", flags: {"wodx-npc": {trueSide: {faction: "f", name: "Sabbat", leader: {id: "l", name: "L"}, found: {pc: 9}}}}}, {id: "l", name: "L"}, {id: "pc", name: "PC"}];
  const spy = TR.edges(actors).find(x => x.kind === "spyFor");
  assert.equal(TR.visibleTo(spy, {gm: false, mine: new Set(["pc"])}), true);
  assert.equal(TR.visibleTo(spy, {gm: false, mine: new Set(["other"])}), false);
});

test("wiring: settings, hooks, handlers, the web button and the API", () => {
  const l = src("modules/wodx-npc/scripts/legacy.mjs"), main = src("modules/wodx-npc/scripts/main.mjs"), people = src("modules/wodx-npc/scripts/people.mjs");
  assert.match(l, /register\(MOD, "sceneIdeas"/); assert.match(l, /Hooks\.on\("updateWorldTime"/); assert.match(l, /registerApprovalHandler\?\.\(T\.ideas/);
  assert.match(l, /searchBox\("\.wnpc-web-people"/); assert.match(l, /wnpc-web-filters" data-fixed/);
  assert.match(main, /LEGACY\.listen\(\);/); assert.match(main, /legacy: \{pastLives: LEGACY\.pastLives/);
  assert.equal((main.match(/LEGACY\.registerHandlers\(\)/g) ?? []).length, 2);
  assert.match(people, /data-web/); assert.match(people, /TR\.feelingsFor\(e, v\)/); assert.match(people, /lines: KIN\.lines\(\)/);
});
