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
| wodx-chronicle | 0.4.0 | 1, 6a, 6d (X-card hook), 6e (the WoDX look: era kits, line accents, bundled fonts; player buttons; Find my character), 7a (the generator core) | rothenstein-wodx, wodx-template |
| wodx-otherworlds | 0.2.0 | 2, 5 | rothenstein-wodx, wodx-template |
| wodx-creation | 0.5.0 | 3, 4, 6a, 6b, Actions 3.2, 7a (People) | rothenstein-wodx, wodx-template (needs wodx-chronicle) |
| wodx-actions | 3.6.2 | 6a, 6b, Kindred additions, sunlight, 6c (wraiths, hunters, True Faith, Numina, hedge magic), 6d (the inner voice), 6e (menus by intent, one card layout) | rothenstein-wodx, wodx-template, instead of vtda20-actions (needs wodx-chronicle) |
| wodx-combat | 3.6.0 | 6a, 6b, automation, gridless, the Corpus track | rothenstein-wodx, wodx-template, instead of vtda20-combat (needs wodx-chronicle) |
| wodx-npc | 0.1.0 | 7b (NPC profiles and combat tactics) | rothenstein-wodx, wodx-template (needs wodx-chronicle, wodx-combat, wodx-actions) |

Chronicle, Otherworlds and Creation stay idle in worlds without `flags.wodx` (the original Rothenstein world). WoDX Actions and WoDX Combat stay off wherever vtda20-actions or vtda20-combat is still enabled; the original Rothenstein world keeps the vtda20 modules, which stay installed.

System fork: 7.3.2-wodx.2 adds the Group actor type (data only; the sheet is in wodx-creation); 7.3.2-wodx.3 stops the load-time migration error for werewolves with effects. The 7.3.2-wodx.1 files it replaced are in `wodx-repo/backups/system-7.3.2-wodx.1`.
