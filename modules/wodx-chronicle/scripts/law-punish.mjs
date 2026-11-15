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
import {declareWanted} from "./law-heat.mjs";
import {applyTimed} from "./timed.mjs";

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
  if ( !punish ) { await ChatMessage.create({speaker: {alias: "The court"}, content: `<div class="wodx-card"><p>The court shows ${esc(info.name)} mercy.</p></div>`}); Hooks.callAll("wodxSentence", {actor: info.actorId, region: info.region, mark: null, mercy: true}); return null; }
  const mark = P.markFor(punish, {year: info.year, region: info.region, weight: info.weight, id: foundry.utils.randomID()});
  if ( actor ) await actor.setFlag(MODULE_ID, "lawMarks", [...marksOf(actor), mark].slice(-30));
  const extra = actor ? await carryOut(actor, mark, info) : "";
  await ChatMessage.create({speaker: {alias: "The court"}, content: `<div class="wodx-card wodx-law-sentence"><h3>${esc(info.name)}: ${esc(mark.words)}</h3></div>`});
  if ( extra ) await ChatMessage.create({speaker: {alias: "The court"}, whisper: gmIds(), content: `<div class="wodx-card"><p class="hint">${esc(extra.trim())}</p></div>`});
  Hooks.callAll("wodxSentence", {actor: info.actorId, region: info.region, mark});
  return mark;
}

/**
 * B5823: the sentence happens. A fine is taken from the purse at once (a month of a modest living for light deeds, more
 * for graver ones; on credit when short: a house reading, the books give no sums for every land and age); outlawry and
 * banishment put the character at Wanted in that land; a death sentence holds the condemned (Held for the scene) until
 * the Storyteller plays it out. Returns the Storyteller's line.
 */
async function carryOut(actor, mark, info) {
  if ( mark.kind === "fine" ) {
    const M = game.modules.get("wodx-storyteller")?.api?.upkeep?.money;
    if ( !M?.pay || !M?.rules?.allowance ) return "Take it from the purse with the money window (WoDX Storyteller's money is off).";
    let region = "moravian"; try { region = game.settings.get("wodx-storyteller", "moneyRegion") || region; } catch (e) { /* default */ }
    const amount = P.fineAmount(M.rules.allowance(2, info.year, region), info.weight);
    const r = await M.pay(actor, amount, {credit: true, note: `Fined by the court (${info.region})`});
    const text = M.rules.formatMoney ? M.rules.formatMoney(amount, M.rules.moneyFor?.(info.year, region)) : String(amount);
    return r?.ok === false ? `The fine of ${text} could not be taken: the purse is ${r?.text ?? "too"} short, even on credit.` : `The fine of ${text} is taken from the purse.`;
  }
  if ( mark.kind === "outlaw" || mark.kind === "banished" ) {
    const w = await declareWanted(actor, info.region, mark.words);
    return w ? "A warrant is out in this land: the watch will come." : "";
  }
  if ( mark.kind === "death" ) {
    await applyTimed(actor, {name: "Held for sentence", description: "Held by the court until the sentence is carried out", duration: {kind: "scene"}, condition: "held", key: "wodx-law-held", source: "WoDX Chronicle law"});
    // B5992: the law comes for the condemned where they are (WoDX Storyteller's raid)
    const R = game.modules.get("wodx-storyteller")?.api?.reach;
    try { await R?.lawCome?.({actorId: actor.id, region: info.region, mode: "arrest", why: "a death sentence"}); } catch (e) { console.warn("WoDX | law comes", e); }
    return R?.lawCome ? "The condemned is held, and the law comes to take them to the sentence." : "The condemned is held (Held for the scene) until you play the sentence out.";
  }
  if ( mark.kind === "time" && mark.until ) return (await sendAway(actor, mark)) ? `Taken away to serve the sentence until ${mark.until}: the character's tokens leave the map until then.` : "";
  if ( mark.kind === "brand" ) { await brand(actor, true); return "The brand shows on the character's token for all to see."; }
  return "";
}

/* B5990: time served takes the character off the map until the year it ends; the clock brings them back. */
async function sendAway(actor, mark) {
  const hidden = [];
  for ( const sc of game.scenes ) {
    const ids = sc.tokens.filter(t => t.actorId === actor.id && !t.hidden).map(t => t.id);
    if ( ids.length ) { await sc.updateEmbeddedDocuments("Token", ids.map(_id => ({_id, hidden: true}))); hidden.push({scene: sc.id, ids}); }
  }
  await actor.setFlag(MODULE_ID, "lawAway", {until: mark.until, mark: mark.id, region: mark.region, hidden});
  return true;
}
async function comeBack(actor, why = "The sentence is served") {
  const away = actor.getFlag(MODULE_ID, "lawAway");
  if ( !away ) return false;
  for ( const h of away.hidden ?? [] ) {
    const sc = game.scenes.get(h.scene);
    const ids = (h.ids ?? []).filter(id => sc?.tokens.get(id));
    if ( sc && ids.length ) await sc.updateEmbeddedDocuments("Token", ids.map(_id => ({_id, hidden: false})));
  }
  await actor.unsetFlag(MODULE_ID, "lawAway");
  await ChatMessage.create({speaker: {alias: "The court"}, content: `<div class="wodx-card wodx-law-sentence"><p>${esc(why)}: ${esc(actor.name)} is free again.</p></div>`});
  return true;
}
/** B5990: at each move of the clock, those whose time is up come back. */
export async function releaseServed(year = yearNow()) {
  if ( !isActiveGM() ) return [];
  const out = [];
  for ( const a of game.actors ) { const w = a.getFlag?.(MODULE_ID, "lawAway"); if ( w && P.servedBy(w, year) && await comeBack(a) ) out.push(a.id); }
  return out;
}

/* B5991: a brand is a lasting mark on the token (a status everyone sees) until pardoned. */
function ensureBrand() {
  const C = game.modules.get(MODULE_ID)?.api;
  if ( C?.registerCondition && !C?.conditions?.getCondition?.("branded") ) C.registerCondition({id: "branded", name: "Branded", img: "icons/svg/fire.svg",
    source: "WoDX Chronicle law", summary: "Bears the court's brand: anyone who sees the face or hand sees it, and social rolls are at +1 difficulty (B6029).", mods: {socialDiff: 1}});
}
async function brand(actor, on) {
  ensureBrand();
  try { await actor.toggleStatusEffect?.("wodx-branded", {active: on}); } catch (e) { console.warn("WoDX | brand", e); }
}

/** Pardon a mark (the Storyteller). */
export async function pardon(actor, markId) {
  if ( !game.user.isGM || !actor ) return null;
  const m0 = marksOf(actor).find(m => m.id === markId);
  await actor.setFlag(MODULE_ID, "lawMarks", marksOf(actor).map(m => (m.id === markId ? {...m, pardoned: true} : m)));
  // B5990-B5991: a pardon brings the prisoner back and takes the brand's mark off the token
  if ( m0?.kind === "time" && actor.getFlag(MODULE_ID, "lawAway")?.mark === markId ) await comeBack(actor, "Pardoned");
  if ( m0?.kind === "brand" && !marksOf(actor).some(m => m.kind === "brand" && !m.pardoned) ) await brand(actor, false);
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
  Hooks.on("updateWorldTime", () => { releaseServed().catch(e => console.error("WoDX | sentence served", e)); });
  Hooks.once("ready", () => { ensureBrand(); releaseServed().catch(() => null); });
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
