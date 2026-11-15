/**
 * WoDX Actions (B5780-B5791): effects WoDX works out itself, for powers whose book effect is more than a keyword's
 * plain result. Each runs on the active Storyteller's client from the effects card (effects.js applyCore), and returns
 * an undo record. Kinds:
 *   memory   a memory edited, erased or planted (Alter Memory): Willpower 7 resists, rolled for the Storyteller only
 *   vision   a vision sent to someone's mind (Send Vision): their player reads it; a Vision mark for the scene
 *   seize    ready to seize another demon's evocation for the scene (Hand of Faith; demon.js does the seizing)
 *   mark     a spoken mark on someone for a day to a year (The Mark of the Celestials): a sigil on the token, and the
 *            NPCs who meet the bearer warm or cool to them
 *   cleanse  poison, drink and sickness purged from the body (Cleanse)
 *   remote   the next evocation reaches someone out of sight (Touch from Afar)
 *   path     a demon's path on the map: laid, hidden, sealed or warped (Lore of Paths)
 *   detect   B5788: the Sense keyword: a detection sense on the caster's token for its duration, and what the sheet and
 *            the scene show, whispered
 *   question B5789: the Know keyword: a secret the target keeps is found out (a hook in the Ledger), else what the sheet
 *            shows is pinned on the case board as a clue
 */
const MOD = "wodx-actions";
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
const npcApi = () => (game.modules.get("wodx-npc")?.active ? game.modules.get("wodx-npc").api : null);
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const ownerIds = a => game.users.filter(u => !u.isGM && a?.testUserPermission?.(u, "OWNER")).map(u => u.id);
const isActiveGM = () => game.user?.isGM && game.users.activeGM?.id === game.user.id;

export const KINDS = new Set(["memory", "vision", "seize", "mark", "cleanse", "remote", "path", "detect", "question"]);
const PATH_FLAG = "demonPath";

/** The mark's span by successes (DtF Lore of Radiance): a day, a week, a month, a year. */
export const markSpan = s => (n(s) >= 4 ? {label: "a year", seconds: 365 * 86400} : n(s) === 3 ? {label: "a month", seconds: 30 * 86400}
  : n(s) === 2 ? {label: "a week", seconds: 7 * 86400} : {label: "a day", seconds: 86400});
/** Who the mark moves: an NPC whose Wits is below the successes acts on it; the rest roll Willpower 7 and resist on a success. */
export const markTakes = (wits, successes, resisted = 0) => n(wits) < n(successes) || n(resisted) < 1;
/** The ailments Cleanse purges, by an effect's name or status. */
export const AILING = /poison|venom|toxin|drunk|intoxicat|sick|disease|fever|plague|pox|illness|infect/i;
/** Net successes for Alter Memory: the demon's against the target's Willpower roll; one needed for a brief meeting. */
export const memoryNet = (successes, resisted) => n(successes) - n(resisted);

async function rollPool(dice, diff) {
  const d = Math.max(0, Math.min(20, n(dice)));
  if ( !d ) return {successes: 0, faces: []};
  const r = await new Roll(`${d}d10`).evaluate();
  const faces = r.dice[0]?.results?.map(x => x.result) ?? [];
  const hits = faces.filter(f => f >= diff).length, ones = faces.filter(f => f === 1).length;
  return {successes: Math.max(0, hits - ones), faces};
}

/** A hidden roll card, for the Storyteller only (standing rule 19). */
async function stCard(title, body) {
  return ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), content: `<div class="wodx-card"><h3>${esc(title)}</h3>${body}</div>`});
}

/** Tell a character's players (or the Storyteller, for an NPC) something privately. */
async function tell(a, title, html) {
  const to = a?.hasPlayerOwner ? [...ownerIds(a), ...gmIds()] : gmIds();
  return ChatMessage.create({speaker: {alias: title}, whisper: [...new Set(to)], content: `<div class="wodx-card"><h3>${esc(title)}</h3>${html}</div>`});
}

