# File reviews

One file per branch, `<branch>.jsonl`, written by `node tools/release/review.mjs add`. Each line gives one changed
file a verdict made on the file as it was then (`hash`), and says how it was checked:

    {"file": "tools/pcq/runner.mjs", "verdict": "working", "how": "read in full; ran pcq.test.mjs", "hash": "3f1c0a9d2b7e", "at": "2026-11-17T02:10Z"}

CI's merge rules (tools/release/merge-rules.mjs, docs/WORKFLOW.md section 6) count only the lines a pull request adds,
so a branch name used again starts with no verdicts. The files stay after the merge as the record of what was checked.
