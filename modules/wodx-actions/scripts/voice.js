/**
 * WoDX Actions 3.5 — the inner voice (Phase 6d, B53–B56). One layer for the Beast, the Shadow, Rage and the Impulse:
 *   - someone plays the voice (another player or the Storyteller), assigned by the Storyteller;
 *   - a private whisper channel: the character's player, the voice and the Storyteller (B55);
 *   - a pressure meter read from the sheet, and a prompt to the voice when it rises;
 *   - proposals: the voice proposes the line's own check, the Storyteller approves it in the queue, and the
 *     character's player rolls it from the card (B53);
 *   - consent: the chronicle switch, each player's opt-in, the X-card pausing every voice for the scene (B56).
 * The wraith's Shadowguide (wraith.js) keeps its book powers and reads its guide from here.
 * Pure rules: voice-rules.js.
 */

import * as V from "./voice-rules.js";
import * as P from "./profiles.js";

const MOD = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const owners = actor => game.users.filter(u => !u.isGM && actor?.testUserPermission?.(u, "OWNER")).map(u => u.id);

export function registerSettings() {
    game.settings.register(MOD, "voicesOn", {
        name: "Inner voices", hint: "Let players voice each other's Beast, Shadow, Rage or Impulse. Each player still opts in for their own character; the X-card pauses every voice for the scene.",
        scope: "world", config: true, type: Boolean, default: false
    });
    game.settings.register(MOD, "voicePause", { scope: "world", config: false, type: String, default: "" });
}

