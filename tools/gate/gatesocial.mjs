/**
 * "With this person" gate (WoDX Actions 3.20.0, NPC 0.11.0, Chronicle 0.15.0), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatesocial.mjs?${Date.now()}`)).run()
 * Makes its own scene "WoDX gate: Social", an NPC and a character with their tokens; views the scene, then goes back
 * and deletes everything it made (tokens, actors, chat cards).
 *   1. the APIs are there: withPerson and social in Actions, attitude in NPC, "attitude" and "persuaded" tests in Chronicle
 *   2. a first meeting is Unknown; the Storyteller sets it to Welcome and the log starts
 *   3. a persuasion with a big pool wins: a public card, a blind whisper to the Storyteller with the NPC's roll,
 *      a "persuaded" note on the character; the attitude stays (persuading moves nothing)
 *   4. Chronicle: "persuaded" and "attitude >= welcome" pass for this NPC, fail for no NPC
 *   5. an open threat wins: "intimidated", and the attitude drops a step
 *   6. the window opens for the targeted NPC
 *   7. every other WoDX module still answers
 *   8. a lift with a big pool takes the NPC's pocket-sized ring unseen (Actions 3.21.0); the sack of grain is never offered
 *   9. deleting on an unlinked token (diagnostic)
 *  10. buying a good from the NPC and selling it back moves the item and the money both ways (Actions 3.34.0)
 * Result: Data/wodx-gate/gatesocial-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const G = 100;
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { if ( fn() ) return true; await sleep(100); } return !!fn(); }

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const back = canvas.scene;
  const A = () => game.wodxActions, N = () => game.modules.get("wodx-npc")?.api, W = () => game.modules.get("wodx-chronicle")?.api?.when;
  const t0 = Date.now();
  let scene, actors = [], npcTok, meTok;
  const fd = {bonus: 20, extraDiff: 0, specialty: false, wp: false, aura: false, offer: "fair", offerText: ""};
  try {
    scene = await Scene.create({name: "WoDX gate: Social", width: 2000, height: 1500, padding: 0, grid: {type: 1, size: G}, tokenVision: false});
    await scene.view();
    await until(() => canvas.ready && canvas.scene?.id === scene.id, 10000);
    actors = await Actor.create([{name: "WoDX gate: Social NPC", type: "Mortal"}, {name: "WoDX gate: Social PC", type: "Mortal"}]);
    const npcA = actors.find(a => a.name === "WoDX gate: Social NPC"), pcA = actors.find(a => a.name === "WoDX gate: Social PC");
    await scene.createEmbeddedDocuments("Token", [{name: "npc", actorId: npcA.id, x: G * 5, y: G * 5}, {name: "pc", actorId: pcA.id, actorLink: true, x: G * 6, y: G * 5}]);
    npcTok = scene.tokens.find(t => t.actorId === npcA.id); meTok = scene.tokens.find(t => t.actorId === pcA.id);
    await until(() => npcTok.object && meTok.object);
    const npc = () => game.actors.get(npcA.id), pc = () => game.actors.get(pcA.id);

    await step("1 the APIs", async () => {
      ok("1 the APIs", typeof A()?.withPerson === "function" && typeof A()?.social === "function" && typeof N()?.attitude?.of === "function"
        && W()?.check?.("attitude >= welcome", {}).problems?.length === 0 && W()?.check?.("persuaded by someone", {}).problems?.length === 0,
        {actions: A()?.version, npc: N()?.version});
    });
    await step("2 first meeting", async () => {
      const first = N().attitude.of(npc(), pc());
      await N().attitude.apply(npc(), pc(), {to: 2, why: "gate"});
      const now = N().attitude.of(npc(), pc());
      const log = npc().flags?.["wodx-npc"]?.attitude?.[pc().id]?.log ?? [];
      ok("2 first meeting", first.step === 0 && !first.met && now.step === 2 && now.met && log.length === 2, {first, now, log: log.length});
    });
    await step("3 persuade", async () => {
      const res = await A().social(pc(), npcTok.object, "persuade", fd);
      await sleep(300);
      const msgs = game.messages.filter(m => m.timestamp >= t0);
      const pub = msgs.find(m => !m.whisper?.length && /persuade/i.test(m.content));
      const blind = msgs.find(m => m.whisper?.length && m.blind && /resists/.test(m.content));
      const sways = pc().flags?.["wodx-actions"]?.sways ?? [];
      ok("3 persuade", res?.result === "win" && !!pub && !!blind && sways.some(s => s.kind === "persuaded" && s.npc === npc().id) && N().attitude.of(npc(), pc()).step === 2,
        {res, pub: !!pub, blind: !!blind, sways});
    });
    await step("4 Chronicle tests", async () => {
      const a = W().check("persuaded", {actor: pc(), npc: npc()}).ok, b = W().check("attitude >= welcome", {actor: pc(), npc: npc()}).ok;
      const c = W().check("persuaded", {actor: pc()}).ok, d = W().check("persuaded by WoDX gate: Social NPC", {actor: pc()}).ok;
      ok("4 Chronicle tests", a && b && !c && d, {a, b, c, d});
    });
    await step("5 threaten", async () => {
      const res = await A().social(pc(), npcTok.object, "threaten", fd);
      const sways = pc().flags?.["wodx-actions"]?.sways ?? [];
      ok("5 threaten", res?.result === "win" && sways.some(s => s.kind === "intimidated") && N().attitude.of(npc(), pc()).step === 1, {res, step: N().attitude.of(npc(), pc()).step});
    });
    await step("6 window", async () => {
      npcTok.object.setTarget(true, {releaseOthers: true});
      meTok.object.control({releaseOthers: true});
      const p = A().withPerson({actor: pc()});
      const open = await until(() => [...document.querySelectorAll(".wodx-with-person")].length > 0, 4000);
      const el = document.querySelector(".wodx-with-person");
      const buttons = el ? el.querySelectorAll(".wodx-wp-act").length : 0;
      const app = el?.closest(".application, .app");
      app?.querySelector("[data-action=cancel], [data-action=close], button.close, .header-button.close")?.click();
      await Promise.race([p, sleep(1500)]);
      npcTok.object.setTarget(false);
      ok("6 window", open && buttons >= 9, {open, buttons});
    });
    await step("7 other modules", async () => {
      const off = game.modules.filter(m => m.id.startsWith("wodx-") && m.active && !m.api && !["wodx-library"].includes(m.id)).map(m => m.id);
      ok("7 other modules", !!game.wodxCombat && !!game.modules.get("wodx-chronicle")?.api && off.length === 0, {off});
    });
    await step("8 lift", async () => {
      // The NPC token is unlinked: the lift takes from that token's own actor, not the world actor
      await npcTok.actor.createEmbeddedDocuments("Item", [{name: "WoDX gate ring", type: "Item", flags: {"wodx-sheets": {conceal: "P"}}}, {name: "WoDX gate sack", type: "Item", flags: {"wodx-sheets": {conceal: "N"}}}]);
      const ring = npcTok.actor.items.find(i => i.name === "WoDX gate ring");
      const warns = [], w0 = console.warn, e0 = console.error;
      console.warn = (...a) => { warns.push(a.map(String).join(" ")); w0(...a); };
      console.error = (...a) => { warns.push(a.map(String).join(" ")); e0(...a); };
      let res;
      try { res = await A().lift(pc(), npcTok.object, "lift", {...fd, want: ring.id}); } finally { console.warn = w0; console.error = e0; }
      R.notes.push({liftWarns: warns.slice(0, 10)});
      await sleep(300);
      const got = pc().items.some(i => i.name === "WoDX gate ring"), left = npcTok.actor.items.some(i => i.name === "WoDX gate ring"), sack = npcTok.actor.items.some(i => i.name === "WoDX gate sack");
      ok("8 lift", res?.done && !res.noticed && got && !left && sack, {res, got, left, sack, isToken: npcTok.actor?.isToken, ringId: ring?.id, ringParent: ring?.parent?.uuid, items: npcTok.actor.items.map(i => i.name)});
    });
    await step("9 delete on an unlinked token (diagnostic)", async () => {
      const ta = npcTok.actor;
      const [m1] = await ta.createEmbeddedDocuments("Item", [{name: "WoDX gate diag 1", type: "Item"}]);
      const via = fromUuidSync(npcTok.uuid)?.actor;
      const same = via === ta;
      let e1 = null; try { await via.deleteEmbeddedDocuments("Item", [m1.id]); } catch (e) { e1 = e.message; }
      const gone1 = !npcTok.actor.items.get(m1.id);
      const [m2] = await npcTok.actor.createEmbeddedDocuments("Item", [{name: "WoDX gate diag 2", type: "Item"}]);
      let e2 = null; try { await npcTok.actor.items.get(m2.id).delete(); } catch (e) { e2 = e.message; }
      const gone2 = !npcTok.actor.items.get(m2.id);
      const ringNow = npcTok.actor.items.find(i => i.name === "WoDX gate ring");
      let e3 = null; if ( ringNow ) { try { await ringNow.delete(); } catch (e) { e3 = e.message; } }
      const gone3 = !npcTok.actor.items.some(i => i.name === "WoDX gate ring");
      ok("9 delete on an unlinked token (diagnostic)", gone1 && gone2, {same, viaUuid: via?.uuid, e1, gone1, e2, gone2, ringFlags: ringNow?.flags, e3, gone3, delta: Object.keys(npcTok.delta?.toObject?.()?.items ?? {}).length});
    });
    await step("10 trade", async () => {
      const M = game.modules.get("wodx-storyteller")?.api?.upkeep?.money;
      if ( !M?.priceSync || !A().trade ) { ok("10 trade", false, {why: "WoDX Storyteller money or Actions trade missing"}); return; }
      await M.findGood("");
      const G = (await import("/modules/wodx-library/data/goods.mjs")).GOODS ?? [];
      const g = G.find(x => M.priceSync(x.name)?.each > 0);
      await M.receive(pc(), 1000000, {note: "gate"}); await M.receive(npcTok.actor, 1000000, {note: "gate"});
      const [it] = await npcTok.actor.createEmbeddedDocuments("Item", [{name: g.name, type: "Item"}]);
      const cash = a => { const p = M.purse(a); return (p.carried ?? 0) + (p.bank ?? 0); };
      const pc0 = cash(pc()), npc0 = cash(npcTok.actor);
      const tf = {bonus: 0, extraDiff: 0, specialty: false, wp: false, haggle: false, count: 1};
      const buy = await A().trade(pc(), npcTok.object, "buy", {...tf, mode: "buy", want: `i${it.id}`, give: ""});
      await sleep(300);
      const mine = pc().items.find(i => i.name === g.name);
      const bought = buy?.done && !!mine && !npcTok.actor.items.get(it.id) && cash(pc()) === pc0 - buy.owe && cash(npcTok.actor) === npc0 + buy.owe;
      const sell = mine ? await A().trade(pc(), npcTok.object, "sell", {...tf, mode: "sell", want: "", give: mine.id}) : null;
      await sleep(300);
      const sold = sell?.done && !pc().items.some(i => i.name === g.name) && npcTok.actor.items.some(i => i.name === g.name) && sell.owe < 0;
      ok("10 trade", bought && sold, {good: g?.name, buy, sell, bought, sold, pc: cash(pc()) - pc0, npc: cash(npcTok.actor) - npc0});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      if ( back && back.id !== scene?.id ) await back.view();
      if ( scene ) await scene.delete();
      const msgs = game.messages.filter(m => m.timestamp >= t0);
      if ( msgs.length ) await ChatMessage.deleteDocuments(msgs.map(m => m.id));
      for ( const x of actors ) await game.actors.get(x.id)?.delete();
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatesocial-result.json");
}
