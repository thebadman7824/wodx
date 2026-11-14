/**
 * Haven works, the Foundry side (B3359-B3363). The rules are in haven-works-rules.mjs.
 *
 *   Stored     on the haven's scene flag (havens.mjs): upgrades, staff, traces, probed
 *   Upgrade    a downtime project of kind "upgrade" names a haven and an upgrade; finished, it asks the Storyteller
 *              (approval wodx-storyteller.upgrade) to put it in. The Storyteller can also put one in directly.
 *   Staff      the Storyteller names who keeps the house; they are kept up through upkeep as Retainers are.
 *   Month      every 30 days of world time the active Storyteller's client looks at each haven: each NPC with a grudge
 *              against an owner (WoDX NPC memory) may probe it (approval wodx-storyteller.probe). Approved, the rival
 *              is added to who knows the way, or a fire is set; wodxHavenProbe fires for other modules.
 */
import * as W from "./haven-works-rules.mjs";
import * as H from "./haven-rules.mjs";
import * as Havens from "./havens.mjs";
import {MOD, esc, chron, npc, isActiveGM, isPC, setting, log} from "./core.mjs";
import {sphereFor} from "../../wodx-chronicle/scripts/world-rules.mjs";

const T_UP = `${MOD}.upgrade`, T_PROBE = `${MOD}.probe`;
const now = () => game.time?.worldTime ?? 0;
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 1197; } catch (e) { return 1197; } };
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function registerWorksSettings() {
  game.settings.register(MOD, "havenWorks", {name: "Haven works and rival probes", hint: "Havens can be improved as downtime projects, and the works leave traces a rival with a grudge can follow.",
    scope: "world", config: true, type: Boolean, default: true});
  game.settings.register(MOD, "havenTurn", {scope: "world", config: false, type: Number, default: 0});
}
const on = () => setting("havenWorks") !== false;

/** The way of life of the place a scene stands in (world-rules spheres). */
export function wayOf(scene) {
  try { const r = chron()?.world?.here?.(scene); return sphereFor((typeof r === "string" ? r : r?.id) || "moravia", yearNow()); } catch (e) { return "latin"; }
}

/** The upgrades the owners of a haven can put in now. */
export function openFor(scene) {
  const h = Havens.havenOf(scene);
  if ( !h ) return [];
  return W.upgradesFor({year: yearNow(), way: wayOf(scene), beings: h.owners.map(id => game.actors.get(id)?.type).filter(Boolean), have: h.upgrades.map(u => u.key)});
}

/** The havens a character owns. */
export const ownedBy = a => Havens.havens().filter(({haven}) => haven.owners.includes(a?.id));

/** Put an upgrade in (Storyteller): adds it, its traces, and its security up to the Domain's cap. */
export async function install(scene, key) {
  if ( !game.user.isGM || !scene ) return null;
  const h = Havens.havenOf(scene), u = W.upgrade(key);
  if ( !h || !u ) return null;
  const w = W.install(h, key, now());
  const security = H.capSecurity(h.security + num(u.sec), Havens.ratingOf(h));
  await scene.update({[`flags.${MOD}.haven`]: H.normHaven({...h, ...w, security})});
  const owner = game.actors.get(h.owners[0]);
  await log({kind: "haven", actor: isPC(owner) ? owner.id : null, name: owner?.name ?? null, text: `${h.name || scene.name}: ${u.name.toLowerCase()} put in. ${u.gives}`});
  return Havens.havenOf(scene);
}

export async function setStaff(scene, staff) {
  if ( !game.user.isGM || !scene ) return null;
  const h = Havens.havenOf(scene);
  if ( !h ) return null;
  await scene.update({[`flags.${MOD}.haven`]: H.normHaven({...h, staff})});
  return Havens.havenOf(scene);
}

/* ---- Upgrades as projects (B3359) ---- */

