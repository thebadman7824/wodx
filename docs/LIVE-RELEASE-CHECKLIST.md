# Live release checklist

For a release of the system and the WoDX modules to the live server (wodx.online, world rothenstein-live). Nothing goes to the live server without Ben's go-ahead for that release. Releases go out the day before a game night, never during one.

Before a build goes to Live, it is played in the solo world as a frozen release candidate ([SOLO-TESTING.md](SOLO-TESTING.md), B7161), and the problems reported there are fixed or accepted.

## Before (cloud or PC)

1. The release commit is on main, and the harness passes on it: `cd tools/harness && node --test *.test.mjs`. This includes the letter-case test (path-case.test.mjs), the language-key test, the cross-module import test and the text-cleanup test.
2. The gates pass on the testbed (rothenstein-wodx) at that commit, with every WoDX module on, in every era. The run and its date are in the PC job result.
3. UI fit passes: `node tools/harness/ui-fit.mjs "<path to foundry2.css>"`.
4. Every package whose files changed since the last release has a higher version, and MODULES.md shows the same versions.
5. The release log lists each module that changes, its version on Live and the new one, and any setting that has to change in the live world. A world setting changes only when Ben has said so for that setting.
6. Any module that is new to Live stays off in the live world until Ben turns it on. WoDX Rules (modules/wodx-rules, B8060) must be installed with the others from its first release on; the other modules load its files while it is off, so it needs no switching on.

## Release (PC helper, with Ben's go-ahead)

7. Take a droplet snapshot in the DigitalOcean panel. Then back up the live server: run the nightly backup by hand (`/usr/local/bin/wodx-backup`), check that its .md5 matches, and keep the previous release folder.
8. Build the release with `git archive <commit>`, so release.json in every package is stamped. If the release is copied any other way, stamp it with `node tools/release/stamp.mjs <folder> --commit <sha>`.
9. Upload, then check each file's hash against the archive.
10. Restart Foundry on the server. If `/var/run/reboot-required` exists, reboot the server instead (Foundry starts by itself).

## After

11. As the Storyteller on Live: Game Settings shows "WoDX build <sha>" with no warning about mixed commits; the browser console shows no errors from WoDX modules (apart from the known harmless "filters" error); a sheet of each kind in the world opens.
11a. Look over the Users list on Live: remove accounts nobody uses, and make sure none has a blank password.
12. Write the release log entry: date, commit, versions, settings changed.
13. If something is wrong, put the previous release folder back and restart. Restore the backup only if world data changed.

## Release, 2026-11-25 (ccdd0a4): what to know next time

- Log: /mnt/project-files/releases/live-release-2026-11-25-ccdd0a4.md (project files). Live went from 5854053 to ccdd0a4, and wodx-rothenstein was switched on in rothenstein-live.
- A rehearsal came first: the fresh Live world backup, unpacked on a free testbed lane as `rothenstein-live-rehearsal`, with the release deployed and every sheet kind opened. It found nothing, and it is worth keeping for any release that spans many module versions.
- The 11 November release scripts were gone from %TEMP% on the Main PC and were rebuilt: %TEMP%\wodx-vps\rel-ccdd0a4.sh (checks, backups, staging, then `swap`), D:\WoDX\pcq\ops\world-modcfg.cjs (turns a module on or off in a stopped world) and D:\WoDX\pcq\ops\rehearsal-check.mjs. Keep them outside %TEMP% from now on.
- `ssh root@wodx.online` answered "Permission denied (publickey)" until Ben gave the go-ahead in the Main PC thread. The key needs a passphrase and is served by the Windows ssh-agent; `ssh-add -l` on the Main PC shows whether the agent holds it.
- Step 7's droplet snapshot was skipped: doctl is not set up on the PC, and the server backups (world and previous code) were taken instead.
- After the swap, 96 compendium LevelDB files under systems/worldofdarkness/packs no longer match the MD5 manifest. Foundry rewrites them when it opens the packs, so check the manifest with Foundry stopped.

## Security routine (Security Desk, 13 November 2026)

- Before each game night, even without a release: the Users list check (step 11a) and a reboot if `/var/run/reboot-required` exists.
- Monthly patch day, the day before a game night: update every package (this covers Node and Caddy, which automatic updates skip), reboot, check the site.
- A newer Foundry build goes on Live only after it passes on a testbed lane. Modules on Live come only from Foundry's own package list, never from a pasted manifest link.
- The Setup screen is reached through an SSH tunnel only (tools/security/README.md).

## Dry run, 2026-11-10 (Phase 10; nothing released)

Walked steps 1 to 6 on main after PR 488 with the code checks run in the cloud. The PC run covers steps 2 and 3 (Phase 10 PC job 3).
- Step 1: harness 998/998. The letter-case report finds 2693 references with 0 case mismatches; 33 point at files that live only in Foundry's data folder.
- Step 4: every package's version is above the recorded Live release (3cd5b87) and matches MODULES.md: system 7.3.2-wodx.3 to wodx.6, Actions 3.11.2 to 3.19.7, Chronicle 0.4.2 to 0.11.4, Combat 3.7.4 to 3.8.6, Creation 0.6.1 to 0.9.2, NPC 0.3.0 to 0.8.2, Otherworlds 0.2.0 to 0.7.2, Sheets 0.5.0 to 0.6.1.
- Step 6: these are new to Live and would stay off: Atmosphere 0.10.0, Interactables 0.20.2, Library 0.4.5, Paperdoll 0.6.4, Senses 0.5.0, Storyteller 0.18.5, Targeting 0.1.1.
- Step 5, settings waiting on Ben: none set. The block on moves out of turn is approved for Live once Combat 3.8.1 or later is there.
- Found: all 15 packages hold release.json, so step 8 will stamp them. The live server's own build stamp is checked at step 11, on the server.
