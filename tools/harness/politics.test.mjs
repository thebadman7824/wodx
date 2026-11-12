import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

// WoDX NPC 0.25.0: politics inside a faction (courts, dioceses, baronies).
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const F = await import(join(root, "modules/wodx-npc/scripts/faction-rules.mjs"));
const PO = await import(join(root, "modules/wodx-npc/scripts/politics-rules.mjs"));

const stream = (seed = 7) => { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; };
const keyed = salt => k => { let h = salt; for ( const ch of k ) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return stream(h); };
const info = {
  p: {name: "Ottokar", clan: "Ventrue", status: 4, attrs: {charisma: 3, manipulation: 4, wits: 3, strength: 2, dexterity: 2}},
  a: {name: "Anezka", clan: "Toreador", status: 2, attrs: {charisma: 4}},
  b: {name: "Bohus", clan: "Brujah", status: 1, attrs: {strength: 4, dexterity: 3}},
  c: {name: "Cyril", clan: "Nosferatu", status: 1},
  d: {name: "Dita", clan: "Toreador", status: 0},
  pc: {name: "Player", clan: "Gangrel", status: 1, pc: true}
};
const court = (extra = {}) => F.normFaction({id: "court", name: "The court", kind: "kindred", leader: "p", members: ["p", "a", "b", "c", "d", "pc"], assets: {status: 4}, ...extra});
const pcs = new Set(["pc"]);

test("the polity follows the kind, the year and the Storyteller's pick", () => {
  const f = court();
  assert.equal(PO.polityFor(f, 1197), "dark-ages-court");
  assert.equal(PO.polityFor(f, 1434), "dark-ages-court");
  assert.equal(PO.polityFor(f, 1435), "camarilla");
  assert.equal(PO.polityFor({...f, polity: "sabbat"}, 1600), "sabbat");
  assert.equal(PO.polityFor({...f, polity: "sabbat"}, 1300), "dark-ages-court", "the Sabbat before Thorns: the court of its age stands in");
  assert.equal(PO.polityFor({...f, polity: "anarch"}, 1390), "anarch", "the Revolt's bands from 1381");
  assert.equal(PO.polityFor({...f, polity: "none"}, 1600), null);
  assert.equal(PO.polityFor({...f, members: ["p", "a"]}, 1600), null, "two Kindred are a coterie, not a court");
  assert.equal(PO.polityFor(F.normFaction({id: "x", kind: "church", members: ["a", "b", "c"]}), 1600), null);
  assert.equal(PO.polityFor({...f, polity: "camarilla"}, null), "camarilla", "no year known: the pick stands");
});

test("a faction record keeps its polity and politics, cleaned", () => {
  const f = F.normFaction({id: "f", kind: "kindred", polity: "bogus", politics: {ranks: {a: 9, b: -2, c: "3", d: "x"}, offices: {prince: ["p", "p", ""]}, vinculum: {"a>b": 14}, docket: [{id: "x"}]}});
  assert.equal(f.polity, "", "an unknown polity falls back to the default");
  assert.deepEqual(f.politics.ranks, {a: 5, b: 0, c: 3}, "a rank of 0 is kept: it differs from following the sheet");
  assert.deepEqual(f.politics.offices, {prince: ["p"]});
  assert.equal(f.politics.vinculum["a>b"], 10);
  assert.deepEqual(f.politics.docket, [], "a charge with no one accused is dropped");
  const again = F.normFaction(JSON.parse(JSON.stringify(f)));
  assert.deepEqual(again.politics, f.politics);
});

test("politics changes apply and their inverse undoes them exactly", () => {
  const s = F.normState({factions: [court({leader: "a"})]});
  const changes = [
    {op: "pol-office", faction: "court", office: "prince", actor: "p", top: true},
    {op: "pol-rank", faction: "court", actor: "b", delta: 2, base: 1},
    {op: "pol-favour", faction: "court", who: "a", delta: 3},
    {op: "pol-docket", faction: "court", charge: {id: "k1", by: "a", against: "b", law: "a breach of the Masquerade", turn: 1}},
    {op: "pol-claim", faction: "court", office: "sheriff", who: "c"},
    {op: "pol-vinculum", faction: "court", from: "a", to: "b", set: 4},
    {op: "pol-lean", faction: "court", bloc: "brujah", who: "a"},
    {op: "pol-inner", faction: "court", set: 3}
  ];
  const {state, inverse, applied} = F.applyChanges(s, changes);
  const f = state.factions[0];
  assert.equal(applied.length, changes.length);
  assert.equal(f.leader, "p", "the top seat leads the faction");
  assert.equal(f.politics.ranks.b, 3, "the rank starts from the sheet's Status");
  assert.equal(f.politics.favour.a, 3);
  assert.equal(f.politics.docket.length, 1);
  assert.equal(f.politics.vinculum["a>b"], 4);
  assert.equal(f.politics.inner, 3);
  const back = F.applyChanges(state, inverse).state.factions[0];
  assert.equal(back.leader, "a", "Undo gives the leadership back");
  assert.deepEqual(back.politics, s.factions[0].politics);
  for ( const c of changes ) assert.notEqual(F.describeChange(c, {actor: id => info[id]?.name}), c.op, `${c.op} reads as a sentence`);
});

