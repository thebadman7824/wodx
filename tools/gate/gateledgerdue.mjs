/**
 * Gate: a Ledger debt between two characters comes due on the real clock and both of their Relationships tabs show a
 * Due badge on the tie (storyteller.ledger-due; B7838), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateledgerdue.mjs?${Date.now()}`)).run()
 * It makes its own two adults and removes them, and puts back the clock, the hold, the Ledger, the Storyteller's log
 * and Chronicle's night work.
 *   1. the two sheets are open before the date with no badge; the clock passes the date, and without a new render by
 *      the gate both sheets show "Due" on the tie to the other
 * Result: Data/wodx-gate/gateledgerdue-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const CH = "wodx-chronicle", ST = "wodx-storyteller";
const sleep = ms => new Promise(r => setTimeout(r, ms));
/** Waits until what read() gives has not changed for three seconds (thirty at most): the night work has finished writing. */
async function settle(read, {quiet = 3000, most = 30000} = {}) {
  const t = Date.now();
  let last = read(), since = Date.now();
  while ( Date.now() - t < most ) {
    await sleep(500);
    const now = read();
    if ( now !== last ) { last = now; since = Date.now(); } else if ( Date.now() - since >= quiet ) return;
  }
}
const el = app => app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;

export async function run() {
  const G = gate("gateledgerdue", {stepTimeout: 300000}); // making actors and saving cards in a big world can take minutes
  if ( game.world.id !== "rothenstein-wodx" ) { G.ok("1. world", false, {error: "Run this gate in rothenstein-wodx only"}); return G.finish(); }
  const ch = game.modules.get(CH)?.api, st = game.modules.get(ST)?.api;
  const since = Date.now(), t0 = game.time.worldTime;
  const stored = key => game.settings.storage.get("world").getSetting?.(key) ?? null;
  const WRITTEN = [`${ST}.log`, `${CH}.nightWork`];
  const writtenBefore = Object.fromEntries(WRITTEN.map(k => [k, stored(k)?.toObject?.() ?? null]));
  const saved = {held: !!ch?.isHeld?.(), ledger: foundry.utils.deepClone(game.settings.get(ST, "ledger"))};
  const sheets = [];
  try {
    await G.step("1. a debt come due shows Due on both Relationships tabs", async () => {
      const year = Number(ch?.eras?.currentYear?.()) || 1197;
      const born = {chronology: {bornYear: year - 30}};
      const [debtor, lender] = await G.make(Actor, [
        {name: "Gate Ledger Debtor", type: "Mortal", flags: {"wodx-creation": {...born}}},
        {name: "Gate Ledger Lender", type: "Mortal", flags: {"wodx-creation": {...born}}}]);
      await ch.hold(true);
      const e = await st.ledger.save({kind: "debt", from: {id: debtor.id, name: debtor.name}, to: {id: lender.id, name: lender.name},
        what: "Gate debt of ten groschen", due: game.time.worldTime + 3600});
      // what the players see: the tie to the other on each Relationships tab
      const open = async (who, other) => {
        const sheet = game.actors.get(who.id).sheet; sheets.push(sheet);
        await sheet.render({force: true});
        const row = () => el(sheet)?.querySelector(`.wodx-tie[data-open-uuid="Actor.${other.id}"]`) ?? null;
        await waitFor(row, 30000);
        return () => row()?.querySelector(".wodx-tie-due")?.textContent?.trim() ?? null;
      };
      const onDebtor = await open(debtor, lender), onLender = await open(lender, debtor);
      const before = [onDebtor(), onLender()];
      // the trigger: the clock passes the date; the sheets redraw on their own when the Ledger marks it
      await ch.hold(false); await sleep(1500);
      await game.time.advance(2 * 3600);
      await waitFor(() => onDebtor() && onLender(), 60000);
      const after = [onDebtor(), onLender()];
      const announced = !!game.settings.get(ST, "ledger").entries.find(x => x.id === e?.id)?.announced;
      G.ok("1. a debt come due shows Due on both Relationships tabs",
        !!e?.id && before.every(v => v === null) && announced && after.every(v => v === "Due"),
        {saved: !!e?.id, before, announced, after});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    for ( const s of sheets ) { try { await s.close(); } catch (e) { /* closed */ } }
    try {
      await ch.hold(true);
      await game.time.set(t0); await sleep(500);
      await game.settings.set(ST, "ledger", saved.ledger);
      for ( const n of ["Gate Ledger Debtor", "Gate Ledger Lender"] ) { const a = game.actors.getName(n); if ( a ) await a.delete(); }
      await sleep(3000);
      const ids = game.messages.contents.filter(x => (x.timestamp ?? 0) >= since && /Gate debt of ten groschen|Gate Ledger/.test(`${x.speaker?.alias ?? ""} ${x.content ?? ""}`)).map(x => x.id);
      if ( ids.length ) await ChatMessage.deleteDocuments(ids);
      await ch.hold(saved.held);
      await ch?.nightwork?.settle?.();
      await settle(() => WRITTEN.map(k => JSON.stringify(stored(k)?.value ?? null)).join());
      for ( const s of sheets ) { try { if ( s.rendered ) await s.close(); } catch (e) { /* closed */ } }
      for ( const k of WRITTEN ) {
        const now = stored(k), was = writtenBefore[k];
        if ( !was && now ) await now.delete();
        else if ( was && now && now.value !== was.value ) await now.update({value: was.value});
        else if ( was && !now ) await game.settings.storage.get("world").documentClass.create(was);
      }
    } catch (e) { G.R.errors.push(`put back: ${e?.message ?? e}`); }
  }
  return G.finish();
}
