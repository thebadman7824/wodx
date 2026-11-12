/**
 * WoDX Library 0.9.0: Use a thing (rules in use-rules.mjs). Opened from the Possessions row's hand button, the
 * item sheet's Use header button, or api.use.open(item).
 *
 *   Eat or drink: feeds or waters the living through Storyteller hardship; a drink or drug puts its state in the
 *     body (a card for the user and the Storyteller, and the vessel state a feeding vampire meets).
 *   Treat: the First aid common check, one easier with supplies (house rule); spent supplies go.
 *   Light, Refill: a carried light on the character's token (Interactables).
 *   Write, Draw, Mark, Record, Take a picture: pages kept on the item (flags.wodx-library.pages); Read shows them.
 *   Write a letter: a new "a private letter" with the page in it.
 *   Play, Look through, Make or fix: the common check. Sleep in it: marks sleep for the living.
 *   Everything else tells the table what the character does.
 * Anything a player cannot change themselves (hardship) goes to the Storyteller's client by socket.
 */
import * as U from "./use-rules.mjs";
import * as X from "./examine-rules.mjs";

const MOD = "wodx-library";
const SOCKET = `module.${MOD}`;
const esc = s => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
let G = null;
const load = async () => (G ??= await import("../data/goods.mjs"));
const st = () => game.modules.get("wodx-storyteller")?.api;
const actions = () => game.modules.get("wodx-actions")?.api;
const inter = () => game.modules.get("wodx-interactables")?.api;
const now = () => game.time?.worldTime ?? 0;

const goodOfItem = item => {
  if ( !G ) return null;
  const id = item?.flags?.[MOD]?.good;
  return (id && G.GOODS.find(g => g.id === id)) || X.goodOf(item?.name, G.GOODS);
};
export const lineOfActor = a => U.lineOf(a?.type, a?.system?.settings?.variant);
const holderOf = item => (item?.parent?.documentName === "Actor" ? item.parent : null) ?? canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character ?? null;
const tokenOf = actor => actor?.getActiveTokens?.()?.[0]?.document ?? null;
const targetActor = () => [...(game.user.targets ?? [])][0]?.actor ?? null;
const qtyOf = it => Math.max(1, Math.floor(Number(it?.flags?.["wodx-sheets"]?.qty) || 1));

/** Abilities of an item: its good's, plus Read when pages are kept in it. */
export async function abilitiesOfItem(item) {
  await load();
  const good = goodOfItem(item);
  const list = good ? U.abilitiesOf(good) : [];
  if ( U.normPages(item?.flags?.[MOD]?.pages).length && !list.includes("read") ) list.push("read");
  // 0.12.0: things with parts in them can be taken apart (Storyteller's recipes, data/recipes.mjs SALVAGE)
  try { if ( !list.includes("salvage") && (await st()?.cookery?.salvageOf?.(item))?.ok ) list.push("salvage"); } catch (e) { /* no Storyteller */ }
  return list;
}

/* ---------------------------------------------------------------- chat */

async function say(actor, text) {
  return ChatMessage.create({content: `<div class="wodx-card wlib-use-card"><p>${esc(text)}</p></div>`, speaker: ChatMessage.getSpeaker({actor})});
}
async function tellPrivately(actor, title, text) {
  const ids = game.users.filter(u => u.isGM || actor?.testUserPermission?.(u, "OWNER")).map(u => u.id);
  return ChatMessage.create({content: `<div class="wodx-card wlib-use-card"><p><b>${esc(title)}</b></p><p>${esc(text)}</p></div>`, whisper: ids, speaker: {alias: "What it does"}});
}

/* ---------------------------------------------------------------- the Storyteller's side */

async function gmDo(op) {
  if ( game.user.isGM ) return onSocket(op);
  if ( !game.users.some(u => u.isGM && u.active) ) { ui.notifications.warn("The Storyteller is not here to note it."); return null; }
  game.socket.emit(SOCKET, op);
  return null;
}
async function onSocket(op) {
  if ( !game.user.isGM || game.users.activeGM?.id !== game.user.id ) return null;
  const a = game.actors.get(op?.actor);
  if ( !a ) return null;
  if ( op.op === "mark" ) return st()?.hardship?.mark?.(a, op.kinds ?? []);
  return null;
}

/** Spend one of a stack, or the item itself when it is the last. */
async function spendOne(item) {
  if ( !item?.isOwner ) return;
  const q = qtyOf(item);
  if ( q > 1 ) return item.update({"flags.wodx-sheets.qty": q - 1});
  return item.delete();
}

