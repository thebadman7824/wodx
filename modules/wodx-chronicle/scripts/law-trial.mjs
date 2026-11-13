/**
 * WoDX Chronicle: trials in the world (B3608-B3609). The rules are in law-trial-rules.mjs.
 *   Arrest   on wodxArrest (law-heat.mjs), the Storyteller gets a card with the forms of trial the land allows
 *   Trial    one button per form; the roll goes through WoDX Storyteller's call for a roll (open to the table), with
 *            the defendant's court seat (WoDX Storyteller institutions) and any bribe counted
 *   Verdict  read from the call's answer; posted, and passed on as wodxVerdict {actor, region, guilty, deeds, form, year}
 *            for the sentence (B3610). Trial by combat is fought with WoDX Combat and the Storyteller records who won.
 */
import {MODULE_ID, esc, isActiveGM} from "./util.mjs";
import {currentYear} from "./eras.mjs";
import * as L from "./law-rules.mjs";
import * as T from "./law-trial-rules.mjs";

const yearNow = () => { try { return currentYear(); } catch (e) { return 1197; } };
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const st = () => game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api : null;
function actorLine(a) {
  const t = String(a?.type ?? "").toLowerCase(), v = String(a?.system?.settings?.variant ?? "").toLowerCase();
  if ( t === "mortal" && (v === "ghoul" || v === "revenant") ) return v;
  if ( t === "changing breed" || t === "changingbreed" ) return "werewolf";
  if ( t === "pc" ) return "vampire";
  return Object.keys(T.LINE_TRIAL).includes(t) ? t : "mortal";
}
/** The best court seat the defendant holds, or -1. */
function courtRank(actorId) {
  try { return Math.max(-1, ...(st()?.upkeep?.institutions?.seatsOf?.(actorId) ?? []).filter(s => s.kind === "court").map(s => s.rank)); } catch (e) { return -1; }
}

/** The trial card after an arrest. */
export async function trialCard({actor: actorId, name, region, deeds = [], year = yearNow()} = {}) {
  if ( !isActiveGM() ) return null;
  const law = L.lawOf(region, year), forms = T.formsFor(law);
  const key = foundry.utils.randomID();
  const btn = f => `<button type="button" data-action="wodx-law-try" data-key="${key}" data-form="${f}">${esc(T.FORMS[f].label)}</button>`;
  return ChatMessage.create({speaker: {alias: "The law"}, whisper: gmIds(), flags: {[MODULE_ID]: {lawTrial: {key, actorId, name, region, deeds, year}}},
    content: `<div class="wodx-card wodx-law-trial"><h3>${esc(name)} before the court</h3><p>${esc(law.courts?.[0] ?? "The court")} hears the case: ${esc(deeds.map(d => d.deed).join(", ") || "a crime")}.</p>
      <p class="hint">${esc(T.FORMS[forms[0]].note)}</p>${forms.map(btn).join(" ")}</div>`});
}

/** Hold the trial in one form. */
export async function hold(info, form) {
  if ( !game.user.isGM ) return null;
  const actor = game.actors.get(info.actorId);
  const law = L.lawOf(info.region, info.year);
  const bribe = await foundry.applications.api.DialogV2.wait({rejectClose: false, window: {title: "A bribe?"}, classes: ["wodx-dialog"],
    content: `<p>${esc(L.BRIBE_WORDS?.[law.bribe] ?? "Officials here can be bought.")} Was a bribe paid to the court?</p>`,
    buttons: [{action: "yes", label: "A bribe was paid"}, {action: "no", label: "No bribe", default: true}]});
  const t = T.trialRequest(law, {form, actorId: info.actorId, name: info.name, witnesses: Math.min(4, info.deeds.length), bribed: bribe === "yes", courtRank: courtRank(info.actorId),
    line: actorLine(actor), deeds: info.deeds.length});
  if ( t.combat ) {
    return ChatMessage.create({speaker: {alias: "The law"}, whisper: gmIds(), flags: {[MODULE_ID]: {lawTrial: {...info, form}}},
      content: `<div class="wodx-card wodx-law-trial"><h3>${esc(t.label)}</h3><p>${esc(t.notes.join(" "))}</p>
        <button type="button" data-action="wodx-law-combat" data-won="1">The accused won</button> <button type="button" data-action="wodx-law-combat" data-won="0">The accused lost</button></div>`});
  }
  const call = st()?.hand?.call;
  if ( !call || !actor ) { ui.notifications?.warn?.("The trial needs WoDX Storyteller's call for a roll and the accused's sheet."); return null; }
  const msg = await call(t.request);
  const answer = msg?.flags?.["wodx-storyteller"]?.call?.answers?.[0];
  return verdict(info, form, T.verdictOf(answer, form), t.notes);
}

async function verdict(info, form, v, notes = []) {
  if ( v.guilty == null ) return null;
  await ChatMessage.create({speaker: {alias: "The court"}, content: `<div class="wodx-card wodx-law-verdict"><h3>${esc(info.name)}: ${esc(v.words)}</h3></div>`});
  if ( notes.length ) await ChatMessage.create({speaker: {alias: "The law"}, whisper: gmIds(), content: `<div class="wodx-card"><p class="hint">${esc(notes.join(" "))}</p></div>`});
  Hooks.callAll("wodxVerdict", {actor: info.actorId, name: info.name, region: info.region, guilty: v.guilty, deeds: info.deeds, form, year: info.year});
  return v;
}

export function registerTrialHooks() {
  Hooks.on("wodxArrest", p => { trialCard(p).catch(e => console.error("WoDX | trial", e)); });
  Hooks.on("renderChatMessageHTML", (message, el) => {
    if ( !game.user.isGM ) return;
    const info = message.flags?.[MODULE_ID]?.lawTrial;
    if ( !info ) return;
    for ( const b of el.querySelectorAll?.("[data-action='wodx-law-try']") ?? [] ) b.addEventListener("click", () => { b.disabled = true; hold(info, b.dataset.form).catch(e => console.error("WoDX | trial", e)); });
    for ( const b of el.querySelectorAll?.("[data-action='wodx-law-combat']") ?? [] ) b.addEventListener("click", () => {
      for ( const x of el.querySelectorAll("[data-action='wodx-law-combat']") ) x.disabled = true;
      const won = b.dataset.won === "1";
      verdict(info, "combat", {guilty: !won, words: won ? "The accused's side stands: not guilty." : "The accused's side falls: guilty."}).catch(e => console.error("WoDX | trial", e));
    });
  });
}

export {T as rules};
