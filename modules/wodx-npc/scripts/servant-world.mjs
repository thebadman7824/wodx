/**
 * WoDX NPC (Servants and Bonds Desk, B5120-B5127): servants the world makes by itself, on the one ledger (servants.mjs).
 *   Fomori      w1  when the Storyteller approves a Bane riding someone (WoDX Otherworlds), the fomor gets one to three
 *                   powers as rollable items, serves the nearest Black Spiral Dancer or Wyrm cult, and smoke enters them
 *   Retinue     c3  people the Retinue background makes real start with a lasting Enchantment
 *   Mummy cults u1  at the mummy's death its cult guards the body; an untended cult thins
 *   Programmes  m1  Social Conditioning runs on the clock for NPC organisations; openSocial starts one
 *   Keepers     x4  once a month NPC masters keep servants the way their line does, with a card the Storyteller can undo
 *   Experience  x6  a player character's bound servant becomes their ally in WoDX Creation: the master's XP pays, at the servant's own costs
 * Kuei-jin (k2) keep Retainers through orders and blood cults through the cult system; nothing more is needed here.
 */
import * as W from "./servant-world-rules.mjs";
import * as SR from "./servant-rules.mjs";
import * as SV from "./servants.mjs";
import * as DU from "./duty-rules.mjs";
import * as LR from "./lines-rules.mjs";

const MOD = "wodx-npc";
const num = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const isActiveGM = () => game.user?.isGM && game.users.activeGM?.id === game.user.id;
const chron = () => game.modules.get("wodx-chronicle")?.api;
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const now = () => game.time?.worldTime ?? 0;
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 1197; } catch (e) { return 1197; } };
const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };
const tokenOf = a => canvas?.scene?.tokens?.find?.(t => t.actorId === a?.id) ?? null;
const sceneOf = a => game.scenes?.find?.(s => s.tokens?.some?.(t => t.actorId === a?.id))?.id ?? null;
const card = (title, html, flags = {}) => ChatMessage.create({speaker: {alias: "Servants"}, whisper: gmIds(), flags: {[MOD]: {worldServants: true, ...flags}},
  content: `<div class="vta-card wodx-x wnpc"><div class="vta-body"><p><b>${esc(title)}</b></p>${html}</div></div>`});

export function registerSettings() {
  game.settings.register(MOD, "npcKeepers", {name: "NPC masters keep servants", hint: "Once a month of world time, NPC vampires, mages, Garou, demons, wraiths, mummies, Kuei-jin and changelings keep servants the way their line does in that era, from the unbound mortals near them. The Storyteller gets a card and can undo it.",
    scope: "world", config: true, type: Boolean, default: true});
  game.settings.register(MOD, "keeperTurn", {scope: "world", config: false, type: Number, default: 0});
}

/* w1: fomori */
function wyrmCandidates() {
  const out = [];
  for ( const a of game.actors ?? [] ) {
    const tribe = String(a.system?.tribe ?? a.system?.custom?.tribe ?? "");
    if ( a.type === "Werewolf" && /black spiral/i.test(tribe) ) out.push({id: a.id, kind: "spiral", sceneId: sceneOf(a), name: a.name});
  }
  for ( const c of setting("cults") ?? [] ) if ( c?.kind === "wyrm" && c.founder?.id && game.actors.get(c.founder.id) ) out.push({id: c.founder.id, kind: "cult", sceneId: sceneOf(game.actors.get(c.founder.id)), name: c.name});
  return out;
}
export async function fomorise(actorLike, {powers = null, master = null} = {}) {
  const a = game.actors.get(actorLike?.id ?? actorLike);
  if ( !a || !game.user.isGM || a.flags?.[MOD]?.fomori ) return null;
  const picks = powers ?? W.pickPowers(game.wodxActions?.fomor?.rules?.POWERS ?? []);
  if ( picks.length ) await a.createEmbeddedDocuments("Item", W.powerItems(picks));
  await a.update({[`flags.${MOD}.fomori`]: {at: now(), powers: picks.map(p => p.key)}});
  // Antagonist desk B6698: a victim who fell to a corrupter serves that corrupter, already bound
  const given = master ? game.actors.get(master?.id ?? master) : null;
  const m = given ?? W.wyrmMaster(wyrmCandidates(), {year: yearNow(), sceneId: sceneOf(a)});
  if ( m && !given ) await SV.bind(a, m.id, "fomor", {step: 1, quiet: true});
  else { const t = tokenOf(a); if ( t ) SV.flash("fomor", t, t); }
  await card(`${a.name} is fomor`, `<p>Powers: ${(picks.map(p => esc(p.name)).join(", ") || "none yet (WoDX Actions gives the list)")} (on the sheet).</p><p>${m ? `Serves ${esc(m.name)}.` : "No Wyrm master is known yet: bind one from the followers window."}</p><p class="wodx-quiet">${W.PAGE}</p>`);
  return {powers: picks, master: m};
}

