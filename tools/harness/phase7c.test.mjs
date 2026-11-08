import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* Phase 7c: routines, places and reactions (WoDX NPC 0.2.0), the pure rules */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(join(root, "modules/wodx-npc/scripts/routine-rules.mjs"));
const NR = await import(join(root, "modules/wodx-npc/scripts/npc-rules.mjs"));
const {DateEngine, sunTimes} = await import(join(root, "modules/wodx-chronicle/scripts/calendar-math.mjs"));

// Rothenstein's clock: 1197 epoch, Bohemia's reform, latitude 50
const engine = new DateEngine({epoch: [1197, 1, 1], reform: "bohemia-1584"});
const LAT = 50;
const describe = (time, extra = []) => {
  const d = engine.timeToDate(time);
  const sun = sunTimes(d.jdn, LAT);
  const h = d.hour + d.minute / 60;
  return {...d, isNight: h < sun.sunrise || h >= sun.sunset, feast: R.feastOn(d, extra), sun};
};
const at = (y, m, d, hour = 0, minute = 0) => engine.dateToTime({year: y, month: m, day: d, hour, minute});
const places = [
  {id: "home1", kind: "home"}, {id: "home2", kind: "home"}, {id: "church", kind: "church"}, {id: "tavern", kind: "tavern"},
  {id: "shop", kind: "workplace"}, {id: "gate", kind: "gate"}, {id: "square", kind: "market"}, {id: "lane", kind: "street"},
  {id: "haven", kind: "haven"}, {id: "keep", kind: "castle"}, {id: "wood", kind: "wilds"}
];
const where = (preset, time, roles = {}, more = {}) => R.placeAt(R.PRESETS[preset].blocks, time, describe, {places, roles, seed: "npc1", ...more});

test("feast days: Easter by the Julian and Gregorian reckonings; fixed and movable feasts; the Storyteller's own", () => {
  // Easter 1197 fell on 6 April (Julian); Easter 2025 on 20 April (Gregorian)
  assert.equal(R.easterJDN(1197, "julian"), engine.toJDN(1197, 4, 6));
  assert.equal(R.easterJDN(2025, "gregorian"), engine.toJDN(2025, 4, 20));
  assert.equal(describe(at(1197, 12, 25, 10)).feast, "Christmas");
  assert.equal(describe(at(1197, 4, 6, 10)).feast, "Easter");
  assert.equal(describe(at(1197, 4, 4, 10)).feast, "Good Friday");
  assert.equal(describe(at(1197, 5, 25, 10)).feast, "Pentecost");
  assert.equal(describe(at(1197, 4, 9, 10)).feast, null);
  // Corpus Christi only from 1264
  const cc = jdn => engine.fromJDN(jdn);
  assert.equal(R.feastOn({...cc(R.easterJDN(1300) + 60), jdn: R.easterJDN(1300) + 60}), "Corpus Christi");
  assert.equal(R.feastOn({...cc(R.easterJDN(1200) + 60), jdn: R.easterJDN(1200) + 60}), null);
  const extra = R.parseFeasts("09-01 St Giles\nnonsense\n13-01 Bad month");
  assert.deepEqual(extra, [[9, 1, "St Giles"]]);
  assert.equal(describe(at(1197, 9, 1, 10), extra).feast, "St Giles");
});

