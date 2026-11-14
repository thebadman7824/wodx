import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* WoDX NPC 0.48.0: settlements, the record of a whole generated place (B2520 to B2529) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SR = await import(join(root, "modules/wodx-npc/scripts/settlement-rules.mjs"));
const RS = await import(join(root, "modules/wodx-npc/scripts/resident-rules.mjs"));
const A = await import(join(root, "modules/wodx-interactables/scripts/adopt-rules.mjs"));
const sample = y => readFileSync(join(root, `tools/mapgen/samples/steinfeld-${y}.settlement.json`), "utf8");
const sidecar = y => readFileSync(join(root, `tools/mapgen/samples/steinfeld-${y}.wodx.json`), "utf8");
const rec = y => SR.readRecord(sample(y)).data;

test("settlement: the sample records read clean, and what is not a record is refused in plain words", () => {
  for ( const y of [1197, 1995] ) {
    const got = SR.readRecord(sample(y));
    assert.equal(got.ok, true);
    assert.deepEqual(got.errors, []);
    const r = got.data;
    assert.equal(r.id, `steinfeld-${y}-7`);
    assert.equal(r.year, y);
    assert.ok(r.households.length >= 10);
    assert.equal(r.population, r.households.reduce((s, h) => s + h.people.length, 0));
    assert.ok(r.households.every(h => h.id.startsWith(`${r.id}.`) && h.building && h.trade && h.people.every(p => typeof p === "string")));
    assert.ok(r.ties.every(t => SR.TIE_KINDS[t.kind]));
  }
  assert.equal(SR.readRecord("not json").ok, false);
  assert.equal(SR.readRecord({format: "wodx-map", version: 1}).ok, false);
  assert.equal(SR.readRecord({format: SR.FORMAT, version: 2, id: "x"}).ok, false);
  assert.equal(SR.readRecord({format: SR.FORMAT, version: 1, id: "x", households: []}).ok, false);
  // a tie to a household that is not there, and one of an unknown kind, are dropped
  const odd = SR.readRecord({format: SR.FORMAT, version: 1, id: "x", year: 1300, households: [{id: "x.a", people: ["smith"]}, {id: "x.b", people: [{role: "baker"}]}],
    ties: [{a: "x.a", b: "x.zz", kind: "friend"}, {a: "x.a", b: "x.b", kind: "betrothed"}, {a: "x.a", b: "x.b", kind: "rival", note: "n"}]});
  assert.equal(odd.ok, true);
  assert.deepEqual(odd.data.ties, [{a: "x.a", b: "x.b", kind: "rival", note: "n"}]);
  assert.deepEqual(odd.data.households[1].people, ["baker"]);
});

test("settlement: the households of a year follow the year (no medieval trades in 1995, no modern ones in 1197)", () => {
  const old = rec(1197), now = rec(1995);
  const trades = r => new Set(r.households.map(h => h.trade));
  for ( const t of ["herder", "cottager", "alehouse keeper", "widowed spinner", "cooper", "wheelwright", "chandler"] ) assert.ok(!trades(now).has(t), `${t} in 1995`);
  for ( const t of ["office worker", "programmer", "factory worker", "pensioner", "mayor"] ) assert.ok(!trades(old).has(t), `${t} in 1197`);
  assert.ok(trades(now).has("mayor") && trades(now).has("schoolteacher"), "the offices of 1995");
  assert.equal(now.notables.length, 2);
  // households shrink across the centuries, and more people live alone
  const a = SR.summary(old), b = SR.summary(now);
  assert.ok(a.mean > b.mean, `${a.mean} > ${b.mean}`);
  assert.ok(b.alone / b.households > a.alone / a.households);
  assert.equal(b.people, now.population);
});

