/**
 * WoDX Actions — Mummy: The Resurrection, the pure rules (Phase 6k, later eras). No Foundry here: the harness tests them.
 * Mechanics from Mummy: The Resurrection (the 2001 core book), in WoDX's words, with the printed page numbers.
 */

export const REF = "Mummy: The Resurrection";
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** The six Amenti (Chapter Two; p. 56): the soul part each grew from, and the Hekau path that comes to it most naturally. */
export const AMENTI = {
    kherminu: { label: "Kher-minu", gloss: "Tomb Watchers", soul: "ka, the Defender Self", hekau: "amulets" },
    khrihabi: { label: "Khri-habi", gloss: "Scroll-Bearers", soul: "ba, the Bird Self", hekau: "alchemy" },
    mesektet: { label: "Mesektet", gloss: "Night Suns", soul: "sahu, the Eternal Self", hekau: "celestial" },
    sakhmu: { label: "Sakhmu", gloss: "Spirit Scepters", soul: "khu, the Shining Self", hekau: "effigy" },
    sefekhi: { label: "Sefekhi", gloss: "the Unbandaged Ones", soul: "khaibit, the Shadow Self", hekau: "necromancy" },
    udjasen: { label: "Udja-sen", gloss: "Judged Ones", soul: "special", hekau: null }
};
export function amentiOf(v) {
    const s = String(v ?? "").toLowerCase().replace(/[^a-z]/g, "");
    for (const [k, a] of Object.entries(AMENTI)) if (s.includes(k) || s.includes(a.gloss.toLowerCase().replace(/[^a-z]/g, "").replace(/^the/, "").replace(/s$/, ""))) return k;
    return "";
}
/** The six paths of Hekau (Chapter Four). */
export const HEKAU = { alchemy: { label: "Alchemy" }, amulets: { label: "Amulets" }, celestial: { label: "Celestial" }, effigy: { label: "Effigy" },
    necromancy: { label: "Necromancy" }, nomenclature: { label: "Nomenclature" } };
export const hekauOf = v => { const s = String(v ?? "").toLowerCase(); return Object.keys(HEKAU).find(k => s.includes(k) || s.includes(k.replace(/s$/, ""))) ?? ""; };

/**
 * Casting a spell (p. 78): the path's rating + the Trait the spell names, against its difficulty. Its Sekhem is spent whether it works
 * or not; more Sekhem before the roll buys automatic successes, no more than the path's rating. A ritual is extended: gather successes
 * equal to its Sekhem cost; a botch loses all the Sekhem put in.
 */
export function spellPlan({ path = 0, trait = 0, level = 1, cost = 0, extra = 0, pool = 0, difficulty = 6 } = {}) {
    if (n(level) > n(path)) return { ok: false, why: `that spell needs the path at ${level}` };
    const x = clamp(n(extra), 0, n(path));
    const total = n(cost) + x;
    if (total > n(pool)) return { ok: false, why: `it needs ${total} Sekhem and the pool holds ${n(pool)}` };
    return { ok: true, dice: n(path) + n(trait), difficulty: clamp(n(difficulty), 2, 10), autoSuccesses: x, spend: total, capped: n(extra) > x };
}
export function ritualStep(state = { got: 0 }, successes, need, botch = false) {
    if (botch) return { got: 0, done: true, failed: true };
    const got = n(state.got) + Math.max(0, n(successes));
    return { got, done: got >= n(need), failed: false };
}
/** Active amulets and effigies made by ritual: at most Balance + the higher of Amulets and Effigy (p. 78). */
export const activeObjects = (balance, amulets, effigy) => n(balance) + Math.max(n(amulets), n(effigy));

/**
 * Sekhem (p. 143): the rating stands at the Balance (it seldom passes it); the pool is spent on Hekau. It returns: one point at each
 * sunrise (the Gift of Ra) unless in semektet; in the Web of Faith, a day's Balance roll at the Shroud's rating, a point a success
 * (a botch costs one); at a haven outside the Web, Wits + Meditation at 8, then the same roll at 9.
 */
export const sekhemCap = (balance, rating = null) => Math.max(0, Math.min(n(balance) || 10, rating == null ? 10 : n(rating)));
export function blessing(r, { pool = 0, cap = 0 } = {}) {
    if (r.botch) return { pool: Math.max(0, n(pool) - 1), gained: -1 };
    const p = Math.min(n(cap), n(pool) + n(r.successes));
    return { pool: p, gained: p - n(pool) };
}
/** Semektet (p. 144): no Sekhem outside the Web; no Gift of Ra, no Hekau; after 70 days, an Attribute a day; a Willpower roll a day at 7 (4 bandaged). */
export function semektet({ pool = 0, inWeb = false, days = 0, bandaged = false } = {}) {
    if (n(pool) > 0 || inWeb) return { weakened: false };
    const d = n(days);
    return { weakened: true, attributeLoss: d > 70 ? (bandaged ? Math.floor((d - 70) / 3) : d - 70) : 0, willpowerDifficulty: bandaged ? 4 : 7, order: ["Mental", "Social", "Physical"] };
}

