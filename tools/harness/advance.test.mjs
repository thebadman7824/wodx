/**
 * Era advancement (B83): each line's advancer in Pass the Years. The pure rules first, then a skip from the Dark Ages
 * to the Victorian age through planSkip and applyPlan.
 */
import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";
import {installActors} from "./actors-mock.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(join(root, "modules/wodx-creation/scripts/advance-rules.mjs"));
const D = await import(join(root, "modules/wodx-creation/data/advance.mjs"));

const DA = {id: "dark-ages", name: "Dark Ages", system: {mortal: "darkages"}};
const REN = {id: "renaissance", name: "Renaissance", system: {mortal: "darkages"}};
const VIC = {id: "victorian", name: "Victorian", system: {mortal: "victorian"}};
const MOD = {id: "modern", name: "Modern", system: {mortal: "modern"}};
const ALL = {thickBlood: true, decline: true, drift: true, xp: true, convert: true};
const DEFAULTS = {thickBlood: false, decline: true, drift: false, xp: true, convert: true};
const ctx = (fromYear, toYear, fromEra, toEra, switches = DEFAULTS, extra = {}) => ({fromYear, toYear, years: toYear - fromYear, fromEra, toEra, switches, ...extra});
const kinds = r => r.changes.map(c => c.kind);

test("mortal decline: a Physical dot at each age passed, the player's pick, highest first", () => {
  assert.deepEqual(R.declineAges(1150, 1200, 1235), [60, 70, 80]);
  assert.deepEqual(R.declineAges(1150, 1210, 1220), [70]);
  assert.deepEqual(R.declineAges(null, 1200, 1300), [], "no birth year, no guess");
  const r = R.propose({line: "mortal", born: 1150, attributes: {strength: 2, dexterity: 4, stamina: 1}}, ctx(1205, 1225, DA, DA));
  const d = r.changes.filter(c => c.kind === "adv.decline");
  assert.deepEqual(d.map(c => c.data.age), [60, 70]);
  assert.equal(d[0].checked, true, "the switch is on by default (B83)");
  assert.deepEqual(d[0].choices.map(o => o.value), ["dexterity", "strength"], "Stamina 1 can't drop");
  assert.equal(d[0].data.choice, "dexterity");
  const off = R.propose({line: "mortal", born: 1150, attributes: {strength: 2}}, ctx(1205, 1225, DA, DA, {...DEFAULTS, decline: false}));
  assert.ok(!kinds(off).includes("adv.decline"));
  const vamp = R.propose({line: "vampire", born: 1150, attributes: {strength: 3}}, ctx(1205, 1225, DA, DA));
  assert.ok(!kinds(vamp).includes("adv.decline"), "the dead do not grow old");
});

test("experience for the years: 1 a year awake, at most 10 a skip", () => {
  assert.equal(R.yearsXP(4), 4);
  assert.equal(R.yearsXP(40), 10);
  const r = R.propose({line: "garou"}, ctx(1200, 1204, DA, DA));
  assert.equal(r.changes.find(c => c.kind === "adv.xp").data.amount, 4);
  const slept = R.propose({line: "vampire"}, ctx(1200, 1300, DA, DA, DEFAULTS, {awakeYears: 0}));
  assert.ok(!kinds(slept).includes("adv.xp"), "a century in torpor teaches nothing");
  assert.ok(!kinds(R.propose({line: null}, ctx(1200, 1220, DA, DA))).includes("adv.xp"), "creatures keep no experience");
});

test("thick blood and morality drift are off by default; on, they count centuries awake", () => {
  const v = {line: "vampire", generation: 10, awakeBefore: 150, road: {key: "humanity", rating: 7, label: "Road of Humanity"}};
  assert.ok(!kinds(R.propose(v, ctx(1200, 1500, DA, DA))).some(k => k === "adv.thickBlood" || k === "adv.drift"), "the books: Generation falls only by diablerie");
  const r = R.propose(v, ctx(1200, 1500, DA, DA, ALL));
  const tb = r.changes.find(c => c.kind === "adv.thickBlood");
  assert.equal(tb.data.steps, 2, "awake 150 → 450: two more full centuries (200, 300, 400 crossed, held at the floor)");
  assert.equal(tb.data.to, 8, "never below 8th by time alone");
  assert.equal(R.thickBlood(9, 0, 1000).to, 8);
  assert.equal(R.thickBlood(8, 0, 1000), null, "already at the floor");
  assert.equal(r.changes.find(c => c.kind === "adv.drift").data.rolls, 3);
  assert.equal(R.centuriesCrossed(99, 101), 1);
  assert.equal(R.centuriesCrossed(101, 199), 0);
});

