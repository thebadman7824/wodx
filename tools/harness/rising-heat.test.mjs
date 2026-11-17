import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

/* B6933: a rising that is put down gives its leaders law heat (the desk's rising-heat ruling). The put-down card names
   the player characters as possible leaders; pressing one adds a "leading a rising" deed through law-heat addDeed. */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const H = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/law-heat-rules.mjs")));
const mock = installMock({dataRoot: root});
globalThis.canvas = null;
await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
const M = "wodx-chronicle";
const wait = ms => new Promise(r => setTimeout(r, ms));
const cardEl = html => { const d = document.createElement("div"); d.innerHTML = html; return d; };

test("leading a rising is a grave deed: a named leader is wanted at once", () => {
  assert.ok(H.GRAVITY.rising >= H.GRAVITY.killing);
  assert.equal(H.DEED_WORDS.rising, "leading a rising");
  for ( const c of [0.25, 0.5, 0.9] ) assert.ok(H.gainFor("rising", {catch: c}, {named: true, witnesses: 3}) >= 5, `wanted at catch ${c}`);
});

test("put down: the card offers the leaders, and a pressed leader gains heat in the rising's region", async () => {
  await Hooks.callAll("init");
  mock.setupTime();
  await Hooks.callAll("ready");
  await mock.settle();
  game.actors.set("lead1", {id: "lead1", name: "Mira", type: "mortal", hasPlayerOwner: true, system: {}});
  const el = cardEl(`<div class="wodx-card wodx-law-regime"><button type="button" data-action="wodx-law-rising" data-won="0">It is put down</button></div>`);
  await Hooks.callAll("renderChatMessageHTML", {flags: {[M]: {lawRising: {town: "t1", region: "moravia", name: "Brno"}}}}, el);
  const c0 = mock.log.chat.length;
  el.querySelector("button").click();
  await wait(50);
  const card = mock.log.chat.slice(c0).find(c => /put down/.test(c.content));
  assert.ok(card, "the put-down card");
  assert.match(card.content, /data-action="wodx-law-rising-leader"[^>]*data-actor="lead1"/);
  assert.deepEqual(card.flags?.[M]?.lawRisingLeaders, {region: "moravia", name: "Brno"});
  const el2 = cardEl(card.content);
  await Hooks.callAll("renderChatMessageHTML", card, el2);
  el2.querySelector("[data-actor='lead1']").click();
  await wait(50);
  const e = game.settings.get(M, "lawHeat")?.regions?.moravia?.lead1;
  assert.ok(e, "heat entry in the rising's region");
  assert.ok(e.heat >= 5, `wanted: ${e.heat}`);
  assert.equal(e.deeds.at(-1).deed, "rising");
  assert.match(e.deeds.at(-1).where, /Brno/);
});
