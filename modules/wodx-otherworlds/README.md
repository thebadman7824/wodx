# WoDX Otherworlds 0.1.1 (Phase 2)

Part of the World of Darkness Expanded project. Private use only; not for distribution or sale. Runs only in worlds whose `world.json` carries `flags.wodx`.

## What it does

- **Ratings on scenes and regions.** Each scene can be tagged with its kind of place (town, village, wilderness, caern and so on), plus an optional Gauntlet override, a modifier, Shroud, Banality, whether a reflective surface is at hand, and an Umbral storm. A region with the "WoDX: Otherworld ratings" behavior overrides its scene. The Storyteller tags scenes in **Otherworld ratings by scene** (ghost button in the token controls). That window can suggest tags from scene names, fill them from a preset (Rothenstein ships with one), let battlemaps follow their scene, and write a report journal.
- **The era's chart.** The Gauntlet comes from the chart of the era in force (WoDX Chronicle): Dark Ages: Werewolf before 1601, the Wyld West book in the Wild West, and W20 from the Victorian age on. The charts, with every WoDX choice marked, are written to the Chronicle Rules journal as "Gauntlet charts".
- **Step sideways and peek** (token controls, for the selected Garou). Rolls Gnosis by the era's rules: the reflective surface, the Dark Ages penalty for repeated tries, the W20 hour of waiting, shift time, the pack's opener of the way, Caught and Lost, and the Umbral storm's double 1s. Results go to chat with the dice. Statuses: In the Umbra, Caught in the Gauntlet, Lost in the Pattern Web.
- **Penumbra prototype** (in the ratings window). Copies the scene you are viewing and adds a Penumbra Scene Level, so lighting, sound and sight can be tested per layer. Stepping sideways there moves the token onto the Penumbra level and back.

## API

`game.modules.get("wodx-otherworlds").api` (also `game.wodx.otherworlds`): `stepSideways()`, `peek()`, `clearCrossing()`, `openRatings()`, `writeReport()`, `writeChartsPage()`, `buildPenumbraPrototype(scene)`, `placeOf(tokenDocument)`, `rules`, `STATUS`.

Hook: `wodxCrossing({mode, inUmbra, outcome, result, place, travelers})` after each roll.
