---
bump: patch
---
Era profile switches are read in play, not only shown on the era card: api.eras.eraSwitch(key) gives the profile's firearms, morality, gauntletChart or cyberware switch, and terms.gunsOnSheet, walksRoads and cyberwareOn decide from it, with the old year checks only as the fallback (B6668).
