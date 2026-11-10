# Era timelines, 1197 to 2009

Stage one (2026-11-10, run t1): every dated claim in the Encyclopaedia, sorted into the eras, beside the dated events the Chronicle already fires. Review desk: https://claude.ai/artifact/D2vRGaBMzojzT4zz8CdR6t (verdicts in its db collection `verdicts`, doc id `<run>__<item id>`, verdict ok, fix or cut).

Rebuild from the repo root:

    python3 docs/research/era-timelines/extract.py <dir>/rows.json
    node docs/research/era-timelines/data.mjs <dir>     # writes <dir>/desk-data.json

then join head.html, `const ERAS=` + desk-data.json, and tail.html into the page.

Next stages (Ben, 2026-11-10): house-only events for each era on a second desk, then house-only Encyclopaedia entries. The Future Darkness branch's timeline (docs/research/wofd) is already approved.
