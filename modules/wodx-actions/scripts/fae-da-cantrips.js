/**
 * WoDX Actions: the named cantrips of the four Dominions and the common cantrips (Dark Ages: Fae pp. 123-162), in
 * WoDX's own words, as presets for the fae sheet (B6550-B6554). Each: name, dominion ("day", "night", "dawn", "dusk"),
 * level, trait (the Attribute or Ability added to the Dominion), fx (what it does), page, and an effects-card spec
 * (mage-da-effects.js helpers) that the cast window puts on the card when the cantrip takes. Optional:
 *   diff   a number, or "willpower" (the target's Willpower, as the book sets for Decree and the rest)
 *   need   successes the cantrip needs before it works at all (Mantle, True Ardor, Saining and others)
 *   imbue  "charm" | "persisting" | "true": the cantrip makes a Treasure that holds another cantrip (treasures.js)
 *   romance the cantrip is romantic or sexual: the age floor is checked first (standing rule 29)
 *   weaving / willpower  a point spent to cast (Dominion Writ, Second Chance, Face of the Sun, Soul Rime)
 * The common cantrips appear once in each Dominion, under that Dominion's own name for them (Leaves of Gold, of Silver...).
 * Pure: no Foundry calls.
 */
import { H, T, C, N, S, MV, K, P, A, HL, outcomesOf } from "./mage-da-effects.js";

export const REF = "Dark Ages: Fae";
const X = (name, dominion, level, trait, fx, spec, page, extra = {}) => ({ name, dominion, level, trait, fx, spec, page, ...extra });
const DOMS = ["day", "night", "dawn", "dusk"];

/* -- The common cantrips (pp. 123-129): one in each Dominion, with that Dominion's flavour ------------------------ */
const COMMON = [];
const each = (base, level, trait, page, by, extra = {}) => {
    for (const d of DOMS) {
        const v = by[d];
        COMMON.push([`${base}-${d}`, X(v.name, d, v.level ?? level, trait, v.fx, v.spec, page, { ...extra, ...(v.extra ?? {}), common: base })]);
    }
};
each("call-element", 1, "strength", 123, {
    day: { name: "Call Fire", fx: "A campfire's worth of flame on any surface, even bare stone; it lasts a turn a success and then goes out unless it finds fuel.", spec: K("light", "self") },
    night: { name: "Call Water", fx: "A gallon of water a success pools before the caster and runs downhill if nothing holds it.", spec: K("make", "self", { thing: "a gallon of water a success" }) },
    dawn: { name: "Call Earth", fx: "About a cubic foot of earth and stone a success heaps up before the caster.", spec: K("make", "self", { thing: "a mound of earth and stone" }) },
    dusk: { name: "Call Air", fx: "A swirl of air, about three cubic feet a success, even where no air should be; it scatters papers but the caster cannot steer it.", spec: K("work", "self") }
});
each("court-summons", 1, "charisma", 124, Object.fromEntries(DOMS.map(d => [d, { name: "Court Summons",
    fx: "A call only fae of the caster's Court can feel, carrying the caster's mood: a mile with one success, 5, 10, 20 and 50 miles with more. Beasts of the Dominion grow restless near it.", spec: K("summon", "self") }])));
each("leaves-of-metal", 1, "wits", 124, {
    day: { name: "Leaves of Gold", fx: "Green and growing things turn to seeming gold, coin or jewellery, finer with more successes; it is plant again at the next noon.", spec: T("illusion", "Faerie gold", { seconds: 86400 }, "self") },
    night: { name: "Leaves of Silver", fx: "Dead things of nature (a branch, a bone, a stone) turn to seeming silver until the next midnight. It is no true silver to a werewolf.", spec: T("illusion", "Faerie silver", { seconds: 86400 }, "self") },
    dawn: { name: "Leaves of Copper", fx: "Nuts, living twigs or berries turn to bright seeming copper until the next sunrise.", spec: T("illusion", "Faerie copper", { seconds: 86400 }, "self") },
    dusk: { name: "Leaves of Bronze", fx: "Things dead with the season (fallen leaves, husks, dry seed) turn to seeming bronze until the next sunset.", spec: T("illusion", "Faerie bronze", { seconds: 86400 }, "self") }
});
each("control-element", 2, "wits", 125, {
    day: { name: "Control Fire", fx: "Fire moves at the caster's wave for a turn a success: a candle burns twice as bright, a torch's flame leaps a few feet. It cannot burn what fire cannot.", spec: K("work", "self") },
    night: { name: "Control Water", fx: "Water gathers or turns aside for a turn a success: a drinking pool from trickles, a stream's course bent. It obeys the laws of water.", spec: K("work", "self") },
    dawn: { name: "Control Earth", fx: "Earth shifts for a turn a success: a throwing stone rolls to hand, sand smothers a small fire, a loose boulder rolls downhill onto foes.", spec: K("work", "self") },
    dusk: { name: "Control Air", fx: "Air moves for a turn a success: a candle snuffed, a map plucked from a hand, a badly pegged tent knocked flat.", spec: K("work", "self") }
});
each("drain", 2, "wits", 125, {
    day: { name: "Drain (faith and loyalty)", fx: "Draws faith, confidence and loyalty out of a target: the caster gains a Willpower point and the target loses one.", spec: [P("willpower", 1, "self", { fixed: true }), T("boost", "Drained of faith", "scene", "one", { sap: true, on: "social", dice: 1 })] },
    night: { name: "Drain (joy)", fx: "Draws joy and delight out of a target: the caster gains a Willpower point and the target loses one.", spec: [P("willpower", 1, "self", { fixed: true }), T("boost", "Drained of joy", "scene", "one", { sap: true, on: "social", dice: 1 })] },
    dawn: { name: "Drain (innocence)", fx: "Draws innocence and purity out of a target: the caster gains a Willpower point and the target loses one.", spec: [P("willpower", 1, "self", { fixed: true }), T("boost", "Drained of innocence", "scene", "one", { sap: true, on: "social", dice: 1 })] },
    dusk: { name: "Drain (pride)", fx: "Draws pride and arrogance out of a target: the caster gains a Willpower point and the target loses one.", spec: [P("willpower", 1, "self", { fixed: true }), T("boost", "Drained of pride", "scene", "one", { sap: true, on: "social", dice: 1 })] }
});
each("hedge-of-thorns", 2, "strength", 125, {
    day: { name: "Thornwall", fx: "A hedge six feet wide and high rises before the caster for an hour a success; stepping through it costs aggravated harm equal to the successes, soaked if the victim can.", spec: [T("ward", "Behind the Thornwall", { seconds: 3600 }, "self"), H("harm", 1, "aggravated", { ask: true })] },
    night: { name: "Winter's Brambles", fx: "A hedge of venomed thorns for an hour a success; stepping through costs lethal harm equal to the caster's Night, and unsoaked harm drops the victim into a fevered sleep.", spec: [T("ward", "Behind Winter's Brambles", { seconds: 3600 }, "self"), H("harm", 1, "lethal", { ask: true })] },
    dawn: { name: "Springbriars", fx: "Grasping briars for an hour a success: they grapple whoever pushes in, then drink blood a level a turn until two successes on Strength + Athletics tear free.", spec: [T("ward", "Behind the Springbriars", { seconds: 3600 }, "self"), C("hold", "held", "Caught in the Springbriars", "scene", "one")] },
    dusk: { name: "Nettlethorns", fx: "Stinging thorns for an hour a success; stepping through costs lethal harm equal to the caster's Dusk, and unsoaked harm takes that many dice from every pool, one fewer each hour.", spec: [T("ward", "Behind the Nettlethorns", { seconds: 3600 }, "self"), H("harm", 1, "lethal", { ask: true })] }
});
each("mantle", 2, "stamina", 126, {
    day: { name: "Summer Mantle", fx: "The caster becomes a farm beast or a fruiting tree (dog, horse, goat, apple tree), keeping only the wit to change back. Three successes for the whole change.", spec: T("shape", "Summer Mantle", "scene", "self") },
    night: { name: "Winter Mantle", fx: "The caster becomes a beast of the night or an evergreen (cat, owl, bat, pine). Three successes for the whole change.", spec: T("shape", "Winter Mantle", "scene", "self") },
    dawn: { name: "Spring Mantle", fx: "The caster becomes a grazing twilight beast or a flowering vine (rabbit, deer, honeysuckle, willow). Three successes for the whole change.", spec: T("shape", "Spring Mantle", "scene", "self") },
    dusk: { name: "Autumn Mantle", fx: "The caster becomes a hunting twilight beast or a bush without flowers (bear, wolf, hawk, holly). Three successes for the whole change.", spec: T("shape", "Autumn Mantle", "scene", "self") }
}, { need: 3 });
each("charm", 3, "wits", 126, Object.fromEntries(DOMS.map(d => [d, { name: "Charm",
    fx: "Puts one known cantrip of this Dominion into a fitting object for a single use; the magic fades at the Dominion's next hour if unused. A botch curses the object.", spec: null }])), { diff: 7, imbue: "charm" });
