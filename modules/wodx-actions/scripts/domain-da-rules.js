/**
 * WoDX Actions: building a domain, the V20 Dark Ages Companion chapter 7 (B7679-B7684). Pure, no Foundry; domain-da.js
 * is the Foundry side. Printed pages of the Companion; the rules in WoDX's own words.
 *
 *   B7679 the manor (pp. 108-109): the Domain Background's dots are split among Area (at least 1), Defense (+1 to intrude
 *         a dot), Prosperity (-1 to Commerce a dot; Resources to its rating at half the maturation cost) and Secret
 *         Ways (-1 to hide or slip away in the manor a dot, for those who know it).
 *   B7680 the people (pp. 109-113): Herd as Populace (the households, people, levies and land of its table), the
 *         Settlement Merit (hamlet to great city: its rating in Resources and Influence of its own, while the Populace
 *         holds it), staff by type (armigers, courtiers, foresters, scholars: pools of 4 + dots, 1 less for each more
 *         person, 10 at most) and the Servants Background (-1 to Seneschal and Leadership on domain business a dot; the
 *         retinue one can take away).
 *   B7681 fealty (pp. 106-107): a vassal offers 2 dots of Backgrounds for each dot of the liege's Anchor Background; a
 *         liege lends at most half of a Background; cutting a vassal off costs the liege a dot of that Anchor; Cainites
 *         and knights may offer 1 to 5 "phantom" dots of reputation instead; the Vassal Merit; oaths name the duties.
 *   B7682 domain events (pp. 113-115): ten events and what each does to the domain's dots for a season or more.
 *   B7683 maturation (p. 105): these Backgrounds and the Vassal and Settlement Merits rise with maturation experience,
 *         2 for the first dot and the current rating x2 after.
 */
export const BOOK = "V20 Dark Ages Companion";
export const page = p => `${BOOK} p. ${p}`;
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---------------- The manor (B7679) ---------------- */
export const ASPECTS = {
    area: { label: "Area", p: 108, min: 1, residents: [10, 50, 100, 500, 1000],
        levels: ["A lone tower, hermitage or fortified cottage", "A keep with a tower or two, or a small abbey", "A real castle or monastery with fields and trade",
            "A great house with outbuildings, farms or workshops: a hub of trade", "A walled town, a district or a vast complex"] },
    defense: { label: "Defense", p: 109, levels: ["Walls and a thin watch", "True fortifications and an ordered watch", "Strong works, a strong watch, and neighbours who look out",
        "Could hold out a siege, and stands where it matters", "Always ready for war, and wary of the stealthy too"] },
    prosperity: { label: "Prosperity", p: 109, levels: ["Good land, hunting and timber", "Herds, a copper mine or good vintners", "A fine mine, famous horses or a family of skilled makers",
        "A gold mine or work of rare quality, such as fine armour", "Goods famed far and wide for their beauty or rarity"] },
    secret: { label: "Secret Ways", p: 109, levels: ["A hidden door or tunnel", "A few hidden doors and false walls", "Hidden passages and a bolt-hole for supplies or a coffin",
        "At least one large hidden room", "A hidden way out of almost every room, and several hidden rooms"] }
};
export const ASPECT_KEYS = Object.keys(ASPECTS);
/** The aspects as dots, 0 to 5 each (Area at least 1 when there is a Domain at all). */
export function normAspects(a = {}) {
    const out = {};
    for (const k of ASPECT_KEYS) out[k] = clamp(Math.floor(n(a[k])), 0, 5);
    return out;
}
/** Do the aspects split the Domain's dots? Returns {ok, used, left, why}. */
export function checkAspects(aspects, domainDots) {
    const a = normAspects(aspects), used = ASPECT_KEYS.reduce((s, k) => s + a[k], 0), dots = Math.max(0, n(domainDots));
    if (dots <= 0) return { ok: used === 0, used, left: -used, why: used ? "No Domain Background: no manor to divide." : "" };
    if (a.area < 1) return { ok: false, used, left: dots - used, why: "A manor has at least 1 dot of Area." };
    if (used > dots) return { ok: false, used, left: dots - used, why: `The aspects use ${used} dots; the Domain has ${dots}.` };
    return { ok: true, used, left: dots - used, why: used < dots ? `${dots - used} dot${dots - used === 1 ? "" : "s"} not yet placed.` : "" };
}
/** What the manor does to rolls, as standing difficulty shifts. */
export function manorShifts(aspects = {}) {
    const a = normAspects(aspects);
    return { intrude: a.defense, commerce: -a.prosperity, hide: -a.secret };
}
export const residentsOf = area => ASPECTS.area.residents[clamp(n(area), 1, 5) - 1] ?? 0;

