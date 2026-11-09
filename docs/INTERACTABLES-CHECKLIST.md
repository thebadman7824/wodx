# Interactables checklist: doors, locks and windows (WoDX Interactables 0.1.0)

Step 1 of the design note (WoDX: Interactable Map Elements). Steps 2 (climbing, ledges and jumps) and 3 (targets) follow.

- [x] Foundry 14.369 source read for door controls, the wall document and the wall config window: the door click extends CONFIG.Canvas.doorControlClass; walls take flags; wall levels are a set (empty means every level)
- [x] Pure rules (interact-rules.mjs): kinds, materials, builds, four lock grades, keypads, breakable walls, the lock skill by line and era, options for an object and a character, outcomes, noise and hearing, listening (B108 to B112)
- [x] The Interact window (token HUD button and the I key): everything within reach on the token's level, nearest first, a search box past three, the pool, difficulty, successes, time and noise before the roll
- [x] Door-click shortcut on locked doors (world setting; the Storyteller holds Shift)
- [x] The WoDX part of the wall config window: kind, material, build, lock, keypad, key, bar and side, stuck, secret door found, breakable wall
- [x] The roll on the player's client by WoDX Actions' pool rules; the result applied on the Storyteller's client from the card's own dice, with Undo; ownership checked
- [x] A wall knocked through waits in the approval queue
- [x] Noise: NPCs in earshot roll to hear; the card names them and their likely response; hook wodxInteractablesNoise
- [x] Long attempts move the clock outside combat; Undo moves it back if nothing else has moved it
- [x] Gender-neutral text; no NPC dialogue
- [x] Harness tests (interactables.test.mjs): rules and runtime on a stand-in for Foundry
- [x] UI fit at three sizes with Foundry 14's own foundry2.css (in the cloud, with the PC's stylesheet)
- [ ] V20 core page refs pinned from the book texts on the PC (marked TODO in interact-rules.mjs; the V20 Dark Ages refs are in)
- [x] Gate in rothenstein-wodx (tools/gate/gate-interact.mjs): 10/10 on 2026-11-09, at commit e69ea48. The first runs failed on the gate script itself (dice mapping, reach, stored totals, creation order of walls and tokens), fixed in PRs 14 to 19; the module did not change
- [x] Deployed 2026-11-09 (Interactables 0.1.0, MD5s checked), on in rothenstein-wodx only

## 0.2.0: containers (2026-11-09)
- [x] Rules: container kinds, materials and builds, state on the tile, contents list, options (open, close, take, key, pick, keypad, force) (B116)
- [x] Runtime: containers on tiles in the Interact list (hidden ones for the Storyteller only), cards, items handed over, Undo takes them back
- [x] Tile config: the WoDX container part
- [x] Harness tests (6 new) and UI fit
- [x] Gate steps 11 and 12 in rothenstein-wodx: 12/12 on 2026-11-09, at commit 4a6a04b
- [x] Deployed 2026-11-09 (backup Backups\wodx-interactables-0.1.0-2026-11-09, MD5s checked), on in rothenstein-wodx only

## 0.3.0: traps (2026-11-09)
- [x] Rules: four kinds, four grades, damage by kind or set by hand, getting clear, a snare holding its victim, searching by grade (B117)
- [x] Runtime: springing on token moves (hidden on the path, found only where the move ends; NPCs when ticked), damage through WoDX Combat, noise, Undo with the damage
- [x] Search the area in the Interact window; the Storyteller is whispered what was missed
- [x] Disarm, set off from a distance, set again, break free, cut free
- [x] Tile config: the Trap section; world setting "Traps go off"
- [x] Harness tests (9 new) and UI fit
- [ ] Gate steps 13 to 15 in rothenstein-wodx (first run 14/15: the gate's pit skipped the Storyteller-owned burglar; gate fixed)
- [x] Deployed 2026-11-09 (backup Backups\wodx-interactables-0.2.0-2026-11-09, MD5s checked)
- [ ] V20 core falling page ref pinned on the PC

## 0.4.0: clues (2026-11-09)
- [x] Rules: five kinds, four texts by successes, Intelligence or Perception + Investigation, best successes kept, noticing by its own number (B118)
- [x] Runtime: examine or read; the text whispered to the player and the Storyteller; Search the area notices hidden clues; Undo deletes the whisper
- [x] Tile config: the Clue section
- [x] Harness tests (4 new) and UI fit
- [ ] Gate step 16 in rothenstein-wodx
- [ ] Deployed

## Still to build (Ben, 2026-11-09), in order
- [x] Traps (0.3.0, deployed)
- [x] Clues and documents (0.4.0, not deployed yet)
- [ ] Light sources
- [ ] Hiding places
- [ ] Fire and hazards
- [ ] Altars, relics and fetishes
- [ ] Watch points (mirrors, windows on the street, phones and radios)
- [ ] Mounts and vehicles
- [ ] Step 2: climbing, ledges and jumps
