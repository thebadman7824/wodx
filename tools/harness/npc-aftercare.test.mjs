// NPC Aftercare Desk (B5800-B5806): what comes after. Pure rules, and the wiring by source.
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const AC = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/aftercare-rules.mjs")));
const DU = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/duty-rules.mjs")));

test("n1: held, then let go, served, banished or put to death", () => {
  assert.equal(AC.heldDuty("W").label, "Held for trial");
  assert.equal(AC.lawAfter(null).do, "free");
  assert.equal(AC.lawAfter({kind: "fine"}).do, "free");
  assert.equal(AC.lawAfter({kind: "time", year: 1500, until: 1503}).seconds, 3 * AC.YEAR);
  assert.equal(AC.lawAfter({kind: "banished"}).do, "gone");
  assert.equal(AC.lawAfter({kind: "death"}).do, "dead");
  assert.equal(AC.lawAfter({kind: "death"}, {guilty: false}).do, "free");
  const h = AC.homeDuty("H", 100);
  assert.equal(h.until, 100 + 3600);
  // a duty that starts later (home after a sentence) waits for its time
  assert.equal(DU.dutyActive({place: "H", after: 500}, 100), false);
  assert.equal(DU.dutyActive({place: "H", after: 500}, 600), true);
  assert.equal(DU.withDuties([], {x: {place: "H", after: 500, until: 900}}, 100).length, 0);
});

test("n2: the healing clock (M20 pp. 408-409) and who needs a healer", () => {
  assert.deepEqual(AC.nextHeal({bashing: 2}), {type: "bashing", seconds: 3600});
  assert.deepEqual(AC.nextHeal({lethal: 3}), {type: "lethal", seconds: 7 * 86400});
  assert.deepEqual(AC.nextHeal({lethal: 2, bashing: 3}), {type: "bashing", seconds: 3 * 3600});
  assert.equal(AC.nextHeal({}), null);
  assert.equal(AC.needsCare({bashing: 3}), false);
  assert.equal(AC.needsCare({bashing: 4}), true);
  assert.equal(AC.needsCare({lethal: 3}), true);
  assert.equal(AC.laidUp({lethal: 2}), false);
  assert.deepEqual(AC.bloodHeal({bashing: 1, lethal: 3}, 4), {bashing: 1, lethal: 1, spent: 2});
  assert.equal(AC.HEALERS[0], "hospital");
});

test("n3: who gives way, and the next meeting is likelier to come to blows", () => {
  assert.equal(AC.givesWay([{id: "a", us: 1, them: 3}, {id: "b", us: 3, them: 1}]), "a");
  assert.equal(AC.givesWay([{id: "a", us: 1, them: 1, ownGround: true}, {id: "b", us: 1, them: 1}]), "b");
  assert.equal(AC.standoffBonus(100, 200), 10);
  assert.equal(AC.standoffBonus(100, 100 + 31 * 86400), 0);
  assert.equal(AC.standoffBonus(undefined, 5), 0);
  assert.match(src("modules/wodx-npc/scripts/rivalry.mjs"), /givesWay/);
});

test("n4: Dazed, then rest at home until morning", () => {
  const d = AC.restDuty("H", 10 * 3600);
  assert.equal(d.after, 10 * 3600 + 600);
  assert.equal(d.until, 86400 + 6 * 3600);
  assert.equal(AC.nextMorning(3 * 3600), 6 * 3600);
});

test("n5: mourning by faith", () => {
  assert.equal(AC.mourningOf("jewish").days, 7);
  assert.equal(AC.mourningOf("islamic").days, 3);
  assert.equal(AC.mourningOf("nobody").days, 7);
  const m = AC.mournDuties("H", "C", 0, "islamic");
  assert.equal(m.worship.until, 3 * 86400);
  assert.deepEqual(Object.keys(m), ["worship", "home"]);
  assert.match(src("modules/wodx-npc/scripts/hearts.mjs"), /aftercare\?\.mourn/);
});

test("n6, n7: a robber's night out, and who moves on marriage", () => {
  assert.equal(AC.spreeDuty("T", 22 * 3600).until, 86400 + 6 * 3600);
  assert.deepEqual(AC.whoMoves([{id: "a", home: null}, {id: "b", home: "H"}]), {moves: "a", to: "b"});
  assert.deepEqual(AC.whoMoves([{id: "a", home: "A", sex: "female"}, {id: "b", home: "B", sex: "male"}]), {moves: "a", to: "b"});
  assert.deepEqual(AC.whoMoves([{id: "a", home: "A", household: 4}, {id: "b", home: "B", household: 1}]), {moves: "b", to: "a"});
  assert.equal(AC.whoMoves([{id: "a"}, {id: "b"}]), null);
  assert.match(src("modules/wodx-npc/scripts/prowl.mjs"), /Report it to the watch/);
  assert.match(src("modules/wodx-chronicle/scripts/law-punish.mjs"), /mercy: true/);
});

/* B6665: an unlinked NPC with no duty holder (routine-less, or one of several tokens sharing a world actor) is tended
 * or rests as itself. Mocks: one scene, tokens with synthetic actors, a routines api that walks and lists places. */
