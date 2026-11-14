/**
 * WoDX Library: the Foundry side of gambling (B3910; rules in gamble-rules.mjs).
 */
import * as B from "./gamble-rules.mjs";
import {rollPool} from "./arms-use.mjs";

const MOD = "wodx-library";
const SOCKET = `module.${MOD}`;
const esc = s => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const num = v => Number(v) || 0;
const money = () => game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api?.upkeep?.money ?? null : null;
const attr = (a, k) => num(a?.system?.attributes?.[k]?.total ?? a?.system?.attributes?.[k]?.value);
const abil = (a, k) => {
  const v = a?.system?.abilities?.[k];
  if ( v ) return num(v.value);
  const t = (a?.items ?? []).find(i => i.type === "Trait" && String(i.name ?? "").toLowerCase() === k);
  return num(t?.system?.value);
};
const poolFor = a => B.poolOf(attr(a, "wits"), abil(a, "streetwise"), abil(a, "gambling"));
const facesLine = r => (r.faces.length ? `${r.dice} dice: ${r.faces.join(", ")} (${r.botch ? "a botch" : `${r.successes} success${r.successes === 1 ? "" : "es"}`})` : "no dice");
const fmt = v => { try { return money()?.format?.(v) ?? String(v); } catch (e) { return String(v); } };

/** Move the money: the gambler wins (+delta) or loses (-delta), from or to the other player or the house. */
async function settle(actor, other, delta, note) {
  const M = money();
  if ( !M || !delta ) return !!M;
  const [from, to, amt] = delta > 0 ? [other, actor, delta] : [actor, other, -delta];
  const canAll = [from, to].filter(Boolean).every(x => x.isOwner);
  if ( !canAll && !game.user.isGM ) {
    if ( !game.users.some(u => u.isGM && u.active) ) { ui.notifications.warn("The Storyteller is not here to move the money."); return false; }
    game.socket.emit(SOCKET, {op: "gamble", from: from?.id ?? null, to: to?.id ?? null, amount: amt, note});
    return true;
  }
  if ( from && to ) await M.transfer(from, to, amt, {note});
  else if ( from ) await M.pay(from, amt, {note});
  else if ( to ) await M.receive(to, amt, {note});
  return true;
}

/** The Storyteller's client moves money between characters a player does not own. */
export async function onGambleSocket(op) {
  if ( op?.op !== "gamble" || !game.user.isGM || game.users.activeGM?.id !== game.user.id ) return null;
  const M = money();
  const from = op.from ? game.actors.get(op.from) : null, to = op.to ? game.actors.get(op.to) : null;
  const amt = Math.max(0, Math.round(num(op.amount)));
  if ( !M || !amt ) return null;
  if ( from && to ) return M.transfer(from, to, amt, {note: op.note});
  if ( from ) return M.pay(from, amt, {note: op.note});
  if ( to ) return M.receive(to, amt, {note: op.note});
  return null;
}

/** Gamble with dice, cards or a board: against the targeted character, or the house. stakeKey skips the question. */
export async function gamble(actor, item, {stakeKey = null, against = undefined} = {}) {
  const tgt = against !== undefined ? against : ([...(game.user.targets ?? [])].map(t => t.actor).find(x => x && x.id !== actor.id) ?? null);
  const carried = num(money()?.purse?.(actor)?.carried);
  let key = stakeKey;
  if ( !key ) {
    const D = foundry.applications.api.DialogV2;
    key = await D.wait({window: {title: `${actor.name} gambles with ${item.name}`}, classes: ["wodx-dialog"],
      content: `<p>Against ${esc(tgt ? tgt.name : "the house")}. They carry ${esc(fmt(carried))}. How much on the table?</p>`,
      buttons: [...Object.entries(B.STAKES).map(([k, s], i) => ({action: k, label: `${s.label} (${esc(fmt(B.stakeOf(carried, k)))})`, default: i === 0})), {action: "cancel", label: "Cancel"}],
      rejectClose: false});
    if ( !key || key === "cancel" ) return null;
  }
  const stake = B.stakeOf(carried, key);
  if ( money() && !stake ) { ui.notifications.info(`${actor.name} has nothing to stake.`); return null; }
  const mine = await rollPool(poolFor(actor), B.DIFF);
  const theirs = tgt ? await rollPool(poolFor(tgt), B.DIFF) : null;
  const res = B.gambleResult(mine, theirs, stake);
  const moved = await settle(actor, tgt, res.delta, `Gambling with ${item.name}`);
  const lines = [`Stake ${esc(fmt(stake))}${tgt ? `, against ${esc(tgt.name)}` : ", against the house"}.`,
    `${esc(actor.name)}, Wits + Streetwise: ${facesLine(mine)}.`, theirs ? `${esc(tgt.name)}: ${facesLine(theirs)}.` : "", esc(res.line),
    res.delta ? (moved ? `${res.delta > 0 ? "Won" : "Lost"}: ${esc(fmt(Math.abs(res.delta)))}.` : `Settle ${esc(fmt(Math.abs(res.delta)))} by hand (WoDX Storyteller's money is off).`) : ""];
  const content = `<div class="wodx-card wlib-use-card"><p><b>${esc(actor.name)} gambles with ${esc(item.name)}</b></p>${lines.filter(Boolean).map(l => `<p>${l}</p>`).join("")}</div>`;
  await ChatMessage.create({content, speaker: ChatMessage.getSpeaker({actor}), rolls: [mine.roll, theirs?.roll].filter(Boolean)});
  return {...res, stake, mine, theirs};
}
