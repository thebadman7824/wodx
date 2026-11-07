# Modules: Rothenstein world, 2026-11-06

Read from the world's `core.moduleConfiguration` setting. The clone `rothenstein-wodx` starts with the same list.

**Enabled (27):** adventuremusic, alter-ego, ATL, auraeffects, bindery-pdf-importer, ClueBook, combat-hp-display, combat-music-master, d10-roll-tracker, dungeon-draw, fantasy-town-generator-import, gmtext-in-notes, kill-ledger, lib-wrapper, light-sources, mkah-compendium-importer, oh-you-dead, pickyadventurer, quick-battlemap-importer, roll-table-importer, segue, SharedVision, socketlib, trs-foundryvtt-dice-set, vtda20-actions, vtda20-combat, WhisperBox.

**Installed but off in this world (17):** 3d-to-iso, angela-maps, argas-dice-roller, canvas-loot, canvas-tile-navigation, checks-and-saves-macros, cozymaps-free, dd-import, deck-of-many-bones, dransky-honeywood-animated-battlemaps, foundryvtt-dungen, isometric-perspective, LockView, monks-active-tiles, monks-tokenbar, rp-queue, universal-donjon-importer.

**Installed, not in this world's list:** d20-loot-tracker, dnd-randomizer, Dnd5eItemGenerator (D&D 5e tools; leave off in WoDX worlds).

WoDX notes:
- vtda20-actions and vtda20-combat are the ones WoDX will replace (as wodx-actions and wodx-combat, decision B6).
- Monk's Active Tiles and Monk's TokenBar are installed but off; the plan uses Foundry's own Region behaviors instead.

## WoDX modules

| Module | Version | Phase | Enable in |
|---|---|---|---|
| wodx-chronicle | 0.1.7 | 1 | rothenstein-wodx, wodx-template |
| wodx-otherworlds | 0.2.0 | 2, 5 | rothenstein-wodx, wodx-template |
| wodx-creation | 0.2.0 | 3, 4 | rothenstein-wodx, wodx-template (needs wodx-chronicle) |

All three stay idle in worlds without `flags.wodx` (the original Rothenstein world).
