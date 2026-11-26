/**
 * WoDX Actions (B7904-B7909): a Dark Ages mage's household and standing, the pure rules. Dark Ages: Mage pp. 37,
 * 83-93, in WoDX's own words with page references; no book text.
 *
 *   Chantry      the pooled points: size, security, Aura damping, a place in the community; with no community points
 *                the commoners talk (a rumour on the Chronicle clock)
 *   Destiny      once a story, the rating at 7 for Willpower back
 *   Familiar     the Pact, its boons, and Quintessence a week equal to the rating, or it weakens and dies
 *   Library      Intelligence + Library to find lore; Library at 8 takes experience off a Pillar
 *   Servants     commoners (eat, sleep, can be bribed, learn) or constructs (one task, never tire, never betray)
 *   Talisman     an attuned focus, a one-use item, or a wonder; its level is the highest Pillar in its making
 *   Degrees      each fellowship's ranks (p. 37)
 *   Merits and flaws of pp. 90-93 that WoDX Actions carries out in these windows
 *
 * WoDX keeps the household on the actor's flags (wodx-actions.daHouse): {chantry, familiar, servants, talismans,
 * destiny, apprentice, madness, degree, ...}. Everything here is plain data in, plain data out.
 */
import { auraOf } from "./mage-da-rules.js";

export const REF = "Dark Ages: Mage";
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, n(v)));

/* ------------------------------------------------------------------ */
/*  Chantry (pp. 83-84)                                                */
/* ------------------------------------------------------------------ */

/** The size a chantry's size points buy: [points, what it is, how many live there comfortably]. */
export const CHANTRY_SIZES = [
    [1, "a small home, perhaps with a farm", 2],
    [2, "a roomy building: a farmhouse and barn, or a workshop in a town", 4],
    [3, "a noble's cottage or country house, or a few buildings together", 7],
    [4, "a building about the size of a church", 10],
    [5, "a castle", 20]
];
export const CHANTRY_USES = ["size", "security", "aura", "community"];
/** B7904 house reading: the optional flaws rule (p. 84) lets security go below nothing to pay for the rest; WoDX lets it go to -3. */
export const CHANTRY_FLAW_FLOOR = -3;

/**
 * The chantry's points spent. pool: the Chantry rating (the cabal's pooled dots). spend: {size, security, aura,
 * community}. opts.flaws: the Storyteller allows the optional rule, so security may be negative.
 * Returns {ok, why?, spent, left, size: {points, what, room}, breakIn, auraDamp, community}.
 */
export function chantryPlan(pool, spend = {}, { flaws = false } = {}) {
    const size = clamp(spend.size, 0, 10), aura = clamp(spend.aura, 0, 5), community = clamp(spend.community, 0, 10);
    const security = clamp(spend.security, flaws ? CHANTRY_FLAW_FLOOR : 0, 10);
    const spent = size + security + aura + community, p = Math.max(0, n(pool));
    if (spent > p) return { ok: false, why: `${spent} points spent; the chantry has ${p}`, spent, left: p - spent };
    if (!flaws && n(spend.security) < 0) return { ok: false, why: "security below nothing needs the optional chantry flaws rule", spent, left: p - spent };
    const row = CHANTRY_SIZES[Math.min(5, size) - 1];
    return { ok: true, spent, left: p - spent, size: { points: size, what: size ? row[1] : "no room of its own yet", room: size > 5 ? `more than ${CHANTRY_SIZES[4][2]}` : (size ? row[2] : 0) },
        breakIn: security, auraDamp: aura, community };
}

/** A cabal member's Aura on the chantry grounds: as if the Foundation were the damping points lower (p. 84). */
export const auraOnGrounds = (foundation, damp = 0, member = true) => auraOf(member ? Math.max(0, n(foundation) - n(damp)) : n(foundation));

/**
 * B7904: the commoners' talk about a chantry (p. 84). With no community points they trade stories every week; WoDX
 * spaces the talk out by the points spent and stops it at three (house reading): 0 every week, 1 every second week,
 * 2 every fourth, 3 or more never. The tone softens with each point.
 */
export const GOSSIP_EVERY = [1, 2, 4];
export const GOSSIP = [
    { tone: "damaging", truth: "half", text: (who, place) => `Folk say strange things go on at ${place}: lights at night, odd smells, people coming and going. Some say ${who} deals with the Devil.` },
    { tone: "wary", truth: "half", text: (who, place) => `Folk wonder what keeps ${who} so busy at ${place}, and why the shutters stay closed.` },
    { tone: "idle", truth: "unknown", text: (who, place) => `${who} of ${place} is odd, folk say, but does no harm.` }
];
export function gossipDue({ community = 0, lastWeek = null } = {}, week) {
    const c = Math.max(0, n(community));
    if (c >= GOSSIP_EVERY.length) return null;
    if (lastWeek !== null && n(week) - n(lastWeek) < GOSSIP_EVERY[c]) return null;
    return GOSSIP[c];
}

