# Where each kind of work goes

Every thread reads this file and [TOOLS.md](TOOLS.md) before it starts work (B7004). Each kind of work has a
default home. A thread does the work itself only when the home can't take it (for example, the PC is off, or the
job is too big for the local models' sizing rules), and says so in its release note or pull request. The table
follows the token-thrift rule: Opus threads plan, review and do the hard rules work, and the machines do the rest.

| Kind of work | Default home | How |
|---|---|---|
| Mechanical edits: name lists, data entry, renames, simple test fixes, format clean-up | The thread itself, with Sonnet or Haiku for light jobs | The local coding agents are paused (owner's decision, 17 November 2026: under 1% of a week's work landed and the queue cost more thread time than it saved). Do not file `local-agent` issues. Local models stay for narrow jobs they handle well: OCR clean-up, name lists, first-pass picture checks, on request through the PC helper thread |
| Gates of any size | PC runner | `node tools/pcq/submit.mjs gates --touched --ref <branch> --lanes 2 --thread <id>`. The runner posts `wodx/gates` for the merge rules. Lane 7 (the Laptop) takes only small jobs that name their gates (at most 10, plus two-browser gates): touched and every-gate runs go to the Main PC's lanes, so leave out `--lane` for them (B6887) |
| OCR, PDF text layers, file conversions (audio, image, document) | Secondary PC (OCR), Main PC (conversions) | Ask the PC helper thread through the coordinator. Book text stays in the private book-text folder |
| Book and Trove lookups | Cloud book tools first, then the PC job queue | `tools/books/books.mjs find`, then `books-find` or `trove-find` jobs (book and page only) |
| AI art: faces, hair, splat looks, objects | ComfyUI on the Main PC | The art thread. Every result goes on a review desk before it is used |
| Music rendering and audio clean-up | Main PC (FluidSynth, SoX, ffmpeg) | The PC helper thread |
| Rules, design, cross-module work, reviews | An Opus thread | Book rules come from the books (V20 first, then Revised or 2nd edition, never V5) |
| Light helper jobs: file counts, backups, relays | A Sonnet or Haiku helper thread | Through the coordinator |
| Anything while the weekly limit is hit | Cline (paid key) | Only then |

## PC upkeep is frozen (Ben, 17 November 2026)

No new machines, lanes, runners, status pushes or PC tools until the feature registry is seeded and the core (V20
Dark Ages Vampire) is verified; fixes to what exists are fine. One Sonnet PC helper owns upkeep on all three PCs, and
game threads do not edit `tools/pcq/` or `tools/lanes/`. The merge rules warn when a branch does, unless a commit says
`upkeep: <reason>` (B7149).

## Merge rules warning

CI's merge rules print a warning (they never block on it) when a pull request written by a thread changes files
that this table routes to a machine, and no commit on the branch came from a local agent. (Name lists no longer route to a machine while the coding agents are paused, so they raise no warning.) The warning asks the
thread to say why it did the work by hand. Writing `routed-by-hand: <reason>` in a commit message or a release note
answers it. The patterns the warning reads:

```json routes
[
  {"kind": "AI art and images", "home": "ComfyUI on the Main PC (the art thread)", "paths": ["modules/**/*.webp", "modules/**/*.jpg"]},
  {"kind": "audio files", "home": "the Main PC's audio tools (the PC helper thread)", "paths": ["modules/**/*.ogg", "modules/**/*.mp3", "modules/**/*.wav"]}
]
```
