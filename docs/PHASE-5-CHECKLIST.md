# Phase 5 checklist: Otherworlds and senses

## Done by Claude (2026-11-07)

- [x] Twin night maps for the 22 world maps and their 104 roofs: a Penumbra twin (silvered moonlight, living things glowing faintly, a fine Weaver web on stonework) and a Shadowlands twin (colour drained, rot and cracks, the night's lights turned to a pale grave-light). Same geometry, same night; roofs keep their transparency. 252 images in `Data/wodx-assets/twins`, with `manifest.json`.
- [x] WoDX Otherworlds 0.2.0:
  - Penumbra and Shadowlands levels, built from the art.
  - Twin roofs, lights and travel roads on those levels.
  - Cross the Shroud.
  - Disconnection (W20 p. 319) and the year-and-a-day proposal.
  - Umbral paths.
  - Read the Soul (V20 Dark Ages p. 195), with its aura overlay.
- [x] Rule B31 (one Umbra: Wraith, then Werewolf, then Mage) added to the Master Plan and to Chronicle Rules.
- [x] Quality gate, automatic part:
  - Unit and harness tests pass.
  - UI fit passes at three screen sizes, with the new windows and dialogs.
  - Every new list has its search box (B24).

## For you

1. Setup → Backups: snapshot **rothenstein-wodx**. The module also writes each scene to `Data/wodx-backups/scenes` before it changes it.
2. Restart Foundry, open **rothenstein-wodx**. Manage Modules: WoDX Otherworlds should read 0.2.0.
3. Token controls → **clone button** (Penumbra and Shadowlands levels). Type in the search box to check it filters. Press **Tick all**, then **Build ticked**, and confirm. The "WoDX Twin Levels" journal lists what was made on each scene.
4. **Gate: every twin map at night.** For each of the 22 world maps, use Foundry's level switcher to view Penumbra and then Shadowlands. Check that:
   - the map still reads as night;
   - roofs sit exactly over their buildings;
   - lights show in their places;
   - walls still block.

   Note any map that looks wrong.
5. **Stepping sideways:** put a Garou token on a roof or a road, set the scene's ratings if needed, and step sideways. The token should arrive on the Penumbra level at the same spot. Walk it into a road out of town: it should arrive on the next map's Penumbra level. Step back.
6. **Cross the Shroud:** select any token → skull button → Cross. It moves to the Shadowlands level. The whispered card shows the Shroud rating.
7. **Read the Soul:** give a vampire Auspex 2.
   - With the palette button, set an aura on another character.
   - Select the vampire, target the other token (T), and press the sparkling-hand button.
   - You (as Storyteller) get the roll; the aura shows around the token for 20 seconds.
   - Try it as a player too: they should see the reading but not the dice.
8. Look at the browser console (F12) for red lines starting with "WoDX". The aura's draw time is logged as a debug line ("aura drawn in … ms"). Then tell Claude you're done.

## Gate result

- [x] Passed, 2026-11-07. Ben checked every twin map at night and ran each step, with nothing to report.
- [x] Read back from rothenstein-wodx:
  - All 22 world maps have Penumbra and Shadowlands levels with their twin art.
  - Every roof and light has its two copies, in the same place and at the right height.
  - All 124 twin roads are linked and switched on.
  - No other scene sends tokens into a world map, so no road outside them needed changing.
- [x] Each scene was backed up (22 files in `Data/wodx-backups/scenes`), and Foundry made a world backup at 08:56. No errors in the server log since the install. Phase 5 complete.
