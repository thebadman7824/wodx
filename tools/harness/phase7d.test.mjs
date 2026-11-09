import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* Phase 7d: factions, faction turns, hunting grounds and breaches (WoDX NPC 0.3.0), the pure rules */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const F = await import(join(root, "modules/wodx-npc/scripts/faction-rules.mjs"));
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const streamFor = key => G.stream("test-seed", key);
let n = 0;
const ids = () => `b${++n}`;

const places = [
  {id: "keep", kind: "castle", name: "Kranzfels Keep"}, {id: "tavern", kind: "tavern", name: "The Tavern"}, {id: "square", kind: "market", name: "Market Square"},
  {id: "church", kind: "church", name: "St. Aegidius"}, {id: "lane", kind: "street", name: "Craftsmen's Lane"}, {id: "dolany", kind: "home", name: "Dolany"},
  {id: "hall", kind: "workplace", name: "Weavers' Hall"}, {id: "adit", kind: "other", name: "Silver Adit"}
];
function world() {
  return F.normState({factions: [
    {id: "court", name: "The Voivode's court", kind: "kindred", ruler: true, leader: "bogdan", members: ["bogdan", "konrad"], places: ["keep", "adit"],
      assets: {herd: 4, status: 5, domain: 3, security: 2, retainers: 2, influence: {crown: 3, military: 2}}, standing: {council: -1, church: -2}},
    {id: "council", name: "The German council", kind: "mortal", leader: "graff", members: ["graff"], places: ["square", "hall"],
      assets: {resources: 4, status: 2, contacts: 2, influence: {guild: 3, crown: 1}}, standing: {court: -1}},
    {id: "church", name: "The parish of St. Aegidius", kind: "church", leader: "ludovic", members: ["ludovic", "paval"], places: ["church"],
      assets: {status: 2, contacts: 3, influence: {church: 3, folk: 1}}, standing: {court: -2}},
    {id: "hunters", name: "The Inquisition", kind: "hunters", leader: "inq", members: ["inq", "friar"], places: [],
      assets: {contacts: 2, resources: 2, influence: {church: 2}}}
  ]});
}

test("records: normalising keeps dots in range, security within Domain, and hidden kinds secret", () => {
  const f = F.normFaction({id: "x", kind: "kindred", assets: {herd: 9, domain: 4, security: 3, influence: {church: 7, crown: 0}}, standing: {y: -9, x: 2}});
  assert.equal(f.assets.herd, 5);
  assert.equal(f.assets.domain + f.assets.security, 5);
  assert.deepEqual(f.assets.influence, {church: 5});
  assert.deepEqual(f.standing, {y: -3});
  assert.equal(f.secret, true);
  assert.equal(F.normFaction({kind: "guild"}).secret, false);
  assert.equal(F.normFaction({kind: "nonsense"}).kind, "other");
});

test("dice: successes cancel on ones, a botch is no successes and a one (V20 p. 249)", () => {
  assert.deepEqual(F.successes([6, 7, 1, 3], 6), {net: 1, botch: false, hits: 2, ones: 1});
  assert.equal(F.successes([2, 1, 3], 6).botch, true);
  assert.equal(F.successes([6, 1], 6).botch, false);
  assert.equal(F.successes([6, 1], 6).net, 0);
  // the same seed gives the same dice
  assert.deepEqual(F.rollDice(streamFor("a"), 6), F.rollDice(streamFor("a"), 6));
});

test("hunting grounds: the area table by era, Domain and Fame lower it to 3, Herd adds dice, trespass adds security", () => {
  const s = world();
  const tavern = places[1], keep = places[0];
  // V20 Dark Ages p. 334: lower-class 5; V20 p. 260: lower-income 5
  assert.equal(F.areaOf(tavern, "roads").difficulty, 5);
  assert.equal(F.areaOf({kind: "home"}, "modern").label, "Suburb");
  assert.equal(F.areaOf({kind: "home", area: "slums"}, "roads").difficulty, 4);
  // A court Kindred in the keep: patrolled 8, less Domain 3 and Fame 1 = 4; Herd 4 dice
  const h = F.huntingAt(s, keep, {factions: ["court"], fame: 1}, "roads");
  assert.equal(h.difficulty, 4);
  assert.equal(h.herdDice, 4);
  assert.equal(h.trespass, null);
  // never below 3
  assert.equal(F.huntingAt(s, keep, {factions: ["court"], fame: 4}, "roads").difficulty, 3);
  // A stranger in the keep trespasses: 8 + security 2 = 10, no herd there
  const x = F.huntingAt(s, keep, {factions: [], herd: 2}, "roads");
  assert.equal(x.difficulty, 10);
  assert.equal(x.trespass.faction, "court");
  assert.equal(x.herdDice, 2);
  // An unheld tavern: just the area
  assert.equal(F.huntingAt(s, tavern, {factions: ["court"]}, "roads").difficulty, 5);
});