each("fostering", 3, "intelligence", 127, Object.fromEntries(DOMS.map(d => [d, { name: "Fostering",
    fx: "Gives a sprite its first Lesser Feature and sets it on the road to Saining in the caster's Court. A changeling cannot cast it.", spec: K("imbue", "one") }])), { diff: 7, notOrigin: "changeling" });
each("shaping", 3, "stamina", 127, Object.fromEntries(DOMS.map(d => [d, { name: "Shaping",
    fx: "Turns another into a beast or plant of the Dominion's kind until the caster ends it. Three successes for the whole change; each year in the form costs a Willpower roll (4 + the successes) or the mind drifts toward the beast.", spec: T("shape", "Shaped", "scene", "one") }])), { need: 3 });
each("straight-track", 3, "perception", 127, Object.fromEntries(DOMS.map(d => [d, { name: "Straight Track", ...(d === "dusk" ? { level: 2 } : {}),
    fx: "A glowing road to a known place opens at the caster's feet; each success halves the distance, walked at five miles an hour without hunger or weariness. It fades within a day.", spec: K("sideways", "self") }])), { diff: 7 });
each("sword", 3, "strength", 127, {
    day: { name: "Sword of Fire", fx: "A metal weapon turns white-hot and smokes with brimstone: it deals aggravated harm for the scene.", spec: null },
    night: { name: "Sword of Ice", fx: "A metal weapon freezes black: it deals aggravated harm for the scene.", spec: null },
    dawn: { name: "Sword of Thorns", fx: "A metal weapon grows thorns and sharp stones: it deals aggravated harm for the scene.", spec: null },
    dusk: { name: "Sword of the Wind", fx: "A metal weapon thins to an impossible edge: it deals aggravated harm for the scene.", spec: null }
}, { diff: 7, does: "sword" });
each("arch", 4, "wits", 127, Object.fromEntries(DOMS.map(d => [d, { name: "Arch", ...(d === "dusk" ? { level: 3 } : {}),
    fx: "Carries the caster to the mouth of a trod into a faerie realm. Three successes are needed: an hour's walk, 20 minutes with four, 10 with five, at once with six; it stays open as long.", spec: K("sideways", "self") }])), { diff: 8, need: 3 });
each("persisting-charm", 4, "wits", 128, Object.fromEntries(DOMS.map(d => [d, { name: "Persisting Charm",
    fx: "As Charm, but the cantrip held in the object waits until it is used, however long that is. A botch curses the object, and worse.", spec: null }])), { diff: 7, imbue: "persisting" });
each("saining", 4, "manipulation", 128, Object.fromEntries(DOMS.map(d => [d, { name: "Saining",
    fx: "The last rite of a year's initiation: brings a Fosterling into the Court for good. Three successes; failing means a year's wait. Best on the Court's solstice or equinox hour.", spec: K("bind", "one") }])), { diff: 8, need: 3 });
each("true-enchantment", 5, "intelligence", 129, Object.fromEntries(DOMS.map(d => [d, { name: "True Enchantment",
    fx: "Puts a known cantrip into an object for good, to be used again and again. Three successes are needed, and the cantrip must be cast into it first.", spec: null }])), { diff: 7, need: 3, imbue: "true" });

