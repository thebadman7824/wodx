/**
 * WoDX Actions (B7927-B7930): everyday wonders of a Dark Ages mage, pure rules. Enchanting as a craft (Dark Ages: Mage
 * pp. 202-207): charms laid on a blade, elixirs and poultices, a divining rod, each made with its fellowship's Pillars
 * and done the local, superstitious way to cancel a 1. Tass from creatures (pp. 190-199) and from the fae (Dark Ages:
 * Fae p. 182). Summaries in our own words with the printed page. No Foundry calls.
 */

export const REF = "Dark Ages: Mage";
export const FAE_REF = "Dark Ages: Fae";
const n = v => { const x = Number(v); return Number.isFinite(x) ? Math.trunc(x) : 0; };

/**
 * The wonders. kind: charm (laid on a weapon on the sheet), elixir (an item that is drunk, eaten or bound on), tool (an
 * item that is used). by: {fellowship: {pillar: level}}. use: what it does in play (thrall-free numbers WoDX reads).
 * The Pillar dots are read from a scan that blurs them: B7927 records the reading.
 */
const W = (key, name, kind, page, by, does, use) => ({ key, name, kind, page, by, does, use });
export const WONDERS = [
    W("sharpness", "A blessing of sharpness", "charm", 203, { batini: { anbiya: 1, hajj: 1 }, spirit: { warrior: 1 } },
        "Oil and a chanted ode on the last polish: the edge takes a point off the foe's armour for every two successes.", { piercing: "half" }),
    W("unbreakable", "Unbreakable iron", "charm", 203, { hermes: { primus: 1, vires: 2 }, valdaermen: { forlog: 1, hjaldar: 2 } },
        "Iron tempered twenty-two times and packed in red clay: almost nothing a human hand does can break it, and it strikes three harder.", { bonus: 3 }),
    W("cask", "The cask that never spoils", "tool", 203, { hermes: { primus: 1, vires: 2 } },
        "A coat of volcanic ash and river clay baked three days: what is kept inside cannot spoil, sour or be poisoned.", { keeps: true }),
    W("waterskin", "The pure waterskin", "tool", 203, { oldfaith: { spring: 2, winter: 1 } },
        "Rubbed with a young lamb's blood: all water poured from it is clean and cool.", { keeps: true }),
    W("rod", "A divining rod", "tool", 204, { batini: { anbiya: 1 }, hermes: { primus: 1 } },
        "A forked branch that points toward the nearest cray or free Quintessence within a day's walk; an hour and a Willpower stretch it to a week's.", { rod: true }),
    W("fertility", "An elixir of fertility", "elixir", 205, { oldfaith: { spring: 1 } },
        "Sweet mead, daisy petals and an egg; useless if the drinker knows its purpose. Works on any beast that bears live young.", { named: "Fertile", days: 30 }),
    W("sterility", "An elixir of sterility", "elixir", 205, { oldfaith: { winter: 2 } },
        "The same draught without the yolk.", { named: "Barren", days: 30 }),
    W("truth", "A draught of truth", "elixir", 205, { hermes: { corona: 1 } },
        "Rosemary, brook water and rosehip wine that tastes of mild red wine: questioned, the drinker can say only the plain truth.", { fortune: { shift: 4, tags: ["subterfuge"] }, scene: true }),
    W("falsehood", "A draught of falsehood", "elixir", 205, { hermes: { corona: 1 } },
        "Brewed with stagnant water instead: the drinker can only lie, however much they wish not to.", { fortune: { shift: 4, tags: ["empathy", "leadership", "etiquette"] }, scene: true }),
    W("strength", "A sauce of strength", "elixir", 205, { valdaermen: { hjaldar: 1 } },
        "Salt, pepper, honey and cow's blood over beef or venison: strength past a human body's for three days.", { boost: { dice: 2, on: "physical" }, days: 3 }),
    W("weakness", "A sauce of weakness", "elixir", 205, { valdaermen: { forlog: 3 } },
        "Made with a chicken's blood: the eater cannot rise from bed for four sunrises.", { penalty: 3, days: 4 }),
    W("clarity", "A meal of clarity", "elixir", 205, { batini: { fatihah: 5 } },
        "Wild onion greens in vinegar, oil and sweet spice: a keen mind until the next full moon.", { boost: { dice: 1, on: "mental" }, days: 15 }),
    W("madness", "A meal of madness", "elixir", 205, { batini: { fatihah: 4 } },
        "The same, cooked with mutton and onions: madness until the next full moon.", { fortune: { shift: 2, tags: ["mental"] }, days: 15 }),
    W("health", "A leech poultice", "elixir", 205, { spirit: { wiseone: 2 } },
        "A live leech in damp peat and mud, bound on with linen and kept damp: a wound through the skin heals.", { heal: "successes" }),
    W("sickness", "A dead-leech poultice", "elixir", 205, { spirit: { trickster: 4 } },
        "Made with a dead leech, the wound festers and rots until it is taken off.", { harm: 1, type: "lethal" }),
    W("slowrot", "Slow rot", "elixir", 206, { oldfaith: { winter: 5 } },
        "Two venoms, spider silk and spirit, pricked into the lower body: gangrene that shows days or weeks later.", { harm: 2, type: "lethal" }),
    W("sleep", "A sleeping draught", "elixir", 206, { messianic: { raphael: 1 } },
        "Honey, moon-dipped well water, a crocus petal and iron shavings, mixed three hours past sunset; it keeps.", { condition: "incapacitated", hours: 8 }),
    W("vigor", "A draught of vigour", "elixir", 206, { valdaermen: { fara: 1, hjaldar: 1 } },
        "Powdered hare's leg in mare's milk: a day without fatigue, then two days of rest.", { boost: { dice: 1, on: "physical" }, days: 1, after: { penalty: 2, days: 2 } })
];
const BY_KEY = new Map(WONDERS.map(w => [w.key, w]));
export const wonderOf = key => BY_KEY.get(key) ?? null;
/** The wonders a fellowship knows how to make. */
export const wondersFor = fellowship => WONDERS.filter(w => !!w.by[fellowship]);
/** The Pillar levels a fellowship needs for a wonder, or null. */
export const levelsFor = (w, fellowship) => (w?.by?.[fellowship] ? { ...w.by[fellowship] } : null);
/** Done the local, superstitious way (with the book's materials), one 1 is cancelled for Backlash (pp. 203, 205). */
export const localWayOnes = (ones, localWay) => Math.max(0, n(ones) - (localWay ? 1 : 0));
/** The armour a sharp edge takes off: one per two successes. */
export const piercingFrom = successes => Math.floor(Math.max(0, n(successes)) / 2);

