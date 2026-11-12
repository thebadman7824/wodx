import {MODULE_ID} from "./ratings.mjs";
import * as S from "./spirit-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";
import {getEngine} from "../../wodx-chronicle/scripts/calendar.mjs";

/**
 * WoDX Otherworlds 0.14.0: standing with the spirit courts (B1320-B1324). The rules are in spirit-rules.mjs.
 * The Storyteller records what moves it; players see their own characters' standing in words.
 * WoDX Actions reads `api.spirits.effect(actor, court)` for summoning, the rites and learning a Gift from a spirit.
 */

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];
const clockYear = () => { try { return getEngine().timeToDate(game.time.worldTime).year; } catch (e) { return 1197; } };
const future = () => { try { return !!game.settings.get("wodx-chronicle", "rule.futureBranch"); } catch (e) { return false; } };

export const of = actor => S.normSpirits(actor?.flags?.[MODULE_ID]?.spirits);
export const standing = (actor, court) => of(actor).standing[court] ?? 0;
/** What standing does to a roll with a spirit of `court`: {diff, refuses, note}. No court: no change. */
export const effect = (actor, court) => (court && S.COURTS[court] ? S.effect(standing(actor, court)) : {diff: 0, refuses: false, note: ""});

/** Record a move (the Storyteller only). Returns the changes. */
export async function move(actor, key, opts = {}) {
  if ( !game.user.isGM || !actor ) return [];
  const {spirits, changes} = S.applyMove(of(actor), key, {...opts, at: game.time.worldTime});
  if ( !changes.length ) return [];
  await actor.update({[`flags.${MODULE_ID}.spirits`]: spirits});
  const name = c => (c === "totem" && spirits.totem ? spirits.totem : S.COURTS[c]);
  await ChatMessage.create({whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id), speaker: {alias: "The spirits"},
    content: `<div class="wodx-card"><h3>${esc(actor.name)} and the spirits</h3><ul>${changes.map(c => `<li>${esc(name(c.court))}: ${c.from} to ${c.to}, ${esc(S.band(c.to).word)}</li>`).join("")}</ul>${opts.why ? `<p class="wodx-quiet">${esc(opts.why)}</p>` : ""}</div>`});
  return changes;
}

export async function setTotem(actor, name) {
  if ( !game.user.isGM || !actor ) return;
  await actor.update({[`flags.${MODULE_ID}.spirits`]: {...of(actor), totem: String(name ?? "").slice(0, 80)}});
}

/** The courts as <option>s, for other modules' dialogs. */
export const courtOptions = (sel = "") => `<option value="">No court (standing does not count)</option>${Object.entries(S.COURTS).map(([k, v]) => `<option value="${k}"${k === sel ? " selected" : ""}>${esc(v)}</option>`).join("")}`;

/** Characters worth listing: those with a record, then the players' characters whose kind deals with spirits. */
function candidates() {
  return all(game.actors).filter(a => a.flags?.[MODULE_ID]?.spirits || (a.hasPlayerOwner && S.SPIRIT_TYPES.test(`${a.type} ${a.system?.settings?.variant ?? ""}`)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The window: one character's standing, and for the Storyteller the moves. */
export async function spiritsDialog(actor = canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character ?? null) {
  const {DialogV2} = foundry.applications.api;
  const gm = game.user.isGM;
  if ( !actor && gm ) {
    const list = candidates();
    if ( !list.length ) return ui.notifications.info("No one deals with the spirits yet. Select a token and try again.");
    const pick = await DialogV2.prompt({window: {title: "Standing with the spirits"}, rejectClose: false,
      content: `${list.length > 8 ? searchBox(".wodx-spirit-pick", "Find a character…", "Search characters") : ""}<div class="wodx-spirit-pick wodx-scroll">${list.map(a => `<label data-search-item data-search-text="${esc(a.name)}"><input type="radio" name="id" value="${a.id}"> ${esc(a.name)}</label>`).join("<br>")}</div>`,
      ok: {label: "Open", callback: (e, b) => b.form.elements.id?.value}});
    actor = game.actors.get(pick ?? "");
  }
  if ( !actor ) return ui.notifications.info("Select your character's token first.");
  if ( !gm && !actor.isOwner ) return;
  const s = of(actor);
  const notes = S.eraNotes(clockYear(), {future: future()});
  const rows = Object.entries(S.COURTS).map(([k, v]) => {
    const n = s.standing[k] ?? 0, e = S.effect(n);
    const label = k === "totem" && s.totem ? `${v}: ${s.totem}` : v;
    return `<tr><td>${esc(label)}</td><td>${esc(S.band(n).word)}${gm ? ` (${n > 0 ? "+" : ""}${n})` : ""}</td><td class="wodx-quiet">${gm ? esc(e.note || "no change") : ""}</td></tr>`;
  }).join("");
  const log = gm && s.log.length ? `<details><summary>What moved it (${s.log.length})</summary><ul>${[...s.log].reverse().map(x => `<li>${esc(S.COURTS[x.court])} ${x.by > 0 ? "+" : ""}${x.by}: ${esc(x.why)}</li>`).join("")}</ul></details>` : "";
  const era = gm ? `<details><summary>The courts in this era (house notes)</summary><ul>${Object.values(notes).map(t => `<li>${esc(t)}</li>`).join("")}</ul></details>` : "";
  const moves = gm ? `<hr><div class="form-group"><label>Record</label><select name="move" data-fixed>${Object.entries(S.MOVES).map(([k, m]) => `<option value="${k}">${esc(m.label)}</option>`).join("")}<option value="custom">Move one court by hand</option></select></div>
    <div class="form-group"><label>Court</label><select name="court" data-fixed>${Object.entries(S.COURTS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select></div>
    <div class="form-group"><label>By (by hand only)</label><input type="number" name="by" value="0" min="-10" max="10" step="1"></div>
    <div class="form-group"><label>Why</label><input type="text" name="why" maxlength="200" placeholder="what happened"></div>
    <div class="form-group"><label>The totem's name</label><input type="text" name="totem" value="${esc(s.totem)}" maxlength="80"></div>
    <p class="wodx-quiet">A house rule: standing runs from -5 to +5 and changes the difficulty to summon, learn a Gift from, or bind a spirit of that court.</p>` : "";
  const content = `<p><b>${esc(actor.name)}</b>${gm ? "" : ": how the spirits regard you, as far as you can tell"}.</p><table><tbody>${rows}</tbody></table>${log}${era}${moves}`;
  if ( !gm ) return DialogV2.prompt({window: {title: `The spirits: ${actor.name}`}, content, ok: {label: "Close"}, rejectClose: false});
  const data = await DialogV2.prompt({window: {title: `The spirits: ${actor.name}`}, content, rejectClose: false,
    ok: {label: "Record", callback: (e, b) => new foundry.applications.ux.FormDataExtended(b.form).object}});
  if ( !data ) return;
  if ( String(data.totem ?? "") !== s.totem ) await setTotem(actor, data.totem);
  if ( data.move !== "custom" || Number(data.by) ) await move(actor, data.move, {court: data.court, by: Number(data.by) || 0, why: data.why});
}
