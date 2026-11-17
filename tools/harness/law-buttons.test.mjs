import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

/* B6741: the law heat card's click handler took every "wodx-law-" button on every card, so a sentence, trial, regime
 * or tax button also ran "Let it go" and told the Storyteller "The law lets it go." */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
globalThis.canvas = null;
await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
const M = "wodx-chronicle";
const wait = ms => new Promise(r => setTimeout(r, ms));
const cardEl = html => { const d = document.createElement("div"); d.innerHTML = html; return d; };

test("a sentence card's button is not taken for the heat card's Let it go", async () => {
  await Hooks.callAll("init");
  mock.setupTime();
  await Hooks.callAll("ready");
  await mock.settle();
  const el = cardEl(`<div class="wodx-card wodx-law-sentence"><button type="button" data-action="wodx-law-sentence" data-punish="">Mercy: no sentence</button>
    <button type="button" data-action="wodx-law-election" data-actor="a1" data-rank="1" data-year="1300">A name</button></div>`);
  await Hooks.callAll("renderChatMessageHTML", {flags: {[M]: {lawSentence: {actorId: "a1", name: "Jan", region: "moravia", year: 1300, weight: 3}}}}, el);
  const n0 = mock.log.notifications.length, c0 = mock.log.chat.length;
  for ( const b of el.querySelectorAll("button") ) b.click();
  await wait(50);
  const said = mock.log.notifications.slice(n0).map(([, m]) => m);
  assert.ok(!said.some(m => /lets it go|Arrested/.test(m)), `no heat answer on a sentence card: ${said.join(" | ")}`);
  assert.ok(mock.log.chat.slice(c0).some(c => /shows Jan mercy/.test(c.content)), "the sentence card's own Mercy still works");
});

test("the heat card's own Let it go still answers", async () => {
  const el = cardEl(`<div class="wodx-card wodx-law-heat"><button type="button" data-action="wodx-law-drop" data-actor="a1" data-region="moravia">Let it go</button></div>`);
  await Hooks.callAll("renderChatMessageHTML", {flags: {[M]: {lawHeat: {actor: "a1", region: "moravia"}}}}, el);
  const n0 = mock.log.notifications.length;
  el.querySelector("button").click();
  await wait(50);
  assert.ok(mock.log.notifications.slice(n0).some(([, m]) => /lets it go/.test(m)));
});
