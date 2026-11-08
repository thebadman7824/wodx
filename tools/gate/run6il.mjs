/** Runs gates 6i to 6l in turn and writes Data/wodx-gate/gates-6il.json. */
export async function run() {
    const out = { v: game.wodxActions?.version };
    for (const g of ["gate6i", "gate6j", "gate6k", "gate6l"]) {
        try { out[g] = await (await import(`/wodx-gate/${g}.mjs?${Date.now()}`)).run(); }
        catch (e) { out[g] = "FATAL " + e.message + " | " + String(e.stack).split("\n").slice(0, 3).join(" | "); }
    }
    const f = new File([JSON.stringify(out)], "gates-6il.json", { type: "application/json" });
    await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", f, {}, { notify: false });
    console.log("GATES 6IL", out);
    return out;
}
