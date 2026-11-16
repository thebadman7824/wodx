---
bump: patch
effect: none, the herd listener skips the relayed copy of a player's feeding, since the player already sent its own herd update; the herd counts as before
visible: none, the herd record changes once per feeding as before
---
Final audit second pass (B6789): herds.mjs onFed returns early on a relayed wodxFed, so the new relay does not count one feeding twice.
