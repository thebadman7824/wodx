/**
 * WoDX NPC: servants and bonds for every line, the Foundry side (Servants and Bonds Desk, B5100-B5111). Rules in
 * servant-rules.mjs.
 *
 *   api.servants.records(actor)          every bond that has this actor serve someone (the one ledger, x1)
 *   api.servants.mastersOf(actor) / servantsOf(master)
 *   api.servants.bind(servant, master, kind, {step, data})   Storyteller: write or deepen a bond; a player's goes to
 *                                         the approval queue, and approving it makes the bond at once (x5)
 *   api.servants.unbind(servant, master, kind)
 *   api.servants.restrain(attacker, target)  before a blow: the bound servant rolls, and a failed roll stops it (x2)
 *   api.servants.orderWeight(npc, masterId) / warmFloor(npc, masterId)   what the bond does to orders and opinion (v4)
 *   api.servants.condition(master, subject)  a scene's Dominate Conditioning roll (v1)
 *   api.servants.socialRoll(subject, {group, agents, eased})  a stretch of Social Conditioning (m1)
 *   api.servants.flash(kind, fromToken, toToken)  the short look on the map when a bond forms (x3)
 *   api.servants.setRevenantMaster(familyKey, master)  a revenant family's master (v3)
 *
 * A master and the Storyteller see a faint ring on each servant's token, in the bond's colour; nobody else does.
 */
import * as SR from "./servant-rules.mjs";
import * as BONDS from "./bonds.mjs";
import * as TERMS from "../../wodx-chronicle/scripts/terms.mjs";
import {DAY} from "../../wodx-chronicle/scripts/terms.mjs";
// B6776: while the world is held (a flashback, a test that moves the clock) nothing here reacts to the clock
const heldClock = () => { try { return !!game.modules.get("wodx-chronicle")?.api?.isHeld?.(); } catch (e) { return false; } };

const MOD = "wodx-npc";
const SOCKET = `module.${MOD}`;
const T_BIND = "wodx-npc.bind";
const T_COND = "wodx-npc.condition";
const isActiveGM = () => game.user?.isGM && game.users.activeGM?.id === game.user.id;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const num = v => Number(v) || 0;
const actorOf = x => (x?.actor ?? (typeof x === "string" ? game.actors.get(x) : x?.id ? game.actors.get(x.id) ?? x : null));
const now = () => game.time?.worldTime ?? 0;
const chron = () => game.modules.get("wodx-chronicle")?.api;
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const ownersOf = a => game.users.filter(u => u.isGM || a?.testUserPermission?.(u, "OWNER")).map(u => u.id);
const lineOf = a => String(a?.type ?? "").toLowerCase().replace(/\s+/g, "-");
const fxLevel = () => { try { return game.settings.get("wodx-chronicle", "fxLevel") ?? "full"; } catch (e) { return "full"; } };

export function registerSettings() {
  game.settings.register(MOD, "servantRestraint", {scope: "world", config: true, type: Boolean, default: true,
    name: "Bonds hold back a blow", hint: "A servant bound to someone (a blood bond, full Conditioning, a chained Thrall, a fomor's master) rolls before striking them, and a failed roll stops the blow."});
  game.settings.register(MOD, "revenantMasters", {scope: "world", config: false, type: Object, default: {}});
}
const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };

/* ------------------------------------------------------------------ */
/*  Reading the ledger                                                  */
/* ------------------------------------------------------------------ */

const KIN_KINDS = new Set(["parent", "child", "sibling", "spouse", "kin"]);
const edges = () => { try { return game.modules.get(MOD).api?.ties?.edges?.() ?? []; } catch (e) { return []; } };
export const isKinfolk = a => !!(a?.flags?.world?.wodx?.kinfolk);
/** The revenant family a sheet belongs to, as a lower-case key. */
export const familyKeyOf = a => String(a?.flags?.["wodx-chronicle"]?.family ?? a?.flags?.["wodx-creation"]?.revenant?.family ?? a?.system?.custom?.family ?? "").trim().toLowerCase();

