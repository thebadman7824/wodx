/**
 * WoDX Actions — Changeling 20th, the pure rules (Phase 6h, later eras). No Foundry here: the harness tests them.
 * Mechanics from Changeling: The Dreaming 20th Anniversary Edition, in WoDX's words, with printed page numbers.
 */

export const REF = "Changeling 20th";
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** The eighteen Arts (pp. 197–232), with how each shows itself. */
export const ARTS = {
    autumn: { label: "Autumn", gloss: "decay, withering, doom", page: 197 }, chicanery: { label: "Chicanery", gloss: "illusion and trickery of the senses", page: 200 },
    chronos: { label: "Chronos", gloss: "time", page: 201 }, contract: { label: "Contract", gloss: "bargains, wards and obligations", page: 203 },
    dragonsire: { label: "Dragon's Ire", gloss: "battle fury and strength", page: 205 }, legerdemain: { label: "Legerdemain", gloss: "sleight of hand, moving and making things", page: 207 },
    metamorphosis: { label: "Metamorphosis", gloss: "changing shape", page: 209 }, naming: { label: "Naming", gloss: "true names and what they bind", page: 211 },
    oneiromancy: { label: "Oneiromancy", gloss: "dreams", page: 213 }, primal: { label: "Primal", gloss: "the elements and growing things", page: 215 },
    pyretics: { label: "Pyretics", gloss: "faerie fire", page: 217 }, skycraft: { label: "Skycraft", gloss: "wind and weather", page: 219 },
    soothsay: { label: "Soothsay", gloss: "fate and divination", page: 221 }, sovereign: { label: "Sovereign", gloss: "command and authority", page: 223 },
    spring: { label: "Spring", gloss: "growth, renewal, passion", page: 225 }, summer: { label: "Summer", gloss: "strength, joy, full life", page: 227 },
    wayfare: { label: "Wayfare", gloss: "movement and travel", page: 228 }, winter: { label: "Winter", gloss: "cold, stillness, endings", page: 230 }
};
/** The Realms (pp. 232–236): four primary, two modifiers; each level names who or what can be reached. */
export const REALMS = {
    actor: { label: "Actor", primary: true, levels: ["a true friend", "someone met and named", "a familiar face", "a dire enemy", "a complete stranger"], page: 233 },
    fae: { label: "Fae", primary: true, levels: ["a commoner", "a noble", "chimera", "the stranger fae, spirits and ghosts", "Glamour itself: cantrips, Treasures, freeholds"], page: 233 },
    nature: { label: "Nature", primary: true, levels: ["a raw element", "raw organic material", "living plants", "living animals", "natural phenomena"], page: 234 },
    prop: { label: "Prop", primary: true, levels: ["worn garb", "a crafted tool", "a mechanical device", "a complex machine", "an arcane artifact"], page: 235, note: "never cold iron" },
    scene: { label: "Scene", primary: false, levels: ["a chamber", "a cottage", "a lonely lane", "a glen", "a castle"], page: 235 },
    time: { label: "Time", primary: false, levels: ["three-fold duration", "a delay up to a year and a day", "a trigger", "a second echo", "a seasonal renewal"], page: 235 }
};
export const PRIMARY = ["actor", "fae", "nature", "prop"];

/**
 * A cantrip (pp. 193–196, 275). used: [{realm, level}] — the Realm levels the cantrip needs; known: {realm: rating}.
 * Pool: the Art's rating + the lowest rating among the primary Realms used. +1 for Scene, +1 for Time. Cost: 1 Glamour if Wyrd (none while
 * the Wyrd is invoked), +1 per Realm level not known. Nightmare dice replace dice equal to Nightmare; volunteering three
 * more (with three normal dice left) gives −1. Base 8; floor 3 here (the book sets none; the dice engine caps at 10).
 */
