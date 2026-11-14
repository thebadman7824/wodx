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

`tools/pcq/runner.mjs`, settings in `runner.json`: lanes 2 to 6, two light slots, holds below 15 GB free on C:, 50 GB
on D: or 3 GB of free memory. It runs from its own clone (`D:\WoDX\pcq\repo`, worktrees per lane in `D:\WoDX\pcq\wt`),
never from the lanes clone, and updates itself when main changes it. The issue labelled `pc-status` shows every lane,
the queue and the last results, updated every 2 minutes; an issue labelled `pc-alert` opens when a lane stays down or
jobs are held for disk or memory, and closes when that clears.

Error checking: lane clash check before it starts (no lane 1, no shared port or folder, no Live world, every lane reset
nightly), a health probe of each idle lane every 5 minutes with one restart, a time limit on every step (the process
tree is ended past it), one retry after a lane reset on a lane fault (no free lane, drift, watchdog, failed deploy or
start; a failing gate is a result and is not retried), and jobs that were running when it stopped are run again.

Recheck (B4610): when a gates job fails, each failing gate (up to 12) is rerun on a freshly reset lane, alone on the
same commit and then on main, and the result ends with a verdict per gate: NEW with this change, fails on main too,
or passes alone (it fails only after other gates). A "fails on main too" gate is still a fault to fix, not a reason to
merge past it. "recheck": false in the job turns this off.

    powershell -ExecutionPolicy Bypass -File tools\pcq\start-runner.ps1     start it if it is not running
    D:\WoDX\pcq\runner-off                                                  a file there stops it once idle
    D:\WoDX\pcq\logs                                                        its logs (14 days kept)

`lane-reset.cmd` runs `start-runner.ps1` every night, so the runner is back by morning after a reboot.
