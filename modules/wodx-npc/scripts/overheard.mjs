/**
 * WoDX NPC 0.53.0 (B2750 to B2753): NPCs who talk to each other where a character can overhear them. The runtime;
 * overheard-rules.mjs has the rules and data/grammar/overheard.mjs the words.
 *
 * Only the active Storyteller's client runs it. When a player's character moves, and every half minute while the game
 * is not paused, it looks at the scene for two NPCs standing together (within the talking distance) with a character
 * in earshot and no wall between that stops sound. Now and then one of the pairs talks: one line each. Each character
 * in earshot gets the exchange as a whisper to its players and the Storyteller, with names as that character knows
 * them (strangers stay strangers). A rumour heard this way counts as heard, as it does when an NPC tells it.
 *
 *   setting wodx-npc.overheard           on or off for the world (off until the Storyteller turns it on)
 *   flags.wodx-npc.overheard on a scene  {off, log: [{at, a, b, topic, lines, heard}]}: the scene's own switch and
 *                                        the record of what was heard there (the last 30), shown in the window
 *
 * Voices are shelved (B2750): text only, no sound.
 */
import * as OR from "./overheard-rules.mjs";
import * as G from "./talk-grammar.mjs";
import * as TK from "./talk-rules.mjs";
import * as AR from "./alert-rules.mjs";
import {isAnimal} from "./animal-rules.mjs";
import {SIDE_FACTS} from "../data/grammar/groups.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

