---
bump: patch
effect: a player's feeding relayed to the Storyteller's computer plays the vessel's sprite there when no player owns the vessel, and the player's own computer still plays its own tokens; only a vampire's feeding makes the vessel swoon
visible: an NPC vessel fed on by a player's character swoons on every screen
---
Final audit second pass (B6789): onFed reads the relayed wodxFed payload; the Storyteller's computer plays the moves of tokens no player owns and the feeder's computer plays the tokens its user owns, so nothing plays twice.
