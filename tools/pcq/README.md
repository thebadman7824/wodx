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
another job. `--prio` is 1 to 5 in the Master Plan order (1 for Master Plan gaps), default 3. One order for every process now
lives in registry/priorities.json (docs/PRIORITIES.md, B7350); the runner moves onto its ranks in a later change, and
until then `--prio` orders the queue as before.

A lane test of a branch's own gate tools (a change to run-gate.mjs or the lane tools it imports) goes in the queue
too, never as a run started by hand beside the runner, which cannot see such a run waiting and gives every free lane
to the running jobs (B7220):

    node tools/pcq/submit.mjs gates gateplains gatelifepath --ref claude/<branch> --branch-tools --prio 1 --thread <your thread id>

It runs the branch's run-gate.mjs on one lane, with no recheck, and never sets the `wodx/gates` status (named gates
only). While it waits, running gates jobs take no more lanes, and it gets the next lane that frees.

Smaller runs (B7441-B7444): a pull request runs tier 1 (the changed modules' own gates, changed gates and nine
cross-module gates; `run-gate.mjs --touched --wide` gives the older list); after a merge of main it reruns only what
main touched and what failed (a touched job with "since"); a gate that passes alone twice is an order fault and does
not hold it; the nightly full run names the merges behind a new failure and skips when main's gate inputs did not
change.

Gate times (B7440): each lane's report ends with an indented line `  TIMES gate6b=12 gate6c=8 ...`, the seconds each
gate took. `node tools/pcq/gate-times.mjs <saved report or comment> [...]` lists them slowest first.

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

Recheck (B4610, B7310): when a gates job fails, each failing gate (up to 12) is rerun ALONE, one gate per run-gate
call on a freshly reset lane, and no verdict rests on one run: a pass alone is run once more, and two passes read
`order fault` (it fails only after other gates; B7441); a pass and a fail alone read `flaky`; two failures alone go to
main the same way, where a pass is confirmed by a second run before it reads `NEW with this change`, and a failure
there reads `fails on main too`. A flaky gate goes to main as well (B7521): a failure there reads `fails on main too`,
two passes there leave it `flaky`. An order fault or a `fails on main too` gate does not turn wodx/gates red. Runs on the branch come first and runs on main after (two deploys at most), and the
recheck stops taking runs after 120 minutes. A "fails on main too" gate is still a fault to fix, not a reason to
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
(B8101: only the New PC's solo world, D:/WoDX/FoundryData-solo; never lane 1, the Live world or a gate lane, since gates make characters and each new character asks for a drawing, B8100) for a request with no answer, runs `tools/sprites/batch.py` from its own clone on that roster
into the same folder at below-normal priority, and writes `status.json` (`drawing`, then `done` or `failed`). One
world at a time, beside the jobs (none starts while `runner-hold` is set); `python` in the runner's config is the interpreter with numpy and Pillow. The game reads
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

## The PC watcher on the laptop (B7290)

`watcher.mjs` runs on the laptop every 5 minutes, at below-normal priority, from the scheduled task "WoDX PC
watcher at logon" (`install-watcher.ps1` sets it up; `run-watcher.ps1` is the loop; a file named `watcher-off` in
`C:\WoDX\pcq` stops it). It only looks and reports. It never starts or kills a process, never restarts OCR or art,
and never touches a lane, a world, a job or another tool's alert. Each cycle it reads every PC's status file on the
`pc-status` branch, the three runner status issues, the open pc-job issues, the merge train line and the open alerts,
plus the laptop's own runner, watchdog and status push. It flags:

- a PC that is silent on both its status push and its runner (off, asleep, rebooting), or only on one of them;
- lanes not answering and a hot graphics card on a PC whose readings are fresh;
- a job running over 6 hours or waiting over 6 hours;
- the same pull request at the front of the merge train for over 3.5 hours (the train itself gives up at 3);
- the laptop's own runner, watchdog or status push not running;
- a pull request green on `checks` and `wodx/merge-rules` for over 15 minutes that nothing will merge: one outside the
  merge train, or the train front (B7421). This one goes on the alert at once, since its age is already measured; green
  pull requests waiting their turn in the train are a note. It reads two commit results a pull request each cycle.

It also lists the alerts that stayed open after the thing they named came back. Renders and OCR come from the `comfy` and
`ocr` fields of a PC's status file (B7296): it flags work queued in ComfyUI with nothing finished for 30 minutes, OCR
workers with no new output for 60 minutes, and an OCR run that gave up. Until a PC sends them, the report says so.

`status-push.mjs` here is the copy every PC runs, from `<home>\gpu-tools`. Main PC: set `PC_COMFY_URL=http://127.0.0.1:8188`.
Secondary PC: set `PC_OCR_MATCH` (default `book_pipeline`), `PC_OCR_OUT` (the OCR output folder) and `PC_OCR_LOG` (its log).
New PC: set `PC_STATUS_NAME=newpc` and `PC_LANES=10`. The watcher reads its status file `newpc.json` and its status
issue "PC runner status (New PC)" the same way it reads the Main PC's and the Secondary's.

