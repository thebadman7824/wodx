# Map furnishing: purpose, palettes and room value (design)

Approved by Ben 2026-11-13 00:44Z. Full text: Claude Doc "Map generator: purpose, palettes and room value",
https://claude.ai/artifact/9qoqFhUmhhqUEGmfboVtoW. This file is the repo copy of its decisions.

## Why

Every building is furnished for what it is for and for the other chances it gives its owner (Ben: a burgher's
palace also shows wealth, intimidates rivals and impresses clients). Today `dress()` adds at most 10 wall and corner
pieces from about 20 assets, one Forgotten Adventures "Ashen" set serves 1197 to about 1900, and four wall textures
serve every era. Ben chose to combine Cataclysm DDA (palettes, set pieces, loot by purpose) with Dwarf Fortress
(room value in named tiers).

## Goals

- Every room looks used for its purpose; no bare middle unless the purpose wants open floor.
- One building, one look: walls, floors, doors and furniture from one palette by era band, region and wealth.
- Front rooms meant to impress look it; back rooms look plain.
- The same type looks clearly different in 1197, 1650, 1890, 1995 and 2050.
- Palettes per era and per world region (Moravia first; keys from `WORLD_REGIONS`).

## Non-goals and anti-goals

- No change to room layouts or outlines. The sidecar keeps its meaning (rooms, openings, households).
- No clutter without a reason, no blocked doors or walking lines, no rich houses all alike, no pieces from the
  wrong era.

## Design

1. Purposes: each building type has a main purpose and side purposes; each side purpose lifts named rooms and
   prefers set pieces.
2. Room roles: front, work, private, service, from the room's name and its distance from the street door.
3. Palette: one per building, keyed (era band, region, wealth poor/middling/rich/noble). Era bands are settle.py
   AGES. Each asset has a worth 0-5 (the goods scale). Missing piece: same era other wealth, then leave out; never
   another era unless the asset is marked lasting.
4. Target tier: meagre, plain, decent, fine, grand, royal; thresholds per room kind, scaled by era band. Start
   from owner wealth; front rooms +1 per lifting side purpose; service -1; "poor trying to look rich" raises front,
   lowers private.
5. Fill: add best-fitting set pieces (general pieces turned into assets by the palette, turned by `orient()`)
   until the room's value reaches the target, keeping door-to-door lines clear and a share of floor open.
6. Small things and lights by purpose and era (rushlight/candle, oil, gas, electric); richer rooms more lights.

Proposal Ben may correct: eras also change walls/floors/doors/windows, which rooms exist, and how crowded rooms
are (thresholds scaled by era band).

## Calls made

Six tiers; worth on the goods 0-5 scale; era bands = settle.py AGES; optional sidecar `tier` per room; first pass
on the 16 building-level maps and the burgher palace at 1197, 1650, 1890, 1995, 2050; a map without a settlement
draws wealth and trade from the type's usual range; the review desk shows only assets the palettes use; a set piece
holding a chest, cupboard or barrel is a sidecar container; packs join the slim folder one palette at a time, each
checked by loading a map on the PC. Assets are tagged from file names only until Ben allows previews.
