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

// WoDX NPC 0.40.3: the Inquisition as the Companion has it (cells, Councils of Faith).
test("an Inquisition cell has a rector appointed above it and officers it elects", () => {
  const h = F.normFaction({id: "h", name: "Inquisitors", kind: "hunters", members: ["a", "b", "c"]});
  assert.equal(PO.polityFor(h, 1240), "inquisition");
  const P = PO.POLITIES.inquisition;
  assert.equal(PO.topOffice("inquisition").key, "rector");
  assert.ok(P.offices.filter(o => !o.top).every(o => o.fill === "backing"), "the cell elects its officers");
  assert.equal(PO.rankFrom("inquisition"), "rankbg");
  assert.equal(P.gathering.every, 1, "chapter meets each week");
  assert.equal(PO.polityFor({...h, polity: "council-of-faith"}, 1240), "council-of-faith");
  assert.equal(PO.polityFor({...h, polity: "council-of-faith"}, 1600), "hunter-society", "after 1499 the society of its age");
  assert.equal(PO.POLITIES["council-of-faith"].offices.find(o => o.key === "councillor").fill, "clan");
});

// WoDX NPC 0.62.0: the courts of Africa, the lands of Islam and East Asia by region (B2960 to B2962).
test("a Kindred faction keeps the court of its land: by its own region, else the homeland", () => {
  const k = extra => F.normFaction({id: "k", name: "K", kind: "kindred", members: ["a", "b", "c"], ...extra});
  try {
    PO.setHomeRegion(null);
    assert.equal(PO.polityFor(k(), 1600), "camarilla", "no region known: the courts of Europe");
    assert.equal(PO.polityFor(k({region: "west-africa"}), 1600), "laibon-council");
    assert.equal(PO.polityFor(k({region: "southern-africa"}), 1250), "laibon-council", "every age");
    assert.equal(PO.polityFor(k({region: "egypt"}), 1300), "ashirra");
    assert.equal(PO.polityFor(k({region: "persia"}), 2010), "ashirra");
    assert.equal(PO.polityFor(k({region: "japan"}), 1700), "kuei-jin-court");
    assert.equal(PO.polityFor(k({region: "moravia"}), 1300), "dark-ages-court");
    assert.equal(PO.polityFor(k({region: "india"}), 1700), "ravnos-court", "India keeps the Ravnos (0.63.0)");
    assert.equal(PO.polityFor(k({region: "india"}), 2005), "camarilla", "after the Ravnos fall of 1999, the court of its age");
    assert.equal(PO.polityFor(k({region: "brazil"}), 1700), "camarilla", "a land with no court of its own keeps Europe's");
    assert.equal(PO.polityFor(k(), 1600, {region: "levant"}), "ashirra", "a region passed by the caller");
    PO.setHomeRegion("central-africa");
    assert.equal(PO.homeRegion(), "central-africa");
    assert.equal(PO.polityFor(k(), 1600), "laibon-council", "no region of its own: the homeland's");
    assert.equal(PO.polityFor(k({region: "british-isles"}), 1600), "camarilla", "its own region wins over the homeland");
    assert.equal(PO.polityFor(k({polity: "camarilla"}), 1600), "camarilla", "the Storyteller's pick wins");
    assert.equal(PO.polityFor(k({polity: "none"}), 1600), null);
    assert.equal(PO.polityFor(k({members: ["a", "b"]}), 1600), null, "two are a coterie, not a court");
    assert.equal(PO.polityFor(F.normFaction({id: "g", kind: "garou", members: ["a", "b", "c"]}), 1600), "bastet-land", "a Garou faction in central Africa: the Bastet (0.63.0)");
    assert.equal(PO.polityFor(F.normFaction({id: "g", kind: "hunters", members: ["a", "b", "c"]}), 1600), "hunter-society", "other kinds keep their polity");
    PO.setHomeRegion(42);
    assert.equal(PO.homeRegion(), null, "a bad homeland is ignored");
  } finally { PO.setHomeRegion(null); }
});