export function cantripPlan({ art = 0, artLevel = 1, used = [], known = {}, nightmare = 0, wyrd = false, wyrdInvoked = false },
    { targetBanality = 0, placeBanality = 0, higherTitle = false, freehold = false, enchanted = false, affinity = false, bunk = 0, volunteer = false, mod = 0 } = {}) {
    if (n(art) < 1) return { ok: false, why: "choose an Art the character knows" };
    if (n(artLevel) > n(art)) return { ok: false, why: `that power needs the Art at ${artLevel}` };
    const prim = used.filter(u => REALMS[u.realm]?.primary);
    if (!prim.length) return { ok: false, why: "a cantrip needs a primary Realm (Actor, Fae, Nature or Prop); Scene and Time only modify" };
    const notes = [];
    // The book's worked examples (p. 236) roll the Art's rating and the Realm's rating, not the levels the cantrip uses
    const lowest = Math.min(...prim.map(u => n(known[u.realm])));
    const dice = n(art) + lowest;
    let diff = 8 + n(mod);
    if (n(mod)) notes.push(`${n(mod) > 0 ? "+" : "−"}${Math.abs(n(mod))} the Storyteller's modifier`);
    for (const r of ["scene", "time"]) if (used.some(u => u.realm === r)) { diff += 1; notes.push(`+1 ${REALMS[r].label}`); }
    if (n(targetBanality) >= 8) { diff += 1; notes.push("+1 the target's Banality"); }
    if (n(placeBanality) >= 8) { diff += 1; notes.push("+1 the place's Banality"); }
    if (higherTitle) { diff += 1; notes.push("+1 a changeling of higher Title"); }
    if (freehold) { diff -= 1; notes.push("−1 in a freehold"); }
    if (enchanted) { diff -= 1; notes.push("−1 an enchanted mortal or kinain"); }
    if (affinity) { diff -= 1; notes.push("−1 the kith's affinity Realm"); }
    const b = clamp(n(bunk), 0, 5);
    if (b) { diff -= b; notes.push(`−${b} the bunk`); }
    let nm = Math.min(dice, clamp(n(nightmare), 0, 10));
    if (volunteer && dice - nm >= 3) { nm += 3; diff -= 1; notes.push("−1 for three more Nightmare dice"); }
    const cheated = used.filter(u => n(known[u.realm]) < n(u.level)).length;
    const cost = (wyrd && !wyrdInvoked ? 1 : 0) + cheated;
    if (wyrd) notes.push(wyrdInvoked ? "Wyrd (free while the Wyrd is invoked)" : "Wyrd: 1 Glamour");
    if (cheated) notes.push(`${cheated} Realm${cheated === 1 ? "" : "s"} not known: +${cheated} Glamour`);
    return { ok: true, dice, nightmareDice: nm, difficulty: clamp(diff, 3, 10), cost, notes };
}

/** Nightmare from a roll (p. 275): +1 per 10 on a Nightmare die, +1 on a botched Glamour or cantrip roll. */
export function nightmareFrom(faces = [], nightmareDice = 0, botch = false) {
    const tens = faces.slice(0, n(nightmareDice)).filter(f => f === 10).length;
    return tens + (botch ? 1 : 0);
}
/** Add Nightmare (p. 275): at 10 it clears, an Imbalance is marked, and a Glamour point returns. */
export function addNightmare({ nightmare = 0, imbalances = 0, willpower = 0 } = {}, k = 0) {
    let nm = n(nightmare) + n(k), imb = n(imbalances), glamourBack = 0;
    if (nm >= 10) { nm = 0; imb += 1; glamourBack = 1; }
    return { nightmare: clamp(nm, 0, 10), imbalances: imb, glamourBack, bedlam: n(willpower) > 0 && imb >= n(willpower) };
}

/** Unleashing (pp. 196–197): 2 Glamour, +1 Nightmare first; Glamour + Nightmare at 7. */
export function unleashPlan({ glamour = 0, nightmare = 0, glamourPool = 0 } = {}) {
    if (n(glamourPool) < 2) return { ok: false, why: "Unleashing costs 2 Glamour" };
    const nm = clamp(n(nightmare) + 1, 0, 10);
    return { ok: true, cost: 2, nightmareAfter: nm, dice: n(glamour) + nm, difficulty: 7 };
}
export function unleashOutcome(r, art) {
    if (r?.botch) return { result: "havoc", imbalance: 1, trigger: true, closed: "Glamour and Arts for the scene" };
    if (!n(r?.successes)) return { result: "failed", trigger: true, closed: "that Art for the scene" };
    if (n(r.successes) <= n(art)) return { result: "controlled", wyrd: "Glamour turns (Willpower for the scene)" };
    return { result: "wild", nightmare: 1, wyrd: "the scene" };
}

/** A Banality trigger (pp. 174, 269): Glamour at 8 (or the Storyteller's); a failure +1 point, a botch +1 per 1. */
export function triggerOutcome(r) { if (r?.botch) return Math.max(1, n(r.ones)); return n(r?.successes) > 0 ? 0 : 1; }
/** Add Banality points (pp. 174, 258): above 10 the pool empties and the rating rises by one dot, never more. */
export function addBanality({ rating = 0, points = 0 } = {}, k = 0) {
    const p = n(points) + n(k);
    if (p > 10) return { rating: Math.min(10, n(rating) + 1), points: 0, newDot: true };
    return { rating: n(rating), points: Math.max(0, p), newDot: false };
}

/** Invoking the Wyrd (p. 259): 1 Glamour, 1 Willpower; Glamour against the higher Banality. */
export const wyrdDifficulty = (place, own) => clamp(Math.max(n(place), n(own)), 3, 10);
export const WYRD_EFFECTS = ["a Glamour point rerolls a roll once (keep either)", "10s are rerolled and add", "voile and chimera are solid to all", "lethal damage soaks", "cantrips are Wyrd and cost no Glamour"];

/** The Mists for mortals by Banality (p. 270): how long until it fades, and what is kept. */
export const MISTS = [["one minute", "perfect recall"], ["one hour", "clarity"], ["six hours", "partial memory"], ["twelve hours", "disorientation"], ["a day", "uncertain memory"],
    ["three days", "hazy memory"], ["a week", "vivid flashbacks"], ["two weeks", "dreamlike memory"], ["a month", "a distant dream"], ["four months", "denial"], [null, "a complete blank"]];
