/**
 * Dreams and omens from what is coming, the Foundry side (B3369-B3373). The rules are in omen-rules.mjs.
 *
 *   Signals  read once a day from what the world is about to do: the chronicle's dated events within 90 days, NPC
 *            grudges against a character close to the mark (WoDX NPC memory), hunters investigating or worse in a
 *            region, a plague of history on its way to a region where a character is.
 *   Dreams   a gifted player character may dream of one. Each dream asks the Storyteller first (approval
 *            wodx-storyteller.omen); approved, it joins the Dreams list for the next sleep, where the Storyteller can
 *            still change its words, and comes as the dreams the Storyteller writes do.
 *   Reading  the dream's card has Try to read it: Perception or Intelligence + Enigmas or Occult at 7, whispered to
 *            the dreamer's players and the Storyteller.
 *   Omens    a great sign may show in the world: the Storyteller approves a line (wodx-storyteller.worldOmen) posted
 *            to everyone.
 */
import * as O from "./omen-rules.mjs";
import * as Dreams from "./dreams.mjs";
import * as D from "./dreams-rules.mjs";
import * as Hunters from "./hunters.mjs";
import * as HR from "./hunters-rules.mjs";
import * as CR from "./contagion-rules.mjs";
import {backgroundsOf} from "./havens.mjs";
import {MOD, esc, chron, npc, isActiveGM, isPC, setting, whereIs} from "./core.mjs";
import {sphereFor} from "../../wodx-chronicle/scripts/world-rules.mjs";
import {getEngine} from "../../wodx-chronicle/scripts/calendar.mjs";
import {dateKey} from "../../wodx-chronicle/scripts/events-rules.mjs";
import {countSuccesses} from "../../wodx-actions/scripts/core-rules.js";

const T_DREAM = `${MOD}.omen`, T_WORLD = `${MOD}.worldOmen`;
const now = () => game.time?.worldTime ?? 0;
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 1197; } catch (e) { return 1197; } };
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const owners = actor => [...(game.users ?? [])].filter(u => !u.isGM && actor?.testUserPermission?.(u, "OWNER"));

export function registerOmenSettings() {
  game.settings.register(MOD, "omens", {name: "Dreams and omens of what is coming", hint: "Gifted characters may dream in symbols of what the world is about to do; each dream and sign asks the Storyteller first.",
    scope: "world", config: true, type: Boolean, default: true});
  game.settings.register(MOD, "omenState", {scope: "world", config: false, type: Object, default: {day: 0, seen: {}}});
}
const on = () => setting("omens") !== false;

const regionOf = a => { try { const s = whereIs(a); const r = chron()?.world?.here?.(s ?? null); return (typeof r === "string" ? r : r?.id) || "moravia"; } catch (e) { return "moravia"; } };
const regionLabel = id => { try { return chron()?.world?.regionOf?.(id)?.label ?? id; } catch (e) { return id; } };

/* ---- Signals (B3369) ---- */

