/**
 * WoDX Actions — Orpheus, the pure rules (Phase 6l, later eras). No Foundry here: the harness tests them.
 * Mechanics from Orpheus (the 2003 core book), in WoDX's words, with the printed page numbers.
 */

export const REF = "Orpheus";
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** The five Shades (p. 122): base Vitality, Willpower and Spite, the Horror each starts with and the two it can never learn. */
export const SHADES = {
    banshee: { label: "Banshee", vitality: 5, willpower: 3, spite: 0, horror: "wail", prohibited: ["helterskelter", "congeal"], gloss: "oracles of the mind and the beyond" },
    haunter: { label: "Haunter", vitality: 5, willpower: 4, spite: 1, horror: "inhabit", prohibited: ["forebode", "wail"], gloss: "at home in places and things" },
    poltergeist: { label: "Poltergeist", vitality: 5, willpower: 5, spite: 2, horror: "helterskelter", prohibited: ["unearthlyrepose", "stormwending"], gloss: "frustration and anger made force" },
    skinrider: { label: "Skinrider", vitality: 4, willpower: 6, spite: 2, horror: "puppetry", prohibited: [], gloss: "leaders who revel in control" },
    wisp: { label: "Wisp", vitality: 4, willpower: 4, spite: 0, horror: "unearthlyrepose", prohibited: ["puppetry", "juggernaut"], gloss: "tricksters of charm and guile" }
};
export const shadeOf = v => { const s = String(v ?? "").toLowerCase().replace(/[^a-z]/g, ""); return Object.keys(SHADES).find(k => s.includes(k)) ?? ""; };
/** The Laments (p. 122): two kinds of ghost, two kinds of projector. */
export const LAMENTS = {
    hue: { label: "Hue", kind: "ghost", bonus: "may bring out any of its three Stains for a scene without penalty", weakness: "Vitality never rises past the starting rating, seven at most" },
    skimmer: { label: "Skimmer", kind: "projector", bonus: "regains a Vitality an hour resting in the body", weakness: "a Vitality an hour outside the body or a bashing level; the soul's wounds are the body's (bashing; soak at 5); a minute to project without Meditation" },
    sleeper: { label: "Sleeper", kind: "projector", bonus: "may shunt unwanted Spite points into the frozen body, and shed them when it heals", weakness: "cannot return until thawed and revived" },
    spirit: { label: "Spirit", kind: "ghost", bonus: "five more freebie points", weakness: "a Spectre nemesis that always returns" }
};
export const lamentOf = v => { const s = String(v ?? "").toLowerCase(); return Object.keys(LAMENTS).find(k => s.includes(k)) ?? ""; };
/** The ten Horrors (p. 124): which Shade has each from the start, and which other Horror each needs first. */
export const HORRORS = {
    wail: { label: "Wail", shade: "banshee" }, forebode: { label: "Forebode", shade: "banshee", requires: "wail" },
    inhabit: { label: "Inhabit", shade: "haunter" }, witchsnimbus: { label: "Witch's Nimbus", shade: "haunter", requires: "inhabit" },
    helterskelter: { label: "Helter Skelter", shade: "poltergeist" }, congeal: { label: "Congeal", shade: "poltergeist", requires: "helterskelter" },
    puppetry: { label: "Puppetry", shade: "skinrider" }, juggernaut: { label: "Juggernaut", shade: "skinrider", requires: "puppetry" },
    unearthlyrepose: { label: "Unearthly Repose", shade: "wisp" }, stormwending: { label: "Storm-Wending", shade: "wisp", requires: "unearthlyrepose" }
};
export const horrorOf = v => { const s = String(v ?? "").toLowerCase().replace(/[^a-z]/g, ""); return Object.keys(HORRORS).find(k => s.includes(k)) ?? ""; };
/** Can this Shade learn that Horror (p. 129)? Its own Shade's cost 7 freebies, another's 10 (p. 124). */
export function canLearn(shade, horror, known = []) {
    const S = SHADES[shade], H = HORRORS[horror];
    if (!S || !H) return { ok: false, why: "unknown Shade or Horror" };
    if (S.prohibited.includes(horror)) return { ok: false, why: `${S.label}s can never learn ${H.label}` };
    if (H.requires && !known.includes(H.requires)) return { ok: false, why: `${H.label} needs ${HORRORS[H.requires].label} first` };
    return { ok: true, freebies: H.shade === shade ? 7 : 10 };
}

