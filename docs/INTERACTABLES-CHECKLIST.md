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
- [ ] Gate in rothenstein-wodx (tools/gate/gate-interact.mjs), through the PC helper thread, after Ben's OK to deploy
- [ ] Deployed (Interactables 0.1.0, a new module: enable it in rothenstein-wodx; Foundry restart)
