/**
 * WoDX Actions 3.2 — the pure rules of the Kindred additions: the Discipline library's codes, Roads, natural
 * healing over time, event prompts (frenzy, sin, torpor, dawn), the best pool for a task, Willpower recovery and
 * prestation. No Foundry calls here, so the harness can test every rule.
 *
 * Sources: V20 Dark Ages (VtDA20). Mortal healing p. 352; torpor p. 350; frenzy p. 357; Roads pp. 110–145;
 * Disciplines pp. 188–316. Anything marked [WoDX] is a convenience or a reading of the rules, not printed text.
 */
import {DAY} from "../../wodx-chronicle/scripts/terms.mjs";

const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };

export const ATTRS = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];
export const VIRTUE_KEYS = ["conscience", "conviction", "selfcontrol", "instinct", "courage"];
export const OTHER_TRAITS = ["willpower", "road", ...VIRTUE_KEYS];

/* ------------------------------------------------------------------ */
/*  Discipline library                                                 */
/* ------------------------------------------------------------------ */

/** Lower-case, no accents, punctuation or the words "the", "path", "of", "sorcery". */
export function normName(s) {
    return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
        .replace(/[’'`]/g, "").replace(/[^a-z0-9]+/g, " ")
        .replace(/\b(the|path|of|sorcery|via|road|disciplines?)\b/g, " ").replace(/\s+/g, " ").trim()
        // Spellings seen on sheets: Daimonion / Daimoinon (VtDA20 prints Daimoinon), Thanatosis is not a Dark Ages name
        .replace(/\bdaimonion\b/g, "daimoinon").replace(/\bkoldunism\b/g, "koldunic");
}

/**
 * Does a library heading ("Quietus (Cruscitus)", "Necromancy: the Path of Bone", "Thaumaturgy: Potestas Vitae")
 * belong to a sheet item named `sheet` ("Quietus", "Path of Bone", "Potestas Vitae", "Necromancy")?
 * A bare "Necromancy"/"Thaumaturgy"/"Koldunic" item matches none of the paths: paths carry their own rating.
 */
export function discMatches(libHeading, sheet) {
    const L = normName(libHeading), S = normName(sheet);
    if (!L || !S) return false;
    if (L === S) return true;
    const SORC = ["necromancy", "thaumaturgy", "koldunic"];
    const [head, ...rest] = L.split(" ");
    if (SORC.includes(head)) {
        const tail = rest.join(" ");
        if (SORC.includes(S)) return false;
        // B7090: a sheet that names the sorcery too ("Thaumaturgy: Hands of Destruction") is matched on the path's own name
        const own = S.split(" ")[0] === head ? S.slice(head.length + 1) : S;
        return tail === own || tail.endsWith(own) || own.endsWith(tail) || (own.length >= 5 && tail.includes(own));
    }
    // "Quietus" covers both its variants; "Valeren (Healer)" matches "Valeren Healer" or "Valeren"
    return L.startsWith(S + " ") || S.startsWith(L + " ");
}

/**
 * The Discipline library for an era (powers pass, B3746): in the Dark Ages and the Long Night, the V20 Dark Ages
 * library alone; in later eras, the V20 powers (data/disciplines-v20.json) take the place of the Dark Ages powers of
 * the same Discipline and level, unless the Dark Ages power is also a V20 power by name (v20Names: slugs).
 */
export function librarySet(da = [], v20 = [], { darkAges = false, v20Names = new Set() } = {}) {
    if (darkAges || !v20?.length) return [...(da ?? [])];
    const key = p => `${normName(p.d)}|${p.l}`;
    const covered = new Set(v20.map(key));
    const slug = s => String(s ?? "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return [...(da ?? []).filter(p => !covered.has(key(p)) || v20Names.has(slug(p.n))), ...v20];
}

/**
 * The powers a character can use: sheet = [{name, value}] (Disciplines and paths). For each library power, the
 * rating of the best-matching sheet entry must reach the power's level. Elder powers need the level too.
 */
/** B7092: does a sheet entry give the Discipline a combination power needs? A sorcery ("Necromancy", "Thaumaturgy")
 *  is met by the sorcery itself or by any of its paths; its rating is the primary (best) path's. */
export function needMatches(need, sheetName, pathHeads = []) {
    const N = normName(need), S = normName(sheetName);
    if (!N || !S) return false;
    if (!["necromancy", "thaumaturgy", "koldunic"].includes(N)) return discMatches(need, sheetName);
    if (S === N || S.startsWith(N + " ")) return true;
    return pathHeads.some(h => normName(h).startsWith(N + " ") && discMatches(h, sheetName));
}

export function powersFor(powers, sheet) {
    const out = [];
    const heads = [...new Set((powers ?? []).map(p => p.d).filter(Boolean))];
    for (const p of powers ?? []) {
        // B7092: a combination power (V20 Lore of the Clans) needs every Discipline it names at its level
        if (Array.isArray(p.needs) && p.needs.length) {
            const met = p.needs.map(nd => (sheet ?? []).filter(s => needMatches(nd.d, s.name, heads)).reduce((m, s) => Math.max(m, n(s.value)), 0) >= n(nd.l));
            if (met.every(Boolean)) out.push({ ...p, rating: Math.min(...p.needs.map(nd => n(nd.l))), item: null, sheetName: p.needs.map(nd => nd.d).join(" + ") });
            continue;
        }
        let best = null;
        for (const s of sheet ?? []) if (discMatches(p.d, s.name) && (!best || n(s.value) > n(best.value))) best = s;
        if (best && n(best.value) >= n(p.l)) out.push({ ...p, rating: n(best.value), item: best.id ?? null, sheetName: best.name });
    }
    return out.sort((a, b) => a.d.localeCompare(b.d) || a.l - b.l || a.n.localeCompare(b.n));
}

/** Cost code → {blood, willpower, variable, optional}. "b1", "w1", "b1w1", "bX" (variable), "b1opt" (optional). */
export function discCost(code) {
    const out = { blood: 0, willpower: 0, variable: false, optional: false };
    const s = String(code ?? "");
    if (!s) return out;
    if (/X/.test(s)) out.variable = true;
    if (/opt$/.test(s)) out.optional = true;
    for (const m of s.matchAll(/([bw])(\d+)/g)) out[m[1] === "b" ? "blood" : "willpower"] += Number(m[2]);
    return out;
}

/** One roll part: "manipulation", "intimidation|empathy" (the better), "selfcontrol|instinct", "willpower", "attr". */
export function poolParts(code) {
    if (!code) return [];
    return String(code).split("+").map(part => {
        const alts = part.split("|");
        if (alts.length === 1 && /^\d+$/.test(alts[0])) return { kind: "number", value: Number(alts[0]) };
        if (alts[0] === "attr") return { kind: "chooseAttr" };
        if (alts.every(a => ATTRS.includes(a))) return { kind: "attr", alts };
        if (alts.every(a => OTHER_TRAITS.includes(a))) return { kind: "trait", alts };
        return { kind: "ability", alts };
    });
}

/**
 * Difficulty code → number, or null when it needs a target that isn't there (or the page decides: "var").
 * t = the target's traits {willpower, stamina, wits, courage, perception, selfcontrol, road, ... abilities},
 * isVampire = the target is a Cainite (for "t:road|willpower").
 */
export function discDifficulty(code, { t = null, own = {} } = {}) {
    if (code === undefined || code === null || code === "") return 6;
    if (typeof code === "number") return code;
    const s = String(code);
    if (/^\d+$/.test(s)) return Number(s);
    if (s === "var") return null;
    let m;
    if ((m = s.match(/^(\d+)\|t:(.+)$/))) return t ? discDifficulty(`t:${m[2]}`, { t, own }) : Number(m[1]);
    if (s.startsWith("own:")) return n(own[s.slice(4)]) || null;
    if (s.startsWith("t:")) {
        if (!t) return null;
        const val = term => {
            if (/^\d+$/.test(term)) return Number(term);
            const alts = term.split("|");
            if (alts.includes("road") && alts.includes("willpower")) return t.isVampire ? n(t.road) : n(t.willpower);
            return Math.max(...alts.map(a => n(t[a])));
        };
        const sum = s.slice(2).split("+").reduce((acc, term) => acc + val(term), 0);
        return Math.max(2, Math.min(10, sum));
    }
    return null;
}

/** Duration code → a WoDX timed-effect duration, or null for instant, permanent, passive or "see the page". */
export function discDuration(code, successes = 1) {
    const s = Math.max(1, n(successes));
    switch (code) {
        case "scene": case "conc": return { kind: "scene" };
        case "turn": return { kind: "rounds", rounds: 1 };
        case "turns": return { kind: "rounds", rounds: s };
        case "night": return { kind: "night" };
        case "nights": case "days": return { kind: "time", seconds: DAY * s };
        default: return null;
    }
}
export const DURATION_TEXT = { scene: "the scene", conc: "while they concentrate (up to the scene)", turn: "one turn", turns: "a turn per success",
    night: "the night", nights: "a night per success", days: "a day per success", instant: "instant", permanent: "permanent", passive: "always on", var: "see the page" };

/* ------------------------------------------------------------------ */
/*  Roads                                                              */
/* ------------------------------------------------------------------ */

/** A Path's own name and the older names WoDX gave it (B7630: the Path of Rebellion is V20 Dark Ages' Path of the Devil, p. 135). */
export function pathNames(p) {
    return [p?.name, ...(p?.aliases ?? [])].map(normName).filter(Boolean);
}
/** The Path on a Road by its name or an older name, as saved in a character's Road flag. */
export function pathByName(road, name) {
    const S = normName(name);
    if (!S) return null;
    return (road?.paths ?? []).find(p => pathNames(p).includes(S)) ?? null;
}

/** Find the Road (and Path) a sheet's Road name means: key, name, Latin name, nickname or a Path's name. */
export function roadFor(data, name) {
    const S = normName(name);
    if (!S || !data?.roads) return null;
    for (const [k, r] of Object.entries(data.roads)) {
        for (const p of r.paths ?? []) if (pathNames(p).some(x => x === S || (S.length > 4 && x.includes(S)))) return { key: k, road: r, path: p };
    }
    for (const [k, r] of Object.entries(data.roads)) {
        const names = [k, r.name, r.latin, ...(String(r.nick ?? "").split(","))].map(normName).filter(Boolean);
        if (names.some(x => x === S || (S.length > 3 && (x.startsWith(S) || S.startsWith(x))))) return { key: k, road: r, path: null };
    }
    return null;
}

/**
 * A V20 Path of Enlightenment picked on the system sheet (B6724): the sheet's choice key (label
 * "wod.advantages.path.caine"), or with the choice "custom", a name spelled as the Path's own ("Path of Caine"). Exact only,
 * so a Dark Ages Road never falls into it, and "Path of Blood" is no longer read as the Road of Yasa. Humanity stays
 * with the Roads data. Returns a found Road shape: {key: "v20-<key>", road: <the Path>, path: null}.
 */
export function v20PathFor(data, label = "", custom = "") {
    const P = data?.paths;
    if (!P) return null;
    const m = /^wod\.advantages\.path\.(\w+)$/.exec(String(label ?? ""));
    // The sheet shows the custom name only when the choice is "custom"
    let k = m && P[m[1]] ? m[1] : null;
    if (!k && custom && (!label || label === "custom")) {
        const c = String(custom).trim().toLowerCase().replace(/^the\s+/, "");
        // B7081: another name the book gives the same Path ("Path of Death and the Soul" is the Path of the Bones, V20 p. 320)
        k = Object.keys(P).find(x => [P[x].name, ...(P[x].aliases ?? [])].some(nm => nm.toLowerCase() === c)) ?? null;
    }
    return k ? { key: `v20-${k}`, road: { ...P[k], book: data.book ?? "V20" }, path: null } : null;
}

/** The sin at a rating on a Road or Path (rating 10 → index 0). */
export function sinAt(hier, rating) {
    if (!Array.isArray(hier) || hier.length !== 10) return null;
    const r = Math.max(1, Math.min(10, n(rating)));
    return hier[10 - r];
}
/**
 * The hierarchy a character sins against. A Path with a full chart of its own uses it. B7631: a Path whose book entry
 * lists only a few levels (`sinsAt`, V20 Dark Ages pp. 119, 123-125, 131) adds those sins to its Road's chart at those
 * levels; the rest of the Road's chart still holds (p. 114: a Path shares most of its Road's ethics).
 */
export function hierarchyOf(found) {
    if (found?.path?.sins) return found.path.sins;
    const base = found?.road?.sins ?? null;
    const at = found?.path?.sinsAt;
    if (!base || !at) return base;
    return base.map((s, i) => { const own = at[String(10 - i)]; return own ? `${own}; or ${s.charAt(0).toLowerCase()}${s.slice(1)}` : s; });
}

/**
 * What an event suggests as a sin level on a Road [WoDX reading of each hierarchy]:
 * kill (a vessel drained to death, a killing), killFrenzy (killing in frenzy), diablerie, frenzy (losing yourself
 * to frenzy), notRidden (failing to ride the wave). null: the event is no sin on that Road.
 */
// B7633: sins from play on every Dark Ages Road. Each level below is the hierarchy line that names the act (V20 Dark Ages
// pp. 116-136 and the data in roads-daw.json); the card names the line and asks, it never rolls by itself. Events:
//   lie            a Subterfuge roll to deceive (Credibility, Fast-Talk, Manipulation + Subterfuge)
//   theft          a Larceny roll that worked (break-in, lockpicking, sleight of hand)
//   wordBroken     a boon refused in the Prestation ledger
//   feedUnwilling  drinking from a living person who gave no leave
//   starve         dawn comes and the vampire went hungry all night without feeding
//   mindMortal     Dominate or Presence worked on a mortal
//   embrace        the Embrace; where a Road has no row for it, the killing counts (a house reading, B7634)
// A Path with an entry here uses only its entry, so a Path that adds to its Road's rows repeats them.
const HUMANITY_EVENTS = { kill: 3, killFrenzy: 4, diablerie: 1, theft: 7 };
const SIN_ROAD_EVENTS = { notRidden: 8, starve: 3 };
export const SIN_EVENTS = {
    humanity: HUMANITY_EVENTS,
    "Path of Breath": { ...HUMANITY_EVENTS, mindMortal: 10 }, "Path of Community": { ...HUMANITY_EVENTS, theft: 4 },
    beast: { starve: 1 },
    heaven: { kill: 4, diablerie: 4 },
    "Path of Christ": { kill: 4, diablerie: 4, lie: 8, theft: 9, feedUnwilling: 6 },
    "Derech Chaim (Path of Life)": { kill: 2, diablerie: 2, theft: 7 },
    "Path of the Prophet": { kill: 4, diablerie: 4, lie: 8, theft: 8, wordBroken: 7 },
    "Path of the Eightfold Wheel": { kill: 2, wordBroken: 4 },
    "Path of the Watchful Gods": { kill: 7, lie: 9, wordBroken: 7 },
    kings: { kill: 6, frenzy: 1, killFrenzy: 1, wordBroken: 2 },
    "Path of Chivalry": { kill: 9, killFrenzy: 9, lie: 9, theft: 9, wordBroken: 2 },
    "Path of Devaraja": { kill: 3, frenzy: 1, killFrenzy: 1, wordBroken: 2 },
    "Path of Daena": { kill: 6, frenzy: 1, killFrenzy: 1, theft: 9, wordBroken: 2 },
    lilith: { kill: 4, killFrenzy: 4, diablerie: 4 },
    metamorphosis: { notRidden: 10, starve: 6 },
    sin: SIN_ROAD_EVENTS, "Path of Pleasure": SIN_ROAD_EVENTS, "Path of the Devil": SIN_ROAD_EVENTS, "Path of Screams": { notRidden: 8, starve: 7 },
    bones: { frenzy: 6, killFrenzy: 6 },
    yasa: { killFrenzy: 4, lie: 8 },
    // V20 Paths of Enlightenment (B6724, V20 pp. 317-340). killFeed: a vessel drained to death while feeding; where a
    // Path has no row for it, kill counts. A null is no sin. Instinct Paths sin on notRidden, Self-Control ones on frenzy.
    "v20-blood": { killFeed: 10, kill: null, frenzy: 6, killFrenzy: 6 },
    "v20-bones": { killFeed: 8, kill: null, frenzy: 6, killFrenzy: 6 },
    "v20-caine": { notRidden: 6 },
    "v20-cathari": { kill: 5, killFrenzy: 5, notRidden: 7 },
    "v20-feralheart": { killFeed: null, kill: 4, killFrenzy: 4 },
    "v20-accord": { kill: 2, killFrenzy: 2 },
    "v20-lilith": { kill: 4, killFrenzy: 4, diablerie: 4 },
    "v20-metamorphosis": { notRidden: 5 },
    "v20-night": { killFeed: 10, kill: 4, killFrenzy: 4 },
    "v20-paradox": { killFeed: 7, kill: 5, killFrenzy: 5 },
    "v20-innervoice": {},
    "v20-typhon": {}
};
export function sinForEvent(found, event) {
    if (!found) return null;
    const byPath = found.path ? SIN_EVENTS[found.path.name] : null;
    // B7081: a variant Path (Harmony) sins as the Path it grew from
    const t = byPath ?? SIN_EVENTS[found.key] ?? (found.road?.variantOf ? SIN_EVENTS[`v20-${found.road.variantOf}`] : null) ?? {};
    if (event === "killFeed" && !("killFeed" in t)) return t.kill ?? null;
    if (event === "embrace" && !("embrace" in t)) return ("killFeed" in t ? t.killFeed : t.kill) ?? null;
    return t[event] ?? null;
}

/** B7633: the sin event a dice roll from the action window is, or null. A lie is told whether or not it lands; a theft counts when the roll worked. */
const LIE_PRESETS = new Set(["credibility", "fasttalk"]), THEFT_PRESETS = new Set(["intrusion", "check-sleight"]);
export function rollSinEvent({ preset = "", attr = "", ability = "", successes = 0, botch = false } = {}) {
    const a = String(ability ?? "").toLowerCase(), at = String(attr ?? "").toLowerCase();
    if (LIE_PRESETS.has(preset) || (!preset && a === "subterfuge" && at === "manipulation")) return "lie";
    if ((THEFT_PRESETS.has(preset) || (!preset && a === "larceny" && at === "dexterity")) && !botch && n(successes) > 0) return "theft";
    return null;
}

/**
 * B7633: did a vampire go hungry all night? At dawn: blood under the hunger line (7 minus Self-Control, or Instinct on an
 * Instinct Road, V20 Dark Ages p. 357) and nothing drunk since `night` seconds before dawn (house reading: 16 hours,
 * the longest Moravian winter night).
 */
export const LONGEST_NIGHT = 16 * 3600;
export function starvedTonight({ blood, virtue, lastFed = null, now, night = LONGEST_NIGHT } = {}) {
    if (n(blood) >= 7 - n(virtue)) return false;
    return lastFed === null || lastFed === undefined || n(lastFed) < n(now) - night;
}

/**
 * B7080: the bearing step at a Humanity or Path rating, from the table in the data (V20 p. 310): [[minimum rating, step]]
 * from the top down. A + step makes the roll harder.
 */
export function bearingStep(steps, rating) {
    const r = n(rating);
    for (const [min, step] of steps ?? []) if (r >= n(min)) return n(step);
    return 0;
}

/**
 * B7080: a V20 Path's bearing on one roll (V20 p. 310; each Path's bearing with its description, pp. 316-338). Only a
 * Path walker has one here; Humanity's bearing stays with the Road aura box and the low-Humanity rules. The bearing
 * counts on its own when the roll's tags meet the Path's (Stealth for the Bones, seduction for the Cathari) or, for
 * Lilith, when the roller carries a wound penalty; `ticked` is the player saying the roll draws on it otherwise.
 * Returns null for no Path, else {name, covers, path, step, auto, applies, byItself (some rolls count on their own), part}.
 */
export function pathBearing(data, found, rating, { tags = [], wounded = false, ticked = false } = {}) {
    const b = found?.road?.bearing;
    if (!b || !String(found.key ?? "").startsWith("v20-")) return null;
    const step = bearingStep(data?.bearingSteps, rating);
    const want = (b.tags ?? []).map(t => String(t).toLowerCase());
    const auto = want.some(t => tags.map(x => String(x).toLowerCase()).includes(t)) || (!!b.wounded && !!wounded);
    const applies = auto || !!ticked;
    const sign = step > 0 ? "+" : "";
    return { name: b.name, covers: b.covers, path: found.road.name, step, auto, applies, byItself: want.length > 0 || !!b.wounded,
        part: applies && step ? `${b.name} bearing (${found.road.name} ${n(rating)}) ${sign}${step} diff, ${data?.book ?? "V20"} p. ${data?.bearingPage ?? 310}` : "" };
}

/** The Road's two Virtues decide the labels and whether Instinct rules apply. */
export function roadVirtues(found) {
    // B7632: a Path with Virtues of its own uses them (Journeys p. 118, Chivalry p. 126, the Devil p. 136)
    const v = found?.path?.virtues ?? found?.road?.virtues ?? [];
    return { conviction: v.includes("conviction"), instinct: v.includes("instinct") };
}

/* ------------------------------------------------------------------ */
/*  Natural healing over time (mortals p. 352; shapechangers)          */
/* ------------------------------------------------------------------ */

const H = 3600, D = DAY;
/** Seconds to heal the worst level, by its place on the track (1 Bruised … 7 Incapacitated). */
export const MORTAL_HEAL = {
    bashing: [H, H, H, H, 3 * H, 6 * H, 12 * H],
    lethal: [D, 3 * D, 7 * D, 30 * D, 60 * D, 90 * D, 150 * D]
};
/** The worst marked level: its place on the track and its damage type (bashing sits below lethal below aggravated). */
export function worstLevel(dmg) {
    const b = n(dmg.bashing), l = n(dmg.lethal), a = n(dmg.aggravated);
    const total = b + l + a;
    if (!total) return null;
    return { index: total, type: b ? "bashing" : l ? "lethal" : "aggravated" };
}

/**
 * Heal a mortal over `seconds` (the worst level first, then up the track). `carry` = seconds already spent on
 * the current worst level. Aggravated wounds on a mortal count as lethal. Returns {damage, carry, healed, needsCare}.
 * Lethal wounds past Hurt need medical attention (p. 352): without `treated`, they don't heal and the card says so.
 */
export function mortalHealing(damage, seconds, { carry = 0, treated = false } = {}) {
    let d = { bashing: n(damage.bashing), lethal: n(damage.lethal) + n(damage.aggravated), aggravated: 0 };
    let left = Math.max(0, n(seconds)) + Math.max(0, n(carry));
    const healed = { bashing: 0, lethal: 0 };
    let needsCare = false;
    for (let guard = 0; guard < 50; guard++) {
        const w = worstLevel(d);
        if (!w) { left = 0; break; }
        if (w.type === "lethal" && w.index > 2 && !treated) { needsCare = true; break; }
        const need = MORTAL_HEAL[w.type][Math.min(6, w.index - 1)];
        if (left < need) break;
        left -= need;
        d[w.type] -= 1; healed[w.type] += 1;
    }
    const w = worstLevel(d);
    return { damage: d, carry: w && !needsCare ? left : 0, healed, needsCare, next: w && !needsCare ? MORTAL_HEAL[w.type][Math.min(6, w.index - 1)] - left : null };
}

/**
 * Shapechangers out of a fight [WoDX]: regenerating, every bashing and lethal level heals within minutes (a level
 * a turn); aggravated wounds heal one a day of rest. A shifter who can't regenerate now (homid in Homid) heals as
 * a mortal.
 */
export function shifterHealing(damage, seconds, { regen = true, carry = 0, treated = false } = {}) {
    if (!regen) return mortalHealing(damage, seconds, { carry, treated });
    const d = { bashing: n(damage.bashing), lethal: n(damage.lethal), aggravated: n(damage.aggravated) };
    let left = Math.max(0, n(seconds)) + Math.max(0, n(carry));
    const healed = { bashing: 0, lethal: 0, aggravated: 0 };
    const quick = d.bashing + d.lethal;
    if (quick && left >= 60) { healed.bashing = d.bashing; healed.lethal = d.lethal; d.bashing = 0; d.lethal = 0; left = Math.max(0, left - quick * 3); }
    while (d.aggravated && left >= D) { d.aggravated--; healed.aggravated++; left -= D; }
    return { damage: d, carry: d.aggravated ? left : 0, healed, needsCare: false, next: d.aggravated ? D - left : null };
}

/** Kindred rising: heal bashing and lethal with blood, keeping blood at the hunger line [WoDX policy]. */
export function risingHeal(damage, blood, selfcontrol, planHealing, { perLevel = 1 } = {}) {
    const keep = Math.max(0, 7 - n(selfcontrol));
    return planHealing(damage, blood, { maxSpend: Math.max(0, n(blood) - keep), perLevel });
}

/* ------------------------------------------------------------------ */
/*  Prompts from what happens                                          */
/* ------------------------------------------------------------------ */

/** A wound that crosses into Wounded or Crippled → a frenzy provocation (p. 357): physical, then life-threatening. */
export function woundProvocation(before, after) {
    const t = d => n(d?.bashing) + n(d?.lethal) + n(d?.aggravated);
    const b = t(before), a = t(after);
    if (a <= b) return null;
    if (a >= 6 && b < 6) return "lifethreat";
    if (a >= 4 && b < 4) return "physical";
    return null;
}
/** Blood falling under the hunger line (blood < 7 − Self-Control, p. 334) → hunger prompt. */
export function hungerCrossed(before, after, selfcontrol) {
    const line = 7 - n(selfcontrol);
    return n(after) < line && n(before) >= line;
}
/** Night/day change between two clock readings: "dawn" | "dusk" | null. */
export function sunChange(wasNight, isNight) {
    if (wasNight === null || wasNight === undefined || wasNight === isNight) return null;
    return isNight ? "dusk" : "dawn";
}
/** Torpor: when it ends, from the Road (p. 350), voluntary torpor half [VtDA20]. */
export function torporUntil(start, road, { voluntary = false, days } = {}) {
    const T = { 10: 1, 9: 3, 8: 7, 7: 14, 6: 30, 5: 365, 4: 3650, 3: 18250, 2: 36500, 1: 182500, 0: 365000 };
    const d = days ?? T[Math.max(0, Math.min(10, n(road)))];
    return n(start) + (voluntary ? Math.ceil(d / 2) : d) * D;
}

/* ------------------------------------------------------------------ */
/*  The best pool for a task                                           */
/* ------------------------------------------------------------------ */

/**
 * Rank Attribute + Ability choices under the untrained rules (V20: Talents fall back on the Attribute, Skills at
 * +1 difficulty, Knowledges can't be tried). choices = [{attr, attrValue, ability, abilityValue, abilityType,
 * specialty}]. Ranked by expected successes at the difficulty, a specialty counting as a little extra.
 */
export function rankPools(choices, difficulty = 6, { untrained = true } = {}) {
    const out = [];
    for (const c of choices ?? []) {
        let dice = n(c.attrValue) + n(c.abilityValue), diff = n(difficulty) || 6, note = "";
        if (untrained && c.ability && !n(c.abilityValue)) {
            if (c.abilityType === "knowledge") { out.push({ ...c, dice: 0, diff, score: -1, note: "untrained Knowledge: can't be tried" }); continue; }
            if (c.abilityType === "skill") { diff += 1; note = "untrained Skill: +1 difficulty"; }
        }
        diff = Math.min(10, diff);
        const p = (11 - diff) / 10;
        const score = dice * (p - 0.1) + (c.specialty ? dice * 0.1 * 0.5 : 0);
        out.push({ ...c, dice, diff, score, note });
    }
    return out.sort((a, b) => b.score - a.score || b.dice - a.dice);
}

/* ------------------------------------------------------------------ */
/*  Willpower and prestation                                           */
/* ------------------------------------------------------------------ */

/** Willpower recovery: "night" one a night (VtDA20 printed p. 340), "story" all at a story's end, "off". */
export function willpowerAfter(mode, temp, perm, event) {
    const t = n(temp), p = n(perm);
    if (mode === "off" || t >= p) return t;
    if (event === "night" && mode === "night") return t + 1;
    if (event === "story" && (mode === "story" || mode === "night")) return p;
    return t;
}

/**
 * Boons: trivial, minor, major, blood, life. B7636: a house rule. Neither V20 Dark Ages nor V20 names this scale or the
 * word "prestation" (no match in either book's text); it is the Camarilla's custom in later books (the boons WoDX NPC's
 * politics cite), used in every era here. A Dark Ages court trades oaths and service as much as favours.
 */
export const BOONS = {
    trivial: { label: "Trivial boon", weight: 1 },
    minor: { label: "Minor boon", weight: 2 },
    major: { label: "Major boon", weight: 3 },
    blood: { label: "Blood boon", weight: 4 },
    life: { label: "Life boon", weight: 5 }
};
/** Outstanding boons by debtor → creditor, with the net weight. entries = [{from, to, kind, status}]. */
export function boonBalance(entries) {
    const out = {};
    for (const e of entries ?? []) {
        if (e.status && e.status !== "owed") continue;
        const k = `${e.from}→${e.to}`;
        out[k] ??= { from: e.from, to: e.to, boons: [], weight: 0 };
        out[k].boons.push(e.kind);
        out[k].weight += BOONS[e.kind]?.weight ?? 1;
    }
    return Object.values(out).sort((a, b) => b.weight - a.weight);
}

/* ------------------------------------------------------------------ */
/*  Downtime and domain (Backgrounds)                                  */
/* ------------------------------------------------------------------ */

/**
 * Downtime actions on a Background [WoDX conveniences built on the Background descriptions]: the pool is the
 * Background's dots (pooled from the coterie when the Group sheet shares it), difficulty 6 unless noted.
 */
export const DOWNTIME = {
    herd: { label: "Feed from the herd", bg: "Herd", diff: 6, note: "Each success is a blood point from the herd this week (no hunting roll). Herd also adds its dots to hunting rolls." },
    retainers: { label: "Send retainers on an errand", bg: "Retainers", diff: 6, note: "Successes set how well the errand goes; a botch: a retainer is lost, hurt or turned." },
    influence: { label: "Use influence", bg: "Influence", diff: 7, note: "Each success is a favour from the mortal institution; the Storyteller sets the scale." },
    resources: { label: "Draw on resources", bg: "Resources", diff: 6, note: "Successes buy goods or bribes beyond the nightly means." },
    contacts: { label: "Ask contacts", bg: "Contacts", diff: 6, note: "Each success is a piece of news or rumour." },
    domain: { label: "Domain upkeep", bg: "Domain", diff: 6, note: "Keeps the domain: no successes and the domain slips (a rival hunts there, the herd thins). Domain also lowers the hunting difficulty there." },
    huntinggrounds: { label: "Keep the hunting grounds", bg: "Hunting Grounds", diff: 6, note: "As domain upkeep, for a pack's grounds." }
};
export function downtimeResult(kind, successes, botch) {
    if (botch) return { ok: false, text: "Botch: it goes wrong (the Storyteller says how)." };
    if (!successes) return { ok: false, text: kind === "domain" || kind === "huntinggrounds" ? "The domain slips this week." : "Nothing comes of it." };
    return { ok: true, text: `${successes} success${successes === 1 ? "" : "es"}.` };
}

/* ------------------------------------------------------------------ */
/*  Witnesses                                                          */
/* ------------------------------------------------------------------ */

/** Who counts as a Masquerade witness: the living who don't already know (mortals, hunters, mages, creatures). */
export const WITNESS_PROFILES = ["mortal", "hunter", "mage", "beast"];
export const WITNESS_STATES = { saw: "Saw it", forgot: "Made to forget (Dominate)", convinced: "Talked round", silenced: "Silenced", told: "Told others", ghoul: "Bound as a ghoul", dream: "Remembers it as a dream (Enchantment ran out)" };

/* ------------------------------------------------------------------ */
/*  Golconda (the owner's Golconda Desk, B5090-B5099)                         */
/* ------------------------------------------------------------------ */

/** Golconda holds while Humanity (the Road) stays at 7 or more and Conscience (or Conviction) at 4 or more (V20 Dark Ages p. 359). */
export const golcondaHolds = ({ road, conscience }) => n(road) >= 7 && n(conscience) >= 4;
/** In Golconda any Trait may reach 10 regardless of Generation (V20 Dark Ages p. 359); the blood pool stays. */
export const golcondaTraitMax = (golconda, genMax) => (golconda ? 10 : n(genMax) || 5);
/** Powers that cannot reach a vampire in Golconda (V20 pp. 158, 161, 177; V20 Dark Ages p. 220), by name. */
export const GOLCONDA_BEYOND = ["speak through the blood", "summon soul", "insight"];
export const beyondGolconda = name => GOLCONDA_BEYOND.includes(String(name ?? "").toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim());
/** B5096: the sun counts one step weaker on the ladder for a vampire in Golconda (the owner's pick, a house rule). */
export const GOLCONDA_SUN_LADDER = ["faint", "covered", "indirect", "cloudy", "direct"];
export const golcondaSun = light => { const i = GOLCONDA_SUN_LADDER.indexOf(light); return i > 0 ? GOLCONDA_SUN_LADDER[i - 1] : light; };

/**
 * B7661: a bloodline's own weight on its Discipline rolls. The Ramanga use Presence and Aizina (their Obtenebration) at
 * +1 difficulty on others, unless they hold a piece of the victim (V20 Dark Ages p. 98). clan: the sheet's clan text.
 * Returns {diff, part} (diff 0 and part "" when nothing applies), and asks: whether the "piece" box is worth showing.
 */
export function bloodlinePowerDiff(clan, discipline, { onOther = true, piece = false } = {}) {
    const ramanga = /ramanga/i.test(String(clan ?? ""));
    const asks = ramanga && /presence|obtenebration|aizina/i.test(String(discipline ?? ""));
    if (!asks || !onOther || piece) return { diff: 0, part: "", asks };
    return { diff: 1, part: "Ramanga +1 (no piece of the victim held)", asks };
}
