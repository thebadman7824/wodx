/**
 * Gate for B7904-B7909: a Dark Ages mage's household and standing (Dark Ages: Mage pp. 37, 83-93). Makes its own scene
 * and two Hermetic mages; removes the rumours it starts; the dice are fixed while a step rolls and put back.
 *   1. the household window sets the chantry with no community points; the week's turn starts the commoners' talk
 *   2. the familiar's Pact and boons from the window; "Feed the familiar" takes its rating in Quintessence
 *   3. a week unfed (the clock's weekly turn) weakens the familiar a dot
 *   4. a Backlash card's "The familiar takes it" settles the Backlash and spends a use this story
 *   5. a Pillar by experience with the Library (every die a 10): Primus 3 to 4 for 16, not 18
 *   6. a commoner servant worked on (every die a 1): turned, and what they know is out (a rumour)
 *   7. the Storyteller names the mage Adept: -2 Social difficulty with a Hermetic of the first degree
 *   8. Arcane Madness past the spells a story allows, with Repulsive Practice watched (every die a 1): the madness
 *      takes hold (+2 difficulty) and the Church hears (a rumour)
 * Run: await (await import(`/wodx-gate/gatemagehouse.mjs?${Date.now()}`)).run()
 */
import {gate, waitFor} from "./kit.mjs";

const AX = "wodx-actions";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dice = async face => {
  for ( const u of [(face - 0.5) / 10, 1 - (face - 0.5) / 10] ) {
    CONFIG.Dice.randomUniform = () => u;
    if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === face ) return;
  }
  throw new Error(`could not fix the dice to ${face}`);
};
const rendered = msg => { const el = document.createElement("div"); el.innerHTML = msg.content; Hooks.callAll("renderChatMessageHTML", msg, el); return el; };
/** Answer the next WoDX dialog whose title starts with `title`: fn(root) sets it, then OK is clicked. */
const answer = (title, fn) => { const hk = Hooks.on("renderDialogV2", (app, el) => { const root = el instanceof HTMLElement ? el : el?.[0];
  if ( !String(app.title ?? app.options?.window?.title ?? "").startsWith(title) ) return; Hooks.off("renderDialogV2", hk); try { fn?.(root); } catch (e) { console.warn(e); }
  setTimeout(() => root?.querySelector("button[data-action=ok]")?.click(), 150); }); return () => Hooks.off("renderDialogV2", hk); };
const set = (root, name, value) => { const el = root.querySelector(`[name=${name}]`); if ( !el ) return; if ( el.type === "checkbox" ) el.checked = !!value; else el.value = String(value); };
/** Open the household window, choose `what`, then fill the next window. */
async function household(A, actor, what, title, fill) {
  const pick = function (want, fn) { let id = null; id = Hooks.on("renderDialogV2", (app, el) => {
    const root = el instanceof HTMLElement ? el : el?.[0];
    if ( !String(app.title ?? app.options?.window?.title ?? "").startsWith(want) ) return;
    Hooks.off("renderDialogV2", id);
    try { fn?.(root); } catch (e) { console.warn(e); }
    setTimeout(() => root?.querySelector("button[data-action=ok]")?.click(), 150);
  }); return id; };
  const h2 = pick(title, fill), h1 = pick("The household:", root => set(root, "what", what));
  try { await A.daHousehold({actor}); await sleep(900); } finally { Hooks.off("renderDialogV2", h1); Hooks.off("renderDialogV2", h2); }
}
const bg = (name, value) => ({name, type: "Feature", system: {type: "wod.types.background", value}});
const feat = (name, kind, value) => ({name, type: "Feature", system: {type: `wod.types.${kind}`, value}});

