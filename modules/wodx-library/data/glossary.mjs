/**
 * The plain-words glossary (WoDX Library 0.20.0, B2834). Our own short words for the game's terms, no book text.
 * Each entry: [term, lines, era note, text]. lines: who uses the word ("all" for every line); era note: when the word
 * belongs or what it is called in another age, "" when it holds in every age.
 */
export const GLOSSARY = [
  // Every line
  ["Dice pool", "all", "", "The number of ten-sided dice you roll: usually an Attribute plus an Ability."],
  ["Difficulty", "all", "", "The number each die must reach to count as a success, 6 when nothing makes it easier or harder."],
  ["Success", "all", "", "A die that reaches the difficulty. More successes mean a better result; a 1 takes one away."],
  ["Botch", "all", "", "A roll with no successes and at least one 1. Something goes wrong, not only nothing right."],
  ["Willpower", "all", "", "Your resolve. Spend a point for one sure success, or to hold out against fear, a power or temptation."],
  ["Health levels", "all", "", "How hurt you are, from Bruised down to Incapacitated. Each wound level takes dice from your rolls."],
  ["Soak", "all", "", "Rolling Stamina, and armour, to shrug off part of a blow before it hurts you."],
  ["Bashing damage", "all", "", "Bruises and knocks from fists and clubs. It heals fastest."],
  ["Lethal damage", "all", "", "Cuts, stabs and bullets: wounds that can kill a living body."],
  ["Aggravated damage", "all", "", "The worst harm: fire and sunlight to the dead, silver to a werewolf, claws and fangs of the supernatural. It heals slowly."],
  ["Attributes", "all", "", "What you are born with: nine of them, three Physical, three Social, three Mental."],
  ["Abilities", "all", "", "What you have learned: Talents come naturally, Skills are trained, Knowledges are studied."],
  ["Backgrounds", "all", "", "What you have outside yourself: money, friends, a mentor, a name, a haven."],
  ["Merits and Flaws", "all", "", "Small gifts and troubles that make a character their own. A Merit costs points; a Flaw gives some back."],
  ["Freebie points", "all", "", "Points to spend at the end of making a character, on anything at the book's costs."],
  ["Experience", "all", "", "Points earned in play and spent to grow the character."],
  ["Nature and Demeanor", "all", "", "Who the character truly is, and the face they show. Acting to your Nature can bring back Willpower."],
  ["Storyteller", "all", "", "The person who runs the game, plays everyone else and keeps the world turning."],
  ["Scene", "all", "", "One stretch of the story in one place, until the place or the purpose changes."],
  ["Turn", "all", "", "In a fight, about three seconds: time for one action each."],
  ["Initiative", "all", "", "Who acts first in a turn: Dexterity plus Wits plus a die."],
  // Vampires
  ["Kindred", "Vampires", "In the Dark Ages they call themselves Cainites, after Caine.", "A vampire: dead, undying and fed on blood."],
  ["Cainite", "Vampires", "The usual word before the modern nights.", "A vampire, a child of Caine."],
  ["The Embrace", "Vampires", "", "Being made a vampire: drained and given the maker's blood."],
  ["Sire and childe", "Vampires", "", "The vampire who made you, and the one you made."],
  ["Clan", "Vampires", "", "A vampire's blood family, with its own looks, powers and curse."],
  ["Generation", "Vampires", "", "How many steps you stand from Caine. Fewer steps, stronger blood."],
  ["Blood pool", "Vampires", "", "The blood in you. Spent to heal, to rise by day, to make the body stronger and to work Disciplines."],
  ["Disciplines", "Vampires", "", "The powers of the blood, from swiftness to commanding a mind."],
  ["The Beast", "Vampires", "", "The hunger and rage inside every vampire, always pulling at the reins."],
  ["Frenzy", "Vampires", "", "When the Beast takes over in rage or hunger and the vampire loses control."],
  ["Rötschreck", "Vampires", "", "The red fear: blind panic before fire or the sun."],
  ["Humanity", "Vampires", "Before the modern nights, the Road of Humanity, one of several Roads.", "How much of the person is left. The lower it sinks, the closer the Beast."],
  ["Road", "Vampires", "Dark Ages and earlier.", "A moral code a vampire holds to against the Beast: Humanity, Kings, Heaven, the Beast and others."],
  ["Blood bond", "Vampires", "", "Drinking a vampire's blood three times binds you to them with something like love."],
  ["Ghoul", "Vampires", "", "A living person fed vampire blood: stronger, longer lived, and tied to a master."],
  ["Torpor", "Vampires", "", "A sleep like death that a badly hurt or starved vampire falls into, for nights or centuries."],
  ["Diablerie", "Vampires", "", "Drinking another vampire's soul. A crime among the Kindred, and a way to stronger blood."],
  ["The Masquerade", "Vampires", "Kept by the Camarilla from the late 1400s; older courts kept their own silence.", "Hiding vampires from the living world."],
  ["Prince", "Vampires", "", "The vampire who rules a city."],
  ["Camarilla", "Vampires", "From the 1400s on.", "The great league of vampires that keeps the Masquerade and the old order."],
  ["Sabbat", "Vampires", "From the late 1400s on.", "The vampires who throw off their humanity and the elders' rule."],
  // Werewolves
  ["Garou", "Werewolves", "", "A werewolf, born to the People and changing between human and wolf."],
  ["Kinfolk", "Werewolves", "", "Family of a werewolf who did not change: human or wolf, but of the blood."],
  ["Rage", "Werewolves", "", "Werewolf fury. Spent for extra actions and to change at once; too much brings frenzy."],
  ["Gnosis", "Werewolves", "", "A werewolf's tie to the spirit world, spent for Gifts, fetishes and stepping sideways."],
  ["Gifts", "Werewolves", "", "Powers taught by spirits."],
  ["The Umbra", "Werewolves, mages", "", "The spirit world that lies beside our own."],
  ["Penumbra", "Werewolves, mages", "", "The near edge of the Umbra, a spirit copy of the place you stand."],
  ["The Gauntlet", "Werewolves, mages", "Thinner in wild places and in the old ages, thicker in cities and in modern times.", "The wall between the world and the Umbra."],
  ["Stepping sideways", "Werewolves", "", "Crossing into the Umbra, by staring into something that reflects."],
  ["Caern", "Werewolves", "", "A holy place where the spirit world is strong, guarded by a sept."],
  ["Wyrm, Weaver and Wyld", "Werewolves", "", "The three great forces: corruption, order and wild change."],
  ["Fetish", "Werewolves", "", "A thing with a spirit bound inside it, which does something when called on."],
  // Mages
  ["Awakened", "Mages", "", "A mage: someone who sees the world can be changed by will."],
  ["Sleeper", "Mages", "", "An ordinary person, not awake to magic."],
  ["Arete", "Mages", "", "How deep a mage's understanding of magic goes. It limits the Spheres."],
  ["Spheres", "Mages", "", "The nine parts of reality a mage can change, from Forces to Time."],
  ["Quintessence", "Mages", "", "Raw magical stuff, spent to make magic easier."],
  ["Paradox", "Mages", "", "Reality striking back at magic done too openly."],
  ["Traditions", "Mages", "Formed at the Grand Convocation in the 1460s; before that, separate orders and fellowships.", "The old schools of magic, bound together against their enemies."],
  ["Technocracy", "Mages", "Called the Order of Reason before the 1800s.", "The mages of science and order, who teach the world to doubt magic."],
  // Wraiths
  ["The Shroud", "Wraiths", "", "The veil between the living world and the lands of the dead."],
  ["Shadowlands", "Wraiths", "", "The world as the dead see it: grey, crumbling, beside the living one."],
  ["Fetter", "Wraiths", "", "A person, place or thing that holds a ghost to the world."],
  ["Passion", "Wraiths", "", "A strong feeling that keeps a ghost going: love, hate, a promise."],
  ["Pathos", "Wraiths", "", "Feeling drawn from the living, spent to work Arcanoi."],
  ["Corpus", "Wraiths", "", "A ghost's body. It takes harm in place of health."],
  ["The Shadow", "Wraiths", "", "The dark side of every ghost, whispering it toward Oblivion."],
  ["Angst", "Wraiths", "", "The Shadow's strength, which grows with despair."],
  ["Arcanoi", "Wraiths", "", "The powers of the dead."],
  // Changelings
  ["The Dreaming", "Changelings", "", "The world of dreams and stories, where the fae belong."],
  ["Glamour", "Changelings", "", "Dream stuff. Spent to work Arts; drawn from art and wonder."],
  ["Banality", "Changelings", "", "The weight of disbelief and dull habit, which drives the Dreaming away."],
  ["Kith", "Changelings", "", "What kind of fae a changeling is: pooka, troll, sidhe and others."],
  ["Chimera", "Changelings", "", "A thing of the Dreaming that only the fae and the enchanted can see."],
  ["Freehold", "Changelings", "", "A changeling's home, built around a place where Glamour wells up."],
  // Hunters
  ["The Imbued", "Hunters", "From 1999 on.", "Ordinary people woken by a voice to see monsters and fight them."],
  ["Edges", "Hunters", "From 1999 on.", "The powers of the Imbued."],
  ["Conviction", "Hunters", "", "A hunter's certainty, spent on powers and to stand against the monsters."],
  ["True Faith", "Hunters, mortals", "", "Real belief, strong enough to drive back the unholy."],
  ["The Inquisition", "Hunters", "Dark Ages and later; the Society of Leopold in modern nights.", "The Church's hunters of witches and the dead."]
];

/** The entries grouped by first letter, for the glossary's pages. */
export function byLetter(list = GLOSSARY) {
  const out = new Map();
  for ( const e of [...list].sort((a, b) => a[0].replace(/^The /, "").localeCompare(b[0].replace(/^The /, ""))) ) {
    const L = e[0].replace(/^The /, "")[0].toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if ( !out.has(L) ) out.set(L, []);
    out.get(L).push(e);
  }
  return out;
}
