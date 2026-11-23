/**
 * WoDX Combat: animal swarms of V20 Dark Ages p. 399 (B7677), the Foundry side; swarm-rules.js holds the rules.
 *   The swarm's turn: on its turn in the fight (or from its card) it rolls against everyone whose token stands inside
 *   its token, takes off what each dodged this turn, applies the rest through the soak card, and knocks down and
 *   overruns anyone it hit for three or more before soak.
 *   Dodging the swarm: Dexterity + Athletics at 8, kept for this turn.
 *   Harm to the swarm: counted on the swarm, not a health track; dispersed at its health, gone at two more.
 *   The Storyteller makes a swarm from the chart.
 */
import * as S from "./swarm-rules.js";

const MOD = "wodx-combat";
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
let C = null;
/** main.js hands over what it owns: rollPool, soakAndApply, markFollow, attr, ability. */
export function init(ctx) { C = ctx; }

const roundKey = () => game.combat?.started ? `${game.combat.id}:${game.combat.round}` : "scene";
/** The weapon harm the swarm has taken this turn. */
export function takenThisTurn(actor) {
    const t = S.swarmFlag(actor)?.turn;
    return t && t.key === roundKey() ? n(t.taken) : 0;
}

/** Harm to a swarm, in place of the health track. Returns what appliedHtml reads. */
export async function harm(actor, levels, { area = false } = {}) {
    const f = S.swarmFlag(actor) ?? {}, spec = S.specOf(actor);
    const before = n(f.harm), after = before + Math.max(0, n(levels));
    const taken = area ? takenThisTurn(actor) : takenThisTurn(actor) + Math.max(0, n(levels));
    await actor.update({ [`flags.${MOD}.swarm.harm`]: after, [`flags.${MOD}.swarm.turn`]: { key: roundKey(), taken } });
    const state = S.stateOf(spec, after);
    const label = state === "gone" ? "wiped out" : state === "dispersed" ? "dispersed" : `${Math.max(0, n(spec?.health) - after)} more to disperse it`;
    if (state !== "whole") {
        for (const t of actor.getActiveTokens?.(false, true) ?? []) await t.update({ hidden: true }).catch(() => null);
        if (state === "gone") await actor.toggleStatusEffect?.("dead", { active: true, overlay: true }).catch(() => null);
    }
    const zero = { bashing: 0, lethal: 0, aggravated: 0 };
    return { before: zero, after: zero, swarm: { before, after, state }, condition: { key: state === "whole" ? "ok" : state, text: `${actor.name}: ${after} of ${n(spec?.health)} harm, ${label} (${S.SWARM_DA.page}).` },
        woundLabel: `Swarm ${label}`, penalty: 0, effType: "lethal" };
}

/** The tokens inside the swarm's token. */
export function victimsOf(swarmTok) {
    const d = swarmTok.document ?? swarmTok, gs = canvas.grid.size;
    const x0 = d.x, y0 = d.y, x1 = d.x + n(d.width) * gs, y1 = d.y + n(d.height) * gs;
    return canvas.tokens.placeables.filter(t => t.id !== d.id && t.actor && !t.document.hidden && !S.isSwarm(t.actor)
        && (() => { const c = t.center; return c.x >= x0 && c.x < x1 && c.y >= y0 && c.y < y1; })());
}

/** Dodging the swarm this turn: Dexterity + Athletics at 8. */
export async function dodge(actor) {
    const ab = C.ability(actor, "athletics");
    const dice = C.attr(actor, "dexterity") + n(ab?.value);
    const r = await C.rollPool(dice, S.SWARM_DA.dodgeDiff, { canBotch: true });
    const s = r.botch ? 0 : r.successes;
    await actor.setFlag(MOD, "swarmDodge", { key: roundKey(), successes: s });
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), rolls: r.roll ? [r.roll] : [],
        content: `<div class="vtc-card"><h3>${esc(actor.name)} dodges the swarm</h3><div class="vtc-sec">Dexterity + Athletics: ${dice} dice at ${S.SWARM_DA.dodgeDiff}: ${s} success${s === 1 ? "" : "es"}</div><div class="vtc-note">${s ? `Takes ${s} off the swarm's hits this turn and moves at full speed.` : "No luck: the swarm's full bite, and half speed."}</div><div class="wodx-quiet">${S.SWARM_DA.page}</div></div>` });
    return s;
}
const dodgedNow = actor => { const d = actor?.getFlag?.(MOD, "swarmDodge"); return d && d.key === roundKey() ? n(d.successes) : 0; };
const overrunBy = (actor, swarm) => actor?.getFlag?.(MOD, "swarmOverrun")?.by === swarm.uuid;