/** What the rules need beside the servant's flags. */
function ctxFor(a, {edgeList = null} = {}) {
  const ctx = {id: a.id, vinculum: {}, guanxi: {}, kinOf: [], revenantMaster: null};
  try { ctx.vinculum = BONDS.vinculum(); } catch (e) { ctx.vinculum = {}; }
  const es = edgeList ?? edges();
  const mine = es.filter(e => e.from === a.id && e.to?.id);
  // Guanxi toward each wu-mate (k1): worked out from the sheets
  if ( mine.some(e => e.kind === "wuOf") ) {
    const adv = a.system?.advantages ?? {};
    for ( const e of mine.filter(x => x.kind === "wuOf") ) {
      const m = game.actors.get(e.to.id);
      if ( m ) ctx.guanxi[m.id] = SR.guanxi({mateCharisma: m.system?.attributes?.charisma?.value, po: adv.po?.permanent, yin: adv.yin?.permanent});
    }
  }
  // Kinfolk toward their Garou kin (w2)
  if ( isKinfolk(a) ) for ( const e of mine.filter(x => KIN_KINDS.has(x.kind)) ) {
    const g = game.actors.get(e.to.id);
    if ( g && lineOf(g) === "werewolf" ) ctx.kinOf.push({id: g.id, name: g.name});
  }
  // A revenant family's master (v3)
  const fam = familyKeyOf(a);
  if ( fam ) {
    const m = (setting("revenantMasters") ?? {})[fam];
    if ( m?.id && game.actors.get(m.id) ) ctx.revenantMaster = {id: m.id, name: game.actors.get(m.id).name};
  }
  return ctx;
}

/** Every bond that has this actor serve someone, deepest first. */
export function records(actorLike, opts = {}) {
  const a = actorOf(actorLike);
  if ( !a ) return [];
  return SR.recordsOf(a.flags, ctxFor(a, opts)).map(r => ({...r, masterName: r.masterName || game.actors.get(r.master)?.name || ""}));
}
export const mastersOf = actorLike => SR.mastersIn(records(actorLike));
/** The servants of one master: [{actor, records}]. */
export function servantsOf(masterLike) {
  const m = actorOf(masterLike);
  if ( !m ) return [];
  const es = edges();
  const out = [];
  for ( const a of game.actors ?? [] ) {
    if ( a.id === m.id ) continue;
    const rs = SR.toward(records(a, {edgeList: es}), m.id);
    if ( rs.length ) out.push({actor: a, records: rs});
  }
  return out;
}
export const orderWeight = (npc, masterId) => SR.orderWeight(records(npc), masterId);
export const warmFloor = (npc, masterId) => SR.warmFloor(records(npc), masterId);
export const dominateShift = (subject, caster) => SR.dominateShift(records(subject), actorOf(caster)?.id);

/* ------------------------------------------------------------------ */
/*  Making and ending bonds                                             */
/* ------------------------------------------------------------------ */

