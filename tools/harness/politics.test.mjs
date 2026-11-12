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

// WoDX NPC 0.26.0: Garou septs, fae courts by era, a Wraith necropolis, challenges staged as fights.
const ginfo = {
  e: {name: "Elder", tribe: "Silver Fangs", rank: 4, attrs: {strength: 4, dexterity: 3, wits: 2, perception: 2, charisma: 3, manipulation: 2}},
  w: {name: "Warder", tribe: "Get of Fenris", rank: 3, attrs: {strength: 3, dexterity: 3}},
  y: {name: "Cub", tribe: "Fianna", rank: 1, attrs: {wits: 4, perception: 4}},
  z: {name: "Pup", tribe: "Uktena", rank: 1},
  pc: {name: "Player", tribe: "Fianna", rank: 2, pc: true}
};
const sept = (extra = {}) => F.normFaction({id: "sept", name: "The sept", kind: "garou", leader: "e", members: ["e", "w", "y", "z", "pc"], ...extra});

test("Garou, fae and Wraith factions keep the polity of their kind and age", () => {
  assert.equal(PO.polityFor(sept(), 1197), "garou-sept");
  const fae = F.normFaction({id: "f", name: "Fae", kind: "fae", members: ["a", "b", "c"]});
  assert.equal(PO.polityFor(fae, 1300), "fae-court");
  assert.equal(PO.polityFor(fae, 1350), "commoner-freehold");
  assert.equal(PO.polityFor(fae, 1968), "commoner-freehold");
  assert.equal(PO.polityFor(fae, 1969), "noble-fief");
  // A noble fief picked for 1500 runs as the commoner freehold of its age
  assert.equal(PO.polityFor({...fae, polity: "noble-fief"}, 1500), "commoner-freehold");
  const dead = F.normFaction({id: "n", name: "Necropolis", kind: "spirits", members: ["a", "b", "c"]});
  assert.equal(PO.polityFor(dead, 1600), null, "spirits keep no polity unless picked");
  assert.equal(PO.polityFor({...dead, polity: "wraith-legion"}, 1600), "wraith-legion");
  assert.equal(PO.baseRank(ginfo, "e", "garou-sept"), 4, "Garou Rank comes from the sheet");
  assert.equal(PO.baseRank({x: {title: 3, status: 1}}, "x", "noble-fief"), 3, "a noble's Title");
});

test("the challenged Garou picks the contest they are best at", () => {
  assert.equal(PO.contestFor("garou-sept", ginfo, "y").how, "a riddle contest");
  assert.equal(PO.contestFor("garou-sept", ginfo, "w").how, "a contest of strength");
  assert.equal(PO.contestFor("camarilla", ginfo, "y").how, "a challenge");
});

test("a challenge with a player's character is staged, never rolled, and needs the Storyteller", () => {
  // Every seat full and the player's character in the Warder's seat: a bid becomes a challenge for it
  const offices = Object.fromEntries(PO.POLITIES["garou-sept"].offices.map(o => [o.key, [o.top ? "e" : o.key === "warder" ? "pc" : "w"]]));
  const f = sept({politics: {offices, favour: {y: 1}}});
  let saw = null;
  for ( let seed = 1; seed < 200 && !saw; seed++ ) {
    const out = PO.innerTurn(f, {polity: "garou-sept", info: ginfo, rand: stream(seed), turn: 1});
    saw = out.changes.find(c => c.op === "pol-fight") ?? null;
    if ( saw ) {
      assert.equal(saw.holder, "pc");
      assert.equal(saw.noKill, true);
      assert.ok(!out.changes.some(c => c.op === "pol-office" && c.actor === "pc"), "nothing rolled for the seat");
      assert.equal(F.sizeOf([{...saw, faction: "sept"}], {pcActors: new Set(["pc"])}), "big");
      assert.match(F.describeChange({...saw, faction: "sept"}, {actor: id => ginfo[id]?.name ?? id, faction: () => "The sept"}), /stage it as a fight, ended at submission/);
    }
  }
  assert.ok(saw, "some seed brings a challenge");
});

