/**
 * WoDX Actions: day sleep (B4890-B4899).
 *
 *   By itself, as the clock moves     every Cainite the clock covers falls asleep when the sun is up and rises at their
 *                                     own hour after sunset (V20 p. 311, V20 Dark Ages p. 113); the token shows the
 *                                     sleep marker and a word floats over it
 *   The dawn vigil                    a Cainite marked "try to stay awake" rolls the Road at dawn by itself (V20
 *                                     pp. 262-263; Deep and Light Sleeper count); the turns run down in a fight and by
 *                                     the clock, then sleep takes them
 *   Disturbed                         a sleeper who is hurt rolls to wake by itself; a botch sleeps until sundown
 *   Rising                            heals bashing and lethal with blood above the hunger line on waking (setting)
 *
 * Rolls for a Storyteller character go to the Storyteller only. Pure rules: daysleep-rules.js.
 */
import * as DS from "./daysleep-rules.js";
import * as P from "./profiles.js";
import * as TH from "./trait-hooks.js";

const MOD = "wodx-actions";
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const ownerIds = a => game.users.filter(u => u.isGM || a?.testUserPermission?.(u, "OWNER")).map(u => u.id);
export const SOCKET_FLOAT = "float";

/** A word over a token on this client (the socket sends it to the others). */
export function floatLocal({ tokens = [], word = "", color = "#ffffff" } = {}) {
    try {
        if (!globalThis.canvas?.ready || !canvas.interface?.createScrollingText) return;
        for (const id of tokens) {
            const t = canvas.tokens?.get?.(id);
            if (!t?.center || (t.document?.hidden && !game.user.isGM)) continue;
            canvas.interface.createScrollingText(t.center, word, { anchor: CONST.TEXT_ANCHOR_POINTS?.TOP, direction: CONST.TEXT_ANCHOR_POINTS?.TOP,
                distance: canvas.grid?.size ?? 100, fontSize: 26, fill: color, stroke: 0x000000, strokeThickness: 4, duration: 2600 });
        }
    } catch (e) { /* no canvas */ }
}

