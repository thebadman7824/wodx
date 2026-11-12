/**
 * Lifepath threads and guest beats gate (WoDX Creation 0.14.0, Chronicle 0.43.0 or later), in rothenstein-wodx, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gatethreads.mjs?${Date.now()}`)).run()
 * Turns Story chains on, makes its own characters and a Group if there is none, and puts the settings, actors,
 * approvals and chat cards back. The clock is not moved.
 *   1. the api on both modules
 *   2. a lifepath with something open gives threads
 *   3. a due thread goes to the approval queue (needs a player user; else started straight from the api)
 *   4. approved, it runs as a story chain whose first card names the character's past
 *   5. a rejected thread is left in the past and not put again
 *   6. the story chains window lists Threads from the past
 *   7. a guest fits by years (a 1197 Cainite in 1995 only as an elder)
 *   8. the prelude runner shows the guest button; a guest beat goes to troupe ties and the log, and Undo takes it back
 *   9. every other WoDX module still answers
 * Result: Data/wodx-gate/gatethreads-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DAY = 86400;
const atLeast = (v, min) => { const a = String(v ?? "").split(/[.-]/).map(Number), b = min.split(".").map(Number); for (let i = 0; i < b.length; i++) { if ((a[i] || 0) !== b[i]) return (a[i] || 0) > b[i]; } return true; };
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
  const C = "wodx-chronicle", CR = "wodx-creation";
  const pod = () => game.modules.get(C)?.api?.pod, appr = () => game.modules.get(C)?.api?.approvals, cre = () => game.modules.get(CR)?.api;
  const KEYS = ["podChains", "podState"];
  const t0 = Date.now(), time0 = game.time.worldTime, was = Object.fromEntries(KEYS.map(k => [k, foundry.utils.deepClone(game.settings.get(C, k))]));
  const pend0 = new Set((appr()?.pending?.() ?? []).map(p => p.id));
  const cards = () => game.messages.contents.filter(m => m.timestamp >= t0 && m.content?.includes("wct-pod"));
  const player = game.users.find(u => !u.isGM);
  const made = [];
  let host = null, guest = null, group = null, threads = [];
  try {
    await game.settings.set(C, "podChains", true);
    await game.settings.set(C, "podState", {cities: {}, chains: []});
    const own = player ? {default: 0, [player.id]: 3} : {default: 0};
    [host, guest] = await Actor.create([{name: "WoDX gate: Host", type: "Vampire", ownership: own}, {name: "WoDX gate: Guest", type: "Vampire", ownership: own}]);
    made.push(host, guest);
    group = game.actors.find(x => /group/i.test(String(x.type)));
    if ( !group && game.system.documentTypes?.Actor && Object.keys(game.system.documentTypes.Actor).some(t => /group/i.test(t)) ) {
      group = await Actor.create({name: "WoDX gate: Group", type: Object.keys(game.system.documentTypes.Actor).find(t => /group/i.test(t))});
      made.push(group);
    }
    const ties0 = foundry.utils.deepClone(group?.flags?.[CR]?.ties ?? []);

    await step("1 api", async () => {
      ok("1 api", atLeast(game.modules.get(CR).version, "0.14.0") && atLeast(game.modules.get(C).version, "0.43.0") && typeof cre()?.lifepathThreads === "function"
        && typeof pod()?.lifepathTick === "function" && typeof pod()?.startThread === "function", {creation: game.modules.get(CR).version, chronicle: game.modules.get(C).version});
    });

    await step("2 threads", async () => {
      const L = cre().lifepathRules;
      for ( let i = 0; i < 80 && !threads.length; i++ ) {
        let p = L.newPath({line: "vampire", birthYear: 1500 + i, seed: `gate${i}`});
        for ( let g = 0; !L.done(p) && g < 20; g++ ) p = L.choose(p, i % 2);
        await host.update({[`flags.${CR}.lifepath`]: L.record(p, {kept: [], people: []})});
        threads = cre().lifepathThreads(game.actors.get(host.id));
      }
      const gp = L.newPath({line: "vampire", birthYear: 1170, turnYear: 1197, seed: "gate-guest"});
      await guest.update({[`flags.${CR}.lifepath`]: L.record(gp, {})});
      ok("2 threads", threads.length >= 1 && threads.every(t => t.id && t.kind && t.role), {threads: threads.map(t => `${t.kind}: ${t.role}`)});
    });

    let put = null;
    await step("3 queue", async () => {
      if ( !player ) { R.notes.push("No player user: the tick skips characters without a player owner, so the queue step was not checked."); ok("3 queue", true, {skipped: true}); return; }
      const s = foundry.utils.deepClone(game.settings.get(C, "podState"));
      s.lp = {[host.id]: {since: game.time.worldTime - 15 * DAY, last: null, seen: {}}};
      await game.settings.set(C, "podState", s);
      await pod().lifepathTick();
      await until(() => (appr().pending() ?? []).some(p => p.type === `${C}.podLifepath` && p.data?.actor === host.id) || (game.settings.get(C, "podState").chains ?? []).some(r => r.lp?.actorId === host.id));
      put = (appr().pending() ?? []).find(p => p.type === `${C}.podLifepath` && p.data?.actor === host.id) ?? null;
      const seen = game.settings.get(C, "podState").lp?.[host.id]?.seen ?? {};
      ok("3 queue", (!!put || Object.values(seen).includes("running")) && Object.keys(seen).length === 1, {queued: !!put, seen});
    });

    await step("4 chain", async () => {
      const n0 = cards().length;
      if ( put ) await appr().decide(put.id, "approve");
      else if ( !(game.settings.get(C, "podState").chains ?? []).some(r => r.lp?.actorId === host.id) ) await pod().startThread(host.id, threads[0], "Brno");
      await until(() => cards().length > n0);
      const run = (game.settings.get(C, "podState").chains ?? []).find(r => r.lp?.actorId === host.id);
      const first = cards().at(-1)?.content ?? "";
      ok("4 chain", !!run && run.at === 1 && first.includes("WoDX gate: Host's past") && !/\{|\byour\b/i.test(first), {at: run?.at, card: first.replace(/<[^>]+>/g, " ").slice(0, 240)});
      if ( run ) await pod().stopChain(run.id);
    });

    await step("5 reject", async () => {
      const x = threads[1] ?? null;
      if ( !x || !player ) { ok("5 reject", true, {skipped: true}); R.notes.push("Only one thread, or no player: reject not checked."); return; }
      const s = foundry.utils.deepClone(game.settings.get(C, "podState"));
      s.lp[host.id].last = game.time.worldTime - 31 * DAY;
      await game.settings.set(C, "podState", s);
      await pod().lifepathTick();
      await until(() => (appr().pending() ?? []).some(p => p.data?.thread?.id === x.id));
      const p = (appr().pending() ?? []).find(q => q.data?.thread?.id === x.id);
      if ( p ) await appr().decide(p.id, "reject", "gate");
      await sleep(400);
      const seen = game.settings.get(C, "podState").lp?.[host.id]?.seen ?? {};
      await pod().lifepathTick();
      const again = (appr().pending() ?? []).some(q => q.data?.thread?.id === x.id);
      ok("5 reject", (!p || seen[x.id] === "dismissed") && !again, {queued: !!p, seen});
    });

    await step("6 window", async () => {
      const app = await pod()?.open?.(); await sleep(500);
      const html = app?.element?.innerHTML ?? "";
      await app?.close?.();
      ok("6 window", html.includes("Threads from the past"), {});
    });

    const P = await import(`/modules/${CR}/scripts/first-night-prelude-rules.mjs`);
    await step("7 guest fit", async () => {
      const f = P.guestFit(1995, {line: "vampire", birthYear: 1170, turnYear: 1197}), n = P.guestFit(1150, {line: "vampire", birthYear: 1170, turnYear: 1197});
      ok("7 guest fit", f.ok && f.as === "elder" && !n.ok, {elder: f, unborn: n});
    });

    await step("8 guest beat", async () => {
      if ( !group ) { ok("8 guest beat", false, {error: "no Group actor type"}); return; }
      const M = await import(`/modules/${CR}/scripts/first-night-prelude.mjs`);
      const app = await M.PreludeRunApp.openFor(game.actors.get(host.id)); await sleep(600);
      const btn = !!app?.element?.querySelector?.("[data-action=guest]");
      const tie = P.guestTie({from: guest.id, about: host.id, scene: "turn", year: 1530, title: "The turn", beat: "What did the guest see?", text: "A gate beat."});
      await M.saveGuest(tie);
      await sleep(600);
      const g1 = game.actors.get(group.id).flags?.[CR]?.ties ?? [];
      const has = g1.some(t => t.kind === "guest" && t.from === guest.id && t.about === host.id);
      const log = game.actors.get(host.id).flags?.[CR]?.firstNight?.prelude?.log ?? [];
      const i = log.findIndex(e => e.kind === "guest");
      app?.render?.(); await sleep(500);
      const undo = app?.element?.querySelector?.(`[data-action=undo][data-i="${i}"]`);
      undo?.click(); await sleep(800);
      const gone = !(game.actors.get(group.id).flags?.[CR]?.ties ?? []).some(t => t.kind === "guest" && t.from === guest.id);
      await app?.close?.();
      ok("8 guest beat", btn && has && i >= 0 && !!undo && gone, {btn, has, logged: i >= 0, undo: !!undo, gone});
    });

    await step("9 other modules", async () => {
      const mods = ["wodx-actions", "wodx-combat", "wodx-npc", "wodx-storyteller", "wodx-library", "wodx-senses", "wodx-creation"].filter(m => game.modules.get(m)?.active && !game.modules.get(m)?.api);
      ok("9 other modules", !mods.length, {missing: mods});
    });
    if ( group && !made.includes(group) ) await game.actors.get(group.id)?.update({[`flags.${CR}.ties`]: ties0});
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      for ( const p of (appr()?.pending?.() ?? []).filter(p => !pend0.has(p.id)) ) await appr().decide(p.id, "reject", "gate cleanup");
      const msgs = game.messages.filter(m => m.timestamp >= t0);
      if ( msgs.length ) await ChatMessage.deleteDocuments(msgs.map(m => m.id));
      for ( const x of made ) await game.actors.get(x?.id)?.delete();
      for ( const k of KEYS ) await game.settings.set(C, k, was[k]);
      if ( game.time.worldTime !== time0 ) await game.time.advance(time0 - game.time.worldTime);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatethreads-result.json");
}
