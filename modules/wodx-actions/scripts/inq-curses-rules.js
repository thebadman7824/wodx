/**
 * Hunters' sins and Curses from play (B7883-B7890): the Curses of Dark Ages: Inquisitor (pp. 201-213), the roll that
 * brings them (p. 202), Cocytus (pp. 203-204), the order benefits and drawbacks (pp. 129-139), and the sins of play that
 * call a Piety roll (p. 159). Pure rules; hunter.js keeps the inquisitor's record and the cards. All text is WoDX's own.
 *
 *   The Curse roll (p. 202): one die, plus the modifiers below. 0 or less: +1 Conviction; 1-3: nothing; 4-6: -2
 *   Conviction; 7-8: a Curse of the first stage; 9-10: of the second; 11 and up: of the third.
 *   When (p. 203): a botched Piety roll or a botched roll on a Superior Virtue; an Endowment gained in play (not an
 *   Orison); and a Blessing learned above the inquisitor's stage brings that stage's Curse with no roll.
 *   Order (p. 204): the first Curse of each stage comes from the order's own category.
 *   Cocytus (pp. 203-204): Curse stages (a Judge Curse counts three) at or above permanent Piety plus the Superior
 *   Virtues: the Nature becomes the Impulse for good, Willpower comes back only by acting on it, and every Conviction
 *   spent on anything but a Superior Virtue is also taken from the bank.
 */
import { DAY } from "../../wodx-chronicle/scripts/terms.mjs";

export const REF = "Dark Ages: Inquisitor";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };

/** The five categories (p. 201) and the order each belongs to (p. 204). */
export const CATEGORIES = {
    anathemae: { label: "Anathemae", order: "oculi", pages: "pp. 204-205" },
    interdictions: { label: "Interdictions", order: "acre", pages: "pp. 206-207" },
    maledictio: { label: "Maledictio", order: "murnau", pages: "pp. 208-209" },
    stigmata: { label: "Stigmata", order: "red", pages: "pp. 210-211" },
    visitations: { label: "Visitations", order: "john", pages: "pp. 212-213" }
};
export const categoryOf = order => Object.keys(CATEGORIES).find(k => CATEGORIES[k].order === order) ?? null;
export const STAGE_NAME = { 1: "Acolyte", 2: "Advocate", 3: "Judge" };

/**
 * The 25 Curses. mods: what they do to the inquisitor's own rolls, by the roll's tags (WoDX Chronicle's trait tags):
 * {tags, not, dice, diff, note}. rule: a rule the hunter code reads (lamb, penitence, injured). check: a roll the card
 * names when the moment comes.
 */
