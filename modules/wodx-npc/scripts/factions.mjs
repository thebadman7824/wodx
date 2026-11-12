/**
 * WoDX NPC 0.3.0 (Phase 7d): factions and domains.
 *
 *   Factions   A world setting holds every faction: members, leader, the places it holds (7c places, or any scene),
 *              its goals, its Backgrounds (Herd, Resources, Status, Retainers, Contacts, Domain and its security,
 *              Influence per sphere) and its standing with each other faction. The Factions window edits them.
 *   Turns      Every faction may act once a week of world time (B99): when a time skip ends (one turn a week, at
 *              most twelve), when the clock passes the week by itself, and when the Storyteller ends a session or
 *              asks for a turn. Each faction picks a move (expand, defend, scheme, recruit, hunt, lie low), rolls it
 *              from its Backgrounds and its leader, and says what it changes (faction-rules.mjs).
 *   Landing    Suggest (the default): every result goes to the approval queue. Auto: small results apply at once
 *              with an Undo card, and big ones go to the queue. Off: no turns or rumours run by themselves.
 *   Hunting    A place's area sets the hunting difficulty; Domain, Fame and Herd adjust it; another's domain is a
 *              trespass (V20 pp. 113-114, 259-260; V20 Dark Ages pp. 180-181, 334). The Hunting window rolls it.
 *   Breaches   A breach recorded in WoDX Actions' Masquerade ledger, or reported here, becomes a rumour. It spreads a
 *              day at a time through places and Contacts and rises to the Prince, then to the hunters of the era
 *              (in the Dark Ages, the Inquisition: B42). Each rise is a queue card, so the Storyteller can stop it.
 * Player characters are never changed by a faction turn: anything that touches one waits for the Storyteller.
 */
import * as F from "./faction-rules.mjs";
import * as PO from "./politics-rules.mjs";
import * as SX from "./secrets-rules.mjs";
import * as Media from "../../wodx-chronicle/scripts/media-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

export const TYPE = "wodx-npc.faction";