export function build(ctx) {
    const { post, dialog, setFlag, notify, api, virtues, wraithInfo, inquisitor } = ctx;
    const sceneKey = () => `${canvas?.scene?.id ?? "none"}:${n(game.settings.get(MOD, "wraithScene"))}`;

    function kindOf(actor) {
        // Orpheus spooks play on the mortal sheet: their voice is Spite (3.10.0)
        if (actor?.type === "Mortal" && actor.system?.settings?.variant === "orpheus") return "spite";
        return V.kindFor(P.detectProfile(actor));
    }
    function voiceOf(actor) {
        const f = actor?.getFlag?.(MOD, "voice") ?? {};
        return { user: f.user ?? actor?.getFlag?.(MOD, "shadowguide") ?? null, optIn: !!f.optIn };
    }
    const voiceUser = actor => game.users.get(voiceOf(actor).user) ?? null;
    const paused = () => !!game.settings.get(MOD, "voicePause") && game.settings.get(MOD, "voicePause") === sceneKey();
    function live(actor) {
        return V.live({ chronicleOn: game.settings.get(MOD, "voicesOn"), optIn: voiceOf(actor).optIn, hasPlayerOwner: !!actor?.hasPlayerOwner, paused: paused() });
    }
    /** Who may see the meter and the whispers (B55). */
    function recipients(actor) {
        return [...new Set([...gmIds(), voiceOf(actor).user, ...owners(actor)].filter(Boolean))];
    }
    const maySee = actor => game.user.isGM || actor.isOwner || voiceOf(actor).user === game.user.id;
    const isVoice = actor => game.user.isGM || voiceOf(actor).user === game.user.id;

    /** The line's numbers for the meter. */
    const eraNow = () => { try { return game.modules.get("wodx-chronicle")?.api?.eras?.activeEra?.()?.profile?.id ?? null; } catch (e) { return null; } };
    function pressureOf(actor) {
        const kind = kindOf(actor);
        if (!kind) return null;
        const wp = n(actor.system?.advantages?.willpower?.temporary);
        let d = {};
        if (kind === "beast" && actor.type === "Vampire" && actor.system?.settings?.variant === "kindredeast") {
            const a = actor.system.advantages ?? {};
            d = { kote: true, chi: n(a.yinchi?.temporary) + n(a.yangchi?.temporary), po: n(a.po?.permanent), hun: n(a.hun?.permanent) };
        }
        else if (kind === "beast") { const b = P.resource(actor, "blood"); d = { blood: b.value, max: b.max || 10, selfcontrol: virtues(actor).selfcontrol.value }; }
        else if (kind === "shadow") { const w = wraithInfo(actor); d = { angst: w.angst.temp, willpower: w.willpower.temp }; }
        else if (kind === "rage") d = { rage: P.resource(actor, "rage").value, willpower: wp };
        else if (kind === "gift") {
            const f = actor.getFlag?.(MOD, "daMage");
            const da = f?.system === "da" || (f?.system !== "m20" && (f?.fellowship || eraNow() === "dark-ages"));
            if (da) d = { era: "da", temp: n(f?.twilight?.temp), perm: n(f?.twilight?.perm) };
            else {
                const av = actor.items?.find?.(i => i.type === "Feature" && /^avatar|^genius/i.test(i.name ?? ""));
                d = { era: "m20", avatar: n(av?.system?.value), paradox: P.resource(actor, "paradox").value };
            }
        }
        else if (kind === "mists") {
            const f = actor.getFlag?.(MOD, "daFae");
            const da = f?.system === "da" || (f?.system !== "c20" && (f?.origin || eraNow() === "dark-ages"));
            if (da) {
                const day = Math.floor((game.time?.worldTime ?? 0) / 86400);
                const spends = f?.weavingDay?.day === day ? n(f.weavingDay.n) : 0;
                const wp = n(actor.system?.advantages?.willpower?.permanent);
                d = { era: "da", mists: n(f?.mists?.perm), weaving: n(f?.weaving?.perm), willpower: wp, overSpend: spends > n(f?.mists?.perm),
                    lockedRisk: n(f?.weavingStreak) > wp && wp > 0, hiddenDays: f?.hiddenSince != null ? Math.floor(((game.time?.worldTime ?? 0) - n(f.hiddenSince)) / 86400) : null };
            } else {
                const adv = actor.system?.advantages ?? {};
                d = { era: "c20", banality: n(adv.banality?.permanent), banalityPoints: n(adv.banality?.temporary), glamour: n(adv.glamour?.permanent),
                    nightmare: n(adv.nightmare?.temporary), imbalances: n(adv.willpower?.imbalance), willpower: n(adv.willpower?.permanent) };
            }
        }
        else if (kind === "spite") {
            const ad = actor.system?.advantages ?? {};
            d = { rating: n(ad.spite?.permanent), points: n(ad.spite?.temporary), vitality: n(ad.vitality?.permanent) };
        }
        else if (kind === "torment") {
            const t = actor.system?.advantages?.torment ?? {};
            d = { perm: n(t.permanent), temp: n(t.temporary) };
        }
        else if (kind === "impulse") {
            const q = inquisitor(actor);
            if (q) d = { conviction: q.conviction, piety: q.piety };
            else { const v = actor.system?.advantages?.virtues ?? {}; d = { virtue: Math.max(n(v.mercy?.permanent), n(v.vision?.permanent), n(v.zeal?.permanent)) }; }
        }
        return { kind, ...V.pressure(kind, d) };
    }
    const meter = p => `<span class="wodx-voice-meter wodx-voice-${p.level}" title="${esc(p.text)}">${"●".repeat(V.LEVELS.indexOf(p.level) + 1)}${"○".repeat(3 - V.LEVELS.indexOf(p.level))} ${esc(V.LEVEL_LABEL[p.level])}</span>`;

    async function whisperTo(actor, html, { asVoice = false, title = null } = {}) {
        const k = V.KINDS[kindOf(actor)]?.label ?? "The voice";
        return ChatMessage.create({ content: `<div class="vta-card wodx-voice"><h3>${esc(title ?? `${k} of ${actor.name}`)}</h3>${html}</div>`, whisper: recipients(actor),
            speaker: { alias: asVoice ? `${k} of ${actor.name}` : actor.name }, flags: { [MOD]: { voice: actor.uuid } } });
    }

    /** The voice's panel: the meter, a whisper, a proposal; the player's opt-in; the Storyteller's assignment. */
    async function panel(actor) {
        const kind = kindOf(actor);
        if (!kind) return notify(`${actor.name}'s line has no inner voice in WoDX yet.`);
        if (!maySee(actor)) return notify("Only the character's player, its voice and the Storyteller see this.");
        const v = voiceOf(actor), p = pressureOf(actor), K = V.KINDS[kind];
        const on = game.settings.get(MOD, "voicesOn");
        const players = game.users.filter(u => !u.isGM && !actor.testUserPermission(u, "OWNER"));
        const acts = [];
        if (isVoice(actor) || actor.isOwner) acts.push(["whisper", isVoice(actor) && !actor.isOwner ? `Whisper as ${K.label}` : `Answer ${K.label}`]);
        if (isVoice(actor)) acts.push(["propose", "Propose a check to the Storyteller"]);
        if (actor.isOwner && !game.user.isGM) acts.push(["optin", v.optIn ? "Opt out: no voice for this character" : "Opt in: let the voice speak"]);
        const stRule = !!game.modules.get("wodx-chronicle")?.api?.rule?.("storytellerVoiceOptIn");
        if (V.storytellerMayOptIn({ isGM: game.user.isGM, rule: stRule, hasPlayerOwner: actor.hasPlayerOwner }))
            acts.push(["stoptin", v.optIn ? "Storyteller: turn the voice off for the player" : "Storyteller: turn the voice on (the player is told)"]);
        if (game.user.isGM) acts.push(["assign", "Assign who voices it"]);
        const content = `<form class="wodx-voice-panel"><p><b>${esc(actor.name)}</b>: ${esc(K.label)} ${meter(p)}<br><span class="wodx-quiet">${esc(p.text)}. ${esc(K.book)}</span></p>
          <p>${on ? "" : "<b>Inner voices are off for this chronicle</b> (Storyteller: Configure Settings → WoDX Actions). "}${paused() ? "<b>Paused by the X-card until the scene ends.</b> " : ""}Voiced by <b>${esc(voiceUser(actor)?.name ?? "the Storyteller")}</b>${actor.hasPlayerOwner ? `; the player has ${v.optIn ? (v.optInBy === "storyteller" ? "been opted in by the Storyteller" : "opted in") : "<b>not</b> opted in"}` : ""}.</p>
          <div class="form-group"><label>Do</label><select name="act" data-fixed>${acts.map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></div>
          <div class="form-group"><label>Words</label><textarea name="text" rows="3" style="width:100%"></textarea></div>
          <div class="form-group"><label>Check to propose</label><select name="prop" data-fixed>${V.PROPOSALS[kind].map(x => `<option value="${x.id}">${esc(x.label)}</option>`).join("")}</select></div>
          <div class="form-group"><label>Voice (Storyteller)</label><select name="user" data-fixed><option value="">The Storyteller</option>${players.map(u => `<option value="${u.id}" ${u.id === v.user ? "selected" : ""}>${esc(u.name)}</option>`).join("")}</select></div></form>`;
        return dialog(`Inner voice: ${K.label}: ${actor.name}`, content, "Go", async fd => {
            if (fd.act === "assign") {
                if (!game.user.isGM) return null;
                await setFlag(actor, "voice", { ...(actor.getFlag(MOD, "voice") ?? {}), user: fd.user || null });
                if (kind === "shadow") await setFlag(actor, "shadowguide", fd.user || null);
                return whisperTo(actor, `<p>${esc(game.users.get(fd.user)?.name ?? "The Storyteller")} voices ${esc(K.label.toLowerCase())}. ${actor.hasPlayerOwner && !voiceOf(actor).optIn ? "It stays silent until the player opts in." : ""}</p>`, { title: `${K.label}: a voice is chosen` });
            }
            if (fd.act === "stoptin") {
                if (!V.storytellerMayOptIn({ isGM: game.user.isGM, rule: !!game.modules.get("wodx-chronicle")?.api?.rule?.("storytellerVoiceOptIn"), hasPlayerOwner: actor.hasPlayerOwner })) return null;
                await actor.setFlag(MOD, "voice", { ...(actor.getFlag(MOD, "voice") ?? {}), optIn: !v.optIn, optInBy: v.optIn ? null : "storyteller" });
                return whisperTo(actor, v.optIn
                    ? `<p>The Storyteller has turned off the inner voice for ${esc(actor.name)}.</p>`
                    : `<p>The Storyteller has turned on the inner voice for ${esc(actor.name)}: ${esc(K.label.toLowerCase())} may now speak. The player can opt out at any time: WoDX Actions → The inner voice → Opt out.</p>`,
                    { title: `${K.label}: the Storyteller ${v.optIn ? "turns it off" : "turns it on"}` });
            }
            if (fd.act === "optin") {
                await actor.setFlag(MOD, "voice", { ...(actor.getFlag(MOD, "voice") ?? {}), optIn: !v.optIn, optInBy: v.optIn ? null : "player" });
                return whisperTo(actor, `<p>${esc(actor.name)}'s player ${v.optIn ? "has opted out: the voice falls silent" : "has opted in: the voice may speak"}.</p>`, { title: K.label });
            }
            if (!live(actor)) return notify(paused() ? "Voices are paused until the scene ends (X-card)." : !on ? "Inner voices are off for this chronicle." : "The player hasn't opted in.");
            if (fd.act === "whisper") {
                if (!fd.text?.trim()) return null;
                return whisperTo(actor, `<p>${esc(fd.text).replace(/\n/g, "<br>")}</p>`, { asVoice: isVoice(actor) && !actor.isOwner });
            }
            if (fd.act === "propose") return propose(actor, fd.prop, fd.text);
            return null;
        }, { width: 520 });
    }

    /** The voice proposes a check; the Storyteller decides in the approval queue (B53). */
    async function propose(actor, prop, note = "") {
        const kind = kindOf(actor), P2 = V.proposalFor(kind, prop);
        const queue = game.modules.get("wodx-chronicle")?.api;
        if (!P2 || !queue?.propose) return notify("The approval queue (WoDX Chronicle) isn't available.");
        await queue.propose({ type: "wodx-voice", key: `voice:${actor.id}:${prop}:${sceneKey()}`, title: `${V.KINDS[kind].label} of ${actor.name}: ${P2.label}`,
            detail: `${voiceUser(actor)?.name ?? "The Storyteller"} proposes it.${note ? ` “${String(note).slice(0, 300)}”` : ""} Now: ${pressureOf(actor).text}.`,
            data: { uuid: actor.uuid, kind, prop, by: game.user.id } });
        return whisperTo(actor, `<p>${esc(P2.label)}: proposed to the Storyteller.</p>`, { asVoice: true });
    }

    /** Approved: a card the character's player (or the Shadowguide) answers with the line's own roll. */
    async function onApproved(entry) {
        const doc = await fromUuid(entry.data?.uuid);
        const actor = doc?.actor ?? doc;
        const P2 = V.proposalFor(entry.data?.kind, entry.data?.prop);
        if (!actor || !P2) return;
        const who = P2.roller === "guide" ? `${esc(voiceUser(actor)?.name ?? "The Storyteller")} rolls for the Shadow` : `${esc(actor.name)}'s player rolls`;
        const btn = P2.api ? `<button type="button" class="vta-btn" data-vx="face" data-actor="${esc(actor.uuid)}" data-arg="${esc(P2.id)}">Face it</button>` : "";
        return whisperTo(actor, `<p>The Storyteller allows it: <b>${esc(P2.label)}</b>. ${who}.</p>${P2.id === "derangement" ? "<p>A derangement fitting the high Virtue shows itself; a Willpower point holds it back for now (Hunter: The Reckoning pp. 126, 131).</p>" : ""}${btn}`, { title: V.KINDS[entry.data.kind].label });
    }

    async function onChatButton(b) {
        const doc = b.dataset.actor ? await fromUuid(b.dataset.actor) : null;
        const actor = doc?.actor ?? doc;
        if (!actor) return notify("That character is gone.");
        const P2 = V.proposalFor(kindOf(actor), b.dataset.arg);
        if (!P2) return null;
        const mayRoll = P2.roller === "guide" ? isVoice(actor) : (actor.isOwner || game.user.isGM);
        if (!mayRoll) return notify(P2.roller === "guide" ? "The Shadowguide or the Storyteller rolls this." : "The character's player rolls this.");
        const A = api();
        const fn = A?.[P2.api];
        if (!fn) return notify("That roll isn't available.");
        if (P2.id === "harrowing") return fn({ actor, kind: "general" });
        return fn({ actor });
    }

    /* ---------------- prompts when the pressure rises ---------------- */

    const before = new Map();
    function onPreUpdate(actor) { if (kindOf(actor)) before.set(actor.id, pressureOf(actor)?.level); }
    async function onUpdate(actor) {
        if (!isActiveGM() || !before.has(actor.id)) return;
        const was = before.get(actor.id); before.delete(actor.id);
        if (!live(actor)) return;
        const p = pressureOf(actor);
        if (!p || !V.rose(was, p.level) || p.level === "calm") return;
        return whisperTo(actor, `<p>${esc(V.KINDS[p.kind].label)} grows: ${meter(p)}<br><span class="wodx-quiet">${esc(p.text)}</span></p>${voiceUser(actor) ? `<p class="wodx-quiet">${esc(voiceUser(actor).name)}: whisper, or propose a check (The inner voice).</p>` : ""}`, { asVoice: true });
    }
    async function onXCard() {
        if (!isActiveGM()) return;
        await game.settings.set(MOD, "voicePause", sceneKey());
        return ChatMessage.create({ content: `<div class="vta-card"><h3>Voices pause</h3><p>The X-card was used: every inner voice is silent until the scene ends.</p></div>`, whisper: gmIds(), speaker: { alias: "WoDX" } });
    }
    async function onEndScene() { if (isActiveGM() && game.settings.get(MOD, "voicePause")) await game.settings.set(MOD, "voicePause", ""); }

    /** A voice player's list: the characters they voice. The Storyteller's list: every character with a voice. */
    async function mine() {
        const list = game.actors.filter(a => kindOf(a) && (game.user.isGM ? (a.hasPlayerOwner || voiceOf(a).user) : voiceOf(a).user === game.user.id));
        if (!list.length) return notify(game.user.isGM ? "No character with a voice has a player or a voice yet." : "You don't voice anyone.");
        const content = `<form><p>${game.user.isGM ? "Characters with an inner voice." : "The voices you play."}</p>
          <div class="form-group"><label>Character</label><select name="a" data-fixed>${list.map(a => `<option value="${a.id}">${esc(`${a.name}: ${V.KINDS[kindOf(a)].label} (${V.LEVEL_LABEL[pressureOf(a).level]}; ${live(a) ? "live" : "silent"})`)}</option>`).join("")}</select></div></form>`;
        return dialog("Inner voices", content, "Open", fd => panel(game.actors.get(fd.a)));
    }

    return { kindOf, voiceOf, live, recipients, pressureOf, panel, propose, onApproved, onChatButton, onPreUpdate, onUpdate, onXCard, onEndScene, mine, whisperTo };
}
