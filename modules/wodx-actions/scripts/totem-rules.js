/**
 * WoDX Actions (B7022-B7027): Werewolf pack totems, read from data/rules/werewolf/totems-w20.json (W20 pp. 371-377,
 * 509, 514). Pure, so the harness can test it. A row's effects use the trait table's grammar (WoDX Chronicle
 * trait-rules.mjs): {ch: "roll", tags, dice, diff, tick, note}. What each part of a row does:
 *   individual.renown      temporary Renown each packmate gains once, when the totem accepts the pack
 *   individual.renownOnce  the same, a loss (Bear: -5 temporary Honor, if there is that much to lose)
 *   individual.awards      every later award of that Renown is smaller (Bear, Coyote, Cuckoo, Fox)
 *   individual.attrs       an Attribute dot, as a die on that Attribute's rolls (as WoDX does for kith birthrights)
 *   individual.attrChoice  one Physical Attribute dot, picked when the totem accepts the pack (Fenris)
 *   individual.traits      Ability dots every packmate has, as dice (Sable, Minotaur)
 *   individual.effects     roll effects; a `tick` is a box the player ticks when the situation holds
 *   individual.rageAtStory extra Rage at the start of each story, past the rating (Wendigo)
 *   pack.traits            Ability or Attribute dots one packmate at a time holds for the scene (p. 372)
 *   pack.willpower         a pool of Willpower any packmate may spend instead of their own; full again each story
 *   pack.giftDice          dice one packmate at a time adds to a Gift of the kinds named
 *   ban                    breaking it turns every benefit off until a Rite of Contrition (p. 372)
 *   notes, friends, refuses: shown on the totem window and the cards, for the Storyteller
 */
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
export const norm = s => String(s ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/^the\s+/, "").replace(/[^a-z0-9]/g, "");
export const ATTRS = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];
export const RENOWN = ["glory", "honor", "wisdom"];
const LABEL = { animalken: "Animal Ken", honor: "Honor", glory: "Glory", wisdom: "Wisdom" };
export const label = k => LABEL[k] ?? String(k ?? "").replace(/^./, c => c.toUpperCase());

/** The totem row a sheet names (Pack Totem field) or a flag key picks (wodx-actions.rules.totem). */
export function totemFor(data, name = "", flagKey = "") {
    const rows = data?.rows ?? [];
    if (flagKey) { const r = rows.find(x => x.key === flagKey); if (r) return r; }
    const s = norm(name);
    if (!s) return null;
    return rows.find(r => [r.name, r.key, ...(r.aliases ?? [])].some(x => norm(x) === s)) ?? null;
}

/** The Pack Traits a packmate can claim: [{id, kind: "trait"|"gift", key?, dots?, dice?, kinds?, label}]. */
export function claimable(row) {
    const out = [];
    for (const [k, dots] of Object.entries(row?.pack?.traits ?? {})) out.push({ id: k, kind: "trait", key: k, dots: n(dots), label: `${label(k)} ${n(dots)}` });
    const g = row?.pack?.giftDice;
    if (g) out.push({ id: "gift", kind: "gift", dice: n(g.dice), kinds: g.kinds, label: `${n(g.dice)} dice on a Gift of ${g.kinds}` });
    return out;
}

/**
 * Who holds which Pack Trait this scene. claims: [{actorId, id, scene}] from the packmates' flags. A claim from another
 * scene has lapsed (p. 372: held until the scene ends). Returns {id: actorId}.
 */
export function holders(claims = [], scene = "") {
    const out = {};
    for (const c of claims) if (c?.id && c.scene === scene && !out[c.id]) out[c.id] = c.actorId;
    return out;
}
/** Can this packmate take the Pack Trait now? {ok, why}. */
export function canClaim(row, id, actorId, claims, scene) {
    if (!claimable(row).some(c => c.id === id)) return { ok: false, why: "the totem gives no such Pack Trait" };
    const h = holders(claims, scene)[id];
    if (h && h !== actorId) return { ok: false, why: "another packmate holds it this scene" };
    return { ok: true, why: "" };
}

/** The Willpower left in the totem's pool: its size less the most any packmate's copy says was spent this story. */
export function poolLeft(row, spent = []) {
    const size = n(row?.pack?.willpower);
    return Math.max(0, size - Math.max(0, ...spent.map(n)));
}

/** Does an effect line meet this roll? tags: the roll's tags; ticked: the tick labels the player ticked. */
function meets(e, tags, ticked) {
    if (e.ch && e.ch !== "roll") return false;
    const want = (e.tags ?? []).map(String);
    if (want.length && !want.some(t => tags.includes(t))) return false;
    if (e.tick && !ticked.includes(e.tick)) return false;
    return true;
}

/**
 * What the totem does to one roll of a packmate. ctx = {tags, ticked: [tick labels], banned, attrKey, abilityKey,
 * holds: [Pack Trait ids this actor holds this scene], choice (the Attribute Fenris gave)}. Returns
 * {dice, diff, parts: ["Falcon: Leadership +3"]}.
 */
