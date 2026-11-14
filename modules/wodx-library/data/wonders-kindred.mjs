/**
 * WoDX Library: blood sorcery that makes or marks objects (B3693-B3699). Data only; the kit is
 * scripts/wonders-kindred.mjs. Every row is WoDX's own short summary with a page reference, never book text.
 *
 * Ben's Item Crafting Desk (2026-11-13): k1 full (object rituals mark the chosen item; Enchant Talisman runs as a long
 * task and makes the talisman), k2 folded in (Necromancy and the other blood sorceries mark items the same way).
 *
 * Row: {key, name, path ("thaumaturgy" | "necromancy"), level, blood (points spent at the casting), time (hours, for
 *   the card), delay (days of preparation before the roll), mark (works on an object the caster has: "any", "weapon",
 *   "wood", "container", "bone", "mirror"), needs (materials, in words), roll? ({attr, ability, diff} instead of
 *   Intelligence + Occult at 3 + level), eras ("v20", "da", or both by default), book, pdf, does, item (what it
 *   becomes: see the kit), house?}
 * V20 and V20 Dark Ages both roll Intelligence + Occult at difficulty 3 + the ritual's level, at most 9 (V20 pdf 238,
 * V20 Dark Ages pdf 303); Dark Ages rituals cost one blood point unless they say more. Necromancy rituals roll the same
 * way (V20 pdf 185).
 */

export const V20 = "V20 core", DA = "V20 Dark Ages";

/** Years before this use V20 Dark Ages rules where the two books differ (B3694). */
export const DA_UNTIL = 1500;