const setPath = (o, path, v) => { const ks = path.split("."); let x = o; for ( const k of ks.slice(0, -1) ) x = (x[k] ??= {}); x[ks.at(-1)] = v; };
const doc = props => ({flags: {}, ...props,
  getFlag(m, k) { return this.flags?.[m]?.[k]; },
  async setFlag(m, k, v) { (this.flags[m] ??= {})[k] = structuredClone(v); },
  async unsetFlag(m, k) { if ( this.flags?.[m] ) delete this.flags[m][k]; },
  async update(u) { for ( const [k, v] of Object.entries(u) ) setPath(this, k, v); }});
function aftercareWorld({places = []} = {}) {
  const scene = {id: "s1", tokens: [], regions: []};
  const walked = [];
  const routines = {routineOf: a => a?.flags?.["wodx-npc"]?.routine ?? null, setDuty: async () => null, listPlaces: () => places.map(p => ({...p, scene})),
    entranceOf: () => null, freeCellsIn: () => [{i: 2, j: 9}],
    walkTo: async (tok, cell) => { walked.push([tok.id, cell]); tok.document.x = cell.j * 100; tok.document.y = cell.i * 100; return "walked"; }};
  const world = doc({id: "w1", name: "Passer-by", type: "Mortal", hasPlayerOwner: false});
  const token = id => {
    const t = doc({id, actorId: world.id, actorLink: false, hidden: false, x: 0, y: 0, width: 1, height: 1, parent: scene});
    t.actor = doc({id: world.id, name: "Passer-by", type: "Mortal", isToken: true, baseActor: world, token: t, hasPlayerOwner: false, statuses: new Set(),
      system: {health: {damage: {bashing: 0, lethal: 3, aggravated: 0}}}});
    t.object = {id, document: t};
    scene.tokens.push(t);
    return t;
  };
  globalThis.game = {time: {worldTime: 10000}, user: {isGM: true}, actors: Object.assign([world], {get: id => (id === world.id ? world : null)}), scenes: [scene], modules: {get: () => null}};
  globalThis.canvas = {ready: true, scene, grid: {getOffset: p => ({i: Math.floor(p.y / 100), j: Math.floor(p.x / 100)})}, tokens: {placeables: []}};
  globalThis.ChatMessage = {create: async () => null};
  globalThis.fromUuidSync = uuid => scene.tokens.find(t => t.id === uuid)?.actor ?? null;
  const heal = async (a, type, n) => { a.system.health.damage[type] -= n; };
  return {scene, walked, world, token, routines, C: () => ({healDamage: heal})};
}
const AFTER = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/aftercare.mjs")));
const buildAfter = w => AFTER.build({MOD: "wodx-npc", esc: s => s, gmIds: () => [], isActiveGM: () => true, chron: () => null, routines: w.routines, C: w.C});

test("B6665: a routine-less unlinked NPC walks into the hospital on its scene, and comes back mended", async () => {
  const w = aftercareWorld({places: [{id: "H", name: "Hospital", kind: "hospital", region: {id: "r"}}]});
  const t = w.token("t1");
  const ac = buildAfter(w);
  const out = await ac.afterFight({combatants: [{actor: t.actor, token: t}]});
  assert.deepEqual(w.walked, [["t1", {i: 2, j: 9}]]);
  assert.equal(t.actor.getFlag("wodx-npc", "tokenAway").place, "H");
  assert.equal(t.hidden, false);
  assert.match(out[0], /tended at Hospital/);
  t.actor.system.health.damage.lethal = 2;
  await ac.mendTick();
  assert.equal(t.actor.getFlag("wodx-npc", "tokenAway"), undefined);
});

test("B6665: tokens sharing a world actor with no healer on the scene go out of sight while tended, and show again when mended", async () => {
  const w = aftercareWorld();
  const [a, b] = [w.token("t1"), w.token("t2")];
  w.world.flags["wodx-npc"] = {routine: {on: true, roles: {}}};
  const ac = buildAfter(w);
  await ac.afterFight({combatants: [{actor: a.actor, token: a}, {actor: b.actor, token: b}]});
  assert.equal(a.hidden, true);
  assert.equal(a.actor.getFlag("wodx-npc", "tokenAway").hid, true);
  assert.equal(b.actor.getFlag("wodx-npc", "tokenAway").why, "tend");
  a.actor.system.health.damage.lethal = 1;
  await ac.mendTick();
  assert.equal(a.hidden, false);
  assert.equal(a.actor.getFlag("wodx-npc", "tokenAway"), undefined);
  assert.equal(b.hidden, true, "still laid up");
});

test("B6665: a passer-by fed on rests as itself after the Daze, and is back in the morning", async () => {
  const w = aftercareWorld();
  const t = w.token("t1");
  const ac = buildAfter(w);
  await ac.onFed({vessel: {uuid: "t1"}, by: {uuid: "nobody"}, drunk: 1, willing: false});
  const f = t.actor.getFlag("wodx-npc", "tokenAway");
  assert.equal(f.why, "rest");
  assert.equal(f.pending, true);
  assert.equal(t.hidden, false, "Dazed where it stands first");
  game.time.worldTime = f.after + 1;
  await ac.awayTick();
  assert.equal(t.hidden, true);
  game.time.worldTime = f.until + 1;
  await ac.awayTick();
  assert.equal(t.hidden, false);
  assert.equal(t.actor.getFlag("wodx-npc", "tokenAway"), undefined);
});