/** Write a bond on the servant's sheet (Storyteller); a player's request waits on one approval card that does it all. */
export async function bind(servantLike, masterLike, kind, {step = 1, data = {}, quiet = false, flash = true} = {}) {
  const s = actorOf(servantLike), m = actorOf(masterLike);
  if ( !s || !m || s.id === m.id || !SR.KINDS[kind] ) return null;
  if ( !game.user.isGM ) {
    await chron()?.propose?.({type: T_BIND, key: `bind:${kind}:${s.id}:${m.id}`, title: `${SR.KINDS[kind].label}: ${s.name} to ${m.name}`,
      detail: `${game.user.name} asks that ${s.name} be bound to ${m.name} (${SR.stepWord(kind, step) || SR.KINDS[kind].label}). Approving makes the bond at once.`,
      data: {servant: s.id, master: m.id, kind, step, data}});
    return {waiting: true};
  }
  const key = `${kind}:${m.id}`;
  const was = s.flags?.[MOD]?.held?.[key] ?? null;
  const rec = {kind, master: m.id, masterName: m.name, step: Math.max(0, Math.min(3, Math.round(num(step)))), since: was?.since ?? now(), last: now(), data: {...(was?.data ?? {}), ...data}};
  await s.update({[`flags.${MOD}.held.${key}`]: rec});
  if ( flash ) await flashBetween(kind, m, s);
  if ( !quiet ) await card(s, m, `${SR.KINDS[kind].label}: ${s.name}`, `${s.name} ${was ? "is held deeper" : "is now bound"} to ${m.name}: ${SR.stepWord(kind, rec.step) || SR.KINDS[kind].label}. ${SR.KINDS[kind].page ? `(${SR.KINDS[kind].page})` : ""}`);
  Hooks.callAll("wodxBond", {servant: s, master: m, kind, record: rec, was});
  return rec;
}
export async function unbind(servantLike, masterLike, kind) {
  const s = actorOf(servantLike), m = actorOf(masterLike);
  if ( !game.user.isGM || !s || !m ) return false;
  const key = `${kind}:${m.id}`;
  if ( !s.flags?.[MOD]?.held?.[key] ) return false;
  await s.update({[`flags.${MOD}.held.-=${key}`]: null});
  Hooks.callAll("wodxBond", {servant: s, master: m, kind, record: null, ended: true});
  return true;
}
/** A revenant family's master (v3): every member of the family serves them. */
export async function setRevenantMaster(familyKey, masterLike) {
  if ( !game.user.isGM ) return null;
  const k = String(familyKey ?? "").trim().toLowerCase();
  if ( !k ) return null;
  const m = actorOf(masterLike);
  const all = {...(setting("revenantMasters") ?? {})};
  if ( m ) all[k] = {id: m.id, name: m.name}; else delete all[k];
  await game.settings.set(MOD, "revenantMasters", all);
  return all[k] ?? null;
}

async function card(servant, master, title, text, extra = "") {
  const whisper = [...new Set([...ownersOf(servant), ...ownersOf(master)])];
  return ChatMessage.create({whisper, speaker: {alias: "Bonds"}, flags: {[MOD]: {bondCard: true}},
    content: `<div class="vta-card wodx-x wnpc"><div class="vta-body"><p><b>${esc(title)}</b></p><p>${esc(text)}</p>${extra}</div></div>`});
}

/* ------------------------------------------------------------------ */
/*  The blow held back (x2)                                             */
/* ------------------------------------------------------------------ */

/** Roll a pool at a difficulty, V20: tens count, ones take a success away. */
async function rollPool(dice, difficulty) {
  const n = Math.max(1, Math.round(num(dice)));
  const r = await new Roll(`${n}d10`).evaluate();
  const faces = r.dice[0]?.results?.map(x => x.result) ?? [];
  const c = TERMS.successes(faces, difficulty);
  return {roll: r, faces, successes: c.successes, botch: c.botch, difficulty: c.difficulty};
}
/** Kindness or abuse from the master lately, from the attitude log: -2 (kind) to +2 (cruel). */
function treatmentOf(servant, masterId) {
  const step = num(servant?.flags?.[MOD]?.attitude?.[masterId]?.step);
  return step >= 3 ? -1 : step <= -2 ? 1 : 0;
}

/**
 * Before a blow: when the attacker is bound to the target, it rolls Willpower at the bond's difficulty. A failed
 * roll stops the blow; a won roll that the book prices costs a Willpower point. Returns {stop, why, roll} or null.
 */
