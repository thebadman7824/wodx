# Drawing the library's objects: the shared guide

Every object a WoDX map may hold is listed in `census.py`. Each one is drawn by a family module,
`fam_<family>.py`, in every era it spans, in at least ten variations an era. This guide is the one standard every
family module keeps to. Read `../RULES.md` first: its rules (a player's eyes, true size, state shows, seen from straight
above, light from the north-west, short tight shadows, its own colours, no lone pixels) all hold here.

## The test: a player names it at a glance

A player who has never seen our code looks at the map at true size, 94 px to the 5 ft square, and names the thing at
once: "a cradle", "a Torah ark", "a jukebox". If it would take a second look, add the detail that names it: the
rockers, the curtain and doors, the record window and chrome. Shape first, then the one or two details that only that
thing has, then its colours. The silhouette must name it even in grey.

## The contract

A family module defines its objects with `library.core.define`:

```python
from library.core import define
from library import art

def cradle(tm, x, y, w, h, st, v):
    """... one line per era saying what it looks like ..."""
    era, wealth, style, cond = v["era"], v.get("wealth", 2), v.get("style", "central"), v.get("condition", "new")
    ...

define("cradle", draw=cradle, front=True, clear=1, axes={"material": [...], "colour": [...]})
```

- `draw(tm, x, y, w, h, st, v)`: the footprint is `x, y, w, h` in squares (`art.box_px` gives pixels), the front
  toward the south (y + h). Stay inside the footprint: shadows may fall 4 or 5 px south-east of it, nothing else.
- `st` is the state: "one", or each of `states` ("closed", "open"; "lit", "out"; "full", "empty"). Draw every state
  for every variation.
- `v` carries the variation, always with:
  - `era`: one of the census eras (dark-ages, long-night, renaissance, age-of-reason, victorian, great-war,
    mid-century, modern, future-darkness).
  - `wealth`: 0 destitute to 5 princely.
  - `style`: one of the 13 census style families.
  - `condition`: new, worn or broken.
  - Your own axes (`material`, `colour`, `contents`, or any other you declare in `axes`).
- `define` takes the size from the census when the object is new (its usual size, 15 percent either way). Give
  `ft=((min, max), (min, max))` with a sourced `ref="..."` when you know better. Set `front`, `clear` and `back`
  (the feet a lid or a door needs behind it), `states`, `openable` (the WoDX container kind) and `light`, as
  `catalogue.py` does.
- An object already in the catalogue keeps every field you do not give: pass `draw=` and `axes=` to take it over.

## What each axis changes

**Era.** Use the form, materials and making of the age, true to the period and the place. Ask how people of that
time made this thing:
- Dark Ages and Long Night: split and adzed boards, pegs, iron straps, rush and straw.
- Renaissance and Age of Reason: joinery, turned legs, carving, pewter and brass.
- Victorian: machine-cut pine and mahogany, cast iron, gas and paraffin.
- Great War and Mid-Century: veneer, enamel, bakelite, chrome, early electric.
- Modern: chipboard, plastic, steel, screens.
- Future Darkness: dark composites, sealed surfaces, soft lit edges, a little decay and grime (it is the World of
  Darkness).

Long Night differs from Dark Ages: plague years, more wear, heavier locks and shutters, the first painted chests.

**Wealth.**
- 0 and 1: rough, patched, scavenged, a few uneven pieces. No dye but brown, grey and undyed wool; mended with
  rope or rag.
- 2 and 3: sound and plain. One dye, honest joinery, a little iron or brass.
- 4 and 5: carved, inlaid, gilded or lacquered. Strong dyes (crimson, deep blue, green), fine cloth, fringes,
  brass and silver, and more of everything (more cushions, more books, more candles).

A player tells a pauper's table from a prince's at a glance.

