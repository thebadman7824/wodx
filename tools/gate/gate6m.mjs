/**
 * Phase 6m gate (mages of the later eras, WoDX Actions 3.11.0), in Foundry (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gate6i.mjs?${Date.now()}`)).run()
 * Makes (or reuses) a Mage 20th mage (set to Mage 20th rules, since the world is in the Dark Ages) in the folder "WoDX 6m test pack", answers the dialogs itself, and checks
 * what each action changes. Writes chat cards and that actor's sheet; deletes nothing. Result: Data/wodx-gate/gate6m-result.json.
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
const P = a => Number(a.system.paradox.temporary), Q = a => Number(a.system.quintessence.temporary);
const base = { "system.advantages.arete.permanent": 3, "system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5,
    "system.spheres.forces.value": 3, "system.spheres.prime.value": 2, "system.spheres.mind.value": 1, "system.quintessence.temporary": 4, "system.paradox.temporary": 0, "system.paradox.permanent": 0 };

async function makeMage() {
    let folder = game.folders.find(f => f.type === "Actor" && f.name === "WoDX 6m test pack");
    if (!folder) folder = await Folder.create({ name: "WoDX 6m test pack", type: "Actor" });
    const name = "Eleanor (6m, a Hermetic adept)";
    let a = game.actors.find(x => x.folder?.id === folder.id && x.name === name);
    if (!a) { a = await Actor.create({ name, type: "Mage", folder: folder.id, items: [{ name: "Avatar", type: "Feature", system: { type: "wod.types.background", value: 3 } }] }); await sleep(1500); }
    await a.update(base);
    await a.setFlag(MOD, "daMage", { system: "m20" });
    if (a.getFlag(MOD, "m20") !== undefined) await a.unsetFlag(MOD, "m20");
    return a;
}

export async function run() {
    const hook = Hooks.on("renderDialogV2", onRender);
    const origErr = console.error;
    console.error = (...a) => { R.errors.push(a.map(x => x?.stack ? String(x.stack).split("\n").slice(0, 4).join(" | ") : String(x)).join(" ")); origErr.apply(console, a); };
    const voices = game.settings.get(MOD, "voicesOn");
    if (voices) await game.settings.set(MOD, "voicesOn", false);
    let mg;
    try {
        await step("versions; Arete, the Spheres, Quintessence, Paradox and the Avatar are read", async () => {
            mg = await makeMage();
            const i = A().m20Info(mg);
            ok("versions; Arete, the Spheres, Quintessence, Paradox and the Avatar are read", !foundry.utils.isNewerVersion("3.9.0", A().version) && i.arete === 3 && i.spheres.forces === 3 && i.quint === 4 && i.avatar === 3 && i.dice === 3,
                { actions: A().version, arete: i.arete, spheres: i.spheres, quint: i.quint, avatar: i.avatar });
        });
        await step("a vulgar, witnessed Forces 2 Effect with a Quintessence point: Arete 3 at 6, Paradox gained", async () => {
            const n0 = game.messages.size, q0 = Q(mg);
            answer(root => { set(root, "s-forces", 2); set(root, "kind", "witnessed"); set(root, "feat", 2); set(root, "q", 1); set(root, "dmg", true); });
            A().cast({ actor: mg });
            const m = await untilMsg(n0, /works magick/);
            ok("a vulgar, witnessed Forces 2 Effect with a Quintessence point: Arete 3 at 6, Paradox gained", /Arete 3 : 3 dice, diff 6/.test(text(m)) && Q(mg) === q0 - 1 && P(mg) >= 1, { card: text(m).slice(0, 300), quint: Q(mg), paradox: P(mg) });
        });
        await step("a Sphere past the sheet is refused", async () => {
            const n0 = game.messages.size;
            let opts = [];
            answer(root => { opts = [...root.querySelectorAll("select[name=s-mind] option")].map(o => o.value); return "cancel"; });
            A().m20Cast({ actor: mg }); await sleep(1500);
            ok("a Sphere past the sheet is refused", opts.join() === "0,1" && game.messages.size === n0, { opts });
        });
        await step("the Storyteller's backlash roll of the Paradox pool", async () => {
            await mg.update({ "system.paradox.temporary": 6 });
            const n0 = game.messages.size;
            answer(root => { set(root, "stave", false); });
            A().m20Backlash({ actor: mg });
            const m = await untilMsg(n0, /backlash/);
            ok("the Storyteller's backlash roll of the Paradox pool", /Paradox : 6 dice, diff 6/.test(text(m)), { card: text(m).slice(0, 240), paradox: P(mg) });
        });
        await step("countermagick: Arete at 7", async () => {
            const n0 = game.messages.size;
            answer(root => { set(root, "mode", "self"); set(root, "share", true); });
            A().m20Counter({ actor: mg });
            const m = await untilMsg(n0, /countermagick/);
            ok("countermagick: Arete at 7", /Arete 3 : 3 dice, diff 7/.test(text(m)), { card: text(m).slice(0, 200) });
        });
        await step("Paradox under five fades a point a week without magick", async () => {
            await mg.update({ "system.paradox.temporary": 3 });
            await mg.setFlag(MOD, "m20", { lastMagick: game.time.worldTime - 15 * 86400 });
            await A().m20Shed();
            ok("Paradox under five fades a point a week without magick", P(mg) === 1, { paradox: P(mg) });
        });
    } finally {
        Hooks.off("renderDialogV2", hook);
        console.error = origErr;
        if (voices) await game.settings.set(MOD, "voicesOn", true);
        if (mg) { await mg.update(base); await mg.unsetFlag(MOD, "m20"); }
    }
    R.finished = new Date().toISOString();
    R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
    const file = new File([JSON.stringify(R, null, 1)], "gate6m-result.json", { type: "application/json" });
    await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
    return R.summary;
}