export async function restrain(attackerLike, targetLike) {
  const a = actorOf(attackerLike), t = actorOf(targetLike);
  if ( !a || !t || a.id === t.id || setting("servantRestraint") === false ) return null;
  const r = SR.restraint(records(a), t.id, {treatment: treatmentOf(a, t.id)});
  if ( !r ) return null;
  // Bonds' after-the-blow card (bonds.mjs onAttack) stands aside for a blow that was rolled here first
  (globalThis.__wodxRestrained ??= new Map()).set(`${a.id}>${t.id}`, Date.now());
  const wpNow = num(a.system?.advantages?.willpower?.temporary), wpPerm = num(a.system?.advantages?.willpower?.permanent) || 3;
  const res = await rollPool(wpPerm, r.difficulty);
  const won = res.successes > 0 && (!r.spend || wpNow > 0);
  if ( won && r.spend ) { try { await a.update({"system.advantages.willpower.temporary": Math.max(0, wpNow - 1)}); } catch (e) { /* not the owner */ } }
  const dice = res.faces.map(f => `<span class="${f >= r.difficulty ? "vta-hit" : f === 1 ? "vta-one" : ""}">${f}</span>`).join(" ");
  const why = `${r.why} (${r.page}).`;
  const text = won ? `${a.name} fights the bond and strikes${r.spend ? ", spending a point of Willpower" : ""}.` : `${a.name} cannot bring themselves to strike ${t.name}: the blow is not struck.`;
  // B6761: an NPC's resisting roll is the Storyteller's (standing rule 19, B672): the dice go to the Storyteller only,
  // and everyone sees what came of it. A player's character's own roll stays open to all.
  const npcRoll = !a.hasPlayerOwner;
  const head = `<p><b>${esc(a.name)} raises a hand against ${esc(t.name)}</b></p>`;
  await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor: a}), rolls: [res.roll], flags: {[MOD]: {restraint: {stop: !won, kind: r.kind, roll: true}}},
    ...(npcRoll ? {whisper: game.users.filter(u => u.isGM).map(u => u.id)} : {}),
    content: `<div class="vta-card wodx-x wnpc"><div class="vta-body">${head}
      <p>Willpower ${wpPerm} at difficulty ${r.difficulty}: ${dice} (${res.successes} success${res.successes === 1 ? "" : "es"}).${!won && res.successes > 0 && r.spend && wpNow <= 0 ? " No Willpower left to spend." : ""}</p>
      <p><b>${esc(text)}</b></p><p class="wodx-quiet">${esc(why)}</p></div></div>`});
  if ( npcRoll ) await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor: a}), flags: {[MOD]: {restraint: {stop: !won, kind: r.kind}}},
    content: `<div class="vta-card wodx-x wnpc"><div class="vta-body">${head}<p><b>${esc(text)}</b></p><p class="wodx-quiet">${esc(why)}</p></div></div>`});
  if ( !won ) {
    const ta = canvas?.tokens?.placeables?.find(x => x.actor?.id === a.id), tt = canvas?.tokens?.placeables?.find(x => x.actor?.id === t.id);
    if ( ta && tt ) flash(r.kind, ta.document, tt.document);
  }
  Hooks.callAll("wodxBondRestraint", {attacker: a, target: t, stop: !won, kind: r.kind});
  return {stop: !won, kind: r.kind, why, successes: res.successes};
}

/* ------------------------------------------------------------------ */
/*  Dominate Conditioning (v1) and Social Conditioning (m1)             */
/* ------------------------------------------------------------------ */

const disc = (a, name) => {
  const it = a?.items?.find?.(i => String(i.system?.type ?? i.type ?? "").toLowerCase().includes("discipline") && String(i.name).toLowerCase() === name);
  return num(it?.system?.value);
};
const ab = (a, k) => num(a?.system?.abilities?.[k]?.value);
const at = (a, k) => num(a?.system?.attributes?.[k]?.value);

