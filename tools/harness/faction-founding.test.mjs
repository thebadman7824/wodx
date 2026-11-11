import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

// WoDX NPC 0.17.0: founding, splitting, ending and absorbing factions; player-run factions; years and eras.
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const F = await import(join(root, "modules/wodx-npc/scripts/faction-rules.mjs"));

const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };
const stream = () => { let x = 7; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; };
let n = 0;
const ids = () => `id${++n}`;

const court = () => F.normFaction({id: "court", name: "The court", kind: "kindred", leader: "bogdan", members: ["bogdan", "a", "b", "c", "d", "e", "f"],
  places: ["keep", "hall"], assets: {herd: 4, status: 5, domain: 3, retainers: 3, contacts: 1, resources: 2, influence: {crown: 3, military: 1}}});
const church = () => F.normFaction({id: "church", name: "The parish", kind: "church", leader: "priest", members: ["priest"], places: ["chapel"], assets: {status: 2, influence: {church: 2}}});
const state = (...fs) => F.normState({factions: fs});

test("founding pools the founders' pledges, each to what they hold, the sum to 5", () => {
  const {faction, pledged} = F.foundFaction({id: "new", name: "The miners", kind: "guild", sphere: "guild", owners: ["pc1"], run: "orders", year: 1240}, [
    {id: "pc1", has: {resources: 3, contacts: 2, influence: 2}, pledge: {resources: 3, contacts: 5, influence: 1}},
    {id: "pc2", has: {resources: 4, herd: 0}, pledge: {resources: 4, herd: 3}}
  ]);
  assert.equal(faction.assets.resources, 5, "3 + 4 capped at 5");
  assert.equal(faction.assets.contacts, 2, "a pledge is capped at the dots held");
  assert.equal(faction.assets.herd, 0, "nothing pledged from nothing held");
  assert.deepEqual(faction.assets.influence, {guild: 1});
  assert.deepEqual(faction.members.sort(), ["pc1", "pc2"]);
  assert.equal(faction.leader, "pc1");
  assert.deepEqual(faction.owners, ["pc1"]);
  assert.equal(faction.run, "orders");
  assert.equal(faction.founded, 1240);
  assert.equal(pledged.length, 4);
});

test("faction-add and faction-remove undo each other; a founding is a big change", () => {
  const s = state(court());
  const {faction} = F.foundFaction({id: "new", name: "New"}, [{id: "x", has: {status: 1}, pledge: {status: 1}}]);
  const r = F.applyChanges(s, [{op: "faction-add", faction}]);
  assert.equal(r.state.factions.length, 2);
  assert.equal(F.sizeOf([{op: "faction-add", faction}]), "big");
  const back = F.applyChanges(r.state, r.inverse);
  assert.equal(back.state.factions.length, 1);
  const again = F.applyChanges(back.state, back.inverse);
  assert.equal(again.state.factions.find(f => f.id === "new").assets.status, 1);
  // the same id twice is refused
  assert.equal(F.applyChanges(r.state, [{op: "faction-add", faction}]).applied.length, 0);
});

test("faction-set touches only its fields and undoes exactly", () => {
  const s = state(court());
  const r = F.applyChanges(s, [{op: "faction-set", faction: "court", set: {dormant: true, dormantBy: "ended", ended: 1300, name: "ignored"}}]);
  const f = r.state.factions[0];
  assert.equal(f.dormant, true); assert.equal(f.ended, 1300); assert.equal(f.name, "The court");
  const back = F.applyChanges(r.state, r.inverse).state.factions[0];
  assert.equal(back.dormant, false); assert.equal(back.ended, null); assert.equal(back.dormantBy, null);
});

test("ending a faction frees its places and keeps the record", () => {
  const s = state(court(), church());
  const ch = F.disbandChanges(s, "court", 1350);
  const r = F.applyChanges(s, ch);
  const f = r.state.factions.find(x => x.id === "court");
  assert.deepEqual(f.places, []); assert.equal(f.dormant, true); assert.equal(f.ended, 1350); assert.equal(f.dormantBy, "ended");
  const back = F.applyChanges(r.state, r.inverse).state.factions.find(x => x.id === "court");
  assert.deepEqual(back.places.sort(), ["hall", "keep"]); assert.equal(back.dormant, false);
});

test("absorbing: people and places pass, half the dots rounded down, the loser ends", () => {
  const s = state(court(), church());
  const r = F.applyChanges(s, F.absorbChanges(s, "church", "court", 1400));
  const c = r.state.factions.find(x => x.id === "court"), p = r.state.factions.find(x => x.id === "church");
  assert.ok(c.members.includes("priest")); assert.ok(c.places.includes("chapel"));
  assert.equal(c.assets.status, 5, "5 + 1 stays 5"); assert.equal(c.assets.influence.church, 1);
  assert.equal(p.dormant, true); assert.equal(p.absorbedBy, "court"); assert.deepEqual(p.places, []);
  assert.deepEqual(F.absorbChanges(s, "church", "church"), [], "never into itself");
  const back = F.applyChanges(r.state, r.inverse).state;
  assert.equal(back.factions.find(x => x.id === "court").assets.status, 5);
  assert.ok(!back.factions.find(x => x.id === "court").members.includes("priest"));
  assert.deepEqual(back.factions.find(x => x.id === "church").places, ["chapel"]);
});

