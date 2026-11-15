/**
 * WoDX Actions: summoned beings in Foundry (B4820-B4829). The rules are summon-rules.js; the books' own rules for each
 * power are summon-specs.js.
 *
 * A summoning puts tokens on the map with a record (flags.wodx-actions.summon) of who called them, how long they stay,
 * who commands them and the roll that keeps them in hand:
 *   control   direct: the summoner's players own the token and move it; orders: it serves the summoner through WoDX
 *             NPC's orders (and its fight plans), hard orders weighed by the Storyteller; none or hostile: WoDX NPC
 *             plays it, a hostile one against everyone
 *   lasting   a "Summoned" timed effect on each token (WoDX Chronicle ends it by round, scene, dawn or clock); when it
 *             ends, the being leaves the map in smoke, fog or dust. No timer: it stays until dismissed, destroyed,
 *             its task done or its upkeep unpaid
 *   combat    a fight on the scene takes it in with an initiative roll
 *   keeping   a roll each turn, on arrival or when away from the summoner, as the book asks; failing, it breaks loose
 *   dismiss   the summoner's player or the Storyteller sends it away from its token's HUD or the card
 *   upkeep    a lasting servant (an effigy, a familiar) is fed from the master's pool each day, week or month; unfed
 *             it falls still or leaves; a familiar's death costs its mage as M20 says
 * An NPC's summons serve that NPC: WoDX NPC runs their turns like any of its fighters.
 */
import * as E from "./effects-rules.js";
import * as SR from "./summon-rules.js";
import { SPECS, NOT_SUMMON, specKey } from "./summon-specs.js";
import { countSuccesses } from "./core-rules.js";

/** Past this many yards, a being bound to stay near rolls to stay in hand (B4823, house reading). */
export const AWAY_YARDS = 20;
const MOD = "wodx-actions";
const NPC = "wodx-npc";
const FOLDER = "WoDX summoned beings";
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const docOf = uuid => { try { return uuid ? fromUuidSync(uuid) : null; } catch (e) { return null; } };
const actorOf = d => d?.actor ?? (d?.documentName === "Actor" ? d : null);
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const wait = ms => new Promise(r => setTimeout(r, ms));
export const flagOf = tok => tok?.flags?.[MOD]?.summon ?? tok?.document?.flags?.[MOD]?.summon ?? null;
const ownersOf = a => game.users.filter(u => !u.isGM && a?.testUserPermission?.(u, "OWNER"));
const IMG = {animal: "icons/svg/pawprint.svg", swarm: "icons/svg/pawprint.svg", beast: "icons/svg/pawprint.svg", corpse: "icons/svg/skull.svg",
  ghost: "icons/svg/aura.svg", spirit: "icons/svg/aura.svg", shade: "icons/svg/terror.svg", demon: "icons/svg/terror.svg", elemental: "icons/svg/fire.svg",
  faerie: "icons/svg/aura.svg", double: "icons/svg/mystery-man.svg", person: "icons/svg/mystery-man.svg"};

/** The spec for a power by its line and name; null when the power has none (the caller falls back to the keyword's). */
export function specFor(name, line = "") {
  const k = specKey(line, name);
  if ( SPECS[k] ) return SPECS[k];
  const bare = specKey("", name);
  const hit = Object.keys(SPECS).find(key => key.endsWith(`|${bare.slice(1)}`));
  return hit ? SPECS[hit] : null;
}

/** A power the inventory tagged as a summoning that calls nothing: the keywords it works through instead (B4836). */
export function notSummonOf(name, line = "") {
  const k = specKey(line, name);
  if ( NOT_SUMMON[k] ) return NOT_SUMMON[k];
  const bare = specKey("", name).slice(1);
  const hit = Object.keys(NOT_SUMMON).find(key => key.endsWith(`|${bare}`));
  return hit ? NOT_SUMMON[hit] : null;
}

/** The dice a pool gives: "willpower", "manipulation+occult" and the like, read from the sheet. */
export function poolDice(actor, pool = "willpower") {
  const s = actor?.system ?? {};
  return String(pool).split("+").map(p => p.trim().toLowerCase()).reduce((t, k) => {
    if ( ["willpower", "faith", "gnosis", "rage", "torment", "conviction", "balance"].includes(k) ) return t + n(s.advantages?.[k]?.permanent ?? s.advantages?.[k]?.value);
    if ( s.attributes?.[k] ) return t + n(s.attributes[k].total ?? s.attributes[k].value);
    if ( s.abilities?.[k] ) return t + n(s.abilities[k].value);
    return t;
  }, 0);
}

/** The rating of a Background on the sheet (an item named for it, or the system's own field). */
function backgroundOf(actor, name) {
  const re = new RegExp(`^${name}`, "i");
  const it = (actor?.items ?? []).find(i => re.test(i.name ?? "") && /background/i.test(`${i.type} ${i.system?.type ?? ""}`)) ?? (actor?.items ?? []).find(i => re.test(i.name ?? ""));
  return {item: it ?? null, rating: n(it?.system?.value ?? it?.system?.rating ?? actor?.system?.backgrounds?.[name.toLowerCase()]?.value)};
}

