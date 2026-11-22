/**
 * Phase 7d gate (factions and domains), in Foundry, in any testbed world (never a Live world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gate7d.mjs?${Date.now()}`)).run()
 * Back the world up first.
 *
 * It tests whichever story chronicle is in play (Chronicle Packs Desk, last step; Ben 22 Nov 2026). When the chronicle
 * in play brings starting factions and its cast is in the world (rothenstein-wodx with WoDX Rothenstein), the gate sets
 * those up and reads every name from the pack: no chronicle is named here. With none (wodx-clean), or one without
 * factions, it registers a small chronicle of its own for the run: four factions, the scenes and the people they need,
 * all made by the gate and removed at the end, and the chronicle that was in play (or none) is put back.
 *
 * The gate never moves the clock: faction turns and rumour days are run at world times it names, which is what the
 * clock hooks do, so no other module's clock work runs. What it changes it puts back at the end: the factions record,
 * the faction settings, the approval queue, WoDX Actions' Masquerade ledger and History pages, and its chat cards. The
 * actors and scenes it makes (a copy of the culprit, a stranger, the witnesses, and in its own chronicle the cast and
 * places) are deleted. The chronicle's own actors are only read.
 *   0. the chronicle: the one in play, or the gate's own
 *   1. the modules: WoDX NPC 0.3.0 and WoDX Actions 3.11.2, the settings, the API
 *   2. the chronicle's starting factions: every one set up, each leader found, the ruler ruling
 *   3. hunting grounds: the court in its own domain; a stranger trespassing there
 *   4. a faction turn in Suggest: every result waits in the queue and nothing changes; approving one applies it
 *   5. two faction turns in Auto from a two-week time skip (the wodxSkipEnd hook): small ones applied with an Undo card
 *   6. Undo on the last turn card puts every faction back as it was before that turn
 *   7. a breach recorded in WoDX Actions (a copy of a Kindred faction's leader seen feeding by three mortals) becomes a
 *      rumour blamed on that faction
 *   8. the rumour followed for two weeks, a day at a time: it spreads, waits in the queue to reach the Prince
 *      (approved), then the hunters (the era's: the Inquisition in the Dark Ages), and the Storyteller stops it there
 *   9. every witness made to forget before the talk starts: a second breach is contained
 *  10. clean up, and the chronicle in play is the one before the gate
 * Result: Data/wodx-gate/gate7d-result.json.
 */
import {handsOnStart} from "./kit.mjs";
// The same module the engines import, so a chronicle registered here is the one WoDX NPC reads
const CD = () => import("/modules/wodx-chronicle/scripts/chronicle-data.mjs");
const {isLiveWorld} = await import("/modules/wodx-chronicle/scripts/live-worlds.mjs");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-npc";
const npc = () => game.modules.get(MOD).api, FX = () => npc().factions;
const chron = () => game.modules.get("wodx-chronicle").api;
const DAY = 86400;
// Factions compared whatever the key order: an Undo can give the same state with its keys in another order.
const sortKeys = v => Array.isArray(v) ? v.map(sortKeys) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])])) : v;
const sameState = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));

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
const ROLE = d => d?.flags?.[MOD]?.gateRole ?? "";
const gateMade = c => [...c].filter(d => ROLE(d).startsWith("7d"));

/*
 * The gate's own chronicle, for a world whose chronicle in play has no factions (or none is in play). Its places are
 * gate scenes and its people gate actors, matched by the same name rules a chronicle pack uses.
 */
