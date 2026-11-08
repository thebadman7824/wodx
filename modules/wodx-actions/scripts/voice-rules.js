/**
 * WoDX Actions 3.5 — the pure rules of the inner voice (Phase 6d, B53–B56): which voice a character has, how hard it
 * presses (a meter read from the sheet), and the checks a voice may propose. Each line keeps its own rules; this file
 * only says where the line's pressure is and which of the line's own rolls answers it.
 * No Foundry calls here, so the harness can test it.
 */

const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };

export const KINDS = {
    beast: { label: "The Beast", lines: ["kindred", "ghoul"], book: "V20 Dark Ages pp. 341–346 (frenzy, Rötschreck); Ghouls and Revenants p. 42" },
    shadow: { label: "The Shadow", lines: ["wraith"], book: "Wraith 20th pp. 224–245" },
    rage: { label: "Rage", lines: ["lupine"], book: "Dark Ages: Werewolf / W20 frenzy" },
    impulse: { label: "The Impulse", lines: ["hunter"], book: "Dark Ages: Inquisitor p. 162; Hunter: The Reckoning p. 131" },
    gift: { label: "The Gift (the Avatar)", lines: ["mage"], book: "Dark Ages: Mage pp. 87, 139–140 (Twilight, the Fount's whispers); Mage 20th pp. 338–339 (the Avatar, Seekings)" },
    mists: { label: "The Mists and the Weave", lines: ["fae"], book: "Dark Ages: Fae pp. 101–104 (imbalance, Lost and Locked); Changeling 20th (Banality, Bedlam)" },
    spite: { label: "Spite", lines: ["orpheus"], book: "Orpheus pp. 192–193 (Spite against the starting Vitality; the Spectres' call)" },
    torment: { label: "The Torment", lines: ["demon"], book: "Demon: The Fallen pp. 159–162 (the Hierarchy of Sins, Torment), 169–170 (high-Torment effects and powers)" }
};
/** The voice a profile carries (B54); null when the line has none yet. */
export function kindFor(profile) {
    return Object.entries(KINDS).find(([, k]) => k.lines.includes(profile))?.[0] ?? null;
}

export const LEVELS = ["calm", "stirring", "rising", "breaking"];
export const LEVEL_LABEL = { calm: "Quiet", stirring: "Stirring", rising: "Rising", breaking: "Breaking" };
const lvl = i => LEVELS[Math.max(0, Math.min(3, i))];

/**
 * How hard the voice presses, from the sheet. d: the line's numbers (below). Returns {value, max, level, text}.
 *   beast:   {blood, max, selfcontrol} — the hunger line is 7 − Self-Control (V20 Dark Ages p. 345: below it, hunger
 *            can call frenzy); WoDX reading: half the pool is stirring, the line + 1 rising, under the line breaking.
 *   shadow:  {angst, willpower} — Angst above Willpower allows Catharsis (Wraith 20th p. 230): breaking; within one
 *            rising; half of Willpower stirring.
 *   rage:    {rage, willpower} — WoDX reading of the frenzy risk: four Rage can roll the four successes of a frenzy;
 *            Rage at or above Willpower is breaking.
 *   impulse: {conviction, piety} for an inquisitor (Callous when Conviction passes Piety, p. 162), or {virtue} for the
 *            imbued (a derangement at 7 and each point after, HtR p. 131).
 */
