/**
 * WoDX Combat 3.7 (B68, B69): the turn conductor. The active Storyteller's client ends each turn when it is done and
 * starts the next, so a fight can run without the Storyteller pressing Next. Players get no new powers: their buttons
 * ask the active Storyteller's client, which does the advancing.
 *
 *   NPC turns: done when WoDX NPC reports the NPC has acted (Auto) or the Storyteller accepted a plan (Suggest).
 *   Player turns (level "everyone"): done when the action is spent (then a countdown with Hold), or the time limit runs out
 *   (the action is held), whichever comes first. End turn always works.
 *   Hold: the character steps in later in the round ("Act next"); an action still held at the round's end is lost.
 *   Extra actions (Celerity, Rage): a second pass at the end of the round, in Initiative order (VtDA20 pdf p. 344,
 *   W20 pdf p. 268).
 *   Never while the game is paused (the X-card pauses it), while damage waits to be applied, while the token is moving,
 *   or while an approval raised this turn waits.
 */
import * as CR from "./conductor-rules.js";

const MOD = "wodx-combat";
const SOCKET = `module.${MOD}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const setting = k => game.settings.get(MOD, k);
const chron = () => game.modules.get("wodx-chronicle")?.api;
const npcApi = () => game.modules.get("wodx-npc")?.active ? game.modules.get("wodx-npc")?.api : null;
const isActiveGM = () => game.user.isGM && (game.users.activeGM ? game.users.activeGM.id === game.user.id : true);
const FLAG = "conductor";

export function registerConductorSettings() {
    const s = (key, name, hint, type, def, extra = {}) => game.settings.register(MOD, key, { name, hint, scope: "world", config: true, type, default: def, ...extra });
    s("turnConductor", "Turns advance on their own",
        "Off: the Storyteller advances every turn. NPC turns: an NPC's turn ends when WoDX NPC has acted or the plan is accepted. Everyone: player characters' turns end too, when the action is spent or the time runs out.",
        String, "off", { choices: CR.LEVELS, onChange: () => refreshBanner() });
    s("conductorGrace", "Countdown after the action (seconds)",
        "Once a player character's action is spent, the turn ends after this many seconds unless the player holds it.",
        Number, 6, { range: { min: 0, max: 60, step: 1 } });
    s("conductorTimer", "Time limit per player turn (seconds, 0 for none)",
        "When the time runs out before the character acts, the action is held for later in the round.",
        Number, 0, { range: { min: 0, max: 600, step: 5 } });
    s("conductorNpcPause", "Pause after an NPC acts (seconds)",
        "Time to read the NPC's cards before the next turn starts.", Number, 3, { range: { min: 0, max: 30, step: 1 } });
}

/* ------------------------------------------------------------------ */
/*  The state of the turn in progress (active Storyteller's client)    */
/* ------------------------------------------------------------------ */

let cur = null; // {key, combatId, combatantId, phase, startedAt, npcDone, npcWaiting, actions, actionSpent, graceEndsAt, timerEndsAt, lastMoveAt}
const npcReports = new Map(); // key -> {acted, waiting, cannotAct}, in case WoDX NPC reports before the turn is set up
let ticking = null, busy = false;

const state = combat => combat?.getFlag(MOD, FLAG) ?? {};
const phaseOf = combat => state(combat).phase === "extra" && state(combat).round === combat.round ? "extra" : "main";
const turnKey = combat => combat?.combatant ? `${combat.id}:${combat.round}:${combat.combatant.id}:${phaseOf(combat)}` : null;
const heldFlag = (c, combat) => { const h = c?.getFlag(MOD, "held"); return h && h.combatId === combat.id && h.round === combat.round; };
const declaredExtra = (c, combat) => { const f = c?.getFlag(MOD, "extra"); return f && f.key === `${combat.id}:${combat.round}` ? Number(f.n) || 0 : 0; };
const rageExtra = (actor, combat) => { const f = actor?.getFlag?.("wodx-actions", "extraActions"); return combat && f?.key === `${combat.id}:${combat.round}` ? Number(f.n) || 0 : 0; };
const extraOf = (c, combat) => declaredExtra(c, combat) + rageExtra(c.actor, combat);
const level = () => { try { return setting("turnConductor"); } catch (e) { return "off"; } };
const NO_ACTION = ["dazed", "incapacitated", "torpor", "staked", "immobilized"];
function cannotAct(c) {
    const a = c?.actor;
    if (!a || c.isDefeated) return true;
    const cond = chron()?.conditions;
    if (NO_ACTION.some(id => cond?.hasCondition?.(a, id))) return true;
    const d = a.system?.health?.damage ?? {};
    return (Number(d.bashing) || 0) + (Number(d.lethal) || 0) + (Number(d.aggravated) || 0) >= 7 && !a.items?.some?.(i => i.type === "Advantage" && i.system?.id === "corpus");
}

function startTurn(combat) {
    const key = turnKey(combat);
    if (!key || cur?.key === key) return;
    const c = combat.combatant, isNPC = !c.actor?.hasPlayerOwner;
    const timer = Number(setting("conductorTimer")) || 0;
    cur = { key, combatId: combat.id, combatantId: c.id, phase: phaseOf(combat), startedAt: Date.now(), npcDone: false, npcWaiting: false,
        actions: 0, actionSpent: false, graceEndsAt: null, lastMoveAt: 0,
        timerEndsAt: !isNPC && level() === "everyone" && timer > 0 ? Date.now() + timer * 1000 : null };
    const early = npcReports.get(key);
    if (early) applyNpcReport(early);
    writeState(combat).catch(e => console.error(`${MOD} | conductor`, e));
}
function writeState(combat) {
    const s = state(combat);
    const data = { ...s, key: cur?.key ?? null, round: combat.round, graceEndsAt: cur?.graceEndsAt ?? null, timerEndsAt: cur?.timerEndsAt ?? null };
    return combat.setFlag(MOD, FLAG, data);
}
function applyNpcReport(r) {
    if (r.waiting) cur.npcWaiting = true;
    if (r.acted || r.cannotAct) { cur.npcDone = true; cur.npcWaiting = false; cur.npcDoneAt = Date.now(); }
}

/** WoDX NPC reports here: Hooks.callAll("wodxNpcTurnDone", {combatId, combatantId, acted, waiting, cannotAct}). */
function onNpcReport(r) {
    const combat = game.combats.get(r.combatId);
    if (!combat) return;
    const key = `${combat.id}:${combat.round}:${r.combatantId}:${phaseOf(combat)}`;
    npcReports.set(key, r);
    if (cur?.key === key) applyNpcReport(r);
}

/** A card by the current player character counts as their action (WoDX Combat's attacks, WoDX Actions' cards). */
function onMessage(msg) {
    if (!isActiveGM()) return;
    if (!cur && game.combat?.started && level() !== "off") startTurn(game.combat);
    if (!cur) return;
    const combat = game.combats.get(cur.combatId), c = combat?.combatants.get(cur.combatantId);
    if (!c?.actor || !c.actor.hasPlayerOwner) return;
    const atk = msg.getFlag(MOD, "data");
    const mine = atk ? atk.attacker === c.actor.uuid
        : (!!msg.flags?.["wodx-actions"] && (msg.speaker?.actor === c.actor.id || msg.speaker?.token === c.tokenId) && !msg.whisper?.length);
    if (!mine) return;
    cur.actions += 1;
    const allowed = cur.phase === "extra" ? Math.max(1, extraOf(c, combat)) : 1;
    if (cur.actions >= allowed && !cur.actionSpent) {
        cur.actionSpent = true;
        cur.graceEndsAt = Date.now() + (Number(setting("conductorGrace")) || 0) * 1000;
        writeState(combat);
    }
}

function blocks(combat) {
    const c = combat.combatant;
    const recent = (game.messages?.contents ?? []).slice(-60).map(m => m.getFlag?.(MOD, "data")).filter(Boolean);
    const pendingDamage = recent.some(d => d.combatId === combat.id && d.round === combat.round && Number(d.levels) > 0 && !d.applied && !d.undone);
    const moving = !!cur?.lastMoveAt && Date.now() - cur.lastMoveAt < 1500;
    const pendingApproval = (chron()?.approvals?.pending?.() ?? []).some(p => Number(p.createdAt) >= (cur?.startedAt ?? Infinity));
    return { pendingDamage, moving, pendingApproval: pendingApproval && !!c };
}

async function tick() {
    if (busy || !isActiveGM()) return;
    const combat = game.combat;
    if (!combat?.started || level() === "off" || state(combat).paused) return;
    if (!combat.combatant) return;
    startTurn(combat);
    if (!cur) return;
    const c = combat.combatant, isNPC = !c.actor?.hasPlayerOwner;
    // A time limit set (or the level raised to Everyone) during a player's turn starts counting now
    const limit = Number(setting("conductorTimer")) || 0;
    if (!isNPC && !cur.timerEndsAt && !cur.actionSpent && level() === "everyone" && limit > 0) {
        cur.timerEndsAt = Date.now() + limit * 1000;
        writeState(combat).catch(e => console.error(`${MOD} | conductor`, e));
    }
    let npcMode = "suggest";
    try { npcMode = npcApi()?.modeFor?.(c.actor, combat.scene) ?? (npcApi() ? "suggest" : "off"); } catch (e) { /* none */ }
    const npcPause = (Number(setting("conductorNpcPause")) || 0) * 1000;
    const d = CR.decide({
        level: level(), paused: game.paused, phase: cur.phase,
        c: { isNPC, npcMode, cannotAct: cannotAct(c), held: heldFlag(c, combat) && cur.phase === "main" },
        npcDone: cur.npcDone && Date.now() - (cur.npcDoneAt ?? 0) >= npcPause, npcWaiting: cur.npcWaiting,
        actionSpent: cur.actionSpent, graceOver: !!cur.graceEndsAt && Date.now() >= cur.graceEndsAt,
        timerOver: !!cur.timerEndsAt && Date.now() >= cur.timerEndsAt, blocks: blocks(combat)
    });
    cur.why = d.why;
    if (d.act === "wait") return;
    busy = true;
    try {
        if (d.act === "hold") await hold(combat, c, { auto: true });
        else await advance(combat, d.act === "skip" ? `${c.name} cannot act.` : null);
    } finally { busy = false; }
}

/* ------------------------------------------------------------------ */
/*  Moving the fight on                                                */
/* ------------------------------------------------------------------ */

const isLastTurn = combat => {
    const turns = combat.turns, t = combat.turn ?? 0;
    return !turns.slice(t + 1).some(c => !(combat.settings?.skipDefeated && c.isDefeated));
};

/** End the current turn: the next combatant, the extra-action pass, or the next round. */
export async function advance(combat = game.combat, note = null) {
    if (!combat?.started) return null;
    const s = state(combat);
    if (note) await whisperGM(note);
    if (phaseOf(combat) === "extra") {
        const queue = s.queue ?? [], i = (s.index ?? 0) + 1;
        if (i < queue.length) {
            await combat.setFlag(MOD, FLAG, { ...s, index: i });
            return combat.update({ turn: combat.turns.findIndex(c => c.id === queue[i].id) });
        }
        await combat.setFlag(MOD, FLAG, { ...s, phase: "main", queue: [], index: 0 });
        return nextRound(combat);
    }
    if (isLastTurn(combat)) {
        const queue = CR.extraPass(combat.combatants.contents.map(c => ({ id: c.id, initiative: c.initiative, extra: extraOf(c, combat), defeated: c.isDefeated })));
        if (queue.length) {
            await combat.setFlag(MOD, FLAG, { ...s, phase: "extra", round: combat.round, queue, index: 0 });
            await whisperGM(`Extra actions, in Initiative order: ${queue.map(q => `${esc(combat.combatants.get(q.id)?.name)} (${q.n})`).join(", ")} (VtDA20 p. 344; W20 p. 268).`);
            return combat.update({ turn: combat.turns.findIndex(c => c.id === queue[0].id) });
        }
        return nextRound(combat);
    }
    return combat.nextTurn();
}

async function nextRound(combat) {
    const lost = combat.combatants.filter(c => heldFlag(c, combat));
    for (const c of lost) await c.unsetFlag(MOD, "held");
    if (lost.length) await whisperTo(lost, `${lost.map(c => esc(c.name)).join(", ")}: the held action is lost as the turn ends (VtDA20 p. 344).`);
    return combat.nextRound();
}

/** Hold the current character's action: they step in later in the round with "Act next". */
export async function hold(combat = game.combat, c = combat?.combatant, { auto = false } = {}) {
    if (!combat || !c) return null;
    await c.setFlag(MOD, "held", { combatId: combat.id, round: combat.round });
    await whisperTo([c], `${esc(c.name)} holds the action${auto ? " (the turn's time ran out)" : ""}: press Act next to step in later this turn.`);
    if (combat.combatant?.id === c.id) return advance(combat);
    return null;
}

/** A held character acts next: after the current combatant, before the rest. */
export async function stepIn(combat = game.combat, c) {
    if (!combat || !c || !heldFlag(c, combat)) return null;
    const curC = combat.combatant;
    const order = combat.turns.filter(t => t.id !== c.id);
    const at = order.findIndex(t => t.id === curC?.id);
    const next = order[at + 1] ?? null;
    const curInit = Number(curC?.initiative) || 0, nextInit = next ? Number(next.initiative) || 0 : null;
    const ups = [];
    // A tie with the next combatant leaves no room between them: the current combatant moves up a hair first
    const base = nextInit !== null && nextInit >= curInit ? Math.round((nextInit + 0.002) * 10000) / 10000 : curInit;
    if (curC && base !== curInit) ups.push({ _id: curC.id, initiative: base });
    const init = CR.stepInInitiative(base, nextInit);
    ups.push({ _id: c.id, initiative: init });
    await c.unsetFlag(MOD, "held");
    await combat.updateEmbeddedDocuments("Combatant", ups);
    // The re-sort can move the current combatant's index: keep the turn on them
    const idx = combat.turns.findIndex(t => t.id === curC?.id);
    if (idx >= 0 && idx !== combat.turn) await combat.update({ turn: idx });
    await whisperTo([c], `${esc(c.name)} steps in: acting next.`);
    return init;
}

/** Declare one more extra action this turn (Celerity's multiple actions; Rage is counted from WoDX Actions). */
export async function declareExtra(combat = game.combat, c, n = 1) {
    if (!combat || !c) return null;
    const have = declaredExtra(c, combat);
    await c.setFlag(MOD, "extra", { key: `${combat.id}:${combat.round}`, n: Math.max(0, have + n) });
    return have + n;
}

async function whisperGM(text) {
    return ChatMessage.create({ whisper: game.users.filter(u => u.isGM).map(u => u.id), content: `<div class="vtc-card wodx-x"><div class="vta-body">${text}</div></div>`, flags: { [MOD]: { conductor: true } } });
}
async function whisperTo(combatants, text) {
    const ids = new Set(game.users.filter(u => u.isGM).map(u => u.id));
    for (const c of combatants) for (const u of game.users) if (!u.isGM && c.actor?.testUserPermission?.(u, "OWNER")) ids.add(u.id);
    return ChatMessage.create({ whisper: [...ids], content: `<div class="vtc-card wodx-x"><div class="vta-body">${text}</div></div>`, flags: { [MOD]: { conductor: true } } });
}

/* ------------------------------------------------------------------ */
/*  Requests from players (and the Storyteller's own buttons)          */
/* ------------------------------------------------------------------ */

export function request(action, combatantId = null) {
    const combat = game.combat;
    if (!combat) return;
    const p = { conductor: true, action, combatId: combat.id, combatantId, userId: game.user.id };
    if (isActiveGM()) return onRequest(p);
    game.socket.emit(SOCKET, p);
}
async function onRequest(p) {
    if (!p?.conductor || !isActiveGM()) return;
    const combat = game.combats.get(p.combatId);
    if (!combat) return;
    const user = game.users.get(p.userId);
    const c = p.combatantId ? combat.combatants.get(p.combatantId) : combat.combatant;
    const owns = !!user && (user.isGM || !!c?.actor?.testUserPermission?.(user, "OWNER"));
    if (!owns) return;
    switch (p.action) {
        case "end": if (combat.combatant?.id === c?.id) return advance(combat); return;
        case "hold": if (combat.combatant?.id === c?.id) return hold(combat, c); return;
        case "stepIn": return stepIn(combat, c);
        case "extra": return declareExtra(combat, c, 1);
        case "back": if (user.isGM) return combat.previousTurn(); return;
        case "pause": if (user.isGM) return combat.setFlag(MOD, FLAG, { ...state(combat), paused: !state(combat).paused }); return;
    }
}

/* ------------------------------------------------------------------ */
/*  The turn banner (every client)                                     */
/* ------------------------------------------------------------------ */

let bannerTimer = null;
export function refreshBanner() {
    const el0 = document.getElementById("wodx-turn-banner");
    const combat = game.combat;
    const lv = level();
    if (!combat?.started || lv === "off" || !combat.combatant || combat.scene?.id !== canvas?.scene?.id) { el0?.remove(); return; }
    const c = combat.combatant, s = state(combat);
    const mine = !!c.actor?.isOwner && !game.user.isGM;
    const held = combat.combatants.filter(x => heldFlag(x, combat) && (game.user.isGM || x.actor?.isOwner));
    if (!game.user.isGM && !mine && !held.length) { el0?.remove(); return; }
    const el = el0 ?? Object.assign(document.createElement("div"), { id: "wodx-turn-banner", className: "wodx-turn-banner wodx-x" });
    const left = CR.secondsLeft(s.graceEndsAt) ?? CR.secondsLeft(s.timerEndsAt);
    const extraPhase = phaseOf(combat) === "extra";
    const who = mine ? "Your turn" : `${esc(c.name)}'s turn`;
    const btn = (a, label, id = "") => `<button type="button" data-wodx-turn="${a}"${id ? ` data-id="${id}"` : ""}>${label}</button>`;
    el.innerHTML = `<div class="wtb-row"><b>${who}${extraPhase ? " (extra actions)" : ""}</b>`
        + (left !== null ? ` <span class="wtb-count" aria-live="polite">${s.graceEndsAt ? "ending in" : "time left"} ${left}s</span>` : "")
        + (s.paused ? ` <span class="wtb-count">conductor paused</span>` : "")
        + `</div><div class="wtb-row">`
        + ((mine || game.user.isGM) ? btn("end", "End turn") + (extraPhase ? "" : btn("hold", "Hold")) + (extraPhase ? "" : btn("extra", "+1 extra action")) : "")
        + (game.user.isGM ? btn("back", "Step back") + btn("pause", s.paused ? "Resume" : "Pause") : "")
        + `</div>`
        + (held.length ? `<div class="wtb-row">Holding: ${held.map(x => `${esc(x.name)} ${btn("stepIn", "Act next", x.id)}`).join(" ")}</div>` : "");
    if (!el0) {
        document.body.appendChild(el);
        el.addEventListener("click", ev => {
            const b = ev.target.closest("button[data-wodx-turn]");
            if (b) request(b.dataset.wodxTurn, b.dataset.id || (b.dataset.wodxTurn === "stepIn" ? null : game.combat?.combatant?.id));
        });
    }
    if (!bannerTimer) bannerTimer = setInterval(() => {
        const st = state(game.combat);
        if (document.getElementById("wodx-turn-banner") && (st.graceEndsAt || st.timerEndsAt)) refreshBanner();
    }, 1000);
    bannerTimer?.unref?.();
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

