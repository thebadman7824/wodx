/**
 * A faction that holds a scene shows its banners on the map; ending it in the Factions window takes them down, and
 * Undo on its card puts them back (npc.faction-looks), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatefactionend.mjs?${Date.now()}`)).run()
 * Works on a scratch scene and a scratch faction; puts the factions and the Storyteller log back; never moves the
 * clock and never runs a faction turn.
 *   1. End in the Factions window, then Yes: the faction's two banners leave the canvas
 *   2. Undo on the end card: the banners are back on the canvas
 * Result: Data/wodx-gate/gatefactionend-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-npc";
const ST = "wodx-storyteller";

export async function run() {
  const G = gate("gatefactionend", {stepTimeout: 240000});
  const since = Date.now();
  const before = foundry.utils.deepClone(game.settings.get(MOD, "factions"));
  const log = foundry.utils.deepClone(game.settings.get(ST, "log"));
  const N = game.modules.get(MOD).api;
  const id = `gatefe${foundry.utils.randomID(6)}`;
  let sc = null, win = null, card = null;
  // what the canvas shows: the banners drawn for the "factions" key, as drawings or on Chronicle's looks layer
  const banners = () => {
    const drawn = (canvas.drawings?.placeables ?? []).filter(d => d.document.flags?.[ST]?.look?.source === "factions" && d.document.parent?.id === sc?.id);
    const layered = (game.modules.get("wodx-chronicle")?.api?.looks?.list?.(sc) ?? []).filter(l => l.source === "factions");
    return drawn.length + layered.length;
  };
  try {
    await G.step("1. End in the Factions window: the banners leave the canvas", async () => {
      sc = await G.scene({width: 3000, height: 2000});
      // setup: a scratch faction holds the scene, and its banners go up
      const st = foundry.utils.deepClone(game.settings.get(MOD, "factions") ?? {});
      const base = (before?.factions ?? [])[0] ?? {};
      await game.settings.set(MOD, "factions", {...st, factions: [...(st.factions ?? []), {...base, id, name: "Gate Ending Guild", kind: "guild", secret: false, dormant: false, members: [], places: [sc.uuid]}]});
      await waitFor(() => banners() === 2, 60000);
      const up = banners();
      // the trigger: the Storyteller presses End on the faction's row, then Yes
      win = N.factions.openFactions();
      const end = () => document.querySelector(`button[data-action="end"][data-id="${id}"]`);
      await waitFor(end, 30000);
      const pressed = !!end();
      end()?.click();
      const yes = () => [...document.querySelectorAll(".wodx-npc-dialog button[data-action='yes']")].find(b => /End a faction/.test(b.closest(".application")?.textContent ?? "")) ?? null;
      await waitFor(yes, 30000);
      const confirmed = !!yes();
      yes()?.click();
      await waitFor(() => banners() === 0, 60000);
      card = game.messages.contents.filter(m => (m.timestamp ?? 0) >= since && m.flags?.[MOD]?.factionEnd).at(-1) ?? null;
      G.ok("1. End in the Factions window: the banners leave the canvas", pressed && confirmed && up === 2 && banners() === 0,
        {pressed, confirmed, up, after: banners(), dormant: (game.settings.get(MOD, "factions")?.factions ?? []).find(f => f.id === id)?.dormant ?? null, card: !!card});
    });

    await G.step("2. Undo on the end card: the banners are back", async () => {
      const btn = () => document.querySelector(`#chat-log [data-message-id="${card?.id}"] button.wnpc-f-undo`) ?? document.querySelector(`[data-message-id="${card?.id}"] button.wnpc-f-undo`);
      await waitFor(btn, 60000);
      const pressed = !!btn();
      btn()?.click();
      await waitFor(() => banners() === 2, 60000);
      G.ok("2. Undo on the end card: the banners are back", pressed && banners() === 2, {pressed, after: banners()});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try { const w = await win; await w?.close?.(); } catch (e) { /* closed */ }
    try { await game.settings.set(MOD, "factions", before); } catch (e) { G.R.notes.push(`factions back: ${e?.message ?? e}`); }
    await new Promise(r => setTimeout(r, 8000));
    for ( const x of game.messages.contents.filter(x => (x.timestamp ?? 0) >= since && /Gate Ending Guild/.test(`${x.speaker?.alias ?? ""} ${x.content ?? ""}`)) ) { try { await x.delete(); } catch (e) { /* leave it */ } }
    try { await game.settings.set(ST, "log", log); } catch (e) { G.R.notes.push(`log: ${e?.message ?? e}`); }
    return G.finish();
  }
}
