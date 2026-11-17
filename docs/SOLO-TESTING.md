# Testing through the solo world

The owner plays The Lone Chronicle in the solo world on the main PC most nights. That play is the test bed for the
game (B7160 to B7163). A frozen build goes into the solo world, and faults met in play are reported from inside the
game and filed into the feature registry. Live is not part of this: Live releases follow
[LIVE-RELEASE-CHECKLIST.md](LIVE-RELEASE-CHECKLIST.md) and need the owner's go-ahead.

The solo world: rothenstein-solo, Data folder `D:\WoDX\FoundryData-solo\Data`, port 30010, the Storyteller's seat
(`tools/solo/seat.mjs`). The core under test first is V20 Dark Ages Vampire in Rothenstein, 1197, with its mortals
and ghouls.

## The frozen build (release candidate)

A release candidate is one commit of main named `rc-YYYY-MM-DD`. A night's play always runs on a known build.

1. Pick the commit: `node tools/release/rc.mjs name` prints today's label and the head of main. The harness passes
   on it, and the gates that touch the core pass on the testbed.
2. Tag it, on the PC: `node tools/release/rc.mjs tag --commit <sha>`.
3. Deploy it, on the PC (the PC helper), with the solo world stopped:
   `node tools/release/rc.mjs deploy --data D:\WoDX\FoundryData-solo\Data --label rc-YYYY-MM-DD --commit <sha> --port 30010 --backups D:\WoDX\Backups`
   It refuses while anything listens on 30010, because someone may be playing. It backs up the world, the WoDX
   modules and the system, copies the system and every wodx- module from that commit, stamps them with the label,
   and checks every copied file's MD5 against the commit. Don't play on a build whose check fails.
4. Tell the owner the label in one line. Every report carries it (from each package's release.json),
   so a fault names the build it was met on.

A new build goes in at most every few days. Never deploy mid-week without the owner knowing, and never while the
owner is playing (standing rule 4).

## Report a problem

While The Lone Chronicle is on, the player's panel has **Report a problem** (under More), and the Storyteller has the
same button in the Settings sidebar. The form asks what happened, what was expected, and what kind of problem it is.
The report adds the build, the scene, the character, the game date, the last 20 console errors, the last chat cards
and the open windows.

- Each report is saved as a journal entry in the **Reported problems** folder. The reporter can read it, and the
  full report rides on `flags.wodx-solo.report`.
- A player cannot make journal entries, so the seat saves the report. With no Storyteller connected, the report
  waits on the player's own user flag, and the next Storyteller to connect saves it.
- The seat, started with `--reports D:\WoDX\reports\solo`, also writes each report to `<id>.json` there as it is
  saved, and marks the entry exported.

## Collecting (once a day)

This step folds into the morning routine and doesn't need a routine of its own.

1. The PC helper copies new files from `D:\WoDX\reports\solo` to `/mnt/project-files/solo-reports/`. If the seat
   wasn't run with `--reports`, run `node tools/solo/reports.mjs export --url https://localhost:30010 --out <folder>`
   while the world is up.
2. A thread runs `node tools/solo/reports.mjs file --in /mnt/project-files/solo-reports` on a branch. Each report
   becomes a fault on the registry row whose files its errors come from. If no single row owns those files, it goes
   in `registry/features/_inbox.json` with a guess at the module. Open the pull request as usual.
3. The digest line it prints ("3 problems reported in the solo world: filed on rows ...") goes into the morning
   digest.

An open fault keeps its row below verified until a fix closes it (`status: fixed`, `fix: PR n`).
