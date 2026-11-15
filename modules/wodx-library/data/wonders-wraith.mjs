/**
 * WoDX Library: the named Artifacts of Wraith 20th (B6100-B6109). Data only; the kit is scripts/wonders-wraith.mjs.
 * Every row is WoDX's own short summary with a page reference, never book text.
 *
 * Wraith 20th, book pp. 425-431 (pdf 490-496), lists Artifacts made at the forges, Skin Artifacts worked from the
 * carcasses of plasmics, and Spectre Artifacts made by Artificers lost to their Shadows. Each row here is made at the
 * soulforge as a long task, and the finished item carries its powers for the Use window (wonder-powers.mjs): the
 * Pathos it holds, what each use costs, what shows on the map.
 *
 * Not on the table: Instant Nihils (nobody knows who makes them, p. 425), Lucky's Mr. Bunny and the Maggot Revolver
 * (Spectre-altered relics, not forged things) and the named relics of pp. 423-425 (relics are found, never made).
 * The soulfire crystal is distilled by the Usurers, not forged; the souled relic row fits a socket for one (p. 428).
 *
 * Every era: the forges work from Charon's day to the Sixth Great Maelstrom and after it (WoDX Actions
 * soulforge-rules.js sets the law before and after 1999). The eMap needs the Electron Highway, so it is made only from
 * 1970 (house). Everything else is made in any year of the chronicle.
 */

export const WR20 = "Wraith 20th";
const OFFSET = 65; // pdf page = book page + 65 in this scan
export const PATHOS = "system.advantages.pathos.temporary";
export const PATHOS_MAX = "system.advantages.pathos.max";
export const ANGST = "system.advantages.angst.temporary";
export const CORPUS = "system.advantages.corpus.temporary";
export const WP = "system.advantages.willpower.temporary";
const A = p => `actor:${p}`;

/** Every Skin Artifact must be fed 2 Pathos a day or it goes dull; waking it again takes a day and 4 (p. 428). */
import {DAY} from "../../wodx-chronicle/scripts/terms.mjs";
const SKIN_POWERS = [
  {id: "feed", label: "Feed it (2 Pathos, a day)", text: "Two Pathos keep a Skin Artifact awake for another day.", spend: {pool: A(PATHOS), amount: 2}, renew: DAY,
    renewText: "It drinks the Pathos and stirs for another day."},
  {id: "wake", label: "Wake it again (4 Pathos, a full day)", text: "A Skin Artifact left unfed goes dull; a day's work and four Pathos wake it.", spend: {pool: A(PATHOS), amount: 4}, renew: DAY,
    renewText: "After a day's coaxing it wakes again."}
];
const skinBotch = {path: ANGST, amount: 1, add: true, max: 10, label: "The thing fights back: 1 temporary Angst (a botch with a Skin Artifact)."};

const R = (key, name, kind, level, page, does, o = {}) => ({key, name, line: "wraith", kind, level, book: WR20, page, pdf: page + OFFSET, does, ...o});

