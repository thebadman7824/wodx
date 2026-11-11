# WoDX hooks

The custom hooks the WoDX modules send, who sends them and who listens. A module that is off simply hears nothing, so no sender needs to know its listeners. The harness test `hooks.test.mjs` reads the code and fails when a hook is sent that is neither heard by a module nor listed below as an extension point, so this file stays true.

## Heard

| Hook | Sent by | Heard by |
|---|---|---|
| wodxAttitude | npc | npc (a fight when an NPC turns hostile) |
| wodxBreach | actions | npc, storyteller |
| wodxChronicleReady | chronicle | actions, creation, interactables, npc, otherworlds, storyteller |
| wodxCrossing | otherworlds | storyteller |
| wodxDamageApplied | combat | actions, npc |
| wodxEndScene | chronicle | actions, storyteller |
| wodxEraApplied | chronicle | atmosphere, chronicle, otherworlds |
| wodxEventFired | chronicle | interactables |
| wodxFormChanged | actions | actions |
| wodxHunted | actions | storyteller |
| wodxInteractablesNoise | interactables | senses |
| wodxItemsTaken | interactables | storyteller (marks things taken from someone else's container as stolen) |
| wodxMapEvent | chronicle, interactables, npc | npc, otherworlds, storyteller |
| wodxNpcTurnDone | combat, npc | combat |
| wodxPlaceAlarm | npc | npc (remarks and cries) |
| wodxRegisterMigrations | chronicle | chronicle |
| wodxSensesGather | senses | senses |
| wodxShroudCrossing | otherworlds | storyteller |
| wodxSkipEnd | chronicle | actions, atmosphere, chronicle, interactables, npc, otherworlds, sheets, storyteller |
| wodxStockFilter | interactables | storyteller (a market thins or fills a trader's stock draw by its supply) |
| wodxXCard | chronicle | actions |

## Extension points (sent, nobody listens yet)

Kept on purpose, so a later module or a world macro can listen without changing the sender.

| Hook | Sent by | Carries |
|---|---|---|
| wodxAtmosphereReady | atmosphere | Atmosphere's API, once it is ready |
| wodxDreamingGate | otherworlds | a crossing through a Dreaming gateway |
| wodxEventUndone | chronicle | a dated event taken back |
| wodxFightStarted | combat | a fight the starter set up: {combat, source, tokens, created} |
| wodxInteractablesHazard | interactables | a hazard went off |
| wodxInteractablesTrap | interactables | a trap went off |
| wodxSkipStart | chronicle | a time skip begins |
| wodxStockDrawn | interactables | a container's stock list was drawn afresh |
| wodxSocial | actions | a social act on one NPC and its outcome |
| wodxWeather | atmosphere | the new night's weather (Senses reads `api.weather.now()` instead) |
