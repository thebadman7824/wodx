/**
 * The world's own hand (B4861-B4866), the Foundry side. The rules are in reach-rules.mjs.
 *
 * When a system decides, or the Storyteller approves, that the world acts on someone, this makes it happen on the
 * map: people come to the scene in plain sight, and a fight starts through WoDX Combat's fight starter when they mean
 * harm (its own Auto or Suggest setting still applies). Ben, 14 November 2026: an approval may stay, but once it is
 * approved something must happen.
 *
 *   road     an approved road encounter puts its people or beasts by the traveller (w3)
 *   raid     an approved hunters' raid or purge sends hunters to the target's haven or scene (w4)
 *   law      Wanted or a manhunt brings the watch to the culprit, a manhunt sends a patrol each night and knocks at
 *            a day sleeper's haven by day; the culprit yields (the arrest goes to the trial) or resists (a fight) (w5)
 *   lever    an approved lever in an institution does what it says to its target and its town (w2)
 * The culprit's own players answer the law's card; an NPC culprit yields. The Storyteller's card on each move has
 * Send them away, which takes the tokens back. In the Lone Chronicle the hidden seat answers the Storyteller's card
 * and the player answers their own.
 *
 *   Stored   world setting wodx-storyteller.reachState {patrols: {actorId: day}}
 *   Hooks in wodxLawStage (WoDX Chronicle), wodxArrest is called by Chronicle's arrest
 */
import * as R from "./reach-rules.mjs";
import * as K from "./kits-rules.mjs";
import * as Between from "./between.mjs";
import * as Rumours from "./rumours.mjs";
import * as Money from "./money.mjs";
import * as MR from "./money-rules.mjs";
import {MOD, SOCKET, esc, chron, npc, isActiveGM, isPC, gmIds, setting, log} from "./core.mjs";

const DAY = 86400;
const now = () => game.time?.worldTime ?? 0;
const hourNow = () => Math.floor(((now() % DAY) + DAY) % DAY / 3600);
const dayNow = () => Math.floor(now() / DAY);
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 1197; } catch (e) { return 1197; } };
const all = c => (c ? [...(c.contents ?? c)] : []);
const combat = () => (game.modules.get("wodx-combat")?.active ? game.modules.get("wodx-combat").api ?? null : null);
const ownerIds = a => all(game.users).filter(u => !u.isGM && a?.testUserPermission?.(u, "OWNER")).map(u => u.id);
const lawApi = () => chron()?.law?.heat ?? null;

export function registerReachSettings() {
  game.settings.register(MOD, "reachState", {scope: "world", config: false, type: Object, default: {patrols: {}}});
  game.settings.register(MOD, "reachOn", {name: "The world acts on its own", hint: "The watch come for the wanted, hunters raid, road encounters and levers pulled in institutions put people on the map and change what they say.",
    scope: "world", config: true, type: Boolean, default: true});
}
const on = () => setting("reachOn") !== false;
const reachState = () => ({patrols: {}, ...(setting("reachState") ?? {})});

/* ---- where someone is ---- */

/** The scene and token of an actor: first a scene a player is looking at, then any scene. */
export function whereIs(actorId) {
  if ( !actorId ) return null;
  const viewed = new Set(all(game.users).filter(u => u.active && !u.isGM).map(u => u.viewedScene).filter(Boolean));
  const scenes = all(game.scenes).filter(s => all(s.tokens).some(t => t.actorId === actorId));
  const scene = scenes.find(s => viewed.has(s.id)) ?? scenes.find(s => s.active) ?? scenes[0];
  if ( !scene ) return null;
  return {scene, token: all(scene.tokens).find(t => t.actorId === actorId)};
}
/** A day sleeper's haven scene, if WoDX knows one and the actor's token is there. */
function havenWith(actorId) {
  const list = game.modules.get(MOD)?.api?.havens?.list?.() ?? [];
  for ( const {scene, haven} of list ) if ( haven?.owners?.includes(actorId) ) {
    const token = all(scene.tokens).find(t => t.actorId === actorId);
    return {scene, token: token ?? null, haven};
  }
  return null;
}
const lineOf = a => {
  const t = String(a?.type ?? "").toLowerCase();
  return t === "pc" || t === "vampire" ? "vampire" : t;
};

