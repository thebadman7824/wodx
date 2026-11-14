/**
 * Patronage of the arts, the Foundry side (B3374-B3378). The rules are in patronage-rules.mjs.
 *
 *   Stored      world setting wodx-storyteller.artistState {list: [artist], last}
 *   Artists     the Storyteller names artists, or takes them from the NPCs of a town with Expression or Crafts.
 *   Commission  a downtime project of kind "commission" names an artist, a form, the money spent and, for the fae, how
 *               the artist is handled. Finished, the work is made as an item on the patron, the artist is kept, a fine
 *               work is told to the Storyteller for the Toreador's eye, and a Toreador patron is asked about a Muse
 *               (approval wodx-storyteller.museWork). A fae patron makes the artist a Dreamer, or Ravages them.
 *   Month       artists without a patron for six months starve; a starving one may die or find a patron.
 *   Salon       the Storyteller holds one for a host: a kind tale about the host starts, the host's artists may rise.
 */
import * as P from "./patronage-rules.mjs";
import * as Markets from "./markets.mjs";
import * as Rumours from "./rumours.mjs";
import {MOD, esc, chron, isActiveGM, isPC, setting, log, whereIs} from "./core.mjs";
import {sphereFor} from "../../wodx-chronicle/scripts/world-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const T_MUSE = `${MOD}.museWork`;
const now = () => game.time?.worldTime ?? 0;
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 1197; } catch (e) { return 1197; } };
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const all = c => (c ? [...(c.contents ?? c)] : []);

export function registerPatronageSettings() {
  game.settings.register(MOD, "patronage", {name: "Patronage of the arts", hint: "Characters commission works from artists as downtime projects; artists have careers, and the work's quality follows the fashion of its age.",
    scope: "world", config: true, type: Boolean, default: true});
  game.settings.register(MOD, "artistState", {scope: "world", config: false, type: Object, default: {list: [], last: null}});
}
const on = () => setting("patronage") !== false;
export const state = () => { const s = setting("artistState") ?? {}; return {list: (s.list ?? []).map(P.normArtist), last: s.last ?? null}; };
async function save(s) { if ( game.user.isGM ) await game.settings.set(MOD, "artistState", {list: s.list.map(P.normArtist), last: s.last}); }
export const artists = () => state().list;
export const byId = id => artists().find(a => a.id === id) ?? null;

const wayOf = a => { try { const r = chron()?.world?.here?.(whereIs(a) ?? null); return sphereFor((typeof r === "string" ? r : r?.id) || "moravia", yearNow()); } catch (e) { return "latin"; } };
const dots = (a, k) => num(a?.system?.abilities?.[k]?.value);
const isFae = a => /changeling|kith/i.test(String(a?.type ?? ""));
const isToreador = a => /toreador/i.test(`${a?.system?.clan ?? ""} ${a?.system?.custom?.clan ?? ""}`);

export async function addArtist({actor = null, name = "", skill = null, fame = 0, patron = ""} = {}) {
  if ( !game.user.isGM ) return null;
  const s = state();
  const act = actor ? game.actors.get(actor) : null;
  const id = foundry.utils.randomID();
  s.list.push(P.normArtist({id, actor: act?.id ?? "", name: act?.name ?? name, skill: skill ?? Math.max(dots(act, "expression"), dots(act, "crafts")), fame, patron, since: now()}));
  await save(s);
  return byId(id);
}

/** NPCs of the towns with Expression or Crafts of 2 or more, not yet artists. */
export function townArtists() {
  const have = new Set(artists().map(a => a.actor).filter(Boolean));
  const ids = new Set();
  for ( const m of Markets.state()?.markets ?? [] ) for ( const sid of m.scenes ?? [] ) for ( const t of all(game.scenes.get(sid)?.tokens) ) if ( t.actorId ) ids.add(t.actorId);
  return [...ids].map(id => game.actors.get(id)).filter(a => a && !isPC(a) && !have.has(a.id) && Math.max(dots(a, "expression"), dots(a, "crafts")) >= 2);
}

