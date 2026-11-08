/**
 * Phase 6h gate (changelings of the later eras, WoDX Actions 3.9.0), in Foundry (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gate6h.mjs?${Date.now()}`)).run()
 * Makes (or reuses) a Changeling 20th pooka in the folder "WoDX 6h test pack" (set to Changeling 20th rules on its
 * sheet, since the world is in the Dark Ages) and answers the dialogs itself. Writes chat cards and that actor's sheet;
 * deletes nothing. Result: Data/wodx-gate/gate6h-result.json.
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
async function step(name, fn) { const t = Date.now(); try { await fn(); R.timing?.push([name.slice(0, 30), Date.now() - t]); } catch (e) { ok(name, false, { error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ") }); } }
const adv = a => a.system.advantages;
const G = a => Number(adv(a).glamour.temporary), NM = a => Number(adv(a).nightmare?.temporary ?? 0);
const base = { "system.advantages.glamour.permanent": 5, "system.advantages.glamour.temporary": 5, "system.advantages.banality.permanent": 3, "system.advantages.banality.temporary": 2,
    "system.advantages.nightmare.temporary": 0, "system.advantages.willpower.permanent": 4, "system.advantages.willpower.temporary": 4, "system.advantages.willpower.imbalance": 0,
    "system.health.damage.bashing": 0, "system.health.damage.lethal": 0, "system.health.damage.aggravated": 0, "system.health.damage.chimerical.aggravated": 0 };

async function makePooka() {
    let folder = game.folders.find(f => f.type === "Actor" && f.name === "WoDX 6h test pack");
    if (!folder) folder = await Folder.create({ name: "WoDX 6h test pack", type: "Actor" });
    const name = "Jamilah (6h, pooka wilder)";
    const pw = (nm, type, v) => ({ name: nm, type: "Power", system: { type: `wod.types.${type}`, value: v } });
    // The system keeps Realms as Trait items whose label is a key such as "wod.realms.actor"
    const rl = (k, v) => ({ name: k[0].toUpperCase() + k.slice(1), type: "Trait", system: { type: "wod.types.realms", label: `wod.realms.${k}`, value: v, max: 5 } });
    let a = game.actors.find(x => x.folder?.id === folder.id && x.name === name);
    if (!a) a = await Actor.create({ name, type: "Changeling", folder: folder.id, items: [pw("Metamorphosis", "art", 3), pw("Primal", "art", 3), pw("Wayfare", "art", 2),
        rl("actor", 3), rl("fae", 2), rl("nature", 1)] });
    await a.update({ ...base, "system.seeming": "Wilder", "system.kith": "Pooka" });
    await a.setFlag(MOD, "daFae", { system: "c20" });
    if (a.getFlag(MOD, "c20") !== undefined) await a.unsetFlag(MOD, "c20");
    return a;
}

export async function run() {
    const hook = Hooks.on("renderDialogV2", onRender);
    const origErr = console.error;
    console.error = (...a) => { R.errors.push(a.map(x => x?.stack ? String(x.stack).split("\n").slice(0, 4).join(" | ") : String(x)).join(" ")); origErr.apply(console, a); };
    const t0 = Date.now(); R.timing = [];
    let pk;
    try {
        await step("versions; the sheet's Arts, Realms and Tempers are read", async () => {
            pk = await makePooka();
            const i = A().c20Info(pk);
            ok("versions; the sheet's Arts, Realms and Tempers are read", /^3\.9\./.test(A().version) && i.arts.metamorphosis === 3 && i.realms.actor === 3 && i.realms.fae === 2 && i.glamour.perm === 5 && i.seeming === "wilder",
                { actions: A().version, arts: i.arts, realms: i.realms, glamour: i.glamour, seeming: i.seeming });
        });
        await step("the menu follows the sheet's choice: Changeling 20th", async () => {
            let seen = null;
            answer(root => { seen = root.textContent; return "cancel"; });
            A().menu({ actor: pk }); await sleep(1500);
            ok("the menu follows the sheet's choice: Changeling 20th", /Unleash an Art/.test(seen ?? "") && /Weave a cantrip/.test(seen ?? "") && !/Dominion \+ trait/.test(seen ?? ""), { found: !!seen });
        });
        await step("the book's first example: Metamorphosis 3 + Actor 3, Wyrd, a −2 bunk: six dice at 6, one Glamour", async () => {
            const n0 = game.messages.size, g0 = G(pk);
            answer(root => { set(root, "art", "metamorphosis"); set(root, "lvl", 1); set(root, "r-actor", 3); set(root, "wyrd", true); set(root, "bunk", 2); });
            A().cantrip({ actor: pk });
            const m = await untilMsg(n0, /weaves a cantrip/);
            ok("the book's first example: Metamorphosis 3 + Actor 3, Wyrd, a −2 bunk: six dice at 6, one Glamour", /6 dice, diff 6/.test(text(m)) && G(pk) === g0 - 1, { card: text(m).slice(0, 260), glamour: G(pk) });
        });
        await step("the book's second example: Primal 3 + Fae 2 with an unknown Time: five dice at 7, two Glamour", async () => {
            await pk.update({ "system.advantages.glamour.temporary": 5 });
            const n0 = game.messages.size;
            answer(root => { set(root, "art", "primal"); set(root, "r-fae", 1); set(root, "r-time", 1); set(root, "wyrd", true); set(root, "bunk", 2); });
            A().c20Cantrip({ actor: pk });
            const m = await untilMsg(n0, /weaves a cantrip/);
            ok("the book's second example: Primal 3 + Fae 2 with an unknown Time: five dice at 7, two Glamour", /5 dice, diff 7/.test(text(m)) && G(pk) === 3 && /Time 1/.test(text(m)), { card: text(m).slice(0, 300), glamour: G(pk) });
        });
        await step("Nightmare at 10: it clears, an Imbalance is marked and a Glamour point returns", async () => {
            await pk.update({ "system.advantages.nightmare.temporary": 9, "system.advantages.glamour.temporary": 3 });
            const n0 = game.messages.size;
            answer(root => { set(root, "k", "nm"); set(root, "nm", 1); });
            A().c20Bedlam({ actor: pk });
            await untilMsg(n0, /: Nightmare/);
            ok("Nightmare at 10: it clears, an Imbalance is marked and a Glamour point returns", NM(pk) === 0 && Number(adv(pk).willpower.imbalance) === 1 && G(pk) === 4, { nightmare: NM(pk), imbalance: adv(pk).willpower.imbalance, glamour: G(pk) });
        });
        await step("an Imbalanced Willpower brings a Bedlam Threshold: drowning in Glamour", async () => {
            const n0 = game.messages.size;
            answer(root => { set(root, "k", "spend"); set(root, "t", "drowning"); });
            A().c20Bedlam({ actor: pk });
            const m = await untilMsg(n0, /Bedlam Threshold/);
            ok("an Imbalanced Willpower brings a Bedlam Threshold: drowning in Glamour", G(pk) === 5 && Number(adv(pk).willpower.temporary) === 3 && /For 1 scene/.test(text(m)), { glamour: G(pk), wp: adv(pk).willpower.temporary });
        });
        await step("invoking the Autumn: a Willpower point and a Banality trigger roll", async () => {
            const n0 = game.messages.size, w0 = Number(adv(pk).willpower.temporary);
            answer(root => { set(root, "k", "autumn"); });
            A().c20Invoke({ actor: pk });
            const m = await untilMsg(n0, /invokes the Autumn/);
            ok("invoking the Autumn: a Willpower point and a Banality trigger roll", Number(adv(pk).willpower.temporary) === w0 - 1 && /Glamour against Banality : 5 dice, diff 8/.test(text(m)), { card: text(m).slice(0, 220) });
        });
        await step("an 11th Banality point becomes a dot", async () => {
            await pk.update({ "system.advantages.banality.temporary": 10 });
            const n0 = game.messages.size;
            answer(root => { set(root, "auto", true); });
            A().c20Trigger({ actor: pk });
            await untilMsg(n0, /: Banality/);
            ok("an 11th Banality point becomes a dot", Number(adv(pk).banality.permanent) === 4 && Number(adv(pk).banality.temporary) === 0, { banality: adv(pk).banality });
            await pk.update({ "system.advantages.banality.permanent": 3, "system.advantages.banality.temporary": 2 });
        });
        await step("Revelry fills the Glamour pool; or it heals an Imbalance instead", async () => {
            await pk.update({ "system.advantages.glamour.temporary": 1, "system.advantages.willpower.imbalance": 1 });
            let n0 = game.messages.size;
            answer(root => { set(root, "k", "revelry"); });
            A().c20Epiphany({ actor: pk }); await untilMsg(n0, /Epiphany/);
            const full = G(pk) === 5;
            await pk.update({ "system.advantages.glamour.temporary": 1 });
            n0 = game.messages.size;
            answer(root => { set(root, "k", "revelry"); set(root, "imb", true); });
            A().c20Epiphany({ actor: pk }); await untilMsg(n0, /Epiphany/);
            ok("Revelry fills the Glamour pool; or it heals an Imbalance instead", full && Number(adv(pk).willpower.imbalance) === 0 && G(pk) === 1, { full, imbalance: adv(pk).willpower.imbalance, glamour: G(pk) });
        });
        await step("an Unleashing: 2 Glamour and a Nightmare first, Glamour + Nightmare at 7", async () => {
            await pk.update({ "system.advantages.glamour.temporary": 5, "system.advantages.nightmare.temporary": 0 });
            const n0 = game.messages.size;
            answer(root => { set(root, "art", "wayfare"); set(root, "intent", "Gate 6h: over the wall"); });
            A().c20Unleash({ actor: pk });
            const m = await untilMsg(n0, /Unleashes/);
            ok("an Unleashing: 2 Glamour and a Nightmare first, Glamour + Nightmare at 7", /Glamour 5 \+ Nightmare 1 : 6 dice, diff 7/.test(text(m)) && G(pk) <= 3 && NM(pk) >= 1, { card: text(m).slice(0, 260), glamour: G(pk), nightmare: NM(pk) });
        });
        await step("cold iron: aggravated to both bodies and a Glamour point a level", async () => {
            await pk.update({ "system.advantages.glamour.temporary": 3 });
            const n0 = game.messages.size;
            answer(root => { set(root, "k", 1); });
            A().c20ColdIron({ actor: pk });
            await untilMsg(n0, /Cold iron/);
            const d = pk.system.health.damage;
            ok("cold iron: aggravated to both bodies and a Glamour point a level", Number(d.aggravated) === 1 && Number(d.chimerical?.aggravated) === 1 && G(pk) === 2, { agg: d.aggravated, chimerical: d.chimerical, glamour: G(pk) });
        });
        await step("the Mists: a mortal of Banality 6 keeps it about a week", async () => {
            const n0 = game.messages.size;
            answer(root => { set(root, "b", 6); });
            A().c20Mists({ actor: pk });
            const m = await untilMsg(n0, /The Mists/);
            ok("the Mists: a mortal of Banality 6 keeps it about a week", /within a week, vivid flashbacks/.test(text(m)), { card: text(m).slice(0, 160) });
        });
        await step("the inner voice: Bedlam's road", async () => {
            await pk.update({ "system.advantages.willpower.imbalance": 3 });
            const p = A().voicePressure(pk);
            ok("the inner voice: Bedlam's road", p?.kind === "mists" && p.level === "breaking" && /Imbalances 3/.test(p.text), { pressure: p });
        });
    } finally {
        Hooks.off("renderDialogV2", hook);
        console.error = origErr;
        if (pk) await pk.update(base);
    }
    R.finished = new Date().toISOString();
    R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
    const file = new File([JSON.stringify(R, null, 1)], "gate6h-result.json", { type: "application/json" });
    await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
    return R.summary;
}
