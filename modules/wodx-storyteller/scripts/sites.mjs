/**
 * WoDX Storyteller (B3580-B3586): holy ground shared by several claims. Rules in site-rules.mjs.
 *
 * A site ties places of the places of power register (a caern, a Node, a freehold, a chantry) and an Elysium to one
 * strength. The register's acts ask the site first: meditating at the Node, gathering Tass, dreaming by the balefire
 * and opening the caern take no more than the site holds and half when it is weak; what they take lowers it. A moot
 * fills it a little. Every holder of another role hears of each draw (a whispered card to the players of those
 * characters and the Storyteller). Draws while the site is weak build a quarrel between the claims; at three, the
 * Storyteller's approval queue offers it (approving starts a rumour and logs it, and the claims can treat or fight).
 * Hidden world state wodx-storyteller.siteState = {v, list}. World setting holyGround (on or off).
 * Hooks out: wodxSiteDraw {site, role, points, by}, wodxSiteQuarrel {site, roles, claims}.
 */
import * as S from "./site-rules.mjs";
import * as P from "./power-rules.mjs";
import {MOD, esc, chron, isActiveGM, gmIds, setting, log} from "./core.mjs";

export const T_QUARREL = `${MOD}.siteQuarrel`;
const now = () => game.time?.worldTime ?? 0;
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const all = c => (c ? [...(c.contents ?? c)] : []);
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 2000; } catch (e) { return 2000; } };
const opt = (v, t, sel = false) => `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(t)}</option>`;
export const on = () => setting("holyGround") !== false;
export const state = () => S.normState(setting("siteState"));
async function save(st) { if ( game.user.isGM ) await game.settings.set(MOD, "siteState", S.normState(st)); }
const powerList = () => { try { return P.normState(setting("powerState")).list; } catch (e) { return []; } };

export function registerSiteSettings() {
  game.settings.register(MOD, "holyGround", {name: "Holy ground shared by several claims (house rule)", scope: "world", config: true, type: Boolean, default: true,
    hint: "A place that is a caern, a Node, a freehold and an Elysium at once shares one strength. Drawing Gnosis, Quintessence or Glamour lowers it; below half every role gives half. Each holder is told when another draws. Off: each place draws on its own."});
  game.settings.register(MOD, "siteState", {scope: "world", config: false, type: Object, default: S.blankState()});
}

const driftOf = sceneId => {
  try { const sc = sceneId ? game.scenes.get(sceneId) : null; return num(game.modules.get("wodx-otherworlds")?.api?.drift?.of?.(sc)?.value); } catch (e) { return 0; }
};
/** Everything the rules need about a site now: {site, places, roles, level, max, year}. */
export function contextOf(site) {
  const s = S.normSite(site), list = powerList(), places = s.places.map(id => list.find(p => p.id === id)).filter(Boolean);
  const level = S.levelOf(places), year = yearNow(), drift = driftOf(s.scene);
  const r = S.accrue(s, now(), {level, year, drift});
  return {site: r.site, places, roles: S.rolesOf(r.site, places), level, max: r.max, year};
}
export const ofPlace = placeId => (on() ? S.siteOfPlace(state(), placeId) : null);
export function view(siteId) {
  const s = S.siteById(state(), siteId);
  if ( !s ) return null;
  const c = contextOf(s);
  return {...c, state: S.stateOf(c.site.strength, c.max), claims: S.claimsOf(c.site, c.roles), text: S.describe(c.site, c.max, c.roles, c.year)};
}

/**
 * Before a draw at a place: how much the site lets through. Returns null when the place is on no site (or the rule
 * is off), else {take, factor, state, site}.
 */
export function gate(placeId, want) {
  const s = ofPlace(placeId);
  if ( !s ) return null;
  const c = contextOf(s), a = S.allow(c.site, c.max, want);
  return {...a, site: c.site.id, name: c.site.name};
}

async function putSite(site) {
  const st = state(), i = st.list.findIndex(x => x.id === site.id);
  if ( i < 0 ) st.list.push(S.normSite(site)); else st.list[i] = S.normSite(site);
  await save(st);
}

/** Players who own any of these characters, and the Storyteller. */
function usersFor(actorIds = []) {
  const ids = new Set(gmIds());
  for ( const id of actorIds ) {
    const a = game.actors.get(id);
    for ( const u of all(game.users) ) if ( !u.isGM && a?.testUserPermission?.(u, "OWNER") ) ids.add(u.id);
  }
  return [...ids];
}

