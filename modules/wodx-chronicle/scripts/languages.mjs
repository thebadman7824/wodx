import {MODULE_ID, esc, setting} from "./util.mjs";
import {searchBox} from "./search.mjs";
import {LANGUAGES, linguisticsAllows, languagesFromMerits, understands, scramble, parseInCommand, norm} from "./languages-rules.mjs";

/**
 * Languages in chat. Each character keeps the languages it speaks (flags["wodx-chronicle"].languages, the first one
 * native). A player picks the language their character speaks above the chat box, or types "/in Latin ...".
 * Readers whose characters lack the language see made-up words of the same length and the language's name; the
 * Storyteller and the speaker read it as written. This is a table aid, not a lock: the words are still in the
 * message's data.
 */

export function registerLanguageSettings() {
  game.settings.register(MODULE_ID, "languagesInChat", {
    name: "Languages in chat",
    hint: "Speech in a language a player's characters do not know shows as made-up words, with the language named.",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(MODULE_ID, "speaking", {scope: "client", config: false, type: String, default: ""});
}

const on = () => { try { return !!setting("languagesInChat"); } catch { return false; } };

/** The languages a character speaks. */
export function languagesOf(actor) {
  const l = actor?.flags?.[MODULE_ID]?.languages;
  return Array.isArray(l) ? l.filter(Boolean) : [];
}

export async function setLanguages(actor, list) {
  const clean = [];
  for ( const x of list ?? [] ) { const s = String(x).trim(); if ( s && !clean.some(c => norm(c) === norm(s)) ) clean.push(s); }
  return actor.update({[`flags.${MODULE_ID}.languages`]: clean});
}

/** Linguistics dots, from the sheet's ability or a Trait item of that name. */
export function linguisticsOf(actor) {
  const a = actor?.system?.abilities?.linguistics?.value;
  if ( Number.isFinite(Number(a)) && Number(a) > 0 ) return Number(a);
  const item = [...(actor?.items ?? [])].find(i => /linguistics/i.test(i.name ?? ""));
  return Number(item?.system?.value) || 0;
}

/** Languages from Language Merits (V20 and the lines with no Linguistics Ability). */
export function meritLanguagesOf(actor) {
  return languagesFromMerits([...(actor?.items ?? [])].filter(i => i.type === "Feature" || i.type === "Trait").map(i => i.name));
}

/** The characters a user reads chat through: their assigned character and every actor they own. */
function charactersOf(user) {
  const out = new Set();
  if ( user?.character ) out.add(user.character);
  for ( const a of game.actors ?? [] ) if ( a.testUserPermission?.(user, "OWNER") && a.hasPlayerOwner ) out.add(a);
  return [...out];
}

/** Languages this user can choose to speak. */
export function speakable(user = game.user) {
  const seen = new Map();
  for ( const a of charactersOf(user) ) for ( const l of languagesOf(a) ) if ( !seen.has(norm(l)) ) seen.set(norm(l), l);
  return [...seen.values()];
}

/** Can this user read speech in this language? */
export function canRead(user, language, authorId) {
  if ( !language || user?.isGM || user?.id === authorId ) return true;
  return understands(charactersOf(user).map(languagesOf), language);
}

export function registerLanguageHooks() {
  // "/in Latin Pax tecum": one message in that language, whatever the chat box is set to
  Hooks.on("chatMessage", (log, message, chatData) => {
    if ( !on() ) return true;
    const known = [...speakable(), ...LANGUAGES.common, ...LANGUAGES.supernatural];
    const p = parseInCommand(message, known);
    if ( !p ) return true;
    const speaker = chatData?.speaker ?? ChatMessage.getSpeaker?.() ?? {};
    ChatMessage.create({content: esc(p.text), speaker, flags: {[MODULE_ID]: {language: p.language}}});
    return false;
  });

  // The chat box's language, for speech by a character
  Hooks.on("preCreateChatMessage", (doc, data, options, userId) => {
    if ( !on() || userId !== game.user.id ) return;
    if ( data.flags?.[MODULE_ID]?.language !== undefined || (data.rolls?.length) ) return;
    const lang = game.settings.get(MODULE_ID, "speaking");
    if ( !lang || !data.speaker?.actor ) return;
    if ( Object.keys(data.flags ?? {}).some(k => k !== "core") ) return; // a module's card, not speech
    doc.updateSource({[`flags.${MODULE_ID}.language`]: lang});
  });

  Hooks.on("renderChatMessageHTML", (message, el) => renderLanguage(message, el?.[0] ?? el));

  Hooks.on("renderChatLog", (app, html) => installPicker(html?.[0] ?? html));
  Hooks.on("updateActor", () => { const el = document.querySelector?.(".wodx-speaking"); if ( el ) refreshPicker(el); });
}

/** Dress a message for this reader. */
export function renderLanguage(message, el) {
  const lang = message?.flags?.[MODULE_ID]?.language;
  if ( !lang || !el || !on() ) return;
  const body = el.querySelector(".message-content");
  if ( !body ) return;
  const authorId = message.author?.id ?? message.author ?? message.user?.id;
  const read = canRead(game.user, lang, authorId);
  if ( !read ) {
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while ( walker.nextNode() ) nodes.push(walker.currentNode);
    for ( const n of nodes ) n.nodeValue = scramble(n.nodeValue, lang);
  }
  const tag = document.createElement("div");
  tag.className = `wodx-language ${read ? "is-known" : "is-unknown"}`;
  tag.textContent = read ? `In ${lang}` : `In ${lang}, which your character does not speak`;
  body.prepend(tag);
}

function installPicker(root) {
  if ( !root?.querySelector || !on() ) return;
  const box = root.querySelector("#chat-message, textarea[name=content]")?.closest("form") ?? root.querySelector(".chat-form");
  if ( !box || box.querySelector(".wodx-speaking") ) return;
  const wrap = document.createElement("div");
  wrap.className = "wodx-speaking";
  box.prepend(wrap);
  refreshPicker(wrap);
}

function refreshPicker(wrap) {
  // A text box with suggestions: typing narrows the list, so a long list needs no separate search box
  const langs = game.user.isGM ? [...new Set([...speakable(), ...LANGUAGES.common, ...LANGUAGES.supernatural])] : speakable();
  const current = game.settings.get(MODULE_ID, "speaking");
  wrap.innerHTML = `<label><i class="fa-solid fa-language" inert></i> Speaking
    <input type="text" name="wodxSpeaking" list="wodx-speaking-names" value="${esc(current)}" placeholder="no set language" aria-label="Language your character speaks"></label>
    <datalist id="wodx-speaking-names">${langs.map(l => `<option value="${esc(l)}"></option>`).join("")}</datalist>`;
  wrap.querySelector("input").addEventListener("change", ev => game.settings.set(MODULE_ID, "speaking", String(ev.target.value).trim()));
}

const {ApplicationV2} = foundry.applications?.api ?? {ApplicationV2: class {}};

/** Who speaks what: every character the user owns (all player characters and any selected tokens for the Storyteller). */
export class LanguagesApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-languages",
    tag: "form",
    classes: ["wodx", "wodx-languages"],
    window: {title: "Languages", icon: "fa-solid fa-language", resizable: true},
    position: {width: 520, height: "auto"},
    form: {handler: LanguagesApp.#onSubmit, closeOnSubmit: true}
  };

  static #instance;
  static open() {
    this.#instance ??= new LanguagesApp();
    return this.#instance.render({force: true});
  }

  static actors() {
    const out = new Set();
    for ( const a of game.actors ?? [] ) if ( a.hasPlayerOwner && a.testUserPermission?.(game.user, "OWNER") ) out.add(a);
    if ( game.user.isGM ) for ( const t of globalThis.canvas?.tokens?.controlled ?? [] ) if ( t.actor ) out.add(t.actor);
    return [...out].sort((a, b) => a.name.localeCompare(b.name));
  }

  async _renderHTML() {
    const all = [...LANGUAGES.common, ...LANGUAGES.supernatural];
    const rows = LanguagesApp.actors().map(a => {
      const list = languagesOf(a);
      const dots = linguisticsOf(a);
      const merits = meritLanguagesOf(a);
      const allow = linguisticsAllows(dots) + merits;
      const over = list.length - 1 > allow;
      return `<div class="form-group wodx-language-row" data-search-item data-search-text="${esc(`${a.name} ${list.join(" ")}`)}">
        <label>${esc(a.name)}</label>
        <div class="form-fields"><input type="text" name="${esc(a.id)}" value="${esc(list.join(", "))}" list="wodx-language-names" placeholder="Native language first, then the others" aria-label="Languages of ${esc(a.name)}"></div>
        <p class="hint">${dots ? `Linguistics ${dots}` : "No Linguistics"}${merits ? `, Language Merits ${merits}` : ""}: ${allow} beyond the native tongue.${over ? " <strong>More than the sheet gives.</strong>" : ""}</p></div>`;
    }).join("");
    const div = document.createElement("div");
    div.className = "wodx-body";
    div.innerHTML = `<div class="wodx-top">${searchBox(".wodx-language-list", "Search characters…", "Search characters")}
        <p class="hint">Languages are separated by commas, native first. In chat, pick the language above the message box or type /in Latin and then the words.</p></div>
      <datalist id="wodx-language-names">${all.map(l => `<option value="${esc(l)}"></option>`).join("")}</datalist>
      <div class="wodx-scroll wodx-language-list">${rows || `<p class="wodx-quiet">${game.user.isGM ? "No player characters yet. Select tokens to set the languages of NPCs." : "You have no character yet."}</p>`}</div>
      <footer class="form-footer wodx-footer"><button type="submit"><i class="fa-solid fa-floppy-disk"></i> Save languages</button></footer>`;
    return div;
  }

  _replaceHTML(result, content) { content.replaceChildren(result); }

  static async #onSubmit(event, form) {
    for ( const a of LanguagesApp.actors() ) {
      const field = form.elements[a.id];
      if ( !field ) continue;
      const list = String(field.value).split(",").map(s => s.trim()).filter(Boolean);
      if ( list.join("|") !== languagesOf(a).join("|") ) await setLanguages(a, list);
    }
  }
}
