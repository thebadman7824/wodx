/**
 * WoDX Actions 3.13 — common checks: the everyday rolls a player reaches for without a dramatic system (noticing,
 * reading a person, keeping one's feet, resisting, an Attribute on its own). The pure parts, so the harness can test them.
 *
 * Each check lists the pools that fit, best first ([attribute, ability]); an ability of "" rolls the Attribute alone,
 * and an attribute of "special:<key>" rolls a Trait such as Willpower or Courage. The roller takes the first pool the
 * character has dots in, then the first the sheet shows, then the first in the list (untrained rules apply).
 * Pages: V20 printed pages unless marked. The pairs come from V20's Abilities (pp. 100-111), the sample rolls on
 * p. 255 and the dramatic systems (pp. 257-266); Dark Ages names (Ride, Hearth Wisdom, Legerdemain) are listed after.
 */

/** The groups, in menu order. */
export const GROUPS = [
    ["senses", "Senses and noticing"],
    ["body", "Body and movement"],
    ["mind", "Knowing and working things out"],
    ["social", "People and animals"],
    ["resist", "Holding firm"],
    ["attribute", "An Attribute alone"]
];

/** The common checks. diff is the usual difficulty; the Storyteller changes it to fit the moment. */
export const CHECKS = [
    // Senses
    { key: "notice", group: "senses", label: "Notice something (Perception + Alertness)", pools: [["perception", "alertness"]], diff: 6,
        note: "Spot, hear or smell what is going on nearby, looking or not. An ambush is Dexterity + Stealth against this pool.", ref: "V20 p. 100, 274" },
    { key: "react", group: "senses", label: "React in time (Wits + Alertness)", pools: [["wits", "alertness"]], diff: 6,
        note: "Catch a thrown object, see the trap spring, get out of the way of the sudden thing.", ref: "V20 p. 100" },
    { key: "uncanny", group: "senses", label: "Sense the uncanny (Perception + Awareness)", pools: [["perception", "awareness"], ["perception", "kenning"], ["perception", "primalurge"]], diff: 7,
        note: "A feeling that something supernatural is close: magic at work, a ghost, a hidden power. It says that, not what.", ref: "V20 p. 100" },
    { key: "search", group: "senses", label: "Search a place (Perception + Investigation)", pools: [["perception", "investigation"], ["perception", "alertness"]], diff: 6,
        note: "Find the hidden thing, the clue, the way the body was moved. More successes: more detail.", ref: "V20 p. 108, 264" },
    { key: "readperson", group: "senses", label: "Read a person (Perception + Empathy)", pools: [["perception", "empathy"]], diff: 6,
        note: "Their mood, whether they believe what they say, what they want from the talk.", ref: "V20 p. 101" },
    { key: "lie", group: "senses", label: "See through a lie (Perception + Subterfuge)", pools: [["perception", "subterfuge"], ["perception", "empathy"]], diff: 7,
        note: "Against someone lying on purpose, roll this against their Manipulation + Subterfuge (Action, Credibility).", ref: "V20 p. 265" },
    { key: "security", group: "senses", label: "Spot alarms and locks (Perception + Larceny)", pools: [["perception", "larceny"], ["perception", "security"], ["perception", "legerdemain"]], diff: 6,
        note: "What guards the place: alarms, locks, a watchman's round.", ref: "V20 p. 255" },
    // Body
    { key: "agility", group: "body", label: "Balance, leap or tumble (Dexterity + Athletics)", pools: [["dexterity", "athletics"]], diff: 6,
        note: "Keep one's feet on a roof, vault a wall, roll with a fall. Climbing, jumping and swimming have their own systems.", ref: "V20 p. 100" },
    { key: "endurance", group: "body", label: "Keep going (Stamina + Athletics)", pools: [["stamina", "athletics"]], diff: 7,
        note: "Run, march or swim on and on. For a long chase make it extended (15 successes to outlast a pursuer).", ref: "V20 p. 255" },
    { key: "holdstill", group: "body", label: "Hold still and stay hidden (Stamina + Stealth)", pools: [["stamina", "stealth"]], diff: 7,
        note: "Each success: one hour without moving.", ref: "V20 p. 255" },
    { key: "hide", group: "body", label: "Find a hiding place (Wits + Stealth)", pools: [["wits", "stealth"]], diff: 6,
        note: "A quick place to get out of sight. Searchers roll Perception + Alertness to find it.", ref: "V20 p. 105" },
    { key: "swerve", group: "body", label: "Swerve or keep control (Wits + Drive / Ride)", pools: [["wits", "drive"], ["wits", "ride"], ["dexterity", "ride"]], diff: 6,
        note: "An obstacle in the road, a horse that shies. Rain, crowds or speed raise the difficulty.", ref: "V20 p. 255, 258" },
    { key: "strength", group: "body", label: "A feat of strength (Strength)", pools: [["strength", ""]], diff: 6,
        note: "Push, pull, bend or break. Lifting beyond Strength and forcing a door have their own systems in the Action list.", ref: "V20 p. 260" },
    { key: "sleight", group: "body", label: "Sleight of hand (Dexterity + Subterfuge / Larceny)", pools: [["dexterity", "subterfuge"], ["dexterity", "larceny"], ["dexterity", "legerdemain"]], diff: 6,
        note: "Palm a knife, lift a purse. Against a watcher, the difficulty is their Perception + Alertness.", ref: "V20 p. 255" },
    // Mind
    { key: "recall", group: "mind", label: "Know or recall (Intelligence + a Knowledge)", pools: [["intelligence", "academics"], ["intelligence", "occult"], ["intelligence", "science"], ["intelligence", "theology"], ["intelligence", "enigmas"], ["intelligence", "hearth wisdom"]], diff: 6,
        note: "Pick the Knowledge that fits before rolling. An untrained Knowledge cannot be rolled.", ref: "V20 p. 107, 265" },
    { key: "puzzle", group: "mind", label: "Think fast (Wits + an Ability)", pools: [["wits", "subterfuge"], ["wits", "streetwise"], ["wits", "survival"]], diff: 6,
        note: "A cover story on the spot, a way out, the right move under pressure. Change the Ability to the one that fits.", ref: "V20 p. 255" },
    { key: "firstaid", group: "mind", label: "First aid or diagnosis (Intelligence + Medicine)", pools: [["intelligence", "medicine"], ["perception", "medicine"]], diff: 6,
        note: "Stop the bleeding, tell what is wrong. Perception + Medicine to diagnose by looking.", ref: "V20 p. 109" },
    { key: "shelter", group: "mind", label: "Find shelter or food (Wits + Survival)", pools: [["wits", "survival"]], diff: 7,
        note: "A safe place for the day or the night in the wild or on the streets.", ref: "V20 p. 107, 255" },
    { key: "computer", group: "mind", label: "Use a computer (Intelligence + Computer)", pools: [["intelligence", "computer"], ["wits", "computer"]], diff: 6,
        note: "Find a file, get past a password. Wits + Computer when the clock is running.", ref: "V20 p. 108, 263" },
    { key: "buildfix", group: "mind", label: "Make or fix quickly (Wits + Crafts)", pools: [["wits", "craft"], ["wits", "crafts"]], diff: 7,
        note: "Board up a door, mend a strap. Longer work is Repair, an extended roll.", ref: "V20 p. 255, 264" },
    // Social
    { key: "persuade", group: "social", label: "Persuade (Manipulation + Expression)", pools: [["manipulation", "expression"], ["manipulation", "persuasion"]], diff: 6,
        note: "Make a case. Against a rival making theirs, roll the Action as resisted.", ref: "V20 p. 255" },
    { key: "etiquette", group: "social", label: "Mind one's manners (Charisma + Etiquette)", pools: [["charisma", "etiquette"], ["wits", "etiquette"]], diff: 6,
        note: "The right word at court or in Elysium; spot a breach of custom with Perception + Etiquette.", ref: "V20 p. 104" },
    { key: "streets", group: "social", label: "Ask around (Charisma + Streetwise)", pools: [["charisma", "streetwise"], ["wits", "streetwise"], ["charisma", "hearth wisdom"]], diff: 7,
        note: "What people on the street know. More successes: more to go on; it takes a night of legwork.", ref: "V20 p. 103, 255" },
    { key: "cow", group: "social", label: "Stare someone down (Charisma + Intimidation)", pools: [["charisma", "intimidation"]], diff: 6,
        note: "Resisted by the other's Charisma + Intimidation when both push.", ref: "V20 p. 255" },
    { key: "lead", group: "social", label: "Take command (Charisma + Leadership)", pools: [["charisma", "leadership"]], diff: 6,
        note: "Get a frightened group to follow orders. A speech to a crowd is Oration.", ref: "V20 p. 102" },
    { key: "animal", group: "social", label: "Calm or command an animal (Manipulation + Animal Ken)", pools: [["manipulation", "animalken"], ["charisma", "animalken"]], diff: 7,
        note: "Distract the guard dogs, steady a horse.", ref: "V20 p. 103, 255" },
    // Resist
    { key: "willpower", group: "resist", label: "Willpower roll (resist, push through)", pools: [["special:willpower", ""]], diff: 6,
        note: "Resist temptation, a compulsion or a mind-bending power when its rule asks for Willpower; abort to a defense.", ref: "V20 p. 266, 274" },
    { key: "stamina", group: "resist", label: "Resist with the body (Stamina)", pools: [["stamina", ""]], diff: 6,
        note: "Poison, drink, sickness, nausea or exhaustion. Add Fortitude or another power if its rule says so (Bonus dice).", ref: "V20 p. 302" },
    { key: "staycalm", group: "resist", label: "Keep a straight face (Wits + Subterfuge)", pools: [["wits", "subterfuge"]], diff: 7,
        note: "Hide a reaction: surprise, fear, recognition.", ref: "V20 p. 103" },
    { key: "courage", group: "resist", label: "Courage roll (face fear)", pools: [["special:courage", ""]], diff: 6,
        note: "Stand firm before fire, sunlight or the terrible. For Kindred facing fire or the sun, use Rötschreck.", ref: "V20 p. 120" },
    { key: "selfcontrol", group: "resist", label: "Self-Control / Instinct roll", pools: [["special:selfcontrol", ""]], diff: 6,
        note: "Hold back an urge. Kindred frenzy has its own button.", ref: "V20 p. 120" },
    { key: "conscience", group: "resist", label: "Conscience / Conviction roll", pools: [["special:conscience", ""]], diff: 6,
        note: "What the character's conscience makes of a deed. Degeneration has its own button.", ref: "V20 p. 119" },
    // An Attribute on its own
    ...["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"].map(a => ({
        key: `attr-${a}`, group: "attribute", label: `${a[0].toUpperCase()}${a.slice(1)} alone`, pools: [[a, ""]], diff: 6,
        note: "When no Ability fits, the Attribute is rolled by itself.", ref: "V20 p. 100" }))
];

