import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/*
 * Every land its own money and coin of the place in the purse (Storyteller 0.58.0, Chronicle 0.50.1, B2650 to
 * B2652): the lands that borrowed a neighbour's money have their own, shared coin stays shared, and a purse changed
 * at a money changer pays abroad without the cut.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const R = await imp("modules/wodx-storyteller/scripts/money-rules.mjs");
const WR = await imp("modules/wodx-chronicle/scripts/world-rules.mjs");

test("own money: no region borrows another land's money any more where it had its own", () => {
  const want = {korea: "korean", "southeast-asia": "southeast-asian", nusantara: "malay", "carpathians-balkans": "hungarian", aegean: "greek",
    caribbean: "caribbean", andes: "andean", "southern-cone": "platine", "central-africa": "kongo", "tibet-himalaya": "tibetan", canada: "canadian"};
  for ( const [id, money] of Object.entries(want) ) assert.equal(WR.WORLD_REGIONS[id].money, money, id);
  for ( const r of Object.values(WR.WORLD_REGIONS) ) assert.ok(R.MONIES[r.money] && R.COINS[r.money], r.label);
  // Each new money covers every year from the first coin (or none) to the eurobuck, with sound units and a wage
  for ( const id of Object.values(want) ) for ( let y = -3000; y <= 2100; y += 7 ) {
    const m = R.moneyFor(y, id);
    assert.equal(m.region, id, `${id} ${y} falls back to ${m.region}`);
    assert.ok(R.wageAt(y, id) > 0, `${id} ${y} wage`);
    const u = m.units.map(x => x[2]);
    assert.ok(u.every((v, i) => !i || v < u[i - 1]) && u.at(-1) === 1, `units ${id} ${m.id}`);
  }
  // Money ids name one money: the same id never carries two different sets of units
  const seen = new Map();
  for ( const r of Object.values(R.MONIES) ) for ( const m of r.list ) {
    const key = JSON.stringify(m.units);
    if ( seen.has(m.id) ) assert.equal(seen.get(m.id), key, m.id); else seen.set(m.id, key);
  }
  assert.equal(R.moneyFor(1250, "korean").id, "ko-cloth");
  assert.equal(R.moneyFor(1750, "korean").id, "sangpyeong");
  assert.equal(R.moneyFor(1990, "hungarian").id, "huf");
  assert.equal(R.moneyFor(1900, "greek").id, "drachma-1");
  assert.equal(R.moneyFor(1400, "andean").id, "andes-cloth");
  assert.equal(R.moneyFor(1980, "tibetan").id, "rmb");
  assert.equal(R.moneyFor(1700, "canadian").id, "tournois");
  assert.equal(R.moneyFor(2050, "malay").id, "eb");
});

test("own money: where a land paid in a neighbour's coin in fact, no changer stands between them", () => {
  assert.ok(R.sameMoney(1600, "greek", "ottoman"));        // the akçe in Ottoman Greece
  assert.ok(!R.sameMoney(1900, "greek", "ottoman"));       // the drachma against the lira
  assert.ok(R.sameMoney(1600, "caribbean", "mexican"));    // pieces of eight in Havana
  assert.ok(R.sameMoney(1600, "andean", "mexican"));       // and from Potosí
  assert.ok(!R.sameMoney(1950, "andean", "mexican"));
  assert.ok(R.sameMoney(1980, "tibetan", "chinese"));
  assert.ok(!R.sameMoney(1800, "tibetan", "chinese"));
  assert.ok(R.sameMoney(1700, "canadian", "french"));      // the livre in New France
  assert.ok(R.sameMoney(1100, "greek", "ottoman"));        // the hyperpyron of Constantinople
  assert.ok(!R.sameMoney(1600, "korean", "chinese"));
  assert.equal(R.changerCut(1600, {from: "greek", to: "ottoman"}), 0);
});

test("coin of the place: paid first abroad, with no changer, and the rest from home money with the cut", () => {
  const y = 1600, home = "moravian", away = "japanese";
  const price = R.priceAbroad(1000, y, home, away);
  // Enough coin of the place: it all comes from there, and only the local price is spent
  const all = R.splitAbroad(price.total, 1e9, y, home, away);
  assert.equal(all.home, 0);
  assert.ok(Math.abs(all.local - price.local) <= 1, `${all.local} vs ${price.local}`);
  // Half the coin needed: about half of the home price is still charged
  const half = R.splitAbroad(price.total, Math.floor(price.local / 2), y, home, away);
  assert.ok(half.home > 0 && half.home < price.total);
  assert.ok(Math.abs(half.home - price.total / 2) <= price.total * 0.02 + 1, String(half.home));
  // No coin of the place, or the same money: nothing changes
  assert.deepEqual(R.splitAbroad(price.total, 0, y, home, away), {local: 0, home: price.total});
  assert.deepEqual(R.splitAbroad(500, 1000, y, home, home), {local: 0, home: 500});
  // Coin of the place cleaned and aged out
  assert.deepEqual(R.cleanForeign({mon: {region: "japanese", amount: 3.6}, bad: {region: "nowhere", amount: 5}, nil: {region: "japanese", amount: 0}}), {mon: {region: "japanese", amount: 4}});
  assert.deepEqual(R.staleForeign({mon: {region: "japanese", amount: 5}}, 1500), []);
  assert.deepEqual(R.staleForeign({mon: {region: "japanese", amount: 5}}, 1700), ["mon"]);
});

/* The Foundry side: changePurse, pay abroad, undo, coin out of use, the arrival card */
const MOD = "wodx-storyteller";
const set = (o, path, v) => {
  const ks = path.split("."); let cur = o;
  for ( let i = 0; i < ks.length - 1; i++ ) cur = cur[ks[i]] ??= {};
  const last = ks[ks.length - 1];
  if ( last.startsWith("-=") ) delete cur[last.slice(2)]; else cur[last] = v;
};
let n = 0;
function actor(name) {
  const a = {id: `a${++n}`, name, type: "Mortal", hasPlayerOwner: true, flags: {}, items: []};
  a.update = async u => { for ( const [k, v] of Object.entries(u) ) set(a, k, JSON.parse(JSON.stringify(v))); return a; };
  a.createEmbeddedDocuments = async (t, list) => { a.items.push(...list); return list; };
  return a;
}
const chats = [];
let year = 1600, sceneRegion = "japan";
const scene = {id: "s1", name: "Edo", getFlag: () => false};
const settings = {moneyRegion: "moravian", changers: true, money: true};
globalThis.foundry = {utils: {randomID: () => `r${++n}`, deepClone: x => JSON.parse(JSON.stringify(x))}};
globalThis.ChatMessage = {create: async m => { chats.push(m); return m; }};
globalThis.Hooks = {on: () => 0, callAll: () => true};
globalThis.ui = {notifications: {warn: () => 0, info: () => 0}};
globalThis.canvas = {scene};
globalThis.game = {
  user: {id: "gm", isGM: true}, users: Object.assign([{id: "gm", isGM: true}], {activeGM: {id: "gm"}, filter: f => [{id: "gm", isGM: true}].filter(f)}),
  time: {worldTime: 0}, actors: [], scenes: {get: () => scene},
  settings: {get: (m, k) => { if ( m !== MOD || !(k in settings) ) throw new Error("no setting"); return settings[k]; }, set: async (m, k, v) => { settings[k] = v; }},
  modules: {get: id => id === "wodx-chronicle" ? {active: true, api: {eras: {currentYear: () => year, activeEra: () => null}, isHeld: () => false,
    world: {isAbroad: () => sceneRegion !== "moravia", here: () => ({...WR.regionOf(sceneRegion)})}}} : null}
};
const M = await imp("modules/wodx-storyteller/scripts/money.mjs");

