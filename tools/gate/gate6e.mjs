/**
 * Phase 6e gate (the WoDX look), run inside Foundry (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gate6e.mjs?${Date.now()}`)).run()
 * Uses a "WoDX 6e test pack" folder. Puts this computer's look settings back as they were; deletes nothing (its test card is
 * whispered to the Gamemaster). Result: Data/wodx-gate/gate6e-result.json.
 */
const R = { started: new Date().toISOString(), steps: [], errors: [] };
const MOD = "wodx-actions", CH = "wodx-chronicle";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const A = () => game.wodxActions;
const ok = (name, pass, detail = {}) => { R.steps.push({ name, pass: !!pass, ...detail }); };
const queue = [];
function answer(fill) { queue.push(fill); }
async function onRender(app, el) {
    const f = queue.shift();
    if (!f) return;
    const root = el instanceof HTMLElement ? el : el?.[0];
    await sleep(300);
    let res;
    try { res = await f(root, app); } catch (e) { R.errors.push(`answer: ${e.message}`); }
    if (res === "cancel") { app.close(); return; }
    root.querySelector(`button[data-action="${res ?? "ok"}"]`)?.click();
}
const set = (root, name, value) => {
    const el = root.querySelector(`[name="${name}"]`);
    if (!el) throw new Error(`no field ${name}`);
    el.value = String(value);
    el.dispatchEvent(new Event("change", { bubbles: true }));
};
async function until(pred, ms = 6000) { const t = Date.now(); while (Date.now() - t < ms) { const v = pred(); if (v) return v; await sleep(100); } return null; }
async function step(name, fn) { try { await fn(); } catch (e) { ok(name, false, { error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ") }); } }
const hex = c => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c); return m ? [m[1], m[2], m[3]].map(Number).map(v => v / 255) : null; };
const lum = rgb => { const [r, g, b] = rgb.map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

export async function run() {
    const origErr = console.error;
    console.error = (...a) => { R.errors.push(a.map(x => x?.message ?? String(x)).join(" ").slice(0, 300)); origErr(...a); };
    const hook = Hooks.on("renderDialogV2", onRender);
    const was = { look: game.settings.get(CH, "look"), size: game.settings.get(CH, "textSize"), motion: game.settings.get(CH, "motion"), recent: game.settings.get(MOD, "menuRecent") };
    let testMsg = null;
    try {
        await step("versions", async () => {
            const ch = game.modules.get(CH)?.version;
            ok("versions", A().version === "3.6.0" && ch === "0.3.0" && !!game.modules.get(CH).api?.theme, { actions: A().version, chronicle: ch });
        });
        await game.settings.set(CH, "look", "era");
        await game.settings.set(CH, "textSize", "1");

        await step("the era's look is on", async () => {
            const b = document.body, prof = game.modules.get(CH).api.eras.activeEra().profile;
            const sheet = [...document.styleSheets].some(s => /wodx-theme\.css/.test(s.href ?? ""));
            ok("the era's look is on", b.classList.contains("wodx-look") && b.dataset.wodxKit === (prof?.kit ?? prof?.id) && ["light", "dark"].includes(b.dataset.wodxTone) && sheet,
                { kit: b.dataset.wodxKit, tone: b.dataset.wodxTone, era: prof?.id, sheet });
        });

        await step("the bundled fonts load", async () => {
            const faces = [...document.fonts].filter(f => /^"?WX /.test(f.family));
            await Promise.all(faces.map(f => f.load().catch(() => null)));
            const bad = faces.filter(f => f.status !== "loaded").map(f => f.family);
            ok("the bundled fonts load", faces.length >= 13 && !bad.length, { faces: faces.length, failed: bad });
        });

        let folder = game.folders.find(f => f.type === "Actor" && f.name === "WoDX 6e test pack");
        if (!folder) folder = await Folder.create({ name: "WoDX 6e test pack", type: "Actor" });
        const get = nm => game.actors.find(a => a.folder?.id === folder.id && a.name === nm);
        const mk = async (nm, type) => get(nm) ?? Actor.create({ name: nm, type, folder: folder.id });
        const ilse = await mk("Ilse (6e, Kindred)", "Vampire");
        const ada = await mk("Ada (6e, wraith)", "Wraith");
        const anselm = await mk("Brother Anselm (6e, hunter)", "Hunter");
        for (const a of [ilse, ada, anselm]) await a.update({ "system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5 });

        await step("the menus are grouped by intent, in the line's colours", async () => {
            const seen = {};
            for (const [a, line] of [[ilse, "kindred"], [ada, "wraith"], [anselm, "hunter"]]) {
                answer(async root => {
                    const app = root.closest(".application") ?? root;
                    const bands = [...root.querySelectorAll("fieldset.vta-band")].map(f => f.className.match(/vta-band-(\w+)/)?.[1]);
                    const find = root.querySelector(".vta-menu-find");
                    const all = root.querySelectorAll(".vta-intents button[data-k]").length;
                    find.value = "will"; find.dispatchEvent(new Event("input", { bubbles: true }));
                    await sleep(100);
                    const shown = [...root.querySelectorAll(".vta-intents button[data-k]")].filter(b => b.style.display !== "none").length;
                    const btn = root.querySelector(".vta-intents button[data-k]");
                    btn.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
                    const hint = root.querySelector(".vta-hintbar")?.textContent ?? "";
                    const accent = getComputedStyle(app).getPropertyValue("--wx-accent").trim();
                    seen[line] = { lineClass: app.classList.contains(`wodx-line-${line}`), bands, all, shown, hint: hint.slice(0, 80), accent, titled: !!btn.title };
                    return "cancel";
                });
                A().menu({ actor: a });
                await until(() => seen[line], 5000);
            }
            const good = Object.values(seen).length === 3 && Object.values(seen).every(s => s.lineClass && s.bands[0] === "act" && s.bands.includes("resist") && s.bands.includes("st")
                && s.shown >= 1 && s.shown < s.all && s.titled && s.hint.length > 5);
            const accents = new Set(Object.values(seen).map(s => s.accent));
            ok("the menus are grouped by intent, in the line's colours", good && accents.size === 3, seen);
        });

        await step("a card: header, roll, what changed with pips", async () => {
            const n = game.messages.size;
            answer(root => { set(root, "use", 0); set(root, "cost", 1); });
            A().uses({ actor: ilse, resource: "willpower" });
            const m = await until(() => game.messages.contents.slice(n).find(x => /vta-card wodx-x/.test(x.content ?? "")), 6000);
            const c = await until(() => /vta-change/.test(m?.content ?? "") ? m : null, 3000);
            const el = m ? document.querySelector(`#chat [data-message-id="${m.id}"] .vta-card.wodx-x, [data-message-id="${m.id}"] .vta-card.wodx-x`) : null;
            ok("a card: header, roll, what changed with pips", !!m && /class="vta-head"/.test(m.content) && /data-line="kindred"/.test(m.content) && !!c && /vta-pip/.test(c.content) && /Willpower/.test(c.content),
                { title: m ? m.content.match(/<h3>(.*?)<\/h3>/)?.[1] : null, changes: c ? c.content.match(/<div class="vta-change">[\s\S]*?<\/div>/)?.[0]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : null,
                  rendered: !!el, willpower: ilse.system.advantages.willpower.temporary });
        });

        await step("an older card is shown in the new layout", async () => {
            testMsg = await ChatMessage.create({ content: `<div class="vta-card"><h3>Gate 6e: an older card</h3><p>Plain text.</p><p class="wodx-quiet">Gate test p. 1</p></div>`, whisper: [game.user.id], speaker: { alias: "WoDX" } });
            const el = await until(() => document.querySelector(`[data-message-id="${testMsg.id}"] .vta-card.wodx-x`), 4000);
            ok("an older card is shown in the new layout", !!el && !!el.querySelector(".vta-head h3") && !!el.querySelector(".vta-ref") && /Gate test p\. 1/.test(el.querySelector(".vta-ref")?.textContent ?? ""),
                { html: el?.outerHTML?.slice(0, 200) });
        });

        await step("contrast on the card as drawn", async () => {
            const el = document.querySelector(`[data-message-id="${testMsg?.id}"] .vta-card.wodx-x .vta-body`) ?? document.querySelector(".vta-card.wodx-x .vta-body");
            const card = el?.closest(".vta-card");
            const cs = card ? getComputedStyle(card) : null;
            const ink = hex(getComputedStyle(el).color), paper = hex(cs.backgroundColor);
            const head = card.querySelector(".vta-head"), hs = getComputedStyle(head);
            const barBg = hex(hs.backgroundColor) ?? paper, barInk = hex(hs.color);
            const r1 = ratio(ink, paper), r2 = ratio(barInk, barBg);
            ok("contrast on the card as drawn", r1 >= 7 && r2 >= 4.5, { body: r1.toFixed(2), header: r2.toFixed(2), font: cs.fontFamily.slice(0, 60) });
        });

        await step("each player's look, text size and motion", async () => {
            await game.settings.set(CH, "look", "plain");
            const plain = !document.body.classList.contains("wodx-look");
            await game.settings.set(CH, "look", "dark");
            const dark = document.body.dataset.wodxTone === "dark" && document.body.classList.contains("wodx-look");
            await game.settings.set(CH, "textSize", "1.3");
            const size = document.body.style.getPropertyValue("--wx-scale") === "1.3";
            await game.settings.set(CH, "motion", "reduce");
            const motion = document.body.dataset.wodxMotion === "reduce";
            ok("each player's look, text size and motion", plain && dark && size && motion, { plain, dark, size, motion });
        });
    } finally {
        Hooks.off("renderDialogV2", hook);
        console.error = origErr;
        await game.settings.set(CH, "look", was.look);
        await game.settings.set(CH, "textSize", was.size);
        await game.settings.set(CH, "motion", was.motion);
        await game.settings.set(MOD, "menuRecent", was.recent);
        R.finished = new Date().toISOString();
        R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
        const file = new File([JSON.stringify(R, null, 1)], "gate6e-result.json", { type: "application/json" });
        await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
    }
    return R.summary;
}
