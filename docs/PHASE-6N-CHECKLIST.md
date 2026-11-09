# Phase 6n checklist: the Dark Ages: Mage Grimoire (B240–B244)

- [x] Research: the Grimoire's rotes, wonders and rules, read on the PC from page renders (docs/research/da-grimoire-notes.md)
- [x] Pure rules (scripts/mage-da-grimoire.js): 78 rotes, seasons and Sunday, the Moon, specialties, experience for another fellowship's magic, countermagic, Using the Art, Pillar levels, wonders, Certámen
- [x] castPlan: season, Sunday, Foundation specialty; the Grimoire's rotes in ROTES with their pages
- [x] Windows: cast (Grimoire rotes, season, Sunday, specialties, 10s re-rolled), Fellowship and Pillars (specialties), Gather Quintessence (the Moon), Countermagic, Using the Art, Certámen with Strike and Yield
- [x] Menu: Countermagic, Using the Art, Certámen, each with its hint; key daCountermagic (daCounter is the fae's)
- [x] Gender-neutral text and no em-dashes (B97 guard); search boxes on the rote list, the guide and the mage list (B24)
- [x] Harness: phase6n.test.mjs (9); all 706 tests pass
- [x] UI fit on the PC: 654 windows ok, 2026-11-09 (the cloud container lacks Font Awesome, so every window fails its header-icon check there)
- [x] Deploy WoDX Actions 3.15.0 to rothenstein-wodx: backup Backups/wodx-actions-3.14.1-2026-11-09, 58 files, 0 MD5 mismatches, server restarted
- [x] Gate 6n in Foundry: 8/8, 2026-11-09 (afd5404). Gates 6f 12/13 and 6g 17/18 alongside: every functional step passed; the one miss in each was its version check, still pinned to 3.7 and 3.8, now loosened to any 3.x
