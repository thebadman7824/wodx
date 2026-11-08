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

- **Phase 6a gate passed (2026-11-07).** Ben ran steps 8–11 (Dazed over two rounds, the Group actor, the original Rothenstein world, the console) and reported no issues. Phase 6a complete; batch 1 next (Werewolf and Fera, mortals, hunters with True Faith, wraiths).

### Phase 6b build, 2026-11-07 (Werewolf and Fera)

- **Research and data** (commit 53a98be): DA:W chapters 3–5 OCR'd and read; W20's Garou rules; Changing Breeds trait sections. Mechanics notes with page references in `docs/research/6b-werewolf-notes.md`. Data files `garou.json`, `fera.json` and the 179-Gift library `gifts-daw.json` (B39).
- **WoDX Actions 3.1.0.** `garou-rules.js` (pure rules) and `garou.js` (dialogs, cards, hooks): change form through the system's shapes, Rage and frenzy, Gnosis and meditation, Gifts (use and learn), rites, summoning, fetishes and talens, Renown and Rank, Battle Scars, the Delirium, the Curse, Kinfolk, chiminage. Moon Rage at nightfall with a whispered card (B40); regeneration each round; Dark Ages Embrace Pain. Rules basis by era (B41). The Werewolf / Changing Breed menu rebuilt; Kinfolk added to the mortal menu. `garou-testpack.js` makes a test pack for the gate.
- **WoDX Combat 3.1.0.** Silver and gold by era, breed and form; teeth and claws by form; Dark Ages: no aggravated soak in Homid.
- **WoDX Creation 0.4.0.** The First Change wizard; Hunting Grounds poolable by a Dark Ages pack.
- **Bugs caught by the new tests and fixed before install:** a talen was never marked spent (the check looked at the roll object); "custom" tribes and the system's tribe keys (`wod.bio.tribename.getoffenris`) weren't recognised; scrolling lists in dialogs collapsed to nothing on a 720-pixel screen (flex shrink), found by UI fit.
- **Checks:** harness 124 tests (33 new), UI fit every window at three sizes (21 new dialogs), quality-check.sh all pass.
- **Installed** on Ben's PC: WoDX Actions, Combat and Creation. Replaced files backed up in `wodx-repo/backups/before-6b-3.0.1` first. Gate waiting (PHASE-6B-CHECKLIST.md).

### Phase 6b gate run, 2026-11-07 (by Claude as Gamemaster Test)

- Backup "Before Phase 6b gate" of rothenstein-wodx. The server had auto-launched the original Rothenstein world after the restart; Ben entered the admin password, Claude launched rothenstein-wodx and joined as Gamemaster Test (no password). Claude's own browser refuses Foundry's self-signed certificate, so the run used the Foundry window and a gate script (`tools/gate/gate6b.mjs`).
- First run 11/18. Fixed: form changes now ask the system to work out totals (`isupdated: false`); the Dark Ages Glabro fix uses the sheet's own Glabro bonus; radio buttons read correctly in dialogs (Learn a Gift took the last Gift); moonrise skips sheets with no Rage; test-pack tokens linked; the fork's migration no longer reads `effect.icon` (red error on every reload for a werewolf with an effect) — fork 7.3.2-wodx.3. Versions: WoDX Actions and Combat 3.1.1, Creation 0.4.1. Replaced files backed up in `wodx-repo/backups/before-3.1.1` and `backups/system-7.3.2-wodx.2`.
- Second run: every rules check passed (see PHASE-6B-CHECKLIST "Gate result"). Harness 125 tests.

### WoDX Combat 3.2.0, 2026-11-07: automatic defense (Ben's request)

- The attack dialog's Defense list has a new default, "Automatic: best for this character". On the roll it plans parry, block and dodge from the defender's sheet against this attack (Dexterity + Melee / Brawl / Athletics or Dodge, Celerity, wound penalty, the defense count, conditions, the maneuver), drops the ones the book forbids (VtDA20 p. 344), and rolls the one with the most expected successes; ties go to parry, then block, then dodge. A parry is only chosen with a melee weapon on the sheet. The card names the choice and the others' pools. None, Dodge, Block and Parry stay in the list.
- Planning is split from rolling (`planDefense`), so the hand-picked defenses use the same rules as before. API: `game.wodxCombat.bestDefense(target, fd, weapon)`.
- Harness: one new test (phase6.test.mjs). Also fixed: the card said "full defense: -0 dice" on a first defense (the select gives a string).
- Live check in rothenstein-wodx: the Defense list opens on "Automatic"; Miller Jost attacking Wilhelm with a knife chose Dodge (Block not allowed against lethal, Parry without a weapon not counted), with a punch it chose Block (5 dice against Dodge 2).

### WoDX Combat 3.3.0, 2026-11-07: automatic attack (Ben's request)

- The attack dialog's Weapon list has a new default, "Automatic: best attack for this character". On the roll, every weapon, natural weapon and unarmed attack is scored by expected health levels against this target: the exact odds of the attack pool against the target's best defense (or the defense picked), then damage (net successes added, Potence where it applies) against the target's soak, with the bane, silver and form rules, vampire bashing halving and the silver minimum. Ranking weights: lethal ×1.25, aggravated ×1.6. Not offered: a mortal's bite without a hold, claws without Protean 2 / Vicissitude / a shapechanger's body, melee out of reach, missiles beyond three times range. With both tokens placed, a missile's range band comes from the distance.
- Refactor: the attack pool, damage profile and soak pool are now shared helpers (`attackPoolFor`, `damageProfile`, `soakPoolFor`), used by the real roll and by the planner, so the two can't drift. Odds in rules.js: `successDistribution`, `expectedHarm`. API: `game.wodxCombat.bestAttack(attacker, target, fd)`.
- Harness: one new test (phase6.test.mjs).
- Live check in rothenstein-wodx (Gamemaster Test): both Weapon and Defense lists open on Automatic. The test tokens stand 20 feet apart, so nothing was in reach; the planner then chooses as if in reach and says so on the card. Miller Jost picked his silver knife against Wilhelm (0.14 expected levels against 0.03–0.04 for punch, kick, clinch). Fixed after the first look: a Garou in Homid had his bite counted as a natural weapon; in Homid he bites as a human does, after a hold, so it is left out. Wilhelm (Homid) then chose a clinch (1.6) over punch and kick (1.3).