export function signals() {
  const out = [], year = yearNow();
  // The chronicle's dated events within 90 days
  try {
    const e = getEngine(), a = e.timeToDate(now()), b = e.timeToDate(now() + 90 * O.DAY);
    const from = dateKey(a), to = dateKey(b), fired = new Set(chron()?.events?.fired?.() ?? []);
    for ( const ev of chron()?.events?.list?.() ?? [] ) if ( ev.live && !fired.has(ev.id) && ev.key > from && ev.key <= to )
      out.push({key: `event:${ev.id}`, kind: O.kindOfEvent(ev), about: "", region: "", weight: 3, what: ev.summary || ev.name});
  } catch (er) { /* no calendar */ }
  // Grudges near the mark
  const mem = npc()?.memory, at = mem?.rules?.GRUDGE_AT ?? 5;
  if ( mem?.balance ) for ( const n of game.actors ) {
    if ( isPC(n) ) continue;
    for ( const cid of Object.keys(n.flags?.["wodx-npc"]?.memory ?? {}) ) {
      const ch = game.actors.get(cid);
      if ( !isPC(ch) ) continue;
      const g = mem.balance(n, ch).grudge;
      if ( g >= at - 2 ) out.push({key: `grudge:${n.id}:${cid}`, kind: "grudge", about: cid, region: regionOf(ch), weight: g >= at + 3 ? 3 : 2, who: n.name});
    }
  }
  // Hunters investigating or worse
  try {
    for ( const [rid, r] of Object.entries(Hunters.state()?.regions ?? {}) ) {
      const i = HR.stageIndex(r?.pressure);
      if ( i >= 3 ) out.push({key: `hunters:${rid}`, kind: "hunters", about: "", region: rid, weight: i >= 4 ? 3 : 2, where: regionLabel(rid)});
    }
  } catch (er) { /* no hunters */ }
  // Plague of history on its way where a character is
  const regions = new Set(game.actors.filter(isPC).map(regionOf));
  for ( const rid of regions ) {
    try { for ( const o of CR.historyFor(rid, year) ?? [] ) out.push({key: `plague:${rid}:${o.key}`, kind: "plague", about: "", region: rid, weight: 3, where: regionLabel(rid)}); }
    catch (er) { /* no contagion */ }
  }
  return out;
}

/* ---- Dreamers ---- */

function dreamerOf(a) {
  const s = a.system ?? {};
  const traits = [];
  try { if ( (chron()?.traits?.has?.(a, "oracular-ability") ?? 0) > 0 ) traits.push("oracular-ability"); } catch (e) { /* no traits */ }
  const region = regionOf(a);
  return {id: a.id, region, way: sphereFor(region, yearNow()), last: num(a.flags?.[MOD]?.omenLast),
    gift: O.giftOf({type: a.type, clan: String(s.clan ?? s.bio?.clan ?? ""), auspice: String(s.auspice ?? s.bio?.auspice ?? ""), creed: String(s.creed ?? s.bio?.creed ?? ""),
      powers: [...(a.items ?? [])].filter(i => i.type === "Power").map(i => i.name), traits, backgrounds: backgroundsOf(a), year: yearNow()})};
}

/* ---- The day ---- */

export async function dayRun({force = false} = {}) {
  if ( !isActiveGM() || !on() ) return [];
  const st = setting("omenState") ?? {day: 0, seen: {}};
  const t = now();
  if ( !force && st.day && t - st.day < O.DAY ) return [];
  const seen = Object.fromEntries(Object.entries(st.seen ?? {}).filter(([, v]) => t - num(v) < 365 * O.DAY));
  if ( !st.day && !force ) { await game.settings.set(MOD, "omenState", {day: t, seen}); return []; }
  const sig = signals();
  const dreamers = game.actors.filter(isPC).map(dreamerOf).filter(d => d.gift > 0);
  const got = O.tonight({signals: sig, dreamers, now: t});
  for ( const g of got ) {
    const a = game.actors.get(g.dreamer);
    await a.setFlag(MOD, "omenLast", t);
    const text = O.dreamWords(g.symbols);
    const omen = {kind: g.kind, who: g.signal.who ?? "", where: g.signal.where ?? regionLabel(a ? regionOf(a) : ""), what: g.signal.what ?? "", lie: g.lie};
    await chron()?.propose?.({type: T_DREAM, key: `omen:${a.id}:${g.signal.key}`, title: `${a.name} dreams of what is coming`,
      detail: `${text} (Of: ${g.signal.kind}${g.signal.who ? `, ${g.signal.who}` : ""}${g.signal.where ? `, ${g.signal.where}` : ""}${g.lie ? "; a false dream" : ""}.) Approve and it comes at the next sleep; change its words in Dreams before then.`,
      data: {actor: a.id, text, omen}});
  }
  // A great sign in the world, once a month at most for each
  for ( const s of sig ) {
    if ( seen[s.key] && t - seen[s.key] < 30 * O.DAY ) continue;
    const line = Math.random() < 0.2 ? O.omenFor(s) : null;
    if ( !line ) continue;
    seen[s.key] = t;
    await chron()?.propose?.({type: T_WORLD, key: `worldOmen:${s.key}`, title: "A sign in the world", detail: `${line} (Of: ${s.kind}${s.where ? `, ${s.where}` : ""}.)`, data: {text: line}});
  }
  await game.settings.set(MOD, "omenState", {day: t, seen});
  return got;
}

