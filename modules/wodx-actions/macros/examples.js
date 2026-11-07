// Direct calls, for your own macros.
game.vtda20actions.action({ preset: "sneaking" });        // any key from game.vtda20actions.presets
game.vtda20actions.frenzy({ provocation: "smellblood" });
game.vtda20actions.rotschreck({ provocation: "directsun" });
game.vtda20actions.hazard({ kind: "fire" });              // "sun" | "fire" | "fall"
game.vtda20actions.newNight();                             // GM: upkeep for every player character
