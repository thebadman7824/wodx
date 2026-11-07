# Phase 3 checklist: Creation

## Done by Claude (2026-11-07)

- [x] New module `wodx-creation` 0.1.0 installed in `Data\modules\wodx-creation` (not yet enabled).
- [x] WoDX Chronicle 0.1.5: other WoDX modules now wait for it to be ready.
- [x] The Embrace: a new vampire from the mortal's sheet, with the sire's clan, Generation + 1, the generation chart's blood pool, the Road of Humanity, and the clan Disciplines at 0 dots. The mortal sheet is kept in "WoDX · Before the Embrace".
- [x] Vitae: the first drink makes a ghoul with Potence 1; three drinks on three nights make the blood oath.
- [x] Lineage on every actor and a "WoDX Lineage" journal.
- [x] Experience log: awards, player requests at book costs through the approval queue, and a "WoDX Experience Log" journal.
- [x] Quality gate, automatic part: all tests and the UI fit check pass.
- [x] Archive world: the roof and tile fix is applied (backup in `Backups\wodx-phase3-archive-tilefix`).

## For you

1. Setup → Backups: snapshot `rothenstein-wodx`.
2. Restart Foundry, so it loads WoDX Chronicle 0.1.5. Open **rothenstein-wodx**. Manage Modules → enable **WoDX Creation** → save and reload.
3. Make a test mortal for the Embrace, or pick a minor NPC you can spare. If a player will test the experience request, give that player ownership of the mortal.
4. Token controls → droplet button (**Creation and experience**) → **Embrace a mortal**. Pick the mortal and a sire (say, Sister Marta). Clan and Generation fill in from the sire. Press **Embrace**.
5. **Gate, check:**
   - A new vampire sheet with the same name: the sire's clan, one Generation higher than the sire's, the blood pool from the chart with 1 point in it, the Road of Humanity at the mortal's rating, and the clan Disciplines at 0.
   - The old mortal sheet sits in the folder "WoDX · Before the Embrace".
   - Any token of the mortal now shows the vampire.
   - A chat card "The Embrace", and the "WoDX Lineage" journal shows the childe under the sire.
6. In the same window, **Award experience**: 20 points to the new vampire.
7. As the player (or as yourself), open the droplet button with the vampire's token selected. Ask for a clan Discipline 0 → 1 (10 points). As the Storyteller, approve it in the Approval queue. The Discipline should read 1, the sheet's experience should show 10 spent, and the "WoDX Experience Log" journal should list both entries with the in-game date.
8. Optional: **Give vitae** from the sire to another mortal three nights running (advance the Chronicle Clock a day between drinks). The first drink makes a ghoul with Potence 1; the third binds.
9. Open the archive world once and look at Dolany: the roofs should sit on their houses there too.
10. Look at the browser console (F12) for red lines starting with "WoDX", then tell Claude you're done.
