# Phase 4 checklist: Time

## Done by Claude (2026-11-07)

- [x] Rule B24 (search boxes) and NPC allies, released as wodx-chronicle 0.1.6, wodx-otherworlds 0.1.3 and wodx-creation 0.1.1.
- [x] WoDX Chronicle 0.1.7: time skips, with per-tick work paused while one runs, and a "Pass the years" button on the Clock.
- [x] WoDX Creation 0.2.0: the Pass the Years window, the "WoDX Time Skips" journal, and the "Time-skip test" gate tool.
- [x] Quality gate, automatic part: all tests pass, including the gate run from 1200 to 2025 in a stand-in for Foundry.

## For you

1. Setup → Backups: snapshot **wodx-template** and **rothenstein-wodx**.
2. Restart Foundry.
3. **Allies (from your last request), in rothenstein-wodx:** open the droplet button. Tick "Show every NPC", type a name in the search box, press "Make ally" on a ghoul or retainer, and pick a player character as patron. As that player, the droplet button now offers the ally, and a spend request goes to the approval queue.
4. **Search boxes:** try the search box in the Embrace dialog, the Award list, the ratings window and the approval queue.
5. **Gate, in wodx-template** (it moves that world's clock to 2025 for good):
   - Manage Modules: make sure WoDX Chronicle and WoDX Creation are enabled.
   - Droplet button → **Time-skip test** → confirm.
   - The "WoDX Time-Skip Test" journal should say 27 of 27 checks passed. The five "Skip Test ·" characters show the results. Two mortals are in "WoDX · The Dead", the ghoul is alive with an 18-point blood pool, and the elder's sheet has Firearms and Computer while keeping Melee 3, Dominate 3 and Theology 3.
6. **Optional, in rothenstein-wodx: a plan only.** Clock → **Pass the years** → 50 → "Show what happens", then "Write the plan to a journal". Read it in "WoDX Time Skips". Do not press "Pass the years" there unless you mean to skip your chronicle ahead.
7. Look at the browser console (F12) for red lines starting with "WoDX", then tell Claude you're done.

## After the first run (wodx-creation 0.2.1)

The test ran in rothenstein-wodx. To put Rothenstein back and finish the gate:

1. Return to Setup. In **Backups**, pick rothenstein-wodx and restore the backup from 7 November (the newest one, made just before the test). This replaces the world as it is now, so do it only if you didn't change anything else in Rothenstein since then that you want to keep.
2. Restart Foundry, so it loads wodx-creation 0.2.1.
3. Open **wodx-template** and enable WoDX Chronicle and WoDX Creation there if they are off. The droplet button → **Time-skip test** (the button only appears in that world). It should report 27 of 27.

## Gate result

- [x] Passed, 27 of 27, in wodx-template. rothenstein-wodx restored to 1200. Phase 4 complete.
