/**
 * WoDX Actions — Garou and Fera rules (pure functions, no Foundry calls).
 * Basis by era (decision B41): "daw" = Dark Ages: Werewolf (2003) for the Dark Ages and Long Night profiles;
 * "w20" = Werewolf 20th elsewhere. Fera follow W20 Changing Breeds in every era.
 * Mechanics only; page references in data/garou.json and docs/research/6b-werewolf-notes.md.
 */

export const FORMS = ["homid", "glabro", "crinos", "hispo", "lupus"];
/** Shift difficulty is that of the form being left (W20 p. 285; DA:W pp. 106–107). */
export const FORM_DIFF = { homid: 6, glabro: 7, crinos: 6, hispo: 7, lupus: 6 };
/** Auspice moon by the Chronicle's eight phases (0 new … 4 full … 7 waning crescent). */
export const AUSPICE_PHASES = { ragabash: [0], theurge: [1, 7], philodox: [2, 6], galliard: [3, 5], ahroun: [4] };

const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const norm = s => String(s ?? "").toLowerCase().replace(/^wod\.[a-z.]*\./, "").replace(/[^a-z]+/g, " ").trim();

export function basis(eraId) {
    return ["dark-ages", "long-night"].includes(eraId) ? "daw" : "w20";
}

/** Breed, auspice and tribe keys from the sheet's free text (labels or keys, any case). */
export function breedKey(text) {
    const t = norm(text);
    if (/homid/.test(t)) return "homid";
    if (/metis/.test(t)) return "metis";
    if (/lupus|wolf|feline|animal|corvid|ursine|arachnid|rodent|squamus|squamous|suchian|vasuki|latrani|kitsune|roko|kojin|crocodil|rat\b|shark/.test(t)) return "lupus";
    return t ? t.split(" ")[0] : "";
}
export function auspiceKey(text) {
    const t = norm(text);
    for (const k of Object.keys(AUSPICE_PHASES)) if (t.includes(k)) return k;
    return "";
}
export function tribeKey(text, tribes = {}) {
    const t = norm(text);
    if (!t) return "";
    for (const [k, v] of Object.entries(tribes)) if (t === norm(v.label) || t === norm(k) || t.includes(norm(v.label))) return k;
    if (/get of fenris|fenris/.test(t)) return "fenrir";
    if (/glass walker/.test(t)) return "warders-of-men";
    return t.replace(/\s+/g, "-");
}

export function currentForm(shapes) {
    for (const k of FORMS) if (shapes?.[k]?.isactive) return k;
    return "homid";
}
export function breedForm(breed) {
    return breed === "metis" ? "crinos" : breed === "lupus" ? "lupus" : "homid";
}
/** Successes needed: one per form passed through (W20 p. 285). */
export function shiftSteps(from, to) {
    return Math.abs(FORMS.indexOf(to) - FORMS.indexOf(from));
}
/** Where a partial success leaves the werewolf: that many steps toward the target. */
export function shiftReach(from, to, successes) {
    const a = FORMS.indexOf(from), b = FORMS.indexOf(to);
    if (successes <= 0) return from;
    const step = Math.min(successes, Math.abs(b - a));
    return FORMS[a + Math.sign(b - a) * step];
}

export function auspiceMoonMatches(auspice, phaseIndex) {
    return (AUSPICE_PHASES[auspice] ?? []).includes(phaseIndex);
}

/** Rage on first seeing the moon each night: a number, or "all" when the phase is the auspice's (DA:W p. 91; W20 p. 145). */
export function moonRage(phaseIndex, auspice, b, table) {
    if (auspiceMoonMatches(auspice, phaseIndex)) return "all";
    return (table?.[b] ?? table?.w20)?.[phaseIndex] ?? 1;
}

/**
 * Rage-roll difficulty. W20 p. 262: by moon, −1 if the moon is the auspice's or in Crinos (not both).
 * DA:W: the Storyteller's base (default 6), −1 in Crinos (DA:W p. 107). Extensive scarring −1 (DA:W p. 94).
 */
export function rageDifficulty({ b, phaseIndex = 2, auspice = "", form = "homid", base = 6, scarred = false, table = null }) {
    let d;
    if (b === "w20") {
        d = (table ?? [8, 7, 6, 5, 4, 5, 6, 7])[phaseIndex] ?? 6;
        if (auspiceMoonMatches(auspice, phaseIndex) || form === "crinos") d -= 1;
    } else {
        d = base - (form === "crinos" ? 1 : 0);
    }
    if (scarred) d -= 1;
    return Math.max(2, Math.min(10, d));
}

