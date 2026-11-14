/**
 * WoDX NPC: cults and congregations that gather around a character, the Foundry side (B3240-B3249). The rules are
 * in cult-rules.mjs.
 *
 *   Awe       actor flag wodx-npc.awe = {v, places: {<scene uuid>: {key, name, pts, themes, touched, last, asked, log}}}.
 *             Written on the active Storyteller's client from: words spoken in character in chat where NPCs can hear
 *             (setting cultWords), a sermon from the Following window (a roll), a power worked in sight (hook
 *             wodxPowerShown), a breach seen (wodxBreach), a willing feeding (wodxFed) and a social win (wodxSocial).
 *   Forming   awe of 10 heard by 3 puts "A following gathers" in the approval queue; the founder may ask from 5.
 *   Cults     world setting wodx-npc.cults: [Cult] (cult-rules normCult). A weekly turn runs when the clock passes a
 *             week (and after a skip); small changes are applied with a Storyteller card, a raid or a schism waits in
 *             the approval queue. Crossing into "people talk" starts a rumour in WoDX Storyteller's rumour mill;
 *             "watched" fires the hook wodxCultNoticed({cult, band}) for anything that hunts cults.
 *   NPCs      once a month of world time an NPC whose kind gathers cults (Setites, Devils, Ecstatics, the Reborn, a
 *             preacher...) with a place of its own may found one (approval queue). Its cult is tended by itself.
 *   Window    "Your following" (token tools, or api.cults.open(actor)): the character's awe by place, its cults, and
 *             Preach, Hold a gathering, Ask for a following and, for the Storyteller, Initiate and Ordain.
 * Players act by socket; the Storyteller's client writes. Everything is off until the world setting cultsOn is set.
 */
import * as C from "./cult-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

