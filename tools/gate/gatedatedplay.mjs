/**
 * Gate: dated events and the Ledger on the real clock (Master Plan gap items 1 and 8; B7260-B7264), in rothenstein-wodx.
 * gateevents and gateledger hold the world and call the checks by hand. This gate lets the clock itself do it, as in
 * play: the world is released and game.time.advance moves it, so the updateWorldTime hooks of Chronicle and
 * Storyteller run the checks, and the Storyteller presses the card's own button.
 *   1. the world timeline files the Mongols in Moravia (1241) under Moravia (B7260)
 *   2. the clock passes 1 January 1241: the event fires once, through the hook, with one card that names it
 *   3. war at home shows: smoke on the horizon on the scene being played (B7262)
 *   4. the market news card it brings, applied with its Apply button: food on the gate's own market goes to 1.5 times
 *      and short (the War preset), and the passers-by on its crowd scene go quiet (B7261)
 *   5. the clock goes back before 1241: the event is taken back with a card, and the prices, the crowd and the smoke
 *      go back with it
 *   6. a debt in the Ledger comes due as the clock passes its date: one whispered card, and only one on the next tick
 * At the end the world is held again, and the clock, the fired list, the Ledger, the markets and the hold go back.
 */
import {gate, waitFor} from "./kit.mjs";

