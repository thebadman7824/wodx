# WoDX Storyteller

The Storyteller's module: the open world, the hand of table aids, the night's draw, travel and the maps, money, markets and war. Release notes are in [CHANGELOG.md](CHANGELOG.md); the version is in module.json.

This page is a map of where each part lives. Most parts come as a pair: a `*-rules.mjs` file with no Foundry calls, which the harness tests, and a file of the same name without `-rules` that holds the windows, the settings and the hooks. `scripts/main.mjs` starts every part and builds `game.modules.get("wodx-storyteller").api`. Settings below are world settings under `wodx-storyteller`; hidden ones hold state and have no place in the settings window.

## The open world

- Files: `core.mjs`, `world-rules.mjs`, `apps.mjs` (the tracker and its windows), `setup.mjs` and `setup-rules.mjs` (Start a chronicle), `builder.mjs`, `recipe-rules.mjs` and `data/recipe-rothenstein.mjs` (Build this chronicle).
- Settings: `log`, `personal`, `beats`, `convened`, `session`, `travelMinutes`, `encounters`, `encounterChance`, `encounterTable`, `soloLimit`, `dawnLead`, `beatsOn`, `setup`, `builder`.
- API: `openTracker`, `travel`, `planTrip`, `convene`, `beats`, `endSession`, `report`, `setup`.

## The hand and the table

- Files: `hand.mjs` (the hand itself and its tools), `glance-rules.mjs` (rules at a glance), `callroll-rules.mjs` (call for a roll), `preflight-rules.mjs` (before the players arrive), `wrapup-rules.mjs` (the end of the night and the timer), `teleport.mjs` and `teleport-rules.mjs`, `pass-time.mjs` (players ask for time to pass), `dashboard.mjs` and `dashboard-rules.mjs`.
- Settings: `timer`, `timerWarn`.
- API: `hand`, `dashboard`.

## Between sessions

- Files: `between.mjs`, `prep-rules.mjs` (the next session sheet, last time, absent players, the hooks board), `kits-rules.mjs` (scene kits and quick extras by era), `prelude.mjs` and `prelude-rules.mjs`, `codex.mjs` and `codex-rules.mjs` (each player character's own journal), `dreams.mjs` and `dreams-rules.mjs`.
- Settings: `kits`, `absent`, `dreams`.

## The night's draw, rumours and letters

- Files: `night.mjs`, `night-rules.mjs`, `pacing-rules.mjs`, `data/night-tables.mjs`, `rumours.mjs` and `rumour-rules.mjs`, `letters.mjs` and `letters-rules.mjs`.
- Settings: `nightDraw`, `nightDrawn`, `aidCount`, `rumours`, `rumourNetwork`, `rumourGarble`, `letters`.
- API: `night`; `letters` (open, send, set, deliver, list, delay, read, plan).
- Letters between lands (0.59.0): `letters-rules.mjs` REGION_LINES (post, telegraph, telephone years for each world region), CROSSINGS (cables and calls between land masses), RELAYS, worldPlan, lostChance, letterTimes. The window loads the world map rules only when the two ends are in different lands.

## The ledger and the clocks

- Files: `ledger.mjs` and `ledger-rules.mjs` (oaths, debts, boons, the Veil track, heirs), `wills.mjs` and `will-rules.mjs` (wills, inheritance law by place and year, false heirs), `clocks.mjs` and `clock-rules.mjs`.
- Settings: `ledger`, `veilOn`, `ledgerTraits`, `clocks`.
- API: `ledger`, `clocks`.

## Travel and the maps

- Files: `road-rules.mjs` (travel by era and by region), `country-rules.mjs` and `data/country.mjs` (the country map behind a trip), `world-map.mjs`, `world-map-rules.mjs`, `discovery-rules.mjs` and `data/world.mjs` (the world map and the known world), `hardship.mjs` and `hardship-rules.mjs` (hardship on the road).
- Settings: `hardship`, `discovered`.
- API: `roads`, `country`, `worldMap`.
- The world map's rules and its grid (about 200 KB) load the first time the window opens, not at start-up. A script that needs them calls `await api.worldMap.load()`; until then `api.worldMap.rules` is null.

## Upkeep, havens, bodies and long tasks

- Files: `upkeep.mjs` and `upkeep-rules.mjs` (between nights, ties, hunting grounds and heat), `havens.mjs` and `haven-rules.mjs`, `body.mjs` and `body-rules.mjs` (lasting changes to a body), `remains.mjs` and `remains-rules.mjs` (bodies left behind), `tasks.mjs` and `tasks-rules.mjs` (long tasks over the clock), `spend.mjs` and `spend-rules.mjs` (time spent on long actions).
- Settings: `betweenNights`, `ties`, `heat`, `plague`, `tieDay`, `remains`, `longTasks`, `timeApart`.
- API: `upkeep`.

## Money, holdings and making things

- Files: `money.mjs` and `money-rules.mjs` (money by era and by region, money changers, coin of the place), `owners.mjs` and `owner-rules.mjs` (who owns what, holdings and upkeep), `craft-rules.mjs`, `build-rules.mjs`, `cookery.mjs`.
- Settings: `money`, `changers`, `moneyRegion`, `moneyMonth`.

## Markets and trade

- Files: `markets.mjs` and `market-rules.mjs`, `market-news.mjs` and `market-news-rules.mjs`, `market-turn.mjs` and `market-turn-rules.mjs` (the weekly turn), `market-moves.mjs` and `market-moves-rules.mjs` (factions and traders who go broke), `caravans.mjs` and `caravan-rules.mjs`.
- Settings: `markets`, `tradeTally`, `marketTurn`, `marketTurnState`, `marketMoves`, `tradersBroke`, `caravans`, `caravanState`.

## Battles, sieges and ships

- Files: `battles.mjs` and `battle-rules.mjs`, `battle-deeds.mjs`, `battle-aftermath.mjs` and `battle-extras.mjs` (deeds and what a field leaves behind), `siege-works.mjs` and `siege-works-rules.mjs` (the campaign around a siege), `naval.mjs` and `naval-rules.mjs` (ships at sea).
- API: `battles`, `siegeWorks`, `naval`.

## When to look again

Storyteller holds every part that runs the world, in one module, so that saved setting and flag names stay as they are. If it passes 100 scripts, look again at moving a group (the maps, or markets and trade) into a module of its own. A harness test (`tools/harness/storyteller-readme.test.mjs`) fails when a script is missing from this page.
