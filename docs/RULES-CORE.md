# Rules core: one Foundry-free rules package (B8060-B8089)

Approved 25 November 2026 (Godot study, option B; design doc section 17). The goal is one folder that holds every
WoDX rule as plain JavaScript, with a test that fails the moment any of it reaches for Foundry. Every module calls it;
the harness tests it in plain Node; a later standalone build (the private Godot study) could lift it whole.

## What the repo looks like today (read at main 06d57d9, 26 November 2026)

- 355 rules files: every `*-rules.mjs` and `*-rules.js` (351) plus the four files named `rules.js` or `rules.mjs`
  (Actions, Combat, Creation, Otherworlds). About 75,000 lines.
- None of them calls Foundry. All 351 `*-rules` files load in plain Node with no Foundry globals.
- The only Foundry contact any of them reaches is `wodx-chronicle/scripts/calendar.mjs`, through `terms.mjs`: two
  functions there (`makeCalendarClass`, `makeCalendarConfig`) read `foundry.data` and only run inside Foundry's init.
- They also import about 70 files that are not named `*-rules`: book tables in `data/`, `gen-core.mjs`,
  `chronicle-data.mjs` and the like. All of those are Foundry-free too.
- About 2,160 import lines point at rules files: 480 in harness tests, 19 in gates, the rest in module scripts.

So the work is mostly moving and rewiring, not untangling. The real risks are paths, bundling and clashes with open
branches, listed below.

## Layout

    modules/wodx-rules/
      module.json         a library module: no esmodules, no styles, nothing runs at load
      README.md
      core/               terms.mjs, calendar-math.mjs, calendar.mjs (the pure half)
      actions/ chronicle/ combat/ creation/ interactables/ library/ npc/ otherworlds/
      paperdoll/ senses/ sheets/ solo/ storyteller/ atmosphere/
                          one folder per module the files came from, file names unchanged

- It is a Foundry module folder so Foundry serves it at `/modules/wodx-rules/...` and every module reaches it with
  the same `../../wodx-rules/...` paths the modules already use for each other. The lane, rc and deploy tools pick up
  every folder under `modules/` with a `module.json`, so nothing new is needed to install it.
- No module lists it under `relationships.requires`. A requires entry would make every gate run on any rules change
  (gate-map follows requires upward) and would ask the world to switch on a new module. Files of an installed module
  load whether or not it is switched on, the same as today's cross-module imports.
- Folders by source module, not by game line, so a move is mechanical and the gate map can still tell which module a
  change belongs to. Regrouping by line can come later, inside the package.

## The guard test

`tools/harness/rules-core.test.mjs`:

1. Every file under `modules/wodx-rules/`, and every file it reaches through imports, names no Foundry global
   (`game`, `foundry`, `CONFIG`, `ui`, `Hooks`, `canvas`, `ChatMessage`, `Roll`, `Actor`, `Item`, `fromUuid` and the
   rest), comments and strings left out.
2. Every package file loads in plain Node with those globals set to throw on any touch.
3. A package file may import outside the package only files listed in `rules-core-outside.json` (book tables and pure
   helpers still in their modules). That list may only shrink.
4. No `*-rules` file may be added outside the package except those in `rules-core-baseline.json`, the ones not moved
   yet. That list may only shrink, and the migration is done when it is empty.

## Order of work

Each step is one PR through the /ship loop and the merge train, with the harness, the touched gates and the
integration check.

1. **Core.** The package, the guard test, `terms.mjs`, `calendar-math.mjs` and the pure half of `calendar.mjs` moved
   in. Chronicle keeps `calendar.mjs` with the two Foundry functions plus a re-export, and `terms.mjs` and
   `calendar-math.mjs` as re-exports, so the hundreds of files that import them keep working and open branches do
   not clash. The bundler learns the package (below). Chronicle changes, so nearly every gate runs once.
2. **Leaf modules first**, smallest gate fan-out and no open-branch clashes: Paperdoll, Senses, Sheets, Otherworlds,
   Library, Atmosphere, Interactables.
3. **The big three**: NPC, Storyteller, Chronicle, one PR each (Storyteller may split in two).
4. **After the solo-fix PRs merge**: Combat, Actions, Creation, Solo, and the held files below.
5. **Retire the re-exports**: point every remaining import at the package and delete the Chronicle copies.
6. **Pay-off**: gates that only check pure rules move to the harness, so they stop taking a Foundry lane.

Each move is a `git mv` (no copy left behind, so git follows the rename when another branch edits the old file), and a
script rewrites every import of a moved file across the repo: module scripts, harness tests, gates and tools.

Not moved: WoDX Targeting (dropped on the solo-test desk, item 2509) and WoDX Voices (shelved, B7134).

### Held until the solo-fix work merges

PR 2525 and its follow-up design PR edit these rules files, so they stay where they are until both merge:
Actions `theme-rules.js`, `turn-rules.js`, `busy-rules.js` (new), Atmosphere `adaptive-rules.mjs`, Chronicle
`time-dial-rules.mjs`, Combat `rules.js`, Creation `derived-rules.mjs`, `first-night-rules.mjs`, `learn-rules.mjs`,
`lifepath-rules.mjs`, `wizard-rules.mjs`, Interactables `carry-rules.mjs`, Solo `solo-rules.mjs`, Storyteller
`reach-rules.mjs`.

## Risks and what handles them

- **Bundling for slow machines.** The release bundler keeps any file imported across packages out of the bundles so it
  has one copy in the browser. Moved naively, every rules file would become such a file and load on its own. The
  bundler instead treats a package file reached by only one module as part of that module, which is exactly today's
  result; a file reached by two or more modules stays on its own, as it does now. `bundle.mjs --check` totals before
  and after each step go in the PR.
- **State held in a file.** Seven rules files keep a top-level `let` and 66 a top-level Map or Set. The bundling rule
  above never makes a second copy of a file that more than one module loads, so shared state stays shared.
- **Open branches.** Files an open PR edits are held (list above). Long-held PRs (1584, 1597, 1715, 1727, 1846) will
  need their imports rewritten when they come back; the cross-imports test names every broken path.
- **Gate selection.** gate-map traces which modules load a changed file. Each PR compares `gate-map.mjs --touched`
  with what the old paths would have picked, so a move never runs fewer gates than it should.
- **Paths in strings.** Tests and gates that build a path as a string (`join(root, "modules/wodx-npc/...")`) are
  rewritten by the same script; the harness run catches any it misses.
- **Live.** Nothing goes to Live. A later Live release must install `modules/wodx-rules` with the rest; the release
  checklist gets a line for it.
