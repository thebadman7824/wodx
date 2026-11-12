/**
 * Topic menu gate (WoDX NPC 0.10.0), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatetalk.mjs?${Date.now()}`)).run()
 * Makes its own scene "WoDX gate: Talk" (gridded, 100 px), an NPC with a talk sheet, a player character owned by a
 * player user, a journal page and their tokens; views the scene, then goes back and deletes everything it made
 * (the chat cards, the character's codex, the shared sheet it wrote).
 *   1. the api, the toolbar button and the settings are there
 *   2. the menu: greeting, offered topics, unknown topics left off, the local four
 *   3. an unknown topic is refused
 *   4. an offered topic is answered with the sheet's line and teaches a topic; the card is whispered
 *   5. the taught topic can now be asked, and its line gives a journal page to the codex
 *   6. a local topic with no line gets the none line; the shared sheet for everyone answers directions
 *   7. too far away: refused
 *   8. the window opens for a targeted NPC and a topic button answers in it; with nobody targeted it opens for the nearest
 *   9. Undo on the Storyteller's card takes back what was taught
 *  10. stock talk: a stranger with no sheet greets and answers work; passes on a rumour it heard; off means silence
 *  11. more stock talk (0.14.0): a child's voice, a remembered visit, Goodbye, trade lines for Actions, a cry of alarm
 *  12. every other WoDX module still answers
 * Result: Data/wodx-gate/gatetalk-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const G = 100;
const MOD = "wodx-npc";
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { if ( fn() ) return true; await sleep(100); } return !!fn(); }

const SHEET = `[greet] Nods without looking up from the ledger.
[none] Shrugs and goes back to work.
[offer] the mill
[the mill] Says the miller pays in flour, not coin. | teach the night porter
[the night porter] Names the night porter at the abbey gate. | codex WoDX gate: Talk page
[the abbot] Crosses themself.`;

// Foundry 14 may hand back a batch of new actors out of order: match each one to its data by name
const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const back = canvas.scene;
  const talk = () => game.modules.get(MOD)?.api?.talk;
  const sharedBefore = foundry.utils.deepClone(game.settings.get(MOD, "sharedTalk") ?? {});
  const t0 = Date.now();
  let scene, actors = [], journal, npcTok, meTok;
  try {
    const player = game.users.find(u => !u.isGM);
    if ( !player ) R.notes.push("No player user in this world: the character has no player owner, so some steps fail.");
    scene = await Scene.create({name: "WoDX gate: Talk", width: 2000, height: 1500, padding: 0, grid: {type: 1, size: G}, tokenVision: false});
    await scene.view();
    await until(() => canvas.ready && canvas.scene?.id === scene.id, 10000);
    const own = player ? {default: 0, [player.id]: 3} : {default: 0};
    actors = await createActors([{name: "WoDX gate: Talk NPC", type: "Mortal", flags: {[MOD]: {behavior: {talk: SHEET}}}},
      {name: "WoDX gate: Talk PC", type: "Mortal", ownership: own}]);
    journal = await JournalEntry.create({name: "WoDX gate: Talk page", pages: [{name: "WoDX gate: Talk page", type: "text", text: {content: "<p>A gate page.</p>"}}]});
    await scene.createEmbeddedDocuments("Token", [{name: "npc", actorId: actors[0].id, x: G * 5, y: G * 5}, {name: "pc", actorId: actors[1].id, actorLink: true, x: G * 6, y: G * 5}]);
    npcTok = scene.tokens.find(t => t.actorId === actors[0].id); meTok = scene.tokens.find(t => t.actorId === actors[1].id);
    await until(() => npcTok.object && meTok.object);
    const pc = () => game.actors.get(actors[1].id);
    const req = (extra = {}) => ({sceneId: scene.id, npcTokenId: npcTok.id, meTokenId: meTok.id, ...extra});
    const asUser = player?.id ?? game.user.id;

    await step("api, button and settings", async () => {
      const ctl = ui.controls?.controls?.tokens?.tools ?? ui.controls?.controls?.token?.tools ?? {};
      ok("api, button and settings", typeof talk()?.openTalk === "function" && !!ctl.wodxTalk && ctl.wodxTalk.visible === true
        && game.settings.get(MOD, "talkMenu") === true && Number(game.settings.get(MOD, "talkReach")) >= 1, {button: !!ctl.wodxTalk});
    });
    await step("the menu", async () => {
      const r = await talk().serve("menu", req(), asUser);
      ok("the menu", r.ok && r.menu.greet.startsWith("Nods") && r.menu.ask.join() === "the mill" && r.menu.local.length === 4, {menu: r.menu, why: r.why});
    });
    await step("an unknown topic is refused", async () => {
      const r = await talk().serve("ask", req({topic: "the abbot"}), asUser);
      ok("an unknown topic is refused", !r.ok, {why: r.why});
    });
    await step("an offered topic teaches", async () => {
      const r = await talk().serve("ask", req({topic: "the mill"}), asUser);
      const msg = game.messages.contents.filter(m => m.flags?.[MOD]?.talk && m.timestamp >= t0).at(-1);
      ok("an offered topic teaches", r.ok && /flour/.test(r.said) && r.taught?.join() === "the night porter" && (pc().flags?.[MOD]?.topics ?? []).includes("the night porter")
        && r.menu.ask.includes("the night porter") && (msg?.whisper?.length ?? 0) > 0, {r, whisper: msg?.whisper, topics: pc().flags?.[MOD]?.topics, tokenTopics: meTok.actor?.flags?.[MOD]?.topics});
    });
    await step("a taught topic gives a codex page", async () => {
      const r = await talk().serve("ask", req({topic: "The Night Porter"}), asUser);
      await until(() => game.journal.find(j => j.flags?.["wodx-storyteller"]?.codex === actors[1].id)?.pages?.size > 0);
      const codex = game.journal.find(j => j.flags?.["wodx-storyteller"]?.codex === actors[1].id);
      const st = game.modules.get("wodx-storyteller")?.active;
      ok("a taught topic gives a codex page", r.ok && /night porter/.test(r.said) && (!st || [...(codex?.pages ?? [])].some(p => p.name === "WoDX gate: Talk page")),
        {said: r.said, storyteller: st, pages: [...(codex?.pages ?? [])].map(p => p.name)});
    });
    await step("none line and shared sheet", async () => {
      await game.settings.set(MOD, "sharedTalk", {...sharedBefore, everyone: "[directions] Points down the Linberg road."});
      const a = await talk().serve("ask", req({topic: "news"}), asUser);
      const b = await talk().serve("ask", req({topic: "directions"}), asUser);
      ok("none line and shared sheet", a.ok && /Shrugs/.test(a.said) && b.ok && /Linberg/.test(b.said), {news: a.said, directions: b.said});
    });
    await step("too far away", async () => {
      await meTok.update({x: G * 15, y: G * 12});
      const moved = await until(() => meTok.x === G * 15 && meTok.y === G * 12);
      const at = [meTok.x, meTok.y];
      const r = await talk().serve("menu", req(), asUser);
      await meTok.update({x: G * 6, y: G * 5});
      await until(() => meTok.x === G * 6 && meTok.y === G * 5);
      ok("too far away", !r.ok && /closer/i.test(r.why ?? ""), {why: r.why, ok: r.ok, moved, at, reach: game.settings.get(MOD, "talkReach")});
    });
    await step("the window", async () => {
      canvas.tokens.releaseAll();
      meTok.object.control({releaseOthers: true});
      npcTok.object.setTarget(true, {releaseOthers: true});
      await talk().openTalk();
      const found = await until(() => !!document.querySelector(".wnpc-talk-window .wnpc-talk button.wnpc-topic[data-topic='the mill']"));
      const el = document.querySelector(".wnpc-talk-window");
      el?.querySelector("button.wnpc-topic[data-topic='the mill']")?.click();
      const said = await until(() => /flour/.test(document.querySelector(".wnpc-talk-window .wnpc-talk-log")?.textContent ?? ""));
      const greet = el?.querySelector(".wnpc-talk-greet")?.textContent ?? "";
      el?.querySelector("button[data-action=close]")?.click();
      npcTok.object.setTarget(false);
      ok("the window", found && said && greet.startsWith("Nods"), {found, said, greet});
    });
    await step("nobody targeted: the nearest in reach", async () => {
      await until(() => !document.querySelector(".wnpc-talk-window"));
      canvas.tokens.releaseAll();
      meTok.object.control({releaseOthers: true});
      for ( const t of [...game.user.targets] ) t.setTarget(false, {releaseOthers: false});
      const m = await talk().openTalk();
      const found = await until(() => !!document.querySelector(".wnpc-talk-window .wnpc-talk-greet"));
      document.querySelector(".wnpc-talk-window button[data-action=close]")?.click();
      ok("nobody targeted: the nearest in reach", found && m?.greet?.startsWith("Nods"), {found, menu: m?.name});
    });
    await step("undo what was taught", async () => {
      await pc().update({[`flags.${MOD}.topics`]: []});
      await talk().serve("ask", req({topic: "the mill"}), asUser);
      const msg = game.messages.contents.filter(m => m.flags?.[MOD]?.talk?.taught?.length && m.timestamp >= t0).at(-1);
      ui.chat?.scrollBottom?.();
      await until(() => !!document.querySelector(`#chat [data-message-id="${msg?.id}"] button.wnpc-talk-undo, .chat-log [data-message-id="${msg?.id}"] button.wnpc-talk-undo`), 4000);
      document.querySelector(`[data-message-id="${msg?.id}"] button.wnpc-talk-undo`)?.click();
      const gone = await until(() => !(pc().flags?.[MOD]?.topics ?? []).includes("the night porter"));
      ok("undo what was taught", !!msg && gone, {topics: pc().flags?.[MOD]?.topics});
    });
    await step("stock talk: greeting, work, a rumour from the network, and off", async () => {
      const [stranger] = await Actor.create([{name: "WoDX gate: Talk stranger", type: "Mortal"}]);
      actors.push(stranger);
      await scene.createEmbeddedDocuments("Token", [{name: "stranger", actorId: stranger.id, x: G * 6, y: G * 6}]);
      const sTok = scene.tokens.find(t => t.actorId === stranger.id);
      const sreq = {sceneId: scene.id, npcTokenId: sTok.id, meTokenId: meTok.id};
      const stockBefore = game.settings.get(MOD, "stockTalk");
      await game.settings.set(MOD, "stockTalk", true);
      const m = await talk().serve("menu", sreq, asUser);
      const w = await talk().serve("ask", {...sreq, topic: "work"}, asUser);
      const st = game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api : null;
      let rum = null, r = null;
      if ( st?.rumours?.start ) {
        rum = await st.rumours.start({text: "WoDX gate rumour: the ferry runs at midnight.", tellers: [stranger.id]});
        r = await talk().serve("ask", {...sreq, topic: "rumours"}, asUser);
      }
      await game.settings.set(MOD, "stockTalk", false);
      const off = await talk().serve("ask", {...sreq, topic: "work"}, asUser);
      await game.settings.set(MOD, "stockTalk", stockBefore);
      if ( rum ) await st.rumours.remove(rum.id);
      const heard = pc().flags?.[MOD]?.heard ?? [];
      ok("stock talk: greeting, work, a rumour from the network, and off", m.ok && /^".+"$/.test(m.menu.greet) && w.ok && /^".+"$/.test(w.said)
        && (!st || (/ferry runs at midnight/.test(r?.said ?? "") && heard.includes(rum.id))) && off.ok && !off.said,
        {greet: m.menu.greet, work: w.said, rumour: r?.said, heard: heard.length, off: off.said});
    });
    await step("more stock talk: a voice, remembering, goodbye, trade lines and a cry", async () => {
      const L = talk().lines;
      const [kid] = await Actor.create([{name: "WoDX gate: Talk child", type: "Mortal", flags: {[MOD]: {behavior: {voice: "child"}}}}]);
      actors.push(kid);
      await scene.createEmbeddedDocuments("Token", [{name: "child", actorId: kid.id, x: G * 7, y: G * 5}]);
      const kTok = scene.tokens.find(t => t.actorId === kid.id);
      const kreq = {sceneId: scene.id, npcTokenId: kTok.id, meTokenId: meTok.id};
      const stockBefore = game.settings.get(MOD, "stockTalk");
      await game.settings.set(MOD, "stockTalk", true);
      const kidLines = Object.values(L.VOICES.child.greet).flat();
      const first = await talk().serve("menu", kreq, asUser);
      const second = await talk().serve("menu", kreq, asUser);
      const bye = await talk().serve("bye", kreq, asUser);
      const trade = talk().stock("trade:open", {npc: kTok, pc: meTok});
      const cry = await talk().bark(kTok, "cry:alarm", {force: true});
      await game.settings.set(MOD, "stockTalk", stockBefore);
      const soon = Object.values(L.REMEMBER.soon).flat();
      const bye1 = Object.values(L.FAREWELL).flatMap(e => Object.values(e).flat());
      ok("more stock talk: a voice, remembering, goodbye, trade lines and a cry", first.ok && kidLines.some(l => first.menu.greet.startsWith(l))
        && soon.some(l => second.menu.greet.startsWith(l)) && bye.ok && bye1.includes(bye.said)
        && Object.values(L.TRADE.open).flat().includes(trade) && Object.values(L.CRY_ALARM).flat().includes(cry)
        && typeof game.actors.get(kid.id).flags?.[MOD]?.talked?.[actors[1].id] === "number",
        {first: first.menu?.greet, second: second.menu?.greet, bye: bye.said, trade, cry});
    });
    await step("talk generator (NPC 0.37.0): stock lines from the grammar, children keep their own, rumours carried, off as before", async () => {
      const L = talk().lines;
      const gen = await Actor.create({name: "WoDX gate: Talk generated", type: "Mortal"});
      const kid2 = await Actor.create({name: "WoDX gate: Talk generated child", type: "Mortal", flags: {[MOD]: {behavior: {voice: "child"}}}});
      actors.push(gen, kid2);
      await scene.createEmbeddedDocuments("Token", [{name: "gen", actorId: gen.id, x: G * 8, y: G * 6}, {name: "kid2", actorId: kid2.id, x: G * 8, y: G * 4}]);
      const gTok = scene.tokens.find(t => t.actorId === gen.id), cTok = scene.tokens.find(t => t.actorId === kid2.id);
      const greq = {sceneId: scene.id, npcTokenId: gTok.id, meTokenId: meTok.id}, creq = {sceneId: scene.id, npcTokenId: cTok.id, meTokenId: meTok.id};
      const stockBefore = game.settings.get(MOD, "stockTalk"), genBefore = game.settings.get(MOD, "talkGrammar");
      await game.settings.set(MOD, "stockTalk", true);
      await game.settings.set(MOD, "talkGrammar", true);
      const said = [];
      const m = await talk().serve("menu", greq, asUser);
      said.push(m.menu?.greet ?? "");
      for ( const topic of ["work", "news", "directions", "work", "news", "directions", "work", "news"] ) said.push((await talk().serve("ask", {...greq, topic}, asUser)).said ?? "");
      const k = await talk().serve("menu", creq, asUser);
      const st = game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api : null;
      let rum = null, r = null;
      if ( st?.rumours?.start ) {
        rum = await st.rumours.start({text: "WoDX gate rumour: the bridge toll is lifted.", tellers: [gen.id]});
        r = await talk().serve("ask", {...greq, topic: "rumours"}, asUser);
      }
      await game.settings.set(MOD, "talkGrammar", false);
      const off = await talk().serve("ask", {...greq, topic: "work"}, asUser);
      const S0 = talk().stockLines ?? {}, pool = Object.values(S0.WORK ?? {}).flat().concat(Object.values(S0.NONE ?? {}).flat());
      await game.settings.set(MOD, "talkGrammar", genBefore);
      await game.settings.set(MOD, "stockTalk", stockBefore);
      if ( rum ) await st.rumours.remove(rum.id);
      const kidLines = Object.values(L.VOICES.child.greet).flat();
      const clean = said.every(l => /^".+"/.test(l) && !/#\w|\{\w+\}/.test(l));
      ok("talk generator (NPC 0.37.0): stock lines from the grammar, children keep their own, rumours carried, off as before",
        clean && kidLines.some(l => (k.menu?.greet ?? "").startsWith(l)) && (!st || /bridge toll is lifted/.test(r?.said ?? ""))
        && off.ok && (!pool.length || pool.includes(off.said)),
        {said, kid: k.menu?.greet, rumour: r?.said, off: off.said});
    });
    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-otherworlds", "wodx-storyteller"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      await game.settings.set(MOD, "sharedTalk", sharedBefore);
      if ( back && back.id !== scene?.id ) await back.view();
      if ( scene ) await scene.delete();
      const msgs = game.messages.contents.filter(m => m.timestamp >= t0 && (m.flags?.[MOD]?.talk || m.flags?.[MOD]?.talkAsk || m.flags?.[MOD]?.bark || /WoDX gate: Talk/.test(m.content ?? "")));
      if ( msgs.length ) await ChatMessage.deleteDocuments(msgs.map(m => m.id));
      for ( const j of game.journal.filter(j => j.id === journal?.id || actors.some(a => j.flags?.["wodx-storyteller"]?.codex === a.id)) ) await j.delete();
      for ( const x of actors ) await game.actors.get(x.id)?.delete();
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatetalk-result.json");
}
