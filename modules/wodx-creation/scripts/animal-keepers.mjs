/**
 * Ghouled animals, step four (B5133 to B5137), the Foundry side. The rules are in animal-keepers-rules.mjs.
 *   - Fleshcraft: next to a ghoul, a vampire with Vicissitude 3 starts a long task (WoDX Storyteller) that remakes it
 *     as a szlachta; with Vicissitude 5 and fifteen ghouls of their own, one that grafts them into a vozhd. When the
 *     task is done the change happens by itself: the sheet, the token's size and a card. A vozhd's making is a breach.
 *   - Kennels: the Storyteller marks a vampire as keeping a kennel of a kind (the Actors list's right-click menu);
 *     once a day the active Storyteller checks for a litter and makes the young, born trained.
 *   - Households: when a household is seeded as a vampire's ghouls (WoDX NPC's residents), its beasts come with it.
 */
import {MODULE_ID, esc, lineOf, isAnimal, animalKindOf, isAnimalGhoul, clanOf, domitorOf, disciplinesOf, disciplineItem} from "./actor-data.mjs";
import * as AG from "./animal-ghoul-rules.mjs";
import * as AK from "./animal-keepers-rules.mjs";
import {makeBeast} from "./animal-stock.mjs";
import {getEngine} from "../../wodx-chronicle/scripts/calendar.mjs";

const REACH = 1.5;
const storyteller = () => game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api : null;
const actions = () => game.modules.get("wodx-actions")?.active ? game.modules.get("wodx-actions").api : null;
const isActiveGM = () => game.user?.isGM && game.users?.activeGM?.id === game.user.id;
const dateNow = () => { try { return getEngine().timeToDate(game.time?.worldTime ?? 0); } catch (e) { return null; } };
const n = v => Math.max(0, Math.trunc(Number(v) || 0));
const dots = (a, name) => disciplinesOf(a).find(d => d.name.toLowerCase() === name.toLowerCase())?.value ?? 0;
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const tokensOf = a => (canvas?.scene?.tokens ?? []).filter(t => t.actorId === a.id);

/** A vampire's own ghouls, people and beasts. */
export const ghoulsOf = vamp => [...(game.actors ?? [])].filter(a => lineOf(a) === "ghoul" && domitorOf(a)?.id === vamp?.id && !a.getFlag(MODULE_ID, "grafted"));

async function raiseDisciplines(actor, want) {
  for ( const [d, v] of Object.entries(want) ) {
    const have = disciplinesOf(actor).find(x => x.name.toLowerCase() === d.toLowerCase());
    if ( have && have.value >= v ) continue;
    if ( have ) await actor.items.get(have.id).update({"system.value": v, "system.level": v});
    else await actor.createEmbeddedDocuments("Item", [disciplineItem(d, v)]);
  }
}

/* -------------------------------------------- */
/*  Fleshcraft                                  */
/* -------------------------------------------- */

/** Start a fleshcraft long task on the crafter's sheet (B5133, B5069). what: "szlachta" or "vozhd". */
export async function startCraft(crafter, what, subject = null) {
  const st = storyteller(), c = AK.CRAFT[what];
  if ( !c ) return null;
  if ( !st?.tasks?.save ) { ui.notifications.warn("Fleshcraft as a long task needs WoDX Storyteller."); return null; }
  if ( !AK.canCraft(what, dots(crafter, "Vicissitude")) ) { ui.notifications.warn(`${c.label} needs Vicissitude ${c.need}.`); return null; }
  if ( what === "szlachta" && (!subject || lineOf(subject) !== "ghoul" || subject.getFlag(MODULE_ID, "szlachta")) ) { ui.notifications.warn("Only a ghoul not yet remade can become a szlachta."); return null; }
  if ( what === "vozhd" && ghoulsOf(crafter).length < AK.VOZHD.ghouls ) { ui.notifications.warn(`A vozhd takes ${AK.VOZHD.ghouls} of ${crafter.name}'s own ghouls; ${ghoulsOf(crafter).length} serve now.`); return null; }
  const name = what === "vozhd" ? `${c.label} from ${AK.VOZHD.ghouls} ghouls` : `${c.label}: ${subject.name}`;
  const task = await st.tasks.save(crafter, {kind: "other", name, attr: c.attr, ability: c.ability, diff: c.diff, goal: c.goal, interval: c.interval,
    target: subject ? {id: subject.id, name: subject.name} : null,
    note: `Dexterity + Medicine, difficulty ${c.diff}, a roll a week, ${c.goal} successes. When it is done the change happens by itself (${what === "vozhd" ? AK.VOZHD.ref : AK.SZLACHTA.ref}).`,
    opts: {fleshcraft: what}});
  if ( task ) ui.notifications.info(`${crafter.name} begins: ${name}. It shows in the long tasks.`);
  return task;
}