test("the top seat and anything touching a player character are big", () => {
  assert.equal(F.sizeOf([{op: "pol-office", faction: "court", office: "prince", actor: "a", top: true}], {pcActors: pcs}), "big");
  assert.equal(F.sizeOf([{op: "pol-office", faction: "court", office: "prince", actor: "p", top: true, seed: true}], {pcActors: pcs}), "small", "recording a sitting leader is small");
  assert.equal(F.sizeOf([{op: "pol-office", faction: "court", office: "sheriff", actor: "a"}], {pcActors: pcs}), "small");
  assert.equal(F.sizeOf([{op: "pol-office", faction: "court", office: "sheriff", actor: "pc"}], {pcActors: pcs}), "big");
  assert.equal(F.sizeOf([{op: "pol-rank", faction: "court", actor: "pc", delta: -1}], {pcActors: pcs}), "big");
  assert.equal(F.sizeOf([{op: "pol-docket", faction: "court", charge: {id: "x", against: "pc"}}], {pcActors: pcs}), "big");
  assert.equal(F.sizeOf([{op: "pol-favour", faction: "court", who: "pc", delta: 1}], {pcActors: pcs}), "small");
});

test("an inner turn seats the sitting leader quietly, and the first gathering fills the seats", () => {
  let s = F.normState({factions: [court()]});
  const seen = [];
  for ( let t = 1; t <= 2; t++ ) {
    const res = F.runTurn(s, {streamFor: keyed(t), seedKey: `turn:${t}`, turn: t, year: 1500, pcActors: pcs, politics: {info, boons: []}});
    const pol = res.filter(r => r.move === "politics");
    assert.ok(pol.length >= 1);
    seen.push(...pol);
    for ( const r of pol ) s = F.applyChanges(s, r.changes).state;
  }
  const f = s.factions[0];
  assert.deepEqual(f.politics.offices.prince, ["p"]);
  assert.equal(f.leader, "p");
  const primo = f.politics.offices.primogen ?? [];
  assert.equal(new Set(primo.map(id => info[id].clan)).size, primo.length, "one Primogen seat for each clan");
  assert.ok(!Object.entries(f.politics.offices).some(([k, l]) => k !== "primogen" && l.includes("pc")), "a player's character is not seated unasked");
  const pcSeat = seen.find(r => r.changes.some(c => c.op === "pol-office" && c.actor === "pc"));
  if ( pcSeat ) assert.equal(pcSeat.size, "big", "the Gangrel seat for the player's character waits for the Storyteller");
  assert.ok(seen.some(r => r.gathering), "Elysium is held on the second inner turn");
  assert.ok(seen.every(r => r.text.length > 10));
});

test("the same seed gives the same politics; no politics setting, no politics", () => {
  const s = F.normState({factions: [court()]});
  const run = pol => F.runTurn(s, {streamFor: keyed(3), seedKey: "turn:3", turn: 3, year: 1600, pcActors: pcs, politics: pol});
  assert.deepEqual(run({info, boons: []}), run({info, boons: []}));
  assert.equal(run(null).filter(r => r.move === "politics").length, 0);
});

test("a dead holder's seat falls empty", () => {
  const f = court({politics: {offices: {prince: ["p"], sheriff: ["b"]}}});
  const dead = {...info, b: {...info.b, alive: false}};
  const out = PO.innerTurn(f, {rand: stream(5), polity: "camarilla", info: dead, turn: 1});
  assert.ok(out.changes.some(c => c.op === "pol-office" && c.office === "sheriff" && c.actor === "b" && c.remove));
});