/** The swarm's turn: its bite on everyone inside it. */
export async function turn(swarmTok) {
    const swarm = swarmTok?.actor, spec = S.specOf(swarm);
    if (!spec) return null;
    if (S.stateOf(spec, S.swarmFlag(swarm)?.harm) !== "whole") return null;
    const lines = [], rolls = [];
    for (const v of victimsOf(swarmTok)) {
        const over = overrunBy(v.actor, swarm);
        const a = S.attackOn(spec, { overrun: over });
        const r = await C.rollPool(a.dice, a.diff, { canBotch: false });
        if (r.roll) rolls.push(r.roll);
        const dodged = dodgedNow(v.actor);
        const h = S.hitOn(r.successes, dodged);
        let note = `${esc(v.name)}: ${a.dice} dice at ${a.diff}, ${r.successes} success${r.successes === 1 ? "" : "es"}${dodged ? `, ${dodged} dodged` : ""}: ${h.levels ? `${h.levels} ${a.type}` : "no harm"}`;
        if (h.levels) await C.soakAndApply(v, { mode: "levels", amount: h.levels, type: a.type, soak: true, apply: true, swarmBite: true });
        if (h.overrun && !over) {
            await v.actor.setFlag(MOD, "swarmOverrun", { by: swarm.uuid, name: swarm.name });
            await C.markFollow(v.actor, { name: "Knocked down", condition: "knockdown" }).catch(() => null);
            note += `; knocked down and overrun (the swarm now bites at ${S.SWARM_DA.overrunDiff})`;
        }
        note += `; moves ${S.moveIn({ overrun: over || h.overrun, dodged: dodged > 0 })}`;
        lines.push(`<li>${note}.</li>`);
    }
    const content = `<div class="vtc-card"><h3>${esc(swarm.name)} swarms</h3>${lines.length ? `<ul>${lines.join("")}</ul>` : `<div class="vtc-note">No one inside it.</div>`}<div class="vtc-note">Inside it: dodge at ${S.SWARM_DA.dodgeDiff} (Dexterity + Athletics) to take hits off and move at full speed. <button type="button" data-wodx-swarm-dodge>Dodge the swarm</button> Weapons do at most one level a turn to it; fire and other area harm do their full levels.</div><div class="wodx-quiet">${S.SWARM_DA.page}</div></div>`;
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: swarm }), content, rolls, whisper: [] });
    return lines.length;
}

/** Leaving the swarm ends the overrun: a token moved out of it is free of it. */
export function freeOf(tok, swarmTok) {
    return !victimsOf(swarmTok).some(t => t.id === tok.id);
}

/** The Storyteller makes a swarm from the chart, at the middle of the view. */
export async function make(kind = null) {
    if (!game.user.isGM) return ui.notifications.warn("The Storyteller makes swarms.");
    const go = async k => {
        const d = S.swarmActorData(k);
        if (!d) return null;
        const a = await Actor.create(d);
        if (canvas?.scene) {
            const td = await a.getTokenDocument({ x: canvas.stage.pivot.x - canvas.grid.size, y: canvas.stage.pivot.y - canvas.grid.size, width: 2, height: 2 });
            await canvas.scene.createEmbeddedDocuments("Token", [td.toObject()]);
        }
        return a;
    };
    if (kind) return go(kind);
    const opts = Object.entries(S.SWARMS).map(([k, s]) => `<option value="${k}">${esc(s.name)}: ${s.damage} dice, health ${s.health}, Initiative ${s.init}</option>`).join("");
    const k = await foundry.applications.api.DialogV2.prompt({ window: { title: "A swarm (V20 Dark Ages)" }, classes: ["wodx", "wodx-dialog"], rejectClose: false,
        content: `<p>A swarm bites everyone inside its token on its turn (${S.SWARM_DA.page}).</p><div class="form-group"><label>Kind</label><select name="kind">${opts}</select></div>`,
        ok: { label: "Make", callback: (event, button) => button.form.elements.kind.value } });
    return k ? go(k) : null;
}

