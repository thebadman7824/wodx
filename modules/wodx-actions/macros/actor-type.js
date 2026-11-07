// VtDA20: Actor Type — choose the combat/action profile (Kindred, ghoul, Garou, mage...) for the selected token.
const a = canvas.tokens.controlled[0]?.actor ?? game.user.character;
if (a) game.vtda20combat.pickKind(a); else ui.notifications.warn("Select a token first.");