/* ------------------------------------------------------------------ */
/*  Destiny (p. 85)                                                    */
/* ------------------------------------------------------------------ */

export const DESTINY = ["", "a minor destiny", "a notable destiny", "a crucial destiny", "a world-changing destiny", "a destiny Heaven itself turns on"];
export const DESTINY_DIFF = 7;
/** Once a story, against danger that threatens the destiny: the rating in dice at 7, a Willpower back a success. */
export function destinyOpen({ story = null, fulfilled = false } = {}, storyNow, rating) {
    if (fulfilled) return { ok: false, why: "the destiny is fulfilled; the Background is gone" };
    if (!(n(rating) > 0)) return { ok: false, why: "no Destiny" };
    if (story === storyNow) return { ok: false, why: "Destiny is rolled once a story" };
    return { ok: true, dice: Math.min(5, n(rating)), difficulty: DESTINY_DIFF };
}
export const destinyWillpower = (roll, room) => Math.max(0, Math.min(n(room), roll?.botch ? 0 : n(roll?.successes)));

/* ------------------------------------------------------------------ */
/*  Familiar (pp. 85-86)                                               */
/* ------------------------------------------------------------------ */

/** The boons a Familiar's dots buy (p. 86): max dots, and what each does. */
export const FAMILIAR_BOONS = {
    backlash: { label: "Backlash negation", max: 5, what: "once a story per dot, it takes one Backlash (a bad one counts as two)" },
    speech: { label: "Communication", max: 2, what: "1: speaks any tongue the mage knows; 2: speaks mind to mind with anyone in sight" },
    knowledge: { label: "Knowledge", max: 5, what: "three dots of a Knowledge the mage lacks per dot, or one question a story per dot to the spirits it knows" },
    protection: { label: "Protection", max: 3, what: "1: a die to soak; 2: an extra action to get away; 3: once a story, carries the mage to safety for a Quintessence" }
};
export const FAMILIAR_RANKS = ["", "a minor, fairly useful familiar", "a notable magical creature", "an impressive and somewhat loyal companion", "a being with its own reasons", "it is not clear who serves whom"];

/** The boons bought with the Familiar's dots (house reading B7905: one dot of boons per dot of Familiar). */
export function familiarPlan(rating, boons = {}) {
    const r = Math.max(0, n(rating));
    const b = Object.fromEntries(Object.entries(FAMILIAR_BOONS).map(([k, d]) => [k, clamp(boons[k], 0, d.max)]));
    const spent = Object.values(b).reduce((s, v) => s + v, 0);
    if (spent > r) return { ok: false, why: `${spent} dots of boons; the Familiar has ${r}`, boons: b, spent };
    return { ok: true, boons: b, spent, left: r - spent };
}

/**
 * B7905: the weekly meal. A familiar eats Quintessence equal to its rating each week (p. 85). A week unfed weakens it by
 * a dot of strength (house reading: its boons count that much lower, highest first); fed again, it recovers a dot a
 * week; weakened to nothing, it dies.
 */
export function familiarWeek(fam = {}, week, rating) {
    const r = Math.max(0, n(rating));
    const fed = n(fam.fedWeek) === n(week);
    let weak = Math.max(0, n(fam.weak));
    weak = fed ? Math.max(0, weak - 1) : weak + 1;
    const dead = r > 0 && weak >= r;
    return { ...fam, weak: dead ? r : weak, dead: !!fam.dead || dead, lastWeek: n(week) };
}
/** The dots a familiar can use now: its rating less its weakness. */
export const familiarStrength = (fam = {}, rating) => fam.dead ? 0 : Math.max(0, n(rating) - Math.max(0, n(fam.weak)));
/** The boons as they stand at that strength: the weakness is taken from the largest first. */
export function boonsNow(boons = {}, strength) {
    const out = { ...boons };
    let over = Object.values(out).reduce((s, v) => s + n(v), 0) - Math.max(0, n(strength));
    while (over > 0) {
        const k = Object.keys(out).filter(x => n(out[x]) > 0).sort((a, b) => n(out[b]) - n(out[a]))[0];
        if (!k) break;
        out[k] = n(out[k]) - 1; over--;
    }
    return out;
}
export const feedCost = rating => Math.max(0, n(rating));
/** Uses left this story of a boon that is counted (Backlash negation, questions, the carry to safety). */
export function boonLeft(fam = {}, boon, dots, storyNow) {
    const used = fam.used?.story === storyNow ? n(fam.used?.[boon]) : 0;
    const cap = boon === "protection" ? (n(dots) >= 3 ? 1 : 0) : n(dots);
    return Math.max(0, cap - used);
}
export function useBoon(fam = {}, boon, storyNow, k = 1) {
    const used = fam.used?.story === storyNow ? { ...fam.used } : { story: storyNow };
    used[boon] = n(used[boon]) + n(k);
    return { ...fam, used };
}

