/**
 * WoDX Actions: the ghosts of V20 Dark Ages p. 403 (B7676), pure, no Foundry. ghost-da.js is the Foundry side.
 *   A ghost is a Wraith sheet flagged wodx-actions.daGhost. Its Passion (the sheet's Pathos) stands for blood points
 *   for its powers, which are Disciplines and work across the Shroud without manifesting. A point of Passion lets it
 *   touch the physical world for one turn. Deathsight shows the hand of death on things and people; Lifesight reads
 *   souls as Auspex does.
 */
export const GHOST_DA = { page: "V20 Dark Ages p. 403", manifestCost: 1, manifestTurns: 1 };
/** Deathsight: the book names a roll but no pool; WoDX rolls Perception + Awareness at 6 (house reading). */
export const DEATHSIGHT = { attr: "perception", ability: "awareness", diff: 6 };
/** Lifesight reads souls as Auspex does: the aura reading of Auspex 2, Perception + Empathy at 8 (V20 Dark Ages p. 152). */
export const LIFESIGHT = { attr: "perception", ability: "empathy", diff: 8 };

export const isDAGhost = actor => !!actor?.flags?.["wodx-actions"]?.daGhost;

/** What Deathsight shows, by successes. */
export function deathsightOf(successes) {
    const s = Math.max(0, Number(successes) || 0);
    if (s <= 0) return "Only the chill of the grave; nothing clear.";
    if (s === 1) return "Which of them death has touched, and roughly how soon.";
    if (s <= 3) return "The mark of the coming death on each of them: sickness, blade, fall or fire, and the season.";
    return "The death itself in detail: how, where and near enough the night, and the cracks that will bring down a wall.";
}

/** The book's sample ghost. Strength 0, 3 when it manifests. */
export const MASKED_TRICKSTER = {
    key: "masked-trickster", name: "Masked Trickster", p: 403,
    attributes: { strength: 0, dexterity: 3, stamina: 4, charisma: 3, manipulation: 4, appearance: 1, perception: 2, intelligence: 3, wits: 4 },
    manifest: { strength: 3 },
    abilities: { alertness: 3, athletics: 3, brawl: 4, empathy: 3, intimidation: 3, investigation: 2, leadership: 2, medicine: 1, melee: 2, occult: 3, subterfuge: 3, stealth: 2, survival: 2 },
    secondary: { "Hearth Wisdom": 2 },
    disciplines: { Chimerstry: 4, Dementation: 4, Obtenebration: 3, Thaumaturgy: 3 },
    /** The book names them Creatio Ignis and Potestas Motus: V20's Lure of Flames and Movement of the Mind. */
    paths: { "Lure of Flames": 3, "Movement of the Mind": 3 },
    humanity: 4, willpower: 8, passion: 10,
    about: "An old ghost who guards a remote village and its old ways, scaring off churchmen and soldiers alike, and asks a little worship in return. A gaunt grey figure, bare but for a garlanded aurochs skull worn as a mask.",
};

/** Sheet data for the sample ghost: a Wraith sheet flagged as a Dark Ages ghost. */
export function ghostActorData(g = MASKED_TRICKSTER) {
    const sys = { "advantages.pathos.temporary": g.passion, "advantages.pathos.max": 10, "advantages.willpower.permanent": g.willpower, "advantages.willpower.temporary": g.willpower,
        "advantages.path.permanent": g.humanity, "advantages.path.value": g.humanity };
    for (const [k, v] of Object.entries(g.attributes)) sys[`attributes.${k}.value`] = v;
    for (const [k, v] of Object.entries(g.abilities)) { sys[`abilities.${k}.value`] = v; sys[`abilities.${k}.isvisible`] = true; }
    const items = [
        ...Object.entries(g.disciplines).map(([name, value]) => ({ name, type: "Power", system: { type: "wod.types.discipline", value } })),
        ...Object.entries(g.paths).map(([name, value]) => ({ name, type: "Power", system: { type: "wod.types.disciplinepath", value } })),
        ...Object.entries(g.secondary).map(([name, value]) => ({ name, type: "Trait", system: { type: "wod.types.knowledgesecondability", value, max: 5 } })),
    ];
    return { name: g.name, type: "Wraith", system: sys, items,
        flags: { "wodx-actions": { daGhost: { key: g.key, manifest: g.manifest } } } };
}