/** Remake a ghoul as a szlachta (B5133). */
export async function makeSzlachta(ghoul, crafter = null) {
  const animal = isAnimal(ghoul);
  const r = AK.szlachtaPatch(ghoul.system ?? {}, {animal});
  await ghoul.update({...r.patch, [`flags.${MODULE_ID}.szlachta`]: {by: crafter?.id ?? null, animal}});
  await raiseDisciplines(ghoul, r.disciplines);
  if ( r.flaw && ![...ghoul.items].some(i => i.type === "Feature" && /monstrous/i.test(i.name)) ) {
    await ghoul.createEmbeddedDocuments("Item", [{name: "Monstrous", type: "Feature", system: {type: "wod.types.flaw", value: 3, level: "3"}}]);
  }
  // A war beast stands larger
  for ( const t of game.scenes.contents.flatMap(s => [...s.tokens].filter(x => x.actorId === ghoul.id)) ) await t.update({width: Math.max(1, t.width) + (animal ? 0.5 : 0), height: Math.max(1, t.height) + (animal ? 0.5 : 0)});
  await ChatMessage.create({speaker: {alias: "Fleshcraft"}, whisper: game.users.filter(u => u.isGM || ghoul.testUserPermission(u, "OWNER") || crafter?.testUserPermission?.(u, "OWNER")).map(u => u.id),
    content: `<div class="wodx-card wodx-fleshcraft"><h3>${esc(ghoul.name)} is a szlachta</h3><p>${animal ? "Twisted larger and harder: a dot more Strength, Stamina, Perception and Brawl, and Fortitude." : "Remade to the war ghoul's traits, Monstrous, with Fortitude and Potence."} It can never go back among people.</p><p class="wodx-quiet">${AK.SZLACHTA.ref}</p></div>`});
  return ghoul;
}

/** Graft fifteen of a vampire's ghouls into a vozhd (B5069). The ghouls are spent, not deleted: each is marked dead. */
export async function makeVozhd(crafter) {
  const list = ghoulsOf(crafter).slice(0, AK.VOZHD.ghouls);
  if ( list.length < AK.VOZHD.ghouls ) throw new Error(`${crafter.name} has only ${list.length} ghouls`);
  const sys = {"system.settings.variant": "general", "system.advantages.willpower.permanent": AK.VOZHD.willpower, "system.advantages.willpower.temporary": AK.VOZHD.willpower,
    "system.settings.hasbloodpool": true, "system.settings.powers.hasdisciplines": true, "system.settings.powers.haspowers": true,
    "system.advantages.bloodpool.max": AK.VOZHD.blood, "system.advantages.bloodpool.temporary": AK.VOZHD.blood};
  for ( const [k, v] of Object.entries(AK.VOZHD.attributes) ) sys[`system.attributes.${k}.value`] = v;
  for ( const [k, v] of Object.entries(AK.VOZHD.abilities) ) { sys[`system.abilities.${k}.value`] = v; sys[`system.abilities.${k}.isvisible`] = true; }
  const v = await Actor.create({name: `Vozhd of ${crafter.name}`, type: CONFIG.worldofdarkness?.sheettype?.creature ?? "Creature",
    prototypeToken: {width: 3, height: 3, actorLink: true, disposition: CONST.TOKEN_DISPOSITIONS?.HOSTILE ?? -1},
    flags: {[MODULE_ID]: {vozhd: {by: crafter.id, from: list.map(a => a.id)}, lineage: {domitor: {id: crafter.id, name: crafter.name}}}}});
  await v.update(sys);
  await raiseDisciplines(v, AK.VOZHD.disciplines);
  // All fifteen at once: the grafted mark, the dead mark, and their tokens hidden on every scene
  await Actor.updateDocuments(list.map(g => ({_id: g.id, [`flags.${MODULE_ID}.grafted`]: v.id})));
  await Promise.all(list.map(g => Promise.resolve(g.toggleStatusEffect?.("dead", {active: true, overlay: true})).catch(() => null)));
  const ids = new Set(list.map(g => g.id));
  for ( const s of game.scenes ) {
    const toks = [...s.tokens].filter(t => ids.has(t.actorId)).map(t => ({_id: t.id, hidden: true}));
    if ( toks.length ) await s.updateEmbeddedDocuments("Token", toks);
  }
  await ChatMessage.create({speaker: {alias: "Fleshcraft"}, whisper: gmIds(),
    content: `<div class="wodx-card wodx-fleshcraft"><h3>A vozhd is made</h3><p>${esc(crafter.name)} has grafted ${list.length} ghouls into one: @UUID[Actor.${v.id}]{${esc(v.name)}}. Animalism, Dominate and Presence have no hold on it, and it eats anything in its path. The ghouls it was made from are gone into it.</p><p>Nothing that size stays hidden: the town will hear of it.</p><p class="wodx-quiet">${AK.VOZHD.ref}</p></div>`});
  try { await actions()?.history?.(crafter, "Grafted fifteen ghouls into a vozhd", "deed"); } catch (e) { /* no log */ }
  try { await actions()?.revealed?.(crafter, {event: "made a vozhd", ask: true}); } catch (e) { /* no Masquerade ledger */ }
  return v;
}

