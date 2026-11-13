# How work reaches main

The rules threads follow so that work flows to main without clashes or waits (Ben's speed-up list, 13 November 2026,
decisions B3080 to B3085).

## 1. Starting a thread: claim a decision block

    node tools/decisions/claim.mjs --thread <thread id> --feature "what the work is"

It prints a block such as B3090-B3099 and records it in `/mnt/project-files/registry/decision-blocks.json`, which every
thread sees at once. Use only numbers from that block. `--size 30` claims a bigger one; `--list` shows every claim.
The coordinator claims the block when it starts a thread and names it in the first message; a thread that finds none
there claims its own.

## 2. While working: fragments, not hand edits

Do not bump module.json, a module's VERSION, its CHANGELOG.md, docs/MODULES.md or docs/DECISIONS.md by hand. Add:
- `changes/<module-id>/<feature-name>.md`: the bump (`patch`, `minor`, `major`) and a one-paragraph release note;
- `changes/decisions/<B-start>.md`: the block, feature, modules and the decision sections.

The format is in [changes/README.md](../changes/README.md). In code comments cite decision numbers, not the coming
version. Gates check for the feature or use an at-least version.

## 3. Keep pull requests small: one module per PR where the work allows

A pull request that holds work for several modules waits for the slowest part, and every hour it stays open makes
clashes with other branches more likely. So:
- Split work by module. A change to WoDX NPC and an unrelated change to WoDX Sheets go in two PRs, each with its own
  fragment, gated and merged on its own.
- Work that truly needs two modules at once (one calls the other's new api) goes in one PR, or the providing module
  first and the caller after it merges.
- Put display-only fixes, docs and tools in PRs of their own, not on top of a large feature branch.
- When one part of an open PR waits (on Ben, a desk, a PC gate), move the parts that are ready to a new branch from
  main and merge them; leave the waiting part behind.
- Aim for a PR that can be gated in one PC run. A PR open for more than a day, or touching more than three modules,
  should be split unless the work cannot be.

## 4. Gates: only what the change touches

On the PC, from the branch's checkout:

    node tools/lanes/run-gate.mjs --touched           the gates the branch's changes need (drift check first)
    node tools/lanes/gate-map.mjs --touched           just the list, to put in a PC job

A Paperdoll-only change runs the Paperdoll gates, not the Relationships ones. A change to WoDX Chronicle or the system
still runs nearly every gate. The full run happens every night on lanes 2 and 3 after the reset
(`tools/lanes/nightly.mjs`), so anything `--touched` misses shows up by morning in nightly-gates.log. If a gate covers
a module the map misses, add it in `tools/lanes/gate-map-extra.json` (`"add": {"gatex": ["wodx-npc"]}`).

## 5. Book checks: in the cloud where the text is there

    node tools/books/books.mjs page v20 266 --around 1
    node tools/books/books.mjs find "words in order" --book v20
    node tools/books/books.mjs overlap modules/wodx-npc

The texts are in `/mnt/project-files/book-text` (see [tools/books/README.md](../tools/books/README.md)). A book not
there yet (no OCR, or not copied) still goes to the PC helper.

## 6. Merging

    git fetch origin main && git merge origin/main
    node tools/release/merge-stamp.mjs --commit
    git push

Wait for the GitHub check, then merge with the head you pushed (`expectedHeadSha`). If main moved first, repeat from
the top. `node tools/release/merge-stamp.mjs --check` says whether a branch is ready: nothing left in changes/, the
newest main held, any hand-made version above main's. On a push to main the harness fails if a fragment was left.