The issue "PC watcher report" (label `pc-watch`) is rewritten each cycle. When a problem shows up on two cycles in a
row, one issue "PC watcher alert" (label `pc-alert`) opens. It gets a comment when the list changes and closes when
everything clears. Local copies are in `C:\WoDX\pcq\logs` (`watcher-report.md`, `watcher-<date>.log`,
`watcher-state.json`). The heartbeat workflow checks that the report keeps moving, as it does for each status issue.

## The Secondary PC (B6990)

BENJAMIN-PC runs a third runner from `D:\WoDX\pcq` with `runner.benjamin-pc.json`: lane 8 (port 30080,
`D:\WoDX\FoundryData-lane8`), its own status issue "PC runner status (Secondary PC)" and alerts titled
"Secondary PC alert". It reads the same queue and claims jobs the same way; name `--lane 8` to send a job there.
It has 8 cores and 16 GB, so it can take longer gate lists than lane 7. Book and Trove lookups stay on the main PC.

## The New PC

NEW_PC_LEBRUN (HP OMEN 35L: 12 cores, 64 GB, RTX 5080 16 GB) runs a fourth runner from `D:\WoDX\pcq` with
`runner.new_pc_lebrun.json`: lanes 10 to 13 (ports 30100 to 30130, `D:\WoDX\FoundryData-lane10` to `-lane13`; lanes
11 to 13 since B7760), its own status issue "PC runner status (New PC)" and alerts titled "New PC alert". Name
`--lane 10` (or 11 to 13) to send a job there. A new lane there is set up with a setup-lane job naming it. Its Foundry is the Node build
(`D:\WoDX\Foundry\main.mjs`); its lane was set up from the cloud lane kit's known-good world and add-on modules. It
drives no merge train and runs no stale-PR sweep, and book and Trove lookups stay on the main PC. It also holds the
solo world (`D:\WoDX\FoundryData-solo`, port 30010), which no lane touches. Its gate runners are new-pc-gate-1 and
new-pc-gate-2 (`gh-runner\install.ps1 -Prefix new-pc-gate`).

B7761: a runner with `prGatesDeferMinutes` in its settings (the Secondary PC: 10) leaves a pull request's touched or
every-gate run to the runners with more lanes for that many minutes after the job is queued, then takes it if nobody
has. Jobs named to a lane are never held.

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

## The GPU guard (B7510)
`gpuguard.mjs` lets one GPU job hold the card at a time and starts a job only when its memory fits:
`node tools/pcq/gpuguard.mjs run --class art|ocr|local|other [--need-gb N] [--label x] -- <command>`, and
`gpuguard.mjs state` prints one JSON line (card reading, holder, waiters). Waiters line up by gpu.order in
registry/priorities.json, then by arrival. The lock folder is GPU_GUARD_DIR (on the Secondary PC, D:\WoDX\pcq\gpu-guard).
The PCs also run a copy from D:\WoDX\pcq\gpu-tools, which uses the same order built in; nightly-gates.mjs takes the
repo copy first.

## The merge train (B7202)

Pull requests labelled `merge-train` merge one at a time, oldest label first. Every few minutes the New PC's runner
(`"train": true` in runner.new_pc_lebrun.json since B8010; the other PCs' runners have it off, and the Main PC is the backup) takes the front one: a draft is marked ready, main
is merged in and the release notes stamped in its own worktree (`<home>/train`), the push is made with a lease on the
head it saw, pc-gates.yml gates the new head and that gate job goes ahead of the rest of the queue, and it merges when
`checks` and `wodx/merge-rules` are green. A conflict, a red result or nothing within `trainMaxHours` (3) takes it out
with a comment. The rest of the line is left alone. The status issue shows the line; `node tools/pcq/train.mjs`
prints what it would do now. The hourly sweep no longer merges main into open pull requests (`"sweepUpdates": true`
brings that back). docs/WORKFLOW.md, section 6, is the thread's side. A pull request labelled `urgent` as well goes to
the front of the line (B7420); a fix to the train or runner that the train is stuck without is merged by its cloud
thread instead (B7422).

Batches (B7445): when the front needs main merged in and a stamp anyway, and up to two pull requests behind it are green
on their own heads (checks passed, gates not red, merge rules red for nothing but the gate result still to come) and
change no file the others change, the train builds one batch instead: main, each member's head merged in unchanged,
file reviews carried over, one stamp, pushed to `claude/merge-train-batch` (worktree `<home>/train-batch`) and opened as
a pull request "Merge train batch: #a, #b". That pull request is the train front: it is gated once and merged when
green, and then each member's head is on main, so GitHub marks it merged too. A red batch is closed and the next one
takes half as many, down to the front alone, so the one at fault leaves the train with its own reason. A member that is
pushed to or leaves the line, or an urgent pull request at the front, closes the batch and the train builds a new
one; when main moves the batch is built again on it. `"trainBatch": 1` in runner.json turns batches off.

Stale runs (B7330-B7332): every push to a pull request cancels its gate jobs for older commits (closed if not started, pc-cancel if running), a push from outside the train to a pull request labelled `merge-train` takes it out of the train with a comment, and a runner stopping with runner-off still acts on pc-cancel. To pause a runner, use `runner-hold` (takes no new jobs, keeps status, cancels and the train going) rather than `runner-off`.