/** A point a few squares from a token (or the scene's middle), so the people arrive close by. */
function nearPoint(scene, token, step = 3) {
  const size = scene.grid?.size ?? 100;
  if ( token ) return {x: token.x + step * size, y: token.y};
  return {x: Math.round((scene.width ?? 2000) / 2), y: Math.round((scene.height ?? 2000) / 2)};
}

/* ---- sending people ---- */

/**
 * Put a move's extras on a scene by a token, in plain sight, and start a fight when they mean harm. Returns the
 * tokens made. kind: a key of R.FORCES, or extras: [{key, n}] to name them.
 */
export async function send({kind = null, extras = null, scene, near = null, hostile = false, why = "", flag = {}} = {}) {
  if ( !isActiveGM() || !scene ) return [];
  const list = extras ?? R.forceFor(kind, yearNow());
  const made = [];
  let i = 0;
  for ( const e of list ) {
    if ( !K.EXTRAS.find(x => x.key === e.key) ) continue;
    const p = nearPoint(scene, near, 3 + Math.floor(i / 5));
    const size = scene.grid?.size ?? 100;
    const toks = await Between.makeExtras(e.key, {n: e.n, x: p.x, y: p.y + (i % 5) * size, scene, hidden: false, quiet: true, flags: {reach: {kind: kind ?? "road", ...flag}}});
    made.push(...toks.filter(t => t?.documentName === "Token" || t?.parent));
    i += e.n;
  }
  if ( hostile && near && made.length ) {
    const sides = Object.fromEntries([...made.map(t => [t.id, "a"]), [near.id, "b"]]);
    try { await combat()?.fight?.start?.({scene, tokens: [...made.map(t => t.id), near.id], source: "world", why: why || "they mean harm", sides}); }
    catch (e) { console.warn(`${MOD} | reach fight`, e); }
  }
  return made;
}

/** Take a move's tokens back (the Storyteller's Send them away). */
export async function sendAway(sceneId, ids = []) {
  const scene = game.scenes.get(sceneId);
  if ( !scene || !game.user.isGM ) return 0;
  const gone = ids.filter(id => scene.tokens.get(id));
  if ( gone.length ) await scene.deleteEmbeddedDocuments("Token", gone);
  return gone.length;
}

async function gmCard(title, text, {scene = null, tokens = []} = {}) {
  return ChatMessage.create({speaker: {alias: "The world"}, whisper: gmIds(),
    content: `<div class="wodx-card wst-reach"><h3>${esc(title)}</h3><p>${esc(text)}</p>${tokens.length ? `<button type="button" data-action="wst-reach-away">Send them away</button>` : ""}</div>`,
    flags: {[MOD]: {reachAway: {scene: scene?.id ?? null, tokens: tokens.map(t => t.id)}}}});
}

/* ---- the road (w3) ---- */

/** An approved road encounter: who it brings stand by the traveller on the scene they reached. */
export async function road({actorId, text} = {}) {
  if ( !isActiveGM() || !on() ) return [];
  const w = whereIs(actorId);
  if ( !w ) return [];
  const plan = R.roadPlan(text, yearNow());
  let made = [];
  if ( plan.extras.length ) made = await send({extras: plan.extras, scene: w.scene, near: w.token, hostile: plan.hostile, why: text, flag: {road: true}});
  else {
    const p = nearPoint(w.scene, w.token, 3);
    try { made = await game.modules.get(MOD)?.api?.night?.place?.(text, {key: `road:${actorId}:${now()}`, scene: w.scene, x: p.x, y: p.y, hidden: false}) ?? []; }
    catch (e) { console.warn(`${MOD} | road people`, e); }
  }
  const a = game.actors.get(actorId);
  await log({kind: "encounter", actor: actorId, name: a?.name, scene: w.scene.uuid, place: w.scene.name, text: `On the road: ${text}`});
  if ( made.length ) await gmCard(`On the road: ${a?.name ?? "a traveller"}`, `${text} They are on ${w.scene.navName || w.scene.name}${plan.hostile ? ", and a fight begins" : ""}.`, {scene: w.scene, tokens: made});
  return made;
}