/** Starting Advantages (pp. 123, 129–130): the Shade's base plus the Nature's modifiers; Vitality nine at most (seven for hues). */
export function startingAdvantages(shade, mod = {}, lament = "") {
    const S = SHADES[shade] ?? { vitality: 0, willpower: 0, spite: 0 };
    const vcap = lament === "hue" ? 7 : 9;
    return { vitality: Math.min(vcap, S.vitality + n(mod.vitality)), willpower: S.willpower + n(mod.willpower), spite: S.spite + n(mod.spite), vitalityCap: vcap };
}
/** Some of the Natures' modifiers (p. 123–124): [Vitality, Willpower, Spite]. */
export const NATURE_MODS = {
    addict: [1, 1, 3], architect: [1, 3, 1], autocrat: [1, 2, 2], avantgarde: [2, 2, 1], barbarian: [3, 0, 2], bonvivant: [3, 0, 2], bravo: [1, 1, 3], bumpkin: [2, 2, 1],
    bureaucrat: [1, 3, 1], caregiver: [3, 1, 1], celebrant: [3, 0, 1], child: [1, 1, 3], competitor: [2, 2, 1], conformist: [1, 1, 3], conniver: [1, 1, 3], critic: [1, 2, 2],
    curmudgeon: [1, 2, 2], dabbler: [3, 1, 1], defender: [3, 2, 0], deviant: [1, 2, 2], director: [1, 3, 1], dreamer: [2, 1, 2], explorer: [3, 1, 1], fanatic: [2, 2, 1],
    follower: [1, 1, 3], gambler: [2, 1, 2], gallant: [2, 2, 1], grotesque: [1, 1, 3], judge: [1, 2, 2], leader: [2, 2, 1], loner: [1, 2, 2], martyr: [2, 2, 1], masochist: [1, 2, 2],
    mediator: [2, 1, 2], mentor: [3, 1, 1], monster: [1, 2, 2], pedagogue: [1, 2, 2], penitent: [1, 3, 1], perfectionist: [1, 3, 1], rake: [2, 1, 2], rebel: [1, 2, 2], riddler: [2, 2, 1],
    rogue: [1, 2, 2], scientist: [1, 3, 1], socialite: [2, 2, 1], survivor: [2, 2, 1], thrillseeker: [3, 0, 2], traditionalist: [1, 2, 2], trickster: [2, 2, 1], visionary: [1, 3, 1], wretch: [1, 1, 3]
};
export const natureMods = name => { const m = NATURE_MODS[String(name ?? "").toLowerCase().replace(/[^a-z]/g, "")]; return m ? { vitality: m[0], willpower: m[1], spite: m[2] } : null; };

/**
 * Vitality (pp. 188–192). Seven or more current Vitality passes for the living to Spectres; five or six, it depends; four or less,
 * seen as any ghost (and unseen by drones, +1 Social difficulty with them). Three or more spent in a turn is felt three blocks off;
 * five or more draws ghosts and Spectres from five blocks.
 */
