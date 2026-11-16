---
bump: patch
effect: a sheet whose line skin arrives after the four-second wait still wears it, and the file is not loaded twice
visible: a Creature or other line sheet opened on a busy machine shows its line's paper once the file lands
---
Gate run 1774 (B6950): a line skin slower than the four-second wait no longer counts as failed for good. The page stops waiting, the file goes on loading, and it counts as loaded when it lands; a second sheet of that line does not put the file in again.
