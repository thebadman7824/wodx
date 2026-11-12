/**
 * How much runs by itself (WoDX Chronicle 0.46.0, B2450-B2451). One world setting picks a level; moving to a level
 * sets the other modules' Auto choices and the approval queue's standing rules at once (automation-rules.mjs). The
 * values from before the first move are kept in "automationBase" and Hands on puts them back, except where a setting
 * was changed by hand since. The level is picked in the approval queue window, which lists what will change first.
 *
 *   setting wodx-chronicle.automationLevel  "handsOn" | "balanced" | "handsOff"
 *   setting wodx-chronicle.automationBase   {at, values, set, auto}  the way back
 *
 * While the Lone Chronicle (WoDX Solo) is on, the level is left alone: the solo switch already sets everything.
 * Runs on the active Storyteller's client only.
 */
import {MODULE_ID, esc, isActiveGM, setting, setSetting} from "./util.mjs";
import * as AR from "./automation-rules.mjs";
import * as approvals from "./approvals.mjs";

const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const soloOn = () => { try { return game.modules.get("wodx-solo")?.active && game.settings.get("wodx-solo", "on") === true; } catch (e) { return false; } };

/** A setting's present value, or undefined when its module is off or the setting is not registered. */
export function read(mod, key) {
  if ( !game.modules.get(mod)?.active || !game.settings.settings.has(`${mod}.${key}`) ) return undefined;
  try { return game.settings.get(mod, key); } catch (e) { return undefined; }
}

export const level = () => { try { return setting("automationLevel") ?? "handsOn"; } catch (e) { return "handsOn"; } };

/** What a move to this level would change, without changing anything. */
export function preview(to) {
  return AR.planLevel(to, read, {base: setting("automationBase") ?? {}, types: approvals.types(), autoNow: setting("autoApprove") ?? {}});
}

let busy = false;
/** Move to a level: set every change, store the base and the standing rules, and tell the Storytellers what moved. */
export async function setLevel(to) {
  if ( !isActiveGM() || busy ) return null;
  if ( !AR.LEVELS.includes(to) ) return null;
  if ( soloOn() ) { ui.notifications.warn("The Lone Chronicle is on and sets everything itself. Turn it off first."); return null; }
  busy = true;
  try {
    const autoBefore = foundry.utils.deepClone(setting("autoApprove") ?? {});
    const plan = preview(to);
    for ( const c of plan.changes ) {
      try { await game.settings.set(c.mod, c.key, c.to); } catch (e) { console.warn(`WoDX | level: ${c.mod}.${c.key}`, e); }
    }
    await setSetting("automationBase", plan.base);
    await setSetting("autoApprove", plan.auto);
    if ( level() !== to ) await setSetting("automationLevel", to);
    const q = AR.queueDiff(autoBefore, plan.auto);
    const rows = plan.changes.map(c => `<li>${esc(c.what)}</li>`).join("");
    const kept = plan.kept.length ? `<p class="wodx-quiet">Left as you changed them by hand: ${esc(plan.kept.map(k => `${k.mod} ${k.key}`).join(", "))}.</p>` : "";
    const miss = plan.missing.length ? `<p class="wodx-quiet">Not here, so left alone: ${esc(plan.missing.map(k => `${k.mod} ${k.key}`).join(", "))}.</p>` : "";
    await ChatMessage.create({whisper: gmIds(), speaker: {alias: "WoDX"}, flags: {[MODULE_ID]: {automationLevel: to}},
      content: `<div class="wodx-card"><p><b>${esc(AR.LEVEL_LABELS[to])}</b></p>${rows ? `<ul>${rows}</ul>` : "<p>No setting needed changing.</p>"}`
        + `<p>Approval queue: ${q.on.length} kinds now pass on their own, ${q.small.length} pass when small, ${q.off.length} wait again.</p>${kept}${miss}</div>`});
    approvals.ApprovalsApp.refresh();
    return plan;
  } finally { busy = false; }
}

/** The picker in the approval queue window. */
function picker() {
  if ( !game.user.isGM ) return "";
  const now = level();
  const opts = AR.LEVELS.map(l => `<option value="${l}"${l === now ? " selected" : ""}>${esc(AR.LEVEL_LABELS[l])}</option>`).join("");
  const solo = soloOn() ? `<p class="wodx-quiet">The Lone Chronicle is on and sets everything itself.</p>` : "";
  return `<div class="form-group wodx-level-row"><label for="wodx-level">How much runs by itself</label>
    <select id="wodx-level" class="wodx-level" data-fixed${soloOn() ? " disabled" : ""}>${opts}</select>
    <button type="button" class="wodx-level-go"${soloOn() ? " disabled" : ""}>Review and set</button></div>${solo}`;
}

/** Show what a move would change, then make it on Set. */
async function choose(to) {
  if ( !game.user.isGM ) return;
  if ( !isActiveGM() ) { ui.notifications.warn("Only the active Storyteller can change this."); return; }
  const plan = preview(to);
  const q = AR.queueDiff(setting("autoApprove") ?? {}, plan.auto);
  const rows = plan.changes.map(c => `<li>${esc(c.what)}</li>`).join("") || "<li>No setting changes.</li>";
  const kept = plan.kept.length ? `<p class="wodx-quiet">Changed by hand since, so left alone: ${esc(plan.kept.map(k => `${k.mod} ${k.key}`).join(", "))}.</p>` : "";
  const {DialogV2} = foundry.applications.api;
  const ok = await DialogV2.confirm({classes: ["wodx", "wodx-dialog"], window: {title: AR.LEVEL_LABELS[to]},
    content: `<p>This will change:</p><ul class="wodx-list" data-fixed>${rows}</ul>
      <p>Approval queue: ${q.on.length} kinds pass on their own, ${q.small.length} when small, ${q.off.length} wait again.</p>${kept}`,
    yes: {label: "Set"}, no: {label: "Keep as it is"}, rejectClose: false});
  if ( ok ) await setLevel(to);
}

export function registerAutomationSettings() {
  game.settings.register(MODULE_ID, "automationLevel", {scope: "world", config: false, type: String, default: "handsOn"});
  game.settings.register(MODULE_ID, "automationBase", {scope: "world", config: false, type: Object, default: {}});
}

export function initAutomation() {
  approvals.setLevelUI(picker, choose);
}