test("moves: picking is seeded and follows goals and the moment", () => {
  const s = world();
  const court = s.factions[0];
  const a = F.pickMove(s, court, streamFor("p1"), {turn: 1}), b = F.pickMove(s, court, streamFor("p1"), {turn: 1});
  assert.deepEqual(a, b);
  // a goal pulls hard: of 200 draws most follow it
  const g = F.normFaction({...court, goals: [{move: "scheme", target: "church"}]});
  const s2 = {...s, factions: [g, ...s.factions.slice(1)]};
  let schemes = 0;
  for ( let i = 0; i < 200; i++ ) if ( F.pickMove(s2, g, streamFor(`g${i}`), {turn: 1}).move === "scheme" ) schemes++;
  assert.ok(schemes > 80, `scheme picked ${schemes} of 200`);
  const pick = F.pickMove(s2, g, streamFor("g-target"), {turn: 1});
  if ( pick.move === "scheme" ) assert.equal(pick.target, "church");
  // a faction blamed for a live breach lies low more often
  const s3 = F.applyChanges(s, [{op: "breach", faction: "court", place: "tavern", severity: 3, event: "seen feeding"}], {ids}).state;
  let low = 0, low0 = 0;
  for ( let i = 0; i < 200; i++ ) {
    if ( F.pickMove(s3, s3.factions[0], streamFor(`l${i}`), {turn: 1}).move === "lielow" ) low++;
    if ( F.pickMove(s, s.factions[0], streamFor(`l${i}`), {turn: 1}).move === "lielow" ) low0++;
  }
  assert.ok(low > low0 + 40, `lie low ${low} against ${low0}`);
  // a faction with no rivals never schemes; rival moves without a target fall back to recruiting
  const lone = F.normState({factions: [{id: "a", name: "A", kind: "guild"}]});
  for ( let i = 0; i < 50; i++ ) assert.ok(!["scheme", "hunt"].includes(F.pickMove(lone, lone.factions[0], streamFor(`n${i}`)).move));
});

test("moves: resolving rolls the leader's Attribute and the Background, and says what changes", () => {
  const s = world();
  const court = s.factions[0];
  const r = F.resolveMove(s, court, {move: "expand", sphere: "crown"}, streamFor("e1"), {court: {manipulation: 4}}, {turn: 1, places});
  assert.equal(r.pool, 4 + 3);
  assert.equal(r.dice.length, 7);
  assert.equal(r.difficulty, 6);
  if ( r.won ) assert.deepEqual(r.changes, [{op: "bg", faction: "court", key: "influence", sphere: "crown", delta: 1}]);
  // No leader: Attribute 2
  assert.equal(F.resolveMove(s, s.factions[3], {move: "recruit"}, streamFor("r1")).pool, 2 + 2);
  // Against a rival on guard the difficulty is 7, and the rival rolls a defence
  const g = F.applyChanges(s, [{op: "guard", faction: "church", until: 5}]).state;
  const sc = F.resolveMove(g, g.factions[0], {move: "scheme", target: "church", sphere: "church"}, streamFor("s1"), {}, {turn: 2});
  assert.equal(sc.difficulty, 7);
  assert.ok(sc.defence && sc.defence.pool === 2 + 3);
  // Search seeds for a won scheme and a lost one, and check what each changes
  let won = null, lost = null;
  for ( let i = 0; i < 300 && (!won || !lost); i++ ) {
    const x = F.resolveMove(s, s.factions[0], {move: "scheme", target: "church", sphere: "church"}, streamFor(`w${i}`), {court: {manipulation: 3}}, {turn: 1, rand2: streamFor(`d${i}`)});
    if ( x.won && !won ) won = x;
    if ( !x.won && !x.botch && x.defence.net >= x.net && !lost ) lost = x;
  }
  assert.ok(won.changes.some(c => c.op === "bg" && c.faction === "church" && c.sphere === "church" && c.delta === -1));
  assert.ok(lost.changes.some(c => c.op === "standing" && c.faction === "church" && c.other === "court"));
});

