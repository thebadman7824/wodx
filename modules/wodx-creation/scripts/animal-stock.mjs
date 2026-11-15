/**
 * Ghouled animals, step three (B5058 to B5064), the Foundry side. The rules are in animal-stock-rules.mjs.
 *   - Train: a token menu button next to a character with Animal Ken starts a long task (WoDX Storyteller); when it is
 *     done the animal is trained, by itself, and the token shows it. Training can also be bought with experience
 *     from the animal's Improve panel (actor-data trainingOption).
 *   - Animal retainers: on the wizard's Backgrounds page a vampire with Retainers picks a kind, a land and a breed,
 *     and the beast is made, bonded, fed and given to the player, ready for the first night. Dots put together into
 *     one beast wait for the Storyteller's leave (the approval queue), then the beast is made by itself.
 */
import {MODULE_ID, esc, lineOf, isAnimal, animalKindOf, applyTraining, disciplinesOf, disciplineItem} from "./actor-data.mjs";
import * as AG from "./animal-ghoul-rules.mjs";
import * as AS from "./animal-stock-rules.mjs";
import {makeGhoul} from "./change-of-state.mjs";
import {setLineage} from "./lineage.mjs";
import {getEngine} from "../../wodx-chronicle/scripts/calendar.mjs";

export const RETAINER_TYPE = "wodx-animal-retainer";
const SOCKET = `module.${MODULE_ID}`;
const REACH = 1.5;
const chronicle = () => game.modules.get("wodx-chronicle")?.api;
const storyteller = () => game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api : null;
const isActiveGM = () => game.user?.isGM && game.users?.activeGM?.id === game.user.id;
const yearNow = () => { try { return getEngine().timeToDate(game.time?.worldTime ?? 0).year; } catch (e) { return null; } };
const n = v => Math.max(0, Math.trunc(Number(v) || 0));

function float(tokenDoc, text, fill = "#d8c58a") {
  const t = tokenDoc?.object;
  if ( !t ) return;
  try { canvas.interface?.createScrollingText?.(t.center, text, {anchor: CONST.TEXT_ANCHOR_POINTS?.TOP, fill, stroke: "#1a1206", strokeThickness: 4, fontSize: 26, duration: 2200}); } catch (e) { /* no canvas */ }
}
const tokensOf = a => (canvas?.scene?.tokens ?? []).filter(t => t.actorId === a.id);

/* -------------------------------------------- */
/*  Training                                    */
/* -------------------------------------------- */

const animalKenOf = a => n(a?.system?.abilities?.animalken?.value);

/** Characters this user may train with, near the animal's token: anyone with Animal Ken. */
export function trainersNear(tok, user = game.user) {
  const grid = canvas?.grid?.size || 100;
  return (canvas?.tokens?.placeables ?? []).filter(t => t !== tok && t.actor && !isAnimal(t.actor) && animalKenOf(t.actor) > 0
    && (user.isGM || t.actor.testUserPermission?.(user, "OWNER"))
    && Math.hypot(t.center.x - tok.center.x, t.center.y - tok.center.y) <= REACH * grid);
}

/** The next step this animal can be trained to, or null. */
export function nextStep(animal) {
  const kind = animalKindOf(animal);
  return kind ? AS.nextTraining(kind, AS.trainingOf(animal.getFlag?.(MODULE_ID, "animal"))) : null;
}

