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
  - `data/disciplines-daw.json`: 329 entries from VtDA20 pp. 188–316: every Discipline and variant at levels 1–5 with roll, difficulty, cost, duration and a short summary; Celerity, Fortitude and Potence 1–5 as passive; Thaumaturgy, Koldunic and Necromancy path powers with their tradition's rule; 122 elder powers by name, level and page.
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
- Deployed (Backups/wodx-creation-0.5.0-2026-11-08 and Backups/wodx-chronicle-0.4.0-2026-11-08 first; every file checked by MD5). The gate is scripted (tools/gate/gateera.mjs) and runs in wodx-template only, since it moves the clock. Not yet run.

### Era advancement gate, 2026-11-08: WoDX Creation 0.6.1
- First run in wodx-template: 3 of 7. Planning stopped on "Flag scope wodx-actions is not valid or not currently active". WoDX Actions, Combat, NPC and Sheets are off in wodx-template, and Foundry refuses getFlag and setFlag for a module that is off. Pass the Years read and wrote Actions' Road, mage, fae and inquisitor records, and the Sheets flag, that way.
- Fix: advance.mjs now reads and writes those flags through the actor's flags object, so Creation works with Actions or Sheets off. The harness mock never checked the scope, which is why the tests missed it. A new test turns the two scopes off the way Foundry does and runs a plan and its changes; it fails on 0.6.0 and passes on 0.6.1.
- Second run: 4 of 7. The template's clock stood in 2025, so the skip "to 1840" ran backwards. The gate now puts the clock in 1200 before it makes the test characters; step 7 still puts it back.
- Third run: 7 of 7, no console errors. Afterwards the world had no test characters, snapshots or test folder left, and the clock and era were back as they were (2025, modern).
- win-paths.mjs also caught require() calls and stopped ui-fit.mjs loading Playwright. It now leaves require() alone.
- Tests: 333 pass; UI fit passes. Deployed (Backups/wodx-creation-0.6.0-2026-11-08 first; files checked by MD5).

