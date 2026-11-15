/**
 * WoDX Actions: faerie Treasures for every era, the pure rules (B6560-B6566). No Foundry here: the harness tests them.
 *
 *   Dark Ages (Dark Ages: Fae pp. 97, 185-191): faerie dust, invested treasures and oathcrafted treasures, and the
 *     treasures a fae makes with the Charm, Persisting Charm, True Enchantment and Dominion Writ cantrips (pp. 126-129,
 *     136), which hold one cantrip of the four Dominions (fae-da-cantrips.js).
 *   Later eras (Changeling 20th pp. 172, 323-326, 367-368): a Treasure holds one Art cantrip at its rating
 *     (c20-arts.js); each use costs a Glamour point, drawn from the Glamour stored in it first; the named Treasures of
 *     the book, and the two Treasures of Banality.
 *
 * A Treasure is an item with the flag wodx-actions.treasure = {key} for a book Treasure, or
 *   {key: "imbued", cantrip, successes, uses, expires, by} for one a fae made, or {key: "c20art", cantrip, level, glamour}.
 * Each entry: name, level, book ("da" | "c20"), page, kind, use (how it is used), fx (WoDX's own words), spec (the
 * effects card, mage-da-effects.js helpers) and, where the effect is more than the card carries, does (treasures.js).
 *   use   throw (faerie dust: Dexterity + Athletics, 6), worn, tool, shoot (Dexterity + Archery, 6), play
 *         (Charisma + Performance, 8), weapon (a hit with it does more), passive (works while carried), unleash
 *   oath  the bargain an oathcrafted Treasure keeps: {every: seconds, what}; let it lapse and the bound essence is free
 */
import { H, T, C, K, P, HL, outcomesOf } from "./mage-da-effects.js";
import * as CA from "./c20-arts.js";
import * as DC from "./fae-da-cantrips.js";
import {DAY} from "../../wodx-chronicle/scripts/terms.mjs";

const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const X = (name, level, book, page, kind, use, fx, spec, extra = {}) => ({ name, level, book, page, kind, use, fx, spec, ...extra });