/** After a draw at a place: lower the site, tell the other holders, and offer a quarrel when one is due. */
export async function onDraw(placeId, role, points, {by = null} = {}) {
  if ( !isActiveGM() || !num(points) ) return null;
  const s = ofPlace(placeId);
  if ( !s ) return null;
  const c = contextOf(s), who = by?.name ?? "";
  const r = S.draw(c.site, c.max, {role, points, t: now(), who, rolesHere: c.roles.map(x => x.role)});
  await putSite(r.site);
  const tell = S.toTell(r.site, c.roles, role).filter(id => id !== by?.id);
  const line = `${who || "Someone"} drew ${num(points)} ${S.DRAWS[role] || "power"} at ${c.site.name} as its ${S.ROLES[role]}. The site holds ${r.site.strength} of ${c.max}.`;
  await ChatMessage.create({speaker: {alias: "Holy ground"}, whisper: usersFor(tell),
    content: `<div class="wodx-card wst-site"><h3>${esc(c.site.name)}</h3><p>${esc(line)}</p>${r.crossed ? `<p><b>${esc(r.crossed.name)}.</b> ${esc(r.crossed.note)}</p>` : ""}</div>`});
  Hooks.callAll("wodxSiteDraw", {site: c.site.id, role, points: num(points), by: by?.id ?? null, strength: r.site.strength, max: c.max});
  for ( const k of r.quarrel ) await offerQuarrel(r.site, k, c);
  return r;
}

/** A moot at a caern on the site fills it a little. */
export async function onMoot(placeId, given) {
  if ( !isActiveGM() ) return null;
  const s = ofPlace(placeId);
  if ( !s ) return null;
  const c = contextOf(s), r = S.restore(c.site, c.max, S.mootGift(given), now(), "The moot");
  await putSite(r.site);
  return r;
}

async function offerQuarrel(site, key, c) {
  const claims = S.claimsOf(site, c.roles), roles = S.pairRoles(key);
  const sides = roles.map(r => claims.find(x => x.role === r)?.faction || `the ${S.ROLES[r]}'s holders`);
  await chron()?.approvals?.propose?.({type: T_QUARREL, key: `site:${site.id}:${key}`, title: `A quarrel over ${site.name}: ${sides.join(" and ")}`,
    detail: `Both have drawn on the site while it was weak. Approving starts a rumour and logs it; the two can then make a treaty or fight for the ground.`,
    data: {siteId: site.id, key, sides, roles}});
  Hooks.callAll("wodxSiteQuarrel", {site: site.id, roles, claims});
}
async function approveQuarrel(entry) {
  const d = entry?.data ?? {}, s = S.siteById(state(), d.siteId);
  if ( !s ) return;
  await putSite(S.logLine(S.settle(s, d.key), now(), `A quarrel between ${(d.sides ?? []).join(" and ")}.`));
  try { await game.modules.get(MOD)?.api?.rumours?.start?.({text: `${(d.sides ?? []).join(" and ")} are at odds over ${s.name}.`}); } catch (e) { console.error(`${MOD} | site rumour`, e); }
  await log({kind: "site", attention: "Holy ground in dispute", place: s.scene, text: `${(d.sides ?? []).join(" and ")} quarrel over ${s.name}: a treaty or a fight for it.`});
}

/* ---------------- Windows ---------------- */

