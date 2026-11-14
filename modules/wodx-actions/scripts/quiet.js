/**
 * WoDX Actions (B3550, B3551): the Quiet as a state (Mage 20th pp. 555-559), the Foundry part. Rules: quiet-rules.js.
 *
 *   Storyteller   bring it on (form and cause), send a vision only the mage's player sees, show a token only that
 *                 player sees, whisper a false line in someone's name, send the mage into a mindscape, a cure by
 *                 another mage, end it
 *   Player        rise out of it: a Willpower point and three successes in one roll take a Paradox point away
 *
 * The state is the actor flag wodx-actions.quiet; its level follows the current Paradox pool. Tokens only one player
 * sees carry wodx-actions.quietSeen (user ids); refreshToken hides them from everyone else.
 */
import * as Q from "./quiet-rules.js";

const MOD = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const cap = s => String(s ?? "").replace(/^./, c => c.toUpperCase());

/** The players (not the Storyteller) who own an actor. */
export const playersOf = actor => (game.users?.filter?.(u => !u.isGM && actor?.testUserPermission?.(u, "OWNER")) ?? []).map(u => u.id);
const gmIds = () => (game.users?.filter?.(u => u.isGM) ?? []).map(u => u.id);

/** Hide a token from everyone but the players it was shown to (and the Storyteller). Called from refreshToken. */
export function onRefreshToken(token) {
    try {
        const ids = token?.document?.getFlag?.(MOD, "quietSeen");
        if (!Q.hiddenFrom(ids, game.user?.id, game.user?.isGM)) return;
        token.visible = false;
        if (token.mesh) token.mesh.visible = false;
        if (token.nameplate) token.nameplate.visible = false;
    } catch (e) { /* a token mid-draw */ }
}

/** On a card only for the Storyteller: say what it is (a vision or a false line) without changing the message. */
export function markCard(message, el) {
    const f = message?.flags?.[MOD]?.quiet;
    if (!f || !game.user?.isGM || !el) return;
    const root = el.querySelector?.(".message-content") ?? el;
    if (root.querySelector?.(".wodx-quiet-st")) return;
    const p = document.createElement("p");
    p.className = "wodx-quiet wodx-quiet-st";
    p.textContent = f === "line" ? `The Quiet: a false line, seen only by ${message.flags[MOD].mage ?? "the mage"}'s player.` : `The Quiet: a vision only ${message.flags[MOD].mage ?? "the mage"}'s player sees.`;
    root.prepend(p);
}