/* c3: the Retinue starts enchanted */
async function onRetinueMade(item, changes) {
  const made = changes?.flags?.["wodx-chronicle"]?.made;
  const owner = item?.parent;
  if ( !isActiveGM() || !Array.isArray(made) || !owner || !/retinue/i.test(item.name ?? "") ) return;
  for ( const id of made ) {
    const p = game.actors.get(id);
    if ( !p || p.flags?.[MOD]?.held?.[`enchant:${owner.id}`] ) continue;
    await SV.bind(p, owner, "enchant", {step: 3, quiet: true, data: {lasting: true, glamour: 1, retinue: true}});
  }
}

/* u1: the cult keeps the vessel */
function cultOf(mummy) {
  const ids = new Set(SV.servantsOf(mummy).filter(s => s.records.some(r => r.kind === "cult")).map(s => s.actor.id));
  for ( const c of setting("cults") ?? [] ) if ( c?.founder?.id === mummy.id ) for ( const m of c.named ?? [] ) if ( game.actors.get(m.id) ) ids.add(m.id);
  return [...ids].map(id => game.actors.get(id));
}
async function onDeath(actor, d = {}) {
  if ( !isActiveGM() || d?.condition !== "dead" || actor?.type !== "Mummy" ) return;
  const cult = cultOf(actor);
  if ( !cult.length ) return;
  const orders = game.modules.get(MOD)?.api?.orders;
  const scene = canvas?.scene;
  let sent = 0;
  for ( const c of cult ) {
    const t = scene?.tokens?.find?.(x => x.actorId === c.id);
    if ( t && orders?.give ) { try { await orders.give({sceneId: scene.id, tokenId: t.id, kind: "guard", leader: actor.id, note: "the body, until it rises"}); sent++; } catch (e) { /* no order */ } }
    await c.update({[`flags.${MOD}.keepsVessel`]: {of: actor.id, since: now()}});
  }
  const mt = tokenOf(actor);
  for ( const c of cult ) { const t = tokenOf(c); if ( t && mt ) SV.flash("cult", t, mt); }
  await card(`${actor.name}'s cult keeps the vessel`, `<p>${cult.map(c => esc(c.name)).join(", ")} carry the body to its resting place and guard it until it rises${sent ? `; ${sent} on this scene stand guard now` : ""}.</p>`);
}
async function cultDrift() {
  for ( const a of game.actors ?? [] ) {
    for ( const [key, rec] of Object.entries(a.flags?.[MOD]?.held ?? {}) ) {
      if ( rec?.kind !== "cult" ) continue;
      const m = game.actors.get(rec.master);
      if ( m?.type !== "Mummy" ) continue;
      const out = W.cultDrift(rec, now(), {mistreated: !!rec.data?.mistreated});
      if ( out.step === num(rec.step) ) continue;
      if ( out.step <= 0 ) await SV.unbind(a, m, "cult"); else await a.update({[`flags.${MOD}.held.${key}.step`]: out.step});
      await card(`${a.name} and ${m.name}'s cult`, `<p>${esc(out.why)}.</p>`);
    }
  }
}

/* m1: Social Conditioning programmes */
export async function openSocial(masterLike, subjectLike = null) {
  const m = game.actors.get(masterLike?.id ?? masterLike), s = game.actors.get(subjectLike?.id ?? subjectLike) ?? [...(game.user.targets ?? [])][0]?.actor ?? null;
  if ( !game.user.isGM ) return ui.notifications?.warn?.("Only the Storyteller runs a Social Conditioning programme: only organisations can (M20 pdf p. 606).");
  if ( !m || !s ) return ui.notifications?.warn?.("Pick the organisation's agent and target the subject.");
  const groups = SR.socialGroupsIn(yearNow());
  const D = foundry.applications.api.DialogV2;
  const fd = await D.prompt({window: {title: `Social Conditioning: ${s.name}`, icon: "fa-solid fa-brain"}, classes: ["wodx-dialog", "wodx-npc-dialog"], rejectClose: false,
    content: `<p>${esc(m.name)}'s people work on ${esc(s.name)}, a stage a roll, on the clock (M20 pdf pp. 606 to 608).</p>
      <div class="form-group"><label>Run by</label><select name="group" data-fixed>${groups.map(g => `<option value="${g}">${esc(SR.SOCIAL_GROUPS[g].label)}</option>`).join("")}</select></div>
      <div class="form-group"><label>Agents' dice</label><input type="number" name="dice" min="1" max="15" value="5"/></div>
      ${s.hasPlayerOwner ? `<div class="form-group"><label><input type="checkbox" name="consent"/> The player says yes</label></div>` : ""}`,
    ok: {label: "Begin", callback: (e, b) => Object.fromEntries(new FormData(b.form).entries())}});
  if ( !fd ) return null;
  const rec = await SV.socialRoll(s, m, {group: fd.group, agentDice: num(fd.dice) || 5, consent: !s.hasPlayerOwner || !!fd.consent});
  if ( rec ) await s.update({[`flags.${MOD}.held.social:${m.id}.data.agentDice`]: num(fd.dice) || 5, [`flags.${MOD}.held.social:${m.id}.data.consent`]: !!fd.consent || !s.hasPlayerOwner});
  return rec;
}
async function socialClock() {
  const t = now();
  for ( const a of game.actors ?? [] ) {
    for ( const rec of Object.values(a.flags?.[MOD]?.held ?? {}) ) {
      if ( rec?.kind !== "social" || rec.data?.ruined || num(rec.data?.stage) >= 10 || !rec.data?.nextAt || num(rec.data.nextAt) > t ) continue;
      const m = game.actors.get(rec.master);
      if ( !m || m.hasPlayerOwner ) continue;
      if ( a.hasPlayerOwner && !rec.data?.consent ) continue;
      await SV.socialRoll(a, m, {group: rec.data.group, agentDice: num(rec.data.agentDice) || 5, consent: true});
    }
  }
}

