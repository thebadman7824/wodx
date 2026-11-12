import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Missed connections 2026-11-12: x2 fights make noise, x3 chases, x4/x5 market news, x8 two unheard hooks */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const CR = await imp("modules/wodx-combat/scripts/rules.js");
const CH = await imp("modules/wodx-interactables/scripts/chase-rules.mjs");
const SR = await imp("modules/wodx-interactables/scripts/state-rules.mjs");
const N = await imp("modules/wodx-storyteller/scripts/market-news-rules.mjs");
const AR = await imp("modules/wodx-npc/scripts/alert-rules.mjs");
const src = p => readFileSync(join(root, p), "utf8");

test("x2: guns and blasts are loud, a silenced gun, blades, fists and bows quiet", () => {
  assert.equal(CR.fightNoise({name: "Colt revolver", ranged: true}), "loud");
  assert.equal(CR.fightNoise({name: "Matchlock arquebus", ranged: true}), "loud");
  assert.equal(CR.fightNoise({name: "Hand grenade"}), "loud");
  assert.equal(CR.fightNoise({name: "Silenced pistol", ranged: true}), "quiet");
  assert.equal(CR.fightNoise({name: "Longsword"}), "quiet");
  assert.equal(CR.fightNoise({name: "Crossbow", ranged: true, shots: {counted: true}}), "quiet");
  assert.equal(CR.fightNoise({name: "Longbow", ranged: true}), "quiet");
  assert.equal(CR.fightNoise({name: "Service weapon", ranged: true, shots: {counted: true}}), "loud", "a gun known only by its clip");
  assert.equal(CR.fightNoise({}), "quiet");
});