/* ---- hunters (w4) ---- */

/** An approved raid or purge: hunters go to the target's haven (by day for a day sleeper) or wherever they stand. */
export async function raid({region, kind = "raid", file = null, also = []} = {}) {
  if ( !isActiveGM() || !on() ) return [];
  const ids = [...new Set([file?.id, ...(kind === "purge" ? also : [])].filter(Boolean))].slice(0, 4);
  const out = [];
  for ( const id of ids ) {
    const a = game.actors.get(id);
    if ( !a ) continue;
    const sleeper = R.DAY_SLEEPERS.includes(lineOf(a)) && R.isDayHour(hourNow());
    const h = sleeper ? havenWith(id) : null;
    const w = h?.token ? h : whereIs(id);
    if ( !w?.scene ) { await log({kind: "hunters", text: `The hunters looked for ${a.name} and found no trace.`}); continue; }
    const made = await send({kind: kind === "purge" ? "purge" : "raid", scene: w.scene, near: w.token, hostile: !!w.token, why: `hunters come for ${a.name}`, flag: {target: id}});
    out.push(...made);
    await log({kind: "hunters", actor: id, name: a.name, scene: w.scene.uuid, place: w.scene.name, attention: "The hunters strike", text: `Hunters come for ${a.name} at ${w.scene.navName || w.scene.name}${sleeper ? ", by day" : ""}.`});
    if ( made.length ) await gmCard(`Hunters come for ${a.name}`, `At ${w.scene.navName || w.scene.name}${sleeper ? " by day, while they sleep" : ""}.`, {scene: w.scene, tokens: made});
    for ( const uid of ownerIds(a) ) await ChatMessage.create({speaker: {alias: "The world"}, whisper: [uid], content: `<div class="wodx-card wst-reach"><p><b>${esc(a.name)}:</b> armed strangers are here, and they are looking for you.</p></div>`});
  }
  return out;
}

/* ---- the law (w5) ---- */

const LAW_WORDS = {arrest: "to take you", summon: "to bring you for questioning", detain: "to hold you"};

/** The law comes for someone at a scene: the culprit yields or resists. An NPC culprit yields. */
export async function lawCome({actorId, region, mode = "arrest", at = null, why = ""} = {}) {
  if ( !isActiveGM() || !on() ) return null;
  const a = game.actors.get(actorId);
  if ( !a ) return null;
  const w = at ?? whereIs(actorId);
  if ( !w?.scene || !w.token ) { await log({kind: "note", actor: actorId, name: a.name, text: `The law looked for ${a.name} and did not find them.`}); return null; }
  const kind = mode === "detain" ? "secret" : "law";
  const made = await send({kind, scene: w.scene, near: w.token, why: why || "the law", flag: {target: actorId, mode}});
  const words = R.forceWords(kind, yearNow());
  const owners = ownerIds(a);
  const data = {actor: actorId, region, mode, scene: w.scene.id, token: w.token.id, tokens: made.map(t => t.id), done: false};
  await gmCard(`The law comes for ${a.name}`, `${words} at ${w.scene.navName || w.scene.name}${why ? ` (${why})` : ""}.`, {scene: w.scene, tokens: made});
  if ( !owners.length || !isPC(a) ) return answer({...data, choice: "yield"});
  return ChatMessage.create({speaker: {alias: words.replace(/^\w/, c => c.toUpperCase())}, whisper: [...owners, ...gmIds()],
    content: `<div class="wodx-card wst-reach wst-reach-law"><p><b>${esc(a.name)}:</b> ${esc(words)} are here ${esc(LAW_WORDS[mode] ?? LAW_WORDS.arrest)}.</p>
      <button type="button" data-action="wst-reach-yield">Go with them</button> <button type="button" data-action="wst-reach-resist">Resist</button></div>`,
    flags: {[MOD]: {reachLaw: data}}});
}

