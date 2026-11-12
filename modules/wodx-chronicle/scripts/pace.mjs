import {MODULE_ID, isActiveGM, setting} from "./util.mjs";
import * as skip from "./skip.mjs";
import * as P from "./pace-rules.mjs";

/** WoDX Chronicle 0.39.0: the clock that runs with the table (the rules are in pace-rules.mjs). */

let last = Date.now(), timer = null, stepping = false;

export function registerPaceSettings(onChange) {
  game.settings.register(MODULE_ID, "paceMinutes", {name: "Clock runs with the table: game minutes a step",
    hint: "0 keeps the clock by hand (the default). Above 0, the clock moves this many game minutes every so many real minutes while the game runs, outside fights and holds, the same on every scene.",
    scope: "world", config: true, type: Number, default: 0, onChange});
  game.settings.register(MODULE_ID, "paceEvery", {name: "Clock runs with the table: every so many real minutes",
    scope: "world", config: true, type: Number, default: 10, onChange});
}

const players = () => (game.users?.contents ?? [...(game.users ?? [])]).filter(u => u.active && !u.isGM).length;
const fight = () => (game.combats?.contents ?? [...(game.combats ?? [])]).some(c => c.started);

async function check() {
  if ( stepping || !isActiveGM() ) return;
  const minutes = setting("paceMinutes"), every = setting("paceEvery");
  const state = {minutes, every, paused: game.paused, fight: fight(), held: skip.isSkipping(), players: players(), last, now: Date.now()};
  if ( !P.cleanPace(minutes, every).minutes || state.paused || state.fight || state.held || !state.players ) { last = Date.now(); return; }
  if ( !P.shouldStep(state) ) return;
  stepping = true;
  try { await game.time.advance(P.cleanPace(minutes, every).minutes * 60); } finally { last = Date.now(); stepping = false; }
}

/** Start the check on the Storyteller's client: every 30 real seconds. Moving the clock by hand starts the count again. */
export function startPace() {
  if ( timer ) return;
  timer = setInterval(() => { check().catch(e => console.error(`${MODULE_ID} | pace`, e)); }, 30000);
  timer?.unref?.(); // the harness runs this under Node: never keep it alive
  Hooks.on("updateWorldTime", () => { if ( !stepping ) last = Date.now(); });
}
export const paceLine = () => P.paceWords(setting("paceMinutes"), setting("paceEvery"));
