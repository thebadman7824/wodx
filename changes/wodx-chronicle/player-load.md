---
bump: patch
---
The world timeline, the future events and the future world (about 1.2 MB) load on the Storyteller's client only; a player's client reads the fired list and the pages the Storyteller's client writes, and loads the timeline only when a glimpse or a wake report needs it. api.events.load() and loaded() are new; api.events.eras reads the loaded eras (B6240).
