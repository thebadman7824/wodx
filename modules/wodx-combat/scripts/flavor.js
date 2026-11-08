/* WoDX Combat: flavor lines shown under the dice on attack cards.
 * One line is picked at random from the pool that fits the outcome. {attacker} and {target} are filled in.
 *
 * Tags (optional). A line may start with tags in square brackets, e.g. "[ranged living] ...".
 *   How the attack was made:  armed (hand weapon), brawl (fists, kicks), natural (claws, teeth), ranged (bow, sling, thrown)
 *                             melee = armed, brawl or natural
 *   What was attacked:        living (mortals, ghouls, Garou...), kindred, beast (animals), spirit (wraiths, spirits, demons)
 *                             flesh = living, kindred or beast;  person = living or kindred
 * A line with no tag of a kind fits every case of that kind. A line with target tags is never used when there is no target.
 * Edit freely: add lines to a pool, or empty a pool to silence it. */

export const POOLS = {
    miss: [
        "[armed flesh] The blade bites the air a hand's breadth from {target}'s throat, and the swing carries {attacker} half a step too far.",
        "[armed] {target} is simply not where the blow arrives. Steel rings off stone instead.",
        "{target} is simply not there when the blow arrives.",
        "{attacker} commits a heartbeat too early, and {target} reads it like a letter.",
        "[armed person] The blow glances off a buckle and skids away with a scrape that sets teeth on edge.",
        "A foot slips on wet straw. The attack goes wide, and both of them know it.",
        "{target} twists aside, close enough to feel the wind of it.",
        "[armed person] The point catches only cloth. Somewhere a seam gives way, and nothing else does.",
        "{attacker} strikes at a shadow and finds that it was only a shadow.",
        "Too slow, too careful. {target} is already moving when the attack begins.",
        "[armed] The weapon thuds into a post, and for one ugly moment it will not come free.",
        "[brawl flesh] The fist sails past {target}'s jaw, and {attacker} stumbles after it.",
        "[natural] Teeth snap shut on nothing.",
        "[natural] Claws rake the air where {target} stood a heartbeat ago.",
        "[ranged] The shot hums past {target} and loses itself in the dark.",
        "[ranged] The missile skips off stone and is gone.",
        "[ranged] {attacker} lets fly a moment too soon, and the shot goes high.",
        "[spirit] The blow passes through where {target} seemed to be, and finds only cold air."
    ],
    bashing: [
        "[flesh] The blow lands with a flat, heavy sound, like a sack of grain dropped on a floor.",
        "[flesh] {target} staggers, and the world goes white at the edges for a moment.",
        "[flesh] Something in {target}'s shoulder makes a noise it should not make.",
        "[living beast] The breath goes out of {target} all at once, and does not hurry back.",
        "[kindred] {target} folds around the blow and straightens again. There was no breath in that body to lose.",
        "[kindred] Bruises rise on {target}'s dead skin and fade almost as fast. The Blood is already at work.",
        "[armed brawl] {attacker} feels the impact all the way up to the elbow.",
        "[flesh] {target}'s head snaps around. A tooth skitters across the boards.",
        "It is not an elegant blow, but it lands.",
        "{target} reels into the wall and stays there a moment too long.",
        "[beast] {target} yelps and scrambles back, ears flat.",
        "[spirit] {target} wavers like smoke in a draft, and gathers itself back together more slowly.",
        "[ranged] The stone cracks home, and {target} rocks back from it.",
        "The impact rattles {target} from head to heel."
    ],
    lethal: [
        "[armed living] Steel finds the gap under {target}'s arm. The cry that follows is short, and very human.",
        "[armed kindred] Steel finds the gap under {target}'s arm. {target} does not cry out; the dead seldom do.",
        "[armed person] The edge opens {target} from collarbone to ribs, and the cloth darkens at once.",
        "[armed] {attacker} feels the point catch, and then go in.",
        "[flesh] Blood sprays the nearest wall in a long, thin line.",
        "[person] {target} looks down at the wound as if it belonged to someone else.",
        "[armed flesh] The blade comes back wet. {target} does not stay standing long.",
        "[living beast] A hot, coppery smell fills the room, and every Kindred in it notices.",
        "[kindred] What spills from {target} is darker than living blood, and slower, and every Kindred in the room can smell it.",
        "[armed flesh] The cut is deep and clean. A surgeon would have admired it.",
        "[person] {target} clutches at the wound and comes away with a red hand.",
        "[flesh] There is a moment of silence, and then the blood comes.",
        "[ranged flesh] The shaft takes {target} high in the chest and stays there, quivering.",
        "[ranged] {target} jerks as the shot strikes home.",
        "[natural flesh] Teeth meet in {target}'s flesh and tear free.",
        "[natural flesh] Claws open four red lines across {target}.",
        "[spirit] The blow cuts through {target}, and what spills out is cold and pale as river mist.",
        "That one went deep.",
        "The wound is real, and it is bad.",
        "[brawl] Knuckles split skin, and the blow does more harm than a fist has any right to.",
        "[natural spirit] Claws drag through {target} like a rake through mist, and leave a wound behind."
    ],
    aggravated: [
        "[flesh] Where the blow lands, the flesh blackens and curls, and it will not knit.",
        "[kindred] {target} screams, and it is not a sound the living make.",
        "[living] {target} screams, and the scream goes on far longer than it should.",
        "[kindred] The wound smokes. The Beast in {target} howls and cannot do a thing about it.",
        "Claw or fire or holy thing, it makes no difference: this damage goes to the soul.",
        "[flesh] The smell of scorched meat rises, sweet and wrong.",
        "[flesh] {target}'s skin parts like wet paper and does not try to close.",
        "[kindred] Even the Blood cannot argue with this wound. It will take nights to heal, if it heals at all.",
        "[kindred spirit] {attacker} has struck at the thing that keeps {target} walking, and {target} knows it.",
        "[living] Living flesh was never meant to meet a thing like this. {target} may not see the morning.",
        "[beast] {target} shrieks, a sound of pure animal terror.",
        "[spirit] {target} tears like old cloth, and the tear does not close.",
        "That wound will leave a scar, if it ever closes.",
        "Whatever did this, it will not be undone by morning."
    ],
    heavy: [
        "{attacker} puts everything into it, and {target} folds around the blow.",
        "The blow lands like a falling beam. {target} goes down hard.",
        "That one will be remembered, by whoever survives the night.",
        "[flesh] {target} hits the floor, and the floor does not give.",
        "For a moment nobody moves. Then {target} tries to rise, and cannot quite manage it.",
        "[melee flesh] Bone breaks with a sound like green wood. {attacker} does not stop.",
        "[melee] {target} is lifted off their feet and thrown back into the dark.",
        "A blow like that ends arguments. It may end {target}.",
        "[ranged flesh] The shot strikes with a sound like an axe in wet wood, and {target} spins and falls."
    ],
    soaked: [
        "The blow lands squarely, and {target} simply takes it.",
        "[melee person] {target} rolls with the blow and comes up unhurt, and smiling.",
        "[armed person] Mail and stubborn flesh turn the blow aside. {target} barely blinks.",
        "[melee] {attacker} might as well have struck the keep wall.",
        "[kindred] The dead do not bruise easily. {target} shrugs it off.",
        "[person] A dull thump, nothing more. {target} looks almost disappointed.",
        "[armed person] The edge skids along an iron rivet and finds nothing beneath it.",
        "[melee person] {target} takes the blow on the forearm and does not even step back.",
        "[ranged] The shot strikes and falls away, and {target} keeps coming.",
        "[beast] Thick hide and muscle take the blow. {target} shakes itself and comes on.",
        "[living] {target} grunts and keeps their feet, and that is all.",
        "[spirit] The blow lands, but there is nothing there for it to hurt.",
        "{attacker} hoped for more. The blow does nothing."
    ],
    botch: [
        "[armed] The hilt turns in {attacker}'s wet grip, and the blow goes wide, toward the nearest friend.",
        "[armed] Something snaps: a strap, a blade, a bone in {attacker}'s hand.",
        "{attacker} trips over a stool that was not there a moment ago.",
        "[armed ranged] The weapon flies loose and clatters away into the dark.",
        "{attacker} overreaches, and for a long moment is open to anyone.",
        "A wild, ugly attack. Someone on the wrong side of it is going to have a bad night.",
        "[armed] The blade sticks fast in the doorframe. {target} watches with interest.",
        "{attacker}'s footing goes, and the floor comes up to meet them.",
        "[armed] The stroke rebounds off a beam and comes back toward its owner.",
        "[armed] Steel meets steel, and the cheaper steel loses. It was {attacker}'s.",
        "[ranged] The string snaps with a crack like a whip, and the shot goes nowhere.",
        "[ranged] The shot flies wild, toward someone who was never the target.",
        "[natural] Teeth close on the wrong thing, and {attacker} comes away with a mouthful of splinters.",
        "[brawl] {attacker}'s fist meets a doorpost instead of {target}, and something in the hand cracks."
    ],
    maneuver: [
        "{attacker} closes before {target} can think, and the moment belongs to {attacker}.",
        "[armed brawl person] A shove, a twist, a hand in the collar: {target} goes exactly where {attacker} wants.",
        "[flesh] {target} finds the ground much closer than expected.",
        "It is done before anyone else in the room has drawn breath.",
        "[armed brawl flesh] {attacker} hooks a heel, and {target} goes over like a felled tree.",
        "[brawl] A grip like a smith's tongs, and {target} is not going anywhere.",
        "[natural] {attacker} bears {target} down with sheer weight, and holds them there.",
        "{attacker} turns the moment to their own advantage."
    ]
};

