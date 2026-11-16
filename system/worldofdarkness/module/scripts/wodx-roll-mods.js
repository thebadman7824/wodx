/**
 * WoDX fork (B6720): the system's own roll windows other than the general one (a Discipline, Gift or other power, a
 * weapon's attack, an Arete casting, a Wonder or Trait) count what WoDX puts on the character, as the general roll
 * window does through WoDX Sheets (B6175, B6664). The parts come from WoDX Sheets' api (sheetRollMods: the merits and
 * flaws and other Chronicle roll effects such as tiredness, the powers on the character, and the conditions that make
 * the bearer's own actions harder, with socialDice and socialDiff on a social roll such as Grieving). The world setting
 * wodx-sheets.sheetRollMods turns both off together.
 *
 * The general window is left alone (WoDX Sheets wraps it), and so are soak and damage, which are not the bearer's
 * actions. Pure apart from the api passed in, so the harness tests it.
 */

/** The origins of DiceRollContainer this counts for. */
export const WODX_ORIGINS = ["power", "attack", "magic", "item"];

const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

/**
 * Put the WoDX modifiers on a DiceRollContainer before it is rolled.
 *   diceRoll  the container (numDices, targetlist, difficulty, dicetext, extraInfo, attribute, ability, origin, actor)
 *   modsFor   (actor, {attributeKey, abilityKey}) => {dice, diff, parts, once} (WoDX Sheets' api.sheetRollMods)
 *   on        whether the world setting allows it
 *   lowest    the system's lowest difficulty
 * Returns the modifiers applied, or null. Marks the container so it is never counted twice.
 */
export function applyWodxRollMods(diceRoll, {modsFor = null, on = true, lowest = 2} = {}) {
	if (!diceRoll || diceRoll.wodxApplied || !on || typeof modsFor !== "function" || !diceRoll.actor) return null;
	if (!WODX_ORIGINS.includes(diceRoll.origin)) return null;
	let mods;
	try {
		mods = modsFor(diceRoll.actor, { attributeKey: diceRoll.attribute, abilityKey: diceRoll.ability });
	}
	catch (e) {
		console.warn("WoD | WoDX roll modifiers", e);
		return null;
	}
	const dice = n(mods?.dice), diff = n(mods?.diff), parts = mods?.parts ?? [];
	diceRoll.wodxApplied = true;
	if (!dice && !diff && !parts.length) return null;
	diceRoll.numDices = Math.max(0, n(diceRoll.numDices) + dice);
	for (const t of diceRoll.targetlist ?? []) t.numDices = Math.max(0, n(t.numDices) + dice);
	const want = n(diceRoll.difficulty) + diff;
	diceRoll.difficulty = Math.max(lowest, Math.min(10, want));
	const sum = [dice ? `${dice > 0 ? "+" : ""}${dice} dice` : "", diff ? `${diff > 0 ? "+" : ""}${diff} difficulty` : ""].filter(Boolean).join(", ");
	if (parts.length) diceRoll.extraInfo = [...(diceRoll.extraInfo ?? []), `WoDX: ${parts.join("; ")}${sum ? ` (${sum})` : ""}${want > 10 ? " (difficulty held at 10)" : ""}`];
	return { dice, diff, parts, once: mods?.once ?? [], capped: want > 10 };
}

/** The live sources: WoDX Sheets' api and its world setting (on when WoDX Sheets does not say otherwise). */
export function wodxRollSources() {
	const sheets = game.modules?.get?.("wodx-sheets");
	const modsFor = sheets?.active ? sheets.api?.sheetRollMods : null;
	let on = true;
	try { on = game.settings.get("wodx-sheets", "sheetRollMods") !== false; } catch (e) { on = !!modsFor; }
	return { modsFor, on, lowest: Number(CONFIG.worldofdarkness?.lowestDifficulty) || 2 };
}
