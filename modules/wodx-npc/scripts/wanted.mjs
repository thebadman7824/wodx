/**
 * WoDX NPC 0.41.0: a description that spreads and fades (wanted-rules.mjs has the rules; B1823-B1827).
 *
 *   Written   when WoDX Actions records a breach with witnesses (hook wodxBreach), when WoDX Interactables reports a
 *             theft, break-in, fire, desecration or fight that someone on the map sees (wodxMapEvent), and when a
 *             fight ends with survivors or onlookers in sight. The words come from WoDX Library's look.
 *   Spreads   heard at once where it happened, carried on by that place's Alert zones (bell, telephone, radio or
 *             runner, as the alarm is), and in the rest of town after the hours the year's means take.
 *   Tested    when a player character moves where word has reached, NPCs there who see them test the description
 *             against how they look now. The Storyteller gets a card with the roll and a button to raise the alarm.
 *   Stored    world setting wodx-npc.descriptions: [{id, of, ofName, named, cause, what, text, marks, at, scene,
 *             sceneName, means, heard: {sceneUuid: at}, townAt, witnesses, dropped}].
 * Everything is the active Storyteller's; players never see a description or a test.
 */
import * as W from "./wanted-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

export function build(ctx) {
  const {MOD, esc, gmIds, isActiveGM, chron, routines, profileFor, attitude, servesOf, isPasserby, isAnimal = () => false} = ctx;
  const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };
  const on = () => setting("culpritDescriptions") !== false;
  const now = () => game.time?.worldTime ?? 0;
  const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 0; } catch (e) { return 0; } };
  const lookApi = () => game.modules.get("wodx-library")?.active ? game.modules.get("wodx-library").api?.look ?? null : null;
  const worldActor = a => (a?.isToken ? (a.baseActor ?? game.actors.get(a.id)) : a);
  const isRealm = scene => { const l = scene?.flags?.["wodx-otherworlds"]?.layer; return !!l && l !== "physical"; };
  const list = () => { const v = setting("descriptions"); return Array.isArray(v) ? v.map(W.normDesc) : []; };
  async function save(next) { await game.settings.set(MOD, "descriptions", W.prune(next, now())); }

  function registerSettings() {
    game.settings.register(MOD, "culpritDescriptions", {name: "Descriptions that spread", hint: "When a breach, a fight or a crime has witnesses, WoDX writes down what they saw of the culprit. Word spreads by the means of the year and fades; NPCs who have heard it may know the culprit again. Storyteller cards only.",
      scope: "world", config: true, type: Boolean, default: true});
    game.settings.register(MOD, "descriptions", {scope: "world", config: false, type: Array, default: []});
  }

  /** Is this actor someone a description is written for: a player character, or an NPC who serves one? */
  const culpritOk = a => !!a && (a.hasPlayerOwner || (servesOf?.(a) ?? []).length > 0);

  /** Does any witness know the culprit by name (has met them)? */
  function namedBy(witnesses, culprit) {
    for ( const w of witnesses ) { try { if ( attitude?.()?.of?.(w, culprit)?.met ) return true; } catch (e) { /* not met */ } }
    return false;
  }

  /** The minutes a runner takes to a place: its own travel figure, else WoDX Storyteller's setting. */
  const tripMinutes = sc => {
    const own = Number(sc?.flags?.["wodx-storyteller"]?.travel?.minutes);
    if ( own > 0 ) return own;
    try { return Number(game.settings.get("wodx-storyteller", "travelMinutes")) || 30; } catch (e) { return 30; }
  };
  /** Where this place's Alert zones carry word, and when it gets there (the alarm's own carriers). */
  function arrivalsFrom(scene, at) {
    const out = [], AR = routines?.alertRules;
    if ( !scene || !AR ) return out;
    for ( const r of scene.regions ?? [] ) for ( const b of r.behaviors ?? [] ) {
      if ( b.type !== `${MOD}.alertZone` ) continue;
      if ( b.disabled || !b.system?.carryTo ) continue;
      for ( const to of AR.carryTargets(b.system.carryTo, game.scenes?.contents ?? [...(game.scenes ?? [])], scene.id) ) {
        const plan = AR.carryPlan(b.system.carrier, {year: yearNow(), minutes: b.system.minutes, tripMinutes: tripMinutes(to)});
        if ( plan.ok ) out.push({scene: to.uuid, at: at + plan.seconds});
      }
    }
    return out;
  }

  /**
   * Active Storyteller: write (or freshen) a description of culprit, seen by witnesses (actors), at scene.
   * Returns the description, or null when there is nothing to write.
   */
  /* NPC 0.61.0 (B2914): dress of a part of the world */
  const W_ = () => chron()?.world ?? null;
  /** The region an actor dresses for: their own choice, else the chronicle's homeland. */
  const dressOf = actor => { const own = actor?.flags?.[MOD]?.dressedAs; if ( own ) return own; try { return W_()?.homeland?.() ?? null; } catch (e) { return null; } };
  const partOf = id => { try { return id ? (W_()?.regionOf?.(id)?.part ?? null) : null; } catch (e) { return null; } };
  /** Is the actor dressed as a stranger on this scene? */
  function foreignAt(actor, scene = canvas?.scene) {
    if ( !actor || !scene ) return false;
    let here = null;
    try { here = W_()?.here?.(scene)?.part ?? null; } catch (e) { here = null; }
    return W.isForeign(partOf(dressOf(actor)), here);
  }
  /** Difficulty added to blending into a crowd here (Stealth or Subterfuge). */
  const blendDiff = (actor, scene = canvas?.scene) => (foreignAt(actor, scene) ? W.FOREIGN_BLEND_DIFF : 0);
  async function setDress(actor, regionId) {
    if ( !actor?.isOwner ) return null;
    return regionId ? actor.setFlag(MOD, "dressedAs", String(regionId)) : actor.unsetFlag(MOD, "dressedAs");
  }
  /** GM or owner: dress the selected characters for a part of the world (the scene's own by default). */
  async function dressDialog() {
    const actors = (canvas?.tokens?.controlled ?? []).map(t => t.actor).filter(a => a?.isOwner);
    if ( !actors.length ) return ui.notifications.info("Select the characters to dress first.");
    const regions = W_()?.regions ?? {}, here = (() => { try { return W_()?.here?.(canvas.scene)?.id ?? ""; } catch (e) { return ""; } })();
    const opts = Object.entries(regions).sort((x, y) => String(x[1].label).localeCompare(String(y[1].label)))
      .map(([id, r]) => `<option value="${esc(id)}"${id === here ? " selected" : ""}>${esc(r.label)}</option>`).join("");
    const pick = await foundry.applications.api.DialogV2.prompt({window: {title: "Dress for a part of the world"}, classes: ["wodx-dialog"], rejectClose: false,
      content: `<p>${esc(actors.map(a => a.name).join(", "))}. Someone dressed as a stranger to the part of the world they stand in is noticed: blending into a crowd is one harder, and witnesses remember them longer.</p>
        <div class="form-group"><label>Dressed as someone from</label><select name="region">${opts}</select></div>`,
      ok: {label: "Dress", callback: (ev, b) => b.form.elements.region.value}});
    if ( !pick ) return null;
    for ( const a of actors ) await setDress(a, pick);
    return pick;
  }

  async function write(culpritLike, witnessesLike = [], {scene = canvas?.scene, cause = "crime", what = "", token = null} = {}) {
    if ( !isActiveGM() || !on() ) return null;
    const culprit = worldActor(culpritLike?.actor ?? culpritLike);
    const witnesses = [...new Set((witnessesLike ?? []).map(w => worldActor(w?.actor ?? w)).filter(w => w && w.id !== culprit?.id && !w.hasPlayerOwner))];
    if ( !culpritOk(culprit) || !witnesses.length || !scene ) return null;
    const L = lookApi();
    const tok = token ?? scene.tokens?.find?.(t => t.actorId === culprit.id) ?? null;
    const seen = L?.describe?.(tok?.actor ?? culprit, {token: tok}) ?? null;
    const at = now();
    let desc = W.writeDesc({id: foundry.utils.randomID(), of: culprit.id, ofName: culprit.name, named: namedBy(witnesses, culprit), cause, what,
      marks: {...(seen?.marks ?? {}), foreign: foreignAt(culprit, scene)}, text: seen?.text || "someone they could not describe well", at, scene: scene.uuid, sceneName: scene.name, year: yearNow(),
      witnesses: witnesses.map(w => w.name)});
    desc = W.carried(desc, arrivalsFrom(scene, at));
    const all = list(), old = W.sameAs(all, {of: culprit.id, scene: scene.uuid, at});
    if ( old ) desc = W.merge(old, desc);
    await save([...all.filter(d => d.id !== old?.id), desc]);
    await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), flags: {[MOD]: {wanted: {id: desc.id}}},
      content: `<div class="wodx-card wnpc-wanted"><p><b>${old ? "Word freshens" : "Word goes round"}:</b> ${esc(desc.witnesses.join(", "))} saw ${esc(desc.named ? culprit.name : "someone")} ${esc(W.summary(desc, at).replace(/;.*$/, ""))}.</p>
        <p><i>${esc(desc.text.charAt(0).toUpperCase() + desc.text.slice(1))}.</i></p>
        <p class="wodx-quiet">${esc(culprit.name)} (only you see this). Heard here now${Object.keys(desc.heard).length > 1 ? `, carried to ${Object.keys(desc.heard).length - 1} more place(s)` : ""}, and in the rest of town in ${W.meansOf(desc.means).town} hour(s). It fades over ${W.meansOf(desc.means).fade} days. Changing clothes or a disguise breaks the match${W.meansOf(desc.means).face === "none" ? "" : ", less well in this age"}.</p>
        <button type="button" data-action="wnpc-wanted-drop">Drop it</button> <button type="button" data-action="wnpc-wanted-list">Descriptions abroad</button></div>`});
    return desc;
  }

  async function drop(id) {
    if ( !game.user.isGM ) return false;
    const all = list();
    if ( !all.some(d => d.id === id) ) return false;
    await save(all.filter(d => d.id !== id));
    return true;
  }
  async function spreadNow(id) {
    if ( !game.user.isGM ) return false;
    await save(list().map(d => (d.id === id ? W.normDesc({...d, townAt: Math.min(d.townAt ?? now(), now())}) : d)));
    return true;
  }

  /* ---------------- When it is written ---------------- */

  async function onBreach({entry, by} = {}) {
    if ( !isActiveGM() || !on() || !by?.uuid ) return null;
    const culprit = worldActor(fromUuidSync?.(by.uuid));
    const witnesses = (entry?.witnesses ?? []).filter(w => w?.state !== "forgot").map(w => fromUuidSync?.(w.uuid)).filter(Boolean);
    const scene = culprit?.getActiveTokens?.()[0]?.document?.parent ?? canvas?.scene;
    return write(culprit, witnesses, {scene, cause: "breach", what: String(entry?.event ?? "")});
  }

  /** The tokens on the viewed scene that see this one (WoDX NPC's noticing roll), passers-by included. */
  async function seers(iTok, {except = new Set(), max = 8} = {}) {
    const out = [];
    for ( const t of canvas?.tokens?.placeables ?? [] ) {
      if ( out.length >= max ) break;
      if ( !t.actor || t.id === iTok.id || t.document.hidden || t.actor.hasPlayerOwner || except.has(t.id) || routines?.downState?.(t.actor) ) continue;
      const seen = await routines?.noticeBy?.(t, iTok) ?? {noticed: false};
      if ( seen.noticed ) out.push(t.actor);
    }
    return out;
  }

  async function onMapEvent(ev = {}) {
    if ( !isActiveGM() || !on() || ev.undone || !W.CRIME_EVENTS.has(ev.kind) || !ev.who ) return null;
    const doc = fromUuidSync?.(ev.who);
    if ( !doc || doc.parent?.id !== canvas?.scene?.id ) return null;
    const iTok = canvas.tokens.get(doc.id);
    if ( !iTok?.actor || !culpritOk(worldActor(iTok.actor)) ) return null;
    const witnesses = await seers(iTok);
    return write(iTok.actor, witnesses, {scene: canvas.scene, cause: ev.kind === "fight" ? "fight" : ev.kind, what: ev.objectName ?? "", token: doc});
  }

  async function onCombatEnd(combat) {
    if ( !isActiveGM() || !on() || !combat?.started || combat.scene?.id !== canvas?.scene?.id ) return [];
    const inFight = new Set((combat.combatants?.contents ?? []).map(c => c.tokenId));
    const out = [];
    for ( const c of combat.combatants?.contents ?? [] ) {
      const iTok = canvas.tokens.get(c.tokenId);
      if ( !iTok?.actor?.hasPlayerOwner ) continue;
      // Foes who live through it, and onlookers who see them
      const foes = (combat.combatants?.contents ?? []).filter(o => o.tokenId !== c.tokenId && o.token?.disposition === -1 && !o.actor?.hasPlayerOwner && !routines?.downState?.(o.actor)).map(o => o.actor);
      const onlookers = await seers(iTok, {except: inFight});
      const d = await write(iTok.actor, [...foes, ...onlookers], {scene: canvas.scene, cause: "fight", token: iTok.document});
      if ( d ) out.push(d);
    }
    return out;
  }

  /* ---------------- When it is tested ---------------- */

  const lastTest = new Map();
  const TEST_EVERY = 60 * 1000;
  /**
   * Active Storyteller: a player character moved. NPCs here who have heard a description of them, and see them, may
   * know them. Returns one entry per NPC looked at: {npc, level, desc} for a card posted, {npc, skip} for why not, or a
   * single {skip} when nobody was looked at (NPC 0.41.1, so a gate can tell which check stopped it).
   */
  async function test(doc, {force = false} = {}) {
    const scene = doc?.parent;
    if ( !isActiveGM() ) return [{skip: "not the active Storyteller"}];
    if ( !on() ) return [{skip: "descriptions are off"}];
    if ( scene?.id !== canvas?.scene?.id ) return [{skip: "not the scene in view"}];
    if ( !doc.actor?.hasPlayerOwner ) return [{skip: "not a player character"}];
    const culprit = worldActor(doc.actor), t0 = now();
    const mine = W.of(list(), culprit.id, t0).filter(d => W.heardAt(d, scene.uuid, t0, {realm: isRealm(scene)}) !== null);
    if ( !mine.length ) return [{skip: "no description of them heard here"}];
    const iTok = canvas.tokens.get(doc.id);
    if ( !iTok ) return [{skip: "no token on the canvas"}];
    const L = lookApi(), out = [];
    let posted = 0;
    for ( const t of canvas.tokens.placeables ) {
      if ( posted >= 4 ) break;
      const a = t.actor;
      if ( !a || a.hasPlayerOwner || t.document.hidden || t.id === doc.id || routines?.downState?.(a) ) continue;
      if ( (servesOf?.(a) ?? []).includes(culprit.id) ) { out.push({npc: t.id, skip: "serves them"}); continue; }
      let tpl = null;
      try { tpl = profileFor?.(a, {phases: false})?.template ?? null; } catch (e) { tpl = null; }
      if ( !W.tests(tpl, {animal: !!isAnimal(tpl)}) && !isPasserby?.(t.document) ) { out.push({npc: t.id, skip: `a ${tpl ?? "creature"} pays no heed to talk`}); continue; }
      const k = `${t.id}:${doc.id}`;
      if ( !force && (lastTest.get(k) ?? 0) > Date.now() - TEST_EVERY ) { out.push({npc: t.id, skip: "tested in the last minute"}); continue; }
      lastTest.set(k, Date.now());
      const held = !!culprit.flags?.["wodx-actions"]?.disguise?.[worldActor(a)?.id]?.held;
      const nowMarks = {...(L?.describe?.(doc.actor, {token: doc})?.marks ?? {}), foreign: foreignAt(doc.actor, scene)};
      const best = mine.map(d => ({d, m: W.matchOf(d, nowMarks, {held}), s: W.strength(d, t0)})).filter(x => x.m.level !== "none")
        .sort((x, y) => (x.m.level === y.m.level ? y.s - x.s : x.m.level === "strong" ? -1 : 1))[0];
      if ( !best ) { out.push({npc: t.id, skip: "no match: they look different now"}); continue; }
      const seen = await routines?.noticeBy?.(t, iTok) ?? {noticed: false};
      if ( !seen.noticed ) { out.push({npc: t.id, skip: `did not notice them (${seen.why ?? "no roll"})`}); continue; }
      const roll = W.recogniseRoll(best.m.level, best.s);
      out.push({npc: t.id, level: best.m.level, desc: best.d.id});
      posted++;
      await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), flags: {[MOD]: {wantedTest: {scene: scene.uuid, culprit: culprit.id, npc: a.name}}},
        content: `<div class="wodx-card wnpc-wanted"><p><b>${esc(t.name)}</b> may know <b>${esc(culprit.name)}</b> from word going round ${esc(W.summary(best.d, t0))}.</p>
          <p><i>${esc(best.d.text.charAt(0).toUpperCase() + best.d.text.slice(1))}.</i></p>
          <p>A ${best.m.level} match: ${esc(best.m.why)}. Roll ${esc(roll.text)} for ${esc(t.name)}.</p>
          <p class="wodx-quiet">Only you see this. On a success they know them: they may call the watch, follow, or keep it to themselves.</p>
          <button type="button" data-action="wnpc-wanted-alarm">Raise the alarm here</button></div>`});
    }
    return out;
  }

  /* ---------------- The Storyteller's list ---------------- */

  function listHtml() {
    const t0 = now(), all = W.prune(list(), t0).reverse();
    const rows = all.map(d => {
      const where = Object.keys(d.heard).map(u => fromUuidSync?.(u)?.name).filter(Boolean);
      const s = Math.round(W.strength(d, t0) * 100);
      return `<div class="wnpc-wanted-row" data-search-item data-id="${esc(d.id)}"><p><b>${esc(d.ofName)}</b>${d.named ? " (by name)" : ""}: ${esc(W.summary(d, t0))}. ${s}% remembered.</p>
        <p><i>${esc(d.text)}</i></p><p class="wodx-quiet">Heard at ${esc(where.join(", ") || "the place")}${d.townAt !== null && d.townAt <= t0 ? ", and all over town" : d.townAt !== null ? "; the rest of town hears soon" : ""}. Seen by ${esc(d.witnesses.join(", "))}.</p>
        <button type="button" data-act="spread">The whole town hears now</button> <button type="button" data-act="drop">Drop it</button></div>`;
    }).join("");
    return `<div class="wnpc-wanted-list">${all.length > 5 ? searchBox(".wnpc-wanted-rows", "Search descriptions…", "Search descriptions") : ""}
      <div class="wnpc-wanted-rows">${rows || "<p>No description of anyone is going round.</p>"}</div>
      <p class="wodx-quiet">Word of a culprit by the means of the year: ${esc(W.meansAt(yearNow()).label)}. A description fades as people forget; dropping one ends it at once.</p></div>`;
  }
  async function openList() {
    if ( !game.user.isGM ) return null;
    const D = foundry.applications.api.DialogV2;
    const dlg = new D({window: {title: "Descriptions abroad", icon: "fa-solid fa-person-circle-question", resizable: true}, classes: ["wodx-dialog", "wodx-npc-dialog", "wnpc-wanted-dialog"],
      position: {width: 560, height: "auto"}, content: listHtml(), buttons: [{action: "close", label: "Close", default: true}], rejectClose: false});
    await dlg.render(true);
    dlg.element?.addEventListener("click", async ev => {
      const b = ev.target.closest("[data-act]");
      if ( !b ) return;
      ev.preventDefault();
      const id = b.closest("[data-id]")?.dataset.id;
      if ( b.dataset.act === "drop" ) await drop(id);
      if ( b.dataset.act === "spread" ) await spreadNow(id);
      const box = dlg.element.querySelector(".wnpc-wanted-list");
      if ( box ) box.outerHTML = listHtml();
    });
    return dlg;
  }

  function hooks() {
    Hooks.on("wodxBreach", p => { onBreach(p).catch(e => console.error(`${MOD} | descriptions`, e)); });
    Hooks.on("wodxMapEvent", ev => { onMapEvent(ev).catch(e => console.error(`${MOD} | descriptions`, e)); });
    Hooks.on("deleteCombat", c => { onCombatEnd(c).catch(e => console.error(`${MOD} | descriptions`, e)); });
    const wait = new Map();
    Hooks.on("updateToken", (doc, change) => {
      if ( !isActiveGM() || !on() || !doc.actor?.hasPlayerOwner || !("x" in (change ?? {}) || "y" in (change ?? {})) ) return;
      clearTimeout(wait.get(doc.id));
      wait.set(doc.id, setTimeout(() => { wait.delete(doc.id); test(doc).catch(e => console.error(`${MOD} | descriptions`, e)); }, 1200));
    });
    Hooks.on("renderChatMessageHTML", (message, el) => {
      const html = el?.[0] ?? el, w = message.flags?.[MOD]?.wanted, wt = message.flags?.[MOD]?.wantedTest;
      if ( !w && !wt ) return;
      for ( const b of html?.querySelectorAll?.("[data-action^=wnpc-wanted]") ?? [] ) {
        if ( !game.user.isGM ) { b.remove(); continue; }
        b.addEventListener("click", async ev => {
          ev.preventDefault();
          b.disabled = true;
          const act = b.dataset.action;
          if ( act === "wnpc-wanted-drop" && w ) { if ( await drop(w.id) ) ui.notifications.info("That description is dropped."); }
          if ( act === "wnpc-wanted-list" ) { b.disabled = false; return openList(); }
          if ( act === "wnpc-wanted-alarm" && wt ) { const sc = await fromUuid(wt.scene); if ( sc ) await routines?.raiseAlarm?.(sc, `${wt.npc} knows someone from the description going round`); }
        });
      }
    });
  }

  return {registerSettings, hooks, write, drop, spreadNow, list, openList, test, onBreach, onMapEvent, onCombatEnd, ofActor: (id, t = now()) => W.of(list(), id, t), rules: W,
    dress: {of: dressOf, set: setDress, foreignAt, blendDiff, dialog: dressDialog}};
}
