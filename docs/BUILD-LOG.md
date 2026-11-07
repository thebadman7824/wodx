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

### Phase 4 gate, 2026-11-07: one failed check, and the test ran in the wrong world

- Ben ran the steps. The "WoDX Time-Skip Test" journal showed 26 of 27: "The dead are kept, filed in WoDX · The Dead" failed.
- Read back from the world's database: both dead test mortals are in "WoDX · The Dead". The data was right; the check was wrong. In Foundry, `actor.folder` is the Folder document, not its id, so looking it up by id found nothing. The harness's stand-in stored an id, which is why the automatic run passed. Fixed in wodx-creation 0.2.1, and the stand-in now behaves like Foundry, so this kind of slip fails in the harness.
- The database also showed the test ran in **rothenstein-wodx**, not wodx-template (wodx-template is unchanged since Phase 1). In rothenstein-wodx the clock is now in 2025, the era is Modern, 80 Rothenstein characters are marked dead and filed in "WoDX · The Dead", and every sheet was moved to the modern ability list. Nothing was deleted. Foundry wrote a backup of rothenstein-wodx just before (7 November, `world.rothenstein-wodx.2026-11-07.1794054860733.bak`); restoring it undoes the run.
- Guard added in 0.2.1: the time-skip test now refuses to run anywhere but wodx-template (or a world flagged `flags.wodx.testWorld`), and its button only shows there. New harness test for the refusal.
- Automatic checks: 60 harness tests, UI fit 54 of 54. All pass.

### Phase 4 gate passed, 2026-11-07

- Read back from the worlds: wodx-template's "WoDX Time-Skip Test" journal says 27 of 27 checks passed (steps 1347, 1450, 1837, 1914, 1997, 2025). rothenstein-wodx is restored from Foundry's 7 November backup: Dark Ages era, clock back in 1200.
- Log review: two errors at 07:55:57, when the world was shut down for the restore ("Database settings is not ready", then the core "semaphore" error). A client wrote while the world closed; the same core race seen in Phases 1 and 2. Nothing else from WoDX.
- rothenstein-wodx stays the project testbed (B30). Phase 4 complete.

### Phase 5, built 2026-11-07: the twin worlds and Read the Soul

- **Twin night maps.** Ben chose the 22 world maps, Penumbra and Shadowlands, and twins filtered from the night maps. 44 map twins and 208 roof twins were made, keeping the geometry and keeping it night. They are in `Data/wodx-assets/twins`, listed in `manifest.json`. Contact sheets were checked by eye.
  - Penumbra: silvered moonlight, living things glowing faintly, and a fine Weaver web on stonework.
  - Shadowlands: colour drained, rot and cracks, lights turned to a pale grave-light.
- **WoDX Otherworlds 0.2.0.**
  - Twin levels:
    - Each scene gets a Penumbra level (1000–1008) and a Shadowlands level (2000–2008).
    - Roofs, props and lights are copied onto each twin level. Lights are colder and dimmer there.
    - Travel regions are copied too, and each copy is linked to the far side's twin.
    - A backup goes to `Data/wodx-backups/scenes` first. Building again only adds what is missing. Removal asks first.
  - Stepping sideways keeps the token's height.
  - Cross the Shroud.
  - Disconnection (W20 p. 319), with the year-and-a-day proposal.
  - Umbral paths.
  - Read the Soul (V20 Dark Ages p. 195), with a blind roll, a false reading on a botch, and an aura overlay for the reader only.
- **Found while checking the world's data.** The 22 maps carry 62 Teleport Token travel regions on every level. Foundry 14 refuses to teleport into a region that is on every level of a scene with several levels ("Region is in multiple levels"), so building twins would have broken every road between maps.
  - Fix: the physical road now keeps to the physical level.
  - Each twin level gets its own copy, pointed at the far side's twin.
  - A twin road stays switched off until the far side is built, so nobody in the Umbra lands in the physical world.
- **New rule B31:** one Umbra. Where the lines conflict, Wraith comes first, then Werewolf, then Mage. It is in the Master Plan, DECISIONS and Chronicle Rules. Two conflicts are decided so far:
  - The Shadowlands lie beyond the Shroud, not the Gauntlet.
  - Each map has one Penumbra level and one Shadowlands level.
- **Automatic checks:** 19, 9 and 14 unit tests; 77 harness tests (17 new); UI fit passes with the twin levels window and four new dialogs. All pass. The aura overlay draws in well under a frame in the harness.
- Installed. Gate waiting on Ben: every twin map checked at night.

### Phase 5 gate passed, 2026-11-07

- Ben ran every step, with nothing to report.
- Read back from rothenstein-wodx's scenes database:
  - All 22 world maps have both twin levels, with Penumbra and Shadowlands art.
  - Physical roofs keep to the physical level. Each has two copies in the same place, at 1008 and 2008, with twin art.
  - Lights are copied twice.
  - 124 twin roads are linked and on; none are left off.
  - No scene outside the world maps teleports into them.
- The 22 scene backups were written to `Data/wodx-backups/scenes` just before the build. Foundry's own world backup ran at 08:56.
- Log review: no errors since the install. The two errors of 07:55 are the known shutdown race from the Phase 4 restore.
- Phase 5 complete.

