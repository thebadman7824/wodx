import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Towns that change over time (Storyteller, B3280-B3289) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const TR = await imp("modules/wodx-storyteller/scripts/town-rules.mjs");
const WR = await imp("modules/wodx-chronicle/scripts/world-rules.mjs");
const never = () => () => 0.99, always = () => () => 0;
const M = (id, over = {}) => ({id, name: id[0].toUpperCase() + id.slice(1), scenes: ["s"], traders: [], links: [], ...over});
const weeks = (n, st, ms, opt = {}) => { const ev = []; for ( let i = 0; i < n; i++ ) { const r = TR.weekTowns(st, ms, {year: 1600, month: 3, randFor: never, ...opt}); st = r.state; ev.push(...r.events); } return {st, ev}; };

test("a new town gets its people from the record or a guess, and every market gets a town", () => {
  assert.equal(TR.newTown(M("brno"), {people: 5000}).people, 5000);
  assert.equal(TR.newTown(M("brno", {scenes: ["a", "b"], traders: [{}, {}]})).people, 400 + 400 + 200);
  const r = TR.weekTowns(TR.blankState(), [M("brno"), M("olomouc")], {randFor: never});
  assert.deepEqual(Object.keys(r.state.towns).sort(), ["brno", "olomouc"]);
  // A market that is gone takes its town with it
  assert.deepEqual(Object.keys(TR.weekTowns(r.state, [M("brno")], {randFor: never}).state.towns), ["brno"]);
});

test("a quiet town stays near getting by and calm, and grows slowly by the age", () => {
  const {st, ev} = weeks(104, TR.blankState(), [M("brno")]);
  const t = st.towns.brno;
  assert.equal(ev.length, 0);
  assert.equal(Math.round(t.prosperity), 3);
  assert.equal(Math.round(t.unrest), 1);
  assert.ok(t.people >= 600 && t.people <= 605, `${t.people}`);
  assert.ok(TR.naturalGrowth(1800) > TR.naturalGrowth(1300));
  assert.equal(TR.naturalGrowth(2050), 0);
});

test("the market's troubles anger and impoverish a town; easing brings it back", () => {
  const ms = [M("brno")];
  const hard = weeks(40, TR.blankState(), ms, {ctxFor: () => ({foodSupply: "none", taxes: 0.3, foodIndex: 2.5})}).st;
  assert.ok(hard.towns.brno.unrest >= 3.5, `${hard.towns.brno.unrest}`);
  assert.ok(hard.towns.brno.prosperity < 3);
  const eased = weeks(60, hard, ms).st;
  assert.ok(eased.towns.brno.unrest < 2, `${eased.towns.brno.unrest}`);
  // Bread short alone makes grumbling, not riots
  const short = weeks(52, TR.blankState(), ms, {ctxFor: () => ({foodSupply: "short"})}).st;
  assert.ok(short.towns.brno.unrest < 3, `${short.towns.brno.unrest}`);
});

test("unrest boils over into riots, then a rising, with rests between riots", () => {
  const ms = [M("brno")];
  const r = weeks(30, TR.blankState(), ms, {randFor: always, ctxFor: () => ({foodSupply: "none", taxes: 0.3, foodIndex: 3})});
  const riots = r.ev.filter(e => e.kind === "riot");
  assert.ok(riots.length >= 1);
  assert.match(riots[0].text, /bread riot/);
  // never two riots within the rest
  const at = [];
  let st = TR.blankState();
  for ( let i = 0; i < 30; i++ ) { const x = TR.weekTowns(st, ms, {year: 1600, randFor: always, ctxFor: () => ({foodSupply: "none", taxes: 0.3, foodIndex: 3})}); st = x.state; if ( x.events.some(e => e.kind === "riot") ) at.push(i); }
  for ( let i = 1; i < at.length; i++ ) assert.ok(at[i] - at[i - 1] > TR.RIOT_REST, at.join(","));
  // A rising when unrest stands at its height long enough
  const t = TR.normTown({id: "brno", people: 1000, unrest: 5, prosperity: 2, high: TR.RISING_AFTER});
  const x = TR.weekTowns({towns: {brno: t}}, ms, {year: 1600, randFor: always, ctxFor: () => ({foodSupply: "none", taxes: 0.3})});
  const rising = x.events.find(e => e.kind === "rising");
  assert.ok(rising);
  assert.ok(x.state.towns.brno.unrest < 3);
  assert.match(TR.risingWords(1300), /revolt/);
  assert.match(TR.risingWords(1900), /barricades/);
});

