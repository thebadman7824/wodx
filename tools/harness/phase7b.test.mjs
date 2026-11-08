import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* Phase 7b: NPC profiles and combat tactics (WoDX NPC 0.1.0) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const NR = await import(join(root, "modules/wodx-npc/scripts/npc-rules.mjs"));

const foe = (o = {}) => ({id: "pc1", name: "Ilse", visible: true, distance: 2, reach: true, hurtMe: 0, wounds: 0, supernatural: true, fearSources: [], attackDice: 6, ...o});
const top = (p, st) => NR.scoreOptions(NR.profileOf({template: p}), st)[0];

test("templates: every one complete; the line chooses one", () => {
  const keys = ["aggression", "caution", "cunning", "loyalty", "cowardice", "berserk", "power", "fleeAt", "frenzyProne", "fears", "tactics", "label", "line"];
  for ( const [k, t] of Object.entries(NR.TEMPLATES) ) for ( const f of keys ) assert.ok(t[f] !== undefined, `${k}.${f}`);
  assert.equal(NR.templateFor({kind: "kindred", generation: 12}), "neonate");
  assert.equal(NR.templateFor({kind: "kindred", generation: 7}), "elder");
  assert.equal(NR.templateFor({kind: "ghoul"}), "ghoul");
  assert.equal(NR.templateFor({kind: "lupine"}), "garou");
  assert.equal(NR.templateFor({kind: "mortal", melee: 3}), "guard");
  assert.equal(NR.templateFor({kind: "mortal", melee: 0, ranged: 1}), "civilian");
  assert.equal(NR.templateFor({kind: "wraith"}), "ghost");
});

test("the mode: the NPC's own, else the scene's, else the world's", () => {
  assert.equal(NR.modeOf({npc: "auto", scene: "off", world: "suggest"}), "auto");
  assert.equal(NR.modeOf({npc: null, scene: "off", world: "suggest"}), "off");
  assert.equal(NR.modeOf({npc: "", scene: undefined, world: "auto"}), "auto");
  assert.equal(NR.modeOf({}), "suggest");
  assert.equal(NR.modeOf({npc: "nonsense", world: "auto"}), "auto");
});

test("a profile: the NPC's own values over the template's, blanks ignored", () => {
  const p = NR.profileOf({template: "guard", aggression: 2, caution: null, fleeAt: ""});
  assert.equal(p.aggression, 2);
  assert.equal(p.caution, NR.TEMPLATES.guard.caution);
  assert.equal(p.fleeAt, NR.TEMPLATES.guard.fleeAt);
  assert.equal(NR.profileOf({}, "ghoul").template, "ghoul");
  assert.equal(NR.profileOf({template: "nope"}, "spirit").label, "Spirit");
});

test("a fighter attacks; the one who hurt them first; a ghoul guards the domitor", () => {
  const st = {self: {kind: "mortal", wounds: 0, willpower: 3}, enemies: [foe({id: "a", name: "A"}), foe({id: "b", name: "B", hurtMe: 2})], allies: [], bestAttackDice: 6};
  const t = top("guard", st);
  assert.equal(t.action, "attack");
  assert.equal(t.target, "b");
  assert.match(t.why, /hurt this NPC \(2 levels\)/);
  const g = {self: {kind: "ghoul", wounds: 0, willpower: 3, blood: 3, selfcontrol: 3},
    enemies: [foe({id: "a", name: "A", hurtMe: 1}), foe({id: "b", name: "B"})],
    allies: [{id: "d", name: "Ilse", isDomitor: true, attackerIds: ["b"]}], bestAttackDice: 6};
  const tg = top("ghoul", g);
  assert.equal(tg.target, "b");
  assert.match(tg.why, /whom this NPC serves/);
});