export const TREASURES = {
    /* -- Dark Ages: faerie dust (p. 187): one dose each; Willpower at 5 + its level resists, except the Pillar of Fire */
    "dust-sleep": X("Faerie dust of Sleep", 1, "da", 187, "dust", "throw", "The one it touches sleeps deeply for an hour a dose.", C("hold", "incapacitated", "Asleep (faerie dust)", { seconds: 3600 }, "one"), { resistDiff: 6 }),
    "dust-lust": X("Faerie dust of Lust", 1, "da", 187, "dust", "throw", "A sudden burning want for the next fitting person the target sees.", T("sway", "Faerie lust", "scene", "one"), { resistDiff: 6, romance: true }),
    "dust-bliss": X("Faerie dust of Bliss", 1, "da", 187, "dust", "throw", "Happy for the scene: dealing with the target is a step easier.", T("sway", "Blissful", "scene", "one"), { resistDiff: 6 }),
    "dust-confusion": X("Faerie dust of Confusion", 2, "da", 187, "dust", "throw", "The target cannot think straight: Mental rolls are two dice down for the scene.", T("boost", "Confused (faerie dust)", "scene", "one", { sap: true, on: "mental", dice: 2 }), { resistDiff: 7 }),
    "dust-forgetfulness": X("Faerie dust of Forgetfulness", 2, "da", 187, "dust", "throw", "The last hour is gone from the target's memory, as if nothing happened in it.", T("bind", "The last hour forgotten", "scene", "one"), { resistDiff: 7 }),
    "dust-rage": X("Faerie dust of Rage", 3, "da", 187, "dust", "throw", "A blind fury for the scene: the target attacks anyone in sight, friend or foe.", C("sway", "frenzy", "Faerie rage", "scene", "one"), { resistDiff: 8 }),
    "dust-size": X("Faerie dust of Size", 4, "da", 187, "dust", "throw", "The target shrinks to a sixteenth or grows to four times its size for the scene (half or double from a weaker dust).", T("shape", "Size changed", "scene", "one"), { resistDiff: 9 }),
    "dust-pillar": X("Faerie dust of the Pillar of Fire", 5, "da", 187, "dust", "throw", "A column of flame: six aggravated levels. Willpower cannot stop it; only keeping clear of the dust does.", H("harm", 6, "aggravated", { fixed: true }), { resistDiff: null }),
    /* -- Dark Ages: invested treasures (pp. 187-189) */
    "cabinet-stick": X("Cabinet Stick", 1, "da", 187, "invested", "tool", "Tapped on a door, chest or loose bark, it opens once onto a cupboard in a faerie realm; some fae hide inside until danger passes.", T("veil", "Hidden in a faerie cabinet", "scene", "self")),
    "cap-of-neglect": X("Cap of Neglect", 1, "da", 188, "invested", "worn", "Those not looking for the wearer pay no heed while they keep quiet and still; a searching eye is not fooled.", T("veil", "Cap of Neglect", "scene", "self")),
    "rings-of-linked-sight": X("Rings of Linked Sight", 1, "da", 188, "invested", "tool", "One of a pair: held to the right eye it shows the other ring's keeper; to the left, what that keeper sees.", K("sense", "self")),
    "sealing-needle": X("Sealing Needle", 1, "da", 188, "invested", "tool", "Threaded, it sews any tear shut by itself: cloth, sacks, or an open wound (a lethal level).", HL(1, { who: "one" })),
    "arrow-midnight-sun": X("Arrow of the Midnight Sun", 2, "da", 188, "invested", "shoot", "Shot into the night it bursts into noon light over the field, a turn a success; it drives back things of darkness.", K("light", "self"), { uses: 1 }),
    "arrow-inky-noon": X("Arrow of Inky Noon", 2, "da", 188, "invested", "shoot", "Shot into the day it turns the sky black as a moonless night.", K("light", "self", { dark: true }), { uses: 1 }),
    "vulcans-hammer": X("Vulcan's Hammer", 2, "da", 188, "invested", "tool", "A smith's hammer: a weapon forged with it never needs sharpening and does a level more harm; armour forged with it soaks a die more.", null, { does: "forge" }),
    "pegasus-bridle": X("Pegasus Bridle", 3, "da", 188, "invested", "tool", "Put on a beast, it flies until the bridle comes off, no faster than it runs; handling it in the air is three harder until it is trained.", T("rise", "Flying on a Pegasus Bridle", "scene", "one", { feet: 60 }), { does: "bridle" }),
    "rooting-amulet": X("Rooting Amulet", 3, "da", 189, "invested", "tool", "Touching the skin of one standing on soft ground, it roots them like a tree; knowing the cause, Willpower (6) buys one turn to pull it off.", C("hold", "immobilized", "Rooted to the ground", "scene", "one"), { resistDiff: 6 }),
    "twin-glass": X("Twin Glass", 3, "da", 189, "invested", "tool", "One mirror split in two: whatever is said or shown at one comes through the other, however far.", K("speak", "self")),
    "gale-flute": X("Gale Flute", 4, "da", 189, "invested", "play", "A soft note calls a breeze, longer playing a gale, then a tempest that can flatten villages. Charisma + Performance (8) steers it: a direction, a target (+2 to their physical actions), still air, tornadoes for 10 or 12 lethal dice.", K("weather", "self", { weather: "wind" }), { does: "gale" }),
    "excalibur-scabbard": X("Excalibur's Scabbard", 5, "da", 189, "invested", "passive", "While the keeper has it, blades and points draw no blood: their lethal and aggravated harm is ignored, and bashing harm never takes the keeper past Injured.", null, { does: "scabbard" }),
    /* -- Dark Ages: oathcrafted treasures (pp. 189-191): an essence bound by an oath, kept or lost */
    "shatterhammer": X("Shatterhammer", 3, "da", 189, "oathcraft", "weapon", "A blunt weapon holding an earth sprite: a blow that wounds adds two aggravated levels from inside the body.", null, { does: "shatter", oath: { every: 30 * DAY, what: "buried in the earth one week in each month" }, itemType: "Melee Weapon" }),
    "sword-of-drowning": X("Sword of Drowning", 4, "da", 190, "oathcraft", "weapon", "A blade holding a water spirit: a wounding blow fills the lungs with sea water; the target loses the turn and must make Willpower (6) or lose the next too; three failures in a row, or a botch, and they drown.", null, { does: "drown", oath: { every: DAY, what: "plunged into sea water every night" }, itemType: "Melee Weapon" }),
    "cauldron-of-nightmares": X("Cauldron of Nightmares", 4, "da", 190, "oathcraft", "tool", "With a piece of the target in the brew, their worst fears walk in the world for an hour that night.", T("fear", "Their nightmares walk", { seconds: 3600 }, "one"), { oath: { every: DAY, what: "cleansed with human blood after every use" }, afterUse: true }),
    "castors-star": X("Castor's Star", 5, "da", 191, "oathcraft", "unleash", "A fae with Dawn 3 or more Unleashes it: lightning leaps to all metal within 500 feet, three lethal dice a turn to anyone carrying it.", H("harm", 3, "lethal", { who: "all", fixed: true, ask: true }), { needDawn: 3, oath: { every: 0, what: "kept under the open sky, never roofed, covered or taken underground" } }),
    /* -- Changeling 20th: the named Treasures (pp. 325-326) and the Treasures of Banality (p. 368) */
    "c20-excalibur-scabbard": X("Excalibur's Scabbard", 3, "c20", 325, "c20", "passive", "Spring 3, Well of Life: while the keeper has it, lethal and aggravated harm is ignored and the keeper never falls past Injured; fire, cold, drowning and bashing harm still land.", null, { does: "scabbard", art: "spring", artLevel: 3 }),
    "c20-vulcans-hammer": X("Vulcan's Hammer", 5, "c20", 325, "c20", "tool", "Contract 5 bound into a smith's hammer: the forged weapon is sworn to its owner for good, and does a level more harm a success on the activation roll; forged armour soaks a die more a success.", null, { does: "forge", art: "contract", artLevel: 5, perSuccess: true }),
    "c20-lightning-gun": X("Lightning gun", 5, "c20", 326, "c20", "shoot", "Skycraft 5, Lord of Levin, in an old duelling pistol: five charges for each Glamour put in past the first, ten at most, one shot a turn (difficulty 6, damage 5).", null, { does: "lightning", art: "skycraft", artLevel: 5, cantrip: "lord-of-levin", charges: true }),
    "c20-friars-cross": X("The Friar's Cross", 5, "c20", 368, "banality", "passive", "A Banality Treasure: near an Unleashing in the hands of one of the Undone it bursts, the Undone's Banality in lethal harm to every dreaming being within 50 yards, and all faerie magic stops for the scene.", null, { does: "friarscross" }),
    "c20-gray-sword": X("The Gray Sword", 5, "c20", 368, "banality", "weapon", "A plain chimerical broadsword (Strength + 3 lethal): each hit gives the victim a point of Banality that fades a day at a time.", null, { does: "graysword", itemType: "Melee Weapon" })
};
export const KEYS = Object.keys(TREASURES);
export const DA_KEYS = KEYS.filter(k => TREASURES[k].book === "da");
export const C20_KEYS = KEYS.filter(k => TREASURES[k].book === "c20");

