/**
 * Items made by Kindred, changelings, mummies, demons and inquisitors (WoDX Library wonders kits B3693-B3719, Storyteller
 * wonders.mjs, item powers wonder-use.mjs), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatewonders.mjs?${Date.now()}`)).run()
 * It makes its own actors, starts each work as the Storyteller (no approval wait), finishes it through the
 * wodxTaskDone hook the long tasks fire, and checks what was made. The clock never moves. Everything it made is removed
 * at the end, and the line settings are put back.
 *   1. the modules: the five kits registered, Storyteller start, item powers
 *   2. Kindred: Ward versus Ghouls marks the carried sword with a Storyteller ward button
 *   3. Kindred: Vitae Infusion with nothing picked makes a new object
 *   4. Changeling: gathering makes dreamstuff as a pool
 *   5. Changeling: a chimerical weapon is a Melee Weapon, chimerical, and uses up the dreamstuff
 *   6. Mummy: a Greater Talisman gives +2 Strength through the bonus list while worn, and none when taken off
 *   7. Mummy: an ushabti is made as a Creature companion with three health levels
 *   8. Mummy: a Sekhem Vessel takes the Sekhem poured in and its Draw button runs with a card and Undo
 *   9. Demon: an enchanted object holds the evocation; its demon Use button rolls Faith with a card
 *  10. Hunter: holy water for an inquisitor before 1500, or refused after
 *  11. one actor sees only its own line in the picker
 *  12. clean up
 * Result: Data/wodx-gate/gatewonders-result.json.
 */
