/**
 * WoDX Chronicle: derangements in play, the Foundry side (B3913; rules in derangement-rules.mjs).
 *
 *   hold(actor, key?, {spend, roll}): when one is set off, a Willpower roll at the entry's difficulty (or a spent
 *     Willpower point) holds it off for the scene; a failure starts a bout: the Deranged status and an actor flag
 *     wodx-chronicle.bout = {keys, at, sceneId}. While the bout lasts (the scene, at most an hour of game time; the
 *     scene's end or another scene made active ends it, B6161) the entry's roll
 *     effects reach every roll through the trait effect channel, and the card says what it does.
 *   gain(actor, cause, why): a Virtue loss writes a new derangement into the sheet's box and posts a card.
 *   end(actor): the bout is over.
 * game.modules.get("wodx-chronicle").api.derangements = {rules, of, hold, gain, end, boutOf}.
 */
import {MODULE_ID, esc} from "./util.mjs";
import * as D from "./derangement-rules.mjs";
import {registerCondition, setCondition, hasCondition} from "./conditions.mjs";
import {addSource} from "./traits.mjs";

const FLAG = "bout";
const now = () => game.time?.worldTime ?? 0;
const num = v => Number(v) || 0;

export const of = actor => D.keysIn(actor?.system?.derangement);
export const boutOf = actor => {
  const b = actor?.getFlag?.(MODULE_ID, FLAG);
  return D.boutLive(b, now()) ? b : null;
};

function count(faces, diff) {
  const hits = faces.filter(f => f >= diff).length, ones = faces.filter(f => f === 1).length;
  return {successes: Math.max(0, hits - ones), botch: hits === 0 && ones > 0};
}

async function rollWill(actor, diff) {
  const n = Math.max(1, num(actor?.system?.advantages?.willpower?.permanent));
  const roll = await new Roll(`${n}d10`).evaluate();
  const faces = roll.dice[0]?.results?.map(r => r.result) ?? [];
  return {...count(faces, diff), faces, roll, dice: n, diff};
}

async function card(actor, title, lines, rolls = []) {
  const content = `<div class="wodx-card wodx-derangement-card"><p><b>${esc(title)}</b></p>${lines.filter(Boolean).map(l => `<p>${l}</p>`).join("")}</div>`;
  return ChatMessage.create({content, speaker: ChatMessage.getSpeaker({actor}), rolls});
}

function modLines(key) {
  const e = D.TABLE[key];
  return e.mods.map(m => `${m.diff > 0 ? `+${m.diff}` : m.diff} difficulty ${m.tags.length ? `on ${m.tags.join(", ")} rolls` : "on every roll"}: ${esc(m.note)}.`);
}

/** Start (or add to) a bout for the scene. */
export async function startBout(actor, key) {
  const b = boutOf(actor);
  const keys = [...new Set([...(b?.keys ?? []), key])];
  // B6161: the scene it began on, so the end of that scene (or a move to another) ends it
  await actor.setFlag(MODULE_ID, FLAG, {keys, at: b?.at ?? now(), sceneId: b?.sceneId ?? game.scenes?.active?.id ?? null});
  if ( !hasCondition(actor, "deranged") ) await setCondition(actor, "deranged", true).catch(() => false);
  return keys;
}

/** The bout ends (the Storyteller's call, or the scene is over). */
export async function end(actor) {
  if ( actor?.getFlag?.(MODULE_ID, FLAG) ) await actor.unsetFlag(MODULE_ID, FLAG);
  if ( hasCondition(actor, "deranged") ) await setCondition(actor, "deranged", false).catch(() => false);
  return true;
}

async function askKey(actor, keys) {
  const D2 = foundry.applications.api.DialogV2;
  const wp = num(actor.system?.advantages?.willpower?.temporary);
  const opts = keys.map(k => `<option value="${k}">${esc(D.TABLE[k].label)}: ${esc(D.TABLE[k].trigger)}</option>`).join("");
  return D2.wait({window: {title: `${actor.name}: a derangement is set off`}, classes: ["wodx-dialog"],
    content: `<p>Which one?</p><select name="key">${opts}</select><p>Roll Willpower to hold it off for the scene, or spend a Willpower point (${wp} left) to hold it off without a roll.</p>`,
    buttons: [{action: "roll", label: "Roll Willpower", default: true, callback: (e, b) => ({key: b.form.elements.key.value, spend: false})},
      {action: "spend", label: "Spend Willpower", callback: (e, b) => ({key: b.form.elements.key.value, spend: true})},
      {action: "give", label: "Give in to it", callback: (e, b) => ({key: b.form.elements.key.value, give: true})},
      ...(boutOf(actor) ? [{action: "end", label: "The bout is over", callback: () => ({end: true})}] : []),
      {action: "cancel", label: "Cancel"}], rejectClose: false});
}

