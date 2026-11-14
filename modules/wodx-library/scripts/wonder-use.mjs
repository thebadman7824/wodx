/**
 * WoDX Library: using a made supernatural item (B3690-B3692). The rules are in wonder-powers.mjs; this file reads the
 * actor and item, rolls, writes the changes and posts a card with Undo. The Use window (use.mjs) lists one button per
 * power as `wonder:<id>`.
 *
 * Worn bonuses: when a flagged item is equipped or taken off, its Attribute bonuses are switched in the system's own
 * bonuslist in the same update, so the sheet's totals follow.
 */
import * as P from "./wonder-powers.mjs";

const MOD = "wodx-library";
const esc = s => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const get = (o, path) => path.split(".").reduce((x, k) => x?.[k], o);
const flagOf = item => item?.flags?.[MOD]?.[P.FLAG] ?? null;

/** True when the item carries powers or a pool. */
export const isWonder = item => { const f = flagOf(item); return !!(f && (f.powers?.length || f.pool || f.worn?.length)); };

/** Use-window keys for the item's powers. */
export function powerKeys(item) {
  const f = flagOf(item);
  return f ? P.powersOf(f).map(p => `wonder:${p.id}`) : [];
}

/** The Use-window label for a key. */
export function powerLabel(item, key) {
  const p = P.powerOf(flagOf(item), String(key).slice(7));
  return p?.label ?? key;
}

/** Dots of an Ability: the system's own, or an Ability item of that name (secondary abilities). */
function abilityOf(actor, key) {
  if ( !key ) return 0;
  const v = actor?.system?.abilities?.[key]?.value;
  if ( v !== undefined ) return n(v);
  const it = [...(actor?.items ?? [])].find(i => i.type === "Ability" && String(i.name).toLowerCase() === String(key).toLowerCase());
  return n(it?.system?.value);
}
const attrOf = (actor, key) => { const a = actor?.system?.attributes?.[key]; return n(a?.total ?? a?.value); };

/** How many dice a power's roll has, and its name for the card. */
export function diceFor(actor, roll = {}) {
  if ( roll.dice !== undefined ) return {dice: n(roll.dice), label: roll.label ?? `${n(roll.dice)} dice`};
  if ( roll.path ) { const r = P.refOf(roll.path); return {dice: n(get(actor, r.path)), label: roll.label ?? r.path.split(".").slice(-2, -1)[0] ?? "pool"}; }
  const d = attrOf(actor, roll.attr) + abilityOf(actor, roll.ability);
  const cap = s => String(s ?? "").replace(/^./, c => c.toUpperCase());
  return {dice: d, label: [roll.attr, roll.ability].filter(Boolean).map(cap).join(" + ")};
}

function valuesFor(actor, item, power) {
  const v = {[`item:${"flags.wodx-library.wonder.pool.value"}`]: n(flagOf(item)?.pool?.value)};
  for ( const p of P.pathsOf(power) ) v[`actor:${p}`] = n(get(actor, p));
  return v;
}

async function roll(actor, spec) {
  const {dice, label} = diceFor(actor, spec);
  if ( dice <= 0 ) return {successes: 0, botch: false, dice: 0, label, faces: [], diff: n(spec.diff) || 6, roll: null};
  const r = new Roll(`${dice}d10`);
  await r.evaluate();
  const faces = r.dice[0]?.results?.map(x => x.result) ?? [];
  return {...P.countSuccesses(faces, spec.diff), dice, label, faces, roll: r};
}

/** Ask for the number a roll needs first (the local Wall); null when closed. */
async function askFor(item, ask = {}) {
  const D = foundry.applications.api.DialogV2;
  const v = await D.prompt({window: {title: item.name}, rejectClose: false,
    content: `<div class="form-group"><label>${esc(ask.label ?? "Number")}</label><input type="number" name="v" min="${n(ask.min)}" max="${n(ask.max) || 10}" value="${n(ask.value)}"/></div>`,
    ok: {label: "Roll", callback: (ev, button) => button.form.elements.v.valueAsNumber}});
  return Number.isFinite(v) ? v : null;
}

const ownersOf = a => game.users.filter(u => a?.testUserPermission?.(u, "OWNER")).map(u => u.id);
const gms = () => game.users.filter(u => u.isGM).map(u => u.id);

