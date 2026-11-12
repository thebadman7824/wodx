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
