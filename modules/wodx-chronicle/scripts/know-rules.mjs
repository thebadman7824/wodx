/**
 * Knowledge-gated handouts, the pure rules. In a journal, @Know[Latin]{text} shows the text only to a reader whose
 * character knows Latin; @Know[Occult 3]{text} needs three dots of Occult; @Know[Latin or Occult 2]{text} either one;
 * @Know[Auspex 2]{text} a letter read through its seal. Anyone else sees the words scrambled. No Foundry here.
 */
import {norm, scramble} from "./languages-rules.mjs";

export const KNOW_PATTERN = /@Know\[([^\]]{1,120})\]\{([^}]{0,4000})\}/g;
/** A trait's key on the sheet: lower case, no spaces or punctuation ("Animal Ken" is animalken). */
export const traitKey = s => norm(s).replace(/[^\p{L}\p{N}]+/gu, "");

/** "Latin or Occult 3" → [{name: "Latin", key: "latin", dots: 0}, {name: "Occult", key: "occult", dots: 3}]. */
export function parseNeeds(spec) {
  return String(spec ?? "").split(/\s+or\s+|[,;|]/i).map(s => s.trim()).filter(Boolean).map(s => {
    const m = s.match(/^(.*?)\s*(\d+)$/);
    const name = (m ? m[1] : s).trim();
    return {name, key: traitKey(name), dots: m ? Math.max(0, Math.min(10, Number(m[2]))) : 0};
  }).filter(n => n.key);
}

/**
 * Does one reader's character meet any of the needs? traits: {languages: [names], dots: {key: number}}.
 * A need without dots is met by speaking that language or by a dot in that trait.
 */
export function meets(needs, {languages = [], dots = {}} = {}) {
  const tongues = new Set((languages ?? []).map(traitKey));
  return (needs ?? []).some(n => n.dots > 0 ? Number(dots?.[n.key] ?? 0) >= n.dots : (tongues.has(n.key) || Number(dots?.[n.key] ?? 0) >= 1));
}

/** Is the first need a language, so the scramble sounds like it? */
const asLanguage = (needs, known) => needs.find(n => !n.dots && (known ?? []).some(k => traitKey(k) === n.key));

/** What one reader sees. readers: the trait sets of the viewer's characters; gm: sees all, marked. */
export function view(spec, text, {readers = [], gm = false, languages = []} = {}) {
  const needs = parseNeeds(spec);
  const label = needs.map(n => n.dots ? `${n.name} ${n.dots}` : n.name).join(" or ");
  if ( !needs.length ) return {readable: true, text, label, mark: false};
  if ( gm ) return {readable: true, text, label, mark: true};
  if ( readers.some(r => meets(needs, r)) ) return {readable: true, text, label, mark: false};
  const lang = asLanguage(needs, languages);
  return {readable: false, text: scramble(text, lang?.name ?? "default"), label, mark: false, script: !lang};
}

/** Every gated passage in a page's text, for the Storyteller's list. */
export function passages(html) {
  const out = [];
  for ( const m of String(html ?? "").matchAll(KNOW_PATTERN) ) out.push({spec: m[1], text: m[2], needs: parseNeeds(m[1])});
  return out;
}