export async function run() {
  const G = gate("gatemagehouse", {stepTimeout: 45000});
  if ( G.notLive() ) return "Not on the Live world.";
  const A = game.wodxActions;
  const RU = () => game.modules.get("wodx-storyteller")?.api?.rumours;
  const uniform = CONFIG.Dice.randomUniform;
  const t0 = Date.now();
  const rumoursBefore = new Set((RU()?.list?.() ?? []).map(r => r.id));
  const week = () => Math.floor(game.time.worldTime / (7 * 24 * 3600));
  const house = a => game.actors.get(a.id).getFlag(AX, "daHouse") ?? {};
  const Q = a => Number(A.daMageInfo(a)?.quintessence?.value) || 0;
  const newRumour = (re, about) => (RU()?.list?.() ?? []).find(r => !rumoursBefore.has(r.id) && re.test(r.text) && (!about || r.about === about));
  try {
    await G.scene({name: "WoDX gate: a mage's household"});
    const [mg, jr] = await G.make(Actor, [
      {name: "Gate House: Magistra", type: "Mage", items: [bg("Chantry", 3), bg("Familiar", 2), bg("Library", 2), bg("Servants", 2), bg("Fount", 2),
        feat("Arcane Madness", "flaw", 3), feat("Repulsive Practice", "flaw", 3)]},
      {name: "Gate House: Junior", type: "Mage"}]);
    for ( const a of [mg, jr] ) await a.update({"system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5});
    await mg.setFlag(AX, "daMage", {fellowship: "hermes", foundation: 3, pillars: {anima: 2, corona: 1, primus: 3, vires: 3}, twilight: {temp: 0, perm: 0}, brandings: [], system: null});
    await jr.setFlag(AX, "daMage", {fellowship: "hermes", foundation: 1, pillars: {primus: 1}, system: null});
    const qp = A.daMageInfo(mg)?.quintessence?.path;
    if ( qp ) await mg.update({[qp]: 10});

    await G.step("1. the chantry with no community points: the commoners talk", async () => {
      await household(A, mg, "chantry", "The chantry:", root => { set(root, "place", "the old mill"); set(root, "size", 2); set(root, "security", 1); set(root, "aura", 0); set(root, "community", 0); });
      await waitFor(() => house(mg).chantry?.place === "the old mill", 4000);
      await mg.setFlag(AX, "daHouse", {...house(mg), gossipWeek: week() - 1});
      await A.daHouseholdWeek();
      let r = null;
      await waitFor(() => (r = newRumour(/the old mill/, mg.id)), 5000);
      G.ok("1. the chantry with no community points: the commoners talk", house(mg).chantry?.size === 2 && !!r && house(mg).gossipWeek === week(), {chantry: house(mg).chantry, rumour: r?.text ?? null});
    });

    await G.step("2. the familiar's Pact, and its weekly meal of Quintessence", async () => {
      await household(A, mg, "familiar", "The familiar:", root => { set(root, "name", "Corvus"); set(root, "form", "a raven"); set(root, "b-backlash", 2); });
      await waitFor(() => house(mg).familiar?.boons?.backlash === 2, 4000);
      const q0 = Q(mg);
      await household(A, mg, "feed", "__none__", null);
      await waitFor(() => Q(mg) === q0 - 2, 4000);
      G.ok("2. the familiar's Pact, and its weekly meal of Quintessence", house(mg).familiar?.name === "Corvus" && Q(mg) === q0 - 2 && house(mg).familiar?.fedWeek === week(), {q0, q: Q(mg), familiar: house(mg).familiar});
    });

    await G.step("3. a week unfed weakens the familiar", async () => {
      const f = house(mg).familiar;
      await mg.setFlag(AX, "daHouse", {...house(mg), familiar: {...f, lastWeek: week() - 2, fedWeek: week() - 5, weak: 0}});
      await A.daHouseholdWeek();
      await waitFor(() => Number(house(mg).familiar?.weak) === 1, 4000);
      G.ok("3. a week unfed weakens the familiar", Number(house(mg).familiar?.weak) === 1 && house(mg).familiar?.lastWeek === week() - 1, {familiar: house(mg).familiar});
      await mg.setFlag(AX, "daHouse", {...house(mg), familiar: {...house(mg).familiar, weak: 0}});
    });

    await G.step("4. the familiar takes a Backlash", async () => {
      const msg = await ChatMessage.create({content: `<div class="vta-card wodx-x"><div class="vta-body">Gate House: a Backlash. <button type="button" class="vta-btn" data-mx="familiar" data-actor="${mg.uuid}">The familiar takes it</button></div></div>`,
        whisper: game.users.filter(u => u.isGM).map(u => u.id), flags: {[AX]: {daBacklash: {actor: mg.uuid, ones: 1, highest: 3, pillarsUsed: 1, cancelled: 0, done: null}}}});
      rendered(game.messages.get(msg.id)).querySelector("button[data-mx=familiar]").click();
      await waitFor(() => game.messages.get(msg.id)?.getFlag(AX, "daBacklash")?.done === "familiar", 5000);
      const used = house(mg).familiar?.used;
      G.ok("4. the familiar takes a Backlash", game.messages.get(msg.id)?.getFlag(AX, "daBacklash")?.done === "familiar" && Number(used?.backlash) === 1, {used});
    });

    await G.step("5. a Pillar by experience with the Library", async () => {
      await mg.createEmbeddedDocuments("Item", [{name: "Gate House: award", type: "Experience", system: {amount: 20, isspent: false}}]);
      await dice(10);
      try { await household(A, mg, "pillar", "A Pillar by experience:", root => { set(root, "p", "primus"); set(root, "lib", true); }); await sleep(500); } finally { CONFIG.Dice.randomUniform = uniform; }
      await waitFor(() => Number(game.actors.get(mg.id).getFlag(AX, "daMage")?.pillars?.primus) === 4, 5000);
      const spend = game.actors.get(mg.id).items.find(i => i.type === "Experience" && i.system?.isspent && /Primus 4/.test(i.name));
      G.ok("5. a Pillar by experience with the Library", Number(game.actors.get(mg.id).getFlag(AX, "daMage")?.pillars?.primus) === 4 && Number(spend?.system?.amount) === 16, {primus: game.actors.get(mg.id).getFlag(AX, "daMage")?.pillars?.primus, cost: spend?.system?.amount ?? null});
    });

    await G.step("6. a commoner servant turned: a rumour", async () => {
      await household(A, mg, "servant", "A servant:", root => { set(root, "name", "Gate Hilde"); set(root, "kind", "commoner"); set(root, "quality", "ordinary"); set(root, "task", "the kitchen"); });
      await waitFor(() => (house(mg).servants ?? []).some(s => s.name === "Gate Hilde"), 4000);
      await dice(1);
      try { await household(A, mg, "bribe", "Turning a servant:", root => { set(root, "by", "a curious priest"); }); await sleep(600); } finally { CONFIG.Dice.randomUniform = uniform; }
      let r = null;
      await waitFor(() => (r = newRumour(/Gate Hilde/, mg.id)), 5000);
      G.ok("6. a commoner servant turned: a rumour", !!r && (house(mg).servants ?? []).find(s => s.name === "Gate Hilde")?.turned === "a curious priest", {rumour: r?.text ?? null});
    });

    await G.step("7. Adept of the Order: easier with a junior of the fellowship", async () => {
      await household(A, mg, "degree", "Degree:", root => { set(root, "rank", 3); });
      await waitFor(() => house(mg).degree === 3, 4000);
      const fx = game.modules.get("wodx-chronicle")?.api?.traits?.effects?.(mg, {channel: "roll", tags: ["fellowship"]}) ?? [];
      const d = fx.find(e => e.key === "degree");
      const tick = (A.ticksFor?.(mg) ?? []).some?.(t => t.key === "fellowship");
      G.ok("7. Adept of the Order: easier with a junior of the fellowship", d?.diff === -2 && d?.name === "Adept", {effect: d ?? null, tick});
    });

    await G.step("8. Arcane Madness past the story's spells, and Repulsive Practice watched", async () => {
      const story = (() => { try { return game.settings.get(AX, "storyId") || "first"; } catch (e) { return "first"; } })();
      await mg.setFlag(AX, "daHouse", {...house(mg), madness: {story, casts: 5}});
      await mg.update({"system.advantages.willpower.temporary": 5});
      if ( qp ) await mg.update({[qp]: 10});
      await dice(1);
      const off = answer("Cast a spell:", root => { set(root, "l-primus", 1); set(root, "seen", true); });
      try { await A.daCast({actor: mg}); await sleep(900); } finally { off(); CONFIG.Dice.randomUniform = uniform; }
      await waitFor(() => [...game.actors.get(mg.id).effects].some(e => /^Arcane Madness: \+2/.test(e.name)), 5000);
      let r = null;
      await waitFor(() => (r = newRumour(/foul craft/, mg.id)), 5000);
      const mad = [...game.actors.get(mg.id).effects].some(e => /^Arcane Madness: \+2/.test(e.name));
      G.ok("8. Arcane Madness past the story's spells, and Repulsive Practice watched", mad && !!r && Number(house(mg).madness?.casts) === 6, {mad, rumour: r?.text ?? null, madness: house(mg).madness});
    });
  } catch (e) {
    G.R.errors.push(String(e?.stack ?? e));
  } finally {
    CONFIG.Dice.randomUniform = uniform;
    try { for ( const r of (RU()?.list?.() ?? []).filter(r => !rumoursBefore.has(r.id) && /old mill|Gate Hilde|Gate House|foul craft/.test(r.text)) ) await RU().remove(r.id); } catch (e) { /* none */ }
    for ( const m of game.messages.contents.filter(m => m.timestamp >= t0 && /Gate House|Magistra|old mill|Corvus|Gate Hilde/.test(m.content ?? "")) ) { try { await m.delete(); } catch {} }
    return G.finish();
  }
}
