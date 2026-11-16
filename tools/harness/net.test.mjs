// WoDX Otherworlds: running the Net (B6590 to B6611), pure rules and Technica.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as N from "../../modules/wodx-otherworlds/scripts/net-rules.mjs";

test("which Net: the Digital Web from 1990, decks on the Future branch from 2005", () => {
  assert.equal(N.netKind(1989, false), null);
  assert.equal(N.netKind(1990, false), "web");
  assert.equal(N.netKind(2010, false), "web");
  assert.equal(N.netKind(2004, true), "web");
  assert.equal(N.netKind(2005, true), "deck");
  assert.deepEqual(N.accessFor("web"), ["sensory", "astral", "holistic"]);
  assert.deepEqual(N.accessFor("deck"), ["plugs", "trodes", "keyboard"]);
});

test("ways in (M20 Web Systems): spheres, rolls, the Data Sphere, mental Traits", () => {
  assert.equal(N.hasSpheres("astral", {correspondence: 1}), false);
  assert.equal(N.hasSpheres("astral", {correspondence: 2}), true);
  assert.equal(N.hasSpheres("holistic", {correspondence: 2, life: 4, forces: 1}), false);
  assert.deepEqual(N.accessRoll("astral"), {pool: ["intelligence", "computer"], diff: 7, need: 3});
  assert.equal(N.accessRoll("astral", {dataSphere: true}).diff, 6);
  assert.equal(N.accessRoll("holistic").need, 5);
  assert.equal(N.accessRoll("sensory"), null);
  assert.deepEqual(N.netTraits("sensory", {intelligence: 4, wits: 2, strength: 1}), {intelligence: 4, wits: 2, strength: 4, dexterity: 2});
  assert.equal(N.netTraits("holistic", {strength: 1}).strength, 1);
});

test("Cyberpunk numbers halve into dots; a deck's speed adds actions; memory limits the load", () => {
  assert.equal(N.dots(0), 0); assert.equal(N.dots(1), 1); assert.equal(N.dots(4), 2); assert.equal(N.dots(5), 3); assert.equal(N.dots(6), 3);
  assert.equal(N.programDots("hellhound"), 3); assert.equal(N.programDots("hammer"), 2);
  assert.equal(N.deckActions(0), 1); assert.equal(N.deckActions(2), 2); assert.equal(N.deckActions(3), 2);
  const l = N.loadOut("standard", ["hammer", "worm", "stealth", "shield"]);
  assert.deepEqual(l.loaded, ["hammer", "worm", "stealth", "shield"]); assert.equal(l.used, 10);
  const o = N.loadOut("standard", ["watchdog", "pitbull"]);
  assert.deepEqual(o.loaded, ["watchdog"]); assert.deepEqual(o.over, ["pitbull"]);
});

test("icons: three successes make one, the rest buy Appearance or Intimidation", () => {
  assert.equal(N.iconMake(2).made, false);
  assert.deepEqual(N.iconMake(3), {made: true, appearance: 2, intimidation: 0});
  assert.deepEqual(N.iconMake(5, "intimidation"), {made: true, appearance: 1, intimidation: 3});
});

test("a program against the system: more successes wins, the way in adds difficulty, a gate falls", () => {
  const c = N.contest({computer: 3, program: 2, access: "plugs"}, {intelligence: 4, defence: 2}, [6, 7, 8, 2, 3], [6, 2, 2, 3, 4, 5]);
  assert.equal(c.win, true); assert.equal(c.margin, 2); assert.equal(c.runnerPool, 5); assert.equal(c.systemPool, 6);
  const k = N.contest({computer: 3, program: 2, access: "keyboard"}, {intelligence: 4, defence: 2}, [6, 7, 8, 2, 3], [6, 2, 2, 3, 4, 5]);
  assert.equal(k.runnerDiff, 8); assert.equal(k.win, false);
  assert.equal(N.contest({computer: 1, program: 1}, {intelligence: 1}, [1, 2], [2]).botch, true);
  assert.deepEqual(N.breach(3, 2), {left: 1, open: false});
  assert.deepEqual(N.breach(3, 5), {left: 0, open: true});
  assert.equal(N.alarmSounds("hammer", 1), true);
  assert.equal(N.alarmSounds("jackhammer", 7), false); assert.equal(N.alarmSounds("jackhammer", 8), true);
  assert.equal(N.alarmSounds("worm", 8), false); assert.equal(N.alarmSounds("worm", 9), true);
});

