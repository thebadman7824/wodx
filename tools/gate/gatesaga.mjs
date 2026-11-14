/**
 * Rothenstein saga gate (B3660-B3669), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatesaga.mjs?${Date.now()}`)).run()
 * Turns the saga on, runs the first book a few steps forward on the clock, and puts the settings, approvals, chat
 * cards and the clock back.
 *   1. the api, the setting and the saga section of the window
 *   2. starting the first book deals Chapter I with a link to its notes
 *   3. fifty days on, the first interlude comes; at 176 days the thaw moves the Ashfield clock and fires wodxSaga with a signal
 *   4. an ending changes the words of the steps still to come
 *   5. the next book that fits the year goes to the approval queue, once
 *   6. a sequel's chapter links to its own session page in the world
 *   7. skipping a book stops its run
 *   9. a saga town change lands on the town named Rothenstein (skipped, with a note, when there is none)
 *   8. every other WoDX module still answers (and current() names the running step)
 * Result: Data/wodx-gate/gatesaga-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DAY = 86400;
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
async function until(fn, ms = 6000) { const t = Date.now(); while ( Date.now() - t < ms ) { if ( fn() ) return true; await sleep(100); } return !!fn(); }

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const C = "wodx-chronicle", pod = () => game.modules.get(C)?.api?.pod, saga = () => pod()?.saga, appr = () => game.modules.get(C)?.api?.approvals;
  const KEYS = ["podChains", "podSaga", "podState"];
  const t0 = Date.now(), time0 = game.time.worldTime, was = Object.fromEntries(KEYS.map(k => [k, foundry.utils.deepClone(game.settings.get(C, k))]));
  let towns0 = null; try { towns0 = foundry.utils.deepClone(game.settings.get("wodx-storyteller", "townState")); } catch (e) { towns0 = null; }
  const pend0 = new Set((appr()?.pending?.() ?? []).map(p => p.id));
  const cards = () => game.messages.contents.filter(m => m.timestamp >= t0 && m.content?.includes("wct-pod"));
  const heard = [];
  const hook = Hooks.on("wodxSaga", p => heard.push(p));
  try {
    await game.settings.set(C, "podSaga", true);
    await game.settings.set(C, "podChains", false);
    await game.settings.set(C, "podState", {cities: {}, chains: []});

    await step("1 api", async () => {
      const app = await pod()?.open?.(); await sleep(500);
      const shown = [...(app?.element?.querySelectorAll?.("h3") ?? [])].some(h => /Rothenstein saga/.test(h.textContent));
      await app?.close?.();
      const v = saga()?.rules?.validate?.() ?? ["no rules"];
      ok("1 api", typeof saga()?.start === "function" && shown && !v.length && saga().rules.span().books >= 19, {shown, problems: v, version: game.modules.get(C).version});
    });

    await step("2 first chapter", async () => {
      const n0 = cards().length;
      const run = await saga().start("red-stone");
      await until(() => cards().length > n0);
      const c = cards().at(-1)?.content ?? "";
      ok("2 first chapter", !!run && /Chapter I: The guest-feast/.test(c) && /Notes:/.test(c) && saga().state().books["red-stone"] === "running", {card: c.slice(0, 300)});
    });

    await step("3 seasons pass", async () => {
      const n0 = cards().length;
      await game.time.advance(51 * DAY);
      await until(() => cards().slice(n0).some(m => /First snow/.test(m.content)));
      const first = cards().slice(n0).find(m => /First snow/.test(m.content))?.content ?? "";
      await sleep(2300);
      await game.time.advance(125 * DAY);
      await until(() => (saga().state().clocks.ashfield ?? 0) >= 1, 8000);
      const st = saga().state(), sig = heard.find(h => h.step === "i2");
      ok("3 seasons pass", /First snow/.test(first) && st.clocks.ashfield === 1 && sig?.signal?.region === "moravia", {clocks: st.clocks, heard: heard.map(h => h.step)});
    });

    await step("4 ending", async () => {
      await saga().ending("red-stone", "take");
      const run = game.settings.get(C, "podState").chains.find(r => r.saga?.book === "red-stone");
      const ch = pod().rules.chainOf(run, 1200), e1 = ch.steps.find(x => x.key === "e1");
      const cur = saga().current?.();
      ok("4 ending", run?.saga?.endings?.["red-stone"] === "take" && /dirt under their nails/.test(e1?.text) && (!saga().current || cur?.book === "red-stone"), {endings: run?.saga?.endings, current: cur?.step?.key});
    });

    await step("5 next book offered", async () => {
      const yr = game.modules.get(C).api?.eras?.currentYear?.() ?? 1197;
      await game.settings.set(C, "podState", {cities: {}, chains: []});
      const want = saga().rules.dueBook({}, yr);
      await saga().tick(); await saga().tick();
      const p = (appr().pending() ?? []).filter(x => x.type === `${C}.podSaga` && !pend0.has(x.id));
      ok("5 next book offered", want ? p.length === 1 && p[0].data?.book === want.key : p.length === 0, {year: yr, want: want?.key, queued: p.map(x => x.data?.book)});
      if ( !want ) R.notes.push(`No book fits ${yr}; the queue was checked to stay empty.`);
    });

    await step("6 sequel notes", async () => {
      const e = game.journal.getName("The Patriarch's Last Dream (GM only)");
      await game.settings.set(C, "podState", {cities: {}, chains: []});
      const n0 = cards().length;
      await saga().start("patriarch");
      await until(() => cards().length > n0);
      const c = cards().at(-1)?.content ?? "";
      ok("6 sequel notes", /Chapter I: The envoy/.test(c) && (!e || /Session 1/.test(c)), {journal: !!e, card: c.slice(0, 300)});
    });

    await step("7 skip", async () => {
      await saga().skip("patriarch");
      const st = game.settings.get(C, "podState");
      ok("7 skip", !st.chains.some(r => r.saga?.book === "patriarch") && st.saga.books.patriarch === "skipped", {});
    });

    await step("9 the town", async () => {
      const towns = game.modules.get("wodx-storyteller")?.api?.upkeep?.towns;
      if ( typeof towns?.saga !== "function" ) { ok("9 the town", false, {why: "api.upkeep.towns.saga is missing"}); return; }
      const scars = () => Object.values(towns.state().towns).reduce((n, x) => n + (x.scars?.length ?? 0), 0);
      const n0 = scars();
      const r = await towns.saga({book: "gate", step: `flood-${Date.now()}`, kind: "world", title: "A gate flood", where: "Rothenstein", year: 1997, town: "flood"});
      const hit = scars() > n0;
      ok("9 the town", r === null ? true : hit, {landed: !!r, scars: [n0, scars()]});
      if ( r === null ) R.notes.push("No town named Rothenstein in this world (or towns over time is off): the saga's town change was not landed.");
    });

    await step("8 other modules", async () => {
      const mods = ["wodx-actions", "wodx-combat", "wodx-npc", "wodx-storyteller", "wodx-library", "wodx-senses"].filter(m => game.modules.get(m)?.active && !game.modules.get(m)?.api);
      ok("8 other modules", !mods.length, {missing: mods});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    Hooks.off("wodxSaga", hook);
    try {
      for ( const p of (appr()?.pending?.() ?? []).filter(p => !pend0.has(p.id)) ) await appr().decide(p.id, "reject", "gate cleanup");
      const msgs = game.messages.filter(m => m.timestamp >= t0);
      if ( msgs.length ) await ChatMessage.deleteDocuments(msgs.map(m => m.id));
      for ( const k of KEYS ) await game.settings.set(C, k, was[k]);
      if ( towns0 ) await game.settings.set("wodx-storyteller", "townState", towns0);
      if ( game.time.worldTime !== time0 ) await game.time.advance(time0 - game.time.worldTime);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatesaga-result.json");
}