/** The book the Treasure comes from, for the card. */
export const pageOf = t => `${t.book === "c20" ? "Changeling 20th" : "Dark Ages: Fae"} p. ${t.page}`;

/** What a book Treasure's use puts on the effects card with its successes. */
export function treasureResults(key, successes, { source = "" } = {}) {
    const t = TREASURES[key];
    const s = Math.max(0, n(successes));
    if (!t?.spec || s < 1) return [];
    return outcomesOf(t.spec, { label: t.name, source: source || pageOf(t) }, s, t.fx);
}

/** The roll a use needs: {pool: [attribute, ability] | null, diff, auto}. A tool or worn Treasure works without one. */
export function useRoll(t) {
    if (!t) return { pool: null, diff: 6, auto: 1 };
    if (t.use === "throw") return { pool: ["dexterity", "athletics"], diff: 6 };
    if (t.use === "shoot") return { pool: ["dexterity", t.book === "c20" ? "firearms" : "archery"], diff: 6 };
    if (t.use === "play") return { pool: ["charisma", "performance"], diff: 8 };
    if (t.book === "c20" && t.perSuccess) return { pool: ["intelligence", "gremayre"], diff: 6 };
    return { pool: null, diff: 6, auto: Math.max(1, n(t.level)) };
}

/** Faerie dust: the target's Willpower roll against it, at 5 + the level; the Pillar of Fire allows none. */
export const dustResist = t => (t?.kind === "dust" && t.resistDiff !== null ? Math.min(10, 5 + n(t.level)) : null);

/** The Gale Flute's table (p. 189): what each success count does. */
export function galeOf(successes) {
    const s = n(successes);
    if (s >= 5) return { weather: "storm", harm: { dice: 12, type: "lethal", who: "one" }, text: "tornadoes at chosen targets: 12 lethal dice, Dexterity + Dodge to cut it" };
    if (s >= 4) return { weather: "storm", harm: { dice: 10, type: "lethal", who: "all" }, text: "small tornadoes over the area: 10 lethal dice, Dexterity + Athletics to cut it" };
    if (s >= 3) return { weather: "wind", text: "pockets of still air around people or small places" };
    if (s >= 2) return { weather: "wind", shift: 2, text: "the wind on chosen people or things: their physical actions two harder" };
    if (s >= 1) return { weather: "wind", text: "the wind blows the way the player wants" };
    return { weather: "wind", text: "a gale with no one steering it" };
}

