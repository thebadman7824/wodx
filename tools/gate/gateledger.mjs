/**
 * The Ledger (WoDX Storyteller 0.2.0) and languages in chat (WoDX Chronicle 0.5.1), in Foundry, in rothenstein-wodx only,
 * as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateledger.mjs?${Date.now()}`)).run()
 * Back the world up first. It holds the world while it moves the clock, uses actors of its own, and puts back the
 * ledger, the clock, the hold, the queue cards it made and its chat cards.
 *   1. modules: Storyteller 0.2.0+ with the ledger API; Chronicle 0.5.1+ with the languages API
 *   2. a dated debt fires once as the clock passes it (forced check with the world held), one whispered card
 *   3. the Veil: a breach of three witnesses lowers it by 2, and the card carries the undo
 *   4. a death: the open entry goes to the queue for the heir, and approving it passes it
 *   5. the Ledger window opens with its search boxes
 *   6. languages: a Latin line is made-up words for a player reader without Latin, plain for the Storyteller
 *   7. the Languages window opens with a search box
 *   8. put back
 * Result: Data/wodx-gate/gateledger-result.json.
 */
const S = "wodx-storyteller", CH = "wodx-chronicle", C = "wodx-creation";
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const newer = (a, b) => {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for ( let i = 0; i < 3; i++ ) if ( (pa[i] ?? 0) !== (pb[i] ?? 0) ) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return true;
};

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R, "gateledger-result.json"); }
  const st = game.modules.get(S)?.api, ch = game.modules.get(CH)?.api;
  const t0 = game.time.worldTime, held = !!ch?.isHeld?.();
  const savedLedger = foundry.utils.deepClone(game.settings.get(S, "ledger"));
  const queueBefore = new Set(ch?.approvals?.pending?.().map(q => q.id) ?? []);
  const msgsBefore = new Set(game.messages.map(m => m.id));
  const made = [];
  let folder;
  try {
    ok("1. modules", newer(game.modules.get(S)?.version, "0.2.0") && !!st?.ledger && newer(game.modules.get(CH)?.version, "0.5.1") && !!ch?.languages,
      {storyteller: game.modules.get(S)?.version, chronicle: game.modules.get(CH)?.version});
    await ch.hold(true);
    folder = await Folder.create({name: "WoDX gate · ledger", type: "Actor"});
    const debtor = await Actor.create({name: "Gate debtor", type: "Mortal", folder: folder.id}); made.push(debtor.id);
    const heir = await Actor.create({name: "Gate heir", type: "Mortal", folder: folder.id, flags: {[C]: {lineage: {family: {heirOf: {id: debtor.id, name: debtor.name}}}}}}); made.push(heir.id);

    const e = await st.ledger.save({kind: "debt", from: {id: debtor.id, name: debtor.name}, to: {id: null, name: "the gate"}, what: "Gate debt of ten groschen", due: t0 + 86400});
    const n0 = game.messages.size;
    await game.time.set(t0 + 2 * 86400); await sleep(400);
    // The world is held, so the gate checks by hand, twice: the second must post nothing
    await st.ledger.checkDue({force: true}); await sleep(300);
    await st.ledger.checkDue({force: true}); await sleep(200);
    const due = game.messages.filter(m => !msgsBefore.has(m.id) && /Comes due/.test(m.content) && /Gate debt/.test(m.content));
    ok("2. due once", due.length === 1 && due[0].whisper?.length > 0, {cards: due.length});

    const v0 = st.ledger.state().veil.value;
    // Straight to the ledger, not the wodxBreach hook, so no rumour starts in Rothenstein
    await st.ledger.breach({entry: {event: "gate breach", witnesses: [{}, {}, {}]}}); await sleep(500);
    const v1 = st.ledger.state().veil.value;
    const veilCard = game.messages.find(m => !msgsBefore.has(m.id) && m.flags?.[S]?.veilUndo === 2);
    ok("3. the Veil", v1 === Math.max(0, v0 - 2) && !!veilCard, {before: v0, after: v1});

    await debtor.update({[`flags.${C}.chronology.died`]: game.time.worldTime}); await sleep(800);
    const q = ch.approvals.pending().find(x => x.key === `inherit:${e.id}`);
    if ( q ) await ch.approvals.decide(q.id, "approve", "gate");
    await sleep(600);
    const after = st.ledger.state().entries.find(x => x.id === e.id);
    ok("4. inheritance", !!q && after?.from?.id === heir.id, {queued: !!q, from: after?.from});

    await st.ledger.open(); await sleep(500);
    const la = [...foundry.applications.instances.values()].find(a => a.rendered && a.element?.classList.contains("wodx-ledger-app"));
    ok("5. Ledger window", !!la && la.element.querySelectorAll("input.wodx-search").length >= 2);
    await la?.close();

    const msg = await ChatMessage.create({content: "<p>Pax tecum, frater</p>", speaker: {alias: "Gate"}, flags: {[CH]: {language: "Latin"}}});
    await sleep(500);
    const asGM = document.querySelector(`[data-message-id="${msg.id}"] .message-content`)?.textContent ?? "";
    const el = document.createElement("li"); el.innerHTML = `<div class="message-content"><p>Pax tecum, frater</p></div>`;
    const realUser = game.user;
    const player = game.users.find(u => !u.isGM);
    let asPlayer = "";
    if ( player ) {
      // The reader's view as a player without Latin: the same render, with the user swapped for the call
      Object.defineProperty(game, "user", {value: player, configurable: true, writable: true});
      try { Hooks.callAll("renderChatMessageHTML", msg, el); } finally { Object.defineProperty(game, "user", {value: realUser, configurable: true, writable: true}); }
      asPlayer = el.textContent;
    }
    ok("6. languages", /Pax tecum/.test(asGM) && /In Latin/.test(asGM) && (!player || (!/Pax tecum/.test(asPlayer) && /does not speak/.test(asPlayer))), {asGM: asGM.slice(0, 80), asPlayer: asPlayer.slice(0, 80)});

    await ch.languages.open(); await sleep(500);
    const lg = [...foundry.applications.instances.values()].find(a => a.rendered && a.element?.classList.contains("wodx-languages"));
    ok("7. Languages window", !!lg && !!lg.element.querySelector("input.wodx-search"));
    await lg?.close();
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      await game.settings.set(S, "ledger", savedLedger);
      for ( const id of made ) await game.actors.get(id)?.delete();
      await folder?.delete();
      const mineQ = (ch?.approvals?.pending?.() ?? []).filter(q => !queueBefore.has(q.id));
      for ( const q of mineQ ) await ch.approvals.decide(q.id, "reject", "gate");
      if ( game.time.worldTime !== t0 ) await game.time.set(t0);
      await sleep(400);
      const cards = game.messages.filter(m => !msgsBefore.has(m.id)).map(m => m.id);
      if ( cards.length ) await ChatMessage.deleteDocuments(cards);
      await ch?.hold?.(held);
      ok("8. put back", game.time.worldTime === t0 && !!ch?.isHeld?.() === held && !made.some(id => game.actors.get(id)), {removedCards: cards.length, removedQueue: mineQ.length});
    } catch (err) { ok("8. put back", false, {error: err.message}); }
  }
  return save(R, "gateledger-result.json");
}