export const byKey = key => CHECKS.find(c => c.key === key) ?? null;

/** The kind of an Ability (talent, skill, knowledge), for the untrained rules when the sheet does not have it. */
const TALENTS = ["alertness", "athletics", "awareness", "brawl", "dodge", "empathy", "expression", "intimidation", "intuition", "kenning", "leadership",
    "legerdemain", "persuasion", "primalurge", "streetwise", "subterfuge", "art"];
const SKILLS = ["animalken", "archery", "commerce", "craft", "crafts", "demolitions", "drive", "etiquette", "firearms", "larceny", "martialarts", "meditation",
    "melee", "performance", "ride", "security", "stealth", "survival"];
export function abilityKind(key) {
    const k = String(key ?? "").toLowerCase().replace(/[^a-z]/g, "");
    if (!k) return "";
    if (TALENTS.includes(k)) return "talent";
    if (SKILLS.includes(k)) return "skill";
    return "knowledge";
}

/**
 * Pick the pool for a check. find(abilityKey) → {value, shown} or null (shown: the sheet lists it).
 * Returns {attr, ability, value, how}: how = "trained" (dots), "shown" (on the sheet, no dots), "untrained" (not on the
 * sheet), or "trait" (an Attribute or Trait alone).
 */
export function choosePool(pools, find) {
    const list = (pools ?? []).filter(p => Array.isArray(p) && p[0] !== undefined);
    if (!list.length) return null;
    const look = list.map(([a, k]) => ({ attr: a, ability: k || "", hit: k ? find(k) : null }));
    const alone = look.find(x => !x.ability);
    const trained = look.find(x => x.ability && (x.hit?.value ?? 0) > 0);
    if (trained) return { attr: trained.attr, ability: trained.ability, value: trained.hit.value, how: "trained" };
    if (alone && alone === look[0]) return { attr: alone.attr, ability: "", value: 0, how: "trait" };
    const shown = look.find(x => x.ability && x.hit?.shown);
    if (shown) return { attr: shown.attr, ability: shown.ability, value: 0, how: "shown" };
    const first = look[0];
    return { attr: first.attr, ability: first.ability, value: 0, how: first.ability ? "untrained" : "trait" };
}

/** The checks as Action presets (one list for the Action dialog and the quick roller). */
export function asPresets() {
    return Object.fromEntries(CHECKS.map(c => [`check-${c.key}`, {
        label: `Common: ${c.label}`, attr: c.pools[0][0], ability: c.pools[0][1], diff: c.diff, alts: c.pools,
        note: `${c.note} (${c.ref})`, check: c.key
    }]));
}

/**
 * How far a Jumping roll reaches (VtDA20, the Jumping check): each success is 1 yard across or 20 inches up.
 * {yards, upFeet} with the height rounded down to the foot.
 */
export function jumpReach(successes) {
  const s = Math.max(0, Number(successes) || 0);
  return { yards: s, upFeet: Math.floor(s * 20 / 12) };
}