export function pressure(kind, d = {}) {
    switch (kind) {
        case "beast": {
            // Kindred of the East: the P'o against the Hun, and the Chi left in the body (hungry at 5, ravenous at 2)
            if (d.kote) {
                const c = n(d.chi), p = n(d.po), h = n(d.hun);
                const i = c <= 2 ? 3 : c <= 5 || p >= h + 3 ? 2 : p > h ? 1 : 0;
                return { value: 20 - c, max: 20, level: lvl(i), text: `Chi ${c}; P'o ${p} against Hun ${h}` };
            }
            const b = n(d.blood), m = n(d.max) || 10, line = 7 - n(d.selfcontrol);
            const i = b < line ? 3 : b <= line + 1 ? 2 : b <= m / 2 ? 1 : 0;
            return { value: m - b, max: m, level: lvl(i), text: `Blood ${b}/${m}; hunger calls below ${line}` };
        }
        case "shadow": {
            const a = n(d.angst), w = n(d.willpower);
            const i = a > w ? 3 : a >= w - 1 ? 2 : a >= w / 2 ? 1 : 0;
            return { value: a, max: 10, level: lvl(i), text: `Angst ${a} against Willpower ${w}` };
        }
        case "rage": {
            const r = n(d.rage), w = n(d.willpower);
            const i = r >= Math.max(4, w) ? 3 : r >= 4 ? 2 : r >= 3 ? 1 : 0;
            return { value: r, max: 10, level: lvl(i), text: `Rage ${r}, Willpower ${w}` };
        }
        case "impulse": {
            if (d.virtue !== undefined) {
                const v = n(d.virtue);
                return { value: v, max: 10, level: lvl(v >= 7 ? 3 : v >= 6 ? 2 : v >= 5 ? 1 : 0), text: `Highest Virtue ${v}; derangements from 7` };
            }
            const c = n(d.conviction), p = n(d.piety);
            return { value: c, max: 10, level: lvl(c > p ? 3 : c === p ? 2 : c === p - 1 ? 1 : 0), text: `Conviction ${c} against Piety ${p}` };
        }
        case "gift": {
            // Dark Ages: Twilight (symptoms from 2 permanent; Median 4, Deep 7). Later eras: the Avatar's rating and Paradox.
            if (d.era === "da") {
                const t = n(d.temp), p = n(d.perm);
                const i = p >= 7 ? 3 : p >= 4 ? 2 : (p >= 2 || t >= 5) ? 1 : 0;
                return { value: p * 10 + t, max: 100, level: lvl(i), text: `Twilight ${t} temporary, ${p} permanent` };
            }
            const a = n(d.avatar), x = n(d.paradox);
            const i = Math.max(x >= 10 ? 3 : x >= 5 ? 2 : x >= 3 ? 1 : 0, a >= 4 ? 1 : 0);
            return { value: x, max: 20, level: lvl(i), text: `Avatar ${a}; Paradox ${x}` };
        }
        case "mists": {
            // Dark Ages: the pull toward Lost or Locked (imbalance, days hidden by the Mists, Weaving overspent).
            // Later eras: Banality's weight against Glamour (Changeling 20th).
            if (d.era === "da") {
                const m = n(d.mists), w = n(d.weaving), gap = Math.abs(m - w), hid = d.hiddenDays == null ? -1 : n(d.hiddenDays), wp = n(d.willpower);
                const i = (hid > wp && wp > 0) || d.lockedRisk ? 3 : gap >= 3 ? 2 : (gap === 2 || (hid >= 0 && hid >= wp - 1) || d.overSpend) ? 1 : 0;
                const toward = m > w ? "Lost" : w > m ? "Locked" : null;
                return { value: gap, max: 10, level: lvl(i), text: `Mists ${m}, Weaving ${w}${toward && gap >= 2 ? `: toward ${toward}` : ""}${hid >= 0 ? `; hidden ${hid} day${hid === 1 ? "" : "s"}` : ""}` };
            }
            // Changeling 20th: Bedlam's road (Nightmare and Imbalanced Willpower, p. 274) and Banality's weight (Undone at 10)
            const b = n(d.banality), g = n(d.glamour), nm = n(d.nightmare), imb = n(d.imbalances), wp = n(d.willpower), pts = n(d.banalityPoints);
            const i = (imb > 0 && wp > 0 && imb >= wp - 1) || b >= 9 ? 3 : (imb > 0 || nm >= 8 || b >= 7) ? 2 : (nm >= 5 || b >= 5 || (g > 0 && pts > g) || g === 0) ? 1 : 0;
            return { value: Math.max(b, nm), max: 10, level: lvl(i), text: `Banality ${b}; Glamour ${g}${nm ? `; Nightmare ${nm}` : ""}${imb ? `; Imbalances ${imb}` : ""}` };
        }
        case "spite": {
            // Orpheus: Spite's rating against the starting Vitality (p. 193), and the points toward the next rating
            const r = n(d.rating), v = n(d.vitality), p = n(d.points);
            const i = r >= v + 1 ? 3 : r >= v ? 2 : r >= v - 1 || p >= 7 ? 1 : 0;
            return { value: r * 10 + p, max: 100, level: lvl(i), text: `Spite ${r} (${p} points) against Vitality ${v}` };
        }
        case "torment": {
            // The Abyss's memory: permanent Torment (7 brings the high-Torment powers) and the temporary points toward the next one.
            const p = n(d.perm), t = n(d.temp);
            const i = p >= 7 || t >= 8 ? 3 : p >= 6 || t >= 5 ? 2 : p >= 5 || t >= 2 ? 1 : 0;
            return { value: p * 10 + t, max: 100, level: lvl(i), text: `Torment ${p}${t ? ` (+${t} temporary)` : ""}` };
        }
        default: return { value: 0, max: 10, level: "calm", text: "" };
    }
}
/** The level went up (a prompt to the voice). */
export const rose = (before, after) => LEVELS.indexOf(after) > LEVELS.indexOf(before);

