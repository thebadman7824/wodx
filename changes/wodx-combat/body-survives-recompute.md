---
bump: patch
---
Body traits and cyberware keep their effect after the sheet recomputes (B3804): the system worked out health totals and the wound penalty again after every actor update and wrote over the extra Bruised level of Huge Size and Sturdy and the eased penalty of High Pain Tolerance, Insensate to Pain and the Pain Editor, so the testbed gate saw no change. The system now calls a "wodxActorTotals" hook after its own totals, and Combat lays the body over them there.
