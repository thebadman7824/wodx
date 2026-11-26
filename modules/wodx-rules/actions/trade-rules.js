/**
 * WoDX Actions 3.36.0: trade with one NPC, the rules part (no Foundry). Buy, sell and barter at the prices WoDX
 * Storyteller's money gives (era goods, the local market's index), with a haggle roll. House rules, noted in
 * PENDING-REVIEW: V20 has no haggling system. The roll follows V20 Dark Ages' Commerce example (Manipulation +
 * Commerce, difficulty 6, pdf p. 327); in later eras Finance stands in for Commerce.
 */

export const HAGGLE_PRESET = {
    haggleNpc: { label: "Haggle (Man + Finance, diff 6)", attr: "manipulation", ability: "finance", diff: 6,
        alts: [["manipulation", "finance"], ["manipulation", "commerce"], ["manipulation", "streetwise"]],
        note: "House rule: each success takes a tenth off the price (or adds a tenth when selling), up to three tenths. A botch costs a tenth." }
};

/** The most a haggle moves a price, and the step per success (as WoDX Storyteller's money rules). */
export const STEP = 0.1, MOST = 0.3;

/** A price after haggling. selling: the character sells, so successes raise it (never past what the good sells for new). */
export function haggle(price, successes = 0, { botch = false, selling = false, cap = null } = {}) {
    const p = Math.max(0, Math.round(Number(price) || 0));
    if (!p) return 0;
    const off = botch ? -STEP : Math.min(MOST, Math.max(0, Math.round(Number(successes) || 0)) * STEP);
    if (selling) {
        const up = Math.round(p * (1 + off));
        return Math.max(1, cap ? Math.min(up, Math.round(cap)) : up);
    }
    return Math.max(1, Math.round(p * (1 - off)));
}

/** Will they trade at all? Hunted (-3) and hostile (-2) will not; distrusted (-1) charge a tenth more and pay a tenth less. */
export function willTrade(step) { return !(Number(step) <= -2); }
export function attitudeFactor(step, { selling = false } = {}) {
    const s = Number(step) || 0;
    if (s <= -1) return selling ? 0.9 : 1.1;
    return 1;
}

/** Things a character can trade: not traits or powers. */
export function tradeable(items = []) {
    return (items ?? []).filter(it => it && !["Feature", "Power", "Trait"].includes(it.type) && !it.flags?.["wodx-actions"]?.noTrade);
}

/** A shop's "Inside" text (one line per thing, "name (count)" for several) to rows. */
export function shopRows(text) {
    return String(text ?? "").split(/\r?\n/).map(l => l.trim()).filter(Boolean).map((line, i) => {
        const m = /^(.+?)\s+\((\d+)\)$/.exec(line);
        return { i, line, name: m ? m[1] : line, count: m ? Number(m[2]) : 1 };
    });
}
/** Take n of row i out of the shop's text. */
export function takeFromShop(text, i, n = 1) {
    const rows = shopRows(text), r = rows.find(x => x.i === i);
    if (!r) return { text: rows.map(x => x.line).join("\n"), taken: 0 };
    const k = Math.max(1, Math.min(r.count, Math.floor(Number(n) || 1)));
    const left = r.count - k;
    const out = rows.flatMap(x => (x.i !== i ? [x.line] : left <= 0 ? [] : [left > 1 ? `${x.name} (${left})` : x.name]));
    return { text: out.join("\n"), taken: k };
}
/** Put n of a thing into the shop's text (added to a row of the same name). */
export function addToShop(text, name, n = 1) {
    const rows = shopRows(text), k = Math.max(1, Math.floor(Number(n) || 1)), nm = String(name ?? "").trim();
    if (!nm) return rows.map(x => x.line).join("\n");
    const hit = rows.find(x => x.name.toLowerCase() === nm.toLowerCase());
    const out = rows.map(x => (x === hit ? `${x.name} (${x.count + k})` : x.line));
    if (!hit) out.push(k > 1 ? `${nm} (${k})` : nm);
    return out.join("\n");
}

/**
 * Barter: what is wanted against what is offered. want: its price; offer: what the trader gives for it.
 * Returns {even, owe}: owe > 0, the character pays the difference; owe < 0, the trader is getting the better of it
 * and pays nothing back (barter does not give change).
 */
export function barter(want, offer) {
    const w = Math.max(0, Math.round(Number(want) || 0)), o = Math.max(0, Math.round(Number(offer) || 0));
    return { owe: w - o, even: w === o };
}

/**
 * A price scaled by a made thing's quality (Storyteller's priceFactor: 1.25 good, 1.5 fine, 2 masterwork).
 * Returns a new price, or the same one for no factor. Each, total, sell and fence all scale; the smallest coin stays 1.
 */
export function withQuality(price, factor = 1) {
    const f = Number(factor);
    if (!price || !Number.isFinite(f) || f <= 0 || f === 1) return price;
    const up = v => (Number(v) > 0 ? Math.max(1, Math.round(Number(v) * f)) : 0);
    return { ...price, each: up(price.each), total: up(price.total), sell: up(price.sell), fence: up(price.fence), quality: f };
}
/** The quality factor stored on an item, 1 when none. */
export const qualityFactor = item => {
    const f = Number(item?.flags?.["wodx-storyteller"]?.priceFactor);
    return Number.isFinite(f) && f > 0 ? f : 1;
};

/** What a trader gives for a thing: the sell price, or the fence's for something stolen (lifted). */
export const offerFor = (price, { lifted = false } = {}) => {
    if (!price) return 0;
    const v = lifted ? price.fence : price.sell;
    // House rule: a thing with a price fetches at least the smallest coin (cheap goods round their half price down to nothing)
    return (price.each ?? 0) > 0 ? Math.max(1, Math.round(Number(v) || 0)) : 0;
};
