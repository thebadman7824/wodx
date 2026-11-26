/**
 * WoDX Actions (Dark Ages depth desk item 3, B7644-B7648): walking a Road as a faith with people in it. The pure part;
 * road-faith.js keeps the record on the character and draws the Road window.
 *
 * Book basis (in WoDX's own words; V20 Dark Ages printed pages):
 *   Ranks: an Initiate has one to three dots, an Adherent four to seven, a Paragon eight or more (pp. 111-112).
 *   A Mentor with more dots on the same Road takes one experience point off each Road dot per dot between the two,
 *   to no less than half the cost (p. 111).
 *   A Moment of Truth halves a Road dot bought in the same story, after the Mentor's share, rounded down, to no less
 *   than 1 (p. 115). Catalysts: a major sin (levels 1-3) resisted, a frenzy that risks no Road dot, months of study
 *   with a Mentor equal to the Road rating, penance, a story event (p. 115).
 *   An Apostate has changed Roads, or is known to have broken the Road's level 1 precept (p. 112).
 *   An Excommunicate is put out by one Paragon (an Initiate) or three (an Adherent); a Paragon cannot be. On the Road
 *   still, +2 difficulty to Conscience or Conviction rolls and aura penalties doubled (p. 112).
 *   Changing Roads (p. 112): a Mentor on the new Road; each Virtue the new Road does not share brought to one dot by
 *   sinning; the old Road brought to one dot; then a Moment of Truth and an extended Willpower roll, a point spent each
 *   roll, at 10 less the Virtues left, for ten successes. Out of Willpower first: the old Road falls to 0. A botch costs
 *   another point. The new Road's first dot is free.
 *   A Path of the same Road (p. 114): at a Moment of Truth, the same roll for five successes; a failed roll costs a
 *   Road dot, a botch two.
 * WoDX readings (B7644-B7648): the difficulty of the Willpower roll is kept between 2 and 10; a failed roll is one with
 * no successes; the Road books' own catalysts are offered to the Storyteller as prompts (Road of Kings, of Heaven, of
 * Sin, of the Beast and of Humanity, the 2nd edition Dark Ages books).
 */

import {MONTH} from "../core/terms.mjs";

const n = v => (Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : 0);

/** The ranks on a Road (V20 Dark Ages pp. 111-112). */
export const RANKS = [
    { key: "fallen", label: "Fallen", from: 0, to: 0 },
    { key: "initiate", label: "Initiate", from: 1, to: 3 },
    { key: "adherent", label: "Adherent", from: 4, to: 7 },
    { key: "paragon", label: "Paragon", from: 8, to: 10 }
];
export const rankOf = rating => { const r = Math.max(0, Math.min(10, n(rating))); return RANKS.find(k => r >= k.from && r <= k.to); };

/** The Moment of Truth catalysts (p. 115), and who may open each one: the rolls open their own, the rest the Storyteller. */
export const CATALYSTS = {
    sin: { label: "A major sin resisted", by: "roll", note: "A level 1 to 3 sin, and the roll to keep the Road made." },
    frenzy: { label: "A frenzy that risked no Road dot", by: "roll", note: "The Beast understood a little better." },
    study: { label: "Study with a Mentor", by: "time", note: "Months with a Mentor of more dots, as many as the Road's dots." },
    penance: { label: "Penance", by: "gm", note: "After a Road dot lost, or a grievous sin against the Road or its local flock." },
    event: { label: "A story event", by: "gm", note: "Anything that affirms the journey on the Road, at the Storyteller's word." }
};

/**
 * The Road books' own prompts for a Moment of Truth (WoDX summaries, PDF pages of the 2nd edition Dark Ages Road books).
 * Offered to the Storyteller beside the five catalysts; none opens by itself.
 */
export const ROAD_PROMPTS = {
    kings: [
        { text: "A hard-won victory that means something to the Cainite, not only to the domain", src: "Road of Kings, PDF pp. 37-38" },
        { text: "An initiation onto the Road that was hard to earn", src: "Road of Kings, PDF p. 38" },
        { text: "The bitter taste of a failure, taken as a lesson", src: "Road of Kings, PDF p. 38" },
        { text: "An oath sworn to a liege or a vassal", src: "Road of Kings, PDF p. 62" }],
    heaven: [{ text: "Penance done that makes the Cainite whole again; often private, seen only in how they act after", src: "Road of Heaven, PDF p. 37" }],
    sin: [{ text: "Overcoming the first resistance of the mind to the Road's teaching", src: "Road of Sin, PDF p. 57" }],
    beast: [{ text: "One hunt, or one kill, that after long building means more than all the others", src: "Road of the Beast, PDF p. 66" }],
    humanity: [
        { text: "Reason tempering passion for a greater end, such as ruling a place well", src: "Road of Humanity, PDF p. 67" },
        { text: "A long exchange of letters with a learned Prodigal", src: "Road of Humanity, PDF p. 75" }]
};

