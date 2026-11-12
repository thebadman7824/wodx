/**
 * WoDX Actions 3.41.0: what feeding does to the vessel, and the feeding limits of clans and bloodlines.
 * Pure rules, no Foundry calls (tools/harness/feeding.test.mjs).
 *
 * The vessel (B960, Ben 2026-11-12): each blood point a living vessel loses is one level of lethal damage (V20 printed
 * p. 57 says a Giovanni Kiss does twice "the damage of another vampire's", one point costing two levels). A living
 * vessel has the lower of its blood and (full blood - damage), the book's wounds rule turned both ways (V20 printed
 * p. 269). Lost blood comes back at one point a day (p. 270); the damage heals by the healing chart.
 *
 * Clan and bloodline limits (B961-B965). Each rule has a V20 version and, where V20 Dark Ages prints its own, a
 * Dark Ages one, used in the Dark Ages and Long Night eras or before 1450.
 */

/** Profiles (profiles.js) whose bodies hold their own living blood: these take damage when drunk from. */
export const LIVING = ["mortal", "hunter", "mage", "beast", "fae", "lupine", "ghoul"];
export const isLiving = kind => LIVING.includes(kind);

/** Vessel kinds (rules.js VESSELS) that are animals. */
export const ANIMALS = ["cow", "dog", "cat", "bird", "rat"];

const n = v => Number(v) || 0;
const SECONDS_A_DAY = 86400;

/* ------------------------------------------------------------------ */
/*  The vessel                                                          */
/* ------------------------------------------------------------------ */

/**
 * A living vessel's blood now: what was left at the last feeding plus one point a day since, never past full.
 * `state` is the flag {value, at} or null (never drunk from: full).
 */
export function bloodNow(state, full, now) {
    if (!state || state.value === undefined || state.value === null) return n(full);
    const days = Math.max(0, Math.floor((n(now) - n(state.at)) / SECONDS_A_DAY));
    return Math.max(0, Math.min(n(full), n(state.value) + days));
}

/** Blood a living vessel can give: the lower of its blood and (full - damage). Others give their pool. */
export function available({ blood, full, damage = 0, living = true }) {
    if (!living) return Math.max(0, Math.floor(n(blood)));
    return Math.max(0, Math.min(Math.floor(n(blood)), n(full) - n(damage)));
}

/** Lethal levels a Kiss does: one per point (two for the Giovanni), none to a vessel that isn't alive. */
export function kissDamage(points, { mult = 1, living = true } = {}) {
    return living ? Math.max(0, n(points)) * Math.max(1, n(mult)) : 0;
}

/** What the book says about the amount taken (V20 printed p. 269): 20% safe, half needs a hospital, all kills. */
export function vesselOutcome(lost, full) {
    const f = Math.max(1, n(full)), l = Math.max(0, n(lost));
    if (l >= f) return { key: "dead", text: "drained dry" };
    if (l * 2 >= f) return { key: "hospital", text: "needs a hospital (half its blood or more is gone)" };
    if (l * 5 <= f) return { key: "safe", text: "fairly safe (a fifth of its blood or less)" };
    return { key: "weak", text: "weak and pale" };
}

/* ------------------------------------------------------------------ */
/*  Tags (Ventrue palates, Prey Exclusion, passers-by)                 */
/* ------------------------------------------------------------------ */

/** Lower-case tags from an array or a comma/semicolon list; "a younger sister" stays one tag. */
export function parseTags(v) {
    const list = Array.isArray(v) ? v : String(v ?? "").split(/[,;]+/);
    return [...new Set(list.map(t => String(t ?? "").trim().toLowerCase().replace(/\s+/g, " ")).filter(Boolean))];
}

/** Does the vessel fit? true or false, or null when either side has no tags (the Storyteller decides). */
export function matchTags(wanted, have) {
    const w = parseTags(wanted), h = parseTags(have);
    if (!w.length || !h.length) return null;
    return w.some(t => h.includes(t));
}

/** The group named in a Prey Exclusion item, "Prey Exclusion (children, priests)" -> ["children", "priests"]. */
export function preyExclusionTags(itemName) {
    const m = String(itemName ?? "").match(/\((.+)\)/);
    return m ? parseTags(m[1]) : [];
}

