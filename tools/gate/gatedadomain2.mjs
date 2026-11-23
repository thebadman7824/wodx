/**
 * Full check of V20 Dark Ages (B7679-B7684), WoDX Actions: building a domain, the V20 Dark Ages Companion chapter 7.
 * In rothenstein-wodx (or any test world) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedadomain2.mjs?${Date.now()}`)).run()
 *   1. the Domain window: Area 2, Defense 1, Prosperity 2 saved with its Save button (pp. 108-109)
 *   2. Prosperity eases Commerce by 2 and Servants 2 ease Leadership by 2; Secret Ways count only in the manor (pp. 109, 112)
 *   3. too many aspect dots for the Domain are refused (p. 108)
 *   4. Famine takes a dot of Herd (the Populace) for a season, and the season's end gives it back (pp. 110, 114)
 *   5. Outlaws take a dot of Prosperity: Commerce is eased by 1 until the event ends (p. 115)
 *   6. an itinerant court with Status 4 needs four Servants; two more are hired for 1 Resources (p. 114)
 *   7. fealty: Resources 2 anchored for Retainers 4 pools with the vassal's own; cutting the vassal off takes it back
 *      and costs the liege a dot (p. 106)
 *   8. an Anchor too large for what is offered is refused (p. 106)
 * Makes its own actors and scene and removes them, and the fealty journal if it made one.
 * Result: Data/wodx-gate/gatedadomain2-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const DAY = 86400;
const text = m => String((m?.content ?? "") + (m?.flavor ?? "")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const elOf = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;
const windows = () => [...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)];
const titled = re => windows().find(x => re.test(x.title ?? x.options?.window?.title ?? "") && x.rendered);
const bgData = (name, value) => ({name, type: "Feature", system: {type: "wod.types.background", value}});
const bgOf = (a, name) => Number(a?.items?.find(i => i.type === "Feature" && i.name === name)?.system?.value ?? 0);

export async function run() {
  const G = gate("gatedadomain2", {stepTimeout: 90000});
  if ( G.notLive() ) return "gatedadomain2 never runs in the Live world";
  const A = game.modules.get("wodx-actions")?.api;
  const DM = A?.domain;
  const seen = new Set(game.messages.contents.map(x => x.id));
  const fresh = (test, ms = 60000) => { let m = null; return waitFor(() => (m = game.messages.contents.find(x => !seen.has(x.id) && test(x))), ms).then(() => { for ( const x of game.messages.contents ) seen.add(x.id); return m; }).catch(() => null); };
  const hadJournal = !!game.journal.find(x => x.getFlag?.("wodx-actions", "kind") === "fealty");
  const diffOn = (a, tags) => Number(A.powerMods.of(a, {tags})?.diff ?? 0);
  try {
    await waitFor(() => !!DM?.state && !!A?.domainDA && !!A?.powerMods?.of, 90000);
    const scene = await G.scene({name: "WoDX gate: domain"});
    const [lord, liege, vassal] = await G.make(Actor, [
      {name: "Gate DA Lord", type: "Mortal", items: [bgData("Domain", 5), bgData("Servants", 2), bgData("Herd", 3), bgData("Resources", 3)]},
      {name: "Gate DA Liege", type: "Mortal", items: [bgData("Resources", 4)]},
      {name: "Gate DA Vassal", type: "Mortal", items: [bgData("Resources", 1)]}]);

    await G.step("1. the Domain window saves the manor's aspects", async () => {
      A.domainDA({actor: lord});
      let w = null;
      await waitFor(() => (w = titled(/^Domain: Gate DA Lord/)), 20000);
      await new Promise(r => setTimeout(r, 300));
      const el = elOf(w);
      const set = (k, v) => { const i = el.querySelector(`[name="${k}"]`); i.value = String(v); i.dispatchEvent(new Event("change", {bubbles: true})); };
      set("a-area", 2); set("a-defense", 1); set("a-prosperity", 2); set("a-secret", 0);
      el.querySelector('button[data-action="ok"]')?.click();
      await waitFor(() => lord.getFlag("wodx-actions", "domainDA")?.aspects?.prosperity === 2, 20000).catch(() => null);
      const a = lord.getFlag("wodx-actions", "domainDA")?.aspects;
      G.ok("1. the Domain window saves the manor's aspects", a?.area === 2 && a?.defense === 1 && a?.prosperity === 2 && diffOn(lord, ["commerce"]) === -2,
        {aspects: a, commerceDifficulty: diffOn(lord, ["commerce"]), domain: lord.items.getName("Domain")?.system?.value});
    });

    await G.step("2. Prosperity on Commerce, Servants on Leadership, Secret Ways only in the manor", async () => {
      await DM.save(lord, {"a-area": 1, "a-defense": 0, "a-prosperity": 2, "a-secret": 2, manor: false});
      const away = diffOn(lord, ["stealth"]);
      await DM.save(lord, {manor: true});
      const home = diffOn(lord, ["stealth"]);
      G.ok("2. Prosperity on Commerce, Servants on Leadership, Secret Ways only in the manor",
        diffOn(lord, ["commerce"]) === -2 && diffOn(lord, ["leadership"]) === -2 && away === 0 && home === -2 && diffOn(lord, ["melee"]) === 0,
        {commerce: diffOn(lord, ["commerce"]), leadership: diffOn(lord, ["leadership"]), stealthAway: away, stealthHome: home, sceneId: canvas.scene?.id});
    });

    await G.step("3. too many aspect dots are refused", async () => {
      const out = await DM.save(lord, {"a-area": 3, "a-defense": 3});
      const a = lord.getFlag("wodx-actions", "domainDA")?.aspects;
      G.ok("3. too many aspect dots are refused", out === null && a.area === 1 && a.secret === 2, {out, aspects: a});
    });

    await G.step("4. Famine takes a dot of Herd for a season", async () => {
      const h0 = bgOf(lord, "Herd");
      const rec = await DM.event(lord, {key: "famine"});
      const card = await fresh(m => /Famine/.test(text(m)) && /Gate DA Lord/.test(text(m)), 30000);
      const during = bgOf(lord, "Herd");
      const ended = await DM.tick(game.time.worldTime + 92 * DAY);
      const after = bgOf(lord, "Herd");
      G.ok("4. Famine takes a dot of Herd for a season", h0 === 3 && during === 2 && ended >= 1 && after === 3 && !!card && rec?.until > game.time.worldTime,
        {h0, during, after, ended, card: text(card).slice(0, 200)});
    });

    await G.step("5. Outlaws take a dot of Prosperity until the event ends", async () => {
      const rec = await DM.event(lord, {key: "outlaws", choice: 0});
      const during = diffOn(lord, ["commerce"]), eff = DM.state(lord).effective.prosperity;
      await DM.end(lord, rec.id);
      const after = diffOn(lord, ["commerce"]);
      G.ok("5. Outlaws take a dot of Prosperity until the event ends", during === -1 && eff === 1 && after === -2, {during, eff, after});
    });

    await G.step("6. an itinerant court: Servants hired with Resources", async () => {
      const r0 = bgOf(lord, "Resources");
      const rec = await DM.event(lord, {key: "court", overlordStatus: 4});
      const card = await fresh(m => /Itinerant Court/.test(text(m)), 30000);
      const r1 = bgOf(lord, "Resources");
      await DM.end(lord, rec.id);
      G.ok("6. an itinerant court: Servants hired with Resources", r0 === 3 && r1 === 2 && bgOf(lord, "Resources") === 3 && /needs Servants 4/.test(text(card)) && /2 more hired/.test(text(card)),
        {r0, r1, after: bgOf(lord, "Resources"), card: text(card).slice(0, 260)});
    });

    await G.step("7. fealty: the Anchor pools with the vassal's own; cut off, the liege pays a dot", async () => {
      const e = await DM.swear({liege, vassal, anchorBg: "Resources", anchorDots: 2, offered: "Retainers 4", duties: "40 days of service"});
      const pooled = bgOf(vassal, "Resources");
      const sworn = DM.oaths().filter(x => x.status === "sworn" && x.vassal === "Gate DA Vassal").length;
      await DM.endOath(e.id, "cut");
      G.ok("7. fealty: the Anchor pools with the vassal's own; cut off, the liege pays a dot",
        pooled === 3 && sworn === 1 && bgOf(vassal, "Resources") === 1 && bgOf(liege, "Resources") === 3 && /cut off/.test(DM.oaths().find(x => x.id === e.id)?.status ?? ""),
        {pooled, sworn, vassalAfter: bgOf(vassal, "Resources"), liegeAfter: bgOf(liege, "Resources"), status: DM.oaths().find(x => x.id === e.id)?.status});
    });

    await G.step("8. an Anchor too large for the offer is refused", async () => {
      const out = await DM.swear({liege, vassal, anchorBg: "Resources", anchorDots: 2, offered: "Retainers 2"});
      G.ok("8. an Anchor too large for the offer is refused", out === null && bgOf(vassal, "Resources") === 1, {out, vassal: bgOf(vassal, "Resources")});
    });
  } catch ( err ) { G.ok("no error", false, {error: String(err?.stack ?? err)}); }
  finally {
    if ( !hadJournal ) await game.journal.find(x => x.getFlag?.("wodx-actions", "kind") === "fealty")?.delete?.().catch(() => null);
  }
  return G.finish();
}