/** Apply one act. h: {docOf, actorOf, tokenOf, pickPoint, choose}. Returns an undo record, or {note}. */
export async function apply(item, casterName, h) {
  const o = item.out ?? {}, d = h.docOf(item.target), a = h.actorOf(d);
  const caster = item.by ? h.actorOf(h.docOf(item.by)) : (item.caster ? h.actorOf(h.docOf(item.caster)) : null);
  const T = chron()?.timed ?? chron();
  const timed = async (on, data) => {
    if ( !T?.applyTimed || !on ) return null;
    return T.applyTimed(on, {duration: o.timed ?? {kind: "scene"}, source: o.source ?? "", ...data});
  };
  switch ( o.kind ) {
    case "memory": {
      if ( !a ) return {note: `${o.label}: no one to reach`};
      const wp = n(a.system?.willpower?.permanent ?? a.system?.advantages?.willpower?.permanent);
      const r = await rollPool(wp, n(o.diff) || 7);
      const net = memoryNet(o.successes, r.successes);
      await stCard(`${a.name} resists ${o.label}`, `<p>Willpower ${wp} at ${n(o.diff) || 7}: ${r.faces.join(", ") || "no dice"} (${r.successes} success${r.successes === 1 ? "" : "es"}). Net ${net}.</p>`);
      if ( net < 1 ) return {note: `${a.name} keeps the memory`};
      const change = String(o.say || (caster ? `forgets meeting ${caster.name}` : "forgets what just happened")).slice(0, 300);
      const [eff] = await a.createEmbeddedDocuments("ActiveEffect", [{name: "Memory altered", img: "icons/svg/daze.svg", transfer: false,
        description: `${change} (${o.label}, ${casterName}; net ${net}: ${net >= 2 ? "days or weeks" : "a brief meeting"} can be changed)`,
        flags: {[MOD]: {memory: {by: caster?.id ?? null, change, net, mode: o.mode ?? "erase"}}}}]);
      // An NPC forgets the demon in its memory and grudges (WoDX NPC); undo puts the notes back
      let npcMem = null;
      const M = npcApi()?.memory;
      if ( !a.hasPlayerOwner && caster && M?.forget && (o.mode ?? "erase") === "erase" ) npcMem = await M.forget(a, caster);
      else if ( !a.hasPlayerOwner && caster && M?.remember ) await M.remember(a, caster, {text: change});
      if ( a.hasPlayerOwner ) await tell(a, `${a.name}'s memory`, `<p>Something in ${esc(a.name)}'s mind has been changed: <b>${esc(change)}</b>.</p><p class="wodx-quiet">Play it so until the truth comes out. It is on the sheet as Memory altered.</p>`);
      return {uuid: a.uuid, effect: eff?.uuid ?? null, ...(npcMem ? {npcMemory: {npc: a.id, char: caster.id, notes: npcMem}} : {})};
    }
    case "vision": {
      if ( !a ) return {note: `${o.label}: no one to reach`};
      const said = String(o.say || "a vision that the Storyteller describes").slice(0, 500);
      await tell(a, `A vision comes to ${a.name}`, `<p>${esc(said)}</p><p class="wodx-quiet">${esc(o.label)}, sent by ${esc(casterName)}.</p>`);
      const eff = await timed(a, {name: "Sees a vision", img: "icons/svg/eye.svg", description: `${said} (${casterName})`, key: "wodx-act-vision"});
      return {uuid: a.uuid, effect: eff?.uuid ?? null};
    }
    case "seize": {
      const on = caster ?? a;
      if ( !on ) return {note: `${o.label}: no demon`};
      const eff = await timed(on, {name: "Hand of Faith ready", img: "icons/svg/net.svg", key: "wodx-act-seize",
        description: `${casterName} can seize another demon's evocation this scene`, data: {seize: o.successes}});
      return {uuid: on.uuid, effect: eff?.uuid ?? null};
    }
    case "mark": {
      if ( !a ) return {note: `${o.label}: no one to mark`};
      const span = markSpan(o.successes);
      const words = String(o.say || "Shun this one").slice(0, 200), tone = o.tone === "honour" ? "honour" : "shun";
      const eff = await T?.applyTimed?.(a, {name: `Marked: ${words}`, img: "icons/svg/aura.svg", duration: {kind: "time", seconds: span.seconds}, key: "wodx-act-mark",
        description: `${casterName}'s mark, for ${span.label}: ${words}`, source: o.source ?? "", data: {mark: {s: n(o.successes), tone, words, by: caster?.id ?? null}}});
      const met = await markMeet(canvas?.scene, {only: a});
      return {uuid: a.uuid, effect: eff?.uuid ?? null, ...(met.length ? {moods: met} : {})};
    }
    case "cleanse": {
      if ( !a ) return {note: `${o.label}: no one to cleanse`};
      const gone = a.effects.filter(e => AILING.test(e.name ?? "") || [...(e.statuses ?? [])].some(s => AILING.test(s)));
      if ( !gone.length ) return {note: `${a.name} has no poison, drink or sickness on the sheet`};
      const data = gone.map(e => e.toObject());
      await a.deleteEmbeddedDocuments("ActiveEffect", gone.map(e => e.id));
      await tell(a, `${a.name} is cleansed`, `<p>${esc(gone.map(e => e.name).join(", "))}: purged by ${esc(casterName)}.</p>`);
      return {uuid: a.uuid, restoreEffects: data};
    }
    case "remote": {
      const on = caster ?? a;
      const far = o.far?.uuid ? h.docOf(o.far.uuid) : null;
      if ( !on || !far ) return {note: `${o.label}: no one named to reach`};
      await on.setFlag(MOD, "farTarget", {uuid: o.far.uuid, name: o.far.name ?? far.name ?? "", at: game.time?.worldTime ?? 0});
      const eff = await timed(on, {name: `Reaching afar: ${o.far.name ?? far.name ?? ""}`, img: "icons/svg/target.svg", key: "wodx-act-remote",
        description: `The next evocation of ${casterName} reaches ${o.far.name ?? far.name ?? "them"}, wherever they are`});
      return {uuid: on.uuid, effect: eff?.uuid ?? null, unflag: {uuid: on.uuid, key: "farTarget"}};
    }
    case "path":
      return pathAct(item, casterName, h, caster);
    case "detect":
      return detectAct(item, casterName, h, caster, a);
    case "question":
      return questionAct(item, casterName, h, caster, a);
    default:
      return {note: `${o.label}: ${o.text}`};
  }
}

