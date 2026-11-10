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
- [x] V20 core page refs pinned from the book texts on the PC (2026-11-09; the V20 Dark Ages refs are in)
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
- [x] Gate steps 13 to 15 in rothenstein-wodx: 17/17 at 70673c3 (earlier runs missed step 14 because a plain token update did not reach the pit; the gate now jumps the token)
- [x] Deployed 2026-11-09 (backup Backups\wodx-interactables-0.2.0-2026-11-09, MD5s checked)
- [x] V20 core falling page ref pinned (printed p. 296, pdf p. 304)

## 0.4.0: clues (2026-11-09)
- [x] Rules: five kinds, four texts by successes, Intelligence or Perception + Investigation, best successes kept, noticing by its own number (B118)
- [x] Runtime: examine or read; the text whispered to the player and the Storyteller; Search the area notices hidden clues; Undo deletes the whisper
- [x] Tile config: the Clue section
- [x] Harness tests (4 new) and UI fit
- [x] Gate step 16 in rothenstein-wodx: 17/17 at 70673c3
- [x] Deployed 2026-11-09

## 0.5.0: light sources (2026-11-09)
- [x] Rules: five kinds; light, put out, break (B119)
- [x] Runtime: the scene's lights by id or nearby, with the Otherworlds copies; Undo
- [x] Tile config: the Light source section
- [x] Harness tests (2 new) and UI fit
- [x] Gate step 17 in rothenstein-wodx: 17/17 at 70673c3
- [x] Deployed 2026-11-09 (backup Backups\wodx-interactables-0.4.0-2026-11-09-b)

## 0.6.0: hiding places (2026-11-09)
- [x] Rules: six kinds with room and how hard to find; Dexterity + Stealth; searching by successes (B150)
- [x] Runtime: the Invisible status, Search it, Search the area, walking out, Undo; the Storyteller is whispered who stays hidden
- [x] Tile config: the Hiding place section
- [x] Harness tests (3 new) and UI fit
- [x] Gate step 18 in rothenstein-wodx: 18/18 at 414877e
- [x] Deployed 2026-11-09 (backup Backups\wodx-interactables-0.5.0-2026-11-09)

## 0.7.0: fire and hazards (2026-11-09)
- [x] Rules: fire (size, heat, by kind of character), brazier, glass, live wire; putting out, alight, sweep, power (B151)
- [x] Runtime: walking in, a turn in combat, WoDX Combat soak at the heat, lights tied to a fire, Undo
- [x] WoDX Combat 3.7.6: a soak difficulty from the caller
- [x] Tile config: the Hazard section
- [x] Harness tests (10 new) and UI fit
- [x] Gate step 19 in rothenstein-wodx: 19/19 at fe68eef
- [x] Deployed 2026-11-09 (backups Backups\wodx-interactables-0.6.0-2026-11-09, Backups\wodx-combat-3.7.5-2026-11-09)
- [x] Electrocution page ref pinned (V20 core printed p. 295, pdf 303)