test("fleeing: past the wound threshold; a bystander at the first sight of violence; Rötschreck in the fears", () => {
  const hurt = {self: {kind: "mortal", wounds: 4, willpower: 3}, enemies: [foe()], allies: [], bestAttackDice: 5};
  assert.equal(top("guard", hurt).action, "flee");
  assert.equal(top("civilian", {self: {kind: "mortal", wounds: 0}, enemies: [foe({supernatural: false})], allies: []}).action, "flee");
  const fire = {self: {kind: "kindred", wounds: 0, willpower: 3, blood: 10, selfcontrol: 3}, enemies: [foe({fearSources: ["fire"]})], allies: [], bestAttackDice: 6};
  const opts = NR.scoreOptions(NR.profileOf({template: "neonate"}), fire);
  const attack = opts.find(o => o.action === "attack");
  assert.match(attack.why, /afraid of their fire/);
  assert.ok(opts.findIndex(o => o.action === "flee") < opts.findIndex(o => o.action === "attack"), "fleeing the torch beats attacking it");
  // A Garou does not run from a few wounds
  assert.equal(top("garou", {self: {kind: "lupine", wounds: 3, rage: 2}, enemies: [foe()], allies: [], bestAttackDice: 7}).action, "attack");
  // Frenzy stops flight
  const frenzied = NR.scoreOptions(NR.profileOf({template: "guard"}), {...hurt, self: {...hurt.self, inFrenzy: true}});
  assert.notEqual(frenzied[0].action, "flee");
});

test("the Beast: hunger and Rage push a frenzy check; the Delirium sends a mortal running", () => {
  const hungry = {self: {kind: "kindred", wounds: 0, willpower: 4, blood: 1, selfcontrol: 2}, enemies: [foe()], allies: [], bestAttackDice: 6};
  const fr = NR.scoreOptions(NR.profileOf({template: "neonate"}), hungry).find(o => o.action === "frenzy");
  assert.ok(fr && /hungry \(blood 1 under 5\)/.test(fr.why), JSON.stringify(fr));
  const rage = NR.scoreOptions(NR.profileOf({template: "garou"}), {self: {kind: "lupine", wounds: 2, rage: 7}, enemies: [foe()], allies: [], bestAttackDice: 7});
  assert.ok(rage.some(o => o.action === "frenzy" && /Rage 7/.test(o.why)));
  assert.equal(NR.scoreOptions(NR.profileOf({template: "guard"}), {self: {kind: "mortal", delirious: true}, enemies: [foe()], allies: []})[0].action, "flee");
  // Mortals have no frenzy at all
  assert.ok(!NR.scoreOptions(NR.profileOf({template: "guard"}), {self: {kind: "mortal", wounds: 3}, enemies: [foe()], allies: []}).some(o => o.action === "frenzy"));
});

test("fear of the supernatural needs it to show: a Kindred passing for human frightens no guard", () => {
  const guard = NR.profileOf({template: "guard"});
  const hidden = NR.scoreOptions(guard, {self: {kind: "mortal"}, enemies: [foe({supernatural: true, obvious: false})], allies: [], bestAttackDice: 6});
  assert.equal(hidden[0].action, "attack");
  const shown = NR.scoreOptions(guard, {self: {kind: "mortal"}, enemies: [foe({supernatural: true, obvious: true})], allies: [], bestAttackDice: 6});
  assert.equal(shown[0].action, "flee");
  assert.match(shown[0].why, /faces what it fears/);
});

test("unseen foes: nothing to attack, so search; no foes at all, so wait", () => {
  const o = NR.scoreOptions(NR.profileOf({template: "guard"}), {self: {kind: "mortal"}, enemies: [foe({visible: false})], allies: []});
  assert.equal(o[0].action, "search");
  assert.ok(!o.some(x => x.action === "attack"));
  assert.equal(NR.scoreOptions(NR.profileOf({template: "guard"}), {self: {}, enemies: [], allies: []})[0].action, "wait");
});

