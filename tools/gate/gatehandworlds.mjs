/**
 * The Otherworlds, Creation and Senses parts of the Storyteller's Hand (B5011, B5017, B5023), in rothenstein-wodx,
 * as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatehandworlds.mjs?${Date.now()}`)).run()
 * Makes its own scene and characters and removes them; puts back the clock.
 *   1. the api: wodx-otherworlds fading, wodx-creation possess, wodx-senses whoSees
 *   2. a mage whose Disembodiment was approved, a lunar month away, fades a step by itself, with a card
 *   3. a Fallen who takes a body on a sheet gets its Strength, Dexterity and Stamina, and its token
 *   4. the noticing roll made on its own asks only the watchers it is given and sends no card when nobody new finds anyone
 * Result: Data/wodx-gate/gatehandworlds-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const OW = "wodx-otherworlds", CR = "wodx-creation", SN = "wodx-senses";

export async function run() {
  const G = gate("gatehandworlds");
  if ( G.notLive() ) return "Not on the Live world.";
  const api = id => game.modules.get(id)?.api;
  const clock = game.time.worldTime;
  try {
    const scene = await G.scene();
    const DEMON = CONFIG.worldofdarkness?.sheettype?.demon ?? "Demon";
    const [mage, demon, host, hider] = await G.make(Actor, [
      {name: "Gate Worlds Mage", type: "Mage", prototypeToken: {actorLink: true}},
      {name: "Gate Worlds Fallen", type: DEMON, system: {advantages: {willpower: {permanent: 8, temporary: 8}}}, prototypeToken: {actorLink: true}},
      {name: "Gate Worlds Host", type: "Mortal", prototypeToken: {actorLink: true}},
      {name: "Gate Worlds Hider", type: "Mortal", prototypeToken: {actorLink: true}}]);
    const [, , tHider] = await G.tokens(scene, [{actor: mage, x: 2, y: 2}, {actor: host, x: 6, y: 6}, {actor: hider, x: 9, y: 9}]);

    await G.step("1 api", async () => {
      G.ok("1 api", typeof api(OW)?.fading?.tick === "function" && typeof api(CR)?.possess === "function" && typeof api(SN)?.perception?.whoSees === "function");
    });

    await G.step("2 fading", async () => {
      const now = game.time.worldTime, month = api(OW).fading.rules.MONTH;
      await mage.setFlag(OW, "disembodied", {begun: now - month - 3600, last: now, away: month + 3600, step: 1});
      const before = game.messages.size;
      const rose = await api(OW).fading.tick(now);
      const flag = game.actors.get(mage.id)?.getFlag(OW, "disembodied");
      const card = await waitFor(() => [...game.messages].slice(before).some(m => /fades further from the body/.test(m.content ?? "")), 4000);
      G.ok("2 fading", rose >= 1 && flag?.step === 2 && !!card, {rose, flag, card: !!card});
    });

    await G.step("3 possess", async () => {
      await host.update({"system.attributes.strength.value": 4, "system.attributes.dexterity.value": 3, "system.attributes.stamina.value": 5});
      const d0 = game.actors.get(demon.id);
      await api(CR).possess(d0, {target: "ordinary", dice: [10, 10, 10, 10, 10, 10], host});
      const d = game.actors.get(demon.id)?.system?.attributes ?? {};
      const tok = scene.tokens.find(t => t.actorId === demon.id);
      G.ok("3 possess", Number(d.strength?.value) === 4 && Number(d.dexterity?.value) === 3 && Number(d.stamina?.value) === 5 && !!tok,
        {str: d.strength?.value, dex: d.dexterity?.value, sta: d.stamina?.value, token: !!tok, taken: game.actors.get(host.id)?.getFlag(CR, "takenBy") ?? null});
    });

    await G.step("4 noticing", async () => {
      const before = game.messages.size;
      const r = await api(SN).perception.whoSees(tHider?.object ?? canvas.tokens?.get(tHider?.id) ?? tHider, {quiet: true, only: []});
      await new Promise(res => setTimeout(res, 500));
      const cards = [...game.messages].slice(before).filter(m => /Who sees/.test(m.content ?? "")).length;
      G.ok("4 noticing", !!r && Array.isArray(r.results) && r.results.length === 0 && cards === 0, {results: r?.results?.length ?? null, cards});
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally {
    if ( game.time.worldTime !== clock ) { try { await game.time.advance(clock - game.time.worldTime); } catch (e) { G.R.notes.push("clock"); } }
    return G.finish();
  }
}
