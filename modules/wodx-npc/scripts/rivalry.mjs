import * as RV from "./rivalry-rules.mjs";
import * as F from "./faction-rules.mjs";
import * as FR from "./fight-rules.mjs";
import * as Faces from "./faces-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

/**
 * WoDX NPC 0.18.0 (B820 to B825): natural rivalries on the map. rivalry-rules.mjs has the rules. When an NPC moves,
 * the active Storyteller checks it against the other NPCs in sight: rival sides in this year, each knowing what the
 * other is, then a flashpoint roll. A fight goes through WoDX Combat's starter (source "rivalry"), with each token's
 * side, so two NPCs of one disposition can fight each other. Rivalry also seeds an NPC's first meeting with a
 * character it recognises (attitude.mjs).
 */
export function build({MOD, esc, isActiveGM, chron, C, profileFor, savedProfile, factions, routines, yardsBetween, obvious, hiddenByObfuscate}) {
  const num = v => Number(v) || 0;
  const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return undefined; } };
  const year = () => { try { return Number(chron()?.eras?.currentYear?.()) || 0; } catch (e) { return 0; } };
  const kindOf = actor => C()?.getKind?.(actor) ?? "mortal";
  const factionState = () => { try { return factions?.state?.() ?? null; } catch (e) { return null; } };
  const baseOf = a => (a?.isToken ? (a.baseActor ?? game.actors.get(a.id) ?? a) : a);
  const rows = () => RV.rowsInUse(setting("rivalryRows") ?? {});

  function registerSettings() {
    game.settings.register(MOD, "rivalries", {
      name: "Rivalries start fights", hint: "NPCs of rival sides who meet and know each other for what they are may come to blows (Garou and Kindred, Sabbat and Camarilla, the Inquisition and every monster, and so on, by year). The fight goes through WoDX Combat's \"Start fights by themselves\", so it follows that setting.",
      scope: "world", config: true, type: Boolean, default: true
    });
    game.settings.register(MOD, "rivalryRows", {scope: "world", config: false, type: Object, default: {off: [], extra: ""}});
  }

  /* ------------------------------------------------------------------ */
  /*  Sides and senses                                                   */
  /* ------------------------------------------------------------------ */

  const factionsOf = actor => {
    const st = factionState(), id = baseOf(actor)?.id;
    return st && id ? st.factions.filter(f => (f.members ?? []).includes(id) || f.leader === id) : [];
  };
  function sideInfo(actor) {
    const s = actor?.system ?? {};
    const sheet = Object.fromEntries(Object.keys(RV.SHEET_SIDES).map(k => [k, typeof s[k] === "string" ? s[k] : (typeof s[k]?.value === "string" ? s[k].value : "")]));
    const variant = [s.settings?.variant, ...(s.variant && typeof s.variant === "object" ? Object.values(s.variant) : [s.variant])].filter(v => typeof v === "string");
    const written = String(savedProfile(baseOf(actor))?.sides ?? "").split(/[,\n]/).map(x => x.trim()).filter(Boolean);
    return {line: kindOf(actor), sheet, variant, factions: factionsOf(actor).map(f => ({name: f.name, kind: f.kind})), written};
  }
  /** Every side of an actor, with its master's when it is a follower (a ghoul's domitor). */
  function sidesOf(actor) {
    const own = RV.sidesOf(sideInfo(actor));
    const domId = baseOf(actor)?.flags?.["wodx-creation"]?.lineage?.domitor?.id;
    const dom = domId ? game.actors.get(domId) : null;
    return {own, master: dom ? RV.sidesOf(sideInfo(dom)).filter(x => !x.startsWith("line:")) : []};
  }
  const openSides = actor => String(savedProfile(baseOf(actor))?.openSides ?? "").split(/[,\n]/).map(x => x.trim().toLowerCase()).filter(Boolean);
  const disc = (a, n) => { const it = a?.items?.find?.(i => i.type === "Power" && String(i.system?.type ?? "").includes("discipline") && i.name.trim().toLowerCase().startsWith(n)); return it ? num(it.system?.value) : 0; };
  const pool = (a, rule) => num(a?.system?.attributes?.[rule.attr]?.value) + num(a?.system?.abilities?.[rule.ability]?.value ?? a?.system?.abilities?.[rule.ability.replace("-", "")]?.value);
  const sensed = new Map();
  /** The senses that work for this watcher on this other now. A rolled sense is rolled once a stand-off spell. */
  function sensesFor(wTok, oTok) {
    const a = wTok.actor;
    const s = RV.sensesOf({kind: kindOf(a), auspex: disc(a, "auspex"), senseWyrm: (a?.items ?? []).some(i => /sense wyrm/i.test(i.name ?? "")), imbued: !!a?.system?.creed});
    const out = [...s.auto], now = game.time.worldTime;
    for ( const k of s.roll ) {
      const key = `${wTok.id}:${oTok.id}:${k}`, was = sensed.get(key);
      if ( was && RV.quietPair(was.at, now) ) { if ( was.ok ) out.push(k); continue; }
      const rule = RV.SENSE_ROLLS[k], n = pool(a, rule);
      let hits = 0;
      for ( let i = 0; i < n; i++ ) { const d = 1 + Math.floor(Math.random() * 10); if ( d >= rule.diff ) hits++; else if ( d === 1 ) hits--; }
      sensed.set(key, {at: now, ok: hits > 0});
      if ( hits > 0 ) out.push(k);
    }
    return out;
  }
  const metBy = (watcher, other) => Faces.metList(baseOf(other)?.flags?.[MOD] ?? {}).includes(baseOf(watcher)?.id);
  /** The other's sides this watcher can tell. */
  function knownTo(wTok, oTok) {
    const st = factionState();
    const mine = factionsOf(wTok.actor);
    // a faction knows the members of the factions it has a standing with (friend or foe)
    const knows = st ? st.factions.filter(f => mine.some(m => m.id !== f.id && F.standingOf(m, f.id) !== 0)).map(f => f.name) : [];
    const {own} = sidesOf(oTok.actor);
    return RV.knownSides({line: kindOf(wTok.actor), senses: sensesFor(wTok, oTok), knowsFactions: knows, metThem: metBy(wTok.actor, oTok.actor)},
      {sides: own, obvious: !!obvious?.(oTok.actor), openSides: openSides(oTok.actor)});
  }
  /** The Storyteller's standing between the two NPCs' factions, lowest first; null when none is set. */
  function standingBetween(a, b) {
    const fa = factionsOf(a), fb = factionsOf(b);
    let low = null;
    for ( const x of fa ) for ( const y of fb ) if ( x.id !== y.id ) { const v = F.standingOf(x, y.id); if ( v !== 0 && (low === null || v < low) ) low = v; }
    return low;
  }
  /** How the watcher regards the other: {step, why, rows}. */
  function regardOf(wTok, oTok) {
    const {own, master} = sidesOf(wTok.actor);
    const known = knownTo(wTok, oTok);
    const rivals = RV.parseRivals(savedProfile(baseOf(wTok.actor))?.rivals).rivals;
    const mineR = RV.regard({mine: own, known, year: year(), standing: standingBetween(wTok.actor, oTok.actor), rivals, rows: rows()});
    if ( mineR.step < 0 || !master.length ) return {...mineR, mine: own};
    const m = RV.regard({mine: master, known, year: year(), follower: true, rows: rows()});
    return m.step < mineR.step ? {...m, mine: master, why: `${m.why} (as its master's)`} : {...mineR, mine: own};
  }
  /** For attitude.mjs: the step an NPC starts from with a character it recognises, or null. */
  function seedFor(npc, character) {
    if ( !setting("rivalries") || !canvas?.tokens ) return null;
    const nTok = canvas.tokens.placeables.find(t => t.actor && (t.actor.id === npc.id || t.document.actorId === npc.id));
    const cTok = canvas.tokens.placeables.find(t => t.actor && (t.actor.id === character.id || t.document.actorId === character.id));
    if ( !nTok || !cTok ) return null;
    const r = regardOf(nTok, cTok);
    return r.step < 0 ? {step: r.step, from: r.why} : null;
  }

  /* ------------------------------------------------------------------ */
  /*  On the map                                                         */
  /* ------------------------------------------------------------------ */

  const sightBlocked = (a, b) => { try { return !!CONFIG.Canvas.polygonBackends.sight.testCollision(a, b, {type: "sight", mode: "any"}); } catch (e) { return false; } };
  const down = actor => { const d = C()?.corpusTrack?.(actor)?.damage ?? actor?.system?.health?.damage ?? {}; return num(d.bashing) + num(d.lethal) + num(d.aggravated) >= 7; };
  const inFight = d => (game.combats?.contents ?? []).some(c => c.started && c.combatants.some(x => x.tokenId === d.id));
  const fightMode = () => { try { return game.settings.get("wodx-combat", "fightStart"); } catch (e) { return "off"; } };
  const sightYards = () => { try { return game.settings.get("wodx-combat", "fightSightYards"); } catch (e) { return 30; } };
  const lastPair = new Map(), parleyed = new Set(), waits = new Map();
  const ownGround = (actor, scene) => {
    const st = factionState(), holder = st ? F.holderOf(st, scene.uuid) : null;
    return !!holder && factionsOf(actor).some(f => f.id === holder.id);
  };
  let night = false;
  const isNight = () => night;
  async function readNight() { try { await routines?.loadCalendar?.(); night = !!routines?.describer?.()?.(game.time.worldTime)?.isNight; } catch (e) { night = false; } }

  /** One pair: returns the request made, or null. */
  async function checkPair(aTok, bTok, scene, {rng = Math.random} = {}) {
    if ( !aTok?.actor || !bTok?.actor || down(aTok.actor) || down(bTok.actor) ) return null;
    if ( inFight(aTok.document) && inFight(bTok.document) ) return null;
    const key = RV.pairKey(aTok.id, bTok.id), now = game.time.worldTime;
    if ( RV.quietPair(lastPair.get(key), now) ) return null;
    const yards = yardsBetween(aTok, bTok), range = FR.sightRange(sightYards(), isNight());
    if ( (yards !== null && yards > range) || sightBlocked(aTok.center, bTok.center) || hiddenByObfuscate?.(aTok) || hiddenByObfuscate?.(bTok) ) return null;
    const ra = regardOf(aTok, bTok), rb = regardOf(bTok, aTok);
    if ( ra.step > -1 && rb.step > -1 ) return null;
    lastPair.set(key, now);
    const truce = !!scene.getFlag(MOD, "truce");
    const near = (tok, row) => canvas.tokens.placeables.filter(t => t.actor && t.id !== aTok.id && t.id !== bTok.id && !t.actor.hasPlayerOwner && !t.document.hidden && !down(t.actor)
      && (yardsBetween(tok, t) ?? 99) <= 10 && RV.matches(row, sidesOf(t.actor).own));
    const witnesses = canvas.tokens.placeables.filter(t => t.actor && t.id !== aTok.id && t.id !== bTok.id && !t.document.hidden && kindOf(t.actor) === "mortal"
      && Math.min(yardsBetween(aTok, t) ?? 99, yardsBetween(bTok, t) ?? 99) <= 30).length;
    const rowOf = r => rows().find(x => x.id === r.rows?.[0]);
    const view = (tok, r, other) => {
      const p = profileFor(tok.actor), adv = tok.actor.system?.advantages ?? {}, row = rowOf(r);
      const mineSide = row ? (RV.matches(row.a, r.mine) ? row.a : row.b) : null;
      const helpers = mineSide ? near(tok, mineSide) : [];
      const sit = {step: r.step, mine: r.mine, aggression: p.aggression, ownGround: ownGround(tok.actor, scene), night: isNight(), us: 1 + helpers.length,
        them: 1 + (row ? near(other, mineSide === row.a ? row.b : row.a).length : 0), witnesses, rage: num(adv.rage?.temporary),
        hungry: kindOf(tok.actor) === "kindred" && num(adv.bloodpool?.temporary) < 7 - (num(adv.virtues?.selfcontrol?.permanent) || 3),
        truce, parley: (p.tactics ?? []).includes("parley"), parleyed: parleyed.has(`${tok.id}:${other.id}`)};
      const timid = !(Number(p.aggression) >= FR.TIMID_BELOW);
      return {tok, other, r, helpers, timid, ...RV.flashpoint(sit), sit};
    };
    const va = view(aTok, ra, bTok), vb = view(bTok, rb, aTok);
    const first = [va, vb].filter(v => !v.timid).sort((x, y) => y.odds - x.odds)[0] ?? null;
    if ( !first || first.odds <= 0 ) return standoff(va.r.step <= vb.r.step ? va : vb, "glare");
    if ( first.sit.parley && !first.sit.parleyed ) parleyed.add(`${first.tok.id}:${first.other.id}`);
    const roll = RV.rollFlashpoint(first.odds, rng);
    if ( !roll.fight ) return standoff(first, "hold", roll);
    const other = first.tok.id === aTok.id ? vb : va;
    const sides = RV.sidesForFight(first.tok.id, first.other.id, first.helpers.map(t => t.id), other.helpers.map(t => t.id));
    const why = `${first.tok.name} ${RV.stepWord(first.r.step) === "Hunts" ? "hunts" : "is hostile to"} ${first.other.name}: ${first.r.why}. Flashpoint ${roll.roll} against ${first.odds}% (${first.why.join(", ")})`;
    return C()?.fight?.start?.({scene, tokens: [first.tok.document, first.other.document, ...first.helpers.map(t => t.document), ...other.helpers.map(t => t.document)],
      source: "rivalry", why, sides});
  }
  /** No blows: the Storyteller hears of a stand-off, and the NPC says something if it speaks. */
  async function standoff(v, how, roll = null) {
    if ( !v || v.r.step > -1 ) return null;
    const text = how === "glare" ? `${v.tok.name} and ${v.other.name} know each other for rivals (${v.r.why.toLowerCase()}), but nobody moves: ${v.why.join(", ")}.`
      : `${v.tok.name} squares up to ${v.other.name} but holds back (flashpoint ${roll?.roll} against ${v.odds}%: ${v.why.join(", ")}).`;
    try { game.modules.get(MOD)?.api?.talk?.bark?.(v.tok.document, "cry:threat", {gap: 60000}); } catch (e) { /* no barks */ }
    return ChatMessage.create({speaker: {alias: "WoDX NPC"}, whisper: game.users.filter(u => u.isGM).map(u => u.id),
      content: `<div class="vta-card wodx-x wnpc"><div class="vta-body"><p>${esc(text)}</p></div></div>`});
  }

  /** Active Storyteller: an NPC moved. Check it against every other NPC on the scene being viewed. */
  async function watchRivals(doc) {
    if ( !isActiveGM() || !setting("rivalries") || fightMode() === "off" || doc.parent?.id !== canvas.scene?.id ) return;
    try { if ( chron()?.isSkipping?.() ) return; } catch (e) { /* no skip */ }
    const moved = canvas.tokens.get(doc.id);
    if ( !moved?.actor || moved.actor.hasPlayerOwner ) return;
    await readNight();
    const others = canvas.tokens.placeables.filter(t => t.actor && t.id !== moved.id).map(t => ({id: t.id, pc: !!t.actor.hasPlayerOwner, down: down(t.actor), hidden: !!t.document.hidden}));
    for ( const p of RV.rivalPairs({id: moved.id, pc: !!moved.actor.hasPlayerOwner, down: down(moved.actor)}, others) ) {
      const r = await checkPair(canvas.tokens.get(p.a), canvas.tokens.get(p.b), canvas.scene);
      if ( r?.done === "started" || r?.done === "joined" || r?.done === "suggested" ) break;
    }
  }
  function onTokenMoved(doc, changes) {
    if ( !isActiveGM() || !("x" in (changes ?? {}) || "y" in (changes ?? {})) ) return;
    clearTimeout(waits.get(doc.id));
    waits.set(doc.id, setTimeout(() => { waits.delete(doc.id); watchRivals(doc).catch(e => console.error(`${MOD} | rivalry`, e)); }, 1100));
  }

  /* ------------------------------------------------------------------ */
  /*  The Storyteller's window                                           */
  /* ------------------------------------------------------------------ */

  async function editRows() {
    if ( !game.user.isGM ) return null;
    const cur = setting("rivalryRows") ?? {off: [], extra: ""}, off = new Set(cur.off ?? []), y = year();
    const span = r => `${r.from ?? 1197} to ${r.to ?? "the Future Darkness"}`;
    const step = s => (s ? `${RV.stepWord(s)} (${s})` : "none");
    const items = RV.RIVALRIES.map(r => `<label class="wnpc-check" data-search-item data-search-text="${esc(`${r.a} ${r.b} ${r.note}`)}"><input type="checkbox" name="on.${esc(r.id)}"${off.has(r.id) ? "" : " checked"}/> `
      + `<b>${esc(r.note)}</b> <span class="wodx-quiet">${esc(span(r))}; ${esc(step(r.ab))}, back ${esc(step(r.ba))}${RV.inForce(r, y) ? "; in force now" : ""}</span></label>`).join("");
    const search = searchBox(".wnpc-rivals", "Search the rivalries…", "Search the rivalries");
    const content = `<div class="wnpc-edit-form"><p class="wodx-quiet">Rival sides who meet and know each other for what they are may come to blows. Untick a rivalry to switch it off in this chronicle. A faction standing you set, or a Rivals line on an NPC, wins over these.</p>
      ${search}<div class="wodx-scroll wnpc-rivals" style="max-height:320px">${items}</div>
      <fieldset><legend>Your own rivalries</legend><textarea name="extra" rows="3" style="width:100%" placeholder="sect:sabbat > clan:ventrue: -2 / -1, 1500-1700, an old feud">${esc(cur.extra ?? "")}</textarea>
      <p class="wodx-quiet">One a line: a side, &gt;, a side, a colon, how the first regards the second (-1 to -3), then / and the other way, the years, and why.</p></fieldset></div>`;
    const data = await foundry.applications.api.DialogV2.wait({window: {title: "Rivalries", resizable: true}, classes: ["wodx-dialog", "wodx-npc-dialog"], position: {width: 620, height: "auto"}, content,
      buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => new foundry.applications.ux.FormDataExtended(b.form).object}, {action: "cancel", label: "Cancel"}], rejectClose: false});
    if ( !data || data === "cancel" ) return null;
    const next = {off: RV.RIVALRIES.filter(r => !data[`on.${r.id}`]).map(r => r.id), extra: String(data.extra ?? "").trim().slice(0, 4000)};
    const bad = RV.parseExtraRows(next.extra).problems;
    if ( bad.length ) ui.notifications.warn(`Rivalries: ${bad.slice(0, 3).join(" ")}`);
    await game.settings.set(MOD, "rivalryRows", next);
    return next;
  }

  function hooks() { Hooks.on("updateToken", onTokenMoved); }

  return {registerSettings, hooks, sidesOf, knownTo, regardOf, seedFor, checkPair, watchRivals, editRows, rules: RV};
}
