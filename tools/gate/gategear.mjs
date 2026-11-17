/**
 * Gear by era (WoDX Library 0.1.0, Combat 3.7.7), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gategear.mjs?${Date.now()}`)).run()
 * It makes one test mortal and deletes it. The compendium "WoDX · Gear by era" is the module's own and stays.
 *   1. versions, and the compendium holds every item of the data
 *   2. the Gear window opens on an era with its search box; the Dark Ages list has a Battle-Ax and no pistol
 *   3. Future Darkness lists the cyberware
 *   4. giving a Battle-Ax and Subdermal Armor puts both on the character as the book has them
 *   5. Combat counts the implant's soak though it was never ticked as worn
 *   5b. the Battle-Ax in WoDX Combat's attack plan (the one the attack window uses): Dexterity + Melee dice at the
 *      item's difficulty, Strength + 4 lethal
 *   6. put back
 * Result: Data/wodx-gate/gategear-result.json.
 */
const L = "wodx-library", CB = "wodx-combat";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const newer = (a, b) => { const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for ( let i = 0; i < 3; i++ ) if ( (pa[i] ?? 0) !== (pb[i] ?? 0) ) return (pa[i] ?? 0) > (pb[i] ?? 0); return true; };
async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gategear-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const win = () => [...foundry.applications.instances.values()].find(a => a.rendered && a.element?.classList.contains("wodx-gear"));

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  let actor, foe;
  try {
    const api = game.modules.get(L)?.api;
    const data = await api.gear();
    let pack = game.packs.get("world.wodx-gear");
    if ( !pack ) { await api.installPack(); pack = game.packs.get("world.wodx-gear"); }
    const index = await pack?.getIndex();
    ok("1. versions and compendium", newer(game.modules.get(L)?.version, "0.1.0") && newer(game.modules.get(CB)?.version, "3.7.7") && index?.size >= data.items.length,
      {library: game.modules.get(L)?.version, combat: game.modules.get(CB)?.version, inPack: index?.size, inData: data.items.length});

    await api.open("dark-ages"); await sleep(700);
    let w = win(), names = [...(w?.element.querySelectorAll(".wodx-gear-row b") ?? [])].map(b => b.textContent);
    ok("2. Dark Ages list", !!w?.element.querySelector("input.wodx-search") && names.includes("Battle-Ax") && !names.includes("Pistol, Hvy."), {rows: names.length});
    await api.open("future-darkness"); await sleep(700);
    w = win(); names = [...(w?.element.querySelectorAll(".wodx-gear-row b") ?? [])].map(b => b.textContent);
    ok("3. Future Darkness list", names.includes("Subdermal Armor") && names.includes("Smartgun Link") && names.includes("Pistol, Hvy."), {rows: names.length});
    await w?.close();

    actor = await Actor.create({name: "Gate gear mortal", type: "Mortal"});
    await api.give([actor], ["v20-dark-ages|Battle-Ax", "world-of-future-darkness|Subdermal Armor"]); await sleep(400);
    const ax = actor.items.find(i => i.name === "Battle-Ax"), sub = actor.items.find(i => i.name === "Subdermal Armor");
    ok("4. give", ax?.type === "Melee Weapon" && ax.system.damage?.bonus === 4 && sub?.type === "Armor" && sub.system.soak?.lethal === 4,
      {ax: ax?.system?.damage, sub: sub?.system?.soak});
    await sub?.update({"system.isequipped": false});
    const arm = game.modules.get(CB)?.api?.armor?.(actor) ?? game.wodxCombat?.armor?.(actor);
    ok("5. implant soak in Combat", arm?.lethal === 4 && arm?.names?.includes("Subdermal Armor"), {armor: arm});

    // The audit (B6177): read the pool the attack would roll, not only that the item is there
    // the totals too: the system and Combat read the stored total, which a script's update of the value leaves at 1.
    // Strength 4 meets the Battle-Ax's minimum, so the plan's difficulty is the axe's own
    await actor.update({"system.attributes.dexterity.value": 3, "system.attributes.dexterity.total": 3,
      "system.attributes.strength.value": 4, "system.attributes.strength.total": 4, "system.abilities.melee.value": 2});
    foe = await Actor.create({name: "Gate gear foe", type: "Mortal"});
    await sleep(300);
    const C = game.modules.get(CB)?.api ?? game.wodxCombat;
    const plan = C?.bestAttack?.(actor, foe, {}, {ignoreDistance: true})?.plans?.find(p => p.w?.name === "Battle-Ax");
    const dex = Number(actor.system.attributes.dexterity.total ?? actor.system.attributes.dexterity.value) || 0;
    const want = {dice: dex + 2, diff: Number(ax?.system?.difficulty)};
    ok("5b. the Battle-Ax's attack pool", !!plan?.valid && plan.atkDice === want.dice && plan.atkDiff === want.diff && plan.w.dmgAttr === "strength" && plan.w.dmgBonus === 4 && plan.dmgType === "lethal",
      {want, got: plan ? {valid: plan.valid, dice: plan.atkDice, diff: plan.atkDiff, dmgAttr: plan.w.dmgAttr, dmgBonus: plan.w.dmgBonus, type: plan.dmgType, why: plan.why} : null});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try { await win()?.close(); await actor?.delete(); await foe?.delete(); ok("6. put back", !game.actors.get(actor?.id) && !game.actors.get(foe?.id)); }
    catch (err) { ok("6. put back", false, {error: err.message}); }
  }
  return save(R);
}
