/**
 * The crossover referee (WoDX Chronicle 0.17.0): one place for what happens when one line's power meets a creature
 * of another line. Pure rules, harness-tested. The cases are in data/crossover.mjs and rest on the rules-clash
 * table (data/rules-clashes.mjs). The window and the roll card are in referee.mjs.
 *
 *   profileOf(actor)   the line of an actor, as WoDX Combat and Actions name it (the shared flag first)
 *   bookOf(era)        "da" for the Dark Ages books (classical, living gods, Dark Ages, Long Night), else "late"
 *   casesFor(q)        the cases that fit who acts, on whom, with what, in this era's book
 *   testFor(c, ctx)    what the referee works out from the two sheets: a verdict and, where the books give one, a roll
 *   referee(q, ctx)    both together: [{case, test}]
 */
import {CASES, POWERS, LINES} from "../data/crossover.mjs";

export {CASES, POWERS, LINES};

const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
/** 4th, 11th, 12th, 13th, 1st, 2nd, 3rd, 21st. */
export const ordinal = g => { const v = n(g), t = v % 100; return `${v}${t >= 11 && t <= 13 ? "th" : ({1: "st", 2: "nd", 3: "rd"}[v % 10] ?? "th")}`; };

const TYPE_MAP = {
  vampire: "kindred", werewolf: "lupine", "changing breed": "lupine", changingbreed: "lupine", mage: "mage",
  changeling: "fae", wraith: "wraith", hunter: "hunter", demon: "demon", mummy: "mummy", exalted: "exalted",
  creature: "beast", mortal: "mortal", spirit: "spirit"
};

/** The line of an actor: the profile WoDX Combat keeps (flags.world.wodx.profile), else its sheet type and variant. */
export function profileOf(actor) {
  if ( !actor ) return "mortal";
  const flag = actor.flags?.world?.wodx?.profile;
  if ( flag && LINES[flag] ) return flag;
  let t = String(actor.type ?? "").toLowerCase();
  if ( t === "pc" ) t = String(actor.system?.settings?.splat ?? "mortal").toLowerCase();
  let key = TYPE_MAP[t] ?? "mortal";
  const variant = [actor.system?.settings?.variant, actor.system?.variant].map(v => (typeof v === "string" ? v : Object.values(v ?? {}).join(" "))).join(" ").toLowerCase();
  if ( key === "mortal" && /ghoul|revenant/.test(variant) ) key = "ghoul";
  if ( key === "wraith" && /spectre|shadow/.test(variant) ) key = "spirit";
  return key;
}

/** The Dark Ages books rule the Dark Ages, the Long Night and the eras before; every later era takes V20 and its kin. */
export const DA_ERAS = ["classical", "living-gods", "dark-ages", "long-night"];
export const bookOf = era => (DA_ERAS.includes(String(era ?? "").toLowerCase()) ? "da" : "late");

/**
 * Hunter: The Reckoning's years: from 1999, or from 2023 on the Future Darkness branch; the Time of Judgment and
 * the future eras always. The same reading as WoDX Actions' hunterLine() (B42).
 */
export function isReckoning(era, year = null, {futureBranch = false} = {}) {
  const e = String(era ?? "").toLowerCase();
  const y = year === null || year === undefined || year === "" ? null : Number(year);
  if ( [...DA_ERAS, "renaissance", "age-of-reason", "victorian", "wild-west", "great-war", "mid-century"].includes(e) ) return false;
  if ( futureBranch && Number.isFinite(y) && y >= 1500 && y < 2023 && ["modern", "future-darkness", ""].includes(e) ) return false;
  if ( ["time-of-judgment", "future-darkness", "time-of-future-judgement"].includes(e) ) return true;
  if ( Number.isFinite(y) ) return y >= 1999;
  return !/dark|medieval/.test(e);
}

const fits = (list, key) => !list?.length || list.includes("any") || list.includes(key);
const needOk = (need, faith, reckoning) => !need || (need === "faith" && faith > 0) || (need === "faith3" && faith >= 3) || (need === "faith4" && faith >= 4)
  || (need === "imbued" && !!reckoning);

/**
 * The cases for one meeting. q: {power, from, to, book, actorFaith, targetFaith, reckoning}.
 * A case with `needs` sits first (True Faith comes before anything else), then cases for the target's own line,
 * then cases open to any line. A fallback case shows only when nothing more particular fits.
 */
