/**
 * WoDX Library: what the everyday arms, weapon fittings and traps of Everyday goods do in play (B3805 to B3807).
 *
 * Everyday goods are plain things on a sheet. These tables give the ones that fight, fit a weapon or catch someone a
 * use WoDX Combat and the Use window can roll. All figures are WoDX house figures on the V20 scale (a knife is
 * Strength + 1 lethal, a club Strength + 2 bashing), in the Library's own words. Ammunition is left to its own pass.
 *
 * ARMS: name -> {ranged, attribute, ability, dmgAttr, dmg, kind, diff, range, special, radius, spent, note}
 *   special: "blind" (spray in the eyes: Blinded unless the eyes are covered), "shock" (Dazed by any damage that gets
 *   through), "blast" (everyone in the radius takes the same dice), "fire" (burns: fire to the soak),
 *   "dazzle" (everyone in the radius rolls Stamina or is Dazed), "noise" (loud, does no harm).
 *   spent: the thing is used up when it is thrown or fired.
 * FITTINGS: name -> {fits, ...what it does when fitted (equipped)}. fits: bow | crossbow | gun | pistol | longgun
 *   diff (to hit), dice (to hit), far (dice to hit at two or three times range), silenced, light (cancels darkness),
 *   noMinStr (spans a heavy crossbow), quickReload, spareString, wax (rain does not slacken the string),
 *   smart (with a Smartgun Link installed).
 * CARRIERS: name -> {carries, init}: worn with a matching weapon equipped, it is at hand (+init to initiative).
 * WARDS: name -> {covers}: worn, it keeps something out (eyes: a spray cannot blind; gas).
 * TRAPS: name -> {set: [attribute, ability, difficulty], find, dice, kind, hold, alarm, note}
 *   set: the roll to set it well; its successes make it harder to see (find: the victim's Perception + Alertness
 *   difficulty before them). dice/kind: damage when it springs (soaked as usual). hold: the condition it leaves
 *   (held or immobilized). alarm: it makes a noise instead of (or as well as) hurting.
 */

export const ARMS = {
  "a sharpened ash stake": {ranged: false, ability: "melee", dmgAttr: "strength", dmg: 1, kind: "lethal", diff: 6, note: "Wood: aimed at the heart (Stake), three damage successes stake a vampire."},
  "a silver-bladed dagger": {ranged: false, ability: "melee", dmgAttr: "strength", dmg: 1, kind: "lethal", diff: 6, note: "Silver: a bane to the Garou and to those it burns."},
  "a kitchen cleaver": {ranged: false, ability: "melee", dmgAttr: "strength", dmg: 2, kind: "lethal", diff: 6},
  "a stiletto": {ranged: false, ability: "melee", dmgAttr: "strength", dmg: 1, kind: "lethal", diff: 5, note: "A thin blade: easy to put where it counts."},
  "a leather blackjack": {ranged: false, ability: "melee", dmgAttr: "strength", dmg: 1, kind: "bashing", diff: 5},
  "a set of brass knuckles": {ranged: false, ability: "brawl", dmgAttr: "strength", dmg: 1, kind: "bashing", diff: 6},
  "a switchblade": {ranged: false, ability: "melee", dmgAttr: "strength", dmg: 1, kind: "lethal", diff: 6},
  "a can of pepper spray": {ranged: true, ability: "athletics", dmgAttr: "", dmg: 0, kind: "bashing", diff: 6, range: 2, special: "blind", note: "In the eyes: Blinded for the scene unless the eyes are covered."},
  "a stun gun": {ranged: false, ability: "brawl", dmgAttr: "", dmg: 3, kind: "bashing", diff: 6, special: "shock", note: "Pressed to the skin: any damage that gets through leaves the target Dazed."},
  "a sling": {ranged: true, ability: "athletics", dmgAttr: "strength", dmg: 1, kind: "bashing", diff: 7, range: 20, note: "Needs a stone."},
  "a bayonet": {ranged: false, ability: "melee", dmgAttr: "strength", dmg: 1, kind: "lethal", diff: 6, note: "On the end of a long gun it reaches as a spear (Strength + 2)."},
  "a hand grenade": {ranged: true, ability: "athletics", dmgAttr: "", dmg: 10, kind: "lethal", diff: 6, range: 20, special: "blast", radius: 5, spent: true, note: "Everyone within 5 yards takes the same dice; diving clear is a dodge."},
  "a kris with a wavy blade": {ranged: false, ability: "melee", dmgAttr: "strength", dmg: 1, kind: "lethal", diff: 6, note: "A wavy blade that leaves a wide wound."},
  "a stick of dynamite": {ranged: true, ability: "athletics", dmgAttr: "", dmg: 8, kind: "lethal", diff: 6, range: 15, special: "blast", radius: 4, spent: true, note: "Lit and thrown: everyone within 4 yards takes the same dice."},
  "a pipebomb": {ranged: true, ability: "athletics", dmgAttr: "", dmg: 8, kind: "lethal", diff: 7, range: 15, special: "blast", radius: 5, spent: true, note: "Everyone within 5 yards takes the same dice."},
  "a molotov cocktail": {ranged: true, ability: "athletics", dmgAttr: "", dmg: 4, kind: "lethal", diff: 6, range: 15, special: "fire", radius: 2, spent: true, note: "Bursts into flame: fire to anyone it hits and to whatever is within 2 yards."},
  "a flashbang": {ranged: true, ability: "athletics", dmgAttr: "", dmg: 0, kind: "bashing", diff: 6, range: 15, special: "dazzle", radius: 5, spent: true, note: "A blinding flash and a bang: everyone within 5 yards who fails a Stamina roll (difficulty 7) is Dazed; eyes covered or not, the noise carries."},
  "a firecracker": {ranged: true, ability: "athletics", dmgAttr: "", dmg: 0, kind: "bashing", diff: 5, range: 10, special: "noise", spent: true, note: "Loud: it draws everyone near, and a horse or a frightened animal may bolt."},
  "a flare pistol": {ranged: true, ability: "firearms", dmgAttr: "", dmg: 3, kind: "lethal", diff: 7, range: 20, special: "fire", note: "A burning flare: fire to anyone it hits."}
};

