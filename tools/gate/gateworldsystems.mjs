/**
 * The eight player world systems (B3340-B3378), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateworldsystems.mjs?${Date.now()}`)).run()
 * It keeps every setting it touches, makes its own actors, scene and case board, and puts everything back at the end.
 * The clock never moves: turns are run by hand.
 *   1. the modules and their apis (Storyteller tasks, institutions, haven works, omens, patronage; NPC memory;
 *      Interactables investigation)
 *   2. downtime projects: the weekly budget, and goals set by an upgrade and by a commission's form
 *   3. NPC memory: two insults make a grudge; a forced season turn puts a grudge move in the queue
 *   4. tales: a deed becomes a tale about the character, seen in the character's view
 *   5. institutions: a town gets its institutions, with seats
 *   6. haven works: an upgrade put in adds security and leaves traces; the Works window opens
 *   7. investigation: evidence left at a scene is listed; a theory tested with 3 successes says how many lines hold
 *   8. omens: signals read without error, the grudge among them; a reading names who
 *   9. patronage: an artist is added; a finished commission makes a work item on the patron and keeps the artist
 *  10. the windows: Institutions, Artists and patrons, Theories, Evidence here
 *  11. clean up
 * Result: Data/wodx-gate/gateworldsystems-result.json.
 */
const ST = "wodx-storyteller", NPC = "wodx-npc", IX = "wodx-interactables";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STEPS = 11;

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${STEPS} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateworldsystems-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

