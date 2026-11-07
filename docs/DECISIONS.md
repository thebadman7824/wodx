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
