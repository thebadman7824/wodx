# WoDX Combat 3.3.0

World of Darkness Expanded. Private use only; not for distribution or sale.

WoDX Combat is vtda20-combat 2.2.1 brought into the WoDX project under a new id. Everything in `README-vtda20.md` still applies: attack, defense, damage, soak (silver, cold iron, Fortitude, armor), health track, the profiles for every actor type, and the maneuvers. What changed:

- **New names.** The module is `wodx-combat`. Its API is `game.wodxCombat` (also `game.wodx.combat`); `game.vtda20combat` still works as an alias. Macros are "WoDX: …". The actor type is kept in `flags.world.wodx.profile`, and the old `flags.world.vtda20.profile` is read until the migration in WoDX Actions copies it.
- **Settings** start from the choices you made in vtda20-combat.
- **Never beside the old module.** While vtda20-combat is enabled, WoDX Combat stays off and says so.
- **Conditions** (WoDX Chronicle, V20 Dark Ages p. 348). The attack dialog lists the conditions on both sides and fills in their dice and difficulty:
  - a blinded attacker, or a blinded or held target;
  - an immobilized or staked target, who is hit automatically;
  - a target who is knocked down or dazed.
- **Dazed.** When one attack does more damage after soak than the target's Stamina (Stamina + 2 for the supernatural), the target is Dazed for one round. It shows as a timed effect.
- **Automatic attack** (3.3.0). The Weapon list starts on "Automatic: best attack for this character". When the attack is rolled it tries every weapon, natural weapon and unarmed attack on the sheet against this target with the dialog's other choices (maneuver, targeting, position, multiple actions, Willpower...), and uses the one with the most expected health levels after the target's own best defense and soak. The odds are worked out exactly from the dice (a 1 cancels a success; VtDA20 pp. 251, 344–345); lethal counts ×1.25 and aggravated ×1.6 when ranking, and bashing against a vampire is halved. It leaves out a mortal's bite (it needs a hold first), claws without Protean 2, Vicissitude or a shapechanger's body, melee weapons when the target is out of reach, and missiles beyond three times their range; with both tokens on the scene a missile's range band is set from the distance. The card names the choice, the runners-up and what was left out. Every weapon is still in the list to pick by hand.
- **Automatic defense** (3.2.0). The attack dialog's Defense list starts on "Automatic: best for this character". When the attack is rolled it works out parry, block and dodge from the defender's sheet for this attack, and rolls the one with the most expected successes (ties: parry, then block, then dodge). It follows the book's limits (VtDA20 p. 344): no parry or block against missiles, no block against lethal or aggravated damage without Fortitude or armor, dodging missiles +2 difficulty unless Celerity is in play. A parry counts only with a melee weapon on the sheet. The card says what it picked and what the others would have been. None, Dodge, Block and Parry are still in the list to choose by hand.
- **Werewolves and Fera** (3.1.0, Phase 6b). Silver and gold follow era, breed and form; teeth and claws follow the form; in the Dark Ages a Garou in Homid can't soak aggravated damage.
- **Search boxes** (rule B24): the weapon list gets one when there are more than five weapons. The other lists are fixed.

Needs WoDX Chronicle 0.2.0 or later.
