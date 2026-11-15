import {MODULE_ID, esc, isActiveGM} from "./util.mjs";
import {propose, registerHandler} from "./approvals.mjs";
import * as R from "./roads-rules.mjs";

/**
 * WoDX Chronicle, B6304-B6309: Transcendence for wraiths, the Road Back for the Kuei-jin and Redemption for demons,
 * beside Golconda (pod.mjs). Rules and sources in roads-rules.mjs. What the end of each road does in play:
 *   a wraith who transcends and an arhat leave the chronicle: their tokens flare with light and fade from every map,
 *     and they are marked gone (flags wodx-actions.transcended / arhat), so nothing counts them as present;
 *   a bodhisattva (flag wodx-actions.bodhisattva) sees the Yin World and speaks with spirits without Chi or a roll
 *     (WoDX Actions kote.js reads it), and loses the rank if Dharma drops below 9;
 *   a redeemed demon (flag wodx-actions.redeemed) is harmed by no holy ground or object and falls again the moment
 *     Torment rises (WoDX Actions demon.js reads it).
 * Actor flag wodx-chronicle.road = {line, truths, angst, log}.
 */

const ACT = "wodx-actions";
const T_TRUTH = `${MODULE_ID}.roadTruth`, T_GO = `${MODULE_ID}.roadTranscend`, T_BODHI = `${MODULE_ID}.roadBodhisattva`,
  T_ARHAT = `${MODULE_ID}.roadArhat`, T_REDEEM = `${MODULE_ID}.roadRedeem`;
const on = () => { try { return !!game.settings.get(MODULE_ID, "podRoads"); } catch (e) { return false; } };
const now = () => game.time?.worldTime ?? 0;
const ownerIds = a => game.users.filter(u => u.isGM || a?.testUserPermission?.(u, "OWNER")).map(u => u.id);
const n = v => Number(v) || 0;
const toActor = x => x?.documentName === "Actor" ? x : (typeof x === "string" ? (game.actors.get(x) ?? fromUuidSync?.(x)) : x?.actor ?? null);
const roadOf = a => foundry.utils.deepClone(a?.flags?.[MODULE_ID]?.road ?? null);

export function lineOf(a) {
  if ( !a ) return null;
  return R.roadLine({type: a.type, variant: a.system?.settings?.variant ?? "", hastorment: !!a.system?.settings?.hastorment});
}
function angstPerm(a) {
  const it = (a?.items ?? []).find(i => i.type === "Advantage" && i.system?.id === "angst");
  return n(it?.system?.permanent ?? a?.system?.advantages?.angst?.permanent) || n(a?.getFlag?.(ACT, "angstPermanent"));
}
const willPerm = a => n(a?.system?.advantages?.willpower?.permanent);
const dharmaOf = a => n(a?.system?.advantages?.dharma?.permanent);
const tormentOf = a => n(a?.system?.advantages?.torment?.permanent);

async function card(a, title, body, {all = false} = {}) {
  return ChatMessage.create({content: `<div class="wodx-card wct-pod"><h3>${esc(title)}</h3>${body}</div>`, speaker: {alias: "Chronicle"},
    whisper: all ? [] : ownerIds(a)});
}
async function log(a, text, patch = {}) {
  const r = roadOf(a) ?? {line: lineOf(a), truths: [], log: []};
  const rec = {...r, ...patch, log: [...(r.log ?? []), {t: now(), text}].slice(-12)};
  await a.update({[`flags.${MODULE_ID}.road`]: rec});
  return rec;
}

/** Ask the Storyteller once for each new state (a rejected proposal is not asked again until the rating moves). */
async function askOnce(a, tag, req) {
  const r = roadOf(a);
  if ( r?.asked === tag ) return null;
  await a.update({[`flags.${MODULE_ID}.road`]: {...(r ?? {line: lineOf(a), truths: [], log: []}), asked: tag}});
  return propose(req);
}

/* ---------------- leaving the chronicle (show, don't tell) ---------------- */