test("settlement: the sidecar's households carry the settlement's id, and adopting keeps them", () => {
  for ( const y of [1197, 1995] ) {
    const r = rec(y), sc = JSON.parse(sidecar(y));
    assert.deepEqual(sc.settlement, {id: r.id, name: "Steinfeld", year: y});
    const d = A.parseSidecar(sidecar(y)).data;
    const ids = new Set(d.households.map(h => h.id));
    assert.equal(ids.size, r.households.length);
    assert.ok(r.households.every(h => ids.has(h.id)), "every household of the record is on the map");
    assert.ok(d.households.every(h => SR.settlementOf(h.id) === r.id));
    // and WoDX NPC's residents read them from the regions adopting leaves
    const regs = d.regions.map(x => ({uuid: `Scene.s.Region.${x.id}`, name: x.label, flags: A.regionData(x, {x: 0, y: 0, size: 100}, new Set()).data.flags}));
    const list = RS.householdsOn(regs);
    assert.equal(list.length, r.households.length, "every flat of a block is read, not only the last");
    assert.equal(new Set(list.map(h => h.household.id)).size, list.length);
    if ( y === 1995 ) assert.ok(list.some(h => h.shared > 1) && list.some(h => h.shared === 1));
    for ( const h of list ) for ( const p of RS.planHousehold(h, {year: y}) ) assert.ok(p.preset && p.template, `${h.household.id}: ${p.role}`);
  }
  assert.equal(SR.settlementOf("cottage-3-household"), null);
});

test("settlement: the hidden folk are drawn the same each time, change on a new draw, and keep to the year", () => {
  const now = rec(1995), old = rec(1197);
  const a = SR.proposeFolk(now), b = SR.proposeFolk(now);
  assert.deepEqual(a, b);
  assert.ok(a.length >= 2, "a village of 288 people has some");
  const ids = new Set(now.households.map(h => h.id));
  assert.ok(a.every(f => ids.has(f.household) && SR.FOLK[f.key] && f.on && f.label && f.where));
  assert.equal(new Set(a.map(f => f.household)).size, a.length, "no household drawn twice");
  let differs = false;
  for ( let nonce = 1; nonce < 6 && !differs; nonce++ ) differs = JSON.stringify(SR.proposeFolk(now, {nonce})) !== JSON.stringify(a);
  assert.ok(differs, "a new draw gives another list");
  // a household of ghouls or Kinfolk has at least two people
  for ( const f of a.filter(x => x.unit === "household") ) assert.ok(now.households.find(h => h.id === f.household).people.length >= 2);
  // the Fallen come in 1999; a hunter is an inquisitor in 1197 and imbued only from 1999
  assert.ok(!SR.linesFor({year: 1995, era: "modern"}).includes("demon"));
  assert.ok(SR.linesFor({year: 2001, era: "modern"}).includes("demon"));
  assert.equal(SR.FOLK.hunter.label(1197, "dark-ages"), "An inquisitor");
  assert.equal(SR.FOLK.hunter.label(1995, "modern"), "A hunter of the night-folk");
  assert.equal(SR.FOLK.hunter.label(2001, "modern"), "One of the imbued");
  assert.equal(SR.FOLK.hunter.label(2015, "future-darkness"), "A hunter of the night-folk");
  assert.equal(SR.FOLK.hunter.label(2030, "future-darkness"), "One of the imbued");
  assert.equal(SR.FOLK.vampire.label(1197), "A Cainite's haven");
  assert.equal(SR.FOLK.vampire.label(1995), "A Kindred's haven");
  // a struck household is never drawn, and only the asked lines are
  const struck = a.map(f => f.household);
  assert.ok(SR.proposeFolk(now, {struck}).every(f => !struck.includes(f.household)));
  assert.ok(SR.proposeFolk(now, {lines: ["wraith"]}).every(f => f.key === "wraith"));
  assert.ok(SR.proposeFolk(old).every(f => f.key !== "demon"));
  // too few people for a haven or a mage in a hamlet
  const tiny = {...old, households: old.households.slice(0, 4)};
  assert.ok(SR.proposeFolk(tiny).every(f => !["vampire", "mage", "demon"].includes(f.key)));
});