/**
 * B7750 (Desk item 2026-11-23-mc3): the events WoDX records that match a Road book's own prompt. When a walker of that Road
 * takes part, a Moment of Truth (the "story event" catalyst) is proposed to the Storyteller's approval queue; it opens
 * only when approved.
 */
export const ROAD_EVENTS = {
    oath: { roads: ["kings"], label: "An oath sworn to a liege or a vassal", src: "Road of Kings, PDF p. 62" }
};
/** The Road prompt an event matches for a walker of roadKey, or null. */
export function truthFromEvent(roadKey, event) {
    const e = ROAD_EVENTS[event];
    return e && roadKey && e.roads.includes(roadKey) ? { event, catalyst: "event", label: e.label, src: e.src } : null;
}

/**
 * B7751 (Desk item 2026-11-23-mc1): a Mentor has to be willing, as a teacher does (WoDX Creation, B7131). terms: what WoDX
 * Creation's learn.terms gives ({will, why, blocks, price}), or null when it cannot tell (no WoDX Creation, or a name
 * typed by hand). The Storyteller's word overrides a refusal or a trip. Only the Storyteller's client can write the
 * Ledger, so a player's price is sent to the Storyteller to write. Returns {ok, note, price}.
 */
export function mentorAllowed(terms, { gm = false } = {}) {
    if ( !terms ) return { ok: true, note: gm ? "" : "Named by hand: the Storyteller confirms the Mentor is willing.", price: null };
    if ( terms.blocks ) return gm ? { ok: true, note: `${terms.why} (taken as Mentor on the Storyteller's word).`, price: null }
        : { ok: false, note: `${terms.why}.`, price: null };
    if ( terms.will === "price" && terms.price ) return { ok: true, note: `${terms.why}: ${terms.price.what} (${gm ? "in the Ledger" : "the Storyteller writes it in the Ledger"}).`, price: terms.price };
    return { ok: true, note: `${terms.why}.`, price: null };
}

/** The record kept on a character (flag wodx-actions.roadFaith), with every field in place. */
export function faithOf(flag = {}) {
    const f = flag ?? {};
    return {
        mentor: f.mentor?.name ? { name: String(f.mentor.name), uuid: f.mentor.uuid ?? null, rating: n(f.mentor.rating), road: f.mentor.road ?? null, since: f.mentor.since ?? null } : null,
        truths: Array.isArray(f.truths) ? f.truths.filter(t => t && CATALYSTS[t.key]) : [],
        status: ["apostate", "excommunicate"].includes(f.status) ? f.status : null,
        from: f.from ?? null,
        change: f.change?.to ? { ...f.change, successes: n(f.change.successes), rolls: n(f.change.rolls) } : null
    };
}

/** A Mentor counts when on the same Road with more dots (p. 111). */
export const mentorCounts = (mentor, road, rating) => !!mentor && (!mentor.road || !road || mentor.road === road) && n(mentor.rating) > n(rating);

/** The cost of the next Road dot: book cost, less the Mentor's share (to half), then halved for a Moment of Truth (p. 115). */
export function roadDotCost(base, { rating = 0, mentor = null, road = null, truth = false } = {}) {
    let cost = n(base);
    const parts = [];
    if ( mentorCounts(mentor, road, rating) ) {
        const off = Math.min(n(mentor.rating) - n(rating), cost - Math.ceil(cost / 2));
        if ( off > 0 ) { cost -= off; parts.push(`Mentor ${mentor.name} (${n(mentor.rating)} dots): -${off}`); }
    }
    if ( truth ) { const was = cost; cost = Math.max(1, Math.floor(cost / 2)); parts.push(`Moment of Truth: ${was} halved to ${cost}`); }
    return { cost, parts };
}

/** The Moment of Truth open this story, if any (one buys one Road dot). */
export const openTruth = (faith, story) => (faith?.truths ?? []).find(t => !t.used && t.story === story && !t.forChange) ?? null;

/** Add a Moment of Truth; a second of the same catalyst in one story is not added. */
export function withTruth(faith, { key, story, at = 0, note = "", forChange = false }) {
    const f = faithOf(faith);
    if ( !CATALYSTS[key] ) return f;
    if ( f.truths.some(t => !t.used && t.story === story && t.key === key && !!t.forChange === !!forChange) ) return f;
    return { ...f, truths: [...f.truths, { key, story, at, note: String(note).slice(0, 200), ...(forChange ? { forChange: true } : {}) }] };
}

