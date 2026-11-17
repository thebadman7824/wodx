/**
 * Final audit (B6755-B6758): things that only told now change the world. In rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateworldacts.mjs?${Date.now()}`)).run()
 *   1. a sealed cellar put in a haven: a shade region on the haven's map, and the owner's day haven in Sun and haven
 *   2. shutters: the haven's scene counts as indoors for WoDX Actions' sun
 *   3. a show room: a region for guests, and a deed on the owner's standing (WoDX NPC)
 *   4. an overfed district's dead: a named vessel is filed in "WoDX · The Dead"
 *   5. a Fetter lost to neglect, approved with the approval window's Approve: the card's Face the Harrowing opens the Harrowing
 *   6. a threat made openly and won: a public deed, standing down one
 *   7. a sermon that moved its hearers (the Following's preach): a public deed, standing up one
 * The Lone Chronicle's Chronicle options (B6757) need the mode on and a player; tools/harness/solo-options.test.mjs runs them.
 * Dice are fixed through CONFIG.Dice.randomUniform for steps 5 and 7, and put back.
 * Result: Data/wodx-gate/gateworldacts-result.json.
 */
import {gate} from "./kit.mjs";

const ST = "wodx-storyteller", CH = "wodx-chronicle", NPC = "wodx-npc", ACT = "wodx-actions";
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 6000) { const t = Date.now(); while ( Date.now() - t < ms ) { if ( fn() ) return true; await sleep(100); } return !!fn(); }
const windows = () => [...(foundry.applications.instances?.values?.() ?? [])];
const titled = re => windows().find(w => re.test(w.title ?? w.options?.window?.title ?? ""));
const deedsOf = a => game.actors.get(a.id)?.flags?.[NPC]?.deeds ?? [];

