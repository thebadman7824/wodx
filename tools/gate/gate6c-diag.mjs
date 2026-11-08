/**
 * Phase 6c gate run inside Foundry (rothenstein-wodx), as a Gamemaster. Load from the console:
 *   await (await import(`/wodx-gate/gate6c.mjs?${Date.now()}`)).run()
 * Answers each WoDX dialog itself, records what the sheets and cards show, and uploads the result to
 * Data/wodx-gate/gate6c-diag.json. Creates test data only (the "WoDX 6c test pack" folder); deletes nothing;
 * puts the clock back where it was.
 */
const R = { started: new Date().toISOString(), steps: [], errors: [] };
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
const lastMsg = () => game.messages.contents.at(-1);
const text = m => String(m?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
async function untilMsg(after, ms = 5000) { const t = Date.now(); while (Date.now() - t < ms) { if (game.messages.size > after) return lastMsg(); await sleep(100); } return null; }
async function upload() {
    const file = new File([JSON.stringify(R, null, 1)], "gate6c-result.json", { type: "application/json" });
    await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
}
async function step(name, fn) { try { await fn(); } catch (e) { ok(name, false, { error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ") }); } }
const actorOf = a => ({ actor: a });

async function makePack() {
    let folder = game.folders.find(f => f.type === "Actor" && f.name === "WoDX 6c test pack");
    if (!folder) folder = await Folder.create({ name: "WoDX 6c test pack", type: "Actor" });
    const get = n => game.actors.find(a => a.folder?.id === folder.id && a.name === n);
    const mk = async (name, type, system, items) => get(name) ?? Actor.create({ name, type, folder: folder.id, system, items });
    const ada = await mk("Ada Brandt (wraith)", "Wraith", {
        advantages: { pathos: { temporary: 5, max: 10 }, angst: { temporary: 3, permanent: 4, max: 10 }, corpus: { temporary: 10, permanent: 10, max: 10 }, willpower: { permanent: 5, temporary: 5 } }
    }, [
        { name: "Argos", type: "Power", system: { type: "wod.types.arcanoi", value: 3 } },
        { name: "Keep my daughter safe", type: "Trait", system: { type: "wod.types.passion", value: 4 } },
        { name: "My wedding ring", type: "Trait", system: { type: "wod.types.fetter", value: 3 } },
        { name: "Memoriam", type: "Feature", system: { type: "wod.types.background", value: 2 } },
        { name: "Eidolon", type: "Feature", system: { type: "wod.types.background", value: 2 } }]);
    const anselm = await mk("Brother Anselm (inquisitor)", "Hunter", { advantages: { conviction: { permanent: 4, temporary: 4 }, willpower: { permanent: 5, temporary: 5 },
        virtues: { conscience: { permanent: 3 }, selfcontrol: { permanent: 3 }, courage: { permanent: 3 } } } }, []);
    const mara = await mk("Mara Quinn (imbued)", "Hunter", { creed: "Avenger", advantages: { conviction: { permanent: 4, temporary: 4 }, willpower: { permanent: 3, temporary: 3 },
        virtues: { mercy: { permanent: 0 }, vision: { permanent: 1 }, zeal: { permanent: 2 } } } }, [
        { name: "Cleave", type: "Power", system: { type: "wod.types.edge", value: 1 } }, { name: "Trail", type: "Power", system: { type: "wod.types.edge", value: 2 } }]);
    const agnes = await mk("Sister Agnes (mortal)", "Mortal", { advantages: { willpower: { permanent: 5, temporary: 5 }, faith: { permanent: 3, temporary: 3 } } }, [
        { name: "Psychometry", type: "Power", system: { type: "wod.types.numina", value: 3 } }, { name: "Hellfire", type: "Power", system: { type: "wod.types.numina", value: 3 } }]);
    const greta = await mk("Greta Lenz (ghoul)", "Mortal", { advantages: { willpower: { permanent: 4, temporary: 4 }, bloodpool: { temporary: 3, max: 10 } } }, []);
    return { folder, ada, anselm, mara, agnes, greta };
}

export async function run() {
    const origErr = console.error, notes = [];
    console.error = (...a) => { R.errors.push(a.map(x => x?.message ?? String(x)).join(" ").slice(0, 300)); origErr(...a); };
    const wrap = k => { const f = ui.notifications[k].bind(ui.notifications); ui.notifications[k] = (m, o) => { notes.push(`${k}: ${m}`); return f(m, o); }; return f; };
    const orig = { warn: wrap("warn"), error: wrap("error"), info: wrap("info") };
    const rej = e => R.errors.push(`unhandled: ${e.reason?.message ?? e.reason}`);
    window.addEventListener("unhandledrejection", rej);
    const titles = [];
    const seen = Hooks.on("renderDialogV2", app => titles.push(app.title ?? app.options?.window?.title));
    const hook = Hooks.on("renderDialogV2", onRender);
    try {
        const agnes = game.actors.find(a => a.name === "Sister Agnes (mortal)");
        R.agnes = { wp: agnes?.system?.advantages?.willpower, faith: agnes?.system?.advantages?.faith, items: agnes?.items?.filter(i => i.type === "Power").map(i => ({ n: i.name, t: i.system.type, v: i.system.value })),
            spendResources: game.settings.get("wodx-actions", "spendResources"), line: A().hunterLine() };
        const tries = [
            ["True Faith", () => { answer(root => { set(root, "k", "resist"); set(root, "ps", 4); }); return A().trueFaith(actorOf(agnes)); }],
            ["Numina", () => { answer(root => { set(root, "nm", "s0"); set(root, "lvl", 2); }); return A().numina(actorOf(agnes)); }],
            ["Hedge", () => { answer(root => { const o = [...root.querySelectorAll("[name=path] option")].find(x => /Hellfire/.test(x.textContent)); set(root, "path", o.value); set(root, "mode", "spell"); set(root, "a1", 2); }); return A().hedgeMagic(actorOf(agnes)); }]];
        for (const [name, fn] of tries) {
            const n = game.messages.size, n0 = notes.length, t0 = titles.length;
            let ret;
            try { ret = await Promise.race([fn(), sleep(8000).then(() => "timeout")]); } catch (e) { ret = `threw: ${e.message}`; }
            const m = await untilMsg(n, 2000);
            ok(name, !!m, { ret: typeof ret === "object" ? (ret?.constructor?.name ?? "object") : String(ret), card: text(m).slice(0, 200), notes: notes.slice(n0), dialogs: titles.slice(t0), queueLeft: queue.length, wp: agnes.system.advantages.willpower.temporary });
            queue.length = 0;
        }
    } finally {
        Hooks.off("renderDialogV2", hook); Hooks.off("renderDialogV2", seen);
        Object.assign(ui.notifications, orig);
        window.removeEventListener("unhandledrejection", rej);
        console.error = origErr;
        R.finished = new Date().toISOString();
        R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
        const file = new File([JSON.stringify(R, null, 1)], "gate6c-diag.json", { type: "application/json" });
        await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
    }
    return R.summary;
}
