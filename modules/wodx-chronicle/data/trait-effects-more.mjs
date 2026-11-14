/**
 * The no-effect audit (B3780-B3782): merits and flaws that had no automatic effect get one. Read page by page against
 * the books (V20 core, V20 Dark Ages, W20 Changing Breeds, M20 Book of Secrets, C20, Hunters Hunted II, Mummy 2nd);
 * the notes are WoDX's own words. trait-effects.mjs folds these into its table when it loads.
 *
 *   MORE_EFFECTS  key -> effects added to the entry, in the table's own form. `tick` (B3780) is the label of a box the
 *                 roll window offers when the roll cannot tell the situation itself ("the other side shares your
 *                 Nature"); `need` limits it to rolls of those kinds (any one of them).
 *   MORE_PROMPTS  key -> a card to the Storyteller at the moment the trait matters, as PROMPTS (pattern P11).
 *   RENAMES       key -> the book's own spelling, for names the OCR spoiled (B3782, Ben 2026-11-14). The old spelling
 *                 stays an alias, so sheets written with it still match.
 */

const tick = (key, label, fx) => ({ch: "roll", tags: [key], tick: label, ...fx});

export const MORE_EFFECTS = {
  // V20 core, printed pp. 484-494
  "introspection": [tick("same-nature", "The other side shares the character's Nature or Demeanor", {need: ["perception"], dice: 2, note: "+2 dice on Perception against someone of the same Nature or Demeanor"})],
  "stereotype": [{ch: "roll", tags: ["social"], againstKinds: ["kindred"], diff: 2, note: "+2 difficulty on Social rolls with other vampires"}],
  "sabbat-survivor": [tick("sabbat-matter", "It concerns the Sabbat (an ambush, a pack, a recruiter)", {need: ["perception"], diff: -1, note: "-1 difficulty on Perception about the Sabbat"})],
  "scholar-of-enemies": [
    tick("studied-enemy", "It concerns the enemy the character has studied (not a fight roll)", {diff: -2, note: "-2 difficulty on rolls about the studied enemy, outside combat"}),
    tick("other-enemy", "It concerns some other enemy of the sect", {diff: 1, note: "+1 difficulty with enemies the character has not studied"})],
  "rising-star": [tick("own-sect", "With a vampire of the character's own sect who does not oppose their rise", {need: ["social"], diff: -1, note: "-1 difficulty on Social rolls with the sect"})],
  "clan-friendship": [tick("friendly-clan", "A friendly approach to a member of the clan that favours the character", {need: ["social"], diff: -2, note: "-2 difficulty on friendly Social rolls with that clan"})],
  "escaped-target": [
    tick("got-away", "The one who took the character's chosen mortal is in sight", {need: ["frenzy"], diff: 2, note: "+2 difficulty to hold off frenzy before the rival"}),
    {ch: "roll", tags: ["charisma"], diff: 1, note: "+1 difficulty on Charisma rolls until it is settled"}],
  "uppity": [tick("alienated", "With a vampire the character has offended by bragging", {need: ["social"], diff: 2, note: "+2 difficulty on Social rolls with those offended"})],
  "laughingstock": [
    {ch: "roll", tags: ["social"], againstKinds: ["kindred"], diff: 1, note: "+1 difficulty on Social rolls with the city's Kindred"},
    tick("in-elysium", "In Elysium", {need: ["social"], diff: 1, note: "a further +1 difficulty in Elysium"}),
    tick("heard-mockery", "Intimidating someone who has heard the mocking stories", {need: ["intimidation"], diff: 2, note: "+2 difficulty to intimidate those who know the stories"})],
  // V20 Dark Ages, printed pp. 422-427
  "animate-shadow": [tick("lasombra-aware", "With a Lasombra who knows of the shadow", {need: ["social"], dice: -2, note: "-2 dice on Social rolls with Lasombra who know of it"})],
  // W20 Changing Breeds, printed p. 209
  "unsure-footing": [{ch: "roll", tags: ["dexterity", "athletics", "brawl", "melee", "dodge"], diff: 2, note: "+2 difficulty on moving and fighting on land"}],
  // M20 Book of Secrets, printed pp. 37-78
  "poison-resistance": [tick("resist-poison", "Resisting a poison or a drug", {dice: 2, note: "+2 dice on Stamina against poisons and drugs"})],
  "easily-intoxicated": [tick("resist-poison", "Resisting a poison or a drug", {diff: 3, note: "+3 difficulty on Stamina against drugs and poisons"})],
  "hypersensitivity": [tick("sensation-detail", "Picking out the details of a taste, smell or touch", {need: ["perception"], diff: -2, note: "-2 difficulty to read a sensation"})],
  "prestige": [tick("own-group", "Influencing someone of the character's own Tradition, Convention or sect", {need: ["social"], dice: 3, note: "+3 dice on Social rolls within the group"})],
  "bardic-gift": [{ch: "roll", tags: ["art"], diff: -2, note: "-2 difficulty on Art rolls"}],
  "faerie-affinity": [{ch: "roll", tags: ["social"], againstKinds: ["fae"], diff: -2, note: "-2 difficulty on Social rolls with changelings"}],
  "celestial-affinity": [tick("chosen-spirits", "Summoning or bargaining with the chosen kind of spirit (not binding or warding)", {diff: -2, note: "-2 difficulty to summon and bargain with them"})],
  "handsof-daedalus": [tick("machine-work", "Making, mending or changing a machine (not software)", {diff: -2, note: "-2 difficulty on work with machines"})],
  "spark-of-life": [tick("heal-other", "Healing someone else", {diff: -2, note: "-2 difficulty to heal another"})],
  // C20, printed pp. 177-186 and 444
  "wheelman": [tick("risky-driving", "A risky or hard manoeuvre at the wheel", {need: ["drive"], diff: -2, note: "-2 difficulty on hard driving"})],
  "crack-shot": [{ch: "roll", tags: ["ranged", "firearms", "archery"], diff: -1, note: "-1 difficulty on shots at no particular spot"}],
  "granite-skin": [{ch: "roll", tags: ["stealth"], diff: 1, note: "+1 difficulty to move quietly"}],
  "murderous-mien": [{ch: "roll", tags: ["intimidation"], againstKinds: ["fae"], diff: -3, note: "-3 difficulty to threaten or cow changelings"}],
  "surreal-beauty": [{ch: "roll", tags: ["appearance", "seduce"], againstKinds: ["fae"], diff: -3, note: "-3 difficulty to win a changeling over with looks"}],
  "sex-appeal": [{ch: "roll", tags: ["seduce"], diff: -3, note: "-3 difficulty where desire matters"}],
  "deformed": [tick("judged-by-looks", "With people who judge by looks", {need: ["social"], diff: 2, note: "+2 difficulty on Social rolls"})],
  "specific-interests": [tick("chosen-field", "A Mental roll in the character's chosen field", {diff: -2, note: "-2 difficulty on Mental rolls in the field"})],
  "heir-to-the-throne": [tick("invoking-title", "Invoking the claimed title", {need: ["social"], diff: -2, note: "-2 difficulty on Social rolls when the title is invoked"})],
  "foul-mouth": [tick("politeness", "Where politeness is needed", {need: ["social"], diff: 2, note: "+2 difficulty on Social rolls"})],
  "defaced": [tick("own-phylum", "With members of the character's own phylum", {need: ["social"], diff: 1, note: "+1 difficulty on Social rolls with the phylum (more at higher ratings, by the Storyteller)"})],
  // Hunters Hunted II, printed pp. 43-141
  "science-laboratory": [tick("in-lab", "Working in the laboratory", {need: ["investigation", "science"], diff: -2, note: "-2 difficulty on Investigation and Science in the lab"})],
  "isolated-upbringing": [tick("outside-society", "Outside the Society's own walls", {need: ["social"], dice: -1, note: "-1 die on Social rolls outside the Society"})],
  "religious-hysteria": [{ch: "roll", tags: ["social"], dice: -1, note: "-1 die on Social rolls"}],
  "siege-mentality": [tick("amateurs", "Dealing with outsiders to the character's line of work", {need: ["empathy", "investigation"], dice: -2, note: "-2 dice on Empathy and Investigation with amateurs"})],
  "cultural-chameleon": [tick("spot-outsider", "Picking out someone who does not belong", {dice: 2, note: "+2 dice to spot an outsider"})]
};