/* ---------------------------------------------------------------- what an ability does */

async function takeIt(actor, item, good, ability, patient = actor) {
  const key = U.effectKeyOf(good, ability);
  const line = lineOfActor(patient);
  const eff = U.effectFor(key, line);
  const thing = item.name;
  await say(actor, ability === "throw" && patient !== actor ? `${actor.name} throws ${thing} over ${patient.name}.` : U.useLine(actor.name, ability, thing));
  if ( eff.does === "feeds" ) await gmDo({op: "mark", actor: patient.id, kinds: ["food"]});
  if ( eff.does === "waters" || eff.waters ) await gmDo({op: "mark", actor: patient.id, kinds: ["water"]});
  if ( eff.does === "blood" && patient.isOwner ) {
    const b = patient.system?.advantages?.bloodpool ?? {};
    const max = Number(b.max) || 10, v = Number(b.temporary) || 0;
    await patient.update({"system.advantages.bloodpool.temporary": Math.min(max, v + 1)});
  }
  const state = eff.state ?? null;
  if ( (eff.does === "takes" || state) && state && patient.isOwner ) {
    const was = patient.flags?.[MOD]?.intox ?? {};
    const count = was.state === state && now() - (Number(was.at) || 0) < 3 * 3600 ? (Number(was.count) || 1) + 1 : 1;
    const upd = {[`flags.${MOD}.intox`]: {state, at: now(), count}};
    if ( U.VESSEL_STATE[state] ) upd["flags.wodx-actions.vesselState"] = U.VESSEL_STATE[state];
    await patient.update(upd);
  }
  let text = eff.text ?? (state && U.STATES[state] ? `${U.STATES[state].label}: ${U.STATES[state].text}` : null);
  // 0.10.0: a made drug or medicine's strength; an impure batch is the Storyteller's to know
  const made = item.flags?.["wodx-storyteller"] ?? {};
  if ( text && U.STRENGTH_TEXT[made.strength] ) text = `${text} ${U.STRENGTH_TEXT[made.strength]}`;
  if ( made.impure && eff.does !== "cannot" ) await ChatMessage.create({content: `<div class="wodx-card wlib-use-card"><p><b>${esc(patient.name)} and ${esc(thing)}</b></p><p>${esc(U.STRENGTH_TEXT.impure)}</p></div>`,
    whisper: game.users.filter(u => u.isGM).map(u => u.id), speaker: {alias: "What it does"}});
  if ( eff.does === "storyteller" ) await tellPrivately(patient, `${patient.name} and ${thing}`, `The Storyteller decides what this does to a ${U.LINE_LABELS[line].toLowerCase()}.`);
  else if ( text ) await tellPrivately(patient, `${patient.name} and ${thing}`, state === "drunk" ? `${text} Drinks in the last few hours: ${patient.flags?.[MOD]?.intox?.count ?? 1}.` : text);
  if ( U.spends(good, ability) && eff.does !== "cannot" ) await spendOne(item);
}

async function treat(actor, item, good) {
  const patient = targetActor() ?? actor;
  const eff = U.effectFor("care", lineOfActor(patient));
  if ( eff.does !== "treats" ) {
    await tellPrivately(patient, `${patient.name} and ${item.name}`, eff.does === "storyteller" ? `The Storyteller decides what first aid does for a ${U.LINE_LABELS[lineOfActor(patient)].toLowerCase()}.` : (eff.text ?? "It does nothing here."));
    if ( eff.does === "cannot" ) return;
  }
  await say(actor, `${actor.name} treats ${patient === actor ? "a wound" : patient.name} with ${item.name}.`);
  const roll = actions()?.quickCheck;
  if ( roll ) await roll({actor, check: "firstaid", extraDiff: U.CARE_DIFF, desc: `First aid with ${item.name}`});
  if ( U.spends(good, "treat") ) await spendOne(item);
}

async function light(actor, item, good, refuel = false) {
  const tok = tokenOf(actor);
  const c = inter()?.carry;
  const carry = typeof c === "function" ? c : c?.carry;
  if ( !tok || !carry ) return ui.notifications.warn("Put the character's token on the map first.");
  const kind = refuel ? U.refuelOf(good) : U.lightOf(good);
  if ( refuel ) {
    const s = tok.flags?.["wodx-interactables"]?.carried;
    if ( !s || s.kind !== kind ) return ui.notifications.warn(kind === "electric" ? "There is no electric light to put it in." : "There is no oil lantern to fill.");
  }
  await carry(tok, "fresh", kind);
  if ( refuel ) { await say(actor, U.useLine(actor.name, "refuel", item.name)); await spendOne(item); }
}

