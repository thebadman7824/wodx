/**
 * Phase 6d gate (the inner voice), run inside Foundry (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gate6d.mjs?${Date.now()}`)).run()
 * Uses a "WoDX 6d test pack" folder; a player user (the first non-GM) stands in as the voice and another as the
 * character's player. Puts the Inner voices switch back as it was; deletes nothing. Result: Data/wodx-gate/gate6d-result.json.
 */
const R = { started: new Date().toISOString(), steps: [], errors: [] };
const MOD = "wodx-actions";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const A = () => game.wodxActions;
const ok = (name, pass, detail = {}) => { R.steps.push({ name, pass: !!pass, ...detail }); };
const queue = [];
function answer(fill) { queue.push(fill); }
async function onRender(app, el) {
    const f = queue.shift();
    if (!f) return;
    const root = el instanceof HTMLElement ? el : el?.[0];
    await sleep(200);
    let res;
    try { res = await f(root, app); } catch (e) { R.errors.push(`answer: ${e.message}`); }
    if (res === "cancel") { app.close(); return; }
    root.querySelector(`button[data-action="${res ?? "ok"}"]`)?.click();
}
const set = (root, name, value) => {
    const el = root.querySelector(`[name="${name}"]`);
    if (!el) throw new Error(`no field ${name}`);
    if (el.type === "checkbox") el.checked = !!value; else el.value = String(value);
    el.dispatchEvent(new Event("change", { bubbles: true }));
};
const text = m => String(m?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
async function untilMsg(after, pred = () => true, ms = 6000) {
    const t = Date.now();
    while (Date.now() - t < ms) {
        const m = game.messages.contents.slice(after).find(x => /vta-card/.test(x.content ?? "") && pred(x));
        if (m) return m;
        await sleep(100);
    }
    return null;
}
async function step(name, fn) { try { await fn(); } catch (e) { ok(name, false, { error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ") }); } }
const actorOf = a => ({ actor: a });

export async function run() {
    const origErr = console.error;
    console.error = (...a) => { R.errors.push(a.map(x => x?.message ?? String(x)).join(" ").slice(0, 300)); origErr(...a); };
    const hook = Hooks.on("renderDialogV2", onRender);
    const wasOn = game.settings.get(MOD, "voicesOn"), wasPause = game.settings.get(MOD, "voicePause");
    const players = game.users.filter(u => !u.isGM);
    const voiceU = players[0], ownerU = players[1] ?? players[0];
    try {
        await step("versions", async () => {
            ok("versions", /^3\.([5-9]|\d\d)\./.test(A().version) && !!A().innerVoice && typeof game.modules.get("wodx-chronicle").api.approvals?.decide === "function",
                { actions: A().version, chronicle: game.modules.get("wodx-chronicle")?.version, voice: voiceU?.name, owner: ownerU?.name });
        });
        if (!voiceU) { ok("players", false, { error: "No player user to stand in as the voice" }); return; }

        let folder = game.folders.find(f => f.type === "Actor" && f.name === "WoDX 6d test pack");
        if (!folder) folder = await Folder.create({ name: "WoDX 6d test pack", type: "Actor" });
        const get = nm => game.actors.find(a => a.folder?.id === folder.id && a.name === nm);
        const mk = async (nm, type, system) => get(nm) ?? Actor.create({ name: nm, type, folder: folder.id, system, ownership: { default: 0, [ownerU.id]: 3 } });
        const ilse = await mk("Ilse (6d, Kindred)", "Vampire", {});
        const ada = await mk("Ada (6d, wraith)", "Wraith", {});
        const ulf = await mk("Ulf (6d, Garou)", "Werewolf", {});
        await ilse.update({ "system.advantages.bloodpool.temporary": 8, "system.advantages.bloodpool.max": 10, "system.advantages.virtues.selfcontrol.permanent": 3,
            "system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5 });
        await ada.update({ "system.advantages.angst.temporary": 1, "system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5 });
        await ulf.update({ "system.advantages.rage.temporary": 1, "system.advantages.rage.permanent": 5, "system.advantages.willpower.permanent": 6, "system.advantages.willpower.temporary": 6 });
        for (const a of [ilse, ada, ulf]) { await a.unsetFlag(MOD, "voice"); await a.unsetFlag(MOD, "shadowguide"); }
        await game.settings.set(MOD, "voicePause", "");

        await step("each line has its voice", async () => {
            const k = a => A().voicePressure(a)?.kind;
            ok("each line has its voice", k(ilse) === "beast" && k(ada) === "shadow" && k(ulf) === "rage", { ilse: A().voicePressure(ilse), ada: A().voicePressure(ada), ulf: A().voicePressure(ulf) });
        });

        await step("silent until the switch and the opt-in", async () => {
            await game.settings.set(MOD, "voicesOn", false);
            const off = A().voiceLive(ilse);
            await game.settings.set(MOD, "voicesOn", true);
            const noOpt = A().voiceLive(ilse);
            for (const a of [ilse, ada, ulf]) await a.setFlag(MOD, "voice", { optIn: true }); // standing in for the player's own opt-in
            ok("silent until the switch and the opt-in", !off && !noOpt && A().voiceLive(ilse) && A().voiceLive(ada) && A().voiceLive(ulf), { off, noOpt, hasPlayerOwner: ilse.hasPlayerOwner });
        });

        await step("the Storyteller assigns the voices", async () => {
            for (const a of [ilse, ada, ulf]) {
                const n = game.messages.size;
                answer(root => { set(root, "act", "assign"); set(root, "user", voiceU.id); });
                A().innerVoice(actorOf(a));
                await untilMsg(n);
            }
            ok("the Storyteller assigns the voices", [ilse, ada, ulf].every(a => a.getFlag(MOD, "voice")?.user === voiceU.id) && ada.getFlag(MOD, "shadowguide") === voiceU.id,
                { ilse: ilse.getFlag(MOD, "voice"), ada: ada.getFlag(MOD, "voice") });
        });

        await step("a whisper reaches only the character, the voice and the Storyteller", async () => {
            const n = game.messages.size;
            answer(root => { set(root, "act", "whisper"); root.querySelector("[name=text]").value = "Gate 6d: the Beast whispers."; });
            A().innerVoice(actorOf(ilse));
            const m = await untilMsg(n, x => /Gate 6d/.test(x.content));
            const w = m?.whisper ?? [];
            const others = game.users.filter(u => !u.isGM && u.id !== voiceU.id && u.id !== ownerU.id).map(u => u.id);
            ok("a whisper reaches only the character, the voice and the Storyteller", !!m && w.includes(voiceU.id) && w.includes(ownerU.id) && !w.some(id => others.includes(id)),
                { whisper: w.map(id => game.users.get(id)?.name) });
        });

        await step("the voice is told when the pressure rises", async () => {
            const n = game.messages.size;
            await ilse.update({ "system.advantages.bloodpool.temporary": 3 });
            const m = await untilMsg(n, x => /grows/.test(x.content));
            const n2 = game.messages.size;
            await ada.update({ "system.advantages.angst.temporary": 6 });
            const m2 = await untilMsg(n2, x => /grows/.test(x.content));
            const n3 = game.messages.size;
            await ulf.update({ "system.advantages.rage.temporary": 6 });
            const m3 = await untilMsg(n3, x => /grows/.test(x.content));
            ok("the voice is told when the pressure rises", !!m && !!m2 && !!m3, { beast: text(m).slice(0, 120), shadow: text(m2).slice(0, 120), rage: text(m3).slice(0, 120) });
        });

        await step("a proposal goes to the queue; approved, the player's card can be answered", async () => {
            const Q = game.modules.get("wodx-chronicle").api;
            const before = Q.approvals.pending().length;
            answer(root => { set(root, "act", "propose"); set(root, "prop", "frenzy"); root.querySelector("[name=text]").value = "Gate 6d"; });
            A().innerVoice(actorOf(ilse));
            await sleep(1500);
            const entry = Q.approvals.pending().find(p => p.type === "wodx-voice" && p.data?.uuid === ilse.uuid && p.data?.prop === "frenzy");
            const n = game.messages.size;
            if (entry) await Q.approvals.decide(entry.id, "approve", "Gate 6d");
            const card = await untilMsg(n, x => /data-vx="face"/.test(x.content));
            let opened = false;
            const h = Hooks.on("renderDialogV2", (app) => { opened = true; setTimeout(() => app.close(), 300); });
            if (card) {
                const div = document.createElement("div"); div.innerHTML = card.content;
                const b = div.querySelector("[data-vx]");
                await Promise.race([A().voiceButton(b), sleep(1500)]);
            }
            await sleep(800); Hooks.off("renderDialogV2", h);
            ok("a proposal goes to the queue; approved, the player's card can be answered", !!entry && Q.approvals.pending().length === before && !!card && opened,
                { queued: !!entry, card: text(card).slice(0, 160), frenzyDialogOpened: opened });
        });

        await step("the Shadowguide is the Shadow's voice", async () => {
            ok("the Shadowguide is the Shadow's voice", A().wraithInfo(ada) && (game.wodxActions.shadowWhisper !== undefined) && ada.getFlag(MOD, "voice")?.user === voiceU.id, {});
        });

        await step("the X-card pauses every voice until the scene ends", async () => {
            Hooks.callAll("wodxXCard");
            await sleep(800);
            const pausedAll = ![ilse, ada, ulf].some(a => A().voiceLive(a));
            await A().voiceSceneEnd(); // what the "wodxEndScene" hook calls, without ending the scene for everyone's characters
            await sleep(500);
            ok("the X-card pauses every voice until the scene ends", pausedAll && A().voiceLive(ilse), { pausedAll, after: A().voiceLive(ilse) });
        });

        await step("opting out silences the voice", async () => {
            await ulf.setFlag(MOD, "voice", { ...(ulf.getFlag(MOD, "voice") ?? {}), optIn: false });
            ok("opting out silences the voice", !A().voiceLive(ulf) && A().voiceLive(ilse), {});
        });
    } finally {
        Hooks.off("renderDialogV2", hook);
        console.error = origErr;
        await game.settings.set(MOD, "voicesOn", wasOn);
        await game.settings.set(MOD, "voicePause", wasPause);
        R.finished = new Date().toISOString();
        R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
        const file = new File([JSON.stringify(R, null, 1)], "gate6d-result.json", { type: "application/json" });
        await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
    }
    return R.summary;
}
