/**
 * B7937: what the Garou's learned maneuvers and pack tactics of Dark Ages: Werewolf (pp. 102-105) leave on the fight.
 * The table and the numbers are in rules.js (DAW, dawWhy, gnarlPoints, savageStandDiff, jawLockResult, tauntDiff,
 * tauntDice, harryResult); this file rolls the contests and writes the marks:
 *   Hamstring: a crippled leg (an Active Effect, as a broken limb), until the levels heal
 *   Jaw Lock: on a hit, Strength + Athletics against the foe's; the Garou winning pins them (held and knocked down)
 *   Fur Gnarl: flag wodx-combat.gnarl {points}: the armour torn away, which "Strike the gnarled hide" leaves out of soak
 *   Savage: flag wodx-combat.savaged {by: [uuids]}: standing is Strength + Athletics at 4 + 1 for each Garou on them
 *   Taunt: flag wodx-combat.taunted {dice}: dice off the foe's next attack
 *   Harrying: the chaser's Dexterity + Athletics against the prey's at 5; driven on, the prey loses a Willpower point
 */
import * as R from "../../wodx-rules/combat/rules.js";

const MOD = "wodx-combat";
const REF = "Dark Ages: Werewolf";
let D = null;
/** deps: {rollPool, attr, ability, markFollow, getKind}; the marks are written by an owner of the target (the Storyteller in a fight). */
export function init(deps) { D = deps; }

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const n = v => Number(v) || 0;
const pool = (a, at, ab) => Math.max(0, n(D.attr(a, at)) + n(D.ability(a, ab)));
const hits = r => r?.botch ? 0 : n(r?.successes);
const card = (title, lines, rolls = []) => ChatMessage.create({ speaker: { alias: "WoDX Combat" }, rolls: rolls.filter(Boolean),
    content: `<div class="vtc-card"><h3>${esc(title)}</h3>${lines.map(l => `<p>${l}</p>`).join("")}</div>` });

export const gnarlOf = actor => n(actor?.getFlag?.(MOD, "gnarl")?.points);
export const savagedBy = actor => [...new Set(actor?.getFlag?.(MOD, "savaged")?.by ?? [])];
export const tauntedDice = actor => n(actor?.getFlag?.(MOD, "taunted")?.dice);
export async function clearTaunt(actor) { if (tauntedDice(actor) && actor.isOwner) await actor.unsetFlag(MOD, "taunted"); }
export async function clearSavaged(actor) { if (savagedBy(actor).length && actor.isOwner) await actor.unsetFlag(MOD, "savaged"); }

/** What a landed DA:W maneuver leaves on the target. Returns the card lines. */
export async function afterHit(key, { attacker, target, hit = false, botch = false, damageSuccesses = 0, levels = 0 } = {}) {
    if (!R.DAW[key] || !target || !hit || botch) return [];
    const lines = [];
    if (key === "hamstring" && n(levels) > 0) {
        await target.createEmbeddedDocuments("ActiveEffect", [{ name: "Crippled: leg (hamstrung)", img: "icons/svg/bones.svg",
            description: `Hamstrung (${REF} p. 102): a biped crawls, slowly; a beast moves at half, and a second hamstring stops it. It fades when the last level it caused heals.`,
            flags: { [MOD]: { crippled: "leg-r", daw: "hamstring" } } }]);
        lines.push(`${esc(target.name)} is hamstrung: a crippled leg until the wound heals (${REF} p. 102).`);
    }
    if (key === "jawlock") {
        const a = await D.rollPool(pool(attacker, "strength", "athletics"), 6), d = await D.rollPool(pool(target, "strength", "athletics"), 6);
        const res = R.jawLockResult(hits(a), hits(d));
        lines.push(`Jaw Lock: Strength + Athletics, ${esc(attacker.name)} ${hits(a)} against ${esc(target.name)} ${hits(d)}: ${esc(target.name)} is ${res.line} (${REF} p. 103).`);
        if (res.pinned) {
            await D.markFollow(target, { condition: "held", name: "Pinned by the jaws", lasts: "grip" });
            await D.markFollow(target, { condition: "knockdown", name: "Knocked down", lasts: "turn" });
        }
        await card(`${attacker.name}: Jaw Lock`, lines, [a.roll, d.roll]);
        return lines;
    }
    if (key === "furgnarl") {
        const pts = R.gnarlPoints(damageSuccesses);
        if (pts > 0) {
            const total = gnarlOf(target) + pts;
            if (target.isOwner) await target.setFlag(MOD, "gnarl", { points: total, by: attacker?.uuid ?? null });
            lines.push(`Fur Gnarl: ${pts} point${pts === 1 ? "" : "s"} of armour torn from ${esc(target.name)} (${total} in all); the pack strikes there at +2 against the reduced soak (${REF} p. 104).`);
        } else lines.push(`Fur Gnarl: too few damage successes to tear the armour (two for each point, ${REF} p. 104).`);
    }
    if (key === "savage") {
        const by = [...new Set([...savagedBy(target), attacker?.uuid].filter(Boolean))];
        if (target.isOwner) await target.setFlag(MOD, "savaged", { by });
        lines.push(`Savage: ${by.length} Garou on ${esc(target.name)}; standing or escaping is Strength + Athletics at ${R.savageStandDiff(by.length)} (${REF} p. 105).`);
    }
    if (lines.length) await card(`${attacker?.name ?? "A Garou"}: ${R.DAW[key].label.split(" [")[0]}`, lines);
    return lines;
}

