/**
 * WoDX gate: Run a turn in the Factions window, and a faction acts (npc.factions, B99), in Foundry, in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatefactionturn.mjs?${Date.now()}`)).run()
 * For the run the world has one scratch faction only (wars, splits and politics off); the factions, the Storyteller log
 * and the approvals go back after. Never moves the clock.
 *   1. the Storyteller presses Run a turn: the turn card shows the faction's move with its dice and difficulty, and
 *      the Factions window says the turn ran
 * Result: Data/wodx-gate/gatefactionturn-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-npc";
const ST = "wodx-storyteller";

export async function run() {
  const G = gate("gatefactionturn", {stepTimeout: 180000});
  const since = Date.now();
  const before = foundry.utils.deepClone(game.settings.get(MOD, "factions"));
  const log = foundry.utils.deepClone(game.settings.get(ST, "log"));
  const N = game.modules.get(MOD).api, ch = game.modules.get("wodx-chronicle")?.api;
  const id = `gateft${foundry.utils.randomID(6)}`;
  let win = null, card = null;
  try {
    for ( const [k, v] of [["factionMode", "auto"], ["factionWars", false], ["factionSplits", false], ["factionPolitics", false]] ) {
      try { await game.settings.set(MOD, k, v); } catch (e) { G.R.notes.push(`${k}: ${e?.message ?? e}`); }
    }
    // setup: one scratch faction with Backgrounds to act with, the only one in the world for this run
    const st = foundry.utils.deepClone(before ?? {});
    const base = (before?.factions ?? [])[0] ?? {};
    await game.settings.set(MOD, "factions", {...st, breaches: [], factions: [{...base, id, name: "Gate Turning Guild", kind: "guild", secret: false, dormant: false,
      dormantBy: null, founded: null, ended: null, absorbedBy: null, owners: [], run: null, orders: null, leader: null, members: [], places: [], standing: {},
      assets: {...(base.assets ?? {}), herd: 2, resources: 3, status: 2, retainers: 1, contacts: 2, domain: 0, security: 0, influence: {}}}]});
    const turns0 = Number(game.settings.get(MOD, "factions")?.turns) || 0;

    await G.step("1. Run a turn: the card shows the move's dice and the window says the turn ran", async () => {
      win = await N.factions.openFactions();
      const btn = () => document.querySelector('#wodx-npc-factions button[data-action="turn"]');
      await waitFor(btn, 30000);
      const pressed = !!btn();
      btn()?.click();
      const turn = turns0 + 1;
      card = null;
      await waitFor(() => (card = game.messages.contents.find(m => (m.timestamp ?? 0) >= since && m.flags?.[MOD]?.factionTurn?.turn === turn)), 90000);
      const line = [...new DOMParser().parseFromString(card?.content ?? "", "text/html").querySelectorAll("li")].map(li => li.textContent.replace(/\s+/g, " ").trim()).find(t => t.startsWith("Gate Turning Guild")) ?? "";
      await waitFor(() => document.querySelector("#wodx-npc-factions")?.textContent?.includes(`Turn ${turn} ran`), 30000);
      const shown = !!document.querySelector("#wodx-npc-factions")?.textContent?.includes(`Turn ${turn} ran`);
      // a move rolls its dice against a difficulty; a faction with nothing it can do says so (no orders, a split)
      const rolled = /\d+ dice at \d+/.test(line);
      G.ok("1. Run a turn: the card shows the move's dice and the window says the turn ran", pressed && rolled && shown,
        {pressed, turn, line, shown, turns: Number(game.settings.get(MOD, "factions")?.turns) || 0});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try { const w = await win; await w?.close?.(); } catch (e) { /* closed */ }
    try {
      const left = (ch?.approvals?.pending?.() ?? []).filter(p => String(p.title ?? "").includes("Gate Turning Guild") || String(p.key ?? "").includes(id));
      for ( const p of left ) await ch.approvals.decide(p.id, "reject", "gate cleanup");
    } catch (e) { G.R.notes.push(`approvals: ${e?.message ?? e}`); }
    try { await game.settings.set(MOD, "factions", before); } catch (e) { G.R.notes.push(`factions back: ${e?.message ?? e}`); }
    await new Promise(r => setTimeout(r, 4000));
    for ( const x of game.messages.contents.filter(x => (x.timestamp ?? 0) >= since && (x.flags?.[MOD]?.factionTurn || /Gate Turning Guild/.test(`${x.speaker?.alias ?? ""} ${x.content ?? ""}`))) ) { try { await x.delete(); } catch (e) { /* leave it */ } }
    try { await game.settings.set(ST, "log", log); } catch (e) { G.R.notes.push(`log: ${e?.message ?? e}`); }
    return G.finish();
  }
}
