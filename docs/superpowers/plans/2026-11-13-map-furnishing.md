# Map furnishing (purpose, palettes, room value) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Furnish generated buildings by purpose and side purpose, from one era palette per building, filling each room with set pieces until it reaches a Dwarf Fortress style value tier.

**Architecture:** Five new pure-Python modules in `tools/mapgen` (catalogue, palettes, purposes, setpieces, furnishing). `ddcore.dress()` hands over to `furnishing.fill_room()` when a room carries a context; `buildings.Building.furnish(ctx)` sets that context (year, region, wealth, trade, palette, role). Dressing keeps its own random generator and stays out of `room.items`, so sidecars and samples do not move except the new optional `tier` key and the palette's wall/floor textures.

**Tech Stack:** Python 3 (stdlib only), `unittest`; node `--test` harness wrapper.

**Spec:** `docs/superpowers/specs/2026-11-13-map-furnishing-design.md` (full text: https://claude.ai/artifact/9qoqFhUmhhqUEGmfboVtoW)

## Global Constraints

- Era bands are settle.py `AGES`: medieval (to 1449), early 1450, reform 1781, industrial 1851, republic 1919, socialist 1948, modern 1990, future 2030. Use `settle.age_of(year)`.
- Wealth keys: `poor`, `middling`, `rich`, `noble`. Region keys: `WORLD_REGIONS` ids (modules/wodx-chronicle/scripts/world-rules.mjs); first palettes use `moravia` and fall back to it for any region without palettes.
- Tiers, in order: `meagre`, `plain`, `decent`, `fine`, `grand`, `royal`. Asset worth: integer 0-5.
- Never use an asset outside its eras unless tagged `lasting`. Leave a piece out rather than borrow.
- Assets tagged from file paths only; no unpacking of packs.
- Same seed gives the same map. Dressing uses its own `random.Random` from room name and position.
- Module and doc text: British spelling, gender-neutral, no em-dashes, no decision numbers in game text. Keep `CDDA-CREDIT.md`.
- Decision numbers: ask the coordinator for a block before Task 8.
- Streets and alleys stay clear: nothing placed outside a building's walls.

## Review Focus

- A tiny room (under 2 by 2 squares) or a corridor: expect no crash and no pieces in door clear zones. Test in Task 5.
- A palette with no asset for a piece (a 2050 kitchen with no future stove): expect the piece left out, never an older-era asset. Test in Task 2.
- A building type with no purposes entry (Cataclysm layouts, future types): expect fill-kind fallback, no crash. Test in Task 3.
- A year outside 1197-2099 or an unknown region: expect nearest band and the `moravia` fallback. Test in Task 2.
- An open-floor purpose (threshing floor, dance hall, market hall): expect its middle left clear. Test in Task 5.

---

### Task 1: Asset catalogue from file paths

**Files:**
- Create: `tools/mapgen/catalogue.py`
- Create: `tools/mapgen/catalogue_rules.json` (pack id and folder/name patterns to piece, style, eras, worth)
- Test: `tools/mapgen/test_furnishing.py` (class `CatalogueTest`)

**Interfaces:**
- Produces: `tag(path: str) -> dict | None` returning `{"path", "name", "pack", "piece", "style", "bands": [str], "worth": int, "lasting": bool, "cells": (w, h)}`; `build(paths: list[str]) -> list[dict]`; CLI `python3 catalogue.py --assets A,B --out catalogue.json --unclear unclear.tsv`.
- Pieces: `table, seat, bed, chest, cupboard, shelf, hearth, stove, light, rug, display, desk, counter, bath, plant, clutter, wall, floor, door, window`.

- [ ] **Step 1: Write failing tests** `test_fa_bookshelf`: `tag("w4GH4hnv/textures/objects/Decor/Furniture/Shelves/Bookshelves/Bookshelf_Wood_Ashen_A_2x1.webp")` has piece `shelf`, `"medieval" in bands`, `"modern" not in bands`, cells `(2, 1)`. `test_modern_couch`: `tag("bsj2I8JP/textures/objects/ModernFurnature/Colorable/Couch01.png")` has piece `seat`, bands start at `republic`, no `medieval`. `test_unknown_is_none`: an unmatched path returns `None`. `test_barrel_lasting`: an FA barrel path is `lasting`.
- [ ] **Step 2: Run** `cd tools/mapgen && python3 -m unittest test_furnishing.CatalogueTest -v`. Expected: FAIL (no module).
- [ ] **Step 3: Implement** `tag` and `build`: rules file is an ordered list of `{"match": regex on path, "piece", "style", "bands", "worth", "lasting"?}`, first match wins; worth adjusted by name words (Gold, Silver, Marble, Ornate +1 or +2; Broken, Crude, Rough -1), clamped 0-5; cells from `ddcore.cells_of`. Write rules for FA packs and the modern, sci-fi and cyberpunk packs in `dd-assets-new-paths.txt`. Paths no rule matches go to `--unclear`.
- [ ] **Step 4: Run** the tests. Expected: PASS. Then run the CLI on both asset lists into `/mnt/project-files/map-furnishing/catalogue.json`; print counts per band and piece. Every band must have at least one `table`, `seat`, `bed`, `light`, `wall` and `floor`; list any gap.
- [ ] **Step 5: Commit** `git commit -m "Mapgen: tag Dungeondraft assets by piece, era and worth"`.

### Task 2: Palettes

**Files:**
- Create: `tools/mapgen/palettes.py`
- Test: `tools/mapgen/test_furnishing.py` (class `PaletteTest`)

**Interfaces:**
- Consumes: Task 1 `build()` output (or `catalogue.json`).
- Produces: `class Palette` with `.key: (band, region, wealth)`, `.pick(piece: str, rng) -> dict | None` (a catalogue entry), `.worth(asset_name: str) -> int`, `.wall: str`, `.floor: dict[str, str]` (room kind to floor texture), `.door: str`, `.lights: str` (`rushlight|candle|oil|gas|electric`). `choose(year: int, region: str, wealth: str, rng, catalogue) -> Palette`.

- [ ] **Step 1: Write failing tests** `test_one_palette_one_band`: for years 1197, 1650, 1890, 1995, 2050 and every wealth, every `pick` returns only entries whose bands include `age_of(year)` or that are `lasting`. `test_missing_piece_left_out`: a catalogue without a future `stove` gives `pick("stove")` = `None` at 2050, never a medieval one. `test_wealth_fallback`: a `noble` 1197 palette with no noble `bed` returns the `rich` one. `test_unknown_region_and_year`: `choose(1100, "atlantis", "rich", ...)` gives key `("medieval", "moravia", "rich")`; 2150 gives `future`. `test_lights_by_band`: medieval `rushlight` (poor) or `candle`, industrial `gas`, modern `electric`. `test_same_seed_same_palette`.
- [ ] **Step 2: Run** `python3 -m unittest test_furnishing.PaletteTest -v`. Expected: FAIL.
- [ ] **Step 3: Implement**: a palette draws, per piece, a small set (2-4) of assets of one `style` from the catalogue (same band, worth range by wealth: poor 0-1, middling 1-2, rich 2-4, noble 3-5), chosen once from `rng`; walls and floors from catalogue `wall`/`floor` entries of the band. Fallback order: same band other wealth (nearest first), then `None`.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Mapgen: one palette per building by era, region and wealth"`.

### Task 3: Purposes and room roles

**Files:**
- Create: `tools/mapgen/purposes.py`
- Test: `tools/mapgen/test_furnishing.py` (class `PurposeTest`)

**Interfaces:**
- Produces: `PURPOSES: dict[type_key, {"main": str, "side": [{"id", "lifts": [room-name regex], "prefers": [set-piece id], "steps": int}], "open_floor": [room-name regex], "show_off": bool}]`; `purpose_of(type_key: str, fill: str) -> dict`; `room_roles(building) -> dict[room_name, "front"|"work"|"private"|"service"]`.

- [ ] **Step 1: Write failing tests** `test_burgher_palace`: side purposes `show-wealth`, `intimidate`, `impress-clients`; `room_roles` of a placed burgher palace marks its hall and reception room `front`, its counting room `work`, its kitchen `service`, its bedchambers `private`. `test_every_type_has_purpose`: every key in `buildings.TYPES` (after importing eratypes, firstgroup, latertypes, cddatypes) returns a dict from `purpose_of` with a `main`. `test_unknown_falls_back`: `purpose_of("no-such", "workshop")["main"] == "work"` and no side purposes.
- [ ] **Step 2: Run** `python3 -m unittest test_furnishing.PurposeTest -v`. Expected: FAIL.
- [ ] **Step 3: Implement** entries for every type (at least the four in the spec table: burgher palace, church/chapel, tavern/inn, gaol). Roles: name rules first (kitchen/store words to service, study/counting/shop words to work, bed words to private), then ground-floor rooms reached from the street door within two rooms by the openings graph to front.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Mapgen: every building type has a main purpose and side purposes"`.

### Task 4: Set pieces

**Files:**
- Create: `tools/mapgen/setpieces.py`
- Test: `tools/mapgen/test_furnishing.py` (class `SetPieceTest`)

**Interfaces:**
- Produces: `SET_PIECES: list[{"id", "kinds": [room kind], "roles": [role], "trades": [regex] | None, "bands": [band] | None, "place": "wall"|"corner"|"centre", "size": (w, h), "parts": [(piece, dx, dy, rule)]}]`; `fitting(kind, role, trade, band, prefers) -> list[dict]` sorted best first.
- Rules in `parts`: `"base"` (the anchor piece), `"face:base"` (a seat facing the base), `"on:base"` (clutter on top).

- [ ] **Step 1: Write failing tests** `test_writing_corner`: `fitting("study", "work", None, "reform", [])` contains `writing-corner` with parts desk, seat (`face:base`), light and clutter (`on:base`). `test_trade_pieces`: a `cloth merchant` trade brings `cloth-display` first; a `vintner` brings `tasting-table`. `test_era_tied`: `office-desk-computer` fits `modern` and not `reform`. `test_prefers_first`: a preferred id from a side purpose comes first.
- [ ] **Step 2: Run** `python3 -m unittest test_furnishing.SetPieceTest -v`. Expected: FAIL.
- [ ] **Step 3: Implement** at least 40 set pieces across kinds living, kitchen, study, sleep, store, worship, shop, tavern, cell, plus the three spec examples (`writing-corner`, `plate-display`, `long-table`).
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Mapgen: set pieces by room kind, role, trade and era"`.

### Task 5: Tiers and filling a room

**Files:**
- Create: `tools/mapgen/furnishing.py`
- Modify: `tools/mapgen/ddcore.py` (`Room.__init__` adds `self.ctx = None`; `dress()` calls `furnishing.fill_room(room)` when `room.ctx` is set and returns)
- Test: `tools/mapgen/test_furnishing.py` (class `FillTest`)

**Interfaces:**
- Consumes: `Palette.pick/worth/lights` (Task 2), `fitting` (Task 4), `ddcore.Room.candidates`, `ddcore.orient`.
- Produces: `TIERS`; `thresholds(kind: str, band: str) -> list[int]` (6 values, ascending); `tier_of(value: int, kind, band) -> str`; `target_tier(role, wealth, lifts: int, show_off: bool, band, kind) -> str`; `room_value(room, palette) -> int`; `fill_room(room) -> None` (fills `room.dressing`, `room.lights`, sets `room.tier`). `room.ctx = {"palette", "role", "wealth", "trade", "band", "lifts", "show_off", "prefers", "open_floor": bool}`.

- [ ] **Step 1: Write failing tests** `test_target_tiers`: rich front room with two lifts is two steps above rich private; service is one below; `show_off` poor raises front and lowers private. `test_fill_reaches_target`: a 6 by 5 rich front room at 1650 reaches its target tier or is marked full. `test_doors_clear`: no dressing overlaps a door clear zone or walkway in any room of every building type, facing S and E, seeds 1-5. `test_tiny_room`: a 1.4 by 3 corridor gets no pieces and no error. `test_open_floor_kept`: a room with `open_floor` has nothing in its middle rectangle. `test_era_contrast`: the burgher palace at 1197 and 1890 share no furniture asset names except `lasting` ones. `test_lights_follow_era`: 1890 rooms use gas light assets, 1995 electric.
- [ ] **Step 2: Run** `python3 -m unittest test_furnishing.FillTest -v`. Expected: FAIL.
- [ ] **Step 3: Implement** `fill_room`: loop over `fitting(...)`; place each set piece's base through `room.candidates`, its parts relative to the base, skipping any part that overlaps; stop when `tier_of(room_value) >= target` or after 12 tries with no placement, or when placed footprint exceeds 55% of the room's floor (80% in store rooms). Then small things on surfaces and lights by `palette.lights`, richer tiers more lights; then `orient(room)`. Thresholds scale by band: medieval 0.6, early 0.8, reform 1.0, industrial 1.3, republic 1.0, socialist 0.8, modern 0.8, future 0.9.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Mapgen: fill rooms with set pieces up to their value tier"`.

### Task 6: Wire buildings, walls, floors and the sidecar

**Files:**
- Modify: `tools/mapgen/buildings.py` (`Building.furnish(self, ctx=None)` builds the palette and roles, sets `room.ctx` for each room; wall texture and room floors from the palette when `ctx` is given)
- Modify: `tools/mapgen/ddsite.py`, `tools/mapgen/ddtown.py`, `tools/mapgen/organic.py`, `tools/mapgen/floors.py` (pass `ctx = {"year", "region", "wealth", "trade"}`; ddsite gains `--year`, `--wealth`, `--region`)
- Modify: `tools/mapgen/ddcore.py` `feature_entries` (adds optional `"tier"` to each room entry when set)
- Test: `tools/harness/furnishing.test.mjs` (runs `python3 -m unittest test_furnishing` and one site build)

**Interfaces:**
- Consumes: Tasks 2-5.
- Produces: `Building.furnish(ctx: dict | None) -> Building`; ddsite CLI `--year Y --wealth W --region R`. A town building's `ctx` comes from its household (`settle` wealth and trade) when `--settle` is on, else from the type's usual wealth with the seed.

- [ ] **Step 1: Write failing tests** in `furnishing.test.mjs`: `ddsite.py --kind floors --type burgher-palace --year 1890 --wealth rich` writes a map whose objects include no FA `Ashen` furniture and whose sidecar rooms carry `tier`; the same seed twice gives identical files; `--year 1197` uses no `ModernFurnature` asset.
- [ ] **Step 2: Run** `node --test --test-name-pattern furnishing tools/harness/furnishing.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** the wiring. Without `ctx`, behaviour stays as today (old `dress()`), so untouched callers do not change.
- [ ] **Step 4: Run** the new test, then `node --test --test-name-pattern "samples match|farmstead" tools/harness/mapgen.test.mjs` in the background. Expected: PASS; if a sample changes on purpose, regenerate it with the command in the test and say so in the commit.
- [ ] **Step 5: Commit** `git commit -m "Mapgen: buildings furnish from their era palette and purposes"`.

### Task 7: Sample maps, Ben's review desk and the PC check

**Files:**
- Create: `tools/mapgen/review_desk.py` (writes `desk.json`: assets used by palettes, with tags, plus side-by-side preview PNGs)
- Output: `/mnt/project-files/map-furnishing/` (catalogue.json, burgher palace at 1197, 1650, 1890, 1995, 2050, the 16 building-level maps, previews)
- PC job: `/mnt/project-files/pc-job-map-furnishing-2026-11-13.md`

- [ ] **Step 1:** Regenerate the burgher palace at the five years and the 16 building-level maps at their own eras with `ddsite.py`. Draw footprint previews with the scratch `preview.py`. Check by eye: middles filled, front rooms fuller than service rooms, five years clearly different.
- [ ] **Step 2:** Publish the review desk artifact (load artifact-design and artifact-capabilities skills; `db` capability, collection `verdicts`, doc id = asset path, fields `status ok|fix|cut`, `band`, `worth`, `note`). Record its link in memory `mapgen-furnishing`.
- [ ] **Step 3:** Write the PC job: back up `D:\WoDX\maps\building-levels\`, copy the new maps, add any new packs the palettes use to the slim asset folder (list them), open the burgher palace 1890 in Dungeondraft, screenshot. Send through the coordinator.
- [ ] **Step 4:** Apply Ben's desk verdicts to `catalogue_rules.json`, rebuild, re-run Task 2-6 tests.
- [ ] **Step 5: Commit** `git commit -m "Mapgen: furnishing samples and review desk"`.

### Task 8: Docs, PR and merge

**Files:**
- Modify: `docs/BUILD-LOG.md`, `docs/DECISIONS.md` (block from the coordinator), `docs/PENDING-REVIEW.md` (row appended at the end of the Waiting table), Master Plan paragraph, memory `mapgen-furnishing`.

- [ ] **Step 1:** Write the entries (purposes, palettes, set pieces, tiers, sidecar `tier`).
- [ ] **Step 2:** Push and read the GitHub check, which runs the whole harness including the text guard (no gendered pronouns, no prose em-dashes). Expected: green.
- [ ] **Step 3:** Push `claude/project-thread-27v3cz`, open the PR, subscribe to its activity, merge when the GitHub check is green.