test("a faction keeps its region, cleaned, and every court region is a world region", async () => {
  assert.equal(F.normFaction({id: "a", region: "egypt"}).region, "egypt");
  assert.equal(F.normFaction({id: "a", region: "Egypt; drop"}).region, "");
  assert.equal(F.normFaction({id: "a"}).region, "");
  const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
  for ( const [r, key] of [...Object.entries(PO.REGION_COURTS), ...Object.entries(PO.REGION_SHIFTERS), ...Object.entries(PO.REGION_MAGES)] ) {
    assert.ok(W.WORLD_REGIONS[r], `${r} is a world region`);
    assert.ok(PO.POLITIES[key], `${key} is a polity`);
  }
});

test("the Laibon and Ashirra courts seat their legacies and clans and hear their own law", () => {
  const ppl = {a: {name: "A", clan: "Osebo", status: 3}, b: {name: "B", clan: "Guruhi", status: 2}, c: {name: "C", clan: "Akunanse", status: 1}};
  for ( const key of ["laibon-council", "ashirra"] ) {
    const P = PO.POLITIES[key];
    assert.equal(P.line, "vampire");
    assert.ok(P.offices.some(o => o.fill === "clan"), `${key} gives each bloc a voice`);
    assert.notEqual(PO.topOffice(key).key, PO.judgeOffice(key).key, `${key}: the judge is not the top seat`);
    assert.ok(P.titles[PO.topOffice(key).key].length >= 3, `${key} offers names for its top seat`);
    const f = F.normFaction({id: "x", name: "X", kind: "kindred", polity: key, leader: "a", members: ["a", "b", "c"]});
    const out = PO.innerTurn(f, {polity: key, info: ppl, rand: stream(11), turn: 0});
    assert.ok(out.lines.length, key);
    if ( key === "laibon-council" ) assert.ok(!out.lines.some(l => /\bclans\b/.test(l)), "the Laibon speak of legacies");
  }
});

// WoDX NPC 0.63.0 (B2963 to B2968): the rest of the courts beyond Europe.
test("India, Central Asia and Tibet keep courts of their own for Kindred", () => {
  const k = (o = {}) => F.normFaction({id: "k", kind: "kindred", members: ["a", "b", "c"], ...o});
  assert.equal(PO.polityFor(k({region: "india"}), 1500), "ravnos-court");
  assert.equal(PO.polityFor(k({region: "india"}), 1999), "ravnos-court", "the fall comes in the summer of 1999");
  assert.equal(PO.polityFor(k({region: "india"}), 2000), "camarilla");
  assert.equal(PO.polityFor(k({region: "india"}), 1300), "ravnos-court", "before the Camarilla too");
  assert.equal(PO.polityFor(k({region: "india", polity: "ravnos-court"}), 2010), "camarilla", "a pick past its time gives way to the court of its age");
  assert.equal(PO.polityFor(k({region: "central-asia"}), 1250), "ashirra");
  assert.equal(PO.polityFor(k({region: "tibet-himalaya"}), 1800), "kuei-jin-court");
});

test("a Garou faction in Asia keeps a Beast Court, in Africa a land of the Bastet, and its name can say which", () => {
  const g = (o = {}) => F.normFaction({id: "g", kind: "garou", members: ["a", "b", "c"], ...o});
  for ( const r of ["china", "japan", "korea", "southeast-asia", "nusantara", "india", "tibet-himalaya"] ) assert.equal(PO.polityFor(g({region: r}), 1700), "beast-court", r);
  for ( const r of ["west-africa", "east-africa", "central-africa", "southern-africa"] ) assert.equal(PO.polityFor(g({region: r}), 1700), "bastet-land", r);
  assert.equal(PO.polityFor(g({region: "egypt"}), 1700), "garou-sept", "north Africa keeps its septs");
  assert.equal(PO.polityFor(g({region: "british-isles"}), 1700), "garou-sept");
  assert.equal(PO.polityFor(g({region: "north-america-west", name: "The Simba pride of the hills"}), 1700), "bastet-land", "a Bastet tribe named");
  assert.equal(PO.polityFor(g({region: "british-isles", name: "Kitsune of the old shrine"}), 1700), "beast-court", "a Hengeyokai breed named");
  assert.equal(PO.polityFor(g({region: "japan", polity: "garou-sept"}), 1700), "garou-sept", "a pick wins");
  try {
    PO.setHomeRegion("japan");
    assert.equal(PO.polityFor(g(), 1700), "beast-court", "the homeland's");
  } finally { PO.setHomeRegion(null); }
});

