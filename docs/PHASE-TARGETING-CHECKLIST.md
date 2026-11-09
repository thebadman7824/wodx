# WoDX Targeting checklist (WoDX Targeting 0.1.0, Actions 3.12.0, Combat 3.7.5)

- [x] Decisions from the feasibility note: B84 (Ben), B113 and B114 (settled as recommended)
- [x] Tags for every library power: script seed, then a pass by eye over all 931 summaries
- [ ] Tags checked against the books (elder powers and the Necromancy and Thaumaturgy paths first, tagged from their names)
- [x] Pure rules (target-rules.mjs): sides, ranges, ranking for each intent, casting defaults, modes, last attacker, hand-set
- [x] The panel in twelve power and casting windows; the attack window opens on the picker's choice
- [x] Settings: Targeting (Off, Suggest, Automatic for the Storyteller) and Targeting for me (per computer)
- [x] Gender-neutral text, no em-dashes in prose
- [x] Harness tests (targeting.test.mjs, 18); 406 pass; quality check passes
- [x] UI fit at three sizes with Foundry 14's own CSS: every window passes
- [x] Gate script (tools/gate/gatetarget.mjs), for rothenstein-wodx only
- [x] Deployed (Targeting 0.1.0, Actions 3.12.0, Combat 3.7.5) on 2026-11-09 with Ben's OK, backups first, every file checked by MD5, Foundry restarted
- [x] Gate in rothenstein-wodx: 9/9 on 2026-11-09 (the first run, 7/9, read Celerity, a self power, in steps 4 and 5; the gate was fixed in PR 13). Ticked area boxes checked by eye: they show.
- [ ] WoDX NPC reads the same picker for its "Use a power" plans
