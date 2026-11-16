/* Final audit (B6783, B6784): the sprite moves that follow a player's own action play on the player's computer, where
 * the hook fires; and work at a door or lock, said on the Storyteller's computer, plays there. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";

const hooks = new Map();
globalThis.Hooks = {on: (n, f) => { if ( !hooks.has(n) ) hooks.set(n, []); hooks.get(n).push(f); }, once() {}, callAll: (n, ...a) => { for ( const f of hooks.get(n) ?? [] ) f(...a); }};
const gm = {id: "gm", isGM: true}, pl = {id: "pl", isGM: false};
let me = pl;
globalThis.game = {users: {get activeGM() { return gm; }, filter: () => [gm]}, get user() { return me; },
  settings: {get: () => true}, modules: new Map(), i18n: {localize: s => s}};
globalThis.fetch = async () => ({ok: false});
globalThis.performance ??= {now: () => Date.now()};
const updates = [];
function tok(id, actor, owner) {
  const document = {id, uuid: `Scene.s.Token.${id}`, x: 0, y: 0, width: 1, height: 1, flags: {"wodx-paperdoll": {sprite: "own-p1"}},
    get isOwner() { return me.isGM || owner === me.id; },
    async update(ch) { if ( !this.isOwner ) throw new Error("not the owner"); updates.push([id, ch?.flags?.["wodx-paperdoll"]?.act?.name ?? Object.keys(ch?.flags?.["wodx-paperdoll"] ?? {})[0]]); return this; }};
  return {id, document, actor};
}
const hero = {uuid: "Actor.hero", id: "hero", name: "Hero", type: "Werewolf"};
const tHero = tok("tHero", hero, "pl");
globalThis.canvas = {ready: false, grid: {size: 100}, tokens: {placeables: [tHero], get: id => [tHero].find(t => t.id === id)}};
const SR = await import("../../modules/wodx-paperdoll/scripts/sprite-rules.mjs");
const S = await import("../../modules/wodx-paperdoll/scripts/sprites.mjs");
SR.learn("worlds/t/wodx-sprites", {sprites: {p1: {name: "Player figure", acts: ["shift", "feed", "pick", "search", "swing"]}}});
S.startSprites();
const settle = () => new Promise(r => setTimeout(r, 20));

test("a change of form the player makes plays the shift on the player's computer (the hook fires there only)", async () => {
  updates.length = 0; me = pl;
  Hooks.callAll("wodxFormChanged", hero, "crinos");
  await settle();
  assert.deepEqual(updates, [["tHero", "shift"]]);
});

test("feeding the player does plays the feeding move on the player's computer", async () => {
  updates.length = 0; me = pl;
  Hooks.callAll("wodxFed", {by: {uuid: hero.uuid, name: hero.name}, vessel: {uuid: "Actor.nobody", name: "Nobody"}, drunk: 1});
  await settle();
  assert.deepEqual(updates.filter(u => u[1] === "feed"), [["tHero", "feed"]]);
});

test("work at a lock, said on the Storyteller's computer, plays the stoop there", async () => {
  updates.length = 0; me = gm;
  Hooks.callAll("wodxInteractableWorked", {token: tHero.document.uuid, action: "pick", thing: "door", scene: "s", result: "done"});
  await settle();
  assert.deepEqual(updates, [["tHero", "pick"]]);
});
