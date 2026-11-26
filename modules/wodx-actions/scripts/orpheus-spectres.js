/**
 * WoDX Actions (B7833): the Spectral arsenal of Orpheus (pp. 267-270), what a Spectre turns on a crucible. Short
 * summaries in our own words with the page. Pure: no Foundry calls.
 *
 *   Spite         a Spectre's Spite is its gauze and its health. It taps its rating to fuel Horrors and never spends
 *                 it, but in a scene it taps no more than its rating, unless it spends Willpower: each point buys three
 *                 more (p. 267).
 *   Thorns        innate, no Spite: Carapace (soak by kind), Claws, Envelop, Maw, Tentacles. The ones a roll reads go
 *                 on the sheet: armour, or a natural weapon.
 *   Horrors       fuelled by Spite tapped: Chill, Flicker, Flit, Hive-Mind, Immolate, Manifest, Rend, Virus. Each:
 *                 label, page, how long it runs, a line for each amount of Spite, and the effects-card items.
 * House readings (B7833): Chill's area is the Spectre's permanent Willpower in yards and its harm is soaked as usual;
 * Flicker's added difficulty to hit it, Flit, Hive-Mind, Manifest, Rend and Virus stay on the card, since no roll
 * knows who aims at whom across the Shroud; Immolate's Stealth difficulty is the Spectre's own; barbed Tentacles are a
 * Storyteller's call from the card.
 */
const n = v => Number(v) || 0;

export const REF = "Orpheus";
export const WP_SPITE = 3;

const scene = { kind: "scene" };

export const CARAPACE = {
    hide: { label: "Hide", soak: 1 },
    scales: { label: "Scales", soak: 3 },
    chitin: { label: "Chitin", soak: 5 }
};

export const THORNS = {
    carapace: { label: "Carapace", page: "p. 267", text: "natural armour, from insect chitin to burnished steel skin: extra soak against bashing and lethal by its kind (Hide 1, Scales 3, Chitin 5)" },
    claws: { label: "Claws", page: "p. 267", text: "talons that rend gauze: Strength + 1 lethal, longer claws more",
        weapon: { name: "Claws (Thorn)", bonus: 1, type: "lethal" } },
    envelop: { label: "Envelop", page: "p. 267", text: "after a successful grapple, the next turn its body wraps the target, who stays held until the Spectre is destroyed or lets go" },
    maw: { label: "Maw", page: "p. 267", text: "a gaping mouth of teeth: each bite Strength + 2 lethal in close combat",
        weapon: { name: "Maw (Thorn)", bonus: 2, type: "lethal" } },
    tentacles: { label: "Tentacles", page: "p. 267", text: "an extra hold attack each turn besides its others; barbed ones deal its Strength in lethal each turn a foe stays held" }
};

export const HORRORS = {
    chill: { label: "Chill", page: "p. 268", lasts: "at once", max: 10,
        line: k => `a psychic cold over as many yards as its permanent Willpower: ${k} bashing level${k === 1 ? "" : "s"} to everyone there, living or dead` },
    flicker: { label: "Flicker", page: "p. 268", lasts: "the scene", max: 10,
        line: k => `skips on and off the Shroud: +${k} difficulty to hit it in combat for the scene; its own attacks unchanged` },
    flit: { label: "Flit", page: "p. 268", lasts: "the scene", max: 5,
        levels: ["any direction is down: walks up walls and across ceilings", "leaps up to Strength x 3 yards", "glides safely from any height, gaining none",
            "floats still in the air at any height", "true flight at up to its Willpower in yards a turn"],
        note: "every level at or below the one tapped is open for the scene" },
    hivemind: { label: "Hive-Mind", page: "p. 268", lasts: "as used", max: 4, min: 0,
        levels: ["a distress call to every Spectre near, or mind-to-mind talk with them (free)", "", "sifts the hive-mind for one thing it does not know",
            "borrows a Horror it does not know for turns equal to its Willpower (that Horror's Spite as usual)", "speaks with the source of the hive-mind itself and calls reinforcements from elsewhere"] },
    immolate: { label: "Immolate", page: "pp. 268-269", lasts: "the scene", max: 10,
        line: k => `a burning form, fire only and never at range: ${k + 1} lethal level${k ? "s" : ""} to whatever touches it; its Stealth +2 difficulty` },
    manifest: { label: "Manifest", page: "p. 269", lasts: "the scene", max: 4, min: 2,
        levels: ["", "", "an indistinct shape at the edge of the living's sight", "a terrifying apparition with no substance and a few short words", "deals with the living as if it were alive"] },
    rend: { label: "Rend", page: "p. 269", lasts: "the scene", max: 5,
        levels: ["peers through the Shroud at the living lands beyond", "hears them too", "its voice or the hive-mind's speech crosses the Shroud",
            "reaches across and takes things, though fighting so is impractical", "pierces the Stormwall, to enter or leave the shadowy land beyond"] },
    virus: { label: "Virus", page: "p. 269", lasts: "the scene", max: 5,
        levels: ["sees through the eyes of any ghost of Vitality 3 or less", "hears through them too", "takes over a Vitality 1 ghost, destroying it",
            "takes over a Vitality 2 ghost, destroying it", "takes over a Vitality 3 ghost, destroying it"],
        note: "no effect on projectors" }
};