/** Run one power. Returns the plan, or null when it could not run. opts.answer answers a roll's ask without the prompt. */
export async function runPower(item, key, actor, {answer = null} = {}) {
  const f = flagOf(item);
  const id = String(key).replace(/^wonder:/, "");
  const power = P.powerOf(f, id);
  if ( !f || !power ) return null;
  if ( !actor ) { ui.notifications.warn("Pick the character who uses it first."); return null; }
  const values = valuesFor(actor, item, power), now = game.time?.worldTime ?? 0;
  const bl = P.blockersOf(power, {flag: f, values, isGM: game.user.isGM, now});
  if ( bl.length ) { ui.notifications.warn(`${item.name}: ${bl.join("; ")}.`); return null; }
  let spec = power.roll;
  if ( spec?.ask ) {
    const a = answer ?? await askFor(item, spec.ask);
    if ( a === null ) return null;
    spec = {...spec, diff: P.askedDiff(spec, a)};
  }
  const r = spec ? await roll(actor, spec) : null;
  const out = P.plan(power, {flag: f, values, roll: r, now});
  const itemUp = {...out.item};
  if ( out.spent && f.worn?.length ) itemUp["system.bonuslist"] = P.wornList({...f, spent: true}, false, item.system?.bonuslist);
  if ( Object.keys(itemUp).length ) await item.update(itemUp);
  if ( Object.keys(out.actor).length ) await actor.update(out.actor);
  const undo = {item: item.uuid, actor: actor.uuid, itemData: out.undo.item, actorData: out.undo.actor,
    bonuslist: out.spent && f.worn?.length ? (item.system?.bonuslist ?? []) : null};
  const rollHtml = r ? `<p>${esc(r.label)}: ${r.dice} dice at difficulty ${r.diff}${r.faces.length ? ` (${r.faces.join(", ")})` : ""}.</p>` : "";
  await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor}), whisper: [...new Set([...ownersOf(actor), ...gms()])], rolls: r?.roll ? [r.roll] : [],
    flags: {[MOD]: {wonderUndo: undo}},
    content: `<div class="wodx-card wlib-wonder-card"><h3>${esc(actor.name)}: ${esc(power.label)} (${esc(item.name)})</h3>${power.text ? `<p>${esc(power.text)}</p>` : ""}${rollHtml}<ul data-fixed>${out.lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul><button type="button" data-action="wlib-wonder-undo">Undo</button></div>`});
  return out;
}

/** Undo a power's card: put back the item and actor values it changed. */
export async function undoCard(message) {
  const u = message?.flags?.[MOD]?.wonderUndo;
  if ( !u || u.done ) return false;
  const item = await fromUuid(u.item), actor = await fromUuid(u.actor);
  if ( !(game.user.isGM || actor?.isOwner) ) { ui.notifications.warn("Only the Storyteller or the character's player can undo this."); return false; }
  if ( item && (Object.keys(u.itemData ?? {}).length || u.bonuslist) ) await item.update({...u.itemData, ...(u.bonuslist ? {"system.bonuslist": u.bonuslist} : {})});
  if ( actor && Object.keys(u.actorData ?? {}).length ) await actor.update(u.actorData);
  if ( message.isOwner || game.user.isGM ) await message.update({[`flags.${MOD}.wonderUndo.done`]: true, content: message.content.replace(/<button[^>]*wlib-wonder-undo[^>]*>Undo<\/button>/, "<p><i>Undone.</i></p>")});
  return true;
}

/** Charge or drain an item's pool (a periapt at a node, a Treasure refilled with Glamour). */
export async function setPool(item, value) {
  const up = P.setPool(flagOf(item), value);
  if ( !Object.keys(up).length ) return false;
  await item.update({...up, ...(n(value) > 0 && flagOf(item)?.spent && flagOf(item)?.emptySpent ? {"flags.wodx-library.wonder.spent": false} : {})});
  return true;
}

export function setupWonderUse() {
  // Worn bonuses follow the equipped box in the same update
  Hooks.on("preUpdateItem", (item, changes) => {
    const f = flagOf(item);
    const eq = changes?.system?.isequipped;
    if ( !f?.worn?.length || eq === undefined ) return;
    foundry.utils.setProperty(changes, "system.bonuslist", P.wornList(f, !!eq, item.system?.bonuslist));
  });
  Hooks.on("renderChatMessageHTML", (message, html) => {
    const b = html?.querySelector?.("[data-action=wlib-wonder-undo]");
    if ( !b ) return;
    b.addEventListener("click", ev => { ev.preventDefault(); b.disabled = true; undoCard(message).catch(e => { console.error(`${MOD} | wonder undo`, e); b.disabled = false; }); });
  });
}

export const wonderUseApi = () => ({run: runPower, undo: undoCard, setPool, keys: powerKeys, isWonder, rules: P});
