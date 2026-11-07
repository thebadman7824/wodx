# WoDX build log

## Phase 0, 2026-11-06

- Repository started from the installed system, byte-identical to upstream 7.3.2 (tag `upstream-7.3.2`).
- Fork baseline 7.3.2-wodx.1: new title and description, manifest and download removed, `flags.wodx`, version compare fix in wod.js, no-delete fix in module/migration.js, WODX-NOTICE.md.
- Backed up the Rothenstein world (146 files) and system 7.3.2 to `Backups\wodx-phase0`.
- Cloned the world database into `rothenstein-wodx`. All 23 stores opened and every record parsed (0 errors). Counts are in PHASE-0-CHECKLIST.md.
- Note: the cloud workspace's output folder can't host a LevelDB store (directory sync isn't supported), so the clone was compacted in scratch space and then copied.
- Created `wodx-template` (world.json only; Foundry creates the database on first launch).
- Installed the fork into `Data\systems\worldofdarkness`. The installed files were checked against upstream 7.3.2 before the overwrite.
- Private use only; nothing here is for distribution or sale.
- Gate passed: Ben restarted Foundry and opened all three worlds. The server log for the clone shows 252 actors, 2,242 items and 211 scenes, matching the original.

## Phase 1, 2026-11-06

- Rule added (B8): a thorough error and bug check at every phase completion and major version change. Checklist in QUALITY-GATE.md; automatic part in `tools/quality-check.sh`, which now runs a mock-Foundry harness (`tools/harness`).
- Built `wodx-chronicle` 0.1.0: calendar (JDN-based, Julian to Gregorian per country), Chronicle Clock, era profiles and resolver, house rules and the Chronicle Rules journal, approval queue, X-card, lines and veils, Session Zero, era test.
- Checked against the installed Foundry 14.369 source: CalendarData and its config, CONFIG.time formatters, GameTime (created after init, so the calendar is set in init), ApplicationV2 actions and form handler, DialogV2 prompt and confirm callbacks, keybindings, scene controls (record form, "tokens" control), Users.activeGM, Game.togglePause, getRoute and randomID.
- Checked against the upstream system: era settings and CONFIG defaults are read at actor creation (`_preCreate`); ability sets exist for mortal and vampire (5 eras), werewolf (3) and mage (2), which the profiles respect.
- Bugs found and fixed during the check: settings could have registered after an await (moved house rules into a JS module so init is synchronous); two journal writes at first launch could create two Chronicle Rules journals (writes now run one at a time); a missing world eras file would log a 404 (now opt-in by flag); a player could send an automation-type proposal (players' proposals are now always plain requests); a second house-rules window would clash on id (unique ids).
- Installed to `Data\modules\wodx-chronicle`.
- Gate passed. The era test in wodx-template passed 44 of 44, with a different ability count per era set. The approval flow worked at 1347, lines and veils were recorded without a name, and rothenstein-wodx is set to 1200 under Dark Ages.
- Log review (quality gate step 4). Nothing came from WoDX. Explained:
  - "Failed to parse URL from undefined", then "No system update ... available": Foundry's update check finds no manifest URL. This is expected since decision B4 removed it.
  - "cannot start in this directory which is already locked" (22:36:03): a second copy of Foundry was started while one was running. It also happened at 18:51, before WoDX.
  - "Cannot read properties of undefined (reading 'semaphore')" (20:18, 22:06, 22:36): Foundry core's server, when a browser tab still connected sends a change while a world is closing during a restart. The first one is from before the fork was installed.
  - One failed administrator password at 22:36:12.
- Found in review and fixed in 0.1.1: the Chronicle Rules journal kept the date it was first written (1 January 1197 in rothenstein-wodx, before the opening date was set). Setting the date now rewrites it, and the stamp reads "Updated (in-game date)". 0.1.1 is a patch release, so only the automatic checks were rerun; all pass.
- Phase 1 complete.

## Phase 2, 2026-11-07

- Read the rules from the books in the library: Dark Ages: Werewolf (Stepping Sideways, Gauntlet and Shift Time charts, PDF pp. 93–94), W20 (pp. 308–309, peeking p. 313), the W20 Wyld West Expansion Pack (p. 7, pp. 27–28), and Wraith 20th's Shroud range (pp. 282–284).
- Built `wodx-otherworlds` 0.1.0: ratings behavior and scene ratings, three charts, step sideways and peek, pack opener, the Umbra, Caught and Lost statuses, tagging window with the Rothenstein preset, report journal, Gauntlet charts page in Chronicle Rules, Penumbra prototype.
- `wodx-chronicle` 0.1.2: era profiles name their Gauntlet chart (data change only).
- Checked against the Foundry 14.369 source: RegionBehaviorType and the behavior config (dataModels, typeLabels, typeHints, typeIcons), module documentTypes, StringField choices, CONFIG.statusEffects (array proxy keyed by id), Actor#toggleStatusEffect, TokenDocument#regions and #move (with the displace action), Level documents (elevation.base, background, flags), Document#clone. Checked against upstream: Gnosis lives at system.advantages.gnosis (roll and permanent).
- Bugs found and fixed during the check:
  - An unknown chart id in an era profile would have crashed the dialog; it now falls back to W20.
  - A trapped or Lost Garou could still roll alone; now blocked, while a packmate can still lead a rescue roll.
  - In a pack with a caught member, the caught Garou could be picked as the roller; the opener is now the highest-Gnosis member who is not caught.
  - The behavior's type key is read from Foundry's game model rather than assumed.
  - The prototype's physical level could be open-ended and overlap the Penumbra; the copy now gives it a ceiling.
- Rothenstein has no Garou actors (its wolves are Creatures), so the gate uses a test Werewolf.
- Installed. Gate and log review waiting on Ben.

### Phase 2 fix, 2026-11-07: windows cut off

- Reported by Ben: the "Otherworld ratings by scene" window was cut off, and Save could not be reached.
- Cause: Foundry 14's window content is a fixed-height flex column with overflow hidden (`foundry2.css`). The table's scroll limit was a percentage of a box with no height, so nothing scrolled. The approval queue had the same flaw once more than a few requests were waiting.
- Fix: every WoDX window and dialog now has a fixed top, one scrolling middle and a fixed footer. The ratings window opens sized to the screen. Long dialogs (such as removing lines and veils) scroll their content and keep the buttons visible. Released as wodx-chronicle 0.1.3 and wodx-otherworlds 0.1.1.
- New rule B17 and a new automatic check, `tools/harness/ui-fit.mjs`. It renders the 4 windows and 7 dialogs with Foundry's real stylesheet in Chromium at 1280×720, 1366×768 and 1920×1080, and fails if any control can't be reached or a footer button is hidden. It failed the old layout (ratings window and approval queue) and passes the new one, 33 of 33.

### Phase 2 gate, 2026-11-07

- Ben ran every step. Read back from rothenstein-wodx:
  - 192 of 212 scenes carry ratings (100 town, 56 wilderness, 36 village).
  - Crossing cards: Lower Town Square at difficulty 6, Dolany Village at 5, the Old Grove prototype at 4. Stepping back worked; one roll with a 1 gave a 5-minute shift time, as the Dark Ages chart says.
  - The Penumbra prototype was built (physical level 0 to 8, Penumbra 1000 to 1008), and the test Garou landed on the Penumbra level at elevation 1000.
  - The Gauntlet charts page is in Chronicle Rules.
- Found in review: the ratings report still said "0 of 211 scenes are tagged". It had been written at 04:32, and the ratings were saved at 04:54. Fixed in wodx-otherworlds 0.1.2: Save now rewrites the report when one exists. New harness test.
- Log review (quality gate step 4). Nothing came from WoDX. The same known lines as Phase 1: no manifest URL for the update check (B4), a second Foundry start while one was running, and the core "semaphore" error when a tab writes while a world closes.
- Phase 2 complete.

### Fix, 2026-11-07: Dolany roofs off their houses

- Reported by Ben: in Dolany Village every roof sat away from its house.
- Not caused by WoDX: the tiles are the same in the archive world and in the clone made before WoDX.
- Cause: Foundry 14 places a tile by its anchor point, which is the centre by default (`TileDocument#prepareDerivedData` builds a `RectangleShapeData` from x, y and the texture anchor; `Tile#_refreshPosition` puts the mesh at x, y). The Rothenstein importers wrote x and y as the top-left corner, the Foundry 13 way. Each roof drew half its own size up and to the left. Checked by laying the 14 roofs over `dolany.webp` by their corners: all 14 fit their houses exactly.
- The same fault hits 369 tiles in 113 scenes: 308 roofs, 52 effect tiles (fog, embers, snow, motes) and 9 Player Camp and Player Haven modules. The builder macros (Add, Sync, Remove Module) also place by the corner, so new modules would land off their walls. Twist art tiles are anchored at their corner and were right; drawings keep their corner placement in Foundry 14 and were right.
- Fix in wodx-chronicle 0.1.4 (decision B18). On load, the Storyteller's client proposes "Fix tile positions for Foundry 14" in the approval queue. Approving moves each of those tiles by half its size and marks it. It also updates the three builder macros to place and sync by the centre. Five new harness tests use the real Dolany numbers (the Village Mill roof moves from 2838, 805 to 3200, 1104).
- Backup first: the scenes and macros databases of rothenstein-wodx are in `Backups\wodx-phase2-tilefix`.
- Automatic checks after the change: 19 and 13 unit tests, 37 harness tests, UI fit 33 of 33. All pass.
- Not changed: the archive world (WoDX stays idle there) and the Rothenstein source files in `Data\rothenstein-*`. A re-import would bring the old positions back; the fix would then be proposed again.
- Verified by Ben, 2026-11-07: after approving the fix, every roof sits on its house.

## Phase 3, 2026-11-07

- Read the rules: V20 Dark Ages (the Embrace p. 13, clans pp. 42–102, Road of Humanity on the Embrace p. 111, starting Generation p. 144, experience costs p. 183, generation chart p. 340, the blood oath pp. 341–342, ghouls p. 399), V20 core (experience p. 124, generation chart p. 270, ghouls p. 499) and V20 Ghouls and Revenants (ghoul experience p. 139). Page numbers were checked against the PDFs, not taken from memory.
- Built `wodx-creation` 0.1.0: the Embrace, vitae (ghouling and the blood oath), lineage on each actor and a "WoDX Lineage" journal, and the experience log (awards, player requests through the approval queue, a "WoDX Experience Log" journal). Decisions B19 to B23.
- `wodx-chronicle` 0.1.5: calls a `wodxChronicleReady` hook once its API is set. Found by the new harness test: Foundry does not wait for an async ready hook, so a module that reads Chronicle's API in its own ready hook could find nothing. Also, a tile marked by the archive-world fix is never moved again.
- Checked against the Foundry 14.369 source: Document.create, testUserPermission, TokenDocument actorId, ApplicationV2 title, DialogV2's render callback. Checked against upstream: actor creation skips its setup when `settings.iscreated` is set, the ghoul variant's settings, Experience items (`amount`, `isspent`) and the sheet's totals, Discipline items (`Power`, `wod.types.discipline`).
- Bugs found and fixed during the check:
  - Chronicle's API was not ready when Creation's ready hook ran (above).
  - A player's refused spend returned the notification instead of a result.
  - A sire whose clan WoDX doesn't know (a bloodline, "Clan unconfirmed") had its clan silently replaced in the Embrace dialog; it is now offered as written.
- Automatic checks: 19, 9 and 13 unit tests; 46 harness tests (9 new for Creation, including the Embrace end to end); UI fit 48 of 48 (2 new windows and 3 new dialogs at three sizes). All pass.
- Installed. Gate waiting on Ben.

### Archive world: roof fix, 2026-11-07

- Ben asked for the same tile fix in the archive world. WoDX stays idle there, so the fix was applied to its database directly while that world was closed, after a backup of its scenes and macros to `Backups\wodx-phase3-archive-tilefix`.
- Moved the same 369 tiles in 113 scenes (308 roofs, 52 effects, 9 camp and haven modules) and updated the three builder macros. The mark is `flags.world.wodxAnchored`, since that world has no WoDX module; the fix in WoDX worlds now respects it too.
- Read back from the archive's database after writing: 211 scenes, 121 with tiles, the Village Mill roof at 3200, 1104.

### Phase 3 gate, 2026-11-07

- Ben ran every step with no issues, including the archive world's roofs. Phase 3 complete.

### Rule B24 and allies, 2026-11-07

- Ben's new UI rule (B24): a search box on every menu with selectable entries. Added `wodx-chronicle/scripts/search.mjs` (one document listener; filters dropdown options, list items and table rows). Applied to: the era lock, house rules, the approval queue (waiting and decided), removing lines and veils, the scene ratings table, the Embrace (mortal, sire, clan), Give vitae (who drinks, whose blood), Award experience, the Creation roster, the spend window's traits, the ally dialog and the player's character chooser.
- The UI fit check now fails any dropdown of more than five entries, or pickable list or table of more than five rows, without a search box over it. It caught the 11-entry "kind of place" dropdown on every scene row; that is a fixed list, so it is marked `data-fixed` rather than given 200 search boxes.
- Allies (B25): the Creation window lists player characters and allies, and "Show every NPC" adds the rest with a "Make ally" button. An ally's patron is a player character; the patron's owners may spend experience on it, paid from its own pool or the patron's. A player with allies gets a chooser from the droplet button.
- Found in review and fixed: the ally dialog offered the mortal record kept after an Embrace as a patron; `setFlag` merges objects, so an ally record is cleared before it is rewritten (no stale permission entry survives).
- Released as wodx-chronicle 0.1.6, wodx-otherworlds 0.1.3 and wodx-creation 0.1.1. Automatic checks: 19, 9 and 13 unit tests; 48 harness tests (2 new); UI fit 48 of 48 with the new B24 check. All pass.

## Phase 4, 2026-11-07

- Read the rules: V20 Dark Ages ghouls p. 399 (no aging while fed, a point of blood pool a century, reverting and dust without vitae), the blood oath p. 341 (fading per 12 − Willpower months; lesser bonds vanish at the full oath), torpor length by Road p. 350. Upstream's era ability sets (`assets/data/sheet/ability.js`) and secondary Abilities (`create-helpers.js`).
- `wodx-chronicle` 0.1.7: time skips (`timeSkip`, skip mode that pauses per-tick work, `wodxSkipStart` and `wodxSkipEnd` hooks), `targetEra(year)`, a "Pass the years" button on the Clock.
- `wodx-creation` 0.2.0: Pass the Years. For each character it proposes ageing and death checks, an heir, ghoul feeding or lapse, bond fading, voluntary torpor, ability translation for the new era, and Backgrounds to review. Ticked changes follow the rules; unticked ones are the Storyteller's. A plan can be written to the "WoDX Time Skips" journal without changing anything. The dead are filed in "WoDX · The Dead", never deleted. Decisions B26 to B29.
- The gate tool: "Time-skip test" in the Creation window makes five test characters and passes the years from 1200 to 2025 in six steps (1347, 1450, 1837, 1914, 1997, 2025), then checks 27 things. It moves the clock, so it is for wodx-template.
- Bugs found and fixed during the check:
  - Test design: a mortal who drinks becomes a ghoul, so a "thrall" for the bond-fading check must be a vampire; the test cast and harness now use one.
  - A ghoul whose domitor is gone kept its bond forever; it now fades like any other.
  - The Pass the Years window was first a form: Enter in the years box would have passed the years. It has no form now.
  - Give vitae ignored the full oath's rule that no new bond can form (p. 341).
  - The harness's stand-in for Foundry's Collection iterated [key, value] pairs, unlike Foundry; fixed, and every test still passes.
- Automatic checks: 19, 9 and 13 unit tests; 59 harness tests (11 new, including the gate run from 1200 to 2025); UI fit 54 of 54 with the Pass the Years window showing a 150-year plan. All pass.
- Installed. Gate waiting on Ben.
