// WoDX: Initiative. 1d10 + Dexterity + Wits (Celerity adds nothing, V20 p. 142) – wound penalty.
// GM with no token selected: rolls for every combatant. Otherwise: selected / owned combatants.
game.wodxCombat.rollInitiative({ all: game.user.isGM && canvas.tokens.controlled.length === 0 });
