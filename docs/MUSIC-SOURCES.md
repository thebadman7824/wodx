# Music sources

Free music and ambience for WoDX Atmosphere's era kits (B2430 to B2432). Terms were read on 12 November 2026. Check them again before a large download, because sites change them.

| Source | Licence | Credit | Use it for | Catch |
| --- | --- | --- | --- | --- |
| Scott Buckley (scottbuckley.com.au) | CC BY 4.0 | Yes | Dark orchestral and horror ambient music, every era | No reselling tracks on their own |
| Soundimage.org (Eric Matyas) | Soundimage International Public License | Yes, inside the game | Horror, history, fantasy and sci-fi music, looping tracks, city ambience | The credit has to show in the game (the credits journal covers this) |
| Tabletop Audio (tabletopaudio.com) | CC BY-NC-ND 4.0 | Yes | Ambience for places and weather | No edits. SoundPads stay on their site |
| Kevin MacLeod (incompetech.com) | CC BY 4.0 | Yes | Horror and period music for later eras | Well known, so players may recognise tracks |
| Musopen (musopen.org) | Public domain | No | Classical recordings heard in the scene | Check that each track really is public domain |
| Freesound (freesound.org) | Per sound: CC0, CC BY or CC BY-NC | BY and BY-NC | Field recordings for loops and cues | Check each sound's licence; no songs |
| Pixabay (pixabay.com) | Pixabay Content License | No | Dark synth | Quality varies |
| Free Music Archive (freemusicarchive.org) | Per track | Usually | Filling gaps | Skip FMA-Limited tracks |

Not used: Ivan Duch's free set (its terms ban the files in Foundry modules or packs) and FreePD (closed). Not checked yet, because their terms pages wouldn't open: BBC Sound Effects, Sonniss GDC bundle, Zapsplat, Filmmusic.io and the Internet Archive's Great 78 Project.

## Filing downloads

1. Download the files by hand into one folder.
2. Copy `tools/atmosphere/plan-template.csv` and fill in one row per file. Each row gives the kit, the slot (a mood, a place or weather key, or `scene`), the source, the title, and the author and licence where the source needs them.
3. Run `python3 tools/atmosphere/sort-downloads.py plan.csv --from <downloads> --to <Data>/wodx-kits --dry-run` and read what it would do.
4. Run it again without `--dry-run`. Files are converted to Ogg Vorbis (about 128 kbps), and each kit's credits.json is updated.
5. In Foundry, open the Atmosphere window, build the kit's playlists, and press Credits journal.

The sorter refuses any source that isn't on the list above, a Freesound or Free Music Archive file without an accepted licence, and anything that isn't an audio file. It never trims, loops or mixes a file.

## Recorded cues (B6260 to B6264)

Ben asked on 15 November 2026 for every generated sound to be swapped for a real recording where one can be had. The
cues (dawn, sunset, notice, birdsong, cock-crow) and the Beast's heartbeat now come from Freesound recordings under CC0
or CC BY only, listed slot by slot in `tools/atmosphere/real-cues.json` with spares in order. On Ben's PC:

    node tools/atmosphere/fetch-cues.mjs --to "<Data>/wodx-kits" --ffmpeg "%LOCALAPPDATA%\Microsoft\WinGet\Links\ffmpeg.exe" --report cues-report.md

It reads each Freesound page, refuses anything that is not CC0 or CC BY, downloads Freesound's preview, cuts it to the
slot's length from its first sound, fades it, levels it and writes `<kit>/sounds/<cue>.ogg` (or `<cue>-<faith>.ogg`)
with a credits.json entry that says what was changed, as CC BY asks. Birdsong, cock-crow and the heartbeat go to
`wodx-kits/common/sounds/`. Then press Build playlists in the Atmosphere window and Credits journal.

Where the scene's land keeps another faith, its own dawn and sunset sound plays: the call to prayer, the semantron,
the conch, the temple bell and gong, the long monastery horns. The generated cues stay in the module and play wherever
no kit folder has a recording, so a world without the kit folders still has every cue.