/* ---- Sense and Know (B5788-B5789): what a sheet and a scene show, read from the game, not made up ---- */

const tokOfActor = a => (a ? canvas?.tokens?.placeables?.find(t => t.actor?.id === a.id)?.document ?? null : null);

/** What the sheet shows of one actor: [lines]. Pure enough to test with a plain object. */
export function sheetFacts(a) {
  if ( !a ) return [];
  const s = a.system ?? {}, out = [];
  const kind = a.type || s.type || "";
  if ( kind ) out.push(`kind: ${kind}`);
  const hl = s.health ?? s.advantages?.health ?? null;
  const hurt = hl ? n(hl.bashing) + n(hl.lethal) + n(hl.aggravated) : 0;
  out.push(hurt ? `hurt: ${hurt} health level${hurt === 1 ? "" : "s"}${n(hl?.aggravated) ? ` (${n(hl.aggravated)} aggravated)` : ""}` : "unhurt");
  const wp = s.willpower ?? s.advantages?.willpower ?? null;
  if ( wp ) out.push(`Willpower ${n(wp.temporary ?? wp.value)} of ${n(wp.permanent ?? wp.max)}`);
  const states = [...(a.effects ?? [])].filter(e => !e.disabled && e.name).map(e => e.name).slice(0, 8);
  if ( states.length ) out.push(`under: ${states.join(", ")}`);
  return out;
}

/** What the scene shows: darkness, hidden figures, warded or marked ground. */
export function sceneFacts(scene, {near = null, range = Infinity} = {}) {
  if ( !scene ) return [];
  const out = [], dark = n(scene.environment?.darknessLevel ?? scene.darkness);
  out.push(dark >= 0.7 ? "night-dark" : dark >= 0.3 ? "dim" : "lit");
  const grid = n(scene.grid?.size) || 100, per = n(scene.grid?.distance) || 5;
  const far = t => (near ? Math.hypot(n(t.x) - n(near.x), n(t.y) - n(near.y)) / grid * per : 0);
  const hidden = [...(scene.tokens ?? [])].filter(t => t.hidden && far(t) <= range);
  if ( hidden.length ) out.push(`${hidden.length} hidden figure${hidden.length === 1 ? "" : "s"} nearby`);
  const marked = [...(scene.regions ?? [])].filter(r => r.flags?.[MOD]?.demonPath || r.flags?.[MOD]?.area || r.flags?.["wodx-chronicle"]);
  if ( marked.length ) out.push(`${marked.length} worked or warded place${marked.length === 1 ? "" : "s"}`);
  return out;
}