async function onUpgradeDone(actor, task) {
  if ( !isActiveGM() || !on() || task?.kind !== "upgrade" || task.status !== "done" || !task.haven || !task.upgrade ) return;
  const scene = game.scenes.get(task.haven), u = W.upgrade(task.upgrade);
  if ( !scene || !u ) return;
  await chron()?.propose?.({type: T_UP, key: `upgrade:${scene.id}:${u.key}`, title: `${actor?.name ?? "Someone"}: ${u.name.toLowerCase()} at ${Havens.havenOf(scene)?.name || scene.name}`,
    detail: `${u.gives} Leaves: ${(u.traces ?? []).map(k => W.TRACES[k].label.toLowerCase()).join(", ") || "nothing"}.`, data: {scene: scene.id, key: u.key}});
}
async function approveUpgrade(e) { const {scene, key} = e?.data ?? {}; await install(game.scenes.get(scene), key); }

/* ---- The month (B3362) ---- */

/** NPCs with a grudge against any owner: [{actor, against}]. */
function rivalsOf(h) {
  const mem = npc()?.memory;
  if ( !mem?.balance ) return [];
  const at = mem.rules?.GRUDGE_AT ?? 5;
  const out = [];
  for ( const a of game.actors ) {
    if ( isPC(a) ) continue;
    const m = a.flags?.["wodx-npc"]?.memory ?? {};
    for ( const id of h.owners ) if ( m[id] && mem.balance(a, id).grudge >= at ) { out.push({actor: a, against: id}); break; }
  }
  return out;
}
const rivalInfo = (a, h) => ({id: a.id, knows: h.known.some(k => k.who.toLowerCase() === a.name.toLowerCase()), awakened: W.beingOf(a.type) === "mage",
  umbra: W.beingOf(a.type) === "werewolf" || /spirit/i.test(String(a.type ?? "")), violent: npc()?.memory?.rules?.temperOf?.(a.system?.nature) === "unforgiving"});

export async function monthRun({force = false} = {}) {
  if ( !isActiveGM() || !on() ) return [];
  const t = now(), last = num(setting("havenTurn"));
  if ( !force && last && t - last < W.MONTH ) return [];
  await game.settings.set(MOD, "havenTurn", t);
  if ( !last && !force ) return [];
  const out = [];
  for ( const {scene, haven: h} of Havens.havens() ) {
    for ( const {actor: r, against} of rivalsOf(h) ) {
      const got = W.probeMonth({works: h, security: h.security, rival: rivalInfo(r, h), now: t, year: yearNow()});
      if ( !got ) continue;
      out.push({scene: scene.id, rival: r.id, probe: got.probe.key});
      await scene.update({[`flags.${MOD}.haven.probed.${r.id}`]: t});
      const owner = game.actors.get(against);
      await chron()?.propose?.({type: T_PROBE, key: `probe:${scene.id}:${r.id}`, title: `${r.name} probes ${h.name || scene.name}`,
        detail: `${got.probe.label}. An old grudge against ${owner?.name ?? "an owner"}. Approve and ${got.probe.key === "fire" ? "the fire is set; the Storyteller plays it" : `${r.name} knows the way`}.`,
        data: {scene: scene.id, rival: r.id, probe: got.probe.key}});
    }
  }
  return out;
}

async function approveProbe(e) {
  const {scene: sid, rival, probe} = e?.data ?? {};
  const scene = game.scenes.get(sid), r = game.actors.get(rival), p = W.PROBES.find(x => x.key === probe);
  const h = Havens.havenOf(scene);
  if ( !scene || !r || !p || !h ) return;
  if ( p.key === "fire" ) {
    const owner = game.actors.get(h.owners[0]);
    await log({kind: "haven", actor: isPC(owner) ? owner.id : null, name: owner?.name ?? null, attention: "A haven is attacked", text: `${r.name} sets a fire at ${h.name || scene.name}.`});
  } else await Havens.expose(scene, r.name, p.label.toLowerCase());
  Hooks.callAll("wodxHavenProbe", {scene, rival: r, probe: p.key});
}