/** Excalibur's Scabbard: the damage the keeper keeps after a blow. before/after: {bashing, lethal, aggravated}; max levels. */
export function scabbardKeeps(book, { type = "lethal", blade = true, of = "" } = {}, before = {}, after = {}, max = 7) {
    const injured = 3; // Bruised, Hurt, Injured: the lowest level the keeper falls to
    const out = { ...after };
    const hurt = (b, l, a) => n(b) + n(l) + n(a);
    const elemental = ["fire", "cold", "drowning"].includes(of);
    if (book === "da") {
        if ((type === "lethal" || type === "aggravated") && blade) return { ...before, kept: "ignored" };
        if (type === "bashing" && hurt(out.bashing, out.lethal, out.aggravated) > Math.max(injured, hurt(before.bashing, before.lethal, before.aggravated)))
            return { ...out, bashing: Math.max(n(before.bashing), injured - n(out.lethal) - n(out.aggravated)), kept: "capped" };
        return { ...out, kept: "landed" };
    }
    // Changeling 20th: lethal and aggravated ignored unless it is fire, cold or drowning; never past Injured from what lands
    if ((type === "lethal" || type === "aggravated") && !elemental) return { ...before, kept: "ignored" };
    if (hurt(out.bashing, out.lethal, out.aggravated) > Math.max(injured, hurt(before.bashing, before.lethal, before.aggravated)) && !elemental)
        return { ...out, bashing: Math.max(0, injured - n(out.lethal) - n(out.aggravated)), kept: "capped" };
    return { ...out, kept: "landed" };
}
/** A blade or a point: what the scabbard turns (by the weapon's name; brawl, bites, fire and falls are not). */
export const isBlade = weapon => /sword|blade|knife|dagger|axe|spear|lance|pike|arrow|bolt|rapier|sabre|saber|scimitar|claw|halberd|glaive|bayonet|dirk|stiletto|katana|machete|scythe|sickle|bow|crossbow/i.test(String(weapon ?? ""));

/** The Sword of Drowning's next turn (p. 190): another Willpower roll, and three failures in a row drown the target. */
export function drowningStep(fails, r) {
    if (r?.botch) return { fails: 3, drowned: true, lostTurn: true };
    const f = n(r?.successes) > 0 ? 0 : n(fails) + 1;
    return { fails: f, drowned: f >= 3, lostTurn: f > 0 };
}

/** The Lightning gun's charges: five a Glamour past the first, ten at most. */
export const lightningCharges = (glamour, have = 0) => Math.min(10, n(have) + 5 * Math.max(0, n(glamour) - 1));

/** An oathcrafted Treasure's bargain: is it lapsed now? kept: worldTime the oath was last kept. */
export function oathLapsed(t, kept, now) {
    if (!t?.oath || !t.oath.every) return false;
    if (kept === null || kept === undefined) return false;
    return n(now) - n(kept) > n(t.oath.every);
}

/* -- Treasures a fae makes ------------------------------------------------------------------------------------- */

/** The modes of the making cantrips (pp. 126-129, 136): how many uses, and when the held magic fades. */
export const IMBUE = {
    charm: { label: "Charm", uses: 1, fades: "juncture", sameDominion: true, page: 126 },
    persisting: { label: "Persisting Charm", uses: 1, fades: null, sameDominion: true, page: 128 },
    true: { label: "True Enchantment", uses: null, fades: null, sameDominion: true, page: 129 },
    writ: { label: "Dominion Writ", uses: 1, fades: "noon", sameDominion: false, otherDiff: 1, page: 136 }
};

/** Seconds from now to the Dominion's next hour (noon, midnight, sunrise, sunset) on a clock {hour, sunrise, sunset}. */
export function toJuncture(dominion, clock = {}) {
    const at = { day: 12, night: 0, dawn: n(clock.sunrise) || 6, dusk: n(clock.sunset) || 18 }[dominion] ?? 12;
    const h = n(clock.hour);
    let d = (at - h + 24) % 24;
    if (d <= 0.01) d = 24;
    return Math.round(d * 3600);
}