/** The sorceries that count, by the name on the Discipline or path (k2 folds the rest into Thaumaturgy's rules). */
export const SORCERIES = [
  {key: "thaumaturgy", label: "Thaumaturgy", match: /thaumaturg|path of (blood|the levinbolt|conjuring|corruption|elemental|mars|technomancy|weather|spirit|the focused mind|transmutation|curses|blood's curse|potestas|creatio|iter|rego)/i},
  {key: "thaumaturgy", label: "Dark Thaumaturgy", match: /dark thaumaturg|infernal/i},
  {key: "thaumaturgy", label: "Assamite sorcery", match: /assamite sorcery|dur-an-ki|sihr/i},
  {key: "thaumaturgy", label: "Setite sorcery", match: /setite sorcery|akhu/i},
  {key: "thaumaturgy", label: "Koldunic sorcery", match: /koldun/i},
  {key: "necromancy", label: "Necromancy", match: /necromancy|sepulchre path|bone path|ash path|vitreous path|cenotaph|mortis/i}
];

const BLOOD = "system.advantages.bloodpool.temporary";
const WP = "system.advantages.willpower.temporary";

export const RITUALS = [
  {key: "vessel-transference", name: "Engaging the Vessel of Transference", path: "thaumaturgy", level: 1, blood: 1, time: 3, mark: "container",
    needs: "a cup to a one-gallon jug, sealed full of blood and inscribed with a Hermetic sigil", eras: ["v20"], book: V20, pdf: 239,
    does: "Whoever touches the sealed vessel with bare skin trades blood with it, unaware but for a chill, until it is opened. Used to take a sample or slip someone a blood bond.",
    item: {label: "Vessel of Transference", powers: [
      {id: "touch", label: "A bare hand touches it", gm: true, text: "A point of the toucher's blood goes in and a point of what it holds goes into them. Gloves stop it."},
      {id: "open", label: "Open it", consume: true, text: "The blood now inside is the last toucher's. Opening it ends the enchantment."}]}},
  {key: "vitae-infusion", name: "Principal Focus of Vitae Infusion", path: "thaumaturgy", level: 2, blood: 1, time: 0.2, mark: "small",
    needs: "an object no bigger than two hands can hold", eras: ["v20"], book: V20, pdf: 242,
    does: "One blood point waits in a small reddish, slick object until the caster wills it to melt into blood. Made for an ally, the blood is still the caster's and counts toward a bond.",
    item: {label: "Vitae focus", pool: {label: "blood point", value: 1, max: 1}, emptySpent: true, powers: [
      {id: "release", label: "Melt it into blood and drink", transfer: {from: "item", to: `actor:${BLOOD}`, amount: 1}, consume: true,
        text: "The object breaks down into a pool of vitae. Drunk by anyone but the caster, it is a step toward a blood bond."}]}},
  {key: "ward-ghouls", name: "Ward versus Ghouls", path: "thaumaturgy", level: 2, blood: 1, time: 0.2, delay: 1, mark: "any",
    needs: "a point of blood poured over the object; the ward sets in ten hours", eras: ["v20"], book: V20, pdf: 242, ward: "ghouls",
    does: "A ghoul touching the warded object takes three dice of lethal damage, each time; touching it on purpose costs the ghoul a point of Willpower. One object only; on a bullet it needs five successes on the Firearms roll to survive the shot.",
    item: {ward: "ghouls", dice: 3}},
  {key: "ward-lupines", name: "Ward versus Lupines", path: "thaumaturgy", level: 3, blood: 0, time: 0.2, delay: 1, mark: "any",
    needs: "a handful of silver dust instead of blood", eras: ["v20"], book: V20, pdf: 245, ward: "werewolves",
    does: "As Ward versus Ghouls, but against werewolves.", item: {ward: "werewolves", dice: 3}},
  {key: "ward-kindred", name: "Ward versus Kindred", path: "thaumaturgy", level: 4, blood: 1, time: 0.2, delay: 1, mark: "any",
    needs: "a point of the caster's own blood", eras: ["v20"], book: V20, pdf: 247, ward: "vampires",
    does: "As Ward versus Ghouls, but against vampires; the caster is not hurt by it.", item: {ward: "vampires", dice: 3, sparesMaker: true}},
  {key: "ward-spirits", name: "Ward versus Spirits", path: "thaumaturgy", level: 5, blood: 0, time: 0.2, delay: 1, mark: "any",
    needs: "a handful of pure sea salt", eras: ["v20"], book: V20, pdf: 248, ward: "spirits",
    does: "As Ward versus Ghouls, but against spirits, in the flesh or the spirit world.", item: {ward: "spirits", dice: 3}},
  {key: "ward-ghosts", name: "Ward versus Ghosts", path: "thaumaturgy", level: 5, blood: 0, time: 0.2, delay: 1, mark: "any",
    needs: "marble ground from a gravestone, a handful", eras: ["v20"], book: V20, pdf: 248, ward: "ghosts",
    does: "As Ward versus Ghouls, but against ghosts, on both sides of the Shroud.", item: {ward: "ghosts", dice: 3}},
  {key: "ward-demons", name: "Ward versus Demons", path: "thaumaturgy", level: 5, blood: 0, time: 0.2, delay: 1, mark: "any",
    needs: "a vial of holy water", eras: ["v20"], book: V20, pdf: 248, ward: "demons",
    does: "As Ward versus Ghouls, but against demons, in body or spirit.", item: {ward: "demons", dice: 3}},
  {key: "da-ward", name: "Ward", path: "thaumaturgy", level: 2, blood: 1, time: 1, mark: "any",
    needs: "an hour of preparation and a hair from the caster's head, snapped", eras: ["da"], book: DA, pdf: 306,
    does: "No one with fewer dots than the ward's level in the Attribute the caster names can move the warded object at all. One ward to an object.",
    item: {daWard: true}},
  {key: "mirror-second-sight", name: "Mirror of Second Sight", path: "thaumaturgy", level: 3, blood: 1, time: 0.25, mark: "mirror",
    needs: "an oval mirror between four and eighteen inches, bathed in the caster's blood", book: V20, pdf: 244, daPdf: 308,
    does: "The mirror shows true forms: werewolves in their war shape, the fae, magi in a glow, ghosts beyond the Shroud, and sometimes the faithful in gold light.",
    item: {label: "Mirror of Second Sight", powers: [{id: "look", label: "Look into it", text: "The Storyteller says what the mirror shows of anyone reflected in it."}]}},
  {key: "shaft-quiescence", name: "Shaft of Belated Quiescence", path: "thaumaturgy", level: 3, blood: 3, time: 5, mark: "wood",
    needs: "a stake (or spear, arrow, pool cue) of rowan, smeared with three of the caster's blood points and charred over oak; never a bullet",
    book: V20, pdf: 245, daPdf: 308,
    does: "Once it wounds a vampire, the tip breaks off and burrows toward the heart, dodging surgery. Fifteen successes reach the heart: a vampire is paralyzed, a mortal or ghoul dies.",
    item: {label: "Shaft of Belated Quiescence", weapon: {attr: "strength", bonus: 1, type: "lethal", diff: 6, ability: "melee"}, powers: [
      {id: "burrow", label: "The tip works toward the heart (each hour)", gm: true, rollMaker: "thaumaturgy", diff: 9,
        text: "Add these successes to the wound's. A botch strikes bone and loses them all. At 15 it reaches the heart. Surgery: Dexterity + Medicine each hour against the shaft's total."}]}},
  {key: "bone-of-lies", name: "Bone of Lies", path: "thaumaturgy", level: 4, blood: 10, time: 0.3, mark: "bone",
    needs: "a mortal bone at least two hundred years old, never used before, that drinks ten blood points on the night", eras: ["v20"], book: V20, pdf: 246,
    does: "Whoever holds the bone cannot lie: each lie they try burns one of its ten blood points and the truth comes out instead. It blackens as it works.",
    item: {label: "Bone of Lies", pool: {label: "blood points", value: 10, max: 10}, emptySpent: true, spentText: "The bone is ebony black and its spirit spent.", powers: [
      {id: "lie", label: "The holder tries to lie", spend: {pool: "item", amount: 1}, text: "The holder speaks the truth instead."}]}},
  {key: "splinter-servant", name: "Splinter Servant", path: "thaumaturgy", level: 4, blood: 1, time: 12, mark: "wood",
    needs: "a stake from a tree that fed on the dead, bound in wax-sealed nightshade twine", eras: ["v20"], book: V20, pdf: 246,
    does: "Torn free of its twine, the stake leaps up and goes for the heart of whoever the holder names that turn, or the nearest body if no one is named.",
    item: {label: "Splinter Servant", oneUse: true, servant: true, powers: [
      {id: "loose", label: "Tear off the binding and name a target", rollMaker: "witsOccult", diff: 9, consume: true,
        text: "It attacks each turn with the caster's Wits + Occult at difficulty 9, damage the caster's Thaumaturgy; three health levels; attacks on it at +3; it lasts five turns per success at its making. Three successes at Dexterity (difficulty 8) pull it out whole."}]}},
  {key: "animated-weapon", name: "Animated Weapon", path: "thaumaturgy", level: 4, blood: 1, time: 12, mark: "weapon",
    needs: "the skin of a carrion eater bound round the weapon in wax-sealed nightshade twine", eras: ["da"], book: DA, pdf: 308,
    does: "Unbound, the weapon flies at whoever the holder names that turn, aiming for the heart.",
    item: {label: "Animated weapon", oneUse: true, servant: true, powers: [
      {id: "loose", label: "Tear off the binding and name a target", rollMaker: "witsOccult", diff: 9, consume: true,
        text: "It attacks with the caster's Wits + Occult at difficulty 9, damage the caster's Thaumaturgy; three health levels; attacks on it at +3; five turns of life per success at its making. A wooden one stakes as a stake does."}]}},
  {key: "flaming-weapon", name: "Flaming Weapon", path: "thaumaturgy", level: 2, blood: 3, time: 0.2, mark: "weapon",
    needs: "the caster's palm cut on the weapon (one level of lethal damage that cannot be soaked)", eras: ["da"], book: DA, pdf: 305,
    does: "A heatless green flame sheathes the weapon; each strike that lands does aggravated damage, one charge for each success. It frightens no vampire and lights nothing. A charged wooden weapon that stakes a vampire spends every charge as aggravated damage.",
    item: {label: "Flaming weapon", chargesBySuccess: true, powers: [
      {id: "strike", label: "A strike lands in green fire", text: "This strike's damage is aggravated."}]}},
  {key: "candle-haunting", name: "Candle of Haunting", path: "thaumaturgy", level: 4, blood: 1, time: 1, mark: "",
    needs: "a black candle made on a Friday night from a dead man's brains and bones and nine pinches of grave dirt", eras: ["da"], book: DA, pdf: 309,
    does: "Burnt for twenty minutes a night while the caster holds something of the victim's, it sets a poltergeist on them for a day.",
    item: {label: "Candle of Haunting", chargesBySuccess: true, powers: [
      {id: "burn", label: "Burn it for twenty minutes", spend: {pool: `actor:${BLOOD}`, amount: 1},
        text: "For 24 hours a poltergeist (Intimidation 4, Fright 4, Strength 2, 4 dice for pranks) torments the victim and tries to do real harm once a night. Five successes on a scare turn the hair white."}]}},
  {key: "blood-contract", name: "Blood Contract", path: "thaumaturgy", level: 5, daLevel: 1, blood: 1, time: 0, delay: 3, mark: "",
    needs: "a contract penned in the caster's vitae, which each party signs with their own (a blood point apiece)", book: V20, pdf: 247, daPdf: 304,
    does: "Everyone who signs is bound to do what it says, and the Storyteller enforces it by any means. Only fulfilling it or burning it ends it.",
    item: {label: "Blood contract", powers: [
      {id: "sign", label: "Someone signs it", spend: {pool: `actor:${BLOOD}`, amount: 1}, text: "The signer pays a blood point and is bound."},
      {id: "burn", label: "Burn it", consume: true, text: "The contract and every obligation in it are gone."}]}},
  {key: "enchant-talisman", name: "Enchant Talisman", path: "thaumaturgy", level: 5, blood: 0, time: 6, mark: "rigid", talisman: true,
    needs: "a rigid object about a yard long (a staff, a sword, a walking stick), carved with the caster's true name over one lunar month",
    book: V20, pdf: 247, daPdf: 310,
    does: "Six hours a night from new moon to new moon, a blood point each night, and four weekly rolls of Intelligence + Occult at 8 that must reach 20 net successes. The talisman makes magic aimed at its maker harder, adds dice to the primary path and to rituals, and betrays its maker to anyone else who holds it. One at a time; it cannot be given away.",
    item: {label: "Talisman"}},
  // k2: Necromancy rituals that make or mark things
  {key: "knowing-stone", name: "Knowing Stone", path: "necromancy", level: 1, blood: 1, time: 1, mark: "",
    needs: "a consecrated stone with the subject's name painted in the necromancer's blood", book: V20, pdf: 185,
    does: "The necromancer can learn where the named person is, alive or dead, by dancing round the stone in a trance until a spirit whispers it. It fails on All Saints' night unless a blood point is paid.",
    item: {label: "Knowing stone", powers: [
      {id: "dance", label: "Dance until the spirits whisper", text: "The Storyteller says where the named person is now."},
      {id: "keep", label: "Keep it past All Saints' night", spend: {pool: `actor:${BLOOD}`, amount: 1}, text: "The stone keeps its power for another year."}]}},
  {key: "hand-of-glory", name: "The Hand of Glory", path: "necromancy", level: 2, blood: 0, time: 1, delay: 14, mark: "",
    needs: "a hanged murderer's hand, shrouded and pressed, a fortnight in salt, saltpeter and long pepper, then dried with vervain and fern",
    book: V20, pdf: 187,
    does: "Lit with a hanged man's tallow and the old words, it puts every mortal in a house into a sleep no one can wake them from for a scene. A finger that will not light marks someone it did not touch. Only milk or its maker puts it out.",
    item: {label: "Hand of Glory", powers: [
      {id: "light", label: "Light the fingers", text: "Every mortal in the household sleeps for the scene; supernatural beings are untouched, one unlit finger for each."}]}},
  {key: "baleful-doll", name: "Baleful Doll", path: "necromancy", level: 4, blood: 1, time: 5, mark: "",
    roll: {attr: "stamina", ability: "craft", diff: 8},
    needs: "a handmade doll like the victim, painted with the necromancer's blood and dressed in the victim's unwashed clothing", book: V20, pdf: 189,
    does: "Hurting the doll hurts the victim: six dice of bashing; destroying it, six dice of lethal. A doll that does not look like its victim is worthless.",
    item: {label: "Baleful doll", powers: [
      {id: "hurt", label: "Hurt the doll", roll: {dice: 6, diff: 6, label: "Bashing damage"}, text: "The victim takes these as bashing damage."},
      {id: "destroy", label: "Destroy the doll", roll: {dice: 6, diff: 6, label: "Lethal damage"}, consume: true, text: "The victim takes these as lethal damage."}]}},
  {key: "bastone-diabolico", name: "Bastone Diabolico", path: "necromancy", level: 4, blood: 0, time: 3, mark: "",
    needs: "a leg bone taken from someone still living, sheathed in lead, carved with runes, and used to beat its donor to death", book: V20, pdf: 189,
    does: "Woken with a point of Willpower for a scene, each hit takes a point of Passion from a ghost, and hits the walking dead (not vampires) for an extra die of aggravated damage. Ghosts shun whoever carries it: summoning them is one harder.",
    item: {label: "Bastone diabolico", weapon: {attr: "strength", bonus: 1, type: "bashing", diff: 6, ability: "melee"}, powers: [
      {id: "wake", label: "Wake it for the scene", spend: {pool: `actor:${WP}`, amount: 1}, text: "For the scene, a ghost it hits loses a point of Passion; the walking dead take an extra die, aggravated."}]}}
];

/** Who a ward hurts, as the profile names WoDX Actions gives. */
export const WARD_HURTS = {ghouls: ["ghoul"], werewolves: ["lupine"], vampires: ["kindred"], spirits: ["spirit"], ghosts: ["wraith"], demons: ["demon"]};

export const byKey = Object.fromEntries(RITUALS.map(r => [r.key, r]));