/**
 * A derangement is set off. key: which (asked when null); spend: spend a Willpower point; give: no roll.
 * Returns {key, held, bout} or null.
 */
export async function hold(actor, key = null, {spend = false, give = false} = {}) {
  const keys = of(actor);
  if ( !keys.length ) { ui.notifications?.info(`${actor.name} has no derangement in the Derangements box that WoDX knows.`); return null; }
  if ( !key ) {
    const pick = await askKey(actor, keys);
    if ( !pick || pick === "cancel" ) return null;
    if ( pick.end ) { await end(actor); await card(actor, `${actor.name} comes back to themselves`, ["The bout is over."]); return {end: true}; }
    ({key, spend = false, give = false} = pick);
  }
  const e = D.TABLE[key];
  if ( !e ) return null;
  const wp = actor.system?.advantages?.willpower ?? {};
  if ( spend && num(wp.temporary) > 0 ) {
    await actor.update({"system.advantages.willpower.temporary": num(wp.temporary) - 1});
    await card(actor, `${actor.name} holds off the ${e.label.toLowerCase()}`, [`${esc(e.trigger)}`, "A Willpower point spent: it waits until the next scene."]);
    return {key, held: true, spent: true};
  }
  let r = null, res = {held: false, line: e.grip};
  if ( !give ) { r = await rollWill(actor, e.hold); res = D.holdResult(key, r); }
  if ( !res.held ) await startBout(actor, key);
  const lines = [esc(e.trigger), r ? `Willpower, ${r.dice} dice at ${r.diff}: ${r.faces.join(", ")} (${r.botch ? "a botch" : `${r.successes} success${r.successes === 1 ? "" : "es"}`}).` : "They give in to it.",
    esc(res.line), ...(res.held ? [] : [...modLines(key), e.held ? "Held move: they flee or freeze before anything else this turn, unless a Courage roll (difficulty 7) succeeds." : "", "It lasts the scene."])];
  await card(actor, `${actor.name}: ${e.label}`, lines, r?.roll ? [r.roll] : []);
  return {key, held: res.held, botch: !!res.botch, roll: r, bout: res.held ? null : boutOf(actor)};
}

/** A Virtue loss leaves a derangement: written into the box, with a card. cause: frenzy, sin, fear, loss (a death mourned), binding (a soul bound) or other. */
export async function gain(actor, cause = "other", why = "") {
  if ( !actor?.isOwner ) return null;
  const key = D.pickNew(cause, of(actor), Math.random());
  if ( !key ) return null;
  const text = D.addToBox(actor.system?.derangement, key, why);
  await actor.update({"system.derangement": text});
  await card(actor, `${actor.name} gains a derangement: ${D.TABLE[key].label}`, [esc(D.TABLE[key].trigger), "Written into the Derangements box. When it is set off, they roll Willpower to hold it off (the Derangements panel)."]);
  return key;
}

export function setupDerangements() {
  registerCondition({id: "deranged", name: "Deranged", img: "icons/svg/daze.svg", source: "WoDX house reading of the V20 derangement rules",
    summary: "In the grip of a derangement for the scene: its rolls are harder, as the card says."});
  addSource((actor, ctx) => {
    const b = boutOf(actor);
    return b ? D.boutEffects(b.keys, ctx) : [];
  });
  const gm = () => game.user?.isGM && game.users.activeGM?.id === game.user.id;
  // a bout past its scene drops its status (the Storyteller's client)
  Hooks.on("updateWorldTime", () => {
    if ( !gm() ) return;
    for ( const a of game.actors ?? [] ) if ( hasCondition(a, "deranged") && a.getFlag(MODULE_ID, FLAG) && !boutOf(a) ) end(a).catch(() => {});
  });
  // B6161: the scene ends (the clock's End the scene, WoDX Actions' End scene) or another scene is made active:
  // the bouts begun there end with it, whether or not the clock moved
  const endWith = (test, why) => {
    if ( !gm() ) return;
    for ( const a of game.actors ?? [] ) {
      const b = a.getFlag(MODULE_ID, FLAG);
      if ( (b || hasCondition(a, "deranged")) && test(b ?? {}) ) end(a).then(() => card(a, `${a.name} comes back to themselves`, [why])).catch(() => {});
    }
  };
  Hooks.on("wodxEndScene", ({sceneId = null} = {}) => endWith(b => D.boutEndsWithScene(b, {ended: sceneId}), "The scene is over, and the bout with it."));
  Hooks.on("updateScene", (scene, changes) => {
    if ( changes?.active === true ) endWith(b => D.boutEndsWithScene(b, {active: scene.id}), "A new scene: the bout is over.");
  });
}

export const derangementsApi = {rules: D, of, hold, gain, end, boutOf, startBout};
