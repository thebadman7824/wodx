/**
 * WoDX gate: every line level with the Kindred (B6300-B6309), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateroads.mjs?${Date.now()}`)).run()
 * Scratch scene and actors only. Never moves the clock.
 *   1. every line's menu carries the shared Storyteller tools and downtime
 *   2. End of story rolls a werewolf's Rage on one die and sets it on the sheet
 *   3. a wraith who lives all Eight Truths, with Angst under Willpower, is offered Transcendence; approved, the token fades
 *   4. a stronger Shadow undoes "Conquer the Shadow"
 *   5. a Kuei-jin at Dharma 9 is offered the bodhisattva's rank; approved, they see across the Shroud; Dharma 7 takes it away
 *   6. a demon at Torment 0 is offered redemption; approved, Torment gained makes them fall again
 * Covers WoDX Actions, WoDX Chronicle and WoDX Otherworlds.
 * Result: Data/wodx-gate/gateroads-result.json.
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-chronicle", ACT = "wodx-actions";
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run() {
  const G = gate("gateroads");
  const chron = () => game.modules.get(MOD).api;
  const A = () => game.modules.get(ACT).api;
  const mine = (type, id) => chron().approvals.pending().filter(p => p.type === `${MOD}.${type}` && p.data?.actor === id);
  try {
    await game.settings.set(MOD, "podRoads", true);
    await game.settings.set(ACT, "moonRage", true);
    const scene = await G.scene();
    const [wolf, ghost, kj, dem] = await G.make(Actor, [
      {name: "Gate Roads Wolf", type: "Werewolf", system: {advantages: {rage: {permanent: 5, temporary: 0}}}},
      {name: "Gate Roads Ghost", type: "Wraith", system: {advantages: {willpower: {permanent: 6, temporary: 6}}}},
      {name: "Gate Roads Jade", type: "Vampire", system: {settings: {variant: "kindredeast"}, advantages: {dharma: {permanent: 6}}}},
      {name: "Gate Roads Fallen", type: "Demon", system: {settings: {hastorment: true}, advantages: {torment: {permanent: 1, temporary: 0}}}}
    ]);
    // Advantages live as Advantage items; write the item when there is one, as the sheet does.
    const setAdv = async (a, id, perm) => {
      const it = a.items.find(i => i.type === "Advantage" && String(i.system?.id ?? "").toLowerCase() === id);
      if ( it ) return it.update({"system.permanent": perm});
      return a.update({[`system.advantages.${id}.permanent`]: perm});
    };
    await setAdv(ghost, "willpower", 6);
    await setAdv(dem, "torment", 1);
    await sleep(300);
    const [, tg] = await G.tokens(scene, [{actor: wolf, x: 2, y: 2}, {actor: ghost, x: 4, y: 2}, {actor: kj, x: 6, y: 2}, {actor: dem, x: 8, y: 2}]);

    await G.step("1. every line's menu has the shared tools", async () => {
      const PM = await import(`/modules/wodx-actions/scripts/profile-menus.js?${Date.now()}`);
      const miss = [];
      for ( const [k, m] of Object.entries(PM.MENUS) ) {
        const s = m.sections.flatMap(([, b]) => b.map(([x]) => x));
        for ( const x of ["api:newNight", "api:endStory", "api:masquerade", "api:skyAndSun"] ) if ( !s.includes(x) ) miss.push(`${k}:${x}`);
        if ( !["spirit", "beast"].includes(k) && !s.includes("api:downtime") ) miss.push(`${k}:downtime`);
      }
      G.ok("1. every line's menu has the shared tools", !miss.length, {miss});
    });

    await G.step("2. End of story rolls the werewolf's Rage", async () => {
      const before = game.messages.size;
      await A().endStory({actors: [wolf]});
      const r = Number(wolf.system.advantages.rage.temporary);
      const card = game.messages.contents.slice(before).map(m => m.content).join(" ");
      G.ok("2. End of story rolls the werewolf's Rage", r >= 1 && r <= 5 && /Rage rolled for the new story/.test(card), {rage: r});
    });

    await G.step("3. all Eight Truths offer Transcendence; approved, the wraith fades", async () => {
      await chron().roads.seek(ghost);
      for ( const t of chron().roads.rules.TRUTHS ) await chron().roads.truth(ghost, t.key, "gate");
      await sleep(300);
      const p = mine("roadTranscend", ghost.id)[0];
      if ( p ) await chron().approvals.decide(p.id, "approve", "gateroads");
      await sleep(5000);
      const doc = scene.tokens.get(tg.id);
      G.ok("3. all Eight Truths offer Transcendence; approved, the wraith fades", ghost.getFlag(ACT, "transcended") === true && doc?.hidden === true, {queued: !!p, hidden: doc?.hidden});
      await chron().roads.returnToPlay(ghost);
    });

    await G.step("4. a stronger Shadow undoes Conquer the Shadow", async () => {
      await ghost.setFlag(ACT, "angstPermanent", 2);
      await sleep(300);
      await ghost.setFlag(ACT, "angstPermanent", 4);
      await sleep(500);
      const t = ghost.flags[MOD].road.truths;
      G.ok("4. a stronger Shadow undoes Conquer the Shadow", !t.includes("shadow") && t.length === 7, {truths: t});
    });

    await G.step("5. a bodhisattva sees across the Shroud; lower Dharma takes it away", async () => {
      await setAdv(kj, "dharma", 9);
      await sleep(500);
      const p = mine("roadBodhisattva", kj.id)[0];
      if ( p ) await chron().approvals.decide(p.id, "approve", "gateroads");
      await sleep(300);
      const V = await import(`/modules/wodx-otherworlds/scripts/veil-look-rules.mjs?${Date.now()}`);
      const sees = V.sightsOf(kj.flags[ACT] ?? {}, game.time.worldTime).includes("shroud");
      const was = kj.getFlag(ACT, "bodhisattva") === true;
      await setAdv(kj, "dharma", 7);
      await sleep(500);
      G.ok("5. a bodhisattva sees across the Shroud; lower Dharma takes it away", was && sees && !kj.getFlag(ACT, "bodhisattva"), {queued: !!p, was, sees});
    });

    await G.step("6. Torment 0 offers redemption; Torment gained makes them fall", async () => {
      await setAdv(dem, "torment", 0);
      await sleep(500);
      const p = mine("roadRedeem", dem.id)[0];
      if ( p ) await chron().approvals.decide(p.id, "approve", "gateroads");
      await sleep(300);
      const was = dem.getFlag(ACT, "redeemed") === true;
      const note = await A().demonTorment(dem, 1);
      G.ok("6. Torment 0 offers redemption; Torment gained makes them fall", was && !dem.getFlag(ACT, "redeemed") && /falls again/.test(String(note)), {queued: !!p, was, note});
    });
  } finally {
    return G.finish();
  }
}