/* ---- Commissions (B3374-B3376) ---- */

async function onCommissionDone(actor, task) {
  if ( !isActiveGM() || !on() || task?.kind !== "commission" || task.status !== "done" || !task.artist ) return;
  const s = state(), i = s.list.findIndex(x => x.id === task.artist);
  if ( i < 0 || s.list[i].state === "dead" ) return;
  const year = yearNow(), f = P.form(task.form) ?? P.FORMS[0];
  const r = P.finish({artist: s.list[i], formKey: f.key, money: task.money, year, way: wayOf(actor), fae: isFae(actor), handling: task.handling});
  s.list[i] = {...r.artist, patron: actor.id, lastPaid: now(), state: "working"};
  await save(s);
  const name = `${f.label}${task.name ? `: ${task.name}` : ""} (${r.label})`;
  const [item] = await actor.createEmbeddedDocuments("Item", [{name, type: "Item", flags: {[MOD]: {work: {form: f.key, quality: r.quality, fashion: r.fashion, artist: s.list[i].name, year, status: r.status}, owner: {id: actor.id, name: actor.name}}}}]).catch(() => []);
  const lines = [`${s.list[i].name} has finished ${f.label.toLowerCase()} for ${actor.name}: ${r.label}${r.fashion ? ", in the fashion of the day" : ""}.`];
  if ( r.status ) lines.push(`At a gathering where it is shown, ${actor.name} has ${r.status} more ${r.status === 1 ? "die" : "dice"} on Status and social rolls.`);
  if ( isFae(actor) ) lines.push(task.handling === "harsh" ? `${s.list[i].name} is Ravaged by the handling and gives no Glamour; their skill suffers (C20 pdf 146).` : `${s.list[i].name} is now a Dreamer and gives Glamour to their patron (C20 pdf 150).`);
  await log({kind: "patronage", actor: actor.id, name: actor.name, attention: r.toreador ? "A fine work of art" : null, text: `${lines.join(" ")}${r.toreador ? " The Toreador may take notice." : ""}`});
  if ( r.toreador && isToreador(actor) && item ) await chron()?.propose?.({type: T_MUSE, title: `${actor.name} and ${name}: a Muse?`, detail: "A Toreador who owns a work this fine may be taken by it (V20 pdf 75). Approve to make it a Muse.", data: {actor: actor.id, item: item.uuid, name}});
}
async function approveMuse(e) {
  const {actor, item, name} = e?.data ?? {};
  try { await chron()?.signatures?.addMuse?.(actor, {name, kind: "work", uuid: item}); } catch (er) { console.error(`${MOD} | muse`, er); }
}

/* ---- The month (B3378) ---- */

export async function monthRun({force = false} = {}) {
  if ( !isActiveGM() || !on() ) return [];
  const s = state(), t = now();
  if ( !force && s.last !== null && t - s.last < P.MONTH ) return [];
  s.last = t;
  const out = [];
  s.list = s.list.map(a => {
    // A patron who is gone keeps nobody
    const kept = a.patron && game.actors.get(a.patron) ? a : {...a, patron: ""};
    const r = P.monthArtist(kept, {now: t});
    if ( r.event ) out.push({name: a.name, event: r.event});
    return r.artist;
  });
  await save(s);
  for ( const e of out ) await log({kind: "patronage", text: e.event === "dead" ? `${e.name}, an artist with no patron, has died poor.` : e.event === "starving" ? `${e.name}, an artist with no patron, is starving.` : `${e.name} has found someone to pay for the work.`});
  return out;
}

/* ---- Salons (B3377) ---- */

export async function holdSalon(hostLike) {
  if ( !game.user.isGM ) return null;
  const host = game.actors.get(hostLike?.id ?? hostLike);
  if ( !host ) return null;
  const name = P.salonName(yearNow());
  try { await Rumours.startTale({about: host.id, did: `held ${name}`, tone: 1, crowd: true, truth: "true"}); } catch (er) { console.error(`${MOD} | salon`, er); }
  const s = state(), rose = [];
  s.list = s.list.map(a => (a.patron === host.id && a.state !== "dead" && Math.random() < 0.5 ? (rose.push(a.name), {...a, fame: Math.min(5, a.fame + 1)}) : a));
  await save(s);
  await log({kind: "patronage", actor: isPC(host) ? host.id : null, name: host.name, text: `${host.name} held ${name}.${rose.length ? ` Talked about since: ${rose.join(", ")}.` : ""}`});
  return rose;
}

