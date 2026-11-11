# Release checks

Two checks for the live server (Linux, at wodx.online).

## Letter case

Linux treats `Door.webp` and `door.webp` as two files; Windows does not, so a wrong case only breaks after a release. `tools/harness/path-case.test.mjs` fails when a path in the system, a module or a world file differs in case from the file on disk, or when one folder holds two names that differ only in case. It reads manifests (`esmodules`, `styles`, `languages`, `packs`), relative imports, `systems/...` and `modules/...` paths in code, templates, data and CSS, paths built from a module-id constant, CSS `url()`s, and image paths inside the compendium packs. Paths built at run time from other values, and world content that lives only in the Foundry data folder, are not covered.

For a report: `node tools/harness/path-case.mjs` (add `--missing` to also list paths with no file in the repo; those are not errors here, since some point at files that live only in Foundry's data folder).

## Release stamp

Every package folder (the system and each `wodx-` module) holds `release.json`. In the repo it holds `$Format` placeholders; `.gitattributes` marks it `export-subst`, so `git archive <commit>` writes the commit hash and commit date into it. For the Storyteller, WoDX Chronicle shows the build in the Settings sidebar (for example "WoDX build 3cd5b87, 9 Nov 2026"), logs it to the console, and warns when the packages come from different commits.

A copy made another way (copying from a clone, as the PC deploy scripts do) shows "not stamped". To stamp it:

    node tools/release/stamp.mjs <Foundry Data folder or deploy folder> [--commit <sha>]

Without `--commit` it uses the commit checked out in the repo and refuses when the working tree has changes.

To read the stamp from a console: `await game.wodx.chronicle.release.check({force: true})`.

## Bundling

For a release copy (the folder that goes to the live server), `node tools/release/bundle.mjs <Data folder or deploy folder>` bundles and minifies each `wodx-` module's code into `scripts/main.bundle.js` (plus chunk files for code reached only through `import()`), and points that copy's `module.json` at it. In the repo nothing changes. Players' browsers then load 14 script files instead of about 250, and about a third less code. Install esbuild first with `cd tools/harness && npm install`.

A file one package imports from another (for example `wodx-chronicle/scripts/calendar.mjs`) stays out of every bundle and is loaded from its own path, so the browser still holds one copy of it. Source files stay in the copy, so gates that import a single file still work.

`--check` reports sizes and writes nothing. To undo, put each `module.json` back from the repo, or deploy the folder again. Bundle after `stamp.mjs`, since both rewrite files in the copy.
