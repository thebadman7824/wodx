/**
 * Final audit (B6751-B6754): an approved proposal changes the world, it does not only post a card. In rothenstein-wodx,
 * as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateapprovalacts.mjs?${Date.now()}`)).run()
 *   1. a solo result that changes the world, sent from Out on your own and approved with the approval window's
 *      Approve: a tale about the character is in the rumour network
 *   2. a downtime request to study, approved: a long task to learn is on the character's sheet (Long tasks)
 *   3. a downtime request to hunt, approved: the player's card has the Hunt button, and clicking it opens WoDX Hunt
 *   4. Out on your own, Hunt or feed, Go: the hunt roll window opens for that character
 * The standing rules for the two kinds are set aside first and put back; world settings are put back by run-gate.
 * Result: Data/wodx-gate/gateapprovalacts-result.json.
 */
import {gate} from "./kit.mjs";

const ST = "wodx-storyteller", CH = "wodx-chronicle";
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 6000) { const t = Date.now(); while ( Date.now() - t < ms ) { if ( fn() ) return true; await sleep(100); } return !!fn(); }
const windows = () => [...(foundry.applications.instances?.values?.() ?? [])];
const huntOpen = () => windows().find(w => /WoDX Hunt/.test(w.title ?? w.options?.window?.title ?? ""));

export async function run() {
  const G = gate("gateapprovalacts");
  if ( G.notLive() ) return "Not on the Live world.";
  const api = () => game.modules.get(ST)?.api, Q = () => game.modules.get(CH)?.api?.approvals;
  const KINDS = [`${ST}.solo`, `${ST}.downtime`];
  const auto0 = foundry.utils.deepClone(game.settings.get(CH, "autoApprove") ?? {});
  try {
    // Gate rules: the world's level may pass these kinds on sight; this gate drives the queue itself
    const aside = {...auto0}; for ( const k of KINDS ) delete aside[k];
    await game.settings.set(CH, "autoApprove", aside);
    const player = game.users.find(u => !u.isGM);
    const [anna] = await G.make(Actor, [{name: "Gate Acts Anna", type: CONFIG.worldofdarkness?.sheettype?.mortal ?? "Mortal",
      ownership: {default: 0, ...(player ? {[player.id]: 3} : {})}}]);
    const scene = await G.scene();
    await G.tokens(scene, [{actor: anna, x: 3, y: 3}]);
    const mine = type => Q().pending().filter(p => p.type === type && p.data?.actorId === anna.id);
    const approve = async entry => {
      Q().ApprovalsApp.open(); await sleep(700);
      const b = document.querySelector(`#wodx-approvals [data-action=approve][data-id="${entry.id}"]`);
      if ( b ) b.click(); else await Q().decide(entry.id, "approve");
      await until(() => !Q().pending().some(p => p.id === entry.id), 5000);
      await sleep(500);
      return !!b;
    };

    await G.step("1. a solo result that changes the world, approved: a tale goes round", async () => {
      const r = await api().solo({actorId: anna.id, kind: "other", hours: 1, note: "Gate: burned the tithe barn at the crossroads", changesWorld: true});
      const p = mine(`${ST}.solo`);
      const before = api().rumours.list().filter(x => x.about === anna.id).length;
      const clicked = p[0] ? await approve(p[0]) : false;
      const tales = api().rumours.list().filter(x => x.about === anna.id);
      G.ok("1. a solo result that changes the world, approved: a tale goes round", r?.waiting && p.length === 1 && tales.length === before + 1 && /tithe barn/.test(tales.at(-1)?.text ?? ""),
        {queued: p.length, clicked, tales: tales.map(t => t.text)});
    });

    await G.step("2. downtime to study, approved: a long task on the sheet", async () => {
      await api().between.downtime({actorId: anna.id, kind: "study", nights: 3, what: "Gate Latin with the parish priest"});
      const p = mine(`${ST}.downtime`);
      const clicked = p[0] ? await approve(p[0]) : false;
      const t = Object.values(api().tasks.of(game.actors.get(anna.id)) ?? {}).find(x => x.kind === "train");
      G.ok("2. downtime to study, approved: a long task on the sheet", p.length === 1 && t?.status === "open" && /Latin/.test(t?.name ?? ""), {clicked, task: t ? {name: t.name, kind: t.kind, goal: t.goal} : null});
    });

    await G.step("3. downtime to hunt, approved: the card's Hunt button opens the hunt", async () => {
      const t0 = Date.now();
      await api().between.downtime({actorId: anna.id, kind: "feed", nights: 1, what: "Gate hunts the docks"});
      const p = mine(`${ST}.downtime`);
      if ( p[0] ) await approve(p[0]);
      const card = game.messages.contents.find(m => m.timestamp >= t0 && m.flags?.[ST]?.downtimeGo?.actorId === anna.id);
      await ui.chat?.render?.(); await sleep(500);
      const el = document.querySelector(`#chat [data-message-id="${card?.id}"] [data-action=wst-downtime-go], .chat-log [data-message-id="${card?.id}"] [data-action=wst-downtime-go]`);
      el?.click(); await until(() => !!huntOpen(), 4000);
      const open = huntOpen();
      G.ok("3. downtime to hunt, approved: the card's Hunt button opens the hunt", !!card && !!el && !!open, {card: !!card, button: !!el, window: open?.title ?? null});
      await open?.close?.();
    });

    await G.step("4. Out on your own, Hunt or feed: the hunt roll opens", async () => {
      api().openOnYourOwn(anna.id); await sleep(800);
      const dlg = windows().find(w => /Out on your own/.test(w.title ?? w.options?.window?.title ?? ""));
      const root = dlg?.element;
      const kind = root?.querySelector?.("select[name=kind]");
      if ( kind ) kind.value = "hunt";
      const note = root?.querySelector?.("textarea[name=note]"); if ( note ) note.value = "Gate: the docks";
      root?.querySelector?.("button[data-action=go]")?.click();
      await until(() => !!huntOpen(), 5000);
      const open = huntOpen();
      G.ok("4. Out on your own, Hunt or feed: the hunt roll opens", !!dlg && !!open, {dialog: !!dlg, window: open?.title ?? null});
      await open?.close?.();
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally {
    try {
      for ( const p of Q()?.pending?.() ?? [] ) if ( KINDS.includes(p.type) && /^Gate/.test(String(p.detail ?? p.title)) ) await Q().decide(p.id, "reject", "gate cleanup");
      await game.settings.set(CH, "autoApprove", auto0);
    } catch (e) { G.R.errors.push(`cleanup: ${e?.message ?? e}`); }
    return G.finish();
  }
}
