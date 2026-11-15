/**
 * The night's work (B6220-B6229), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatenightwork.mjs?${Date.now()}`)).run()
 * Makes its own scene, characters and approval kind and removes them; puts back the clock, the NPC cap and the journal.
 *   1. the api: wodx-chronicle nightwork (begin, record, undo, list), the tool in the Storyteller's hand, wodx-solo's night asks
 *   2. a proposal approved on its own changes an actor, places a token, removes an item, changes a world setting and
 *      posts a card: all of it is one entry in the night's work, listed as approved on its own
 *   3. what the clock sets going is an entry of its own (time passed), and a token walked by hand after it is not
 *   4. a field the Storyteller changed by hand since is warned of in the list
 *   5. one Undo of both, newest first: the actor's fields go back except the one changed since (kept), the token leaves the
 *      map, the item is back on the sheet with its own id, the setting is back, the card has lost its buttons, the
 *      approval is marked taken back and a card says what was done
 *   6. the same Undo with "put it back anyway" overwrites the later change too (a fresh piece of work)
 * Result: Data/wodx-gate/gatenightwork-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const C = "wodx-chronicle";
const KIND = "gate-nightwork";
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run() {
  const G = gate("gatenightwork", {stepTimeout: 45000});
  if ( G.notLive() ) return "Not on the Live world.";
  const chron = game.modules.get(C)?.api;
  const nw = chron?.nightwork;
  const clock = game.time.worldTime;
  const capWas = game.settings.get(C, "npcCap");
  const autoWas = foundry.utils.deepClone(game.settings.get(C, "autoApprove") ?? {});
  const journalWas = foundry.utils.deepClone(game.settings.get(C, "nightWork"));
  const mine = new Set();
  try {
    const scene = await G.scene();
    const [hero, keeper] = await G.make(Actor, [
      {name: "Gate Night Hero", type: "Mortal", prototypeToken: {actorLink: true}, flags: {world: {gateNight: {hp: 7, xp: 0}}}},
      {name: "Gate Night Stranger", type: "Mortal", prototypeToken: {actorLink: true}}]);
    const [knife] = await hero.createEmbeddedDocuments("Item", [{name: "Gate Night Knife", type: "Item"}]);
    let placed = null;
    chron.registerApprovalHandler(KIND, {label: "Gate: the night's work", approve: async e => {
      await hero.update({"flags.world.gateNight.hp": 4, "flags.world.gateNight.xp": 3, "flags.world.gateNight.mark": "hunted"});
      const td = await keeper.getTokenDocument({x: 500, y: 500});
      [placed] = await scene.createEmbeddedDocuments("Token", [td.toObject()]);
      await hero.deleteEmbeddedDocuments("Item", [knife.id]);
      await game.settings.set(C, "npcCap", 17);
      await ChatMessage.create({whisper: game.users.filter(u => u.isGM).map(u => u.id), speaker: {alias: "Gate"},
        content: `<div class="wodx-card"><p>The stranger arrives.</p><button type="button" data-action="gate-x">Do a thing</button></div>`});
    }});

    await G.step("1 api", async () => {
      const tools = game.wodx?.storyteller?.hand?.tools ?? game.modules.get("wodx-storyteller")?.api?.hand?.tools ?? [];
      const solo = game.modules.get("wodx-solo");
      G.ok("1 api", ["begin", "end", "record", "undo", "list", "settle"].every(k => typeof nw?.[k] === "function")
        && (tools.length === 0 || tools.some(t => t.key === "nightWork"))
        && (!solo?.active || typeof solo.api?.st?.night === "function"), {tools: tools.map(t => t.key)});
    });

    let auto = null;
    await G.step("2 approval recorded", async () => {
      await game.settings.set(C, "autoApprove", {...autoWas, [KIND]: true});
      const route = await chron.approvals.addToQueue({id: foundry.utils.randomID(), type: KIND, key: null, title: "Gate: a stranger is sent", detail: "",
        data: {}, from: null, createdAt: Date.now(), worldTime: game.time.worldTime});
      await nw.settle();
      const j = game.settings.get(C, "nightWork");
      auto = (j.entries ?? []).find(e => e.label === "Gate: a stranger is sent");
      if ( auto ) mine.add(auto.id);
      const acts = (auto?.ops ?? []).map(o => o.act);
      G.ok("2 approval recorded", route === "auto" && auto?.kind === "auto" && !auto?.tooBig && ["update", "create", "delete", "setting", "card"].every(a => acts.includes(a)),
        {route, acts, kind: auto?.kind, tooBig: !!auto?.tooBig, left: auto?.left ?? 0, ops: auto?.ops?.length ?? 0,
          big: (auto?.ops ?? []).map(o => [o.act, o.doc, JSON.stringify(o).length]).sort((a, b) => b[2] - a[2]).slice(0, 3)});
    });

    let tick = null;
    await G.step("3 the clock", async () => {
      const before = (game.settings.get(C, "nightWork").entries ?? []).map(e => e.id);
      await game.time.advance(60);
      await sleep(300);
      await hero.update({"flags.world.gateNight.tired": true});
      const [walker] = await G.tokens(scene, [{actor: hero, x: 2, y: 2}]);
      await walker.update({x: 300});
      await sleep(4800);
      await nw.settle();
      const fresh = (game.settings.get(C, "nightWork").entries ?? []).filter(e => !before.includes(e.id));
      fresh.forEach(e => mine.add(e.id));
      tick = fresh.find(e => e.kind === "clock" && e.ops.some(o => o.uuid === hero.uuid));
      // The walk itself (x) is the Storyteller's; other modules answering the new token may still be the Hand's
      const walkOps = fresh.flatMap(e => e.ops.filter(o => o.uuid === walker.uuid && o.act === "update"));
      const walked = walkOps.some(o => "x" in (o.after ?? {}));
      G.ok("3 the clock", !!tick && !walked && !tick.tooBig, {kinds: fresh.map(e => e.kind), walked, tooBig: !!tick?.tooBig, ops: tick?.ops?.length ?? 0,
        walkPaths: walkOps.map(o => Object.keys(o.after ?? {}).join(",")).slice(0, 4)});
    });

    await G.step("4 changed since", async () => {
      await hero.update({"flags.world.gateNight.hp": 6});   // the Storyteller's own hand, no work open
      await sleep(200);
      const row = nw.list({since: "all"}).find(r => r.id === auto?.id);
      G.ok("4 changed since", (row?.warn ?? 0) >= 1 && row.lines.some(l => l.changed.includes("flags.world.gateNight.hp")), {warn: row?.warn});
    });

    await G.step("5 one undo", async () => {
      const cardMsg = [...game.messages].reverse().find(m => /The stranger arrives/.test(m.content ?? ""));
      const r = await nw.undo([auto.id, tick.id], {keep: true});
      await sleep(500);
      const h = game.actors.get(hero.id);
      const f = h.flags?.world?.gateNight ?? {};
      const tokenGone = !scene.tokens.get(placed?.id);
      const knifeBack = h.items.get(knife.id)?.name === "Gate Night Knife";
      const capBack = game.settings.get(C, "npcCap") === capWas;
      const cardNow = game.messages.get(cardMsg?.id)?.content ?? "";
      const approval = chron.approvals.history().find(e => e.title === "Gate: a stranger is sent");
      const undoCard = [...game.messages].reverse().find(m => m.flags?.[C]?.nightUndo?.includes?.(auto.id));
      G.ok("5 one undo", f.hp === 6 && f.xp === 0 && !("mark" in f) && !("tired" in f) && tokenGone && knifeBack && capBack
        && !/<button[^>]*gate-x/.test(cardNow) && /Taken back/.test(cardNow) && approval?.undone === true && !!undoCard
        && r?.ids?.length === 2 && nw.list({since: "all"}).find(x => x.id === auto.id)?.undone === true,
        {flags: f, tokenGone, knifeBack, capBack, approval: approval?.undone, text: r?.text, steps: r?.plan?.length ?? 0,
          actions: (r?.plan ?? []).slice(0, 8).map(s => `${s.op.act}:${s.action}${s.failed ? `:${s.failed}` : ""}`)});
    });

    await G.step("6 put back anyway", async () => {
      let id = null;
      await nw.record("Gate: overwrite", async () => { await hero.update({"flags.world.gateNight.hp": 1}); });
      await nw.settle();
      const e = (game.settings.get(C, "nightWork").entries ?? []).find(x => x.label === "Gate: overwrite");
      id = e?.id; if ( id ) mine.add(id);
      await hero.update({"flags.world.gateNight.hp": 9});
      await nw.undo([id], {keep: false});
      G.ok("6 put back anyway", game.actors.get(hero.id).flags.world.gateNight.hp === 6, {hp: game.actors.get(hero.id).flags.world.gateNight.hp});
    });
  } finally {
    await game.settings.set(C, "autoApprove", autoWas);
    await game.settings.set(C, "npcCap", capWas);
    if ( game.time.worldTime !== clock ) await game.time.advance(clock - game.time.worldTime);
    const out = await G.finish();
    await nw?.settle?.();
    // The gate's own entries leave the testbed's journal (and what cleaning up recorded after them)
    const j = game.settings.get(C, "nightWork");
    const had = new Set((journalWas?.entries ?? []).map(e => e.id));
    await game.settings.set(C, "nightWork", {...j, entries: (j.entries ?? []).filter(e => had.has(e.id) && !mine.has(e.id))});
    return out;
  }
}
