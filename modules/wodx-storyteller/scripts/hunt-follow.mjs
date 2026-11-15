/**
 * WoDX Storyteller (NPC Motives Desk part four, B5699-B5703): the hunters follow through. Rules in hunt-follow-rules.mjs.
 *
 *   h1  proof(body, by)   a hunter takes the body of a supernatural as proof (or the imbued burn it where it lies);
 *                         the region's file on that kind rises a level, pressure eases by two, a rumour goes round.
 *                         With WoDX NPC's carrying (orderCarry, intent "proof") the body is carried for real and the
 *                         effects follow its wodxBodyTaken hook; else the hunter walks to it and leaves with it.
 *   h2  raidEnded(combat) won, beaten, missed or held: the hunters take the body, run, or draw back, and leave the map;
 *                         a missed raid leaves one hunter watching the place for three nights.
 *   h3  investigator()    a stranger walks the town map between the market, the tavern and the church for up to three
 *                         days, rolling Perception + Investigation each day; harm them or win them over and they go.
 *   h4  found()           someone a hunters' faction finds goes into the region's file.
 *   h5  bodyFound()       a body found drained or savaged adds pressure and, from the age of the coroner, goes to the
 *                         morgue, where the hunters claim it on their next turn.
 *   Token flags  wodx-storyteller.reach {kind, target, region, watchUntil, until, day} on the hunters' own tokens;
 *                wodx-storyteller.proof {to, by, at} and remains.morgue {at, claimed} on bodies (hidden, never deleted).
 */
import * as HF from "./hunt-follow-rules.mjs";
import * as H from "./hunters-rules.mjs";
import * as Between from "./between.mjs";
import {MOD, esc, isActiveGM, chron, npc, gmIds, log} from "./core.mjs";