### Phase 6a, built 2026-11-07: the shared parts

- Ben's choices (B32–B34):
  - Phase 6 is split: the shared parts first, then the lines in batches, Rothenstein's lines first.
  - The VtDA20 modules become new ids, with a migration.
  - The Group actor is a new type in the fork.
- **Survey.** In rothenstein-wodx: 16 actors carry `flags.world.vtda20.profile`, the old modules made 12 "VtDA20:" macros (two of them named "VtDA20: Actor Type"), and 13 VtDA20 settings are stored. No actor has a module-scoped VtDA20 flag, and there are no Active Effects. The "import-rothenstein" macro only names the old modules in its instructions.
- **System fork 7.3.2-wodx.2.** Adds the Group actor type: data only (kind, roster, pooled Backgrounds, Anchor, notes). Guards are added so the system's character code and migration skip it. The device's 7.3.2-wodx.1 files were checked against the repo (identical but for line endings) and backed up before the change.
- **WoDX Chronicle 0.2.0.** Adds the conditions registry and timed effects.
  - Conditions from V20 Dark Ages pp. 13, 348, 350, 351 and 356–358 become token statuses, listed in Chronicle Rules.
  - Timed effects end by round, scene, night (at dawn) or clock time. A reverter takes back what each one changed.
  - The sweep covers world actors and the unlinked tokens of the active and viewed scenes only, not all 211 scenes.
  - The Clock has an "End the scene" button.
- **WoDX Creation 0.3.0.** Adds the Group sheet. Pooling follows V20 Dark Ages p. 182 and W20 pp. 140–141. Pass the Years skips groups.
- **WoDX Actions 3.0.0 and WoDX Combat 3.0.0.** vtda20 2.2.1 was committed as found, then ported:
  - New ids. API aliases. Settings start from the old values. They refuse to run beside the old modules.
  - A migration through the approval queue that copies flags and renames macros, never overwriting and never deleting.
  - Quickening is a timed effect with a reverter.
  - Frenzy, Rötschreck and torpor set condition statuses.
  - The attack dialog reads conditions and prefills their dice and difficulty.
  - Dazed is automatic (B36).
  - B24 pass: search boxes on Abilities, dramatic systems, weapons (more than five) and bonds (more than five). Fixed rule tables are marked.
- **Checks.**
  - Unit tests: 19, 9 and 14.
  - Harness: 90 tests, 13 of them new (phase6.test.mjs).
  - UI fit: every window and dialog at three sizes, including the Group sheet and 16 WoDX Actions and Combat dialogs. Its first run caught missing search boxes in the Action, Hunt, Frenzy and Hazard dialogs; all fixed.
  - quality-check.sh now checks imports in .js files too.
- Installed: the fork files, WoDX Chronicle, WoDX Creation, WoDX Actions and WoDX Combat. The vtda20 modules stay installed for the original Rothenstein world. Gate waiting on Ben (PHASE-6A-CHECKLIST.md).

### Phase 6a gate run, 2026-11-07 (by Claude, B37)

- Backups taken in Setup: rothenstein-wodx ("Before Phase 6a gate (WoDX Actions/Combat migration)") and WoDX Template ("Before Phase 6a gate"). Foundry's own world migration (7.3.2-wodx.1 → wodx.2) ran on launch and made one more backup.
- Modules switched: VtDA20 Non-Combat Actions and VtDA20 Combat Automation off; WoDX Actions and WoDX Combat on. No red notice.
- **Migration approved** from the approval queue: 16 actors, 12 macros. Profiles copied to `flags.world.wodx` for all 16; old flags kept; settings start from the 13 stored VtDA20 values.
- **Bugs found and fixed (3.0.1):**
  - Both "VtDA20: Actor Type" macros were renamed, giving two "WoDX: Actor Type" (the check only looked at names already in the world). Now only the first is renamed, as a new world gets only one. In rothenstein-wodx both stay; they do the same thing.
  - The report listed each macro under its new name on both sides of the arrow. Fixed in code, and the existing report corrected in place.
  - The report's "Settings read from VtDA20" was always empty, and a String setting stored as plain text would have been ignored (legacy.js). Both fixed.
  - The Soak & Apply Damage dialog never applied Dazed; damage entered by hand from one attack now dazes like an attack does. Outside a fight Dazed lasts the scene (there are no turns).
  - The attack dialog's "Blind / darkness" box could count Blinded a second time; it is now disabled, with a note, when Blinded is on.
- Steps passed in Foundry: 3, 4, 5 (HUD reads "WoDX Actions" and "WoDX Attack"; same Actions menu), 6 (Quickening Dexterity 2 → 3, End the scene → 2, whispered card), 7 (both conditions listed; extra dice 2, extra difficulty 2).
- 3.0.1 deployed (the 3.0.0 files are backed up in `wodx-repo/backups/wodx-actions-combat-3.0.0`). Checks after the fixes: harness 14 phase-6 tests (2 new), quality-check.sh all pass.
- The link to Ben's computer dropped during step 8. A combat is running in rothenstein-wodx (the deprecated werewolf token and Brother Stanislaw); Stanislaw's two tokens still carry Blinded and Held.