/** Balance (pp. 141–142): resisting a pull against Ma'at, countering magic (Balance at 8), Forbiddance (Balance against Willpower at 6). */
export const BALANCE_USES = {
    conviction: { label: "Strength of conviction: resist a temptation or a power", note: "the Storyteller sets 4 to 8; on a Willpower roll to resist, add Balance to Willpower" },
    uphold: { label: "Uphold Ma'at: counter a spell or power (Balance at 8)", note: "each success takes one away from the other side" },
    forbid: { label: "Forbiddance: drive off a malign being (Balance against its Willpower, 6)", note: "the mummy wins: it cannot attack and must leave; a tie: nothing" }
};
/** Offenses against Ma'at (p. 142): an offense counts at or below the mummy's Balance. */
export const OFFENSES = [
    [1, "Murder, rape, torture; a deliberate act that kills or lastingly harms a person who lives by Ma'at"],
    [2, "Those offenses against any living creature that lives by Ma'at; letting any of them happen unopposed"],
    [3, "Harm out of hatred, jealousy or fear; destroying ancient or holy things; self-destruction and addiction"],
    [4, "Deliberate harm to property without just cause; harm in passion to a creature; deliberate emotional harm"],
    [5, "Harm through ignorance, negligence or thoughtlessness"],
    [6, "Theft, deception or betrayal against any person"],
    [7, "Harm of any kind to a person, beyond self-defense or upholding Ma'at"],
    [8, "Harm to any living creature, beyond self-defense or upholding Ma'at"],
    [9, "Letting any of these happen in your presence without trying to stop it"],
    [10, "Doing anything less than your utmost to uphold and embody Ma'at"]
];
export const offenseCounts = (balance, row) => n(row) <= n(balance);
/** The judges' verdict on a fall (p. 141): Hekau above the new Balance falls to it (or by one where it is already at or below), Traits above five to it. */
export function judgment({ balance = 1, hekau = {}, traitsAbove5 = {} } = {}) {
    const b = n(balance);
    const h = {}, t = {};
    for (const [k, v] of Object.entries(hekau)) h[k] = n(v) > b ? b : Math.max(0, n(v) - 1);
    for (const [k, v] of Object.entries(traitsAbove5)) t[k] = n(v) > 5 && n(v) > b ? Math.max(5, b) : n(v);
    return { hekau: h, traits: t };
}

/** The khat past Incapacitated (p. 136): five more levels, which the resurrection must mend. */
export const KHAT = ["Broken or Scorched", "Crushed or Burned", "Dismembered or Incinerated", "Pulverized or Cremated", "Dust or Ash"];
/** The Ba Background (p. 64): the least time dead, extra resurrection dice and years. */
export const BA = [{ rest: "one year", dice: 0 }, { rest: "nine months", dice: 1 }, { rest: "70 days", dice: 2 }, { rest: "29 days", dice: 3 }, { rest: "three days", dice: 4 }, { rest: "one day", dice: 5 }];
/**
 * The resurrection (p. 138): spend a permanent Sekhem and roll Willpower + Ba, or a permanent Willpower and roll Sekhem + Ba, at 8.
 * Each success mends a level, the khat's first. Failing: a day's wait and another point; a botch: the Ba's full wait again.
 * More than one roll in a year costs an Attribute dot for each. What damage is left counts as aggravated.
 */
export function resurrectPlan({ spend = "sekhem", willpower = 0, sekhem = 0, ba = 0 } = {}) {
    return spend === "sekhem" ? { pool: n(willpower) + n(ba), difficulty: 8, cost: "sekhem" } : { pool: n(sekhem) + n(ba), difficulty: 8, cost: "willpower" };
}
export function resurrectOutcome(r, { khat = 0, levels = 7, rollsThisYear = 0 } = {}) {
    if (r.botch) return { risen: false, wait: "the Ba's full time", attributeLoss: n(rollsThisYear) >= 1 ? 1 : 0 };
    const s = n(r.successes);
    if (s < n(khat)) return { risen: false, mended: s, wait: "a day", attributeLoss: n(rollsThisYear) >= 1 ? 1 : 0, khatLeft: n(khat) - s };
    return { risen: true, mended: s, remaining: Math.max(0, n(levels) - (s - n(khat))), attributeLoss: n(rollsThisYear) >= 1 ? 1 : 0, conscious: s > n(khat) };
}
/** Healing (p. 136): lethal heals on the mortal chart as if one level better (Bruised in 12 hours); aggravated at the mortal rate. */
export const HEAL_LETHAL = ["12 hours", "one day", "three days", "one week", "one month", "one month and one week"];

/** Mummy blood (p. 145): to a vampire each point counts twice and drains a Sekhem; to a Kuei-jin it is Yang. */
export const bloodDrunk = points => ({ vampireGains: n(points) * 2, sekhemLost: n(points) });
/** The Veil (p. 140): a mortal's reaction by Willpower, 1 to 10. */
export const VEIL = ["", "catatonia", "panic", "disbelief", "berserk", "terror", "conciliatory", "controlled fear", "curiosity", "anger", "blasé"];
export const veil = willpower => VEIL[clamp(n(willpower), 1, 10)];

/** Experience (p. 146). Udja-sen: every path at the current rating × 5. */
export function xpCost(trait, current = 0, { favored = false, udjasen = false } = {}) {
    const c = n(current);
    switch (trait) {
        case "attribute": return c * 4;
        case "ability": return c ? c * 2 : 3;
        case "background": return c ? c * 3 : 4;
        case "hekau": return c ? c * (udjasen ? 5 : favored ? 4 : 6) : 7;
        case "spell": return Math.max(1, c);
        case "balance": return c * 7;
        case "willpower": return c;
        default: return 0;
    }
}
/** Character creation (p. 56): the Second Life, then the Rebirth. */
export const STARTING = { first: { attributes: [6, 4, 3], abilities: [11, 7, 4], abilityCap: 3, backgrounds: 3, freebies: 5 },
    rebirth: { attributes: 2, abilities: 5, hekau: 3, primaryHekau: 1, backgrounds: 2, balance: 1, balanceMax: 3, willpower: 5, sekhem: 1, freebies: 10, spells: 2, rituals: 2 } };