/** The culprit's answer: yield (the arrest, or questioning) or resist (a fight, and more heat). */
export async function answer(d, message = null) {
  if ( !isActiveGM() || !d || d.done ) return null;
  const a = game.actors.get(d.actor), scene = game.scenes.get(d.scene);
  if ( message ) await message.update({[`flags.${MOD}.reachLaw.done`]: true});
  const L = lawApi();
  if ( d.choice === "resist" ) {
    try { await L?.add?.(a, "fight", {scene, witnesses: Math.max(1, d.tokens.length)}); } catch (e) { /* no heat */ }
    const near = scene?.tokens.get(d.token);
    if ( near && d.tokens.length ) {
      const sides = Object.fromEntries([...d.tokens.map(id => [id, "a"]), [near.id, "b"]]);
      await combat()?.fight?.start?.({scene, tokens: [...d.tokens, near.id], source: "world", why: "resisting the law", sides, byHand: true});
    }
    await log({kind: "note", actor: d.actor, name: a?.name, text: `${a?.name} resists the law.`});
    return "resist";
  }
  if ( d.mode === "summon" ) await log({kind: "note", actor: d.actor, name: a?.name, text: `${a?.name} goes to be questioned and is let go.`});
  else {
    const has = L?.state?.()?.regions?.[d.region]?.[d.actor];
    if ( !has && a ) { try { await L?.add?.(a, "tax", {scene}); } catch (e) { /* no heat */ } }
    try { await L?.arrest?.(d.actor, d.region); } catch (e) { console.warn(`${MOD} | arrest`, e); }
  }
  // They go with the law: the culprit's token and the watch leave the scene
  const gone = [...d.tokens, ...(d.mode === "summon" ? [] : [d.token])];
  if ( scene ) await sendAway(scene.id, gone);
  return "yield";
}

/** Chronicle's heat reached a stage. */
async function onStage(p = {}) {
  if ( !isActiveGM() || !on() ) return;
  const a = game.actors.get(p.actor);
  if ( !a ) return;
  const move = R.lawMove(p.stage, {crossed: !!p.crossed, line: lineOf(a), hour: hourNow()});
  if ( move === "come" ) {
    const st = reachState();
    st.patrols[a.id] = dayNow();
    await game.settings.set(MOD, "reachState", st);
    await lawCome({actorId: a.id, region: p.region, mode: "arrest", why: p.stage === "manhunt" ? "a manhunt" : "a warrant"});
  }
}

/** Through a manhunt: a patrol each night to the culprit, and a knock at a day sleeper's haven by day. */
export async function patrols() {
  if ( !isActiveGM() || !on() ) return 0;
  const L = lawApi();
  const regions = L?.state?.()?.regions ?? {};
  const st = reachState();
  let n = 0;
  for ( const [region, list] of Object.entries(regions) ) for ( const id of Object.keys(list ?? {}) ) {
    const h = L.of?.(id, region);
    if ( h?.stage?.key !== "manhunt" || !R.patrolDue(st.patrols[id], dayNow()) ) continue;
    const a = game.actors.get(id);
    if ( !a ) continue;
    const haven = havenWith(id);
    const move = R.lawMove("manhunt", {line: lineOf(a), hour: hourNow(), havenKnown: !!haven?.token});
    if ( !move ) continue;
    st.patrols[id] = dayNow();
    n++;
    await game.settings.set(MOD, "reachState", st);
    await lawCome({actorId: id, region, mode: "arrest", at: move === "haven" ? haven : null, why: move === "haven" ? "a knock at the door by day" : "the night patrol"});
  }
  return n;
}

