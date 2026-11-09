/* WoDX Actions: flavor lines shown under the result of each action card.
 * The card is sorted into a theme (from its title and text) and an outcome (success, failure, botch),
 * and one line is picked at random. {name} is the acting character, {target} the other party if there is one.
 * A line may start with tags in square brackets that say who {name} must be: kindred, living (mortals, ghouls, Garou...),
 * beast or spirit; flesh = living, kindred or beast; person = living or kindred. Untagged lines fit everyone.
 * Edit freely: add lines to a pool, or empty a pool to silence it. */
import { CHECKS } from "./checks-rules.js";
const CHECK_BY_TITLE = new Map(CHECKS.map(c => [c.label.toLowerCase().split(" (")[0].trim(), c]));

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
            "Done, and nobody heard a thing."
        ],
        failure: [
            "It doesn't take. {name} will have to try again, or try something else.",
            "Close, and close is worth nothing in Rothenstein.",
            "The moment passes, and {name} is left holding nothing but the effort.",
            "Somewhere a bell rings the hour, as if to say the time for this is gone.",
            "{name}'s fingers are clumsy tonight, and the night has noticed.",
            "Nothing breaks and nothing gives. It stays as it was.",
            "It nearly works, and then it does not.",
            "{name} stops, listens, and starts over with less confidence than before."
        ],
        botch: [
            "Something gives way with a crack that will be heard three houses off.",
            "{name} has made it a great deal worse.",
            "The noise is enormous. Shutters open across the street.",
            "For a moment {name} can only stare at what has happened, and what it will cost.",
            "A slip, a stumble, and a dozen eyes turn to see what made the sound.",
            "Whatever saint watches over this sort of thing has looked away.",
            "It all goes wrong at once.",
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
            "The heartbeat slows against {name}'s lips, and {name} stops in time.",
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
            "{name} has taken too much. The vessel's face has gone the color of tallow.",
            "A scream, and then running feet, and then the watch.",
            "{name} comes back to themselves with blood to the wrist and no memory of the last minute.",
            "Someone saw, and someone will talk."
        ]
    },
    frenzy: {
        success: [
            "The Beast throws itself against the bars, and the bars hold, for now.",
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
            "{name} feels the weight of it, and is glad still to feel it.",
            "Somewhere inside, a small light that was guttering burns a little steadier.",
            "[kindred] {name} remembers, for a moment, what it was to be one of them.",
            "[kindred] It hurts, and the hurt is good. The Beast does not feel guilt.",
            "{name} still minds what was done.",
            "[living] {name} knows exactly what was done, and will not pretend otherwise."
        ],
        failure: [
            "It gets easier each time, and {name} knows it.",
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
            "The Blood is not ready to let {name} go.",
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
            "{target} grows less with every swallow, and {name} grows more."
        ],
        failure: [
            "{target}'s soul clings on, stubborn as a root in winter ground.",
            "{name} pulls, and something pulls back.",
            "The struggle goes on in the dark between them."
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

/* Common checks: lines for the checks players roll most, then one pool per group of checks. A check card's title is
 * the check's name ("Notice something"), so the theme is read from that. */
export const CHECK_POOLS = {
    notice: {
        success: ["{name} catches it: a scrape of boot on stone, a shape where no shape should be.", "There. {name} sees what the others walked past.",
            "A smell under the woodsmoke, wrong for this street. {name} marks it.", "{name}'s eyes find the one thing out of place."],
        failure: ["Nothing stands out. If something is there, it is better at hiding than {name} is at looking.", "The street looks as it always does. That may be the problem.",
            "{name} sees shadows, and only shadows."],
        botch: ["{name} is sure of what was there, and is wrong about it.", "{name} stares hard at the wrong corner while the real thing passes behind."]
    },
    react: {
        success: ["{name} moves before thinking, and it is the right move.", "A hand comes up in time.", "{name} is already out of the way when it lands."],
        failure: ["{name} sees it a breath too late.", "Too slow, by the width of a hand."],
        botch: ["{name} flinches the wrong way, straight into it."]
    },
    uncanny: {
        success: ["The hair on {name}'s arms rises. Something is here that should not be.", "{name} feels it like a draught from a door nobody opened.",
            "The air has a weight to it. {name} knows better than to call it nothing."],
        failure: ["If something walks here, it leaves no mark on {name}.", "{name} feels only the cold, and the ordinary cold at that."],
        botch: ["{name} is certain of a presence. There is none, and the certainty will not go away."]
    },
    search: {
        success: ["Under the loose board, behind the sacking: {name} finds it.", "{name} goes over the room a second time and the second look pays.",
            "A thread caught on a nail, a mark in the dust. Enough to go on."],
        failure: ["{name} turns the place over and finds the place, nothing more.", "Whatever was here has been taken, or was never here."],
        botch: ["{name} finds something, and it is the wrong thing, and it points the wrong way.", "In the searching, {name} scuffs away the one mark that mattered."]
    },
    readperson: {
        success: ["{target} says one thing; the hands say another. {name} believes the hands.", "{name} reads {target} like a shop sign.",
            "There is fear under {target}'s calm, and {name} sees where it sits."],
        failure: ["{target}'s face gives {name} nothing to hold.", "{name} cannot tell whether {target} is tired, frightened or simply bored."],
        botch: ["{name} reads {target} with great confidence and gets it backwards."]
    },
    lie: {
        success: ["The story is smooth. Too smooth. {name} hears the seam.", "{target} looks away at the wrong word, and {name} sees it.",
            "{name} lets {target} finish, and does not believe a line."],
        failure: ["It sounds true to {name}. It may even be true.", "{name} cannot find the crack in it."],
        botch: ["{name} trusts {target} completely. That trust will be expensive."]
    },
    security: {
        success: ["A bell on a string behind the door, a second bolt low down. {name} sees both.", "{name} counts the watchman's steps and learns the round.",
            "The lock is good. {name} knows exactly how good."],
        failure: ["The door looks like a door. {name} cannot say what guards it.", "{name} sees no alarm, and is not sure that means there is none."],
        botch: ["{name} is sure the way is clear. It is not."]
    },
    agility: {
        success: ["{name} lands light, as if the gap were half as wide.", "A step, a turn, and {name} is across.", "The beam takes {name}'s weight without a sound."],
        failure: ["{name} hesitates at the edge and the moment goes.", "A foot slips; {name} catches it, and stays where they were."],
        botch: ["{name} goes down hard, and loudly."]
    },
    hide: {
        success: ["{name} folds into the dark under the stair and stops being there.", "A gap behind the barrels, just big enough. {name} takes it."],
        failure: ["Every corner is lit or watched. {name} finds nowhere good.", "The best place {name} finds is not very good."],
        botch: ["{name} picks the one spot where everyone will look first."]
    },
    holdstill: {
        success: ["{name} does not move. After a while, the searchers stop looking.", "Breath held, muscles locked. They pass within arm's reach."],
        failure: ["A cramp, a shift of weight, a creak. Heads turn.", "{name} holds as long as {name} can, which is not quite long enough."],
        botch: ["{name} sneezes."]
    },
    endurance: {
        success: ["{name} keeps going after the others would have stopped.", "Another mile, then another. {name} does not think about the next one."],
        failure: ["{name}'s legs give out before the road does.", "{name} has to stop, and stopping costs time."],
        botch: ["{name} pushes too far and pays for it with something torn."]
    },
    recall: {
        success: ["{name} has read of this, years ago, and the page comes back whole.", "A name, a date, a story told by an old teacher. {name} remembers.",
            "{name} knows what this is, and wishes otherwise."],
        failure: ["It is on the edge of memory and will not come closer.", "{name} has never heard of it, or has forgotten that they did."],
        botch: ["{name} remembers it clearly. The memory is wrong."]
    },
    firstaid: {
        success: ["The bleeding slows under {name}'s hands.", "{name} sees what the wound is and what it is not.", "Clean cloth, steady pressure. It will hold."],
        failure: ["{name} does what can be done. It is not enough yet.", "The cause hides from {name}."],
        botch: ["{name}'s help makes it worse."]
    },
    willpower: {
        success: ["{name} sets their jaw and does not give way.", "It pulls at {name}. {name} pulls harder.", "{name} decides, and the deciding holds."],
        failure: ["{name} wants to hold firm, and wanting is not enough.", "The will bends."],
        botch: ["Something in {name} gives, and it will be a while before it mends."]
    },
    courage: {
        success: ["{name}'s heart hammers, and {name} stays where they are.", "Fear comes, and {name} lets it pass through and out."],
        failure: ["{name} takes a step back without meaning to.", "The fear is bigger than {name} tonight."],
        botch: ["{name} runs, and does not remember deciding to."]
    }
};

export const CHECK_GROUP_POOLS = {
    body: {
        success: ["{name}'s body does what it was asked.", "Strength enough, and a little to spare."],
        failure: ["{name}'s body has other ideas.", "Not tonight. Not like this."],
        botch: ["Something wrenches, and {name} feels it all the way down."]
    },
    mind: {
        success: ["It falls into place for {name}.", "{name} works it through and the answer is there."],
        failure: ["{name} turns it over and finds no handle on it.", "The answer stays out of reach."],
        botch: ["{name} reaches a firm conclusion, and it is wrong."]
    },
    social: {
        success: ["{target} goes along with {name}.", "{name} has the room, for now."],
        failure: ["{target} is not moved.", "It falls flat."],
        botch: ["{name} has made an enemy of {target}, or something close to it."]
    },
    resist: {
        success: ["{name} holds.", "It washes over {name} and leaves them standing."],
        failure: ["{name} gives a little ground.", "It gets through."],
        botch: ["{name} breaks, for a moment, in front of everyone."]
    }
};

export function theme(title, body) {
    const t = String(title).toLowerCase();
    const b = String(body).toLowerCase();
    // Card titles read "<name>: <what>"; a check's <what> is its name
    const what = t.includes(": ") ? t.slice(t.lastIndexOf(": ") + 2) : t;
    const ck = CHECK_BY_TITLE.get(what.replace(/^common:\s*/, "").split(" (")[0].trim());
    if (ck) return CHECK_POOLS[ck.key] ? `check:${ck.key}` : CHECK_GROUP_POOLS[ck.group] ? `checkgroup:${ck.group}` : "general";
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
    const pool = (themeKey.startsWith("check:") ? CHECK_POOLS[themeKey.slice(6)]?.[outcomeKey]
        : themeKey.startsWith("checkgroup:") ? CHECK_GROUP_POOLS[themeKey.slice(11)]?.[outcomeKey] : POOLS[themeKey]?.[outcomeKey]) ?? POOLS.general[outcomeKey] ?? [];
    let fit = pool.filter(l => fits(l, group));
    if (!fit.length) fit = (POOLS.general[outcomeKey] ?? []).filter(l => fits(l, group));
    if (!fit.length) return "";
    let t = parse(rand(fit)).text;
    for (const [k, v] of Object.entries(names)) t = t.replaceAll(`{${k}}`, esc(v));
    const fallback = { social: "the listener", diablerie: "the victim", "check:readperson": "the other person", "check:lie": "the speaker", "checkgroup:social": "the other person" }[themeKey] ?? "the other";
    t = t.replace(/\{target\}/g, fallback).replace(/\{\w+\}/g, "someone");
    return t.charAt(0).toUpperCase() + t.slice(1);
}

export function html(text) {
    return text ? `<div class="vta-flavor">${text}</div>` : "";
}