export function build(ctx) {
  const {MOD, esc, gmIds, isActiveGM, chron, routines} = ctx;
  const num = v => Number(v) || 0;
  const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };
  const skipping = () => { try { return !!chron()?.isSkipping?.(); } catch (e) { return false; } };
  const opt = (map, cur) => Object.entries(map).map(([k, v]) => `<option value="${esc(k)}"${String(k) === String(cur ?? "") ? " selected" : ""}>${esc(v)}</option>`).join("");
  // The hidden passer-by actors (0.27.0) join no faction or household
  const allActors = () => (game.actors?.contents ?? [...(game.actors?.values?.() ?? [])]).filter(a => !a.flags?.[MOD]?.passerbyBase);

  /* ------------------------------------------------------------------ */
  /*  Settings and the state                                             */
  /* ------------------------------------------------------------------ */

  function registerSettings() {
    game.settings.register(MOD, "factions", {scope: "world", config: false, type: Object, default: F.blankState()});
    game.settings.register(MOD, "spillover", {name: "Standing spills over (house rule)", hint: "When a faction's regard for a character moves, its close friends move the same way a step and its enemies the other way, through the approval queue. Off: only the faction itself moves.",
      scope: "world", config: true, type: Boolean, default: false});
    game.settings.register(MOD, "factionMode", {
      name: "Faction turns and rumours", hint: "Suggest sends every result to the approval queue. Auto applies small ones (a Background dot, a rumour moving a step) with an Undo card, and sends big ones to the queue.",
      scope: "world", config: true, type: String, default: "suggest", choices: {suggest: "Suggest (everything to the approval queue)", auto: "Auto (small changes apply, with an undo card)", off: "Off"}
    });
    game.settings.register(MOD, "factionSplits", {
      name: "Factions may split", hint: "A faction under strain (its leader gone, a botched move, a bad rumour) may break in two at a turn. Each split waits in the approval queue.",
      scope: "world", config: true, type: Boolean, default: true
    });
    game.settings.register(MOD, "playerFactions", {
      name: "Players may found factions", hint: "Players can ask to found a faction from their characters' own Backgrounds, and give orders to a faction they run. Every founding waits in the approval queue.",
      scope: "world", config: true, type: Boolean, default: true
    });
    game.settings.register(MOD, "factionPolitics", {
      name: "Politics inside factions", hint: "Factions that keep a court, a diocese or a barony run their own politics each faction turn: seats, standing, charges and favours. Off by default; changes that touch a player character or the top seat wait in the approval queue.",
      scope: "world", config: true, type: Boolean, default: false
    });
    game.settings.register(MOD, "turnDays", {
      name: "Days between faction turns", hint: "Each faction may act once in this many days of world time (a week by default).",
      scope: "world", config: true, type: Number, default: F.TURN_DAYS, range: {min: 1, max: 90, step: 1}
    });
  }
  const state = () => F.normState(foundry.utils.deepClone(setting("factions") ?? F.blankState()));
  let saving = Promise.resolve();
  /** Write the state (the active GM only). Writes are queued, so two quick changes never cross. */
  function save(next) {
    saving = saving.then(() => game.settings.set(MOD, "factions", F.normState(next))).catch(e => console.error(`${MOD} |`, e));
    return saving.then(() => { FactionsAppClass().refresh(); });
  }
  /** Change the state with a function of it, in the queue of writes, so it always works on the latest. */
  function mutate(fn) {
    let result;
    saving = saving.then(async () => {
      const s = state();
      const out = await fn(s);
      result = out?.result;
      await game.settings.set(MOD, "factions", F.normState(out?.state ?? s));
    }).catch(e => console.error(`${MOD} |`, e));
    return saving.then(() => { FactionsAppClass().refresh(); return result; });
  }
  const mode = () => setting("factionMode") ?? "suggest";

  /* ------------------------------------------------------------------ */
  /*  The world as the rules see it                                      */
  /* ------------------------------------------------------------------ */

  const futureOn = () => { try { return !!game.settings.get("wodx-chronicle", "rule.futureBranch"); } catch (e) { return false; } };
  function eraInfo() {
    let morality = "roads", year = 1197, name = "Dark Ages";
    try {
      const e = chron()?.eras?.activeEra?.();
      morality = e?.profile?.rules?.morality ?? morality;
      name = e?.profile?.name ?? name;
      year = chron()?.eras?.currentYear?.() ?? year;
    } catch (err) { /* defaults */ }
    // B42: the Inquisition in the Dark Ages (and while the Roads hold, to 1600); mortal hunters to 1998; then the imbued
    const hunters = year <= 1600 ? "the Inquisition" : year <= 1998 ? "mortal hunters (The Hunters Hunted II)" : "the imbued (Hunter: The Reckoning)";
    return {morality, year, name, hunters, spheres: F.spheresFor(morality, year), kinds: F.kindsFor(year), areas: F.areasFor(morality)};
  }
  const sceneOf = id => { try { return fromUuidSync(id); } catch (e) { return null; } };
  /** Every place a faction can hold or a rumour can reach: the 7c places, with their hunting area. */
  /**
   * The places a rumour can reach and a faction can hold: those tagged in 7c, and every other scene of the world (not a
   * battle map), with a kind guessed from its name, so a world with no tags still has a valley to talk in.
   */
  function placeList() {
    const out = [], seen = new Set();
    for ( const p of routines.listPlaces() ) {
      const doc = p.region ?? p.scene;
      out.push({id: p.id, name: p.name, kind: p.kind, area: doc?.flags?.[MOD]?.hunt?.area ?? null});
      if ( p.scene?.uuid && !p.region ) seen.add(p.scene.uuid);
    }
    for ( const sc of game.scenes ?? [] ) {
      if ( !sc?.uuid || seen.has(sc.uuid) || F.NOT_A_PLACE.test(sc.name ?? "") ) continue;
      out.push({id: sc.uuid, name: sc.name, kind: F.kindFromName(sc.name), area: sc.flags?.[MOD]?.hunt?.area ?? null});
    }
    return out;
  }
  function placeName(id, list = null) {
    const p = (list ?? placeList()).find(x => x.id === id);
    if ( p ) return p.name;
    const d = sceneOf(id);
    return d?.name ?? "a place no longer on the map";
  }
  function names(s) {
    const era = eraInfo(), list = placeList();
    return {
      faction: id => s.factions.find(f => f.id === id)?.name ?? "a faction gone",
      place: id => placeName(id, list),
      actor: id => game.actors?.get(id)?.name ?? "someone gone",
      sphere: k => era.spheres[k] ?? F.sphereName(k),
      state: s
    };
  }
  const attrOf = (a, k) => { const x = a?.system?.attributes?.[k]; return num(x?.total ?? x?.value); };
  function leaders(s) {
    const out = {};
    for ( const f of s.factions ) {
      const a = f.leader ? game.actors?.get(f.leader) : null;
      if ( !a || routines.downState?.(a) ) continue; // a leader dead or in torpor leads nobody
      out[f.id] = {manipulation: attrOf(a, "manipulation"), wits: attrOf(a, "wits"), charisma: attrOf(a, "charisma"), perception: attrOf(a, "perception")};
    }
    return out;
  }
  const pcActors = () => new Set(allActors().filter(a => a.hasPlayerOwner).map(a => a.id));
  /** NPC 0.25.0: what the politics rules need to know of each member of a faction with a polity. */
  const sheetText = (a, k) => { const v = a?.system?.[k]; return typeof v === "string" ? v : (typeof v?.value === "string" ? v.value : ""); };
  function politicsInfo(s) {
    const info = {};
    for ( const f of s.factions ) for ( const id of f.members ) {
      if ( info[id] ) continue;
      const a = game.actors?.get(id);
      if ( !a ) { info[id] = {name: "someone gone", alive: false}; continue; }
      info[id] = {name: a.name, alive: !routines.downState?.(a), pc: !!a.hasPlayerOwner, clan: sheetText(a, "clan"), sect: sheetText(a, "sect"), status: bgValue(a, "status"),
        tribe: sheetText(a, "tribe"), house: sheetText(a, "house"), court: sheetText(a, "court"), legion: sheetText(a, "legion"),
        rank: num(a.system?.renown?.rank), title: bgValue(a, "title"),
        creed: sheetText(a, "creed"), order: sheetText(a, "order") || sheetText(a, "creed"), faction: sheetText(a, "faction"), amenti: sheetText(a, "amenti"), wu: sheetText(a, "wu"),
        arete: num(a.system?.advantages?.arete?.permanent), rankbg: bgValue(a, "rank"),
        attrs: Object.fromEntries(["charisma", "manipulation", "wits", "perception", "strength", "dexterity"].map(k => [k, attrOf(a, k)]))};
    }
    return info;
  }
  /** Open boons in WoDX Storyteller's Ledger, as {id, size, from, to} actor ids. */
  function openBoons() {
    let entries = [];
    try { entries = game.settings.get("wodx-storyteller", "ledger")?.entries ?? []; } catch (e) { return []; }
    return entries.filter(e => e?.kind === "boon" && (e.status ?? "open") === "open" && e.from?.id && e.to?.id).map(e => ({id: e.id, size: e.size, from: e.from.id, to: e.to.id}));
  }
  /** NPC 0.37.0 (B1905): hooks held on secrets, as {holder, finder, secret, entry}, for the Accuse move. */
  function openHooks() {
    let open = null;
    try { open = new Set((game.settings.get("wodx-storyteller", "ledger")?.entries ?? []).filter(e => (e?.status ?? "open") === "open").map(e => e.id)); } catch (e) { open = null; }
    const out = [];
    for ( const a of game.actors ?? [] ) for ( const sec of SX.secretsOf(a.flags) ) {
      if ( sec.public ) continue;
      for ( const [finder, f] of Object.entries(sec.found) ) if ( !f.entry || !open || open.has(f.entry) ) out.push({holder: a.id, finder, secret: sec, entry: f.entry ?? null});
    }
    return out;
  }
  const streamFor = key => {
    const g = chron()?.gen;
    if ( g?.random ) return g.random(`faction:${key}`);
    let x = 0; for ( const c of key ) x = (x * 31 + c.charCodeAt(0)) >>> 0;
    return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
  };
  const newId = () => foundry.utils.randomID();
  const bgValue = (actor, name) => {
    const it = (actor?.items?.contents ?? [...(actor?.items ?? [])]).find(i => i.type === "Feature" && i.system?.type === "wod.types.background" && String(i.name).toLowerCase() === name);
    return num(it?.system?.value);
  };
  const factionsOf = (s, actorId) => s.factions.filter(f => f.members.includes(actorId) || f.leader === actorId);

  /* ------------------------------------------------------------------ */
  /*  Landing results: the queue, or applied with Undo                   */
  /* ------------------------------------------------------------------ */

  /** Apply changes now and say what they did. Returns {inverse, applied}. */
  async function applyNow(changes, {reason = ""} = {}) {
    const res = await mutate(s => {
      const r = F.applyChanges(s, changes, {ids: newId, now: game.time.worldTime});
      return {state: r.state, result: {inverse: r.inverse, applied: r.applied}};
    });
    for ( const c of res?.applied ?? [] ) if ( c.op === "found" ) await foundCard(c);
    for ( const c of changes ) if ( c.op === "pol-fight" ) await stageFight(c);
    for ( const c of changes ) if ( c.op === "pol-expose" ) await game.modules.get(MOD)?.api?.secrets?.expose?.(c.holder, c.secret, {by: c.finder, entry: c.entry, why: c.law}).catch?.(e => console.warn(`${MOD} | expose`, e));
    return res ?? {inverse: [], applied: []};
  }
  /**
   * NPC 0.26.0: a challenge with a player's character is staged as a fight through WoDX Combat when both are on the
   * scene; otherwise a card tells the Storyteller who challenges whom. The winner is the Storyteller's to record in the
   * Factions window (B1111).
   */
  async function stageFight(c) {
    const s = state(), n = names(s), sc = globalThis.canvas?.scene ?? null;
    const tok = id => sc?.tokens?.find(t => t.actorId === id) ?? null;
    const a = tok(c.challenger), b = tok(c.holder);
    const what = `${n.actor(c.challenger)} challenges ${n.actor(c.holder)} ${c.office ? `for ${c.title ?? "a seat"}` : "for Rank"} by ${c.how ?? "a challenge"}`;
    const end = c.noKill ? " It ends when one yields; no killing blow." : "";
    const fight = game.modules.get("wodx-combat")?.active ? game.modules.get("wodx-combat")?.api?.fight?.start : null;
    if ( a && b && typeof fight === "function" && /strength|monomacy|challenge/.test(String(c.how)) ) {
      const r = await fight({scene: sc, tokens: [a, b], source: "rivalry", why: `${what}.${end}`, sides: {[a.id]: "a", [b.id]: "b"}});
      if ( r?.done && r.done !== "nothing" && r.done !== "off" ) return r;
    }
    return ChatMessage.create({whisper: gmIds(), speaker: {alias: "WoDX factions"}, content: `<div class="wodx-card wnpc wnpc-faction"><h3>A challenge</h3>
      <p>${esc(what)}.${esc(end)} Play it out, then set the seat or the Rank in the Factions window.</p></div>`});
  }
  async function foundCard(c) {
    const s = state(), n = names(s);
    return ChatMessage.create({whisper: gmIds(), speaker: {alias: "WoDX factions"}, content: `<div class="wodx-card wnpc wnpc-faction"><h3>${esc(n.faction(c.faction))} has found someone</h3>
      <p>${esc(n.actor(c.actor))}, of ${esc(n.faction(c.target))}. What the hunters do now is yours to play; WoDX changes nothing.</p></div>`});
  }
  function proposeChanges(title, detail, changes, {key = null, kind = "turn", extra = {}} = {}) {
    return chron()?.propose?.({type: TYPE, key, title, detail, data: {kind, changes, ...extra}});
  }
  const tellUser = (userId, text) => ChatMessage.create({whisper: [...new Set([userId, ...gmIds()])], speaker: {alias: "WoDX factions"}, content: `<div class="wodx-card wnpc wnpc-faction"><p>${esc(text)}</p></div>`});
  function registerHandler() {
    chron()?.registerApprovalHandler?.(TYPE, {
      label: "Factions",
      approve: async entry => {
        const changes = entry.data?.changes ?? [];
        await applyNow(changes);
        if ( changes.some(c => c.op === "faction-add") ) await mutate(st => { st.lastTurn ??= game.time.worldTime; return {state: st}; });
        if ( entry.data?.kind === "found" && entry.data.userId ) await tellUser(entry.data.userId, `The Storyteller agrees: ${changes.find(c => c.op === "faction-add")?.faction?.name ?? "your faction"} is founded.`);
        // A rise approved: the Prince is displeased with the blamed faction; the hunters take up the hunt
        for ( const c of changes.filter(x => x.op === "stage") ) {
          const b = state().breaches.find(x => x.id === c.id);
          if ( !b?.faction ) continue;
          const more = c.stage === 1
            ? (c.faction !== b.faction ? [{op: "standing", faction: c.faction, other: b.faction, delta: -1}] : [])
            : [{op: "goal", faction: c.faction, goal: {move: "hunt", target: b.faction, note: `After the rumour: ${b.event}`}}, {op: "standing", faction: c.faction, other: b.faction, delta: -2}];
          if ( more.length ) await applyNow(more);
        }
      },
      reject: async entry => {
        if ( entry.data?.kind === "found" && entry.data.userId ) await tellUser(entry.data.userId, `The Storyteller does not let ${entry.data.changes?.find(c => c.op === "faction-add")?.faction?.name ?? "the faction"} be founded, for now.`);
        // Rejecting a rise or a spreading step stops the rumour there (the Storyteller's word)
        const ids = new Set((entry.data?.changes ?? []).filter(c => ["stage", "heard"].includes(c.op)).map(c => c.id));
        if ( ids.size ) await mutate(s => { for ( const b of s.breaches ) if ( ids.has(b.id) && b.state === "live" ) b.state = "stopped"; return {state: s}; });
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Faction turns                                                      */
  /* ------------------------------------------------------------------ */

  let running = null;
  /**
   * Run faction turns. count turns in a row, for reason ("a time skip", "the end of the session", ...). Each turn's
   * results land by the mode; a GM card reports them, with Undo for what applied.
   */
  async function runTurns({count = 1, reason = "", forced = false, now = game.time.worldTime, stamp = null} = {}) {
    if ( !isActiveGM() ) return null;
    if ( running ) await running;
    const m = forced && mode() === "off" ? "suggest" : mode();
    if ( m === "off" ) return null;
    const work = (async () => {
      const reports = [];
      for ( let i = 0; i < count; i++ ) {
        const s = state();
        const turn = s.turns + 1, era = eraInfo(), list = placeList();
        if ( !s.factions.some(f => F.activeIn(f, era.year)) ) break;
        const lead = leaders(s);
        const gone = new Set(s.factions.map(f => f.leader).filter(id => id && !lead[s.factions.find(f => f.leader === id).id]));
        const alive = new Set(allActors().filter(a => !routines.downState?.(a)).map(a => a.id));
        const results = F.runTurn(s, {streamFor, seedKey: `turn:${turn}:${Math.floor(now)}`, leaders: lead, places: list, pcActors: pcActors(), spheres: era.spheres, turn, now, ids: newId,
          year: era.year, gone, alive, splits: setting("factionSplits") !== false, name: id => game.actors?.get(id)?.name ?? null,
          politics: setting("factionPolitics") ? {info: politicsInfo(s), boons: openBoons(), hooks: openHooks()} : null});
        const lines = [];
        let undoAll = [];
        const n = names(s);
        let polN = 0;
        for ( const r of results ) {
          const words = r.move === "politics" ? [] : r.changes.map(c => F.describeChange(c, n));
          const roll = r.move === "politics" ? (r.size === "big" ? "Needs the Storyteller" : r.gathering ? "Inner turn and gathering" : "Inner turn")
            : r.move === "wait" ? "No orders yet" : r.move === "split" ? "A split under strain" : `${F.MOVES[r.move].label}: ${r.pool} dice at ${r.difficulty}, ${r.botch ? "a botch" : `${r.net} success${r.net === 1 ? "" : "es"}`}${r.defence ? ` against ${r.defence.net}` : ""}`;
          let status = "nothing changes";
          if ( r.changes.length ) {
            if ( m === "auto" && r.size === "small" ) {
              const done = await applyNow(r.changes);
              undoAll = [...done.inverse, ...undoAll];
              status = done.applied.length ? "applied" : "nothing to change";
            } else {
              const detail = r.move === "politics" ? r.changes.map(c => F.describeChange(c, n)).join("; ") : words.join("; ");
              await proposeChanges(`${n.faction(r.faction)}: ${r.text}`, `${roll}. ${detail}.`, r.changes, {key: `faction:${turn}:${r.faction}${r.move === "split" ? ":split" : r.move === "politics" ? `:politics:${polN++}` : ""}`, kind: r.move === "split" ? "split" : "turn", extra: {turn}});
              status = r.size === "big" ? "sent to the approval queue (a big change)" : "sent to the approval queue";
            }
          }
          lines.push({faction: n.faction(r.faction), text: r.text, roll, dice: r.dice.join(" "), words, status});
        }
        await mutate(st => { st.turns = turn; st.lastTurn = stamp ?? now; st.log = [{turn, at: now, reason, lines: lines.map(l => `${l.text} (${l.status})`)}, ...st.log].slice(0, 100);
          for ( const f of st.factions ) if ( f.guard && f.guard < turn ) f.guard = 0;
          return {state: st}; });
        reports.push({turn, lines});
        await turnCard(turn, reason, lines, undoAll, m);
      }
      return reports;
    })();
    running = work.finally(() => { running = null; });
    return work;
  }
  async function turnCard(turn, reason, lines, inverse, m) {
    const body = lines.map(l => `<li><b>${esc(l.faction)}</b>: ${esc(l.text)} <span class="wodx-quiet">${esc(l.roll)}${l.dice ? ` [${esc(l.dice)}]` : ""}${l.words.length ? `; ${esc(l.words.join("; "))}` : ""}; ${esc(l.status)}.</span></li>`).join("");
    return ChatMessage.create({whisper: gmIds(), speaker: {alias: "WoDX factions"},
      flags: {[MOD]: {factionTurn: {turn, inverse, undone: false}}},
      content: `<div class="wodx-card wnpc wnpc-faction"><h3>Faction turn ${turn}${reason ? `, ${esc(reason)}` : ""}</h3><ul class="wnpc-lines">${body || "<li>No faction acted.</li>"}</ul>
        ${inverse.length ? `<div class="wnpc-done">Applied in Auto. <button type="button" class="wnpc-f-undo">Undo</button></div>` : (m === "suggest" ? `<p class="wodx-quiet">Suggest: the results wait in the approval queue.</p>` : "")}</div>`});
  }
  async function undoCard(msg, key = "factionTurn") {
    const data = foundry.utils.deepClone(msg.flags?.[MOD]?.[key]);
    if ( !data?.inverse?.length || data.undone || !game.user.isGM ) return null;
    await applyNow(data.inverse);
    data.undone = true;
    const html = String(msg.content).replace(/<div class="wnpc-done">[\s\S]*?<\/div>/, `<div class="wnpc-done"><b>Undone.</b></div>`);
    return msg.update({content: html, [`flags.${MOD}.${key}`]: data});
  }

  /** On a skip or when the clock moves: run the turns that are due, and the rumours' days. */
  async function onClock(reason) {
    if ( !isActiveGM() || mode() === "off" ) return;
    const now = game.time.worldTime;
    const s = state();
    if ( s.lastTurn === null ) { await mutate(st => { st.lastTurn = now; return {state: st}; }); }
    else {
      const due = F.turnsDue(s.lastTurn, now, {days: setting("turnDays") ?? F.TURN_DAYS});
      if ( due.due ) {
        const label = reason === "skip" ? `a time skip${due.skipped ? ` (${due.skipped} more quiet week${due.skipped === 1 ? "" : "s"} pass unplayed)` : ""}` : "a week passes";
        // The week's remainder carries over: the next turn falls a whole week after this one's week, not after now
        const stamp = due.skipped ? now : s.lastTurn + due.due * due.span;
        await runTurns({count: due.due, reason: label, now, stamp});
      }
      if ( reason === "skip" ) await untended(s.lastTurn, now);
    }
    await yearSweep();
    await tickBreaches(now);
  }
  /**
   * NPC 0.17.0: factions given a founding or an ending year wake or fall quiet as the clock passes those years, with an
   * Undo card. They were the Storyteller's own dates, so nothing waits in the queue.
   */
  let lastYear = null;
  async function yearSweep({force = false} = {}) {
    if ( !isActiveGM() ) return null;
    const year = eraInfo().year;
    if ( !force && year === lastYear ) return null;
    lastYear = year;
    const ch = F.yearChanges(state(), year);
    if ( !ch.length ) return null;
    const done = await applyNow(ch);
    if ( !done.applied.length ) return null;
    const n = names(state());
    return ChatMessage.create({whisper: gmIds(), speaker: {alias: "WoDX factions"}, flags: {[MOD]: {factionYears: {inverse: done.inverse, undone: false}}},
      content: `<div class="wodx-card wnpc wnpc-faction"><h3>The year is ${esc(year)}</h3><ul class="wnpc-lines">${done.applied.map(c => `<li>${esc(F.describeChange(c, n))}</li>`).join("")}</ul>
        <p class="wodx-quiet">By the founding and ending years set on these factions.</p><div class="wnpc-done"><button type="button" class="wnpc-f-undo" data-key="factionYears">Undo</button></div></div>`});
  }
  /**
   * NPC 0.17.0: a dated event of WoDX Chronicle has fired. Factions set to rise or end on it do so at once (Undo on the
   * card); a new power the event brings is offered through the approval queue.
   */
  async function onEventFired(ev) {
    if ( !isActiveGM() || !ev?.id ) return null;
    const s = state(), year = Number(ev.year) || eraInfo().year;
    const {changes, offer} = F.eventChanges(s, ev.id, year, {newId});
    let card = null;
    if ( changes.length ) {
      const done = await applyNow(changes);
      const n = names(state());
      if ( done.applied.length ) card = await ChatMessage.create({whisper: gmIds(), speaker: {alias: "WoDX factions"}, flags: {[MOD]: {factionYears: {inverse: done.inverse, undone: false}}},
        content: `<div class="wodx-card wnpc wnpc-faction"><h3>${esc(ev.name ?? "A dated event")}</h3><ul class="wnpc-lines">${done.applied.map(c => `<li>${esc(F.describeChange(c, n))}</li>`).join("")}</ul>
          <div class="wnpc-done"><button type="button" class="wnpc-f-undo" data-key="factionYears">Undo</button></div></div>`});
    }
    if ( PO.isMaelstrom(ev.id) ) await onMaelstrom(ev, year);
    if ( offer && mode() !== "off" ) await proposeChanges(`A new power: ${offer.name}`, `${ev.name ?? "A dated event"} (${year}). ${offer.notes} Approve to add it as a faction with no dots; set its leader, members and Backgrounds in the Factions window.`,
      [{op: "faction-add", faction: offer}], {key: `event:${ev.id}`, kind: "event"});
    return {card, offer};
  }
  /** NPC 0.26.0: a Great Maelstrom empties seats in each necropolis (B1112), with an Undo card. */
  async function onMaelstrom(ev, year) {
    const changes = PO.maelstromChanges(state(), {year, rand: streamFor(`maelstrom:${ev.id}`)});
    if ( !changes.length ) return null;
    const done = await applyNow(changes);
    if ( !done.applied.length ) return null;
    const n = names(state());
    return ChatMessage.create({whisper: gmIds(), speaker: {alias: "WoDX factions"}, flags: {[MOD]: {factionYears: {inverse: done.inverse, undone: false}}},
      content: `<div class="wodx-card wnpc wnpc-faction"><h3>${esc(ev.name ?? "A Great Maelstrom")}: the Tempest takes its officers</h3><ul class="wnpc-lines">${done.applied.map(c => `<li>${esc(F.describeChange(c, n))}</li>`).join("")}</ul>
        <div class="wnpc-done"><button type="button" class="wnpc-f-undo" data-key="factionYears">Undo</button></div></div>`});
  }
  /** B83 for factions: one whose leader and members are all gone loses a dot of each Background per untended decade. */
  async function untended(from, to) {
    const decades = Math.floor((to - from) / (365.25 * 86400) / 10);
    if ( decades < 1 ) return;
    for ( const f of state().factions ) {
      if ( f.dormant || f.owners.length ) continue;
      const people = [f.leader, ...f.members].filter(Boolean).map(id => game.actors?.get(id));
      const gone = people.length && people.every(a => !a || routines.downState?.(a));
      if ( !gone ) continue;
      const ch = F.untendedLoss(f, decades);
      if ( ch.length ) await proposeChanges(`${f.name}: its Backgrounds go untended`, `Nobody of ${f.name} is left to tend them for ${decades} decade${decades === 1 ? "" : "s"}: a dot of each per decade.`, ch, {key: `untended:${f.id}:${Math.floor(to)}`, kind: "untended"});
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Breaches and rumours                                               */
  /* ------------------------------------------------------------------ */

  /** WoDX Actions' Masquerade ledger, read straight from the journal's flags. */
  function masqEntries() {
    const j = game.journal?.find?.(x => x.flags?.["wodx-actions"]?.kind === "masquerade");
    return j?.flags?.["wodx-actions"]?.entries ?? [];
  }
  /** Start following a breach as a rumour. */
  async function reportBreach({severity = 1, place = null, by = null, faction = null, event = "", masq = null} = {}) {
    if ( !game.user.isGM ) return null;
    const s = state();
    const byActor = by ? game.actors?.get(by) : null;
    const fac = faction ?? (byActor ? factionsOf(s, byActor.id).find(f => f.secret)?.id ?? factionsOf(s, byActor.id)[0]?.id : null) ?? null;
    const id = newId();
    const done = await applyNow([{op: "breach", id, faction: fac, place, severity, by, event}]);
    await mutate(st => { const b = st.breaches.find(x => x.id === id); if ( b ) { b.byName = byActor?.name ?? ""; b.masq = masq; } return {state: st}; });
    const n = names(state());
    await ChatMessage.create({whisper: gmIds(), speaker: {alias: "WoDX factions"}, flags: {[MOD]: {breachStart: {id, inverse: done.inverse, undone: false}}},
      content: `<div class="wodx-card wnpc wnpc-faction"><h3>A rumour starts</h3><p>${esc(event || "Something was seen")}${place ? ` at ${esc(n.place(place))}` : ""}. ${esc(F.SEVERITY[severity] ?? "")}.</p>
        <p class="wodx-quiet">${fac ? `It is laid at the door of ${esc(n.faction(fac))}. ` : ""}It spreads a day at a time; each rise to the Prince or the hunters waits for you.</p>
        <div class="wnpc-done"><button type="button" class="wnpc-f-undo" data-key="breachStart">Do not follow it</button></div></div>`});
    return id;
  }
  /** From WoDX Actions: a breach recorded in the Masquerade ledger. */
  async function onActionsBreach({entry, by} = {}) {
    if ( !isActiveGM() || mode() === "off" || !entry ) return;
    // A closed place or Elysium keeps it: no rumour goes out to the town (WoDX Actions 3.42.0)
    if ( entry.spread === false ) return;
    const actor = by?.uuid ? (await fromUuid(by.uuid)) : null;
    const a = actor?.actor ?? actor;
    const where = a ? (routines.whereOf?.(a)?.place ?? null) : null;
    const tok = a ? canvas?.tokens?.placeables?.find(t => t.actor?.id === a.id) : null;
    const regionPlace = tok?.document?.regions ? [...tok.document.regions].find(r => r.flags?.[MOD]?.place?.kind)?.uuid : null;
    const scenePlace = canvas?.scene?.flags?.[MOD]?.place?.kind ? canvas.scene.uuid : null;
    await reportBreach({severity: F.severityFor(entry.witnesses?.length ?? 1), place: regionPlace ?? scenePlace ?? where, by: a?.id ?? null, event: `${entry.by} ${entry.event}`, masq: entry.id});
  }
  /** Each day of each live rumour: it spreads (small), may rise (big, always queued), and fades in a quiet week. */
  async function tickBreaches(now = game.time.worldTime) {
    if ( !isActiveGM() || mode() === "off" ) return;
    const m = mode();
    let undo = [];
    const lines = [];
    const masq = masqEntries();
    for ( const b0 of state().breaches ) {
      if ( b0.state !== "live" ) continue;
      // Every witness dealt with before the talk began: the breach is contained
      if ( b0.masq ) {
        const e = masq.find(x => x.id === b0.masq);
        if ( e && e.witnesses?.length && e.witnesses.every(w => !["saw", "told"].includes(w.state)) && !b0.heard.length ) {
          await mutate(st => { const b = st.breaches.find(x => x.id === b0.id); if ( b ) b.state = "contained"; return {state: st}; });
          lines.push(`${b0.event}: every witness is dealt with, and the rumour is contained.`);
          continue;
        }
      }
      const days = F.daysDue(b0, now);
      for ( let d = 1; d <= days; d++ ) {
        const s = state(), b = s.breaches.find(x => x.id === b0.id);
        if ( !b || b.state !== "live" ) break;
        const t = b.lastStep + 86400;
        if ( F.fades(b, t) ) {
          const ch = [{op: "breach-sev", id: b.id, delta: -1}, {op: "breach-set", id: b.id, lastStep: t, lastFed: t}];
          if ( m === "auto" ) { const r = await applyNow(ch); undo = [...r.inverse, ...undo]; lines.push(`${b.event}: a quiet week, and the talk fades.`); }
          else { await proposeChanges(`A rumour fades: ${b.event}`, "A week with nothing new to feed it.", ch, {key: `breach:${b.id}`, kind: "breach"}); break; }
          continue;
        }
        const step = F.spreadDay(s, b, placeList(), streamFor(`breach:${b.id}:${Math.floor(t)}`), {now: t, perDay: Media.breachReach(b.severity, eraInfo().year, {future: futureOn()})});
        const small = step.changes.filter(c => c.op !== "stage");
        const n = names(s);
        if ( m === "auto" ) { const r = await applyNow(small); undo = [...r.inverse, ...undo]; const w = small.map(c => F.describeChange(c, n)).filter(x => x !== "The rumour lingers"); if ( w.length ) lines.push(`${b.event}: ${w.join("; ")}.`); }
        if ( step.rise ) {
          const who = step.rise.stage === 2 ? `${n.faction(step.rise.faction)}, ${eraInfo().hunters}` : n.faction(step.rise.faction);
          const pre = m === "auto" ? [] : small;
          await proposeChanges(`The rumour reaches ${step.rise.stage === 1 ? "the Prince" : "the hunters"}: ${b.event}`,
            `${who} hear${step.rise.stage === 1 ? "s" : ""} of it (${F.SEVERITY[b.severity] ?? ""}). Approve to let it rise; reject to stop the rumour here.`,
            [...pre, ...step.changes.filter(c => c.op === "stage")], {key: `breach:${b.id}`, kind: "breach"});
          break;
        }
        if ( m !== "auto" ) {
          const w = small.map(c => F.describeChange(c, n));
          if ( small.some(c => c.places?.length || c.known?.length) ) { await proposeChanges(`A rumour spreads: ${b.event}`, `${w.join("; ")}.`, small, {key: `breach:${b.id}`, kind: "breach"}); break; }
          await applyNow(small); // a day with no news only moves the rumour's clock
        }
      }
    }
    if ( lines.length ) await ChatMessage.create({whisper: gmIds(), speaker: {alias: "WoDX factions"}, flags: {[MOD]: {factionRumours: {inverse: undo, undone: false}}},
      content: `<div class="wodx-card wnpc wnpc-faction"><h3>Rumours</h3><ul class="wnpc-lines">${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>
        ${undo.length ? `<div class="wnpc-done">Applied in Auto. <button type="button" class="wnpc-f-undo" data-key="factionRumours">Undo</button></div>` : ""}</div>`});
  }

  /* ------------------------------------------------------------------ */
  /*  Hunting                                                            */
  /* ------------------------------------------------------------------ */

  const METHODS = {
    "appearance+subterfuge": "Appearance + Subterfuge (a seduction)", "wits+streetwise": "Wits + Streetwise (stalking)",
    "stamina+athletics": "Stamina + Athletics (a chase)", "manipulation+persuasion": "Manipulation + Persuasion (talked into it)",
    "charisma+empathy": "Charisma + Empathy (a willing vessel)", "dexterity+stealth": "Dexterity + Stealth (taken asleep)"
  };
  const abilityOf = (a, k) => {
    const flat = a?.system?.abilities?.[k];
    if ( flat && flat.value !== undefined ) return num(flat.value);
    const it = (a?.items?.contents ?? [...(a?.items ?? [])]).find(i => ["Ability", "Trait"].includes(i.type) && (i.system?.id === k || String(i.name).toLowerCase() === k));
    return num(it?.system?.value);
  };
  /** Hunting for one actor at one place: what the books give, read from the factions (no roll). */
  /** Tonight's step from the church year (WoDX Chronicle), when its house rule is on. */
  function churchStep() {
    try { const c = game.modules.get("wodx-chronicle")?.api?.church?.today?.(); return c?.active ? c.huntStep : 0; } catch (e) { return 0; }
  }
  function huntingFor(actor, placeId) {
    const s = state(), era = eraInfo();
    const place = placeList().find(p => p.id === placeId) ?? {id: placeId, kind: "other"};
    return F.huntingAt(s, place, {factions: factionsOf(s, actor?.id).map(f => f.id), herd: bgValue(actor, "herd"), domain: bgValue(actor, "domain"), fame: bgValue(actor, "fame")}, era.morality, {churchStep: churchStep()});
  }
  async function huntDialog(actor = canvas?.tokens?.controlled?.[0]?.actor ?? null) {
    if ( !game.user.isGM ) return null;
    const era = eraInfo(), list = placeList();
    const hunters = allActors().filter(a => a.type === "Vampire" || a.id === actor?.id).sort((a, b) => a.name.localeCompare(b.name));
    const content = `<div class="wnpc-hunt">
      <p class="wodx-quiet">Each hour of hunting is a roll against the area's difficulty. Domain and Fame lower it a dot each (to 3), Herd adds a die a dot where the herd could be, and another's domain is a trespass (${era.morality === "roads" ? "V20 Dark Ages pp. 180-181, 334" : "V20 pp. 113-114, 259-260"}).</p>
      ${hunters.length > 5 ? searchBox(".wnpc-hunt select[name=actor]", "Search hunters…", "Search hunters") : ""}
      <div class="wodx-field"><label>Hunter</label><select name="actor">${hunters.map(a => `<option value="${a.id}"${a.id === actor?.id ? " selected" : ""}>${esc(a.name)}</option>`).join("")}</select></div>
      ${list.length > 5 ? searchBox(".wnpc-hunt select[name=place]", "Search places…", "Search places") : ""}
      <div class="wodx-field"><label>Where</label><select name="place">${list.map(p => `<option value="${esc(p.id)}"${p.id === canvas?.scene?.uuid ? " selected" : ""}>${esc(p.name)} (${esc(F.areaOf(p, era.morality).label)}, ${F.areaOf(p, era.morality).difficulty})</option>`).join("")}</select></div>
      <div class="wodx-field"><label>How</label><select name="method" data-fixed>${opt(METHODS, "wits+streetwise")}</select></div>
      <div class="wodx-field"><label>Hours</label><input type="number" name="hours" value="1" min="1" max="8"></div></div>`;
    const data = await foundry.applications.api.DialogV2.wait({window: {title: "Hunting"}, classes: ["wodx-dialog", "wodx-npc-dialog"], position: {width: 560, height: "auto"}, content,
      buttons: [{action: "roll", label: "Roll", default: true, callback: (ev, b) => new foundry.applications.ux.FormDataExtended(b.form).object}, {action: "cancel", label: "Cancel"}], rejectClose: false});
    if ( !data || data === "cancel" ) return null;
    return hunt(game.actors.get(data.actor), data.place, {method: data.method, hours: num(data.hours) || 1});
  }
  /** Roll a hunt: one roll an hour until prey is caught or the hours run out. */
  async function hunt(actor, placeId, {method = "wits+streetwise", hours = 1} = {}) {
    if ( !actor ) return null;
    const h = huntingFor(actor, placeId);
    const [at, ab] = method.split("+");
    const pool = attrOf(actor, at) + abilityOf(actor, ab) + h.herdDice;
    const rolls = [];
    let caught = false, botch = false;
    for ( let i = 0; i < Math.max(1, Math.min(8, hours)) && !caught && !botch; i++ ) {
      const r = await new Roll(`${Math.max(1, pool)}d10`).evaluate();
      const dice = r.dice[0]?.results?.map(x => x.result) ?? [];
      const res = F.successes(dice, h.difficulty);
      rolls.push({roll: r, dice, res});
      caught = res.net > 0; botch = res.botch;
    }
    const s = state(), n = names(s);
    const last = rolls.at(-1)?.res;
    const verdict = caught ? `Prey found in hour ${rolls.length}.` : botch ? "A botch: a complication (a vessel killed, a disease, a rival's domain, an attack)." : `${rolls.length} hour${rolls.length === 1 ? "" : "s"} spent, and nothing.`;
    const tres = h.trespass ? `<p>This is ${esc(h.trespass.name)}'s domain: a trespass, at +${h.trespass.security} for its security (V20 p. 113).</p>` : "";
    const msg = await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor}), whisper: actor.hasPlayerOwner ? undefined : gmIds(), rolls: rolls.map(r => r.roll),
      content: `<div class="wodx-card wnpc wnpc-faction"><h3>${esc(actor.name)} hunts at ${esc(n.place(placeId))}</h3>
        <p class="wodx-quiet">${esc(METHODS[method] ?? method)}${h.herdDice ? ` + Herd ${h.herdDice}` : ""}: ${pool} dice at ${h.difficulty} (${esc(h.area.label)} ${h.area.difficulty}${h.domainDots ? `, Domain −${h.domainDots}` : ""}${h.fame ? `, Fame −${h.fame}` : ""}${h.church ? `, ${h.church < 0 ? "a night of revel −1" : "a fast +1"}` : ""}${h.trespass ? `, trespass +${h.trespass.security}` : ""}).</p>
        <p>${rolls.map(r => `[${r.dice.join(" ")}]`).join(" ")}</p><p><b>${esc(verdict)}</b></p>${tres}</div>`});
    // A trespass the holder notices (a botch, or a holder with Domain security watching) sours its standing: queued
    if ( h.trespass && (botch || (last && h.trespass.security > 0 && last.net <= h.trespass.security)) ) {
      const mine = factionsOf(s, actor.id)[0];
      if ( mine ) await proposeChanges(`${h.trespass.name} notices a trespass`, `${actor.name} hunted in its domain without leave.`, [{op: "standing", faction: h.trespass.faction, other: mine.id, delta: -1}], {key: `trespass:${actor.id}:${h.trespass.faction}`, kind: "trespass"});
    }
    return {...h, pool, rolls: rolls.map(r => ({dice: r.dice, ...r.res})), caught, botch, message: msg};
  }

  /* ------------------------------------------------------------------ */
  /*  Rothenstein's own factions                                         */
  /* ------------------------------------------------------------------ */

  /**
   * The powers of the valley as the chronicle's notes give them ("The Domain of Rothenstein", "Overview & Cast", "The
   * Herd", "The Weavers' Guild Hall", "Hunter & Inquisition Threats"). The dots are WoDX's estimates from those notes
   * (B102), for the Storyteller to adjust. Members and places are matched by name; anything not found is left out.
   */
  const ROTHENSTEIN = [
    {key: "court", name: "The Voivode's court", kind: "kindred", ruler: true, leader: "Bogdan Ursu", members: ["Bogdan Ursu"], places: [/kranzfels|keep floors|inner ward|great hall/i],
      assets: {herd: 4, status: 5, domain: 4, security: 1, retainers: 3, contacts: 1, resources: 3, influence: {crown: 2, military: 2}}, goals: [{move: "defend"}, {move: "recruit"}],
      notes: "Bogdan holds the keep and gives judgment; the Herd is thirty-one named mortals, the Voivode's to ration (Herd 4: thirty vessels)."},
    {key: "cult", name: "Konrad's cult", kind: "kindred", leader: "Konrad", members: ["Konrad", "Kasimir"], places: [/silver adit|konrad/i],
      assets: {herd: 1, retainers: 2, status: 1, contacts: 1, influence: {underworld: 1, guild: 1}}, goals: [{move: "recruit"}, {move: "scheme", target: "church"}],
      notes: "The flesh-smith's believers and the changed miners, under the Adit. Secret even from the court."},
    {key: "marta", name: "Sister Marta's network", kind: "kindred", leader: "Marta", members: ["Marta"], places: [/marta/i],
      assets: {status: 2, contacts: 3, resources: 1, influence: {church: 2, folk: 1}}, goals: [{move: "lielow"}, {move: "expand", sphere: "church"}],
      notes: "A Lasombra in a nun's habit with the church's confidence; help from outside the valley."},
    {key: "radu", name: "Old Radu", kind: "kindred", leader: "Old Radu", members: ["Old Radu"], places: [/radu|crossroads/i],
      assets: {status: 2, contacts: 3, influence: {folk: 2}}, goals: [{move: "lielow"}],
      notes: "A drifter who has watched the valley since before the town had a name."},
    {key: "council", name: "The German council (the Hospites)", kind: "mortal", leader: "Graff", members: ["Graff", "Jan Dvorak", "Ludwig of Regensburg"], places: [/market square|market floors|graff/i],
      assets: {resources: 4, status: 2, retainers: 1, contacts: 2, influence: {guild: 3, crown: 1}}, goals: [{move: "expand", sphere: "guild"}],
      notes: "The council wants profit; the Adit is theirs on paper and fought over in practice."},
    {key: "church", name: "The parish of St. Aegidius", kind: "church", leader: "Ludovic", members: ["Ludovic", "Paval", "Gizela"], places: [/aegidius|church close|presbytery/i],
      assets: {status: 2, contacts: 2, resources: 1, influence: {church: 3, folk: 2}}, goals: [{move: "hunt"}],
      notes: "The church wants heresy stamped out."},
    {key: "folk", name: "The Moravian villages", kind: "folk", leader: "Yaroslava", members: ["Yaroslava", "Bohumil Krejci", "Jitka"], places: [/dolany|moravian village/i],
      assets: {contacts: 2, resources: 1, influence: {folk: 3}}, goals: [{move: "defend"}],
      notes: "The elders of the old families want to be left alone."},
    {key: "weavers", name: "The Weavers' Guild", kind: "guild", leader: "Lenka Prochazka", members: ["Lenka Prochazka", "Jakub Hlavac"], places: [/craftsmen|weaver/i],
      assets: {resources: 2, contacts: 2, influence: {guild: 2}}, goals: [{move: "expand", sphere: "guild"}],
      notes: "The strongest craft guild; favours are kept on a tally and called in."},
    {key: "ondrej", name: "Ondrej's company", kind: "mercenaries", leader: "Ondrej", members: ["Ondrej"], places: [/outer bailey|barracks/i],
      assets: {retainers: 3, resources: 1, influence: {military: 2}}, goals: [{move: "recruit"}],
      notes: "A dozen spears for hire."},
    {key: "hunters", name: "The Church's hunters", kind: "hunters", leader: "Anselm", members: ["Anselm"], places: [/anselm|mountain trail|hermitage/i],
      assets: {contacts: 2, resources: 1, influence: {church: 1}}, goals: [],
      notes: "Brother Anselm keeps a count; the friar, the exorcist and the knight-inquisitor come when the net opens (Act Three)."}
  ];
  const ROTH_STANDING = [["court", "church", -2], ["church", "court", -1], ["court", "council", -1], ["council", "court", -1], ["council", "folk", -1], ["folk", "council", -1],
    ["court", "cult", 1], ["cult", "court", 1], ["cult", "church", -2], ["marta", "court", -1], ["radu", "court", -1], ["folk", "court", -1], ["weavers", "council", 1],
    ["council", "weavers", 1], ["ondrej", "court", 1], ["court", "ondrej", 1], ["hunters", "court", -1], ["church", "hunters", 1], ["hunters", "church", 1]];
  /** Find an NPC by a part of its name: the shortest match wins (so "Konrad" finds "Konrad the Flesh-Smith"). */
  function findActor(part) {
    const p = part.toLowerCase();
    return allActors().filter(a => !a.hasPlayerOwner && a.name.toLowerCase().includes(p)).sort((a, b) => a.name.length - b.name.length)[0] ?? null;
  }
  const hasRothenstein = () => !!findActor("Bogdan Ursu");
  /** Build Rothenstein's factions (asks first; never replaces factions already made). */
  async function setupRothenstein({confirm = true} = {}) {
    if ( !game.user.isGM ) return null;
    const s = state();
    if ( s.factions.length ) { ui.notifications.warn("There are factions already. Rothenstein's are only set up in a world with none."); return null; }
    if ( confirm ) {
      const ok = await foundry.applications.api.DialogV2.confirm({window: {title: "Rothenstein's factions"}, classes: ["wodx-dialog", "wodx-npc-dialog"],
        content: `<p>Set up the valley's ten powers from the chronicle's notes, with their leaders, members and places found by name? The dots are WoDX's estimates; change them as you like.</p>`});
      if ( !ok ) return null;
    }
    const places = placeList();
    const placeIds = rx => uniqueIds(places.filter(p => rx.test(p.name)).map(p => p.id)).slice(0, 6);
    const ids = new Map(ROTHENSTEIN.map(r => [r.key, newId()]));
    const list = ROTHENSTEIN.map(r => {
      const leader = findActor(r.leader);
      const members = r.members.map(findActor).filter(Boolean).map(a => a.id);
      return F.normFaction({id: ids.get(r.key), name: r.name, kind: r.kind, ruler: !!r.ruler, leader: leader?.id ?? null, members, places: r.places.flatMap(placeIds),
        assets: r.assets, goals: r.goals.map(g => ({...g, target: g.target ? ids.get(g.target) : null})), notes: r.notes,
        standing: Object.fromEntries(ROTH_STANDING.filter(([a]) => a === r.key).map(([, b, v]) => [ids.get(b), v]))});
    });
    await mutate(st => { st.factions = list; st.lastTurn ??= game.time.worldTime; return {state: st}; });
    const missing = ROTHENSTEIN.filter(r => !findActor(r.leader)).map(r => r.leader);
    ui.notifications.info(`Set up ${list.length} factions.${missing.length ? ` No NPC found for: ${missing.join(", ")}.` : ""}`);
    return list;
  }
  const uniqueIds = a => [...new Set(a)];

  /* ------------------------------------------------------------------ */
  /*  Editing a faction                                                  */
  /* ------------------------------------------------------------------ */

  async function editFaction(id = null) {
    if ( !game.user.isGM ) return null;
    const s = state(), era = eraInfo();
    const f = s.factions.find(x => x.id === id) ?? F.normFaction({id: newId(), name: "A new faction", kind: "kindred"});
    const others = s.factions.filter(x => x.id !== f.id);
    const npcs = allActors().filter(a => !a.hasPlayerOwner || f.members.includes(a.id)).sort((a, b) => a.name.localeCompare(b.name));
    const pcs = allActors().filter(a => a.hasPlayerOwner).sort((a, b) => a.name.localeCompare(b.name));
    const places = placeList();
    for ( const p of f.places ) if ( !places.some(x => x.id === p) ) places.push({id: p, name: placeName(p), kind: "other"});
    const number = (name, v, max = 5) => `<input type="number" name="${name}" value="${v}" min="0" max="${max}">`;
    const actorOpts = list => list.map(a => `<option value="${a.id}"${a.id === f.leader ? " selected" : ""}>${esc(a.name)}</option>`).join("");
    const goals = [...f.goals, {move: ""}, {move: ""}].slice(0, Math.max(3, f.goals.length + 1));
    const evs = (() => { try { return chron()?.events?.list?.() ?? []; } catch (e) { return []; } })();
    // NPC 0.25.0: the faction's politics
    const polKey = PO.polityFor(f, era.year), P = PO.POLITIES[polKey] ?? null, pol = f.politics ?? PO.normPolitics();
    const polInfo = P ? politicsInfo({factions: [f]}) : {};
    const mActors = f.members.map(id => game.actors?.get(id)).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
    const polityOpts = {"": "By its kind and age (a Kindred, Garou, Fae, Mage or Hunter faction of three or more keeps the polity of its age)", none: "No politics",
      ...Object.fromEntries(Object.entries(PO.POLITIES).map(([k, v]) => [k, `${v.label}${v.from ? `, from ${v.from}` : ""}`]))};
    const seatOpts = cur => `<option value="">Empty</option>${mActors.map(a => `<option value="${a.id}"${a.id === cur ? " selected" : ""}>${esc(a.name)}</option>`).join("")}`;
    const politicsHtml = `<fieldset><legend>Politics inside the faction</legend>
      <div class="wodx-field"><label>Polity</label><select name="polity" data-fixed>${opt(polityOpts, f.polity ?? "")}</select></div>
      ${P ? `<p class="wodx-quiet">In ${era.year}: ${esc(P.label)}. ${esc(P.notes)}${f.polity && f.polity !== polKey ? " Its chosen polity does not exist yet in this year, so the polity of its age stands in." : ""}</p>
        ${P.titles?.[PO.topOffice(polKey)?.key] ? `<div class="wodx-field"><label>The top seat is called</label><input type="text" name="poltitle" value="${esc(pol.title ?? "")}" maxlength="40" placeholder="${esc(PO.topOffice(polKey)?.title ?? "")}" list="wnpc-pol-titles"><datalist id="wnpc-pol-titles">${P.titles[PO.topOffice(polKey).key].map(t => `<option value="${esc(t)}">`).join("")}</datalist></div>` : ""}
        ${mActors.length ? `<table class="wodx-table" data-fixed><thead><tr><th>Seat</th><th>Held by</th></tr></thead><tbody>
          ${P.offices.map(o => Array.from({length: o.seats}, (_, i) => `<tr><td>${esc(PO.officeTitle(polKey, o.key, f))}${o.seats > 1 ? ` ${i + 1}` : ""}</td><td><select name="of.${o.key}.${i}">${seatOpts(PO.holdersOf(f, o.key)[i])}</select></td></tr>`).join("")).join("")}</tbody></table>
        <fieldset><legend>${esc(P.rank)} inside the faction (0 to 5; empty follows the sheet)</legend><div class="wnpc-dots">
          ${mActors.map(a => `<label>${esc(a.name)} <input type="number" name="rk.${a.id}" value="${pol.ranks[a.id] ?? ""}" min="0" max="5" placeholder="${PO.baseRank(polInfo, a.id, polKey)}"></label>`).join("")}</div></fieldset>`
        : `<p class="wodx-quiet">Add members and save, then open the faction again to seat them.</p>`}
        ${pol.docket.length ? `<p><b>Charges to be heard:</b> ${pol.docket.map(d => esc(`${game.actors?.get(d.by)?.name ?? "someone"} against ${game.actors?.get(d.against)?.name ?? "someone"}: ${d.law}`)).join("; ")}.</p>` : ""}`
      : `<p class="wodx-quiet">No politics run inside this faction. A Kindred, Garou, Fae, Mage or Hunter faction of three or more members keeps the polity of its age unless set to No politics; a Wraith necropolis, the Shemsu-heru, the Fallen and a Kuei-jin court are picked by hand.</p>`}
      <p class="wodx-quiet">Turn on Politics inside factions in the module settings for courts to move each faction turn.</p></fieldset>`;
    const eventOpts = evs.length ? cur => evs.map(e => `<option value="${esc(e.id)}"${e.id === cur ? " selected" : ""}>${esc(`${e.year} ${e.name}`)}</option>`).join("") : null;
    const content = `<div class="wnpc-faction-form">
      <div class="wodx-field"><label>Name</label><input type="text" name="name" value="${esc(f.name)}" maxlength="120"></div>
      <div class="wodx-field"><label>Kind</label><select name="kind" data-fixed>${opt(era.kinds ?? F.KINDS, f.kind)}</select></div>
      ${npcs.length + pcs.length > 5 ? searchBox(".wnpc-faction-form select[name=leader]", "Search for a leader…", "Search leaders") : ""}
      <div class="wodx-field"><label>Leader</label><select name="leader"><option value="">No leader</option>${actorOpts(npcs)}${pcs.length ? `<optgroup label="Player characters">${actorOpts(pcs)}</optgroup>` : ""}</select></div>
      <p><label class="wnpc-check"><input type="checkbox" name="ruler" ${f.ruler ? "checked" : ""}> Rules the domain (the Prince or its like)</label>
        <label class="wnpc-check"><input type="checkbox" name="secret" ${f.secret ? "checked" : ""}> Secret (a slip starts a rumour)</label>
        <label class="wnpc-check"><input type="checkbox" name="dormant" ${f.dormant ? "checked" : ""}> Dormant (takes no turns)</label></p>
      <fieldset><legend>Its years</legend><div class="wnpc-dots">
        <label>Founded in <input type="number" name="founded" value="${f.founded ?? ""}" min="1" max="3000" placeholder="any"></label>
        <label>Ends in <input type="number" name="ended" value="${f.ended ?? ""}" min="1" max="3000" placeholder="never"></label>
        ${eventOpts ? `<label>Rises with <select name="risesOn" data-fixed><option value="">No event</option>${eventOpts(f.risesOn)}</select></label>
        <label>Ends with <select name="endsOn" data-fixed><option value="">No event</option>${eventOpts(f.endsOn)}</select></label>` : ""}</div>
        <p class="wodx-quiet">Outside its years it takes no turns, and it wakes again when the clock comes back to them. A dated event can wake it or end it.</p></fieldset>
      ${pcs.length ? `<fieldset><legend>Run by players</legend><div class="wnpc-list">
        ${pcs.map(a => `<label class="wnpc-check"><input type="checkbox" name="o.${a.id}" ${f.owners.includes(a.id) ? "checked" : ""}> ${esc(a.name)}</label>`).join("")}</div>
        <div class="wodx-field"><label>Its turns</label><select name="run" data-fixed>${opt({auto: "Picked as for any faction", orders: "Its players give the orders"}, f.run)}</select></div></fieldset>` : ""}
      <fieldset><legend>Backgrounds</legend><div class="wnpc-dots">
        ${["herd", "resources", "status", "retainers", "contacts", "domain", "security"].map(k => `<label>${esc(F.ASSETS[k])} ${number(`a.${k}`, f.assets[k])}</label>`).join("")}</div>
        <p class="wodx-quiet">Domain and its security share five dots (V20 p. 113). Herd: 3, 7, 15, 30 or 60 vessels.</p>
        <div class="wnpc-dots">${Object.entries(era.spheres).map(([k, v]) => `<label>${esc(v)} ${number(`i.${k}`, f.assets.influence[k] ?? 0)}</label>`).join("")}</div></fieldset>
      <fieldset><legend>Goals (they weigh most when the faction picks a move)</legend>
        ${others.length > 4 ? searchBox(".wnpc-faction-form select.wnpc-g-target", "Search rivals…", "Search rivals") : ""}${places.length > 4 ? searchBox(".wnpc-faction-form select.wnpc-g-place", "Search places…", "Search goal places") : ""}
        <table class="wodx-table"><thead><tr><th>Move</th><th>Against</th><th>Sphere</th><th>Place</th><th>Note</th></tr></thead><tbody>
        ${goals.map((g, k) => `<tr><td><select name="g${k}.move" data-fixed><option value="">None</option>${opt(Object.fromEntries(Object.entries(F.MOVES).map(([m, x]) => [m, x.label])), g.move)}</select></td>
          <td><select name="g${k}.target" class="wnpc-g-target"><option value="">Anyone</option>${others.map(o => `<option value="${o.id}"${o.id === g.target ? " selected" : ""}>${esc(o.name)}</option>`).join("")}</select></td>
          <td><select name="g${k}.sphere" data-fixed><option value="">Any</option>${opt(era.spheres, g.sphere)}</select></td>
          <td><select name="g${k}.place" class="wnpc-g-place"><option value="">None</option>${places.map(p => `<option value="${esc(p.id)}"${p.id === g.place ? " selected" : ""}>${esc(p.name)}</option>`).join("")}</select></td>
          <td><input type="text" name="g${k}.note" value="${esc(g.note ?? "")}"></td></tr>`).join("")}</tbody></table></fieldset>
      ${others.length ? `<fieldset><legend>Standing with the others (−3 to +3)</legend>${others.length > 5 ? searchBox(".wnpc-standing", "Search factions…", "Search factions") : ""}<div class="wnpc-standing wnpc-list">
        ${others.map(o => `<label class="wnpc-check" data-search-item data-search-text="${esc(o.name)}">${esc(o.name)} <select name="st.${o.id}" data-fixed>${[-3, -2, -1, 0, 1, 2, 3].map(v => `<option value="${v}"${v === F.standingOf(f, o.id) ? " selected" : ""}>${v > 0 ? "+" : ""}${v}</option>`).join("")}</select></label>`).join("")}</div></fieldset>` : ""}
      ${pcs.length ? `<fieldset><legend>How it regards the players' characters (−3 Hunted to +3 Honoured)</legend><div class="wnpc-people wnpc-list">
        ${pcs.map(a => `<label class="wnpc-check" data-search-item data-search-text="${esc(a.name)}">${esc(a.name)} <select name="ps.${a.id}" data-fixed>${[-3, -2, -1, 0, 1, 2, 3].map(v => `<option value="${v}"${v === (f.people?.[a.id] ?? 0) ? " selected" : ""}>${v > 0 ? "+" : ""}${v} ${esc(F.peopleWord(v))}</option>`).join("")}</select></label>`).join("")}</div></fieldset>` : ""}
      <fieldset><legend>Members</legend>${searchBox(".wnpc-members", "Search people…", "Search members")}<div class="wnpc-members wnpc-list">
        ${[...npcs, ...pcs].map(a => `<label class="wnpc-check" data-search-item data-search-text="${esc(a.name)}"><input type="checkbox" name="m.${a.id}" ${f.members.includes(a.id) ? "checked" : ""}> ${esc(a.name)}${a.hasPlayerOwner ? " (player)" : ""}</label>`).join("")}</div></fieldset>
      <fieldset><legend>Places held (its domain)</legend>${searchBox(".wnpc-held", "Search places…", "Search places")}<div class="wnpc-held wnpc-list">
        ${places.map(p => `<label class="wnpc-check" data-search-item data-search-text="${esc(p.name)}"><input type="checkbox" name="p.${p.id}" ${f.places.includes(p.id) ? "checked" : ""}> ${esc(p.name)}</label>`).join("")}</div>
        ${places.length ? "" : `<p class="wodx-quiet">No places are tagged yet: tag them in WoDX places.</p>`}</fieldset>
      ${politicsHtml}
      <div class="wodx-field"><label>Notes</label><textarea name="notes" rows="2">${esc(f.notes)}</textarea></div></div>`;
    const data = await foundry.applications.api.DialogV2.wait({window: {title: `Faction: ${f.name}`, resizable: true}, classes: ["wodx-dialog", "wodx-npc-dialog"], position: {width: 860, height: "auto"}, content,
      buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => new foundry.applications.ux.FormDataExtended(b.form).object}, {action: "cancel", label: "Cancel"}], rejectClose: false});
    if ( !data || data === "cancel" ) return null;
    const next = {id: f.id, name: String(data.name || f.name).trim(), kind: data.kind, ruler: !!data.ruler, secret: !!data.secret, dormant: !!data.dormant, leader: data.leader || null,
      members: Object.keys(data).filter(k => k.startsWith("m.") && data[k]).map(k => k.slice(2)),
      places: Object.keys(data).filter(k => k.startsWith("p.") && data[k]).map(k => k.slice(2)),
      assets: {influence: {}}, standing: {}, people: {...(f.people ?? {})}, goals: [], guard: f.guard, notes: data.notes ?? "",
      owners: pcs.length ? pcs.filter(a => data[`o.${a.id}`]).map(a => a.id) : f.owners, run: data.run ?? f.run, orders: f.orders,
      founded: data.founded, ended: data.ended, risesOn: data.risesOn ?? f.risesOn, endsOn: data.endsOn ?? f.endsOn,
      dormantBy: data.dormant ? (f.dormant ? f.dormantBy : null) : null, fromEvent: f.fromEvent, parent: f.parent, absorbedBy: data.dormant ? f.absorbedBy : null,
      polity: data.polity ?? f.polity, politics: foundry.utils.deepClone(pol)};
    if ( P && mActors.length ) {
      const offices = {...next.politics.offices};
      for ( const o of P.offices ) {
        const held = [];
        for ( let i = 0; i < o.seats; i++ ) { const v = data[`of.${o.key}.${i}`]; if ( v && !held.includes(v) ) held.push(v); }
        if ( held.length ) offices[o.key] = held; else delete offices[o.key];
      }
      // The leader and the top seat stay one: a new leader takes the seat, else the seat's holder leads
      const top = PO.topOffice(polKey);
      if ( top ) {
        if ( (data.leader || null) !== (f.leader || null) && data.leader ) offices[top.key] = [data.leader];
        else if ( offices[top.key]?.[0] ) next.leader = offices[top.key][0];
      }
      next.politics.offices = offices;
      for ( const a of mActors ) {
        const v = data[`rk.${a.id}`];
        if ( v === "" || v === null || v === undefined ) delete next.politics.ranks[a.id];
        else next.politics.ranks[a.id] = Math.max(0, Math.min(5, num(v)));
      }
      next.politics.title = String(data.poltitle ?? "").trim() || null;
    }
    for ( const a of pcs ) { const v = num(data[`ps.${a.id}`]); if ( v ) next.people[a.id] = v; else delete next.people[a.id]; }
    for ( const k of ["herd", "resources", "status", "retainers", "contacts", "domain", "security"] ) next.assets[k] = num(data[`a.${k}`]);
    for ( const k of Object.keys(era.spheres) ) if ( num(data[`i.${k}`]) ) next.assets.influence[k] = num(data[`i.${k}`]);
    for ( const [k, v] of Object.entries(f.assets.influence) ) if ( !(k in era.spheres) ) next.assets.influence[k] = v; // another era's spheres are kept
    for ( const o of others ) if ( num(data[`st.${o.id}`]) ) next.standing[o.id] = num(data[`st.${o.id}`]);
    for ( let k = 0; data[`g${k}.move`] !== undefined; k++ ) if ( data[`g${k}.move`] ) next.goals.push({move: data[`g${k}.move`], target: data[`g${k}.target`] || null, sphere: data[`g${k}.sphere`] || null, place: data[`g${k}.place`] || null, note: data[`g${k}.note`] ?? ""});
    if ( next.leader && !next.members.includes(next.leader) ) next.members.unshift(next.leader);
    const norm = F.normFaction(next);
    await mutate(st => {
      const i = st.factions.findIndex(x => x.id === norm.id);
      if ( i >= 0 ) st.factions[i] = norm; else st.factions.push(norm);
      // one ruler at a time
      if ( norm.ruler ) for ( const x of st.factions ) if ( x.id !== norm.id ) x.ruler = false;
      // a place belongs to one faction
      for ( const x of st.factions ) if ( x.id !== norm.id ) x.places = x.places.filter(p => !norm.places.includes(p));
      st.lastTurn ??= game.time.worldTime;
      return {state: st};
    });
    if ( norm.founded !== null || norm.ended !== null ) await yearSweep({force: true});
    return norm;
  }
  /** NPC 0.17.0: end a faction (it falls quiet and lets its places go), or fold it into another, with an Undo card. */
  async function endFaction(id) {
    if ( !game.user.isGM ) return null;
    const s = state(), f = s.factions.find(x => x.id === id);
    if ( !f ) return null;
    const year = eraInfo().year;
    const ok = await foundry.applications.api.DialogV2.confirm({window: {title: "End a faction"}, classes: ["wodx-dialog", "wodx-npc-dialog"],
      content: `<p>End <b>${esc(f.name)}</b> in ${esc(year)}? It takes no more turns and its ${f.places.length} place${f.places.length === 1 ? "" : "s"} are left unheld. Its record stays, and Undo on the card puts it back.</p>`});
    if ( !ok ) return null;
    return endCard(`${f.name} comes to an end`, F.disbandChanges(s, id, year));
  }
  async function absorbFaction(id) {
    if ( !game.user.isGM ) return null;
    const s = state(), f = s.factions.find(x => x.id === id);
    const others = s.factions.filter(x => x.id !== id && !x.dormant);
    if ( !f || !others.length ) { ui.notifications.warn("There is no other faction for it to fold into."); return null; }
    const data = await foundry.applications.api.DialogV2.wait({window: {title: `Fold ${f.name} into another`}, classes: ["wodx-dialog", "wodx-npc-dialog"], position: {width: 520, height: "auto"},
      content: `<div class="wodx-field"><label>Into</label><select name="into">${others.map(o => `<option value="${o.id}">${esc(o.name)}</option>`).join("")}</select></div>
        <p class="wodx-quiet">Its people join the other faction and its places pass to it. The other gains half of its dots in each Background, rounded down. It then comes to an end (house rule).</p>`,
      buttons: [{action: "ok", label: "Fold it in", default: true, callback: (ev, b) => new foundry.applications.ux.FormDataExtended(b.form).object}, {action: "cancel", label: "Cancel"}], rejectClose: false});
    if ( !data?.into ) return null;
    return endCard(`${f.name} folds into ${s.factions.find(x => x.id === data.into)?.name ?? "another faction"}`, F.absorbChanges(s, id, data.into, eraInfo().year));
  }
  async function endCard(title, changes) {
    const done = await applyNow(changes);
    if ( !done.applied.length ) return null;
    const n = names(state());
    return ChatMessage.create({whisper: gmIds(), speaker: {alias: "WoDX factions"}, flags: {[MOD]: {factionEnd: {inverse: done.inverse, undone: false}}},
      content: `<div class="wodx-card wnpc wnpc-faction"><h3>${esc(title)}</h3><ul class="wnpc-lines">${done.applied.map(c => `<li>${esc(F.describeChange(c, n))}</li>`).join("")}</ul>
        <div class="wnpc-done"><button type="button" class="wnpc-f-undo" data-key="factionEnd">Undo</button></div></div>`});
  }
  async function deleteFaction(id) {
    const f = state().factions.find(x => x.id === id);
    if ( !f ) return false;
    const ok = await foundry.applications.api.DialogV2.confirm({window: {title: "Delete a faction"}, classes: ["wodx-dialog", "wodx-npc-dialog"],
      content: `<p>Delete <b>${esc(f.name)}</b>? Its members and places are not touched, only the faction's record.</p>`});
    if ( !ok ) return false;
    await mutate(st => { st.factions = st.factions.filter(x => x.id !== id); for ( const x of st.factions ) delete x.standing[id]; for ( const b of st.breaches ) if ( b.faction === id ) b.faction = null; return {state: st}; });
    return true;
  }
  async function reportDialog() {
    if ( !game.user.isGM ) return null;
    const s = state(), list = placeList();
    const content = `<div class="wnpc-report">
      <div class="wodx-field"><label>What was seen</label><input type="text" name="event" placeholder="a body in the lane with its throat torn"></div>
      <div class="wodx-field"><label>Severity</label><select name="severity" data-fixed>${opt(F.SEVERITY, 1)}</select></div>
      ${list.length > 5 ? searchBox(".wnpc-report select[name=place]", "Search places…", "Search places") : ""}
      <div class="wodx-field"><label>Where</label><select name="place"><option value="">Nowhere in particular</option>${list.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("")}</select></div>
      ${s.factions.length > 5 ? searchBox(".wnpc-report select[name=faction]", "Search factions…", "Search factions") : ""}
      <div class="wodx-field"><label>Blamed on</label><select name="faction"><option value="">No faction</option>${s.factions.map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join("")}</select></div></div>`;
    const data = await foundry.applications.api.DialogV2.wait({window: {title: "Report a breach"}, classes: ["wodx-dialog", "wodx-npc-dialog"], position: {width: 560, height: "auto"}, content,
      buttons: [{action: "ok", label: "Follow it", default: true, callback: (ev, b) => new foundry.applications.ux.FormDataExtended(b.form).object}, {action: "cancel", label: "Cancel"}], rejectClose: false});
    if ( !data || data === "cancel" ) return null;
    return reportBreach({severity: num(data.severity) || 1, place: data.place || null, faction: data.faction || null, event: String(data.event || "Something was seen").trim()});
  }
  async function setBreach(id, st) {
    await mutate(s => { const b = s.breaches.find(x => x.id === id); if ( b ) b.state = st; if ( b && st === "live" ) { b.lastStep = game.time.worldTime; b.lastFed = game.time.worldTime; } return {state: s}; });
  }
  async function deleteBreach(id) {
    const ok = await foundry.applications.api.DialogV2.confirm({window: {title: "Forget a rumour"}, classes: ["wodx-dialog", "wodx-npc-dialog"], content: "<p>Delete this rumour's record?</p>"});
    if ( ok ) await mutate(s => { s.breaches = s.breaches.filter(b => b.id !== id); return {state: s}; });
    return ok;
  }
  /** Set the hunting area of a place (flags.wodx-npc.hunt.area on its scene or region). */
  async function setArea(placeId, area) {
    const doc = sceneOf(placeId);
    if ( !doc ) return null;
    return doc.update(area ? {[`flags.${MOD}.hunt`]: {area}} : {[`flags.${MOD}.hunt`]: {area: null}});
  }

  /* ------------------------------------------------------------------ */
  /*  The Factions window                                                */
  /* ------------------------------------------------------------------ */

  let appClass = null;
  function FactionsAppClass() {
    if ( appClass ) return appClass;
    const {ApplicationV2} = foundry.applications.api;
    class FactionsApp extends ApplicationV2 {
      static DEFAULT_OPTIONS = {
        id: "wodx-npc-factions", classes: ["wodx", "wnpc-factions"],
        window: {title: "WoDX factions", icon: "fa-solid fa-chess-rook", resizable: true},
        position: {width: 900, height: 700},
        actions: {
          add: () => editFaction(), edit: (ev, t) => editFaction(t.dataset.id), del: (ev, t) => deleteFaction(t.dataset.id),
          found: () => founding?.foundDialog?.(), end: (ev, t) => endFaction(t.dataset.id), absorb: (ev, t) => absorbFaction(t.dataset.id),
          turn: () => runTurns({reason: "asked for by the Storyteller", forced: true}), session: () => endSession(),
          roth: () => setupRothenstein(), hunt: () => huntDialog(), report: () => reportDialog(),
          contain: (ev, t) => setBreach(t.dataset.id, "contained"), stop: (ev, t) => setBreach(t.dataset.id, "stopped"), resume: (ev, t) => setBreach(t.dataset.id, "live"),
          forget: (ev, t) => deleteBreach(t.dataset.id), settings: FactionsApp.#onSettings
        }
      };
      static #instance;
      static open() {
        if ( !game.user.isGM ) return null;
        const height = Math.max(360, Math.min(720, window.innerHeight - 120)), width = Math.max(480, Math.min(920, window.innerWidth - 40));
        this.#instance ??= new FactionsApp({position: {width, height}});
        return this.#instance.render({force: true});
      }
      static refresh() { if ( this.#instance?.rendered ) this.#instance.render(); }
      async _renderHTML() {
        const s = state(), n = names(s), era = eraInfo();
        const dots = f => {
          const a = f.assets, bits = [];
          for ( const k of ["herd", "resources", "status", "retainers", "contacts"] ) if ( a[k] ) bits.push(`${F.ASSETS[k]} ${a[k]}`);
          if ( a.domain || a.security ) bits.push(`Domain ${a.domain}${a.security ? ` (+${a.security} security)` : ""}`);
          const inf = Object.entries(a.influence).map(([k, v]) => `${n.sphere(k)} ${v}`);
          if ( inf.length ) bits.push(`Influence: ${inf.join(", ")}`);
          return bits.join("; ") || "No Backgrounds";
        };
        const stand = f => Object.entries(f.standing).map(([k, v]) => `${n.faction(k)} ${v > 0 ? "+" : ""}${v}`).join(", ") || "neutral to all";
        const rows = s.factions.map(f => `<tr data-search-text="${esc(`${f.name} ${F.KINDS[f.kind]}`)}">
          <td class="name"><b>${esc(f.name)}</b>${f.ruler ? " <span class=\"wodx-tag\">rules</span>" : ""}${f.dormant ? ` <span class="wodx-tag">${f.dormantBy === "ended" || f.dormantBy === "event" ? "ended" : f.dormantBy === "year" ? "not in its years" : "dormant"}</span>` : ""}${f.secret ? " <span class=\"wodx-tag\">secret</span>" : ""}${f.owners.length ? " <span class=\"wodx-tag\">players'</span>" : ""}<br><span class="wodx-quiet">${esc((era.kinds ?? F.KINDS)[f.kind])}${f.founded !== null || f.ended !== null ? `, ${f.founded ?? "?"} to ${f.ended ?? "now"}` : ""}${f.absorbedBy ? `, folded into ${esc(n.faction(f.absorbedBy))}` : ""}${f.owners.length && f.run === "orders" ? (f.orders ? `; orders: ${esc(F.MOVES[f.orders.move]?.label ?? "")}` : "; waits for orders") : ""}</span></td>
          <td>${esc(f.leader ? n.actor(f.leader) : "None")}<br><span class="wodx-quiet">${f.members.length} member${f.members.length === 1 ? "" : "s"}, ${f.places.length} place${f.places.length === 1 ? "" : "s"}</span></td>
          <td>${esc(dots(f))}<br><span class="wodx-quiet">${esc(stand(f))}</span></td>
          <td class="wnpc-tools"><button type="button" data-action="edit" data-id="${f.id}">Edit</button>${f.dormant ? "" : ` <button type="button" data-action="end" data-id="${f.id}" title="It comes to an end; its record stays">End</button> <button type="button" data-action="absorb" data-id="${f.id}" title="Its people, places and half its dots go to another faction">Fold into…</button>`} <button type="button" data-action="del" data-id="${f.id}">Delete</button></td></tr>`).join("");
        const brows = s.breaches.map(b => `<tr data-search-text="${esc(`${b.event} ${b.byName}`)}">
          <td>${esc(b.event || "A rumour")}<br><span class="wodx-quiet">${esc(b.place ? n.place(b.place) : "")}${b.faction ? ` · blamed on ${esc(n.faction(b.faction))}` : ""}</span></td>
          <td>${b.severity}: ${esc((F.SEVERITY[b.severity] ?? "over").split(":")[0])}<br><span class="wodx-quiet">${esc(F.STAGES[b.stage])}; heard in ${b.heard.length} place${b.heard.length === 1 ? "" : "s"}</span></td>
          <td>${esc({live: "Spreading", contained: "Contained", stopped: "Stopped by the Storyteller", over: "Over"}[b.state])}</td>
          <td class="wnpc-tools">${b.state === "live" ? `<button type="button" data-action="contain" data-id="${b.id}">Contain</button> <button type="button" data-action="stop" data-id="${b.id}">Stop</button>` : `<button type="button" data-action="resume" data-id="${b.id}">Resume</button>`}
            <button type="button" data-action="forget" data-id="${b.id}">Forget</button></td></tr>`).join("");
        const last = s.lastTurn === null ? "No turn has run yet." : `Turn ${s.turns} ran; the next is due ${setting("turnDays") ?? F.TURN_DAYS} days after the last.`;
        const div = document.createElement("div");
        div.className = "wodx-body";
        div.innerHTML = `<div class="wodx-top">
          <p>Each faction may act once a week of world time: when a skip ends, when the week passes, or when you end a session. ${esc(mode() === "auto" ? "Auto: small changes apply with an Undo; big ones wait in the approval queue." : mode() === "off" ? "Off: nothing runs by itself; Run a turn still asks you." : "Suggest: every result waits in the approval queue.")} ${esc(last)} The era is ${esc(era.name)}; its hunters are ${esc(era.hunters)}.</p>
          <div class="wodx-buttons">
            <button type="button" data-action="add"><i class="fa-solid fa-plus"></i> New faction</button>
            <button type="button" data-action="found" title="A new faction made from its founders' own Backgrounds">Found from its members…</button>
            <button type="button" data-action="turn" title="Every faction takes a turn now">Run a turn</button>
            <button type="button" data-action="session" title="The end of a session: every faction takes a turn">End the session</button>
            <button type="button" data-action="hunt">Hunting…</button>
            <button type="button" data-action="report">Report a breach…</button>
            ${!s.factions.length && hasRothenstein() ? `<button type="button" data-action="roth">Rothenstein's factions</button>` : ""}
            <button type="button" data-action="settings" title="Mode and days between turns">Settings…</button>
          </div></div>
          <div class="wodx-scroll wodx-table-wrap">
          <h3>Factions</h3>${s.factions.length ? `${searchBox("table.wnpc-faction-table", "Search factions…", "Search factions")}<table class="wodx-table wnpc-faction-table"><thead><tr><th>Faction</th><th>Leader</th><th>Backgrounds and standing</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : `<p class="wodx-quiet">No factions yet.</p>`}
          <h3>Rumours of breaches</h3>${s.breaches.length ? `${searchBox("table.wnpc-breach-table", "Search rumours…", "Search rumours")}<table class="wodx-table wnpc-breach-table"><thead><tr><th>What</th><th>Severity and reach</th><th>State</th><th></th></tr></thead><tbody>${brows}</tbody></table>` : `<p class="wodx-quiet">No rumours. A breach recorded in WoDX Actions' Masquerade ledger starts one, or Report a breach.</p>`}
          </div>`;
        return div;
      }
      _replaceHTML(result, content) { content.replaceChildren(result); }
      static async #onSettings() {
        const content = `<div class="wodx-field"><label>Mode</label><select name="mode" data-fixed>${opt({suggest: "Suggest (everything to the approval queue)", auto: "Auto (small changes apply, with an undo card)", off: "Off"}, mode())}</select></div>
          <div class="wodx-field"><label>Days between turns</label><input type="number" name="days" min="1" max="90" value="${setting("turnDays") ?? F.TURN_DAYS}"></div>`;
        const data = await foundry.applications.api.DialogV2.wait({window: {title: "Faction settings"}, classes: ["wodx-dialog", "wodx-npc-dialog"], position: {width: 480, height: "auto"}, content,
          buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => new foundry.applications.ux.FormDataExtended(b.form).object}, {action: "cancel", label: "Cancel"}], rejectClose: false});
        if ( !data || data === "cancel" ) return;
        await game.settings.set(MOD, "factionMode", data.mode);
        await game.settings.set(MOD, "turnDays", Math.max(1, Math.min(90, num(data.days) || F.TURN_DAYS)));
        FactionsApp.refresh();
      }
    }
    return (appClass = FactionsApp);
  }
  /** The end of a session: every faction takes a turn. */
  async function endSession() { return runTurns({reason: "the end of the session", forced: true}); }

  /* ------------------------------------------------------------------ */
  /*  Hooks                                                              */
  /* ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ */
  /*  What players do on the map (0.5.0)                                 */
  /* ------------------------------------------------------------------ */

  /**
   * Active Storyteller: a map event from WoDX Interactables. A break-in, theft, fire or desecration at a place a
   * faction holds is noted as a wrong (it weighs on the faction's next turn); Undo on the Interactables card takes the
   * note back. A sign of something no mortal did waits for the Storyteller as a rumour to start.
   */
  async function onMapEvent(ev) {
    if ( !isActiveGM() || mode() === "off" || !ev ) return null;
    if ( ev.undone ) {
      if ( !ev.message || !state().wrongs.some(w => w.id === ev.message) ) return null;
      await mutate(s => { s.wrongs = s.wrongs.filter(w => w.id !== ev.message); return {state: s}; });
      return {removed: ev.message};
    }
    let wrong = null;
    const s0 = state();
    const holder = ev.place ? F.holderOf(s0, ev.place) ?? (ev.scene ? F.holderOf(s0, game.scenes.get(ev.scene)?.uuid) : null) : null;
    if ( holder && F.WRONG_KINDS[ev.kind] ) {
      wrong = F.normWrong({id: ev.message, at: ev.at, faction: holder.id, kind: ev.kind, place: ev.place, by: ev.whoName, what: ev.objectName});
      await mutate(s => { s.wrongs = [...s.wrongs.filter(w => w.id !== wrong.id), wrong]; return {state: s}; });
    }
    let card = null;
    if ( ev.supernatural && ev.kind === "desecrate" ) {
      card = await ChatMessage.create({whisper: gmIds(), speaker: {alias: "WoDX factions"}, flags: {[MOD]: {mapBreach: {place: ev.place, event: `${ev.whoName ?? "Someone"} desecrated ${ev.objectName ?? "a holy place"}`, done: false}}},
        content: `<div class="wodx-card wnpc wnpc-faction"><h3>A sign that may be talked of</h3><p>${esc(ev.whoName ?? "Someone")} desecrated ${esc(ev.objectName ?? "a holy place")}${holder ? `, held by ${esc(holder.name)}` : ""}.</p>
          <p class="wodx-quiet">If mortals saw it or will find it, start a rumour (a Masquerade breach). Nothing happens unless you press the button.</p>
          <div class="wnpc-done"><button type="button" class="wnpc-f-mapbreach">Start a rumour</button></div></div>`});
    }
    return {wrong, card};
  }
  async function startMapBreach(msg) {
    const d = msg?.flags?.[MOD]?.mapBreach;
    if ( !d || d.done || !game.user.isGM ) return null;
    const id = await reportBreach({severity: 1, place: d.place, event: d.event});
    await msg.update({[`flags.${MOD}.mapBreach.done`]: true, content: String(msg.content).replace(/<button[^>]*wnpc-f-mapbreach[^>]*>[^<]*<\/button>/, "<b>Rumour started.</b>")});
    return id;
  }

  let lastDay = null;
  let founding = null;
  /**
   * NPC 0.25.0: a boon marked kept or broken in WoDX Storyteller's Ledger moves the debtor's standing in each faction
   * with a polity (a broken boon costs standing; a large one paid earns a dot, a house rule). Small changes land by the
   * mode; anything touching a player character waits in the queue.
   */
  async function onBoonSettled({entry, status} = {}) {
    if ( !isActiveGM() || !setting("factionPolitics") || mode() === "off" ) return;
    const s = state();
    const changes = PO.boonChanges(s, entry, status, {info: politicsInfo(s), year: eraInfo().year});
    if ( !changes.length ) return;
    const n = names(s);
    const why = status === "broken" ? "A boon is broken, and the Harpies spread the word" : "A large boon is paid in full";
    const size = F.sizeOf(changes, {pcActors: pcActors(), state: s});
    if ( mode() === "auto" && size === "small" ) {
      const done = await applyNow(changes);
      await ChatMessage.create({whisper: gmIds(), speaker: {alias: "WoDX factions"}, flags: {[MOD]: {factionBoon: {inverse: done.inverse, undone: false}}},
        content: `<div class="wodx-card wnpc wnpc-faction"><h3>${esc(why)}</h3><ul class="wnpc-lines">${changes.map(c => `<li>${esc(F.describeChange(c, n))}</li>`).join("")}</ul>
          ${done.inverse.length ? `<div class="wnpc-done"><button type="button" class="wnpc-f-undo" data-key="factionBoon">Undo</button></div>` : ""}</div>`});
    } else await proposeChanges(why, changes.map(c => F.describeChange(c, n)).join("; ") + ".", changes, {key: `boon:${entry.id}:${status}`});
  }

  /** NPC 0.39.0: an ended WoDX Storyteller battle between factions goes to the approval queue (B2206). */
  async function onBattle({battle} = {}) {
    if ( !isActiveGM() || mode() === "off" || !battle?.over ) return;
    const s = state();
    const changes = F.battleChanges(s, battle);
    if ( !changes.length ) return;
    const n = names(s);
    await proposeChanges(`After ${battle.name}`, changes.map(c => F.describeChange(c, n)).join("; ") + ".", changes, {key: `battle:${battle.id}:${battle.over.at ?? ""}`});
  }

  function hooks() {
    Hooks.on("wodxChronicleReady", () => registerHandler());
    Hooks.on("wodxSkipEnd", () => { if ( isActiveGM() ) onClock("skip").catch(e => console.error(`${MOD} |`, e)); });
    Hooks.on("wodxEraApplied", () => { if ( isActiveGM() ) yearSweep({force: true}).catch(e => console.error(`${MOD} |`, e)); });
    Hooks.on("wodxEventFired", ev => { onEventFired(ev).catch(e => console.error(`${MOD} |`, e)); });
    Hooks.on("updateWorldTime", now => {
      if ( !isActiveGM() || skipping() ) return;
      const day = Math.floor(now / 86400);
      if ( lastDay === null ) { lastDay = day; return; }
      if ( day === lastDay ) return;
      lastDay = day;
      onClock("clock").catch(e => console.error(`${MOD} |`, e));
    });
    Hooks.on("wodxBreach", p => { onActionsBreach(p).catch(e => console.error(`${MOD} |`, e)); });
    Hooks.on("wodxBoonSettled", p => { onBoonSettled(p).catch(e => console.error(`${MOD} |`, e)); });
    Hooks.on("wodxBattle", p => { onBattle(p).catch(e => console.error(`${MOD} |`, e)); });
    Hooks.on("wodxMapEvent", ev => { onMapEvent(ev).catch(e => console.error(`${MOD} |`, e)); });
    Hooks.on("updateSetting", s => { if ( s.key === `${MOD}.factions` ) FactionsAppClass().refresh(); });
    Hooks.on("renderChatMessageHTML", (msg, el) => {
      const fl = msg.flags?.[MOD];
      if ( !fl?.factionTurn && !fl?.factionRumours && !fl?.breachStart && !fl?.mapBreach && !fl?.factionYears && !fl?.factionEnd ) return;
      el.querySelectorAll("button.wnpc-f-mapbreach").forEach(b => {
        if ( !game.user.isGM ) { b.remove(); return; }
        b.addEventListener("click", ev => { ev.preventDefault(); b.disabled = true; startMapBreach(msg).catch(e => console.error(`${MOD} |`, e)); });
      });
      el.querySelectorAll("button.wnpc-f-undo").forEach(b => {
        if ( !game.user.isGM ) { b.remove(); return; }
        b.addEventListener("click", ev => { ev.preventDefault(); b.disabled = true; undoCard(msg, b.dataset.key || "factionTurn").catch(e => console.error(`${MOD} |`, e)).finally(() => { b.disabled = false; }); });
      });
    });
  }

  /** NPC 0.9.0: move how a faction regards a character, by a step or to a step. Returns the new step, or null. */
  async function adjustPeople(ref, actorId, {delta = 0, to = null, spill = true} = {}) {
    if ( !game.user.isGM || !actorId ) return null;
    return mutate(st => {
      const f = F.findFaction(st, ref);
      if ( !f ) return {result: null};
      const was = f.people?.[actorId] ?? 0;
      const n = Math.max(F.STANDING.min, Math.min(F.STANDING.max, to !== null ? Number(to) : was + Number(delta || 0)));
      f.people = {...(f.people ?? {})};
      if ( n ) f.people[actorId] = n; else delete f.people[actorId];
      return {state: st, result: {n, faction: f.id, moved: n - was}};
    }).then(async r => {
      if ( !r ) return null;
      if ( r.moved && spill && setting("spillover") ) await proposeSpill(r.faction, actorId, r.moved).catch(e => console.error(`${MOD} | spillover`, e));
      return r.n;
    });
  }
  /** NPC 0.16.0: the friends and enemies of a faction hear how it now regards a character (approval queue). */
  async function proposeSpill(factionId, actorId, moved) {
    const s = state(), changes = F.spillFrom(s, factionId, actorId, moved);
    if ( !changes.length ) return null;
    const n = names(s), who = n.actor(actorId), src = n.faction(factionId);
    const words = changes.map(c => `${n.faction(c.faction)} ${c.delta > 0 ? "warms" : "cools"} a step (${c.why === "friend" ? `a friend of ${src}` : `an enemy of ${src}`})`);
    return proposeChanges(`Word spreads: ${src} ${moved > 0 ? "thinks better" : "thinks worse"} of ${who}`, `${words.join("; ")}.`, changes, {key: `spill:${factionId}:${actorId}:${game.time.worldTime}`, kind: "spill"});
  }
  const peopleOf = actorId => F.peopleStandingOf(state(), actorId);
  return {adjustPeople, peopleOf, onMapEvent, startMapBreach, registerSettings, registerHandler, hooks, state, save, mutate, runTurns, endSession, onClock, tickBreaches, reportBreach, onActionsBreach, huntingFor, hunt, huntDialog,
    setupRothenstein, editFaction, deleteFaction, reportDialog, setBreach, deleteBreach, setArea, undoCard, eraInfo, placeList, names, leaders, masqEntries, findActor,
    FactionsAppClass, openFactions: () => (game.user.isGM ? FactionsAppClass().open() : founding?.openPlayer?.()), rules: F, ROTHENSTEIN,
    applyNow, proposeChanges, bgValue, allActors, yearSweep, onEventFired, endFaction, absorbFaction, setFounding: f => { founding = f; }, politicsInfo, openBoons, onBoonSettled, stageFight, onMaelstrom};
}
