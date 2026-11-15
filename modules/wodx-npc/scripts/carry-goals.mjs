/**
 * WoDX NPC: where an NPC takes the fallen it carries, and what happens there (B5087 to B5089). The rules are
 * carry-goal-rules.mjs; the carrying is WoDX Interactables' and the walk is main.mjs carryTurn.
 *
 *   rescued   laid down at the carrier's haven or home (a region tagged as that place on this scene, or the scene
 *             itself); a dead mortal is brought to their household's home and buried (the token leaves the map, the
 *             actor keeps flags.wodx-npc.buried); a slain or torpid Cainite is laid to rest in a haven
 *   hidden    put in the nearest hiding spot with room: one of its occupants and out of sight, so a search finds it
 *   captive   tied (WoDX Chronicle's Completely immobilized), kept as a prisoner (world setting wodx-npc.prisoners) at
 *             the faction's watch-house, barracks, keep, haven or cellars; the news goes out as a rumour (hook
 *             wodxCaptive) and a player's character who comes next to them can untie them. A player's character is only
 *             taken once the Storyteller approves (approval type npc-capture): approval takes them there at once.
 *   off the map  where the place is on another scene, or there is none, the carrier walks to the map's edge and both
 *             leave it (the tokens are hidden, the body's token keeps flags.wodx-npc.carriedOff)
 */
import * as G from "./carry-goal-rules.mjs";
import {DAY} from "../../wodx-chronicle/scripts/terms.mjs";

const IX = "wodx-interactables";
const TYPE = "npc-capture";

