/**
 * WoDX Combat 3.9.0 (B807-B810): the fight starter. One call for every trigger (start-rules.js has the rules):
 *
 *   game.wodxCombat.fight.start({scene, tokens, source, why, byHand})
 *     scene   the scene (or its id); tokens: token documents, placeables or ids on it (two or more people)
 *     source  one of SOURCES (region, sight, alarm, attitude, frenzy, attack, outcome, hand)
 *     byHand  the Storyteller asked for it, so it starts at once (still nothing when the starter is Off)
 *
 * Runs on the active Storyteller's client; a player's client passes the request on by socket. Suggest whispers a card
 * with Start the fight; Auto starts it and whispers a card with Undo. The NPCs' households within call come too
 * (WoDX NPC's kinNear). Starting the fight fires Foundry's combatStart, so Initiative rolls itself when that setting
 * says so, and the conductor and the NPCs' tactics take over from there.
 *
 * Also here: a frenzy that begins outside a fight (the frenzied character and the nearest person), and an attack made
 * outside a fight (attacker and target; the attack that opened it has already been rolled, so it stands as the
 * ambush's first blow).
 */
import * as S from "./start-rules.js";

const MOD = "wodx-combat";
const SOCKET = `module.${MOD}`;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const isActiveGM = () => game.user.isGM && (game.users.activeGM ? game.users.activeGM.id === game.user.id : true);
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };
const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
const npc = () => game.modules.get("wodx-npc")?.active ? game.modules.get("wodx-npc")?.api ?? null : null;
const recent = new Map();

export function registerStartSettings() {
    game.settings.register(MOD, "fightStart", {
        name: "Start fights by themselves",
        hint: "When a hostile NPC sees a character, guards on alarm see an intruder, a Reaction region's response is Fight, someone frenzies, an attack is made outside a fight, or a door or region outcome says fight. Suggest whispers you a card with Start the fight; Auto starts it with Undo. Light-touch mode keeps it at Suggest.",
        scope: "world", config: true, type: String, default: "suggest", choices: S.MODES
    });
    game.settings.register(MOD, "fightSightYards", {
        name: "A hostile NPC sees this far, in yards",
        hint: "How far a hostile NPC must be to start a fight on sight, by day. At night it is a third of this. Walls and closed doors block the view.",
        scope: "world", config: true, type: Number, default: 30, range: { min: 5, max: 120, step: 5 }
    });
}

const sceneOf = s => (typeof s === "string" ? game.scenes.get(s) : s) ?? canvas?.scene ?? null;
const docOf = (t, scene) => {
    if (!t) return null;
    if (typeof t === "string") return scene?.tokens?.get(t) ?? null;
    return t.document ?? t;
};
const fightsOn = scene => (game.combats?.contents ?? []).filter(c => c.scene?.id === scene.id || (!c.scene && scene.id === canvas?.scene?.id))
    .map(c => ({ id: c.id, started: !!c.started, tokenIds: c.combatants.map(x => x.tokenId) }));

/** The households within call of each NPC named, from WoDX NPC (none when it is off). */
function withKin(scene, docs) {
    const out = [...docs];
    const kin = npc()?.kinNear;
    if (typeof kin !== "function") return out;
    for (const d of docs) {
        if (d.actor?.hasPlayerOwner) continue;
        for (const id of kin(d) ?? []) { const k = scene.tokens.get(id); if (k && !out.some(o => o.id === k.id)) out.push(k); }
    }
    return out;
}

/**
 * Ask for a fight. Returns {done: "started"|"joined"|"suggested"|"off"|"quiet"|"nothing"|"sent", combat?, message?}.
 */
