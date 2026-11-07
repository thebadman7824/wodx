# Phase 2 checklist: map crossings

## Done by Claude (2026-11-07)

- [x] New module `wodx-otherworlds` 0.1.0 installed in `Data\modules\wodx-otherworlds` (not yet enabled).
- [x] WoDX Chronicle updated to 0.1.2: each era profile now names its Gauntlet chart.
- [x] Gauntlet charts from the books: Dark Ages: Werewolf, W20, and the Wyld West Expansion Pack. Values the books don't give are marked as WoDX choices.
- [x] Scene ratings (kind of place, override, modifier, Shroud, Banality, mirror, storm) and a region behavior that overrides them.
- [x] Step sideways and peek, by Dark Ages or W20 rules, with pack openers and the In the Umbra, Caught and Lost statuses.
- [x] Tagging window with name suggestions, a Rothenstein preset (109 scenes plus their battlemaps), and a report journal.
- [x] Penumbra prototype: copies a scene with a second Scene Level.
- [x] Quality gate, automatic part: 13 rule tests and 15 mock-Foundry tests for Otherworlds pass, and Chronicle's still pass. Every Foundry call was checked against the 14.369 source.

## For you

1. Setup → Backups: snapshot `rothenstein-wodx`.
2. **Restart Foundry.** The new region behavior type is only registered at startup.
3. Open **rothenstein-wodx**. Manage Modules → enable **WoDX Otherworlds** → save and reload.
4. Token controls → ghost button (**Otherworld ratings by scene**):
   - Choose the Rothenstein preset → **Fill from preset**.
   - Click **Battlemaps follow their scene**.
   - Set anything still empty that you want rated: the travel maps, Sessio VII, and the title and landing cards if you like.
   - **Save**, then **Write report**. The "WoDX Otherworld Ratings" journal should show Lower Town scenes at 6, villages and farmland at 5, and woods, the Grove and the Adit at 4.
5. Rothenstein has no Garou actors, so create a test **Werewolf** actor and give it a few points of Gnosis on its sheet.
6. **Gate:** put its token on three maps (Lower Town Square, Dolany Village, the Old Grove), select it, and press **Step sideways** (door button) on each. The chat card should show difficulty 6, 5 and 4, or one less with the mirror ticked. Press it again once in the Umbra to step back.
7. Optional, the Levels prototype: view Locus · The Old Grove, open the ratings window → **Penumbra prototype**. On the copy, step the test Garou sideways. The token should move to the Penumbra level. Note how lighting, sound and sight look there.
8. Look at the browser console (F12) for red lines starting with "WoDX", then tell Claude you're done.
