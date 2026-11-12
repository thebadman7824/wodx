/**
 * WoDX Sheets 0.8.0: the anachronism check in Foundry. When the clock jumps a year or more, or the era changes, the
 * Storyteller gets one card naming each player character's possessions that are out of their time now, with a
 * button to keep each one (an heirloom, a relic, a traveller's kit) so it is not raised again and the sheet stops
 * warning about it. World setting "Anachronism check": automatic (on, except in the Live world), on, or off.
 * The rules are in anachronism-rules.mjs.
 *
 * 0.14.0: the card also reads the maps. With WoDX Interactables on, every scene's vehicles, telephones, radios,
 * sprinklers, electric lights, live wires, keypads and the goods inside containers are read against the new year,
 * each with Keep it and Show me. A kept thing works in any year. "Out of their time" in the Storyteller's hand lists
 * everything out of its time now, whether or not the clock just moved.
 */
import * as AR from "./anachronism-rules.mjs";
import {MOD} from "./extras-rules.mjs";
import {look, loadGoods} from "./extras.mjs";

const LIVE_WORLDS = ["rothenstein-live"];
const isLive = () => LIVE_WORLDS.includes(game.world?.id) || !!game.world?.flags?.wodx?.liveWorld;
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const chron = () => game.modules.get("wodx-chronicle")?.api;
const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const now = () => {
  let era = null, year = 0;
  try { era = chron()?.eras?.activeEra?.()?.profile?.id ?? null; } catch (e) { /* Chronicle off */ }
  try { year = Number(chron()?.eras?.currentYear?.()) || 0; } catch (e) { /* Chronicle off */ }
  return {era, year};
};
const on = () => { try { return AR.isOn(game.settings.get(MOD, "anachronism"), isLive()); } catch (e) { return false; } };
const skipping = () => { try { return !!chron()?.isSkipping?.(); } catch (e) { return false; } };

/** The player characters the check reads. */
const characters = () => (game.actors?.contents ?? []).filter(a => a.hasPlayerOwner && a.type !== "Group");

/** What a jump from `before` to `after` puts out of its time, character by character. */
export async function scan(before, after = now(), actors = characters()) {
  await loadGoods();
  return actors.map(a => ({actor: a, items: AR.newlyOut([...a.items], look, before, after)})).filter(r => r.items.length);
}

/* -------------------------------------------------------------- */
/*  Things on the maps (0.14.0)                                    */
/* -------------------------------------------------------------- */

const IX = "wodx-interactables";
const ix = () => (game.modules.get(IX)?.active ? game.modules.get(IX)?.api : null);
const all = c => c?.contents ?? [...(c?.values?.() ?? [])];
/** Every wall and tile with WoDX Interactables settings, on every scene, as the rules read them. */
export function mapThings(scenes = all(game.scenes)) {
  const dated = ix()?.rules?.datedParts;
  if ( typeof dated !== "function" ) return [];
  const out = [];
  for ( const scene of scenes ) {
    const one = (doc, wall) => {
      const f = doc.flags?.[IX];
      if ( !f || (wall && !(doc.door > 0)) ) return;
      const d = dated(f, {wall});
      if ( !d.parts.length && !d.goods.length ) return;
      const own = doc.flags?.[MOD] ?? {};
      out.push({scene: scene.id, sceneName: scene.name ?? "", id: doc.id, wall, name: d.name, parts: d.parts, goods: d.goods,
        kept: !!own.keepOutOfEra, keptGoods: Array.isArray(own.keptGoods) ? own.keptGoods : []});
    };
    for ( const w of all(scene.walls) ) one(w, true);
    for ( const t of all(scene.tiles) ) one(t, false);
  }
  return out;
}
/** A reader for the lines inside containers: a UUID or a name from Gear by era, a world item, or an everyday good. */
async function lineLooker() {
  await loadGoods();
  const byUuid = new Map(), byName = new Map();
  try {
    for ( const e of await ix()?.fill?.index?.() ?? [] ) { byUuid.set(e.uuid, e); byName.set(String(e.name ?? "").toLowerCase(), e); }
  } catch (e) { /* Gear by era not installed */ }
  return line => {
    const ref = AR.lineOf(line).ref;
    const it = byUuid.get(ref) ?? game.items?.getName?.(ref) ?? byName.get(ref.toLowerCase()) ?? (/^(Compendium|Item|Actor|Scene)\./.test(ref) ? null : {name: ref, flags: {}});
    if ( !it?.name ) return null;
    return {name: it.name, eraInfo: look({name: it.name, flags: it.flags ?? {}}).eraInfo};
  };
}
/** What a jump from `before` to `after` puts out of its time on the maps. An empty `before`: everything out now. */
export async function scanMaps(before, after = now(), scenes = undefined) {
  const things = mapThings(scenes);
  if ( !things.length ) return [];
  return AR.mapNewlyOut(things, things.some(t => t.goods.length) ? await lineLooker() : () => null, before, after);
}
const docOf = (sceneId, id, wall) => { const sc = game.scenes?.get(sceneId); return (wall ? sc?.walls : sc?.tiles)?.get?.(id) ?? null; };
/**
 * Keep a thing on a map out of its time: the thing itself, or one line inside a container (key "goods:<line>").
 * on: false takes the keeping back, for a button pressed by mistake.
 */
