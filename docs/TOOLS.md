# Machines and tools

Every thread reads this file and [ROUTING.md](ROUTING.md) before it starts work (B7004). Threads that don't know
what each PC has end up doing the work themselves, which costs tokens and time. This file lists what each machine
has and how a thread reaches it. ROUTING.md says where each kind of work goes.

A thread never asks for device, folder or screen access itself. It reaches the PCs through the PC job queue
(GitHub issues, below), the local-agent queue, or the PC helper threads, which the coordinator names in each new
thread's first message.

Sources: the PC helper threads' install reports to 17 November 2026. When a tool is missing or behaves differently,
fix this file in the same pull request.

## How a thread reaches each machine

| Way in | What it does | How |
|---|---|---|
| PC job queue | Gates, deploys, lane resets, book and Trove lookups (names and pages only, never text) | `node tools/pcq/submit.mjs ...`, then open the printed issue with label `pc-job` ([tools/pcq/README.md](../tools/pcq/README.md)). Read the result comment, not the logs |
| Local-agent queue | Small mechanical edits by the local models, returned as a draft HOLD pull request | GitHub issue labelled `local-agent`, body from the sizing template (handoff/tasks/SIZING.md on the Main PC) |
| PC helper threads | Anything that needs judgment on a PC: installs, copies, OCR runs, ComfyUI art, fixes to the runners | Ask the coordinator, who passes it on. Installs need the owner's own go-ahead |
| GitHub Actions | The `checks` result on every pull request, plus the heartbeat that watches the PC runner | Runs by itself on push |

## Main PC (DESKTOP-MRKCMRG)

The strongest machine: 12 GB graphics card, the Trove, the testbed lanes.

| Tool | Good for |
|---|---|
| Testbed lanes 2 to 5 (shared), 6 (local agents only) | Gates through the PC job queue. Lane 1 is the owner's and is never used |
| ComfyUI | AI art: faces, face parts, hair, splat looks, pixel objects. Art has first call on the graphics card |
| OpenHands with Devstral (up to 5 steps in 3 files of one module) and Qwen 2.5 Coder 14B (one step in one file) | The local-agent queue, on lane 6 |
| GPU guard | Keeps art and local models from running at once and watches card temperature |
| Foundry CLI (fvtt) | Compendium packs |
| Blender | 3D blocking for sprite and object angles |
| MuseScore 4, FluidSynth with soundfonts, SoX, ffmpeg, audiowaveform | Music engraving, MIDI rendering, audio cleanup and conversion, waveform images |
| Tesseract, OCRmyPDF, Poppler, PyMuPDF, Ghostscript | Text layers and page images from PDFs |
| ImageMagick, Inkscape, oxipng, ExifTool | Image conversion, vector work, PNG shrinking, metadata |
| GDAL (OSGeo4W) | Map and elevation data |
| Tiled | Tile maps |
| Godot 4 | The Godot port study |
| LanguageTool (with Java), Vale | Grammar and style checks on prose |
| Lighthouse | Page speed checks for Live performance work |
| pandoc, SQLite, jq, ripgrep, gh, CMake, Ninja, VS Build Tools | Document conversion, data, search, builds |

## Secondary PC (Benjamin-PC)

Ryzen 7 3800X, 16 GB, RTX 2080 Super (8 GB).

| Tool | Good for |
|---|---|
| OCR pipeline (book_pipeline.py) | OCR of scanned books, output to the private book-text folder (never the repository) |
| Testbed lane 8 (port 30080) | Gates: `--lane 8`, longer lists than lane 7 |
| Ollama, small models only | Mechanical text jobs that fit in 8 GB |
| uv (Python) | Python tools without a system install |
| GitHub Actions runner (self-hosted) | PC-side checks started by a workflow |

## Laptop (DESKTOP-S6NV3Q9)

Weak i5, no graphics card.

| Tool | Good for |
|---|---|
| Testbed lane 7 (port 30070) | Short gate lists: `--lane 7`. It also watches Live and the main runner and opens an alert when either goes quiet |
| uv (Python) | Light Python tools |

## The cloud container (every thread)

Node 22, git, Python 3, Chromium with Playwright, the mock-Foundry harness (`tools/harness`), the book search
tools (`tools/books/books.mjs` over the private book-text folder). No Foundry server, so testbed gates go to the PC
job queue.
