/**
 * WoDX NPC 0.2.0 (Phase 7c): places, routines on the Chronicle clock, and region reactions.
 *
 *   Places     A scene, or a region inside one, tagged with a kind of place (flags.wodx-npc.place). The Places window
 *              tags them, with a first guess from the scene's name.
 *   Routines   An NPC with no player owner and a routine switched on (flags.wodx-npc.routine) has a current place
 *              (flags.wodx-npc.where) that follows the clock. On the scene being viewed, NPCs whose place is here are
 *              placed, NPCs who should have left are removed, and NPCs whose place is a region here walk to it along a
 *              real path. Opening a scene and a time skip place them without walking (B85). Suggest (the default)
 *              whispers a card with Accept; Auto acts and whispers a card with Undo. A token the Storyteller placed by
 *              hand is never removed in Auto: that line waits for Accept.
 *   Pauses     A fight or a reaction pauses an NPC's routine. When the fight ends, or the pause runs out, the NPC
 *              walks back to where the routine says. A dead or missing NPC is reported, never dropped quietly.
 *   Reactions  The region behaviour "WoDX: Reaction": who watches, on entering, leaving or staying, under which
 *              conditions; the noticing roll and the response from the watcher's profile (routine-rules.mjs).
 *   Map events (0.4.0) NPCs who heard something on the map (the hook wodxMapEvent from WoDX Interactables) react by
 *              their profile through the same card; one asleep wakes. Raising the alarm puts the place on alarm for
 *              an hour, then wary until the next dusk (alert-rules.mjs): watchers there notice more easily, and the
 *              lights and sounds of its "WoDX: Alert zone" regions come on while the alarm holds.
 * Player characters are never moved, placed or removed.
 */
import * as R from "./routine-rules.mjs";
import * as NR from "./npc-rules.mjs";
import * as AR from "./alert-rules.mjs";
import * as FR from "./fight-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

export const REACTION = "reaction";
export const ALERT_ZONE = "alertZone";
export const TRIGGER = "trigger";
const VOICE_YARDS = 30; // B84
const SIGHT_YARDS = {day: 60, night: 20}; // WoDX reading: how far a watcher sees a person in the open
const PAUSE_MINUTES = 30;

