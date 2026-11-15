/**
 * WoDX Actions 3.26.0: what each of the 97 Dark Ages rotes does on the table, the pure rules. Each rote maps to one
 * effect keyword (for who may apply it: see effects-rules.js route) and one result, worked out from the rote's own
 * system in mage-da-rules.js and mage-da-grimoire.js (Dark Ages: Mage pp. 108-135; Grimoire pp. 20-101). A creature
 * raised or called shows on the caster's token for its time (B3752); a journey, a long extended ritual or a judgement
 * stays the Storyteller's call and is only listed.
 *
 *   result kinds   harm (levels per success, type, soak), timed (a named effect on the target), condition (a WoDX
 *                  Chronicle condition), move (a step inside the scene), note (what the caster learns), st
 *   who            self (the caster), one (the first target), each (one target per success), all (every target)
 *   lasts          reach (the p. 103 ladder by successes), scene, night (to the next dawn), turns, days or weeks per
 *                  success (per), or seconds
 */
import * as M from "./mage-da-rules.js";
import { stOutcomes } from "./effects-rules.js";
import {DAY} from "../../wodx-chronicle/scripts/terms.mjs";

const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

export const H = (kw, per, type, o = {}) => ({kw, kind: "harm", per, type, soak: o.soak !== false, who: o.who ?? "one", also: o.also ?? null, ask: !!o.ask, fixed: !!o.fixed});
export const T = (kw, name, lasts, who = "one", o = {}) => ({kw, kind: "timed", name, lasts, who, ...o});
export const C = (kw, condition, name, lasts, who = "one") => ({kw, kind: "condition", condition, name, lasts, who});
export const N = (kw = "sense") => ({kw, kind: "note", who: "self"});
export const S = (kw = "free") => ({kw, kind: "st", who: "self"});
export const MV = () => ({kw: "move", kind: "move", who: "self"});
/** Healing: levels per success (lethal then bashing, or aggravated only). */
/** B5780: an effect WoDX works out itself (a path laid, a memory changed, a vision sent): act names the kind on the effects card. */
/** B5791: any keyword's own outcome (effects-rules), with its flavour: K("weather", "self", {weather: "fog"}). */
export const K = (kw, who = "self", ctx = {}) => ({kw, kind: "kw", who, ctx});
/** B5791: points into a pool (Sekhem, Willpower): per a success, or per once when fixed. */
export const P = (pool, per = 1, who = "self", o = {}) => ({kw: "charge", kind: "pool", pool, per, who, fixed: !!o.fixed});
export const A = (kw, act, o = {}) => ({kw, kind: "act", act, who: o.who ?? "one", lasts: o.lasts ?? "scene", ...o});
export const HL = (per, o = {}) => ({kw: "mend", kind: "heal", per, aggravated: !!o.aggravated, who: o.who ?? "one", ask: !!o.ask});