const LIB = "wodx-library", ST = "wodx-storyteller";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STEPS = 12;

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${STEPS} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatewonders-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const W = game.modules.get(LIB)?.api?.wonders, WU = game.modules.get(LIB)?.api?.wonderUse, S = game.modules.get(ST)?.api?.wonders;
  const SETS = ["craftKindred", "craftChangeling", "craftMummy", "craftDemon", "craftHunter"];
  const keep = Object.fromEntries(SETS.map(k => { try { return [k, game.settings.get(LIB, k)]; } catch (e) { return [k, undefined]; } }));
  const msgsBefore = new Set(game.messages.map(m => m.id));
  const actorsBefore = new Set(game.actors.map(a => a.id));
  const made = [];
  const wonderOf = i => i?.flags?.[LIB]?.wonder ?? null;
  const mk = async (type, name, system = {}, items = []) => {
    const [a] = await Actor.createDocuments([{name: `WoDX gate: ${name}`, type}]);
    made.push(a);
    if ( Object.keys(system).length ) await a.update(Object.fromEntries(Object.entries(system).map(([k, v]) => [`system.${k}`, v])));
    if ( items.length ) await a.createEmbeddedDocuments("Item", items);
    return a;
  };
  const power = (name, type, value = 0) => ({name, type: "Power", system: {type, value}});
  /** Start as the Storyteller, then finish it the way a long task does. */
  const work = async (a, line, key, opts = {}, total = 3, status = "done") => {
    const t = await S.start(a, key, {...opts, line});
    if ( !t ) return {t: null, items: [...a.items]};
    const before = new Set(a.items.map(i => i.id));
    const raw = a.flags?.[ST]?.tasks?.[t.id] ?? t;
    Hooks.callAll("wodxTaskDone", {actor: a, task: {...raw, id: t.id, status, total}});
    for ( let i = 0; i < 20 && !a.flags?.[ST]?.tasks?.[t.id]?.made; i++ ) await sleep(250);
    return {t, items: a.items.filter(i => !before.has(i.id))};
  };
  try {
    for ( const k of SETS ) if ( keep[k] !== undefined ) await game.settings.set(LIB, k, true);
    const lines = (W?.lines?.() ?? []).map(k => k.line);
    ok("1. modules", ["kindred", "changeling", "mummy", "demon", "hunter"].every(l => lines.includes(l)) && typeof S?.start === "function" && typeof WU?.run === "function", {lines});

    // Kindred
    const v = await mk("Vampire", "Tremere", {"advantages.bloodpool.temporary": 10, "advantages.willpower.temporary": 5, "attributes.intelligence.value": 3, "abilities.occult.value": 3},
      [power("Thaumaturgy", "wod.types.discipline", 3), power("Ward versus Ghouls", "wod.types.ritual"), power("Principal Focus of Vitae Infusion", "wod.types.ritual"),
        {name: "Sword", type: "Melee Weapon", system: {}}]);
    const sword = v.items.find(i => i.name === "Sword");
    await work(v, "kindred", "ward-ghouls", {target: sword.id});
    const wf = wonderOf(v.items.get(sword.id));
    ok("2. Kindred ward marks the sword", wf?.key === "ward-ghouls" && (wf.powers ?? []).some(p => p.gm), {flag: wf ? {key: wf.key, powers: wf.powers?.map(p => p.id)} : null});
    const vi = await work(v, "kindred", "vitae-infusion", {});
    ok("3. Kindred vitae infusion makes an object", vi.items.some(i => wonderOf(i)?.key === "vitae-infusion"), {made: vi.items.map(i => i.name)});

    // Changeling
    const c = await mk("Changeling", "Nocker", {"advantages.glamour.temporary": 5, "advantages.glamour.permanent": 6, "attributes.dexterity.value": 3, "abilities.craft.value": 3, "abilities.gremayre.value": 2},
      [power("Primal", "wod.types.art", 2)]);
    const g = await work(c, "changeling", "dreamstuff", {}, 3);
    const stuff = g.items.find(i => wonderOf(i)?.key === "dreamstuff");
    ok("4. Changeling dreamstuff pool", wonderOf(stuff)?.pool?.value === 3, {pool: wonderOf(stuff)?.pool});
    const cw = await work(c, "changeling", "chimerical-weapon", {tools: "basic"}, 8);
    const blade = cw.items.find(i => i.type === "Melee Weapon");
    ok("5. Changeling chimerical weapon", !!blade && wonderOf(blade)?.chimerical === true && wonderOf(c.items.get(stuff?.id))?.pool?.value === 1,
      {made: cw.items.map(i => `${i.name} (${i.type})`), stuffLeft: wonderOf(c.items.get(stuff?.id))?.pool?.value});

    // Mummy
    const m = await mk("Mummy", "Kher-minu", {"advantages.balance.permanent": 3, "advantages.sekhem.temporary": 6, "advantages.sekhem.permanent": 7, "abilities.craft.value": 3},
      [power("Amulets", "wod.types.hekau", 4), power("Effigy", "wod.types.hekau", 3), power("Greater Talisman", "wod.types.hekaupower"), power("Simple Servitor", "wod.types.hekaupower"),
        power("Sekhem Vessel", "wod.types.hekaupower")]);
    const tal = (await work(m, "mummy", "greater-talisman", {attr: "strength"}, 30)).items[0];
    await tal?.update({"system.isequipped": true});
    const on = (tal?.system?.bonuslist ?? []).filter(b => b.type === "attribute_buff" && b.settingtype === "strength").map(b => b.value);
    await tal?.update({"system.isequipped": false});
    const off = (tal?.system?.bonuslist ?? []).filter(b => b.type === "attribute_buff" && b.settingtype === "strength");
    ok("6. Mummy talisman worn", on.includes(2) && !off.length && wonderOf(tal)?.lasts?.months === 7, {on, off: off.length, lasts: wonderOf(tal)?.lasts});
    const actorsMid = new Set(game.actors.map(a => a.id));
    await work(m, "mummy", "simple-servitor", {}, 1);
    await sleep(500);
    const ush = game.actors.find(a => !actorsMid.has(a.id) && a.flags?.[LIB]?.effigy?.key === "simple-servitor");
    if ( ush ) made.push(ush);
    ok("7. Mummy ushabti companion", ush?.type === "Creature" && ush.flags[LIB].effigy.health === 3, {name: ush?.name});
    const sekBefore = Number(m.system.advantages.sekhem.temporary);
    const vs = (await work(m, "mummy", "sekhem-vessel", {store: 2}, 8)).items[0];
    const sekAfter = Number(m.system.advantages.sekhem.temporary);
    const msgs0 = game.messages.size;
    const drew = vs ? await WU.run(vs, "wonder:draw", m) : null;
    ok("8. Mummy Sekhem Vessel", wonderOf(vs)?.pool?.max === 2 && sekBefore - sekAfter === 2 && !!drew && game.messages.size > msgs0,
      {pool: wonderOf(vs)?.pool, sekhem: [sekBefore, sekAfter], lines: drew?.lines});

    // Demon
    const d = await mk("Demon", "Annunaki", {"advantages.faith.temporary": 4, "advantages.faith.permanent": 5, "advantages.torment.permanent": 3, "attributes.dexterity.value": 3, "abilities.craft.value": 3},
      [power("Lore of the Forge", "wod.types.lore", 4), power("Lore of Light", "wod.types.lore", 2)]);
    const en = (await work(d, "demon", "enchant-object", {evocation: "light:2", scope: "notable"}, 5)).items[0];
    const msgs1 = game.messages.size;
    const used = en ? await WU.run(en, "wonder:use-demon", d) : null;
    ok("9. Demon enchanted object", wonderOf(en)?.evocation?.lore === "light" && !!used && game.messages.size > msgs1 && Number(d.system.advantages.faith.temporary) <= 3,
      {powers: wonderOf(en)?.powers?.map(p => p.id), faith: d.system.advantages.faith.temporary, lines: used?.lines});

    // Hunter
    const year = Number(game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.()) || 0;
    const h = await mk("Hunter", "Inquisitor", {"advantages.willpower.temporary": 5, "attributes.charisma.value": 3, "abilities.religion.value": 3});
    await h.update({"flags.wodx-actions.inquisitor": {order: "john", conviction: 3, faith: 3, wisdom: 2, zeal: 1}});
    const hw = await work(h, "hunter", "holy-water", {}, 2);
    const water = hw.items.find(i => wonderOf(i)?.key === "holy-water");
    ok("10. Hunter holy water", year && year >= 1500 ? !hw.t : wonderOf(water)?.uses?.value === 2, {year, made: hw.items.map(i => i.name)});

    const ls = S.linesFor(c).map(x => x.kit.line);
    ok("11. picker lines", ls.length === 1 && ls[0] === "changeling", {lines: ls});
  } catch (e) { R.errors.push(String(e?.stack ?? e)); }
  try {
    for ( const k of SETS ) if ( keep[k] !== undefined ) await game.settings.set(LIB, k, keep[k]);
    const extra = game.actors.filter(a => !actorsBefore.has(a.id)).filter(a => a.name.startsWith("WoDX gate:") || a.flags?.[LIB]?.effigy);
    const ids = [...new Set([...made.filter(Boolean).map(a => a.id), ...extra.map(a => a.id)])].filter(id => game.actors.get(id));
    if ( ids.length ) await Actor.deleteDocuments(ids);
    const mids = game.messages.filter(x => !msgsBefore.has(x.id)).map(x => x.id);
    if ( mids.length ) await ChatMessage.deleteDocuments(mids);
    ok("12. clean up", !ids.some(id => game.actors.get(id)), {actors: ids.length, messages: mids.length});
  } catch (e) { R.errors.push(String(e?.stack ?? e)); ok("12. clean up", false); }
  return save(R);
}