## Phase 7c, 2026-11-08: WoDX NPC 0.2.0
- Movement and routines, per the Phase 7 Plan (7c Onward) and B85; choices in B87–B90.
- routine-rules.mjs (pure): hour blocks with day, night, weekday and feast-day conditions, a block past midnight kept with the day it started; presets per template; place roles and kinds; feast days (Easter by the Julian or Gregorian reckoning, the fixed and movable great feasts, the chronicle's own); the curfew; noticing by the era's book (V20 or V20 Dark Ages) with Sneaking and Obfuscate; the reaction pick from the 7b profile.
- routines.mjs: places as scene and region flags, the Places window (search box, first guesses from scene names, owners matched to NPCs), the routine editor, the clock hooks (walk on the scene in view, jump elsewhere, place on opening a scene and after a skip), routine cards with Accept and Undo, Auto with Undo that never removes a hand-placed token, pauses for a fight or a reaction, reports for the dead and missing.
- The WoDX: Reaction region behaviour (enter, leave, stay), registered through module.json's documentTypes, so Foundry needs a restart after deploying.
- Obfuscated and Sneaking registered as WoDX conditions.
- No NPC dialogue: every card says the Storyteller speaks for the NPC (rule 11). Text is gender-neutral.
- Tests: 348 pass (15 new: phase7c.test.mjs, phase7c-runtime.test.mjs). UI fit covers the Places window and the two new dialogs. Gate: tools/gate/gate7c.mjs, run in wodx-template with four Rothenstein NPCs copied in (Sergeant Heinz Volker, Ludwig of Regensburg, Father Ludovic, Voivode Bogdan Ursu).

### Gate 7c, 2026-11-08: WoDX NPC 0.2.1
- First run in wodx-template: 13 of 20, no console errors. Every hourly place, every walk round the wall, Suggest, Accept, the fight pause, opening a scene and the clean-up passed.
- Every failure was a token that had to jump across the wall: Foundry 14 holds a plain position update at a wall, so a jump from the watch-house to the lane (and after the week's skip, to the homes and the haven) stopped short. With the guard out of place, the reaction and Obfuscate steps had no watcher. Fix: a jump is now made as a displacement (a move that ignores walls), checked, with a plain update as the fallback; Undo moves tokens back the same way.
- Foundry 14 warned about the "-=" key for deleting a flag. WoDX NPC now uses ForcedDeletion where Foundry has it (as WoDX Otherworlds already did).
- The gate's own error: it looked for the merchant's token at 23:00, when the merchant is at home on the other scene. It now checks the walk into the market at noon.
- Ben, 2026-11-08: testing moves to rothenstein-wodx. The gate now copies its cast from the world itself, picks the next plain Monday to Wednesday in the world's own year, and at the end puts back the clock and every character, unlinked token and WoDX setting the clock work changed, then deletes its scenes, folder, copies and cards.
- Second run, in rothenstein-wodx on 0.2.1: 23 of 23, no console errors. The days used were Monday 10 to Wednesday 12 July 1200. The guard challenged the wanderer in the church close after curfew; under Obfuscate the card read "Obfuscate 2 against Auspex 0: unseen"; the market walk crossed the wall's line only through the gap. The clock work had changed four test-pack characters while the gate ran (Lord Taalandryn, Magistra Ottilie, Neferet, Wilhelm Eisenfang); the gate put all four back, and no tokens, settings, items or effects needed it. Removed afterwards: the two gate scenes, the folder, the five gate actors and 20 cards. The world was backed up first (Backups/rothenstein-wodx-2026-11-08-gate7c).
- Left for later: WoDX Actions and Combat still register the renderChatMessage hook, which Foundry 13 deprecated (removed in 15). Not part of 7c.

### UI review, 2026-11-08: WoDX Chronicle 0.4.2 (header buttons)
- Ben asked for a check that key buttons, such as close and minimize, can be seen on every WoDX window.
- Found: in the WoDX look, the close button and the controls menu (⋮) in the title bar of every WoDX window showed blank. Foundry 13 and 14 draw those icons with the Font Awesome font on the button itself. The look's button rule set every button's font-family to the era's text face, which beat Font Awesome's class rule, so the glyph had no font to draw it. The buttons still worked, but nothing showed. Foundry's own windows, and the system's sheets, were never affected; the look only touches `.application.wodx`.
- Fix (wodx-theme.css): the button rule now skips `.header-control`. The header buttons also get a light hover in the bar's ink colour, in place of the accent fill meant for buttons on the page.
- Foundry has no minimize button: a window minimizes by double-clicking its title. The check below makes sure the title keeps room for that.
- UI fit (ui-fit.mjs) now draws the frame as ApplicationV2 does (icon, title, controls menu, close) and checks the header in every window at each screen size: the close button is there, both buttons sit inside the bar and can be clicked, their icons use the icon font, and the icon has at least 3:1 contrast against every colour of the bar, gradients included. It checks again with a long title and when minimized. Before the fix every window failed on the header icons; after it, none does. Every era kit's bar and ink pair was also checked: all are well above 3:1.
- Tests: 333 pass; quality check passes.
- On the PC, with Foundry 14's own foundry2.css and Font Awesome: UI fit passes every window. With the old wodx-theme.css it fails 468 window checks on the header icons, so the check catches the bug against the real stylesheet.
- Deployed once Ben said no game was running (Backups/wodx-chronicle-0.4.1-2026-11-08 first; module.json and wodx-theme.css checked by MD5) and Foundry reloaded. In rothenstein-wodx (Dark Ages kit) the Chronicle Clock and the WoDX Actions menus for Kindred, Garou, mage, wraith, fae, hunter, demon, mummy and mortal all show ⋮ and ✕, drawn in Font Awesome 6 Pro, dark ink on the parchment bar. The system's sheets for the same characters show their Sheet, Prototype Token, Alter Ego and Close buttons. The running server still reports Chronicle 0.4.1 until Foundry is restarted, since it reads module.json at start; the stylesheet is the new one.

### Line skins, 2026-11-08: WoDX Sheets 0.5.0 (B91 to B96)
- Ben approved all six recommendations of the design note "A Look for Each Line". Each line's character sheets now get their own title face, paper and section rules, light and dark: Kindred, ghouls, mortals and Kinfolk, Garou and the Changing Breeds, mages, changelings, wraiths, hunters, Dark Ages inquisitors, demons, mummies, Kindred of the East, Orpheus and creatures. Exalted sheets keep the system's look.
- Fonts: ten SIL OFL faces (IM Fell English SC, Cormorant SC, Metamorphous, Cinzel Decorative, Almendra, IM Fell DW Pica, Cinzel, Marcellus SC, Shippori Mincho, Alegreya SC) cut to Latin and bundled in wodx-sheets/fonts with their licences. Mortals, hunters, inquisitors and Orpheus use Chronicle's Baskerville, Special Elite, UnifrakturMaguntia and IBM Plex.
- Papers are CSS gradients and SVG noise; rules are SVG paths. All are drawn by WoDX, and nothing is taken from the books or the system's art. The stylesheet (styles/wodx-skins.css) is written by tools/skins/build-skins.mjs from tools/skins/skins-data.mjs.
- A heading's text sits over the middle of its rule, so ornaments (blood drops, the nine Spheres, claw marks, crosses, the halo, ankhs, paw prints) are drawn at either side of it.
- The system sets its banner images on inner era blocks and clears some in dark mode, so the skins set the rules on the banners themselves. The system's own line fonts are set on the banner text, so the title face is set there too.
- WoDX Sheets puts its sheet class (wodx-inqDA, wodx-kote, wodx-orpheus, the ghoul sheets) on the form inside the window, so those skins match with :has(). The first deploy missed this. In Foundry the inquisitor wore the hunter skin, and Kindred of the East and Orpheus wore the Kindred and mortal ones. Fixed in the second commit, and the preview now fails when a sheet wears another line's skin.
- New world setting "Sheet look": WoDX line skins (default) or the system's own look, which brings back the system's fonts and banners (B94). It switches at once, with no reload.
- Window Controls 2.0.1 (MIT) and libWrapper 1.13.5.1 installed and turned on in rothenstein-wodx (B92). Windows now have a minimize and a pin button in the title bar. libWrapper was already installed at the same version, and the copy that was there is in Backups/lib-wrapper-1.13.5.1-2026-11-08.
- Tests: skins.test.mjs (6) checks contrast against each paper (text 7:1, rules and accents 3:1), that light papers are light and dark ones dark, the font files and their licences, well-formed rules, and that the stylesheet matches the generator. 339 pass in all, and the quality check passes. tools/harness/skins-preview.mjs draws every skin, light and dark, over the system's CSS and checks each sheet's face, rules and skin.
- Deployed: Backups/wodx-sheets-0.4.0-2026-11-08-skins first. Every file was checked by MD5, then Foundry was restarted so the new modules were found. In rothenstein-wodx, checked live: V20 Dark Ages Kindred, mage, demon, wraith, inquisitor (after the fix), Orpheus and a Dark Ages ghoul, plus the setting both ways. The only console error is the system's missing fonts/Vrev.TTF, which was there before.

### Chat hook, 2026-11-08: WoDX Actions 3.11.1, WoDX Combat 3.7.1
- Ben asked that WoDX not depend on the renderChatMessage hook (deprecated in Foundry 13, removed in 15). Actions and Combat kept it only as a fallback for Foundry 12 and older, which WoDX no longer runs on; both now bind their cards through renderChatMessageHTML alone. No WoDX module registers renderChatMessage now. The warnings seen in gate 7c also came from other modules (Dice So Nice, Polyglot and the vtda20 modules), which WoDX cannot change.

### Gate 7b1 again, 2026-11-08: WoDX Combat 3.7.2
- Rerun in rothenstein-wodx after the chat-hook change: 5, 6, 6 and 7 of 8. Two causes, neither from the hook change. In the gate: when an NPC came first in the new round it acted before the gate started looking for its card. In the conductor: a turn that the Storyteller (or a gate) came back to kept its old state, such as an action already spent, and a time limit set, or the level raised to Everyone, during a player's turn never started counting. Fixes: the conductor starts a turn afresh whenever the turn or round changes, and starts the time limit as soon as it applies; the gate looks for cards from before the new round and sets the turn before switching the conductor on.
- Combat 3.7.3: on 3.7.2 the runs scored 5, 7 and 8 of 8. Clearing the turn's state when the turn moved left a gap of up to half a second in which a player's action card was missed; the conductor now sets the new turn up at once, and a card that arrives first sets it up too. Gate 7b1's hold step failed whenever the hero came last in the round, since a hold on the round's last turn is lost at once (VtDA20 p. 344, working as meant); the gate now puts the hero first. A core Foundry error seen twice, an expired effect on an unlinked token's delta that no longer existed, comes from Foundry's own effect clean-up at the start of a turn, not from WoDX.
- Combat 3.7.4: on 3.7.3 the runs scored 7, 8 and 7 of 8. Act next gave the held character the Initiative halfway between the current and the next combatant; when those two were tied there was no room between them and the held character could sort in front. The current combatant now moves up a hair first. The gate's step 2 also read the conductor's reason before its first check of the new turn; it now waits for it.

### Text cleanup pass, 2026-11-08 (B48, B97)
- Every player-facing string in the seven WoDX modules was read for gendered wording and for writing tells. Cards, dialogs, menu descriptions, settings hints, chat notices and the power and Gift libraries (disciplines-daw, gifts-daw, arcanoi-w20, wraith-w20) now say they/their, the character's name, or "the vampire", "the Garou", "the wraith" where they said she/her or he/him. About 130 strings changed.
- Kept as the books have them: Gaia's "she", Man's Skin ("appears as a man"), Warders of Men, man-at-arms, the Road sins "the laws of God or man" and "blood-brothers".
- Em-dashes are gone from prose. Dialog titles read "Cast a cantrip: Name", card headers "Name: Glamour 3/5", menu descriptions put the detail in brackets, and macro headers use a full stop. A lone "—" or "— none —" stays as the empty choice in a list.
- About twenty stock flavor lines (Actions and Combat) lost their tidy one-word punchlines ("Almost.", "Not yet.", "That is not nothing.", "the best kind of done").
- System fork: one English string (Remain Active, a werewolf "she") made neutral. The other languages are upstream's and were left alone.
- New test tools/harness/text-cleanup.test.mjs scans every module's strings for he/she/him/her/his and for em-dashes in prose, so new text keeps to the rule. 341 pass, the Otherworlds tests pass, and the quality check passes. Rebased on main after PR 2 (7c) merged: 358 pass, with the 7c text clean too.
- Text only, no version bumps: the new wording reaches Foundry with each module's next deploy.
- Second pass (Ben: repeating the project's instructions in body text is also a tell). In-game strings no longer carry decision numbers (B40, B42, B55, B83, B85, B86, B99), phase names ("Used from Phase 5", "the Phase 4 gate"), Ben's name as a rule's source, or notes that a summary is "in WoDX's own words" or "mechanics only". "WoDX choice" now reads "house rule", which is what a Storyteller would call it. The guard test gained a third check for these. 388 pass.
### Phase 7d, 2026-11-08: WoDX NPC 0.3.0, WoDX Actions 3.11.2 (B98 to B102)
- Factions: each has a kind, a leader, members, places held (from 7c), goals, Backgrounds as assets (Herd, Influence by sphere, Resources, Status, Domain, Retainers, Contacts) and a standing of -3 to +3 with each other faction. The Factions window lists them, with a search box, and edits them; one button sets up Rothenstein's ten factions from the chronicle's own people and places (B102).
- Faction turns (B98, B99): once a week of world time, at the end of a session, at each week of a time skip (at most twelve) or when the clock passes a week. Each faction picks expand, defend, scheme, recruit, hunt or lie low from its goals and the moment, and rolls its leader's Attribute plus the move's Background; a move against a rival is contested. Picks and dice are seeded (B52). In Suggest (the default) every result waits in the approval queue; in Auto small results apply at once with an Undo on the turn's card and big ones (a place, a member, a new faction, a breach rising) wait (B86).
- Hunting grounds: each place has an area (from its name and era, or set by hand) with the book's difficulty (V20 p. 260; V20 Dark Ages p. 334). Domain and Fame lower it, Herd adds dice, and hunting in another's domain adds its security; a trespass that is seen sours the holder's standing, through the queue. A Hunting window rolls it.
- Masquerade rumours (B101): WoDX Actions 3.11.2 calls a new hook, wodxBreach, when it records a breach, and the Storyteller can report one by hand. Each breach spreads by the day through places and Contacts, rises to the Prince and then to the era's hunters (the Inquisition before 1600, mortal hunters to 1998, the imbued after); each rise is a card in the queue. It is contained when every witness has been dealt with first, and fades in a quiet week until the hunters hear of it.
- Untended Backgrounds follow B83 at the end of a long skip.
- Tests: phase7d.test.mjs (14) and phase7d-runtime.test.mjs (13); 383 harness tests pass. UI fit covers the Factions window, the editor, Hunting and Report.
- Gate: tools/gate/gate7d.mjs (three turns in Suggest and Auto, Undo, a skip, a recorded breach followed for 14 days through the Prince and the hunters, containment, hunting). It never moves the clock and puts every setting, journal and message back.
- The first gate run scored 9 of 10: rothenstein-wodx has no places tagged in 7c, so a rumour had nowhere to go while the factions held scenes by name. Every scene that is not a battle map is now a place, its kind guessed from its name. The rerun scored 10 of 10: the talk reached 2, 4, 6 and 8 places on days 1 to 4, rose to the Prince on day 3 (approved) and to the Inquisition on day 4 (stopped). At the court's own Inner Ward (heavily patrolled, 8) the court hunts at 4; a stranger at 9, as a trespass.
- UI fit on the PC with Foundry's own CSS passes every window. It also needed file names cleaned of characters Windows refuses, now that dialog titles carry colons.

### Phase 7e, 2026-11-08: WoDX Storyteller 0.1.0, WoDX Chronicle 0.4.3 (B103 to B107)
- New module WoDX Storyteller (B103): the open world. world-rules.mjs holds the rules with no Foundry in them; core.mjs the log, personal times, travel, solo play, convening, beats, dawn and the session; apps.mjs the windows.
- The Storyteller's tracker (binoculars, Storyteller only): every player character's place, time against the clock, solo acts tonight and whether they are in a called scene; the spotlight since the session ended, quietest first; the feed with filters by character, place and kind, and "only what needs a look". Buttons: Convene, Beats, Travel places, Tonight's summary, Between sessions, End the session, Out on their own.
- Out on your own (walking figure, every player; listed in Player toolbar buttons): travel to an open place, and act alone, with the character's time, the hours to dawn and the night's solo acts shown first.
- Personal time and dawn (B104), travel and road encounters (B105), solo play (B106), convening, beats and the report (B107). Encounters, beats that call characters, trips to a place that asks first and results that change the world wait in the approval queue (B86).
- WoDX Chronicle 0.4.3: "Out on your own" joins the player buttons the Storyteller can hide. Nothing else changes.
- Tests: phase7e.test.mjs (11) and phase7e-runtime.test.mjs (12); 411 harness tests pass and the quality check passes. UI fit covers the tracker (300 feed lines, twelve characters) and all nine dialogs; run here with a blank stand-in for foundry2.css it finds no missing search boxes, and the real check (Foundry's own CSS) waits for the PC.
- Gate: tools/gate/gate7e.mjs, for rothenstein-wodx (two characters of its own; puts back the clock, settings, queue, scenes and cards). Not run yet: built during the 2026-11-08 playtest, when the PC and Foundry were off limits. Not deployed.
- 2026-11-09: UI fit on the PC with Foundry's own CSS passes (549 ok, 0 fail). Deployed to the PC. Gate 7e first scored 9 of 10: a trip left an unlinked character's old token behind. With the fix in moveToScene it passed 10 of 10 in rothenstein-wodx. The fix ships as 0.1.0, the version on the PC.

### Interactables, step 1, 2026-11-08: WoDX Interactables 0.1.0 (B108 to B112)
- A new module, WoDX Interactables, on core Foundry walls. Doors, gates, windows, shutters and hatches keep their settings in flags.wodx-interactables, set in a WoDX part added to the wall's own config window: kind, material, build, lock grade, keypad or alarm, key, a bar and its side (named by compass), stuck, secret door found, and a breakable wall for walls that are not doors. Left blank, a locked door has a good lock and the build follows the material, so plain doors need no setup.
- The Interact window (token HUD button, the I key, or clicking a locked door) lists what is within reach of the token on its level, nearest first, never through another wall, and never a secret door a player has not found. Each option shows its pool, difficulty, successes needed, time per roll and noise before the roll: open, open quietly, close, lift the bar, the key, pick the lock, beat a keypad (modern eras), force it, break the pane, heave a stuck window, listen, knock, and a power button that opens the WoDX actions menu.
- The door click extends Foundry 14's door control class (CONFIG.Canvas.doorControlClass, read in the 14.369 source); core's own click still runs. A world setting turns it off.
- The player's client rolls with WoDX Actions' pool rules and posts a card. The active Storyteller's client reads the dice from that card, checks the player owns the character, works the result out from the door as it is now, and applies it with an Undo. A wall knocked through goes to the approval queue instead (B111).
- Lock grades, forcing, bars, the lock skill by line and era, keypads and alarms (B109, B110). Noise, hearing, listening, retries and the clock (B112). A botch on forcing is one lethal through WoDX Combat, and Undo heals it.
- Tests: interactables.test.mjs (33: rules and the runtime on a stand-in for Foundry); 444 harness tests pass, with 7e merged. UI fit covers the Interact window, the roll dialog and the wall config part.
- Gate: tools/gate/gate-interact.mjs passed 10/10 in rothenstein-wodx on 2026-11-09 (commit e69ea48), after the module was deployed and turned on there. Five runs before it failed on the gate script alone: Foundry 14 maps randomUniform to faces the other way round and refuses evaluateSync on dice, the room sat outside the default reach, the gate set attribute values without their stored totals, and created walls and tokens do not always come back in the order given. PRs 14 to 19.
- V20 core page refs are still TODO; the V20 Dark Ages refs are in.

### WoDX Targeting, 2026-11-08: WoDX Targeting 0.1.0, WoDX Actions 3.12.0, WoDX Combat 3.7.5 (B84, B113, B114)
- A new module, wodx-targeting, built from the Auto-Targeting Feasibility note with Ben's B84 choices: Suggest by default, Automatic for the Storyteller only, voice range 30 yards, hostile powers rank the last attacker, then whoever is engaged, then the nearest.
- Tags (B114): 931 library powers carry an intent and a range in data/tags.json. tools/targeting/seed.mjs seeded them from each power's data (a difficulty set by the target, "passive", words in the summary), then each was read by eye and about 370 were corrected. Elder powers and path powers with no summary were tagged from their names. Sheet-only powers are guessed from their names at use.
- The picker (target-rules.mjs, pure): sides by disposition as WoDX NPC reads them, range bands, the ranking for each intent, the casting default from Spheres or Art, the mode for each user, and who attacked whom last from WoDX Combat's cards.
- The panel (B113): at the top of the Discipline, Gift, Arcanos, Evocation, Edge, Horror, Hekau, Blessing, M20 Effect, Dark Ages spell, C20 cantrip and Dark Ages cantrip windows. It names its choice and why, the next three, and No target; it follows the power chosen; area powers list everyone in range to confirm. The attack window opens on the likeliest foe and can switch or clear it.
- WoDX Actions 3.12.0: scripts/aim.js joins each window to the panel when the module is on; nothing changes when it is off. WoDX Combat 3.7.5: attack() asks the picker when no target is set.
- Tests: targeting.test.mjs (18): the tags (every power, none stale, spot checks), seeding, sides, modes, every ranking, the hand-set rule, and the panel on a stand-in for Foundry (Suggest, Automatic, hand-set, Off, a casting, the attack). 406 harness tests pass and the quality check passes. UI fit with Foundry 14's foundry2.css and Font Awesome: every window passes, four new targeting windows among them.
- Gate: tools/gate/gatetarget.mjs, for rothenstein-wodx only. It builds a scene and actors of its own and deletes them. Deployed on 2026-11-09 after the playtest, with Ben's OK. The first run scored 7/9: steps 4 and 5 read the window's first power, Celerity, which works on its user, so the gate now chooses Dominate first (PR 13). The rerun scored 9/9, and the ticked area boxes show by eye.

### Common checks, 2026-11-09: WoDX Actions 3.13.0 (B115)
- Player feedback from the 8 November playtest: no generic Perception check, nor other everyday rolls, in the menu. The free roll could do them, but it was hidden behind "Action / Dramatic system" and a list of 30 presets. Audit against the V20 core (printed pages, read on the PC): docs/research/common-rolls-audit.md.
- New: Common checks (scripts/checks-rules.js, pure): 41 checks in six groups (senses, body, knowing, people, holding firm, an Attribute alone), each with its pools, usual difficulty, a note and its V20 page. The window shows the pool before the roll and posts the usual card. The button sits second in every line's Act group, after the free roll; DESC and MENU_PLAN entries for all 17 menus.
- The free roll is renamed "Any roll / dramatic system". Its preset list gains the 41 checks ("Common: ...") and the V20 systems it lacked: Driving a car (Dexterity + Drive, p. 258), Computer use (p. 263), Carrying capacity (p. 259), Science in Research (p. 265). Presets with several pools now pick the best the character has.
- An Ability missing from the sheet is rolled under the untrained rules by its kind (a Talent adds nothing, a Skill +1 difficulty, a Knowledge refused).
- Tests: checks.test.mjs (11: the list, the pool choice, the kinds, and the roller on a stand-in for Foundry with fixed dice); 473 harness tests pass. UI fit covers the Common checks window and the free roll opened on a check.
- Gate: tools/gate/gatechecks.mjs, for rothenstein-wodx (one mortal of its own, deleted with its cards).
- 2026-11-09: deployed to the PC (57 files, MD5 checked; it reaches the Live world too, which Ben allowed). The first gate run scored 7 of 9 because the gate set its mortal's Perception value but not the stored total, so it rolled Perception 1 (fixed in PR 26). The second run passed 9 of 9 in rothenstein-wodx.
### Older gates fixed, 2026-11-09: gates 6b, 6c and Sheets 1 (gate scripts only)
After the 7e, Interactables and Targeting deploy, three older gates failed in rothenstein-wodx. Each failure came from the gate script, not from a module. No module changes.
- Gate 6b, silver by form (16/18): the module was right. In Crinos the silver hit was aggravated and unsoakable, and in breed form it soaked at 6 with the rest lethal (Dark Ages era, DA:W p. 102). The gate reset bashing and lethal damage but never aggravated, so Wilhelm kept each earlier run's silver wound and stood at 7 aggravated. The card then ran past the 600 characters the gate read, so the silver note was cut off. The gate now clears all damage before each hit and checks the whole card.
- Gate 6b, talen spent and kept: the talen spent by the first run stays on the sheet marked spent, as it should, so later runs were turned away. The gate now makes the test talen whole again before the step.
- Gate 6c, inquisitor Blessing (17/18): the risked Conviction worked (4 to 5, Piety 6). Now that the test hunters belong to a test player, the inner voice posted "The Impulse grows" when Conviction rose, and the gate read that card in place of the Blessing card. The gate turns the inner voices off while it runs, as 6l and 6m already do, puts the setting back after, and finds the Blessing card by its text.
- Sheets gate 1 (2/7): written for Sheets 0.1. Since 0.3 the sheet's page is .wodx-book with data-set paths, Mists and Weaving are two tracks, sheets open locked, and a modern changeling has the WoDX Changeling 20th sheet. The gate now uses the current markup, opens the sheet unlocked and puts the lock back.
- 473 harness tests pass (with Actions 3.13.0 merged) and the quality check passes.
- Rerun on main 5a5eba2 in rothenstein-wodx, 2026-11-09: 6b 18/18, 6c 18/18, Sheets 1 7/7. The gate scripts were deployed through a fresh folder with matching MD5s, and no module versions changed. The results are in the project's gates folder (the 2026-11-09b files).

### Interactables 0.2.0, 2026-11-09: containers (B116)
- Ben asked for every suggested kind of interactable, containers, traps and clues first. All nine are on the Master Plan's Interactables list.
- Containers on tiles: chest, box, cabinet, desk or filing drawers, strongbox, safe. The WoDX part of the tile's config window sets the kind, material, lock, state, keypad, key and what is inside (one item a line: a UUID or a world item's name). They are listed in the Interact window with the doors, and a hidden tile only for the Storyteller.
- Options: open, close, take what is inside, unlock with a key, pick the lock, beat a keypad (modern eras), force it. Taking gives the character a copy of each item; Undo takes them back. Same cards, noise and Undo as the doors.
- Tests: 6 new in interactables.test.mjs (3 rules, 3 runtime); 479 harness tests pass with main merged. UI fit adds two containers to the Interact window and the tile config part; every window passes.
- Gate: tools/gate/gate-interact.mjs gains steps 11 (a chest picked, opened and emptied; Undo) and 12 (the tile config part). Deployed 2026-11-09 (backup Backups\wodx-interactables-0.1.0-2026-11-09, 5 files, MD5s match); gate 12/12 in rothenstein-wodx at 4a6a04b.

### Interactables 0.3.0, 2026-11-09: traps (B117)
- Traps on tiles: snare, pit, tripwire, spring blade, in four grades. The WoDX part of the tile's config window gains a Trap section: kind, grade, damage dice and type (blank for the kind's own), armed, found, and whether NPCs set it off.
- Springing: the Storyteller's client watches token moves. An armed trap goes off on a hidden path through it, or when a move ends on a found one. A Dexterity roll to get clear, then the damage through WoDX Combat's soak and apply; a snare holds its victim. The card names who heard the noise and has an Undo that puts back the trap, the tile's hidden state and the damage, and removes the combat card. A new world setting, Traps go off, turns it off.
- Searching: the Interact window gains Search the area (Perception + Alertness or Investigation, a minute). Each hidden trap within three squares is found when the successes reach its grade, and the tile is shown to players; the Storyteller is whispered what was missed. Undo hides them again. The window now opens even with nothing in reach, so the search is always there.
- A found trap: disarm it (Wits + the lock Ability, a botch sets it off), set it off from a safe distance, set it again once spent. A snare's victim breaks free with Strength; anyone else cuts them free.
- Tests: 9 new in interactables.test.mjs (3 rules, 6 runtime); 488 harness tests pass with main merged. UI fit adds two traps and the search roll window.
- Gate: steps 13 (search finds a hidden pit; Undo), 14 (walking into it springs it, a WoDX Combat card; Undo puts it all back) and 15 (a found snare disarmed; Undo). Deployed 2026-11-09 (backup Backups\wodx-interactables-0.2.0-2026-11-09); the first run scored 14/15. Step 14 failed because the gate's burglar belongs to the Storyteller, so the pit, set for players' characters only, let it pass; the gate's pit now goes off for NPCs too.

### Interactables 0.4.0, 2026-11-09: clues (B118)
- Clues on tiles: a letter, ledger or document; a bloodstain or mark; writing or graffiti; tracks or a trail; something out of place. The tile config gains a Clue section: kind, the name players see, the successes it takes to notice a hidden one, and four texts (what anyone sees, then 1, 2, and 3 or more successes).
- Reading (Intelligence + Investigation) or examining (Perception + Investigation), difficulty 6, a minute; no roll when only the first text is written. What is learned goes in a whisper to the player and the Storyteller; the public card only says it was examined. Each character's best successes are kept on the tile.
- Search the area also notices hidden clue tiles by their own number of successes.
- Tests: 4 new (1 rules, 3 runtime); UI fit adds a clue with a long name to the Interact window and shows the whole tile config. Gate step 16 (a letter read, the whisper checked, Undo). Deployed 2026-11-09; gate 14/16. Step 16 failed because the gate's burglar has no Investigation, and an untrained Knowledge is not rolled, so nothing was rolled at all. Clues now offer Look at it (no roll, the first part) beside Examine closely (needs Investigation), and the gate gives the burglar a dot. Step 14 still failed with the pit set for NPCs; the gate now jumps the token with a displace move and records why, calling the move handler directly if the hook did not fire.

### Interactables 0.5.0, 2026-11-09: light sources (B119)
- Light sources on tiles: torch or brazier, candles, lantern, oil or gas lamp, electric light switch. The tile config gains a Light source section: the kind, the ids of the lights it works (blank: the lights on it or within a square), and Broken.
- Light it, put it out, switch it on or off: a turn, no roll, silent. A lantern, lamp or electric light can be broken (loud; it stays dark). WoDX Otherworlds' copies of those lights on the twin levels go on and off with them. Undo puts each light back.
- Tests: 2 new (1 rules, 1 runtime); UI fit adds a lamp. Gate step 17 (a lantern lights the light beside it; Undo). Deployed 2026-11-09: gate 17/17 at 70673c3. Step 14's diagnostics showed the pit fires from the move hook once the token really lands on it: the earlier misses were a plain token update that Foundry stopped short.

### Interactables 0.6.0, 2026-11-09: hiding places (B150)
- Hiding places on tiles: wardrobe or cupboard, under a bed or table, behind a curtain or tapestry, deep shadows, crawlspace or loft, priest hole. The tile config gains a Hiding place section: kind, room, and who is in it now.
- Hide here (Dexterity + Stealth): in and out of sight at once (the Invisible status, so the player still sees the token); successes make the hider harder to find. Search it (one success better) or Search the area finds them by successes, and the Storyteller is whispered who stays hidden. Come out, or walk out, to end it. Undo on every result.
- Tests: 3 new (1 rules, 2 runtime); UI fit adds a full priest hole. Gate step 18 (the burglar hides in a wardrobe; Undo).
- Deployed 2026-11-09 from main 414877e (backup Backups\wodx-interactables-0.5.0-2026-11-09, five files, MD5s match). gate-interact 18/18. Step 18 used the token's hidden switch (no Invisible status in that world).

### Dated events and the long time skip, 2026-11-09: WoDX Chronicle 0.5.0 (B120, B121)
- From the gap review in the Master Plan (items 1 and 2), which Ben asked to have built in full.
- Dated events: 25 events with their book dates and pages, fired once as the clock passes them, undone when it goes back, one card per time skip, a Chronicle Rules page, and a Dated events window (search box, a switch, date and journal link per event). Metaplot events start off. The Future Darkness branch switch picks the timeline.
- Hold the world: a Clock button that lets the clock move with nothing reacting; every module's per-tick work already checks isSkipping(), which now covers the hold. Releasing catches up once.
- Tests: events.test.mjs (10) and longskip.test.mjs (9: one chronicle from 1197 to 2025 in seven Pass the Years steps with a Kindred elder, a ghoul, a mortal and a journal; after each step no actor, item or journal is lost, the era follows the date, the events fire oldest first and the elder's years awake grow). 498 harness tests pass.
- UI fit: run in the cloud without Foundry's Font Awesome beside foundry2.css, every window (old and new alike) fails only the minimized header button check, which needs the icon font; to be rerun on the PC with the full public folder.
- Gates: tools/gate/gateevents.mjs (9 steps) is new, and gateera.mjs is ported to rothenstein-wodx (it holds the world and deletes its cards). Not deployed yet.

### Data versions and the nightly copy, 2026-11-09: still WoDX Chronicle 0.5.0 (B122)
- Gap review item 6. scripts/migrations-rules.mjs (pure: the plan, which documents to back up, file names) and scripts/migrations.mjs (the run, the backup through FilePicker, the card, a log of the last 50 runs). API: game.wodx.chronicle.migrations.status(), run(), register(), backup().
- No module needs a step yet, so every module is at data version 1; the first load of 0.5.0 stamps them.
- tools/backup: nightly-backup.ps1 and register-nightly-backup.ps1 (PowerShell, below-normal priority, robocopy so a running Foundry is fine).
- Tests: migrations.test.mjs (7: the plan, missing steps, newer data, the backup comes first and holds only the module's documents, the card, a failing step). 505 harness tests pass. gateevents gains step 10 (every WoDX module on has a data version).

### The archive of the dead and a large world, 2026-11-09: WoDX Creation 0.7.0 (B123)
- Gap review item 5. scripts/archive.mjs: candidates(), archive(), restore(), whereIs(), the index journal, and the Archive of the dead window (Configure Settings; two lists, each with a search box).
- Tests: archive.test.mjs (5). Who may go and who stays (a player character, a linked token), the compendium first with the same id, an actor the compendium refused stays, bring back. A large world of 3000 characters and 400 journals in the stand-in: the Pass the Years plan 52 ms for 2002 rows, the archive list 6 ms, the events check under 1 ms, archiving 1003 in 313 ms. 523 harness tests pass with main merged.
- Gate: tools/gate/gatearchive.mjs times the same things in Foundry with 500 test characters of its own, archives only those and deletes them after.

### Languages in chat, 2026-11-09: WoDX Chronicle 0.5.1 (B124)
- Gap review item 9. scripts/languages-rules.mjs (pure: Linguistics allowance, made-up words, /in parsing) and scripts/languages.mjs (hooks on chatMessage, preCreateChatMessage, renderChatMessageHTML and renderChatLog; the Languages window, with a search box).
- Tests: languages.test.mjs (5). 528 harness tests pass.

### The Ledger, 2026-11-09: WoDX Storyteller 0.2.0 (B125)
- Gap review item 8. scripts/ledger-rules.mjs (pure) and scripts/ledger.mjs (due dates, the Veil, heirs and succession through the approval queue, the Ledger window with a search box on each list, a toolbar button for the Storyteller).
- Tests: ledger.test.mjs (8). 536 harness tests pass. UI fit adds the Ledger with forty entries.
- The archive gate ran 9/9 in rothenstein-wodx with 500 characters (Creation 0.7.0, deployed 2026-11-09).

### Menu search, tours and check flavor, 2026-11-09: WoDX Actions 3.14.0, Chronicle 0.5.2 (B126)
- Gap review item 4. profile-menus.js: the "Also found" group (checks and presets, shown only while searching; a new "check:<key>" spec). flavor.js: CHECK_POOLS and CHECK_GROUP_POOLS, read from the card's title. tours.mjs: two tours with a fallback for missing buttons; a Tour button on the Clock.
- Tests: flavor-checks.test.mjs (2), tours.test.mjs (2). 540 harness tests pass.

### Sheets past the first page, 2026-11-09: WoDX Sheets 0.6.0 (B127)
- Gap review item 12. sheet-rules.mjs: page2 filled for all sheets but faeDA and wr20 (already had theirs). main.mjs: new blocks combat, gear, fetishes, rotes, description, with weaponLine() and armorLine(). block.hbs: an items block can carry a note.
- Tests: sheets3.test.mjs (4). 544 harness tests pass. Gate: tools/gate/gatesheet5.mjs (13 steps).
### Interactables 0.7.0, Combat 3.7.6, 2026-11-09: fire and hazards (B151)
- Hazards on tiles: fire, a brazier, lamp or candle stand to knock over, broken glass or caltrops, a live wire. The tile config gains a Hazard section: kind, the fire's size and heat, burning, knocked over, the glass's dice, swept aside, the current, power on, damage type, players only.
- A live hazard hurts whoever walks into it, and in combat whoever starts a turn in a fire or on a live wire (the updateCombat hook). Damage goes through WoDX Combat's soak, with Undo. Fire follows WoDX Actions' fire table (V20 Dark Ages pp. 355-360). Glass gets a careful-step roll first.
- Interact options: knock over, put out (no roll, Dexterity + Athletics at 7, or not by hand), set alight, sweep a path, cut the power, turn it back on. A fire tied to scene lights turns them on and off with it.
- WoDX Combat 3.7.6: soakAndApply takes a soak difficulty (fd.soakDiff), shown on its card.
- Tests: 10 new (4 rules, 6 runtime), 507 in all; UI fit adds a burning hayloft and its put-out roll. Gate step 19 (the burglar walks into a fire, it is put out; Undo).
- Deployed 2026-11-09 from main fe68eef (backups Backups\wodx-interactables-0.6.0-2026-11-09 and Backups\wodx-combat-3.7.5-2026-11-09, MD5s match). gate-interact 19/19; step 19: hook fired, "is burned (1 level, soaked at 7)".

### Interactables 0.8.0, 2026-11-09: altars, relics and fetishes (B152)
- Altars and chapels, wayside shrines and holy wells, holy relics, fetishes and talens on tiles. The tile config gains an Altar, relic or fetish section: kind, rating, desecrated, the item.
- Holy ground: Pray here opens WoDX Actions' prayer window; Desecrate it (loud) and Undo. A demon stepping onto it, or starting a turn on it in combat, is seared by WoDX Actions' reading of Demon: The Fallen pp. 254-255, with a Willpower roll to stay and Undo.
- A relic or fetish is taken like a container's contents (a copy of the item goes to the character, Undo takes it back); a fetish is then used from the WoDX actions menu.
- Tests: 6 new (3 rules, 3 runtime), 565 in all; UI fit adds a high altar. Gate step 20 (an altar desecrated and put back; a relic taken and given back).
- 0.8.1: caern stones, fetters and nodes. Use it opens the WoDX actions menu (a fetter opens the Fetter window), and the option names the rating. 1 more test, 566 in all.
- Deployed 2026-11-09 from main 26721eb (backups Backups\wodx-interactables-0.7.0-2026-11-09 and -0.8.0-2026-11-09, MD5s match). gate-interact 20/20 after two gate fixes (PRs 37 and 39: the relic had been placed behind the scene's window wall).

### Interactables 0.10.0, 2026-11-09: watch points (B153)
- Windows on the street, mirrors, telephones, radios and walkie-talkies, bells, horns and alarms on tiles, each tied to another tile. The tile config gains a Watch point section: kind and what it is tied to.
- Look out or Look in it (Perception + Alertness): who is in the tied area goes in a whisper, names on a success, a count on none; hidden and invisible tokens stay out, and a mirror holds no Lasombra. Make a call reaches the tied phone; Call for help; Raise the alarm (loud). Phones and radios wait for their era.
- Each watch result is also a wodxMapEvent for the responsive maps work (0.9.0 is theirs).
- Tests: 5 new (2 rules, 3 runtime), 571 in all; UI fit adds a telephone. Gate step 21 (a window on the watchman's corner).
- Deployed 2026-11-09 from main 3d1153d (backup Backups\wodx-interactables-0.8.1-2026-11-09, 5 files, MD5s match). gate-interact 21/21.

### Interactables 0.11.0, 2026-11-09: mounts and vehicles (B154)
- Riding horses, mules, carts, carriages, rowing boats, motor cars, motorcycles and motorboats on tiles. The tile config gains a Mount or vehicle section: kind, seats, who is aboard, and Everyone off.
- Mount it or Drive it (no roll with a dot of Ride or Drive; the Attribute alone at +1 without); Get on as a passenger; Get off. At the reins: Keep control (Dexterity + Ride or Drive at 6) and Go flat out (+3). A botch throws the rider or crashes the vehicle. Cars, motorcycles and motorboats wait for their era.
- Moving the token at the reins carries the tile and the passengers' tokens; a passenger who walks away gets off. Undo puts everyone back as they were aboard.
- Ride and Drive are now read from the sheet, and a roll on a Skill the sheet lacks counts as untrained (+1), as WoDX Actions does.
- mount, dismount, crash and ride (flat out) go out as wodxMapEvents.
- Page refs pinned from the PC's book check: V20 core opening and closing p. 261, intrusion p. 260, alarms p. 255, retrying p. 251, climbing p. 258, falling p. 296 (printed pages).
- Tests: 6 new (3 rules, 3 runtime), 577 in all; UI fit adds a coach. Gate step 22 (the burglar drives a cart).
- Deployed 2026-11-09 from main da913ca (backup Backups\wodx-interactables-0.10.0-2026-11-09, MD5s match). gate-interact 21/22: in Foundry the cart moved the wrong way, because the step from the last known token position was off once Foundry snapped the token. Fixed in 0.13.0: the vehicle keeps each person's offset and goes to the driver's token; the gate compares against where the token really went.

### Interactables 0.13.0, 2026-11-09: climbing, ledges and jumps (B155)
- Ladders and stairs (no roll), ropes, trees, rough walls and cliffs on tiles, with a height in feet; gaps to jump, with a width in yards and a drop in feet. The tile config gains a Climb or gap section, with the tile it leads to.
- Climb it: Dexterity + Athletics at 6, extended, 5, 3 or 2 yards a success; a botch falls from as high as the climb got. Jump it: Strength + Athletics at 3, a yard a success; short, the character hangs: Catch the ledge (Dexterity + Athletics at 6) or Let go.
- Falls: a bashing die a 10 feet through WoDX Combat's soak, with Undo. Arriving moves the token onto the tile the climb leads to, with Undo.
- climb, jump and fall go out as wodxMapEvents.
- Mounts: the vehicle follows the driver's token by offset (see 0.11.0).
- Tests: 5 new (2 rules, 3 runtime), 582 in all; UI fit adds a crag. Gate step 22 fixed, step 24 (a wall to a ledge, a short jump).
- Deployed 2026-11-09 from main 4ccb5d1 (backup Backups\wodx-interactables-0.12.0-2026-11-09, MD5s match). gate-interact 22/24: in Foundry 14 the move hook can see the token's old place, so the cart stayed put, and a climb's move to the ledge walked along a path and had not arrived when checked.
- 0.13.1: the move hook reads the new place from the change itself; climbs, jumps and their Undo put the token straight there (no animation, walls ignored); the gate waits for moves to settle. 1 more test.
- 0.13.1 deployed 2026-11-09 from main 296459b (backup Backups\wodx-interactables-0.13.0-2026-11-09, MD5s match). gate-interact 24/24.

### Interactables 0.14.0, 2026-11-09: targets on tiles (B156, B157)
- Step 3 of the design note. A tile marked as a target: a target with rings (an archery butt in the early eras), bottles or cans in a row, a practice dummy, or something to break (fragile, light wood, heavy wood, stone, iron). The tile config gains a Target section with a scoreboard and Clear the scoreboard.
- Listed out of reach as far as anything on the sheet carries, when the token can see it. Shoot it with each ranged weapon on the sheet (its Attribute, Ability, accuracy and difficulty, WoDX Combat's range bands); throw something at it (Dexterity + Athletics, 10 yards); strike a dummy (Melee or Brawl); break something up close (lifting chart or extended Strength).
- Rings score 1, 2 or 3 by successes on a scoreboard on the tile; Read the scoreboard. A gun botch jams, a bow or throw botch is a wild shot. Fragile things shatter on a hit.
- Undo takes a new name off the scoreboard too: Undo now removes entries added inside an object flag since the card.
- Broken things and fallen rows show as Broken (a new state list) and send a break event; gunshots send a noise event.
- Firearms, Archery, Melee and Brawl are read from the sheet.
- Tests: 8 new (6 rules, 2 runtime), 654 in all; UI fit adds a target and the throw window. Gate step 25 (a marksman, a target 10 yards off, a lamp).
- Deployed 2026-11-09 from main f232f99 (backup Backups\wodx-interactables-0.13.1-2026-11-09, MD5s match). gate-interact 25/25.

### WoDX Senses 0.1.0, 2026-11-09: what the senses tell (B170 to B174)
- Ben's request (9 November 2026): answer "what do I see, hear, smell" in chat. Design study: https://claude.ai/artifact/6z5pwGb2XZMMsA8jHHGaq4. Built all four steps of it in one module.
- scripts/senses-rules.mjs (pure): era bands, indoors by kind, parts of the day, light level, difficulty steps and powers, reach by sense, the place, hour and other-world layers, compose by successes, the seeded draw, remembered answers, commands and questions, Obfuscate. scripts/main.mjs: the ask window, commands, the question button, gathering sources (Interactables tiles read through its own rules, doors, NPC routine activities, noise from wodxInteractablesNoise, the wodxSensesGather hook), channels for powers, the cards and their buttons, Place senses, Describe this place, the arrival card.
- Lines: data/places.json (316 lines, 12 kinds of place by 4 senses, five era bands) and data/world.json (159 lines: hour, sky, moon, feast and curfew; live sources; the Penumbra with resonance and the Shadowlands; 10 power channels). Made from tools/senses-data/places.py and rest.py; edit those and run them, or edit the JSON.
- Tests: senses.test.mjs (25: 2 table checks, 11 rules, 12 runtime). 591 harness tests pass. UI fit adds the ask window (with Auspex) and Place senses with twelve long-named regions; in the cloud container every window, old and new, fails only the minimized controls-button check (Font Awesome is not beside the copy of foundry2.css there), so the full check is to run on the PC.
- Gate: tools/gate/gatesenses.mjs (12 steps) in rothenstein-wodx.
- Tests: 5 new (2 rules, 3 runtime), 571 in all; UI fit adds a telephone. Gate step 21 (a window on the watchman's corner). Not deployed yet.

### Gear by era, 2026-11-09: WoDX Library 0.1.0, Combat 3.7.7 (B128)
- Gap review item 7. New module wodx-library: gear-rules.mjs (table parsing, row to item, era filter), main.mjs (compendium install, Gear by era window, give), data/gear.json built by tools/library/build-gear.mjs from docs/research/gear-tables (read from the books on the PC). Combat armor() counts implants.
- Tests: gear.test.mjs (5). 554 harness tests pass. UI fit: the Gear window passes (only the minimized-button check fails in the container, as for every window). Gate: tools/gate/gategear.mjs (6 steps).

### Book checks, 2026-11-09: Targeting 0.1.1, Chronicle 0.5.3 (B129)
- Gap review item 10. tags.json: 39 tags fixed. gifts-daw.json: chk taken off 19 Gifts, 7 effects and one difficulty corrected. garou.json: metis confirmed. languages: languagesFromMerits(). Notes kept in docs/research/book-checks/book-checks.md. 554 harness tests pass.

### WoDX Senses 0.1.1, 2026-11-09: two fixes from the first gate
- The first run of gatesenses in rothenstein-wodx scored 9/12. Two causes.
- Remembered answers were never kept: the memory key held the place id (`s.<scene id>`), and Foundry reads a dot in a flag key as a path, so each entry was split apart on save. memoryKey() now swaps dots for underscores. A new test expands dotted keys the way Foundry does.
- At dawn and dusk the light ignored the scene's darkness level, so a fully dark room read "dark" instead of pitch. lightLevel() now takes the scene darkness, and at 0.75 or more dawn and dusk count as night. Sight answers also count the light level in their fingerprint, so a new light lets the character look again.
- 609 harness tests pass.
### Interactables 0.12.0, 2026-11-09: pictures, markers and map events (B160)
- Step 1 of the design note "Responsive Maps for WoDX". scripts/state-rules.mjs (pure: states by kind, the look for a state, event kinds, the map event, feedback) and scripts/states.mjs (picture swaps on the active Storyteller's client from updateTile and updateWall, markers drawn on each client in the interface layer, tied ambient sounds, the event from each card's create or update, the socket that plays the moment on every client, the tile config's "pictures and sounds" part).
- Watch points and mounts (0.10.0, 0.11.0) now send their events through states.publish, in the same shape as a card's: object is the tile id, objectKind the kind (window, bell, cart), place the NPC place. New event kinds: watch, call, mount, dismount, crash, ride. A card on a watch point or mount sends no second event.
- main.mjs: cards now keep who heard (done.heard) and whether an alarm went off (done.alarm); Undo keeps the tile's original picture (artBase). module.json: socket on.
- Tests: 7 new (4 rules, 3 runtime), in all (now 590 with the merge). UI fit adds the pictures and sounds part to the tile config. Gate step 23.

### NPC 0.4.0 and Storyteller 0.3.0, 2026-11-09: the world answers the map (B161, B162)
- Steps 2 and 3 of "Responsive Maps for WoDX". NPC: scripts/alert-rules.mjs (pure: alarm, wary, calm; notice difficulty by level; hearers; marks and repairs); routines.mjs listens for wodxMapEvent (hearers react on a reaction card, sleepers wake, alarms on scenes with an Undo card, the clock fades them, the WoDX: Alert zone region behaviour, repairs at dawn with Undo); faction-rules.mjs and factions.mjs keep wrongs against factions (+3 to Defend at the next turn) and post a rumour button for a supernatural desecration.
- Storyteller: world-rules.mjs gets map beats (BEAT_ON.map) and mapEntry; core.mjs onMapEvent writes the log line, takes it out on Undo and checks beats; the beat window says "A change on the map".
- Tests: responsive-maps.test.mjs (4 rules tests) and runtime tests in phase7c-runtime (2 map events, marks), phase7d-runtime (wrongs and the rumour button) and phase7e-runtime (log and beats); 583 in all. Gate: tools/gate/gate-maps.mjs, 7 steps.
- Deployed 2026-11-09 from main f637e8f with Interactables 0.12.0 (backups from NPC 0.3.0, Storyteller 0.2.0, Interactables 0.11.0; MD5s match). gate-maps 7/7, gate-interact 22/23 (step 23 passes; step 22, the cart, is fixed in 0.13.0), gate7e 10/10, gatechecks 9/9.
- Page refs pinned on the PC (docs/research/senses-refs.md): V20 Heightened Senses pdf 142-143 / printed 134-135 (difficulty drops by the Auspex rating, which Senses does); difficulty chart and degrees of success pdf 257 / printed 249; Lifesight and Deathsight are Wraith 20 (pdf 191 / printed 126), not W20; HtR second sight pdf 133-134 / printed 132-133. UI fit on the PC with real fonts: 591 windows, none fail, Place senses included.

### WoDX Senses 0.1.2, 2026-11-09: a new wall makes a new answer
- Second gate run, 11/12: step 6 failed once memory worked. A wall raises a sound's need, but the answer's fingerprint held only which sources were there, so the earlier closer look's successes carried over and the muffled drinker was still heard. The fingerprint now holds each source's need as well. The new test fails on 0.1.1 and passes on 0.1.2. 632 harness tests pass.
- Deployed 0.1.2 to rothenstein-wodx only (backups of 0.1.0 and 0.1.1 in Backups). gatesenses 12/12, UI fit 591/591 on the PC. Bundle wodx-2026-11-09c.bundle.

### NPC 0.5.0 and Storyteller 0.3.1, 2026-11-09: trigger regions and alarm carriers (B163)
- Step 4 of "Responsive Maps for WoDX". alert-rules.mjs: CARRIERS, carryPlan, carryTargets, normCarry and dueCarries; TRIGGER_DOES, triggerFires, triggerEvent. routines.mjs: the WoDX: Trigger region behaviour (onTrigger), raiseAlarmFull and carryAlarm (bell, phone and radio at once, runners on scene flag carrying), deliverCarries on the clock, undoCarry from the alarm card and the reaction's Undo. The Alert zone gains Carries the alarm to, How it gets there and Minutes on the way. module.json documentTypes adds trigger.
- Storyteller: map beats match their value whatever the case; the log reads "X reached the cellar stairs."
- Tests: 2 rules and 2 runtime, 636 in all. gate-maps steps 8 (a bell carries the alarm) and 9 (a trigger region), 9 steps in all.
- Deployed 2026-11-09 from main 9086a3c (backups wodx-npc-0.4.0-2026-11-09, wodx-storyteller-0.3.0-2026-11-09; MD5s match). gate-maps 9/9, gate7e 10/10, gatechecks 9/9.
- Tests: responsive-maps.test.mjs (4 rules tests) and runtime tests in phase7c-runtime (2 map events, marks), phase7d-runtime (wrongs and the rumour button) and phase7e-runtime (log and beats); 583 in all. Gate: tools/gate/gate-maps.mjs, 7 steps. Not deployed yet.

### Chronicle 0.5.4 and Actions 3.14.1, 2026-11-09: lighter on slow computers
- From the Live performance study (doc "Live performance for slower machines"): the live world has 3,234 animated lights, three full-size map layers on 23 outdoor scenes and 51 looping video tiles. Player browsers already skip the heavy WoDX work.
- Chronicle: a client setting, Scene video effects (Show or Hide). Hide pauses every video tile and stops drawing it for that player only; image tiles and the scene are untouched. It holds through tile updates (refreshTile).
- Actions: the Garou test pack is fetched only when makeTestPack is called, so players no longer download it.
- Lazy loading of each line's code is logged in PENDING-REVIEW.md as not done yet (every line file is also used at start-up). World changes from the study wait for Ben.
- Tests: 9 new, 633 in all after merging main. Gate: gateeffects (8 steps).

### Creation 0.8.0, 2026-11-09: death into a wraith, the Awakening and the creation check
- Gap review item 3. data/creation-totals.mjs holds 17 books' creation totals with page refs (research in docs/research/creation-totals). totals-rules.mjs: assign, checkCreation, angstFrom, pathosStart, wraithStart, caul, awakenStart. totals-check.mjs: the Creation check window (character and book pickers with search boxes; reads only). states.mjs: deathToWraith, awaken and their dialogs; both make the new sheet bare so the system builds it, carry the old sheet over, link the two and file the old one, as the First Change does.
- The Creation window gains Death into a wraith, The Awakening and Creation check. api: deathToWraith, deathDialog, awaken, awakenDialog, totals, check.
- Choices on what carries over and the ghoul blood figure: B131 to B133 and PENDING-REVIEW.md.
- Tests: creation-totals.test.mjs (10), 664 in all. UI fit takes the check window and both dialogs. Gate: tools/gate/gatestates.mjs, 7 steps.
- 0.8.1: the PC gate (6/7) found the check opening an Awakened mage on DA:M in the Dark Ages testbed. lineFor now starts such sheets on M20, and risen wraiths on Wraith 20.
- 0.8.2: skipCore({onlyCast}) splits the time-skip test from its button so a gate can age only the test cast; the cast is always made in the Dark Ages. Gate tools/gate/gateskip.mjs for rothenstein-wodx (holds the world, restores everything, fingerprints every existing character). Tests 665.

### Phase 8, 2026-11-09: WoDX Atmosphere 0.1.0, Senses 0.2.0, Start a chronicle (Storyteller 0.4.0)
- New module wodx-atmosphere. weather-rules.mjs (pure): climates, era shifts, the seeded night, forecast, scene effect, house-rule steps, sun height and darkness. kits-rules.mjs (pure): kits for the 11 era profiles, moods, ambience, cues, the colour grade, 15 handout styles. main.mjs: settings, applying the weather and light at each night, music by mood (combat, era change), ambience by place and weather, cues, the map grade, Build playlists, Credits, handouts, the Weather and atmosphere window (toolbar). 24 procedural cues made by tools/atmosphere/make-cues.py.
- Senses 0.2.0 reads tonight's weather: lines for rain, snow, fog and the rest, and the weather steps (B203). Tables regenerated by tools/senses-data.
- Storyteller 0.4.0: setup-rules.mjs and setup.mjs, the Start a chronicle wizard (B206). worlds/wodx-template/world.json: templateVersion 1.
- Decisions B200 to B206; choices in PENDING-REVIEW.md.
- Tests: atmosphere.test.mjs (22), 687 in all. UI fit takes the Atmosphere window and its three dialogs (to run on the PC: the cloud copy of foundry2.css fails every window on the minimised controls button). Gate: tools/gate/gate8.mjs, 14 steps, rothenstein-wodx only.
- Not built yet in Phase 8: encounter and rumour tables by era, Otherworld travel, story aids, token frames.
- PC run 2026-11-09: deployed to rothenstein-wodx (Atmosphere on there only), UI fit 621 ok, gatesenses 12/12, gate8 13/14. Step 9 waited for playback, which a headless browser never starts; the gate now checks the cue starts and gives each step a minute.

### Phase 8, second half, 2026-11-09: the night's draw, story aids, Otherworld journeys, decay, token frames
- Storyteller 0.5.0: data/night-tables.mjs (28 tables: the time of night, encounters in town and the wilds for four era groups, the Penumbra, the Shadowlands, rumours, symbols, dream, vision, augury and foreshadowing frames, relics, fetishes, talismans), night-rules.mjs (pure), night.mjs (draws, the queue, the nights and story aids journals, the dialogs, the Draw for the story button). Road trips with no table draw from WoDX's own.
- Otherworlds 0.3.0: data/journey-tables.mjs, journey-rules.mjs (legs, hazards, the Great Maelstroms, the decay filter), journey.mjs (the journey dialog, the queue, the decay on the controlled token's client).
- Atmosphere 0.2.0: token frames (kits-rules FRAMES, frameFor, framed, frameShapes; drawn on refreshToken), and the grade now joins the Shadowlands decay.
- Decisions B207 to B212; choices in PENDING-REVIEW.md.
- Tests: phase8b.test.mjs (10). UI fit takes the chooser, the night, the aid (both steps) and the journey (both steps). Gate: tools/gate/gate8b.mjs, 12 steps, rothenstein-wodx only.

### Phase 6n, 2026-11-09: WoDX Actions 3.15.0 (the Dark Ages: Mage Grimoire, B240–B244)
- The last item left open in Phase 6: Phase 6f had put off the Grimoire. Read on the PC from page renders (the OCR text was unusable); notes in docs/research/da-grimoire-notes.md, pages as pdf N / printed N − 2.
- scripts/mage-da-grimoire.js (pure): 78 rote entries for all six fellowships, the seasons' first days and Sunday, the Moon's offering, specialties and experience for another fellowship's magic, countermagic by fellowship, the Using the Art table and the guide by Pillar level, the wonders, and Certámen (stances, the same-Pillar penalty, wills, the locus, strikes, the spoils).
- mage-da-rules.js: the Grimoire's rotes join ROTES; castPlan takes the season (−3 or +3), Sunday (−1 for the Messianic Voices) and the Foundation specialty (+1 die).
- mage-da.js: the cast window marks Grimoire rotes and reads the Chronicle clock for the season and Sunday; specialties on the Fellowship and Pillars window, with the Pillar specialty re-rolling 10s; an offering to the Moon at night in Gather Quintessence; new windows Countermagic, Using the Art (searchable) and Certámen (the Storyteller's, with Strike and Yield buttons on its card).
- The mage menu gains Countermagic (Resist), Using the Art (Act) and Certámen (Storyteller). Its key is daCountermagic: UI fit showed the first name, daCounter, was already the fae's Counter, so the mage button opened the fae's window.
- Tests: phase6n.test.mjs (9); 706 pass. UI fit captures the three new windows; in the cloud container every window, old and new, fails only the header-icon check because Font Awesome is not there, so the real UI fit runs on the PC. Gate 6n (tools/gate/gate6n.mjs, 8 steps).
- Deployed to rothenstein-wodx (Backups/wodx-actions-3.14.1-2026-11-09 first; 58 files checked by MD5). Gate 6n 8/8; UI fit on the PC 654 ok. Gates 6f and 6g run alongside: every functional step passed, and each missed only its version check, still pinned to 3.7 and 3.8; both now accept any 3.x.

### Open items, 2026-11-09: feast and fast days (Chronicle 0.6.0, NPC 0.5.1, Senses 0.2.1; B250, B251)
- wodx-chronicle/scripts/church-rules.mjs (pure): Easter by both reckonings, the great feasts, the movable days, vigils, Ember days, Advent, the seasons, observance by year, and churchDay() with the crowd, the curfew hour and the hunting step. church.mjs: the setting "The chronicle's own feast days" and api.church (on, today, at, extra, rules). The Chronicle Clock gains a "Church year" row, with the night's effect for the Storyteller. House rule "Feast and fast days" (on).
- WoDX NPC: routine-rules re-exports the feasts from Chronicle (one list); the curfew starts at midnight on a night of revel; huntingAt takes the church step (town only) and the hunting card names it.
- WoDX Senses: the feast check had no day number, so feasts counted from Easter were never found; it now passes the whole date, reads the Chronicle's feasts and the curfew hour.
- Tests: church.test.mjs (9); 715 pass. Gate: tools/gate/gatechurch.mjs, 8 steps, rothenstein-wodx only.

### Open items, 2026-11-09: NPC power plans use the target picker (NPC 0.5.1; B252)
- npc-rules.mjs: POWER_AIM ("h.s") and aimPower(option, ranked). main.mjs: rankPower(tok) asks WoDX Targeting (when on) to rank; postPlan aims every "Use a power" option; execute sets the target before opening the menu.
- Tests: targeting.test.mjs gains the NPC case (716 in all). Gate: gatetarget step 8b.

### Open items, 2026-11-09: living maps (Interactables 0.15.0; B253)
- living-rules.mjs (pure): CONDITIONS, MODES, cleanRule, holds, changeFor, ruleWords, momentKey. living.mjs: context() from the Chronicle clock, its church day and fired events and Atmosphere's weather tags; sync() over every living tile on every scene (skipped while the world is held or skipping; force for gates); the "WoDX: living map" section in the tile config (event list with a search box). api.living.
- Tests: interactables.test.mjs gains two (718 in all). Gate: tools/gate/gateliving.mjs, 8 steps, a scene of its own in rothenstein-wodx.

### Open items, 2026-11-09: per-character senses (Senses 0.3.0; B254, B255)
- perception-rules.mjs (pure): screenFor, addStep, trailStrength, smellYards, stepsInReach, showsTo, seenAfter. perception.mjs: client settings "Frenzy and Rötschreck on my screen" and "Scent trails for a wolf's nose", world setting "The unseen show only to those who find them"; the screen overlay (CSS in wodx-senses.css); trails recorded from token moves on each client and drawn on the interface layer; Token.isVisible wrapped for the unseen; Who sees through it? and Forget on the token HUD. api.perception.
- Tests: perception.test.mjs (5); 723 pass. Gate: tools/gate/gateperception.mjs, 8 steps, a scene of its own.

### Open items, 2026-11-09: four more changes of state (Creation 0.9.0; B256-B259)
- states-rules.mjs (pure): FAMILIES (the twelve revenant families), revenantStart; SEEMINGS, chrysalisStart; HOUSES, fallenStart, fallenWillpower, HOST_TARGETS, possession; secondBreathStart. Mechanics from research/book-checks/state-changes.md.
- states.mjs: revenantBirth (same sheet, ghoul set-up), chrysalis, fallenHost, possess, secondBreath, each with a dialog (search boxes over the mortals, families and demons). The Creation window gains five buttons; the api gains the ten functions.
- Tests: states2.test.mjs (6); 729 pass. Gate: tools/gate/gatestates2.mjs, 8 steps, rothenstein-wodx only. gate-interact step 1 now accepts 0.14.0 or later.

### Open items, 2026-11-09: the other worlds, part two (Otherworlds 0.4.0, Chronicle 0.6.1; B260-B265)
- realms-rules.mjs (pure): mists, TRODS, trodTime, wayfarePortal, moonRisk, CAERNS, openedBridge, stormState, shredding, acrossGauntlet, GREAT_MAELSTROMS and greatMaelstrom by fired events, maelstromDice, disembodiment, the Net (netSystem, netPool, netExchange, programTest), layerSoundFor.
- realms.mjs: settings (The Avatar Storm; layer sound, volume, folder), addDreamingLevel, makeTrod, dreamingGate and its dialog, shreddingWinds (and on a mage reaching a Penumbra level), checkDisembodiment through the approval queue, jack and netContest, the Otherworld rolls window, each client's layer loop.
- journey-rules.mjs: Moon Path, Moon Bridge and three trods; moon risk; time on a trod; Great Maelstroms from the chronicle's events. New tables: journey.moon.*, journey.trod.*.
- crossing.mjs: three statuses (In the Near Dreaming, Beyond the Penumbra, Jacked into the Net). twins.mjs: layersOf knows the dreaming level. twins-app: Add a Near Dreaming level, Make trod.
- Chronicle 0.6.1: the two new player buttons (Otherworld rolls, Jack into the Net) join the player button list.
- Tests: realms.test.mjs (10); phase8b's journey test knows a one-leg road. Gate: tools/gate/gaterealms.mjs, 12 steps, two scenes of its own.

## 2026-11-09: gate fixes after Otherworlds 0.4.0 (Otherworlds 0.4.1, Actions 3.15.1)

- gaterealms step 11 failed in 1200: jack() returned the warning instead of nothing, so the gate saw a jack-in. Every refusal in realms.mjs now warns and returns null.
- gate6e failed on lupine, mage, fae and mortal menus: the presets that the menu search added in 3.14.0 had no hint when the preset has no note. They now read "Roll" plus the label's roll (Carousing: "Roll Cha + Empathy").
- ui-fit.mjs: the stand-in scene collection has filter and some, so the twins window renders.

## 2026-11-09: dawn dread (Atmosphere 0.3.0, Actions 3.16.0, B266)

- kits-rules.mjs: dawnDread(secondsToDawn) and dreadCuesCrossed(toDawn, delta); two new cues, birds and cock, shared by every era (COMMON_CUES).
- main.mjs: client setting Dawn dread (the pale edge and the two cues), world setting Rötschreck pressure before dawn (house rule); applyDread on every clock move and at ready; the Storyteller's card at ten minutes, once a night; api.dread {now, rotschreck, apply, tick}.
- styles: body.wodx-dawn-dread::after, an inset pale glow by --wodx-dread.
- sounds/common/birds.ogg and cock.ogg from tools/atmosphere/make-cues.py (pass a kit name or common to make only those).
- Actions 3.16.0: the Rötschreck window's modifier starts at dawn's step while WoDX Atmosphere is on.
- Tests: dawn-dread.test.mjs (4). Gate: tools/gate/gatedawn.mjs, 7 steps; the clock never moves.

## 2026-11-09: sound through walls (Atmosphere 0.4.0, B267)

- kits-rules.mjs: MUFFLE (low-pass, 5), muffleChanges(sound, on), isMuffled.
- main.mjs: world setting "Placed sounds are muffled by walls" (preCreateAmbientSound); muffleScene(scene, on); the This scene part of the window counts them and has Muffle them all and Let them all through; api.walls.
- Tests: one more in dawn-dread.test.mjs. Gate: tools/gate/gatewalls.mjs, 5 steps, a scene of its own.
- UI fit's four "dialog onRender" warnings come from its mock DialogV2 having no element; they predate this and fail nothing.

## 2026-11-09: NPC movement on gridless scenes (NPC 0.6.0, B268)

- npc-rules.mjs: latticeGrid(size), a square lattice with getOffset, getTopLeftPoint and getCenterPoint.
- main.mjs: gridKind gives "lattice" on a gridless scene (unless the new world setting "Move NPCs on gridless scenes" is off); grid() returns the lattice there; the moving code and routines.mjs ask grid() for cells.
- Tests: npc-gridless.test.mjs (3); phase 7 tests follow the version. Gate: tools/gate/gategridless.mjs, 5 steps, a gridless scene of its own with a wall.
- 0.6.1: gategridless step 3 found a wall running through a lattice cell's centre (x 750 on 100 px cells): the step's wall test ended exactly on the wall and passed, while Foundry's move stopped there. On the lattice the test now runs 3 px past the cell's centre (NR.pastPoint).
- 0.6.2: the rerun still stopped at (5,7). The PC helper's diagnosis: the path slid up the wall line with the token's centre on it ((7,7), (6,7), (5,7) all at x 750); every single step passed Foundry's collision test, but a many-waypoint move stopped there. Now a lattice cell whose centre lies within 4 px of a wall that blocks movement (not an open door) is closed (NR.onWall, NR.segmentDistance).

## 2026-11-09: personal themes (Atmosphere 0.5.0, B269)

- kits-rules.mjs: THEME_GAP (60 s) and themeToPlay(theme, {last, now, force}).
- main.mjs: world setting Personal themes; playTheme (broadcast from the Storyteller's client), setTheme (flags.wodx-atmosphere.theme); updateCombat plays the theme when a player character's turn starts; the Atmosphere window's Personal themes part (Choose, Spotlight, Clear, with search past five characters); api.themes.
- Tests: one more in dawn-dread.test.mjs. Gate: tools/gate/gatethemes.mjs, 5 steps.

## 2026-11-09: places that age (Atmosphere 0.6.0, B270)

- kits-rules.mjs: ageFor({base, variants}, year) and cleanAges(variants).
- main.mjs: flags.wodx-atmosphere.ages {base, variants}; setAge, applyAges (the map's own level, else the scene background); runs at ready, on a year change (after the clock settles, not during a skip), at the end of a skip and when an era is applied; the This scene part lists the years with Remove and adds one by year and file picker; api.ages.
- Tests: one more in dawn-dread.test.mjs. Gate: tools/gate/gateages.mjs, 6 steps, a scene of its own; years are passed in, the clock never moves.

## 2026-11-09: faces that age (Atmosphere 0.7.0, B271)

- kits-rules.mjs: FACE_KINDS, faceKind(type, variant, set), apparentAge(face, year), faceStage(age), STAGE_WORDS, faceFor(face, year), agePixels(rgba, stage), agedName(actorId, which, stage, base), shortHash.
- main.mjs: flags.wodx-atmosphere.face {born, kind, still, lost, variants, base {img, token}, made {img, token}, shown}; agedCopy (canvas pixels, webp, upload to worlds/<world>/wodx-faces), applyFace (a picture changed by hand becomes the new base; placed tokens follow), applyFaces, setFace (null stops and restores), setFaceAge; ageEverything runs places and faces together at ready, on a year change, after a skip and when an era is applied. A Faces that age part in the window with search boxes; api.faces.
- Tests: five more in dawn-dread.test.mjs (757 pass). Gate: tools/gate/gatefaces.mjs, 8 steps, a character and scene of its own; years are passed in.

## 2026-11-09: the looks of the other worlds (Otherworlds 0.5.0, B272)

- journey-rules.mjs: LOOKS, NET_FILTER_ID, layerLookCss({layer, inNet, shroud, phase, looks, decay}), NET_SVG (grey, a Laplacian edge kernel, green and cyan).
- journey.mjs: decayCss() (also lookCss) now gives the viewer's layer look; the Net's SVG filter is put in the page once; keepSway() eases the Dreaming's hue with a CSS transition while the viewer stands there; client setting "looks". main.mjs: jacking in or out redraws the look; api.lookCss, api.swaying.
- Tests: one more in realms.test.mjs (758 pass). Gate: tools/gate/gatelooks.mjs, 7 steps, a scene and actor of its own.

## 2026-11-09: queue relief (Chronicle 0.7.0, B273)

- approvals-rules.mjs (new): NEVER_AUTO, isNpcType, routeProposal(type, {auto, cap, used}), bulkIds, cleanAuto.
- approvals.mjs: addToQueue routes each proposal (auto, hold, queue) and returns which; decide takes {auto}; decideMany, releaseHeld, held, setAuto, types, npcCount, resetSession. The window: a tick box per entry, Approve the ticked, Reject the ticked, Tick all or none, the held-back note, and Approve on its own (a search box past eight kinds).
- settings.mjs: autoApprove (world, hidden), npcCap (world, 0 to 100). main.mjs: a Storyteller session start resets the count.
- Tests: two more in chronicle.test.mjs (760 pass). Gate: tools/gate/gatequeue.mjs, 7 steps; it puts back the queue, rules and cap.
- (approvals-rules.mjs went into PR 84 by mistake ahead of the rest; nothing used it there.)

## 2026-11-09: knowledge-gated handouts (Chronicle 0.8.0, B274); queue window fix

- know-rules.mjs (new): KNOW_PATTERN, traitKey, parseNeeds, meets, view, passages. know.mjs (new): traitsOf (languages from the Languages window, dots from Abilities and any rated item), render, the @Know text enricher registered at init. languages.mjs exports charactersOf. api.know.
- Queue window: Approve on its own is now a section of its own with a capped scroll box, not a closed details, so the UI fit can reach every box.
- Tests: one more in chronicle.test.mjs (761 pass). Gate: tools/gate/gateknow.mjs, 7 steps.

## 2026-11-09: dreams and visions you write (Storyteller 0.6.0, B275)

- dreams-rules.mjs (new): DEFAULT_HOUR, normDream, normDreams, dueDreams, sortDreams, dreamHtml. dreams.mjs (new): the dreams world setting, saveDream, removeDream, releaseDream (journal in WoDX dreams, owners as observers, whispered card), checkDreams on the clock and after a skip, the Dreams and visions window (search boxes on every list). Reached from Draw for the story; api.dreams.
- UI fit: the Dreams and visions window with 24 dreams. Tests: tools/harness/dreams.test.mjs (3). Gate: tools/gate/gatedreams.mjs, 6 steps.
- Chronicle 0.8.1: traitsOf no longer spreads the Language Merits' count (a number, not names); the gate's step 3 threw on it.

## 2026-11-09: a player codex (Storyteller 0.7.0, B276)

- codex-rules.mjs (new): CODEX_FOLDER, codexName, codexPage (text dated, images kept, others linked), planReveal (add or change by source). codex.mjs (new): codexOf, reveal, revealDialog, a header control on journal sheets and an entry in the journal list's menu; api.codex.
- Tests: tools/harness/codex.test.mjs (2). Gate: tools/gate/gatecodex.mjs, 6 steps.

## 2026-11-09: the rumour network (Storyteller 0.8.0, B277)

- rumour-rules.mjs (new): HEAT, QUIET_NIGHTS, MAX_NIGHTS, buildContacts, normRumour(s), live, spreadNight, nightsDue, firstTeller. rumours.mjs (new): the rumours setting and rumourNetwork switch, contacts (factions and scenes), startRumour, tick (on the clock, after a skip, or one night by hand), endRumour, removeRumour, heardBy, The rumour mill window. approveNight starts the night's rumour; Draw for the story opens the mill; api.rumours.
- UI fit: The rumour mill with 20 rumours. Tests: tools/harness/rumours.test.mjs (4). Gate: tools/gate/gaterumours.mjs, 7 steps.

## 2026-11-09: prelude and Embrace scene templates (Storyteller 0.9.0, B278)

- prelude-rules.mjs (new): PRELUDES (eleven lines, three parts each), LINE_ORDER, lineFor(type, variant), hunterKind(year), composePrelude, preludeHtml. prelude.mjs (new): makePrelude({actorId, line, scene}) makes a Storyteller-only journal in WoDX preludes and, if asked, a bare night scene (not in navigation) with a note that opens it; preludeDialog (character list with a search box, fixed line list). Draw for the story gains A prelude. api.prelude {dialog, make, compose, lineFor, lines}.
- UI fit: the prelude dialog. Tests: tools/harness/prelude.test.mjs (5). Gate: tools/gate/gateprelude.mjs, 7 steps.

## 2026-11-09: the Storyteller's dashboard (Storyteller 0.10.0, B279)

- dashboard-rules.mjs (new): whenLabel, partyRow, woundWords, sortParty, clocks, threads, consequences. dashboard.mjs (new): gather() and DashboardApp (id wodx-dashboard; four searchable lists, each with a button to its own window; redraws at most twice a second on actor, effect, token, clock and WoDX setting changes). Toolbar button wodxDashboard (order 117), a keybinding, api.dashboard {open, gather}. CSS caps each list so the window fits a 1280x720 screen.
- UI fit: the dashboard. Tests: tools/harness/dashboard.test.mjs (6). Gate: tools/gate/gatedashboard.mjs, 7 steps.

## 2026-11-09: adaptive sound (Atmosphere 0.8.0, B280)

- adaptive-rules.mjs (new): TENSIONS, TENSION_LABELS, FRENZY_STATUSES, HUNT_STATUSES, tensionOf, moodFor, heartbeat, beatGap. kits-rules.mjs: a frenzy mood (music/frenzy in a kit folder). main.mjs: settings adaptive, tension (world) and heartbeat (client); tensionNow, adapt (acts only on a change), adaptSoon; combatStart and deleteCombat go through adapt when it is on, the old switch when off; effect hooks on players' characters; the heartbeat (Web Audio, two thumps a beat) follows the user's own character on updateActor and updateUser. api.adaptive {tension, adapt, heartbeat, update, playing, rules}.
- Tests: tools/harness/adaptive.test.mjs (4). Gate: tools/gate/gateadaptive.mjs, 7 steps (music off while it runs).

## 2026-11-09: printable props (Atmosphere 0.9.0, B281)

- print-rules.mjs (new): PRINT_CSS, landscape, journalDoc, mapDoc, absoluteUrls. main.mjs: journalPrintHtml (text pages enriched with secrets off, image pages as pictures, the era fonts' @font-face rules copied in with absolute urls), scenePrintHtml, printHtml (a hidden frame, then the print window; dry builds only), printJournal, printScene; a header control on journal sheets and entries in the journal and scene directory menus, Storyteller only. api.print {journal, scene, journalHtml, sceneHtml, html}.
- Tests: tools/harness/print.test.mjs (4). Gate: tools/gate/gateprint.mjs, 7 steps (never opens the print window).
- Fix in the same PR (Atmosphere 0.9.0): the frenzy tension never fired in Foundry, since WoDX Chronicle's conditions are wodx-frenzy and wodx-rotschreck; tensionOf now drops the wodx- prefix, and gateadaptive toggles wodx-frenzy. rothenstein-wodx holds 11 started combats left by older gates, so gateadaptive's hunt step reads combat there (noted, not failed).

## 2026-11-09: player immersion (B310-B315)

- From the Player Immersion Study (approved by Ben 2026-11-09). Interactables 0.16.0 (carry-rules.mjs, carry.mjs), Senses 0.4.0 (stateEdges, stateOf), Chronicle 0.9.0 (reckoning-rules.mjs, house rule eraReckoning, the player clock), Storyteller 0.11.0 (letters-rules.mjs, letters.mjs, player button wodxLetters, socket req.letter), Atmosphere 0.10.0 (opening-rules.mjs, client setting openingCard, scene choice noCard, api.opening), NPC 0.7.0 (faces-rules.mjs, faces.mjs, world setting faces).
- Tests: tools/harness/immersion.test.mjs (12); version pins moved in perception, phase7b, phase7c-runtime and phase7d tests. Full suite 801 pass. Gate: tools/gate/gateimmersion.mjs, 9 steps.

## 2026-11-09: the Library's shelves, the manual and What's new (Library 0.2.0, B282)

- shelf-rules.mjs (new): SHELVES, LINE_LABELS, ALL_ERAS, fromDisciplines, fromRoads, fromGifts, fromArcanoi, fromThorns, fromConditions, fromHouseRules, fromEras, buildShelves, fits, hashOf. shelves.mjs (new): sources, installShelves (made at ready when the shelf version rises; remade by hash), catalogue, LibraryApp (id wodx-library; line list, era filter, search), ensureManual, ensureChangelog. data/manual.mjs (new): MANUAL pages and CHANGES. Toolbar button wodxLibrary (order 116). api.library, api.manual, api.changelog.
- Tests: tools/harness/library.test.mjs (5). Gate: tools/gate/gatelibrary.mjs, 6 steps.

## 2026-11-09: ways and realms (Otherworlds 0.6.0, B283)

- ways-rules.mjs (new): DEEP_REALMS, REALM_ORDER, WAY_KINDS, WAY_ORDER, endLayer, wayRegion, realmScene. ways.mjs (new): makeRealm, makeWay (refuses when a layer is missing), waysDialog. Toolbar button wodxWays (Storyteller, order 132); api.ways {make, realm, dialog, isRealm, rules}.
- Tests: tools/harness/ways.test.mjs (3). Gate: tools/gate/gateways.mjs, 7 steps. UI fit: the Ways and realms dialog.

## 2026-11-09: the Encyclopaedia Tenebrarum frame (Library 0.3.0, B284)

- ency-rules.mjs (new): KINDS, TIERS, BANNED, checkEntry, checkAll, docId, toJournal, shingles, overlap, entryText. shelf-rules.mjs: the encyclopedia shelf and fromEncyclopedia. shelves.mjs: SHELF_VERSION 2, reads data/encyclopedia/index.json, keeps fixed ids.
- tools/encyclopedia-check.mjs (new; --text dir for the eight-word overlap check, --sample n for page spot checks), run by tools/quality-check.sh.
- Tests: tools/harness/encyclopedia.test.mjs (5). Gate: gatelibrary now expects five shelves and 0.3.0. No entries yet; the first edition follows.

## 2026-11-09: Library 0.3.1, shelf install race

- On the PC, gatelibrary failed at step 2 with "JournalEntry ... does not exist": the world's ready hook runs installShelves when the shelf version rises, and the gate's own install ran at the same moment, so both deleted the same old entries. installShelves now runs one at a time (a second call gets the first's result) and only deletes entries still in the pack.

## 2026-11-09: simulated systems (Storyteller 0.12.0, Actions 3.17.0, B320-B323)

- upkeep-rules.mjs (new, pure): nightsBetween, betweenPlan (deltas), TIE_KINDS, deriveTies, tieStatus, newlyDue, HEAT, HEAT_BANDS, addHeat, cooled, responseFor. upkeep.mjs (new): onSkip on wodxSkipEnd (one queue proposal, type wodx-storyteller.between; approve applies with an Undo card), checkTies once a game day and after a skip, tiesDialog, groundsDialog, addHeat on wodxHunted and on a "seen feeding" breach (type wodx-storyteller.heat starts a rumour). Toolbar button wodxUpkeep (Storyteller, order 121); api.upkeep. Settings betweenNights, ties, heat (world, on).
- Actions 3.17.0: the Hunt opens on the scene's ground and adds the heat's difficulty; fires wodxHunted {actorId, sceneId, caught, botch}; players' hunts reach the Storyteller by socket (req.hunted).
- Tests: tools/harness/upkeep.test.mjs (12). Gate: tools/gate/gateupkeep.mjs, 9 steps. UI fit: Upkeep, Ties that need tending, Hunting grounds.

## 2026-11-09: a Gauntlet that moves, Banality drift, plague years (Otherworlds 0.7.0, Storyteller 0.13.0, Actions 3.17.1, B324-B327)

- Otherworlds: drift-rules.mjs (new, pure: DRIFT_KINDS, addDrift, undoDrift, withDrift, banalityWithDrift), drift.mjs (new: scene flag drift, stepDrift, undoStep, driftDialog, map events propose type wodx-otherworlds.drift). placeOf adds the drift to the Gauntlet and the Banality rating; scene ratings are copied, not changed in place. api.drift.
- Storyteller: tie kind caern; OUTBREAKS and outbreakFor; huntHere returns the outbreak; world setting plague; the Upkeep chooser opens The Gauntlet over time when Otherworlds is on.
- Actions 3.17.1: the Hunt shows a plague year's note.
- Tests: upkeep.test.mjs (+5). UI fit: The Gauntlet over time.

## 2026-11-09: money by era, Consensus by era (Storyteller 0.14.0, Actions 3.18.0, B328-B331)

- Book checks on the PC first (notes in project files, notes/book-checks-consensus-money.md): V20 and V20 Dark Ages Resources give no sums; Sorcerers Crusade casual and vain, the Scourge and Fortune Dice; M20 Reality Zones optional; the Dark Ages Mage core has no coincidental or vulgar split.
- Storyteller 0.14.0: money-rules.mjs (new, pure: LIFESTYLE, livingAs, nextDrop, RAISE, COINS, coinsFor), money.mjs (new: actor flag money {away, neglected}, resourcesOf, moneyOf, monthly card, Money window from the Upkeep chooser). Settings money, moneyRegion. api.upkeep.money.
- Actions 3.18.0: consensus-rules.js (new, pure: AGES, ageFor, WORDS, CRUSADE_EUROPE, styleFits, suggestKind, fortuneDice, readFortune, fortuneSize, purifyDays). The M20 Cast reads the age, names the kinds in the age's words, takes the caster's style and suggests the kind; in the Crusade it rolls the Fortune Dice and weekly shedding stops. New: Purify the Scourge, Consensus here (scene flag wodx-actions.consensus {styles}). Settings consensusEra, realityZones. api.consensus, m20Purify, m20Place.
- Tests: consensus-money.test.mjs (9). UI fit: Money by era, Consensus here. Gate: tools/gate/gateconsensus.mjs (7 steps).

## 2026-11-09: paperdoll tokens (WoDX Paperdoll 0.1.0, B340-B344)

- New module wodx-paperdoll 0.1.0: vendor/dicebear-lorelei.mjs (DiceBear core 9.4.3 + Lorelei 9.4.2, bundled with esbuild, licence beside it), fit-rules.mjs (pure: measure() reads a key-coloured head, gives anchors), doll-rules.mjs (pure: PARTS, MOODS, healthLevel, moodFor, normalize, step, randomLook, loreleiOptions, hairFor, gown, headwear, filletBox, damageMarks, cropFor, compose, bakeKey), main.mjs (Paperdoll window from the sheet header, actor context menu; bake on the active GM's computer; updateActor hook rebakes on look, health or frenzy changes; api open, bake, bakeAll, schedule, settled, save, draw, anchorsFor, state, rules).
- Flags: actor flags wodx-paperdoll.look (the look) and .baked (key of the picture on the token). Files: worlds/<world>/paperdoll/<key>.webp.
- Settings: on, followHealth (world).
- Library 0.3.2: a manual page "Your token's look" and a What's new line.
- Tests: paperdoll.test.mjs (9, uses @resvg/resvg-js, now a harness dependency), paperdoll-app.test.mjs (3). UI fit: Paperdoll. Gate: tools/gate/gatepaperdoll.mjs.
- Paperdoll 0.1.1: placed tokens are found through the actor's own list as well as by searching the scenes. gatepaperdoll: the ring step flips the frames setting to a value that changes the answer; the bake step records more detail. encyclopedia.test.mjs builds the check script's path with fileURLToPath (Windows).
- Paperdoll 0.1.2: only Token documents with an id on a Scene are updated (0.1.1 sent an update without an _id); a failed token update no longer stops the bake.
- Paperdoll 0.1.3: api.last() reports what the last bake found and updated on placed tokens; gatepaperdoll step 3 records it.
- Paperdoll 0.1.4: a mood can set the eyes; "unconscious" (eyes variant19) at Incapacitated, ahead of frenzy (B345).
- Paperdoll 0.1.4 also: placed tokens are updated with diff: false through game.scenes, and checked again 0.8 s later; a token that went back to its old picture gets the new one again (api.last().recheck lists them). The first gate runs showed the placed token returning to mystery-man after a successful update.
- Paperdoll 0.4.0 also (B363): face-rules LIPS, contrast(), NEED, showing(); doll-rules inksOf() and inkHead() (lips grown from the mouth box that findEyes now returns), the colours stage; the window's Lips list.
- Paperdoll 0.4.0 (B360-B362): SERIOUS lists and NEAREST in doll-rules (LORELEI keeps the full lists); face-rules modelling() under the skin mask; loreleiOptions features mode (FEATURE_KEY colours); fit-rules findEyes(px, build) on the features drawing and checkFeatures(px, A); stagesOf() for the six stages; main.mjs featuresFor() (cached by featureKey), draw() returns stages, bake logs them, the window names a failed one. bareLook()/withFace(): face outline from the bare face; measure() starts its rays below a fringe. damageLayers(): marks under the skin mask, bandage over. Sweep: 4 heads x 15 builds x every hair, eye, brow, nose, mouth and mood. Library 0.3.5.
- Paperdoll 0.3.0 (B348-B350): compose() finishes every picture as an illuminated page (finishDefs, groundSvg, trim; the ring at insets of the frame width, round or square). loreleiOptions tints ink, lips, brows and nose, and a pupils mode draws magenta eyes; fit-rules findEyes() finds pupils and eye boxes; main.mjs eyesFor() keeps them by eyes variant. face-rules: EYES, irises(), AFFLICTIONS, affliction(). Look gains colors.eyes, face.affliction and style {ground, ring}; styleFor()/themeFor() pick the fitting ones by actor type. LOOK_VERSION 2. Library 0.3.4: manual and changes.
- Paperdoll 0.2.0 (B346-B347): face-rules.mjs (pure) adds SKIN (38), HAIR (25), BUILD (15, scaled from the neck base at 490,815), AGES, CHEEKS, MARKS, SCARS, WHISKERS and skinLayers(). doll-rules: PARTS gains build, age, cheeks, marks, scar and the new beards; PART_NAMES, FACE_ORDER; keySvg() and measure(px, build) measure the scaled head; headLayers() puts the head and the new parts in the build's transform, the parts under a mask from Lorelei's drawing in mask colours (skin white, eye and teeth whites made black). fitKey includes the build.
- Paperdoll 0.2.0 also: the placed-token bug. Manual checks on fresh clients showed the server keeps the new picture; the Storyteller's own copy of a newly placed token kept its old prepared texture though its stored data had the new one. bake() now calls reset() on such a token and redraws it (api.last().reset lists them); the 0.8 s recheck compares the stored data.
- Tests: paperdoll.test.mjs 11 (3,000 random faces all differ; every new part checked to stay on visible skin and to show, across face shapes and builds). A wider sweep outside the suite: 1,800 checks over 4 face shapes, 3 builds, 3 hairs and 3 skin tones, none off the skin; only a forehead scar under a fringe is hidden, as it should be.

## 2026-11-09: survival-game systems, first five (Storyteller 0.15.0, Combat 3.8.0, NPC 0.8.0, Actions 3.19.0, Interactables 0.16.1, B370-B377)

From the Cataclysm study Ben approved (all eight fits; the poor fits are never to be considered). Book checks by the PC helper: /mnt/project-files/research/book-checks/survival-fits.md.
- Storyteller 0.15.0, long tasks (tasks.mjs, tasks-rules.mjs): an extended action that rolls once each time an interval of game time passes (hour, night, week, month), on the active Storyteller's client, at most 60 rolls a clock change. Successes add up; a botch loses them and ruins delicate work (V20 pp. 251-252, V20 Dark Ages p. 324). Kinds fill in a starting point: make or mend, research, learn from a teacher, a fetish or talen (W20 pp. 213, 227-228), a wonder, something else. One card per character with Undo; a finished or ruined task is logged on the tracker. Actor flag wodx-storyteller.tasks. Player button Long tasks; Upkeep has it too.
- Storyteller 0.15.0, havens (havens.mjs, haven-rules.mjs): scene flag wodx-storyteller.haven {name, owners, guests, security, known, note}. Rated by the owners' Domain (V20 pp. 112-113, V20 Dark Ages p. 180), Chantry or Sanctum (M20), Holdings (C20), Haunt (Wraith 20th); security no more than the Domain. Exposing a haven logs it with attention. The window counts the scene's locks and traps.
- Interactables 0.16.1: picking, forcing, hacking, disarming and climbing on a haven's scene are harder by its security for anyone not an owner or guest.
- Combat 3.8.0: house rule Count shots and reloads (off by default). A ranged weapon with a capacity loses a round each attack and refuses to fire empty; Reload (api, macro) fills it: one turn for a firearm (V20 p. 278), five for a crossbow (V20 p. 281), five less Archery in the Dark Ages (V20 Dark Ages p. 348).
- NPC 0.8.0, followers take orders (orders.mjs, order-rules.mjs; module socket on): flags.wodx-npc.serves and .order. Follow, wait, guard, keep watch, go to the one targeted. The active Storyteller's client checks and carries out the order and pauses the routine; a hard order goes to the approval queue. Followers walk after the leader stops, never in a fight. Player button Give an order.
- Actions 3.19.0, tainted vessels: Hunt and Feed ask what is in the vessel's blood. Drink, stimulants, hallucinogens and opiates add their V20 effect (p. 301-302); a blood-borne disease is spotted (Intelligence + Medicine, 7), resisted (Stamina, 6) or carried (flag wodx-actions.carrier), V20 p. 295. A plague year starts the choice on disease.
- Tests: tasks, shots, orders, havens, vessels (.test.mjs). UI fit: Long tasks, New and Change a long task, Havens, Haven, Give an order. Gate: tools/gate/gatesurvival.mjs (7 steps).
- Not built yet: bodies that change (priority 6), fill a container by place and era (priority 7). Hardship on the road waits: V20, V20 Dark Ages and Hunter have no exposure rules.

## 2026-11-09: survival-game systems, last two (Storyteller 0.16.0, Interactables 0.17.0, B378-B381)
- Storyteller 0.16.0, bodies that change (body.mjs, body-rules.mjs): actor flag wodx-storyteller.body, a list of lasting changes (source, part, what, Appearance, shows, by, note). The Storyteller adds them from the sheet's Lasting changes button; an Appearance change moves the sheet's dots at once and Undo or Remove puts them back. Nosferatu and Samedi stay at Appearance 0. The owner reads the list on their sheet. Sources cite V20 p. 241 on, V20 Dark Ages p. 268, W20 p. 74, Dark Ages: Werewolf p. 80, Wraith 20th pp. 195-198, Demon: The Fallen pp. 170-171. api.body.shown(actor) gives the changes that show, by part, for WoDX Paperdoll.
- Interactables 0.17.0, fill a container by place and era (fill.mjs, fill-rules.mjs): a button in the tile config draws from the "WoDX · Gear by era" compendium for the chronicle's era and the kind of place, weighted by kind of thing; the Storyteller unticks, keeps or draws again, and the kept links go into the Inside list, saved with the config window. Heavy, ship, crew-served gear and parries are never drawn; cyberware only in a clinic; a box, drawers, strongbox or safe only takes what hides in a coat.
- Tests: body, fill (.test.mjs). UI fit: Lasting changes, A lasting change, Fill by place and era, The draw. Gate: tools/gate/gatesurvival2.mjs.

## 2026-11-09: moves out of turn (Combat 3.8.1, B351)

- conductor-rules.js: TURN_MOVES and turnMove() (pure). main.js: setting turnMoves (world, default Off) and a preUpdateToken hook ahead of the movement count; a refused move warns the player and snaps back.
- Tests: phase7b1.test.mjs (version 3.8.0, turnMove cases, hook order). Gate: tools/gate/gateturns.mjs (9 steps).

## 2026-11-09: hardship on the road (Storyteller 0.17.0, Interactables 0.17.2, B382-B385)
- Storyteller 0.17.0 (hardship.mjs, hardship-rules.mjs): setting "hardship", off by default. Actor flag wodx-storyteller.needs (last water, food, sleep, weather; tiredness), scene flag wodx-storyteller.weather (none, harsh, severe, deadly). As the clock moves the active Storyteller's client checks living player characters: weather rolls of Stamina at 6 once an hour to four times an hour (M20 p. 435, Sorcerers Crusade p. 208); thirst and hunger a Stamina roll a day from 6, +1 a day, without a roll past 1 day (water) or 3 days (food) a Stamina dot (M20 pp. 435-436); a day awake past the first a Stamina roll or tired, a die off every roll, up to 3 (HH2 p. 90, Wraith 20th pdf p. 355). Bashing goes through WoDX Combat; one card a character with Undo. The Hardship window (Upkeep) sets the weather and marks eating, drinking and sleep.
- Interactables 0.17.2: setConcealed also waits for a token placed a moment ago on the scene in view to get its placeable (the filters console error in gate-interact).
- Tests: hardship.test.mjs. UI fit: Hardship on the road. Gate: gatesurvival2 step 6.

## 2026-11-09: lasting changes on the paperdoll (Paperdoll 0.5.0, B386)
- doll-rules.mjs: changesToDraw (the record's changes that show, one per drawn part) and changeLayers (marks inside the face outline: a stitched seam on the cheek, brow ridges, tinted or glowing eyes, marks at the mouth, veins from the jaw, a tint over the face), laid under the health marks. bakeKey adds the changes only when there are some. main.mjs reads flags.wodx-storyteller.body straight from the flags and re-bakes when it changes.
- Tests: paperdoll.test.mjs (4 new). Gate: gatepaperdoll on the PC when it is back, with a look at a token that has changes.
## 2026-11-09: the Encyclopaedia's full form (Library 0.4.0, B285)
- ency-rules.mjs: tiers rumour (Might be true) and open (Unknown); claim.versions (books that differ, each sourced); entry editions [{edition, text, refs}] and wodx {text, rule}. checkEntry checks every part; entryText (overlap) covers them. toJournal renders them; unchanged output for entries without them.
- shelves.mjs: Shelf select in the Library window (data-fixed). CSS for tiers, versions, editions. Manual news line.
- Tests: encyclopedia.test.mjs +4 (11 in all). Built in the cloud while the PC was off; deploy, gatelibrary, encydiag and UI fit wait for the PC.

## 2026-11-09: a quiet interface and supernatural sight on the map (Senses 0.5.0, B286-B287)
- quiet-rules.mjs / quiet.mjs: client setting quiet (off), keybinding quietToggle (Alt+Q), body class wsn-quiet hides #sidebar, #hotbar, #players; roll cards' "Difficulty: n" in words on this screen only; the state strip names the health level.
- sight-rules.mjs / sight.mjs: actor flag wodx-senses.sight; token tool My sight (order 122) cycles the character's sights; client setting sightMap (on); board CSS filter and token rings on a PIXI layer, redrawn on control, canvas, token and actor changes.
- Tests: senses.test.mjs +6. Gate: tools/gate/gatequiet.mjs (9 steps), queued for the PC. Built in the cloud while the PC was off.

## 2026-11-09: fixes from the book checks of the hallucination audit (Actions 3.19.1, Chronicle 0.9.1)

- The PC ran tools/audit/ref-audit.mjs (3,655 refs scored, 426 to read by hand; results in project files notes/ref-audit-2026-11-09-pc.md).
- wodx-actions/data/fera.json: Ajaba Renown is Ferocity, Cunning and Obligation, and they start with Willpower 3 (W20 Changing Breeds printed pp. 49, 217). Ratkin can't take more than 2 dots of Resources. Rokea start with Willpower 4. The Camazotz Renown is a house rule, because the book gives none. The six breeds the book confirms no longer carry chk.
- gifts-daw.json: Dolorous Stroke says that onlookers lose a die against the character for the scene. The chk mark is removed.
- wodx-chronicle/data/events.mjs: Doissetep, the Week of Nightmares and the Avatar Storm have dateNotes, because M20 gives no days.
- v20c-utgard was not in the V20 Companion text. Ben approved its removal, and it is gone from v20comp.json (Library data only).
- Still open: pinning the bare page refs from the PC report.
- Tests: 919 harness pass.

### Interactables 0.18.0 and Combat 3.8.2, 2026-11-09: a live wire holds you (B387)
- Ben asked for the live wire to roll pulling free at the book's difficulties. Walking onto a live wire now holds the character (shown on the card). **Pull free of the current** is Strength at 5 for a vampire and 9 for anyone else; cutting the power frees everyone; Undo for each.
- A vampire's soak against the current can botch, and a botch makes the damage aggravated: WoDX Combat 3.8.2 adds the botchAggravated option to soakAndApply (off unless a caller asks).
- Tests: 3 new (rules, runtime, Combat soak); 914 harness pass. Gate step 26 (the marksman on a live wire).

### Paperdoll 0.6.0, 2026-11-09: redrawn mouths, fantastic skins, no white film (B396-B399)
- Mouths drawn by WoDX (mouth-rules.mjs), placed from the nose and pupils found on the features drawing; 15 expressions; teeth follow the upper lip's curve; Lorelei's mouth hidden from the picture and counted as skin in the mask. New stage "mouth" in stagesOf. findEyes also returns the nose box.
- 16 fantastic skins (SKIN_FANTASTIC) and fantasticChance by kind; randomLook takes the character's kind, and a look without one is unchanged.
- Mauled and worse: the pallor is the skin drained to grey (was a fixed #d9d7cf wash). Paper grain over the figure removed.
- Six grounds: rose, diaper, vine, lily, chequer, punched.
- Checks: harness 922 pass; mouth sweep 10,800 placements (4 heads x 15 builds x 12 eyes x 15 expressions), none off the face. Samples in /mnt/project-files/paperdoll/mouths-0.6/. Deploy and gatepaperdoll wait for the PC.

### Interactables 0.18.1, 2026-11-10: NPCs hear crashes and gallops
- The gap left by responsive maps: events from watch points, mounts and climbs went out before the hearing check, so they named nobody who heard them. applyAsk now holds them (heldEvents) until the check, then sends each loud one with the hearers (releaseEvents); quiet ones go out with none. Approved with the rest of the responsive maps choices (Ben, 10 November 2026).
- Tests: the botched flat out test now checks that the crash and the gallop carry the sergeant who heard them. Gate: gate-interact step 22 and gate-maps.

## 2026-11-10: weak page refs read against the books (Actions 3.19.2)

- The PC read all 425 refs that scored under 0.34 (notes/ref-audit-weak-2026-11-09.md): OK 374, WRONG PAGE 23, WRONG CLAIM 1, NOT IN BOOK 1, CAN'T TELL 26.
- WRONG CLAIM fixed: a Willpower point ignores wound penalties for one turn (VtDA20 printed p. 339), not the scene. The roll dialog no longer sets the lasting ignoring-pain state, and the Willpower menu line says one turn.
- Pages fixed: VtDA20 initiative p. 343, Fortitude p. 221, blood oath p. 342, regaining Willpower p. 340, frenzy p. 357, turn length p. 324, retrying p. 323; V20 blood use p. 268; DA:W Red Talons p. 81; DA: Mage Twilight pp. 139-140; the Encyclopaedia's dam-dynamic-magic (p. 97) and inq-backgrounds (adds p. 155).
- Labelled house rules: the hunger line 7 - Self-Control, and Mummy blood (no source found).
- Left for a look in the PDF: bh-grabkrieg, the Fount whispers on DA: Mage p. 87. The 26 CAN'T TELL rows are books with no text or image-only pages.
- Tests: 927 harness pass.

## 2026-11-10: release checks for the live server (Chronicle 0.10.0)

- The live server runs on Linux, where file names are case-sensitive. New harness test path-case.test.mjs reads every path the system, the modules and the world files refer to (manifests, imports, template and asset paths, CSS urls, image paths inside the compendium packs) and fails when one differs in letter case from the file on disk, or when a folder holds two names that differ only in case. 2,661 paths checked: no case mismatches. Not in the repo at all (not case faults): the system's orpheus/Fudge.ttf font and data/demon and assets/data JSON in import-helpers.js, and the world background "Art of Vampire The Masquerade Summoning.jpg" in both repo world files.
- Release stamp: release.json in the system and every wodx- module, marked export-subst in .gitattributes, so git archive writes the commit and its date. tools/release/stamp.mjs stamps a copy made any other way. Chronicle shows the build to the GM in the Settings sidebar, logs it, and warns when packages come from different commits.
- Tests: 936 harness pass (9 new). Not gated in Foundry yet.


## 2026-11-10: adopt a generated map (Interactables 0.19.0)

- The farmstead generator (tools/mapgen/ddfarm.py, Dungeondraft edition) now also writes kessler-steading.wodx.json: 10 doors and shutters, 8 things (a locked chest, two box beds and three heaps of hay to hide in, the bread oven as a light, the well as a rope climb), the longhouse as a home and the barn as a workplace, and trigger regions on the track and the footbridge. A copy is in tools/mapgen/samples/.
- Interactables 0.19.0: adopt-rules.mjs (read and check the file, place it on the scene, match the imported door walls, build the plan) and adopt.mjs (the scene's right-click menu: Adopt a generated map, and Undo the map adoption). B404.
- Tests: 947 harness pass (11 new in adopt.test.mjs). Not gated in Foundry yet: the gate imports the farmstead with the Universal Battlemap Importer and adopts it in rothenstein-wodx.


## 2026-11-10: a container's fill starts from where it sits (Interactables 0.20.0)

- fill-rules.mjs: placeGuess and FROM_NPC_PLACE; fill.mjs: guessFor reads the container's Usual contents, then the place tags of the regions it sits in (smallest first), then the scene's tag, straight from the flags so it works with WoDX NPC off. The draw window shows where the guess came from. B405.
- The tile config has a Usual contents field; the farmstead's file sets the chest to a home.
- gateadopt step 4 also checks the chest's guess.
- Tests: 949 harness pass (2 new).

## 2026-11-10: Phase 9 done, the Encyclopaedia Tenebrarum filled line by line

- 2045 entries in modules/wodx-library/data/encyclopedia, from the core books (first edition, PRs 107-132) and then each line's supplements, one book per PR, up to PR 431 (main 8df185c, bundle wodx-2026-11-10o). Order: Vampire (V20, Revised, Dark Ages), Werewolf, Kindred of the East, Mage (M20, Revised and 2nd, Sorcerers Crusade, Dark Ages Grimoire), Wraith, Changeling, Hunter, Demon, Mummy, Orpheus, general World of Darkness.
- Every claim was checked against its page, and the overlap check across all book texts finds no 8-word run shared with any book. Older entries that met new texts were reworded.
- Left out: fiction, gamebooks, adventures and Storyteller-only books, fan compilations, books without readable page numbers or with unusable OCR (Mummy: The Resurrection core), rules-only quick references, and all Mind's Eye Theatre material (Ben, 2026-11-10). Real-world ethnography and history pages were left out too.
- Deployed to rothenstein-wodx; encydiag 4/4, 283 files 0 mismatched, release stamp 8df185c.

## 2026-11-10: the Storyteller's hand (Storyteller 0.18.0, Chronicle 0.10.1)

- From the Storyteller Conveniences study (https://claude.ai/artifact/PuoomdY22Me3psaqhJcSXc); Ben asked for all of it. B430-B436.
- One new Storyteller button (a hand) opens: Before the players arrive, Rules at a glance, Call for a roll, Session timer, End of the night, Next session sheet, Scene kits, Quick extras, Character hooks, Absent tonight, Last time for the players. Players get a Downtime request button (a bed); Chronicle 0.10.1 lists it under Player toolbar buttons.
- New files in wodx-storyteller/scripts: hand.mjs, between.mjs, and the rules glance-rules, callroll-rules, preflight-rules, wrapup-rules, prep-rules, kits-rules. Settings: timer, timerWarn, kits, absent. Approval type wodx-storyteller.downtime.
- Waiting on the PC: each line's experience reasons and the books' ready-made extras (request sent to the PC helper); both are drafts in PENDING-REVIEW until then.
- Tests: 971 harness pass (22 new in hand.test.mjs and between.test.mjs).

## 2026-11-10: Storyteller 0.18.1 and 0.18.2, book lists for the hand

- Experience reasons per line from the core books, with pages; the window shows them per character.
- Quick extras: V20 and V20 Dark Ages dogs and wolves, the extras health rule and mortal soak on every card, sources on each; late weapons from the V20 charts (nightstick as a club).
- The hooks board names V20 p. 267 for Willpower by Nature.
- Fix: extras write Attribute totals too; gatehand sets the watcher's Perception total (the pool reads the total).
- Gates on rothenstein-wodx with 0.18.1: gatehand 12 of 12, UI fit 747 ok. Tests: 971 pass.

## 2026-11-10: the Encyclopaedia's full review, the unreached books and the narrative books

- Full review of every entry (PRs 441-451): 5682 refs tested against their pages on squashed OCR text (key words, numbers, absolute words, 8-word overlap); 373 flagged refs read by hand; 9 wrong pages, 8 overstated claims and 1 claim not in its book fixed, 143 lines reworded. Open: the cbs-temples claim on staked Brujah Methuselahs can't be confirmed from the scan.
- A walk of the book folders (/mnt/project-files/ency-left-out.md) found 116 books never reached; each is now added or skipped with a reason. Mummy: The Resurrection read with a column-aware OCR (tools-env\ocr-cols.py). A squashed-text overlap check (nsp-overlap.py) found 10 old Mummy runs the word check missed, now reworded.
- Narrative books (Ben, 2026-11-10): facts from novels and anthologies went in only when a sourcebook entry backs them (57, tier implied, citing both books). The other 20 went to the Narrative Review Desk (https://claude.ai/artifact/2sH4gv1jC599dsEbX4ht2B). Ben accepted 16, added at tier rumour as "The novel ... tells that" (PR 478), and rejected 4. A desk note led to the sourcebook Esbat entry (PR 473), cross-linked with the Sabbat entries (PR 476).
- Result: 2603 entries from 389 books.

## Phase 10, polish: the rules-clash table (2026-11-10)
- One table of rules that two or more lines rule differently: modules/wodx-chronicle/data/rules-clashes.mjs, written out to docs/RULES-CLASHES.md by tools/clashes/render.mjs (B500-B506). 28 rows: 15 settled, 1 fixed in code, 12 waiting on a page check on the PC.
- Fixed: WoDX Combat soaked Dark Ages fae as C20, so a fae in the mien could not soak lethal and cold iron took all natural soak. Now DA:Fae pp. 104 and 88 apply in the Dark Ages (Combat 3.8.3, Actions 3.19.3; Chronicle 0.10.2 carries the table).
- tools/harness/rules-clashes.test.mjs: every row whole, each house rule named in DECISIONS, the doc matches the data, and the fae soak.

## 2026-11-10: Future Darkness metaplot in the chronicle (Chronicle 0.11.0)
- The approved Future Darkness timelines are dated events: 1990 to winter 2025 and 2026 to 2098, 288 events on the branch only (data/future-events.mjs, built by tools/wofd/build-future-events.mjs from docs/research/wofd).
- New era: Time of Future Judgement, 2099, on the branch only; Future Darkness now ends in 2098. The Time of Judgment (2004) is skipped when the branch is on (excludedByRule in era profiles) (B507).
- Five Cascades for 2099 (The Seventh Storm, The Machine Ascendant, The Red Star, Lilith's Bargain, The Fomorian Night), each holding most of every line's endings, 130 events. The Storyteller picks one in Dated events; none fires until one is picked (B508).
- Hunters on the branch: mortal hunter rules until 2022, the imbued from 2023 (Actions 3.19.4, Storyteller 0.18.3 preludes) (B509).
- The 2099 era counts as Future Darkness for gear, the Library's shelves, clocks, keypads and people tables (Library 0.4.4, Interactables 0.20.1).
- The fall of the Masquerade event moves to summer 2025, the house timeline's flood.
- Tests: events, prelude, era resolution and hunter lines; 999 pass.
- Page checks back from the PC (2026-11-10): every row settled (21 settled, 7 fixed, 0 open). Combat 3.8.4: demons and mummies soak by their own books, bites without fangs are bashing, Bonecraft talons are lethal and Vicissitude 1 no longer claws, Celerity adds nothing to Initiative. Actions 3.19.4: its old soak copy (which soaked a falling Garou as a mortal) now re-exports Combat's; V20's Willpower for each aggravated level past the first. B520-B524. Ben approved every PENDING-REVIEW row at 18:18 UTC.

## Phase 10, polish: code review, first pass (2026-11-10)
- ESLint (no-undef, unreachable, duplicate keys and cases, unsafe chaining) over every module and the fork. Modules: 1 real error class only, reads of another module's flags and settings that throw when that module is off: Sheets 0.6.1 and NPC 0.8.1 (Creation's lineage flag), Otherworlds 0.7.1 (Chronicle's journal flag and latitude). System 7.3.2-wodx.4: adding a bonus on a sheet threw, a PC-sheet ability with a specialty threw in the roll dialog, plus three wrong names in error paths.
- 37 unused variables and helpers listed for the dead-code part.

## Phase 10, polish: AI tells and dead code (2026-11-10)
- AI-tell scan of module strings, docs and all 2603 encyclopaedia entries: stock phrases, placeholders, emoji, em-dashes. Few hits; most were game terms (the Tapestry, the Delve Edge). Seven encyclopaedia summaries built on "X at the heart of Y" were reworded, and one em-dash came out of this log. The text-cleanup test now fails on a list of stock phrases and on placeholder text in any module string.
- Dead code: the 37 unused imports, helpers and locals that ESLint found are gone. WoDX Actions' core-rules.js kept a second copy of the dice and health rules; it now passes WoDX Combat's copy through (every name it uses was already in Combat 3.7.4, the version on Live). The two profiles.js files stay as identical copies by design (whichever module loads first registers them). Old migrations from the vtda20 flags are kept, since the Live world cannot be checked from here.
- Versions: Actions 3.19.5, Chronicle 0.11.2, Combat 3.8.5, Creation 0.9.1, Interactables 0.20.2, Library 0.4.5, NPC 0.8.2, Otherworlds 0.7.2, Paperdoll 0.6.4, Storyteller 0.18.4. Harness 983/983.

## Phase 10, polish: test-gap map (2026-11-10)
- docs/TEST-GAPS.md, written by tools/harness/test-gaps.mjs: harness line coverage of every module file, the 18 files the harness never loads (window and hook files: Atmosphere and Library main, NPC faces and orders, Sheets main, most Storyteller windows) and the gates that name each module. Those files are covered by gates.
- The weakest pure-rules file was Actions rules.js (76%). kindred-rules-core.test.mjs adds 7 tests for its helpers: resisted and extended rolls, teamwork, aura, Virtue and frenzy checks, hunting and feeding, healing, falling, lifting, oaths and diablerie.
- Next: one full gate run on the PC with every module on, in every era.

## Fae blood as a drug (2026-11-10)
- Ben's ruling (B525): fae blood is a potent drug to Kindred in every era, with hallucinations and waking dreams for a scene a point drunk and pools 1 to 3 dice smaller. Actions 3.19.6: rules.js faeBloodHigh, a Changeling / fae vessel in the Feed window, a warning on the feeding card. Rules-clash row updated (Chronicle 0.11.3).
- Phase 10 spelling pass: travellers, colour, grey, favour in the few prose strings that mixed spellings. gateevents now accepts a growing event list.
- Language files: system 7.3.2-wodx.6 adds the missing sheet names, "Unnamed passion" and "Unnamed fetter" to en.json and points two templates at keys that exist. New harness test lang-keys.test.mjs fails on any fixed key the system or a module asks for that en.json lacks. Other languages fall back to English.

## Phase 10, polish: page references (2026-11-10)
- 70 bare page refs on cards and windows now name their book, in the files that cite one book: Demon: The Fallen, Dark Ages: Fae, Dark Ages: Mage, Dark Ages: Inquisitor, Kindred of the East, Mummy: The Resurrection, Hunter: The Reckoning, Wraith 20th, C20 and V20 Dark Ages (Actions, Combat, Creation, Chronicle conditions). "pdf page N, printed page M" is now "pdf N / p. M". page-refs.test.mjs keeps them pinned.
- Left as they are: refs whose sentence already names the book (rules-clash rows, Otherworlds charts, the Storyteller's wonder note), data files whose Library shelf names the book, and the mixed-book files (Garou, the ghoul window, Sheets), where a wrong guess would be worse than a bare page.
- Versions: Actions 3.19.7, Chronicle 0.11.4, Combat 3.8.6, Creation 0.9.2, Storyteller 0.18.5.

## Phase 10, polish: docs match the code (2026-11-10)
- Checked: every module version in MODULES.md against its module.json; every file, test and gate path the docs name exists; the settings the Storyteller's guide names exist. All matched.
- Found: Actions, Senses and Storyteller load rule files straight from sibling folders that their module.json does not require. MODULES.md now says to install every WoDX module together (a sibling may be off, not missing), and cross-imports.test.mjs checks that each of the 109 cross-module imports finds its file and names.
- Live release checklist: docs/LIVE-RELEASE-CHECKLIST.md (before, release, after), walked once as a dry run on the cloud side; nothing released.
## 2026-11-10: everyday goods, more building types, the village and town generator (Interactables 0.21.0, Library 0.5.0)

- Everyday goods by era: modules/wodx-library/data/goods.mjs, 160 goods (food, drink, kitchen things, cloth, tools, light, money, papers, things of faith, medicine, keepsakes, valuables, vices, gadgets), each with its first and last era and a weight for each fill place. Fill by place and era now draws gear, goods or both; a good goes in as a plain line of text. Goods work even before Gear by era is built. B570.
- Map generators split into a shared part: tools/mapgen/ddcore.py (rooms and furnishing, the Dungeondraft writer, sidecar pieces, plan drawing) and buildings.py (12 building types: byre-house, barn, coop, cottage, smithy, tavern, chapel, house and shop, workshop, bakehouse, storehouse, guardhouse), each set down facing any of four ways. check_buildings.py furnishes every type facing every way under 60 seeds. The farmstead builds on them and gives the same files as before from seed 1197. B571.
- tools/mapgen/ddtown.py: a village (about 20 households) or a small town (about 40 to 45) of the Dark Ages. Roads first, a market or green where they meet, the tavern and chapel on the market, trades by demand, homes out to the edges, kitchen gardens, woods around. The sidecar lists every door, chest, bed, hearth and the well, a region per building, the market and the streets, triggers where roads come in, and each building's household (roles only). Night ambient light by default. Samples: tools/mapgen/samples/hohenhausen and birbach (sidecar and plan); the Dungeondraft files are in project files maps/town-dd/. B572.
- Adopt (Interactables 0.21.0) keeps each household on its building's region (flag household) for WoDX NPC to seed later, and shortens the region list in its summary. B573.
- Tests: fill.test.mjs (4 new), adopt.test.mjs (4 new), mapgen.test.mjs (3 new; runs the generators when Python and the asset list are present).
- Waiting: the real importer test (Ben exports a town from Dungeondraft once), the gate and the testbed deploy.
- Phase 10 full gate run (PC job 3, f4c8d5d): 70 of 76 gates passed in full, the 12-era sweep and UI fit were clean, and load time was 4.45 s with every module on against 3.93 s with only the system and Chronicle. Gate fixes from it: gate6h and gate6n accept later Actions versions; gateperception waits for the frenzy overlay to fade; the combat check gates clean up their test combats, read their own card and return a pass count.

## 2026-11-10: cities, and large places split into parts (map tools)
- tools/mapgen/ddtown.py gains a city size (168 by 124 squares, 500 to 700 people, about 125 to 145 households) on a grid of back streets and cross lanes. B574.
- --part N (64 by default) cuts any place wider or taller than N squares into a grid of smaller maps, so a slower computer loads one part at a time. Cuts run on whole squares and are moved to the nearby line that crosses the fewest buildings; a part reaches a little past its cut to hold any building whose middle is in it. Each part has its own Dungeondraft map and sidecar (only its own doors, features and households; edge trigger regions name the part next door), and <name>-parts.json lists every part, its origin, cut and neighbours. --part 0 keeps one map. B575.
- Trees, garden bushes and market stalls are drawn once for the whole place, so two parts show the same things where they meet. Nearby lookups use buckets, so a city builds in under 20 seconds.
- Village samples unchanged; Birbach sample redrawn (the street grid draws one more number); new city sample Rotheim (6 parts). Tests: 3 new or changed in mapgen.test.mjs, the Rotheim market part added to the adopt town tests. 1012 of 1012 pass.

## 2026-11-10: organic villages, towns and cities (map tools, Interactables 0.22.0)
- Ben asked whether github.com/thebadman7824/TownGeneratorOS (the Medieval Fantasy City Generator's source, CC0) could make cities look more organic. Its model code was run headless with Haxe 4.3.3 and a small stand-in for OpenFL's Point (OpenFL's download site is blocked in the cloud), and four reference cities drawn from it: /mnt/project-files/maps/organic-compare/.
- tools/mapgen/geom.py (plain geometry, Voronoi by way of Delaunay) and tools/mapgen/layout.py: a Python port of its layout steps: spiral points and Voronoi patches, the middle ones smoothed; close junctions merged; a curtain wall with gates (a field outside a gate is split so a road can leave); streets from each gate to the market and roads in from the country by shortest way, joined into arteries and smoothed; wards handed out by the original's rules. B576.
- tools/mapgen/organic.py: on that plan, blocks shrink back from streets and the wall, big blocks are cut with alleys, and WoDX's furnished buildings stand side by side along every frontage, turned to face it in 15 degree steps (Angled in buildings.py furnishes each in its own frame first). Ward mixes, spacing and trade caps are house rules. The tavern and chapel take the market first; farms stand by the roads outside. Map size follows the layout (1.6 squares a unit). Now the default; --layout grid keeps the straight-street generator, --walls yes/no/random. B577.
- Interactables 0.22.0: Adopt reads a feature's rotation (tile rotation) and a region's outline (polygon shape). B578.
- Samples: schondorf (organic village), linberg (walled organic town, 6 parts). Tests: 2 new in mapgen.test.mjs, 1 new in adopt.test.mjs, schondorf added to the adopt town tests.

## 2026-11-10: less blocky buildings (map tools)
- Ben found organic towns' buildings still very blocky. tools/mapgen/buildings.py gains variant(): a building may be stretched at one end or the front, and may gain a wing or lean-to at the back or either side (a kitchen, store, shed, workshop or byre to suit the type), so houses come out as L, T and U shapes as well as boxes. The joining wall gets a doorway (or keeps a door already there), windows it covers go, and the new room is furnished. A variant that won't furnish is skipped. B579.
- Terraced rows: in the market, merchant, administration, gate, craftsmen and slum wards most frontages are built as a row, side wings left off, houses almost touching with the end windows that face each other dropped. B580.
- Outlines with wings go through to the sidecar and the plan; collisions use each part of the building. ddcore skips zero-length wall pieces.
- Not done yet: fitting back and side walls to an odd-shaped plot; left for the burgage plot work suggested in the planning research (Claude Doc "Town planning lessons for the map generator").
- Samples schondorf and linberg redrawn. Test: organic homes must include some with more than four corners.

## 2026-11-10: buildings kept off streets, roads and alleys (map tools)
- Ben: buildings must never stand on a path or road, since NPCs with daily rounds will walk them. A check over 15 towns found 218 overlaps, almost all with alleys: the old test measured only a building's corners against each way, so an alley could cross a long wall between them. One market tavern also moved when its variant would not furnish.
- organic.py now measures whole walls against every way band (geom.seg_poly_dist), checks gardens too, re-finds a spot for a plain tavern or chapel, and stops with an error if any building or garden is on a way (check_ways), as the farmstead generator does. After the fix: 0 overlaps over the same 15 towns. B581.
- Samples schondorf and linberg redrawn.
## 2026-11-10: Era item lists (Library 0.6.0, B590-B592)
- data/goods.mjs grows from 160 goods to 681, in 21 kinds and 80 sub-categories, covering the prologue ages, 1197 and every era to the Time of Future Judgement. Rows give years in use; eras are derived from Chronicle's era years.
- Every good carries tags.category, tags.era and tags.value (tier per era, 0 Trifle to 5 Treasure, set against Resources). VALUES, SOURCES, SUBS, ERA_YEARS, valueAt() exported.
- Fill by place and era (Interactables) needs no change: it reads name, kind, eras and small as before; place weights cover the seven new kinds.
- tools/goods/build-desk.mjs writes the review desk's item file. Desk: https://claude.ai/artifact/RFDVx5w2jCtbK1ASY8WeLP.
- Tests: three new in fill.test.mjs (tags on every good, era years match Chronicle and every era from 1197 has every kind, a value can change over time). Harness 1019 pass.
- 2026-11-11 (B594-B596): sub-categories dropped; 31 top-level categories (ten adapted from Cataclysm DDA), 799 goods. Each good carries behaviour, stacks, uses, sheet type and V20 concealment step (P/J/T/N) in tags. Gear category spelled Armor. Items back on the desk for Ben's marks.
- 2026-11-11 (B597): no piles. 110 goods became one thing that stacks, with a usual stack size (STACK_SIZES); Fill writes "7 bronze coins" (Interactables 0.23.1). 797 goods.

## 2026-11-10: burgage plots (map tools)
- Ben approved every recommendation in the Claude Doc "Town planning lessons for the map generator"; this is the first. Houses on a frontage now get a plot: a strip of land in the house's own frame, as wide as its share of the frontage, running back to the ward's plot depth or until it meets another plot, a building or a way. Behind the house is a yard, then a garden or croft to the back fence. Fences run along the sides and back, open to the street. B582.
- A frontage that would stand back to back with one already built in the same block, closer than 16 squares (20 to 24 in villages, outside the gates and in rich wards), is left as yards. Slum and craftsmen wards still build on alleys and back to back, packing their yards into courts. Towns come out a little less dense (Rotheim city seed 9: 161 households, was 186).
- Each plot is a sidecar region "Yard of the <building>" (place home, private, owner the building). Plots are checked against every way like buildings.
- Samples schondorf and linberg redrawn.

## 2026-11-10: rivers, bridges, mills and washing places (map tools)
- Second of the approved planning recommendations. An organic village, town or city may have a river (villages 50%, towns 60%, cities 75%; ddtown.py --river yes/no/random). It winds gently across the whole map and passes to one side of the market, 2.6 to 4.6 squares wide by size. It is not tied to the patches: buildings, wings, plots and gardens keep off it like a way (check_ways covers it), and each street or road that crosses it gets a plank bridge with railings. B583.
- A watermill (a workshop whose household is the miller's) stands on the frontage nearest the water; a washing place (trough, bucket, barrel) sits on the town's bank upstream of the middle of town, leaving downstream for the dirty trades. The river is drawn with Forgotten Adventures' River_Bank_Blue path.
- Sidecar regions: river-N (the river, place other), bridge-N (place street), washing-place (place other). Samples schondorf and linberg redrawn. Test: a town on a river has its river, bridges, washing place and miller; --river no has none.

## 2026-11-10: dirty trades, wealth, landmarks, suburbs and fire (map tools)
- Recommendations 3 to 7 of the approved planning doc. The river now takes the course (of ten tried) that runs along the fewest ways, so streets do not run into the water.
- Dirty trades: about 30% of workshops become tanners, dyers, butchers, fullers and chandlers, placed by a score that favours downstream on the river, against or outside the wall, and far from the market; the rest take clean trades. B584.
- Wealth: each house is rich, middling or poor by distance from the market, its ward and nearness to the dirty trades. Rich houses have stone and timber walls and boarded floors, middling timber and plaster, poor plain timber. Each household in the sidecar carries wealth (Adopt does not read it yet). B585.
- Landmarks: public wells by the busier junctions away from the market, set back off the ways (towns 2, cities 6), a market cross a few squares from the market well, and a tower each side of every gate. B586.
- Suburbs: gate wards outside the walls are now likely (85%), with inns and an almshouse (its keeper and almsmen) as well as cottages, smiths and workshops. B587.
- Fire history: villages 20%, towns 40%, cities 60% have had a great fire in one block. One burned-out plot is left with charred timbers (sidecar region burned-N) and the block's houses were rebuilt in stone. B588.
- Samples schondorf and linberg redrawn.


## 2026-11-10: dates for Encyclopaedia events (Library 0.5.4)
- Entries may carry `date` {from, to, label, approx, refs}: years with BCE negative, the date as the book writes it, and its page. The format check tests it; the journal shows it under When; the journal flags carry year and yearTo.
- Ben asked for dates on every event, from the OCR'd books where they give one. 206 entries checked (195 events and 11 lore entries that tell of a war, battle, fall or treaty); the text of each cited page and the pages either side was searched for dates on the PC. 84 now carry a date. The rest have none on or near their pages, or their books are novels with no text on the PC (B593).
- The table of dates and the script that writes them: tools/encyclopedia/event-dates.py.
## 2026-11-10: river stairs and water gates (map tools)
- Ben's report: the river lay over the end of one path, and the wall had no opening for the water. B589.
- The river course now also counts dead ends in the water and gates by the water against it. Ways that still reach the water stop on the bank with stone river stairs (region landing-N). Alleys are not cut toward the river. check_ways() stops the generator if a way runs into the river.
- Water gates: the wall is cut where the river passes, an iron grate spans the stream, and a tower stands on each bank (region water-gate-N). No wall tower stands in the water.
- Plan view draws the river as wide as the Dungeondraft map does. Fixed a duplicate road-trigger id when one road leaves by the same side twice.
- Sample linberg redrawn.
## 2026-11-10: lighter sheet saves and redraws (fork 7.3.2-wodx.7, WoDX Sheets 0.6.2)
- From the character sheet review (https://claude.ai/artifact/9HMVrBciCtp9WQCAZiDSrW), steps 1 and 2.
- After-save recompute: only the client that made the change runs it, and it writes the changed values only (module/scripts/wodx-save.js, `systemChanges`). The item-change recompute does the same. B600.
- Mortal and PC sheets no longer print the whole actor to the console on every redraw.
- All 12 line sheet templates wrap the Core tab in `{{#unless wodxCore}}`; WoDX Sheets sets `wodxCore` when it draws the book's sheet. B601.
- Harness: sheet-speed.test.mjs. Gate: tools/gate/gatesheetspeed.mjs (redraw times, saves per change, totals follow, Core tab with and without a WoDX sheet).

## 2026-11-10: sheet extras (WoDX Sheets 0.7.0), not yet deployed
- Ben asked for all nine suggested sheet features. On every WoDX sheet: in-play strip; Possessions tab (containers, stacks with split and merge, concealment sizes, out-of-era flags, value for the time, money by era, search and filter, give, leave on the map); Ties tab (domitor and ghouls filled in from the lineage); Storyteller's notes in a Storyteller-only journal; search on long power lists; History window with Undo; Print. B602-B606.
- Pure parts in extras-rules.mjs and extras-html.mjs; harness sheet-extras.test.mjs. Full suite 1042 pass.
- Sample shown to Ben before any testbed deploy: https://claude.ai/artifact/UcwShGByyLddqUGKWYRD9d
## 2026-11-10: the RPG Builder ideas (Chronicle 0.14.0, NPC 0.9.0, Interactables 0.23.0, Atmosphere 0.11.0, Storyteller 0.20.0)
- From the RPG Builder review (https://claude.ai/artifact/MvqiV7QLsQP3KJcd6uukXz), every idea, approved by Ben 2026-11-10 23:18Z.
- WoDX Chronicle: scripts/when-rules.mjs (the language, pure) and scripts/when.mjs (the world and character read into a context; outcomes; the Storyteller's checker). API: game.wodx.chronicle.when.check / run / context / checker. B620, B621.
- WoDX NPC: Trigger regions have "Only when" and "Then also" (B622); behaviour window has Phases (npc-rules parsePhases, phaseNow, withPhase; B623).
- Same PR, the rest of the review's ideas: NPC households, talk sheets and faction standing toward characters (B624, B630, B632); Interactables 0.23.0 stock lists, restocking, "Opens for", plain names handed over, the Fill button wired in the tile window (it was looked for in the wall window) (B625-B627); Atmosphere 0.11.0 Mood regions (B628); Storyteller 0.20.0 Ledger objectives and recipes for long tasks (B629, B631).
- Harness: when.test.mjs, rpgb-batch.test.mjs; interactables.test.mjs now expects a plain name to be handed over. 1055 of 1055 pass. Gate: tools/gate/gatewhen.mjs (9 steps).
## 2026-11-10: part lines that miss the market and houses; era layers (map tools)
- Part lines are planned before any building goes down, along streets and round the market, which now stays whole on one map. A house a line passes over is drawn whole on its own part only, and the plan shows the line stepping round it. B650.
- Era layers: ddtown.py --year grows the medieval town through every later age up to that year (eras.py). Railway (track path), station with a stone platform, quays and embankments in stone, ring road on the old wall line, courts, cemetery, park, boulevards, suburbs, bomb sites or car parks, offices in old warehouses. Sidecar era from Chronicle's eras.json; new regions tagged with an area kind. B651.
- Site maps: ddsite.py makes a castle (curtain wall, towers, gatehouse, moat, keep, hall and bailey buildings), a drift mine (pithead yard, adit, railed haulage gallery, working faces, sump, shaft) or an arcology deck (atrium and lift core, corridors, housing, hydroponics, commons and services quarters, maglev). Samples in /mnt/project-files/maps/site-samples/. B652.
- Even map parts: part lines are equal cuts no wider than --part, no building stands on one, and a refill pass by the lines takes back some houses (about 15% fewer in all). Linberg sample regenerated. B653.
- Metropolis size: ddtown.py --size metropolis, 60 districts, organic layout only. B654.
- Rivers: meandering middle line from the sine-generated curve, bends sized from the water's width, cut-offs leave oxbow lakes or old river beds. Schöndorf and Linberg samples regenerated. B655.
- Rivers from the land: land.py height map (valley, town rise, noise); river is the least-cost course down the valley, bends only on flat ground, width varies with bars on tight bends, floodplain keeps houses off outside the town, lesser streets end at landings unless a bridge is far. Samples regenerated. B656.
- Landforms: land.py picks plain, hills, upland, foothills, karst or mountain (--land), raises and then erodes the ground, draws brooks and karst sinkholes, terraces the town; houses keep off brooks, sinkholes and steep slopes; plan has hill shading and contours. B657.
- Bridges only where needed: road bridges spaced, lesser streets bridged only far from any bridge; fixed cut streets keeping their bridge and the oxbow sidecar window bug. New test: towns stand in real landforms. B658.
- New test: a town grown to 1950 has a railway, station, ring road, quay and suburb, era mid-century; the medieval town has none.
- Known gaps: every building is still a medieval type (no later building packs), and towns lose houses to the new ways rather than growing denser.
- Sample linberg redrawn.

## 2026-11-11: teleport to the cursor (Storyteller 0.21.0)
- Storyteller-only token toolbar button: press it, then click the map, and the selected tokens jump there (right click or Escape cancels). Key Alt+Shift+P sends them to the cursor at once.
- Jumps use a displacement move (no walls, no path, no animation), snapped to the grid unless gridless, kept inside the scene. A group keeps its shape around the point. Elevation and level unchanged.
- teleport-rules.mjs (where each token lands) with teleport.test.mjs; api game.wodx.storyteller.teleport.

## 2026-11-11: Real money by era (Storyteller 0.26.0, B598)
- money-rules.mjs: monies by region and year (Moravia default; German, English, American, French), monthly wages, allowance ladder x1.5, prices from goods value tiers, selling, fencing, credit, haggling, savings carried across a change of money.
- money.mjs: a purse per actor (carried, bank, debt, log, undo), pay day each month on the Storyteller's monthly card, pay/receive/transfer/price/cashIn in the Storyteller API (api.money), carried and bank editable in the Money by era window.
- Item Review Desk shows each good's price in Moravia by era.
## 2026-11-11: the NPC topic menu (NPC 0.10.0)
Players talk to NPCs from a topic menu, in the manner of Daggerfall and Morrowind (B661 to B663). The Talk button in the token tools (and, once built, Talk in WoDX Actions) opens a window for the targeted person (with nobody targeted, the nearest one in reach): their greeting, Ask about (what this person can be asked that the character knows or is offered), Local talk (news, rumours, work, directions), and the answers so far. The line comes from the NPC's talk sheet, then their household, faction, scene and everyone sheets (NPC panel, Shared talk), picked on the Storyteller's client by "Only when" tests, so a 1197 and a 2097 answer can sit side by side. A line can teach a topic, give a codex page, be said aloud, or run any Chronicle outcome; the Storyteller's copy has Undo for what was taught. "Ask me first" on an NPC sends the Storyteller a card instead. talk-rules.mjs, talk.mjs; tests talk-menu.test.mjs; gate tools/gate/gatetalk.mjs; UI fit adds the Talk and Shared talk windows.

## 2026-11-11: stock talk (NPC 0.11.0)
NPCs now have things to say before the Storyteller writes a line (B664, B665). About 370 stock lines by era and by how the NPC regards the character: greetings, brush-offs, everyday gossip, news, work and directions. Asked for rumours, an NPC passes on the newest rumour it has heard on the WoDX Storyteller rumour network, in a lead-in that fits how it feels about the character; a hated character gets nothing. Storyteller lines always come first. World setting "Stock talk" and a per-NPC "No stock talk" box. Tests stock-talk.test.mjs; gatetalk gains a stock talk step.
## 2026-11-11: Dealing with NPCs, part A (Actions 3.20.0, NPC 0.12.0, Chronicle 0.15.0)

Ben asked how the Actions menu could drive dealing with NPCs (design: https://claude.ai/artifact/Ted6jfh7nS7smhvqJsBvsf), then to build it as recommended. Part A: "With this person" in every line's Act group opens a window on the targeted NPC (or the nearest in talking reach): Talk opens WoDX NPC's topic window, and Persuade, Fast-talk, Deceive, Intimidate quietly, Threaten openly, Question them and Bribe are resisted rolls from V20's social systems (pp. 265-266). Charm or seduce runs the three-stage Seduction; Use a power opens the line's menu with the NPC targeted. The NPC's roll is a blind whisper to the Storyteller (B672). Each NPC now has its own attitude toward each character (B670), seeded from household or faction standing at the first meeting and moved by how the characters treat that NPC; it shifts social difficulties and goes through the approval queue when a player's roll moves it. A won roll leaves a sway note for an hour, and Chronicle's "Only when" lists gain "attitude >= welcome" and "persuaded [by <name>]" (B674). Book notes: docs/research/social-book-checks.md. Tests: social.test.mjs, talk-menu.test.mjs. Parts B (lift and plant), C (trade on the Storyteller's money) and D (seduction feeding) follow.

## 2026-11-11: Markets, the living economy's first build (Storyteller 0.26.0, Interactables 0.24.1, B599)

Ben approved the living economy study's recommendations. Built steps 1 and 2: markets per settlement with a price index and supply per goods category, set by hand in a Markets window (Upkeep, Storyteller only); all prices read the index. Traders link an NPC and a stock container to a market; a stock draw is thinned or filled by supply and paid from the NPC's purse at half price. Interactables fires wodxStockFilter and wodxStockDrawn around a stock draw. New rules file market-rules.mjs, window markets.mjs, tests markets.test.mjs. The weekly market turn is not built yet.
## 2026-11-11: Dealing with NPCs, parts B and D: lift and plant, seduction and feeding (Actions 3.21.0)

"With this person" gains Lift something and Plant something (B675): Dexterity + Larceny (Legerdemain in the Dark Ages) against the mark's Perception + Alertness, who notices only by beating the thief. Only pocket or jacket sized things come off the person; coins come off the Storyteller module's purse when it is there. The card says where people keep things in that year, from a belt purse in 1197 to a cred chip after 2020. The take and being caught go through the approval queue; caught raises the scene's alarm and costs standing and attitude. Also fixed from the first testbed run of gatesocial: the window's content was a form inside the dialog's form, which browsers drop, so the window showed no buttons; and "persuaded by <name>" now matches the NPC's actor name as well as the token's. Part D (B676): Charm or seduce takes the NPC's attitude into each stage, and a Kindred whose seduction wins is offered the feeding window at once, as the Siren hunts.

## 2026-11-11: the open world by era (Storyteller 0.22.0, NPC 0.13.0, Chronicle 0.16.0)
Ben approved every recommendation of the open world study (B700 to B709). Travel places take a distance and a road; the trip's time comes from the ways the year allows, slowed by the weather and the dark, and encounter odds follow the road. Ready routines change with the age, with five new ones for later ages. Rumours and Masquerade breaches spread at the speed of the age's media, with big news and optional twists.
- Storyteller: road-rules.mjs (roads, ways, weather and night factors, encounter odds); world-rules.mjs tripPlan; Travel places window has Km and Road; Out on your own has How; the log says how a character went and what slowed them. rumours.mjs heat from media-rules, big news, the setting "Rumours change in the telling".
- NPC: routine-rules.mjs AGES, ageOf, presetBlocks, presetsFor and five new presets; the routine window has Hours of the age; factions.mjs breach reach by age.
- Chronicle: media-rules.mjs.
- Tests: open-world-era.test.mjs.- Creation 0.10.1: townsfolk with no birth year are spread over thirty years of age in Pass the Years, and their heirs start ticked when they die of age (B710, B711). The study had said mortals never age; Pass the Years already ages everyone, so this is the part that was missing.

## 2026-11-11: Dealing with NPCs, testbed fixes (Actions 3.21.1)

The second testbed run of gatesocial found two faults and UI fit one. Lift and plant moved items on the world actor while the window listed the token's own pockets, so on an unlinked NPC token the thief got a copy and the NPC kept the original; the move now goes by actor uuid, so the token that was robbed is the one that loses the item. A won social roll stored the token's name as the NPC's name (an unlinked token's actor carries the token's name), so "persuaded by <NPC name>" failed; the note now holds the world actor's name and the token's. The With this person window refused a call of the form {actor, token} unless the actor was a real Actor, so UI fit never saw it; it now takes any options object with a token. gatesocial step 8 now reads the token's own actor.

## 2026-11-11: realm maps (Otherworlds 0.8.0)
Ben asked how maps in Umbral realms are formed, then for a study of the Umbra's reflection, the Deep Umbra and the Underworld, and map logic for every realm outside the Near Umbra (B730-B733). Study doc: https://claude.ai/artifact/WrAho8YW73inRyAjAVo8Vz. Built: realm-maps-rules.mjs, a catalogue of 34 realms (Werewolf's Umbral Realms, Mage's Horizon, Shade, Shard and Paradox Realms, the Deep Umbra, the Digital Web and Autochthonia, Wraith's Tempest, Stygia, Labyrinth, Far Shores and Dark Kingdoms, Enoch, Yomi, the Yellow Springs, Duat, the Abyss of the Fallen, the Far and Deep Dreaming) in seven layouts, each with landmarks, hazards, ways in, sources and era spans from 1197 to the World of Future Darkness. A seeded generator makes the cells, walls and regions (arrival, ways out, landmarks, hazards) and an SVG drawn at night. realm-maps.mjs draws a realm as a scene in WoDX realms (art in Data/wodx-assets/realms), redraws it, sends the selected tokens there and brings them back. Storyteller toolbar button "Realm maps". Tests: realm-maps.test.mjs (every realm in 11 years, both branches, two sizes: everything joins up).
## 2026-11-11: building designs by era (B659)
Ben asked for building designs for each era, informed by real or speculative models, then approved them. The map generator now has 23 era building types from the Renaissance to the World of Future Darkness, each named after its Moravian or speculative model (Telč arcades to Nakagin capsules), with rooms and furniture from Forgotten Adventures, Tyger's modern packs and Mog's sci-fi pack. A town given --year is rebuilt era by era: houses and shops are replaced in each era's style, and town halls, manufactories, mills, tenements, schools, department stores, houses of culture, panel estates, supermarkets, capsule towers and vertical farms go up when their time comes. Maps after 1840 grow room outside the walls. Samples of one town, Linberg, in 1500, 1750, 1900, 1970 and 2050: /mnt/project-files/maps/era-buildings/. Test: "every era building type furnishes, and a 1950 town is rebuilt with era types".
## 2026-11-11: More stock talk (NPC 0.14.0)

Ben asked for every kind of NPC line suggested after the stock talk library (B740-B742). About 500 new lines in data/stock-talk-more.mjs, wired in: greetings now carry one aside (a wound, a debt, what the character is, a rumour about them, small talk on the feast, fast, weather or season), a remembered visit replaces a stock hello, and Goodbye says a farewell. Voices for thirteen kinds of people come from the behaviour window or from faction and household names. NPCs remark as their routine changes and cry out on alarms and when hurt, as speech bubbles by default. api.talk.stock(kind, {npc, pc}) gives WoDX Actions trade and social-roll lines. Harness 1125 pass (stock-talk-more.test.mjs, 6 tests).

## 2026-11-11: Umbral twins from the town generator (Otherworlds 0.9.0)
- tools/mapgen: eras.py records each building a later age pulls down (t.gone, with year and why); organic.py writes an "umbral" block into the sidecar (year, places by type, wealth, dirty trade, rebuilt, and the gone list). Sample reflecttown.wodx.json (grown to 1960) added; schondorf.wodx.json regenerated with only the new block.
- modules/wodx-otherworlds/scripts/reflect-rules.mjs (pure): marks for each layer, the webbing by age, an overlay SVG, region shapes, a short summary.
- reflect.mjs (Foundry): reflectScene, undoReflection, reflectDialog; plain twin levels when none exist; toolbar button "Reflect a generated town map" (Storyteller); api.reflect.
- realm-maps-rules.mjs: page refs from the PC lookups (B737).
- Tests: tools/harness/reflect.test.mjs (7). Gate: tools/gate/gatereflect.mjs (8 steps).

## 2026-11-11: Future Darkness events moved to Moravia (Chronicle 0.16.1)
- Eight World of Future Darkness events put Rothenstein in the Rhineland or centred the Rhineland (2044, 2058, 2081, the 2099 Seventh Maelstrom and four cascade beats). The sources in docs/research/wofd now name Moravia, and data/future-events.mjs was rebuilt with tools/wofd/build-future-events.mjs.
- The source also takes the spelling pass's "favours", so the rebuild changes nothing else.

## 2026-11-11: The crossover referee (Chronicle 0.17.0)
- Item 1 of "Lines and eras that meet" (approved 2026-11-10). B760.
- modules/wodx-chronicle/data/crossover.mjs: 34 cases over 14 kinds of meeting, each on a rules-clash row, with pages; three drafts carry their page question.
- scripts/referee-rules.mjs (pure): profileOf (the shared Combat profile flag first), bookOf (Dark Ages books up to the Long Night), casesFor (True Faith first, fallbacks only when nothing particular fits), testFor (Generation, Faith, Day or Night, Willpower, countermagick, Wits + Occult, Auspex against Obfuscate as WoDX NPC reads it, witnesses, possession), successes.
- scripts/referee.mjs (Foundry): the referee window (selected token and first target fill it in; every case listed with a search box), rolls whispered to the Storyteller, a tool in the Storyteller's hand, key binding "The crossover referee", api.referee (open, ask, roll, sheetOf, cases).
- Tests: tools/harness/referee.test.mjs (11). UI fit: the referee window added. Gate: tools/gate/gatereferee.mjs.

## 2026-11-11: The referee's book checks (Chronicle 0.17.1)
- B761. From the PC lookups: changeling and wraith Dominate settled as house rules; Auspex against hiding that is not a Discipline (V20 p. 142) for wraiths, mages, fae and the rest; ghouling Garou, ghosts and mages (Ghouls: Fatal Addiction p. 23); imbued second sight (Hunter Players Guide p. 58), drafts until the HtR core is read.
- isReckoning() in referee-rules.mjs mirrors WoDX Actions' hunterLine(); the harness checks the two agree for every era. referee.test.mjs now 12 tests.

## 2026-11-11: The anachronism check (Sheets 0.8.0)
- Item 2 of "Lines and eras that meet". B762.
- modules/wodx-sheets/scripts/anachronism-rules.mjs (pure): jumped, newlyOut (only what the jump changed, kept items left out), isOn (automatic is off in the Live world).
- anachronism.mjs (Foundry): the check on updateWorldTime and wodxSkipEnd (active Storyteller, after the skip), the whispered card with Keep buttons, world settings "Anachronism check" and the stored year, api.anachronism (check, scan, report, keep). extras-rules.mjs: isKept; a kept item shows "Out of its time, kept by the Storyteller" and is not counted in the warning.
- Tests: tools/harness/anachronism.test.mjs (6). Gate: tools/gate/gateanachronism.mjs (6 steps).

## 2026-11-11: Mage effect keywords (Actions 3.22.0)
- Items 2 and 3 of "Magic that applies itself". B763.
- modules/wodx-actions/scripts/effects-rules.js (pure): KEYWORDS (19), spheresFor, needFor, spend, durationFor, outcome, route, leanOf, wardStands.
- effects.js (Foundry): the keyword fieldset in the Mage 20th Cast window (ticking a keyword raises the Sphere choices), the card's "What it does" list, the active Storyteller's client applying automatic items on createChatMessage (Combat soak and damage, healing, Quintessence, Chronicle timed effects and conditions, token light, elevation and vision), one Undo button from snapshots, queued items sent to the approval queue (type wodx-actions.effect). World setting "Magic that applies itself".
- Tests: tools/harness/effects.test.mjs (8). Gate: tools/gate/gateeffects.mjs.

## 2026-11-11: Mage keywords, moves, areas and saved rotes (Actions 3.23.0)
- The rest of item 2 and item 3 of "Magic that applies itself" (B764).
- effects-rules.js: Move outcome and route, AREA, inArea, areaRadius, area in needFor and spend, roteFrom, keepRote.
- effects.js: Move and Place the area buttons on the card for the Storyteller (pickPoint: the next click on the map), placeArea makes a Region flagged with the effect, the active Storyteller works it on whoever enters (updateToken), areas end with their duration (updateWorldTime) or at the end of the scene (wodxEndScene), Undo removes the Region and what it did. Saved rotes in the Cast window (a list with a search box past five, Save as a rote named).
- Tests: effects.test.mjs (9). Gate gateeffects.mjs now 10 steps.

## 2026-11-11: Rote items open the WoDX Cast window (Actions 3.24.0, Sheets 0.8.1, fork 7.3.2-wodx.8)
- Item 4 of "Magic that applies itself" and the rest of item 3 (rotes on the sheet). B765.
- effects-rules.js: roteOfItem, itemOfRote. effects.js: rotesOf reads Rote items, saveRote makes or updates one, forgetRote, fill, takesRote. m20.js: cast(actor, {rote}) fills the window; castRote for the system. main.js: api m20CastRote.
- Fork: the Rote branch in action-helpers.js asks game.wodxActions.m20CastRote first. Sheets: a cast button on each rote in the Rotes list (Mage 20th sheet).
- Tests: effects.test.mjs (10). Gate gateeffects.mjs 11 steps.

## 2026-11-11: Countermagick on keyword cards (Actions 3.25.0)
- Item 5 of "Magic that applies itself". B766.
- effects-rules.js: countered, canCounter. effects.js: the card's recipe and hold, applyCounter (undo, cut, work out again, reflect), the Countermagick and Apply now buttons, the list redrawn from the flags. m20.js: counter(actor, {card}) posts a counter result the active Storyteller applies to the card.
- Tests: effects.test.mjs (11). Gate gateeffects.mjs 12 steps.

## 2026-11-11: The Dark Ages rotes on the table (Actions 3.26.0)
- Item 6 of "Magic that applies itself". B767.
- modules/wodx-actions/scripts/mage-da-effects.js (pure): DA_EFFECTS for all 97 rotes, daDuration (p. 103 ladder), lastsFor, daOutcomes, targetCount.
- effects.js daPlan; mage-da.js posts a successful rote's card with the same items, so the active Storyteller applies them with Undo, queues the rest and lists the Storyteller's calls.
- Tests: effects.test.mjs (12). Gate gateeffects.mjs 13 steps.

## 2026-11-11: Path magic and Numina on the table (Actions 3.27.0)
- Item 7 of "Magic that applies itself" (Numina part included). B768.
- modules/wodx-actions/scripts/path-effects.js (pure): PATH_EFFECTS for all 70 path powers, NUMINA_EFFECTS by numen and level, pathOutcomes, numinaOutcomes. mage-da-effects.js gains outcomesOf, fixed damage and a heal result.
- effects.js planOf, pathPlan, numinaPlan; kindred.js (Use a Discipline) and hunter.js (Numina) post the card. Timed effects name their book page.
- Page check: /mnt/project-files/path-powers-book-check-20261111T103729-2a82.md (printed pages).
- Tests: effects.test.mjs (13). Gate gateeffects.mjs 14 steps.

## 2026-11-11: The Sorcerers Crusade's magic charts (Actions 3.28.0)
- Item 8 of "Magic that applies itself". B769.
- effects-rules.js ERA_RULES, eraRules, crusadeLevels, CRUSADE_MULT; outcome reads ctx.age for damage, healing and Quintessence. effects.js plan takes {age}; m20.js passes the chronicle's age, uses it for the plain damage line, and hides reflect in the Crusade.
- Page check: /mnt/project-files/crusade-effects-book-check.md (printed and pdf pages).
- Tests: effects.test.mjs (14).

## 2026-11-11: fixes from the design document review
- Light-touch mode holds every proposal (Chronicle 0.17.2, B790): approvals-rules.mjs routeProposal takes lightTouch; approvals.mjs reads the house rule; the held note names why; the hint and the clock notice say what happens.
- Years between eras on the Chronicle Rules journal (B791): era-resolve.mjs interludeSpans; eras.mjs passes the spans to journals.mjs.
- The two shared profiles.js copies: headers say what differs (the Actions copy's line look); a harness test keeps everything game.wodx.profiles offers the same in both.
- docs/HOOKS.md lists every hook, who sends and who hears it, with the nine unheard ones as extension points; hooks.test.mjs fails when a new hook is sent and not listed. Atmosphere's header no longer says Senses hears wodxWeather.
- Version numbers dropped from the main file headers of Atmosphere, Interactables, NPC, Senses, Sheets, Storyteller and Targeting (module.json holds the version).
- MODULES.md: Senses 0.5.1, the broken Chronicle fragment, the title date. STORYTELLER-GUIDE.md: names the build Live runs now and points to the running guide; step 1 no longer says seven modules.
- Otherworlds 0.9.1: the module.json reason says Chronicle must be installed even when off.
- Not changed here: the Moravian coins wait on PR 506 (goods and money), which holds them.

## 2026-11-11: fuller furniture for the later eras (B659)
Ben saw the plans page (https://claude.ai/artifact/MK8nkv4MRBxncvF6A2QoKo) and asked for the bare later-era rooms to be furnished. 31 more Tyger and Mog pieces were measured on the PC and added: whole kitchens and living rooms for the Baťa house, functionalist villa, panel-block flats and entrepreneur's house; shop aisles, freezers and checkouts for the department store, supermarket and petrol station; rows of seats in the house of culture; capsules with desks, sinks and lockers; growing rows in the vertical farm. A new furniture rule, at:x:y, puts a piece on a fixed spot so aisles and seat rows come out in lines; a spot that will not take it stays empty.


## 2026-11-11: trait effect table, step 1 (Chronicle 0.18.0, B800-B803)
Ben approved Traits With Teeth (https://claude.ai/artifact/4QwnLur2u6kmHPQSMjTgn4) as recommended; this is its step 1.
- data/trait-effects.mjs: PATTERNS (P1-P20), BACKGROUND_HOOKS, MERITS_FLAWS (162 V20 entries: cost, printed and pdf page, patterns, holders, against, aliases, effects for step 2), BACKGROUNDS (71 from fourteen books with pages), BOOKS_DONE.
- scripts/trait-rules.mjs: normName, featureKind, kindsOf/kindFits (mixed kinds), buildIndex, matchFeature (item flag wodx-chronicle.trait overrides; "none" leaves alone), traitsOf (wrongKind with a reason), has, effectsFor (channel, tags, the other side's kind), missing, problems, describe.
- scripts/traits.mjs: view(actor) for players and NPCs alike, the "Trait effects" window on the actor sheet header (Storyteller sets the match), api.traits {view, of, has, effects, open, whenFeats, kindOf, table, rules}.
- "Only when": merit, flaw, background [>= n], power (when-rules.mjs; when.mjs reads feats and powers).
- Book checks: /mnt/project-files/trait-book-checks.md; draft patterns for the other books: /mnt/project-files/notes/trait-effects-draft.md.
- Tests: trait-effects.test.mjs (10).

## 2026-11-11: trait effects, step 2 (Actions 3.29.0, B804-B806)
- wodx-actions/scripts/trait-hooks.js: traitMods, resistMods, powerTags, tagsFor, the world setting "Merits and flaws on rolls", TICKS and ticksHtml.
- rules.js actionPool takes traitDice, traitDiff, traitParts. main.js: actions, quick checks and the frenzy check (beastRoll) read the traits. social.js: speaker's traits, the NPC's resist-social traits, first meeting from WoDX NPC. kindred.js: target's resisting traits on Discipline rolls.
- Chronicle trait-rules.mjs: effectsFor reads nameTags, againstKinds and the moon; sumEffects; rollTags. 37 V20 entries carry effects. Fixed: nameTags read the item name before its bracket was stripped, so "Acute Sense (Hearing)" now works.
- Tests: trait-effects.test.mjs (17).

## 2026-11-11: realm maps checked against their descriptions (B738, B739)
Ben asked for each otherworld map to be checked against how the books describe the realm, rebuilt where it fell short, and a new set of samples. Otherworlds 0.10.0: every landmark placed once, named arrival and ways out, era hazards spread out once each; Stygia and the Dark Kingdoms walled island cities with a harbour arrival; the Tempest and the Far Shores on a storm sea; the Battleground's Signpost with two paths and works by year; rivers in Erebus and Duat; the black train from Malfeas and the Scar; Enoch's five spires and Labyrinth gate; Ti Yu at Yomi's heart; Phoebe and the Wyrm Reaches in the Aetherial Realm; Wolfhome's Town; walled Chantries and Amenti; Labyrinth debris; every Digital Web and Autochthonia sector joined; labels kept inside the map. The Shadowlands reflection keeps only the newest pulled-down house on each spot (178 relics to 66 in the 1960 sample). A new harness test checks each realm against its description.

## 2026-11-11: present-day buildings from Cataclysm's layouts (B666, B667)
Ben approved the first group of building types from the Cataclysm: Dark Days Ahead review (https://claude.ai/artifact/QQjdofxZQKFhsBW8TEWtvL) and asked for its building code to be used where it helps. tools/mapgen/cdda.py reads Cataclysm's map data (one character a metre, 24 to a tile, with palettes) and turns a layout into a WoDX building type: rooms cut into rectangles, inner walls, doors and windows, a traced outline for buildings that are not boxes, and the squares each piece of furniture stands on. 21 layouts convert: two banks, a bar, two libraries, a funeral home, a museum, an art gallery, three police stations, two churches, a country church, a synagogue, a cathedral, a warehouse, two music clubs, a hospital and a sewer pumping station. tools/mapgen/cddatypes.py loads them (cdda_types.json) and furnishes them with Tyger's modern pieces. Towns grown to 1960 or later get a police station, bank, library, bar, funeral home, warehouse and pumping station, and some get a music club, museum, gallery or hospital. The layouts keep Cataclysm's CC BY-SA 3.0 licence; the credit is in each type and in tools/mapgen/CDDA-CREDIT.md. A new harness test checks the credit, that every door and window is on a wall, that each type furnishes, and that a 2005 town has them.

## 2026-11-11: older forms of hospitals, gaols, banks and the rest (B668)
19 older forms of the first group's kinds, drawn from Moravian models (tools/mapgen/firstgroup.py), from the lazar house and charnel house of the Dark Ages to the grand hotel and dance hall of the 1870s and 1880s. Towns grown through the eras put each up once and keep it; a 1900 small town now has its gaol, lazar house, general hospital, cemetery chapel, savings bank, gendarmerie, coffeehouse and the like. The plans page shows them with their era. A new harness test checks they furnish and that a 1900 town has them.
## 2026-11-11: one effect keyword roster (WoDX Actions 3.30.0, B781)
- Ben approved the keyword coverage review. effects-rules.js KEYWORDS: 34 keywords (15 new), POOLS, BOOSTS, KINDS, resistOf, passive.
- Widened Harm, Charge or Drain, Mend, Ward, Fear, Sway; the Cast window gains the matching options and choice lists; Undo restores a pool.
- Ten Dark Ages rotes and six path powers carry their keyword (still the Storyteller's call).
- Page check queued: /mnt/project-files/jobs/keyword-roster-book-check-2026-11-11.md (122 Dark Ages powers, then eight lines' power lists).


## 2026-11-11: map keywords for realm maps (B745)
Ben found the realms too alike and asked for map keywords. Otherworlds 0.11.0: 22 keywords (forest, marsh, peaks, caves, sea, ash, ice, chasm, stars, ruins, towers, machines, web, tombs, gardens, fire, rot, storm, shifting, nihil, bones, crystal), each a cell step and a drawn mark; every realm has two to four; island form, caverns and a square city follow from the keywords; the age and some eras add keywords; an Extra keywords field in the Realm maps window, kept on the scene for redraws; the scene note lists them. Five new harness tests (realms sharing keywords share marks, unrelated ones share none, other seeds differ).

## 2026-11-11: a layout of its own for every realm (B746)
Ben asked for every realm to have a unique layout that captures its essence, each reviewed on a desk. Otherworlds 0.12.0: scripts/realm-layouts.mjs with 31 layouts (moon-rim, fae-threshold, cruel-yards, dream-patchwork, crucible-bowl, flux-shards, saga-hill, primordial, rail-yards, garden-basin, hedgerow-country, abyss-edge, horizon-estate, mirror-shade, canal-plain, nested-riddle, etherspace, circuit, storm-sea, worm-tunnels, afterlife-isles, coast-necropolis, first-city, storyland, inward-spiral, hell-courts, imperial-grid, river-journey, chained-pit, sorrow-isle, neon-grid); a layout can fix where named landmarks stand, place both exits and seal unreachable ground. Realm Layout Desk: 32 approved first time, CyberRealm and Stygia reworked from Ben's notes, then all approved. New harness test: every realm's layout is its own and every non-hazard region is reachable from the arrival.

## 2026-11-11: fights that start by themselves (B807-B810)
Ben asked whether combat could begin by itself when conditions are met. Combat 3.9.0: one fight starter (start.js, start-rules.js), world settings "Start fights by themselves" (Off, Suggest by default, Auto with Undo; Light touch holds it at Suggest) and "A hostile NPC sees this far" (30 yards, a third at night); it joins a running fight or starts one, with the NPC's household within call; frenzy outside a fight and attacks outside a fight call it. NPC 0.15.0: fight-rules.mjs; Hostile or Hunted NPCs on sight and guards on alarm (same noticing roll as Reaction regions), an attitude that falls to Hostile, a Reaction region's Fight (carried out in Auto when fights start by themselves); api kinNear. Chronicle 0.18.1: the "fight" outcome for doors, regions and dated events. Harness fight-start.test.mjs (9). Gate tools/gate/gatefight.mjs (11 steps) queued for the PC. Off on Live until Ben says. The V20 p. 274 ambush rule waits for a book check.
## 2026-11-11: the Storyteller's effect and saved rituals (WoDX Actions 3.31.0, B782)
- Token tools button "Apply an effect or ritual" (Storyteller only): any keyword, strength, length, area, options, casting time, note; card applies with Undo.
- Summon places tokens of a chosen actor where the Storyteller clicks; Make gives a chosen item; Undo deletes both.
- Rituals saved by name in the world setting stRituals; api.effects.storyteller, rituals, saveRitual, forgetRitual, stItems.


## 2026-11-11: failed layouts, the hospital, cellars and upper floors (B669)
Five more Cataclysm layouts convert (bar, motel, mansion, two empty warehouses; 26 in all), with the converter now reading nested rooms, palettes beside their maps and turned tiles. Towns that cannot fit the hospital clear houses for it, or put up a hospital entrance whose region names its own map. ddsite.py gains --kind building (any type on its own grounds) and --kind floors (every level of a building as its own map, stair in one spot, index file). A harness test furnishes every level of every building type and checks the stair lines up.
## 2026-11-11: keywords for the modern lines' powers (WoDX Actions 3.32.0, B783)
- power-keywords-lines.js: 837 powers across V20, W20, C20, Hunter, Demon, Mummy and Orpheus name their effect keywords.
- keywordsOf takes a name or slug for these sets; new api.effects.powersWith and lineSets. Test added in effects.test.mjs.
- Still open: Kindred of the East (unreadable scan), 85 Demon Lore powers whose names the scan cut short.
- book-rituals.js (B784): 314 documented rituals and rites from V20, V20 Dark Ages, W20, Dark Ages: Werewolf and Mummy fill the Storyteller's effect window from a searchable list; api.effects.bookRituals and bookRitual.
- Gate step 16 reads the unlinked token's own actor for Make; UI fit now opens the "Apply an effect or ritual" window.

## 2026-11-11: fight on sight reads where tokens stand (NPC 0.15.1)
gatefight on the testbed: 9/11, the Suggest card on sight never came. The sight check ran 0.9 s after a move and read the token as drawn, still walking from 38 yards off, so the guard was out of range. It now reads the document's resting place for range and walls, and watchFoes returns why each pair was skipped (the gate records it). Ambush book check (PC): V20 printed p. 274 (pdf 282), Dexterity + Stealth against Perception + Alertness, a win gives one free attack with the extra successes as dice, a tie lets the ambusher go first but the target may defend, anyone already fighting cannot be ambushed; V20 Dark Ages printed p. 345, the same roll, a win gives one free action the target cannot oppose, no margin bonus. Not built yet.
## 2026-11-11: Games by Hyper ideas (Storyteller 0.25.0, NPC 0.16.0, Interactables 0.24.0)
- Reviewed the Games by Hyper template docs for ideas. Two of the six picks were already built (Atmosphere's weather by season and era; place alarms carried by era), so those became a link (hardship follows the sky, B840) and nothing.
- Standing that spills over (B841), calls to passers-by (B842), a clue's first look fills the codex (B843), bodies left behind (B844). All house rules, all off by default.
- Harness: passing-world.test.mjs.
## WoDX NPC 0.17.0: founding factions in play (2026-11-11)
- Found from its members (Storyteller, Factions window) and Found a faction (players, the Factions button on the token tools): dots pooled from the founders' own Backgrounds (B831). Players' requests go to the approval queue.
- Player-run factions: owners, and orders for each turn from the players (B835).
- Splits of strained factions at a turn (B833); End and Fold into another (B832); founding and ending years, rising or ending with a dated event, and new powers offered by six events (B834).
- Spheres and kinds of faction by age, 1197 to the Future Darkness (B830).
- New harness test faction-founding.test.mjs.

## 2026-11-11: Item descriptions and Examine (Library 0.7.0, B607-B608)

Ben asked for examination and descriptions on items, as in Cataclysm DDA. All 797 goods have descriptions (data/goods-text.mjs, 21 with a later wording), filled into an item's description as it is made. Item sheets get Examine (description and facts) and Look closer (Perception + the category's Ability, difficulty 6; findings by successes, false, stolen, worn and uncanny from the Storyteller's Examine notes). The Item Review Desk shows each description and what a closer look finds. Tests examine.test.mjs.

## 2026-11-11: Plain item names, details on a closer look (Library 0.7.1, B609)

Ben asked that names and descriptions say only what a thing is. 67 goods renamed with their ids kept; origins and hidden features moved into per-good details opened by Look closer. The desk shows each good's details and its old name.
## 2026-11-11: ownership, holdings, recipes and buildings (WoDX Storyteller 0.27.0, Interactables 0.24.2, B850-B856)

Ben approved the ownership proposal (all five parts). Numbered 0.27.0 because main took 0.25.0 (hardship weather, bodies) and the markets branch 0.26.0. Built on the markets branch, since it needs the goods list and the purse.
- owner-rules.mjs: owner records, stolen marks, name matching for older place tags, Moravian holding forms by year, the right to trade.
- craft-rules.mjs: a recipe for any good in the year, materials, quality. build-rules.mjs: 41 kinds of building, methods and stages, worth, upkeep, income, kit keys.
- owners.mjs: theft marks from wodxItemsTaken, holdings and pay day, Make something, Put up a building, finished buildings as Regions (and kit scenes), workshops feeding markets, faction builds through the approval queue. Toolbar button "Property and building"; api.owners.
- tasks: a build task's stages and stage costs (Undo puts the purse and the place back); a recipe's quality on the item.
- Chronicle 0.18.2: Property and building is in the list of player buttons the Storyteller can hide.
- Interactables: sends wodxItemsTaken after a take; the Interact window marks what is yours or someone's.
- Tests: ownership.test.mjs (rules, every era), ownership-foundry.test.mjs (the Foundry side on stand-ins).
- Still to do: the building kit maps (a PC job: one map per kit key, exported from Dungeondraft and imported as scenes flagged wodx-storyteller.kit).

## 2026-11-11: Description folds in Possessions (Sheets 0.8.2, B610)

The Possessions tab shows each item's description in a fold under its row, closed by default, opened with an info button by the name.
## 2026-11-11: the ambush (B836)
Ben asked for the ambush rule, then a Live release. Combat 3.11.0: ambush-rules.js; the attack dialog and the quick attack roll the ambush first when the attacker is sneaking, Obfuscated or hidden and neither side is fighting (V20 p. 274; V20 Dark Ages p. 345 before 1450). Harness ambush.test.mjs (4). gatefight step 12.

## 2026-11-11: Dungeondraft to Foundry in one click
Ben asked for one-click mapmaking with our Dungeondraft assets and chose a Dungeondraft mod plus a PC watcher. tools/ddmod/: the WoDX Export mod (export this map, or every map in its folder, as Universal VTT at 100 px a square), wodx-watch.ps1 (stages each new export under Data\wodx-maps and runs the import), and tools/gate/mapimport.mjs (scene, walls, doors, lights, then Adopt, rothenstein-wodx only). Universal VTT, not PNG, because the WoDX file holds openings but not plain walls. New harness test mapimport.test.mjs. The mod is untried in Dungeondraft yet.

## 2026-11-11: trait effects, step 3 (Chronicle 0.19.0, Senses 0.6.0, Actions 3.32.1, B880-B882)
- Chronicle: data/trait-effects.mjs SHOWS, SENSE_LOSS, SENSE_CHANNELS; trait-rules.mjs senseEffects, showsOf, SENSE_TAGS; api.traits.senses and api.traits.shows; timed.mjs keeps o.data on the effect.
- Senses: traitsOf reads traitSenses; powersFor returns traitMods and cannot; difficulty adds signed trait steps and returns lost for Blind or Deaf; gatherSources adds each visible token's signs and the veiled source; channels restless and deathsight (data/world.json).
- Actions: effects.js passes a Veil's difficulty to the timed effect.
- Tests: trait-senses.test.mjs (5). Gate: gatetraits steps 14 and 15.

## 2026-11-11: trait effects, step 4 (Actions 3.34.0, B883)
- power-effects.js: powerKeywords (data set, then line list by name), powerOutcomes (successes as strength, NEEDS_TARGET dropped with no target, ON_SELF on the user).
- effects.js powerPlan (through planOf and the card's routing); setting powerEffects; api.effects.powerPlan.
- kindred.js: Discipline rolls without a path spec; garou.js: Gift rolls (DA:W library, else W20 by name).
- Tests: power-effects.test.mjs (5). Gate: gatetraits step 16.

## 2026-11-11: The approved era timelines agree with each other
Ben approved all 291 timeline cards and asked for a deconfliction. docs/research/era-timelines/deconflict.py reads every card beside the others on the same subject and the dated tables in Chronicle, Otherworlds and NPC, and writes timeline-approved-2026-11-11.json (289 cards: 5 edited, 2 dropped). Encyclopaedia: the Fragile Path entry loses its 1330 start for the Ascension War, the Lupine War entry gets a WoDX note on Lodin, the Anacreon revolts date is reworded (Library 0.7.2). Rivalries: Anarch Revolt 1381-1492, Accordance War 1969-1973 (NPC 0.18.2). Report DECONFLICT-2026-11-11.md; decision B861.

## 2026-11-11: trait effects, step 5 (Chronicle 0.20.0, NPC 0.19.0, Actions 3.34.0, B884-B885)
- Chronicle: ATTITUDE in data/trait-effects.mjs; trait-rules.mjs attitudeSeed; api.traits.attitudeSeed(character, npc).
- NPC: attitude.mjs seedFor moves the seed by the traits (attitude-rules.mjs withTraits); main.mjs state.self.afraid and a flee option.
- Actions: effects.js applyItem wraps applyCore and records an attitude change for Sway and Fear (power-effects.js moodDelta); undo puts it back.
- Tests: trait-attitude.test.mjs (4). Gate: gatetraits step 17.

## 2026-11-11: trait effects, step 6 (Actions 3.35.0, Chronicle 0.21.0, B886)
- trait-hooks.js: holds, luckyLeft, useLucky, luckyHtml, digestionBonus, bloodCostMult, sleepMods, preyNote.
- main.js: Lucky in resolveAction (action and quick check), feedResolve (Efficient Digestion, Prey Exclusion), resolveSpend (Thin Blood), daytime (Deep and Light Sleeper; the daytime flag's uncapped).
- Chronicle: HANDLED; describe lists every way a trait is carried out.
- Tests: trait-pools.test.mjs (4). Gate: gatetraits step 18.
## 2026-11-11: bug check of the finished work
Ben asked for a bug check of everything done so far. The harness passed 1,286 of 1,286 on main d8933e8. Two gate faults traced to one cause: Foundry 14 can hand back a batch of new actors out of order, so gatefight sometimes set the guard's attitude on the wrong actor (the "attitude 0 on a cold start" fault), and gaterivals sometimes gave the wolf's kind to the leech (the "fails after gateeffects" fault). Nine gates now match new actors to their data by name (createActors), gateoworld does the same for its two scenes, and gateeffects finds its Move token by name. The play code never makes actors in a batch like that, so Live is not affected. One real bug found on the way: a Mage Move and its Undo used a plain x/y update, which Foundry 14 stops at walls. Actions 3.35.1 jumps the token with a "displace" move and keeps the plain update as a fallback. New harness checks cover both.

## 2026-11-11: Dealing with NPCs, part C: trade (Actions 3.36.0)

"With this person" gains Trade once WoDX Storyteller's money is on (B895-B897). Buy, sell or barter with the NPC at the prices the era goods list and the local market give; a trader sells from the shop container their market lists, anyone else from what they carry, and the NPC's purse is the till. A haggle roll (Manipulation + Finance, Commerce in the Dark Ages, difficulty 6) moves the price a tenth per success, up to three tenths. Hostile NPCs refuse; distrusted ones deal a tenth worse. Lifted things carry a stolen mark and fetch the fence's price. Social and trade cards now add a stock line from WoDX NPC, coloured by attitude. New trade-rules.js and trade.js; harness trade.test.mjs; gatesocial step 10 buys a good and sells it back.

## 2026-11-11: trait effects, step 7 (Chronicle 0.22.0, Actions 3.37.0, Storyteller 0.29.0, Interactables 0.25.0, B887)
- Chronicle data: TRIGGERS, PULLS, LEDGER, PROMPTS. trait-rules: bracketWords, triggersOf, triggered, pullsOf, ledgerOf, promptsOn; describe names them. traits.mjs: triggers, pulls, ledgerFor, prompt (queue type wodx-chronicle.traitPrompt), listens to wodxSocial and wodxFightStarted.
- Interactables: labelsOnPath (tile titles, region names), traitTriggers in onTokenMoved (holds a player's move; option wodxHeld), setting traitTriggers.
- Storyteller: night pulls (seeded per character), the aid for Oracular Ability, night prompts on approval; Ledger syncTraits (setting ledgerTraits remembers ids).
- Actions: feeding prompt.
- docs/HOOKS.md: wodxSocial and wodxFightStarted now heard. Tests: trait-moments.test.mjs (6). Gate: gatetraits step 19.


## 2026-11-11: trait effects, step 8 (Chronicle 0.23.0, B888)
- data BG_WORLD; trait-rules worldPlan, describe names it for backgrounds. New scripts/bg-world.mjs (madeOf, plan, makeReal: People through WoDX Creation, attitude through WoDX NPC, regions owned through WoDX Storyteller). Trait effects window: Make them real button.
- Tests: trait-world.test.mjs (4). Gate: gatetraits step 20.

## 2026-11-11: trait effects, step 9 (Storyteller 0.30.0, B889)
- codex-rules: needsOf, knowsEnough, bareName; codex.mjs: dotsOf, the Reveal dialog ticks those who know enough.
- hardship-rules: weatherDice; hardship.mjs rolls Stamina + Survival against the weather.
- Tests: passive-hooks.test.mjs (2). Gate: gatetraits step 21.

## 2026-11-11: trait effects, step 10 (Actions 3.38.0, Otherworlds 0.13.0, B890)
- effects-rules: outcome kinds for shape (timed), sideways (cross), summon (count from strength), make (give, a named thing), weather (WEATHER_SET).
- effects.js: applyCore cases cross and weather, Summon and Make ask the Storyteller when the card did not say, a queued Move asks for its spot; choose and askText dialogs; undo for crossings and weather; the approval handler posts a card with Undo.
- Otherworlds crossing.mjs: sendAcross, on the API.
- Tests: queue-keywords.test.mjs (2). Gate: gatetraits step 22.

## 2026-11-11: trait effects, step 11 (Chronicle 0.24.0, B891)
- New data/trait-lines.mjs: LINE_BOOKS, WIDEN, LINE_MERITS_FLAWS (335 rows), made from trait-book-checks.md and notes/trait-effects-draft.md. trait-effects.mjs joins them and widens shared V20 entries; BOOKS_DONE lists the books.
- Tests: trait-lines.test.mjs (2). Gate: gatetraits step 23.

## 2026-11-11: chases and pursuit (Interactables 0.26.0, B910-B915)
- Master Plan, Lines and eras that meet: chases and pursuit (priority 2, with Interactables).
- New scripts/chase-rules.mjs (pure): WAYS by year, GROUNDS, speedOf, edge, headStart, rollFor, newChase, playTurn, standing, crash and thrown dice.
- New scripts/chase.mjs: the Chase window (setup: quarry, pursuers with a search box, ground, lead measured or typed, night; each turn: ground, way and flat out per racer, breaking sight), the turn cards (players in words, the Storyteller's with dice, totals, Undo, damage, Start a fight), the state in the scene flag wodx-interactables.chase, the hook wodxChase. A token at the reins of a mount tile starts on it. Running speed from WoDX Combat's movementFor.
- In the Storyteller's hand as "A chase"; API game.modules.get("wodx-interactables").api.chase.
- Tests: chase.test.mjs (13). Gate: tools/gate/gatechase.mjs.

## 2026-11-11: chases follow the book check (Interactables 0.26.1)
- From /mnt/project-files/chase-book-check.md: refs narrowed (V20 core pr 261-262, V20 Dark Ages pr 335); keeping sight is the Storyteller's Perception call at +1 a success of lead (the Stealth roll is gone); a pursuer's botch loses the quarry; cars and motorcycles get safe and top speeds and a Maneuver cap by year (V20 chart from 1990); crashes and falls from the saddle roll as falling (pr 296); Garou forms change running speed (W20 pr 269); a rider who catches someone gets charge dice (V20 Dark Ages pr 398). B910-B915 rewritten.
- Tests: chase.test.mjs (14).

## 2026-11-11: fuller rooms on generated maps
Ben found the burgher palace too bare. ddcore.dress() now dresses every furnished room after its furniture: pieces along the walls and in the corners (about one per 4 squares, by what the room is for), a rug under the open middle of living rooms, studies and bedrooms, small things on every table and desk, a lit sconce on a wall and a chandelier in big rooms, plants and a bench in courts. Each lamp is also a Dungeondraft light, written as Dungeondraft writes one. Dressing has its own random generator and stays out of room.items, so the furniture, the WoDX files and the town samples do not change. Building maps re-emitted (burgher palace ground 32 to 78 objects, 8 lights).

## 2026-11-11: which way things face
Ben saw chairs facing random ways and the hearth facing its wall. ddcore.orient() turns every piece after dressing. Seats face their nearest table, or else the middle of the room, in quarter turns. Pieces against a wall (beds, ovens, shelves, cupboards, mirrors) put their backs to it, keeping their footprint. Ovens, whose picture is half their 2 by 2 square deep, are moved flush to their wall. Only the pictures move: the WoDX files mark the same spots, and town features keep their footprint turn.
## 2026-11-12: animals with their own ways (WoDX NPC 0.21.0)
Ben approved the NPC behaviour archetypes brainstorm and asked for animals first. animal-rules.mjs holds 16 animals, each with a temperament, a ready routine by day, night and season, the kinds of place it belongs in and the years it is found there in Moravia. The fight scorer and the reactions read three new traits (herd, territory, hunger) and four new tactics (swarm, scatter, scavenge, stalk). Animals shy from wraiths but not from Kindred, by Ben's ruling. Passers-by animals pick up their archetype from the token flag; other beasts from a flag or their name. PLACE_KINDS gains alley, yard, docks, park, sewer, hospital and station; routine blocks can name months. Decisions B1000 to B1004.
- Tests: animals.test.mjs (13).

## 2026-11-12: feeding harms the vessel; clan and bloodline feeding rules (Actions 3.41.0, Creation 0.10.2, B960-B965)
- New feeding-rules.js: bloodNow, available, kissDamage, vesselOutcome, parseTags, matchTags, preyExclusionTags, CLAN_FEEDING, clanKey, ruleFor, isDarkAgesFeeding, nourishment, lamiaDifficulty, addictionDifficulty, fleshPoints, nightPassed, fleshEaten, PALATE_BREADTH, HUNT_STYLES, styleAllowed, styleClash.
- main.js: feed and feedResolve rewritten around the vessel's own blood (flag vesselBlood), damage, states and Undo (feedUndo, on the api); feedingRule, vesselTagsOf, feedingFields, savePalate, nagarajaPenalty; Hunt's usual hunt and palate difficulty; New Night flesh debt; a vampire's blow marks the target as fought; oathStep firstDouble.
- social.js: Seduction's Feed passes the vessel as willing. Creation: recordDrink step, giveVitae firstDouble.
- Fixed: mortal vessels read the sheet's blood pool, which starts at 0 on mortal sheets and nothing fills in, so a targeted mortal gave no blood unless it was set by hand; effects.test pinned the api version to 3.38.0.
- Tests: feeding.test.mjs (20).

## 2026-11-12: criminals, combatants and townsfolk (WoDX NPC 0.23.0)
The second step of the archetypes Ben approved. mortal-rules.mjs holds 39 mortal archetypes by era with their own hours. Morale breaks a line whose leader falls or half of which is down; cover, formation, surrender and hostage join the tactics; and some townsfolk tell someone later what they saw, putting the place on alarm two hours on. Decisions B1005 to B1008.
- Tests: mortals.test.mjs (9).

## 2026-11-12: supernatural NPCs by line (WoDX NPC 0.24.0)
The last step of the archetypes Ben approved. supernatural-rules.mjs holds 29 archetypes under the line templates, chosen by clan, tribe, kith, Tradition, legion or creed, each where and when it belongs. Orpheus crews only in the Future Darkness and Kuei-jin only in Asia, by Ben's rulings. A Marauder's madness picks its moves. Decisions B1009 to B1011.
- Tests: supernaturals.test.mjs (8).

## 2026-11-12: animal blood from the book (WoDX NPC 0.24.1)

The PC book check of the V20 core animals appendix (pdf 396-399, printed 388-391) set the blood pools: horse 5 to 4, farm pigs 5 to 4, boar 3 to 4, crows 1/4 to 1/2. V20 lists no cattle, sheep, goats or geese, so these are house rules in PENDING-REVIEW: cattle 5, sheep and goats 3, geese and hens 1/2. A harness test pins every value. The testbed gate passed at 5cf4328 (gateanimals 5/5, gate7c 23/23).

## 2026-11-12: recipes for food, drink, medicine and drugs
Ben asked for recipes after Cataclysm: Dark Days Ahead and approved the design with all four recommendations. Library 0.10.0 adds data/recipes.mjs (60 methods, 50 ingredient groups, 10 kits by era) and scripts/recipe-rules.mjs; 11 raw goods and middle products join goods.mjs. Storyteller 0.31.0 adds Cook, brew or mix (cookery.mjs): the window lists what a character can make in the year, greyed with what is missing (know-how, kit, ingredients), with a batch size, buying what is missing, and for the Storyteller the kits a scene has and teaching a recipe. Everyday food is made at once with no roll when the pool is enough; the rest runs as a long task. Things with a wait stand under a name like "ale (fermenting)" until the clock reaches the ready time. Made drugs and medicine carry a strength that Library's Use reports when taken; a botch makes them impure. "Cook with it" on an ingredient opens the window on the recipes that use it. Food, drink, medicine and drugs left Make something for this window. B947-B952. Test tools/harness/recipes.test.mjs.

## 2026-11-12: clan features, Vampire first
Ben approved the Splat Features Desk: a feature of its own for every clan, tribe, auspice, Tradition, kith, guild, Amenti, House, Dharma and shade. Chronicle 0.25.0 adds the table (data/signatures.mjs), the pure rules (signature-rules.mjs) and the Foundry side (signatures.mjs) for four clans: the Toreador Muse, the Setite Corruption ledger, the Brujah Cause and the Gangrel marks. Cards carry an Undo for the Storyteller; a player's move on someone else's sheet waits in the approval queue. Harness test signatures.test.mjs. Decisions B1120 to B1124. The other clans and lines follow.


## 2026-11-12: four more clans
Chronicle 0.27.0 adds the Tzimisce's native soil (a night without it halves every pool), the Lasombra's empty frame (cameras of the era, a house rule), the Ravnos vice (one Self-Control prompt a night, the pull rising with weeks unfed and a long stay) and the Caitiff's odd gifts (a thin-blooded Caitiff rolls once a year). Decisions B1126 to B1129. Harness signatures.test.mjs 12 tests; gate gatesigs adds steps 10 to 13.

## 2026-11-12: taking things apart for parts
From the item-links study (Ben approved all): Library 0.13.0 adds SALVAGE rules to data/recipes.mjs and salvageOf, apartTool and successes to recipe-rules.mjs; Use offers "Take apart for parts" on the 155 goods that have parts. Storyteller 0.34.0 cookery.takeApart rolls Dexterity + Crafts (Technology for electronics), takes one of the thing and gives its parts by era. B953. Tests in recipes.test.mjs; gatecook step 8.

## 2026-11-12: Nosferatu, Tremere, Ventrue, Assamite, Giovanni
Chronicle 0.28.0 adds five clan features:
- the Nosferatu's true-face breach card and pages of secrets that go stale at the speed of the age
- the Tremere Pyramid, with orders that cost Willpower to refuse
- Ventrue influence in place of a month's income
- Assamite contracts with standing and a tithe
- the Giovanni's bound wraiths

Clan feature cards can now carry a button (breach, boon, refuse) beside Undo. A Ravnos vice and a Nosferatu face now fire on the player's own client, where social and trade acts happen. Decisions B1150 to B1154. Harness signatures.test.mjs: 17 tests. The gatesigs gate has 18 steps.

## 2026-11-12: bloodlines and Laibon legacies
Chronicle 0.29.0 gives 27 bloodlines, castes and Laibon legacies a feature of their own. Each one uses roll effects, a Masquerade sign card, or a clan engine borrowed through the row's "also" list. Decisions B1155 to B1157. Harness signatures.test.mjs: 19 tests. gatesigs: 19 steps.

## 2026-11-12: ghouls and revenant families
Chronicle 0.30.0 adds ghouls and revenant families. A ghoul loses a blood point for each month without vitae. The Bratovitch, Grimaldi, Obertus and Zantosa families have rows, and new families can be founded in play: the Storyteller approves them, and they are kept in the sigFamilies setting. Decisions B1158 and B1159. Harness signatures.test.mjs: 21 tests. gatesigs: 20 steps.
## 2026-11-12: Wraith features (Chronicle 0.35.0)
Chronicle 0.35.0 builds the Wraith part of the Splat Features Desk. The sixteen Guilds, the eight legions and five factions of the dead get rows. The sheet has no field for them, so they are picked in the feature window, and the legion is suggested by the manner of death. The rows borrow engines already built: the riddle of the next event, leverage and the mad ear. The Emerald luck is new. Decisions B1504 to B1506. Gate tools/gate/gatedead.mjs, 7 steps. The harness passes. Not on Live.
## 2026-11-12: Changeling features (Chronicle 0.34.0)
Chronicle 0.34.0 builds the Changeling part of the Splat Features Desk. A changeling stacks a kith, a seeming, a court and a sidhe House row. The system's whole kith list is covered, the Hsien included. The new engines are revels, the Pooka's truth, the Selkie's coat and the court in power by the season; oaths reuse the Hippolyta engine. The release also fixes a Werewolf bug: a Fianna Galliard got no Wisdom for a tale (testbed gatewolf step 9). Decisions B1500 to B1503. Gate tools/gate/gatefae.mjs, 9 steps. The harness passes. Not on Live.
## 2026-11-12: Mage features (Chronicle 0.33.0)
Chronicle 0.33.0 builds the Mage part of the Splat Features Desk. Every Tradition, Craft and Convention has a row, along with the Order of Reason's conventions, the Hermetic Houses, the sorcerers, the Marauders and the Nephandi. Each row shows the group's old name for the year. The new engines are the Akashic dawn, the Euthanatos Good Death and Jhor, certámen, Hippolyta oaths and the Watchers of the New World Order; other groups borrow engines already built. Decisions B1165 to B1167. Gate tools/gate/gatemage.mjs, 11 steps. The harness passes. Not on Live.
## 2026-11-12: Werewolf features (Chronicle 0.31.0)
Chronicle 0.31.0 builds the Werewolf part of the Splat Features Desk. A Garou stacks a tribe, an auspice and a breed row, and the other Changing Breeds, Kinfolk, the lost tribes and the Beast Courts get rows too. The new engines are the Black Fury's guarded place, the Child of Gaia's truce, Shadow Lord leverage, the Stargazer's sky reading, tales and scars for Renown, Philodox and Nagah rulings, the Ahroun first against the Wyrm, metis deformities and harm to Kinfolk. Signature roll effects now reach the dice through the traits api. Decisions B1160 to B1164. Gate tools/gate/gatewolf.mjs, 13 steps. The harness passes. Not on Live.
## 2026-11-12: Lifepaths for every line and splat (Creation 0.11.0, Storyteller 0.34.1)
Improvement Desk cr1. A Lifepath button on every owned character sheet and in the Creation window opens a step-by-step wizard: birth, youth and adult life in one of fourteen era bands (1197 to the World of Future Darkness, with the plague years, the Hussite wars, the White Mountain, Austerlitz, 1848, both world wars, 1948, 1968, 1989 and the arcologies), then the turn into the line, a scene for the splat (281 of them, across all twelve lines and mortals) and the first years after. Choices set flags that weight, rule out or name the next scene, as Princes of Darkness chains its education events. The end screen keeps or drops each suggestion and makes ticked people into NPCs. The lifepath rides through a change of state and appears in the Storyteller's prelude journal. Decisions B1310 to B1313. Harness lifepaths.test.mjs (12 tests) and lifepath-app.test.mjs (2).


## 2026-11-12: rolls and fights at the table

From Ben's Improvement Desk picks a1, a2, t1, cb1, cb2 and se1 (B1300 to B1330, and B1340). WoDX Actions 3.43.0: the odds before a roll, worked out exactly from the roller's own rules, with each modifier named; pinned and lately used actions on the character. WoDX Targeting 0.2.0: area shapes drawn on the map, and whoever stands inside suggested. WoDX Combat 3.14.0: the after-action card and the Use the room button. WoDX Interactables 0.27.0: lamps knocked over, chandeliers brought down, curtains and windows that let the sun in, sprinklers, each with Undo. WoDX Senses 0.7.0 and Otherworlds 0.13.1: colour-blind safe rings and words with every colour. Harness: tools/harness/table-fights.test.mjs. Gate: tools/gate/gatetable.mjs.
## 2026-11-12: how NPCs read a character's look
Library 0.14.0 adds the look (look-rules.mjs, look.mjs, api.look). It covers station from worn dress by era, dress out of its time, blood, wounds, filth, a drawn weapon, Appearance, Status, sides shown by worn habits and uniforms, and disguises set in Examine notes. NPC 0.32.0 uses it at first meetings (held to 2, with traits to 3), as a scene-only step for blood at later meetings, for guards (blood alarms, a worn livery passes) and for sides worn openly. Chronicle 0.32.0 adds the "Only when" tests dressed, wears, station, out of time, bloody, disguised and seen through. Actions 3.44.0 adds Pass as someone else and quality prices in trade. Storyteller 0.36.0 finds made things by name with their quality tag and records the maker. Decisions B1400 to B1407. Harness look.test.mjs and made-quality.test.mjs: 15 tests. Design doc: https://claude.ai/artifact/WkMTJvYu77gpYukQ9cHchM


## 2026-11-12: testbed fixes for the table and fight groups

The testbed gate (gatetable 6/9 on 752ca8b) found two code faults and one gate fault. WoDX Actions 3.45.1: the odds line was put into the form beside a field that sits in the window's content box, so it never showed; it now goes beside the field. WoDX Combat 3.15.1: the after-action card's start snapshots were stored under actor ids, whose dot Foundry splits into nested flags, so the card read "?: took NaN levels"; they are kept as pairs now, and written only when a fighter is new. WoDX Targeting 0.2.1: no area preview without PIXI. The gate's area step uses the area tag a.v:b3. Harness 1529 pass, 0 fail (mapgen left out, as before).
## 2026-11-12: what a character can tell about a stranger
NPC 0.34.0 builds a stranger line for unmet NPCs' nameplates from their look, routine and manner. Actions 3.46.0 adds Look them over and Ask around about them to With this person. Library 0.15.0 lets players dress as someone else in their own clothes. Decisions B1408 to B1411. Harness stranger.test.mjs: 4 tests.
## 2026-11-12: the Legends book
From the Improvement Desk (item c1, Ben approved as described): WoDX Chronicle 0.36.0 adds the Legends book, a journal "Legends of the Chronicle" open to everyone, one page per century, and a Legends window (a book button with the token tools, hideable per player) that filters by kind, person, place, faction and years. Written from dated events, actors' chronology and lineage, Creation's archive, NPC court seats, Storyteller owner records and the Ledger, when a session ends, around time skips and on demand. B1700 to B1702. Harness legends.test.mjs 9 tests; gate gatelegends.

## 2026-11-12: progress clocks, the pacing note and spirit standing
From the Improvement Desk (Ben approved s1, s2 as the lighter version, and o1). WoDX Storyteller 0.39.0: progress clocks (a Clocks tool for everyone, a section on the dashboard) read from long tasks, heat, ties and the Ledger, plus the Storyteller's own clocks that fill by hand or each faction turn, session or week; the night's draw carries a pacing note for the Storyteller; a fight started by WoDX Combat goes in the log. WoDX Otherworlds 0.14.0: standing with the spirit courts, with a Spirits tool; WoDX Actions 3.49.0 applies it to summoning, rites and chiminage. B1710 to B1714 and B1720 to B1724. Harness clocks.test.mjs (7 tests) and spirits.test.mjs (6); gate gategroup6.
