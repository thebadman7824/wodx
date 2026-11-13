/**
 * Phase 7d gate (factions and domains), in Foundry, in rothenstein-wodx (Ben's testing world, 2026-11-08), as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gate7d.mjs?${Date.now()}`)).run()
 * Back the world up first.
 *
 * The gate never moves the clock: faction turns and rumour days are run at world times it names, which is what the
 * clock hooks do, so no other module's clock work runs. What it changes it puts back at the end: the factions record,
 * the faction settings, the approval queue, WoDX Actions' Masquerade ledger and History pages, and its chat cards. The
 * one actor it makes (a copy of Konrad, for the breach) is deleted. Rothenstein's own actors are only read.
 *   1. the modules: WoDX NPC 0.3.0 and WoDX Actions 3.11.2, the settings, the API
 *   2. Rothenstein's factions from the chronicle's notes: ten, with their leaders found
 *   3. hunting grounds: the court in its own domain; a stranger trespassing there
 *   4. a faction turn in Suggest: every result waits in the queue and nothing changes; approving one applies it
 *   5. two faction turns in Auto from a two-week time skip (the wodxSkipEnd hook): small ones applied with an Undo card
 *   6. Undo on the last turn card puts every faction back as it was before that turn
 *   7. a breach recorded in WoDX Actions (Konrad seen feeding by three mortals) becomes a rumour blamed on his cult
 *   8. the rumour followed for two weeks, a day at a time: it spreads, waits in the queue to reach the Prince
 *      (approved), then the hunters (the Inquisition in the Dark Ages), and the Storyteller stops it there (rejected)
 *   9. every witness made to forget before the talk starts: a second breach is contained
 *  10. clean up
 * Result: Data/wodx-gate/gate7d-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-npc";
const npc = () => game.modules.get(MOD).api, FX = () => npc().factions;
const chron = () => game.modules.get("wodx-chronicle").api;
const DAY = 86400;

async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
function harness() {
  const R = {started: new Date().toISOString(), steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 4).join(" | ")}); } };
  return {R, ok, step};
}
const newer = (a, b) => {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for ( let i = 0; i < 3; i++ ) if ( (pa[i] ?? 0) !== (pb[i] ?? 0) ) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return true;
};
const pending = () => chron().approvals.pending();
const mine = start => pending().filter(p => p.type === "wodx-npc.faction" && p.createdAt >= start);
const strip = s => s.factions.map(f => ({...f, guard: 0, places: [...f.places].sort()})).sort((a, b) => a.id.localeCompare(b.id));
const masqJournal = () => game.journal.find(x => x.flags?.["wodx-actions"]?.kind === "masquerade");
const historyJournal = () => game.journal.find(x => x.flags?.["wodx-actions"]?.kind === "history");

export async function run() {
  const {R, ok, step} = harness();
  const start = Date.now(), t0 = game.time.worldTime;
  // What the gate will put back
  const keep = {
    factions: foundry.utils.deepClone(game.settings.get(MOD, "factions")), mode: game.settings.get(MOD, "factionMode"), days: game.settings.get(MOD, "turnDays"),
    approvals: foundry.utils.deepClone(game.settings.get("wodx-chronicle", "approvals")),
    masq: masqJournal() ? {id: masqJournal().id, entries: foundry.utils.deepClone(masqJournal().flags["wodx-actions"].entries ?? []),
      pages: masqJournal().pages.map(p => ({_id: p.id, "text.content": p.text?.content ?? ""}))} : null,
    history: historyJournal() ? {id: historyJournal().id, pages: historyJournal().pages.map(p => p.id)} : null,
    messages: new Set(game.messages.map(m => m.id))
  };
  let konrad = null;

  await step("1. the modules", async () => {
    const v = game.modules.get(MOD)?.version, va = game.modules.get("wodx-actions")?.version;
    const api = npc();
    ok("1. WoDX NPC 0.3.0 or later and WoDX Actions 3.11.2 or later, with the factions in the API", newer(v, "0.3.0") && newer(va, "3.11.2") && !!api?.factions && typeof api.openFactions === "function"
      && game.settings.settings.has(`${MOD}.factionMode`) && game.settings.settings.has(`${MOD}.turnDays`), {npc: v, actions: va, mode: keep.mode, days: keep.days});
  });

  await step("2. Rothenstein's factions", async () => {
    await game.settings.set(MOD, "factions", FX().rules.blankState());
    const list = await FX().setupRothenstein({confirm: false});
    const s = FX().state();
    const lead = name => s.factions.find(f => f.name.startsWith(name))?.leader;
    const nameOf = id => game.actors.get(id)?.name ?? null;
    const found = Object.fromEntries(FX().ROTHENSTEIN.map(r => [r.name, nameOf(lead(r.name))]));
    ok("2. ten factions, the court ruling, the leaders found by name", list?.length === 10 && /Bogdan/.test(nameOf(lead("The Voivode")) ?? "")
      && /Ludovic/.test(nameOf(lead("The parish")) ?? "") && /Graff/.test(nameOf(lead("The German")) ?? "") && s.factions.find(f => f.ruler)?.name === "The Voivode's court",
    {found, places: Object.fromEntries(s.factions.map(f => [f.name, f.places.map(p => FX().names(s).place(p))]))});
  });

  await step("3. hunting grounds", async () => {
    const s = FX().state(), court = s.factions.find(f => f.ruler);
    const bogdan = game.actors.get(court.leader);
    const place = court.places[0];
    const stranger = game.actors.find(a => /Ilja the Starved|Wenzel the Hunted/i.test(a.name));
    const own = FX().huntingFor(bogdan, place), other = stranger ? FX().huntingFor(stranger, place) : null;
    ok("3. in its own domain the court hunts at the area less Domain and Fame (never below 3), with its Herd's dice; a stranger trespasses at +security",
      !!place && own.difficulty === Math.max(3, own.area.difficulty - own.domainDots - own.fame) && own.herdDice >= court.assets.herd && !own.trespass
      && (!other || (other.trespass?.faction === court.id && other.difficulty === Math.min(10, Math.max(3, other.area.difficulty - other.fame) + court.assets.security))),
    {place: place ? FX().names(s).place(place) : null, own, stranger: stranger?.name, other});
  });

  let afterSuggest = null;
  await step("4. a turn in Suggest", async () => {
    await game.settings.set(MOD, "factionMode", "suggest");
    const before = FX().state();
    const n0 = mine(start).length;
    const [rep] = await FX().runTurns({reason: "gate 7d", now: t0, forced: true});
    const queued = mine(start).length - n0;
    const sent = rep.lines.filter(l => l.status.startsWith("sent")).length;
    const unchanged = JSON.stringify(strip(FX().state())) === JSON.stringify(strip(before));
    // approve the first queued result that changes a Background
    const p = mine(start).find(x => x.data.changes.some(c => c.op === "bg"));
    let landed = null;
    if ( p ) {
      const c = p.data.changes.find(x => x.op === "bg");
      const val = st => { const f = st.factions.find(x => x.id === c.faction); return c.key === "influence" ? (f.assets.influence[c.sphere] ?? 0) : f.assets[c.key]; };
      const was = val(FX().state());
      await chron().approvals.decide(p.id, "approve");
      await sleep(300);
      landed = {change: c, was, now: val(FX().state())};
    }
    afterSuggest = FX().state();
    ok("4. Suggest: every result with a change waits in the queue, nothing lands until approved, then it does", queued === sent && unchanged
      && (!landed || landed.now === Math.max(0, Math.min(5, landed.was + landed.change.delta))), {lines: rep.lines, queued, landed});
  });

  let turnCards = [];
  await step("5. two turns in Auto from a two-week skip", async () => {
    await game.settings.set(MOD, "factionMode", "auto");
    // clear the queue of the gate's own leftovers from step 4, so step 8 reads only its own
    for ( const p of mine(start) ) await chron().approvals.decide(p.id, "reject");
    await FX().mutate(st => { st.lastTurn = t0 - 14 * DAY; return {state: st}; });
    const turns0 = FX().state().turns;
    const m0 = new Set(game.messages.map(m => m.id));
    Hooks.callAll("wodxSkipEnd", {from: t0 - 14 * DAY, to: t0, label: "gate 7d"});
    for ( let i = 0; i < 40 && FX().state().turns < turns0 + 2; i++ ) await sleep(250);
    await sleep(500);
    turnCards = game.messages.filter(m => !m0.has(m.id) && m.flags?.[MOD]?.factionTurn);
    const s = FX().state();
    const applied = turnCards.some(m => m.flags[MOD].factionTurn.inverse.length);
    ok("5. the skip ran two faction turns, each with its card; small changes applied (with Undo), big ones queued", s.turns === turns0 + 2 && turnCards.length === 2
      && s.lastTurn === t0 && turnCards.every(m => !m.flags[MOD].factionTurn.inverse.length || m.content.includes("wnpc-f-undo")), {turns: s.turns, cards: turnCards.length, applied,
      big: mine(start).map(p => p.title)});
  });

  await step("6. Undo on the last turn card", async () => {
    const card = turnCards.at(-1);
    const inv = card?.flags?.[MOD]?.factionTurn?.inverse ?? [];
    if ( !inv.length ) return ok("6. Undo (nothing applied in the last turn, so nothing to undo)", true, {note: "the last turn applied nothing"});
    // The state before the last turn: undo it and compare with the state after turn 1 of the two
    const first = turnCards.at(0);
    const afterFirst = (() => { const r = FX().rules.applyChanges(FX().state(), inv); return r.state; })();
    await FX().undoCard(card);
    await sleep(300);
    const s = FX().state();
    ok("6. Undo puts every faction back as before the turn, and the card says so", JSON.stringify(strip(s)) === JSON.stringify(strip(afterFirst))
      && game.messages.get(card.id)?.content.includes("Undone") && game.messages.get(card.id)?.flags[MOD].factionTurn.undone === true, {first: first?.id});
  });

  let breachId = null;
  await step("7. a breach from WoDX Actions", async () => {
    const src = game.actors.find(a => /^Konrad the Flesh-Smith$/i.test(a.name));
    if ( !src ) throw new Error("Rothenstein has no Konrad");
    const data = src.toObject(); delete data._id; delete data._stats; delete data.folder;
    data.name = "Konrad the Flesh-Smith (Gate 7d)"; data.ownership = {default: 0}; data.flags = {...(data.flags ?? {}), [MOD]: {gateRole: "konrad7d"}};
    konrad = await Actor.create(data);
    const cult = FX().state().factions.find(f => f.name === "Konrad's cult");
    await FX().mutate(st => { st.factions.find(f => f.id === cult.id).members.push(konrad.id); return {state: st}; });
    const witnesses = ["Jitka the Herbwife", "Tomas", "Mikhal the Tinker"].map(n => game.actors.getName(n)).filter(Boolean);
    const b0 = new Set(FX().state().breaches.map(b => b.id));
    await game.wodxActions.recordBreach({by: konrad, event: "seen feeding behind the tavern", witnesses});
    for ( let i = 0; i < 20 && FX().state().breaches.every(b => b0.has(b.id)); i++ ) await sleep(200);
    const b = FX().state().breaches.find(x => !b0.has(x.id));
    breachId = b?.id;
    ok("7. the breach is followed as a rumour, blamed on Konrad's cult, its severity from the witnesses", !!b && b.faction === cult.id && b.severity === FX().rules.severityFor(witnesses.length)
      && b.state === "live" && !!b.masq, {breach: b, witnesses: witnesses.map(w => w.name)});
  });

  await step("8. the rumour for two weeks", async () => {
    if ( !breachId ) throw new Error("no rumour to follow");
    const log = [];
    let prince = false, hunters = null, stopped = false;
    // the Church's hunters are kept from hearing too early: they hear by their Contacts once enough places know
    for ( let d = 1; d <= 14; d++ ) {
      await FX().tickBreaches(t0 + d * DAY + 60);
      const b = FX().state().breaches.find(x => x.id === breachId);
      const q = mine(start).find(p => p.key === `breach:${breachId}`);
      log.push({day: d, severity: b.severity, stage: b.stage, heard: b.heard.length, known: b.known.length, state: b.state, queued: q?.title ?? null});
      if ( q && q.data.changes.some(c => c.op === "stage" && c.stage === 1) ) { await chron().approvals.decide(q.id, "approve"); await sleep(300); prince = FX().state().breaches.find(x => x.id === breachId).stage === 1; }
      else if ( q && q.data.changes.some(c => c.op === "stage" && c.stage === 2) ) {
        hunters = {detail: q.detail};
        await chron().approvals.decide(q.id, "reject"); await sleep(300);
        stopped = FX().state().breaches.find(x => x.id === breachId).state === "stopped";
      }
      if ( stopped ) break;
    }
    const b = FX().state().breaches.find(x => x.id === breachId);
    const court = FX().state().factions.find(f => f.ruler);
    ok("8. it spread by day, rose to the Prince only when approved, and the Storyteller stopped it at the hunters (the Inquisition)", prince && !!hunters && /Inquisition/.test(hunters.detail)
      && stopped && b.stage === 1 && b.heard.length >= 2 && (court.standing[b.faction] ?? 0) <= 0, {log, hunters});
  });

  await step("9. contained before the talk starts", async () => {
    const witnesses = ["Little Anezka", "Old Vlasta"].map(n => game.actors.getName(n)).filter(Boolean);
    if ( !witnesses.length ) throw new Error("no witnesses");
    const b0 = new Set(FX().state().breaches.map(b => b.id));
    await game.wodxActions.recordBreach({by: konrad, event: "seen walking through the wall of the Adit", witnesses});
    for ( let i = 0; i < 20 && FX().state().breaches.every(b => b0.has(b.id)); i++ ) await sleep(200);
    const b = FX().state().breaches.find(x => !b0.has(x.id));
    for ( const w of witnesses ) await game.wodxActions.setWitnessState(w, "forgot", "gate 7d");
    await sleep(300);
    await FX().tickBreaches(t0 + DAY + 60);
    const after = FX().state().breaches.find(x => x.id === b?.id);
    ok("9. every witness made to forget: the rumour is contained", after?.state === "contained" && after.heard.length === 0, {breach: after});
  });

  // 10. Put everything back
  try {
    await game.settings.set(MOD, "factions", keep.factions);
    await game.settings.set(MOD, "factionMode", keep.mode);
    await game.settings.set(MOD, "turnDays", keep.days);
    await game.settings.set("wodx-chronicle", "approvals", keep.approvals);
    const mj = masqJournal();
    if ( keep.masq && mj ) { await mj.setFlag("wodx-actions", "entries", keep.masq.entries); await mj.updateEmbeddedDocuments("JournalEntryPage", keep.masq.pages); }
    else if ( !keep.masq && mj ) await mj.delete();
    const hj = historyJournal();
    if ( keep.history && hj ) { const extra = hj.pages.filter(p => !keep.history.pages.includes(p.id)).map(p => p.id); if ( extra.length ) await hj.deleteEmbeddedDocuments("JournalEntryPage", extra); }
    else if ( !keep.history && hj ) await hj.delete();
    if ( konrad ) await konrad.delete();
    const msgs = game.messages.filter(m => !keep.messages.has(m.id)).map(m => m.id);
    if ( msgs.length ) await ChatMessage.deleteDocuments(msgs);
    R.removed = {messages: msgs.length};
  } catch (e) { R.errors.push(`clean up: ${e.message}`); }
  await sleep(500);
  // Which part is not back, so a failure says where to look
  const back = () => {
    const pend = game.settings.get("wodx-chronicle", "approvals")?.pending ?? [], kept = keep.approvals?.pending ?? [];
    const ids = new Set(kept.map(p => p.id));
    return {factions: JSON.stringify(game.settings.get(MOD, "factions")) === JSON.stringify(keep.factions), mode: game.settings.get(MOD, "factionMode") === keep.mode,
      queue: JSON.stringify(pend) === JSON.stringify(kept), newInQueue: pend.filter(p => !ids.has(p.id)).map(p => `${p.type}: ${p.title}`).slice(0, 8),
      masq: !keep.masq || JSON.stringify(masqJournal()?.flags["wodx-actions"].entries ?? []) === JSON.stringify(keep.masq.entries), clock: game.time.worldTime === t0};
  };
  ok("10. everything is back: the factions record, the settings, the queue, the Masquerade ledger; the copy and the cards are gone",
    JSON.stringify(game.settings.get(MOD, "factions")) === JSON.stringify(keep.factions) && game.settings.get(MOD, "factionMode") === keep.mode
    && JSON.stringify(game.settings.get("wodx-chronicle", "approvals")?.pending ?? []) === JSON.stringify(keep.approvals?.pending ?? [])
    && (!keep.masq || JSON.stringify(masqJournal()?.flags["wodx-actions"].entries ?? []) === JSON.stringify(keep.masq.entries))
    && !game.actors.some(a => a.flags?.[MOD]?.gateRole === "konrad7d") && game.time.worldTime === t0, {...R.removed, ...back()});
  return save(R, "gate7d-result.json");
}
