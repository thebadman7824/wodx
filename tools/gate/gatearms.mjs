/**
 * WoDX Library and WoDX Combat gate: everyday arms, weapon fittings and traps (B3805 to B3807), in Foundry, in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatearms.mjs?${Date.now()}`)).run()
 * Makes its own scratch scene, actors and tokens and removes them; never moves the clock.
 *   1. the Library's api.arms is up, and a kitchen cleaver's Use offers Ready it as a weapon
 *   2. WoDX Combat's attack list offers the cleaver (Strength + 2 lethal) once it is on a sheet
 *   3. a laser sight fitted makes a pistol one easier to hit with (attack plan difficulty 6, then 5)
 *   4. pepper spray in the face: the target is Blinded; a target in a gas mask is not
 *   5. a hand grenade thrown is used up
 *   6. a bear trap set and walked into: the victim takes damage and is completely immobilized
 * Result: Data/wodx-gate/gatearms-result.json.
 */
import {gate} from "./kit.mjs";

const LIB = "wodx-library";
const wait = ms => new Promise(r => setTimeout(r, ms));
const settle = async (fn, ms = 5000) => { const t = Date.now(); while ( Date.now() - t < ms ) { if ( await fn() ) return true; await wait(150); } return !!(await fn()); };
const strong = name => ({name, type: "Mortal", system: {attributes: {dexterity: {value: 5}, strength: {value: 3}, wits: {value: 5}, perception: {value: 1}},
  abilities: {athletics: {value: 5}, firearms: {value: 3}, survival: {value: 5}, alertness: {value: 0}}}});

/** Start a WoDX Combat attack with this weapon and press Attack with no defense. */
async function attackWith(C, aTok, tTok, weaponId) {
  const run = C.attack({attacker: aTok, target: tTok, weaponId, noAim: true});
  let dlg = null;
  await settle(() => (dlg = [...foundry.applications.instances.values()].find(a => a.rendered && a.element?.querySelector?.(".vtc-dialog, select[name='weapon']"))));
  const root = dlg?.element;
  const def = root?.querySelector("select[name='defense']");
  if ( def ) { def.value = "none"; def.dispatchEvent(new Event("change", {bubbles: true})); }
  root?.querySelector("button[data-action='attack']")?.click();
  return run;
}

export async function run() {
  const G = gate("gatearms");
  try {
    const lib = game.modules.get(LIB)?.api;
    const C = game.modules.get("wodx-combat")?.api ?? game.wodxCombat;
    const scene = await G.scene();
    const [a, b, m] = await G.make(Actor, [strong("Gate Arms Sprayer"), strong("Gate Arms Victim"), strong("Gate Arms Masked")]);
    const docs = await G.tokens(scene, [{actor: a, x: 2, y: 2, actorLink: true}, {actor: b, x: 3, y: 2, actorLink: true}, {actor: m, x: 2, y: 3, actorLink: true}]);
    await settle(() => docs.every(d => d?.object));
    const [ta, tb, tm] = docs.map(d => d.object ?? d);

    await G.step("1. api and Use", async () => {
      const [cl] = await a.createEmbeddedDocuments("Item", [{name: "a kitchen cleaver", type: "Item"}]);
      const ab = await lib.use.abilities(cl);
      G.ok("1. api and Use", !!lib?.arms?.weaponEntry && ab.includes("ready"), {abilities: ab});
    });

    await G.step("2. the cleaver fights", async () => {
      const plans = C.bestAttack(a, b, {}, {ignoreDistance: true}).plans;
      const p = plans.find(x => x.w?.name === "a kitchen cleaver");
      G.ok("2. the cleaver fights", !!p?.valid && p.w.dmgBonus === 2 && p.w.type === "lethal", {plan: p ? {valid: p.valid, dmg: p.w.dmgBonus, type: p.w.type} : null});
    });

    await G.step("3. a laser sight", async () => {
      const [gun] = await a.createEmbeddedDocuments("Item", [{name: "Gate Arms pistol", type: "Ranged Weapon", system: {isequipped: true, difficulty: 6, range: 20,
        damage: {attribute: "", bonus: 4, type: "lethal"}, attack: {attribute: "dexterity", ability: "firearms"}, clip: {value: 6, max: 6}}}]);
      const plan = () => C.bestAttack(a, b, {}, {ignoreDistance: true}).plans.find(x => x.w?.id === gun.id);
      const before = plan()?.atkDiff;
      await a.createEmbeddedDocuments("Item", [{name: "a laser sight", type: "Item", system: {isequipped: true}}]);
      const after = plan()?.atkDiff;
      G.ok("3. a laser sight", before === 6 && after === 5, {before, after});
    });

    await G.step("4. pepper spray and a gas mask", async () => {
      const [spray] = await a.createEmbeddedDocuments("Item", [{name: "a can of pepper spray", type: "Item", system: {isequipped: true}}]);
      await m.createEmbeddedDocuments("Item", [{name: "a gas mask", type: "Item", system: {isequipped: true}}]);
      const cond = actor => !!game.modules.get("wodx-chronicle")?.api?.conditions?.hasCondition?.(actor, "blinded");
      for ( let i = 0; i < 3 && !cond(b); i++ ) await attackWith(C, ta, tb, spray.id);
      await settle(() => cond(b));
      for ( let i = 0; i < 2; i++ ) await attackWith(C, ta, tm, spray.id);
      await wait(600);
      const mask = [...game.messages].slice(-6).some(x => /gas mask keeps the spray out/i.test(x.content));
      G.ok("4. pepper spray and a gas mask", cond(b) && !cond(m) && mask, {victim: cond(b), masked: cond(m), maskCard: mask});
    });

    await G.step("5. a grenade is used up", async () => {
      const [gr] = await a.createEmbeddedDocuments("Item", [{name: "a hand grenade", type: "Item", system: {isequipped: true}}]);
      await attackWith(C, ta, tm, gr.id);
      await settle(() => !a.items.get(gr.id));
      G.ok("5. a grenade is used up", !a.items.get(gr.id), {left: !!a.items.get(gr.id)});
    });

    await G.step("6. a bear trap", async () => {
      const [trap] = await a.createEmbeddedDocuments("Item", [{name: "a bear trap", type: "Item"}]);
      const imm = () => !!game.modules.get("wodx-chronicle")?.api?.conditions?.hasCondition?.(b, "immobilized");
      let caught = false, sets = 0;
      for ( let i = 0; i < 6 && !caught; i++ ) {
        const s = await lib.arms.setTrap(a, trap); sets++;
        if ( !s?.set ) continue;
        const r = await lib.arms.springTrap(a, trap, tb);
        caught = !!r?.caught;
      }
      await settle(() => imm());
      const card = [...game.messages].slice(-8).some(x => /takes damage/i.test(x.content) && /Gate Arms Victim/.test(x.content));
      G.ok("6. a bear trap", caught && imm() && card, {caught, sets, immobilized: imm(), damageCard: card});
    });
  } finally { return G.finish(); }
}
