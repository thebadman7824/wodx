# Era timelines, 1197 to 2009

Stage one (2026-11-10, run t1): every dated claim in the Encyclopaedia, sorted into the eras, beside the dated events the Chronicle already fires. Review desk: https://claude.ai/artifact/D2vRGaBMzojzT4zz8CdR6t (verdicts in its db collection `verdicts`, doc id `<run>__<item id>`, verdict ok, fix or cut).

Rebuild from the repo root:

    python3 docs/research/era-timelines/extract.py <dir>/rows.json
    node docs/research/era-timelines/data.mjs <dir>     # writes <dir>/desk-data.json

then join head.html, `const ERAS=` + desk-data.json, and tail.html into the page.

Ben approved all cards (2026-11-11). Deconfliction: `python3 docs/research/era-timelines/deconflict.py` applies the rulings and writes timeline-approved-2026-11-11.json, the timeline later stages build on; report DECONFLICT-2026-11-11.md (B861).

Next stages (Ben, 2026-11-10): house-only events for each era on a second desk, then house-only Encyclopaedia entries. The Future Darkness branch's timeline (docs/research/wofd) is already approved.

Stage two (2026-11-12, run h1): house-only events, 72 cards (history the books do not date, and WoDX's own events for Rothenstein and Moravia), each with a line on how it fits the approved timeline. Desk: https://claude.ai/artifact/8iWVsS3gBzQFzeNb67Xojv (collection `verdicts`, doc `2026-11-12h1__<item id>`). Rebuild: `python3 docs/research/era-timelines/house-events-2026-11-12.py`, then join head2.html, `const ERAS=` + desk-data-2026-11-12h1.json, and tail2.html.

Ben approved all 72 round-one cards (2026-11-12 02:05Z) and asked for events beyond Moravia (the rest of Europe, the Middle East, Asia) and for the books' named characters to be placed in them. Round two, run h2, on the same desk: 107 cards in house_events_wider.py (kind 'named' takes the character and what happened from the book and gives a year). The script now writes desk-data-2026-11-12h2.json with both rounds; the desk reviews round two and shows round one beside it. Cards from 1990 on are for the classic timeline only.

## Round 3 (2026-11-12): at least 300 events per era

Ben, 02:23Z: at least 300 events per era, from real history, tied to World of Darkness canon where possible, for use by other WoDX systems.

- Source files: `r3/<era>.txt`, one event per line (`year[-month]|kind|lines|region|place|tags|title|text`). `r3/build.py` checks them (era span, kinds, lines, regions, tag list, em-dashes, duplicates) and writes `r3/events-2026-11-12r3.json` with Encyclopaedia links matched by place.
- Counts: Dark Ages 346, Long Night 306, Renaissance 326, Age of Reason 338, Victorian 324, Great War 303, Mid-century 305, Modern 303 (2,551 in all). Events from 1990 carry `branch: classic`.
- Kinds: history (real history), tied (real history with a house reading for one or more lines, said so in the text), named (a book character placed in a real year).
- Written from general historical knowledge; Wikipedia is blocked from the cloud. Dates are as commonly given; doubtful ones should be checked against a source before they reach the Encyclopaedia.
- Texts keep gendered pronouns only for historical people whose gender is known; house readings are written neutrally.
- Desk: `r3/desk.py` builds `desk-data-2026-11-12h3.json` (r3 plus the unreviewed round 2 cards, minus 62 round 2 history cards that repeat an r3 event) and the page from `head3.html` + `tail3.html`. Review run `2026-11-12h3` on https://claude.ai/artifact/8iWVsS3gBzQFzeNb67Xojv, with region, kind, tag, line and text filters and an "OK everything shown" button.
- Future Darkness (added the same night): `r3/future-darkness.txt`, 308 events for 1990 to 2099, `branch: future`. Kind F (branch history) is the future branch's own mundane history around the approved timeline in `modules/wodx-chronicle/data/future-events.mjs`; W cards give a line's view and say when they follow that timeline. Regions: Europe 137, Asia 70, Middle East 51, Moravia 50. The desk's ninth tab shows them, and Show approved events puts the approved Future Darkness events beside them (build with `WOFD_EVENTS=<json dump of the non-cascade events> python3 r3/desk.py <page>`).

## Approval and daily deconfliction (2026-11-12)

Ben (03:13Z) approved all timeline events; `timeline-approved-2026-11-12.json` holds the 3,265 approved cards (the Future Darkness metaplot stays in `future-events.mjs`). Standing rule from then: a deconfliction check runs every day at 02:00 UTC.

- `python3 daily_check.py` checks every approved set: the r3 build, branch marks, twins (one event under two years), and a dated death followed by the person acting later. It writes `daily/<date>.md` with only the findings not already ruled in `daily/accepted.json`.
- The check is a net, not the judge: whoever runs it also reads the events changed since the last run against their neighbours, fixes real clashes in the source files (book canon over house readings; between books the newer edition wins, B861), rebuilds with `r3/build.py` and `r3/desk.py`, and records harmless findings with `python3 daily_check.py --accept`.

## Prologues: Living Gods and Classical (2026-11-12)

Ben (21:08Z) approved the plan in the research doc https://claude.ai/artifact/3y1d1ePSskhzEhR4JdUYet. `r3/living-gods.txt` (317 events, 10,000 to 801 BCE) and `r3/classical.txt` (347 events, 800 BCE to 1196 CE) follow the same line format. BCE years are negative with no year 0; a month follows a second dash (`-44-3`). Kind M (myth) is for the prologues only: a legend whose year is a house reading. Regions add AF Africa and AM Americas. Canon was checked against the books on the PC (`/mnt/project-files/prologue-timeline/book-check.md`, pdf pages); cards cite the page in brackets. Part 2 of the check (`book-check-2.md`) OCRed the Book of Nod, Revelations of the Dark Mother, W20 Book of the Wyrm, Mage: The Dark Ages and Order of Hermes Revised, and added 15 events (324 and 355 now). Dark Ages: Wraith is not in the collection. The desk shows both as the first two tabs, run `2026-11-12h3`. Next, after review: years for the 47 undated prologue Encyclopaedia entries, then the follow-ups in the research doc (money before 900, ancient generators, goods).

Seven eras (2026-11-12, Ben): the two files now split into seven Chronicle eras by year (build.py PERIODS, ids as in wodx-chronicle data/eras.json): Before the Flood, The Age of Living Gods, The Age of Cold Iron, The Classical Age, The Age of Silk and Eagles, The Age of Fallen Thrones and The Age of Gathering Darkness. Every desk tab takes its era name from eras.json. The prologue covers the whole world: 70 events from China, Japan, India, south-east Asia, the Pacific, Africa and the Americas were added (341 and 424 now).
