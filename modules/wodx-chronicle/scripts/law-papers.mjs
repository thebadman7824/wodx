/**
 * WoDX Chronicle: papers and the undying in the world (B3612-B3613). The rules are in law-papers-rules.mjs.
 *   Project  WoDX Storyteller's "Make a new self on paper" takes its difficulty and goal from the records kept where
 *            the character is (project()); when it is done (wodxTaskDone) the new self goes on the character (flag
 *            wodx-chronicle.selves) and becomes the current one
 *   Notice   on a clock jump, each player character of an undying line who has kept one self for ten years or more
 *            may be noticed; the Storyteller gets a card, never the player
 *   Card     the Law here card lists the records the land keeps for anyone with two dots of Law, Politics or
 *            Streetwise, and for the Storyteller
 */
import {MODULE_ID, esc, isActiveGM} from "./util.mjs";
import {currentYear} from "./eras.mjs";
import * as L from "./law-rules.mjs";
import * as P from "./law-papers-rules.mjs";
import * as place from "./place.mjs";

const yearNow = () => { try { return currentYear(); } catch (e) { return 1197; } };
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const regionOf = scene => { try { return place.regionHere(scene)?.id ?? place.homeland() ?? "moravia"; } catch (e) { return "moravia"; } };
const UNDYING = new Set(["vampire", "ghoul", "mummy", "revenant"]);
function actorLine(a) {
  const t = String(a?.type ?? "").toLowerCase(), v = String(a?.system?.settings?.variant ?? "").toLowerCase();
  if ( t === "mortal" && (v === "ghoul" || v === "revenant") ) return v;
  if ( t === "changing breed" || t === "changingbreed" ) return "werewolf";
  if ( t === "pc" ) return "vampire";
  return Object.keys(P.LINE_PAPERS).includes(t) ? t : "mortal";
}
export const selvesOf = actor => (actor?.getFlag?.(MODULE_ID, "selves") ?? []).map(P.normSelf);

/** The new-self project where a scene stands, now. */
export function project(scene = globalThis.canvas?.scene, year = yearNow()) {
  const family = L.familyOf(regionOf(scene)).id;
  return {...P.newSelfProject(family, year), family, records: P.recordsFor(family, year).map(r => r.label)};
}

/** Lines for the Law here card. */
export function cardLines(region, year) {
  const family = L.familyOf(region).id;
  return P.recordsFor(family, year).map(r => r.label);
}

/** Put a new self on the character and make it the current one. */
export async function addSelf(actor, {name, quality = 3, region = regionOf(globalThis.canvas?.scene), year = yearNow()} = {}) {
  if ( !actor?.isOwner ) return null;
  const self = P.normSelf({id: foundry.utils.randomID(), name: name || actor.name, quality, since: year, region, family: L.familyOf(region).id, current: true});
  await actor.setFlag(MODULE_ID, "selves", [...selvesOf(actor).map(s => ({...s, current: false})), self].slice(-20));
  return self;
}

/** On a clock jump: the chance someone notices a self that does not age. Storyteller cards only. */
export async function checkSelves(fromYear, toYear) {
  if ( !isActiveGM() || !(toYear > fromYear) ) return [];
  const out = [];
  for ( const a of game.actors ?? [] ) {
    if ( !a.hasPlayerOwner || !UNDYING.has(actorLine(a)) ) continue;
    const cur = selvesOf(a).find(s => s.current && !s.burned);
    let since = cur?.since || Number(a.getFlag(MODULE_ID, "selfSince")) || 0;
    if ( !since ) { since = fromYear; await a.setFlag(MODULE_ID, "selfSince", fromYear); }
    const decades = Math.floor((toYear - since) / 10) - Math.floor((fromYear - since) / 10);
    if ( decades < 1 || toYear - since < 10 ) continue;
    const family = cur?.family || L.familyOf(place.homeland() ?? "moravia").id;
    const chance = P.noticeChance(family, toYear, {quality: cur?.quality ?? 2, decades});
    if ( Math.random() >= chance ) continue;
    out.push(a.id);
    await ChatMessage.create({speaker: {alias: "The records"}, whisper: gmIds(),
      content: `<div class="wodx-card wodx-law-papers"><h3>Someone has noticed ${esc(a.name)}</h3><p>${esc(cur ? `The self "${cur.name}" has been kept since ${cur.since}` : "No new self has been made")}, and a clerk, a neighbour or an old photograph says this face has not aged.</p>
        <p class="hint">${esc(P.LINE_PAPERS[actorLine(a)] ?? "")} The chance was ${Math.round(chance * 100)}% for these years.</p></div>`});
  }
  return out;
}

export function registerPapersHooks() {
  Hooks.on("wodxTaskDone", ({actor, task} = {}) => {
    if ( task?.kind !== "identity" || task.status !== "done" || !isActiveGM() ) return;
    addSelf(actor, {name: task.name && task.name !== "Make a new self on paper" ? task.name : actor?.name, quality: P.qualityFrom(task.total, task.goal)})
      .then(s => s && ChatMessage.create({speaker: {alias: "The records"}, whisper: [...gmIds(), ...game.users.filter(u => actor.testUserPermission?.(u, "OWNER")).map(u => u.id)],
        content: `<div class="wodx-card"><p>${esc(actor.name)} now has papers as ${esc(s.name)}.</p></div>`}))
      .catch(e => console.error("WoDX | papers", e));
  });
}

export {P as rules};
