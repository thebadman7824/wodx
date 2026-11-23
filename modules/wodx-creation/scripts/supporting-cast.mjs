/**
 * WoDX Creation: make the Dark Ages Storytellers Companion's supporting characters as sheets (B7695). GM only.
 * A mortal is a Mortal sheet; a ghoul is a mortal made a ghoul (makeGhoul) with the template's Potence; a Cainite is
 * built the way the Embrace builds one (embraceData), with the template's clan, Generation and Road, and one die of
 * blood (pdf p. 58). The tier comes from the book's table; supporting-cast-rules.mjs places the dots.
 */
import {MODULE_ID, esc, disciplinesOf, disciplineItem} from "./actor-data.mjs";
import {TEMPLATES, GROUPS, TIERS, SHORT} from "../data/dasc-templates.mjs";
import * as SC from "./supporting-cast-rules.mjs";
import * as BR from "./book-people-rules.mjs";
import {embraceData, makeGhoul} from "./change-of-state.mjs";

const FOLDER = "WoDX · Supporting characters (Dark Ages)";
const MORAL = ["conscience", "conviction", "selfcontrol", "instinct"];
const PAIR = {conscience: "conviction", conviction: "conscience", selfcontrol: "instinct", instinct: "selfcontrol"};

const uniform = () => (globalThis.CONFIG?.Dice?.randomUniform ?? Math.random)();

/** Show the Virtues the template uses and hide their pair (Conscience or Conviction, Self-Control or Instinct). */
function virtueUpdate(virtues) {
  const u = {};
  for ( const k of MORAL ) {
    if ( virtues[k] !== undefined ) u[`system.advantages.virtues.${k}.isvisible`] = true;
    else if ( virtues[PAIR[k]] !== undefined ) Object.assign(u, {[`system.advantages.virtues.${k}.isvisible`]: false,
      [`system.advantages.virtues.${k}.permanent`]: 0, [`system.advantages.virtues.${k}.temporary`]: 0});
  }
  return u;
}

async function folderOf() {
  let folder = game.folders.find(f => f.type === "Actor" && f.name === FOLDER);
  if ( !folder ) folder = await Folder.create({name: FOLDER, type: "Actor", color: "#3b2a4a"});
  return folder;
}

/** Make one template at one tier ("base", "experienced", "exceptional"). Returns the Actor. */
export async function makeSupporting(key, tier = "base") {
  if ( !game.user.isGM ) return null;
  const b = SC.build(key, tier);
  if ( !b ) return null;
  const folder = await folderOf();
  const flags = {[MODULE_ID]: {supporting: {key: b.key, tier: b.tier}}};
  let actor;
  if ( b.line === "vampire" ) {
    const temp = new Actor.implementation({name: b.name, type: "Mortal"});
    const {data} = embraceData(temp, {clanName: b.clan, generation: b.generation, startBlood: Math.ceil(uniform() * 10) || 1});
    data.name = b.name;
    data.folder = folder.id;
    data.flags = foundry.utils.mergeObject(data.flags ?? {}, flags);
    actor = await Actor.create(data);
  } else {
    actor = await Actor.create({name: b.name, type: "Mortal", folder: folder.id, flags});
  }
  const plan = BR.planOf(SC.asPerson(b), Object.keys(actor.system?.abilities ?? {}));
  plan.update["system.concept"] = `${b.group}${b.tier === "base" ? "" : `, ${TIERS[b.tier].label.toLowerCase()}`}`;
  if ( b.line === "vampire" ) Object.assign(plan.update, {"system.advantages.path.label": "custom", "system.advantages.path.custom": b.road.name});
  Object.assign(plan.update, virtueUpdate(b.virtues));
  const notes = [`<p><strong>${esc(b.group)}.</strong> ${esc(b.about)}</p>`, ...b.notes.map(n => `<p>${esc(n)}</p>`),
    `<p class="wodx-quiet">${esc(b.ref)}${b.tier === "base" ? "" : `; ${TIERS[b.tier].label} version from the table on pdf p. 58, dots placed by WoDX`}</p>`];
  plan.update["system.notes"] = notes.join("");
  // The system's create helper resets Willpower, so everything is written after the sheet exists
  await actor.update(plan.update);
  const items = [];
  for ( const s of plan.secondary ) {
    const it = actor.items.find(i => i.type === "Trait" && /secondability$/.test(i.system?.type ?? "") && BR.keyOf(i.name) === s.key);
    if ( it ) await it.update({"system.value": s.value});
    else items.push({name: s.name, type: "Trait", system: {type: `wod.types.${s.group}secondability`, value: s.value, max: 5}});
  }
  for ( const bg of plan.backgrounds ) items.push({name: bg.name, type: "Feature", system: {type: "wod.types.background", value: bg.value}});
  if ( items.length ) await actor.createEmbeddedDocuments("Item", items);
  if ( b.line === "ghoul" ) await makeGhoul(actor, {points: 1});
  // The template's Disciplines: raise the ones the sheet has, add the rest
  const have = disciplinesOf(actor);
  const add = [];
  for ( const [name, value] of Object.entries(b.disciplines) ) {
    const d = have.find(x => x.name.toLowerCase() === name.toLowerCase());
    if ( d ) await actor.items.get(d.id)?.update({"system.value": value, "system.level": value});
    else add.push(disciplineItem(name, value));
  }
  if ( add.length ) await actor.createEmbeddedDocuments("Item", add);
  return actor;
}

/** The Storyteller's window: pick templates and a version, and make them. */
export async function supportingCastDialog() {
  if ( !game.user.isGM ) return ui.notifications.warn("The Storyteller makes supporting characters.");
  const {DialogV2} = foundry.applications.api;
  const groups = GROUPS.map(g => `<optgroup label="${esc(g)}">${TEMPLATES.filter(t => t.group === g).map(t => `<option value="${t.key}">${esc(t.name)}${t.clan ? ` (${esc(t.clan)})` : ""}</option>`).join("")}</optgroup>`).join("");
  const tiers = Object.entries(TIERS).map(([k, t]) => `<option value="${k}">${esc(t.label)}</option>`).join("");
  const res = await DialogV2.prompt({classes: ["wodx", "wodx-dialog", "wodx-supporting"], window: {title: "Supporting characters (Dark Ages)"}, rejectClose: false,
    content: `<p>The supporting-character templates of the ${esc(SHORT)} (pdf pp. 58-61). Pick one or more (Ctrl or Shift) and a version.
      Experienced and exceptional add the book's dots to the traits each template already has; move them on the sheet if you like.</p>
      <div class="form-group"><select name="who" multiple size="14" data-fixed>${groups}</select></div>
      <div class="form-group"><label>Version</label><select name="tier">${tiers}</select></div>`,
    ok: {label: "Make", callback: (event, button) => ({keys: [...button.form.elements.who.selectedOptions].map(o => o.value), tier: button.form.elements.tier.value})}});
  const made = [];
  for ( const k of res?.keys ?? [] ) { const a = await makeSupporting(k, res.tier); if ( a ) made.push(a); }
  if ( made.length ) await ChatMessage.create({speaker: {alias: "Chronicle"}, whisper: game.users.filter(u => u.isGM).map(u => u.id),
    content: `<div class="wodx-card"><h3>Supporting characters</h3><p>${made.map(a => `@UUID[${a.uuid}]{${esc(a.name)}}`).join(", ")}</p><p class="wodx-quiet">In the "${FOLDER}" folder (${esc(SHORT)} pdf pp. 58-61).</p></div>`});
  return made;
}