export const MORE_PROMPTS = {
  "useful-knowledge": {on: ["social"], text: "an older Kindred keeps the character close while the knowledge holds their interest, like a one-dot Mentor"},
  "true-love": {on: ["fight", "night"], text: "the thought of the beloved gives one automatic success on Willpower rolls (only a botch die cancels it)"},
  "nine-lives": {on: ["fight"], text: "a roll that would bring death is rolled again, using up one life each time; count what is left"},
  "flesh-eater": {on: ["feed"], text: "must eat the flesh too, or roll Willpower at 8 to keep the blood down"},
  "inferiority-complex": {on: ["social", "fight"], text: "+1 difficulty whenever the character has to take charge or answer for something"},
  "hyperfocus": {on: ["night"], text: "an hour of quiet focus on a mundane extended task adds a die to each of its rolls, three at most"},
  "intemperate": {on: ["social", "night"], text: "a Willpower roll to stop at one drink, one bet, one opinion"},
  "wyld-mind": {on: ["night"], text: "a Willpower roll at 4 for every roll of an extended action after the second"},
  "possessive": {on: ["social"], text: "someone using the character's things calls for a Willpower roll at 7; a botch means violence"},
  "combat-novice": {on: ["fight"], text: "violence calls for a Willpower roll at 7 or the character freezes or runs (five successes in a night ends it)"},
  "addicted-to-vampire-blood": {on: ["night", "feed"], text: "vitae within reach calls for a Self-Control roll, +1 difficulty for each week without it"},
  "psychic-feedback": {on: ["fight"], text: "after a Numina under strain, a Stamina + Awareness roll at 7 or +2 difficulty next turn"},
  "paradise-lost": {on: ["social", "night"], text: "a holy symbol, a church or a call for a miracle: Willpower at 7 or one die less on everything for the scene"},
  "non-standard-access": {on: ["night"], text: "once a story, classified information useful to the operation reaches the character"},
  "precognition": {on: ["night"], text: "a vision or a sign may come tonight, unbidden"},
  "gut-instincts": {on: ["fight"], text: "cannot be surprised: acts normally (defending only), or acts first when not surprised"},
  "soul-of-the-muse": {on: ["social"], text: "a maker in the character's presence works at -3 difficulty"},
  "chimerical-magnet": {on: ["night", "fight"], text: "chimera single the character out"}
};

