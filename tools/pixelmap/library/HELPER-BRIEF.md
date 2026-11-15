# Brief for each family helper

You are drawing a part of the WoDX object library: top-down pixel-art map objects for a World of Darkness tabletop
game in Foundry VTT, from 1197 to the far future, anywhere on earth. The owner's standard is "incredibly thorough;
every object in every era detailed enough that a player knows what it is at a glance".

Read these first:
1. `tools/pixelmap/library/DRAWING.md`: the contract, what each axis changes, technique and the gate. Follow it.
2. `tools/pixelmap/RULES.md`: the drawing rules from the owner's critiques.
3. `/tmp/claude/memory/team/silo/pixel-art-rules.md` and `/tmp/claude/memory/team/silo/map-drawing-critiques.md`,
   if they exist.
4. `tools/pixelmap/library/census.py`: your rows (years, rooms, wealth, styles, interactable tag, usual size).
5. `tools/pixelmap/library/core.py` (define, render), `art.py` (helpers and palettes), `variants.py` (how
   variations are made).
6. `house.py` and `kitchen.py` for worked examples with a look for each age. They do not yet honour wealth, style or
   condition: yours must.

What to do, for every census row in your families:
- Write its drawing in your own module `tools/pixelmap/library/fam_<name>.py`. Create the module, and only that file
  (plus a second module if you were given two families). Define each object with `define(id, draw=..., axes=...,
  ...)`. Objects already in `catalogue.py` are taken over by passing `draw=` and `axes=`.
- Draw every era the object spans. Within each era, make wealth, regional style and condition, plus your own axes,
  change it visibly, so that `vcheck` passes. More is better than the minimum. A princely Islamic one and a poor
  Northern one should look like different objects of the same kind.
- Give any object that opens, lights or fills its states (closed and open, lit and out), each drawn in every
  variation.
- Run `python3 library/vcheck.py <family> --sheet /tmp/claude-0/sheets/<family>` from `tools/pixelmap`. Look at the
  sheets: open the PNGs with your Read tool, cropping big ones with PIL first. Fix anything that does not read as
  the thing at a glance, then run it again. Repeat until the gate passes and every object reads. Do not loosen the
  gate.
- Also run `cd tools/pixelmap && python3 -m unittest library.test_library` and `python3 maps/farmhouse.py
  /tmp/claude-0/fh-<name>`. Both must pass.

Rules:
- Edit only your own module(s). Do not edit `census.py`, `catalogue.py`, `core.py`, `variants.py`, `vcheck.py`,
  `art.py`, maps, or other helpers' modules. Other helpers are working in the same folder at the same time. If a
  shared file needs a change, or a census row is wrong (wrong years, rooms, styles or size), put it under "Notes for
  the lead" in your final report instead. Exception: the openings helper may edit `props.py` door and window
  drawing and `core.door`/`core.window`, as its brief says.
- Do not run git commit, push, checkout, stash or reset. The lead commits.
- Keep runs light: render only what you are checking.
- Plain English in docstrings: no em-dashes, no gendered pronouns, never the owner's name. No book text.
- Sizes come from real period sources; name the source in `ref=`.

Final report (short):
- the objects done, and for each the number of variations per era;
- the gate output (the last lines);
- the sheet folder;
- anything not done;
- "Notes for the lead".