export async function run() {
  const G = gate("gateworldacts");
  if ( G.notLive() ) return "Not on the Live world.";
  const api = () => game.modules.get(ST)?.api, Q = () => game.modules.get(CH)?.api?.approvals;
  const T = CONFIG.worldofdarkness?.sheettype ?? {};
  const uniform = CONFIG.Dice.randomUniform;
  const LAPSE = `${ST}.tieLapse`;
  const auto0 = foundry.utils.deepClone(game.settings.get(CH, "autoApprove") ?? {});
  try {
    const player = game.users.find(u => !u.isGM);
    const own = player ? {[player.id]: 3} : {};
    const [vera, agnes, wil, anna, hearer] = await G.make(Actor, [
      {name: "Gate Works Vera", type: T.vampire ?? "Vampire", ownership: {default: 0, ...own}},
      {name: "Gate Herd Agnes", type: T.mortal ?? "Mortal"},
      {name: "Gate Fetter Wilhelm", type: T.wraith ?? "Wraith", ownership: {default: 0, ...own}},
      {name: "Gate Deeds Anna", type: T.mortal ?? "Mortal", ownership: {default: 0, ...own}},
      {name: "Gate Deeds Listener", type: T.mortal ?? "Mortal"}]);
    const scene = await G.scene();
    await G.tokens(scene, [{actor: vera, x: 2, y: 2}, {actor: anna, x: 5, y: 5}, {actor: hearer, x: 6, y: 5}]);
    await scene.update({[`flags.${ST}.haven`]: {name: "Gate haven", owners: [vera.id], security: 0}});

    await G.step("1. a sealed cellar: a shade region, and the owner's day haven", async () => {
      await api().havenWorks.install(scene, "cellar");
      const r = scene.regions.find(x => x.flags?.[ST]?.havenWork === "cellar");
      const shade = r?.behaviors?.some?.(b => b.type === `${ACT}.sunlight` && b.system?.light === "shade");
      const h = game.actors.get(vera.id).flags?.[ACT]?.haven;
      G.ok("1. a sealed cellar: a shade region, and the owner's day haven", !!r && /shade/i.test(r.name) && h?.regionId === r?.id,
        {region: r?.name ?? null, behavior: !!shade, haven: h ?? null});
    });

    await G.step("2. shutters: indoors for the sun", async () => {
      await api().havenWorks.install(scene, "shutters");
      G.ok("2. shutters: indoors for the sun", scene.getFlag(ACT, "light") === "indoors", {light: scene.getFlag(ACT, "light") ?? null});
    });

    await G.step("3. a show room: a region for guests, and a deed on standing", async () => {
      const before = deedsOf(vera).length;
      const year = Number(game.modules.get(CH)?.api?.eras?.currentYear?.()) || 1197;
      const key = year < 1600 ? "show-hall" : year < 1900 ? "show-salon" : "show-room";
      await api().havenWorks.install(scene, key);
      const r = scene.regions.find(x => x.flags?.[ST]?.havenWork === key);
      const d = deedsOf(vera).slice(before);
      G.ok("3. a show room: a region for guests, and a deed on standing", !!r && d.length === 1 && d[0].delta === 1, {key, region: r?.name ?? null, deeds: d});
    });

    await G.step("4. an overfed district's dead: a named vessel among the dead", async () => {
      const names = await api().upkeep.herds.buryDead(1, [{uuid: agnes.uuid, name: agnes.name}]);
      const a = game.actors.get(agnes.id);
      G.ok("4. an overfed district's dead: a named vessel among the dead", names.includes(agnes.name) && a?.folder?.name === "WoDX · The Dead",
        {names, folder: a?.folder?.name ?? null, died: a?.flags?.["wodx-creation"]?.chronology?.died ?? null});
    });

    await G.step("5. a Fetter lost to neglect: Face the Harrowing opens the Harrowing", async () => {
      const aside = {...auto0}; delete aside[LAPSE];
      await game.settings.set(CH, "autoApprove", aside);
      const [fet] = await game.actors.get(wil.id).createEmbeddedDocuments("Item", [{name: "Gate Fetter: the mill", type: "Feature", system: {type: "fetter", value: 1}}]);
      const t0 = Date.now();
      await Q().propose({type: LAPSE, key: `gate-lapse:${wil.id}`, title: "Gate: the mill untended", detail: "Gate", data: {actorId: wil.id, itemId: fet.id, how: "neglect", name: "The mill", key: "fetter"}});
      const p = Q().pending().find(x => x.type === LAPSE && x.data?.actorId === wil.id);
      CONFIG.Dice.randomUniform = () => 0.999; // every face a 1: a botch, the Fetter falls to 0
      Q().ApprovalsApp.open(); await sleep(700);
      const b = p ? document.querySelector(`#wodx-approvals [data-action=approve][data-id="${p.id}"]`) : null;
      if ( b ) b.click(); else if ( p ) await Q().decide(p.id, "approve");
      await until(() => game.messages.contents.some(m => m.timestamp >= t0 && m.flags?.[ST]?.harrow?.actorId === wil.id), 6000);
      CONFIG.Dice.randomUniform = uniform;
      const card = game.messages.contents.find(m => m.timestamp >= t0 && m.flags?.[ST]?.harrow?.actorId === wil.id);
      await ui.chat?.render?.(); await sleep(500);
      const el = card ? document.querySelector(`#chat [data-message-id="${card.id}"] [data-action=wst-harrow], .chat-log [data-message-id="${card.id}"] [data-action=wst-harrow]`) : null;
      el?.click(); await until(() => !!titled(/Harrowing/), 4000);
      const w = titled(/Harrowing/);
      G.ok("5. a Fetter lost to neglect: Face the Harrowing opens the Harrowing", !!card && !!el && !!w,
        {queued: !!p, clicked: !!b, card: !!card, button: !!el, window: w?.title ?? null, value: game.actors.get(wil.id)?.items?.get(fet.id)?.system?.value});
      await w?.close?.();
    });

    await G.step("6. a threat made openly and won: a public deed", async () => {
      const before = deedsOf(anna).length;
      Hooks.callAll("wodxSocial", {actor: game.actors.get(anna.id), npc: game.actors.get(hearer.id), act: "threaten", result: "win"});
      await until(() => deedsOf(anna).length > before, 4000);
      const d = deedsOf(anna).slice(before);
      G.ok("6. a threat made openly and won: a public deed", d.length === 1 && d[0].delta === -1 && /openly/.test(d[0].text), {deeds: d});
    });

    await G.step("7. a sermon that moved its hearers: a public deed", async () => {
      await game.settings.set(NPC, "cultsOn", true);
      const before = deedsOf(anna).length;
      CONFIG.Dice.randomUniform = () => 0.001; // every face a 10
      try { await game.modules.get(NPC).api.cults.preach({actorId: anna.id, text: "Gate: repent", pool: "leadership"}); }
      finally { CONFIG.Dice.randomUniform = uniform; }
      await until(() => deedsOf(anna).length > before, 4000);
      const d = deedsOf(anna).slice(before);
      G.ok("7. a sermon that moved its hearers: a public deed", d.length === 1 && d[0].delta === 1 && /preached/.test(d[0].text), {deeds: d});
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally {
    CONFIG.Dice.randomUniform = uniform;
    try {
      for ( const p of Q()?.pending?.() ?? [] ) if ( p.type === LAPSE && /^Gate/.test(String(p.title)) ) await Q().decide(p.id, "reject", "gate cleanup");
      await game.settings.set(CH, "autoApprove", auto0);
    } catch (e) { G.R.errors.push(`cleanup: ${e?.message ?? e}`); }
    return G.finish();
  }
}