export function casesFor({power, from = "mortal", to = "mortal", book = "late", actorFaith = 0, targetFaith = 0, reckoning = false} = {}, cases = CASES) {
  const hits = cases.filter(c => c.power === power && fits(c.from, from) && fits(c.to, to) && (!c.book || c.book === book)
    && needOk(c.needs, c.watcherFaith ? n(actorFaith) : n(targetFaith), reckoning && (c.watcherFaith ? from : to) === "hunter"));
  const particular = hits.filter(c => !c.fallback);
  const list = particular.length ? particular : hits;
  const rank = c => (c.needs ? 0 : c.to.includes(to) ? 1 : 2);
  return [...list].sort((a, b) => rank(a) - rank(b));
}

/**
 * Auspex against Obfuscate (V20 p. 142; V20 Dark Ages p. 195), the same reading as WoDX NPC's pierce() (B89).
 * Returns {result: "sees" | "roll" | "contest" | "blind", diff, why}.
 */
export function pierce(auspex, obfuscate, book = "late") {
  const a = n(auspex), o = n(obfuscate);
  if ( o <= 0 ) return {result: "sees", diff: null, why: "not hidden by Obfuscate"};
  if ( a <= 0 || a < o ) return {result: "blind", diff: null, why: `Obfuscate ${o} against Auspex ${a}: unseen`};
  if ( book !== "da" ) {
    if ( a === o ) return {result: "contest", diff: 7, why: `Auspex ${a} equals Obfuscate ${o}: a resisted roll (V20 p. 142)`};
    return {result: "roll", diff: Math.max(2, 7 - (a - o)), why: `Auspex ${a} over Obfuscate ${o} (V20 p. 142)`};
  }
  return {result: "roll", diff: Math.max(2, 8 - (a - o)), why: `Auspex ${a} against Obfuscate ${o} (V20 Dark Ages p. 195)`};
}

/** A roll the referee offers: who rolls, the dice, the difficulty, and what the successes do. */
const roll = (who, label, dice, difficulty, then) => ({who, label, dice: Math.max(0, n(dice)), difficulty, then});

/**
 * What the referee works out for a case. ctx: {actor, target, book, rating}; actor and target are plain sheets
 * from referee.mjs sheetOf: {name, profile, generation, willpower, faith, arete, spheres: {}, auspex, obfuscate,
 * perception, awareness, manipulation, subterfuge, wits, occult, day, night, powerTrait}. rating: the power's dots.
 * Returns {verdict: "works" | "fails" | "resisted" | "roll" | "note", text, roll?, rolls?}.
 */