/** What a Rage roll's successes do (W20 pp. 144, 261–262; DA:W pp. 94–95, 101). */
export function frenzyCheck(successes, { rank = 1, need = 4, thrall = 6, byRank = {} } = {}) {
    const r = byRank[String(Math.min(6, rank))] ?? {};
    const needed = Math.max(need, r.need ?? 0);
    if (thrall && successes >= thrall) return { result: "thrall", needed, canStop: false };
    if (successes >= needed) return { result: "frenzy", needed, canStop: true };
    return { result: "none", needed, canStop: false };
}
export function rankFrenzyDiff(rank, byRank = {}) {
    return byRank[String(Math.min(6, rank))]?.diff ?? 0;
}

/** Rage for extra actions: the cap, and (DA:W p. 90) how many are safe before +3 difficulty. */
export function rageActionCap(b, permRage, dex, wits, inFrenzy = false) {
    const max = b === "daw" ? Math.ceil(permRage / 2) : Math.floor(permRage / 2);
    const safe = b === "daw" && !inFrenzy ? Math.min(dex, wits) : max;
    return { max, safe };
}

/** Remaining active after Incapacitated: Rage roll at 8, once a scene (DA:W p. 91; W20 pp. 145, 256). */
export function remainingActive(b, damageType, successes) {
    if (successes <= 0) return { heals: 0, frenzy: false, scar: false };
    if (b === "daw" && damageType === "bashing") return { heals: successes, frenzy: successes >= 4, scar: false };
    return { heals: successes, frenzy: true, scar: true };
}

/**
 * Regeneration. W20 p. 256 / DA:W pp. 102, 106: the worst bashing or lethal level each turn; lethal under stress needs
 * Stamina (8). A homid in Homid form and a lupus in Lupus form don't regenerate (DA:W; W20: they heal as a human,
 * save a level a day when critical); metis regenerate in every form. Fera from their table.
 */
export function regeneration({ breed = "homid", form = "homid", fera = null }) {
    if (fera?.regen === "none") return { regen: false, why: "This breed does not regenerate." };
    if (fera?.regen === "saltwater") return { regen: form === breedForm(breed), why: "Only in breed form, immersed in salt water.", condition: "saltwater" };
    if (breed === "homid" && form === "homid") return { regen: false, why: "A homid in Homid form heals as a human." };
    if (breed === "lupus" && form === "lupus") return { regen: false, why: "A lupus in Lupus form heals as a wolf." };
    return { regen: true, why: "" };
}

/**
 * Silver (or the breed's bane) against a shapechanger. Returns how the damage is soaked and what it counts as.
 * DA:W p. 102: homid or lupus in breed form soak at 6 and the rest is lethal; otherwise unsoakable aggravated.
 * W20 p. 255: in breed form a homid or lupus takes it as an ordinary weapon. Metis: unsoakable aggravated always.
 * Fera: their bane metals (W20 Changing Breeds); Kitsune soak silver at 8, the rest lethal.
 */
export function baneEffect({ b, breed = "homid", form = "homid", metal = "silver", fera = null }) {
    const banes = fera?.bane ?? ["silver"];
    if (!banes.includes(metal)) return { bane: false, soak: true, type: null, note: `${metal} is no bane to this breed.` };
    if (fera?.silverSoak && metal === "silver") return { bane: true, soak: true, soakDiff: fera.silverSoak, type: "lethal", note: "Soaks silver at difficulty 8; the rest is lethal." };
    const inBreed = form === breedForm(breed) && breed !== "metis";
    if (inBreed) {
        if (b === "daw") return { bane: true, soak: true, soakDiff: 6, type: "lethal", note: "In breed form: soaked at 6, the rest lethal (DA:W p. 102)." };
        return { bane: false, soak: true, type: null, note: "In breed form silver does nothing special (W20 p. 255)." };
    }
    return { bane: true, soak: false, type: "aggravated", min: 1, note: `${metal[0].toUpperCase()}${metal.slice(1)} can't be soaked and is aggravated.` };
}

/** Gnosis lost to carried silver (W20 p. 259; DA:W p. 92). count: objects; bullets: number of bullets; klaives: {klaive, grand}. */
export function silverGnosisPenalty({ objects = 0, bullets = 0, klaive = 0, grand = 0, tolerant = false }) {
    let p = objects + Math.floor(bullets / 5) + klaive + 2 * grand;
    if (tolerant) p = Math.ceil(p / 2);
    return p;
}