/** Taunt (p. 103): Manipulation + Intimidation (or Expression) at the foe's Wits + 4; two successes a die off their next action. */
export async function taunt(taunter, target, { expression = false } = {}) {
    if (!taunter || !target) return null;
    const diff = R.tauntDiff(D.attr(target, "wits"));
    const r = await D.rollPool(pool(taunter, "manipulation", expression ? "expression" : "intimidation"), diff);
    const dice = R.tauntDice(hits(r));
    if (dice > 0) {
        const total = tauntedDice(target) + dice;
        if (target.isOwner) await target.setFlag(MOD, "taunted", { dice: total, by: taunter.uuid });
    }
    const shifter = D.getKind?.(target) === "lupine" || ["Werewolf", "Changing Breed"].includes(target?.type);
    const lines = [`Manipulation + ${expression ? "Expression" : "Intimidation"} at ${diff} (Wits + 4): ${r.botch ? "a botch" : `${hits(r)} success${hits(r) === 1 ? "" : "es"}`}.`,
        dice > 0 ? `${esc(target.name)} loses ${dice} di${dice === 1 ? "e" : "ce"} from the next action (not a purely defensive one); brought to no dice, they can only defend.${shifter ? " A Garou taunted risks frenzy." : ""}` : `${esc(target.name)} is not drawn in.`,
        `<span class="wodx-quiet">${REF} p. 103; a pack may taunt together, each taking dice off.</span>`];
    await card(`${taunter.name} taunts ${target.name}`, lines, [r.roll]);
    return { successes: hits(r), dice, diff };
}

/** Harrying (pp. 104-105): one drive of the pack's chaser against the prey; pursuitUp: the last escape's net successes. */
export async function harry(chaser, prey, { pursuitUp = 0 } = {}) {
    if (!chaser || !prey) return null;
    const c = await D.rollPool(pool(chaser, "dexterity", "athletics"), Math.min(10, 5 + n(pursuitUp))), p = await D.rollPool(pool(prey, "dexterity", "athletics"), 5);
    const res = R.harryResult(hits(c), hits(p));
    let wp = null;
    if (res.driven) {
        wp = Math.max(0, n(prey.system?.advantages?.willpower?.temporary) - 1);
        if (prey.isOwner) await prey.update({ "system.advantages.willpower.temporary": wp });
    }
    const lines = [`Dexterity + Athletics: ${esc(chaser.name)} ${hits(c)} (difficulty ${Math.min(10, 5 + n(pursuitUp))}) against ${esc(prey.name)} ${hits(p)} (5).`,
        `${esc(prey.name)} is ${esc(res.line)}${wp != null ? ` (Willpower ${wp})` : ""}.${wp === 0 ? " No Willpower left: they can run no more." : ""}`,
        `<span class="wodx-quiet">${REF} pp. 104-105: four Garou at least, unseen all at once; if the prey turns to fight, ordinary combat begins.</span>`];
    await card(`${chaser.name} harries ${prey.name}`, lines, [c.roll, p.roll]);
    return { ...res, willpowerLeft: wp };
}
