/**
 * WoDX Actions (B3553): soulforging, the rules part (no Foundry). Wraith 20th pp. 42-45 for what the forges are and
 * make; the dice, the time and the costs are WoDX's own (the setting chapter gives no system), logged in
 * docs/PENDING-REVIEW.md.
 *
 * A wraith heats Corpus over soulfire crystals and hammers it into shape. One soul makes one item; only Artificers know
 * how to pledge part of their own plasm, and that part never grows back. An obolus can be forged again, at a loss of
 * half the soul's mass (a quarter for an Artificer). The work is a WoDX Storyteller long task (kind "soulforge").
 *
 * Eras: Stygia's forges and its law until 1999; after its fall the forges answer to whoever holds them (the new order).
 */

export const REF = "Wraith 20th pp. 42-45";
export const FALL = 1999;
const n = v => { const x = Math.round(Number(v)); return Number.isFinite(x) ? x : 0; };

/** Who holds the forges in a year. */
export function forgesIn(year) {
    const y = Number(year);
    if (Number.isFinite(y) && y >= FALL) return { key: "after", label: "after Stygia's fall: the forges answer to whoever holds them now",
        outsider: 0, soulfire: 1, text: "No Hierarchy licence is needed, but soulfire is scarce: each crystal costs a Pathos more." };
    return { key: "stygia", label: "Stygia: the Artificers hold the forges under the Hierarchy's eye",
        outsider: 1, soulfire: 0, text: "Forging outside the Guild is illicit: +1 difficulty, and the Storyteller hears of it." };
}

/**
 * What can be made. weapon: the V20 Melee Weapons Chart (pdf p. 288), soulsteel's edge never dulls; armor: the V20
 * Armor Chart class, soulsteel a class sturdier than its weight suggests (a house rule). goal: successes needed.
 */
export const PRODUCTS = {
    obolus: { label: "An obolus (a coin of the dead)", kind: "coin", goal: 5, oboli: 1 },
    knife: { label: "A soulsteel knife", kind: "weapon", goal: 4, damage: 1, type: "lethal", conceal: "J" },
    sword: { label: "A soulsteel sword", kind: "weapon", goal: 6, damage: 2, type: "lethal", conceal: "T" },
    axe: { label: "A soulsteel axe", kind: "weapon", goal: 6, damage: 3, type: "lethal", conceal: "N" },
    club: { label: "A soulsteel mace", kind: "weapon", goal: 5, damage: 2, type: "bashing", conceal: "T" },
    mail: { label: "Soulsteel mail (armor class 3, penalty 1)", kind: "armor", goal: 8, rating: 3, penalty: 1 },
    plate: { label: "Soulsteel plate (armor class 4, penalty 2)", kind: "armor", goal: 10, rating: 4, penalty: 2 },
    artifact: { label: "An Artifact (a ring, a lock, a tool, a girder)", kind: "artifact", goal: 5 },
    relic: { label: "A relic reworked into an Artifact", kind: "artifact", goal: 4, fromRelic: true }
};
export const PRODUCT_KEYS = Object.keys(PRODUCTS);

/** Where the Corpus comes from. */
export const SOURCES = {
    soul: { label: "A soul from the Thrall markets, a Drone or a captive (the Storyteller's)", loss: 0 },
    self: { label: "Part of the forger's own plasm (Artificers only; it never grows back)", loss: 0, artificer: true },
    obolus: { label: "An obolus forged again (half the mass is lost; a quarter for an Artificer)", loss: 0.5 },
    relic: { label: "A relic the forger holds (for a reworked relic)", loss: 0 }
};

/** Pathos for the soulfire crystals at the start: half the goal, rounded up, and one more after Stygia's fall. */
export const soulfireCost = (goal, year) => Math.ceil(Math.max(1, n(goal)) / 2) + forgesIn(year).soulfire;

/** The plan: pool, difficulty, goal, Pathos and what it costs, or {ok: false, why}. */
export function plan({ product = "sword", source = "soul", artificer = false, year = null, crafts = 0, dexterity = 0 } = {}) {
    const p = PRODUCTS[product], s = SOURCES[source];
    if (!p) return { ok: false, why: "nothing of that kind comes from the forges" };
    if (!s) return { ok: false, why: "the forge needs Corpus to work" };
    if (s.artificer && !artificer) return { ok: false, why: "only an Artificer knows how to pledge part of their own plasm" };
    if (!!p.fromRelic !== (source === "relic")) return { ok: false, why: p.fromRelic ? "a reworked relic needs the relic" : "a relic can only be reworked, not forged into this" };
    if (source === "obolus" && product === "obolus") return { ok: false, why: "an obolus forged again cannot make a whole obolus" };
    const f = forgesIn(year);
    let goal = p.goal;
    if (source === "obolus") goal += artificer ? 1 : 2; // the lost mass makes the work harder (house)
    const diff = Math.min(10, (artificer ? 6 : 7) + (artificer ? 0 : f.outsider));
    return { ok: true, product, source, goal, diff, pathos: soulfireCost(goal, year), forges: f, dice: n(dexterity) + n(crafts),
        selfCost: source === "self" ? 1 : 0, lostShare: source === "obolus" ? (artificer ? 0.25 : 0.5) : 0, illicit: !artificer && f.key === "stygia" };
}

/** A botch ruins the work and the Corpus with it (a delicate long task). */
export const DELICATE = true;

/** The item a finished product becomes (worldofdarkness item data). */
export function itemData(product, { maker = "", year = null } = {}) {
    const p = PRODUCTS[product];
    if (!p) return null;
    const desc = `<p>Soulforged${maker ? ` by ${maker}` : ""}. It moans softly to itself now and then, often at the worst moment (${REF}).</p>`;
    const flags = { "wodx-actions": { soulforged: { product, maker, year } } };
    if (p.kind === "weapon") return { name: p.label.replace(/^A /, "").replace(/^soulsteel/, "Soulsteel"), type: "Melee Weapon", img: "icons/svg/sword.svg", flags,
        system: { description: desc + "<p>Soulsteel holds its edge and does not break.</p>", difficulty: 6, isequipped: false, conceal: p.conceal,
            damage: { attribute: "strength", bonus: p.damage, type: p.type, isrollable: true }, attack: { attribute: "dexterity", ability: "melee", accuracy: 0, isrollable: true } } };
    if (p.kind === "armor") return { name: p.label.replace(/ \(.*$/, ""), type: "Armor", img: "icons/svg/shield.svg", flags,
        system: { description: desc, isequipped: false, soak: { bashing: p.rating, lethal: p.rating, aggravated: p.rating }, dexpenalty: p.penalty } };
    if (p.kind === "coin") return null; // oboli go to the purse
    return { name: p.fromRelic ? "A reworked relic (an Artifact)" : "A soulforged Artifact", type: "Item", img: "icons/svg/item-bag.svg", flags, system: { description: desc } };
}

/** The long task for WoDX Storyteller (tasks-rules normTask reads these fields). */
export function taskOf(pl, { name = "" } = {}) {
    const p = PRODUCTS[pl.product];
    return { kind: "soulforge", name: name || `Soulforge: ${p.label.replace(/^(A|An) /, "").toLowerCase()}`, attr: "dexterity", ability: "crafts",
        diff: pl.diff, goal: pl.goal, interval: "week", delicate: DELICATE, workshop: "soulforge",
        note: `${SOURCES[pl.source].label}. ${pl.forges.text}` };
}

/** Oboli made: the money system counts in slivers, 32 to the obolus. */
export const SLIVERS = 32;
export const oboliOf = product => n(PRODUCTS[product]?.oboli);
