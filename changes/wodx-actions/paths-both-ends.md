---
bump: patch
---
Lore of Paths' Conceal and Close now hide or seal both ends of a laid path, not only the end picked: the path's other end is found through its teleport behaviour again (B6445). A path's ends are now matched by the regions they name, whether Foundry keeps a destination whole or relative to its scene, and Warp keeps what Foundry stored for the gate to read.
A path warped back on itself, and one put back by Undo, are read correctly though Foundry keeps those ends as relative uuids.
