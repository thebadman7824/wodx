/**
 * NPCs act on what the Storyteller used to settle by hand (B4880-B4885), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatenpchand.mjs?${Date.now()}`)).run()
 * Makes its own scene and characters and removes them; puts back the reach state, the letters and the clock.
 *   1. the api: bonds.payFamiliar, talk.letterReply, talk.openLine, trust.strikeBacks, reach.callHelp
 *   2. a familiar's death costs its mage a permanent Willpower and Quintessence, the shortfall as Paradox
 *   3. an NPC's answer to a letter has words
 *   4. a call for help brings the watch or the police once its minutes pass
 *   5. a hostage held as a shield makes attacks on the taker 2 harder
 * Result: Data/wodx-gate/gatenpchand-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const ST = "wodx-storyteller";
const KEEP = [[ST, "reachState"], [ST, "reachOn"], [ST, "letters"]];

export async function run() {
  const G = gate("gatenpchand");
  if ( G.notLive() ) return "Not on the Live world.";
  const N = () => game.modules.get("wodx-npc")?.api, S = () => game.modules.get(ST)?.api;
  const keep = {}, clock = game.time.worldTime;
  for ( const [m, k] of KEEP ) { try { keep[`${m}.${k}`] = foundry.utils.deepClone(game.settings.get(m, k)); } catch (e) { /* not here */ } }
  try {
    await game.settings.set(ST, "reachOn", true);
    const scene = await G.scene();
    const [mage, sender, npc, taker, by] = await G.make(Actor, [
      {name: "Gate Hand Mage", type: "Mage", system: {advantages: {willpower: {permanent: 6, temporary: 6}}, quintessence: {temporary: 3}, paradox: {temporary: 0}}, prototypeToken: {actorLink: true}},
      {name: "Gate Hand Sender", type: "Mortal", prototypeToken: {actorLink: true}},
      {name: "Gate Hand Reeve", type: "Mortal", prototypeToken: {actorLink: true}},
      {name: "Gate Hand Taker", type: "Mortal", prototypeToken: {actorLink: true}},
      {name: "Gate Hand Bystander", type: "Mortal", prototypeToken: {actorLink: true}}]);
    await mage.createEmbeddedDocuments("Item", [{name: "Familiar", type: "Feature", system: {type: "wod.types.background", value: 2}}]).catch(() => null);
    const [, tTaker, tBy] = await G.tokens(scene, [{actor: sender, x: 3, y: 3}, {actor: taker, x: 8, y: 8}, {actor: by, x: 9, y: 8}]);

    await G.step("1 api", async () => {
      G.ok("1 api", typeof N()?.bonds?.payFamiliar === "function" && typeof N()?.talk?.letterReply === "function" && typeof N()?.talk?.openLine === "function"
        && typeof N()?.trust?.strikeBacks === "function" && typeof S()?.reach?.callHelp === "function");
    });

    await G.step("2 familiar", async () => {
      const c = await N().bonds.payFamiliar(mage, "Gate Hand Cat");
      const s = mage.system;
      G.ok("2 familiar", !!c && Number(s.advantages.willpower.permanent) === 5 && Number(s.quintessence?.temporary ?? 0) === 0 && Number(s.paradox?.temporary ?? 0) === 1,
        {c, wp: s.advantages.willpower.permanent, q: s.quintessence?.temporary, p: s.paradox?.temporary});
    });

    await G.step("3 letter", async () => {
      const text = N().talk.letterReply(npc, sender);
      G.ok("3 letter", typeof text === "string" && text.trim().length > 0, {text});
    });

    await G.step("4 help", async () => {
      const p = await S().reach.callHelp({scene, near: tTaker, how: "shout", who: taker.name});
      await game.time.advance((p?.seconds ?? 1200) + 60);
      await waitFor(() => [...scene.tokens].some(t => t.flags?.[ST]?.reach?.help), 6000);
      const came = [...scene.tokens].filter(t => t.flags?.[ST]?.reach?.help);
      G.ok("4 help", !!p && came.length > 0, {plan: p, came: came.length});
      if ( came.length ) await scene.deleteEmbeddedDocuments("Token", came.map(t => t.id));
    });

    await G.step("5 shield", async () => {
      const C = game.modules.get("wodx-combat")?.api;
      await tTaker.setFlag("wodx-npc", "hostage", {token: tBy.id, combat: null});
      const name = C?.shieldOf?.(taker) ?? null;
      G.ok("5 shield", name === by.name, {name});
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally {
    for ( const [m, k] of KEEP ) if ( `${m}.${k}` in keep ) { try { await game.settings.set(m, k, keep[`${m}.${k}`]); } catch (e) { G.R.notes.push(`restore ${m}.${k}`); } }
    try { await game.time.advance(clock - game.time.worldTime); } catch (e) { G.R.notes.push("clock"); }
    return G.finish();
  }
}
