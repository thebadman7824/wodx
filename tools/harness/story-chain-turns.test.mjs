import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

/*
 * B6740: the clock's tick deals story chains and saga steps and steps book one's fronts over many awaits. A change the
 * Storyteller makes meanwhile (an ending picked, a chapter marked played) must not be written over by the tick's older
 * copy of the story-chain state. Before B6740 the ending below was lost (the gatesaga failures "3 seasons pass" and
 * "6 sequel notes" after other gates were this).
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
globalThis.canvas = null;
await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await import(join(root, "modules/wodx-rothenstein/scripts/register.mjs"));
const M = "wodx-chronicle", DAY = 86400;
const wait = ms => new Promise(r => setTimeout(r, ms));

test("an ending picked while the clock's tick deals the saga is kept", async () => {
  await Hooks.callAll("init");
  mock.setupTime();
  await Hooks.callAll("ready");
  await mock.settle();
  game.scenes = new (game.journal.constructor)();
  const saga = game.modules.get(M).api.pod.saga;
  await game.settings.set(M, "podSaga", true);
  // chat cards take a moment, as on a real server
  const create = ChatMessage.create;
  ChatMessage.create = async d => { await wait(40); return create(d); };
  await saga.start("red-stone");
  await game.time.advance(40 * DAY); await saga.settled?.();
  assert.equal(await saga.played("red-stone"), "c1");
  await wait(2100); // the tick runs at most once every two seconds
  const ticking = game.time.advance(8 * DAY); // deals the roads and Chapter II, steps the fronts
  await wait(5);
  await saga.ending("red-stone", "take");
  await ticking; await wait(50); await saga.settled?.();
  const st = game.settings.get(M, "podState"), run = st.chains.find(r => r.saga?.book === "red-stone");
  assert.equal(st.saga.endings["red-stone"], "take", "the ending stands");
  assert.equal(run.saga.endings["red-stone"], "take", "the running book took the ending");
  assert.ok(run.at >= 3, `the tick still dealt its steps (at ${run.at})`);
  assert.ok(mock.log.chat.some(c => /Chapter II/.test(c.content)), "Chapter II was dealt");
});