export function registerApproval() {
  chron()?.approvals?.registerHandler?.(T_MUSE, {label: "A work of art as a Muse", approve: approveMuse, reject: async () => {}});
}

export function registerPatronageHooks() {
  Hooks.on("updateWorldTime", () => { try { if ( chron()?.isSkipping?.() ) return; } catch (e) { /* no Chronicle */ } monthRun().catch(er => console.error(`${MOD} | patronage`, er)); });
  Hooks.on("wodxSkipEnd", () => { monthRun().catch(er => console.error(`${MOD} | patronage`, er)); });
  Hooks.on("wodxTaskDone", ({actor, task} = {}) => { onCommissionDone(actor, task).catch(er => console.error(`${MOD} | patronage`, er)); });
}

/* ---- The window ---- */

export async function artistsDialog() {
  if ( !game.user.isGM ) return null;
  const year = yearNow(), list = artists(), cands = townArtists(), pcs = all(game.actors).filter(isPC);
  const nm = id => game.actors.get(id)?.name ?? "";
  const fashion = P.fashionFor(year).map(m => m.name);
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 640}, window: {title: "Artists and patrons"}, classes: ["wodx-dialog", "wst-artists"],
    content: `<p>In fashion in ${year}: ${esc(fashion.join(", ") || "nothing in particular")}.</p>
      ${list.length > 5 ? searchBox("table.wst-artists-t", "Search artists…", "Search artists") : ""}
      <div class="wst-scroll"><table class="wst-artists-t"><thead><tr><th>Artist</th><th>Skill</th><th>Fame</th><th>Patron</th><th>Now</th></tr></thead><tbody>
      ${list.map(a => `<tr><td>${esc(a.name)}${a.dreamer ? " (a Dreamer)" : ""}${a.ravaged ? " (Ravaged)" : ""}</td><td>${a.skill}</td><td>${a.fame}</td><td>${esc(nm(a.patron) || "nobody")}</td><td>${esc(a.state)}, ${a.works} work${a.works === 1 ? "" : "s"}</td></tr>`).join("") || "<tr><td colspan='5'>No artists yet.</td></tr>"}</tbody></table></div>
      ${cands.length > 5 ? searchBox("select[name=from]", "Search townsfolk…", "Search townsfolk") : ""}
      <div class="form-group"><label>Take from the towns</label><select name="from"><option value="">Nobody</option>${cands.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select></div>
      <div class="form-group"><label>Or name one</label><input type="text" name="name" placeholder="A painter from the docks"></div>
      <div class="form-group"><label>Their skill</label><input type="number" name="skill" value="2" min="0" max="5"></div>
      ${pcs.length > 5 ? searchBox("select[name=host]", "Search characters…", "Search characters") : ""}
      <div class="form-group"><label>Hold ${esc(P.salonName(year))} for</label><select name="host"><option value="">Nobody</option>${pcs.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select></div>
      <p class="hint">A player commissions a work as a downtime project of kind Commission a work of art. The Toreador's Muse is V20 pdf 75; Dreamers, Musing and Ravaging are C20 pdf 146, 150 and 260-263.</p>`,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "close", label: "Close"}]});
  if ( !res || res === "close" ) return null;
  if ( res.from ) await addArtist({actor: res.from});
  else if ( String(res.name ?? "").trim() ) await addArtist({name: res.name.trim(), skill: num(res.skill)});
  if ( res.host ) await holdSalon(res.host);
  return artists();
}

export const api = () => ({rules: P, open: artistsDialog, state, artists, byId, add: addArtist, salon: holdSalon, month: monthRun, townArtists});
