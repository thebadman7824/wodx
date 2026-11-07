// Example: heal 1 bashing level on every selected token, or apply raw damage without soak.
for (const t of canvas.tokens.controlled) {
  await game.vtda20combat.healDamage(t.actor, "bashing", 1);
  // await game.vtda20combat.applyDamage(t.actor, "lethal", 2);   // unsoaked damage
}