export const CURSES = [
    // Anathemae (the Oculi Dei): others' loathing
    { id: "lamb-of-god", name: "Lamb of God", cat: "anathemae", stage: 1, rule: "lamb", fx: "Callous as soon as Conviction reaches Piety, not only above it." },
    { id: "scent-of-hyacinth", name: "Scent of Hyacinth", cat: "anathemae", stage: 1, mods: [{ tags: ["social"], not: ["intimidation"], diff: 1, note: "+1 difficulty on Social rolls with mortals (not Intimidation)" }], fx: "A sweet smell clings to them: +1 difficulty on Social rolls with mortals except Intimidation, and anything tracking by scent finds them 2 easier." },
    { id: "silent-vigil", name: "Silent Vigil", cat: "anathemae", stage: 2, check: "Willpower at 8 when they witness cruelty, or they cannot speak for the scene.", fx: "Cruelty seen strikes them dumb unless Willpower holds." },
    { id: "unclean", name: "Unclean", cat: "anathemae", stage: 2, check: "Appearance + Expression at 6 on meeting a stranger, or the stranger takes against them.", fx: "Strangers take against them on sight unless they win them over." },
    { id: "false-witness", name: "False Witness", cat: "anathemae", stage: 3, mods: [{ tags: ["subterfuge"], dice: -3, note: "-3 dice on Subterfuge" }], fx: "Every lie shows on them: -3 dice on Subterfuge, and Blessings that read the truth fail on them." },
    // Interdictions (the Knights of Acre): vows
    { id: "solemn-oath", name: "Solemn Oath", cat: "interdictions", stage: 1, check: "A vow they may not break; breaking it is a sin against God at their Piety.", fx: "Bound by a vow God holds them to." },
    { id: "suffer-the-little-children", name: "Suffer the Little Children", cat: "interdictions", stage: 1, check: "They may not let a child come to harm; failing one is a sin against God at their Piety.", fx: "Bound to protect every child they meet." },
    { id: "call-of-duty", name: "Call of Duty", cat: "interdictions", stage: 2, check: "They must answer any call for help against the enemy; refusing is a sin against God at their Piety.", fx: "Bound to answer every call to the hunt." },
    { id: "endless-penitence", name: "Endless Penitence", cat: "interdictions", stage: 2, rule: "penitence", fx: "Their Nature becomes Penitent or Fanatic, and prayer gives them no Conviction." },
    { id: "pain-of-the-flock", name: "Pain of the Flock", cat: "interdictions", stage: 3, check: "Willpower at 7 when a Christian near them is harmed, or they feel the wounds as their own (the wound penalties, no damage).", fx: "The flock's hurts become their own." },
    // Maledictio (the House of Murnau): ill luck and fiends
    { id: "allure-of-gentle-hades", name: "Allure of Gentle Hades", cat: "maledictio", stage: 1, mods: [{ tags: ["stealth"], diff: 2, note: "+2 difficulty on Stealth" }], fx: "Something about them draws the eye of the damned: +2 difficulty on Stealth." },
    { id: "company-of-wolves", name: "Company of Wolves", cat: "maledictio", stage: 1, check: "Beasts follow and gather around them.", fx: "Wild beasts are drawn to them." },
    { id: "devils-bargain", name: "Devil's Bargain", cat: "maledictio", stage: 2, check: "Once a session, bonus dice equal to their highest Superior Virtue; each bonus die that fails costs a Willpower or a Conviction.", fx: "A bargain offered every session, and paid for in failure." },
    { id: "mark-of-the-beast", name: "Mark of the Beast", cat: "maledictio", stage: 2, mods: [{ tags: ["appearance"], dice: -1, note: "Appearance -1" }], fx: "A mark of the beast shows on them: Appearance one lower." },
    { id: "personal-adversary", name: "Personal Adversary", cat: "maledictio", stage: 3, check: "A lesser fiend (a Yattering) torments them, at night.", fx: "A small fiend of their own, active by night." },
    // Stigmata (the Red Order): wounds of the Passion
    { id: "boiled-in-shame", name: "Boiled in Shame", cat: "stigmata", stage: 1, mods: [{ tags: ["dexterity"], diff: 1, note: "+1 difficulty on fast or fine Dexterity work" }, { tags: ["appearance"], dice: -1, note: "Appearance -1" }], fx: "Their skin blisters as if scalded: +1 difficulty on Dexterity, Appearance one lower." },
    { id: "lashed-in-judgment", name: "Lashed in Judgment", cat: "stigmata", stage: 1, mods: [{ tags: ["strength", "athletics"], dice: -2, note: "-2 dice on physical exertion (Stamina at 7 cuts it)" }], fx: "Lash marks open when they strain: -2 dice on physical exertion." },
    { id: "crowned-by-thorns", name: "Crowned by Thorns", cat: "stigmata", stage: 2, mods: [{ tags: ["social"], diff: 2, note: "+2 difficulty on Social rolls unless the crown is hidden" }], fx: "A ring of thorn wounds on the brow: +2 difficulty on Social rolls unless it is hidden; their sight blurs when Conviction risked is lost." },
    { id: "marked-by-the-cross", name: "Marked by the Cross", cat: "stigmata", stage: 2, check: "When a roll on their primary Superior Virtue fails, they bleed: Stamina + Faith at 6 or a level of bashing.", fx: "The wounds of the Cross bleed when their faith fails." },
    { id: "speared-by-destiny", name: "Speared by Destiny", cat: "stigmata", stage: 3, rule: "injured", mods: [{ tags: ["*"], dice: -1, note: "Always at Injured: -1 die" }], fx: "The spear wound never closes: always at Injured." },
    // Visitations (the Sisters of St. John): visions and voices
    { id: "book-of-revelations", name: "Book of Revelations", cat: "visitations", stage: 1, check: "Willpower at 6 each morning, or +3 difficulty on Mental rolls that day, less one for each success.", fx: "Visions in the night leave the mind clouded." },
    { id: "the-gloaming", name: "The Gloaming", cat: "visitations", stage: 1, check: "Willpower at 7 at dusk, or a trance in which they see the dead.", fx: "At dusk they slip toward the dead and see ghosts." },
    { id: "curse-of-the-scribe", name: "Curse of the Scribe", cat: "visitations", stage: 2, check: "Willpower when a vision takes them, or they write what it shows until it passes.", fx: "Visions that must be written down." },
    { id: "glossolalia", name: "Glossolalia", cat: "visitations", stage: 2, check: "Willpower under strain, or they speak in tongues.", fx: "Tongues take them under strain." },
    { id: "spirit-tithe", name: "Spirit Tithe", cat: "visitations", stage: 3, check: "Piety at 8 on contact with a spirit, or a Willpower point is lost to it.", fx: "Spirits take a tithe of their will." }
];
export const curseById = id => CURSES.find(c => c.id === id) ?? null;
export const pageOf = c => CATEGORIES[c?.cat]?.pages ?? "pp. 201-213";

