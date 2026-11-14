/**
 * Threads of Fate (WoDX Storyteller, B3650-B3656), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatefate.mjs?${Date.now()}`)).run()
 * It keeps every setting it touches and puts them back, makes one character of its own, and removes the journals,
 * clocks, rumours and chat cards it made. The clock never moves.
 *   1. the modules: api.signals and api.threads, and their settings
 *   2. the hooks other systems send post signals to the board (a town, a cult, an arrest, a saga step)
 *   3. the omens system reads the same board
 *   4. the weave proposes a storyline to the approval queue, and its signals are marked used
 *   5. approving it opens it: a page in the Threads of Fate folder, a clock, the opening rumour
 *   6. the first step comes due at once: a whisper to the Storyteller, the clock fills one, the step moves on
 *   7. the night's draw gives the storyline's beat one time in three
 *   8. a locked storyline gives no step and no beat
 *   9. an ending closes it: a deed in the Legends book, the clock gone, its signals free
 *  10. a refused card is never woven again until taken back
 *  11. a player's own hook is woven first
 *  12. the window: open storylines, a hook form, search boxes
 *  13. clean up
 * Result: Data/wodx-gate/gatefate-result.json.
 */
const MOD = "wodx-storyteller";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STEPS = 13;

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${STEPS} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatefate-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
async function peek(open, cls) {
  const p = open();
  await sleep(700);
  const app = [...(foundry.applications.instances?.values?.() ?? [])].reverse().find(a => a.options?.classes?.includes?.(cls));
  const html = app?.element?.innerHTML ?? "";
  await app?.close?.();
  await Promise.race([p, sleep(500)]);
  return html;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), S = M?.api?.signals, TH = M?.api?.threads, C = game.modules.get("wodx-chronicle")?.api;
  const has = (mod, k) => game.settings.settings.has(`${mod}.${k}`);
  const SET = ["threads", "threadsState", "signalBoard", "clocks", "rumours", "omenState"].filter(k => has(MOD, k));
  const keep = Object.fromEntries(SET.map(k => [k, foundry.utils.deepClone(game.settings.get(MOD, k))]));
  const keepAp = has("wodx-chronicle", "approvals") ? foundry.utils.deepClone(game.settings.get("wodx-chronicle", "approvals")) : null;
  const keepDeeds = has("wodx-chronicle", "legendDeeds") ? foundry.utils.deepClone(game.settings.get("wodx-chronicle", "legendDeeds")) : null;
  const msgsBefore = new Set(game.messages.map(m => m.id));
  const journalsBefore = new Set(game.journal.map(j => j.id));
  const foldersBefore = new Set(game.folders.map(f => f.id));
  const actors = [];
  const newMsgs = () => game.messages.contents.filter(m => !msgsBefore.has(m.id));
  const st = () => TH.state();
  try {
    ok("1. modules", M?.active && typeof S?.post === "function" && typeof TH?.run === "function" && SET.includes("threads") && SET.includes("signalBoard")
      && game.settings.get(MOD, "threads") !== undefined, {storyteller: M?.version, cards: TH?.cards?.length});
    await game.settings.set(MOD, "threads", "suggest");
    await game.settings.set(MOD, "threadsState", {open: [], done: [], refused: [], last: game.time.worldTime});
    await game.settings.set(MOD, "signalBoard", []);
    const [pc] = await Actor.create([{name: "WoDX gate: threads vampire", type: "Vampire"}]);
    actors.push(pc);
    await pc.update({ownership: {default: 0, ...Object.fromEntries(game.users.filter(u => !u.isGM).slice(0, 1).map(u => [u.id, 3]))}});

    // 2. Hooks post signals
    Hooks.callAll("wodxTown", {town: "gate-town", kind: "fire", text: "WoDX gate: the lower town burns", big: false, name: "Rothenstein", region: "moravia"});
    Hooks.callAll("wodxCultFormed", {cult: {id: "gate-cult", name: "WoDX gate: the Silver Choir"}, founder: {name: "Konrad"}});
    Hooks.callAll("wodxArrest", {actor: pc.id, name: pc.name, region: "moravia", deeds: []});
    Hooks.callAll("wodxSaga", {book: "gate", step: {key: "s1", title: "A step"}, signal: {kind: "saga", region: "moravia", weight: 2, words: "WoDX gate: the saga moves"}});
    await sleep(1200);
    const b = S.board();
    ok("2. hooks post signals", ["town:gate-town:fire", "cult:gate-cult", `arrest:${pc.id}`, "saga:gate:s1"].every(k => b.some(s => s.key === k)), {board: b.map(s => `${s.kind}:${s.key}`)});

    // 3. Omens read the board
    const om = M.api.omens?.signals?.() ?? [];
    ok("3. omens read the board", om.some(s => s.key === "cult:gate-cult") && om.some(s => s.key === `arrest:${pc.id}` && s.kind === "hunters"), {omens: om.length});

    // 4. The weave proposes
    const before = new Set((C.approvals.pending() ?? []).map(e => e.id));
    const story = await TH.run({force: true, why: "gate"});
    await sleep(600);
    const entry = (C.approvals.pending() ?? []).find(e => !before.has(e.id) && e.type === `${MOD}.threads`);
    const used = S.board().filter(s => s.used === story?.key).map(s => s.key);
    ok("4. the weave proposes", !!story && !!entry && used.length >= 1 && story.steps.length >= 3, {title: story?.title, anchor: story?.anchor, twist: story?.twist, used});

    // 5. Approving opens it
    if ( entry ) await C.approvals.decide(entry.id, "approve");
    await sleep(1500);
    const open5 = st().open.find(s => s.key === story?.key);
    const j5 = game.journal.get(open5?.journal);
    const clock5 = M.api.clocks.list().find(c => c.id === open5?.clock);
    const rum5 = (M.api.rumours.list() ?? []).some(r => r.text === TH.cards.find(c => c.key === story?.anchor)?.surface);
    ok("5. approving opens it", !!open5 && j5?.folder?.name === "Threads of Fate" && !!clock5 && rum5, {journal: j5?.name, clock: clock5?.name, rumour: rum5});

    // 6. The first step comes due at once
    const s6 = st().open.find(s => s.key === story?.key);
    const whisper6 = newMsgs().some(m => /Threads of Fate/.test(m.speaker?.alias ?? "") && m.content.includes(story?.steps?.[0]?.title ?? "@@"));
    const clock6 = M.api.clocks.list().find(c => c.id === s6?.clock);
    ok("6. the first step comes due", s6?.step === 1 && whisper6 && clock6?.filled === 1, {step: s6?.step, filled: clock6?.filled});

    // 7. The night's draw
    const beat = TH.nightBeat(() => 0);
    const none = TH.nightBeat(() => 0.9);
    ok("7. one draw in three gives a beat", beat?.key === story?.key && none === null, {beat: beat?.step?.title});

    // 8. Locked
    await TH.lockStory(story.key, true);
    await sleep(300);
    const due8 = TH.rules.due(st(), Infinity).length, beat8 = TH.nightBeat(() => 0);
    await TH.lockStory(story.key, false);
    ok("8. a locked storyline waits", due8 === 0 && beat8 === null);

    // 9. An ending
    const card = TH.cards.find(c => c.key === story.anchor);
    const ending = card.endings[0];
    await TH.endStory(story.key, ending.key);
    await sleep(800);
    const deed = (game.settings.get("wodx-chronicle", "legendDeeds") ?? []).find(d => d.id === `thread:${story.key}`);
    const freed = S.board().filter(s => s.used === story.key).length;
    ok("9. an ending closes it", !st().open.length && st().done.some(d => d.key === story.key && d.ending === ending.key) && !!deed
      && !M.api.clocks.list().some(c => c.id === open5?.clock) && freed === 0, {ending: ending.key, deed: deed?.text});

    // 10. Refused
    await TH.refuseCard(story.anchor);
    await sleep(300);
    const again = TH.rules.weave({board: S.board(), cards: TH.cards, state: st(), ctx: TH.context(), now: game.time.worldTime, rand: () => 0});
    const refusedOk = !again || again.anchor !== story.anchor;
    await TH.unrefuse(story.anchor);
    await sleep(300);
    ok("10. a refused card stays out", refusedOk && !st().refused.includes(story.anchor), {next: again?.anchor});

    // 11. A player's own hook first
    await TH.addHook(pc.id, "WoDX gate: the brother who sold the family");
    await sleep(600);
    const own = TH.rules.weave({board: S.board(), cards: TH.cards, state: st(), ctx: TH.context(), now: game.time.worldTime, rand: () => 0});
    ok("11. a player's own hook is woven first", own?.from?.kind === "hook" && own?.from?.about === pc.id, {anchor: own?.anchor, from: own?.from?.kind});

    // 12. The window
    const html = await peek(() => TH.open(), "wodx-threads-app");
    ok("12. the window", /Threads of Fate|Open storylines/.test(html) && /A player's own hook/.test(html) && /wodx-search|search/i.test(html) && /What has happened/.test(html), {length: html.length});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      for ( const k of SET ) await game.settings.set(MOD, k, keep[k]);
      if ( keepAp ) await game.settings.set("wodx-chronicle", "approvals", keepAp);
      if ( keepDeeds ) { await game.settings.set("wodx-chronicle", "legendDeeds", keepDeeds); await C.legends?.build?.({quiet: true}); }
      const mine = newMsgs().map(m => m.id);
      if ( mine.length ) await ChatMessage.deleteDocuments(mine);
      const js = game.journal.filter(j => !journalsBefore.has(j.id) && j.flags?.[MOD]?.thread).map(j => j.id);
      if ( js.length ) await JournalEntry.deleteDocuments(js);
      const fs = game.folders.filter(f => !foldersBefore.has(f.id) && f.name === "Threads of Fate" && !f.contents?.length).map(f => f.id);
      if ( fs.length ) await Folder.deleteDocuments(fs);
      for ( const x of actors ) await game.actors.get(x.id)?.delete();
      ok("13. clean up", actors.every(x => !game.actors.get(x.id)) && !game.journal.some(j => !journalsBefore.has(j.id) && j.flags?.[MOD]?.thread));
    } catch (err) { ok("13. clean up", false, {error: err.message}); }
  }
  return save(R);
}
