/**
 * WoDX NPC 0.46.0 (B2500 to B2504): the residents of a generated town. A map adopted from the town or village
 * generator keeps each building's household on its region (WoDX Interactables 0.21.0). "Seed the residents" (the
 * scene's right-click menu, the Storyteller's hand, or api.residents.open) shows every household with the people it
 * would make: names from WoDX Creation's People generator for the year and homeland in play, a routine for each
 * role with the building as home, and the household set so its members answer one another's cry. The Storyteller
 * ticks the households, may make a household ghouls of one Cainite, draws again for other names, and makes them.
 * The routines then put each resident where the hour says. "Remove the residents" takes them all back.
 * The rules are in resident-rules.mjs.
 */
import * as RS from "./resident-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const FOLDER = "WoDX residents";
const rowId = li => li?.dataset?.entryId ?? li?.[0]?.dataset?.entryId ?? li?.dataset?.documentId ?? li?.[0]?.dataset?.documentId;
const hashOf = s => { let h = 2166136261; for ( const c of String(s) ) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) % 1000000; };
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

export function build({MOD, esc, chron}) {
  const creation = () => game.modules.get("wodx-creation")?.active ? game.modules.get("wodx-creation")?.api?.people : null;
  const year = () => { try { return Number(chron()?.eras?.currentYear?.()) || 0; } catch (e) { return 0; } };
  const unset = path => { const Del = foundry.data?.operators?.ForcedDeletion; return Del ? {[path]: new Del()} : {[path.replace(/\.([^.]+)$/, ".-=$1")]: null}; };
  const regionsOf = scene => [...(scene?.regions ?? [])];
  const listOf = scene => RS.householdsOn(regionsOf(scene));
  const residentsOn = scene => game.actors.filter(a => a.flags?.[MOD]?.resident?.scene === scene?.uuid);

  /** The planned people of every household on a scene. nonce: how many times the Storyteller drew again. */
  function plan(scene, {nonce = 0} = {}) {
    const ppl = creation(), y = year(), batch = hashOf(scene.uuid);
    return listOf(scene).map((h, hi) => {
      const plans = RS.planHousehold(h, {year: y});
      const draw = (i, {sex, trade}) => {
        if ( !ppl?.generate ) return {sex: sex === "any" ? "female" : sex, origin: "", given: "", family: "", name: ""};
        try { return ppl.generate({batch, row: hi * 1000 + i, nonce, kind: "mortal", sex, trade}); }
        catch (e) { console.warn(`${MOD} | residents: the People generator failed`, e); return {sex, origin: "", given: "", family: "", name: ""}; }
      };
      let rand = Math.random;
      try { rand = chron()?.gen?.random?.(`residents:${scene.uuid}:${hi}`, nonce) ?? Math.random; } catch (e) { rand = Math.random; }
      const people = RS.nameHousehold(plans, draw, rand, {year: y}).map(p => ({...p, name: p.name || cap(p.plan.label)}));
      return {...h, index: hi, people};
    });
  }

  /** Make the ticked households' people. picks: [{index, ghoulOf: actorId|null}]. Returns the actors made. */
  async function seed(scene, list, picks) {
    if ( !game.user.isGM ) return [];
    let folder = game.folders.find(f => f.type === "Actor" && f.getFlag(MOD, "residents") === scene.uuid);
    if ( !folder ) {
      let parent = game.folders.find(f => f.type === "Actor" && f.name === FOLDER && !f.folder);
      parent ??= await Folder.create({name: FOLDER, type: "Actor", color: "#4a3f35"});
      folder = await Folder.create({name: scene.name, type: "Actor", folder: parent.id, flags: {[MOD]: {residents: scene.uuid}}});
    }
    const made = [], ppl = creation();
    for ( const pick of picks ) {
      const h = list.find(x => x.index === pick.index);
      if ( !h ) continue;
      const kind = pick.ghoulOf ? "ghoul" : "mortal";
      const people = h.people.map(p => ({...p, kind, trade: p.plan.master ? p.trade : p.plan.label}));
      let actors = [];
      if ( ppl?.create ) actors = await ppl.create({people, domitorId: pick.ghoulOf || null});
      else for ( const p of people ) actors.push(await Actor.create({name: p.name, type: CONFIG.worldofdarkness?.sheettype?.mortal ?? "Mortal"}));
      const ups = actors.map((a, i) => {
        const f = RS.residentFlags(people[i], h, scene.uuid);
        return {_id: a.id, folder: folder.id, name: people[i].name, "prototypeToken.name": people[i].name, "prototypeToken.actorLink": true,
          "prototypeToken.disposition": CONST.TOKEN_DISPOSITIONS.NEUTRAL, [`flags.${MOD}.behavior`]: f.behavior, [`flags.${MOD}.routine`]: f.routine, [`flags.${MOD}.resident`]: f.resident};
      });
      if ( ups.length ) await Actor.updateDocuments(ups);
      const region = fromUuidSync(h.region);
      if ( region ) {
        const master = actors[0] && people[0]?.plan?.master ? people[0].name : "";
        const up = {[`flags.${MOD}.residents`]: {actors: actors.map(a => a.id), ownerSet: !!(master && !h.owner), at: Date.now()}};
        if ( master && !h.owner && region.flags?.[MOD]?.place ) up[`flags.${MOD}.place.owner`] = master;
        await region.update(up);
      }
      made.push(...actors);
    }
    return made;
  }

  /** Take back everything a seeding made on a scene: the actors, their tokens on every scene, and the regions' notes. */
  async function remove(scene) {
    if ( !game.user.isGM || !scene ) return 0;
    const actors = residentsOn(scene), ids = new Set(actors.map(a => a.id));
    for ( const s of game.scenes ) {
      const toks = s.tokens.filter(t => ids.has(t.actorId)).map(t => t.id);
      if ( toks.length ) await s.deleteEmbeddedDocuments("Token", toks);
    }
    if ( actors.length ) await Actor.deleteDocuments([...ids]);
    for ( const r of regionsOf(scene) ) {
      const rec = r.flags?.[MOD]?.residents;
      if ( !rec ) continue;
      await r.update({...unset(`flags.${MOD}.residents`), ...(rec.ownerSet && r.flags?.[MOD]?.place ? {[`flags.${MOD}.place.owner`]: ""} : {})});
    }
    const folder = game.folders.find(f => f.type === "Actor" && f.getFlag(MOD, "residents") === scene.uuid);
    if ( folder && !folder.contents?.length ) await folder.delete();
    return actors.length;
  }

  // Cainites a household can serve as ghouls (V20 Dark Ages ghoul rules in every era, through WoDX Creation)
  const vampires = () => game.actors.filter(a => a.type === (CONFIG.worldofdarkness?.sheettype?.vampire ?? "Vampire")).sort((a, b) => a.name.localeCompare(b.name));

  /** The Storyteller's window. Loops on Draw again with the next nonce. */
  async function open(scene = canvas?.scene) {
    if ( !game.user.isGM ) return null;
    if ( !scene ) return ui.notifications.warn("No scene in view.");
    if ( !listOf(scene).length ) return ui.notifications.info(`${scene.name} has no households. Adopt a map from the town or village generator first (the scene's right-click menu).`);
    let nonce = 0;
    for ( let guard = 0; guard < 50; guard++ ) {
      const list = plan(scene, {nonce});
      const fresh = list.filter(h => !h.seeded.length);
      const vamps = vampires();
      const vopt = `<option value="">Mortals</option>${vamps.map(v => `<option value="${v.id}">Ghouls of ${esc(v.name)}</option>`).join("")}`;
      const rows = list.map(h => {
        const done = h.seeded.length > 0;
        const who = h.people.map(p => `${esc(p.name)} <span class="wodx-quiet">(${esc(p.plan.label)})</span>`).join(", ");
        return `<li class="wnpc-res${done ? " done" : ""}"><label><input type="checkbox" name="h${h.index}"${done ? " disabled" : " checked"}> <b>${esc(h.household.label)}</b>${done ? " <span class=\"wodx-quiet\">(already seeded)</span>" : ""}</label>
          <div>${who}</div>${done || !vamps.length ? "" : `<select name="g${h.index}" data-fixed>${vopt}</select>`}</li>`;
      }).join("");
      const n = RS.countPeople(list);
      const content = `<p>${n} people in ${fresh.length} households on ${esc(scene.name)}, for the year ${year() || "in play"}. Each gets a sheet, a routine with their building as home, and their household.</p>
        ${n > RS.LARGE ? `<p class="wodx-warn">That is many sheets at once; untick some households to make fewer.</p>` : ""}
        ${creation() ? "" : `<p class="wodx-quiet">WoDX Creation is off, so they are named by their role and have blank sheets.</p>`}
        ${list.length > 8 ? searchBox(".wnpc-res-list", "Search households…", "Search households") : ""}<ul class="wnpc-res-list" style="max-height:24rem;overflow-y:auto">${rows}</ul>`;
      const res = await foundry.applications.api.DialogV2.wait({window: {title: `Residents: ${scene.navName || scene.name}`, resizable: true}, classes: ["wodx-dialog", "wodx-npc-dialog"],
        position: {width: 640, height: "auto"}, content, rejectClose: false,
        buttons: [{action: "make", label: "Make them", default: true, callback: (ev, b) => ({go: "make", data: new foundry.applications.ux.FormDataExtended(b.form).object})},
          {action: "again", label: "Draw again", callback: () => ({go: "again"})}, {action: "cancel", label: "Cancel"}]});
      if ( !res || res === "cancel" ) return null;
      if ( res.go === "again" ) { nonce++; continue; }
      const picks = fresh.filter(h => res.data[`h${h.index}`]).map(h => ({index: h.index, ghoulOf: res.data[`g${h.index}`] || null}));
      if ( !picks.length ) { ui.notifications.info("No household was ticked."); return null; }
      ui.notifications.info(`Making ${picks.reduce((s, p) => s + list.find(h => h.index === p.index).people.length, 0)} residents…`);
      const made = await seed(scene, list, picks);
      ui.notifications.info(`${made.length} residents made on ${scene.name}, in the "${FOLDER}" folder. Their routines put them where the hour says.`);
      return made;
    }
    return null;
  }

  async function confirmRemove(scene) {
    const n = residentsOn(scene).length;
    if ( !n ) return ui.notifications.info(`${scene.name} has no residents WoDX made.`);
    const ok = await foundry.applications.api.DialogV2.confirm({window: {title: "Remove the residents"}, rejectClose: false,
      content: `<p>Delete the ${n} residents seeded on ${esc(scene.name)}, their sheets and their tokens on every scene? Anything written on those sheets since goes with them.</p>`});
    if ( ok ) ui.notifications.info(`${await remove(scene)} residents removed from ${scene.name}.`);
    return ok;
  }

  function hooks() {
    Hooks.on("getSceneContextOptions", (app, options) => {
      options.push({name: "Seed the residents", icon: '<i class="fa-solid fa-people-roof"></i>',
        condition: li => game.user.isGM && listOf(game.scenes.get(rowId(li))).length > 0,
        callback: li => open(game.scenes.get(rowId(li))).catch(e => { console.error(`${MOD} |`, e); ui.notifications.error(`Seeding the residents failed: ${e.message}`); })});
      options.push({name: "Remove the residents", icon: '<i class="fa-solid fa-user-xmark"></i>',
        condition: li => game.user.isGM && residentsOn(game.scenes.get(rowId(li))).length > 0,
        callback: li => confirmRemove(game.scenes.get(rowId(li)))});
    });
    Hooks.once("ready", () => {
      const add = () => {
        const hand = game.wodx?.storyteller?.hand;
        if ( !hand?.addTool ) return false;
        hand.addTool({key: "residents", label: "Residents of this map", icon: "fa-people-roof", run: () => open(canvas?.scene)});
        return true;
      };
      if ( game.user.isGM && !add() ) setTimeout(add, 2000);
    });
  }

  return {hooks, open, plan, seed, remove, confirmRemove, residentsOn, households: listOf, rules: RS};
}