/** By rote id. */
export const DA_EFFECTS = {
  // Ahl-i-Batin (core)
  swiftroad: S("move"), gazesuleiman: T("ward", "Gaze of Suleiman", "reach", "self"), onefights: T("boost", "One Fights as Many", "reach", "self"),
  // Messianic Voices (core)
  theword: T("sway", "The Word", "scene"), shatteringvoid: H("harm", 2, "aggravated", {ask: true}), mortalclay: T("make", "Mortal Clay", {days: 1}, "self"),
  // Old Faith (core)
  nightdaughter: T("ward", "Night-Daughter's Skin", "reach", "self"), verdantslumber: H("harm", 1, "aggravated"), ancientwarder: T("summon", "Ancient Warder of the Land", "scene", "self"),
  // Order of Hermes (core)
  aegis: T("ward", "Aegis Magicus", {seconds: 43200}, "one"), hermesbrand: T("ward", "Hermes' Brand", "reach", "self"), incorruptible: S(), wrathapollo: H("harm", 3, "aggravated", {who: "all", ask: true}),
  // Spirit-Talkers (core)
  heartvoice: N(), dreamblade: T("ward", "Dream Within the Blade", "reach", "self"), rightfulking: T("sway", "The Rightful King", "scene", "each"),
  // Valdaermen (core)
  dwarfhoard: N(), unsleeping: T("summon", "Unsleeping Swords", "reach", "self"), emptyroads: T("sway", "Curse of Empty and Endless Roads", "reach"),
  // Ahl-i-Batin (Grimoire)
  "g-dhikr": N(), "g-closetdance": MV(), "g-tearsallah": H("harm", 1, "lethal", {also: {per: 1, type: "bashing"}}),
  "g-summoning": S("summon"), "g-binding": S("bind"), "g-commanding": S(),
  // Messianic Voices (Grimoire)
  "g-comeforsouls": T("fear", "Terror of the Souls", {turns: 20}, "each"), "g-plowshares": T("sway", "Swords into Plowshares", "scene", "each"), "g-revokeadam": T("sway", "Speech taken", "reach"),
  "g-72names": T("summon", "Golem of the 72 Names", "reach", "self"),
  // Old Faith (Grimoire)
  "g-glamour": T("ward", "Bewitching Glamour", "night", "self"), "g-bitterfruit": H("harm", 1, "lethal", {soak: false, ask: true}), "g-circe": T("shape", "Circe's Enchantment", "reach"), "g-dowsing": N(),
  "g-slumber": S(), "g-eyehunter": T("sight", "Eye of the Hunter", "reach", "self"), "g-faeriegate": S("sideways"), "g-giantsdance": T("summon", "Stone giant", "scene", "self"),
  "g-healsight-s": N(), "g-healsight-w": N(), "g-hollowhill": S(), "g-magicmirror": N(), "g-merlinsride": S("move"), "g-bounty": S(),
  "g-oracularhead": S("know"), "g-stormbrew": S("weather"), "g-straysod": T("fortune", "Led astray", "reach", "each"), "g-witchwind": T("weather", "Witch's Wind", "scene", "self"),
  "g-withering": T("harm", "Withering Curse", {days: 1}, "one"), "g-flyingoint": T("sideways", "Flying Ointment", "night", "self"), "g-fourthieves": T("ward", "Four Thieves Vinegar", {seconds: 14400}, "self"), "g-lovephilter": T("sway", "Love Philter", "scene"),
  // Spirit-Talkers (Grimoire)
  "g-animalspeech": N(), "g-animalorders": T("sway", "Animal orders", "scene", "each"), "g-banishwar": T("sway", "Spirits of War banished", "scene", "each"), "g-bindspirit": S("bind"), "g-curseshift": S(), "g-deadwords": N(),
  "g-denycharm": T("ward", "Deny the Charm of Death", "reach", "self"), "g-exorcism-w": T("banish", "Exorcised", "scene"), "g-exorcism-c": T("banish", "Exorcised", "scene"), "g-horsebringer": S(),
  "g-ironglare": T("ward", "Iron Glare", "scene", "self"), "g-summons": T("sway", "Irresistible Summons", {days: 1}), "g-lordsbane": T("fortune", "Lords' Bane", "scene"),
  "g-otherskin": T("shape", "Otherskin", "night", "self"), "g-antics": T("hasten", "Sacred Antics", {turns: 2}, "self"),
  "g-selfpossess": T("ward", "Self Possession", "scene", "self"), "g-shelterwinds": T("ward", "Sheltering Winds", "scene", "self"),
  "g-slipshadow": T("summon", "Shadow slipped free", "scene", "self"), "g-slowdream": T("hasten", "Slow Dream", "scene", "each", {slow: true}), "g-spiritarmy": T("summon", "Spirit Army", "scene", "self"),
  "g-guidedarrow": T("fortune", "Spirit-Guided Arrow", "scene", "self"), "g-welcomewaters": T("summon", "Arms of water", "scene", "self"), "g-dreamblade2": T("ward", "Dreamblade", "scene", "self"),
  "g-willowbody": T("shape", "Willow Body", {turns: 1}, "self"),
  // Valdaermen (Grimoire)
  "g-baldur": T("ward", "Baldur's Blessing", "scene"), "g-directstrike": T("boost", "Direct Strike", "scene", "self"), "g-battlesmite": C("hold", "blinded", "Battle Smite", "scene", "each"),
  "g-berserk": T("hasten", "Berserkgangr", {turns: 1}, "one"), "g-gungnir": T("ward", "Borrowing Gungnir", "scene", "self"), "g-bridgewill": T("move", "Bridge of Will", "scene", "each"),
  "g-cunningsight": N(), "g-firekiller": S("light"), "g-findinghere": N(), "g-tracking": N(), "g-frostbite": T("hold", "Frostbite", "scene"), "g-fylgja": T("ward", "Fylgja", "reach", "self"),
  "g-lovemagic": T("sway", "Love Magic", "reach"), "g-mimir": N(), "g-hlidskialf": N(), "g-scornpole": T("fortune", "Scorn Pole", {days: 1}, "one", {curse: true}),
  "g-skald": T("fortune", "Skald's Curse or Blessing", "reach", "each"), "g-skogarmathur": T("sway", "Outlawed", {weeks: 1}, "one"), "g-snowglide": T("hasten", "Snow Glide", "scene", "self"), "g-summonpack": T("summon", "The Pack", "scene", "self"), "g-switch": S(),
  "g-wavecalmer": T("weather", "Wave Calmer", {seconds: 3600}, "self")
};

