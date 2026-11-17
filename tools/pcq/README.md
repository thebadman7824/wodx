# PC job queue

Threads queue PC work straight to a runner on Ben's PC, with no thread or coordinator passing jobs along
(B4100-B4109). A job is a GitHub issue in this repository with the label `pc-job`; the runner takes it, runs it on a
free testbed lane, comments the result on the issue and closes it with `pc-done` or `pc-failed`.

## Queueing a job (from any cloud thread)

1. Build and check it:

       node tools/pcq/submit.mjs gates gateplains gatelifepath --lanes 2 --prio 1 --thread <your thread id>

   It refuses a gate with no file, a two-browser gate outside a `gate-two` job, a gate that does not parse or breaks
   the gate rules, lane 1, and anything that is not one of the job kinds. Kinds and options: the header of
   `submit.mjs` and of `jobs.mjs`.
2. Open the issue with the GitHub tool (`issue_write`, method create): the printed title and body, label `pc-job`.
   Only issues opened by the owner's account run.
3. The runner comments `Started ... on lane(s) N` within a minute when a lane is free, then the result. Read it with
   `issue_read` (get_comments). For a long run, schedule one check for about when it should end rather than polling.

Gate a branch before merging with `--ref claude/<branch>`; the branch must be pushed. `--after <issue>` waits for
another job. `--prio` is 1 to 5 in the Master Plan order (1 for Master Plan gaps), default 3.

Book and Trove lookups (`books-find`, `trove-find`) need no lane and run beside the gate jobs. Their results give book
and page or file names only, never text, because the repository is public. Anything else (a copy, an OCR run, work
that needs judgment) still goes to the PC helper thread.

## The runner

`tools/pcq/runner.mjs`, settings in `runner.json`: lanes 2 to 5 (lane 6 is kept for the local agents, B6527), two light slots, holds below 15 GB free on C:, 50 GB
on D: or 3 GB of free memory. It runs from its own clone (`D:\WoDX\pcq\repo`, worktrees per lane in `D:\WoDX\pcq\wt`),
never from the lanes clone, and updates itself when main changes it. The issue labelled `pc-status` shows every lane,
the queue and the last results, updated every 2 minutes; an issue labelled `pc-alert` opens when a lane stays down or
jobs are held for disk or memory, and closes when that clears.

Error checking: lane clash check before it starts (no lane 1, no shared port or folder, no Live world, every lane reset
nightly), each gates job starting on a freshly reset lane (B7190; `"reset": false` or `submit.mjs --no-reset` skips it), a health probe of each idle lane every 5 minutes with one restart, a time limit on every step (the process
tree is ended past it), one retry after a lane reset on a lane fault (no free lane, drift, watchdog, failed deploy or
start; a failing gate is a result and is not retried), and jobs that were running when it stopped are run again.

Heartbeat (B4700): a GitHub workflow (.github/workflows/pc-heartbeat.yml) checks every 15 minutes that the status
issue has moved in the last 15 minutes, and opens a pc-alert issue "the runner is silent" when it has not.

Recheck (B4610): when a gates job fails, each failing gate (up to 12) is rerun on a freshly reset lane, alone on the
same commit and then on main, and the result ends with a verdict per gate: NEW with this change, fails on main too,
or passes alone (it fails only after other gates). A "fails on main too" gate is still a fault to fix, not a reason to
merge past it. "recheck": false in the job turns this off.

    powershell -ExecutionPolicy Bypass -File tools\pcq\start-runner.ps1     start it if it is not running
    D:\WoDX\pcq\runner-off                                                  a file there stops it once idle
    D:\WoDX\pcq\runner-hold                                                 a file there: no new jobs, all else runs
    D:\WoDX\pcq\logs                                                        its logs (14 days kept)

`lane-reset.cmd` runs `start-runner.ps1` every night, so the runner is back by morning after a reboot.

A watchdog (`watchdog.ps1`, B5210-B5212) runs apart from the runner, started through WMI by `start-runner.ps1`, and
the runner's wrapper starts it again whenever it is missing. Every two minutes it checks that `run-runner.ps1` is
running and, if not, starts it again and writes a line in `logs\runner-console.log`. A file named `runner-off` in
`D:\WoDX\pcq` keeps it from restarting the runner; a file named `watchdog-off` stops the watchdog itself.

## Sprites asked for from the game (B6144)

The Storyteller's "Draw sprites now" button (WoDX Paperdoll settings) writes `roster.json` and `request.json` into
`worlds/<world>/wodx-sprites`. Each loop the runner looks in the data folders listed in `runner.json` `spriteData`
(the testbed lanes 2 to 6 only; never lane 1 or the Live world) for a request with no answer, runs `tools/sprites/batch.py` from its own clone on that roster
into the same folder at below-normal priority, and writes `status.json` (`drawing`, then `done` or `failed`). One
world at a time, beside the jobs (none starts while `runner-hold` is set); `python` in `runner.json` is the interpreter with numpy and Pillow. The game reads
the status and puts the new sprites on the tokens.