/* x4: NPC masters keep servants */
function lineOf(a) {
  if ( !a ) return "";
  // B6310: the all-lines key; a Kuei-jin (variant kindredeast) keeps a cult, never ghouls, and a Fera keeps Kinfolk as the Garou do
  return W.keeperLine(LR.lineKey(a, linesApi()));
}
const linesApi = () => { try { return game.modules.get("wodx-creation")?.active ? game.modules.get("wodx-creation").api?.lines ?? null : null; } catch (e) { return null; } };
const discOf = a => Object.fromEntries((a.items ?? []).filter(i => i.type === "Power" && /discipline/i.test(String(i.system?.type ?? ""))).map(i => [String(i.name).toLowerCase(), num(i.system?.value)]));
export async function keeperTurn({force = false, only = null} = {}) {
  if ( !isActiveGM() || (!force && setting("npcKeepers") === false) ) return null;
  const t = now();
  const last = num(setting("keeperTurn"));
  // the first month starts when the world first sees the clock move, so no one is bound the moment the module arrives
  if ( !force && !last ) { await game.settings.set(MOD, "keeperTurn", t); return null; }
  if ( !force && t - last < W.KEEPER_EVERY ) return null;
  await game.settings.set(MOD, "keeperTurn", t);
  await cultDrift();
  const year = yearNow();
  const taken = new Set(game.actors.filter(a => SV.records(a).length).map(a => a.id));
  const pool = game.actors.filter(a => a.type === "Mortal" && !a.hasPlayerOwner && !taken.has(a.id)).map(a => ({id: a.id, sceneId: sceneOf(a)}));
  const made = [];
  const masters = only ? only.map(x => game.actors.get(x?.id ?? x)).filter(Boolean) : game.actors.filter(a => !a.hasPlayerOwner && lineOf(a)).slice(0, 40);
  for ( const m of masters ) {
    const rows = SR.keeperRows({line: lineOf(m), year, disciplines: discOf(m), clan: String(m.system?.clan ?? ""), group: String(m.system?.tradition ?? m.system?.affiliation ?? m.system?.custom?.tradition ?? "")});
    const have = SV.servantsOf(m);
    for ( const r of rows ) {
      if ( r.kind === "revenant" || r.kind === "kinfolk" ) continue; // families and kin come from their own records
      const kind = r.kind === "ghoul" ? "blood" : r.kind;
      const want = SR.keeperCount(r, Math.random());
      const k = W.shortfall(want, have.filter(h => h.records.some(x => x.kind === kind)).length);
      for ( const id of W.recruits(pool, k, {sceneId: sceneOf(m), taken}) ) {
        taken.add(id);
        const s = game.actors.get(id);
        if ( kind === "blood" ) await s.update({[`flags.wodx-creation.lineage.bonds.${m.id}`]: {name: m.name, drinks: r.step, last: t}});
        else await SV.bind(s, m, kind, {step: r.step, quiet: true, flash: false});
        made.push({servant: id, master: m.id, kind, sName: s.name, mName: m.name});
      }
    }
  }
  // B5695 (g3): every bound servant of an NPC master keeps hours at the master's place
  const attending = await attendAll(masters).catch(e => { console.error(`${MOD} | attend`, e); return []; });
  if ( attending.length ) made.push(...attending.filter(x => !made.some(y => y.servant === x.servant && y.master === x.master)).map(x => ({...x, attend: true})));
  if ( made.length ) await card("NPC masters keep servants", `<ul>${made.map(x => `<li>${esc(x.sName)}: ${x.attend ? `keeps hours at ${esc(x.mName)}'s place` : `${esc(SR.KINDS[x.kind]?.label ?? x.kind)} to ${esc(x.mName)}`}</li>`).join("")}</ul><p><button type="button" data-wnpc-keepers-undo>Undo all</button></p>`, {keepers: made});
  return made;
}
/** g3: the master's own place: its haven or home in its routine, else where it is now. */
function masterPlace(m) {
  const R = game.modules.get(MOD)?.api?.routines;
  const roles = R?.routineOf?.(m)?.roles ?? {};
  return roles.haven ?? roles.home ?? R?.whereOf?.(m)?.place ?? null;
}
/** g3: duties for every servant of these NPC masters. Returns the servants newly given hours. */
export async function attendAll(masters = []) {
  const R = game.modules.get(MOD)?.api?.routines, out = [];
  if ( !R?.setDuty ) return out;
  for ( const m of masters ) {
    const place = masterPlace(m);
    for ( const {actor: s, records} of SV.servantsOf(m) ) {
      if ( s.hasPlayerOwner ) continue;
      const kind = records[0]?.kind ?? "retainer";
      const duty = DU.servantDuty(kind, place, lineOf(m));
      const key = `serve:${m.id}`, had = s.flags?.[MOD]?.duties?.[key];
      if ( !duty ) continue;
      if ( had?.place === duty.place && had?.from === duty.from ) continue;
      await R.setDuty(s, key, duty);
      out.push({servant: s.id, master: m.id, kind, sName: s.name, mName: m.name});
    }
  }
  return out;
}
async function undoKeepers(list = []) {
  for ( const x of list ) {
    const s = game.actors.get(x.servant);
    if ( !s ) continue;
    if ( x.attend ) { await game.modules.get(MOD)?.api?.routines?.setDuty?.(s, `serve:${x.master}`, null); continue; }
    if ( x.kind === "blood" ) await s.update({[`flags.wodx-creation.lineage.bonds.-=${x.master}`]: null});
    else await SV.unbind(s, x.master, x.kind);
  }
}

