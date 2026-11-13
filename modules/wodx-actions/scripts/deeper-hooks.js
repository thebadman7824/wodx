/**
 * Display-only desk, batch B (B3130 to B3133), the Foundry part: reads what WoDX Storyteller, NPC and Atmosphere leave
 * on a character, and the character's codex. Rules in deeper-rules.js.
 */
import * as DR from "./deeper-rules.js";

const api = id => (game.modules?.get?.(id)?.active ? game.modules.get(id).api ?? null : null);
const tokenOf = actor => actor?.getActiveTokens?.()?.[0]?.document ?? null;

export const nightmareDice = actor => DR.nightmareDice([...(actor?.effects ?? [])]);
/** The blend step for a stranger here (0 when dressed as the place, or WoDX NPC is off). */
export function crowdStep(actor) {
    try { return Number(api("wodx-npc")?.wanted?.dress?.blendDiff?.(actor, globalThis.canvas?.scene ?? null)) || 0; } catch (e) { return 0; }
}
/** The fear-of-fire step of the mood regions the actor's token stands in. */
export function fireStep(actor) {
    try { const t = tokenOf(actor); return t ? Math.max(0, Number(api("wodx-atmosphere")?.mood?.ruleAt?.(t)?.fire) || 0) : 0; } catch (e) { return 0; }
}
/** The codex pages not yet spent on research: [{id, name}]. */
export function researchPages(actor) {
    const j = actor ? game.journal?.find?.(x => x.flags?.["wodx-storyteller"]?.codex === actor.id) : null;
    if (!j) return [];
    return [...j.pages].filter(p => !p.flags?.["wodx-actions"]?.researchUsed).map(p => ({ id: p.id, name: p.name }));
}

/** The roll window's extra boxes: a stranger's crowd tick, and the codex entry to read up on. */
export function ticksHtml(actor, esc = s => s) {
    let html = "";
    const crowd = crowdStep(actor);
    if (crowd) html += `<div class="form-group"><label><input type="checkbox" name="tag-crowd"/> Blending into a crowd (dressed as a stranger here: +${crowd} difficulty)</label></div>`;
    const pages = researchPages(actor);
    if (pages.length) html += `<div class="form-group"><label>Research from the codex (Occult, Academics or a lore)</label><select name="research"${pages.length > 8 ? "" : " data-fixed"}><option value="">None</option>${pages.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("")}</select></div>`;
    return html;
}

/** The modifiers for a roll from its window's fields. */
export function modsFor(actor, fd = {}, pool = {}) {
    const research = !!fd.research && DR.researchHelps(pool.abilityKey, pool.abilityLabel) && researchPages(actor).some(p => p.id === fd.research);
    return DR.deeperMods({ nightmares: nightmareDice(actor), crowd: fd["tag-crowd"] ? crowdStep(actor) : 0, research });
}

/** After the roll: the codex entry is spent. */
export async function afterRoll(actor, fd = {}, pool = {}) {
    if (!fd.research || !DR.researchHelps(pool.abilityKey, pool.abilityLabel)) return;
    const j = game.journal?.find?.(x => x.flags?.["wodx-storyteller"]?.codex === actor?.id);
    const page = j?.pages?.get?.(fd.research);
    if (page?.isOwner) await page.setFlag("wodx-actions", "researchUsed", true);
    else if (page) game.socket?.emit?.("module.wodx-actions", { action: "research", uuid: page.uuid });
}
