---
bump: minor
effect: the builder's new Ways step turns the rebuilt world's 62 old map exits into walkable Ways and lays 36 doors from the streets to the houses, workshops and rooms inside, then shows the network check in its window
visible: walking a token into a street exit, a gate or a house door on the map moves the company to the next map at its arrival spot; each door is a gold region on the street map's south edge
---
Ways laid by the builder (B4810-B4813): a new step after the anchors turns each old Teleport Token exit between the walkable maps into a WoDX Way in the same region (the teleport is switched off, and comes back on when the step is taken back), makes a door from its street to each place inside named in the recipe, and runs the network check. The api gains builder.layWays and builder.takeBackWays.
