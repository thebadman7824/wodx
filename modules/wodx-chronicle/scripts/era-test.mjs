import {MODULE_ID, esc} from "./util.mjs";
import * as eras from "./eras.mjs";
import {LINES} from "./era-resolve.mjs";
import {ensureJournal} from "./journals.mjs";

/**
 * Phase 1 gate: create one test character per line in every era profile and check that the upstream system
 * gave each the era's ability set. Results go to the "WoDX Era Test" journal. GM only.
 */

const FOLDER_NAME = "WoDX era tests";

function actorType(line) {
  return CONFIG.worldofdarkness?.sheettype?.[line] ?? line[0].toUpperCase() + line.slice(1);
}

function visibleAbilityCount(actor) {
  const abilities = actor.system?.abilities ?? {};
  return Object.values(abilities).filter(a => a && (a.isvisible ?? true)).length;
}

async function testFolder() {
  return game.folders.find(f => f.type === "Actor" && f.name === FOLDER_NAME && f.getFlag(MODULE_ID, "eraTest"))
    ?? Folder.create({name: FOLDER_NAME, type: "Actor", flags: {[MODULE_ID]: {eraTest: true}}});
}

export async function runEraTest() {
  if ( !game.user.isGM ) return;
  const {DialogV2} = foundry.applications.api;
  const list = eras.profiles();
  const ok = await DialogV2.confirm({
    window: {title: "Era test"},
    content: `<p>This creates ${list.length * LINES.length} test characters (${LINES.join(", ")}) in a folder named
      "${FOLDER_NAME}", one per line in each of the ${list.length} era profiles, and writes the results to the
      "WoDX Era Test" journal. You can delete the folder afterwards.</p><p>Run it now?</p>`,
    rejectClose: false
  });
  if ( !ok ) return;

  const folder = await testFolder();
  const eraLabels = CONFIG.worldofdarkness?.era ?? {};
  const rows = [];
  let failures = 0;
  ui.notifications.info("Era test running. This can take a minute.");

  try {
    for ( const profile of list ) {
      eras.applyProfile(profile);
      for ( const line of LINES ) {
        const name = `Test: ${profile.name}, ${line}`;
        const expected = profile.system[line];
        let got = "";
        let abilities = 0;
        let error = "";
        try {
          const actor = await Actor.create({name, type: actorType(line), folder: folder.id,
            flags: {[MODULE_ID]: {eraTest: profile.id}}});
          got = actor?.system?.settings?.era ?? "";
          abilities = actor ? visibleAbilityCount(actor) : 0;
        } catch (err) {
          error = err.message;
          console.error(`WoDX | Era test failed for ${name}`, err);
        }
        const pass = !error && (got === (eraLabels[expected] ?? expected)) && abilities > 0;
        if ( !pass ) failures++;
        rows.push({profile: profile.name, line, expected, got: got ? game.i18n.localize(got) : "", abilities, pass, error});
      }
    }
  } finally {
    eras.applyProfile(eras.activeEra().profile);
  }

  const table = rows.map(r => `<tr><td>${esc(r.profile)}</td><td>${esc(r.line)}</td><td>${esc(r.expected)}</td>
    <td>${esc(r.got)}</td><td>${r.abilities}</td><td>${r.pass ? "Pass" : `Fail${r.error ? `: ${esc(r.error)}` : ""}`}</td></tr>`).join("");
  const journal = await ensureJournal("era-test", "WoDX Era Test", ["Results"]);
  const page = journal.pages.getName("Results");
  await page.update({"text.content": `
    <p>Run ${esc(new Date().toLocaleString())} on WoDX system ${esc(game.system.version)}.
    ${failures ? `<strong>${failures} failed.</strong>` : "<strong>All passed.</strong>"}</p>
    <table><thead><tr><th>Era</th><th>Line</th><th>Expected set</th><th>Sheet says</th><th>Abilities shown</th><th>Result</th></tr></thead>
    <tbody>${table}</tbody></table>`});
  journal.sheet.render(true);
  ui.notifications[failures ? "warn" : "info"](failures ? `Era test: ${failures} of ${rows.length} failed.` : `Era test: all ${rows.length} passed.`);
  return {rows, failures};
}
