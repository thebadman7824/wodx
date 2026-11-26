/**
 * Gate: a character walks up to two NPCs talking and overhears them, but not through a wall (npc.overheard; B2750 to
 * B2753), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateoverheardwalk.mjs?${Date.now()}`)).run()
 * It makes its own scene, two NPCs and one character, and removes them; turns overheard talk on with a chance of 1 and
 * puts both settings and the pause back. It never moves the clock.
 *   1. the character steps within earshot but behind a wall that stops sound: no exchange reaches the chat
 *   2. the character steps round the end of the wall, within earshot: the exchange comes to the chat log as an
 *      Overheard whisper naming both NPCs, and the scene's Overheard window lists it as heard by the character
 * Result: Data/wodx-gate/gateoverheardwalk-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-npc";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const text = el => String(el?.textContent ?? "").replace(/\s+/g, " ").trim();

export async function run() {
  const G = gate("gateoverheardwalk", {stepTimeout: 180000});
  const saved = {on: game.settings.get(MOD, "overheard"), chance: game.settings.get(MOD, "overheardChance"), paused: game.paused};
  const since = Date.now();
  const npc = () => game.modules.get(MOD).api;
  // what the Storyteller's chat log shows of the gate's Overheard whispers
  // (only this scene's: the world's own active scene can have talkers of its own)
  let tok = null, sceneId = null;
  const shown = () => [...document.querySelectorAll("#chat-log .chat-message, .chat-log .chat-message")]
    .filter(li => { const m = game.messages.get(li.dataset.messageId); return m?.timestamp >= since && m.flags?.[MOD]?.overheard?.scene === sceneId && li.querySelector(".wnpc-overheard"); });
  try {
    const scene = await G.scene({width: 2000, height: 1500, grid: 100});
    sceneId = scene.id;
    const [hans, greta, pc] = await G.make(Actor, [
      {name: "Gate Overheard Hans", type: "Mortal"}, {name: "Gate Overheard Greta", type: "Mortal"},
      {name: "Gate Overheard Listener", type: "Mortal", ownership: {default: 3}}]);
    // the pair side by side at squares 5 and 6 of row 5; the character far off at 15; a wall at x = 8 from the top to
    // row 7 that stops sound (and sight and movement, as a stone wall does)
    [, , tok] = await G.tokens(scene, [{actor: hans, x: 5, y: 5}, {actor: greta, x: 6, y: 5}, {actor: pc, x: 15, y: 5}]);
    await scene.createEmbeddedDocuments("Wall", [{c: [800, 0, 800, 750], move: CONST.WALL_MOVEMENT_TYPES.NORMAL,
      sight: CONST.WALL_SENSE_TYPES.NORMAL, light: CONST.WALL_SENSE_TYPES.NORMAL, sound: CONST.WALL_SENSE_TYPES.NORMAL}]);
    await waitFor(() => canvas.walls?.placeables?.length && canvas.tokens.get(tok.id), 20000);
    await game.settings.set(MOD, "overheard", true);
    await game.settings.set(MOD, "overheardChance", 1);
    if ( game.paused ) game.togglePause(false, {broadcast: true});
    await sleep(1000);

    await G.step("1. within earshot behind a wall: nothing overheard", async () => {
      // the trigger: the character's token moves, as a player drags it (three squares from Greta, the wall between)
      await canvas.tokens.get(tok.id).document.update({x: 900, y: 500});
      await sleep(8000); // the look runs 1.5 s after a move; give a slow lane time to write a card
      const walls = canvas.walls.placeables.length;
      const heard = shown().length;
      G.ok("1. within earshot behind a wall: nothing overheard", walls === 1 && heard === 0 && game.scenes.get(scene.id).flags?.[MOD]?.overheard?.log?.length !== 1,
        {walls, heard, at: [tok.x, tok.y]});
    });

    await G.step("2. round the wall's end: the talk comes to the chat and the Overheard window", async () => {
      // the trigger: the character walks round the end of the wall (down past it, then across: the wall stops a
      // straight move through it) to three squares below Hans, nothing between
      await canvas.tokens.get(tok.id).document.update({x: 900, y: 1000});
      await sleep(1000);
      await canvas.tokens.get(tok.id).document.update({x: 500, y: 800});
      await waitFor(() => shown().length, 90000);
      const card = shown().at(-1);
      const said = text(card?.querySelector(".wnpc-overheard"));
      const names = /Hans|Greta|someone|stranger|man|woman|person/i.test(said);
      // when nothing came: why, as the look itself says (before the window, which can change the scene)
      const diag = card ? null : await (async () => {
        const OH = npc().overheard, sc = game.scenes.get(scene.id);
        const pre = {flag: sc.flags?.[MOD]?.overheard ?? null, paused: game.paused, set: game.settings.get(MOD, "overheard")};
        const look = await OH.run(sc).catch(e => ({error: e.message}));
        return {look: look?.why ?? look?.error ?? (look?.ok ? "talked when asked again" : look), pre, activeGM: game.users.activeGM?.id === game.user.id, npcOwned: [hans, greta].map(a => !!game.actors.get(a.id)?.hasPlayerOwner), tokens: sc.tokens.size};
      })();
      // what the Storyteller sees in the scene's Overheard window (its record is saved just after the whisper)
      await waitFor(() => game.scenes.get(scene.id).flags?.[MOD]?.overheard?.log?.length, 60000);
      const win = npc().overheard?.open?.(game.scenes.get(scene.id)) ?? npc().openOverheard?.(game.scenes.get(scene.id));
      const row = () => document.querySelector(".wnpc-overheard-window .wnpc-oh-row");
      await waitFor(row, 20000);
      const listed = text(row());
      document.querySelector(".wnpc-overheard-window button[data-action='cancel']")?.click();
      await Promise.race([win, sleep(3000)]);
      const stillOn = !game.scenes.get(scene.id).flags?.[MOD]?.overheard?.off; // Cancel leaves the scene's switch alone
      G.ok("2. round the wall's end: the talk comes to the chat and the Overheard window",
        !!card && /Overheard/.test(said) && names && /heard by Gate Overheard Listener/.test(listed) && stillOn,
        {said: said.slice(0, 240), listed: listed.slice(0, 240), stillOn, at: [tok.x, tok.y], ...(card ? {} : {why: {owner: !!game.actors.get(pc.id)?.hasPlayerOwner,
          players: game.users.filter(u => !u.isGM).length, paused: game.paused, on: game.settings.get(MOD, "overheard"),
          log: game.scenes.get(scene.id).flags?.[MOD]?.overheard?.log?.length ?? 0, viewed: canvas.scene?.id === scene.id, diag}})});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try {
      document.querySelector(".wnpc-overheard-window button[data-action='cancel']")?.click();
      await game.settings.set(MOD, "overheard", saved.on);
      await game.settings.set(MOD, "overheardChance", saved.chance);
      if ( game.paused !== saved.paused ) game.togglePause(saved.paused, {broadcast: true});
      const ids = game.messages.contents.filter(m => (m.timestamp ?? 0) >= since && m.flags?.[MOD]?.overheard).map(m => m.id);
      if ( ids.length ) await ChatMessage.deleteDocuments(ids);
    } catch (e) { G.R.errors.push(`put back: ${e?.message ?? e}`); }
  }
  return G.finish();
}
