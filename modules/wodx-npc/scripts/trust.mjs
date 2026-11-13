/**
 * WoDX NPC 0.57.0: trust, betrayal, boons in every line, blackmail and hidden loyalties, the Foundry side
 * (B2810-B2816). The rules are in trust-rules.mjs.
 *
 *   trust     on the one who trusts, flags["wodx-npc"].trust; a Ledger boon paid or refused moves it for the one
 *             it was owed to (Storyteller's wodxBoonSettled); answering blackmail and betrayals move it too
 *   betray    one call records a betrayal: trust and attitude fall, a rumour starts, a bonded betrayer is told to
 *             roll Willpower first, and a wronged NPC's revenge goes in the Ledger as a consequence due in a week
 *   boons     a boon can change hands; each line has its own word for a debt of honour and what defaulting costs
 *   blackmail a found secret held over someone: a Ledger debt due each month, the proof of the era, and the
 *             victim's answer (pay, strike back, confess first); the hold is kept on the victim,
 *             flags["wodx-npc"].blackmail {entryId: {by, secret, amount}}
 *   sides     a hidden loyalty, flags["wodx-npc"].trueSide; it is a secret tie to the faction's leader, and the
 *             powers that can find it are listed for the Storyteller
 */
import * as TRR from "./trust-rules.mjs";
import {getEngine} from "../../wodx-chronicle/scripts/calendar.mjs";

const MOD = "wodx-npc";
const DAY = 86400;
const st = () => (game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api : null);
const api = () => game.modules.get(MOD).api;
const isActiveGM = () => game.user?.isGM && game.users.activeGM?.id === game.user.id;
const actorOf = x => (x?.actor ?? (typeof x === "string" ? game.actors.get(x) : x?.id ? game.actors.get(x.id) ?? x : null));
const yearNow = () => getEngine().timeToDate(Number(game.time.worldTime) || 0).year;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));

/* ---- Trust ---- */
export const trustOf = (who, other) => { const a = actorOf(who), o = actorOf(other); return TRR.normTrust(a?.flags?.[MOD]?.trust)[o?.id ?? other]?.value ?? 0; };
export async function moveTrust(who, other, event, why = "") {
  const a = actorOf(who), o = actorOf(other);
  if ( !game.user.isGM || !a || !(o?.id ?? other) ) return null;
  const t = TRR.moveTrust(a.flags?.[MOD]?.trust, o?.id ?? other, event, {at: game.time.worldTime, why});
  await a.setFlag(MOD, "trust", t);
  return t[o?.id ?? other];
}
async function onSettled({entry, status} = {}) {
  if ( !isActiveGM() || !entry?.from?.id || !entry?.to?.id ) return;
  const ev = TRR.ledgerEvent(entry, status);
  // The one owed decides how far to trust the one who owed
  if ( ev ) await moveTrust(entry.to.id, entry.from.id, ev, entry.what ?? "");
}

/* ---- Betrayal ---- */
export async function betray(byLike, ofLike, {kind = "other", what = ""} = {}) {
  const by = actorOf(byLike), of = actorOf(ofLike);
  if ( !game.user.isGM || !by || !of ) return null;
  const step = api()?.bonds?.stepToward?.(by, of) ?? 0;
  const b = TRR.betrayal({kind, step, victimIsNpc: !of.hasPlayerOwner, betrayer: by.name, victim: of.name});
  const log = foundry.utils.deepClone(of.flags?.[MOD]?.betrayals ?? []);
  log.push({by: by.id, byName: by.name, kind, what: String(what).slice(0, 200), at: game.time.worldTime});
  await of.setFlag(MOD, "betrayals", log.slice(-20));
  await moveTrust(of, by, "betrayed", what || b.label);
  // Attitude is an NPC's toward a character
  if ( !of.hasPlayerOwner ) { try { await api()?.attitude?.apply?.(of, by, {delta: b.attitude, why: b.label}); } catch (e) { /* attitude may be off */ } }
  try { await st()?.rumours?.start?.({text: b.rumour, tellers: [of.id]}); } catch (e) { /* rumours may be off */ }
  if ( b.revenge ) {
    try {
      await st()?.ledger?.save?.({kind: "consequence", what: `${of.name} means to pay ${by.name} back for the betrayal (${b.label.toLowerCase()})`,
        from: {id: of.id, name: of.name}, to: {id: by.id, name: by.name}, due: game.time.worldTime + 7 * DAY, notes: "WoDX NPC: revenge after a betrayal"});
    } catch (e) { /* the Ledger may be off */ }
  }
  const users = game.users.filter(u => u.isGM || by.testUserPermission?.(u, "OWNER")).map(u => u.id);
  await ChatMessage.create({whisper: users, speaker: {alias: by.name}, flags: {[MOD]: {betrayal: true}},
    content: `<div class="vta-card wodx-x wnpc"><div class="vta-body"><p><b>${esc(by.name)} betrays ${esc(of.name)}</b>: ${esc(b.label.toLowerCase())}${what ? `, ${esc(what)}` : ""}.</p>${b.needsWillpower ? `<p>Bound by blood to ${esc(of.name)}: a Willpower roll first, or it is not done.</p>` : ""}<p class="wodx-quiet">Trust falls, word gets round${b.revenge ? ", and they plan to pay it back (Ledger, due in a week)" : ""}.</p></div></div>`});
  return b;
}

