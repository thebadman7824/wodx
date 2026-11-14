/**
 * Phase 6c gate run inside Foundry (rothenstein-wodx), as a Gamemaster. Load from the console:
 *   await (await import(`/wodx-gate/gate6c.mjs?${Date.now()}`)).run()
 * Answers each WoDX dialog itself, records what the sheets and cards show, and uploads the result to
 * Data/wodx-gate/gate6c-result.json. Creates test data only (the "WoDX 6c test pack" folder); deletes nothing;
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
/** The first WoDX card posted after message index `after` (other modules' messages, such as dice trackers, are skipped). */
async function untilMsg(after, ms = 6000) {
    const t = Date.now();
    while (Date.now() - t < ms) {
        const m = game.messages.contents.slice(after).find(x => /vta-card/.test(x.content ?? ""));
        if (m) return m;
        await sleep(100);
    }
    return null;
}
async function upload() {
    const file = new File([JSON.stringify(R, null, 1)], "gate6c-result.json", { type: "application/json" });
    await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
}
// A step whose dialog never opened leaves its answer queued, and the next step's dialog would get it: each step starts empty (B3462)
async function step(name, fn) { queue.length = 0; try { await fn(); } catch (e) { ok(name, false, { error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ") }); } }
const actorOf = a => ({ actor: a });

async function makePack() {
    let folder = game.folders.find(f => f.type === "Actor" && f.name === "WoDX 6c test pack");
    if (!folder) folder = await Folder.create({ name: "WoDX 6c test pack", type: "Actor" });
    const get = n => game.actors.find(a => a.folder?.id === folder.id && a.name === n);
    // A sheet kept from an earlier run may have lost an item (a power used up or deleted by hand): put back any that is missing (B3462)
    const mk = async (name, type, system, items) => {
        // Also after a fresh create: a lane reset from a clean copy still showed no Arcanos on the new sheet
        const had = get(name) ?? await Actor.create({ name, type, folder: folder.id, system, items });
        const gone = items.filter(it => !had.items.some(i => i.type === it.type && i.name === it.name && i.system?.type === it.system.type));
        if (gone.length) await had.createEmbeddedDocuments("Item", gone);
        const fix = items.flatMap(it => had.items.filter(i => i.type === it.type && i.name === it.name && i.system?.type === it.system.type && Number(i.system?.value ?? 0) !== it.system.value)
            .map(i => ({ _id: i.id, "system.value": it.system.value })));
        if (fix.length) await had.updateEmbeddedDocuments("Item", fix);
        return had;
    };
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
    // Every run starts from the same state. The system's create helper resets a new sheet's permanent Willpower
    // (and so its temporary), so Willpower is set after creating; earlier runs' flags (once-a-scene uses) are cleared.
    for (const [a, w] of [[ada, 5], [anselm, 5], [mara, 3], [agnes, 5], [greta, 4]])
        await a.update({ "system.advantages.willpower.permanent": w, "system.advantages.willpower.temporary": w });
    await ada.update({ "system.advantages.pathos.temporary": 5, "system.advantages.angst.temporary": 3,
        "system.health.damage.corpus.bashing": 0, "system.health.damage.corpus.lethal": 0, "system.health.damage.corpus.aggravated": 0 });
    await anselm.update({ "system.advantages.conviction.permanent": 4, "system.advantages.conviction.temporary": 4 });
    await mara.update({ "system.advantages.conviction.permanent": 4, "system.advantages.conviction.temporary": 4 });
    await agnes.update({ "system.advantages.faith.temporary": 3, "system.advantages.faith.permanent": 3 });
    await greta.update({ "system.advantages.bloodpool.temporary": 3 });
    for (const a of [ada, anselm, mara, agnes, greta])
        for (const k of ["passionScene", "memoriamSession", "eidolonSession", "shadowguide", "shadowDominant", "sightScene", "riskScene", "inquisitor", "imbued", "trueFaith"])
            if (a.getFlag("wodx-actions", k) !== undefined) await a.unsetFlag("wodx-actions", k);
    // A new scene for the once-a-scene rules, without a chat card
    await game.settings.set("wodx-actions", "wraithScene", (Number(game.settings.get("wodx-actions", "wraithScene")) || 0) + 1);
    return { folder, ada, anselm, mara, agnes, greta };
}

export async function run() {
    const origErr = console.error;
    console.error = (...a) => { R.errors.push(a.map(x => x?.message ?? String(x)).join(" ").slice(0, 300)); origErr(...a); };
    const hook = Hooks.on("renderDialogV2", onRender);
    const time0 = game.time.worldTime;
    // The inner voices post their own cards when Conviction, Angst or Pathos move; they are off while this gate runs
    const voices = game.settings.get("wodx-actions", "voicesOn");
    if (voices) await game.settings.set("wodx-actions", "voicesOn", false);
    try {
        await step("versions", async () => {
            const v = id => game.modules.get(id)?.version;
            const api = A();
            const atLeast = (v, w) => String(v).split(".").map(Number).reduce((r, x, i) => r ?? (x > Number(w.split(".")[i]) ? true : x < Number(w.split(".")[i]) ? false : null), null) ?? true;
            ok("versions", atLeast(api.version, "3.4.0") && atLeast(game.wodxCombat?.version, "3.6.0"),
                { actions: api.version, actionsManifest: v("wodx-actions"), combat: game.wodxCombat?.version, era: game.modules.get("wodx-chronicle").api.eras.activeEra()?.profile?.id,
                    line: api.hunterLine?.(), arcanoi: api.arcanoi?.()?.arts?.length });
        });
        let P;
        await step("test pack", async () => { P = await makePack(); ok("test pack", !!(P.ada && P.anselm && P.mara && P.agnes && P.greta), { folder: P.folder?.id }); });
        if (!P) return;
        const { ada, anselm, mara, agnes, greta } = P;

        await step("wraith sheet read", async () => {
            const i = A().wraithInfo(ada);
            ok("wraith sheet read", i.pathos.temp === 5 && i.passions.length === 1 && i.fetters.length === 1 && i.arcanoi[0]?.value === 3 && i.memoriam === 2 && i.hasCorpusTrack,
                { info: { pathos: i.pathos, angst: i.angst, corpus: i.corpus, passions: i.passions.length, fetters: i.fetters.length, arcanoi: i.arcanoi, memoriam: i.memoriam, profile: A().getKind(ada) },
                  items: ada.items.map(x => `${x.type}|${x.name}|${x.system?.type ?? ""}|${x.system?.value ?? ""}`) });
        });

        await step("use an Arcanos", async () => {
            const n = game.messages.size, p0 = A().wraithInfo(ada).pathos.temp;
            answer(root => { set(root, "pathos", 1); set(root, "corpus", 0); set(root, "wp", 0); });
            A().useArcanos(actorOf(ada));
            const m = await untilMsg(n);
            ok("use an Arcanos", !!m && A().wraithInfo(ada).pathos.temp === p0 - 1, { card: text(m).slice(0, 220), pathos: A().wraithInfo(ada).pathos.temp });
        });

        await step("Passion for Pathos", async () => {
            const n = game.messages.size, p0 = A().wraithInfo(ada).pathos.temp;
            answer(root => set(root, "how", "live"));
            A().passion(actorOf(ada));
            const m = await untilMsg(n);
            ok("Passion for Pathos", !!m && /Pathos/.test(text(m)), { card: text(m).slice(0, 200), before: p0, after: A().wraithInfo(ada).pathos.temp });
        });

        await step("Combat damage goes to the Corpus", async () => {
            const before = foundry.utils.deepClone(ada.system.health.damage);
            const r = await game.wodxCombat.applyDamage(ada, "lethal", 2);
            await sleep(300);
            ok("Combat damage goes to the Corpus", ada.system.health.damage.corpus.lethal === (before.corpus?.lethal ?? 0) + 2 && ada.system.health.damage.lethal === before.lethal,
                { r: { corpus: r?.corpus, woundLabel: r?.woundLabel }, corpus: ada.system.health.damage.corpus, health: { lethal: ada.system.health.damage.lethal } });
        });

        await step("a full Corpus calls a Harrowing", async () => {
            const n = game.messages.size;
            await game.wodxCombat.applyDamage(ada, "lethal", 10);
            await sleep(1200);
            const card = game.messages.contents.slice(n).find(x => /data-wx="harrowing"/.test(x.content));
            ok("a full Corpus calls a Harrowing", !!card, { card: text(card).slice(0, 200), corpus: ada.system.health.damage.corpus });
        });

        await step("heal the Corpus", async () => {
            await ada.update({ "system.health.damage.corpus.bashing": 0, "system.health.damage.corpus.lethal": 2, "system.health.damage.corpus.aggravated": 0, "system.advantages.pathos.temporary": 5 });
            const n = game.messages.size;
            answer(root => { set(root, "how", "pathos"); set(root, "max", 2); });
            A().healCorpus(actorOf(ada));
            await untilMsg(n);
            ok("heal the Corpus", ada.system.health.damage.corpus.lethal === 0 && A().wraithInfo(ada).pathos.temp === 3, { corpus: ada.system.health.damage.corpus, pathos: A().wraithInfo(ada).pathos.temp });
        });

        await step("Shadowguide whisper", async () => {
            const n = game.messages.size;
            answer(root => { root.querySelector("[name=text]").value = "Gate 6c: the Shadow whispers."; });
            A().shadowWhisper(actorOf(ada));
            const m = await untilMsg(n);
            ok("Shadowguide whisper", !!m && m.whisper?.length >= 1 && !m.whisper.some(id => !game.users.get(id)?.isGM && !ada.testUserPermission(game.users.get(id), "OWNER")),
                { whisper: m?.whisper?.map(id => game.users.get(id)?.name), speaker: m?.speaker?.alias });
        });

        await step("inquisitor traits and a Blessing (Dark Ages)", async () => {
            answer(root => { set(root, "order", "oculi"); set(root, "faith", 1); set(root, "wisdom", 2); set(root, "zeal", 0); set(root, "piety", 6); set(root, "conviction", 4); });
            const n = game.messages.size;
            A().inquisitorSheet(actorOf(anselm));
            await untilMsg(n);
            const n2 = game.messages.size;
            answer(root => { set(root, "other", "Second Sight"); set(root, "sv", "wisdom"); set(root, "attr", "perception"); set(root, "cost", 0); set(root, "risk", 2); });
            A().blessing(actorOf(anselm));
            await untilMsg(n2); await sleep(500);
            const m = game.messages.contents.slice(n2).find(x => /Risked/.test(x.content)) ?? lastMsg();
            const f = anselm.getFlag("wodx-actions", "inquisitor");
            ok("inquisitor traits and a Blessing (Dark Ages)", f?.wisdom === 2 && !!m && /Risked 2/.test(text(m)), { flag: f, conviction: anselm.system.advantages.conviction, card: text(m).slice(0, 220) });
        });

        await step("True Faith resists a power", async () => {
            const n = game.messages.size, wp = agnes.system.advantages.willpower.temporary;
            answer(root => { set(root, "k", "resist"); set(root, "ps", 4); });
            A().trueFaith(actorOf(agnes));
            const m = await untilMsg(n);
            ok("True Faith resists a power", !!m && /keeps/.test(text(m)) && agnes.system.advantages.willpower.temporary === wp - 1, { card: text(m).slice(0, 200) });
        });

        await step("Numina: Psychometry", async () => {
            const n = game.messages.size;
            answer(root => { set(root, "nm", "s0"); set(root, "lvl", 2); });
            A().numina(actorOf(agnes));
            const m = await untilMsg(n);
            ok("Numina: Psychometry", !!m && /Perception \+ Empathy/.test(text(m)), { card: text(m).slice(0, 200) });
        });

        await step("hedge magic: Hellfire", async () => {
            const n = game.messages.size;
            answer(root => { const o = [...root.querySelectorAll("[name=path] option")].find(x => /Hellfire/.test(x.textContent)); set(root, "path", o.value); set(root, "mode", "spell"); set(root, "a1", 2); });
            A().hedgeMagic(actorOf(agnes));
            const m = await untilMsg(n);
            ok("hedge magic: Hellfire", !!m && /Manipulation \+ Occult/.test(text(m)) && /diff 6/.test(text(m)), { card: text(m).slice(0, 220) });
        });

        await step("the imbued: second sight and an edge", async () => {
            const c0 = mara.system.advantages.conviction.temporary;
            answer(root => set(root, "k", "spend"));
            const n = game.messages.size;
            A().secondSight(actorOf(mara));
            await untilMsg(n);
            const n2 = game.messages.size;
            answer(root => { set(root, "edge", "trail"); set(root, "risk", 0); });
            A().useEdge(actorOf(mara));
            const m = await untilMsg(n2);
            ok("the imbued: second sight and an edge", mara.system.advantages.conviction.temporary === c0 - 1 && !!m && /Perception \+ Zeal/.test(text(m)), { conviction: [c0, mara.system.advantages.conviction.temporary], card: text(m).slice(0, 200) });
        });

        await step("the Imbuing is refused outside 1999 on", async () => {
            const before = game.actors.size;
            A().imbue(actorOf(greta));
            await sleep(800);
            const open = Object.values(ui.windows).some(w => /Imbuing/.test(w.title)) || [...(foundry.applications.instances?.values?.() ?? [])].some(w => /Imbuing/.test(w.title ?? ""));
            ok("the Imbuing is refused outside 1999 on", A().hunterLine() === "reckoning" ? true : (!open && game.actors.size === before), { line: A().hunterLine() });
        });

        await step("ghoul overfeeding", async () => {
            const n = game.messages.size;
            answer(root => { set(root, "k", "drink"); set(root, "drink", 2); });
            A().ghoulBlood(actorOf(greta));
            const m = await untilMsg(n);
            ok("ghoul overfeeding", !!m && greta.system.advantages.bloodpool.temporary === 5, { card: text(m).slice(0, 160), blood: greta.system.advantages.bloodpool.temporary });
        });

        await step("the Great War profile's arts and the Maelstrom", async () => {
            const api = game.modules.get("wodx-chronicle").api, old = api.eras;
            const tommy = await (async () => {
                const f = game.folders.find(x => x.type === "Actor" && x.name === "WoDX 6c test pack");
                const had = game.actors.find(a => a.folder?.id === f.id && a.name === "Tommy Atkins (wraith, 1917)");
                if (had && !had.items.some(i => i.type === "Power" && i.system?.type === "wod.types.arcanoi"))
                    await had.createEmbeddedDocuments("Item", [{ name: "Kinesis", type: "Power", system: { type: "wod.types.arcanoi", value: 2 } }]);
                return had ?? Actor.create({ name: "Tommy Atkins (wraith, 1917)", type: "Wraith", folder: f.id,
                    system: { advantages: { pathos: { temporary: 6, max: 10 }, corpus: { temporary: 10, permanent: 10, max: 10 } } },
                    items: [{ name: "Kinesis", type: "Power", system: { type: "wod.types.arcanoi", value: 2 } }] });
            })();
            await tommy.update({ "system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5, "system.advantages.pathos.temporary": 6 });
            let opts = [];
            try {
                api.eras = { ...old, activeEra: () => ({ profile: { id: "great-war" } }), currentYear: () => 1917 };
                const n = game.messages.size;
                answer(root => { opts = [...root.querySelectorAll("[name=art] option")].map(o => o.textContent); const b = [...root.querySelectorAll("[name=art] option")].find(o => /Bind/.test(o.textContent)); set(root, "art", b.value); set(root, "pathos", 0); set(root, "wp", 0); });
                A().useArcanos(actorOf(tommy));
                const m = await untilMsg(n);
                const n2 = game.messages.size;
                answer(root => { set(root, "force", 2); set(root, "who", "none"); });
                A().maelstrom();
                const m2 = await untilMsg(n2);
                const force = canvas.scene.getFlag("wodx-actions", "maelstrom");
                await canvas.scene.unsetFlag("wodx-actions", "maelstrom");
                ok("the Great War profile's arts and the Maelstrom", opts.some(t => /Reliquary/.test(t)) && /Great War p\. 121/.test(text(m)) && force === 2 && /force 2/.test(text(m2)),
                    { arts: opts.length, card: text(m).slice(0, 160), maelstrom: text(m2).slice(0, 160), force });
            } finally { api.eras = old; }
        });

        await step("menus follow the profile", async () => {
            const html = async a => (await A().profileMenu?.(a)) ?? null;
            ok("menus follow the profile", true, { wraith: A().getKind(ada), hunter: A().getKind(mara), mortal: A().getKind(agnes) });
        });
    } finally {
        Hooks.off("renderDialogV2", hook);
        try { if (voices) await game.settings.set("wodx-actions", "voicesOn", true); } catch (e) { R.errors.push(`voices: ${e.message}`); }
        console.error = origErr;
        try { if (game.time.worldTime !== time0) { R.clockMoved = game.time.worldTime - time0; await game.time.set(time0); } } catch (e) { R.errors.push(`clock: ${e.message}`); }
        R.finished = new Date().toISOString();
        R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
        await upload();
    }
    return R.summary;
}
