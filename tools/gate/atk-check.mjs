// Live check of the automatic attack: Wilhelm (test) attacks Miller Jost (test), then Miller attacks Wilhelm, with the default Weapon.
export async function run() {
    const out = { steps: [] };
    const W = game.actors.find(a => a.name.startsWith("Wilhelm Eisenfang (test)")), M = game.actors.find(a => a.name.startsWith("Miller Jost (test)"));
    let opened = null;
    const h = Hooks.on("renderDialogV2", async (app, el) => {
        await new Promise(r => setTimeout(r, 150));
        const root = el instanceof HTMLElement ? el : el[0];
        const sel = root.querySelector("select[name=weapon]");
        if (!sel) return;
        opened = { weapon: sel.value, first: sel.options[0]?.textContent.trim(), defense: root.querySelector("select[name=defense]")?.value };
        root.querySelector("button[data-action=attack]")?.click();
    });
    try {
        for (const [a, t] of [[W, M], [M, W]]) {
            const n = game.messages.size;
            await game.wodxCombat.attack({ attacker: a, target: t });
            const t0 = Date.now(); while (game.messages.size === n && Date.now() - t0 < 8000) await new Promise(r => setTimeout(r, 100));
            const c = game.messages.contents.at(-1)?.content ?? "";
            const plan = game.wodxCombat.bestAttack(a, t, { defense: "auto" });
            out.steps.push({ attacker: a.name, opened, note: (c.match(/Automatic attack:[^<]*/) ?? [""])[0], defense: (c.match(/Automatic defense:[^<]*/) ?? [""])[0],
                plans: plan.plans.map(p => [p.w.name, p.valid, p.valid ? +p.expectedLevels.toFixed(2) : p.why]), distance: plan.distance });
        }
    } finally { Hooks.off("renderDialogV2", h); }
    const file = new File([JSON.stringify(out, null, 1)], "atk-check.json", { type: "application/json" });
    await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
    return out.steps.map(s => s.note.slice(0, 80)).join(" | ");
}
