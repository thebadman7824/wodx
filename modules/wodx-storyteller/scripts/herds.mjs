/**
 * WoDX Storyteller (B3570-B3575): herd pools by district. Rules in herd-rules.mjs.
 *
 * A district is a scene with a hunting ground (Upkeep, Hunting grounds). Its pool of vessels for the month comes from
 * the town's people (Towns over time) and the kind of district, split into the classes of the age and land. Each
 * feeding there (WoDX Actions' Feed on a vessel, or a Hunt that catches prey) takes one; the pool fills again each
 * month. Past the pool the district thins: the Storyteller gets a warning card, Hunt is harder there (added to the
 * heat difficulty that Hunt already reads), and at the worst stages the hunting ground grows hot, a rumour starts and
 * the region's hunters stir, through the hooks those systems already have.
 * Stored on the scene: flags.wodx-storyteller.herd = {month, fed: {class: n}, feeds, stage, log}.
 * World setting herdPools (on or off).
 */
import * as R from "./herd-rules.mjs";
import * as U from "./upkeep-rules.mjs";
import * as Towns from "./towns.mjs";
import * as Hunters from "./hunters.mjs";
import {MOD, SOCKET, esc, chron, isActiveGM, gmIds, setting} from "./core.mjs";
import {faithFor} from "../../wodx-chronicle/scripts/faith-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const now = () => game.time?.worldTime ?? 0;
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 1197; } catch (e) { return 1197; } };
const held = () => { try { return !!chron()?.isHeld?.(); } catch (e) { return false; } };
const all = c => (c ? [...(c.contents ?? c)] : []);
export const on = () => setting("herdPools") !== false;

export function registerHerdSettings() {
  game.settings.register(MOD, "herdPools", {name: "Herd pools by district (house rule)", scope: "world", config: true, type: Boolean, default: true,
    hint: "Each district with a hunting ground holds a month's pool of vessels by class, sized from its town's people. Feeding past it makes hunting there harder and brings warnings, sickness, rumours and the hunters. Off: districts never run dry."});
}

const sceneName = s => s?.navName || s?.name || "a district";
const herdOf = scene => R.normHerd(scene?.flags?.[MOD]?.herd ?? {});

/** The district's pool for this month: the town's people, the kind of district, the age and the land's faith. */
export function poolOf(scene) {
  const area = U.normHunt(scene?.flags?.[MOD]?.hunt ?? {}).area || "market", year = yearNow();
  let people = null, faith = "western";
  try { people = Towns.ofScene(scene)?.people ?? null; } catch (e) { people = null; }
  try { faith = faithFor(Hunters.regionAt(scene), year) ?? "western"; } catch (e) { faith = "western"; }
  return R.poolFor({people, area, year, faith});
}

/** The district now: {stage, feeds, total, left, classes, log}. */
export function hereOf(scene = canvas?.scene) {
  if ( !scene ) return null;
  return R.view(herdOf(scene), poolOf(scene), now());
}

/** The extra hunting difficulty the herd adds (0 when off). For upkeep.mjs huntHere. */
export function huntDiff(scene) {
  if ( !on() || !scene ) return 0;
  try { return R.huntDiff(herdOf(scene), poolOf(scene), now()); } catch (e) { return 0; }
}

/** The vessel's class, from WoDX NPC passer-by tags or WoDX Actions vessel tags. */
function classOfVessel(uuid) {
  try {
    const a = uuid ? fromUuidSync(uuid) : null;
    const tags = [...(a?.token?.flags?.["wodx-npc"]?.passerby?.tags ?? []), ...(a?.flags?.["wodx-actions"]?.vesselTags ?? [])];
    return R.classOfTags(tags, yearNow());
  } catch (e) { return null; }
}
function sceneOfActor(uuid) {
  try {
    const a = uuid ? fromUuidSync(uuid) : null;
    return a?.token?.parent ?? a?.getActiveTokens?.()[0]?.scene ?? null;
  } catch (e) { return null; }
}

/**
 * One feeding in a district (the active Storyteller). cls: the vessel's class key, "animal" to skip.
 * Returns the rules' result, or null when nothing was counted.
 */
export async function onFeeding({scene = null, cls = null, who = ""} = {}) {
  if ( !isActiveGM() || !on() || held() || !scene || cls === "animal" ) return null;
  const pool = poolOf(scene), r = R.feed(herdOf(scene), pool, {t: now(), cls, who});
  await scene.update({[`flags.${MOD}.herd`]: r.herd});
  if ( r.crossed ) await crossedCard(scene, r, pool, who);
  return r;
}

