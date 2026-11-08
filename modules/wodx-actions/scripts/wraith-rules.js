/**
 * WoDX Actions 3.4 — the pure rules of the wraith line (Wraith: The Oblivion 20th Anniversary, B43): Arcanoi codes,
 * the Shroud, Passions, Fetters, Corpus healing, the Shadow (Angst, Catharsis, Shadow Dice) and Harrowings.
 * No Foundry calls here, so the harness can test it. Pages are the Wraith 20th core's.
 */

import { discDifficulty } from "./kindred-rules.js";

const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
export const REALMS = { across: "Across the Shroud (into the Skinlands)", shadowlands: "In the Shadowlands", tempest: "In the Tempest or Stygia", labyrinth: "In the Labyrinth" };

/** The local Shroud (pp. 282–284, 288): base rating, −2 near the supernatural, Hysteria (−1 each, at most −3), a Haunt's rating; 4–10. */
export function shroudRating({ base = 7, supernatural = false, hysteria = 0, haunt = 0 } = {}) {
    let r = n(base) || 7;
    if (supernatural) r -= 2;
    r -= Math.min(3, Math.max(0, n(hysteria)));
    r -= Math.max(0, n(haunt));
    return Math.max(4, Math.min(10, r));
}

/**
 * An art's difficulty (Chapter Five's defaults per Arcanos, or the art's own). ctx: {t: target traits, own: own traits,
 * shroud, realm (across | shadowlands | tempest | labyrinth), onSelf}. null: needs a target or the page decides.
 */
export function arcanosDifficulty(code, { t = null, own = {}, shroud = 7, realm = "shadowlands", onSelf = false, storm = 0 } = {}) {
    if (code === undefined || code === null || code === "") return 6;
    const s = String(code);
    if (/^\d+$/.test(s)) return Number(s);
    if (s === "var") return null;
    const across = realm === "across";
    if (s === "shroud") return n(shroud) || 7;
    // The Great War's codes: the local Maelstrom's level + N, the Shroud + N (at most 10)
    let m = s.match(/^storm\+(\d+)$/);
    if (m) return Math.max(2, Math.min(10, n(storm) + Number(m[1])));
    m = s.match(/^shroud\+(\d+)$/);
    if (m) return Math.min(10, (n(shroud) || 7) + Number(m[1]));
    if (s === "10-fetter") return t && Number.isFinite(t.fetter) ? Math.max(2, 10 - n(t.fetter)) : null;
    if (s.startsWith("side:")) {
        if (across) return n(shroud) || 7;
        return arcanosDifficulty(s.slice(5), { t, own, shroud, realm, onSelf, storm });
    }
    if (s.startsWith("self:")) {
        if (onSelf) return Number(s.slice(5)) || 6;
        const w = t ? n(t.willpower) : null;
        if (w === null) return null;
        return across ? Math.max(w, n(shroud) || 7) : w;
    }
    if (s.startsWith("realm:")) {
        if (across) return n(shroud) || 7;
        const base = Number(s.slice(6));
        if (base === 7) return { shadowlands: 7, tempest: 6, labyrinth: 5 }[realm] ?? 7; // Outrage (p. 199)
        return 6; // Pandemonium: 6 in the Underworld (p. 204)
    }
    if (s.startsWith("own:")) {
        const m = s.slice(4).match(/^([a-z]+)(?:\+(\d+))?$/);
        if (!m) return null;
        const v = n(own[m[1]]) + n(m[2]);
        return v ? Math.max(2, Math.min(10, v)) : null;
    }
    return discDifficulty(s, { t, own });
}

/** Angst the Shadow takes from the art itself (pp. 199, 204): Outrage in the Labyrinth 1; Pandemonium in the Tempest or Stygia a point per 1 rolled. */
export function realmAngst(arcanos, realm, faces = []) {
    if (arcanos === "Outrage" && realm === "labyrinth") return 1;
    if (arcanos === "Pandemonium" && (realm === "tempest" || realm === "labyrinth")) return faces.filter(f => f === 1).length;
    return 0;
}

/** The arts a wraith can use: sheet = [{name, value}] Arcanoi ratings; Common arts to the rating, Initiate arts too (Guild teaching is the Storyteller's call). */
export function artsFor(arts, sheet) {
    const rating = name => Math.max(0, ...sheet.filter(s => String(s.name).toLowerCase().startsWith(String(name).toLowerCase())).map(s => n(s.value)));
    return (arts ?? []).filter(a => rating(a.d) >= Math.max(1, a.l)).map(a => ({ ...a, rating: rating(a.d) }))
        .sort((a, b) => a.d.localeCompare(b.d) || a.l - b.l || a.n.localeCompare(b.n));
}

