# Testbed lanes

Three local Foundry servers on Ben's PC, so gates can run side by side. Decisions B3020 to B3024.

| Lane | Port | User-data folder | Nightly reset |
|---|---|---|---|
| 1 | 30000 | C:\Users\blebr\AppData\Local\FoundryVTT (the existing testbed) | never |
| 2 | 30020 | D:\WoDX\FoundryData-lane2 | 04:40 |
| 3 | 30030 | D:\WoDX\FoundryData-lane3 | 04:40 |

Licence: the Foundry EULA (Terms item 2) and FAQ (License Questions, example 3) allow more than one instance on one
licence while only one is reachable by anyone other than the licence owner. Live is that one. Every lane stays local:
UPnP off, no router forward, never a link to players.

## Running gates

    node tools/lanes/run-gate.mjs gate6b gatebattle [--lane 2] [--wait 30]

The runner takes the first free lane, locks it, checks for drift and only then runs. Drift means any of:
- a file or version of a package in the repo checkout (modules/*, system/worldofdarkness) differs on the lane;
- the running server reports another version than the repo (restart the lane after a deploy);
- an active module, a world setting or the clock differs from the lane's clean fingerprint.

On drift nothing runs (exit 4) and the differences are printed and saved in `<lane>\wodx-lane\drift.json`.
Changed documents are a warning only. After each gate the runner puts the clock and the pause back.

## Managing lanes

    node tools/lanes/lanes.mjs status
    node tools/lanes/lanes.mjs snapshot --from 1      (lane 1 stopped) shared known-good copy, old one backed up
    node tools/lanes/lanes.mjs setup --lane 2         new lane from lane 1's Config and the known-good world
    node tools/lanes/lanes.mjs deploy --lane 2        repo modules and system into the lane, checked file by file
    node tools/lanes/lanes.mjs reset --lane 2         world back to known-good (backup first)
    node tools/lanes/lanes.mjs accept --lane 2        the running world becomes the lane's clean fingerprint
    node tools/lanes/lanes.mjs compare                differences between lanes
    powershell -ExecutionPolicy Bypass -File tools\lanes\register-lane-reset.ps1 -Repo <clone>

Run from a clone kept on main, with Playwright installed in tools/harness (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1, Edge is
used). Lane state lives in `<dataPath>\wodx-lane\`, outside Foundry's Data folder. Backups go to D:\WoDX\Backups and
are never removed by these tools.