test("blocks: the hour, weekdays, midnight wrap, feast days, day and night by the sun", () => {
  // 14 April 1197 was a Monday (the 7th was Easter Monday)
  const mon = at(1197, 4, 14, 10);
  assert.equal(describe(mon).dayOfWeek, 0);
  assert.equal(where("merchant", mon).place, "shop");
  assert.equal(where("merchant", at(1197, 4, 14, 22)).place.startsWith("home"), true);
  // Sunday morning: Mass, not the shop
  assert.equal(where("merchant", at(1197, 4, 13, 9)).place, "church");
  // A feast day on a weekday: no trading (the Annunciation, 25 March 1197, a Tuesday)
  assert.equal(describe(at(1197, 3, 25, 11)).feast, "The Annunciation");
  assert.equal(where("merchant", at(1197, 3, 25, 11)).place.startsWith("home"), true);
  assert.equal(where("merchant", at(1197, 3, 25, 9)).place, "church");
  // Midnight wrap: the guard's 18-24 rounds give way to the post at 00:00
  assert.equal(where("night-watch", at(1197, 4, 7, 23)).place, "lane");
  assert.equal(where("night-watch", at(1197, 4, 8, 1)).place, "gate");
  // A wrapped block belongs to the day it started: Friday's 21-02 rounds keep running at 01:00 Saturday
  const wrapped = [R.PRESETS.merchant.blocks[0], {from: 21, to: 2, place: "tavern", activity: "drink", when: "any", days: [4], feast: "any"},
    {from: 0, to: 24, place: "home", activity: "rest", when: "any", days: null, feast: "any"}];
  const fri = at(1197, 4, 18, 23), satEarly = at(1197, 4, 19, 1), sunEarly = at(1197, 4, 20, 1);
  assert.equal(describe(fri).dayOfWeek, 4);
  assert.equal(R.placeAt(wrapped, satEarly, describe, {places}).place, "tavern");
  assert.equal(R.placeAt(wrapped, sunEarly, describe, {places}).place.startsWith("home"), true);
  // Dusk and dawn: a Cainite sleeps by day and hunts after dusk, whatever the hour on a winter's evening
  const winterDusk = describe(at(1197, 12, 21, 12)).sun.sunset; // about 16:00 at latitude 50
  assert.ok(winterDusk > 15.5 && winterDusk < 16.5, `dusk ${winterDusk}`);
  assert.equal(where("neonate", at(1197, 12, 21, 15)).place, "haven");
  assert.equal(where("neonate", at(1197, 12, 21, 15)).block.activity, "sleep");
  assert.equal(where("neonate", at(1197, 12, 21, 17)).block.activity, "rest");
  assert.equal(where("neonate", at(1197, 12, 21, 21)).place, "lane");
  // Summer: still light at 19:30 (sunset about 20:10, local solar time), so the Cainite still sleeps
  assert.equal(where("neonate", at(1197, 6, 21, 19, 30)).block.activity, "sleep");
  // The priest is in the church from dusk to the late bell, both in winter and in summer
  assert.equal(where("priest", at(1197, 12, 16, 17)).place, "church");
  assert.equal(where("priest", at(1197, 6, 16, 17)).place.startsWith("home"), true);
  assert.equal(where("priest", at(1197, 6, 16, 20, 30)).place, "church");
  assert.equal(where("priest", at(1197, 6, 16, 19, 30)).place.startsWith("home"), true);
  assert.equal(where("priest", at(1197, 6, 16, 21, 30)).place.startsWith("home"), true);
  assert.equal(where("priest", at(1197, 6, 16, 2, 30)).place, "church");
});

test("places: roles set by the Storyteller win; else a fitting kind, the same each time; deleted places are reported", () => {
  const b = {place: "home"};
  assert.equal(R.resolvePlace(b, {places, roles: {home: "home2"}}).place, "home2");
  const a1 = R.resolvePlace(b, {places, seed: "x"}).place, a2 = R.resolvePlace(b, {places, seed: "x"}).place;
  assert.equal(a1, a2);
  assert.ok(["home1", "home2"].includes(a1));
  const gone = R.resolvePlace(b, {places, roles: {home: "deleted"}, seed: "x"});
  assert.equal(gone.missing, "home");
  assert.ok(gone.place);
  assert.equal(R.resolvePlace({place: "church"}, {places}).place, "church");
  assert.equal(R.resolvePlace({place: "shop"}, {places}).place, "shop");
  assert.equal(R.resolvePlace({place: "wasHere"}, {places}).missing, "wasHere");
  // A ghoul attends the domitor wherever the domitor is, else waits at the haven
  assert.equal(R.resolvePlace({place: "domitor"}, {places, domitorPlace: "keep"}).place, "keep");
  assert.equal(R.resolvePlace({place: "domitor"}, {places}).place, "haven");
  assert.equal(R.resolvePlace({place: "work"}, {places: [{id: "m", kind: "market"}]}).place, "m");
  assert.deepEqual(R.resolvePlace({place: "work"}, {places: []}), {place: null, missing: null});
});

