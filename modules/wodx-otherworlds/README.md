# WoDX Otherworlds 0.2.0 (Phases 2 and 5)

Part of the World of Darkness Expanded project. Private use only; not for distribution or sale. Runs only in worlds whose `world.json` carries `flags.wodx`.

## What it does

- **Ratings on scenes and regions.** Each scene can be tagged with its kind of place (town, village, wilderness, caern and so on), plus an optional Gauntlet override, a modifier, Shroud, Banality, whether a reflective surface is at hand, and an Umbral storm. A region with the "WoDX: Otherworld ratings" behavior overrides its scene. The Storyteller tags scenes in **Otherworld ratings by scene** (ghost button in the token controls). That window can suggest tags from scene names, fill them from a preset (Rothenstein ships with one), let battlemaps follow their scene, and write a report journal.
- **The era's chart.** The Gauntlet comes from the chart of the era in force (WoDX Chronicle): Dark Ages: Werewolf before 1601, the Wyld West book in the Wild West, and W20 from the Victorian age on. The charts, with every WoDX choice marked, are written to the Chronicle Rules journal as "Gauntlet charts".
- **Step sideways and peek** (token controls, for the selected Garou). Rolls Gnosis by the era's rules: the reflective surface, the Dark Ages penalty for repeated tries, the W20 hour of waiting, shift time, the pack's opener of the way, Caught and Lost, and the Umbral storm's double 1s. Results go to chat with the dice. Statuses: In the Umbra, Caught in the Gauntlet, Lost in the Pattern Web.
- **Penumbra prototype** (in the ratings window). Copies the scene you are viewing and adds a Penumbra Scene Level, so lighting, sound and sight can be tested per layer. Stepping sideways there moves the token onto the Penumbra level and back.

## Phase 5: the twin worlds

- **Penumbra and Shadowlands levels** (clone button in the token controls, Storyteller). Each world map gets a Penumbra level (elevation 1000) and a Shadowlands level (2000) showing its twin night map from `Data/wodx-assets/twins` (listed in `manifest.json` there). Roofs, props and lights are copied onto each twin level: roofs with their twin art, lights colder and a little dimmer. Travel regions are copied too, so a road out of one map's Penumbra leads to the next map's Penumbra; a twin road stays switched off until the far side has its twin. Walls, sounds and other regions stay on every level. Each scene is backed up to `Data/wodx-backups/scenes` before it changes; building again only adds what is missing. Removing twins asks first and puts everything back on every level.
- **Stepping sideways** moves the token to the Penumbra level and back, keeping its height above the floor.
- **Cross the Shroud** (skull button, Storyteller). Moves the selected tokens to the Shadowlands level and back, with the place's Shroud rating and how they crossed on a whispered card. No roll is made; each power has its own (Phase 6). A Garou cannot step sideways from the Shadowlands.
- **Disconnection** (W20 p. 319). Each crossing is recorded on the actor. Each lunar cycle spent in one world adds +1 to crossing to the other. After a year and a day in the Umbra, the Storyteller gets a proposal in the approval queue.
- **Umbral paths.** In the twin levels window: a Teleport Token region on two scenes' Penumbra levels only, so only travelers in the Umbra take it.
- **Read the Soul** (sparkling hand button). Select the reader, target the one read. Auspex 2; Perception + Empathy at difficulty 8 (V20 Dark Ages p. 195). The roll goes to the Storyteller only; the player sees what the soul shows, by successes: shade, main colour, patterns, subtle shifts, mixtures. A botch shows a false reading. The aura is drawn around the token for the reader alone, for 20 seconds. The Storyteller sets each character's colours with the palette button; vampire, ghoul, werebeast, witch, ghost and fae are read from the sheet, and frenzy from its condition.
- **One Umbra** (rule B31). Where the lines' ideas of the spirit world conflict, Wraith comes first, then Werewolf, then Mage. The conflicts decided so far are listed in Chronicle Rules, "Gauntlet charts".

## API

`game.modules.get("wodx-otherworlds").api` (also `game.wodx.otherworlds`): `stepSideways()`, `peek()`, `clearCrossing()`, `openRatings()`, `writeReport()`, `writeChartsPage()`, `buildPenumbraPrototype(scene)`, `placeOf(tokenDocument)`, `rules`, `STATUS`, `crossShroud()`, `openTwins()`, `twins` (`buildTwins`, `removeTwins`, `planTwins`, `relinkTravel`, `makeUmbralPath`, `layersOf`), `disconnectionOf(actor)`, `worldOf(actor)`, `checkYearAndDay()`, `readTheSoul({reader, target})`, `editAura(actor)`, `senses`.

Hooks: `wodxCrossing({mode, inUmbra, outcome, result, place, travelers})` after each roll; `wodxShroudCrossing({back, means, tokens, place})`.