/** Open a window without waiting on it, read what it shows, then close it. */
async function peek(open, cls) {
  const p = open();
  await sleep(700);
  const app = [...(foundry.applications.instances?.values?.() ?? [])].find(a => a.options?.classes?.includes?.(cls));
  const html = app?.element?.innerHTML ?? "";
  await app?.close?.();
  await Promise.race([p, sleep(500)]);
  return html;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const S = game.modules.get(ST)?.api, N = game.modules.get(NPC)?.api, X = game.modules.get(IX)?.api, C = game.modules.get("wodx-chronicle")?.api;
  const has = k => game.settings.settings.has(k);
  const KEEP = [[ST, "markets"], [ST, "rumours"], [ST, "tales"], [ST, "institutionState"], [ST, "institutions"], [ST, "havenWorks"], [ST, "havenTurn"], [ST, "omens"], [ST, "omenState"],
    [ST, "patronage"], [ST, "artistState"], [NPC, "memory"], [NPC, "memoryTurn"], [IX, "evidence"], [IX, "evidenceOn"], [IX, "caseBoard"]].filter(([m, k]) => has(`${m}.${k}`));
  const keep = KEEP.map(([m, k]) => [m, k, foundry.utils.deepClone(game.settings.get(m, k))]);
  const msgsBefore = new Set(game.messages.map(m => m.id));
  const pendingBefore = new Set((C?.approvals?.pending?.() ?? []).map(p => p.id));
  const scenes = [], actors = [], journals = [];
  const pending = () => (C?.approvals?.pending?.() ?? []).filter(p => !pendingBefore.has(p.id));
  const player = game.users.find(u => !u.isGM);
  try {
    const I = S?.upkeep?.institutions, W = S?.havenWorks, O = S?.omens, PA = S?.patronage, MEM = N?.memory, INQ = X?.caseBoard?.inquiry;
    ok("1. modules", !!(S?.tasks?.projects && I?.reconcile && W?.install && O?.signals && PA?.add && MEM?.remember && INQ?.leave && S?.rumours?.tale),
      {storyteller: game.modules.get(ST)?.version, npc: game.modules.get(NPC)?.version, interactables: game.modules.get(IX)?.version, player: !!player});
    for ( const [m, k, v] of [[ST, "tales", true], [ST, "institutions", true], [ST, "havenWorks", true], [ST, "omens", true], [ST, "patronage", true], [NPC, "memory", true], [IX, "evidenceOn", true]] )
      if ( has(`${m}.${k}`) ) await game.settings.set(m, k, v);

    const own = player ? {default: 0, [player.id]: 3} : {default: 0};
    const pc = await Actor.create({name: "WoDX gate: patron", type: "Vampire", ownership: own});
    const rival = await Actor.create({name: "WoDX gate: rival", type: "Mortal", ownership: {default: 0}});
    actors.push(pc, rival);
    const scene = await Scene.create({name: "WoDX gate: world systems", width: 800, height: 600, padding: 0});
    scenes.push(scene);

    // 2. Projects
    const budget = S.tasks.budget?.(pc);
    await S.havens.save(scene, {name: "The gate house", owners: [pc.id]});
    const tUp = await game.modules.get(ST).api.tasks.save?.(pc, {kind: "upgrade", name: "A wall", haven: scene.id, upgrade: "wall", nights: 2})
      ?? null;
    const tCo = await game.modules.get(ST).api.tasks.save?.(pc, {kind: "commission", name: "The patron", form: "portrait", nights: 1});
    ok("2. downtime projects", budget === 6 && (!tUp || tUp.goal === 8) && (!tCo || tCo.goal === 6), {budget, upgradeGoal: tUp?.goal, commissionGoal: tCo?.goal, saveApi: !!S.tasks.save});

    // 3. Memory
    await MEM.remember(rival, pc, {kind: "insult", weight: -3, text: "laughed at in front of the guild"});
    await MEM.remember(rival, pc, {kind: "insult", weight: -3, text: "laughed at again"});
    const bal = MEM.balance(rival, pc);
    await MEM.turn({force: true});
    await sleep(400);
    const grudgeP = pending().find(p => p.type === `${NPC}.grudge`);
    ok("3. NPC memory", bal.grudge >= 5 && !!grudgeP, {grudge: bal.grudge, temper: bal.temper, proposed: grudgeP?.title ?? null});

    // 4. Tales
    await S.rumours.tale({about: pc.id, did: "pulled a child from the river", tone: 2, crowd: true, tellers: [rival.id]});
    const tale = (S.rumours.list?.() ?? []).find(r => r.about === pc.id && r.tale);
    const view = S.rumours.aboutView?.(pc.id) ?? [];
    ok("4. tales", !!tale && view.length > 0, {text: tale?.text ?? null, communities: view.length});

    // 5. Institutions
    // A market of its own on the gate scene, so a freshly reset world with no markets still has a town
    const mk = S.upkeep.markets.state();
    await game.settings.set(ST, "markets", {...mk, markets: [...(mk.markets ?? []), {id: "gate-wsys", name: "WoDX gate town", scenes: [scene.id], links: []}]});
    await I.reconcile();
    const list = I.ofTown("gate-wsys");
    ok("5. institutions", list.length > 0 && list.every(i => Array.isArray(i.seats)), {count: list.length, kinds: [...new Set(list.map(i => i.kind))]});

    // 6. Haven works
    const before = S.havens.of(scene)?.security ?? 0;
    await W.install(scene, "door");
    const h = S.havens.of(scene);
    const tr = W.rules.tracesNow(h, game.time.worldTime);
    const ww = await peek(() => W.open(scene.id), "wst-haven-works");
    ok("6. haven works", (h?.security ?? 0) === before + 1 && h.upgrades.some(u => u.key === "door") && tr.some(t => t.key === "builders") && /What it leaves/.test(ww),
      {security: h?.security, traces: tr, window: ww.length});

    // 7. Investigation
    await INQ.leave({kinds: ["blood", "tracks"], scene, by: rival, text: "A gate test."});
    const ev = INQ.evidence().filter(e => e.scene === scene.id);
    const j = await X.caseBoard.newBoard("WoDX gate");
    journals.push(j);
    const CR = X.caseBoard.rules;
    await X.caseBoard.change(j, b => {
      let x = CR.addCard(b, {kind: "note", title: "Gate A"}).board;
      x = CR.addCard(x, {kind: "note", title: "Gate B"}).board;
      const [a, bb] = x.cards.filter(c => c.title.startsWith("Gate ")).map(c => c.id);
      x = CR.link(x, a, bb, "knows");
      const l = x.links.at(-1);
      return {...x, theories: [{id: "t1", who: "Gate A", rests: [l.id]}], truth: [INQ.rules.keyOf(a, bb)]};
    });
    const said = await INQ.judge(j.id, "t1", 3, pc.id);
    ok("7. investigation", ev.length === 2 && /^1 of the 1 line it rests on holds up\.$/.test(said ?? ""), {evidence: ev.map(e => e.kind), said});

    // 8. Omens
    const sig = O.signals();
    const g = sig.find(s => s.kind === "grudge" && s.about === pc.id);
    ok("8. omens", Array.isArray(sig) && !!g && /WoDX gate: rival/.test(O.rules.reading({kind: "grudge", who: g?.who}, 3)), {signals: sig.length, grudge: !!g});

    // 9. Patronage
    const art = await PA.add({name: "WoDX gate: painter", skill: 3});
    Hooks.callAll("wodxTaskDone", {actor: pc, task: {id: "gate", kind: "commission", status: "done", name: "Gate", artist: art.id, form: "portrait", money: 2}});
    await sleep(1200);
    const work = game.actors.get(pc.id).items.find(i => i.flags?.[ST]?.work);
    const kept = PA.byId(art.id);
    ok("9. patronage", !!work && kept?.patron === pc.id && kept.works === 1, {item: work?.name ?? null, quality: work?.flags?.[ST]?.work?.quality, patron: kept?.patron});

    // 10. Windows
    const iw = await peek(() => I.open(), "wst-institutions");
    const aw = await peek(() => PA.open(), "wst-artists");
    const tw = await peek(() => INQ.theories(j), "wix-theories");
    const ew = await peek(() => INQ.evidenceDialog(scene), "wix-evidence");
    ok("10. the windows", iw.length > 0 && /In fashion/.test(aw) && /Test it/.test(tw) && /Blood/.test(ew), {institutions: iw.length, artists: aw.length, theories: tw.length, evidence: ew.length});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      for ( const [m, k, v] of keep ) await game.settings.set(m, k, v);
      for ( const p of pending() ) if ( /^wodx-(storyteller|npc|interactables)\./.test(String(p.type)) ) await C.approvals.decide(p.id, "reject");
      const mine = game.messages.contents.filter(m => !msgsBefore.has(m.id)).map(m => m.id);
      if ( mine.length ) await ChatMessage.deleteDocuments(mine);
      for ( const x of journals ) await game.journal.get(x?.id)?.delete();
      for ( const s of scenes ) await game.scenes.get(s.id)?.delete();
      for ( const x of actors ) await game.actors.get(x.id)?.delete();
      ok("11. clean up", scenes.every(s => !game.scenes.get(s.id)) && actors.every(x => !game.actors.get(x.id)) && journals.every(x => !game.journal.get(x?.id)));
    } catch (err) { ok("11. clean up", false, {error: err.message}); }
  }
  return save(R);
}
