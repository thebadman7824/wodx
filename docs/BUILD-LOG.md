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
- Tests: 5 new (2 rules, 3 runtime), 582 in all; UI fit adds a crag. Gate step 22 fixed, step 23 (a wall to a ledge, a short jump). Not deployed yet.

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
