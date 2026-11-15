/**
 * WoDX Actions: the spirit Charms of Werewolf 20th (pp. 366-368), the pure rules (B5650-B5659). Each Charm is in
 * WoDX's own words with its page, and says what it does on the table. A spirit is any actor with a Charm on its sheet
 * (the system's Power of type Charm); its traits are Rage, Gnosis and Willpower, and Essence is both its health and the
 * fuel for its Charms (p. 365).
 *
 *   kind   roll     the Storyteller rolls the spirit's Gnosis, Rage or Willpower at the book's difficulty
 *          free     no roll (Blast, Armor, Flood, Freeze, Illuminate, Swift Flight, Umbraquake and others)
 *          always   works by itself while the Charm is on the sheet (Blighted Touch)
 *   cost   {essence}: Essence spent first
 *   diff   a number, "willpower" (the target's Willpower, as Corruption and Possession), or "gauntlet" (the higher of
 *          6 and the Gauntlet here, as Disorient)
 *   sizes  a choice in the window that sets the difficulty (Create Fires, Create Wind, Healing, Break Reality, Flood)
 *   spec   a result for the effects card (mage-da-effects.js helpers); world: kinds for world-effects.js
 *   does   the Foundry side's own handler for what the card cannot carry (charms.js)
 *
 * House rules, each marked in the summary: Cleanse the Blight rolls at 7 when no blight rating is known; Freeze and
 * Umbraquake reach everyone within 10 yards; Blighted Touch resists at 6 and lasts three hours; Calcify lasts the
 * scene; Possession's time to take hold is shown and the hold itself lasts until the spirit is driven out.
 */
import { T, N, S, outcomesOf } from "./mage-da-effects.js";

const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
export const BOOK = "W20";
const W = p => `${BOOK} p. ${p}`;

const P = (key, name, p, group, kind, fx, o = {}) => ({ key, name, p, group, kind, fx, cost: {}, keywords: [], ...o });

export const GROUPS = { common: "Common Charms", specialty: "Specialty Charms", bane: "Bane Charms", weaver: "Weaver Charms", wyld: "Wyld Charms" };