async function writePage(actor, item, ability) {
  const a = U.ABILITIES[ability];
  const picture = a.page === "drawing" || a.page === "picture";
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 480}, window: {title: `${a.label}: ${item.name}`}, classes: ["wodx-dialog", "wlib-use"],
    content: `<div class="form-group stacked"><label>${picture ? "What it shows" : a.page === "recording" ? "What is on it" : "What is written"}</label><textarea name="text" rows="7"></textarea></div>
      ${picture ? `<div class="form-group"><label>A picture (optional)</label><input type="text" name="img" placeholder="path to an image"/><button type="button" data-pick><i class="fa-solid fa-file-image"></i></button></div>` : ""}`,
    render: (ev, dlg) => {
      const el = dlg?.element ?? ev?.target?.element;
      el?.querySelector("[data-pick]")?.addEventListener("click", () => new foundry.applications.apps.FilePicker.implementation({type: "image", callback: p => { const i = el.querySelector("[name=img]"); if ( i ) i.value = p; }}).render(true));
    },
    buttons: [{action: "ok", label: "Keep it", default: true, callback: (e, b) => ({text: b.form.elements.text.value, img: b.form.elements.img?.value ?? ""})}, {action: "cancel", label: "Cancel"}]});
  if ( !res || typeof res !== "object" || (!res.text.trim() && !res.img) ) return;
  const pages = U.normPages(item.flags?.[MOD]?.pages);
  pages.push({kind: a.page, text: res.text, img: res.img, by: actor?.name ?? game.user.name, at: now()});
  await item.update({[`flags.${MOD}.pages`]: U.normPages(pages)});
  await say(actor, U.useLine(actor.name, ability, item.name));
}

async function letter(actor, item) {
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 480}, window: {title: `Write a letter: ${item.name}`}, classes: ["wodx-dialog", "wlib-use"],
    content: `<div class="form-group"><label>To</label><input type="text" name="to"/></div><div class="form-group stacked"><label>The letter</label><textarea name="text" rows="8"></textarea></div>`,
    buttons: [{action: "ok", label: "Write it", default: true, callback: (e, b) => ({to: b.form.elements.to.value, text: b.form.elements.text.value})}, {action: "cancel", label: "Cancel"}]});
  if ( !res || typeof res !== "object" || !res.text.trim() ) return;
  const text = res.to.trim() ? `To ${res.to.trim()}.\n\n${res.text}` : res.text;
  await actor.createEmbeddedDocuments("Item", [{name: "a private letter", type: "Item", flags: {[MOD]: {pages: U.normPages([{kind: "writing", text, by: actor.name, at: now()}])}}}]);
  await say(actor, U.useLine(actor.name, "letter", item.name));
}

export async function read(item) {
  await load();
  const pages = U.normPages(item?.flags?.[MOD]?.pages);
  const desc = String(item?.system?.description ?? "").trim();
  const body = pages.length ? pages.map((p, i) => `<section class="wlib-page"><h4>${esc(U.PAGE_LABELS[p.kind])}${p.by ? `, by ${esc(p.by)}` : ""}</h4>${p.img ? `<img src="${esc(p.img)}" alt="${esc(p.text.slice(0, 80))}" style="max-width:100%"/>` : ""}${p.text ? `<p>${esc(p.text).replaceAll("\n", "<br>")}</p>` : ""}${item.isOwner ? `<a class="wlib-page-cut" data-i="${i}" title="Tear out this page"><i class="fa-solid fa-xmark"></i></a>` : ""}</section>`).join("")
    : "<p>Nothing has been written or drawn in it.</p>";
  await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 500}, window: {title: `Read: ${item.name}`}, classes: ["wodx-dialog", "wlib-use"],
    content: `${desc ? `<div class="wlib-ex-desc">${desc}</div>` : ""}<div class="wlib-pages">${body}</div>`,
    render: (ev, dlg) => {
      const el = dlg?.element ?? ev?.target?.element;
      el?.querySelectorAll(".wlib-page-cut").forEach(b => b.addEventListener("click", async () => {
        const left = U.normPages(item.flags?.[MOD]?.pages).filter((p, i) => i !== Number(b.dataset.i));
        await item.update({[`flags.${MOD}.pages`]: left});
        b.closest(".wlib-page")?.remove();
      }));
    },
    buttons: [{action: "close", label: "Close", default: true}]});
}

