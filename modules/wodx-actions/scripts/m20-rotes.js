/**
 * WoDX Actions (B7836): the rotes, Adjustments and Procedures of Mage: The Ascension 20th Anniversary Edition
 * (Chapter Ten, Part VIII, pp. 601-611), as ready-made Cast window presets. Short summaries in our own words with the
 * page. Pure: no Foundry calls.
 *
 *   Each   id, name, kind (Adjustment, Procedure or rote), spheres (the least the Effect needs, on the nine Spheres:
 *          the Technocracy's Data is Correspondence and Dimensional Science is Spirit), options (Spheres a mage may
 *          add), page, cast (coincidental or vulgar, as the book usually rules), text, and keywords: what the Cast
 *          window ticks when the rote is picked.
 * House readings (B7836): a rote's keywords are the nearest of the Cast window's; what they cannot hold (the hacking
 * roll Black Card allows, Hot-Shotting's lowered difficulty, the Bullet-Catch's dodge against gunfire, the lawn chair's
 * many limits) stays in the rote's text for the Storyteller. A rote with no near keyword is a Free Effect.
 */
const n = v => Number(v) || 0;

export const REF = "M20";

const R = (id, name, kind, spheres, page, cast, keywords, text, options = "") => ({ id, name, kind, spheres, page, cast, keywords, text, options });

export const ROTES = [
    // Enlightened Adjustments (pp. 601-603)
    R("blackcard", "Black Card", "Adjustment", { correspondence: 2, forces: 2, mind: 2 }, "p. 601", "coincidental", ["work"],
        "a little black box hooked into a security system lets the mage hack controls out of reach, so long as they are networked to where the box is; the hacking rolls are still made (Hacking, p. 403); the box makes it coincidental"),
    R("hotshotting", "Hot-Shotting", "Adjustment", { forces: 2 }, "pp. 601-602", "coincidental", ["free"],
        "a Crafts roll tunes a weapon to sound fearsome and hit harder: each success is one less difficulty on the next attack and an automatic success, spent on damage, more targets or intimidation; with Mind 2 a target whose Willpower the successes reach gives up",
        "Mind 2"),
    R("handsofdeath", "Hands of Death", "Adjustment", { life: 3 }, "p. 602", "coincidental", ["harm"],
        "trained blows break walls and bones: damage by the Damage or Duration chart with an automatic success from Forces; not aggravated while coincidental; Entropy 2 finds weak points (one less armour or soak a success), Prime 2 charges the fists for aggravated harm (vulgar)",
        "Forces 2 in place of Life 3, or both; Entropy 2; Prime 2"),
    R("rightclick", "Right-Click", "Adjustment", { mind: 3, correspondence: 3 }, "pp. 602-603", "coincidental", ["know"],
        "through a phone or implant, a look at someone or something brings up what the databases hold: one success surface data, two simple, three uncommon, four hidden, five classified, six or more all there is; each kind of sight added is one harder on perception; the data may be wrong",
        "Data 3 is essential; Forces 1, Life 1, Matter 1, Prime 1, Spirit 1 for more kinds of sight"),
    R("hypernarrative", "Hypernarrative Influence", "Adjustment", { mind: 4 }, "p. 603", "coincidental", ["sway"],
        "a stock line or trope pushes the target to play a role from the media (Manipulation + Art or Expression), usually for the scene; a failure, a botch or a savvy target sees the cliché; with Entropy 2 chance bends toward a dramatic twist the Storyteller picks",
        "Entropy 2"),
    // Technocratic Procedures (pp. 603-605)
    R("sanitize", "Sanitize Evidence", "Procedure", { matter: 2, forces: 2 }, "pp. 603-604", "vulgar", ["work"],
        "an extended roll, an hour of work a roll: each success turns ten pounds of evidence to energy; a botch brings Paradox at once, often a blast",
        "Prime 4 in place of Forces"),
    R("securescene", "Secure the Scene", "Procedure", { mind: 2, forces: 1, matter: 1 }, "pp. 604-605", "coincidental", ["fear", "sense"],
        "three successes (five or more for a large area) seal a place: Mind 2 urges people away, Mind 3 drives them off, and entering needs more Willpower successes than the agent scored; the scanners make finding evidence one easier; Forces 3 adds a blackout of light and sound for three more successes (vulgar unless in the dark)",
        "Mind 3; Forces 3"),
    R("dimensionbomb", "Dimension Bomb", "Procedure", { spirit: 3 }, "p. 605", "vulgar", ["free"],
        "a small bomb phased through the Gauntlet (difficulty the Gauntlet) goes off on the far side; a failure leaves it between worlds, harming both; with Forces 3 and Prime 2 each success not spent getting through is a level of Forces damage",
        "Forces 3 and Prime 2"),
    R("goldengunman", "Golden Gunman", "Procedure", { time: 3, forces: 2 }, "p. 605", "coincidental", ["hasten"],
        "two guns or blades at once: more actions with both hands without the usual penalties, each attack rolled and aimed as wished, with flips and leaps and no recoil; a botch is a cinematic disaster"),
    // Mystic Spells and Traditional Rotes (pp. 607-611)
    R("bulletcatch", "The Bullet-Catch", "rote", { forces: 2, life: 2, time: 2 }, "p. 607", "vulgar", ["ward"],
        "added to Arrow Cutting (p. 428), focused through Do: Dexterity + Do as a dodge, and more successes than the shooter catch the bullets; coincidental only where superhuman martial arts are accepted"),
    R("awaken", "Awaken the Inanimate", "rote", { spirit: 3 }, "pp. 607-608", "coincidental", ["imbue"],
        "an extended ritual (about five successes for a small thing, twenty or more for a big place or machine) wakes an object's spirit: it works better, does small favours, exists in the Umbra too and can go there with the mage; asking it for the uncanny is vulgar"),
    R("chainwhispers", "Chain of Whispers", "rote", { mind: 3, correspondence: 2 }, "p. 608", "coincidental", ["sway"],
        "a scandal told to a friend compels its telling: each success makes two more people pass it on, and gossip keeps it going after; a Willpower roll resists the urge; coincidental unless plainly absurd"),
    R("brightpenny", "Penny Dreadful's Bright New Penny", "rote", { matter: 3, prime: 2, time: 2 }, "p. 608", "coincidental", ["make"],
        "rubbish restored to what it once was: Matter 3 repairs it, Matter 4 remakes it from nothing; simple things are easy, a fine restoration or a fresh conjuring needs three successes or more; vulgar if seen to appear",
        "Matter 4"),
    R("psychicinterface", "Psychic Interface", "rote", { mind: 3, correspondence: 2, forces: 2 }, "pp. 608-609", "coincidental", ["know", "work"],
        "the mind alone reaches computers: read and change data, run systems, surge or short them with Forces; Mind 4 enters the Digital Web without hardware (vulgar); needs Computer 4 with a Psychic Interface specialty and Meditation 3; quiet access is coincidental",
        "Mind 4; Spirit 2 in place of Data"),
    R("talons", "Talons", "rote", { life: 3 }, "pp. 609-610", "vulgar", ["shape"],
        "claws grown from the fingers: lethal harm and the Claw manoeuvre; Life 4 grows them on another, Matter 2 works in steel or bone, Prime 2 makes the harm aggravated",
        "Life 4; Matter 2; Prime 2"),
    R("witchsvengeance", "Witch's Vengeance", "rote", { entropy: 4 }, "p. 610", "vulgar", ["harm"],
        "a poppet or image torn, burned or melted: Entropy rots the victim, Life wrecks the body, Life with Time ages it (Feats of Time Magick); without a dot of Correspondence for every dot of the harming Sphere the mage must touch the victim",
        "Life 3 or Life 3 with Time 3 in place of Entropy; Correspondence (Data) for range"),
    R("lawnchair", "The Notorious Vampiric Lawn Chair", "rote", { life: 5, matter: 5 }, "pp. 610-611", "vulgar", ["shape"],
        "a vampire made into furniture: always vulgar, against Night-Folk countermagic (p. 546), with enough successes to take it to Incapacitated (four or more), more for it to last; the vampire stays aware, can undo it with a blood point a success, frenzies at 8, and its kind hunt the mage for ever")
];

