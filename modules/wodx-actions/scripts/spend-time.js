/**
 * WoDX Actions 3.48.0: a long roll's time. With "Move the clock" ticked, the time goes through WoDX Storyteller:
 * on the Storyteller's client it moves the clock, or the character's own time when they are apart from the group;
 * on a player's client it goes to the approval queue (B1602). Without WoDX Storyteller, only the Storyteller's
 * roll moves the clock, as before. Returns a line for the card ("" when nothing happens).
 */
export async function spendTime(actor, seconds, label = "") {
    const s = Math.round(Number(seconds) || 0);
    if (!(s > 0) || !actor) return "";
    const time = game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller")?.api?.time : null;
    if (time?.ask) {
        try {
            const r = await time.ask({ actorId: actor.id, seconds: s, label });
            const line = time.note?.(r, actor.name) ?? "";
            return line ? `<div class="vta-note">${line.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c])}</div>` : "";
        } catch (e) { console.error("WoDX | time", e); }
    }
    if (game.user.isGM) { await game.time.advance(s); return ""; }
    return `<div class="vta-note">Ask the Storyteller to move the clock.</div>`;
}