test("black ICE lands on the body, the mind, the deck or Realspace; a keyboard is out of reach but for Firestarter", () => {
  assert.deepEqual(N.iceHit("sword", {levels: 2}), {kind: "persona", type: "bashing", levels: 2});
  assert.equal(N.iceHit("hellbolt", {levels: 1}).type, "lethal");
  const h = N.iceHit("hellhound", {levels: 3});
  assert.equal(h.type, "aggravated"); assert.equal(h.hound, true); assert.equal(h.trace, true);
  assert.deepEqual(N.iceHit("zombie", {levels: 0}), {kind: "mind", points: 1, heals: "aggravated"});
  assert.equal(N.iceHit("stun", {turns: 4}).status, "net-frozen");
  assert.equal(N.iceHit("krash", {turns: 3}).kind, "deck");
  assert.equal(N.iceHit("stun", {access: "keyboard"}).why, "keyboard");
  assert.equal(N.iceHit("firestarter", {access: "keyboard", levels: 3}).kind, "fire");
  assert.equal(N.iceHit("stun", {reflected: ["stun"]}).kind, "reflected");
  assert.equal(N.iceHit("glue", {turns: 5}).traceAfter, 4);
});

test("a data fortress: the Fast Fortress tables halved, seeded, everything inside the grid", () => {
  for ( let s = 1; s < 300; s++ ) {
    const m = N.fortress({seed: s});
    assert.ok(m.cpus >= 1 && m.cpus <= 6);
    assert.equal(m.intelligence, Math.max(1, Math.floor(m.cpus * 3 / 2)));
    assert.equal(m.gates.length, m.cpus); assert.equal(m.memories.length, m.cpus * 4);
    assert.ok(m.ice.length >= m.cpus + 1 && m.ice.length <= m.cpus + 6);
    assert.ok(m.remotes.length >= 1 && m.remotes.length <= 6);
    assert.equal(m.ai, m.cpus >= 4);
    for ( const p of [...m.memories, ...m.ice, ...m.remotes, ...m.gates, m.entry] ) assert.ok(p.x >= 0 && p.y >= 0 && p.x < m.cols && p.y < m.rows, `seed ${s}`);
    for ( const i of m.ice ) assert.ok(N.PROGRAMS[i.program]?.ice, i.program);
    for ( const mm of m.memories ) assert.equal(mm.files.length, 2);
  }
  assert.deepEqual(N.fortress({seed: 7}), N.fortress({seed: 7}));
  assert.equal(N.fortress({seed: 7, cpus: 7}).cpus, 7);
  const m = N.fortress({seed: 9});
  const segs = N.wallSegments(m);
  assert.equal(segs.filter(x => x.gate).length, m.cpus);
  assert.ok(N.svg(m).startsWith("<svg"));
});

test("files give money, paydata and secrets in months' wages, so every era reads them", () => {
  assert.deepEqual(N.fileGives("transactions", 4), {gives: "money", wages: 2, heat: "theft"});
  assert.deepEqual(N.fileGives("business", 8), {gives: "money", wages: 2, fenced: true});
  assert.deepEqual(N.fileGives("blackops"), {gives: "secret", weight: 2, kind: "crime"});
  assert.equal(N.fileGives("greyops").weight, 1);
  assert.equal(N.fileGives("database").of, "anyone");
  assert.equal(N.fileGives("interoffice").of, "owner");
});

test("long distance links and the trace", () => {
  assert.equal(N.routeTrace(["eurotheatre", "sovspace"]), 5);
  assert.equal(N.traced(3, 5, 9, 2), true); assert.equal(N.traced(3, 5, 1, 9), false);
  assert.deepEqual(N.ldlCross(4, 5, 1), {pass: true});
  assert.equal(N.ldlCross(8, 2, 3).what, "cut"); assert.equal(N.ldlCross(8, 2, 5).what, "code"); assert.equal(N.ldlCross(8, 2, 6).what, "bust");
});

