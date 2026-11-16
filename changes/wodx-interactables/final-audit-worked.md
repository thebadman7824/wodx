---
bump: patch
effect: picking, forcing or searching at a door, lock or device now tells WoDX Paperdoll, and a rider thrown by a beast that goes down is Knocked down as WoDX Combat knows it (the stand-up roll and the lost action follow)
visible: a sprite token stoops to the lock, strikes the door or looks about when the work is applied, and the thrown rider's token shows Knocked down instead of the core prone mark
---
Final audit fixes (B6784, B6785): Interactables now fires wodxInteractableWorked on the Storyteller's computer when work is applied, which Paperdoll already listened for but nothing sent; riders thrown when their beast goes down get WoDX Combat's Knocked down, falling back to the core prone status without Combat.  One red herring line for clues was reworded (it matched a book sentence word for word): "It seems to have nothing to do with the matter at hand." is now "It seems unrelated to what is going on here."