export function visibility(vitality) {
    const v = n(vitality);
    if (v >= 7) return { key: "living", text: "passes for one of the living to Spectres; drones are drawn to the brightness" };
    if (v >= 5) return { key: "between", text: "seen or not by its own actions and Abilities" };
    return { key: "ghost", text: "plain to Spectres as any ghost; invisible to drones (+1 Social difficulty with them)" };
}
export function symmetry(spentThisTurn) {
    const k = n(spentThisTurn);
    return k >= 5 ? { blocks: 5, text: "draws ghosts and Spectres from five blocks around" } : k >= 3 ? { blocks: 3, text: "a blip on every nearby spirit's senses, three blocks around" } : null;
}
/** Regaining Vitality (pp. 191–192): eight hours' rest a point (to the starting rating); a Willpower point for three at once; projectors an hour's rest in the body. */
export const rest = (current, starting, hours, inBody = false) => Math.min(n(starting), n(current) + Math.floor(n(hours) / (inBody ? 1 : 8)));
export const willpowerBoost = current => Math.min(10, n(current) + 3);
/** Zero Vitality (p. 192): a Willpower point is spent at once for three; at zero of both the spook dissipates. */
export function zeroVitality({ vitality = 0, willpower = 0 } = {}) {
    if (n(vitality) > 0) return { state: "fine" };
    if (n(willpower) > 0) return { state: "revived", vitality: 3, willpower: n(willpower) - 1 };
    return { state: "dissipates" };
}
/**
 * Tapping Spite (pp. 191, 193): points give Vitality one for one; the rating fills Vitality to 10. Roll one die per point (or one for the
 * rating) at 7: each failure adds a point (or a rating), each botched die two. Ten points make a rating, and a Stain with it.
 */
export function tapSpite({ spitePoints = 0, spiteRating = 0, vitality = 0 } = {}, faces = [], { rating = false, count = 0 } = {}) {
    const k = rating ? 1 : Math.min(n(count), n(spitePoints));
    let add = 0;
    for (const f of faces.slice(0, k)) add += f === 1 ? 2 : f < 7 ? 1 : 0;
    let pts = n(spitePoints), rat = n(spiteRating), newRatings = 0;
    if (rating) { rat += add; newRatings = add; }
    else { pts += add; while (pts >= 10) { pts -= 10; rat += 1; newRatings += 1; } }
    return { vitality: rating ? 10 : Math.min(10, n(vitality) + k), spitePoints: pts, spiteRating: Math.min(10, rat), newRatings, stains: newRatings, spectre: rat >= 10 };
}
/** Spite against the starting Vitality (p. 193). */
export function spiteState(spiteRating, startingVitality) {
    const d = n(spiteRating) - n(startingVitality);
    if (n(spiteRating) >= 10) return { level: 4, text: "a Spectre: out of play" };
    if (d >= 2) return { level: 3, penalty: 1, stains: d, socialPenalty: d, text: `${d} Stains forced out (+1 Social difficulty each); Spectres come for a spook using two Stains or tapping three Spite in a scene` };
    if (d === 1) return { level: 2, penalty: 1, text: "+1 difficulty to all but reflexive actions; facing a Spectre, Willpower at the Spite rating or +2 difficulty against it for the scene" };
    if (d === 0) return { level: 1, penalty: 1, text: "of two minds: only the violent effects are safe; +1 difficulty to all but reflexive actions" };
    return { level: 0, penalty: 0, text: "in control" };
}
/** Losing Spite (p. 193): severing a ghost's last tether loses a Spite rating; a lesser tether may lose points (the Storyteller's call). */
export const severLast = rating => Math.max(0, n(rating) - 1);
/** Stains (p. 129): three at the start (two more for a freebie each), used at will only from Spite 4. */
export const canUseStains = spite => n(spite) >= 4;
/** Creating a new ghost (p. 190): forty Vitality through one conduit, who burns a permanent Willpower. */
export const NEW_GHOST = { vitality: 40, willpowerCost: 1, targetVitality: [4, 5] };

/** Freebie costs (p. 124). */
export const FREEBIES = { attribute: 5, ability: 2, shadeHorror: 7, otherHorror: 10, background: 1, vitality: 5, willpower: 3 };
export const STARTING = { attributes: [6, 4, 3], abilities: [11, 7, 4], abilityCap: 3, backgrounds: { mundane: 2, orpheus: 2 }, stains: 3, freebies: 15 };