/** Pages are the printed pages of Werewolf: The Apocalypse 20th Anniversary Edition. */
export const CHARMS = [
    // Common Charms (every spirit has them unless weakened or punished)
    P("airtsense", "Airt Sense", 366, "common", "roll", "Knows the ways of the spirit world: lays or finds a spirit track, and finds a place or someone in the Umbra on a Gnosis roll.",
        { roll: "gnosis", diff: 6, does: "track", spec: N("sense"), keywords: ["sense"] }),
    P("materialize", "Materialize", 366, "common", "free", "Takes a body on Earth when its Gnosis is at least the Gauntlet here; it keeps its spirit traits and gains health levels.",
        { does: "materialize", keywords: ["manifest"] }),
    P("realmsense", "Realm Sense", 366, "common", "roll", "Feels what happens in its own domain, in the Umbra and on Earth; a Gnosis roll to know one spot.",
        { roll: "gnosis", diff: 6, does: "realm", spec: N("sense"), keywords: ["sense"] }),
    P("reform", "Re-form", 366, "common", "roll", "Spends a turn dissolving and flows home through the Umbra, out of the fight; it needs a Gnosis roll.",
        { roll: "gnosis", diff: 6, does: "reform", keywords: ["move"] }),
    // Specialty Charms
    P("armor", "Armor", 366, "specialty", "free", "Two Essence: soak dice equal to its Gnosis against every kind of harm for the rest of the scene.",
        { cost: { essence: 2 }, does: "armor", lasts: "scene", keywords: ["ward"] }),
    P("blast", "Blast", 366, "specialty", "free", "One Essence: fire, sound, glass or blades hurled from afar; Rage in aggravated damage dice, no roll to hit and no dodging.",
        { cost: { essence: 1 }, does: "blast", keywords: ["harm"] }),
    P("cleanse", "Cleanse the Blight", 366, "specialty", "roll", "Burns spiritual corruption out of the place around it on a Gnosis roll (7 when the blight's strength is not known, house).",
        { roll: "gnosis", diff: 7, world: ["cleanse"], spec: N("sense"), keywords: ["mend"] }),
    P("controlelectrical", "Control Electrical Systems", 366, "specialty", "roll", "Takes over a machine as if at its controls: run it, shut it down or overload it. Gnosis, 3 for a simple thing, 9 for a complex one.",
        { roll: "gnosis", diff: 6, sizes: [["simple", "A light, a door, a radio", 3], ["usual", "A car, a lift, a telephone exchange", 6], ["complex", "A power station, a mainframe", 9]], does: "lights", era: 1880, keywords: ["work"] }),
    P("createfires", "Create Fires", 367, "specialty", "roll", "Fire from nothing: Gnosis at 3 for a torch, 6 for a bonfire, 9 for an inferno. With nothing to burn it lasts one turn.",
        { roll: "gnosis", diff: 6, sizes: [["torch", "A torch's flame", 3], ["bonfire", "A bonfire", 6], ["inferno", "An inferno", 9]], does: "fire", keywords: ["harm"] }),
    P("createwind", "Create Wind", 367, "specialty", "roll", "Raises or stills the wind: Gnosis at 3 for a strong breeze, 6 for a storm, 9 for a tornado.",
        { roll: "gnosis", diff: 6, sizes: [["breeze", "A strong breeze", 3], ["calm", "Still the wind", 6], ["storm", "A storm", 6], ["tornado", "A tornado", 9]], does: "wind", keywords: ["weather"] }),
    P("illuminate", "Illuminate", 367, "specialty", "free", "Light out to 20 yards around it, or every light nearby changes colour. No roll.",
        { does: "illuminate", lasts: "scene", keywords: ["light"] }),
    P("flood", "Flood", 367, "specialty", "free", "One Essence: the water rises. A small spirit floods a building or a block; more Essence, or a mightier spirit, floods streets.",
        { cost: { essence: 1 }, sizes: [["block", "A building or a block (1 Essence)", 0], ["streets", "The low streets of a town (3 Essence, Gnosis 6 or more)", 0]], does: "flood", keywords: ["harm"] }),
    P("freeze", "Freeze", 367, "specialty", "free", "Bitter cold: its Rage drops by one for the scene, and everyone near takes the new Rage in aggravated dice (10 yards, house).",
        { does: "freeze", keywords: ["harm"] }),
    P("healing", "Healing", 367, "specialty", "roll", "Mends a living body: Gnosis at 6 for lethal harm, 8 for aggravated; it heals levels equal to its Gnosis, once a scene for each target.",
        { roll: "gnosis", diff: 6, sizes: [["lethal", "Lethal and bashing harm", 6], ["aggravated", "Aggravated harm", 8]], does: "heal", once: "sceneTarget", keywords: ["mend"] }),
    P("moonbridge", "Open Moon Bridge", 367, "specialty", "free", "Opens a moon bridge anywhere, with no caern needed, to a place up to 1000 miles away.",
        { does: "bridge", keywords: ["move"] }),
    P("peek", "Peek", 367, "specialty", "free", "Looks from the Penumbra into the physical world.",
        { does: "peek", lasts: "scene", keywords: ["sense"] }),
    P("shapeshift", "Shapeshift", 367, "specialty", "free", "Looks like anything it likes, with no change to its powers; a Willpower roll to pass as one particular being.",
        { roll: "willpower", diff: 6, rollIf: "specific", does: "shape", lasts: "scene", keywords: ["shape"] }),
    P("shatterglass", "Shatter Glass", 367, "specialty", "roll", "Every pane and bottle nearby bursts on a Gnosis roll at 6; the shards cover the ground.",
        { roll: "gnosis", diff: 6, world: ["rubble"], keywords: ["harm"] }),
    P("shortout", "Short Out", 367, "specialty", "roll", "Fries the wiring of machines nearby on a Gnosis roll at 6: the lights go out.",
        { roll: "gnosis", diff: 6, does: "shortout", era: 1880, keywords: ["work"] }),
    P("swiftflight", "Swift Flight", 367, "specialty", "free", "Flies at three times its speed, up to 60 + Willpower x 3 yards a turn.",
        { does: "flight", lasts: "scene", keywords: ["move"] }),
    P("tracking", "Tracking", 367, "specialty", "free", "One Essence: follows its quarry without fail.",
        { cost: { essence: 1 }, does: "tracking", lasts: "scene", spec: T("sense", "Tracked by a spirit", "scene"), keywords: ["sense"] }),
    P("umbraquake", "Umbraquake", 367, "specialty", "free", "The Umbra heaves: everyone standing near is thrown down and takes half its Rage in bashing dice (10 yards, house).",
        { does: "quake", keywords: ["harm", "trip"] }),
    P("updraft", "Updraft", 367, "specialty", "roll", "A gust lifts a body the size of a person into the air on a Willpower roll at 6.",
        { roll: "willpower", diff: 6, does: "updraft", keywords: ["trip"] }),
    // Bane Charms (the Wyrm's gifts)
    P("blightedtouch", "Blighted Touch", 367, "bane", "always", "Whoever it harms rolls Willpower (6, house) or the worst of their nature rules them for hours; a botch makes it last.",
        { does: "blight" }),
    P("corruption", "Corruption", 367, "bane", "roll", "Whispers a suggestion that the target then acts on, even across the Gauntlet. Gnosis against the target's Willpower.",
        { roll: "gnosis", diff: "willpower", spec: T("sway", "A whispered suggestion", "scene"), keywords: ["sway"] }),
    P("incitefrenzy", "Incite Frenzy", 367, "bane", "roll", "Drives a shapeshifter into frenzy: Rage against the target's Willpower. Six or more successes: the frenzy of the Wyrm's thrall.",
        { roll: "rage", diff: "willpower", does: "frenzy", keywords: ["fear"] }),
    P("possession", "Possession", 367, "bane", "roll", "Slips into a living being or a thing: Gnosis against its Willpower, or 4 for an object. More successes, the faster it takes hold.",
        { roll: "gnosis", diff: "willpower", objectDiff: 4, does: "possess", keywords: ["possess"] }),
    // Weaver Charms
    P("calcify", "Calcify", 367, "weaver", "roll", "Binds a body into the Pattern Web: Willpower against the target's Rage, each success a dot off a Physical Attribute (or Essence). At none, the target is stuck.",
        { roll: "willpower", diff: 6, resist: { pool: "rage", diff: 6 }, does: "calcify", lasts: "scene", keywords: ["hold"] }),
    P("solidify", "Solidify Reality", 368, "weaver", "roll", "Strengthens the Pattern: each Gnosis success gives the target a health level (or an Essence) for a day; only one at a time.",
        { roll: "gnosis", diff: 6, does: "solidify", keywords: ["ward"] }),
    P("spiritstatic", "Spirit Static", 368, "weaver", "free", "Thickens the Gauntlet here by one (three spirits together, by three); it must stay and loses two dice from every pool while it does.",
        { does: "static", lasts: "scene", keywords: ["ward"] }),
    // Wyld Charms
    P("breakreality", "Break Reality", 368, "wyld", "roll", "Changes a thing's Umbral form, one part a success: water to acid, a wall to a door. A failure costs an Essence, a botch a Gnosis too.",
        { roll: "gnosis", diff: 6, sizes: [["small", "A small change (a lock opens)", 5], ["usual", "A clear change (water to acid)", 7], ["great", "A wild change (a couch to a feast)", 9]], does: "break", spec: S("work"), keywords: ["shape"] }),
    P("disorient", "Disorient", 368, "wyld", "roll", "Moves the landmarks and the directions: Gnosis at 6 or the Gauntlet, whichever is higher.",
        { roll: "gnosis", diff: "gauntlet", spec: T("fortune", "Disoriented", "scene", "all"), keywords: ["fortune", "veil"] })
];