test("ranged: shoot what is out of reach; calling for help needs someone to call", () => {
  const st = {self: {kind: "mortal"}, enemies: [foe({reach: false, distance: 15})], allies: [], canRanged: true, bestAttackDice: 5};
  assert.equal(top("hunter", st).action, "shoot");
  const call = NR.scoreOptions(NR.profileOf({template: "guard"}), {...st, offstageAllies: 0});
  assert.ok(!call.some(o => o.action === "call"));
  assert.ok(NR.scoreOptions(NR.profileOf({template: "guard"}), {...st, offstageAllies: 2}).some(o => o.action === "call"));
});

test("every option says why, in gender-neutral words (B48)", () => {
  const words = /\b(he|she|him|her|his|hers|himself|herself)\b/i;
  const states = [
    {self: {kind: "kindred", wounds: 5, willpower: 2, blood: 1, selfcontrol: 2, hasPowers: true}, enemies: [foe({hurtMe: 1, wounds: 5, fearSources: ["fire", "faith"]}), foe({id: "x", visible: false})],
      allies: [{id: "d", name: "Ilse", isDomitor: true, attackerIds: ["pc1"]}, {id: "e", name: "Jan", attackerIds: ["pc1"]}], offstageAllies: 2, bestAttackDice: 3},
    {self: {kind: "lupine", wounds: 3, rage: 8, willpower: 2, hasPowers: true}, enemies: [foe(), foe({id: "b"}), foe({id: "c"})], allies: [], offstageAllies: 1, bestAttackDice: 8}
  ];
  for ( const t of Object.keys(NR.TEMPLATES) ) for ( const st of states ) for ( const o of NR.scoreOptions(NR.profileOf({template: t}), st) ) {
    assert.ok(o.why && o.why.length > 3, `${t}: ${o.action}`);
    assert.ok(!words.test(o.why), `${t}: ${o.why}`);
    assert.ok(NR.ACTION_LABEL[o.action], o.action);
    assert.ok(Number.isFinite(o.score));
  }
});

test("A*: around a wall, not through it; trimmed to the move allowed", () => {
  // A wall along j = 2 from i = 0 to 4: a step crossing between j 1 and 2 is blocked unless i > 4
  const pass = (a, b) => {
    const crosses = (a.j <= 1 && b.j >= 2) || (a.j >= 2 && b.j <= 1);
    if ( crosses && (a.i <= 4 || b.i <= 4) ) return false;
    return b.i >= 0 && b.j >= 0 && b.i < 10 && b.j < 10;
  };
  const p = NR.findPath({i: 0, j: 0}, {i: 0, j: 4}, pass);
  assert.ok(p, "a way round");
  assert.deepEqual(p[0], {i: 0, j: 0});
  assert.deepEqual(p.at(-1), {i: 0, j: 4});
  for ( let k = 1; k < p.length; k++ ) assert.ok(pass(p[k - 1], p[k]), "every step passable");
  assert.ok(p.some(c => c.i > 4), "went round the end of the wall");
  // Straight line when nothing is in the way
  assert.equal(NR.findPath({i: 0, j: 0}, {i: 0, j: 5}, () => true).length, 6);
  // Nowhere to go
  assert.equal(NR.findPath({i: 0, j: 0}, {i: 5, j: 5}, () => false), null);
  const t = NR.trimPath([{i: 0, j: 0}, {i: 1, j: 1}, {i: 2, j: 2}, {i: 2, j: 3}], 3);
  assert.equal(t.length, 3, "1.5 + 1.5 fits in 3; the next step does not");
});

test("beside a foe, and fleeing to the farthest reachable cell", () => {
  const b = NR.besideCells({i: 5, j: 5, w: 2, h: 2}, {i: 0, j: 0});
  assert.equal(b.length, 12);
  assert.deepEqual(b[0], {i: 4, j: 4});
  assert.ok(b.every(c => !(c.i >= 5 && c.i < 7 && c.j >= 5 && c.j < 7)));
  const map = NR.reachable({i: 5, j: 5}, (a, c) => c.i >= 0 && c.j >= 0 && c.i < 12 && c.j < 12, 4);
  assert.ok([...map.values()].every(n => n.g <= 4));
  const cell = NR.fleeCell(map, [{i: 5, j: 4}]);
  assert.ok(cell.c.j >= 8, `ran away from the foe: ${JSON.stringify(cell.c)}`);
  const path = NR.pathTo(cell);
  assert.deepEqual(path[0], {i: 5, j: 5});
  assert.deepEqual(path.at(-1), cell.c);
});