/* ------------------------------------------------------------------ */
/*  Clans and bloodlines                                                */
/* ------------------------------------------------------------------ */

/**
 * The feeding rules. Fields: palate (one kind of mortal only; miss: "vomit" or "none"), flesh (Nagaraja), kissMult,
 * unwilling ("wp": lose a Willpower point; "wpRoll": Willpower 6 or -2 dice for the night), mustFight ("none": no
 * nourishment unless fought first; "wpRoll": Willpower 6 or -2 dice), noAnimal, offering (half without it),
 * lamia ("v20" | "da"), addiction (Kindred blood), bondFirstDouble.
 */
export const CLAN_FEEDING = {
    ventrue: { label: "Ventrue",
        v20: { palate: true, miss: "vomit", page: "V20 printed p. 73",
            note: "Only one kind of mortal blood nourishes; any other, animals too, gives nothing and comes back up. Vampire blood is exempt." },
        da: { palate: true, miss: "none", page: "V20 Dark Ages pdf p. 68",
            note: "Only one kind of mortal nourishes; other mortal blood gives nothing and doesn't hold off the Beast. Vampire blood is exempt." } },
    nagaraja: { label: "Nagaraja",
        v20: { flesh: true, page: "V20 printed p. 407",
            note: "Must eat flesh as well as blood: each night without it costs a die from every Physical pool, cumulative; each flesh point eaten wins one back. A body has 10 flesh points; each gives a blood point and does one unsoakable lethal level to the vessel." } },
    giovanni: { label: "Giovanni",
        v20: { kissMult: 2, page: "V20 printed p. 57",
            note: "The Kiss is agony: a mortal vessel takes two health levels for each blood point taken." },
        da: { kissMult: 2, page: "V20 Dark Ages pdf p. 86",
            note: "The Kiss is excruciating (house reading: two health levels a point, as V20)." } },
    salubri: { label: "Salubri",
        v20: { unwilling: "wp", page: "V20 printed p. 409",
            note: "Feeding on an unwilling vessel costs a Willpower point." },
        da: { unwilling: "wpRoll", page: "V20 Dark Ages pdf p. 102",
            note: "Healers roll Willpower (6) to feed on the unwilling; failing, they find a willing vessel or take -2 dice on every roll for the night. Vessels enthralled by Presence count as willing." } },
    "salubri-warrior": { label: "Salubri warrior",
        v20: { mustFight: "none", page: "V20 printed p. 432",
            note: "In modern nights the warriors' heirs are the antitribu (house reading): blood only nourishes if taken by force, from a fallen foe or after fighting the vessel." },
        da: { mustFight: "wpRoll", page: "V20 Dark Ages pdf p. 104",
            note: "Warriors roll Willpower (6) to feed on someone they haven't beaten in a fight, or take -2 dice on every roll for the night." } },
    "salubri-antitribu": { label: "Salubri antitribu",
        v20: { mustFight: "none", page: "V20 printed p. 432",
            note: "Blood only nourishes if taken by force: from a fallen foe, or after fighting the vessel." } },
    noiad: { label: "Noiad",
        v20: { noAnimal: true, page: "V20 printed p. 427", note: "Animal blood gives them nothing." } },
    danava: { label: "Danava",
        v20: { noAnimal: true, offering: true, page: "V20 Dark Ages pdf p. 82",
            note: "Animal blood gives nothing. Without a short offering of the vessel to the gods (thirty seconds), blood gives half." } },
    lamia: { label: "Lamia",
        v20: { lamia: "v20", page: "V20 printed p. 423",
            note: "The bite carries the Seed of Lilith: the vessel rolls Stamina (6 for women, 8 for men) or takes a pox that kills within days. Kindred who drink Lamia blood carry it." },
        da: { lamia: "da", page: "V20 Dark Ages pdf p. 92",
            note: "The bite carries the Seed of Lilith: one lethal level a night for a fortnight unless a nightly Stamina roll (7) resists. Kindred who drink Lamia blood carry it." } },
    "assamite-antitribu": { label: "Assamite antitribu",
        v20: { addiction: true, page: "V20 printed p. 429",
            note: "Drinking Kindred blood: Self-Control or Instinct (3 + points drunk) or addiction; once addicted, Self-Control or Instinct (6) to pass up a chance to drink it." } },
    tremere: { label: "Tremere",
        da: { bondFirstDouble: true, page: "V20 Dark Ages pdf p. 64",
            note: "The first drink of another Cainite's blood counts as two toward the Blood Oath." } }
};

