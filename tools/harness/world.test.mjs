import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/*
 * The world's regions (WoDX Chronicle 0.48.0, B2530 to B2534): every region is whole (a climate, a money and people
 * WoDX can name), a scene abroad takes its region's sun, and the people generator names people the way their own
 * people do.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const WR = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const PL = await import(join(root, "modules/wodx-chronicle/scripts/place-rules.mjs"));
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const W = await import(join(root, "modules/wodx-atmosphere/scripts/weather-rules.mjs"));
const M = await import(join(root, "modules/wodx-storyteller/scripts/money-rules.mjs"));
const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PW = await import(join(root, "modules/wodx-creation/data/people-world.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
const RR = await import(join(root, "modules/wodx-npc/scripts/resident-rules.mjs"));
const {gregorianToJDN} = await import(join(root, "modules/wodx-chronicle/scripts/calendar-math.mjs"));

const ids = Object.keys(WR.WORLD_REGIONS);
const tablesFor = ctx => id => G.resolveTable(PEOPLE_TABLES, id, ctx);
const GROUPS = ["ancient", "medieval", "early-modern", "industrial", "mid-century", "modern", "future"];

test("the world: every inhabited continent has regions, and each region is whole", () => {
  assert.ok(ids.length >= 35);
  for ( const id of ids ) {
    const r = WR.regionOf(id);
    assert.ok(["europe", "americas", "other"].includes(r.part), id);
    assert.ok(Math.abs(r.lat) <= 89 && Math.abs(r.lon) <= 180, id);
    assert.ok(W.CLIMATES[r.climate], `climate of ${id}`);
    assert.ok(M.MONIES[r.money] && M.COINS[r.money], `money of ${id}`);
    assert.ok(r.mix || r.culture, `people of ${id}`);
    assert.equal(W.climateForRegion(id), r.climate);
  }
  // Not Europe alone: at least five regions each for the Americas, Africa with the Middle East, and Asia with Oceania
  assert.ok(ids.filter(id => WR.WORLD_REGIONS[id].part === "americas").length >= 5);
  assert.ok(ids.filter(id => WR.WORLD_REGIONS[id].part === "other").length >= 18);
  assert.ok(ids.some(id => WR.WORLD_REGIONS[id].lat < 0), "south of the equator");
  assert.equal(WR.regionOf("atlantis"), null);
  assert.equal(WR.cultureOf("moravia"), "bohemia");
  assert.equal(WR.cultureOf("japan"), "japan");
});

test("the world: every climate makes a year of weather, and the south has its summer at the turn of the year", () => {
  for ( const c of Object.keys(W.CLIMATES) ) {
    const j0 = gregorianToJDN(1900, 1, 1);
    for ( let i = 0; i < 365; i += 3 ) { const d = W.weatherFor("world", c, j0 + i); assert.ok(d && Number.isFinite(d.tempDay) && Number.isFinite(d.tempNight), c); }
    for ( const k of ["t", "wet", "storm", "fog"] ) assert.equal(W.CLIMATES[c][k].length, 12, `${c} ${k}`);
  }
  const s = W.CLIMATES["australia-southeast"].t;
  assert.ok(s[0] > s[6]);
});

test("the world: every money region pays a wage in every age, in coins that fit", () => {
  for ( const r of Object.keys(M.MONIES) ) for ( const y of [-3000, -500, 300, 700, 1197, 1350, 1500, 1650, 1800, 1900, 1950, 1995, 2050] ) {
    const m = M.moneyFor(y, r);
    assert.ok(M.wageAt(y, r) > 0, `${r} ${y}`);
    const u = m.units.map(x => x[2]);
    assert.ok(u.every((v, i) => !i || v < u[i - 1]) && u.at(-1) === 1, `units ${r} ${m.id}`);
    assert.ok(M.formatMoney(M.allowance(3, y, r), m).length > 0);
    assert.ok(M.coinsFor(y, r).coin);
  }
  assert.equal(M.moneyFor(1250, "japanese").id, "mon");
  assert.equal(M.moneyFor(1400, "mexican").id, "cacao");
  assert.equal(M.moneyFor(800, "arab").id, "dinar");
  assert.equal(M.moneyFor(300, "arab").id, "roman");
  assert.equal(M.moneyFor(1500, "american").id, "barter");
  assert.equal(M.moneyFor(1900, "pacific").id, "usd");
});

test("the world: people can be made in every region and age WoDX has names for", () => {
  for ( const id of ids ) {
    const r = WR.regionOf(id), culture = WR.cultureOf(id);
    for ( const era of GROUPS ) {
      const tb = tablesFor({era, culture});
      const origin = tb("people.origin");
      if ( !origin ) { assert.ok(r.from, `${id} has no people in ${era} and does not say so`); continue; }
      for ( let i = 0; i < 12; i++ ) {
        const p = PR.person({rand: G.stream("world", `${id}:${era}:${i}`), tables: tb, era, culture});
        assert.ok(p.given && p.name && !/[{}]/.test(p.name), `${id} ${era}: ${JSON.stringify([p.origin, p.name])}`);
        assert.ok(p.trade, `${id} ${era} trade`);
      }
    }
  }
});

test("the world: names follow their people's own order and forms", () => {
  const one = (culture, era, origin, sex) => PR.nameOf({rand: G.stream("names", `${culture}${era}${origin}${sex}`), tables: tablesFor({era, culture}), origin, sex});
  const zh = one("china", "medieval", "chinese", "male");
  assert.ok(zh.name.startsWith(zh.family + " "), zh.name);
  assert.match(one("egypt", "medieval", "arabic", "female").name, / (bint |al-)/);
  assert.match(one("anatolia", "early-modern", "turkish", "male").family, /oğlu$/);
  assert.doesNotMatch(one("anatolia", "modern", "turkish", "male").family, /oğlu$/);
  assert.equal(one("mexico", "medieval", "nahua", "female").family, null);
  // The German lands draw Bohemia's medieval German names, and their own modern ones
  assert.ok(one("german-lands", "medieval", "german", "male").given);
  assert.ok(one("german-lands", "modern", "german", "female").family);
  // A region's own people outrank the lands it borrows from
  assert.ok(tablesFor({era: "medieval", culture: "british-isles"})("people.origin").results.some(x => x.text === "english"));
  assert.ok(tablesFor({era: "medieval", culture: "bohemia"})("people.origin").results.some(x => x.text === "czech"));
  // A woman of the household takes the feminine form
  assert.equal(RR.kinFamily({family: "Ivanov", origin: "russian"}, {sex: "female", origin: "russian", family: "Petrova"}), "Ivanova");
  assert.equal(RR.kinFamily({family: "ibn Yusuf", origin: "arabic", masterSex: "male", masterGiven: "Khalid"}, {sex: "female", origin: "arabic", family: "bint Ali"}), "bint Khalid");
  assert.equal(RR.kinFamily({family: "ben Moshe", origin: "jewish", masterSex: "male", masterGiven: "David"}, {sex: "male", origin: "jewish", family: "ben Asher"}), "ben David");
  assert.ok(PW.FAMILY_FIRST.has("japanese") && !PW.FAMILY_FIRST.has("english"));
});

test("the world: a mix stands until the next one, and regions without early names say from when", () => {
  assert.deepEqual(WR.mixFor("japan", "modern"), [["japanese", 100]]);
  assert.deepEqual(WR.mixFor("iberia", "industrial"), WR.mixFor("iberia", "early-modern"));
  assert.equal(WR.mixFor("australia", "medieval"), null);
  assert.equal(WR.mixFor("moravia", "medieval"), null);
  assert.equal(WR.hasPeopleIn("australia", 1500), false);
  assert.equal(WR.hasPeopleIn("australia", 1900), true);
  assert.equal(WR.hasPeopleIn("japan", 1197), true);
  for ( const id of ids ) for ( const g of WR.ERA_GROUPS ) for ( const [o, w] of WR.mixFor(id, g) ?? [] ) assert.ok(o && w > 0, `${id} ${g}`);
});

test("the world: a scene abroad takes its region's sun, and the hours between regions follow the longitude", () => {
  assert.deepEqual(PL.cleanPlace({region: "egypt"}), {latitude: null, offset: 0, region: "egypt"});
  assert.deepEqual(PL.cleanPlace({region: "nowhere", offset: 2}), {latitude: null, offset: 2});
  assert.equal(PL.hasOwnPlace({region: "japan"}), true);
  assert.equal(PL.placeTime({region: "egypt"}, 0, 50.1).latitude, 30);
  assert.equal(PL.placeTime({region: "egypt", latitude: 25.7}, 0, 50.1).latitude, 25.7);
  assert.equal(PL.placeTime({}, 0, 50.1).latitude, 50.1);
  assert.equal(WR.hoursAhead("egypt"), 1);
  assert.equal(WR.hoursAhead("japan"), 8);
  assert.equal(WR.hoursAhead("north-america-east"), -6);
  assert.equal(WR.hoursAhead("moravia", "japan"), -8);
  assert.equal(WR.regionHere({region: "india"}, "moravia").id, "india");
  assert.equal(WR.regionHere({}, "china").id, "china");
  assert.equal(WR.regionHere({}, "nowhere").id, "moravia");
});

test("money changers: a cut by age, none where the money is the same, and a price abroad named in local money", () => {
  // The share by age, more where the land is troubled, capped
  assert.equal(M.changerCut(1300), 0.06);
  assert.equal(M.changerCut(1650), 0.04);
  assert.equal(M.changerCut(1880), 0.02);
  assert.equal(M.changerCut(1995), 0.03);
  assert.equal(M.changerCut(1300, {troubled: true}), 0.11);
  assert.ok(M.changerCut(1300, {troubled: true}) <= M.CHANGER.most);
  // Same money on both sides: nobody needs a changer
  assert.equal(M.changerCut(1300, {from: "moravian", to: "moravian"}), 0);
  for ( const year of [1250, 1600, 1900, 2000, 2050] ) for ( const a of Object.keys(M.MONIES) ) for ( const b of Object.keys(M.MONIES) ) {
    const same = M.sameMoney(year, a, b), p = M.priceAbroad(1000, year, a, b);
    assert.equal(p.cut === 0, same, `${year} ${a} to ${b}`);
    assert.equal(p.total, 1000 + p.cut);
    assert.ok(p.local >= 1 && Number.isFinite(p.local) && p.localMoney?.id, `${year} ${a} to ${b} local`);
    assert.ok(p.cut <= 150);
  }
  // A price abroad buys the same there as at home: a month's wage at home is a month's wage there
  const y = 1880, home = "moravian", away = "japanese";
  assert.equal(M.exchange(M.wageAt(y, home), y, home, away), M.wageAt(y, away));
  // Changing money outright loses the cut once each way
  const out = M.changeMoney(10000, y, home, away), back = M.changeMoney(out.got, y, away, home);
  assert.equal(out.got, out.gross - out.cut);
  assert.ok(back.got < 10000 && back.got > 10000 * 0.94, String(back.got));
  // Nothing costs nothing
  assert.equal(M.priceAbroad(0, y, home, away).total, 0);
});

const F = await import(join(root, "modules/wodx-chronicle/scripts/faith-rules.mjs"));
const {jdnToGregorian} = await import(join(root, "modules/wodx-chronicle/scripts/calendar-math.mjs"));
const day = (y, m, d) => { const jdn = gregorianToJDN(y, m, d); return {year: y, month: m, day: d, calendar: "gregorian", jdn}; };
const iso = jdn => { const g = jdnToGregorian(jdn); return `${g.year}-${g.month}-${g.day}`; };

test("holy days: the reckoned years land on known dates", () => {
  assert.equal(iso(F.hebrewNewYear(5784)), "2023-9-16");
  assert.equal(iso(F.hebrewNewYear(5785)), "2024-10-3");
  assert.equal(iso(F.islamicToJDN(1445, 9, 1)), "2024-3-11");
  assert.deepEqual(F.islamicDate(F.islamicToJDN(1445, 9, 1)), {year: 1445, month: 9, day: 1});
  assert.equal(iso(F.chineseYear(2024).newYear), "2024-2-10");
  assert.equal(iso(F.chineseYear(2023).newYear), "2023-1-22");
  assert.equal(F.chineseYear(2023).months.filter(m => m.leap).map(m => m.month).join(), "2");
  assert.equal(F.chineseYear(2025).months.filter(m => m.leap).map(m => m.month).join(), "6");
  assert.equal(iso(F.losar(2024)), "2024-2-10");
  const is = (faith, y, m, d, re, opts) => assert.match(F.faithDay(faith, day(y, m, d), opts).day ?? "", re, `${faith} ${y}-${m}-${d}`);
  is("orthodox", 2024, 5, 5, /Pascha/); is("orthodox", 2024, 1, 7, /Nativity/);
  is("jewish", 2024, 4, 23, /Passover/); is("jewish", 2024, 10, 12, /Yom Kippur/); is("jewish", 2024, 3, 24, /Purim/);
  is("islamic", 2024, 4, 10, /Eid al-Fitr/);
  is("hindu", 2023, 11, 12, /Diwali/); is("hindu", 2024, 3, 25, /Holi/); is("hindu", 2024, 10, 12, /Dussehra/);
  is("theravada", 2024, 5, 22, /Vesak/); is("theravada", 2024, 4, 14, /new year/);
  is("tibetan", 2024, 5, 23, /Saga Dawa/);
  is("chinese", 2024, 9, 17, /Mid-Autumn/); is("chinese", 2024, 9, 17, /Chuseok/, {region: "korea"}); is("chinese", 2024, 8, 14, /Obon/, {region: "japan"});
  is("western", 2024, 3, 31, /Easter/);
});

test("holy days: every region keeps a year in every age, and every faith answers every day in the church year's shape", () => {
  for ( const id of Object.keys(WR.WORLD_REGIONS) ) {
    assert.ok(F.REGION_FAITH[id], `${id} has no faith row`);
    for ( const y of [1197, 1500, 1700, 1900, 2000, 2090] ) assert.ok(F.FAITHS[F.faithFor(id, y)], `${id} ${y}`);
  }
  assert.equal(F.faithFor("mexico", 1500), "own"); assert.equal(F.faithFor("mexico", 1600), "western");
  assert.equal(F.faithFor("nusantara", 1300), "hindu"); assert.equal(F.faithFor("nusantara", 1700), "islamic");
  assert.equal(F.faithFor("egypt", 1197), "islamic"); assert.equal(F.faithFor("russia", 1900), "orthodox");
  const keys = ["feast", "day", "fast", "season", "observance", "revel", "crowd", "curfewStart", "huntStep", "lines"];
  for ( const y of [1197, 1650, 1890, 2024] ) {
    const seen = {};
    for ( let j = gregorianToJDN(y, 1, 1); j < gregorianToJDN(y + 1, 1, 1); j++ ) {
      const g = jdnToGregorian(j);
      for ( const f of Object.keys(F.FAITHS) ) {
        const c = F.faithDay(f, {year: y, month: g.month, day: g.day, calendar: "gregorian", jdn: j});
        for ( const k of keys ) assert.ok(k in c, `${f} lacks ${k}`);
        assert.ok(c.season && Array.isArray(c.lines) && [-1, 0, 1].includes(c.huntStep));
        assert.equal(c.curfewStart, c.revel ? 24 : null);
        if ( c.feast ) seen[f] = (seen[f] ?? 0) + 1;
      }
    }
    for ( const f of Object.keys(F.FAITHS) ) if ( f !== "own" ) assert.ok(seen[f] >= 3, `${f} has too few feasts in ${y}: ${seen[f]}`);
  }
  // Ramadan: a fast by day, a busy night; a strict Orthodox fast is quiet
  const ram = F.faithDay("islamic", day(2024, 3, 20));
  assert.equal(ram.season, "Ramadan"); assert.equal(ram.huntStep, -1); assert.match(ram.fast, /Ramadan/);
  const lent = F.faithDay("orthodox", {...day(1500, 3, 20), calendar: "julian", jdn: gregorianToJDN(1500, 3, 20)});
  assert.equal(lent.crowd, "quiet"); assert.equal(lent.huntStep, 1);
  // A town of more than one people
  assert.ok(F.otherDays(day(2024, 4, 23), "western").some(o => o.faith === "jewish" && /Passover/.test(o.day)));
  // A scene keeps the faith picked for it
  assert.equal(PL.cleanPlace({faith: "jewish"}).faith, "jewish"); assert.equal(PL.cleanPlace({faith: "nonsense"}).faith, undefined);
  assert.ok(PL.hasOwnPlace({faith: "jewish"}));
});
