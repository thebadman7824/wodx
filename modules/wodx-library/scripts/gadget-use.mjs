/**
 * WoDX Library: the Foundry side of seeds, fire-lighters and timepieces (B3911; rules in gadget-rules.mjs).
 */
import * as D from "./gadget-rules.mjs";

const MOD = "wodx-library";
const esc = s => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const now = () => game.time?.worldTime ?? 0;
const ownersOf = actor => game.users.filter(u => u.isGM || actor?.testUserPermission?.(u, "OWNER")).map(u => u.id);
async function card(actor, title, line, {whisper = null} = {}) {
  const content = `<div class="wodx-card wlib-use-card"><p><b>${esc(title)}</b></p><p>${esc(line)}</p></div>`;
  return ChatMessage.create({content, speaker: ChatMessage.getSpeaker({actor}), ...(whisper ? {whisper} : {})});
}

/** Plant a seed, look at how it grows, or harvest it. */
export async function plant(actor, item) {
  const crop = D.cropOf(item.name);
  if ( !crop ) return null;
  const planted = item.flags?.[MOD]?.planted ?? null;
  const st = D.plantState(planted, crop, now());
  if ( st.state === "seed" ) {
    await item.update({[`flags.${MOD}.planted`]: {at: now(), by: actor.name}});
    return card(actor, `${actor.name} plants ${item.name}`, crop.crop ? `In the ground: ready to harvest in ${crop.days} days.` : `In the ground: it takes ${crop.days} days to bear.`);
  }
  if ( st.state === "growing" ) return card(actor, `${item.name} is growing`, `${st.daysLeft} day${st.daysLeft === 1 ? "" : "s"} until it is ready.`);
  if ( !crop.crop ) { await item.delete(); return card(actor, `${actor.name}'s ${item.name} has grown`, "Grown and bearing: it stands where it was planted."); }
  await actor.createEmbeddedDocuments("Item", [{name: crop.crop, type: "Item", flags: {"wodx-sheets": {qty: crop.n}}}]);
  await item.delete();
  return card(actor, `${actor.name} harvests ${item.name}`, `${crop.n} × ${crop.crop} into Possessions.`);
}

/** Strike a light: the first unlit light the character carries is lit. lightIt(actor, item, good) is Use's own. */
export async function strike(actor, item, {lights, lightIt}) {
  const lamp = lights.find(x => x.item.id !== item.id);
  if ( !lamp ) return card(actor, `${actor.name} strikes a light with ${item.name}`, "A small flame for a moment: enough to light a fire, a pipe or a fuse.");
  await card(actor, `${actor.name} strikes a light with ${item.name}`, `${lamp.item.name} is lit.`);
  return lightIt(actor, lamp.item, lamp.good);
}

/** Tell the time with a clock, a watch, a sundial or an hourglass (to the one who looks). */
export async function tellTime(actor, item) {
  const kind = D.timepieceOf(item.name);
  if ( !kind ) return null;
  const c = game.time?.calendar?.timeToComponents?.(now()) ?? {};
  let stamp = "";
  try { stamp = game.time?.calendar?.format?.(now(), "timestamp") ?? ""; } catch (e) { stamp = ""; }
  let sunUp = true;
  try { sunUp = game.modules.get("wodx-interactables")?.api?.sunUp?.() ?? true; } catch (e) { sunUp = true; }
  const turnedAt = item.flags?.[MOD]?.turned ?? null;
  const line = D.timeLine(kind, {hour: Number(c.hour) || 0, minute: Number(c.minute) || 0, sunUp, turnedAt, now: now(), stamp});
  if ( kind === "glass" ) await item.update({[`flags.${MOD}.turned`]: now()});
  return card(actor, `${actor.name} looks at ${item.name}`, line, {whisper: ownersOf(actor)});
}