/** Do one ability with an item. */
export async function run(item, ability, actor = holderOf(item)) {
  await load();
  const good = goodOfItem(item);
  const a = U.ABILITIES[ability];
  if ( !a || !actor ) return ui.notifications.warn("Pick the character who uses it first.");
  switch ( a.effect ) {
    case "take": return takeIt(actor, item, good, ability, ability === "throw" ? (targetActor() ?? actor) : actor);
    case "treat": return treat(actor, item, good);
    case "light": return light(actor, item, good, false);
    case "refuel": return light(actor, item, good, true);
    case "pages": return writePage(actor, item, ability);
    case "read": { await say(actor, U.useLine(actor.name, "read", item.name)); return read(item); }
    case "letter": return letter(actor, item);
    case "salvage": {
      const ck = st()?.cookery;
      const r = ck?.takeApart ? await ck.takeApart(actor, item) : {ok: false, why: "Taking apart needs WoDX Storyteller."};
      if ( !r.ok && !r.rolled ) ui.notifications.warn(r.why);
      return r;
    }
    case "cook": {
      // 0.10.0: Cook, brew or mix (Storyteller), showing the recipes this thing goes into
      const ck = st()?.cookery;
      if ( ck?.open ) return ck.open(actor, {using: item.kind === "kitchen" || good?.kind === "kitchen" ? "" : (good?.name ?? item.name)});
      await say(actor, U.useLine(actor.name, ability, item.name));
      return null;
    }
    case "wear": {
      const on = !(item.system?.isequipped);
      await item.update({"system.isequipped": on});
      return say(actor, on ? `${actor.name} puts on ${item.name}.` : `${actor.name} takes off ${item.name}.`);
    }
    case "check": {
      await say(actor, U.useLine(actor.name, ability, item.name));
      return actions()?.quickCheck?.({actor, check: a.check, desc: `${a.label}: ${item.name}`});
    }
    case "system": {
      await say(actor, U.useLine(actor.name, ability, item.name));
      return actions()?.action?.({actor, preset: a.preset});
    }
    case "sleep": {
      const eff = U.effectFor("bed", lineOfActor(actor));
      await say(actor, U.useLine(actor.name, "sleep", item.name));
      if ( eff.does === "sleeps" ) return gmDo({op: "mark", actor: actor.id, kinds: ["sleep"]});
      if ( eff.text ) return tellPrivately(actor, item.name, eff.text);
      return null;
    }
    default: {
      await say(actor, U.useLine(actor.name, ability, item.name));
      if ( U.spends(good, ability) ) await spendOne(item);
    }
  }
}

/** The Use window: one button per ability. */
export async function openUse(item, actor = holderOf(item)) {
  const list = await abilitiesOfItem(item);
  if ( !list.length ) return ui.notifications.info("Nothing to do with it but keep it.");
  if ( list.length === 1 ) return run(item, list[0], actor);
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 360}, window: {title: `Use: ${item.name}`}, classes: ["wodx-dialog", "wlib-use"],
    content: `<p class="hint">${esc(actor?.name ?? "")}${targetActor() ? `, with ${esc(targetActor().name)} targeted` : ""}</p>`,
    buttons: [...list.map((k, i) => ({action: k, label: U.ABILITIES[k].label, default: i === 0})), {action: "cancel", label: "Cancel"}]});
  if ( res && U.ABILITIES[res] ) return run(item, res, actor);
}

export async function setupUse() {
  await load();
  game.socket?.on(SOCKET, onSocket);
  const can = it => !!it && it.isOwner;
  Hooks.on("getHeaderControlsItemSheetV2", (app, controls) => {
    const it = app.document;
    if ( !can(it) || controls.some(c => c.action === "wlibUse") ) return;
    const go = () => openUse(it);
    if ( app.options?.actions ) app.options.actions.wlibUse = go;
    controls.push({icon: "fa-solid fa-hand-sparkles", label: "Use", action: "wlibUse", onClick: go});
  });
  Hooks.on("getItemSheetHeaderButtons", (sheet, buttons) => {
    const it = sheet.item ?? sheet.document;
    if ( !can(it) || buttons.some(b => b.class === "wlib-use") ) return;
    buttons.unshift({label: "Use", class: "wlib-use", icon: "fa-solid fa-hand-sparkles", onclick: () => openUse(it)});
  });
}

export const useApi = () => ({open: openUse, run, read, abilities: abilitiesOfItem, rules: U, lineOf: lineOfActor});
