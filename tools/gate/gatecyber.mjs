/**
 * WoDX Library gate: cyberware in the body (B3795 to B3797), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatecyber.mjs?${Date.now()}`)).run()
 * Makes its own scratch actors and removes them; never moves the clock.
 *   1. the Library's api.cyber is up, and the gear data's Smartgun Link carries its attack-difficulty row
 *   2. a Kerenzikov ticked on a mortal: its rows turn on, Dexterity goes up by 1, the piece is marked installed,
 *      Humanity Index points are taken and a card is posted
 *   3. cleared again: Dexterity falls back; ticked again: no second Humanity cost
 *   4. a Linear Frame Omega sets Strength to 8
 *   5. ten Humanity Index points take a dot: a mortal at 9 lost points with a cost of 3 drops a dot of Humanity;
 *      a werewolf in the same place drops a dot of Gnosis
 *   6. the cyber weapons that were plain items arrive as weapons (Popup Gun is a Ranged Weapon with damage 4)
 * Result: Data/wodx-gate/gatecyber-result.json.
 */
import {gate} from "./kit.mjs";

const LIB = "wodx-library";

export async function run() {
  const G = gate("gatecyber");
  try {
    const lib = game.modules.get(LIB)?.api;
    const data = await lib.gear();
    const piece = name => foundry.utils.deepClone(data.items.find(i => i.name === name));
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const settle = async (fn, ms = 4000) => { const t = Date.now(); while ( Date.now() - t < ms ) { if ( await fn() ) return true; await wait(150); } return !!(await fn()); };

    await G.step("1. api and data", async () => {
      const link = data.items.find(i => i.name === "Smartgun Link");
      G.ok("1. api and data", !!lib?.cyber?.install && link?.system?.bonuslist?.[0]?.type === "attack_diff", {version: lib?.version, row: link?.system?.bonuslist?.[0]});
    });

    const [m] = await G.make(Actor, [{name: "Gate Cyber Mortal", type: "Mortal", system: {advantages: {path: {permanent: 7}}}}]);
    let ker;
    await G.step("2. a Kerenzikov goes in", async () => {
      const dex0 = Number(m.system.attributes.dexterity.total ?? m.system.attributes.dexterity.value);
      const msgs0 = game.messages.size;
      [ker] = await m.createEmbeddedDocuments("Item", [piece("Kerenzikov")]);
      await ker.update({"system.isequipped": true});
      await settle(() => ker.flags?.[LIB]?.installed && Number(m.flags?.[LIB]?.humanityLoss) > 0);
      const dex1 = Number(m.system.attributes.dexterity.total);
      const rows = ker.system.bonuslist.filter(b => b.wodxGear);
      const card = [...game.messages].slice(msgs0).some(x => /Kerenzikov/.test(x.content) && /Humanity cost/.test(x.content));
      G.ok("2. a Kerenzikov goes in", rows.every(b => b.isactive) && dex1 === dex0 + 1 && ker.flags[LIB].installed && Number(m.flags[LIB].humanityLoss) > 0 && card,
        {dex0, dex1, loss: m.flags[LIB]?.humanityLoss, card});
    });

    await G.step("3. out and in again", async () => {
      const loss = Number(m.flags[LIB].humanityLoss);
      const dexOn = Number(m.system.attributes.dexterity.total);
      await ker.update({"system.isequipped": false});
      await settle(() => Number(m.system.attributes.dexterity.total) === dexOn - 1);
      const dexOff = Number(m.system.attributes.dexterity.total);
      await ker.update({"system.isequipped": true});
      await wait(800);
      G.ok("3. out and in again", dexOff === dexOn - 1 && Number(m.flags[LIB].humanityLoss) === loss, {dexOn, dexOff, loss, after: m.flags[LIB].humanityLoss});
    });

    await G.step("4. a Linear Frame Omega", async () => {
      const [fr] = await m.createEmbeddedDocuments("Item", [{...piece("Linear Frame Omega"), system: {...piece("Linear Frame Omega").system, isequipped: true}}]);
      await settle(() => Number(m.system.attributes.strength.total) === 8);
      G.ok("4. a Linear Frame Omega", Number(m.system.attributes.strength.total) === 8 && fr.system.bonuslist[0].isactive, {strength: m.system.attributes.strength.total});
    });

    await G.step("5. ten points to a dot", async () => {
      const [h, w] = await G.make(Actor, [{name: "Gate Cyber Nine", type: "Mortal", system: {advantages: {path: {permanent: 7}}}, flags: {[LIB]: {humanityLoss: 9}}},
        {name: "Gate Cyber Wolf", type: "Werewolf", system: {advantages: {gnosis: {permanent: 5}}}, flags: {[LIB]: {humanityLoss: 9}}}]);
      const ram = () => ({...piece("Hydraulic Rams"), system: {...piece("Hydraulic Rams").system, isequipped: true}});
      await h.createEmbeddedDocuments("Item", [ram()]);
      await w.createEmbeddedDocuments("Item", [ram()]);
      await settle(() => Number(h.flags?.[LIB]?.humanityLoss) === 12 && Number(w.flags?.[LIB]?.humanityLoss) === 12);
      G.ok("5. ten points to a dot", h.system.advantages.path.permanent === 6 && w.system.advantages.gnosis.permanent === 4,
        {humanity: h.system.advantages.path.permanent, gnosis: w.system.advantages.gnosis.permanent, loss: [h.flags[LIB]?.humanityLoss, w.flags[LIB]?.humanityLoss]});
    });

    await G.step("6. cyber weapons fight", async () => {
      const [gun] = await m.createEmbeddedDocuments("Item", [piece("Popup Gun")]);
      G.ok("6. cyber weapons fight", gun.type === "Ranged Weapon" && Number(gun.system.damage.bonus) === 4, {type: gun.type, damage: gun.system.damage});
    });
  } finally { return G.finish(); }
}