export function installConductor() {
    game.socket.on(SOCKET, p => { if (p?.conductor) onRequest(p).catch(e => console.error(`${MOD} | conductor`, e)); });
    Hooks.on("wodxNpcTurnDone", r => { try { onNpcReport(r); } catch (e) { console.error(e); } });
    Hooks.on("createChatMessage", msg => { try { onMessage(msg); } catch (e) { console.error(e); } });
    // The turn moved (Next, Step back, or set by hand): coming back to a turn starts it afresh
    Hooks.on("updateCombat", (combat, changes) => {
        if (cur?.combatId !== combat.id || !("turn" in (changes ?? {}) || "round" in (changes ?? {}))) return;
        cur = null;
        if (isActiveGM() && combat.started && level() !== "off") startTurn(combat);
    });
    Hooks.on("updateToken", (doc, changes) => {
        if (cur && ("x" in changes || "y" in changes) && game.combat?.combatants.get(cur.combatantId)?.tokenId === doc.id) cur.lastMoveAt = Date.now();
    });
    for (const h of ["combatTurnChange", "updateCombat", "deleteCombat", "combatStart", "canvasReady", "updateCombatant"]) Hooks.on(h, () => refreshBanner());
    ticking = setInterval(() => tick().catch(e => { busy = false; console.error(`${MOD} | conductor`, e); }), 500);
    ticking?.unref?.(); // Node (the harness) only: the browser has no unref
    refreshBanner();
}

export const conductorApi = { advance, hold, stepIn, declareExtra, request, refreshBanner, rules: CR, state: () => ({ ...(cur ?? {}) }) };
