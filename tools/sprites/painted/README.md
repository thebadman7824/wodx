# Painted sprites (trial pipeline, 26 Nov 2026)

A figure is drawn once as a picture, turned into a 3D model, rigged, walked, and rendered from above into the
game's sprite sheet. Ben liked the painted look of the first trial better than the LPC sprites, so this keeps
that look and does not push it toward pixel art. Nothing here runs inside the game; the game reads the sheet
through the usual own-sprite manifest (modules/wodx-rules/paperdoll/sprite-rules.mjs).

Every era goes through the same steps. Only the figure spec changes (figures/<id>.json: era, role, dress, and the
questions the local vision model answers about each draft). Name the footwear, headwear and anything that must
not be there, because FLUX falls back on modern boots and caps.

## Steps (New PC, RTX 5080)
| step | command | time |
|---|---|---|
| reference drafts | `python flux.py figures/<id>.json <seed> ...` (ComfyUI started through the GPU guard, FLUX schnell) | 4 s each |
| era check | `python vcheck.py figures/<id>.json <draft.png> ...` (Ollama qwen2.5vl:7b), then look at the passes | 10 s each |
| footwear fix | `python fixfeet.py <draft.png> <fixed.png>`: repaints light rubber-look soles and heels in the shoe's own leather | 1 s |
| cut-out and 3D | `cutout_birefnet.py`, then `run_trellis2.py <cutout> <dir> <name> 1024` (TRELLIS.2, D:\Claude Shares\tools) | 5 min cold, 45 s warm |
| rig | `blender -b -P rig.py -- <model.glb> <rigged.blend>` | 10 s |
| walk and render | `blender -b <rigged.blend> -P walk.py -- <frames_dir>` | 5 s |
| game sheet | `python pack.py <frames_dir> <out_dir> <actorId> [68]` writes `<id>.png` (9 by 4 frames of 96 by 112, standing frame last) and `<id>-still.png` | 2 s |

## What rig.py does beyond a plain auto-rig
- Fits the Rigify metarig to the mesh. The stock metarig holds its arms out at 45 degrees; a figure standing with
  its arms down then gets torso weights on its arms, and the arms barely swing.
- Keeps arm weights only within 6 cm of the fitted arm line, so a swinging arm does not drag the coat with it.
- Skirts (tunic, gown, coat): the hem follows the hips, with up to 55% of each thigh blended across front and back,
  so the cloth swings with the legs instead of stretching into a hole. A figure in hose or trousers has no cloth
  across the crotch line, so the step finds no hem and skips.
- Footwear below the ankle gets a muted copy of the material (TRELLIS invents a light sole on the unseen sides).
  FOOT_MUTE=0 turns it off for eras where a bright sole is right.
- Backfaces (the inside of a hem or sleeve) are shaded dark.

walk.py turns every limb about the world X axis, whatever roll Rigify gave the FK controls.

## Known limits
- A whole baked figure, not LPC layers: a change of dress is a new figure (about 1.5 minutes warm).
- The own-sprite batch (tools/sprites/batch.py) rebuilds manifest.json from the roster, so a batch run redraws
  a painted figure as an LPC one until the batch learns to keep painted entries.
- The hand on the back swing can show as a pale stripe in the side views at game size.
