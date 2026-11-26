/**
 * Carry to a new chronicle (Chronicle Packs Desk c2): the Storyteller's window in the finished world, and the read-in
 * that Start a chronicle runs in the fresh one. The rules are in carry-rules.mjs.
 *
 *   Write   tick the characters, people and items to keep; the carry file goes to Data/wodx-carry/ and is also
 *           offered as a download. A card lists what stayed behind.
 *   Read    Start a chronicle's "Characters from an earlier chronicle" box names the file; each document is made in
 *           the folder "Carried across", once (a second read of the same file makes no copies).
 */
import * as C from "../../wodx-rules/storyteller/carry-rules.mjs";
import {MOD, esc, isPC} from "./core.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const DIR = "wodx-carry";
let cal = null;
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];
const chron = () => game.modules.get("wodx-chronicle")?.api;
const owners = doc => all(game.users).filter(u => !u.isGM && doc.testUserPermission?.(u, "OWNER")).map(u => u.name);
/** Faction ties in this world, named, so the card can say they stayed behind. */
function factionTies(actor) {
  let st = null;
  try { st = game.settings.get("wodx-npc", "factions"); } catch (e) { return []; }
  return (st?.factions ?? []).filter(f => (f.members ?? []).includes(actor.id) || f.leader === actor.id)
    .map(f => `${f.leader === actor.id ? "leader" : "member"} of ${f.name}`);
}

/** Where the finished chronicle stands, for the note on each sheet: the one in play, else the last one closed. */
function fromNow() {
  const C2 = chron(), closed = C2?.pod?.saga?.closed?.() ?? {}, cur = C2?.chronicle?.current?.() ?? null;
  const last = cur ? null : Object.values(closed).sort((a, b) => (b.at ?? 0) - (a.at ?? 0))[0] ?? null;
  const pack = cur ?? (last ? C2?.chronicle?.list?.().find(p => p.id === last.id) ?? null : null);
  let pod = {};
  try { pod = game.settings.get("wodx-chronicle", "podState") ?? {}; } catch (e) { pod = {}; }
  const saga = (last ? pod.closed?.[last.id]?.saga : pod.saga) ?? {};
  const ending = saga.endings?.[pack?.manifest?.firstBook ?? ""] ?? "";
  const books = pack?.saga?.SAGA?.books ?? [];
  const bookKey = last?.book || books.find(b => saga.books?.[b.key] === "running")?.key || "";
  let date = last?.date ?? "";
  if ( !date ) { try { date = cal?.describeTime?.(game.time.worldTime)?.dateLabel ?? ""; } catch (e) { date = ""; } }
  return {world: game.world.id, chronicle: pack?.id ?? "", title: pack?.title ?? game.world.title, date,
    book: books.find(b => b.key === bookKey)?.title ?? "", ending: pack?.saga?.SAGA_ENDINGS?.[ending]?.label ?? ""};
}

async function upload(name, data) {
  const FP = foundry.applications.apps.FilePicker.implementation;
  try { await FP.createDirectory("data", DIR); } catch (e) { /* there already */ }
  const file = new File([JSON.stringify(data)], name, {type: "application/json"});
  await FP.upload("data", DIR, file, {}, {notify: false});
  return `${DIR}/${name}`;
}

/** The window: tick what to keep, then write the carry file. */
export async function openCarry() {
  if ( !game.user.isGM ) return null;
  cal ??= await import("../../wodx-chronicle/scripts/calendar.mjs").catch(() => null);
  const actors = all(game.actors).sort((a, b) => Number(isPC(b)) - Number(isPC(a)) || a.name.localeCompare(b.name));
  const items = all(game.items).sort((a, b) => a.name.localeCompare(b.name));
  const row = (kind, d, on) => `<label class="wstory-check" data-search-item><input type="checkbox" name="${kind}-${d.id}"${on ? " checked" : ""}> ${esc(d.name)}${kind === "Actor" && isPC(d) ? " (player character)" : ""}</label>`;
  const content = `<p>Tick who and what comes along to a new chronicle. The carry file holds their sheets whole. In the new world, name the file
    in Start a chronicle and they are made there, each with a note of where it came from.</p>
    <fieldset><legend>Characters and people</legend>${actors.length > 8 ? searchBox(".wstory-carry-a", "Find someone…", "Search characters") : ""}
      <div class="wstory-carry-a" style="max-height:260px;overflow-y:auto">${actors.map(a => row("Actor", a, isPC(a))).join("") || "<p>No characters in this world.</p>"}</div></fieldset>
    <fieldset><legend>Items</legend>${items.length > 8 ? searchBox(".wstory-carry-i", "Find an item…", "Search items") : ""}
      <div class="wstory-carry-i" style="max-height:160px;overflow-y:auto">${items.map(i => row("Item", i, false)).join("") || "<p>No loose items in this world.</p>"}</div></fieldset>
    <p class="wodx-quiet">Items a character holds come with that character. What only made sense here (the chronicle's mark, opening goals, faction seats) stays behind and is listed on the card.</p>`;
  const picked = await foundry.applications.api.DialogV2.wait({classes: ["wodx-dialog", "wstory-dialog"], window: {title: "Carry to a new chronicle", icon: "fa-solid fa-suitcase"},
    position: {width: 560}, content, rejectClose: false,
    buttons: [{action: "go", label: "Write the carry file", default: true, callback: (ev, b) => new foundry.applications.ux.FormDataExtended(b.form).object},
      {action: "cancel", label: "Not now"}]});
  if ( !picked || picked === "cancel" ) return null;
  const ids = kind => Object.entries(picked).filter(([k, v]) => v && k.startsWith(`${kind}-`)).map(([k]) => k.slice(kind.length + 1));
  const picks = {
    Actor: ids("Actor").map(id => game.actors.get(id)).filter(Boolean).map(a => ({doc: a.toObject(), owners: owners(a), ties: factionTies(a)})),
    Item: ids("Item").map(id => game.items.get(id)).filter(Boolean).map(i => ({doc: i.toObject()}))
  };
  if ( !picks.Actor.length && !picks.Item.length ) { ui.notifications.warn("Nothing was ticked, so no carry file was written."); return null; }
  return writeCarry(picks);
}