const FIX = "gate-7d-chronicle";
const FIX_PLACES = ["The Keep", "Market Square", "Parish Church", "The Tavern", "The Mine", "The Village", "The Hermitage"].map(n => `Gate 7d · ${n}`);
const FIX_PEOPLE = [["Gate 7d Prince", "Vampire"], ["Gate 7d Cult Elder", "Vampire"], ["Gate 7d Priest", "Mortal"], ["Gate 7d Hunter", "Mortal"]];
const at = n => new RegExp(`^Gate 7d · ${n}$`);
const FIX_FACTIONS = {
  TITLE: "The gate's factions",
  MARKER: "Gate 7d Prince",
  ASK: "Set up the gate's four factions?",
  FACTIONS: [
    {key: "court", name: "The gate's court", kind: "kindred", ruler: true, leader: "Gate 7d Prince", members: ["Gate 7d Prince"], places: [at("The Keep")],
      assets: {herd: 3, status: 4, domain: 3, security: 1, retainers: 2, contacts: 1, resources: 2, influence: {crown: 2}}, goals: [{move: "defend"}], notes: "Gate 7d."},
    {key: "cult", name: "The gate's cult", kind: "kindred", leader: "Gate 7d Cult Elder", members: ["Gate 7d Cult Elder"], places: [at("The Mine")],
      assets: {herd: 1, retainers: 1, status: 1, contacts: 1, influence: {underworld: 1}}, goals: [{move: "recruit"}, {move: "scheme", target: "church"}], notes: "Gate 7d."},
    {key: "church", name: "The gate's parish", kind: "church", leader: "Gate 7d Priest", members: ["Gate 7d Priest"], places: [at("Parish Church")],
      assets: {status: 2, contacts: 2, resources: 1, influence: {church: 3}}, goals: [{move: "hunt"}], notes: "Gate 7d."},
    {key: "hunters", name: "The gate's hunters", kind: "hunters", leader: "Gate 7d Hunter", members: ["Gate 7d Hunter"], places: [at("The Hermitage")],
      assets: {contacts: 2, resources: 1, influence: {church: 1}}, goals: [], notes: "Gate 7d."}
  ],
  // No faction Hostile (-2) toward another: a war at the turn (NPC "Factions go to war by themselves") would add its own queue items
  STANDING: [["court", "church", -1], ["church", "court", -1], ["court", "cult", 1], ["cult", "court", 1], ["cult", "church", -1], ["hunters", "court", -1], ["church", "hunters", 1], ["hunters", "church", 1]]
};
const FIX_PACK = {id: FIX, title: "Gate 7d chronicle", manifest: {id: FIX, title: "Gate 7d chronicle", live: []}, factions: FIX_FACTIONS};

/** Put a chronicle with factions in play: the one in play if its cast is here, else the gate's own. */
async function chronicleForGate() {
  const C = await CD();
  const prev = C.currentId();
  const c = FX().chronicleFactions();
  if ( c && FX().findActor(c.MARKER ?? c.FACTIONS[0].leader) ) return {mode: "chronicle", id: prev, prev, back: async () => {}};
  const scenes = await Scene.createDocuments(FIX_PLACES.map((name, i) => ({name, width: 1000, height: 1000, flags: {[MOD]: {gateRole: `7d-place-${i}`}}})));
  const people = await Actor.createDocuments(FIX_PEOPLE.map(([name, type], i) => ({name, type, ownership: {default: 0}, flags: {[MOD]: {gateRole: `7d-cast-${i}`}}})));
  C.registerChronicle(FIX_PACK);
  C.useChronicle(FIX);
  return {mode: "gate", id: FIX, prev, made: {scenes: scenes.length, people: people.length},
    back: async () => { C.unregisterChronicle(FIX); C.useChronicle(prev); }};
}

// B6994 (#1824): the gate starts from Hands on, since new worlds start at Balanced (tools/gate/kit.mjs)
export async function run() {
  if ( isLiveWorld(game.world) ) throw new Error("Never in a Live world.");
  const back = await handsOnStart();
  try { return await body(); } finally { await back(); }
}