/** Start the long task that trains an animal one step, on the trainer's sheet (B5060). */
export async function startTraining(animal, trainer) {
  const st = storyteller();
  if ( !st?.tasks?.save ) { ui.notifications.warn("Training as a long task needs WoDX Storyteller. It can still be bought with experience."); return null; }
  const next = nextStep(animal);
  if ( !next ) { ui.notifications.info(`${animal.name} has all the training it can take.`); return null; }
  const open = st.tasks.of(trainer).find(t => t.status === "open" && t.opts?.animalTraining && t.target?.id === animal.id);
  if ( open ) { ui.notifications.info(`${trainer.name} is already training ${animal.name}.`); return open; }
  const T = AS.TRAIN_TASK;
  const task = await st.tasks.save(trainer, {kind: "train", name: `Train ${animal.name}: ${AS.TRAINING[next].label.toLowerCase()}`, attr: T.attr, ability: T.ability,
    diff: T.diff, goal: AS.TRAINING[next].goal, interval: T.interval, target: {id: animal.id, name: animal.name},
    note: `Manipulation + Animal Ken, difficulty ${T.diff}, a roll a week. When it is done ${animal.name} is ${AS.TRAINING[next].label.toLowerCase()} by itself.`,
    opts: {animalTraining: next}});
  if ( task ) ui.notifications.info(`${trainer.name} starts training ${animal.name}. It shows in ${trainer.name}'s long tasks.`);
  return task;
}

/** A long task ended: an animal's training takes hold (B5060). */
async function onTaskDone({actor, task} = {}) {
  if ( !isActiveGM() || task?.status !== "done" || !task?.opts?.animalTraining ) return;
  const animal = game.actors.get(task.target?.id);
  if ( !animal ) return;
  const level = task.opts.animalTraining;
  const kind = animalKindOf(animal);
  if ( !kind || AS.TRAINING[level].rank <= AS.TRAINING[AS.trainingOf(animal.getFlag(MODULE_ID, "animal"))].rank ) return;
  await applyTraining(animal, level);
  for ( const t of tokensOf(animal) ) float(t, AS.TRAINING[level].label);
  await ChatMessage.create({speaker: {alias: "Training"}, whisper: game.users.filter(u => u.isGM || animal.testUserPermission(u, "OWNER") || actor?.testUserPermission?.(u, "OWNER")).map(u => u.id),
    content: `<div class="wodx-card wodx-animal-training"><h3>${esc(animal.name)} is ${esc(AS.TRAINING[level].label.toLowerCase())}</h3><p>${esc(actor?.name ?? "Its trainer")} has finished the work. ${esc(trainedSays(kind, level))}</p><p class="wodx-quiet">V20 Dark Ages p. 396</p></div>`});
}

function trainedSays(kind, level) {
  const st = AS.STATS[kind];
  const bits = Object.entries(st?.trained ?? {}).map(([k, v]) => `${k === "animalken" ? "Animal Ken" : k[0].toUpperCase() + k.slice(1)} ${v}`);
  if ( level === "war" ) return "It no longer shies in a fight, can strike for its rider on its own, and gains a dot of Brawl.";
  return `${bits.length ? `It now has ${bits.join(", ")}. ` : ""}It keeps its Willpower and wins it back as a person does, and answers trained commands.`;
}

/* -------------------------------------------- */
/*  Making a beast                              */
/* -------------------------------------------- */

/**
 * Active GM: make an animal ghoul for a vampire (B5062). spec: {kind, breed, zone, training, dots, name}.
 * The beast gets the book's traits for its kind, its breed's nudges, Potence and any extra Disciplines, a full pool,
 * the full bond to its domitor, a fresh month's feeding, and its domitor's players as owners.
 */
