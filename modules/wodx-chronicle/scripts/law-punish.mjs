/**
 * WoDX Chronicle: sentences and their marks in the world (B3610-B3611). The rules are in law-punish-rules.mjs.
 *   Sentence  on a guilty wodxVerdict (law-trial.mjs), the Storyteller gets a card with the sentences the land allows
 *             for deeds that grave, and a line on what a sentence means to that kind of character
 *   Mark      the chosen sentence is kept on the character (flag wodx-chronicle.lawMarks) and told to the table
 *   Shown     the Law here card tells a player their own marks in force: outlawed or banished here, time to serve,
 *             a brand, a record
 * Fines are taken through the money window; time served and a death sentence are the Storyteller's to play out.
 */
import {MODULE_ID, esc, isActiveGM} from "./util.mjs";
import {currentYear} from "./eras.mjs";
import * as L from "./law-rules.mjs";
import * as P from "./law-punish-rules.mjs";
import {standingFor} from "./law-standing.mjs";

const yearNow = () => { try { return currentYear(); } catch (e) { return 1197; } };
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
function actorLine(a) {
  const t = String(a?.type ?? "").toLowerCase(), v = String(a?.system?.settings?.variant ?? "").toLowerCase();
  if ( t === "mortal" && (v === "ghoul" || v === "revenant") ) return v;
  if ( t === "changing breed" || t === "changingbreed" ) return "werewolf";
  if ( t === "pc" ) return "vampire";
  return Object.keys(P.LINE_PUNISH).includes(t) ? t : "mortal";
}
export const marksOf = actor => (actor?.getFlag?.(MODULE_ID, "lawMarks") ?? []).map(P.normMark);

/** The sentencing card after a guilty verdict. */
export async function sentenceCard({actor: actorId, name, region, deeds = [], year = yearNow()} = {}) {
  if ( !isActiveGM() ) return null;
  let shift = 0;
  try { shift = standingFor(game.actors.get(actorId), region, year).tierShift; } catch (e) { shift = 0; }
  const law = L.lawOf(region, year), {tier, list} = P.sentencesFor(law, deeds, {shift}), {weight} = P.tierOf(deeds);
  const hook = P.LINE_PUNISH[actorLine(game.actors.get(actorId))] ?? "";
  const btn = p => `<button type="button" data-action="wodx-law-sentence" data-punish="${esc(p)}">${esc(L.PUNISH[p] ?? p)}</button>`;
  return ChatMessage.create({speaker: {alias: "The court"}, whisper: gmIds(), flags: {[MODULE_ID]: {lawSentence: {actorId, name, region, year, weight}}},
    content: `<div class="wodx-card wodx-law-sentence"><h3>Sentence for ${esc(name)}</h3><p>Deeds this grave (${esc(tier)}) may draw:</p>${list.map(btn).join(" ")}
      ${hook ? `<p><em>${esc(hook)}</em></p>` : ""}<button type="button" data-action="wodx-law-sentence" data-punish="">Mercy: no sentence</button></div>`});
}

/** Pass a sentence: the mark goes on the character. punish "" is mercy. */
export async function sentence(info, punish) {
  if ( !game.user.isGM ) return null;
  const actor = game.actors.get(info.actorId);
  if ( !punish ) { await ChatMessage.create({speaker: {alias: "The court"}, content: `<div class="wodx-card"><p>The court shows ${esc(info.name)} mercy.</p></div>`}); return null; }
  const mark = P.markFor(punish, {year: info.year, region: info.region, weight: info.weight, id: foundry.utils.randomID()});
  if ( actor ) await actor.setFlag(MODULE_ID, "lawMarks", [...marksOf(actor), mark].slice(-30));
  const extra = mark.kind === "fine" ? " Take it from the purse with the money window." : mark.kind === "death" ? " The condemned is held for the sentence." : "";
  await ChatMessage.create({speaker: {alias: "The court"}, content: `<div class="wodx-card wodx-law-sentence"><h3>${esc(info.name)}: ${esc(mark.words)}</h3></div>`});
  if ( extra ) await ChatMessage.create({speaker: {alias: "The court"}, whisper: gmIds(), content: `<div class="wodx-card"><p class="hint">${esc(extra.trim())}</p></div>`});
  Hooks.callAll("wodxSentence", {actor: info.actorId, region: info.region, mark});
  return mark;
}

/** Pardon a mark (the Storyteller). */
export async function pardon(actor, markId) {
  if ( !game.user.isGM || !actor ) return null;
  await actor.setFlag(MODULE_ID, "lawMarks", marksOf(actor).map(m => (m.id === markId ? {...m, pardoned: true} : m)));
  return true;
}

/** The player's own lines for the Law here card. */
export function playerMarks(actor, region, year = yearNow()) {
  const s = P.standingHere(marksOf(actor), region, year), out = [];
  if ( s.outlaw ) out.push("You are outlawed here.");
  if ( s.banished ) out.push("You are banished from this land.");
  if ( s.condemned ) out.push("A death sentence stands against you here.");
  if ( s.serving ) out.push(`Your sentence runs until ${s.serving.until}.`);
  if ( s.branded ) out.push("You bear a brand.");
  if ( s.records && !s.serving ) out.push("The law has a record of you.");
  return out;
}

export function registerPunishHooks() {
  Hooks.on("wodxVerdict", p => { if ( p?.guilty ) sentenceCard(p).catch(e => console.error("WoDX | sentence", e)); });
  Hooks.on("renderChatMessageHTML", (message, el) => {
    if ( !game.user.isGM ) return;
    const info = message.flags?.[MODULE_ID]?.lawSentence;
    if ( !info ) return;
    for ( const b of el.querySelectorAll?.("[data-action='wodx-law-sentence']") ?? [] ) b.addEventListener("click", () => {
      for ( const x of el.querySelectorAll("[data-action='wodx-law-sentence']") ) x.disabled = true;
      sentence(info, b.dataset.punish).catch(e => console.error("WoDX | sentence", e));
    });
  });
}

export {P as rules};