export function rollMods(row, ctx = {}) {
    const out = { dice: 0, diff: 0, parts: [] };
    if (!row || ctx.banned) return out;
    const tags = (ctx.tags ?? []).map(t => String(t).toLowerCase());
    for (const k of [ctx.attrKey, ctx.abilityKey]) if (k) tags.push(String(k).toLowerCase());
    const ticked = ctx.ticked ?? [];
    const add = (dice, diff, what) => {
        out.dice += n(dice); out.diff += n(diff);
        if (n(dice)) out.parts.push(`${row.name}: ${what} ${n(dice) > 0 ? "+" : ""}${n(dice)}`);
        if (n(diff)) out.parts.push(`${row.name}: ${what} ${n(diff) > 0 ? "+" : ""}${n(diff)} diff`);
    };
    const I = row.individual ?? {};
    const attrs = { ...(I.attrs ?? {}) };
    if (ctx.choice && (I.attrChoice ?? []).includes(ctx.choice)) attrs[ctx.choice] = (attrs[ctx.choice] ?? 0) + 1;
    for (const [k, d] of Object.entries(attrs)) if (ctx.attrKey === k) add(d, 0, label(k));
    for (const [k, d] of Object.entries(I.traits ?? {})) if (ctx.abilityKey === k || ctx.attrKey === k) add(d, 0, label(k));
    for (const e of I.effects ?? []) if (meets(e, tags, ticked)) add(e.dice, e.diff, e.tick ? e.tick.toLowerCase() : (e.note || "totem"));
    for (const id of ctx.holds ?? []) {
        const d = n(row.pack?.traits?.[id]);
        if (d && (ctx.attrKey === id || ctx.abilityKey === id)) add(d, 0, `${label(id)} (Pack Trait)`);
    }
    return out;
}
/** The ticks the totem offers on a roll window: [{label, note}]. */
export function ticksOf(row, banned = false) {
    if (!row || banned) return [];
    return (row.individual?.effects ?? []).filter(e => e.tick).map(e => ({ label: e.tick, note: e.note ?? "" }));
}

/** Dice a held giftDice Pack Trait adds to a Gift the player marks as one of its kinds. */
export function giftDice(row, { holds = [], ofKind = false, banned = false } = {}) {
    const g = row?.pack?.giftDice;
    if (!g || banned || !holds.includes("gift") || !ofKind) return 0;
    return n(g.dice);
}

/** A Renown award after the totem's cut (p. 374-377): a positive award shrinks, never below 0. */
export function award(row, kind, d, banned = false) {
    const cut = n(row?.individual?.awards?.[kind]);
    if (!row || banned || !cut || n(d) <= 0) return n(d);
    return Math.max(0, n(d) + cut);
}

/** The Renown changes when the totem accepts the pack: {honor: 2} etc.; a loss stops at what the Garou has. */
export function acceptRenown(row, temp = {}) {
    const out = {};
    const I = row?.individual ?? {};
    for (const k of RENOWN) {
        const d = n(I.renown?.[k]) + n(I.renownOnce?.[k]);
        if (!d) continue;
        out[k] = d < 0 ? -Math.min(-d, n(temp[k])) : d;
    }
    return out;
}

/** Rage at the start of a story, with the totem's extra (Wendigo: five more, past the rating). */
export function rageAtStory(row, rage, banned = false) {
    return n(rage) + (row && !banned ? n(row.individual?.rageAtStory) : 0);
}

/** Problems with a totem table, for the guard test: [] when every row is sound. */
export function problems(data) {
    const out = [];
    const known = new Set([...ATTRS, "alertness", "athletics", "brawl", "dodge", "empathy", "expression", "intimidation", "leadership", "primalurge", "streetwise", "subterfuge",
        "animalken", "crafts", "drive", "etiquette", "firearms", "melee", "performance", "stealth", "survival", "computer", "enigmas", "investigation", "law", "linguistics",
        "medicine", "occult", "rituals", "science"]);
    const keys = new Set();
    for (const r of data?.rows ?? []) {
        const w = `${r.key ?? "?"}`;
        if (!r.key || keys.has(r.key)) out.push(`${w}: missing or repeated key`);
        keys.add(r.key);
        if (!r.name || !n(r.cost) || !n(r.page) || !r.ban) out.push(`${w}: needs name, cost, page and ban`);
        for (const k of [...Object.keys(r.pack?.traits ?? {}), ...Object.keys(r.individual?.traits ?? {}), ...Object.keys(r.individual?.attrs ?? {})]) if (!known.has(k)) out.push(`${w}: unknown trait ${k}`);
        for (const k of [...Object.keys(r.individual?.renown ?? {}), ...Object.keys(r.individual?.renownOnce ?? {}), ...Object.keys(r.individual?.awards ?? {})]) if (!RENOWN.includes(k)) out.push(`${w}: unknown Renown ${k}`);
        for (const e of r.individual?.effects ?? []) if (e.ch !== "roll" || !(e.tags ?? []).length || !(n(e.dice) || n(e.diff))) out.push(`${w}: an effect needs ch roll, tags and dice or diff`);
        const does = Object.keys(r.individual ?? {}).some(k => k !== "notes") || claimable(r).length || n(r.pack?.willpower);
        if (!does) out.push(`${w}: does nothing a reader reads`);
    }
    return out;
}