async function onTaskDone({actor, task} = {}) {
  if ( !isActiveGM() || task?.status !== "done" || !task?.opts?.fleshcraft ) return;
  if ( task.opts.fleshcraft === "szlachta" ) { const g = game.actors.get(task.target?.id); if ( g && !g.getFlag(MODULE_ID, "szlachta") ) await makeSzlachta(g, actor); }
  if ( task.opts.fleshcraft === "vozhd" && actor ) await makeVozhd(actor);
}

/* -------------------------------------------- */
/*  Kennels                                     */
/* -------------------------------------------- */

export const kennelOf = a => a?.getFlag?.(MODULE_ID, "kennel") ?? null;
export async function setKennel(vamp, kind) {
  if ( !kind ) return vamp.unsetFlag(MODULE_ID, "kennel");
  if ( !AG.KINDS[kind] ) throw new Error("No such kind of animal");
  return vamp.setFlag(MODULE_ID, "kennel", {kind, last: 0});
}

/** Active GM, once a day: litters in the kennels (B5135). */
export async function kennelTick() {
  if ( !isActiveGM() ) return [];
  const d = dateNow();
  if ( !d ) return [];
  const born = [];
  for ( const v of game.actors ) {
    const k = kennelOf(v);
    if ( !k || lineOf(v) !== "vampire" ) continue;
    const count = ghoulsOf(v).filter(a => isAnimalGhoul(a) && animalKindOf(a) === k.kind).length;
    if ( !AK.litterDue(k, {count, year: d.year, month: d.month}) ) continue;
    await v.setFlag(MODULE_ID, "kennel", {...k, last: d.year});
    born.push(await bornInKennel(v, k.kind));
  }
  return born;
}

/** A young born in a vampire's kennel: trained, not yet a ghoul; its first drink fills it. */
async function bornInKennel(vamp, kind) {
  const owners = Object.fromEntries(game.users.filter(u => !u.isGM && vamp.testUserPermission(u, "OWNER")).map(u => [u.id, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER]));
  const young = await Actor.create({name: `${AG.KINDS[kind].label}, bred in ${vamp.name}'s kennel`, type: CONFIG.worldofdarkness?.sheettype?.creature ?? "Creature",
    ownership: {default: 0, ...owners}, flags: {[MODULE_ID]: {animal: {kind, training: "trained", bred: vamp.id}}}});
  const S = game.modules.get(MODULE_ID).api.animals.stock;
  const stats = S.statsFor(kind, {training: "trained"});
  const up = {"system.settings.variant": "general", "system.advantages.willpower.permanent": stats.willpower, "system.advantages.willpower.temporary": stats.willpower};
  for ( const [k, val] of Object.entries(stats.attributes) ) up[`system.attributes.${k}.value`] = val;
  for ( const [k, val] of Object.entries(stats.abilities) ) { up[`system.abilities.${k}.value`] = val; up[`system.abilities.${k}.isvisible`] = true; }
  await young.update(up);
  await ChatMessage.create({speaker: {alias: "The kennel"}, whisper: game.users.filter(u => u.isGM || vamp.testUserPermission(u, "OWNER")).map(u => u.id),
    content: `<div class="wodx-card wodx-kennel"><h3>Born in ${esc(vamp.name)}'s kennel</h3><p>@UUID[Actor.${young.id}]{${esc(young.name)}}: bred from ghouled stock, it is born trained, and its first drink of vitae fills it.</p></div>`});
  return young;
}

/* -------------------------------------------- */
/*  Households                                  */
/* -------------------------------------------- */

/**
 * The beasts a vampire household keeps (B5136), made as that vampire's animal ghouls. Called by WoDX NPC's residents
 * when a household is seeded as a vampire's ghouls. at: {region (uuid), scene (uuid), folder (id), rural, seed}.
 */