export const RENAMES = {
  "onbondable": "Unbondable",
  "handsof-daedalus": "Hands of Daedalus",
  "ptsd": "PTSD",
  "can": "Because I Think I Can",
  "character-creation-and-traits-boon": "Boon",
  "newmerits-fascinating-gaze": "Fascinating Gaze",
  "giftof-thoth": "Gift of Thoth",
  "highpaintolerance": "High Pain Tolerance",
  "immunetodisease": "Immune to Disease",
  "immunetopoisons": "Immune to Poisons",
  "noblebearing": "Noble Bearing",
  "osirisgift": "Osiris' Gift",
  "seducttve": "Seductive",
  "newflaws-anachronism": "Anachronism",
  "ra-srest": "Ra's Rest",
  "soul-sreflection": "Soul's Reflection",
  "touch-of-death": "Touch of Death",
  "soothingvoice": "Soothing Voice",
  "offensivetoanimals": "Offensive to Animals",
  "the-ten-thousand-defjud": "Defiled",
  "luterate": "Illiterate"
};

/*
 * Part 2 (B3783-B3785): the traits on how people take the character, read against V20 core pp. 483-493, V20 Dark Ages
 * p. 427, W20 pp. 476-482, M20 Book of Secrets pp. 37-93, C20 pp. 180-187, Hunters Hunted II pp. 123-133 and
 * Mummy 2nd p. 68. Words are WoDX's own.
 */
