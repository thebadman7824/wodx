/**
 * Sheets gate 3 (WoDX Sheets 0.3: the Core page and the system's own tabs agree, B75), in Foundry as a Gamemaster:
 *   await (await import(`/wodx-gate/gatesheet3.mjs?${Date.now()}`)).run()
 * Uses the sheets test pack and the 6g changeling. Edits on the Bio tab must show on the Core page and the other way
 * round; the lock works as on the system's sheets. Puts every value back. Result: Data/wodx-gate/gatesheet3-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = { started: new Date().toISOString(), steps: [], errors: [] };
const ok = (name, pass, detail = {}) => R.steps.push({ name, pass: !!pass, ...detail });
async function step(name, fn) { try { await fn(); } catch (e) { ok(name, false, { error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ") }); } }
const until = async (test, ms = 6000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await test()) return true; await sleep(100); } return false; };
const fire = (el, v) => { el.value = v; el.dispatchEvent(new Event("change", { bubbles: true })); };

async function open(actor, unlocked = true) {
  const sheet = actor.sheet;
  sheet.locked = !unlocked;
  await sheet.render(true);
  await until(() => sheet.rendered && sheet.element?.[0]?.querySelector(".wodx-book"));
  return sheet;
}
const el = sheet => sheet.element[0];

export async function run() {
  const kin = game.actors.find(a => a.name === "Sheet test: a Tzimisce of the Carpathians");
  const garou = game.actors.find(a => a.name === "Sheet test: a Get of Fenris");
  const wren = game.actors.find(a => a.name === "Wren (6g, changeling of Spring)");
  const mage = game.actors.find(a => a.name === "Sheet test: a Hermetic of Rothenstein");
  const keep = { clan: kin.system.clan, concept: kin.system.concept, gen: kin.system.generation, tribe: garou.system.tribe, fae: foundry.utils.deepClone(wren.getFlag("wodx-actions", "daFae")), cabal: mage.getFlag("wodx-actions", "daMage")?.cabal ?? "" };

  await step("the Core header's Clan is the Bio tab's own list, with the same choice", async () => {
    const s = await open(kin);
    const core = el(s).querySelector(".tab.core select.wodx-mirror-ctl[data-set='system.clan']");
    const bio = el(s).querySelector(".tab.bio select[name='system.clan']");
    const same = core && bio && core.options.length === bio.options.length && core.value === bio.value && [...core.options].every((o, k) => o.value === bio.options[k].value);
    ok("the Core header's Clan is the Bio tab's own list, with the same choice", same, { core: core?.options.length, bio: bio?.options.length, value: core?.value });
  });
  await step("Core to Bio: a Clan chosen on the Core page is the Clan on the Bio tab", async () => {
    let s = kin.sheet;
    const core = el(s).querySelector(".tab.core select.wodx-mirror-ctl[data-set='system.clan']");
    const pick = [...core.options].map(o => o.value).find(v => v && v !== kin.system.clan && v !== "custom");
    fire(core, pick);
    const done = await until(() => kin.system.clan === pick);
    await until(() => el(kin.sheet).querySelector(".tab.bio select[name='system.clan']")?.value === pick);
    ok("Core to Bio: a Clan chosen on the Core page is the Clan on the Bio tab", done && el(kin.sheet).querySelector(".tab.bio select[name='system.clan']").value === pick, { pick });
  });
  await step("Bio to Core: a Concept typed on the Bio tab shows on the Core page", async () => {
    const bio = el(kin.sheet).querySelector(".tab.bio input[name='system.concept']");
    fire(bio, "Gate sheets 3: a voivode's envoy");
    const done = await until(() => kin.system.concept === "Gate sheets 3: a voivode's envoy");
    await until(() => el(kin.sheet).querySelector(".tab.core .wodx-mirror-ctl[data-set='system.concept']")?.value === kin.system.concept);
    ok("Bio to Core: a Concept typed on the Bio tab shows on the Core page", done && el(kin.sheet).querySelector(".tab.core .wodx-mirror-ctl[data-set='system.concept']").value === kin.system.concept, {});
  });
  await step("Bio to Core: the Generation chosen on the Bio tab is the one on the Core page", async () => {
    const bio = el(kin.sheet).querySelector(".tab.bio select[name='system.generation']");
    const pick = [...bio.options].map(o => o.value).find(v => v && String(v) !== String(kin.system.generation));
    fire(bio, pick);
    const done = await until(() => String(kin.system.generation) === String(pick));
    await until(() => el(kin.sheet).querySelector(".tab.core .wodx-mirror-ctl[data-set='system.generation']")?.value === String(pick));
    ok("Bio to Core: the Generation chosen on the Bio tab is the one on the Core page", done && el(kin.sheet).querySelector(".tab.core .wodx-mirror-ctl[data-set='system.generation']").value === String(pick), { pick });
  });
  await step("the Virtues are the system's own (same markup and data as its Core tab)", async () => {
    const v = el(kin.sheet).querySelector(".tab.core .resource-value[data-name='advantages.virtues.conscience.permanent']");
    ok("the Virtues are the system's own (same markup and data as its Core tab)", !!v && Number(v.dataset.value) === Number(kin.system.advantages.virtues.conscience.permanent), {});
    await kin.sheet.close();
  });
  await step("Werewolf: a Tribe chosen on the Bio tab is the Tribe on the Core page", async () => {
    const s = await open(garou);
    const bio = el(s).querySelector(".tab.bio select[name='system.tribe']");
    const pick = [...bio.options].map(o => o.value).find(v => v && v !== garou.system.tribe && v !== "custom");
    fire(bio, pick);
    const done = await until(() => garou.system.tribe === pick);
    await until(() => el(garou.sheet).querySelector(".tab.core .wodx-mirror-ctl[data-set='system.tribe']")?.value === pick);
    ok("Werewolf: a Tribe chosen on the Bio tab is the Tribe on the Core page", done && el(garou.sheet).querySelector(".tab.core .wodx-mirror-ctl[data-set='system.tribe']").value === pick, { pick });
    await garou.sheet.close();
  });
  await step("Fae: the Dark Ages Court is on the Bio tab too; changed there, it changes on the Core page", async () => {
    const s = await open(wren);
    const bio = el(s).querySelector(".tab.bio .wodx-bio-extra select[data-set='flag:wodx-actions.daFae.court']");
    const target = wren.getFlag("wodx-actions", "daFae")?.court === "winter" ? "autumn" : "winter";
    fire(bio, target);
    const done = await until(() => wren.getFlag("wodx-actions", "daFae")?.court === target);
    await until(() => el(wren.sheet).querySelector(".tab.core select[data-set='flag:wodx-actions.daFae.court']")?.value === target);
    ok("Fae: the Dark Ages Court is on the Bio tab too; changed there, it changes on the Core page", !!bio && done && el(wren.sheet).querySelector(".tab.core select[data-set='flag:wodx-actions.daFae.court']").value === target, { target });
  });
  await step("Mage: the Cabal typed on the Core page shows in the Bio tab's Dark Ages box", async () => {
    await wren.sheet.close();
    const s = await open(mage);
    fire(el(s).querySelector(".tab.core input[data-set='flag:wodx-actions.daMage.cabal']"), "Gate sheets 3: the Ninefold Key");
    const done = await until(() => mage.getFlag("wodx-actions", "daMage")?.cabal === "Gate sheets 3: the Ninefold Key");
    await until(() => el(mage.sheet).querySelector(".tab.bio .wodx-bio-extra input[data-set='flag:wodx-actions.daMage.cabal']")?.value === "Gate sheets 3: the Ninefold Key");
    ok("Mage: the Cabal typed on the Core page shows in the Bio tab's Dark Ages box", done && el(mage.sheet).querySelector(".tab.bio .wodx-bio-extra input[data-set='flag:wodx-actions.daMage.cabal']").value === "Gate sheets 3: the Ninefold Key", {});
    await mage.sheet.close();
  });
  await step("locked, as on the system's sheets: the header shows text, permanent dots do not move, points still do", async () => {
    const s = await open(wren, false);
    const e = el(s);
    const textOnly = !e.querySelector(".tab.core .wodx-head select, .tab.core .wodx-head input");
    const before = wren.getFlag("wodx-actions", "daFae")?.dominions?.night ?? 0;
    e.querySelector(".wodx-dots[data-set='flag:wodx-actions.daFae.dominions.night'] .wodx-dot[data-i='4']")?.click();
    await sleep(800);
    const kept = (wren.getFlag("wodx-actions", "daFae")?.dominions?.night ?? 0) === before;
    const t0 = wren.getFlag("wodx-actions", "daFae")?.mists?.temp ?? 0;
    const box = e.querySelector(".wodx-track[data-temp='flag:wodx-actions.daFae.mists.temp'] .wodx-box[data-i='1']");
    box?.click();
    const moved = await until(() => (wren.getFlag("wodx-actions", "daFae")?.mists?.temp ?? 0) !== t0, 3000);
    ok("locked, as on the system's sheets: the header shows text, permanent dots do not move, points still do", textOnly && kept && moved, { textOnly, kept, moved });
    await wren.sheet.close();
  });

  // Put everything back
  await kin.update({ "system.clan": keep.clan, "system.concept": keep.concept, "system.generation": keep.gen });
  await garou.update({ "system.tribe": keep.tribe });
  await wren.setFlag("wodx-actions", "daFae", keep.fae);
  await mage.setFlag("wodx-actions", "daMage", { ...(mage.getFlag("wodx-actions", "daMage") ?? {}), cabal: keep.cabal });
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatesheet3-result.json", { type: "application/json" });
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
  return R.summary;
}
