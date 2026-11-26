/**
 * #2510: the time dial on screen (time-dial-rules.mjs has the rules). It shows the hour where the viewed scene stands,
 * moves when the world clock moves, and opens the Chronicle clock on a click. Each person can hide it (client setting).
 */
import {MODULE_ID, esc} from "./util.mjs";
import {describeAt} from "./place.mjs";
import * as D from "../../wodx-rules/chronicle/time-dial-rules.mjs";

const ID = "wodx-time-dial";
const shown = () => { try { return game.settings.get(MODULE_ID, "timeDial") !== false; } catch (e) { return true; } };

export function registerTimeDialSettings() {
  game.settings.register(MODULE_ID, "timeDial", {name: "Show the time dial", hint: "A small dial at the top of the screen: the sun by day and the moon by night, with the hour, date and season where your scene stands. Click it for the clock.",
    scope: "client", config: true, type: Boolean, default: true, onChange: () => drawDial()});
}

export function drawDial() {
  let el = document.getElementById(ID);
  if ( !shown() ) { el?.remove(); return; }
  let t;
  try { t = describeAt(globalThis.canvas?.scene ?? null, game.time.worldTime); } catch (e) { return; }
  const v = D.dialView(t ?? {});
  if ( !el ) {
    el = document.createElement("button");
    el.id = ID;
    el.type = "button";
    el.addEventListener("click", () => game.modules.get(MODULE_ID)?.api?.openClock?.());
    document.body.appendChild(el);
  }
  el.className = `wodx-time-dial${v.night ? " night" : ""}`;
  el.setAttribute("aria-label", v.title);
  el.dataset.tooltip = v.title;
  el.innerHTML = `<span class="wodx-dial-face"><span class="wodx-dial-hand" style="transform: rotate(${v.angle}deg)"><i class="fa-solid ${v.icon}" aria-hidden="true"></i></span></span><span class="wodx-dial-text"><span class="wodx-dial-time">${esc(v.label)}</span><span class="wodx-dial-date">${esc(v.date)}</span></span>`;
}

export function installTimeDial() {
  // Never let the dial stop WoDX Chronicle's start: a failed draw is logged and skipped
  const safe = () => { try { drawDial(); } catch (e) { console.warn(`${MODULE_ID} | time dial`, e); } };
  Hooks.on("updateWorldTime", safe);
  Hooks.on("canvasReady", safe);
  safe();
}