/* -- Day (pp. 133-137) ------------------------------------------------------------------------------------------- */
const DAYL = [
    ["candors-light", X("Candor's Light", "day", 1, "perception", "For the scene, whoever answers honestly (or believes they do) glows a faint gold.", K("know", "one"), 133)],
    ["cow-the-bitter-wind", X("Cow the Bitter Wind", "day", 1, "stamina", "The warmth of noon keeps the cold away for the scene: one success with plain clothes, three to dance naked in the frost. May be cast on another.", S("free"), 133)],
    ["decree", X("Decree", "day", 1, "manipulation", "One plain spoken command the target must carry out within a day, never one that harms the target directly.", T("sway", "Under a Decree", { days: 1 }, "one"), 133, { diff: "willpower" })],
    ["fireside-chatter", X("Fireside Chatter", "day", 1, "charisma", "With a small fire burning, up to three hidden watchers beyond its light must step into it and show themselves.", K("sense", "self"), 133)],
    ["friend-from-foe", X("Friend from Foe", "day", 1, "charisma", "A full turn's flowery speech: an attacker stops to listen and loses the next action.", C("hold", "dazed", "Listening, rapt", { turns: 1 }, "one"), 133, { diff: "willpower" })],
    ["hearts-rest", X("Heart's Rest", "day", 1, "empathy", "Cares melt away for a turn a success, and the target keeps a Willpower point to spend only against weariness, fear, rage or a weak mind.", [T("ward", "Heart's Rest", { turns: 1 }, "one", { against: "mind" }), P("willpower", 1, "one", { fixed: true })], 133)],
    ["luminous-splendor", X("Luminous Splendor", "day", 1, "charisma", "The caster shines with awe: each success adds a success to a Leadership or Intimidation roll later this scene.", T("boost", "Luminous Splendor", "scene", "self", { on: "social" }), 133)],
    ["merry-meet", X("Merry Meet", "day", 1, "charisma", "Every Social roll the caster makes this scene is one easier.", T("fortune", "Merry Meet", "scene", "self"), 133)],
    ["oathbound-strength", X("Oathbound Strength", "day", 1, "gramarye", "Within an hour of keeping an oath's terms, the caster gains a Willpower point. Once a day.", P("willpower", 1, "self", { fixed: true }), 133, { once: "day" })],
    ["seek-treasure", X("Seek Treasure", "day", 1, "perception", "Senses gold larger than a palm within a room or clearing: the caster smells it or hears it ring.", K("sense", "self"), 133)],
    ["sunbeam", X("Sunbeam", "day", 1, "wits", "A steady ball of cool light, bright as a torch, for a minute a success; it follows the caster within ten feet. It is not sunlight to the Cainites.", K("light", "self"), 134)],
    ["suns-shield", X("Sun's Shield", "day", 1, "strength", "A blinding blaze: the caster's initiative rises by the successes for three turns, and an escape on the next turn leaves foes unsure where.", T("boost", "Sun's Shield", { turns: 3 }, "self", { on: "initiative" }), 134)],
    ["an-air-of-wisdom", X("An Air of Wisdom", "day", 2, "charisma", "An impressive speech halts up to three attackers, one a success, lowest Willpower first: each loses the next action.", C("hold", "dazed", "Halted by wisdom", { turns: 1 }, "each"), 134)],
    ["befuddle", X("Befuddle", "day", 2, "manipulation", "The target repeats one simple harmless task over and over until dismissed or until high noon.", T("sway", "Befuddled", { days: 1 }, "one"), 134, { diff: "willpower" })],
    ["fire-armor", X("Fire Armor", "day", 2, "stamina", "A whirl of flame for the scene: a soak die a success against every harm, aggravated too, and torch burns for whoever touches the caster.", T("ward", "Fire Armor", "scene", "self"), 134)],
    ["fireside-revelations", X("Fireside Revelations", "day", 2, "charisma", "As Fireside Chatter, but up to six hidden watchers must step into the firelight.", K("sense", "self"), 135)],
    ["flames-kin", X("Flame's Kin", "day", 2, "stamina", "Each success takes a level a turn off fire's harm for the scene; clothes and gear are spared. Difficulty 8 on another.", T("ward", "Flame's Kin", "scene", "one", { against: "fire" }), 135)],
    ["lightning-strike", X("Lightning-Strike", "day", 2, "stamina", "A bolt that does no harm but knocks the target down, stunned and unable to act for a full turn.", [C("trip", "knockdown", "Struck by lightning", { turns: 1 }, "one"), C("hold", "dazed", "Stunned by lightning", { turns: 1 }, "one")], 135, { diff: "willpower" })],
    ["plunder", X("Plunder", "day", 2, "perception", "As Seek Treasure over a keep, a field or a small wood: one success finds gold the size of an apple.", K("sense", "self"), 135)],
    ["pronouncement", X("Pronouncement", "day", 2, "manipulation", "A complex, risky command the target follows for up to a week, short of hurting themselves knowingly.", T("sway", "Under a Pronouncement", { weeks: 1 }, "one"), 135, { diff: "willpower" })],
    ["summers-glamour", X("Summer's Glamour", "day", 2, "wits", "The caster looks human for an hour a success; each big change from the true features is one harder.", T("veil", "Summer's Glamour", { seconds: 3600 }, "self"), 135)],
    ["veritable", X("Veritable", "day", 2, "manipulation", "The target must answer one question with what they truly believe.", K("know", "one"), 135, { diff: "willpower" })],
    ["wall-of-fire", X("Wall of Fire", "day", 2, "strength", "A wall of fire four feet wide and six high for a turn a success; stepping through costs aggravated harm equal to the caster's Day, soaked if the victim can.", H("harm", 1, "aggravated", { ask: true }), 135)],
    ["will-of-fire", X("Will of Fire", "day", 2, "stamina", "Every Willpower roll is two easier for the scene, for the caster or another.", T("fortune", "Will of Fire", "scene", "one", { shift: -2 }), 135)],
    ["brotherly-bond", X("Brotherly Bond", "day", 3, "charisma", "Lends one dot of an Attribute or Ability to another for the scene; the caster goes without it meanwhile.", T("boost", "Brotherly Bond", "scene", "one", { dice: 1 }), 136, { diff: 7 })],
    ["dominion-writ", X("Dominion Writ", "day", 3, "crafts", "Writes a cantrip onto parchment or carves it into a surface, to set off any time before the next noon. Other Dominions' cantrips are one harder.", null, 136, { diff: 7, weaving: 1, imbue: "writ" })],
    ["healing-heat", X("Healing Heat", "day", 3, "stamina", "Burns any poison out of the body and restores what it took; the pain leaves wound penalties for some hours. Three successes.", HL(1), 136, { need: 3 })],
    ["hearts-afire", X("Hearts Afire", "day", 3, "charisma", "A rallying call: one of the caster's troop a success adds a die to an attack this turn.", T("boost", "Hearts Afire", { turns: 1 }, "each", { on: "physical", dice: 1 }), 136)],
    ["law-of-the-land", X("Law of the Land", "day", 3, "law", "For a week, anyone who knowingly breaks the local fae ruler's law or an oath to a fae within a mile a success loses a Willpower point.", K("place", "self"), 136)],
    ["true-ardor", X("True Ardor", "day", 3, "charisma", "One person falls hopelessly in love with someone the caster names. Three successes; one harder if the beloved is out of sight.", T("bind", "True Ardor", "scene", "one"), 136, { diff: "willpower", need: 3, romance: true })],
    ["verdict", X("Verdict", "day", 3, "manipulation", "One direct command the target must obey even into danger, short of plain suicide: a week, a season, a year and a day, or for good.", T("sway", "Under a Verdict", { weeks: 1 }, "one"), 136, { diff: "willpower" })],
    ["flame-of-the-muse", X("Flame of the Muse", "day", 4, "appearance", "Burns a mortal's whole creative spark into one work: a die a success to make it, and nothing new ever after.", T("boost", "Flame of the Muse", "scene", "one", { on: "mental" }), 137)],
    ["last-stand", X("Last Stand", "day", 4, "stamina", "One warrior a success fights on without wound penalties or fear and with two more damage dice until the battle ends; then they take lethal harm equal to the caster's Weaving, unsoaked.", T("boost", "Last Stand", "scene", "each", { on: "physical", dice: 2 }), 137)],
    ["pure-form", X("Pure Form", "day", 4, "charisma", "For a turn a success the caster is the glory of the Mists: Mists in dots spread over Strength, Dexterity, Stamina and Wits, and three more Appearance.", T("boost", "Pure Form", { turns: 1 }, "self", { on: "physical" }), 137, { does: "pureform" })],
    ["oathbreakers-prison", X("Oathbreaker's Prison", "day", 4, "strength", "Seals one who broke an Iron, Stone or Gold Oath in amber, alive and unable to blink.", C("hold", "immobilized", "Sealed in amber", "scene", "one"), 137, { diff: "willpower" })],
    ["suns-crown", X("Sun's Crown", "day", 4, "charisma", "Up to two dozen loyal fighters in sight gain a die on Dexterity rolls for the scene, a Willpower point and a success on morale.", [T("boost", "Sun's Crown", "scene", "each", { on: "physical", dice: 1 }), P("willpower", 1, "each", { fixed: true })], 137, { diff: 7 })],
    ["face-of-the-sun", X("Face of the Sun", "day", 5, "charisma", "A shout wraps a ship, keep or hilltop in true sunlight, ten feet across a success, for the scene; it melts metal and burns any who cross it.", [K("light", "self"), H("harm", 2, "aggravated", { who: "all", ask: true })], 137, { diff: 7, willpower: 1 })]
];

