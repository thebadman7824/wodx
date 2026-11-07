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