/** Mark the open Moment of Truth used. */
export function useTruth(faith, story, { forChange = false } = {}) {
    const f = faithOf(faith);
    const i = f.truths.findIndex(t => !t.used && t.story === story && !!t.forChange === !!forChange);
    if ( i < 0 ) return f;
    const truths = f.truths.slice(); truths[i] = { ...truths[i], used: true };
    return { ...f, truths };
}

/** Months of study with a Mentor needed, and done (p. 115). since, now: seconds of the world clock. */
export function studyReady(mentor, rating, now, month = MONTH) {
    if ( !mentor?.since && mentor?.since !== 0 ) return { need: Math.max(1, n(rating)), done: 0, ready: false };
    const need = Math.max(1, n(rating)), done = Math.floor(Math.max(0, n(now) - n(mentor.since)) / month);
    return { need, done, ready: done >= need };
}

/** How many Paragons it takes to put a character out of the Road (p. 112): null when it cannot be done. */
export function paragonsToExcommunicate(rating) {
    const r = rankOf(rating).key;
    return r === "initiate" ? 1 : r === "adherent" ? 3 : null;
}

/** The extra difficulty on Conscience or Conviction for an Excommunicate (p. 112). */
export const conscienceDiff = status => (status === "excommunicate" ? 2 : 0);

/** The aura modifier for the character: penalties doubled for an Excommunicate (p. 112). */
export const auraFor = (mod, status) => (status === "excommunicate" && n(mod) > 0 ? n(mod) * 2 : n(mod));

/**
 * The Virtues that must fall to one dot before a Road change (p. 112): those the new Road does not share.
 * from, to: the Roads' Virtue lists, e.g. ["conscience", "selfcontrol"] and ["conviction", "instinct"].
 */
export function virtuesToShed(from = [], to = []) {
    const out = [];
    const want = new Set(to);
    if ( from.includes("conviction") !== want.has("conviction") ) out.push("conscience");
    if ( from.includes("instinct") !== want.has("instinct") ) out.push("selfcontrol");
    return out;
}

/**
 * Where a Road change stands (p. 112). sheet: {rating, virtues: {conscience, selfcontrol}, mentorOnNew, truth}.
 * Returns the steps, each {key, label, done}, and the first not done.
 */
export function changeSteps({ path = false, shed = [], rating = 0, virtues = {}, mentorOnNew = false, truth = false } = {}) {
    const steps = path ? [] : [
        { key: "mentor", label: "A Mentor on the new Road", done: !!mentorOnNew },
        ...shed.map(v => ({ key: `shed:${v}`, label: `${v === "conscience" ? "Conscience or Conviction" : "Self-Control or Instinct"} down to one dot, by sinning`, done: n(virtues[v]) <= 1 })),
        { key: "astray", label: "The old Road down to one dot, by sinning", done: n(rating) <= 1 }];
    steps.push({ key: "truth", label: `A Moment of Truth for the new ${path ? "Path" : "Road"}`, done: !!truth });
    return { steps, next: steps.find(s => !s.done) ?? null, ready: steps.every(s => s.done) };
}

/** The difficulty of the Willpower roll: 10 less the Virtues left, kept between 2 and 10 (p. 112; the bounds WoDX's). */
export const changeDifficulty = (virtueTotal) => Math.max(2, Math.min(10, 10 - n(virtueTotal)));

/** Successes the change needs: ten for a Road, five for a Path of the same Road (pp. 112, 114). */
export const changeTarget = path => (path ? 5 : 10);

/**
 * One roll of the change. state: {successes}; res: {successes, botch}; willpower: points left after this roll's point.
 * Returns {successes, outcome: "done" | "going" | "lost", spendMore (botch), roadLoss (a Path's failures)}.
 */
export function changeRoll(state, res, { path = false, willpower = 0 } = {}) {
    const got = res.botch ? 0 : Math.max(0, n(res.successes));
    const successes = n(state?.successes) + got;
    const spendMore = res.botch ? 1 : 0;
    const roadLoss = path ? (res.botch ? 2 : got === 0 ? 1 : 0) : 0;
    if ( successes >= changeTarget(path) ) return { successes, outcome: "done", spendMore, roadLoss };
    const left = n(willpower) - spendMore;
    return { successes, outcome: left <= 0 ? (path ? "stopped" : "lost") : "going", spendMore, roadLoss };
}
