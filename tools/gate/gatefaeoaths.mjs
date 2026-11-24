/**
 * Gate for B7866-B7869: fae oaths kept by the village (Dark Ages: Fae pp. 33-39, 67-74, 85, 94, 108-110, 183, 204;
 * Dark Ages: Mage p. 194). Makes its own fae, mortals and town name; puts the oath and Ledger settings back afterwards.
 *   1. the window opens from the Storyteller's api
 *   2. an Iron Oath recorded with a fae is written on that fae's sheet, active
 *   3. the humans break it (the window's button): the sheet oath stops shielding, and the card gives the punishment and the Court's way
 *   4. a Stone Oath washes away when its human is baptised; a Gold Oath stays
 *   5. a town's rising (wodxTown "rising") breaks the oath that rules it
 *   6. a brownie: a gift offends it and the chores stop; a spurned sprite opens a Ledger consequence
 *   7. faerie food marks the mortal for a day
 *   8. a servant who raises a hand to the master (the window's button) takes the master's Mists in aggravated damage
 * Run: await (await import(`/wodx-gate/gatefaeoaths.mjs?${Date.now()}`)).run()
 */
import {gate, waitFor} from "./kit.mjs";

const ST = "wodx-storyteller", ACT = "wodx-actions";
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run() {
  const G = gate("gatefaeoaths", {stepTimeout: 45000});
  const api = () => game.modules.get(ST)?.api?.upkeep?.faeOaths;
  const keep = {oaths: foundry.utils.deepClone(game.settings.get(ST, "faeOaths")), ledger: foundry.utils.deepClone(game.settings.get(ST, "ledger"))};
  const t0 = Date.now();
  const cards = () => game.messages.contents.filter(m => m.timestamp >= t0 && m.content?.includes("wst-fae-oaths"));
  const sheet = a => (game.actors.get(a.id)?.getFlag(ACT, "daFae")?.oaths ?? []);
  try {
    const [fae, ola, ivo, hob] = await G.make(Actor, [{name: "Gate Oaths: Ash", type: "Mortal"}, {name: "Gate Oaths: Ola", type: "Mortal"},
      {name: "Gate Oaths: Ivo", type: "Mortal"}, {name: "Gate Oaths: Servant", type: "Mortal"}]);
    await fae.setFlag(ACT, "daFae", {origin: "firstborn", court: "summer", mists: {perm: 3, temp: 3}, weaving: {perm: 3, temp: 3}, dominions: {day: 1}, oaths: []});
    const base = {fae: [{id: fae.id, name: fae.name}], deal: "bring a stag each week", duty: "cook it and give half back", faeBreaks: "no stag comes",
      humanBreaks: "the half is kept", punishFae: "always fail the hunt", punishHuman: "never eat venison again without falling ill"};

    await G.step("1. the window opens", async () => {
      await api().open(); await sleep(500);
      const app = foundry.applications.instances.get("wodx-fae-oaths");
      G.ok("1. the window opens", !!app?.rendered && !!app.element.querySelector("[data-action=add]"), {});
      await app?.close();
    });

    let iron = null;
    await G.step("2. an Iron Oath goes on the fae's sheet", async () => {
      iron = await api().saveOath({...base, tier: "iron", rating: 2, court: "summer", humans: [{id: ola.id, name: ola.name}]});
      await waitFor(() => sheet(fae).some(o => o.ledgerId === iron.id), 4000);
      const s = sheet(fae).find(o => o.ledgerId === iron.id);
      G.ok("2. an Iron Oath goes on the fae's sheet", s?.active === true && s.kind === "iron" && s.rating === 2, {sheet: sheet(fae)});
    });

    await G.step("3. the humans break it (the window's button): no shield, the punishment card", async () => {
      await api().open(); await sleep(500);
      const app = foundry.applications.instances.get("wodx-fae-oaths");
      app.element.querySelector(`button[data-action=brk][data-side=human][data-id="${iron.id}"]`).click();
      await waitFor(() => sheet(fae).find(o => o.ledgerId === iron.id)?.active === false, 4000);
      const c = cards().at(-1)?.content ?? "";
      G.ok("3. the humans break it (the window's button): no shield, the punishment card", sheet(fae).find(o => o.ledgerId === iron.id)?.active === false && /venison/.test(c) && /Summer fae/.test(c),
        {sheet: sheet(fae), card: c.slice(0, 300)});
      await app.close();
    });

    await G.step("4. baptism washes the Stone Oath; the Gold Oath stays", async () => {
      const stone = await api().saveOath({...base, tier: "stone", rating: 3, court: "spring", humans: [{id: ivo.id, name: ivo.name}]});
      const gold = await api().saveOath({...base, ...api().rules.MODELS.apple, fae: base.fae, humans: [{id: ivo.id, name: ivo.name}]});
      await waitFor(() => sheet(fae).some(o => o.ledgerId === gold.id), 4000);
      const r = await api().baptise({id: ivo.id, name: ivo.name});
      await sleep(300);
      G.ok("4. baptism washes the Stone Oath; the Gold Oath stays", r.gone.includes(stone.id) && !r.gone.includes(gold.id)
        && !sheet(fae).some(o => o.ledgerId === stone.id) && sheet(fae).find(o => o.ledgerId === gold.id)?.active === true, {gone: r.gone, sheet: sheet(fae)});
    });

    await G.step("5. a rising breaks the oath that rules the town", async () => {
      const town = `gate-oath-town-${t0}`;
      const rule = await api().saveOath({...base, tier: "iron", rating: 1, court: "autumn", humans: [{id: ola.id, name: ola.name}], town, lordship: true});
      Hooks.callAll("wodxTown", {town, kind: "rising", text: "The gate town rises.", big: true, name: "Gate town"});
      await waitFor(() => api().state().oaths.find(o => o.id === rule.id)?.state === "broken", 5000);
      G.ok("5. a rising breaks the oath that rules the town", api().state().oaths.find(o => o.id === rule.id)?.state === "broken"
        && sheet(fae).find(o => o.ledgerId === rule.id)?.active === false, {state: api().state().oaths.find(o => o.id === rule.id)});
    });

    await G.step("6. household helpers: a gift offends a brownie; a spurned sprite comes due on the Ledger", async () => {
      const b = await api().saveHelper({kind: "brownie", name: "Gate Hob", household: "the gate farm"});
      await api().slightHelper(b.id, "gift");
      const sp = await api().saveHelper({kind: "sprite", name: "Gate Sprite", household: "the gate farm"});
      await api().slightHelper(sp.id, "holy");
      await sleep(400);
      const st = api().state(), led = game.modules.get(ST).api.ledger.state();
      const due = led.entries.find(e => e.kind === "consequence" && e.from?.name === "Gate Sprite");
      G.ok("6. household helpers: a gift offends a brownie; a spurned sprite comes due on the Ledger",
        st.helpers.find(h => h.id === b.id)?.mood === "offended" && !api().rules.doesChores(st.helpers.find(h => h.id === b.id))
        && st.helpers.find(h => h.id === sp.id)?.mood === "spiteful" && !!due && due.due > game.time.worldTime, {helpers: st.helpers, due});
    });

    await G.step("7. faerie food marks the mortal for a day", async () => {
      await api().eatFood(ola);
      const f = game.actors.get(ola.id).getFlag(ACT, "faerieFood");
      G.ok("7. faerie food marks the mortal for a day", api().rules.foodActive(f, game.time.worldTime) && !api().rules.foodActive(f, game.time.worldTime + 86401)
        && api().rules.afterFood(2, f, game.time.worldTime) === 1, {flag: f});
    });

    await G.step("8. raising a hand to the master (pressed in the window): the master's Mists in aggravated", async () => {
      const before = Number(game.actors.get(hob.id).system.health?.damage?.aggravated ?? 0);
      await api().open(); await sleep(500);
      const app = foundry.applications.instances.get("wodx-fae-oaths"), el = app.element;
      const f = el.querySelector("form.wst-retinue");
      f.elements.servant.value = hob.id; f.elements.master.value = fae.id;
      f.querySelector("button[data-action=harm]").click();
      await waitFor(() => Number(game.actors.get(hob.id).system.health?.damage?.aggravated ?? 0) > before, 5000);
      const after = Number(game.actors.get(hob.id).system.health?.damage?.aggravated ?? 0);
      await app.close();
      G.ok("8. raising a hand to the master (pressed in the window): the master's Mists in aggravated", after - before === 3, {before, after});
    });
  } catch (e) {
    G.R.errors.push(String(e?.stack ?? e));
  } finally {
    try { await game.settings.set(ST, "faeOaths", keep.oaths); await game.settings.set(ST, "ledger", keep.ledger); } catch (e) { G.R.errors.push(`restore: ${e.message}`); }
    for ( const m of game.messages.contents.filter(m => m.timestamp >= t0 && m.content?.includes("wst-fae-oaths")) ) { try { await m.delete(); } catch {} }
    return G.finish();
  }
}