test("a challenge for a seat: the winner takes it, the loser loses standing", () => {
  const f = court({polity: "sabbat", leader: "p", politics: {offices: {archbishop: ["p"], bishop: ["c", "d"], ductus: ["a", "c", "d"], priest: ["a", "b", "c"], templar: ["b", "d"]}}});
  let found = null;
  for ( let seed = 1; seed < 400 && !found; seed++ ) {
    const out = PO.innerTurn(f, {rand: stream(seed), polity: "sabbat", info, turn: 1});
    const won = out.changes.find(c => c.op === "pol-office" && !c.remove && c.office !== "archbishop" && !c.seed);
    if ( won ) found = out;
  }
  assert.ok(found, "some seed brings a challenge that is won");
  const take = found.changes.find(c => c.op === "pol-office" && !c.remove && !c.seed);
  const lose = found.changes.find(c => c.op === "pol-office" && c.remove && c.office === take.office);
  if ( lose ) assert.ok(found.changes.some(c => c.op === "pol-rank" && c.actor === lose.actor && c.delta === -1));
  assert.ok(found.lines.some(l => /monomacy|claim/.test(l)));
});

test("the Vaulderie: a die per packmate at the first rite, then +1 when the die beats the rating, never past 10", () => {
  const f = court({polity: "sabbat", members: ["p", "a", "b"], politics: {offices: {archbishop: ["p"]}, inner: 1, vinculum: {"p>a": 10, "a>p": 3}}});
  const out = PO.innerTurn(f, {rand: stream(11), polity: "sabbat", info, turn: 2});
  assert.ok(out.gathering, "the esbat gathers every second inner turn");
  const v = out.changes.filter(c => c.op === "pol-vinculum");
  assert.ok(!v.some(c => c.from === "p" && c.to === "a"), "a Vinculum of 10 cannot grow");
  for ( const c of v.filter(c => c.set !== undefined) ) assert.ok(c.set >= 1 && c.set <= 10);
  for ( const c of v.filter(c => c.delta !== undefined) ) assert.equal(c.delta, 1);
  assert.equal(v.filter(c => c.set !== undefined).length, 4, "four new pairs among three, both ways, less the two already bound");
});

test("a boon settled in the Ledger moves the debtor's standing in a court", () => {
  const s = F.normState({factions: [court(), F.normFaction({id: "guild", kind: "guild", members: ["c"]})]});
  const boon = size => ({kind: "boon", size, from: {id: "c"}, to: {id: "a"}});
  assert.deepEqual(PO.boonChanges(s, boon("minor"), "broken", {info, year: 1600}).map(c => [c.faction, c.delta]), [["court", -1]], "only the court, not the guild");
  assert.deepEqual(PO.boonChanges(s, boon("minor"), "kept", {info, year: 1600}), [], "a small boon paid earns nothing");
  assert.deepEqual(PO.boonChanges(s, boon("major"), "kept", {info, year: 1600}).map(c => c.delta), [1]);
  assert.deepEqual(PO.boonChanges(s, {...boon("major"), kind: "debt"}, "broken", {info}), []);
  const next = F.applyChanges(s, PO.boonChanges(s, boon("life"), "broken", {info, year: 1600})).state;
  assert.equal(next.factions[0].politics.ranks.c, 0, "Status 1 on the sheet, less one");
});

test("an open boon owed to a member can be called in, and the turn says to mark the Ledger", () => {
  let found = null;
  for ( let seed = 1; seed < 200 && !found; seed++ ) {
    const out = PO.innerTurn(court(), {rand: stream(seed), polity: "camarilla", info, boons: [{id: "b1", size: "major", from: "c", to: "a"}], turn: 1});
    if ( out.changes.some(c => c.op === "pol-boon") ) found = out;
  }
  assert.ok(found);
  assert.ok(found.lines.some(l => /calls in a major boon from Cyril; mark it in the Ledger/.test(l)));
});

test("every polity has a top seat, a judge, a law and a gathering, and no prose em-dashes", () => {
  for ( const [k, p] of Object.entries(PO.POLITIES) ) {
    assert.ok(PO.topOffice(k), k);
    assert.ok(PO.judgeOffice(k), k);
    assert.ok(p.law.length >= 3, k);
    assert.ok(p.gathering.every >= 1 && p.gathering.meets, k);
    assert.ok(!JSON.stringify(p).includes("—"), k);
  }
});
