/**
 * Phase 6g gate (Dark Ages fae, WoDX Actions 3.8.0), in Foundry (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gate6g.mjs?${Date.now()}`)).run()
 * Makes (or reuses) two test fae in the folder "WoDX 6g test pack" and answers the dialogs itself. Writes chat cards and
 * those actors' sheets; deletes nothing. Result: Data/wodx-gate/gate6g-result.json.
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
async function untilMsg(after, ms = 6000, test = () => true) {
    const t = Date.now();
    while (Date.now() - t < ms) { const m = game.messages.contents.slice(after).find(x => /vta-card/.test(x.content ?? "") && test(x)); if (m) return m; await sleep(100); }
    return null;
}
async function step(name, fn) { try { await fn(); } catch (e) { ok(name, false, { error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ") }); } }
const fl = a => a.getFlag(MOD, "daFae") ?? {};
const M = a => fl(a).mists?.temp ?? 0, W = a => fl(a).weaving?.temp ?? 0;
const zero = { "system.health.damage.bashing": 0, "system.health.damage.lethal": 0, "system.health.damage.aggravated": 0 };

async function makePack() {
    let folder = game.folders.find(f => f.type === "Actor" && f.name === "WoDX 6g test pack");
    if (!folder) folder = await Folder.create({ name: "WoDX 6g test pack", type: "Actor" });
    const mk = async (name, items) => game.actors.find(x => x.folder?.id === folder.id && x.name === name) ?? Actor.create({ name, type: "Changeling", folder: folder.id, items });
    const lord = await mk("Lord Taalandryn (6g, firstborn of Winter)", [{ name: "Holdings", type: "Feature", system: { type: "wod.types.background", value: 2 } }]);
    const wren = await mk("Wren (6g, changeling of Spring)", []);
    for (const a of [lord, wren]) {
        await a.update({ "system.advantages.willpower.permanent": 4, "system.advantages.willpower.temporary": 4, "system.attributes.manipulation.value": 3, "system.attributes.manipulation.total": 3, ...zero });
        for (const k of ["daFaeCasts"]) if (a.getFlag(MOD, k) !== undefined) await a.unsetFlag(MOD, k);
    }
    await lord.setFlag(MOD, "daFae", { origin: "firstborn", court: "winter", mists: { perm: 5, temp: 5 }, weaving: { perm: 3, temp: 3 }, dominions: { night: 2, dusk: 1, day: 0, dawn: 0 },
        cantrips: [{ dominion: "night", level: 1, name: "Hush", trait: "manipulation" }], lesser: ["eyes of black ice"], greater: [], echoes: [{ trigger: "the sound of church bells" }],
        oaths: [{ kind: "iron", rating: 2, terms: "keeps the miller's family from the wolves", active: true }], mien: true, hiddenSince: null, weavingDay: null, weavingStreak: 0, lastDay: null, system: null });
    await wren.setFlag(MOD, "daFae", { origin: "changeling", court: "spring", mists: { perm: 2, temp: 2 }, weaving: { perm: 4, temp: 4 }, dominions: { dawn: 1, day: 1 },
        cantrips: [], lesser: [], greater: [], echoes: [{ trigger: "a cross held up" }], oaths: [], mien: false, mienLockUntil: 0, hiddenSince: null, system: null });
    return { lord, wren };
}
async function flagged(actor, key, data) {
    const m = await ChatMessage.create({ content: `<div class="vta-card wodx-x"><div class="vta-body">Gate 6g: ${key}.</div></div>`,
        whisper: game.users.filter(u => u.isGM).map(u => u.id), flags: { [MOD]: { [key]: { actor: actor.uuid, ...data } } } });
    return game.messages.get(m.id);
}

export async function run() {
    const hook = Hooks.on("renderDialogV2", onRender);
    let lord, wren;
    try {
        await step("versions and the era", async () => {
            ({ lord, wren } = await makePack());
            const era = game.modules.get("wodx-chronicle").api.eras.activeEra()?.profile?.id;
            ok("versions and the era", /^3\./.test(A().version) && !!A().daCantrip && era === "dark-ages" && A().getKind(lord) === "fae", { actions: A().version, era, kind: A().getKind(lord) });
        });
        await step("the menu offers the Dominions in the Dark Ages", async () => {
            let seen = null;
            answer(root => { seen = root.textContent; return "cancel"; });
            A().menu({ actor: lord }); await sleep(1500);
            ok("the menu offers the Dominions in the Dark Ages", /Cast a cantrip \(Dominion \+ trait\)/.test(seen ?? "") && /Unleash a Dominion/.test(seen ?? "") && !/Weave a cantrip/.test(seen ?? ""), { found: !!seen });
        });
        await step("Origin and Court saves the sheet", async () => {
            answer(root => { set(root, "d-dawn", 1); });
            await A().daFae({ actor: lord }); await sleep(800);
            const f = fl(lord);
            ok("Origin and Court saves the sheet", f.dominions?.dawn === 1 && f.dominions?.night === 2 && f.cantrips?.[0]?.name === "Hush" && f.oaths?.[0]?.rating === 2 && f.origin === "firstborn",
                { dominions: f.dominions, cantrips: f.cantrips?.length, oaths: f.oaths?.length });
        });
        await step("the cantrip button follows the era", async () => {
            let title = null;
            answer((root, app) => { title = app.title ?? app.options?.window?.title; return "cancel"; });
            A().cantrip({ actor: lord }); await sleep(1500);
            ok("the cantrip button follows the era", /Cast a cantrip/.test(title ?? ""), { title });
        });
        await step("a cantrip: Night 2 + Manipulation 3, the Winter Court's −1; cloaked for a Mists point", async () => {
            const n0 = game.messages.size, m0 = M(lord);
            answer(root => { set(root, "c", 0); set(root, "clock", false); set(root, "cloak", true); });
            A().daCantrip({ actor: lord });
            const m = await untilMsg(n0);
            ok("a cantrip: Night 2 + Manipulation 3, the Winter Court's −1; cloaked for a Mists point", /5 dice, diff 5/.test(text(m)) && /Hush/.test(text(m)) && M(lord) === m0 - 1,
                { card: text(m).slice(0, 240), mists: M(lord) });
        });
        await step("an Unleashing: Mists + Night against the firstborn's 3 dice, one removed by Weaving", async () => {
            const n0 = game.messages.size, w0 = W(lord), m0 = M(lord);
            answer(root => { set(root, "dominion", "night"); set(root, "weave", 1); set(root, "clock", false); set(root, "intent", "Gate 6g: frost on the road"); });
            A().daUnleash({ actor: lord });
            const m = await untilMsg(n0);
            const t = text(m), base = (t.match(/Mists \+ Night : 7 dice, diff 5.*?(\d+) success|Mists \+ Night : 7 dice, diff 5/) ?? [])[1];
            ok("an Unleashing: Mists + Night against the firstborn's 3 dice, one removed by Weaving", /7 dice, diff 5/.test(t) && /Unleashing dice : 2 dice, diff 6/.test(t) && W(lord) === w0 - 1 && M(lord) >= m0 && fl(lord).weavingDay?.n === 1,
                { card: t.slice(0, 320), weaving: W(lord), mists: M(lord), base });
        });
        await step("a changeling out of the mien cannot Unleash", async () => {
            const n0 = game.messages.size;
            answer(root => { set(root, "dominion", "dawn"); set(root, "clock", false); });
            A().daUnleash({ actor: wren }); await sleep(2000);
            const m = game.messages.contents.slice(n0).find(x => /vta-card/.test(x.content ?? ""));
            ok("a changeling out of the mien cannot Unleash", !m, {});
        });
        await step("the mien: a changeling takes it with Mists (6)", async () => {
            const n0 = game.messages.size;
            A().daMien({ actor: wren });
            const m = await untilMsg(n0);
            const f = fl(wren);
            ok("the mien: a changeling takes it with Mists (6)", /Mists : 2 dice, diff 6/.test(text(m)) && (f.mien === true || /does not come|Botch/.test(text(m))), { card: text(m).slice(0, 200), mien: f.mien });
            await wren.setFlag(MOD, "daFae", { ...fl(wren), mien: false, mienLockUntil: 0 });
        });
        await step("countering: scatter a level-3 cantrip with Mists at 8", async () => {
            const n0 = game.messages.size;
            answer(root => { set(root, "kind", "scatter"); set(root, "level", 3); set(root, "theirs", 0); });
            A().daCounter({ actor: lord });
            const m = await untilMsg(n0);
            ok("countering: scatter a level-3 cantrip with Mists at 8", /5 dice, diff 8/.test(text(m)) && /cantrip (fails|holds)/.test(text(m)), { card: text(m).slice(0, 200) });
        });
        await step("an Echo: 5 dice, the firstborn's +1, the Iron Oath and 2 Weaving against it", async () => {
            const n0 = game.messages.size, w0 = W(lord);
            answer(root => { set(root, "e", 0); set(root, "who", "none"); set(root, "weave", 2); });
            A().daEcho({ actor: lord });
            const m = await untilMsg(n0);
            const t = text(m);
            ok("an Echo: 5 dice, the firstborn's +1, the Iron Oath and 2 Weaving against it", /The Echo \(5 dice\) : 5 dice, diff 7/.test(t) && /Iron Oath 2 : 2 dice, diff 7/.test(t) && /\+1 success/.test(t) && W(lord) === w0 - 2 && /(Echo, level \d|The Echo fails)/.test(t) && !!m.getFlag(MOD, "daFaeEcho"),
                { card: t.slice(0, 360), weaving: W(lord) });
        });
        await step("the Mists: Bestow Kenning on a supernatural being costs 2", async () => {
            const n0 = game.messages.size, m0 = M(lord);
            answer(root => { set(root, "use", "kenning"); set(root, "target", "supernatural"); });
            A().daMists({ actor: lord });
            const m = await untilMsg(n0);
            ok("the Mists: Bestow Kenning on a supernatural being costs 2", M(lord) === m0 - 2 && /Kenning 1 for a day/.test(text(m)), { mists: M(lord) });
        });
        await step("rest in a faerie realm: 2 days restore 2 Mists and 2 Weaving", async () => {
            const m0 = M(lord), w0 = W(lord), n0 = game.messages.size;
            answer(root => { set(root, "days", 2); });
            A().daRest({ actor: lord });
            await untilMsg(n0);
            ok("rest in a faerie realm: 2 days restore 2 Mists and 2 Weaving", M(lord) === Math.min(5, m0 + 2) && W(lord) === Math.min(3, w0 + 2), { mists: M(lord), weaving: W(lord) });
        });
        await step("a havoc: 2 Weaving lower it a step", async () => {
            const msg = await flagged(lord, "daFaeHavoc", { step: 5, lowered: 0 });
            const w0 = W(lord);
            await A().daFaeButton(msg, "calm"); await sleep(800);
            const h = game.messages.get(msg.id).getFlag(MOD, "daFaeHavoc");
            ok("a havoc: 2 Weaving lower it a step", h.step === 4 && W(lord) === w0 - 2, { step: h.step, weaving: W(lord) });
        });
        await step("keeping an oath: its rating at 6, a Weaving point a success", async () => {
            const n0 = game.messages.size, w0 = W(lord);
            answer(root => { set(root, "o", 0); });
            A().daOath({ actor: lord });
            const m = await untilMsg(n0);
            const got = Number((text(m).match(/\+(\d+) Weaving/) ?? [])[1]);
            ok("keeping an oath: its rating at 6, a Weaving point a success", /2 dice, diff 6/.test(text(m)) && W(lord) === Math.min(3, w0 + got), { got, weaving: W(lord) });
        });
        await step("cold iron: an aggravated level through WoDX Combat and a Mists point", async () => {
            const m0 = M(lord), a0 = Number(lord.system.health.damage.aggravated) || 0;
            answer(root => { set(root, "k", 1); });
            await A().daColdIron({ actor: lord }); await sleep(1000);
            ok("cold iron: an aggravated level through WoDX Combat and a Mists point", (Number(lord.system.health.damage.aggravated) || 0) === a0 + 1 && M(lord) === m0 - 1, { agg: lord.system.health.damage.aggravated, mists: M(lord) });
            await lord.update(zero);
        });
        await step("an Echo at level 5: the Storyteller's button applies 3 aggravated, once", async () => {
            const msg = await flagged(lord, "daFaeEcho", { level: 5, done: false });
            await A().daFaeButton(msg, "echo5"); await sleep(800);
            await A().daFaeButton(game.messages.get(msg.id), "echo5"); await sleep(600);
            ok("an Echo at level 5: the Storyteller's button applies 3 aggravated, once", Number(lord.system.health.damage.aggravated) === 3, { agg: lord.system.health.damage.aggravated });
            await lord.update(zero);
        });
        await step("hidden by the Mists longer than Willpower: the new day warns the Storyteller", async () => {
            const n0 = game.messages.size;
            await lord.setFlag(MOD, "daFae", { ...fl(lord), hiddenSince: game.time.worldTime - 6 * 86400, lastDay: null });
            await A().daFaeDaily(); await sleep(800);
            const m = game.messages.contents.slice(n0).find(x => /becomes Lost/.test(x.content ?? "") && /Taalandryn/.test(x.content ?? ""));
            ok("hidden by the Mists longer than Willpower: the new day warns the Storyteller", !!m && !!m.whisper?.length, { found: !!m });
            await lord.setFlag(MOD, "daFae", { ...fl(lord), hiddenSince: null });
        });
        await step("the inner voice: the Mists and the Weave follow imbalance", async () => {
            const keep = fl(lord);
            await lord.setFlag(MOD, "daFae", { ...keep, mists: { perm: 6, temp: 6 }, weaving: { perm: 2, temp: 2 } });
            const p = A().voicePressure(lord);
            await lord.setFlag(MOD, "daFae", keep);
            ok("the inner voice: the Mists and the Weave follow imbalance", p?.kind === "mists" && p.level === "rising" && /toward Lost/.test(p.text), { pressure: p });
        });
    } finally { Hooks.off("renderDialogV2", hook); }
    R.finished = new Date().toISOString();
    R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
    const file = new File([JSON.stringify(R, null, 1)], "gate6g-result.json", { type: "application/json" });
    await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
    return R.summary;
}