export function build(ctx) {
    const { rollPool, rollBlock, setting, setFlag } = ctx;
    const on = () => { try { return setting("daySleep") !== false; } catch (e) { return true; } };
    const rating = a => n(a?.system?.advantages?.path?.permanent);
    const isKindred = a => !!a && P.detectProfile(a) === "kindred";
    const asleep = a => a?.getFlag?.(MOD, "daySleep") ?? null;

    /** The clock's sun: {isNight, toDusk, timeLabel}. isNight null when the Chronicle is missing. */
    async function sunClock(now = game.time.worldTime) {
        try {
            const cal = await import("../../wodx-chronicle/scripts/calendar.mjs");
            const lat = game.settings.get("wodx-chronicle", "latitude");
            const t = cal.describeTime(now, lat);
            return { isNight: t.isNight, toDusk: cal.secondsToNextDusk(now, lat), timeLabel: t.timeLabel ?? "" };
        } catch (e) { return { isNight: null, toDusk: null, timeLabel: "" }; }
    }

    /** Show it over every token of the actor on the scene, for everyone. */
    function float(a, word, color) {
        const tokens = (a.getActiveTokens?.() ?? []).map(t => t.id ?? t.document?.id).filter(Boolean);
        if (!tokens.length) return;
        const p = { tokens, word, color };
        floatLocal(p);
        try { game.socket?.emit?.(`module.${MOD}`, { action: SOCKET_FLOAT, ...p }); } catch (e) { /* offline */ }
    }

    async function fallAsleep(a, sun, { deep = false } = {}) {
        if (asleep(a) && !deep) return null;
        const now = game.time.worldTime;
        await setFlag(a, "daySleep", { since: now, wakeAt: DS.wakeAt(now, sun.toDusk, rating(a)), deep: !!deep });
        if (a.getFlag?.(MOD, "daytime")) await setFlag(a, "daytime", null);
        await ctx.statusEffect(a, "sleep", true);
        float(a, deep ? "Deep in the day's sleep" : "Asleep", "#9fb4ff");
        return deep ? "falls into a deep sleep until sundown" : "falls into the day's sleep";
    }

    async function wake(a, { rising = true } = {}) {
        if (!asleep(a)) return null;
        await setFlag(a, "daySleep", null);
        await ctx.statusEffect(a, "sleep", false);
        float(a, rising ? "Rises" : "Wakes", "#ffd27f");
        let healed = "";
        if (rising && setting("riseHeal") !== false) {
            const d = a.system?.health?.damage ?? {};
            if (n(d.bashing) + n(d.lethal)) {
                const r = await ctx.riseHeal?.(a, { quiet: true });
                if (r?.text) healed = `; ${r.text}`;
            }
        }
        return `rises${healed}`;
    }

    /** Roll to wake by day (the Awakening roll, V20 pp. 262-263). Returns {res, html, rolls}. */
    async function awakeningRoll(a) {
        const sm = TH.sleepMods(a);
        if (sm.light) return { res: DS.awakening(null, { light: true }), html: "", rolls: [] };
        const rd = rating(a);
        const r = await rollPool(rd, Math.min(10, 8 + sm.diff));
        const res = DS.awakening(r);
        return { res, html: rollBlock(`Road ${rd}${sm.diff ? " (Deep Sleeper +2)" : ""}`, r), rolls: [r.roll].filter(Boolean), uncapped: false };
    }

    /** A card with a roll: public for a player's character, the Storyteller's only for theirs (standing rule 19). */
    async function rollCard(a, title, html, rolls) {
        if (a.hasPlayerOwner) return ctx.post(a, title, html, rolls);
        return ChatMessage.create({ content: `<div class="vta-card"><h3>${esc(title)}</h3>${html}</div>`, rolls: rolls.filter(Boolean),
            whisper: gmIds(), blind: true, speaker: { alias: "WoDX" }, flags: { [MOD]: { info: true } } });
    }

    /** The vigil at dawn: roll the Road to stay up. Returns the line for the card. */
    async function vigil(a, sun) {
        const { res, html, rolls } = await awakeningRoll(a);
        const now = game.time.worldTime;
        await setFlag(a, "vigilDay", DS.dayKey(now, sun.toDusk));
        let line;
        if (res.awake) {
            await setFlag(a, "daytime", DS.daytimeFlag(now, res.turns, TH.sleepMods(a).light ? { uncapped: true } : {}));
            float(a, "Fights the dawn", "#ffb36b");
            line = `stays awake: ${res.text.toLowerCase()}`;
        } else {
            line = await fallAsleep(a, sun, { deep: res.deep });
        }
        await rollCard(a, `${a.name} fights the dawn`, `${html}<div class="vta-big ${res.awake ? "good" : "bad"}">${esc(res.text)}</div>${res.awake && !TH.sleepMods(a).light ? `<div class="vta-note">By day no pool may exceed the Road rating (${rating(a)}).</div>` : ""}`, rolls);
        return line;
    }

    /**
     * Bring every Cainite the clock covers to the state the sun asks for. Returns [{actor, text}] and posts the card.
     * edge: "dawn" or "dusk" when the sun just crossed, for the card's title.
     */
    let busy = false;
    async function tick(o = {}) {
        if (busy) return [];
        busy = true;
        try { return await tickNow(o); } finally { busy = false; }
    }
    async function tickNow({ edge = null } = {}) {
        if (!on()) return [];
        const sun = await sunClock();
        if (sun.isNight === null) return [];
        const now = game.time.worldTime;
        const rows = [];
        for (const a of ctx.clockActors()) {
            if (!isKindred(a) || a.getFlag?.(MOD, "torpor")) continue;
            const s = asleep(a);
            if (s) {
                const due = s.wakeAt === null || s.wakeAt === undefined ? sun.isNight : now >= n(s.wakeAt);
                if (due) { const t = await wake(a); if (t) rows.push({ actor: a, text: t }); }
                if (due && DS.wantsSleep({ ...sun, rating: rating(a) })) { const t = await fallAsleep(a, sun); if (t) rows.push({ actor: a, text: t }); }
                continue;
            }
            const day = a.getFlag?.(MOD, "daytime");
            if (day) {
                if (day.until === undefined || day.until === null) { await setFlag(a, "daytime", { ...day, until: DS.awakeUntil(now, day.turns === "scene" ? "scene" : day.turns) }); continue; }
                if (!DS.daytimeSpent(day, now)) continue;
                await setFlag(a, "daytime", null);
            }
            if (!DS.wantsSleep({ ...sun, rating: rating(a) })) continue;
            const vig = !!a.getFlag?.(MOD, "dawnVigil") && a.getFlag?.(MOD, "vigilDay") !== DS.dayKey(now, sun.toDusk);
            const t = vig ? await vigil(a, sun) : await fallAsleep(a, sun);
            if (t) rows.push({ actor: a, text: t });
        }
        await report(rows, edge, sun);
        return rows;
    }

    /** One card for the players' characters (their owners and the Storyteller), one for the Storyteller's own. */
    async function report(rows, edge, sun) {
        if (!rows.length) return null;
        const title = edge === "dawn" ? `Dawn${sun.timeLabel ? `: ${sun.timeLabel}` : ""}` : edge === "dusk" ? "Nightfall" : `The day's sleep${sun.timeLabel ? `: ${sun.timeLabel}` : ""}`;
        const groups = [rows.filter(r => r.actor.hasPlayerOwner), rows.filter(r => !r.actor.hasPlayerOwner)];
        for (const [i, g] of groups.entries()) {
            if (!g.length) continue;
            const ids = i === 0 ? [...new Set(g.flatMap(r => ownerIds(r.actor)))] : gmIds();
            await ChatMessage.create({ content: `<div class="vta-card"><h3>${esc(title)}</h3><ul>${g.map(r => `<li><b>${esc(r.actor.name)}</b> ${esc(r.text)}.</li>`).join("")}</ul><p class="wodx-quiet">V20 pp. 262-263, 311; V20 Dark Ages p. 113</p></div>`,
                whisper: ids.length ? ids : gmIds(), speaker: { alias: "WoDX" }, flags: { [MOD]: { info: true, daySleep: true } } });
        }
        return true;
    }

    /** A sleeper was hurt: the Awakening roll by itself (being hurt is noticed; no Perception roll). */
    async function onHurt(a) {
        if (!on() || !isKindred(a)) return null;
        const s = asleep(a);
        if (!s || s.deep) return null;
        const { res, html, rolls } = await awakeningRoll(a);
        const sun = await sunClock();
        if (res.awake) {
            await wake(a, { rising: false });
            await setFlag(a, "daytime", DS.daytimeFlag(game.time.worldTime, res.turns, TH.sleepMods(a).light ? { uncapped: true } : {}));
        } else if (res.deep) await fallAsleep(a, sun, { deep: true });
        return rollCard(a, `${a.name} is hurt in the day's sleep`, `${html}<div class="vta-big ${res.awake ? "good" : "bad"}">${esc(res.text)}</div>`, rolls);
    }

    /** The Awaken by day dialog woke them (or a botch sent them deeper). */
    async function afterAwakening(a, res) {
        if (!isKindred(a)) return null;
        if (res?.awake) return wake(a, { rising: false });
        if (res?.botch || res?.deep) return fallAsleep(a, await sunClock(), { deep: true });
        return null;
    }

    /** A new round of a fight: a Cainite held up by the Road loses a turn; at none left, sleep. */
    async function onRound(combat) {
        if (!on()) return [];
        const out = [];
        let sun = null;
        for (const c of combat?.combatants ?? []) {
            const a = c.actor ?? c.token?.actor;
            const day = a?.getFlag?.(MOD, "daytime");
            if (!isKindred(a) || !day || typeof day.turns !== "number") continue;
            const left = day.turns - 1;
            if (left > 0) { await setFlag(a, "daytime", { ...day, turns: left }); continue; }
            await setFlag(a, "daytime", null);
            sun ??= await sunClock();
            if (DS.wantsSleep({ ...sun, rating: rating(a) })) { const t = await fallAsleep(a, sun); if (t) out.push({ actor: a, text: t }); }
        }
        if (out.length) await report(out, null, sun);
        return out;
    }

    return { tick, onHurt, onRound, afterAwakening, fallAsleep, wake, vigil, asleep, sunClock };
}
