/**
 * WoDX Actions 3.2 — the pure rules of the Kindred additions: the Discipline library's codes, Roads, natural
 * healing over time, event prompts (frenzy, sin, torpor, dawn), the best pool for a task, Willpower recovery and
 * prestation. No Foundry calls here, so the harness can test every rule.
 *
 * Sources: V20 Dark Ages (VtDA20). Mortal healing p. 352; torpor p. 350; frenzy p. 357; Roads pp. 110–145;
 * Disciplines pp. 188–316. Anything marked [WoDX] is a convenience or a reading of the rules, not printed text.
 */

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
        return tail === S || tail.endsWith(S) || S.endsWith(tail) || (S.length >= 5 && tail.includes(S));
    }
    // "Quietus" covers both its variants; "Valeren (Healer)" matches "Valeren Healer" or "Valeren"
    return L.startsWith(S + " ") || S.startsWith(L + " ");
}

/**
 * The powers a character can use: sheet = [{name, value}] (Disciplines and paths). For each library power, the
 * rating of the best-matching sheet entry must reach the power's level. Elder powers need the level too.
 */
export function powersFor(powers, sheet) {
    const out = [];
    for (const p of powers ?? []) {
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
        case "nights": case "days": return { kind: "time", seconds: 86400 * s };
        default: return null;
    }
}
export const DURATION_TEXT = { scene: "the scene", conc: "while she concentrates (up to the scene)", turn: "one turn", turns: "a turn per success",
    night: "the night", nights: "a night per success", days: "a day per success", instant: "instant", permanent: "permanent", passive: "always on", var: "see the page" };

/* ------------------------------------------------------------------ */
/*  Roads                                                              */
/* ------------------------------------------------------------------ */

/** Find the Road (and Path) a sheet's Road name means: key, name, Latin name, nickname or a Path's name. */
export function roadFor(data, name) {
    const S = normName(name);
    if (!S || !data?.roads) return null;
    for (const [k, r] of Object.entries(data.roads)) {
        for (const p of r.paths ?? []) if (normName(p.name) === S || (S.length > 4 && normName(p.name).includes(S))) return { key: k, road: r, path: p };
    }
    for (const [k, r] of Object.entries(data.roads)) {
        const names = [k, r.name, r.latin, ...(String(r.nick ?? "").split(","))].map(normName).filter(Boolean);
        if (names.some(x => x === S || (S.length > 3 && (x.startsWith(S) || S.startsWith(x))))) return { key: k, road: r, path: null };
    }
    return null;
}

/** The sin at a rating on a Road or Path (rating 10 → index 0). */
export function sinAt(hier, rating) {
    if (!Array.isArray(hier) || hier.length !== 10) return null;
    const r = Math.max(1, Math.min(10, n(rating)));
    return hier[10 - r];
}
export function hierarchyOf(found) {
    return found?.path?.sins ?? found?.road?.sins ?? null;
}

/**
 * What an event suggests as a sin level on a Road [WoDX reading of each hierarchy]:
 * kill (a vessel drained to death, a killing), killFrenzy (killing in frenzy), diablerie, frenzy (losing yourself
 * to frenzy), notRidden (failing to ride the wave). null: the event is no sin on that Road.
 */
export const SIN_EVENTS = {
    humanity: { kill: 3, killFrenzy: 4, diablerie: 1 },
    beast: { starve: 1 },
    heaven: { kill: 4, diablerie: 4 },
    "Path of Christ": { kill: 4, diablerie: 4 }, "Derech Chaim (Path of Life)": { kill: 2, diablerie: 2 }, "Path of the Prophet": { kill: 4, diablerie: 4 },
    "Path of the Eightfold Wheel": { kill: 2 }, "Path of the Watchful Gods": { kill: 7 },
    kings: { kill: 6, frenzy: 1, killFrenzy: 1 },
    "Path of Chivalry": { kill: 9, killFrenzy: 9 }, "Path of Devaraja": { kill: 3, frenzy: 1, killFrenzy: 1 }, "Path of Daena": { kill: 6, frenzy: 1, killFrenzy: 1 },
    lilith: { kill: 4, killFrenzy: 4, diablerie: 4 },
    metamorphosis: { notRidden: 10 },
    sin: { notRidden: 8 }, "Path of Pleasure": { notRidden: 8 }, "Path of Rebellion": { notRidden: 8 }, "Path of Damnation": { notRidden: 8 },
    bones: { frenzy: 6, killFrenzy: 6 },
    yasa: { killFrenzy: 4 }
};
export function sinForEvent(found, event) {
    if (!found) return null;
    const byPath = found.path ? SIN_EVENTS[found.path.name] : null;
    const t = byPath ?? SIN_EVENTS[found.key] ?? {};
    return t[event] ?? null;
}

/** The Road's two Virtues decide the labels and whether Instinct rules apply. */
export function roadVirtues(found) {
    const v = found?.road?.virtues ?? [];
    return { conviction: v.includes("conviction"), instinct: v.includes("instinct") };
}

/* ------------------------------------------------------------------ */
/*  Natural healing over time (mortals p. 352; shapechangers)          */
/* ------------------------------------------------------------------ */

const H = 3600, D = 86400;
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
export function risingHeal(damage, blood, selfcontrol, planHealing) {
    const keep = Math.max(0, 7 - n(selfcontrol));
    return planHealing(damage, blood, { maxSpend: Math.max(0, n(blood) - keep) });
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

/** Willpower recovery: "night" one a night (VtDA20 p. 309), "story" all at a story's end, "off". */
export function willpowerAfter(mode, temp, perm, event) {
    const t = n(temp), p = n(perm);
    if (mode === "off" || t >= p) return t;
    if (event === "night" && mode === "night") return t + 1;
    if (event === "story" && (mode === "story" || mode === "night")) return p;
    return t;
}

/** Boons (prestation, V20 Dark Ages): trivial, minor, major, blood, life. */
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
export const WITNESS_STATES = { saw: "Saw it", forgot: "Made to forget (Dominate)", convinced: "Talked round", silenced: "Silenced", told: "Told others", ghoul: "Bound as a ghoul" };