test("Backgrounds: proposals, unticked; the societal ones reset in a new era", () => {
  const v = {line: "vampire", backgrounds: [{id: "b1", name: "Herd", value: 3}, {id: "b2", name: "Status", value: 2}, {id: "b3", name: "Resources", value: 4}]};
  const same = R.propose(v, ctx(1200, 1225, DA, DA));
  const herd = same.changes.find(c => c.kind === "adv.bgDecay");
  assert.equal(herd.data.to, 1, "two decades untended");
  assert.equal(herd.checked, false);
  assert.ok(!same.changes.some(c => c.data.itemId === "b3"), "Resources keep their dots");
  const cross = R.propose(v, ctx(1200, 1840, DA, VIC));
  const status = cross.changes.find(c => c.kind === "adv.bgReset");
  assert.equal(status.data.itemId, "b2");
  assert.equal(status.checked, false);
});

test("leaving the Dark Ages: Abilities move by the table, the Road becomes a V20 Path", () => {
  const v = {line: "vampire", abilities: {firearms: 1, drive: 0},
    secondaries: [{id: "s1", name: "wod.abilities.archery", value: 3}, {id: "s2", name: "Hearth Wisdom", value: 2}, {id: "s3", name: "Ride", value: 0}],
    road: {key: "kings", rating: 6, label: "Road of Kings"}};
  const r = R.propose(v, ctx(1200, 1840, DA, VIC));
  const conv = r.changes.filter(c => c.kind === "adv.convert");
  assert.deepEqual(conv.map(c => c.data.choice), ["firearms", "survival"]);
  assert.equal(conv[0].data.dots, 3);
  assert.match(conv[0].choices[0].label, /Firearms \(1 → 4\)/);
  assert.deepEqual(conv[1].choices.map(o => o.value), ["survival", "occult"], "Hearth Wisdom: the player picks");
  const road = r.changes.find(c => c.kind === "adv.road");
  assert.equal(road.data.choice, "innervoice");
  assert.deepEqual(road.choices.map(o => o.value), ["innervoice", "accord"]);
  for ( const t of Object.values(D.ROAD_TO_PATH) ) for ( const k of [t.to, ...(t.or ?? [])] ) assert.ok(R.PATH_LABEL[k], `${k} is one of the system's Paths`);
  // The Renaissance still uses the Dark Ages Abilities; the Victorian sheet keeps Ride
  assert.ok(!kinds(R.propose(v, ctx(1200, 1500, DA, REN))).includes("adv.convert"));
  assert.ok(!R.conversions([{id: "r", name: "Ride", value: 2}], "victorian").length, "Ride stays on Victorian sheets");
  assert.equal(R.conversions([{id: "r", name: "Ride", value: 2}], "modern")[0].row.to, "drive");
  assert.ok(!kinds(R.propose(v, ctx(1200, 1840, DA, VIC, {...DEFAULTS, convert: false}))).includes("adv.convert"));
});

test("Dark Ages records: mages to M20, inquisitors to mortal hunters, fae across the Shattering", () => {
  const mage = R.propose({line: "mage", records: {daMage: {fellowship: "x"}}}, ctx(1200, 1840, DA, VIC));
  assert.ok(kinds(mage).includes("adv.daMage"));
  assert.ok(!kinds(R.propose({line: "mage", records: {daMage: {system: "m20"}}}, ctx(1200, 1840, DA, VIC))).includes("adv.daMage"));
  assert.ok(kinds(R.propose({line: "hunter", records: {inquisitor: {order: "x"}}}, ctx(1200, 1840, DA, VIC))).includes("adv.inquisitor"));
  const fae = R.propose({line: "changeling", records: {daFae: {origin: "x"}}}, ctx(1300, 1400, DA, REN)).changes.find(c => c.kind === "adv.daFae");
  assert.equal(fae.data.choice, "rebirth", "Rebirth by default (B83)");
  assert.deepEqual(fae.choices.map(o => o.value), ["rebirth", "return"]);
  assert.ok(!kinds(R.propose({line: "changeling", records: {daFae: {origin: "x"}}}, ctx(1200, 1300, DA, DA))).includes("adv.daFae"), "before the Shattering");
});