export const mistsFor = banality => { const [time, effect] = MISTS[clamp(n(banality), 0, 10)]; return { time, effect }; };
/** A changeling's own Mists: once Banality points pass the Glamour rating (pp. 270–271); the Storyteller picks. */
export const OWN_MISTS = ["lapses", "tuned out (+1 Alertness)", "confusion (Intelligence + Enigmas, 7, for complex tasks)", "detachment", "blackouts", "memory gaps", "amnesia"];
export const ownMists = (points, glamour) => n(points) > n(glamour);

/** Bedlam Thresholds (pp. 294–295): imposed for as many scenes as there are Imbalances when an Imbalanced Willpower is spent. */
export const BEDLAM = {
    whispers: "Whispers and visions: +1 to Perception difficulties per Imbalance",
    memories: "Memories from a dream: +1 to Intelligence difficulties per Imbalance",
    air: "Thickened air: +1 to Dexterity difficulties per Imbalance",
    unstable: "Unstable dreams: nearby chimera turn hostile and warped",
    leash: "Remove the leash: only Unleashing, no cantrips",
    self: "To thine own self: the Wyrd at once, +2 Nightmare, the kith's nature exaggerated",
    drowning: "Drowning in Glamour: all Glamour back; a well for others; +1 Nightmare per Glamour spent"
};
/** Spending Willpower point number `from` (the temporary pool before spending): Imbalanced when it is one of the rightmost boxes. */
export const spendIsImbalanced = ({ temp = 0, perm = 0, imbalances = 0 } = {}) => n(imbalances) > 0 && n(temp) > n(perm) - n(imbalances);

/** Epiphany (pp. 259–264). */
export const MUSING_TIME = { 1: "a month", 2: "two weeks", 3: "a week", 4: "a day", 5: "a few hours" };
export const musingTime = s => n(s) <= 0 ? null : MUSING_TIME[Math.min(5, n(s))];
export function epiphany(kind, r, { threshold = false, banality = 0, glamour = 0, invested = 0 } = {}) {
    const s = r?.botch ? 0 : n(r?.successes);
    switch (kind) {
        case "reverie": return r?.botch ? { glamour: 0, note: "the Dreamer rejects it and falls into a creative block" } : s ? { glamour: s, dot: threshold && s >= 5 } : { glamour: 0, note: "another week of study first" };
        case "rapture": return r?.botch ? { glamour: 0, banality: 1, note: "a shattering failure; a week before trying again" } : { glamour: s, dot: s >= 5, refill: s >= 5 };
        case "ravaging": return r?.botch ? { glamour: 0, banalityDot: 1, trigger: true } : s ? { glamour: s, trigger: true } : { glamour: 0, banality: 1, trigger: true };
        case "revelry": return { refill: true, note: "once a story" };
        case "rhapsody": return r?.botch ? { glamour: 0, artistBanalityDots: Math.max(1, n(r.ones)), trigger: true } : s ? { masterpiece: s * 2, trigger: true, note: "released only when the work is destroyed, shared among the changelings present" } : { glamour: 0, blockedMonths: n(invested), trigger: true };
        default: return { glamour: 0 };
    }
}
export const raptureDifficulty = (banality, glamour) => clamp(n(banality) - n(glamour) + 6, 3, 10);
/** Sanctuary (p. 259): a night in a freehold gives its rating in Glamour, shared, at least 1 each. */
export const sanctuary = (rating, sleepers = 1) => Math.max(1, Math.floor(n(rating) / Math.max(1, n(sleepers))));

/** Cold iron (pp. 290–291): aggravated to both bodies, and a Glamour point per level. */
export const COLD_IRON = { chimerical: true, physical: true, type: "aggravated", glamourPerLevel: 1, trigger: "wielding cold iron is a Banality trigger" };

/** Seemings (pp. 85–87, 144–145, 174): every changeling begins with Willpower 4, Glamour 4 and Banality 3; the seeming
 * adds to one Temper and brings its own trigger and immunity. Banality 10 is Undone. */
export const BASE_TEMPERS = { willpower: 4, glamour: 4, banality: 3 };
export const SEEMINGS = {
    childling: { label: "Childling", bonus: { glamour: 1 }, trigger: "denying a new idea", immunity: "failing to overcome Banality does not trigger them" },
    wilder: { label: "Wilder", bonus: { choice: ["glamour", "willpower"] }, trigger: "refusing a chance of adventure", immunity: "chimerical killing in the service of an escapade" },
    grump: { label: "Grump", bonus: { willpower: 1 }, trigger: "failing to provide for someone in their care", immunity: "time near high Banality" }
};
export function startingTempers(seeming, pick = "glamour") {
    const t = { ...BASE_TEMPERS }, b = SEEMINGS[seeming]?.bonus ?? {};
    if (b.glamour) t.glamour += b.glamour;
    if (b.willpower) t.willpower += b.willpower;
    if (b.choice) t[b.choice.includes(pick) ? pick : b.choice[0]] += 1;
    return t;
}
export const undone = banality => n(banality) >= 10;
