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
	// B6728: a general roll made straight from the actor api (no window, so no WoDX Sheets wrap) is marked wodxDirect
	if (!WODX_ORIGINS.includes(diceRoll.origin) && !(diceRoll.wodxDirect && diceRoll.origin === "general")) return null;
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
	// B6924: a no-botch effect (a Boggan's Crafts, C20 p. 89): the roller reads it through wodxNoBotch
	diceRoll.wodxNoBotch = !!mods?.noBotch;
	// B6925: a halving count (a Tzimisce without native soil): wodxHalveRoll halves the pool once the dice are in
	diceRoll.wodxHalve = Math.max(0, Math.floor(n(mods?.halve)));
	if (!dice && !diff && !parts.length) return null;
	// B7120: past 10 the dice roll at 10 and each point past it needs one more success (M20 pdf 504); the roller reads it
	const over0 = Math.max(0, n(diceRoll.difficulty) + diff - 10);
	diceRoll.numDices = Math.max(0, n(diceRoll.numDices) + dice);
	for (const t of diceRoll.targetlist ?? []) t.numDices = Math.max(0, n(t.numDices) + dice);
	const want = n(diceRoll.difficulty) + diff;
	diceRoll.difficulty = Math.max(lowest, Math.min(10, want));
	diceRoll.wodxOver = Math.max(n(diceRoll.wodxOver), over0);
	const sum = [dice ? `${dice > 0 ? "+" : ""}${dice} dice` : "", diff ? `${diff > 0 ? "+" : ""}${diff} difficulty` : ""].filter(Boolean).join(", ");
	if (parts.length) diceRoll.extraInfo = [...(diceRoll.extraInfo ?? []), `WoDX: ${parts.join("; ")}${sum ? ` (${sum})` : ""}${want > 10 ? ` (rolled at 10; ${wodxOverText(want - 10)})` : ""}`];
	return { dice, diff, parts, once: mods?.once ?? [], capped: want > 10 };
}

/**
 * B6924: does WoDX say this roll cannot botch? Read from the mods applyWodxRollMods already took, else (the general
 * window, which WoDX Sheets wraps for dice and difficulty) asked once here for the no-botch flag alone. Soak and
 * damage are left as the system's settings have them.
 */
export function wodxNoBotch(diceRoll, {modsFor = null, on = true} = {}) {
	if (!diceRoll?.actor || !on || typeof modsFor !== "function") return false;
	if (["soak", "damage"].includes(diceRoll.origin)) return false;
	if (diceRoll.wodxNoBotch !== undefined) return !!diceRoll.wodxNoBotch;
	try { diceRoll.wodxNoBotch = !!modsFor(diceRoll.actor, { attributeKey: diceRoll.attribute, abilityKey: diceRoll.ability })?.noBotch; }
	catch (e) { diceRoll.wodxNoBotch = false; }
	return diceRoll.wodxNoBotch;
}

/** B7120: the words for a difficulty past 10: "2 more successes needed". */
export function wodxOverText(over) {
	const k = Math.max(0, Math.round(n(over)));
	return k ? `${k} more success${k === 1 ? "" : "es"} needed` : "";
}

/**
 * B7120: take one success off for each point the difficulty went past 10 (M20 pdf 504; V20 pdf 166). diceRoll.wodxOver
 * is set by applyWodxRollMods, or by the general window when WoDX Sheets held its difficulty at 10. A roll that only
 * falls short this way is a failure. Returns {success, over}.
 */
export function wodxOverSuccesses(diceRoll, success) {
	const over = Math.max(0, Math.round(n(diceRoll?.wodxOver)));
	if (!over || ["soak", "damage"].includes(diceRoll?.origin)) return { success, over: 0 };
	return { success: Math.max(0, n(success) - over), over };
}

/** B6925: a pool halved k times, rounded down, never under one die; 0 stays 0. */
export function halvePool(dice, k = 0) {
	const d = Math.max(0, Math.floor(n(dice))), t = Math.max(0, Math.floor(n(k)));
	if (!d || !t) return d;
	return Math.max(1, Math.floor(d / 2 ** t));
}

/**
 * B6925: halve the pool when WoDX says so (a Tzimisce's nights without native soil, V20 p. 71). The count comes from
 * the mods applyWodxRollMods took, else (the general window) is asked of sheetRollMods here. Runs once per container,
 * after the WoDX dice are on. Soak and damage are left alone. Returns the count used.
 */
export function wodxHalveRoll(diceRoll, {modsFor = null, on = true} = {}) {
	if (!diceRoll?.actor || !on || typeof modsFor !== "function" || diceRoll.wodxHalved) return 0;
	if (["soak", "damage"].includes(diceRoll.origin)) return 0;
	let k = diceRoll.wodxHalve;
	if (k === undefined) {
		try { k = Math.max(0, Math.floor(n(modsFor(diceRoll.actor, { attributeKey: diceRoll.attribute, abilityKey: diceRoll.ability })?.halve))); }
		catch (e) { k = 0; }
	}
	diceRoll.wodxHalved = true;
	if (!k) return 0;
	const before = n(diceRoll.numDices);
	diceRoll.numDices = halvePool(before, k);
	for (const t of diceRoll.targetlist ?? []) t.numDices = halvePool(t.numDices, k);
	diceRoll.extraInfo = [...(diceRoll.extraInfo ?? []), `WoDX: pool halved${k === 1 ? "" : ` ${k} times`}, ${before} to ${diceRoll.numDices} dice`];
	return k;
}

/** The live sources: WoDX Sheets' api and its world setting (on when WoDX Sheets does not say otherwise). */
export function wodxRollSources() {
	const sheets = game.modules?.get?.("wodx-sheets");
	const modsFor = sheets?.active ? sheets.api?.sheetRollMods : null;
	let on = true;
	try { on = game.settings.get("wodx-sheets", "sheetRollMods") !== false; } catch (e) { on = !!modsFor; }
	return { modsFor, on, lowest: Number(CONFIG.worldofdarkness?.lowestDifficulty) || 2 };
}
