# WoDX Senses

What a character sees, hears, smells and feels, answered in chat. Private use only.

- **Asking**: `/look`, `/listen`, `/smell`, `/touch`, or `/sense` for all four. A word after the command puts lines about it first (`/look door`). The token toolbar button "What do I notice?" opens the same choice. When a player writes a question such as "what do I smell?", a small button under it asks for them (world setting).
- **The answer** is put together on the Storyteller's client: the place's lines (its kind from WoDX NPC's place tags, or the Storyteller's own), the hour, sky, moon and calendar, and what is on the map (lights, fire, open doors, people and what their routines have them doing, recent noise, hiding places, traps, clues). Light, walls and distance decide what this character could perceive at all.
- **Rolls**: a plain look is free and gives what anyone would notice. Look closer rolls Perception + Alertness, blind; each success adds a line, and hidden things show when the successes reach them. Asking again in the same hour and place repeats the answer, until something there changes.
- **Who sees it**: the asker, as a whisper, with Share with the party; the Storyteller gets a copy with the roll, each line's need and what was held back, and can send it to everyone, add a line, or let the character roll again. World setting: send at once, Storyteller reviews first, or off.
- **Powers**: Heightened Senses (Auspex, the Gift), Eyes of the Cat, wolf forms, Sense Wyrm, Sense the Unnatural, Scent of the True Form, Awareness, Kenning and Primal-Urge, Spheres at 1, the fae sight, hunter second sight, a wraith's senses in the Shadowlands; Auspex against Obfuscate. The Penumbra and Shadowlands levels have lines of their own.
- **Place senses** (Storyteller toolbar): your own lines for a scene or a region, indoors or out, the Penumbra's feel there. **Describe this place** posts what anyone would notice for everyone.
- **Hook**: `wodxSensesGather` ({scene, token, actor, sources}) lets another module add sources: `{id, key, at: {x, y}, loud, strong, glows, need, lines: {sound: [{t}]}}`.

Rules: `scripts/senses-rules.mjs` (pure, tested in tools/harness/senses.test.mjs). Lines: `data/places.json` and `data/world.json`, made from `tools/senses-data/*.py`. Decisions B170 to B174.
