# WoDX Interactables

Doors, locks, windows and walls that can be broken through, on Foundry 14's own walls. Private use only.

- **Interact**: select a token, then the door button on the token HUD or the I key. Everything within reach, nearest first, with the roll, the difficulty, the successes needed, the time and the noise shown before rolling. Clicking a locked door opens the same window for that door (Storyteller: Shift-click).
- **Setting up a door**: the WoDX part of the wall's config window. Plain doors need nothing: a locked one has a good lock, and the build follows the material.
- **Results** apply at once on the Storyteller's client, with Undo on the card. A wall knocked through waits in the approval queue.
- **Noise**: NPCs in earshot roll to hear quiet and loud attempts; the Storyteller's card names them. Hook: `wodxInteractablesNoise`.

Rules: `scripts/interact-rules.mjs` (pure, tested in tools/harness/interactables.test.mjs). Decisions B108 to B112.