const now = () => game.time?.worldTime ?? 0;
const all = c => (c ? [...(c.contents ?? c)] : []);
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 1197; } catch (e) { return 1197; } };
const futureBranch = () => { try { return !!game.settings.get("wodx-chronicle", "rule.futureBranch"); } catch (e) { return false; } };
const api = () => game.modules.get(MOD)?.api ?? null;
const hunters = () => api()?.hunters ?? null;
const reach = () => api()?.reach ?? null;
const routines = () => npc()?.routines ?? null;
const reachOf = doc => doc?.flags?.[MOD]?.reach ?? null;
const baseOf = a => (a?.isToken ? (a.baseActor ?? game.actors.get(a.id)) : a);
const down = a => { try { return !!routines()?.downState?.(a); } catch (e) { return !!a?.statuses?.has?.("dead"); } };
const hurt = a => { const d = a?.system?.health?.damage ?? {}; return Number(d.bashing || 0) + Number(d.lethal || 0) + Number(d.aggravated || 0) > 0; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const onView = scene => !!scene && canvas?.ready && canvas.scene?.id === scene.id;

async function card(title, text, flags = {}) {
  return ChatMessage.create({speaker: {alias: "The hunters"}, whisper: gmIds(), flags: Object.keys(flags).length ? {[MOD]: flags} : undefined,
    content: `<div class="wodx-card wst-hunters"><h3>${esc(title)}</h3><p>${esc(text)}</p>${flags.proof ? `<button type="button" data-action="wst-proof-back">Put the body back</button>` : ""}</div>`});
}

/** Hunters leave the map: they walk off from the trouble when the map is in view, then their tokens are taken back. */
export async function leave(scene, docs = [], from = null) {
  const list = docs.filter(d => d && scene.tokens.get(d.id));
  if ( !list.length ) return 0;
  if ( onView(scene) ) {
    for ( const d of list ) { try { if ( d.object ) await routines()?.goAway?.(d.object, from?.object ?? null, null); } catch (e) { /* no way out */ } }
    await sleep(300);
  }
  return reach()?.sendAway?.(scene.id, list.map(d => d.id)) ?? 0;
}

/* ---- h1 ---- */

/** The file and pressure change, and the rumour, once the hunters have their proof. */
export async function proofEffects({region, kind = null, name = "something", p = null} = {}) {
  const H_ = hunters();
  if ( !H_ || !region ) return null;
  p ??= HF.proofFor(yearNow(), H_.bodiesAt(region)[0]?.key ?? null, H.lineOf(yearNow(), {futureBranch: futureBranch()}));
  await H_.add(region, "manual", {n: HF.PROOF_EASE, why: `They have their proof: ${name}`});
  if ( kind ) await H_.mutate?.(region, r => {
    let x = r;
    for ( const f of Object.values(x.files) ) if ( f.kind === kind ) x = H.noteCulprit(x, f, now(), {gain: HF.PROOF_LEVEL * H.PER_LEVEL}).region;
    return x;
  });
  const lead = H_.bodiesAt(region)[0]?.label ?? "the hunters";
  const text = p.burn ? `The hunters burned something that was not a man, and the ashes would not lie still.` : `${lead.replace(/^\w/, c => c.toUpperCase())} carried a body away to ${p.short}, and say it proves what they feared.`;
  try { await api()?.rumours?.start?.({text}); } catch (e) { /* no rumours */ }
  return p;
}

/**
 * h1: a hunter takes the body of a supernatural (TokenDocuments). Returns {key, to, burn} or null when the body is no
 * supernatural's.
 */
export async function proof(body, by = null, {region = null} = {}) {
  if ( !isActiveGM() || !body?.actor || !HF.isSupernatural(body.actor.type) ) return null;
  const scene = body.parent, H_ = hunters();
  region ??= H_?.regionAt?.(scene) ?? null;
  const p = HF.proofFor(yearNow(), H_?.bodiesAt?.(region)?.[0]?.key ?? null, H.lineOf(yearNow(), {futureBranch: futureBranch()}));
  const kind = String(baseOf(body.actor)?.type ?? "") || null, name = body.name;
  if ( p.burn ) {
    await body.update({"texture.tint": "#2b1d14", [`flags.${MOD}.proof`]: {to: "burned", by: by?.name ?? "", at: now(), was: body.texture?.tint ?? "#ffffff"}});
    await proofEffects({region, kind, name, p});
    await card(`${name} is burned where it lies`, `${by?.name ?? "The hunters"} set the body alight. ${H_?.bodiesAt?.(region)?.[0]?.label ?? "The hunters"} have their proof; their file on that kind rises.`, {proof: {token: body.uuid}});
    return p;
  }
  // B6167: WoDX NPC's api is npc().orderCarry, and it answers {ok, later, text}: only a carry that took hold (or waits
  // for the hunter's turn in a fight) skips the walk-and-hide below
  const carry = npc()?.orderCarry ?? null;
  if ( carry && by?.object && body.object ) {
    try { const r = await carry(by.object, body.object, {intent: "proof", faction: "hunters", place: p.to}); if ( r?.ok ) return p; } catch (e) { console.warn(`${MOD} | proof carry`, e); }
  }
  // No carrying here: the hunter goes to the body, then leaves with it
  if ( onView(scene) && by?.object && body.object ) { try { await routines()?.goTo?.(by.object, body.object, null); } catch (e) { /* no way */ } }
  await body.update({hidden: true, [`flags.${MOD}.proof`]: {to: p.to, by: by?.name ?? "", at: now()}});
  if ( by ) await leave(scene, [by]);
  await proofEffects({region, kind, name, p});
  await card(`${by?.name ?? "The hunters"} take ${name}'s body`, `To ${p.to}. Their file on that kind rises, and the region eases while they have their proof.`, {proof: {token: body.uuid}});
  return p;
}

/** WoDX NPC's carrying: a body carried off as proof. */
async function onBodyTaken(p = {}) {
  if ( !isActiveGM() || p.intent !== "proof" ) return;
  // B6167: the hook's body is the token's uuid (WoDX NPC carry-goals.mjs), not the document
  const ref = p.body?.document ?? p.body ?? null;
  const body = typeof ref === "string" ? await fromUuid(ref).catch(() => null) : ref;
  await proofEffects({region: hunters()?.regionAt?.(body?.parent ?? canvas?.scene), kind: String(baseOf(body?.actor)?.type ?? "") || null, name: body?.name ?? "a body"});
}

async function putBack(msg) {
  const t = msg?.flags?.[MOD]?.proof?.token;
  const doc = t ? await fromUuid(t) : null;
  if ( !doc ) return;
  const f = doc.flags?.[MOD]?.proof ?? {};
  await doc.update({hidden: false, ...(f.to === "burned" ? {"texture.tint": f.was ?? "#ffffff"} : {}), [`flags.${MOD}.-=proof`]: null});
}

/* ---- h2 ---- */

/** When a fight with hunters in it ends: they follow through and leave. Returns the end, or null. */
const ended = new Set();
export async function raidEnded(combat) {
  if ( !isActiveGM() || !combat?.id || ended.has(combat.id) ) return null;
  const scene = combat?.scene ?? game.scenes.get(combat?._source?.scene);
  if ( !scene ) return null;
  const hs = all(combat.combatants).map(c => c.token ?? scene.tokens.get(c.tokenId)).filter(d => d && ["raid", "purge"].includes(reachOf(d)?.kind));
  if ( !hs.length ) return null;
  ended.add(combat.id);
  const target = reachOf(hs[0]).target ?? null;
  const qd = target ? all(scene.tokens).find(t => t.actorId === target) : null;
  const end = HF.raidEnd({hunters: hs.map(d => ({down: down(d.actor)})), quarry: qd ? {present: true, down: down(qd.actor)} : null});
  const after = HF.RAID_AFTER[end], H_ = hunters(), region = H_?.regionAt?.(scene);
  const standing = hs.filter(d => !down(d.actor));
  let took = null;
  if ( end === "won" && qd ) {
    const by = standing.sort((a, b) => Math.hypot(a.x - qd.x, a.y - qd.y) - Math.hypot(b.x - qd.x, b.y - qd.y))[0] ?? null;
    took = await proof(qd, by, {region});
    if ( took && by ) standing.splice(standing.indexOf(by), 1);
  }
  if ( end === "beaten" && H_ && region ) {
    const a = qd?.actor ? baseOf(qd.actor) : null;
    await H_.add(region, "manual", {n: after.pressure, why: "Hunters beaten off, and now they know what they face", who: a ? {id: a.id, name: a.name, kind: String(a.type ?? "") || null} : null, gain: after.file * H.PER_LEVEL});
  }
  await leave(scene, standing, qd);
  const quarry = qd?.name ?? "their quarry";
  await card(`The hunters ${after.text}`, end === "won" ? `${quarry} is down.${took ? "" : " Nothing of it is worth taking."} The rest leave the map.` : end === "beaten" ? `Those still standing run from ${quarry}. Their file rises a level, and the region's hunters stir.` : `They leave ${scene.navName || scene.name}.`);
  return end;
}

/** A raid that found nobody: one hunter stays to watch for three nights, the rest leave. */
export async function missed(scene, made = [], {target = null} = {}) {
  const docs = made.map(t => t?.document ?? t).filter(Boolean);
  if ( !isActiveGM() || !docs.length ) return null;
  const [watcher, ...rest] = docs;
  await watcher.update({[`flags.${MOD}.reach.watchUntil`]: HF.watchUntil(now()), [`flags.${MOD}.reach.target`]: target ?? reachOf(watcher)?.target ?? null});
  await leave(scene, rest);
  await card("The hunters find nobody", `${watcher.name} stays to watch ${scene.navName || scene.name} for ${HF.WATCH_NIGHTS} nights; the others go.`);
  return watcher;
}

/** Watchers whose nights are over go; one who sees the quarry come back sends word (the file grows). */
async function watchers() {
  const t = now();
  for ( const scene of all(game.scenes) ) {
    for ( const d of all(scene.tokens) ) {
      const r = reachOf(d);
      if ( !r?.watchUntil ) continue;
      if ( t >= r.watchUntil ) { await leave(scene, [d]); continue; }
      const q = r.target && !r.saw ? all(scene.tokens).find(x => x.actorId === r.target && !x.hidden) : null;
      if ( q ) {
        await d.update({[`flags.${MOD}.reach.saw`]: t});
        const a = baseOf(q.actor);
        await hunters()?.add?.(hunters().regionAt(scene), "manual", {n: 0, who: {id: a.id, name: a.name, kind: String(a.type ?? "") || null}, gain: 2});
        await card(`${d.name} sees ${q.name} come back`, `Word goes to the others. Their file grows.`);
      }
    }
  }
}

/* ---- h3 ---- */

/** The town map of a region with the investigator's places: the scene in view when it fits, else the first. */
function townOf(region) {
  const P = routines()?.listPlaces?.() ?? [];
  const kinds = new Set(HF.ROUNDS.map(r => r.kind));
  const fits = s => P.some(p => p.scene?.id === s.id && p.region && kinds.has(p.kind)) && hunters()?.regionAt?.(s) === region;
  const scene = (canvas?.scene && fits(canvas.scene)) ? canvas.scene : all(game.scenes).find(fits);
  if ( !scene ) return null;
  const places = {};
  for ( const p of P ) if ( p.scene?.id === scene.id && p.region && kinds.has(p.kind) && !places[p.kind] ) places[p.kind] = p.id;
  return {scene, places};
}

/** h3: an investigator arrives on the region's town map by day. Returns the token, or null with no town map. */
export async function investigator(region) {
  if ( !isActiveGM() ) return null;
  const town = townOf(region);
  if ( !town ) { await log({kind: "hunters", text: "An investigator asks questions in the region, on no map in play."}); return null; }
  const {scene, places} = town;
  const first = fromUuidSync(places.market ?? Object.values(places)[0]);
  const b = first?.bounds ?? first?.shapes?.[0] ?? null;
  const x = b ? Math.round((b.x ?? 0) + (b.width ?? 0) / 2) : null, y = b ? Math.round((b.y ?? 0) + (b.height ?? 0) / 2) : null;
  const toks = await Between.makeExtras("investigator", {n: 1, x, y, scene, hidden: false, quiet: true, flags: {reach: {kind: "investigator", region, until: now() + HF.INVESTIGATOR_DAYS * HF.DAY, day: Math.floor(now() / HF.DAY)}}});
  const tok = toks.find(t => t?.documentName === "Token" || t?.parent) ?? null;
  const a = tok?.actor ? baseOf(tok.actor) : null;
  if ( a ) await a.update({"flags.wodx-npc.routine": {on: true, blocks: HF.investigatorBlocks(places), roles: {}}});
  await card("An investigator arrives", `${tok?.name ?? "A stranger"} comes to ${scene.navName || scene.name} and will go between the market, the tavern and the church for up to ${HF.INVESTIGATOR_DAYS} days, asking questions.`);
  return tok;
}

/** Each day: the investigator's roll, and whether they stay. */
async function investigators() {
  const t = now(), today = Math.floor(t / HF.DAY);
  for ( const scene of all(game.scenes) ) {
    for ( const d of all(scene.tokens) ) {
      const r = reachOf(d);
      if ( r?.kind !== "investigator" ) continue;
      const a = d.actor;
      let step = 0;
      for ( const pc of all(scene.tokens).filter(x => x.actor?.hasPlayerOwner) ) {
        try { step = Math.max(step, Number(npc()?.attitude?.of?.(baseOf(a), pc.actor)?.step) || 0); } catch (e) { /* no attitude */ }
      }
      const harmed = down(a) || hurt(a);
      const days = Math.floor((t - (r.until - HF.INVESTIGATOR_DAYS * HF.DAY)) / HF.DAY);
      const stays = HF.investigatorStays({harmed, step, days: t >= r.until ? HF.INVESTIGATOR_DAYS : days});
      if ( stays === "stays" && today > (r.day ?? today) ) await dailyRoll(scene, d, r, today);
      if ( stays === "stays" ) continue;
      if ( stays === "harmed" ) await hunters()?.add?.(r.region, "manual", {n: HF.HARMED_PRESSURE, why: "Their investigator was harmed"});
      if ( !down(a) ) await leave(scene, [d]);
      if ( !all(game.scenes).some(s => all(s.tokens).some(x => x.actorId === baseOf(a)?.id && reachOf(x)?.kind === "investigator")) ) { try { await baseOf(a)?.unsetFlag?.("wodx-npc", "routine"); } catch (e) { /* gone */ } }
      await card(stays === "harmed" ? "The investigator was harmed" : stays === "won" ? "The investigator is won over" : "The investigator leaves", stays === "harmed" ? `The hunters come down harder: pressure +${HF.HARMED_PRESSURE}.` : stays === "won" ? `${d.name} goes early, satisfied there is nothing here.` : `${d.name} has asked enough and goes.`);
    }
  }
}

async function dailyRoll(scene, d, r, today) {
  await d.update({[`flags.${MOD}.reach.day`]: today});
  const a = d.actor, s = a?.system ?? {};
  const pool = Math.max(1, Number(s.attributes?.perception?.value || 3) + Number(s.abilities?.investigation?.value || 3));
  const roll = await new Roll(`${pool}d10cs>=${HF.INVESTIGATE_DIFF}`).evaluate();
  const ones = roll.dice[0]?.results?.filter(x => x.result === 1).length ?? 0;
  const net = Math.max(0, roll.total - ones);
  const told = new Set((npc()?.wanted?.list?.() ?? []).filter(x => !x.dropped && x.of).map(x => x.of));
  let names = [];
  if ( net ) await hunters()?.mutate?.(r.region, x0 => {
    let x = x0;
    for ( const f of Object.values(x.files) ) if ( told.has(f.id) ) { x = H.noteCulprit(x, f, now(), {gain: net * HF.PER_SUCCESS}).region; names.push(f.name); }
    return x;
  });
  await card(`${d.name} asks around`, `Perception + Investigation, difficulty ${HF.INVESTIGATE_DIFF}: ${net} success${net === 1 ? "" : "es"}.${names.length ? ` The file grows on ${names.join(", ")}.` : " Nothing new."}`);
}

/* ---- h4 ---- */

/** h4: someone a hunters' faction found goes into the region's file. */
export async function found(actor, {by = ""} = {}) {
  const a = baseOf(actor);
  if ( !isActiveGM() || !a ) return null;
  const tok = a.getActiveTokens?.(false, true)?.[0] ?? null;
  const sc = tok?.parent ?? all(game.scenes).find(s => all(s.tokens).some(t => t.actorId === a.id)) ?? canvas?.scene;
  const region = hunters()?.regionAt?.(sc);
  return hunters()?.add?.(region, "manual", {n: HF.FOUND_PRESSURE, why: `${by || "Hunters"} found ${a.name}`, who: {id: a.id, name: a.name, kind: String(a.type ?? "") || null}, gain: HF.FOUND_GAIN});
}

/* ---- h5 ---- */

/** h5: a body has been found for the first time. cause: a remains CAUSES key. Returns {pressure, morgue}. */
export async function bodyFound(body, cause) {
  if ( !isActiveGM() || !body ) return {pressure: 0, morgue: false};
  const year = yearNow(), n = HF.bodyPressure(cause, year);
  if ( !n ) return {pressure: 0, morgue: false};
  const region = hunters()?.regionAt?.(body.parent);
  await hunters()?.add?.(region, "manual", {n, why: `A body found ${cause === "drained" ? "drained of blood" : "savaged"}`});
  const morgue = HF.toMorgue(year, cause);
  if ( morgue ) await body.update({hidden: true, [`flags.${MOD}.remains.morgue`]: {at: now(), claimed: false, region}});
  return {pressure: n, morgue};
}

/** On the hunters' turn: bodies at the morgue are claimed and studied (each file in the region grows). */
export async function claimMorgue() {
  const t = now(), out = [];
  for ( const scene of all(game.scenes) ) for ( const d of all(scene.tokens) ) {
    const m = d.flags?.[MOD]?.remains?.morgue;
    if ( !m || m.claimed || t - (m.at ?? t) > HF.MORGUE_KEEP_DAYS * HF.DAY ) continue;
    await d.update({[`flags.${MOD}.remains.morgue.claimed`]: t});
    if ( HF.isSupernatural(d.actor?.type) ) await proofEffects({region: m.region, kind: String(baseOf(d.actor)?.type ?? "") || null, name: d.name});
    else await hunters()?.mutate?.(m.region, x0 => { let x = x0; for ( const f of Object.values(x.files) ) x = H.noteCulprit(x, f, t, {gain: HF.MORGUE_GAIN}).region; return x; });
    out.push(d.name);
  }
  if ( out.length ) await card("The hunters claim the morgue's dead", `They study ${out.join(", ")}. Their files grow.`);
  return out;
}

/* ---- wiring ---- */

export function registerHuntFollowHooks() {
  Hooks.on("deleteCombat", c => { raidEnded(c).catch(e => console.error(`${MOD} | raid end`, e)); });
  Hooks.on("wodxBodyTaken", p => { onBodyTaken(p).catch(e => console.error(`${MOD} | proof`, e)); });
  let wait = null;
  Hooks.on("updateWorldTime", () => {
    if ( !isActiveGM() ) return;
    try { if ( chron()?.isSkipping?.() ) return; } catch (e) { /* no Chronicle */ }
    clearTimeout(wait);
    wait = setTimeout(() => { watchers().then(investigators).catch(e => console.error(`${MOD} | hunters on the map`, e)); }, 700);
  });
  Hooks.on("renderChatMessageHTML", (msg, el) => {
    const b = (el?.[0] ?? el)?.querySelector?.("[data-action=wst-proof-back]");
    if ( !b ) return;
    if ( !game.user.isGM ) { b.remove(); return; }
    b.addEventListener("click", ev => { ev.preventDefault(); b.disabled = true; putBack(msg).catch(e => console.error(`${MOD} | proof`, e)); });
  });
}

export const huntFollowApi = () => ({proof, raidEnded, missed, investigator, found, bodyFound, claimMorgue, leave, tick: async () => { await watchers(); await investigators(); }, rules: HF});
