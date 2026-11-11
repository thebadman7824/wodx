/**
 * WoDX Actions 3.26.0: what each of the 97 Dark Ages rotes does on the table, the pure rules. Each rote maps to one
 * effect keyword (for who may apply it: see effects-rules.js route) and one result, worked out from the rote's own
 * system in mage-da-rules.js and mage-da-grimoire.js (Dark Ages: Mage pp. 108-135; Grimoire pp. 20-101). A rote whose
 * result is a creature, a journey, a long ritual or a judgement stays the Storyteller's call and is only listed.
 *
 *   result kinds   harm (levels per success, type, soak), timed (a named effect on the target), condition (a WoDX
 *                  Chronicle condition), move (a step inside the scene), note (what the caster learns), st
 *   who            self (the caster), one (the first target), each (one target per success), all (every target)
 *   lasts          reach (the p. 103 ladder by successes), scene, night (to the next dawn), turns, days or weeks per
 *                  success (per), or seconds
 */
import * as M from "./mage-da-rules.js";

const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

export const H = (kw, per, type, o = {}) => ({kw, kind: "harm", per, type, soak: o.soak !== false, who: o.who ?? "one", also: o.also ?? null, ask: !!o.ask, fixed: !!o.fixed});
export const T = (kw, name, lasts, who = "one", o = {}) => ({kw, kind: "timed", name, lasts, who, ...o});
export const C = (kw, condition, name, lasts, who = "one") => ({kw, kind: "condition", condition, name, lasts, who});
export const N = (kw = "sense") => ({kw, kind: "note", who: "self"});
export const S = (kw = "free") => ({kw, kind: "st", who: "self"});
export const MV = () => ({kw: "move", kind: "move", who: "self"});
/** Healing: levels per success (lethal then bashing, or aggravated only). */
export const HL = (per, o = {}) => ({kw: "mend", kind: "heal", per, aggravated: !!o.aggravated, who: o.who ?? "one", ask: !!o.ask});

