/**
 * A yes to a proposal goes on the clock, the wedding card reaches the approval queue, and Approve there marries them
 * (npc.hearts), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatewedding.mjs?${Date.now()}`)).run()
 * It makes its own two adults, removes them and their cards, puts the clock back and puts the Storyteller log back.
 *   1. a proposal answered yes waits for the banns; with the wait a minute away the clock moves two minutes, the
 *      wedding comes to the approval queue, and its Approve button puts each on the other's Relationships tab as
 *      Spouse
 * Result: Data/wodx-gate/gatewedding-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-npc";
const el = app => app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;

export async function run() {
  const G = gate("gatewedding", {stepTimeout: 300000}); // making actors and saving cards in a big world can take minutes
  const since = Date.now();
  // WoDX Storyteller logs the removals; its log is put back after the gate's own cleanup
  const log = foundry.utils.deepClone(game.settings.get("wodx-storyteller", "log"));
  const sheets = [];
  let queue = null;
  try {
    await G.step("1. Approve on the wedding card marries them, shown as Spouse on the Relationships tab", async () => {
      const year = Number(game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.()) || 1197;
      const born = {chronology: {bornYear: year - 25}};
      const [groom, bride] = await G.make(Actor, [
        {name: "Gate Wedding Groom", type: "Mortal", flags: {"wodx-creation": {...born, sex: "m"}}},
        {name: "Gate Wedding Bride", type: "Mortal", flags: {"wodx-creation": {...born, sex: "f"}}}]);
      const a = () => game.actors.get(groom.id), b = () => game.actors.get(bride.id);
      const F = game.modules.get(MOD).api.family;
      const chron = game.modules.get("wodx-chronicle").api;
      // the proposal and its yes (setup), then the banns a minute from now
      await a().setFlag(MOD, "proposal", {id: foundry.utils.randomID(), a: groom.id, b: bride.id, at: game.time.worldTime, stage: "asked"});
      const said = await F.answer(a(), b(), "yes");
      const rec = a().flags?.[MOD]?.proposal;
      if ( rec ) await a().setFlag(MOD, "proposal", {...rec, due: game.time.worldTime + 60});
      // the trigger: the clock passes the end of the banns, and the Storyteller approves the wedding in the queue
      await game.time.advance(120);
      const entry = () => chron.approvals.pending().find(p => p.data?.a === groom.id && p.data?.b === bride.id);
      await waitFor(entry, 60000);
      const queued = !!entry();
      queue = chron.approvals.ApprovalsApp.open();
      await Promise.race([queue, new Promise(r => setTimeout(r, 20000))]);
      const btn = () => [...document.querySelectorAll(`#wodx-approvals button[data-action="approve"]`)].find(x => x.dataset.id === entry()?.id) ?? null;
      await waitFor(btn, 20000);
      const pressed = !!btn();
      btn()?.click();
      await waitFor(() => !entry(), 60000);
      // what the players see: each on the other's Relationships tab, as Spouse
      const tieOn = async (who, other) => {
        const sheet = who().sheet; sheets.push(sheet);
        await sheet.render({force: true});
        const row = () => el(sheet)?.querySelector(`.wodx-tie[data-uuid="Actor.${other.id}"]`) ?? null;
        await waitFor(row, 30000);
        const r = row();
        return r ? (r.querySelector(".wodx-tie-role-pick")?.value ?? r.querySelector(".wodx-tie-role")?.textContent?.trim() ?? "") : null;
      };
      await new Promise(r => setTimeout(r, 3000)); // the marriage saves both sheets after the queue closes the card
      const onGroom = await tieOn(a, bride), onBride = await tieOn(b, groom);
      const spouse = v => /^spouse$/i.test(String(v ?? ""));
      G.ok("1. Approve on the wedding card marries them, shown as Spouse on the Relationships tab",
        said?.answer === "yes" && queued && pressed && spouse(onGroom) && spouse(onBride),
        {answer: said?.answer ?? null, queued, pressed, groomSees: onGroom, brideSees: onBride});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    for ( const s of sheets ) { try { await s.close(); } catch (e) { /* closed */ } }
    try { await game.modules.get("wodx-chronicle")?.api?.approvals?.ApprovalsApp?.open?.().then(a => a?.close?.()); } catch (e) { /* closed */ }
    for ( const n of ["Gate Wedding Groom", "Gate Wedding Bride"] ) { const a = game.actors.getName(n); if ( a ) { try { await a.delete(); } catch (e) { G.R.notes.push(`actor: ${e?.message ?? e}`); } } }
    await new Promise(r => setTimeout(r, 8000));
    for ( const x of game.messages.contents.filter(x => (x.timestamp ?? 0) >= since && /Gate Wedding/.test(`${x.speaker?.alias ?? ""} ${x.content ?? ""}`)) ) { try { await x.delete(); } catch (e) { /* leave it */ } }
    try { await game.settings.set("wodx-storyteller", "log", log); } catch (e) { G.R.notes.push(`log: ${e?.message ?? e}`); }
    return G.finish();
  }
}
