/**
 * WoDX NPC 0.48.0 (B2520 to B2529): settlements. The town generator writes one record of a whole place beside its
 * maps (tools/mapgen/ddtown.py --settle, or ddsettle.py). "Settlements" in the Storyteller's hand brings a record
 * in, shows it for review (households to strike, hidden folk by game line to keep or draw again, ties to keep) and
 * enters it into the world as a journal no player can read. Nothing else is made until a map of the place is
 * adopted and its residents are seeded; the residents window then reads the review (residents.mjs calls afterSeed).
 * The rules are in settlement-rules.mjs.
 */
import * as SR from "./settlement-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const FOLDER = "WoDX settlements", IX = "wodx-interactables", SHEETS = "wodx-sheets";

export function build({MOD, esc, chron}) {
  const year = () => { try { return Number(chron()?.eras?.currentYear?.()) || 0; } catch (e) { return 0; } };
  const D = () => foundry.applications.api.DialogV2;
  const short = l => String(l ?? "").replace(/ household$/, "");
  const unset = path => { const Del = foundry.data?.operators?.ForcedDeletion; return Del ? {[path]: new Del()} : {[path.replace(/\.([^.]+)$/, ".-=$1")]: null}; };

  /** Every settlement entered into this world: [{journal, record, review, at}]. */
  const entries = () => game.journal.filter(j => SR.entryOf(j.flags)).map(j => ({journal: j, ...SR.entryOf(j.flags)}));
  const entryFor = sid => entries().find(e => e.record.id === sid) ?? null;
  /** What an entered settlement's review says about a household (residents.mjs asks for each household on a map). */
  function infoFor(householdId) {
    const sid = SR.settlementOf(householdId);
    const e = sid ? entryFor(sid) : null;
    return e ? SR.infoFor(e, householdId) : null;
  }

  async function pickFile() {
    const FP = foundry.applications.apps.FilePicker.implementation;
    return new Promise(resolve => {
      const fp = new FP({type: "text", callback: path => resolve(path)});
      fp.render(true);
      const close = fp.close?.bind(fp);
      if ( close ) fp.close = async (...a) => { const r = await close(...a); resolve(null); return r; };
    });
  }

  /** Read a record from a path under Data, text, or an object. Returns the tidy record or throws a plain message. */
  async function read(source) {
    let raw = source;
    if ( typeof source === "string" && !source.trim().startsWith("{") ) {
      try { raw = await (await fetch(source, {cache: "no-store"})).text(); }
      catch (e) { throw new Error(`The file could not be read: ${e.message}`); }
    }
    const got = SR.readRecord(raw);
    if ( !got.ok ) throw new Error(got.errors.join(" "));
    for ( const e of got.errors ) ui.notifications.warn(e);
    return got.data;
  }

  /** The Storyteller's review of a record. prior: an earlier review to start from. Returns the review or null. */
  async function review(rec, prior = null) {
    if ( !game.user.isGM ) return null;
    let rv = SR.normReview(rec, prior ?? {});
    if ( !prior ) rv.folk = SR.proposeFolk(rec, {nonce: 0});
    for ( let guard = 0; guard < 50; guard++ ) {
      const s = SR.summary(rec, rv.struck), y = year();
      const off = y && rec.year && Math.abs(y - rec.year) > 25;
      const gone = new Set(rv.struck);
      const folkRows = rv.folk.map((f, i) => `<li><label><input type="checkbox" name="f_${i}"${f.on ? " checked" : ""}> <b>${esc(f.label)}</b> <span class="wodx-quiet">(${esc(f.line)})</span>: ${esc(f.where)}</label>
        <div class="wodx-quiet">${esc(f.note)}</div></li>`).join("");
      const tieRows = Object.entries(SR.TIE_KINDS).map(([k, label]) => { const c = rec.ties.filter(t => t.kind === k).length;
        return c ? `<label style="display:block"><input type="checkbox" name="t_${k}"${rv.ties[k] !== false ? " checked" : ""}> ${esc(label)} <span class="wodx-quiet">(${c})</span></label>` : ""; }).join("");
      const rows = rec.households.map((h, i) => `<li class="wnpc-set-h"><label><input type="checkbox" name="h_${i}"${gone.has(h.id) ? "" : " checked"}> <b>${esc(short(h.label))}</b>
        <span class="wodx-quiet">${h.map ? `map ${esc(h.map)}, ` : ""}${esc(h.wealth)}</span></label> ${esc(SR.peopleWords(h))}</li>`).join("");
      const content = `<div class="wnpc-set-review" style="max-height:60vh;overflow-y:auto"><p><b>${esc(rec.name)}</b>, a ${rec.walled ? "walled " : ""}${esc(rec.label || rec.kind)} as it stands in ${rec.year}: ${s.people} people in ${s.households} households${rec.maps.length > 1 ? `, on ${rec.maps.length} maps` : ""}.</p>
        <p class="wodx-quiet">Its buildings, trades and offices are those of ${rec.region === "moravia" ? "Moravia and the Bohemian crown lands" : esc(rec.region)}. For a place elsewhere in the world, change the trades by hand after seeding.</p>
        ${off ? `<p class="wodx-warn">The chronicle stands in ${y}; this record is of ${rec.year}. Its trades and households are those of ${rec.year}.</p>` : ""}
        <p class="wodx-quiet">Trades: ${s.trades.slice(0, 14).map(([t, k]) => `${esc(t)} ${k}`).join(", ")}${s.trades.length > 14 ? ", and others" : ""}.</p>
        <h3>Hidden folk</h3>
        ${rv.folk.length ? `<ul class="wnpc-set-folk" data-fixed style="list-style:none;padding:0;margin:0">${folkRows}</ul>` : `<p class="wodx-quiet">The draw put nobody but mortals here. Draw again for another.</p>`}
        <p class="wodx-quiet">A house rule draws these from the number of people; untick any, or draw again. Nothing is made until the residents are seeded.</p>
        <h3>Ties between households</h3>${tieRows || `<p class="wodx-quiet">The record has none.</p>`}
        <h3>Households</h3><p class="wodx-quiet">Untick a household to leave its building empty.</p>
        ${rec.households.length > 8 ? searchBox(".wnpc-set-list", "Search households…", "Search households") : ""}
        <ul class="wnpc-set-list" style="list-style:none;padding:0;margin:0">${rows}</ul></div>`;
      const take = b => {
        const o = new foundry.applications.ux.FormDataExtended(b.form).object;
        return SR.normReview(rec, {nonce: rv.nonce, struck: rec.households.filter((h, i) => !o[`h_${i}`]).map(h => h.id), folk: rv.folk.map((f, i) => ({...f, on: !!o[`f_${i}`]})),
          ties: Object.fromEntries(Object.keys(SR.TIE_KINDS).map(k => [k, rec.ties.some(t => t.kind === k) ? !!o[`t_${k}`] : true]))});
      };
      const res = await D().wait({window: {title: `Settlement: ${rec.name}, ${rec.year}`, resizable: true}, classes: ["wodx-dialog", "wodx-npc-dialog"], position: {width: 680, height: "auto"},
        content, rejectClose: false,
        buttons: [{action: "enter", label: "Enter it into the world", default: true, callback: (ev, b) => ({go: "enter", rv: take(b)})},
          {action: "again", label: "Draw the hidden folk again", callback: (ev, b) => ({go: "again", rv: take(b)})}, {action: "cancel", label: "Cancel"}]});
      if ( !res || res === "cancel" ) return null;
      rv = res.rv;
      if ( res.go === "enter" ) return rv;
      rv.nonce++;
      rv.folk = SR.proposeFolk(rec, {nonce: rv.nonce, struck: rv.struck});
    }
    return null;
  }

  /** Enter a reviewed record into the world: a journal no player can read, in the settlements folder. */
  async function enter(rec, rv) {
    if ( !game.user.isGM ) return null;
    const clean = SR.normReview(rec, rv ?? {});
    const pages = SR.journalPages(rec, clean).map((p, i) => ({name: p.name, type: "text", sort: (i + 1) * 100000, text: {content: p.html, format: 1}}));
    const entry = {record: rec, review: clean, at: Date.now()};
    const had = entryFor(rec.id)?.journal;
    if ( had ) {
      await had.deleteEmbeddedDocuments("JournalEntryPage", had.pages.map(p => p.id));
      await had.createEmbeddedDocuments("JournalEntryPage", pages);
      await had.update({name: `${rec.name}, ${rec.year}`, ...unset(`flags.${MOD}.settlement`)});
      await had.update({[`flags.${MOD}.settlement`]: entry});
      return had;
    }
    let folder = game.folders.find(f => f.type === "JournalEntry" && f.name === FOLDER && !f.folder);
    folder ??= await Folder.create({name: FOLDER, type: "JournalEntry", color: "#4a3f35"});
    return JournalEntry.create({name: `${rec.name}, ${rec.year}`, folder: folder.id, ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE},
      flags: {[MOD]: {settlement: entry}}, pages});
  }

  /** Pick a record, review it, enter it. */
  async function bringIn() {
    if ( !game.user.isGM ) return null;
    const path = await pickFile();
    if ( !path ) return null;
    let rec;
    try { rec = await read(path); } catch (e) { ui.notifications.warn(e.message); return null; }
    const had = entryFor(rec.id);
    const rv = await review(rec, had?.review ?? null);
    if ( !rv ) return null;
    const j = await enter(rec, rv);
    ui.notifications.info(`${rec.name} is entered. Adopt its maps, then seed the residents on each (the scene's right-click menu).`);
    return j;
  }

  /** Review an entered settlement again and write the journal anew. Residents already seeded are left as they are. */
  async function reviewAgain(sid) {
    const e = entryFor(sid);
    if ( !e ) return null;
    const rv = await review(e.record, e.review);
    return rv ? enter(e.record, rv) : null;
  }

  /** Take a settlement out of the world: its journal only. Seeded residents stay until removed on their scenes. */
  async function remove(sid) {
    const e = entryFor(sid);
    if ( !e || !game.user.isGM ) return false;
    const seededN = residentsOf(sid).length;
    const ok = await D().confirm({window: {title: "Remove the settlement"}, rejectClose: false,
      content: `<p>Delete the journal of ${esc(e.record.name)} and its review?${seededN ? ` Its ${seededN} seeded residents stay; remove them on their scenes (Remove the residents).` : ""}</p>`});
    if ( !ok ) return false;
    await e.journal.delete();
    return true;
  }

  const residentsOf = sid => game.actors.filter(a => SR.settlementOf(a.flags?.[MOD]?.resident?.household) === sid);

  /** The Settlements window: what is entered, and the way in for a new record. */
  async function open() {
    if ( !game.user.isGM ) return null;
    for ( let guard = 0; guard < 50; guard++ ) {
      const list = entries().sort((a, b) => a.record.name.localeCompare(b.record.name));
      const rows = list.map((e, i) => { const s = SR.summary(e.record, e.review.struck), made = residentsOf(e.record.id).length;
        return `<li class="wnpc-set-row"><label><input type="radio" name="pick" value="${i}"${i === 0 ? " checked" : ""}> <b>${esc(e.record.name)}</b>, ${e.record.year}</label>
          <span class="wodx-quiet">${esc(e.record.label || e.record.kind)}, ${s.people} people in ${s.households} households; ${made} seeded; ${e.review.folk.filter(f => f.on).length} hidden folk</span></li>`; }).join("");
      const content = `<p>A settlement is a whole place from the town generator: its households, trades, ties and hidden folk. Bring in its record (the .settlement.json beside its maps), review it, and it enters the world as a journal only you can read.</p>
        ${list.length ? `${list.length > 8 ? searchBox(".wnpc-set-rows", "Search settlements…", "Search settlements") : ""}<ul class="wnpc-set-rows" style="max-height:18rem;overflow-y:auto;list-style:none;padding:0">${rows}</ul>`
          : `<p class="wodx-quiet">No settlement is entered yet.</p>`}`;
      const picked = (ev, b) => list[Number(new foundry.applications.ux.FormDataExtended(b.form).object.pick)] ?? null;
      const res = await D().wait({window: {title: "Settlements", resizable: true}, classes: ["wodx-dialog", "wodx-npc-dialog"], position: {width: 620, height: "auto"}, content, rejectClose: false,
        buttons: [{action: "bring", label: "Bring in a record", default: true, callback: () => ({go: "bring"})},
          ...(list.length ? [{action: "again", label: "Review", callback: (ev, b) => ({go: "again", e: picked(ev, b)})}, {action: "read", label: "Open the journal", callback: (ev, b) => ({go: "read", e: picked(ev, b)})},
            {action: "remove", label: "Remove", callback: (ev, b) => ({go: "remove", e: picked(ev, b)})}] : []), {action: "close", label: "Close"}]});
      if ( !res || res === "close" ) return null;
      if ( res.go === "bring" ) await bringIn();
      else if ( res.go === "again" && res.e ) await reviewAgain(res.e.record.id);
      else if ( res.go === "read" && res.e ) { res.e.journal.sheet.render(true); return res.e.journal; }
      else if ( res.go === "remove" && res.e ) await remove(res.e.record.id);
    }
    return null;
  }

  /**
   * After a household's residents are made (residents.mjs): mark the hidden folk, give those who go out to work
   * their workplace on this map, and write the ties whose two household heads now both exist.
   */
  async function afterSeed(scene, h, actors) {
    const info = infoFor(h.household.id);
    if ( !info || !actors.length ) return null;
    const e = entryFor(info.settlement);
    const region = fromUuidSync(h.region);
    const ups = [];
    for ( const f of info.folk ) {
      const flag = SR.hiddenFlag(f);
      if ( f.unit === "building" ) { if ( region ) await region.update({[`flags.${MOD}.residents.hidden`]: flag}); }
      else for ( const a of (f.unit === "household" ? actors : actors.slice(0, 1)) ) ups.push({_id: a.id, [`flags.${MOD}.resident.hidden`]: flag});
    }
    const work = SR.workplaces(e.record, e.review)[h.household.id];
    const at = work ? scene.regions.find(r => r.flags?.[IX]?.adoptId === work) : null;
    if ( at ) {
      const i = ups.findIndex(u => u._id === actors[0].id);
      if ( i >= 0 ) ups[i][`flags.${MOD}.routine.roles.work`] = at.uuid; else ups.push({_id: actors[0].id, [`flags.${MOD}.routine.roles.work`]: at.uuid});
    }
    if ( ups.length ) await Actor.updateDocuments(ups);
    return {settlement: info.settlement, hidden: info.folk.length, work: !!at, ties: await writeTies(info.settlement)};
  }

  /** Write every kept tie whose two household heads exist and are not yet tied. Returns how many were written. */
  async function writeTies(sid) {
    const e = entryFor(sid);
    if ( !e || !game.user.isGM ) return 0;
    const heads = {};
    for ( const a of residentsOf(sid) ) if ( a.flags[MOD].resident.master ) heads[a.flags[MOD].resident.household] = a.id;
    const have = id => game.actors.get(id)?.flags?.[SHEETS]?.ties ?? [];
    const writes = SR.tieWrites(e.record, e.review, heads, have);
    const by = {};
    for ( const w of writes ) (by[w.actor] ??= []).push(w.tie);
    const ups = Object.entries(by).map(([id, list]) => ({_id: id, [`flags.${SHEETS}.ties`]: [...have(id), ...list]}));
    if ( ups.length ) await Actor.updateDocuments(ups);
    return writes.length;
  }

  /** Before residents are deleted (residents.mjs): take the ties that point at them off the sheets that stay. */
  async function beforeRemove(ids) {
    const gone = new Set([...ids].map(id => `Actor.${id}`));
    const ups = [];
    for ( const a of game.actors ) {
      if ( ids.has(a.id) || !a.flags?.[MOD]?.resident ) continue;
      const list = a.flags?.[SHEETS]?.ties;
      if ( Array.isArray(list) && list.some(t => gone.has(t.uuid)) ) ups.push({_id: a.id, [`flags.${SHEETS}.ties`]: list.filter(t => !gone.has(t.uuid))});
    }
    if ( ups.length ) await Actor.updateDocuments(ups);
    return ups.length;
  }

  function hooks() {
    Hooks.once("ready", () => {
      const add = () => {
        const hand = game.wodx?.storyteller?.hand;
        if ( !hand?.addTool ) return false;
        hand.addTool({key: "settlements", label: "Settlements", icon: "fa-city", run: () => open()});
        return true;
      };
      if ( game.user.isGM && !add() ) setTimeout(add, 2000);
    });
  }

  return {hooks, open, bringIn, read, review, reviewAgain, enter, remove, entries, entryFor, infoFor, afterSeed, beforeRemove, writeTies, residentsOf, rules: SR};
}