/** By rote id. */
export const DA_EFFECTS = {
  // Ahl-i-Batin (core)
  swiftroad: S("move"), gazesuleiman: T("ward", "Gaze of Suleiman", "reach", "self"), onefights: S(),
  // Messianic Voices (core)
  theword: T("sway", "The Word", "scene"), shatteringvoid: H("harm", 2, "aggravated", {ask: true}), mortalclay: S(),
  // Old Faith (core)
  nightdaughter: T("ward", "Night-Daughter's Skin", "reach", "self"), verdantslumber: H("harm", 1, "aggravated"), ancientwarder: S(),
  // Order of Hermes (core)
  aegis: T("ward", "Aegis Magicus", {seconds: 43200}, "one"), hermesbrand: S(), incorruptible: S(), wrathapollo: S("harm"),
  // Spirit-Talkers (core)
  heartvoice: N(), dreamblade: T("ward", "Dream Within the Blade", "reach", "self"), rightfulking: S("sway"),
  // Valdaermen (core)
  dwarfhoard: N(), unsleeping: S(), emptyroads: S("sway"),
  // Ahl-i-Batin (Grimoire)
  "g-dhikr": N(), "g-closetdance": MV(), "g-tearsallah": H("harm", 1, "lethal", {also: {per: 1, type: "bashing"}}),
  "g-summoning": S(), "g-binding": S(), "g-commanding": S(),
  // Messianic Voices (Grimoire)
  "g-comeforsouls": T("fear", "Terror of the Souls", {turns: 20}, "each"), "g-plowshares": S("sway"), "g-revokeadam": T("sway", "Speech taken", "reach"),
  "g-72names": S(),
  // Old Faith (Grimoire)
  "g-glamour": T("ward", "Bewitching Glamour", "night", "self"), "g-bitterfruit": S("harm"), "g-circe": S("shape"), "g-dowsing": N(),
  "g-slumber": S(), "g-eyehunter": T("sight", "Eye of the Hunter", "reach", "self"), "g-faeriegate": S("sideways"), "g-giantsdance": S(),
  "g-healsight-s": N(), "g-healsight-w": N(), "g-hollowhill": S(), "g-magicmirror": N(), "g-merlinsride": S("move"), "g-bounty": S(),
  "g-oracularhead": S(), "g-stormbrew": S(), "g-straysod": T("fortune", "Led astray", "reach", "each"), "g-witchwind": S(),
  "g-withering": T("harm", "Withering Curse", {days: 1}, "one"), "g-flyingoint": S(), "g-fourthieves": S(), "g-lovephilter": S("sway"),
  // Spirit-Talkers (Grimoire)
  "g-animalspeech": N(), "g-animalorders": S(), "g-banishwar": S("sway"), "g-bindspirit": S(), "g-curseshift": S(), "g-deadwords": N(),
  "g-denycharm": T("ward", "Deny the Charm of Death", "reach", "self"), "g-exorcism-w": S(), "g-exorcism-c": S(), "g-horsebringer": S(),
  "g-ironglare": T("ward", "Iron Glare", "scene", "self"), "g-summons": S("sway"), "g-lordsbane": T("fortune", "Lords' Bane", "scene"),
  "g-otherskin": T("shape", "Otherskin", "night", "self"), "g-antics": T("hasten", "Sacred Antics", {turns: 2}, "self"),
  "g-selfpossess": T("ward", "Self Possession", "scene", "self"), "g-shelterwinds": T("ward", "Sheltering Winds", "scene", "self"),
  "g-slipshadow": S(), "g-slowdream": T("hasten", "Slow Dream", "scene", "each", {slow: true}), "g-spiritarmy": S(),
  "g-guidedarrow": T("fortune", "Spirit-Guided Arrow", "scene", "self"), "g-welcomewaters": S(), "g-dreamblade2": T("ward", "Dreamblade", "scene", "self"),
  "g-willowbody": T("shape", "Willow Body", {turns: 1}, "self"),
  // Valdaermen (Grimoire)
  "g-baldur": T("ward", "Baldur's Blessing", "scene"), "g-directstrike": S("harm"), "g-battlesmite": C("hold", "blinded", "Battle Smite", "scene", "each"),
  "g-berserk": T("hasten", "Berserkgangr", {turns: 1}, "one"), "g-gungnir": T("ward", "Borrowing Gungnir", "scene", "self"), "g-bridgewill": S("move"),
  "g-cunningsight": N(), "g-firekiller": S("light"), "g-findinghere": N(), "g-tracking": N(), "g-frostbite": S("harm"), "g-fylgja": S(),
  "g-lovemagic": S("sway"), "g-mimir": N(), "g-hlidskialf": N(), "g-scornpole": T("fortune", "Scorn Pole", {days: 1}, "one", {curse: true}),
  "g-skald": S(), "g-skogarmathur": T("sway", "Outlawed", {weeks: 1}, "one"), "g-snowglide": S("move"), "g-summonpack": S(), "g-switch": S(),
  "g-wavecalmer": S()
};

/** The p. 103 ladder as a WoDX Chronicle timed duration (one turn, a scene, a day, a month, six months; then the Storyteller). */
export function daDuration(successes) {
  const s = Math.max(1, Math.min(6, n(successes)));
  const label = s <= 5 ? M.DURATION[s - 1][1] : "as the Storyteller sets";
  const timed = s === 1 ? {kind: "rounds", rounds: 1} : s === 2 ? {kind: "scene"} : s === 3 ? {kind: "time", seconds: 86400}
    : s === 4 ? {kind: "time", seconds: 30 * 86400} : s === 5 ? {kind: "time", seconds: 182 * 86400} : null;
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
  if ( lasts?.days ) { const d = lasts.days * s; return {label: `${d} day${d === 1 ? "" : "s"}`, timed: {kind: "time", seconds: d * 86400}}; }
  if ( lasts?.weeks ) { const w = lasts.weeks * s; return {label: `${w} week${w === 1 ? "" : "s"}`, timed: {kind: "time", seconds: w * 7 * 86400}}; }
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
  switch ( spec.kind ) {
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
      return [{key: spec.kw, who: spec.who, out: {...base, kind: "timed", name: spec.name, timed: d.timed, duration: d.label, successes: s,
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

/** How many targets a result lands on: the caster, the first target, one per success, or all of them. */
export function targetCount(who, successes, available) {
  if ( who === "self" ) return 0;
  if ( who === "one" ) return Math.min(1, available);
  if ( who === "each" ) return Math.min(Math.max(1, n(successes)), available);
  return available;
}