async function crossedCard(scene, r, pool, who = "") {
  const place = sceneName(scene), harm = R.harmFor(r.crossed.key), year = yearNow(), lines = [];
  if ( harm.deaths ) lines.push(`${harm.deaths === 1 ? "A vessel" : `${harm.deaths} vessels`} here die${harm.deaths === 1 ? "s" : ""} of it this month: the Storyteller says who.`);
  const up = game.modules.get(MOD)?.api?.upkeep;
  if ( harm.heat ) { try { await up?.addHeat?.(scene, harm.heat, {who: who || null}); lines.push("The hunting ground grows hotter."); } catch (e) { console.error(`${MOD} | herd heat`, e); } }
  if ( harm.rumour ) { try { await game.modules.get(MOD)?.api?.rumours?.start?.({text: R.rumourFor(r.crossed.key, place, year), big: r.crossed.key === "stripped"}); lines.push("A rumour starts in the town."); } catch (e) { console.error(`${MOD} | herd rumour`, e); } }
  if ( harm.hunters ) { try { await Hunters.add(Hunters.regionAt(scene), "response", {why: `deaths no one can explain at ${place}`}); lines.push("The region's hunters hear of it."); } catch (e) { console.error(`${MOD} | herd hunters`, e); } }
  await ChatMessage.create({speaker: {alias: "Herds"}, whisper: gmIds(), content: `<div class="wodx-card wst-herd"><h3>${esc(place)}: ${esc(r.crossed.name)}</h3>
    <p>${esc(`${r.herd.feeds} feedings this month against a herd that bears ${pool.total}.`)} ${esc(r.crossed.note)}</p>
    ${lines.length ? `<ul>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>` : ""}
    <p class="wodx-quiet">The herd fills again at the start of next month.</p></div>`});
  Hooks.callAll("wodxHerdStage", {sceneId: scene.id, stage: r.crossed.key, before: r.before.key, feeds: r.herd.feeds, total: pool.total});
}

/** The Storyteller's window: every district, its pool, who has been fed on and the stage. */
export async function herdsDialog() {
  if ( !game.user.isGM ) return;
  const scenes = all(game.scenes).filter(s => s.flags?.[MOD]?.hunt?.area || s.flags?.[MOD]?.herd?.feeds);
  const rows = scenes.map(s => {
    const v = hereOf(s);
    return `<tr><td>${esc(sceneName(s))}</td><td>${esc(v.stage.name)}</td><td>${v.feeds}/${v.total}</td>
      <td>${v.classes.map(c => `${esc(c.label)} ${c.fed}/${c.n}`).join("; ")}</td>
      <td><button type="button" data-action="reset" data-scene="${s.id}">Fill again</button></td></tr>`;
  }).join("");
  const content = `<p>A month's herd in each district with a hunting ground, sized from its town. Feeding past it thins the district (house rule).</p>
    ${scenes.length > 8 ? searchBox(".wst-herd-table tbody tr", "Search districts…", "Search districts") : ""}
    ${rows ? `<table class="wst-herd-table"><thead><tr><th>District</th><th>Stage</th><th>Fed</th><th>By class</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
    : "<p><i>No district has a hunting ground set yet (Upkeep, Hunting grounds).</i></p>"}`;
  await foundry.applications.api.DialogV2.wait({rejectClose: false, window: {title: "Herds by district"}, classes: ["wodx-dialog"], position: {width: 720}, content,
    buttons: [{action: "close", label: "Close", default: true}],
    render: (ev, dlg) => {
      const el = dlg?.element ?? ev?.target?.element;
      for ( const b of el?.querySelectorAll?.("[data-action=reset]") ?? [] ) b.addEventListener("click", async () => {
        const s = game.scenes.get(b.dataset.scene);
        if ( s ) { await s.update({[`flags.${MOD}.herd`]: R.blankHerd()}); b.disabled = true; b.textContent = "Filled"; }
      });
    }});
}

/** WoDX Actions fed a vampire on a vessel (wodxFed); a player's feeding comes by socket. */
export function onFed(p) {
  if ( !p?.vessel?.uuid ) return;
  if ( !isActiveGM() ) {
    if ( !game.user.isGM ) game.socket.emit(SOCKET, {type: "req.fed", payload: {userId: game.user.id, by: p.by ?? null, vessel: p.vessel}});
    return;
  }
  feedFrom(p).catch(e => console.error(`${MOD} | herds`, e));
}
export async function feedFrom(p, {userId = null} = {}) {
  if ( userId ) {
    const user = game.users.get(userId), by = p?.by?.uuid ? fromUuidSync(p.by.uuid) : null;
    if ( !(user && by?.testUserPermission?.(user, "OWNER")) ) return null;
  }
  const scene = sceneOfActor(p?.vessel?.uuid) ?? sceneOfActor(p?.by?.uuid) ?? canvas?.scene;
  return onFeeding({scene, cls: classOfVessel(p?.vessel?.uuid), who: p?.by?.name ?? ""});
}

export function setupHerds() { Hooks.on("wodxFed", onFed); }

export const api = () => ({open: herdsDialog, of: hereOf, pool: poolOf, huntDiff, feed: onFeeding, on, rules: R});
