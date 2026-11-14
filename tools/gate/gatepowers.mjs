/**
 * Powers gate (powers pass, B3740 on), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatepowers.mjs?${Date.now()}`)).run()
 * Each step uses a power through its own WoDX window, the way a player would, and checks that the card says what the
 * power does and that its effect reaches the effects card. Makes its own actors in the folder "WoDX powers gate" and
 * deletes them at the end. Steps are added line by line as the pass builds them.
 *   1. Wraith: Phantom Wings (Argos 2) through Use an Arcanos puts Rise on the effects card for the wraith (B3740)
 *   2. Demon: Water Form (Storms 2) through Evoke shows its card and puts Shape on the effects card; at permanent Faith 1 a
 *      second lasting evocation is refused (B3741, B3742)
 *   3. Demon: Kishar's form through the apocalyptic form adds Strength +2 and lethal soak, taken back at the scene's end (B3743)
 *   4. C20: Quicksilver picked by name in Cast a cantrip (Wayfare 2, Fae) shows its card and puts Hasten on the effects
 *      card; only the levels the Art reaches are offered (B3744)
 *   5. Mummy: Mend Flesh picked by name in the Hekau window (Nomenclature 2) fills in its path, level, difficulty and cost,
 *      shows its card and puts Mend on the effects card; spells above the path's rating are not offered (B3745)
 * Result: Data/wodx-gate/gatepowers-result.json.
 */
