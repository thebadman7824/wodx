/**
 * Dark Ages depth desk item 6 (B7638-B7640): a domain someone else wants. In rothenstein-wodx (or any test world) as a
 * Gamemaster:
 *   await (await import(`/wodx-gate/gatedadomain.mjs?${Date.now()}`)).run()
 *   1. a player's vampire holds a market as its faction's domain (security 2); an NPC vampire of another faction hunts
 *      there, and the hunt is a trespass at +2
 *   2. the NPC's meal leaves signs in the domain: a card for the Storyteller and the holder's players, three signs,
 *      a Track button for the holder, and the district's herd gives one
 *   3. the holder tracks the poacher from the card: Perception + Investigation at 4 (6, less 2 for security; V20 Dark
 *      Ages p. 180), and a success names the poacher and the law it broke
 *   4. the Storyteller's side: the holder's faction thinks worse of the poacher's (queued or applied), and the holder's
 *      History page has the tracking
 * Makes its own scene, actors and factions; puts back the factions record, the faction mode and the approval queue.
 * Result: Data/wodx-gate/gatedadomain-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-npc";
const FX = () => game.modules.get(MOD)?.api?.factions;
const msgEl = id => ui.chat.element?.querySelector(`[data-message-id="${id}"]`) ?? document.querySelector(`#chat [data-message-id="${id}"]`);
/** The card as the chat log shows it, or, when the log has not drawn it, rendered here with the same hook. */
async function shown(m) {
  if ( !m ) return null;
  await waitFor(() => !!msgEl(m.id), 3000);
  const el = msgEl(m.id);
  if ( el ) return el;
  const html = await m.renderHTML();
  Hooks.callAll("renderChatMessageHTML", m, html, {});
  return html;
}

