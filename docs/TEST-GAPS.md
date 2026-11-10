# Test gaps

Written by tools/harness/test-gaps.mjs. Harness line coverage of each module file (`node --test --experimental-test-coverage`), the files the harness never loads, and the gates in tools/gate that name the module. A low harness figure on a file of windows and hooks is expected where a gate covers it.

## wodx-actions

44 of 44 files loaded by the harness, mean line coverage 74%. Gates: gate6b, gate6c-diag, gate6c, gate6d, gate6e, gate6f, gate6g, gate6h, gate6i, gate6j, gate6k, gate6l, gate6m, gate6n, gate7d, gate8, gatechecks, gateconsensus, gatedawn, gateeffects, gatemenu, gatesenses, gatesheet1, gatesheet2, gatesheet3, gatesheet4, gatesurvival, gatetarget, gateupkeep.

| File | Lines % | Functions % |
| --- | --- | --- |
| aim.js | 65 | 25 |
| c20-rules.js | 99 | 100 |
| c20.js | 8 | 0 |
| checks-rules.js | 100 | 100 |
| consensus-rules.js | 100 | 100 |
| core-rules.js | 100 | 100 |
| demon-rules.js | 100 | 100 |
| demon.js | 9 | 0 |
| fae-da-rules.js | 99 | 94 |
| fae-da.js | 12 | 59 |
| flavor.js | 98 | 73 |
| garou-rules.js | 98 | 95 |
| garou-testpack.js | 100 | 100 |
| garou.js | 82 | 86 |
| hunter-rules.js | 100 | 91 |
| hunter.js | 70 | 79 |
| kindred-rules.js | 99 | 97 |
| kindred.js | 80 | 81 |
| kote-rules.js | 98 | 93 |
| kote.js | 8 | 0 |
| legacy.js | 56 | 33 |
| m20-rules.js | 99 | 96 |
| m20.js | 12 | 0 |
| mage-da-grimoire.js | 100 | 100 |
| mage-da-rules.js | 100 | 82 |
| mage-da.js | 8 | 11 |
| main.js | 37 | 17 |
| migrate.js | 96 | 92 |
| mummy-rules.js | 99 | 100 |
| mummy.js | 11 | 0 |
| orpheus-rules.js | 100 | 94 |
| orpheus.js | 12 | 0 |
| profile-menus.js | 58 | 25 |
| profiles.js | 86 | 71 |
| reckoning-rules.js | 99 | 100 |
| reckoning.js | 62 | 71 |
| rules.js | 99 | 97 |
| sunlight-rules.js | 99 | 100 |
| sunlight.js | 71 | 83 |
| theme-rules.js | 100 | 97 |
| voice-rules.js | 100 | 100 |
| voice.js | 61 | 78 |
| wraith-rules.js | 100 | 97 |
| wraith.js | 71 | 77 |

## wodx-atmosphere

5 of 6 files loaded by the harness, mean line coverage 100%. Gates: gate8, gate8b, gateadaptive, gateages, gatedawn, gatefaces, gateimmersion, gatepaperdoll, gateprint, gatethemes, gatewalls.

| File | Lines % | Functions % |
| --- | --- | --- |
| adaptive-rules.mjs | 100 | 88 |
| kits-rules.mjs | 99 | 91 |
| main.mjs | not loaded |  |
| opening-rules.mjs | 100 | 100 |
| print-rules.mjs | 100 | 100 |
| weather-rules.mjs | 99 | 87 |

## wodx-chronicle

38 of 38 files loaded by the harness, mean line coverage 91%. Gates: gate-interact, gate-maps, gate6b, gate6c, gate6d, gate6e, gate6f, gate6g, gate6n, gate7a, gate7c, gate7d, gate7e, gate8, gate8b, gatearchive, gatechurch, gateconsensus, gatedawn, gateeffects, gateera, gateevents, gatehand, gateimmersion, gateknow, gateledger, gateliving, gatemenu, gatequeue, gaterealms, gatesenses, gateskip, gateupkeep.

| File | Lines % | Functions % |
| --- | --- | --- |
| approvals-rules.mjs | 100 | 100 |
| approvals.mjs | 77 | 57 |
| calendar-math.mjs | 95 | 86 |
| calendar.mjs | 72 | 58 |
| church-rules.mjs | 99 | 100 |
| church.mjs | 100 | 60 |
| clock-app.mjs | 92 | 37 |
| conditions.mjs | 99 | 93 |
| content-fixes.mjs | 100 | 100 |
| effects.mjs | 100 | 83 |
| era-resolve.mjs | 95 | 78 |
| era-test.mjs | 97 | 86 |
| eras.mjs | 97 | 100 |
| events-rules.mjs | 100 | 100 |
| events.mjs | 74 | 75 |
| gen-core.mjs | 99 | 100 |
| gen.mjs | 58 | 36 |
| house-rules-app.mjs | 94 | 88 |
| journals.mjs | 97 | 90 |
| know-rules.mjs | 100 | 100 |
| know.mjs | 56 | 14 |
| languages-rules.mjs | 99 | 100 |
| languages.mjs | 69 | 58 |
| main.mjs | 86 | 52 |
| migrations-rules.mjs | 100 | 100 |
| migrations.mjs | 97 | 92 |
| player-tools.mjs | 50 | 67 |
| reckoning-rules.mjs | 100 | 100 |
| release-rules.mjs | 100 | 100 |
| release.mjs | 97 | 88 |
| safety.mjs | 93 | 85 |
| search.mjs | 97 | 88 |
| settings.mjs | 100 | 80 |
| skip.mjs | 93 | 100 |
| theme.mjs | 100 | 75 |
| timed.mjs | 98 | 82 |
| tours.mjs | 94 | 80 |
| util.mjs | 93 | 100 |

