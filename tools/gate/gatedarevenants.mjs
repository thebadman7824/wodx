/**
 * Revenant families in every era (B7840-B7848): WoDX Creation, WoDX Actions, WoDX Chronicle, WoDX Combat.
 * In rothenstein-wodx (or any test world in the Dark Ages, before 1494) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedarevenants.mjs?${Date.now()}`)).run()
 *   1. the revenant window, opened from the Creation window's button, lists the Dark Ages families of the year and
 *      no family not yet founded; a Khavi is marked through the window's own button (V20 Dark Ages p. 454)
 *   2. the Khavi in direct sunlight, through the hazard window: bashing damage on the health track, a Stamina +
 *      Fortitude soak on the card (soak dice forced to ones)
 *   3. New Night gives the Khavi a blood point back from its own vitae (V20 p. 500)
 *   4. a Dark Ages Grimaldi holds 8 blood points; a Bratovich's frenzy roll is two harder (trait effects)
 *   5. a Danislav takes aggravated damage from a silver blade (WoDX Combat reads Chronicle's toughness)
 *   6. a Basarab shown a holy symbol rolls Willpower from the Family weakness window (dice forced to ones: must leave)
 *   7. a Vlaszy swears the oath to a Fiend from the window: a full bond in the lineage
 * Makes its own actors and scene and removes them. Result: Data/wodx-gate/gatedarevenants-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const text = m => String((m?.content ?? "") + (m?.flavor ?? "")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const elOf = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;
const windows = () => [...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)];
const titled = re => windows().find(x => re.test(x.title ?? x.options?.window?.title ?? "") && x.rendered);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const setField = (root, name, value) => { const el = root?.querySelector?.(`[name="${name}"]`); if ( el ) { el.value = value; el.dispatchEvent(new Event("change", {bubbles: true})); } return !!el; };

export async function run() {
  const G = gate("gatedarevenants", {stepTimeout: 120000});
  if ( G.notLive() ) return "gatedarevenants never runs in the Live world";
  const A = () => game.wodxActions;
  const C = () => game.modules.get("wodx-creation")?.api;
  const CH = () => game.modules.get("wodx-chronicle")?.api;
  const WC = () => game.modules.get("wodx-combat")?.api;
  const seen = new Set(game.messages.contents.map(x => x.id));
  const fresh = (test, ms = 60000) => { let m = null; return waitFor(() => (m = game.messages.contents.find(x => !seen.has(x.id) && test(x))), ms).then(() => { for ( const x of game.messages.contents ) seen.add(x.id); return m; }).catch(() => null); };
  const dice0 = CONFIG.Dice.randomUniform;
  const ones = () => { CONFIG.Dice.randomUniform = () => 0.01; };
  const stored = key => game.settings.storage.get("world").getSetting?.(key) ?? null;
  const WRITTEN = ["wodx-chronicle.nightWork"];
  const writtenBefore = Object.fromEntries(WRITTEN.map(k => [k, stored(k)?.toObject?.() ?? null]));
  let nightRan = false;
  try {
    await waitFor(() => !!C()?.revenant?.mark && !!C()?.open && !!A()?.hazard && !!A()?.newNight && !!CH()?.traits?.toughness, 90000);
    const year = Number(CH().eras.currentYear()) || 0;
    if ( year >= 1494 ) G.R.notes.push(`the clock stands in ${year}: the Dark Ages families are gone, so steps 1-7 cannot pass here`);
    const scene = await G.scene({name: "WoDX gate: revenants"});
    const [khavi, grim, brat, dani, basa, vlas, fiend] = await G.make(Actor, [
      {name: "Gate Rev Khavi", type: "Mortal"}, {name: "Gate Rev Grimaldi", type: "Mortal"}, {name: "Gate Rev Bratovich", type: "Mortal"},
      {name: "Gate Rev Danislav", type: "Mortal"}, {name: "Gate Rev Basarab", type: "Mortal"}, {name: "Gate Rev Vlaszy", type: "Mortal"},
      {name: "Gate Rev Fiend", type: "Vampire"}]);
    await khavi.update({"system.attributes.stamina.value": 2});
    await basa.update({"system.advantages.willpower.permanent": 3, "system.advantages.willpower.temporary": 3});
    const [kt, dt] = await G.tokens(scene, [{actor: khavi, x: 3, y: 3}, {actor: dani, x: 5, y: 3}]);
    const K = () => scene.tokens.get(kt.id)?.actor ?? khavi;

    await G.step("1. the revenant window lists the year's families and marks a Khavi", async () => {
      await C().open();
      let app = null;
      await waitFor(() => (app = titled(/^Creation and experience/)), 20000);
      for ( const old of windows().filter(x => /^A revenant/.test(x.title ?? "") && x.rendered) ) await old.close?.();
      elOf(app)?.querySelector?.('button[data-action="revenant"]')?.click();
      let w = null;
      await waitFor(() => (w = titled(/^A revenant/)), 20000);
      const root = elOf(w);
      const offered = [...(root?.querySelectorAll?.("select[name=family] option") ?? [])].map(o => o.value);
      setField(root, "mortal", khavi.id);
      setField(root, "family", "khavi");
      await sleep(300);
      root?.querySelector?.('button[data-action="ok"]')?.click();
      await waitFor(() => !!K().flags?.["wodx-creation"]?.revenant, 30000).catch(() => null);
      const card = await fresh(m => /A revenant/.test(text(m)) && /Khavi/.test(text(m)), 30000);
      const rev = K().flags?.["wodx-creation"]?.revenant;
      const want = ["khavi", "vlaszy", "danislav", "basarab", "szantovich"].every(k => offered.includes(k));
      const notYet = ["oprichniki", "rossellini", "katayama"].every(k => !offered.includes(k));
      G.ok("1. the revenant window lists the year's families and marks a Khavi", want && notYet && rev?.family === "khavi" && rev?.mark?.sun === "bashing" && !!card,
        {year, offered, family: rev?.family, mark: rev?.mark, card: text(card).slice(0, 200)});
      await app?.close?.();
    });

    await G.step("2. the Khavi in direct sunlight takes bashing damage, soaked with Stamina and Fortitude", async () => {
      await K().update({"system.health.damage.bashing": 0, "system.health.damage.lethal": 0, "system.health.damage.aggravated": 0});
      for ( const old of windows().filter(x => /^Sunlight, fire and falls/.test(x.title ?? "") && x.rendered) ) await old.close?.();
      A().hazard({actor: K(), kind: "sun"});
      let w = null;
      await waitFor(() => (w = titled(/^Sunlight, fire and falls/)), 20000);
      const root = elOf(w);
      setField(root, "light", "direct"); setField(root, "exposure", "1"); setField(root, "turns", "1");
      const rot = root?.querySelector?.("[name=rot]"); if ( rot ) rot.checked = false;
      await sleep(300);
      ones();
      root?.querySelector?.('button[data-action="ok"]')?.click();
      const card = await fresh(m => /sunlight/i.test(text(m)) && /Khavi/.test(text(m)), 45000);
      CONFIG.Dice.randomUniform = dice0;
      let applied = false;
      if ( card && !Number(K().system?.health?.damage?.bashing) ) {
        const b = [...(document.querySelectorAll(`[data-message-id="${card.id}"] button`) ?? [])].find(x => /Apply/.test(x.textContent ?? ""));
        if ( b ) { b.click(); applied = true; }
      }
      await waitFor(() => Number(K().system?.health?.damage?.bashing) > 0, 20000).catch(() => null);
      const h = K().system?.health?.damage ?? {};
      G.ok("2. the Khavi in direct sunlight takes bashing damage, soaked with Stamina and Fortitude", !!card && /Stamina \+ Fortitude soak/.test(text(card)) && Number(h.bashing) > 0 && !Number(h.lethal) && !Number(h.aggravated),
        {card: text(card).slice(0, 260), health: {b: h.bashing, l: h.lethal, a: h.aggravated}, applied});
    });

    await G.step("3. New Night: a blood point back from the family's vitae", async () => {
      await K().update({"system.advantages.bloodpool.temporary": 1});
      nightRan = true;
      await A().newNight({actors: [K()]});
      await waitFor(() => Number(K().system.advantages.bloodpool.temporary) === 2, 60000).catch(() => null);
      G.ok("3. New Night: a blood point back from the family's vitae", Number(K().system.advantages.bloodpool.temporary) === 2, {blood: K().system.advantages.bloodpool.temporary});
    }, {timeout: 150000});

    await G.step("4. a Grimaldi holds 8; a Bratovich frenzies two harder", async () => {
      await C().revenantBirth(grim, {family: "grimaldi"});
      await C().revenantBirth(brat, {family: "bratovich"});
      const max = Number(grim.system?.advantages?.bloodpool?.max);
      const eff = CH().traits.effects(brat, {channel: "roll", tags: ["frenzy"]});
      const step = eff.filter(e => e.key === "revenant-frenzy").reduce((s, e) => s + e.diff, 0);
      const none = CH().traits.effects(grim, {channel: "roll", tags: ["frenzy"]}).filter(e => e.key === "revenant-frenzy").length;
      G.ok("4. a Grimaldi holds 8; a Bratovich frenzies two harder", max === 8 && step === 2 && none === 0, {max, step, none});
    });

    await G.step("5. a Danislav takes aggravated damage from silver", async () => {
      await C().revenantBirth(dani, {family: "danislav"});
      const D = () => scene.tokens.get(dt.id)?.actor ?? dani;
      const t = CH().traits.toughness(D());
      G.ok("5. a Danislav takes aggravated damage from silver", !!t?.silver && (t.names ?? []).some(n => /Revenant family: silver/.test(n)), {silver: t?.silver, names: t?.names, combat: !!WC()});
    });

    await G.step("6. a Basarab shown a holy symbol rolls Willpower and must leave", async () => {
      await C().revenantBirth(basa, {family: "basarab"});
      for ( const old of windows().filter(x => /^Family weakness/.test(x.title ?? "") && x.rendered) ) await old.close?.();
      C().revenant.weakness(basa);
      let w = null;
      await waitFor(() => (w = titled(/^Family weakness/)), 20000);
      const root = elOf(w);
      setField(root, "repel", "holy symbol");
      await sleep(300);
      ones();
      root?.querySelector?.('button[data-action="ok"]')?.click();
      const card = await fresh(m => /faces holy symbol/.test(text(m)), 30000);
      CONFIG.Dice.randomUniform = dice0;
      G.ok("6. a Basarab shown a holy symbol rolls Willpower and must leave", !!card && /must leave its presence/.test(text(card)) && /at 6/.test(text(card)), {card: text(card).slice(0, 220)});
    });

    await G.step("7. a Vlaszy swears the oath from the window", async () => {
      await C().revenantBirth(vlas, {family: "vlaszy"});
      for ( const old of windows().filter(x => /^Family weakness/.test(x.title ?? "") && x.rendered) ) await old.close?.();
      C().revenant.weakness(vlas);
      let w = null;
      await waitFor(() => (w = titled(/^Family weakness/)), 20000);
      const root = elOf(w);
      setField(root, "regnant", fiend.id);
      await sleep(300);
      root?.querySelector?.('button[data-action="ok"]')?.click();
      const card = await fresh(m => /swears the oath/.test(text(m)), 30000);
      const bond = vlas.flags?.["wodx-creation"]?.lineage?.bonds?.[fiend.id];
      G.ok("7. a Vlaszy swears the oath from the window", !!card && Number(bond?.drinks) >= 3 && vlas.flags?.["wodx-creation"]?.revenant?.oath?.id === fiend.id, {bond, card: text(card).slice(0, 160)});
    });
  } catch ( err ) { G.ok("no error", false, {error: String(err?.stack ?? err)}); }
  finally {
    CONFIG.Dice.randomUniform = dice0;
    if ( nightRan ) {
      // the night's log is written a while after New Night on a slow lane: let it land, then put it back
      await sleep(40000);
      for ( const k of WRITTEN ) {
        const now = stored(k), was = writtenBefore[k];
        if ( !was && now ) await now.delete().catch(() => null);
        else if ( was && now && now.value !== was.value ) await now.update({value: was.value}).catch(() => null);
      }
    }
  }
  return G.finish();
}