/** The Delirium (DA:W p. 97; W20 p. 263). Willpower 1–10 (more counts as 10). */
export function delirium(willpower, b, table) {
    const w = Math.max(1, Math.min(10, n(willpower)));
    const t = table?.[b] ?? table?.w20 ?? { forget: [1, 2, 3, 4, 5, 6], rationalize: [7, 8], remember: [9, 10] };
    const memory = t.forget.includes(w) ? "forgets" : t.rationalize.includes(w) ? "remembers but rationalizes" : "remembers";
    return { willpower: w, reaction: table?.reactions?.[w] ?? "", memory };
}

/** The Curse: −1 social die per point of Rage above a human's Willpower (DA:W p. 91). */
export function curseDice(rage, humanWillpower) {
    return Math.max(0, n(rage) - n(humanWillpower));
}

/** Gnosis meditation (DA:W p. 92; W20 p. 146): Wits + Enigmas at 8, +1 for each earlier day that week (max 10). */
export function meditationDifficulty(daysThisWeek) {
    return Math.min(10, 8 + Math.max(0, n(daysThisWeek)));
}

/** Highest rank whose Renown the werewolf meets (DA:W p. 101). renown = {glory, honor, wisdom}. */
export function rankFor(auspice, renown, chart) {
    const rows = chart?.[auspice];
    if (!rows) return null;
    let best = 0;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const ok = Array.isArray(row)
            ? n(renown.glory) >= row[0] && n(renown.honor) >= row[1] && n(renown.wisdom) >= row[2]
            : n(renown.glory) + n(renown.honor) + n(renown.wisdom) >= row;
        if (ok) best = i + 1; else break;
    }
    return best;
}

/**
 * Apply a Renown change to one category (DA:W p. 100): a loss beyond the pool breaks a permanent dot into 10.
 * Returns the new {permanent, temporary} and notes.
 */
export function renownChange({ permanent = 0, temporary = 0 }, delta) {
    let p = n(permanent), t = n(temporary) + n(delta);
    const notes = [];
    while (t < 0 && p > 0) { p -= 1; t += 10; notes.push("A permanent dot breaks into 10 temporary to cover the loss."); }
    if (t < 0) { t = 0; notes.push("No Renown left in this category to lose."); }
    if (t >= 10) notes.push("10 or more temporary: ready for the Rite of Accomplishment.");
    return { permanent: p, temporary: t, notes };
}
/** Rite of Accomplishment: 10 temporary become 1 permanent. */
export function accomplish({ permanent = 0, temporary = 0 }) {
    if (n(temporary) < 10) return null;
    return { permanent: n(permanent) + 1, temporary: n(temporary) - 10 };
}

/** A rite's roll (DA:W pp. 144–145): pool spec and difficulty, −1 per five participants (ritemaster included). */
export function riteRoll(type, { rank = 1, caern = 0, participants = 1, table = {} } = {}) {
    const r = table[type];
    if (!r) return null;
    let diff = r.diff;
    if (diff === "8-rank") diff = 8 - n(rank);
    else if (diff === "8-caern") diff = 8 - n(caern);
    if (typeof diff === "number") diff = Math.max(2, Math.min(10, diff - Math.floor(Math.max(1, n(participants)) / 5)));
    return { pool: r.pool, diff, label: r.label };
}
/** Learning a rite (DA:W p. 144): a week per level, Intelligence + Rituals at 10 − Intelligence each week. */
export function riteLearning(level, intelligence) {
    return { weeks: Math.max(1, n(level)), diff: Math.max(2, 10 - n(intelligence)) };
}

/** Rite of Summoning (DA:W p. 150): difficulty by spirit, −1 per hour, never below 3; then the attitude from Gnosis successes. */
export function summonDifficulty(type, hours, table) {
    const base = table?.diff?.[type] ?? 6;
    return Math.max(3, base - Math.max(0, n(hours)));
}
export function summonAttitude(successes, table) {
    const list = table?.attitude ?? [];
    return list[Math.max(0, Math.min(list.length - 1, n(successes)))] ?? "";
}

/* ------------------------------------------------------------------ */
/*  Gift data from the library (data/gifts-daw.json)                   */
/* ------------------------------------------------------------------ */

