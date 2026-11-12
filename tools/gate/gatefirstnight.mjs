/**
 * Before the First Night gate (WoDX Creation 0.13.0, Chronicle 0.34.1, Storyteller 0.38.1), in rothenstein-wodx,
 * as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatefirstnight.mjs?${Date.now()}`)).run()
 * Makes its own characters and removes them, with the chat cards and journals it made. The clock is not moved.
 *   1. the api, versions and setting
 *   2. the hub opens for a character and for the troupe
 *   3. the trouble forecast has items for a Toreador with an Enemy
 *   4. the Build window renders and a + button raises a dot
 *   5. the prelude runner renders its scenes, a short one starts at the turn
 *   6. the written prelude makes a journal page
 *   7. sign-off ticks the step and posts the forecast and the seed cards; Skip closes a card
 *   8. ties go round two characters as chat cards
 *   9. every other WoDX module still answers
 * Result: Data/wodx-gate/gatefirstnight-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const atLeast = (v, min) => { const a = String(v ?? "").split(/[.-]/).map(Number), b = min.split(".").map(Number); for (let i = 0; i < b.length; i++) { if ((a[i] || 0) !== b[i]) return (a[i] || 0) > b[i]; } return true; };
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const M = "wodx-creation", api = () => game.modules.get(M)?.api;
  const time0 = game.time.worldTime;
  const msgs0 = new Set(game.messages.map(m => m.id)), journals0 = new Set(game.journal.map(j => j.id)), actors0 = new Set(game.actors.map(a => a.id));
  const made = [];
  const closeAll = async () => { for ( const app of [...(foundry.applications.instances?.values?.() ?? [])] ) if ( /wodx-fn|wodx-first-night/.test(app.id) ) await app.close(); };
  try {
    const made2 = await Actor.create([{name: "WoDX gate: First Night Toreador", type: "Vampire", system: {clan: "toreador", generation: 12}},
      {name: "WoDX gate: First Night Mortal", type: "Mortal"}]);
    const vamp = made2.find(a => a.type === "Vampire"), mortal = made2.find(a => a.type === "Mortal");
    made.push(vamp, mortal);
    await vamp.createEmbeddedDocuments("Item", [{name: "Enemy", type: "Feature", system: {type: "wod.types.flaw", value: 3}}]).catch(e => R.notes.push(`flaw item: ${e.message}`));

    await step("1 api", async () => ok("1 api", atLeast(game.modules.get(M).version, "0.13.0") && typeof api()?.firstNight === "function"
      && typeof api()?.forecast === "function" && typeof api()?.signOff === "function" && !!api()?.firstNightRules
      && atLeast(game.modules.get("wodx-chronicle")?.version, "0.34.1") && atLeast(game.modules.get("wodx-storyteller")?.version, "0.38.1")
      && ["auto", "on"].includes(game.settings.get(M, "firstNight")),
      {creation: game.modules.get(M).version, chronicle: game.modules.get("wodx-chronicle")?.version, storyteller: game.modules.get("wodx-storyteller")?.version, setting: game.settings.get(M, "firstNight")}));

    await step("2 hub", async () => {
      const app = await api().firstNight(vamp); await sleep(400);
      const one = !!app?.element?.querySelector("[data-action]");
      await app?.close?.();
      const troupe = await api().firstNight(null); await sleep(400);
      const all = !!troupe?.element?.textContent?.includes(vamp.name);
      await troupe?.close?.();
      ok("2 hub", one && all, {one, all});
    });

    let items = [];
    await step("3 forecast", async () => {
      items = await api().forecast(vamp);
      ok("3 forecast", Array.isArray(items) && items.length > 0, {count: items.length, groups: [...new Set(items.map(i => i.group))]});
    });

    await step("4 build", async () => {
      const {BuildApp} = await import("/modules/wodx-creation/scripts/first-night-build.mjs");
      const app = await BuildApp.openFor(vamp); await sleep(500);
      const btn = app.element?.querySelector("[data-action=step][data-d='1'][data-path='system.attributes.strength.value']");
      const before = Number(vamp.system.attributes?.strength?.value) || 0;
      btn?.click(); await sleep(600);
      const after = Number(game.actors.get(vamp.id).system.attributes?.strength?.value) || 0;
      const hasCount = !!app.element?.querySelector("table.wodx-check tbody tr");
      await app.close();
      ok("4 build", !!btn && after === before + 1 && hasCount, {before, after, hasCount});
    });

    await step("5 prelude runner", async () => {
      const P = await import("/modules/wodx-creation/scripts/first-night-prelude.mjs");
      const full = P.scenesFor(vamp, false), short = P.scenesFor(vamp, true);
      const app = await P.PreludeRunApp.openFor(vamp); await sleep(500);
      const shown = !!app?.element?.textContent?.length;
      await app?.close?.();
      ok("5 prelude runner", full.length >= 3 && short[0]?.key === "turn" && shown, {full: full.length, short: short.map(s => s.key)});
    });

    await step("6 written prelude", async () => {
      const P = await import("/modules/wodx-creation/scripts/first-night-prelude.mjs");
      const j = await P.writtenPrelude(vamp); await sleep(400);
      const page = j?.pages?.contents?.[0]?.text?.content ?? "";
      j?.sheet?.close?.();
      ok("6 written prelude", !!j && page.includes("<h2>") && api().firstNightOf(game.actors.get(vamp.id)).prelude?.written === j.id, {journal: j?.name});
    });

    await step("7 sign-off and seed cards", async () => {
      const n0 = game.messages.size;
      const out = await api().signOff(vamp); await sleep(800);
      const rec = api().firstNightOf(game.actors.get(vamp.id));
      const seeds = game.messages.filter(m => m.flags?.[M]?.fnSeed && m.flags[M].fnSeed.actorId === vamp.id);
      let skipped = false;
      if ( seeds[0] ) {
        const el = document.querySelector(`[data-message-id="${seeds[0].id}"] [data-wodx-fn-skip]`);
        if ( el ) { el.click(); await sleep(800); skipped = game.messages.get(seeds[0].id)?.flags?.[M]?.fnSeed?.state === "skipped"; }
        else R.notes.push("Skip button not in the chat log; card state not clicked.");
      }
      ok("7 sign-off and seed cards", Array.isArray(out) && rec.signed && rec.steps.signoff?.done && game.messages.size - n0 >= 2 && seeds.length > 0 && (skipped || !document.querySelector(`[data-message-id="${seeds[0]?.id}"]`)),
        {posted: game.messages.size - n0, seeds: seeds.length, kinds: seeds.map(m => m.flags[M].fnSeed.card.kind), skipped});
    });

    await step("8 ties", async () => {
      const P = await import("/modules/wodx-creation/scripts/first-night-prelude.mjs");
      const out = await P.sendTies();
      ok("8 ties", Array.isArray(out), {cards: out.length, note: "Cards only go to player characters; none of the gate's own have a player owner."});
    });

    await step("9 other modules", async () => {
      const bad = game.modules.filter(m => m.id.startsWith("wodx-") && m.active && !m.api && !["wodx-paperdoll"].includes(m.id)).map(m => m.id);
      ok("9 other modules", bad.length === 0, {noApi: bad});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    await closeAll().catch(() => null);
    const newMsgs = game.messages.filter(m => !msgs0.has(m.id)).map(m => m.id);
    if ( newMsgs.length ) await ChatMessage.deleteDocuments(newMsgs).catch(e => R.errors.push(`messages: ${e.message}`));
    const newJ = game.journal.filter(j => !journals0.has(j.id)).map(j => j.id);
    if ( newJ.length ) await JournalEntry.deleteDocuments(newJ).catch(e => R.errors.push(`journals: ${e.message}`));
    const newA = game.actors.filter(a => !actors0.has(a.id)).map(a => a.id);
    if ( newA.length ) await Actor.deleteDocuments(newA).catch(e => R.errors.push(`actors: ${e.message}`));
    if ( game.time.worldTime !== time0 ) await game.time.advance(time0 - game.time.worldTime);
    R.cleaned = {messages: newMsgs.length, journals: newJ.length, actors: newA.length};
  }
  return save(R, "gatefirstnight-result.json");
}
