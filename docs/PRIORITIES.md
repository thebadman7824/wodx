# One priority order for every process

Every process that shares the PCs, the testbed lanes, the graphics cards, the memory or the merge train takes its
order from one file, [registry/priorities.json](../registry/priorities.json), through
[tools/pcq/prio.mjs](../tools/pcq/prio.mjs). No tool keeps its own list. The owner picked every rule here on the
Process Priority Desk on 18 November 2026 (B7350-B7359). Change the order by editing the file in a pull request, not
by setting a number in one tool.

    node tools/pcq/prio.mjs check      the file is well formed
    node tools/pcq/prio.mjs threads    the order threads start in

## The ranks

| Rank | Name | What is in it | Gives way to |
|---|---|---|---|
| R0 | Never wait | Lane 1 and the Live world (never touched), the owner's own use of a PC, cancels, holds, status pushes, the watcher, the heartbeat | Nothing |
| R1 | Train front | The gate job of the pull request at the front of the merge train, with its recheck | R0 |
| R2 | Unblock | Lane tests of gate-tool fixes, and gate jobs for a pull request labelled `urgent` | R0, R1 |
| R3 | PR gates | Every other pull request gate job, by the Master Plan order, then age | R0 to R2 |
| R4 | Health runs | Nightly and scheduled full runs of main, skipped when main's gate inputs did not change | R0 to R3 |
| R5 | Side work | Book and Trove lookups, local models (paused): their own slots, no lane | All above |

Beside the ranks, each PC can have one **lead job**: the long job that PC is for right now. It gets a memory budget
the runner never spends on lanes. Today the Secondary PC's lead is the book OCR, until it is finished. The Main PC has
no lead (gates lead), and an art render there runs inside its own memory budget.

## The rules

1. **Giving way.** A higher rank never ends a running job. A lower job hands its lanes over at the next gate, and
   its unfinished gates go back to the queue as the same job, so nothing runs twice.
2. **Aging.** A waiting job gains one step an hour (B6490), but only inside its own rank. A nightly run can never age
   past a pull request's gates.
3. **Memory.** A lead job or a budgeted job holds a claim (`prio.mjs ask --claim`). The runner keeps that much memory
   free of lanes, so the OCR no longer waits for memory the lanes took.
4. **Graphics card.** The GPU guard reads its class order (art, OCR, local models, other) from the file. Gate lanes
   do not take the card lock.
5. **Merge train.** Nobody pushes to a pull request on the train, and the train's own pushes cancel its stale runs
   (B7331, B7332). The 3-hour limit stops counting while the lanes that could run the front job are held, off, or in a
   planned window.
6. **Nightly.** One nightly full run (tools/pcq/nightly-gates.mjs), at R4, skipped when main did not change. The
   older Main PC run from lane-reset.cmd (tools/lanes/nightly.mjs) is retired if the Main PC shows it still runs.
7. **Planned hardware work.** Add a row to `windows.planned` (PC, start, end, reason). From 30 minutes before it, the
   PC takes no new jobs and the train clock stops, so a shutdown cuts nothing. The owner's evenings at the PCs
   (00:30 to 02:00 UTC) change nothing unless the owner asks.
8. **Threads.** At most three at once. The coordinator starts the next one in this order: gate and runner fixes and
   other blockers; dated deadlines; the core (V20 Dark Ages Vampire in Rothenstein, Book 1 first for story); the
   Master Plan order; art and maps; studies, reviews and desks.

## Which tool reads what

| Tool | Reads | Status |
|---|---|---|
| tools/pcq/prio.mjs | the whole file | built (B7350) |
| runner.mjs, submit.mjs, pr-gates.mjs | ranks, aging, claims, the gate-boundary hand-over | to build, gate runner thread |
| train.mjs | train clock | to build, gate runner thread |
| nightly-gates.mjs | R4, skip when unchanged | to build, gate runner thread |
| gpuguard.mjs | gpu order | to build (rebase of pull request 1834) |
| vl-loop.ps1 (Secondary PC), art-batch.ps1 (Main PC) | `prio.mjs ask --class ocr|art --claim` | to wire, PC helper threads |
| watcher.mjs | flags a lower rank running while a higher one waited over 30 minutes | to build |
| The coordinator and new threads | thread order | in use from 18 November |

Until a tool is wired, it keeps its old order. This table says which.
