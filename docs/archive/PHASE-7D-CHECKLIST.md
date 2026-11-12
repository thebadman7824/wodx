# Phase 7d checklist: factions and domains (WoDX NPC 0.3.0)

- [x] Book checks on the PC: Herd, Domain, Influence, Status and Fame, and the hunting rules, in V20 (pp. 113-115, 259-260) and V20 Dark Ages (pp. 180-181, 183, 334); no book rule for faction turns or rumours (B98 to B101)
- [x] Rothenstein's own factions read from its journals (B102)
- [x] Pure rules (faction-rules.mjs): records, dice, the six moves, picking and resolving a move, small and big (B86), applying changes with their exact inverse, turns due, a whole turn, hunting grounds, a rumour's day, fading, untended Backgrounds
- [x] Harness tests for the rules (phase7d.test.mjs) and the runtime on a stand-in for Foundry (phase7d-runtime.test.mjs)
- [x] Factions: a world record, the Factions window (search boxes), the faction editor, Rothenstein's factions in one click
- [x] Turns: end of the session, Run a turn, a time skip (one a week, at most twelve), a week of the clock; Suggest (default), Auto with Undo, Off
- [x] The approval queue: every result in Suggest; big ones always; approving a rise gives the Prince's displeasure or the hunters' hunt; rejecting stops the rumour
- [x] Hunting: the area by era, Domain, Fame, Herd, trespass; the Hunting window rolls it hour by hour
- [x] Breaches: from WoDX Actions' Masquerade ledger (Actions 3.11.2 calls wodxBreach), or reported by hand; spread by day; rise to the Prince, then the era's hunters; contained when every witness is dealt with; fade in a quiet week
- [x] Gender-neutral text; no NPC dialogue
- [x] Gate script (tools/gate/gate7d.mjs), for rothenstein-wodx; it never moves the clock
- [x] UI fit at three sizes, on the PC, with Foundry 14's own foundry2.css: every window passes (498 checks)
- [x] Deployed (NPC 0.3.0, Actions 3.11.2), backups first, every file checked by MD5, Foundry restarted
- [x] Gate 7d in rothenstein-wodx: 10 of 10 (the first run, 9 of 10, found rumours had no places to spread through in a world with none tagged in 7c; fixed)
