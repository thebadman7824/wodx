# World of Darkness Expanded (WoDX) fork

This folder is a private, local fork of the World of Darkness 20th edition
system for Foundry VTT (upstream 7.3.2 by Johan Falt, GPL-3.0). It is part of
the World of Darkness Expanded Project, which is for private use only: nothing
here is packaged, distributed or sold.

Fork changes (Phase 0, 7.3.2-wodx.1):

- system.json: new title and version; manifest and download URLs removed so
  Foundry never offers an update over the fork.
- wod.js: the migration check compares only the upstream part of the version
  (7.3.2), so the "-wodx" suffix never triggers a migration.
- module/migration.js: items of an unknown type are logged and kept, never
  deleted.

7.3.2-wodx.3 (Phase 6b): module/migration.js no longer reads ActiveEffect.icon
(gone since Foundry 12), which threw for every werewolf with an effect; the
old shape-effect clean-up it guarded is dropped, so nothing is deleted.

Everything else is upstream 7.3.2, unmodified. The source of truth is the
project repository (wodx-repo), where upstream is tagged as upstream-7.3.2.
7.3.2-wodx.4 (Phase 10 code review): mortal-actor-sheet.js no longer sets an undeclared `found` when a bonus is added (it threw); dialog-trait.js adds a PC-sheet ability's specialty to the specialty text instead of an undeclared variable (it threw at 4 dots); the error messages in wod-item-base.js and migration.js name the right thing; mummy-actor-sheet.js reads the actor's type; totals.js copes with an actor without items.
7.3.2-wodx.5 (Phase 10 code review, follow-up): the wodx.4 change took the wrong `found = true` out of mortal-actor-sheet.js. The Dark Ages vampire setup sets it again, so the sheet saves its era, and the line in the bonus branch of _onItemCreate, which threw "found is not defined", is gone.
7.3.2-wodx.6 (Phase 10 language pass): lang/en.json gains the sheet names that wod.js registers (wod.sheet.*) and the wraith sheet's "Unnamed passion" and "Unnamed fetter", which showed as raw keys; the weapon dialog's secondary-ability hint points at the key that exists, and its typo is fixed; the fixed-value bonus sheet uses its existing heading key. Other languages fall back to English for the new keys.
7.3.2-wodx.10 (public repository notice, B2950): the settings sidebar's Dark Pack section adds a line saying WoDX is an unofficial fan work, not official World of Darkness material; the manifest description says the same.

7.3.2-wodx.11 (vehicle sheets, B4968): actor types that a WoDX module defines (their names hold a dot, such as wodx-interactables.vehicle) are skipped by the character data preparation and the load-time migration, as the Group type is.

7.3.2-wodx.12 (line sheets on ApplicationV2, B6110 to B6113): each line sheet's code now runs on either sheet engine. LegacyActorSheetV2 gives a line sheet the old engine's getData, activateListeners, tabs, editors, image picker and whole-form saving on ApplicationV2 with the Handlebars mixin, so its code and templates move unchanged. The lines listed in module/actor/template/lines-v2.js (LINES_V2) use it; the first is Mummy. Each sheet keeps its name and id (WoD.MummyActorSheet), so characters keep their chosen sheet.

7.3.2-wodx.13 (line sheets on ApplicationV2, B6112): every line sheet now runs on ApplicationV2: Mortal, Vampire, Werewolf, Mage, Changeling, Hunter, Demon, Wraith, Mummy, Exalted, Changing Breed and Creature. Each stays its own entry in LINES_V2, so one line can go back to the old engine by taking it out of the list.

7.3.2-wodx.16 (final systems audit, B6720 to B6723): a Discipline, Gift or other power, a weapon's attack, an Arete casting and a Wonder or Trait rolled from the system's own windows now count WoDX's modifiers as the general roll window does (WoDX Sheets' sheetRollMods: merits and flaws, tiredness, powers, conditions, with Grieving's die off a social pool), and the card names them (module/scripts/wodx-roll-mods.js, called from DiceRoller); the power window passes its Ability to the roll. An item given from another character's sheet shows its note to the receiving owner instead of throwing; the trash on a removable bio field of a PC sheet removes it; the rule settings count on every client as soon as they change; the exploding dice setting defaults to a real choice; a Paradox roll, an item sort with no order and an initiative roll with an orphan token no longer read missing values; two English strings lose their dashes; Path of the Bones is in the sheet's Path list.
