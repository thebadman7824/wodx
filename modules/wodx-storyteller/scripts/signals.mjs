/**
 * The signal board, the Foundry side (B3651). The rules are in signals-rules.mjs.
 *
 * Other systems already announce what happens through their own hooks: a fight starts, a town falls sick, hunters
 * close in, a cult forms, someone is arrested or tried, a dated event fires, a town changes, a grudge moves, a battle
 * turns, a secret comes out, a project goes wrong, a ruler falls, a crime is seen, an heir inherits, someone crosses
 * into another world, a child is born, two people marry, a caravan is lost. This file listens to those hooks and posts
 * a short signal for each one to one shared list, so nothing else has to change. Rumours and tales post their own when
 * they start (rumours.mjs). The omens system reads the same list (omens.mjs signals), and Threads of Fate weaves its
 * storylines from it.
 *
 * Only the active Storyteller writes the list. Every post also calls the hook wodxSignal with the clean signal, so a
 * weight 3 signal can wake the weave at once.
 */
import * as S from "./signals-rules.mjs";
import * as HR from "./hunters-rules.mjs";
import {MOD, chron, isActiveGM, setting, mutate} from "./core.mjs";

const now = () => game.time?.worldTime ?? 0;
const dayOf = t => Math.floor((Number(t) || 0) / S.DAY);
const idOf = x => (typeof x === "string" ? x : (x?.id ?? x?._id ?? ""));
const nameOf = x => (typeof x === "string" ? (game.actors?.get?.(x)?.name ?? "") : (x?.name ?? ""));
const regionOfScene = scene => { try { const r = chron()?.world?.here?.(scene ?? null); return (typeof r === "string" ? r : r?.id) || ""; } catch (e) { return ""; } };
const sceneName = scene => scene?.navName || scene?.name || "";

export function registerSignalSettings() {
  game.settings.register(MOD, "signalBoard", {scope: "world", config: false, type: Array, default: []});
}

/** The live board, cleaned. */
export const board = () => S.prune(setting("signalBoard") ?? [], now());

/** Post a signal (active Storyteller only). Returns the clean signal, or null. */
export async function post(sig = {}) {
  if ( !isActiveGM() ) return null;
  const t = now();
  const out = await mutate("signalBoard", cur => {
    const r = S.post(cur ?? [], {...sig, at: sig.at ?? t}, t);
    return {value: r.board, result: r.signal};
  });
  if ( out ) Hooks.callAll("wodxSignal", out);
  return out ?? null;
}

/** Mark signals as used by a storyline, or free them again. */
export const markUsed = (keys, story) => mutate("signalBoard", cur => ({value: S.markUsed(cur ?? [], keys, story)}));
export const release = story => mutate("signalBoard", cur => ({value: S.release(cur ?? [], story)}));

const send = sig => { post(sig).catch(e => console.error(`${MOD} | signals`, e)); };

/* ---- What the hooks say, as signals ---- */

