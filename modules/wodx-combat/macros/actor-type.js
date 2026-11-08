// WoDX: Actor Type. Choose the combat/action profile (Kindred, ghoul, Garou, mage...) for the selected token.
const a = canvas.tokens.controlled[0]?.actor ?? game.user.character;
if (a) game.wodxCombat.pickKind(a); else ui.notifications.warn("Select a token first.");