export function registerApproval() {
  const ap = chron()?.approvals;
  ap?.registerHandler?.(T_UP, {label: "Works on a haven", approve: approveUpgrade, reject: async () => {}});
  ap?.registerHandler?.(T_PROBE, {label: "A rival probes a haven", approve: approveProbe, reject: async () => {}});
}

export function registerWorksHooks() {
  Hooks.on("updateWorldTime", () => { try { if ( chron()?.isSkipping?.() ) return; } catch (e) { /* no Chronicle */ } monthRun().catch(er => console.error(`${MOD} | haven works`, er)); });
  Hooks.on("wodxSkipEnd", () => { monthRun().catch(er => console.error(`${MOD} | haven works`, er)); });
  Hooks.on("wodxTaskDone", ({actor, task} = {}) => { onUpgradeDone(actor, task).catch(er => console.error(`${MOD} | haven works`, er)); });
}

/* ---- The window ---- */

/** The works on one haven: what is in, who keeps it, what it leaves, and what can still go in. */
export async function worksDialog(sceneId = null) {
  if ( !game.user.isGM ) return null;
  const scene = game.scenes.get(sceneId) ?? canvas?.scene;
  const h = Havens.havenOf(scene);
  if ( !h ) return ui.notifications.warn("That scene is not a haven.");
  const year = yearNow(), tr = W.tracesNow(h, now()), chance = W.probeChance(tr, h.security);
  const opt = (v, l) => `<option value="${esc(v)}">${esc(l)}</option>`;
  const open = openFor(scene), posts = W.postsFor(year);
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 620}, window: {title: `Works: ${h.name || scene.name}`}, classes: ["wodx-dialog", "wst-haven-works"],
    content: `<p><b>Put in</b>: ${h.upgrades.map(u => esc(W.upgrade(u.key)?.name ?? u.key)).join("; ") || "nothing yet"}.</p>
      <p><b>Kept by</b>:</p><ul>${h.staff.map((s, i) => `<li><label><input type="checkbox" name="drop.${i}"> let go</label> ${esc(s.name || "someone")}, ${esc(W.POSTS.find(p => p.key === s.post)?.name.toLowerCase() ?? s.post)} (loyalty ${s.loyal})</li>`).join("") || "<li>Nobody.</li>"}</ul>
      <p><b>What it leaves</b>: ${tr.map(t => `${esc(t.label.toLowerCase())} (${t.w})`).join("; ") || "nothing a rival could follow"}. A rival with a grudge finds the way in a month at ${Math.round(chance * 100)} in 100.</p>
      <div class="form-group"><label>Put in now</label><select name="up" data-fixed><option value="">Nothing</option>${open.map(u => opt(u.key, u.name)).join("")}</select></div>
      <div class="form-group"><label>Take on</label><select name="post" data-fixed><option value="">Nobody</option>${posts.map(p => opt(p.key, p.name)).join("")}</select></div>
      <div class="form-group"><label>Their name</label><input type="text" name="sname"></div>
      <div class="form-group"><label>Loyalty</label><input type="number" name="loyal" value="3" min="0" max="5"></div>
      <p class="hint">A player can put works in as a downtime project of kind Improve a haven. Staff are kept up as Retainers are. Domain, Chantry, Sanctum, caern and Holdings ratings are the books' (V20 pdf 121; M20 pdf 302, 325; W20 pdf 250-255; C20 pdf 172); prices and odds are the chronicle's own.</p>`,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "cancel", label: "Close"}]});
  if ( !res || res === "cancel" ) return null;
  if ( res.up ) await install(scene, res.up);
  const cur = Havens.havenOf(scene);
  const staff = cur.staff.filter((s, i) => !res[`drop.${i}`]);
  if ( res.post ) staff.push({post: res.post, name: String(res.sname ?? "").trim(), loyal: num(res.loyal)});
  await setStaff(scene, staff);
  return Havens.havenOf(scene);
}

export function api() {
  return {rules: W, open: worksDialog, install, setStaff, openFor, ownedBy, monthRun};
}
