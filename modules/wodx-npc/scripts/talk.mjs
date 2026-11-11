/**
 * WoDX NPC 0.12.0: the topic menu. A player targets someone the Storyteller plays (or nobody, for the nearest in reach), stands close, and presses Talk
 * (the token tools, or Talk in WoDX Actions). A window lists what this person can be asked; the player picks a
 * topic and the person answers with a line the Storyteller wrote (talk-rules.mjs has the format and the rules).
 *
 * Everything is decided on the active Storyteller's client: players' clients send the request by socket and get back
 * the menu and the answer, so a talk sheet never reaches a player. An NPC marked "ask me first" waits for the
 * Storyteller, who picks a line on a card (or sends nothing and speaks for them). Every answer is whispered to the
 * asking player and the Storyteller (or said aloud, when the line says so). What a line teaches can be undone from
 * the Storyteller's copy of the message.
 *
 *   flags.wodx-npc.topics   [topics]  on a player character: what they have been taught to ask about
 *   setting wodx-npc.sharedTalk {key: text}  shared sheets: household:<name>, faction:<key>, scene:<id>, everyone
 *   flags.wodx-npc.talked   {pcId: worldTime}  on an NPC: when each character last talked to them (0.12.0)
 *
 * 0.12.0 adds more stock talk: what a mortal notices about the character, voices for kinds of people, small talk on
 * feasts, fasts and weather, rumours about the character, debts in the Ledger, remembering the last visit, farewells,
 * remarks while about a routine, cries of alarm and pain, and trade and social-roll lines for WoDX Actions (stock()).
 */
import * as TK from "./talk-rules.mjs";
import * as STOCK from "../data/stock-talk.mjs";
import * as MORE from "../data/stock-talk-more.mjs";
import * as F from "./faces-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

