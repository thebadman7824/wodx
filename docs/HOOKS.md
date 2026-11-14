# WoDX hooks

The custom hooks the WoDX modules send, who sends them and who listens. A module that is off simply hears nothing, so no sender needs to know its listeners. The harness test `hooks.test.mjs` reads the code and fails when a hook is sent that is neither heard by a module nor listed below as an extension point, so this file stays true.

## Heard

| Hook | Sent by | Heard by |
|---|---|---|
| wodxCrimeSeen | npc | chronicle (a crime with witnesses raises the law's heat on the culprit in that land, B3606) |
| wodxRegimeTurn | chronicle | storyteller (a turn of rule sweeps holders out of the institutions of its kinds, in its region or town, or only one character's seats after an election, B3618) |
| wodxArrest | chronicle | chronicle (an arrest puts the accused before the court of the land: the forms of trial it allows, B3608) |
| wodxVerdict | chronicle | chronicle (a guilty verdict brings the sentencing card: the sentences the land allows for deeds that grave, B3610) |
| wodxAttitude | npc | npc (a fight when an NPC turns hostile; the NPC remembers the change, B3346) |
| wodxBoonSettled | storyteller | npc (a boon kept or broken moves the debtor's standing in a court, and the holder's trust in the debtor) |
| wodxMonthPaid | storyteller | npc (a household's keep is charged for the months each character was paid); chronicle (taxes kept back or a levy owed on each allowance, B3616) |
| wodxSessionEnded | storyteller | creation (a story hook counts the sessions since it was agreed) |
| wodxBreach | actions | npc, storyteller, chronicle (the Watchers of the New World Order; the city's Masquerade exposure) |
| wodxCultNoticed | npc | storyteller (a cult watched or moved against raises the hunters' pressure in its region and opens a file on its founder, B3306) |
| wodxChronicleReady | chronicle | actions, creation, interactables, npc, otherworlds, storyteller |
| wodxCrossing | otherworlds | storyteller |
| wodxAttackRolled | combat | paperdoll (a sprite token plays the move that fits the weapon, hit or miss; the one attacked blocks, parries or ducks as the defence says), senses (a gun fired near a character with Heightened Senses in use asks for Willpower) |
| wodxMagickWorked | actions | senses (vulgar magick strains the place for Prime sight; every working leaves an echo for Time sight) |
| wodxAuraRead | otherworlds | senses (Aura Perception rings show what this Read the Soul showed) |
| wodxDamageApplied | combat | interactables (a lethal or worse wound leaves blood and traces, B3368), actions, chronicle (harm to a Toreador's Muse, or to Kinfolk; a Golconda seeker's killing), npc, paperdoll (a sprite token plays its attack when no attack roll came just before) |
| wodxPowerShown | actions (a power rolled from its window, with the actor, a target, the power's name, its group, its kind and the character's line) | paperdoll (a sprite token plays its casting move with the effect that fits the power) |
| wodxEndScene | chronicle | actions, storyteller |
| wodxEraApplied | chronicle | atmosphere, chronicle, otherworlds |
| wodxEventFired | chronicle | chronicle (Malkavians who saw it coming), interactables, storyteller (market news) |
| wodxEventUndone | chronicle | interactables (living tiles resync), storyteller (market news undone) |
| wodxDreamingGate | otherworlds | storyteller (the crossing log) |
| wodxFightStarted | combat | chronicle (flaws that bite when a fight starts; a fight at a Black Fury's guarded place), npc (passers-by scatter), storyteller (a fight goes in the log for the pacing note) |
| wodxFirstNightSigned | creation | chronicle (the owner gets the opening goals to pick) |
| wodxFed | actions | interactables (blood and a witness left at the scene, B3368), paperdoll (a sprite token leans in to feed), npc (the vessel remembers it was fed on; a follower fed on by its master trusts it less), chronicle (harmful feeding sets a Golconda seeker back) |
| wodxInteractableWorked | interactables | paperdoll (a sprite token stoops to the lock, strikes the door or looks about) |
| wodxFormChanged | actions | actions, paperdoll (a sprite token blurs as it changes) |
| wodxHunted | actions | storyteller |
| wodxInteractablesNoise | interactables | senses (who heard it; a loud noise heard by a character with Heightened Senses in use asks for Willpower) |
| wodxItemsTaken | interactables | chronicle (feeds a Ravnos vice of theft), storyteller (marks things taken from someone else's container as stolen) |
| wodxMapEvent | chronicle, interactables, npc | npc, otherworlds, storyteller |
| wodxNpcTurnDone | combat, npc | combat |
| wodxPlaceAlarm | npc | npc (remarks and cries) |
| wodxRegisterMigrations | chronicle | chronicle |
| wodxSecretSeen | actions | npc (the witness remembers what it saw) |
| wodxSensesGather | senses | senses, chronicle (a great city's smell and sound by date) |
| wodxShroudCrossing | otherworlds | storyteller |
| wodxSkipStart | chronicle | chronicle (the Legends book is brought up to date before the clock moves) |
| wodxSkipEnd | chronicle | actions, atmosphere, chronicle, interactables, npc, otherworlds, sheets, storyteller |
| wodxSocial | actions | chronicle (flaws that bite on a social act; a Ravnos vice fed or called; a Nosferatu's true face; a Setite's won seduction, persuasion, deceit or bribe moves the victim's Corruption; a Golconda seeker's theft) |
| wodxStockFilter | interactables | storyteller (markets thin or fill a trader's stock draw) |
| wodxTradeDone | actions | storyteller (a week of player trade gluts or empties a market) |
| wodxTrade | actions | chronicle (a Ravnos vice fed or called; a Nosferatu's page of secrets sold; a Setite's gift that feeds the victim's vice moves their Corruption) |
| wodxXCard | chronicle | actions |
| wodxTaskDone | storyteller | npc; chronicle (a finished "Make a new self on paper" puts the new self on the character, B3612) |
| wodxBattle | storyteller | npc (an ended battle between factions proposes Status, Retainers and standing changes) |
| wodxChase | interactables | npc (followers join a chase with their master) |
| wodxGhoulFix | chronicle | npc |
| wodxTown | storyteller | npc (a rising costs the factions that hold the town, and one that taxed it, a dot of Status; a sack costs a dot of Resources); passers-by and talk read the town by api instead; chronicle (a rising asks the Storyteller whether it wins, and a win sweeps the town's officers, B3618) |
| wodxCaravan | storyteller | storyteller (a caravan lost on the road costs the caravan ventures of its markets) |
| wodxMarketMove | storyteller | storyteller (a raid costs the workshops and trading houses characters have put money into) |
| wodxTraderBroke | storyteller | storyteller (a trader going broke costs the trading house ventures that back the trader) |
| wodxHavenProbe | storyteller | interactables (the probe leaves tracks, a witness, or ash at the haven, B3368); sent with {scene, rival, probe} (B3362) |
| wodxGrudgeMove | npc | interactables (harm done leaves blood, a witness and traces, B3368); sent with {npc, character, move} (B3348) |
| wodxWeather | atmosphere | interactables (rain and snow wash evidence outdoors, B3366); Senses reads `api.weather.now()` instead |

## Extension points (sent, nobody listens yet)

Kept on purpose, so a later module or a world macro can listen without changing the sender.

| Hook | Sent by | Carries |
|---|---|---|
| wodxSaga | chronicle | a Rothenstein saga step was dealt: {book, step, kind, clocks, signal, ending}; signal is omen-shaped for Threads of Fate and dreams (B3667) |
| wodxInheritance | storyteller | the Inheritance step passed things from the dead to the heir: {dead, heir, done} (B3530) |
| wodxLever | storyteller | a lever of an institution was pulled, approved by the Storyteller: {actor, institution, key, target} (B3356) |
| wodxProjectComplication | storyteller | a downtime project met trouble: {actor, task, complication} (B3342) |
| wodxHunterStage | storyteller (the hunters of a region change stage, B3300) | {region, stage, before, pressure} |
| wodxHerdStage | storyteller (a district's herd changes stage, B3572) | {sceneId, stage, before, feeds, total} |
| wodxSiteDraw | storyteller (a draw on shared holy ground, B3582) | {site, role, points, by, strength, max} |
| wodxSiteQuarrel | storyteller (two claims on shared holy ground quarrel, B3585) | {site, roles, claims} |
| wodxDayJobDone | npc (a day job ended, B3590) | {master, agent, job, status, faction} |
| wodxContagion | storyteller (sickness in a town, B3430) | {phase (start, over or end), market, disease} |
| wodxVenture | storyteller | money put into a venture or taken out, or a seat given: {phase (opened, added, taken, closed or seat), venture} |
| wodxCultFormed | npc | a following gathered around a character (B3242): {cult, founder} |
| wodxMarried | npc | a marriage made: {a, b, record} (the record has the rite, register, money and witnesses) |
| wodxAdopted | npc | an adoption made: {parent, child, record} (the record has the kind, rite, register and whether the adopted one inherits) |
| wodxExpecting | npc | a pregnancy begun: {mother, other, record} (the record has the due time, season and year) |
| wodxBirth | npc | a birth or a loss: {mother, other, record, outcome, child} (outcome is well, hard or loss) |
| wodxGrownUp | npc | a child sheet grown by an approved card: {actor, plan} (plan.grown when they reach 18) |
| wodxProposal | npc | a proposal of marriage answered: {a, b, record, answer} (answer is yes, no or blocked by a feud) |
| wodxLookOver | actions | a character looked a stranger over or asked around about them: {actor, npc, kind (lookover or askabout), successes, botch} |
| wodxSecretFound | npc | a character finds out a secret: {holder, finder, secret, entry} (entry: the Ledger hook's id) |
| wodxSecretExposed | npc | a secret is laid bare at court: {holder, secret, by} |
| wodxAtmosphereReady | atmosphere | Atmosphere's API, once it is ready |
| wodxStockDrawn | interactables | a container tile and the stock lines it just drew |
| wodxInteractablesHazard | interactables | a hazard went off |
| wodxInteractablesTrap | interactables | a trap went off |
| wodxColourSafe | senses | the colour-blind setting changed: true or false (Senses redraws its own rings) |
| wodxSentence | chronicle | a sentence passed: {actor, region, mark} with the mark {id, kind, punish, words, region, year, until, record} |