/* -- Night (pp. 140-145) ----------------------------------------------------------------------------------------- */
const NIGHTL = [
    ["black-and-blue", X("Black and Blue", "night", 1, "brawl", "A touch raises bruises: a bashing level a success, soaked as usual.", H("harm", 1, "bashing"), 140)],
    ["blight-garden", X("Blight Garden", "night", 1, "wits", "A sudden frost kills a garden plot about ten feet square.", K("place", "self"), 140)],
    ["embrace-the-nights-chill", X("Embrace the Night's Chill", "night", 1, "stamina", "The caster stops caring about the cold for the scene: one success with plain clothes, three with none. The skin goes cold to the touch.", S("free"), 140)],
    ["gloom", X("Gloom", "night", 1, "wits", "A patch of darkness the size of a cart, for the scene.", K("light", "self", { dark: true }), 141)],
    ["hush", X("Hush", "night", 1, "manipulation", "Silences one person or beast: the tongue and throat will not work for a while by the successes.", S("free"), 141)],
    ["mindveil", X("Mindveil", "night", 1, "wits", "Shields the caster's thoughts: each success takes one from a mind-reader's roll, who hears only the surf.", T("ward", "Mindveil", "scene", "self", { against: "mind" }), 141)],
    ["night-sounds", X("Night Sounds", "night", 1, "survival", "The creaks and cries of night grow loud for one person within hail: Perception one higher for the scene.", T("boost", "Night Sounds", "scene", "one", { on: "mental", dice: 1 }), 141)],
    ["owl-eyes", X("Owl Eyes", "night", 1, "perception", "The caster sees in the dark as by day for the scene; the eyes glow pale silver.", T("sight", "Owl Eyes", "scene", "self"), 141)],
    ["paranoia", X("Paranoia", "night", 1, "subterfuge", "The target hears slights and sees betrayal everywhere, a day a success.", T("sway", "Paranoia", { days: 1 }, "one"), 141, { diff: "willpower" })],
    ["still-of-the-night", X("Still of the Night", "night", 1, "wits", "Moves without a sound for the scene, until the caster speaks up or attacks unseen.", T("veil", "Still of the Night", "scene", "one"), 141)],
    ["veil-of-tears", X("Veil of Tears", "night", 1, "strength", "A flood of tears blinds the target for a moment: the caster acts first next turn.", C("hold", "blinded", "Blinded by tears", { turns: 1 }, "one"), 141)],
    ["weariness", X("Weariness", "night", 1, "manipulation", "Saps the target: every roll one harder for the scene; with five successes Willpower drops by one too.", T("fortune", "Weariness", "scene", "one", { curse: true, shift: 1 }), 141, { diffFrom: "stamina+3" })],
    ["blight-field", X("Blight Field", "night", 2, "wits", "As Blight Garden over 400 square feet, doubled for every success past the first.", K("place", "self"), 141)],
    ["clouded-vision", X("Clouded Vision", "night", 2, "wits", "A dark frost on the target's eyes: Dexterity and sight rolls two harder for the scene.", T("fortune", "Clouded Vision", "scene", "one", { curse: true, shift: 2 }), 142)],
    ["dreamtongue", X("Dreamtongue", "night", 2, "manipulation", "Speaks into a sleeper's dreams to leave messages; the caster holds something of theirs.", K("speak", "one"), 142, { diff: "willpower" })],
    ["ice-armor", X("Ice Armor", "night", 2, "stamina", "A shell of biting ice for the scene: a soak die a success against every harm, and two lethal dice a turn to anyone touching the caster.", T("ward", "Ice Armor", "scene", "self"), 142)],
    ["lesser-hounds-of-hell", X("Lesser Hounds of Hell", "night", 2, "intimidation", "Two black hounds a success bay and menace a foe for the scene without biting.", [T("summon", "Lesser Hounds of Hell", "scene", "self"), T("fear", "Harried by hounds", "scene", "one")], 142)],
    ["night-terror", X("Night Terror", "night", 2, "manipulation", "A night of dreams the target cannot wake from; the next day Dexterity and Wits rolls are two harder.", T("fortune", "After a night terror", { days: 1 }, "one", { curse: true, shift: 2 }), 142, { diff: "willpower" })],
    ["nightshade", X("Nightshade", "night", 2, "wits", "Darkness over a feast hall's worth of ground for the scene; all inside are blind.", K("light", "self", { dark: true }), 142)],
    ["rain-strike", X("Rain-Strike", "night", 2, "stamina", "A blast of icy rain: the target loses three dice from every pool, a turn a success.", T("boost", "Rain-Strike", { turns: 1 }, "one", { sap: true, on: "all", dice: 3 }), 142, { diff: "willpower" })],
    ["salmons-breath", X("Salmon's Breath", "night", 2, "stamina", "Breathes water like air for the scene; gill slits open on the neck.", S("free"), 142)],
    ["scare", X("Scare", "night", 2, "intimidation", "Terror: the target only defends (dodge, parry, run) for a turn a success.", T("fear", "Scared", { turns: 1 }, "one"), 142, { diff: "willpower" })],
    ["stillness", X("Stillness", "night", 2, "intimidation", "Freezes a foe in place with a stare, a turn a success, even unseen.", C("hold", "dazed", "Frozen by a stare", { turns: 1 }, "one"), 143, { diff: "willpower" })],
    ["winters-glamour", X("Winter's Glamour", "night", 2, "wits", "The caster becomes an inky shadow for an hour a success; searchers must beat the successes on Perception + Alertness (8).", T("veil", "Winter's Glamour", { seconds: 3600 }, "self"), 143)],
    ["blight-acres", X("Blight Acres", "night", 3, "wits", "Kills one named crop on an acre, doubling with each success after the first.", K("place", "self"), 143, { diff: 7 })],
    ["freeze-death", X("Freeze Death", "night", 3, "stamina", "Halts dying a night a success: bleeding, poison and sickness stop, wound penalties go, but wounds stay open.", T("boost", "Freeze Death", { days: 1 }, "one", { on: "all", dice: 1 }), 143, { does: "freezedeath" })],
    ["midnights-domain", X("Midnight's Domain", "night", 3, "wits", "In the caster's own holding: one change to gravity, motion or cold a roll (walk on walls, freeze the hall), held as long as wished.", K("place", "self"), 143)],
    ["shriek", X("Shriek", "night", 3, "stamina", "A scream at up to three foes in earshot: a lethal level a success each; unsoaked harm deafens for the scene.", H("harm", 1, "lethal", { who: "each" }), 143)],
    ["silent-brethren", X("Silent Brethren", "night", 3, "manipulation", "As Hush on one target a success, the hours shared among them.", S("free"), 143, { diff: 7 })],
    ["true-apathy", X("True Apathy", "night", 3, "charisma", "The target falls out of love with one person and is cool toward them. Three successes; it undoes True Ardor.", T("bind", "True Apathy", "scene", "one"), 144, { diff: "willpower", need: 3 })],
    ["winters-shadows", X("Winter's Shadows", "night", 3, "wits", "As Nightshade over a small keep, about 2,000 square feet; all inside are blind.", K("light", "self", { dark: true }), 144)],
    ["blindness", X("Blindness", "night", 4, "wits", "One target goes blind for good, until magical healing undoes it.", C("hold", "blinded", "Blinded by Night", "scene", "one"), 144, { diff: 7 })],
    ["haunting-curse", X("Haunting Curse", "night", 4, "charisma", "Curses a target to stay within 20 feet of this spot, unseen and unheard by mortals, a year a net success (resisted by Willpower at 8).", [C("hold", "immobilized", "Haunting Curse", "scene", "one"), T("veil", "Unseen by mortals", "scene", "one")], 144, { diff: 7 })],
    ["greater-hounds-of-hell", X("Greater Hounds of Hell", "night", 4, "animal ken", "Two hounds a success that bite: six dice to attack, five lethal dice of harm, for the scene.", T("summon", "Greater Hounds of Hell", "scene", "self"), 144)],
    ["grotesque", X("Grotesque", "night", 4, "manipulation", "Takes on a Lesser Feature a success (a Greater for two) for the scene, without risking Echoes for being seen.", T("shape", "Grotesque", "scene", "self"), 144)],
    ["nightmares", X("Nightmares", "night", 4, "empathy", "A night of terror a success; every next day costs two dice on every roll, adding up night by night.", T("boost", "Haunted by nightmares", { days: 1 }, "one", { sap: true, on: "all", dice: 2 }), 144, { diff: "willpower" })],
    ["soul-rime", X("Soul Rime", "night", 5, "empathy", "Lays utter despair on the heart: joy goes with one success, a wish for death with three, near-catatonia with five.", T("bind", "Soul Rime", "scene", "one"), 144, { diff: "willpower", willpower: 1 })]
];

