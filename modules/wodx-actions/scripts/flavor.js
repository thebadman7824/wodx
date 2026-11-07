/* VtDA20 Actions: flavor lines shown under the result of each action card.
 * The card is sorted into a theme (from its title and text) and an outcome (success, failure, botch),
 * and one line is picked at random. {name} is the acting character, {target} the other party if there is one.
 * A line may start with tags in square brackets that say who {name} must be: kindred, living (mortals, ghouls, Garou...),
 * beast or spirit; flesh = living, kindred or beast; person = living or kindred. Untagged lines fit everyone.
 * Edit freely: add lines to a pool, or empty a pool to silence it. */

export const POOLS = {
    general: {
        success: [
            "The latch lifts without a sound. Somewhere below, a dog turns over in its sleep and doesn't wake.",
            "It goes the way {name} pictured it, which in this valley almost never happens.",
            "A small thing, done cleanly. Nobody will ever know how close it came.",
            "{name}'s hands remember what to do before the mind has finished worrying.",
            "The knot gives, the stone shifts, the way opens. {name} allows one breath of satisfaction.",
            "Patience pays. It usually does, for those with all night.",
            "The candle gutters and steadies, and the work is done.",
            "{name} steps back, and the thing is finished, as neat as a clerk's ledger.",
            "Even the wind seems to hold still for it.",
            "Done, and quietly. The best kind of done."
        ],
        failure: [
            "It doesn't take. {name} will have to try again, or try something else.",
            "Close, and close is worth nothing in Rothenstein.",
            "The moment passes, and {name} is left holding nothing but the effort.",
            "Somewhere a bell rings the hour, as if to say the time for this is gone.",
            "{name}'s fingers are clumsy tonight, and the night has noticed.",
            "Nothing breaks, nothing gives. The world simply declines.",
            "It almost works. Almost.",
            "{name} stops, listens, and starts over with less confidence than before."
        ],
        botch: [
            "Something gives way with a crack that will be heard three houses off.",
            "{name} has made it worse. Considerably worse.",
            "The noise is enormous. Shutters open across the street.",
            "For a moment {name} can only stare at what has happened, and what it will cost.",
            "A slip, a stumble, and a dozen eyes turn to see what made the sound.",
            "Whatever saint watches over this sort of thing has looked away.",
            "It goes wrong all at once, the way the worst things always do.",
            "The valley has a way of punishing the careless, and tonight it is {name}'s turn."
        ]
    },
    social: {
        success: [
            "{target} hesitates, and then nods, as if it had been their own idea all along.",
            "The right words, at the right moment. {target}'s guard comes down a finger's width.",
            "{name} smiles, and {target} smiles back before thinking better of it.",
            "It lands. {target} leans closer to hear the rest.",
            "{target} laughs despite themselves, and the room changes.",
            "A pause, a sigh, and {target} gives way.",
            "{name} has found the soft place in {target}, and presses gently."
        ],
        failure: [
            "The words come out wrong. {target}'s face closes like a shutter, and the moment is gone.",
            "{target} listens politely and believes none of it.",
            "Too much, too soon. {target} takes a step back.",
            "{target}'s eyes drift to the door. {name} has lost them.",
            "A cold little silence follows, the kind that gets remembered.",
            "{target} has heard better offers from beggars, and says so with a look."
        ],
        botch: [
            "{target} goes very still, and {name} realizes too late what has been said.",
            "The insult was not meant, but it was heard, and it will not be forgotten.",
            "{target} sees straight through it, and through {name}, to something underneath.",
            "Every head in the room turns, and none of them are friendly.",
            "{name} has made an enemy tonight, and a patient one."
        ]
    },
    feed: {
        success: [
            "The vessel sighs and goes slack, and the warmth spreads through {name} like wine.",
            "A clean feeding. Two small marks, a lick, and they are gone.",
            "{name} drinks until the Beast settles, and stops, and that is the hard part.",
            "The heartbeat slows against {name}'s lips. Enough. Just enough.",
            "Warm, and sweet, and over too soon. The vessel will wake thinking it was a dream.",
            "For a few minutes the hunger is quiet, and the world is almost bearable.",
            "{name} wipes the corner of a mouth and steps back into the dark, fed."
        ],
        failure: [
            "The street is empty, and stays empty. The hunger does not care.",
            "Every door is barred tonight. Somebody in this town has been talking.",
            "{name} circles the alleys until the bells, and comes home with nothing but the ache.",
            "The vessel startles and bolts. {name} lets them go, and hates it.",
            "Too many eyes, too many lanterns. Not tonight."
        ],
        botch: [
            "The hunger rises up through {name}, and for one heartbeat they forget which of them is the hunter.",
            "Too much. Far too much. The vessel's face has gone the color of tallow.",
            "A scream, and then running feet, and then the watch.",
            "{name} comes back to themselves with blood to the wrist and no memory of the last minute.",
            "Someone saw. Someone always sees."
        ]
    },
    frenzy: {
        success: [
            "The Beast throws itself against the bars, and the bars hold. This time.",
            "{name} grips the table until the wood cracks, and breathes, and stays.",
            "A red tide rises, and {name} stands in it and does not drown.",
            "It passes. {name}'s hands are shaking, but they are still {name}'s hands.",
            "The snarl dies in {name}'s throat before anyone hears it."
        ],
        failure: [
            "The world goes red, and {name} is no longer the one deciding.",
            "Something older than {name} looks out through their eyes, and it is hungry.",
            "The Beast is out, and it does exactly what it wants.",
            "{name} hears a sound like an animal, and only later understands it was their own voice.",
            "Furniture breaks. People run. The Beast does not care which."
        ],
        botch: [
            "There is no {name} anymore, only teeth and need and the dark.",
            "When it is over there will be a great deal to explain, and someone to bury.",
            "The Beast takes everything, and leaves a mark that will not wash out."
        ]
    },
    fear: {
        success: [
            "The flame leaps, and {name} flinches, and holds the line.",
            "Every instinct screams to run. {name} tells every instinct to be quiet.",
            "{name} stares at the fire until it is only fire.",
            "[kindred] Cold sweat that the dead should not be able to sweat, and yet {name} stands.",
            "[living] The heat drives {name} back a step, and no further."
        ],
        failure: [
            "[kindred] Rötschreck. {name} runs, blind, and anything in the way is in the way.",
            "Terror older than words takes {name} by the throat and drags them toward the dark.",
            "[living] {name} breaks and runs, and does not stop until the light is far behind.",
            "{name} is through the door before deciding to move.",
            "[kindred] Nothing matters but getting away from the light."
        ],
        botch: [
            "{name} claws at the walls like a cornered animal, and someone gets in the way.",
            "Pure animal panic. When {name} comes back to themselves, they are somewhere else entirely, and not alone.",
            "The fear will not let go, and it leaves something behind when it finally does."
        ]
    },
    conscience: {
        success: [
            "{name} feels the weight of it, and that feeling is the thing worth keeping.",
            "Somewhere inside, a small light that was guttering burns a little steadier.",
            "[kindred] {name} remembers, for a moment, what it was to be one of them.",
            "[kindred] It hurts, and the hurt is good. The Beast does not feel guilt.",
            "{name} is still someone who minds. That is not nothing.",
            "[living] {name} knows exactly what was done, and will not pretend otherwise."
        ],
        failure: [
            "It gets easier. That is the horror of it, and {name} knows it.",
            "{name} waits for the guilt, and it does not come.",
            "[kindred] A little more of the mortal falls away, like plaster from an old wall.",
            "The next time will cost less. {name} is not sure that is a mercy.",
            "Something {name} used to believe goes quiet, and stays quiet.",
            "[living] {name} tells a story about why it was necessary, and almost believes it."
        ],
        botch: [
            "{name} looks in the water and does not like the shape of what looks back.",
            "Something breaks loose inside, and it will not go back the way it was.",
            "[living] {name} wakes before dawn with the thing still sitting on their chest, and it will be there every morning now.",
            "[kindred] The Beast has learned a new trick tonight, and {name} taught it."
        ]
    },
    torpor: {
        success: [
            "{name} opens their eyes to a world that has moved on without them.",
            "The long dark lets go, finger by finger.",
            "Dust in the mouth, cold in the bones, and then, at last, the hunger. {name} is back.",
            "{name} rises, and the night is very loud after so much silence."
        ],
        failure: [
            "The dark holds on. {name} sleeps on, and dreams of red stone.",
            "Not yet. The Blood is not ready to let {name} go.",
            "Somewhere far away, {name} reaches for waking and finds only more night.",
            "The sleep is deep, and the earth is patient."
        ],
        botch: [
            "{name} sinks deeper, past the dreams, into the place where nothing is.",
            "The dark closes over {name} like water over a stone."
        ]
    },
    blood: {
        success: [
            "The Blood answers, hot and quick, and {name} feels it run to where it is wanted.",
            "[kindred] Vitae stirs in dead veins, and dead flesh remembers how to obey.",
            "{name} spends a little of what was taken, and is stronger for it.",
            "The Blood moves like a familiar servant, without complaint.",
            "[living] The borrowed Blood burns in {name}'s living veins, and the body does as it is told."
        ],
        failure: [
            "The Blood is spent, and nothing comes of it but a deeper hunger.",
            "{name} calls, and the Blood is sluggish and sullen tonight.",
            "[living] {name} reaches for the vitae and finds less of it than hoped. The craving will be worse tomorrow."
        ],
        botch: [
            "The Blood turns on {name}, and it burns going out.",
            "[kindred] Vitae wasted on nothing, and the Beast stirs at the loss.",
            "[living] The stolen Blood sours in {name}, and leaves a sickness behind it."
        ]
    },
    diablerie: {
        success: [
            "{name} drinks past the blood, into the soul, and the soul tastes of centuries.",
            "Something vast and terrible pours into {name}, and {name} holds it.",
            "Memories that are not {name}'s flood in: a face, a field, a scream in a language long dead.",
            "{target} is less, and {name} is more, and the arithmetic of it is unbearable."
        ],
        failure: [
            "{target}'s soul clings on, stubborn as a root in winter ground.",
            "{name} pulls, and something pulls back.",
            "Not yet. The struggle goes on in the dark between them."
        ],
        botch: [
            "The grip slips, and something that was almost {name}'s slides away into the night.",
            "{name} reels back, choking on a soul that would not be swallowed."
        ]
    },
    harm: {
        success: [
            "{name} grits their teeth through it. It could have been worse.",
            "[kindred] Pain, and then the long cold patience of the dead.",
            "{name} takes the hurt and keeps standing.",
            "[living] {name} gasps, presses a hand to it, and keeps going."
        ],
        failure: [
            "It hurts, and the hurt goes deep.",
            "[kindred] {name}'s flesh blisters and splits, and the Beast howls at the wrongness of it.",
            "The body remembers, even if {name} would rather not.",
            "[living] Warm blood runs, and {name} goes gray around the mouth."
        ],
        botch: [
            "The pain is total, and for a while there is nothing else.",
            "{name} will carry this one for many nights."
        ]
    }
};

