/**
 * Gate: fomor powers (B5610-B5619), on a testbed lane.
 *   1. the rules: 73 powers, each with a page; the api
 *   2. always-on powers from the sheet: Armored Hide's soak rows, Exoskeleton's Strength, Claws and Fangs as a natural
 *      weapon, Darksight on the token, the Wyrm taint for the senses
 *   3. Armored Skin soaks lethal; Immunity to the Delirium; Triatic Sense hides the taint
 *   4. Mind Blast on a victim: the victim is dazed (its status on the token)
 *   5. Wings: the token goes up, and comes down when the power ends
 *   6. Regeneration: a lethal level closes on a new round of a fight
 *   7. an NPC fomor's power choice offers Mind Blast to hold
 *   8. Homogeneity's dulled power is taken by the target's next power window
 * Result: Data/wodx-gate/gatefomor-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-actions";
const wait = ms => new Promise(r => setTimeout(r, ms));

export async function run() {
  const G = gate("gatefomor", {stepTimeout: 45000});
  const A = game.modules.get(MOD)?.api;
  const F = A?.fomor;
  try {
    await G.step("1. the rules and the api", async () => {
      const list = F?.rules?.POWERS ?? [];
      G.ok("1. the rules and the api", list.length === 73 && list.every(p => p.p >= 430 && p.p <= 439) && typeof F?.use === "function" && typeof F?.settle === "function",
        {n: list.length});
    });
    if ( !F?.use ) return;
    const scene = await G.scene({name: "WoDX gate: fomor"});
    const pw = name => ({name, type: "Power", system: {type: "wod.types.power", value: 1}});
    const [fo, victim, skin] = await G.make(Actor, [
      {name: "Gate Fomor Brute", type: "Mortal", items: ["Armored Hide", "Exoskeleton", "Claws and Fangs", "Darksight", "Mind Blast", "Wings", "Regeneration", "Homogeneity"].map(pw)},
      {name: "Gate Fomor Victim", type: "Mortal"},
      {name: "Gate Fomor Skin", type: "Mortal", items: ["Armored Skin", "Immunity to the Delirium", "Triatic Sense"].map(pw)}]);
    // The system's sheet can prepare a new mortal to Willpower 0: set the traits after creation
    const traits = {"system.advantages.willpower.permanent": 9, "system.advantages.willpower.temporary": 9, "system.attributes.wits.value": 5, "system.attributes.strength.value": 2};
    await fo.update(traits);
    await victim.update({"system.advantages.willpower.permanent": 1, "system.advantages.willpower.temporary": 1});
    const [ft, vt] = await G.tokens(scene, [{actor: fo, x: 4, y: 4}, {actor: victim, x: 5, y: 4}]);
    const body = () => scene.tokens.get(ft.id)?.actor;
    const CH = game.modules.get("wodx-chronicle")?.api;

    await G.step("2. always-on powers come from the sheet", async () => {
      await F.settle(body());
      await waitFor(() => body().items.some(i => i.name === "Claws and fangs" && i.system?.isnatural), 5000);
      const hide = body().items.find(i => i.name === "Armored Hide");
      const soak = (hide?.system?.bonuslist ?? []).filter(b => b.type === "soak_buff" && b.isactive).map(b => `${b.settingtype}:${b.value}`);
      await waitFor(() => Number(body().system?.attributes?.strength?.total) === 5, 5000);
      const str = Number(body().system?.attributes?.strength?.total);
      const claws = body().items.find(i => i.name === "Claws and fangs");
      await waitFor(() => scene.tokens.get(ft.id)?.sight?.visionMode === "darkvision", 4000);
      const sight = scene.tokens.get(ft.id)?.sight?.visionMode;
      const wyrm = !!body().flags?.["wodx-senses"]?.wyrm;
      G.ok("2. always-on powers come from the sheet", soak.includes("bashing:3") && soak.includes("lethal:3") && str === 5 && claws?.system?.damage?.type === "aggravated" && sight === "darkvision" && wyrm,
        {soak, str, claws: claws?.system?.damage, sight, wyrm});
    });

    await G.step("3. Armored Skin, Immunity and Triatic Sense", async () => {
      await F.settle(skin);
      const s = F.soakOf(skin), imm = F.immune(skin), hid = F.taintHidden(skin);
            G.ok("3. Armored Skin, Immunity and Triatic Sense", !!s?.lethalSoak && imm && hid && !skin.flags?.["wodx-senses"]?.wyrm, {s, imm, hid, wyrm: skin.flags?.["wodx-senses"]?.wyrm});
    });

    await G.step("4. Mind Blast dazes its victim", async () => {
      const v = () => scene.tokens.get(vt.id)?.actor;
      vt.object?.setTarget?.(true, {releaseOthers: true, groupSelection: false});
      for ( let k = 0; k < 5 && !v()?.statuses?.has?.("wodx-dazed"); k++ ) {
        await A.limits?.clear?.(body());
        await body().update({"system.advantages.willpower.temporary": 9});
        await F.use(body(), "mindblast");
        await waitFor(() => v()?.statuses?.has?.("wodx-dazed"), 2500);
      }
      const dazed = !!v()?.statuses?.has?.("wodx-dazed");
      vt.object?.setTarget?.(false);
      G.ok("4. Mind Blast dazes its victim", dazed, {statuses: [...(v()?.statuses ?? [])], targeted: game.user.targets.size});
    });

    await G.step("5. Wings lift the token, and it lands when the power ends", async () => {
      const e0 = Number(scene.tokens.get(ft.id)?.elevation) || 0;
      await F.use(body(), "wings");
      await waitFor(() => (Number(scene.tokens.get(ft.id)?.elevation) || 0) > e0, 4000);
      const up = Number(scene.tokens.get(ft.id)?.elevation) || 0;
      await CH.timed.endFor(body(), {key: "wodx-fomor-wings"});
      await waitFor(() => (Number(scene.tokens.get(ft.id)?.elevation) || 0) === e0, 5000);
      const down = Number(scene.tokens.get(ft.id)?.elevation) || 0;
      G.ok("5. Wings lift the token, and it lands when the power ends", up > e0 && down === e0, {e0, up, down});
    });

    await G.step("6. Regeneration closes a lethal level each new round", async () => {
      await body().update({"system.health.damage.lethal": 2});
      const fight = await Combat.create({scene: scene.id, active: true});
      await fight.createEmbeddedDocuments("Combatant", [{tokenId: ft.id, sceneId: scene.id, actorId: fo.id}]);
      await fight.startCombat();
      await wait(800);
      await fight.nextRound();
      await waitFor(() => Number(body().system?.health?.damage?.lethal) === 1, 6000);
      const lethal = Number(body().system?.health?.damage?.lethal);
      const extra = body().getFlag(MOD, "extraActions");
      await fight.delete().catch(() => null);
      G.ok("6. Regeneration closes a lethal level each new round", lethal === 1, {lethal, extra});
    });

    await G.step("7. an NPC fomor's power choice offers Mind Blast to hold", async () => {
      await A.limits?.clear?.(body());
      const powers = A.npcPowers(body());
      const mb = powers.find(p => p.name === "Mind Blast");
      G.ok("7. an NPC fomor's power choice offers Mind Blast to hold", !!mb && mb.uses.includes("hold") && mb.use === "useFomor",
        {sample: powers.map(p => ({name: p.name, uses: p.uses}))});
    });

    await G.step("8. Homogeneity's dulled power goes with the target's next power window", async () => {
      await victim.setFlag(MOD, "powerDulled", {dice: 2, by: "Gate Fomor Brute"});
      const before = !!victim.getFlag(MOD, "powerDulled");
      const g = await A.limits.gate(victim, {name: "Gate test power", level: 1}, {targets: []});
      const after = !!victim.getFlag(MOD, "powerDulled");
      await g?.done({successes: 1});
      G.ok("8. Homogeneity's dulled power goes with the target's next power window", before && !after, {before, after});
    });
  } catch (e) {
    G.R.errors.push(String(e?.message ?? e));
  }
  return G.finish();
}
