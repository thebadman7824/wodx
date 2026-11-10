/**
 * Call for a roll: the Storyteller asks several characters for the same roll and reads the results on one card.
 * No Foundry in this file.
 *
 *   Modes: "open" (rolled now, everyone sees the card), "secret" (rolled now, only the Storyteller sees it) and "ask"
 *   (each player gets a button and rolls for their own character; answers gather on the Storyteller's card).
 *   A contest: the Storyteller rolls one pool (an NPC's, or the thing resisted) and each character's net is their
 *   successes less the contest's (V20's resisted roll, the same as WoDX Combat's).
 */
import {choosePool, abilityKind} from "../../wodx-actions/scripts/checks-rules.js";
import {countSuccesses} from "../../wodx-actions/scripts/core-rules.js";

export const MODES = {open: "Roll now, everyone sees", secret: "Roll now, only the Storyteller sees", ask: "Each player rolls with a button"};
export const ATTRS = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clampDiff = d => Math.max(2, Math.min(10, Math.round(num(d) || 6)));

/** A clean request. pools: [[attr, ability], ...] alternatives, the first that the character has wins. */
export function normRequest(r = {}) {
  const pools = (Array.isArray(r.pools) && r.pools.length ? r.pools : [[r.attr || "perception", r.ability || ""]])
    .filter(p => Array.isArray(p) && ATTRS.includes(String(p[0]).toLowerCase()))
    .map(([a, k]) => [String(a).toLowerCase(), String(k ?? "").toLowerCase()]);
  return {
    label: String(r.label ?? "").slice(0, 120) || "A roll",
    pools: pools.length ? pools : [["perception", "alertness"]],
    diff: clampDiff(r.diff),
    mode: MODES[r.mode] ? r.mode : "open",
    bonus: Math.round(num(r.bonus)),
    contest: r.contest && num(r.contest.dice) > 0 ? {dice: Math.min(30, Math.round(num(r.contest.dice))), diff: clampDiff(r.contest.diff), label: String(r.contest.label ?? "").slice(0, 80)} : null,
    actorIds: [...new Set((r.actorIds ?? []).map(String))].slice(0, 30)
  };
}

/**
 * The pool one character rolls, read from a plain sheet: {attributes: {k: n}, abilities: {k: {value, shown}}, wounds: n (<= 0)}.
 * Returns {dice, diff, text, blocked}.
 */
export function poolOf(req, sheet = {}) {
  const r = normRequest(req);
  const find = k => { const v = sheet.abilities?.[k]; return v ? {value: num(v.value), shown: !!v.shown} : null; };
  const pick = choosePool(r.pools, find) ?? {attr: r.pools[0][0], ability: "", value: 0, how: "trait"};
  const attr = num(sheet.attributes?.[pick.attr]);
  let diff = r.diff, blocked = null;
  const bits = [`${cap(pick.attr)} ${attr}`];
  if ( pick.ability ) {
    if ( pick.value > 0 ) bits.push(`${cap(pick.ability)} ${pick.value}`);
    else if ( abilityKind(pick.ability) === "skill" ) { diff = Math.min(10, diff + 1); bits.push(`no ${cap(pick.ability)}: +1 difficulty`); }
    else if ( abilityKind(pick.ability) === "knowledge" ) blocked = `No dots in ${cap(pick.ability)}: an untrained Knowledge can't be tried.`;
    else bits.push(`no ${cap(pick.ability)}`);
  }
  if ( r.bonus ) bits.push(`${r.bonus > 0 ? "+" : ""}${r.bonus} dice`);
  const w = Math.min(0, num(sheet.wounds));
  if ( w ) bits.push(`wounds ${w}`);
  const dice = Math.max(0, attr + pick.value + r.bonus + w);
  return {dice, diff, text: bits.join(", "), blocked, attr: pick.attr, ability: pick.ability};
}

/** The result of one character's faces. */
export function resultOf(faces, diff, {contest = null} = {}) {
  const r = countSuccesses(faces ?? [], diff);
  const net = contest ? Math.max(0, r.successes - num(contest.successes)) : r.successes;
  const wins = contest ? r.successes > num(contest.successes) : r.successes > 0;
  return {successes: r.successes, ones: r.ones, botch: r.botch, net, wins};
}

/** Sort the answers: most successes first, botches last, those still to answer after the rest. */
export function sortAnswers(list = []) {
  const rank = a => (a.pending ? -3 : a.blocked ? -2 : a.botch ? -1 : num(a.net ?? a.successes));
  return [...list].sort((a, b) => rank(b) - rank(a) || String(a.name).localeCompare(String(b.name)));
}

/** One line of summary for the card. */
export function summary(list = [], {contest = null} = {}) {
  const done = list.filter(a => !a.pending && !a.blocked);
  const waiting = list.filter(a => a.pending).length;
  const won = done.filter(a => a.wins).length, botched = done.filter(a => a.botch).length;
  const best = sortAnswers(done)[0];
  const parts = [`${won} of ${done.length} ${contest ? "beat the contest" : "succeeded"}`];
  if ( botched ) parts.push(`${botched} botched`);
  if ( best && best.wins ) parts.push(`best: ${best.name} (${best.net} net)`);
  if ( waiting ) parts.push(`${waiting} still to roll`);
  return parts.join("; ");
}

function cap(s) { return String(s ?? "").replace(/^./, c => c.toUpperCase()); }
