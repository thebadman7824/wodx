// B6795: Net burn and Net shock (Intelligence a black program or a hard de-rez took) heal with the clock.
import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
mock.asGM();
const N = await import(join(root, "modules/wodx-otherworlds/scripts/net-rules.mjs"));
const net = await import(join(root, "modules/wodx-otherworlds/scripts/net.mjs"));
const DAY = 86400;

test("the rules: one point at a time, a lighter loss heals sooner, the times are V20's mortal ones", () => {
  assert.equal(N.burnHealSeconds(1), DAY);
  assert.equal(N.burnHealSeconds(3), 7 * DAY);
  assert.deepEqual(N.burnHeal({points: 2, last: 0}, 2 * DAY), {points: 2, last: 0, healed: 0, next: DAY});
  assert.deepEqual(N.burnHeal({points: 2, last: 0}, 4 * DAY), {points: 0, last: 4 * DAY, healed: 2, next: null});
  assert.equal(N.burnHeal({points: 3, last: 0}, 8 * DAY).points, 2);
  assert.equal(N.burnWhen(3 * DAY), "3 days");
});

function actorWithBurn(points, last) {
  const effects = [];
  const a = {id: "a1", name: "Jacks", effects, getActiveTokens: () => [], testUserPermission: () => false};
  const e = {id: "e1", name: `Net burn: ${points} Intelligence lost`, changes: [{key: "system.attributes.intelligence.value", mode: 2, value: String(-points)}],
    flags: {"wodx-otherworlds": {netBurn: true, heals: "lethal", what: "Net burn", points, last}},
    async update(u) { for ( const [k, v] of Object.entries(u) ) { if ( k.startsWith("flags.") ) { const key = k.split(".").pop(); this.flags["wodx-otherworlds"][key] = v; } else this[k] = v; } },
    async delete() { effects.splice(effects.indexOf(this), 1); }};
  effects.push(e);
  game.actors.set(a.id, a);
  return {a, e};
}

test("the clock gives the points back: the effect shrinks, then goes, and a card says so (B6795)", async () => {
  const {a, e} = actorWithBurn(3, 0);
  assert.deepEqual(await net.healBurns(2 * DAY), []);
  const r = await net.healBurns(8 * DAY);
  assert.deepEqual(r, [{actor: "a1", healed: 1, left: 2}]);
  assert.equal(e.changes[0].value, "-2");
  assert.match(e.name, /2 Intelligence lost.*next point in 2 days/);
  await net.healBurns(8 * DAY + 4 * DAY);
  assert.equal(a.effects.length, 0, "all of it back");
  assert.ok(mock.log.chat.some(m => /Net burn heals/.test(m.content)));
  game.actors.delete("a1");
});

test("a burn made before the clock counted starts counting now", async () => {
  const {e} = actorWithBurn(2, undefined);
  delete e.flags["wodx-otherworlds"].last;
  await net.healBurns(50 * DAY);
  assert.equal(e.flags["wodx-otherworlds"].last, 50 * DAY);
  assert.equal(e.changes[0].value, "-2");
  game.actors.delete("a1");
});
