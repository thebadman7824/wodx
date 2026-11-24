/**
 * Gate for B7899-B7903: the valley's dead and the living (Wraith 20th pp. 281-291). Makes its own scene, a player's
 * mortal and a wraith; removes the Enfant it raises; the dice are fixed while a step rolls and put back.
 *   1. a player's mortal killed (Combat's damage hook): the Crucible card; "Rise in the Caul" makes the Enfant
 *   2. the Enfant cannot tear away its own Caul before the Crucible; after "The Crucible is lived through", it can
 *   3. the Fog: a mortal of Willpower 2 who sees the wraith panics (flees) and forgets
 *   4. the Haunt window (rating 5, Nightmarish) sets the scene's Haunt and lowers the Shroud
 *   5. a night in the Nightmarish Haunt (every die a 1): the sleeper wakes with +1 difficulty
 *   6. a storm of force 3 on a Haunt of 5: the wraith inside is sheltered
 *   7. a death where the chronicle's souls are eaten gives no Crucible (when the chronicle in play names such a place)
 * Run: await (await import(`/wodx-gate/gatewraithdead.mjs?${Date.now()}`)).run()
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

export async function run() {
  const G = gate("gatewraithdead", {stepTimeout: 45000});
  if ( G.notLive() ) return "Not on the Live world.";
  const A = game.wodxActions;
  const uniform = CONFIG.Dice.randomUniform;
  const t0 = Date.now();
  const player = game.users.find(u => !u.isGM);
  const made = [];
  const after = since => game.messages.contents.filter(m => m.timestamp >= since);
  try {
    if ( !player ) { G.ok("a player user to own the mortal", false, {error: "No player user in the world"}); return; }
    const scene = await G.scene({name: "WoDX gate: the valley's dead"});
    const own = {default: 0, [player.id]: 3};
    const [mara, wit, ghost] = await G.make(Actor, [{name: "Gate Dead: Mara", type: "Mortal", ownership: own},
      {name: "Gate Dead: Witness", type: "Mortal"}, {name: "Gate Dead: Ghost", type: "Wraith"}]);
    await wit.update({"system.advantages.willpower.permanent": 2, "system.advantages.willpower.temporary": 2});
    const [, tw, tg] = await G.tokens(scene, [{actor: mara, x: 2, y: 2}, {actor: wit, x: 4, y: 2}, {actor: ghost, x: 6, y: 2}]);
    const enfant = () => game.actors.find(a => a.getFlag(AX, "wraithDeath")?.from === mara.id);

    await G.step("1. a player's mortal killed: the Crucible card makes the Enfant", async () => {
      const t1 = Date.now();
      Hooks.callAll("wodxDamageApplied", mara, {type: "lethal", levels: 1, condition: "dead"});
      let card = null;
      await waitFor(() => (card = after(t1).find(m => /data-wx="crucible"/.test(m.content ?? "") && /data-arg="rise"/.test(m.content ?? ""))), 6000);
      rendered(card).querySelector("button[data-arg=rise]").click();
      await waitFor(() => !!enfant(), 6000);
      const e = enfant(); if ( e ) made.push(e);
      G.ok("1. a player's mortal killed: the Crucible card makes the Enfant", !!card && !!e && e.type === "Wraith" && e.getFlag(AX, "wraithDeath")?.crucible === "open" && e.testUserPermission(player, "OWNER"),
        {card: !!card, enfant: e?.name ?? null, flag: e?.getFlag(AX, "wraithDeath") ?? null});
    });

    await G.step("2. the Caul stays until the Crucible is lived through", async () => {
      const e = enfant();
      await e.update({"system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5, "system.advantages.pathos.temporary": 3});
      const p0 = Number(game.actors.get(e.id).system.advantages.pathos.temporary);
      let off = answer("The Caul", root => { root.querySelector("select[name=who]").value = "self"; });
      try { await A.caul({actor: e}); await sleep(400); } finally { off(); }
      const p1 = Number(game.actors.get(e.id).system.advantages.pathos.temporary);
      const t2 = Date.now();
      await A.crucible(e, "done");
      await waitFor(() => game.actors.get(e.id).getFlag(AX, "wraithDeath")?.crucible === "done", 4000);
      await dice(10);
      off = answer("The Caul", root => { root.querySelector("select[name=who]").value = "self"; });
      try { await A.caul({actor: e}); await sleep(600); } finally { off(); CONFIG.Dice.randomUniform = uniform; }
      const p2 = Number(game.actors.get(e.id).system.advantages.pathos.temporary);
      G.ok("2. the Caul stays until the Crucible is lived through", p1 === p0 && p2 > p0 && after(t2).some(m => /Crucible is lived through/.test(m.content ?? "")), {before: p0, refused: p1, after: p2});
    });

    await G.step("3. the Fog: Willpower 2 panics and forgets", async () => {
      const t3 = Date.now();
      await A.witnessStep({actor: ghost, tokens: [tw.object ?? canvas.tokens.get(tw.id)]});
      let card = null;
      await waitFor(() => (card = after(t3).find(m => /Gate Dead: Witness/.test(m.content ?? "") && /Panic/.test(m.content ?? ""))), 5000);
      const txt = String(card?.content ?? "").replace(/<[^>]+>/g, " ");
      const afraid = [...(game.actors.get(wit.id).effects ?? [])].some(x => /Afraid/.test(x.name));
      G.ok("3. the Fog: Willpower 2 panics and forgets", !!card && /flees/.test(txt) && /forgets/.test(txt) && afraid, {card: txt.slice(0, 240), afraid});
    });

    await G.step("4. the Haunt window sets a Haunt of 5 with Nightmarish, and the Shroud drops", async () => {
      const off = answer("The Haunt here", root => { root.querySelector("input[name=rating]").value = "5"; root.querySelector("input[name=e_nightmarish]").checked = true; });
      try { await A.haunt(); await sleep(500); } finally { off(); }
      const h = A.hauntHere();
      G.ok("4. the Haunt window sets a Haunt of 5 with Nightmarish, and the Shroud drops", h?.rating === 5 && h.echoes.includes("nightmarish"), {haunt: h, flag: scene.getFlag(AX, "haunt")});
    });

    await G.step("5. a night in the Nightmarish Haunt: +1 difficulty tomorrow", async () => {
      await dice(1);
      try { await A.hauntNight(); await sleep(500); } finally { CONFIG.Dice.randomUniform = uniform; }
      await waitFor(() => [...(game.actors.get(wit.id).effects ?? [])].some(x => /^Poor sleep: \+1/.test(x.name)), 4000);
      G.ok("5. a night in the Nightmarish Haunt: +1 difficulty tomorrow", [...(game.actors.get(wit.id).effects ?? [])].some(x => /^Poor sleep: \+1/.test(x.name)) && Number(game.actors.get(wit.id).getFlag(AX, "hauntSleep")) === 1,
        {effects: [...(game.actors.get(wit.id).effects ?? [])].map(x => x.name)});
    });

    await G.step("6. a storm of 3 on a Haunt of 5: the wraith inside is sheltered", async () => {
      const t6 = Date.now();
      await scene.setFlag(AX, "maelstrom", 3);
      await scene.unsetFlag(AX, "stormRolled");
      await A.autoStorm?.();
      let card = null;
      await waitFor(() => (card = after(t6).find(m => /The Maelstrom, force 3/.test(m.content ?? ""))), 5000);
      G.ok("6. a storm of 3 on a Haunt of 5: the wraith inside is sheltered", !!card && /Gate Dead: Ghost: sheltered in/.test(card.content) && /cannot reach in/.test(card.content), {card: String(card?.content ?? "").replace(/<[^>]+>/g, " ").slice(0, 300)});
    });

    await G.step("7. where souls are eaten, no Crucible", async () => {
      const local = game.modules.get("wodx-chronicle")?.api?.chronicle?.current?.()?.manifest?.local?.souls ?? [];
      const place = local.find(x => x.fate === "eaten");
      if ( !place ) { G.ok("7. where souls are eaten, no Crucible", true, {skipped: "the chronicle in play names no such place"}); return; }
      const name = `WoDX gate: ${String(place.scene).split("|")[0].replace(/[^\w ]/g, "")}`;
      const s2 = await G.scene({name});
      const [kat] = await G.make(Actor, [{name: "Gate Dead: Katka", type: "Mortal", ownership: own}]);
      await G.tokens(s2, [{actor: kat, x: 2, y: 2}]);
      const t7 = Date.now();
      Hooks.callAll("wodxDamageApplied", kat, {type: "lethal", levels: 1, condition: "dead"});
      await waitFor(() => game.actors.get(kat.id).getFlag(AX, "wraithDeath")?.crucible === "eaten", 5000);
      G.ok("7. where souls are eaten, no Crucible", game.actors.get(kat.id).getFlag(AX, "wraithDeath")?.crucible === "eaten" && !after(t7).some(m => /data-arg="rise"/.test(m.content ?? "") && /Katka/.test(m.content ?? "")),
        {scene: name, flag: game.actors.get(kat.id).getFlag(AX, "wraithDeath")});
    });
  } catch (e) {
    G.R.errors.push(String(e?.stack ?? e));
  } finally {
    CONFIG.Dice.randomUniform = uniform;
    for ( const a of made ) { try { await a.delete(); } catch {} }
    for ( const m of game.messages.contents.filter(m => m.timestamp >= t0 && (/Gate Dead|gate:|valley's dead|Maelstrom|Haunt/.test(m.content ?? ""))) ) { try { await m.delete(); } catch {} }
    return G.finish();
  }
}
