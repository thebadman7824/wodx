# Modules: Rothenstein world

Module list read 2026-11-06; WoDX versions are checked against each module.json by tools/harness/modules-table.test.mjs. Release notes live in each module's CHANGELOG.md, not in this table. Which build is on which world is in the release log, not here. wodx-template is the empty starting world for a new chronicle; tests and gates run in rothenstein-wodx.

Read from the world's `core.moduleConfiguration` setting. The clone `rothenstein-wodx` starts with the same list.

**Enabled (27):** adventuremusic, alter-ego, ATL, auraeffects, bindery-pdf-importer, ClueBook, combat-hp-display, combat-music-master, d10-roll-tracker, dungeon-draw, fantasy-town-generator-import, gmtext-in-notes, kill-ledger, lib-wrapper, light-sources, mkah-compendium-importer, oh-you-dead, pickyadventurer, quick-battlemap-importer, roll-table-importer, segue, SharedVision, socketlib, trs-foundryvtt-dice-set, vtda20-actions, vtda20-combat, WhisperBox.

**Installed but off in this world (17):** 3d-to-iso, angela-maps, argas-dice-roller, canvas-loot, canvas-tile-navigation, checks-and-saves-macros, cozymaps-free, dd-import, deck-of-many-bones, dransky-honeywood-animated-battlemaps, foundryvtt-dungen, isometric-perspective, LockView, monks-active-tiles, monks-tokenbar, rp-queue, universal-donjon-importer.

**Installed, not in this world's list:** d20-loot-tracker, dnd-randomizer, Dnd5eItemGenerator (D&D 5e tools; leave off in WoDX worlds).

WoDX notes:
- Window Controls 2.0.1 and libWrapper 1.13.5.1 are on in rothenstein-wodx (2026-11-08, B92): they add minimize and pin buttons to window title bars.
- vtda20-actions and vtda20-combat are the ones WoDX will replace (as wodx-actions and wodx-combat, decision B6).
- Monk's Active Tiles and Monk's TokenBar are installed but off; the plan uses Foundry's own Region behaviors instead.

## WoDX modules

Install every WoDX module together, even ones left off in a world. Some modules load rule files straight from a sibling's folder: Actions loads Combat's dice and health rules, Senses loads Actions' profiles, Storyteller loads Actions' and Otherworlds' rule tables. A sibling that is off is fine; one that is missing from the Data folder stops the module that loads it. cross-imports.test.mjs checks that every such file and name exists.

| Module | Version | What it does | Enable in |
|---|---|---|---|
| wodx-chronicle | 0.45.0 | The era clock, dated events, house rules, the crossover referee, the WoDX look and player buttons. [Changelog](../modules/wodx-chronicle/CHANGELOG.md) | rothenstein-wodx |
| wodx-otherworlds | 0.16.0 | The Umbra, the Shadowlands and other realms: crossings, realm maps and the Gauntlet. [Changelog](../modules/wodx-otherworlds/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle) |
| wodx-creation | 0.14.0 | Character and NPC creation, era advancement, the archive of the dead and changes of state. [Changelog](../modules/wodx-creation/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle) |
| wodx-actions | 3.53.0 | The Actions menu for every line: powers, feeding, social actions, trade and effect keywords. [Changelog](../modules/wodx-actions/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle) |
| wodx-combat | 3.19.0 | Fights: dice and health, the turn conductor, ways of moving and the body plan. [Changelog](../modules/wodx-combat/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle) |
| wodx-sheets | 0.13.0 | WoDX tabs and fixes on the line sheets, the anachronism check, the Body tab, the Relationships tab with Followers, the features card and what changed since last session. [Changelog](../modules/wodx-sheets/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle, wodx-actions) |
| wodx-npc | 0.43.0 | NPC profiles, routines, talk, factions, politics, rivalries, passers-by, relationships, lineage and secrets, followers and descriptions that spread. [Changelog](../modules/wodx-npc/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle, wodx-combat, wodx-actions) |
| wodx-storyteller | 0.44.0 | The Storyteller's tools: the open world, the night's draw, upkeep, ledgers, money, holdings, crafts, and battles and sieges. [Changelog](../modules/wodx-storyteller/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle; reads wodx-npc and wodx-otherworlds when on) |
| wodx-interactables | 0.32.1 | Doors, locks, containers, clues, carried light, chases and the case board. [Changelog](../modules/wodx-interactables/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle, wodx-actions; uses wodx-combat and wodx-npc when on) |
| wodx-targeting | 0.3.0 | Target suggestions for powers and attacks. [Changelog](../modules/wodx-targeting/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle, wodx-combat, wodx-actions) |
| wodx-voices | 0.2.0 | Plot NPCs speak their prewritten lines aloud, each in a voice of its own; Kokoro offline, browser speech as the fallback. [Changelog](../modules/wodx-voices/CHANGELOG.md) | rothenstein-wodx (reads wodx-npc talk cards; setting off by default, off on Live) |
| wodx-library | 0.17.0 | The Encyclopaedia, what a character could know, gear and goods by era, recipes and item uses. [Changelog](../modules/wodx-library/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle) |
| wodx-senses | 0.7.1 | Look, listen and smell from authored tables, the quiet interface and supernatural sight. [Changelog](../modules/wodx-senses/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle, wodx-actions; reads wodx-npc, wodx-interactables and wodx-otherworlds when on) |
| wodx-paperdoll | 0.6.4 | Layered portraits and tokens (paused until the art style is settled). [Changelog](../modules/wodx-paperdoll/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle; reads wodx-atmosphere when on) |
| wodx-atmosphere | 0.12.0 | Weather, light from the clock, era music and mood regions, scene opening cards. [Changelog](../modules/wodx-atmosphere/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle) |

Chronicle, Otherworlds and Creation stay idle in worlds without `flags.wodx` (the original Rothenstein world). WoDX Actions and WoDX Combat stay off wherever vtda20-actions or vtda20-combat is still enabled; the original Rothenstein world keeps the vtda20 modules, which stay installed.

System fork: 7.3.2-wodx.2 adds the Group actor type (data only; the sheet is in wodx-creation); 7.3.2-wodx.3 stops the load-time migration error for werewolves with effects; 7.3.2-wodx.4 fixes four upstream errors (adding a bonus on a sheet, a PC-sheet ability with a specialty in the roll dialog, two error messages). The 7.3.2-wodx.1 files it replaced are in `wodx-repo/backups/system-7.3.2-wodx.1`. 7.3.2-wodx.6 fills missing English language keys. 7.3.2-wodx.7 makes saves lighter: the after-save recompute runs only on the client that made the change and writes back only the values it changed, sheets no longer print the actor to the console on each redraw, and line sheets skip their Core tab when WoDX Sheets draws its own (B600, B601). 7.3.2-wodx.8 lets WoDX Actions take a Mage 20th caster's Rote item into its own Cast window (B765).