/** The lasting servants a master already has, on every scene. */
function servantsOf(actor, {familiar = false} = {}) {
  let k = 0;
  for ( const s of game.scenes ?? [] ) for ( const t of s.tokens ?? [] ) {
    const f = t.flags?.[MOD]?.summon;
    if ( f && f.byId === actor.id && f.persist && !f.dead && !!f.familiar === familiar ) k++;
  }
  return k;
}

/**
 * B4929: over the cap, the Storyteller may raise the Background (the character's experience pays) or allow it once.
 * Players are refused with the reason.
 */
async function withinCap(actor, r, {familiar = false} = {}) {
  const bg = backgroundOf(actor, familiar ? "Familiar" : "Retainers");
  const adding = familiar ? 1 : Math.max(1, n(r.tokens));
  const cap = SR.servantCap({rating: bg.rating, have: servantsOf(actor, {familiar}), adding, familiar});
  if ( !cap.over ) return true;
  const why = `${actor.name} keeps ${cap.have} lasting ${familiar ? "familiar" : "servant"}${cap.have === 1 ? "" : "s"} and ${cap.bg} ${bg.rating} allows ${cap.cap}.`;
  if ( !game.user.isGM ) { ui.notifications?.warn?.(`${why} Raise ${cap.bg} with experience first.`); return false; }
  const cost = SR.backgroundCost(bg.rating);
  const C = game.modules.get("wodx-creation")?.api;
  const avail = n(C?.data?.xpTotals?.(actor)?.available ?? NaN);
  const pick = await foundry.applications.api.DialogV2.wait({window: {title: `Over the ${cap.bg} rating`},
    content: `<p>${esc(why)}</p><p>Raising ${esc(cap.bg)} to ${bg.rating + 1} costs ${cost} experience (WoDX house cost)${Number.isFinite(avail) ? `; ${avail} available` : ""}.</p>`,
    buttons: [{action: "buy", label: `Raise ${cap.bg} (${cost} XP)`, default: true}, {action: "allow", label: "Allow it this once"}, {action: "no", label: "Cancel"}], rejectClose: false}).catch(() => "no");
  if ( pick === "allow" ) return true;
  if ( pick !== "buy" ) return false;
  if ( Number.isFinite(avail) && avail < cost ) { ui.notifications?.warn?.(`${actor.name} has ${avail} experience; ${cost} is needed.`); return false; }
  if ( bg.item ) await bg.item.update({"system.value": bg.rating + 1});
  else await actor.createEmbeddedDocuments("Item", [{name: cap.bg, type: "Feature", system: {type: "wod.types.background", value: 1}}]);
  await actor.createEmbeddedDocuments("Item", [{name: `${cap.bg} ${bg.rating + 1}`, type: "Experience", system: {amount: cost, isspent: true},
    flags: {"wodx-creation": {time: game.time?.worldTime ?? 0, kind: "background", key: cap.bg.toLowerCase(), from: bg.rating, to: bg.rating + 1, by: game.user.name, for: actor.id}}}]);
  await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor}), content: `<div class="wodx-card"><p>${esc(actor.name)} raises ${esc(cap.bg)} to ${bg.rating + 1} for ${cost} experience, to keep the new ${familiar ? "familiar" : "servant"}.</p></div>`});
  return true;
}

/** B4928: the traits behind a pool, for the roll breakdown: [{name, value}]. */
export function poolParts(actor, pool = "willpower") {
  return String(pool).split("+").map(p => p.trim().toLowerCase()).filter(Boolean).map(k => ({name: k[0].toUpperCase() + k.slice(1), value: poolDice(actor, k)}));
}

async function rollDice(dice, diff) {
  let faces = [], roll = null;
  if ( dice > 0 ) { roll = new Roll(`${dice}d10`); await roll.evaluate(); faces = roll.dice[0]?.results?.map(r => r.result) ?? []; }
  return {...countSuccesses(faces, diff), faces, dice, difficulty: diff, roll};
}

/** A plain being for the summons when the Storyteller names none: one hidden base actor per kind, stats on the token. */
async function baseFor(what) {
  const found = game.actors.find(a => a.getFlag(MOD, "summonBase") === what);
  if ( found ) return found;
  let folder = game.folders.find(f => f.type === "Actor" && f.getFlag(MOD, "summoned"));
  folder ??= await Folder.create({name: FOLDER, type: "Actor", color: "#4a2f5a", flags: {[MOD]: {summoned: true}}});
  const type = what === "person" ? (CONFIG.worldofdarkness?.sheettype?.mortal ?? "Mortal") : (CONFIG.worldofdarkness?.sheettype?.creature ?? "Creature");
  return Actor.create({name: `Summoned ${SR.WHAT[what] ?? what}`, type, folder: folder.id, img: IMG[what] ?? "icons/svg/mystery-man.svg",
    prototypeToken: {actorLink: false, disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL, texture: {src: IMG[what] ?? "icons/svg/mystery-man.svg"}},
    flags: {[MOD]: {summonBase: what}, [NPC]: {behavior: {template: what === "animal" || what === "swarm" || what === "beast" ? "beast" : "thug"}}}});
}

