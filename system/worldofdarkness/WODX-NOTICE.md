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