test("a mages' faction keeps the Wu Lung, the Akashic Brotherhood or the Ahl-i-Batin by region; Reason keeps Reason", () => {
  const m = (o = {}) => F.normFaction({id: "m", kind: "mages", members: ["a", "b", "c"], ...o});
  assert.equal(PO.polityFor(m({region: "china"}), 1300), "wu-lung-court");
  assert.equal(PO.polityFor(m({region: "korea"}), 1990), "wu-lung-court");
  for ( const r of ["japan", "southeast-asia", "nusantara", "india", "tibet-himalaya"] ) assert.equal(PO.polityFor(m({region: r}), 1700), "akashic-monastery", r);
  for ( const r of ["maghreb", "egypt", "arabia", "levant", "persia", "anatolia", "central-asia"] ) assert.equal(PO.polityFor(m({region: r}), 1700), "batini-circle", r);
  assert.equal(PO.polityFor(m({region: "china", name: "Iteration X Construct"}), 1990), "technocracy-construct");
  assert.equal(PO.polityFor(m({region: "france"}), 1700), "tradition-chantry");
  assert.equal(PO.polityFor(m({region: "france"}), 1300), "mage-fellowship");
});

test("the new courts seat their breeds, tribes and blocs and hear their own law", () => {
  const ppl = {a: {name: "A", tribe: "Khan", sect: "Akashic Brotherhood", clan: "Ravnos", status: 3, rank: 4, arete: 4},
    b: {name: "B", tribe: "Kitsune", sect: "Wu Lung", clan: "Assamite", status: 2, rank: 2, arete: 2},
    c: {name: "C", tribe: "Zhong Lung", sect: "Ahl-i-Batin", clan: "Kuei-jin", status: 1, rank: 1, arete: 1}};
  for ( const key of ["ravnos-court", "beast-court", "bastet-land", "wu-lung-court", "akashic-monastery", "batini-circle"] ) {
    const P = PO.POLITIES[key];
    assert.ok(P.titles?.[PO.topOffice(key).key]?.length >= 3, `${key} offers names for its top seat`);
    assert.ok(P.law.length >= 5, `${key} has five laws`);
    assert.ok(/Used by default/.test(P.notes), `${key} says where it is used`);
    assert.ok(!/—/.test(JSON.stringify(P)) && !/\b(he|she|him|her|his|hers)\b/i.test(JSON.stringify(P)), `${key}: no em-dashes or gendered words`);
    const f = F.normFaction({id: "x", name: "X", kind: P.kinds[0], polity: key, leader: "a", members: ["a", "b", "c"]});
    const out = PO.innerTurn(f, {polity: key, info: ppl, rand: stream(7), turn: 0});
    assert.ok(out.lines.length, key);
  }
  assert.ok(!PO.innerTurn(F.normFaction({id: "x", kind: "garou", polity: "beast-court", leader: "a", members: ["a", "b", "c"]}),
    {polity: "beast-court", info: ppl, rand: stream(3), turn: 0}).lines.some(l => /\btribes\b/.test(l)), "a Beast Court speaks of breeds");
});