test("a strained faction may split; one at ease, or too small, or run by players, does not", () => {
  const s = state(court(), church());
  const f = s.factions[0];
  assert.deepEqual(F.splinterChanges(s, f, {rand: () => 0}), [], "not strained");
  assert.deepEqual(F.splinterChanges(s, f, {rand: () => 0.9, leaderGone: true}), [], "the dice say it holds");
  assert.deepEqual(F.splinterChanges(s, s.factions[1], {rand: () => 0, leaderGone: true}), [], "too few people");
  const owned = F.normFaction({...court(), owners: ["pc"]});
  assert.deepEqual(F.splinterChanges(state(owned), owned, {rand: () => 0, leaderGone: true}), [], "players decide their own");
  const ch = F.splinterChanges(s, f, {rand: () => 0, leaderGone: true, newId: () => "brk", year: 1300, name: id => id.toUpperCase()});
  assert.equal(ch[0].op, "faction-add");
  const nf = ch[0].faction;
  assert.equal(nf.name, "A's breakaway from The court");
  assert.equal(nf.leader, "a"); assert.deepEqual(nf.members, ["a", "f"], "the leader and a third of the other five, rounded down");
  assert.equal(nf.parent, "court"); assert.equal(nf.founded, 1300); assert.equal(nf.standing.court, -2);
  const r = F.applyChanges(s, ch);
  const old = r.state.factions.find(x => x.id === "court");
  assert.equal(old.assets.herd, 3); assert.equal(old.assets.contacts, 1, "a single dot is not split");
  assert.equal(old.assets.influence.crown, 2); assert.equal(old.standing.brk, -2);
  assert.ok(!old.members.includes("a") && !old.members.includes("f"));
  assert.equal(F.sizeOf(ch), "big");
  // a live rumour of severity 3 strains it too
  const hot = F.normState({factions: [court()], breaches: [{id: "b", severity: 3, faction: "court", state: "live"}]});
  assert.ok(F.strained(hot, hot.factions[0]));
});

test("years: a faction outside its years takes no turn and wakes when the clock comes back", () => {
  const late = F.normFaction({id: "late", name: "Later", founded: 1500, members: ["x"]});
  const s = state(court(), late);
  assert.equal(F.activeIn(late, 1300), false); assert.equal(F.activeIn(late, 1500), true);
  const sleep = F.yearChanges(s, 1300);
  assert.deepEqual(sleep, [{op: "faction-set", faction: "late", set: {dormant: true, dormantBy: "year"}}]);
  const asleep = F.applyChanges(s, sleep).state;
  assert.deepEqual(F.yearChanges(asleep, 1400), []);
  assert.deepEqual(F.yearChanges(asleep, 1520), [{op: "faction-set", faction: "late", set: {dormant: false, dormantBy: null}}]);
  // one the Storyteller put to sleep stays asleep
  const st = F.normState({factions: [{...late, dormant: true, dormantBy: null}]});
  assert.deepEqual(F.yearChanges(st, 1520), []);
  const results = F.runTurn(s, {streamFor: stream, seedKey: "t", year: 1300, ids});
  assert.ok(!results.some(r => r.faction === "late"));
});

test("a dated event wakes, ends and offers factions", () => {
  const rise = F.normFaction({id: "sab", name: "Pack", dormant: true, risesOn: "thorns"});
  const fall = F.normFaction({id: "old", name: "Old ones", endsOn: "thorns"});
  const s = state(rise, fall);
  const {changes, offer} = F.eventChanges(s, "thorns", 1493, {newId: () => "o1"});
  assert.equal(changes.length, 2);
  const r = F.applyChanges(s, changes).state;
  assert.equal(r.factions.find(x => x.id === "sab").dormant, false); assert.equal(r.factions.find(x => x.id === "sab").founded, 1493);
  assert.equal(r.factions.find(x => x.id === "old").ended, 1493);
  assert.equal(offer.name, "A Sabbat pack"); assert.equal(offer.fromEvent, "thorns"); assert.equal(offer.secret, true);
  // offered once only
  const after = F.applyChanges(r, [{op: "faction-add", faction: offer}]).state;
  assert.equal(F.eventChanges(after, "thorns", 1493).offer, null);
  assert.equal(F.eventChanges(s, "black-death", 1347).offer, null, "not every event brings a power");
  for ( const id of Object.keys(F.EVENT_POWERS) ) assert.ok(readFileSync(join(root, "modules/wodx-chronicle/data/events.mjs"), "utf8").includes(`id: "${id}"`), `${id} is a Chronicle event`);
});