const STYLE = { armed: ["armed"], brawl: ["brawl"], natural: ["natural"], ranged: ["ranged"], melee: ["armed", "brawl", "natural"] };
const TARGET = { living: ["living"], kindred: ["kindred"], beast: ["beast"], spirit: ["spirit"],
    flesh: ["living", "kindred", "beast"], person: ["living", "kindred"] };

/** profile key from profiles.js -> target group */
export function targetGroup(profileKey) {
    if (!profileKey) return null;
    if (profileKey === "kindred") return "kindred";
    if (profileKey === "beast") return "beast";
    if (["wraith", "spirit", "demon"].includes(profileKey)) return "spirit";
    return "living";
}

/** how the weapon strikes: armed | brawl | natural | ranged */
export function attackStyle(w) {
    if (!w) return "armed";
    if (w.ranged) return "ranged";
    if (w.natural) return "natural";
    if (w.unarmed && /bite|claw/i.test(`${w.id ?? ""} ${w.name ?? ""}`)) return "natural";
    if (w.unarmed || w.ability === "brawl") return "brawl";
    return "armed";
}

const rand = a => a[Math.floor(Math.random() * a.length)];
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** split "[tag tag] text" into tags and text */
function parse(raw) {
    const m = /^\[([^\]]*)\]\s*/.exec(raw);
    return m ? { tags: m[1].trim().split(/\s+/).filter(Boolean), text: raw.slice(m[0].length) } : { tags: [], text: raw };
}

