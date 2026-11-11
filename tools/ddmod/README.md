# Dungeondraft to Foundry in one click

Three parts, all on Ben's PC:

1. **WoDX Export** (`wodx-export/`), a Dungeondraft mod. It adds a **WoDX Export** tool under Settings in the left-hand tool bar:
   - *Export this map* saves `<map>.dd2vtt` (Universal VTT) next to the map, 100 px a square, with the grid and lighting switched off for the export and put back after.
   - *Export every map in this folder* opens each map in the open map's folder that has no export yet (or was saved since), and exports it. A batch carries on where it was if Dungeondraft loads the mod again when a map opens.
   - *Stop* ends a batch.
2. **The map watcher** (`wodx-watch.ps1`, started by `Start WoDX map watcher.bat`). It watches `D:\WoDX\maps` for new or newer `.dd2vtt` files and copies each into `Data\wodx-maps\<map>\<stamp>\`, with the picture taken out of the export and the map's `.wodx.json` beside it. Then it runs `mapimport.mjs` through the headless runner. It runs at below-normal priority and logs to `wodx-watch.log` beside it.
3. **mapimport.mjs** (`tools/gate/`). It runs in rothenstein-wodx only, as Gamemaster Test. It makes one scene per new export folder in the scene folder "Generated maps", with Dungeondraft's walls, doors, windows and lights. Then it runs Adopt with the WoDX file. Nothing is deleted or overwritten: exporting a map again gives a new scene beside the old one. The result goes to `Data\wodx-gate\mapimport-result.json`.

Why Universal VTT and not PNG: Adopt sets up the doors and windows on walls the import made. Our `.wodx.json` holds the openings, things and regions, not the plain walls, so a PNG alone would give a scene with door walls only.

## Install once

- Copy `wodx-export\` into a folder for Dungeondraft mods (for example `D:\WoDX\dungeondraft-mods\wodx-export\`). On Dungeondraft's start screen, open Mods, set that folder, tick WoDX Export, and restart Dungeondraft.
- Copy `wodx-watch.ps1`, `Start WoDX map watcher.bat` and `..\gate\mapimport.mjs` into one folder (for example `D:\WoDX\tools\`). Double-click the .bat. Close its window to stop.
- The Foundry server must be running with rothenstein-wodx. The watcher asks Foundry which world is running first and does nothing on any other world, retrying every 2 minutes.
- The headless runner: put a copy with its own Playwright in `D:\WoDX\tools\runner\` (the watcher looks there first, then in %TEMP%).

## Checked here, and not yet checked

The Foundry side is harness-tested (`tools/harness/mapimport.test.mjs`). The mod uses the documented modding API (`Exporter.Start`, `Editor.ForceOpenMap`, `Editor.ToggleGrid`/`ToggleLighting`, `Toolset.CreateModTool`). The parts the docs leave open need a first try on the PC: how a button's press is connected, whether a Godot Timer runs in a mod, whether `Start` adds the extension itself, and whether turning lighting off keeps it out of the exported picture.