**Style.** Each region family has its own shapes, patterns and colours. Draw what that people would own. Some cues:
- Central Europe: painted flowers on pine, carved oak, tiled stoves.
- Atlantic Europe: plain oak and later mahogany, chintz.
- Northern: painted rosemaling, red and blue, log and birch.
- Mediterranean: terracotta, glazed tile, wrought iron, walnut, whitewash.
- Islamic world: low seating, geometric inlay and tile, brass, carpets and kilim patterns, carved screens.
- Steppe and high Asia: felt, painted orange and red wood, chests with bone inlay, prayer flags.
- South Asia: carved teak and rosewood, block-printed cotton, brass lotas, charpoy string beds.
- East Asia: lacquer red and black, rounded joinery, paper and bamboo, blue-and-white porcelain.
- Southeast Asia and the islands: rattan, bamboo, teak, woven mats, batik.
- Africa south of the Sahara: carved stools and headrests, kente, mud-cloth and kuba patterns, woven baskets,
  calabashes.
- The Americas, before settlers' goods: woven reed, adobe, stone, feather and beadwork. After them, the settlers'
  styles take over (`variants.style_of`).
- Oceania: tapa cloth patterns, carved wood, woven pandanus.
- The far north: hide, bone, driftwood, soapstone lamps.

Where an object is not found in a style (the census's `styles`), it is not drawn in it.

**Never make up a regional look.** Paint a people's pattern, colour or ornament only onto things that people really
decorated that way (a chest, a rug, a lamp, a stool). Machines and mass-made goods (a server rack, a photocopier, a
vending machine, a fuse box, a petrol pump of the 1990s) look the same the world over: give them `global_from=` the
year from which that is true, and the gate then wants no regional difference. Their ten looks come from what really
varies: the makes and models of the day and their liveries (beige, grey, black, a maker's red), size and fit-out,
what they hold or show, cables and clutter round them, and wear. A rainbow on a server rack fails review even if the
gate passes. Where a region does change such a thing, change it in an honest way (signage shape, plug and socket,
which side the controls are on), never with a people's ornament.

**Condition.**
- worn: faded paint, scuffs, a patch, a chipped corner, a stain.
- broken: a split board, a missing leg or tilt, a crack, a hole, spilt contents.

A broken thing is still nameable.

**Your own axes.** Choose them so the variations differ in ways that matter to a player. For a chest: its contents
when open, and its wood. For a lamp: brass or tin, lit or out. For a cart: its load. Give each axis enough values that
the era's ten variations do not repeat.

## Technique

- Grain: 94 px to a square, 18.8 px to a foot. Small goods are 10 to 20 px across, so draw them with a few strong
  clusters: a cup is a ring and a handle nub, not a blob.
- Palettes: use `art.ramp(base)` for a material (five tones, the darks cool and the lights warm), and the helpers in
  `art.py`: `slab`, `cloth`, `pillow`, `knob`, `rivet` and `shadow`. Add new shared helpers to `art.py` only if
  another family will use them. Otherwise keep them in your module.
- Light comes from the north-west. Use a lit top edge and a dark south and east edge, and a shadow 3 to 5 px
  south-east (`art.shadow`).
- Outline with `px.OUT` as the rest of the library does. Glowing and glass things get coloured outlines.
- Use no lone pixels and no noise. Repeat a few clusters instead.
- Fire: use `tm.fire(cx, cy, w, h, seed)` and add the glow to `tm.hearths` (see `kitchen.fireplace`).
- Things that open: draw the open state with the lid, door or flap moved and the inside showing what it holds.

## The gate

Each family must pass these, with no exceptions and no baseline:

```
python3 tools/pixelmap/library/vcheck.py <family> [--sheet OUTDIR]
cd tools/pixelmap && python3 -m unittest library.test_library
python3 tools/pixelmap/maps/farmhouse.py /tmp/fh
```

`vcheck` fails an object in an era when:
- fewer than ten of its variations look different;
- more than half of its variations look the same as the same variation one era earlier (each era needs its own look: the
  making, materials and wear of its time, even where the form barely changed). A colour cast or tint laid over the
  whole drawing does not count: the check also compares the light-and-dark pattern with colour taken out, so the
  era must change in shape, parts, fittings or detail;
- a third of its pairs from different regions look alike;
- a drawing spills past its footprint or is far smaller than it.

Look at every sheet `--sheet` writes (open the PNGs) before calling an object done. Passing the numbers is not
enough: it must read as the thing.

## House rules for the text

Docstrings and comments are plain English: no em-dashes in prose, no gendered pronouns, and never the owner's name.
Sizes come from real period sources: say which in `ref=`. No book text.