/** One scene's Conditioning roll. Once a scene; the total the subject needs stays with the Storyteller. */
export async function condition(masterLike, subjectLike, {nature = ""} = {}) {
  const m = actorOf(masterLike), s = actorOf(subjectLike);
  if ( !m || !s || m.id === s.id ) return null;
  if ( !game.user.isGM ) {
    await chron()?.propose?.({type: T_COND, key: `cond:${s.id}:${m.id}`, title: `${m.name} works Conditioning on ${s.name}`,
      detail: "A scene's Charisma + Leadership roll toward Dominate Conditioning (V20 pdf p. 162). Approving rolls it at once.", data: {master: m.id, subject: s.id, nature}});
    return {waiting: true};
  }
  if ( disc(m, "dominate") && disc(m, "dominate") < 4 ) { ui.notifications?.warn?.("Conditioning needs Dominate 4."); return null; }
  const key = `conditioning:${m.id}`;
  const was = s.flags?.[MOD]?.held?.[key] ?? null;
  const scene = canvas?.scene?.id ?? "";
  if ( was?.data?.scene === scene && was?.data?.sceneAt && now() - num(was.data.sceneAt) < 3600 * 6 ) { ui.notifications?.info?.("Once a scene."); return null; }
  const v = s.system?.advantages?.virtues ?? {};
  const sc = num(v.selfcontrol?.permanent) || num(v.instinct?.permanent) || 3;
  const need = num(was?.data?.need) || SR.conditioningNeed(sc, nature);
  const p = SR.conditioningRoll({charisma: at(m, "charisma"), leadership: ab(m, "leadership"), willpowerNow: s.system?.advantages?.willpower?.temporary});
  const res = await rollPool(p.dice, p.difficulty);
  const tally = num(was?.data?.tally) + res.successes;
  const step = SR.conditioningStep(tally, need);
  const wp = num(s.system?.advantages?.willpower?.permanent) || 3;
  const rec = await bind(s, m, "conditioning", {step, quiet: true, flash: step > num(was?.step), data: {tally, need, scene, sceneAt: now(), fadesAt: SR.conditioningFadesAt(now(), wp)}});
  await ChatMessage.create({whisper: gmIds(), speaker: {alias: "Conditioning"}, rolls: [res.roll],
    content: `<div class="vta-card wodx-x wnpc"><div class="vta-body"><p><b>${esc(m.name)} conditions ${esc(s.name)}</b></p>
      <p>Charisma + Leadership ${p.dice} at difficulty ${p.difficulty}: ${res.successes} success${res.successes === 1 ? "" : "es"}. Tally ${tally} of ${need} (Storyteller only).</p>
      <p>${esc(SR.stepWord("conditioning", step))}.</p><p class="wodx-quiet">V20 pdf pp. 162-163.</p></div></div>`});
  if ( step > num(was?.step) && step >= 2 ) await card(s, m, `${s.name} bends`, step >= 3 ? `${s.name} is fully conditioned: ${m.name} needs no eye contact and no command roll while they can speak to them. Other vampires' Dominate is 2 harder.` : `${s.name} is half conditioned: ${m.name}'s Dominate on them is 1 easier.`);
  return rec;
}

/** Wear off Conditioning when the subject has been kept from the master long enough (the clock's tick). */
export async function fadeConditioning() {
  if ( !isActiveGM() ) return [];
  const out = [];
  for ( const a of game.actors ?? [] ) for ( const [key, r] of Object.entries(a.flags?.[MOD]?.held ?? {}) ) {
    if ( r?.kind !== "conditioning" || !num(r.data?.fadesAt) || now() < num(r.data.fadesAt) ) continue;
    await a.update({[`flags.${MOD}.held.-=${key}`]: null});
    out.push(a.id);
    const m = game.actors.get(r.master);
    if ( m ) await card(a, m, `${a.name} comes back to themselves`, `Kept away from ${m.name} long enough, ${a.name}'s Conditioning has worn off (V20 pdf p. 163).`);
  }
  return out;
}
/** Contact with the master keeps Conditioning from fading: called when they share a scene. */
export async function touchConditioning(subject, masterId) {
  const s = actorOf(subject);
  const key = `conditioning:${masterId}`;
  const r = s?.flags?.[MOD]?.held?.[key];
  if ( !game.user.isGM || !r ) return;
  const wp = num(s.system?.advantages?.willpower?.permanent) || 3;
  await s.update({[`flags.${MOD}.held.${key}.data.fadesAt`]: SR.conditioningFadesAt(now(), wp), [`flags.${MOD}.held.${key}.last`]: now()});
}