/** Write the carry file for picks ({Actor: [{doc, owners, ties}], Item: [{doc}]}). Returns {path, file}. */
export async function writeCarry(picks, {download = true} = {}) {
  const made = Date.now(), file = C.bundle(picks, fromNow(), {made}), name = C.fileName(game.world.id, made);
  let path = "";
  try { path = await upload(name, file); } catch (e) { console.warn(`${MOD} | carry file upload`, e); }
  if ( download ) { try { foundry.utils.saveDataToFile(JSON.stringify(file, null, 1), "application/json", name); } catch (e) { /* no download */ } }
  const n = file.docs.Actor.length + file.docs.Item.length;
  await ChatMessage.create({speaker: {alias: "Carry to a new chronicle"}, whisper: game.users.filter(u => u.isGM).map(u => u.id),
    content: `<div class="wodx-card"><h3><i class="fa-solid fa-suitcase"></i> The carry file is written</h3>
      <p>${n} ${n === 1 ? "thing" : "things"} to bring across${path ? `, in <code>${esc(path)}</code>` : " (the download only; the upload failed)"}. In the new world, open Start a chronicle and name this file.</p>
      ${file.dropped.length ? `<p>Stayed behind:</p><ul>${file.dropped.map(d => `<li>${esc(d.name)}: ${esc(d.what.join("; "))}</li>`).join("")}</ul>` : ""}</div>`});
  return {path, file};
}

/** Read a carry file into this world (Start a chronicle). path is under Data. Returns {made, kept} or {error}. */
export async function readCarry(path) {
  if ( !game.user.isGM || !path ) return {error: "No carry file named."};
  let file;
  try {
    const res = await fetch(`/${String(path).replace(/^\/+/, "")}?${Date.now()}`);
    if ( !res.ok ) return {error: `The carry file ${path} was not found.`};
    file = await res.json();
  } catch (e) { return {error: `The carry file ${path} could not be read.`}; }
  const bad = C.check(file);
  if ( bad.length ) return {error: bad.join(" ")};
  const have = [...all(game.actors), ...all(game.items)].map(d => d.flags?.[MOD]?.carried).filter(c => c?.sourceId).map(c => ({sourceId: c.sourceId, world: c.world}));
  const plan = C.importPlan(file, {have, players: all(game.users).filter(u => !u.isGM).map(u => ({id: u.id, name: u.name}))});
  const made = [];
  for ( const kind of C.KINDS ) {
    const list = plan.make[kind];
    if ( !list.length ) continue;
    let folder = all(game.folders).find(f => f.type === kind && f.name === "Carried across");
    folder ??= await Folder.create({name: "Carried across", type: kind});
    const cls = foundry.utils.getDocumentClass(kind);
    const docs = await cls.createDocuments(list.map(d => ({...d, folder: folder.id})));
    made.push(...docs.map(d => d.name));
  }
  if ( made.length ) await ChatMessage.create({speaker: {alias: "Carry to a new chronicle"}, whisper: game.users.filter(u => u.isGM).map(u => u.id),
    content: `<div class="wodx-card"><h3><i class="fa-solid fa-suitcase"></i> Brought across from ${esc(file.from?.title ?? "an earlier chronicle")}</h3>
      <p>${made.map(esc).join(", ")}.</p>${plan.kept ? `<p class="wodx-quiet">${plan.kept} were here already and were left as they are.</p>` : ""}</div>`});
  return {made, kept: plan.kept};
}