/* ---------------- The people (B7680) ---------------- */
/** Populace by dots: households (vessels, levies), people, square miles of territory (p. 110). */
export const POPULACE = [null, [3, 15, "1"], [7, 35, "1-2"], [15, 75, "1-3"], [30, 150, "2-5"], [60, 300, "3-10"], [120, 600, "6-25"],
    [250, 1250, "10-50"], [500, 2500, "20-100"], [1000, 5000, "40-200"], [2000, 10000, "80-400"]];
export function populaceOf(dots) {
    const d = clamp(Math.floor(n(dots)), 0, 10);
    if (!d) return { dots: 0, households: 0, people: 0, territory: "0", levies: 0 };
    const [households, people, territory] = POPULACE[d];
    return { dots: d, households, people, territory, levies: households };
}
/** The Settlement Merit (pp. 110-111): the Populace it needs and the years it takes to grow. */
export const SETTLEMENTS = [null,
    { name: "Hamlet", minPop: 1, years: 0.5, has: "a church, kept roads, a smithy or a mill" },
    { name: "Village", minPop: 3, years: 1, has: "room for a few trades and storage" },
    { name: "Town", minPop: 5, years: 5, has: "simple walls and a market" },
    { name: "City", minPop: 7, years: 10, has: "walls, many trades, markets and newcomers" },
    { name: "Great City", minPop: 9, years: 20, has: "a hundred thousand souls, most beyond counting" }];
/** What a settlement gives while its Populace holds it: its rating in Resources and Influence of its own. */
export function settlementNow(rating, populace) {
    const r = clamp(Math.floor(n(rating)), 1, 5), s = SETTLEMENTS[r];
    let held = r;
    while (held > 0 && n(populace) < SETTLEMENTS[held].minPop) held -= 1;
    return { rating: r, held, name: held ? SETTLEMENTS[held].name : "a few thorps", shrinks: held < r, resources: held, influence: held };
}
/** The Servants Background (pp. 112-113): how many can be taken away, and the shift on domain business. */
export const RETINUE = [0, 3, 7, 15, 30, 60];
export const servantsOf = dots => { const d = clamp(Math.floor(n(dots)), 0, 5); return { dots: d, retinue: RETINUE[d], shift: -d }; };
/** Staff by type (pp. 111-112): the Abilities a type can have pools in, and the Backgrounds Allies of that type bring. */
export const STAFF = {
    armigers: { label: "Armigers", abilities: ["alertness", "athletics", "archery", "brawl", "intimidation", "melee", "ride"], backgrounds: ["Allies", "Resources", "Retainers"] },
    courtiers: { label: "Courtiers", abilities: ["commerce", "empathy", "etiquette", "expression", "leadership", "performance", "politics", "seneschal"], backgrounds: ["Allies", "Contacts", "Domain", "Herd", "Influence", "Resources", "Retainers"] },
    foresters: { label: "Foresters", abilities: ["alertness", "animalken", "archery", "crafts", "hearthwisdom", "ride", "stealth", "survival"], backgrounds: ["Allies", "Contacts", "Retainers"] },
    scholars: { label: "Scholars", abilities: ["academics", "commerce", "crafts", "enigmas", "investigation", "law", "medicine", "occult", "politics", "seneschal", "theology"], backgrounds: ["Allies", "Contacts", "Influence", "Retainers"] }
};
/** One staff cohort: its pools (three Abilities at 4 + dots, 1 off for each more person, 10 at most) and an Ally's Backgrounds. */
export function staffOf({ type = "armigers", dots = 1, people = 1, ally = false } = {}) {
    const d = clamp(Math.floor(n(dots)), 1, 5), p = clamp(Math.floor(n(people)) || 1, 1, d);
    return { type, label: STAFF[type]?.label ?? type, dots: d, people: p, pool: Math.min(10, 4 + d - (p - 1)), allyBackgrounds: ally ? 2 + d : 0, perBackgroundMax: 5,
        needsResources: ally ? d : 0 };
}

