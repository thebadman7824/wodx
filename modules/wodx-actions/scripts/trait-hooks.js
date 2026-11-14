/**
 * WoDX Actions 3.29.0: merits and flaws on the roll (Traits With Teeth, step 2). The table and its rules live in
 * WoDX Chronicle (data/trait-effects.mjs, scripts/trait-rules.mjs); this file asks Chronicle's api for the effects of
 * one roll and hands back dice, difficulty and one part per trait for the card. With Chronicle off, or the world
 * setting "Merits and flaws on rolls" off, nothing changes.
 *
 *   traitMods(actor, tags, {target, moon}): the roller's own merits and flaws ("roll" effects), read against the
 *     target's kind (an effect only on mortals needs a mortal target).
 *   resistMods(target, tags, actor): the target's merits that make a power on them harder ("resist" effects:
 *     Iron Will against mind powers, Magic Resistance against magic).
 * Player characters and NPCs are read the same way.
 */
const NONE = Object.freeze({ dice: 0, diff: 0, parts: [] });

function traits() {
    const c = game.modules.get("wodx-chronicle");
    if (!c?.active || !c.api?.traits) return null;
    try { if (!game.settings.get("wodx-actions", "traitRolls")) return null; } catch (e) { /* setting not registered yet: on */ }
    return c.api.traits;
}

function moonNow() {
    try { return game.modules.get("wodx-chronicle")?.api?.when?.context?.({})?.moon ?? ""; } catch (e) { return ""; }
}

export function tagsFor(...keys) {
    const T = traits();
    return T ? T.rules.rollTags(...keys) : [];
}

export function traitMods(actor, tags = [], { target = null, moon = null } = {}) {
    const T = traits();
    if (!T || !actor || !tags.length) return NONE;
    try {
        const against = target ? T.kindOf(target) : null;
        const list = T.effects(actor, { channel: "roll", tags, against, moon: moon ?? (tags.includes("frenzy") ? moonNow() : "") });
        return T.rules.sumEffects(list);
    } catch (e) { console.warn("WoDX Actions | trait effects", e); return NONE; }
}

export function resistMods(target, tags = [], actor = null) {
    const T = traits();
    if (!T || !target || !tags.length) return NONE;
    try {
        const list = T.effects(target, { channel: "resist", tags, against: actor ? T.kindOf(actor) : null });
        const s = T.rules.sumEffects(list);
        return { ...s, parts: s.parts.map(p => `${target.name}'s ${p}`) };
    } catch (e) { console.warn("WoDX Actions | trait effects", e); return NONE; }
}

/** Disciplines whose powers count as mind powers or magic for Iron Will and Magic Resistance (V20 p. 485, 493). */
export function powerTags(discipline = "") {
    const d = String(discipline).toLowerCase();
    const out = [];
    if (/dominate|dementation/.test(d)) out.push("mind");
    if (/thaumaturgy|koldun|necromancy|abyss|sorcery|path|ritual/.test(d)) out.push("magic");
    // V20 core p. 485 printed: Iron Will also stands against Thaumaturgy
    if (/thaumaturgy/.test(d)) out.push("thaumaturgy");
    return out;
}

export function registerTraitSetting() {
    game.settings.register("wodx-actions", "traitRolls", {
        name: "Merits and flaws on rolls",
        hint: "Merits and flaws from the WoDX trait table change the dice and difficulty of the rolls they name, for players and NPCs alike, and each shows on the card. Needs WoDX Chronicle.",
        scope: "world", config: true, type: Boolean, default: true
    });
}

/** Circumstances the roll window cannot see for itself; a box shows only when one of the character's traits names it. */
export const TICKS = [
    { key: "voice", label: "By voice (persuading, charming, commanding)" },
    { key: "first-meeting", label: "A stranger, at the first meeting" },
    { key: "risky", label: "Risky: difficulty 8 or more, three health levels at stake" },
    { key: "balance", label: "Keeping balance" },
    { key: "unplanned", label: "Unplanned physical action" },
    { key: "sight", label: "Uses sight" }, { key: "hearing", label: "Uses hearing" }, { key: "smell", label: "Uses smell" },
    { key: "taste", label: "Uses taste" }, { key: "touch", label: "Uses touch" }
];