// WoDX NPC 0.64.0 (B2970 to B2974): before the settlers, the Mokolé and the Nagah.
test("before the settlers: no Kindred court, the Nunnehi for fae, the Mokolé and the Bastet for Garou", () => {
  const f = (kind, region, name = "") => F.normFaction({id: "x", kind, region, name, members: ["a", "b", "c"]});
  assert.equal(PO.polityFor(f("kindred", "mexico"), 1500), null, "Tenochtitlan before 1521 has no prince");
  assert.equal(PO.polityFor(f("kindred", "mexico"), 1521), "camarilla", "the settlers bring the court of the age");
  assert.equal(PO.polityFor(f("kindred", "caribbean"), 1491), null);
  assert.equal(PO.polityFor(f("kindred", "australia"), 1787), null);
  assert.equal(PO.polityFor(f("kindred", "australia"), 1900), "camarilla");
  assert.equal(PO.polityFor(f("kindred", "antarctica"), 2010), null, "never a court on the ice");
  assert.equal(PO.polityFor(f("kindred", "pacific-islands"), 1700), null);
  assert.equal(PO.polityFor(f("kindred", "british-isles"), 1300), "dark-ages-court", "Europe unchanged");
  assert.equal(PO.polityFor(F.normFaction({id: "x", kind: "kindred", region: "mexico", polity: "camarilla", members: ["a", "b", "c"]}), 1500), "camarilla", "a pick still wins");
  assert.equal(PO.polityFor(f("fae", "andes"), 1400), "nunnehi-council");
  assert.equal(PO.polityFor(f("fae", "arctic"), 1500), "nunnehi-council");
  assert.equal(PO.polityFor(f("fae", "andes"), 1700), "commoner-freehold", "after the settlers, the court of the age");
  assert.equal(PO.polityFor(f("fae", "siberia"), 1500), "land-fae-circle", "the Nunnehi stay in the Americas (NPC 0.66.0: Siberia keeps its own fae)");
  assert.equal(PO.polityFor(f("fae", "france"), 1300), "fae-court");
  assert.equal(PO.polityFor(f("garou", "australia"), 1700), "mokole-gathering");
  assert.equal(PO.polityFor(f("garou", "australia"), 1800), "garou-sept");
  assert.equal(PO.polityFor(f("garou", "mexico"), 1400), "bastet-land");
  assert.equal(PO.polityFor(f("garou", "mexico"), 1600), "garou-sept");
  assert.equal(PO.polityFor(f("garou", "north-america-east"), 1500), "garou-sept", "the tribes of the land keep septs");
});

test("the Nagah and the Mokolé by name, ahead of the regional default", () => {
  const g = (region, name) => F.normFaction({id: "x", kind: "garou", region, name, members: ["a", "b", "c"]});
  assert.equal(PO.polityFor(g("india", "A nest of the Nagah"), 1600), "nagah-nest");
  assert.equal(PO.polityFor(g("west-africa", "The Mokole of the delta"), 1600), "mokole-gathering");
  assert.equal(PO.polityFor(g("china", "Zhong Lung of the river"), 1600), "beast-court", "the dragons of the East sit in the Beast Courts");
  assert.equal(PO.polityFor(g("japan", "Kitsune"), 1600), "beast-court");
  const ppl = {a: {name: "A", tribe: "Gumagan", house: "Cherokee", rank: 3, title: 3}, b: {name: "B", tribe: "Piasa", house: "Inuit", rank: 2, title: 2}, c: {name: "C", tribe: "Makara", rank: 1}};
  for ( const key of ["nunnehi-council", "mokole-gathering", "nagah-nest"] ) {
    const P = PO.POLITIES[key];
    assert.ok(P.titles?.[PO.topOffice(key).key]?.length >= 3, key);
    assert.ok(P.law.length >= 5, key);
    assert.ok(!/—/.test(JSON.stringify(P)) && !/\b(he|she|him|her|his|hers)\b/i.test(JSON.stringify(P)), key);
    const out = PO.innerTurn(F.normFaction({id: "x", kind: P.kinds[0], polity: key, leader: "a", members: ["a", "b", "c"]}), {polity: key, info: ppl, rand: stream(5), turn: 0});
    assert.ok(out.lines.length, key);
  }
});

test("every region named by the new tables is a world region", async () => {
  const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
  for ( const r of [...PO.NO_KINDRED_COURT, ...PO.NUNNEHI_LANDS, ...Object.keys(PO.SETTLER_SHIFTERS)] ) assert.ok(W.WORLD_REGIONS[r], r);
});