export async function makeBeast(domitor, spec = {}) {
  if ( !game.user.isGM ) throw new Error("Only the Storyteller's side can make the beast");
  if ( lineOf(domitor) !== "vampire" ) throw new Error(`${domitor?.name ?? "That character"} is not a vampire`);
  const kind = AG.KINDS[spec.kind] ? spec.kind : null;
  if ( !kind ) throw new Error("Pick a kind of animal");
  const b = AS.breed(kind, spec.breed);
  const training = spec.training === "trained" ? "trained" : "untrained";
  const dots = Math.max(1, Math.min(AS.MAX_RETAINER_DOTS, n(spec.dots) || 1));
  const stats = AS.statsFor(kind, {breedKey: b?.key ?? null, training});
  const coat = b?.coats?.length ? b.coats[Math.floor(Math.random() * b.coats.length)] : null;
  const owners = Object.fromEntries(game.users.filter(u => !u.isGM && domitor.testUserPermission(u, "OWNER")).map(u => [u.id, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER]));
  const name = AS.beastName(AG.KINDS[kind].label, b?.label, spec.name);
  // The system fills in a new Creature's sheet as it is made; the beast's own traits go on after
  const beast = await Actor.create({name, type: CONFIG.worldofdarkness?.sheettype?.creature ?? "Creature",
    ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE, ...owners},
    flags: {[MODULE_ID]: {animal: {kind, breed: b?.key ?? null, coat, zone: AS.ZONES[spec.zone] ? spec.zone : null, training, ...(spec.retainer !== false ? {retainerOf: domitor.id} : {}), dots}}}});
  const sheet = {"system.settings.variant": "general", "system.advantages.willpower.permanent": stats.willpower, "system.advantages.willpower.temporary": stats.willpower};
  for ( const [k, v] of Object.entries(stats.attributes) ) sheet[`system.attributes.${k}.value`] = v;
  for ( const [k, v] of Object.entries(stats.abilities) ) { sheet[`system.abilities.${k}.value`] = v; sheet[`system.abilities.${k}.isvisible`] = true; }
  await beast.update(sheet);
  const t = game.time.worldTime;
  await makeGhoul(beast, {domitor, points: 1, time: t});
  const max = Number(beast.system?.advantages?.bloodpool?.max) || AG.animalBloodMax(kind, 0);
  await beast.update({"system.advantages.bloodpool.temporary": max});
  // Dots put together: more Disciplines (B5062)
  for ( const [d, add] of Object.entries(AS.extraDisciplines(dots)) ) {
    const have = disciplinesOf(beast).find(x => x.name.toLowerCase() === d.toLowerCase());
    const extra = d === "Potence" ? add - 1 : add;
    if ( extra <= 0 ) continue;
    if ( have ) await beast.items.get(have.id).update({"system.value": have.value + extra, "system.level": have.value + extra});
    else await beast.createEmbeddedDocuments("Item", [disciplineItem(d, extra)]);
  }
  // Bonded and fed: the full oath, and the month starts now
  await setLineage(beast, {bonds: {[domitor.id]: {name: domitor.name, drinks: 3, last: t}}});
  Hooks.callAll("wodxGhoulFix", {actor: beast, drank: true, by: domitor});
  // A beast a household keeps (B5136) is the domitor's ghoul, not a Retainers dot
  if ( spec.retainer !== false ) await domitor.setFlag(MODULE_ID, "animalRetainers", [...(domitor.getFlag(MODULE_ID, "animalRetainers") ?? []), {id: beast.id, dots}]);
  if ( spec.retainer !== false ) await ChatMessage.create({speaker: {alias: "Retainers"}, whisper: game.users.filter(u => u.isGM || domitor.testUserPermission(u, "OWNER")).map(u => u.id),
    content: `<div class="wodx-card wodx-animal-retainer"><h3>${esc(domitor.name)}'s ${esc(name)}</h3><p>${esc(AG.describe(kind))}.${b ? ` ${esc(b.label)}${coat ? `, ${esc(coat)}` : ""}.` : ""} ${training === "trained" ? "Trained." : "Untrained."} Bound to ${esc(domitor.name)} by the full oath and fed this night. ${dots > 1 ? `Made from ${dots} Retainers dots.` : ""}</p>
      <p>@UUID[Actor.${beast.id}]{Open the sheet}</p><p class="wodx-quiet">Traits: ${esc(stats.ref)}</p></div>`});
  return beast;
}

/** Retainers dots this vampire still has free for animals. */
export function dotsLeft(actor) {
  const r = [...(actor?.items ?? [])].find(i => i.type === "Feature" && i.system?.type === "wod.types.background" && i.name.trim().toLowerCase() === "retainers");
  const made = (actor?.getFlag?.(MODULE_ID, "animalRetainers") ?? []).filter(m => game.actors?.get(m.id));
  return AS.retainerDotsLeft(n(r?.system?.value), made);
}