/**
 * A stretch of Social Conditioning (M20 pdf pp. 606-608). Only an organisation runs it: master is the organisation's
 * representative (an NPC agent). The player of a player character must have agreed (data.consent). Returns the record.
 */
export async function socialRoll(subjectLike, masterLike, {group = "union", agentDice = 3, eased = 0, consent = false} = {}) {
  const s = actorOf(subjectLike), m = actorOf(masterLike);
  if ( !game.user.isGM || !s || !m ) return null;
  if ( s.hasPlayerOwner && !consent ) { ui.notifications?.warn?.("Social Conditioning on a player's character needs the player's say-so (M20 pdf p. 606)."); return null; }
  const g = SR.SOCIAL_GROUPS[group] ?? SR.SOCIAL_GROUPS.other;
  const key = `social:${m.id}`;
  const was = s.flags?.[MOD]?.held?.[key] ?? null;
  if ( was?.data?.ruined ) { ui.notifications?.info?.(`${s.name} cannot be conditioned.`); return was; }
  let stage = num(was?.data?.stage);
  const lines = [];
  if ( !stage ) {
    // The first stage: the subject's Willpower worn away to nothing
    if ( num(s.system?.advantages?.willpower?.temporary) > 0 ) { lines.push(`${s.name} still has Willpower left: the first stage waits until it is worn to nothing.`); }
    else { stage = 1; lines.push("Initial processing: the subject is a convert."); }
  } else {
    const diff = SR.socialDifficulty(eased);
    const ag = await rollPool(agentDice, diff), sb = await rollPool(num(s.system?.advantages?.willpower?.permanent) || 3, diff);
    const out = SR.socialRollResult({stage, agentSuccesses: ag.successes, subjectSuccesses: sb.successes, agentBotch: ag.botch, subjectBotch: sb.botch});
    stage = out.stage;
    lines.push(`Agents ${ag.successes}, subject ${sb.successes} at difficulty ${diff}: ${out.why}.`);
    if ( out.ruined ) { await bind(s, m, "social", {step: num(was?.step), quiet: true, flash: false, data: {...(was?.data ?? {}), ruined: true}}); }
  }
  const step = SR.socialStep(stage);
  const rec = stage ? await bind(s, m, "social", {step, quiet: true, flash: step > num(was?.step), data: {stage, group, nextAt: now() + g.days * DAY}}) : was;
  const st = SR.SOCIAL_STAGES[stage];
  await ChatMessage.create({whisper: [...new Set([...gmIds(), ...ownersOf(s)])], speaker: {alias: g.label},
    content: `<div class="vta-card wodx-x wnpc"><div class="vta-body"><p><b>Social Conditioning: ${esc(s.name)}</b></p><p>${lines.map(esc).join(" ")}</p>
      ${st ? `<p>Stage ${stage}, ${esc(st.name)}: ${esc(st.does)}</p>` : ""}<p class="wodx-quiet">Each roll is ${g.days === 1 ? "a day" : g.days === 2 ? "two days" : "a week"} of the programme (M20 pdf p. 607).</p></div></div>`});
  return rec;
}

/* ------------------------------------------------------------------ */
/*  On the map (x3)                                                     */
/* ------------------------------------------------------------------ */

