/**
 * A mage casts a rote from the core book (B7836, M20 pp. 609-610): in the Cast window, A rote, Talons fills in Life 3
 * and Shape and says what the rote does with its page, and Cast puts the casting on a card (actions.m20-rotes), in
 * Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatem20rote.mjs?${Date.now()}`)).run()
 * It makes its own mage, and removes it; never moves the clock.
 *   1. Cast an Effect, A rote: Talons: Life reads 3, Shape is ticked, and the note names M20 pp. 609-610; How Do You DO
 *      That?'s Chi Healing is offered too (B7837)
 *   2. Cast: a card for the casting, with the Arete roll
 * Result: Data/wodx-gate/gatem20rote-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const el = app => app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;
const winTitled = re => [...foundry.applications.instances.values()].filter(a => a.rendered && re.test(String(a.title ?? a.options?.window?.title ?? ""))).at(-1) ?? null;

export async function run() {
  const G = gate("gatem20rote", {stepTimeout: 240000});
  const since = Date.now();
  const log = foundry.utils.deepClone(game.settings.get("wodx-storyteller", "log"));
  let mage = null;
  const me = () => game.actors.get(mage?.id);
  const win = () => el(winTitled(/^Cast an Effect: Gate Rote Mage/));
  try {
    await G.step("1. Cast an Effect, A rote: Talons fills in Life 3, Shape, and the page", async () => {
      mage = await G.make(Actor, {name: "Gate Rote Mage", type: "Mage", ownership: {default: 3}});
      // set after creating: the create helper resets a new sheet's traits
      await me().update({"system.spheres.life.value": 3, "system.spheres.matter.value": 2, "system.spheres.prime.value": 2, "system.advantages.arete.permanent": 3,
        "system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5});
      // the trigger: the Cast window, as the mage's menu and sheet open it
      game.wodxActions.m20Cast({actor: me()});
      await waitFor(() => win()?.querySelector('select[name="kw-rote"]'), 30000);
      const sel = win().querySelector('select[name="kw-rote"]');
      const opt = [...sel.options].find(o => /^Talons \(M20/.test(o.textContent));
      const offered = [...sel.options].map(o => o.textContent).filter(t => /\((M20|HDYDT) /.test(t));
      sel.value = opt?.value ?? ""; sel.dispatchEvent(new Event("change", {bubbles: true}));
      await waitFor(() => win()?.querySelector('[name="kw-shape"]')?.checked, 15000);
      const life = win().querySelector('select[name="s-life"]')?.value;
      const shape = !!win().querySelector('[name="kw-shape"]')?.checked;
      const note = win().querySelector(".wodx-rote-note")?.textContent ?? "";
      G.ok("1. Cast an Effect, A rote: Talons fills in Life 3, Shape, and the page", !!opt && life === "3" && shape && /M20 pp\. 609-610/.test(note) && !offered.some(t => /Lawn Chair/.test(t)) && offered.includes("Chi Healing (HDYDT p. 65)"),
        {offered, life, shape, note: note.slice(0, 160)});
    });

    await G.step("2. Cast: a card for the casting, with the Arete roll", async () => {
      const n0 = game.messages.contents.filter(m => (m.timestamp ?? 0) >= since).length;
      win().querySelector('button[data-action="ok"]')?.click();
      const card = () => game.messages.contents.filter(m => (m.timestamp ?? 0) >= since && /Gate Rote Mage/.test(`${m.speaker?.alias ?? ""} ${m.content ?? ""} ${m.flavor ?? ""}`)).at(-1);
      await waitFor(() => !!card(), 120000); // a card save in the big lane world can take a minute
      const text = (card()?.content ?? "").replace(/<[^>]+>/g, " ");
      G.ok("2. Cast: a card for the casting, with the Arete roll", !!card() && /Arete|Life/.test(text),
        {before: n0, card: text.replace(/\s+/g, " ").slice(0, 300),
          open: card() ? undefined : [...foundry.applications.instances.values()].filter(a => a.rendered).map(a => String(a.title ?? "")).slice(-5)});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    for ( const w of [...foundry.applications.instances.values()].filter(a => /Gate Rote Mage/.test(String(a.title ?? ""))) ) { try { await w.close(); } catch (e) { /* closed */ } }
    const a = game.actors.getName("Gate Rote Mage");
    if ( a ) { try { await a.delete(); } catch (e) { G.R.notes.push(`actor: ${e?.message ?? e}`); } }
    await new Promise(r => setTimeout(r, 8000));
    for ( const x of game.messages.contents.filter(x => (x.timestamp ?? 0) >= since && /Gate Rote/.test(`${x.speaker?.alias ?? ""} ${x.content ?? ""} ${x.flavor ?? ""}`)) ) { try { await x.delete(); } catch (e) { /* leave it */ } }
    try { await game.settings.set("wodx-storyteller", "log", log); } catch (e) { G.R.notes.push(`log: ${e?.message ?? e}`); }
    return G.finish();
  }
}