/** Any client: ask for a beast. A single dot is made at once; dots put together wait for the Storyteller (B5062). */
export async function requestBeast(domitor, spec) {
  const left = dotsLeft(domitor), dots = Math.max(1, n(spec.dots) || 1);
  if ( dots > left ) return ui.notifications.warn(`Only ${left} Retainers dot${left === 1 ? "" : "s"} left for animals.`);
  if ( game.user.isGM ) return makeBeast(domitor, spec);
  if ( !game.users.activeGM ) return ui.notifications.warn("No Storyteller is connected, so this could not be sent.");
  game.socket.emit(SOCKET, {type: "animal.retainer", payload: {actorId: domitor.id, spec, userId: game.user.id}});
  ui.notifications.info(dots > 1 ? "Sent to the Storyteller: dots put together need their leave." : "The beast is being made.");
  return {sent: true};
}

/** Active GM: a player's request. */
export async function onRequest(payload) {
  if ( !isActiveGM() ) return;
  const user = game.users.get(payload?.userId), domitor = game.actors.get(payload?.actorId);
  if ( !user || !domitor || !domitor.testUserPermission(user, "OWNER") ) return;
  const spec = payload.spec ?? {}, dots = Math.max(1, n(spec.dots) || 1);
  if ( dots > dotsLeft(domitor) ) return;
  if ( dots === 1 ) return makeBeast(domitor, spec).catch(e => ui.notifications.error(e.message));
  const kind = AG.KINDS[spec.kind]?.label ?? "an animal";
  await chronicle()?.approvals?.addToQueue?.({
    id: foundry.utils.randomID(), type: RETAINER_TYPE, key: `beast:${domitor.id}:${spec.kind}`,
    title: `${domitor.name}: one tougher beast from ${dots} Retainers dots`,
    detail: `${kind}${spec.breed ? ` (${AS.breed(spec.kind, spec.breed)?.label ?? spec.breed})` : ""}. Each dot past the first gives it a dot of Fortitude, Celerity or Potence in turn. Approve and it is made, bonded and fed by itself.`,
    data: {actorId: domitor.id, spec}, from: user.id, createdAt: Date.now(), worldTime: game.time.worldTime
  });
}

/* -------------------------------------------- */
/*  The wizard's panel                          */
/* -------------------------------------------- */

const KIND_ORDER = Object.entries(AG.KINDS).sort((a, b) => a[1].label.localeCompare(b[1].label));

/** HTML for the Backgrounds page: animal retainers, for a vampire with Retainers dots free. */
export function wizardPanel(actor, lineId) {
  if ( lineId !== "vampire" && lineOf(actor) !== "vampire" ) return "";
  const left = dotsLeft(actor);
  const made = (actor.getFlag(MODULE_ID, "animalRetainers") ?? []).map(m => game.actors.get(m.id)).filter(Boolean);
  const list = made.length ? `<p>Made: ${made.map(a => `${esc(a.name)} (${esc(AG.describe(animalKindOf(a) ?? "stray-dog"))})`).join("; ")}.</p>` : "";
  if ( !left ) return made.length ? `<h4>Animal retainers</h4>${list}` : "";
  const year = yearNow();
  const breeds = KIND_ORDER.map(([k]) => AS.breedsFor(k, {year}).map(b => `<option value="${b.key}" data-kind="${k}" data-zones="${b.zones.join(" ")}">${esc(b.label)}</option>`).join("")).join("");
  return `<h4>Animal retainers</h4>
    <p>A Retainers dot can be a ghouled animal (V20 Dark Ages p. 182). ${left} dot${left === 1 ? "" : "s"} free. It is made with the book's traits for its kind, bonded to you by the full oath and fed, ready on the first night.</p>
    ${list}
    <div class="wodx-wz-animal">
      <div class="form-group"><label>Kind</label><select name="animal-kind" data-fixed>${KIND_ORDER.map(([k, v]) => `<option value="${k}">${esc(v.label)} (${esc(AG.SIZES[v.size].label.toLowerCase())}, ${AG.SIZES[v.size].blood} vitae)</option>`).join("")}</select></div>
      <div class="form-group"><label>From</label><select name="animal-zone" data-fixed><option value="">Anywhere</option>${Object.entries(AS.ZONES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select></div>
      <div class="form-group"><label>Breed</label><select name="animal-breed" data-fixed><option value="">None in particular</option>${breeds}</select></div>
      <div class="form-group"><label>Training</label><select name="animal-training" data-fixed><option value="trained">Trained (a kept beast)</option><option value="untrained">Untrained</option></select></div>
      <div class="form-group"><label>Dots</label><input type="number" name="animal-dots" min="1" max="${Math.min(left, AS.MAX_RETAINER_DOTS)}" value="1"><p class="notes">More than one makes a tougher beast, with the Storyteller's leave.</p></div>
      <div class="form-group"><label>Name</label><input type="text" name="animal-name" placeholder="Leave empty to name it by its breed"></div>
      <button type="button" data-action="animal"><i class="fa-solid fa-paw"></i> Make the animal</button>
    </div>`;
}

