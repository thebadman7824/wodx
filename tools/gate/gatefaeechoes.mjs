/**
 * Gate for B7870-B7873: Echoes that fire from village life (Dark Ages: Fae pp. 112-113, 182). Makes its own scene, fae and
 * villager; the scene, actors and cards go afterwards.
 *   1. a fae with a cold iron Echo walks up to a villager carrying an iron horseshoe: an Echo prompt comes to the
 *      Storyteller, naming the villager
 *   2. its button opens the fae's Echo roll, set to that Echo and that villager
 *   3. an Echo card's Immolation button (level five) sets the fae alight: three aggravated levels on the sheet
 *   4. Thin Mists (level two): a Mists power costs double this scene
 * Run: await (await import(`/wodx-gate/gatefaeechoes.mjs?${Date.now()}`)).run()
 */
import {gate, waitFor} from "./kit.mjs";

const ACT = "wodx-actions", IT = "wodx-interactables";
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run() {
  const G = gate("gatefaeechoes", {stepTimeout: 45000});
  const t0 = Date.now();
  const mine = () => game.messages.contents.filter(m => m.timestamp >= t0);
  const render = msg => { const el = document.createElement("div"); el.innerHTML = msg.content; Hooks.callAll("renderChatMessageHTML", msg, el); return el; };
  try {
    const sc = await G.scene({width: 2000, height: 1200});
    const [fae, villager] = await G.make(Actor, [{name: "Gate Echoes: Ash", type: "Mortal"}, {name: "Gate Echoes: Villager", type: "Mortal"}]);
    await fae.setFlag(ACT, "daFae", {origin: "firstborn", court: "winter", mists: {perm: 4, temp: 4}, weaving: {perm: 2, temp: 2}, dominions: {night: 1},
      echoes: [{trigger: "the sound of bells"}, {trigger: "touching cold iron"}], oaths: []});
    await villager.update({"system.advantages.willpower.permanent": 4});
    await villager.createEmbeddedDocuments("Item", [{name: "an iron horseshoe for over the door", type: "Item"}]);
    const [tf] = await G.tokens(sc, [{actor: fae, x: 2, y: 2, actorLink: true}, {actor: villager, x: 8, y: 2, actorLink: true}]);

    let prompt = null;
    await G.step("1. walking up to the horseshoe: an Echo prompt", async () => {
      await tf.update({x: 7 * (sc.grid?.size ?? 100), y: 2 * (sc.grid?.size ?? 100)});
      await waitFor(() => (prompt = mine().find(m => m.flags?.[IT]?.echoPrompt?.actor === fae.id)), 6000);
      const p = prompt?.flags?.[IT]?.echoPrompt;
      G.ok("1. walking up to the horseshoe: an Echo prompt", !!p && p.e === 1 && p.wielder === villager.id && p.who === "mortal" && /horseshoe/.test(prompt.content), {p, content: prompt?.content?.slice(0, 200)});
    });

    await G.step("2. its button opens the Echo roll set to that Echo and villager", async () => {
      let seen = null;
      const hk = Hooks.on("renderDialogV2", (app, el) => {
        const root = el instanceof HTMLElement ? el : el?.[0];
        if ( !String(app.title ?? app.options?.window?.title ?? "").startsWith("Face an Echo") ) return;
        seen = {e: root.querySelector("select[name=e]")?.value, who: root.querySelector("select[name=who]")?.value, wielder: root.querySelector("select[name=wielder]")?.value};
        setTimeout(() => app.close(), 150);
      });
      try { render(prompt).querySelector("[data-wit-echo]").click(); await waitFor(() => seen, 5000); } finally { Hooks.off("renderDialogV2", hk); }
      G.ok("2. its button opens the Echo roll set to that Echo and villager", seen?.e === "1" && seen?.who === "mortal" && seen?.wielder === villager.id, {seen});
    });

    await G.step("3. Immolation on the card: three aggravated levels", async () => {
      const before = Number(game.actors.get(fae.id).system.health?.damage?.aggravated ?? 0);
      const msg = await ChatMessage.create({speaker: {alias: "Gate"}, whisper: [game.user.id], flags: {[ACT]: {daFaeEcho: {actor: fae.uuid, level: 5, done: false}}},
        content: `<div class="vta-card"><button type="button" class="vta-btn" data-fx="echopick:immolation" data-actor="${fae.uuid}" data-gm>Immolation</button></div>`});
      render(msg).querySelector("[data-fx]").click();
      await waitFor(() => Number(game.actors.get(fae.id).system.health?.damage?.aggravated ?? 0) > before, 6000);
      const after = Number(game.actors.get(fae.id).system.health?.damage?.aggravated ?? 0);
      G.ok("3. Immolation on the card: three aggravated levels", after - before === 3, {before, after});
    });

    await G.step("4. Thin Mists: a Mists power costs double this scene", async () => {
      const msg = await ChatMessage.create({speaker: {alias: "Gate"}, whisper: [game.user.id], flags: {[ACT]: {daFaeEcho: {actor: fae.uuid, level: 2, done: false}}},
        content: `<div class="vta-card"><button type="button" class="vta-btn" data-fx="echopick:thin" data-actor="${fae.uuid}" data-gm>Thin Mists</button></div>`});
      render(msg).querySelector("[data-fx]").click();
      await waitFor(() => game.actors.get(fae.id).getFlag(ACT, "daFae")?.echoThin, 5000);
      const before = Number(game.actors.get(fae.id).getFlag(ACT, "daFae")?.mists?.temp ?? 0);
      // Enhance the mien costs 2 Mists: doubled, 4
      const hk = Hooks.on("renderDialogV2", (app, el) => {
        const root = el instanceof HTMLElement ? el : el?.[0];
        if ( !String(app.title ?? app.options?.window?.title ?? "").startsWith("The Mists") ) return;
        const s = root.querySelector("select[name=use]"); s.value = "enhance"; s.dispatchEvent(new Event("change", {bubbles: true}));
        setTimeout(() => root.querySelector("button[data-action=ok]")?.click(), 150);
      });
      try { await game.wodxActions.daMists({actor: game.actors.get(fae.id)}); await sleep(800); } finally { Hooks.off("renderDialogV2", hk); }
      const after = Number(game.actors.get(fae.id).getFlag(ACT, "daFae")?.mists?.temp ?? 0);
      G.ok("4. Thin Mists: a Mists power costs double this scene", before - after === 4, {before, after});
    });
  } catch (e) {
    G.R.errors.push(String(e?.stack ?? e));
  } finally {
    for ( const m of game.messages.contents.filter(m => m.timestamp >= t0 && (m.flags?.[IT]?.echoPrompt || m.speaker?.alias === "Gate" || m.content?.includes("Gate Echoes"))) ) { try { await m.delete(); } catch {} }
    return G.finish();
  }
}