export async function keepThing(sceneId, id, wall, key = "", on = true) {
  const doc = docOf(sceneId, id, wall);
  if ( !doc || !game.user.isGM ) return false;
  if ( String(key).startsWith("goods:") ) {
    const line = String(key).slice(6), kept = Array.isArray(doc.flags?.[MOD]?.keptGoods) ? doc.flags[MOD].keptGoods : [];
    if ( on !== kept.includes(line) ) await doc.update({[`flags.${MOD}.keptGoods`]: on ? [...kept, line] : kept.filter(k => k !== line)});
  }
  else await doc.update({[`flags.${MOD}.keepOutOfEra`]: !!on});
  return true;
}
/** Open the scene and move the view to a thing on it. */
export async function showThing(sceneId, id, wall) {
  const doc = docOf(sceneId, id, wall), scene = game.scenes?.get(sceneId);
  if ( !doc || !scene ) return false;
  if ( canvas?.scene?.id !== scene.id ) await scene.view();
  const c = doc.c, x = wall ? (c[0] + c[2]) / 2 : doc.x + (doc.width ?? 0) / 2, y = wall ? (c[1] + c[3]) / 2 : doc.y + (doc.height ?? 0) / 2;
  try { await canvas.animatePan({x, y, duration: 400}); } catch (e) { /* no canvas */ }
  return true;
}
/** The card's part for the maps: a list by scene, cut at MAP_ROWS. */
function mapRows(found) {
  if ( !found.length ) return "";
  const shown = found.slice(0, AR.MAP_ROWS), by = new Map();
  for ( const r of shown ) { if ( !by.has(r.scene) ) by.set(r.scene, {name: r.sceneName, rows: []}); by.get(r.scene).rows.push(r); }
  const ref = r => esc(JSON.stringify([r.scene, r.id, r.wall ? 1 : 0, r.key]));
  const list = [...by.values()].map(g => `<li><b>${esc(g.name)}</b><ul>${g.rows.map(r =>
    `<li>${esc(r.name)}: ${esc(r.note)} <button type="button" data-wodx-keep-map="${ref(r)}"><i class="fa-solid fa-box-archive"></i> Keep it</button> <button type="button" data-wodx-show-map="${ref(r)}"><i class="fa-solid fa-location-crosshairs"></i> Show me</button></li>`).join("")}</ul></li>`).join("");
  const more = found.length - shown.length;
  return `<h4>On the maps</h4><p>A kept thing works as it stands; anything else is yours to change or take off the map.</p><ul>${list}</ul>${more > 0 ? `<p>And ${more} more on the maps: run the check again after these are dealt with.</p>` : ""}`;
}

/**
 * Post the card for the Storyteller. Returns the message, or null when nothing is out of its time.
 * opts.maps: false leaves the maps out, an array gives the map rows to show; opts.all: the card lists everything out
 * of its time now.
 */
export async function report(before, after = now(), actors = characters(), opts = {}) {
  const found = await scan(before, after, actors);
  const maps = Array.isArray(opts.maps) ? opts.maps : opts.maps === false ? [] : await scanMaps(before, after);
  if ( !found.length && !maps.length ) return null;
  const rows = found.map(({actor, items}) => `<li><b>${esc(actor.name)}</b><ul>${items.map(i =>
    `<li>${esc(i.name)}: ${esc(i.note)} <button type="button" data-wodx-keep="${esc(actor.id)}.${esc(i.id)}"><i class="fa-solid fa-box-archive"></i> Keep it</button></li>`).join("")}</ul></li>`).join("");
  const span = before?.year && after?.year ? `from ${before.year} to ${after.year}` : "into another age";
  const lead = opts.all ? `Everything that does not belong to ${esc(after.year || "this age")}.` : `The clock moved ${esc(span)}. These things do not belong to the year now.`;
  const content = `<div class="wodx-anachronism"><h3><i class="fa-solid fa-hourglass-half"></i> Out of their time</h3>
    <p>${lead}${found.length ? " Keep the ones the characters still have (an heirloom, a relic, a traveller's kit); the rest are the players' to account for." : ""}</p>
    ${found.length ? `<ul>${rows}</ul>` : ""}${mapRows(maps)}</div>`;
  return ChatMessage.create({content, whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id), speaker: {alias: "WoDX Sheets"},
    flags: {[MOD]: {anachronism: {before, after}}}});
}

