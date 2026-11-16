/**
 * Servants and bonds, step 1 (Servants and Bonds Desk, B5100-B5111), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateservants.mjs?${Date.now()}`)).run()
 * It makes a scratch scene and actors and deletes them; it does not move the clock.
 *   1. the API
 *   2. one ledger: a blood bond from the lineage and a bond kept on the sheet both read back, and the followers
 *      window lists the servant with the ledger's word for it
 *   3. a bond held by hand: binding writes the record, posts the card and draws the look on the map
 *   4. the blow held back: a bound servant rolls before striking the master, and the card says whether it struck;
 *      with the roll forced to fail, Combat's attack does not go ahead
 *   5. hard orders and opinion: full Conditioning carries a hard order with no loyalty roll, and the attitude
 *      cannot fall below Welcome
 *   6. a mage's people: an ally of a mage is an acolyte
 *   7. Dominate Conditioning: a scene's roll adds to the tally the Storyteller sees
 *   8. Kinfolk: a Kinfolk tied as kin to a Garou serves them
 * Result: Data/wodx-gate/gateservants-result.json.
 */
import {gate, newestMessage} from "./kit.mjs";

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run() {
  const G = gate("gateservants");
  const NPC = game.modules.get("wodx-npc")?.api;
  const S = NPC?.servants;
  const before = {restraint: game.settings.get("wodx-npc", "servantRestraint")};
  const t0 = Date.now();
  try {
    await G.step("1. the API", async () => G.ok("1. the API", !!S?.records && !!S?.bind && !!S?.restrain && !!S?.condition && !!S?.openBind && !!S?.rules?.KINDS?.thrall,
      {version: game.modules.get("wodx-npc")?.version}));
    const scene = await G.scene();
    const [reg, thr, mage, ally, garou, kin] = await G.make(Actor, [
      {name: "Gate Servants Regnant", type: "Vampire", system: {attributes: {charisma: {value: 4}}, abilities: {leadership: {value: 3}}}},
      {name: "Gate Servants Thrall", type: "Mortal", system: {advantages: {willpower: {permanent: 3, temporary: 3}, virtues: {selfcontrol: {permanent: 3}}}},
        flags: {"wodx-creation": {lineage: {bonds: {}}}}},
      {name: "Gate Servants Mage", type: "Mage"},
      {name: "Gate Servants Ally", type: "Mortal"},
      {name: "Gate Servants Garou", type: "Werewolf"},
      {name: "Gate Servants Kin", type: "Mortal", flags: {world: {wodx: {kinfolk: true}}}}]);
    await thr.update({[`flags.wodx-creation.lineage.bonds.${reg.id}`]: {name: reg.name, drinks: 2}});
    const [tReg, tThr] = await G.tokens(scene, [{actor: reg, x: 3, y: 3}, {actor: thr, x: 4, y: 3}]);
    await sleep(500);

    await G.step("2. one ledger", async () => {
      const rs = S.records(thr);
      const rows = NPC.followers.rowsFor(reg);
      const row = rows.find(r => r.id === thr.id);
      G.ok("2. one ledger", rs.some(r => r.kind === "blood" && r.master === reg.id && r.step === 2) && !!row && /Two drinks/.test(row.bond?.text ?? ""),
        {records: rs.map(r => `${r.kind}:${r.step}`), row: row ? `${row.kindLabel} / ${row.bond?.text}` : null});
    });

    await G.step("3. a bond held by hand", async () => {
      const layer = canvas.interface ?? canvas.stage;
      const kids = layer.children.length;
      const since = Date.now();
      await S.bind(thr, reg, "thrall", {step: 1});
      await sleep(150);
      const drawn = layer.children.length > kids;
      const card = newestMessage(since, m => !!m.flags?.["wodx-npc"]?.bondCard);
      const held = game.actors.get(thr.id).flags?.["wodx-npc"]?.held?.[`thrall:${reg.id}`];
      G.ok("3. a bond held by hand", held?.kind === "thrall" && !!card && drawn, {held: !!held, card: !!card, drawn});
      await S.unbind(thr, reg, "thrall");
    });

    await G.step("4. the blow held back", async () => {
      const since = Date.now();
      const r = await S.restrain(thr, reg);
      const card = newestMessage(since, m => m.flags?.["wodx-npc"]?.restraint !== undefined);
      const shown = card && /raises a hand against/.test(card.content) && (r.stop ? /not struck/.test(card.content) : /strikes/.test(card.content));
      // B6761: the thrall is an NPC, so its Willpower dice go to the Storyteller only; the card everyone sees has no dice
      const rolled = newestMessage(since, m => !!m.flags?.["wodx-npc"]?.restraint?.roll);
      const gmOnly = !!rolled && rolled.rolls?.length > 0 && rolled.whisper?.length > 0 && rolled.whisper.every(id => game.users.get(id)?.isGM);
      G.ok("4. the NPC's resisting roll is whispered to the Storyteller; the open card shows no dice", gmOnly && !!card && !card.whisper?.length && !card.rolls?.length,
        {rolled: !!rolled, whisper: rolled?.whisper ?? null, openRolls: card?.rolls?.length ?? null});
      // Forced: no Willpower left to spend, so even a won roll cannot pay for the blow
      await thr.update({"system.advantages.willpower.temporary": 0});
      const msgs = game.messages.size;
      const res = await game.wodxCombat?.quickAttack?.({attacker: tThr.object ?? canvas.tokens.get(tThr.id), target: tReg.object ?? canvas.tokens.get(tReg.id)});
      await sleep(300);
      const attacked = game.messages.contents.slice(msgs).some(m => m.flags?.["wodx-combat"]?.attack || /vtc-card/.test(m.content ?? "") && /Attack/i.test(m.content ?? ""));
      G.ok("4. the blow held back", !!r && typeof r.stop === "boolean" && shown && Array.isArray(res) && res.length === 0 && !attacked,
        {first: r?.stop, card: !!card, quickAttack: res?.length ?? null, attacked, hasCombat: !!game.wodxCombat?.quickAttack});
      await thr.update({"system.advantages.willpower.temporary": 3});
    });

    await G.step("5. hard orders and opinion", async () => {
      await S.bind(thr, reg, "conditioning", {step: 3, flash: false, quiet: true});
      const w = S.orderWeight(thr, reg.id);
      const loyal = NPC.orders.loyaltyFor(thr, reg.id);
      await NPC.attitude.apply(thr, reg, {to: 0, why: "WoDX gate"});
      const now = NPC.attitude.of(thr, reg);
      G.ok("5. hard orders and opinion", w.free && loyal.bound && now.step >= 2, {weight: w, loyal: loyal.text, step: now.step});
      await S.unbind(thr, reg, "conditioning");
    });

    await G.step("6. a mage's people", async () => {
      await ally.update({"flags.wodx-npc.serves": [mage.id]});
      const row = NPC.followers.rowsFor(mage).find(r => r.id === ally.id);
      G.ok("6. a mage's people", row?.kindLabel === "Acolyte", {label: row?.kindLabel});
    });

    await G.step("7. Dominate Conditioning", async () => {
      const since = Date.now();
      const rec = await S.condition(reg, thr);
      const card = newestMessage(since, m => /conditions/.test(m.content ?? "") && /Tally/.test(m.content ?? ""));
      const held = game.actors.get(thr.id).flags?.["wodx-npc"]?.held?.[`conditioning:${reg.id}`];
      G.ok("7. Dominate Conditioning", !!rec && !!held && Number(held.data?.need) === 21 && !!card, {tally: held?.data?.tally, need: held?.data?.need});
    });

    await G.step("8. Kinfolk", async () => {
      await kin.update({"flags.wodx-sheets.ties": [{uuid: garou.uuid, role: "kin", note: "", hidden: false}]});
      await sleep(300);
      const rs = S.records(kin);
      const row = NPC.followers.rowsFor(garou).find(r => r.id === kin.id);
      G.ok("8. Kinfolk", rs.some(r => r.kind === "kinfolk" && r.master === garou.id) && !!row, {records: rs.map(r => r.kind), row: row?.kindLabel});
    });
  } catch (e) {
    G.R.errors.push(String(e?.stack ?? e));
  } finally {
    await game.settings.set("wodx-npc", "servantRestraint", before.restraint);
    for ( const m of game.messages.contents.filter(m => m.timestamp >= t0 && (m.flags?.["wodx-npc"]?.bondCard || m.flags?.["wodx-npc"]?.restraint)) ) await m.delete().catch(() => null);
    return G.finish();
  }
}
