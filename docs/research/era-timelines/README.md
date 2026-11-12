# Era timelines, 1197 to 2009

Stage one (2026-11-10, run t1): every dated claim in the Encyclopaedia, sorted into the eras, beside the dated events the Chronicle already fires. Review desk: https://claude.ai/artifact/D2vRGaBMzojzT4zz8CdR6t (verdicts in its db collection `verdicts`, doc id `<run>__<item id>`, verdict ok, fix or cut).

Rebuild from the repo root:

    python3 docs/research/era-timelines/extract.py <dir>/rows.json
    node docs/research/era-timelines/data.mjs <dir>     # writes <dir>/desk-data.json

then join head.html, `const ERAS=` + desk-data.json, and tail.html into the page.

Ben approved all cards (2026-11-11). Deconfliction: `python3 docs/research/era-timelines/deconflict.py` applies the rulings and writes timeline-approved-2026-11-11.json, the timeline later stages build on; report DECONFLICT-2026-11-11.md (B861).

Next stages (Ben, 2026-11-10): house-only events for each era on a second desk, then house-only Encyclopaedia entries. The Future Darkness branch's timeline (docs/research/wofd) is already approved.

Stage two (2026-11-12, run h1): house-only events, 72 cards (history the books do not date, and WoDX's own events for Rothenstein and Moravia), each with a line on how it fits the approved timeline. Desk: https://claude.ai/artifact/8iWVsS3gBzQFzeNb67Xojv (collection `verdicts`, doc `2026-11-12h1__<item id>`). Rebuild: `python3 docs/research/era-timelines/house-events-2026-11-12.py`, then join head2.html, `const ERAS=` + desk-data-2026-11-12h1.json, and tail2.html.