test("first guesses from Rothenstein's scene names, and their owners", () => {
  const g = R.guessPlace;
  assert.deepEqual(g("Trespass · Captain Ondrej's Barracks"), {kind: "gate", owner: "Captain Ondrej"});
  assert.deepEqual(g("Trespass · Father Ludovic's Presbytery"), {kind: "home", owner: "Father Ludovic"});
  assert.equal(g("Trespass · Kasimir's Lair in the Adit").kind, "haven");
  assert.equal(g("Trespass · Etienne's Room at the Inn").kind, "home");
  assert.equal(g("Trespass · Sister Marta's Cell and the Keep Chapel").kind, "church");
  assert.equal(g("Locus · Church of St. Aegidius").kind, "church");
  assert.equal(g("Locus · The Tavern").kind, "tavern");
  assert.equal(g("Workplace · The Inn Upstairs and Cellar").kind, "tavern");
  assert.equal(g("Workplace · The Watch-house and Cells").kind, "gate");
  assert.equal(g("Workplace · The Bakery").kind, "workplace");
  assert.equal(g("Workplace · The Butcher's Shop").kind, "workplace");
  assert.equal(g("Lower Town · Market Square").kind, "market");
  assert.equal(g("Lower Town · Craftsmen's Lane").kind, "street");
  assert.equal(g("Kranzfels · Inner Ward and Great Hall").kind, "castle");
  assert.equal(g("The High Woods").kind, "wilds");
  assert.equal(g("⚔ BATTLEMAP · Locus · The Tavern").kind, "tavern");
  assert.equal(g("Encounter 07 · Smoke in the Lower Town").kind, "");
  assert.equal(g("Sessio I · The First Night").kind, "");
  assert.ok(R.ownerMatches("Captain Ondrej", 'Captain Ondrej "Ironjaw"'));
  assert.ok(R.ownerMatches("Father Ludovic", "Father Ludovic"));
  assert.ok(R.ownerMatches("Ivo", "Ivo the Ferryman"));
  assert.ok(!R.ownerMatches("Father Ludovic", "Brother Paval"));
  assert.ok(!R.ownerMatches("Father", "Father Ludovic"));
});

test("every preset is well formed; every template with hours has one; a typed routine is checked", () => {
  for ( const [k, p] of Object.entries(R.PRESETS) ) assert.deepEqual(R.checkBlocks(p.blocks), [], k);
  for ( const [t, p] of Object.entries(R.DEFAULT_PRESET) ) { assert.ok(NR.TEMPLATES[t], t); assert.ok(R.PRESETS[p], p); }
  assert.equal(R.blocksOf(null, "guard"), R.PRESETS["night-watch"].blocks);
  assert.equal(R.blocksOf({preset: "priest"}, "guard"), R.PRESETS.priest.blocks);
  assert.deepEqual(R.blocksOf(null, "spirit"), []);
  const mine = [{from: 3, to: 4, place: "home", activity: "sleep"}];
  assert.equal(R.blocksOf({blocks: mine, preset: "priest"}), mine);
  assert.equal(R.checkBlocks([{from: 25, to: 3, place: "", activity: "nap"}]).length, 3);
  // Every hour of a week finds a block for every preset (no NPC is ever nowhere)
  for ( const [k, p] of Object.entries(R.PRESETS) ) for ( let h = 0; h < 24 * 7; h++ ) {
    assert.ok(R.blockAt(p.blocks, at(1197, 6, 2) + h * 3600, describe), `${k} at hour ${h}`);
    assert.ok(R.blockAt(p.blocks, at(1197, 12, 1) + h * 3600, describe), `${k} at hour ${h} in winter`);
  }
});

test("a day of changes from 06:00 to 23:00, and a week's skip lands where the routine says", () => {
  const blocks = R.PRESETS["night-watch"].blocks;
  const ch = R.changesBetween(blocks, at(1197, 4, 7, 6), at(1197, 4, 7, 23), describe);
  assert.deepEqual(ch.map(c => [describe(c.time).hour, c.block.activity]), [[14, "rest"], [18, "patrol"]]);
  const priestDay = R.changesBetween(R.PRESETS.priest.blocks, at(1197, 4, 14, 6), at(1197, 4, 14, 23), describe);
  assert.ok(priestDay.length >= 5, `priest changes ${priestDay.length}`);
  // One week on: the guard is on rounds at 23:00 again, at the same place
  const start = at(1197, 4, 7, 23), end = start + 7 * 86400;
  assert.equal(R.placeAt(blocks, end, describe, {places, seed: "g"}).place, R.placeAt(blocks, start, describe, {places, seed: "g"}).place);
  const wk = R.changesBetween(blocks, start, end, describe);
  assert.equal(wk.length, 7 * 4);
});

