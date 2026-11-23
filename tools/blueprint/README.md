# Map blueprints

Every WoDX map is planned as a blueprint first: a plan drawing of its layout at true size, with an empty slot for
each piece of furniture. The approved object pictures go into the slots later. A blueprint never waits on art, and
art never waits on a layout.

## What a blueprint holds

One JSON file per map in `plans/<chronicle>/<id>.json`, format `wodx-blueprint`, version 1:

| Key | What it is |
|---|---|
| `cells` | Size in squares. A square is 5 ft (`square_ft`). Object pictures are 128 px a square (`art_grid_px`). |
| `layers` | `material`, plus `penumbra` and `shadowlands` where the map has Umbra twins. Twins share this layout. |
| `walls` | `c` = x0, y0, x1, y1 in squares; `kind` solid, window, fence (blocks movement, not sight) or hedge. |
| `doors` | `c` as walls; `kind` door, gate or secret; `locked`. |
| `buildings` | Roofed buildings: `rect` (x, y, w, h, eaves included), `label`, `use` (home, inn, mill, smithy...). |
| `rooms` | Named rooms, yards and spots: `rect`, `label`, `use`. |
| `slots` | One per object: `obj` (a key of `catalogue.json`), `rect` at its true size, `facing` (the side its front faces: N, E, S, W), `art` (keep, pending, todo), `auto` (true when placed by a rule, for a person to check). |
| `lights` | Foundry lights: `x`, `y`, `kind` (fire, lamp, eerie), `bright` and `dim` radius in squares. |
| `ground` | Roads, tracks, paths, brooks, rivers and fields: `kind`, `path` (points in squares), `width` in squares, or `closed` for an area. Seeded from a `tools/pixelmap` drawer's `land.ground()` call. |
| `exits` | Where the map joins another: `rect`, `to` (the other map's id). |
| `eras` | One row per era stage (profile ids from `modules/wodx-chronicle/data/eras.json`, dark-ages to future-darkness), each `drawn` or `to plan`. |
| `open` | Things a person still has to decide or check. |

`catalogue.json` lists every object a slot may hold, with its real size in feet and whether an approved picture
exists. Sizes follow `tools/pixelmap/RULES.md`. When a picture is approved on the objects desk, change its `art` to
`keep` and name the keep; every blueprint that uses it shows it green from then on.

`inventory.json` lists every map WoDX needs, by tier: 1 the first nights of Book 1, 2 the rest of Book 1, 3 the
buildings players walk into, 4 places Book 1 names that have no map yet, 5 old scenes the open-world maps replaced,
6 the wider world and pattern maps, held until the first slice passes.

## Commands

    python3 blueprint.py seed-scene SCENE.json PLAN.json --id ID --tier N
    python3 blueprint.py seed-pixelmap MAPDIR PLAN.json --id ID --tier N --scene SCENE.json
    python3 blueprint.py seed-pixelmap TOWN.wodx.json PLAN.json --id ID --tier N     (a tools/mapgen sidecar)
    python3 blueprint.py render PLAN.json OUT.png
    python3 blueprint.py check PLAN.json ...
    python3 seed_all.py SCENES_DIR PIXELMAP_DIR OUT_PNG_DIR --tiers 1,2,3

Seeding reads walls, doors, lights, notes, roof tiles and exits from a Foundry scene export, or everything a
`tools/pixelmap` drawer recorded (walls, openings, containers, named objects), or a `tools/mapgen` sidecar. Named spots
whose name means an object (a region called "The ovens") get slots for it; each roofed building gets a starting kit
for its use, laid along its inner walls with every doorway kept clear. Kit slots are marked `auto`.

A plan edited by hand sets `"seeded": false`, and `seed_all.py` never overwrites it again.

`check` fails when a slot is not its true size, lies off the map, or blocks a doorway, when a walled map has no
lights, or when no era stage is drawn.

## How the three map tools fit

- `tools/blueprint` (this folder): the plan of every hand-made chronicle map, Rothenstein first.
- `tools/pixelmap`: draws a chronicle map in pixel art; once object art is approved it draws each slot's picture.
- `tools/mapgen`: generates villages, towns, cities, castles, mines and warrens for any year from 1197 to the
  future (`eras.py` changes a town age by age). Its sidecars seed blueprints too, so pattern maps for the wider
  world come from it rather than by hand.

Needs Python 3 and Pillow only.