## 0.8.0: altars, relics and fetishes (2026-11-09)
- [x] Rules: holy ground with a rating, desecration, a demon seared (WoDX Actions' reading of Demon pp. 254-255); relics and fetishes to take (B152)
- [x] Runtime: Pray here opens WoDX Actions' prayer; stepping on or a turn in combat; take with Undo
- [x] Tile config: the Altar, relic or fetish section
- [x] Harness tests (6 new) and UI fit
- [x] 0.8.1: caern stones, fetters and nodes open the WoDX actions menu (1 test)
- [x] Gate step 20 in rothenstein-wodx: 20/20 at 7f71eb0 (0.8.1)
- [x] Deployed 2026-11-09 (backups Backups\wodx-interactables-0.7.0-2026-11-09, -0.8.0-2026-11-09)

## 0.10.0: watch points (2026-11-09)
- [x] Rules: windows and mirrors (Perception + Alertness, names or a count; no Lasombra in a mirror), phones and radios by era, bells (B153)
- [x] Runtime: the tied tile, the whisper, calls and alarms, wodxMapEvent, Undo
- [x] Tile config: the Watch point section
- [x] Harness tests (5 new) and UI fit
- [x] Gate step 21 in rothenstein-wodx: 21/21 at 3d1153d
- [x] Deployed 2026-11-09 (backup Backups\wodx-interactables-0.8.1-2026-11-09)
- [x] Lasombra reflection page ref pinned (V20 core printed p. 59, pdf 67; Flaw printed p. 494, pdf 502)

## 0.11.0: mounts and vehicles (2026-11-09)
- [x] Rules: eight kinds with seats and eras; getting on, Keep control, Go flat out, throws and crashes (B154)
- [x] Runtime: at the reins and passengers, the tile and passengers carried with the driver's token, walking off, wodxMapEvent, Undo
- [x] Ride and Drive read from the sheet; an untrained Skill the sheet lacks still costs +1
- [x] Tile config: the Mount or vehicle section, with who is aboard and Everyone off
- [x] Harness tests (6 new) and UI fit
- [x] Gate step 22 in rothenstein-wodx: passes in 0.13.1 (24/24)
- [x] Deployed 2026-11-09 (backup Backups\wodx-interactables-0.10.0-2026-11-09)
- [x] Untrained Skill page ref pinned (V20 core printed p. 257, pdf 265; Knowledges printed p. 107, pdf 115)

## 0.12.0: pictures, markers and map events (2026-11-09)
Step 1 of "Responsive Maps for WoDX".
- [x] Rules: states by kind, the look for each, event kinds, the map event, feedback per player (B160)
- [x] Runtime: picture swaps on the active Storyteller's client, Undo follows; markers on each client; tied ambient sounds; wodxMapEvent on every card and on Undo; floating word, flash and sound on each client by socket
- [x] Tile config: pictures and sounds (a picture per state, follow a door or window, no marker, change sound, tied sounds)
- [x] Settings: Map effects (each player), State markers (world)
- [x] Harness tests (7 new) and UI fit
- [x] Gate step 23 (pictures and events) in rothenstein-wodx: passes in the 24/24 run at 296459b
- [x] Deployed 2026-11-09 (backup Backups\wodx-interactables-0.11.0-2026-11-09)

## 0.13.0: climbing, ledges and jumps (2026-11-09)
- [x] Rules: five climbs by yards a success, gaps by yards, catching the ledge, falls by height (B155)
- [x] Runtime: arriving moves the token to the tile the climb leads to; falls through WoDX Combat; Undo for both
- [x] Mounts: the vehicle follows the driver's token by offset
- [x] Tile config: the Climb or gap section
- [x] Harness tests (5 new) and UI fit
- [x] Gate steps 22 and 24 in rothenstein-wodx: 24/24 at 296459b (0.13.1)
- [x] Deployed 0.13.1 2026-11-09 (backup Backups\wodx-interactables-0.13.0-2026-11-09)
- [x] Deployed 0.13.0 2026-11-09 (backup Backups\wodx-interactables-0.12.0-2026-11-09)

## 0.14.0: targets on tiles (2026-11-09)
Step 3 of the design note.
- [x] Rules: four kinds, range bands from WoDX Combat, rings and points, bottles, a dummy, five builds of things to break, era name (B156, B157)
- [x] Runtime: listed out of reach as far as the sheet's weapons carry; shots with each ranged weapon on the sheet; the scoreboard on the tile; Undo takes a new name off it
- [x] Tile config: the Target section, the scoreboard, Clear the scoreboard
- [x] Map: Broken shows for broken things and fallen rows, with a break event
- [x] Harness tests (8 new) and UI fit
- [x] Gate step 25 in rothenstein-wodx: 25/25 at f232f99
- [x] Deployed 2026-11-09 (backup Backups\wodx-interactables-0.13.1-2026-11-09, MD5s checked)
- [x] Aiming page ref pinned (V20 core printed p. 277, pdf 285); the shot note gives the Firearms limits

## Still to build (Ben, 2026-11-09), in order
- [x] Traps (0.3.0, deployed)
- [x] Clues and documents (0.4.0, deployed)
- [x] Light sources (0.5.0, deployed)
- [x] Hiding places (0.6.0, deployed)
- [x] Fire and hazards (0.7.0, deployed)
- [x] Altars, relics and fetishes (0.8.1, deployed)
- [x] Watch points (0.10.0, deployed)
- [x] Mounts and vehicles (0.11.0, deployed; 0.13.0 fixes the cart following)
- [x] Step 2: climbing, ledges and jumps (0.13.1, deployed)
- [x] Step 3: targets on tiles (0.14.0, deployed)

## 0.18.0: a live wire holds you (2026-11-09)
- [x] Rules: Pull free of the current (Strength 5 for a vampire, 9 otherwise); cutting the power frees everyone; a vampire's botched soak is aggravated (B387)
- [x] Runtime: walking onto a live wire holds the character; Undo
- [x] WoDX Combat 3.8.2: botchAggravated on soakAndApply
- [x] Harness tests (3 new)
- [ ] Gate step 26 in rothenstein-wodx
- [ ] Deployed


## 0.19.0: adopt a generated map (2026-11-10)
- [x] Sidecar file from the farmstead generator (doors, shutters, chest, beds, hay, oven, well, places, triggers)
- [x] Rules: read and check the file, cells to pixels, match the imported door walls, plan, summary (B404)
- [x] Runtime: Adopt a generated map and Undo the map adoption on the scene's right-click menu, Storyteller only
- [x] Harness tests (11 new)
- [ ] Gate in rothenstein-wodx: import the farmstead, adopt it, interact with a door, the chest and the well, undo
- [ ] Deployed


## 0.20.0: a container's fill starts from where it sits (2026-11-10)
- [x] Rules: first guess from the container's own setting, its region's place tag, the scene's tag (B405)
- [x] Runtime: Usual contents field in the tile config; the draw window says where the guess came from
- [x] Farmstead file sets the chest to a home
- [x] Harness tests (2 new)
- [ ] Gate (gateadopt step 4) in rothenstein-wodx
- [ ] Deployed
