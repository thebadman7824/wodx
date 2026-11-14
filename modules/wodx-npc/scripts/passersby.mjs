import * as PR from "./passerby-rules.mjs";
import * as CR from "./crowd-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";
import {PLACE_KINDS} from "./routine-rules.mjs";

/**
 * WoDX NPC 0.27.0 (B970 to B975): passers-by and animals on the map. passerby-rules.mjs has the rules.
 *
 * The Storyteller turns a scene on (token tools, "Passers-by"). The active Storyteller's client then keeps the street
 * filled to the size the year, the hour and the hunting ground call for. Every passer-by is an unlinked token of one
 * of two hidden actors (a person, an animal), so no actor is made per passer-by; its look, blood and state live on the
 * token alone, and the token is deleted when it walks off, when the scene is turned off or left, and at startup.
 * Movement is one batched update a tick, only on the scene the Storyteller is viewing, and stops for a fight, a pause
 * or a time skip. Token-moved listeners in other modules skip them through flags.wodx-npc.passerby.
 *
 * Simple routines: walk in from the edge, cross or stand a while, walk off; stop when a character comes close (people
 * only); follow a character when the Storyteller says so (into an alley, say); run off when a fight starts or the
 * Masquerade is breached. One that loses blood, is hurt or is led away is kept, and stays until let go.
 *
 * 0.40.0 (B2220 to B2226, crowd-rules.mjs): each person carries a feeling and a spark that wraiths and changelings
 * draw on through WoDX Actions, and on a large map they come and go by regions the Storyteller marks as doors.
 */