export const ROWS = [
  /* ---- Artifacts of the forges (pp. 425-428) ---- */
  R("bell-of-summoning", "Bell of Summoning", "forge", 1, 425,
    "A small jade bell and hammer. Wraiths put Pathos into it; when it is struck, everyone with Pathos still in it hears the call and knows where the bell is. Each ringing burns one of each listener's points, and it cannot ring for one listener alone.",
    {flag: {pool: {label: "Pathos put into it", value: 0, max: 20}, powers: [
      {id: "invest", label: "Put a Pathos into the bell", text: "From now on you hear it when it rings.", transfer: {from: A(PATHOS), to: "item", amount: 1}},
      {id: "ring", label: "Strike the bell", text: "Every wraith with Pathos in the bell hears it and knows where it is. It rings a minute for each of them.", spend: {pool: "item", amount: 1},
        look: {fx: "spirit-wave"}}]}}),
  R("mask-of-office", "Mask of office", "forge", 1, 425,
    "A mask cut to the style of a Hierarchy office (a hound's look for a Barghest trainer, a grinning skull for the Grim Legion). Worn, it draws the respect the office is owed. Made outside the office it is a forgery, sold on the black market; it fits whoever wears it.",
    {flag: {powers: [
      {id: "pass", label: "Pass as the office's holder", text: "Guards and clerks give the mask the respect due its office. A forgery must stand up to a look.", roll: {attr: "manipulation", ability: "subterfuge", diff: 7},
        look: {fx: "mind-gaze"}}]}}),
  R("redeyes", "Redeyes", "forge", 2, 425,
    "Two soulfire torches, each in a globe of relic glass, that mark a way through the Tempest. Let go, they hang where they were left and burn red for a year, seen a mile off through the storm. Breaking the glass puts them out.",
    {flag: {oneUse: true, spentText: "They hang in the storm now, burning.", powers: [
      {id: "hang", label: "Hang them here", text: "The pair hangs where it is let go and burns for a year, seen a mile off.", consume: true,
        place: {light: {color: "#c0141e", bright: 1, dim: 8, alpha: 0.7, label: "Redeyes", animation: "pulse"}}, look: {fx: "fire-spark"}}]}}),
  R("scribblers-pen", "Scribbler's Pen", "forge", 2, 426,
    "A pen of the Great Library. An hour's writing puts a point of Pathos onto parchment in silver words about a Passion; two hours put temporary Angst there in black ink. Anyone who reads the pages has +2 on Manipulation rolls against the writer, and tearing them up gives the Pathos back at once.",
    {flag: {pool: {label: "Pathos written on parchment", value: 0, max: 10}, powers: [
      {id: "write", label: "Write a Pathos down (an hour)", text: "Silver words about one of your Passions, wet forever.", transfer: {from: A(PATHOS), to: "item", amount: 1}, look: {fx: "radiance-spark"}},
      {id: "angst", label: "Write Angst out (two hours)", text: "Black words about a Dark Passion. Whoever reads them learns the writer's dark side.", spend: {pool: A(ANGST), amount: 1}, look: {fx: "shadow-tendril"}},
      {id: "tear", label: "Tear up the parchments", text: "Everything written comes rushing back at once.", transfer: {from: "item", to: A(PATHOS), cap: PATHOS_MAX}, look: {fx: "radiance-wave"}}]}}),
  R("soulfire-mask", "Soulfire Mask", "forge", 2, 426,
    "A Hierarch's war mask set with soulfire crystals holding about 10 Pathos. It breathes a tongue of flame (Dexterity + Firearms) or wraps its wearer in a blazing aura that turns aside harm, a point of Pathos at a time.",
    {flag: {pool: {label: "Pathos in its crystals", value: 10, max: 10}, powers: [
      {id: "flame", label: "Breathe flame (1 Pathos)", text: "The flame does 4 dice of harm plus a die for each success, for the Pathos spent.", roll: {attr: "dexterity", ability: "firearms", diff: 6},
        spend: {pool: "item", amount: 1}, look: {fx: "fire-bolt"}},
      {id: "aura", label: "Blazing aura (1 Pathos)", text: "The aura takes up 2 dice of harm this turn.", spend: {pool: "item", amount: 1}, look: {fx: "fire-spark"},
        token: {set: {light: {bright: 0.5, dim: 2, color: "#ff6a1e", alpha: 0.6, animation: {type: "torch", speed: 5, intensity: 5}}}}},
      {id: "dim", label: "Let the aura die", text: "The flames sink back into the crystals.", token: {restore: true}},
      {id: "charge", label: "Feed a Pathos to the crystals", text: "", transfer: {from: A(PATHOS), to: "item", amount: 1}}]}}),
  R("soulfire-lantern", "Soulfire Lantern", "forge", 2, 427,
    "A lantern whose 10-Pathos soulfire shard throws shadow instead of light. Lit and held up, it hides its bearer: all anyone sees is a dim light bobbing along, which shows across the Shroud too. Stealth is 2 easier for a scene a Pathos; set down, the spell breaks.",
    {flag: {pool: {label: "Pathos in its shard", value: 10, max: 10}, powers: [
      {id: "hide", label: "Raise the lantern (1 Pathos, a scene)", text: "You and the lantern fade from sight; Stealth rolls are at -2 difficulty while you hold it up.", spend: {pool: "item", amount: 1},
        look: {fx: "shadow-tendril"}, token: {set: {alpha: 0.25, light: {bright: 0, dim: 0.6, color: "#8a1420", alpha: 0.5, animation: {type: "torch", speed: 2, intensity: 2}}}}},
      {id: "lower", label: "Set the lantern down", text: "You are seen again.", token: {restore: true}},
      {id: "charge", label: "Feed a Pathos to the shard", text: "", transfer: {from: A(PATHOS), to: "item", amount: 1}}]}}),
  R("star-of-the-east", "Star of the East", "forge", 2, 427,
    "A spun-sugar ornament that circles its owner's head. Attuned with 3 Pathos, a Willpower and a day held in the hand, it flies toward the most pressing danger at a Pathos: over the threat if it is within 10 yards, else pointing its way for an hour. It has 2 Corpus and cannot be mended.",
    {flag: {powers: [
      {id: "attune", label: "Attune it (3 Pathos, 1 Willpower, a day in hand)", text: "Held a whole day without a break, it learns its owner.", uses: 1,
        costs: [{path: PATHOS, amount: 3, name: "Pathos", label: "3 Pathos into the star."}, {path: WP, amount: 1, name: "Willpower", label: "1 Willpower into the star."}], look: {fx: "radiance-spark"}},
      {id: "seek", label: "Send it to the danger (1 Pathos)", text: "It flies to the greatest danger you face and holds there for an hour. The Storyteller says where it goes.", requires: "attune",
        spend: {pool: A(PATHOS), amount: 1}, look: {fx: "radiance-bolt"}}]}}),
  R("candelabra-of-souls", "Candelabra of Souls", "forge", 3, 427,
    "A nine-branched brass candelabra for candles that are Moliated wraiths. Lit with soulfire, the candles burn a Corpus an hour each into a haze of Pathos that fills the room; when one gutters, the haze is gone. A cruel thing, and a fixture of Stygian parties.",
    {cautions: ["Its candles are wraiths Moliated into wax; the Storyteller says where they come from, and what it costs the maker's Passions."],
      flag: {pool: {label: "Corpus left in its candles", value: 0, max: 90}, powers: [
        {id: "fit", label: "Set nine candles (the Storyteller)", text: "Nine candles of 7 Corpus each go into the sconces.", gm: true, gain: {amount: 63}},
        {id: "burn", label: "Breathe in an hour of the haze", text: "Nine Corpus burn away into Pathos that fills the room. Every wraith there may breathe it in.",
          transfer: {from: "item", to: A(PATHOS), amount: 9, cap: PATHOS_MAX}, look: {fx: "fire-spark"},
          place: {light: {color: "#e8a33a", bright: 1, dim: 4, alpha: 0.5, label: "Candelabra of Souls", animation: "torch"}}}]}}),
  R("emap", "eMap", "forge", 3, 427,
    "A folded sheet of hammered souls, glowing green, that maps the whole Electron Highway. At a touch and a Pathos it draws a bright line along the shortest way to the place its owner pictures, and the wraith can follow it there.",
    {from: 1970, fromWhy: "the Electron Highway runs through wires and machines of the late twentieth century (house)",
      flag: {powers: [
        {id: "route", label: "Picture the destination (1 Pathos)", text: "A bright line shows the shortest way along the Electron Highway; no roll is needed to keep to it.", spend: {pool: A(PATHOS), amount: 1},
          look: {fx: "lightning-spark"}}]}}),
  R("stygian-steel-armor", "Stygian steel armor", "forge", 3, 427,
    "Ornate armor of Stygian steel that guards the torso, from hoplite plate to medieval harness. It takes ten levels of harm before it breaks, and it can be mended.",
    {armor: {soak: 3, penalty: 1, house: "the soak 3 and penalty 1 are WoDX's own: the page gives ten levels of harm, not a class"},
      flag: {pool: {label: "levels of harm it can still take", value: 10, max: 10}, emptySpent: true, spentText: "The armor breaks apart.", powers: [
        {id: "blow", label: "It takes a level of harm", text: "Mark a level of harm the armor took.", spend: {pool: "item", amount: 1}, look: {fx: "wraith-jag"}},
        {id: "mend", label: "Mend a level (Dexterity + Crafts)", text: "An evening at the anvil, a level a success.", roll: {attr: "dexterity", ability: "crafts", diff: 7}, gain: {amount: "successes"}}]}}),
  R("stygian-wall-flies", "Stygian Wall Flies", "forge", 3, 427,
    "Forged flies that spy anywhere in Stygia or the Shadowlands; only a sharp eye sees one (Perception + Awareness, difficulty 7). Two Pathos look through its eyes for an hour, three hear as well, four speak through it. It flies at twice a walk and breaks after three levels of harm.",
    {flag: {pool: {label: "levels of harm it can still take", value: 3, max: 3}, emptySpent: true, spentText: "The fly is smashed.", powers: [
      {id: "see", label: "See through it (2 Pathos, an hour)", text: "You see what the fly sees, however far away.", spend: {pool: A(PATHOS), amount: 2}, look: {fx: "mind-gaze"}},
      {id: "hear", label: "See and hear (3 Pathos, an hour)", text: "You see and hear what the fly does.", spend: {pool: A(PATHOS), amount: 3}, look: {fx: "mind-gaze"}},
      {id: "speak", label: "See, hear and speak (4 Pathos, an hour)", text: "Your voice comes out of the fly.", spend: {pool: A(PATHOS), amount: 4}, look: {fx: "mind-wave"}},
      {id: "hit", label: "It is struck", text: "", spend: {pool: "item", amount: 1}}]}}),
  R("living-chains", "Living Chains", "forge", 4, 428,
    "Jet-black chains of Stygian steel that empower instead of bind. Woken for a scene at a Pathos, they sink into the wearer's back (1 aggravated, unhealed until they come off) and coil round them as soulsteel armor and a weapon that strikes up to 20 feet: +3 dice, a grapple, or Strength + 3.",
    {weapon: {damage: 3, type: "lethal", accuracy: 3, conceal: "N"}, armor: {soak: 3, penalty: 1, name: "Living Chains (their coils)", house: "soulsteel mail from the forge window"},
      flag: {powers: [
        {id: "wake", label: "Wake the chains (1 Pathos, a scene)", text: "They anchor in your back and wrap you: armor and a weapon that reaches 20 feet.", spend: {pool: A(PATHOS), amount: 1},
          costs: [{path: CORPUS, amount: 1, name: "Corpus", label: "1 aggravated Corpus as they take hold; it does not heal while they are on."}], look: {fx: "shadow-tendril"}}]}}),
  R("fetterguard", "Fetterguard", "forge", 5, 428,
    "A small soulsteel box holding likenesses of its owner's Fetters, each made by the owner. While they are safe inside and the box is sealed, nothing harms those Fetters in the living world. If anyone else opens it, the likenesses melt and the owner loses a Willpower for each Fetter.",
    {flag: {pool: {label: "Fetters held in it", value: 0, max: 10}, powers: [
      {id: "set", label: "Set a Fetter's likeness in it (1 Pathos, 1 Willpower)", text: "A likeness of one of your Fetters, made by your own hand.",
        costs: [{path: PATHOS, amount: 1, name: "Pathos", label: "1 Pathos into the likeness."}, {path: WP, amount: 1, name: "Willpower", label: "1 Willpower into the likeness."}], gain: {amount: 1}},
      {id: "seal", label: "Seal the box (2 Pathos)", text: "Sealed, the box keeps the Fetters inside from harm. Carry it always.", uses: 1, spend: {pool: A(PATHOS), amount: 2}, look: {fx: "radiance-glyph"}},
      {id: "opened", label: "Someone else opened it (the Storyteller)", text: "The likenesses melt away and the Fetters are open to harm again.", gm: true, consume: true,
        costs: [{path: WP, amount: 1, name: "Willpower", label: "The shock costs Willpower: the Storyteller takes one more for each Fetter past the first."}], look: {fx: "wraith-tendril"}}]}}),

  /* ---- Skin Artifacts (pp. 428-429): from a slain plasmic ---- */
  R("beasthide", "Beasthide", "skin", 1, 428,
    "A square of rough green plasmic hide. Rubbed on a relic or Stygian steel blade it gives the blade +1 damage die for the rest of the fight. A dozen uses before it falls apart.",
    {flag: {uses: {value: 12, max: 12}, powers: [
      {id: "polish", label: "Polish a blade", text: "The blade does +1 die of damage until this fight is over.", look: {fx: "spirit-spark"}}, ...SKIN_POWERS]}}),
  R("bloodwebs", "Bloodwebs", "skin", 2, 428,
    "Blue-black netting of a great plasmic's veins. Thrown up to 10 yards (two successes to land), it tangles its victim and drinks a Pathos a turn; staying up takes Dexterity + Athletics at 5, getting free at 7. Sated at 10 Pathos, it falls off glowing, and a wraith can suck the Pathos back out of it.",
    {flag: {pool: {label: "Pathos it has drunk", value: 0, max: 10}, powers: [
      {id: "throw", label: "Throw the web (two successes to land)", text: "Two successes and it wraps the target.", roll: {attr: "dexterity", ability: "athletics", diff: 6}, onBotch: skinBotch, look: {fx: "blood-tendril"}},
      {id: "drink", label: "It drinks a turn (the Storyteller)", text: "The web takes a Pathos from its victim.", gm: true, gain: {amount: 1}},
      {id: "suck", label: "Suck the Pathos out of it", text: "A foul way to drink, and the only one that works.", transfer: {from: "item", to: A(PATHOS), cap: PATHOS_MAX}},
      ...SKIN_POWERS]}}),
  R("shroudripper-gloves", "Shroudripper gloves", "skin", 3, 429,
    "Gloves of plasmic leather tipped with Shroudripper talons. Each glove soaks a die of harm, a hit does two more dice of aggravated damage, and the acid in the wound stops it healing for a day.",
    {weapon: {damage: 2, type: "aggravated", accuracy: 0, conceal: "P", ability: "brawl"}, armor: {soak: 2, penalty: 0, name: "Shroudripper gloves (their leather)", house: "a die a glove, both worn"},
      flag: {powers: [
        {id: "wound", label: "The acid takes (a wound will not heal for a day)", text: "The wound the gloves made cannot heal for 24 hours.", look: {fx: "chi-tendril"}, onBotch: skinBotch}, ...SKIN_POWERS]}}),
  R("wail-tongue", "Wail Tongue", "skin", 4, 429,
    "A sliver of plasmic tongue laced with Stygian steel wire. Set in the mouth it eats the wearer's own tongue (2 Corpus, which heals, and 3 temporary Angst) and gives the two fifth-level Keening arts as the wearer's own, a metal voice for good, and the means to speak to Spectres without being attacked at once. Only a blade and soulfire get it out.",
    {cautions: ["The Keening arts it gives are noted on the sheet by the Storyteller; WoDX Actions' Arcanoi window rolls them once they are."],
      flag: {powers: [
        {id: "root", label: "Let it take root", text: "It devours your tongue and takes its place.", uses: 1,
          costs: [{path: CORPUS, amount: 2, name: "Corpus", label: "2 Corpus as it eats the tongue (this heals)."}], drawback: {path: ANGST, amount: 3, max: 10, label: "3 temporary Angst."}, look: {fx: "wraith-jag"}},
        {id: "parley", label: "Speak to Spectres", text: "Spectres hear you out before they strike.", requires: "root", look: {fx: "spirit-wave"}}, ...SKIN_POWERS]}}),
  R("guardian-orb", "Guardian Orb", "skin", 5, 429,
    "A milky eye the size of a beach ball in a Stygian steel brace, floating behind the owner who wears its ring. It sees behind them and throws itself in the way of missiles (Dexterity + Athletics at 7, an attack turned a success). It has 20 Corpus and heals at a Pathos an hour; burst, it spills a corrosive humour everywhere.",
    {flag: {pool: {label: "the Orb's Corpus", value: 20, max: 20}, emptySpent: true, spentText: "The Orb splits open and a reeking humour floods the ground.", powers: [
      {id: "deflect", label: "Block the missiles", text: "Each success turns one attack aimed at you this turn.", roll: {attr: "dexterity", ability: "athletics", diff: 7}, onBotch: skinBotch, look: {fx: "spirit-wave"}},
      {id: "hit", label: "It takes a level of harm", text: "", spend: {pool: "item", amount: 1}},
      {id: "heal", label: "Feed it a Pathos (an hour)", text: "A level of its Corpus grows back.", transfer: {from: A(PATHOS), to: "item", amount: 1}}, ...SKIN_POWERS]}}),

  /* ---- Spectre Artifacts (pp. 430-431): only Spectres make them ---- */
  R("forgebait", "Forgebait", "spectre", 1, 430,
    "A false obolus that moans like a real one (Perception + Awareness at 8 to see through it) until it is spent. Then it turns to stinking slime, and the stink clings to the would-be buyer for a week.",
    {flag: {oneUse: true, spentText: "It melts into slime.", powers: [
      {id: "pay", label: "Pay with it", text: "It melts to slime in the seller's hand; whoever tried to spend it reeks for a week.", consume: true, look: {fx: "chi-tendril"}}]}}),
  R("memory-net", "Memory Net", "spectre", 3, 430,
    "A golden net on a hoop and handle of bone that looks too much like an arm. It pulls things out of the Tempest; a wraith may try it (Wits + Awareness at 8), but every Spectre that sees it comes to take it back, and on a botch something huge drags the user under. Only 17 exist.",
    {cautions: ["There are only seventeen; the Storyteller says whether one more can be made."],
      flag: {powers: [
        {id: "cast", label: "Cast it into the Tempest", text: "Something from the storm comes up in the net. Spectres who see it come for it.", roll: {attr: "wits", ability: "awareness", diff: 8},
          onBotch: {path: CORPUS, amount: 2, label: "Something huge takes hold and drags you down: 2 Corpus, and the Storyteller says what has you."}, look: {fx: "wraith-tendril"}}]}}),
  R("bean-nighe-caul", "Bean Nighe Caul", "spectre", 5, 431,
    "A bodysuit of torn faces caught in anguish. A Spectre who owns it feeds it a Corpus a week; in a fight its moaning gives Keening 4, it sees all round, and for 2 Angst (Subterfuge + Charisma at 7) it lends a memory, a feeling or a skill of the dead in it. A wraith who puts it on loses a Corpus a turn and works Arcanoi 3 harder.",
    {flag: {powers: [
      {id: "feed", label: "Feed it (1 Corpus, a week)", text: "Fed, it holds together another week.", costs: [{path: CORPUS, amount: 1, name: "Corpus", label: "A Corpus fed to the Caul."}], renew: 7 * DAY},
      {id: "draw", label: "Draw on a face (2 Angst)", text: "A memory, a feeling or a skill comes up: +1 die a success on a related roll.", roll: {attr: "charisma", ability: "subterfuge", diff: 7},
        spend: {pool: A(ANGST), amount: 2}, look: {fx: "wraith-tendril"}},
      {id: "strip", label: "Tear it off (a wraith wearing it)", text: "Two successes get it off; till then it takes a Corpus a turn.", roll: {attr: "dexterity", diff: 7},
        costs: [{path: CORPUS, amount: 1, name: "Corpus", label: "A Corpus lost while it clings."}]}]}}),

  /* ---- Relics fitted for soulfire (p. 428) ---- */
  R("souled-relic", "A souled relic", "relic", 2, 428,
    "A relic given a socket for a soulfire crystal of about 10 Pathos, so it runs on the crystal instead of its user: a turntable that keeps spinning, a relic gun that fires a round for its Pathos cost.",
    {fromRelic: true, flag: {pool: {label: "Pathos in its crystal", value: 10, max: 10}, powers: [
      {id: "run", label: "Run it on the crystal (1 Pathos)", text: "The crystal pays the relic's cost, a round or a turn.", spend: {pool: "item", amount: 1}, look: {fx: "fire-spark"}},
      {id: "charge", label: "Feed a Pathos to the crystal", text: "", transfer: {from: A(PATHOS), to: "item", amount: 1}}]}})
];

export const byKey = Object.fromEntries(ROWS.map(r => [r.key, r]));
/** How many successes the forge needs for a level (house: 2 + 2 a level). */
export const goalFor = level => 2 + 2 * Math.max(1, Math.min(5, Math.round(Number(level) || 1)));