/** What a voice may propose (B53), and which of the line's own rolls answers it; roller: who clicks the card's button. */
export const PROPOSALS = {
    beast: [
        { id: "frenzy", label: "A frenzy check (anger or hunger)", api: "frenzy", roller: "owner" },
        { id: "rotschreck", label: "Rötschreck (fire or sunlight)", api: "rotschreck", roller: "owner" },
        { id: "sin", label: "A sin against the Road", api: "sin", roller: "owner" }
    ],
    shadow: [
        { id: "catharsis", label: "Catharsis: the Shadow tries to take control", api: "shadow", roller: "guide" },
        { id: "dark", label: "A Dark Passion stirs", api: "shadow", roller: "guide" },
        { id: "harrowing", label: "A Harrowing", api: "harrowing", roller: "owner" }
    ],
    rage: [
        { id: "rage", label: "A Rage roll (frenzy)", api: "rageRoll", roller: "owner" }
    ],
    gift: [
        { id: "twilight", label: "Twilight colours what the mage sees (the player plays it; Dark Ages)", api: null, roller: "owner" },
        { id: "urge", label: "An urge to cast again, or to break abstinence", api: null, roller: "owner" },
        { id: "seeking", label: "A Seeking: the Avatar's trial (from the Victorian era on)", api: null, roller: "owner" }
    ],
    mists: [
        { id: "lost", label: "The Mists pull: to Unleash, to hide, to withdraw from the world (Dark Ages)", api: "daUnleash", roller: "owner" },
        { id: "locked", label: "The Weave tightens: routine, the same cantrip again, a refusal of chaos (Dark Ages)", api: null, roller: "owner" },
        { id: "echo", label: "An Echo bites: the Storyteller calls for its roll", api: "daEcho", roller: "owner" },
        { id: "banality", label: "Banality's weight: the world seems drab and certain (Changeling 20th)", api: null, roller: "owner" }
    ],
    spite: [
        { id: "tap", label: "Tap the hate for strength (Spite for Vitality)", api: "orphVitality", roller: "owner" },
        { id: "lash", label: "Lash out: the violent effect of a Horror", api: "orphHorror", roller: "owner" },
        { id: "spectre", label: "The Spectres call: answer, or refuse", api: "orphSpite", roller: "owner" }
    ],
    torment: [
        { id: "dark", label: "The dark effect tempts: choose the high-Torment effect of an evocation", api: "demonEvoke", roller: "owner" },
        { id: "sin", label: "Lash out: a sin against the Virtues", api: "demonSin", roller: "owner" },
        { id: "form", label: "Show them the true face: the apocalyptic form", api: "demonForm", roller: "owner" }
    ],
    impulse: [
        { id: "impulse", label: "The Impulse (an inquisitor while Callous)", api: "hunterVirtue", roller: "owner" },
        { id: "derangement", label: "A derangement shows itself (the imbued)", api: null, roller: "owner" }
    ]
};
export const proposalFor = (kind, id) => (PROPOSALS[kind] ?? []).find(p => p.id === id) ?? null;

/** May the Storyteller opt a player's character in or out (the house rule "storytellerVoiceOptIn")? */
export function storytellerMayOptIn({ isGM, rule, hasPlayerOwner }) {
    return !!(isGM && rule && hasPlayerOwner);
}

/** Is a voice live? The chronicle switch, the player's opt-in (or a Storyteller character), and no X-card pause (B56). */
export function live({ chronicleOn, optIn, hasPlayerOwner, paused }) {
    if (!chronicleOn || paused) return false;
    return hasPlayerOwner ? !!optIn : true;
}
