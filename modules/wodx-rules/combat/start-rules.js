/**
 * WoDX Combat 3.9.0 (B807-B810): when a fight starts by itself. The pure parts, so the harness can test them.
 *
 * Something on the map (a hostile NPC catching sight of a character, guards on alarm, a Reaction region's Fight, a
 * frenzy, an attack made outside a fight, a "fight" outcome on a door or region) asks for a fight. One starter answers
 * every one of them: it sets up the encounter on the scene with the people named, or adds them to the fight already
 * running there, and starts it. Suggest whispers the Storyteller a card with Start the fight; Auto starts it at once
 * and whispers a card with Undo. The books have no such machinery (the Storyteller calls for initiative when violence
 * breaks out, VtDA20 pdf p. 344): house rules, logged in docs/PENDING-REVIEW.md.
 */

export const MODES = {
    off: "Off (the Storyteller starts every fight)",
    suggest: "Suggest (a card with Start the fight)",
    auto: "Auto (the fight starts at once, with Undo)"
};

export const SOURCES = {
    region: "A Reaction region's Fight",
    sight: "A hostile NPC sees them",
    alarm: "Guards on alarm see an intruder",
    attitude: "An NPC turns hostile",
    frenzy: "Frenzy",
    attack: "An attack outside a fight",
    outcome: "A door or region outcome",
    rivalry: "Rivals come to blows",
    hand: "The Storyteller"
};

/** Steps at or below this, an NPC who sees the character starts a fight (Hostile). */
export const HOSTILE_STEP = -2;
/** How long the same people and the same reason stay quiet after a card, in real seconds. */
export const QUIET_SECONDS = 60;

/**
 * The mode in force for one request. mode: the world setting; lightTouch: WoDX Chronicle's Light touch (it holds every
 * proposal, so Auto drops to Suggest); byHand: the Storyteller asked for it (a card's Accept, an attack the Storyteller
 * rolled on purpose), which starts at once unless the starter is Off.
 */
export function modeFor({mode = "suggest", lightTouch = false, byHand = false} = {}) {
    if (!MODES[mode] || mode === "off") return "off";
    if (byHand) return "auto";
    if (mode === "auto" && lightTouch) return "suggest";
    return mode;
}

/** The key that keeps one request from being asked twice in a row: the source and the people, in any order. */
export const requestKey = (source, ids = []) => `${source}:${[...new Set(ids.filter(Boolean))].sort().join(",")}`;

/** Was this key asked within the quiet time? recent: Map key -> ms. */
export function askedRecently(recent, key, now = Date.now(), seconds = QUIET_SECONDS) {
    const t = recent?.get?.(key);
    return Number.isFinite(t) && now - t < seconds * 1000;
}

/**
 * What the starter does on a scene. fights: [{id, started, tokenIds}] the encounters on that scene (newest last);
 * ids: the tokens to bring in. Returns {use: combat id or null (make one), add: [token ids], start: bool, already: [ids]}.
 * A running fight on the scene is joined; else an encounter set up but not started is used; else a new one.
 */
export function planStart(fights = [], ids = []) {
    const want = [...new Set(ids.filter(Boolean))];
    const running = fights.filter(f => f.started).at(-1) ?? null;
    const waiting = running ? null : fights.filter(f => !f.started).at(-1) ?? null;
    const use = running ?? waiting;
    const have = new Set(use?.tokenIds ?? []);
    const add = want.filter(id => !have.has(id));
    return {use: use?.id ?? null, add, start: !running, already: want.filter(id => have.has(id))};
}

/**
 * Combat 3.10.0 (B822): each token's side in a fight that rivals started. sides: {tokenId: "a"|"b"} for the people
 * named; kin: {namedId: [kin token ids]}. Kin stand with whoever brought them, unless already placed.
 */
export function sidesWithKin(sides = null, kin = {}) {
    if (!sides) return null;
    const out = { ...sides };
    for (const [id, list] of Object.entries(kin ?? {})) for (const k of list ?? []) if (out[id] && !out[k]) out[k] = out[id];
    return out;
}

/** Nothing to do: everyone named is in the running fight already, or fewer than two people are named. */
export function nothingToDo(plan, ids = []) {
    const n = new Set(ids.filter(Boolean)).size;
    return n < 2 || (!plan.start && !plan.add.length);
}

/** Did this update put the character into frenzy? before/after: system.conditions.isfrenzy. */
export const frenzyBegan = (before, after) => !before && after === true;

/**
 * Who a frenzied character goes for: the nearest of the others within reach, the living only. others: [{id, yards,
 * down}]. Returns token ids, nearest first, at most n.
 */
export function frenzyTargets(others = [], {reach = 20, n = 1} = {}) {
    return others.filter(o => o && !o.down && Number.isFinite(o.yards) && o.yards <= reach)
        .sort((a, b) => a.yards - b.yards || String(a.id).localeCompare(String(b.id))).slice(0, n).map(o => o.id);
}

/** The card's one-line reason. */
export function reasonLine(source, why = "") {
    const s = SOURCES[source] ?? "";
    return why ? String(why).slice(0, 200) : s;
}
