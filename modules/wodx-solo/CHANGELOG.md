# WoDX Solo: changes

## 0.1.0 (2026-11-12)

The first step of The Lone Chronicle, for the testbed only.

- One world setting, The Lone Chronicle, sets every automation to act by itself: NPCs in combat, routines and factions to Auto, every turn ends itself, fights start by themselves, New Night runs at dusk, sunlight is rolled and applied, the night is drawn at dusk, and each kind of entry in the approval queue gets a standing approval. Turning it off puts back every value it changed, and leaves alone any you changed by hand since.
- The Storyteller's seat: the active Storyteller's browser watches for cards whispered to the Storyteller, windows that open there and entries left in the approval queue. After a short wait it takes the choice that goes ahead (never an undo, a refusal or a deletion) and writes what it did in a log. A card it cannot judge is logged and left.
- The seat views whichever scene the player is viewing, so the people there can see and reach the character.
- A player who logs in while the seat is empty is told so.
- It does nothing in the Live world, whatever the setting says.
