---
bump: patch
effect: Sense Wyrm now finds people tainted by Wyrm corruption from WoDX Otherworlds, and Correspondence sight now finds the ways, trods and Moon Paths that WoDX builds
visible: a tainted person gets the Wyrm ring on the sensing player's map, and each way on the scene gets its circle and a label naming where it leads
---
Final audit fixes. Sense Wyrm used to read only the fomor mark, so a person tainted by Otherworlds' Wyrm corruption showed nothing, even though the corruption card says Sense Wyrm finds them. Correspondence sight read the old single destination of a Teleport Token region, so it missed every WoDX way, which keeps a set of destinations (B6790, B6791).
