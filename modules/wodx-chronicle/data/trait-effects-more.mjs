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