test("at the moot one with favour challenges a Garou of higher Rank and may rise", () => {
  const offices = Object.fromEntries(PO.POLITIES["garou-sept"].offices.map(o => [o.key, [o.top ? "e" : "w"]]));
  let rose = false, staged = false;
  for ( let seed = 1; seed < 80; seed++ ) {
    const f = sept({members: ["e", "w", "y", "z"], politics: {offices, favour: {y: 2}, inner: 3}});
    const out = PO.innerTurn(f, {polity: "garou-sept", info: ginfo, rand: stream(seed), turn: 4});
    assert.equal(out.gathering, true);
    if ( out.changes.some(c => c.op === "pol-rank" && c.actor === "y" && c.delta === 1) ) rose = true;
    const g = sept({politics: {offices, favour: {pc: 2}, inner: 3}});
    if ( PO.innerTurn(g, {polity: "garou-sept", info: ginfo, rand: stream(seed), turn: 4}).changes.some(c => c.op === "pol-fight" && c.rise) ) staged = true;
  }
  assert.ok(rose, "a cub wins Rank at some moot");
  assert.ok(staged, "a player's challenge for Rank is staged");
});

test("a Great Maelstrom empties necropolis seats but the Anacreon's", () => {
  const offices = {anacreon: ["a"], regent: ["b", "c"], centurion: ["d"]};
  const st = F.normState({factions: [F.normFaction({id: "n", name: "Necropolis", kind: "spirits", polity: "wraith-legion", members: ["a", "b", "c", "d"], politics: {offices}}),
    F.normFaction({id: "k", name: "Court", kind: "kindred", polity: "camarilla", members: ["a", "b", "c"], politics: {offices: {sheriff: ["b"]}}})]});
  assert.equal(PO.isMaelstrom("fourth-great-maelstrom"), true);
  assert.equal(PO.isMaelstrom("convention-of-thorns"), false);
  const ch = PO.maelstromChanges(st, {year: 1916, rand: () => 0});
  assert.deepEqual(ch.map(c => c.actor).sort(), ["b", "c", "d"]);
  assert.ok(ch.every(c => c.faction === "n" && c.remove));
  const r = F.applyChanges(st, ch, {ids: () => "x", now: 0});
  assert.deepEqual(r.state.factions[0].politics.offices.anacreon, ["a"]);
  assert.equal((r.state.factions[0].politics.offices.regent ?? []).length, 0);
  assert.equal(PO.maelstromChanges(st, {year: 1916, rand: () => 0.99}).length, 0, "a 10 spares them all");
});

test("turn lines speak of the polity's own blocs and body", () => {
  const lines = [];
  for ( let seed = 1; seed < 30; seed++ ) lines.push(...PO.innerTurn(sept(), {polity: "garou-sept", info: ginfo, rand: stream(seed), turn: seed}).lines);
  const all = lines.join(" ");
  assert.doesNotMatch(all, /other clans|petitions the court/);
  assert.doesNotMatch(all, /Get Of Fenris/);
});

// WoDX NPC 0.28.0: mages, hunters, mummies, demons and the Kuei-jin.
test("mages and hunters keep the polity of their side and age", () => {
  const m = (name, extra = {}) => F.normFaction({id: "m", name, kind: "mages", members: ["a", "b", "c"], ...extra});
  assert.equal(PO.polityFor(m("A Verbena circle"), 1300), "mage-fellowship");
  assert.equal(PO.polityFor(m("A Verbena circle"), 1466), "tradition-chantry");
  assert.equal(PO.polityFor(m("The Craftmason lodge"), 1320), "mage-fellowship");
  assert.equal(PO.polityFor(m("The Craftmason lodge"), 1600), "order-of-reason");
  assert.equal(PO.polityFor(m("Iteration X lab"), 1950), "technocracy-construct");
  assert.equal(PO.polityFor(m("Some mages", {polity: "technocracy-construct"}), 1700), "order-of-reason", "a Construct picked too early runs as the Order");
  assert.equal(PO.polityFor(m("Some mages", {polity: "order-of-reason"}), 1990), "technocracy-construct");
  const h = F.normFaction({id: "h", name: "Hunters", kind: "hunters", members: ["a", "b", "c"]});
  assert.deepEqual([1300, 1499, 1500, 1998, 1999, 2030].map(y => PO.polityFor(h, y)), ["inquisition", "inquisition", "hunter-society", "hunter-society", "imbued-cell", "imbued-cell"]);
  assert.equal(PO.baseRank({x: {arete: 3}}, "x", "tradition-chantry"), 3, "Arete stands in for standing");
  assert.equal(PO.baseRank({x: {rankbg: 2, rank: 4}}, "x", "technocracy-construct"), 2, "the Rank Background, not Garou Rank");
});

