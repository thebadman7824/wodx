/**
 * Phase 6n gate (the Dark Ages: Mage Grimoire, WoDX Actions 3.15.0), in Foundry (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gate6n.mjs?${Date.now()}`)).run()
 * Makes (or reuses) a test Hermetic and a test Valdaerman in the folder "WoDX 6n test pack" and answers the dialogs itself.
 * Moves the clock to a night hour for the Moon's offering and puts it back. Writes chat cards and those actors' sheets;
 * deletes nothing. Result: Data/wodx-gate/gate6n-result.json.
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
async function untilMsg(after, ms = 6000, re = /vta-card/) {
    const t = Date.now();
    while (Date.now() - t < ms) { const m = game.messages.contents.slice(after).find(x => re.test(x.content ?? "")); if (m) return m; await sleep(100); }
    return null;
}
async function step(name, fn) { try { await fn(); } catch (e) { ok(name, false, { error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ") }); } }
const Q = a => Number(A().daMageInfo(a)?.quintessence?.value) || 0;
const flags = a => a.getFlag(MOD, "daMage") ?? {};

async function makeMage(folder, name, fellowship, foundation, pillars, extra = {}) {
    let a = game.actors.find(x => x.folder?.id === folder.id && x.name === name);
    if (!a) a = await Actor.create({ name, type: "Mage", folder: folder.id, items: [
        { name: "Fount", type: "Feature", system: { type: "wod.types.background", value: 2 } }] });
    await a.update({ "system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5,
        "system.health.damage.bashing": 0, "system.health.damage.lethal": 0, "system.health.damage.aggravated": 0 });
    const qp = A().daMageInfo(a)?.quintessence?.path;
    if (qp) await a.update({ [qp]: 10 }); else R.errors.push("no Quintessence track on the sheet");
    for (const k of ["daTries", "crayStore", "fountMonth"]) if (a.getFlag(MOD, k) !== undefined) await a.unsetFlag(MOD, k);
    await a.setFlag(MOD, "daMage", { fellowship, foundation, pillars, twilight: { temp: 0, perm: 0 }, brandings: [], system: null, ...extra });
    return a;
}

export async function run() {
    const hook = Hooks.on("renderDialogV2", onRender);
    const time0 = game.time.worldTime;
    try {
        let mg, rival;
        await step("versions, the era and the new actions", async () => {
            let folder = game.folders.find(f => f.type === "Actor" && f.name === "WoDX 6n test pack");
            if (!folder) folder = await Folder.create({ name: "WoDX 6n test pack", type: "Actor" });
            mg = await makeMage(folder, "Magistra Hedda (6n, Hermetic)", "hermes", 4, { anima: 2, corona: 3, primus: 4, vires: 2 },
                { specialties: { foundation: "Control", pillars: { primus: "Wards" } } });
            rival = await makeMage(folder, "Ragnhild Blood-Oath (6n, Valdaerman)", "valdaermen", 3, { fara: 2, forlog: 3, galdrar: 2, hjaldar: 4 });
            const era = game.modules.get("wodx-chronicle").api.eras.activeEra()?.profile?.id;
            ok("versions, the era and the new actions", !foundry.utils.isNewerVersion("3.15.0", A().version) && !!A().daCountermagic && !!A().daGuide && !!A().daCertamen && A().daCountermagic !== A().daCounter && era === "dark-ages",
                { actions: A().version, era });
        });
        await step("the menu offers Countermagic, Using the Art and Certámen, and the fae keep their own Counter", async () => {
            let seen = null;
            answer(root => { seen = root.innerHTML; return "cancel"; });
            A().menu({ actor: mg }); await sleep(1500);
            ok("the menu offers Countermagic, Using the Art and Certámen, and the fae keep their own Counter", /api:daCountermagic/.test(seen ?? "") && /api:daGuide/.test(seen ?? "") && /api:daCertamen/.test(seen ?? "") && !/"api:daCounter"/.test(seen ?? ""), { found: !!seen });
        });
        await step("a Grimoire rote: Revoking the Gift of Adam casts with its Grimoire page", async () => {
            const n0 = game.messages.size;
            let listed = false;
            answer(root => { const o = root.querySelector('select[name=rote] option[value="g-revokeadam"]'); listed = !!o && /Grimoire/.test(o.textContent); set(root, "rote", "g-revokeadam"); });
            A().daCast({ actor: mg });
            const m = await untilMsg(n0);
            ok("a Grimoire rote: Revoking the Gift of Adam casts with its Grimoire page", listed && /Revoking the Gift of Adam/.test(text(m)) && /7 dice, diff 7/.test(text(m)) && (/Grimoire p\. 57/.test(text(m)) || !/takes hold/.test(text(m))),
                { listed, card: text(m).slice(0, 300) });
        });
        await step("the Foundation's specialty adds a die; a Pillar's specialty is offered at 4 dots", async () => {
            if (mg.getFlag(MOD, "daTries") !== undefined) await mg.unsetFlag(MOD, "daTries");
            const n0 = game.messages.size;
            let offered = false;
            answer(root => { offered = !!root.querySelector("[name=specF]") && !!root.querySelector("[name=specP]"); set(root, "l-primus", 2); set(root, "specF", true); set(root, "specP", true); });
            A().daCast({ actor: mg });
            const m = await untilMsg(n0);
            ok("the Foundation's specialty adds a die; a Pillar's specialty is offered at 4 dots", offered && /9 dice, diff 6/.test(text(m)) && /specialty/.test(text(m)), { offered, card: text(m).slice(0, 300) });
        });
        await step("countermagic: Primus 3 costs 1 Quintessence and cancels successes", async () => {
            const n0 = game.messages.size, q0 = Q(mg);
            answer(root => { set(root, "way", 0); set(root, "incoming", 2); });
            A().daCountermagic({ actor: mg });
            const m = await untilMsg(n0);
            ok("countermagic: Primus 3 costs 1 Quintessence and cancels successes", /countermagic/i.test(text(m)) && /8 dice, diff 7/.test(text(m)) && Q(mg) === q0 - 1 && /(left|undone|fails)/.test(text(m)), { card: text(m).slice(0, 260), q: Q(mg) });
        });
        await step("Using the Art lists the fellowship's Pillar levels with a search box", async () => {
            let seen = null, box = false;
            answer(root => { seen = root.textContent; box = !!root.querySelector("input.wodx-search"); });
            A().daGuide({ actor: mg }); await sleep(1500);
            ok("Using the Art lists the fellowship's Pillar levels with a search box", box && /Detect magic/.test(seen ?? "") && /Primus 1/.test(seen ?? "") && /Brooch of Scrying/.test(seen ?? "") && !/Galdrar 1/.test(seen ?? ""), { box });
        });
        await step("the Moon's offering at night: a calf gives 3, or 4 under a full moon", async () => {
            const cal = await import("/modules/wodx-chronicle/scripts/calendar.mjs");
            const lat = game.settings.get("wodx-chronicle", "latitude");
            let t = time0, d = cal.describeTime(t, lat);
            for (let k = 0; k < 30 && !d.isNight; k++) { t += 3600; d = cal.describeTime(t, lat); }
            if (t !== time0) await game.time.advance(t - time0);
            await sleep(500);
            const q0 = Q(mg), n0 = game.messages.size;
            let offered = false;
            answer(root => { offered = !!root.querySelector('option[value="moon"]'); set(root, "how", "moon"); set(root, "offer", "calf"); });
            A().daQuintessence({ actor: mg });
            const m = await untilMsg(n0);
            const want = 3 + (d.moon?.index === 4 ? 1 : 0);
            ok("the Moon's offering at night: a calf gives 3, or 4 under a full moon", offered && Q(mg) === Math.min(q0 + want, 14) && /Grimoire p\. 111/.test(text(m)), { offered, q0, q: Q(mg), moon: d.moon?.name });
            if (game.time.worldTime !== time0) await game.time.advance(time0 - game.time.worldTime);
        });
        await step("Certámen: wills and the locus are rolled, then strikes until a locus empties", async () => {
            const n0 = game.messages.size;
            answer(root => { set(root, "foe", rival.id); set(root, "stake", "Gate 6n: a book of runes"); });
            answer(root => { set(root, "a-locus", "primus"); set(root, "a-aegis", "anima"); set(root, "a-gladius", "vires"); set(root, "b-locus", "forlog"); set(root, "b-aegis", "fara"); set(root, "b-gladius", "hjaldar"); });
            A().daCertamen({ actor: mg });
            const m = await untilMsg(n0, 8000, /Certámen/);
            let duel = m?.getFlag(MOD, "daDuel"), strikes = 0;
            for (; duel && !duel.done && strikes < 24; strikes++) {
                answer(root => { set(root, "side", strikes % 2 ? "b" : "a"); set(root, "sa", "offensive"); set(root, "sd", "balanced"); });
                await A().daBacklashButton(game.messages.get(m.id), "duelx"); await sleep(1500);
                duel = game.messages.get(m.id).getFlag(MOD, "daDuel");
            }
            if (duel && !duel.done) { answer(root => { set(root, "side", "b"); }); await A().daBacklashButton(game.messages.get(m.id), "duelyield"); await sleep(1500); duel = game.messages.get(m.id).getFlag(MOD, "daDuel"); }
            const end = game.messages.contents.slice(n0).some(x => /wins|called off/.test(text(x)));
            ok("Certámen: wills and the locus are rolled, then strikes until a locus empties", !!m && /Manipulation \+ Intimidation/.test(text(m)) && end && (!duel || !!duel.done),
                { strikes, done: duel?.done ?? null, card: text(m).slice(0, 260) });
        });
    } finally {
        Hooks.off("renderDialogV2", hook);
        if (game.time.worldTime !== time0) await game.time.advance(time0 - game.time.worldTime);
    }
    R.finished = new Date().toISOString();
    R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
    const file = new File([JSON.stringify(R, null, 1)], "gate6n-result.json", { type: "application/json" });
    await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
    return R.summary;
}