test("x2: the attack card carries the noise, and Combat hands it to Interactables on the Storyteller's client", () => {
  const m = src("modules/wodx-combat/scripts/main.js");
  assert.match(m, /noise: R\.fightNoise\(w\)/);
  assert.match(m, /api\.noiseAt\(\{ token: tokDoc\.object, noise: d\.noise, kind: "fight"/);
  assert.match(m, /if \(!d\?\.noise \|\| !isActiveGM\(\)\) return;/);
  assert.ok(SR.EVENT_KINDS.fight && SR.EVENT_KINDS.chase, "fight and chase are map event kinds");
  assert.equal(SR.mapEvent({kind: "fight", noise: "loud"}).kind, "fight");
  assert.match(src("modules/wodx-interactables/scripts/main.mjs"), /export function noiseAt\(/);
});

test("x2/x3: NPC reaction cards read a fight or a chase", () => {
  assert.equal(AR.eventHead({kind: "fight", objectName: "gunfire"}, "Ana"), "Ana: the sound of gunfire");
  assert.equal(AR.eventHead({kind: "chase", objectName: "a chase"}, null), "Someone: the sound of a chase");
  assert.equal(AR.eventSituation({kind: "fight"}).weapon, true);
  assert.equal(AR.eventSituation({kind: "open"}).weapon, false);
});

test("x3: hooves and motors make a chase loud, feet quiet", () => {
  assert.equal(CH.chaseNoise({quarry: {way: "foot"}, pursuers: [{way: "foot"}]}), "quiet");
  assert.equal(CH.chaseNoise({quarry: {way: "foot"}, pursuers: [{way: "horse"}]}), "loud");
  assert.equal(CH.chaseNoise({quarry: {way: "car"}, pursuers: []}), "loud");
  assert.equal(CH.chaseNoise({quarry: {way: "bicycle"}, pursuers: [{way: "horse", out: "thrown"}]}), "quiet", "a pursuer out of the chase is not heard");
});

test("x3: hard feelings after a chase", () => {
  const npcFled = {status: "caught", quarry: {id: "q", npc: true}, pursuers: [{id: "p1", npc: false}, {id: "p2", npc: true}]};
  assert.deepEqual(CH.chaseGrudges(npcFled), [{npc: "q", pc: "p1", why: "chased them down"}]);
  const pcAway = {status: "away", quarry: {id: "q", npc: false}, pursuers: [{id: "n1", npc: true}, {id: "p", npc: false}]};
  assert.deepEqual(CH.chaseGrudges(pcAway), [{npc: "n1", pc: "q", why: "got away from them"}]);
  assert.deepEqual(CH.chaseGrudges({...pcAway, status: "caught"}), [], "a caught player character has a fight coming, not a grudge");
  assert.deepEqual(CH.chaseGrudges({...npcFled, status: "running"}), []);
  assert.match(src("modules/wodx-interactables/scripts/chase.mjs"), /wix-chase-grudge/);
});

test("x4: dated events bring market news; their own preset wins", () => {
  assert.equal(N.newsFor({id: "black-death"}), "plague");
  assert.equal(N.newsFor({id: "convention-of-thorns"}), null);
  assert.equal(N.newsFor({id: "x", market: "famine"}), "famine");
  assert.equal(N.newsFor({id: "black-death", market: "nonsense"}), "plague");
  const markets = [{id: "brno", name: "Brno", index: {food: 2}, supply: {}}, {id: "village", name: "Village", index: {}, supply: {food: "plenty"}}];
  const ch = N.marketChanges("plague", markets, ["food", "medicine", "faith", "arms"], {min: 0.5, max: 3});
  assert.equal(ch.length, 2);
  assert.equal(ch[0].index.food, 3, "clamped at the index cap");
  assert.equal(ch[0].index.medicine, 2);
  assert.equal(ch[1].supply.food, "short");
  assert.deepEqual(N.undoChange(ch[0]), {index: {food: 2, medicine: 1, faith: 1}, supply: {food: "normal", medicine: "normal"}});
  assert.deepEqual(N.undoChange(ch[1]).supply, {food: "plenty", medicine: "normal"});
  assert.deepEqual(N.marketChanges("nothing", markets), []);
});

test("x4: every event the table names exists in the chronicle", async () => {
  const ev = await imp("modules/wodx-chronicle/data/events.mjs"), fut = await imp("modules/wodx-chronicle/data/future-events.mjs");
  const ids = new Set([...Object.values(ev)[0].events, ...Object.values(fut)[0].events].map(e => e.id));
  for ( const [id, p] of Object.entries(N.EVENT_NEWS) ) { assert.ok(ids.has(id), id); assert.ok(N.PRESETS[p], p); }
});

test("x5: a week of player trade gluts or empties a market once", () => {
  let t = {}, notices = [];
  for ( let k = 0; k < 4; k++ ) { const r = N.countTrade(t, {kind: "arms", dir: "in", count: 3, worldTime: 100}); t = r.tally; if ( r.notice ) notices.push(r.notice); }
  assert.equal(notices.length, 1);
  assert.deepEqual(notices[0], {kind: "arms", dir: "in", count: 12});
  const next = N.countTrade(t, {kind: "arms", dir: "in", count: 1, worldTime: 100 + N.WEEK});
  assert.equal(next.tally.kinds.arms.in, 1, "a new week starts the count again");
  const c = N.tradeChange({id: "m", name: "M", index: {arms: 1.5}}, notices[0]);
  assert.equal(c.index.arms, 1.2);
  assert.equal(c.supply.arms, "plenty");
  assert.equal(N.tradeChange({id: "m", index: {}}, {kind: "food", dir: "out"}).supply.food, "short");
  assert.match(src("modules/wodx-actions/scripts/trade.js"), /Hooks\.callAll\("wodxTradeDone"/);
});

test("x8: living tiles follow an undone event, and Dreaming crossings reach the Storyteller's log", () => {
  assert.match(src("modules/wodx-interactables/scripts/living.mjs"), /\["wodxEventFired", "wodxEventUndone"\]/);
  assert.match(src("modules/wodx-storyteller/scripts/main.mjs"), /Hooks\.on\("wodxDreamingGate"/);
});
