# WoDX Rules: the rules core

The game's rules as plain JavaScript, with no Foundry calls (B8060, docs/RULES-CORE.md). Every WoDX module imports
from here with `../../wodx-rules/<folder>/<file>`, and the harness loads the same files in plain Node.

- `core/`: the shared terms (`terms.mjs`: time units, the turn, the night, dice, health levels, distance, eras) and the
  calendar (`calendar-math.mjs`, and `calendar.mjs`, the date engine in use and the clock reading).
- One folder per module the rules came from (`npc/`, `storyteller/` and so on), file names unchanged.

Rules for this folder, checked by `tools/harness/rules-core.test.mjs`:

1. No Foundry: no `game`, `foundry`, `CONFIG`, `ui`, `Hooks`, `canvas` or document class, here or in anything imported
   from here. A rule that needs world state takes it as an argument, and the module's own Foundry code passes it in.
2. Imports stay inside this folder, apart from the files listed under `outside` in
   `tools/harness/rules-core-baseline.json`, a list that only shrinks.
3. New rules files go here, not in a module's own `scripts/` folder.

Nothing here runs at load: `module.json` lists no scripts, so Foundry only serves the files. WoDX Chronicle keeps
`scripts/terms.mjs`, `scripts/calendar-math.mjs` and `scripts/calendar.mjs` as re-exports of `core/`, so older imports
still work and every module shares one date engine.