test("lines out of their era, lost tribes and line notes", () => {
  assert.deepEqual(R.lineFits("demon", 1998).ok, false);
  assert.deepEqual(R.lineFits("demon", 1999).ok, true);
  assert.equal(R.lineFits("orpheus", 2011).ok, false);
  const out = R.propose({line: "demon"}, ctx(1990, 1995, MOD, MOD)).changes.find(c => c.kind === "adv.outOfEra");
  assert.equal(out.checked, false, "refused unless the Storyteller keeps them");
  assert.ok(!kinds(R.propose({line: "demon", forcedSheet: true}, ctx(1990, 1995, MOD, MOD))).includes("adv.outOfEra"), "the sheet flag already keeps them");
  assert.equal(R.lostTribe("Croatan", 1500, 1600).tribe, "Croatan");
  assert.equal(R.lostTribe("Croatan", 1600, 1700), null, "already gone before the skip");
  assert.equal(R.lostTribe("Bunyip", 1800, 1950).goneBy, 1900);
  assert.equal(R.lostTribe("Get of Fenris", 1200, 2000), null);
  assert.equal(D.LOST_TRIBES.find(t => t.tribe === "White Howlers").goneBy, 100, "fell in the 1st century (W20 p. 39)");
  assert.ok(R.propose({line: "wraith"}, ctx(1200, 1840, DA, VIC)).notes.some(n => /Fetters/.test(n)));
  assert.ok(R.propose({line: "kuei-jin"}, ctx(1200, 1300, DA, DA)).notes.some(n => /Dharma/.test(n)));
  assert.equal(R.ordinal(8), "8th");
  assert.equal(R.ordinal(1), "1st");
  assert.equal(R.ordinal(13), "13th");
});

/* -------------------------------------------- */
/*  Through Pass the Years                       */
/* -------------------------------------------- */

const mock = installMock({dataRoot: root});
await installActors(root);
globalThis.canvas = {tokens: {controlled: []}};
const M = "wodx-creation";
await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await import(join(root, "modules/wodx-creation/scripts/main.mjs"));
game.modules.set(M, {});
const api = () => game.modules.get(M).api;
const {getEngine} = await import(join(root, "modules/wodx-chronicle/scripts/calendar.mjs"));
const at = (year, month = 1, day = 1) => getEngine().dateToTime({year, month, day, hour: 21, minute: 0});

test("ready (Pass the Years)", async () => {
  await Hooks.callAll("init");
  mock.setupTime();
  await Hooks.callAll("ready");
  await mock.settle();
  await game.time.set(at(1200));
  await mock.settle();
  assert.equal(game.settings.get("wodx-chronicle", "rule.yearsMortalDecline"), true);
  assert.equal(game.settings.get("wodx-chronicle", "rule.yearsThickBlood"), false);
});

test("a Dark Ages coterie into the Victorian age: proposals, picks, snapshot, era history", async () => {
  const kin = await Actor.create({name: "Wenzel", type: "Vampire", system: {generation: 10, advantages: {path: {permanent: 6, custom: "Road of Kings"}}}});
  await api().lineage.setChronology(kin, {embraced: at(1150)});
  const archery = kin.items.find(i => /archery/i.test(i.name));
  await archery.update({"system.value": 3});
  const smith = await Actor.create({name: "Ota", type: "Mortal", system: {attributes: {strength: {value: 4}, dexterity: {value: 2}, stamina: {value: 3}}}});
  await api().lineage.setChronology(smith, {bornYear: 1170});
  const plan = api().time.planSkip({from: game.time.worldTime, to: at(1840)});
  assert.equal(plan.toEra?.id, "victorian");
  const kr = plan.rows.find(r => r.name === "Wenzel");
  const conv = kr.changes.find(c => c.kind === "adv.convert");
  assert.ok(conv, JSON.stringify(kr.changes.map(c => c.kind)));
  assert.ok(!/\./.test(conv.id), "change ids carry no dots (form field names)");
  const road = kr.changes.find(c => c.kind === "adv.road");
  assert.equal(road.data.choice, "innervoice");
  const xp = kr.changes.find(c => c.kind === "adv.xp");
  assert.equal(xp.data.amount, 10);
  const or = plan.rows.find(r => r.name === "Ota");
  assert.ok(or.changes.some(c => c.kind === "death"), "640 years: dies of age");

  const r = await api().time.applyPlan(plan, {choices: {[kin.id]: {[road.id]: "accord"}}});
  assert.equal(kin.system.abilities.firearms.value, 3);
  assert.equal(archery.system.value, 0, "the old Ability stays, at 0");
  assert.equal(kin.system.advantages.path.label, "wod.advantages.path.accord", "the Storyteller's pick");
  assert.equal(kin.system.advantages.path.permanent, 6, "the rating carries");
  assert.ok(kin.items.some(i => i.type === "Experience" && i.system.amount === 10));
  const c = api().data.chronology(kin);
  assert.deepEqual(c.eras.map(e => e.era), ["dark-ages", "victorian"]);
  assert.equal(c.awakeYears, 690, "50 years before plus 640, none in torpor");
  const snap = game.actors.find(a => a.getFlag(M, "snapshotOf")?.id === kin.id);
  assert.ok(snap, "a copy from before the years");
  assert.equal(snap.system.abilities.firearms.value, 0, "the snapshot is a copy, not the changed sheet");
  assert.equal(snap.items.find(i => /archery/i.test(i.name)).system.value, 3, "the snapshot keeps the Dark Ages sheet");
  assert.equal(snap.folder?.name, "WoDX · Before the years");
  const page = r.journal.pages.getName("1200 to 1840").text.content;
  assert.match(page, /Path of Honorable Accord/);
  // The snapshot is never planned again
  const again = api().time.planSkip({from: game.time.worldTime, to: at(1850)});
  assert.ok(!again.rows.some(x => x.actorId === snap.id));
});