export function ticksFor(actor) {
    const T = traits();
    if (!T || !actor) return [];
    try {
        const tags = new Set();
        for (const m of T.of(actor).matched) if (!m.wrongKind) for (const e of m.entry.effects ?? []) if (e.ch === "roll") {
            // an effect that reads the item's own words ("Acute Sense (Hearing)") offers only the boxes it names
            const own = String(m.name ?? "").toLowerCase();
            for (const t of e.tags ?? []) if (!e.nameTags || own.includes(t)) tags.add(t);
        }
        // B3780: situations the merits and flaws name themselves (Introspection: the other side shares the Nature)
        const own = typeof T.ticks === "function" ? T.ticks(actor).filter(t => !TICKS.some(x => x.key === t.key)) : [];
        return [...TICKS.filter(t => tags.has(t.key)), ...own];
    } catch (e) { return []; }
}

export function ticksHtml(actor, esc = s => s) {
    const list = ticksFor(actor);
    if (!list.length) return "";
    return `<fieldset class="vta-ticks"><legend>Merits and flaws: does this roll…</legend>${list.map(t =>
        `<label><input type="checkbox" name="tag-${t.key}"/> ${esc(t.label)}</label>`).join(" ")}</fieldset>`;
}

/* Traits With Teeth step 6 (Actions 3.35.0): sleep, feeding, pools and banked rerolls (V20 core pp. 480-494 printed) */

/** Does the actor hold a working trait (by table key)? */
export function holds(actor, key) {
    const T = traits();
    if (!T || !actor) return false;
    try { return T.has(actor, key) > 0; } catch (e) { return false; }
}

/** Lucky: three rerolls of a failed roll in a story. The count is kept on the actor against the story's id. */
export const LUCKY_PER_STORY = 3;
const storyNow = () => { try { return game.settings.get("wodx-actions", "storyId") || "first"; } catch (e) { return "first"; } };
export function luckyLeft(actor) {
    if (!holds(actor, "lucky")) return 0;
    const f = actor.flags?.["wodx-actions"]?.lucky ?? {};
    return Math.max(0, LUCKY_PER_STORY - (f.story === storyNow() ? Number(f.used) || 0 : 0));
}
export async function useLucky(actor) {
    const left = luckyLeft(actor);
    if (!left) return null;
    const f = actor.flags?.["wodx-actions"]?.lucky ?? {};
    const used = (f.story === storyNow() ? Number(f.used) || 0 : 0) + 1;
    await actor.setFlag("wodx-actions", "lucky", { story: storyNow(), used });
    return { left: left - 1 };
}
export function luckyHtml(actor, esc = s => s) {
    const left = luckyLeft(actor);
    if (!left) return "";
    return `<div class="form-group"><label><input type="checkbox" name="lucky" checked/> ${esc(`Lucky: roll again if it fails (${left} left this story)`)}</label></div>`;
}

/** Feeding: Efficient Digestion gives one more point for every two drunk (never past the pool's room). */
export function digestionBonus(actor, drunk, room) {
    if (!holds(actor, "efficient-digestion")) return 0;
    return Math.max(0, Math.min(Math.floor((Number(drunk) || 0) / 2), Number(room) || 0));
}

/** Blood spent: Thin Blood doubles every cost (rising at dusk still costs one). */
export const bloodCostMult = actor => (holds(actor, "thin-blood") ? 2 : 1);

/** Waking by day: Deep Sleeper +2 difficulty; Light Sleeper wakes at once and acts without the Road cap. */
export function sleepMods(actor) {
    return { diff: holds(actor, "deep-sleeper") ? 2 : 0, light: holds(actor, "light-sleeper") };
}

/** Prey Exclusion: a reminder on every feeding card (the excluded group is the player's own choice, written on the item). */
export function preyNote(actor) {
    if (!holds(actor, "prey-exclusion")) return "";
    const it = (actor.items ?? []).find(i => /prey exclusion/i.test(i.name ?? ""));
    const who = it?.name?.match(/\((.+)\)/)?.[1];
    return `Prey Exclusion${who ? ` (${who})` : ""}: feeding on that group means frenzy at once and a roll of the Road or Humanity at difficulty 7.`;
}