/* -- Dawn (pp. 148-153) ------------------------------------------------------------------------------------------ */
const DAWNL = [
    ["beast-tongue", X("Beast Tongue", "dawn", 1, "charisma", "Talks with one animal, bird or insect, which answers as it sees things.", K("speak", "self"), 148)],
    ["brew-and-bread", X("Brew and Bread", "dawn", 1, "stamina", "Food or drink lowers the first eater's guard: Willpower two lower for the scene. A Mists point also gives them the Kenning.", T("boost", "Fae-touched food", "scene", "one", { sap: true, on: "willpower", dice: 2 }), 148)],
    ["earthen-refuge", X("Earthen Refuge", "dawn", 1, "strength", "A burrow opens to hide in; searchers need Perception + Alertness (8).", T("veil", "In an earthen refuge", "scene", "self"), 148)],
    ["faeries-fog", X("Faerie's Fog", "dawn", 1, "dexterity", "The caster's place blurs: Dodge and Stealth two easier for three turns.", T("fortune", "Faerie's Fog", { turns: 3 }, "self", { shift: -2 }), 148)],
    ["famine-to-feast", X("Famine to Feast", "dawn", 1, "wits", "Stones or berries seem a feast for a dozen until dawn, when the food and the full feeling vanish.", T("illusion", "Famine to Feast", "night", "self"), 148)],
    ["green-touch", X("Green Touch", "dawn", 1, "survival", "Flowers, moss or mushrooms spring from what the caster touches, five square feet a success.", K("place", "self"), 148)],
    ["hope", X("Hope", "dawn", 1, "empathy", "A touch gives another a good night's resolve: no fatigue penalties and a Willpower point. Once a sunrise each, never on the caster.", P("willpower", 1, "one", { fixed: true }), 148, { notSelf: true })],
    ["reveal", X("Reveal", "dawn", 1, "perception", "Sees through illusion and invisibility cantrips of levels one to three, and Chimerstry.", T("sight", "Reveal", "scene", "self", { seesVeil: 3 }), 148)],
    ["sleep", X("Sleep", "dawn", 1, "manipulation", "One person in sight (within five feet a Dawn dot) sleeps deeply until the next dawn; shaking can wake them.", C("hold", "incapacitated", "Asleep", "night", "one"), 148, { diff: "willpower" })],
    ["springs-urges", X("Spring's Urges", "dawn", 1, "charisma", "Arouses the target until the next dawn, resisted by Willpower (6) if they would refuse.", T("sway", "Spring's Urges", "night", "one"), 149, { romance: true })],
    ["thricetold-fortune", X("Thricetold Fortune", "dawn", 1, "wits", "Three broad, cryptic foretellings about a person, place or thing; three successes, the Storyteller rolls.", K("know", "one"), 149, { need: 3 })],
    ["weep", X("Weep", "dawn", 1, "empathy", "A gentle touch heals two bashing or one lethal level a success, the caster too.", HL(1), 149)],
    ["dawns-absolution", X("Dawn's Absolution", "dawn", 2, "intelligence", "A mortal forgets last night and wakes whole as if home in bed; it cannot undo death or a child conceived.", [K("bind", "one"), HL(2)], 149)],
    ["earths-armor", X("Earth's Armor", "dawn", 2, "stamina", "Stone skin for the scene: a soak die a success against every harm, a die more on the caster's fists, and bare-handed attackers bruise themselves.", T("ward", "Earth's Armor", "scene", "self"), 149, { once: "scene" })],
    ["earths-current", X("Earth's Current", "dawn", 2, "intelligence", "Points the way something sought has gone, like a compass.", K("sense", "self"), 150)],
    ["entice", X("Entice", "dawn", 2, "appearance", "The target follows the caster willingly, though not into plain harm. Three successes; fewer only draw them close to listen.", T("sway", "Enticed", "scene", "one"), 150, { diff: "willpower", need: 3 })],
    ["fruitful", X("Fruitful", "dawn", 2, "strength", "Makes one person, beast or field fertile, and lifts a lesser Night blight.", K("mend", "one"), 150)],
    ["immortal-tears", X("Immortal Tears", "dawn", 2, "wits", "As Weep, and an aggravated level for every two successes.", HL(1, { aggravated: true }), 150, { halfAggravated: true })],
    ["memory-of-stone", X("Memory of Stone", "dawn", 2, "perception", "Perfect recall of all seen and heard, an hour a success.", T("boost", "Memory of Stone", { seconds: 3600 }, "self", { on: "mental", dice: 2 }), 150)],
    ["morning-mist", X("Morning Mist", "dawn", 2, "stamina", "Thick fog about the caster: Perception two harder within five feet; the caster sees clearly.", K("weather", "self", { weather: "fog" }), 151)],
    ["mornings-grace", X("Morning's Grace", "dawn", 2, "expression", "Guides another to an idea: their next Mental roll is two easier.", T("fortune", "Morning's Grace", "scene", "one", { shift: -2, once: true }), 151, { diff: "willpower" })],
    ["obscure", X("Obscure", "dawn", 2, "manipulation", "Eyes slide off the caster: spotting them a success harder; past four successes they are unseen.", T("veil", "Obscured", "scene", "self"), 151)],
    ["slumber", X("Slumber", "dawn", 2, "manipulation", "As Sleep on up to three people near, lowest Willpower first.", C("hold", "incapacitated", "Asleep", "night", "each"), 151, { diff: "willpower" })],
    ["strength-of-the-oak", X("Strength of the Oak", "dawn", 2, "strength", "A Strength dot a success, ten at most, for the scene. Once a scene.", T("boost", "Strength of the Oak", "scene", "self", { on: "physical" }), 151, { once: "scene" })],
    ["bog", X("Bog", "dawn", 3, "perception", "A stinking bog at a foe's feet, a target a turn a success; once out they move at half speed until washed.", C("hold", "held", "Stuck in a bog", { turns: 1 }, "each"), 151, { diff: 7 })],
    ["dawns-revelation", X("Dawn's Revelation", "dawn", 3, "perception", "Sees through any illusion or invisibility of any level for a turn a success; what is pierced stays pierced.", T("sight", "Dawn's Revelation", { turns: 1 }, "self", { seesVeil: 5 }), 151)],
    ["delving", X("Delving", "dawn", 3, "perception", "Learns what kind of being the target truly is, if in a roundabout way.", K("know", "one"), 151, { diff: "willpower" })],
    ["ruins-to-refuge", X("Ruins to Refuge", "dawn", 3, "wits", "A heap of rocks seems a small dry stone keep until dawn. Three successes.", T("illusion", "Ruins to Refuge", "night", "self"), 151, { need: 3 })],
    ["sight-unseen", X("Sight Unseen", "dawn", 3, "wits", "Unseen with one success, unscented too with two, unheard as well with three, until the caster ends it.", T("veil", "Sight Unseen", "scene", "self"), 151)],
    ["storm-and-stress", X("Storm and Stress", "dawn", 3, "stamina", "A thunderstorm over a square mile for an hour: travellers seek shelter, rivers rise, and with three successes the wind batters those outdoors.", K("weather", "self", { weather: "storm" }), 152)],
    ["tomorrows-tale", X("Tomorrow's Tale", "dawn", 3, "perception", "A clearer look at the target's future: an impression, a fact, a precise telling, as much as wished.", K("know", "one"), 152)],
    ["aid-of-the-wood", X("Aid of the Wood", "dawn", 4, "charisma", "Up to 20 trees help: they carry the caster branch to branch, shelter them (two soak dice), or strike foes for four to twelve dice.", [T("ward", "Sheltered by the wood", "scene", "self", { dice: 2 }), T("summon", "The trees answer", "scene", "self")], 152, { diff: 7 })],
    ["come-hither", X("Come Hither", "dawn", 4, "appearance", "As Entice, but the target follows anywhere, over a cliff if the caster walks off one. Three successes, for the scene.", T("sway", "Come Hither", "scene", "one"), 152, { diff: "willpower", need: 3 })],
    ["dawns-domain", X("Dawn's Domain", "dawn", 4, "perception", "After a day in a place: a day a success, the caster knows who comes with hostile intent within ten miles, and gains a Bruised level a success.", [T("ward", "Dawn's Domain", { days: 1 }, "self"), K("sense", "self")], 152)],
    ["storms-fray", X("Storm's Fray", "dawn", 4, "stamina", "A great storm, three square miles a success: hail with two, and with three up to 20 targets take bashing dice of three times the caster's Dawn (lethal with four).", [K("weather", "self", { weather: "storm" }), H("harm", 1, "bashing", { who: "all", ask: true })], 153, { diff: 7 })],
    ["wooden-arsenal", X("Wooden Arsenal", "dawn", 4, "melee", "For the scene any wood the caster touches becomes the weapon wanted (arrows with Archery); its harm is lethal.", K("make", "self", { thing: "a wooden weapon" }), 153)],
    ["fortune-weaving", X("Fortune Weaving", "dawn", 5, "manipulation", "Blesses or curses a life: successes split between how great (a nuisance to life-changing) and how long (a season to seven generations).", T("fortune", "Fortune Woven", { weeks: 13 }, "one"), 153)]
];

