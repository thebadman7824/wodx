/**
 * Phase 6k gate (the Reborn, WoDX Actions 3.10.0), in Foundry (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gate6i.mjs?${Date.now()}`)).run()
 * Makes (or reuses) a Kher-minu in the folder "WoDX 6k test pack" with Hekau on the sheet, answers the dialogs itself, and checks
 * what each action changes. Writes chat cards and that actor's sheet; deletes nothing. Result: Data/wodx-gate/gate6k-result.json.
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
const S = a => Number(adv(a).sekhem.temporary), SR = a => Number(adv(a).sekhem.permanent);
const base = { "system.amenti": "Kher-minu", "system.advantages.balance.permanent": 3, "system.advantages.sekhem.permanent": 3, "system.advantages.sekhem.temporary": 2,
    "system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5, "system.attributes.wits.value": 3, "system.attributes.wits.total": 3,
    "system.health.damage.bashing": 0, "system.health.damage.lethal": 0, "system.health.damage.aggravated": 0 };

async function makeMummy() {
    let folder = game.folders.find(f => f.type === "Actor" && f.name === "WoDX 6k test pack");
    if (!folder) folder = await Folder.create({ name: "WoDX 6k test pack", type: "Actor" });
    const name = "Neferet (6k, a Kher-minu)";
    let a = game.actors.find(x => x.folder?.id === folder.id && x.name === name);
    if (!a) { a = await Actor.create({ name, type: "Mummy", folder: folder.id, items: [{ name: "Amulets", type: "Power", system: { game: "mummy", type: "wod.types.hekau", value: 2 } },
        { name: "Ward of the Desert Wind", type: "Power", system: { game: "mummy", type: "wod.types.hekaupower", level: 1 } },
        { name: "Ba", type: "Feature", system: { type: "wod.types.background", value: 2 } }] }); await sleep(1500); }
    await a.update(base);
    if (a.getFlag(MOD, "mummy") !== undefined) await a.unsetFlag(MOD, "mummy");
    return a;
}

export async function run() {
    const hook = Hooks.on("renderDialogV2", onRender);
    const origErr = console.error;
    console.error = (...a) => { R.errors.push(a.map(x => x?.stack ? String(x.stack).split("\n").slice(0, 4).join(" | ") : String(x)).join(" ")); origErr.apply(console, a); };
    let mu;
    try {
        await step("Balance, Sekhem, the Amenti and its path, Hekau and the Ba are read", async () => {
            mu = await makeMummy();
            const i = A().mummyInfo(mu);
            ok("Balance, Sekhem, the Amenti and its path, Hekau and the Ba are read", A().isMummy(mu) && i.balance === 3 && i.sekhem.rating === 3 && i.sekhem.pool === 2 && i.amenti === "kherminu" && i.primary === "amulets" && i.hekau.amulets === 2 && i.ba === 2,
                { balance: i.balance, sekhem: i.sekhem, amenti: i.amenti, hekau: i.hekau, ba: i.ba });
        });
        await step("the Mummy menu", async () => {
            let seen = null;
            answer(root => { seen = root.textContent; return "cancel"; });
            A().menu({ actor: mu }); await sleep(1500);
            ok("the Mummy menu", /Work Hekau/.test(seen ?? "") && /The resurrection/.test(seen ?? ""), { found: !!seen });
        });
        await step("a spell: Amulets 2 + Wits, a Sekhem spent and one more for a success", async () => {
            const n0 = game.messages.size;
            answer(root => { set(root, "path", "amulets"); set(root, "tr", "wits"); set(root, "d", 6); set(root, "c", 1); set(root, "x", 1); });
            A().mummyCast({ actor: mu });
            const m = await untilMsg(n0, /works Hekau/);
            ok("a spell: Amulets 2 + Wits, a Sekhem spent and one more for a success", /Amulets 2 \+ .* : 5 dice, diff 6/.test(text(m)) && S(mu) === 0, { card: text(m).slice(0, 260), sekhem: S(mu) });
        });
        await step("semektet: no Sekhem outside the Web of Faith, no Hekau", async () => {
            const n0 = game.messages.size;
            answer(root => { set(root, "path", "amulets"); set(root, "c", 0); });
            A().mummyCast({ actor: mu }); await sleep(1500);
            ok("semektet: no Sekhem outside the Web of Faith, no Hekau", game.messages.size === n0, {});
        });
        await step("Osiris's Blessing within the Web: Balance at the Shroud", async () => {
            const n0 = game.messages.size;
            answer(root => { set(root, "k", "bless"); set(root, "sh", 5); set(root, "web", true); });
            A().mummySekhem({ actor: mu });
            const m = await untilMsg(n0, /seeks Sekhem/);
            ok("Osiris's Blessing within the Web: Balance at the Shroud", /Balance : 3 dice, diff 5/.test(text(m)) && S(mu) <= 3 && A().mummyInfo(mu).inWeb, { card: text(m).slice(0, 200), sekhem: S(mu) });
        });
        await step("the Gift of Ra each sunrise", async () => {
            await mu.update({ "system.advantages.sekhem.temporary": 1 });
            const f = mu.getFlag(MOD, "mummy") ?? {};
            await mu.setFlag(MOD, "mummy", { ...f, raDay: Math.floor(((game.time.worldTime) - 6 * 3600) / 86400) - 1 });
            await A().mummyDaily();
            ok("the Gift of Ra each sunrise", S(mu) === 2, { sekhem: S(mu) });
        });
        await step("an offense against Ma'at: the rows at or below Balance 3, kept for the judges", async () => {
            const n0 = game.messages.size;
            let rows = [];
            answer(root => { rows = [...root.querySelectorAll("select[name=row] option")].map(o => Number(o.value)); set(root, "row", 3); set(root, "what", "Gate 6k: struck in anger"); });
            A().mummyOffense({ actor: mu });
            await untilMsg(n0, /offends/);
            ok("an offense against Ma'at: the rows at or below Balance 3, kept for the judges", rows.join() === "1,2,3" && (mu.getFlag(MOD, "mummy")?.offenses ?? []).length === 1, { rows });
        });
        await step("Forbiddance: Balance against Willpower at 6", async () => {
            const n0 = game.messages.size;
            answer(root => { set(root, "k", "forbid"); set(root, "o", 4); });
            A().mummyBalance({ actor: mu });
            const m = await untilMsg(n0, /Forbiddance/);
            ok("Forbiddance: Balance against Willpower at 6", /Balance : 3 dice, diff 6/.test(text(m)) && /Its Willpower : 4 dice, diff 6/.test(text(m)), { card: text(m).slice(0, 220) });
        });
        await step("the resurrection: a permanent Sekhem, Willpower + Ba at 8", async () => {
            const n0 = game.messages.size, r0 = SR(mu);
            answer(root => { set(root, "kh", 2); set(root, "sp", "sekhem"); });
            A().mummyResurrect({ actor: mu });
            const m = await untilMsg(n0, /resurrection/);
            ok("the resurrection: a permanent Sekhem, Willpower + Ba at 8", SR(mu) === r0 - 1 && /Willpower \+ Ba : 7 dice, diff 8/.test(text(m)), { card: text(m).slice(0, 260), rating: SR(mu) });
        });
        await step("the Veil: Willpower 1, catatonia", async () => {
            const n0 = game.messages.size;
            answer(root => { set(root, "w", 1); });
            A().mummyVeil({ actor: mu });
            const m = await untilMsg(n0, /catatonia/);
            ok("the Veil: Willpower 1, catatonia", !!m, {});
        });
    } finally {
        Hooks.off("renderDialogV2", hook);
        console.error = origErr;
        if (mu) { await mu.update(base); await mu.unsetFlag(MOD, "mummy"); }
    }
    R.finished = new Date().toISOString();
    R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
    const file = new File([JSON.stringify(R, null, 1)], "gate6k-result.json", { type: "application/json" });
    await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
    return R.summary;
}
