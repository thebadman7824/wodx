/**
 * Ben's notes gaps g1, g2, g3, g5, g6 (B3520-B3539), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gategaps.mjs?${Date.now()}`)).run()
 * Makes actors "WoDX gate gaps: ..." and deletes them, every chat card and queue card it made, after.
 * The clock does not move; leverState and hunterState are put back.
 *   1. the APIs are there (ticket, roster, levers, inheritance, binding card)
 *   2. a ruling ticket goes to the queue with the pool from the sheet, and never applies on its own
 *   3. a crisis lever on a region is logged, read back, and undone to where it was
 *   4. a binding card is whispered to the bound character's owner and puts nothing on the token
 *   5. My characters lists the player's characters with the right tie, and Away changes the state
 *   6. the Inheritance step moves items and ties to the heir
 *   7. a death on the sheet queues one Inheritance card
 *   8. every other WoDX module still answers
 * Result: Data/wodx-gate/gategaps-result.json.
 */
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const ch = () => game.modules.get("wodx-chronicle")?.api;
  const st = () => game.modules.get("wodx-storyteller")?.api;
  const ac = () => game.modules.get("wodx-actions")?.api;
  const ST = "wodx-storyteller";
  const actors = [], msgsBefore = new Set(game.messages.map(m => m.id));
  const queueBefore = new Set((ch()?.approvals?.pending?.() ?? []).map(p => p.id));
  const t0 = game.time.worldTime;
  const lever0 = foundry.utils.deepClone(game.settings.get(ST, "leverState") ?? {});
  const hunt0 = foundry.utils.deepClone(game.settings.get(ST, "hunterState") ?? {});
  const player = game.users.find(u => !u.isGM);
  const OWNER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  const own = player ? {[player.id]: OWNER} : {};
  try {
    const made = await Actor.create([
      {name: "WoDX gate gaps: Player", type: "Mortal", ownership: own, system: {attributes: {dexterity: {value: 3}}, abilities: {athletics: {value: 2}}}},
      {name: "WoDX gate gaps: Ghoul", type: "Mortal", ownership: own, flags: {"wodx-creation": {ghoul: true}}},
      {name: "WoDX gate gaps: Dead", type: "Mortal"},
      {name: "WoDX gate gaps: Heir", type: "Mortal"},
      {name: "WoDX gate gaps: Dying", type: "Mortal"}]);
    actors.push(...made);
    const [pc, ghoul, dead, heir, dying] = made;
    R.notes.push({player: player?.name ?? null, versions: Object.fromEntries(["wodx-chronicle", "wodx-storyteller", "wodx-actions"].map(id => [id, game.modules.get(id)?.version]))});

    await step("1 the APIs are there", async () => {
      const have = {ticket: typeof ch()?.ticket?.build === "function", roster: typeof ch()?.roster?.of === "function",
        levers: typeof st()?.levers?.set === "function", inheritance: typeof st()?.inheritance?.inherit === "function",
        binding: typeof ac()?.effects?.bindingCard === "function"};
      ok("1 the APIs are there", Object.values(have).every(Boolean), have);
    });

    await step("2 a ruling ticket waits in the queue", async () => {
      const e = await ch().ticket.build({actorId: pc.id, text: "WoDX gate gaps: leap the gap between roofs", attr: "dexterity", ability: "athletics", difficulty: 7});
      await sleep(200);
      const p = (ch().approvals.pending() ?? []).find(x => x.type === "ticket" && x.data?.actorId === pc.id);
      const never = ch().approvals.rules?.NEVER_AUTO ?? null;
      ok("2 a ruling ticket waits in the queue", !!p && Number(p.data?.pool) > 0 && (!never || never.includes("ticket")),
        {queued: !!p, pool: p?.data?.pool, difficulty: p?.data?.difficulty, risks: p?.data?.risks?.length, returned: !!e});
    });

    await step("3 a crisis lever is logged and undone", async () => {
      const region = "wodx-gate-nowhere";
      const before = st().levers.readings(region).gauntlet;
      const list = await st().levers.set(region, {gauntlet: String(before + 2)}, "WoDX gate gaps");
      const mid = st().levers.readings(region).gauntlet;
      const undone = await st().levers.undo(region);
      const after = st().levers.readings(region).gauntlet;
      ok("3 a crisis lever is logged and undone", list.length === 1 && mid === before + 2 && !!undone && after === before, {before, mid, after, n: list.length});
    });

    await step("4 a binding card is whispered, nothing on the token", async () => {
      if ( !player ) { ok("4 a binding card is whispered, nothing on the token", false, {why: "no player user in this world to own the bound character"}); return; }
      const effects0 = pc.effects.size;
      const m = await ac().effects.bindingCard({key: "fear", out: {label: "WoDX gate dread"}}, "WoDX gate caster", {actor: pc});
      await sleep(200);
      ok("4 a binding card is whispered, nothing on the token", !!m && /is bound/.test(m.content ?? "") && m.whisper?.includes(player.id) && pc.effects.size === effects0,
        {made: !!m, whisper: m?.whisper?.length, effects: pc.effects.size - effects0});
    });

    await step("5 My characters shows ties and Away", async () => {
      if ( !player ) { ok("5 My characters shows ties and Away", false, {why: "no player user"}); return; }
      const list = () => ch().roster.of(player);
      const g = list().find(r => r.id === ghoul.id);
      await ch().roster.setAway(ghoul.id, true);
      const g2 = list().find(r => r.id === ghoul.id);
      await ch().roster.setAway(ghoul.id, false);
      const g3 = list().find(r => r.id === ghoul.id);
      ok("5 My characters shows ties and Away", g?.tie === "ghoul" && g?.state === "awake" && g2?.state === "away" && !g2?.playable && g3?.state === "awake" && list().some(r => r.id === pc.id),
        {tie: g?.tie, states: [g?.state, g2?.state, g3?.state]});
    });

    await step("6 the Inheritance step moves items and ties", async () => {
      await dead.createEmbeddedDocuments("Item", [{name: "WoDX gate gaps: signet", type: "Item"}]);
      await dead.setFlag("wodx-sheets", "ties", [{uuid: ghoul.uuid, role: "Ally", note: "an old friend"}]);
      const done = await st().inheritance.inherit(dead, heir, {items: true, ties: true});
      const got = heir.items.some(i => i.name === "WoDX gate gaps: signet"), left = dead.items.some(i => i.name === "WoDX gate gaps: signet");
      const ties = heir.flags?.["wodx-sheets"]?.ties ?? [];
      ok("6 the Inheritance step moves items and ties", done?.items === 1 && got && !left && ties.some(t => t.uuid === ghoul.uuid && /Known through/.test(t.note)),
        {done, got, left, ties: ties.length});
    });

    await step("7 a death queues one Inheritance card", async () => {
      await dying.update({"flags.wodx-creation.chronology.died": Number(ch()?.eras?.currentYear?.()) || 1500});
      let cards = [];
      for ( let i = 0; i < 20 && !cards.length; i++ ) { await sleep(250); cards = (ch().approvals.pending() ?? []).filter(p => p.type === `${ST}.inheritance` && p.data?.dead === dying.id); }
      ok("7 a death queues one Inheritance card", cards.length === 1, {n: cards.length});
    });

    await step("8 every other WoDX module still answers", async () => {
      const ids = ["wodx-chronicle", "wodx-storyteller", "wodx-npc", "wodx-creation", "wodx-actions", "wodx-combat", "wodx-interactables", "wodx-senses", "wodx-atmosphere", "wodx-otherworlds", "wodx-library", "wodx-sheets"];
      const missing = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("8 every other WoDX module still answers", !missing.length, {missing});
    });
  } catch (e) {
    R.errors.push(String(e?.stack ?? e));
  } finally {
    try { for ( const p of ch()?.approvals?.pending?.() ?? [] ) if ( !queueBefore.has(p.id) ) await ch().approvals.decide(p.id, "reject", "WoDX gate gaps cleanup"); } catch (e) { R.errors.push(`cleanup queue: ${e.message}`); }
    try { const mine = game.messages.filter(m => !msgsBefore.has(m.id)).map(m => m.id); if ( mine.length ) await ChatMessage.deleteDocuments(mine); } catch (e) { R.errors.push(`cleanup messages: ${e.message}`); }
    try { await game.settings.set(ST, "leverState", lever0); await game.settings.set(ST, "hunterState", hunt0); } catch (e) { R.errors.push(`restore settings: ${e.message}`); }
    try { if ( actors.length ) await Actor.deleteDocuments(actors.filter(Boolean).map(a => a.id)); } catch (e) { R.errors.push(`cleanup actors: ${e.message}`); }
    if ( game.paused ) R.notes.push("the game is paused (a ruling ticket pauses it when the house rule is on)");
    if ( game.time.worldTime !== t0 ) R.errors.push("the clock moved");
  }
  return save(R, "gategaps-result.json");
}