test("Whiteout (M20): at five Paradox, the severity table, how long, the lag", () => {
  assert.equal(N.whiteoutDue(4), false); assert.equal(N.whiteoutDue(5), true);
  assert.equal(N.whiteoutDiff({heavy: true}), 4); assert.equal(N.whiteoutDiff({heavy: true, warzone: true}), 6);
  assert.deepEqual(N.whiteoutSeverity(1), {reach: "self", self: "soft"});
  assert.equal(N.whiteoutSeverity(4).reach, 50);
  assert.equal(N.whiteoutSeverity(6).down, true);
  assert.equal(N.whiteoutSeverity(10).forever, true);
  assert.equal(N.whiteoutLasts(2), 50); assert.equal(N.whiteoutLasts(12), 86400); assert.equal(N.whiteoutLasts(25), null);
  assert.equal(N.lagWarns(10), false); assert.equal(N.lagWarns(11), true);
  assert.equal(N.lagEscape([8, 2]), "out"); assert.equal(N.lagEscape([2, 3]), "half"); assert.equal(N.lagEscape([1, 2]), "full");
});

test("de-rez and icon death (M20 pp. 472-473)", () => {
  const s = N.derez("soft", {access: "sensory", severity: 5});
  assert.deepEqual([s.type, s.levels, s.out], ["bashing", 3, false]);
  assert.equal(N.derez("soft", {access: "holistic", severity: 4, soakDice: [7, 2]}).levels, 3);
  assert.equal(N.derez("soft", {access: "holistic"}).dazed, 2);
  const h = N.derez("hard", {access: "astral", soakDice: [7, 3], staminaDice: [2, 3]});
  assert.deepEqual([h.type, h.levels, h.out, h.mind], ["lethal", 1, true, 2]);
  assert.equal(N.derez("hard", {access: "holistic", soakDice: [9, 9]}).levels, 2);
  assert.equal(N.iconDeath({access: "holistic"}).dies, true);
  assert.deepEqual(N.iconDeath({iconLevels: 4, staminaDice: [8, 3]}).type, "bashing");
  assert.equal(N.iconDeath({iconLevels: 4, staminaDice: [8, 3]}).levels, 3);
  assert.equal(N.iconDeath({iconLevels: 4, staminaDice: [2]}).type, "lethal");
  assert.equal(N.iconDeath({iconLevels: 4, staminaDice: [1]}).type, "aggravated");
});

test("statuses limit what a runner can do", () => {
  assert.deepEqual(N.canAct(["net-frozen"]), {act: false, programs: true, jackOut: false});
  assert.equal(N.canAct(["net-trapped"]).jackOut, false);
  assert.equal(N.canAct(["net-deck-down"]).programs, false);
  assert.equal(N.statusDiff(["net-dazed"]), 2);
  assert.equal(N.speedWith(3, ["net-deck-slow"]), 0);
});

test("ICE on its own: waits unseen, raises the alarm, closes in, strikes", () => {
  const dog = {program: "watchdog", x: 5, y: 5, up: true}, hound = {program: "hellhound", x: 0, y: 0, mobile: true, up: true};
  const r = [{id: "a", x: 12, y: 5}];
  assert.equal(N.iceTurn(dog, [{id: "a", x: 12, y: 5, hidden: true}]).act, "wait");
  assert.equal(N.iceTurn(dog, r).act, "alarm");
  const mv = N.iceTurn(hound, r, {alarm: true});
  assert.equal(mv.act, "move"); assert.deepEqual(mv.to, {x: 5, y: 5});
  assert.equal(N.iceTurn({...hound, x: 11, y: 5}, r, {alarm: true}).act, "attack");
  assert.equal(N.iceTurn({...hound, up: false}, r, {alarm: true}).act, "wait");
  assert.equal(N.iceTurn(hound, r, {reaction: "talk"}).act, "talk");
});