/** Mark an item as kept out of its time. */
export async function keep(actorId, itemId) {
  const item = game.actors?.get(actorId)?.items?.get(itemId);
  if ( !item || !game.user.isGM ) return false;
  await item.update({[`flags.${MOD}.keepOutOfEra`]: true});
  return true;
}

/** Everything out of its time now, on the sheets and the maps, whether or not the clock moved. */
export async function everything() {
  if ( !game.user?.isGM ) return null;
  const m = await report({}, now(), characters(), {all: true});
  if ( !m ) ui.notifications?.info("Nothing on the sheets or the maps is out of its time.");
  return m;
}

let timer = null;
/** Compare the clock with the last check and report what the jump changed. */
export async function check() {
  if ( !isActiveGM() || !on() || skipping() ) return null;
  const after = now();
  if ( !after.year && !after.era ) return null;
  const before = game.settings.get(MOD, "anachronismAt") ?? null;
  if ( !before?.year && !before?.era ) { await game.settings.set(MOD, "anachronismAt", after); return null; }
  if ( !AR.jumped(before, after) ) return null;
  await game.settings.set(MOD, "anachronismAt", after);
  return report(before, after);
}
const soon = () => { clearTimeout(timer); timer = setTimeout(() => check().catch(e => console.error("WoDX Sheets | anachronism", e)), 1500); };

export function setup() {
  game.settings.register(MOD, "anachronism", {
    name: "Anachronism check", hint: "When the clock jumps a year or more, or the era changes, tell the Storyteller which possessions of the player characters, and which things on the maps, are out of their time. Automatic: on, except in the Live world.",
    scope: "world", config: true, type: String, default: "auto", choices: {auto: "Automatic", on: "On", off: "Off"}
  });
  game.settings.register(MOD, "anachronismAt", {scope: "world", config: false, type: Object, default: {}});
  Hooks.once("ready", () => {
    if ( isActiveGM() && on() ) soon();
    if ( !game.user?.isGM ) return;
    // 0.14.0: "Out of their time" in the Storyteller's hand, when WoDX Storyteller is on
    const add = () => {
      const hand = game.wodx?.storyteller?.hand;
      if ( !hand?.addTool ) return false;
      hand.addTool({key: "anachronism", label: "Out of their time", icon: "fa-hourglass-half", run: () => everything().catch(e => console.error("WoDX Sheets | anachronism", e))});
      return true;
    };
    if ( !add() ) setTimeout(add, 2000);
  });
  Hooks.on("updateWorldTime", () => { if ( game.user?.isGM ) soon(); });
  Hooks.on("wodxSkipEnd", () => { if ( game.user?.isGM ) soon(); });
  Hooks.on("renderChatMessageHTML", (msg, el) => {
    if ( !msg.flags?.[MOD]?.anachronism || !game.user.isGM ) return;
    for ( const b of el.querySelectorAll?.("[data-wodx-keep]") ?? [] ) b.addEventListener("click", async () => {
      const [a, i] = b.dataset.wodxKeep.split(".");
      if ( await keep(a, i) ) { b.disabled = true; b.textContent = "Kept"; }
    });
    const ref = b => { try { return JSON.parse(b.dataset.wodxKeepMap ?? b.dataset.wodxShowMap); } catch (e) { return []; } };
    for ( const b of el.querySelectorAll?.("[data-wodx-keep-map]") ?? [] ) b.addEventListener("click", async () => {
      const [sc, id, wall, key] = ref(b), on = b.dataset.kept !== "1";
      if ( await keepThing(sc, id, !!wall, key, on) ) { b.dataset.kept = on ? "1" : ""; b.textContent = on ? "Kept (undo)" : "Keep it"; }
    });
    for ( const b of el.querySelectorAll?.("[data-wodx-show-map]") ?? [] ) b.addEventListener("click", async () => {
      const [sc, id, wall] = ref(b);
      if ( !(await showThing(sc, id, !!wall)) ) ui.notifications?.warn("That thing is no longer on the map.");
    });
  });
}