export const BY_KEY = Object.fromEntries(CHARMS.map(c => [c.key, c]));
const slug = s => String(s ?? "").toLowerCase().replace(/\(.*?\)/g, "").replace(/&/g, "and").replace(/[^a-z]/g, "");
const ALIASES = { openmoonbridge: "moonbridge", moonbridge: "moonbridge", cleansetheblight: "cleanse", controlelectricalsystems: "controlelectrical",
    solidifyreality: "solidify", reform: "reform", materialise: "materialize", armour: "armor" };
const BY_SLUG = Object.fromEntries(CHARMS.map(c => [slug(c.name), c.key]));

/** The Charm a sheet item's name stands for, or null. */
export function charmOf(name) {
    const s = slug(name);
    const k = BY_SLUG[s] ?? ALIASES[s];
    return k ? BY_KEY[k] : null;
}

/** The spirit's traits: Rage, Gnosis, Willpower as dots, Essence as its pool (W20 p. 365). */
export function traitsOf(sys = {}) {
    const a = sys.advantages ?? {};
    const dots = t => n(t?.permanent ?? t?.roll ?? t?.value);
    const ess = a.essence ?? {};
    return { rage: dots(a.rage), gnosis: dots(a.gnosis), willpower: dots(a.willpower ?? sys.willpower), essence: n(ess.temporary), essenceMax: n(ess.max) || n(ess.permanent) };
}