export async function householdBeasts(vamp, at = {}) {
  if ( !game.user.isGM || lineOf(vamp) !== "vampire" ) return [];
  const d = dateNow();
  const kinds = AK.householdBeasts({clanId: clanOf(vamp)?.id ?? null, animalism: dots(vamp, "Animalism"), year: d?.year ?? null, rural: !!at.rural, seed: at.seed ?? vamp.id.length});
  const out = [];
  for ( const kind of kinds ) {
    const b = await makeBeast(vamp, {kind, training: "trained", dots: 1, retainer: false});
    const up = {"prototypeToken.actorLink": true, "flags.wodx-npc.behavior": {template: kind, household: `${vamp.name}'s beasts`}};
    if ( at.folder ) up.folder = at.folder;
    if ( at.region ) up["flags.wodx-npc.routine"] = {on: true, mode: null, preset: kind, age: null, roles: {home: at.region}, blocks: null};
    await b.update(up);
    out.push(b);
  }
  return out;
}

/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

const crafterNear = (tok, user = game.user) => {
  const grid = canvas?.grid?.size || 100;
  return (canvas?.tokens?.placeables ?? []).filter(t => t !== tok && t.actor && lineOf(t.actor) === "vampire" && dots(t.actor, "Vicissitude") >= AK.CRAFT.szlachta.need
    && (user.isGM || t.actor.testUserPermission?.(user, "OWNER")) && Math.hypot(t.center.x - tok.center.x, t.center.y - tok.center.y) <= REACH * grid);
};

let lastDay = -1;
export function registerAnimalKeepers() {
  Hooks.on("wodxTaskDone", e => { onTaskDone(e).catch(err => console.error(`${MODULE_ID} | fleshcraft`, err)); });
  Hooks.on("updateWorldTime", () => {
    const day = Math.floor((game.time?.worldTime ?? 0) / 86400);
    if ( day === lastDay ) return;
    lastDay = day;
    kennelTick().catch(e => console.error(`${MODULE_ID} | kennel`, e));
  });
  Hooks.on("renderTokenHUD", (hud, html) => {
    const root = html instanceof HTMLElement ? html : html?.[0];
    const tok = hud.object, col = root?.querySelector(".col.left");
    if ( !tok?.actor || !col ) return;
    const a = tok.actor;
    // On a ghoul: remake it. On a vampire with Vicissitude 5 and fifteen ghouls: graft a vozhd.
    const near = lineOf(a) === "ghoul" && !a.getFlag(MODULE_ID, "szlachta") ? crafterNear(tok) : [];
    const self = lineOf(a) === "vampire" && (game.user.isGM || a.isOwner) && AK.canCraft("vozhd", dots(a, "Vicissitude")) && ghoulsOf(a).length >= AK.VOZHD.ghouls;
    if ( !near.length && !self ) return;
    const b = document.createElement("div");
    b.className = "control-icon wodx-fleshcraft";
    b.dataset.tooltip = self && !near.length ? "Graft a vozhd" : `Remake ${tok.name} as a szlachta`;
    b.innerHTML = `<i class="fa-solid fa-hand-holding-droplet"></i>`;
    b.addEventListener("click", () => (self && !near.length ? startCraft(a, "vozhd") : startCraft(near[0].actor, "szlachta", a)).catch(e => ui.notifications.error(e.message)));
    col.appendChild(b);
  });
  Hooks.on("getActorContextOptions", (app, options) => {
    options.push({name: "Keep a kennel", icon: '<i class="fa-solid fa-dog"></i>',
      condition: li => { const a = game.actors.get(li?.dataset?.entryId ?? li?.data?.("entryId")); return game.user.isGM && lineOf(a) === "vampire"; },
      callback: async li => {
        const a = game.actors.get(li?.dataset?.entryId ?? li?.data?.("entryId"));
        const k = kennelOf(a)?.kind ?? "";
        const kind = await foundry.applications.api.DialogV2.prompt({window: {title: `${a.name}'s kennel`}, rejectClose: false, classes: ["wodx", "wodx-dialog"],
          content: `<p>Two or more of ${esc(a.name)}'s animal ghouls of the kind breed one young a year in their season, born trained.</p><div class="form-group"><label>Kind</label><select name="kind" data-fixed><option value="">No kennel</option>${Object.keys(AK.BREEDING).filter(x => AG.KINDS[x]).map(x => `<option value="${x}" ${x === k ? "selected" : ""}>${esc(AG.KINDS[x].label)}</option>`).join("")}</select></div>`,
          ok: {label: "Save", callback: (e, button) => button.form.elements.kind.value}});
        if ( kind !== null && kind !== undefined ) await setKennel(a, kind);
      }});
  });
}