/* ---- levers (w2) ---- */

/** Carry out a lever's moves (institutions.mjs approveLever). Returns the moves done, as words. */
export async function lever({actor, inst, key, target = null, words = ""} = {}) {
  if ( !isActiveGM() || !on() || !actor || !inst ) return [];
  const Inst = game.modules.get(MOD)?.api?.upkeep?.institutions;
  const done = [];
  const wage = MR.wageAt(yearNow());
  const townScene = () => {
    const m = (game.modules.get(MOD)?.api?.upkeep?.markets?.state?.()?.markets ?? []).find(x => x.id === inst.town);
    return (m?.scenes ?? []).map(id => game.scenes.get(id)).find(Boolean) ?? null;
  };
  for ( const m of R.leverMoves(key, {asker: actor.id, target: target?.id ?? null}) ) {
    const who = m.on === "asker" ? actor : (target ?? actor);
    try {
      switch ( m.op ) {
        case "tale": await Rumours.startTale({about: who.id, did: words || m.did, tone: m.tone, big: !!m.big, truth: "half", where: ""}); done.push(`word goes round that ${who.name} ${m.did}`); break;
        case "doubt": for ( const r of Rumours.rumoursAbout(who.id) ) await Rumours.doubtRumour(r.id, {by: actor.name}); done.push(`the talk about ${who.name} is doubted`); break;
        case "cool": { const L = lawApi(), reg = chron()?.world?.here?.(whereIs(who.id)?.scene)?.id ?? chron()?.world?.homeland?.() ?? "moravia"; if ( L?.state?.()?.regions?.[reg]?.[who.id] ) { await L.lower(who.id, reg, m.factor); done.push(`the law eases off ${who.name}`); } break; }
        case "heat": await lawApi()?.add?.(who, m.deed, {scene: whereIs(who.id)?.scene ?? null, named: true}); done.push(`the law takes an interest in ${who.name}`); break;
        case "arrest": { const reg = chron()?.world?.here?.(whereIs(who.id)?.scene)?.id ?? "moravia"; await lawCome({actorId: who.id, region: reg, mode: m.mode, why: inst.name}); done.push(`the law goes for ${who.name}`); break; }
        case "force": { const w = m.kind === "patrol" || m.kind === "soldiers" ? (target ? whereIs(who.id) : null) ?? {scene: townScene(), token: null} : whereIs(who.id); if ( w?.scene ) { const t = await send({kind: m.kind, scene: w.scene, near: w.token, hostile: !!m.hostile && !!w.token, why: inst.name, flag: {lever: key}}); if ( t.length ) await gmCard(`${inst.name}: ${R.forceWords(m.kind, yearNow())}`, `Sent to ${w.scene.navName || w.scene.name}.`, {scene: w.scene, tokens: t}); done.push(`${R.forceWords(m.kind, yearNow())} go out`); } break; }
        case "hunters": { const H = game.modules.get(MOD)?.api?.hunters; const reg = chron()?.world?.here?.(whereIs(who.id)?.scene)?.id ?? chron()?.world?.homeland?.() ?? "moravia"; await H?.add?.(reg, "inquiry", {n: m.n, why: inst.name, who: target ? {id: who.id, name: who.name, kind: String(who.type ?? "")} : null, gain: target ? m.n : 0}); done.push("the hunters hear of it"); break; }
        case "town": await game.modules.get(MOD)?.api?.upkeep?.towns?.lever?.({kind: m.event, town: inst.town, label: inst.name}); done.push("the town feels it"); break;
        case "money": { const sum = R.wagesSum(m.wages, wage); if ( m.wages > 0 ) await Money.receive(who, sum, {note: inst.name}); else await Money.pay(who, sum, {credit: false, note: inst.name}); done.push(`${who.name} ${m.wages > 0 ? "gains" : "loses"} ${MR.formatMoney(sum, Money.moneyNow())}`); break; }
        case "seat": if ( Inst?.seat ) { await Inst.seat(inst.id, who); done.push(`${who.name} gets a seat`); } break;
        case "unseat": if ( Inst?.unseat ) { await Inst.unseat(inst.id, who.id); done.push(`${who.name} loses their seat`); } break;
        case "attitude": { const at = npc()?.attitude; for ( const s of inst.seats ?? [] ) { const h = s.holder?.id ? game.actors.get(s.holder.id) : null; if ( h && !isPC(h) && h.id !== who.id ) await at?.apply?.(h, who, {delta: m.delta, why: inst.name}); } done.push(`${inst.name} thinks ${m.delta > 0 ? "better" : "worse"} of ${who.name}`); break; }
        case "know": await knowCard(actor, who, m.what, inst); done.push(`${actor.name} learns about ${who.name}`); break;
      }
    } catch (e) { console.warn(`${MOD} | lever ${key}:${m.op}`, e); }
  }
  return done;
}

