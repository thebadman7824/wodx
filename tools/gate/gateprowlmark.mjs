/**
 * A footpad on the prowl by night picks a lone player's character, closes in on the map and demands money; Pay on the
 * card sends the robber off (npc.prowl), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateprowlmark.mjs?${Date.now()}`)).run()
 * It makes its own scene (one back alley), a footpad and a player's character, and removes them; the kit puts the
 * clock back.
 *   1. the clock to 23:00: the footpad's token closes in on the lone character, and its card offers Pay, Talk, Fight
 *   2. Pay on the card: the footpad's token walks away from the character
 * Result: Data/wodx-gate/gateprowlmark-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-npc";

export async function run() {
  const G = gate("gateprowlmark", {stepTimeout: 240000});
  const since = Date.now();
  // the clock writes WoDX Chronicle's night's work journal; it is put back as it was, after the clock is
  const nightKey = "wodx-chronicle.nightWork", stored = () => game.settings.storage.get("world").getSetting?.(nightKey) ?? null;
  const nightBefore = stored()?.toObject?.() ?? null;
  const log = foundry.utils.deepClone(game.settings.get("wodx-storyteller", "log"));
  const N = game.modules.get(MOD).api;
  let sc = null, robber = null, pc = null, card = null, near = null;
  const tokOf = a => canvas.tokens?.placeables?.find(t => t.document.actorId === a?.id) ?? null;
  const apart = () => { const a = tokOf(robber), b = tokOf(pc); return a && b ? Math.hypot(a.center.x - b.center.x, a.center.y - b.center.y) : null; };
  // seconds from now to the next hour h
  const until = async h => {
    await N.routines.loadCalendar();
    const cur = N.routines.describer()(game.time.worldTime);
    const dt = (((h - cur.hour) * 3600 - (cur.minute ?? 0) * 60) % 86400 + 86400) % 86400;
    return dt < 600 ? dt + 86400 : dt;
  };
  try {
    await G.step("1. 23:00: the footpad closes in on the lone character, with a card to pay, talk or fight", async () => {
      sc = await G.scene({width: 2000, height: 1200});
      const [alley] = await sc.createEmbeddedDocuments("Region", [{name: "Gate Prowl Alley",
        shapes: [{type: "rectangle", x: 0, y: 0, width: 2000, height: 1200, rotation: 0, hole: false}], flags: {[MOD]: {place: {kind: "alley"}}}}]);
      await sc.setFlag(MOD, "routineMode", "auto");
      // setup: a footpad by archetype whose alley and home are this scene's alley, and a player's character alone
      robber = await G.make(Actor, {name: "Gate Prowl Footpad", type: "Mortal", prototypeToken: {actorLink: true, disposition: -1},
        flags: {[MOD]: {archetype: "footpad", routine: {on: true, mode: null, preset: null, age: null, roles: {alley: alley.uuid, home: alley.uuid}, blocks: null}}}});
      pc = await G.make(Actor, {name: "Gate Prowl Wanderer", type: "Mortal", ownership: {default: 3}, prototypeToken: {actorLink: true, disposition: 1}});
      await G.tokens(sc, [{actor: robber, x: 2, y: 2}, {actor: pc, x: 10, y: 6}]);
      // the character carries forty in coin, so there is something to hand over
      await game.modules.get("wodx-storyteller").api.upkeep.money.receive(pc, 40, {to: "carried", note: "Gate Prowl purse"});
      const start = apart();
      // the trigger: the clock to the dark
      const dt = await until(23);
      await game.time.advance(dt);
      const cardOf = () => game.messages.contents.filter(m => (m.timestamp ?? 0) >= since && m.flags?.[MOD]?.prowl?.prowler === tokOf(robber)?.document.uuid).at(-1) ?? null;
      await waitFor(() => cardOf() && apart() !== null && apart() < start - 100, 90000);
      card = cardOf();
      near = apart();
      // the card as the chat log shows it (the first rendering of it on the page)
      const shownCard = () => document.querySelector(`[data-message-id="${card?.id}"]`);
      await waitFor(() => shownCard()?.querySelector("button.wnpc-pw"), 30000);
      const buttons = [...(shownCard()?.querySelectorAll("button.wnpc-pw") ?? [])].map(b => b.dataset.a);
      G.ok("1. 23:00: the footpad closes in on the lone character, with a card to pay, talk or fight", !!card && near < start - 100 && buttons.join() === "pay,talk,fight",
        {advanced: dt, start: Math.round(start), near: Math.round(near ?? -1), buttons, activity: N.routines.whereOf(game.actors.get(robber.id))?.activity ?? null});
    });

    await G.step("2. Pay on the card: the footpad walks away", async () => {
      const btn = () => document.querySelector(`#chat-log [data-message-id="${card?.id}"] button.wnpc-pw[data-a="pay"]`) ?? document.querySelector(`[data-message-id="${card?.id}"] button.wnpc-pw[data-a="pay"]`);
      await waitFor(btn, 30000);
      const pressed = !!btn();
      btn()?.click();
      await waitFor(() => game.messages.get(card?.id)?.flags?.[MOD]?.prowl?.done === "pay" && apart() > near + 100, 90000);
      const carried = Number(game.modules.get("wodx-storyteller").api.upkeep.money.purse(game.actors.get(pc.id))?.carried);
      G.ok("2. Pay on the card: the footpad walks away", pressed && game.messages.get(card?.id)?.flags?.[MOD]?.prowl?.done === "pay" && apart() > near + 100,
        {pressed, carried, near: Math.round(near ?? -1), after: Math.round(apart() ?? -1), done: game.messages.get(card?.id)?.flags?.[MOD]?.prowl?.done ?? null});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    for ( const n of ["Gate Prowl Footpad", "Gate Prowl Wanderer"] ) {
      const a = game.actors.getName(n);
      if ( a ) { try { await a.delete(); } catch (e) { G.R.notes.push(`actor: ${e?.message ?? e}`); } }
    }
    await new Promise(r => setTimeout(r, 8000));
    for ( const x of game.messages.contents.filter(x => (x.timestamp ?? 0) >= since && (x.flags?.[MOD]?.prowl || /Gate Prowl/.test(`${x.speaker?.alias ?? ""} ${x.content ?? ""}`))) ) { try { await x.delete(); } catch (e) { /* leave it */ } }
    try { await game.settings.set("wodx-storyteller", "log", log); } catch (e) { G.R.notes.push(`log: ${e?.message ?? e}`); }
    const out = await G.finish();
    await new Promise(r => setTimeout(r, 3000));
    try {
      const now = stored();
      if ( !nightBefore && now ) await now.delete();
      else if ( nightBefore && now && JSON.stringify(now.value) !== JSON.stringify(nightBefore.value) ) await now.update({value: nightBefore.value});
      else if ( nightBefore && !now ) await game.settings.storage.get("world").documentClass.create(nightBefore);
    } catch (e) { /* the lane's own pass puts it back */ }
    return out;
  }
}
