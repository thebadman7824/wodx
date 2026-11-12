# WoDX Chronicle 0.1.3 (Phase 1)

Part of the World of Darkness Expanded project. Private use only; not for distribution or sale.

Runs only in worlds whose `world.json` carries `flags.wodx` (the WoDX worlds). Anywhere else it stays idle.

## What it does

- **Chronicle Clock** (moon button in the token controls). Date and time on the Julian calendar, then the Gregorian calendar from the chosen country's reform (Bohemia by default: 6 January 1584 is followed by 17 January). World time 0 is 1 January 1197. Shows sunset, sunrise, the hours of dark, the moon phase and its auspice moon. The Storyteller can advance time, jump to the next dusk or dawn, set the date, and lock an era.
- **Era profiles** (`data/eras.json`). The date picks the profile and the profile sets which upstream ability set each line gets when a character is created. A world can add or replace profiles in `worlds/<id>/wodx/eras.json` after adding `"worldEras": true` under `flags.wodx` in its `world.json`.
- **Approval queue** (inbox button, Storyteller only). Era changes are proposed here when the clock crosses an era boundary. Players can send requests with "Ask the Storyteller".
- **House rules** (Chronicle Clock, or Game Settings, then House rules). Each rule is an on/off switch, recorded in the Chronicle Rules journal.
- **Safety tools.** The X-card (token controls, the clock, or Ctrl+Shift+X) shows everyone the card, never says who pressed it, and pauses the game if that switch is on. Lines and veils go into the Session Zero journal, unsigned unless the switch allows names.
- **Era test** (Chronicle Clock, Storyteller only). The Phase 1 gate: creates a test character per line in every era and writes the results to the "WoDX Era Test" journal.

## The Legends book (0.37.0)

A journal, "Legends of the Chronicle", of what has really happened in this chronicle: dated events that fired, the dead, Embraces and ghoulings, court seats won and lost, havens and holdings that changed hands, and boons, oaths and debts kept or broken. One page per century. The Legends window (the book button with the token tools) filters it by kind, person, place, faction and years; the Storyteller unticks a line to keep it from the players. It is brought up to date when a session ends, around each time skip, and on demand. API: `api.legends.open()`, `build()`, `book()`, `visible(filter)`, `setShown(id, shown)`. Decisions B1700 to B1702.

## API

`game.modules.get("wodx-chronicle").api` (also `game.wodx.chronicle`): `openClock()`, `setDate()`, `propose({type, title, detail, key, data})`, `registerApprovalHandler(type, {label, approve, reject})`, `rule(id)`, `runEraTest()`, and the `eras`, `approvals` and `safety` modules.

Hook: `wodxEraApplied(profile)` fires on every client when an era profile is applied.