test("plague strikes by year and by region of the world, once an outbreak", () => {
  const ms = [M("brno")];
  const eu = TR.weekTowns(TR.blankState(), ms, {year: 1348, randFor: always, regionOf: () => "moravia"});
  assert.equal(eu.events[0].kind, "plague");
  assert.ok(eu.state.towns.brno.struck);
  const far = TR.weekTowns(TR.blankState(), ms, {year: 1348, randFor: always, regionOf: () => "japan"});
  assert.ok(!far.events.some(e => e.kind === "plague"), "the Black Death does not reach Japan");
  assert.ok(TR.outbreaksIn(1520, "mexico").length, "smallpox in Mexico");
  assert.ok(TR.outbreaksIn(1918, "australia").length, "influenza everywhere");
  for ( const o of TR.TOWN_OUTBREAKS ) if ( o.reach !== "all" ) for ( const r of o.reach ) assert.ok(WR.WORLD_REGIONS[r], `${o.key}: ${r}`);
  // A Black Death runs its course: a third of the people or so, then it leaves and does not come back
  let st = TR.blankState(); const ev = [];
  for ( let i = 0; i < 60; i++ ) { const r = TR.weekTowns(st, ms, {year: 1348, randFor: i === 0 ? always : never, regionOf: () => "moravia"}); st = r.state; ev.push(...r.events); }
  const lost = 1 - st.towns.brno.people / 600;
  assert.ok(lost > 0.25 && lost < 0.45, `${lost}`);
  assert.ok(ev.some(e => e.kind === "plague-ends"));
  const again = TR.weekTowns(st, ms, {year: 1349, randFor: always, regionOf: () => "moravia"});
  assert.ok(!again.events.some(e => e.kind === "plague"));
});

test("disasters: fire by what a town is built of, floods on rivers, storms on coasts, quakes, failed harvests", () => {
  const t = TR.normTown({id: "a", people: 1000});
  assert.equal(TR.builtOf(t, 1400), "timber");
  assert.equal(TR.builtOf(t, 1800), "stone");
  assert.equal(TR.builtOf({build: "timber"}, 1900), "timber");
  assert.ok(TR.fireChance(t, {year: 1400, month: 7}) > TR.fireChance(t, {year: 1400, month: 1}));
  assert.ok(TR.fireChance(t, {year: 1400, month: 7}) > TR.fireChance(t, {year: 1900, month: 7}));
  // Seasons turn south of the equator
  assert.ok(TR.isDry(1, -33) && !TR.isDry(1, 50));
  const all = TR.rollDisasters(TR.normTown({id: "a", tags: {river: true, coast: true, quakes: true}}), {year: 1400, month: 8, rand: () => 0});
  assert.deepEqual(all.map(d => d.kind), ["fire", "storm", "quake", "famine"]);
  const spring = TR.rollDisasters(TR.normTown({id: "a", tags: {river: true}}), {year: 1400, month: 4, rand: () => 0});
  assert.ok(spring.some(d => d.kind === "flood"));
  assert.equal(TR.rollDisasters(t, {year: 1400, month: 4, rand: () => 0}).filter(d => d.kind === "flood").length, 0, "no river, no flood");
  assert.equal(TR.harvestChance(1990), 0);
  // A disaster leaves a scar and its harm
  const r = TR.weekTowns(TR.blankState(), [M("brno")], {year: 1400, month: 8, randFor: always});
  const fire = r.events.find(e => e.kind === "fire");
  assert.ok(fire);
  assert.ok(r.state.towns.brno.scars.some(s => s.kind === "fire" && s.year === 1400));
  assert.ok(r.state.towns.brno.people < 600);
  assert.ok(r.events.find(e => e.kind === "famine").effect.food, "a failed harvest makes bread short in the market");
  assert.ok(r.state.towns.brno.marks.some(m => m.kind === "famine"));
});