export function build(ctx) {
  const {MOD, esc, isActiveGM, chron, savedProfile} = ctx;
  const SOCKET = `module.${MOD}`;
  const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };
  const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
  const pending = new Map();
  let win = null; // {dlg, state}

  function registerSettings() {
    game.settings.register(MOD, "talkMenu", {name: "Players can talk to NPCs", hint: "Players target someone you play, stand close and press Talk to pick from topics. Every answer is a line you wrote on a talk sheet.",
      scope: "world", config: true, type: Boolean, default: true});
    game.settings.register(MOD, "talkReach", {name: "Talking distance, in squares", hint: "How close a character must stand to talk (1: side by side).",
      scope: "world", config: true, type: Number, default: 2, range: {min: 1, max: 10, step: 1}});
    game.settings.register(MOD, "sharedTalk", {scope: "world", config: false, type: Object, default: {}});
    game.settings.register(MOD, "stockTalk", {name: "Stock talk", hint: "When nothing you wrote fits, NPCs greet, gossip, pass on rumours they have heard and talk of news, work and the way, in words suited to the era and to how they regard the character. Your lines always come first.",
      scope: "world", config: true, type: Boolean, default: true});
    game.settings.register(MOD, "barks", {name: "NPCs remark and cry out", hint: "With stock talk on, NPCs say a word as they go about their routine, cry out when a place is raised or when they are hurt. Speech bubbles only, or in the chat as well.",
      scope: "world", config: true, type: String, default: "bubble", choices: {bubble: "Speech bubbles", chat: "Speech bubbles and chat", off: "Off"}});
  }

  /* ---------------- Who is talking to whom ---------------- */

  /** The world actor behind a token: taught topics and the codex belong to the character, not one unlinked token. */
  const baseActor = tok => (tok?.actorId ? game.actors.get(tok.actorId) : null) ?? tok?.actor ?? null;
  const owns = (user, actor) => !!actor && (user.isGM || actor.testUserPermission?.(user, "OWNER"));
  /** The asking character's token on this scene: one the user controls, else their character's. */
  function speakerToken(user = game.user, scene = canvas?.scene) {
    const ctl = (canvas?.tokens?.controlled ?? []).map(t => t.document).find(d => d?.actor && d.actor.hasPlayerOwner && owns(user, d.actor));
    if ( ctl ) return ctl;
    const ch = user.character;
    return ch ? (scene?.tokens?.contents ?? []).find(t => t.actorId === ch.id) ?? null : null;
  }
  const box = (t, scene) => { const g = scene?.grid?.size ?? 100; return {x: t.x, y: t.y, w: (t.width ?? 1) * g, h: (t.height ?? 1) * g}; };
  const reachOK = (me, npc, scene) => TK.squaresBetween(box(me, scene), box(npc, scene), scene?.grid?.size ?? 100) <= (Number(setting("talkReach")) || 2);
  /** Sight between the two, on the viewer's canvas (true when it cannot be tested here). */
  function canSee(me, npc) {
    try {
      if ( canvas?.scene?.id !== me.parent?.id || !me.object || !npc.object ) return true;
      const sight = CONFIG.Canvas.polygonBackends?.sight;
      return !sight?.testCollision?.(me.object.center, npc.object.center, {type: "sight", mode: "any"});
    } catch (e) { return true; }
  }

  /* ---------------- The Storyteller's side ---------------- */

  function factionKeysOf(actor) {
    try {
      const st = game.modules.get(MOD)?.api?.factions?.state?.();
      return (st?.factions ?? []).filter(f => (f.members ?? []).includes(actor.id) || f.leader === actor.id).map(f => String(f.key ?? f.name ?? "").toLowerCase()).filter(Boolean);
    } catch (e) { return []; }
  }
  function chainOf(npc, scene) {
    const p = savedProfile(npc);
    return TK.chainFor({own: p.talk ?? "", household: p.household ?? null, factions: factionKeysOf(npc), sceneId: scene?.id ?? null}, setting("sharedTalk") ?? {});
  }
  function knownOf(actor) {
    const codex = game.journal?.find(j => j.flags?.["wodx-storyteller"]?.codex === actor.id);
    return {learned: actor.flags?.[MOD]?.topics ?? [], codex: codex ? [...codex.pages].map(p => p.name) : []};
  }
  const checker = (actor, token) => { const W = chron()?.when; return W?.check ? when => W.check(when, {actor, token}).ok : null; };
  function displayName(npcTok, user) {
    const mine = game.actors.filter(a => a.hasPlayerOwner && a.testUserPermission?.(user, "OWNER")).map(a => a.id);
    return F.nameFor({name: npcTok.name, flags: npcTok.actor?.flags?.[MOD] ?? {}, mine, gm: user.isGM, on: !!setting("faces"), playerOwned: false});
  }

  /** Check a request and find the two tokens. */
  function resolve(p, user) {
    if ( !setting("talkMenu") ) return {why: "Talking to NPCs is off in this world."};
    const scene = game.scenes.get(p?.sceneId);
    const npcTok = scene?.tokens?.get(p?.npcTokenId), me = scene?.tokens?.get(p?.meTokenId);
    if ( !npcTok?.actor || !me?.actor ) return {why: "They are not on the scene."};
    if ( npcTok.actor.hasPlayerOwner ) return {why: "That is a player's character: talk to them yourselves."};
    if ( npcTok.hidden && !user.isGM ) return {why: "There is no one there to talk to."};
    if ( !owns(user, me.actor) ) return {why: "That is not your character."};
    if ( !reachOK(me, npcTok, scene) ) return {why: `Step closer: within ${Number(setting("talkReach")) || 2} squares.`};
    return {scene, npcTok, me};
  }

  /* ---------------- Stock talk (0.11.0) ---------------- */

  const stockOn = npc => !!setting("stockTalk") && !savedProfile(npc).noStock;
  const asked = new Map(); // how often each topic was asked of this NPC by this character, so stock lines vary
  /** Era, regard and a steady seed for one NPC and one character. */
  function stockCtx(r, kind) {
    const npc = baseActor(r.npcTok), pc = baseActor(r.me);
    let year = null, branch = "", wc = {};
    try { wc = chron()?.when?.context?.({actor: pc}) ?? {}; year = wc.year ?? null; branch = wc.branch ?? ""; } catch (e) { /* no calendar */ }
    const att = npc?.flags?.[MOD]?.attitude?.[pc?.id]?.step ?? null;
    let standings = [];
    try {
      const people = game.modules.get(MOD)?.api?.factions?.peopleOf?.(pc.id) ?? {};
      standings = factionKeysOf(npc).map(k => people[k]).filter(v => v !== undefined);
    } catch (e) { standings = []; }
    const step = TK.stepFor({attitude: att, standings});
    const key = `${npc?.id}|${pc?.id}|${kind}`;
    const n = asked.get(key) ?? 0;
    if ( kind !== "greet" ) asked.set(key, n + 1);
    const day = Math.floor((game.time?.worldTime ?? 0) / 86400);
    return {era: TK.eraBand(year, branch), regard: TK.regardOf(step), step, seed: TK.hashSeed(npc?.id, pc?.id, kind, day) + n, year, wc, voice: voiceOf(npc, year)};
  }
  /** The kind of person they speak as (the Storyteller's choice, else their factions and household), with its lines. */
  function voiceOf(npc, year) {
    if ( !npc ) return null;
    let names = [];
    try { const st = game.modules.get(MOD)?.api?.factions?.state?.(); names = (st?.factions ?? []).filter(f => (f.members ?? []).includes(npc.id) || f.leader === npc.id).map(f => f.name ?? ""); } catch (e) { names = []; }
    const p = savedProfile(npc);
    const k = TK.voiceFor({voice: p.voice ?? null, factions: [...factionKeysOf(npc), ...names], household: p.household ?? null, year}, MORE.VOICES);
    return k ? {key: k, only: ["child", "beggar", "drunk"].includes(k), ...MORE.VOICES[k]} : null;
  }
  const storyteller = () => (game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api : null);
  /** Does an "Only when" test hold for this actor? */
  const holds = (actor, text) => { try { return !!chron()?.when?.check?.(text, {actor}).ok; } catch (e) { return false; } };
  /** What comes after the greeting: one aside (what they notice, a debt, talk of the character, small talk). */
  function asidesOf(r, c) {
    const npc = baseActor(r.npcTok), pc = baseActor(r.me), w = TK.warmthOf(c.regard), out = {};
    if ( holds(npc, "kind mortal") ) {
      const seen = TK.noticeFor(t => holds(pc, t));
      if ( seen && (seen === "wounded" || seen === "frenzy" || c.seed % 3 === 0) ) out.notice = TK.pickLine(MORE.NOTICE[seen], c.seed);
    }
    try {
      const L = storyteller()?.ledger?.state?.();
      const owe = TK.ledgerBetween(L?.entries ?? [], npc.id, pc.id);
      if ( owe ) out.ledger = TK.pickLine(MORE.LEDGER[owe], c.seed);
    } catch (e) { /* no Ledger */ }
    try {
      const about = TK.rumourAbout(storyteller()?.rumours?.heardBy?.(npc.id) ?? [], pc.name);
      if ( about ) out.about = TK.pickLine(MORE.ABOUT_YOU[c.regard], c.seed);
    } catch (e) { /* no rumours */ }
    if ( c.seed % 2 === 0 && c.regard !== "hate" ) {
      let day = null;
      try { const atm = game.modules.get("wodx-atmosphere"); day = atm?.active ? atm.api?.weather?.now?.() : null; } catch (e) { day = null; }
      const keys = TK.smallTalkKeys(c.wc, day?.tags ?? [], day?.jdn ? TK.monthOfJdn(day.jdn) : null);
      out.small = TK.smallTalk(MORE.SMALL, keys, {seed: c.seed, feast: c.wc.feast ?? ""});
    }
    const last = npc?.flags?.[MOD]?.talked?.[pc.id];
    const rem = last === undefined ? null : TK.rememberOf(last, game.time?.worldTime ?? 0);
    if ( rem ) out.remember = TK.pickLine(MORE.REMEMBER[rem]?.[w], c.seed);
    return out;
  }
  /** Note when this character last talked to the NPC (the world actor, so every token of them remembers). */
  async function noteTalked(r) {
    const npc = baseActor(r.npcTok), pc = baseActor(r.me);
    if ( npc && pc ) await npc.update({[`flags.${MOD}.talked.${pc.id}`]: game.time?.worldTime ?? 0});
  }
  /** A rumour this NPC has heard that this character has not had from anyone yet. */
  function rumourFor(r) {
    const st = game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api : null;
    const npc = baseActor(r.npcTok), pc = baseActor(r.me);
    const told = new Set(pc?.flags?.[MOD]?.heard ?? []);
    try { return (st?.rumours?.heardBy?.(npc.id) ?? []).filter(x => !x.ended && !told.has(x.id)).at(-1) ?? null; } catch (e) { return null; }
  }
  /** The stock line for a topic, or null. Local topics get their own; anything else gets a brush-off. */
  function stockAnswer(r, topic) {
    if ( !stockOn(r.npcTok.actor) ) return null;
    const kind = TK.LOCAL[topic] ? topic : "none";
    const c = stockCtx(r, kind);
    const rum = kind === "rumours" && c.regard !== "hate" ? rumourFor(r) : null;
    const hit = TK.stockLine(kind, {stock: STOCK, era: c.era, regard: c.regard, seed: c.seed, rumour: rum?.text ?? null, voice: c.voice});
    return hit ? {kind: "stock", say: hit.say, when: "", then: TK.parseThen(""), rumourId: hit.rumour ? rum.id : null} : null;
  }

  /** The menu. greet: false leaves the greeting out (after a question, the window keeps the first one). */
  function menuOf(r, user, {greet: withGreet = true} = {}) {
    const chain = chainOf(r.npcTok.actor, r.scene);
    const menu = TK.menuFor(chain, knownOf(baseActor(r.me)));
    const out = {name: displayName(r.npcTok, user), me: r.me.name, ...menu};
    if ( !withGreet ) return out;
    const g = TK.greetFor(chain, checker(r.me.actor, r.me));
    let greet = g?.say ?? "";
    if ( stockOn(r.npcTok.actor) ) {
      const c = stockCtx(r, "greet"), a = asidesOf(r, c);
      const plain = greet || TK.stockLine("greet", {stock: STOCK, era: c.era, regard: c.regard, seed: c.seed, voice: c.voice})?.say || "";
      // the Storyteller's own greeting is never replaced, only followed
      greet = TK.composeGreet({greet: plain, remember: greet ? "" : a.remember, notice: a.notice, ledger: a.ledger, about: a.about, small: a.small});
    }
    out.greet = greet;
    return out;
  }

  /** The line to say: the Storyteller's own (a topic line, then their "none" line), and only then stock talk. */
  function lineFor(r, topic, chain, check) {
    const ans = TK.answerFor(topic, chain, check);
    if ( ans ) return ans.line;
    return stockAnswer(r, topic);
  }

  /** The Storyteller's client answers a request. kind: menu or ask. */
  async function serve(kind, p, userId = game.user.id) {
    if ( !game.user.isGM ) return {ok: false, why: "Only the Storyteller's client answers."};
    const user = game.users.get(userId) ?? game.user;
    const r = resolve(p, user);
    if ( r.why ) return {ok: false, why: r.why};
    if ( kind === "bye" ) return {ok: true, ...(await farewell(r, user))};
    const menu = menuOf(r, user, {greet: kind === "menu"});
    if ( kind === "menu" ) { await noteTalked(r).catch(() => null); return {ok: true, menu}; }
    const topic = TK.normTopic(p.topic);
    if ( !TK.canAsk(topic, menu) ) return {ok: false, why: "They do not follow you.", menu};
    const chain = chainOf(r.npcTok.actor, r.scene), check = checker(r.me.actor, r.me);
    if ( savedProfile(r.npcTok.actor).talkAsk && !user.isGM ) {
      const fb = lineFor(r, topic, chain, check);
      await askFirstCard(r, user, topic, TK.answersFor(topic, chain, check), fb ? {line: fb} : null);
      return {ok: true, waiting: true, menu};
    }
    const said = await deliver(r, user, topic, lineFor(r, topic, chain, check));
    return {ok: true, ...said, menu: menuOf(r, user, {greet: false})};
  }

  /** Goodbye: the Storyteller's [farewell] line if one fits, else a stock one. Whispered like any answer. */
  async function farewell(r, user) {
    const chain = chainOf(r.npcTok.actor, r.scene);
    let line = TK.answerFor("farewell", chain, checker(r.me.actor, r.me));
    line = line && !line.none ? line.line : null;
    if ( !line && stockOn(r.npcTok.actor) ) {
      const c = stockCtx(r, "farewell");
      const say = TK.moreLine("farewell", {more: MORE, era: c.era, regard: c.regard, seed: c.seed});
      line = say ? {kind: "stock", say, when: "", then: TK.parseThen("")} : null;
    }
    await noteTalked(r).catch(() => null);
    if ( !line ) return {said: ""};
    const name = displayName(r.npcTok, user);
    await ChatMessage.create({speaker: {alias: name, scene: r.scene.id, token: r.npcTok.id}, whisper: [...new Set([user.id, ...gmIds()])],
      content: `<div class="vta-card wodx-x wnpc wnpc-talk-card"><div class="vta-body"><p class="wodx-quiet">${esc(r.me.name)} takes their leave.</p><p>${esc(line.say)}</p></div></div>`,
      flags: {[MOD]: {talk: {actor: baseActor(r.me)?.id, taught: [], topic: "farewell", stock: line.kind === "stock", rumour: null}}}});
    return {said: line.say};
  }

  /** Say a line to the asking player (or aloud), and carry out what follows it. */
  async function deliver(r, user, topic, line) {
    const actor = baseActor(r.me);
    const say = line?.say ?? "";
    const before = actor.flags?.[MOD]?.topics ?? [];
    const taught = (line?.then?.teach ?? []).filter(t => !TK.knowsTopic(t, {learned: before}));
    if ( taught.length ) await actor.update({[`flags.${MOD}.topics`]: TK.addLearned(before, taught)});
    if ( line?.rumourId ) await actor.update({[`flags.${MOD}.heard`]: [...new Set([...(actor.flags?.[MOD]?.heard ?? []), line.rumourId])].slice(-200)});
    const notes = [];
    for ( const c of line?.then?.codex ?? [] ) { const n = await giveCodex(actor, c); if ( n ) notes.push(n); }
    if ( line?.then?.run && chron()?.when?.run ) await chron().when.run(line.then.run, {actor, token: r.me, scene: r.scene, label: r.npcTok.name});
    const name = displayName(r.npcTok, user);
    const extra = [taught.length ? `Now you can ask about ${taught.map(TK.topicLabel).join(", ")}.` : "", ...notes].filter(Boolean);
    const content = `<div class="vta-card wodx-x wnpc wnpc-talk-card"><div class="vta-body"><p class="wodx-quiet">${esc(r.me.name)} asks about ${esc(TK.topicLabel(topic).toLowerCase())}.</p>`
      + `<p>${say ? esc(say) : "<i>They have nothing to say about that.</i>"}</p>${extra.map(x => `<p class="wodx-quiet">${esc(x)}</p>`).join("")}`
      + `${taught.length ? `<button type="button" class="wnpc-talk-undo">Undo what was taught</button>` : ""}</div></div>`;
    const aloud = !!line?.then?.aloud;
    await ChatMessage.create({speaker: {alias: name, scene: r.scene.id, token: r.npcTok.id}, content, ...(aloud ? {} : {whisper: [...new Set([user.id, ...gmIds()])]}),
      flags: {[MOD]: {talk: {actor: actor.id, taught, topic, stock: line?.kind === "stock", rumour: line?.rumourId ?? null}}}});
    return {said: say, taught, notes, none: !line};
  }

  /** Put an Encyclopaedia entry or a journal page into the character's codex. Returns a note, or "". */
  async function giveCodex(actor, name) {
    const st = game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api : null;
    if ( !st?.codex?.reveal ) return "";
    const want = TK.normTopic(name);
    let src = game.journal.find(j => TK.normTopic(j.name) === want && !j.flags?.["wodx-storyteller"]?.codex) ?? null;
    if ( !src ) {
      const pack = game.packs.get("world.wodx-encyclopedia");
      const hit = pack ? (await pack.getIndex()).find(e => TK.normTopic(e.name) === want || e._id === name) : null;
      if ( hit ) src = await pack.getDocument(hit._id);
    }
    if ( !src ) {
      await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), content: `<div class="vta-card wodx-x"><div class="vta-body"><p>A talk line gives the page "${esc(name)}", but no journal or Encyclopaedia entry has that name.</p></div></div>`});
      return "";
    }
    await st.codex.reveal(src, [actor]);
    return "";
  }

  async function askFirstCard(r, user, topic, options, fallback) {
    const lines = options.length ? options.map(o => o.line) : (fallback?.line ? [fallback.line] : []);
    const data = {userId: user.id, sceneId: r.scene.id, npcTokenId: r.npcTok.id, meTokenId: r.me.id, topic, lines};
    const btns = lines.map((l, i) => `<li><button type="button" class="wnpc-talk-pick" data-i="${i}">Say this</button> ${esc(l.say)}${l.when ? ` <span class="wodx-quiet">(if ${esc(l.when)})</span>` : ""}</li>`).join("");
    await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), flags: {[MOD]: {talkAsk: data}},
      content: `<div class="vta-card wodx-x wnpc"><div class="vta-body"><p>${esc(r.me.name)} asks ${esc(r.npcTok.name)} about ${esc(TK.topicLabel(topic).toLowerCase())}. You asked to answer for them.</p>`
        + `${btns ? `<ul data-fixed>${btns}</ul>` : "<p>Nothing on their sheets fits.</p>"}<button type="button" class="wnpc-talk-pick" data-i="-1">Say nothing (speak for them yourself)</button></div></div>`});
  }

  async function onPick(msg, i) {
    const d = msg.flags?.[MOD]?.talkAsk;
    if ( !d || d.done ) return;
    const user = game.users.get(d.userId);
    const scene = game.scenes.get(d.sceneId);
    const r = {scene, npcTok: scene?.tokens?.get(d.npcTokenId), me: scene?.tokens?.get(d.meTokenId)};
    await msg.update({[`flags.${MOD}.talkAsk.done`]: true});
    if ( !user || !r.npcTok || !r.me ) return;
    const line = i >= 0 ? d.lines[i] ?? null : null;
    let said = {said: "", taught: [], waiting: false, quiet: i < 0};
    if ( line ) said = await deliver(r, user, d.topic, line);
    const reply = {type: "talk.said", userId: user.id, said: {...said, topic: d.topic, quiet: i < 0}, menu: menuOf(r, user, {greet: false})};
    if ( user.id === game.user.id ) onSaid(reply); else game.socket.emit(SOCKET, reply);
  }

  async function undoTaught(msg) {
    const f = msg.flags?.[MOD]?.talk;
    const a = game.actors.get(f?.actor);
    if ( !a || !f.taught?.length ) return;
    await a.update({[`flags.${MOD}.topics`]: TK.dropLearned(a.flags?.[MOD]?.topics ?? [], f.taught)});
    await msg.update({[`flags.${MOD}.talk.taught`]: [], content: msg.content.replace(/<button type="button" class="wnpc-talk-undo">[^<]*<\/button>/, "<p><i>Undone.</i></p>")});
  }

  /* ---------------- The player's side ---------------- */

  function request(kind, payload) {
    if ( isActiveGM() ) return serve(kind, payload);
    if ( !game.users.activeGM ) return Promise.resolve({ok: false, why: "No one answers: the Storyteller needs to be logged in."});
    const reqId = foundry.utils.randomID();
    return new Promise(res => {
      const t = setTimeout(() => { pending.delete(reqId); res({ok: false, why: "No answer came. Try again in a moment."}); }, 10000);
      pending.set(reqId, v => { clearTimeout(t); pending.delete(reqId); res(v); });
      game.socket.emit(SOCKET, {type: "talk.req", reqId, kind, payload, userId: game.user.id});
    });
  }

  function onSaid(m) {
    if ( m.userId !== game.user.id || !win ) return;
    win.state.waiting = false;
    if ( m.menu ) Object.assign(win.state.menu, m.menu, {greet: win.state.menu.greet});
    win.state.log.push({topic: m.said.topic, say: m.said.quiet ? "" : m.said.said, quiet: m.said.quiet, taught: m.said.taught ?? []});
    paint();
  }

  /** The window's inside. state: {menu: {name, greet, ask, local}, log: [{topic, say, taught}], waiting}. */
  function talkHtml(state) {
    const m = state.menu;
    const btn = t => `<li><button type="button" class="wnpc-topic" data-topic="${esc(t)}"${state.waiting ? " disabled" : ""}>${esc(TK.topicLabel(t))}</button></li>`;
    const log = state.log.slice(-8).map(e => `<div class="wnpc-talk-said"><p class="wodx-quiet">About ${esc(TK.topicLabel(e.topic).toLowerCase())}:</p>`
      + `<p>${e.quiet ? "<i>The Storyteller answers for them.</i>" : e.say ? esc(e.say) : "<i>They have nothing to say about that.</i>"}</p>`
      + `${e.taught?.length ? `<p class="wodx-quiet">Now you can ask about ${esc(e.taught.map(TK.topicLabel).join(", "))}.</p>` : ""}</div>`).join("");
    const deal = game.modules.get("wodx-actions")?.api?.withPerson ? `<h4>Deal with them</h4><p><button type="button" class="wnpc-deal">Persuade, trade and more…</button></p>` : "";
    return `<div class="wnpc-talk">
      ${m.greet ? `<p class="wnpc-talk-greet">${esc(m.greet)}</p>` : ""}
      <div class="wnpc-talk-log">${log}${state.waiting ? `<p class="wodx-quiet">They think it over…</p>` : ""}</div>
      <h4>Ask about</h4>
      ${m.ask.length > 5 ? searchBox("ul.wnpc-talk-ask", "Search topics…", "Search topics") : ""}
      ${m.ask.length ? `<ul class="wodx-list wnpc-talk-ask"${m.ask.length > 5 ? "" : " data-fixed"}>${m.ask.map(btn).join("")}</ul>` : `<p class="wodx-quiet">Nothing yet. You learn what to ask about as you go.</p>`}
      <h4>Local talk</h4>
      <ul class="wodx-list wnpc-talk-local" data-fixed>${m.local.map(btn).join("")}</ul>
      ${deal}
    </div>`;
  }

  function paint() {
    const root = win?.dlg?.element?.querySelector?.(".wnpc-talk-wrap");
    if ( !root ) return;
    root.innerHTML = talkHtml(win.state);
    bind(root);
  }

  function bind(root) {
    root.querySelectorAll("button.wnpc-topic").forEach(b => b.addEventListener("click", () => ask(b.dataset.topic)));
    root.querySelector("button.wnpc-deal")?.addEventListener("click", () => {
      const tok = win?.state?.req ? game.scenes.get(win.state.req.sceneId)?.tokens?.get(win.state.req.npcTokenId) : null;
      try { game.modules.get("wodx-actions").api.withPerson(tok?.object ?? tok); } catch (e) { console.error(`${MOD} | talk`, e); }
    });
  }

  async function ask(topic) {
    if ( !win || win.state.waiting ) return;
    win.state.waiting = true; paint();
    const r = await request("ask", {...win.state.req, topic});
    if ( !win ) return;
    if ( !r.ok ) { win.state.waiting = false; paint(); return ui.notifications.warn(r.why); }
    if ( r.waiting ) return; // the Storyteller's card answers through onSaid
    win.state.waiting = false;
    if ( r.menu ) Object.assign(win.state.menu, r.menu, {greet: win.state.menu.greet});
    win.state.log.push({topic: TK.normTopic(topic), say: r.said, taught: r.taught ?? []});
    paint();
  }

  /** Open the topic menu with the targeted person (or the token given). */
  async function openTalk(target = null) {
    if ( !setting("talkMenu") ) return ui.notifications.info("Talking to NPCs is off in this world.");
    const scene = canvas?.scene;
    const me = speakerToken(game.user, scene);
    if ( !me ) return ui.notifications.info(game.user.isGM ? "Select a player's character on this scene to talk as." : "Your character needs to be on this scene: select your token.");
    let npc = (target?.document ?? target) || [...(game.user.targets ?? [])].map(t => t.document).find(d => d?.actor && !d.actor.hasPlayerOwner) || null;
    if ( !npc ) {
      // Nobody targeted: the nearest person the Storyteller plays, within reach and in sight
      const near = (scene?.tokens?.contents ?? []).filter(t => t.id !== me.id && t.actor && !t.actor.hasPlayerOwner && !t.hidden && (t.object?.visible ?? true) && canSee(me, t));
      const pick = TK.nearestFor(box(me, scene), near.map(t => ({id: t.id, ...box(t, scene)})), scene?.grid?.size ?? 100, Number(setting("talkReach")) || 2);
      npc = pick ? scene.tokens.get(pick.id) : null;
      if ( !npc ) return ui.notifications.info("No one is close enough to talk to. Step up to them, or target them (hover over their token and press T).");
    }
    if ( !npc?.actor ) return ui.notifications.info("Target the person you want to talk to first (hover over their token and press T).");
    if ( !reachOK(me, npc, scene) ) return ui.notifications.info(`Step closer: within ${Number(setting("talkReach")) || 2} squares.`);
    if ( !canSee(me, npc) ) return ui.notifications.info("You cannot see them from there.");
    const req = {sceneId: scene.id, npcTokenId: npc.id, meTokenId: me.id};
    const r = await request("menu", req);
    if ( !r.ok ) return ui.notifications.warn(r.why);
    try { win?.dlg?.close?.(); } catch (e) { /* already shut */ }
    const state = {menu: r.menu, log: [], waiting: false, req};
    const D = foundry.applications.api.DialogV2;
    win = {dlg: null, state};
    const mine = win;
    D.wait({window: {title: `Talk: ${r.menu.name}`, resizable: true}, classes: ["wodx-dialog", "wodx-npc-dialog", "wnpc-talk-window"], position: {width: 400, height: "auto"},
      content: `<div class="wnpc-talk-wrap">${talkHtml(state)}</div>`,
      render: (ev, dlg) => { mine.dlg = dlg; const root = dlg.element?.querySelector?.(".wnpc-talk-wrap"); if ( root ) bind(root); },
      buttons: [{action: "close", label: "Goodbye", default: true, callback: () => { request("bye", req).catch(() => null); return "close"; }}], rejectClose: false})
      .finally(() => { if ( win === mine ) win = null; });
    return r.menu;
  }

  /* ---------------- The Storyteller's shared sheets ---------------- */

  async function editShared() {
    if ( !game.user.isGM ) return null;
    const shared = {...(setting("sharedTalk") ?? {})};
    const households = [...new Set([...game.actors].map(a => savedProfile(a).household).filter(Boolean))].sort();
    let fx = [];
    try { fx = game.modules.get(MOD)?.api?.factions?.state?.()?.factions ?? []; } catch (e) { fx = []; }
    const keys = [["everyone", "Everyone"], ...(canvas?.scene ? [[`scene:${canvas.scene.id}`, `This scene: ${canvas.scene.name}`]] : []),
      ...households.map(h => [`household:${h.toLowerCase()}`, `Household: ${h}`]), ...fx.map(f => [`faction:${String(f.key ?? f.name).toLowerCase()}`, `Faction: ${f.name}`])];
    for ( const k of Object.keys(shared) ) if ( !keys.some(x => x[0] === k) && String(shared[k]).trim() ) keys.push([k, k.startsWith("scene:") ? `Scene: ${game.scenes.get(k.slice(6))?.name ?? "gone"}` : k]);
    const opts = keys.map(([k, l]) => `<option value="${esc(k)}">${esc(l)}${String(shared[k] ?? "").trim() ? " (written)" : ""}</option>`).join("");
    const D = foundry.applications.api.DialogV2;
    let cur = keys[0][0];
    const res = await D.wait({window: {title: "Shared talk sheets", resizable: true}, classes: ["wodx-dialog", "wodx-npc-dialog"], position: {width: 520, height: "auto"},
      content: `${keys.length > 5 ? searchBox("select[name=key]", "Search sheets…", "Search sheets") : ""}
        <div class="wodx-field"><label>Sheet</label><select name="key"${keys.length > 5 ? "" : " data-fixed"}>${opts}</select></div>
        <textarea name="text" rows="10" style="width:100%" placeholder="[rumours] night => Talk of a wolf seen on the Linberg road.">${esc(shared[cur] ?? "")}</textarea>
        <p class="wodx-quiet">Anyone in a household, a faction or this scene, or anyone at all, falls back to these lines when their own sheet has no answer. Same format as an NPC's talk sheet: [topic] tests =&gt; what they say | teach a topic; codex a page; aloud.</p>`,
      render: (ev, dlg) => {
        const sel = dlg.element.querySelector("select[name=key]"), ta = dlg.element.querySelector("textarea[name=text]");
        sel?.addEventListener("change", () => { shared[cur] = ta.value; cur = sel.value; ta.value = shared[cur] ?? ""; });
      },
      buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => { shared[cur] = b.form.elements.text.value; return shared; }}, {action: "cancel", label: "Cancel"}],
      rejectClose: false});
    if ( !res || res === "cancel" ) return null;
    const clean = Object.fromEntries(Object.entries(res).map(([k, v]) => [k, String(v ?? "").slice(0, 8000)]).filter(([, v]) => v.trim()));
    await game.settings.set(MOD, "sharedTalk", clean);
    return clean;
  }

  /* ---------------- Remarks and cries (0.12.0) ---------------- */

  const lastBark = new Map(); // actor id -> real time of their last remark
  let recent = []; // real times of the last remarks anywhere, so a jump in time does not flood the scene
  const barkOK = actor => setting("barks") && setting("barks") !== "off" && !!setting("stockTalk") && actor && !actor.hasPlayerOwner && !savedProfile(actor).noBarks && !savedProfile(actor).noStock;
  function eraNow() {
    try { const c = chron()?.when?.context?.({}) ?? {}; return TK.eraBand(c.year, c.branch ?? ""); } catch (e) { return "modern"; }
  }
  /**
   * Say a line out loud over a token: a speech bubble everyone on the scene sees (and a chat line too, when the
   * world asks for it). Only the active Storyteller's client calls this.
   */
  async function say(tokDoc, text, {chat = setting("barks") === "chat"} = {}) {
    if ( !tokDoc || !text ) return false;
    const name = tokDoc.name ?? "Someone";
    try {
      const B = canvas?.hud?.bubbles;
      if ( B?.broadcast ) await B.broadcast(tokDoc, text, {pan: false});
      else if ( tokDoc.parent?.id === canvas?.scene?.id ) await B?.say?.(tokDoc.object ?? tokDoc, text, {pan: false});
    } catch (e) { /* not on the viewed scene */ }
    if ( chat ) await ChatMessage.create({speaker: {alias: name, scene: tokDoc.parent?.id, token: tokDoc.id}, content: `<p>${esc(text)}</p>`, flags: {[MOD]: {bark: true}}});
    return true;
  }
  /** A remark or cry from one NPC, with the throttles. kind: bark:<activity>, cry:alarm, cry:hurt. */
  async function bark(tokDoc, kind, {force = false, gap = 90000} = {}) {
    const actor = baseActor(tokDoc);
    if ( !tokDoc || tokDoc.hidden || !barkOK(actor) ) return null;
    const now = Date.now();
    recent = recent.filter(t => now - t < 10000);
    if ( !force && ((now - (lastBark.get(actor.id) ?? 0)) < gap || recent.length >= 2) ) return null;
    const text = TK.moreLine(kind, {more: MORE, era: eraNow(), seed: TK.hashSeed(actor.id, kind, now)});
    if ( !text ) return null;
    lastBark.set(actor.id, now); recent.push(now);
    await say(tokDoc, text);
    return text;
  }
  const tokensOf = actor => (game.scenes?.contents ?? []).flatMap(sc => sc.tokens.contents.filter(t => t.actorId === actor.id && !t.hidden));
  /** A remark as a new part of their routine begins, now and then (one time in three), on the scene being shown. */
  function onWhere(actor, changes) {
    const act = changes?.flags?.[MOD]?.where?.activity;
    if ( !act || !isActiveGM() || Math.random() > 1 / 3 ) return;
    const tok = tokensOf(actor).find(t => t.parent?.id === canvas?.scene?.id || t.parent?.active);
    if ( tok ) bark(tok, `bark:${act}`).catch(e => console.error(`${MOD} | barks`, e));
  }
  /** A place is raised: one or two of the mortals there cry out. */
  function onAlarm(a) {
    if ( !isActiveGM() ) return;
    const sc = game.scenes.get(a?.scene?.id ?? a?.scene);
    const who = (sc?.tokens?.contents ?? []).filter(t => !t.hidden && barkOK(baseActor(t)) && holds(baseActor(t), "kind mortal") && baseActor(t)?.flags?.[MOD]?.where?.activity !== "sleep");
    for ( const t of who.sort(() => Math.random() - 0.5).slice(0, 2) ) bark(t, "cry:alarm", {gap: 20000}).catch(e => console.error(`${MOD} | barks`, e));
  }
  /** An NPC who is hurt cries out (mortals and ghouls; the rest keep their pain to themselves). */
  function onHurt(actor) {
    if ( !isActiveGM() || !actor || actor.hasPlayerOwner || !(holds(actor, "kind mortal") || holds(actor, "kind ghoul")) ) return;
    const tok = actor.isToken ? actor.token : tokensOf(actor).find(t => t.parent?.id === canvas?.scene?.id);
    if ( tok ) bark(tok, "cry:hurt", {gap: 20000}).catch(e => console.error(`${MOD} | barks`, e));
  }

  /**
   * A stock line for other modules (WoDX Actions trades and social rolls), coloured by how the NPC regards the
   * character. kind: trade:open, trade:tooDear, trade:fair, trade:haggleWin, trade:haggleLose, trade:refuse,
   * trade:noMoney, trade:fence, trade:buy, social:<persuade|intimidate|bribe|charm|deceive|seduce>:<win|lose>,
   * farewell, cry:alarm, cry:hurt, bark:<activity>. npc and pc: tokens or actors. Returns the line or null.
   */
  function stock(kind, {npc = null, pc = null} = {}) {
    const n = npc?.document ?? npc, p = pc?.document ?? pc;
    const nTok = n?.documentName === "Token" ? n : null, pTok = p?.documentName === "Token" ? p : null;
    const r = {npcTok: nTok ?? {actor: n, actorId: n?.id}, me: pTok ?? {actor: p, actorId: p?.id}};
    if ( !r.npcTok.actor || savedProfile(baseActor(r.npcTok)).noStock || !setting("stockTalk") ) return null;
    const c = r.me.actor ? stockCtx(r, kind) : {era: eraNow(), regard: "neutral", seed: TK.hashSeed(r.npcTok.actor.id, kind, Date.now())};
    return TK.moreLine(kind, {more: MORE, era: c.era, regard: c.regard, seed: c.seed});
  }

  /* ---------------- Hooks ---------------- */

  function hooks() {
    Hooks.once("ready", () => {
      game.socket.on(SOCKET, async m => {
        if ( m?.type === "talk.res" ) { if ( m.userId === game.user.id ) pending.get(m.reqId)?.(m.result); return; }
        if ( m?.type === "talk.said" ) { onSaid(m); return; }
        if ( m?.type !== "talk.req" || !isActiveGM() ) return;
        const result = await serve(m.kind, m.payload, m.userId).catch(e => { console.error(`${MOD} | talk`, e); return {ok: false, why: "Something went wrong. The Storyteller can see the console."}; });
        game.socket.emit(SOCKET, {type: "talk.res", reqId: m.reqId, userId: m.userId, result});
      });
    });
    Hooks.on("updateActor", (actor, changes) => { if ( changes?.flags?.[MOD]?.where ) onWhere(actor, changes); });
    Hooks.on("wodxPlaceAlarm", a => { try { onAlarm(a); } catch (e) { console.error(`${MOD} | barks`, e); } });
    Hooks.on("wodxDamageApplied", actor => { try { onHurt(actor); } catch (e) { console.error(`${MOD} | barks`, e); } });
    Hooks.on("renderChatMessageHTML", (msg, el) => {
      const html = el?.[0] ?? el;
      if ( msg.flags?.[MOD]?.talk?.stock && game.user.isGM ) {
        const body = html?.querySelector?.(".wnpc-talk-card .vta-body");
        if ( body && !body.querySelector(".wnpc-stock-tag") ) body.insertAdjacentHTML("beforeend", `<p class="wodx-quiet wnpc-stock-tag">Stock talk${msg.flags[MOD].talk.rumour ? ", passing on a rumour from the network" : ""}. Write a line on their talk sheet to say something else.</p>`);
      }
      if ( msg.flags?.[MOD]?.talk ) html?.querySelectorAll?.("button.wnpc-talk-undo").forEach(b => {
        if ( !game.user.isGM ) { b.remove(); return; }
        b.addEventListener("click", ev => { ev.preventDefault(); b.disabled = true; undoTaught(msg).catch(e => console.error(`${MOD} | talk`, e)); });
      });
      const d = msg.flags?.[MOD]?.talkAsk;
      if ( d ) html?.querySelectorAll?.("button.wnpc-talk-pick").forEach(b => {
        if ( !game.user.isGM || d.done ) { b.remove(); return; }
        b.addEventListener("click", ev => { ev.preventDefault(); b.disabled = true; onPick(msg, Number(b.dataset.i)).catch(e => console.error(`${MOD} | talk`, e)); });
      });
    });
  }

  return {registerSettings, hooks, openTalk, serve, editShared, talkHtml, speakerToken, stock, say, bark, rules: TK, lines: MORE};
}