test("a player-run faction waits for orders, then spends them", () => {
  const mine = F.normFaction({id: "mine", name: "Ours", owners: ["pc"], run: "orders", leader: "pc", members: ["pc"], assets: {status: 2, contacts: 2}});
  const s = state(mine, church());
  const r1 = F.runTurn(s, {streamFor: stream, seedKey: "t", ids});
  assert.equal(r1.find(r => r.faction === "mine").move, "wait");
  const ordered = F.applyChanges(s, [{op: "faction-set", faction: "mine", set: {orders: {move: "defend"}}}]).state;
  const r2 = F.runTurn(ordered, {streamFor: stream, seedKey: "t", ids}).find(r => r.faction === "mine");
  assert.equal(r2.move, "defend");
  assert.ok(r2.changes.some(c => c.op === "faction-set" && c.set.orders === null), "the orders are spent");
  // a scheme with no one to scheme against recruits instead
  const lost = F.applyChanges(s, [{op: "faction-set", faction: "mine", set: {orders: {move: "scheme", target: "nobody"}}}]).state;
  assert.equal(F.runTurn(lost, {streamFor: stream, seedKey: "t", ids}).find(r => r.faction === "mine").move, "recruit");
  // "let it run" picks as for any faction
  const auto = F.normFaction({...mine, run: "auto"});
  assert.notEqual(F.runTurn(state(auto), {streamFor: stream, seedKey: "t", ids})[0].move, "wait");
  assert.equal(F.normOrders({move: "dance"}), null);
});

test("turns split a strained faction as its own big result, only when splits are on", () => {
  const s = state(court());
  const off = F.runTurn(s, {streamFor: () => () => 0, seedKey: "t", gone: new Set(["bogdan"]), ids});
  assert.ok(!off.some(r => r.move === "split"));
  const on = F.runTurn(s, {streamFor: () => () => 0, seedKey: "t", gone: new Set(["bogdan"]), splits: true, ids, name: () => "Ana"});
  const sp = on.find(r => r.move === "split");
  assert.ok(sp); assert.equal(sp.size, "big"); assert.equal(sp.changes[0].op, "faction-add");
});

test("spheres and kinds follow the age from 1197 to the Future Darkness", () => {
  assert.deepEqual(F.spheresFor("roads"), F.SPHERES.roads, "no year: by morality, as before");
  assert.deepEqual(F.spheresFor("humanity"), F.SPHERES.modern);
  assert.equal(F.spheresFor("roads", 1197), F.SPHERES.roads);
  assert.ok("university" in F.spheresFor("humanity", 1650));
  assert.equal(F.spheresFor("humanity", 1880).media, "The press");
  assert.equal(F.spheresFor("humanity", 1990), F.SPHERES.modern);
  assert.ok("net" in F.spheresFor("humanity", 2040));
  // a power keeps its key across the ages
  for ( const per of ["roads", "early", "industrial", "modern", "future"] ) assert.ok("church" in F.SPHERES[per], per);
  assert.match(F.kindsFor(1250).guild, /guild/i);
  assert.match(F.kindsFor(1880).guild, /union/i);
  assert.match(F.kindsFor(1995).guild, /corporation/i);
  assert.equal(Object.keys(F.kindsFor(2040)).length, Object.keys(F.KINDS).length);
  assert.equal(F.sphereName("net"), "The Net and data");
  assert.equal(F.periodOf(1450), "medieval"); assert.equal(F.periodOf(1451), "early"); assert.equal(F.periodOf(2023), "future");
});

test("old saved factions read as before", () => {
  const f = F.normFaction({id: "x", name: "Old", kind: "kindred"});
  assert.deepEqual([f.owners, f.run, f.orders, f.founded, f.ended, f.dormantBy, f.parent], [[], "auto", null, null, null, null, null]);
});

test("the Foundry side is wired: founding file, socket, player button, settings", () => {
  const m = readFileSync(join(root, "modules/wodx-npc/scripts/main.mjs"), "utf8");
  assert.match(m, /tools\.wodxFactions = \{[^}]*visible: true/);
  assert.match(m, /buildFounding\(/);
  const fo = readFileSync(join(root, "modules/wodx-npc/scripts/founding.mjs"), "utf8");
  assert.match(fo, /faction\.found/); assert.match(fo, /faction\.orders/);
  assert.match(fo, /hasOf\(game\.actors\.get\(p\.id\)\)/, "the Storyteller's client reads the dots itself");
  const fx = readFileSync(join(root, "modules/wodx-npc/scripts/factions.mjs"), "utf8");
  for ( const k of ["factionSplits", "playerFactions", "wodxEventFired", "wodxEraApplied"] ) assert.ok(fx.includes(k), k);
});