Hold (B7207): to keep the lanes free for other work (an art render, say) without stopping the runner, put a file
named `runner-hold` in `D:\WoDX\pcq`. Running jobs finish, no new job starts and no running job takes more lanes,
while the status issue, the stale-pull-request sweep, the merge train, self updates and cancels go on. The status
issue shows a HOLD line. Delete the file to take jobs again. `runner-off` is for stopping the runner; while it waits
for running jobs it now still updates the status issue.

## The second PC (B6880-B6882)

DESKTOP-S6NV3Q9 runs a second runner from `C:\WoDX\pcq` with `runner.desktop-s6nv3q9.json`: lane 7 (port 30070,
`C:\WoDX\FoundryData-lane7`), its own status issue "PC runner status (second PC)" and alerts titled "Second PC alert".
Both runners read the same queue; a claim comment decides which one takes a job. Name `--lane 7` to send a job there,
or leave the lane out and the first free lane on either PC takes it. Book and Trove lookups stay on the main PC.
It is slower (2 cores) and has no graphics card, so it suits short gate lists. It also watches https://wodx.online and
the main runner's status issue and opens an alert when either goes quiet.

## The Secondary PC (B6990)

BENJAMIN-PC runs a third runner from `D:\WoDX\pcq` with `runner.benjamin-pc.json`: lane 8 (port 30080,
`D:\WoDX\FoundryData-lane8`), its own status issue "PC runner status (Secondary PC)" and alerts titled
"Secondary PC alert". It reads the same queue and claims jobs the same way; name `--lane 8` to send a job there.
It has 8 cores and 16 GB, so it can take longer gate lists than lane 7. Book and Trove lookups stay on the main PC.

## Gates on every pull request (B7010)

`.github/workflows/pc-gates.yml` queues the touched gates for every owner pull request from a claude/ branch, on
each push, so threads no longer submit and watch gate jobs by hand. It runs on the self-hosted GitHub runner on the
Secondary PC (two instances, `D:\WoDX\gh-runner\1` and `\2`, labels `self-hosted, wodx-gate`, started at sign-in by
`Startup\WoDX-gh-runner.cmd` at below-normal priority). `tools/pcq/pr-gates.mjs` opens the pc-job issue with the
owner's sign-in (title ends `[PR #N <sha>]`); the PC runner posts the result as the `wodx/gates` status, which
merge-rules.mjs reads. Nothing is queued for HOLD or handoff pull requests, changes with no gate, a head whose gate
inputs match a commit that already passed, or a commit already queued. Queue again by hand from the Actions tab
(PC gates, Run workflow, the pull request number).

Old commits (B7205): a waiting job for an older commit is closed when a newer one is queued. The runner also checks
the pull request named in the title before it starts a job and every three minutes while it runs. When the pull
request has moved on, merged or closed, a waiting job is closed as not planned, and a running one has its shared gate
queue emptied: each lane ends after the gate it is on, nothing is retried or rechecked, and no `wodx/gates` status is
posted. A failed lookup never drops a job.

Cancel (B7206): close a running job's issue, or add the label `pc-cancel`, and within about 30 seconds the runner ends
that job's processes (run-gate, lanes.mjs and what they started), resets each
lane it used, posts "Cancelled" with no result or `wodx/gates` status, and closes the issue as not planned. Nothing is
retried. A waiting job labelled `pc-cancel` is closed without running. No hand kill on the PC is needed.

Lock-down (B7011): the workflow's `if:`, the job-started hook `D:\WoDX\gh-runner\job-started.ps1` (outside the
repository; copy and installer in `tools/pcq/gh-runner/`), and the setting that holds outside contributors' runs
for approval. Reinstall with `powershell -ExecutionPolicy Bypass -File tools\pcq\gh-runner\install.ps1`.

Nightly full run (B7020): the "WoDX nightly gates" task on the Secondary PC starts `tools/pcq/nightly-gates.mjs` at
05:00 UTC. It waits for the GPU guard (gives up at 13:00 UTC), queues every gate on lane 8 for main's commit, and opens
a summary issue labelled `nightly-gates`. A health signal for main only; merges still need the pull request's own
touched gates. The Secondary PC's runner runs at below-normal priority (`"priority"` in `runner.benjamin-pc.json`, B7021).

## The merge train (B7202)

Pull requests labelled `merge-train` merge one at a time, oldest label first. Every few minutes the Main PC's runner
(`"train": true` in runner.json; the other PCs' runners have it off) takes the front one: a draft is marked ready, main
is merged in and the release notes stamped in its own worktree (`<home>/train`), the push is made with a lease on the
head it saw, pc-gates.yml gates the new head and that gate job goes ahead of the rest of the queue, and it merges when
`checks` and `wodx/merge-rules` are green. A conflict, a red result or nothing within `trainMaxHours` (3) takes it out
with a comment. The rest of the line is left alone. The status issue shows the line; `node tools/pcq/train.mjs`
prints what it would do now. The hourly sweep no longer merges main into open pull requests (`"sweepUpdates": true`
brings that back). docs/WORKFLOW.md, section 6, is the thread's side.