export function build(ctx) {
  const {MOD, esc, isActiveGM, chron, savedProfile, talk, nameFor, sidesOf} = ctx;
  const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };
  const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
  const lastPair = new Map(), lastScene = new Map(), recent = new Map();
  let count = 0, timer = null, moveTimer = null;

  function registerSettings() {
    game.settings.register(MOD, "overheard", {name: "NPCs talk among themselves (overheard)",
      hint: "Two NPCs standing together now and then say a line each: a rumour, talk of the times, a price at the market, the watch, a faction, a feast, the weather, work, in words of the place and the year. A character in earshot gets it as a whisper. Off for a scene in the Overheard talk window.",
      scope: "world", config: true, type: Boolean, default: false});
    game.settings.register(MOD, "overheardEarshot", {name: "Overheard talk: earshot, in squares", hint: "How far from either speaker a character can stand and still hear them.",
      scope: "world", config: true, type: Number, default: OR.DEFAULTS.earshot, range: {min: 1, max: 12, step: 1}});
    game.settings.register(MOD, "overheardChance", {name: "Overheard talk: chance a pair talks", hint: "Each time WoDX looks (a character moves, or every half minute), from 0 (never) to 1 (whenever they may).",
      scope: "world", config: true, type: Number, default: OR.DEFAULTS.chance, range: {min: 0, max: 1, step: 0.05}});
    game.settings.register(MOD, "overheardGap", {name: "Overheard talk: minutes before a pair talks again", hint: "Real minutes. A scene has at most one exchange each 45 seconds whatever this says.",
      scope: "world", config: true, type: Number, default: 5, range: {min: 1, max: 60, step: 1}});
  }

  /* ---------------- Who is on the scene ---------------- */

  const baseActor = t => (t?.actorId ? game.actors.get(t.actorId) : null) ?? t?.actor ?? null;
  const isPB = t => !!t?.flags?.[MOD]?.passerby;
  const sceneFlag = scene => scene?.flags?.[MOD]?.overheard ?? {};
  const statusOf = (t, id) => { try { return !!t.actor?.statuses?.has?.(id); } catch (e) { return false; } };
  const holds = (actor, text) => { try { return !!chron()?.when?.check?.(text, {actor}).ok; } catch (e) { return false; } };
  /** Can this token speak in an overheard exchange? Awake, standing, a person, and not kept quiet. */
  function canSpeak(t) {
    const a = baseActor(t);
    if ( !t || t.hidden || !a || a.hasPlayerOwner ) return false;
    const p = savedProfile(a) ?? {};
    if ( p.noStock || (p.noBarks && !isPB(t)) || p.noOverheard ) return false;
    if ( a.getFlag?.(MOD, "passerbyBase") === "animal" || isAnimal(p.template) ) return false;
    if ( a.flags?.[MOD]?.where?.activity === "sleep" || ["dead", "unconscious", "sleep", "paralysis"].some(s => statusOf(t, s)) ) return false;
    return true;
  }
  const spot = t => ({id: t.id, x: t.x, y: t.y, w: t.width ?? 1, h: t.height ?? 1, doc: t});
  const centre = (t, g) => ({x: t.x + (t.width ?? 1) * g / 2, y: t.y + (t.height ?? 1) * g / 2});
  /** A wall that stops sound between two tokens (only testable on the scene being viewed; elsewhere none). */
  function soundBlocked(a, b, scene) {
    try {
      if ( canvas?.scene?.id !== scene?.id ) return false;
      const g = scene.grid?.size ?? 100, be = CONFIG.Canvas.polygonBackends?.sound;
      return !!be?.testCollision?.(centre(a, g), centre(b, g), {type: "sound", mode: "any"});
    } catch (e) { return false; }
  }

  /* ---------------- What they talk about ---------------- */

  const st = () => (game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api : null);
  function speakerFacts(t, scene) {
    const a = baseActor(t), facts = {};
    let sides = [];
    try { sides = sidesOf?.(a)?.own ?? []; } catch (e) { sides = []; }
    Object.assign(facts, G.factsFromSides(sides, SIDE_FACTS));
    let alert = "calm";
    try { alert = AR.levelAt(scene?.flags?.[MOD]?.alert ?? null, game.time?.worldTime ?? 0); } catch (e) { alert = "calm"; }
    const mood = G.moodOf({set: savedProfile(a)?.mood ?? null, alert, wounded: holds(a, "wounded"), now: game.time?.worldTime ?? 0});
    if ( mood ) facts.mood = mood;
    return facts;
  }
  function weatherKey() {
    try {
      const atm = game.modules.get("wodx-atmosphere");
      const tags = new Set(atm?.active ? atm.api?.weather?.now?.()?.tags ?? [] : []);
      if ( tags.has("mist") ) tags.add("fog");
      if ( tags.has("gale") ) tags.add("wind");
      return ["thunder", "snow", "rain", "fog", "wind", "cold", "hot"].find(k => tags.has(k)) ?? null;
    } catch (e) { return null; }
  }
  /** A rumour one of the two has heard that not every listener has had yet: {id, text} or null. */
  function rumourOf(a, b, listeners) {
    if ( isPB(a) || isPB(b) ) return null;
    try {
      const heard = (st()?.rumours?.heardBy?.(baseActor(a)?.id) ?? []).concat(st()?.rumours?.heardBy?.(baseActor(b)?.id) ?? []).filter(r => !r.ended && r.text);
      const fresh = heard.filter(r => listeners.some(p => !(baseActor(p)?.flags?.[MOD]?.heard ?? []).includes(r.id)));
      return fresh.at(-1) ?? null;
    } catch (e) { return null; }
  }
  function sharedOf(a, b, scene, listeners, seed) {
    let wc = {}, region = null;
    try { wc = chron()?.when?.context?.({}) ?? {}; } catch (e) { wc = {}; }
    try { region = chron()?.world?.here?.(scene)?.id ?? null; } catch (e) { region = null; }
    const year = Number(wc.year) || null, rum = rumourOf(a, b, listeners);
    let market = null, factions = [], units = null;
    try { market = st()?.upkeep?.markets?.of?.({scene}) ?? null; } catch (e) { market = null; }
    let town = null;
    try { town = st()?.upkeep?.towns?.ofScene?.(scene) ?? null; } catch (e) { town = null; }
    try { factions = game.modules.get(MOD)?.api?.factions?.state?.()?.factions ?? []; } catch (e) { factions = []; }
    try {
      const reg = chron()?.world?.regionOf?.(region);
      const rules = st()?.upkeep?.money?.rules;
      if ( rules?.moneyFor && year ) units = rules.moneyFor(year, reg?.money ?? "moravian")?.units ?? null;
    } catch (e) { units = null; }
    const shared = OR.sharedFacts({year, region: region ?? undefined, future: TK.eraBand(year, wc.branch ?? "") === "future", rumour: rum?.text ?? null, market, factions,
      sceneId: scene?.id, a: baseActor(a)?.id, b: baseActor(b)?.id, feast: wc.feast ?? "", weather: weatherKey(), units, town, seed});
    return {shared, rumourId: rum?.id ?? null};
  }

  /* ---------------- An exchange ---------------- */

  /**
   * Look at a scene and, if a pair may talk, let them. force: skip the switches, the throttles and the dice (the
   * window's button and the gate). topic: one to use. Returns {ok, topic, lines, heard, a, b} or {ok: false, why}.
   */
  async function run(scene = canvas?.scene, {force = false, topic = null} = {}) {
    if ( !scene ) return {ok: false, why: "No scene."};
    if ( !force && (!setting("overheard") || sceneFlag(scene).off || game.paused) ) return {ok: false, why: "Overheard talk is off here."};
    if ( !force && game.combats?.some(c => c.started && c.scene?.id === scene.id) ) return {ok: false, why: "A fight is on."};
    const g = scene.grid?.size ?? 100;
    const toks = scene.tokens.contents;
    const speakers = toks.filter(canSpeak).map(spot);
    const pcs = toks.filter(t => !t.hidden && baseActor(t)?.hasPlayerOwner).map(spot);
    const pairs = OR.pairsOf(speakers, {reach: Number(setting("talkReach")) || OR.DEFAULTS.reach, grid: g});
    const earshot = Number(setting("overheardEarshot")) || OR.DEFAULTS.earshot;
    const now = Date.now();
    for ( const [a, b] of pairs ) {
      const hear = OR.earshotOf([a, b], pcs, {earshot, grid: g}).filter(p => !(soundBlocked(p.doc, a.doc, scene) && soundBlocked(p.doc, b.doc, scene)));
      if ( !hear.length && !force ) continue;
      const key = [a.id, b.id].sort().join("|");
      const ok = OR.mayChat({now, lastPair: lastPair.get(key) ?? null, lastScene: lastScene.get(scene.id) ?? null,
        pairGap: (Number(setting("overheardGap")) || 5) * 60000, chance: Number(setting("overheardChance") ?? OR.DEFAULTS.chance), roll: Math.random(), force});
      if ( !ok ) continue;
      const day = Math.floor((game.time?.worldTime ?? 0) / 86400);
      const seed = G.mix(TK.hashSeed(baseActor(a.doc)?.id, baseActor(b.doc)?.id, day), `n${count++}`);
      const {shared, rumourId} = sharedOf(a.doc, b.doc, scene, hear.map(p => p.doc), seed);
      const said = OR.exchange({a: {facts: speakerFacts(a.doc, scene)}, b: {facts: speakerFacts(b.doc, scene)}, shared, grammar: talk.grammar, seed,
        recent: recent.get(scene.id) ?? [], topic: OR.cleanTopic(topic), passerby: isPB(a.doc) || isPB(b.doc)});
      if ( !said ) continue;
      lastPair.set(key, now); lastScene.set(scene.id, now);
      recent.set(scene.id, [...(recent.get(scene.id) ?? []), ...said.lines.map(l => l.say)].slice(-12));
      const heard = await tell(scene, a.doc, b.doc, said, hear.map(p => p.doc), rumourId);
      return {ok: true, topic: said.topic, lines: said.lines.map(l => l.say), rules: said.lines.map(l => l.rule), heard, a: a.id, b: b.id, shared};
    }
    return {ok: false, why: pairs.length ? "Nobody in earshot, or none of them may talk yet." : "No two NPCs stand together."};
  }

  /** Whisper the exchange to each character in earshot, note a rumour as heard, and keep the scene's record. */
  async function tell(scene, a, b, said, listeners, rumourId) {
    const gms = gmIds(), heard = [];
    const body = viewer => {
      const who = {a: nameFor?.(a, viewer) || a.name, b: nameFor?.(b, viewer) || b.name};
      return `<div class="vta-card wodx-x wnpc wnpc-overheard"><div class="vta-body"><p class="wodx-quiet">Overheard</p>`
        + said.lines.map(l => `<p><b>${esc(who[l.who])}</b>: ${esc(l.say)}</p>`).join("") + `</div></div>`;
    };
    const flags = {[MOD]: {overheard: {scene: scene.id, a: a.id, b: b.id, topic: said.topic, rules: said.lines.map(l => l.rule), rumour: rumourId}}};
    for ( const p of listeners ) {
      const pc = baseActor(p);
      const owners = game.users.filter(u => !u.isGM && pc?.testUserPermission?.(u, "OWNER"));
      await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: [...new Set([...owners.map(u => u.id), ...gms])], content: body(owners[0] ?? game.user),
        flags: {[MOD]: {...flags[MOD], overheard: {...flags[MOD].overheard, listener: pc?.id ?? null}}}});
      heard.push(pc?.name ?? p.name);
      if ( rumourId && said.topic === "rumour" && pc ) await pc.update({[`flags.${MOD}.heard`]: [...new Set([...(pc.flags?.[MOD]?.heard ?? []), rumourId])].slice(-200)});
    }
    if ( !listeners.length ) await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gms, content: body(game.user), flags});
    const cur = sceneFlag(scene);
    const entry = {at: game.time?.worldTime ?? 0, a: a.name, b: b.name, topic: said.topic, lines: said.lines.map(l => l.say), heard};
    await scene.update({[`flags.${MOD}.overheard`]: {off: !!cur.off, log: OR.addToLog(cur.log, entry)}});
    return heard;
  }

  /* ---------------- The window ---------------- */

  async function open(scene = canvas?.scene) {
    if ( !game.user.isGM || !scene ) return null;
    const cur = sceneFlag(scene), log = [...(cur.log ?? [])].reverse();
    const rows = log.map(e => `<li class="wnpc-oh-row"><b>${esc(e.a)}</b> and <b>${esc(e.b)}</b> (${esc(e.topic)})${e.heard?.length ? `, heard by ${esc(e.heard.join(", "))}` : ", heard by nobody"}:<br>${e.lines.map(esc).join("<br>")}</li>`).join("");
    const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 520}, window: {title: `Overheard talk: ${scene.navName || scene.name}`}, classes: ["wodx-dialog", "wnpc-overheard-window"],
      content: `<div class="form-group"><label>NPCs on this scene talk among themselves</label><input type="checkbox" name="on"${cur.off ? "" : " checked"}></div>
        <p class="hint">${setting("overheard") ? "On for the world." : "Off for the world: turn on \"NPCs talk among themselves\" in the module settings."} Two NPCs within ${Number(setting("talkReach")) || 2} squares of each other talk when a character is within ${Number(setting("overheardEarshot")) || OR.DEFAULTS.earshot} squares of either.</p>
        <fieldset><legend>What was heard here (newest first)</legend>${searchBox(".wnpc-oh-log", "Search what was heard…", "Search what was heard")}
        <ul class="wnpc-oh-log" style="max-height:320px;overflow-y:auto">${rows || "<li>Nothing yet.</li>"}</ul></fieldset>`,
      buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => ({action: "save", on: !!b.form.elements.on?.checked})},
        {action: "talk", label: "Make two talk now", callback: (ev, b) => ({action: "talk", on: !!b.form.elements.on?.checked})},
        {action: "clear", label: "Clear the record", callback: () => ({action: "clear"})}, {action: "cancel", label: "Cancel"}]});
    if ( !res || res.action === "cancel" ) return null;
    if ( res.action === "clear" ) return scene.update({[`flags.${MOD}.overheard`]: {off: !!cur.off, log: []}});
    await scene.update({[`flags.${MOD}.overheard`]: {off: !res.on, log: cur.log ?? []}});
    if ( res.action === "talk" ) {
      const r = await run(scene, {force: true});
      if ( !r.ok ) ui.notifications.info(`WoDX: ${r.why}`);
      return r;
    }
    return null;
  }

  /* ---------------- When to look ---------------- */

  function onMove(doc, changes) {
    if ( !isActiveGM() || !("x" in (changes ?? {}) || "y" in (changes ?? {})) || !baseActor(doc)?.hasPlayerOwner || !setting("overheard") ) return;
    clearTimeout(moveTimer);
    moveTimer = setTimeout(() => { run(doc.parent).catch(e => console.error(`${MOD} | overheard`, e)); }, 1500);
  }
  function start() {
    clearInterval(timer);
    timer = setInterval(() => {
      if ( !isActiveGM() || !setting("overheard") || game.paused ) return;
      const scenes = [...new Set([canvas?.scene, game.scenes?.active].filter(Boolean))];
      for ( const s of scenes ) run(s).catch(e => console.error(`${MOD} | overheard`, e));
    }, 30000);
  }
  function hooks() {
    Hooks.on("updateToken", (doc, changes) => { try { onMove(doc, changes); } catch (e) { console.error(`${MOD} | overheard`, e); } });
    Hooks.once("ready", start);
  }

  return {registerSettings, hooks, run, open, log: scene => [...(sceneFlag(scene ?? canvas?.scene).log ?? [])], rules: OR};
}
