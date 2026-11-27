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
| rig | `blender -b -P mocap_rig.py -- <model.glb> <rigged.blend>`: a plain skeleton fitted to the mesh, skinned | 5 s |
| walk and render | `WALK_PALM=1.2 blender -b <rigged.blend> -P mocap_walk.py -- <frames_dir> <walk.bvh>`: a recorded walk, one gait cycle in 8 frames | 5 s |
| frame check | `python check_walk.py <frames_dir> <out.png>`: each side-view frame above the recorded pose it came from | 1 s |
| portrait | `blender -b <rigged.blend> -P portrait.py -- <out.png> 1024` (head only: clothing, neck and shoulders are cut off the model; P_ORTHO=0.32 P_DROP=0.14), then `python img2img.py <render> <prefix> 0.6 <seed> "<prompt>"` for a light FLUX repaint | 10 s |
| game sheet | `python pack.py <frames_dir> <out_dir> <actorId> [68]` writes `<id>.png` (9 by 4 frames of 96 by 112, standing frame last) and `<id>-still.png` | 2 s |

## The walk is a recording (27 Nov)
Hand-made walks on a fitted Rigify rig kept coming out wrong (limp, duck feet, arms through the body), so the walk now
comes from motion capture. The CMU Graphics Lab Motion Capture Database may be copied, modified or redistributed
without permission (its FAQ). The BVH copies come from github.com/una-dinosauria/cmu-mocap; the first walk is
subject 02, take 01 (`data/002/02_01.bvh`, 254 KB), kept in D:\Claude Shares	ools\mocap\cmu on the New PC.
mocap_walk.py turns each bone to point the way the matching joints point in the recording (the figure keeps its own
proportions), keeps the figure's own spine posture and adds the recording's movement around it, and brings each foot
under its own hip. mocap_rig.py gives the feet and shins to one leg each, makes shoes stiff below the ankle, removes
faces that join the two legs below the hem, keeps the forearm and hand all arm, and weights the skirt to the hips.
Other moves (sit, carry, kneel, run) are other CMU takes through the same script.

rig.py and walk.py (the Rigify rig and the hand-made walk) are kept for comparison only.

## What rig.py does beyond a plain auto-rig
- The reference picture holds the arms out at about 40 degrees with a clear gap to the body (flux.py asks for it).
  TRELLIS fuses arms that hang against the body into the torso, and then no weighting lets them swing without
  stretching the torso (Ben, 27 Nov). Held-out arms are skinned cleanly by Blender's automatic weights; walk.py
  lowers them to hang at the sides before it swings them. Hands held out in front sit at hip height, so rig.py
  keeps the forearm and hand all arm, and the skirt step leaves them alone.
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