export function build(ctx) {
    const { post, rollPool, rollBlock, dialog, spendWillpower, notify, info, setParadox, age, setFlag } = ctx;
    const state = actor => Q.cleanQuiet(actor?.getFlag?.(MOD, "quiet"));
    const now = () => game.time?.worldTime ?? 0;

    /** Clear the state and every token shown only to this mage's players. */
    async function endQuiet(actor, why) {
        const q = state(actor);
        if (!q) return null;
        for (const id of q.seen) {
            const t = canvas?.scene?.tokens?.get(id) ?? game.scenes?.contents?.flatMap(s => s.tokens?.contents ?? []).find(d => d.id === id);
            try { await t?.unsetFlag?.(MOD, "quietSeen"); } catch (e) { /* gone */ }
        }
        await setFlag(actor, "quiet", null);
        return post(actor, `${actor.name}: the Quiet lifts`, `<div class="vta-res good">${esc(why)}</div><div class="wodx-quiet">${Q.REF}</div>`);
    }
    /** After the pool changes: end the Quiet if it is empty. */
    async function check(actor) {
        const q = state(actor);
        if (q && Q.over(info(actor).paradox)) return endQuiet(actor, "The Paradox pool is empty, and the madness with it.");
        return null;
    }

    function summary(actor) {
        const q = state(actor), i = info(actor), lv = Q.levelOf(i.paradox);
        if (!q) return `<p><b>${esc(actor.name)}</b> is not in Quiet. Paradox ${i.paradox}${lv.level ? ` (a Quiet now would be level ${lv.level}: ${esc(lv.text)})` : ""}.</p>`;
        const t = Q.TYPES[q.type];
        return `<p><b>${esc(actor.name)}</b>: ${esc(t.label)} Quiet, level ${lv.level} (Paradox ${i.paradox}). ${esc(cap(Q.effectOf(q.type, lv.level)))}.</p>
          ${Q.othersSee(q.type, lv.level) ? `<p class="hint">At this level other people start to see the visions too.</p>` : ""}
          ${q.mindscape ? `<p class="hint">In a mindscape: ${q.mindscape.days} day${q.mindscape.days === 1 ? "" : "s"} from when it began.</p>` : ""}`;
    }

    async function panel(actor) {
        if (!actor) return null;
        const a = age();
        if (a?.key === "dark") return notify(`${actor.name}: before 1450 a mage follows Dark Ages: Mage, which has no Quiet state; the Storyteller rules on madness.`);
        const gm = !!game.user?.isGM, q = state(actor);
        const others = [...(canvas?.tokens?.controlled ?? [])].filter(t => t.actor?.id !== actor.id);
        const opts = gm ? [
            ["fall", "Bring the Quiet on", !q], ["vision", "Send a vision only the player sees", !!q], ["token", `Show the selected token${others.length === 1 ? "" : "s"} only to the player (${others.length} selected)`, !!q],
            ["line", "Whisper a false line in someone's name", !!q], ["rise", "Rise out of it (the mage's roll)", !!q], ["mindscape", "Into a mindscape", !!q],
            ["out", "Out of the mindscape: the pool clears", !!q?.mindscape], ["cure", "Cured by another mage (Mind 4, Prime 4)", !!q], ["end", "End the Quiet (Storyteller)", !!q]
        ] : [["rise", "Rise out of it: a Willpower point, three successes in one roll", !!q]];
        const live = opts.filter(o => o[2]);
        if (!live.length) return notify(`${actor.name} is not in Quiet.`);
        const content = `<form>${summary(actor)}
          <div class="form-group"><label>Do</label><select name="mode" data-fixed>${live.map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></div>
          ${gm ? `<div class="form-group"><label>Form (bringing it on)</label><select name="type" data-fixed>${Q.TYPE_KEYS.map(k => `<option value="${k}">${esc(Q.TYPES[k].label)}: ${esc(Q.TYPES[k].gloss)}</option>`).join("")}</select></div>
          <div class="form-group"><label>Cause</label><select name="cause" data-fixed>${Object.entries(Q.CAUSES).map(([k, l]) => `<option value="${k}">${esc(cap(l))}</option>`).join("")}</select></div>
          <div class="form-group"><label>Speaker (false line)</label><input type="text" name="speaker" placeholder="a name the player knows"/></div>
          <div class="form-group"><label>Text (vision or line)</label><textarea name="text" rows="3"></textarea></div>
          <div class="form-group"><label>Healer's Quintessence (cure)</label><input type="number" name="quint" min="0" max="60" value="0"/></div>` : ""}
          <div class="form-group"><label><input type="checkbox" name="optional"/> Optional rule: rising is at the Quiet level + 5</label></div>
          <p class="hint">${Q.REF}.</p></form>`;
        return dialog(`The Quiet: ${actor.name}`, content, "Go", fd => act(actor, fd, others), { width: 520 });
    }

    async function act(actor, fd, others = []) {
        const i = info(actor), lv = Q.levelOf(i.paradox), q = state(actor), who = playersOf(actor);
        switch (fd.mode) {
            case "fall": {
                if (!lv.level) { notify(`${actor.name} has no Paradox: there is nothing for a Quiet to feed on.`); return null; }
                await setFlag(actor, "quiet", { type: Q.TYPES[fd.type] ? fd.type : "madness", cause: fd.cause, since: now(), seen: [] });
                return post(actor, `${actor.name} falls into Quiet`, `<div class="vta-big bad">${esc(Q.TYPES[fd.type]?.label ?? "Madness")}, level ${lv.level}.</div><div class="vta-res">${esc(cap(Q.effectOf(fd.type, lv.level)))}.</div>${Q.marauder(lv.level) ? `<div class="vta-note">Level 6: the mage goes Marauder and passes to the Storyteller.</div>` : ""}<div class="wodx-quiet">${esc(cap(Q.CAUSES[fd.cause] ?? ""))}. ${Q.REF}</div>`);
            }
            case "vision": case "line": {
                const text = String(fd.text ?? "").trim();
                if (!text) { notify("Write what the player sees or hears."); return null; }
                if (!who.length) { notify(`${actor.name} has no player to send it to.`); return null; }
                const line = fd.mode === "line";
                return ChatMessage.create({ whisper: who, speaker: line ? { alias: String(fd.speaker ?? "").trim() || "Someone" } : { alias: actor.name },
                    content: line ? `<p>${esc(text)}</p>` : `<div class="wodx-card wodx-quiet-vision"><p><i>${esc(text)}</i></p></div>`,
                    flags: { [MOD]: { quiet: line ? "line" : "vision", mage: actor.name } } });
            }
            case "token": {
                if (!others.length) { notify("Select the token (a hobgoblin, a stranger, a figure) to show only to the player."); return null; }
                if (!who.length) { notify(`${actor.name} has no player to show it to.`); return null; }
                for (const t of others) await t.document.setFlag(MOD, "quietSeen", who);
                await setFlag(actor, "quiet", { ...q, seen: [...new Set([...q.seen, ...others.map(t => t.document.id)])] });
                notify(`${others.map(t => t.name).join(", ")}: now seen only by ${actor.name}'s player and the Storyteller.`);
                return true;
            }
            case "rise": {
                if (!(await spendWillpower(actor, 1))) return null;
                const r = await rollPool(i.willpower.perm, Q.riseDifficulty(lv.level, { optional: !!fd.optional }));
                const out = Q.rise(r);
                let note = "";
                if (out.cleared) { const p = await setParadox(actor, i.paradox - 1); note = ` Paradox ${p.paradox}.`; }
                if (out.hobgoblin) note = ` It lasts ${Q.hobgoblinDays(i.arete)} day${Q.hobgoblinDays(i.arete) === 1 ? "" : "s"} (a day a dot of Arete); the Storyteller gives it shape.`;
                const msg = await post(actor, `${actor.name} fights the Quiet`, rollBlock("Willpower", r) + `<div class="vta-res ${out.cleared ? "good" : "bad"}">${esc(cap(out.text))}.${note}</div><div class="wodx-quiet">The Willpower point is spent either way. ${Q.REF}</div>`, [r.roll].filter(Boolean));
                await check(actor);
                return msg;
            }
            case "mindscape": {
                const t = Q.mindscapeTime(i.paradox);
                await setFlag(actor, "quiet", { ...q, mindscape: { from: now(), days: t.days } });
                return post(actor, `${actor.name} withdraws into a mindscape`, `<div class="vta-res">To the world the mage lies catatonic for about ${t.count} ${t.unit}${t.count === 1 ? "" : "s"} (a ${t.unit} a Paradox point). Coming out clears the Paradox pool.</div>
                  <div class="vta-note">${Q.MINDSCAPE_ROLLS.map(([what, pool]) => `${esc(what)}: ${esc(pool)}`).join("; ")}. Difficulty ${Q.mindscapeDifficulty(lv.level)} (the level + 3).</div><div class="wodx-quiet">${Q.REF}</div>`);
            }
            case "out": {
                await setParadox(actor, i.paradoxPerm);
                await setFlag(actor, "quiet", { ...q, mindscape: null });
                await post(actor, `${actor.name} comes out of the mindscape`, `<div class="vta-res good">The Paradox pool clears${i.paradoxPerm ? ` down to the ${i.paradoxPerm} permanent point${i.paradoxPerm === 1 ? "" : "s"}` : ""}.</div><div class="wodx-quiet">${Q.REF}</div>`);
                return check(actor);
            }
            case "cure": {
                const quint = Math.max(0, n(fd.quint)), points = Math.floor(quint / 2);
                const cost = Q.cureCost(1);
                if (!points) { notify(`The healer needs ${cost.min} to ${cost.max} Quintessence for each Paradox point driven out.`); return null; }
                const left = Math.max(i.paradoxPerm, i.paradox - points);
                await setParadox(actor, left);
                await post(actor, `${actor.name} is helped out of the Quiet`, `<div class="vta-res">${i.paradox - left} Paradox driven out with ${quint} of the healer's Quintessence (two or three a point; Mind 4 and Prime 4, an extended roll). Paradox ${left}.</div><div class="wodx-quiet">${Q.REF}</div>`);
                return check(actor);
            }
            case "end": return endQuiet(actor, "The Storyteller ends the Quiet.");
        }
        return null;
    }

    return { panel, act, state, check, endQuiet, rules: Q };
}
