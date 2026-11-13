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
| wodx-chronicle | 0.56.0 | The era clock, dated events, house rules, the crossover referee, the WoDX look and player buttons. [Changelog](../modules/wodx-chronicle/CHANGELOG.md) | rothenstein-wodx |
| wodx-otherworlds | 0.25.1 | The Umbra, the Shadowlands and other realms: crossings, realm maps and the Gauntlet. [Changelog](../modules/wodx-otherworlds/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle) |
| wodx-creation | 0.34.0 | Character and NPC creation, era advancement, the archive of the dead and changes of state. [Changelog](../modules/wodx-creation/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle) |
| wodx-actions | 3.64.0 | The Actions menu for every line: powers, feeding, social actions, trade and effect keywords. [Changelog](../modules/wodx-actions/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle) |
| wodx-combat | 3.27.1 | Fights: dice and health, the turn conductor, ways of moving (riding and a swimmer's load among them) and the body plan. [Changelog](../modules/wodx-combat/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle) |
| wodx-sheets | 0.20.1 | WoDX tabs and fixes on the line sheets, the anachronism check for sheets and maps, the Body tab, the Relationships tab with Followers, the features card and what changed since last session. [Changelog](../modules/wodx-sheets/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle, wodx-actions) |
| wodx-npc | 0.74.0 | NPC profiles, routines, talk (generated and overheard), factions, politics, rivalries, passers-by, relationships, lineage and secrets, followers, descriptions that spread, the residents of a generated town, and whole settlements from the town generator. [Changelog](../modules/wodx-npc/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle, wodx-combat, wodx-actions) |
| wodx-storyteller | 0.70.0 | The Storyteller's tools: the open world, the country map behind a trip, the night's draw, upkeep, ledgers, money, holdings, crafts, battles, sieges, ships at sea, the world map of the whole Earth, and the chronicle builder. [Changelog](../modules/wodx-storyteller/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle; reads wodx-npc and wodx-otherworlds when on) |
| wodx-interactables | 0.42.1 | Doors, locks, containers, clues, carried light, chases and the case board. [Changelog](../modules/wodx-interactables/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle, wodx-actions; uses wodx-combat and wodx-npc when on) |
| wodx-targeting | 0.4.0 | Target suggestions for powers and attacks. [Changelog](../modules/wodx-targeting/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle, wodx-combat, wodx-actions) |
| wodx-voices | 0.3.2 | Plot NPCs speak their prewritten lines aloud, each in a voice of its own, with emotion from the line and the mood; a Chatterbox voice server on the PC, then Kokoro offline, then browser speech. [Changelog](../modules/wodx-voices/CHANGELOG.md) | rothenstein-wodx (reads wodx-npc talk cards; setting off by default, off on Live) |
| wodx-library | 0.23.1 | The Encyclopaedia, what a character could know, gear and goods by era and region, recipes and item uses. [Changelog](../modules/wodx-library/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle) |
| wodx-senses | 0.10.0 | Look, listen and smell from authored tables, the quiet interface and supernatural sight. [Changelog](../modules/wodx-senses/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle, wodx-actions; reads wodx-npc, wodx-interactables and wodx-otherworlds when on) |
| wodx-paperdoll | 0.23.0 | Pixel faces that blink, speak and react, with features by line; Net persona faces; the Figure builder for sprite tokens. [Changelog](../modules/wodx-paperdoll/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle; reads wodx-atmosphere when on) |
| wodx-atmosphere | 0.16.0 | Weather, light from the clock, era music and mood regions, scene opening cards. [Changelog](../modules/wodx-atmosphere/CHANGELOG.md) | rothenstein-wodx (needs wodx-chronicle) |
| wodx-solo | 0.3.0 | The Lone Chronicle, for one person playing alone: a hidden browser holds the Storyteller's seat, one switch sets every automation to act by itself, a watcher answers whatever waits for a Storyteller, and the player has a panel of their own. [Changelog](../modules/wodx-solo/CHANGELOG.md) | rothenstein-wodx for tests, switch off; later a solo world of its own (needs wodx-chronicle). Never on at a shared table; does nothing in rothenstein-live |

Chronicle, Otherworlds and Creation stay idle in worlds without `flags.wodx` (the original Rothenstein world). WoDX Actions and WoDX Combat stay off wherever vtda20-actions or vtda20-combat is still enabled; the original Rothenstein world keeps the vtda20 modules, which stay installed.

System fork: 7.3.2-wodx.2 adds the Group actor type (data only; the sheet is in wodx-creation); 7.3.2-wodx.3 stops the load-time migration error for werewolves with effects; 7.3.2-wodx.4 fixes four upstream errors (adding a bonus on a sheet, a PC-sheet ability with a specialty in the roll dialog, two error messages). The 7.3.2-wodx.1 files it replaced are in `wodx-repo/backups/system-7.3.2-wodx.1`. 7.3.2-wodx.6 fills missing English language keys. 7.3.2-wodx.7 makes saves lighter: the after-save recompute runs only on the client that made the change and writes back only the values it changed, sheets no longer print the actor to the console on each redraw, and line sheets skip their Core tab when WoDX Sheets draws its own (B600, B601). 7.3.2-wodx.8 lets WoDX Actions take a Mage 20th caster's Rote item into its own Cast window (B765). 7.3.2-wodx.9 takes the word "(deprecated)" off the names of the line actor types, which WoDX uses as its main ones (B2490). 7.3.2-wodx.10 adds an unofficial fan work line to the Dark Pack notice in the settings sidebar (B2950).
