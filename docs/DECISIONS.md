# WoDX decisions (build log)

Decisions taken while building. The master plan's review table holds the design decisions; this file holds the build ones.

| # | Date | Decision | Why |
|---|------|----------|-----|
| B1 | 2026-11-06 | Pre-launch review accepted: a minimal template world and the Rothenstein rebuild move into Phase 0. Phase 8 only finishes the template. | Gives every later phase a real world to test against. |
| B2 | 2026-11-06 | Rothenstein is rebuilt by cloning its database into a new world, `rothenstein-wodx`, not by reinstalling from the omnibus. The original world stays untouched as the archive. | Keeps PCs, history, scenes, journals and settings exactly as played. |
| B3 | 2026-11-06 | The clone keeps loading art and sound from the original world's `assets` folder. | Avoids copying about 600 files; the original folder must stay in place. |
| B4 | 2026-11-06 | The system keeps the id `worldofdarkness`; version becomes `7.3.2-wodx.1`; manifest and download URLs are removed. | Worlds and compendia keep working, and Foundry can't offer an upstream update that would overwrite the fork. |
| B5 | 2026-11-06 | Systems are global in Foundry, so the archive world also runs on the fork. Phase 0 changes are safety-only, so this is harmless. From Phase 1 on, any change that alters data must be gated by a WoDX world flag. | One install per system id. |
| B6 | 2026-11-06 | When module work starts, WoDX modules get new ids (`wodx-actions`, `wodx-combat`). `vtda20-actions` and `vtda20-combat` stay frozen at 2.2.1 for the archive world. | Modules are global too; new ids let the two worlds run different code. |
| B7 | 2026-11-06 | Migration safety: the fork never deletes items of an unknown type, and compares only the upstream part of its version. | Upstream deleted invalid items during migration; the version suffix would otherwise trigger a migration on every load. |
| B8 | 2026-11-06 | Every phase completion and every major version change gets a thorough error and bug check, with fixes, before it is called done. Checklist: QUALITY-GATE.md; automatic part: `tools/quality-check.sh`. | Ben's rule. |
| B9 | 2026-11-06 | World time 0 is 1 January 1197 (Julian). Components keep Foundry's meaning (year counted from 0), so durations still work; `yearZero` 1197 gives the real year. | One fixed epoch for every WoDX world. |
| B10 | 2026-11-06 | Mages use upstream's Victorian ability set before 1837, and every line uses the Victorian set in the Great War. Marked in the profiles as WoDX choices. | Upstream has no Dark Ages set for Mage and no 1910s set for anyone. |
| B11 | 2026-11-06 | Between eras (such as 1601 to 1836), the last era's rules stay in force and the clock says "between eras"; the Storyteller can lock another profile. | No era book covers those years. |
| B12 | 2026-11-06 | Players can only send free-form requests to the approval queue; automation proposals come from the GM's own client. | A player must not be able to propose an era change or similar. |
| B13 | 2026-11-07 | Gauntlet charts: Dark Ages: Werewolf before 1601; Wyld West book in the Wild West; W20 for the Victorian age, the Great War and later, since W20 is the basis book for those years. Values a book does not give are marked as WoDX choices and recorded in Chronicle Rules. | Settles the plan's open risk about Victorian, Wild West and Great War values without inventing a new chart. |
| B14 | 2026-11-07 | Ratings live on scenes (flags), and a region behavior overrides its scene. | Tagging 211 scenes by hand would be slow; most maps are one kind of place throughout. |
| B15 | 2026-11-07 | When a caught Garou succeeds, or a packmate's roll frees them, they arrive on the far side. | W20 doesn't say where a freed traveler ends up. |
| B16 | 2026-11-07 | Rothenstein's tags ship as a preset in the module, read from the scene names and the chronicle's own journals. | A fast, checkable start for the gate. |