test("coin of the place: change money abroad, pay in it, undo, and change it back at home", async () => {
  const a = actor("Anna Novak");
  await M.receive(a, 100000, {note: "test"});
  const away = M.awayMoney(scene);
  assert.equal(away.region, "japanese");
  // Into the coin of the place, with the cut
  const r = await M.changePurse(a, 40000, {scene});
  assert.ok(r.ok && r.got > 0 && r.cut > 0);
  assert.equal(M.purseOf(a).carried, 60000);
  const held = M.foreignOf(a);
  assert.equal(held.length, 1);
  assert.equal(held[0].id, "mon");
  assert.equal(held[0].amount, r.got);
  // Can't change more than is carried
  assert.equal((await M.changePurse(a, 1e9, {scene})).ok, false);
  // Paying abroad spends the coin of the place first, and no home money
  const price = R.priceAbroad(1000, year, "moravian", "japanese");
  const paid = await M.pay(a, price.total, {scene});
  assert.ok(paid.ok && paid.fromLocal > 0 && paid.fromCarried === 0, JSON.stringify(paid));
  assert.equal(M.foreignOf(a)[0].amount, r.got - paid.fromLocal);
  assert.equal(M.purseOf(a).carried, 60000);
  // Undo gives the coin back
  assert.ok(await M.undoLast(a));
  assert.equal(M.foreignOf(a)[0].amount, r.got);
  // A price bigger than the coin of the place: it is all spent, and the rest comes from home money
  const big = await M.pay(a, 80000, {scene});
  assert.ok(big.ok && big.fromLocal === r.got && big.fromCarried > 0, JSON.stringify(big));
  assert.equal(M.foreignOf(a).length, 0);
  assert.equal(a.flags[MOD].money.purse.foreign.mon, undefined);
  // Paid at home: the coin of the place is never touched
  await M.changePurse(a, 10000, {scene});
  const before = M.foreignOf(a)[0].amount;
  await M.pay(a, 100, {atHome: true, scene});
  assert.equal(M.foreignOf(a)[0].amount, before);
  // Home again: change it back by money id
  sceneRegion = "moravia";
  assert.equal(M.awayMoney(scene), null);
  assert.equal((await M.changePurse(a, 10, {scene})).ok, false);
  const carried = M.purseOf(a).carried;
  const back = await M.changePurse(a, before, {back: true, money: "mon"});
  assert.ok(back.ok && back.got > 0 && back.got < 10000);
  assert.equal(M.purseOf(a).carried, carried + back.got);
  assert.equal(M.foreignOf(a).length, 0);
});