export function build(ctx) {
  const {MOD, esc, gmIds, isActiveGM, C, chron, profileFor, H3} = ctx;
  const num = v => Number(v) || 0;
  const flag = (doc, k) => doc?.flags?.[MOD]?.[k];
  /** An update key that deletes a field: Foundry 14's ForcedDeletion where it exists, else the older "-=" key. */
  const unsetKey = path => {
    const Del = globalThis.foundry?.data?.operators?.ForcedDeletion;
    return Del ? {[path]: new Del()} : {[path.replace(/\.([^.]+)$/, ".-=$1")]: null};
  };
  const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };
  const skipping = () => { try { return !!chron()?.isSkipping?.(); } catch (e) { return false; } };

  /* ------------------------------------------------------------------ */
  /*  Settings                                                           */
  /* ------------------------------------------------------------------ */

  function registerSettings() {
    game.settings.register(MOD, "routineMode", {
      name: "NPC routines and reactions", hint: "What WoDX does when the clock moves an NPC with a routine, when a scene opens, and when a watcher notices someone in a WoDX: Reaction region.",
      scope: "world", config: true, type: String, default: "suggest", choices: NR.MODES
    });
    game.settings.register(MOD, "curfewStart", {
      name: "Curfew starts at", hint: "The hour the curfew begins; it ends at dawn (about 21:00, Rothenstein's late bell).",
      scope: "world", config: true, type: Number, default: 21, range: {min: 17, max: 24, step: 1}
    });
    game.settings.register(MOD, "mapReactions", {
      name: "NPCs answer what they hear", hint: "When a player's action on the map makes a noise or raises an alarm (WoDX Interactables), the NPCs who heard it react by their profile, through the same card as a WoDX: Reaction region.",
      scope: "world", config: true, type: Boolean, default: true
    });
    game.settings.register(MOD, "feasts", {
      name: "The chronicle's own feast days", hint: "One a line, month-day and name, such as 09-01 St Giles. The great feasts of the church are known already.",
      scope: "world", config: false, type: String, default: ""
    });
  }
  const modeOf = (actor, scene = canvas?.scene) => NR.modeOf({npc: flag(actor, "routine")?.mode, scene: flag(scene, "routineMode"), world: setting("routineMode")});

  /* ------------------------------------------------------------------ */
  /*  The clock                                                          */
  /* ------------------------------------------------------------------ */

  let cal = null;
  async function loadCalendar() { cal ??= await import("../../wodx-chronicle/scripts/calendar.mjs"); return cal; }
  /** describe(time) for the rules: the Chronicle's own reading of the clock, with the feast of the day. */
  function describer() {
    const lat = (() => { try { return game.settings.get("wodx-chronicle", "latitude"); } catch (e) { return 50; } })();
    const extra = [...R.parseFeasts(setting("feasts")), ...(chron()?.church?.extra?.() ?? [])];
    const memo = new Map();
    return time => {
      if ( memo.has(time) ) return memo.get(time);
      const d = cal.describeTime(time, lat);
      const out = {...d, feast: R.feastOn(d, extra)};
      memo.set(time, out);
      return out;
    };
  }
  /** The curfew's hour on a day: the setting, or midnight on a night of revel (WoDX Chronicle's feast and fast days). */
  function curfewStartOn(d) {
    const base = num(setting("curfewStart")) || 21;
    try { const c = chron()?.church?.on?.(d); return c?.active && c.curfewStart ? Math.max(base, c.curfewStart) : base; } catch (e) { return base; }
  }
  const bookNow = () => { try { return ["dark-ages", "long-night"].includes(chron()?.eras?.activeEra?.()?.profile?.id) ? "v20da" : "v20"; } catch (e) { return "v20da"; } };

  /* ------------------------------------------------------------------ */
  /*  Places                                                             */
  /* ------------------------------------------------------------------ */

  /** Every tagged place: [{id (uuid), name, kind, owner, private, scene, region}]. */
  function listPlaces() {
    const out = [];
    for ( const s of game.scenes ?? [] ) {
      const f = flag(s, "place");
      if ( f?.kind ) out.push({id: s.uuid, name: s.name, kind: f.kind, owner: f.owner ?? "", private: !!f.private, scene: s, region: null});
      for ( const r of s.regions ?? [] ) {
        const g = flag(r, "place");
        if ( g?.kind ) out.push({id: r.uuid, name: `${s.name}, ${r.name}`, kind: g.kind, owner: g.owner ?? "", private: !!g.private, scene: s, region: r});
      }
    }
    return out;
  }
  const placeName = (places, id) => places.find(p => p.id === id)?.name ?? (id ? "a place no longer tagged" : "somewhere off the map");

  const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 0; } catch (e) { return 0; } };
  const routineOf = actor => flag(actor, "routine") ?? null;
  const whereOf = actor => flag(actor, "where") ?? null;
  const blocksFor = actor => R.blocksOf(routineOf(actor), profileFor(actor).template, yearNow());
  const allActors = () => game.actors?.contents ?? [...(game.actors?.values?.() ?? [])];
  const routineNpcs = () => allActors().filter(a => !a.hasPlayerOwner && routineOf(a)?.on);
  const domitorOf = actor => { const id = actor.flags?.["wodx-creation"]?.lineage?.domitor?.id; return id ? game.actors.get(id) : null; };
  const placeCtx = (actor, places, computed) => {
    const dom = domitorOf(actor);
    return {places, roles: routineOf(actor)?.roles ?? {}, seed: actor.id, domitorPlace: dom ? (computed?.get(dom.id)?.place ?? whereOf(dom)?.place) : null};
  };
  /** Dead, in torpor or incapacitated: the routine stops and the Storyteller is told. */
  function downState(actor) {
    if ( actor.statuses?.has?.("dead") ) return "dead";
    const cond = chron()?.conditions;
    if ( cond?.hasCondition?.(actor, "torpor") ) return "in torpor";
    if ( cond?.hasCondition?.(actor, "incapacitated") ) return "incapacitated";
    const ct = C()?.corpusTrack?.(actor), d = ct?.damage ?? actor.system?.health?.damage ?? {};
    if ( num(d.bashing) + num(d.lethal) + num(d.aggravated) >= 7 ) return "incapacitated";
    return null;
  }
  const paused = (actor, t) => { const p = flag(actor, "paused"); return p && !(p.until && t >= p.until) ? p : null; };

  /* ------------------------------------------------------------------ */
  /*  The grid: free cells, regions, entrances                           */
  /* ------------------------------------------------------------------ */

  const onGrid = () => ctx.gridKind() !== "none";
  // The grid WoDX walks: Foundry's, or on a gridless scene the lattice main.mjs lays over it
  const G = () => ctx.grid?.() ?? canvas.grid;
  /**
   * Move a token straight to a spot, through walls: Foundry 14 holds a plain position update at a wall, so a jump is
   * made as a displacement (a move that ignores walls), then checked; a plain update is the fallback.
   */
  async function teleport(doc, xy, opts = {}) {
    const to = {x: Math.round(xy.x), y: Math.round(xy.y)};
    if ( typeof doc.move === "function" && CONFIG.Token?.movement?.actions?.displace ) {
      try { await doc.move([{...to, action: "displace"}], {animate: false, ...opts}); } catch (e) { /* the update below */ }
    }
    if ( doc.x !== to.x || doc.y !== to.y ) await doc.update(to, {animate: false, ...opts});
    return doc.x === to.x && doc.y === to.y;
  }
  function busyCells(exceptIds = []) {
    const set = new Set();
    for ( const t of canvas.tokens.placeables ) {
      if ( exceptIds.includes(t.id) || t.document.hidden ) continue;
      for ( const c of ctx.cellsAt(t, ctx.cellOf(t)) ) set.add(`${c.i},${c.j}`);
    }
    return set;
  }
  const regionEl = r => { const e = r?.elevation?.bottom; return Number.isFinite(e) ? e : 0; };
  const inRegion = (r, p) => { try { return !!r.testPoint({x: p.x, y: p.y, elevation: regionEl(r)}, regionEl(r)); } catch (e) { return false; } };
  function regionBounds(r) {
    const b = r.object?.bounds;
    if ( b ) return {x: b.x, y: b.y, w: b.width, h: b.height};
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for ( const s of r.shapes ?? [] ) {
      const pts = s.points?.length ? s.points : null;
      if ( pts ) for ( let k = 0; k < pts.length; k += 2 ) { x0 = Math.min(x0, pts[k]); x1 = Math.max(x1, pts[k]); y0 = Math.min(y0, pts[k + 1]); y1 = Math.max(y1, pts[k + 1]); }
      else if ( s.radiusX || s.radius ) { const rx = s.radiusX ?? s.radius, ry = s.radiusY ?? s.radius; x0 = Math.min(x0, s.x - rx); x1 = Math.max(x1, s.x + rx); y0 = Math.min(y0, s.y - ry); y1 = Math.max(y1, s.y + ry); }
      else { x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x + (s.width ?? 0)); y1 = Math.max(y1, s.y + (s.height ?? 0)); }
    }
    return Number.isFinite(x0) ? {x: x0, y: y0, w: x1 - x0, h: y1 - y0} : null;
  }
  /** Free cells for a token's anchor inside a region, nearest to `near` first. */
  function freeCellsIn(region, tokLike, near, busy) {
    const b = regionBounds(region);
    if ( !b ) return [];
    const size = G().size, out = [];
    for ( let y = b.y + size / 2; y < b.y + b.h; y += size ) for ( let x = b.x + size / 2; x < b.x + b.w; x += size ) {
      const c = G().getOffset({x, y});
      const cells = ctx.cellsAt(tokLike, c);
      if ( cells.every(k => !busy.has(`${k.i},${k.j}`) && inRegion(region, G().getCenterPoint(k))) ) out.push(c);
    }
    const at = near ? G().getCenterPoint(near) : {x: b.x + b.w / 2, y: b.y + b.h / 2};
    const dist = c => { const p = G().getCenterPoint(c); return Math.hypot(p.x - at.x, p.y - at.y); };
    return out.sort((a, c) => dist(a) - dist(c));
  }
  /** A free cell near a point, searched outward in rings. */
  function freeCellNear(point, tokLike, busy) {
    const c0 = G().getOffset(point), d = canvas.dimensions;
    for ( let ring = 0; ring < 30; ring++ ) for ( let di = -ring; di <= ring; di++ ) for ( let dj = -ring; dj <= ring; dj++ ) {
      if ( Math.max(Math.abs(di), Math.abs(dj)) !== ring ) continue;
      const c = {i: c0.i + di, j: c0.j + dj}, p = G().getCenterPoint(c);
      if ( p.x < d.sceneX || p.y < d.sceneY || p.x >= d.sceneX + d.sceneWidth || p.y >= d.sceneY + d.sceneHeight ) continue;
      if ( ctx.cellsAt(tokLike, c).every(k => !busy.has(`${k.i},${k.j}`)) ) return c;
    }
    return c0;
  }
  /** The way in: a region named for a door, gate or entrance, else none. */
  function entranceOf(scene) {
    return [...(scene.regions ?? [])].find(r => /\b(door|doors|gate|entrance|entry|way in|threshold)\b/i.test(r.name ?? "") && !flag(r, "place")) ?? null;
  }
  /** A stand-in token for size and cells, from an actor's prototype. */
  function shapeOf(actor) {
    const p = actor.prototypeToken ?? {};
    const w = Math.max(1, Math.round(p.width ?? 1)), h = Math.max(1, Math.round(p.height ?? 1));
    return {document: {width: w, height: h}, w: w * G().size, h: h * G().size};
  }
  /** Where to put an arriving NPC on this scene: {cell, entry (cell of the way in, when walking in)}. */
  function arrivalFor(scene, actor, place, busy, {walkIn}) {
    const shape = shapeOf(actor);
    const ent = entranceOf(scene);
    const entCell = ent ? freeCellsIn(ent, shape, null, busy)[0] ?? null : null;
    const target = place.region ? freeCellsIn(place.region, shape, entCell, busy)[0] ?? null : null;
    if ( walkIn && entCell && target ) return {cell: entCell, then: target, shape};
    if ( target ) return {cell: target, shape};
    if ( entCell ) return {cell: entCell, shape};
    const d = canvas.dimensions;
    return {cell: freeCellNear({x: d.sceneX + d.sceneWidth / 2, y: d.sceneY + d.sceneHeight / 2}, shape, busy), shape};
  }
  /** The cells of a path, keeping only the turns (fewer waypoints for a long walk). */
  function corners(path) {
    if ( path.length <= 2 ) return path;
    const out = [path[0]];
    for ( let k = 1; k < path.length - 1; k++ ) {
      const a = path[k - 1], b = path[k], c = path[k + 1];
      if ( (b.i - a.i) !== (c.i - b.i) || (b.j - a.j) !== (c.j - b.j) ) out.push(b);
    }
    out.push(path[path.length - 1]);
    return out;
  }
  /** Walk a token to a cell along a real path round walls; jump when there is none. Returns "walked" | "jumped". */
  async function walkTo(tok, goal) {
    const start = ctx.cellOf(tok);
    if ( start.i === goal.i && start.j === goal.j ) return "walked";
    const hex = ctx.gridKind() === "hex";
    const path = NR.findPath(start, goal, ctx.passableFor(tok), {maxNodes: 40000, neighbors: ctx.stepsFor(), heuristic: hex ? ctx.hexHeuristic(goal) : null});
    if ( path ) { await ctx.walk(tok, hex ? path : corners(path)); return "walked"; }
    await teleport(tok.document, ctx.topLeftFor(tok, goal));
    return "jumped";
  }

  /* ------------------------------------------------------------------ */
  /*  The plan for the scene in view                                     */
  /* ------------------------------------------------------------------ */

  /**
   * What should change on a scene: [{type: place|walk|jump|remove, actorId, tokenId, place, hand}].
   * how: "walk" (the clock moved, or a fight ended) or "jump" (a scene opened, a time skip).
   */
  function planScene(scene, places, how, t) {
    const here = new Map(places.filter(p => p.scene?.id === scene.id).map(p => [p.id, p]));
    const items = [];
    for ( const actor of routineNpcs() ) {
      if ( paused(actor, t) || downState(actor) ) continue;
      const target = whereOf(actor)?.place ?? null;
      const toks = (scene.tokens?.contents ?? [...(scene.tokens ?? [])]).filter(d => d.actorId === actor.id && !d.actor?.hasPlayerOwner);
      const p = here.get(target);
      if ( p ) {
        if ( !toks.length ) items.push({type: "place", actorId: actor.id, place: target, walkIn: how === "walk"});
        else if ( p.region && !toks[0].regions?.has?.(p.region) ) items.push({type: how, actorId: actor.id, tokenId: toks[0].id, place: target});
        for ( const extra of toks.slice(1) ) items.push({type: "remove", actorId: actor.id, tokenId: extra.id, place: target, hand: !flag(extra, "placed"), duplicate: true});
      } else for ( const d of toks ) items.push({type: "remove", actorId: actor.id, tokenId: d.id, place: target, hand: !flag(d, "placed"), walkOut: how === "walk"});
    }
    return items;
  }
  const VERB = {place: "arrives at", walk: "walks to", jump: "is moved to", remove: "leaves for"};
  function lineFor(it, places) {
    const a = game.actors.get(it.actorId), w = whereOf(a);
    const what = w?.label || R.ACTIVITIES[w?.activity] || "";
    const dest = placeName(places, it.place);
    const tail = it.duplicate ? " (a second token of the same NPC)" : it.hand ? " (placed by hand: needs the Storyteller)" : "";
    return `${a?.name ?? "Someone"} ${VERB[it.type]} ${dest}${what ? `, ${what.toLowerCase()}` : ""}${tail}`;
  }

  /** Carry out items on the scene in view. Returns {snap, notes}. Only pending ones; Auto skips hand-placed removals. */
  async function applyItems(scene, items, {auto = false} = {}) {
    const snap = {created: [], removed: [], moved: []}, notes = [], walks = [];
    const places = listPlaces(), busy = busyCells();
    for ( const it of items ) {
      if ( it.status === "done" || (auto && it.type === "remove" && it.hand) ) continue;
      const actor = game.actors.get(it.actorId);
      if ( !actor || actor.hasPlayerOwner ) { it.status = "skipped"; continue; }
      const p = places.find(x => x.id === it.place);
      try {
        if ( it.type === "place" ) {
          if ( !p || !onGrid() ) { it.status = "skipped"; notes.push(`${actor.name}: place by hand (no grid or no place)`); continue; }
          const a = arrivalFor(scene, actor, p, busy, {walkIn: it.walkIn});
          const xy = ctx.topLeftFor(a.shape, a.cell);
          const td = await actor.getTokenDocument({x: xy.x, y: xy.y, flags: {[MOD]: {placed: true}}});
          const [made] = await scene.createEmbeddedDocuments("Token", [td.toObject()]);
          if ( made ) {
            snap.created.push(made.uuid);
            for ( const c of ctx.cellsAt(a.shape, a.cell) ) busy.add(`${c.i},${c.j}`);
            // The new token is drawn a moment after it is made; then it walks in from the door
            if ( a.then ) walks.push(new Promise(r => setTimeout(r, 300)).then(() => made.object ? walkTo(made.object, a.then) : null));
          }
        } else if ( it.type === "walk" || it.type === "jump" ) {
          const tok = canvas.tokens.get(it.tokenId);
          if ( !tok || !p?.region ) { it.status = "skipped"; continue; }
          snap.moved.push({uuid: tok.document.uuid, x: tok.document.x, y: tok.document.y});
          const goal = freeCellsIn(p.region, tok, ctx.cellOf(tok), busyCells([tok.id]))[0];
          if ( !goal ) { it.status = "skipped"; notes.push(`${actor.name}: no free room in ${p.name}`); continue; }
          if ( it.type === "jump" || !onGrid() ) {
            if ( !(await teleport(tok.document, ctx.topLeftFor(tok, goal))) ) notes.push(`${actor.name}: could not be moved to ${p.name}`);
          }
          else walks.push(walkTo(tok, goal).then(r => { if ( r === "jumped" ) notes.push(`${actor.name}: no way through, moved straight there`); }));
        } else if ( it.type === "remove" ) {
          const d = scene.tokens.get(it.tokenId);
          if ( !d ) { it.status = "skipped"; continue; }
          snap.removed.push(d.toObject());
          const ent = it.walkOut && onGrid() ? entranceOf(scene) : null;
          const tok = d.object;
          const go = async () => {
            if ( ent && tok ) { const c = freeCellsIn(ent, tok, ctx.cellOf(tok), busyCells([tok.id]))[0]; if ( c ) await walkTo(tok, c); }
            await d.delete();
          };
          walks.push(go());
        }
        it.status = "done";
      } catch (err) {
        console.error(`${MOD} |`, err);
        it.status = "failed";
        notes.push(`${actor.name}: ${err.message}`);
      }
    }
    await Promise.allSettled(walks);
    return {snap, notes};
  }

  async function undoSnap(scene, snap) {
    for ( const u of snap?.created ?? [] ) { const d = await fromUuid(u); if ( d ) await d.delete(); }
    const back = (snap?.removed ?? []).filter(d => !scene.tokens.get(d._id));
    if ( back.length ) await scene.createEmbeddedDocuments("Token", back, {keepId: true});
    for ( const m of snap?.moved ?? [] ) { const d = await fromUuid(m.uuid); if ( d ) await teleport(d, m, {wodxMove: false}); }
    for ( const p of snap?.paused ?? [] ) {
      const a = game.actors.get(p.actorId);
      if ( a ) await a.update(p.prev ? {[`flags.${MOD}.paused`]: p.prev} : unsetKey(`flags.${MOD}.paused`));
    }
    if ( snap?.combat ) await game.combats.get(snap.combat)?.delete();
    if ( snap?.alert ) {
      const sc = await fromUuid(snap.alert.scene);
      if ( sc ) { await sc.update(snap.alert.prev ? {[`flags.${MOD}.alert`]: snap.alert.prev} : unsetKey(`flags.${MOD}.alert`)); await syncZones(sc); }
      await undoCarry(snap.alert.carry);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  The routine card                                                   */
  /* ------------------------------------------------------------------ */

  const HOW = {walk: "The clock moved", jump: "", open: "The scene opened", skip: "After the time skip", resume: "Back to routine"};
  function routineCardHtml(plan, places) {
    const pending = plan.items.filter(i => i.status !== "done" && i.status !== "skipped");
    const done = plan.items.filter(i => i.status === "done");
    const li = list => list.map(i => `<li>${esc(lineFor(i, places))}</li>`).join("");
    const head = plan.stale ? "Out of date" : plan.mode === "auto" ? "Auto" : "Suggestion";
    return `<div class="vta-card wodx-x wnpc wnpc-routine">`
      + `<header class="vta-head"><h3 style="${H3}">Routines: ${esc(plan.timeLabel)}</h3><span class="vta-verdict">${head}</span></header>`
      + `<div class="vta-body"><p class="wodx-quiet">${esc(HOW[plan.how] ?? "")}${plan.how ? ". " : ""}${esc(plan.sceneName)}.</p>`
      + (done.length ? `<p><b>Done</b></p><ul class="wnpc-lines">${li(done)}</ul>` : "")
      + (pending.length && !plan.stale ? `<p><b>${done.length ? "Waiting for the Storyteller" : "Proposed"}</b></p><ul class="wnpc-lines">${li(pending)}</ul>` : "")
      + (plan.notes?.length ? `<p class="wodx-quiet">${plan.notes.map(esc).join("; ")}.</p>` : "")
      + (plan.stale ? `<p class="wodx-quiet">A newer plan follows.</p>` : `<div class="wnpc-tools">`
        + (pending.length ? `<button type="button" class="wnpc-r-go">${done.length ? "Do these too" : "Accept"}</button>` : "")
        + (done.length && !plan.undone ? `<button type="button" class="wnpc-r-undo">Undo</button>` : "")
        + (plan.undone ? " <b>Undone.</b>" : "") + `</div>`)
      + `</div></div>`;
  }

  const lastKey = new Map();
  let lastCard = null;
  async function postRoutineCard(scene, items, how, t) {
    if ( !items.length ) { lastKey.set(scene.id, ""); return null; }
    const key = JSON.stringify(items.map(i => [i.type, i.actorId, i.tokenId ?? "", i.place ?? ""]));
    if ( lastKey.get(scene.id) === key ) return null;
    lastKey.set(scene.id, key);
    const places = listPlaces();
    const mode = NR.modeOf({scene: flag(scene, "routineMode"), world: setting("routineMode")});
    const plan = {scene: scene.uuid, sceneName: scene.name, how, mode, items, time: t, timeLabel: describer()(t).timeLabel, notes: []};
    if ( mode === "auto" ) {
      const {snap, notes} = await applyItems(scene, items, {auto: true});
      plan.snap = snap; plan.notes = notes;
    }
    // The last card still waiting goes out of date
    const old = lastCard ? game.messages.get(lastCard) : null;
    const op = old?.flags?.[MOD]?.routine;
    if ( op && op.scene === plan.scene && !op.stale && op.items.some(i => i.status !== "done" && i.status !== "skipped") && !op.items.some(i => i.status === "done") ) {
      op.stale = true;
      await old.update({[`flags.${MOD}.routine`]: op, content: routineCardHtml(op, places)});
    }
    const msg = await ChatMessage.create({speaker: {alias: "WoDX routines"}, whisper: gmIds(), content: routineCardHtml(plan, places), flags: {[MOD]: {routine: plan}}});
    lastCard = msg?.id ?? null;
    return msg;
  }

  async function acceptRoutineCard(msg) {
    msg = typeof msg === "string" ? game.messages.get(msg) : msg;
    const plan = foundry.utils.deepClone(msg?.flags?.[MOD]?.routine);
    if ( !plan || plan.stale || !game.user.isGM ) return null;
    const scene = await fromUuid(plan.scene);
    if ( scene?.id !== canvas.scene?.id ) { ui.notifications.warn("WoDX NPC: view that scene first."); return null; }
    const {snap, notes} = await applyItems(scene, plan.items);
    plan.snap = {created: [...(plan.snap?.created ?? []), ...snap.created], removed: [...(plan.snap?.removed ?? []), ...snap.removed], moved: [...(plan.snap?.moved ?? []), ...snap.moved]};
    plan.notes = [...(plan.notes ?? []), ...notes];
    await msg.update({[`flags.${MOD}.routine`]: plan, content: routineCardHtml(plan, listPlaces())});
    return plan;
  }
  async function undoRoutineCard(msg) {
    msg = typeof msg === "string" ? game.messages.get(msg) : msg;
    const plan = foundry.utils.deepClone(msg?.flags?.[MOD]?.routine);
    if ( !plan?.snap || plan.undone || !game.user.isGM ) return null;
    const scene = await fromUuid(plan.scene);
    if ( !scene ) return null;
    await undoSnap(scene, plan.snap);
    plan.undone = true;
    await msg.update({[`flags.${MOD}.routine`]: plan, content: routineCardHtml(plan, listPlaces())});
    return plan;
  }

  /* ------------------------------------------------------------------ */
  /*  The tick                                                           */
  /* ------------------------------------------------------------------ */

  const reported = new Set();
  /**
   * Bring every routine up to the clock, then plan the scene in view. how: walk | jump | open | skip | resume.
   * Returns {changed: [actor names], items, card}.
   */
  async function tick(how = "walk", {scene = canvas?.scene, post = true} = {}) {
    if ( !isActiveGM() ) return null;
    await loadCalendar();
    const t = game.time.worldTime, describe = describer(), places = listPlaces();
    const npcs = routineNpcs(), computed = new Map(), updates = [], reports = [];
    // Domitors first, so a ghoul can follow theirs
    const order = [...npcs].sort((a, b) => (domitorOf(a) ? 1 : 0) - (domitorOf(b) ? 1 : 0));
    for ( const actor of order ) {
      const down = downState(actor);
      const w = whereOf(actor) ?? {};
      if ( down ) {
        const k = `${actor.id}:${down}`;
        if ( !reported.has(k) && w.reported !== down ) { reported.add(k); reports.push(`${actor.name} is ${down}: their routine waits until the Storyteller says otherwise`); updates.push({_id: actor.id, [`flags.${MOD}.where.reported`]: down}); }
        continue;
      }
      const p = flag(actor, "paused");
      if ( p?.until && t >= p.until ) updates.push({_id: actor.id, ...unsetKey(`flags.${MOD}.paused`)});
      const r = R.placeAt(blocksFor(actor), t, describe, placeCtx(actor, places, computed));
      computed.set(actor.id, r);
      if ( r.missing ) {
        const k = `${actor.id}:missing:${r.missing}`;
        if ( !reported.has(k) ) { reported.add(k); reports.push(`${actor.name}'s ${R.ROLES[r.missing]?.label?.toLowerCase() ?? "place"} is no longer a tagged place: set it again in their routine`); }
      }
      if ( w.place !== r.place || w.index !== r.index || w.reported ) {
        updates.push({_id: actor.id, [`flags.${MOD}.where`]: {place: r.place, index: r.index, activity: r.block?.activity ?? null, label: r.block?.label ?? "", since: t, reported: null}});
      }
    }
    if ( updates.length ) await Actor.updateDocuments(updates);
    if ( reports.length ) await ChatMessage.create({speaker: {alias: "WoDX routines"}, whisper: gmIds(),
      content: `<div class="vta-card wodx-x wnpc"><header class="vta-head"><h3 style="${H3}">Routines need you</h3></header><div class="vta-body"><ul>${reports.map(r => `<li>${esc(r)}</li>`).join("")}</ul></div></div>`});
    if ( !scene || !canvas?.ready || canvas.scene?.id !== scene.id ) return {updates, items: []};
    const items = planScene(scene, places, how === "walk" || how === "resume" ? "walk" : "jump", t);
    const card = post ? await postRoutineCard(scene, items, how, t) : null;
    if ( how === "walk" || how === "resume" ) await checkStays(scene, t);
    return {updates, items, card};
  }

  let timer = null, pendingDelta = 0, running = Promise.resolve();
  /** Resolves once the clock's last change has been worked through (for gates and macros). */
  const idle = async () => { await new Promise(r => setTimeout(r, 700)); await running; };
  const track = p => { running = running.then(() => p, () => p); return p; };
  function onWorldTime(worldTime, delta) {
    if ( !isActiveGM() || skipping() || setting("routineMode") === "off" ) return;
    pendingDelta += Math.abs(Number(delta) || 0);
    clearTimeout(timer);
    timer = setTimeout(() => {
      // A clock set forward by hours is placed, not walked
      const how = pendingDelta > 2 * 3600 ? "jump" : "walk";
      pendingDelta = 0;
      track(tick(how)).catch(e => console.error(`${MOD} |`, e));
      track(checkAlerts()).catch(e => console.error(`${MOD} |`, e));
    }, 400);
  }

  /* ------------------------------------------------------------------ */
  /*  Fights pause routines                                              */
  /* ------------------------------------------------------------------ */

  async function pauseFor(actors, data) {
    const ups = actors.filter(a => routineOf(a)?.on && !a.hasPlayerOwner).map(a => ({_id: a.id, [`flags.${MOD}.paused`]: data}));
    if ( ups.length ) await Actor.updateDocuments(ups);
  }
  async function onCombatant(c) {
    if ( !isActiveGM() || !c?.actor ) return;
    // An unlinked token's actor shares its id with the world actor that keeps the routine
    const base = c.actor.isToken ? game.actors.get(c.actor.id) : c.actor;
    if ( base && routineOf(base)?.on ) await pauseFor([base], {reason: "fight", combatId: c.parent?.id ?? c.combat?.id ?? null});
  }
  async function onCombatEnd(combat) {
    if ( !isActiveGM() ) return;
    const ups = routineNpcs().filter(a => flag(a, "paused")?.combatId === combat.id).map(a => ({_id: a.id, ...unsetKey(`flags.${MOD}.paused`)}));
    if ( !ups.length ) return;
    await Actor.updateDocuments(ups);
    await tick("resume");
  }

  /* ------------------------------------------------------------------ */
  /*  Reactions                                                          */
  /* ------------------------------------------------------------------ */

  function registerBehavior() {
    const Base = foundry.data?.regionBehaviors?.RegionBehaviorType, f = foundry.data?.fields;
    if ( !Base || !f || !CONFIG.RegionBehavior?.dataModels ) return false;
    const E = CONST.REGION_EVENTS ?? {TOKEN_ENTER: "tokenEnter", TOKEN_EXIT: "tokenExit"};
    const set = (choices, initial, label, hint) => new f.SetField(new f.StringField({choices}), {initial, label, hint});
    class ReactionBehavior extends Base {
      static defineSchema() {
        return {
          watchers: new f.StringField({required: true, initial: "scene", choices: {scene: "NPCs on this scene", inside: "NPCs inside this area", listed: "Only the NPCs named below"},
            label: "Who watches", hint: "NPCs with no player owner. A sleeping NPC (by its routine) notices nothing."}),
          names: new f.StringField({required: false, blank: true, initial: "", label: "Named watchers", hint: "Names separated by commas, for \"Only the NPCs named below\"."}),
          triggers: set(R.TRIGGERS, ["enter"], "Triggers", "When the watchers look: as someone enters, leaves, or stays a while."),
          stayMinutes: new f.NumberField({required: true, integer: true, min: 1, max: 1440, initial: 10, label: "Staying: minutes of world time", hint: "For the Staying trigger: how long someone stays before the watchers react."}),
          conditions: set(R.CONDITIONS, ["curfew"], "Conditions", "What makes the watchers react. None ticked: they react to anyone."),
          match: new f.StringField({required: true, initial: "any", choices: {any: "Any of the conditions", all: "All of the conditions"}, label: "Conditions needed"}),
          private: new f.BooleanField({initial: false, label: "A private place", hint: "For Trespass: only those who live or work here, and the names below, may be here."}),
          allowed: new f.StringField({required: false, blank: true, initial: "", label: "Also allowed here", hint: "Names separated by commas."}),
          who: new f.StringField({required: true, initial: "pcs", choices: {pcs: "Player characters only", anyone: "Anyone but the watchers"}, label: "Whom they watch for"}),
          response: new f.StringField({required: true, initial: "profile", choices: {profile: "As the watcher's profile says", ...R.RESPONSES}, label: "Response",
            hint: "WoDX picks from the watcher's NPC profile; or fix the response here. A fight always waits for the Storyteller."})
        };
      }
      static events = {
        [E.TOKEN_ENTER]: async function (event) { await onRegionEvent(this, event, "enter"); },
        [E.TOKEN_EXIT]: async function (event) { await onRegionEvent(this, event, "leave"); }
      };
    }
    class AlertZoneBehavior extends Base {
      static defineSchema() {
        return {
          lights: new f.StringField({required: false, blank: true, initial: "", label: "Lights that come on", hint: "Ambient light ids, separated by commas: lamps lit while the place is on alarm."}),
          sounds: new f.StringField({required: false, blank: true, initial: "", label: "Sounds that play", hint: "Ambient sound ids, separated by commas: a bell or dogs while the place is on alarm."}),
          carryTo: new f.StringField({required: false, blank: true, initial: "", label: "Carries the alarm to", hint: "Other places (scene names, separated by commas) that hear of the alarm. Leave blank to keep it here."}),
          carrier: new f.StringField({required: true, initial: "runner", choices: Object.fromEntries(Object.entries(AR.CARRIERS).map(([k, v]) => [k, v.label])), label: "How it gets there",
            hint: "A runner takes the trip's minutes; a telephone or radio only in its era. An alarm that was carried is not carried on again."}),
          minutes: new f.NumberField({required: true, integer: true, min: 0, max: 1440, initial: 0, label: "Minutes on the way", hint: "0: a runner takes the trip's minutes (WoDX Storyteller's, else 30); a bell, phone or radio is at once."})
        };
      }
      static events = {};
    }
    class TriggerBehavior extends Base {
      static defineSchema() {
        return {
          label: new f.StringField({required: false, blank: true, initial: "", label: "What it is", hint: "A few words for the log and for beats, such as \"the cellar stairs\". Blank: the region's name."}),
          does: new f.StringField({required: true, initial: "note", choices: AR.TRIGGER_DOES, label: "What happens"}),
          who: new f.StringField({required: true, initial: "pcs", choices: {pcs: "Player characters only", anyone: "Anyone"}, label: "Whom it fires for"}),
          when: new f.StringField({required: false, blank: true, initial: "", label: "Only when",
            hint: "Tests for who walks in and when, separated by ; such as: year 1200-1492; night; kind kindred; not clan Tremere. Blank: always. WoDX Chronicle's checker (Storyteller tools) lists every test."}),
          then: new f.StringField({required: false, blank: true, initial: "", label: "Then also",
            hint: "Outcomes, separated by ; such as: tell {name} smells the incense; cue notice; ledger consequence: the abbot hears of it. Also alarm, event, whisper."}),
          once: new f.BooleanField({initial: false, label: "Only once", hint: "After the first time, it stays quiet until you untick Already set off."}),
          fired: new f.BooleanField({initial: false, label: "Already set off"})
        };
      }
      static events = {[E.TOKEN_ENTER]: async function (event) { await onTrigger(this, event); }};
    }
    const TRIG = `${MOD}.${TRIGGER}`;
    CONFIG.RegionBehavior.dataModels[TRIG] = TriggerBehavior;
    CONFIG.RegionBehavior.typeLabels[TRIG] = "WoDX: Trigger";
    if ( CONFIG.RegionBehavior.typeHints ) CONFIG.RegionBehavior.typeHints[TRIG] = "When someone walks in: tell the Storyteller, raise the alarm, or only pass it on to the log and beats.";
    if ( CONFIG.RegionBehavior.typeIcons ) CONFIG.RegionBehavior.typeIcons[TRIG] = "fa-solid fa-bolt";
    const ZONE = `${MOD}.${ALERT_ZONE}`;
    CONFIG.RegionBehavior.dataModels[ZONE] = AlertZoneBehavior;
    CONFIG.RegionBehavior.typeLabels[ZONE] = "WoDX: Alert zone";
    if ( CONFIG.RegionBehavior.typeHints ) CONFIG.RegionBehavior.typeHints[ZONE] = "While this place is on alarm, the lights and sounds named here come on. They go off when the alarm dies down.";
    if ( CONFIG.RegionBehavior.typeIcons ) CONFIG.RegionBehavior.typeIcons[ZONE] = "fa-solid fa-bell";
    const TYPE = `${MOD}.${REACTION}`;
    CONFIG.RegionBehavior.dataModels[TYPE] = ReactionBehavior;
    CONFIG.RegionBehavior.typeLabels[TYPE] = "WoDX: Reaction";
    if ( CONFIG.RegionBehavior.typeHints ) CONFIG.RegionBehavior.typeHints[TYPE] = "NPCs who watch this area: on entering, leaving or staying, under the conditions set, they roll to notice and react by their profile.";
    if ( CONFIG.RegionBehavior.typeIcons ) CONFIG.RegionBehavior.typeIcons[TYPE] = "fa-solid fa-eye";
    return true;
  }
  const reactionType = () => Object.keys(game.model?.RegionBehavior ?? {}).find(k => k.startsWith(`${MOD}.`) && k.endsWith(REACTION)) ?? `${MOD}.${REACTION}`;
  const listOf = v => (v instanceof Set ? [...v] : Array.isArray(v) ? v : String(v ?? "").split(",")).map(s => String(s).trim()).filter(Boolean);
  const names = s => String(s ?? "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  const nameIn = (list, actor) => list.some(n => actor?.name?.toLowerCase() === n || String(actor?.name ?? "").toLowerCase().includes(n));

  const entered = new Map(), recent = new Map();
  async function onRegionEvent(system, event, trigger) {
    if ( !isActiveGM() || skipping() ) return;
    const doc = event?.data?.token, behavior = system.parent, region = behavior?.parent ?? event?.region;
    if ( !doc || !region || behavior?.disabled ) return;
    const k = `${region.id}:${doc.id}`;
    if ( trigger === "enter" ) entered.set(k, game.time.worldTime);
    if ( trigger === "leave" ) entered.delete(k);
    if ( !listOf(system.triggers).includes(trigger) ) return;
    // A token hopping across the edge fires once in five seconds at most
    const rk = `${k}:${trigger}`, now = Date.now();
    if ( recent.get(rk) > now - 5000 ) return;
    recent.set(rk, now);
    await track(react(system, region, doc, trigger));
  }
  async function checkStays(scene, t) {
    const type = reactionType();
    for ( const region of scene.regions ?? [] ) for ( const b of region.behaviors ?? [] ) {
      if ( b.type !== type || b.disabled || !listOf(b.system.triggers).includes("stay") ) continue;
      for ( const d of scene.tokens ) {
        if ( !d.regions?.has?.(region) ) continue;
        const k = `${region.id}:${d.id}`;
        if ( !entered.has(k) ) { entered.set(k, t); continue; }
        if ( t - entered.get(k) >= num(b.system.stayMinutes || 10) * 60 ) { entered.set(k, t); await react(b.system, region, d, "stay"); }
      }
    }
  }

  const ab = (a, k) => num(a?.system?.abilities?.[k]?.value);
  const at = (a, k) => num(a?.system?.attributes?.[k]?.value);
  const disc = (a, n) => { const it = a?.items?.find?.(i => i.type === "Power" && String(i.system?.type ?? "").includes("discipline") && i.name.trim().toLowerCase().startsWith(n)); return it ? num(it.system?.value) : 0; };
  const sneaking = d => d.actor?.statuses?.has?.("wodx-sneaking") || !!flag(d, "sneaking");
  const weaponOut = a => (a?.items ?? []).some(i => (i.type === "Melee Weapon" || i.type === "Ranged Weapon") && i.system?.isequipped && !i.system?.isnatural);
  const sightBlocked = (a, b) => { try { return !!CONFIG.Canvas.polygonBackends.sight.testCollision(a, b, {type: "sight", mode: "any"}); } catch (e) { return false; } };

  /** Who lives or works at a place (their routine's home, work, haven or post points there). */
  const residentsOf = placeIds => routineNpcs().filter(a => Object.values(routineOf(a)?.roles ?? {}).some(v => placeIds.includes(v)));

  /** Everything about one event in a Reaction region, then the card. Returns the card's message, or null. */
  async function react(system, region, doc, trigger) {
    const scene = region.parent, intruder = doc.actor;
    if ( !intruder || scene?.id !== canvas.scene?.id ) return null;
    if ( NR.modeOf({scene: flag(scene, "routineMode"), world: setting("routineMode")}) === "off" ) return null;
    if ( system.who === "pcs" && !intruder.hasPlayerOwner ) return null;
    await loadCalendar();
    const t = game.time.worldTime, d = describer()(t);
    const placeIds = [region.uuid, scene.uuid];
    const allowed = names(system.allowed);
    const trespass = !!system.private && !residentsOf(placeIds).some(a => a.id === intruder.id || a.id === intruder.baseActor?.id) && !nameIn(allowed, intruder);
    const sit = {night: d.isNight, curfew: R.isCurfew(d, curfewStartOn(d)), trespass, weapon: weaponOut(intruder), supernatural: !!ctx.obvious(intruder)};
    const cond = R.conditionsMet(listOf(system.conditions), sit, system.match);
    if ( !cond.met ) return null;
    // The watchers in view
    const listed = names(system.names);
    const tokNow = canvas.tokens.get(doc.id);
    const range = (d.isNight ? SIGHT_YARDS.night : SIGHT_YARDS.day);
    const watchers = canvas.tokens.placeables.filter(w => w.actor && w.id !== doc.id && !w.actor.hasPlayerOwner && !w.document.hidden && !downState(w.actor)
      && (system.watchers !== "inside" || w.document.regions?.has?.(region)) && (system.watchers !== "listed" || nameIn(listed, w.actor)));
    if ( !watchers.length || !tokNow ) return null;
    const base = a => a?.isToken ? (a.baseActor ?? game.actors.get(a.id)) : a;
    const ob = ctx.hiddenByObfuscate(tokNow) ? Math.max(1, disc(intruder, "obfuscate")) : 0;
    const iStats = {dexterity: at(intruder, "dexterity"), stealth: ab(intruder, "stealth"), manipulation: at(intruder, "manipulation"), subterfuge: ab(intruder, "subterfuge"), sneaking: sneaking(doc), obfuscate: ob};
    const book = bookNow();
    const looks = watchers.map(w => {
      const wa = base(w.actor), act = whereOf(wa)?.activity;
      const yards = ctx.yardsBetween(w, tokNow);
      const inSight = (yards === null || yards <= range) && !sightBlocked(w.center, tokNow.center);
      const res = R.notice({perception: at(w.actor, "perception"), alertness: ab(w.actor, "alertness"), awareness: ab(w.actor, "awareness"),
        auspex: disc(w.actor, "auspex") || (profileFor(w.actor).template === "beast" ? 1 : 0), awake: act !== "sleep" || !routineOf(wa)?.on, inSight}, iStats, {book, diff: AR.NOTICE_DIFF[alertLevel(scene)]});
      return {tok: w, actor: wa, yards, ...res};
    });
    const seen = looks.filter(l => l.noticed).sort((a, b) => (a.yards ?? 0) - (b.yards ?? 0));
    const lineList = looks.filter(l => l.why !== "out of sight").map(l => `${l.tok.name}: ${l.noticed ? "notices" : "does not notice"} (${l.why})`);
    const head = `${intruder.name} ${trigger === "enter" ? "enters" : trigger === "leave" ? "leaves" : "stays in"} ${region.name}`;
    const why = cond.which.length ? cond.which.map(c => R.CONDITIONS[c].toLowerCase()).join(", ") : "";
    if ( !seen.length ) {
      if ( !lineList.length ) return null;
      return ChatMessage.create({speaker: {alias: "WoDX reaction"}, whisper: gmIds(), content: `<div class="vta-card wodx-x wnpc wnpc-react"><header class="vta-head"><h3 style="${H3}">${esc(head)}</h3><span class="vta-verdict">Unseen</span></header>`
        + `<div class="vta-body">${why ? `<p class="wodx-quiet">${esc(why)}.</p>` : ""}<ul>${lineList.map(l => `<li>${esc(l)}</li>`).join("")}</ul></div></div>`});
    }
    const w = seen[0];
    const near = seen.slice(1).concat(looks.filter(l => !l.noticed)).filter(l => (ctx.yardsBetween(w.tok, l.tok) ?? 999) <= VOICE_YARDS).length;
    const home = Object.entries(routineOf(w.actor)?.roles ?? {}).some(([, v]) => placeIds.includes(v));
    return reactionCard({wTok: w.tok, wActor: w.actor, sit, near, home, forced: system.response, forcedWhy: "set on this region", head, why, lines: lineList,
      scene, intruder: doc.uuid, region: region.uuid, trigger});
  }

  /** The reaction card for one watcher, in the NPC's mode: a suggestion, or done at once in Auto with Undo. */
  async function reactionCard({wTok, wActor, sit, near = 0, home = false, forced = null, forcedWhy = "", head, why = "", lines = [], scene, intruder, region = null, trigger, event = null}) {
    let options = R.pickReaction(profileFor(wTok.actor), {...sit, alliesNear: near, homeGround: home});
    if ( forced && forced !== "profile" ) {
      const f0 = options.find(o => o.action === forced) ?? {action: forced, score: 99, why: forcedWhy};
      options = [{...f0, why: `${forcedWhy}; ${f0.why}`}, ...options.filter(o => o !== f0)];
    }
    options = options.slice(0, 4).map(o => ({...o, label: R.RESPONSES[o.action]}));
    const mode = modeOf(wActor, scene);
    if ( mode === "off" ) return null;
    const data = {watcher: wTok.document.uuid, intruder, region, scene: scene.uuid, options, head, why, lines, mode, trigger, ...(event ? {event} : {})};
    if ( mode === "auto" ) {
      const pick = R.autoReaction(options, {fightOk: fightAuto()});
      if ( pick.act ) {
        const k = options.indexOf(pick.act);
        const r = await doReaction(data, k);
        data.done = {k, text: r.text, snap: r.snap};
      } else data.waiting = pick.needsStoryteller;
    }
    return ChatMessage.create({speaker: ChatMessage.getSpeaker({token: wTok.document}), whisper: gmIds(), content: reactCardHtml(data), flags: {[MOD]: {reaction: data}}});
  }

  /* ------------------------------------------------------------------ */
  /*  Alarms on places, and what NPCs hear on the map                     */
  /* ------------------------------------------------------------------ */

  const alertOf = scene => AR.normAlert(flag(scene, "alert"));
  const alertLevel = scene => AR.levelAt(alertOf(scene), game.time.worldTime);
  const toDusk = t => { try { return cal.secondsToNextDusk(t, (() => { try { return game.settings.get("wodx-chronicle", "latitude"); } catch (e) { return 50; } })()); } catch (e) { return 12 * 3600; } };
  const idList = v => String(v ?? "").split(/[\s,]+/).map(x => x.replace(/[^A-Za-z0-9]/g, "")).filter(Boolean);
  /** Lights and sounds of a scene's Alert zones: on while the alarm holds. */
  async function syncZones(scene) {
    const on = alertLevel(scene) === "alarm", type = `${MOD}.${ALERT_ZONE}`;
    for ( const region of scene?.regions ?? [] ) for ( const b of region.behaviors ?? [] ) {
      if ( b.type !== type || b.disabled ) continue;
      for ( const id of idList(b.system?.lights) ) { const l = scene.lights?.get?.(id); if ( l && !!l.hidden === on ) await l.update({hidden: !on}); }
      for ( const id of idList(b.system?.sounds) ) { const sd = scene.sounds?.get?.(id); if ( sd && !!sd.hidden === on ) await sd.update({hidden: !on}); }
    }
  }
  /** Put a place on alarm for an hour, then wary until the next dusk. Returns the alert. */
  async function raiseAlarm(scene = canvas.scene, cause = "", opts = {}) {
    return (await raiseAlarmFull(scene, cause, opts))?.alert ?? null;
  }
  /**
   * Raise the alarm, and send it on through the place's Alert zones: at once by bell, telephone or radio, or by a
   * runner who arrives when the trip's minutes have passed. Returns {alert, carry} where carry is what Undo needs.
   */
  async function raiseAlarmFull(scene = canvas.scene, cause = "", {carried = false} = {}) {
    if ( !scene ) return null;
    await loadCalendar();
    const now = game.time.worldTime;
    const a = AR.raise(flag(scene, "alert"), {now, cause, toDusk});
    await scene.update({[`flags.${MOD}.alert`]: a});
    await syncZones(scene);
    Hooks.callAll("wodxPlaceAlarm", {scene: scene.id, level: "alarm", cause, until: a.until});
    const carry = {from: scene.uuid, at: now, reached: [], sent: 0};
    if ( !carried ) {
      try { await carryAlarm(scene, carry); } catch (e) { console.error(`${MOD} |`, e); }
    }
    return {alert: a, carry};
  }
  const tripMinutes = sc => {
    const own = Number(sc?.flags?.["wodx-storyteller"]?.travel?.minutes);
    if ( own > 0 ) return own;
    try { return Number(game.settings.get("wodx-storyteller", "travelMinutes")) || 30; } catch (e) { return 30; }
  };
  async function carryAlarm(scene, carry) {
    const type = `${MOD}.${ALERT_ZONE}`, now = game.time.worldTime, lines = [];
    const pending = [...(flag(scene, "carrying") ?? [])];
    for ( const region of scene?.regions ?? [] ) for ( const b of region.behaviors ?? [] ) {
      if ( b.type !== type || b.disabled || !b.system?.carryTo ) continue;
      for ( const to of AR.carryTargets(b.system.carryTo, game.scenes?.contents ?? [...(game.scenes ?? [])], scene.id) ) {
        const plan = AR.carryPlan(b.system.carrier, {year: yearNow(), minutes: b.system.minutes, tripMinutes: tripMinutes(to)});
        if ( !plan.ok ) { lines.push(`No word reaches ${to.name}: ${plan.why}.`); continue; }
        if ( plan.seconds <= 0 ) {
          carry.reached.push({scene: to.uuid, prev: flag(to, "alert") ?? null});
          await raiseAlarmFull(to, `word from ${scene.name}`, {carried: true});
          lines.push(`Word reaches ${to.name} at once: it is on alarm too.`);
        } else {
          pending.push(AR.normCarry({to: to.uuid, from: scene.uuid, fromName: scene.name, carrier: b.system.carrier, at: now + plan.seconds, raisedAt: now}));
          carry.sent++;
          lines.push(`A runner sets off for ${to.name}: about ${Math.round(plan.seconds / 60)} minutes.`);
        }
      }
    }
    if ( carry.sent ) await scene.update({[`flags.${MOD}.carrying`]: pending.slice(-30)});
    if ( lines.length ) await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), content: `<div class="vta-card wodx-x wnpc"><div class="vta-body"><p><strong>${esc(scene.name)}: the alarm spreads</strong></p><ul>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul></div></div>`});
    return lines;
  }
  /** Undo of a raised alarm: the places it reached at once go back, and runners still on the road turn back. */
  async function undoCarry(carry) {
    if ( !carry ) return;
    for ( const r of carry.reached ?? [] ) {
      const sc = await fromUuid(r.scene);
      if ( sc ) { await sc.update(r.prev ? {[`flags.${MOD}.alert`]: r.prev} : unsetKey(`flags.${MOD}.alert`)); await syncZones(sc); }
    }
    if ( carry.sent ) {
      const sc = await fromUuid(carry.from);
      const list = flag(sc, "carrying") ?? [];
      if ( sc && list.length ) await sc.update({[`flags.${MOD}.carrying`]: list.filter(c => c.raisedAt !== carry.at)});
    }
  }
  /** The clock moved: runners who have arrived raise the alarm where they were sent. */
  async function deliverCarries() {
    for ( const scene of game.scenes ?? [] ) {
      const list = flag(scene, "carrying") ?? [];
      if ( !list.length ) continue;
      const due = AR.dueCarries(list, game.time.worldTime);
      if ( !due.length ) continue;
      await scene.update({[`flags.${MOD}.carrying`]: list.filter(c => !due.some(d => d.to === c.to && d.at === c.at))});
      for ( const c of due ) {
        const to = await fromUuid(c.to);
        if ( !to ) continue;
        await raiseAlarmFull(to, `a runner from ${c.fromName ?? "elsewhere"}`, {carried: true});
        await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), content: `<div class="vta-card wodx-x wnpc"><div class="vta-body"><p>A runner from ${esc(c.fromName ?? "elsewhere")} reaches ${esc(to.name)}: it is on alarm.</p></div></div>`});
      }
    }
  }
  /** A WoDX: Trigger region: someone walked in. */
  const firedNow = new Map();
  async function onTrigger(system, event) {
    if ( !isActiveGM() || skipping() ) return null;
    const doc = event?.data?.token, behavior = system.parent, region = behavior?.parent ?? event?.region;
    if ( !doc || !region || behavior?.disabled ) return null;
    const actor = doc.actor;
    if ( !AR.triggerFires(system, {pc: !!actor?.hasPlayerOwner}) ) return null;
    const k = `${behavior.id ?? region.id}:${doc.id}`, t = Date.now();
    if ( firedNow.get(k) > t - 5000 ) return null;
    // NPC 0.9.0: the region's "Only when" list, read by WoDX Chronicle; a list that cannot be read stays quiet
    const W = chron()?.when;
    if ( String(system.when ?? "").trim() ) {
      if ( !W?.check ) return null;
      if ( !W.check(system.when, {token: doc, actor, scene: region.parent ?? doc.parent}).ok ) return null;
    }
    firedNow.set(k, t);
    const scene = region.parent ?? doc.parent;
    const placeUuid = region.flags?.[MOD]?.place?.kind ? region.uuid : scene?.uuid;
    const ev = AR.triggerEvent({does: system.does, label: system.label, scene: scene?.id, place: placeUuid, region: region.id, regionName: region.name,
      who: doc.uuid, whoName: doc.name ?? actor?.name, at: game.time.worldTime, x: doc.x, y: doc.y});
    if ( system.once ) await behavior.update?.({"system.fired": true});
    Hooks.callAll("wodxMapEvent", ev);
    if ( system.does === "note" ) await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(),
      content: `<div class="vta-card wodx-x wnpc"><div class="vta-body"><p>${esc(ev.whoName ?? "Someone")} reached ${esc(ev.objectName)}.</p></div></div>`});
    if ( String(system.then ?? "").trim() && W?.run ) await W.run(system.then, {token: doc, actor, scene, label: ev.objectName, event: ev});
    return ev;
  }
  /** The clock moved: alarms die down and wary places calm, with a note to the Storyteller. */
  async function checkAlerts() {
    if ( !isActiveGM() ) return;
    for ( const scene of game.scenes ?? [] ) if ( (flag(scene, "marks") ?? []).length ) await repairMarks(scene);
    await deliverCarries();
    for ( const scene of game.scenes ?? [] ) {
      const a = alertOf(scene);
      if ( !a ) continue;
      const f = AR.fade(a, game.time.worldTime, scene.name);
      if ( !f.changed ) continue;
      await scene.update(f.level === "calm" ? unsetKey(`flags.${MOD}.alert`) : {[`flags.${MOD}.alert.shown`]: f.level});
      await syncZones(scene);
      Hooks.callAll("wodxPlaceAlarm", {scene: scene.id, level: f.level, cause: a.cause});
      if ( f.text ) await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), content: `<div class="vta-card wodx-x wnpc"><div class="vta-body"><p>${esc(f.text)}</p></div></div>`});
    }
  }
  const heardBusy = new Set();
  /** Active Storyteller: a map event from WoDX Interactables. The NPCs who heard it react; one asleep wakes. */
  async function onMapEvent(ev) {
    if ( !isActiveGM() || !ev ) return [];
    // Marks: what is put right later. An undone card takes its mark away.
    try { await noteMark(ev); } catch (e) { console.error(`${MOD} |`, e); }
    if ( skipping() || ev.undone || setting("mapReactions") === false ) return [];
    const scene = game.scenes.get(ev.scene);
    if ( !scene || scene.id !== canvas.scene?.id ) return [];
    if ( NR.modeOf({scene: flag(scene, "routineMode"), world: setting("routineMode")}) === "off" ) return [];
    if ( ev.message && heardBusy.has(ev.message) ) return [];
    if ( ev.message ) heardBusy.add(ev.message);
    const out = [];
    if ( AR.RAISES.has(ev.kind) && ev.how !== "help" ) {
      const prev = flag(scene, "alert") ?? null;
      const full = await raiseAlarmFull(scene, ev.objectName ? `${ev.objectName}: the alarm` : "an alarm");
      out.push(await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), flags: {[MOD]: {alarmCard: {scene: scene.uuid, prev, carry: full?.carry ?? null}}},
        content: `<div class="vta-card wodx-x wnpc"><header class="vta-head"><h3 style="${H3}">${esc(scene.name)} is on alarm</h3><span class="vta-verdict">Alarm</span></header><div class="vta-body"><p>${esc(ev.objectName ?? "An alarm")} went off. The place is on alarm for an hour of world time, then wary until the next dusk.</p><div class="wnpc-done"><button type="button" class="wnpc-a-undo">Undo</button></div></div></div>`}));
    }
    const intr = ev.who ? await fromUuid(ev.who) : null;
    const tokNow = intr ? canvas.tokens.get(intr.id) : null;
    const hearers = (ev.heard ?? []).map(u => canvas.tokens.placeables.find(t => t.document.uuid === u)).filter(t => t?.actor && !t.actor.hasPlayerOwner);
    const base = a => a?.isToken ? (a.baseActor ?? game.actors.get(a.id)) : a;
    const sorted = AR.sortHearers(hearers.map(t => ({uuid: t.document.uuid, asleep: whereOf(base(t.actor))?.activity === "sleep" && !!routineOf(base(t.actor))?.on && !flag(base(t.actor), "paused"), down: !!downState(t.actor)})));
    // The sleepers wake: their routine pauses, so the next noise finds them awake
    const woke = hearers.filter(t => sorted.wake.includes(t.document.uuid));
    if ( woke.length ) {
      const until = game.time.worldTime + PAUSE_MINUTES * 60;
      for ( const t of woke ) { const a = base(t.actor); if ( a ) await a.update({[`flags.${MOD}.paused`]: {reason: "woken", until}}); }
    }
    const awake = hearers.filter(t => sorted.react.includes(t.document.uuid)).sort((a, b) => (ctx.yardsBetween(a, tokNow ?? a) ?? 0) - (ctx.yardsBetween(b, tokNow ?? b) ?? 0));
    if ( !awake.length ) {
      if ( woke.length ) out.push(await ChatMessage.create({speaker: {alias: "WoDX reaction"}, whisper: gmIds(), content: `<div class="vta-card wodx-x wnpc"><div class="vta-body"><p>${esc(woke.map(t => t.name).join(", "))} ${woke.length === 1 ? "wakes" : "wake"} at the noise.</p></div></div>`}));
      return out.filter(Boolean);
    }
    await loadCalendar();
    const d = describer()(game.time.worldTime);
    const sit = AR.eventSituation(ev, {night: d.isNight, curfew: R.isCurfew(d, curfewStartOn(d)), weapon: intr?.actor ? weaponOut(intr.actor) : false});
    const w = awake[0];
    const near = awake.length - 1;
    const placeIds = [ev.place, scene.uuid].filter(Boolean);
    const home = Object.entries(routineOf(base(w.actor))?.roles ?? {}).some(([, v]) => placeIds.includes(v));
    const lines = [`Heard by ${awake.map(t => t.name).join(", ")}.`, ...(woke.length ? [`${woke.map(t => t.name).join(", ")} ${woke.length === 1 ? "wakes" : "wake"} at it.`] : [])];
    out.push(await reactionCard({wTok: w, wActor: base(w.actor), sit, near, home, head: AR.eventHead(ev, ev.whoName), why: ev.noise === "loud" ? "a loud noise" : ev.noise === "quiet" ? "a quiet noise" : "",
      lines, scene, intruder: ev.who, region: null, trigger: "heard", event: {kind: ev.kind, object: ev.object, message: ev.message}}));
    if ( ev.message ) setTimeout(() => heardBusy.delete(ev.message), 5000);
    return out.filter(Boolean);
  }
  /* Marks and repairs */
  const toDawn = t => { try { return cal.secondsToNextDawn(t, (() => { try { return game.settings.get("wodx-chronicle", "latitude"); } catch (e) { return 50; } })()); } catch (e) { return 6 * 3600; } };
  async function noteMark(ev) {
    const scene = game.scenes.get(ev.scene);
    if ( !scene ) return null;
    const marks = flag(scene, "marks") ?? [];
    if ( ev.undone ) {
      if ( ev.message && marks.some(m => m.id === ev.message) ) await scene.update({[`flags.${MOD}.marks`]: marks.filter(m => m.id !== ev.message)});
      return null;
    }
    await loadCalendar();
    const placeIds = [ev.place, scene.uuid].filter(Boolean);
    const placeFlags = [scene, ...(scene.regions ?? [])].find(d => placeIds.includes(d.uuid))?.flags?.[MOD]?.place ?? flag(scene, "place");
    const owned = !!placeFlags?.owner || residentsOf(placeIds).length > 0;
    const m = AR.markFor(ev, {owned, toDawn});
    if ( !m ) return null;
    await scene.update({[`flags.${MOD}.marks`]: [...marks.filter(x => x.id !== m.id), m].slice(-60)});
    return m;
  }
  /** The clock passed a repair: the owner puts a forced door or a broken pane right, in one card with Undo. */
  async function repairMarks(scene) {
    const marks = flag(scene, "marks") ?? [];
    const due = AR.dueMarks(marks, game.time.worldTime);
    if ( !due.length ) return null;
    const IX = "wodx-interactables", snap = [], lines = [];
    const DS = CONST.WALL_DOOR_STATES ?? {CLOSED: 0, OPEN: 1, LOCKED: 2};
    for ( const m of due ) {
      const doc = m.objectType === "Wall" ? scene.walls?.get?.(m.object) : scene.tiles?.get?.(m.object);
      if ( !doc ) continue;
      const f = doc.flags?.[IX] ?? {};
      snap.push({type: m.objectType, id: doc.id, ds: doc.ds ?? null, flags: foundry.utils.deepClone(f)});
      const locked = (!!f.lock && f.lock !== "none") || !!f.lockBroken;
      const up = {[`flags.${IX}.broken`]: false, [`flags.${IX}.progress`]: {pick: 0, force: 0, hack: 0}, ...unsetKey(`flags.${IX}.lockBroken`)};
      if ( m.objectType === "Wall" ) up.ds = locked ? DS.LOCKED : DS.CLOSED; else up[`flags.${IX}.ds`] = locked ? "locked" : "closed";
      await doc.update(up);
      lines.push(`${m.objectName || "It"} is ${AR.REPAIRS[m.kind]}.`);
    }
    await scene.update({[`flags.${MOD}.marks`]: marks.filter(m => !due.includes(m))});
    if ( !lines.length ) return null;
    return ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), flags: {[MOD]: {repairCard: {scene: scene.uuid, snap, marks: due, undone: false}}},
      content: `<div class="vta-card wodx-x wnpc"><header class="vta-head"><h3 style="${H3}">${esc(scene.name)}: put right</h3><span class="vta-verdict">Auto</span></header><div class="vta-body"><ul>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul><p class="wodx-quiet">Whoever lives or works there saw to it.</p><div class="wnpc-done"><button type="button" class="wnpc-m-undo">Undo</button></div></div></div>`});
  }
  async function undoRepairCard(msg) {
    const d = msg?.flags?.[MOD]?.repairCard;
    if ( !d || d.undone || !game.user.isGM ) return null;
    const scene = await fromUuid(d.scene), IX = "wodx-interactables";
    if ( scene ) {
      for ( const s0 of d.snap ) {
        const doc = s0.type === "Wall" ? scene.walls?.get?.(s0.id) : scene.tiles?.get?.(s0.id);
        if ( !doc ) continue;
        const up = {};
        for ( const k of Object.keys(doc.flags?.[IX] ?? {}) ) if ( !(k in s0.flags) ) Object.assign(up, unsetKey(`flags.${IX}.${k}`));
        for ( const [k, v] of Object.entries(s0.flags) ) up[`flags.${IX}.${k}`] = v;
        if ( s0.type === "Wall" && s0.ds !== null ) up.ds = s0.ds;
        await doc.update(up);
      }
      // The marks come back, without a repair time, so the clock does not repair them again
      const marks = flag(scene, "marks") ?? [];
      await scene.update({[`flags.${MOD}.marks`]: [...marks, ...d.marks.map(m => ({...m, repairAt: null}))]});
    }
    await msg.update({[`flags.${MOD}.repairCard.undone`]: true, content: String(msg.content).replace(/<button[^>]*wnpc-m-undo[^>]*>Undo<\/button>/, "<b>Undone.</b>")});
    return true;
  }
  async function undoAlarmCard(msg) {
    const d = msg?.flags?.[MOD]?.alarmCard;
    if ( !d || d.undone || !game.user.isGM ) return null;
    const sc = await fromUuid(d.scene);
    if ( sc ) { await sc.update(d.prev ? {[`flags.${MOD}.alert`]: d.prev} : unsetKey(`flags.${MOD}.alert`)); await syncZones(sc); }
    await undoCarry(d.carry);
    await msg.update({[`flags.${MOD}.alarmCard.undone`]: true, content: String(msg.content).replace(/<button[^>]*wnpc-a-undo[^>]*>Undo<\/button>/, "<b>Undone.</b>")});
    return true;
  }

  function reactCardHtml(data) {
    const rows = data.options.map((o, k) => `<li class="wnpc-opt${data.done?.k === k ? " chosen" : ""}"><span class="wnpc-score">${o.score}</span> <b>${esc(o.label)}</b>`
      + `<div class="wodx-quiet">${esc(o.why)}</div>` + (data.done ? "" : `<button type="button" class="wnpc-x-go" data-k="${k}">${k === 0 ? "Accept" : "Do this instead"}</button>`) + `</li>`).join("");
    const head = data.mode === "auto" ? (data.waiting ? "Auto, waiting for the Storyteller" : "Auto") : "Suggestion";
    return `<div class="vta-card wodx-x wnpc wnpc-react"><header class="vta-head"><h3 style="${H3}">${esc(data.head)}</h3><span class="vta-verdict">${head}</span></header>`
      + `<div class="vta-body">${data.why ? `<p class="wodx-quiet">${esc(data.why)}.</p>` : ""}<ul>${data.lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>`
      + (data.waiting ? `<p><b>Needs the Storyteller:</b> ${esc(data.waiting.label)}. ${esc(data.waiting.why)}.</p>` : "")
      + `<ol class="wnpc-opts">${rows}</ol>`
      + (data.done ? `<div class="wnpc-done">${esc(data.done.text)}${data.done.undone ? " <b>Undone.</b>" : ` <button type="button" class="wnpc-x-undo">Undo</button>`}</div>` : "")
      + `<p class="wodx-quiet">The Storyteller speaks for the NPC.</p></div></div>`;
  }

  /** Carry out response k of a reaction. Returns {text, snap}. */
  async function doReaction(data, k) {
    const o = data.options[k];
    const w = (await fromUuid(data.watcher))?.object, i = (await fromUuid(data.intruder))?.object;
    const snap = {created: [], removed: [], moved: [], paused: []};
    if ( !w ) return {text: "The watcher is gone.", snap};
    const t = game.time.worldTime, until = t + PAUSE_MINUTES * 60;
    const base = a => a?.isToken ? (a.baseActor ?? game.actors.get(a.id)) : a;
    const pause = async actors => {
      for ( const a of actors.map(base).filter(a => a && routineOf(a)?.on) ) {
        snap.paused.push({actorId: a.id, prev: flag(a, "paused") ?? null});
        await a.update({[`flags.${MOD}.paused`]: {reason: "reaction", until}});
      }
    };
    switch ( o.action ) {
      case "challenge": {
        let moved = "";
        if ( i && onGrid() ) {
          snap.moved.push({uuid: w.document.uuid, x: w.document.x, y: w.document.y});
          const way = ctx.approach(w, i);
          if ( way.path ) { await ctx.walk(w, corners(way.path)); moved = ` and goes to them`; }
        }
        await pause([w.actor]);
        return {text: `${w.name} challenges ${i?.name ?? "them"}${moved}.`, snap};
      }
      case "alarm": {
        const heard = canvas.tokens.placeables.filter(t2 => t2.id !== w.id && t2.actor && !t2.actor.hasPlayerOwner && (ctx.yardsBetween(w, t2) ?? 999) <= VOICE_YARDS);
        await pause([w.actor, ...heard.map(h => h.actor)]);
        const sc = canvas.scene;
        snap.alert = {scene: sc.uuid, prev: flag(sc, "alert") ?? null};
        snap.alert.carry = (await raiseAlarmFull(sc, `${w.name} raised it`))?.carry ?? null;
        return {text: `${w.name} raises the alarm.${heard.length ? ` ${heard.map(h => h.name).join(", ")} hear it.` : " Nobody is within call."} ${sc.name} is on alarm for an hour.`, snap};
      }
      case "send": {
        const scene = canvas.scene;
        const onHere = new Set(canvas.tokens.placeables.map(t2 => t2.actor?.id));
        const helpers = routineNpcs().filter(a => !onHere.has(a.id) && profileFor(a).template === "guard" && !downState(a)).slice(0, 2);
        if ( !helpers.length ) { await pause([w.actor]); return {text: `${w.name} sends for help, but no one of the watch is free.`, snap}; }
        const busy = busyCells();
        for ( const a of helpers ) {
          const p = {region: entranceOf(scene) ?? (await fromUuid(data.region))};
          const arr = arrivalFor(scene, a, p, busy, {walkIn: false});
          const xy = ctx.topLeftFor(arr.shape, arr.cell);
          const td = await a.getTokenDocument({x: xy.x, y: xy.y, flags: {[MOD]: {placed: true}}});
          const [made] = await scene.createEmbeddedDocuments("Token", [td.toObject()]);
          if ( made ) { snap.created.push(made.uuid); for ( const c of ctx.cellsAt(arr.shape, arr.cell) ) busy.add(`${c.i},${c.j}`); }
        }
        await pause([w.actor, ...helpers]);
        return {text: `${w.name} sends for help: ${helpers.map(a => a.name).join(" and ")} come${helpers.length === 1 ? "s" : ""}.`, snap};
      }
      case "flee": {
        await pause([w.actor]);
        if ( !onGrid() ) return {text: `${w.name} flees (move the token by hand).`, snap};
        snap.moved.push({uuid: w.document.uuid, x: w.document.x, y: w.document.y});
        const run = C()?.movementFor?.(w.actor)?.run ?? 20;
        const map = NR.reachable(ctx.cellOf(w), ctx.passableFor(w), ctx.cellsFor(run * 3), {neighbors: ctx.stepsFor()});
        const cell = NR.fleeCell(map, i ? [ctx.cellOf(i)] : []);
        const path = cell ? NR.pathTo(cell) : null;
        if ( path && path.length > 1 ) await ctx.walk(w, corners(path));
        return {text: path?.length > 1 ? `${w.name} flees.` : `${w.name} has nowhere to run.`, snap};
      }
      case "fight": {
        if ( !i ) return {text: "The intruder is gone.", snap};
        // Combat 3.9.0: the shared fight starter sets it up and starts it (with the household within call)
        const starter = C()?.fight?.start;
        if ( starter ) {
          const res = await starter({scene: canvas.scene, tokens: [w.document, i.document], source: "region", why: `${w.name} fights ${i.name}`, byHand: true});
          if ( res?.created ) snap.combat = res.combat;
          if ( res?.done === "off" ) return {text: `${w.name} would fight ${i.name}, but fights are set to start by hand: start it from the combat tracker.`, snap};
          return {text: `${w.name} fights ${i.name}: the fight begins.`, snap};
        }
        const combat = await Combat.create({scene: canvas.scene.id, active: true});
        await combat.createEmbeddedDocuments("Combatant", [w, i].map(t2 => ({tokenId: t2.id, sceneId: canvas.scene.id, actorId: t2.actor?.id})));
        snap.combat = combat.id;
        return {text: `${w.name} fights ${i.name}: the encounter is set up. Roll initiative to begin.`, snap};
      }
      default: return {text: `${w.name} lets it pass.`, snap};
    }
  }
  async function acceptReactionCard(msg, k = 0) {
    msg = typeof msg === "string" ? game.messages.get(msg) : msg;
    const data = foundry.utils.deepClone(msg?.flags?.[MOD]?.reaction);
    if ( !data || data.done || !game.user.isGM ) return data?.done ?? null;
    data.done = {k, text: "…"};
    await msg.update({[`flags.${MOD}.reaction`]: data});
    const r = await doReaction(data, k);
    data.done = {k, text: r.text, snap: r.snap};
    data.waiting = null;
    await msg.update({[`flags.${MOD}.reaction`]: data, content: reactCardHtml(data)});
    return data.done;
  }
  async function undoReactionCard(msg) {
    msg = typeof msg === "string" ? game.messages.get(msg) : msg;
    const data = foundry.utils.deepClone(msg?.flags?.[MOD]?.reaction);
    if ( !data?.done?.snap || data.done.undone || !game.user.isGM ) return null;
    const scene = await fromUuid(data.scene);
    await undoSnap(scene, data.done.snap);
    data.done.undone = true;
    await msg.update({[`flags.${MOD}.reaction`]: data, content: reactCardHtml(data)});
    return data.done;
  }

  /* ------------------------------------------------------------------ */
  /*  Windows: places, and an NPC's routine                              */
  /* ------------------------------------------------------------------ */

  const opt = (o, v) => Object.entries(o).map(([k, l]) => `<option value="${esc(k)}"${k === v ? " selected" : ""}>${esc(l)}</option>`).join("");
  // Built on first use: Foundry's classes exist only once the game has loaded
  let placesClass = null;
  /** How far word of a breach goes from a place (WoDX Actions 3.40.0 reads it): blank follows the kind of place. */
  const MASQ_MODES = {"": "By kind of place", open: "Open: word spreads", guarded: "Guarded, like Elysium", closed: "Closed: nothing leaves"};
  function PlacesAppClass() {
  if ( placesClass ) return placesClass;
  const {ApplicationV2} = foundry.applications.api;
  class PlacesApp extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
      id: "wodx-npc-places", tag: "form", classes: ["wodx", "wodx-tagging", "wnpc-places"],
      window: {title: "WoDX places", icon: "fa-solid fa-map-location-dot", resizable: true},
      position: {width: 860, height: 700},
      actions: {guess: PlacesApp.#onGuess, match: () => matchOwners()},
      form: {handler: PlacesApp.#onSubmit, closeOnSubmit: false}
    };
    static #instance;
    static open() {
      if ( !game.user.isGM ) return null;
      const height = Math.max(360, Math.min(720, window.innerHeight - 120)), width = Math.max(480, Math.min(900, window.innerWidth - 40));
      this.#instance ??= new PlacesApp({position: {width, height}});
      return this.#instance.render({force: true});
    }
    async _renderHTML() {
      const kinds = {"": "Not a place", ...R.PLACE_KINDS};
      const row = (doc, key, label) => {
        const f = flag(doc, "place") ?? {}, g = R.guessPlace(doc.name);
        return `<tr data-key="${key}" data-name="${esc(doc.name)}" data-guess="${esc(g.kind)}" data-owner="${esc(g.owner)}" data-search-text="${esc(label)}">
          <td class="name">${esc(label)}</td><td><select name="${key}.kind" data-fixed>${opt(kinds, f.kind ?? "")}</select></td>
          <td><input type="text" name="${key}.owner" value="${esc(f.owner ?? "")}" placeholder="${esc(g.owner)}"></td>
          <td><input type="checkbox" name="${key}.private" ${f.private ? "checked" : ""}></td>
          <td><select name="${key}.masq" data-fixed title="How far word of a Masquerade breach goes from here">${opt(MASQ_MODES, f.masq ?? "")}</select></td></tr>`;
      };
      const scenes = [...game.scenes].sort((a, b) => a.name.localeCompare(b.name));
      const viewed = canvas?.scene;
      const regions = viewed ? [...(viewed.regions ?? [])].sort((a, b) => a.name.localeCompare(b.name)) : [];
      const div = document.createElement("div");
      div.className = "wodx-body";
      div.innerHTML = `<div class="wodx-top">
        <p>A place is where a routine can send an NPC: a whole scene, or a region inside the scene. An NPC is placed, walked or removed only on the scene the Storyteller is viewing.</p>
        <div class="wodx-buttons">
          <button type="button" data-action="guess" title="Only fills rows that are not set">Guess from scene names</button>
          <button type="button" data-action="match" title="Sets each named owner's home, haven, post or church">Match owners to NPCs</button>
        </div>
        <div class="wodx-field"><label>The chronicle's own feast days (one a line: 09-01 St Giles)</label><textarea name="feasts" rows="2">${esc(setting("feasts") ?? "")}</textarea></div>
        ${searchBox("table.wnpc-place-table", "Search scenes and regions…", "Search places")}</div>
        <div class="wodx-scroll wodx-table-wrap">
        ${regions.length ? `<h3>Regions of ${esc(viewed.name)}</h3><table class="wodx-table wnpc-place-table"><thead><tr><th>Region</th><th>Kind of place</th><th>Owner</th><th title="Private: for the Trespass condition">Private</th><th title="Masquerade: by kind of place, or set here">Masquerade</th></tr></thead><tbody>
          ${regions.map(r => row(r, `r:${r.id}`, r.name)).join("")}</tbody></table>` : ""}
        <h3>Scenes</h3><table class="wodx-table wnpc-place-table"><thead><tr><th>Scene</th><th>Kind of place</th><th>Owner</th><th title="Private: for the Trespass condition">Private</th><th title="Masquerade: by kind of place, or set here">Masquerade</th></tr></thead><tbody>
          ${scenes.map(s => row(s, `s:${s.id}`, s.name)).join("")}</tbody></table></div>
        <footer class="form-footer wodx-footer"><button type="submit"><i class="fa-solid fa-floppy-disk"></i> Save</button></footer>`;
      return div;
    }
    _replaceHTML(result, content) { content.replaceChildren(result); }
    static #onGuess() {
      let n = 0;
      for ( const tr of this.element.querySelectorAll("tbody tr") ) {
        const sel = tr.querySelector("select");
        if ( sel.value || !tr.dataset.guess ) continue;
        sel.value = tr.dataset.guess;
        const own = tr.querySelector("input[type=text]");
        if ( !own.value && tr.dataset.owner ) own.value = tr.dataset.owner;
        tr.classList.add("wodx-filled");
        n++;
      }
      ui.notifications.info(`Guessed ${n} place(s) from their names. Check them, then Save.`);
    }
    static async #onSubmit(event, form) {
      const scenes = [], regions = new Map();
      for ( const tr of form.querySelectorAll("tbody tr") ) {
        const key = tr.dataset.key, [kind, id] = key.split(":");
        const doc = kind === "s" ? game.scenes.get(id) : canvas.scene?.regions?.get(id);
        if ( !doc ) continue;
        const next = {kind: form.elements[`${key}.kind`].value, owner: form.elements[`${key}.owner`].value.trim(), private: form.elements[`${key}.private`].checked, masq: form.elements[`${key}.masq`]?.value ?? ""};
        const prev = flag(doc, "place") ?? {kind: "", owner: "", private: false, masq: ""};
        if ( prev.kind === next.kind && (prev.owner ?? "") === next.owner && !!prev.private === next.private && (prev.masq ?? "") === next.masq ) continue;
        const up = next.kind ? {_id: id, [`flags.${MOD}.place`]: next} : {_id: id, ...unsetKey(`flags.${MOD}.place`)};
        if ( kind === "s" ) scenes.push(up); else regions.set(id, up);
      }
      if ( scenes.length ) await Scene.updateDocuments(scenes);
      if ( regions.size ) await canvas.scene.updateEmbeddedDocuments("Region", [...regions.values()]);
      const feasts = form.elements.feasts?.value ?? "";
      if ( feasts !== (setting("feasts") ?? "") ) await game.settings.set(MOD, "feasts", feasts);
      ui.notifications.info(scenes.length + regions.size ? `Saved ${scenes.length + regions.size} place(s).` : "Nothing changed.");
      await this.render();
    }
  }
  return (placesClass = PlacesApp);
  }

  const ROLE_FOR_KIND = {home: "home", haven: "haven", gate: "post", church: "church", workplace: "work", tavern: "work", castle: "court", market: "work", elysium: "court"};
  /** Give each place's named owner that place as home, haven, post, church or work. Asks first. */
  async function matchOwners() {
    const places = listPlaces().filter(p => p.owner);
    const actors = allActors().filter(a => !a.hasPlayerOwner);
    const hits = [];
    for ( const p of places ) for ( const a of actors ) if ( R.ownerMatches(p.owner, a.name) ) hits.push({a, p, role: ROLE_FOR_KIND[p.kind] ?? "home"});
    if ( !hits.length ) return ui.notifications.info("No tagged place names an owner who matches an NPC.");
    const content = `<p>Set these, and switch on each NPC's routine:</p><ul>${hits.map((h, k) => `<li><label><input type="checkbox" name="h${k}" checked> ${esc(h.a.name)}: ${esc(R.ROLES[h.role].label)} is ${esc(h.p.name)}</label></li>`).join("")}</ul>`;
    const data = await foundry.applications.api.DialogV2.wait({window: {title: "Match owners to NPCs"}, classes: ["wodx-dialog", "wodx-npc-dialog"], position: {width: 520, height: "auto"},
      content: `${hits.length > 5 ? searchBox(".wnpc-match ul", "Search…", "Search matches") : ""}<div class="wnpc-match">${content}</div>`,
      buttons: [{action: "ok", label: "Set them", default: true, callback: (ev, b) => new foundry.applications.ux.FormDataExtended(b.form).object}, {action: "cancel", label: "Cancel"}], rejectClose: false});
    if ( !data || data === "cancel" ) return null;
    const ups = new Map();
    hits.forEach((h, k) => {
      if ( !data[`h${k}`] ) return;
      const r = foundry.utils.deepClone(ups.get(h.a.id) ?? routineOf(h.a) ?? {});
      r.on = true; r.roles = {...(r.roles ?? {}), [h.role]: h.p.id};
      ups.set(h.a.id, r);
    });
    await Actor.updateDocuments([...ups].map(([id, r]) => ({_id: id, [`flags.${MOD}.routine`]: r})));
    ui.notifications.info(`Set ${ups.size} NPC routine(s).`);
    return ups.size;
  }

  const DAYSETS = {"": "Every day", "0,1,2,3,4,5": "Monday to Saturday", "6": "Sundays", "4,5": "Friday and Saturday", "4,5,6": "Friday to Sunday", "5,6": "Saturday and Sunday",
    "0": "Mondays", "1": "Tuesdays", "2": "Wednesdays", "3": "Thursdays", "4": "Fridays", "5": "Saturdays"};
  /** An NPC's routine: on or off, the preset or their own blocks, and the places their roles point to. */
  async function editRoutine(actor) {
    if ( !actor || !game.user.isGM ) return null;
    const r = routineOf(actor) ?? {}, tpl = profileFor(actor).template, places = listPlaces().sort((a, b) => a.name.localeCompare(b.name));
    const preset = r.preset ?? R.DEFAULT_PRESET[tpl] ?? "recluse";
    const year = yearNow(), age = r.age ?? "";
    const blocks = R.blocksOf({...r, preset}, tpl, year);
    const shown = R.presetsFor(year);
    if ( !shown[preset] && R.PRESETS[preset] ) shown[preset] = R.PRESETS[preset];
    const roleOpts = Object.fromEntries(Object.entries(R.ROLES).map(([k, v]) => [k, `${v.label} (role)`]));
    const placeOpts = Object.fromEntries(places.map(p => [p.id, p.name]));
    const pick = v => opt({"": "Not set", ...roleOpts, ...placeOpts}, v);
    const rows = [...blocks, ...Array.from({length: 3}, () => ({from: "", to: "", place: "", activity: "rest", when: "any", days: null, feast: "any"}))].map((b, k) => `<tr>
      <td><input type="number" name="b${k}.from" min="0" max="24" step="1" value="${b.from}"></td><td><input type="number" name="b${k}.to" min="0" max="24" step="1" value="${b.to}"></td>
      <td><select name="b${k}.place" class="wnpc-place-pick">${pick(b.place)}</select></td>
      <td><select name="b${k}.activity" data-fixed>${opt(R.ACTIVITIES, b.activity)}</select></td>
      <td><select name="b${k}.when" data-fixed>${opt({any: "Day or night", day: "By day", night: "By night"}, b.when ?? "any")}</select></td>
      <td><select name="b${k}.days" data-fixed>${opt({...DAYSETS, ...(b.days && !DAYSETS[b.days.join(",")] ? {[b.days.join(",")]: `Days ${b.days.join(", ")}`} : {})}, (b.days ?? []).join(","))}</select></td>
      <td><select name="b${k}.feast" data-fixed>${opt({any: "Any day", only: "Feast days only", not: "Not on feast days"}, b.feast ?? "any")}</select></td>
      <td><input type="text" name="b${k}.label" value="${esc(b.label ?? "")}"></td></tr>`).join("");
    const roles = Object.entries(R.ROLES).filter(([k]) => k !== "domitor").map(([k, v]) => `<div class="wodx-field"><label>${esc(v.label)}</label><select name="role-${k}" class="wnpc-place-pick">${opt({"": "Any of that kind", ...placeOpts}, r.roles?.[k] ?? "")}</select></div>`).join("");
    const content = `<div class="wnpc-routine-form">
      <div class="wodx-field"><label><input type="checkbox" name="on" ${r.on ? "checked" : ""}> Keeps a routine</label></div>
      <div class="wodx-field"><label>Routines and reactions</label><select name="mode" data-fixed>${opt({"": `As the scene or world says (${NR.MODES[modeOf(actor)].split(" (")[0]})`, ...NR.MODES}, r.mode ?? "")}</select></div>
      <div class="wodx-field"><label>Ready routine</label><select name="preset" data-fixed>${opt(Object.fromEntries(Object.entries(shown).map(([k, v]) => [k, v.label])), preset)}</select></div>
      <div class="wodx-field"><label>Hours of the age</label><select name="age" data-fixed>${opt({"": `Follow the year (now ${R.AGES[R.ageOf(year)].label})`, ...Object.fromEntries(Object.entries(R.AGES).map(([k, v]) => [k, v.label]))}, age)}</select></div>
      <p class="wodx-quiet">A ready routine changes its hours with the age (the factory day, the short Saturday, late bars) unless you fix an age here, or type hours of its own. Change the ready routine or the age and save to load its hours; edit the hours below to make them this NPC's own. The first row that fits the time wins. An empty place drops a row.</p>
      ${searchBox("select.wnpc-place-pick", "Search places…", "Search places")}
      <fieldset><legend>Their places</legend>${roles}</fieldset>
      ${searchBox("table.wnpc-blocks", "Search the hours…", "Search the hours")}
      <div class="wodx-scroll wodx-table-wrap"><table class="wodx-table wnpc-blocks"><thead><tr><th>From</th><th>To</th><th>Place</th><th>Doing</th><th>When</th><th>Days</th><th>Feasts</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="wodx-quiet">Now: ${esc(placeName(places, whereOf(actor)?.place))}${whereOf(actor)?.activity ? `, ${esc(R.ACTIVITIES[whereOf(actor).activity].toLowerCase())}` : ""}.</p></div>`;
    const data = await foundry.applications.api.DialogV2.wait({
      window: {title: `Routine: ${actor.name}`, resizable: true}, classes: ["wodx-dialog", "wodx-npc-dialog"], position: {width: 860, height: "auto"}, content,
      buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => new foundry.applications.ux.FormDataExtended(b.form).object},
        {action: "reset", label: "Back to the ready routine", callback: (ev, b) => ({...new foundry.applications.ux.FormDataExtended(b.form).object, reset: true})}, {action: "cancel", label: "Cancel"}],
      rejectClose: false
    });
    if ( !data || data === "cancel" ) return null;
    const out = {on: !!data.on, mode: data.mode || null, preset: data.preset || preset, age: R.AGES[data.age] ? data.age : null, roles: {}, blocks: null};
    for ( const k of Object.keys(R.ROLES) ) if ( data[`role-${k}`] ) out.roles[k] = data[`role-${k}`];
    if ( out.roles.domitor ) delete out.roles.domitor;
    if ( !data.reset && out.preset === preset && (out.age ?? "") === age ) {
      const typed = [];
      for ( let k = 0; data[`b${k}.place`] !== undefined; k++ ) {
        if ( !data[`b${k}.place`] ) continue;
        const days = String(data[`b${k}.days`] ?? "");
        typed.push({from: Number(data[`b${k}.from`]), to: Number(data[`b${k}.to`]), place: data[`b${k}.place`], activity: data[`b${k}.activity`],
          when: data[`b${k}.when`] || "any", days: days ? days.split(",").map(Number) : null, feast: data[`b${k}.feast`] || "any", label: String(data[`b${k}.label`] ?? "").trim()});
      }
      const bad = R.checkBlocks(typed);
      if ( bad.length ) { ui.notifications.error(`The routine was not saved. ${bad.slice(0, 3).join("; ")}.`); return null; }
      const same = JSON.stringify(typed.map(norm)) === JSON.stringify(R.presetBlocks(preset, out.age || R.ageOf(year)).map(norm));
      out.blocks = same ? null : typed;
    }
    await actor.update({[`flags.${MOD}.routine`]: out});
    if ( out.on ) await tick("walk");
    return out;
  }
  const norm = b => [b.from, b.to, b.place, b.activity, b.when ?? "any", (b.days ?? []).join(","), b.feast ?? "any", b.label ?? ""];

  /* ------------------------------------------------------------------ */
  /*  Hooks                                                              */
  /* ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ */
  /*  Fights that start by themselves (0.15.0, B808, B809)               */
  /* ------------------------------------------------------------------ */

  const fightMode = () => { try { return game.settings.get("wodx-combat", "fightStart"); } catch (e) { return "off"; } };
  const fightAuto = () => fightMode() === "auto" && !chron()?.rule?.("lightTouch");
  const attitudeApi = () => game.modules.get(MOD)?.api?.attitude ?? null;
  const inRunningFight = d => (game.combats?.contents ?? []).some(c => c.started && c.combatants.some(x => x.tokenId === d.id));
  const lastLook = new Map();
  const moveWait = new Map();

  /**
   * Where a token stands once its move is done: the document's place, not the token on screen, which is still
   * walking there while the move animates (0.15.1: the check ran mid-walk and saw the character still far off).
   */
  const restCentre = t => {
    const d = t.document, g = canvas.grid?.size ?? canvas.dimensions?.size ?? 100;
    return {x: d.x + (Number(d.width) || 1) * g / 2, y: d.y + (Number(d.height) || 1) * g / 2};
  };
  const restYards = (a, b) => {
    try { return canvas.grid.measurePath([restCentre(a), restCentre(b)]).distance / (1 / (C()?.auto?.toYards?.(1, canvas.scene?.grid?.units ?? "ft") ?? 1 / 3)); }
    catch (e) { return null; }
  };

  /** One NPC and one character: does the NPC want a fight, and does it see them? Starts it when both. Returns
   * the starter's answer, or {skip: why} (kept for the gate and for a Storyteller asking why nothing happened). */
  async function lookForFoe(nTok, pTok, {range, alarm, book}) {
    if ( !nTok?.actor || !pTok?.actor ) return {skip: "no token"};
    const att = attitudeApi()?.of?.(nTok.actor, pTok.actor);
    const want = FR.wantsFight(profileFor(nTok.actor), att?.step ?? 0, {alarm});
    if ( !want ) return {skip: `does not want a fight (attitude ${att?.step ?? "unknown"}, aggression ${profileFor(nTok.actor).aggression})`};
    if ( inRunningFight(nTok.document) && inRunningFight(pTok.document) ) return {skip: "already fighting"};
    const yards = restYards(nTok, pTok);
    if ( yards !== null && yards > range ) return {skip: `out of range (${Math.round(yards)} of ${range} yards)`};
    if ( sightBlocked(restCentre(nTok), restCentre(pTok)) ) return {skip: "out of sight"};
    const k = `${nTok.id}:${pTok.id}`, now = Date.now();
    const quiet = !sneaking(pTok.document) && !ctx.hiddenByObfuscate(pTok);
    if ( !quiet && lastLook.get(k) > now - FR.NOTICE_EVERY * 1000 ) return {skip: "looked a moment ago"};
    lastLook.set(k, now);
    const base = a => a?.isToken ? (a.baseActor ?? game.actors.get(a.id)) : a;
    const wa = base(nTok.actor), act = whereOf(wa)?.activity, intruder = pTok.actor;
    const ob = ctx.hiddenByObfuscate(pTok) ? Math.max(1, disc(intruder, "obfuscate")) : 0;
    const res = R.notice({perception: at(nTok.actor, "perception"), alertness: ab(nTok.actor, "alertness"), awareness: ab(nTok.actor, "awareness"),
      auspex: disc(nTok.actor, "auspex") || (profileFor(nTok.actor).template === "beast" ? 1 : 0), awake: act !== "sleep" || !routineOf(wa)?.on, inSight: true},
      {dexterity: at(intruder, "dexterity"), stealth: ab(intruder, "stealth"), manipulation: at(intruder, "manipulation"), subterfuge: ab(intruder, "subterfuge"), sneaking: sneaking(pTok.document), obfuscate: ob},
      {book, diff: AR.NOTICE_DIFF[alarm] ?? 6});
    if ( !res.noticed ) return {skip: `does not notice (${res.why})`};
    return C()?.fight?.start?.({scene: canvas.scene, tokens: [nTok.document, pTok.document], source: want.source,
      why: `${nTok.name} ${want.why}, and sees ${pTok.name} (${res.why})`});
  }

  /** Active Storyteller: a token moved on the scene being viewed. Hostile NPCs who see a character start a fight. */
  async function watchFoes(docLike) {
    const doc = docLike?.document ?? docLike;
    if ( !isActiveGM() || skipping() || fightMode() === "off" || doc?.parent?.id !== canvas.scene?.id ) return [{skip: "not checked here"}];
    const moved = canvas.tokens.get(doc.id);
    if ( !moved?.actor ) return [{skip: "no token"}];
    const scene = canvas.scene;
    let d = {};
    try { await loadCalendar(); d = describer()(game.time.worldTime) ?? {}; } catch (e) { d = {}; }
    const yardsSet = (() => { try { return game.settings.get("wodx-combat", "fightSightYards"); } catch (e) { return 30; } })();
    const range = FR.sightRange(yardsSet, !!d.isNight), alarm = alertLevel(scene), book = bookNow();
    const others = canvas.tokens.placeables.filter(t => t.actor && t.id !== moved.id).map(t => ({id: t.id, pc: !!t.actor.hasPlayerOwner, down: !!downState(t.actor), hidden: !!t.document.hidden}));
    if ( downState(moved.actor) ) return [{skip: "down"}];
    const out = [];
    for ( const p of FR.pairsFor({id: moved.id, pc: !!moved.actor.hasPlayerOwner}, others) ) {
      const r = await lookForFoe(canvas.tokens.get(p.npc), canvas.tokens.get(p.pc), {range, alarm, book});
      out.push({...p, range, ...(r?.skip ? {skip: r.skip} : {done: r?.done ?? null})});
      if ( r?.done === "started" || r?.done === "joined" || r?.done === "suggested" ) break;
    }
    return out;
  }
  /** A token's move ends after its animation: wait a moment, once per token. */
  function onTokenMoved(doc, changes) {
    if ( !isActiveGM() || !("x" in (changes ?? {}) || "y" in (changes ?? {})) ) return;
    clearTimeout(moveWait.get(doc.id));
    moveWait.set(doc.id, setTimeout(() => { moveWait.delete(doc.id); track(watchFoes(doc)).catch(e => console.error(`${MOD} | fight on sight`, e)); }, 900));
  }
  /** An NPC's attitude fell to Hostile while the character is in sight: a fight (a bystander only flees or calls). */
  async function onAttitude({npc, character, entry} = {}) {
    if ( !isActiveGM() || fightMode() === "off" || !npc || !character || !entry ) return null;
    const log = entry.log ?? [], last = log.at(-1);
    const before = last ? Number(last.step) - Number(last.delta || 0) : 0;
    if ( !FR.turnedHostile(before, entry.step) ) return null;
    const nTok = canvas.tokens?.placeables?.find(t => t.actor && !t.actor.hasPlayerOwner && (t.actor.id === npc.id || t.document.actorId === npc.id));
    const pTok = canvas.tokens?.placeables?.find(t => t.actor && (t.actor.id === character.id || t.document.actorId === character.id));
    if ( !nTok || !pTok || !(Number(profileFor(nTok.actor).aggression) >= FR.TIMID_BELOW) ) return null;
    const yardsSet = (() => { try { return game.settings.get("wodx-combat", "fightSightYards"); } catch (e) { return 30; } })();
    const yards = ctx.yardsBetween(nTok, pTok);
    if ( yards !== null && yards > yardsSet ) return null;
    if ( sightBlocked(nTok.center, pTok.center) ) return null;
    return C()?.fight?.start?.({scene: canvas.scene, tokens: [nTok.document, pTok.document], source: "attitude", why: `${nTok.name} turns hostile toward ${pTok.name}${last?.why ? ` (${last.why})` : ""}`});
  }

  function hooks() {
    Hooks.on("updateWorldTime", onWorldTime);
    Hooks.on("updateToken", onTokenMoved);
    Hooks.on("wodxAttitude", e => { track(onAttitude(e)).catch(err => console.error(`${MOD} | fight on attitude`, err)); });
    Hooks.on("wodxMapEvent", ev => { track(onMapEvent(ev)).catch(e => console.error(`${MOD} |`, e)); });
    Hooks.on("wodxSkipEnd", () => { if ( isActiveGM() && setting("routineMode") !== "off" ) track(tick("skip")).catch(e => console.error(`${MOD} |`, e)); if ( isActiveGM() ) track(checkAlerts()).catch(e => console.error(`${MOD} |`, e)); });
    Hooks.on("canvasReady", () => {
      if ( !isActiveGM() || setting("routineMode") === "off" ) return;
      const p = new Promise(r => setTimeout(r, 600)).then(() => tick("open"));
      track(p).catch(e => console.error(`${MOD} |`, e));
    });
    Hooks.on("createCombatant", c => { onCombatant(c).catch(e => console.error(`${MOD} |`, e)); });
    Hooks.on("combatStart", combat => { for ( const c of combat.combatants ) onCombatant(c).catch(e => console.error(`${MOD} |`, e)); });
    Hooks.on("deleteCombat", combat => { track(onCombatEnd(combat)).catch(e => console.error(`${MOD} |`, e)); });
    Hooks.on("renderChatMessageHTML", (msg, el) => {
      const fl = msg.flags?.[MOD];
      if ( !fl?.routine && !fl?.reaction && !fl?.alarmCard && !fl?.repairCard ) return;
      el.querySelectorAll("button.wnpc-m-undo").forEach(b => {
        if ( !game.user.isGM ) { b.remove(); return; }
        b.addEventListener("click", ev => { ev.preventDefault(); b.disabled = true; undoRepairCard(msg).catch(e => console.error(`${MOD} |`, e)); });
      });
      el.querySelectorAll("button.wnpc-a-undo").forEach(b => {
        if ( !game.user.isGM ) { b.remove(); return; }
        b.addEventListener("click", ev => { ev.preventDefault(); b.disabled = true; undoAlarmCard(msg).catch(e => console.error(`${MOD} |`, e)); });
      });
      el.querySelectorAll("button.wnpc-r-go, button.wnpc-r-undo, button.wnpc-x-go, button.wnpc-x-undo").forEach(b => {
        if ( !game.user.isGM ) { b.remove(); return; }
        b.addEventListener("click", ev => {
          ev.preventDefault(); b.disabled = true;
          const c = b.classList;
          const p = c.contains("wnpc-r-go") ? acceptRoutineCard(msg) : c.contains("wnpc-r-undo") ? undoRoutineCard(msg)
            : c.contains("wnpc-x-go") ? acceptReactionCard(msg, Number(b.dataset.k)) : undoReactionCard(msg);
          p.catch(e => console.error(`${MOD} |`, e)).finally(() => { b.disabled = false; });
        });
      });
    });
  }

  return {onTrigger, raiseAlarmFull, carryAlarm, deliverCarries, undoCarry, noteMark, repairMarks, undoRepairCard, raiseAlarm, alertOf, alertLevel, onMapEvent, checkAlerts, undoAlarmCard, syncZones, alertRules: AR, registerSettings, registerBehavior, hooks, tick, idle, planScene, listPlaces, routineOf, whereOf, blocksFor, routineNpcs, describer, loadCalendar,
    watchFoes, onAttitude, applyItems, undoSnap, acceptRoutineCard, undoRoutineCard, react, doReaction, acceptReactionCard, undoReactionCard, checkStays, matchOwners,
    editRoutine, openPlaces: () => PlacesAppClass().open(), PlacesAppClass, modeOf, downState, entranceOf, freeCellsIn, walkTo, reactionType, bookNow};
}
