/**
 * WoDX NPC 0.59.0: standing by community, social rank and feuds, the Foundry side (B2863-B2871). The rules are in
 * standing-rules.mjs. Gossip along ties is in WoDX Storyteller's rumour mill (0.62.0), which asks this module for the
 * ties between NPCs.
 *
 *   deeds     api.standing.deed(actor, {community, delta, text, region}); api.standing.of(actor, community, region)
 *             works standing out from the deeds whose news has reached that region by now (the letters' fastest way)
 *   rank      api.standing.rank(actor) on the ladder of the homeland's way of life in the year; WoDX Actions' social
 *             rolls read api.standing.rankShift(actor, npc)
 *   feuds     world setting "feuds"; members are found by family name, family line, clan, tribe, house or faction, so
 *             heirs and descendants inherit the grudge; live feuds are rivalry rows, so the rivalry check and the
 *             fight starter take them up
 */
import * as SR from "./standing-rules.mjs";
import {getEngine} from "../../wodx-chronicle/scripts/calendar.mjs";

const MOD = "wodx-npc";
const st = () => (game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api : null);
const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
const api = () => game.modules.get(MOD).api;
const actorOf = x => (x?.actor ?? (typeof x === "string" ? game.actors.get(x) : x?.id ? game.actors.get(x.id) ?? x : null));
const yearNow = () => getEngine().timeToDate(Number(game.time.worldTime) || 0).year;
const homeland = () => { try { return chron()?.world?.homeland?.() || "moravia"; } catch (e) { return "moravia"; } };
const sphereOf = (region, year) => { try { return chron()?.world?.rules?.sphereFor?.(region, year) ?? "latin"; } catch (e) { return "latin"; } };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));

export function registerSettings() {
  game.settings.register(MOD, "feuds", {scope: "world", config: false, type: Array, default: []});
}

/* ---- Standing ---- */
export async function deed(actorLike, {community = "town", delta = 1, text = "", region = null} = {}) {
  const a = actorOf(actorLike);
  if ( !game.user.isGM || !a ) return null;
  const d = SR.normDeed({id: foundry.utils.randomID(), community, delta, text, region: region ?? homeland(), at: game.time.worldTime});
  await a.setFlag(MOD, "deeds", [...(a.flags?.[MOD]?.deeds ?? []), d].slice(-60));
  return d;
}
const FAST = ["net", "email", "telephone", "telegraph", "post", "messenger", "traveller"];
const delays = new Map();
/** The fastest the news can go from one region to another in a year, in seconds, or null. */
export async function newsDelay(from, to, year = yearNow()) {
  if ( !from || !to || from === to ) return 0;
  const key = `${from}|${to}|${year}`;
  if ( delays.has(key) ) return delays.get(key);
  let best = null;
  for ( const how of FAST ) {
    try { const p = await st()?.letters?.plan?.(how, {from, to, reach: "far", year}); if ( p?.ok && (best === null || p.seconds < best) ) best = p.seconds; } catch (e) { /* letters off */ }
  }
  delays.set(key, best);
  return best;
}
export async function standingOf(actorLike, community, region = homeland()) {
  const a = actorOf(actorLike);
  const deeds = (a?.flags?.[MOD]?.deeds ?? []).map(SR.normDeed);
  const table = new Map();
  for ( const d of deeds ) if ( d.region && d.region !== region && !table.has(d.region) ) table.set(d.region, await newsDelay(d.region, region));
  const massOf = r => st()?.letters?.rules?.massOf?.(r) ?? "old";
  const out = SR.standingIn(deeds, community, region, game.time.worldTime, {delay: from => table.get(from) ?? null, massOf});
  return {...out, label: SR.communityLabel(community, {sphere: sphereOf(region, yearNow()), year: yearNow()})};
}
export async function standingAll(actorLike, region = homeland()) {
  const a = actorOf(actorLike);
  const keys = [...new Set((a?.flags?.[MOD]?.deeds ?? []).map(d => SR.normDeed(d).community))];
  const out = [];
  for ( const k of keys ) out.push({community: k, ...(await standingOf(a, k, region))});
  return out;
}