/* -- Dusk (pp. 156-162) ------------------------------------------------------------------------------------------ */
const DUSKL = [
    ["amends", X("Amends", "dusk", 1, "intimidation", "The target blurts a short apology for something done, even a secret.", K("know", "one"), 156, { diff: "willpower" })],
    ["broken-mirror", X("Broken Mirror", "dusk", 1, "manipulation", "The target stops knowing their own face: Willpower rolls one harder with one or two successes; childhood and kin forgotten with three; only a first name left with four. A month.", T("fortune", "Broken Mirror", { weeks: 4 }, "one", { curse: true }), 156, { diff: "willpower" })],
    ["soar", X("Soar", "dusk", 1, "dexterity", "A great leap: two feet across or a foot up a success, beyond the usual jump.", T("rise", "Soar", { turns: 1 }, "self"), 157, { diff: 4 })],
    ["spectral-whispers", X("Spectral Whispers", "dusk", 1, "wits", "Talks with ghosts and spirits in any tongue for the scene, if they will listen.", K("speak", "self"), 157)],
    ["speed-of-the-wind", X("Speed of the Wind", "dusk", 1, "dexterity", "An extra action a turn for a turn a success, or the successes times the usual speed for a turn.", T("hasten", "Speed of the Wind", { turns: 1 }, "self", { actions: 1 }), 157)],
    ["spirit-track", X("Spirit Track", "dusk", 1, "perception", "Finds ghosts and spirits near, or those that passed within the hour, an hour a success.", K("sense", "self"), 157)],
    ["steal-breath", X("Steal Breath", "dusk", 1, "stamina", "Sucks the air from up to three close targets: a bashing level a success, and a Stamina roll to act this turn or next.", H("harm", 1, "bashing", { who: "each" }), 157)],
    ["study-facade", X("Study Facade", "dusk", 1, "perception", "Reads the target's passing thoughts and chief worries, never their secrets.", K("know", "one"), 157, { diff: "willpower" })],
    ["twilight-shadows-reach", X("Twilight Shadow's Reach", "dusk", 1, "dexterity", "Reaches through shadow ten feet a success to take or place something light; never to attack.", K("work", "self"), 157)],
    ["unlock", X("Unlock", "dusk", 1, "intelligence", "Opens a door, window or box held by ordinary means.", K("work", "self"), 157)],
    ["whispered-past", X("Whispered Past", "dusk", 1, "wits", "A hazy reading of a person's, place's or thing's past. Three successes.", K("know", "one"), 157, { need: 3 })],
    ["words", X("Words", "dusk", 1, "linguistics", "Speaks, writes and reads one human tongue, an hour a success.", T("speak", "Words", { seconds: 3600 }, "self"), 157)],
    ["barren", X("Barren", "dusk", 2, "strength", "One person or a garden bears no young or seed.", K("place", "one"), 158)],
    ["befriend-spirit", X("Befriend Spirit", "dusk", 2, "charisma", "Social rolls with ghosts and spirits two easier for the scene.", T("fortune", "Befriend Spirit", "scene", "self", { shift: -2 }), 158)],
    ["daunting-distance", X("Daunting Distance", "dusk", 2, "stamina", "The caster and up to two others move twice as fast for the scene.", T("hasten", "Daunting Distance", "scene", "each", { speed: 2 }), 158)],
    ["evening-mist", X("Evening Mist", "dusk", 2, "stamina", "A dense fog about the caster: sight rolls two harder within five feet.", K("weather", "self", { weather: "fog" }), 158)],
    ["forgotten", X("Forgotten", "dusk", 2, "wits", "The owner of a stolen thing forgets it: a day, a week, a month, a year and a day, or for good.", T("bind", "Forgotten", { days: 1 }, "one"), 158)],
    ["leaf-in-the-wind", X("Leaf in the Wind", "dusk", 2, "strength", "A gust lifts up to two close foes and sets them down elsewhere in sight, out of reach of blows.", K("move", "each"), 158)],
    ["lesser-elfshot", X("Lesser Elfshot", "dusk", 2, "dexterity", "An unseen dart out to 20 yards: a lethal level a success; armour does not help, an aware target may dodge.", H("harm", 1, "lethal"), 158)],
    ["mourning", X("Mourning", "dusk", 2, "manipulation", "The target takes to bed weeping over a misdeed: until the next sunset, a week, a season, or a year and a day.", T("boost", "Mourning", { days: 1 }, "one", { sap: true, on: "all", dice: 2 }), 158, { diff: "willpower" })],
    ["transport", X("Transport", "dusk", 2, "intelligence", "Steps up to ten feet in any direction, unseen in between.", MV(), 159)],
    ["twilights-glamour", X("Twilight's Glamour", "dusk", 2, "wits", "A form of shifting shadow: each success takes one from sight rolls to see the caster, until the next Dusk hour.", T("veil", "Twilight's Glamour", { days: 1 }, "self"), 159)],
    ["waylaid-traveler", X("Waylaid Traveler", "dusk", 2, "wits", "Up to six people, one a success, wander in circles until sundown, blind to their own landmarks.", T("fortune", "Waylaid", { days: 1 }, "each", { curse: true }), 159, { diff: "willpower" })],
    ["wind-armor", X("Wind Armor", "dusk", 2, "dexterity", "A whirlwind for the scene: every physical attack on the caster loses a success a success, as a dodge.", T("ward", "Wind Armor", "scene", "self"), 159)],
    ["atoning", X("Atoning", "dusk", 3, "manipulation", "For a willful slight, the target serves the caster: a week, a season, a year and a day, or until released.", T("sway", "Atoning", { weeks: 1 }, "one"), 159, { diff: "willpower" })],
    ["grace-of-the-shadows", X("Grace of the Shadows", "dusk", 3, "dexterity", "Fades for an instant to dodge one attack the caster sees coming.", T("ward", "Grace of the Shadows", { turns: 1 }, "self", { dice: 5 }), 159, { diff: 8 })],
    ["journey", X("Journey", "dusk", 3, "intelligence", "As Transport, with up to three others, up to 20 feet.", MV(), 159)],
    ["unchaining", X("Unchaining", "dusk", 3, "intelligence", "As Unlock, and magical locks open too.", K("work", "self"), 159)],
    ["unspoken-vow", X("Unspoken Vow", "dusk", 3, "manipulation", "All who shared a deed can never tell of it; to speak takes Willpower against the caster's roll and lethal harm equal to the caster's Dusk.", K("bind", "all"), 159, { diffFrom: "5+people" })],
    ["winds-eyes", X("Wind's Eyes", "dusk", 3, "perception", "Looks down from 20 feet above, like a bird, a turn a success.", K("sense", "self"), 160)],
    ["yesterdays-tale", X("Yesterday's Tale", "dusk", 3, "perception", "A clear look at the target's past: an impression, a fact, a precise account, as much as wished.", K("know", "one"), 161)],
    ["bauble-of-the-mind", X("Bauble of the Mind", "dusk", 4, "charisma", "Draws a minute of memory a success into a gem or parchment, seen by any who hold it with Perception + Kenning.", K("make", "self", { thing: "a bauble holding a memory" }), 161, { diff: 6 })],
    ["cloud-dancing", X("Cloud-Dancing", "dusk", 4, "strength", "Flies at a run on the wind, an hour a success, and can rest on fog or smoke.", T("rise", "Cloud-Dancing", { seconds: 3600 }, "self", { feet: 60 }), 161)],
    ["falls-curse", X("Fall's Curse", "dusk", 4, "wits", "Withers an arm or a leg for three weeks: two dice off Dexterity rolls, half speed for a leg.", C("hold", "crippled", "Fall's Curse", { days: 21 }, "one"), 161, { diff: 7 })],
    ["greater-elfshot", X("Greater Elfshot", "dusk", 4, "dexterity", "An arrow out to 40 yards: an aggravated level a success.", H("harm", 1, "aggravated"), 161)],
    ["memory-of-trees", X("Memory of Trees", "dusk", 4, "perception", "Touching a tree, sees what passed within a hundred yards since it was a seedling; coming back takes Willpower (3 + successes).", K("know", "self"), 161)],
    ["second-chance", X("Second Chance", "dusk", 5, "wits", "Turns back the clock to the start of this turn; the caster acts first and others repeat their rolls until something changes.", T("hasten", "Second Chance", { turns: 1 }, "self", { actions: 1 }), 162, { weaving: 1, willpower: 1 })]
];

