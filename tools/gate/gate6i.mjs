/**
 * Phase 6i gate (the fallen, WoDX Actions 3.10.0), in Foundry (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gate6i.mjs?${Date.now()}`)).run()
 * Makes (or reuses) a Devil in the folder "WoDX 6i test pack" with lores on the sheet, answers the dialogs itself, and checks
 * what each action changes. Writes chat cards and that actor's sheet; deletes nothing. Result: Data/wodx-gate/gate6i-result.json.
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
const F = a => Number(adv(a).faith.temporary), T = a => Number(adv(a).torment.temporary);
const base = { "system.house": "wod.bio.demon.devil", "system.faction": "wod.bio.demon.luciferan", "system.advantages.faith.permanent": 5, "system.advantages.faith.temporary": 5,
    "system.advantages.torment.permanent": 4, "system.advantages.torment.temporary": 0, "system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5,
    "system.advantages.virtues.conscience.permanent": 3, "system.advantages.virtues.selfcontrol.permanent": 2, "system.advantages.virtues.courage.permanent": 3,
    "system.attributes.stamina.value": 3, "system.attributes.stamina.total": 3, "system.attributes.manipulation.value": 3, "system.attributes.manipulation.total": 3, "system.abilities.survival.value": 2, "system.abilities.leadership.value": 2,
    "system.health.damage.bashing": 0, "system.health.damage.lethal": 0, "system.health.damage.aggravated": 0 };

async function makeDevil() {
    let folder = game.folders.find(f => f.type === "Actor" && f.name === "WoDX 6i test pack");
    if (!folder) folder = await Folder.create({ name: "WoDX 6i test pack", type: "Actor" });
    const name = "Zaphriel (6i, a Devil)";
    const lore = (nm, v) => ({ name: nm, type: "Power", system: { game: "demon", type: "wod.types.lore", value: v } });
    let a = game.actors.find(x => x.folder?.id === folder.id && x.name === name);
    if (!a) { a = await Actor.create({ name, type: "Demon", folder: folder.id, items: [lore("Lore of Flame", 2), lore("Lore of Radiance", 1), lore("Lore of Humanity", 1)] }); await sleep(1500); }
    await a.update(base);
    if (a.getFlag(MOD, "demon") !== undefined) await a.unsetFlag(MOD, "demon");
    return a;
}

export async function run() {
    const hook = Hooks.on("renderDialogV2", onRender);
    const origErr = console.error;
    console.error = (...a) => { R.errors.push(a.map(x => x?.stack ? String(x.stack).split("\n").slice(0, 4).join(" | ") : String(x)).join(" ")); origErr.apply(console, a); };
    let dv;
    try {
        await step("versions; the House, lores and visage are read from the sheet", async () => {
            dv = await makeDevil();
            const i = A().demonInfo(dv);
            ok("versions; the House, lores and visage are read from the sheet", /^3\.1\d\./.test(A().version) && i.house === "devil" && i.lores.flame === 2 && i.lores.radiance === 1 && i.lores.humanity === 1
                && i.primary === "flame" && /Nusku/.test(i.visage) && i.faith.perm === 5 && i.torment.perm === 4 && i.virtues.conviction === 2,
                { actions: A().version, house: i.house, lores: i.lores, primary: i.primary, visage: i.visage, faith: i.faith, torment: i.torment });
        });
        await step("the Demon menu", async () => {
            let seen = null;
            answer(root => { seen = root.textContent; return "cancel"; });
            A().menu({ actor: dv }); await sleep(1500);
            ok("the Demon menu", /Evoke/.test(seen ?? "") && /apocalyptic form/.test(seen ?? "") && /Reap Faith/.test(seen ?? ""), { found: !!seen });
        });
        await step("Evoke Ignite (Flame 2): Stamina + Survival at 6, a Faith point for a success", async () => {
            const n0 = game.messages.size, f0 = F(dv);
            answer(root => { set(root, "evo", "flame:2"); set(root, "fs", 1); });
            A().demonEvoke({ actor: dv });
            const m = await untilMsg(n0, /evokes Ignite/);
            ok("Evoke Ignite (Flame 2): Stamina + Survival at 6, a Faith point for a success", /Stamina \+ Survival : 5 dice, diff 6/.test(text(m)) && F(dv) === f0 - 1 && /Revelation: mortals .* at 9/.test(text(m)),
                { card: text(m).slice(0, 320), faith: F(dv) });
        });
        await step("a level not known is refused (Radiance 2)", async () => {
            const n0 = game.messages.size;
            let opts = [];
            answer(root => { opts = [...root.querySelectorAll("select[name=evo] option")].map(x => x.value); return "cancel"; });
            A().demonEvoke({ actor: dv }); await sleep(1500);
            ok("a level not known is refused (Radiance 2)", game.messages.size === n0 && opts.includes("radiance:1") && !opts.includes("radiance:2") && opts.length === 4, { opts });
        });
        await step("choosing the dark effect costs a temporary Torment point", async () => {
            const n0 = game.messages.size, t0 = T(dv);
            answer(root => { set(root, "evo", "flame:1"); set(root, "fs", 1); set(root, "dark", true); });
            A().demonEvoke({ actor: dv });
            const m = await untilMsg(n0, /evokes Fuel/);
            ok("choosing the dark effect costs a temporary Torment point", /high-Torment effect, chosen/.test(text(m)) && T(dv) === t0 + 1, { card: text(m).slice(0, 260), torment: T(dv) });
        });
        await step("the apocalyptic form: a Faith point, Nusku's powers, the look for Torment 4 and Willpower 5", async () => {
            const n0 = game.messages.size, f0 = F(dv);
            answer(root => { set(root, "spend", true); });
            A().demonForm({ actor: dv });
            const m = await untilMsg(n0, /apocalyptic form/);
            const fl = dv.getFlag(MOD, "demon");
            ok("the apocalyptic form: a Faith point, Nusku's powers, the look for Torment 4 and Willpower 5", F(dv) === f0 - 1 && /Shroud of Flames/.test(text(m)) && /awe or terror/.test(text(m)) && (fl?.form ?? []).length === 4,
                { card: text(m).slice(0, 320), faith: F(dv), form: fl?.form });
        });
        await step("Faith heals all bashing for a point", async () => {
            await dv.update({ "system.health.damage.bashing": 3 });
            const n0 = game.messages.size, f0 = F(dv);
            answer(root => { set(root, "w", "bashing"); });
            A().demonHeal({ actor: dv });
            await untilMsg(n0, /heals with Faith/);
            ok("Faith heals all bashing for a point", Number(dv.system.health.damage.bashing) === 0 && F(dv) === f0 - 1, { bashing: dv.system.health.damage.bashing, faith: F(dv) });
        });
        await step("the holy burns at Torment 4: lethal equal to the potential", async () => {
            const n0 = game.messages.size;
            answer(root => { set(root, "k", "o"); set(root, "p", 2); });
            A().demonHoly({ actor: dv });
            const m = await untilMsg(n0, /meets the holy/);
            ok("the holy burns at Torment 4: lethal equal to the potential", Number(dv.system.health.damage.lethal) === 2 && /2 lethal levels/.test(text(m)), { lethal: dv.system.health.damage.lethal, card: text(m).slice(0, 200) });
        });
        await step("a sin: only the rows at or above Torment 4; Conscience at 8", async () => {
            const n0 = game.messages.size;
            let rows = [];
            answer(root => { rows = [...root.querySelectorAll("select[name=row] option")].map(o => Number(o.value)); set(root, "v", "conscience"); });
            A().demonSin({ actor: dv });
            const m = await untilMsg(n0, /sins/);
            ok("a sin: only the rows at or above Torment 4; Conscience at 8", rows[0] === 4 && rows.length === 6 && /Conscience .* 3 dice, diff 8/.test(text(m)), { rows, card: text(m).slice(0, 200) });
        });
        await step("thralls: the offering at dawn", async () => {
            const n0 = game.messages.size;
            answer(root => { set(root, "t", "Detective Wong | 3 | 1 | 5\nSister Mary | 4 | 5 | 6"); });
            A().demonThralls({ actor: dv });
            const m = await untilMsg(n0, /thralls/);
            const fl = dv.getFlag(MOD, "demon");
            await dv.update({ "system.advantages.faith.temporary": 1 });
            await dv.setFlag(MOD, "demon", { ...fl, lastDawn: fl.lastDawn - 1 });
            await A().demonDaily();
            ok("thralls: the offering at dawn", /Each dawn: \+3 Faith/.test(text(m)) && fl.thralls[1].offered === 2 && F(dv) === 4, { card: text(m).slice(0, 200), faith: F(dv) });
        });
        await step("Revelation: a witness's Willpower against Faith 5", async () => {
            const n0 = game.messages.size;
            answer(root => { set(root, "wp", 3); set(root, "who", "Gate 6i: a night nurse"); });
            A().demonRevelation({ actor: dv });
            const m = await untilMsg(n0, /Revelation/);
            ok("Revelation: a witness's Willpower against Faith 5", /3 dice, diff 5/.test(text(m)) && /night nurse/.test(text(m)), { card: text(m).slice(0, 220) });
        });
        await step("reaping: Willpower against Willpower at 7", async () => {
            const n0 = game.messages.size;
            answer(root => { set(root, "mwp", 2); set(root, "how", "Gate 6i: a meal and a talk"); });
            A().demonReap({ actor: dv });
            const m = await untilMsg(n0, /reaps Faith/);
            ok("reaping: Willpower against Willpower at 7", /5 dice, diff 7/.test(text(m)) && /2 dice, diff 7/.test(text(m)), { card: text(m).slice(0, 220) });
        });
        await step("the inner voice: the Torment", async () => {
            await dv.update({ "system.advantages.torment.permanent": 7 });
            const p = A().voicePressure(dv);
            ok("the inner voice: the Torment", p?.kind === "torment" && p.level === "breaking", { pressure: p });
        });
    } finally {
        Hooks.off("renderDialogV2", hook);
        console.error = origErr;
        if (dv) await dv.update(base);
    }
    R.finished = new Date().toISOString();
    R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
    const file = new File([JSON.stringify(R, null, 1)], "gate6i-result.json", { type: "application/json" });
    await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
    return R.summary;
}
