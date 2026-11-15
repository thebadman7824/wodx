/**
 * The Lone Chronicle, step 4 (B6045 to B6049): the director, experience from the night's log and the recap, in
 * rothenstein-wodx (the testing world), as Gamemaster Test in one browser:
 *   await (await import(`/wodx-gate/gatesolodirector.mjs?${Date.now()}`)).run()
 * The switch stays as it is: the seat's parts are called straight, as the seat would call them. The clock does not move.
 *   1. the module and its new parts
 *   2. the director: an open oath and a clock the players see are among what it brings; each comes as a card that is
 *      on the Leads page, and the clock moves a step
 *   3. I am stuck: one light thing, now
 *   4. experience: a night with a first visit and an encounter in the log gets the line's points on the sheet, as an
 *      Experience item, at most 5
 *   5. the recap: the night's travel and the director's things, on a card for the player, once
 *   6. with the switch off the director stays quiet
 * Result: Data/wodx-gate/gatesolodirector-result.json.
 */
import {gate} from "./kit.mjs";

export async function run() {
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const G = gate("gatesolodirector");
  const MOD = "wodx-solo", ST = "wodx-storyteller";
  for ( let i = 0; i < 120 && !(game.modules.get(MOD)?.api?.director && game.modules.get(ST)?.api?.clocks); i++ ) await new Promise(r => setTimeout(r, 250));
  const S = game.modules.get(MOD)?.api, T = game.modules.get(ST)?.api;
  const Dr = S?.director, L = T?.ledger;
  const keys = ["directed", "brought", "awarded", "recapped"];
  const keep = Object.fromEntries(keys.map(k => [k, game.settings.get(MOD, k)]));
  const msgs0 = new Set(game.messages.map(m => m.id));
  const entries0 = new Set((L?.state?.()?.entries ?? []).map(e => e.id));
  const Q = game.modules.get("wodx-chronicle")?.api?.approvals;
  const pending0 = new Set((Q?.pending?.() ?? []).map(p => p.id));
  const clockId = `wodxgate${Date.now().toString(36)}`;
  let actor = null;
  try {
    [actor] = await G.make(Actor, [{name: "WoDX gate: lone director", type: "Mortal"}]);
    const scene = await G.scene({name: "WoDX gate: solo director market", width: 3000, height: 2400, activate: true});
    await scene.createEmbeddedDocuments("Token", [(await actor.getTokenDocument({x: 1200, y: 1200})).toObject()]);
    const night = Dr?.rules?.nightOf?.(game.time.worldTime);

    await G.step("1. the module", async () => {
      G.ok("1. the module", !!Dr?.direct && !!Dr?.award && !!Dr?.recap && !!Dr?.rules?.pickThings
        && game.settings.settings.has(`${MOD}.director`) && game.settings.settings.has(`${MOD}.nightXp`), {version: game.modules.get(MOD)?.version});
    });
    let brought = [];
    await G.step("2. the director", async () => {
      await L.save({kind: "oath", from: {id: actor.id, name: actor.name}, to: {name: "WoDX gate: the reeve"}, what: "WoDX gate: keep the gate shut"});
      await T.clocks.save({id: clockId, name: "WoDX gate: the flood", segments: 6, filled: 2, shown: true});
      const out = await Dr.direct({actorId: actor.id, force: true, count: 6});
      brought = out?.brought ?? [];
      const oath = brought.find(b => b.title === "An oath to WoDX gate: the reeve");
      const clock = brought.find(b => b.kind === "clock" && b.clockId === clockId);
      const moved = T.clocks.list().find(c => c.id === clockId)?.filled;
      const rows = await S.world.leads(game.user.id, {actorId: actor.id, send: false});
      const onLeads = rows.some(r => r.kind === "aid" && r.title === "An oath to WoDX gate: the reeve");
      G.ok("2. the director", !!oath && !!clock && moved === 3 && onLeads, {temper: out?.temper, brought: brought.map(b => `${b.kind}: ${b.title}`), moved});
    });
    await G.step("3. I am stuck", async () => {
      const out = await Dr.direct({actorId: actor.id, force: true, count: 1, light: true});
      G.ok("3. I am stuck", out?.brought?.length === 1 && !out.brought[0].heavy, {brought: out?.brought?.map(b => b.title)});
    });
    await G.step("4. experience", async () => {
      await T.log({kind: "travel", actor: actor.id, name: actor.name, place: "WoDX gate: a town never seen", text: "To WoDX gate: a town never seen"});
      await T.log({kind: "encounter", actor: actor.id, name: actor.name, text: "WoDX gate: two drunks on the road"});
      const before = actor.items.filter(i => i.type === "Experience").length;
      const out = await Dr.award({actorId: actor.id, night, force: true});
      const items = game.actors.get(actor.id).items.filter(i => i.type === "Experience");
      const got = items.length - before;
      G.ok("4. experience", out?.points >= 3 && out.points <= 5 && got === 1 && items.at(-1)?.system?.amount === out.points && out.ticks.includes("there") && out.ticks.includes("danger"),
        {points: out?.points, ticks: out?.ticks, why: out?.deeds?.why});
    });
    await G.step("5. the recap", async () => {
      const rows = await Dr.recap(game.user.id, {force: true, night, actorId: actor.id});
      const card = game.messages.filter(m => !msgs0.has(m.id) && m.flags?.[MOD]?.panel).some(m => /Last night/.test(m.content ?? "") && /a town never seen/.test(m.content ?? ""));
      const texts = (rows ?? []).map(r => r.text);
      G.ok("5. the recap", texts.some(t => /a town never seen/.test(t)) && texts.some(t => /WoDX gate: the reeve/.test(t)) && card, {rows: texts});
    });
    await G.step("6. off means off", async () => {
      const on = game.settings.get(MOD, "on") === true;
      const none = on ? "skipped: the switch is on in this world" : await Dr.direct();
      G.ok("6. off means off", on || none === null, {none});
    });
  } finally {
    for ( const k of keys ) { try { await game.settings.set(MOD, k, keep[k]); } catch (e) { /* kept */ } }
    try { await T.clocks.remove(clockId); } catch (e) { /* kept */ }
    try { for ( const p of (Q?.pending?.() ?? []).filter(x => !pending0.has(x.id)) ) await Q.decide(p.id, "reject", "WoDX gate clean-up"); } catch (e) { /* kept */ }
    try { for ( const e of (L?.state?.()?.entries ?? []).filter(x => !entries0.has(x.id)) ) await L.remove(e.id).catch(() => null); } catch (e) { /* kept */ }
    try {
      const j = game.journal.find(x => x.getFlag?.("wodx-creation", "kind") === "xp-log");
      const page = actor ? j?.pages?.find(p => p.getFlag?.("wodx-creation", "actorId") === actor.id) : null;
      if ( page ) await page.delete();
    } catch (e) { /* kept */ }
    const mine = game.messages.filter(m => !msgs0.has(m.id) && (m.flags?.[MOD] || m.flags?.[ST] || /WoDX gate: lone director/.test(m.content ?? ""))).map(m => m.id);
    if ( mine.length ) await ChatMessage.deleteDocuments(mine);
    return G.finish();
  }
}