/* ------------------------------------------------------------------ */
/*  Library (p. 87) and Pillars by experience (pp. 89-93)              */
/* ------------------------------------------------------------------ */

export const LIBRARY = ["", "an unfinished book or a half-burned scroll", "a book written by someone who knew, or so one hopes", "a cave wall carved long ago and left alone", "a set of illuminated manuscripts in fair condition", "a great library: most subjects are at least mentioned"];
/** Each Library dot costs two Background or bonus points at creation (p. 87). */
export const LIBRARY_POINTS = 2;
export const LIBRARY_XP_DIFF = 8;
/**
 * A Pillar's next dot in experience (p. 89): current x 6, a new one 10. Pillar Natural (p. 93): current x 5, a new one 8.
 * The Library's roll at 8 takes one off a success (p. 87); WoDX never lets the price fall below one (house reading B7906).
 */
export function pillarPrice(current, { natural = false, librarySuccesses = 0 } = {}) {
    const c = Math.max(0, n(current));
    const base = c === 0 ? (natural ? 8 : 10) : c * (natural ? 5 : 6);
    const off = Math.max(0, n(librarySuccesses));
    return { base, off: Math.min(off, base - 1), cost: Math.max(1, base - off) };
}

/* ------------------------------------------------------------------ */
/*  Servants (pp. 87-88) and the Apprentice (p. 92)                    */
/* ------------------------------------------------------------------ */

export const SERVANTS = ["", "one rather ordinary servant", "two who do well enough, or one exceptional", "three ordinary, or one remarkable", "four ordinary, two impressive, or one outstanding", "five ordinary, three exceptional, or one so good no one notices them"];
export const SERVANT_KINDS = {
    commoner: { label: "A commoner", what: "eats and sleeps, can learn new work, and can be bribed, threatened or bewitched into betrayal" },
    construct: { label: "A magical servant", what: "does one task, quickly, never tires, sickens or betrays; cannot learn another" }
};
/** How steady a commoner servant is by quality (house reading B7907: their Willpower for a bribe roll). */
export const SERVANT_QUALITY = { ordinary: 3, good: 4, exceptional: 5, remarkable: 6, outstanding: 7 };
export const BRIBE_DIFF = 6;
/**
 * Someone works on a servant to turn them (p. 88). A construct cannot be turned without strong magic. A commoner rolls
 * their Willpower at 6, +1 when threatened, +2 when bewitched; a good apprentice (Apprentice as a Merit) is loyal: -2.
 */
export function bribePlan(servant = {}, { threat = false, magic = false } = {}) {
    if (servant.kind === "construct") return { immune: !magic, dice: 0, difficulty: 0, why: magic ? "only strong magic can turn it, and the Storyteller decides" : "a magical servant does not betray its master" };
    const dice = SERVANT_QUALITY[servant.quality] ?? 3;
    let diff = BRIBE_DIFF + (threat ? 1 : 0) + (magic ? 2 : 0) - (servant.apprentice === "merit" ? 2 : 0);
    return { immune: false, dice, difficulty: clamp(diff, 3, 10) };
}
/** A construct finishes its one task in half the time (house reading of "much shorter times", p. 88). */
export const taskTime = (servant = {}, hours) => servant.kind === "construct" ? Math.max(0.5, n(hours) / 2) : n(hours);
/** An untaught apprentice (four weeks without a lesson) gives the master nothing (p. 92: no benefit without teaching). */
export const APPRENTICE_LAPSE_WEEKS = 4;
export const apprenticeTaught = (ap = {}, week) => ap.lastTaught !== undefined && ap.lastTaught !== null && n(week) - n(ap.lastTaught) < APPRENTICE_LAPSE_WEEKS;
/** The lazy apprentice (Apprentice as a Flaw) makes a mess of something on a d10 of 1-3 a week (house reading). */
export const apprenticeMess = face => n(face) <= 3;

/* ------------------------------------------------------------------ */
/*  Talisman (p. 88)                                                   */
/* ------------------------------------------------------------------ */

