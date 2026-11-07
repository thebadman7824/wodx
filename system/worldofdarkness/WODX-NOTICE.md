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