/* ---- Rank ---- */
const ladderNow = (region = homeland(), year = yearNow()) => SR.ladderFor(sphereOf(region, year), year);
export function rankOf(actorLike) {
  const r = SR.normRank(actorOf(actorLike)?.flags?.[MOD]?.rank);
  if ( !r ) return null;
  const now = SR.carryRank(r, ladderNow());
  return {...now, word: SR.rankWord(now), ladder: now.ladder, steps: SR.ladder(now.ladder)};
}
export async function setRank(actorLike, step, {ladder = null, why = ""} = {}) {
  const a = actorOf(actorLike);
  if ( !game.user.isGM || !a ) return null;
  if ( step === null ) { await a.unsetFlag(MOD, "rank"); return null; }
  const r = SR.normRank({ladder: ladder ?? ladderNow(), step, why});
  await a.setFlag(MOD, "rank", r);
  return r;
}
export async function moveRank(actorLike, event) {
  const a = actorOf(actorLike), r = rankOf(a);
  if ( !game.user.isGM || !r ) return null;
  const next = SR.moveRank(r, event);
  await a.setFlag(MOD, "rank", next);
  return next;
}
export const rankShift = (charLike, npcLike) => SR.rankShift(rankOf(charLike), rankOf(npcLike));

/* ---- Feuds ---- */
const feudStore = () => { try { return (game.settings.get(MOD, "feuds") ?? []).map(SR.normFeud).filter(Boolean); } catch (e) { return []; } };
export const feuds = () => feudStore();
async function saveFeuds(list) { if ( game.user.isGM ) await game.settings.set(MOD, "feuds", list); }
export async function startFeud({a, b, cause = "", heat = 2} = {}) {
  if ( !game.user.isGM ) return null;
  const f = SR.normFeud({id: foundry.utils.randomID(), a, b, cause, heat, since: game.time.worldTime});
  if ( !f ) return null;
  await saveFeuds([...feudStore(), f]);
  return f;
}
export async function endFeud(id, how = "truce") {
  const list = feudStore(), f = list.find(x => x.id === id);
  if ( !game.user.isGM || !f ) return null;
  f.ended = game.time.worldTime; f.how = how;
  await saveFeuds(list);
  return f;
}
export async function feudKilling(id) {
  const list = feudStore(), i = list.findIndex(x => x.id === id);
  if ( !game.user.isGM || i < 0 ) return null;
  list[i] = SR.feudKilling(list[i]);
  await saveFeuds(list);
  return list[i];
}
export const feudLawHere = ({region = homeland(), year = yearNow()} = {}) => { const law = SR.feudLaw(region, year, sphereOf(region, year)); return {...law, settle: SR.settlements(law, year)}; };
/** What a person is, for the feud sides: family name, the lines they belong to, clan, tribe, house, factions. */
export function feudInfo(actorLike) {
  const a = actorOf(actorLike);
  if ( !a ) return {};
  const s = a.system ?? {}, val = v => (typeof v === "string" ? v : typeof v?.value === "string" ? v.value : "");
  const words = String(a.name ?? "").trim().split(/\s+/);
  const kin = a.flags?.[MOD]?.kin;
  const lines = [kin?.line, api()?.kin?.lineOf?.(a)?.id].filter(Boolean);
  const family = a.flags?.["wodx-creation"]?.family ?? (kin?.line ? api()?.kin?.lines?.().find(l => l.id === kin.line)?.family : null) ?? (words.length > 1 ? words.at(-1) : "");
  let factions = [];
  try { factions = (api()?.factions?.state?.()?.factions ?? []).filter(f => (f.members ?? []).includes(a.id) || f.leader === a.id).map(f => f.name); } catch (e) { factions = []; }
  return {family, lines, clan: val(s.clan), tribe: val(s.tribe), house: val(s.house) || val(s.kith), factions};
}
export const feudSidesOf = actorLike => SR.feudSides(feudStore(), feudInfo(actorLike));
export const feudRows = () => SR.feudRows(feudStore());
export function feudsOf(actorLike) {
  const info = feudInfo(actorLike);
  return feudStore().filter(f => !f.ended && (SR.onSide(f.a, info) || SR.onSide(f.b, info)))
    .map(f => ({...f, side: SR.onSide(f.a, info) ? "a" : "b", foe: SR.onSide(f.a, info) ? f.b.name : f.a.name}));
}
/** A short line for the sheet. */
export function sheetLine(actorLike) {
  const r = rankOf(actorLike), fs = feudsOf(actorLike);
  const parts = [r ? `Rank: ${r.word}` : "", ...fs.map(f => `In feud with ${f.foe}`)].filter(Boolean);
  return parts.length ? `<p class="wodx-quiet wodx-standing-line">${parts.map(esc).join(". ")}.</p>` : "";
}
export const rules = SR;