export async function start({ scene = null, tokens = [], source = "hand", why = "", byHand = false } = {}) {
    const sc = sceneOf(scene);
    if (!sc) return { done: "nothing" };
    const docs = tokens.map(t => docOf(t, sc)).filter(d => d && d.parent?.id === sc.id);
    if (!game.user.isGM) {
        if (!game.users.activeGM) return { done: "nothing" };
        game.socket.emit(SOCKET, { action: "startFight", scene: sc.id, tokens: docs.map(d => d.id), source, why });
        return { done: "sent" };
    }
    if (!isActiveGM()) return { done: "nothing" };
    const mode = S.modeFor({ mode: setting("fightStart") ?? "suggest", lightTouch: !!chron()?.rule?.("lightTouch"), byHand });
    if (mode === "off") return { done: "off" };
    const all = withKin(sc, docs);
    const ids = all.map(d => d.id);
    const plan = S.planStart(fightsOn(sc), ids);
    if (S.nothingToDo(plan, ids)) return { done: "nothing" };
    const key = S.requestKey(source, ids);
    if (!byHand && S.askedRecently(recent, key)) return { done: "quiet" };
    recent.set(key, Date.now());
    const data = { scene: sc.id, tokens: ids, source, why: S.reasonLine(source, why), named: docs.map(d => d.id) };
    if (mode === "suggest") {
        const message = await ChatMessage.create({ speaker: { alias: "WoDX Combat" }, whisper: gmIds(), content: cardHtml(data, sc), flags: { [MOD]: { fightStart: data } } });
        return { done: "suggested", message };
    }
    const res = await begin(data);
    if (!res) return { done: "nothing" };
    const message = await ChatMessage.create({ speaker: { alias: "WoDX Combat" }, whisper: gmIds(), content: cardHtml({ ...data, ...res }, sc), flags: { [MOD]: { fightStart: { ...data, ...res } } } });
    return { done: res.created || res.startedNow ? "started" : "joined", combat: res.combat, message };
}

/** Set up and start the fight now. Returns {combat, created, startedNow, added: [combatant ids]} or null. */
async function begin(data) {
    const sc = game.scenes.get(data.scene);
    if (!sc) return null;
    const ids = data.tokens.filter(id => sc.tokens.get(id));
    const plan = S.planStart(fightsOn(sc), ids);
    let combat = plan.use ? game.combats.get(plan.use) : null, created = false;
    if (!combat) { combat = await Combat.create({ scene: sc.id, active: true }); created = true; }
    const made = plan.add.length ? await combat.createEmbeddedDocuments("Combatant", plan.add.map(tokenId => ({ tokenId, sceneId: sc.id, actorId: sc.tokens.get(tokenId)?.actorId }))) : [];
    let startedNow = false;
    if (!combat.started) { if (!combat.active) await combat.activate?.(); await combat.startCombat(); startedNow = true; }
    Hooks.callAll("wodxFightStarted", { combat, source: data.source, tokens: ids, created });
    return { combat: combat.id, created, startedNow, added: made.map(c => c.id), done: true };
}

async function undo(msg) {
    const d = foundry.utils.deepClone(msg.getFlag(MOD, "fightStart"));
    if (!d?.done || d.undone) return;
    const combat = game.combats.get(d.combat);
    if (combat) {
        if (d.created) await combat.delete();
        else {
            const gone = (d.added ?? []).filter(id => combat.combatants.get(id));
            if (gone.length) await combat.deleteEmbeddedDocuments("Combatant", gone);
            if (d.startedNow && combat.started && !combat.combatants.size) await combat.delete();
            else if (d.startedNow && combat.started) await combat.update({ round: 0, turn: null });
        }
    }
    d.undone = true;
    await msg.update({ content: cardHtml(d, game.scenes.get(d.scene)), [`flags.${MOD}.fightStart`]: d });
}

async function accept(msg) {
    const d = foundry.utils.deepClone(msg.getFlag(MOD, "fightStart"));
    if (!d || d.done) return;
    const res = await begin(d);
    if (!res) return ui.notifications.warn("WoDX Combat: the people in this fight are no longer on the scene.");
    const next = { ...d, ...res };
    await msg.update({ content: cardHtml(next, game.scenes.get(d.scene)), [`flags.${MOD}.fightStart`]: next });
}

function cardHtml(d, sc) {
    const names = (d.tokens ?? []).map(id => sc?.tokens?.get(id)?.name).filter(Boolean);
    const kin = (d.tokens ?? []).filter(id => !(d.named ?? []).includes(id)).map(id => sc?.tokens?.get(id)?.name).filter(Boolean);
    const head = d.undone ? "Taken back" : d.done ? (d.created || d.startedNow ? "The fight begins" : "They join the fight") : "A fight is about to start";
    const body = `<p>${esc(d.why)}.</p><p>${esc(names.join(", "))}${kin.length ? ` (with ${esc(kin.join(", "))}, who come at the call)` : ""}.</p>`
        + (d.done && !d.undone && setting("autoInitiative") === "off" ? `<p class="vtc-note">Roll initiative to begin.</p>` : "");
    const btn = d.undone ? "" : d.done ? `<button type="button" class="vtc-fight-undo">Undo</button>` : `<button type="button" class="vtc-fight-go">Start the fight</button>`;
    return `<div class="vtc-card"><h3>${esc(head)}</h3>${body}<div class="vtc-buttons">${btn}</div></div>`;
}