/** The p. 103 ladder as a WoDX Chronicle timed duration (one turn, a scene, a day, a month, six months; then the Storyteller). */
export function daDuration(successes) {
  const s = Math.max(1, Math.min(6, n(successes)));
  const label = s <= 5 ? M.DURATION[s - 1][1] : "as the Storyteller sets";
  const timed = s === 1 ? {kind: "rounds", rounds: 1} : s === 2 ? {kind: "scene"} : s === 3 ? {kind: "time", seconds: DAY}
    : s === 4 ? {kind: "time", seconds: 30 * DAY} : s === 5 ? {kind: "time", seconds: 182 * DAY} : null;
  return {label, timed};
}

/** How long a result lasts, as {label, timed}. */
export function lastsFor(lasts, successes) {
  const s = Math.max(1, n(successes));
  if ( lasts === "reach" ) return daDuration(s);
  if ( lasts === "scene" ) return {label: "the scene", timed: {kind: "scene"}};
  if ( lasts === "night" ) return {label: "until dawn", timed: {kind: "night"}};
  if ( lasts?.seconds ) return {label: `${Math.round(lasts.seconds / 3600)} hours`, timed: {kind: "time", seconds: lasts.seconds}};
  if ( lasts?.turns ) { const t = lasts.turns * s; return {label: `${t} turn${t === 1 ? "" : "s"}`, timed: {kind: "rounds", rounds: t}}; }
  if ( lasts?.days ) { const d = lasts.days * s; return {label: `${d} day${d === 1 ? "" : "s"}`, timed: {kind: "time", seconds: d * DAY}}; }
  if ( lasts?.weeks ) { const w = lasts.weeks * s; return {label: `${w} week${w === 1 ? "" : "s"}`, timed: {kind: "time", seconds: w * 7 * DAY}}; }
  return {label: "the scene", timed: {kind: "scene"}};
}

/**
 * What a rote does with its successes, in the shape effects-rules.js outcome() returns, plus who it lands on.
 * Returns [{key, who, out}] (an empty list when the rote has no entry or the spell failed).
 */
export function daOutcomes(rote, successes) {
  return outcomesOf(DA_EFFECTS[rote?.id], {key: DA_EFFECTS[rote?.id]?.kw, label: rote?.name}, successes, String(rote?.system ?? ""));
}