/** Cost code → points. "g1" Gnosis 1, "r1", "w3", "g1r1w1", "gX" variable, "g1+" one or more, "w1each" per target... */
export function giftCost(code) {
    const out = { gnosis: 0, rage: 0, willpower: 0, variable: false, per: "" };
    if (!code) return out;
    const s = String(code);
    if (/X/.test(s)) out.variable = true;
    const per = s.match(/(each|per[a-z0-9]+|\+|opt)$/);
    if (per) out.per = per[1];
    for (const m of s.matchAll(/([grw])(\d+)/g)) {
        const k = { g: "gnosis", r: "rage", w: "willpower" }[m[1]];
        out[k] += Number(m[2]);
    }
    if (/^rgX/.test(s)) { out.variable = true; }
    return out;
}

const ATTR = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];
const TRAITS = ["gnosis", "rage", "willpower"];
/** Roll code → parts: [{kind:"attr"|"ability"|"trait"|"number", key | value, alts}]. */
export function giftPool(code) {
    if (!code) return null;
    return String(code).split("+").map(part => {
        const alts = part.split("|");
        const p = alts[0];
        if (/^\d+$/.test(p)) return { kind: "number", value: Number(p) };
        if (ATTR.includes(p)) return { kind: "attr", key: p };
        if (TRAITS.includes(p)) return { kind: "trait", key: p };
        return { kind: "ability", key: p, alts };
    });
}

/**
 * Difficulty code → a number (or null to ask). Target traits come from `t` ({willpower, stamina, rage, gnosis, wits,
 * manipulation, stealth, subterfuge, athletics, rank}); own traits from `own`; the local Gauntlet from `gauntlet`.
 */
export function giftDifficulty(code, { t = null, own = {}, gauntlet = null } = {}) {
    if (code === undefined || code === null || code === "") return 6;
    if (typeof code === "number") return code;
    const s = String(code);
    const get = k => t ? n(t[k]) : null;
    const sum = keys => t ? keys.reduce((a, k) => a + n(t[k]), 0) : null;
    let m;
    if (/^\d+$/.test(s)) return Number(s);
    if ((m = s.match(/^(\d+)-(\d+)$/))) return Number(m[1]);
    if ((m = s.match(/^(\d+)\|(\d+)$/))) return Number(m[2]);
    switch (s) {
        case "tWp": case "tPermWp": return get("willpower");
        case "tGnosis": return get("gnosis");
        case "tRage|5": return t ? (n(t.rage) || 5) : null;
        case "tSta+4": return t ? n(t.stamina) + 4 : null;
        case "tSta+3": return t ? n(t.stamina) + 3 : null;
        case "tWp+3": return t ? Math.min(10, n(t.willpower) + 3) : null;
        case "5+tRank": return t ? 5 + n(t.rank) : null;
        case "tWits+Stealth": return sum(["wits", "stealth"]);
        case "tWits+Subterfuge": return sum(["wits", "subterfuge"]);
        case "tMan+Subterfuge": return sum(["manipulation", "subterfuge"]);
        case "tSta+Athletics": return sum(["stamina", "athletics"]);
        case "ownWp": return n(own.willpower) || null;
        case "ownRage": return n(own.rage) || null;
        case "gauntlet": return gauntlet;
        case "8|gauntlet": return Math.max(8, n(gauntlet));
        default: return null;
    }
}

/** Duration code → a WoDX timed-effect duration (or null: nothing to time). */
export function giftDuration(code, successes = 1) {
    const s = Math.max(1, n(successes));
    switch (code) {
        case "scene": return { kind: "scene" };
        case "turn": return { kind: "rounds", rounds: 1 };
        case "turns": return { kind: "rounds", rounds: s };
        case "minutes": return { kind: "time", seconds: 60 * s };
        case "hours": return { kind: "time", seconds: 3600 * s };
        case "day": return { kind: "time", seconds: 86400 };
        case "days": return { kind: "time", seconds: 86400 * s };
        case "week": return { kind: "time", seconds: 7 * 86400 };
        case "months": return { kind: "time", seconds: 30 * 86400 * s };
        default: return null;
    }
}

/** XP cost of a Gift (DA:W p. 107): level × 3 for the breed's, auspice's or tribe's own; level × 5 otherwise. */
export function giftXP(level, own) {
    return n(level) * (own ? 3 : 5);
}
/** Is a Gift one of the werewolf's own groups? */
export function giftIsOwn(gift, { breed, auspice, tribe }) {
    return (gift.g ?? []).some(g => g === breed || g === auspice || g === tribe);
}
