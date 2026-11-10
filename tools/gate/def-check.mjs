// Live check of the automatic defense: Miller Jost (test) attacks Wilhelm Eisenfang (test) with the default Defense.
export async function run() {
    const out = { steps: [] };
    const W = game.actors.find(a => a.name.startsWith("Wilhelm Eisenfang (test)")), M = game.actors.find(a => a.name.startsWith("Miller Jost (test)"));
    const knife = M.items.find(i => i.name === "Silver knife (test)");
    let defaultValue = null;
    const h = Hooks.on("renderDialogV2", async (app, el) => {
        await new Promise(r => setTimeout(r, 150));
        const root = el instanceof HTMLElement ? el : el[0];
        const sel = root.querySelector("select[name=defense]");
        if (!sel) return;
        defaultValue = sel.value;
        out.options = [...sel.options].map(o => o.textContent.trim());
        root.querySelector("button[data-action=attack]")?.click();
    });
    try {
        for (const [label, wid] of [["knife", knife?.id], ["punch", "unarmed:punch"]]) {
            const n = game.messages.size;
            await game.wodxCombat.attack({ attacker: M, target: W, weaponId: wid });
            const card = () => game.messages.contents.slice(n).find(m => /Automatic defense:/.test(m.content));
            const t0 = Date.now(); while (!card() && Date.now() - t0 < 8000) await new Promise(r => setTimeout(r, 100));
            const msg = card();
            out.steps.push({ label, defaultValue, auto: (msg?.content.match(/Automatic defense:[^<]*/) ?? [""])[0], defense: (msg?.content.replace(/<[^>]+>/g, " ").match(/(Dodge|Block|Parry) \(Dexterity \+ [^)]*\)[^A-Z]*/) ?? [""])[0] });
        }
        out.best = game.wodxCombat.bestDefense(W, { defIndex: 0, defDice: 0, defDiff: 0 }, { ranged: false, type: "lethal" }).plans.map(p => [p.type, p.valid, p.dice, p.diff, !!p.weapon, p.invalid]);
    } finally { Hooks.off("renderDialogV2", h); }
    const file = new File([JSON.stringify(out, null, 1)], "def-check.json", { type: "application/json" });
    await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
    const pass = out.steps.filter(s => s.auto).length;
    out.summary = `${pass}/${out.steps.length}`;
    console.log("def-check", out.summary, out.steps.map(s => s.auto).join(" | "));
    return out.summary;
}