const rand = a => a[Math.floor(Math.random() * a.length)];
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** sort a finished card into a theme from its title and body */
export function theme(title, body) {
    const t = String(title).toLowerCase();
    const b = String(body).toLowerCase();
    if (/r(ö|o)tschreck|faces the flame|sunlight|\bfire\b/.test(t)) return /takes damage|sunlight|fire|falling/.test(t) && !/check|faces/.test(t) ? "harm" : "fear";
    if (/frenzy|instinct|regains control/.test(t)) return "frenzy";
    if (/diablerie|drinks cainite blood/.test(t)) return "diablerie";
    if (/feeds|hunts/.test(t)) return "feed";
    if (/torpor|sleeps on|stirs by day|cannot rise/.test(t)) return "torpor";
    if (/spends blood/.test(t)) return "blood";
    if (/takes damage|falling/.test(t)) return "harm";
    if (/humanity|conscience|conviction|degeneration|road|virtue|blood oath|bond/.test(t) || /degeneration/.test(b)) return "conscience";
    if (/seduction|persua|intimidat|fast-talk|subterfuge|etiquette|leadership|empathy|haggl|seduc|convinc|charm|command|perform/.test(t)) return "social";
    return "general";
}

/** read the outcome from the card body */
export function outcome(themeKey, body) {
    const b = String(body);
    if (/\bbotch/i.test(b)) return "botch";
    const bad = /class="vta-(res|big) bad"/.test(b) || /class="vta-res">Failure</.test(b) || /vta-warn">Failure/.test(b);
    if (themeKey === "frenzy" || themeKey === "fear") {
        if (/Frenzy!|Rötschreck!|Uncontrolled frenzy|flees/.test(b)) return "failure";
        if (bad) return "failure";
        return /success|resist|holds|controls|regains/i.test(b) ? "success" : null;
    }
    if (bad) return "failure";
    const m = b.match(/(\d+)\s*(?:\/\s*\d+\s*)?success/i);
    if (m) return +m[1] > 0 ? "success" : "failure";
    if (/class="vta-res good"/.test(b)) return "success";
    if (themeKey === "harm" && /health level|aggravated|lethal|bashing/i.test(b)) return "failure";
    return null;
}

