/**
 * WoDX fork (B6729): bonuses for the form, aspect and feature Traits in the system's packs whose effect was only in the
 * description. Where the text names a change the system's own bonus types can carry (a roll's difficulty), the Trait
 * gets that bonus when it lands on an actor; it switches on and off with the Trait, like the packs' own bonuses (Shark
 * Hide's soak, Enhanced Senses). Pure module: no Foundry globals at import.
 *
 * Effects the bonus types cannot carry are WoDX modules' work: attacks made harder against the bearer (WoDX Combat
 * rules.js FORM_DEFENCES), natural weapons, immunities, movement and senses (see the owner notes in the audit items).
 */

const diff = (name, settingtype, value, ability = true) => ({ name, settingtype, type: ability ? "ability_diff" : "attribute_diff", value, isactive: false });

/** Trait name (exact, lower case) to its bonuslist, with the book page. */
export const PACK_BONUSES = {
	"irresistable force": { page: "DtF p. 188", bonuslist: [diff("Feats of strength", "strength", -2, false)] },
	"irresistible force": { page: "DtF p. 188", bonuslist: [diff("Feats of strength", "strength", -2, false)] },
	"chimerical aura": { page: "DtF p. 198", bonuslist: [diff("Dodge difficulty", "wod.abilities.dodge", -2)] },
	// on the move one easier; standing still it is two (the still part is a scene ruling)
	"chameleon skin": { page: "DtF pp. 206-207", bonuslist: [diff("Stealth difficulty", "wod.abilities.stealth", -1)] }
};

const TYPES = ["wod.types.apocalypticform", "wod.types.aspect", "wod.types.shapeform"];
const isEmpty = b => !b || (Array.isArray(b) ? b.length === 0 : Object.keys(b).length === 0);

/** The bonuslist a Trait should carry, or null when it already has one or the table has none. */
export function packBonusesFor(item) {
	if (!item || item.type !== "Trait" || !TYPES.includes(item.system?.type) || !isEmpty(item.system?.bonuslist)) return null;
	const row = PACK_BONUSES[String(item.name ?? "").trim().toLowerCase()];
	if (!row) return null;
	const on = !!item.system?.isactive;
	return row.bonuslist.map(b => ({ ...b, isactive: on }));
}

/** Hooks: a Trait dropped on an actor gets its bonus; on ready the GM fills the ones already on actors. */
export function registerPackBonuses() {
	Hooks.on("preCreateItem", (item, data) => {
		try {
			const list = packBonusesFor({ type: data.type ?? item.type, name: data.name ?? item.name, system: data.system ?? item.system });
			if (list) item.updateSource({ "system.bonuslist": list });
		} catch (e) { console.warn("WoD | pack bonuses", e); }
	});
	Hooks.once("ready", async () => {
		if (!game.user?.isGM || game.users?.activeGM?.id !== game.user.id) return;
		for (const actor of game.actors ?? []) {
			const updates = [];
			for (const i of actor.items ?? []) { const list = packBonusesFor(i); if (list) updates.push({ _id: i.id, "system.bonuslist": list }); }
			if (updates.length) await actor.updateEmbeddedDocuments("Item", updates).catch(e => console.warn("WoD | pack bonuses", e));
		}
	});
}