/** Show the short look between two tokens on every computer looking at that scene. */
export async function flashBetween(kind, masterLike, servantLike) {
  const m = actorOf(masterLike), s = actorOf(servantLike);
  const sc = canvas?.scene;
  const tm = sc?.tokens?.find?.(t => t.actorId === m?.id), ts = sc?.tokens?.find?.(t => t.actorId === s?.id);
  if ( !ts ) return false;
  flash(kind, tm ?? null, ts);
  return true;
}
export function flash(kind, fromDoc, toDoc) {
  const msg = {type: "bond.fx", kind, sceneId: (toDoc?.parent ?? canvas?.scene)?.id, from: fromDoc?.id ?? null, to: toDoc?.id ?? null};
  try { game.socket.emit(SOCKET, msg); } catch (e) { /* offline */ }
  draw(msg);
}
/** Draw the look on this computer, at this player's effects level (WoDX Chronicle's fxLevel). */
function draw({kind, sceneId, from, to}) {
  if ( !canvas?.ready || canvas.scene?.id !== sceneId || fxLevel() === "off" ) return;
  const fx = SR.FX[kind] ?? SR.FX.blood;
  const tTo = canvas.tokens.get(to), tFrom = from ? canvas.tokens.get(from) : null;
  if ( !tTo ) return;
  const g = new PIXI.Graphics();
  g.eventMode = "none";
  const layer = canvas.interface ?? canvas.stage;
  layer.addChild(g);
  const c = t => ({x: t.center?.x ?? t.x + t.w / 2, y: t.center?.y ?? t.y + t.h / 2});
  const light = fxLevel() === "light";
  const start = performance.now(), ms = light ? 1200 : 2400;
  const step = () => {
    const k = Math.min(1, (performance.now() - start) / ms);
    g.clear();
    const alpha = 0.9 * (1 - k);
    const b = c(tTo), r = Math.max(tTo.w ?? 100, 60) * (0.45 + (light ? 0.2 : 0.5 * k));
    g.lineStyle(4, fx.color, alpha).drawCircle(b.x, b.y, r);
    g.beginFill(fx.color, alpha * 0.25).drawCircle(b.x, b.y, r).endFill();
    if ( fx.thread && tFrom ) {
      const a = c(tFrom);
      g.lineStyle(light ? 2 : 3, fx.color, alpha);
      const segs = 12;
      g.moveTo(a.x, a.y);
      for ( let i = 1; i <= segs; i++ ) {
        const t = i / segs, wob = light ? 0 : Math.sin(t * Math.PI * 3 + k * 8) * 6 * (1 - k);
        g.lineTo(a.x + (b.x - a.x) * t + wob, a.y + (b.y - a.y) * t - wob);
      }
    }
    if ( k < 1 && !g.destroyed ) requestAnimationFrame(step); else g.destroy();
  };
  requestAnimationFrame(step);
}

/** The ring a master and the Storyteller see on their servants' tokens. */
function ringLook(token) {
  const a = token?.actor;
  if ( !a || a.hasPlayerOwner ) return null;
  const rs = records(a);
  if ( !rs.length ) return null;
  const mine = game.user.isGM ? [] : game.actors.filter(x => x.isOwner && x.hasPlayerOwner).map(x => x.id);
  const ring = SR.ringFor(rs, mine, game.user.isGM);
  return ring ? {aura: ring.aura} : null;
}

/* ------------------------------------------------------------------ */
/*  The bond window                                                     */
/* ------------------------------------------------------------------ */

/**
 * Bind someone to a master by hand: the kinds the older tools do not make (Conditioning, Social Conditioning, a pact,
 * Enchantment, a fomor's master, a Thrall, a consort, a cultist, a revenant family, Kinfolk). A player's choice goes to
 * the Storyteller as one card; approving it makes the bond. Returns the record, {waiting}, or null.
 */