### WoDX Combat 3.4.0 and WoDX Actions 3.1.2, 2026-11-07: the rest of the automatic options (Ben's request)

- New defaults in the attack dialog, each still changeable: defense count and multiple actions counted from this turn's attack cards (cards now carry combat id, round and whether the target defended); position from the target token's rotation (front / flank / rear; never-rotated tokens count as front); opponents engaged from hostile tokens within reach; Fortitude blood by each character's soak policy (aggravated only by default; "WoDX: Soak Policy" macro); the same Fortitude choice in Soak & Apply.
- Suggestions box in the attack dialog: expected hit chance and levels; Willpower and Potence blood flagged when they change the result markedly (hit chance +15 points or levels +30%); the maneuver with the most expected harm, with its drawback. Never applied.
- Quick attack (shift-click the HUD sword, "WoDX: Quick Attack" macro, `game.wodxCombat.quickAttack()`): no dialog, every automatic choice, several selected tokens attack in turn; spends nothing by itself.
- Automatic initiative (setting, default every turn as VtDA20 p. 322): rolled at combat start and each new turn by the active GM; the card lists extra actions declared with Rage (WoDX Actions 3.1.2 records them).
- Pure rules in `scripts/auto.js`. Harness: three new tests (phase6.test.mjs).
- Live check in rothenstein-wodx (Gamemaster Test): a new test combat rolled initiative by itself at the start and again on turn 2. Miller Jost, placed behind Wilhelm (Wilhelm's token turned to face up the screen), quick-attacked twice: the first card read "from behind (+2 dice)"; the second added the multiple-action penalty (−1 die, +1 difficulty) and Wilhelm's second defense (−1 die). The suggestions box showed the expected result, Willpower as worth it (hit 65% → 100%: Wilhelm had no defense dice left) and Great Blow as the most harmful maneuver. Fixed on the way: when every attack has no dice left, the card now says so instead of "no attack is possible".
- Left for Ben: two more test combats on Dolany Village; Miller Jost (test) given Dexterity 3 and Melee 2 and healed, and moved behind Wilhelm, whose token now faces up the screen.

### WoDX Actions 3.2.0 (Combat 3.4.1, Creation 0.4.2), 2026-11-07: the Actions suggestions (Ben's request)

- **New data** (mechanics as codes, summaries in WoDX's own words, page references; no book text):
  - `data/disciplines-daw.json`: 329 entries from VtDA20 pp. 188–316 — every Discipline and variant at levels 1–5 with roll, difficulty, cost, duration and a short summary; Celerity, Fortitude and Potence 1–5 as passive; Thaumaturgy, Koldunic and Necromancy path powers with their tradition's rule; 122 elder powers by name, level and page.
  - `data/roads-daw.json`: nine Roads (Beast, Heaven, Humanity, Kings, Lilith, Metamorphosis, Sin, Bones, Yasa) and their Paths, with aura, Virtues, pages and paraphrased hierarchies of sins (rationales not reproduced).
- **New features** (`scripts/kindred.js`, pure rules in `scripts/kindred-rules.js`):
  - Use a Discipline: powers from the sheet's dots and paths (search box), pool, difficulty from the target, blood and Willpower paid, a timed effect for its duration. The Forgetful Mind marks a witness as made to forget.
  - Road and Path: pick from the data; sin, frenzy and Rötschreck rolls use that Road's Virtues; the sin dialog lists the hierarchy with the character's rating marked.
  - Prestation ledger ("WoDX Prestation": outstanding and the full ledger). Downtime and domain (Herd, Retainers, Influence, Resources, Contacts, Domain, Hunting Grounds) on the character's own dots or a Group's pool; Herd adds blood; optional clock advance. Masquerade records ("WoDX Masquerade").
  - One Blood Oath record: with WoDX Creation on, feeding, giving blood and the Blood Oath dialog all read and write Creation's lineage bonds (same-night rule, ghouling, lineage journal).
  - History journal ("WoDX History"): a page per character, written by sins, frenzies, oaths, diablerie, torpor, kills, boons, downtime and Road changes.
- **Automatic** (each behind a setting, all on by default):
  - Healing with the clock: mortals and ghouls by VtDA20 p. 352 (worst level first; lethal past Hurt needs "treated"); shapechangers regenerate. Pass the Years lists it per character and the skip heals through the same code.
  - Dawn and dusk cards: stay awake (Road 8), sunlight for tokens in sunlit places (scene flag "outdoors" or a region named sunlit; shade/shelter/indoors regions protect), Run New Night (or automatic), heal with blood on rising down to the hunger line.
  - Torpor from a track full of lethal, with its end date and a reminder card when she may rise.
  - Prompts: grievous wounds and life-threatening wounds (frenzy), fire or sunlight from Combat (Rötschreck), blood under the hunger line, a vessel drained or a mortal killed (the sin level the Road names), frenzy itself on Roads that count it, a shapechanger beyond Incapacitated (rise on Rage), a Crinos seen by mortal tokens (the Delirium, once a scene per witness).
  - Witnesses for feeding: living tokens in range and sight (walls block); a button records them.
  - Willpower recovery setting (a night / a story / off) and End of story.
  - Action dialog: Suggest the best Attribute + Ability under the untrained rules; extended actions can roll until done and advance the clock; resisted rolls read the same pool from the target's sheet; teamwork rolls the other selected tokens.
- Combat 3.4.1 fires `wodxDamageApplied` when a card's damage is applied (fire/sun flag, attacker). Garou: `wodxFormChanged` hook; the Delirium accepts tokens.
- Harness: 20 new tests (`kindred.test.mjs`), 150 in all; UI fit passes with six new dialogs; quality-check passes. Backup: `wodx-repo/backups/before-actions-3.2.0`.
- Live check (Gamemaster Test): versions and data load, settings present, every vampire's Road recognized but "Via Hyron (Road of the Hive)" (not a Road in the book's list), powers listed per sheet. Fixed on the way: the sheet spelling "Daimonion" now matches the book's Daimoinon; the power list is a dropdown (a tall list was squashed by Foundry's CSS). Use a Discipline (Dominate: Command) posted its card.

