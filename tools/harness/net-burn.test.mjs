// B6934: Net burn (Intelligence a black program took) never heals, as the Cyberpunk 2020 core says (pdf p. 143); Net
// shock (a hard de-rez, M20 printed p. 474) still heals as lethal damage with the clock (B6795).
import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
mock.asGM();
mock.setupTime();
const N = await import(join(root, "modules/wodx-otherworlds/scripts/net-rules.mjs"));
const net = await import(join(root, "modules/wodx-otherworlds/scripts/net.mjs"));
const DAY = 86400;

test("the rules: a black program's burn is for good; a de-rez's shock heals one point at a time on V20's mortal times", () => {
  for ( const id of ["brainwipe", "zombie", "liche"] ) {
    const h = N.iceHit(id, {levels: 2, access: "plugs"});
    assert.equal(h.kind, "mind");
    assert.equal(h.permanent, true, `${id} is permanent`);
    assert.equal(h.heals, undefined);
  }
  assert.equal(N.derez("hard", {staminaDice: [1, 2]}).mindHeals, "lethal", "Net shock still heals as lethal");
  assert.equal(N.burnHealSeconds(1), DAY);
  assert.deepEqual(N.burnHeal({points: 2, last: 0}, 4 * DAY), {points: 0, last: 4 * DAY, healed: 2, next: null});
});

function actorWith(what, points, last, extra = {}) {
  const effects = [];
  const a = {id: "a1", name: "Jacks", effects, getActiveTokens: () => [], testUserPermission: () => false,
    async createEmbeddedDocuments(type, list) { for ( const d of list ) effects.push({...d, async update(u) { Object.assign(this, u); }, async delete() { effects.splice(effects.indexOf(this), 1); }}); return list; }};
  const e = {id: "e1", name: `${what}: ${points} Intelligence lost`, changes: [{key: "system.attributes.intelligence.value", mode: 2, value: String(-points)}],
    flags: {"wodx-otherworlds": {netBurn: true, heals: "lethal", what, points, last, ...extra}},
    async update(u) { for ( const [k, v] of Object.entries(u) ) { if ( k.startsWith("flags.") ) { const key = k.split(".").pop(); this.flags["wodx-otherworlds"][key] = v; } else this[k] = v; } },
    async delete() { effects.splice(effects.indexOf(this), 1); }};
  effects.push(e);
  game.actors.set(a.id, a);
  return {a, e};
}

test("a black program's hit leaves a burn for good: the effect says so, and the clock gives nothing back", async () => {
  const {a} = actorWith("Net shock", 0, 0);
  a.effects.length = 0;
  const line = await net.applyHit(a, N.iceHit("brainwipe", {levels: 2}));
  assert.match(line, /2 Intelligence<\/b> burned away for good/);
  const e = a.effects[0];
  assert.equal(e.flags["wodx-otherworlds"].permanent, true);
  assert.match(e.name, /Net burn: 2 Intelligence lost for good/);
  assert.ok(e.statuses.includes("wodx-net-burn"), "the token's icon");
  assert.deepEqual(await net.healBurns(400 * DAY), []);
  assert.equal(a.effects.length, 1);
  game.actors.delete("a1");
});

test("a Net burn saved while it healed (B6795) turns permanent and heals no more", async () => {
  const {a, e} = actorWith("Net burn", 3, 0);
  const c0 = mock.log.chat.length;
  assert.deepEqual(await net.healBurns(400 * DAY), []);
  assert.equal(a.effects.length, 1);
  assert.equal(e.changes[0].value, "-3");
  assert.equal(e.flags["wodx-otherworlds"].permanent, true);
  assert.match(e.name, /3 Intelligence lost for good/);
  assert.ok(!mock.log.chat.slice(c0).some(m => /heals/.test(m.content)));
  game.actors.delete("a1");
});

test("Net shock still heals with the clock: the effect shrinks, then goes, and a card says so", async () => {
  const {a, e} = actorWith("Net shock", 3, 0);
  assert.deepEqual(await net.healBurns(2 * DAY), []);
  const r = await net.healBurns(8 * DAY);
  assert.deepEqual(r, [{actor: "a1", healed: 1, left: 2}]);
  assert.equal(e.changes[0].value, "-2");
  assert.match(e.name, /2 Intelligence lost.*next point in 2 days/);
  await net.healBurns(12 * DAY);
  assert.equal(a.effects.length, 0, "all of it back");
  assert.ok(mock.log.chat.some(m => /Net shock heals/.test(m.content)));
  game.actors.delete("a1");
});