/** Why a rote with no near keyword only shows its card (the powers inventory's story reason). */
export const STORY = {
    hotshotting: "M20 pp. 601-602: a lower difficulty on the next attack and successes split as the player likes; WoDX keeps no next-attack bonus",
    dimensionbomb: "M20 p. 605: a bomb sent through the Gauntlet goes off on the far side; WoDX does not track the Umbra's side of a fight"
};

/** A book rote as the Cast window's rote (the shape effects-rules.js roteFrom makes), with its page in the name. */
export function presetOf(r) {
    if (!r) return null;
    return { name: `${r.name} (${REF} ${r.page})`, keywords: [...r.keywords], spheres: { ...r.spheres }, plan: { targets: 0, duration: 0, area: false }, ctx: {},
        kind: r.cast === "vulgar" ? "vulgar" : "coincidental", feat: 0, book: r.id, text: `${r.text}.${r.options ? ` Options: ${r.options}.` : ""}` };
}

/** Can a mage with these Spheres cast it? Every Sphere it needs at that level or more. */
export const castable = (r, known = {}) => !!r && Object.entries(r.spheres).every(([s, v]) => n(known[s]) >= n(v));

/** The book rotes a mage with these Spheres can cast, as Cast window presets. */
export const bookRotes = (known = {}) => ROTES.filter(r => castable(r, known)).map(presetOf);

/** The book rote a name points to ("Talons", "Talons (M20 pp. 609-610)"), or null. */
export function roteOf(v) {
    const s = String(v ?? "").toLowerCase().replace(/\(.*\)/, "").replace(/[^a-z]/g, "");
    return ROTES.find(r => r.name.toLowerCase().replace(/[^a-z]/g, "") === s) ?? null;
}
