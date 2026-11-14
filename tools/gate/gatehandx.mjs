/**
 * The Storyteller's Hand in WoDX Actions (B4869-B4873), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatehandx.mjs?${Date.now()}`)).run()
 * Makes its own scene and characters and removes them; puts back the hunts, the settings it touches and the
 * Masquerade journal's pages.
 *   1. the api: witnessStep, autoHunts, liftHunt
 *   2. a mummy seen by a weak-willed mortal: the Veil makes the witness fall still (Immobilized), and it forgets
 *   3. a strong-willed mortal keeps it: on the Masquerade record, and knows the kind
 *   4. a botched frenzy ends when its fight is over (rolled off, or flagged to roll each turn)
 *   5. the court hunts a Storyteller's diablerist at a faction turn, and the hunt can be lifted
 * Result: Data/wodx-gate/gatehandx-result.json.
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-actions";
const KEEP = [[MOD, "bloodHunts"], [MOD, "autoWitness"], [MOD, "autoBloodHunt"]];

export async function run() {
  const G = gate("gatehandx");
  if ( G.notLive() ) return "Not on the Live world.";
  const X = () => game.modules.get(MOD)?.api;
  const keep = {};
  for ( const [m, k] of KEEP ) { try { keep[`${m}.${k}`] = foundry.utils.deepClone(game.settings.get(m, k)); } catch (e) { /* not here */ } }
  const masqJ = game.journal.getName("WoDX Masquerade");
  const pages = masqJ ? masqJ.pages.map(p => ({_id: p.id, "text.content": p.text?.content ?? ""})) : null;
  try {
    for ( const k of ["autoWitness", "autoBloodHunt"] ) { try { await game.settings.set(MOD, k, true); } catch (e) { /* not here */ } }
    const scene = await G.scene();
    const [mummy, weak, strong, vamp, dia] = await G.make(Actor, [
      {name: "Gate Hand Mummy", type: "Mortal", prototypeToken: {actorLink: true}},
      {name: "Gate Hand Weak Witness", type: "Mortal", system: {advantages: {willpower: {permanent: 1, temporary: 1}}}, prototypeToken: {actorLink: true}},
      {name: "Gate Hand Steady Witness", type: "Mortal", system: {advantages: {willpower: {permanent: 8, temporary: 8}}}, prototypeToken: {actorLink: true}},
      {name: "Gate Hand Frenzied", type: "Vampire", prototypeToken: {actorLink: true}},
      {name: "Gate Hand Diablerist", type: "Vampire", prototypeToken: {actorLink: true}}]);
    await X().setKind(mummy, "mummy");
    await X().setKind(dia, "kindred");
    await X().setKind(vamp, "kindred");
    const [tm, tw, ts, tv] = await G.tokens(scene, [{actor: mummy, x: 3, y: 3}, {actor: weak, x: 5, y: 3}, {actor: strong, x: 5, y: 5}, {actor: vamp, x: 9, y: 9}]);

    await G.step("1 api", async () => {
      G.ok("1 api", ["witnessStep", "autoHunts", "liftHunt"].every(k => typeof X()?.[k] === "function"));
    });

    await G.step("2 the Veil freezes", async () => {
      const r = await X().witnessStep({actor: mummy, tokens: [tw], secret: "mummy", event: "the gate"});
      const frozen = weak.effects.some(e => e.statuses?.has?.("wodx-immobilized") || /frozen/i.test(e.name));
      G.ok("2 the Veil freezes", frozen && r?.kept?.length === 0, {frozen, kept: r?.kept?.length ?? null});
    });

    await G.step("3 the steady one remembers", async () => {
      const before = (X().masqEntries?.() ?? []).length;
      const r = await X().witnessStep({actor: mummy, tokens: [ts], secret: "mummy", event: "the gate"});
      const knows = strong.flags?.world?.wodx?.knows ?? [];
      const recs = game.journal.getName("WoDX Masquerade")?.pages?.getName?.("All records")?.text?.content ?? "";
      G.ok("3 the steady one remembers", r?.kept?.length === 1 && Array.isArray(knows) && knows.includes("mummy") && recs.includes("Gate Hand Steady Witness"), {knows, kept: r?.kept?.length ?? null, before});
    });

    await G.step("4 a botched frenzy ends with its fight", async () => {
      await vamp.update({"system.conditions.isfrenzy": true});
      const combat = await Combat.create({scene: scene.id, active: false});
      await combat.createEmbeddedDocuments("Combatant", [{tokenId: tv.id, sceneId: scene.id, actorId: vamp.id}]);
      await vamp.setFlag(MOD, "frenzyBotch", {scene: scene.id, combat: combat.id, fear: false, diff: 6, over: false, last: 0});
      await combat.delete();
      await new Promise(r => setTimeout(r, 1500));
      const b = vamp.getFlag(MOD, "frenzyBotch");
      const ended = !vamp.system?.conditions?.isfrenzy;
      G.ok("4 a botched frenzy ends with its fight", ended || b?.over === true, {ended, over: b?.over ?? null});
    });

    await G.step("5 the court hunts", async () => {
      await dia.setFlag(MOD, "diablerieMarks", [{at: game.time.worldTime + 1, victim: "an elder", years: 1, months: 1}]);
      await dia.unsetFlag(MOD, "huntLooked");
      const out = await X().autoHunts();
      const h = (game.settings.get(MOD, "bloodHunts") ?? []).find(x => x.active && x.targetId === dia.id);
      if ( h ) await X().liftHunt(h.id);
      const lifted = !(game.settings.get(MOD, "bloodHunts") ?? []).some(x => x.active && x.targetId === dia.id);
      G.ok("5 the court hunts", !!h && lifted && out.some(o => o.target === dia.id), {hunt: !!h, lifted});
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally {
    for ( const [m, k] of KEEP ) if ( `${m}.${k}` in keep ) { try { await game.settings.set(m, k, keep[`${m}.${k}`]); } catch (e) { G.R.notes.push(`restore ${m}.${k}`); } }
    if ( masqJ && pages ) { try { await masqJ.updateEmbeddedDocuments("JournalEntryPage", pages); } catch (e) { G.R.notes.push("masquerade pages"); } }
    return G.finish();
  }
}
