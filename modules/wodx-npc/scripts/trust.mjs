/**
 * WoDX NPC 0.57.0: trust, betrayal, boons in every line, blackmail and hidden loyalties, the Foundry side
 * (B2847-B2853). The rules are in trust-rules.mjs.
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
import * as TERMS from "../../wodx-chronicle/scripts/terms.mjs";
import {DAY} from "../../wodx-chronicle/scripts/terms.mjs";

/**
 * B6668: who a mortal sends to strike back: bandits while guns are not on the sheet, thugs once they are (the era
 * profile's firearms switch, else the year: from 1600).
 */
const strikerKey = () => {
  const e = game.modules.get("wodx-chronicle")?.api?.eras;
  let year = 1197, firearms;
  try { year = Number(e?.currentYear?.()) || 1197; firearms = e?.eraSwitch?.("firearms"); } catch (err) { /* the year stands */ }
  return TERMS.gunsOnSheet(firearms, year) ? "thug" : "bandit";
};

const MOD = "wodx-npc";
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
  // B3346: an NPC also remembers what was done
  if ( !a.hasPlayerOwner && o ) { try { await api()?.memory?.fromTrust?.(a, o, event, why); } catch (e) { /* memory may be off */ } }
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
  try { await st()?.rumours?.start?.({text: b.rumour, tellers: [of.id], source: of.id, about: by.id, truth: "true"}); } catch (e) { /* rumours may be off */ }
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
  const line = lineOfA(a); // B6310: the all-lines key, so a Kuei-jin owes face and a Fera honour
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
    // B4884: an NPC acts on the next faction turn; a player's character plays it out
    if ( of && by && !of.hasPlayerOwner ) await of.setFlag(MOD, "strikeBack", {at: by.id, since: game.time.worldTime});
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
  return TRR.sensesFor(lineOfA(v)); // B6310: a Kuei-jin has no Auspex; a Fera reads as the Garou do
}
export async function foundSide(actorLike, finderLike) {
  const a = actorOf(actorLike), f = actorOf(finderLike);
  const s = sideOf(a);
  if ( !game.user.isGM || !s || !f ) return null;
  s.found[f.id] = game.time.worldTime;
  await a.setFlag(MOD, "trueSide", s);
  return s;
}

