/**
 * Book one's twist web gate (WoDX Chronicle, B4850-B4853), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatetwists.mjs?${Date.now()}`)).run()
 * Turns the saga on with book one running, reveals twists, and puts the settings, the chat cards and the clock back.
 *   1. the api and the twist section in the saga window (24 twists, six chains)
 *   2. revealing twist 1 sends the Storyteller a card that names the partner it changes, and fires wodxTwist
 *   3. a second twist within the week is refused with the days left; "anyway" reveals it, and a week later the next
 *      comes without asking
 *   4. a twist with two hearts asks for one; a twist of a later chapter waits for it
 *   5. taking a twist back clears it
 * Step 2 first shows a twist waiting for its encounter (B6645), then marks encounters 1, 5, 10, 16 and 22 played.
 * Result: Data/wodx-gate/gatetwists-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DAY = 86400;
async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatetwists-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const C = "wodx-chronicle", saga = () => game.modules.get(C)?.api?.pod?.saga, tw = () => saga()?.twists;
  const KEYS = ["podChains", "podSaga", "podState"];
  const t0 = Date.now(), time0 = game.time.worldTime, was = Object.fromEntries(KEYS.map(k => [k, foundry.utils.deepClone(game.settings.get(C, k))]));
  const cards = () => game.messages.contents.filter(m => m.timestamp >= t0 && m.content?.includes("wct-pod"));
  const heard = [];
  const hook = Hooks.on("wodxTwist", p => heard.push(p));
  try {
    await game.settings.set(C, "podSaga", true);
    await game.settings.set(C, "podChains", false);
    await game.settings.set(C, "podState", {cities: {}, chains: []});
    await saga().start("red-stone");
    await sleep(500);

    await step("1 api", async () => {
      const app = await game.modules.get(C).api.pod.open(); await sleep(600);
      const rows = app?.element?.querySelectorAll?.("[data-twist]")?.length ?? 0;
      const shown = [...(app?.element?.querySelectorAll?.("h3") ?? [])].some(h => /Book one's twists/.test(h.textContent));
      await app?.close?.();
      ok("1 api", typeof tw()?.reveal === "function" && shown && rows === 24 && !tw().rules.validate().length && tw().rules.CHAINS.length === 6, {shown, rows});
    });
    await step("2 reveal", async () => {
      let waits = "";
      try { await tw().reveal(1); } catch (e) { waits = e.message; }
      const s = foundry.utils.deepClone(game.settings.get(C, "podState"));
      s.saga.encounters = {...(s.saga.encounters ?? {}), played: {1: 0, 5: 0, 10: 0, 16: 0, 22: 0}};
      await game.settings.set(C, "podState", s);
      R.notes.push(`Before its encounter: ${waits}`);
      if ( !/has not been played/.test(waits) ) throw new Error(`Twist 1 did not wait for its encounter: ${waits || "revealed"}`);
      const n0 = cards().length;
      await tw().reveal(1);
      await sleep(400);
      const c = cards().slice(n0).map(m => m.content).join(" ");
      ok("2 reveal", !!tw().state().revealed?.[1] && /Twist 1 revealed/.test(c) && /Twist 13/.test(c) && heard.some(h => h.n === 1), {card: c.slice(0, 400), heard: heard.length});
    });
    await step("3 a week", async () => {
      let refused = "";
      try { await tw().reveal(5); } catch (e) { refused = e.message; }
      await tw().reveal(5, {force: true});
      await game.time.advance(8 * DAY);
      let later = "";
      try { await tw().reveal(10); } catch (e) { later = e.message; }
      ok("3 a week", /One twist a week/.test(refused) && !!tw().state().revealed?.[5] && !later && !!tw().state().revealed?.[10], {refused, later});
    });
    await step("4 hearts and chapters", async () => {
      await game.time.advance(8 * DAY);
      let heart = "", chap = "";
      try { await tw().reveal(22); } catch (e) { heart = e.message; }
      try { await tw().reveal(16); } catch (e) { chap = e.message; }
      await tw().reveal(22, {variant: "seer"});
      ok("4 hearts and chapters", /Choose its heart/.test(heart) && /fits from chapter 8/.test(chap) && tw().state().revealed?.[22]?.variant === "seer", {heart, chap});
    });
    await step("5 take back", async () => {
      await tw().takeBack(22);
      ok("5 take back", !tw().state().revealed?.[22] && !!tw().state().revealed?.[10], {left: Object.keys(tw().state().revealed ?? {})});
    });
  } finally {
    Hooks.off("wodxTwist", hook);
    for ( const k of KEYS ) { try { await game.settings.set(C, k, was[k]); } catch (e) { R.errors.push(`${k}: ${e.message}`); } }
    for ( const m of cards() ) await m.delete().catch(() => {});
    if ( game.time.worldTime !== time0 ) await game.time.advance(time0 - game.time.worldTime);
    R.notes.push(`Clock back: ${game.time.worldTime === time0}.`);
  }
  return save(R);
}
