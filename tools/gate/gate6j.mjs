/**
 * Phase 6j gate (the Kuei-jin, WoDX Actions 3.10.0), in Foundry (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gate6i.mjs?${Date.now()}`)).run()
 * Makes (or reuses) a Kuei-jin (the system's vampire sheet set to Kindred of the East) in the folder "WoDX 6j test pack", answers the dialogs itself, and checks
 * what each action changes. Writes chat cards and that actor's sheet; deletes nothing. Result: Data/wodx-gate/gate6j-result.json.
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
const Y = a => Number(adv(a).yinchi.temporary), G = a => Number(adv(a).yangchi.temporary), DC = a => Number(adv(a).demonchi.temporary);
const base = { "system.settings.variant": "kindredeast", "system.advantages.yin.permanent": 4, "system.advantages.yang.permanent": 3, "system.advantages.yinchi.temporary": 3,
    "system.advantages.yangchi.temporary": 1, "system.advantages.hun.permanent": 2, "system.advantages.po.permanent": 4, "system.advantages.demonchi.temporary": 4,
    "system.advantages.dharma.permanent": 3, "system.advantages.dharma.label": "Howl of the Devil-Tiger", "system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5,
    "system.attributes.stamina.value": 3, "system.attributes.stamina.total": 3, "system.health.damage.bashing": 0, "system.health.damage.lethal": 0, "system.health.damage.aggravated": 0 };

async function makeKueijin() {
    let folder = game.folders.find(f => f.type === "Actor" && f.name === "WoDX 6j test pack");
    if (!folder) folder = await Folder.create({ name: "WoDX 6j test pack", type: "Actor" });
    const name = "Tanaka Hiroko (6j, a Devil-Tiger)";
    let a = game.actors.find(x => x.folder?.id === folder.id && x.name === name);
    if (!a) { a = await Actor.create({ name, type: "Vampire", folder: folder.id, system: { settings: { variant: "kindredeast" } },
        items: [{ name: "Black Wind", type: "Power", system: { type: "wod.types.discipline", value: 1 } }, { name: "Yang Prana", type: "Power", system: { type: "wod.types.discipline", value: 2 } }] }); await sleep(1500); }
    await a.update(base);
    if (a.getFlag(MOD, "kote") !== undefined) await a.unsetFlag(MOD, "kote");
    return a;
}

export async function run() {
    const hook = Hooks.on("renderDialogV2", onRender);
    const origErr = console.error;
    console.error = (...a) => { R.errors.push(a.map(x => x?.stack ? String(x.stack).split("\n").slice(0, 4).join(" | ") : String(x)).join(" ")); origErr.apply(console, a); };
    let kj;
    try {
        await step("the sheet's Yin, Yang, Chi, Hun, P'o and the Dharma are read", async () => {
            kj = await makeKueijin();
            const i = A().kotInfo(kj);
            ok("the sheet's Yin, Yang, Chi, Hun, P'o and the Dharma are read", A().isKotE(kj) && i.v.yin === 4 && i.chi.yang === 1 && i.v.po === 4 && i.dharma.key === "devilTiger" && i.perTurn === 1 && i.hunger === "hungry",
                { v: i.v, chi: i.chi, dharma: i.dharma, perTurn: i.perTurn, hunger: i.hunger });
        });
        await step("the Kuei-jin menu, chosen by the sheet's variant", async () => {
            let seen = null;
            answer(root => { seen = root.textContent; return "cancel"; });
            A().menu({ actor: kj }); await sleep(1500);
            ok("the Kuei-jin menu, chosen by the sheet's variant", /Feed \(flesh, blood, breath\)/.test(seen ?? "") && /Fire, wave or shadow soul/.test(seen ?? ""), { found: !!seen });
        });
        await step("feeding on blood: the lesser kind first, then alternating (the book's example)", async () => {
            const n0 = game.messages.size;
            answer(root => { set(root, "w", "blood"); set(root, "k", 3); set(root, "mood", ""); });
            A().kotFeed({ actor: kj });
            const m = await untilMsg(n0, /feeds/);
            ok("feeding on blood: the lesser kind first, then alternating (the book's example)", Y(kj) === 4 && G(kj) === 3 && /\+1 Yin, \+2 Yang/.test(text(m)), { yin: Y(kj), yang: G(kj), card: text(m).slice(0, 200) });
        });
        await step("Dharma 3 allows one Chi a turn: two are refused, one is spent", async () => {
            let n0 = game.messages.size;
            answer(root => { set(root, "kind", "yang"); set(root, "k", 2); });
            A().kotSpend({ actor: kj }); await sleep(1500);
            const refused = game.messages.size === n0 && G(kj) === 3;
            n0 = game.messages.size;
            answer(root => { set(root, "kind", "yang"); set(root, "k", 1); });
            A().kotSpend({ actor: kj });
            const m = await untilMsg(n0, /spends Chi/);
            ok("Dharma 3 allows one Chi a turn: two are refused, one is spent", refused && G(kj) === 2 && !!m, { yang: G(kj) });
        });
        await step("a Demon Art: Demon Chi, and Hun harnesses the P'o (at the P'o's rating)", async () => {
            const n0 = game.messages.size, d0 = DC(kj);
            answer(root => { const o = [...root.querySelectorAll("select[name=art] option")].find(x => /Black Wind/.test(x.textContent)); set(root, "art", o.value); set(root, "k", 1); });
            A().kotSpend({ actor: kj });
            const m = await untilMsg(n0, /spends Chi/);
            ok("a Demon Art: Demon Chi, and Hun harnesses the P'o (at the P'o's rating)", DC(kj) === d0 - 1 && /Hun harnesses the P'o : 2 dice, diff 4/.test(text(m)), { demon: DC(kj), card: text(m).slice(0, 240) });
        });
        await step("healing: a Chi point a lethal level", async () => {
            await kj.update({ "system.health.damage.lethal": 1 });
            const n0 = game.messages.size;
            answer(root => { set(root, "w", "lethal"); set(root, "k", 1); set(root, "c", "yin"); });
            A().kotHeal({ actor: kj });
            await untilMsg(n0, /heals/);
            ok("healing: a Chi point a lethal level", Number(kj.system.health.damage.lethal) === 0 && Y(kj) === 3, { lethal: kj.system.health.damage.lethal, yin: Y(kj) });
        });
        await step("rising on Yin: ten nights black cycled", async () => {
            const n0 = game.messages.size;
            answer(root => { set(root, "a", "yin"); set(root, "dc", false); });
            A().kotRise({ actor: kj });
            const m = await untilMsg(n0, /rises/);
            ok("rising on Yin: ten nights black cycled", Y(kj) === 2 && /for 10 nights/.test(text(m)), { yin: Y(kj), card: text(m).slice(0, 200) });
        });
        await step("the sun: (Stamina − Yin Chi) minutes, then the rot", async () => {
            const n0 = game.messages.size;
            answer(root => { set(root, "m", 2); set(root, "t", 1); set(root, "y", 0); });
            A().kotSun({ actor: kj });
            const m = await untilMsg(n0, /in the sun/);
            ok("the sun: (Stamina − Yin Chi) minutes, then the rot", /Grace: 1 minute/.test(text(m)) && Number(kj.system.health.damage.aggravated) === 1 && Y(kj) === 1, { card: text(m).slice(0, 220), agg: kj.system.health.damage.aggravated, yin: Y(kj) });
        });
        await step("the Demon: fangs and the fanged maw", async () => {
            const n0 = game.messages.size, d0 = DC(kj);
            answer(root => { set(root, "k", "fangs"); set(root, "maw", true); });
            A().kotDemon({ actor: kj });
            const m = await untilMsg(n0, /the Demon/);
            ok("the Demon: fangs and the fanged maw", DC(kj) === d0 - 2 && /Strength \+ 2 aggravated/.test(text(m)), { demon: DC(kj) });
        });
        await step("fire soul: Yin against the P'o, an extended contest", async () => {
            const n0 = game.messages.size;
            answer(root => { set(root, "k", "fire"); });
            A().kotNature({ actor: kj });
            const m = await untilMsg(n0, /fire soul/);
            ok("fire soul: Yin against the P'o, an extended contest", /Turn 1: Yin \d+, P'o \d+/.test(text(m)) && /The P'o needs/.test(text(m)), { card: text(m).slice(0, 240) });
        });
        await step("a Dharma roll: the P'o's Virtue against the P'o, at Willpower 5", async () => {
            const n0 = game.messages.size;
            answer(root => { set(root, "k", "blindness"); set(root, "why", "Gate 6j: a careless killing"); });
            A().kotDharma({ actor: kj });
            const m = await untilMsg(n0, /Dharma roll/);
            ok("a Dharma roll: the P'o's Virtue against the P'o, at Willpower 5", /The Dharma's Virtue : 4 dice, diff 5/.test(text(m)) && /P'o : 4 dice, diff 5/.test(text(m)), { card: text(m).slice(0, 240) });
        });
        await step("the inner voice: the P'o and the Chi left", async () => {
            const p = A().voicePressure(kj);
            ok("the inner voice: the P'o and the Chi left", p?.kind === "beast" && /P'o 4 against Hun 2/.test(p.text), { pressure: p });
        });
    } finally {
        Hooks.off("renderDialogV2", hook);
        console.error = origErr;
        if (kj) { await kj.update(base); await kj.unsetFlag(MOD, "kote"); }
    }
    R.finished = new Date().toISOString();
    R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
    const file = new File([JSON.stringify(R, null, 1)], "gate6j-result.json", { type: "application/json" });
    await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
    return R.summary;
}