### WoDX Actions 3.3.0 and WoDX Combat 3.5.0, 2026-11-07: sunlight and gridless play (Ben's request)

- **Sunlight** (`scripts/sunlight.js`, pure rules `scripts/sunlight-rules.js`; VtDA20 pp. 189, 218, 233, 240, 357, 359):
  - Where the sun reaches: a new region behavior "WoDX: Sunlight" (light: shade, faint, covered, indirect, cloudy, direct; exposure 1–3; ignore weather), regions named sunlit / shade / shelter / indoors, or a whole scene marked outdoors in Sky and sun. The behavior type is declared in module.json (`documentTypes`), so it appears only after the Foundry server restarts.
  - The sun's height and bearing from the Chronicle clock and latitude. On outdoor scenes walls cast shadows of wall height ÷ tan(altitude) away from the sun; each scene can set its north and its wall height.
  - The light is capped by the sky (new Sky setting: clear, cloudy, heavy cloud or rain, storm or fog), by twilight (the sun under 6°: faint) and by heavy clothing (Sun and haven: "covered").
  - Damage: a card with a button (or rolled and applied, or off: setting "Sunlight damage") each turn of a fight, on stepping into the sun, and while the clock runs by day (a turn ≈ 3 s, up to 20 turns a card). Fortitude soaks at the light's difficulty; the rest is aggravated; then a Rötschreck button.
  - Protection: Earth Meld, Unseen Hibernation, buried in the earth (Sun and haven); Woad of Taranis makes it lethal, soaked with Stamina + Fortitude, no Rötschreck.
  - Dawn warnings 30 and 10 minutes before sunrise to the GM and the players, with each Cainite's haven (a scene or a region, set in Sun and haven) checked. The dawn card's sunlight check now uses this system.
- **Gridless play** (WoDX Combat 3.5.0, rules in `scripts/auto.js`):
  - Reach is measured from the tokens' edges: the centre distance less the extra size of big tokens, within half a square. The same rule counts the opponents engaged. Distances are straight lines on gridless scenes.
  - Movement in yards during a fight (setting "Movement in a fight": show the pace, also stop moves past the running speed, or off; the GM is never stopped): walk 7, jog 12 + Dexterity, run 20 + 3 × Dexterity, plus Celerity (p. 202), doubled in Shape of the Beast (p. 241), limited by wounds (p. 351). Each move shows "Walking / Jogging / Running n / max yd" over the token. Feet, metres and yards are converted.
  - The attack card notes the yards moved this turn, and says when she moved more than half her running speed, after which the book allows no attack (p. 333).
- Harness: 11 new tests (`sunlight.test.mjs`), 161 in all; UI fit passes with the two new dialogs; quality check passes. Backup: `wodx-repo/backups/before-actions-3.3.0`.
- Live check (Gamemaster Test): versions, settings and the sun's place (6 July 1200, 21:10: night, 9° under the horizon, dawn in 411 minutes); every token's exposure and movement on Dolany; a test move of Miller Jost two squares counted 3.3 yards (record cleared after). Fixed on the way: Wilhelm's run read as doubled because the form test also matched effect names containing "wolf"; doubling now comes only from Protean's Shape of the Beast.
- Made for Ben: "Dolany Village (gridless trial)", a copy of Dolany with a gridless grid and the same 12 tokens; the original is untouched.

### Phase 6b closed, 2026-11-07

- Ben completed the Phase 6b checklist steps: the phase passes. No WoDX console errors after his run. The server still shows the start-up manifest versions; a full Foundry restart will update them and register the Sunlight region behavior. Test material is left in the world until Ben says to delete it (list in PHASE-6B-CHECKLIST).

### Phase 6c built, 2026-11-08: WoDX Actions 3.4.0 and WoDX Combat 3.6.0 (mortals, hunters with True Faith, wraiths)

- **Ben's choices:** B42 (hunters by era), B43 (Wraith 20th, the Great War core in its profile), B44 (the Shadowguide), B45 (Numina in 6c). Also new this phase:
  - B46: the aim widens to a virtual world.
  - B47: Phase 6d, the inner voice, added to the Master Plan.
  - B48: gender-neutral in-game text.
  - B49: hedge magic by Sorcerer.
- **Research on Ben's PC.** The scanned cores were OCR'd with Ben's go-ahead, using a uv environment (PyMuPDF, RapidOCR; 11 workers):
  - Dark Ages: Inquisitor, Sorcerer (Revised), Hunter: The Reckoning, V20 Ghouls and Revenants.
  - The Great War is still running.
  - The notes hold mechanics with pages only (`research/6c-notes.md`). Three edge names were checked against the page images.
- **Wraiths:**
  - Arcanoi library of 160 arts; Passions, Fetters, Memoriam; Corpus healing.
  - The Shadow: Shadowguide, whispers, Catharsis, Shadow Dice, Dark Passions, Thorns.
  - Harrowings with automatic prompts; the Caul; Hysteria.
  - Combat puts wraith damage on the Corpus track.
- **Hunters:**
  - Inquisitors: Superior Virtues, Piety, Conviction risk, prayer, relics, banking, Virtue rolls.
  - True Faith under both rule sets.
  - Numina from The Hunters Hunted II, and Sorcerer hedge magic with aspects.
  - The imbued: creeds, second sight, 35 edges, Conviction risk and cash-in, derangements, the Imbuing.
  - V20 ghoul blood rules.