const CH = "wodx-chronicle", ST = "wodx-storyteller", NPC = "wodx-npc";
const E = "wh-1241-the-mongols-in-moravia", GM = "gate-dated-market";
const sleep = ms => new Promise(r => setTimeout(r, ms));
/** Waits until what read() gives has not changed for three seconds (thirty at most): the night work has finished writing. */
async function settle(read, {quiet = 3000, most = 30000} = {}) {
  const t = Date.now();
  let last = read(), since = Date.now();
  while ( Date.now() - t < most ) {
    await sleep(500);
    const now = read();
    if ( now !== last ) { last = now; since = Date.now(); } else if ( Date.now() - since >= quiet ) return;
  }
}
const text = m => String(m?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

export async function run() {
  const G = gate("gatedatedplay", {stepTimeout: 90000});
  if ( game.world.id !== "rothenstein-wodx" ) { G.ok("1. world", false, {error: "Run this gate in rothenstein-wodx only"}); return G.save(); }
  const ch = game.modules.get(CH)?.api, st = game.modules.get(ST)?.api;
  const Markets = await import(`/modules/${ST}/scripts/markets.mjs`);
  const looks = ch?.looks;
  const {getEngine} = await import(`/modules/wodx-rules/core/calendar.mjs`);
  const at = (y, m, d, h) => getEngine().dateToTime({year: y, month: m, day: d, hour: h});
  const t0 = game.time.worldTime;
  const saved = {
    held: !!ch?.isHeld?.(), fired: foundry.utils.deepClone(game.settings.get(CH, "eventsFired")),
    overrides: foundry.utils.deepClone(game.settings.get(CH, "eventOverrides")), era: game.settings.get(CH, "activeEra"),
    ledger: foundry.utils.deepClone(game.settings.get(ST, "ledger")), markets: foundry.utils.deepClone(game.settings.get(ST, "markets"))
  };
  // what the released clock's own night work writes (the Storyteller's log, Chronicle's night work), put back as it was
  const stored = key => game.settings.storage.get("world").getSetting?.(key) ?? null;
  const WRITTEN = [`${ST}.log`, `${CH}.nightWork`];
  const writtenBefore = Object.fromEntries(WRITTEN.map(k => [k, stored(k)?.toObject?.() ?? null]));
  const msgs0 = new Set(game.messages.map(m => m.id));
  const mine = (test = () => true) => game.messages.filter(m => !msgs0.has(m.id) && test(m));
  const fired = [], undone = [];
  const hf = Hooks.on("wodxEventFired", ev => { if ( ev?.id === E ) fired.push(ev.id); });
  const hu = Hooks.on("wodxEventUndone", ev => { if ( ev?.id === E ) undone.push(ev.id); });
  try {
    const scene = await G.scene({activate: true, flags: {[NPC]: {crowd: {on: true, density: "normal"}}}});
    const smokeOn = () => (looks?.list?.(canvas.scene) ?? []).some(l => l.source === `event:${E}`)
      || canvas.scene.drawings.some(d => d.flags?.[ST]?.look?.source === `event:${E}`);

    await G.step("1. the Mongols in Moravia are Moravia's news", async () => {
      await ch.events.load?.();
      const ev = ch.events.list().find(e => e.id === E);
      G.ok("1. the Mongols in Moravia are Moravia's news", ev?.live && ev.region === "MO" && ev.key === 12410101, {region: ev?.region, key: ev?.key});
    });

    // Held, the clock goes to the night before 1241 and the fired list to what that date gives; nothing in the world reacts.
    await ch.hold(true);
    await game.settings.set(CH, "eventOverrides", {});
    await game.time.set(at(1240, 12, 31, 22)); await sleep(300);
    await game.settings.set(CH, "eventsFired", ch.events.list().filter(e => e.live && e.key <= 12401231).map(e => e.id));
    // a market of the gate's own on its scene, so the prices are checked whatever markets the lane has
    const ms = foundry.utils.deepClone(game.settings.get(ST, "markets") ?? {});
    ms.markets = [...(ms.markets ?? []).filter(m => m.id !== GM), {id: GM, name: "Gate market", scenes: [scene.id]}];
    await game.settings.set(ST, "markets", ms);
    await ch.hold(false); await sleep(1500);
    const before = foundry.utils.deepClone(Markets.state().markets);

    await G.step("2. the real clock passes 1 January 1241", async () => {
      await game.time.advance(4 * 3600);
      await waitFor(() => ch.events.has(E) && mine(m => /wodx-events/.test(m.content ?? "") && /Mongols in Moravia/.test(m.content ?? "")).length, 60000);
      await sleep(1500);
      const cards = mine(m => /wodx-events/.test(m.content ?? "") && !/wodx-hidden-events/.test(m.content ?? "") && /Mongols in Moravia/.test(m.content ?? ""));
      G.ok("2. the real clock passes 1 January 1241", ch.events.has(E) && fired.length === 1 && cards.length === 1, {has: ch.events.has(E), hook: fired.length, cards: cards.length});
    });

    await G.step("3. smoke on the horizon on the scene being played", async () => {
      const shown = await waitFor(smokeOn, 15000);
      G.ok("3. smoke on the horizon on the scene being played", shown && canvas.scene.id === scene.id, {looks: (looks?.list?.(canvas.scene) ?? []).map(l => l.source)});
    });

    let news = null;
    await G.step("4. the market news card, applied with its button", async () => {
      await waitFor(() => (news = mine(m => m.flags?.[ST]?.marketNews?.eventId === E)[0]), 15000);
      const f = news?.flags?.[ST]?.marketNews;
      const el = await news.renderHTML();
      document.body.append(el);
      el.querySelector("[data-action=wst-news-apply]")?.click();
      await waitFor(() => news.flags?.[ST]?.marketNews?.applied, 15000);
      el.remove();
      const now = Markets.state().markets;
      const mine1 = (f?.changes ?? []).find(c => c.id === GM);
      const priced = !!mine1 && (f?.changes ?? []).every(c => Object.entries(c.index).every(([k, v]) => Math.abs((now.find(x => x.id === c.id)?.index?.[k] ?? -1) - v) < 0.001))
        && now.find(x => x.id === GM)?.index?.food === 1.5 && now.find(x => x.id === GM)?.supply?.food === "short";
      const quiet = game.scenes.get(scene.id).flags?.[NPC]?.crowd?.density === "quiet";
      G.ok("4. the market news card, applied with its button", !!f && f.applied === false && news.flags[ST].marketNews.applied && priced && quiet
        && f.crowd.length > 0, {food: now.find(x => x.id === GM)?.index?.food ?? null, title: text(news).slice(0, 80), changes: f?.changes?.length, crowd: f?.crowd?.length, priced, quiet});
    });

    await G.step("5. the clock goes back before 1241", async () => {
      await game.time.advance(-4 * 3600);
      await waitFor(() => !ch.events.has(E) && !news?.flags?.[ST]?.marketNews?.applied && !smokeOn(), 30000);
      await sleep(800);
      const back = mine(m => /Not yet happened/.test(m.content ?? "") && /Mongols in Moravia/.test(m.content ?? ""));
      const now = Markets.state().markets;
      const prices = before.every(m => JSON.stringify(now.find(x => x.id === m.id)?.index ?? {}) === JSON.stringify(m.index ?? {})) && before.some(m => m.id === GM)
        && (now.find(x => x.id === GM)?.index?.food ?? 1) === 1;
      const crowd = game.scenes.get(scene.id).flags?.[NPC]?.crowd?.density === "normal";
      G.ok("5. the clock goes back before 1241", !ch.events.has(E) && undone.length === 1 && back.length === 1 && prices && crowd && !smokeOn(),
        {has: ch.events.has(E), hook: undone.length, cards: back.length, prices, crowd, smoke: smokeOn()});
    });

    await G.step("6. a debt comes due on the real clock", async () => {
      const e = await st.ledger.save({kind: "debt", from: {id: null, name: "Gate debtor"}, to: {id: null, name: "the gate"}, what: "Gate debt of ten groschen", due: game.time.worldTime + 3600});
      const due = () => mine(m => /Comes due/.test(m.content ?? "") && /Gate debt of ten groschen/.test(m.content ?? ""));
      await game.time.advance(2 * 3600);
      await waitFor(() => due().length, 20000);
      await game.time.advance(3600); await sleep(2000);
      const cards = due();
      G.ok("6. a debt comes due on the real clock", !!e?.id && cards.length === 1 && cards[0].whisper?.length > 0, {cards: cards.length, whisper: cards[0]?.whisper?.length ?? 0});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    Hooks.off("wodxEventFired", hf); Hooks.off("wodxEventUndone", hu);
    try {
      await ch.hold(true);
      await game.time.set(t0); await sleep(500);
      await game.settings.set(CH, "eventOverrides", saved.overrides ?? {});
      await game.settings.set(CH, "eventsFired", saved.fired);
      if ( saved.era && game.settings.get(CH, "activeEra") !== saved.era ) await game.settings.set(CH, "activeEra", saved.era);
      await game.settings.set(ST, "ledger", saved.ledger);
      await game.settings.set(ST, "markets", saved.markets);
      // the gate's chat lines go first: deleting them can write to the Storyteller's log, which is put back after
      const ids = mine().map(m => m.id);
      if ( ids.length ) await ChatMessage.deleteDocuments(ids);
      // then the hold as it was; the night work the released clock started can still be writing: let it settle,
      // then put both back
      await ch.hold(saved.held);
      await (ch?.nightwork ?? game.modules.get(CH)?.api?.nightwork)?.settle?.();
      await settle(() => WRITTEN.map(k => JSON.stringify(stored(k)?.value ?? null)).join());
      for ( const k of WRITTEN ) {
        const now = stored(k), was = writtenBefore[k];
        if ( !was && now ) await now.delete();
        else if ( was && now && now.value !== was.value ) await now.update({value: was.value});
        else if ( was && !now ) await game.settings.storage.get("world").documentClass.create(was);
      }
    } catch (e) { G.R.errors.push(`put back: ${e?.message ?? e}`); }
  }
  return G.finish();
}