test("moves: a botch costs a dot, and a secret faction that botches a hunt starts a rumour", () => {
  const s = world();
  let botch = null;
  for ( let i = 0; i < 2000 && !botch; i++ ) {
    const x = F.resolveMove(s, s.factions[0], {move: "hunt", target: "council"}, streamFor(`bh${i}`), {court: {perception: 1}});
    if ( x.botch ) botch = x;
  }
  assert.ok(botch, "a botch turns up");
  assert.ok(botch.changes.some(c => c.op === "bg" && c.key === "contacts" ? false : true));
  assert.ok(botch.changes.some(c => c.op === "breach" && c.faction === "court" && c.severity === 1));
});

test("small and big (B86): Background dots are small; a place, a find or a player character is big", () => {
  const s = world();
  assert.equal(F.sizeOf([{op: "bg", faction: "court", key: "herd", delta: 1}]), "small");
  assert.equal(F.sizeOf([{op: "place", place: "square", from: "council", to: "court"}]), "big");
  assert.equal(F.sizeOf([{op: "found", faction: "hunters", target: "court", actor: "konrad"}]), "big");
  assert.equal(F.sizeOf([{op: "stage", id: "b", stage: 2}]), "big");
  // A faction with a player character among its members losing a dot touches that character
  assert.equal(F.sizeOf([{op: "bg", faction: "court", key: "herd", delta: -1}], {pcActors: new Set(["konrad"]), state: s}), "big");
  assert.equal(F.sizeOf([{op: "bg", faction: "court", key: "herd", delta: 1}], {pcActors: new Set(["konrad"]), state: s}), "small");
});

test("applying changes: exact inverse for Undo, dots clamp, places move, breaches come and go", () => {
  const s = world();
  const ch = [{op: "bg", faction: "court", key: "herd", delta: 1}, {op: "bg", faction: "court", key: "herd", delta: 1}, {op: "bg", faction: "council", key: "influence", sphere: "guild", delta: -1},
    {op: "bg", faction: "church", key: "influence", sphere: "underworld", delta: 1}, {op: "standing", faction: "church", other: "court", delta: -2},
    {op: "place", place: "square", from: "council", to: "court"}, {op: "guard", faction: "council", until: 3},
    {op: "breach", faction: "court", place: "tavern", severity: 2, event: "seen"}];
  const {state: t, inverse, applied} = F.applyChanges(s, ch, {ids, now: 100});
  assert.equal(t.factions[0].assets.herd, 5); // 4 + 1, then clamped
  assert.equal(applied.filter(c => c.key === "herd").length, 1);
  assert.equal(t.factions[1].assets.influence.guild, 2);
  assert.equal(t.factions[2].assets.influence.underworld, 1);
  assert.equal(t.factions[2].standing.court, -3);
  assert.ok(t.factions[0].places.includes("square") && !t.factions[1].places.includes("square"));
  assert.equal(t.factions[1].guard, 3);
  assert.equal(t.breaches.length, 1);
  assert.equal(t.breaches[0].started, 100);
  const back = F.applyChanges(t, inverse).state;
  const sorted = x => ({...x, factions: x.factions.map(f => ({...f, places: [...f.places].sort()}))});
  assert.deepEqual(sorted(back), sorted(s));
  // security never pushes Domain + security past 5
  const sec = F.applyChanges(s, [{op: "bg", faction: "court", key: "security", delta: 3}]).state;
  assert.equal(sec.factions[0].assets.security, 2);
});

