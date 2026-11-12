import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const B = await import(join(root, "modules/wodx-storyteller/scripts/battle-rules.mjs"));
const BD = await import(join(root, "modules/wodx-storyteller/scripts/battle-deeds.mjs"));
const BA = await import(join(root, "modules/wodx-storyteller/scripts/battle-aftermath.mjs"));
const L = await import(join(root, "modules/wodx-chronicle/scripts/legends-rules.mjs"));
const DR = await import(join(root, "modules/wodx-otherworlds/scripts/drift-rules.mjs"));

const field = (over = {}) => B.normBattle({id: "b1", name: "The fight at the ford", place: "Brno ford", year: 1420,
  sides: [{name: "Crusaders", men: 2000, quality: 4}, {name: "Hussites", men: 1500, quality: 3, position: "works", defends: true}],
  chars: [{actorId: "a1", name: "Jana", side: 1, stance: "thick"}, {actorId: "a2", name: "Otto", side: 0, stance: "command"}, {actorId: "a3", name: "Vít", side: 1, stance: "rear"}], ...over});
const AGE_IDS = [...B.AGES.map(a => a.id), "umbra", "underworld"];
const KINDS = ["mortal", "kindred", "lupine", "mage", "fae", "wraith", "hunter", "spirit", "demon", "mummy", "kuei-jin", "ghoul"];

test("every post has a deed in every age of war and realm, for every kind of being", () => {
  for ( const age of AGE_IDS ) for ( const post of Object.keys(BD.POSTS) ) for ( const kind of KINDS ) {
    const d = BD.pickDeed({post, group: BD.groupOf(age), kind, seed: `${age}${post}${kind}`});
    assert.ok(d, `no deed for ${post} in ${age} for ${kind}`);
    assert.ok(d.post === "*" || d.post === post);
  }
});

test("deeds fit their age: no pike in 1240, no drones before 2000, no shield wall in 1916", () => {
  const ids = g => new Set(Object.keys(BD.POSTS).flatMap(p => BD.deedsFor({post: p, group: g}).map(d => d.id)));
  assert.ok(ids("medieval").has("shield-wall") && !ids("medieval").has("push-pike") && !ids("medieval").has("drone-down"));
  assert.ok(ids("early").has("push-pike") && !ids("early").has("drone-down"));
  assert.ok(ids("wars").has("trench-raid") && !ids("wars").has("shield-wall"));
  assert.ok(ids("modern").has("drone-down") && ids("future").has("drone-down"));
  assert.ok(ids("umbra").has("u-land") && !ids("umbra").has("hold-gap"));
  assert.ok(ids("underworld").has("w-hold-tempest") && !ids("underworld").has("k-dominate"));
});