export function build({MOD, esc, isActiveGM, chron}) {
  const FOLDER = "WoDX passers-by";
  const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return undefined; } };
  const year = () => { try { return Number(chron()?.eras?.currentYear?.()) || 0; } catch (e) { return 0; } };
  const skipping = () => { try { return !!chron()?.isSkipping?.(); } catch (e) { return false; } };
  const flagOf = doc => doc?.flags?.[MOD]?.passerby ?? null;
  const isPB = doc => !!flagOf(doc);
  let cal = null, timer = null, busy = false, busySince = 0, ticks = 0, lastTick = null;
  const unset = path => { const Del = foundry.data?.operators?.ForcedDeletion; return Del ? {[path]: new Del()} : {[path.replace(/\.([^.]+)$/, ".-=$1")]: null}; };

  function registerSettings() {
    game.settings.register(MOD, "passersby", {name: "Passers-by", hint: "Scenes the Storyteller turns on (token tools, Passers-by) fill with people and animals of the year who walk through, stop a while and leave. Off clears them everywhere.",
      scope: "world", config: true, type: Boolean, default: true, onChange: v => { if ( !v ) clearAll().catch(e => console.error(`${MOD} | passers-by`, e)); }});
    game.settings.register(MOD, "passersbyMax", {name: "Passers-by: most on a scene", hint: "People and animals together. Fewer is lighter on slow machines.",
      scope: "world", config: true, type: Number, default: 8, range: {min: 0, max: PR.MAX_CAP, step: 1}});
    game.settings.register(MOD, "passersbyEvery", {name: "Passers-by: seconds between steps", hint: "How often they take a step. Longer is lighter on slow machines.",
      scope: "world", config: true, type: Number, default: 5, range: {min: 3, max: 20, step: 1}, onChange: () => start()});
    game.settings.register(MOD, "passersbyArt", {name: "Passers-by: picture for people", scope: "world", config: true, type: String, default: "icons/svg/mystery-man.svg", filePicker: "image"});
    game.settings.register(MOD, "passersbyAnimalArt", {name: "Passers-by: picture for animals", scope: "world", config: true, type: String, default: "icons/svg/pawprint.svg", filePicker: "image"});
  }

  /**
   * The scene's crowd setting: {on, density, animals, place}. place is the scene's own kind of place (flags.wodx-npc.place.kind,
   * the tag Interactables, Atmosphere and the Masquerade read), street when none is set.
   */
  const crowdOf = scene => {
    const c = scene?.getFlag?.(MOD, "crowd") ?? {};
    const kind = scene?.flags?.[MOD]?.place?.kind;
    return {on: !!c.on, density: c.density ?? "normal", animals: c.animals ?? true, place: PLACE_KINDS[kind] ? kind : "street", doors: Array.isArray(c.doors) ? c.doors : []};
  };

  /**
   * The doors passers-by use on this scene: regions ticked in the Passers-by window, and any region named for them
   * ("Passers-by", "Crowd door"). None: they use the edge of the map, as before.
   */
  function doorsOf(scene) {
    const ticked = new Set(crowdOf(scene).doors);
    const out = [];
    for ( const r of scene?.regions ?? [] ) {
      if ( !ticked.has(r.id) && !CR.DOOR_NAME.test(r.name ?? "") ) continue;
      const rects = (r.shapes ?? []).map(sh => CR.shapeBounds(sh?.toObject?.() ?? sh)).filter(Boolean);
      if ( !rects.length ) continue;
      const el = Number(r.elevation?.bottom);
      const test = p => { try { return !!r.testPoint({x: p.x, y: p.y, elevation: Number.isFinite(el) ? el : 0}); } catch (e) { return true; } };
      out.push({id: r.id, name: r.name, rects, test});
    }
    return out;
  }
  /** Where someone leaves from p: the nearest door when the scene has doors, else the nearest edge. */
  const exitFor = (scene, rect, p, g) => (doorsOf(scene).length ? CR.nearestDoor(doorsOf(scene), p) : null) ?? PR.nearestExit(rect, p, g / 2);
  const walkFor = (scene, rect, g) => CR.planDoorWalk(rect, doorsOf(scene)) ?? PR.planWalk(rect, {pad: g / 2});

  /* ---------------- The two hidden actors ---------------- */

  async function baseActor(kind) {
    const found = game.actors.find(a => a.getFlag(MOD, "passerbyBase") === kind);
    if ( found ) return found;
    let folder = game.folders.find(f => f.type === "Actor" && f.getFlag(MOD, "passersby"));
    folder ??= await Folder.create({name: FOLDER, type: "Actor", flags: {[MOD]: {passersby: true}}});
    const type = CONFIG.worldofdarkness?.sheettype?.mortal ?? "Mortal";
    const animal = kind === "animal";
    return Actor.create({name: animal ? "Passer-by (animal)" : "Passer-by", type, folder: folder.id,
      img: animal ? setting("passersbyAnimalArt") : setting("passersbyArt"),
      prototypeToken: {actorLink: false, disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL, displayName: CONST.TOKEN_DISPLAY_MODES.HOVER},
      system: {settings: {iscreated: false}, advantages: {bloodpool: {temporary: 10, max: 10}}},
      flags: {[MOD]: {passerbyBase: kind, behavior: {template: "civilian", noBarks: true}}}});
  }

  /* ---------------- Where and when ---------------- */

  async function now() {
    cal ??= await import("../../wodx-chronicle/scripts/calendar.mjs");
    const lat = (() => { try { return game.settings.get("wodx-chronicle", "latitude"); } catch (e) { return 50; } })();
    try { return cal.describeTime(game.time.worldTime, lat); } catch (e) { return {hour: 12, year: year()}; }
  }
  function streetOf(scene) {
    let here = null;
    try { here = game.modules.get("wodx-storyteller")?.api?.upkeep?.huntHere?.(scene) ?? null; } catch (e) { here = null; }
    return {area: PR.AREA_CROWD[here?.area] ? here.area : "market", sick: !!here?.outbreak};
  }
  /** 0.51.0 (B2671): the region the scene stands in (its own, else the homeland), for its way of life. */
  function regionOfScene(scene) {
    try { return chron()?.world?.here?.(scene)?.id ?? null; } catch (e) { return null; }
  }
  const rectOf = () => canvas.dimensions?.sceneRect ?? {x: 0, y: 0, width: canvas.dimensions?.width ?? 1000, height: canvas.dimensions?.height ?? 1000};
  const gridPx = scene => Number(scene?.grid?.size) || 100;
  const centerOf = (doc, g) => ({x: doc.x + (doc.width ?? 1) * g / 2, y: doc.y + (doc.height ?? 1) * g / 2});
  function blocked(a, b) {
    try { return !!CONFIG.Canvas.polygonBackends.move.testCollision(a, b, {type: "move", mode: "any"}); } catch (e) { return false; }
  }

  /* ---------------- Making and moving ---------------- */

  async function spawn(scene, {animal = false, time, street, place = "street"}) {
    const who = animal ? PR.makeAnimal({year: time.year || year(), hour: time.hour, area: street.area, place})
      : PR.makePasserby({year: time.year || year(), hour: time.hour, area: street.area, sick: street.sick, place, region: regionOfScene(scene)});
    if ( !who ) return null;
    const base = await baseActor(animal ? "animal" : "person");
    const g = gridPx(scene), rect = rectOf();
    const walk = walkFor(scene, rect, g);
    const pool = PR.VESSEL_POOL[animal ? who.vessel : "human"] ?? 10;
    const small = animal && ["rat", "bird", "cat"].includes(who.vessel);
    const size = small ? 0.5 : 1;
    // What they feel and how much dreaming is left in them, for wraiths and changelings (crowd-rules.mjs)
    const age = PR.ageOf(time.year || year()), crowdKey = PR.CROWD_OF_KIND[place] ?? place;
    const mind = animal ? {} : {feeling: CR.feelingFor({place: PR.PLACES[crowdKey] ? crowdKey : "street", cat: who.cat, band: PR.bandOf(time.hour), age, vesselState: who.vesselState}),
      spark: CR.sparkFor({age, cat: who.cat})};
    const flag = {kind: who.kind, tags: who.tags ?? [], animal, ...mind, vessel: animal ? who.vessel : "human", pool, waypoints: walk.waypoints, at: 0, wait: 0,
      blocked: 0, expires: Date.now() + 15 * 60 * 1000, made: Date.now()};
    const td = await base.getTokenDocument({name: who.name, x: walk.start.x - size * g / 2, y: walk.start.y - size * g / 2, width: size, height: size,
      actorLink: false, texture: {src: animal ? setting("passersbyAnimalArt") : setting("passersbyArt")},
      flags: {[MOD]: {passerby: flag}},
      delta: {system: {advantages: {bloodpool: {temporary: Math.max(1, Math.ceil(pool)), max: Math.max(1, Math.ceil(pool))}}},
        flags: {[MOD]: {stranger: who.name}, "wodx-actions": {vesselState: who.vesselState, drinks: who.drinks}}}});
    return td.toObject();
  }

  /**
   * One tick of the street on the scene being viewed. Returns "busy" when another tick is still running, "skip" when
   * this client does not run the street, else true. 0.40.1: a tick that has run longer than STALE_MS is taken as lost
   * (a Foundry call that never settled) and the next tick goes ahead; each tick gives up after TICK_MS.
   */
  async function tick() {
    if ( !isActiveGM() || !canvas?.ready ) return "skip";
    if ( busy && !PR.tickStale(busySince, Date.now()) ) return "busy";
    busy = true; busySince = Date.now();
    const mine = busySince;
    try {
      await PR.withTimeout(tickBody(), PR.TICK_MS);
      lastTick = {at: Date.now(), ok: true};
    } catch (e) {
      lastTick = {at: Date.now(), ok: false, error: e?.message ?? String(e)};
      console.error(`${MOD} | passers-by`, e);
    } finally { if ( busySince === mine ) busy = false; }
    return true;
  }
  /** For gates: is a tick running, since when, and how the last one ended. */
  const state = () => ({busy, busySince, lastTick});

  async function tickBody() {
    {
      ticks++;
      const scene = canvas.scene;
      if ( ticks % 12 === 1 ) await sweep({keep: scene?.id});
      if ( !scene ) return;
      const crowd = crowdOf(scene), mine = scene.tokens.filter(isPB);
      if ( !setting("passersby") || !crowd.on ) {
        const gone = mine.filter(t => !flagOf(t).kept).map(t => t.id);
        if ( gone.length ) await scene.deleteEmbeddedDocuments("Token", gone, {wodxPasserby: true});
        return;
      }
      if ( game.paused || skipping() ) return;
      const fight = game.combats?.some(c => c.started && c.scene?.id === scene.id);
      const g = gridPx(scene), rect = rectOf(), nowMs = Date.now();
      const pcs = scene.tokens.filter(t => t.actor?.hasPlayerOwner && !t.hidden).map(t => ({id: t.id, ...centerOf(t, g)}));
      const updates = [], deletes = [];
      for ( const doc of mine ) {
        let f = foundry.utils.deepClone(flagOf(doc));
        const me = centerOf(doc, g), half = (doc.width ?? 1) * g / 2;
        const bloodNow = Number(doc.actor?.system?.advantages?.bloodpool?.temporary);
        const used = doc.actor?.flags?.["wodx-actions"]?.crowdUse;
        f = PR.keepIf(f, {bloodLost: Number.isFinite(bloodNow) && bloodNow < Math.max(1, Math.ceil(f.pool)), following: !!f.follow,
          touched: used?.ravaged !== undefined && used?.ravaged !== null ? "ravaged" : used?.reverie ? "dreamer" : null});
        if ( PR.shouldRemove(f, {now: nowMs}) ) { deletes.push(doc.id); continue; }
        // In a fight they stand still, but what happened to them (fed on, hurt, Ravaged) is still saved (0.40.2)
        if ( fight && !f.fleeing ) { if ( !foundry.utils.objectsEqual(f, flagOf(doc)) ) updates.push({_id: doc.id, [`flags.${MOD}.passerby`]: f}); continue; }
        let dest = null, speed = (f.animal ? 1.2 : 1.5) * g;
        if ( f.follow ) {
          const leader = scene.tokens.get(f.follow);
          if ( !leader ) f.follow = null;
          else dest = PR.followSpot(me, centerOf(leader, g), g);
          speed = 2 * g;
        } else if ( f.kept && !f.fleeing ) {
          dest = null; // fed on, hurt or let stand: stays where it is
        } else if ( !f.fleeing && !f.animal && PR.holdsFor(me, pcs, 1.6 * g) ) {
          dest = null; // someone close: stops to be spoken to
        } else {
          const wp = f.waypoints?.[f.at];
          if ( !wp ) { deletes.push(doc.id); continue; }
          if ( f.wait > 0 ) { f.wait -= num(setting("passersbyEvery")) || 5; dest = null; }
          else dest = wp;
          if ( f.fleeing ) speed = 3 * g;
        }
        if ( dest ) {
          const step = PR.stepToward(me, dest, speed);
          if ( blocked(me, step) ) {
            f.blocked = (f.blocked ?? 0) + 1;
            if ( f.blocked >= 6 && !f.kept ) { deletes.push(doc.id); continue; }
            // Round the corner: a fresh way out from where it stands
            if ( !f.follow ) { const w = walkFor(scene, rect, g); f.waypoints = [exitFor(scene, rect, me, g), ...w.waypoints].slice(f.blocked % 2 ? 1 : 0); f.at = 0; }
          } else {
            f.blocked = 0;
            updates.push({_id: doc.id, x: Math.round(step.x - half), y: Math.round(step.y - half)});
            if ( step.arrived && !f.follow ) {
              const wp = f.waypoints[f.at];
              if ( wp?.exit ) { deletes.push(doc.id); continue; }
              f.wait = wp?.wait ?? 0; f.at++;
            }
          }
        }
        if ( !foundry.utils.objectsEqual(f, flagOf(doc)) ) {
          const u = updates.find(x => x._id === doc.id);
          if ( u ) u[`flags.${MOD}.passerby`] = f; else updates.push({_id: doc.id, [`flags.${MOD}.passerby`]: f});
        }
      }
      if ( deletes.length ) await scene.deleteEmbeddedDocuments("Token", deletes, {wodxPasserby: true});
      const live = updates.filter(u => !deletes.includes(u._id));
      if ( live.length ) await scene.updateEmbeddedDocuments("Token", live, {wodxPasserby: true});
      if ( fight ) return;
      // Fill the street, one person and one animal a tick at most
      const time = await now(), street = streetOf(scene), max = num(setting("passersbyMax"));
      const left = mine.filter(t => !deletes.includes(t.id) && !flagOf(t).kept && !flagOf(t).fleeing);
      const place = crowd.place;
      // B3321: the town's condition thins or fills the street
      let town = null;
      try { town = game.modules.get("wodx-storyteller")?.api?.upkeep?.towns?.ofScene?.(scene) ?? null; } catch (e) { town = null; }
      const people = Math.min(num(max) > 0 ? num(max) : PR.MAX_CAP, Math.round(PR.crowdSize({year: time.year || year(), hour: time.hour, area: street.area, density: crowd.density, max, place}) * PR.townCrowd(town)));
      const beasts = crowd.animals ? PR.animalCount({year: time.year || year(), hour: time.hour, area: street.area, density: crowd.density, max, people, place}) : 0;
      const nP = left.filter(t => !flagOf(t).animal).length, nA = left.filter(t => flagOf(t).animal).length;
      const make = [];
      if ( nP < people ) make.push(await spawn(scene, {time, street, place}));
      if ( nA < beasts ) make.push(await spawn(scene, {animal: true, time, street, place}));
      if ( make.filter(Boolean).length ) await scene.createEmbeddedDocuments("Token", make.filter(Boolean), {wodxPasserby: true});
    }
  }
  const num = v => Number(v) || 0;

  /** Clear passers-by from every scene but the one in view (and on startup, all but the kept). */
  async function sweep({keep = null, startup = false} = {}) {
    if ( !isActiveGM() ) return 0;
    let n = 0;
    for ( const scene of game.scenes ) {
      const live = !startup && scene.id === keep && setting("passersby") && crowdOf(scene).on;
      const gone = scene.tokens.filter(t => isPB(t) && PR.shouldRemove(flagOf(t), {live, startup})).map(t => t.id);
      if ( gone.length ) { await scene.deleteEmbeddedDocuments("Token", gone, {wodxPasserby: true}); n += gone.length; }
    }
    return n;
  }
  async function clearAll({kept = false} = {}) {
    if ( !game.user.isGM ) return 0;
    let n = 0;
    for ( const scene of game.scenes ) {
      const gone = scene.tokens.filter(t => isPB(t) && (kept || !flagOf(t).kept)).map(t => t.id);
      if ( gone.length ) { await scene.deleteEmbeddedDocuments("Token", gone, {wodxPasserby: true}); n += gone.length; }
    }
    return n;
  }

  /** Everyone not kept on the scene runs for the nearest edge (a fight, a breach). */
  async function scatter(scene, {except = []} = {}) {
    if ( !isActiveGM() || !scene ) return 0;
    const g = gridPx(scene), rect = scene.id === canvas.scene?.id ? rectOf() : {x: 0, y: 0, width: scene.width, height: scene.height};
    const ups = scene.tokens.filter(t => isPB(t) && !except.includes(t.id) && !(flagOf(t).kept && flagOf(t).why === "fed"))
      .map(t => ({_id: t.id, [`flags.${MOD}.passerby`]: {...flagOf(t), fleeing: true, follow: null, kept: false, waypoints: [exitFor(scene, rect, centerOf(t, g), g)], at: 0, wait: 0}}));
    if ( ups.length ) await scene.updateEmbeddedDocuments("Token", ups, {wodxPasserby: true});
    return ups.length;
  }

  /* ---------------- The Storyteller's hand ---------------- */

  async function setFlag(doc, patch) {
    const f = flagOf(doc);
    if ( !f || !game.user.isGM ) return null;
    return doc.update({[`flags.${MOD}.passerby`]: {...f, ...patch}}, {wodxPasserby: true});
  }
  /** Follow the nearest character (or the one given), e.g. into an alley. */
  async function follow(doc, leaderId = null) {
    const g = gridPx(doc.parent), me = centerOf(doc, g);
    const pcs = doc.parent.tokens.filter(t => t.actor?.hasPlayerOwner);
    const lead = leaderId ? doc.parent.tokens.get(leaderId) : pcs.sort((a, b) => Math.hypot(centerOf(a, g).x - me.x, centerOf(a, g).y - me.y) - Math.hypot(centerOf(b, g).x - me.x, centerOf(b, g).y - me.y))[0];
    if ( !lead ) { ui.notifications.warn("No character on this scene to follow."); return null; }
    return setFlag(doc, {follow: lead.id, kept: true, keptAt: Date.now(), why: "led"});
  }
  const hold = doc => setFlag(doc, {kept: true, keptAt: Date.now(), why: "held", follow: null});
  async function letGo(doc) {
    const rect = rectOf(), g = gridPx(doc.parent);
    return setFlag(doc, {kept: false, follow: null, fleeing: false, why: null, waypoints: [exitFor(doc.parent, rect, centerOf(doc, g), g)], at: 0, wait: 0, expires: Date.now() + 5 * 60 * 1000});
  }
  /** Keep for good: a real NPC of its own, out of the passers-by. */
  async function keepForGood(doc) {
    if ( !game.user.isGM || !doc.actor ) return null;
    const data = doc.actor.toObject();
    delete data._id;
    data.name = doc.name;
    data.folder = null;
    if ( data.flags?.[MOD] ) delete data.flags[MOD].passerbyBase;
    data.prototypeToken = {...(data.prototypeToken ?? {}), actorLink: true, name: doc.name};
    const actor = await Actor.create(data);
    await doc.update({actorId: actor.id, actorLink: true, ...unset(`flags.${MOD}.passerby`)}, {wodxPasserby: true});
    ui.notifications.info(`${doc.name} is an NPC of their own now, in the Actors list.`);
    return actor;
  }

  async function openCrowd(scene = canvas.scene) {
    if ( !game.user.isGM || !scene ) return null;
    const c = crowdOf(scene), time = await now(), street = streetOf(scene);
    const max = num(setting("passersbyMax"));
    const people = PR.crowdSize({year: time.year || year(), hour: time.hour, area: street.area, density: c.density, max, place: c.place});
    const opt = (v, l, s) => `<option value="${v}"${s ? " selected" : ""}>${esc(l)}</option>`;
    const regions = [...(scene.regions ?? [])];
    const doorRows = regions.map(r => `<label class="wnpc-door"><input type="checkbox" name="door-${r.id}"${c.doors.includes(r.id) || CR.DOOR_NAME.test(r.name ?? "") ? " checked" : ""}${CR.DOOR_NAME.test(r.name ?? "") ? " disabled" : ""}> ${esc(r.name || "Unnamed region")}</label>`).join("");
    const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 460}, window: {title: `Passers-by: ${scene.navName || scene.name}`}, classes: ["wodx-dialog", "wnpc-crowd"],
      content: `<div class="form-group"><label>People and animals on this scene</label><input type="checkbox" name="on"${c.on ? " checked" : ""}></div>
        <div class="form-group"><label>Kind of place (the scene's place tag)</label><select name="place" data-fixed>${Object.keys(PLACE_KINDS).map(k => opt(k, PLACE_KINDS[k], k === c.place)).join("")}</select></div>
        <div class="form-group"><label>How busy</label><select name="density" data-fixed>${Object.entries(PR.DENSITY).map(([k, d]) => opt(k, d.label, k === c.density)).join("")}</select></div>
        <div class="form-group"><label>Animals too</label><input type="checkbox" name="animals"${c.animals ? " checked" : ""}></div>
        <fieldset><legend>Doors on a large map</legend><p class="hint">Regions they walk in from and out by, instead of the edge of the map. A region named "Passers-by" or "Crowd door" always counts. None ticked: the edge of the map.</p>
          ${regions.length > 6 ? searchBox(".wnpc-door-list", "Search regions…", "Search regions") : ""}<div class="wnpc-door-list">${doorRows || "<p>No regions on this scene.</p>"}</div></fieldset>
        <p class="hint">${esc(PR.AGES[PR.ageOf(time.year || year())].label)}, ${esc(time.timeLabel ?? "")}: about ${people} ${people === 1 ? "person" : "people"} in this ${esc(PR.placeOf(c.place).label.toLowerCase())} (${esc(street.area)} hunting ground) at this hour, at most ${max} with the animals. Set the hunting ground in WoDX Storyteller's hunting grounds.${setting("passersby") ? "" : " Passers-by are off in the module settings."}</p>`,
      buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => ({...Object.fromEntries(new FormData(b.form)), action: "save",
        doors: [...b.form.querySelectorAll("input[name^='door-']:checked:not(:disabled)")].map(i => i.name.slice(5))})},
        {action: "clear", label: "Clear them now", callback: () => ({action: "clear"})}, {action: "cancel", label: "Cancel"}]});
    if ( !res || res.action === "cancel" ) return null;
    if ( res.action === "clear" ) return scene.deleteEmbeddedDocuments("Token", scene.tokens.filter(isPB).map(t => t.id), {wodxPasserby: true});
    const kind = PLACE_KINDS[res.place] ? res.place : "street";
    return scene.update({[`flags.${MOD}.crowd`]: {on: !!res.on, density: PR.DENSITY[res.density] ? res.density : "normal", animals: !!res.animals,
      doors: (res.doors ?? []).filter(id => scene.regions?.get?.(id))},
      [`flags.${MOD}.place.kind`]: kind});
  }

  function hudButtons(hud, col) {
    const doc = hud.object?.document;
    if ( !isPB(doc) ) return;
    const f = flagOf(doc);
    const add = (icon, title, fn) => {
      const b = document.createElement("div");
      b.className = "control-icon wnpc-hud"; b.title = title; b.innerHTML = `<i class="fa-solid ${icon}"></i>`;
      b.addEventListener("click", () => fn(doc).catch(e => console.error(`${MOD} | passers-by`, e)));
      col.appendChild(b);
    };
    add("fa-person-walking-arrow-right", f.follow ? "Passer-by: following. Click to let go" : "Passer-by: follow the nearest character (into an alley, say)", d => (flagOf(d).follow ? letGo(d) : follow(d)));
    add(f.kept ? "fa-person-walking" : "fa-hand", f.kept ? "Passer-by: kept here. Click to let them go on their way" : "Passer-by: hold here", d => (flagOf(d).kept ? letGo(d) : hold(d)));
    add("fa-user-plus", "Passer-by: keep for good, as an NPC of their own", keepForGood);
  }

  function start() {
    clearInterval(timer);
    timer = setInterval(() => { tick(); }, 1000 * Math.max(3, num(setting("passersbyEvery")) || 5));
  }

  function hooks() {
    Hooks.once("ready", () => { if ( isActiveGM() ) sweep({startup: true}).catch(e => console.error(`${MOD} | passers-by`, e)); start(); });
    Hooks.on("canvasReady", () => { if ( isActiveGM() ) sweep({keep: canvas.scene?.id}).catch(e => console.error(`${MOD} | passers-by`, e)); });
    Hooks.on("wodxFightStarted", ({combat, tokens} = {}) => { scatter(combat?.scene ?? canvas.scene, {except: tokens ?? []}).catch(e => console.error(`${MOD} | passers-by`, e)); });
    Hooks.on("wodxBreach", () => { scatter(canvas.scene).catch(e => console.error(`${MOD} | passers-by`, e)); });
    Hooks.on("wodxDamageApplied", actor => {
      const doc = actor?.isToken ? actor.token : null;
      if ( isActiveGM() && isPB(doc) && !flagOf(doc).kept ) setFlag(doc, {kept: true, keptAt: Date.now(), why: "hurt"}).catch(() => null);
    });
  }

  /** One passer-by (or animal) on the scene now, whatever the hour: for gates and the Storyteller's macros. */
  async function spawnOne(scene = canvas.scene, {animal = false} = {}) {
    if ( !game.user.isGM || !scene ) return null;
    const td = await spawn(scene, {animal, time: await now(), street: streetOf(scene), place: crowdOf(scene).place});
    if ( !td ) return null;
    const [doc] = await scene.createEmbeddedDocuments("Token", [td], {wodxPasserby: true});
    return doc ?? null;
  }

  /** What a passer-by token carries for the crowd rules: {feeling, spark, kind} or null for anyone else. */
  const mindOf = doc => { const f = flagOf(doc?.document ?? doc); return f && !f.animal ? {feeling: f.feeling ?? null, spark: Number.isFinite(f.spark) ? f.spark : null, kind: f.kind} : null; };

  return {registerSettings, hooks, tick, sweep, clearAll, scatter, follow, hold, letGo, keepForGood, openCrowd, hudButtons, crowdOf, doorsOf, mindOf, spawnOne, state, rules: CR, isPasserby: isPB, baseActor};
}
