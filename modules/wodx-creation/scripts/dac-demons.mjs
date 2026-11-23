/**
 * WoDX Creation: make the Dark Ages Companion's demons as sheets (B7698), Dark Ages Companion (2002) pp. 180-185.
 * GM only. Each is a Creature with blood, Disciplines and its paths, the book's health levels, and WoDX's description,
 * attack and page in its notes. B7702: the V20 Dark Ages Companion's four monsters too, in a folder of their own.
 */
import {MODULE_ID, esc, disciplineItem} from "./actor-data.mjs";
import {GROUPS} from "../data/dac-demons.mjs";
import {MONSTERS} from "../data/v20dac-monsters.mjs";
import * as DR from "./dac-demons-rules.mjs";
import {keyOf} from "./book-people-rules.mjs";

const FOLDER = "WoDX · Demons (Dark Ages Companion)";
const MONSTER_FOLDER = "WoDX · Monsters (V20 Dark Ages Companion)";
const MONSTER_GROUP = MONSTERS[0].group;
const PATH = "wod.types.disciplinepath";

export async function makeDemon(key) {
  if ( !game.user.isGM ) return null;
  const d = DR.byKey(key);
  if ( !d ) return null;
  const name = d.kind === "monster" ? MONSTER_FOLDER : FOLDER;
  let folder = game.folders.find(f => f.type === "Actor" && f.name === name);
  if ( !folder ) folder = await Folder.create({name, type: "Actor", color: "#5a1a1a"});
  const actor = await Actor.create({name: d.name, type: CONFIG.worldofdarkness?.sheettype?.creature ?? "Creature", folder: folder.id, img: d.kind === "monster" ? "icons/svg/eye.svg" : "icons/svg/terror.svg",
    prototypeToken: {actorLink: true, disposition: CONST.TOKEN_DISPOSITIONS?.HOSTILE ?? -1},
    flags: {[MODULE_ID]: {dacDemon: d.key}}});
  const p = DR.plan(d, Object.keys(actor.system?.abilities ?? {}));
  p.update["system.notes"] = `<p><strong>${esc(d.group)}.</strong> ${p.notes.map(esc).join(" ")}</p><p class="wodx-quiet">${esc(DR.pageOf(d))}</p>`;
  // The system's create helper resets Willpower, so everything is written after the sheet exists
  await actor.update(p.update);
  const items = [];
  for ( const s of p.secondary ) items.push({name: s.name, type: "Trait", system: {type: `wod.types.${s.group}secondability`, value: s.value, max: 5}});
  for ( const [name, v] of Object.entries(p.disciplines) ) items.push(disciplineItem(name, v));
  for ( const [name, v] of Object.entries(p.paths) ) items.push({name, type: "Power", system: {type: PATH, value: v, max: 5}});
  const have = new Set(actor.items.map(i => keyOf(i.name)));
  const fresh = items.filter(i => !have.has(keyOf(i.name)));
  if ( fresh.length ) await actor.createEmbeddedDocuments("Item", fresh);
  return actor;
}

/** The Storyteller's window: pick one or more of the Companion's demons and make them. */
export async function demonsDialog() {
  if ( !game.user.isGM ) return ui.notifications.warn("The Storyteller makes the demons.");
  const {DialogV2} = foundry.applications.api;
  const groups = [...GROUPS, MONSTER_GROUP].map(g => `<optgroup label="${esc(g)}">${DR.ALL.filter(d => d.group === g).map(d => `<option value="${d.key}">${esc(d.name)} (Willpower ${d.willpower}, blood ${d.blood})</option>`).join("")}</optgroup>`).join("");
  const keys = await DialogV2.prompt({classes: ["wodx", "wodx-dialog"], window: {title: "Demons of the Dark Ages Companion"}, rejectClose: false,
    content: `<p>The sample demons and bound demons of the Dark Ages Companion (2002) pp. 180-185, and the four monsters of the V20 Dark Ages Companion, with the books' numbers. Pick one or more (Ctrl or Shift).</p>
      <div class="form-group"><select name="who" multiple size="14" data-fixed>${groups}</select></div>`,
    ok: {label: "Make", callback: (event, button) => [...button.form.elements.who.selectedOptions].map(o => o.value)}});
  const made = [];
  for ( const k of keys ?? [] ) { const a = await makeDemon(k); if ( a ) made.push(a); }
  if ( made.length ) await ChatMessage.create({speaker: {alias: "Chronicle"}, whisper: game.users.filter(u => u.isGM).map(u => u.id),
    content: `<div class="wodx-card"><h3>Demons made</h3><p>${made.map(a => `@UUID[${a.uuid}]{${esc(a.name)}}`).join(", ")}</p><p class="wodx-quiet">In the "${FOLDER}" folder (DAC 2002 pp. 180-185) and the "${MONSTER_FOLDER}" folder (V20 DA Companion).</p></div>`});
  return made;
}