export async function editSite(siteId = null) {
  if ( !game.user.isGM ) return null;
  const st = state(), s = S.siteById(st, siteId) ?? {...S.blankSite(), id: ""};
  const list = powerList().filter(p => S.ROLES[p.kind]);
  const used = new Set(st.list.filter(x => x.id !== s.id).flatMap(x => x.places));
  const actors = all(game.actors).filter(a => a.type !== "Group");
  const claim = role => `<div class="form-group"><label>${esc(S.ROLES[role])}: who claims it</label><input type="text" name="claim.${role}" value="${esc(s.claims?.[role]?.faction ?? "")}" placeholder="A sept, a chantry, a court, a Prince"/></div>`;
  const content = `<form>
    <div class="form-group"><label>Name</label><input type="text" name="name" value="${esc(s.name)}"/></div>
    <div class="form-group"><label>Scene</label><select name="scene">${opt("", "No scene")}${all(game.scenes).map(x => opt(x.id, x.navName || x.name, x.id === s.scene)).join("")}</select></div>
    <div class="form-group"><label>Places on it</label><select name="places" multiple size="6">${list.filter(p => !used.has(p.id)).map(p => opt(p.id, `${p.name} (${P.KINDS[p.kind]})`, s.places.includes(p.id))).join("")}</select></div>
    <p class="notes">Pick the caern, Node, freehold or chantry from the places of power register. Each keeps its own rules; they share this site's strength.</p>
    <div class="form-group"><label><input type="checkbox" name="elysium"${s.elysium ? " checked" : ""}/> It is also an Elysium</label></div>
    <div class="form-group"><label>Keeper of Elysium</label><select name="keeper">${opt("", "None")}${actors.map(a => opt(a.id, a.name, a.id === s.elysium?.keeper)).join("")}</select></div>
    ${["caern", "node", "freehold", "chantry", "elysium"].map(claim).join("")}
  </form>`;
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, window: {title: siteId ? `Holy ground: ${s.name}` : "New holy ground"}, classes: ["wodx-dialog"], position: {width: 520}, content,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => {
      const f = b.form, fd = Object.fromEntries(new FormData(f));
      return {...fd, places: [...(f.querySelector("[name=places]")?.selectedOptions ?? [])].map(o => o.value), elysium: !!f.querySelector("[name=elysium]")?.checked};
    }}, {action: "cancel", label: "Cancel"}]});
  if ( !res || res === "cancel" ) return null;
  const claims = {};
  for ( const role of Object.keys(S.ROLES) ) if ( String(res[`claim.${role}`] ?? "").trim() ) claims[role] = {faction: String(res[`claim.${role}`]).trim(), holders: s.claims?.[role]?.holders ?? []};
  const next = S.normSite({...s, id: s.id || foundry.utils.randomID(), name: res.name || "Holy ground", scene: res.scene || null, places: res.places,
    elysium: res.elysium ? {keeper: res.keeper || null, court: s.elysium?.court ?? "", note: s.elysium?.note ?? ""} : null, claims});
  await putSite(next);
  return next;
}

export async function removeSite(siteId) {
  const st = state();
  st.list = st.list.filter(s => s.id !== siteId);
  await save(st);
}

export async function sitesDialog() {
  if ( !game.user.isGM ) return;
  const rows = state().list.map(s => { const v = view(s.id); return `<li>${esc(v.text)} <button type="button" data-act="edit" data-id="${s.id}">Edit</button> <button type="button" data-act="remove" data-id="${s.id}">Remove</button></li>`; }).join("");
  const content = `<p>Places that are several holy places at once: a caern, a Node, a freehold and an Elysium sharing one strength (house rule).</p>${rows ? `<ul class="wst-sites">${rows}</ul>` : "<p><i>No shared holy ground yet.</i></p>"}`;
  const pick = await foundry.applications.api.DialogV2.wait({rejectClose: false, window: {title: "Holy ground"}, classes: ["wodx-dialog"], position: {width: 600}, content,
    buttons: [{action: "new", label: "New holy ground"}, {action: "close", label: "Close", default: true}],
    render: (ev, dlg) => {
      const el = dlg?.element ?? ev?.target?.element;
      for ( const b of el?.querySelectorAll?.("[data-act]") ?? [] ) b.addEventListener("click", async () => {
        dlg?.close?.();
        if ( b.dataset.act === "edit" ) await editSite(b.dataset.id);
        else await removeSite(b.dataset.id);
        sitesDialog();
      });
    }});
  if ( pick === "new" ) { await editSite(); sitesDialog(); }
}

/** The claims on every site in a scene, for faction politics: [{site, name, claims}]. */
export function claimsIn(sceneId) {
  return state().list.filter(s => s.scene === sceneId).map(s => { const c = contextOf(s); return {site: s.id, name: s.name, claims: S.claimsOf(c.site, c.roles)}; });
}

export function setupSites() {
  const reg = () => chron()?.approvals?.registerHandler?.(T_QUARREL, {label: "Holy ground: a quarrel between the claims", approve: approveQuarrel});
  if ( chron()?.approvals?.registerHandler ) reg(); else Hooks.once("wodxChronicleReady", reg);
}

export const api = () => ({open: sitesDialog, edit: editSite, remove: removeSite, state, view, ofPlace, gate, draw: onDraw, moot: onMoot, claimsIn, on, rules: S});
