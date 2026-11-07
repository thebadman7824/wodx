// VtDA20: Initiative — 1d10 + Dexterity + Wits (+ Celerity) – wound penalty.
// GM with no token selected: rolls for every combatant. Otherwise: selected / owned combatants.
game.vtda20combat.rollInitiative({ all: game.user.isGM && canvas.tokens.controlled.length === 0 });
