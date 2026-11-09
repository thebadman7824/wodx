/**
 * WoDX Otherworlds 0.7.0: a Gauntlet that moves. The rules are in drift-rules.mjs.
 * Scene flag wodx-otherworlds.drift {value, log}. placeOf() adds it to the Gauntlet. A supernatural desecration or
 * fire on the map (wodxMapEvent) proposes +1 through the approval queue; the Storyteller moves the rest by hand.
 */
import * as D from "./drift-rules.mjs";
import {MODULE_ID} from "./ratings.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

export const T_DRIFT = `${MODULE_ID}.drift`;
const NOT_A_PLACE = /battle ?map|\bcombat\b|\btest\b|\(gate/i;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);

export const driftOf = scene => D.normDrift(scene?.flags?.[MODULE_ID]?.drift ?? {});

export async function stepDrift(scene, kind, why = "") {
  if ( !game.user.isGM || !scene ) return null;
  const r = D.addDrift(driftOf(scene), kind, {at: game.time.worldTime, why});
  if ( r.changed ) await scene.update({[`flags.${MODULE_ID}.drift`]: {value: r.value, banality: r.banality, log: r.log}});
  return r;
}

export async function undoStep(scene) {
  if ( !game.user.isGM || !scene ) return null;
  const r = D.undoDrift(driftOf(scene));
  await scene.update({[`flags.${MODULE_ID}.drift`]: r});
  return r;
}

/** A desecration or fire with something uncanny about it thickens the Gauntlet there, once the Storyteller agrees. */
export async function onMapEvent(ev) {
  if ( !isActiveGM() || ev?.undone || !ev?.supernatural || !["desecrate", "fire"].includes(ev?.kind) ) return null;
  const scene = game.scenes.get(ev.scene);
  if ( !scene ) return null;
  const day = Math.floor((Number(ev.at) || game.time.worldTime) / 86400);
  return chron()?.approvals?.propose?.({type: T_DRIFT, key: `drift:${scene.id}:${day}`,
    title: `The Gauntlet thickens at ${scene.navName || scene.name}`,
    detail: `${ev.whoName ?? "Someone"} ${ev.kind === "fire" ? "set an uncanny fire" : "desecrated"} ${ev.objectName ?? "the place"}. Drift +1 (house rule).`,
    data: {sceneId: scene.id, kind: "taint", why: `${ev.kind}: ${ev.objectName ?? ""}`}});
}

export function registerDriftHandler() {
  chron()?.approvals?.registerHandler?.(T_DRIFT, {label: "A Gauntlet that moves (taint on the map)",
    approve: async e => { const s = game.scenes.get(e.data?.sceneId); if ( s ) await stepDrift(s, e.data.kind ?? "taint", e.data.why ?? ""); }});
}

/** The Storyteller's window: each place's drift, a step to take, and the last step to undo. */
export async function driftDialog() {
  if ( !game.user.isGM ) return;
  const scenes = game.scenes.filter(s => !NOT_A_PLACE.test(s.name ?? ""));
  const kinds = `<option value="">No change</option>${Object.entries(D.DRIFT_KINDS).map(([k, v]) => `<option value="${k}">${esc(v.label)} (${v.step > 0 ? "+" : ""}${v.step})</option>`).join("")}<option value="undo">Undo the last step</option>`;
  const rows = scenes.map(s => { const d = driftOf(s), last = d.log.at(-1);
    return `<tr><td>${esc(s.navName || s.name)}</td><td>${d.value > 0 ? "+" : ""}${d.value}${d.banality ? ` (Banality ${d.banality > 0 ? "+" : ""}${d.banality})` : ""}</td><td>${last ? esc(D.DRIFT_KINDS[last.kind]?.label ?? last.kind) : ""}</td><td><select name="${s.id}" data-fixed>${kinds}</select></td></tr>`; }).join("");
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 640}, window: {title: "The Gauntlet over time"}, classes: ["wodx-dialog", "wow-drift"],
    content: `${scenes.length > 5 ? searchBox("table.wow-drift-t", "Search places…", "Search places") : ""}<div class="wow-scroll"><table class="wow-drift-t"><thead><tr><th>Place</th><th>Drift</th><th>Last</th><th>Step</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="hint">The era's chart sets each kind of place. Drift is a house rule on top: one a step, between −3 and +3. Taint and the Weaver thicken the Gauntlet; rites and the Wyld thin it. Banality moves on its own track, only where the place has a Banality rating.</p>`,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "cancel", label: "Cancel"}]});
  if ( !res ) return;
  for ( const s of scenes ) {
    const k = res[s.id];
    if ( k === "undo" ) await undoStep(s);
    else if ( k ) await stepDrift(s, k, "by the Storyteller");
  }
}