/** What an asker finds: money and standing, where someone is, or the closed shelves. Whispered to the asker's players. */
async function knowCard(asker, who, what, inst) {
  const lines = [];
  if ( what === "where" ) {
    const w = whereIs(who.id);
    lines.push(w ? `${who.name} was seen at ${w.scene.navName || w.scene.name}.` : `${who.name} has not been seen anywhere lately.`);
  } else if ( what === "money" ) {
    let res = 0;
    try { res = Number(who.system?.backgrounds?.resources?.value ?? 0) || 0; } catch (e) { res = 0; }
    lines.push(`${who.name} lives as ${String(MR.lifestyle(res)?.name ?? "getting by").toLowerCase()}.`);
    try { const p = Money.purseOf?.(who); if ( p ) lines.push(`On hand: ${MR.formatMoney(p.carried ?? 0, Money.moneyNow())}; banked: ${MR.formatMoney(p.bank ?? 0, Money.moneyNow())}.`); } catch (e) { /* no purse */ }
    const L = lawApi(), reg = chron()?.world?.here?.(whereIs(who.id)?.scene)?.id ?? "moravia", h = L?.of?.(who.id, reg);
    if ( h && h.stage?.key !== "none" ) lines.push(`The law: ${h.stage.name}.`);
  } else lines.push(`The closed shelves of ${inst.name} are open to ${asker.name} for a season: rolls to research or study there gain two dice.`);
  if ( what === "lore" ) await asker.setFlag(MOD, "closedShelves", {until: now() + 90 * DAY, inst: inst.id});
  const to = [...ownerIds(asker), ...gmIds()];
  await ChatMessage.create({speaker: {alias: inst.name}, whisper: to, content: `<div class="wodx-card wst-reach"><h3>What ${esc(asker.name)} finds</h3>${lines.map(l => `<p>${esc(l)}</p>`).join("")}</div>`});
}

/* ---- Threads of Fate write-backs (w1) ---- */

const regionOfSceneId = id => { try { return chron()?.world?.here?.(game.scenes.get(id))?.id ?? null; } catch (e) { return null; } };
/** The factions a story touches: those holding places in its region, and any the story's NPC belongs to. */
function storyFactions(region, aboutId) {
  const list = (() => { try { return npc()?.factions?.state?.()?.factions ?? []; } catch (e) { return []; } })().filter(f => !f.dormant && !f.ended);
  const out = list.filter(f => (aboutId && (f.leader === aboutId || (f.members ?? []).includes(aboutId))) || (region && (f.places ?? []).some(p => regionOfSceneId(p) === region)));
  return out.slice(0, 3);
}