/** The book's numbers on a token's own sheet (a delta), from resolved stats. */
function statsDelta(stats) {
  if ( !stats ) return {};
  const sys = {};
  for ( const k of ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"] )
    if ( Number.isFinite(stats[k]) ) foundry.utils.setProperty(sys, `attributes.${k}.value`, stats[k]);
  for ( const k of ["brawl", "melee", "dodge", "alertness", "athletics", "stealth", "survival"] )
    if ( Number.isFinite(stats[k]) ) foundry.utils.setProperty(sys, `abilities.${k}.value`, stats[k]);
  if ( Number.isFinite(stats.health) ) foundry.utils.setProperty(sys, "traits.health.totalhealthlevels", {value: stats.health, max: stats.health});
  return Object.keys(sys).length ? {system: sys} : {};
}

const centerOf = t => {
  const g = t?.parent?.grid?.size ?? canvas?.grid?.size ?? 100;
  return {x: n(t?.x) + (Number(t?.width) || 1) * g / 2, y: n(t?.y) + (Number(t?.height) || 1) * g / 2};
};
async function showLook(scene, kind, at, seconds = 12) {
  if ( !kind || !scene ) return null;
  try { return await chron()?.looks?.show?.({scene, kind, at: {x: at.x, y: at.y, radius: 120}, until: {seconds}, fade: 400, source: "wodx-summon"}); } catch (e) { return null; }
}

/** The started fight on a scene, if any. */
const fightOn = scene => game.combats?.find(c => c.scene?.id === scene?.id && c.started) ?? null;

async function joinFight(scene, toks) {
  const combat = fightOn(scene);
  if ( !combat || !toks.length ) return [];
  const have = new Set(combat.combatants.map(c => c.tokenId));
  const add = toks.filter(t => !have.has(t.id)).map(t => ({tokenId: t.id, sceneId: scene.id, actorId: t.actorId, hidden: t.hidden}));
  if ( !add.length ) return [];
  const made = await combat.createEmbeddedDocuments("Combatant", add);
  try {
    const C = game.modules.get("wodx-combat")?.api;
    if ( C?.rollInitiative ) await C.rollInitiative({combat, combatants: made, automatic: true});
    else await combat.rollInitiative(made.map(c => c.id));
  } catch (e) { console.warn("WoDX | summoned initiative", e); }
  return made.map(c => c.id);
}

/**
 * Bring a summoning onto the map. item: an effects-card item ({out: {summon, actor, label}, caster, at}); src: the
 * actor that answers (or null for a plain being of the kind); at: {x, y}. Returns the undo record.
 */
export async function bring(item, {src = null, at, casterName = "the summoner", scene = canvas?.scene} = {}) {
  const o = item?.out ?? {};
  const r = o.summon ?? SR.resolve(null, {successes: n(o.count) * 2});
  const caster = actorOf(docOf(item.caster)) ?? null;
  const casterTok = caster?.getActiveTokens?.()?.[0]?.document ?? null;
  if ( !scene || !at ) return {note: `${o.label ?? "Summon"}: no spot to place it`};
  // B4929: a player's lasting servants count against Retainers (a familiar against Familiar)
  if ( r.persist && caster?.hasPlayerOwner && !(await withinCap(caster, r, {familiar: !!item.familiar})) ) return {note: `${o.label ?? "Summon"}: over the ${item.familiar ? "Familiar" : "Retainers"} rating`};
  // B4841: a summoning with a price per being pays it from the caster's pool, and only what is paid for comes
  if ( r.cost && caster ) {
    const P = E.poolOf(r.cost.pool);
    const have = n(foundry.utils.getProperty(caster, P.path));
    const pay = SR.payFor(r.cost, r.tokens, have);
    if ( pay.count < 1 ) return {note: `${o.label ?? "Summon"}: not enough ${r.cost.pool} to pay for even one`};
    await caster.update({[P.path]: have - pay.paid});
    r.tokens = pay.count; r.count = pay.count;
  }
  src ??= await baseFor(r.what);
  const id = foundry.utils.randomID();
  const owners = r.control === "direct" ? ownersOf(caster) : [];
  const D = CONST.TOKEN_DISPOSITIONS;
  const disposition = r.control === "hostile" ? D.HOSTILE : (casterTok?.disposition ?? (caster?.hasPlayerOwner ? D.FRIENDLY : D.HOSTILE));
  const record = {id, by: caster?.uuid ?? null, byId: caster?.id ?? null, byName: caster?.name ?? casterName, power: o.label ?? "Summon", what: r.what,
    profile: r.profile, control: r.control, range: r.range, roll: r.roll, lasts: r.lasts, lastsKind: r.lastsKind, persist: r.persist, upkeep: r.upkeep,
    page: r.page, look: r.look, made: game.time?.worldTime ?? 0, scene: scene.id, owners: owners.map(u => u.id), shareWounds: r.shareWounds ?? null};
  const proto = (await src.getTokenDocument()).toObject();
  const size = scene.grid?.size ?? 100;
  const k = Math.max(1, Math.min(SR.MAX_TOKENS, r.tokens));
  const serves = r.control === "direct" || r.control === "orders" ? (caster?.id ? [caster.id] : []) : [];
  const docs = Array.from({length: k}, (_, i) => foundry.utils.mergeObject(foundry.utils.deepClone(proto), {
    x: Math.round(at.x - size / 2 + (i % 4) * size), y: Math.round(at.y - size / 2 + Math.floor(i / 4) * size),
    name: r.swarm ? `${src.name} (a swarm of ${r.count})` : proto.name, actorLink: false, disposition, alpha: 0.15,
    ...(r.swarm ? {width: Math.min(4, 1 + Math.floor(Math.log10(Math.max(1, r.count)))), height: Math.min(4, 1 + Math.floor(Math.log10(Math.max(1, r.count))))} : {}),
    delta: foundry.utils.mergeObject(statsDelta(r.stats), {
      ...(owners.length ? {ownership: Object.fromEntries(owners.map(u => [u.id, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER]))} : {}),
      flags: {[NPC]: {serves, ...(r.control === "hostile" ? {order: null} : {})}}}),
    flags: {[MOD]: {summon: record}}
  }));
  const made = await scene.createEmbeddedDocuments("Token", docs);
  await showLook(scene, r.look, at);
  await wait(150);
  for ( const t of made ) await t.update({alpha: 1}, {animation: {duration: 700}});
  // How long it stays: a timed effect on each token's own actor, which WoDX Chronicle ends by its clock
  const T = chron();
  if ( r.timed && T?.applyTimed ) {
    for ( const t of made ) {
      try {
        await T.applyTimed(t.actor, {name: `Summoned (${o.label ?? "Summon"})`, img: "icons/svg/aura.svg", description: `Called by ${record.byName}; stays for ${r.lasts}.`,
          duration: r.timed, key: `wodx-summon-${id}`, revert: {key: "wodx-actions.summonEnd", data: {token: t.uuid, why: "its time is up"}}, source: r.page});
      } catch (e) { console.warn("WoDX | summon timer", e); }
    }
  }
  const fought = await joinFight(scene, made);
  // A roll on arrival (Thaumaturgy's elemental, a Solomonic binding) sets the control the being stays under
  let kept = null;
  if ( r.roll?.when === "arrival" ) kept = await keepingRoll(made, record, caster, {why: "on arrival"});
  await card(record, made, {casterName: record.byName, kept, fought: fought.length});
  return {made: made.map(t => t.uuid), summon: id};
}

/** The public card: what came, the rules it lives by, and Dismiss. */
async function card(record, made, {casterName, kept = null, fought = 0} = {}) {
  const r = {...record, whatLabel: SR.WHAT[record.what], count: made.length, swarm: /swarm/.test(made[0]?.name ?? ""), tokens: made.length};
  const lines = SR.cardLines({...r, count: made.length > 1 ? made.length : (r.swarm ? record.count ?? 1 : 1), roll: record.roll}, {caster: casterName});
  return ChatMessage.create({speaker: {alias: casterName}, flags: {[MOD]: {summonCard: {id: record.id, tokens: made.map(t => t.uuid), by: record.by}}},
    content: `<div class="wodx-card wodx-summon"><h3><i class="fa-solid fa-ghost"></i> ${esc(record.power)}: ${esc(made.map(t => t.name).filter((x, i, a) => a.indexOf(x) === i).join(", "))}</h3>
      <ul>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>
      ${kept ? `<p>${esc(kept)}</p>` : ""}${fought ? `<p class="wodx-quiet">It joins the fight and rolls initiative.</p>` : ""}
      ${record.page ? `<p class="wodx-quiet">${esc(record.page)}</p>` : ""}
      <button type="button" class="wodx-summon-dismiss"><i class="fa-solid fa-door-open"></i> Dismiss</button></div>`});
}

/** Roll to keep it in hand. Returns the line for the card. */
async function keepingRoll(toks, record, caster, {why = ""} = {}) {
  const R = record.roll;
  if ( !R ) return null;
  const who = R.who === "creature" ? toks[0]?.actor : caster;
  const dice = Math.max(1, poolDice(who, R.pool));
  const res = await rollDice(dice, n(R.diff) || 6);
  const after = SR.controlAfter(R, res);
  const label = String(R.pool ?? "willpower").split("+").map(s => s[0].toUpperCase() + s.slice(1)).join(" + ");
  let line = `${who?.name ?? "The summoner"} rolls ${label} (${dice} dice) at ${R.diff} ${why}: ${res.botch ? "a botch" : `${res.successes} success${res.successes === 1 ? "" : "es"}`}.`;
  if ( after.mode === "kept" || after.mode === "direct" || after.mode === "orders" ) {
    if ( after.mode !== "kept" ) for ( const t of toks ) await setControl(t, after.mode, record);
    line += ` It stays in hand${after.note ? `: ${after.note}` : ""}.`;
  } else {
    for ( const t of toks ) await slip(t, after.fail ?? R.fail, {why});
    line += ` It ${SR.slipOf(after.fail ?? R.fail).text}${after.note ? ` (${after.note})` : ""}.`;
  }
  await ChatMessage.create({speaker: {alias: record.byName}, rolls: res.roll ? [res.roll] : [], whisper: R.who === "creature" ? gmIds() : undefined,
    content: `<div class="wodx-card wodx-summon"><p><b>${esc(record.power)}</b>: ${esc(line)}</p></div>`});
  return line;
}

/** Hand control to the summoner's players, to orders, or to no one. */
async function setControl(tok, mode, record) {
  const caster = actorOf(docOf(record.by));
  const owners = mode === "direct" ? ownersOf(caster) : [];
  const was = flagOf(tok)?.owners ?? [];
  const own = Object.fromEntries([...was.map(id => [id, CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE]), ...owners.map(u => [u.id, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER])]);
  await tok.actor?.update?.({ownership: own, [`flags.${NPC}.serves`]: mode === "direct" || mode === "orders" ? (caster?.id ? [caster.id] : []) : []});
  await tok.update({[`flags.${MOD}.summon.control`]: mode, [`flags.${MOD}.summon.owners`]: owners.map(u => u.id)});
}

/** It breaks loose: hostile to all (or to its summoner), free, or gone. */
export async function slip(tok, fail, {why = ""} = {}) {
  const s = SR.slipOf(fail);
  const rec = flagOf(tok);
  if ( !tok || !rec ) return null;
  if ( s.leaves ) return dismiss(tok, {why: "it breaks free and leaves"});
  await setControl(tok, s.mode, rec);
  const D = CONST.TOKEN_DISPOSITIONS;
  await tok.update({disposition: s.mode === "hostile" ? D.HOSTILE : D.NEUTRAL, [`flags.${MOD}.summon.slipped`]: {fail, at: game.time?.worldTime ?? 0, why}});
  // WoDX NPC's fight plans: an attack order on the summoner, or the nearest living thing
  const scene = tok.parent;
  let target = null;
  if ( s.attack === "summoner" ) target = scene?.tokens?.find(t => t.actor?.uuid === rec.by || t.actorId === rec.byId) ?? null;
  else if ( s.attack === "nearest" ) {
    const me = centerOf(tok);
    target = (scene?.tokens?.contents ?? []).filter(t => t.id !== tok.id && t.actor && !flagOf(t)?.id?.includes?.(rec.id) && flagOf(t)?.id !== rec.id)
      .sort((a, b) => Math.hypot(centerOf(a).x - me.x, centerOf(a).y - me.y) - Math.hypot(centerOf(b).x - me.x, centerOf(b).y - me.y))[0] ?? null;
  }
  if ( target ) await tok.actor?.update?.({[`flags.${NPC}.order`]: {kind: "attack", target: target.id, by: game.user.id, at: game.time?.worldTime ?? 0, hard: false}});
  refreshLook(tok);
  return {mode: s.mode, target: target?.id ?? null};
}

/** Send it away: it fades from the map in its look, leaves the fight, and its token goes. */
export async function dismiss(tok, {why = "dismissed"} = {}) {
  if ( !tok?.parent || !isActiveGM() ) return false;
  const rec = flagOf(tok);
  const scene = tok.parent;
  await showLook(scene, rec?.look ?? "smoke", centerOf(tok), 6);
  try { await tok.update({alpha: 0}, {animation: {duration: 600}}); } catch (e) { /* gone already */ }
  await wait(650);
  for ( const c of game.combats ?? [] ) {
    const ids = c.combatants.filter(x => x.tokenId === tok.id && x.sceneId === scene.id).map(x => x.id);
    if ( ids.length ) await c.deleteEmbeddedDocuments("Combatant", ids);
  }
  const name = tok.name;
  await scene.deleteEmbeddedDocuments("Token", [tok.id]).catch(() => null);
  if ( rec ) await ChatMessage.create({speaker: {alias: rec.byName ?? "WoDX"}, content: `<div class="wodx-card wodx-summon"><p>${esc(name)} leaves: ${esc(why)}.</p></div>`});
  return true;
}

/** Dismiss everything one summoning brought. */
export async function dismissAll(id, why = "dismissed") {
  let k = 0;
  for ( const scene of game.scenes ?? [] ) for ( const t of [...(scene.tokens ?? [])] ) if ( flagOf(t)?.id === id ) { if ( await dismiss(t, {why}) ) k++; }
  return k;
}

/** May this user send it away? The Storyteller, its owners, or the summoner's owners. */
export function canDismiss(tok, user = game.user) {
  const rec = flagOf(tok);
  if ( !rec ) return false;
  if ( user.isGM ) return true;
  if ( tok.actor?.testUserPermission?.(user, "OWNER") ) return true;
  const by = actorOf(docOf(rec.by));
  return !!by?.testUserPermission?.(user, "OWNER");
}

/** A player's dismiss goes to the Storyteller's client. */
export async function requestDismiss(tok) {
  if ( !canDismiss(tok) ) return ui.notifications?.warn?.("Only its summoner or the Storyteller can send it away.");
  if ( game.user.isGM ) return dismiss(tok, {why: "sent away"});
  game.socket.emit(`module.${MOD}`, {action: "summonDismiss", token: tok.uuid, user: game.user.id});
  return true;
}
export async function onDismissRequest(p) {
  const tok = docOf(p?.token);
  const user = game.users.get(p?.user);
  if ( tok && user && canDismiss(tok, user) ) return dismiss(tok, {why: `sent away by ${user.name}`});
  return false;
}

/** Each turn of a being the book keeps on a short leash: the summoner's roll, or it slips. */
async function onTurn(combat) {
  if ( !isActiveGM() || !combat?.started ) return;
  const c = combat.combatant;
  const tok = c?.token;
  const rec = flagOf(tok);
  if ( !rec?.roll || rec.slipped || !["each-turn", "away"].includes(rec.roll.when) || ["hostile", "none"].includes(rec.control) ) return;
  const key = `${combat.id}:${combat.round}:${combat.turn}`;
  if ( rec.lastCheck === key ) return;
  await tok.update({[`flags.${MOD}.summon.lastCheck`]: key});
  const caster = actorOf(docOf(rec.by));
  if ( rec.roll.when === "away" ) {
    const ct = tok.parent?.tokens?.find(t => t.actor?.uuid === rec.by || t.actorId === rec.byId);
    const yards = ct ? Math.hypot(centerOf(ct).x - centerOf(tok).x, centerOf(ct).y - centerOf(tok).y) / (tok.parent.grid?.size ?? 100) * (n(tok.parent.grid?.distance) || 1) / 3 : Infinity;
    if ( yards <= AWAY_YARDS ) return;
  }
  await keepingRoll([tok], rec, caster, {why: `on its turn (round ${combat.round})`});
}

/** Chronicle's timer ran out: the being leaves (after the timed effect itself is gone). */
function onEnd(actor, data) {
  setTimeout(() => { const t = docOf(data?.token); if ( t ) dismiss(t, {why: data?.why ?? "its time is up"}).catch(e => console.warn("WoDX | summon end", e)); }, 50);
}

/* ------------------------------------------------------------------ */
/*  Companions that last: upkeep and loss                              */
/* ------------------------------------------------------------------ */

/** Feed every lasting servant whose upkeep fell due; unfed, it falls still or leaves. Active GM only. */
export async function sweepUpkeep(now = game.time?.worldTime ?? 0) {
  if ( !isActiveGM() ) return 0;
  let k = 0;
  const E = await import("./effects-rules.js");
  for ( const scene of game.scenes ?? [] ) for ( const tok of [...(scene.tokens ?? [])] ) {
    const rec = flagOf(tok);
    if ( !rec?.upkeep || rec.dormant ) continue;
    const due = SR.upkeepDue(rec.upkeep, rec.paidAt ?? rec.made ?? 0, now);
    if ( !due.periods ) continue;
    const master = actorOf(docOf(rec.by));
    const P = E.poolOf(rec.upkeep.pool);
    const have = n(foundry.utils.getProperty(master ?? {}, P.path));
    const need = n(rec.upkeep.points) * due.periods;
    if ( master && have >= need ) {
      await master.update({[P.path]: have - need});
      await tok.update({[`flags.${MOD}.summon.paidAt`]: n(rec.paidAt ?? rec.made) + due.periods * due.period});
      await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: [...gmIds(), ...ownersOf(master).map(u => u.id)],
        content: `<div class="wodx-card wodx-summon"><p>${esc(master.name)} keeps ${esc(tok.name)}: ${need} ${esc(P.label)} spent.</p></div>`});
    } else if ( rec.upkeep.fail === "stops" ) {
      await tok.update({[`flags.${MOD}.summon.dormant`]: true, alpha: 0.5});
      await setControl(tok, "none", rec);
      await ChatMessage.create({speaker: {alias: "WoDX"}, content: `<div class="wodx-card wodx-summon"><p>${esc(tok.name)} falls still: ${esc(master?.name ?? "its maker")} did not feed it ${need} ${esc(P.label)}.</p></div>`});
    } else {
      await dismiss(tok, {why: `${master?.name ?? "its master"} did not feed it ${need} ${P.label}`});
    }
    k++;
  }
  return k;
}

