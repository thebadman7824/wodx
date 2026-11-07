// Direct calls, for your own macros.
game.wodxActions.action({ preset: "sneaking" });        // any key from game.wodxActions.presets
game.wodxActions.frenzy({ provocation: "smellblood" });
game.wodxActions.rotschreck({ provocation: "directsun" });
game.wodxActions.hazard({ kind: "fire" });              // "sun" | "fire" | "fall"
game.wodxActions.newNight();                             // GM: upkeep for every player character