/** Carry out a story ending's write-backs. story: the storyline (its from signal has about, region); pcs: who was there. */
export async function writeBack(story, ending, pcs = []) {
  if ( !isActiveGM() ) return [];
  const done = [];
  const region = story?.region || story?.from?.region || chron()?.world?.homeland?.() || "moravia";
  const aboutId = story?.from?.about ?? null;
  const about = aboutId ? game.actors.get(aboutId) : null;
  const facs = storyFactions(region, aboutId);
  const npcs = [...new Set([about && !isPC(about) ? about : null, ...facs.map(f => (f.leader ? game.actors.get(f.leader) : null))].filter(Boolean))];
  const L = game.modules.get(MOD)?.api?.ledger;
  for ( const w of ending?.writes ?? [] ) for ( const m of R.writeMoves(w) ) {
    try {
      switch ( m.op ) {
        case "standing": for ( const f of facs ) for ( const pc of pcs ) await npc()?.factions?.adjustPeople?.(f.id, pc.id, {delta: m.delta}); if ( facs.length ) done.push(`${facs.map(f => f.name).join(", ")}: ${m.delta > 0 ? "warmer" : "cooler"} to the characters`); break;
        case "memory": for ( const n of npcs ) for ( const pc of pcs ) await npc()?.memory?.remember?.(n, pc, {kind: m.kind, text: `${story.title}: ${ending.label}`}); if ( npcs.length ) done.push(`${npcs.map(n => n.name).join(", ")} will remember`); break;
        case "heirs": for ( const n of npcs ) for ( const h of all(game.actors).filter(x => x.flags?.["wodx-creation"]?.lineage?.family?.heirOf?.id === n.id && !isPC(x)) ) for ( const pc of pcs ) { await npc()?.memory?.remember?.(h, pc, {kind: "insult", text: `${story.title}: a feud from ${n.name}`}); done.push(`${h.name} takes up the feud`); } break;
        case "debt": { const pc = pcs[0], n = npcs[0]; if ( pc && L?.save ) { const fromPc = m.from === "pcs"; await L.save({kind: fromPc && about?.type === "Vampire" ? "boon" : "debt", size: m.size, from: fromPc ? {id: pc.id, name: pc.name} : {id: n?.id ?? null, name: n?.name ?? story.title}, to: fromPc ? {id: n?.id ?? null, name: n?.name ?? story.title} : {id: pc.id, name: pc.name}, what: `${story.title}: ${w.what}`}); done.push("a debt goes in the ledger"); } break; }
        case "paid": { const st = L?.state?.(); for ( const e of st?.entries ?? [] ) if ( e.status === "open" && String(e.what ?? "").startsWith(`${story.title}:`) ) await L.status?.(e.id, "paid"); break; }
        case "hunters": { const H = game.modules.get(MOD)?.api?.hunters; await H?.add?.(region, "manual", {n: m.n, why: story.title, who: m.lead && about ? {id: about.id, name: about.name, kind: String(about.type ?? "")} : null, gain: m.lead ? 2 : 0}); done.push(m.n > 0 ? "the hunters have a lead" : "the hunters stand down"); break; }
        case "town": { const mk = (game.modules.get(MOD)?.api?.upkeep?.markets?.state?.()?.markets ?? []).find(x => (x.scenes ?? []).some(id => regionOfSceneId(id) === region)); if ( mk ) { await game.modules.get(MOD)?.api?.upkeep?.towns?.lever?.({kind: m.event, town: mk.id, label: story.title}); done.push(`${mk.name} is changed`); } break; }
      }
    } catch (e) { console.warn(`${MOD} | write-back ${w.what}`, e); }
  }
  return done;
}

/* ---- projects that end (w6) ---- */

/**
 * What a finished long task leaves, done now: a language goes on the sheet, a trail names where the quarry is, and
 * research puts the matching journal pages in the character's codex. Business and Herd dots stay the Storyteller's.
 */
