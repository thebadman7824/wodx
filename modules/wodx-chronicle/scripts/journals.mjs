import {MODULE_ID, esc, rule} from "./util.mjs";
import {HOUSE_RULES} from "./settings.mjs";
import {REFORMS} from "./calendar-math.mjs";

const OBSERVER = () => CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;

/** Run journal writes one at a time, so two callers never create the same journal twice. */
let chain = Promise.resolve();
function serial(fn) {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

/** Find a WoDX journal by its kind flag. */
export function findJournal(kind) {
  return game.journal.find(j => j.getFlag(MODULE_ID, "kind") === kind) ?? null;
}

/**
 * Find or create a journal with named text pages. Missing pages are added; existing pages are left alone.
 * GM only.
 */
export async function ensureJournal(kind, name, pageNames) {
  let journal = findJournal(kind);
  if ( !journal ) {
    journal = await JournalEntry.create({
      name,
      ownership: {default: OBSERVER()},
      flags: {[MODULE_ID]: {kind}},
      pages: pageNames.map((n, i) => ({name: n, type: "text", sort: (i + 1) * 100000, text: {content: "<p></p>"}}))
    });
    return journal;
  }
  const missing = pageNames.filter(n => !journal.pages.getName(n));
  if ( missing.length ) {
    await journal.createEmbeddedDocuments("JournalEntryPage", missing.map(n => ({name: n, type: "text", text: {content: "<p></p>"}})));
  }
  return journal;
}

async function setPage(journal, pageName, html) {
  const page = journal.pages.getName(pageName);
  if ( page && page.text?.content !== html ) await page.update({"text.content": html});
}

/* -------------------------------------------- */
/*  Chronicle Rules                             */
/* -------------------------------------------- */

const RULES_PAGES = ["Era and calendar", "House rules"];

/**
 * Rewrite the Chronicle Rules journal from the current settings. GM only.
 * @param {object} info  {profile, interlude, locked, dateLabel}
 */
export function writeChronicleRules(info) {
  if ( !game.user.isGM ) return Promise.resolve();
  return serial(() => _writeChronicleRules(info));
}

async function _writeChronicleRules({profile, interlude, locked, dateLabel}) {
  const journal = await ensureJournal("chronicle-rules", "Chronicle Rules", RULES_PAGES);
  const stamp = esc(dateLabel);

  const reform = REFORMS[game.settings.get(MODULE_ID, "reform")]?.label ?? "";
  const ourCall = (profile?.ourCall ?? []).map(t => `<li>${esc(t)}</li>`).join("");
  const eraHtml = profile ? `
    <h2>${esc(profile.name)}${interlude ? " (between eras)" : ""}${locked ? " (locked by the Storyteller)" : ""}</h2>
    <p><strong>In force from:</strong> ${stamp}</p>
    <p><strong>Books used:</strong> ${esc(profile.basis)}</p>
    <p><strong>What this era changes:</strong> ${esc(profile.switches)}</p>
    ${interlude ? "<p>No era book covers this year, so the last era's rules stay in force until the Storyteller locks another.</p>" : ""}
    ${ourCall ? `<p><strong>WoDX choices (not from a book):</strong></p><ul>${ourCall}</ul>` : ""}
    <h2>Calendar</h2>
    <p>Julian calendar until the reform, Gregorian after it. Reform: ${esc(reform)}.</p>
    <p>Sunrise and sunset are given in local solar time for latitude ${esc(game.settings.get(MODULE_ID, "latitude"))}° N.</p>`
    : "<p>No era profile is active.</p>";
  await setPage(journal, "Era and calendar", eraHtml);

  const groups = HOUSE_RULES.groups.map(g => {
    const rows = HOUSE_RULES.switches.filter(s => s.group === g.id).map(s => {
      const on = rule(s.id);
      const later = s.laterPhase ? ` <em>(takes effect from Phase ${s.laterPhase})</em>` : "";
      return `<li><strong>${on ? "On" : "Off"}:</strong> ${esc(s.name)}${later}<br><span>${esc(s.hint)}</span></li>`;
    }).join("");
    return rows ? `<h2>${esc(g.name)}</h2><ul>${rows}</ul>` : "";
  }).join("");
  await setPage(journal, "House rules", `<p>Last changed: ${stamp}</p>${groups}`);
  return journal;
}

/* -------------------------------------------- */
/*  Session Zero                                */
/* -------------------------------------------- */

const SESSION_PAGES = ["Checklist", "Lines and veils", "The X-card"];

const CHECKLIST = `
<h2>Before the first night</h2>
<ul>
  <li>The era and the opening date, and what the characters know of the world.</li>
  <li>Which lines are at the table, and how the characters know each other.</li>
  <li>Tone: how dark, how much horror on screen, how much is left implied.</li>
  <li>Lines and veils: everyone adds theirs on the next page, signed or not. They can be added at any time.</li>
  <li>The X-card: how it works (next page). Anyone can use it, at any time, without saying why.</li>
  <li>House rules: read the Chronicle Rules journal together and agree on the switches.</li>
  <li>Player-versus-player: what is allowed, and what needs both players' agreement first.</li>
  <li>Scheduling, absences, and what happens to an absent player's character.</li>
</ul>
<p>Revisit this list whenever the chronicle jumps eras or a new player joins.</p>`;

const XCARD = `
<p>Anyone can use the X-card, from the Chronicle Clock or the token controls. Nobody is told who used it.</p>
<p>When it is used, the content that was on screen stops. The Storyteller edits it out or moves the scene on, and nobody asks why. If the switch is on, the game pauses until the Storyteller resumes it.</p>
<p>Lines are content that never appears. Veils are content that happens off screen, faded to black.</p>`;

export function ensureSessionZero() {
  if ( !game.user.isGM ) return Promise.resolve(null);
  return serial(_ensureSessionZero);
}

async function _ensureSessionZero() {
  const existed = !!findJournal("session-zero");
  const journal = await ensureJournal("session-zero", "Session Zero", SESSION_PAGES);
  if ( !existed ) {
    await setPage(journal, "Checklist", CHECKLIST);
    await setPage(journal, "The X-card", XCARD);
    await renderLinesVeils(journal);
  }
  return journal;
}

/** The recorded lines and veils. */
export function getLinesVeils() {
  return findJournal("session-zero")?.getFlag(MODULE_ID, "linesVeils") ?? [];
}

/** Remove entries by their timestamps and rewrite the page. GM only. */
export function removeLinesVeils(stamps) {
  return serial(() => _removeLinesVeils(stamps));
}

async function _removeLinesVeils(stamps) {
  const journal = findJournal("session-zero");
  if ( !journal ) return;
  const keep = (journal.getFlag(MODULE_ID, "linesVeils") ?? []).filter(e => !stamps.includes(e.at));
  await journal.setFlag(MODULE_ID, "linesVeils", keep);
  await renderLinesVeils(journal);
}

/** Add a line or veil and rewrite the page. GM only. */
export function recordLineOrVeil(entry) {
  return serial(() => _recordLineOrVeil(entry));
}

async function _recordLineOrVeil({kind, text, by}) {
  const journal = await _ensureSessionZero();
  const list = foundry.utils.deepClone(journal.getFlag(MODULE_ID, "linesVeils") ?? []);
  list.push({kind: kind === "veil" ? "veil" : "line", text: String(text).slice(0, 500), by: by ?? null, at: Date.now()});
  await journal.setFlag(MODULE_ID, "linesVeils", list);
  await renderLinesVeils(journal);
}

async function renderLinesVeils(journal) {
  const list = journal.getFlag(MODULE_ID, "linesVeils") ?? [];
  const item = e => `<li>${esc(e.text)}${e.by ? ` <em>(${esc(e.by)})</em>` : ""}</li>`;
  const lines = list.filter(e => e.kind === "line").map(item).join("") || "<li><em>None yet</em></li>";
  const veils = list.filter(e => e.kind === "veil").map(item).join("") || "<li><em>None yet</em></li>";
  await setPage(journal, "Lines and veils", `
    <p>Add yours from the Chronicle Clock (Lines and veils). This page is rebuilt from the list each time an entry is added or removed, so the Storyteller removes entries from the Chronicle Clock rather than editing here.</p>
    <h2>Lines: never in the game</h2><ul>${lines}</ul>
    <h2>Veils: off screen only</h2><ul>${veils}</ul>`);
}
