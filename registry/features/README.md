# Feature registry

One file per module (`<module-id>.json`, plus `system.json` for the fork), one row per thing a player or the
Storyteller uses: Standing up from a knockdown, Feeding laws, the Night card. Not one row per module, and not one per
file. Ben chose this on the Finish-Line Desk, 17 November 2026 (B7140-B7149). Every thread, audit, handoff and the
Monday review reads status from here, and nowhere else.

`docs/FEATURES.md` is the readable view, written by `node tools/registry/registry.mjs summary --write`. The Master
Plan keeps the design and links that page for status.

## A row

```json
{
 "id": "combat.knockdown-stand",
 "name": "Standing up from a knockdown",
 "module": "wodx-combat",
 "core": true,
 "files": ["modules/wodx-combat/scripts/main.js"],
 "art": ["spr-vampire-front"],
 "steps": {
  "built": {"pr": 1125, "decisions": "B3921"},
  "wired": {"reader": "modules/wodx-combat/scripts/main.js:standUp(c.actor, combat)"},
  "shown": {"what": "a 'tries to stand' card, and the status leaving the token"},
  "gated": {"gate": "tools/gate/gateknockdown.mjs", "step": "4"},
  "book": {"ref": "V20 Dark Ages p. 348"},
  "verified": {"by": "Monday review 2026-11-23", "how": "re-read the gate step and the reader; ran gateknockdown 4/4"}
 },
 "open": ["what is still missing, one line each"],
 "deferred": [{"from": "final-audit ruling sweep2-b:52", "what": "..."}],
 "faults": [],
 "prs": [1125]
}
```

- `id`: `<module short name>.<feature>`, lower case words joined by `.` or `-`. Never reused.
- `core`: part of the playable core, V20 Dark Ages Vampire in Rothenstein, 1197, with mortals and ghouls (Ben, 17
  November 2026). Core rows go first in seeding, fixes and the ratchet.
- `files`: the repo paths (or globs) the feature lives in. Several rows may own one file. Every script file of a seeded
  module must be owned by at least one row.
- `art`: ids from the art tables (registry/art-assets/{portraits,objects,sprites}.json in the shared folder, kept by
  the art thread). Code loads art by these ids only, so the locked style can swap in without code changes.
- `parked: "why"` takes a row out of the counts (Ben parked it).

## The steps (done means verified)

| Step | Proof the tools check |
| --- | --- |
| built | the code is merged (`pr`, `decisions`) and the row owns files |
| wired | `reader`: the `file:symbol` that reads it in play; the symbol must be in the file |
| shown | `what` players see on the map or screen, or `{"none": "why"}` when nothing can be shown |
| gated | `gate` and `step`: a gate step that drives the real trigger and checks the number or the map change |
| book | `ref`: the page (V20 first, then Revised or 2nd edition, never V5), or `{"none": "why"}` for a tool |
| verified | `by` and `how`: set only by a session other than the one that built it (the Monday sample of 20) |

A row's status is the last step reached with every earlier step reached too. An open fault takes a verified row back
to book. **Half-built** means built but not yet gated, or carrying an open fault. A module's half-built count may not
grow (the ratchet, B7146): new work in a module starts by finishing a row there, unless Ben says otherwise.

## Faults and deferred work

- A fault (a Report a problem entry from the solo world, an audit finding) is an entry in the row's `faults` list:
  `{"id", "at", "by", "role", "kind", "what", "expected", "build", "report", "status": "open|fixed|not-a-fault", "fix"}`.
  Find the row with `node tools/registry/registry.mjs owner <file>`. A fault no row owns goes in `_inbox.json` with a
  `guess` of the module, and a person or the triage step moves it to a row.
- Deferred work goes in the row's `open` or `deferred` list, with where it was deferred. Shared-folder JSON and desk
  databases are not places for work to wait.

## Seeding a module

1. Draft rows from the module's CHANGELOG.md, its changes/ notes, the done-audit claims, the final-audit rulings and
   tells, and the Master Plan's open lists (mechanical: the local models).
2. An Opus thread reviews the draft, proves each step with the tools, and sets `"seeded": true` in the same PR.
3. From then on CI enforces the registry for that module (merge rule 4, docs/WORKFLOW.md section 6).

## Commands

    node tools/registry/registry.mjs check                every row well formed, files, gate steps, readers, art ids
    node tools/registry/registry.mjs owner <file>         which rows own a file
    node tools/registry/registry.mjs owners --list        script files no row owns yet
    node tools/registry/registry.mjs wip                  half-built rows per module
    node tools/registry/registry.mjs changed --since <ref>   what changed since the last audit or review
    node tools/registry/strength.mjs <gate file>          how strongly each gate step proves its feature
