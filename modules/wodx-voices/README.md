# WoDX Voices

NPCs speak aloud. Off by default: Game Settings, WoDX Voices, Voices.

Only plot NPCs speak: right-click an actor in the Actors list and choose Voiced (plot NPC). Only the lines written on that NPC's WoDX NPC talk sheet are read; stock lines, generated lines and barks stay text, as in Fallout or Baldur's Gate.

## Kokoro (the default engine)

Kokoro runs in the Storyteller's browser with no network. Its files go in Foundry's Data folder once:

    node tools/voices/fetch-engine.mjs "<Foundry Data>/wodx-voices-engine"

That downloads about 140 MB: kokoro-js and the ONNX runtime from the npm registry, the quantized model and 27 English voices from Hugging Face. Add `--fp32` for the full model (about 330 MB more), used only when "Kokoro runs on" is set to the graphics card. Without the folder, the browser's own speech reads every line.

Rendered lines are kept in Data/wodx-voices-cache/g<n>/. Foundry can't delete files from the browser: "Start a fresh cache" begins a new folder, and the old one is deleted by hand.

## Per NPC

On the actor, `flags.wodx-voices`:
- `sex`: "female" or "male", used only to match a voice (otherwise the people generator's record, else none).
- `age`: 60 and over speaks a little slower and lower.
- `override`: `{kokoro: "bm_george" | "bm_george*0.6+bm_lewis", voice: "<browser voice name>", pitch, rate, lang: "cs"}`.

A picker on the sheet comes in 0.3.0.