const R = { started: new Date().toISOString(), steps: [], errors: [], notes: [] };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const A = () => game.wodxActions;
const ok = (name, pass, detail = {}) => R.steps.push({ name, pass: !!pass, ...detail });
const queue = [];
const answer = fill => queue.push(fill);
async function onRender(app, el) {
  const f = queue.shift();
  if (!f) return;
  const root = el instanceof HTMLElement ? el : el?.[0];
  await sleep(250);
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
async function untilMsg(after, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    const m = game.messages.contents.slice(after).find(x => /vta-card/.test(x.content ?? ""));
    if (m) return m;
    await sleep(100);
  }
  return null;
}
async function step(name, fn) { queue.length = 0; try { await fn(); } catch (e) { ok(name, false, { error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ") }); } }
const fx = m => m?.flags?.["wodx-actions"]?.kind === "effects" ? (m.flags["wodx-actions"].items ?? []) : [];

export async function run() {
  if (game.world.id === "rothenstein-live") return "Not on the Live world.";
  const hooks = [["renderDialogV2", Hooks.on("renderDialogV2", onRender)]];
  const folder = await Folder.create({ name: "WoDX powers gate", type: "Actor" });
  const made = [];
  const mk = async (name, type, system, items) => { const a = await Actor.create({ name: `WoDX gate: ${name}`, type, folder: folder.id, system, items }); made.push(a); return a; };
  try {
    await step("1 Wraith Arcanos keywords", async () => {
      const w = await mk("Arcanos wraith", "Wraith", {
        advantages: { pathos: { temporary: 8, max: 10 }, angst: { temporary: 2, permanent: 3, max: 10 }, corpus: { temporary: 10, permanent: 10, max: 10 }, willpower: { permanent: 5, temporary: 5 } }
      }, [{ name: "Argos", type: "Power", system: { type: "wod.types.arcanoi", value: 3 } }]);
      await game.user.updateTokenTargets?.([]);
      const n = game.messages.size;
      answer(root => { set(root, "art", "argos-phantom-wings"); set(root, "onSelf", true); set(root, "diff", 4); set(root, "bonus", 10); set(root, "pathos", 1); set(root, "corpus", 0); set(root, "wp", 0); });
      A().useArcanos({ actor: w });
      const m = await untilMsg(n);
      const items = fx(m);
      ok("1 Wraith Arcanos keywords", !!m && /What it does/.test(m.content) && items.some(i => i.key === "rise"), { card: text(m).slice(0, 300), items: items.map(i => `${i.key}:${i.route}`) });
    });
    await step("2 Demon evocation card and running limit", async () => {
      const lore = (nm, v) => ({ name: nm, type: "Power", system: { game: "demon", type: "wod.types.lore", value: v } });
      const dv = await mk("Defiler", "Demon", { house: "wod.bio.demon.defiler" }, [lore("Lore of Storms", 2)]);
      await dv.update({ "system.advantages.faith.permanent": 1, "system.advantages.faith.temporary": 9, "system.advantages.torment.permanent": 3,
        "system.attributes.stamina.value": 3, "system.attributes.stamina.total": 3, "system.abilities.medicine.value": 2 });
      await game.user.updateTokenTargets?.([]);
      let n = game.messages.size;
      answer(root => { set(root, "evo", "storms:2"); set(root, "fs", 3); });
      A().demonEvoke({ actor: dv });
      const m = await untilMsg(n);
      const items = fx(m);
      const run1 = (dv.getFlag("wodx-actions", "demon")?.running ?? []).length;
      // Faith 1: a second lasting evocation is refused unless the first is ended
      n = game.messages.size;
      answer(root => { set(root, "evo", "storms:2"); set(root, "fs", 1); set(root, "endOld", false); });
      A().demonEvoke({ actor: dv });
      await sleep(2500);
      const refused = !(await untilMsg(n, 500));
      ok("2 Demon evocation card and running limit", !!m && /What it does/.test(m.content) && /High Torment/.test(m.content) && items.some(i => i.key === "shape") && run1 === 1 && refused,
        { card: text(m).slice(0, 300), items: items.map(i => `${i.key}:${i.route}`), run1, refused });
    });
    await step("3 Demon apocalyptic form on the sheet", async () => {
      const lore = (nm, v) => ({ name: nm, type: "Power", system: { game: "demon", type: "wod.types.lore", value: v } });
      const dv = await mk("Malefactor", "Demon", { house: "wod.bio.demon.malefactor" }, [lore("Lore of Earth", 1)]);
      await dv.update({ "system.advantages.faith.permanent": 3, "system.advantages.faith.temporary": 5, "system.advantages.torment.permanent": 3 });
      await sleep(500);
      const s0 = Number(dv.system.attributes.strength.bonus) || 0;
      const n = game.messages.size;
      answer(root => { set(root, "spend", true); });
      A().demonForm({ actor: dv });
      const m = await untilMsg(n);
      await sleep(1000);
      const s1 = Number(dv.system.attributes.strength.bonus) || 0, lethal = !!dv.system.settings?.soak?.lethal?.isrollable;
      await game.modules.get("wodx-chronicle")?.api?.timed?.endFor?.(dv, { kind: "scene", why: "gate" });
      await sleep(1000);
      const s2 = Number(dv.system.attributes.strength.bonus) || 0;
      ok("3 Demon apocalyptic form on the sheet", !!m && /Increased Size:/.test(text(m)) && s1 === s0 + 2 && lethal && s2 === s0, { card: text(m).slice(0, 300), s0, s1, s2, lethal });
    });
    await step("4 C20 named cantrip", async () => {
      const pw = (nm, v) => ({ name: nm, type: "Power", system: { type: "wod.types.art", value: v } });
      const cg = await mk("Pooka", "Changeling", {}, [pw("Wayfare", 2)]);
      await sleep(800);
      const fae = cg.items.find(i => i.system?.type === "wod.types.realms" && String(i.system?.label ?? "").endsWith(".fae"));
      if (fae) await fae.update({ "system.value": 3 }); else await cg.createEmbeddedDocuments("Item", [{ name: "fae", type: "Trait", system: { type: "wod.types.realms", label: "wod.realms.fae", value: 3, max: 5 } }]);
      await cg.update({ "system.advantages.glamour.permanent": 5, "system.advantages.glamour.temporary": 5, "system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5 });
      await game.user.updateTokenTargets?.([]);
      const n = game.messages.size;
      let listed = [];
      answer(root => { listed = [...root.querySelectorAll("select[name=power] option")].map(o => o.value); set(root, "power", "quicksilver"); set(root, "art", "wayfare"); set(root, "lvl", 2); set(root, "r-fae", 1); set(root, "wyrd", true); set(root, "bunk", 5); set(root, "wp", true); });
      A().c20Cantrip({ actor: cg });
      const m = await untilMsg(n);
      const items = fx(m);
      ok("4 C20 named cantrip", !!m && /Quicksilver/.test(text(m)) && /extra action/.test(text(m)) && items.some(i => i.key === "hasten") && listed.includes("hopscotch") && !listed.includes("portal-passage"),
        { card: text(m).slice(0, 300), items: items.map(i => `${i.key}:${i.route}`), listed });
    });
    await step("5 Mummy named Hekau", async () => {
      const pw = (nm, v) => ({ name: nm, type: "Power", system: { type: "wod.types.hekau", value: v } });
      const mu = await mk("Scribe", "Mummy", {}, [pw("Nomenclature", 2)]);
      await sleep(800);
      await mu.update({ "system.advantages.sekhem.permanent": 5, "system.advantages.sekhem.temporary": 5, "system.advantages.balance.permanent": 5, "system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5 });
      await game.user.updateTokenTargets?.([]);
      const n = game.messages.size;
      let listed = [], filled = {};
      answer(root => {
        listed = [...root.querySelectorAll("select[name=named] option")].map(o => o.value);
        set(root, "named", "mend-flesh");
        filled = { path: root.querySelector("[name=path]")?.value, lvl: root.querySelector("[name=lvl]")?.value, d: root.querySelector("[name=d]")?.value, c: root.querySelector("[name=c]")?.value };
        set(root, "wp", true);
      });
      A().mummyCast({ actor: mu });
      const m = await untilMsg(n);
      const items = fx(m);
      ok("5 Mummy named Hekau", !!m && /Mend Flesh/.test(text(m)) && /living in sight/.test(text(m)) && items.some(i => i.key === "mend") && filled.path === "nomenclature" && String(filled.lvl) === "2" && String(filled.d) === "5" && listed.includes("asking-the-trees") && !listed.includes("become-animal"),
        { card: text(m).slice(0, 300), items: items.map(i => `${i.key}:${i.route}`), filled, listed: listed.length });
    });
  } finally {
    for (const [h, id] of hooks) Hooks.off(h, id);
    for (const a of made) await a.delete().catch(() => {});
    await folder.delete().catch(() => {});
    R.finished = new Date().toISOString();
    R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
    const file = new File([JSON.stringify(R, null, 1)], "gatepowers-result.json", { type: "application/json" });
    await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
  }
  return R.summary;
}