/* ------------------------------------------------------------------ */
/*  Frenzy and attacks outside a fight                                 */
/* ------------------------------------------------------------------ */

const yardsPer = () => { const u = String(canvas?.scene?.grid?.units ?? "").toLowerCase(); return ["ft", "feet", "foot", "'"].includes(u) ? 3 : 1; };
const yards = (a, b) => { try { return canvas.grid.measurePath([a.center, b.center]).distance / yardsPer(); } catch (e) { return null; } };
const inFight = doc => (game.combats?.contents ?? []).some(c => c.started && c.combatants.some(x => x.tokenId === doc.id));
const down = actor => { const h = actor?.system?.health?.damage ?? {}; return (Number(h.bashing) || 0) + (Number(h.lethal) || 0) + (Number(h.aggravated) || 0) >= 7; };

const frenzyWas = new Map();
function onPreUpdateActor(actor, changes) {
    if (foundry.utils.getProperty(changes, "system.conditions.isfrenzy") === undefined) return;
    frenzyWas.set(actor.uuid, !!actor.system?.conditions?.isfrenzy);
}
async function onUpdateActor(actor, changes) {
    if (!isActiveGM()) return;
    const after = foundry.utils.getProperty(changes, "system.conditions.isfrenzy");
    const before = frenzyWas.get(actor.uuid);
    frenzyWas.delete(actor.uuid);
    if (!S.frenzyBegan(before, after)) return;
    const tok = canvas?.tokens?.placeables?.find(t => t.actor === actor || (actor.isToken ? t.document === actor.token : t.actor?.id === actor.id && t.document.actorLink));
    if (!tok || inFight(tok.document)) return;
    const others = canvas.tokens.placeables.filter(t => t.id !== tok.id && t.actor && !t.document.hidden).map(t => ({ id: t.id, yards: yards(tok, t), down: down(t.actor) }));
    const pick = S.frenzyTargets(others, { reach: 20 });
    if (!pick.length) return;
    await start({ scene: tok.document.parent, tokens: [tok.id, ...pick], source: "frenzy", why: `${tok.name} frenzies` });
}

/** Called by the attack after it resolves: an attack made outside a fight starts one. */
export async function afterAttack(attackerTok, targetTok) {
    const a = attackerTok?.document ?? attackerTok, t = targetTok?.document ?? targetTok;
    if (!a || !t || a.id === t.id || a.parent?.id !== t.parent?.id) return null;
    if (inFight(a) && inFight(t)) return null;
    return start({ scene: a.parent, tokens: [a.id, t.id], source: "attack", why: `${a.name} attacks ${t.name} outside a fight: the blow stands as the opening of an ambush` });
}

export function installStarter() {
    Hooks.on("preUpdateActor", onPreUpdateActor);
    Hooks.on("updateActor", (actor, changes) => { onUpdateActor(actor, changes).catch(e => console.error(`${MOD} | fight start`, e)); });
    game.socket.on(SOCKET, p => {
        if (p?.action !== "startFight" || !isActiveGM()) return;
        start({ scene: p.scene, tokens: p.tokens ?? [], source: p.source ?? "attack", why: p.why ?? "" }).catch(e => console.error(`${MOD} | fight start`, e));
    });
    Hooks.on("renderChatMessageHTML", (msg, el) => {
        if (!msg.getFlag(MOD, "fightStart")) return;
        el.querySelectorAll("button.vtc-fight-go, button.vtc-fight-undo").forEach(b => {
            if (!game.user.isGM) { b.remove(); return; }
            b.addEventListener("click", ev => {
                ev.preventDefault(); b.disabled = true;
                (b.classList.contains("vtc-fight-go") ? accept(msg) : undo(msg)).catch(e => console.error(`${MOD} |`, e)).finally(() => { b.disabled = false; });
            });
        });
    });
}

export const fightApi = { start, afterAttack, rules: S };
