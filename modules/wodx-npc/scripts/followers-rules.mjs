/**
 * WoDX NPC 0.41.0: one window for all of a character's followers (B1820-B1822). Pure rules, no Foundry.
 *
 * A follower is any NPC that serves the character through one of the four ties order-rules.servesFrom reads (the
 * orders tie, a background made real, a ghoul's domitor, a Creation ally's patron). Each row says what kind of
 * follower it is, where it is, the order or errand it is on, its loyalty with the last change and why, the blood bond
 * step, and any open trouble. The Backgrounds and the blood bond are the books' (V20 Allies, Herd, Retainers; the
 * bond's three drinks); the words for each are WoDX's.
 */
import * as O from "./order-rules.mjs";

const idOf = v => (v && typeof v === "object" ? v.id : v) ? String(v && typeof v === "object" ? v.id : v) : null;

/** What a follower is to its master, by the tie that makes it one. */
export const KINDS = {ghoul: "Ghoul", retainer: "Retainer", ally: "Ally", herd: "Herd", contact: "Contact", mentor: "Mentor", follower: "Follower"};
/** Backgrounds made real (WoDX Chronicle's bound.bg), as a kind of follower. */
const BG_KIND = {retainers: "retainer", retainer: "retainer", allies: "ally", ally: "ally", herd: "herd", contacts: "contact", contact: "contact", mentor: "mentor", kinfolk: "ally", followers: "retainer"};
/** The order the kinds are listed in. */
export const KIND_ORDER = ["ghoul", "retainer", "ally", "herd", "contact", "mentor", "follower"];

/** The kind of follower an NPC is to one master, from its flags. */
export function kindFor(flags = {}, masterId) {
  const f = flags ?? {};
  if ( idOf(f["wodx-creation"]?.lineage?.domitor) === masterId ) return "ghoul";
  const b = f["wodx-chronicle"]?.bound;
  if ( b && idOf(b.actor) === masterId ) return BG_KIND[String(b.bg ?? "").toLowerCase()] ?? "retainer";
  if ( idOf(f["wodx-creation"]?.ally?.patron) === masterId ) return "ally";
  return "follower";
}

/** Does this NPC serve that master? */
export const serves = (flags, masterId) => O.servesFrom(flags).includes(masterId);

/** The bond step to the master: 0 to 3 drinks, with its word ("" for none). */
export function bondFor(flags = {}, masterId) {
  const d = Math.max(0, Math.min(3, Math.round(Number(flags?.["wodx-creation"]?.lineage?.bonds?.[masterId]?.drinks) || 0)));
  return {drinks: d, text: d >= 3 ? "Blood bound (full bond)" : d === 2 ? "Two drinks of the blood" : d === 1 ? "One drink of the blood" : ""};
}

/** The last change in loyalty from an attitude log: {delta, why, at} or null. */
export function lastChange(entry = {}) {
  const log = Array.isArray(entry?.log) ? entry.log : [];
  for ( let i = log.length - 1; i >= 0; i-- ) if ( Number(log[i]?.delta) ) return {delta: Number(log[i].delta), why: String(log[i].why ?? ""), at: Number(log[i].at) || 0};
  return null;
}

/** Where the follower is, for the row. viewed: the scene the viewer has open. */
export function whereText({sceneName = null, sameScene = false, away = false} = {}) {
  if ( away ) return "Away on an errand";
  if ( !sceneName ) return "Not on any map";
  return sameScene ? `Here (${sceneName})` : sceneName;
}

/**
 * Open trouble for a row. order: the follower's order; names: {id: name} for actors and tokens; step: its attitude to
 * the master; described: how many descriptions of it are going round; fadingTask: a long task that has failed.
 */
export function troubles({order = null, names = {}, step = 0, described = 0} = {}) {
  const out = [];
  const o = O.normOrder(order);
  if ( o?.kind === "cleanup" ) out.push(`Dealing with a witness: ${names[o.target] ?? "someone"}`);
  if ( o?.kind === "cutoff" ) out.push(`Watching ${names[o.target] ?? "someone"}, ready to cut them off`);
  if ( o?.kind === "attack" ) out.push(`Set on ${names[o.target] ?? "someone"}`);
  if ( o?.hard ) out.push("Under a hard order");
  if ( Number(step) <= O.DRIFT_FLOOR ) out.push("Wavering in its loyalty");
  if ( Number(described) > 0 ) out.push(described > 1 ? `${described} descriptions of it are going round` : "A description of it is going round");
  return out;
}

/** The everyday orders a row offers as buttons, for a follower on the viewed scene. */
export const QUICK = ["follow", "wait", "guard", "watch", "holdback"];
export function quickFor({sameScene = false, away = false, isGM = false, playerOwned = false} = {}) {
  if ( playerOwned || away || !sameScene ) return [];
  return [...QUICK, "none"];
}

/**
 * One row. a: {id, name, flags, sceneName, sameScene, tokenId}; attitudeEntry: the NPC's attitude log to the master;
 * step and word: its attitude now; names: for describeOrder; described: descriptions going round.
 */
export function rowFor(a = {}, masterId, {attitudeEntry = null, step = 0, word = "", names = {}, described = 0, isGM = false} = {}) {
  const order = O.normOrder(a.flags?.["wodx-npc"]?.order);
  const away = order?.kind === "errand";
  const kind = kindFor(a.flags, masterId);
  return {id: a.id, name: a.name ?? "", kind, kindLabel: KINDS[kind], tokenId: a.tokenId ?? null, sameScene: !!a.sameScene,
    where: whereText({sceneName: a.sceneName ?? null, sameScene: !!a.sameScene, away}), order: O.describeOrder(order, names), note: order?.note ?? "",
    loyalty: word, step: Number(step) || 0, last: lastChange(attitudeEntry), bond: bondFor(a.flags, masterId),
    trouble: troubles({order, names, step, described}), quick: quickFor({sameScene: !!a.sameScene, away, isGM, playerOwned: !!a.playerOwned})};
}

/** Rows in order: here first, then by kind, then by name. */
export function sortRows(rows = []) {
  return [...rows].sort((x, y) => (Number(y.sameScene) - Number(x.sameScene)) || (KIND_ORDER.indexOf(x.kind) - KIND_ORDER.indexOf(y.kind)) || String(x.name).localeCompare(String(y.name)));
}

/** "Rose a step: kept fed" / "Fell a step: a hard order". */
export function lastText(last) {
  if ( !last ) return "";
  const n = Math.abs(last.delta), steps = n === 1 ? "a step" : `${n} steps`;
  return `${last.delta > 0 ? "Rose" : "Fell"} ${steps}${last.why ? `: ${last.why}` : ""}`;
}