test("news and battles land at once on the towns they reach", () => {
  const st = TR.weekTowns(TR.blankState(), [M("brno"), M("olomouc")], {randFor: never}).state;
  const crash = TR.applyNow(st, [TR.newsEvent("crash")], {year: 1930});
  assert.equal(crash.events.length, 2);
  assert.ok(crash.state.towns.brno.prosperity < st.towns.brno.prosperity);
  const plague = TR.applyNow(st, [TR.newsEvent("plague", {name: "A new sickness"})], {year: 2001});
  assert.ok(plague.state.towns.olomouc.struck);
  assert.match(plague.events[0].text, /^A new sickness: plague/);
  assert.equal(TR.newsEvent("bogus"), null);
  const ms = [M("brno", {scenes: ["s1"]})];
  assert.equal(TR.townOfPlace("Brno", ms)?.id, "brno");
  assert.equal(TR.townOfPlace("the walls of Brno", ms)?.id, "brno");
  assert.equal(TR.townOfPlace("Market square", ms, () => "Market Square")?.id, "brno");
  assert.equal(TR.townOfPlace("Vienna", ms), null);
  const sack = TR.battleEvent({kind: "siege", over: {winner: 0}}, "brno");
  assert.equal(sack.kind, "sack");
  assert.equal(TR.battleEvent({kind: "siege", over: {winner: 1}}, "brno").kind, "siege-lifted");
  assert.equal(TR.battleEvent({kind: "field"}, "brno"), null, "not over yet");
  const sacked = TR.applyNow(st, [sack], {year: 1620});
  assert.ok(sacked.state.towns.brno.people < st.towns.brno.people * 0.9);
  assert.equal(sacked.state.towns.olomouc.people, st.towns.olomouc.people);
});

test("people leave an angry town for the linked town that does best", () => {
  const ms = [M("brno", {links: ["olomouc", "jihlava"]}), M("olomouc", {links: ["brno"]}), M("jihlava", {links: ["brno"]})];
  const st = {towns: {brno: {id: "brno", people: 10000, unrest: 4.8, prosperity: 1}, olomouc: {id: "olomouc", people: 1000, prosperity: 4.5}, jihlava: {id: "jihlava", people: 1000, prosperity: 3.5}}};
  const r = TR.weekTowns(st, ms, {randFor: never, ctxFor: m => (m.id === "brno" ? {foodSupply: "none"} : {})});
  assert.ok(r.moved.length && r.moved[0].to === "olomouc");
  assert.ok(r.state.towns.olomouc.people > 1000);
});

test("skipped weeks settle quietly, a year's line goes in the history, and Undo restores", () => {
  const st = TR.normState({towns: {brno: {id: "brno", people: 1000, unrest: 4, prosperity: 1}}});
  const s = TR.settleWeeks(st, 52, {year: 1800});
  assert.ok(s.towns.brno.unrest < 1.1 && s.towns.brno.prosperity > 1);
  let x = st;
  for ( const y of [1600, 1600, 1601] ) x = TR.weekTowns(x, [M("brno")], {year: y, randFor: never}).state;
  assert.deepEqual(x.towns.brno.history.map(h => h.year), [1600, 1601]);
  const snap = TR.snapshot(st, ["brno"]);
  assert.equal(TR.restore(x, snap).towns.brno.people, 1000);
  const v = TR.view(x.towns.brno);
  assert.ok(TR.PROSPERITY.includes(v.prosperityWord) && TR.UNREST.includes(v.unrestWord));
  assert.equal(TR.sizeWord(8000, 1300), "city");
  assert.equal(TR.sizeWord(8000, 1990), "town");
  // Cleaning caps and drops junk
  const n = TR.normTown({id: "a", people: -5, prosperity: 9, unrest: -2, tags: {river: 1, bogus: 1}, build: "glass", marks: [{kind: "bogus", weeks: 3}]});
  assert.deepEqual([n.people, n.prosperity, n.unrest, n.build, Object.keys(n.tags), n.marks.length], [0, 5, 0, "auto", ["river"], 0]);
});

