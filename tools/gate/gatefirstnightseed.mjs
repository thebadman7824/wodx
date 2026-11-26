/**
 * WoDX gate: Sign off in the Before the First Night window seeds the world, and Make it on the enemy card brings the
 * enemy onto a sheet of its own (creation.prelude-seed, Chronicle Start Desk d4, d7), in Foundry, in rothenstein-wodx,
 * as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatefirstnightseed.mjs?${Date.now()}`)).run()
 * Makes its own character (a rival in the lifepath), and removes it, the enemy made and the cards; never moves the clock.
 *   1. Tick each step and Sign off in the window, then Make it on the enemy card: the enemy's own sheet regards
 *      the character as Hostile, an enemy from the past
 * Result: Data/wodx-gate/gatefirstnightseed-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const M = "wodx-creation";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const elOf = app => app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;

export async function run() {
  const G = gate("gatefirstnightseed", {stepTimeout: 240000});
  const t0 = Date.now(), made = new Set();
  let app = null, sheet = null;
  try {
    const api = game.modules.get(M)?.api, NPC = game.modules.get("wodx-npc")?.api;
    const [pc] = await G.make(Actor, [{name: "Gate Seed Toreador", type: "Vampire", system: {clan: "toreador", generation: 12}, ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER}}]);
    await pc.createEmbeddedDocuments("Item", [{name: "Enemy", type: "Feature", system: {type: "wod.types.flaw", value: 3}}]).catch(e => G.R.notes.push(`flaw item: ${e.message}`));
    // a rival from the lifepath, so sign-off has an enemy card to make
    await pc.update({[`flags.${M}.lifepath`]: {path: ["gate"], people: [{role: "rival", note: "A gate rival", year: 1190}], kept: []}});

    await G.step("1. Sign off, Make it, and the enemy's sheet", async () => {
      app = await api.firstNight(pc);
      await waitFor(() => elOf(app)?.querySelector('button[data-action="signoff"]'), 20000);
      // the Storyteller ticks each open step (the window redraws after each)
      for ( let i = 0; i < 20; i++ ) {
        const tick = elOf(app)?.querySelector('button[data-action="done"]');
        if ( !tick ) break;
        tick.click();
        await waitFor(() => !elOf(app)?.contains(tick), 10000);
        await sleep(300);
      }
      const sign = () => elOf(app)?.querySelector('button[data-action="signoff"]:not([disabled])');
      await waitFor(sign, 20000);
      const signable = !!sign();
      sign()?.click();
      const card = () => game.messages.contents.find(m => m.flags?.[M]?.fnSeed?.actorId === pc.id && m.flags[M].fnSeed.card?.kind === "enemy") ?? null;
      await waitFor(card, 60000);
      const make = () => document.querySelector(`#chat [data-message-id="${card()?.id}"] [data-wodx-fn-make], .chat-log [data-message-id="${card()?.id}"] [data-wodx-fn-make]`);
      try { ui.sidebar?.changeTab?.("chat", "primary"); } catch {}
      await waitFor(make, 30000);
      const pressed = !!make();
      make()?.click();
      const enemy = () => game.actors.find(a => a.flags?.[M]?.pastOf?.id === pc.id) ?? null;
      await waitFor(() => enemy() && (enemy().system?.notes ?? "").includes(pc.name), 90000);
      for ( const a of game.actors.filter(a => a.flags?.[M]?.pastOf?.id === pc.id) ) made.add(a.id);
      const foe = enemy();
      // what the Storyteller sees: the enemy's own sheet regards the character as Hostile, for an enemy from the past
      sheet = foe?.sheet;
      await sheet?.render({force: true});
      const why = () => [...(elOf(sheet)?.querySelectorAll(".wnpc-why") ?? [])].map(x => x.textContent.replace(/\s+/g, " ").trim()).find(t => t.includes(pc.name)) ?? "";
      await waitFor(() => /Hostile/.test(why()) && /An enemy from the past/.test(why()), 30000);
      const onSheet = why();
      const step = NPC?.attitude?.of?.(foe, pc)?.step ?? null;
      G.ok("1. Sign off, Make it, and the enemy's sheet",
        signable && pressed && !!foe && /Hostile/.test(onSheet) && /An enemy from the past/.test(onSheet) && step === -2 && !!api.firstNightOf(game.actors.get(pc.id))?.signed,
        {signable, pressed, enemy: foe?.name ?? null, onSheet, attitude: step, state: card()?.flags?.[M]?.fnSeed?.state ?? null});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try { await sheet?.close?.(); } catch {}
    try { await app?.close?.(); } catch {}
    try {
      const pcIds = new Set(G.R.steps.length ? game.actors.filter(a => a.name === "Gate Seed Toreador").map(a => a.id) : []);
      for ( const a of game.actors.filter(a => pcIds.has(a.flags?.[M]?.pastOf?.id)) ) made.add(a.id);
      if ( made.size ) await Actor.deleteDocuments([...made].filter(id => game.actors.get(id)));
      const msgs = game.messages.contents.filter(m => m.timestamp >= t0 && (m.flags?.[M]?.fnSeed || /Gate Seed Toreador/.test(m.content ?? ""))).map(m => m.id);
      if ( msgs.length ) await ChatMessage.deleteDocuments(msgs);
    } catch (e) { G.R.notes.push(`cleanup: ${e?.message ?? e}`); }
    return G.finish();
  }
}
