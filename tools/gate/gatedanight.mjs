/**
 * Dark Ages depth desk item 8: one Kindred night end to end, through the windows a player and the Storyteller
 * use, on one vampire of the Road of Kings. In rothenstein-wodx (or any test world) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedanight.mjs?${Date.now()}`)).run()
 *   1. dusk: New Night takes the night's blood point (6 to 5, above the hunger line, so no hunger roll comes into the feeding)
 *   2. the hunt: the feeding window, with a mortal vessel targeted, puts blood back and keeps the time of the drink
 *   3. court: a boon recorded in the Prestation ledger, then refused, brings the Road of Kings' level 2 sin card
 *      ("Breaking your word or oath"); its Degeneration button opens the sin window, and an automatic loss takes a
 *      Road dot (8 to 7)
 *   4. the record: the night's boon and its refusal are on the character's page of the WoDX History journal
 *   5. dawn: one who fed tonight is not asked about going hungry
 * Makes its own actors and removes them; the Prestation ledger keeps the gate's two lines (a lane is reset nightly).
 * Result: Data/wodx-gate/gatedanight-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-actions";
const elOf = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;
const windows = () => [...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)];
const titled = re => windows().find(w => re.test(w.title ?? w.options?.window?.title ?? "") && w.rendered);
const msgEl = id => ui.chat.element?.querySelector(`[data-message-id="${id}"]`) ?? document.querySelector(`#chat [data-message-id="${id}"]`);
const ok = el => el?.querySelector?.('button[data-action="ok"]');

export async function run() {
  const G = gate("gatedanight");
  if ( G.notLive() ) return "gatedanight never runs in the Live world";
  try {
    await waitFor(() => !!game.wodxActions?.sinPrompt && !!game.wodxActions?.newNight, 30000);
    const A = game.wodxActions;
    for ( const [k, v] of [["eventPrompts", true], ["historyLog", true], ["nightlyBlood", true], ["applyChanges", true]] ) {
      try { if ( game.settings.get(MOD, k) !== v ) await game.settings.set(MOD, k, v); } catch (e) { /* setting absent */ }
    }
    const [lord, peasant] = await G.make(Actor, [
      {name: "Gate DA Night Lord", type: "Vampire", system: {advantages: {path: {label: "custom", custom: "Road of Kings", permanent: 8, temporary: 8},
        bloodpool: {temporary: 6, max: 10}, virtues: {conscience: {permanent: 3}, selfcontrol: {permanent: 3}, courage: {permanent: 3}}}}},
      {name: "Gate DA Night Peasant", type: "Mortal"}]);
    const blood = () => Number(lord.system.advantages.bloodpool.temporary ?? 0);
    // the History page is found by name too, so a page left by an earlier run may be reused: only lines added tonight count
    const histText = () => { const j = game.journal.find(x => x.getFlag?.(MOD, "kind") === "history");
      const pg = j?.pages?.find(p => p.getFlag?.(MOD, "actor") === lord.uuid) ?? j?.pages?.getName(lord.name); return pg?.text?.content ?? ""; };
    const histBefore = histText().replace(/<\/ul>\s*$/, "");

    await G.step("1. dusk: New Night takes the night's blood", async () => {
      await A.newNight({actors: [lord]});
      const fell = await waitFor(() => Number(lord.system.advantages.bloodpool.temporary ?? 0) === 5, 6000);
      G.ok("1. dusk: New Night takes the night's blood", fell, {blood: blood()});
    }, {timeout: 150000});

    await G.step("2. the hunt: the feeding window puts blood back", async () => {
      const before = blood();
      const p = A.feed({actor: lord, vessel: peasant});
      let win = null;
      await waitFor(() => (win = titled(/^WoDX Feed$/)), 6000);
      const el = elOf(win);
      const v = el?.querySelector?.("select[name=vessel]"); if ( v ) v.value = "human";
      const t = el?.querySelector?.("input[name=take]"); if ( t ) t.value = "2";
      ok(el)?.click();
      await Promise.race([p, new Promise(r => setTimeout(r, 5000))]);
      const rose = await waitFor(() => Number(lord.system.advantages.bloodpool.temporary ?? 0) > before, 6000);
      const fed = await waitFor(() => (lord.getFlag(MOD, "lastFed") ?? null) !== null, 10000);
      G.ok("2. the hunt: the feeding window puts blood back", !!win && rose && fed,
        {blood: [before, blood()], lastFed: lord.getFlag(MOD, "lastFed") ?? null, take: t?.value ?? null});
    }, {timeout: 60000});

    await G.step("3. court: a refused boon costs the Road of Kings a dot", async () => {
      const liege = "Gate DA Night Liege";
      // record the boon
      let pw = null;
      A.boons({actor: lord});
      await waitFor(() => (pw = titled(/^Prestation$/)), 6000);
      let el = elOf(pw);
      const set = (name, val) => { const f = el?.querySelector?.(`[name=${name}]`); if ( f ) f.value = val; return !!f; };
      set("from", lord.name); set("to", liege); set("kind", "minor"); set("for", "Gate: a night's shelter");
      ok(el)?.click();
      await waitFor(() => !titled(/^Prestation$/), 6000);
      const owedNow = () => (game.journal.find(x => x.getFlag?.(MOD, "kind") === "prestation")?.getFlag(MOD, "entries") ?? [])
        .some(e => e.from === lord.name && e.to === liege && e.status === "owed");
      const recorded = await waitFor(owedNow, 15000);
      // refuse it
      const seen = new Set(game.messages.map(m => m.id));
      A.boons({actor: lord});
      pw = null;
      await waitFor(() => (pw = titled(/^Prestation$/)), 6000);
      el = elOf(pw);
      const opt = [...(el?.querySelectorAll?.("select[name=settle] option") ?? [])].find(o => o.textContent.includes(lord.name) && o.textContent.includes(liege));
      if ( opt ) el.querySelector("select[name=settle]").value = opt.value;
      set("how", "refused");
      ok(el)?.click();
      let card = null;
      await waitFor(() => (card = game.messages.filter(m => !seen.has(m.id) && /a sin\?/.test(m.content ?? "") && (m.content ?? "").includes(lord.name)).at(-1)), 8000);
      const btn = card ? msgEl(card.id)?.querySelector?.('button[data-kx="sin"]') : null;
      const road0 = Number(lord.system.advantages.path.permanent ?? 0);
      btn?.click();
      let sw = null;
      await waitFor(() => (sw = titled(/Sin against the Road/)), 6000);
      const s = elOf(sw);
      const level = s?.querySelector?.("select[name=level]")?.value ?? "";
      const auto = s?.querySelector?.("input[name=automatic]"); if ( auto ) auto.checked = true;
      const lose = s?.querySelector?.("select[name=lose]"); if ( lose ) lose.value = "road";
      ok(s)?.click();
      const dropped = await waitFor(() => Number(lord.system.advantages.path.permanent ?? 0) === road0 - 1, 8000);
      G.ok("3. court: a refused boon costs the Road of Kings a dot", !!opt && !!card && /level 2/.test(card?.content ?? "") && level === "2" && dropped,
        {recorded, settled: !!opt, card: !!card, level, road: [road0, Number(lord.system.advantages.path.permanent ?? 0)]});
    }, {timeout: 120000});

    await G.step("4. the record: the night is in the History journal", async () => {
      const added = () => { const all = histText(); return all.startsWith(histBefore) ? all.slice(histBefore.length) : all; };
      await waitFor(() => /owes Gate DA Night Liege/.test(added()) && /refused/.test(added()), 10000);
      const all = histText(), text = added();
      G.ok("4. the record: the night is in the History journal", /owes Gate DA Night Liege/.test(text) && /refused/.test(text), {page: !!all, rows: (text.match(/<li/g) ?? []).length});
    });

    await G.step("5. dawn: one who fed tonight is not asked about hunger", async () => {
      const asked = await A.hungryAtDawn([lord]);
      G.ok("5. dawn: one who fed tonight is not asked about hunger", Array.isArray(asked) && asked.length === 0, {asked});
    });
  } catch (e) { G.ok("no error", false, {error: e.message}); }
  return G.finish();
}