/** The Curse ids an inquisitor's record holds (strings or {id}). */
export const idsOf = held => (Array.isArray(held) ? held : []).map(h => (typeof h === "string" ? h : h?.id)).filter(id => curseById(id));
/** Curse stages in all (a Judge Curse counts three, p. 203). */
export const stagesOf = held => idsOf(held).reduce((s, id) => s + curseById(id).stage, 0);
export const hasCurse = (held, id) => idsOf(held).includes(id);

/**
 * The Curse roll's modifiers (p. 202). o: {callous, held, from, order, sv: {faith, wisdom, zeal}, newCategory, legacy,
 * benefit}. from: "primary" (a botched roll on the order's primary Superior Virtue), "other" (a botch on another),
 * "piety" (a botched Piety roll), "endowment" (an Endowment gained in play). benefit: the Murnau order benefit taken,
 * whose drawback adds one (p. 137).
 */
export function curseRollMods(o = {}) {
    const parts = [];
    let mod = 0;
    const add = (k, why) => { mod += k; parts.push(`${k > 0 ? "+" : ""}${k} ${why}`); };
    if (o.callous) add(1, "Callous");
    const heavy = idsOf(o.held).filter(id => curseById(id).stage > 1).length;
    if (heavy) add(heavy, `for ${heavy} Curse${heavy === 1 ? "" : "s"} past the first stage`);
    if (o.from === "primary") add(1, "a botch on the primary Superior Virtue");
    if (o.from === "other") add(-1, "a botch on another Superior Virtue");
    if (o.newCategory) add(1, "a new kind of Endowment");
    if (o.legacy && o.order !== "murnau") add(1, "a Legacy learned outside the House of Murnau");
    const sv = o.sv ?? {};
    const vals = ["faith", "wisdom", "zeal"].map(k => n(sv[k]));
    if (vals.every(v => v >= 1)) add(-1, "a dot in every Superior Virtue");
    const fives = vals.filter(v => v >= 5).length;
    if (fives) add(-fives, `for ${fives} Superior Virtue${fives === 1 ? "" : "s"} at 5`);
    if (o.order === "murnau" && o.benefit) add(1, "the House of Murnau's drawback (p. 137)");
    return { mod, parts };
}

/** What the Curse roll's total brings (p. 202): {conviction, stage, line}. */
export function curseOutcome(total) {
    const t = n(total);
    if (t <= 0) return { conviction: 1, stage: 0, line: "Spared, and the better for it: +1 Conviction." };
    if (t <= 3) return { conviction: 0, stage: 0, line: "Spared: no Curse." };
    if (t <= 6) return { conviction: -2, stage: 0, line: "No Curse, but the soul is shaken: -2 Conviction." };
    const stage = t <= 8 ? 1 : t <= 10 ? 2 : 3;
    return { conviction: 0, stage, line: `A Curse of the ${STAGE_NAME[stage]} stage.` };
}

/**
 * The Curses that may be taken at a stage: the order's category for the first of that stage, then any not held (p. 204).
 * @returns {{list, category, forced}}
 */
