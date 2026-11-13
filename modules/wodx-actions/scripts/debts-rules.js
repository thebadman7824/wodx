/**
 * WoDX Actions (B3560, B3561): debts and oaths. The pure parts, so the harness can test them.
 *
 *   The Blood Hunt   a Prince (or the Eldest of a domain, a Sabbat priest, a baron) calls the hunt on a Kindred who
 *                    broke the Traditions or a life boon. V20 p. 24 (the Sixth Tradition, the Lextalionis), p. 28
 *                    (a Prince may pardon diablerie on the outcast), p. 295 (the sect's own limits on it), p. 493 (the
 *                    Blood Hunted Flaw), p. 510 (the Sabbat's Wild Hunt). V20 Dark Ages p. 37 (Lextalionis: the
 *                    Traditions as the Book of Nod gives them). Each age and sect has its form; the bounty, the
 *                    Status changes and how long the rumour runs are house figures (docs/PENDING-REVIEW.md).
 *   Broken oaths     the penalty the oath names. Changeling: the Dreaming C20 pp. 264-267 (each sample oath's own
 *                    cost), p. 204 (Done Deal: automatic botches, or a bane of a place or a thing), p. 188 (willing
 *                    breakers become oathbreakers), p. 174 (breaking an oath is a Banality trigger for every seeming).
 *                    Dark Ages: Fae pp. 109-110: the oath's fifth part names its own punishment; Iron Oaths punish
 *                    lightly; oaths among fae bind only with the penalty the swearer agreed to.
 */

const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

/* ------------------------------------------------------------------ */
/*  The Blood Hunt                                                     */
/* ------------------------------------------------------------------ */

/** The form a hunt takes, by sect and year. `from`: the year the form starts (the camarilla event in WoDX's dated events). */
export const HUNT_FORMS = {
    lord: { label: "the lord's hunt", caller: "the lord of the domain or its Eldest", page: "V20 Dark Ages p. 37 (the Lextalionis)",
        note: "Before the sects, a lord calls the hunt under the Traditions on any Cainite of the domain who defies them." },
    camarilla: { label: "the Blood Hunt", caller: "the Prince", page: "V20 pp. 24, 28", from: 1435,
        note: "Called by the Prince. Every Kindred of the city may hunt; the Prince may pardon diablerie on the outcast." },
    sabbat: { label: "the Wild Hunt", caller: "a priest or bishop", page: "V20 p. 510", from: 1493,
        note: "Called on a member who betrayed the Sword's secrets: the traitor and anyone who learned the secret are destroyed." },
    anarch: { label: "the barons' hunt", caller: "the baron, with the gang's word", page: "V20 p. 24 (the Traditions the Anarchs still keep)", from: 1493,
        note: "A barony argues before it hunts; the call needs the gangs behind it or it fails." },
    independent: { label: "a hunt", caller: "whoever rules here", page: "V20 p. 24",
        note: "No sect holds the city: the hunt is only as strong as the one who calls it." }
};

/** The form of a hunt in a year for a sect ("camarilla", "sabbat", "anarch", "independent", or "" for none). */
export function huntFormFor(year, sect = "", { camarillaFrom = 1435 } = {}) {
    const y = n(year), s = String(sect || "").toLowerCase();
    if (y && y < camarillaFrom) return "lord";
    if (s === "sabbat" || s === "anarch") return y && y < HUNT_FORMS[s].from ? "lord" : s;
    if (s === "camarilla") return "camarilla";
    return y ? "independent" : "lord";
}

/** What a hunt can be called for. */
export const HUNT_GROUNDS = {
    lifeBoon: "A life boon left unpaid",
    masquerade: "Breaking the Masquerade",
    domain: "Hunting or feeding in another's domain without leave",
    progeny: "Siring without leave",
    destruction: "Destroying another Kindred",
    diablerie: "Diablerie",
    treason: "Treason against the court or the sect",
    other: "Another crime the caller names"
};

/** A rumour of the hunt by age (house wording), with a hint of how it travels. */
export function huntRumour(form, targetName, callerName, year) {
    const f = HUNT_FORMS[form] ?? HUNT_FORMS.independent;
    const who = targetName || "someone";
    const by = callerName ? ` by ${callerName}` : "";
    const how = n(year) >= 1990 ? "on the phones and the message boards the Kindred watch" : n(year) >= 1850 ? "by courier and by word in the Elysium" : "from mouth to mouth in the halls of the court";
    return `${f.label[0].toUpperCase()}${f.label.slice(1)} is called on ${who}${by}. Word goes ${how}.`;
}

