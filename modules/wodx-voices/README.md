# WoDX Voices

NPCs speak aloud. Off by default: Game Settings, WoDX Voices, Voices.

Only plot NPCs speak: right-click an actor in the Actors list and choose Voiced (plot NPC). Only the lines written on that NPC's WoDX NPC talk sheet are read; stock lines, generated lines and barks stay text, as in Fallout or Baldur's Gate.

## The voice server (the default engine)

Chatterbox runs on the Storyteller's PC and uses its graphics card. It sounds the most natural, with emotion and pace taken from each line and the NPC's mood. From the tools-env `.venv-tts` Python:

    python tools/voices/fetch_voices.py "<voices folder>"
    python tools/voices/chatterbox_server.py --voices "<voices folder>"

The first gathers human reference voices (LibriTTS-R, CC BY 4.0; credits in voices.json): about 21 from one Parquet file per split, more with `--files 2`. It needs `pip install "pyarrow<18"` in that venv (newer pyarrow wants NumPy 2, which Chatterbox does not use). The second serves on http://127.0.0.1:7861 and prints its key on start. In Foundry, on the Storyteller's browser: Configure Settings, WoDX Voices, set "Voice server key" (and the address if it changed). Players need nothing. When the server is not running, Kokoro reads the line.

`--samples <folder>` renders a set of sample lines in different voices and moods, then stops.

## Kokoro

Kokoro runs in the Storyteller's browser with no network. Its files go in Foundry's Data folder once:

    node tools/voices/fetch-engine.mjs "<Foundry Data>/wodx-voices-engine"

That downloads about 140 MB: kokoro-js and the ONNX runtime from the npm registry, the quantized model and 27 English voices from Hugging Face. Add `--fp32` for the full model (about 330 MB more), used only when "Kokoro runs on" is set to the graphics card. Without the folder, the browser's own speech reads every line.

Rendered lines are kept in Data/wodx-voices-cache/g<n>/. Foundry can't delete files from the browser: "Start a fresh cache" begins a new folder, and the old one is deleted by hand.

## Per NPC

On the actor, `flags.wodx-voices`:
- `sex`: "female" or "male", used only to match a voice (otherwise the people generator's record, else none).
- `age`: 60 and over speaks a little slower and lower.
- `override`: `{chatterbox: "<server voice id>", kokoro: "bm_george" | "bm_george*0.6+bm_lewis", voice: "<browser voice name>", pitch, rate, lang: "cs"}`.
- `temper`: how the NPC usually speaks: calm, warm, cold, fiery, nervous or weary.

A picker on the sheet comes later.