const GROUPS = { living: ["living"], kindred: ["kindred"], beast: ["beast"], spirit: ["spirit"],
    flesh: ["living", "kindred", "beast"], person: ["living", "kindred"] };

/** profile key from profiles.js -> actor group */
export function actorGroup(profileKey) {
    if (!profileKey) return null;
    if (profileKey === "kindred") return "kindred";
    if (profileKey === "beast") return "beast";
    if (["wraith", "spirit", "demon"].includes(profileKey)) return "spirit";
    return "living";
}

function parse(raw) {
    const m = /^\[([^\]]*)\]\s*/.exec(raw);
    return m ? { tags: m[1].trim().split(/\s+/).filter(Boolean), text: raw.slice(m[0].length) } : { tags: [], text: raw };
}

export function fits(raw, group) {
    const tags = parse(raw).tags.filter(t => GROUPS[t]);
    return !tags.length || (!!group && tags.some(t => GROUPS[t].includes(group)));
}

export function line(themeKey, outcomeKey, names = {}, { group = null } = {}) {
    const pool = POOLS[themeKey]?.[outcomeKey] ?? POOLS.general[outcomeKey] ?? [];
    let fit = pool.filter(l => fits(l, group));
    if (!fit.length) fit = (POOLS.general[outcomeKey] ?? []).filter(l => fits(l, group));
    if (!fit.length) return "";
    let t = parse(rand(fit)).text;
    for (const [k, v] of Object.entries(names)) t = t.replaceAll(`{${k}}`, esc(v));
    const fallback = { social: "the listener", diablerie: "the victim" }[themeKey] ?? "the other";
    t = t.replace(/\{target\}/g, fallback).replace(/\{\w+\}/g, "someone");
    return t.charAt(0).toUpperCase() + t.slice(1);
}

export function html(text) {
    return text ? `<div class="vta-flavor">${text}</div>` : "";
}
