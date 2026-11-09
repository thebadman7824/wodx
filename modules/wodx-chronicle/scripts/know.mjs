import {MODULE_ID, esc} from "./util.mjs";
import * as KR from "./know-rules.mjs";
import {LANGUAGES} from "./languages-rules.mjs";
import {languagesOf, meritLanguagesOf, charactersOf} from "./languages.mjs";

/**
 * Knowledge-gated handouts in Foundry: the @Know enricher. Each client draws the passage for its own user, so the
 * Storyteller sees everything (marked) and each player sees the words only if one of their characters qualifies.
 */

/** A character's traits for the gate: languages, and the dots of every Ability, Discipline or other rated trait. */
export function traitsOf(actor) {
  const dots = {};
  const put = (name, v) => { const k = KR.traitKey(name), n = Number(v); if ( k && Number.isFinite(n) && n > (dots[k] ?? 0) ) dots[k] = n; };
  for ( const [key, a] of Object.entries(actor?.system?.abilities ?? {}) ) put(a?.label ? game.i18n?.localize?.(a.label) ?? key : key, a?.value), put(key, a?.value);
  for ( const i of actor?.items ?? [] ) put(i.name, i.system?.value);
  return {languages: [...languagesOf(actor), ...meritLanguagesOf(actor)], dots};
}

const knownLanguages = () => Object.values(LANGUAGES ?? {}).flat().map(l => typeof l === "string" ? l : l?.name).filter(Boolean);

/** What a user sees of one passage. actors: the characters to read through (default: the user's own). */
export function render(spec, text, {user = game.user, actors = null} = {}) {
  const chars = actors ?? (user?.isGM ? [] : charactersOf(user));
  return KR.view(spec, text, {readers: chars.map(traitsOf), gm: !!user?.isGM && !actors, languages: knownLanguages()});
}

function element(match) {
  const v = render(match[1], match[2]);
  const span = document.createElement("span");
  span.classList.add("wodx-know", v.readable ? "wodx-know-yes" : "wodx-know-no");
  if ( v.script ) span.classList.add("wodx-know-script");
  if ( v.mark ) span.title = `Shown to characters with ${v.label}`;
  else if ( !v.readable ) span.title = `You cannot read this (${v.label})`;
  span.innerHTML = esc(v.text);
  return span;
}

export function registerKnow() {
  CONFIG.TextEditor ??= {};
  CONFIG.TextEditor.enrichers ??= [];
  if ( CONFIG.TextEditor.enrichers.some(e => e?.id === `${MODULE_ID}.know`) ) return;
  CONFIG.TextEditor.enrichers.push({id: `${MODULE_ID}.know`, pattern: new RegExp(KR.KNOW_PATTERN.source, "g"), enricher: async match => element(match)});
}
