# Testbed lanes

Six local Foundry servers on Ben's PC, so gates can run side by side. Decisions B3020 to B3024; lanes 4 to 6 B4103.

| Lane | Port | User-data folder | Nightly reset |
|---|---|---|---|
| 1 | 30000 | %LOCALAPPDATA%\FoundryVTT (the existing testbed; lanes.json reads %NAME% from the environment) | never |
| 2 | 30020 | D:\WoDX\FoundryData-lane2 | 04:40 |
| 3 | 30030 | D:\WoDX\FoundryData-lane3 | 04:40 |
| 4 | 30040 | D:\WoDX\FoundryData-lane4 | 04:40 |
| 5 | 30050 | D:\WoDX\FoundryData-lane5 | 04:40 |
| 6 | 30060 | D:\WoDX\FoundryData-lane6 | 04:40 |

Licence: the Foundry EULA (Terms item 2) and FAQ (License Questions, example 3) allow more than one instance on one
licence while only one is reachable by anyone other than the licence owner. Live is that one. Every lane stays local:
UPnP off, no router forward, never a link to players.

## Lane 9: a cloud thread's own box (B7240)

A cloud thread can run gates without a PC lane. In the thread's Linux box:

    node tools/lanes/cloud-lane.mjs setup          about 2 minutes: Foundry, Node 24, deploy, clean fingerprint
    node tools/lanes/cloud-lane.mjs gate gateplains   run-gate.mjs on lane 9 (any run-gate options work)
    node tools/lanes/cloud-lane.mjs stop

Setup reads Ben's Foundry Node zip and the signed license.json from the private shared folder
/mnt/project-files/private/cloud-foundry (never the repo, never printed). The cloud network must allow foundryvtt.com,
r2.foundryvtt.com and api.foundryvtt.com. When the private folder holds the PC known-good world (testbed/, in parts
with a SHA256 file) and the PC lane's other modules (modules/), setup uses them (B7300); otherwise the world is the
repo's world.json with the WoDX modules on and a Gamemaster Test account. A cloud result is a hint, not a verdict:
gate6b's werewolf form step fails on lane 9 even with the PC world and 28 of its 30 modules, while it passes on a PC
lane, so check a cloud fail on a PC lane before acting on it. Each gate6b run also leaves wodx-chronicle.nightWork
added, so the next run there stops on drift until `lanes.mjs reset --lane 9`. Measured 17 November 2026: setup 108 s from the cache, gateplains 28/28 in 203 s, peak 3.1 GB RAM
(browser 2.2 GB, Foundry 0.24 GB) of the box's 15 GB.

## Running gates

Threads queue gate runs through the PC job queue (tools/pcq/README.md); the runner there drives lanes 2 to 5. Lane 6 is reserved for the local agents (B6527): run-gate takes it only with --lane 6, and the nightly reset leaves it alone.
The commands below are what it runs, and still work by hand.

    node tools/lanes/run-gate.mjs gate6b gatebattle [--lane 2] [--wait 30]

The runner takes the first free lane, locks it, checks for drift and only then runs. Drift means any of:
- a file or version of a package in the repo checkout (modules/*, system/worldofdarkness) differs on the lane;
- the running server reports another version than the repo (restart the lane after a deploy);
- an active module, a world setting or the clock differs from the lane's clean fingerprint.

Only the gates a change needs: `run-gate.mjs --touched [--base origin/main]` (the map is `gate-map.mjs`; corrections in
`gate-map-extra.json`). Every gate: `--all`, split with `--shard 1/2`. `--report <file>` appends each gate's line.
The nightly task resets every lane marked autoReset (2 to 6) and starts the PC job runner. It no longer runs `nightly.mjs`
(B7460): the one nightly full run is `tools/pcq/nightly-gates.mjs`, an all-gates PC job (B7020, docs/PRIORITIES.md).
`nightly.mjs` still works by hand: pull main, deploy where the code differs, every gate split across the lanes. B3083, B3084.

A long list (`--touched` often gives 80 or more gates) goes faster and cleaner split over lanes 2 and 3:
`run-gate.mjs --touched --lanes 2,3`. After each gate the runner puts back the world settings it changed and removes
ones it added; on lanes 2 and 3 it also deletes documents the gate left behind, so one gate's leftovers cannot fail
the next (B3086). The two-browser gates (gatesolo, gatelookhand, gatetruthlooks and the others in gate-map-extra.json's notGates) are not in the map: run them with `node tools/harness/gate-two.mjs <name>`, alone.

No run can hang a lane (B3089). A dialog or other window a gate opened that waits more than 45 seconds is closed
(`--step-timeout`), so the step waiting on it goes on; document sheets are left open. A gate gets 15 minutes
(`--gate-timeout`, or its own in `gate-map-extra.json` "timeouts") and then fails; if the page itself stops answering,
the browser is closed and a new one signs in for the next gate. Past the whole run's limit (`--max-minutes`) the runner
closes its browser, frees the lane and exits with 5. The lane lock holds a deadline the runner moves on before each
gate; a run that finds a lock past its deadline ends that hung run (only a gate run's own node process, with its
browser) and takes the lane, so nobody has to end processes by hand.

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