/* ---------------- Fealty (B7681) ---------------- */
export const FEALTY = { p: 106, offerPerAnchor: 2, cutOffCost: 1, phantomMax: 5 };
/** The most Anchor dots a liege can grant for what the vassal offers (true dots plus reputation). */
export const anchorFor = (offered, phantom = 0) => Math.floor((Math.max(0, n(offered)) + clamp(n(phantom), 0, FEALTY.phantomMax)) / FEALTY.offerPerAnchor);
/** The most a liege can lend out of one of their own Backgrounds: half of it. */
export const lendMax = own => Math.floor(Math.max(0, n(own)) / 2);
/** Checks an oath. Returns {ok, why[]}. */
export function checkOath({ anchorDots = 0, liegeOwn = null, offered = 0, phantom = 0, anchorFromVassal = false } = {}) {
    const why = [];
    if (n(anchorDots) < 1) why.push("The liege grants at least 1 dot of an Anchor Background.");
    if (n(anchorDots) > anchorFor(offered, phantom)) why.push(`For ${n(offered)} offered${n(phantom) ? ` and ${n(phantom)} of reputation` : ""} the liege may anchor at most ${anchorFor(offered, phantom)}.`);
    if (!anchorFromVassal && liegeOwn !== null && n(anchorDots) > lendMax(liegeOwn)) why.push(`A liege lends at most half a Background: ${lendMax(liegeOwn)} of ${n(liegeOwn)}.`);
    return { ok: !why.length, why };
}
/** The vassal's Background with the Anchor: their own pooled with the liege's dots (the book's example reaches 6, p. 107, so 10 at most). */
export const pooledWith = (vassalOwn, anchorDots) => Math.min(10, Math.max(0, n(vassalOwn)) + Math.max(0, n(anchorDots)));
/** The Vassal Merit: points to Background dots the liege uses, and the dots the liege must offer. */
export const vassalMerit = points => { const p = clamp(Math.floor(n(points)), 1, 5); return { points: p, liegeGets: 2 * p, liegeOffers: p }; };

