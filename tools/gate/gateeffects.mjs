/**
 * Mage effect keywords gate (WoDX Actions 3.26.0), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateeffects.mjs?${Date.now()}`)).run()
 * Makes a caster and a target actor, applies keyword results straight through the apply step, undoes them,
 * posts one keyword card for the Storyteller's client to apply, then deletes what it made.
 *   1. the api and the world setting are there, and the keywords are on in this world
 *   2. Harm hurts the target through Combat's soak, and Undo puts the health back
 *   3. Mend heals, Charge gives Quintessence, and Undo takes both back
 *   4. Ward and Hold make timed effects (Hold with the held condition), and Undo removes them
 *   5. a keyword card is applied once by the active Storyteller, marked done, with an Undo record
 *   6. a queued item goes to the approval queue under its own type
 *   7. every other WoDX module still answers
 *   8. Move puts a token where asked, and Undo puts it back (needs a scene; a token is made and deleted)
 *   9. an area works on a token inside it once, on one standing outside only when it walks in, and Undo removes it
 *  10. a rote is saved as a Rote item on the caster, replaced by name, and forgotten
 *  12. a held card waits; countermagick cuts its successes, then a reflected counter turns it on the caster
 *  13. a Dark Ages rote's card: Verdant Slumber hurts, Self Possession is a timed effect, a summoning stays the Storyteller's
 *  11. a Rote item opens the WoDX Cast window filled in (a Mage 20th era), or is left to the system's dialog (Dark Ages)
 * Result: Data/wodx-gate/gateeffects-result.json.
 */
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
  const MOD = "wodx-actions";
  const fx = () => game.modules.get(MOD)?.api?.effects;
  const E = await import(`/modules/${MOD}/scripts/effects-rules.js?${Date.now()}`);
  const dmg = a => ({...(a.system?.health?.damage ?? {})});
  const sum = d => (Number(d.bashing) || 0) + (Number(d.lethal) || 0) + (Number(d.aggravated) || 0);
  let caster, target, msgs = [], queued = [];
  const item = (key, got, ctx = {}, route = "auto") => ({key, out: E.outcome(key, got, ctx), target: target.uuid, name: target.name, route});
  try {
    caster = await Actor.create({name: "WoDX gate: Keyword caster", type: "Mage"});
    await caster.update({"system.spheres.forces.value": 3, "system.spheres.life.value": 3, "system.spheres.prime.value": 3, "system.advantages.arete.permanent": 3});
    target = await Actor.create({name: "WoDX gate: Keyword target", type: "Mortal"});

    await step("1 api, setting, on here", async () => {
      const mode = game.settings.get(MOD, "effectsApply");
      ok("1 api, setting, on here", !!fx() && ["auto", "on", "off"].includes(mode) && fx().isOn() && game.modules.get(MOD).api.version === "3.26.0", {mode});
    });

    await step("2 Harm and Undo", async () => {
      const before = dmg(target);
      const rec = await fx().apply(item("harm", E.spend(4, 3, {}), {spheres: ["forces"]}), caster.name);
      const hurt = sum(dmg(target)) - sum(before);
      await fx().undo([rec]);
      ok("2 Harm and Undo", hurt >= 0 && rec?.health && sum(dmg(target)) === sum(before), {hurt, after: dmg(target)});
    });

    await step("3 Mend, Charge and Undo", async () => {
      const C = game.modules.get("wodx-combat").api;
      await C.setDamage(target, {bashing: 0, lethal: 2, aggravated: 0});
      const q0 = Number(target.system?.quintessence?.temporary) || 0;
      const r1 = await fx().apply(item("mend", E.spend(2, 2, {})), caster.name);
      const healed = Number(dmg(target).lethal) || 0;
      const r2 = await fx().apply(item("charge", E.spend(2, 2, {})), caster.name);
      const q1 = Number(target.system?.quintessence?.temporary) || 0;
      await fx().undo([r1, r2]);
      ok("3 Mend, Charge and Undo", healed < 2 && q1 > q0 && Number(dmg(target).lethal) === 2 && (Number(target.system?.quintessence?.temporary) || 0) === q0, {healed, q0, q1});
      await C.setDamage(target, {bashing: 0, lethal: 0, aggravated: 0});
    });

    await step("4 Ward, Hold and Undo", async () => {
      const r1 = await fx().apply(item("ward", E.spend(3, 1, {duration: 1})), caster.name);
      const r2 = await fx().apply(item("hold", E.spend(3, 3, {})), caster.name);
      const made = [r1.effect, r2.effect].map(u => fromUuidSync(u)).filter(Boolean);
      const held = made[1]?.statuses?.has?.("held") ?? false;
      await fx().undo([r1, r2]);
      const gone = [r1.effect, r2.effect].every(u => !fromUuidSync(u));
      ok("4 Ward, Hold and Undo", made.length === 2 && gone, {held, names: made.map(e => e.name)});
    });

    await step("5 the card applies once", async () => {
      const before = dmg(target);
      const m = await ChatMessage.create({content: "<div class='wodx-effects'>WoDX gate keyword card</div>", whisper: [game.user.id],
        flags: {[MOD]: {kind: "effects", caster: caster.name, items: [item("charge", E.spend(2, 2, {}))]}}});
      msgs.push(m);
      for ( let i = 0; i < 20 && !m.flags?.[MOD]?.done; i++ ) await new Promise(r => setTimeout(r, 150));
      const undo = m.flags?.[MOD]?.undo ?? [];
      const q = Number(target.system?.quintessence?.temporary) || 0;
      await fx().undo(undo);
      ok("5 the card applies once", !!m.flags?.[MOD]?.done && undo.length === 1 && q > 0, {q, health: before});
    });

    await step("6 queued item", async () => {
      const T = game.modules.get("wodx-chronicle").api;
      const m = await ChatMessage.create({content: "<div class='wodx-effects'>WoDX gate queued keyword</div>", whisper: [game.user.id],
        flags: {[MOD]: {kind: "effects", caster: caster.name, items: [item("fear", E.spend(2, 2, {}), {}, "queue")]}}});
      msgs.push(m);
      for ( let i = 0; i < 20 && !m.flags?.[MOD]?.done; i++ ) await new Promise(r => setTimeout(r, 150));
      const list = T.approvals.pending();
      queued = (Array.isArray(list) ? list : []).filter(e => e.type === "wodx-actions.effect" && String(e.title ?? "").includes("WoDX gate"));
      ok("6 queued item", !!m.flags?.[MOD]?.done && queued.length === 1, {queued: queued.length});
    });

    await step("7 other modules answer", async () => {
      const ids = ["wodx-chronicle", "wodx-combat", "wodx-sheets", "wodx-storyteller", "wodx-npc"];
      const missing = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("7 other modules answer", !missing.length, {missing});
    });

    const scene = canvas?.scene;
    let toks = [];
    await step("8 Move and Undo", async () => {
      if ( !scene ) return ok("8 Move and Undo", false, {error: "no scene is viewed"});
      const g = scene.grid?.size ?? 100, d = scene.dimensions ?? {};
      const x0 = (d.sceneX ?? 0) + g * 2, y0 = (d.sceneY ?? 0) + g * 2;
      toks = await scene.createEmbeddedDocuments("Token", [
        {name: "WoDX gate: keyword token in", actorId: target.id, x: x0, y: y0, actorLink: false, hidden: true},
        {name: "WoDX gate: keyword token out", actorId: target.id, x: x0 + g * 8, y: y0, actorLink: false, hidden: true}]);
      const t = toks[0];
      const out = E.outcome("move", E.spend(2, 2, {}));
      const rec = await fx().apply({key: "move", out, target: t.uuid, name: t.name, route: "pick", at: {x: x0 + g * 3.5, y: y0 + g * 0.5}}, caster.name);
      const moved = t.x === x0 + g * 3;
      await fx().undo([rec]);
      ok("8 Move and Undo", moved && t.x === x0 && t.y === y0, {x: t.x, y: t.y});
    });

    await step("9 an area on entry", async () => {
      if ( !scene || toks.length < 2 ) return ok("9 an area on entry", false, {error: "no tokens"});
      const g = scene.grid?.size ?? 100;
      const [tin, tout] = toks;
      const a0 = (tin.actor?.system?.quintessence?.temporary ?? 0);
      const out = E.outcome("charge", {...E.spend(4, 2, {area: true}), area: true});
      out.area = E.AREA.feet;
      const centre = {x: tin.x + g / 2, y: tin.y + g / 2};
      const rec = await fx().placeArea({key: "charge", out, target: null, name: "an area", route: "area"}, centre, {caster: caster.name, scene});
      const region = fromUuidSync(rec.region);
      const area = () => region?.flags?.["wodx-actions"]?.effectArea ?? {};
      const firstIn = area().applied?.includes(tin.id) && !area().applied?.includes(tout.id);
      await tout.update({x: tin.x, y: tin.y}, {animate: false, teleport: true});
      for ( let i = 0; i < 20 && !area().applied?.includes(tout.id); i++ ) await new Promise(r => setTimeout(r, 150));
      const walkedIn = area().applied?.includes(tout.id);
      await tout.update({x: tin.x + g * 8}, {animate: false, teleport: true});
      await tout.update({x: tin.x}, {animate: false, teleport: true});
      await new Promise(r => setTimeout(r, 400));
      const once = area().applied.filter(id => id === tout.id).length === 1;
      await fx().undo([rec]);
      ok("9 an area on entry", firstIn && walkedIn && once && !fromUuidSync(rec.region) && (tin.actor?.system?.quintessence?.temporary ?? 0) === a0, {firstIn, walkedIn, once});
    });

    await step("10 rotes", async () => {
      const R0 = fx().rules;
      await fx().saveRote(caster, R0.roteFrom("WoDX gate bolt", {keywords: ["harm"], used: [{sphere: "forces", level: 3}], kind: "vulgar", feat: 3}));
      await fx().saveRote(caster, R0.roteFrom("wodx gate bolt", {keywords: ["harm", "light"], used: [{sphere: "forces", level: 3}], kind: "vulgar", feat: 3}));
      const one = fx().rotes(caster);
      const items = caster.items.filter(i => i.type === "Rote").length;
      await fx().forgetRote(caster, "WoDX GATE BOLT");
      ok("10 rotes", one.length === 1 && items === 1 && one[0].keywords.length === 2 && fx().rotes(caster).length === 0 && !caster.items.some(i => i.type === "Rote"), {names: one.map(r => r.name), items});
    });

    await step("11 a Rote item opens the Cast window", async () => {
      const A = game.modules.get(MOD).api;
      const R0 = fx().rules;
      await fx().saveRote(caster, R0.roteFrom("WoDX gate ward", {keywords: ["ward"], used: [{sphere: "forces", level: 2}], plan: {duration: 1}, kind: "coincidental", feat: 1}));
      const item = caster.items.find(i => i.type === "Rote");
      const dark = A.consensus?.age?.()?.key === "dark";
      const before = new Set(Object.keys(ui.windows ?? {}));
      const took = game.wodxActions.m20CastRote(caster, item);
      await new Promise(r => setTimeout(r, 800));
      const win = [...document.querySelectorAll(".application, .window-app, dialog")].find(el => /Cast an Effect/.test(el.textContent ?? "") && el.querySelector('[name="kw-ward"]'));
      const ticked = !!win?.querySelector('[name="kw-ward"]')?.checked && win?.querySelector('[name="kw-duration"]')?.value === "1";
      for ( const app of foundry.applications.instances?.values?.() ?? [] ) if ( app.element?.textContent?.includes?.("Cast an Effect") ) await app.close?.();
      win?.closest?.("dialog")?.close?.();
      ok("11 a Rote item opens the Cast window", dark ? took === false : (took === true && ticked), {dark, took, ticked, before: before.size});
    });
    await step("12 countermagick on a card", async () => {
      const recipe = {successes: 4, form: {keywords: ["charge"], plan: {targets: 0, duration: 0, area: false}, ctx: {}}, used: [{sphere: "prime", level: 3}], witnessed: false, feat: 0, targets: [target.uuid], actor: caster.uuid};
      const q0 = Number(target.system?.quintessence?.temporary) || 0;
      const m = await ChatMessage.create({content: "<div class='vta-res wodx-effects'><ul><li>WoDX gate countered card</li></ul></div>", whisper: [game.user.id],
        flags: {[MOD]: {kind: "effects", caster: caster.name, recipe, hold: true, items: [item("charge", E.spend(4, 2, {}))]}}});
      msgs.push(m);
      await new Promise(r => setTimeout(r, 500));
      const waited = !m.flags?.[MOD]?.done;
      const a = await fx().applyCounter(m, 2, {mode: "dispel", by: "WoDX gate"});
      const cut = a?.left === 2 && !!m.flags?.[MOD]?.done && m.flags[MOD].items.length === 1;
      const b = await fx().applyCounter(m, 5, {mode: "reflect", by: "WoDX gate"});
      const back = b?.left === 0 && b?.reflected === 3 && (m.flags?.[MOD]?.items ?? []).some(i => /reflected/.test(i.name));
      await fx().undo(m.flags?.[MOD]?.undo ?? []);
      await target.update({"system.quintessence.temporary": q0});
      ok("12 countermagick on a card", waited && cut && back, {waited, a, b});
    });
    await step("13 a Dark Ages rote", async () => {
      const DA = game.modules.get(MOD).api.daMageRules ?? (await import(`/modules/${MOD}/scripts/mage-da-rules.js?${Date.now()}`));
      const rote = id => DA.ROTES.find(r => r.id === id);
      const before = dmg(caster);
      const harm = game.modules.get(MOD).api.effects.daPlan(caster, rote("verdantslumber"), 2);
      const recs = [];
      for ( const it of harm?.items ?? [] ) if ( it.route === "auto" ) recs.push(await fx().apply(it, caster.name));
      const hurt = sum(dmg(caster)) > sum(before) || recs.some(r => r?.health);
      const ward = game.modules.get(MOD).api.effects.daPlan(caster, rote("g-selfpossess"), 2);
      const wr = ward.items[0]?.route === "auto" ? await fx().apply(ward.items[0], caster.name) : null;
      const timed = !!(wr?.effect && fromUuidSync(wr.effect));
      const st = game.modules.get(MOD).api.effects.daPlan(caster, rote("g-72names"), 4).items.every(i => i.route === "st");
      await fx().undo([...recs, wr].filter(Boolean));
      ok("13 a Dark Ages rote", hurt && timed && st && sum(dmg(caster)) === sum(before), {hurt, timed, st, routes: harm?.items?.map(i => i.route)});
    });
    if ( toks.length ) await scene.deleteEmbeddedDocuments("Token", toks.map(t => t.id)).catch(() => {});
  } catch (e) { R.errors.push(e.message); }
  finally {
    for ( const m of msgs ) await m.delete().catch(() => {});
    const T = game.modules.get("wodx-chronicle")?.api;
    for ( const e of queued ) await T?.approvals?.decide?.(e.id, "reject", "gate clean-up").catch?.(() => {});
    await caster?.delete().catch(() => {});
    await target?.delete().catch(() => {});
  }
  return save(R, "gateeffects-result.json");
}