/** Each listener: hook name and a function from its payload to a signal (or null). Exported for the gate. */
export const LISTEN = {
  wodxFightStarted: ({combat} = {}) => {
    const sc = combat?.scene ?? null;
    return {key: `fight:${sc?.id ?? "here"}:${dayOf(now())}`, kind: "fight", region: regionOfScene(sc), weight: 1, where: sceneName(sc), what: "A fight broke out", from: "combat"};
  },
  wodxContagion: ({phase, market, disease} = {}) => (phase === "start"
    ? {key: `plague:${market}:${idOf(disease) || disease}`, kind: "plague", weight: 2, what: `${disease?.name ?? disease ?? "A sickness"} breaks out`, where: String(market ?? ""), from: "contagion"} : null),
  wodxHunterStage: ({region, stage, pressure} = {}) => {
    const i = HR.stageIndex(pressure);
    if ( i < 2 ) return null;
    return {key: `hunters:${region}`, kind: "hunters", region, weight: i >= 4 ? 3 : (i >= 3 ? 2 : 1), what: `Hunters: ${stage}`, from: "hunters"};
  },
  wodxCultFormed: ({cult, founder} = {}) => ({key: `cult:${idOf(cult)}`, kind: "cult", weight: 2, what: `${cult?.name ?? "A cult"} gathers`, who: nameOf(founder), from: "cults"}),
  wodxCultNoticed: ({cult, band} = {}) => ({key: `cult:${idOf(cult)}`, kind: "cult", weight: band === "moved" ? 3 : 2, what: `${cult?.name ?? "A cult"} is ${band}`, from: "cults"}),
  wodxArrest: ({actor, name, region} = {}) => ({key: `arrest:${actor}`, kind: "arrest", about: actor, region, weight: 2, who: name, what: `${name ?? "Someone"} is arrested`, from: "law"}),
  wodxVerdict: ({actor, name, region, guilty} = {}) => ({key: `trial:${actor}`, kind: "trial", about: actor, region, weight: guilty ? 3 : 2, who: name, what: guilty ? "Found guilty" : "Set free", from: "law"}),
  wodxSentence: ({actor, region, mark} = {}) => ({key: `law:${actor}`, kind: "law", about: actor, region, weight: 2, what: `Sentenced${mark ? `: ${mark?.label ?? mark}` : ""}`, from: "law"}),
  wodxEventFired: (ev = {}) => (ev?.id ? {key: `event:${ev.id}`, kind: "event", region: String(ev.region ?? ""), weight: 2, what: ev.summary || ev.name || "", from: "events"} : null),
  wodxTown: ({town, kind, text, big, name, region} = {}) => ({key: `town:${town}:${kind}`, kind: "town", region, weight: big ? 3 : 1, where: name, what: text, from: "towns"}),
  wodxGrudgeMove: ({npc: n, character, move} = {}) => ({key: `grudge:${idOf(n)}:${idOf(character)}`, kind: "grudge", about: idOf(character), weight: 2, who: nameOf(n), what: String(move?.label ?? move?.kind ?? move ?? "A grudge moves"), from: "memory"}),
  wodxBattle: ({battle, step} = {}) => ({key: `war:${idOf(battle) || battle?.key || "battle"}`, kind: "war", region: String(battle?.region ?? ""), weight: 2, what: battle?.name ?? "A battle", where: battle?.where ?? "", from: "battles"}),
  wodxSecretExposed: ({holder, secret, by} = {}) => ({key: `secret:${idOf(holder)}:${idOf(secret) || secret?.key || ""}`, kind: "rumour", about: idOf(holder), weight: 2, who: nameOf(holder), what: "A secret comes out", from: "people"}),
  wodxProjectComplication: ({actor, task} = {}) => ({key: `project:${idOf(actor)}:${idOf(task) || task?.key || ""}`, kind: "project", about: idOf(actor), weight: 1, what: `${task?.name ?? task?.title ?? "A project"} goes wrong`, from: "tasks"}),
  wodxRegimeTurn: ({region, year, cause, note} = {}) => ({key: `seat:${region}:${year}`, kind: "seat", region, weight: 3, what: note || cause || "The rule changes hands", from: "law"}),
  wodxCrimeSeen: ({of, what, named} = {}) => ({key: `crime:${of}:${dayOf(now())}`, kind: "rumour", about: of, weight: named ? 2 : 1, what: String(what ?? "A crime was seen"), from: "wanted"}),
  wodxInheritance: ({dead, heir} = {}) => ({key: `fate:heir:${idOf(dead)}`, kind: "fate", about: idOf(heir), weight: 2, who: nameOf(dead), what: `${nameOf(heir) || "An heir"} inherits`, from: "inheritance"}),
  wodxBreach: (p = {}) => ({key: `breach:${dayOf(now())}:${p?.by?.uuid ?? ""}`, kind: "breach", weight: 2, who: p?.by?.name ?? "", what: "A breach of the Masquerade", from: "breach"}),
  wodxShroudCrossing: ({back, place} = {}) => ({key: `breach:shroud:${dayOf(now())}`, kind: "breach", weight: 1, where: place?.where ?? "", what: back ? "Someone came back across the Shroud" : "Someone crossed the Shroud", from: "otherworlds"}),
  wodxDreamingGate: ({out} = {}) => ({key: `breach:dreaming:${dayOf(now())}`, kind: "breach", weight: 1, what: out ? "Someone came out of the Dreaming" : "Someone went into the Dreaming", from: "otherworlds"}),
  wodxBirth: ({mother, child} = {}) => (child ? {key: `arrival:birth:${idOf(child)}`, kind: "arrival", about: idOf(mother), weight: 1, who: nameOf(mother), what: "A child is born", from: "family"} : null),
  wodxMarried: ({a, b} = {}) => ({key: `tale:wed:${idOf(a)}:${idOf(b)}`, kind: "tale", weight: 1, who: `${nameOf(a)} and ${nameOf(b)}`, what: "A wedding", from: "hearts"}),
  wodxCaravan: ({phase, caravan} = {}) => (phase === "lost" ? {key: `event:caravan:${idOf(caravan)}`, kind: "event", weight: 1, what: `${caravan?.name ?? "A caravan"} is lost`, from: "caravans"} : null)
};

export function registerSignalHooks() {
  for ( const [hook, fn] of Object.entries(LISTEN) ) {
    Hooks.on(hook, p => {
      if ( !isActiveGM() ) return;
      let s = null;
      try { s = fn(p ?? {}); } catch (e) { console.error(`${MOD} | signals: ${hook}`, e); }
      if ( s ) send(s);
    });
  }
}

/** The board as the omens system reads it. */
export const forOmens = () => S.forOmens(board(), now());

export const api = () => ({rules: S, board, post, markUsed, release, forOmens, listen: Object.keys(LISTEN)});
