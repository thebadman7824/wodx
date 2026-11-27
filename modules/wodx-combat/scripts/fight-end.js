/**
 * Fights that end by themselves (WoDX Combat 3.21.0, B2455). The rules are in fight-end-rules.js.
 *
 *   setting fightEnd  off | suggest | auto (default suggest). Suggest whispers the Storyteller a card with End the
 *                     fight; Auto ends it. Either way the fight's own end (the after-action card, the clock, the NPCs'
 *                     memories) follows as when the Storyteller ends it by hand.
 *   flag combat wodx-combat.endWatch  {round, turn} when the fight first looked over
 *
 * Runs on the active Storyteller's client only.
 */
import * as FE from "../../wodx-rules/combat/fight-end-rules.js";

const MOD = "wodx-combat";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const isActiveGM = () => game.user.isGM && (game.users.activeGM ? game.users.activeGM.id === game.user.id : true);
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };
const D = () => CONST.TOKEN_DISPOSITIONS ?? { HOSTILE: -1, NEUTRAL: 0, FRIENDLY: 1 };

export function registerFightEndSettings() {
    game.settings.register(MOD, "fightEnd", {
        name: "End fights by themselves",
        hint: "Ends the fight, or offers to, once one side has nobody left standing for a full turn.",
        scope: "world", config: true, type: String, default: "suggest", choices: FE.MODES
    });
}

/** What the rules need to know about each fighter. */
function fighters(combat) {
    const d = D();
    return combat.combatants.contents.map(c => {
        const tok = c.token;
        const disp = tok?.disposition;
        return {
            name: c.name, pc: !!c.actor?.hasPlayerOwner, friendly: disp === d.FRIENDLY, hostile: disp === d.HOSTILE,
            neutral: disp === d.NEUTRAL && !c.actor?.hasPlayerOwner, defeated: !!c.isDefeated,
            present: !!tok && !!c.combat?.scene?.tokens?.get?.(tok.id)
        };
    });
}

const posted = new Set();
/* #2675: one check at a time per fight, and none on a fight already being ended. Two checks in flight (a quick Next
   turn, or the round and the turn changing together) could each write the watch flag or end the fight, and an update
   that lands after the fight's delete breaks inside Foundry's own update handler. */
const running = new Map(), ending = new Set();
function check(combat) {
    if (!combat?.id) return Promise.resolve();
    const id = combat.id;
    const next = (running.get(id) ?? Promise.resolve()).then(() => checkOnce(game.combats.get(id))).catch(e => console.error(`${MOD} | fight end`, e));
    running.set(id, next);
    next.finally(() => { if (running.get(id) === next) running.delete(id); });
    return next;
}
/** Resolves once no fight-end check is running (gates wait on it before the next turn). */
const idle = () => Promise.all([...running.values()]).then(() => undefined);
const live = combat => !!combat?.id && !ending.has(combat.id) && !!game.combats.get(combat.id);
async function checkOnce(combat) {
    if (!isActiveGM() || !live(combat) || !combat.started) return;
    const mode = setting("fightEnd") ?? "suggest";
    if (mode === "off") return;
    const r = FE.fightOver(fighters(combat));
    const was = combat.getFlag(MOD, "endWatch") ?? null;
    const s = FE.step(was, r.over, { round: combat.round, turn: combat.turn });
    if (JSON.stringify(s.watch) !== JSON.stringify(was)) {
        if (s.watch) await combat.setFlag(MOD, "endWatch", s.watch); else await combat.unsetFlag(MOD, "endWatch");
    }
    if (!s.end || !live(combat)) return;
    if (mode === "auto") {
        ending.add(combat.id);
        try {
            await ChatMessage.create({ whisper: gmIds(), speaker: { alias: "WoDX" }, content: `<div class="wodx-card"><p><b>The fight is over:</b> ${esc(r.why)}.</p></div>` });
            if (game.combats.get(combat.id)) await combat.delete();
        } finally { ending.delete(combat.id); }
        return;
    }
    if (posted.has(combat.id)) return;
    posted.add(combat.id);
    await ChatMessage.create({ whisper: gmIds(), speaker: { alias: "WoDX" }, flags: { [MOD]: { fightEnd: combat.id } },
        content: `<div class="wodx-card"><p><b>The fight looks over:</b> ${esc(r.why)}, for a full turn now.</p>
            <button type="button" class="wcf-fight-end" data-combat="${esc(combat.id)}">End the fight</button></div>` });
}

export function installFightEnd() {
    Hooks.on("updateCombat", (combat, changes) => {
        if (!("round" in (changes ?? {}) || "turn" in (changes ?? {}))) return;
        check(combat);
    });
    Hooks.on("deleteCombat", c => { posted.delete(c.id); ending.delete(c.id); });
    Hooks.on("renderChatMessageHTML", (msg, el) => {
        const id = msg.flags?.[MOD]?.fightEnd;
        if (!id) return;
        el?.querySelectorAll?.("button.wcf-fight-end").forEach(b => {
            const combat = game.combats.get(id);
            if (!game.user.isGM || !combat) { b.disabled = true; return; }
            b.addEventListener("click", async ev => { ev.preventDefault(); b.disabled = true; await game.combats.get(id)?.delete(); });
        });
    });
}

export const fightEndApi = { check, idle, rules: FE };