export async function run() {
  const G = gate("gatedadomain");
  if ( G.notLive() ) return "gatedadomain never runs in the Live world";
  const keep = {};
  try {
    await waitFor(() => !!FX()?.hunt && !!FX()?.poachCard, 30000);
    keep.factions = foundry.utils.deepClone(game.settings.get(MOD, "factions"));
    keep.mode = game.settings.get(MOD, "factionMode");
    try { keep.approvals = foundry.utils.deepClone(game.settings.get("wodx-chronicle", "approvals")); } catch (e) { keep.approvals = undefined; }
    try { if ( game.settings.get("wodx-actions", "historyLog") !== true ) await game.settings.set("wodx-actions", "historyLog", true); } catch (e) { /* absent */ }
    await game.settings.set(MOD, "factionMode", "auto");
    // herd pools on for the run (allowed 22 Nov 2026 to test the merges fully), put back after
    try { keep.herd = game.settings.get("wodx-storyteller", "herdPools"); if ( keep.herd !== true ) await game.settings.set("wodx-storyteller", "herdPools", true); } catch (e) { keep.herd = undefined; }
    const market = await G.make(Scene, {name: "Gate DA Domain Market Square", width: 1000, height: 1000, grid: {size: 100, type: 1}});
    const vamp = (name, extra = {}) => ({name, type: "Vampire", system: {advantages: {bloodpool: {temporary: 3, max: 10}}, ...extra}});
    const [holder, poacher] = await G.make(Actor, [
      {...vamp("Gate DA Domain Holder", {attributes: {perception: {value: 5, total: 5}}, abilities: {investigation: {value: 5, isvisible: true}}}), ownership: {default: 3}},
      vamp("Gate DA Domain Poacher", {attributes: {wits: {value: 5, total: 5}}, abilities: {streetwise: {value: 5, isvisible: true}}})]);
    const R = FX().rules;
    await FX().applyNow([
      {op: "faction-add", faction: R.normFaction({id: "gateDomainFief", name: "Gate DA Fief", kind: "kindred", leader: holder.id, members: [holder.id], places: [market.uuid], assets: {domain: 2, security: 2}})},
      {op: "faction-add", faction: R.normFaction({id: "gateDomainRival", name: "Gate DA Rival Coterie", kind: "kindred", leader: poacher.id, members: [poacher.id]})}]);
    const herdFeeds = () => Number(market.getFlag("wodx-storyteller", "herd")?.feeds ?? 0);
    const feeds0 = herdFeeds();
    let hunt = null;

    await G.step("1. an NPC hunting in a player's domain trespasses, at +2 for its security", async () => {
      const seen = new Set(game.messages.map(m => m.id));
      for ( let i = 0; i < 4 && !hunt?.caught; i++ ) hunt = await FX().hunt(poacher, market.uuid, {method: "wits+streetwise", hours: 8});
      G.ok("1. an NPC hunting in a player's domain trespasses, at +2 for its security", holder.hasPlayerOwner && hunt?.trespass?.faction === "gateDomainFief"
        && hunt.trespass.security === 2 && !!hunt.caught, {pc: holder.hasPlayerOwner, trespass: hunt?.trespass ?? null, difficulty: hunt?.difficulty, pool: hunt?.pool, caught: !!hunt?.caught,
        cards: game.messages.filter(m => !seen.has(m.id)).length});
    }, {timeout: 90000});

    let card = null, cardEl = null;
    await G.step("2. the meal leaves signs in the domain, with a Track button for the holder", async () => {
      await waitFor(() => (card = game.messages.contents.filter(m => m.flags?.[MOD]?.poach?.poacher === poacher.id).at(-1)), 8000);
      const el = await shown(card);
      cardEl = el;
      const signs = (card?.content ?? "").match(/<li>/g)?.length ?? 0;
      const btn = el?.querySelector?.(`button.wnpc-f-track[data-actor="${holder.id}"]`);
      const herdApi = !!game.modules.get("wodx-storyteller")?.api?.upkeep?.herds, herdOn = game.modules.get("wodx-storyteller")?.api?.upkeep?.herds?.on?.() ?? false;
      const fed = herdOn ? await waitFor(() => herdFeeds() > feeds0, 6000) : true;
      G.ok("2. the meal leaves signs in the domain, with a Track button for the holder", !!card && signs === 3 && /pale and faint/.test(card.content) && !!btn
        && card.flags[MOD].poach.diff === 4 && herdOn && fed, {card: !!card, signs, button: !!btn, diff: card?.flags?.[MOD]?.poach?.diff, law: card?.flags?.[MOD]?.poach?.law, herdApi, storyteller: !!game.modules.get("wodx-storyteller")?.active, herdOn, herd: [feeds0, herdFeeds()],
        whisper: card?.whisper?.length ?? 0, inLog: !!msgEl(card?.id)});
    });

    let tracked = null, s0 = 0, hist0 = 0;
    const standing = () => Number(FX().state().factions.find(f => f.id === "gateDomainFief")?.standing?.gateDomainRival ?? 0);
    await G.step("3. the holder tracks the poacher: Perception + Investigation at 4, and finds it", async () => {
      await new Promise(r => setTimeout(r, 1500)); // a trespass the holder noticed may land first (its own -1)
      s0 = standing();
      { const j = game.journal.find(x => x.getFlag?.("wodx-actions", "kind") === "history");
        const pg = j?.pages?.find(p => p.getFlag?.("wodx-actions", "actor") === holder.uuid) ?? j?.pages?.getName(holder.name);
        hist0 = (pg?.text?.content ?? "").split("Tracks a poacher").length - 1; }
      const btn = (msgEl(card?.id) ?? cardEl)?.querySelector?.(`button.wnpc-f-track[data-actor="${holder.id}"]`);
      const errs = [], ce = console.error;
      console.error = (...a) => { errs.push(a.map(x => x?.message ?? String(x)).join(" ").slice(0, 300)); ce(...a); };
      btn?.click();
      const wired = !!btn?.disabled;
      await waitFor(() => (tracked = game.messages.contents.find(m => m.flags?.[MOD]?.poachTracked?.of === card?.id)), 45000);
      console.error = ce;
      const t = tracked?.flags?.[MOD]?.poachTracked;
      G.ok("3. the holder tracks the poacher: Perception + Investigation at 4, and finds it", !!t && /Perception \+ Investigation: 10 dice at 4/.test(tracked.content)
        && t.verdict === "found" && tracked.content.includes(poacher.name) && tracked.content.includes(t.law), {errs, button: !!btn, wired, tracked: !!t, verdict: t?.verdict ?? null,
        pool: (tracked?.content ?? "").match(/Perception \+ \w+: \d+ dice at \d+/)?.[0] ?? null});
    }, {timeout: 90000});

    await G.step("4. the holder's faction thinks worse of the poacher's, and the History has it", async () => {
      const queued = () => { try { return JSON.stringify(game.settings.get("wodx-chronicle", "approvals") ?? "").includes(`poach:${card?.id}`); } catch (e) { return false; } };
      const answered = await waitFor(() => standing() < s0 || queued(), 30000);
      // the History page is found by name too (an earlier run's page may be reused), so only lines added this run count
      const histPage = () => { const j = game.journal.find(x => x.getFlag?.("wodx-actions", "kind") === "history");
        return j?.pages?.find(p => p.getFlag?.("wodx-actions", "actor") === holder.uuid) ?? j?.pages?.getName(holder.name); };
      const logged = await waitFor(() => (histPage()?.text?.content ?? "").split("Tracks a poacher").length - 1 > hist0, 15000);
      G.ok("4. the holder's faction thinks worse of the poacher's, and the History has it", answered && logged, {standing: [s0, standing()], queued: queued(), logged});
    }, {timeout: 90000});
  } catch (e) { G.ok("no error", false, {error: e.message}); }
  finally {
    try { if ( keep.factions !== undefined ) await game.settings.set(MOD, "factions", keep.factions); } catch (e) { G.ok("put back the factions", false, {error: e.message}); }
    try { if ( keep.herd !== undefined && keep.herd !== true ) await game.settings.set("wodx-storyteller", "herdPools", keep.herd); } catch (e) { /* ignore */ }
    try { if ( keep.mode !== undefined ) await game.settings.set(MOD, "factionMode", keep.mode); } catch (e) { /* ignore */ }
    try { if ( keep.approvals !== undefined ) await game.settings.set("wodx-chronicle", "approvals", keep.approvals); } catch (e) { /* ignore */ }
  }
  return G.finish();
}
