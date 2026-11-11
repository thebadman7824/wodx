/**
 * WoDX Sheets 0.8.0: the anachronism check in Foundry. When the clock jumps a year or more, or the era changes, the
 * Storyteller gets one card naming each player character's possessions that are out of their time now, with a
 * button to keep each one (an heirloom, a relic, a traveller's kit) so it is not raised again and the sheet stops
 * warning about it. World setting "Anachronism check": automatic (on, except in the Live world), on, or off.
 * The rules are in anachronism-rules.mjs.
 */
import * as AR from "./anachronism-rules.mjs";
import {MOD} from "./extras-rules.mjs";
import {look, loadGoods} from "./extras.mjs";

const LIVE_WORLDS = ["rothenstein-live"];
const isLive = () => LIVE_WORLDS.includes(game.world?.id) || !!game.world?.flags?.wodx?.liveWorld;
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const chron = () => game.modules.get("wodx-chronicle")?.api;
const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const now = () => {
  let era = null, year = 0;
  try { era = chron()?.eras?.activeEra?.()?.profile?.id ?? null; } catch (e) { /* Chronicle off */ }
  try { year = Number(chron()?.eras?.currentYear?.()) || 0; } catch (e) { /* Chronicle off */ }
  return {era, year};
};
const on = () => { try { return AR.isOn(game.settings.get(MOD, "anachronism"), isLive()); } catch (e) { return false; } };
const skipping = () => { try { return !!chron()?.isSkipping?.(); } catch (e) { return false; } };

/** The player characters the check reads. */
const characters = () => (game.actors?.contents ?? []).filter(a => a.hasPlayerOwner && a.type !== "Group");

/** What a jump from `before` to `after` puts out of its time, character by character. */
export async function scan(before, after = now(), actors = characters()) {
  await loadGoods();
  return actors.map(a => ({actor: a, items: AR.newlyOut([...a.items], look, before, after)})).filter(r => r.items.length);
}

/** Post the card for the Storyteller. Returns the message, or null when nothing is out of its time. */
export async function report(before, after = now(), actors = characters()) {
  const found = await scan(before, after, actors);
  if ( !found.length ) return null;
  const rows = found.map(({actor, items}) => `<li><b>${esc(actor.name)}</b><ul>${items.map(i =>
    `<li>${esc(i.name)}: ${esc(i.note)} <button type="button" data-wodx-keep="${esc(actor.id)}.${esc(i.id)}"><i class="fa-solid fa-box-archive"></i> Keep it</button></li>`).join("")}</ul></li>`).join("");
  const span = before?.year && after?.year ? `from ${before.year} to ${after.year}` : "into another age";
  const content = `<div class="wodx-anachronism"><h3><i class="fa-solid fa-hourglass-half"></i> Out of their time</h3>
    <p>The clock moved ${esc(span)}. These things do not belong to the year now. Keep the ones the characters still have (an heirloom, a relic, a traveller's kit); the rest are the players' to account for.</p>
    <ul>${rows}</ul></div>`;
  return ChatMessage.create({content, whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id), speaker: {alias: "WoDX Sheets"},
    flags: {[MOD]: {anachronism: {before, after}}}});
}

/** Mark an item as kept out of its time. */
export async function keep(actorId, itemId) {
  const item = game.actors?.get(actorId)?.items?.get(itemId);
  if ( !item || !game.user.isGM ) return false;
  await item.update({[`flags.${MOD}.keepOutOfEra`]: true});
  return true;
}

let timer = null;
/** Compare the clock with the last check and report what the jump changed. */
export async function check() {
  if ( !isActiveGM() || !on() || skipping() ) return null;
  const after = now();
  if ( !after.year && !after.era ) return null;
  const before = game.settings.get(MOD, "anachronismAt") ?? null;
  if ( !before?.year && !before?.era ) { await game.settings.set(MOD, "anachronismAt", after); return null; }
  if ( !AR.jumped(before, after) ) return null;
  await game.settings.set(MOD, "anachronismAt", after);
  return report(before, after);
}
const soon = () => { clearTimeout(timer); timer = setTimeout(() => check().catch(e => console.error("WoDX Sheets | anachronism", e)), 1500); };

export function setup() {
  game.settings.register(MOD, "anachronism", {
    name: "Anachronism check", hint: "When the clock jumps a year or more, or the era changes, tell the Storyteller which possessions of the player characters are out of their time. Automatic: on, except in the Live world.",
    scope: "world", config: true, type: String, default: "auto", choices: {auto: "Automatic", on: "On", off: "Off"}
  });
  game.settings.register(MOD, "anachronismAt", {scope: "world", config: false, type: Object, default: {}});
  Hooks.once("ready", () => { if ( isActiveGM() && on() ) soon(); });
  Hooks.on("updateWorldTime", () => { if ( game.user?.isGM ) soon(); });
  Hooks.on("wodxSkipEnd", () => { if ( game.user?.isGM ) soon(); });
  Hooks.on("renderChatMessageHTML", (msg, el) => {
    if ( !msg.flags?.[MOD]?.anachronism || !game.user.isGM ) return;
    for ( const b of el.querySelectorAll?.("[data-wodx-keep]") ?? [] ) b.addEventListener("click", async () => {
      const [a, i] = b.dataset.wodxKeep.split(".");
      if ( await keep(a, i) ) { b.disabled = true; b.textContent = "Kept"; }
    });
  });
}
