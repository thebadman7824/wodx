import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The faith calendar and the hunt (WoDX NPC 0.54.0, Actions 3.58.0, B2710, B2711): each feast, fast, curfew and
   blackout changes the hunting difficulty by name */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HC = await import(join(root, "modules/wodx-npc/scripts/hunt-calendar-rules.mjs"));
const C = await import(join(root, "modules/wodx-chronicle/scripts/church-rules.mjs"));
const FR = await import(join(root, "modules/wodx-chronicle/scripts/faith-rules.mjs"));
const F = await import(join(root, "modules/wodx-npc/scripts/faction-rules.mjs"));
const AR = await import(join(root, "modules/wodx-actions/scripts/rules.js"));
const {DateEngine} = await import(join(root, "modules/wodx-chronicle/scripts/calendar-math.mjs"));

const engine = new DateEngine({epoch: [1197, 1, 1], reform: "bohemia-1584"});
const date = (y, m, d, hour = 22) => engine.timeToDate(engine.dateToTime({year: y, month: m, day: d, hour, minute: 0}));
const western = (dt, opts) => ({faith: "western", ...C.churchDay(dt, opts)});
const findDay = (y, test) => {
  for ( let m = 1; m <= 12; m++ ) for ( let d = 1; d <= 31; d++ ) {
    let dt; try { dt = date(y, m, d); } catch (e) { continue; }
    if ( dt.month !== m ) continue;
    if ( test(dt) ) return dt;
  }
  return null;
};
const whys = cal => cal.changes.map(c => c.why).join(" | ");

test("Good Friday kept strictly is the hardest night of the year to hunt, and says so", () => {
  const gf = findDay(1230, dt => C.feastOn(dt) === "Good Friday");
  const cal = HC.huntCalendar({main: western(gf), hour: gf.hour, year: 1230, region: "moravia", dow: gf.dayOfWeek, crowd: 2});
  const step = cal.changes.find(c => c.key === "strictest");
  assert.equal(step.n, 2);
  assert.match(step.why, /^Good Friday: the strictest fast of the year$/);
  assert.equal(cal.n, 2);
  assert.match(cal.text, /^\+2 in all/);
});

test("by custom Good Friday is +1, and lightly kept it changes nothing", () => {
  const gf = findDay(1700, dt => C.feastOn(dt) === "Good Friday");
  assert.equal(HC.huntCalendar({main: western(gf), hour: 22, year: 1700, region: "moravia", crowd: 2}).changes.find(c => c.key === "strictest").n, 1);
  const late = findDay(1995, dt => C.feastOn(dt) === "Good Friday");
  assert.equal(HC.huntCalendar({main: western(late), hour: 22, year: 1995, region: "moravia"}).n, 0);
});