test("mummies, demons and Kuei-jin courts are picked by hand, in their years", () => {
  const o = F.normFaction({id: "o", name: "The Undying", kind: "other", members: ["a", "b", "c"]});
  assert.equal(PO.polityFor(o, 1990), null);
  assert.equal(PO.polityFor({...o, polity: "shemsu-heru"}, 1990), "shemsu-heru");
  assert.equal(PO.polityFor({...o, polity: "fallen-congregation"}, 2000), "fallen-congregation");
  assert.equal(PO.polityFor({...o, polity: "fallen-congregation"}, 1990), null, "no Fallen before 1999");
  const k = F.normFaction({id: "k", name: "A court", kind: "kindred", polity: "kuei-jin-court", members: ["a", "b", "c"]});
  assert.equal(PO.polityFor(k, 1600), "kuei-jin-court");
});

test("every polity runs an inner turn and a gathering without a fault", () => {
  const ppl = {a: {name: "A", sect: "Verbena", creed: "Zealot", amenti: "Kher-minu", faction: "Reconcilers", wu: "Dragon", tribe: "Fianna", house: "Fiona", court: "Seelie", legion: "Iron", arete: 3, rankbg: 2, status: 2, rank: 2, title: 2},
    b: {name: "B", sect: "Order of Hermes", creed: "Judge", amenti: "Sefekhi", faction: "Faustians", wu: "Tiger", tribe: "Uktena", house: "Gwydion", court: "Unseelie", legion: "Grim", status: 1, rank: 1},
    c: {name: "C", sect: "Verbena", creed: "Zealot", amenti: "Kher-minu", faction: "Reconcilers", wu: "Dragon", status: 0}};
  for ( const key of PO.POLITY_LIST ) {
    let f = F.normFaction({id: "x", name: "X", kind: PO.POLITIES[key].kinds[0], polity: key, leader: "a", members: ["a", "b", "c"]});
    for ( let t = 0; t < 4; t++ ) {
      const out = PO.innerTurn(f, {polity: key, info: ppl, rand: stream(t + 3), turn: t});
      assert.ok(out.lines.length, key);
      const st = F.applyChanges(F.normState({factions: [f]}), out.changes.map(c => ({...c, faction: "x"})), {ids: () => "i", now: 0});
      f = st.state.factions[0];
    }
    assert.ok(f.politics.inner >= 4, `${key} counts its turns`);
    assert.ok(PO.POLITIES[key].notes && PO.POLITIES[key].law.length, `${key} has notes and law`);
  }
});

// WoDX NPC 0.29.0: what a player sees of the politics.
test("a player sees the seats and their own character's standing, never others' favour or charges", () => {
  const f = court({politics: {offices: {prince: ["p"], harpy: ["a"]}, favour: {pc: 2, a: 5}, claims: [{office: "sheriff", who: "pc"}, {office: "keeper", who: "b"}],
    docket: [{id: "1", by: "a", against: "pc", law: "breaking the Masquerade"}, {id: "2", by: "pc", against: "b", law: "trespass"}], inner: 3}});
  const v = PO.playerView(f, ["pc", "elsewhere"], {year: 1600, info, names: {actor: id => info[id]?.name ?? id}});
  assert.equal(v.key, "camarilla");
  assert.deepEqual(v.seats.find(o => o.key === "prince").holders, ["Ottokar"]);
  assert.equal(v.people.length, 1);
  const me = v.people[0];
  assert.equal(me.favour, 2);
  assert.deepEqual(me.claims, ["Sheriff"]);
  assert.deepEqual(me.charges, ["breaking the Masquerade"]);
  assert.equal(me.rank, 1);
  assert.equal(v.nextIn, 1, "Elysium every second turn, three turns run");
  const all = JSON.stringify(v);
  assert.doesNotMatch(all, /trespass|"favour":5/, "others' charges and favour stay hidden");
  assert.equal(PO.playerView(f, ["nobody"], {year: 1600, info}), null);
  assert.equal(PO.playerView({...f, polity: "none"}, ["pc"], {year: 1600, info}), null);
});