/* ---- Tass ---- */

/**
 * Tass a body yields. q: Quintessence; per: "each" (a harvest), "week" (a living one, once a week), "wound" (a point a
 * wound level of blood spilled); living/dead where the book says; side: what else happens (WoDX acts on some).
 */
const S = (key, name, page, o) => ({ key, name, page, ...o });
export const TASS = [
    S("gluttony", "Gluttony's venom, burned in olive oil", 190, { q: 3 }),
    S("lust", "One of Lust's garnets", 191, { q: 2, note: "it can hold ten more as a focus for matters of the heart" }),
    S("pride", "A lock of Pride's hair, burned", 191, { q: 1 }),
    S("wrath", "A spike of Wrath's hide, ground into water", 192, { q: 2 }),
    S("white-unicorn", "A white unicorn's spilled blood", 193, { q: 1, per: "wound" }),
    S("red-unicorn", "A red unicorn's tail hair, smoked", 193, { q: 1, note: "one point to each who breathes it" }),
    S("brownie", "A sun-struck brownie's bones, powdered", 194, { q: 3, note: "for spells that build or strengthen; other brownies know who did it", side: "brownies" }),
    S("child-stealer", "A child stealer's blood, distilled from the living", 195, { q: 3, note: "each dose also eases emotional sway by one" }),
    S("goblin", "A goblin's heart, pulped in marble", 196, { q: 5, note: "each point spent counts as two for Backlash", side: "goblin" }),
    S("malicious-fae", "A malicious faerie's blood, baked into ten biscuits", 196, { q: 10, note: "the fae smell it on the eater's breath for a month", side: "biscuits" }),
    S("troll", "A living troll's smoked tail, eaten at noon", 197, { q: 3, note: "lasts until the next sunrise; a male gives four portions, a troll maid three" }),
    S("risen", "A Risen bound with a holy thing", 198, { q: 1, note: "for a scene; the Risen loses a Strength and will take its revenge", side: "risen" })
];
/** Tass from the living or dead fae, by origin (Dark Ages: Fae p. 182): a living one yields once a week. */
export const FAE_TASS = { firstborn: { living: 5, dead: 10 }, changeling: { living: 2, dead: 5 }, inanimae: { living: 3, dead: 7 } };
const TASS_BY = new Map(TASS.map(t => [t.key, t]));
export const tassOf = key => TASS_BY.get(key) ?? null;
/** What a harvest yields: {q, ok, why}. o: {wounds, origin, living, lastWeek, week, taken}. */
export function harvest(key, o = {}) {
    if ( key === "fae" ) {
        const f = FAE_TASS[o.origin] ?? FAE_TASS.firstborn;
        if ( o.taken ) return { ok: false, q: 0, why: "that body has given its Tass" };
        if ( o.living && o.lastWeek !== undefined && o.lastWeek !== null && n(o.lastWeek) >= n(o.week) ) return { ok: false, q: 0, why: "a living fae yields once a week" };
        return { ok: true, q: o.living ? f.living : f.dead, page: 182, ref: FAE_REF };
    }
    const t = tassOf(key);
    if ( !t ) return { ok: false, q: 0, why: "no such source" };
    const q = t.per === "wound" ? Math.max(0, n(o.wounds)) * t.q : t.q;
    return q > 0 ? { ok: true, q, page: t.page, ref: REF, side: t.side ?? null, note: t.note ?? "" } : { ok: false, q: 0, why: "no blood was spilled" };
}
/** Bodies with nothing to take (p. 198-199): ghosts, the Re'em, the Serpent of Sloth, a homunculus. */
export const NO_TASS = ["ghost", "re'em", "sloth", "homunculus"];
