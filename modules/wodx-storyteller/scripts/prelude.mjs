import * as P from "./prelude-rules.mjs";
import {MOD, esc} from "./core.mjs";
import {getEngine} from "../../wodx-chronicle/scripts/calendar.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

/**
 * Prelude and Embrace scene templates: a Storyteller-only journal of questions and beats for a one-on-one session,
 * chosen by line, and if wanted a bare night scene with a note that opens it.
 */

const FOLDER = "WoDX preludes";
const futureOn = () => { try { return !!globalThis.game?.settings?.get("wodx-chronicle", "rule.futureBranch"); } catch (e) { return false; } };
const yearNow = () => { try { return getEngine().timeToDate(globalThis.game?.time?.worldTime ?? 0).year; } catch { return null; } };
const variantOf = a => a?.system?.settings?.variant ?? "";

async function folder(type) {
  return game.folders.find(f => f.type === type && f.name === FOLDER) ?? Folder.create({name: FOLDER, type, color: "#5a2a2a"});
}

/** Make the prelude: the journal, and the scene if asked. Returns {journal, scene}. */
export async function makePrelude({actorId = null, line = null, scene = false} = {}) {
  if ( !game.user.isGM ) return null;
  const actor = actorId ? game.actors.get(actorId) : null;
  const key = line || P.lineFor(actor?.type, variantOf(actor));
  const p = P.composePrelude({line: key, name: actor?.name ?? "", year: yearNow(), futureBranch: futureOn()});
  const jf = await folder("JournalEntry");
  const journal = await JournalEntry.create({name: p.title, folder: jf?.id ?? null, ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE},
    pages: [{name: p.title, type: "text", text: {content: P.preludeHtml(p), format: 1}}],
    flags: {[MOD]: {prelude: p.line, actorId: actor?.id ?? null}}});
  let made = null;
  if ( scene ) {
    const sf = await folder("Scene");
    made = await Scene.create({name: p.title, folder: sf?.id ?? null, width: 1400, height: 1000, padding: 0, navigation: false, backgroundColor: "#0b0b12",
      flags: {[MOD]: {prelude: p.line, journalId: journal.id}}});
    await made.createEmbeddedDocuments("Note", [{entryId: journal.id, x: 700, y: 500, text: p.title, global: false}]);
  }
  return {journal, scene: made};
}

/** The window: who, which line (the sheet suggests one), and whether to make a scene too. */
export async function preludeDialog() {
  if ( !game.user.isGM ) return null;
  const {DialogV2} = foundry.applications.api;
  const chars = [...(game.actors ?? [])].filter(a => !/group/i.test(String(a.type))).sort((x, y) => x.name.localeCompare(y.name));
  const pick = await DialogV2.wait({classes: ["wodx-dialog", "wstory-dialog", "wstory-prelude"], window: {title: "A prelude"}, rejectClose: false,
    content: `<p class="wodx-quiet">A one-on-one session before play: the life before, the change, the first nights. It makes a journal only you can open, in the folder ${FOLDER}.</p>
      <div class="form-group"><label>For</label>${searchBox("select[name=actor]", "Find a character…", "Search characters")}<select name="actor"><option value="">Nobody yet</option>${chars.map(a => `<option value="${a.id}" data-line="${P.lineFor(a.type, variantOf(a))}">${esc(a.name)}</option>`).join("")}</select></div>
      <div class="form-group"><label>Which</label><select name="line" data-fixed><option value="">As the sheet suggests</option>${P.LINE_ORDER.map(k => `<option value="${k}">${esc(P.PRELUDES[k].label)}</option>`).join("")}</select></div>
      <div class="form-group"><label><input type="checkbox" name="scene"> Make a bare night scene with a note that opens it</label></div>`,
    buttons: [{action: "make", label: "Make the prelude", default: true, callback: (ev, b) => ({actorId: b.form.elements.actor.value || null, line: b.form.elements.line.value || null, scene: !!b.form.elements.scene.checked})},
      {action: "close", label: "Close"}]});
  if ( !pick || pick === "close" ) return null;
  const made = await makePrelude(pick);
  made?.journal?.sheet?.render(true);
  return made;
}
