# WoDX Creation

Phase 3 of World of Darkness Expanded. Private use only.

- **The Embrace.** The Storyteller picks a mortal (or a ghoul) and a sire. A new vampire sheet is made from the mortal's, with the sire's clan, one Generation further from Caine, the generation chart's blood pool (V20 Dark Ages p. 340), one blood point on rising, the Road of Humanity at the mortal's rating (p. 111), and the clan Disciplines listed at 0 dots. The mortal sheet is kept in the folder "WoDX · Before the Embrace", and the mortal's tokens show the vampire.
- **Vitae.** A mortal who drinks becomes a ghoul with Potence 1 and a 10-point blood pool (p. 399). Each drink on a new night moves the blood oath on; the third binds (pp. 341–342).
- **Lineage.** Sire, domitor, bonds and the life before the Embrace are kept on each actor (`flags["wodx-creation"]`). The "WoDX Lineage" journal shows the trees, reading the sheets' Sire fields too.
- **Experience log.** The Storyteller awards experience; players ask to spend it from the droplet button. Costs come from each line's book (vampires V20 Dark Ages p. 183 and V20 p. 124; ghouls V20 Dark Ages p. 399 and Ghouls and Revenants p. 139). Requests wait in the WoDX approval queue, and the cost is checked again when approved. Awards and spends are the system's own Experience items, so the sheet's totals stay right; the "WoDX Experience Log" journal lists them by in-game date.

Needs WoDX Chronicle 0.1.7 or later. Werewolf, Mage and the other lines get their change-of-state wizards and costs in Phase 6.

## Phase 4: Pass the Years

- **Allies.** Any NPC can be made the ally of a player character; the patron's owners may then spend experience on it, from its own pool or the patron's.
- **Pass the Years** (Clock or droplet button). Pick a number of years and press "Show what happens". Each character's changes are listed: ageing and death checks, an heir, ghoul feeding or lapse (V20 Dark Ages p. 399), bonds fading (p. 342), voluntary torpor (p. 350), the new era's ability list, and Backgrounds to review. Tick what to accept, then "Pass the years". A plan can be written to the "WoDX Time Skips" journal without changing anything. Nothing is deleted: the dead go to "WoDX · The Dead".
- **Time-skip test.** The Phase 4 gate: it makes test characters and passes the years from 1200 to 2025. It moves the clock, so use it in wodx-template.

## 0.11.0: Lifepaths

- **Lifepath** (character sheet header, or the Creation window). An optional chain of scenes before points are spent: where and when the character was born, a youth, an adult life, the turn into the line (the Embrace, the First Change, the Awakening, a death, the Chrysalis, the calling, the Fall...), a scene for the clan, tribe, Tradition, kith, guild or creed, and the first years after. Every scene fits its year, 1197 to the World of Future Darkness. Choices suggest Backgrounds, Abilities, Merits and Flaws and name people from the past; the player keeps what fits and ticks who becomes an NPC. Nothing is spent. Back, Another scene and Start over are always there.
- The lifepath stays with the character through a change of state, and the Storyteller's prelude journal shows it.