test("any grid: neighbours and costs passed in (hex steps cost 1), trimmed and costed alike", () => {
  // A toy hex-like grid: six neighbours, every step 1
  const hex = c => [[0, 1], [0, -1], [1, 0], [-1, 0], [1, c.i % 2 ? 1 : -1], [-1, c.i % 2 ? 1 : -1]].map(([di, dj]) => ({c: {i: c.i + di, j: c.j + dj}, cost: 1}));
  const p = NR.findPath({i: 0, j: 0}, {i: 4, j: 0}, () => true, {neighbors: hex, heuristic: () => 0});
  assert.ok(p && p.at(-1).i === 4);
  const one = () => 1;
  assert.equal(NR.pathCost(p, one), p.length - 1);
  assert.equal(NR.trimPath(p, 2, one).length, 3);
  assert.equal(NR.pathCost([{i: 0, j: 0}, {i: 1, j: 1}, {i: 1, j: 2}]), 2.5, "square: a diagonal 1.5 and a straight 1");
  const m = NR.reachable({i: 0, j: 0}, () => true, 2, {neighbors: hex});
  assert.ok([...m.values()].every(n => n.g <= 2));
  assert.ok(NR.fleeCell(m, [{i: 0, j: 0}], (a, b) => Math.abs(a.i - b.i) + Math.abs(a.j - b.j)).g === 2);
});

test("who hurt whom: only applied damage in this fight", () => {
  const h = NR.harmLog([
    {combatId: "c1", attacker: "A", target: "N", levels: 2, applied: true},
    {combatId: "c1", attacker: "A", target: "N", levels: 1, applied: true},
    {combatId: "c1", attacker: "B", target: "N", levels: 3, applied: false},
    {combatId: "c0", attacker: "B", target: "N", levels: 3, applied: true},
    {combatId: "c1", attacker: "N", target: "A", levels: 1, applied: true}
  ], "c1");
  assert.equal(h.get("N").get("A"), 3);
  assert.equal(h.get("N").has("B"), false);
  assert.equal(h.get("A").get("N"), 1);
});

test("Auto acts only on what WoDX can carry out; the rest wait for the Storyteller", () => {
  assert.equal(NR.autoChoice([{action: "attack", target: "x"}]).act.action, "attack");
  const w = NR.autoChoice([{action: "frenzy"}, {action: "attack"}]);
  assert.equal(w.act, null);
  assert.equal(w.needsStoryteller.action, "frenzy");
  assert.equal(NR.autoChoice([]).act, null);
});

test("the module: manifest, API and the card's buttons", () => {
  const m = JSON.parse(readFileSync(join(root, "modules/wodx-npc/module.json"), "utf8"));
  assert.equal(m.version, "0.1.3");
  assert.deepEqual(m.relationships.requires.map(r => r.id).sort(), ["wodx-actions", "wodx-chronicle", "wodx-combat"]);
  const src = readFileSync(join(root, "modules/wodx-npc/scripts/main.mjs"), "utf8");
  assert.match(src, /const VERSION = "0\.1\.3"/);
  for ( const k of ["wnpc-go", "wnpc-undo", "wnpc-edit"] ) assert.ok(src.includes(k), k);
  assert.ok(/hasPlayerOwner\s*\)\s*return null/.test(src), "never moves a player's character");
  assert.ok(!/\b(he|she|him|her|his|hers)\b/.test(src.match(/`[^`]*`/g).join(" ").replace(/<[^>]+>/g, " ")), "card text is gender-neutral");
});