export function cursesFor(order, stage, held = []) {
    const have = idsOf(held);
    const cat = categoryOf(order);
    const firstOfStage = !have.some(id => curseById(id).stage === n(stage));
    const pool = CURSES.filter(c => c.stage === n(stage) && !have.includes(c.id));
    const own = cat ? pool.filter(c => c.cat === cat) : [];
    if (firstOfStage && own.length) return { list: own, category: cat, forced: true };
    return { list: pool, category: null, forced: false };
}

/** Cocytus (pp. 203-204): stages at or above permanent Piety plus the Superior Virtues. */
export function cocytus(held, piety, sv = {}) {
    const stages = stagesOf(held);
    const limit = n(piety) + n(sv.faith) + n(sv.wisdom) + n(sv.zeal);
    return { stages, limit, fallen: stages > 0 && stages >= limit };
}
/** In Cocytus, Conviction spent on anything but a Superior Virtue comes out of the bank too (p. 204). */
export const cocytusDrain = (banked, spent) => Math.max(0, n(banked) - Math.max(0, n(spent)));

/** Callous (p. 162): Conviction above Piety; with Lamb of God, at Piety already. */
export function callousWith(held, conviction, piety) {
    return hasCurse(held, "lamb-of-god") ? n(conviction) >= n(piety) : n(conviction) > n(piety);
}

/** What the Curses do to one of the inquisitor's rolls: {dice, diff, parts}. tags: the roll's trait tags. */
export function curseMods(held, tags = []) {
    const t = new Set(tags);
    let dice = 0, diff = 0;
    const parts = [];
    for ( const id of idsOf(held) ) {
        const c = curseById(id);
        for ( const m of c.mods ?? [] ) {
            const hit = m.tags.includes("*") ? t.size > 0 : m.tags.some(x => t.has(x));
            if ( !hit || (m.not ?? []).some(x => t.has(x)) ) continue;
            dice += n(m.dice); diff += n(m.diff);
            parts.push(`${c.name} (a Curse): ${m.note} (${REF} ${pageOf(c)})`);
        }
    }
    return { dice, diff, parts };
}

/* ---------------- The orders' benefits and drawbacks (pp. 129-139) ---------------- */

/** The year the order serves the Inquisition from: the first Council of Faith (1223, p. 71); the Oculi join after 1227. */
export const ORDER_YEAR = { acre: 1223, red: 1223, john: 1223, murnau: 1223, oculi: 1228 };
export const ORDER_BENEFITS = {
    acre: { page: "pp. 129-131", benefit: "Three free dots of Holy Relics from the order's stores.", drawback: "While carrying a relic, Piety is checked as if one higher.", dots: { "holy relics": 3 } },
    red: { page: "p. 133", benefit: "Three free dots of Exposure from forbidden books (the lore may be wrong).", drawback: "While Callous, resisting the Impulse is one harder.", dots: { exposure: 3 } },
    john: { page: "p. 135", benefit: "Visions: a Willpower point and Perception + Empathy (6) to call one.", drawback: "A horrible vision, or a botched call: Courage at 7, or a Willpower point lost (a botch: Willpower and Conviction)." },
    murnau: { page: "p. 137", benefit: "For those not of the cursed blood: three free dots among Allies, Resources and Flock.", drawback: "+1 on every roll for a new Curse." },
    oculi: { page: "p. 139", benefit: "Blackmail: three free dots among Contacts, Influence and Resources.", drawback: "An Enemy rated three (as the Flaw, no points back)." }
};
/** May the order benefit be taken in this year? Before the Inquisition there is no order to give it. */
export function benefitOpen(order, year) {
    const y = Number(year), from = ORDER_YEAR[order];
    if ( !from ) return { ok: false, why: "No order." };
    if ( !Number.isFinite(y) ) return { ok: true, from };
    return y >= from ? { ok: true, from } : { ok: false, from, why: `The ${order === "oculi" ? "Oculi Dei serve the Inquisition only after 1227" : `orders serve the Inquisition only from the first Council of Faith in ${from}`} (${REF} pp. 62, 71). Before then a hunter of this order is a precursor, without the order's benefit.` };
}
/** Free Background dots the benefit gives, by Background name (lower case). */
export const benefitDots = (order, on) => (on ? ORDER_BENEFITS[order]?.dots ?? {} : {});
/** The Knights' drawback: Piety checked one higher while a relic is carried. */
export const pietyFor = (piety, { order, benefit, relic } = {}) => n(piety) + (order === "acre" && benefit && relic ? 1 : 0);
/** The Red Order's drawback: the Impulse one harder while Callous. */
export const impulseDiff = ({ order, benefit, callous } = {}) => 6 + (order === "red" && benefit && callous ? 1 : 0);