test("the town wiring: settings, hooks, approval, windows", () => {
  const main = src("modules/wodx-storyteller/scripts/main.mjs");
  for ( const re of [/Towns\.registerTownSettings\(\)/, /Towns\.registerApproval\(\)/, /Towns\.setupTowns\(\)/, /towns: Towns\.api\(\)/] ) assert.match(main, re);
  const t = src("modules/wodx-storyteller/scripts/towns.mjs");
  for ( const h of ["updateWorldTime", "wodxSkipEnd", "wodxEventFired", "wodxBattle"] ) assert.match(t, new RegExp(`Hooks\\.on\\("${h}"`));
  assert.match(t, /Hooks\.callAll\("wodxTown"/);
  assert.match(t, /searchBox\(/);
  assert.match(src("modules/wodx-storyteller/scripts/markets.mjs"), /action: "towns"/);
  const shown = (t + src("modules/wodx-storyteller/scripts/town-rules.mjs")).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(shown, /B3\d\d\d|house rule/i);
});

test("talk and crowds follow the town (NPC, B3320, B3321)", async () => {
  const O = await imp("modules/wodx-npc/scripts/overheard-rules.mjs");
  const P = await imp("modules/wodx-npc/scripts/passerby-rules.mjs");
  const {OVERHEARD} = await imp("modules/wodx-npc/data/grammar/overheard.mjs");
  const t = TR.normTown({id: "brno", people: 1000});
  assert.equal(O.townTopic(TR.view(t), 1400), null, "an ordinary town gives nothing");
  assert.equal(O.townTopic(TR.view({...t, struck: {key: "x", name: "Plague", weeks: 3, share: 0.01}}), 1400), "plague");
  const burned = TR.view({...t, scars: [{kind: "fire", year: 1400, month: 7, text: "A fire"}]});
  assert.equal(O.townTopic(burned, 1401), "fire");
  assert.equal(O.townTopic(burned, 1403), null, "old blows are forgotten");
  assert.equal(O.townTopic(TR.view({...t, unrest: 4}), 1400), "angry");
  assert.equal(O.townTopic(TR.view({...t, prosperity: 4.5}), 1400), "thriving");
  assert.ok(O.PASSERBY_TOPICS.includes("town") && O.TOPICS.includes("town"));
  for ( const k of [...O.TOWN_BLOWS, "angry", "grim", "thriving"] ) {
    const shared = {...O.sharedFacts({year: 1400, region: "moravia", seed: 3}), town: k};
    const x = O.exchange({a: {facts: {}}, b: {facts: {}}, shared, grammar: OVERHEARD, seed: 5, topic: "town"});
    assert.ok(x && x.lines.length === 2 && !O.unfilled(x.lines[0].say), k);
    assert.ok(!/—|\b(he|she|him|her|his|hers)\b/i.test(x.lines.map(l => l.say).join(" ")), k);
  }
  assert.equal(P.townCrowd(null), 1);
  assert.equal(P.townCrowd(TR.view(t)), 1);
  assert.ok(P.townCrowd({plague: "Plague", unrest: 4.8, prosperity: 1}) < 0.3);
  assert.equal(P.townCrowd({prosperity: 4.2, unrest: 1}), 1.2);
  assert.match(src("modules/wodx-npc/scripts/passersby.mjs"), /towns\?\.ofScene/);
  assert.match(src("modules/wodx-npc/scripts/overheard.mjs"), /towns\?\.ofScene/);
});