export function testFor(c, {actor = {}, target = {}, book = "late", rating = 0} = {}) {
  const t = c?.test ?? {kind: "none"};
  const A = actor.name || "The one acting", T = target.name || "the target";
  switch ( t.kind ) {
    case "faith": {
      const f = n(target.faith);
      if ( f >= t.immuneAt ) return {verdict: "fails", text: `${T} has True Faith ${f}: the power does nothing.`};
      if ( t.roll ) return {verdict: "roll", text: `${T} may spend 1 Willpower and roll Faith ${f} at 7; each success cancels one of the power's.`,
        roll: roll("target", "Faith against the power", f, 7, "Each success cancels one of the power's successes.")};
      return {verdict: "resisted", text: `${T} may spend 1 Willpower: ${f} comes off the power's successes.`};
    }
    case "generation": {
      const a = n(actor.generation), g = n(target.generation);
      if ( !a || !g ) return {verdict: "note", text: "Set both Generations on the sheets to check this."};
      if ( g < a ) return {verdict: "fails", text: `${T} is of the ${ordinal(g)} Generation, stronger blood than ${A}'s ${ordinal(a)}: Dominate cannot touch them.`};
      return {verdict: "works", text: `${T} (${ordinal(g)} Generation) is not of stronger blood than ${A} (${ordinal(a)}): it works by its own book.`};
    }
    case "dominion": {
      const shield = Math.max(n(target.day), n(target.night)), r = n(rating);
      if ( !r ) return {verdict: "note", text: `${T}'s Day or Night is ${shield}: give the power's rating to check.`};
      return shield >= r ? {verdict: "fails", text: `${T}'s Day or Night (${shield}) is at least the power's rating (${r}): it fails.`}
        : {verdict: "works", text: `${T}'s Day or Night (${shield}) is below the power's rating (${r}): it works by its own book.`};
    }
    case "willpower": {
      const w = n(target.willpower);
      return {verdict: "works", text: `The power's roll is made against ${T}'s Willpower${w ? ` (difficulty ${Math.min(10, Math.max(2, w))})` : ""}.`};
    }
    case "counter": {
      const who = t.actorRolls ? actor : target, name = t.actorRolls ? A : T;
      const arete = n(who.arete);
      if ( t.sphere && n(who.spheres?.[t.sphere]) < 1 ) return {verdict: "works", text: `${name} has no Mind: no countermagick against this. It works by its own book.`};
      if ( !arete ) return {verdict: "note", text: `${name} shows no Arete on the sheet.`};
      return {verdict: "roll", text: `${name} may counter it: Arete ${arete} at difficulty 7, a full action.`,
        roll: roll(t.actorRolls ? "actor" : "target", "Countermagick", arete, 7, "Each success takes one of the power's successes away.")};
    }
    case "nightfolk": {
      const dice = n(target.wits) + n(target.occult), cap = n(target.powerTrait);
      return {verdict: "roll", text: `${T} may counter the magick: Wits + Occult (${dice} dice)${cap ? `, no more than ${cap} successes count (their power trait)` : ", capped by their own power trait"}.`,
        roll: roll("target", "Wits + Occult against the magick", dice, 6, cap ? `Up to ${cap} successes cancel the magick's.` : "Successes cancel the magick's, up to the target's power trait.")};
    }
    case "pierce": {
      const watcher = actor.profile === "beast" ? Math.max(1, n(actor.auspex)) : n(actor.auspex);
      const p = pierce(watcher, target.obfuscate, book);
      const dice = n(actor.perception) + n(actor.awareness);
      if ( p.result === "sees" ) return {verdict: "works", text: `${T} is not hidden by Obfuscate.`};
      if ( p.result === "blind" ) return {verdict: "fails", text: `${p.why}. ${A} does not see through it.`};
      if ( p.result === "contest" ) return {verdict: "roll", text: `${p.why}.`, rolls: [
        roll("actor", "Perception + Awareness", dice, 7, "Needs more successes than the hider."),
        roll("target", "Manipulation + Subterfuge", n(target.manipulation) + n(target.subterfuge), 7, "The hider stays unseen on a tie or more.")]};
      return {verdict: "roll", text: `${p.why}: Perception + Awareness at ${p.diff}.`, roll: roll("actor", "Perception + Awareness", dice, p.diff, "One success sees through it.")};
    }
    case "imbued":
      return {verdict: "fails", text: `${T} is imbued: second sight shields them from it.`};
    case "unseen": {
      const a = n(actor.auspex);
      if ( !a ) return {verdict: "note", text: `${A} needs Auspex, or a sense power of their own line, to look for it.`};
      return {verdict: "roll", text: "A resisted roll at 7: the one looking needs more successes.", rolls: [
        roll("actor", "Perception + Awareness", n(actor.perception) + n(actor.awareness), 7, "Needs more successes than the one hidden."),
        roll("target", "Manipulation + Subterfuge", n(target.manipulation) + n(target.subterfuge), 7, "Stays unseen on a tie or more.")]};
    }
    case "witness": {
      const sleeper = target.profile === "mortal" && !n(target.faith);
      return sleeper ? {verdict: "works", text: `${T} is a Sleeper and counts as a witness.`} : {verdict: "fails", text: `${T} is not a Sleeper and does not count as a witness.`};
    }
    case "possess":
      return {verdict: "roll", text: "A resisted Willpower roll at 6: the newcomer must win; a tie keeps the one already inside.", rolls: [
        roll("actor", "Willpower (the newcomer)", actor.willpower, 6, "Must beat the holder's successes."),
        roll("target", "Willpower (the one inside)", target.willpower, 6, "Keeps the body on a tie or better.")]};
    default:
      return {verdict: "note", text: ""};
  }
}

/** Every case for a meeting with what it works out. q as casesFor; ctx as testFor. */
export function referee(q = {}, ctx = {}) {
  return casesFor(q).map(c => ({case: c, test: testFor(c, {book: q.book, ...ctx})}));
}

/**
 * Successes on d10 faces (V20): each 1 cancels a success; no success rolled and a 1 showing is a botch.
 * Returns {successes, botch}.
 */
export function successes(faces = [], difficulty = 6) {
  const hits = faces.filter(f => f >= difficulty).length, ones = faces.filter(f => f === 1).length;
  return {successes: Math.max(0, hits - ones), botch: hits === 0 && ones > 0};
}

/** The powers a line can use as the one acting, for the window's list: every power some case lets this line use. */
export function powersFor(from) {
  return Object.keys(POWERS).filter(p => CASES.some(c => c.power === p && fits(c.from, from)));
}