/**
 * The plan of a hunt. Status: the target loses all Status in the sect while hunted (V20 p. 493: no one will be seen
 * with them); the caller gains none. Whoever brings the target in gains a dot of Status (house). Diablerie on the
 * target is pardoned only where the form allows it and the caller says so (V20 p. 28; p. 295 forbids it to
 * hunters otherwise).
 */
export function huntPlan({ target = "", caller = "", form = "lord", ground = "other", bounty = "", pardon = false, year = 0, status = 0, at = 0 } = {}) {
    const f = HUNT_FORMS[form] ? form : "independent";
    return {
        form: f, label: HUNT_FORMS[f].label, caller, target, ground: HUNT_GROUNDS[ground] ? ground : "other",
        groundText: HUNT_GROUNDS[ground] ?? HUNT_GROUNDS.other, bounty: String(bounty || "").slice(0, 200),
        pardon: !!pardon && f !== "sabbat", status: { before: Math.max(0, n(status)), during: 0, reward: 1 },
        rumour: huntRumour(f, target, caller, year), at: n(at), active: true, page: HUNT_FORMS[f].page
    };
}

/** How a hunt ends: "dead" (the target met Final Death) or "lifted" (the caller lifts it). Status comes back only when lifted. */
export function huntEnd(hunt = {}, how = "lifted") {
    if (!hunt?.active) return null;
    const dead = how === "dead";
    return { ...hunt, active: false, ended: dead ? "dead" : "lifted", restoreStatus: dead ? null : n(hunt.status?.before) };
}

/** The attitude every hunting NPC takes toward the target: Hunted (-3), the step WoDX NPC hunts at. */
export const HUNTED_STEP = -3;

/* ------------------------------------------------------------------ */
/*  Broken oaths                                                       */
/* ------------------------------------------------------------------ */

/**
 * The Changeling sample oaths (C20 pp. 264-267) and what breaking each costs. Each change names a trait and how much:
 * willpower and glamour are temporary points, banality is points, permWillpower a dot. `all`: every party pays.
 */
export const C20_OATHS = {
    clasped: { label: "Oath of Clasped Hands", page: 265, all: true, changes: { willpower: -2 }, sign: "" },
    fealty: { label: "Oath of Fealty", page: 265, changes: { willpower: -3 }, sign: "In the worst cases the Dreaming strikes the breaker blind for a year and a day." },
    escheat: { label: "Oath of Escheat", page: 265, changes: { banality: 1 }, sign: "The chimerical coin leaves the vassal's hand." },
    burden: { label: "Oath of the Accepted Burden", page: 266, all: true, changes: { willpower: -2 }, sign: "" },
    guardianship: { label: "Oath of Guardianship", page: 266, changes: {}, sign: "For a hundred years the breaker may not rest in one bed two nights running." },
    trueHearts: { label: "Oath of True Hearts", page: 266, all: true, changes: { banality: 1 }, sign: "The songbird falls silent and shows itself to all, on the breaker's shoulder." },
    longRoadFailed: { label: "Oath of the Long Road (the quest failed)", page: 266, changes: { glamour: -3, willpower: -3 }, sign: "" },
    longRoadAbandoned: { label: "Oath of the Long Road (the quest abandoned)", page: 266, changes: { glamourAll: true, permWillpower: -1, banality: 2 }, sign: "" },
    crossedBlades: { label: "Oath of Crossed Blades", page: 267, changes: { permWillpower: -1 }, sign: "Two rapier slashes open on the breaker's face and mark them as an oathbreaker." },
    doneDeal: { label: "A contract sealed with Done Deal", page: 204, changes: {}, sign: "" },
    custom: { label: "An oath of the troupe's own wording", page: 188, changes: {}, sign: "" }
};

/** Breaking any oath is a Banality trigger (C20 p. 174); a willing breaker who lives becomes an oathbreaker (p. 188). */
export const OATHBREAKER = { trigger: "C20 p. 174", title: "oathbreaker (foresworn)", page: 188 };

/**
 * The backlash of a broken changeling oath. oath: {kind, terms, penalty, successes (Done Deal), bane: "place"|"thing"|"",
 * baneName, parties: [names], breaker}. willing: broken knowingly (an accident can be atoned for, p. 188).
 * Returns {label, page, breaker: {changes}, others: {changes}, lines: [text], trigger: true}.
 */