/** B4884: on the faction turn, each blackmailed NPC who chose to strike back does it, by the means its traits give. */
const val = (a, path) => Number(foundry.utils.getProperty(a?.system ?? {}, path)) || 0;
const bgOf = (a, re) => Number([...(a?.items ?? [])].find(i => re.test(String(i.name ?? "")))?.system?.value) || 0;
const lineOfA = a => api()?.hearts?.lineOf?.(a) ?? "mortal";
export async function strikeBacks() {
  if ( !(game.user?.isGM && game.users.activeGM?.id === game.user.id) ) return [];
  const out = [];
  for ( const of of game.actors ) {
    const f = of.flags?.[MOD]?.strikeBack;
    if ( !f?.at ) continue;
    await of.unsetFlag(MOD, "strikeBack");
    const by = game.actors.get(f.at);
    if ( !by ) continue;
    const means = TRR.strikeMeans({fight: val(of, "abilities.brawl.value") + val(of, "abilities.melee.value") + val(of, "abilities.firearms.value"),
      retainers: bgOf(of, /^retainers?\b/i), mortal: lineOfA(of) === "mortal", byMonster: lineOfA(by) !== "mortal"});
    const S = st();
    let did = false;
    try {
      if ( means === "attack" ) {
        const w = S?.reach?.whereIs?.(by.id);
        if ( w?.scene ) did = !!(await S.reach.send({extras: [{key: strikerKey(), n: 2}], scene: w.scene, near: w.token, hostile: true, why: `${of.name} strikes back`, flag: {strike: of.id}}))?.length;
        if ( !did ) { await S?.ledger?.save?.({kind: "consequence", what: `${of.name}'s people are waiting for ${by.name}`, from: {id: of.id, name: of.name}, to: {id: by.id, name: by.name}, due: game.time.worldTime + DAY}); did = true; }
      } else if ( means === "hunters" ) {
        const reg = game.modules.get("wodx-chronicle")?.api?.world?.here?.(S?.reach?.whereIs?.(by.id)?.scene)?.id ?? "moravia";
        did = !!(await S?.hunters?.add?.(reg, "description", {why: `${of.name} told them about ${by.name}`, who: by, gain: 1}));
      } else did = !!(await S?.rumours?.start?.({text: `${by.name} is a blackmailer, and worse`, tellers: [of.id], about: by.id, source: of.id, truth: "true"}));
    } catch (e) { console.error(`${MOD} | strike back`, e); }
    // B5177: a mortal who strikes back by word also tells the law, so the blackmail becomes a named deed in the law's heat
    let heat = null;
    if ( means !== "attack" ) {
      try {
        const scene = S?.reach?.whereIs?.(by.id)?.scene ?? null;
        heat = await game.modules.get("wodx-chronicle")?.api?.law?.heat?.add?.(by, "extortion", {scene: scene ?? canvas?.scene, named: true, witnesses: 1});
      } catch (e) { console.error(`${MOD} | strike back heat`, e); }
    }
    const users = game.users.filter(u => u.isGM || by.testUserPermission?.(u, "OWNER")).map(u => u.id);
    await ChatMessage.create({whisper: users, speaker: {alias: of.name}, content: `<div class="vta-card wodx-x wnpc"><div class="vta-body"><p><b>${esc(of.name)} strikes back</b></p><p>Over the blackmail, ${esc(of.name)} ${TRR.STRIKE_WORDS[means]}.</p>${heat ? `<p>${esc(of.name)} also goes to the law: ${esc(by.name)} the law now looks into the blackmail.</p>` : ""}</div></div>`});
    out.push({of: of.id, by: by.id, means, did, heat: !!heat});
  }
  return out;
}
/* B6452: looking someone over rolls the viewer's line's sense for a hidden loyalty, on the viewer's own client */
const SOCK = `module.${MOD}`;
function haveOf(a) {
  const powers = {};
  for ( const i of a?.items ?? [] ) {
    const v = Number(i.system?.value) || (i.type === "Power" ? 1 : 0);
    const k = String(i.name ?? "").split(" (")[0].trim().toLowerCase();
    if ( k && v > (powers[k] ?? 0) ) powers[k] = v;
  }
  const sp = a?.system?.spheres ?? {};
  if ( Number(sp.mind?.value) ) powers.mind = Number(sp.mind.value);
  return {powers};
}
const traitOf = (a, k) => {
  const at = a?.system?.attributes?.[k];
  if ( at ) return Number(at.total ?? at.value) || 0;
  if ( k === "arete" ) return Number(a?.system?.advantages?.arete?.permanent ?? a?.system?.arete?.value) || 0;
  const ab = a?.system?.abilities?.[k];
  if ( ab?.value !== undefined ) return Number(ab.value) || 0;
  return Number([...(a?.items ?? [])].find(i => (i.type === "Ability" || i.type === "Trait") && i.name.trim().toLowerCase() === k)?.system?.value) || 0;
};
export async function seekSide(viewerLike, targetLike) {
  const v = actorOf(viewerLike), t = actorOf(targetLike);
  const side = sideOf(t);
  if ( !v || !t || !side || side.found?.[v.id] ) return null;
  const have = haveOf(v), sense = TRR.pickSense(howToFind(v), have);
  if ( !sense ) return null;
  const dice = TRR.senseParts(sense).reduce((n, k) => n + traitOf(v, k), 0);
  const diff = TRR.senseDifficulty(sense, {willpower: Number(t.system?.advantages?.willpower?.permanent) || 0, manipulation: traitOf(t, "manipulation"), subterfuge: traitOf(t, "subterfuge")}, have);
  if ( dice <= 0 ) return null;
  const roll = await new Roll(`${dice}d10`).evaluate();
  const faces = roll.dice?.[0]?.results?.map(x => x.result) ?? [];
  const succ = TERMS.successes(faces, diff).successes;
  const res = TRR.senseResult(sense, succ);
  const who = side.leader?.name || side.name || "someone";
  const text = res === "found" ? `${t.name} secretly serves ${who}${side.name && side.leader?.name ? ` (${side.name})` : ""}.` : res === "hint" ? `${t.name} is hiding who they truly serve.` : "Nothing more shows.";
  const owners = game.users.filter(u => v.testUserPermission?.(u, "OWNER")).map(u => u.id);
  await ChatMessage.create({whisper: [...new Set([...owners, ...game.users.filter(u => u.isGM).map(u => u.id)])], speaker: {alias: v.name}, rolls: [roll],
    content: `<div class="wodx-card"><h3>${esc(sense.power)}: ${esc(t.name)}</h3><p>${esc(sense.roll)} at ${diff}: ${succ} ${succ === 1 ? "success" : "successes"} (${esc(sense.book)}).</p><p>${esc(text)}</p></div>`});
  if ( res === "found" ) {
    if ( game.user.isGM ) await foundSide(t, v);
    else game.socket.emit(SOCK, {type: "trust.found", target: t.id, finder: v.id, userId: game.user.id});
  }
  return {sense: sense.power, successes: succ, result: res};
}

export function listen() {
  Hooks.on("wodxLookOver", p => {
    const v = p?.actor, t = p?.npc?.isToken ? (p.npc.baseActor ?? p.npc) : p?.npc;
    if ( !v || !t || !(v.isOwner) || !(Number(p.successes) > 0) ) return;
    seekSide(v, t).catch(e => console.error(`${MOD} | hidden loyalty`, e));
  });
  Hooks.once("ready", () => game.socket?.on?.(SOCK, m => {
    if ( m?.type !== "trust.found" || !isActiveGM() ) return;
    const u = game.users.get(m.userId), f = game.actors.get(m.finder);
    if ( u && f?.testUserPermission?.(u, "OWNER") ) foundSide(m.target, f).catch(e => console.error(`${MOD} | hidden loyalty`, e));
  }));
  Hooks.on("wodxFactionTurn", () => { strikeBacks().catch(e => console.error(`${MOD} | strike back`, e)); });
  Hooks.on("wodxBoonSettled", p => { onSettled(p).catch(e => console.error(`${MOD} | trust`, e)); });
}
export const rules = TRR;