/** Wake a still servant once its maker pays again. */
export async function wake(tok) {
  const rec = flagOf(tok);
  if ( !rec?.dormant || !isActiveGM() ) return false;
  await tok.update({[`flags.${MOD}.summon.dormant`]: false, [`flags.${MOD}.summon.paidAt`]: game.time?.worldTime ?? 0, alpha: 1});
  await setControl(tok, "direct", rec);
  return true;
}

/** A familiar dies (M20 p. 316): its mage loses a permanent Willpower and two Quintessence a dot, the rest as Paradox. */
const dying = new Set();
async function onFamiliarDeath(tok) {
  const rec = flagOf(tok);
  if ( rec?.what === undefined || !rec?.familiar || rec.dead || dying.has(tok.uuid) ) return;
  const mage = actorOf(docOf(rec.by));
  if ( !mage ) return;
  // Several updates in a row (damage, then health levels) each see the familiar dead: the cost is paid once
  dying.add(tok.uuid);
  await tok.update({[`flags.${MOD}.summon.dead`]: true});
  const q = n(mage.system?.quintessence?.temporary);
  const cost = SR.familiarDeath(rec.familiar, q);
  const wp = n(mage.system?.advantages?.willpower?.permanent);
  const upd = {"system.advantages.willpower.permanent": Math.max(0, wp - cost.willpower), "system.quintessence.temporary": q - cost.quintessence};
  if ( cost.paradox ) upd["system.paradox.temporary"] = n(mage.system?.paradox?.temporary) + cost.paradox;
  await mage.update(upd);
  dying.delete(tok.uuid);
  await ChatMessage.create({speaker: {alias: "WoDX"}, content: `<div class="wodx-card wodx-summon"><p>${esc(mage.name)}'s familiar ${esc(tok.name)} is dead. ${esc(mage.name)} loses a dot of Willpower and ${cost.quintessence} Quintessence${cost.paradox ? `, and gains ${cost.paradox} Paradox` : ""} (Mage 20th p. 316).</p></div>`});
}