/** The item a making cantrip leaves: its flag and its description. */
export function imbuedItem({ mode = "charm", cantrip, successes = 1, object = "", by = "", dominion = null, clock = {}, now = 0 } = {}) {
    const m = IMBUE[mode] ?? IMBUE.charm;
    const c = DC.CANTRIPS[cantrip];
    if (!c) return null;
    const fades = m.fades === "juncture" ? n(now) + toJuncture(dominion ?? c.dominion, clock) : m.fades === "noon" ? n(now) + toJuncture("day", clock) : null;
    const name = `${String(object || "A charmed object").slice(0, 60)} (${c.name})`;
    return { name, type: "Item", img: "icons/svg/item-bag.svg",
        system: { description: `<p>${m.label}: holds ${c.name} (${c.fx}) at ${n(successes)} success${n(successes) === 1 ? "" : "es"}. ${m.uses ? "One use." : "Used again and again."}${fades ? " It fades at the Dominion's next hour if unused." : ""} Made by ${by}. Dark Ages: Fae p. ${m.page}.</p>`, ismagical: true },
        flags: { "wodx-actions": { treasure: { key: "imbued", mode, cantrip, successes: Math.max(1, n(successes)), uses: m.uses, expires: fades, by } } } };
}

/** What an imbued Treasure does when used: the held cantrip's results at the successes it was cast with. */
export function imbuedResults(flag = {}) {
    return DC.presetResults(flag.cantrip, flag.successes);
}

/** A Changeling 20th Treasure holding an Art's cantrip (p. 324): the item for a cantrip id and its stored Glamour. */
export function c20Item({ cantrip, glamour = 0, object = "" } = {}) {
    const c = CA.CANTRIPS[cantrip];
    if (!c) return null;
    const name = `${String(object || "A Treasure").slice(0, 60)} (${c.art[0].toUpperCase()}${c.art.slice(1)} ${c.level})`;
    return { name, type: "Item", img: "icons/svg/item-bag.svg",
        system: { description: `<p>A Treasure of ${c.level} dot${c.level === 1 ? "" : "s"}: it holds the cantrip ${c.art} ${c.level} (${c.fx}). Each use costs a Glamour point, from the Treasure's own store first. Changeling 20th pp. 172, 324-325.</p>`, ismagical: true },
        flags: { "wodx-actions": { treasure: { key: "c20art", cantrip, level: c.level, glamour: Math.min(10, Math.max(0, n(glamour))) } } } };
}

/** A book Treasure's item. */
export function bookItem(key, { glamour = 0 } = {}) {
    const t = TREASURES[key];
    if (!t) return null;
    const type = t.itemType ?? "Item";
    const system = { description: `<p>${t.fx} (${pageOf(t)}.)${t.oath ? ` Its oath: ${t.oath.what}.` : ""}</p>`, ismagical: true };
    if (type === "Melee Weapon") Object.assign(system, { damage: { attribute: "strength", bonus: key === "c20-gray-sword" ? 3 : 2, type: key === "shatterhammer" ? "bashing" : "lethal", isrollable: true },
        attack: { attribute: "dexterity", ability: "melee", accuracy: 0, isrollable: true }, difficulty: 6, isweapon: true });
    return { name: t.name, type, img: type === "Melee Weapon" ? "icons/svg/sword.svg" : "icons/svg/item-bag.svg", system,
        flags: { "wodx-actions": { treasure: { key, ...(t.oath?.every ? { kept: null } : {}), ...(t.uses ? { uses: t.uses } : {}), ...(t.charges ? { charges: 0 } : {}), ...(t.book === "c20" ? { glamour: Math.min(10, Math.max(0, n(glamour))) } : {}) } } } };
}

/** The Glamour a Changeling 20th Treasure's use costs: from its own store first, then the user (p. 325). */
export function glamourDraw(stored, own, cost = 1) {
    const fromItem = Math.min(n(stored), n(cost));
    const fromUser = n(cost) - fromItem;
    return { ok: fromUser <= n(own), fromItem, fromUser };
}

/** What one carried Treasure means for the Mists of Banality (p. 172): its keeper cannot forget themselves. */
export const keepsSelf = flags => !!flags?.treasure && flags.treasure.key !== "c20-friars-cross" && flags.treasure.key !== "c20-gray-sword";

/** Every kind of result a Treasure's spec gives (for the powers inventory). */
export const specOf = key => TREASURES[key]?.spec ?? null;

/** The C20 cantrips a Treasure can hold, by Art and level, for the Storyteller's window. */
export const c20Choices = () => Object.entries(CA.CANTRIPS).map(([id, c]) => ({ id, art: c.art, level: c.level, name: c.name }));