export function c20Backlash(oath = {}, { willing = true } = {}) {
    const O = C20_OATHS[oath.kind] ?? C20_OATHS.custom;
    const lines = [];
    const changes = { ...O.changes };
    if (oath.kind === "doneDeal") {
        const s = Math.max(1, n(oath.successes));
        if (oath.bane === "place") lines.push(`${oath.baneName || "The place the deal was bound to"} becomes the breaker's bane for ${s} scene${s > 1 ? "s" : ""} spent there: 1s, 2s and 3s take away successes and can botch.`);
        else if (oath.bane === "thing") lines.push(`${oath.baneName || "The thing the deal was bound to"} becomes the breaker's bane: their own rolls with it suffer as on cursed ground, and anyone using it against them gains ${s} dice.`);
        else lines.push(`${s} automatic botch${s > 1 ? "es" : ""} on the breaker's rolls, at the Storyteller's choosing of the moment.`);
    }
    if (O.sign) lines.push(O.sign);
    if (oath.penalty) lines.push(`The oath's own words: ${oath.penalty}`);
    lines.push(willing ? "Broken knowingly: if the breaker lives, they are an oathbreaker; an Oath of Atonement may ease it if those wronged agree." : "Broken by accident: the breaker may atone by setting right what was done.");
    lines.push("Breaking an oath is a Banality trigger: roll Glamour (8) against it.");
    return { label: O.label, page: `C20 p. ${O.page}`, breaker: { changes }, others: { changes: O.all ? { ...O.changes } : {} }, lines, trigger: true };
}

/**
 * The backlash of a broken Dark Ages fae oath (DA:Fae pp. 109-110). oath: {kind: iron|stone|gold, rating, terms, penalty,
 * among: "human"|"fae"}. The oath's own punishment applies; an oath among fae binds magically only if its penalty was
 * agreed. The oath stops counting toward the Oaths Background.
 */
export function daBacklash(oath = {}) {
    const kind = ["iron", "stone", "gold"].includes(oath.kind) ? oath.kind : "iron";
    const lines = [];
    if (oath.among === "fae" && !oath.penalty) lines.push("An oath among fae with no penalty agreed: no magic follows, only the shame of it at court.");
    else lines.push(oath.penalty ? `The punishment the oath names: ${oath.penalty}` : "The oath names no punishment: the Storyteller sets one that follows its logic.");
    if (kind === "iron") lines.push("An Iron Oath punishes lightly, as its rating is low.");
    if (kind === "gold") lines.push("A Gold Oath binds a whole people: the punishment falls on the bloodline of the human side too.");
    lines.push(`The oath is broken: its ${n(oath.rating)} dot${n(oath.rating) === 1 ? "" : "s"} no longer count against Echoes.`);
    return { label: `${kind[0].toUpperCase()}${kind.slice(1)} Oath ${n(oath.rating)}`, page: "Dark Ages: Fae pp. 109-110", breaker: { changes: {} }, others: { changes: {} }, lines, trigger: false };
}

/**
 * Apply a set of changes to a changeling's tempers. t: {willpower: {temp, perm}, glamour: {temp, perm}, banality: {temp, perm}}.
 * Returns the new values (never below 0, temporary never above permanent for Willpower and Glamour).
 */
export function applyOathChanges(t = {}, changes = {}) {
    const w = { temp: n(t.willpower?.temp), perm: n(t.willpower?.perm) };
    const g = { temp: n(t.glamour?.temp), perm: n(t.glamour?.perm) };
    const b = { temp: n(t.banality?.temp), perm: n(t.banality?.perm) };
    if (changes.permWillpower) { w.perm = Math.max(0, w.perm + n(changes.permWillpower)); w.temp = Math.min(w.temp, w.perm); }
    if (changes.willpower) w.temp = Math.max(0, Math.min(w.perm, w.temp + n(changes.willpower)));
    if (changes.glamourAll) g.temp = 0;
    if (changes.glamour) g.temp = Math.max(0, Math.min(g.perm, g.temp + n(changes.glamour)));
    if (changes.banality) b.temp = Math.max(0, b.temp + n(changes.banality));
    return { willpower: w, glamour: g, banality: b };
}

/** A line for the card: "Willpower −2, Banality +1". */
export function changesText(changes = {}) {
    const out = [];
    if (changes.permWillpower) out.push(`a dot of Willpower (${changes.permWillpower})`);
    if (changes.willpower) out.push(`Willpower ${changes.willpower}`);
    if (changes.glamourAll) out.push("all temporary Glamour");
    if (changes.glamour) out.push(`Glamour ${changes.glamour}`);
    if (changes.banality) out.push(`Banality +${changes.banality}`);
    return out.join(", ").replace(/-(\d)/g, "−$1");
}