test("each deed has a roll of known traits, a difficulty and what success buys", () => {
  for ( const d of BD.DEEDS ) {
    assert.ok(d.roll.length >= 2 && ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"].includes(d.roll[0]), d.id);
    assert.ok(d.diff >= 6 && d.diff <= 8, d.id);
    assert.ok(d.buys && d.text && d.name, d.id);
    assert.ok(!/—/.test(`${d.text}${d.buys}${d.name}`), `${d.id} has an em-dash`);
  }
  assert.equal(new Set(BD.DEEDS.map(d => d.id)).size, BD.DEEDS.length);
});

test("posts come from stance, and a siege puts defenders on the walls and attackers at the breach", () => {
  const b = field();
  assert.equal(BD.postFor(b.chars[0], b), "line");
  assert.equal(BD.postFor(b.chars[1], b), "command");
  assert.equal(BD.postFor(b.chars[2], b), "scout");
  const s = {...b, kind: "siege", breached: true};
  assert.equal(BD.postFor(b.chars[0], s), "walls");
  assert.equal(BD.postFor({...b.chars[0], side: 0}, s), "breach");
  assert.equal(BD.postFor({...b.chars[0], post: "scout"}, s), "scout");
});

test("offers are stable for a phase, swap to a new deed, skip, and roll into settlePhase's deeds", () => {
  const b = field();
  const o1 = BD.makeOffers(b, "hussite", b.chars), o2 = BD.makeOffers(b, "hussite", b.chars);
  assert.deepEqual(o1, o2);
  assert.equal(o1.phase, 1);
  assert.equal(o1.list.length, 3);
  const before = o1.list[0].deedId;
  const sw = BD.swapOffer(o1, "a1", "hussite");
  assert.notEqual(sw.list[0].deedId, before);
  assert.equal(sw.list[0].shown.length, 2);
  let o = BD.recordRoll(sw, "a1", {successes: 3, botch: false, faces: [8, 9, 7], pool: 3});
  o = BD.recordRoll(o, "a2", {successes: 2, botch: false, faces: [8, 9], pool: 2});
  o = BD.skipOffer(o, "a2");
  const deeds = BD.offerDeeds(o);
  assert.equal(deeds[1].length, 1);
  assert.equal(deeds[1][0].successes, 3);
  assert.equal(deeds[0].length, 0, "the skipped deed is left out");
  const joined = BD.joinDeeds([[{name: "by hand", successes: 1}], []], o);
  assert.equal(joined[0].length, 1);
  assert.equal(joined[1].length, 1);
  // a botched deed counts nothing
  assert.equal(BD.offerDeeds(BD.recordRoll(o, "a1", {successes: 0, botch: true}))[1][0].successes, 0);
  // the next phase starts fresh offers; the old ones for this phase are kept while it is the same phase
  const b2 = {...b, offers: o};
  assert.equal(BD.makeOffers(b2, "hussite", b.chars).list[0].rolled.successes, 3);
  const after = {...b2, phases: [{kind: "phase"}]};
  assert.equal(BD.makeOffers(after, "hussite", b.chars).phase, 2);
  assert.equal(BD.makeOffers(after, "hussite", b.chars).list[0].rolled, null);
});

test("a battle keeps its offers and aftermath, and settlePhase counts deed successes and keeps 'seen'", () => {
  const o = BD.recordRoll(BD.makeOffers(field(), "hussite"), "a1", {successes: 4, botch: false});
  const b = field({offers: o, aftermath: {sent: [{id: "spoils", to: "legend", legend: "About 300 fell."}]}});
  assert.equal(b.offers.list.length, 3);
  assert.equal(b.aftermath.sent.length, 1);
  assert.equal(B.normBattle({...b, offers: null}).offers, null);
  const age = B.ageFor(1420);
  const step = B.settlePhase(b, age, [{successes: 2}, {successes: 2}], BD.joinDeeds([[], []], {...o, list: o.list.map(x => ({...x}))}));
  assert.equal(step.phase.total[1], 6);
  const seenDeed = [[{name: "x", successes: 2, seen: true}], []];
  const st2 = B.settlePhase(b, age, [{successes: 0}, {successes: 0}], seenDeed);
  assert.equal(st2.phase.deeds[0][0].seen, true);
});

test("off-screen leader deeds need no sheet and roll with any random source", () => {
  const side = B.normSide({name: "The Prince's host", men: 500, supernatural: 3, commander: {pool: 6}});
  const l = BD.leaderDeed(side, "feudal", {kind: "kindred", seed: "w1"});
  assert.ok(l.deed && l.pool === 6 && l.difficulty === l.deed.diff);
  const mortal = BD.leaderDeed(B.normSide({supernatural: 0, commander: {pool: 3}}), "rifle", {kind: "kindred", seed: "w1"});
  assert.ok(!mortal.deed.kinds, "a side with no supernatural help gets a mortal deed");
  assert.equal(mortal.deed.post, "command");
  let i = 0; const seq = [0.95, 0.05, 0.75, 0.55];
  const r = BD.deedSuccessesFor(4, 7, () => seq[i++ % seq.length]);
  assert.deepEqual(r.faces, [10, 1, 8, 6]);
  assert.equal(r.successes, 1);
  assert.equal(BD.deedSuccessesFor(2, 6, () => 0).botch, true);
  assert.equal(BD.deedSuccessesFor(0, 6).successes, 0);
});

test("deedPool adds the attribute to the better ability", () => {
  const d = BD.deedById("hold-gap");
  assert.equal(BD.deedPool(d, k => ({stamina: 3})[k] ?? 0, k => ({melee: 1, brawl: 4})[k] ?? 0), 7);
  assert.equal(BD.deedPool(d, () => 0, () => 0), 1);
});

const over = (men = [1000, 800], extra = {}) => {
  const b = field(extra);
  return {...b, sides: b.sides.map((s, i) => ({...s, men: men[i]})), over: {winner: 0, how: "rout", at: 100, text: "won"}};
};

test("the aftermath of a big battle has a line for each line of the game, and none before it ends", () => {
  assert.deepEqual(BA.aftermathFor(field(), "medieval"), []);
  const b = over();
  assert.equal(BA.deadOf(b), 1700);
  const ids = BA.aftermathFor(b, "medieval").map(l => l.id);
  for ( const id of ["spoils", "feeding", "wraiths", "taint", "resonance", "nightmares", "kuei-jin", "memory"] ) assert.ok(ids.includes(id), id);
  const w = BA.aftermathFor(b, "medieval").find(l => l.id === "wraiths");
  assert.equal(w.to.drift.kind, "massdeath");
  assert.ok(DR.DRIFT_KINDS[w.to.drift.kind], "Otherworlds knows the drift kind");
  assert.ok(DR.DRIFT_KINDS[BA.aftermathFor(b, "medieval").find(l => l.id === "taint").to.drift.kind]);
  assert.match(w.text, /About 17 of the dead/);
  // a skirmish leaves little
  const small = BA.aftermathFor(over([1996, 1496]), "medieval").map(l => l.id);
  assert.deepEqual(small, ["spoils", "memory"]);
  // the Underworld has no feeding and no Shroud
  const uw = BA.aftermathFor(over([1000, 800], {realm: "underworld"}), "underworld");
  assert.ok(!uw.some(l => l.id === "feeding" || l.to.drift?.kind === "massdeath"));
});

test("seen deeds put the Masquerade at risk in the living world", () => {
  const b = over();
  b.phases = [{kind: "phase", deeds: [[{name: "Command", successes: 3, seen: true}], [{name: "Hold", successes: 2}]]}];
  assert.equal(BA.seenDeeds(b), 1);
  const f = BA.aftermathFor(b, "medieval").find(l => l.id === "feeding");
  assert.equal(f.to.veil, 1);
  assert.match(f.text, /Masquerade/);
  const e = BA.ledgerEntryFor(f, b, 1000);
  assert.equal(e.kind, "consequence");
  assert.equal(e.due, 1000 + 7 * 86400);
});

test("old fields are felt in later years, by era, and the Legends book adds what was sent", () => {
  const f = {name: "Lipany", place: "Lipany", year: 1434, dead: 13000};
  assert.equal(BA.fieldEcho(f, 1400), null);
  assert.match(BA.fieldEcho(f, 1434).text, /Fresh graves/);
  assert.match(BA.fieldEcho(f, 1600).text, /chapel/);
  assert.match(BA.fieldEcho(f, 1880).text, /tourists/);
  assert.match(BA.fieldEcho(f, 1999).text, /visitor centre/);
  assert.match(BA.fieldEcho(f, 2040, {branch: "future"}).text, /lens/);
  assert.equal(BA.fieldEcho(f, 1999).thinShroud, true);
  const b = {...over(), year: 1434};
  assert.equal(BA.oldFields([b], 1999).length, 1);
  assert.equal(BA.oldFields([b], 1434).length, 0);
  const sent = {...b, aftermath: {sent: [{id: "memory", to: "legend", legend: "Brno ford keeps the name of The fight at the ford."}]}};
  const line = L.battleLines([sent])[0];
  assert.match(line.text, /keeps the name/);
  assert.deepEqual(BA.legendExtras(sent), ["Brno ford keeps the name of The fight at the ford."]);
});

test("the Shroud drifts on its own track and stays inside 4 to 10", () => {
  let d = DR.addDrift({}, "massdeath");
  assert.equal(d.shroud, -1);
  assert.equal(d.value, 0);
  d = DR.addDrift(d, "massdeath");
  assert.equal(DR.shroudWithDrift(5, d.shroud), 4);
  assert.equal(DR.shroudWithDrift(null, d.shroud), null);
  d = DR.undoDrift(d);
  assert.equal(d.shroud, -1);
  assert.equal(DR.normDrift({shroud: -9}).shroud, -3);
});