async function body() {
  const {R, ok, step} = harness();
  R.world = game.world.id;
  const start = Date.now(), t0 = game.time.worldTime;
  // What the gate will put back
  const keep = {
    factions: foundry.utils.deepClone(game.settings.get(MOD, "factions")), mode: game.settings.get(MOD, "factionMode"), days: game.settings.get(MOD, "turnDays"),
    approvals: foundry.utils.deepClone(game.settings.get("wodx-chronicle", "approvals")),
    autoApprove: foundry.utils.deepClone(game.settings.get("wodx-chronicle", "autoApprove") ?? {}),
    masq: masqJournal() ? {id: masqJournal().id, entries: foundry.utils.deepClone(masqJournal().flags["wodx-actions"].entries ?? []),
      pages: masqJournal().pages.map(p => ({_id: p.id, "text.content": p.text?.content ?? ""}))} : null,
    history: historyJournal() ? {id: historyJournal().id, pages: historyJournal().pages.map(p => p.id)} : null,
    messages: new Set(game.messages.map(m => m.id))
  };
  let culprit = null, stranger = null, witnesses = [], chronicle = null;

  await step("0. the chronicle", async () => {
    chronicle = await chronicleForGate();
    const C = await CD();
    // The gate's witnesses and stranger, in either mode: mortals who see, and a Kindred from outside every faction
    witnesses = await Actor.createDocuments([1, 2, 3, 4, 5].map(i => ({name: `Gate 7d Witness ${i}`, type: "Mortal", ownership: {default: 0}, flags: {[MOD]: {gateRole: `7d-witness-${i}`}}})));
    [stranger] = await Actor.createDocuments([{name: "Gate 7d Stranger", type: "Vampire", ownership: {default: 0}, flags: {[MOD]: {gateRole: "7d-stranger"}}}]);
    R.chronicle = {mode: chronicle.mode, inPlay: C.currentId(), before: chronicle.prev || null, made: chronicle.made ?? null};
    ok("0. a chronicle with factions is in play for the gate", C.currentId() === chronicle.id && !!FX().chronicleFactions() && witnesses.length === 5 && !!stranger, R.chronicle);
  });

  await step("1. the modules", async () => {
    const v = game.modules.get(MOD)?.version, va = game.modules.get("wodx-actions")?.version;
    const api = npc();
    ok("1. WoDX NPC 0.3.0 or later and WoDX Actions 3.11.2 or later, with the factions in the API", newer(v, "0.3.0") && newer(va, "3.11.2") && !!api?.factions && typeof api.openFactions === "function"
      && game.settings.settings.has(`${MOD}.factionMode`) && game.settings.settings.has(`${MOD}.turnDays`), {npc: v, actions: va, mode: keep.mode, days: keep.days});
  });

  await step("2. the chronicle's factions", async () => {
    await game.settings.set(MOD, "factions", FX().rules.blankState());
    const c = FX().chronicleFactions();
    const list = await FX().setupChronicleFactions({confirm: false});
    const s = FX().state();
    const nameOf = id => game.actors.get(id)?.name ?? null;
    // Each leader the pack names is the NPC its name finds in this world (none when that NPC is not here)
    const leaders = c.FACTIONS.map(r => ({faction: r.name, wants: FX().findActor(r.leader)?.id ?? null, got: s.factions.find(f => f.name === r.name)?.leader ?? null}));
    const ruler = c.FACTIONS.find(r => r.ruler);
    ok("2. every faction of the chronicle set up, each leader found by name, the ruler ruling", list?.length === c.FACTIONS.length && s.factions.length === c.FACTIONS.length
      && leaders.every(x => x.wants === x.got) && !!ruler && !!s.factions.find(f => f.ruler && f.name === ruler.name)?.leader,
    {title: c.TITLE, found: Object.fromEntries(leaders.map(x => [x.faction, nameOf(x.got)])),
      places: Object.fromEntries(s.factions.map(f => [f.name, f.places.map(p => FX().names(s).place(p))]))});
  });

  await step("3. hunting grounds", async () => {
    const s = FX().state(), court = s.factions.find(f => f.ruler);
    const ruler = game.actors.get(court.leader);
    const place = court.places[0];
    const own = FX().huntingFor(ruler, place), other = stranger ? FX().huntingFor(stranger, place) : null;
    // The night's step from the town's faith calendar (a curfew, a feast) moves both, within 3 to 10 (faction-rules huntingAt)
    const night = (d, h) => (h.church ? Math.min(10, Math.max(3, d + h.church)) : d);
    ok("3. in its own domain the court hunts at the area less Domain and Fame (never below 3), with its Herd's dice; a stranger trespasses at +security",
      !!place && own.difficulty === night(Math.max(3, own.area.difficulty - own.domainDots - own.fame), own) && own.herdDice >= court.assets.herd && !own.trespass
      && !!other && other.trespass?.faction === court.id && other.difficulty === Math.min(10, night(Math.max(3, other.area.difficulty - other.fame), other) + court.assets.security),
    {place: place ? FX().names(s).place(place) : null, ruler: ruler?.name, own, stranger: stranger?.name, other});
  });

  let afterSuggest = null;
  await step("4. a turn in Suggest", async () => {
    await game.settings.set(MOD, "factionMode", "suggest");
    // B6991 (#1824): since B4860 a world starts at Balanced, which approves small faction results on sight
    // (automation-rules: "wodx-npc.faction": "small"). This step tests the queue, so that standing rule is set aside
    // here and put back after the step (and again in step 10).
    const auto = foundry.utils.deepClone(game.settings.get("wodx-chronicle", "autoApprove") ?? {});
    if ( "wodx-npc.faction" in auto ) { const a2 = {...auto}; delete a2["wodx-npc.faction"]; await game.settings.set("wodx-chronicle", "autoApprove", a2); }
    try {
    const before = FX().state();
    const n0 = mine(start).length;
    const [rep] = await FX().runTurns({reason: "gate 7d", now: t0, forced: true});
    const queued = mine(start).length - n0;
    const queuedTitles = mine(start).slice(n0).map(p => p.title);
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
      && (!landed || landed.now === Math.max(0, Math.min(5, landed.was + landed.change.delta))), {lines: rep.lines, queued, queuedTitles, landed});
    } finally { await game.settings.set("wodx-chronicle", "autoApprove", auto); }
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
    ok("6. Undo puts every faction back as before the turn, and the card says so", sameState(strip(s), strip(afterFirst))
      && game.messages.get(card.id)?.content.includes("Undone") && game.messages.get(card.id)?.flags[MOD].factionTurn.undone === true, {first: first?.id});
  });

  let breachId = null;
  await step("7. a breach from WoDX Actions", async () => {
    // The culprit's faction: the chronicle's first Kindred faction that does not rule, with its leader in the world
    const s0 = FX().state();
    const cult = FX().chronicleFactions().FACTIONS.map(r => s0.factions.find(f => f.name === r.name))
      .find(f => f && f.kind === "kindred" && !f.ruler && game.actors.get(f.leader));
    if ( !cult ) throw new Error("the chronicle has no Kindred faction besides the ruler with its leader in the world");
    const src = game.actors.get(cult.leader);
    const data = src.toObject(); delete data._id; delete data._stats; delete data.folder;
    data.name = `${src.name} (Gate 7d)`; data.ownership = {default: 0}; data.flags = {...(data.flags ?? {}), [MOD]: {gateRole: "7d-culprit"}};
    culprit = await Actor.create(data);
    await FX().mutate(st => { st.factions.find(f => f.id === cult.id).members.push(culprit.id); return {state: st}; });
    const seen = witnesses.slice(0, 3);
    const b0 = new Set(FX().state().breaches.map(b => b.id));
    await game.wodxActions.recordBreach({by: culprit, event: "seen feeding behind the tavern", witnesses: seen});
    // The rumour is made in two writes (the breach, then who and which ledger entry): wait for the second
    for ( let i = 0; i < 40 && !FX().state().breaches.some(b => !b0.has(b.id) && b.masq); i++ ) await sleep(200);
    const b = FX().state().breaches.find(x => !b0.has(x.id));
    breachId = b?.id;
    ok("7. the breach is followed as a rumour, blamed on the culprit's faction, its severity from the witnesses", !!b && b.faction === cult.id && b.severity === FX().rules.severityFor(seen.length)
      && b.state === "live" && !!b.masq, {culprit: src.name, faction: cult.name, breach: b, witnesses: seen.map(w => w.name)});
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
    const era = FX().eraInfo().hunters;
    ok("8. it spread by day, rose to the Prince only when approved, and the Storyteller stopped it at the hunters (the era's)", prince && !!hunters && hunters.detail.includes(era)
      && stopped && b.stage === 1 && b.heard.length >= 2 && (court.standing[b.faction] ?? 0) <= 0, {log, hunters, era});
  });

  await step("9. contained before the talk starts", async () => {
    if ( !culprit ) throw new Error("no culprit from step 7");
    const seen = witnesses.slice(3);
    const b0 = new Set(FX().state().breaches.map(b => b.id));
    await game.wodxActions.recordBreach({by: culprit, event: "seen walking through a wall", witnesses: seen});
    // The rumour is made in two writes (the breach, then who and which ledger entry): wait for the second
    for ( let i = 0; i < 40 && !FX().state().breaches.some(b => !b0.has(b.id) && b.masq); i++ ) await sleep(200);
    const b = FX().state().breaches.find(x => !b0.has(x.id));
    for ( const w of seen ) await game.wodxActions.setWitnessState(w, "forgot", "gate 7d");
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
    await game.settings.set("wodx-chronicle", "autoApprove", keep.autoApprove);
    const mj = masqJournal();
    if ( keep.masq && mj ) { await mj.setFlag("wodx-actions", "entries", keep.masq.entries); await mj.updateEmbeddedDocuments("JournalEntryPage", keep.masq.pages); }
    else if ( !keep.masq && mj ) await mj.delete();
    const hj = historyJournal();
    if ( keep.history && hj ) { const extra = hj.pages.filter(p => !keep.history.pages.includes(p.id)).map(p => p.id); if ( extra.length ) await hj.deleteEmbeddedDocuments("JournalEntryPage", extra); }
    else if ( !keep.history && hj ) await hj.delete();
    const actors = gateMade(game.actors).map(a => a.id), scenes = gateMade(game.scenes).map(x => x.id);
    if ( actors.length ) await Actor.deleteDocuments(actors);
    if ( scenes.length ) await Scene.deleteDocuments(scenes);
    await chronicle?.back();
    const msgs = game.messages.filter(m => !keep.messages.has(m.id)).map(m => m.id);
    if ( msgs.length ) await ChatMessage.deleteDocuments(msgs);
    R.removed = {messages: msgs.length, actors: actors.length, scenes: scenes.length};
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
  const inPlayBack = (await CD()).currentId() === (chronicle?.prev ?? (await CD()).currentId());
  ok("10. everything is back: the factions record, the settings, the queue, the Masquerade ledger, the chronicle in play; what the gate made is gone",
    JSON.stringify(game.settings.get(MOD, "factions")) === JSON.stringify(keep.factions) && game.settings.get(MOD, "factionMode") === keep.mode
    && JSON.stringify(game.settings.get("wodx-chronicle", "approvals")?.pending ?? []) === JSON.stringify(keep.approvals?.pending ?? [])
    && (!keep.masq || JSON.stringify(masqJournal()?.flags["wodx-actions"].entries ?? []) === JSON.stringify(keep.masq.entries))
    && !gateMade(game.actors).length && !gateMade(game.scenes).length && inPlayBack && game.time.worldTime === t0, {...R.removed, ...back(), inPlay: (await CD()).currentId()});
  return save(R, "gate7d-result.json");
}