export async function projectDone(actor, task) {
  if ( !isActiveGM() || !actor || !task ) return null;
  const P = game.modules.get(MOD)?.api?.tasks?.projects;
  const to = [...ownerIds(actor), ...gmIds()];
  const card = (title, body) => ChatMessage.create({speaker: {alias: actor.name}, whisper: to, content: `<div class="wodx-card wst-reach"><h3>${esc(title)}</h3>${body}</div>`});
  if ( task.kind === "language" ) {
    const lang = P?.languageOf?.(task);
    const L = chron()?.languages;
    if ( !lang || !L?.set ) return null;
    await L.set(actor, [...(L.of?.(actor) ?? []), lang]);
    await card(`${actor.name} speaks ${lang}`, `<p>${esc(lang)} is on the sheet now.</p>`);
    return lang;
  }
  if ( task.kind === "track" ) {
    const id = task.target?.id;
    const w = id ? whereIs(id) : null;
    const reg = w ? chron()?.world?.here?.(w.scene) : null;
    await card(`The trail of ${task.target?.name ?? "the quarry"}`, `<p>${w ? `It ends at ${esc(w.scene.navName || w.scene.name)}${reg?.label ? `, in ${esc(reg.label)}` : ""}.` : "It goes cold: wherever they are, it is beyond these lands."}</p>`);
    return w?.scene?.id ?? null;
  }
  if ( task.kind === "research" ) {
    const words = P?.researchWords?.(task) ?? [];
    const pages = words.length ? all(game.journal).flatMap(j => all(j.pages)).filter(p => words.some(w => String(p.name ?? "").toLowerCase().includes(w))).slice(0, 4) : [];
    const C = game.modules.get(MOD)?.api?.codex;
    for ( const p of pages ) { try { await C?.reveal?.(p, [actor]); } catch (e) { /* no codex */ } }
    await card(`What ${actor.name} found`, pages.length ? `<p>In the codex now: ${esc(pages.map(p => p.name).join(", "))}.</p>` : "<p>Nothing written down answers it. The question stays open.</p>");
    return pages.length;
  }
  return null;
}

/* ---- wiring ---- */

export function registerReachHooks() {
  Hooks.on("wodxLawStage", p => { onStage(p).catch(e => console.error(`${MOD} | law stage`, e)); });
  Hooks.on("updateWorldTime", () => { try { if ( chron()?.isSkipping?.() ) return; } catch (e) { /* no Chronicle */ } patrols().catch(e => console.error(`${MOD} | patrols`, e)); });
  Hooks.on("renderChatMessageHTML", (message, el) => {
    const html = el?.[0] ?? el;
    const away = message.flags?.[MOD]?.reachAway;
    if ( away ) for ( const b of html.querySelectorAll?.("[data-action=wst-reach-away]") ?? [] ) {
      if ( !game.user.isGM ) { b.remove(); continue; }
      b.addEventListener("click", async () => { b.disabled = true; await sendAway(away.scene, away.tokens); });
    }
    const law = message.flags?.[MOD]?.reachLaw;
    if ( !law ) return;
    for ( const b of html.querySelectorAll?.("[data-action^=wst-reach-]") ?? [] ) {
      if ( b.dataset.action === "wst-reach-away" ) continue;
      const a = game.actors.get(law.actor);
      if ( law.done || !(game.user.isGM || a?.isOwner) ) { b.disabled = true; continue; }
      b.addEventListener("click", () => {
        b.disabled = true;
        const choice = b.dataset.action === "wst-reach-resist" ? "resist" : "yield";
        if ( isActiveGM() ) answer({...law, choice}, message).catch(e => console.error(`${MOD} | law answer`, e));
        else game.socket.emit(SOCKET, {type: "req.reach", payload: {userId: game.user.id, messageId: message.id, choice}});
      });
    }
  });
}

/** A player's answer to the law's card, on the active Storyteller's client. */
export async function onRequest(p = {}) {
  const message = game.messages.get(p.messageId), user = game.users.get(p.userId);
  const d = message?.flags?.[MOD]?.reachLaw;
  const a = d ? game.actors.get(d.actor) : null;
  if ( !d || !user || !a?.testUserPermission?.(user, "OWNER") ) return null;
  return answer({...d, choice: p.choice === "resist" ? "resist" : "yield"}, message);
}

export const api = () => ({send, sendAway, whereIs, road, raid, lawCome, answer, patrols, lever, writeBack, projectDone, rules: R});
