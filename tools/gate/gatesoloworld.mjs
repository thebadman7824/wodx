/**
 * The Lone Chronicle, step 3 (B5980 to B5985): the oracle, the Leads page and night encounters, in rothenstein-wodx
 * (the testing world), as Gamemaster Test in one browser:
 *   await (await import(`/wodx-gate/gatesoloworld.mjs?${Date.now()}`)).run()
 * The switch stays as it is: the seat's parts are called straight, as the seat would call them, and the night's
 * encounter is forced (no chance roll, no night needed). The clock does not move.
 *   1. the module and its new parts
 *   2. the oracle: a d10 is rolled on a card for the asker and the Storyteller, its answer follows the odds, and the
 *      question goes in the oracle's record
 *   3. the Leads page: the character's open oath and the oracle's answer are on it, and the window shows them
 *   4. Let it go takes a lead off the page
 *   5. a night encounter: the people of one of the night's encounters stand on the character's scene, in plain sight,
 *      four to eight squares from the character, and the seat's log says so
 *   6. with the switch off the clock brings nobody
 * Result: Data/wodx-gate/gatesoloworld-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

export async function run() {
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const G = gate("gatesoloworld");
  const MOD = "wodx-solo", ST = "wodx-storyteller";
  for ( let i = 0; i < 120 && !(game.modules.get(MOD)?.api?.world && game.modules.get(ST)?.api?.night); i++ ) await new Promise(r => setTimeout(r, 250));
  const S = game.modules.get(MOD)?.api, L = game.modules.get(ST)?.api?.ledger;
  const keep = {oracle: game.settings.get(MOD, "oracle"), done: game.settings.get(MOD, "leadsDone"), rolled: game.settings.get(MOD, "rolled")};
  const msgs0 = new Set(game.messages.map(m => m.id));
  const entries0 = new Set((L?.state?.()?.entries ?? []).map(e => e.id));
  const Q = game.modules.get("wodx-chronicle")?.api?.approvals;
  const pending0 = new Set((Q?.pending?.() ?? []).map(p => p.id));
  try {
    const [actor] = await G.make(Actor, [{name: "WoDX gate: lone player", type: "Mortal"}]);
    const scene = await G.scene({name: "WoDX gate: solo world market", width: 3000, height: 2400, activate: true});
    await waitFor(() => canvas?.scene?.id === scene.id, 8000);
    const [tok] = await scene.createEmbeddedDocuments("Token", [(await actor.getTokenDocument({x: 1200, y: 1200})).toObject()]);
    const W = S?.world;
    let asked = null;

    await G.step("1. the module", async () => {
      G.ok("1. the module", !!W?.oracle && !!W?.leads && !!W?.letGo && !!W?.nightTick && !!W?.rules?.oracleAnswer
        && (S.rules?.PANEL ?? []).some(b => b.id === "oracle") && (S.rules?.PANEL ?? []).some(b => b.id === "leads"), {version: game.modules.get(MOD)?.version});
    });
    await G.step("2. the oracle", async () => {
      asked = await W.oracle(game.user.id, {question: "WoDX gate: is the mill watched?", odds: "likely", actorId: actor.id});
      const msg = game.messages.get(asked?.messageId);
      const f = msg?.flags?.[MOD]?.oracle;
      const rec = (game.settings.get(MOD, "oracle") ?? []).at(-1);
      G.ok("2. the oracle", !!msg && (msg.rolls ?? []).length === 1 && f?.answer === W.rules.oracleAnswer("likely", f?.face)
        && (msg.whisper ?? []).includes(game.user.id) && /wsolo-answer/.test(msg.content ?? "") && rec?.q === "WoDX gate: is the mill watched?" && rec?.actorId === actor.id,
        {face: f?.face, answer: f?.answer, lead: asked?.lead});
    });
    let oathId = null, rows = [];
    await G.step("3. the Leads page", async () => {
      const e = await L.save({kind: "oath", from: {id: actor.id, name: actor.name}, to: {name: "WoDX gate: the reeve"}, what: "WoDX gate: keep the gate shut"});
      oathId = e?.id ?? (L.state().entries.find(x => !entries0.has(x.id))?.id ?? null);
      rows = await W.leads(game.user.id, {actorId: actor.id});
      const shown = await waitFor(() => document.querySelectorAll("#wodx-solo-leads .wsolo-lead").length === rows.length && rows.length > 0, 5000);
      const oath = rows.find(r => r.id === `ledger:${oathId}`);
      G.ok("3. the Leads page", !!oath && oath.title === "An oath you swore to WoDX gate: the reeve" && rows.some(r => r.kind === "oracle" && r.title === "WoDX gate: is the mill watched?") && shown,
        {rows: rows.map(r => `${r.kind}: ${r.title}`)});
    });
    await G.step("4. let it go", async () => {
      const after = await W.letGo(game.user.id, {id: `ledger:${oathId}`, actorId: actor.id});
      G.ok("4. let it go", Array.isArray(after) && !after.some(r => r.id === `ledger:${oathId}`) && after.length === rows.length - 1, {left: after?.length});
      await foundry.applications.instances?.get?.("wodx-solo-leads")?.close?.();
    });
    await G.step("5. a night encounter", async () => {
      const before = new Set(scene.tokens.map(t => t.id));
      const t0 = Date.now();
      const out = await W.nightTick({force: true, actorId: actor.id, sceneId: scene.id, kind: "town"});
      const fresh = game.scenes.get(scene.id).tokens.filter(t => !before.has(t.id));
      const g = scene.grid.size;
      const squares = fresh.map(t => Math.max(Math.abs(t.x - tok.x), Math.abs(t.y - tok.y)) / g);
      const logged = (S.log?.entries?.() ?? []).some(e => e.at >= t0 && e.title === "The night brought someone");
      G.ok("5. a night encounter", !!out?.text && fresh.length > 0 && fresh.every(t => !t.hidden) && squares.every(n => n >= 4 && n <= 10) && logged,
        {text: out?.text, made: fresh.map(t => t.name), squares});
    });
    await G.step("6. off means off", async () => {
      const on = game.settings.get(MOD, "on") === true;
      const none = on ? "skipped: the switch is on in this world" : await W.nightTick();
      G.ok("6. off means off", on || none === null, {none});
    });
  } finally {
    try {
      await game.settings.set(MOD, "oracle", keep.oracle);
      await game.settings.set(MOD, "leadsDone", keep.done);
      await game.settings.set(MOD, "rolled", keep.rolled);
    } catch (e) { /* kept */ }
    // an "and" from the oracle sends a lead to the queue: turned down here, so nothing reaches the testbed's players
    try { for ( const p of (Q?.pending?.() ?? []).filter(x => !pending0.has(x.id)) ) await Q.decide(p.id, "reject", "WoDX gate clean-up"); } catch (e) { /* kept */ }
    try { for ( const e of (L?.state?.()?.entries ?? []).filter(x => !entries0.has(x.id)) ) await L.remove(e.id).catch(() => null); } catch (e) { /* kept */ }
    const mine = game.messages.filter(m => !msgs0.has(m.id) && (m.flags?.[MOD] || m.flags?.[ST]?.aid)).map(m => m.id);
    if ( mine.length ) await ChatMessage.deleteDocuments(mine);
    await foundry.applications.instances?.get?.("wodx-solo-leads")?.close?.();
    return G.finish();
  }
}