/** One spec (from the helpers above) worked out with its successes: [{key, who, ask?, st?, out}]. */
export function outcomesOf(spec, base, successes, text = "") {
  const s = n(successes);
  if ( !spec || s < 1 ) return [];
  // B5780: a chain of keywords: each part lands in turn
  if ( Array.isArray(spec) ) return spec.flatMap(x => outcomesOf(x, base, s, text));
  switch ( spec.kind ) {
    case "act": {
      const d = lastsFor(spec.lasts, s);
      const {kw, kind, act, who, lasts, ...rest} = spec;
      return [{key: kw, who, out: {...base, kind: act, ...rest, timed: d.timed, duration: d.label, successes: s, text: `${s} success${s === 1 ? "" : "es"}: ${text}`}}];
    }
    case "kw": {
      const [r] = stOutcomes([spec.kw], {strength: s, step: 2, ctx: spec.ctx ?? {}});
      if ( !r?.out ) return [];
      return [{key: spec.kw, who: spec.who, out: {...base, ...r.out, label: base.label ?? r.out.label, source: base.source ?? r.out.source, text: `${s} success${s === 1 ? "" : "es"}: ${r.out.text}`}}];
    }
    case "pool": {
      const pts = spec.fixed ? spec.per : spec.per * s;
      return [{key: "charge", who: spec.who, out: {...base, kind: "pool", pool: spec.pool, points: pts, text: `${pts} ${spec.pool} point${pts === 1 ? "" : "s"}`}}];
    }
    case "harm": {
      const lv = spec.fixed ? spec.per : spec.per * s;
      const list = [{key: spec.kw, who: spec.who, ask: !!spec.ask, out: {...base, kind: "damage", levels: lv, type: spec.type, soak: spec.soak,
        text: `${lv} ${spec.type} level${lv === 1 ? "" : "s"}${spec.soak ? ", soaked as usual" : ", not soaked"}`}}];
      if ( spec.also ) list.push({key: spec.kw, who: spec.who, ask: !!spec.ask, out: {...base, kind: "damage", levels: spec.also.per * s, type: spec.also.type, soak: spec.soak,
        text: `and ${spec.also.per * s} ${spec.also.type}`}});
      return list;
    }
    case "timed": {
      const d = lastsFor(spec.lasts, s);
      // B6016: a summoning, a made thing, the weather, a light, a crossing (and the rest whose result is not a timed
      // effect) did only put a named marker on the sheet; now they do what their keyword does, for the spec's time
      if ( OWN_KIND.has(spec.kw) ) {
        const [r] = stOutcomes([spec.kw], {strength: s, step: 2, ctx: spec.ctx ?? {}});
        if ( r?.out ) return [{key: spec.kw, who: spec.who, out: {...base, ...r.out, name: spec.name ?? r.out.name, label: spec.name ?? base.label ?? r.out.label, source: base.source ?? r.out.source,
          ...(r.out.timed !== undefined || d.timed ? {timed: d.timed ?? r.out.timed, duration: d.label} : {}), text: `${s} success${s === 1 ? "" : "es"} for ${d.label}: ${text}`}}];
      }
      return [{key: spec.kw, who: spec.who, out: {...base, kind: "timed", name: spec.name, timed: d.timed, duration: d.label, successes: s, ...timedNumbers(spec, s),
        text: `${s} success${s === 1 ? "" : "es"} for ${d.label}: ${text}`}}];
    }
    case "condition": {
      const d = lastsFor(spec.lasts, s);
      return [{key: spec.kw, who: spec.who, out: {...base, kind: "condition", condition: spec.condition, name: spec.name, timed: d.timed, duration: d.label,
        text: `${spec.name}, for ${d.label}: ${text}`}}];
    }
    case "heal": {
      const lv = spec.per * s;
      return [{key: spec.kw, who: spec.who, ask: !!spec.ask, out: {...base, kind: "heal", levels: lv, aggravated: spec.aggravated,
        text: `heals ${lv} ${spec.aggravated ? "aggravated" : "lethal or bashing"} level${lv === 1 ? "" : "s"}`}}];
    }
    case "move":
      return [{key: "move", who: "self", out: {...base, kind: "move", text: `${s} jump${s === 1 ? "" : "s"}: ${text}`}}];
    case "note":
      return [{key: spec.kw, who: "self", out: {...base, kind: "note", text: `${s} success${s === 1 ? "" : "es"}: ${text}`}}];
    default:
      return [{key: spec.kw, who: "self", st: true, out: {...base, kind: "note", text: `${s} success${s === 1 ? "" : "es"}: ${text}`}}];
  }
}

/**
 * B6011: the numbers a timed result needs to change the game, by its keyword, when the spec gives none: a Ward's
 * armour dice and a Boost's dice (one a success, five at most), a Blessing's or Curse's shift (three at most), Night
 * Sight on the token, Rise's height. A spec's own numbers win.
 */
export function timedNumbers(spec = {}, s = 1) {
  const k = spec.kw, x = Math.max(1, n(s));
  if ( k === "ward" ) return {dice: n(spec.dice) || Math.min(5, x), ...(spec.against ? {against: spec.against} : {})};
  if ( k === "boost" ) { const dice = n(spec.dice) || Math.min(5, x); return {dice: spec.sap ? -dice : dice, on: spec.on ?? "physical"}; }
  if ( k === "fortune" ) { const sh = Math.min(3, x); return {shift: spec.curse ? sh : -sh}; }
  if ( k === "sight" ) return {vision: true};
  if ( k === "rise" ) return {feet: n(spec.feet) || 5 * x};
  return {};
}

/** Keywords whose own result is not a timed effect (B6016). */
const OWN_KIND = new Set(["summon", "make", "weather", "light", "move", "sideways", "banish", "place", "work", "charge", "know", "sense", "harm", "trip", "imbue", "mend", "hold"]);

/** How many targets a result lands on: the caster, the first target, one per success, or all of them. */
export function targetCount(who, successes, available) {
  if ( who === "self" ) return 0;
  if ( who === "one" ) return Math.min(1, available);
  if ( who === "each" ) return Math.min(Math.max(1, n(successes)), available);
  return available;
}