async function detectAct(item, casterName, h, caster, a) {
  const o = item.out ?? {}, on = caster ?? a;
  if ( !on ) return {note: `${o.label}: no one to sense`};
  const tok = tokOfActor(on) ?? h.tokenOf?.(h.docOf(on.uuid)) ?? null;
  const range = n(o.range) || 30;
  let prev = null;
  if ( tok ) {
    prev = foundry.utils.deepClone(tok.detectionModes ?? []);
    const modes = Array.isArray(prev) ? [...prev.filter(m => m.id !== "senseAll"), {id: "senseAll", enabled: true, range}]
      : {...prev, senseAll: {enabled: true, range}};
    await tok.update({detectionModes: modes});
  }
  const T = chron()?.timed ?? chron();
  const eff = await T?.applyTimed?.(on, {name: "Senses beyond", img: "icons/svg/eye.svg", duration: o.timed ?? {kind: "scene"}, source: o.source ?? "",
    key: "wodx-act-detect", description: `${casterName} senses what hides within ${range} feet`, revert: tok ? {key: "wodx-actions.detectEnd", data: {token: tok.uuid, modes: prev}} : undefined});
  const who = a && a.id !== on.id ? a : null;
  const facts = [...(who ? sheetFacts(who).map(x => `${who.name}: ${x}`) : []), ...sceneFacts(tok?.parent ?? canvas?.scene, {near: tok, range})];
  await tell(on, `${on.name} senses`, `<ul>${facts.map(f => `<li>${esc(f)}</li>`).join("")}</ul><p class="wodx-quiet">${esc(o.label)}: hidden figures within ${range} feet show on the map this scene.</p>`);
  if ( who ) { const wt = tokOfActor(who); if ( wt && canvas?.ping ) canvas.ping({x: wt.x + n(wt.width) * 50, y: wt.y + n(wt.height) * 50}); }
  return {uuid: on.uuid, effect: eff?.uuid ?? null, ...(tok ? {detect: {token: tok.uuid, modes: prev}} : {})};
}

export async function detectBack(data = {}) {
  const tok = data.token ? fromUuidSync(data.token) : null;
  if ( !tok ) return;
  const prev = data.modes ?? [];
  if ( Array.isArray(tok.detectionModes) || Array.isArray(prev) ) return tok.update({detectionModes: Array.isArray(prev) ? prev : []});
  // Foundry keeps detection modes as an object here: an update merges, so the sense is switched back by its own key
  const was = prev?.senseAll ?? null;
  return tok.update({"detectionModes.senseAll": was ? {...was} : {enabled: false, range: 0}});
}

async function questionAct(item, casterName, h, caster, a) {
  const o = item.out ?? {}, asker = caster ?? null, about = a && a.id !== asker?.id ? a : null;
  if ( !asker && !about ) return {note: `${o.label}: no one to ask about`};
  // A secret the target keeps, the heaviest not yet found: found out, with a hook in the Ledger (WoDX NPC)
  const S = npcApi()?.secrets;
  if ( about && asker && S?.of && S?.reveal ) {
    const left = (S.of(about) ?? []).filter(x => !x.public && !x.found?.[asker.id]).sort((x, y) => n(y.weight) - n(x.weight));
    if ( left.length ) {
      const got = await S.reveal(about, left[0].id, asker, {how: o.label});
      if ( got ) return {note: `${asker.name} finds out a secret of ${about.name}`};
    }
  }
  const facts = about ? sheetFacts(about) : sceneFacts(canvas?.scene);
  const title = about ? `${o.label}: ${about.name}` : `${o.label}: this place`;
  const CB = game.modules.get("wodx-interactables")?.api?.caseBoard;
  let pinned = false;
  try { pinned = !!(await CB?.pinClue?.({label: title}, null, facts, asker)); } catch (e) { console.warn("WoDX | clue", e); }
  const tellTo = asker ?? about;
  await tell(tellTo, title, `<ul>${facts.map(f => `<li>${esc(f)}</li>`).join("")}</ul><p class="wodx-quiet">${pinned ? "Pinned on the case board. " : ""}The Storyteller may add one more answer.</p>`);
  const T = chron()?.timed ?? chron();
  const eff = asker ? await T?.applyTimed?.(asker, {name: `Knows: ${about?.name ?? "this place"}`, img: "icons/svg/book.svg", duration: o.timed ?? {kind: "scene"},
    source: o.source ?? "", key: "wodx-act-know", description: facts.join("; "), data: {about: about?.id ?? null}}) : null;
  return {uuid: (asker ?? about).uuid, effect: eff?.uuid ?? null};
}

