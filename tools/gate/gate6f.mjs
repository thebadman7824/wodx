/**
 * Phase 6f gate (Dark Ages mages, WoDX Actions 3.7.0), in Foundry (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gate6f.mjs?${Date.now()}`)).run()
 * Makes (or reuses) a test Hermetic in the folder "WoDX 6f test pack" and answers the dialogs itself. Writes chat cards and
 * that actor's sheet; deletes nothing. Result: Data/wodx-gate/gate6f-result.json.
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
async function untilMsg(after, ms = 6000) {
    const t = Date.now();
    while (Date.now() - t < ms) { const m = game.messages.contents.slice(after).find(x => /vta-card/.test(x.content ?? "")); if (m) return m; await sleep(100); }
    return null;
}
async function step(name, fn) { try { await fn(); } catch (e) { ok(name, false, { error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ") }); } }
const Q = a => Number(A().daMageInfo(a)?.quintessence?.value) || 0;
const flags = a => a.getFlag(MOD, "daMage") ?? {};

async function makeMagus() {
    let folder = game.folders.find(f => f.type === "Actor" && f.name === "WoDX 6f test pack");
    if (!folder) folder = await Folder.create({ name: "WoDX 6f test pack", type: "Actor" });
    let a = game.actors.find(x => x.folder?.id === folder.id && x.name === "Magistra Ottilie (6f, Hermetic)");
    if (!a) a = await Actor.create({ name: "Magistra Ottilie (6f, Hermetic)", type: "Mage", folder: folder.id, items: [
        { name: "Fount", type: "Feature", system: { type: "wod.types.background", value: 2 } },
        { name: "Sanctum", type: "Feature", system: { type: "wod.types.background", value: 3 } },
        { name: "Cray", type: "Feature", system: { type: "wod.types.background", value: 2 } }] });
    await a.update({ "system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5,
        "system.health.damage.bashing": 0, "system.health.damage.lethal": 0, "system.health.damage.aggravated": 0 });
    const qp = A().daMageInfo(a)?.quintessence?.path;
    if (qp) await a.update({ [qp]: 10 }); else R.errors.push("no Quintessence track on the sheet");
    for (const k of ["daTries", "crayStore", "fountMonth"]) if (a.getFlag(MOD, k) !== undefined) await a.unsetFlag(MOD, k);
    await a.setFlag(MOD, "daMage", { fellowship: "hermes", foundation: 3, pillars: { anima: 2, corona: 1, primus: 3, vires: 3 }, twilight: { temp: 0, perm: 0 }, brandings: [], system: null });
    return a;
}
async function backlashCard(actor, ones, highest, pillarsUsed = 2) {
    const msg = await ChatMessage.create({ content: `<div class="vta-card wodx-x"><div class="vta-body">Gate 6f: a Backlash card (${ones} ones, highest Pillar ${highest}).</div></div>`,
        whisper: game.users.filter(u => u.isGM).map(u => u.id), flags: { [MOD]: { daBacklash: { actor: actor.uuid, ones, highest, pillarsUsed, cancelled: 0, done: null } } } });
    return game.messages.get(msg.id);
}

export async function run() {
    const hook = Hooks.on("renderDialogV2", onRender);
    try {
        let mg;
        await step("versions and the era", async () => {
            mg = await makeMagus();
            const era = game.modules.get("wodx-chronicle").api.eras.activeEra()?.profile?.id;
            ok("versions and the era", /^3\.7\./.test(A().version) && !!A().daCast && era === "dark-ages", { actions: A().version, era, magus: mg.name });
        });
        await step("the sheet is read: fellowship, Foundation, Pillars, Fount, Sanctum, Quintessence", async () => {
            const i = A().daMageInfo(mg);
            ok("the sheet is read: fellowship, Foundation, Pillars, Fount, Sanctum, Quintessence", i.fellowship === "hermes" && i.foundation === 3 && i.ratings.primus === 3 && i.fount === 2 && i.sanctum === 3 && i.quintessence.value === 10,
                { fellowship: i.fellowship, foundation: i.foundation, ratings: i.ratings, fount: i.fount, sanctum: i.sanctum, q: i.quintessence.value });
        });
        await step("the menu offers Foundation and Pillars in the Dark Ages", async () => {
            let seen = null;
            answer(root => { seen = root.textContent; return "cancel"; });
            A().menu({ actor: mg }); await sleep(1500);
            ok("the menu offers Foundation and Pillars in the Dark Ages", /Cast a spell \(Foundation \+ Pillar\)/.test(seen ?? "") && !/Cast an effect \(Arete\)/.test(seen ?? ""), { found: !!seen });
        });
        await step("Fellowship and Pillars saves the sheet", async () => {
            answer(root => { set(root, "p-corona", 2); });
            await A().daMage({ actor: mg }); await sleep(800);
            ok("Fellowship and Pillars saves the sheet", flags(mg).pillars?.corona === 2 && flags(mg).foundation === 3, { pillars: flags(mg).pillars });
        });
        await step("a simple spell: Modus + Vires, difficulty 4 + 2, one Quintessence lowers it", async () => {
            const n0 = game.messages.size, q0 = Q(mg);
            answer(root => { set(root, "l-vires", 2); set(root, "q", 1); });
            A().daCast({ actor: mg });
            const m = await untilMsg(n0);
            ok("a simple spell: Modus + Vires, difficulty 4 + 2, one Quintessence lowers it", /6 dice, diff 5/.test(text(m)) && Q(mg) === q0 - 1, { card: text(m).slice(0, 220), q: Q(mg) });
        });
        await step("a complex spell above 9: difficulty 9 with extra successes, and a Pillar above Modus steadied", async () => {
            await mg.setFlag(MOD, "daMage", { ...flags(mg), pillars: { ...flags(mg).pillars, primus: 4 } });
            if (mg.getFlag(MOD, "daTries") !== undefined) await mg.unsetFlag(MOD, "daTries");
            const n0 = game.messages.size, q0 = Q(mg);
            answer(root => { set(root, "l-anima", 1); set(root, "l-primus", 4); set(root, "l-vires", 1); });
            A().daCast({ actor: mg });
            const m = await untilMsg(n0);
            ok("a complex spell above 9: difficulty 9 with extra successes, and a Pillar above Modus steadied", /9 dice, diff 9/.test(text(m)) && /2 extra success/.test(text(m)) && Q(mg) === q0 - 1,
                { card: text(m).slice(0, 260), q: Q(mg) });
            await mg.setFlag(MOD, "daMage", { ...flags(mg), pillars: { ...flags(mg).pillars, primus: 3 } });
        });
        await step("the Fount's limit: more Quintessence than the turn allows is refused", async () => {
            const n0 = game.messages.size, q0 = Q(mg);
            await mg.setFlag(MOD, "daMage", { ...flags(mg), pillars: { ...flags(mg).pillars, primus: 4 } });
            answer(root => { set(root, "l-primus", 4); set(root, "q", 3); });
            A().daCast({ actor: mg }); await sleep(2000);
            const m = game.messages.contents.slice(n0).find(x => /vta-card/.test(x.content ?? ""));
            ok("the Fount's limit: more Quintessence than the turn allows is refused", !m && Q(mg) === q0, { q: Q(mg) });
            await mg.setFlag(MOD, "daMage", { ...flags(mg), pillars: { ...flags(mg).pillars, primus: 3 } });
        });
        await step("Backlash: Quintessence cancels a 1 (cost 1), then Twilight from the rest", async () => {
            const msg = await backlashCard(mg, 3, 4, 3);
            const q0 = Q(mg);
            answer(root => { set(root, "k", 1); });
            await A().daBacklashButton(msg, "cancel"); await sleep(800);
            const after = msg.getFlag(MOD, "daBacklash");
            await A().daBacklashButton(game.messages.get(msg.id), "twilight"); await sleep(800);
            const tw = flags(mg).twilight;
            ok("Backlash: Quintessence cancels a 1 (cost 1), then Twilight from the rest", Q(mg) === q0 - 1 && after.cancelled === 1 && tw.temp === 4 && tw.perm === 0 && game.messages.get(msg.id).getFlag(MOD, "daBacklash").done === "twilight",
                { q: Q(mg), cancelled: after.cancelled, twilight: tw });
        });
        await step("Scourging through WoDX Combat: two 1s at Pillar 3 are four lethal levels", async () => {
            const msg = await backlashCard(mg, 2, 3);
            await A().daBacklashButton(msg, "scourging"); await sleep(1000);
            const d = mg.system.health.damage;
            ok("Scourging through WoDX Combat: two 1s at Pillar 3 are four lethal levels", Number(d.lethal) === 4, { damage: { b: d.bashing, l: d.lethal, a: d.aggravated } });
            await mg.update({ "system.health.damage.lethal": 0, "system.health.damage.bashing": 0, "system.health.damage.aggravated": 0 });
        });
        await step("Branding: two 1s at Pillar 4 are a second-level mark", async () => {
            const msg = await backlashCard(mg, 2, 4);
            answer(root => { set(root, "text", "Gate 6f: a smell of hot iron"); });
            await A().daBacklashButton(msg, "branding"); await sleep(1000);
            const b = flags(mg).brandings ?? [];
            ok("Branding: two 1s at Pillar 4 are a second-level mark", b.length === 1 && b[0].level === 2 && /hot iron/.test(b[0].text), { brandings: b });
        });
        await step("abstinence: ten days without magic fade the Twilight and the marks", async () => {
            const now = game.time.worldTime;
            await mg.setFlag(MOD, "daMage", { ...flags(mg), twilight: { temp: 4, perm: 0 }, brandings: [{ level: 1, text: "gate" }], lastFade: now - 10 * 86400, fadeCarry: { twilight: 0, brandings: 0 } });
            await A().daFade(); await sleep(800);
            const f = flags(mg);
            ok("abstinence: ten days without magic fade the Twilight and the marks", f.twilight.temp === 0 && f.twilight.perm === 0 && f.brandings.length === 0 && f.lastFade === now, { twilight: f.twilight, brandings: f.brandings });
        });
        await step("the Fount's monthly rite gives its rating in Quintessence", async () => {
            const q0 = Q(mg), n0 = game.messages.size;
            answer(root => { set(root, "how", "fount"); });
            A().daQuintessence({ actor: mg });
            const m = await untilMsg(n0);
            ok("the Fount's monthly rite gives its rating in Quintessence", Q(mg) === q0 + 2 && /\+2 Quintessence/.test(text(m)), { q: Q(mg) });
        });
        await step("the Gift: the voice's meter follows Twilight", async () => {
            await mg.setFlag(MOD, "daMage", { ...flags(mg), twilight: { temp: 0, perm: 4 } });
            const p = A().voicePressure(mg);
            await mg.setFlag(MOD, "daMage", { ...flags(mg), twilight: { temp: 0, perm: 0 } });
            ok("the Gift: the voice's meter follows Twilight", p?.kind === "gift" && p.level === "rising", { pressure: p });
        });
    } finally { Hooks.off("renderDialogV2", hook); }
    R.finished = new Date().toISOString();
    R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
    const file = new File([JSON.stringify(R, null, 1)], "gate6f-result.json", { type: "application/json" });
    await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
    return R.summary;
}
