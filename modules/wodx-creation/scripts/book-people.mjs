/**
 * WoDX Creation: make the Storyteller characters of V20 Dark Ages pp. 383-396 as sheets (B7674). GM only.
 * The window lists them by the book's groups; each sheet carries the book's numbers, WoDX's one-line description in
 * its notes, and the page.
 */
import {MODULE_ID, esc} from "./actor-data.mjs";
import {PEOPLE, GROUPS} from "../data/vtda-people.mjs";
import * as BR from "../../wodx-rules/creation/book-people-rules.mjs";

const FOLDER = "WoDX · People of the book (V20 Dark Ages)";

export async function makeBookPerson(key) {
  if ( !game.user.isGM ) return null;
  const p = BR.byKey(key);
  if ( !p ) return null;
  let folder = game.folders.find(f => f.type === "Actor" && f.name === FOLDER);
  if ( !folder ) folder = await Folder.create({name: FOLDER, type: "Actor", color: "#4a3b2a"});
  const actor = await Actor.create({name: p.name, type: "Mortal", folder: folder.id, flags: {[MODULE_ID]: {bookPerson: p.key}}});
  const plan = BR.planOf(p, Object.keys(actor.system?.abilities ?? {}));
  plan.update["system.notes"] = `<p><strong>${esc(p.group)}.</strong> ${esc(p.about)}</p><p class="wodx-quiet">${esc(BR.pageOf(p))}</p>`;
  // The system's create helper resets Willpower, so everything is written after the sheet exists
  await actor.update(plan.update);
  const items = [];
  for ( const s of plan.secondary ) {
    const it = actor.items.find(i => i.type === "Trait" && /secondability$/.test(i.system?.type ?? "") && BR.keyOf(i.name) === s.key);
    if ( it ) await it.update({"system.value": s.value});
    else items.push({name: s.name, type: "Trait", system: {type: `wod.types.${s.group}secondability`, value: s.value, max: 5}});
  }
  for ( const b of plan.backgrounds ) items.push({name: b.name, type: "Feature", system: {type: "wod.types.background", value: b.value}});
  if ( items.length ) await actor.createEmbeddedDocuments("Item", items);
  return actor;
}

/** The Storyteller's window: pick one or more of the book's people and make them. */
export async function bookPeopleDialog() {
  if ( !game.user.isGM ) return ui.notifications.warn("The Storyteller makes the book's people.");
  const {DialogV2} = foundry.applications.api;
  const groups = GROUPS.map(g => `<optgroup label="${esc(g)}">${PEOPLE.filter(p => p.group === g).map(p => `<option value="${p.key}">${esc(p.name)}${p.faith ? ` (True Faith ${p.faith})` : ""}</option>`).join("")}</optgroup>`).join("");
  const keys = await DialogV2.prompt({classes: ["wodx", "wodx-dialog"], window: {title: "People of the book (V20 Dark Ages)"}, rejectClose: false,
    content: `<p>The Storyteller characters of V20 Dark Ages pp. 383-396, with the book's numbers. Pick one or more (Ctrl or Shift).</p>
      <div class="form-group"><select name="who" multiple size="14" data-fixed>${groups}</select></div>`,
    ok: {label: "Make", callback: (event, button) => [...button.form.elements.who.selectedOptions].map(o => o.value)}});
  const made = [];
  for ( const k of keys ?? [] ) { const a = await makeBookPerson(k); if ( a ) made.push(a); }
  if ( made.length ) await ChatMessage.create({speaker: {alias: "Chronicle"}, whisper: game.users.filter(u => u.isGM).map(u => u.id),
    content: `<div class="wodx-card"><h3>People of the book</h3><p>${made.map(a => `@UUID[${a.uuid}]{${esc(a.name)}}`).join(", ")}</p><p class="wodx-quiet">In the "${FOLDER}" folder (V20 Dark Ages pp. 383-396).</p></div>`});
  return made;
}