/* ---- Lore of Paths ---- */

const pathRegions = scene => [...(scene?.regions ?? [])].filter(r => r.flags?.[MOD]?.[PATH_FLAG]);

async function pathAct(item, casterName, h, caster) {
  const o = item.out ?? {}, scene = canvas?.scene;
  const T = chron()?.timed ?? chron();
  if ( !scene ) return {note: `${o.label}: no scene`};
  const owner = caster ?? h.actorOf(h.docOf(item.target));
  const ends = data => (T?.applyTimed && owner ? T.applyTimed(owner, {name: `${o.label} (${o.op})`, img: "icons/svg/door-exit.svg", duration: o.timed ?? {kind: "scene"},
    description: `${o.text}`, revert: {key: "wodx-actions.pathEnd", data}, source: o.source ?? ""}) : null);
  if ( o.op === "lay" ) {
    // Ends given on the card (a macro, a gate) are used as they are; else the Storyteller clicks them
    const a = o.from ?? await h.pickPoint(`${o.label}: click where the path starts.`);
    const b = a ? (o.to ?? await h.pickPoint(`${o.label}: click where the path ends.`)) : null;
    if ( !a || !b ) return {note: `${o.label}: no path laid`};
    const g = scene.grid?.size ?? 100;
    const shape = p => ({type: "rectangle", x: p.x, y: p.y, width: g, height: g, anchorX: 0.5, anchorY: 0.5, rotation: 0});
    const base = end => ({name: `${casterName}'s path (${end})`, color: "#b48a3c", shapes: [shape(end === "start" ? a : b)], elevation: {bottom: null, top: null},
      visibility: CONST.REGION_VISIBILITY?.ALWAYS ?? 2, flags: {[MOD]: {[PATH_FLAG]: {by: casterName, end}}}});
    const [ra, rb] = await scene.createEmbeddedDocuments("Region", [base("start"), base("end")]);
    const tp = target => ({type: "teleportToken", name: "The demon's path", system: {destinations: [target.uuid], placement: "random", snap: true, choice: false}});
    await ra.createEmbeddedDocuments("RegionBehavior", [tp(rb)]);
    await rb.createEmbeddedDocuments("RegionBehavior", [tp(ra)]);
    const eff = await ends({op: "lay", regions: [ra.uuid, rb.uuid]});
    return {regions: [ra.uuid, rb.uuid], effect: eff?.uuid ?? null};
  }
  const list = pathRegions(scene);
  const all = list.length ? list : [...(scene.regions ?? [])].filter(r => r.behaviors?.some?.(b => b.type === "teleportToken"));
  if ( !all.length ) return {note: `${o.label}: no path on this scene to work on`};
  const pick = all.length === 1 ? all[0] : h.docOf(await h.choose(`Which path does ${casterName} ${o.op}?`, all.map(r => [r.uuid, r.name])));
  if ( !pick ) return {note: `${o.label}: no path chosen`};
  const twin = all.find(r => r.id !== pick.id && r.behaviors?.some?.(b => (b.system?.destinations ?? []).includes?.(pick.uuid)));
  const both = [pick, twin].filter(Boolean);
  if ( o.op === "conceal" ) {
    const prev = both.map(r => ({uuid: r.uuid, visibility: r.visibility}));
    for ( const r of both ) await r.update({visibility: CONST.REGION_VISIBILITY?.LAYER ?? 0});
    const eff = await ends({op: "conceal", prev});
    return {pathPrev: prev, effect: eff?.uuid ?? null};
  }
  if ( o.op === "close" ) {
    const prev = both.flatMap(r => r.behaviors.filter(b => b.type === "teleportToken").map(b => ({uuid: b.uuid, disabled: !!b.disabled})));
    for ( const r of both ) for ( const b of r.behaviors.filter(x => x.type === "teleportToken") ) await b.update({disabled: true});
    const eff = await ends({op: "close", prev});
    return {pathPrev: prev, effect: eff?.uuid ?? null};
  }
  if ( o.op === "warp" ) {
    const choices = [["loop", "It loops back on itself"], ...[...(scene.regions ?? [])].filter(r => r.id !== pick.id).map(r => [r.uuid, `It now leads to ${r.name}`])];
    const to = await h.choose(`Where does ${casterName}'s warped path lead?`, choices);
    if ( !to ) return {note: `${o.label}: the path is left as it was`};
    const b = pick.behaviors.find(x => x.type === "teleportToken");
    if ( !b ) return {note: `${o.label}: that region carries no one`};
    const prev = [{uuid: b.uuid, destinations: [...(b.system?.destinations ?? [])]}];
    await b.update({"system.destinations": [to === "loop" ? pick.uuid : to]});
    const eff = await ends({op: "warp", prev});
    return {pathPrev: prev, effect: eff?.uuid ?? null};
  }
  return {note: `${o.label}: ${o.text}`};
}

