---
bump: patch
---
Body traits and cyberware keep their effect at prepare time too (B3808): the system works out the wound level and penalty again every time it prepares an actor, from the stored totals, which undid B3804 on the testbed (gatetraits step 29, gatecyber step 8). The fork now calls a "wodxActorDerived" hook after that, and Combat lays the extra Bruised levels and the eased penalty over it.
