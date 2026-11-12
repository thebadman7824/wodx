# WoDX hooks

The custom hooks the WoDX modules send, who sends them and who listens. A module that is off simply hears nothing, so no sender needs to know its listeners. The harness test `hooks.test.mjs` reads the code and fails when a hook is sent that is neither heard by a module nor listed below as an extension point, so this file stays true.

## Heard

| Hook | Sent by | Heard by |
|---|---|---|
| wodxAttitude | npc | npc (a fight when an NPC turns hostile) |
| wodxBoonSettled | storyteller | npc (a boon kept or broken moves the debtor's standing in a court) |
| wodxBreach | actions | npc, storyteller |
| wodxChronicleReady | chronicle | actions, creation, interactables, npc, otherworlds, storyteller |
| wodxCrossing | otherworlds | storyteller |
| wodxDamageApplied | combat | actions, chronicle (harm to a Toreador's Muse), npc |
| wodxEndScene | chronicle | actions, storyteller |
| wodxEraApplied | chronicle | atmosphere, chronicle, otherworlds |
| wodxEventFired | chronicle | chronicle (Malkavians who saw it coming), interactables |
| wodxFightStarted | combat | chronicle (flaws that bite when a fight starts), npc (passers-by scatter), storyteller (a fight goes in the log for the pacing note) |
| wodxFormChanged | actions | actions |
| wodxHunted | actions | storyteller |
| wodxInteractablesNoise | interactables | senses |
| wodxItemsTaken | interactables | chronicle (feeds a Ravnos vice of theft), storyteller (marks things taken from someone else's container as stolen) |
| wodxMapEvent | chronicle, interactables, npc | npc, otherworlds, storyteller |
| wodxNpcTurnDone | combat, npc | combat |
| wodxPlaceAlarm | npc | npc (remarks and cries) |
| wodxRegisterMigrations | chronicle | chronicle |
| wodxSensesGather | senses | senses |
| wodxStockFilter | interactables | storyteller (markets thin or fill a trader's stock draw) |
| wodxShroudCrossing | otherworlds | storyteller |
| wodxSocial | actions | chronicle (flaws that bite on a social act; a Ravnos vice fed or called; a Nosferatu's true face; a Setite's won seduction, persuasion, deceit or bribe moves the victim's Corruption) |
| wodxTrade | actions | chronicle (a Ravnos vice fed or called; a Nosferatu's page of secrets sold; a Setite's gift that feeds the victim's vice moves their Corruption) |
| wodxSkipStart | chronicle | chronicle (the Legends book is brought up to date before the clock moves) |
| wodxSkipEnd | chronicle | actions, atmosphere, chronicle, interactables, npc, otherworlds, sheets, storyteller |
| wodxXCard | chronicle | actions |

## Extension points (sent, nobody listens yet)

Kept on purpose, so a later module or a world macro can listen without changing the sender.

| Hook | Sent by | Carries |
|---|---|---|
| wodxChase | interactables | a chase starts, a turn is rolled, or it ends (caught, away, called off), with the chase state |
| wodxSecretSeen | actions | a creature of another kind saw what someone is: {by, secret, seen: [{uuid, name, profile}], event} |
| wodxAtmosphereReady | atmosphere | Atmosphere's API, once it is ready |
| wodxStockDrawn | interactables | a container tile and the stock lines it just drew |
| wodxDreamingGate | otherworlds | a crossing through a Dreaming gateway |
| wodxEventUndone | chronicle | a dated event taken back |
| wodxInteractablesHazard | interactables | a hazard went off |
| wodxInteractablesTrap | interactables | a trap went off |
| wodxWeather | atmosphere | the new night's weather (Senses reads `api.weather.now()` instead) |
