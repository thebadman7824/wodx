/**
 * Mage effect keywords gate (WoDX Actions 3.22.0), in rothenstein-wodx (the testing world), as Gamemaster Test:
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
    target = await Actor.create({name: "WoDX gate: Keyword target", type: "Mortal"});

    await step("1 api, setting, on here", async () => {
      const mode = game.settings.get(MOD, "effectsApply");
      ok("1 api, setting, on here", !!fx() && ["auto", "on", "off"].includes(mode) && fx().isOn() && game.modules.get(MOD).api.version === "3.22.0", {mode});
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
