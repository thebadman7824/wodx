# Tools

- `ldb-check.mjs`: opens every LevelDB store in a world folder (`data/*` and `packs/*`), parses each record as JSON and prints counts by document type. Needs `npm install classic-level@1.4.1`. Run it on a copy, never on a live world: opening a store compacts it.
  `node ldb-check.mjs <world-folder>`
- `quality-check.sh`: the automatic part of the quality gate (parse, module.json, imports, unit tests, the harness, UI fit). `bash tools/quality-check.sh`. Set `FOUNDRY_CSS` to Foundry's `public/css/foundry2.css`; on Ben's PC it is found on G: without it.
- `harness/`: the mock-Foundry tests. `cd tools/harness`, `npm install`, then `node --test *.test.mjs`. The UI fit check is `node ui-fit.mjs <foundry2.css> [screenshot folder]`.

## On Windows

- The tests load modules by file path, which Node on Windows reads as a URL. `harness/win-paths.mjs` fixes that, and every test file imports it first. A new test file should do the same.
- The UI fit check needs the Playwright package but not its browser: `npm install --no-save playwright` in `tools/harness` (set `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` to skip the download). It uses Playwright's Chromium where one is installed, then Edge, then Chrome. `WODX_BROWSER` can name another browser.
- `quality-check.sh` runs in Git Bash. It uses `python` where `python3` is only the Microsoft Store stub, and reads files as UTF-8.