/** Cost code "p1c1w1a1", "pX" → {pathos, corpus, willpower, variable}. */
export function artCost(code) {
    const out = { pathos: 0, corpus: 0, willpower: 0, variable: false };
    for (const m of String(code ?? "").matchAll(/([pcwa])(\d+|X)/g)) {
        const k = { p: "pathos", c: "corpus", w: "willpower", a: "angst" }[m[1]];
        if (m[2] === "X") out.variable = true; else out[k] = (out[k] ?? 0) + Number(m[2]);
    }
    return out;
}

/* ------------------------------------------------------------------ */
/*  Passions, Fetters, Memoriam                                        */
/* ------------------------------------------------------------------ */

/** Pathos from a Passion (p. 305): difficulty 6 living it, 8 secondhand; a success each, up to the maximum. */
export const passionDifficulty = secondhand => (secondhand ? 8 : 6);
export function gainUpTo(current, successes, max = 10) {
    return Math.min(Math.max(n(max), n(current)), n(current) + Math.max(0, n(successes)));
}
/** Willpower from a Fetter (p. 308): after a scene with it, difficulty 6; Slumbering in it for 8 hours, difficulty 4. */
export const fetterDifficulty = kind => (kind === "slumber" ? 4 : 6);
/** Neglect (pp. 306, 309): a rating roll at 9; failure −1, botch −2; at 0, a Harrowing. */
export function neglectResult(rating, roll) {
    const drop = roll.botch ? 2 : roll.successes > 0 ? 0 : 1;
    const after = Math.max(0, n(rating) - drop);
    return { after, drop, harrowing: after === 0 && drop > 0 };
}
/** Resolving a Passion (p. 307): Willpower at the original rating + 4, needing successes equal to the original rating. */
export function resolution(original, successes) {
    const need = n(original);
    return { difficulty: Math.min(10, need + 4), need, resolved: n(successes) >= need };
}

/* ------------------------------------------------------------------ */
/*  Corpus                                                             */
/* ------------------------------------------------------------------ */

/** Healing with Pathos (p. 295): 1 Pathos for 2 bashing or 1 lethal; aggravated: 3 Pathos and 8 hours a level. */
export function pathosHealing(damage, pathos, { aggravated = false } = {}) {
    let b = n(damage.bashing), l = n(damage.lethal), a = n(damage.aggravated), p = n(pathos), spent = 0;
    const healed = { bashing: 0, lethal: 0, aggravated: 0 };
    if (aggravated) {
        if (a && p >= 3) { a--; p -= 3; spent += 3; healed.aggravated = 1; }
        return { after: { bashing: b, lethal: l, aggravated: a }, spent, healed, hours: healed.aggravated ? 8 : 0 };
    }
    while (p > 0 && l > 0) { l--; p--; spent++; healed.lethal++; }
    while (p > 0 && b > 0) { const k = Math.min(2, b); b -= k; p--; spent++; healed.bashing += k; }
    return { after: { bashing: b, lethal: l, aggravated: a }, spent, healed, turns: spent };
}
/** Bashing heals a level an hour on its own (p. 295). */
export function corpusRest(damage, hours) {
    const k = Math.min(n(damage.bashing), Math.max(0, Math.floor(n(hours))));
    return { ...damage, bashing: n(damage.bashing) - k };
}
/** The Corpus state (p. 292): wavering when the track is filled by bashing alone; a Harrowing when lethal or worse helps fill it. */
export function corpusState(damage, max = 10) {
    const b = n(damage.bashing), l = n(damage.lethal), a = n(damage.aggravated), m = n(max) || 10;
    if (b + l + a < m) return "corporeal";
    if (l + a > 0) return "harrowed";
    if (b >= m) return "wavering";
    return "corporeal";
}

/* ------------------------------------------------------------------ */
/*  The Shadow                                                         */
/* ------------------------------------------------------------------ */

/** Starting permanent Angst (p. 230): successes on Willpower dice at 6, ones not cancelling; at least 1. */
export function startingAngst(faces) {
    return Math.max(1, (faces ?? []).filter(f => f >= 6).length);
}
/** Catharsis may be tried when temporary Angst is above Willpower (p. 230). */
export const catharsisReady = (tempAngst, willpower) => n(tempAngst) > n(willpower);
/** Catharsis (p. 236): the Shadow's temporary Angst roll against the Psyche's Willpower (+ Eidolon); a tie keeps the Psyche in control. */
export function catharsis(shadowSuccesses, psycheSuccesses) {
    return n(shadowSuccesses) > n(psycheSuccesses) ? "shadow" : "psyche";
}
/** Shadow Dice (p. 235): at most 5; every 1 on them is a temporary Angst point. */
export function shadowDice(offered, faces) {
    const dice = Math.max(0, Math.min(5, n(offered)));
    return { dice, angst: (faces ?? []).slice(0, dice).filter(f => f === 1).length };
}
/** Dark Passion rolls (p. 235): 7 when the wraith indulges it, 9 to stir it in someone else; an Angst a success. */
export const darkPassionDifficulty = others => (others ? 9 : 7);