/** On the swarm's turn in a fight, the active GM rolls its bite. */
export function hooks() {
    // the card's Dodge button: the clicking player's chosen token, else their character
    Hooks.on("renderChatMessageHTML", (msg, el) => {
        for (const b of el.querySelectorAll?.("[data-wodx-swarm-dodge]") ?? []) b.addEventListener("click", ev => {
            ev.preventDefault();
            const a = canvas.tokens.controlled[0]?.actor ?? game.user.character;
            if (!a) return ui.notifications.warn("Choose the token that dodges.");
            dodge(a);
        });
    });
    Hooks.on("updateCombat", (combat, changed) => {
        if (!("turn" in changed || "round" in changed)) return;
        if (!(game.user.isGM && (game.users.activeGM ? game.users.activeGM.isSelf : true))) return;
        const tok = combat.combatant?.token?.object;
        if (tok?.actor && S.isSwarm(tok.actor)) turn(tok).catch(e => console.warn(`${MOD} | swarm`, e));
    });
}

/**
 * B7678: a spider on someone (V20 Dark Ages p. 399): they roll Perception + Alertness at 7 to notice it; unnoticed, it
 * bites, and a poisonous bite does its levels of lethal damage and 1 die off every roll for the scene (p. 360).
 */
export async function spider(tok, { venom = null } = {}) {
    if (!game.user.isGM) return ui.notifications.warn("The Storyteller sets the spiders loose.");
    const t = tok ?? canvas.tokens.controlled[0] ?? [...game.user.targets][0];
    if (!t?.actor) return ui.notifications.warn("Choose the token the spider is on.");
    if (venom === null) {
        venom = await foundry.applications.api.DialogV2.prompt({ window: { title: "A spider (V20 Dark Ages)" }, classes: ["wodx", "wodx-dialog"], rejectClose: false,
            content: `<p>A spider on ${esc(t.name)}: they roll Perception + Alertness at ${S.SPIDER_DA.notice.diff} to notice it (${S.SPIDER_DA.page}).</p><div class="form-group"><label>Its bite</label><select name="venom"><option value="none">Harmless</option><option value="mild">Poisonous: 1 lethal</option><option value="strong">Poisonous: 2 lethal</option><option value="deadly">Poisonous: 3 lethal</option></select></div>`,
            ok: { label: "Set it loose", callback: (event, button) => button.form.elements.venom.value } });
        if (!venom) return null;
    }
    const a = t.actor, N = S.SPIDER_DA.notice;
    const ab = C.ability(a, N.ability);
    const dice = C.attr(a, N.attr) + n(ab?.value);
    const r = await C.rollPool(dice, N.diff, { canBotch: true });
    const bite = S.spiderBite({ noticed: !r.botch && r.successes > 0, venom });
    let note = bite.bitten ? (bite.levels ? `Unnoticed, it bites: the poison does ${bite.levels} lethal and takes 1 die off every roll for the scene (${S.SPIDER_DA.poisonPage}).` : "Unnoticed, it bites; no harm.") : "They notice it and brush it off.";
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: a }), rolls: r.roll ? [r.roll] : [], whisper: game.users.filter(u => u.isGM).map(u => u.id),
        content: `<div class="vtc-card"><h3>A spider on ${esc(a.name)}</h3><div class="vtc-sec">Perception + Alertness: ${dice} dice at ${N.diff}: ${r.successes} success${r.successes === 1 ? "" : "es"}</div><div class="vtc-note">${note}</div><div class="wodx-quiet">${S.SPIDER_DA.page}</div></div>` });
    if (bite.levels) {
        await C.soakAndApply(t, { mode: "levels", amount: bite.levels, type: "lethal", soak: true, apply: true });
        try {
            await game.modules.get("wodx-chronicle")?.api?.applyTimed?.(a, { name: "Poisoned: -1 die", img: "icons/svg/poison.svg", key: "wodx-effect-penalty", data: { dice: S.SPIDER_DA.poisonDice },
                description: "A poisonous bite: 1 die off every roll for the scene.", duration: { kind: "scene" }, source: S.SPIDER_DA.poisonPage });
        } catch (e) { console.warn(`${MOD} | spider`, e); }
    }
    return bite;
}