/** does a line fit this attack style and target group? */
export function fits(raw, style, group) {
    const { tags } = parse(raw);
    const st = tags.filter(t => STYLE[t]), tg = tags.filter(t => TARGET[t]);
    if (st.length && !st.some(t => STYLE[t].includes(style))) return false;
    if (tg.length && (!group || !tg.some(t => TARGET[t].includes(group)))) return false;
    return true;
}

/** pick the pool for an attack card */
export function attackKey({ hit, botch, noDamage, levels, type, soaked }) {
    if (botch) return "botch";
    if (!hit) return "miss";
    if (noDamage) return "maneuver";
    if (soaked) return "soaked";
    if (levels >= 4) return "heavy";
    return type === "aggravated" ? "aggravated" : type === "bashing" ? "bashing" : "lethal";
}

/** one line for the pool, filtered by attack style and target group (see the tags above) */
export function line(key, names = {}, { style = "armed", group = null } = {}) {
    const pool = POOLS[key] ?? [];
    let fit = pool.filter(l => fits(l, style, group));
    if (!fit.length) fit = pool.filter(l => !parse(l).tags.length);
    if (!fit.length) return "";
    let t = parse(rand(fit)).text;
    for (const [k, v] of Object.entries(names)) t = t.replaceAll(`{${k}}`, esc(v));
    t = t.replace(/\{\w+\}/g, "someone");
    return t.charAt(0).toUpperCase() + t.slice(1);
}

export function html(text) {
    return text ? `<div class="vtc-flavor">${text}</div>` : "";
}
