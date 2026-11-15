# The object library (B6330-B6349)

Every object a WoDX pixel map may hold is defined once, in `catalogue.py`, and maps place objects only through it.

| File | What it is |
|---|---|
| `catalogue.py` | Every object: what a player calls it, its true size in feet and where that size comes from, its front and the room the front needs, how it stands against a wall, its years, lands, rooms and trades, its looks by age, and its drawing (from straight above, front to the south). |
| `core.py` | `put()`, `by_wall()`, `door()`, `window()`: placing, turning, drawing and recording objects. |
| `checks.py` | What `Recorder.finish()` runs on a library map: walls, shutters, doorways, facing, against-wall, overlap, bare rooms. |
| `measure.py` | Draws each object alone and measures it against its size. |
| `sheet.py` | The contact sheet: `python3 tools/pixelmap/library/sheet.py OUTDIR`. |
| `view.py` | A finished map as players see it, for close-ups. |
| `test_library.py` | `cd tools/pixelmap && python3 -m unittest library.test_library` (the harness runs it). |

## Placing things

    import library as lib
    rec = Recorder("Farmhouse", (20, 14), seed=77); rec.year = 1200
    rec.wall(4, 3, 16, 3, th=26)                                   # walls first
    lib.door(rec, (4, 10, 16, 10), 7.5, toward=(7, 6), exterior=True)
    lib.window(rec, (4, 3, 16, 3), 8.1, toward=(7, 6))               # glass or not by the year
    lib.by_wall(rec, "oven", (4, 3, 16, 3), 5.05, (7, 6))            # back to the wall, mouth to the room
    t = lib.put(rec, "table", 6.85, 5.85, w=7, d=3)                  # top-left of its footprint, squares; sizes in feet
    lib.put(rec, "jug", t.x + 1, t.y + .1, on=t)                     # on the table
    lib.put(rec, "cask", 9.6, 9.2, face="n", var="water")            # front (where its head leans when opened) to the north

`put()` refuses a size outside the object's true range and an object from another age than `rec.year`. Anything that
opens (chest, cask, crate, sack) becomes an openable with a picture for each state. A map that breaks a check stops
with a list of what is wrong and where.

## Adding an object

Add one `add(...)` row in `catalogue.py` with its size in feet from a real period source in `ref`, its front and
clearance, its wall rule, years and tags, and a drawing that stays inside its footprint (the size test measures it).
Draw it to RULES.md: from straight above, its own colours, nameable by a player at a glance, each state shown.
