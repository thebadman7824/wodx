/**
 * Phase 6l gate (the crucible, WoDX Actions 3.10.0), in Foundry (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gate6i.mjs?${Date.now()}`)).run()
 * Makes (or reuses) a Poltergeist skimmer and a Wisp spirit (the system's mortal sheet set to Orpheus) in the folder "WoDX 6l test pack", answers the dialogs itself, and checks
 * what each action changes. Writes chat cards and that actor's sheet; deletes nothing. Result: Data/wodx-gate/gate6l-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const A = () => game.wodxActions;
const MOD = "wodx-actions";
const R = { started: new Date().toISOString(), steps: [], errors: [] };
const ok = (name, pass, detail = {}) => R.steps.push({ name, pass: !!pass, ...detail });
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
async function untilMsg(after, want = /./, ms = 15000) {
    const t = Date.now();
    while (Date.now() - t < ms) { const m = game.messages.contents.slice(after).find(x => /vta-card/.test(x.content ?? "") && want.test(text(x))); if (m) return m; await sleep(100); }
    return null;
}
async function step(name, fn) { try { await fn(); } catch (e) { ok(name, false, { error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ") }); } }
const adv = a => a.system.advantages;
const VT = a => Number(adv(a).vitality.temporary), SP = a => Number(adv(a).spite.temporary), SR = a => Number(adv(a).spite.permanent), WP = a => Number(adv(a).willpower.temporary);
const base = (shade, lament) => ({ "system.settings.variant": "orpheus", "system.settings.hasvitality": true, "system.settings.hasspite": true,
    "system.variant.shade": shade, "system.variant.lament": lament, "system.variant.role": "Gate 6l", "system.nature": "Critic",
    "system.advantages.vitality.permanent": 6, "system.advantages.vitality.temporary": 5, "system.advantages.spite.permanent": 3, "system.advantages.spite.temporary": 5,
    "system.advantages.willpower.permanent": 6, "system.advantages.willpower.temporary": 6, "system.attributes.dexterity.value": 3, "system.attributes.dexterity.total": 3,
    "system.health.damage.bashing": 0, "system.health.damage.lethal": 0, "system.health.damage.aggravated": 0 });

async function makeSpook(name, shade, lament) {
    let folder = game.folders.find(f => f.type === "Actor" && f.name === "WoDX 6l test pack");
    if (!folder) folder = await Folder.create({ name: "WoDX 6l test pack", type: "Actor" });
    let a = game.actors.find(x => x.folder?.id === folder.id && x.name === name);
    if (!a) { a = await Actor.create({ name, type: "Mortal", folder: folder.id, system: { settings: { variant: "orpheus" } },
        items: [{ name: "Helter Skelter", type: "Power", system: { game: "orpheus", type: "wod.types.horror", value: 2 } }] }); await sleep(1500); }
    await a.update(base(shade, lament));
    if (a.getFlag(MOD, "orpheus") !== undefined) await a.unsetFlag(MOD, "orpheus");
    return a;
}

export async function run() {
    const hook = Hooks.on("renderDialogV2", onRender);
    const origErr = console.error;
    console.error = (...a) => { R.errors.push(a.map(x => x?.stack ? String(x.stack).split("\n").slice(0, 4).join(" | ") : String(x)).join(" ")); origErr.apply(console, a); };
    let sk, wi;
    // The inner voice prompts the Storyteller when Spite rises; that prompt would take a dialog answer meant for a step
    const voices = game.settings.get(MOD, "voicesOn");
    if (voices) await game.settings.set(MOD, "voicesOn", false);
    try {
        await step("the Shade, Lament, Vitality, Spite and Horrors are read", async () => {
            sk = await makeSpook("Craig (6l, a Poltergeist skimmer)", "Poltergeist", "Skimmer");
            wi = await makeSpook("Liza (6l, a Wisp spirit)", "Wisp", "Spirit");
            const i = A().orphInfo(sk);
            ok("the Shade, Lament, Vitality, Spite and Horrors are read", A().isOrpheus(sk) && i.shade === "poltergeist" && i.lament === "skimmer" && i.vitality.start === 6 && i.vitality.now === 5 && i.spite.rating === 3 && i.horrors.length === 1 && i.projector,
                { shade: i.shade, lament: i.lament, vitality: i.vitality, spite: i.spite, horrors: i.horrors.length });
        });
        await step("the Orpheus menu, chosen by the sheet's variant", async () => {
            let seen = null;
            answer(root => { seen = root.textContent; return "cancel"; });
            A().menu({ actor: sk }); await sleep(1500);
            ok("the Orpheus menu, chosen by the sheet's variant", /Use a Horror/.test(seen ?? "") && /Orpheus \(a spook\)/.test(seen ?? ""), { found: !!seen });
        });
        await step("a Horror: three Vitality, Dexterity + Athletics, and the ripple felt three blocks off", async () => {
            const n0 = game.messages.size;
            answer(root => { set(root, "v", 3); set(root, "a", "dexterity"); set(root, "b", "athletics"); set(root, "d", 6); });
            A().orphHorror({ actor: sk });
            const m = await untilMsg(n0, /Helter Skelter/);
            ok("a Horror: three Vitality, Dexterity + Athletics, and the ripple felt three blocks off", VT(sk) === 2 && /three blocks/.test(text(m)) && /diff 6/.test(text(m)), { vitality: VT(sk), card: text(m).slice(0, 260) });
        });
        await step("a Willpower point for three Vitality", async () => {
            const n0 = game.messages.size, w0 = WP(sk);
            answer(root => { set(root, "k", "wp"); });
            A().orphVitality({ actor: sk });
            await untilMsg(n0, /Vitality/);
            ok("a Willpower point for three Vitality", VT(sk) === 5 && WP(sk) === w0 - 1, { vitality: VT(sk), willpower: WP(sk) });
        });
        await step("sharing Vitality with a crucible-mate", async () => {
            const n0 = game.messages.size, t0 = VT(wi);
            answer(root => { set(root, "k", "share"); set(root, "x", 2); set(root, "to", wi.id); });
            A().orphVitality({ actor: sk });
            await untilMsg(n0, /Vitality/);
            ok("sharing Vitality with a crucible-mate", VT(sk) === 3 && VT(wi) === t0 + 2, { from: VT(sk), to: VT(wi) });
        });
        await step("tapping two Spite points: two Vitality, and the dice may add Spite", async () => {
            const n0 = game.messages.size, v0 = VT(sk), s0 = SP(sk);
            answer(root => { set(root, "k", "tap"); set(root, "x", 2); });
            A().orphVitality({ actor: sk });
            const m = await untilMsg(n0, /Vitality/);
            ok("tapping two Spite points: two Vitality, and the dice may add Spite", VT(sk) === v0 + 2 && SP(sk) + SR(sk) * 10 >= s0 + 30 && /2 dice, diff 7/.test(text(m)), { vitality: VT(sk), spite: [SR(sk), SP(sk)] });
        });
        await step("harm: the skimmer's body takes bashing; the spirit loses Vitality", async () => {
            let n0 = game.messages.size;
            answer(root => { set(root, "k", 2); });
            A().orphHarm({ actor: sk }); await untilMsg(n0, /is hurt/);
            const body = Number(sk.system.health.damage.bashing) === 2;
            n0 = game.messages.size; const v0 = VT(wi);
            answer(root => { set(root, "k", 2); });
            A().orphHarm({ actor: wi }); await untilMsg(n0, /is hurt/);
            ok("harm: the skimmer's body takes bashing; the spirit loses Vitality", body && VT(wi) === v0 - 2, { bashing: sk.system.health.damage.bashing, spirit: VT(wi) });
        });
        await step("zero Vitality: a Willpower point is spent at once for three", async () => {
            await wi.update({ "system.advantages.vitality.temporary": 1 });
            const n0 = game.messages.size, w0 = WP(wi);
            answer(root => { set(root, "k", 3); });
            A().orphHarm({ actor: wi });
            const m = await untilMsg(n0, /is hurt/);
            ok("zero Vitality: a Willpower point is spent at once for three", VT(wi) === 3 && WP(wi) === w0 - 1 && /a Willpower point is spent at once/.test(text(m)), { vitality: VT(wi), willpower: WP(wi) });
        });
        await step("Spite passing the starting Vitality: penalties; the last tether lowers it", async () => {
            await sk.update({ "system.advantages.spite.permanent": 7 });
            const st = A().orphInfo(sk).state;
            const n0 = game.messages.size;
            answer(root => { set(root, "k", "last"); });
            A().orphSpite({ actor: sk });
            await untilMsg(n0, /Spite/);
            ok("Spite passing the starting Vitality: penalties; the last tether lowers it", st.level === 2 && st.penalty === 1 && SR(sk) === 6, { state: st, rating: SR(sk) });
        });
        await step("the inner voice: Spite", async () => {
            const p = A().voicePressure(sk);
            ok("the inner voice: Spite", p?.kind === "spite" && /Spite 6/.test(p.text) && p.level === "rising", { pressure: p });
        });
    } finally {
        Hooks.off("renderDialogV2", hook);
        console.error = origErr;
        if (voices) await game.settings.set(MOD, "voicesOn", true);
        if (sk) { await sk.update(base("Poltergeist", "Skimmer")); await sk.unsetFlag(MOD, "orpheus"); }
        if (wi) { await wi.update(base("Wisp", "Spirit")); await wi.unsetFlag(MOD, "orpheus"); }
    }
    R.finished = new Date().toISOString();
    R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
    const file = new File([JSON.stringify(R, null, 1)], "gate6l-result.json", { type: "application/json" });
    await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
    return R.summary;
}