export function build({MOD, esc, gmIds, chron, routines, factions, HAUL, isActiveGM}) {
  const ixApi = () => (game.modules.get(IX)?.active ? game.modules.get(IX).api ?? null : null);
  const sizeOf = scene => Number(scene?.grid?.size) || 100;
  const docOf = t => t?.document ?? t;
  const baseOf = a => (a?.isToken ? (a.baseActor ?? a) : a);
  const kindredOf = a => a?.type === "Vampire";
  const card = (title, html, extra = {}) => ChatMessage.create({speaker: {alias: "WoDX NPC"}, whisper: gmIds(),
    content: `<div class="wodx-card"><h3>${esc(title)}</h3><p>${html}</p></div>`, ...extra}).catch(() => null);

  function factionOf(actor) {
    try {
      const id = baseOf(actor)?.id;
      return (factions.state()?.factions ?? []).find(f => !f.dormant && (f.members ?? []).includes(id)) ?? null;
    } catch (e) { return null; }
  }
  function hidesOn(scene, from) {
    const g = sizeOf(scene), out = [];
    for ( const t of scene?.tiles ?? [] ) {
      const f = t.flags?.[IX];
      if ( !f?.hide ) continue;
      const cx = Number(t.x) + Number(t.width) / 2, cy = Number(t.y) + Number(t.height) / 2;
      out.push({id: t.id, distance: Math.hypot(cx - from.x, cy - from.y) / g, room: (f.occupants ?? []).length < 2});
    }
    return out;
  }

  /** The goal for this carrier and body: carry-goal-rules.mjs goalFor, with its place and faction. */
  function goalOf(tok, target, intent) {
    const ix = HAUL(), scene = tok.document.parent;
    const all = routines.listPlaces();
    const places = all.map(p => ({id: p.id, kind: p.kind, scene: p.scene?.id ?? ""}));
    const fac = intent === "capture" || intent === "proof" ? factionOf(tok.actor) : null;
    const goal = G.goalFor({intent, dead: ix?.fallenOf?.(target.document)?.why === "dead", kindred: kindredOf(target.actor),
      places, roles: routines.routineOf(baseOf(tok.actor))?.roles ?? {}, bodyRoles: routines.routineOf(baseOf(target.actor))?.roles ?? {},
      factionPlaces: fac?.places ?? [], hides: intent === "hide" ? hidesOn(scene, tok.center) : [], here: scene.id, stayOnMap: !!target.actor?.hasPlayerOwner});
    const place = goal.kind === "place" ? all.find(p => p.id === goal.id) ?? null : null;
    return {...goal, place, faction: fac ? {id: fac.id, name: fac.name} : null,
      name: place?.name ?? (goal.kind === "hide" ? (scene.tiles.get(goal.id)?.flags?.[IX]?.title || "a hiding spot") : goal.kind === "edge" ? "beyond the edge of the map" : "")};
  }

  /** Where on this map to walk to: {x, y, offstage, here}. here: the scene itself is the place, so they are there. */
  function pointOf(goal, tok) {
    const scene = tok.document.parent, d = scene.dimensions ?? canvas.dimensions;
    const rect = {x: Number(d.sceneX) || 0, y: Number(d.sceneY) || 0, w: Number(d.sceneWidth) || Number(d.width), h: Number(d.sceneHeight) || Number(d.height)};
    if ( goal.kind === "hide" ) {
      const t = scene.tiles.get(goal.id);
      if ( t ) return {x: Number(t.x) + Number(t.width) / 2, y: Number(t.y) + Number(t.height) / 2, offstage: false};
    }
    if ( goal.kind === "place" && goal.onScene ) {
      const r = goal.place?.region;
      if ( !r ) return {x: tok.center.x, y: tok.center.y, offstage: false, here: true};
      const b = r.object?.bounds ?? r.bounds ?? (() => { const s = r.shapes?.[0]; return s ? {x: s.x, y: s.y, width: s.width, height: s.height} : null; })();
      if ( b ) return {x: Number(b.x) + Number(b.width) / 2, y: Number(b.y) + Number(b.height) / 2, offstage: false};
    }
    if ( goal.kind === "away" ) return null;
    return {...G.edgePoint(rect, tok.center, sizeOf(scene)), offstage: true};
  }

  /** Put a prisoner's record, tie them, and send the news. */
  async function imprison(target, by, goal) {
    const actor = target.actor;
    try { await chron()?.conditions?.setCondition?.(actor, "immobilized", true); } catch (e) { console.warn(`${MOD} | tie`, e); }
    const e = G.prisonerEntry({captive: baseOf(actor).id, name: target.name, captor: baseOf(by?.actor)?.id ?? null, captorName: by?.name ?? "",
      faction: goal.faction?.id ?? null, factionName: goal.faction?.name ?? "", place: goal.place?.id ?? null, placeName: goal.name, pc: !!actor.hasPlayerOwner,
      since: game.time.worldTime, token: target.document.uuid});
    await game.settings.set(MOD, "prisoners", G.addPrisoner(game.settings.get(MOD, "prisoners") ?? [], e));
    await target.document.setFlag(MOD, "prisoner", {since: e.since, at: e.placeName, by: e.factionName || e.captorName});
    Hooks.callAll("wodxCaptive", {actor: e.captive, name: e.name, faction: e.faction, factionName: e.factionName, place: e.place, placeName: e.placeName, by: e.captor, text: G.prisonerRumour(e)});
    return e;
  }

  /** At the goal (or at the edge): set the body down and do what the goal is for. -> text */
  async function arrive(tok, target, goal, {offstage = false} = {}) {
    const ix = HAUL(), td = target.document;
    await ix?.release?.(tok.document, {quiet: true});
    const where = goal.name || "here";
    let text = "";
    if ( goal.after === "hidden" && goal.kind === "hide" ) {
      const tile = td.parent.tiles.get(goal.id);
      if ( tile ) {
        const occ = (tile.flags?.[IX]?.occupants ?? []).filter(x => x.a !== target.actor.id);
        await tile.update({[`flags.${IX}.occupants`]: [...occ, {a: target.actor.id, t: td.uuid, n: target.name, s: 0}]});
        await ixApi()?.setConcealed?.(td, true);
      }
      text = `${tok.name} stows ${target.name} in ${where}.`;
    } else if ( goal.after === "prison" ) {
      const e = await imprison(target, tok, goal);
      text = `${tok.name} ties ${target.name} and keeps them prisoner at ${e.placeName}.`;
    } else if ( goal.after === "proof" ) {
      text = `${tok.name} takes ${target.name} to ${where} as proof.`;
    } else if ( goal.after === "burial" ) {
      await baseOf(target.actor).setFlag(MOD, "buried", {at: where, place: goal.place?.id ?? null, worldTime: game.time.worldTime, by: tok.name});
      text = `${tok.name} brings ${target.name} home to ${where} to be buried.`;
    } else if ( goal.after === "rest" ) text = `${tok.name} lays ${target.name} to rest at ${where}.`;
    else text = `${tok.name} lays ${target.name} down in safety at ${where}.`;
    if ( offstage || goal.after === "burial" ) {
      await td.setFlag(MOD, "carriedOff", {to: where, after: goal.after, by: tok.name, worldTime: game.time.worldTime});
      await td.update({hidden: true});
      if ( offstage ) await tok.document.update({hidden: true});
      if ( offstage ) text += ` They leave the map.`;
      // to a place on another map: they get there when the clock has run the walk
      if ( offstage && goal.kind === "place" && !goal.onScene && goal.place?.scene ) {
        const trip = await startTrip(tok, target, goal);
        if ( trip ) text += ` They reach ${where} in about ${Math.round((trip.due - trip.left) / 360) / 10} hours.`;
      }
    }
    await tok.document.unsetFlag(MOD, "carryIntent").catch(() => null);
    // for whoever cares where a body went (hunters' files, WoDX NPC's motives)
    Hooks.callAll("wodxBodyTaken", {body: td.uuid, actor: baseOf(target.actor)?.id ?? null, name: target.name, by: tok.document.uuid, byActor: baseOf(tok.actor)?.id ?? null,
      faction: goal.faction?.id ?? null, place: goal.place?.id ?? null, placeName: where, intent: goal.after, dead: HAUL()?.fallenOf?.(td)?.why === "dead", offstage: !!offstage});
    await card(G.AFTER[goal.after] ? `${target.name}: ${G.AFTER[goal.after]}` : "Carried off", esc(text));
    return text;
  }

  /* ---------------- the walk to another map (travel time, then arrive) ---------------- */

  const regionOf = scene => { try { const r = chron()?.world?.here?.(scene ?? null); return (typeof r === "string" ? r : r?.id) || ""; } catch (e) { return ""; } };
  const trips = () => foundry.utils.deepClone(game.settings.get(MOD, "carryTrips") ?? []);
  async function startTrip(tok, target, goal) {
    const from = tok.document.parent, to = goal.place.scene;
    const same = !!regionOf(from) && regionOf(from) === regionOf(to);
    const mode = HAUL()?.burdenOf?.(tok.document)?.mode ?? "carry";
    const now = game.time.worldTime;
    const trip = {id: foundry.utils.randomID(), carrier: tok.document.uuid, body: target.document.uuid, scene: to.id, place: goal.place.id,
      region: goal.place.region?.uuid ?? null, name: goal.name, after: goal.after, left: now, due: now + G.tripSeconds({sameRegion: same, mode: mode === "drag" ? "drag" : "carry"}),
      arrived: false, made: []};
    await game.settings.set(MOD, "carryTrips", [...trips(), trip]);
    return trip;
  }
  /** Arrive: copies of both tokens stand in the place on its map (the ones left behind stay hidden where they left). */
  async function arriveTrip(t) {
    const scene = game.scenes.get(t.scene), car = fromUuidSync(t.carrier), body = fromUuidSync(t.body);
    if ( !scene || !body ) return {...t, arrived: true, made: []};
    const g = sizeOf(scene), d = scene.dimensions ?? {};
    const reg = t.region ? fromUuidSync(t.region) : null, s = reg?.shapes?.[0];
    const c = s ? {x: Number(s.x) + Number(s.width ?? 0) / 2, y: Number(s.y) + Number(s.height ?? 0) / 2}
      : {x: (Number(d.sceneX) || 0) + (Number(d.sceneWidth) || Number(scene.width) || 0) / 2, y: (Number(d.sceneY) || 0) + (Number(d.sceneHeight) || Number(scene.height) || 0) / 2};
    const copy = (doc, dx) => { const o = doc.toObject(); delete o._id; return {...o, x: Math.round(c.x - g / 2 + dx), y: Math.round(c.y - g / 2), hidden: t.after === "burial" && doc === body,
      flags: {...(o.flags ?? {}), [MOD]: {...(o.flags?.[MOD] ?? {}), carriedOff: null, carryIntent: null, arrivedFrom: doc.parent?.name ?? ""}}}; };
    const made = await scene.createEmbeddedDocuments("Token", [copy(body, 0), ...(car ? [copy(car, g)] : [])], {wodxMove: false});
    // a prisoner's record follows them to the copy that stands in the place (Aftercare keeps them there)
    if ( made[0] && t.after === "prison" ) await game.settings.set(MOD, "prisoners", (game.settings.get(MOD, "prisoners") ?? []).map(x => (x.token === t.body && !x.freed ? {...x, token: made[0].uuid} : x)));
    await card(`${body.name} arrives`, esc(`${car?.name ?? "Their captor"} brings ${body.name} to ${t.name} on ${scene.name}.`));
    return {...t, arrived: true, made: made.map(m => m.uuid)};
  }
  /** The clock turned back before they got there: the arrivals stand aside (hidden) until it comes round again. */
  async function undoTrip(t) {
    for ( const u of t.made ?? [] ) { const d = fromUuidSync(u); if ( d ) await d.update({hidden: true}).catch(() => null); }
    return {...t, arrived: false};
  }
  let tripBusy = false;
  async function onClock() {
    if ( tripBusy || !isActiveGM() ) return;
    const list = trips();
    if ( !list.length ) return;
    const {due, back} = G.tripsAt(list, game.time.worldTime);
    if ( !due.length && !back.length ) return;
    tripBusy = true;
    try {
      const out = [];
      for ( const t of list ) {
        if ( due.includes(t) ) out.push(t.made?.length ? await (async () => { for ( const u of t.made ) { const d = fromUuidSync(u); if ( d ) await d.update({hidden: t.after === "burial" && u === t.made[0]}).catch(() => null); } return {...t, arrived: true}; })() : await arriveTrip(t));
        else if ( back.includes(t) ) out.push(await undoTrip(t));
        else out.push(t);
      }
      // a trip that arrived more than a week ago is done with
      await game.settings.set(MOD, "carryTrips", out.filter(t => !(t.arrived && game.time.worldTime - t.due > 7 * DAY)));
    } finally { tripBusy = false; }
  }

  /* ---------------- a player's character as a captive: the Storyteller's call ---------------- */

  async function askCapture(tok, target, goal) {
    if ( target.document.getFlag(MOD, "captureAsked") ) return false;
    await target.document.setFlag(MOD, "captureAsked", "asked");
    await chron()?.propose?.({type: TYPE, key: `capture:${target.document.uuid}`, title: `${tok.name} takes ${target.name} captive`,
      detail: `${target.name} is down. ${tok.name} would tie them and carry them off to ${goal.name || "their people"} as a prisoner. Approve and it happens at once; reject and ${tok.name} leaves them.`,
      data: {by: tok.document.uuid, target: target.document.uuid}});
    return true;
  }
  async function approveCapture(entry) {
    const by = fromUuidSync(entry.data?.by ?? ""), td = fromUuidSync(entry.data?.target ?? "");
    if ( !by || !td ) return {ok: false, why: `gone: ${by ? "" : "captor"} ${td ? "" : "captive"}`.trim()};
    // on a scene not in view there are no placeables: the scene's own documents stand in (center, actor, document)
    const obj = d => d.object ?? {document: d, actor: d.actor, name: d.name, center: {x: Number(d.x) + (Number(d.width) || 1) * sizeOf(d.parent) / 2, y: Number(d.y) + (Number(d.height) || 1) * sizeOf(d.parent) / 2}};
    const goal = goalOf(obj(by), obj(td), "capture"), p = pointOf(goal, obj(by));
    if ( p && !p.offstage && !p.here ) {
      const g = sizeOf(td.parent);
      await td.update({x: Math.round(p.x - g / 2), y: Math.round(p.y - g / 2)}, {wodxMove: false, animate: false});
    }
    await arrive(obj(by), obj(td), goal, {offstage: !!p?.offstage});
    await td.setFlag(MOD, "captureAsked", "approved");
    return {ok: true, goal: goal.name};
  }
  function registerHandler() {
    const reg = () => chron()?.registerApprovalHandler?.(TYPE, {label: "An NPC takes a player's character captive",
      approve: entry => approveCapture(entry),
      reject: async entry => { const td = fromUuidSync(entry.data?.target ?? ""); if ( td ) await td.setFlag(MOD, "captureAsked", "refused"); }});
    if ( chron()?.registerApprovalHandler ) reg(); else Hooks.once("wodxChronicleReady", reg);
  }

  /* ---------------- setting free ---------------- */

  async function freePrisoner(tokDoc, by = "", rescuer = null) {
    tokDoc = docOf(tokDoc);
    if ( !tokDoc?.actor ) return false;
    if ( !isActiveGM() ) { game.socket.emit(`module.${MOD}`, {type: "carry.free", token: tokDoc.uuid, by, rescuer, userId: game.user.id}); return true; }
    try { await chron()?.conditions?.setCondition?.(tokDoc.actor, "immobilized", false); } catch (e) { /* none */ }
    await game.settings.set(MOD, "prisoners", G.freePrisoner(game.settings.get(MOD, "prisoners") ?? [], baseOf(tokDoc.actor).id, game.time.worldTime || 1));
    await tokDoc.unsetFlag(MOD, "prisoner").catch(() => null);
    await tokDoc.unsetFlag(MOD, "captureAsked").catch(() => null);
    ChatMessage.create({speaker: {alias: "WoDX NPC"}, content: `<p>${esc(by || "Someone")} unties <b>${esc(tokDoc.name)}</b>: free.</p>`}).catch(() => null);
    // B6170: freeing a prisoner is a deed: a player's character who unties them gains standing in the town and a tale
    // starts in WoDX Storyteller's rumour mill (standing.deed)
    let saver = null;
    try { saver = rescuer ? fromUuidSync(rescuer) : null; } catch (e) { saver = null; }
    const who = saver?.actor ?? (saver?.documentName === "Actor" ? saver : null);
    if ( who?.hasPlayerOwner ) {
      try { await game.modules.get(MOD)?.api?.standing?.deed?.(who.isToken ? (who.baseActor ?? game.actors.get(who.id)) : who, {community: "town", delta: 1, text: `freed ${tokDoc.name}, held prisoner`}); }
      catch (e) { console.warn(`${MOD} | rescue deed`, e); }
    }
    return true;
  }
  /** A player's character steps next to a prisoner: a card offers to untie them. */
  const offered = new Set();
  function onMoved(doc, changes) {
    if ( !isActiveGM() || !("x" in (changes ?? {}) || "y" in (changes ?? {})) || !doc.actor?.hasPlayerOwner ) return;
    const g = sizeOf(doc.parent);
    for ( const t of doc.parent.tokens ) {
      if ( t.id === doc.id || !t.flags?.[MOD]?.prisoner || t.hidden ) continue;
      const near = Math.max(Math.abs(Number(t.x) - Number(doc.x)), Math.abs(Number(t.y) - Number(doc.y))) <= g * 1.01;
      const k = `${doc.id}:${t.id}`;
      if ( !near ) { offered.delete(k); continue; }
      if ( offered.has(k) ) continue;
      offered.add(k);
      const users = game.users.filter(u => !u.isGM && doc.actor.testUserPermission(u, "OWNER")).map(u => u.id);
      ChatMessage.create({speaker: {alias: "WoDX NPC"}, whisper: [...users, ...gmIds()],
        content: `<p><b>${esc(t.name)}</b> lies tied here, a prisoner. <button type="button" data-wnpc-untie="${esc(t.uuid)}" data-by="${esc(doc.name)}" data-rescuer="${esc(doc.uuid)}">Untie them</button></p>`}).catch(() => null);
    }
  }
  function onRender(msg, el) {
    for ( const b of el.querySelectorAll?.("[data-wnpc-untie]") ?? [] ) b.addEventListener("click", ev => {
      ev.preventDefault();
      const td = fromUuidSync(b.dataset.wnpcUntie);
      if ( td ) freePrisoner(td, b.dataset.by, b.dataset.rescuer || null).then(() => { b.disabled = true; });
    });
  }

  function registerSettings() {
    game.settings.register(MOD, "prisoners", {scope: "world", config: false, type: Array, default: []});
    game.settings.register(MOD, "carryTrips", {scope: "world", config: false, type: Array, default: []});
  }
  function hooks() {
    Hooks.on("updateToken", onMoved);
    Hooks.on("updateWorldTime", () => { onClock().catch(e => console.error(`${MOD} | carry trips`, e)); });
    Hooks.on("renderChatMessageHTML", onRender);
    Hooks.once("ready", () => game.socket?.on?.(`module.${MOD}`, m => { if ( m?.type === "carry.free" && isActiveGM() ) { const td = fromUuidSync(m.token); if ( td ) { const r = m.rescuer ? fromUuidSync(m.rescuer) : null, u = game.users.get(m.userId); freePrisoner(td, m.by, r && u && (r.actor ?? r).testUserPermission?.(u, "OWNER") ? m.rescuer : null); } } }));
  }

  return {goalOf, pointOf, arrive, askCapture, approveCapture, freePrisoner, prisoners: () => G.heldNow(game.settings.get(MOD, "prisoners") ?? []), trips: () => trips(), onClock,
    registerSettings, registerHandler, hooks, rules: G};
}