export const CANTRIPS = Object.fromEntries([...COMMON, ...DAYL, ...NIGHTL, ...DAWNL, ...DUSKL]);
export const IDS = Object.keys(CANTRIPS);

const slug = s => String(s ?? "").toLowerCase().replace(/[’']/g, "").replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const BY = {};
for (const [id, c] of Object.entries(CANTRIPS)) { (BY[`${c.dominion}:${slug(c.name)}`] ??= id); (BY[slug(c.name)] ??= id); }

/** The preset a sheet line names: by Dominion and name first, then by name alone. */
export function presetOf(name, dominion = null) {
    const s = slug(name);
    // a common cantrip by its plain name ("Sword", "Mantle") is that Dominion's own version
    const id = (dominion && BY[`${dominion}:${s}`]) || (dominion && CANTRIPS[`${s}-${dominion}`] ? `${s}-${dominion}` : null) || BY[s] || (CANTRIPS[s] ? s : null);
    if (!id) return null;
    const c = CANTRIPS[id];
    if (dominion && c.dominion !== dominion) {
        // A common cantrip learnt in another Dominion is that Dominion's own version
        if (c.common) { const alt = `${c.common}-${dominion}`; return CANTRIPS[alt] ? { id: alt, ...CANTRIPS[alt] } : null; }
        return null;
    }
    return { id, ...c };
}

/** The presets of a Dominion at or below a level, in level order. */
export const presetsFor = (dominion, upTo = 5) => Object.entries(CANTRIPS).filter(([, c]) => c.dominion === dominion && c.level <= upTo)
    .sort((a, b) => a[1].level - b[1].level || a[1].name.localeCompare(b[1].name)).map(([id, c]) => ({ id, ...c }));

/** The keywords the preset's effect carries (for the sheet line and NPC choice). */
export const keywordsOf = c => [...new Set((Array.isArray(c?.spec) ? c.spec : c?.spec ? [c.spec] : []).filter(s => s.kind !== "st" && s.kind !== "note").map(s => s.kw).filter(Boolean))];

/** The sheet's record for a preset: what fae-da.js keeps in its cantrips list. */
export const asCantrip = id => {
    const c = CANTRIPS[id];
    return c ? { dominion: c.dominion, level: c.level, name: c.name, trait: c.trait, kw: keywordsOf(c), preset: id } : null;
};

/** The difficulty the preset sets before the Court and clock modifiers: its number, or the target's Willpower. */
export function baseDifficulty(c, { targetWillpower = null, targetStamina = null, people = 0 } = {}) {
    if (!c) return 6;
    if (c.diff === "willpower") return Math.max(3, Math.min(10, Number(targetWillpower) || 6));
    if (c.diffFrom === "stamina+3") return Math.max(3, Math.min(10, (Number(targetStamina) || 2) + 3));
    if (c.diffFrom === "5+people") return Math.max(3, Math.min(10, 5 + (Number(people) || 1)));
    return Number(c.diff) || 6;
}

/** Does the roll meet what the cantrip needs: {ok, why}. */
export function meets(c, successes) {
    const need = Number(c?.need) || 1;
    return Number(successes) >= need ? { ok: true, why: "" } : { ok: false, why: `${c.name} needs ${need} successes` };
}

/** What the cantrip does on the effects card with its successes: [{key, who, ask?, st?, out}]. */
export function presetResults(id, successes, { source = "" } = {}) {
    const c = CANTRIPS[id];
    const s = Number(successes) || 0;
    if (!c || !meets(c, s).ok) return [];
    let res = outcomesOf(c.spec, { label: c.name, source: source || `${REF} p. ${c.page}` }, s, c.fx);
    // Immortal Tears: an aggravated level for every two successes, not one a success
    if (c.halfAggravated) res = res.map(r => r.out?.kind === "heal" ? { ...r, out: { ...r.out, levels: Math.floor(s / 2), text: `heals ${Math.floor(s / 2)} aggravated level${Math.floor(s / 2) === 1 ? "" : "s"}` } } : r);
    return res;
}

export const pageOf = c => `${REF} p. ${c.page}`;