test("turns: one a week, capped for long skips; a turn runs every faction once, mightiest first", () => {
  assert.deepEqual(F.turnsDue(0, 13 * 86400), {due: 1, skipped: 0, span: 7 * 86400});
  assert.equal(F.turnsDue(0, 14 * 86400).due, 2);
  const long = F.turnsDue(0, 365 * 86400);
  assert.equal(long.due, 12);
  assert.equal(long.skipped, 52 - 12);
  assert.equal(F.turnsDue(null, 1000).due, 0);
  const s = world();
  const res = F.runTurn(s, {streamFor, seedKey: "turn:1", places, turn: 1, ids});
  assert.equal(res.length, 4);
  assert.equal(res[0].faction, "court"); // Status 5
  assert.deepEqual(res.map(r => r.faction), F.runTurn(s, {streamFor, seedKey: "turn:1", places, turn: 1, ids}).map(r => r.faction));
  assert.deepEqual(res.map(r => r.dice), F.runTurn(s, {streamFor, seedKey: "turn:1", places, turn: 1, ids}).map(r => r.dice));
  for ( const r of res ) assert.ok(["small", "big"].includes(r.size));
  // a dormant faction sits out
  const d = F.normState({...s, factions: s.factions.map(f => f.id === "council" ? {...f, dormant: true} : f)});
  assert.equal(F.runTurn(d, {streamFor, seedKey: "turn:1", places}).length, 3);
});

test("breaches: severity from witnesses; a rumour spreads by day, public places first, and rises to the Prince then the hunters", () => {
  assert.equal(F.severityFor(1), 1);
  assert.equal(F.severityFor(3), 2);
  assert.equal(F.severityFor(6), 3);
  let s = world();
  // Konrad is seen in the tavern by three mortals: a story (2). Blamed on the court, which rules: it rises when 3 places know
  s = F.applyChanges(s, [{op: "breach", faction: "court", place: "tavern", severity: 2, event: "seen feeding"}], {ids, now: 0}).state;
  const b0 = s.breaches[0];
  const day1 = F.spreadDay(s, b0, places, streamFor("d1"), {now: 86400});
  const h1 = day1.changes.find(c => c.op === "heard");
  assert.equal(h1.places[0], "tavern");
  assert.equal(h1.places.length, 2);
  assert.equal(day1.rise, null);
  s = F.applyChanges(s, day1.changes).state;
  // the next public place was a market (the square), which the council holds: the council knows
  assert.ok(s.breaches[0].known.includes("council"));
  const day2 = F.spreadDay(s, s.breaches[0], places, streamFor("d2"), {now: 2 * 86400});
  s = F.applyChanges(s, day2.changes).state;
  assert.equal(day2.rise?.stage, 1);
  assert.equal(day2.rise.faction, "court");
  assert.equal(F.sizeOf(day2.changes), "big");
  // once the church knows, and the church's contacts... the hunters need to know: give them Contacts 5 (heard >= 1)
  s = F.normState({...s, factions: s.factions.map(f => f.id === "hunters" ? {...f, assets: {...f.assets, contacts: 5}} : f)});
  const day3 = F.spreadDay(s, s.breaches[0], places, streamFor("d3"), {now: 3 * 86400});
  assert.equal(day3.rise?.stage, 2);
  assert.equal(day3.rise.faction, "hunters");
  s = F.applyChanges(s, day3.changes).state;
  assert.equal(s.breaches[0].stage, 2);
  // the hunters now have a quarry: the court
  assert.equal(F.huntersQuarry(s, s.factions[3]).id, "court");
  // a rumour the hunters have heard never fades; one they have not fades after a quiet week
  assert.equal(F.fades(s.breaches[0], 30 * 86400), false);
  const q = F.normBreach({id: "q", severity: 1, state: "live", stage: 0, lastFed: 0});
  assert.equal(F.fades(q, 6 * 86400), false);
  assert.equal(F.fades(q, 7 * 86400), true);
  assert.equal(F.daysDue({...q, lastStep: 0}, 3.5 * 86400), 3);
  // stopped or contained rumours do not spread
  assert.equal(F.spreadDay(s, {...s.breaches[0], state: "stopped"}, places, streamFor("x")).changes.length, 0);
});

test("breaches: lying low quietens the worst rumour about the faction; at 0 it is over, and Undo brings it back", () => {
  let s = F.applyChanges(world(), [{op: "breach", faction: "court", place: "tavern", severity: 1, event: "seen"}], {ids}).state;
  let r = null;
  for ( let i = 0; i < 200 && !r; i++ ) { const x = F.resolveMove(s, s.factions[0], {move: "lielow"}, streamFor(`ll${i}`), {court: {wits: 3}}); if ( x.won ) r = x; }
  assert.deepEqual(r.changes, [{op: "breach-sev", id: s.breaches[0].id, delta: -1}]);
  const t = F.applyChanges(s, r.changes);
  assert.equal(t.state.breaches[0].state, "over");
  assert.deepEqual(F.applyChanges(t.state, t.inverse).state, s);
});