/** What `k` Spite tapped does with this Horror, one line. */
export function horrorLine(key, k) {
    const h = HORRORS[key];
    if (!h) return "";
    if (h.line) return h.line(Math.max(1, n(k)));
    const top = Math.max(h.min ?? 1, Math.min(h.max, n(k)));
    if (key === "flit" || key === "rend" || key === "virus") return h.levels.slice(0, top).join("; ");
    return h.levels[top] || h.levels.slice(0, top + 1).filter(Boolean).at(-1) || "";
}

/** The Spite this Horror lets a Spectre tap: the smallest and largest that do anything. */
export const tapRange = key => ({ min: HORRORS[key]?.min ?? 1, max: HORRORS[key]?.max ?? 5 });

/**
 * Can a Spectre with this Spite rating, having tapped `tapped` this scene, tap `want` more? It may go past its rating
 * only by spending Willpower, three Spite a point (p. 267). Returns {ok, willpower: the points to spend, why}.
 */
export function tapPlan(rating, tapped, want, willpower = 0) {
    const left = n(rating) - n(tapped), over = n(want) - left;
    if (n(want) < 0) return { ok: false, willpower: 0, why: "no Spite to tap" };
    if (over <= 0) return { ok: true, willpower: 0 };
    const wp = Math.ceil(over / WP_SPITE);
    if (wp > n(willpower)) return { ok: false, willpower: wp, why: `${n(want)} Spite is past its rating this scene (${Math.max(0, left)} left) and wants ${wp} Willpower` };
    return { ok: true, willpower: wp };
}

/** The effects-card items for a Horror at `k` Spite: Chill harms all near, Immolate burns whoever touches it. */
export function horrorResults(key, k, { name = "", source = "" } = {}) {
    const h = HORRORS[key];
    if (!h || n(k) < 1) return [];
    const base = { key, label: name || h.label, source: source || `${REF} ${h.page}` };
    if (key === "chill") return [{ key: "harm", who: "each", ask: true, out: { ...base, kind: "damage", levels: n(k), type: "bashing", soak: true, text: `Chill: ${n(k)} bashing level${n(k) === 1 ? "" : "s"} to each within its Willpower in yards` } }];
    if (key === "immolate") return [
        { key: "light", who: "self", out: { ...base, kind: "timed", name: h.label, timed: scene, duration: "the scene", successes: n(k), touch: { levels: n(k) + 1, type: "lethal" }, text: horrorLine(key, k) } },
        { key: "fortune", who: "self", out: { ...base, kind: "timed", name: h.label, timed: scene, duration: "the scene", shift: 2, once: false, tags: ["stealth"], text: "a burning form: its Stealth +2 difficulty" } }
    ];
    return [];
}

/** Does this Horror change anything a roll or the map reads, or is it the Storyteller's from the card? */
export const applies = key => key === "chill" || key === "immolate";

/** A Thorn as item data for the sheet (Carapace armour of its kind, Claws or Maw a natural weapon), or null. */
export function thornItem(key, { kind = "scales" } = {}) {
    const t = THORNS[key];
    if (!t) return null;
    const flags = { "wodx-library": { implant: true }, "wodx-actions": { thorn: key } };
    const desc = `<p>${t.text}. ${REF} ${t.page}.</p>`;
    if (key === "carapace") {
        const c = CARAPACE[kind] ?? CARAPACE.scales;
        return { name: `Carapace: ${c.label} (Thorn)`, type: "Armor", img: "icons/svg/shield.svg", flags,
            system: { isequipped: true, soak: { bashing: c.soak, lethal: c.soak, aggravated: 0 }, description: desc } };
    }
    if (!t.weapon) return null;
    return { name: t.weapon.name, type: "Melee Weapon", img: "icons/svg/sword.svg", flags,
        system: { difficulty: 6, damage: { attribute: "strength", bonus: t.weapon.bonus, type: t.weapon.type, isrollable: true },
            attack: { attribute: "dexterity", ability: "brawl", accuracy: 0, isrollable: true }, description: desc } };
}

/** The Horror or Thorn a name points to ("Chill", "Hive-Mind", "Claws (Thorn)"), as {kind, key}, or null. */
export function spectralOf(v) {
    const s = String(v ?? "").toLowerCase().replace(/[^a-z]/g, "");
    for ( const [kind, list] of [["horror", HORRORS], ["thorn", THORNS]] ) {
        const k = Object.keys(list).find(x => s === x || s.startsWith(x));
        if (k) return { kind, key: k };
    }
    return null;
}