/** The rule key for a clan or bloodline name ("Salubri Antitribu", "wod.bio.vampire.ventrue", "Children of Osiris" -> null). */
export function clanKey(text) {
    const t = String(text ?? "").toLowerCase().replace(/^wod\.bio\.vampire\./, "").replace(/[_-]+/g, " ").trim();
    if (!t) return null;
    if (/salubri/.test(t) && /antitribu|furies|fury/.test(t)) return "salubri-antitribu";
    if (/salubri/.test(t) && /warrior/.test(t)) return "salubri-warrior";
    if (/salubri/.test(t)) return "salubri";
    if (/assamite|banu haqim/.test(t) && /antitribu/.test(t)) return "assamite-antitribu";
    if (/antitribu/.test(t)) {
        // Other antitribu share the parent clan's weakness (Ventrue antitribu keep the palate)
        if (/ventrue/.test(t)) return "ventrue";
        return null;
    }
    for (const k of ["ventrue", "nagaraja", "giovanni", "noiad", "danava", "lamia", "tremere"]) if (t.includes(k)) return k;
    return null;
}

/** The rule set for a key in this era: the Dark Ages version when there is one and the era is Dark Ages. */
export function ruleFor(key, { darkAges = false } = {}) {
    const r = CLAN_FEEDING[key];
    if (!r) return null;
    const v = darkAges ? (r.da ?? r.v20) : (r.v20 ?? null);
    return v ? { key, label: r.label, ...v } : null;
}

/** Dark Ages rules apply in the Dark Ages and Long Night eras, or to a year before 1450. */
export function isDarkAgesFeeding({ eraId = null, year = null } = {}) {
    if (eraId === "dark-ages" || eraId === "long-night") return true;
    return year !== null && year !== undefined && n(year) > 0 && n(year) < 1450;
}

/**
 * How much of the blood drunk nourishes, 0, 0.5 or 1, and why. `fits` is the palate verdict (true/false/null);
 * a null palate verdict counts as a fit (the Storyteller ticks the box when it doesn't).
 */
export function nourishment(rule, { vesselKind = "human", vampireVessel = false, fits = true, fought = false, offering = true } = {}) {
    if (!rule) return { factor: 1, why: "" };
    const animal = ANIMALS.includes(vesselKind);
    if (rule.palate && !vampireVessel && fits === false)
        return { factor: 0, why: rule.miss === "vomit" ? "not the blood the palate allows: no nourishment, and it comes back up" : "not the blood the palate allows: no nourishment, and the Beast isn't held off" };
    if (rule.noAnimal && animal) return { factor: 0, why: "animal blood gives nothing" };
    if (rule.mustFight === "none" && !fought && !vampireVessel) return { factor: 0, why: "blood not taken by force gives nothing" };
    if (rule.offering && !offering) return { factor: 0.5, why: "no offering to the gods: half the blood" };
    return { factor: 1, why: "" };
}

/** Blood that nourishes, rounded down. */
export const nourished = (points, factor) => Math.floor(n(points) * n(factor));

/** The Seed of Lilith resist difficulty (V20: 6 for women, 8 for men; 7 when the vessel's sex isn't known, house rule). */
export function lamiaDifficulty(tags) {
    const t = parseTags(tags);
    if (t.includes("woman") || t.includes("female")) return 6;
    if (t.includes("man") || t.includes("male")) return 8;
    return 7;
}

/** Assamite antitribu addiction roll difficulty: 3 + blood points of Kindred vitae drunk, at most 10. */
export const addictionDifficulty = points => Math.min(10, 3 + Math.max(0, n(points)));

/* ------------------------------------------------------------------ */
/*  Nagaraja flesh                                                      */
/* ------------------------------------------------------------------ */

/** A body's flesh points: 10 for a human, 5 for a child, the vessel's blood points for an animal (house reading). */
export function fleshPoints(vesselKind, pool) {
    if (vesselKind === "human") return 10;
    if (vesselKind === "child") return 5;
    return Math.max(0, Math.floor(n(pool)));
}