test("untended Backgrounds (B83): a dot of each per decade, never below 0", () => {
  const f = world().factions[1];
  const ch = F.untendedLoss(f, 2);
  assert.ok(ch.some(c => c.key === "resources" && c.delta === -2));
  assert.ok(ch.some(c => c.key === "influence" && c.sphere === "crown" && c.delta === -1));
  assert.equal(F.untendedLoss(f, 0).length, 0);
});

test("words: every change reads as a sentence", () => {
  const names = {faction: id => ({court: "the court", church: "the parish"})[id] ?? id, place: id => id, actor: id => id, sphere: k => k};
  assert.equal(F.describeChange({op: "bg", faction: "court", key: "herd", delta: 1}, names), "the court: Herd +1");
  assert.equal(F.describeChange({op: "stage", id: "b", stage: 1, faction: "court"}, names), "The rumour reaches the Prince (the court)");
  for ( const op of ["bg", "standing", "guard", "place", "member", "found", "goal", "breach", "breach-sev", "heard", "stage"] )
    assert.ok(F.describeChange({op, faction: "court", other: "church", key: "herd", delta: 1, goal: {move: "hunt"}, places: ["x"], stage: 2}, names).length > 3);
});

test("the module: version 0.4.0, the factions in the API, gender-neutral text, no NPC dialogue", async () => {
  const {readFileSync} = await import("node:fs");
  const m = JSON.parse(readFileSync(join(root, "modules/wodx-npc/module.json"), "utf8"));
  assert.equal(m.version, "0.6.0");
  const main = readFileSync(join(root, "modules/wodx-npc/scripts/main.mjs"), "utf8");
  assert.match(main, /const VERSION = "0\.6\.0"/);
  for ( const k of ["openFactions", "runFactionTurns", "endSession", "reportBreach", "huntingFor", "wodxFactions"] ) assert.ok(main.includes(k), k);
  for ( const f of ["factions.mjs", "faction-rules.mjs"] ) {
    const src = readFileSync(join(root, "modules/wodx-npc/scripts", f), "utf8");
    const strings = (src.match(/`[^`]*`|"[^"\n]*"/g) ?? []).join(" ").replace(/<[^>]+>/g, " ");
    assert.ok(!/\b(he|she|him|her|his|hers|himself|herself)\b/i.test(strings), `${f}: gender-neutral`);
    assert.ok(!/(says|shouts|cries|calls out)[,:]\s*[“"']/i.test(src), `${f}: no NPC dialogue`);
  }
  // WoDX Actions tells WoDX NPC of a recorded breach
  const k = readFileSync(join(root, "modules/wodx-actions/scripts/kindred.js"), "utf8");
  assert.match(k, /Hooks\.callAll\("wodxBreach"/);
  // 3.11.2 or later (the breach hook came in 3.11.2)
  const av = JSON.parse(readFileSync(join(root, "modules/wodx-actions/module.json"), "utf8")).version.split(".").map(Number);
  assert.ok(av[0] > 3 || (av[0] === 3 && (av[1] > 11 || (av[1] === 11 && av[2] >= 2))), `Actions ${av.join(".")}`);
});

test("a scene no one tagged gets a kind from its name, and battle maps are not places", () => {
  const k = F.kindFromName;
  assert.equal(k("Kranzfels \u00b7 Inner Ward and Great Hall"), "castle");
  assert.equal(k("Kranzfels \u00b7 The Outer Bailey"), "gate");
  assert.equal(k("The Black Boar Tavern"), "tavern");
  assert.equal(k("Lower Town \u00b7 Market Square"), "market");
  assert.equal(k("Church of St. Aegidius"), "church");
  assert.equal(k("The Silver Adit"), "workplace");
  assert.equal(k("Dolany village"), "home");
  assert.equal(k("Somewhere"), "other");
  assert.ok(F.NOT_A_PLACE.test("Ambush Battlemap") && F.NOT_A_PLACE.test("Ambush battle map") && !F.NOT_A_PLACE.test("Kranzfels Keep"));
});
