---
bump: patch
---
Routines remember how their last walk went (moved along its way, refused, or placed square by square after an error), read by the sprite check gate (B6143) to tell a walk that was never animated from one that was.