export const MORE_EFFECTS_2 = {
  "feral-appearance": [{ch: "roll", tags: ["appearance"], againstKinds: ["lupine"], dice: 1, note: "+1 die on Appearance rolls with werewolves"}],
  "poker-face": [{ch: "roll", tags: ["intimidation", "subterfuge"], diff: -2, note: "-2 difficulty to intimidate or deceive with a blank face"}],
  "master-of-red-tape": [tick("bureaucracy", "Getting something done through an official system", {diff: -2, note: "-2 difficulty on dealings with the system"})],
  "red-tape": [tick("bureaucracy", "Getting something done through an official system", {diff: 2, note: "+2 difficulty on dealings with the system"})],
  "local-hero": [tick("own-community", "With the people of the character's own community", {need: ["social"], diff: -2, note: "-2 difficulty on Social rolls with the community"})],
  "hit-list": [tick("hunting-group", "With a member of the group that wants the character dead", {need: ["social"], diff: 2, note: "+2 difficulty on Social rolls with that group"})],
  "parfum-de-goat": [{ch: "roll", tags: ["social"], diff: 3, note: "+3 difficulty on Social rolls with anyone who can smell (satyrs and redcaps do not mind)"}],
  "good-listener": [tick("drawing-out", "Getting someone to tell what they know", {need: ["social", "perception"], diff: -2, note: "-2 difficulty to draw information out of someone"})],
  "your-best-advocate": [tick("own-deeds", "Telling of the character's own deeds, true or not", {need: ["social"], diff: -2, note: "-2 difficulty on Social rolls about the character's exploits"})],
  "voice-of-a-songbird": [tick("voice-inspire", "Singing, or speaking to inspire", {diff: -2, note: "-2 difficulty on singing and stirring speech"})],
  "fake-it": [tick("proving-claim", "Proving a boast the character's Subterfuge + Manipulation sold", {diff: -2, note: "-2 difficulty on the roll that proves the boast"})],
  "shrinking-violet": [tick("not-own-kind", "Not mostly among the character's own kind", {need: ["social"], diff: 2, note: "+2 difficulty on Social rolls away from their own"})],
  "living-legend": [tick("legend-known", "With someone who recognises the legend", {need: ["social"], diff: -2, note: "-2 difficulty on Social rolls when recognised"})],
  "camp-goodwill": [tick("friendly-camp", "With the camp that favours the character", {need: ["social"], diff: -1, note: "-1 difficulty on Social rolls with that camp"})],
  "notable-heritage": [tick("heritage-known", "In the society where the family line is known", {need: ["social"], diff: -1, note: "-1 difficulty on Social rolls in that society"})],
  "supporter": [{ch: "roll", tags: ["social"], diff: -2, note: "-2 difficulty on Social rolls (and +1 die to a group effort)"}],
  "naive": [tick("ill-intent", "Trying to tell whether someone means harm", {diff: 2, note: "+2 difficulty to sense ill intent"})],
  "ancestor-ally": [tick("close-ancestor", "Calling on the close ancestor through Ancestors", {diff: -2, note: "-2 difficulty to reach the ancestor"})],
  "embedded-agent": [tick("own-agency", "With members of the character's own agency", {need: ["empathy", "leadership", "investigation"], dice: 1, note: "+1 die on Empathy, Leadership and Investigation with the agency"})],
  "noblebearing": [tick("bearing", "The character can bring their presence to bear", {need: ["social"], diff: -2, note: "-2 difficulty on Social rolls"})],
  "seducttve": [{ch: "roll", tags: ["seduce"], diff: -2, note: "-2 difficulty on seduction"}],
  "soothingvoice": [tick("using-voice", "The roll rests on the voice (singing, debate, leading)", {dice: 2, note: "+2 dice when the voice carries it"})],
  "offensivetoanimals": [{ch: "roll", tags: ["animalken"], dice: -2, note: "-2 dice on actions with animals"}]
};

