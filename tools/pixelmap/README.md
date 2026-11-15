# The pixel map drawer

WoDX's own maps, drawn by code in our own pixel art (B5730-B5735). No pack pictures, so everything it makes can ship
in this public repository and, later, be drawn inside Foundry.

- **Grain:** 94 art pixels to a 5 ft square, one screen pixel each: the grain of the character sprites.
- **Palette:** the World of Darkness palette (cold stone, bone, oxblood, tarnish, near-black outlines), lit from the
  north-west, painted in daylight colours for Foundry's clock to darken.
- **Rules:** [RULES.md](RULES.md). Every object must be recognisable by a player at a glance, and anything that opens
  or shuts has a picture for each state.

## Files

| File | What it is |
|---|---|
| `px.py` | The toolkit: colour ramps, ground, floors, walls, trees, fire and light, the oven. |
| `props.py` | Furniture and goods, each drawn to be named at a glance. Doors, windows, chests, casks, crates and sacks are *openables*. |
| `scene.py` | The recorder: notes walls, openables, lights and regions while a map is drawn, then writes everything Foundry needs. |
| `bits.py` | Distance fields and smooth lines for paths and streams. |
| `buildings.py` | Whole buildings laid out the same way each time: the log cottage and the timber chapel (B5737). |
| `land.py` | Open ground: grass, roads, brooks, ploughed strips, a plank bridge, scattered trees. |
| `maps/farmhouse.py` | The first map: a three-room timber farmhouse and its yard, 20 by 14 squares. |
| `maps/village.py`, `maps/road.py` | Sample maps: a village of about 1200 (40 by 28) and a country road (36 by 20). They write to `out/` unless given a folder. |

## Making a map

    python3 tools/pixelmap/maps/farmhouse.py [OUTDIR]

With no folder given it rewrites the gate's fixture, `tools/gate/fixtures/pixel-farmhouse/`. It needs Python 3 with
numpy and Pillow, and takes about 7 seconds. The folder gets:

| File | Read by |
|---|---|
| `<name>.png` | The scene's background: the map with every openable left out. |
| `art/<id>-closed.png`, `art/<id>-open.png` | One picture per state for each openable, all the same size, transparent round the thing. |
| `<name>.dd2vtt` | `tools/gate/mapimport.mjs`: the scene size, the walls (cut where doors and windows are) and a door wall at each opening. |
| `<name>.wodx.json` | WoDX Interactables' "Adopt a generated map": doors and shutters, containers, the oven's light, the house as a home, and `key`, every named object and its square. |

## In Foundry

Put the folder under `Data/wodx-maps/<map>/<stamp>/` and the map watcher's import (`mapimport.mjs`) makes the scene.
Adopting the sidecar then lays a picture tile over every openable (Interactables, B5733):

- A door's or window's tile follows its door wall. Open the door and every player sees the leaf swing back; shut the
  shutters and they are seen barred across the glass.
- A chest's, cask's, crate's or sack's tile is the container itself. Opening it to search shows it open.

The gate `gatepixelmap` checks all of this on a testbed lane with the fixture.

## Adding a map

Write `maps/<name>.py` like the farmhouse: make a `Recorder`, draw on `rec.m`, use `rec.wall` for walls (so they become
Foundry walls), give each openable a `name=` a player would use, `rec.note` each other object, `rec.light` for fires,
`rec.region` for places, then `rec.finish(outdir)`.
