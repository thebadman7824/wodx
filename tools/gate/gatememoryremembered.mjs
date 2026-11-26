/**
 * WoDX gate: an NPC remembers a kindness and the player's "Who remembers" window shows it (npc.memory-wanted,
 * B3346), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatememoryremembered.mjs?${Date.now()}`)).run()
 * Makes its own NPC, a player's character and the talk card, and removes them; never moves the clock.
 *   1. the Storyteller presses "They saw to it" on the talk card; the NPC, who already owed the character one small
 *      kindness, now remembers them kindly, and the "Who remembers" window lists the NPC with those words
 * Result: Data/wodx-gate/gatememoryremembered-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-npc";

export async function run() {
  const G = gate("gatememoryremembered", {stepTimeout: 120000});
  const msgs = new Set();
  let win = null;
  try {
    const NPC = game.modules.get(MOD)?.api;
    const player = game.users.find(u => !u.isGM);
    if ( !player ) { G.ok("1. world", false, {error: "No player user to own the character"}); return G.finish(); }
    await game.settings.set(MOD, "memory", true);
    const [pc] = await G.make(Actor, [{name: "Gate Memory Friend", type: "Mortal", ownership: {default: 0, [player.id]: 3}}]);
    // an old small kindness, a day back: alone it is "Nothing much" to the character
    const old = {id: "gate-old", kind: "warm", weight: 1, at: game.time.worldTime - 86400, text: "shared bread once", seen: true};
    const [npc] = await G.make(Actor, [{name: "Gate Memory Baker", type: "Mortal", ownership: {default: 0},
      flags: {[MOD]: {want: {topic: "a favour", text: "Wants a letter carried to the mill"}, memory: {[pc.id]: [old]}}}}]);

    await G.step("1. They saw to it, and the Who remembers window shows the NPC", async () => {
      const before = NPC.memory.known(pc).map(r => r.name);
      const att0 = NPC.attitude.of(npc, pc)?.step ?? null;
      let heard = null;
      Hooks.once("wodxAttitude", x => { heard = {npc: x?.npc?.name, change: x?.change}; });
      const msg = await ChatMessage.create({speaker: {alias: npc.name},
        content: "<div class=\"vta-card wodx-x wnpc wnpc-talk-card\"><div class=\"vta-body\"><p>Could you carry a letter for me?</p></div></div>",
        whisper: game.users.filter(u => u.isGM).map(u => u.id),
        flags: {[MOD]: {talk: {actor: pc.id, topic: "a favour", said: "", want: {npc: npc.id}}}}});
      msgs.add(msg.id);
      try { ui.sidebar?.changeTab?.("chat", "primary"); } catch {}
      const btn = () => document.querySelector(`#chat [data-message-id="${msg.id}"] button.wnpc-want-met, .chat-log [data-message-id="${msg.id}"] button.wnpc-want-met`);
      await waitFor(btn, 30000);
      const shown = !!btn();
      btn()?.click();
      const notes = () => game.actors.get(npc.id)?.flags?.[MOD]?.memory?.[pc.id] ?? [];
      await waitFor(() => notes().length >= 2 && NPC.memory.known(pc).some(r => r.id === npc.id), 120000);
      // the player's window (the scene control is a player's; the Storyteller opens the same window for the character)
      NPC.memory.open(pc);
      await waitFor(() => (win = [...document.querySelectorAll(".wnpc-remembered")].at(-1)), 15000);
      const rows = [...(win?.querySelectorAll("li") ?? [])].map(li => li.textContent.trim());
      for ( const m of game.messages.filter(m => /saw to what/.test(m.content ?? "") && m.content.includes(pc.name)) ) msgs.add(m.id);
      G.ok("1. They saw to it, and the Who remembers window shows the NPC",
        shown && !before.includes(npc.name) && notes().length === 2 && rows.includes(`${npc.name}: Remembers you kindly`),
        {shown, before, att: [att0, NPC.attitude.of(npc, pc)?.step ?? null], heard, met: !!game.actors.get(npc.id)?.flags?.[MOD]?.want?.met?.[pc.id],
          activeGM: game.users.activeGM?.id === game.user.id, owned: pc.hasPlayerOwner, memoryOn: game.settings.get(MOD, "memory"), notes: notes().map(x => `${x.kind} ${x.weight} ${x.text}`), rows});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try {
      win?.closest?.(".application")?.querySelector?.('[data-action="close"], button[data-action="ok"]')?.click();
      for ( const a of Object.values(ui.windows ?? {}) ) if ( a?.element?.classList?.contains?.("wnpc-remembered") ) await a.close();
      for ( const a of foundry.applications.instances?.values?.() ?? [] ) if ( a?.element?.classList?.contains?.("wnpc-remembered") ) await a.close();
    } catch (e) { G.R.notes.push(`window: ${e?.message ?? e}`); }
    try { if ( msgs.size ) await ChatMessage.deleteDocuments([...msgs].filter(id => game.messages.get(id))); } catch (e) { G.R.notes.push(`messages: ${e?.message ?? e}`); }
    return G.finish();
  }
}
