/**
 * WoDX Chronicle: the law of the land in the world (B3490-B3492). The rules are in law-rules.mjs; this reads the
 * scene's region and the clock's year.
 *   here(scene, year)   the law record where a scene stands (the active scene and the current year when left out)
 *   card(opts)          posts the Law here card: to the player, sections by Law, Politics or Streetwise; to the
 *                       Storyteller, everything
 *   checkYear()         on a clock jump, whispers the Storyteller what changed in the homeland's law
 */
import {MODULE_ID, esc, setting, setSetting, isActiveGM} from "./util.mjs";
import {currentYear} from "./eras.mjs";
import * as L from "./law-rules.mjs";
import * as place from "./place.mjs";
import {playerLine} from "./law-heat.mjs";
import {playerMarks} from "./law-punish.mjs";
import {cardLines as paperLines, checkSelves} from "./law-papers.mjs";
import {playerTax} from "./law-tax.mjs";
import {checkTurns} from "./law-regime.mjs";

export function registerLawSettings() {
  game.settings.register(MODULE_ID, "lawYear", {scope: "world", config: false, type: Number, default: 0});
}

const activeScene = () => { try { return globalThis.canvas?.scene ?? game.scenes?.active ?? null; } catch (e) { return null; } };
const yearNow = () => { try { return currentYear(); } catch (e) { return 1197; } };

export function here(scene = activeScene(), year = yearNow()) {
  let region = "moravia";
  try { region = place.regionHere(scene)?.id ?? place.homeland() ?? "moravia"; } catch (e) { region = "moravia"; }
  return L.lawOf(region, year);
}

const n = v => Number(v) || 0;
function abilityDots(a, key) {
  let best = n(a?.system?.abilities?.[key]?.value);
  for ( const i of a?.items ?? [] ) {
    if ( !["Ability", "Trait"].includes(i.type) ) continue;
    if ( String(i.system?.id || i.name || "").trim().toLowerCase() === key ) best = Math.max(best, n(i.system?.value));
  }
  return best;
}
/** The best of Law, Politics and Streetwise on an actor (B3492). */
export const lawDots = actor => Math.max(abilityDots(actor, "law"), abilityDots(actor, "politics"), abilityDots(actor, "streetwise"));

export function cardHTML(rec, {dots = 0, full = false, mine = "", taxes = ""} = {}) {
  const secs = L.cardSections(rec, {dots, full});
  const shown = secs.length;
  let papers = [];
  try { papers = full || dots >= 2 ? paperLines(rec.region, rec.year) : []; } catch (e) { papers = []; }
  if ( papers.length ) secs.push({key: "papers", title: "Records kept of everyone", lines: papers});
  const body = secs.map(s => `<p><strong>${esc(s.title)}</strong></p><ul>${s.lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>`).join("");
  const guess = rec.guess && full ? `<p><em>This land's own law is not written yet; a general picture stands in.</em></p>` : "";
  const since = full && rec.since?.year ? `<p class="hint">In force since ${esc(rec.since.year)}: ${esc(rec.since.note)}</p>` : "";
  const more = !full && shown < L.cardSections(rec, {full: true}).length ? `<p class="hint">Law, Politics or Streetwise would tell you more.</p>` : "";
  return `<div class="wodx-card wodx-law"><h3>Law here, ${esc(rec.year)}</h3>${body}${mine ? `<p><strong>${esc(mine)}</strong></p>` : ""}${taxes}${guess}${since}${more}</div>`;
}

export async function card({scene = activeScene(), actor = null, full = game.user?.isGM} = {}) {
  const rec = here(scene);
  const who = actor ?? game.user?.character ?? null;
  const dots = lawDots(who);
  let mine = "";
  try { mine = [dots >= 1 ? playerLine(who, scene) : "", ...(who ? playerMarks(who, rec.region, rec.year) : [])].filter(Boolean).join(" "); } catch (e) { mine = ""; }
  let taxes = "";
  try { taxes = who ? playerTax(who, rec.region, rec.year) : ""; } catch (e) { taxes = ""; }
  await ChatMessage.create({content: cardHTML(rec, {dots, full: !!full, mine, taxes}), speaker: {alias: "Chronicle"}, whisper: [game.user.id]});
  return rec;
}

/** Whisper the Storyteller what the homeland's law gained or lost since the year last seen. */
export async function checkYear() {
  if ( !isActiveGM() ) return [];
  const y = yearNow(), seen = n(setting("lawYear"));
  if ( y === seen ) return [];
  await setSetting("lawYear", y);
  if ( !seen ) return [];
  const region = place.homeland() ?? "moravia";
  try { await checkSelves(seen, y); } catch (e) { console.error("WoDX | papers", e); }
  try { await checkTurns(seen, y); } catch (e) { console.error("WoDX | regime", e); }
  const changes = L.changesBetween(region, seen, y);
  if ( !changes.length ) return [];
  const gm = game.users.filter(u => u.isGM).map(u => u.id);
  const list = changes.slice(0, 12).map(c => `<li>${esc(c.year)}: ${esc(c.note)}</li>`).join("");
  await ChatMessage.create({content: `<div class="wodx-card"><h3>The law has changed</h3><ul>${list}</ul>${changes.length > 12 ? `<p>And ${changes.length - 12} more.</p>` : ""}</div>`,
    speaker: {alias: "Chronicle"}, whisper: gm});
  return changes;
}

export {L as rules};