test("settlement: the review strikes households, keeps or drops ties, and the residents window is told", () => {
  const r = rec(1995);
  const folk = SR.proposeFolk(r);
  const gone = r.households[3].id;
  const rv = SR.normReview(r, {struck: [gone, "nobody"], folk: [...folk, {key: "nonsense", household: gone}], ties: {rival: false}});
  assert.deepEqual(rv.struck, [gone]);
  assert.equal(rv.folk.length, folk.length);
  assert.equal(rv.ties.rival, false);
  assert.equal(rv.ties.friend, true);
  const kept = SR.tiesKept(r, rv);
  assert.ok(kept.every(t => t.kind !== "rival" && t.a !== gone && t.b !== gone));
  assert.ok(kept.length < r.ties.length);
  const entry = {record: r, review: rv};
  assert.equal(SR.infoFor(entry, gone).struck, true);
  const f = folk[0];
  const info = SR.infoFor(entry, f.household);
  assert.equal(info.struck, false);
  assert.deepEqual(info.folk.map(x => x.key), [f.key]);
  assert.equal(info.name, "Steinfeld");
  assert.equal(SR.infoFor(entry, "other-1.cottage-1-household"), null);
  const mayor = r.notables.find(x => x.role === "mayor");
  assert.equal(SR.infoFor(entry, mayor.household).office, "mayor");
  // an unticked hidden one is not passed on
  const off = SR.normReview(r, {folk: folk.map(x => ({...x, on: false}))});
  assert.deepEqual(SR.infoFor({record: r, review: off}, f.household).folk, []);
  assert.deepEqual(SR.hiddenFlag(f), {key: f.key, line: f.line, label: f.label, note: f.note, settlement: r.id});
});

test("settlement: ties are written once both heads exist, once only, and workplaces are found", () => {
  const r = rec(1995), rv = SR.normReview(r, {});
  const pairs = SR.tiesKept(r, rv).filter(t => t.kind !== "works-at");
  assert.ok(pairs.length >= 5);
  const t0 = pairs[0];
  // only one head seeded: nothing to write
  assert.deepEqual(SR.tieWrites(r, rv, {[t0.a]: "aaaaaaaaaaaaaaaa"}), []);
  const heads = Object.fromEntries(r.households.map((h, i) => [h.id, `actor${String(i).padStart(11, "0")}`]));
  const writes = SR.tieWrites(r, rv, heads);
  assert.equal(writes.length, new Set(pairs.map(t => `${t.a}|${t.b}|${SR.tieRole(t).role}`)).size);
  assert.ok(writes.every(w => /^Actor\./.test(w.tie.uuid) && w.tie.hidden === false && ["sibling", "child", "friend", "rival", "other"].includes(w.tie.role)));
  // a second pass, with the first written, writes nothing
  const have = id => writes.filter(w => w.actor === id).map(w => w.tie);
  assert.deepEqual(SR.tieWrites(r, rv, heads, have), []);
  assert.deepEqual(SR.tieRole({kind: "owes", note: "rent in arrears"}), {role: "other", note: "In debt to them: rent in arrears"});
  const wp = SR.workplaces(r, rv);
  const buildings = new Set(JSON.parse(sidecar(1995)).regions.map(x => x.id));
  assert.ok(Object.keys(wp).length >= 5);
  assert.ok(Object.values(wp).every(b => buildings.has(b)), "every workplace is a building on the map");
  assert.deepEqual(SR.workplaces(r, SR.normReview(r, {ties: {"works-at": false}})), {});
});