/**
 * How a trait moves an NPC's first regard, beyond the kind of being (attitudeSeed). group "same": the NPC shares the
 * character's sect, faction, tribe or kith; office: the NPC holds a seat or title; words: the NPC's groups or title hold
 * one of them; fromName: the words in brackets in the trait's own name, "Bigot (Tremere)".
 */
export const MORE_ATTITUDE = {
  "unconvinced": {delta: -1, group: "same", office: true},
  "elysium-regular": {delta: 1, againstKinds: ["kindred"], office: true},
  "lawmans-friend": {delta: 1, words: ["sheriff", "scourge", "bishop", "templar", "paladin", "hound"]},
  "sanctity": {delta: 1},
  "bishop-friendship": {delta: 2, group: "same", office: true},
  "expendable": {delta: -1, group: "same", office: true},
  "sympathizer": {delta: -1, group: "same", office: true},
  "catspaw": {delta: -1, group: "same", office: true},
  "former-prince": {delta: -1, words: ["prince"]},
  "probationary-sect-member": {delta: -2, againstKinds: ["kindred"], group: "same"},
  "repulsive-to-animals": {delta: -2, againstKinds: ["beast"]},
  "enchanting-feature": {delta: 1},
  "repulsive-feature": {delta: -1},
  "profiled-appearance": {delta: -1, againstKinds: ["mortal"]},
  "troublemaker": {delta: -1},
  "bigot": {delta: -1, fromName: true},
  "hit-list": {delta: -1, fromName: true},
  "camp-goodwill": {delta: 1, fromName: true},
  "parfum-de-goat": {delta: -1},
  "fallen-noble": {delta: -1, group: "same", office: true},
  "on-probation": {delta: -2, againstKinds: ["fae"]},
  "living-legend": {delta: 1, againstKinds: ["fae"]},
  "noted-messenger": {delta: 1, againstKinds: ["lupine"]},
  "noblebearing": {delta: 1}
};

export const MORE_PROMPTS_2 = {
  "disease-carrier": {on: ["feed", "night"], text: "one more blood point on waking or the sickness shows; a vampire who drinks has a one in ten chance to carry it"},
  "old-pal": {on: ["night"], text: "the old friend is a loyal ally, and expects the same back"},
  "incomplete-understanding": {on: ["social"], text: "the character may break a custom of the sect without knowing it"},
  "mistaken-identity": {on: ["social", "night"], text: "someone may take the character for the look-alike, for good or ill"},
  "recruitment-target": {on: ["night"], text: "the rival sect's recruiters may turn up, at the worst moment"},
  "special-responsibility": {on: ["night"], text: "the task the character took on calls for work tonight"},
  "loathsome-regnant": {on: ["night"], text: "the regnant may call the character to some humiliation"},
  "spirit-mentor": {on: ["night", "fight"], text: "the spirit guide can be asked for help and counsel"},
  "witch-hunted": {on: ["night"], text: "the people hunting the character may close in"},
  "diabolical-mentor": {on: ["night"], text: "the old mentor's plans may reach the character"},
  "double-agent": {on: ["social"], text: "the other side may call in the character's loyalty, or the cover may slip"},
  "officially-dead": {on: ["social"], text: "records show the character as dead; anyone from the old life is a risk"},
  "socially-networked": {on: ["night"], text: "followers online can give money, news or a bed almost anywhere"},
  "powerful-ally": {on: ["night"], text: "the mighty friend can be asked for aid, and wants something back"},
  "imperative": {on: ["night", "social"], text: "the geas binds: keeping it matters more than the scene"},
  "immortal-enemy": {on: ["night"], text: "the undying enemy may move against the character"},
  "benevolent-patron": {on: ["social"], text: "the patron keeps the character close while the interest holds, like a one-dot Mentor"},
  "dangerous-mentor": {on: ["night"], text: "the mentor's schemes may pull the character in or stain their name"},
  "oathbound": {on: ["night", "social"], text: "the oath must be kept, or dire things follow"},
  "ecclesial-rank": {on: ["social"], text: "the character holds church rank and can call on it within the hierarchy"},
  "sanctioned-witch": {on: ["social"], text: "the Society cannot punish the character's occult study, though many still despise it"},
  "ecumenist": {on: ["fight"], text: "the character can use other faiths' symbols and holy ground, and lets believers of different faiths pool True Faith"},
  "manchurian-candidate": {on: ["night"], text: "a trigger may set off the hidden orders"},
  "inter-agency-liaison": {on: ["night"], text: "the character can draw on both agencies' intelligence and resources"},
  "perfect-liar": {on: ["social"], text: "small, casual lies are believed without a roll; only mind reading catches them"},
  "subculture-insider": {on: ["social"], text: "insiders of the chosen subculture take the character for one of their own"},
  "self-confident": {on: ["fight", "social"], text: "Willpower spent for a success at difficulty six or more is kept unless that is the only success"},
  "overconfident": {on: ["fight"], text: "the character never backs down from a challenge, however outmatched"},
  "family-support": {on: ["night"], text: "the family knows and stands by the character"},
  "persistent-parents": {on: ["night"], text: "the parents' search may draw eyes to the character"},
  "twisted-upbringing": {on: ["social"], text: "what the character was taught about Garou ways is wrong and may cause trouble"},
  "trusty-companion": {on: ["night"], text: "each companion in the group gets one extra Willpower point a chapter while the character stands by them"},
  "character-creation-and-traits-boon": {on: ["social"], text: "someone owes the character a single favour"},
  "animalistic-favor": {on: ["fight"], text: "the animal feature's attack uses the standard pool"}
};

