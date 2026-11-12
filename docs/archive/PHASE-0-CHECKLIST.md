# Phase 0 checklist

## Done by Claude (2026-11-06)

- [x] Backups in `FoundryVTT\Backups\wodx-phase0\`: the Rothenstein world database and world.json (`rothenstein-world-snapshot-2026-11-06.zip`) and the untouched system 7.3.2 (`worldofdarkness-system-7.3.2.zip`). The world's `assets` folder isn't in the zip; it is unchanged and is in your Foundry snapshot.
- [x] New world `rothenstein-wodx`: a copy of the Rothenstein database taken at 9:46 pm on 2026-11-06, checked record by record (0 errors).
- [x] New world `wodx-template`: an empty world on the fork.
- [x] Fork installed into `Data\systems\worldofdarkness` (system.json, wod.js, module/migration.js, WODX-NOTICE.md).
- [x] Repository delivered as `wodx.bundle` beside this file.

## For you

1. Return to the Setup screen and restart Foundry, so it reads the new system.json.
2. Setup → Game Systems: the system should read "World of Darkness Expanded (WoDX)", version 7.3.2-wodx.1. Lock it with the padlock.
3. Stay on Foundry 14.369 until the Phase 0 gate passes.
4. Setup → Backups: take a snapshot now that the fork is installed.
5. Gate: open `rothenstein-wodx` and check the counts below; then open the original world and `wodx-template` once each.
6. Pick how players will connect (same machine, LAN, port forward or a relay). That choice doesn't block Phase 1.

## Gate result

Passed on 2026-11-06. All three worlds opened on 7.3.2-wodx.1. Foundry's server log for `rothenstein-wodx` shows 252 actors, 2,242 items and 211 scenes, matching the original. Foundry also wrote its own backups of the system and both new worlds before migrating.

## Gate counts for rothenstein-wodx

| What | Count |
|------|-------|
| Actors | 252 (2,040 embedded items) |
| Items | 2,242 |
| Scenes | 211 (7,245 walls, 1,847 lights, 557 notes, 376 regions) |
| Journals | 18 (388 pages) |
| Roll tables | 170 |
| Playlists | 183 (1,042 sounds) |
| Macros | 44 |
| Folders | 345 |
| Users | 5 |
| World compendia | 8 |

Pass if the counts match, scene art and sound play, the same modules are on, and the console shows no `WoDX |` lines.

If you played the original world after 9:46 pm on 2026-11-06, those changes aren't in the clone. Ask Claude to re-clone after closing the world.