/* ---------------- Sins of play (p. 159; Companion p. 73) ---------------- */

/**
 * The sins play can see, at their level on the Hierarchy of Sins against God. kill: a Christian killed (1); lie and
 * wordBroken: lying or breaking one's word (8); theft: WoDX reads it as acting on a sinful impulse (6, B7888); disobey:
 * disobeying a superior (6, Dark Ages: Inquisitor Companion p. 73).
 */
export const PIETY_EVENTS = { kill: 1, killFrenzy: 1, harm: 3, lie: 8, wordBroken: 8, theft: 6, disobey: 6 };
export const pietyEvent = event => (Object.prototype.hasOwnProperty.call(PIETY_EVENTS, event) ? PIETY_EVENTS[event] : null);

/** Is the victim of a killing a Christian, so that it is the first sin? Only one known to keep another faith is not. */
export const christianVictim = faith => !faith || ["western", "orthodox"].includes(String(faith));

/** The Dark Ages hunters before the Inquisition (DA:I pp. 62-69): who the Book 1 hunters are in 1197-1222. */
export const PRECURSORS = {
    crusader: { label: "A crusader knight of Gauthier de Dampiere's company", order: "acre", page: "pp. 62-63" },
    "st-denis": { label: "One of Abbot Gervese le Fevre's hunters at St. Denis (the Red Order)", order: "red", page: "p. 62" },
    murnau: { label: "Of the House of Murnau, with the family's sense for evil", order: "murnau", page: "pp. 67, 69" },
    faithful: { label: "One of the lone Faithful", order: "", page: "p. 62" }
};

/* ---------------- Retreats (Dark Ages: Inquisitor Companion pp. 95-96; Dark Ages: Inquisitor p. 161) ---------------- */

export const COMPANION = "Dark Ages: Inquisitor Companion";
/** A retreat lasts a week to a month (Companion p. 96); the troupe sets its length when it begins. */
export const RETREAT = { min: 7, max: 30, kinds: { cloister: "In cloister", pilgrimage: "On pilgrimage, apart from the cell", alone: "Alone, far from the work of the Inquisition" } };
export const retreatDays = d => Math.min(RETREAT.max, Math.max(RETREAT.min, Math.trunc(n(d)) || RETREAT.min));
/** The most a retreat lets an inquisitor bank: the highest Superior Virtue plus the Virtue over it (Companion p. 96). */
export function retreatCap(sv = {}, v = {}) {
    const of = { faith: "conscience", wisdom: "selfcontrol", zeal: "courage" };
    return Math.max(0, ...Object.entries(of).filter(([k]) => n(sv[k]) > 0).map(([k, vk]) => n(sv[k]) + n(v[vk])));
}
/**
 * How much may be banked now. Off retreat: one point a day (p. 161). On retreat: up to the cap, whatever the day.
 * @returns {{max, why}}
 */
export function bankRoom({ onRetreat = false, cap = 0, banked = 0, today = 0, bankDay = null, bankedToday = 0 } = {}) {
    if (onRetreat) return { max: Math.max(0, n(cap) - n(banked)), why: `On retreat: up to ${n(cap)} banked (the highest Superior Virtue and its Virtue, ${COMPANION} p. 96).` };
    const used = bankDay === today ? n(bankedToday) : 0;
    return { max: Math.max(0, 1 - used), why: "One point a day; more needs a retreat (Dark Ages: Inquisitor p. 161)." };
}
/** Is a retreat on at time t? */
export const onRetreat = (r, t) => !!r && n(t) >= n(r.from) && n(t) < n(r.until);
/**
 * The end of a retreat. One ended before its time while an Endowment was sought is rushed: pride, and a Curse roll
 * (Companion p. 96; WoDX reads "rushed" as ended early, B7895).
 */
export function retreatEnd(r, t, day = DAY) {
    const days = Math.max(0, Math.floor((n(t) - n(r?.from)) / day));
    const rushed = !!r && r.purpose === "endowment" && n(t) < n(r.until);
    return { days, rushed };
}
