/**
 * WoDX Combat: animal swarms of V20 Dark Ages p. 399 (B7677), pure, no Foundry. swarm.js is the Foundry side.
 *   A swarm is one token (a Creature flagged wodx-combat.swarm). Each turn, on its fixed Initiative, it rolls its
 *   damage dice at 6 against everyone inside it (4 against someone it has overrun). They may dodge at 8 and soak as
 *   usual. Three or more levels before soak knock the victim down and overrun them. Someone inside moves at half
 *   speed unless they dodged that turn; someone overrun only a yard or two.
 *   Harm to a swarm: no soak; a normal weapon does at most one level a turn whatever the successes; fire and other
 *   area harm does its full levels. The listed health disperses it; two more levels wipe the animals out.
 */
export const SWARM_DA = { page: "V20 Dark Ages p. 399", diff: 6, overrunDiff: 4, dodgeDiff: 8, overrunAt: 3, eradicateExtra: 2, weaponCap: 1 };

/** The book's chart: damage dice, health and Initiative. small bugs do bashing (the book's small, harmless insects). */
export const SWARMS = {
    smallbugs: { name: "Small bugs", damage: 1, health: 5, init: 2, type: "bashing" },
    largebugs: { name: "Large bugs", damage: 2, health: 7, init: 3, type: "lethal" },
    flyingbugs: { name: "Flying bugs", damage: 2, health: 5, init: 4, type: "lethal" },
    birds: { name: "Birds, bats", damage: 4, health: 9, init: 5, type: "lethal" },
    rats: { name: "Rats", damage: 3, health: 7, init: 3, type: "lethal" },
    largerats: { name: "Large rats", damage: 4, health: 9, init: 3, type: "lethal" },
    cats: { name: "Feral cats", damage: 4, health: 6, init: 6, type: "lethal" },
    dogs: { name: "Wild dogs, wolves", damage: 6, health: 15, init: 4, type: "lethal" },
};

const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
export const swarmFlag = actor => actor?.flags?.["wodx-combat"]?.swarm ?? null;
export const isSwarm = actor => !!swarmFlag(actor)?.kind;
export const specOf = actor => SWARMS[swarmFlag(actor)?.kind] ?? null;

/** The swarm's attack on one victim: its dice and difficulty. */
export function attackOn(spec, { overrun = false } = {}) {
    return { dice: n(spec?.damage), diff: overrun ? SWARM_DA.overrunDiff : SWARM_DA.diff, type: spec?.type ?? "lethal" };
}
/** Levels before soak: a dodge's successes come off first, as for any dodge. Three or more overrun the victim. */
export function hitOn(successes, dodged = 0) {
    const levels = Math.max(0, n(successes) - Math.max(0, n(dodged)));
    return { levels, overrun: levels >= SWARM_DA.overrunAt };
}
/**
 * Harm to the swarm. area: fire or other area harm (full levels). takenThisTurn: the weapon harm it has already taken
 * this turn (a normal weapon does at most one level a turn).
 */
export function harmToSwarm(levels, { area = false, takenThisTurn = 0 } = {}) {
    const l = Math.max(0, Math.floor(n(levels)));
    if (area) return l;
    return Math.max(0, Math.min(l, SWARM_DA.weaponCap - Math.max(0, n(takenThisTurn))));
}
/** Where the swarm stands after harm: whole, dispersed (its health reached) or wiped out (two more). */
export function stateOf(spec, harm) {
    const h = n(spec?.health), d = n(harm);
    if (d >= h + SWARM_DA.eradicateExtra) return "gone";
    if (d >= h) return "dispersed";
    return "whole";
}
/** Movement inside a swarm: half, full after a dodge this turn, a yard or two when overrun. */
export function moveIn({ overrun = false, dodged = false } = {}) {
    return overrun ? "a yard or two" : dodged ? "full" : "half";
}

/** Sheet data for a swarm: a Creature flagged as a swarm of one kind. */
export function swarmActorData(kind) {
    const s = SWARMS[kind];
    if (!s) return null;
    return { name: `Swarm: ${s.name}`, type: "Creature", flags: { "wodx-combat": { swarm: { kind, harm: 0 } } },
        prototypeToken: { width: 2, height: 2, actorLink: false } };
}

/* B7678: the spider of V20 Dark Ages p. 399. It does no harm itself; its bite may carry poison (Poison, p. 360). */
export const SPIDER_DA = { page: "V20 Dark Ages p. 399", notice: { attr: "perception", ability: "alertness", diff: 7 }, poisonPage: "V20 Dark Ages p. 360", poisonDice: -1 };
/** The bite's poison, by strength: none, or 1 to 3 lethal levels with 1 die off every roll for the scene (p. 360). */
export const VENOM = { none: 0, mild: 1, strong: 2, deadly: 3 };
export function spiderBite({ noticed = false, venom = "none" } = {}) {
    if (noticed) return { bitten: false, levels: 0, penalty: 0 };
    const v = VENOM[venom] ?? 0;
    return { bitten: true, levels: v, penalty: v ? SPIDER_DA.poisonDice : 0 };
}
