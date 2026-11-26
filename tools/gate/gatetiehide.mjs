/**
 * The Storyteller hides a tie from players with its eye button on the Relationships tab (npc.ties-secrets), in
 * Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatetiehide.mjs?${Date.now()}`)).run()
 * It makes its own character and contact, removes them, puts the Storyteller log back, and never moves the clock.
 *   1. the eye button on a tie: the row is marked "Only you see this" on the Storyteller's sheet, and the tie drops out
 *      of what a player's view of that character lists (when the world has a player account)
 * Result: Data/wodx-gate/gatetiehide-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const el = app => app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;

export async function run() {
  const G = gate("gatetiehide", {stepTimeout: 300000}); // saving sheets in a big world can take minutes
  const since = Date.now();
  // WoDX Storyteller logs the removals; its log is put back after the gate's own cleanup
  const log = foundry.utils.deepClone(game.settings.get("wodx-storyteller", "log"));
  let sheet = null;
  try {
    await G.step("1. the eye button hides a tie: marked for the Storyteller, gone from a player's view", async () => {
      const [pc, friend] = await G.make(Actor, [{name: "Gate Tie Hide Character", type: "Mortal", ownership: {default: 3}}, {name: "Gate Tie Hide Contact", type: "Mortal"}]);
      const N = game.modules.get("wodx-npc").api;
      // setup: a tie by hand from the character to the contact, shown to everyone
      await pc.update({"flags.wodx-sheets.ties": [{uuid: `Actor.${friend.id}`, role: "contact"}]});
      const player = game.users.find(u => !u.isGM) ?? null;
      const seenBy = u => !!u && N.ties.of(game.actors.get(pc.id), {user: u}).some(t => t.uuid === `Actor.${friend.id}` || t.to?.id === friend.id);
      const playerBefore = player ? seenBy(player) : null;
      sheet = game.actors.get(pc.id).sheet;
      await sheet.render({force: true});
      const row = () => el(sheet)?.querySelector(`.tab.wodxties .wodx-tie[data-uuid="Actor.${friend.id}"]`) ?? null;
      await waitFor(() => row()?.querySelector(`[data-act="tie-hide"]`), 30000);
      const markedBefore = !!row()?.querySelector(`i.fa-eye-slash[title="Only you see this"]`);
      // the trigger: the Storyteller presses the eye button on the row
      const eye = row()?.querySelector(`[data-act="tie-hide"]`);
      const pressed = !!eye;
      eye?.click();
      await waitFor(() => (game.actors.get(pc.id).getFlag("wodx-sheets", "ties") ?? []).some(t => t.hidden), 60000);
      await sheet.render({force: true});
      // what the Storyteller sees: the row marked as theirs alone, and the button now offers to show it again
      await waitFor(() => row()?.querySelector(`i.fa-eye-slash[title="Only you see this"]`), 30000);
      const markedAfter = !!row()?.querySelector(`i.fa-eye-slash[title="Only you see this"]`);
      const offersShow = !!row()?.querySelector(`[data-act="tie-hide"] i.fa-eye`);
      const playerAfter = player ? seenBy(player) : null;
      if ( !player ) G.R.notes.push("no player account in this world: the player's view was not checked");
      G.ok("1. the eye button hides a tie: marked for the Storyteller, gone from a player's view",
        pressed && !markedBefore && markedAfter && offersShow && (!player || (playerBefore === true && playerAfter === false)),
        {pressed, markedBefore, markedAfter, offersShow, player: player?.name ?? null, playerBefore, playerAfter});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try { await sheet?.close(); } catch (e) { /* closed */ }
    for ( const n of ["Gate Tie Hide Character", "Gate Tie Hide Contact"] ) { const a = game.actors.getName(n); if ( a ) { try { await a.delete(); } catch (e) { G.R.notes.push(`actor: ${e?.message ?? e}`); } } }
    await new Promise(r => setTimeout(r, 8000));
    for ( const x of game.messages.contents.filter(x => (x.timestamp ?? 0) >= since && /Gate Tie Hide/.test(`${x.speaker?.alias ?? ""} ${x.content ?? ""}`)) ) { try { await x.delete(); } catch (e) { /* leave it */ } }
    try { await game.settings.set("wodx-storyteller", "log", log); } catch (e) { G.R.notes.push(`log: ${e?.message ?? e}`); }
    return G.finish();
  }
}