export const FITTINGS = {
  "a spare bowstring": {fits: "bow", spareString: true, note: "A string that snaps on a botch is changed in a turn."},
  "bowstring wax": {fits: "bow", wax: true, note: "In rain an unwaxed string slackens (+1 difficulty); a waxed one does not."},
  "a crossbow cranequin": {fits: "crossbow", noMinStr: true, note: "Its gears span a crossbow the arms alone could not: no Strength needed."},
  "a rifle scope": {fits: "longgun", far: 2, note: "+2 dice to hit beyond the listed range."},
  "a speed loader": {fits: "pistol", quickReload: true, note: "Reloading a revolver takes no turn of its own: it is done with another action."},
  "a silencer": {fits: "gun", silenced: true, note: "The shot is quiet: nobody beyond the room hears it."},
  "a laser sight": {fits: "gun", diff: -1, note: "-1 difficulty to hit."},
  "a weapon-mounted flashlight": {fits: "gun", light: true, note: "Lights what it points at: darkness does not add to the difficulty."},
  "a smartgun link cable": {fits: "gun", smart: -1, note: "With a Smartgun Link installed: -1 more difficulty to hit."}
};

export const CARRIERS = {
  "a gun sling": {carries: "longgun", init: 1},
  "a leather holster": {carries: "pistol", init: 1},
  "a shoulder holster": {carries: "pistol", init: 1},
  "a sword belt and scabbard": {carries: "blade", init: 1}
};

export const WARDS = {
  "a gas mask": {covers: ["eyes", "gas"], note: "Sprays and gas do not reach the eyes and lungs."}
};

export const TRAPS = {
  "a wire snare": {set: ["wits", "survival", 6], find: 7, dice: 0, kind: "bashing", hold: "held", note: "Catches a foot or a small animal."},
  "a sharpened pit stake": {set: ["wits", "survival", 7], find: 7, dice: 4, kind: "lethal", note: "Dug in and hidden: whoever steps on it falls onto the point."},
  "a fowling net": {set: ["wits", "survival", 6], find: 6, dice: 0, kind: "bashing", hold: "held", note: "Drops over whoever comes under it."},
  "a tripwire with a bell": {set: ["wits", "survival", 5], find: 7, dice: 0, kind: "bashing", alarm: "a bell rings", note: "Rings when the wire is crossed."},
  "a caltrop": {set: ["dexterity", "survival", 5], find: 6, dice: 2, kind: "lethal", note: "Scattered on the ground: a foot comes down on a point."},
  "an iron mantrap": {set: ["wits", "survival", 7], find: 7, dice: 6, kind: "lethal", hold: "immobilized", note: "Iron jaws close on the leg."},
  "a spring gun": {set: ["wits", "firearms", 7], find: 7, dice: 5, kind: "lethal", alarm: "a gunshot", note: "A gun on a wire fires at whoever crosses it."},
  "a bear trap": {set: ["wits", "survival", 7], find: 7, dice: 5, kind: "lethal", hold: "immobilized", note: "Steel jaws close on the leg."},
  "a pressure-plate alarm": {set: ["wits", "security", 6], find: 8, dice: 0, kind: "bashing", alarm: "an alarm sounds", note: "Under a mat or floorboard: weight sets it off."},
  "a motion alarm": {set: ["wits", "security", 6], find: 8, dice: 0, kind: "bashing", alarm: "an alarm sounds", note: "Anything moving in front of it sets it off."},
  "a land mine": {set: ["wits", "demolitions", 7], find: 8, dice: 10, kind: "lethal", alarm: "an explosion", note: "Buried: it goes off under whoever steps on it."},
  "a laser tripwire": {set: ["wits", "security", 6], find: 9, dice: 0, kind: "bashing", alarm: "a silent alert to the setter", note: "An invisible beam across a doorway."}
};

/** The names, for the coverage test: every arms, accessories and traps good is in one table or left to ammunition. */
export const AMMUNITION = ["a sling stone", "an arrow", "a crossbow bolt", "a powder horn", "a lead musket ball", "a cartridge", "a shotgun shell", "a spare pistol magazine"];
export const KIT = {"a gun cleaning kit": {note: "Cleaning a black-powder gun dries wet powder out of it; any gun cleaned is ready to fire."}};