export function build(ctx) {
  const {MOD, esc, gmIds, isActiveGM, chron} = ctx;
  const SOCKET = `module.${MOD}`;
  const T = {form: `${MOD}.cultForms`, npc: `${MOD}.cultNpc`, split: `${MOD}.cultSplit`, raid: `${MOD}.cultRaid`};
  const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };
  const on = () => setting("cultsOn") === true;
  const now = () => Number(game.time?.worldTime) || 0;
  const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 0; } catch (e) { return 0; } };
  const st = () => (game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api : null);
  const worldActor = a => { const x = a?.actor ?? a; if ( !x ) return null; if ( typeof x === "string" ) return x.startsWith("Actor.") ? fromUuidSync(x) : game.actors.get(x); return x.isToken ? (x.baseActor ?? game.actors.get(x.id)) : (game.actors.get(x.id) ?? x); };
  const actorFromUuid = u => { try { const d = u ? fromUuidSync(u) : null; return worldActor(d?.actor ?? d); } catch (e) { return null; } };

  function registerSettings() {
    game.settings.register(MOD, "cultsOn", {name: "Cults that gather around characters", hint: "Words spoken in character where people can hear, sermons, powers seen and feedings build awe in a place; enough of it and a following gathers (approval queue). Cults grow, lose heart and draw notice each week of world time. Off until the Storyteller turns it on.",
      scope: "world", config: true, type: Boolean, default: false});
    game.settings.register(MOD, "cultWords", {name: "Cults: words in chat count", hint: "In-character chat lines with words of faith, blood, power or doom add awe when NPCs are near enough to hear. Off: only sermons and deeds count.",
      scope: "world", config: true, type: Boolean, default: true});
    game.settings.register(MOD, "npcCults", {name: "Cults: NPCs found their own", hint: "Once a month an NPC whose kind gathers followers (a Setite, a Devil, an Ecstatic, one of the Reborn, a preacher) may found a cult. Each one waits in the approval queue.",
      scope: "world", config: true, type: Boolean, default: true});
    game.settings.register(MOD, "cults", {scope: "world", config: false, type: Array, default: []});
    game.settings.register(MOD, "cultState", {scope: "world", config: false, type: Object, default: {lastTurn: 0, lastNpc: 0}});
  }

  const list = () => { const v = setting("cults"); return Array.isArray(v) ? v.map(C.normCult) : []; };
  async function save(next) { await game.settings.set(MOD, "cults", next.map(C.normCult)); }
  async function mutate(fn) { const cur = list(); const next = await fn(cur); if ( next ) await save(next); return next; }
  const byFounder = id => list().filter(c => c.founder?.id === id && !c.ended);

  /* ---- What an actor is ---- */
  const kindName = a => { try { return String(game.modules.get("wodx-combat")?.api?.getKind?.(a) ?? "").toLowerCase(); } catch (e) { return ""; } };
  function lineOf(a) {
    const t = String(a?.type ?? ""), k = kindName(a), s = `${t} ${k}`.toLowerCase();
    if ( /kuei|cathayan/.test(s) ) return "kuei-jin";
    if ( /vampire|kindred/.test(s) ) return "vampire";
    if ( /mummy|amenti|reborn/.test(s) ) return "mummy";
    if ( /demon|fallen/.test(s) ) return "demon";
    if ( /werewolf|changing breed|garou|fera/.test(s) ) return "werewolf";
    if ( /changeling|kithain/.test(s) ) return "changeling";
    if ( /wraith/.test(s) ) return "wraith";
    if ( /\bmage|sorcer/.test(s) ) return "mage";
    if ( /hunter|inquisitor/.test(s) ) return "hunter";
    return "mortal";
  }
  /** What the actor is, as text, for the NPC cult-makers: type, kind, name and the splat fields. */
  function whatText(a) {
    const s = a?.system ?? {};
    const bits = [a?.type, kindName(a), a?.name, s.clan, s.tribe, s.tradition, s.house, s.kith, s.auspice, s.creed, s.guild, s.dynasty, s.custom?.clan, s.custom?.tribe, s.custom?.tradition, a?.flags?.[MOD]?.archetype];
    return bits.filter(x => typeof x === "string" && x).map(x => { try { return `${x} ${game.i18n.localize(x)}`; } catch (e) { return x; } }).join(" ");
  }
  const kindFor = a => {
    const own = a?.flags?.[MOD]?.cultKind;
    if ( own && C.CULT_KINDS[own] ) return own;
    const npc = !a?.hasPlayerOwner ? C.npcCultKind(whatText(a), yearNow()) : null;
    if ( npc?.kind === "wyrm" ) return "wyrm";
    return C.kindForLine(lineOf(a));
  };
  const undying = a => ["vampire", "mummy", "demon", "kuei-jin", "wraith"].includes(lineOf(a));

  /* ---- Places and who can hear ---- */
  const tokenOf = (a, scene = canvas?.scene) => (a?.token ?? scene?.tokens?.find?.(t => t.actorId === a?.id) ?? game.scenes?.find?.(sc => sc.tokens?.some?.(t => t.actorId === a?.id))?.tokens?.find?.(t => t.actorId === a?.id)) ?? null;
  const placeOf = tok => { const sc = tok?.parent; return sc ? {key: sc.uuid, name: sc.name} : null; };
  const populationOf = key => { try { const sc = fromUuidSync(key); return Number(sc?.flags?.[MOD]?.settlement?.population ?? sc?.flags?.["wodx-npc"]?.population) || 0; } catch (e) { return 0; } };
  /** NPCs (not player characters) near enough to hear the speaker: 12 grid units on the same scene. */
  function audience(tok, reach = 12) {
    const sc = tok?.parent;
    if ( !sc ) return 0;
    const size = Number(sc.grid?.size) || 100;
    let count = 0;
    for ( const t of sc.tokens ?? [] ) {
      if ( t.id === tok.id || !t.actor || t.actor.hasPlayerOwner || t.actorId === tok.actorId ) continue;
      const d = Math.hypot((t.x ?? 0) - (tok.x ?? 0), (t.y ?? 0) - (tok.y ?? 0)) / size;
      if ( d <= reach ) count++;
    }
    return count;
  }

  /* ---- Awe ---- */
  const aweOf = a => C.normAwe(a?.flags?.[MOD]?.awe ?? {});
  // Places are keyed by scene uuid ("Scene.abc"); a flag update would split such keys at the dot, so the flag keeps
  // the places as a list and normAwe keys them again on reading (B3241)
  const saveAwe = (a, awe) => a.setFlag(MOD, "awe", {v: awe.v, places: Object.values(awe.places ?? {})});
  /**
   * Active Storyteller: add a deed to an actor's awe. deed: {kind, place?, heard?, themes?, pts?, text?, token?}.
   * Without a place, the actor's token's scene; without heard, the NPCs near it.
   */
  async function addDeed(actorLike, deed = {}) {
    const a = worldActor(actorLike);
    if ( !on() || !isActiveGM() || !a ) return null;
    if ( !a.hasPlayerOwner && !C.npcCultKind(whatText(a), yearNow()) && !byFounder(a.id).length ) return null;
    const tok = deed.token ?? tokenOf(a);
    const place = deed.place ?? placeOf(tok);
    if ( !place ) return null;
    const heard = deed.heard ?? audience(tok);
    const t = now();
    const res = C.addAwe(aweOf(a), {...deed, place, heard}, t);
    if ( !res.place ) return null;
    await saveAwe(a, res.awe);
    // A cult the actor already leads here takes it as attention
    const mine = byFounder(a.id).find(c => c.place?.key === place.key);
    if ( mine && res.added > 0 ) await mutate(cur => cur.map(c => (c.id === mine.id ? {...c, attention: c.attention + res.added, themes: mergeThemes(c.themes, deed.themes)} : c)));
    else if ( !mine ) await maybeForm(a, res.place);
    return res;
  }
  const mergeThemes = (a = {}, b = {}) => { const o = {...a}; for ( const [k, v] of Object.entries(b ?? {}) ) if ( C.THEMES[k] ) o[k] = (o[k] ?? 0) + Number(v || 0); return o; };

  async function maybeForm(a, place, {asked = false} = {}) {
    const ready = C.readiness(place, now());
    if ( !(ready === "form" || (asked && ready)) ) return false;
    if ( place.asked && now() - place.asked < 14 * C.DAY && !asked ) return false;
    const kind = kindFor(a);
    const doctrine = C.doctrineOf(place.themes, kind);
    const y = yearNow();
    await chron()?.propose?.({type: T.form, key: `cult-form:${a.id}:${place.key}`, title: `${C.CULT_KINDS[kind].word(y)} gathers around ${a.name} at ${place.name}`,
      detail: `${C.creedText(doctrine, a.name)} Awe ${place.pts} from ${place.touched} people.${asked ? " The founder asked for it." : ""}`,
      data: {actorId: a.id, place: {key: place.key, name: place.name}, kind}});
    const awe = aweOf(a);
    if ( awe.places[place.key] ) { awe.places[place.key].asked = now(); await saveAwe(a, awe); }
    return true;
  }

  async function createFrom(actorId, place, kind, {npc = false, name = ""} = {}) {
    const a = game.actors.get(actorId);
    if ( !a ) return null;
    const awe = aweOf(a);
    const p = awe.places[place.key] ?? C.normPlace({key: place.key, name: place.name, pts: C.FORM_AT, touched: 5, themes: Object.fromEntries((C.CULT_KINDS[kind]?.favours ?? []).map((t, i) => [t, 3 - i]))});
    const cult = C.newCult({id: foundry.utils.randomID(), founder: {id: a.id, name: a.name, npc}, kind, place, awePlace: p, now: now(), year: yearNow(), name});
    await mutate(cur => [...cur, cult]);
    if ( awe.places[place.key] ) { awe.places[place.key] = {...awe.places[place.key], pts: 0}; await saveAwe(a, awe); }
    await card(`<p><b>${esc(cult.name)}</b>: ${esc(cult.log.at(-1)?.text ?? "")}</p>`);
    Hooks.callAll("wodxCultFormed", {cult, founder: a});
    return cult;
  }

  function registerHandler() {
    const reg = chron()?.registerApprovalHandler;
    if ( !reg ) return;
    reg(T.form, {label: "A following gathers", approve: async e => { const c = await createFrom(e.data.actorId, e.data.place, e.data.kind); return c ? `${c.name} founded` : "The founder is gone"; }, reject: async () => "No following gathers"});
    reg(T.npc, {label: "An NPC gathers a cult", approve: async e => { const c = await createFrom(e.data.actorId, e.data.place, e.data.kind, {npc: true}); return c ? `${c.name} founded` : "The NPC is gone"; }, reject: async () => "No cult"});
    reg(T.split, {label: "A cult splits", approve: async e => {
      let made = null;
      await mutate(cur => { const i = cur.findIndex(c => c.id === e.data.cultId); if ( i < 0 ) return null; const s = C.split(cur[i], {id: foundry.utils.randomID(), now: now()}); made = s.rival; const out = [...cur]; out[i] = s.rest; out.push(s.rival); return out; });
      return made ? `${made.name} breaks away` : "The cult is gone";
    }, reject: async () => "They hold together"});
    reg(T.raid, {label: "A cult is raided", approve: async e => {
      await mutate(cur => cur.map(c => (c.id === e.data.cultId ? C.raided(c, {now: now()}) : c)));
      return "Raided";
    }, reject: async () => "Nobody moves yet"});
  }

  async function card(html) {
    await ChatMessage.create({content: `<div class="wodx-card wnpc-cult-card"><h3><i class="fa-solid fa-hands-praying"></i> Cults</h3>${html}</div>`, whisper: gmIds(), speaker: {alias: "WoDX NPC"}});
  }

  /* ---- The weekly turn ---- */
  const founderOf = c => (c.founder?.id ? game.actors.get(c.founder.id) : null);
  const founderGone = c => { const a = founderOf(c); if ( !a ) return true; return !!(a.flags?.["wodx-creation"]?.archived || a.statuses?.has?.("dead")); };

  async function runTurns({forced = false} = {}) {
    if ( !on() || !isActiveGM() ) return [];
    const stt = foundry.utils.duplicate(setting("cultState") ?? {});
    const t = now();
    if ( !stt.lastTurn ) { stt.lastTurn = t; await game.settings.set(MOD, "cultState", stt); if ( !forced ) return []; }
    const {due, quiet} = forced ? {due: 1, quiet: 0} : C.turnsDue(stt.lastTurn, t);
    if ( !due && !quiet ) return [];
    const y = yearNow(), out = [], cards = [];
    const cur = list();
    const next = [];
    for ( let c of cur ) {
      if ( c.ended ) { next.push(c); continue; }
      const gone = founderGone(c);
      const auto = c.founder?.npc && !gone ? 2 : 0;
      const lines = [];
      for ( let i = 0; i < due; i++ ) {
        const r = C.cultTurn(c, {now: t, year: y, population: populationOf(c.place?.key), founderGone: gone, attention: (i === 0 ? c.attention : 0) + auto});
        c = r.cult;
        for ( const ev of r.events ) {
          lines.push(ev.text);
          if ( ev.kind === "band" ) await onBand(c, ev.band);
          if ( ev.kind === "split" ) await chron()?.propose?.({type: T.split, key: `cult-split:${c.id}`, title: `${c.name} may split`, detail: ev.text, data: {cultId: c.id}});
        }
        if ( c.ended ) break;
      }
      if ( quiet ) c = C.quietYears(c, quiet, {undying: undying(founderOf(c)), founderGone: gone, now: t});
      next.push(c);
      if ( lines.length ) cards.push(`<p><b>${esc(c.name)}</b>: ${lines.map(esc).join(" ")}</p>`);
      out.push(c);
    }
    await save(next);
    stt.lastTurn = t;
    await game.settings.set(MOD, "cultState", stt);
    if ( cards.length ) await card(cards.join(""));
    await npcMonth().catch(e => console.error(`${MOD} | NPC cults`, e));
    return out;
  }

  async function onBand(c, band) {
    if ( band === "talk" ) {
      try { await st()?.rumours?.start?.({text: `People whisper about ${C.CULT_KINDS[c.kind].word(yearNow())} meeting at ${c.place?.name ?? "the edge of town"}.`, about: c.founder?.id ? {kind: "actor", id: c.founder.id} : null, truth: "true"}); } catch (e) { /* rumours off */ }
    }
    if ( band === "watched" || band === "moved" ) Hooks.callAll("wodxCultNoticed", {cult: c, band});
    if ( band === "moved" ) await chron()?.propose?.({type: T.raid, key: `cult-raid:${c.id}`, title: `Someone moves against ${c.name}`, detail: "The town's watch, the Church, hunters or a rival raid the meeting place. Approve to raid: half are taken or scattered, faith shaken.", data: {cultId: c.id}});
  }

  /** Once a month: cultish NPCs with a place and no cult may found one. */
  async function npcMonth() {
    if ( !on() || setting("npcCults") === false || !isActiveGM() ) return 0;
    const stt = foundry.utils.duplicate(setting("cultState") ?? {});
    const t = now();
    if ( stt.lastNpc && t - stt.lastNpc < 30 * C.DAY ) return 0;
    const first = !stt.lastNpc;
    stt.lastNpc = t;
    await game.settings.set(MOD, "cultState", stt);
    if ( first ) return 0;
    let n = 0;
    const y = yearNow();
    for ( const a of game.actors ?? [] ) {
      if ( a.hasPlayerOwner || byFounder(a.id).length ) continue;
      const hit = C.npcCultKind(whatText(a), y);
      if ( !hit || Math.random() >= C.NPC_FOUND_CHANCE ) continue;
      const tok = tokenOf(a), place = placeOf(tok);
      if ( !place ) continue;
      await chron()?.propose?.({type: T.npc, key: `cult-npc:${a.id}`, title: `${a.name} gathers ${C.CULT_KINDS[hit.kind].word(y)}`, detail: `${hit.why}, at ${place.name}.`, data: {actorId: a.id, place, kind: hit.kind}});
      n++;
    }
    return n;
  }

  /* ---- Player acts: preach, gather, ask, ordain (socket to the Storyteller) ---- */
  const POOLS = {leadership: "Charisma + Leadership", expression: "Charisma + Expression", performance: "Charisma + Performance", empathy: "Charisma + Empathy", intimidation: "Manipulation + Intimidation"};
  function poolOf(a, key) {
    const s = a?.system ?? {};
    const at = key === "intimidation" ? "manipulation" : "charisma";
    const av = Number(s.attributes?.[at]?.total ?? s.attributes?.[at]?.value) || 0;
    let ab = Number(s.abilities?.[key]?.value);
    if ( !Number.isFinite(ab) ) ab = Number(a?.items?.find?.(i => i.name?.toLowerCase?.() === key)?.system?.value) || 0;
    return Math.max(1, av + ab);
  }
  async function rollPool(dice, diff = 6) {
    const r = await new Roll(`${Math.max(1, dice)}d10`).evaluate();
    const faces = r.dice[0]?.results?.map(x => x.result) ?? [];
    const hits = faces.filter(f => f >= diff).length, ones = faces.filter(f => f === 1).length;
    return {roll: r, faces, net: hits - ones, botch: hits === 0 && ones > 0};
  }

  /** A sermon: the words count by their themes; the roll by its successes (two awe each). Storyteller's client. */
  async function preach({actorId, text = "", pool = "leadership", userId = null} = {}) {
    const a = game.actors.get(actorId);
    if ( !a || !on() ) return null;
    if ( !isActiveGM() ) { game.socket.emit(SOCKET, {type: "cult.preach", actorId, text, pool, userId: game.user.id}); return null; }
    const tok = tokenOf(a), place = placeOf(tok);
    if ( !place ) { await card(`<p>${esc(a.name)} preached, but has no token on a scene to preach from.</p>`); return null; }
    const heard = audience(tok);
    const r = await rollPool(poolOf(a, pool), 6);
    const pts = r.botch ? 0 : Math.max(0, r.net) * 2;
    const res = await addDeed(a, {kind: "sermon", token: tok, place, heard: Math.max(heard, r.net > 0 ? 1 : 0), pts, themes: C.themesOf(text), text: String(text).slice(0, 160)});
    const mine = byFounder(a.id).find(c => c.place?.key === place.key);
    if ( r.botch && mine ) await mutate(cur => cur.map(c => (c.id === mine.id ? {...c, exposure: Math.min(C.MAX_EXPOSURE, c.exposure + 2), log: [...c.log, {at: now(), text: "A sermon went wrong in front of outsiders."}]} : c)));
    await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor: a}), whisper: [...gmIds(), ...(userId ? [userId] : [])],
      content: `<div class="wodx-card wnpc-cult-card"><p><b>${esc(a.name)} preaches</b> (${esc(POOLS[pool] ?? pool)}, difficulty 6): ${r.faces.join(", ")}. ${r.botch ? "A botch: the crowd turns away." : r.net > 0 ? `${r.net} ${r.net === 1 ? "success" : "successes"}: ${pts} awe from ${heard} ${heard === 1 ? "listener" : "listeners"}.` : "They listen, but nothing takes hold."}</p></div>`});
    return res;
  }
  /** A gathering of a cult: counts as attention (two for each), and says what the gathered cult gives now. */
  async function gather({cultId, userId = null} = {}) {
    if ( !on() ) return null;
    if ( !isActiveGM() ) { game.socket.emit(SOCKET, {type: "cult.gather", cultId, userId: game.user.id}); return null; }
    let got = null;
    await mutate(cur => cur.map(c => { if ( c.id !== cultId ) return c; got = {...c, attention: c.attention + 2, log: [...c.log, {at: now(), text: "A gathering was held."}]}; return got; }));
    if ( !got ) return null;
    const s = C.summary(got, yearNow());
    await ChatMessage.create({whisper: [...gmIds(), ...(userId ? [userId] : [])], speaker: {alias: got.name},
      content: `<div class="wodx-card wnpc-cult-card"><p><b>${esc(got.name)} gathers</b>: ${esc(s.members)} ${esc(C.CULT_KINDS[got.kind].members)}, devotion ${s.devotion}. ${esc(s.gives)} <span class="wodx-quiet">(${esc(s.ref)})</span></p></div>`});
    return got;
  }
  async function ask({actorId, placeKey} = {}) {
    if ( !on() ) return false;
    if ( !isActiveGM() ) { game.socket.emit(SOCKET, {type: "cult.ask", actorId, placeKey, userId: game.user.id}); return null; }
    const a = game.actors.get(actorId);
    const p = a ? aweOf(a).places[placeKey] : null;
    return p ? maybeForm(a, C.faded(p, now()), {asked: true}) : false;
  }
  async function ordain(cultId, actorLike, rank = "ordained") {
    const m = worldActor(actorLike);
    if ( !game.user.isGM || !m ) return null;
    let ok = null;
    await mutate(cur => cur.map(c => { if ( c.id !== cultId ) return c; const r = C.ordain(c, {id: m.id, name: m.name}, rank); ok = r; return r ?? c; }));
    if ( !ok ) ui.notifications?.warn?.("No room in the inner circle: one for every ten members.");
    return ok;
  }
  async function dissolve(cultId, why = "Dissolved by the Storyteller") {
    if ( !game.user.isGM ) return null;
    await mutate(cur => cur.map(c => (c.id === cultId ? {...c, ended: {at: now(), why}} : c)));
    return true;
  }

  /* ---- Words in chat ---- */
  const wordsCap = new Map();
  async function onChat(msg) {
    if ( !on() || setting("cultWords") === false || !isActiveGM() ) return;
    if ( msg.whisper?.length || msg.isRoll || msg.rolls?.length ) return;
    const sp = msg.speaker ?? {};
    if ( !sp.actor || !sp.token ) return;
    const scene = game.scenes.get(sp.scene);
    const tok = scene?.tokens?.get(sp.token);
    const a = worldActor(tok?.actor ?? game.actors.get(sp.actor));
    if ( !a || !tok ) return;
    const themes = C.themesOf(msg.content);
    if ( !Object.keys(themes).length ) return;
    // At most three words-points an hour of world time for one speaker in one place
    const k = `${a.id}|${scene.uuid}|${Math.floor(now() / 3600)}`;
    const used = wordsCap.get(k) ?? 0;
    if ( used >= 3 ) return;
    wordsCap.set(k, used + 1);
    if ( wordsCap.size > 500 ) wordsCap.clear();
    await addDeed(a, {kind: "words", token: tok, themes, text: String(msg.content ?? "").replace(/<[^>]*>/g, " ").slice(0, 160)});
  }

  function hooks() {
    Hooks.on("createChatMessage", msg => { onChat(msg).catch(e => console.error(`${MOD} | cults words`, e)); });
    Hooks.on("wodxPowerShown", (actor, info = {}) => {
      if ( !isActiveGM() ) return;
      addDeed(actor, {kind: "power", themes: {[C.powerTheme(info.power ?? "", info.group ?? "")]: 2}, text: info.power ?? ""}).catch(e => console.error(`${MOD} | cults`, e));
    });
    Hooks.on("wodxBreach", p => {
      if ( !isActiveGM() || !p?.by?.uuid ) return;
      const n = Number(p.entry?.witnesses?.length ?? p.entry?.seen?.length) || 1;
      addDeed(actorFromUuid(p.by.uuid), {kind: "breach", heard: n, themes: {doom: 1, power: 1}, text: String(p.entry?.event ?? p.entry?.text ?? "")}).catch(e => console.error(`${MOD} | cults`, e));
    });
    Hooks.on("wodxFed", p => {
      if ( !isActiveGM() || !p?.willing || !p?.by?.uuid ) return;
      addDeed(actorFromUuid(p.by.uuid), {kind: "fed", heard: 1, text: `fed on ${p.vessel?.name ?? "someone"}`}).catch(e => console.error(`${MOD} | cults`, e));
    });
    Hooks.on("wodxSocial", p => {
      if ( !isActiveGM() || p?.result !== "win" || !p?.actor ) return;
      const theme = C.SOCIAL_THEMES[p.act];
      addDeed(p.actor, {kind: "social", heard: 1, themes: theme ? {[theme]: 1} : {}, text: p.act}).catch(e => console.error(`${MOD} | cults`, e));
    });
    Hooks.on("wodxSkipEnd", () => { if ( isActiveGM() ) runTurns().catch(e => console.error(`${MOD} | cults`, e)); });
    let wait = null;
    Hooks.on("updateWorldTime", () => {
      if ( !isActiveGM() || !on() ) return;
      clearTimeout(wait);
      wait = setTimeout(() => runTurns().catch(e => console.error(`${MOD} | cults`, e)), 1500);
    });
    Hooks.once("ready", () => {
      game.socket.on(SOCKET, async m => {
        if ( !isActiveGM() || !m?.type?.startsWith?.("cult.") ) return;
        const u = game.users.get(m.userId);
        const owns = id => { const a = game.actors.get(id); return !!a && !!u && a.testUserPermission(u, "OWNER"); };
        try {
          if ( m.type === "cult.preach" && owns(m.actorId) ) await preach({actorId: m.actorId, text: m.text, pool: m.pool, userId: m.userId});
          else if ( m.type === "cult.ask" && owns(m.actorId) ) await ask({actorId: m.actorId, placeKey: m.placeKey});
          else if ( m.type === "cult.gather" ) { const c = list().find(x => x.id === m.cultId); if ( c?.founder?.id && owns(c.founder.id) ) await gather({cultId: m.cultId, userId: m.userId}); }
        } catch (e) { console.error(`${MOD} | cults`, e); }
      });
    });
  }

  /* ---- The window ---- */
  function bodyHtml(a) {
    const y = yearNow(), t = now();
    const places = !a ? [] : Object.values(aweOf(a).places).map(p => C.faded(p, t)).filter(p => p.pts > 0 || p.touched > 0).sort((x, z) => z.pts - x.pts);
    const placeRows = places.map(p => {
      const ready = C.readiness(p, t);
      const doc = C.doctrineOf(p.themes, kindFor(a)).map(k => C.THEMES[k].label).join(", ");
      return `<div class="wnpc-cult-place" data-search-item><p><b>${esc(p.name)}</b>: awe ${esc(p.pts)}, heard by ${esc(p.touched)}${doc ? `. They speak of ${esc(doc)}` : ""}.</p>
        ${ready && !byFounder(a.id).some(c => c.place?.key === p.key) ? `<button type="button" data-ask="${esc(p.key)}"><i class="fa-solid fa-hand-holding-heart"></i> Ask for a following here</button>` : ""}</div>`;
    }).join("");
    const cults = (!a ? list() : list().filter(c => c.founder?.id === a.id)).filter(c => !c.ended);
    const cultRows = cults.map(c => {
      const s = C.summary(c, y);
      return `<div class="wnpc-cult" data-search-item><p><b>${esc(c.name)}</b>${!a ? ` (${esc(c.founder?.name ?? "no founder")})` : ""} <span class="wodx-quiet">${esc(s.word)}, ${esc(s.size)} at ${esc(c.place?.name ?? "no place")}</span></p>
        <p>${esc(s.members)} ${esc(C.CULT_KINDS[c.kind].members)}. Devotion ${s.devotion} of 5.${game.user.isGM ? ` Exposure: ${esc(s.band)} (${s.exposure}).` : ""}</p>
        <p>${esc(s.creed)}</p>
        <p>${esc(s.gives)} <span class="wodx-quiet">(${esc(s.bg)}; ${esc(s.ref)})</span></p>
        <p>Inner circle${s.room ? ` (room for ${s.room})` : ""}: ${s.inner.length ? s.inner.map(esc).join(", ") : "none yet"}${s.initiates.length ? `. Initiates: ${s.initiates.map(esc).join(", ")}` : ""}.</p>
        <div class="wnpc-cult-btns"><button type="button" data-gather="${esc(c.id)}"><i class="fa-solid fa-people-roof"></i> Hold a gathering</button>
        ${game.user.isGM ? `<button type="button" data-ordain="${esc(c.id)}"><i class="fa-solid fa-user-plus"></i> Initiate or ordain the targeted NPC</button> <button type="button" data-end="${esc(c.id)}"><i class="fa-solid fa-ban"></i> Dissolve</button>` : ""}</div></div>`;
    }).join("");
    return `<div class="wnpc-cults-wrap">${(places.length + cults.length) > 5 ? searchBox(".wnpc-cults-rows", "Search places and cults…", "Search places and cults") : ""}
      <div class="wnpc-cults-rows">
      ${a ? `<h4>Where people speak of ${esc(a.name)}</h4>${placeRows || `<p>No one speaks of ${esc(a.name)} yet. Words spoken in character where people can hear, sermons, powers seen and feedings all count.</p>`}` : ""}
      <h4>${a ? "Followings" : "Every cult in the chronicle"}</h4>${cultRows || "<p>None yet.</p>"}</div>
      ${a ? `<p><button type="button" data-preach="1"><i class="fa-solid fa-bullhorn"></i> Preach to the people here…</button></p>` : ""}
      ${!a && game.user.isGM ? `<p><button type="button" data-turn="1"><i class="fa-solid fa-forward-step"></i> Run a cult turn now</button></p>` : ""}
      ${on() ? "" : `<p class="wodx-quiet">Cults are switched off in this world (Storyteller setting).</p>`}</div>`;
  }

  async function preachDialog(a) {
    const D = foundry.applications.api.DialogV2;
    const opts = Object.entries(POOLS).map(([k, v]) => `<option value="${k}">${esc(v)} (${poolOf(a, k)} dice)</option>`).join("");
    const r = await D.prompt({window: {title: `Preach: ${a.name}`}, classes: ["wodx-dialog"], rejectClose: false,
      content: `<p>What does ${esc(a.name)} tell the people here? The words shape what a following would believe.</p>
        <textarea name="text" rows="5" style="width:100%"></textarea>
        <p><label>Roll <select name="pool" data-fixed>${opts}</select></label> at difficulty 6. Each success is two awe, if anyone is near enough to hear.</p>`,
      ok: {label: "Preach", callback: (ev, btn) => ({text: btn.form.elements.text.value, pool: btn.form.elements.pool.value})}});
    if ( !r ) return null;
    return preach({actorId: a.id, text: r.text, pool: r.pool});
  }

  async function open(actorLike) {
    let a = worldActor(actorLike) ?? worldActor(canvas?.tokens?.controlled?.[0]?.actor) ?? game.user.character ?? null;
    if ( !a && !game.user.isGM ) a = game.actors.find(x => x.isOwner && x.hasPlayerOwner) ?? null;
    if ( !a && !game.user.isGM ) return ui.notifications.warn("Pick a character: select its token first.");
    if ( a && !game.user.isGM && !a.isOwner ) return ui.notifications.warn("You can see the following of your own characters only.");
    const D = foundry.applications.api.DialogV2;
    const dlg = new D({window: {title: a ? `Following: ${a.name}` : "Cults and followings", icon: "fa-solid fa-hands-praying", resizable: true}, classes: ["wodx-dialog", "wodx-npc-dialog", "wnpc-cults-dialog"],
      position: {width: 580, height: "auto"}, content: bodyHtml(a), buttons: [{action: "close", label: "Close", default: true}], rejectClose: false});
    await dlg.render(true);
    const redraw = () => { const box = dlg.element?.querySelector(".wnpc-cults-wrap"); if ( box ) box.outerHTML = bodyHtml(a); };
    const h1 = Hooks.on("updateActor", x => { if ( a && x.id === a.id ) setTimeout(redraw, 200); });
    const h2 = Hooks.on("updateSetting", s => { if ( s.key === `${MOD}.cults` ) setTimeout(redraw, 200); });
    Hooks.once("closeDialogV2", app => { if ( app === dlg ) { Hooks.off("updateActor", h1); Hooks.off("updateSetting", h2); } });
    dlg.element?.addEventListener("click", async ev => {
      const b = ev.target.closest("button[data-ask],button[data-gather],button[data-ordain],button[data-end],button[data-preach],button[data-turn]");
      if ( !b ) return;
      ev.preventDefault();
      b.disabled = true;
      try {
        if ( b.dataset.turn ) await runTurns({forced: true});
        else if ( b.dataset.preach ) await preachDialog(a);
        else if ( b.dataset.ask ) { await ask({actorId: a.id, placeKey: b.dataset.ask}); ui.notifications.info("Asked: the Storyteller will see it in the approval queue."); }
        else if ( b.dataset.gather ) await gather({cultId: b.dataset.gather});
        else if ( b.dataset.ordain ) {
          const t = [...(game.user.targets ?? [])][0]?.actor;
          if ( !t ) ui.notifications.warn("Target the NPC to initiate or ordain first.");
          else {
            const rank = await D.wait({window: {title: "Initiate or ordain"}, content: `<p>${esc(t.name)}: an initiate, or ordained into the inner circle?</p>`, rejectClose: false,
              buttons: [{action: "initiate", label: "Initiate"}, {action: "ordained", label: "Ordain", default: true}]});
            if ( rank ) await ordain(b.dataset.ordain, t, rank);
          }
        } else if ( b.dataset.end ) await dissolve(b.dataset.end);
      } finally { b.disabled = false; setTimeout(redraw, 400); }
    });
    return dlg;
  }

  return {registerSettings, registerHandler, hooks, open, addDeed, preach, gather, ask, ordain, dissolve, runTurns, npcMonth, list, aweOf, audience, kindFor, lineOf, rules: C, types: T};
}