// WoDX NPC 0.66.0 (B3010 to B3015): the other changing breeds, the Hsien and the land's own fae.
test("the Ananasi, Corax, Gurahl, Ratkin and Rokea by name; the Hengeyokai's own names stay in the Beast Courts", () => {
  const g = (region, name) => F.normFaction({id: "x", kind: "garou", region, name, members: ["a", "b", "c"]});
  assert.equal(PO.polityFor(g("brazil", "Ananasi of the old city"), 1600), "ananasi-web");
  assert.equal(PO.polityFor(g("british-isles", "The Corax of the tower"), 1300), "corax-flock");
  assert.equal(PO.polityFor(g("canada", "Gurahl of the north woods"), 1900), "gurahl-den");
  assert.equal(PO.polityFor(g("moravia", "Ratkin under Brno"), 1400), "ratkin-nest");
  assert.equal(PO.polityFor(g("pacific-islands", "The Rokea of the reef"), 2000), "rokea-shiver");
  assert.equal(PO.polityFor(g("japan", "Nezumi of the docks"), 1700), "beast-court", "the rats of Asia sit in the Beast Courts");
  assert.equal(PO.polityFor(g("china", "Ratkin of the river"), 1700), "ratkin-nest", "a name wins over the region");
  assert.equal(PO.polityFor(g("british-isles", "Fianna of the hill"), 1300), "garou-sept", "a plain sept is unchanged");
  const ppl = {a: {name: "A", tribe: "Tenere", house: "Hirayanu", rank: 3, title: 3}, b: {name: "B", tribe: "Forest Walkers", house: "Pyon", rank: 2, title: 2}, c: {name: "C", tribe: "Knife Skulkers", rank: 1, title: 1}};
  for ( const key of ["ananasi-web", "corax-flock", "gurahl-den", "ratkin-nest", "rokea-shiver", "hsien-court", "land-fae-circle"] ) {
    const P = PO.POLITIES[key];
    assert.ok(P, key);
    assert.ok(P.titles?.[PO.topOffice(key).key]?.length >= 3, `${key} offers names for its top seat`);
    assert.ok(P.law.length >= 5, `${key} has five laws`);
    assert.ok(/Used by default|used by default/.test(P.notes), `${key} says where it is used`);
    assert.ok(!/—/.test(JSON.stringify(P)) && !/\b(he|she|him|her|his|hers)\b/i.test(JSON.stringify(P)), `${key}: no em-dashes or gendered words`);
    const out = PO.innerTurn(F.normFaction({id: "x", kind: P.kinds[0], polity: key, leader: "a", members: ["a", "b", "c"]}), {polity: key, info: ppl, rand: stream(9), turn: 0});
    assert.ok(out.lines.length, key);
  }
});

test("the Hsien in East Asia and the land's own fae in the Pacific and Siberia before the settlers", () => {
  const f = (region, y) => PO.polityFor(F.normFaction({id: "x", kind: "fae", region, members: ["a", "b", "c"]}), y);
  assert.equal(f("china", 1300), "hsien-court");
  assert.equal(f("japan", 2000), "hsien-court", "in every era");
  assert.equal(f("korea", 1700), "hsien-court");
  assert.equal(f("tibet-himalaya", 1300), "fae-court", "Tibet keeps the default");
  assert.equal(f("pacific-islands", 1700), "land-fae-circle");
  assert.equal(f("aotearoa", 1800), "land-fae-circle");
  assert.equal(f("siberia", 1500), "land-fae-circle");
  assert.equal(f("siberia", 1700), "commoner-freehold", "after the settlers, the court of the age");
  assert.equal(f("aotearoa", 1900), "commoner-freehold");
  assert.equal(f("andes", 1400), "nunnehi-council", "the Nunnehi unchanged");
  assert.equal(f("france", 1300), "fae-court", "Europe unchanged");
  assert.equal(PO.polityFor(F.normFaction({id: "x", kind: "fae", region: "china", polity: "noble-fief", members: ["a", "b", "c"]}), 1990), "noble-fief", "a pick still wins");
});

test("the Hsien and land-fae tables name world regions", async () => {
  const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
  for ( const r of [...PO.HSIEN_LANDS, ...PO.LAND_FAE_LANDS] ) assert.ok(W.WORLD_REGIONS[r], r);
});
