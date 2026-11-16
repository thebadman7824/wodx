/**
 * WoDX final audit diagnostic gate (B6811): does WoDX Creation load and start, and if not, which file throws?
 * In Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatecreationload.mjs?${Date.now()}`)).run()
 * Changes nothing.
 *   1. WoDX Creation is active and its api is there (archive, time, animals)
 *   2. every Creation script and data file imports without an error (names the file and the error when one fails)
 * Result: Data/wodx-gate/gatecreationload-result.json.
 */
import {gate} from "./kit.mjs";

const FILES = ["/modules/wodx-creation/data/advance.mjs","/modules/wodx-creation/data/creation-totals.mjs","/modules/wodx-creation/data/lifepath-drill.mjs","/modules/wodx-creation/data/lifepath-events-asia.mjs","/modules/wodx-creation/data/lifepath-events-europe.mjs","/modules/wodx-creation/data/lifepath-events-prologue.mjs","/modules/wodx-creation/data/lifepath-events-world.mjs","/modules/wodx-creation/data/lifepath-local-asia.mjs","/modules/wodx-creation/data/lifepath-local-europe.mjs","/modules/wodx-creation/data/lifepath-local-events.mjs","/modules/wodx-creation/data/lifepath-local-world.mjs","/modules/wodx-creation/data/lifepath-since-lines.mjs","/modules/wodx-creation/data/lifepaths-splats.mjs","/modules/wodx-creation/data/lifepaths-turnings.mjs","/modules/wodx-creation/data/lifepaths.mjs","/modules/wodx-creation/data/lines-xp.mjs","/modules/wodx-creation/data/name-customs.mjs","/modules/wodx-creation/data/people-aboriginal.mjs","/modules/wodx-creation/data/people-algonquian.mjs","/modules/wodx-creation/data/people-armenian.mjs","/modules/wodx-creation/data/people-basin.mjs","/modules/wodx-creation/data/people-canada.mjs","/modules/wodx-creation/data/people-central-africa.mjs","/modules/wodx-creation/data/people-filipino.mjs","/modules/wodx-creation/data/people-haudenosaunee.mjs","/modules/wodx-creation/data/people-inuit.mjs","/modules/wodx-creation/data/people-maya.mjs","/modules/wodx-creation/data/people-missouri.mjs","/modules/wodx-creation/data/people-order.mjs","/modules/wodx-creation/data/people-patterned.mjs","/modules/wodx-creation/data/people-plains-north.mjs","/modules/wodx-creation/data/people-plains.mjs","/modules/wodx-creation/data/people-southwest.mjs","/modules/wodx-creation/data/people-taino.mjs","/modules/wodx-creation/data/people-trades-world.mjs","/modules/wodx-creation/data/people-world.mjs","/modules/wodx-creation/data/people.mjs","/modules/wodx-creation/data/time.mjs","/modules/wodx-creation/data/trait-notes.mjs","/modules/wodx-creation/data/vampire.mjs","/modules/wodx-creation/scripts/actor-data.mjs","/modules/wodx-creation/scripts/advance-rules.mjs","/modules/wodx-creation/scripts/advance.mjs","/modules/wodx-creation/scripts/animal-blood.mjs","/modules/wodx-creation/scripts/animal-ghoul-rules.mjs","/modules/wodx-creation/scripts/animal-keepers-rules.mjs","/modules/wodx-creation/scripts/animal-keepers.mjs","/modules/wodx-creation/scripts/animal-stock-rules.mjs","/modules/wodx-creation/scripts/animal-stock.mjs","/modules/wodx-creation/scripts/apps.mjs","/modules/wodx-creation/scripts/archive-rules.mjs","/modules/wodx-creation/scripts/archive.mjs","/modules/wodx-creation/scripts/change-of-state.mjs","/modules/wodx-creation/scripts/derived-rules.mjs","/modules/wodx-creation/scripts/feed-vitae.mjs","/modules/wodx-creation/scripts/first-change.mjs","/modules/wodx-creation/scripts/first-night-build-rules.mjs","/modules/wodx-creation/scripts/first-night-build.mjs","/modules/wodx-creation/scripts/first-night-prelude-rules.mjs","/modules/wodx-creation/scripts/first-night-prelude.mjs","/modules/wodx-creation/scripts/first-night-rules.mjs","/modules/wodx-creation/scripts/first-night-seed.mjs","/modules/wodx-creation/scripts/first-night.mjs","/modules/wodx-creation/scripts/group-sheet.mjs","/modules/wodx-creation/scripts/learn-rules.mjs","/modules/wodx-creation/scripts/learn.mjs","/modules/wodx-creation/scripts/lifepath-drill-rules.mjs","/modules/wodx-creation/scripts/lifepath-rules.mjs","/modules/wodx-creation/scripts/lifepath-short-rules.mjs","/modules/wodx-creation/scripts/lifepath-threads-rules.mjs","/modules/wodx-creation/scripts/lifepath.mjs","/modules/wodx-creation/scripts/lineage.mjs","/modules/wodx-creation/scripts/lines-xp-rules.mjs","/modules/wodx-creation/scripts/lines.mjs","/modules/wodx-creation/scripts/main.mjs","/modules/wodx-creation/scripts/pass-years.mjs","/modules/wodx-creation/scripts/people-rules.mjs","/modules/wodx-creation/scripts/people.mjs","/modules/wodx-creation/scripts/quick-start-rules.mjs","/modules/wodx-creation/scripts/rules.mjs","/modules/wodx-creation/scripts/skip-test.mjs","/modules/wodx-creation/scripts/states-rules.mjs","/modules/wodx-creation/scripts/states.mjs","/modules/wodx-creation/scripts/time.mjs","/modules/wodx-creation/scripts/totals-check.mjs","/modules/wodx-creation/scripts/totals-rules.mjs","/modules/wodx-creation/scripts/wizard-rules.mjs","/modules/wodx-creation/scripts/wizard.mjs","/modules/wodx-creation/scripts/xp.mjs"];

export async function run() {
  const G = gate("gatecreationload");
  try {
    await G.step("1. api", async () => {
      const m = game.modules.get("wodx-creation"), api = m?.api;
      G.ok("1. api", !!m?.active && !!api?.archive && !!api?.time && !!api?.animals, {active: !!m?.active, version: m?.version, keys: Object.keys(api ?? {}).slice(0, 12), chronicle: !!game.modules.get("wodx-chronicle")?.api});
    });
    await G.step("2. imports", async () => {
      const bad = [];
      for ( const f of FILES ) {
        try { await import(f.replace(/^\//, "/")); } catch (e) { bad.push(`${f}: ${e?.message ?? e}`); }
      }
      G.ok("2. imports", bad.length === 0, {checked: FILES.length, bad: bad.slice(0, 10)});
    });
  } finally { return G.finish(); }
}