/* ------------------------------------------------------------------ */
/*  Harrowings (pp. 240–245)                                           */
/* ------------------------------------------------------------------ */

export const HARROWING_KINDS = {
    passion: "A Passion's Harrowing (its Passion is the quarry)",
    fetter: "A Fetter's Harrowing",
    destruction: "A Destruction Harrowing (Corpus gone)",
    general: "Another Harrowing (Willpower spent out, a Thorn, the Storyteller)"
};
/** The escape roll: permanent Willpower at 9, lowered by good play (at most 2); no Shadow Dice (p. 242). */
export function escapeDifficulty(goodPlay = 0) {
    return Math.max(7, 9 - Math.max(0, Math.min(2, n(goodPlay))));
}
/** What a failed Harrowing costs, by kind (pp. 244–245). */
export function harrowingLoss(kind) {
    switch (kind) {
        case "passion": return "The quarry Passion is lost; roll another Passion's rating at 5 or it drops a dot.";
        case "fetter": return "The Fetter weakens or is lost; roll permanent Willpower against the Shadow's permanent Angst (6).";
        case "destruction": return "Roll permanent Willpower against the Shadow's permanent Angst (6): failure, the Shadow wins (a Spectre or Oblivion).";
        default: return "Roll permanent Willpower against the Shadow's permanent Angst (6) to see what is lost.";
    }
}

/* ------------------------------------------------------------------ */
/*  The Caul (pp. 280–282)                                             */
/* ------------------------------------------------------------------ */

/** Removing one's own Caul: 1 Willpower, then Willpower at 4; each success a Pathos over the start (may pass 10). */
export const CAUL_SELF = { cost: 1, difficulty: 4 };
/** A Reaper's help: Charisma + Empathy at 9 − the Enfant's Memoriam (min 2); the Reaper gains Memoriam + 2 Pathos. */
export function reaperDifficulty(memoriam) { return Math.max(2, 9 - n(memoriam)); }
export const reaperPathos = memoriam => n(memoriam) + 2;

/* ------------------------------------------------------------------ */
/*  The Great War (B43): which library, and the Fourth Great Maelstrom  */
/* ------------------------------------------------------------------ */

/** The Great War profile uses Wraith: The Great War's arts (Kinesis in place of Inhabit); every other era Wraith 20th's. */
export const libraryFor = era => (String(era ?? "") === "great-war" ? "gw" : "w20");
/**
 * A Maelstrom by force (Wraith: The Great War p. 87): damage dice a scene to the exposed, how often aggravated,
 * outdoor difficulty, and what armor and haunts do. Force 0 = no storm.
 */
export const MAELSTROM = [
    null,
    { dice: [1, 4], agg: "almost never", diff: 0, armor: "Class Two armor or any walls stop it", haunt: "−2 dice a Haunt level" },
    { dice: [4, 6], agg: "about a quarter of the time", diff: 1, armor: "usual", haunt: "−1 die a Haunt level" },
    { dice: [6, 8], agg: "up to half the time", diff: 2, armor: "one die less", haunt: "−1 die a Haunt level" },
    { dice: [8, 12], agg: "about half the time", diff: 3, armor: "one die less", haunt: "one die less than the Haunt level" },
    { dice: [14, 14], agg: "usually", diff: 3, armor: "half (round down)", haunt: "−1 die per two Haunt levels" }
];
/** Dice for an exposed wraith this scene: the force's range (middle by default), less shelter. */
export function maelstromDice(force, { haunt = 0, roll = null } = {}) {
    const f = MAELSTROM[Math.max(0, Math.min(5, n(force)))];
    if (!f) return 0;
    const [lo, hi] = f.dice;
    let dice = roll === null ? Math.round((lo + hi) / 2) : Math.max(lo, Math.min(hi, n(roll)));
    const h = n(haunt);
    if (h) dice -= n(force) === 1 ? 2 * h : n(force) === 4 ? Math.max(0, h - 1) : n(force) === 5 ? Math.floor(h / 2) : h;
    return Math.max(0, dice);
}