/** Every token of the actor flares with light, then fades from the map; the actor is marked gone. */
export async function leave(a, kind, text) {
  if ( !a || !game.user.isGM ) return null;
  await a.setFlag(ACT, kind, true);
  await a.setFlag(MODULE_ID, "departed", {kind, at: now()});
  const docs = game.scenes.contents.flatMap(s => s.tokens.filter(t => t.actorId === a.id));
  for ( const d of docs ) await d.update({light: {dim: 8, bright: 4, color: "#fff2c4", alpha: 0.7, animation: {type: "sunburst", speed: 3, intensity: 8}}}, {});
  setTimeout(async () => { for ( const d of docs ) { try { await d.update({hidden: true, alpha: 0.2}, {}); } catch (e) { /* gone */ } } }, 4000);
  return card(a, `${a.name}: ${R.ROADS[lineOf(a)]?.label ?? "gone"}`, `<p>${esc(text)}</p><p class="vta-note">${esc(R.ROADS[lineOf(a)]?.source ?? "")}</p>`, {all: true});
}
/** Undo for the Storyteller: back into play (tokens shown, flags cleared). */
export async function returnToPlay(actorOrId) {
  const a = toActor(actorOrId);
  if ( !a || !game.user.isGM ) return null;
  for ( const k of ["transcended", "arhat"] ) await a.unsetFlag(ACT, k);
  await a.unsetFlag(MODULE_ID, "departed");
  for ( const s of game.scenes ) for ( const d of s.tokens.filter(t => t.actorId === a.id) ) await d.update({hidden: false, alpha: 1, light: {dim: 0, bright: 0}}, {});
  return a;
}

/* ---------------- Transcendence ---------------- */

export async function seek(actorOrId) {
  const a = toActor(actorOrId);
  if ( !a || !on() || lineOf(a) !== "wraith" || roadOf(a) ) return null;
  await log(a, "Set out toward Transcendence", {line: "wraith", truths: [], angst: angstPerm(a)});
  return card(a, `${a.name} seeks Transcendence`, `<p>The Eight Truths of the Tomes of Golden Light are the road. The Storyteller judges each as it is lived; a stronger Shadow undoes the conquest of it.</p>`);
}
/** Mark a Truth lived (GM) or ask for it (player: the approval queue). */
export async function truth(actorOrId, key, why = "lived in play") {
  const a = toActor(actorOrId), t = R.truthByKey(key), r = roadOf(a);
  if ( !a || !t || !r || r.line !== "wraith" ) return null;
  if ( !game.user.isGM ) return propose({type: T_TRUTH, key: `truth:${a.id}:${key}`, title: `${a.name}: ${t.label}?`, detail: `${a.name}'s player says this Truth was ${why}.`, data: {actor: a.id, key}});
  const rec = await log(a, `${t.label}: ${why}`, {truths: R.withTruth(r.truths, key, true)});
  await card(a, `${a.name}: a Truth lived`, `<p>${esc(t.label)}. ${rec.truths.length} of ${R.TRUTHS.length}.</p>`);
  return checkTranscend(a);
}
async function checkTranscend(a) {
  const r = roadOf(a), x = R.transcendReady(r?.truths, angstPerm(a), willPerm(a));
  if ( !x.ready ) return null;
  return askOnce(a, `go:${angstPerm(a)}`, {type: T_GO, key: `transcend:${a.id}`, title: `Let ${a.name} transcend?`, detail: `${a.name} has lived all Eight Truths and the Shadow (Angst ${angstPerm(a)}) is weaker than the will (${willPerm(a)}). Approving is a one-way trip: the wraith leaves the chronicle.`, data: {actor: a.id}});
}
async function shadowCheck(a) {
  const r = roadOf(a);
  if ( !r || r.line !== "wraith" ) return;
  const cur = angstPerm(a);
  if ( R.shadowRose(r.angst, cur) && r.truths?.includes("shadow") ) {
    await log(a, "The Shadow grows: Conquer the Shadow is undone", {truths: R.withTruth(r.truths, "shadow", false), angst: cur});
    await card(a, `${a.name}: the Shadow grows`, `<p>Permanent Angst rose to ${cur}. The Truth "Conquer the Shadow" must be won again.</p>`);
  } else if ( cur !== r.angst ) await a.update({[`flags.${MODULE_ID}.road.angst`]: cur});
}