/* Part 3 (B3786-B3787): W20 core merits and flaws, printed pp. 472-485, read from the pages the PC pulled. */
export const MORE_EFFECTS_3 = {
  "alcohol-tolerance": [tick("drunk", "Shaking off drink or a natural drug (Stamina at 7)", {need: ["stamina"], diff: -1, note: "a Stamina roll at 7 throws off drink and natural drugs, not poisons or lab-made ones"})],
  "double-jointed": [tick("flexible", "Wriggling free or squeezing through", {diff: -2, note: "-2 difficulty where suppleness matters"})],
  "wolf-sight": [tick("night-or-motion", "Seeing at night, or spotting movement", {need: ["perception"], dice: 1, note: "+1 die on sight at night or for movement"})],
  "physically-impressive": [{ch: "roll", tags: ["intimidation"], dice: 1, note: "+1 die to intimidate"}],
  "animal-musk": [tick("indoors-crowd", "Indoors or in a crowd", {need: ["social"], diff: 2, note: "+2 difficulty on Social rolls indoors or in a crowd (wolves do not mind)"})],
  "expert-driver": [{ch: "roll", tags: ["drive"], diff: -2, note: "-2 difficulty on driving"}],
  "lightning-calculator": [tick("mental-math", "Mental arithmetic, odds or figures", {diff: -2, note: "-2 difficulty where reckoning in the head matters"})],
  "mechanical-aptitude": [tick("machine-work", "Making, mending or changing a machine (not software)", {diff: -2, note: "-2 difficulty with moving-parts machines, not driving"})],
  "intolerance": [tick("intolerance-focus", "The roll involves what the character cannot stand", {diff: 2, note: "+2 difficulty on rolls involving it"})],
  "pack-mentality": [
    tick("with-pack", "A group effort with the pack", {diff: -1, note: "-1 difficulty on group efforts with the pack"}),
    tick("without-pack", "No packmate is with the character", {diff: 2, note: "+2 difficulty on everything without the pack"})],
  "pitiable": [tick("playing-pity", "Playing on pity to win help (not to threaten)", {need: ["social"], dice: 1, note: "+1 die on Social rolls that work on pity"})],
  "animal-magnetism": [tick("own-breed", "Charming, persuading or seducing one of the character's own breed", {need: ["social"], diff: -2, note: "-2 difficulty to attract or persuade the breed, not to threaten"})],
  "camp-enmity": [tick("hostile-camp", "With the camp that dislikes the character", {need: ["social"], diff: 1, note: "+1 difficulty on Social rolls with that camp"})],
  "gullible": [{ch: "roll", tags: ["subterfuge"], dice: -3, note: "-3 dice on guile, whether lying or seeing through lies"}],
  "notoriety": [tick("own-sept", "With Garou of the character's sept, not their pack", {need: ["social"], dice: -2, note: "-2 dice on Social rolls with the sept"})],
  "metis-child": [tick("knows-of-cub", "With Garou who know of the metis cub", {need: ["social"], dice: -2, note: "-2 dice on Social rolls with those who know"})],
  "moon-bound": [
    tick("own-moon-waxing", "Luna waxes in the character's auspice", {dice: 1, note: "+1 die on every roll while the auspice moon waxes"}),
    tick("own-moon-waning", "Luna wanes in the character's auspice", {dice: -1, note: "-1 die on every roll while it wanes"})],
  "natural-channel": [tick("stepping-sideways", "Stepping sideways", {diff: -1, note: "-1 difficulty to cross the Gauntlet"})],
  "slip-sideways": [tick("stepping-sideways", "Stepping sideways", {diff: -1, note: "-1 difficulty on the Gnosis roll to cross"})]
};

