# Modules: Rothenstein world, 2026-11-06

Read from the world's `core.moduleConfiguration` setting. The clone `rothenstein-wodx` starts with the same list.

**Enabled (27):** adventuremusic, alter-ego, ATL, auraeffects, bindery-pdf-importer, ClueBook, combat-hp-display, combat-music-master, d10-roll-tracker, dungeon-draw, fantasy-town-generator-import, gmtext-in-notes, kill-ledger, lib-wrapper, light-sources, mkah-compendium-importer, oh-you-dead, pickyadventurer, quick-battlemap-importer, roll-table-importer, segue, SharedVision, socketlib, trs-foundryvtt-dice-set, vtda20-actions, vtda20-combat, WhisperBox.

**Installed but off in this world (17):** 3d-to-iso, angela-maps, argas-dice-roller, canvas-loot, canvas-tile-navigation, checks-and-saves-macros, cozymaps-free, dd-import, deck-of-many-bones, dransky-honeywood-animated-battlemaps, foundryvtt-dungen, isometric-perspective, LockView, monks-active-tiles, monks-tokenbar, rp-queue, universal-donjon-importer.

**Installed, not in this world's list:** d20-loot-tracker, dnd-randomizer, Dnd5eItemGenerator (D&D 5e tools; leave off in WoDX worlds).

WoDX notes:
- Window Controls 2.0.1 and libWrapper 1.13.5.1 are on in rothenstein-wodx (2026-11-08, B92): they add minimize and pin buttons to window title bars.
- vtda20-actions and vtda20-combat are the ones WoDX will replace (as wodx-actions and wodx-combat, decision B6).
- Monk's Active Tiles and Monk's TokenBar are installed but off; the plan uses Foundry's own Region behaviors instead.

## WoDX modules

| Module | Version | Phase | Enable in |
|---|---|---|---|
| wodx-chronicle | 0.4.2 | 1, 6a, 6d (X-card hook), 6e (the WoDX look: era kits, line accents, bundled fonts; player buttons; Find my character), 7a (the generator core), era advancement (the Passing the years house rules), 0.4.2 (header buttons show in the WoDX look) | rothenstein-wodx, wodx-template |
| wodx-otherworlds | 0.2.0 | 2, 5 | rothenstein-wodx, wodx-template |
| wodx-creation | 0.6.1 | 3, 4, 6a, 6b, Actions 3.2, 7a (People), era advancement (B83; 0.6.1 works with WoDX Actions or Sheets off) | rothenstein-wodx, wodx-template (needs wodx-chronicle) |
| wodx-actions | 3.11.0 | 6a, 6b, Kindred additions, sunlight, 6c (wraiths, hunters, True Faith, Numina, hedge magic), 6d (the inner voice), 6e (menus by intent, one card layout), 6f (Dark Ages mages), 6g (Dark Ages fae), 6h (Changeling 20th), 6i–6l (Demon, Kindred of the East, Mummy, Orpheus), 6m (Mage 20th) | rothenstein-wodx, wodx-template, instead of vtda20-actions (needs wodx-chronicle) |
| wodx-combat | 3.7.0 | 6a, 6b, automation, gridless, the Corpus track, the turn conductor | rothenstein-wodx, wodx-template, instead of vtda20-combat (needs wodx-chronicle) |
| wodx-sheets | 0.5.0 | Phase 6 sheets: the Dark Ages sheets (Fae, Mage, Inquisitor, Werewolf, V20 Dark Ages Kindred and ghoul) and the later eras' (V20 and ghoul, W20, M20, C20, Wraith 20, Hunter: The Reckoning, Demon, Mummy, Kindred of the East, Orpheus), following the era. 0.5.0: a look of its own for each line (title face, paper and section rules, light and dark), behind the world setting "Sheet look" | rothenstein-wodx (needs wodx-chronicle, wodx-actions 3.11.0) |
| wodx-npc | 0.2.1 | 7b (NPC profiles and combat tactics), 7c (places, routines on the clock, WoDX: Reaction regions) | rothenstein-wodx, wodx-template (needs wodx-chronicle, wodx-combat, wodx-actions) |

Chronicle, Otherworlds and Creation stay idle in worlds without `flags.wodx` (the original Rothenstein world). WoDX Actions and WoDX Combat stay off wherever vtda20-actions or vtda20-combat is still enabled; the original Rothenstein world keeps the vtda20 modules, which stay installed.

System fork: 7.3.2-wodx.2 adds the Group actor type (data only; the sheet is in wodx-creation); 7.3.2-wodx.3 stops the load-time migration error for werewolves with effects. The 7.3.2-wodx.1 files it replaced are in `wodx-repo/backups/system-7.3.2-wodx.1`.