/** Call a mage's familiar onto the map from the Familiar (or Companion) Background: a lasting companion fed weekly. */
export async function callFamiliar(mage, {src = null, at = null} = {}) {
  if ( !game.user.isGM ) return ui.notifications?.warn?.("The Storyteller brings the familiar in.");
  const bg = (mage?.items ?? []).find(i => /^(familiar|companion)/i.test(i.name ?? ""));
  const rating = n(bg?.system?.value ?? bg?.system?.rating) || 1;
  const F = SR.familiarOf(rating);
  const spec = {what: "animal", profile: "called", count: {by: "fixed", fixed: 1}, lasts: {kind: "upkeep"}, control: {mode: "orders"}, upkeep: F.upkeep, persist: true, page: F.page,
    note: `Holds up to ${F.paradoxCap} Paradox; its death costs a dot of Willpower and ${F.onDeath.quintessence} Quintessence.`};
  const r = SR.resolve(spec, {successes: 1});
  const own = mage.getActiveTokens?.()?.[0]?.document;
  const spot = at ?? (own ? centerOf(own) : null) ?? await game.modules.get(MOD)?.api?.effects?.pickPoint?.("Click where the familiar appears.");
  const rec = await bring({out: {summon: r, label: "Familiar"}, caster: mage.uuid, familiar: true}, {src, at: spot ? {x: spot.x + (canvas.grid?.size ?? 100), y: spot.y} : null, casterName: mage.name});
  for ( const u of rec?.made ?? [] ) { const t = docOf(u); if ( t ) await t.update({[`flags.${MOD}.summon.familiar`]: rating, [`flags.${MOD}.summon.paidAt`]: game.time?.worldTime ?? 0}); }
  return rec;
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

function refreshLook(tok) { try { chron()?.tokenLooks?.refresh?.(); } catch (e) { /* no looks */ } }

const HURT = ["aggravated", "lethal", "bashing"];

/**
 * B4841 (One Fights as Many, DA Mage p. 109): at each round's end the caster takes only the worst harm any copy took,
 * and the copies' own wounds clear.
 */
export async function shareWounds(scene = canvas?.scene) {
  if ( !isActiveGM() || !scene ) return 0;
  const C = game.modules.get("wodx-combat")?.api;
  const by = new Map();
  for ( const t of scene.tokens ) {
    const rec = flagOf(t);
    if ( rec?.shareWounds !== "highest" || !rec.by || !t.actor ) continue;
    if ( !by.has(rec.by) ) by.set(rec.by, []);
    by.get(rec.by).push(t);
  }
  let k = 0;
  for ( const [uuid, toks] of by ) {
    const caster = actorOf(docOf(uuid));
    const worst = toks.map(t => ({t, d: t.actor.system?.health?.damage ?? {}})).sort((a, b) => HURT.reduce((x, h) => x + n(b.d[h]), 0) - HURT.reduce((x, h) => x + n(a.d[h]), 0))[0];
    if ( !worst || !caster || !C ) continue;
    for ( const h of HURT ) if ( n(worst.d[h]) ) await C.soakAndApply(caster.getActiveTokens?.()?.[0] ?? caster, {mode: "levels", amount: n(worst.d[h]), type: h, soak: false});
    for ( const t of toks ) for ( const h of HURT ) { const v = n(t.actor.system?.health?.damage?.[h]); if ( v ) await C.healDamage(t.actor, h, v); }
    if ( HURT.some(h => n(worst.d[h])) ) { k++; await ChatMessage.create({speaker: {alias: caster.name}, whisper: game.users.filter(u => u.isGM || caster.testUserPermission?.(u, "OWNER")).map(u => u.id),
      content: `<div class="wodx-card"><p>${esc(caster.name)} takes the worst harm any self took this round: ${HURT.filter(h => n(worst.d[h])).map(h => `${n(worst.d[h])} ${h}`).join(", ")}.</p></div>`}); }
  }
  return k;
}

export function setup() {
  Hooks.on("updateCombat", (combat, changed) => {
    if ( "round" in (changed ?? {}) ) shareWounds(combat.scene ?? canvas?.scene).catch(e => console.error("WoDX | shared wounds", e));
    if ( !("turn" in (changed ?? {}) || "round" in (changed ?? {})) ) return;
    onTurn(combat).catch(e => console.error("WoDX | summons", e));
  });
  Hooks.on("combatStart", combat => onTurn(combat).catch(e => console.error("WoDX | summons", e)));
  Hooks.on("updateWorldTime", () => {
    if ( chron()?.isSkipping?.() ) return;
    sweepUpkeep().catch(e => console.error("WoDX | summon upkeep", e));
  });
  Hooks.on("wodxSkipEnd", () => sweepUpkeep().catch(e => console.error("WoDX | summon upkeep", e)));
  Hooks.on("updateActor", actor => {
    if ( !isActiveGM() || !actor.isToken ) return;
    const tok = actor.token;
    const rec = flagOf(tok);
    if ( !rec?.familiar || rec.dead ) return;
    const d = actor.system?.health?.damage ?? {};
    const hurt = n(d.bashing) + n(d.lethal) + n(d.aggravated);
    const max = n(actor.system?.traits?.health?.totalhealthlevels?.max) || 7;
    if ( hurt >= max ) onFamiliarDeath(tok).catch(e => console.error("WoDX | familiar", e));
  });
  Hooks.on("renderTokenHUD", (hud, html) => {
    const tok = hud.object?.document;
    if ( !flagOf(tok) || !canDismiss(tok) ) return;
    const root = html instanceof HTMLElement ? html : html[0];
    const col = root?.querySelector(".col.left") ?? root?.querySelector(".col.right");
    if ( !col ) return;
    const b = document.createElement("div");
    b.className = "control-icon wodx-summon-hud";
    b.title = `Dismiss (summoned by ${flagOf(tok).byName}; ${flagOf(tok).lasts})`;
    b.innerHTML = '<i class="fa-solid fa-door-open"></i>';
    b.addEventListener("click", () => requestDismiss(tok));
    col.appendChild(b);
    if ( game.user.isGM && flagOf(tok).dormant ) {
      const w = document.createElement("div");
      w.className = "control-icon wodx-summon-hud";
      w.title = "Wake it (its maker has paid again)";
      w.innerHTML = '<i class="fa-solid fa-bolt"></i>';
      w.addEventListener("click", () => wake(tok));
      col.appendChild(w);
    }
  });
  Hooks.on("renderChatMessageHTML", (msg, el) => {
    const c = msg.flags?.[MOD]?.summonCard;
    if ( !c || !el?.querySelector ) return;
    const b = el.querySelector(".wodx-summon-dismiss");
    if ( !b ) return;
    const toks = c.tokens.map(docOf).filter(Boolean);
    if ( !toks.length || !toks.some(t => canDismiss(t)) ) { b.remove(); return; }
    b.addEventListener("click", async ev => {
      ev.preventDefault(); b.disabled = true;
      for ( const t of c.tokens.map(docOf).filter(Boolean) ) await requestDismiss(t);
    });
  });
}

/** Once WoDX Chronicle is ready: the timer's end step and the token look (a controlled summons glows faintly violet; one that broke loose, red). */
export function connect(C = chron()) {
  C?.timed?.registerReverter?.("wodx-actions.summonEnd", onEnd);
  C?.tokenLooks?.register?.("wodx-actions.summoned", token => {
    const rec = flagOf(token?.document);
    if ( !rec ) return null;
    if ( rec.control === "hostile" ) return {aura: {color: 0xc0221b, alpha: 0.3, radius: 0.7}, shake: 1};
    if ( rec.dormant ) return {tint: 0x9a9a9a};
    return {aura: {color: 0x8a5fd0, alpha: 0.22, radius: 0.65}};
  });
}

export const api = () => ({rules: SR, connect, specs: () => SPECS, specFor, bring, dismiss, dismissAll, slip, canDismiss, requestDismiss, sweepUpkeep, shareWounds, wake, callFamiliar, poolDice, flagOf});