test("coin of the place: money gone out of use there becomes a keepsake, and the arrival card comes once", async () => {
  year = 1600; sceneRegion = "japan";
  const a = actor("Bertold");
  game.actors.push(a);
  await M.receive(a, 50000);
  await M.changePurse(a, 20000, {scene});
  year = 1700;   // the mon gives way to the ryō in Japan
  await M.receive(a, 1);
  assert.equal(M.foreignOf(a).length, 0);
  assert.ok(a.items.some(i => /^Old money: .*\(mon\)$/.test(i.name)), JSON.stringify(a.items));
  // Arrival: one card the first time, none the second, and the mark clears at home
  chats.length = 0;
  const tok = {actor: a, parent: scene};
  assert.deepEqual(await M.arrival(tok), {away: "ryo"});
  assert.equal(chats.length, 1);
  assert.match(chats[0].content, /Another land's money/);
  assert.equal(await M.arrival(tok), null);
  assert.equal(chats.length, 1);
  sceneRegion = "moravia";
  assert.deepEqual(await M.arrival(tok), {home: true});
  assert.equal(a.flags[MOD].money.abroadIn, null);
  // Changers off: no card
  sceneRegion = "japan"; settings.changers = false;
  assert.equal(await M.arrival(tok), null);
  settings.changers = true;
});