export const MORE_PROMPTS_3 = {
  "bad-taste": {on: ["feed", "fight"], text: "whoever bites the character spends a Willpower point or retches for the scene"},
  "fair-glabro": {on: ["social"], text: "no Social penalty in Glabro form"},
  "anosmia": {on: ["night"], text: "rolls on taste and smell fail outright, tracking by scent too; the Lupus Perception bonus is gone"},
  "monochrome-vision": {on: ["night"], text: "sees no colour, only shades of grey"},
  "no-partial-transformation": {on: ["fight"], text: "cannot take a partial form, only a whole one"},
  "strict-carnivore": {on: ["feed", "night"], text: "only meat feeds the character"},
  "double-jeopardy": {on: ["social"], text: "two metis deformities, not one"},
  "seldom-sleeps": {on: ["night"], text: "an hour of sleep a night is enough, with no penalty for staying awake"},
  "jack-of-all-trades": {on: ["social", "fight"], text: "no penalty for a Skill the character lacks; a missing Knowledge can be tried at +2 difficulty"},
  "untamable": {on: ["social"], text: "immune to Dominate and to Roll Over, Obedience and Mastery"},
  "absent-minded": {on: ["night"], text: "remembering any detail needs an Intelligence roll"},
  "driving-goal": {on: ["night"], text: "the character must work toward the goal, or spend Willpower to set it aside a while"},
  "ability-deficit": {on: ["night"], text: "five fewer points in one Ability group at creation, nothing at three dots or more"},
  "spirit-magnet": {on: ["night"], text: "crossing into the Umbra draws curious spirits, and sometimes Banes"},
  "danger-sense": {on: ["fight", "night"], text: "the Storyteller rolls Perception + Alertness in secret when danger is near and unseen"},
  "immune-to-wyrm-emanations": {on: ["fight"], text: "Wyrm toxins still harm, but take no dice away; Banes cannot possess the character"},
  "silver-tolerance": {on: ["fight"], text: "silver damage can be soaked, at difficulty 8"},
  "banned-transformation": {on: ["fight"], text: "where the ban holds, changing form takes a Willpower point and a Willpower roll at 8"},
  "foe-from-the-past": {on: ["night"], text: "the ancestor's enemy may come for the character"},
  "forced-transformation": {on: ["fight", "night"], text: "the trigger forces the change unless a Willpower point is spent"},
  "insane-ancestor": {on: ["night"], text: "calling on the ancestors may let the mad one take over: Ancestors at 6, any success and it rules the scene"},
  "slip-sideways": {on: ["fight", "night"], text: "under stress near a mirror or water, Wits + Occult at 7 or slip into the Umbra"},
  "mark-of-the-predator": {on: ["night"], text: "animals flee or challenge the character; no Animal Ken"},
  "sign-of-the-wolf": {on: ["social"], text: "hunters who know the old signs may see what the character is"},
  "pierced-veil": {on: ["fight"], text: "the Crinos form raises no Delirium in mortals"},
  "lack-of-scent": {on: ["night"], text: "anyone tracking the character by scent rolls at +2 difficulty"}
};