export const TALISMAN = ["", "a minor talisman: an attuned focus, or something used once", "an impressive talisman", "a true wonder", "an awe-inspiring talisman", "the stuff of legend"];
export const TALISMAN_KINDS = { focus: "An attuned focus (counts as a focus no longer needed: -1 difficulty)", once: "Used once (a potion, a charm)", wonder: "A lasting wonder" };
/** The talismans a rating covers: their levels together no more than the rating (house reading B7908). */
export function talismanCheck(list = [], rating) {
    const total = list.reduce((s, t) => s + clamp(t.level, 1, 5), 0);
    return total <= n(rating) ? { ok: true, total } : { ok: false, total, why: `talismans of ${total} levels; the Background is ${n(rating)}` };
}

/* ------------------------------------------------------------------ */
/*  Degrees of Attainment (p. 37)                                      */
/* ------------------------------------------------------------------ */

/**
 * Each fellowship's ranks, lowest first. B7909: the scan of the p. 37 table runs its columns together; WoDX reads it
 * with the fellowships' own chapters (Messianic pp. 47-48, Batini pp. 39-40, Valdaermen p. 70, where the apprentices
 * are thanes). The Old Faith's ranks are used only in an organised circle or mystery cult.
 */
export const DEGREES = {
    batini: ["Mutasawwif", "Murid", "Murshid", "Qutb"],
    messianic: ["Catechumen", "Disciple", "Presbyter", "Exarch or Curia minister"],
    oldfaith: ["Initiate", "Mystes", "Hierophant", "Epoptes"],
    hermes: ["Apprentice", "Disciple", "Adept", "Master"],
    spirit: ["Apprentice", "Shaman", "Master"],
    valdaermen: ["Thane", "Karl", "Konungr"]
};
export const ORGANISED_ONLY = ["oldfaith"];
export function degreeOf(fellowship, k, { organised = true } = {}) {
    const list = DEGREES[fellowship] ?? [];
    if (!list.length) return null;
    if (ORGANISED_ONLY.includes(fellowship) && !organised) return { title: "", rank: 0, top: list.length, note: "outside a circle, the Old Faith uses no ranks" };
    const rank = clamp(k, 1, list.length);
    return { title: list[rank - 1], rank, top: list.length };
}
/**
 * B7909 house reading: standing tells. With another of the fellowship, a mage of higher degree takes -1 Social
 * difficulty for each rank above them, at most -2; a lower degree gains nothing and loses nothing.
 */
export const degreeShift = (mine, theirs) => 0 - Math.min(2, Math.max(0, n(mine) - n(theirs))) || 0;

/* ------------------------------------------------------------------ */
/*  Merits and flaws carried out here (pp. 90-93)                      */
/* ------------------------------------------------------------------ */

/** Devotion: once a game session, a prayer gives 1-3 Willpower for the scene, past the maximum (p. 91). */
export const devotionWillpower = rating => clamp(rating, 1, 3);
/** Arcane Madness: spells a story up to permanent Willpower, then a Willpower roll at 7 each (p. 92). */
export const MADNESS_DIFF = 7;
export const madnessCheck = (castsThisStory, permWill) => n(castsThisStory) > n(permWill);
/** The madness: +1 to every roll for an hour; on a botch +2, and Willpower only holds it off a turn. */
export const madnessShift = roll => (roll?.botch ? 2 : roll?.successes > 0 ? 0 : 1);
/** Inept Channeler: each Quintessence past permanent Willpower in a scene or spell asks a Willpower roll at 6 (p. 92). */
export const INEPT_DIFF = 6;
export const ineptRolls = (spentBefore, spending, permWill) => Math.max(0, n(spentBefore) + n(spending) - Math.max(n(permWill), n(spentBefore)));
/** Chicanery: small shows of magic at will while a Quintessence is held; three turns of upkeep for a point (p. 92). */
export const showCost = (chicanery, turns = 1) => chicanery ? Math.ceil(Math.max(0, n(turns) - 3) / 3) : Math.max(1, Math.ceil(n(turns) / 3));
/** Living Fount: once a story, the Fount at 6 for a cryptic hint (p. 92). */
export const LIVING_FOUNT_DIFF = 6;
/** Witchwalk, by its points (p. 93). */
export const WITCHWALK = [
    "",
    "skin far too pale, which many places take for a mark of heresy",
    "a light breeze follows wherever they go",
    "consecrated ground burns their feet: no harm, but great pain while they walk on it",
    "they cast no shadow",
    "salt thrown over the shoulder wards a person from their magic for a day, and salt on their skin is a lethal wound that cannot be soaked"
];
/** B7909 house reading: the pain of hallowed ground is +2 difficulty to everything while they stand on it. */
export const HALLOWED_PAIN = 2;
/** A sign others can see (levels 1, 2 and 4): seen, it starts talk. */
export const witchwalkSeen = level => [1, 2, 4].includes(n(level));
/** Salt wards someone from the mage's spells for a day (level 5). */
export const saltWarded = (ward = {}, mageId, now) => !!ward && ward.mage === mageId && n(ward.until) > n(now);