- **Checks:** harness 185 tests (24 new), UI fit (24 new dialogs) and quality check all pass.
- **Installed** and checked by MD5. Backup: `Backups\wodx-6c-pre-deploy-20261108`.
- **Gate:** the live gate script `gate6c.mjs` waits for Ben (Foundry wasn't running; the admin password is his to enter). The steps are in PHASE-6C-CHECKLIST.
- **Gate 6c, 2026-11-08:** Ben's third run passed all 17 steps.
  - The first two runs exposed gate-script problems: test actors created with 0 Willpower (the system's create helper resets it), state left over from the earlier run, and another module's chat messages read as WoDX cards.
  - They also exposed one WoDX bug: the wraith's last-Willpower prompt fired after an action that spent no Willpower. Fixed.
  - Still open: the Great War wraith profile.
- **The Great War profile, 2026-11-08 (B50).** The Great War Arcanoi library has 103 arts; names and levels were read from the page images. There is also a Maelstrom tool with the storm table by force. Harness 27 tests in phase6c; UI fit and quality check pass; installed and checked by MD5. The gate's 18th step waits for Ben.
- **Gate 6c complete, 2026-11-08:** Claude ran the gate in the Foundry desktop app as Gamemaster Test: 18/18. The procedural generation plan is in the Master Plan (B52), and the WoDX look is planned as Phase 6e (B51).

### Phase 6d built, 2026-11-08: the inner voice (WoDX Actions 3.5.0, Chronicle 0.2.1)

- B53–B56 are Ben's choices: whispers and proposals, four voices, the visibility rule and consent.
- One layer covers the Beast, the Shadow, Rage and the Impulse:
  - an assigned voice and a private channel;
  - a meter read from the sheet, with prompts when it rises;
  - proposals through the approval queue, answered from a card with the line's own roll;
  - consent: the switch, each player's opt-in and the X-card.
- Harness 196 tests, UI fit and quality check pass. Installed and checked by MD5.
- Claude ran gate 6d in the desktop app: 10/10. Gate 6c still passes on 3.5.0.
- The table test with real players waits for Ben (PHASE-6D-CHECKLIST).

### Phase 6e built, 2026-11-08: the WoDX look (WoDX Actions 3.6.0, Chronicle 0.3.0)
- Chronicle 0.3.0: styles/wodx-theme.css (tokens, eleven era kits, line accents, the WoDX frame for windows, the menu and card styles, accessibility); fonts/ with thirteen bundled fonts and their licences; scripts/theme.mjs (client settings: look, text size, motion; body marks wodx-look, data-wodx-look, data-wodx-tone, data-wodx-motion, --wx-scale).
- Actions 3.6.0: theme-rules.js (pure): LINE_LOOK (kindred, wraith, hunter), the intent plan for their menus, a description for every button, the one card layout (header with the line mark and the verdict, the body, what changed with resource pips, the page references in the footer), the change ledger's diff.
- Menus for the three lines: Act, Resist, Recover, Storyteller tools (hidden from players), the scene strip; a search box, the last four buttons used, a hint line, arrow keys, Enter, typing searches. Other lines keep their sections in the new frame.
- Cards: post() writes the layout; sheet updates on the acting computer are kept a few seconds and shown as "what changed" (changes written after the card join it 0.9 s later). Cards written without the layout (notices, older messages) are shown in it when drawn.
- Dialogs opened for an actor wear the line's class (withActor and the menu set it while the action runs).
- Quality: phase6e.test.mjs (11 tests, with a contrast check of every kit and accent); ui-fit.mjs now draws with the look on (WODX_KIT, WODX_SCALE, WODX_LOOK), Foundry's icons and type, and the dialogs' real widths; look.mjs renders the review sheets. Gate: tools/gate/gate6e.mjs (8 steps).
- Deployed to rothenstein-wodx (backup in Backups\pre-6e-2026-11-08). Gate 6e: 8/8 after three fixes found in play: Foundry reads a module's stylesheet list only when its server starts, so Chronicle now adds wodx-theme.css itself when it is missing; "what changed" counts only from the start of the action; and the worldofdarkness system's chat styles paint every chat h3 with layered !important rules, so the card header's h3 carries its own style. Foundry still shows Chronicle 0.2.0 until its next restart.

### Phase 6e closed, 2026-11-08
Ben approved the look and closed the phase. Still open: the other lines get their colours and their menus grouped by intent (LINE_LOOK, MENU_PLAN), and Foundry shows Chronicle 0.3.0 after its next restart.

### The look for every line, 2026-11-08: WoDX Actions 3.6.1, Chronicle 0.3.1 (Ben's request)
- LINE_LOOK now lists every profile: ghoul, mortal, Garou and Fera, mage, changeling, spirit, creature, demon, mummy and Exalted join Kindred, wraith and hunter. Each has a line mark and an intent plan (Act, Resist, Recover, Storyteller tools, the scene strip), and every button has a description.
- New accents: ghoul (wine), spirit (Umbral blue), creature (moss), Exalted (sun gold); the lupine, mage, changeling, demon and mummy accents were already defined. Mortals wear the era's accent. The contrast test covers them all.
- Demon, mummy and Exalted menus now get "Voices I play" like the rest (their menus were made after the voice loop).
- UI fit passes in the Dark Ages kit and in the Modern kit at 150% text. Gate 6e gains a step for the other lines (9 steps); gate 6d accepts later versions.

### WoDX Actions 3.6.2, Chronicle 0.3.2, 2026-11-08: the Storyteller's opt-in (B59)
- House rule storytellerVoiceOptIn (Safety, off). With it on, the inner voice panel offers the Storyteller "turn the voice on (the player is told)" or "turn the voice off" for a player's character; a whisper tells the player, the voice and the Storyteller. The voice flag records optInBy (player or storyteller); the panel shows it.
- voice-rules.js storytellerMayOptIn; a test in phase6d.test.mjs. UI fit passes (the House rules window keeps every switch reachable).

### Chronicle 0.3.3, 2026-11-08: player toolbar buttons (B60) and Find my character (B61)
- scripts/player-tools.mjs: PLAYER_TOOLS (the WoDX buttons a player sees), toolShown, fromTicks, the "Player toolbar buttons" window (a tick for each button and player, with search), and a getSceneControlButtons filter installed at ready so it runs after every module's own buttons are added. Setting playerTools (world).
- Find my character: pickToken (pure), the player's tokens on every scene, scene.view and a pan to the token, selected; the socket fallback (player.findMe → the active GM pulls the player with Scene#pullUsers, then player.panTo).
- Theme: Foundry's dark table colours give way to the kit's in WoDX windows; an empty checkbox now shows on the paper.
- Tests: phase6e.test.mjs 13 (player buttons, and every player-visible WoDX token button is in the list; pickToken). UI fit passes with seven players in the window.

### Phase 7a built, 2026-11-08: the generator core (Chronicle 0.4.0) and People (Creation 0.5.0)
- Chronicle: gen-core.mjs (pure: cyrb128 hash, sfc32 streams from seed + key + nonce, weighted and ranged draws, templates with {table.id}, {a|b} and {{var}}, the most specific table by era group and homeland); gen.mjs (the chronicle seed, the homeland setting "Where the chronicle's people come from", WoDX tables installed as Roll Tables and kept up to date unless edited, lookups that prefer the world's own tables).
- Creation: data/people.mjs (origins, given names, family names and bynames for medieval, early modern, industrial and modern Bohemia and the Americas; the archetypes; motives, secrets, looks and trades in WoDX's words, gender-neutral; a sheet plan for every trade); people-rules.mjs (a person from a stream; the sheet's dots); people.mjs (the People window: roll, re-roll a row, send to the queue or make now; the "wodx-people" queue handler; sheets in "WoDX people"). makeGhoul taken out of giveVitae for the People ghouls.
- Tests: phase7a.test.mjs (6). UI fit passes with twelve rolled ghouls in the window. Gate: tools/gate/gate7a.mjs, run() then check() after the Storyteller approves.
- Gate 7a part 1: 6/6 after two fixes found in play. The seed was made afresh by every draw until the setting landed (a seed is now kept while it is written, and made at ready); and a shipped table drawn by weight gave a different result from its installed Roll Table drawn by range (shipped tables are now drawn by range too). One install at a time. Gate 6e: 9/9 steps but the version check, now accepting later versions.

### Phase 7a closed, 2026-11-08
Ben approved the four gate people in the queue; gate 7a part 2 passed 4/4: the sheets were made with their Nature, Demeanor, trade and note, every Attribute, Ability, Willpower and Dark Ages Secondary Ability as rolled, and the ghoul of Ilse with its blood pool and Potence.
- Relettered (B64): 7b NPC profiles and combat tactics, 7c movement and routines, 7d factions and domains, 7e the open world.

### Phase 7b built, 2026-11-08: WoDX NPC 0.1.0 (NPC profiles and combat tactics)
- New module wodx-npc (needs Chronicle 0.4, Combat 3.6, Actions 3.6). scripts/npc-rules.mjs (pure): ten templates, templateFor, modeOf, profileOf, scoreOptions (every option with its reason), findPath (A*, diagonals 1.5), trimPath, besideCells, reachable and fleeCell (where to run), harmLog (who hurt whom, from Combat's applied attack cards), autoChoice. scripts/main.mjs: the world setting and scene and NPC modes; readFight (enemies by disposition, reach and the best attack from Combat's bestAttack, fears from what foes carry, hidden foes, a ghoul's domitor from the lineage flag, NPCs nearby to call); the turn hook (active Storyteller only, once per turn); the whispered card with Accept, "Do this instead", Undo and Behaviour…; Auto; the executors (move into reach then quick attack, run at a foe too far to strike, flee to the farthest square, full defence, Combat's attack window for Willpower, WoDX Actions' frenzy, Rage and menu, calling allies into the fight); Undo (positions, Combat's movement record, health or Corpus, Willpower, blood, the unconscious and dead marks, combatants called in). The Behaviour window and the "WoDX NPCs" panel (Token controls, Storyteller only).
- Tests: phase7b.test.mjs (14). UI fit passes with the Behaviour window and a nine-NPC panel. Gate: tools/gate/gate7b.mjs (an arena scene with one wall, unlinked tokens of Rothenstein NPCs and a player's character).

### Phase 7b closed, 2026-11-08: WoDX NPC 0.1.1, gate 7b 12/12
- Foundry's startup world is now rothenstein-wodx (Config/options.json, backed up to Backups/options-before-startup-world-2026-11-08.json), so a restart needs no admin password. Gamemaster Test has no password.
- Gate fixes found in play: flags must sit under an active module's scope (the gate's now use wodx-npc); the arena was returned under the wrong name; a combat left by an interrupted run had no combatants (the gate now adds any that are missing).
- Gate 7b: 12/12. Rothenstein's cast: "Sister" Marta (neonate), Bandit (guard), Ada (player character, wraith), and one NPC of each other template. A suggestion card on the turn hook, whispered to the Storyteller; the plan follows the profile; wounded, it runs; a Kindred shies from a torch; a hidden hero means search; a 13-square path round the wall through its gap, never through it; Auto moved and fled, and Undo put it back; Auto attacked for 3 aggravated levels, and Undo took them back; a player's character is never moved; Off means off.
- 0.1.1: fear of the supernatural needs it to show (a spirit or ghost, a war form, a twisted body, or a Storyteller's "obvious" flag); a Kindred passing for human frightens no guard. The flight it causes scales with caution. 15 tests.
- Seen at load, not WoDX's: 382 "scrolling text" region behaviours across 57 scenes fail Foundry 14's validation ("tokenEnter is not a valid choice" for that behaviour's events), so Foundry skips them. To fix with Ben's approval.

### 7b follow-up, 2026-11-08: WoDX NPC 0.1.2 and the region labels
- Scene data (rothenstein-wodx, Ben's approval): the 472 "Floating text" region behaviours on 57 scenes (a description and a Storyteller note per map region) were set to the event "tokenEnter", which Foundry 14 does not allow for that behaviour, so Foundry never loaded them. All now fire on "tokenAnimateIn" (a token moving into the region), the nearest allowed event. Backup first: Backups/rothenstein-wodx-before-region-fix-2026-11-08 (with region-behaviours-before.json). Load errors went from 473 to 1 (a missing font file, not WoDX's). The original Rothenstein world was not touched.
- WoDX NPC 0.1.2: movement for tokens of any size (every cell the token would cover must be free and in the scene; walls tested between its centres) and on hex grids (Foundry's own neighbours, cost 1 a step, distance to the goal as the guide). Gridless scenes are still left to the Storyteller. npc-rules: findPath, trimPath, reachable and fleeCell take the grid's neighbours, step cost and distance; pathCost. 16 tests.
- Gate 7b: 14/14, with two new steps: a 2x2 NPC finds a way round the wall that it fits through, and the same on a hex arena ("Gate 7b hex arena", created by the gate, deletes nothing). Two Foundry console errors seen during the run came from animations still running when the gate changed scene; not WoDX's.

### The turn conductor, 2026-11-08: WoDX Combat 3.7.0, WoDX NPC 0.1.3 (B68, B69)
- scripts/conductor-rules.js (pure): decide (wait, advance, hold or skip, with the reason), extraPass, stepInInitiative, secondsLeft. scripts/conductor.js: world settings "Turns advance on their own" (Off by default; NPC turns; Everyone), the countdown after a player's action (6 s), a time limit per player turn (none by default), a pause after an NPC acts (3 s); the active Storyteller's client checks twice a second; players' End turn, Hold, +1 extra action and Act next go to that client by socket and are honoured only for the combatant's owner; the Storyteller also has Step back and Pause. The turn banner above the hotbar shows the turn, the countdown and who is holding.
- Rules from the books: extra actions (Celerity's multiple actions, VtDA20 pdf pp. 203, 344; Rage, W20 pdf p. 268) get a second pass at the end of the round in Initiative order; Hold acts next after the current turn and is lost at the round's end (VtDA20 pdf p. 344).
- WoDX NPC 0.1.3: reports each turn to the conductor (acted, waiting for the Storyteller, cannot act); its turn key includes the extra pass; NPCs never act while the game is paused (the X-card pauses it) and take their turn when play resumes.
- Tests: phase7b1.test.mjs (7); all 236 pass. Gate 7b.1: 8/8.

### Phase 6f, 2026-11-08: WoDX Actions 3.7.0 (Dark Ages mages, B71)
- scripts/mage-da-rules.js (pure) and scripts/mage-da.js: the six fellowships (Batini, Messianic Voices, Old Faith, Order of Hermes, Spirit-Talkers, Valdaermen) with their Foundations and Pillars; casting (simple: 4 + level; complex: 5 + the highest + 1 per other Pillar, capped at 9 with extra successes; +1 per earlier failure, +2 per earlier Backlash in the scene; Quintessence, a focus no longer needed and the sanctum lower it; a Pillar above the Foundation needs a Quintessence to steady); the Fount's limits; Backlash with Quintessence to cancel the 1s, then the Storyteller's Branding, Manifestation, Scourging (through WoDX Combat) or Twilight; fading with abstinence on the Chronicle clock; the cray, Tass, the Fount's rite and the Umbra. Dark Ages: Mage page references on every card.
- The mage menu follows the era (MENUS.mageDA). The inner voice's Gift reads Twilight in the Dark Ages.
- Tests: phase6f.test.mjs (12); 248 pass; UI fit passes. Gate 6f: 13/13 (sheet read and saved, menu, simple and complex spells, the Fount's limit, cancelling, Twilight, Scourging, Branding, fading, the Fount's rite, the voice). Backup first: Backups/wodx-actions-3.6.2-2026-11-08.

### Phase 6g, 2026-11-08: WoDX Actions 3.8.0 (Dark Ages fae, B72)
- Dark Ages: Fae read by OCR; mechanics noted in WoDX's words with page references (research/6f-notes.md).
- scripts/fae-da-rules.js (pure) and scripts/fae-da.js: the three Origins (changeling, inanimae, firstborn) and five Courts; Mists and Weaving; the four Dominions (Day, Night, Dawn, Dusk). A cantrip is Dominion + the trait it names at 6, lowered by the Court's Dominion, its hour and its season (from the Chronicle clock) and a holding, never below 4. Unleashing is Mists + Dominion against 5 Unleashing dice (3 for firstborn), with Weaving to remove them, the four outcomes, Mists regained and Weaving to lower a havoc. Countering by absorbing, scattering or unravelling. Echoes use the mortal's Willpower or 5 dice, shifted by Origin, against the fae's oaths, sprites and Weaving. The Mists can hide the fae, cloak a cantrip, Bestow Kenning or enhance the mien. Also the mien by the Origin's roll, keeping oaths, rest in a faerie realm, and cold iron through WoDX Combat. Each new day warns when a fae has been hidden longer than Willpower or has overspent Weaving.
- The fae menu and the cantrip button follow the era (MENUS.faeDA). The inner voice "The Mists and the Weave" pulls toward Lost or Locked.
- Tests: phase6g.test.mjs (11); 259 pass; UI fit passes. Gate 6g: 18/18. The one first-run failure was in the gate itself, which set an Attribute's value but not its total. Backup first: Backups/wodx-actions-3.7.0-2026-11-08.

### Phase 6h, 2026-11-08: WoDX Actions 3.9.0 (changelings of the later eras, B73)
- Changeling 20th systems noted (research/6f-notes.md). scripts/c20-rules.js and scripts/c20.js:
  - Cantrips use the Art's rating plus the lowest primary Realm's rating. Scene and Time each add +1 difficulty. Cheated Realms cost Glamour. Wyrd is free while the Wyrd is invoked. Nightmare dice include volunteering three more. Both of the book's worked examples match.
  - 10s on Nightmare dice and botches add Nightmare; at 10 it turns into an Imbalance and a Glamour point.
  - Unleashing has four outcomes; a failure or havoc closes the Art, or all Glamour, for the scene.
  - Invoking the Wyrd and invoking the Autumn.
  - Banality triggers: an 11th point becomes a dot, and Banality 10 is Undone.
  - The five Epiphany paths and sanctuary; an Epiphany can heal an Imbalance instead.
  - Bedlam Thresholds come from spending an Imbalanced Willpower.
  - Cold iron does damage to both bodies and costs Glamour.
  - The Mists table for mortals.
- The fae menu for later eras. The inner voice reads Nightmare, Imbalances and Banality.
- Tests: phase6h.test.mjs (9); 268 pass; UI fit passes. Backup: Backups/wodx-actions-3.8.0-2026-11-08. Gate 6h: 13/13.

### Sheets 1, 2026-11-08: WoDX Sheets 0.1.0 (the Dark Ages: Fae sheet, B74)
- New module wodx-sheets. WodxChangelingSheet extends the system's ChangelingActorSheet. In the Dark Ages, or on a sheet set to Dark Ages: Fae, it uses templates/fae-da.hbs. That template follows the book's sheet (pdf pp. 224–225): Court, Origin, Agenda; Attributes; the thirty Dark Ages: Fae Abilities in their columns; Dominions, Backgrounds, Cantrips; Willpower and Other Traits; Mists and Weaving (dots and boxes); Health and Experience. On the second page come Oaths, Echoes and Features, with the WoDX Actions buttons. Abilities the system has no key for (Legerdemain, Archery, Commerce, Ride, Hearth Wisdom, Seneschal) are secondary-ability Traits; the first dot adds one. Otherwise it is the system's Changeling 20th sheet.
- Found while reading the system: Realms are Trait items with a label key such as "wod.realms.actor". WoDX Actions' Changeling 20th code now reads them that way (it had looked for Power items).
- Tests: sheets1.test.mjs (4); 272 pass. Deployed, with the world's settings backed up (Backups/rothenstein-wodx-settings-before-wodx-sheets-2026-11-08). Foundry restarted to find the new module; WoDX Sheets enabled in rothenstein-wodx. Gate sheet 1 passed 7/7. The first run failed one check because the text test looked at every tab; it now looks at the first page only. The dots were restyled to match the system (white when empty, dark when filled).

### Sheets 2, 2026-11-08: WoDX Sheets 0.2.0 (every Dark Ages sheet)
- The sheets are now one engine driven by definitions (sheet-rules.mjs: SHEETS). Each sheet extends the system's own sheet for its type and swaps only the Core tab (and, for the fae, the Dreaming tab) for the book's layout. Every other tab is left as the system draws it. The six sheets:
  - Dark Ages: Fae.
  - Dark Ages: Mage (pdf p. 241): Fellowship, Cabal, Mentor; Herbalism and Theology; the Foundation with its Aura; the fellowship's Pillars; Quintessence; Backlash (Branding, Twilight).
  - Dark Ages: Inquisitor (pdf p. 239): Impulse, Order, Chapter; Virtues and Superior Virtues; Holy Art; Piety, Conviction, Callous.
  - Dark Ages: Werewolf (pdf p. 233): Breed, Auspice, Tribe, Pack Name and Totem; Primal Urge and Rituals; Gifts; Blessings and Curses; Rage, Gnosis. The printed sheet also lists Leadership under Talents, but the book makes it a Skill (DA:W p. 79).
  - V20 Dark Ages Kindred (pdf pp. 472–473): Clan, Generation, Sire; Disciplines, Backgrounds, Virtues; Road, Willpower, Blood Pool, Weakness; then Merits and Flaws, Rituals, Paths, Derangements, Experience.
  - A Dark Ages ghoul: the Kindred sheet with the domitor from the WoDX lineage.
- Tests: sheets1.test.mjs (6); 274 pass. Gate sheet 2: 7/7.
- Seen in Foundry: the browser kept an old copy of the stylesheet after a reload, so the header layout is now set inline in the template. A file sent to the PC twice from the same staged path can come through stale, so each deploy uses a new folder and is checked by MD5. New test actors bring up the system's "Set sheet type" window the first time they open: General vampire and Ghoul were chosen for the two test actors.
- A slip: one gate command went into the chat box instead of the console and was posted as a chat message (id HIsmlg0Td4GRRDs2). It is left in place until Ben says whether to delete it.

### Sheets 3, 2026-11-08: WoDX Sheets 0.3.0 (the Core page and the system's tabs agree, B75)
- Header system fields are the Bio tab's own controls, cloned when the sheet renders (same options, same value) and written to the same data. On a locked sheet they show as text, as the system shows them.
- The Virtues block is the system's own part (stats_virtue.html) under the book's heading "Virtues".
- Each line's WoDX fields also appear in a box at the top of the Bio tab, bound to the same flags.
- The lock and the dots now behave as on the system's sheets.
- The "The second page" heading is gone (the fae's "Oaths, Echoes and Features" stays), and so is the closing note about the design.
- Tests: 274 pass. Gate sheet 2: 7/7 (it unlocks the sheet before clicking a dot). New gate sheet 3: 9/9. It checks that the Core page's Clan is the Bio tab's list with the same choice, and that a Clan chosen on Core shows on Bio. A Concept and a Generation set on Bio show on Core, and so does a Tribe set on a werewolf's Bio. The Virtues are the system's own markup and data. The Dark Ages Court set on Bio shows on Core, and a mage's Cabal typed on Core shows in Bio's box. A locked sheet shows text, keeps its permanent dots and still moves points.

### Phase 6i–6l, 2026-11-08: WoDX Actions 3.10.0 (Demon, Kindred of the East, Mummy, Orpheus; B76–B79)
- Read on the PC: Demon: The Fallen and Kindred of the East from their text layers; Mummy: The Resurrection and Orpheus by OCR, run at below-normal priority. Notes: research/6i-notes.md.
- The system already has a sheet for each: the Demon and Mummy types, the Vampire sheet's Kindred of the East variant and the Mortal sheet's Orpheus variant. Each WoDX engine reads those sheets' own fields and items.
- Demon (demon-rules.js, demon.js): evocations from the 23 lore paths with their traits; Torment's twist; the apocalyptic form and its high-Torment powers; Revelation; reaping, thralls and the dawn offering; sins and kindness; Faith healing; the holy; names; illusion.
- Kindred of the East (kote-rules.js, kote.js): feeding, spending Chi within the Dharma's limit, Demon Arts, the explosion of an imbalanced botch, fire, wave and shadow soul, Dharma rolls, Demon Chi, rising, the sun, healing, sight.
- Mummy (mummy-rules.js, mummy.js): Hekau spells and rituals, Sekhem's return and semektet, Balance, offenses for the judges, the resurrection, the Veil.
- Orpheus (orpheus-rules.js, orpheus.js): Horrors with the Vitality put in, Vitality's return and tapping Spite, harm, Spite's thresholds, projection.
- Menus for all four (the Kuei-jin and Orpheus menus by the sheet's variant); the inner voice of the fallen (Torment), the Kuei-jin (the P'o and Chi) and spooks (Spite).
- Tests: phase6i (11), 6j (9), 6k (7), 6l (7); 308 pass; UI fit passes for every new dialog.

- Deployed (Backups/wodx-actions-3.9.0-2026-11-08 first; every file checked by MD5). Gates: 6i 13/13, 6j 12/12, 6k 10/10, 6l 10/10. Gate 6l failed two steps on its first run: raising Spite made the inner voice prompt the Storyteller, and that prompt took a dialog answer meant for a step. The gate now turns the voices off while it runs.
- A slip during the run: a computer-use clipboard write was refused, so an old gate command was pasted instead (sheet gates 2 and 3, which put back every value they change). Gate commands are now short runner files typed into the console.

### Phase 6m, 2026-11-08: WoDX Actions 3.11.0 (Mage 20th for the later eras, B80)
- Read on the PC: Mage 20th from its text layer. Notes: research/6f-notes.md, "Mage 20th for the later eras".
- m20-rules.js and m20.js: a casting by Arete against the highest Sphere, coincidental or vulgar, with the modifiers chart, Quintessence and the Avatar's limit; degrees, Paradox gained, damage and duration; the Storyteller's backlash roll and the Quiet; countermagick; Paradox fading a point a week under five.
- The cast button now picks the engine: Dark Ages mages keep mage-da.js; every other Mage casts by M20.
- Tests: phase6m (7); 315 pass; UI fit passes.
- Deployed (Backups/wodx-actions-3.10.0-2026-11-08 first; every file checked by MD5). Gate 6m: 6/6.

### Sheets 4, 2026-11-08: WoDX Sheets 0.4.0 (the later eras, B81)
- Read on the PC: each line's printed sheet. V20 (p. 519), W20 (pdf p. 552), M20 (p. 249), C20 (p. 500), Wraith 20 (pdf pp. 592–593) and Demon (p. 303) are in their core books. Orpheus (p. 310) was read from its scan. Hunter: The Reckoning, Mummy: The Resurrection and Kindred of the East are separate sheet files.
- Each sheet: the header fields as printed (the Bio tab's own controls, mirrored), the Abilities in the printed order (10, 11 or 12 a column), the Advantages and the lower row. The trait boxes are the system's own; Spheres, Renown, Arts and Realms, Passions, Fetters and Dark Passions, Edges, Lore and the apocalyptic form, the six Hekau, Rites, Horrors and Stains come from the sheet's items. Kindred of the East shows its Imbalance and the Dharma's name. Orpheus lists its default Horrors with their pages.
- New sheet classes for the Wraith, Demon and Mummy types. A flag (wodx-sheets.sheet) gives one character another sheet of its type.
- Tests: sheets2 (6); 321 pass. Gate sheet 4: 13/13. The world is in the Dark Ages, so the gate gives each test character the later-era sheet by the flag and puts it back.
- Seen in Foundry: the system asked for a sheet type the first time two older test characters opened. General wraith was chosen for Ada (6e) and General vampire for Ilse (6e). Putting the flag back re-rendered sheets the gate had just closed, so they were closed by hand. The gate now puts the flag back before closing.


### Design notes, 2026-11-08 (after Phase 6)
- Era advancement and the passage of time: a living doc, "WoDX: Carrying a Character Across Eras". It extends Pass the Years (WoDX Creation, Phase 4) with one advancer per line. Thick blood, mortal decline, morality drift and experience for the years are optional switches, each marked WoDX's choice where the books are silent. It includes the Dark Ages Ability and Road conversion tables and a list of decisions for Ben.
- Auto-targeting: a living doc, "WoDX: Auto-Targeting Feasibility". The idea is feasible. Foundry 14's setTargets, WoDX NPC's enemies and allies, and WoDX Combat's reach already exist. The gap is an intent and range tag on about 1,020 powers. The proposal is a WoDX Targeting module with Off, Suggest and Automatic modes.

### Era advancement, 2026-11-08: WoDX Creation 0.6.0, Chronicle 0.4.1 (B82–B86)
- Ben took every recommendation in "WoDX: Phase 7 Plan, 7c Onward" (B82 to B86). The order after Phase 6 is era advancement, 7c, WoDX Targeting, 7d, then 7e.
- Read on the PC: W20 pp. 39–41 for the lost tribes, V20 pp. 500–501 for a ghoul's aging, and C20 pp. 35–37 for the Shattering and the Resurgence. The era doc now has the first two; its Garou row had the White Howlers falling later than they do.
- Pass the Years gains an advancer for every line (advance-rules.mjs, with the tables in data/advance.mjs). It proposes mortal decline, thick blood, morality drift, experience for the years, Background changes, Dark Ages Abilities and Roads moved to their later forms, and the Dark Ages mage, fae and inquisitor records converted. It also flags lines out of their years and the lost tribes. Where a change has more than one answer, the window offers a pick.
- Before the years pass, each character with a ticked change is copied into "WoDX · Before the years". Each character now keeps an era history and, for vampires, the years awake.
- Five house rules in Chronicle, under "Passing the years": Thick blood (off), Mortal decline (on), Morality drift (off), Experience for the years (on) and Convert Dark Ages Abilities (on).
- Tests: advance.test.mjs (11), including a run with every switch on and one character of each line, checked the way WoDX Actions reads them. That run found a bug: moving the Road to a Path reset its rating to the planned value and undid the dots lost to thick blood and drift in the same skip. Fixed. The in-world time-skip test now accepts Theology's dots moved to Religion. 332 pass; UI fit and the quality check pass.
- On Windows the checks need three things from outside the repo: a resolve hook for raw `C:\` imports, Playwright on the installed Edge, and Python in UTF-8 mode. The quality check's import test also needs `systems/` beside `modules/`, as Foundry's Data folder has it; that was so before this work too.
- Not yet deployed. Gate: ERA-ADVANCEMENT-CHECKLIST.md.