test("St John's Eve is a night of revel: -1, named, and only after dark", () => {
  const dt = date(1400, 6, 23);
  const night = HC.huntCalendar({main: western(dt), hour: 22, year: 1400, region: "moravia", crowd: 2});
  assert.match(whys(night), /St John's Eve: a night of revel/);
  assert.equal(night.changes.find(c => c.key === "revel").n, -1);
  // On a revel night the curfew rings at midnight, so 22:00 is not yet the curfew
  assert.ok(!night.changes.some(c => c.key === "curfew"));
  const day = HC.huntCalendar({main: western(date(1400, 6, 23, 10)), hour: 10, year: 1400, region: "moravia"});
  assert.ok(!day.changes.some(c => c.key === "revel"));
});

test("the chronicle's own fair makes the hunt easier", () => {
  const dt = date(1400, 9, 1);
  const cal = HC.huntCalendar({main: western(dt, {extra: [[9, 1, "St Giles' fair"]]}), hour: 20, year: 1400, region: "moravia", crowd: 2});
  const fair = cal.changes.find(c => c.key === "fair");
  assert.equal(fair.n, -1);
  assert.match(fair.why, /a fair, the town full of strangers/);
});

test("the curfew counts once: +1 where the night is not already empty, named either way", () => {
  const dt = date(1400, 7, 8);
  const a = HC.huntCalendar({main: western(dt), hour: 23, year: 1400, region: "moravia", crowd: 1});
  assert.equal(a.changes.find(c => c.key === "curfew").n, 1);
  const b = HC.huntCalendar({main: western(dt), hour: 23, year: 1400, region: "moravia", crowd: 2});
  assert.equal(b.changes.find(c => c.key === "curfew").n, 0);
  assert.match(b.changes.find(c => c.key === "curfew").why, /already counted/);
  // No curfew in a modern town, in a land settled late, or indoors
  assert.ok(!HC.huntCalendar({main: western(dt), hour: 23, year: 1900, region: "moravia"}).changes.some(c => c.key === "curfew"));
  assert.ok(!HC.huntCalendar({main: western(dt), hour: 23, year: 1700, region: "north-america-east"}).changes.some(c => c.key === "curfew"));
  assert.ok(!HC.huntCalendar({main: western(dt), hour: 23, year: 1400, region: "moravia", outdoors: false}).changes.some(c => c.key === "curfew"));
});

test("curfews by region and age: Edo Japan, the Korean curfew of 1945 to 1982", () => {
  assert.ok(HC.keepsCurfew("japan", 1700));
  assert.ok(!HC.keepsCurfew("japan", 1900));
  assert.ok(!HC.keepsCurfew("korea", 1920));
  assert.ok(HC.keepsCurfew("korea", 1970));
  assert.ok(!HC.keepsCurfew("korea", 1990));
});

test("wartime blackouts: London 1916 and 1940 after dark, not by day and not in 1950", () => {
  const dt = date(1940, 10, 9);
  const night = HC.huntCalendar({main: western(dt), hour: 23, year: 1940, region: "british-isles"});
  assert.equal(night.changes.find(c => c.key === "blackout").n, 1);
  assert.ok(HC.inBlackout("british-isles", 1916));
  assert.ok(!HC.inBlackout("british-isles", 1950));
  assert.ok(!HC.huntCalendar({main: western(dt), hour: 12, year: 1940, region: "british-isles"}).changes.some(c => c.key === "blackout"));
  assert.ok(HC.inBlackout("japan", 1944));
});

test("a night of Ramadan in Cairo puts people out late", () => {
  const dt = findDay(1500, d => FR.islamicDate(d.jdn).month === 9 && FR.islamicDate(d.jdn).day === 10);
  const c = {...FR.faithDay("islamic", dt, {region: "egypt"}), faith: "islamic"};
  const cal = HC.huntCalendar({main: c, hour: 21, year: 1500, region: "egypt", dow: dt.dayOfWeek, crowd: 2});
  assert.equal(cal.changes.find(c => c.key === "ramadan").n, -1);
  assert.match(whys(cal), /A night of Ramadan/);
});

test("Yom Kippur in a Jewish town, and a Jewish quarter in a Christian one", () => {
  const dt = findDay(1350, d => /Yom Kippur/.test(FR.faithDay("jewish", d, {}).feast ?? ""));
  const j = {...FR.faithDay("jewish", dt, {}), faith: "jewish"};
  const own = HC.huntCalendar({main: j, hour: 22, year: 1350, region: "levant", crowd: 2});
  const yk = own.changes.find(c => c.key === "strictest");
  assert.equal(yk.n, 2);
  assert.match(yk.why, /Yom Kippur: the Day of Atonement/);
  const quarter = HC.huntCalendar({main: western(dt), minor: [{faith: "jewish", label: "The Jewish year", c: j}], hour: 22, year: 1350, region: "moravia", crowd: 2});
  const q = quarter.changes.find(c => c.minor);
  assert.equal(q.n, 0);
  assert.match(q.why, /^The Jewish year, in its own quarter: .*\(\+2 there, the Storyteller's call\)$/);
});

test("Sunday shuts the market by day, not the slums", () => {
  const dt = findDay(1450, d => d.dayOfWeek === 6 && !C.feastOn(d) && C.seasonOn(d) === "Ordinary time");
  const m = HC.huntCalendar({main: western(dt), hour: 10, year: 1450, region: "moravia", dow: 6, area: "market"});
  assert.equal(m.changes.find(c => c.key === "rest").n, 1);
  assert.ok(!HC.huntCalendar({main: western(dt), hour: 10, year: 1450, region: "moravia", dow: 6, area: "slums"}).changes.some(c => c.key === "rest"));
});

test("the total is held to 2 either way", () => {
  const gf = findDay(1230, dt => C.feastOn(dt) === "Good Friday");
  const cal = HC.huntCalendar({main: western(gf), hour: 23, year: 1230, region: "moravia", crowd: 0});
  assert.ok(cal.changes.reduce((t, c) => t + c.n, 0) > 2);
  assert.equal(cal.n, 2);
  assert.match(cal.text, /held to 2 either way/);
});

test("faction hunts take the calendar in place of the single step, never in the wilds", () => {
  const s = F.normState({factions: [], places: []});
  const market = {id: "m", kind: "market"}, wood = {id: "w", kind: "wilds"};
  const base = F.huntingAt(s, market, {}, "roads").difficulty;
  const cal = {n: 2, changes: [{n: 2, why: "Good Friday: the strictest fast of the year"}]};
  const h = F.huntingAt(s, market, {}, "roads", {churchStep: -1, calendar: cal});
  assert.equal(h.difficulty, Math.min(10, base + 2));
  assert.equal(h.calendar.length, 1);
  assert.equal(F.huntingAt(s, wood, {}, "roads", {calendar: cal}).church, 0);
  assert.deepEqual(F.huntingAt(s, wood, {}, "roads", {calendar: cal}).calendar, []);
});

test("the hunt window's pool: the calendar moves the difficulty, an easier night stops at 3", () => {
  assert.equal(AR.huntingPool({area: "market", calendar: 1}).difficulty, 7);
  assert.equal(AR.huntingPool({area: "market", calendar: -1}).difficulty, 5);
  assert.equal(AR.huntingPool({area: "slums", fame: 1, calendar: -2}).difficulty, 3);
  assert.equal(AR.huntingPool({area: "market", calendar: 9}).difficulty, 8);
  assert.equal(AR.huntingPool({area: "market"}).difficulty, 6);
});