/** Nightfall: a night without flesh adds one to the debt (one die off every Physical pool per point of debt). */
export function nightPassed(state = {}) {
    const ate = !!state.ateTonight;
    return { debt: ate ? n(state.debt) : n(state.debt) + 1, ateTonight: false };
}

/** Eating flesh: each point wins back one die. */
export function fleshEaten(state = {}, points = 0) {
    return { debt: Math.max(0, n(state.debt) - Math.max(0, n(points))), ateTonight: n(points) > 0 || !!state.ateTonight };
}

/* ------------------------------------------------------------------ */
/*  Hunting: palates and habits                                         */
/* ------------------------------------------------------------------ */

/** A Ventrue palate makes the hunt harder (B962, house rule): broad +1, narrow +2. */
export const PALATE_BREADTH = { broad: { label: "Broad (merchants, Catholics, soldiers)", diff: 1 }, narrow: { label: "Narrow (younger sisters, red-haired men)", diff: 2 } };
export const palateHuntDifficulty = breadth => PALATE_BREADTH[breadth]?.diff ?? 0;

/**
 * Feeding habits (B964): V20's own words for how a vampire feeds (V20 printed pp. 35-36, "Vulgar Argot"), each a
 * saved "usual hunt" that fills in the hunting window. The pools, grounds and years are house readings.
 * from/to: years the habit makes sense in; prey: rules.js VESSELS key; area: rules.js HUNTING_GROUNDS key.
 */
export const HUNT_STYLES = {
    alleycat: { label: "Alleycat or Slummer (the homeless and the poor)", area: "slums", prey: "human", attr: "wits", ability: "streetwise" },
    banker: { label: "Banker (blood banks and hospital stores)", area: "merchant", prey: "human", attr: "intelligence", ability: "streetwise", from: 1937, cold: 60,
        note: "Banked blood has little taste and is cold: it sustains but elders scorn it." },
    butterfly: { label: "Butterfly (the rich and famous)", area: "merchant", prey: "human", attr: "manipulation", ability: "etiquette" },
    casanova: { label: "Casanova or Tease (seduction, leaving them alive)", area: "market", prey: "human", attr: "appearance", ability: "subterfuge",
        note: "Use Seduction under Dealing with this person on a target, then Feed." },
    farmer: { label: "Farmer (animals only)", area: "lower", prey: "cow", attr: "wits", ability: "animalken" },
    head: { label: "Head (the drunk and the drugged)", area: "lower", prey: "human", attr: "wits", ability: "streetwise", state: "drunk" },
    headhunter: { label: "Headhunter (other Kindred)", area: "patrolled", prey: "vampire", attr: "perception", ability: "investigation",
        note: "Feeding on Kindred: Blood Oath steps, and diablerie is a step away." },
    rake: { label: "Rake (the Rack: taverns, brothels, clubs)", area: "lower", prey: "human", attr: "charisma", ability: "streetwise" },
    sandman: { label: "Sandman (only the sleeping)", area: "market", prey: "human", attr: "dexterity", ability: "stealth" }
};

/** Is a habit possible in this year? Banking needs blood banks (from 1937). */
export function styleAllowed(key, year) {
    const s = HUNT_STYLES[key];
    if (!s) return false;
    if (year === null || year === undefined || !n(year)) return true;
    return (!s.from || n(year) >= s.from) && (!s.to || n(year) <= s.to);
}

/** A warning when a habit clashes with the clan's feeding rule, or "" when it doesn't. */
export function styleClash(key, rule) {
    const s = HUNT_STYLES[key];
    if (!s || !rule) return "";
    const animal = ANIMALS.includes(s.prey);
    if (animal && rule.palate) return `${rule.label}: animal blood gives no nourishment.`;
    if (animal && rule.noAnimal) return `${rule.label}: animal blood gives nothing.`;
    if (rule.unwilling && ["sandman", "head", "alleycat"].includes(key)) return `${rule.label}: these vessels rarely consent; feeding on the unwilling has a cost.`;
    if (rule.mustFight && !["headhunter"].includes(key)) return `${rule.label}: unless the vessel is fought first, the blood doesn't nourish (or costs Willpower).`;
    return "";
}
