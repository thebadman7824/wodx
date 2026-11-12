# WoDX hooks

The custom hooks the WoDX modules send, who sends them and who listens. A module that is off simply hears nothing, so no sender needs to know its listeners. The harness test `hooks.test.mjs` reads the code and fails when a hook is sent that is neither heard by a module nor listed below as an extension point, so this file stays true.

## Heard

| Hook | Sent by | Heard by |
|---|---|---|
| wodxAttitude | npc | npc (a fight when an NPC turns hostile) |
| wodxBoonSettled | storyteller | npc (a boon kept or broken moves the debtor's standing in a court) |
| wodxSessionEnded | storyteller | creation (a story hook counts the sessions since it was agreed) |
| wodxBreach | actions | npc, storyteller, chronicle (the Watchers of the New World Order; the city's Masquerade exposure) |
| wodxChronicleReady | chronicle | actions, creation, interactables, npc, otherworlds, storyteller |
| wodxCrossing | otherworlds | storyteller |
| wodxDamageApplied | combat | actions, chronicle (harm to a Toreador's Muse, or to Kinfolk; a Golconda seeker's killing), npc |
| wodxEndScene | chronicle | actions, storyteller |
| wodxEraApplied | chronicle | atmosphere, chronicle, otherworlds |
| wodxEventFired | chronicle | chronicle (Malkavians who saw it coming), interactables, storyteller (market news) |
| wodxEventUndone | chronicle | interactables (living tiles resync), storyteller (market news undone) |
| wodxDreamingGate | otherworlds | storyteller (the crossing log) |
| wodxFightStarted | combat | chronicle (flaws that bite when a fight starts; a fight at a Black Fury's guarded place) |
| wodxFirstNightSigned | creation | chronicle (the owner gets the opening goals to pick) |
| wodxFed | actions | npc (the vessel remembers it was fed on; a follower fed on by its master trusts it less), chronicle (harmful feeding sets a Golconda seeker back) |
| wodxFormChanged | actions | actions |
| wodxHunted | actions | storyteller |
| wodxInteractablesNoise | interactables | senses |
| wodxItemsTaken | interactables | chronicle (feeds a Ravnos vice of theft), storyteller (marks things taken from someone else's container as stolen) |
| wodxMapEvent | chronicle, interactables, npc | npc, otherworlds, storyteller |
| wodxNpcTurnDone | combat, npc | combat |
| wodxPlaceAlarm | npc | npc (remarks and cries) |
| wodxRegisterMigrations | chronicle | chronicle |
| wodxSecretSeen | actions | npc (the witness remembers what it saw) |
| wodxSensesGather | senses | senses, chronicle (a great city's smell and sound by date) |
| wodxShroudCrossing | otherworlds | storyteller |
| wodxSkipEnd | chronicle | actions, atmosphere, chronicle, interactables, npc, otherworlds, sheets, storyteller |
| wodxSocial | actions | chronicle (flaws that bite on a social act; a Ravnos vice fed or called; a Nosferatu's true face; a Setite's won seduction, persuasion, deceit or bribe moves the victim's Corruption; a Golconda seeker's theft) |
| wodxStockFilter | interactables | storyteller (markets thin or fill a trader's stock draw) |
| wodxTradeDone | actions | storyteller (a week of player trade gluts or empties a market) |
| wodxTrade | actions | chronicle (a Ravnos vice fed or called; a Nosferatu's page of secrets sold; a Setite's gift that feeds the victim's vice moves their Corruption) |
| wodxXCard | chronicle | actions |
| wodxTaskDone | storyteller | npc |
| wodxChase | interactables | npc (followers join a chase with their master) |
| wodxGhoulFix | chronicle | npc |

## Extension points (sent, nobody listens yet)

Kept on purpose, so a later module or a world macro can listen without changing the sender.

| Hook | Sent by | Carries |
|---|---|---|
| wodxLookOver | actions | a character looked a stranger over or asked around about them: {actor, npc, kind (lookover or askabout), successes, botch} |
| wodxSecretFound | npc | a character finds out a secret: {holder, finder, secret, entry} (entry: the Ledger hook's id) |
| wodxSecretExposed | npc | a secret is laid bare at court: {holder, secret, by} |
| wodxAtmosphereReady | atmosphere | Atmosphere's API, once it is ready |
| wodxStockDrawn | interactables | a container tile and the stock lines it just drew |
| wodxInteractablesHazard | interactables | a hazard went off |
| wodxInteractablesTrap | interactables | a trap went off |
| wodxSkipStart | chronicle | a time skip begins |
| wodxColourSafe | senses | the colour-blind setting changed: true or false (Senses redraws its own rings) |
| wodxWeather | atmosphere | the new night's weather (Senses reads `api.weather.now()` instead) |