export async function openBind({master = null, servant = null} = {}) {
  const m = actorOf(master) ?? game.user.character ?? null;
  const people = game.actors.filter(a => a.id !== m?.id && !a.flags?.[MOD]?.passerbyBase).sort((a, b) => a.name.localeCompare(b.name));
  const masters = game.actors.filter(a => game.user.isGM || a.isOwner).sort((a, b) => a.name.localeCompare(b.name));
  const opt = (list, sel) => list.map(a => `<option value="${a.id}" ${a.id === sel ? "selected" : ""}>${esc(a.name)}</option>`).join("");
  const kinds = SR.HAND_KINDS.map(k => `<option value="${k}">${esc(SR.KINDS[k].label)}</option>`).join("");
  const search = (() => { try { return people.length > 8 ? `<input type="search" class="wnpc-bind-search" placeholder="Search people…" aria-label="Search people">` : ""; } catch (e) { return ""; } })();
  const content = `<div class="wnpc-bind">
    <div class="form-group"><label>Master</label><select name="master">${opt(masters, m?.id)}</select></div>
    <div class="form-group"><label>Servant</label>${search}<select name="servant">${opt(people, actorOf(servant)?.id)}</select></div>
    <div class="form-group"><label>Bond</label><select name="kind" data-fixed>${kinds}</select></div>
    <div class="form-group"><label>How deep</label><select name="step" data-fixed><option value="1">Begun</option><option value="2">Strong</option><option value="3">Full</option></select></div>
    <p class="wodx-quiet">${game.user.isGM ? "The bond is made at once, with its look on the map." : "The Storyteller gets a card; approving it makes the bond at once."} Blood bonds come from drinking (WoDX Creation's Vitae tool), Conditioning from its roll, Social Conditioning from its programme.</p></div>`;
  const D = foundry.applications.api.DialogV2;
  const fd = await D.prompt({window: {title: "Bind someone", icon: "fa-solid fa-link"}, classes: ["wodx-dialog", "wodx-npc-dialog"], content, rejectClose: false,
    render: (ev, dlg) => {
      const box = (dlg?.element ?? ev?.target?.element)?.querySelector?.(".wnpc-bind-search");
      box?.addEventListener("input", () => { const q = box.value.trim().toLowerCase(); for ( const o of box.parentElement.querySelectorAll("option") ) o.hidden = !!q && !o.textContent.toLowerCase().includes(q); });
    },
    ok: {label: "Bind", callback: (e, b) => Object.fromEntries(new FormData(b.form).entries())}});
  if ( !fd?.servant || !fd?.master ) return null;
  if ( fd.kind === "revenant" ) {
    const s = game.actors.get(fd.servant), fam = familyKeyOf(s);
    if ( fam && game.user.isGM ) { await setRevenantMaster(fam, fd.master); ui.notifications?.info?.(`The ${fam} family now serves ${game.actors.get(fd.master)?.name}.`); }
  }
  return bind(fd.servant, fd.master, fd.kind, {step: Number(fd.step) || 1});
}

/* ------------------------------------------------------------------ */
/*  Wiring                                                              */
/* ------------------------------------------------------------------ */

export function registerHandler() {
  chron()?.registerApprovalHandler?.(T_BIND, {
    label: "A bond between two people",
    small: e => num(e.data?.step) <= 1,
    approve: async e => { const d = e.data ?? {}; await bind(d.servant, d.master, d.kind, {step: d.step, data: d.data}); },
    undo: async e => { const d = e.data ?? {}; await unbind(d.servant, d.master, d.kind); }
  });
  chron()?.registerApprovalHandler?.(T_COND, {
    label: "A scene of Dominate Conditioning",
    small: () => true,
    approve: async e => { const d = e.data ?? {}; await condition(d.master, d.subject, {nature: d.nature}); }
  });
}

export function listen() {
  game.socket?.on?.(SOCKET, m => { if ( m?.type === "bond.fx" ) draw(m); });
  try { chron()?.tokenLooks?.register?.("wodx-npc.servants", ringLook); } catch (e) { /* no token looks */ }
  Hooks.on("updateActor", a => { if ( a?.flags?.[MOD]?.held ) chron()?.tokenLooks?.refresh?.(); });
  // Conditioning wears off with time apart; sharing a scene with the master keeps it
  Hooks.on("updateWorldTime", () => { if ( heldClock() ) return; if ( isActiveGM() ) fadeConditioning().catch(e => console.error(`${MOD} | conditioning`, e)); });
  Hooks.on("canvasReady", () => {
    if ( !isActiveGM() ) return;
    const here = new Set((canvas.scene?.tokens?.contents ?? []).map(t => t.actorId));
    for ( const id of here ) {
      const a = game.actors.get(id);
      for ( const r of Object.values(a?.flags?.[MOD]?.held ?? {}) ) if ( r?.kind === "conditioning" && here.has(r.master) ) touchConditioning(a, r.master).catch(() => null);
    }
  });
}

export {SR as rules};