test("every switch on, every line, every change ticked: the results read right in WoDX Actions", async () => {
  for ( const id of ["yearsThickBlood", "yearsMoralityDrift"] ) await game.settings.set("wodx-chronicle", `rule.${id}`, true);
  await game.settings.set("wodx-chronicle", "activeEra", "dark-ages");
  await game.time.set(at(1300));
  await mock.settle();
  // A die that always fails, so morality drift costs a dot each roll
  globalThis.Roll = class { constructor(f) { this.n = Number(String(f).split("d")[0]); } async evaluate() { this.dice = [{results: Array.from({length: this.n}, () => ({result: 2}))}]; return this; } };
  const elder = await Actor.create({name: "Bohuslav", type: "Vampire", system: {generation: 11, advantages: {path: {permanent: 7, custom: "Road of Humanity"},
    virtues: {conscience: {permanent: 3}}}}});
  await api().lineage.setChronology(elder, {embraced: at(1250)});
  await elder.createEmbeddedDocuments("Item", [{name: "Herd", type: "Feature", system: {type: "wod.types.background", value: 3}},
    {name: "Status", type: "Feature", system: {type: "wod.types.background", value: 2}}]);
  const mage = await Actor.create({name: "Brother Vit", type: "Mage"});
  await mage.setFlag("wodx-actions", "daMage", {fellowship: "Order of Hermes", pillars: {}});
  const fae = await Actor.create({name: "Lada", type: "Changeling"});
  await fae.setFlag("wodx-actions", "daFae", {origin: "Sidhe", court: "Seelie"});
  const inq = await Actor.create({name: "Father Anselm", type: "Hunter"});
  await inq.setFlag("wodx-actions", "inquisitor", {order: "Oculi Dei", piety: 3});
  const wolf = await Actor.create({name: "Runs-at-Dusk", type: "Werewolf", system: {tribe: "custom", custom: {tribe: "Croatan"}}});
  const demon = await Actor.create({name: "Azrael", type: "Demon"});

  const plan = api().time.planSkip({from: game.time.worldTime, to: at(1840)});
  const row = name => plan.rows.find(r => r.name === name);
  const accept = {};
  for ( const r of plan.rows ) accept[r.actorId] = Object.fromEntries(r.changes.filter(c => c.kind !== "death" && c.kind !== "torpor").map(c => [c.id, true]));
  const ek = row("Bohuslav").changes.map(c => c.kind);
  for ( const k of ["adv.thickBlood", "adv.drift", "adv.xp", "adv.road", "adv.bgDecay", "adv.bgReset"] ) assert.ok(ek.includes(k), `${k} in ${ek}`);
  assert.ok(row("Brother Vit").changes.some(c => c.kind === "adv.daMage"));
  assert.ok(row("Lada").changes.some(c => c.kind === "adv.daFae"), "1300 to 1840 crosses the Shattering");
  assert.ok(row("Father Anselm").changes.some(c => c.kind === "adv.inquisitor"));
  assert.ok(row("Runs-at-Dusk").changes.some(c => c.kind === "adv.lostTribe"));
  assert.ok(row("Azrael").changes.some(c => c.kind === "adv.outOfEra"), "a demon in 1840");

  await api().time.applyPlan(plan, {accept});
  // Thick blood: 50 → 590 years awake crosses five centuries, held at 8th; three steps cost three dots, then drift
  assert.equal(api().data.generationOf(elder), 8);
  assert.equal(api().data.chronology(elder).awakeYears, 590);
  assert.equal(elder.system.advantages.path.label, "wod.advantages.path.humanity");
  assert.equal(elder.system.advantages.path.permanent, 0, "7, less 3 for the blood, less 5 failed drift rolls, floored at 0");
  assert.equal(elder.items.getName("Herd").system.value, 0, "54 years untended: a dot a decade, floored at 0");
  assert.equal(elder.items.getName("Status").system.value, 0, "reset in the Victorian age");
  assert.equal(elder.items.filter(i => i.type === "Experience" && i.system.amount === 10).length, 1, "the years' experience, once");
  // What WoDX Actions reads: the old records stay, archived; the live ones now say the later rules
  assert.equal(mage.getFlag("wodx-actions", "daMage").system, "m20");
  assert.equal(mage.getFlag("wodx-actions", "daMage · archived").fellowship, "Order of Hermes");
  assert.equal(fae.getFlag("wodx-actions", "daFae").system, "c20");
  assert.equal(fae.getFlag("wodx-actions", "daFae").crossing, "rebirth");
  assert.equal(fae.getFlag("wodx-actions", "daFae · archived").court, "Seelie");
  assert.equal(inq.getFlag("wodx-actions", "inquisitor"), undefined);
  assert.equal(inq.getFlag("wodx-actions", "inquisitor · archived").piety, 3);
  assert.equal(api().data.chronology(wolf).lostTribe, "Croatan");
  const MD = await import(join(root, "modules/wodx-actions/scripts/mage-da.js"));
  const FD = await import(join(root, "modules/wodx-actions/scripts/fae-da.js"));
  assert.equal(MD.isDA(mage), false, "WoDX Actions casts this mage by M20 now");
  assert.equal(FD.isDA(fae), false, "WoDX Actions treats this fae as a C20 changeling now");
  for ( const id of ["yearsThickBlood", "yearsMoralityDrift"] ) await game.settings.set("wodx-chronicle", `rule.${id}`, false);
});

