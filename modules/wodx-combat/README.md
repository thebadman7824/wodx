# WoDX Combat 3.0.0

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
- **Search boxes** (rule B24): the weapon list gets one when there are more than five weapons. The other lists are fixed.

Needs WoDX Chronicle 0.2.0 or later.
