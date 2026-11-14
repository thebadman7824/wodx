/**
 * Features that act by themselves (B4874-B4878), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatefeatures.mjs?${Date.now()}`)).run()
 * Makes its own scene and characters and removes them; puts back the feature settings.
 *   1. the api: signatures.soakFor
 *   2. an Ahroun in Crinos soaks a die more against a creature of the Wyrm, and none against a mortal
 *   3. a Bunyip spirit coming onto the scene makes the Garou there roll, on a card
 * Result: Data/wodx-gate/gatefeatures-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-chronicle";
const KEEP = ["sigWerewolf", "sigAuto"];

export async function run() {
  const G = gate("gatefeatures");
  if ( G.notLive() ) return "Not on the Live world.";
  const S = () => game.modules.get(MOD)?.api?.signatures;
  const keep = {};
  for ( const k of KEEP ) { try { keep[k] = game.settings.get(MOD, k); } catch (e) { /* not here */ } }
  try {
    for ( const k of KEEP ) await game.settings.set(MOD, k, true);
    const scene = await G.scene();
    const [ahroun, dancer, mortal] = await G.make(Actor, [
      {name: "Gate Features Ahroun", type: "Werewolf", system: {auspice: "Ahroun", shapes: {crinos: {isactive: true}}}, prototypeToken: {actorLink: true}},
      {name: "Gate Black Spiral Dancer", type: "Werewolf", system: {tribe: "Black Spiral Dancers"}, prototypeToken: {actorLink: true}},
      {name: "Gate Features Mortal", type: "Mortal", prototypeToken: {actorLink: true}}]);
    await G.tokens(scene, [{actor: ahroun, x: 3, y: 3}, {actor: dancer, x: 4, y: 3}]);

    await G.step("1 api", async () => { G.ok("1 api", typeof S()?.soakFor === "function"); });

    await G.step("2 the Ahroun's soak", async () => {
      // Crinos set the way WoDX Actions sets it (the sheet may make a new Garou in Homid)
      const shapes = foundry.utils.deepClone(ahroun.system.shapes ?? {});
      for ( const k of Object.keys(shapes) ) if ( shapes[k] && typeof shapes[k] === "object" ) shapes[k].isactive = k === "crinos";
      if ( !shapes.crinos ) shapes.crinos = {isactive: true};
      await ahroun.update({"system.shapes": shapes, "system.auspice": "Ahroun"});
      await dancer.update({"system.tribe": "Black Spiral Dancers"});
      const vsWyrm = S().soakFor(ahroun, {attacker: dancer}), vsMortal = S().soakFor(ahroun, {attacker: mortal});
      G.ok("2 the Ahroun's soak", vsWyrm.dice >= 1 && vsWyrm.names.includes("First into battle") && vsMortal.dice === 0, {vsWyrm, vsMortal,
        rows: S().allRowsOf(ahroun).map(r => r.key), foeRows: S().allRowsOf(dancer).map(r => r.key), auspice: ahroun.system.auspice, tribe: dancer.system.tribe,
        crinos: !!ahroun.system.shapes?.crinos?.isactive, line: game.settings.get(MOD, "sigWerewolf")});
    });

    await G.step("3 the Bunyip", async () => {
      const before = game.messages.size;
      const [spirit] = await G.make(Actor, [{name: "Gate Bunyip spirit", type: "Mortal", prototypeToken: {actorLink: true}}]);
      await G.tokens(scene, [{actor: spirit, x: 8, y: 8}]);
      const ok = await waitFor(() => [...game.messages].slice(before).some(m => /War of Tears/.test(m.content ?? "")), 5000);
      G.ok("3 the Bunyip", !!ok, {cards: game.messages.size - before});
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally {
    for ( const k of KEEP ) if ( k in keep ) { try { await game.settings.set(MOD, k, keep[k]); } catch (e) { G.R.notes.push(`restore ${k}`); } }
    return G.finish();
  }
}
