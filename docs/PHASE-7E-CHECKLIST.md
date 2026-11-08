# Phase 7e checklist: the open world (WoDX Storyteller 0.1.0, Chronicle 0.4.3)

- [x] Scope from the Master Plan (Player freedom and choice: free travel, solo play, personal time, the tracker, convening, fairness and safety) and the Phase 7 Plan's 7e outline and rows 19 and 20 (B86)
- [x] Where it lives: a new module, WoDX Storyteller (B103)
- [x] Pure rules (world-rules.mjs): the log and its filters, what needs a look, personal time and dawn, travel minutes and the road, solo limits, reconciling times, beats, the spotlight, tonight's summary, the report between sessions
- [x] Runtime (core.mjs): travel moves tokens between scenes and pulls the player's view; places that ask first, encounters, beats that call characters and world-changing results go to the approval queue; convening moves the clock and pauses solo play; dawn warnings and catch-up; the feed from chat cards, tokens, crossings, breaches and the queue
- [x] Windows (apps.mjs): the tracker, Out on your own, Convene, Beats and the beat editor, Travel places, Tonight's summary, Between sessions, End the session; search boxes on every growable list
- [x] Players act only for characters they own (checked on the Storyteller's client)
- [x] Gender-neutral text; no NPC dialogue; no decision numbers or phase names in game text
- [x] Harness tests (phase7e.test.mjs, phase7e-runtime.test.mjs); 411 pass; quality check passes
- [x] Gate script (tools/gate/gate7e.mjs), for rothenstein-wodx
- [ ] UI fit at three sizes on the PC with Foundry 14's own foundry2.css
- [ ] Deployed (Storyteller 0.1.0, Chronicle 0.4.3), backups first, every file checked by MD5, Foundry restarted, with Ben's OK while the Live Version world is in use
- [ ] Gate 7e in rothenstein-wodx