/* ---------------- Domain events (B7682) ---------------- */
/** Each event's systems: the dots it moves (choose one of `pick` when given), for a season or more. */
export const SEASON_DAYS = 91;
export const EVENTS = {
    curse: { name: "Curse", p: 114, pick: [["populace", -1], ["resources", -1]], until: "resolved", follows: ["faithful"],
        does: "People or beasts leave or die until the curse is lifted." },
    disaster: { name: "Disaster", p: 114, pick: [["populace", -1], ["area", -1], ["prosperity", -1]], follows: ["invasion", "outlaws", "famine"], servantsRestore: true,
        does: "Quake, storm or flood. Servants rebuild as many lost dots as their own; left in ruin, it invites invaders, outlaws and famine." },
    faithful: { name: "Faithful One", p: 114, pick: [["resources", 1]], until: "while they stay", follows: ["pilgrims", "heresy"],
        does: "One with True Faith comes to heal, preach or hunt a monster; staying a season, the blessings raise Resources." },
    famine: { name: "Famine", p: 114, pick: [["populace", -1]], later: [["servants", -1]], follows: ["outlaws"],
        does: "A bad harvest, rats or broken trade; in time it takes Servants too." },
    invasion: { name: "Invasion", p: 114, pick: [["populace", -1]], siege: [["area", -1]], follows: ["outlaws"],
        does: "An armed force comes to take land or do harm. The Populace's households are the levy; each season of war costs Populace, a siege costs Domain." },
    court: { name: "Itinerant Court", p: 114, pick: [], hosting: true, follows: [],
        does: "The overlord's travelling court arrives: the host needs Servants at least the overlord's Status or Influence; Resources may hire the rest dot for dot, at a cost of 1 Resources." },
    heresy: { name: "Heresy", p: 114, pick: [["influence", 1]], risk: true, follows: ["invasion", "outlaws"],
        does: "A new faith offends the Church or a Road. Backing it gives Influence over its followers, and risks excommunication and the loss of the orthodox." },
    miracle: { name: "Miracle", p: 114, pick: [["resources", 1], ["influence", 1], ["status", 1]], follows: ["pilgrims", "heresy"],
        does: "A sign, true or not: it may bring wealth, sway and standing, pilgrims and heretics." },
    outlaws: { name: "Outlaws", p: 115, pick: [["prosperity", -1], ["resources", -1], ["populace", -1]], follows: [],
        does: "Brigands and rogue knights prey on the land; left alone they wear down Influence and Status too." },
    pilgrims: { name: "Pilgrims", p: 115, pick: [["resources", 1]], until: "while they stay", follows: ["outlaws", "heresy", "faithful", "miracle"],
        does: "Many pilgrims pass through and pay for food, beds and dues; a welcome makes it lasting." }
};
export const EVENT_KEYS = Object.keys(EVENTS);
/** One event's change: the event's own choice of what it hits (the first when none is given). */
export function eventChange(key, choice = 0, { servants = 0 } = {}) {
    const e = EVENTS[key];
    if (!e) return null;
    const [bg, delta] = e.pick[clamp(Math.floor(n(choice)), 0, Math.max(0, e.pick.length - 1))] ?? [null, 0];
    const restore = e.servantsRestore && delta < 0 ? Math.min(Math.abs(delta), servantsOf(servants).dots) : 0;
    return { key, name: e.name, bg, delta, restore, until: e.until ?? "a season", page: page(e.p), follows: e.follows };
}
/** Hosting an itinerant court (p. 114): servants needed, Resources to hire the rest, and whether the host fails. */
export function hostCourt({ overlordStatus = 0, overlordInfluence = 0, servants = 0, resources = 0 } = {}) {
    const need = Math.max(n(overlordStatus), n(overlordInfluence)), short = Math.max(0, need - n(servants));
    const hire = Math.min(short, Math.max(0, n(resources)));
    return { need, short, hire, cost: hire ? 1 : 0, fails: short > hire };
}
/** The domain's dots now: the base, moved by the events that still run. */
export function withEvents(base = {}, events = [], now = 0) {
    const out = { ...base };
    for (const ev of events ?? []) {
        if (ev.ended || (ev.until && n(now) >= n(ev.until))) continue;
        if (ev.bg) out[ev.bg] = Math.max(0, n(out[ev.bg]) + n(ev.delta) + n(ev.restore));
    }
    return out;
}
/** A random event from the table (rand in [0, 1)). */
export const rollEvent = rand => EVENT_KEYS[Math.floor(clamp(n(rand), 0, 0.9999) * EVENT_KEYS.length)];

/* ---------------- Maturation (B7683) ---------------- */
/** Maturation experience for the next dot of a domain Background or the Vassal and Settlement Merits (p. 105). */
export const maturationCost = (current, { prosperityHalf = false } = {}) => { const c = n(current) <= 0 ? 2 : 2 * n(current); return prosperityHalf ? Math.ceil(c / 2) : c; };

/**
 * What the domain does to its holder's rolls, as standing shifts power-mods.js reads (B7684): Prosperity on Commerce,
 * Servants on Seneschal and Leadership, Secret Ways on Stealth inside the manor (onManor: the scene is the manor).
 */
export function standingShifts(domain = {}, { onManor = false, servants = null } = {}) {
    const a = normAspects(domain.aspects), out = [];
    const sv = servantsOf(servants ?? domain.servants);
    if (a.prosperity) out.push({ name: "Prosperity of the manor", shift: -a.prosperity, tags: ["commerce"], page: page(109) });
    if (sv.dots) out.push({ name: "Servants", shift: sv.shift, tags: ["seneschal", "leadership"], page: page(112) });
    if (a.secret && onManor) out.push({ name: "Secret Ways", shift: -a.secret, tags: ["stealth"], page: page(109) });
    return out;
}