/* ---------------- the Road Back ---------------- */

async function dharmaCheck(a) {
  const d = dharmaOf(a), bodhi = !!a.getFlag(ACT, "bodhisattva"), st = R.roadBackStage(d, {bodhisattva: bodhi});
  if ( st === "lapsed" ) {
    await a.unsetFlag(ACT, "bodhisattva");
    await log(a, `Dharma fell to ${d}: no longer a bodhisattva`, {line: "kuei-jin"});
    return card(a, `${a.name} falls from the final stages`, `<p>Dharma ${d}: communion with the spirit worlds closes.</p>`);
  }
  if ( st === "bodhisattva-ready" ) return askOnce(a, `bodhi:${d}`, {type: T_BODHI, key: `bodhi:${a.id}`, title: `Recognise ${a.name} as a bodhisattva?`, detail: `Dharma ${d}: the final stages of the Road Back. A bodhisattva sees the Yin World and speaks with spirits without Chi or a roll.`, data: {actor: a.id}});
  if ( st === "arhat-ready" ) return askOnce(a, `arhat:${d}`, {type: T_ARHAT, key: `arhat:${a.id}`, title: `Let ${a.name} become an arhat?`, detail: `Dharma ${d}: the Dharma is fulfilled. Approving ends the journey: the arhat rejoins the Great Cycle and leaves the chronicle.`, data: {actor: a.id}});
  if ( roadOf(a)?.asked ) await a.update({[`flags.${MODULE_ID}.road.asked`]: null});
  return null;
}

/* ---------------- Redemption ---------------- */

async function tormentCheck(a) {
  if ( !a.system?.advantages?.torment || a.getFlag(ACT, "redeemed") ) return null;
  if ( tormentOf(a) > 0 ) { if ( roadOf(a)?.asked ) await a.update({[`flags.${MODULE_ID}.road.asked`]: null}); return null; }
  return askOnce(a, "redeem", {type: T_REDEEM, key: `redeem:${a.id}`, title: `Is ${a.name} redeemed?`, detail: `Permanent Torment has reached 0. Demon: The Fallen leaves it to the Storyteller whether redemption exists; approving makes ${a.name} an angel again until Torment rises.`, data: {actor: a.id}});
}

/* ---------------- the feature window ---------------- */

export const wants = a => on() && !!lineOf(a);
export function section(a) {
  const line = lineOf(a), road = R.ROADS[line];
  if ( !on() || !road ) return {body: "", buttons: []};
  const r = roadOf(a), buttons = [];
  let body = `<h4>${esc(road.label)}</h4>`;
  if ( a.getFlag(MODULE_ID, "departed") ) {
    body += `<p>Gone from the chronicle.</p>`;
    if ( game.user.isGM ) buttons.push({action: "road:return", label: "Bring back into play"});
    return {body, buttons};
  }
  if ( line === "wraith" ) {
    if ( !r ) buttons.push({action: "road:seek", label: "Seek Transcendence"});
    else {
      body += `<p>${r.truths.length} of ${R.TRUTHS.length} Truths lived. Angst ${angstPerm(a)}, Willpower ${willPerm(a)}.</p><ul>${R.TRUTHS.map(t => `<li>${r.truths.includes(t.key) ? "✓" : "○"} ${esc(t.label)}</li>`).join("")}</ul>`;
      R.TRUTHS.filter(t => !r.truths.includes(t.key)).forEach(t => buttons.push({action: `road:truth:${t.key}`, label: `${game.user.isGM ? "Lived" : "Ask"}: ${t.label}`}));
    }
  } else if ( line === "kuei-jin" ) {
    const d = dharmaOf(a), bodhi = !!a.getFlag(ACT, "bodhisattva");
    body += `<p>Dharma ${d} of 10. ${bodhi ? "A bodhisattva: in communion with the spirit worlds." : d >= R.BODHISATTVA_DHARMA ? "At the final stages." : `The final stages begin at Dharma ${R.BODHISATTVA_DHARMA}.`}</p>`;
  } else {
    const t = tormentOf(a), red = !!a.getFlag(ACT, "redeemed");
    body += `<p>${red ? "Redeemed: an angel again, until Torment rises." : `Permanent Torment ${t}: ${R.redemptionStep(t)} of 10 steps toward grace.`}</p>`;
  }
  if ( r?.log?.length ) body += `<ul>${r.log.slice(-4).map(l => `<li>${esc(l.text)}</li>`).join("")}</ul>`;
  return {body, buttons};
}
export async function handle(a, pick) {
  if ( pick === "road:seek" ) return seek(a);
  if ( pick === "road:return" ) return returnToPlay(a);
  if ( String(pick).startsWith("road:truth:") ) return truth(a, String(pick).slice(11));
  return null;
}