test("the curfew runs from 21:00 to dawn", () => {
  assert.equal(R.isCurfew({hour: 20, minute: 59, isNight: true}), false);
  assert.equal(R.isCurfew({hour: 21, isNight: true}), true);
  assert.equal(R.isCurfew({hour: 3, isNight: true}), true);
  assert.equal(R.isCurfew({hour: 7, isNight: false}), false);
  assert.equal(R.isCurfew({hour: 22, isNight: false}, 23), false);
});

test("noticing: plain sight, sneaking against Alertness, Auspex against Obfuscate by the era's book", () => {
  const seq = vals => { let k = 0; return () => vals[k++ % vals.length]; };
  const awake = {perception: 3, alertness: 2, awareness: 1, auspex: 0, awake: true, inSight: true};
  assert.equal(R.notice({...awake, awake: false}, {}).noticed, false);
  assert.equal(R.notice({...awake, inSight: false}, {}).noticed, false);
  assert.equal(R.notice(awake, {sneaking: false}).noticed, true);
  // Sneaking: 9s for the watcher, 1s for the sneak
  const sn = R.notice(awake, {sneaking: true, dexterity: 3, stealth: 3}, {rng: seq([0.85, 0.85, 0.85, 0.85, 0.85, 0, 0, 0, 0, 0, 0])});
  assert.equal(sn.noticed, true);
  assert.match(sn.why, /Dark Ages p\. 169/);
  // Obfuscate: a mortal with no Auspex never sees; Dark Ages: equal Auspex rolls at 8; V20: equal is a resisted roll at 7
  assert.equal(R.notice(awake, {obfuscate: 2}).noticed, false);
  assert.equal(R.pierce(2, 2, "v20da").result, "roll");
  assert.equal(R.pierce(2, 2, "v20da").diff, 8);
  assert.equal(R.pierce(4, 2, "v20da").diff, 6);
  assert.equal(R.pierce(1, 2, "v20da").result, "blind");
  assert.equal(R.pierce(2, 2, "v20").result, "contest");
  assert.equal(R.pierce(2, 2, "v20").diff, 7);
  assert.equal(R.pierce(4, 2, "v20").diff, 5);
  assert.equal(R.pierce(1, 3, "v20").result, "blind");
  const kindred = {...awake, auspex: 3};
  const hit = R.notice(kindred, {obfuscate: 2}, {rng: () => 0.95});
  assert.equal(hit.noticed, true);
  assert.match(hit.why, /Dark Ages p\. 195/);
  assert.equal(R.notice(kindred, {obfuscate: 2}, {rng: () => 0.3}).noticed, false);
});

test("reactions: the conditions; a guard challenges after curfew; a bystander raises the alarm or runs; a fight waits", () => {
  assert.deepEqual(R.conditionsMet([], {}), {met: true, which: []});
  assert.equal(R.conditionsMet(["curfew", "trespass"], {curfew: true}).met, true);
  assert.equal(R.conditionsMet(["curfew", "trespass"], {curfew: true}, "all").met, false);
  assert.equal(R.conditionsMet(["night"], {night: false}).met, false);
  const guard = NR.profileOf({template: "guard"});
  const g = R.pickReaction(guard, {curfew: true, night: true});
  assert.equal(g[0].action, "challenge");
  assert.match(g[0].why, /curfew/);
  const civ = NR.profileOf({template: "civilian"});
  const c = R.pickReaction(civ, {supernatural: true, alliesNear: 2});
  assert.ok(["flee", "alarm"].includes(c[0].action), c[0].action);
  assert.ok(!c.slice(0, 2).some(o => o.action === "challenge"));
  const hunter = NR.profileOf({template: "hunter"});
  assert.equal(R.pickReaction(hunter, {supernatural: true})[0].action, "fight");
  assert.equal(R.autoReaction(R.pickReaction(hunter, {supernatural: true})).act, null);
  assert.equal(R.autoReaction(g).act.action, "challenge");
  assert.equal(R.pickReaction(civ, {})[0].action, "ignore");
});