/** The difficulty for a use: a size's difficulty, the target's Willpower, the Gauntlet, or the book's number. */
export function diffOf(c, { size = null, targetWillpower = null, gauntlet = null, object = false } = {}) {
    const s = c.sizes?.find(x => x[0] === size);
    let d = s && s[2] ? s[2] : c.diff;
    if (d === "willpower") d = object && c.objectDiff ? c.objectDiff : (n(targetWillpower) || 6);
    if (d === "gauntlet") d = Math.max(6, n(gauntlet));
    return Math.max(2, Math.min(10, n(d) || 6));
}

/** The dice: the trait the book names, less the two dice Spirit Static costs while it holds. */
export function poolOf(c, traits, { static: busy = false } = {}) {
    if (!c.roll) return 0;
    return Math.max(0, n(traits[c.roll]) - (busy ? 2 : 0));
}

/** Can the spirit pay: {ok, why, cost}. Flood's streets cost three, as the book allows more Essence for more water. */
export function costOf(c, { size = null } = {}) {
    let e = n(c.cost?.essence);
    if (c.key === "flood" && size === "streets") e = 3;
    return e;
}
export function canPay(c, traits, opts = {}) {
    const e = costOf(c, opts);
    if (e > traits.essence) return { ok: false, why: `needs ${e} Essence, has ${traits.essence}`, essence: e };
    if (c.key === "flood" && opts.size === "streets" && traits.gnosis < 6) return { ok: false, why: "a town flood needs Gnosis 6 or more", essence: e };
    return { ok: true, why: "", essence: e };
}

/** Materialize needs Gnosis at least the Gauntlet (an unrated place lets it through). */
export const canMaterialize = (gnosis, gauntlet) => gauntlet === null || gauntlet === undefined || n(gnosis) >= n(gauntlet);

/** Possession's time to take hold, by successes (p. 367). */
export const POSSESSION_TIME = [[1, "six hours", 6 * 3600], [2, "three hours", 3 * 3600], [3, "an hour", 3600], [4, "fifteen minutes", 900], [5, "five minutes", 300], [6, "at once", 0]];
export function possessionTime(successes) {
    const s = Math.max(1, Math.min(6, n(successes)));
    const [, label, seconds] = POSSESSION_TIME[s - 1];
    return { label, seconds };
}

/** Freeze: the new Rage after the drop, and the dice everyone near takes. Umbraquake: half the Rage, rounded down. */
export const freezeDice = rage => Math.max(0, n(rage) - 1);
export const quakeDice = rage => Math.floor(n(rage) / 2);

/** Swift Flight: three times the speed; the cap the book gives, in yards. */
export const flightCap = willpower => 60 + 3 * n(willpower);

/** Incite Frenzy: any success is a frenzy, six or more the Wyrm's thrall. */
export const frenzyOf = successes => (n(successes) >= 6 ? "thrall" : n(successes) >= 1 ? "frenzy" : null);

/** Calcify: the dots it takes, after the target's resisting successes. */
export const calcifyDots = (successes, resisted) => Math.max(0, n(successes) - n(resisted));

/** Healing: levels equal to Gnosis; once a scene a target. used: {"<sceneNo>": [actorIds]} */
export function healLeft(used = {}, scene, targetId) {
    return !(used?.[String(scene)] ?? []).includes(targetId);
}
export function healUsed(used = {}, scene, targetId) {
    const k = String(scene);
    return { [k]: [...new Set([...(used?.[k] ?? []), targetId])] };
}

/** The effects card's results for a Charm and its successes (a free Charm counts one). */
export function resultsOf(c, successes, { source = "" } = {}) {
    if (!c?.spec) return [];
    const s = c.kind === "free" ? Math.max(1, n(successes)) : n(successes);
    if (s < 1) return [];
    return outcomesOf(c.spec, { key: c.spec.kw, label: c.name, source: source || W(c.p) }, s, c.fx);
}

/** NPC choice: the Charms an NPC spirit may use by itself (always-on ones need no choosing). */
export function choosable(list = []) {
    return list.filter(c => c.kind !== "always" && (c.keywords ?? []).length);
}

/** A Charm that needs the modern world's wiring stays out of earlier eras (the year it is first any use). */
export const fitsEra = (c, year) => !c.era || year === null || year === undefined || year === "" || !Number.isFinite(Number(year)) || Number(year) >= c.era;

export const pageOf = c => W(c.p);
export const rollLabel = c => (c.roll ? c.roll[0].toUpperCase() + c.roll.slice(1) : "");