/* ---------------- hooks ---------------- */

function onChange(a) {
  if ( !on() || !isActiveGM() || !a || a.getFlag(MODULE_ID, "departed") ) return;
  const line = lineOf(a);
  const go = line === "wraith" ? shadowCheck(a) : line === "kuei-jin" ? dharmaCheck(a) : line === "demon" ? tormentCheck(a) : null;
  go?.catch?.(e => console.error(`${MODULE_ID} | roads`, e));
}
export function registerRoadSettings() {
  game.settings.register(MODULE_ID, "podRoads", {name: "Transcendence, the Road Back and Redemption", hint: "The long roads out for wraiths (the Eight Truths), the Kuei-jin (bodhisattva and arhat by Dharma) and demons (Torment 0). The Storyteller approves each end; leaving the chronicle fades the character from the map.", scope: "world", config: true, type: Boolean, default: true});
}
export function registerRoadHooks() {
  const actor = id => game.actors.get(id);
  registerHandler(T_TRUTH, {label: "A wraith lived one of the Eight Truths", approve: e => truth(actor(e.data?.actor), e.data?.key, "judged lived by the Storyteller")});
  registerHandler(T_GO, {label: "A wraith transcends and leaves the chronicle", approve: e => { const a = actor(e.data?.actor); return a ? leave(a, "transcended", `${a.name} vanishes in a bright beam of light, and a deep peace is left behind.`) : null; }});
  registerHandler(T_BODHI, {label: "A Kuei-jin is recognised as a bodhisattva", approve: async e => {
    const a = actor(e.data?.actor); if ( !a ) return;
    await a.setFlag(ACT, "bodhisattva", true);
    await log(a, "Recognised as a bodhisattva", {line: "kuei-jin"});
    return card(a, `${a.name}, bodhisattva`, `<p>The final stages of the Dharma: the dead, the ancestors and the spirits speak freely now. Ghostsight and spirit speech need no Chi and no roll.</p>`, {all: true});
  }});
  registerHandler(T_ARHAT, {label: "A bodhisattva becomes an arhat and leaves the chronicle", approve: e => { const a = actor(e.data?.actor); return a ? leave(a, "arhat", `${a.name} has fulfilled the Dharma. The hunger ends, and the essence rejoins the Great Cycle.`) : null; }});
  registerHandler(T_REDEEM, {label: "A demon is redeemed", approve: async e => {
    const a = actor(e.data?.actor); if ( !a ) return;
    await a.setFlag(ACT, "redeemed", true);
    await log(a, "Redeemed", {line: "demon"});
    for ( const d of a.getActiveTokens?.(false, true) ?? [] ) await (d.document ?? d).update({light: {dim: 3, bright: 1, color: "#fffbe8", alpha: 0.4, animation: {type: "torch", speed: 1, intensity: 2}}}, {});
    return card(a, `${a.name} is redeemed`, `<p>An angel again. Holy ground and holy things no longer burn, and grace holds until Torment rises.</p>`, {all: true});
  }});
  Hooks.on("updateActor", a => onChange(a));
  Hooks.on("updateItem", it => { if ( it?.parent?.documentName === "Actor" && it.type === "Advantage" ) onChange(it.parent); });
}
export const roadsApi = {lineOf, seek, truth, leave, returnToPlay, section, rules: R};
