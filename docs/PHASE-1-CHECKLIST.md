# Phase 1 checklist: clock and eras

## Done by Claude (2026-11-06)

- [x] New module `wodx-chronicle` 0.1.0 installed in `Data\modules\wodx-chronicle` (not yet enabled in any world).
- [x] Calendar: Julian, then Gregorian from the reform (Bohemia, 1584, by default). World time 0 is 1 January 1197.
- [x] Chronicle Clock with sunset, sunrise, dark hours, moon phase and auspice moon; next dusk and next dawn.
- [x] Eleven era profiles (nine by date, two prologues); era changes go through the approval queue.
- [x] House-rule switches, written to the Chronicle Rules journal.
- [x] Approval queue; "Ask the Storyteller" for players.
- [x] Safety tools: anonymous X-card (also Ctrl+Shift+X), lines and veils, Session Zero journal.
- [x] Era test tool for the gate.
- [x] Quality gate, automatic part: 19 unit tests and 16 mock-Foundry tests pass; every Foundry call checked against the 14.369 source.

## Gate result

Passed on 2026-11-06. Ben ran every step and saw no errors in the console. Claude then read both worlds' databases and Foundry's logs:

- The "WoDX Era Test" journal in wodx-template reads "All passed": 44 of 44. Each era's ability set shows a different count, for example 23 for Dark Ages vampires, 29 for Victorian, 30 for Modern and 19 for Living Gods.
- wodx-template reached 1347; the era change went through the approval queue and was approved. Its Session Zero journal holds the test line without a name.
- rothenstein-wodx is set to 1200, with the Dark Ages profile in force and the upstream era settings unchanged (darkages, with victorian for Mage).
- The logs show nothing from WoDX. Every warning and error is explained in BUILD-LOG.md.

## For you (done)

1. Setup → Backups: snapshot `rothenstein-wodx` and `wodx-template` (Foundry also made its own backups of both at 22:09 tonight).
2. Restart Foundry so it sees the new module.
3. Open **wodx-template**. Manage Modules → enable **WoDX Chronicle** → save and reload.
4. The Chronicle Clock opens. Click **Set date** and pick any date.
5. **Gate:** in the clock, click **Era test**, then confirm. The "WoDX Era Test" journal should end with "All passed" (44 characters: 11 eras, 4 lines). Delete the "WoDX era tests" actor folder afterwards if you like.
6. Quick checks while you're there:
   - Advance past 31 December 1346: an era change appears in the approval queue (inbox button in the token controls).
   - Press the X-card: the card shows and the game pauses.
   - Add a line or veil; it appears in the Session Zero journal without a name.
7. Press F12 and look at the console for red lines starting with "WoDX". Note any you see.
8. Then enable WoDX Chronicle in **rothenstein-wodx** and set the opening date in 1200.
9. Tell Claude when you're done. Claude then reads Foundry's logs, the last step of the quality gate.

Leave the module off in the original Rothenstein world. It would stay idle there anyway, because that world has no WoDX flag.
