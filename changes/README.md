# Changes waiting for merge

Branches no longer bump module versions or edit the shared lists by hand. They add a small file here, and
`node tools/release/merge-stamp.mjs` turns every file into the real edits just before the branch merges (B3080 to B3082).
Two branches then never touch the same lines of a changelog, docs/MODULES.md or docs/DECISIONS.md, and never take
the same version number.

## A release note: `changes/<module-id>/<any-name>.md`

    ---
    bump: minor
    what: (optional) a new "What it does" cell for docs/MODULES.md, 300 characters at most
    effect: the local weapons show in the Gear window and on the sheet, with their own damage
    ---
    Gear by region: a scene's land picks the local weapons (B3070-B3073).

`effect` is required for a `minor` or `major` note (Ben's standing rule, 14 November 2026: anything added to the game
has a tangible effect in play unless that is impossible to render). Say what a player or the Storyteller sees change:
a roll, a card, a sheet row, a map change, a sound. Where nothing can be shown, write `effect: none, ` and why.
`merge-stamp.mjs --check` warns when it is missing.

`bump` is `patch` (fixes), `minor` (new features) or `major`. Write the note as one paragraph and leave the version
out: the stamp writes `- 0.21.0 (your note)` at the top of the module's CHANGELOG.md, bumps module.json and the
module's `VERSION` string, and sets the version in docs/MODULES.md. Several notes for one module make one release
with the largest bump. Name the file after the feature so two branches never pick the same name.

In code comments, cite the decision numbers, not the coming version ("B3071", not "Library 0.21.0"): the version is
only known at merge. A gate that needs the new code should test for the feature, or read the version the module
reports.

## A decision block: `changes/decisions/<B-start>.md`

Claim the block first: `node tools/decisions/claim.mjs --thread <thread id> --feature "..."`.

    ---
    block: B3070-B3079
    feature: Gear by region: local weapons for the land of the scene
    modules: Library, Interactables
    ---
    ## B3070. Local weapons are copies of book weapons (2026-11-13)
    WoDX Library. ...

    Reverse: ...

The stamp adds the index row (with "used B3070-B3073" worked out from the sections), puts the sections in number
order in docs/DECISIONS.md and moves "Next free block" up.

## Before merging

    git fetch origin main && git merge origin/main
    node tools/release/merge-stamp.mjs --commit
    git push

Then wait for the GitHub check and merge. If main moves before the merge, do it again. `--check` tells you whether
a branch is ready (nothing left here, holds the newest main). Branches made before this way of working may keep
their hand-made bumps; the check only asks that such a version is above main's.
