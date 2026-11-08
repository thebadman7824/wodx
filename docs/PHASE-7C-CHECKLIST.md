# Phase 7c checklist: movement and routines (WoDX NPC 0.2.0)

- [x] Pure rules (routine-rules.mjs): the block for a time, changes between two times, place resolution, feast days, the curfew, noticing, the reaction pick
- [x] Harness tests for dusk and dawn, weekdays, feast days, a midnight wrap and a week's skip (phase7c.test.mjs)
- [x] Places: scene and region flags, the Places window (211 scenes, search box), first guesses from scene names, owners matched to NPCs
- [x] Routines: a ready routine per template (and presets for the day watch, labourer, innkeeper, recluse), the routine editor on the NPC's behaviour window and the NPC panel, the current place per NPC
- [x] The clock: on updateWorldTime NPCs walk on the scene in view and change place elsewhere; on opening a scene and after a time skip they are placed without walking; Suggest (default), Auto with Undo, Off for the world, a scene or an NPC
- [x] Interruptions: a fight or a reaction pauses a routine; the NPC walks back after; the dead, in torpor, incapacitated or missing are reported once
- [x] The WoDX: Reaction region behaviour: enter, leave, stay; night, curfew, trespass, a weapon, the supernatural shown; noticing by the era's book; the response from the profile; a fight waits for the Storyteller
- [x] Obfuscated and Sneaking registered as WoDX conditions (token statuses)
- [x] Runtime tests on a stand-in for Foundry (phase7c-runtime.test.mjs); gender-neutral text; no NPC dialogue
- [x] Gate script (tools/gate/gate7c.mjs), run in wodx-template
- [x] UI fit at three sizes, on the PC
- [x] Deployed (0.2.1), Foundry restarted for the new region behaviour
- [x] Gate 7c in Foundry: 23 of 23 in rothenstein-wodx