test("the Foundry side reads every hit kind the rules give, and the window is reachable", () => {
  const src = readFileSync(new URL("../../modules/wodx-otherworlds/scripts/net.mjs", import.meta.url), "utf8");
  for ( const k of ["reflected", "none", "antiIce", "persona", "body", "mind", "status", "deck", "fire", "trace", "cut", "detect"] ) assert.ok(src.includes(`case "${k}"`), k);
  for ( const d of new Set(Object.values(N.REMOTES).map(r => r.does)) ) assert.ok(src.includes(`does === "${d}"`) || ["terminal", "print", "machine"].includes(d), d);
  const main = readFileSync(new URL("../../modules/wodx-otherworlds/scripts/main.mjs", import.meta.url), "utf8");
  assert.ok(main.includes("net.netWindow()")); assert.ok(main.includes("net.onNetMessage"));
});

test("Technica (B6604-B6611): the Cyberpunks from 2016 on the Future branch, ways in by level, touch, reach, talk, weakness", () => {
  assert.equal(N.cyberpunksOpen(2015, true), false);
  assert.equal(N.cyberpunksOpen(2016, true), true);
  assert.equal(N.cyberpunksOpen(2030, false), false);
  assert.deepEqual(N.accessFor("deck"), ["plugs", "trodes", "keyboard"], "the Technica ways are not everyone's");
  assert.deepEqual(N.waysFor("deck", 0), ["plugs", "trodes", "keyboard"]);
  assert.deepEqual(N.waysFor("deck", 1), ["plugs", "trodes", "keyboard", "touch"]);
  assert.deepEqual(N.waysFor("deck", 6), ["plugs", "trodes", "keyboard", "touch", "ghost"]);
  assert.deepEqual(N.waysFor("web", 6), ["sensory", "astral", "holistic"], "no Cyberpunks in the classic Web");
  assert.equal(N.ACCESS.touch.diff, 0, "no penalty by touch");
  assert.equal(N.touchComputer(0, 3), 3); assert.equal(N.touchComputer(2, 4), 2);
  assert.equal(N.remoteReach(5, "ft"), 20); assert.equal(N.remoteReach(1.5, "m"), 20); assert.equal(N.remoteReach(10, "ft"), 10);
  assert.equal(N.machineTalk(2).parley, false); assert.equal(N.machineTalk(3).parley, true);
  assert.equal(N.machineTalk(4).files, true); assert.equal(N.machineTalk(4).ice, false); assert.equal(N.machineTalk(9).ice, true);
  assert.equal(N.leansOnBlood({disc: 2, tech: 2}), false); assert.equal(N.leansOnBlood({disc: 3, tech: 2}), true);
  assert.deepEqual(Object.keys(N.TECHNICA).map(Number), [1, 2, 3, 4, 5, 6]);
});

test("Technica in Foundry: the Net reads every level, and the weakness hears Disciplines", () => {
  const net = readFileSync(new URL("../../modules/wodx-otherworlds/scripts/net.mjs", import.meta.url), "utf8");
  const tech = readFileSync(new URL("../../modules/wodx-otherworlds/scripts/technica.mjs", import.meta.url), "utf8");
  const main = readFileSync(new URL("../../modules/wodx-otherworlds/scripts/main.mjs", import.meta.url), "utf8");
  for ( const s of ["N.waysFor(kind, tech)", "T.touchRoll(a)", "N.touchComputer(", "T.empower(actor)", "T.remoteTouch(t, d.what)", "T.speak(actor", "s.way === \"ghost\"", "m.parley", "T.machineUsed(actor)"] ) assert.ok(net.includes(s), s);
  for ( const s of ["technica(actor) < 3", "technica(a) < 4", "technica(actor) < 5", "N.remoteReach(", "N.machineTalk(", "N.leansOnBlood(", "Hooks.on(\"wodxPowerShown\"", "info.kind !== \"disc\""] ) assert.ok(tech.includes(s), s);
  assert.ok(main.includes("technica.setupTechnica()"));
});