/** Wire the panel: the breed list shows only breeds of the kind and land picked. */
export function wirePanel(root) {
  const box = root?.querySelector?.(".wodx-wz-animal");
  if ( !box ) return;
  const kind = box.querySelector("[name=animal-kind]"), zone = box.querySelector("[name=animal-zone]"), breed = box.querySelector("[name=animal-breed]");
  const sync = () => {
    for ( const o of breed.options ) if ( o.value ) o.hidden = o.dataset.kind !== kind.value || (!!zone.value && !o.dataset.zones.split(" ").includes(zone.value));
    if ( breed.selectedOptions[0]?.hidden ) breed.value = "";
  };
  kind.addEventListener("change", sync); zone.addEventListener("change", sync); sync();
}

/** The panel's button. */
export async function fromPanel(actor, root) {
  const box = root?.querySelector?.(".wodx-wz-animal");
  if ( !box ) return null;
  const v = k => box.querySelector(`[name=animal-${k}]`)?.value ?? "";
  return requestBeast(actor, {kind: v("kind"), zone: v("zone"), breed: v("breed") || null, training: v("training"), dots: Number(v("dots")) || 1, name: v("name")});
}

/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

export function registerAnimalStock() {
  chronicle()?.registerApprovalHandler?.(RETAINER_TYPE, {label: "Animal retainers", approve: entry => {
    const d = game.actors.get(entry.data?.actorId);
    if ( !d ) throw new Error("That character is gone");
    return makeBeast(d, entry.data.spec);
  }});
  Hooks.on("wodxTaskDone", e => { onTaskDone(e).catch(err => console.error(`${MODULE_ID} | training`, err)); });
  Hooks.on("renderTokenHUD", (hud, html) => {
    const root = html instanceof HTMLElement ? html : html?.[0];
    const tok = hud.object, col = root?.querySelector(".col.left");
    if ( !tok?.actor || !col || !isAnimal(tok.actor) || !nextStep(tok.actor) ) return;
    const near = trainersNear(tok);
    if ( !near.length ) return;
    const next = nextStep(tok.actor);
    const b = document.createElement("div");
    b.className = "control-icon wodx-train-animal";
    b.dataset.tooltip = `Train ${esc(tok.name)}: ${AS.TRAINING[next].label.toLowerCase()}`;
    b.innerHTML = `<i class="fa-solid fa-bone"></i>`;
    b.addEventListener("click", async () => {
      let trainer = near[0];
      if ( near.length > 1 ) {
        const id = await foundry.applications.api.DialogV2.prompt({classes: ["wodx", "wodx-dialog"], window: {title: "Train an animal"}, rejectClose: false,
          content: `<div class="form-group"><label>Who trains it</label><select name="who" data-fixed>${near.map(t => `<option value="${t.id}">${esc(t.name)} (Animal Ken ${animalKenOf(t.actor)})</option>`).join("")}</select></div>`,
          ok: {label: "Start", callback: (e, button) => button.form.elements.who.value}});
        trainer = near.find(t => t.id === id);
      }
      if ( trainer ) await startTraining(tok.actor, trainer.actor).catch(e => ui.notifications.error(e.message));
    });
    col.appendChild(b);
  });
}