/* ---- Boons ---- */
export function debtWord(actorLike) {
  const a = actorOf(actorLike);
  const t = String(a?.type ?? "").toLowerCase();
  const line = t === "vampire" ? "vampire" : t === "werewolf" ? "werewolf" : t === "mage" ? "mage" : t.startsWith("changel") ? "changeling" : t === "wraith" ? "wraith"
    : t === "hunter" ? "hunter" : t === "mummy" ? "mummy" : t === "demon" ? "demon" : /kuei|cathayan/.test(t) ? "kueijin" : "mortal";
  return TRR.debtWordFor(line);
}
export async function tradeBoon(entryId, newHolderLike) {
  const h = actorOf(newHolderLike), L = st()?.ledger?.state?.();
  const e = L?.entries?.find(x => x.id === entryId);
  const next = e && h ? TRR.tradeBoon(e, {id: h.id, name: h.name}) : null;
  if ( !game.user.isGM || !next ) return null;
  await st().ledger.save(next);
  return next;
}

/* ---- Blackmail ---- */
export async function blackmail(byLike, ofLike, secretId, {price = null} = {}) {
  const by = actorOf(byLike), of = actorOf(ofLike);
  if ( !game.user.isGM || !by || !of ) return null;
  const s = (api()?.secrets?.of?.(of) ?? []).find(x => x.id === secretId);
  if ( !s ) return null;
  const res = Number(of.items?.find?.(i => /^resources$/i.test(i.name))?.system?.value) || 1;
  const amount = Number(price) || TRR.blackmailPrice(s.weight, res);
  const proof = TRR.proofFor(yearNow());
  const entry = await st()?.ledger?.save?.({kind: "debt", what: `Silence about "${s.text}": ${amount} a month to ${by.name}`, from: {id: of.id, name: of.name}, to: {id: by.id, name: by.name},
    due: game.time.worldTime + 30 * DAY, notes: `Blackmail. Proof: ${proof.proof}; ${proof.keep}.`});
  if ( entry?.id ) await of.update({[`flags.${MOD}.blackmail.${entry.id}`]: {by: by.id, secret: s.id, amount}});
  await moveTrust(of, by, "blackmailed", s.text);
  return {entry, amount, proof};
}
/** The victim's answer: pay (money moves, the next month's debt opens), strike back, or confess first. */
export async function answerBlackmail(entryId, how = "pay") {
  const L = st()?.ledger?.state?.();
  const e = L?.entries?.find(x => x.id === entryId);
  if ( !game.user.isGM || !e ) return null;
  const of = game.actors.get(e.from?.id), by = game.actors.get(e.to?.id);
  const hold = of?.flags?.[MOD]?.blackmail?.[e.id];
  if ( !of || !hold ) return null;
  await of.update({[`flags.${MOD}.blackmail.-=${e.id}`]: null});
  if ( how === "pay" ) {
    const amount = Number(hold.amount) || 0;
    if ( by && amount ) await st().upkeep?.money?.transfer?.(of, by, amount, {note: "Blackmail"});
    await st().ledger.status(e.id, "kept");
    const next = await st().ledger.save({...e, id: undefined, status: "open", announced: false, due: (Number(e.due) || game.time.worldTime) + 30 * DAY, history: []});
    if ( next?.id ) await of.update({[`flags.${MOD}.blackmail.${next.id}`]: hold});
  } else if ( how === "confess" ) {
    try { await api()?.secrets?.expose?.(of, hold.secret, {by: of.id, why: "what they confessed"}); } catch (er) { /* secrets may differ */ }
    await st().ledger.status(e.id, "void");
  } else {
    await st().ledger.status(e.id, "void");
    if ( of && by ) await st()?.ledger?.save?.({kind: "consequence", what: `${of.name} strikes back at ${by.name} over the blackmail`, from: {id: of.id, name: of.name}, to: {id: by.id, name: by.name}, due: game.time.worldTime + 7 * DAY});
  }
  return TRR.RESPONSES[how] ?? null;
}

/* ---- Hidden loyalties ---- */
export const sideOf = actorLike => TRR.normSide(actorOf(actorLike)?.flags?.[MOD]?.trueSide);
export async function setSide(actorLike, side) {
  const a = actorOf(actorLike);
  if ( !game.user.isGM || !a ) return null;
  if ( !side ) { await a.unsetFlag(MOD, "trueSide"); return null; }
  const s = TRR.normSide({...side, since: side.since ?? game.time.worldTime});
  await a.setFlag(MOD, "trueSide", s);
  return s;
}
/** Who can find it out, and how: the powers of the viewer's line, with roll and difficulty, for the Storyteller. */
export function howToFind(viewerLike) {
  const v = actorOf(viewerLike);
  const t = String(v?.type ?? "mortal").toLowerCase();
  return TRR.sensesFor(t.startsWith("changel") ? "changeling" : t);
}
export async function foundSide(actorLike, finderLike) {
  const a = actorOf(actorLike), f = actorOf(finderLike);
  const s = sideOf(a);
  if ( !game.user.isGM || !s || !f ) return null;
  s.found[f.id] = game.time.worldTime;
  await a.setFlag(MOD, "trueSide", s);
  return s;
}

export function listen() {
  Hooks.on("wodxBoonSettled", p => { onSettled(p).catch(e => console.error(`${MOD} | trust`, e)); });
}
export const rules = TRR;