test("settlement: a block of flats keeps a record for each flat seeded, and one flat's seeding leaves the others unseeded", () => {
  let rec0 = RS.residentRecord(null, "t-1.panel-block-1-household-1", ["a1", "a2"], {at: 5});
  rec0 = RS.residentRecord(rec0, "t-1.panel-block-1-household-2", ["b1"], {at: 6});
  assert.deepEqual(rec0.actors, ["a1", "a2", "b1"]);
  assert.deepEqual(rec0.houses, [{id: "t-1.panel-block-1-household-1", actors: ["a1", "a2"]}, {id: "t-1.panel-block-1-household-2", actors: ["b1"]}]);
  const hh = n => ({id: `t-1.panel-block-1-household-${n}`, label: "Panel block household", trade: "clerk", people: [{role: "clerk"}]});
  const region = {uuid: "Scene.s.Region.r", name: "Panel block", flags: {"wodx-interactables": {household: hh(3), households: [hh(1), hh(2), hh(3)]}, "wodx-npc": {place: {kind: "home"}, residents: rec0}}};
  const list = RS.householdsOn([region]);
  assert.deepEqual(list.map(h => h.seeded.length), [2, 1, 0]);
  assert.ok(list.every(h => h.shared === 3));
  assert.equal(RS.countPeople(list), 1);
  // the hidden mark of a haunted building stays when another flat is seeded
  assert.deepEqual(RS.residentRecord({...rec0, hidden: {key: "wraith"}}, "x", ["c"]).hidden, {key: "wraith"});
  // a building with one household reads an older record as before
  const old = {uuid: "Scene.s.Region.o", name: "Smithy", flags: {"wodx-interactables": {household: {id: "smithy-1-household", people: [{role: "smith"}]}}, "wodx-npc": {residents: {actors: ["z"]}}}};
  assert.deepEqual(RS.householdsOn([old])[0].seeded, ["z"]);
});

test("settlement: the journal says what the place is, in plain words, with nothing struck in it", () => {
  const r = rec(1995);
  const folk = SR.proposeFolk(r), gone = r.households.find(h => !folk.some(f => f.household === h.id) && h.people.length > 2);
  const pages = SR.journalPages(r, SR.normReview(r, {struck: [gone.id], folk}));
  assert.deepEqual(pages.map(p => p.name), ["The place", "Households", "Ties", "Hidden folk"]);
  assert.match(pages[0].html, new RegExp(`<strong>Steinfeld</strong> is a village of \\d+ people in ${r.households.length - 1} households, as it stands in 1995\\.`));   // the struck one left out
  assert.match(pages[0].html, /Mayor:/);
  assert.ok(!pages[1].html.includes(`>${gone.label.replace(/ household$/, "")}</strong> (${gone.wealth}): ${SR.peopleWords(gone)}<`) || r.households.filter(h => h.label === gone.label && SR.peopleWords(h) === SR.peopleWords(gone)).length > 1);
  for ( const f of folk ) assert.ok(pages[3].html.includes(f.label.replace(/'/g, "&#39;")), f.label);
  assert.match(SR.journalPages(r, SR.normReview(r, {}))[3].html, /Nobody but mortals/);
  for ( const p of pages ) { assert.ok(!/—/.test(p.html), "no em-dash"); assert.ok(!/\b(he|she|his|her|him)\b/i.test(p.html.replace(/<[^>]+>/g, " ")), `gendered word in ${p.name}`); }
  assert.equal(SR.peopleWords({people: ["smith", "partner", "child", "child", "apprentice"]}), "the smith, a partner, 2 children and an apprentice");
  assert.equal(SR.peopleWords({people: ["school caretaker", "staff", "staff"]}), "the school caretaker and 2 staff");
  assert.equal(SR.peopleWords({people: ["pensioner"]}), "the pensioner");
});

test("settlement: the map's sidecar names its settlement, and the adoption plan says where the record goes", async () => {
  const A = await import("../../modules/wodx-interactables/scripts/adopt-rules.mjs");
  const {readFileSync} = await import("node:fs");
  const text = readFileSync(new URL("../mapgen/samples/steinfeld-1995.wodx.json", import.meta.url), "utf8");
  const sc = A.parseSidecar(text).data;
  assert.deepEqual(sc.settlement, {id: "steinfeld-1995-7", name: "Steinfeld", year: 1995});
  const p = A.plan(sc, {walls: [], tiles: [], lights: [], regions: []}, {x0: 0, y0: 0, size: 100}, new Set());
  assert.ok(p.notes.some(n => /part of Steinfeld as it stands in 1995/.test(n) && /Settlements/.test(n)));
  const bad = A.parseSidecar(JSON.stringify({...JSON.parse(text), settlement: {id: "no good!", name: "x"}})).data;
  assert.equal(bad.settlement, null);
  const old = A.parseSidecar(readFileSync(new URL("../mapgen/samples/steinfeld-1197.wodx.json", import.meta.url), "utf8")).data;
  assert.equal(old.settlement.year, 1197);
});
