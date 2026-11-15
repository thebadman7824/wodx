# Drawing rules for WoDX pixel maps

Every map piece the drawer makes follows these rules (B5734). They come from two places: Ben's object-by-object
critiques of the sample farmhouse (15 November 2026), and the pixel-art reading that fixed the first fine-grain
drawings. Read them before drawing a new kind of thing, and add each new critique here in the same pull request
as the fix.

## The one test: a player's eyes

Draw every object for the eyes of the player characters. NPCs know what a thing is because they are programmed.
Players must work it out by sight, and they only interact with what they can recognise. An object a player cannot
name never gets clicked, so the action logic and world effects that sit on it are wasted.

For each object, ask: would a player who has never seen our code know what this is, and that they can use it?

- **Reads as something.** A shape is not enough. A stranger looking at the map must be able to name it at once.
- **True size.** Check it against the 5 ft square (a household bake oven is about 7 ft across, not 10).
- **State shows.** Anything that opens or shuts has a picture for each state (closed, open), drawn so the
  difference is plain at a glance: a door leaf across the gap or swung back, shutters barred across the glass or
  folded against the wall, a chest's lid down or tipped back over its folded cloth, a cask's head on or leant beside
  it, a crate's lid on or off, a sack tied on its side or stood up and rolled open. The same goes for lit or out,
  full or empty, whole or broken, as those come.

## True sizes

A square is 5 ft. Check every new object against this table (Ben, 15 November 2026: "the proportions of world objects
must make sense"), and add a row for each new kind of thing.

| Thing | Real size | On the map |
|---|---|---|
| Bed for two (box bed) | 4 1/2 by 7 ft | 0.95 by 1.4 squares |
| Narrow bed or cot | 4 by 6 1/2 ft | 0.8 by 1.35 |
| Table for a household | 9 by 4 1/2 ft | 1.8 by 0.9 |
| Bench | 8 by 1 3/4 ft | 1.6 by 0.34 |
| Chest | 5 by 3 ft | 1.0 by 0.62 |
| Bread oven | about 7 ft | 1.4 |
| Cask | 2 to 2 1/2 ft across | 40 to 48 px |
| Well head | about 4 ft | 80 px |
| Farm cart bed, wheels | 8 by 4 1/2 ft, wheels 5 ft | 1.75 by 0.95, wheels 92 px |
| Haystack (rick) | 10 to 12 ft across | radius 100 to 110 px |
| Tree crown, field tree | 14 to 23 ft across | 2.8 to 4.6 squares |
| Field strip | at least 8 ft wide on the map | 170 px rows |
| Wayside cross base | about 3 ft | 60 px |
| Ridge tent | 12 by 7 ft | 2.4 by 1.4 squares |
| Charcoal kiln (earth mound) | 15 to 20 ft across | radius 150 to 190 px |
| Lean-to | 15 by 9 ft | 3.0 by 1.8 |
| Tree stump | about 2 ft | radius 18 to 20 px |
| Boulder | 3 to 5 ft | 0.6 to 1.0 squares |
| Ladder | 16 in between the rails | 26 px wide |
| Wayside shrine (roofed) | about 4 1/2 ft | 0.9 squares |
| Deer or wolf pelt laid flat | about 4 by 6 ft | 0.8 to 0.9 by 1.1 to 1.2 |
| Open hearth on its slab | about 5 ft | 1.0 to 1.1 squares |
| Boar wallow | 10 to 15 ft across | 3.0 by 2.0 |
| Den boulders | 8 to 12 ft each | 1.6 to 2.4 squares |

## Point of view and colour

- Everything is seen from straight above. Never a side or three-quarter view (no end-on log circles, no front
  faces of furniture). Tall things show their top and their shadow; a leaning thing shows a foreshortened face.
- Every object has its own small set of colours, not floor brown: cloth dyed, clay red-brown, iron blue-grey, glass
  blue, food its real colour. A colourless object reads as a blank shape.
- One light, from the north-west. Shadows are short (no longer than a square) and tight to the base. A wide offset
  shadow makes a thing float.
- Maps are painted in daylight colours. Foundry's clock darkens them; no night is painted in (rule 9).

## Things Ben has ruled on

- **Ovens and hearths** sit wholly inside the building, never through the wall, at their true size.
- **Sacks** are slumped, tied cloth shapes, never round blobs. **Crates** have slats and corner posts and sit on
  the floor.
- **Windows** are broad glass panes with glints in a wooden frame, never square blocks or bars. Shutters open along
  the outside wall; daylight falls on the floor inside.
- **Doors** have jambs, a threshold (stone with a step outside for an outer door, a worn board inside), a plank leaf
  with iron straps and ring handles, and the arc its foot has scraped on the floor.
- **Approved as they are:** fire with the light it throws, board floors, trees built from leaf bundles, grass with
  busy and quiet patches.

## Technique

Sources: Raymond Schlitter's Pixelblog 20 and 43 (top-down tiles) and 44 (top-down trees) at slynyrd.com, and the
Android Arts pixel art tutorial.

Textures
- A few colours are enough. Strong contrast inside one texture reads as noise; keep tones within a floor or wall close.
- A busy texture beside another busy texture is tiring. Give quiet areas: grass in busy and quiet patches, with the
  odd flower.
- Repeat a few key clusters. Clusters may touch corner to corner, not edge to edge, and may cross tile edges to hide seams.
- No lone pixels or single-pixel noise: group detail into islands of clusters.
- Dither sparingly. No dither inside flat boards or blocks.
- Banding: compress the transition, put the band edge where a shadow naturally ends, or break the gradient into clumps.

Colour and light
- Ramps shift hue, not only lighter and darker. Fewer, desaturated colours; keep saturation for points of interest
  (fire, blood, glass).
- Highlights: pick a few sweet spots and prune the rest. Gloss is a few pixels; metal gets a longer ramp.

Outlines and shapes
- No black outline under shapes that touch the ground (it makes them float). Curves step 1, 1, 2, 3 or 2, 1, 2.
  Use lighter or coloured outlines for shiny, glowing or fluffy things.

Materials
- Water: one-pixel wavy lines forming connected blobs, a few highlights, a rough shadow a couple of pixels below.
- Sand: long, slightly irregular S strokes.
- Trees from above: one leaf bundle from one base shape, in medium, darker and lighter versions, stacked by the
  light, with a crescent shadow on the side away from it. Conifers: a stick guide, branches top to bottom in three values.
- Fire: charred logs, embers in broken clusters, flame tongues tallest in the middle in nested colours (dark red,
  red, orange, yellow, near white), no outline, sparks, and warm stepped light thrown on the sill, floor and anything
  near. The thrown light is what makes it read as fire.
- Board floors: three close tones a board, grain as short strokes one tone down along the board, a knot here and
  there, nails at board ends.
- Sizes tuned for a coarse grid go flat at a fine one: redraw each prop for the grain; do not just rescale.