## wodx-combat

8 of 8 files loaded by the harness, mean line coverage 83%. Gates: gate-interact, gate6b, gate7b, gate7b1, gategear, gatesenses, gatesurvival, gatetarget, gateturns.

| File | Lines % | Functions % |
| --- | --- | --- |
| auto.js | 100 | 100 |
| conductor-rules.js | 100 | 100 |
| conductor.js | 48 | 22 |
| flavor.js | 100 | 88 |
| legacy.js | 88 | 67 |
| main.js | 67 | 66 |
| profiles.js | 75 | 60 |
| rules.js | 87 | 90 |

## wodx-creation

21 of 21 files loaded by the harness, mean line coverage 84%. Gates: gate6b, gate7a, gatearchive, gateera, gateledger, gateskip, gatestates, gatestates2.

| File | Lines % | Functions % |
| --- | --- | --- |
| actor-data.mjs | 89 | 92 |
| advance-rules.mjs | 100 | 96 |
| advance.mjs | 97 | 97 |
| apps.mjs | 75 | 47 |
| archive.mjs | 84 | 80 |
| change-of-state.mjs | 85 | 83 |
| first-change.mjs | 65 | 79 |
| group-sheet.mjs | 81 | 73 |
| lineage.mjs | 97 | 92 |
| main.mjs | 84 | 40 |
| pass-years.mjs | 88 | 80 |
| people-rules.mjs | 100 | 100 |
| people.mjs | 20 | 45 |
| rules.mjs | 98 | 93 |
| skip-test.mjs | 99 | 97 |
| states-rules.mjs | 100 | 92 |
| states.mjs | 47 | 42 |
| time.mjs | 98 | 96 |
| totals-check.mjs | 49 | 79 |
| totals-rules.mjs | 100 | 100 |
| xp.mjs | 98 | 100 |

## wodx-interactables

12 of 12 files loaded by the harness, mean line coverage 78%. Gates: gate-interact, gate-maps, gate8, gateadopt, gateimmersion, gateliving, gatesenses, gatesurvival, gatesurvival2.

| File | Lines % | Functions % |
| --- | --- | --- |
| adopt-rules.mjs | 100 | 100 |
| adopt.mjs | 66 | 68 |
| carry-rules.mjs | 99 | 100 |
| carry.mjs | 31 | 6 |
| fill-rules.mjs | 99 | 100 |
| fill.mjs | 54 | 56 |
| interact-rules.mjs | 99 | 100 |
| living-rules.mjs | 98 | 92 |
| living.mjs | 36 | 6 |
| main.mjs | 89 | 82 |
| state-rules.mjs | 99 | 100 |
| states.mjs | 67 | 49 |

## wodx-library

3 of 5 files loaded by the harness, mean line coverage 98%. Gates: gategear, gatehand, gatelibrary, gatesurvival2.

| File | Lines % | Functions % |
| --- | --- | --- |
| ency-rules.mjs | 100 | 97 |
| gear-rules.mjs | 95 | 96 |
| main.mjs | not loaded |  |
| shelf-rules.mjs | 100 | 100 |
| shelves.mjs | not loaded |  |

## wodx-npc

8 of 11 files loaded by the harness, mean line coverage 93%. Gates: gate-interact, gate-maps, gate7b, gate7b1, gate7c, gate7d, gate8, gateadopt, gatechurch, gategridless, gateimmersion, gatequeue, gatesenses, gatesurvival, gatetarget.

| File | Lines % | Functions % |
| --- | --- | --- |
| alert-rules.mjs | 100 | 92 |
| faces-rules.mjs | 100 | 100 |
| faces.mjs | not loaded |  |
| faction-rules.mjs | 98 | 90 |
| factions.mjs | 75 | 71 |
| main.mjs | not loaded |  |
| npc-rules.mjs | 100 | 98 |
| order-rules.mjs | 100 | 100 |
| orders.mjs | not loaded |  |
| routine-rules.mjs | 98 | 100 |
| routines.mjs | 69 | 80 |

## wodx-otherworlds