test("WoDX Actions and Sheets off in the world: Pass the Years still plans and applies (the wodx-template gate)", async () => {
  // As Foundry does: getFlag, setFlag and unsetFlag refuse a scope whose module is not active
  const P = Actor.prototype;
  const orig = {getFlag: P.getFlag, setFlag: P.setFlag, unsetFlag: P.unsetFlag};
  const off = new Set(["wodx-actions", "wodx-sheets"]);
  const guard = name => function(s, ...rest) {
    if ( off.has(s) ) throw new Error(`Flag scope "${s}" is not valid or not currently active`);
    return orig[name].call(this, s, ...rest);
  };
  for ( const k of Object.keys(orig) ) P[k] = guard(k);
  try {
    await game.settings.set("wodx-chronicle", "activeEra", "dark-ages");
    await game.time.set(at(1300));
    await mock.settle();
    const kin = await Actor.create({name: "Jitka", type: "Vampire", system: {generation: 10, advantages: {path: {permanent: 5, custom: "Road of Kings"}}}});
    await api().lineage.setChronology(kin, {embraced: at(1280)});
    const mage = await Actor.create({name: "Brother Radek", type: "Mage", flags: {"wodx-actions": {daMage: {fellowship: "Order of Hermes"}}}});
    const inq = await Actor.create({name: "Father Bruno", type: "Hunter", flags: {"wodx-actions": {inquisitor: {piety: 2}}}});
    const demon = await Actor.create({name: "Sariel", type: "Demon"});
    const plan = api().time.planSkip({from: game.time.worldTime, to: at(1840), actors: [kin, mage, inq, demon]});
    const row = a => plan.rows.find(r => r.actorId === a.id);
    const road = row(kin).changes.find(c => c.kind === "adv.road");
    assert.ok(road, JSON.stringify(row(kin).changes.map(c => c.kind)));
    assert.ok(row(mage).changes.some(c => c.kind === "adv.daMage"), "the Dark Ages mage record is read without WoDX Actions");
    const accept = {};
    for ( const r of plan.rows ) accept[r.actorId] = Object.fromEntries(r.changes.filter(c => c.kind !== "death" && c.kind !== "torpor").map(c => [c.id, true]));
    await api().time.applyPlan(plan, {accept, choices: {[kin.id]: {[road.id]: "accord"}}});
    assert.equal(kin.system.advantages.path.label, "wod.advantages.path.accord");
    assert.equal(mage.flags["wodx-actions"].daMage.system, "m20");
    assert.equal(mage.flags["wodx-actions"]["daMage · archived"].fellowship, "Order of Hermes");
    assert.equal(inq.flags["wodx-actions"].inquisitor, undefined);
    assert.equal(inq.flags["wodx-actions"]["inquisitor · archived"].piety, 2);
  } finally {
    Object.assign(P, orig);
  }
});

test("no error notifications (advance)", () => {
  assert.deepEqual(mock.log.notifications.filter(([l]) => l === "error"), []);
});
