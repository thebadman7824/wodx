/**
 * Character wizard gate (WoDX Creation 0.24.0), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatewizard.mjs?${Date.now()}`)).run()
 * Makes its own characters and removes them, with any chat cards it made. The clock is not moved.
 *   1. the api and version
 *   2. every page of the wizard renders for a Vampire
 *   3. the Attributes page stops at the priority's allotment; the freebie page charges 5 for the next dot
 *   4. a Discipline, a Background and a Merit go on the sheet and into the count
 *   5. Willpower bought with freebies goes in the ledger and comes back off
 *   6. every page renders for a Werewolf, a Mage, a Wraith, a Changeling, a Hunter, a Demon, a Mummy and a ghoul
 *   7. the hub's Build step opens the wizard; the check after the prelude waits for the prelude
 *   8. the prelude's Willpower gain raises the sheet's Willpower and is not charged to the build
 *   9. every other WoDX module still answers
 * Result: Data/wodx-gate/gatewizard-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const atLeast = (v, min) => { const a = String(v ?? "").split(/[.-]/).map(Number), b = min.split(".").map(Number); for (let i = 0; i < b.length; i++) { if ((a[i] || 0) !== b[i]) return (a[i] || 0) > b[i]; } return true; };
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const M = "wodx-creation", api = () => game.modules.get(M)?.api;
  const time0 = game.time.worldTime;
  const msgs0 = new Set(game.messages.map(m => m.id)), actors0 = new Set(game.actors.map(a => a.id));
  const closeAll = async () => { for ( const app of [...(foundry.applications.instances?.values?.() ?? [])] ) if ( /wodx-wizard|wodx-fn|wodx-first-night/.test(app.id) ) await app.close(); };
  const act = (app, name, el) => app.options.actions[name].call(app, {}, el);
  const pagesRender = async (actor) => {
    const app = await api().wizard(actor); await sleep(300);
    const bad = [];
    for ( const p of api().wizardRules.pagesFor(api().wizardLedger(actor).line) ) {
      await act(app, "go", {dataset: {page: p.key}}); await sleep(150);
      if ( !app.element?.querySelector(".wodx-wz-nav") || /undefined|NaN|\[object/.test(app.element.textContent) ) bad.push(p.key);
    }
    await app.close();
    return bad;
  };
  try {
    const own = {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER};
    const vamp = await Actor.create({name: "WoDX gate: Wizard Brujah", type: "Vampire", system: {clan: "brujah", generation: 12}, ownership: own});

    await step("1 api", async () => ok("1 api", atLeast(game.modules.get(M).version, "0.24.0") && typeof api()?.wizard === "function" && typeof api()?.wizardLedger === "function" && !!api()?.wizardRules,
      {creation: game.modules.get(M).version}));

    await step("2 vampire pages", async () => { const bad = await pagesRender(vamp); ok("2 vampire pages", !bad.length, {bad, line: api().wizardLedger(vamp).line}); });

    await step("3 allotment and freebie cost", async () => {
      const app = await api().wizard(vamp, "attributes"); await sleep(300);
      const plusFor = path => [...app.element.querySelectorAll("button[data-action=step][data-d='1']")].find(b => b.dataset.path === path);
      // Spend Physical to the end: the primary allotment is 7
      const order = api().wizardLedger(vamp).check.rows.filter(r => r.step === "attributes");
      let spent = 0;
      for ( const path of ["system.attributes.strength.value", "system.attributes.dexterity.value", "system.attributes.stamina.value"] ) {
        for ( let i = 0; i < 4; i++ ) { const b = plusFor(path); if ( !b || b.disabled ) break; await act(app, "step", b); spent++; await sleep(80); }
      }
      const L = api().wizardLedger(game.actors.get(vamp.id));
      const physRow = L.check.rows.find(r => r.group === "physical");
      await act(app, "go", {dataset: {page: "freebies"}}); await sleep(200);
      // Strength is at 5 by now; the next Physical dot that can still go up costs 5
      const phys = ["system.attributes.strength.value", "system.attributes.dexterity.value", "system.attributes.stamina.value"];
      const more = [...app.element.querySelectorAll("button[data-action=step][data-d='1']")].find(b => phys.includes(b.dataset.path) && !b.disabled);
      const price = more?.parentElement?.textContent ?? "";
      await app.close();
      ok("3 allotment and freebie cost", spent === physRow.allowed && physRow.over === 0 && /\+5/.test(price), {spent, allowed: physRow.allowed, price: price.trim(), rowsBefore: order.length});
    });

    await step("4 discipline, background, merit", async () => {
      const app = await api().wizard(vamp, "powers"); await sleep(300);
      let box = app.element.querySelector(".wodx-wz-add[data-key=discipline]");
      const offered = [...box.querySelectorAll("select option")].map(o => o.value).filter(Boolean);
      box.querySelector("input[name=name-discipline]").value = "Potence";
      await act(app, "addItem", box.querySelector("button[data-action=addItem]")); await sleep(300);
      await act(app, "go", {dataset: {page: "backgrounds"}}); await sleep(200);
      box = app.element.querySelector(".wodx-wz-add");
      box.querySelector("input[name=name-bg]").value = "Resources";
      await act(app, "addFeature", box.querySelector("button[data-action=addFeature]")); await sleep(300);
      await act(app, "go", {dataset: {page: "meritsFlaws"}}); await sleep(200);
      box = app.element.querySelector(".wodx-wz-add");
      const sel = box.querySelector("select[name=pick-mf]");
      sel.value = [...sel.options].find(o => o.value === "eat-food") ? "eat-food" : [...sel.options].find(o => o.value)?.value;
      await act(app, "addFeature", box.querySelector("button[data-action=addFeature]")); await sleep(300);
      await app.close();
      const a = game.actors.get(vamp.id), L = api().wizardLedger(a);
      const disc = a.items.find(i => i.name === "Potence" && i.system?.type === "wod.types.discipline");
      const bg = a.items.find(i => i.name === "Resources" && i.system?.type === "wod.types.background");
      ok("4 discipline, background, merit", !!disc && !!bg && L.merits > 0 && L.check.rows.find(r => r.group === "discipline")?.have === 1 && offered.includes("Celerity"),
        {offered, merits: L.merits, disc: !!disc, bg: !!bg});
    });

    await step("5 willpower from freebies", async () => {
      const app = await api().wizard(vamp, "freebies"); await sleep(300);
      const a = () => game.actors.get(vamp.id), wp0 = Number(a().system.advantages.willpower.permanent) || 0;
      await act(app, "extra", {dataset: {key: "willpower", d: "1"}}); await sleep(300);
      const up = Number(a().system.advantages.willpower.permanent), bought = api().wizardLedger(a()).extras.find(e => e.key === "willpower")?.bought;
      await act(app, "extra", {dataset: {key: "willpower", d: "-1"}}); await sleep(300);
      const back = Number(a().system.advantages.willpower.permanent);
      await app.close();
      ok("5 willpower from freebies", up === wp0 + 1 && bought === 1 && back === wp0, {wp0, up, bought, back});
    });

    await step("6 other lines", async () => {
      const kinds = [["Werewolf", {}], ["Mage", {}], ["Wraith", {}], ["Changeling", {}], ["Hunter", {}], ["Demon", {}], ["Mummy", {}], ["Mortal", {settings: {variant: "ghoul"}}]];
      const out = {};
      for ( const [type, system] of kinds ) {
        try {
          const a = await Actor.create({name: `WoDX gate: Wizard ${type}`, type, system, ownership: own});
          out[type] = {line: api().wizardLedger(a)?.line ?? null, bad: await pagesRender(a)};
        } catch (e) { out[type] = {error: e.message}; }
      }
      ok("6 other lines", Object.values(out).every(o => o.line && !o.bad?.length && !o.error), {out});
    });

    await step("7 hub", async () => {
      const app = await api().firstNight(vamp); await sleep(500);
      const text = app?.element?.textContent ?? "";
      const btn = [...(app?.element?.querySelectorAll("button") ?? [])].find(b => /Wizard/.test(b.textContent));
      const rules = api().firstNightRules;
      await app?.close?.();
      ok("7 hub", /Check after the prelude/.test(text) && !!btn && rules.STEP_KEYS.indexOf("recheck") === rules.STEP_KEYS.indexOf("prelude") + 1, {wizardButton: !!btn});
    });

    await step("8 prelude willpower", async () => {
      const P = await import("/modules/wodx-creation/scripts/first-night-prelude.mjs");
      const a = () => game.actors.get(vamp.id);
      const wp0 = Number(a().system.advantages.willpower.permanent) || 0, left0 = api().wizardLedger(a()).left;
      const app = await P.PreludeRunApp.openFor(a()); await sleep(400);
      const btn = app?.element?.querySelector("[data-action=reward][data-kind=willpower]");
      if ( btn ) { await app.options.actions.reward.call(app, {}, btn); await sleep(400); }
      const wp1 = Number(a().system.advantages.willpower.permanent), left1 = api().wizardLedger(a()).left;
      await app?.close?.();
      ok("8 prelude willpower", !!btn && wp1 === wp0 + 1 && left1 === left0, {wp0, wp1, left0, left1, button: !!btn});
    });

    await step("9 other modules", async () => {
      const bad = game.modules.filter(m => m.id.startsWith("wodx-") && m.active && !m.api && !["wodx-paperdoll"].includes(m.id)).map(m => m.id);
      ok("9 other modules", bad.length === 0, {noApi: bad});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    await closeAll().catch(() => null);
    const newMsgs = game.messages.filter(m => !msgs0.has(m.id)).map(m => m.id);
    if ( newMsgs.length ) await ChatMessage.deleteDocuments(newMsgs).catch(e => R.errors.push(`messages: ${e.message}`));
    const newA = game.actors.filter(a => !actors0.has(a.id)).map(a => a.id);
    if ( newA.length ) await Actor.deleteDocuments(newA).catch(e => R.errors.push(`actors: ${e.message}`));
    if ( game.time.worldTime !== time0 ) await game.time.advance(time0 - game.time.worldTime);
    R.cleaned = {messages: newMsgs.length, actors: newA.length};
  }
  return save(R, "gatewizard-result.json");
}