17 of 17 files loaded by the harness, mean line coverage 74%. Gates: gate8b, gatelooks, gaterealms, gatesenses, gateupkeep, gateways.

| File | Lines % | Functions % |
| --- | --- | --- |
| crossing.mjs | 96 | 91 |
| drift-rules.mjs | 100 | 100 |
| drift.mjs | 47 | 20 |
| journey-rules.mjs | 100 | 100 |
| journey.mjs | 49 | 35 |
| main.mjs | 64 | 42 |
| prototype.mjs | 21 | 0 |
| ratings.mjs | 77 | 73 |
| realms-rules.mjs | 100 | 100 |
| realms.mjs | 39 | 17 |
| rules.mjs | 95 | 80 |
| senses.mjs | 99 | 71 |
| tagging-app.mjs | 80 | 75 |
| twins-app.mjs | 71 | 64 |
| twins.mjs | 97 | 98 |
| ways-rules.mjs | 100 | 100 |
| ways.mjs | 27 | 0 |

## wodx-paperdoll

5 of 5 files loaded by the harness, mean line coverage 93%. Gates: gatepaperdoll.

| File | Lines % | Functions % |
| --- | --- | --- |
| doll-rules.mjs | 99 | 95 |
| face-rules.mjs | 100 | 98 |
| fit-rules.mjs | 100 | 100 |
| main.mjs | 68 | 66 |
| mouth-rules.mjs | 100 | 100 |

## wodx-senses

8 of 8 files loaded by the harness, mean line coverage 80%. Gates: gate8, gateimmersion, gateperception, gatequiet, gatesenses.

| File | Lines % | Functions % |
| --- | --- | --- |
| main.mjs | 77 | 78 |
| perception-rules.mjs | 100 | 92 |
| perception.mjs | 48 | 24 |
| quiet-rules.mjs | 100 | 100 |
| quiet.mjs | 71 | 33 |
| senses-rules.mjs | 99 | 94 |
| sight-rules.mjs | 100 | 100 |
| sight.mjs | 46 | 15 |

## wodx-sheets

1 of 2 files loaded by the harness, mean line coverage 100%. Gates: gatesheet1, gatesheet4, gatesheet5.

| File | Lines % | Functions % |
| --- | --- | --- |
| main.mjs | not loaded |  |
| sheet-rules.mjs | 100 | 90 |

## wodx-storyteller

31 of 42 files loaded by the harness, mean line coverage 85%. Gates: gate-maps, gate7e, gate8, gate8b, gatecodex, gateconsensus, gatedashboard, gatedreams, gatehand, gateimmersion, gateledger, gatemenu, gateprelude, gaterumours, gatesenses, gatesurvival, gatesurvival2, gateupkeep.

| File | Lines % | Functions % |
| --- | --- | --- |
| apps.mjs | not loaded |  |
| between.mjs | 40 | 28 |
| body-rules.mjs | 100 | 100 |
| body.mjs | not loaded |  |
| callroll-rules.mjs | 100 | 100 |
| codex-rules.mjs | 100 | 100 |
| codex.mjs | not loaded |  |
| core.mjs | 97 | 89 |
| dashboard-rules.mjs | 100 | 93 |
| dashboard.mjs | 42 | 5 |
| dreams-rules.mjs | 100 | 94 |
| dreams.mjs | 40 | 5 |
| glance-rules.mjs | 100 | 100 |
| hand.mjs | 56 | 39 |
| hardship-rules.mjs | 100 | 100 |
| hardship.mjs | not loaded |  |
| haven-rules.mjs | 100 | 100 |
| havens.mjs | not loaded |  |
| kits-rules.mjs | 100 | 100 |
| ledger-rules.mjs | 100 | 100 |
| ledger.mjs | 79 | 72 |
| letters-rules.mjs | 100 | 85 |
| letters.mjs | not loaded |  |
| main.mjs | not loaded |  |
| money-rules.mjs | 99 | 100 |
| money.mjs | not loaded |  |
| night-rules.mjs | 100 | 96 |
| night.mjs | 32 | 0 |
| preflight-rules.mjs | 100 | 100 |
| prelude-rules.mjs | 100 | 89 |
| prelude.mjs | not loaded |  |
| prep-rules.mjs | 100 | 87 |
| rumour-rules.mjs | 100 | 100 |
| rumours.mjs | 43 | 5 |
| setup-rules.mjs | 100 | 100 |
| setup.mjs | not loaded |  |
| tasks-rules.mjs | 99 | 100 |
| tasks.mjs | 26 | 0 |
| upkeep-rules.mjs | 98 | 96 |
| upkeep.mjs | not loaded |  |
| world-rules.mjs | 100 | 100 |
| wrapup-rules.mjs | 100 | 100 |

## wodx-targeting

2 of 2 files loaded by the harness, mean line coverage 99%. Gates: gatesenses, gatetarget.

| File | Lines % | Functions % |
| --- | --- | --- |
| main.mjs | 98 | 80 |
| target-rules.mjs | 100 | 100 |