/* x6: a player character's servants take the master's experience (Creation's allies: the patron pays at the servant's own costs) */
async function onBond({servant, master, record, ended} = {}) {
  if ( !isActiveGM() || !servant || !master || servant.hasPlayerOwner ) return;
  const ally = servant.flags?.["wodx-creation"]?.ally ?? null;
  const mine = servant.flags?.[MOD]?.allyFromBond;
  if ( record && master.hasPlayerOwner && !ally ) {
    await servant.update({"flags.wodx-creation.ally": {patron: {id: master.id, name: master.name}, payer: "patron", granted: {}}, [`flags.${MOD}.allyFromBond`]: master.id});
  } else if ( ended && mine === master.id && !SR.toward(SV.records(servant), master.id).length ) {
    await servant.update({"flags.wodx-creation.-=ally": null, [`flags.${MOD}.-=allyFromBond`]: null});
  }
}

export function listen() {
  Hooks.on("wodxBond", d => { onBond(d).catch(e => console.error(`${MOD} | servant experience`, e)); });
  Hooks.on("updateActor", (a, changes) => {
    if ( isActiveGM() && changes?.flags?.["wodx-otherworlds"]?.taint?.ridden === true && !a.flags?.[MOD]?.fomori ) fomorise(a).catch(e => console.error(`${MOD} | fomori`, e));
  });
  Hooks.on("updateItem", (item, changes) => { onRetinueMade(item, changes).catch(e => console.error(`${MOD} | retinue`, e)); });
  Hooks.on("wodxDamageApplied", (actor, d) => { onDeath(actor, d).catch(e => console.error(`${MOD} | mummy cult`, e)); });
  let busy = false;
  Hooks.on("updateWorldTime", () => {
    if ( busy || !isActiveGM() || chron()?.isSkipping?.() ) return;
    busy = true;
    socialClock().then(() => keeperTurn()).catch(e => console.error(`${MOD} | world servants`, e)).finally(() => { busy = false; });
  });
  Hooks.on("renderChatMessageHTML", (msg, el) => {
    const list = msg.flags?.[MOD]?.keepers;
    const b = (el?.[0] ?? el)?.querySelector?.("[data-wnpc-keepers-undo]");
    if ( !list || !b ) return;
    if ( !game.user.isGM ) { b.remove(); return; }
    b.addEventListener("click", async () => { b.disabled = true; await undoKeepers(list); b.textContent = "Undone"; });
  });
}

export const api = {attendAll, fomorise, openSocial, keeperTurn, undoKeepers, socialClock, onBond, rules: W};