/** Put a path back as it was (its timer ran out, or Undo). */
export async function pathBack(data = {}) {
  if ( data.op === "lay" ) { for ( const u of data.regions ?? [] ) await fromUuidSync(u)?.delete?.(); return; }
  for ( const p of data.prev ?? [] ) {
    const doc = fromUuidSync(p.uuid);
    if ( !doc ) continue;
    if ( "visibility" in p ) await doc.update({visibility: p.visibility});
    if ( "disabled" in p ) await doc.update({disabled: p.disabled});
    if ( "destinations" in p ) await doc.update({"system.destinations": p.destinations});
  }
}

/* ---- The Mark of the Celestials: the NPCs who meet the bearer ---- */

/** Each NPC on the scene meeting a marked bearer for the first time warms or cools one step. Returns undo moods. */
export async function markMeet(scene, {only = null} = {}) {
  const AT = npcApi()?.attitude;
  if ( !scene || !AT?.apply || !game.user.isGM ) return [];
  const out = [];
  const toks = [...(scene.tokens ?? [])];
  const bearers = toks.map(t => t.actor).filter(x => x && (!only || x.id === only.id));
  for ( const b of new Set(bearers) ) {
    const eff = b.effects.find(e => e.getFlag?.("wodx-chronicle", "timed")?.key === "wodx-act-mark");
    const m = eff?.getFlag?.("wodx-chronicle", "timed")?.data?.mark;
    if ( !m ) continue;
    for ( const t of toks ) {
      const npc = t.actor;
      if ( !npc || npc.hasPlayerOwner || npc.id === b.id || npc.id === m.by ) continue;
      const seen = npc.getFlag(MOD, "markMet") ?? {};
      if ( seen[b.id] === eff.id ) continue;
      const wits = n(npc.system?.attributes?.wits?.total ?? npc.system?.attributes?.wits?.value);
      let resisted = 1;
      if ( !(wits < m.s) ) {
        const wp = n(npc.system?.willpower?.permanent ?? npc.system?.advantages?.willpower?.permanent);
        const r = await rollPool(wp, 7);
        resisted = r.successes;
        await stCard(`${npc.name} meets ${b.name}'s mark`, `<p>Willpower ${wp} at 7: ${r.faces.join(", ") || "no dice"} (${r.successes}).</p>`);
      }
      await npc.setFlag(MOD, "markMet", {...seen, [b.id]: eff.id});
      if ( !markTakes(wits, m.s, resisted) ) continue;
      const before = AT.of?.(npc, b)?.step ?? 0, met = !!AT.of?.(npc, b)?.met;
      await AT.apply(npc, b, {delta: m.tone === "honour" ? 1 : -1, why: `the mark: ${m.words}`});
      out.push({npc: npc.id, char: b.id, before, met});
    }
  }
  return out;
}

export function setup() {
  const T = chron()?.timed ?? chron();
  T?.registerReverter?.("wodx-actions.detectEnd", async (actor, data) => detectBack(data ?? {}).catch(e => console.warn("WoDX | sense end", e)));
  T?.registerReverter?.("wodx-actions.pathEnd", async (actor, data) => pathBack(data ?? {}).catch(e => console.warn("WoDX | path end", e)));
  const meet = () => { if ( isActiveGM() ) markMeet(canvas?.scene).catch(e => console.warn("WoDX | mark", e)); };
  Hooks.on("canvasReady", meet);
  Hooks.on("createToken", doc => { if ( doc?.parent?.id === canvas?.scene?.id ) meet(); });
}