async function approveDream(e) {
  const {actor, text, omen} = e?.data ?? {};
  if ( !game.actors.get(actor) ) return;
  let at = null;
  try { const en = getEngine(), d = en.timeToDate(now()); at = D.nextSleep(en.dateToTime({year: d.year, month: d.month, day: d.day, hour: D.DEFAULT_HOUR, minute: 0}), now()); } catch (er) { at = now() + 3600; }
  await Dreams.saveDream({actorId: actor, title: "A dream of what is coming", text, at, omen});
}
async function approveWorld(e) {
  const text = String(e?.data?.text ?? "");
  if ( text ) await ChatMessage.create({speaker: {alias: "A sign"}, content: `<div class="wodx-card wstory wst-omen"><p><i>${esc(text)}</i></p></div>`});
}

export function registerApproval() {
  const ap = chron()?.approvals;
  ap?.registerHandler?.(T_DREAM, {label: "A dream of what is coming", approve: approveDream, reject: async () => {}});
  ap?.registerHandler?.(T_WORLD, {label: "A sign in the world", approve: approveWorld, reject: async () => {}});
}

/* ---- Reading a dream (B3372) ---- */

export async function readDream(dreamId) {
  const d = Dreams.dreams().find(x => x.id === dreamId);
  const a = game.actors.get(d?.actorId);
  if ( !d?.omen || !a?.isOwner ) return null;
  const s = a.system ?? {};
  const attr = Math.max(num(s.attributes?.perception?.total ?? s.attributes?.perception?.value), num(s.attributes?.intelligence?.total ?? s.attributes?.intelligence?.value));
  const abil = Math.max(num(s.abilities?.enigmas?.value), num(s.abilities?.occult?.value));
  const r = await new Roll(`${Math.max(1, attr + abil)}d10`).evaluate();
  const c = countSuccesses(r.dice[0]?.results?.map(x => x.result) ?? [], O.READ_DIFF, {});
  const words = O.reading(d.omen, c.botch ? 0 : c.successes);
  await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor: a}), rolls: [r], whisper: [...owners(a).map(u => u.id), ...game.users.filter(u => u.isGM).map(u => u.id)],
    content: `<div class="wodx-card wstory wst-omen-read"><p><b>${esc(a.name)}</b> tries to read the dream (Perception or Intelligence + Enigmas or Occult, difficulty ${O.READ_DIFF}).</p><p>${esc(words)}</p></div>`});
  return words;
}

export function registerOmenHooks() {
  Hooks.on("updateWorldTime", () => { try { if ( chron()?.isSkipping?.() ) return; } catch (e) { /* no Chronicle */ } dayRun().catch(er => console.error(`${MOD} | omens`, er)); });
  Hooks.on("wodxSkipEnd", () => { dayRun().catch(er => console.error(`${MOD} | omens`, er)); });
  Hooks.on("renderChatMessageHTML", (message, el) => {
    const html = el?.[0] ?? el;
    const b = html?.querySelector?.("[data-wst-read-dream]");
    if ( !b ) return;
    b.addEventListener("click", () => { b.disabled = true; readDream(b.dataset.wstReadDream).catch(er => console.error(`${MOD} | omens`, er)); });
  });
}

export const api = () => ({rules: O, signals, run: dayRun, read: readDream});
