/**
 * WoDX Library and WoDX Storyteller gate (crafting and cookery by region, B3100-B3102), in Foundry, in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatecookways.mjs?${Date.now()}`)).run()
 * Read-only: it never moves the clock, makes nothing, buys nothing and closes the windows it opens.
 *   1. the recipe rules know places (inUse), and sorghum beer, pulque and kava have recipes
 *   2. Cook, brew or mix for a character in Mexico in 1400: pulque is at home, mead is not; in Moravia the other way
 *   3. Make something in Mexico in 1400 marks goods from another land
 *   4. the Cook, brew or mix window opens, with the Lands choice when the scene has a region
 *   5. nothing changed: the clock is where it was
 * Result: Data/wodx-gate/gatecookways-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ST = "wodx-storyteller";

async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 4).join(" | ")}); } };
  const t0 = game.time.worldTime;
  const st = () => game.modules.get(ST).api;
  const MEX = {way: "mesoamerican", region: "mexico"}, MOR = {way: "latin", region: "moravia"};
  const actor = game.actors.find(a => a.type !== "npc" && a.hasPlayerOwner) ?? game.actors.contents[0];
  R.notes.push(`actor ${actor?.name ?? "none"}`);

  await step("1. rules", async () => {
    const l = await st().cookery.lib();
    const g = n => l.G.GOODS.find(x => x.name === n);
    const keys = ["sorghum beer", "pulque", "kava"].map(n => l.R.methodFor(g(n), 1400).method?.key);
    ok("1. recipe rules know places; sorghum beer, pulque and kava have recipes",
      typeof l.R.inUse === "function" && keys.join() === "sorghumbeer,pulque,kava", {keys});
  });

  await step("2. cookery by place", async () => {
    const mx = await st().cookery.list(actor, {year: 1400, where: MEX});
    const mo = await st().cookery.list(actor, {year: 1400, where: MOR});
    const h = (rows, n) => rows.find(x => x.good.name === n)?.here;
    ok("2. Mexico 1400: pulque at home, mead not; Moravia 1400: mead at home, pulque not",
      h(mx, "pulque") === true && h(mx, "mead") === false && h(mo, "mead") === true && h(mo, "pulque") === false,
      {mx: mx.filter(x => x.here).length, mo: mo.filter(x => x.here).length});
  });

  await step("3. crafting by place", async () => {
    const can = await st().owners.makeable(1400, MEX);
    ok("3. Make something in Mexico 1400 marks goods from another land", can.some(x => x.here) && can.some(x => !x.here), {here: can.filter(x => x.here).length, all: can.length});
  });

  await step("4. the window", async () => {
    const here = game.modules.get("wodx-chronicle")?.api?.world?.here?.(canvas?.scene);
    const p = st().cookery.open(actor);
    await sleep(1200);
    const el = document.querySelector(".wst-cook-dlg");
    const sel = el?.querySelector("select[name=lands]");
    const n = el?.querySelectorAll("tr[data-kind]").length ?? 0;
    el?.querySelector("button[data-action=cancel]")?.click();
    await p.catch(() => null);
    ok("4. the Cook, brew or mix window opens; the Lands choice is a fixed list when the scene has a region",
      !!el && n > 0 && (!here?.id || !sel || sel.hasAttribute("data-fixed")), {region: here?.id ?? null, rows: n, lands: !!sel});
  });

  ok("5. nothing changed: the clock is where it was", game.time.worldTime === t0);
  return save(R, "gatecookways-result.json");
}
