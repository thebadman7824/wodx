# WoDX decisions (build log)

Decisions taken while building. The master plan's review table holds the design decisions; this file holds the build ones.

## Index of decision blocks

Each block of numbers, what it covers and the modules it touches. Take the next free block for new work and add its row here in the same change; the harness (tools/harness/decisions-index.test.mjs) fails if a decision falls outside every row, rows overlap or the next free block is already used.

Next free block: B2610

<!-- decision-index:start -->
| Block | Feature | Modules |
|---|---|---|
| B1-B99 | Phases 0 to 7c: the fork, eras and the clock, lineage, the Embrace, experience costs, search boxes, the turn conductor | System fork, Chronicle, Creation, Actions, Combat, NPC |
| B100-B107 | Phase 7d factions and 7e the open world | NPC, Storyteller |
| B108-B112 | Doors, locks and forcing | Interactables |
| B113-B115 | Targeting and common checks | Targeting, Actions |
| B116-B119 | Containers, traps, clues and light sources | Interactables |
| B120-B133 | Master Plan gap items: dated events, data versions, the archive of the dead, the Ledger, gear by era, death into a wraith, the Awakening | Chronicle, Creation, Storyteller, Library, Actions, Sheets |
| B150-B159 | Hiding places | Interactables |
| B160-B169 | Responsive maps | Interactables, NPC, Storyteller |
| B170-B179 | WoDX Senses | Senses |
| B200-B212 | Phase 8: weather, era kits, handouts, the night's draw, story aids, journeys, token frames | Atmosphere, Storyteller, Otherworlds |
| B240-B249 | Dark Ages: Mage Grimoire | Actions |
| B250-B287 | Phase 6 leftovers and the 9 November batch: feast days, living maps, state changes, the Near Dreaming, ageing, the codex, rumours, the Encyclopaedia | Chronicle, Interactables, Senses, Creation, Otherworlds, Atmosphere, Storyteller, Library |
| B310-B315 | Player immersion | Interactables, Senses, Chronicle, Storyteller, Atmosphere, NPC |
| B320-B331 | Between nights, money by era, consensus | Storyteller, Otherworlds, Actions |
| B340-B351 | Paperdoll tokens; moves out of turn (B351) | Paperdoll, Combat |
| B360-B363 | Serious faces | Paperdoll |
| B370-B387 | Long tasks, followers, hardship, lasting changes | Storyteller, Interactables, Actions, Paperdoll |
| B396-B401 | Paperdoll mouths, lips and grounds | Paperdoll |
| B402-B405 | Watch points, release checks, map adoption, container fill | Interactables, Chronicle |
| B430-B437 | The Storyteller's hand | Storyteller |
| B500-B509 | Rules that clash between lines; the Future Darkness branch | Chronicle, Actions |
| B520-B525 | Bites, the Delirium and blood of other lines | Actions |
| B570-B589 | Everyday goods and the town generator | Library, Interactables |
| B590-B599 | Era item lists, money and markets (B593 is used twice: item behaviour, Encyclopaedia dates) | Library, Interactables, Storyteller |
| B600-B610 | Sheet extras, containers, money by era, descriptions and Examine | Sheets, Library |
| B620-B632 | Only when, trigger regions, households, stock, mood regions, talk sheets | Interactables, NPC, Storyteller, Atmosphere |
| B650-B659 | Map generation: parts, era layers, landforms, building designs | Interactables |
| B660-B669 | Teleport, NPC topics and present-day layouts | Interactables, NPC |
| B670-B676 | NPC attitude and With this person | NPC, Actions, Chronicle |
| B700-B711 | Travel, routines by age, word and rumours | Storyteller, NPC |
| B730-B739 | Realm maps and Umbral twins | Otherworlds, Storyteller |
| B740-B746 | Stock talk; realm map keywords and layouts | NPC, Otherworlds |
| B760-B769 | The crossover referee, the anachronism check, Mage effect keywords | Chronicle, Sheets, Actions |
| B780-B799 | Lines and eras that meet, effect keywords for every line (block given to that thread) | Actions |
| B800-B810 | Trait effects; fights that start by themselves | Chronicle, Actions, Combat |
| B820-B826 | NPC rivalries | NPC, Combat |
| B830-B836 | Factions by age, founding, splitting; the ambush | NPC, Combat |
| B840-B844 | Hardship weather, standing, bodies left behind | Storyteller, NPC |
| B850-B856 | Owning things and places | Storyteller |
| B860-B861 | Hardship thresholds; clashing dated events | Storyteller, Chronicle |
| B880-B898 | Merits and flaws on the senses and in the world; trade and haggling | Senses, Actions, Chronicle, Storyteller |
| B905-B906 | Goods naming and the New Items Desk | Library |
| B910-B918 | Chases; things can be used | Interactables, Library, Sheets |
| B940-B947 | Ways of moving (B947 is used twice: ways of moving after the book check, recipes) | Combat, Actions |
| B948-B953 | Recipes and taking things apart | Library |
| B960-B965 | Feeding harm and clan feeding laws | Actions, Creation |
| B970-B975 | Passers-by | NPC |
| B980-B984 | Who an act startles | NPC, Actions |
| B1000-B1014 | Animal archetypes, mortal and supernatural NPC archetypes, how things work together | NPC, Library, Interactables |
| B1100-B1105 | Politics inside factions | NPC |
| B1110-B1116 | Polities for the other lines | NPC |
| B1120-B1131 | Signature features (vampire clans); item uses | Chronicle, Library |
| B1150-B1169 | Signature features: clans, bloodlines, Werewolf and Mage (block given to the splat features thread) | Chronicle |
| B1200-B1210 | The body plan | Combat, Sheets |
| B1300-B1302 | Area shapes, odds, pinned actions | Targeting, Actions |
| B1310-B1313 | Lifepaths | Storyteller |
| B1320-B1324 | Using the room in a fight | Interactables |
| B1330 | Colour-blind safe colours | Senses |
| B1340 | The after-action card | Combat |
| B1380-B1385 | What an NPC can tell of a character | NPC |
| B1400-B1411 | Made things' quality and the look | Library, NPC |
| B1500-B1529 | Signature features: Changeling, Wraith and the small lines; Masquerade, cities, story chains (block given to the splat features thread) | Chronicle, Storyteller |
| B1600-B1606 | Before the First Night | Creation |
| B1610-B1614 | The guided builder and the prelude runner | Creation |
| B1640-B1659 | The talk generator (grammar NPC talk with no AI model), who is speaking, mood, the Storyteller's grammar | NPC |
| B1700-B1702 | The Legends book | Chronicle |
| B1710-B1714 | Progress clocks | Storyteller |
| B1720-B1724 | Standing with the spirit courts | Otherworlds |
| B1800-B1804 | Followers taking orders | NPC |
| B1810-B1816 | Errands and helpers | NPC, Storyteller |
| B1820-B1827 | The Followers window; descriptions that spread and fade | NPC, Sheets, Library |
| B1900-B1908 | Relationships, secrets and the family tree | Sheets, NPC, Creation |
| B1960-B1970 | Game time | Chronicle, Storyteller, Combat, Otherworlds |
| B2100-B2116 | NPC voices: browser speech, Kokoro, the Chatterbox voice server, shared files from the token, plot NPCs and prewritten lines | Voices |
| B2200-B2219 | Battles and sieges (B2210 the book army from Spoils of War; B2211-B2216 factions at war by themselves) | Storyteller, NPC, Chronicle |
| B2220-B2226 | The crowd as a resource | Actions, NPC |
| B2300-B2307 | Lifepath threads as story chains; a guest in another prelude | Creation, Chronicle |
| B2310-B2313 | The case board and what a character could know | Interactables, Library |
| B2320-B2323 | The features card and what changed since last session | Sheets, Chronicle |
| B2330-B2349 | The country map behind a trip, paid rides, pace and day shelter; maps that take their land from it; warrens and sewers; wild land with no edge | Storyteller, map tools, Interactables, Otherworlds |
| B2350-B2359 | Battle deeds and what a battlefield leaves behind | Storyteller, Otherworlds, Chronicle |
| B2370-B2379 | The weekly market turn: making, recovery, trade links, seasons by era, skip catch-up, the queue and talk of dear goods | Storyteller |
| B2380-B2389 | The rest of the living economy: faction moves on markets (taxes, monopolies, smuggling, raids), traders going broke, caravans | Storyteller, Interactables |
| B2400-B2419 | The Lone Chronicle: playing alone with a hidden browser in the Storyteller's seat | Solo |
| B2420-B2429 | The anachronism check reads the maps | Sheets, Interactables |
| B2430-B2439 | Music from free sources: the sorter, where audio files live, the open credits journal | Atmosphere, tools |
| B2440-B2449 | The last of the ways of moving: riding in a fight, the mounted charge, a swimmer's load, senses by stance | Combat, Interactables, Senses, NPC |
| B2450-B2469 | Storyteller steps that run by themselves: automation levels, small-proposal rules, the Waiting tray, fights that end, time requests, the talk wait, targeting for everyone | Chronicle, Combat, NPC, Storyteller, Creation, Solo |
| B2470-B2479 | The campaign around a siege: foraging, keeping order, mines and countermines, siege engines, walls and forts | Storyteller |
| B2480-B2489 | Ships at sea: ships by the year, the chase, the turn for position, shooting, ramming, flooding, repair, boarding | Storyteller |
| B2490-B2499 | The layout pass: type names, the sheet title bar, panels and shades on WoDX sheet parts, item sheet fields, picks in WoDX windows, the wider UI fit check | System fork, Sheets, Chronicle |
| B2500-B2509 | The residents of a generated town: households made into people with routines, names and a household | NPC |
| B2510-B2519 | Seven prologue eras, World of Darkness era names, a world-wide prologue and 300 events each | Chronicle, Library, Storyteller, Actions, Interactables, Atmosphere |
| B2520-B2529 | The settlement generator: building types for the later ages, households by year, ties, hidden folk, and settlements entered as journals | NPC, Interactables, tools/mapgen |
| B2530-B2539 | A global World of Darkness: the world's regions, the Homeland, peoples and names, money, climates, tongues and households of the whole world | Chronicle, Creation, Storyteller, Atmosphere, NPC, Voices |
| B2540-B2549 | The world map: the whole Earth as a coarse grid, journeys by year, the closer view, the otherworlds as mirrors and a chart | Storyteller, Otherworlds, tools/mapgen |
| B2550-B2559 | The known world: what each part of the world knows of the others by year, charted waters, and the chronicle's own discoveries | Storyteller |
| B2560-B2569 | Sprite tokens: pixel figures on the map that face and walk as they move, drawn by our own rig | Paperdoll, tools/sprites |
| B2570-B2579 | News, travel and the week by world region: media years, road years, NPC routines by faith | Chronicle, Storyteller, NPC |
| B2580-B2589 | Sprite tokens attack: attack sheets per sprite, played on every screen when a blow lands | Paperdoll, tools/sprites |
| B2590-B2599 | Held for sprites and map furnishing (coordinator, 13 November 2026) | Paperdoll, Interactables |
| B2600-B2609 | Lifepaths that drill down: continent, region, people, origin, life stages by age, rewards on the sheet at book cost | Creation |
<!-- decision-index:end -->

## The decisions

| # | Date | Decision | Why |
|---|------|----------|-----|
| B1 | 2026-11-06 | Pre-launch review accepted: a minimal template world and the Rothenstein rebuild move into Phase 0. Phase 8 only finishes the template. | Gives every later phase a real world to test against. |
| B2 | 2026-11-06 | Rothenstein is rebuilt by cloning its database into a new world, `rothenstein-wodx`, not by reinstalling from the omnibus. The original world stays untouched as the archive. | Keeps PCs, history, scenes, journals and settings exactly as played. |
| B3 | 2026-11-06 | The clone keeps loading art and sound from the original world's `assets` folder. | Avoids copying about 600 files; the original folder must stay in place. |
| B4 | 2026-11-06 | The system keeps the id `worldofdarkness`; version becomes `7.3.2-wodx.1`; manifest and download URLs are removed. | Worlds and compendia keep working, and Foundry can't offer an upstream update that would overwrite the fork. |
| B5 | 2026-11-06 | Systems are global in Foundry, so the archive world also runs on the fork. Phase 0 changes are safety-only, so this is harmless. From Phase 1 on, any change that alters data must be gated by a WoDX world flag. | One install per system id. |
| B6 | 2026-11-06 | When module work starts, WoDX modules get new ids (`wodx-actions`, `wodx-combat`). `vtda20-actions` and `vtda20-combat` stay frozen at 2.2.1 for the archive world. | Modules are global too; new ids let the two worlds run different code. |
| B7 | 2026-11-06 | Migration safety: the fork never deletes items of an unknown type, and compares only the upstream part of its version. | Upstream deleted invalid items during migration; the version suffix would otherwise trigger a migration on every load. |
| B8 | 2026-11-06 | Every phase completion and every major version change gets a thorough error and bug check, with fixes, before it is called done. Checklist: QUALITY-GATE.md; automatic part: `tools/quality-check.sh`. | Ben's rule. |
| B9 | 2026-11-06 | World time 0 is 1 January 1197 (Julian). Components keep Foundry's meaning (year counted from 0), so durations still work; `yearZero` 1197 gives the real year. | One fixed epoch for every WoDX world. |
| B10 | 2026-11-06 | Mages use upstream's Victorian ability set before 1837, and every line uses the Victorian set in the Great War. Marked in the profiles as WoDX choices. | Upstream has no Dark Ages set for Mage and no 1910s set for anyone. |
| B11 | 2026-11-06 | Between eras (such as 1601 to 1836), the last era's rules stay in force and the clock says "between eras"; the Storyteller can lock another profile. | No era book covers those years. |
| B12 | 2026-11-06 | Players can only send free-form requests to the approval queue; automation proposals come from the GM's own client. | A player must not be able to propose an era change or similar. |
| B13 | 2026-11-07 | Gauntlet charts: Dark Ages: Werewolf before 1601; Wyld West book in the Wild West; W20 for the Victorian age, the Great War and later, since W20 is the basis book for those years. Values a book does not give are marked as WoDX choices and recorded in Chronicle Rules. | Settles the plan's open risk about Victorian, Wild West and Great War values without inventing a new chart. |
| B14 | 2026-11-07 | Ratings live on scenes (flags), and a region behavior overrides its scene. | Tagging 211 scenes by hand would be slow; most maps are one kind of place throughout. |
| B15 | 2026-11-07 | When a caught Garou succeeds, or a packmate's roll frees them, they arrive on the far side. | W20 doesn't say where a freed traveler ends up. |
| B16 | 2026-11-07 | Rothenstein's tags ship as a preset in the module, read from the scene names and the chronicle's own journals. | A fast, checkable start for the gate. |
| B17 | 2026-11-07 | Every new module window and dialog must scroll, and be laid out so all options are visible or reachable. Main buttons stay in view, and the window opens sized to the screen. Checked automatically at three screen sizes with Foundry's own stylesheet (`tools/harness/ui-fit.mjs`). | Ben's rule, after the ratings window opened cut off with Save out of reach. |
| B18 | 2026-11-07 | World content that WoDX finds broken is repaired by a proposal in the approval queue, never silently. Repaired documents are marked so they are never changed twice; a declined repair is not asked again until something new needs it. First use: tile positions under Foundry 14. | Keeps the Storyteller in charge of the world, as for era changes. |
| B19 | 2026-11-07 | Lineage and chronology live in `flags["wodx-creation"]` for now, not in new system fields. Foundry only accepts flags under a package id, so the plan's `flags.wodx` becomes one scope per module. | The sheets don't show these yet; a fork change can wait until they do. |
| B20 | 2026-11-07 | The Embrace makes a new Vampire actor from the mortal's sheet and keeps the mortal in "WoDX · Before the Embrace", linked both ways. The mortal's tokens move to the vampire. | Foundry can't safely change an actor's type in place; nothing is lost and the life before stays on record. |
| B21 | 2026-11-07 | WoDX choices at the Embrace: the childe rises with 1 blood point and with clan Disciplines listed at 0 dots; a mortal sheet with no Humanity starts at Conscience + Self-Control; with no sire on record the Generation is Twelfth (V20 Dark Ages p. 144). | V20 Dark Ages only says the childe rises hungry (p. 13) and starts on the Road of Humanity (p. 111). |
| B22 | 2026-11-07 | Experience costs: vampires by V20 Dark Ages p. 183 and V20 p. 124 (Caitiff ×6); ghouls by V20 Dark Ages p. 399 for Disciplines and Ghouls and Revenants p. 139 for the rest; mortals by the ghoul table without Disciplines (WoDX choice). Players request; the Storyteller approves; the cost is checked again on approval. | The plan's "experience costs as data", with B12 kept: players still can't put any other kind of proposal in the queue. |
| B23 | 2026-11-07 | The blood oath moves on once per night (noon to noon); a second drink the same night adds blood but not a stage. | V20 Dark Ages pp. 341–342: three drinks on three separate nights. |
| B24 | 2026-11-07 | Every WoDX menu with selectable entries gets a search box that filters as you type (accents and case ignored). Fixed short choices that never grow are exempt and marked `data-fixed`. A search never changes the current choice, because some dropdowns act at once (the era lock). Checked automatically by the UI fit check. | Ben's rule, so one NPC can be found without scrolling a long list. |
| B25 | 2026-11-07 | Allies: the Storyteller can make any NPC the ally of a player character (ghouls, retainers, followers). The patron's owners may then spend experience on it, from the ally's own pool or from the patron's, and can see its sheet (Observer, put back when the alliance ends). Requests still go through the approval queue. | Ben's request: players level up their ghouls and retainers. |
| B26 | 2026-11-07 | Pass the Years lives in WoDX Creation (it reads lineage and chronology); the time skip itself is Chronicle's (`timeSkip`, with the `wodxSkipStart` and `wodxSkipEnd` hooks, and per-tick work paused while it runs). The wizard sets the era itself, so no separate era proposal is made for a skip. | The plan puts the wizard in Chronicle; the data it needs is Creation's, and Chronicle keeps the clock. |
| B27 | 2026-11-07 | WoDX choices in Pass the Years: a mortal is asked about at 70 and dies at 100; with no birth year, a character is taken as 20 when the skip starts; an heir is a copy of the sheet without experience, 25 years old. Backgrounds are listed for review after 10 years, not changed. | The books give no lifespan or heir rules. |
| B28 | 2026-11-07 | Book rules in Pass the Years: a fed ghoul does not age and gains a blood point a century; without vitae it reverts to its real age and turns to dust far past a lifespan (V20 Dark Ages p. 399); a bond fades one step per (12 − Willpower) months without a drink (p. 341); voluntary torpor lasts by Road (p. 350). Give vitae now also applies p. 341's full oath: lesser bonds vanish and no new one forms. | From the book, with pages. |
| B29 | 2026-11-07 | Ability translation never removes anything: the new era's abilities become visible, learned ones stay, and the era's secondary Abilities are added at 0. Folding medieval Abilities into modern ones (Legerdemain into Larceny) is not done, since no book gives the equivalents. | Ben's gate: nothing lost from 1197 to 2025. |
| B30 | 2026-11-07 | rothenstein-wodx is the project's testbed for now, because so much content is already built in it. The WoDX version of the Rothenstein chronicle will be rebuilt later; the archive world stays the playable original. | Ben's call. |
| B31 | 2026-11-07 | One Umbra, in order of precedence: where the lines' rules or concepts of the spirit world conflict, follow Wraith: the Oblivion first, then Werewolf: the Apocalypse, then Mage: the Ascension. Each conflict decided this way is recorded as a WoDX choice in Chronicle Rules, with the books on each side. | Ben's rule, in the Master Plan under "Rules shared across lines". |
| B32 | 2026-11-07 | Phase 6 is split: 6a builds the shared parts (conditions registry, timed effects, the Group actor, WoDX Actions and WoDX Combat). The lines then follow in batches, each with its own gate. Rothenstein's lines come first: Werewolf and Fera, mortals, hunters with True Faith, and wraiths. | Ben's choice. |
| B33 | 2026-11-07 | vtda20-actions and vtda20-combat become new modules, wodx-actions and wodx-combat, with a one-time migration. The migration copies the actor flags to the WoDX names and renames the "VtDA20:" macros, and it deletes nothing. Settings start from the old stored values without writing them. The old API names stay as aliases. The new modules refuse to run while an old one is enabled. The vtda20 modules stay installed for the original Rothenstein world. | Ben's choice: new ids with migration. |
| B34 | 2026-11-07 | The Group actor is a new type in the system fork (7.3.2-wodx.2), data only. Its sheet is in WoDX Creation. The system's own character code skips the type. Pooling follows V20 Dark Ages p. 182 for coteries (Allies, Contacts, Domain, Herd, Influence, Resources, Retainers; nothing above the Anchor; one dot short on withdrawal). Packs follow W20 pp. 140–141 (Allies, Contacts, Fate, Kinfolk, Resources; Totem is not pooled). For other kinds of group, what may be pooled is the Storyteller's call. | Ben's choice: new type in the fork. |
| B35 | 2026-11-07 | Conditions live in a registry in WoDX Chronicle, as token statuses: V20 Dark Ages pp. 13, 348, 350, 351, 356–358. Timed effects are Active Effects that WoDX ends by round, scene, night (at dawn) or clock time, running a reverter to take back what they changed. A "scene" ends with the Clock's button, the End of scene action, or a new active scene (WoDX reading; the books leave a scene to the Storyteller). | The plan's "powers as timed effects" and "conditions registry". |
| B36 | 2026-11-07 | Dazed (V20 Dark Ages p. 348) is applied automatically, for one round. WoDX reading: hunters, mages and animals use the mortal threshold (Stamina); every other profile uses Stamina + 2. | The book names mortals and "vampire or other supernatural being". |
| B37 | 2026-11-07 | The standing rule against changes without Ben's approval is rescinded. Claude may change Foundry settings (module lists included) and enter Foundry VTT credentials on Ben's behalf. The other standing rules stay: back up first, ask before deleting, no decrypting game files, no copying book text, private use only, night maps. | Ben's instruction. |
| B38 | 2026-11-07 | Batch 1 is gated in two halves: first Werewolf and Fera (gate 6b), then mortals, hunters with True Faith and wraiths together (gate 6c). | Ben's choice. |
| B39 | 2026-11-07 | Werewolf Gifts come from a WoDX Gift library: every Dark Ages: Werewolf Gift's level, groups, cost, roll, difficulty, duration and page, with a one-line summary in WoDX's own words and no book text (`wodx-actions/data/gifts-daw.json`, 179 Gifts). A searchable picker adds them to sheets; the Library module packs them later (Phase 8). Entries read from damaged scan pages are marked for checking. | Ben's choice. |
| B40 | 2026-11-07 | Moon Rage is applied automatically at nightfall (the first sight of the moon each night): by phase, or all of it when the phase matches the auspice. The Storyteller gets a whispered card listing the gains. | Ben's choice. |
| B41 | 2026-11-07 | Werewolf rules follow the era: in the Dark Ages profile, Dark Ages: Werewolf (moon Rage table, Remaining Active by damage type, Delirium chart, Glabro Manipulation −1, Rank chart, rites not bought with experience); in other eras, W20. Fera use W20 Changing Breeds in every era. The system's own form tables are driven, not duplicated; WoDX only corrects the values the era changes. | B31-style precedence: the era's own book first. |
| B42 | 2026-11-08 | Hunters follow the era: in the Dark Ages, Dark Ages: Inquisitor with V20 Dark Ages' True Faith (pp. 392–396); from the Victorian Age to 1998, Hunters Hunted II's mortal hunters with True Faith; from 1999, Hunter: The Reckoning's imbued, with the Imbuing (modern only, as the Master Plan says). | Ben's choice for 6c. |
| B43 | 2026-11-08 | Wraiths use Wraith 20th in every era, and The Great War core in the Great War profile. Charnel Houses of Europe and Dark Kingdom of Jade give setting only (Stygia, the Maelstroms' dates). | Ben's choice for 6c; no Dark Ages wraith core exists. |
| B44 | 2026-11-08 | A wraith's Shadow is played the book's way: by another player (the Shadowguide) or the Storyteller, with a private whisper channel and the Shadow's own tools (Angst, Thorns, Harrowings). | Ben's choice for 6c. |
| B45 | 2026-11-08 | Mortals' Numina, psychic powers, hedge magic paths and rituals, and faith wards are built in 6c (Sorcerer, Hunters Hunted II), as the Master Plan lists them under "Mortals and others". | Ben's choice for 6c. |
| B46 | 2026-11-08 | The project's aim widens: WoDX should be as comprehensive as possible, a World of Darkness that runs as a virtual world inside Foundry as far as Foundry allows. Gaps this aim exposes become phase items in the Master Plan. | Ben's evolved concept; in the Master Plan's Summary. |
| B47 | 2026-11-08 | Phase 6d builds the inner voice: one shared layer in WoDX Actions for the Beast, the Shadow, the Avatar, Rage, Torment, Banality and Bedlam, Callousness and the Impulse. It gives each line someone to play the voice, a private whisper channel, pressure, automatic prompts and resist rolls, and each line keeps its own rules. It is opt-in for each player and each chronicle, the Storyteller controls it, and it is tied to the safety tools. It is built after gate 6c from the wraith's Shadow, the Kindred prompts and Garou Rage; later lines plug into it. | Ben's choice; in the Master Plan under "Rules shared across lines" and the Roadmap. |
| B48 | 2026-11-08 | Everything written for in-game use (chat cards, dialogs, prompts, journals, handouts, flavour text) uses gender-neutral language, unless it refers to a character whose gender is known for certain. New work follows this from now on; older text gets its own pass after the main phases. | Ben's rule. |
| B49 | 2026-11-08 | Hedge magic follows Sorcerer (Revised) in every era: its fifteen Paths, aspects, difficulty 4 + the highest aspect, rituals, fast casting, trading skill for power, counterspells. Psychic phenomena follow The Hunters Hunted II. The Hunters Hunted II's three hedge paths stay in the library for sheets that name them. | B45 named both books; Sorcerer is the full hedge-magic system, Hunters Hunted II the V20-era mortal one. |
| B50 | 2026-11-08 | In the Great War profile the Arcanos dialog offers Wraith: The Great War's arts. That is a WoDX library of 103 arts in 15 Arcanoi, with Basic Abilities and the war arts for vessels. In every other era it offers Wraith 20th's. The Maelstrom tool uses the Great War's storm table by force, in any era where the Storyteller calls a storm. | B43; the book's own "Arts of the War Dead" sidebar (p. 115). |
| B51 | 2026-11-08 | Phase 6e builds the WoDX look: one design system (tokens themed by line and era), a distinct WoDX frame, menus grouped by intent, one chat-card layout, accessibility checks, and screenshot review in the quality gate. It comes after 6d and before the remaining lines; Ben approves the look on the Kindred, wraith and hunter menus first. | Ben's request; in the Master Plan's Roadmap. |
| B52 | 2026-11-08 | Procedural generation joins the plan. Every generator is seeded per chronicle, puts world changes through the approval queue, and keeps its tables as editable Roll Tables in WoDX's own words. The generator core, people and factions come in Phase 7; weather, encounters and rumours, Otherworld travel and story aids come in Phase 8. | Ben's request; in the Master Plan's Roadmap. |
| B53 | 2026-11-08 | Phase 6d's inner voice gives a voicing player whispers and proposals. The voice whispers to the character and, when a trigger comes, can propose a check (frenzy, Rötschreck, Catharsis, a Rage roll, the Impulse, a derangement); the Storyteller approves it in the queue, and the character's player rolls it. The wraith's Shadowguide keeps its book powers (Angst, Thorns, Shadow Dice). | Ben's choice for 6d. |
| B54 | 2026-11-08 | 6d covers four voices: the Kindred (and ghoul) Beast, the wraith's Shadow (the 6c Shadowguide moves into the shared layer), Garou Rage, and the hunter's Impulse (an inquisitor's Callousness, an imbued's derangements at Virtue 7 and above). Later lines plug in when they are built. | Ben's choice for 6d. |
| B55 | 2026-11-08 | Only the voiced character's player, the voice and the Storyteller see the voice's pressure meter and whispers; the rest of the table sees outcomes on cards. | Ben's choice for 6d. |
| B56 | 2026-11-08 | Consent for voices: the Storyteller's chronicle switch turns voices on; each voiced player must opt in for their own character and can opt out at any time (Storyteller characters are the Storyteller's call); the Chronicle X-card pauses every voice until the scene ends. | Ben's choice for 6d. |
| B57 | 2026-11-08 | Player freedom and choice joins the plan as Phase 7b, the open world, after Phase 7 and before Phase 8. It has six parts: free travel on the maps' roads and crossings; solo play, whose world-changing results go to the queue; personal time against the Storyteller's world clock; the Storyteller's tracker; convening characters to a scene, with their times reconciled and beats firing on time, place or flag; and a spotlight balance and the safety tools for solo play. | Ben's vision; in the Master Plan's Roadmap. |
| B58 | 2026-11-08 | The WoDX look (6e) lives in WoDX Chronicle: one set of tokens in styles/wodx-theme.css, an era kit per era profile (body data-wodx-kit) and a line accent per profile (wodx-line-<profile> on a window or card). Only WoDX windows and cards are restyled, never Foundry's own interface. Each player chooses the look (era, light, dark or plain), text size and motion for their own computer. Fonts are bundled (OFL, one Apache), Latin subset. Kindred, wraith and hunter are restyled first; the other lines keep the era accent until Ben approves the look in play. Contrast is tested: text 7:1 on paper, other text and accents 4.5:1, accents on the title bar 3:1. | Phase 6e, B51. |
| B59 | 2026-11-08 | The Storyteller can opt a player's character in to the inner voice, behind the house-rule switch "The Storyteller can opt a character in to the inner voice" (Safety, off by default). The player is told in a whisper each time and can still opt out; the panel says who opted the character in. | Ben's request. |
| B60 | 2026-11-08 | The Storyteller chooses which WoDX buttons in the Token controls each player sees (window "Player toolbar buttons", a Storyteller button in the Token controls). WoDX buttons only; Foundry's own and other modules' are not touched. Players can only lose buttons: Storyteller-only buttons are never given to a player, and the X-card can never be hidden. | Ben's request and answers. |
| B61 | 2026-11-08 | "Find my character" (a player button in the Token controls) goes to the player's own token: the nearest on the scene in view, else the scene it stands on (the assigned character's first, then the active scene's), else a choice. Hidden tokens are never shown. When the player's client does not hold the scene, the active Storyteller's client finds the token and pulls the player there. | A playtester missed a scene change and lost their token. |
| B62 | 2026-11-08 | Phase 7 begins with Phase 6 left open (Ben). Four gated steps tested on Rothenstein's own factions and NPCs: 7a the generator core and People, 7c NPC profiles and combat tactics (Suggest by default; Auto rolls and moves the token along a real path, with an undo card), 7d movement and routines, 7e factions and domains. 7b stays the open world. | Ben's answers. |
| B63 | 2026-11-08 | 7a: the generator core lives in WoDX Chronicle (the seed, a seeded table engine, WoDX tables installed as Roll Tables in "WoDX tables", never overwriting a table the Storyteller edited); People lives in WoDX Creation (names by era and homeland, trades with ready sheets, the approval queue or "Make them now" by the Storyteller's own hand). NPC Behavior (7c on) is the new module wodx-npc. | Keeps 7a in modules already enabled in the world. |
| B64 | 2026-11-08 | The Phase 7 steps are relettered to follow the build order: 7a the generator core and People (done), 7b NPC profiles and combat tactics, 7c movement and routines, 7d factions and domains, 7e the open world (called 7b in B57 and B62). | Ben's request. |
| B65 | 2026-11-08 | 7b, NPC profiles: each NPC has a template (Kindred neonate or elder, ghoul, Garou, mortal guard or bystander, hunter, spirit, ghost, beast) chosen by line, generation and fighting Abilities, with temperament weights (aggression, caution, cunning, loyalty, cowardice, berserk, powers), a wound level it flees at, fears (fire, sunlight, True Faith, silver, the supernatural, violence, the Crinos form) and favoured tactics. The Storyteller can change any of it per NPC ("Behaviour…", token HUD) and set the mode for the world, a scene or an NPC (NPC first, then scene, then world). | Ben's answers to Phase 7 (B62). |
| B66 | 2026-11-08 | 7b, tactics: on an NPC's combat turn (no player owner, ever) WoDX weighs attacking each visible foe (who hurt it, who is badly hurt, who attacked its domitor or allies, what it fears), fleeing, full defence, Willpower, a frenzy check, a power, calling for help, searching for the unseen and waiting, each with its reason on the card. Suggest (the default) whispers the plan with Accept buttons. Auto carries out attacks (WoDX Combat's quick attack), moves along a grid path round walls within the turn's allowance, flees and defends, then posts Undo; an option that needs the Storyteller's roll or choice (frenzy, a power, Willpower, calling for help) stops Auto and the card waits. Auto never ends the turn. Square grids only for movement in 0.1. | Ben's answers (B62): Auto may act and move, with an undo card. |
| B67 | 2026-11-08 | Phase 9, the Encyclopedia of Darkness (Encyclopaedia Tenebrarum), joins the plan and is worked on only after everything else is finished. It covers every classic line's lore and characters, sorted into what is true, what might be true and what is unknown, and its mechanics traced from the earliest editions to the 20th Anniversary versions. Nothing from 5th edition or later goes in. A supplemental second volume, the Book of the Darkness to Come (Liber tenebrarum venturarum), covers World of Future Darkness and the Cyberpunk 2020 overlaps. It is built from the project's OCR text, written in WoDX's own words with page references and no book text (the standing rule), and is for private use. | Ben's request; in the Master Plan's Roadmap. |
| B68 | 2026-11-08 | Combat turns that advance themselves are built after gate 7b passes. A turn conductor in WoDX Combat, on the active Storyteller's client, advances when a turn is done: an NPC's Auto action resolved, or Accept pressed in Suggest; an NPC that cannot act is skipped; a player character's turn ends on End Turn, when the action is spent (after a grace countdown with Hold), or on an optional timer. It never advances while paused (the X-card), while damage waits to be applied, while a token moves, or while an approval for the fight is pending. Players get no new permissions: Foundry 14 already lets the owner end their turn. | Ben's request, after the investigation of Foundry 14.369's Combat code. |
| B69 | 2026-11-08 | The turn conductor's choices: it starts with NPC turns only (player turns can be switched on later); when player turns are on, a turn ends when the action is spent (after a countdown with Hold) or on the time limit, whichever comes first, and End Turn always works; Hold lets a character act at any later point in the round, and an action still held at the end of the round is lost; Celerity and Rage extra actions fall where each line's book puts them (checked, with page references). | Ben's answers. |
| B70 | 2026-11-08 | The 472 region "Floating text" labels in rothenstein-wodx fire on "token animates in" (Foundry 14 does not allow "token enters" for that behaviour). WoDX NPC moves tokens of any size, on square and hex grids; gridless scenes stay with the Storyteller. | Ben's approval to fix the remaining 7b issues. |
| B71 | 2026-11-08 | 6f: a mage in a Dark Ages chronicle (or with a fellowship on the sheet) uses Dark Ages: Mage's Foundation and Pillars; later eras keep Arete and Spheres. The sheet can choose either. Backlash kinds are the Storyteller's buttons; the player may only spend Quintessence to cancel 1s. Twilight and Brandings fade with days of abstinence on the Chronicle clock. | Ben: "Proceed with implementing the rest of Phase 6." |
| B72 | 2026-11-08 | 6g: a fae in a Dark Ages chronicle (or with an Origin on the sheet) uses Dark Ages: Fae's Mists, Weaving and Dominions; later eras keep Changeling 20th's Glamour, Arts and Realms. The sheet can choose either. The fae traits live on the actor's flags. The Dominions' hours and seasons come from the Chronicle clock (local solar time; astronomical solstice and equinox days). Echo rolls and level-5 harm stay with the Storyteller's judgement and button. | Ben: "Proceed with implementing the rest of Phase 6." |
| B73 | 2026-11-08 | 6h: Changeling 20th covers the later eras. A sheet can choose it in any era (Origin and Court: "Rules on this sheet"). Arts and Realms are read from the sheet's own Power items. The pool is the Art's rating plus the lowest primary Realm's rating, as the book's worked examples show. The Storyteller picks Bedlam Thresholds and the changeling's own Mists from the book's lists. | Ben: "Proceed with the rest of Phase 6." |
| B74 | 2026-11-08 | Character sheets per line and era go in a new module, WoDX Sheets. Each sheet extends the system's own sheet for that actor type, so its rolls, dots, health, combat, gear and settings keep working. It is the default sheet for its type and follows the era: the book's own sheet in that era, the system's layout otherwise. It follows the printed sheet section by section and in the same order, in WoDX's own design; the official sheet artwork is not copied. The Dark Ages lines come first (Fae, Mage, Inquisitor, Werewolf, then V20 Dark Ages Kindred and ghouls), then the later eras. | Ben's answers. |
| B75 | 2026-11-08 | The WoDX sheets and the system's own tabs share one set of data and controls. Where a header field is a system field (Nature, Demeanor, Concept, Clan, Generation, Sire, Breed, Auspice, Tribe, Pack Name and Totem), the Core page mirrors the Bio tab's own control, with the same options and value. The Virtues are the system's own part. The fields WoDX keeps for a line (Court, Origin, Agenda; Fellowship, Cabal, Mentor; Impulse, Order, Chapter; the ghoul's family) also appear on the Bio tab, bound to the same data. The lock works as on the system's sheets: a locked sheet shows the header as text and keeps its permanent dots; points (boxes) still change. Dots toggle the system's way: a dot sets the value, and the first dot of a 1 clears it. | Ben's request. |
| B76 | 2026-11-08 | 6i: Demon: The Fallen runs on the system's Demon sheet (House, Faction, Faith, Torment, lores and the apocalyptic form as the system keeps them). Lores are read from the sheet's Lore powers by name. Where the book gives two rules for Torment twisting an evocation (p. 161 by the dice, p. 169 by the count of successes), WoDX uses p. 161; p. 169 stays available on the actor. Thralls and their dawn offering are kept in WoDX's flags. | Ben: "Proceed with the rest of Phase 6." The p. 169 reading would twist nearly every evocation of a starting demon. |
| B77 | 2026-11-08 | 6j: the Kuei-jin run on the system's Vampire sheet set to Kindred of the East. The Dharma is read from the sheet's Dharma box by name; the direction and the P'o's Archetype are kept by WoDX. Healing aggravated wounds with Chi uses V20's cost (five points and a day's rest), since the book says only "as Kindred". The launcher shows the Kuei-jin menu for that variant. | Ben: "Proceed with the rest of Phase 6." |
| B78 | 2026-11-08 | 6k: the Reborn run on the system's Mummy sheet. Sekhem's pool is capped by the Balance; the sheet's Sekhem rating is spent by the resurrection. Offenses against Ma'at are recorded for the judges, not rolled, as the book has it. The Gift of Ra comes at 06:00 world time. | Ben: "Proceed with the rest of Phase 6." |
| B79 | 2026-11-08 | 6l: Orpheus characters run on the system's Mortal sheet set to Orpheus. The permanent Vitality is the starting Vitality and the temporary is the current; the permanent Spite is the rating and the temporary the points. Horrors take the roll the power names; WoDX handles the Vitality put in, Spite's penalty and the ripple. The inner voice of a spook is Spite. | Ben: "Proceed with the rest of Phase 6." |
| B80 | 2026-11-08 | 6m: later-era mages (Victorian to modern) cast by Mage 20th on the system's Mage sheet: Arete, the nine Spheres, Quintessence, Paradox and the Avatar as the system keeps them. The cast button sends a Dark Ages mage (mage-da.js) to the Dark Ages engine and every other Mage to M20; the flag daMage.system "m20" forces M20. Paradox is gained by the book's rule; the backlash is the Storyteller's roll from the menu, never automatic. Paradox under five fades a point a week at the daily tick. |
| B81 | 2026-11-08 | Later-era sheets (WoDX Sheets 0.4.0): outside the Dark Ages each line gets its printed sheet's page one in the Core tab, in the sheet's order: V20 (and a V20 ghoul), W20, M20 (with the Spheres between Abilities and Advantages), C20, Wraith 20 (the Shadow's page below), Hunter: The Reckoning, Demon, Mummy, Kindred of the East and Orpheus (both by the system sheet's variant, in any era). Every trait box is the system's own (its stat helper, its Arete, Quintessence wheel, Virtues and health parts), so its rolls and dots keep working; powers are read from the sheet's items. A Storyteller can set flags.wodx-sheets.sheet on one character to give it another sheet of its type (one out of its era); the gate uses it. Hunters get the Reckoning sheet when the rule line is the Reckoning or the character is imbued or has a Creed; otherwise the system's layout (Hunters Hunted II). |
| B82 | 2026-11-08 | Phase order after Phase 6: era advancement (WoDX Creation), then 7c (movement and routines, WoDX NPC 0.2.0), then WoDX Targeting, then 7d (factions and domains), then 7e (the open world). | Ben: "Go with the recommendations" (Phase 7 Plan, 7c Onward, Order of work; row 14). |
| B83 | 2026-11-08 | Era advancement. Each line gets an advancer in Pass the Years, and every proposal is shown for the Storyteller to tick. Switch defaults: Thick blood off (the books; if turned on, one Generation a century awake, never below 8th by time, a dot of Humanity or Road a step). Mortal decline on, at 60, 70 and 80, with the player picking the Physical dot lost. Morality drift off. Experience for the years on, at 1 a year awake, capped at 10 a skip. Dark Ages Abilities: the dots are offered for moving by the conversion table, with the old Ability kept at 0. Roads to Paths: the table is approved, and each Path is checked against V20's core list when built. Dark Ages fae across the Shattering: the Storyteller picks Return or Rebirth per character, with Rebirth as the default. Lines out of their era (Demon and Mummy before 1999, imbued hunters before 1999, Orpheus outside the 2000s) are allowed only by the Storyteller, with the sheet flag. Backgrounds (a dot per untended decade; Status, Domain and Influence reset in a new era) are shown as proposals, unticked. | Ben: "Go with the recommendations" (rows 1–9). Book checks: W20 pp. 39–41 (the White Howlers fell in the 1st century; the Croatan at Roanoke; the Bunyip in the War of Tears), V20 pp. 500–501 (a ghoul's aging). |
| B84 | 2026-11-08 | WoDX Targeting: Suggest is the default mode. Automatic is for the Storyteller and NPCs only, never players. Voice range is 30 yards. Hostile targets rank as last attacker, then whoever is engaged, then the nearest. | Ben: "Go with the recommendations" (rows 10–13). |
| B85 | 2026-11-08 | 7c: Suggest is the default for routines and for placing tokens, as in 7b. Routines run in hour blocks. When the clock moves, NPCs walk on the scene being viewed and jump everywhere else. Rothenstein's curfew runs from about 21:00 to dawn, and guards challenge anyone abroad (a WoDX choice, to be checked against Rothenstein's own notes). | Ben: "Go with the recommendations" (rows 15–18). |
| B86 | 2026-11-08 | 7e: small world changes apply on their own with an Undo, and big ones wait for the Storyteller. Small: an NPC walking its routine, tokens placed by a routine, a rumour moving one step, a Background dot gained or lost in a faction turn, a minor wound. Big: a death or an Embrace, a place changing hands, a new faction or member, a breach reaching the Prince or hunters, and anything touching a player character. | Ben chose option 2 for 7e; the line between small and big is row 20 ("Go with the recommendations"). |
| B87 | 2026-11-08 | 7c, places and routines: a place is a scene, or a region inside a scene, tagged with a kind (home, workplace, church, tavern, haven, gate, market, street, castle, wilds, caern). A routine names roles (home, work, church, tavern, haven, post, market, street, court, wilds, the domitor) or one place; a role the Storyteller sets wins, else a place of a fitting kind, the same one for the same NPC each time. An NPC takes part only when the Storyteller switches its routine on (by hand, or by "Match owners to NPCs" in the Places window). Spirits, ghosts and beasts have no ready routine. A guard's ready routine is the night watch, since the curfew is the watch's work in 7c; the day watch is a preset. Removals in Auto only touch tokens WoDX placed. | WoDX readings; the books give no NPC schedules. |
| B88 | 2026-11-08 | 7c, the hours: the presets follow Rothenstein's own notes where they give a time: the market shutters at dusk, the priest is in the church from dusk to the late bell, the night watch passes on the hour. The curfew runs from 21:00 (the late bell) to dawn. Feast days are the great feasts of the Western church (Easter by the Julian reckoning before the calendar reform and the Gregorian after, with Corpus Christi from 1264), plus the chronicle's own (Places window). V20 Dark Ages has no curfew or gate rule. | Rothenstein Codex (The Lower Town), Places (The Watch-house, Ludovic's Presbytery, The Inn Upstairs); V20 Dark Ages checked for curfew (none). |
| B89 | 2026-11-08 | 7c, noticing: a watcher sees a person in the open within 60 yards by day and 20 by night (WoDX reading), with no wall in between, unless asleep by its routine. Sneaking (the token status Sneaking) is Dexterity + Stealth against Perception + Alertness, the watcher needing more successes (V20 Dark Ages p. 169). Obfuscate (the token status Obfuscated, rated by the Obfuscate power) follows the era's book: in the Dark Ages, Auspex at least equal rolls Perception + Awareness at 8, less 1 a dot above, and a higher Obfuscate is not seen (V20 Dark Ages p. 195); in later eras, higher Auspex rolls at 7 less the difference, equal ratings make a resisted roll at 7 against Manipulation + Subterfuge, a higher Obfuscate is not seen (V20 p. 142). A mortal without Auspex never sees through it; a beast counts as Auspex 1 (V20 p. 184). | The books, printed pages, read on the PC. |
| B90 | 2026-11-08 | 7c, reactions: the watcher's response (challenge, raise the alarm, send for help, flee, fight, let it pass) is scored from its 7b profile, or fixed on the region. Auto carries out all but a fight, which always waits for the Storyteller. A challenge walks the watcher to the intruder and says nothing for them: the Storyteller speaks for the NPC (rule 11). A reaction or a fight pauses the NPC's routine (a reaction for 30 minutes of world time); when it ends the NPC walks back. | Plan rows 15–18 (B85), B86's line between small and big changes. |
| B91 | 2026-11-08 | Each line's look is built inside WoDX as a line skin (title face, texture, frame, ornament, accents), on top of the era kits. No third-party UI theme module. | Ben: "Approve all recommendations" (WoDX: A Look for Each Line, decision 1). None of Carolingian UI, PF2e Dorako UI or Fantasy RPG UI fits a World of Darkness game on Foundry 14. |
| B92 | 2026-11-08 | Install Window Controls (MIT, Foundry 14 only; needs libWrapper) for a minimize button on every window. | Decision 2. Foundry itself only minimizes on a double-click of the title. |
| B93 | 2026-11-08 | On character sheets the line's title face wins over the era kit's; on WoDX windows and chat cards the era kit's wins. The era kit keeps the body face and paper everywhere. | Decision 3. |
| B94 | 2026-11-08 | The system's own book fonts and logo banners stay behind a setting, off by default once the free skins are in. | Decision 4. They are commercial faces and line logos with no licence in the repo. |
| B95 | 2026-11-08 | Textures beyond WoDX's SVG noise come only from CC0 libraries (ambientCG, Poly Haven); ornaments are drawn by WoDX or come from game-icons.net (CC BY 3.0, credited). Fonts: SIL OFL or Apache 2.0 only. | Decision 5. |
| B96 | 2026-11-08 | The line skins are built alongside 7c: they work in wodx-theme.css and WoDX Sheets, and 7c in wodx-npc. | Decision 6; checked with the 7c thread (it touches ui-fit.mjs and the docs only, in separate hunks). |
| B97 | 2026-11-08 | Text cleanup pass: in-game text is gender-neutral (B48), em-dashes stay out of prose (only an empty list choice keeps "—"), and a harness test holds every module to both. Names the books give a gender (Gaia, Man's Skin) and book terms (Warders of Men, the Road sins) keep their wording. | Ben asked for the pass. |
| B98 | 2026-11-08 | 7d, the faction roll: a faction's move is rolled as its leader's Attribute (Manipulation to expand or scheme, Wits to defend or lie low, Charisma to recruit, Perception to hunt) plus the faction's Background for the move (Influence in the sphere, Domain, Status, Contacts or Resources), difficulty 6; a faction with no leader, or one dead or in torpor, rolls an Attribute of 2. Against a rival, the rival rolls Wits plus its own Background and the mover needs more successes; a rival on guard adds 1 to the difficulty. A botch costs a dot, and a secret faction that botches a hunt, an expansion or a recruitment starts a rumour. | WoDX reading. The books give no rules for a faction acting on its own; V20 p. 115 lets Influence stand in for an Ability, and a contested roll follows V20 Dark Ages p. 169. |
| B99 | 2026-11-08 | 7d, when factions act: every faction may act once a week of world time, at the end of a session, when a time skip ends (one turn a week, at most twelve a skip; the rest pass as quiet weeks) and when the clock passes a week by itself. Moves: expand, defend, scheme, recruit, hunt, lie low; goals weigh most, then the moment (a breach laid at the faction's door, a bitter rival, a quarry for hunters). The picks and the dice come from the chronicle's seeded generator (B52). | The Phase 7 Plan's outline (a turn at the end of a session and at each step of a time skip); the week is a WoDX choice, and a setting. |
| B100 | 2026-11-08 | 7d, Influence by sphere: a faction holds Influence per sphere, so a rival can contest one part of it. Dark Ages spheres: the Church; crown, court and law; guilds and trade; garrisons and men-at-arms; villages and the commons; the underworld. Later eras: the usual modern list (bureaucracy, church, finance, health, high society, industry, legal, media, occult, police, political, street, transportation, underworld, university). | WoDX reading: V20 p. 115 and V20 Dark Ages p. 181 rate Influence as one Trait. |
| B101 | 2026-11-08 | 7d, hunting and breaches. Hunting follows the books: the area's difficulty (V20 p. 260; V20 Dark Ages p. 334), less a dot a dot of Domain where the hunter's faction holds the place and of Fame, never below 3; Herd adds a die a dot where the herd could be; in another's domain the intruder adds its security (V20 p. 113) and a noticed trespass sours the holder's standing (queued). A breach has a severity of 1 to 5 (from WoDX Actions' witnesses: one is 1, two to four is 2, five or more is 3). It reaches as many new places a day as its severity, public places first; factions holding a place it reached, or whose Contacts hear it, know of it. It rises to the Prince when the ruling faction knows (or, when the court itself is blamed, once three places know), then to the hunters of the era (B42) once they know and it is 2 or more. Each rise waits in the queue; rejecting one stops the rumour. A quiet week takes a step off a rumour the hunters have not heard. Every witness dealt with before the talk starts contains it. | WoDX reading for the rumours; the books, printed pages, for hunting. |
| B102 | 2026-11-08 | 7d, Rothenstein's factions: the valley's ten powers from the chronicle's notes (the Voivode's court, which rules; Konrad's cult; Sister Marta's network; Old Radu; the German council; the parish of St. Aegidius; the Moravian villages; the Weavers' Guild; Ondrej's company; the Church's hunters), with their leaders, members and places found by name. Their dots and standing are WoDX's estimates from the notes, for the Storyteller to change (the court's Herd is 4, thirty vessels, for the thirty-one names of the Herd roster). | Rothenstein's journals: The Domain of Rothenstein, Overview & Cast, The Herd, The Weavers' Guild Hall, Hunter & Inquisition Threats, What You Have Heard of the Four. |
| B103 | 2026-11-08 | 7e, where it lives: the open world is a new module, WoDX Storyteller (`wodx-storyteller` 0.1.0), the Storyteller module the Master Plan already names. It starts with the open world; the dashboard, queue relief and the rest of that module's list join it later. It needs WoDX Chronicle 0.4.3 (the queue, the clock, the player buttons) and reads WoDX NPC and WoDX Otherworlds when they are on. | Plan, 7e (rows 19 and 20, B86); a build choice, open to change. |
| B104 | 2026-11-08 | 7e, personal time: each player character keeps a time of their own in the night while acting alone; the world clock stays the Storyteller's and only convening moves it. When the clock passes a dawn that a character's night is still behind, their time catches up to the clock. Each player is warned once a dawn, 60 minutes before sunrise by their own time (a setting). A Kindred's (or Kuei-jin's) trip that would end after dawn asks the Storyteller first. | Master Plan, Personal time ("Dawn still comes for everyone, with warnings"). |
| B105 | 2026-11-08 | 7e, travel: players may travel to the scenes the Storyteller marks in Travel places; while none is marked, every scene that is not a battle map or a test is open (as for 7d's places). A trip takes the route's minutes (either way), else the place's own, else 30. A place may ask first, which sends the trip to the queue. Each hour on the road has a chance of an encounter (10 percent by default, at most one a trip, seeded), drawn from the place's roll table or the world's; an encounter always waits in the queue, since it touches a player character. Otherworld crossings stay with WoDX Otherworlds and are logged. | B86 (anything touching a player character waits); Master Plan, Free travel. No book rule for road encounters in V20 or V20 Dark Ages; the Rothenstein encounter scripts can be the table. |
| B106 | 2026-11-08 | 7e, solo play: hunt or feed, downtime, research, influence or contacts, talking to someone, or something else, each with its usual hours (1 or 2) and the player's own if given. The Storyteller may set a number of solo actions a night (0, no limit, by default); a night runs from dusk. Solo play waits while a character is in a called scene. A result the player marks as changing the world (a death, a breach, a new ally) goes to the queue; the rest are logged at once. Hunting rolls stay with WoDX NPC's Hunting window. | Master Plan, Solo play, Fairness and safety; B86. |
| B107 | 2026-11-08 | 7e, convening, beats and the tracker. A called scene starts at the latest of the chosen characters' times (never before the clock), and the clock moves to it; whoever was behind gets a card asking the player to sum up the gap, whoever was ahead waits. Solo play pauses for them until the Storyteller releases them or ends the scene. A beat fires once on a time (the clock's, or one character's own), a place (a character arriving) or a flag; one that calls characters to a scene waits in the queue (it touches player characters), one that only reminds is a card for the Storyteller. The tracker logs arrivals, trips, rolls, solo acts, crossings, breaches, queue cards and dawns, flags what needs a look (a frenzy, a sin, a breach, a voice's proposal, Paradox and the like) by the card's words, and shows the spotlight since the session ended, quietest first. End the session marks the report between sessions: who moved, what changed hands, the factions' other moves, what needs a look, what is brewing. | Master Plan, The Storyteller's tracker, Convening, Fairness and safety; Phase 7 Plan, 7e outline; B86. |
| B108 | 2026-11-08 | Interactables is its own module, WoDX Interactables, on core Foundry walls (doors, windows) with its settings in flags.wodx-interactables. The way in is the Interact button on the token HUD and the I key; clicking a locked door opens the same window for that door. The door click extends Foundry 14's own door control class (CONFIG.Canvas.doorControlClass, checked in the 14.369 source), so no core code is patched, and a world setting turns it off. Secret doors stay out of a player's list until found; reach is measured on the token's own level, and nothing behind another wall is listed. | Ben settled the design note's decisions as recommended (WoDX: Interactable Map Elements, decisions 1 and 2). |
| B109 | 2026-11-08 | Lock grades: four named grades. Cheap (difficulty 5, 2 successes, a turn a roll), good (6, 3, a turn), excellent (8, 5, a minute), masterwork (9, 8, five minutes). The difficulties follow V20 Dark Ages intrusion (5 for a common lock up to 9); the successes and times are a house reading. No picks or tools: +2 difficulty. A locked door with no grade set has a good lock. The lock skill is looked up by line and era: Legerdemain in the Dark Ages lines, Security for the hunters, Larceny otherwise; the best rated of those the sheet has wins. Keypads and alarms (modern eras only) use the same four grades with Intelligence + Security, Technology or Computer. A botch on a lock jams it and loses the progress; a botch on a keypad sets off the alarm. | Decision 3 (four named grades). V20 core page refs: TODO, to pin from the book texts on the PC. |
| B110 | 2026-11-08 | Forcing: a character whose Strength plus Potence reaches the door's level on the lifting chart breaks it with no roll (V20 Dark Ages p. 335: 3 a wooden door, 10 a reinforced one, 11 a heavily reinforced one). Short of it, an extended Strength roll: interior door difficulty 6 and 1 success, sturdy outer door 7 and 3 (a house reading between the book's two), reinforced 8 and 5, vault 8 and 10 (V20 Dark Ages pp. 332-339); Potence adds its dots as automatic successes. A botch is one lethal level. A door barred from the other side needs 2 more successes; the bar is lifted from its own side with no roll. Breakable walls (wattle or plaster, timber or brick, stone) work the same way. | From WoDX Actions' own presets for forcing a door and lifting, which carry these book pages. |
| B111 | 2026-11-08 | Results apply at once with an Undo on the card for the Storyteller: a door opening, a lock picked or jammed, a forced door, a broken pane, a bar lifted. Only a wall knocked through waits, in the approval queue, and approving it opens the whole wall segment. The player's client rolls with WoDX Actions' pool rules (wounds, bonus dice, Willpower, specialty, an untrained Skill, a Knowledge that can't be used untrained); the active Storyteller's client reads the dice from the card, checks that the player owns the character, works the result out again from the door as it is now and applies it. Extended attempts keep their successes on the door, so anyone can take over. | Decision 4 (forced doors and broken glass apply at once with Undo; only a wall knocked through waits) and 7e's rule (B86). |
| B112 | 2026-11-08 | Noise and time. Every attempt is silent, quiet or loud. A loud noise is heard by anyone awake within 30 yards, or 10 through one wall that stops sound; a quiet one carries 5 yards and stops at a wall, and hearing it is Perception + Alertness at 7. A sleeping NPC (by its routine) rolls at 8 even for a loud noise. The Storyteller's card names who heard and what each would likely do by its NPC profile, and the hook wodxInteractablesNoise passes the news on; nothing moves by itself. Listening at a door is Perception + Alertness at 6, +1 for a sturdy door, +2 reinforced, +3 a vault; the successes tell how many are beyond and whether they move. Retrying a single roll adds 1 to the difficulty each time (V20 Dark Ages printed p. 323). Attempts of a minute or more move the Chronicle clock, outside combat. | House readings; the noticing roll follows 7c (B89). |
| B113 | 2026-11-08 | WoDX Targeting, how the picker behaves: it only acts when no one is targeted by hand, and a target it set itself does not count as set by hand. Suggest pre-fills the window with its choice (difficulty and card follow it) and lists the next three; using the window makes the choice the user's target. Automatic (the Storyteller) sets it as the window opens. Area powers always list everyone in range with allies unticked and wait for "Target these". Only tokens the user can see are picked: never hidden by the Storyteller, invisible or Obfuscated (a player's own tokens excepted). A neutral token is a foe only after harm either way (WoDX NPC's rule), with a warning, and a player aiming at one tells the Storyteller. Each player can turn it off for their own computer. | Settled from the feasibility note's safeguards (B84). |
| B114 | 2026-11-08 | WoDX Targeting, the power tags: every power in the libraries WoDX ships (931: Disciplines, both Arcanoi books, Gifts, Demon evocations, Reckoning edges, Orpheus Horrors) has an intent (foe, friend, healing, the user, area, anyone) and a range (touch, melee reach, voice 30 yards, line of sight, any distance) in wodx-targeting/data/tags.json. A script seeded them from each power's data; every one was then read by eye against WoDX's summary. Powers whose summary only says "the system is on the page" (most elder powers, Necromancy and Thaumaturgy paths) were tagged from their names, and "anyone" where unclear, since that keeps the last target and never guesses a side. A check against the books is still open. Sheet-only powers (Hekau, Blessings, Kuei-jin arts) are guessed from their names at use. Casting windows with no list (M20, Dark Ages mages and fae, C20 cantrips) ask what the casting is aimed at, defaulting from the Spheres or Art. | Settled as recommended (feasibility note, "The gap"). |
| B115 | 2026-11-09 | Common checks: every line's menu gets a Common checks button next to the free roll, with 41 everyday rolls taken from V20's Abilities (pp. 100-111), its sample rolls (p. 255), its dramatic systems (pp. 257-266), Willpower (p. 266) and the Virtues (pp. 119-120). Each check lists its pools best first and rolls the first the character has dots in, so the Dark Ages names (Ride, Legerdemain, Hearth Wisdom) and the later ones (Drive, Larceny, Streetwise) both work; with no dots it rolls the first pool under the untrained rules. The free roll is renamed "Any roll / dramatic system" and gains the V20 systems it lacked (Driving with Drive, Computer Use, Carrying Capacity, Science for Research). | Players at the 8 November playtest found no plain Perception check; Ben asked for every common roll to be covered. Audit: docs/research/common-rolls-audit.md. Difficulties are the usual ones the Storyteller changes to fit. |
| B116 | 2026-11-09 | Containers (Interactables 0.2.0): a tile marked as a container in the WoDX part of its config window (chest, box, cabinet, desk or filing drawers, strongbox, safe) is listed in the Interact window with the doors. It uses the door's four lock grades, keys, keypads (modern eras) and forcing; the kind sets the material and so how hard it is to force (a safe is a vault, a strongbox reinforced, the rest wooden). Its state is kept on the tile (open, closed, locked; a lock with no state set means locked). What is inside is a list, one a line: an item UUID or the name of an item in the Items directory. Taking it is silent and gives the character a copy of each item at once; anything not found is named on the Storyteller's card. Undo takes the copies back. A hidden tile stays out of the players' list. | Ben, 9 November 2026: build every suggested interactable, containers first. Applies at once with Undo, as the doors do (B111). |
| B117 | 2026-11-09 | Traps (Interactables 0.3.0): a tile marked as a trap (snare, pit, tripwire, spring blade) in four grades (crude, good, excellent, masterwork). An armed trap goes off when a player's character walks over it (NPCs only when the tile says so): a hidden one anywhere on the path, a found one only where the move ends, so a found trap is safe to walk around. The victim rolls Dexterity + Dodge or Athletics at the grade's difficulty to get clear: each success takes a die off a blade, any success clears a snare or catches the edge of a pit. Damage (blade 5 lethal dice, pit 2 bashing, both settable; snare and tripwire none) goes through WoDX Combat's soak and apply. A snare holds its victim until Strength (difficulty 7, Potence adds) breaks free or someone cuts it. Searching the area (Perception + Alertness or Investigation, difficulty 6, a minute) finds every hidden trap within three squares whose grade needs no more successes than were rolled (1 to 4); the Storyteller is whispered what was missed. A found trap is disarmed with Wits + Larceny (Legerdemain in the Dark Ages, Security for hunters) at the grade's difficulty; a botch sets it off on the one disarming it. It can also be set off from a safe distance, and set again later. Everything applies at once with Undo, which also takes back the damage. A world setting turns springing off. | Ben, 9 November 2026: traps second, after containers. House readings of the noticing and intrusion systems (V20 Dark Ages pp. 322-339); the falling page ref in the V20 core is still to pin. |
| B118 | 2026-11-09 | Clues (Interactables 0.4.0): a tile marked as a clue (a letter, ledger or document; a bloodstain or mark; writing or graffiti; tracks or a trail; something out of place) holds the Storyteller's own text in up to four parts: what anyone sees, and what 1, 2 and 3 or more successes add. Reading a document or writing is Intelligence + Investigation, examining anything else Perception + Investigation, difficulty 6, a minute; with no deeper parts written, looking needs no roll. What the character learns goes in a whisper to that player and the Storyteller, never on the public card, and the best successes each character has had are kept, so a worse roll later loses nothing. A hidden clue tile is found by Search the area when the successes reach its own number (1 to 5). Undo deletes the whisper and the record. | Ben, 9 November 2026: clues third. WoDX writes no clue text: the Storyteller does (no AI-written content in play). |
| B119 | 2026-11-09 | Light sources (Interactables 0.5.0): a tile marked as a light source (a torch or brazier, candles, a lantern, an oil or gas lamp, an electric light switch) works the scene's own Foundry lights: the ones whose ids are set on it, or else every light on the tile or within a square of it, with the copies WoDX Otherworlds makes on the Penumbra and Shadowlands levels. Lighting or putting it out takes a turn, no roll and no noise; a lantern, lamp or electric light can also be broken, which is loud and leaves it dark until the Storyteller unticks Broken. Applies at once with Undo, which puts every light back as it was. | Ben, 9 November 2026: light sources fourth. No roll: lighting a lamp is not a dramatic action in V20. |
| B120 | 2026-11-09 | Dated events (Chronicle 0.5.0): 25 events from 1347 to 2024 (modules/wodx-chronicle/data/events.mjs), each with its date, lines, a summary in WoDX's words and its book and page. An event fires once when the Chronicle Clock passes its date: one chat card (one for every event a time skip crosses), the hook wodxEventFired, and its row on the Chronicle Rules page "Dated events". Setting the clock back undoes it (wodxEventUndone). The first check in a world records what is already past without a card. Metaplot events (Doissetep, the Week of Nightmares, the Avatar Storm, the Sixth Great Maelstrom, the Time of Judgment) start off. The Storyteller switches any event on or off, moves its date or links a journal page in Configure Settings, Dated events. Timelines: events up to 1969 fire on both; the late-1990s events and the Time of Judgment on the classic one only; the Venice Conclave, the Cyberpunks bloodline and the fall of the Masquerade on the Future Darkness branch only (the existing futureBranch house rule). | Dates from the books (Wr20, C20, LotC, M20, W20, V20, HtR, Demon, WoFD; pages in the data). Two dates are house picks: the Third Great Maelstrom in 1600 (Wr20 p. 36 puts it after 1598) and the Cappadocian purge in 1444 (V20 p. 418 gives no year). |
| B121 | 2026-11-09 | Hold the world (Chronicle 0.5.0): a Storyteller switch on the Chronicle Clock. While held, the clock moves but nothing reacts: no NPC routines, faction turns, expiring effects, era proposals or dated events, and a time skip fires no skip hooks. Releasing it catches up once (era, events, the rules journal). Gates that move the clock in rothenstein-wodx hold the world first and put the hold back after. | Needed so gates (and flashbacks) can move the clock in a played world without setting Rothenstein in motion. |
| B122 | 2026-11-09 | Data versions (Chronicle 0.5.0): every WoDX module's data in a world has a version, recorded in the world setting wodx-chronicle.dataVersions; a world never stamped, or a module turned on for the first time, is stamped at the code's version with nothing run. A module that changes how it stores flags or settings registers its steps in a wodxRegisterMigrations hook. When the active Storyteller loads the world, before the other modules start (wodxChronicleReady), each module behind is brought up one step at a time. Before its first step, every world document carrying its flags (with embedded documents) and its world settings are written to Data/wodx-backups/migrations; with no backup, nothing runs. A failing step stops that module at the last step that worked and says where the backup is on a card for the Storyteller; it is tried again on the next load. Data newer than the code is refused. Off the PC: tools/backup/nightly-backup.ps1 zips the worlds, the WoDX modules and system, Data/wodx-backups and the newest bundle, and copies the zip to a folder off the PC, keeping 14; register-nightly-backup.ps1 makes it a daily scheduled task. | Gap review item 6. Where the nightly copy goes is Ben's choice (a synced cloud folder, or the droplet once it is up). |
| B123 | 2026-11-09 | Archive of the dead (Creation 0.7.0): the Storyteller moves the dead (in "WoDX · The Dead" or with a date of death) and Pass the Years' copies out of the world into a world compendium, "WoDX · Archive of the dead", each keeping its actor id. Each actor is written to the compendium and found in its index before it leaves the world. Player characters and anyone with a linked token on a scene stay. A journal of the same name lists everyone archived with dates, cause and a link; game.wodx.creation.archive.whereIs(id) finds an id in the world or the archive. Bring back returns an actor with its id into the folder for its kind. | Gap review item 5: a long chronicle piles up the dead, and the world slows as it grows. |
| B124 | 2026-11-09 | Languages in chat (Chronicle 0.5.1): each character keeps a list of languages (flags.wodx-chronicle.languages, native first), set in the Languages window (Chronicle Clock; players see their own characters, the Storyteller every player character and any selected tokens). A player sets the language they speak above the chat box, or types "/in Latin ..." for one message. It is put only on a character's plain speech, never on rolls or module cards. A reader none of whose characters know it sees made-up words of the same length, the same each time for a word, and "In Latin, which your character does not speak"; the Storyteller and the speaker read it as written. It is a table aid, not a secret: the words stay in the message's data. The window shows how many languages Linguistics allows (1, 2, 4, 8, 16 beyond the native) as advice only. A world setting turns it off. | Gap review item 9. The Linguistics doubling is from memory of V20 and Revised; its page is on the book-check list. |
| B125 | 2026-11-09 | The Ledger (Storyteller 0.2.0): one list of oaths and vows, debts, Kindred boons (trivial, minor, major, blood, life) and consequences, each with who owes or swore, to whom, what, the date made and an optional due date. An open entry with a date fires once when the clock passes it (a whispered card for the Storyteller and a tracker line; a time skip lists all it crossed on one card; nothing while held or mid-skip; setting the clock back makes it due again later). The Veil track: one track for the chronicle, 10 (sound) to 0 (torn), in five bands; each recorded breach lowers it by its severity (1, 2 to 4, 5 or more witnesses) at once with an Undo, and each 30 quiet days mend it a step (a house rule). Heirs and succession: when someone in the ledger dies (a death date, or the actor deleted, but not one sent to the archive), each open entry naming them goes to the approval queue, to pass to their heir (Pass the Years' heir, or one named) or to be cancelled; when a faction's leader dies, the queue proposes the heir if a member, else the first living member. | Gap review item 8. Bands, the mending pace and the default successor are house picks, logged in PENDING-REVIEW. |
| B126 | 2026-11-09 | The whole menu, searched (Actions 3.14.0): typing in the WoDX Actions menu's search box also lists, under "Also found", every common check and every dramatic system the free roll knows, and Enter or a click rolls it; they are hidden while the box is empty. Common checks cards get flavor lines of their own: one set for each of the most used checks (noticing, reacting, sensing the uncanny, searching, reading a person, seeing through a lie, spotting alarms, balance, hiding, holding still, endurance, recall, first aid, Willpower, Courage) and one per group for the rest. Tours (Chronicle 0.5.2): "WoDX: playing your character" for everyone and "WoDX: running the chronicle" for the Storyteller, in Configure Settings, Tours, and the Tour button on the Chronicle Clock; a step whose button is not on screen shows in the middle. | Gap review item 4, from the 8 November playtest (players could not find a plain Perception roll; flavor lines on checks read as generic). |
| B127 | 2026-11-09 | The second page (Sheets 0.6.0): every sheet now draws the printed sheet's back page under its first, in the Core tab. Each has Combat (weapons with difficulty, damage, and range, rate and clip for guns; armor with its soak and Dexterity penalty; the character's soak), Possessions (Item items, the gear text and money) and History and Description (Appearance and History from the Bio tab, cut short), plus the line's own: Other Traits or Merits and Flaws (whichever page one lacks), Derangements, Rituals and Paths for Kindred, Rites and Fetishes and Talens for Garou, Rotes for mages. The Fae keep their Dreaming tab and the wraith keeps the Shadow's page, since those are what their books print there. No block is drawn twice on one sheet. |
| B150 | 2026-11-09 | Hiding places (Interactables 0.6.0): a tile marked as a hiding place (wardrobe or cupboard, under a bed or table, behind a curtain, deep shadows, crawlspace or loft, priest hole) holds as many as its room (by kind, or set). Hiding is Dexterity + Stealth, difficulty 6, a turn: it always gets the character in and out of sight, but a searcher needs the place's own number (1 to 3) plus one more for every two hiding successes; a failure is quiet and a botch loud. Out of sight is the Invisible status, so the character's own player and the Storyteller still see the token (the token's hidden switch where the status is missing). Searching that place is Perception + Alertness or Investigation with one success added; Search the area finds them too. The Storyteller is whispered who stays hidden. Walking out of the place ends the hiding. Undo puts everyone back. | Ben, 9 November 2026: hiding places fifth (with light sources, the gap review's next two). A house reading of the Stealth contest; V20 page ref to pin. Numbers from B150 for this thread (B120 to B149 belong to the gap review). |
| B128 | 2026-11-09 | Gear by era (Library 0.1.0, Combat 3.7.7): a new module, wodx-library, holds 327 items read from seven books' charts (V20 Dark Ages, Sorcerers Crusade, V20 Wild West, Wraith: The Great War, V20, World of Future Darkness, Cyberpunk 2020), each with its book and page (pdf and printed). tools/library/build-gear.mjs turns the tables in docs/research/gear-tables into data/gear.json, the system's own Melee Weapon, Ranged Weapon, Armor and Item data, each tagged with the eras it fits. The world compendium "WoDX · Gear by era" is filled from it at startup and matched by name and source, so nothing is deleted. The Gear by era window (token controls, or Configure Settings) lists an era's gear with a search box and gives ticked items to the selected characters. Cyberware: implants that add soak (Subdermal Armor +4, Skinweave +3, Decentral Heart +1, body plating +8, per World of Future Darkness) are Armor items marked as implants, worn from the start, and Combat counts them even when not ticked as worn. Cyberarms, limb options and boosters are reference items with their figures (a limb's soak is its own). Smartgun Link and Targeting Scope give their difficulty change in their text. |
| B129 | 2026-11-09 | Book checks (Targeting 0.1.1, Actions data, Chronicle 0.5.3): the elder powers and paths were read against V20 Dark Ages; 39 Targeting tags changed to what the book says (docs/research/book-checks/book-checks.md, section 3), among them passive powers now on the user, touch powers on touch, and area powers (the Koldunic kraina, Lament of Dhainu, Form of the Storm) as areas. The book's own target counts stay inside the house rule that players choose who their powers affect. Dark Ages: Werewolf: 19 of the 20 Gifts marked for checking are confirmed or corrected (Visage of Fenris difficulty 6; Curse of Hatred, Warrior's Draught, Mental Speech, Balor's Gaze, Claws of the Glassblower, Gift of the Spriggan effects); Dolorous Stroke stays marked until its page image is read. The metis entry is confirmed. DA:W has no Rage difficulty by moon, so the W20 table in the Dark Ages is a house rule. V20 has no Linguistics Ability: the Languages window now also counts Language Merits (two each with Natural Linguist). The V20 core page refs for doors, locks and falling went to the Interactables work. |
| B130 | 2026-11-09 | Creation totals (Creation 0.8.0): a Creation check window lays a sheet against a book's creation totals for 17 books (V20, V20 Dark Ages, V20 Ghouls and Revenants for ghouls and revenants, W20, DA:W, M20, DA:M, Wraith 20, C20, DA:Fae, DA:Inquisitor, Hunter: The Reckoning, Demon, Kindred of the East, Mummy in its two stages, Orpheus) and counts what the extra dots cost in freebies at the book's prices. Groups are matched to primary, secondary and tertiary in the way that costs least. Powers the system keeps no Trait for (Pillars, Dominions, edges) are marked to count by hand. It only reads. The book starts from the sheet type and era. | Gap review item 3. Totals and page refs in docs/research/creation-totals. |
| B131 | 2026-11-09 | Death into a wraith (Creation 0.8.0): a living mortal's sheet becomes a Wraith sheet. House rule: Attributes, Abilities, Virtues, bio and items carry over; Willpower is the higher of the mortal's and 5; Corpus 10 and Pathos 5 + Memoriam are fresh (Memoriam becomes a Background). The Shadow's Angst is rolled (Willpower dice at 6, ones do not cancel, at least 1, never above Willpower). Leaving the Caul: the Crucible first (default; the Caul stays until it succeeds), alone (1 Willpower, Willpower at 4, each success 1 extra Pathos), a Reaper (Charisma + Empathy at 9 minus Memoriam), Harvested, or later. Arcanoi 5, Passions 10, Fetters 10, wraith Backgrounds 7 and the Shadow's 7 Dark Passion dots and 10 freebies are listed to spend. The mortal sheet is kept and linked, as at the Embrace. | Wr20 pdf 176–180, 295–296, 345–347 / printed 111–115, 230–231, 280–282. The book is silent on carrying Traits over; choice logged in PENDING-REVIEW.md. |
| B132 | 2026-11-09 | The Awakening (Creation 0.8.0): a Sleeper's sheet becomes a Mage sheet. House rule: Attributes, Abilities, Backgrounds, Virtues, bio and items stay; Arete 1, 1 dot in the chosen Affinity Sphere, Avatar 1 if the character has none, Quintessence equal to Avatar, Paradox 0; Willpower stays as it is, and while it is below Arete it caps Sphere ranks and casting dice. Paradigm, practice and instruments are asked for. Later Spheres and Arete come from experience, with a Seeking before each Arete dot. | M20 pdf 258, 329–330 / printed 257, 328–329. Choice logged in PENDING-REVIEW.md. |
| B133 | 2026-11-09 | Ghoul and revenant blood at creation: a new ghoul starts with 1 blood point and its pool follows the V20 Dark Ages ghoul rules in every era (house rule); a revenant holds 10, starts at 1 and makes back 1 a night. | V20 Ghouls and Revenants gives two figures (pdf 117 and 141 / printed 116 and 140). Choice logged in PENDING-REVIEW.md. |
| B151 | 2026-11-09 | Fire and hazards (Interactables 0.7.0): a tile marked as a hazard is a fire, a brazier, lamp or candle stand, broken glass or caltrops, or a live wire. A live hazard hurts whoever walks into it from outside, and in combat a fire or live wire also hurts whoever starts a turn in it; damage goes through WoDX Combat's soak with Undo. Fire uses the fire rules WoDX Actions already uses (V20 Dark Ages pp. 355-360): size 1 to 3 levels a turn, the heat table for the soak difficulty (3 to 10), lethal to mortals and ghouls and aggravated to everyone else, and a vampire soaks it only as fire (Fortitude), with a note to call Rötschreck. A brazier is harmless until knocked over (loud, no roll), then burns at its set size. A small fire goes out with no roll; a bonfire takes Dexterity + Athletics at 7 (a botch burns the one fighting it); an inferno can't be put out by hand. A fire can be tied to scene lights, which burn while it burns. Glass: 2 dice of lethal (or set), a Dexterity + Athletics roll at 6 first, each success a die fewer; a minute sweeps a path. A live wire does 2, 4, 6 or 8 levels by its current; cutting the power is a turn. NPCs are hurt too unless the tile says players only. WoDX Combat 3.7.6 takes a soak difficulty from the caller. | Ben, 9 November 2026: fire and hazards sixth. Choices logged in PENDING-REVIEW.md. The electrocution levels and the put-out rolls are house readings; the electrocution page ref is still to pin. |
| B152 | 2026-11-09 | Altars, relics and fetishes (Interactables 0.8.0): a tile marked as an altar or chapel, or a wayside shrine or holy well, is holy ground with a rating (1 to 5). Pray here opens WoDX Actions' own prayer window and says which rating to pick; Desecrate it is a minute and loud, and the ground is not holy until the Storyteller unticks Desecrated. A demon who steps onto holy ground, or starts a turn there in combat, is seared as WoDX Actions' "The holy" reads Demon: The Fallen (pp. 254-255): nothing at Torment 3 or less, else lethal levels equal to the rating and a Willpower roll at 6 to stay, with Undo. A holy relic (Faith potential 1 to 5) or a fetish or talen (Gnosis 1 to 10) rests on its tile until someone takes it; the item goes to the character, and a fetish is then attuned and used from the WoDX actions menu (W20 p. 221; DA:W p. 92). No other kind of character is touched by holy ground through Interactables. 0.8.1 adds a caern stone, a wraith's fetter and a node: each is marked with its rating, and Use it opens the WoDX actions menu (the Fetter window for a fetter), where that line's own rolls are. | Ben, 9 November 2026: altars, relics and fetishes seventh. Built on the WoDX Actions rules already in place rather than new ones. Choices logged in PENDING-REVIEW.md. |
| B153 | 2026-11-09 | Watch points (Interactables 0.10.0): a tile marked as a watch point is a window on the street, a mirror, a telephone, a radio or walkie-talkie, or a bell, horn or alarm, tied to another tile by its id (or its UUID on another scene). Looking out of a window or into a mirror is Perception + Alertness at 6, a turn, silent: any success names the people in the tied tile's area, none gives only how many, a botch shows nothing; hidden and invisible tokens are left out, and a mirror leaves out Lasombra (the Storyteller is whispered who has no reflection; page ref to pin). What is seen goes in a whisper to the player and the Storyteller. A telephone (from about 1890) or a radio (from about 1930) calls the one it is tied to, and the Storyteller plays the other end; anyone can call for help. A bell raises the alarm, loud. Every watch result also goes out as a wodxMapEvent {kind, scene, place, at, noise, who, object, heard, supernatural}, the shape the responsive maps work uses. Version 0.9.0 is left to that work. | Ben, 9 November 2026: watch points eighth. Choices logged in PENDING-REVIEW.md. |
| B154 | 2026-11-09 | Mounts and vehicles (Interactables 0.11.0): a tile marked as a mount or vehicle is a riding horse, a mule or donkey, a cart or wagon, a carriage or coach, a rowing boat, a motor car (from about 1900), a motorcycle or a motorboat (from about 1910). One character takes the reins and others get on as passengers, up to its seats. With a dot of Ride (Drive for the motor kinds, Athletics for a rowing boat) getting on needs no roll; with none, the Attribute alone at +1 difficulty, the untrained Skill rule, applied by WoDX Actions' pool. At the reins: Keep control is Dexterity + Ride or Drive at 6 (Stamina + Athletics for oars), Go flat out the same at +3, as the riding and driving presets in WoDX Actions have them (V20 p. 258). A failure starts to lose control (roll again); a botch throws the one at the reins off a horse, mule or motorcycle, and crashes anything else; the Storyteller rolls the fall or the crash. Moving the token at the reins moves the tile and every passenger's token by the same step; a passenger who moves on their own gets off. Getting on, getting off, a crash and going flat out each go out as a wodxMapEvent (mount, dismount, crash, ride). | Ben, 9 November 2026: mounts and vehicles ninth. Choices logged in PENDING-REVIEW.md. |
| B155 | 2026-11-09 | Climbing, ledges and jumps (Interactables 0.13.0): a tile marked as a climb is a ladder or stairs (no roll), a rope or knotted sheets, a tree, trellis or drainpipe (5 yards a success), a rough wall or rocks (3), or a cliff or sheer wall (2), with its height in feet; climbing is Dexterity + Athletics at 6, extended, its successes kept for each climber, and a botch slips and falls from as high as the climb got (at least 3 feet) (V20 Dark Ages p. 332; V20 core printed p. 258). A gap to jump has its width in yards and its drop in feet: Strength + Athletics at 3 with a run-up, a yard a success (V20 Dark Ages p. 333); short of it, the character hangs from the edge and rolls Dexterity + Athletics at 6 to catch the ledge, or lets go; a botch falls straight. A fall is one bashing die a 10 feet, at least one, soaked through WoDX Combat (V20 core printed p. 296). A climb or gap tied to another tile moves the token there on arriving, straight, so nothing between is walked over; Undo moves it back. climb, jump and fall go out as wodxMapEvents. Mounts, in 0.13.0 (0.12.0 is the responsive maps work): a vehicle now keeps the driver's and each passenger's offset from it and goes to the driver's token at that offset, since Foundry snaps tokens to the grid and a step from the last known place could be wrong. | Ben, 9 November 2026: step 2 after the object list. Choices logged in PENDING-REVIEW.md. |
| B156 | 2026-11-09 | Targets on tiles (Interactables 0.14.0): a tile marked as a target is a target with rings, bottles or cans in a row, a practice dummy, or something to break. It is listed out of reach as far as anything on the sheet carries (three times the longest weapon range, or of a thrown stone), when the token can see it. Shooting uses each ranged weapon on the sheet, with its own Attribute, Ability, accuracy and difficulty, and WoDX Combat's range bands (+0 within range, +1 to twice, +2 to three times, none further; VtDA20 p. 347). Throwing something with no thrown weapon on the sheet is Dexterity + Athletics at 6 with a range of 10 yards (house rule). Striking a dummy within reach is Dexterity + Melee with a hand weapon on the sheet, or Brawl. A gun botch jams; a bow or throw botch is a wild shot the Storyteller places. Aiming is noted (a die a turn, up to Perception, through Bonus dice; V20 core, page to pin). |
| B157 | 2026-11-09 | Scoring and breaking (house rules): a target with rings scores by successes, 1 the outer ring (1 point), 2 the inner ring (2), 3 or more the centre (3), kept per character on the tile with shots and hits, cleared from the tile config; in the early eras (Dark Ages, or before 1600) its name is Archery butt. A row of bottles loses one a hit and is set up again within reach. Something to break has a build (fragile, light wood, heavy wood, stone, iron): a fragile thing shatters on any hit from a shot or a throw; anything else holds against shots and is broken within reach the way a door is forced, by the lifting chart (2, 4, 6 or 10) or an extended Strength roll (1, 3, 5 or 8 successes at 6 to 8; V20 Dark Ages p. 335 for the chart). Broken things and fallen rows show as Broken on the map and send a break event. |
| B170 | 2026-11-09 | WoDX Senses (0.1.0): a module of its own answers what a character sees, hears, smells and feels, in chat. It changes nothing in the world, so nothing goes to the approval queue; it is on in rothenstein-wodx and off in the Live world until Ben says otherwise. | Ben's request; the design study's recommendation, which Ben approved. |
| B171 | 2026-11-09 | Every sense line comes from authored tables (data/places.json, data/world.json) and the Storyteller's own lines; nothing is written by an AI at play time. The tables were drafted once and wait for Ben's reading (PENDING-REVIEW). | Rule 11; the study's option A. |
| B172 | 2026-11-09 | A plain look is free and gives what anyone notices; Look closer rolls Perception + Alertness at 6 (V20 p. 100), blind, and each success adds a line up to six. A botch gives only the free lines. One roll per sense, place and hour: asking again repeats the answer until something there changes. | House reading of V20's Perception rules and degrees of success. |
| B173 | 2026-11-09 | Difficulty steps (house rules): dim +1, dark +2, pitch dark: no sight; a noisy place +1, rain or storm outdoors +1 to hearing; storm or a stronger smell +1 to smell; powers take dots off; never below 3. | House rules, shown on the Storyteller's copy. |
| B174 | 2026-11-09 | Powers in the senses: Auspex is minus its rating and one wall further for sound and smell; the Gift Heightened Senses is -2, -3 in the wolf forms (DA:W p. 115); Eyes of the Cat sees in the dark (p. 114); Sense Wyrm, Sense the Unnatural, Scent of the True Form, Awareness and its like, Spheres at 1, the fae sight, second sight and a wraith's senses in the Shadowlands each add lines of their own. Obfuscate: Auspex at least equal rolls Perception + Awareness at 8, less 1 a dot above (V20 Dark Ages pp. 195, 224-226); second sight sees them with no roll. | Book readings as the existing WoDX data give them; V20 core page refs to pin. |
| B160 | 2026-11-09 | Responsive maps, step 1 (Interactables 0.12.0): a tile can carry a picture for each state of what it is (a container closed, open, forced, emptied; a fire burning or out; an altar whole, desecrated or taken; a trap hidden, found, sprung, disarmed), or follow a door or window by its wall id. The active Storyteller's client swaps the picture when the flags change, so every player sees it and it stays; Undo puts the flags back and the picture follows. A state with no picture shows a small marker with its word on each client (world setting "State markers"); clues and hiding places never show a state. Ambient sounds tied to a tile play while it is active. Each applied card becomes one map event (hook `wodxMapEvent`, again with undone: true on Undo), and each client that can see or hear it gets a floating word, a short flash for loud events and the tile's own sound (client setting "Map effects": Full, Light, Off). No effect modules (Sequencer, JB2A). | Ben, 9 November 2026: build the design note "Responsive Maps for WoDX" as recommended. Numbers from B160 for this thread. Choices logged in PENDING-REVIEW.md. |
| B161 | 2026-11-09 | Responsive maps, steps 2 and 3 (NPC 0.4.0): each NPC who heard a map event reacts by profile through the same reaction card as a WoDX: Reaction region (Suggest or Auto, Undo), with trigger "heard"; one asleep wakes instead and their routine pauses for half an hour. A scene can be on alarm: a keypad, bell or the Storyteller raises it, it holds an hour of world time, then the place is wary until the next dusk, then calm, and the clock posts a note at each step. Watchers there notice at difficulty 4 during the alarm and 5 while wary (6 when calm). Lights and sounds named in a "WoDX: Alert zone" region come on while the alarm holds. A door forced or a pane broken in a place someone owns or lives in is put right at the next dawn, on one card with Undo; a fire, a theft, a desecration or a wall broken through stays until the Storyteller says. A force, break, theft, fire or desecration at a faction's place is a wrong against that faction, which then picks Defend more often at its next turn; a desecration by something supernatural offers a rumour on a button, and nothing spreads unless the Storyteller presses it. Setting "NPCs answer what they hear". | Ben, 9 November 2026: build the design note as recommended. House figures, logged in PENDING-REVIEW.md. |
| B162 | 2026-11-09 | Responsive maps, step 3 (Storyteller 0.3.0): what a player's character does on the map goes into the tracker's log as one line ("Ilse forced the cellar door (heard by 2)."), a force, break, alarm, theft, fire or desecration marked for your attention; Undo on the card takes the line out. Lights, hazards, holy ground and noise nobody heard stay out of the log. A beat can fire on "A change on the map": a scene (blank: anywhere), and a kind or state such as forced, theft or broken (blank: any change), optionally for one character. | Ben, 9 November 2026: build the design note as recommended. |
| B163 | 2026-11-09 | Responsive maps, step 4 (NPC 0.5.0, Storyteller 0.3.1): a "WoDX: Trigger" region tells the Storyteller, raises the alarm, or only passes a map event on (kind trigger, state its own words) when a player character, or anyone if set, walks in; it can fire only once until reset. An Alert zone can carry its alarm to other places by name: a bell, horn or shout at once, a telephone from about 1890 and a radio from about 1930 at once, a runner after the trip's minutes (the zone's figure, else WoDX Storyteller's for that place, else 30). A carried alarm goes no further. Undo on the alarm takes back the places reached at once and turns back runners still on the road. A beat's map value now matches whatever the case. | Ben, 9 November 2026: build the design note as recommended. Era dates as WoDX Interactables' watch points. House figures, logged in PENDING-REVIEW.md. |
| B200 | 2026-11-09 | Weather (Atmosphere 0.1.0): each night's weather comes from the Chronicle's seed, the climate and the date, so the same world gives the same weather on every client and every reload. Seven climates (central, maritime, Mediterranean and northern Europe; the American east, the Great Plains, desert) carry monthly temperature, wet days, storms and fog; the climate follows the Chronicle's region unless the Storyteller picks one. Rain and dry spells run as a two-state chain so wet weeks come together; snow lies when it has fallen and stays cold. Any night can be set by hand and cleared again. | Phase 8 of the Master Plan. Climate figures are house approximations of 20th-century normals, logged in PENDING-REVIEW.md. |
| B201 | 2026-11-09 | The era shifts the weather (house figures): before 1300 a little warmer (+0.3 °C), 1300 to 1849 cooler (-0.5, -1.0 in 1645 to 1715), 1816 May to September much colder (-2.5, the year without a summer), 1980 to 2025 +0.7, after 2025 warmer by up to 3 °C with storms a third more often. | House figures from the general climate history; logged in PENDING-REVIEW.md. |
| B202 | 2026-11-09 | At the turn of each night the active Storyteller's client sets WoDX Actions' sky (clear, cloudy, overcast, storm; it caps sunlight as before), sets Foundry's weather effect on scenes that are out of doors (rain, storm, snow, blizzard, fog, leaves), and, on scenes that follow the clock, the darkness from the sun's height, the moon and the clouds. A scene where the Storyteller chose an effect by hand keeps it. This applies at once without the approval queue, since it is a setting and a look that undoes itself the next night; the Storyteller is whispered a card with tonight's weather and its house-rule steps. | Same pattern as the sky setting and the clock; logged in PENDING-REVIEW.md. |
| B203 | 2026-11-09 | Weather difficulty steps out of doors (house rules): thick fog +2 to sight, mist +1, a downpour or heavy snow +1; a gale, thunder, downpour or hail +1 to hearing; rain +1 and a downpour +2 to smell; snow on the ground makes tracks easier (-1); ice, mud or deep snow +1 to footing; fog thins the Shroud by 1 for a wraith's purposes (story aid only). WoDX Senses 0.2.0 uses these and adds weather lines to its answers. | House rules shown on the Storyteller's card; logged in PENDING-REVIEW.md. |
| B204 | 2026-11-09 | Era kits: each era profile has a kit (palette, a soft colour grade on the map, handout styles, music by mood, ambience by place and weather, and cues at dawn, dusk and a new item in the queue). Music and ambience are the Storyteller's own files in Data/wodx-kits/<kit>/; Build playlists turns them into Foundry playlists by mood and never duplicates one. WoDX ships only short procedural cues it made itself. A kit with no files of its own falls back to the kit before it. The grade can be Full, Light or Off on each player's client. | Phase 8 of the Master Plan; no third-party assets are bundled, so there is nothing to license. Credits journal for the Storyteller's own files. |
| B205 | 2026-11-09 | Handouts: fifteen styles from a manuscript to a phone feed, offered by era, each made as a journal in the folder WoDX handouts, hidden until the Storyteller shows it. All text is the Storyteller's. | Rule 11: no AI-written text at play time. |
| B206 | 2026-11-09 | Start a chronicle (Storyteller 0.4.0): a wizard sets the opening date, region, latitude and climate, then makes or updates the Storyteller screen (era, rolls, health, the WoDX tools), the players' era primer, the group actor, Session Zero and the Chronicle Rules journal. It opens by itself in the template world until it has run; anywhere else it is a button. Running it again updates its journals and makes nothing twice. The template world's world.json carries templateVersion 1. | Phase 8 of the Master Plan (the world template). Primer text drafted once for Ben's reading. |
| B207 | 2026-11-09 | The night's draw (Storyteller 0.5.0): one seeded draw a night, keyed on the night's date, gives an opening for the time of night (early, the dead hours, before dawn), an encounter in town and one on the roads for the era group (medieval, early modern, industrial, modern), one for the Penumbra and one for the Shadowlands when the chronicle's lines include Garou, mages or changelings, or wraiths, and a rumour naming the chronicle's own places and people. It goes to the approval queue; approved, it goes into the tracker's log and the journal WoDX nights. Draw again counts up a nonce. Drawing each night at dusk is a setting, off by default. | Phase 8 (encounters and rumours). Tables drafted once, editable as Roll Tables; logged in PENDING-REVIEW.md. |
| B208 | 2026-11-09 | Story aids (Storyteller 0.5.0): a dream, vision, augury or foreshadowing is built from the chronicle's own places and people, the character's own log first, with an era's symbol; approved, it is whispered to the character's players and kept in the journal WoDX story aids. A relic, fetish or talisman gives a name and a suggested rating 1 to 5, low far more often (house rule); the Storyteller sets it by the line's book. | Phase 8 (story aids). No AI text at play time: every line is in the tables. |
| B209 | 2026-11-09 | A road trip with no encounter table now draws from WoDX's own table for the wilds, seeded by the place and the hour, instead of saying no table is set. | Uses the new tables; the Storyteller's own table still wins. |
| B210 | 2026-11-09 | Otherworld journeys (Otherworlds 0.3.0): the Tempest by a Byway, the Labyrinth, or the Umbral roads, cut into legs (one for every two hours, one to eight), each with a landmark and a chance of a hazard (35%, 60%, 30%); in the Tempest and the Labyrinth a leg may meet the Maelstrom (5% and 10%, 40% in the years of the Second, Third and Fourth Great Maelstroms or when the Storyteller says one rages). Seeded; through the approval queue; approved, a card for the Storyteller (and the travellers' players when ticked) and a line in the tracker. | Phase 8 (Otherworld travel). House figures, logged in PENDING-REVIEW.md. |
| B211 | 2026-11-09 | The Shadowlands' decay: when the token a client controls stands on a Shadowlands level, the map greys and rots by the local Shroud (strength 1 at Shroud 4, 0.6 at 7 or unknown, 0.2 at 10), as a CSS filter on that client only, joined with the era grade. Client setting, on by default. | Phase 8 (Shadowlands decay overlays by the local Shroud). House look. |
| B212 | 2026-11-09 | Token frames (Atmosphere 0.2.0): a ring or a square in the era kit's material (black iron, gilt, brass, saddle leather, gunmetal, chrome, old blood, neon, bronze, gold and lapis) round each player's character, or every token with a character, or none (world setting), and off on any one computer (client setting). Drawn with Foundry's own graphics, redrawn only when the era or the token's size changes. | Phase 8 (token frames). House look. |
| B240 | 2026-11-09 | The Dark Ages: Mage Grimoire (WoDX Actions 3.15.0): its 73 rotes join the core book's 19, as 78 entries (rotes with two ways, such as Healer's Sight by Spring or Winter, or Exorcism by Wise One or Chieftain, are two entries). Each shows "[Grimoire]" in the rote list and "Grimoire p. N" on its card (printed pages). Spirit-Talkers and Valdaermen roll Sensitivity or Blot + the Pillar, as for every Dark Ages spell. | The last open Phase 6 item (Phase 6f put the Grimoire off). Mechanics in docs/research/da-grimoire-notes.md. |
| B241 | 2026-11-09 | The calendar in casting (Grimoire pp. 110–111): on the first day of each season (21 March, June, September and December on the Chronicle clock) the cast window asks whether the spell suits the season (−3) or goes against it (+3); on a Sunday a Messianic Voice's instantaneous spell is −1. The +3 can push past 9 into extra successes, as any difficulty does. | Grimoire rules; the dates as the book gives them, read off the Chronicle's own calendar (Julian or Gregorian as the year has it). |
| B242 | 2026-11-09 | Specialties (Grimoire p. 112): a Foundation specialty (from the fellowship's list) gives +1 die to a casting within it; a Pillar specialty re-rolls 10s when that Pillar is used, the new dice adding only successes. Both need 4 dots; both are kept on the Fellowship and Pillars window. An offering to the Moon at night gives 1 (a prayer in blood), 3 (a calf) or the Storyteller's points, +1 under a full moon, for magic fitting the phase. | Grimoire rules; the reading of the re-roll and the full moon is logged in PENDING-REVIEW.md. |
| B243 | 2026-11-09 | Countermagic (Grimoire pp. 122–123): each fellowship's own way at its Pillar level (Al-Hajj 4, Uri-El 4, Winter 4, Primus 3, Trickster 5, Galdrar 4 and the higher ones), cast as a simple spell at that level, 1 Quintessence, successes cancelling the spell's one for one. Using the Art: the Grimoire's table of Pillar levels by fellowship for common effects, its guide for new effects by level, and its wonders, in one searchable window. | Grimoire rules. The new menu key is daCountermagic, since the fae already have daCounter. |
| B244 | 2026-11-09 | Certámen (Grimoire pp. 119–122), run by the Storyteller: the stake, each duellist's locus, aegis and gladius Pillars (+1 to all rolls for each extra use of one Pillar), the contest of wills (Manipulation + Intimidation at the other's permanent Willpower; the winner +1 die to the locus, a botch −1), the locus (Foundation + Pillar at 6, then 7 and 8 if both fail; each success puts a Quintessence of the mage's own in), then strikes: gladius alone against the stance's attack difficulty, aegis against its deflection; a hit rolls Foundation + 1 per success past the deflection, soaked by Foundation dice, each unsoaked success knocking a Quintessence out. An empty locus or a yield ends it: the winner takes back its own locus plus half the loser's. | Grimoire rules. Cheating with Primus is left to the Storyteller. Figures the book leaves open are logged in PENDING-REVIEW.md. |
| B250 | 2026-11-09 | Feast and fast days (WoDX Chronicle 0.6.0): the Western church year on the Chronicle's own calendar. The great feasts (the list WoDX NPC's routines already used, now kept in Chronicle's church-rules.mjs), the movable days from Septuagesima to Trinity Sunday, the vigils, the four Ember weeks, Lent (Sundays excepted), Advent, Christmastide, Eastertide, and Fridays without meat. The Chronicle Clock shows the day and the season for everyone. | The Master Plan's Chronicle list ("a Dark Ages church calendar of local feasts and fasts that shapes crowds, curfews and the hunt"). The dates are reckoned, not taken from any game book. |
| B251 | 2026-11-09 | What the church day does, behind the house rule "Feast and fast days" (on by default): a night of revel (Christmas Eve, Twelfth Night, Shrove Tuesday, Holy Saturday, St John's Eve, Martinmas) is busy, WoDX NPC's curfew starts at midnight and hunting in town is 1 easier; a fast kept strictly (Lent, Ash Wednesday, Good Friday, vigils, Ember days) is quiet and hunting in town is 1 harder. Hunting in the wilds and at a caern is never changed, and a plain Friday changes only the food. How strictly the year is kept follows the date: strictly before 1600, by custom until 1850 (feasts as holidays, no hunting step for fasts), lightly after (only Christmas Eve, New Year's Eve and Shrove Tuesday revel). | House rules: no oWoD book gives a figure. The 1 step matches the size of the area steps in V20 p. 260 and V20 Dark Ages p. 334. Logged in PENDING-REVIEW.md. |
| B252 | 2026-11-09 | WoDX NPC's "Use a power" plan is aimed by WoDX Targeting's own ranking, as a hostile power at line of sight (the tag "h.s"), until the Storyteller picks the real power: the card names the target and why ("on Anezka", "engaged in melee"), and accepting the plan sets that target before the actions menu opens, so the power window's panel starts on it and can change it. With Targeting off (for the world or on that computer) the plan is as before. | The open Targeting item. One picker for players, the Storyteller and NPCs; the NPC's choice stays a suggestion the power window shows. |
| B253 | 2026-11-09 | Living maps (WoDX Interactables 0.15.0): any tile can carry a living rule, set in its config: it shows only while the rule holds, hides while it holds, or changes its picture while it holds and goes back after. A rule is the conditions ticked (the four seasons, night or day, snow on the ground, rain, fog or mist, a feast day, a night of revel, a fast day or Lent), a dated event before or after it, and a span of years, all of which must hold. The active Storyteller's client looks at every living tile on every scene when the moment changes (the date, day and night, tonight's weather from WoDX Atmosphere, the church day, the events that have happened), and not at all while the world is held. | The Master Plan's Chronicle item "Living maps: tile states follow the clock and events: snow by season, plague crosses on doors, a burned mill after the fire, lanterns on feast nights". Built in Interactables because tile pictures and their config already live there (Responsive maps). The calendar drives what the map shows even with the house rule "Feast and fast days" off, since that rule is about rolls. |
| B254 | 2026-11-09 | Per-character senses on each player's own screen (WoDX Senses 0.3.0). Frenzy draws a red edge round the screen of the player whose character is in it; Rötschreck drains the colour from the map (and wins when both are on); each player can turn it off on their computer. A character in Crinos, Hispo or Lupus (the forms the sense answers already treat as a wolf's nose) sees faint trails where other tokens walked in the last hour of world time, as far as smell reaches with one step (16 yards); tokens the Storyteller hid, and the unseen not yet found, leave none. | The Master Plan's Otherworlds item "the other per-character senses". Put in WoDX Senses, which is off in the Live world, so nothing changes there. The trail length and reach are house figures. |
| B255 | 2026-11-09 | The unseen show only to those who find them (WoDX Senses 0.3.0, world setting, on): a token with no player of its own, hidden by Obfuscate, sneaking or the Invisible status, is not drawn for a player unless one of that player's characters is on its "seen by" list, and then only where light and walls let them see. The Storyteller fills the list from the token's HUD (Who sees through it?), which rolls for every player character on the scene with WoDX NPC's notice(): Auspex against Obfuscate by the era's book (V20 p. 142; V20 Dark Ages p. 195), else Perception + Alertness against Dexterity + Stealth (V20 Dark Ages p. 169). Player characters are never hidden from the other players. | The Master Plan's "hidden tokens shown only to whoever beats the concealment". One set of noticing rules for NPCs and players. Keeping the party visible to each other is a table choice, logged in PENDING-REVIEW.md. |
| B256 | 2026-11-09 | Revenant birth (WoDX Creation 0.9.0): a mortal of one of the twelve revenant families stays on the Mortal sheet, set up as a ghoul's is (blood pool, Virtues, Disciplines), with Potence 1 and one family Discipline, or two family Disciplines and no Potence (G&R pdf 120–122 / printed 119–121). Blood pool 10, starting at 1 and made back at 1 a night (the sample revenant, pdf 141 / printed 140). The family, its weakness and the way are kept on the sheet; the chat card gives the first-power limit and the experience costs. | V20 Ghouls and Revenants. The book gives no age for the blood to show, so the Storyteller marks it when the story does. |
| B257 | 2026-11-09 | The Chrysalis (Creation 0.9.0): a Changeling sheet is made from the mortal's, keeping Attributes, Abilities and the life story (house rule; C20 builds the character fresh), with Willpower 4 (the mortal's if higher), Glamour 4 and Banality 3 and the seeming's step (a childling +1 Glamour, a grump +1 Willpower, a wilder either), and Arts 3 and Realms 5 left to spend (C20 pdf 145, 149 / printed 144, 148). The mortal's sheet is filed in "WoDX · Before the Chrysalis" and the two are linked. | Changeling: The Dreaming 20th. |
| B258 | 2026-11-09 | A Fallen takes a host (Creation 0.9.0): a Demon sheet is made from the host's, keeping Attributes, Abilities, Backgrounds and the life story (the host's memories, DtF pdf 125 / printed 124), with Faith 3 and Torment by House (Devils, Devourers and Slayers 4, the others 3). The host's Conscience and Courage stand as the demon's, at most 3 each, and Conviction starts at 1, before the 3 Virtue dots (house rule: the book leaves the blend to the player); Willpower is the two highest Virtues added. Conviction is kept where the sheet keeps Self-Control. A Fallen whose host dies rolls for a new one: Willpower at 8 for an ordinary body, 6 for a thrall, none for a willing thrall, 9 for an object, 6 for one that suits it (pdf 260 / printed 259). | Demon: The Fallen. |
| B259 | 2026-11-09 | The Second Breath (Creation 0.9.0): a Vampire sheet set to Kindred of the East is made from the mortal's, keeping Attributes, Abilities and the life story (house rule), with Yin 1, Yang 1, Hun 1, P'o 3, Dharma 1, Chi equal to Yin and Yang, and Willpower 5, or the mortal's if higher, never above Hun + 5. Four Chi dots and three Disciplines (one a Demon Art) are left to spend. A chih-mei can be marked on the card. | Kindred of the East pdf 70, 78, 82, 86. |
| B260 | 2026-11-09 | The Near Dreaming (WoDX Otherworlds 0.4.0): any scene can get a Near Dreaming level (elevation 3000) showing its own map, warmer, from the Penumbra and Shadowlands window. A Storyteller's gateway tool takes the selected tokens in or out: a changeling steps through; anyone else meets the Mists by Glamour less Banality (C20 pdf 304-305 / pp. 303-304), in five steps of WoDX's wording, on the way in and on the way out (how much is remembered). Banality 10 bars the way; a creature with no Glamour goes only if enchanted; a sheet with no Banality counts as 7. | C20. The chart's exact rows are to check on the PC (PENDING-REVIEW). |
| B261 | 2026-11-09 | Trods (Otherworlds 0.4.0): a trod is a Teleport Token region on two scenes' Near Dreaming levels, of a kind (the Silver Path, a Path of Balor, a twilight road) and a gateway kind, made from the same window as a moon path. A journey on a trod draws from its own tables and carries its time: as planned two times in three, quicker or slower one in four, a day to a week late one in ten (house figures; the book says only that time on trods is unreliable, C20 pdf 53 / p. 52). Wayfare 3 with Fae 5 opens a portal (Wayfare + Fae at 8; 5 successes pick the trod; pdf 309 / p. 308). | C20. |
| B262 | 2026-11-09 | The moon's roads (Otherworlds 0.4.0): journeys gain a Moon Path and a Moon Bridge, with their own tables; their hazards are halved at the full moon and half again at the new (house figures; W20 pdf 321-322 / pp. 319-320 says only that they are safest at the full moon). A Moon Bridge is one leg, a thousandth of the time. The Otherworld rolls window rolls the Rite of the Opened Bridge (Wits + Enigmas at 8 less the caern's level, +3 dice for a matching totem, +1 difficulty after a failure, successes equal to the far caern's level; pdf 209 / p. 207) and gives a bridge's reach by caern level (pdf 313 / p. 311). | W20. |
| B263 | 2026-11-09 | The Avatar Storm and the Great Maelstroms by date (Otherworlds 0.4.0): a world setting, By the date (the default: on once the chronicle's Avatar Storm event has fired), Raging, Fading or Never happened. While it rages, a mage's token reaching a Penumbra level makes the Storyteller's Shredding Winds roll: permanent Paradox + Arete at 6, each success a level of aggravated damage (lethal or bashing while it fades), Paradox only with Shield of the Soul (M20 pdf 480-481 / pp. 479-480). Journeys now find the Great Maelstrom years from the chronicle's fired events (the Second to the Sixth), so the Sixth only rages where its event is switched on. The rolls window also gives a Maelstrom's damage by bells and a Haunt's shelter (Wr20 pdf 351, 355, 361). | M20, Wraith 20th. |
| B264 | 2026-11-09 | Disembodiment (Otherworlds 0.4.0): a new status, Beyond the Penumbra, records when it was put on; three phases of the moon later (about 89 days) the Storyteller gets one approval card. Approved, the sheet's record marks it begun; the book gives no roll or stages (M20 pdf 89-90 / pp. 88-89). | M20. |
| B265 | 2026-11-09 | The Net (Otherworlds 0.4.0): from 1990 (house rule), a player button jacks the selected character in or out (a status; the body lies still and senses nothing, house rule), and the rolls window runs Net combat: Intelligence + Computer at 6 each side, Program Strength as automatic successes, the difference as damage dice soaked by Wits and protection; a system has 3 Intelligence for each 2 CPUs and Computer 5 (World of Future Darkness, scan p. 9). Layer sound: each player's own computer plays a loop for the world its token stands in (penumbra, shadowlands, dreaming or net .ogg in the Storyteller's folder, wodx-kits/layers by default); a missing file plays nothing; a client setting turns it off. | WoFD; house rules logged. |
| B266 | 2026-11-09 | Dawn dread (Atmosphere 0.3.0, Actions 3.16.0): the Sunset cue's mirror. In the last half hour before sunrise each player's screen edge pales toward the sun (stronger as it nears), birdsong sounds at twenty minutes and a cock crows at ten (two procedural cues shared by every era, in sounds/common; a kit folder can replace them). Rötschreck pressure is a house rule: in the last ten minutes the Rötschreck window's modifier starts at +1 and says why, and the Storyteller gets one card a night; a world setting turns it off. The books give the sun its own Rötschreck difficulties but none for the hour before it. | House rule logged. |
| B267 | 2026-11-09 | Sound through walls (Atmosphere 0.4.0): Foundry already muffles a sound behind walls when the sound has walls on and a muffled effect; WoDX sets both. A sound placed by hand is stopped by walls and heard through a low-pass at intensity 5 (world setting, on by default; a sound placed with walls off is left as it is). The Atmosphere window's This scene part counts the muffled sounds and muffles or frees them all. | House default logged. |
| B268 | 2026-11-09 | NPC movement on gridless scenes (NPC 0.6.0): WoDX lays a square lattice of the scene's grid size over a gridless scene and walks it exactly as a square grid, round walls, for combat turns (closing in, fleeing) and routines. A token snaps to the lattice when WoDX moves it. A world setting turns it off, and then the card says to move the token by hand as before. | House choice logged. |
| B269 | 2026-11-09 | Personal themes (Atmosphere 0.5.0): a player character can have a short motif (an audio file chosen in the Atmosphere window). Everyone hears it at the start of that character's turn in a fight, at most once a minute so quick rounds do not stack it, or whenever the Storyteller presses Spotlight. WoDX ships no themes. A world setting turns it off. | House choice logged. |
| B270 | 2026-11-09 | Places that age (Atmosphere 0.6.0): a scene can hold other pictures of the same map, each from a year on (the town in 1348, 1620, 1890). The Storyteller's client swaps the map's picture (on the map's own level in Foundry 14, not the Otherworld layers) when the chronicle's year changes, at the end of a time skip, when an era is applied, and at start. Before the first year the scene shows its own map. Removing every year puts it back. The pictures are the Storyteller's own; WoDX ships none. | House choice logged. |
| B271 | 2026-11-09 | Faces that age (Atmosphere 0.7.0): the Storyteller gives a character a year of birth in the Atmosphere window. From forty on, one step a decade (five steps, the last from eighty), the Storyteller's client writes an aged copy of the portrait and the token art (colour drained toward grey and a warm fade, softer contrast) to the world's wodx-faces folder and shows it on the sheet, the prototype token and the placed tokens. Mortals and the living lines age; vampires, wraiths, the Reborn and creatures do not. A ghoul keeps the age at which the blood was first drunk (given, or counted the day aging starts) until the Storyteller marks it cut off from the blood; then the true age shows (V20 Dark Ages, ghouls). A picture chosen for an age replaces the filter on the portrait. Stopping puts the original pictures back. | House choice logged. |
| B272 | 2026-11-09 | Layer looks (Otherworlds 0.5.0): the Penumbra and the Shadowlands keep their silvered and drained twin art (and the Shadowlands its decay). Standing on a Near Dreaming level, a viewer's map shimmers: richer colour with the hue easing 28 degrees one way and back every seven seconds. A character jacked into the Net sees the map as glowing green and cyan lines (an edge filter). Both run on the viewer's own client, join WoDX Atmosphere's map grade, and a client setting turns them off. | House choice logged. |
| B273 | 2026-11-09 | Queue relief (Chronicle 0.7.0): each entry in the approval queue has a tick box, and Approve the ticked or Reject the ticked decides every ticked one at once (untick the exceptions). Under Approve on its own the Storyteller ticks kinds of proposal that are approved the moment they arrive; they are listed as approved on its own, and a player's own request always waits. A world setting caps the WoDX NPC proposals (faction moves and the like) that reach the queue in a session; the rest are held back, and the window offers to put them in. A session starts when Foundry starts or when a session is begun in WoDX Storyteller. Every standing rule starts off. | House choice logged. |
| B274 | 2026-11-09 | Knowledge-gated handouts (Chronicle 0.8.0): in any journal text, @Know[Latin]{words} shows the words only to a player whose character knows Latin; @Know[Occult 3]{words} needs three dots of Occult; "or" joins choices; a name with no dots means the language, or one dot in that trait. A letter read through its seal is @Know[Auspex 2]{words} (Spirit's Touch, V20 core; the page is still to pin). Each client draws its own view: the Storyteller sees every passage with who may read it; anyone else sees the words scrambled, and a script blurred. The text is still in the world data, so this keeps honest players honest, not a determined one. | House choice logged. |
| B275 | 2026-11-09 | Dreams and visions you write (Storyteller 0.6.0): the Storyteller writes a dream for any character and gives it a date and hour (8 in the morning by default, in the day's sleep) or none. When the clock passes that time, or a time skip crosses it, the Storyteller's client makes a journal in the folder WoDX dreams that only the dreamer's players (and the Storyteller) can open, and whispers them a card with its link. Without a time it waits for Release now. Who may dream is not limited to Malkavians, Garou, changelings and mages; that is the Storyteller's call. | House choice logged. |
| B276 | 2026-11-09 | A player codex (Storyteller 0.7.0): each player character gets a journal, Codex: name, in the folder WoDX codices, that only that character's players and the Storyteller can open. The Storyteller reveals a journal, or the page in view, from the journal's header (Reveal to a codex) or the journal list's menu, ticking the characters who learn it. Each gets a copy dated with the chronicle's day, and their players a whispered line. Revealing again updates the copy. Knowledge-gated passages stay gated in the copy. | House choice logged. |
| B277 | 2026-11-09 | The rumour network (Storyteller 0.8.0): a rumour starts when the night's draw is approved (its rumour line) or by hand in The rumour mill, with one teller (named, or someone on the scene in view). Each night every knower tells up to two people they talk to who have not heard: the members of their factions and the characters with tokens on the same scene; players' characters are left out, since they hear in play. Seeded by the chronicle, so the same night spreads the same way. Three nights with nobody new and it goes quiet. A long skip works through at most 60 nights. A world setting turns the spreading off. No book gives rules for this; the numbers are house readings. | House choice logged. |
| B278 | 2026-11-09 | Prelude and Embrace scene templates (Storyteller 0.9.0): one template per line (Embrace, ghoul's first draught, First Change, Awakening, Chrysalis, death into a wraith, a hunter's first sight, a mummy's Spell of Life, a demon's host, a revenant's birth, a mortal's life before) in three parts, Before, The turn and After, as questions and beats for the Storyteller, then the Creation button that records it. No lines for NPCs to say. The sheet suggests the line (ghoul and revenant by variant); the Storyteller can pick another. Hunters follow the era: the calling before 1500, the first sight until 1998, the Imbuing from 1999. The journal is the Storyteller's only, in WoDX preludes; a bare night scene with a note that opens it is optional. The prompts are WoDX's own, drawn from how the books frame each change, with no text taken from them. | House choice logged. |
| B279 | 2026-11-09 | The Storyteller's dashboard (Storyteller 0.10.0): one read-only window, from the toolbar, with four lists. The party: each player's character with where it is, how far ahead of the clock, wounds, Willpower, blood (only for those with a blood pool) and conditions, the worst off first. Clocks: everything with a time still ahead, soonest first: timed effects running out, beats on a time, dreams, the next five dated events and the next dawn. Open threads: beats waiting on a place, a flag or the map, beats with no time, live rumours, and the approval queue. Consequences: open debts, oaths, boons and grudges from the Ledger, overdue first, then by date, undated last. Each list has a search box and a button to the window where it is changed; the dashboard itself changes nothing. | House choice logged. |
| B280 | 2026-11-09 | Adaptive sound (Atmosphere 0.8.0): the era music follows four tensions, strongest first: frenzy (a player's character with the Frenzy or Rötschreck condition; the kit's new frenzy playlist, else combat), combat (a fight running), the hunt (a player's character invisible, hidden or stalking; the tension playlist), quiet (the mood the Storyteller last chose). It changes only when the tension changes, so music the Storyteller stopped by hand stays stopped until something happens. A world setting holds one tension by hand; another turns it off and brings back the old combat switch. The heartbeat is house rule, since the books give no sound: for a player's own character with a blood pool, from 4 blood or fewer (a third of a small pool when that is lower), 50 to 110 beats a minute and louder as the pool empties, synthesised in the browser with no sound file, each player can turn it off. | House choice logged. |
| B281 | 2026-11-09 | Printable props (Atmosphere 0.9.0): any journal (handouts first of all) and any scene's map print through the browser's own print window, where Save as PDF makes the file. No PDF library: the browser lays out the era's handout styles and fonts best. Each journal page goes on its own sheet; Storyteller secrets are left out; colours print as on screen. A map prints as drawn (Rothenstein's maps are already night maps), across the sheet when wider than tall, fitted to one page. Storyteller only: a Print button in the journal's header and Print entries in the journal and scene menus. | House choice logged. |
| B310 | 2026-11-09 | Carried light (Interactables 0.16.0): a flame button on the token HUD lets a player light a candle, a torch, an oil lantern or, from 1899, an electric torch. It is a light on the token in the scene's units and burns down on the clock (torch 1 hour, candle 4, lantern 8, electric torch 2, 6 from 1960). Out of doors, wind puts out a candle and a downpour, gale or storm puts out a torch or a candle. The token's own light comes back when it goes out. The owner is told when it burns low and when it goes out. Nothing burns while the world is held or a skip runs; the fuel is worked out from the time lit when it does. |
| B311 | 2026-11-09 | The character's state on screen (Senses 0.4.0): the frenzy screen now also shows the sheet's state for the player's own character: wound penalties (V20 −1, −2, −5, Incapacitated), Kindred under the hunger line, Rage at its full rating, a wraith's Angst above Willpower, Paradox, Banality and no Willpower left. One edge (the weightiest) and a short line of words at the top; no animation. A client setting turns it off. |
| B312 | 2026-11-09 | Time as the era tells it (Chronicle 0.9.0): house rule eraReckoning, on by default. A player's Chronicle Clock shows the church's hours and the day by its feast or season before 1350, a striking clock's quarter hours from 1350, a 12-hour clock from 1840 and a 24-hour readout in the Future Darkness era. The Storyteller's clock is unchanged. |
| B313 | 2026-11-09 | Letters and news that travel (Storyteller 0.11.0): a player button sends a letter from one's character to another player character or to someone the Storyteller plays, by messenger, post (1500), telegram (1844 to 1990), telephone (1890; far calls from 1927), e-mail (1995) or the Net (Future Darkness branch). It arrives on the clock. The Storyteller sees each one when sent and can hold it back; nothing is intercepted by a roll. Letters to Storyteller characters are whispered to the Storyteller to answer. |
| B314 | 2026-11-09 | A scene's opening card (Atmosphere 0.10.0): when a player's view moves to another scene, a card shows the place, the date as the era tells it and, out of doors, the weather, for five seconds. Not for battle maps or scenes marked in the Atmosphere window; client setting to turn it off. |
| B315 | 2026-11-09 | Faces you have met (NPC 0.7.0): world setting, off by default. Players see a short description under an NPC's token until one of their characters has been introduced from the token HUD. Chat, the combat tracker and sheets are not changed. |
| B320 | 2026-11-09 | Between nights (Storyteller 0.12.0): a time skip of a night or more puts one proposal in the approval queue with what the nights cost each player character: a blood a night on rising (VtDA20 p. 340; Golconda one a week; none in torpor) and Willpower one a night when WoDX Actions' Willpower recovery is set to nightly (VtDA20 p. 309). Approving applies it as amounts, so later sheet changes are kept, and posts a card with Undo. Healing over the skip stays WoDX Actions' own. Pass the Years skips are left to its own plan. When Dawn and dusk is automatic the nightfall card settles the last night, so the plan counts one fewer. |
| B321 | 2026-11-09 | Ties that need tending (Storyteller 0.12.0): ties come from the sheet (a ghoul's domitor from the lineage, Fetters, Passions, and Herd, Domain, Hunting Grounds, Retainers, Allies, Contacts, Kinfolk, Mentor and Dependents above zero) plus ties the Storyteller adds. Each has a period (house rule: 30 days; Domain 7, Mentor 60) and a last tending; a ghoul's last drink from the lineage counts. Once a game day the ties that came due go to the Storyteller on one card, each once, with Tended buttons and what the books say happens (V20 Dark Ages p. 399; Wraith 20th pp. 306, 309). Nothing changes on the sheet by itself. Followed: player characters, ghouls of player characters, and anyone given a tie. |
| B322 | 2026-11-09 | Hunting grounds and heat (Storyteller 0.12.0, Actions 3.17.0): each scene can be given one of the Hunt's grounds (VtDA20 p. 334), and the Hunt opens on it. Heat is a house rule: +1 a hunt, +2 a botch or a feeding recorded as seen, −1 a quiet week, 0 to 10. Uneasy (3) +1 difficulty, Watched (5) and Hunted (7) +2. At Hunted the era's answer goes to the approval queue: the Church and the Inquisition to 1499, witch-finders and the watch to 1799, constables to 1889, police and the press to 1998 (Hunters Hunted II), cameras and the imbued from 1999 (Hunter: The Reckoning); approving starts a rumour. A player's hunt reaches the Storyteller by socket. |
| B323 | 2026-11-09 | Boons and prestation from the simulated systems study are already in the Ledger (Storyteller 0.2.0), so no new build. |
| B324 | 2026-11-09 | A Gauntlet that moves (Otherworlds 0.7.0): the era's chart already gives each kind of place its Gauntlet, so the drift is a scene flag on top, house rule: +1 for Wyrm taint, a desecration, the Weaver building or a caern left untended; −1 for a rite at the caern, the Wyld returning or the taint cleansed; between −3 and +3, the result kept to 1 to 10 and 0 left at 0. A supernatural desecration or fire on the map proposes +1 through the approval queue. "A caern" is a kind of tie in the Storyteller's Ties window. |
| B325 | 2026-11-09 | Banality of places drifts on its own track in the same record (C20 rates a place 0 to 10): −1 when dreams and art feed it, +1 for crowds and disbelief; only places with a Banality rating move. |
| B326 | 2026-11-09 | Plague years (Storyteller 0.13.0, Actions 3.17.1): in a year of a known outbreak (the Black Death 1347 to 1351, its return 1360 to 1363, the war plague 1634 to 1635, the Great Plague 1665 to 1666, cholera 1831 to 1832, 1848 to 1849, 1866 and Hamburg 1892, influenza 1918 to 1920), the Hunt says so and that blood from the sick can carry it on. No numbers change. |
| B327 | 2026-11-09 | Paradox over time was already built (M20 shedding, backlash, the wheel in WoDX Actions). Consensus by era and money by era wait for book checks (Sorcerers Crusade; Resources in V20 and V20 Dark Ages), so they are not built yet. |
| B328 | 2026-11-09 | Money by era (Storyteller 0.14.0): V20 (pp. 115-116) and V20 Dark Ages (pp. 181-182) give no sums, so WoDX tracks the way a character lives by Resources, with away-from-home and neglect clocks from the same pages, and a monthly card for the Storyteller. Raising money fast follows the V20 example (p. 252): extended Wits + Finance, a roll a night, difficulty 7. |
| B329 | 2026-11-09 | Money house rules: 1 dot away lives at 0; 4 dots away counts as neglected; 5 dots neglected counts like 4; coins of the day from history (German lands default, England and France as choices). |
| B330 | 2026-11-09 | Consensus by era (Actions 3.18.0): the M20 Cast reads the chronicle's year. Before 1450, no split (Dark Ages: Mage pp. 97, 136-139); 1450 to 1699, casual and vain (Sorcerers Crusade pdf pp. 241-249) with a suggested kind from the caster's style against the place's accepted styles (a stranger's magick is vain), a Fortune Die on each cast (1 Bane, 10 Boon, either spends the Scourge), purification instead of weekly shedding; from 1700, M20 with optional Reality Zones (pp. 611-612), off by default. Difficulty and Scourge gained use the same steps as M20, as the book does. The years are a house rule. |
| B331 | 2026-11-09 | Fortune Dice size bands are a house rule: 1-4 small, 5-9 marked, 10-14 grave, 15+ a catastrophe or a miracle. |
| B340 | 2026-11-09 | Paperdoll tokens (WoDX Paperdoll 0.1.0): faces from DiceBear's Lorelei (design CC0 by Lisa Wischofsky, code MIT), bundled in the module. The picture is head, shoulders and chest inside the era's ring; carried things are never drawn (Ben, 9 November 2026). |
| B341 | 2026-11-09 | Clothes fit by measurement: each head is drawn once in key colours and measured (neck base, shoulder line, jaw, face outline, outline of head and hair); every garment edge is built from those anchors. Under a veil the head is drawn with close hair, since no hair shows. |
| B342 | 2026-11-09 | Pictures are baked on the Storyteller's computer (players need no upload rights) as 512 px WebP files named by what they show, in the world's paperdoll folder, and set on the prototype token and linked tokens. When WoDX Atmosphere draws token frames round the character, the picture leaves its own ring out. Headwear must clear the ring's inner line by a margin; the picture is lowered until it does. |
| B343 | 2026-11-09 | House rule art for the health track: Bruised a cheek bruise and a graze; Hurt a split lip; Injured a black eye; Wounded a bleeding cut over the brow; Mauled a second cut and the colour going; Crippled a bandage; Incapacitated paler still. Moods from Lorelei's own brows and mouths: disgruntled when Bruised or Hurt (or the player's chosen mood), upset from Injured, grim from Crippled, snarling in frenzy. A world setting and a per-character box turn it off. |
| B344 | 2026-11-09 | First clothes kit: Dark Ages, about 1200 (gown, mantle with lining and ring brooch, veil and wimple, pleated fillet), from public-domain references (Hortus Deliciarum, Eleanor of Aquitaine's effigy, the Maciejowski Bible). Other eras show these clothes until their kits are drawn. Werewolf forms are not drawn yet. |
| B345 | 2026-11-09 | Incapacitated closes the eyes (Ben, 9 November 2026): Lorelei eyes variant19 with grim brows and a slack mouth (sad09). It wins over the frenzy snarl. |
| B346 | 2026-11-09 | More faces (Ben, 9 November 2026: "a wide variety of facial shapes, features, skin colors"): WoDX draws its own parts on Lorelei's face in Lorelei's line style: build of the face (width and length scaled from the neck base, anchors measured on the scaled head), age lines, complexion, marks, scars and facial hair. They sit in Lorelei's fixed feature positions inside the same transform as the head, under a mask made from Lorelei's drawing of the same face with skin white and everything else black, so they show only on visible skin and never cross hair, eyes or the face's edge. |
| B347 | 2026-11-09 | Random faces: human skin tones only (the six pallid ones are a choice, not a roll); age weighted to grown adults and never a child; grey hair more likely with age; about half the faces have a complexion, three in ten a mark, two in ten a scar, four in ten facial hair, without regard to gender. |
| B348 | 2026-11-09 | Paperdoll illuminated finish (Ben, 9 November 2026, liked the second set of examples): every picture is finished like the Rothenstein NPC art: gold leaf or a starred ground, Lorelei's black ink turned sepia, lips, brows and nose tinted, paper grain and fibres over the figure, woven cloth, a gilt neckline trim with red beads (not under a veil), and a gilt ring with a coloured inner ring. The ring follows the frame's shape (round or square). When WoDX Atmosphere draws the token frame, the picture leaves its ring out as before. |
| B349 | 2026-11-09 | Paperdoll eyes and afflictions: irises drawn on the pupils, found by drawing the face once with magenta eyes (pupil = magenta with no skin within 10 pixels); 11 natural and 12 strange colours (slit pupils, none, a glow). 14 afflictions drawn on the skin under the skin mask; the lost eye and the patch cover the near eye and hide its iris, the patch strap runs under the mask so it goes from sight under the hair. Random looks: natural eyes only; 6% get pox scars, warts, a lost eye, a patch, a burn, a mangled face or leprous nodules. |
| B350 | 2026-11-09 | Paperdoll background (Ben, 9 November 2026: "Allow players to choose what background they would like. Let generated NPCs receive whichever fits them thematically."): the look keeps a ground and an inner ring; left empty, both come from the actor type (and the system's variant): Vampire red/Kindred ring, Mage lapis, Hunter parchment, Werewolf and Changing Breed verdigris, Changeling purple, Wraith night, Demon embers, Mummy and Exalted gold with a creature ring, Creature verdigris (night for spirits), ghouls and revenants gold with the sworn ring, other mortals gold. |
| B370 | 2026-11-09 | Long tasks roll on the world clock, one roll an interval passed, at most 60 a clock change; the rest roll at the next change. A paused task's next roll comes one interval after it resumes. Rolls are made on the active Storyteller's client and post one card per character with Undo. |
| B371 | 2026-11-09 | The pool for a long task is read from the sheet at each roll (Attribute + Ability + extra dice), so experience spent during the task counts. Wound penalties are not applied to work over days. |
| B372 | 2026-11-09 | The starting points of the long-task kinds are house rules except the fetish (W20 p. 213). V20 sets no time for learning a new trait; WoDX starts it at a roll a week. |
| B373 | 2026-11-09 | Counting shots is a house rule that starts off. It uses the system's clip value and maximum; weapons with no capacity (bows, slings, the Dark Ages chart) are never counted. A crossbow reload is at least one turn however high Archery is. The Dark Ages reload applies before 1450. |
| B374 | 2026-11-09 | A follower is an NPC with no player owner whose flag serves lists a player character. Only that character's players may order it. Player characters are never moved. Everyday orders apply at once with Cancel; a hard order waits in the approval queue. |
| B375 | 2026-11-09 | Haven security adds to break-in rolls in WoDX Interactables only (pick, smash, hack, disarm, climb). The V20 tracking bonus is shown, not applied. |
| B376 | 2026-11-09 | V20's drunk, drugged and diseased vessel rules apply in every era, since V20 Dark Ages has none. A plague year makes disease the first choice on the Hunt. A carrier stays one until the Storyteller clears the flag. |
| B377 | 2026-11-09 | Hardship on the road (cold, heat, hunger, thirst, no sleep) is not built: V20, V20 Dark Ages and Hunter: The Reckoning give no rules for it. It waits for a wider book search. |
| B378 | 2026-11-09 | Bodies that change are a record the Storyteller keeps, not rules the module runs: each change names its source and page, and the only thing applied is the Appearance the Storyteller enters, with Undo. Players read their own list and can't add to it; a player shaping flesh asks the Storyteller. |
| B379 | 2026-11-09 | A Nosferatu or Samedi's Appearance stays at 0 when a change would raise it; the change is still recorded. |
| B380 | 2026-11-09 | Filling a container draws only from Gear by era (the book tables), weighted by the kind of place, and always goes through the Storyteller's review. Siege, ship and crew-served gear, exoskeletons and parries never go in; cyberware only in a clinic; small containers only take what hides in a coat (concealment P, J or C). |
| B381 | 2026-11-09 | The paperdoll token showing lasting changes is for WoDX Paperdoll to draw: Storyteller gives api.body.shown(actor) by part (face, head, eyes, mouth, skin, arms, hands, torso, legs, voice, whole). |
| B382 | 2026-11-09 | Hardship is built after the wider book search found rules (B377 is closed by it): M20's weather, thirst and hunger rules apply to every living character in every line and era, since the other lines give none of their own or only for one setting (W20 heat and cold for Garou, Mummy desert heat). |
| B383 | 2026-11-09 | House rules where M20 leaves a gap: weather is resisted at difficulty 6; a failed day of thirst or hunger deals 1 bashing. The Storyteller sets how harsh the weather is per scene. |
| B384 | 2026-11-09 | Lost sleep follows HH2 (a Stamina roll or -1 on later rolls) and stacks a die a day to 3, cleared by sleep, after the Wraith 20th model. The penalty is shown on the card, not taken off pools by itself. |
| B385 | 2026-11-09 | Hardship is off by default and checks player characters only; vampires, wraiths and any sheet with a clan are left out. |
| B386 | 2026-11-09 | The paperdoll draws lasting changes that show on the parts it pictures (face, head, eyes, mouth, skin, the whole face), one mark per part, newest wins, coloured by source; arms, hands, chest, legs and voice stay on the record only. A token with no changes keeps the same baked picture, so nothing is baked again. |
| B351 | 2026-11-09 | Moves out of turn (Ben, 9 November 2026: "prevent players from moving their tokens out of turn during combat"): WoDX Combat 3.8.1 setting turnMoves, Off (default) or block. Block stops a player's move of a token that is a combatant of a started fight on its scene unless that combatant is the current one; a held character is told to press Act next (VtDA20 pdf p. 344: one who delays acts when stepping in). The Storyteller is never stopped (dodges, shoves, falls, carried riders and NPC routines all move on the Storyteller's client). Runs before the yards count, so a refused move is not counted. Chosen over Monk's Combat Details or Not Your Turn!: no third-party module, and it knows WoDX held actions. |
| B360 | 2026-11-09 | Serious faces (Ben, 9 November 2026: "Many of the faces currently come out looking too cartoonish. There should be a good balance between expressiveness and seriousness"): of Lorelei's parts, kept are 12 of 24 eyes, 8 of 13 brows, 13 of 27 mouths and 45 of 48 hair styles; left out are the googly eyes, winks, dot eyes, the lashed eyes whose lash passes the edge of a narrow face, curled and tufted brows, open grins, tongues, drool, twin buns, the spiked crest and the lone tuft. Moods may still use any of Lorelei's (the frenzy snarl, closed eyes). A saved look with a left-out part moves to the nearest kept one. Every face gets soft modelling: shadow towards the edges and jaw, light on the cheekbone and brow. |
| B361 | 2026-11-09 | Faces built in stages, each checked (Ben, same message: "build each face in stages, so that there is a check at each stage"): 1 head (measured in its build), 2 features (eyes, brows, nose and mouth drawn in their own colours in the build and checked against the head: inside its outline and never touching the empty ground), 3 skin (WoDX parts under the mask of visible skin), 4 over the eye (an eye to cover), 5 clothes (the neckline meets the neck below the face), 6 ring. A failed stage is logged in api.last().stages and named in the window. The checks swept every face shape, build, hair and feature. |
| B362 | 2026-11-09 | The face outline is measured on the bare face (close hair), since a long fringe (hair 40, 41, 45) cut it to a sliver and threw the health marks off; the marks of the health track now lie under the skin mask so hair stays over them, and the Crippled bandage goes over the hair. |
| B363 | 2026-11-09 | Lips and features that show (Ben, 9 November 2026: "make the lips larger and more pronounced. Add additional lip colors ... ensure that facial features are visible against that character's skin tone"): the mouth's own shape is grown downward into a lower lip (up to 3.2 times its height) and upward into a thinner, darker upper lip, so the corners stay fine, with a light on the lower lip and Lorelei's line kept as the parting. Nine lip colours plus the skin's own. Lips, brows and nose move the least distance darker or (lips and nose) lighter until their contrast with the skin reaches 2.0, 2.2 and 1.8; where even near-black brows cannot reach it on the darkest skin, a light rim is drawn under them. A colours stage checks it on every face. |
| B285 | 2026-11-09 | Encyclopaedia, the plan's full form (Library 0.4.0): two more tiers, rumour ("Might be true": legends, unreliable accounts) and open ("Unknown": left open on purpose), beside stated, implied and house reading. A claim where books disagree carries versions, two or more, each with its own source. A rule entry can carry editions (how it changed, oldest first) and a wodx note on how WoDX plays it, with an optional link to the rule's document. All the new text goes through the same checks, overlap included. The Library window gains a Shelf choice. Entries without the new parts make the same journal as before, so nothing is remade. | Built while the PC was off; gate on its return. |
| B286 | 2026-11-09 | A quiet interface (Senses 0.5.0): one switch on each player's own screen (off by default) tucks the sidebar, hotbar and player list away, names the character's health level at the top (the sheet's own level, or Unhurt) and puts difficulties on roll cards in V20's words (3 easy to 9 extremely difficult; 2 and below trivial, 10 all but impossible, house wording). Alt+Q shows or hides the panels. The scene controls never hide, so every button stays in reach. Only the player's view changes; the messages are untouched. | Player immersion study, item 8. V20 page for the difficulty table to pin (PENDING-REVIEW). |
| B287 | 2026-11-09 | Supernatural sight on the map (Senses 0.5.0): a character's sight in use is a flag, set by the token tool My sight, which steps through the sights the character has, then off: Heightened Senses (Auspex 1, or the Garou Gift), Aura Perception (Auspex 2) and a wraith's Lifesight. Each player's own map shows their own character's sight: a CSS filter on the board, and for Aura Perception and Lifesight a ring round each creature in view (aura tints by nature; the living warm under Lifesight). A client setting turns it off on a slow machine; chat answers do not change. | Player immersion study, item 7. Aura tints follow V20's notes; colours are a house choice; pages to pin (PENDING-REVIEW). |
| B387 | 2026-11-09 | A live wire holds whoever walks onto it (Interactables 0.18.0, Combat 3.8.2; Ben). The current does its lethal levels each turn in contact, as before. **Pull free of the current** is a Strength roll at 5 for a vampire and 9 for anyone else (V20 core printed p. 295, pdf 303, which gives vampires and mortals; other kinds use 9, a house reading). Cutting the power frees everyone held. A vampire soaks the current as usual, but a botched soak makes the damage aggravated: WoDX Combat's soakAndApply takes a botchAggravated option that lets that soak roll botch. |

## B396. Paperdoll mouths are drawn by WoDX, not Lorelei (2026-11-09)
Lorelei's mouths read as smears painted over the face. The picture now draws its own mouth (wodx-paperdoll/scripts/mouth-rules.mjs): a parting line from corner to corner, an upper lip with two peaks and a bow, a fuller lower lip, each edge sampled and joined with smooth curves; gradients darken the upper lip and light the lower; a soft shadow under the lip and a fine crease at each corner set it into the face. Placement comes from the face itself: under the nose found on the features drawing, between the pupils, as wide as 0.72 of the distance between them. Lorelei's mouth is still drawn in the measured drawing, so saved looks keep their mouth names; each name maps to an expression (smile, tilt, opening, teeth, width, fullness). Snarling and Eyes closed have their own expressions. The mask of visible skin counts Lorelei's mouth as skin and cuts out the new one. A new stage, mouth, checks that the corners and lips lie inside the face outline with room to spare; swept on 4 heads, 15 builds, 12 eyes and 15 expressions with no failure (the narrowest margin 28 px).

## B397. Fantastic skin tones (2026-11-09)
Sixteen skin tones no human has (fae blue, cornflower, deep water, verdant, moss, lavender, amethyst, briar rose, coral, ember, gilded, quicksilver, ash, slate, midnight, moonlit) follow the pallid ones. Any player may pick them. Random looks give them only by kind: changelings 60 in 100 (kinain and mortal-seeming variants never), creatures whose variant names a spirit, fae, chimera, shadow or demon 50, other creatures 15, demons 25, everyone else never. The lip, brow and nose inks keep their contrast on them (the inks test covers every skin).

## B398. Injured faces drain to grey (2026-11-09)
At Mauled and worse the face was washed with a fixed pale grey (#d9d7cf), which laid a white film over dark skin. The wash now takes the skin's own colour drained toward a grey of the same lightness, so a face loses warmth without whitening. The paper grain and fibre that lay over the whole figure are gone too (Ben cleared it); the grounds keep their own texture.

## B399. Six more illuminated grounds (2026-11-09)
Rose with silver stars, a red and blue diaper of lozenges with gold rings, green with a gold vine scroll, azure with gold lilies, a bone and black chequer, and gold leaf with punched work. Ben (9 November): spawned NPCs get them by kind, players pick freely. Ghouls and retainers rose, the faithful diaper, sorcerers and psychics lilies, changing breeds and changelings the vine, fae creatures purple, wraiths the chequer, mummies and exalted punched gold.

## B400. Mouths in the face's own style, and lips of their own (2026-11-09)
Ben found the 0.6.0 mouths out of keeping with the art (soft gradients on a flat, inked face) and every mouth the same size. The mouth is now drawn like Lorelei's eyes and nose: flat lip colours (the upper lip darker), one flat light on the lower lip, a short stroke of shade under it, and the parting and corners as tapered sepia ink. A new face part, Lips, has 12 shapes (even, thin, full, wide, small, bowed, full lower lip, full upper lip, straight, wide and full, narrow and full, firm), rolled at random and open to players; the seed nudges width, each lip's fullness and the bow a little more, so no two characters share a mouth. Shape and expression together are capped, and on a face too narrow for them the lips shrink in steps until the mouth stage passes (swept: 1,010,880 placements over every head, build, eye, lip shape, mouth and mood, none off the face). A moustache drawn by WoDX lies over the mouth. Paperdoll deploys wait until Ben settles the art style.

## B401. Natural lips, neutral faces, and lips by gender (2026-11-09)
Ben: the lips looked like lipstick and the faces too happy. Lips are about 30% thinner and their colour is drawn 35% toward the skin, with a softer light; the ink line gives the shape. Smiles are quieter, and a random face gets only the resting mouths (no broad smile, no frown); frowns, grimaces and the snarl come from the health track and frenzy as before. A look now records how the face is drawn (woman, man, nonbinary, or not stated, the default): women's lips about 16% fuller, men's about 12% thinner, a nonbinary face either way by its seed, and no facial hair is rolled for women. People made by WoDX Creation keep the sex it rolled in their flags, and the paperdoll reads it when it rolls their face. Not deployed (Ben's hold on the art style).


## B402. NPCs hear loud watch point, mount and climb events (2026-11-10)
Events from watch points, mounts and climbs used to go out before the hearing check, so nobody reacted to a rider thrown in the yard or a horse at full gallop. They now wait for the check. A loud one (a crash, a fall, a gallop, a bell) carries the NPCs who heard it, and they react as they do to a forced door. A quiet one (mounting, a look from a window) carries nobody, so a quiet act never sets off a guard on its own. Interactables 0.18.1.


## B403. Release checks: letter-case paths and a build stamp (2026-11-10)
The live server is Linux, so a path that differs in case from its file works on the PC and breaks on release. A harness test now fails on any such path in the system, the modules or the world files. Each package carries release.json, filled in by git archive (export-subst) or by tools/release/stamp.mjs, and WoDX Chronicle shows the GM which commit the server runs, in the Settings sidebar, with a warning when packages differ. Players do not see it and their clients do not read the stamps. Chronicle 0.10.0.


## B404. Adopt a generated map from a WoDX sidecar file (2026-11-10)
A map generator writes a second file beside its map, name.wodx.json, saying what each thing is: doors and shutters, chests, beds and hay to hide in, an oven, a well, the places NPC routines use, and trigger regions where a track comes in. Positions are in grid squares from the map's corner, so the import scale does not matter. In Foundry the Storyteller right-clicks the imported scene and chooses Adopt a generated map. The door walls the import made are matched by position (the nearest door wall running the same way, within half a square), and a door with no wall gets a new door wall. Tiles have no picture of their own, because the map already shows the thing. Shutters and doors get their bar on the inside, not set. NPC places and trigger regions need WoDX NPC: without it the places are still tagged and the triggers are left out, with a note. Adopting again skips what is already there; Undo removes everything it made and puts the door walls back. The first generator is the farmstead (tools/mapgen/ddfarm.py). Interactables 0.19.0.


## B405. A container's fill starts from where it sits (2026-11-10)
Fill by place and era used to start at "a home" whatever the container's surroundings. It now starts from a first guess: the container's own Usual contents setting (a new field in its config, which a generated map's file can set), else the WoDX NPC place tag of the smallest tagged region it sits in, else the scene's tag, else a home. Home, haven and tavern fill as a home; workplace and market as a workshop; church as a church; gate and castle as an armoury; wilds as a camp; street, caern and other give no guess. The Storyteller still picks the place and checks the draw. Gear by era holds only weapons, armour, shields and cyberware, so everyday goods (food, tools, cloth, coin, papers) are a separate Library job, added to the Master Plan the same day. Interactables 0.20.0.

## B430. The Storyteller's hand (2026-11-10)
The conveniences around play sit behind one Storyteller-only toolbar button, the Storyteller's hand (WoDX Storyteller 0.18.0), instead of a button each: the toolbar is already long. Each tool also has a key binding and can be made into a macro in the folder "WoDX · Storyteller". Four keys have defaults on Alt+Shift (H the hand, G rules at a glance, R call for a roll, T +10 minutes, E end the scene, Q the queue); the rest start blank. From the Storyteller Conveniences study, approved by Ben.

## B431. Rules at a glance reads the rules files (2026-11-10)
The panel holds no numbers of its own: difficulties, frenzy and Rötschreck, fire and sun, the Gauntlet chart, changing form, Paradox backlash and the Quiet, Harrowings and the 41 common checks come from WoDX Actions' and WoDX Otherworlds' rules files, so a fix there shows here. It shows the shared sections and those of the lines at the table; "Every line" shows the rest. The Gauntlet follows the era profile's chart.

## B432. Call for a roll (2026-11-10)
Open, secret, or a button for each player. The Storyteller's computer rolls every pool, from the sheet, with wound penalties, an untrained Skill at +1 difficulty and an untrained Knowledge refused (V20). A player's button asks the Storyteller's computer to roll, so the player's machine does nothing and cannot alter a result; only an owner's press counts, once. A contest is one roll by the Storyteller that each character must beat; a tie goes to the contest.

## B433. Before the players arrive, and the end of the night (2026-11-10)
Before the players arrive checks and opens windows; it changes nothing itself, and in the live world it offers no buttons at all. The end of the night runs End the scene, the factions' turn, experience, End the session and the timer in that order, each one optional. Experience is ticked by the Storyteller per character and reason; nothing is awarded on its own (automatic XP stays dropped). The reasons follow the Revised and V20 pattern until each line's list is checked in its book.

## B434. The session timer runs on real time (2026-11-10)
A world setting holds the start, the planned end and breaks. Only the active Storyteller's computer checks it, every 30 seconds while it runs, and warns once before the end (30 minutes by default).

## B435. Between sessions (2026-11-10)
The next session sheet is a new page in a Storyteller-only journal each time, so earlier notes stay. Preloading maps is a separate choice on that window because it makes every player's computer fetch the maps at once. Last time, for the players, is built from log entries of kinds the players saw at the table (arrivals, called scenes, crossings, dawn, encounters, called rolls); solo acts, breaches, beats and notes are left out, and the Storyteller edits the draft before it is shown. Absent players leave the spotlight count and start unticked in Convene; the mark clears at End the session.

## B436. Scene kits, quick extras, hooks and downtime (2026-11-10)
A scene kit runs only steps whose module is on, in a fixed order (clock, scene, called characters, music, opening card, note). Quick extras are one actor per kind in "WoDX · Extras" with unlinked, hidden tokens; their traits are a draft until each book's ready-made characters are checked, and only traits the era's sheet has are written. The hooks board reads Nature, Demeanor, Flaws, Merits, Derangements and the Backgrounds that name people; its Willpower button adds one point up to the permanent rating and logs it. A downtime request goes to the approval queue; approving logs it as a solo act and tells the player.

## B437. Book lists for experience and extras (2026-11-10)
The end-of-night window shows each character only their own line's experience reasons; the columns are every reason any character at the table uses, and a box a character's book lacks is a dot. In a Dark Ages era vampires and ghouls use V20 Dark Ages, which leaves the amount to the Storyteller, so the V20 list stands in as a house rule. Quick extras take the four-level extras rule (V20 p. 284, V20 Dark Ages p. 351) and mortal soak; animals are the books' stat blocks by era; people are a house rule armed from the weapon charts. Extras also write each Attribute's total, since a roll's pool reads the total.

## B500. Rules that clash between lines (2026-11-10)
Phase 10 opens with one table of the rules that two or more lines rule differently: modules/wodx-chronicle/data/rules-clashes.mjs, written out as docs/RULES-CLASHES.md. Each row is settled by the rules basis (V20, then Revised or 2nd edition, then the rest) or, where the books leave it open, by a house rule logged here and in PENDING-REVIEW. Rows whose page has not been read yet are marked check, with the question for the PC. The crossover referee will read this table. House rule for a hit between two lines: the attacker's book sets the damage type dealt; the target's book sets the soak, the halving and what the wound does, and banes belong to the target. Extra actions from any line (Celerity, Rage, the Time Sphere) resolve in one pass after the normal turns, highest Initiative first, as the turn conductor already does.

## B501. Dark Ages fae soak (2026-11-10)
WoDX Combat soaked every fae as C20 says, so a Dark Ages fae in the mien could not soak lethal damage and cold iron took away all natural soak, although DA:Fae gives both (pp. 104, 88) and the Actions fae window already said so. Now a Dark Ages fae (the sheet's own choice, an Origin, or the era) soaks lethal with Stamina in the mien and soaks cold iron with Stamina in any form; every other fae soaks as before. Chimerical damage and Banality follow C20 from its era and DA:Fae in the Dark Ages.

## B502. One Willpower rule for the whole table (2026-11-10)
The lines differ on a nightly Willpower point and on refilling at the end of a story. House rule: the chronicle's Willpower setting (a point a night, at the end of the story, or off) applies to every line alike, and acting by Nature gives a point back (V20 p. 267).

## B503. One line's mind powers on another (2026-11-10)
House rule until the pages are read: the target's book decides whether a mind power can touch it (a fae's Day or Night against Dominate, DA:Fae p. 181; a hunter's Conviction); otherwise the power works by its own book.

## B504. Experience for a trait from another line (2026-11-10)
House rule: a trait from another line, such as a Kinfolk's Gift or a mortal's Numina, costs what the book that teaches it charges an outsider. With no such price, it costs what the buyer's own chart charges for its nearest trait.

## B505. Corpus and Essence in a fight (2026-11-10)
House adaptation, already in the code: in the combat window the seven health levels stand in for a wraith's Corpus and a spirit's Essence.

## B506. Two possessors in one body (2026-11-10)
House rule: the one already inside holds the body. A newcomer (a demon, a wraith's Puppetry, a spirit) must win a resisted Willpower roll against it, difficulty 6 each; a tie keeps the first.

## B507. The Time of Judgment on the Future Darkness branch (2026-11-10)
With the branch on, the 2004 Time of Judgment era never comes, even with its switch on; the branch has its own end in 2099, the Time of Future Judgement. Future Darkness runs 2010 to 2098. House rule.

## B508. Cascades for the Time of Future Judgement (2026-11-10)
2099 runs as one of five Cascades: a chain of the 35 retold endings, each setting off the next, with most of every line's endings in each. Only the chosen Cascade's events fire; with none chosen, none fires. House rule.

## B509. The imbued on the Future Darkness branch (2026-11-10)
The first imbued wake in 2023 on the branch, so hunters use The Hunters Hunted II rules from 1999 to 2022 there, with chrome. The classic timeline keeps the 1999 Reckoning. House rule.
## B520. Bites without fangs (2026-11-10)
V20's aggravated bite is for vampires and fanged creatures such as werewolves (pdf 284 / p. 276); the book gives no bite for anyone else. House rule: a mortal, ghoul or other creature without fangs bites for bashing damage, as a punch. Kindred bite for aggravated; shapechangers by form, as before. Vicissitude's Bonecraft (3) now gives lethal bone talons and Protean 2 aggravated claws; Vicissitude 1 no longer claws (V20 pdf 250 / p. 242).

## B521. The Delirium beyond the Garou's own list (2026-11-10)
W20 makes Kinfolk immune and vampires and mages normally immune (pdf 48 / p. 46, pdf 162 / p. 160) and says nothing of ghouls, changelings or wraiths. House rule: ghouls roll on the chart as mortals; changelings and wraiths are immune unless a power forces the Delirium.

## B522. Blood of other lines (2026-11-10)
Garou blood follows V20 (two blood points a point, and +1 to frenzy and Rötschreck difficulties a point while it lasts, pdf 388 / p. 380). House rule where the books are silent: mage and fae blood are ordinary blood (fae blood changed by B525), and a Kuei-jin draws two Chi a point from a Garou with the same frenzy step.

## B525. Fae blood is a drug to Kindred (2026-11-10)
Ben's ruling, replacing B522's "fae blood is ordinary blood": the Glamour in fae blood makes it a potent drug to Kindred, in every era. Each point drunk lasts one scene of hallucinations and waking dreams, in which the vampire sees the Dreaming's phantoms as real and cannot tell them from the world; every pool drops by 1, by 2 from three points drunk, by 3 from five. The scale follows V20's hallucinogen in a vessel's blood (p. 301). In the Dark Ages a fae's Court gift from VtDA20 (p. 181) comes on top. The Feed window has a Changeling / fae vessel, and a changeling actor as the vessel counts as fae.

## B523. Celerity and Initiative (2026-11-10)
V20 Celerity adds nothing to Initiative (pdf 150 / p. 142), and no VtDA20 page was found that says otherwise, so by the rules basis Initiative never includes Celerity, in any era. Celerity still adds dice to Dexterity attack and defense pools under the combat setting.

## B524. Demons and mummies soak by their own books (2026-11-10)
WoDX Combat soaked demons and mummies as Garou, with Stamina against everything. Now a demon soaks bashing with Stamina, lethal only in the apocalyptic form, aggravated only through a power (DtF pdf 172 / p. 171, pdf 248 / p. 247); a mummy soaks bashing and lethal with Stamina and aggravated only through Hekau (MtR pdf 130 / p. 136). WoDX Actions' own older soak copy, which soaked Garou and wraiths as mortals when they fell, is replaced by the Combat rules. V20 healing of aggravated damage: each level past the first in a day also costs a Willpower point (pdf 293 / p. 285), outside the Dark Ages.

## B570. Everyday goods by era (2026-11-10)
A container's fill now draws everyday goods as well as Gear by era. The goods list is a WoDX house rule (no book gives such a table): plain names, no prices or rules, each with its first and last of Chronicle's eras and a weight for each fill place (a home gets food, cloth and keepsakes; a church candles, papers and things of faith; a clinic medicine). What the Victorian era has the Wild West has too. Small containers take small goods only. The Storyteller picks gear, goods or both, defaulting to both. WoDX Library 0.5.0, Interactables 0.21.0.

## B571. Building types for every generator (2026-11-10)
Building types live in tools/mapgen/buildings.py, drawn facing south and turned to face any way, with their rooms, openings, furnishing, the WoDX NPC place their region gets and the fill place their chests start from. All twelve use the Forgotten Adventures packs, which are medieval, so they fit the Dark Ages to the Renaissance; later eras need other packs. Buildings sit on the half-cell grid so the furnishing works the same everywhere.

## B572. Villages and small towns (2026-11-10)
ddtown.py builds a Dark Ages village or small town. Trades come from a "one for so many people" rate (a house rule, not a book table); the tavern and chapel always face the market; the priest lives in a cottage near the chapel. Households are roles only (no names, no dialogue), sized one to eight, written into the sidecar. Night ambient light by default (Rothenstein's maps are drawn as night); --day gives daylight.

## B573. Households on adopted buildings (2026-11-10)
Adopting a village or town keeps each household on its building's region (flags wodx-interactables household: label, trade, people by role). Nothing is made from them yet; seeding NPCs from them is a later WoDX NPC job. A household whose building is not a place on the map is left out with a plain note.

## B574. A city size for the town generator (2026-11-10)
A city is 168 by 124 squares and aims at 500 to 700 people, with up to three times the trades of a town and a grid of back streets every 18 to 20 squares, joined by cross lanes every 22. The numbers are a house rule, sized so the whole place splits into six parts of about Rothenstein's map size.

## B575. Splitting large places into parts (2026-11-10)
Any generated place wider or taller than 64 squares is cut into a grid of parts by default, to keep each map's image and wall count light on slower computers. Cuts sit on whole squares, moved up to a quarter part to miss buildings (a crossed building counts as six squares of unevenness); a building belongs to the part its middle stands in, and that part's map reaches past the cut to hold it. Edge trigger regions note the way into the next part. --part sets the size; 0 keeps one map.

## B576. The organic layout is a port of the Medieval Fantasy City Generator's steps (2026-11-10)
The original's source (Oleg Dolya, CC0) is followed step for step in WoDX's own Python, with two cuts: no citadel (WoDX has no castle building) and no water. The town's ward list is cut to wards WoDX has buildings for.

## B577. Buildings in an organic town (2026-11-10)
Every building is a furnished WoDX type turned to face its street, in 15 degree steps so walls and furniture line up neatly; it furnishes facing south in its own frame, so every type works at every angle. Blocks are cut into lots across their longest side, with a 1.2 square alley through big pieces, and buildings stand side by side along each frontage. The mix of types, the spacing and the caps on rare trades are by ward, as a house rule. The organic layout is the generator's default.

## B578. Turned things and outlined regions in the WoDX map file (2026-11-10)
A feature may carry rotation (degrees about its middle; its rect is its unturned size) and a region points (an outline in squares, its rect kept as the box). Adopt turns the tile and draws the region as a polygon; a bad outline falls back to the box with a note.

## B579. Varied building shapes (2026-11-10)
In organic towns a building may be stretched a little, and 60% of the time gains one wing or lean-to (back, east or west side) with a fitting room inside. The wing joins by a door or doorway. Variants that leave no room for the furniture are dropped and the plain type is used.

## B580. Terraced rows (2026-11-10)
Busy wards build their frontages as rows of houses almost touching, with wings only at the back: market and merchant always, administration 80%, gate and craftsmen 60%, slum 50% (a house rule). Facing end windows are dropped.

## B581. Ways stay clear (2026-11-10)
No building, wing or garden may touch a street, road or alley band; the generator stops rather than write a town that breaks this, because townsfolk on scheduled rounds will walk every way.
## B590. Era item lists: three tags on every good (2026-11-10)
Ben asked for long item lists for every era, everyday things as well as loot, each with a backend tag for category, era and value. Library's data/goods.mjs is extended rather than replaced: 681 goods in 21 kinds and 80 sub-categories (money, food, drink, drugs, vices, kitchen, household, clothes, grooming, tools, light, papers, faith, occult curios, medicine, keepsakes, toys and music, valuables, everyday arms and ammunition, travel, machines). Each row now gives the years the good was in use; its eras are worked out from those years against Chronicle's era years, so an item reaches exactly the eras it belongs to (the Wild West no longer copies the Victorian list wholesale). good.tags = {category "kind/sub", era [ids], value {era: tier}}. Weapons and armour with stat lines stay in Gear by era; the arms kind holds only things with no book stats.

## B591. Value tiers set against Resources (2026-11-10)
Value is a tier 0 to 5 (Trifle, Cheap, Modest, Costly, Dear, Treasure) measured against one working person's wage in the good's own time, with the Resources rating that buys it without strain (0, 1, 1, 2, 3, 4). Anchored on the Resources Background (V20 pdf 124, V20 Dark Ages pdf 182), V20 The Wild West pdf 86 (wages by Resources dot, 1880s) and Sorcerers Crusade Companion pdf 36 (Renaissance wages and prices). A tier can change over time ("3>1800:0": nutmeg is costly in the Middle Ages and a trifle by the Victorian era). Where no book covers a good, dates and relative cost come from history and the row's source says so. Drugs cite V20 pdf 309-310 for their effect on a vampire who drinks them.

## B592. Item Review Desk (2026-11-10)
The lists went to Ben on the Item Review Desk artifact (https://claude.ai/artifact/RFDVx5w2jCtbK1ASY8WeLP), same pattern as the narrative desk: the item list is a published file built by tools/goods/build-desk.mjs, and Ben's marks (OK, Fix with a better value or a note, Cut) are kept in the desk's db collection verdicts, doc id = good id. Marks are applied to goods.mjs in a later PR. Goods carry the two bridge eras (age-of-reason 1601-1836, mid-century 1919-1989) that Ben added to Chronicle on 2026-11-10, so the 17th and 18th centuries and the mid-20th century have their own lists.

## B593. Item behaviour and stacking (2026-11-10)
From the RPG Builder review (Ben approved 2026-11-10 23:18Z in that thread): every good has a behaviour, one of worn, wielded, used (consumed, kept as a count), coin (counted money), container, lit (carried light) or kept, and a stacks yes or no. Set per category since B594; BEHAVIOUR_OVERRIDES lets a single good differ (candles stack and are lit, a quiver is a container). good.use, good.stacks and the same in good.tags.

## B594. Top-level categories only, with ten from Cataclysm DDA (2026-11-11)
Ben (2026-11-10 23:37Z) dropped the 80 sub-categories. Goods now sit in 31 top-level categories: the 21 earlier kinds plus ten adapted from Cataclysm DDA's item categories (CleverRaven master data/json/item_category.json): keys, containers, maps, fuel, power, manuals, accessories, traps, materials, seeds. Tobacco moved into Drugs (Ben's note). Money is labelled Currency. Gear by era keeps four categories (melee, ranged, Armor, cyberware); Ben asked for the American spelling Armor. Each category sets the behaviour, stacks and sheet item type (KIND_BEHAVIOUR). Ben approved all categories 2026-11-11 00:21Z. 799 goods.

## B595. Uses as a second tag (2026-11-11)
Some kept things have uses (a book is read or written in). Rather than splitting categories, every good carries uses, a list of verbs such as read, write, pray, light, open, play, wear, eat. Each category gives a default list; USES_OVERRIDES sets single goods (Bible, grimoires, ledger, tarot, compass). good.uses and tags.uses. Ben approved 2026-11-11 00:21Z.

## B596. Concealment steps replace the small flag (2026-11-11)
From the RPG Builder review: every good has V20's concealment step from the weapons chart, P pocket, J jacket, T trench coat, N cannot hide. good.conceal and tags.conceal; good.small stays for Fill by place and era and is true for P and J. Steps were proposed per good and go to Ben on the Item Review Desk with the items.

## B597. One good per thing, never a pile (2026-11-11)
Ben: no piles such as "a few bronze coins"; make one item that stacks. Goods named as a pile or a group became one thing (a bronze coin, a tallow candle, a cartridge, an apple), 110 in all; two that repeated another good were folded into it (a purse of silver pennies into a silver penny, a few gold florins into a gold florin of Florence). STACK_SIZES gives each one's plural and the stack a find usually holds (bronze coins 2 to 12, cartridges 3 to 30). A good sold by its measure (a sack of grain, a bottle of gin) stays as it is and stacks one to three. Where one unit is worth less than the pile was, the value tier came down. Fill by place and era draws a count and writes "7 bronze coins" (Interactables 0.23.1). good.stack = {plural, min, max} and tags.stack.

## B598. Real money: Resources pays a monthly allowance (2026-11-11)
Ben asked for money like the World of Future Darkness's, so characters and NPCs can trade, and approved the proposal (doc https://claude.ai/artifact/WbziiX27AcjdRwzu1n4Swv) with every allowance raised by half. Resources pays each month, in the money of the place and year, 0.4, 1, 2.5, 7, 20 or 50 times the era's monthly wage by dot (the shape of V20 The Wild West's pay table, pdf 86), times 1.5. The far future uses a tenth of the WoFD article's starting cash (pdf 9), times 1.5. V20 Dark Ages pdf 182 makes Resources a monthly allowance; the allowance is spending money, the way of living is already covered. Rothenstein is in Moravia, so the default money runs denar, Prague groschen, gulden and kreuzer, Austrian gulden, krone, Czechoslovak and Czech koruna, then eurobucks; German, English, American and French sets for other chronicles. Wages other than the books' are history, approximate, a house rule. Prices: value tier x 1/400, 1/25, 1/5, 1, 6 or 20 of the wage, x a fixed 0.7-1.4 spread by name; Trifles in stacks priced per usual stack; book prices win; scarce x2, forbidden x3, glut x0.5. Traders buy at half, fences at a quarter; credit up to a month's allowance per dot where the era has banks; haggling Manipulation + Finance difficulty 6, 10% a success, 30% at most. The purse is flags.wodx-storyteller.money.purse {money, year, carried, bank, debt, paidMonth, log} in the smallest unit, mirrored to system.money in the main unit. Pay day each thirty days of game time, missed months paid up to twelve, debt first. A change of money converts savings by the wage ratio and turns carried coin into an "Old money" item. Storyteller 0.23.0.

## B599. Markets, the living economy's first build (2026-11-11)
Ben approved all four recommendations of the living economy study (https://claude.ai/artifact/3Ty3TpwwLeC5XZYo1cbSbA) at 03:56Z. A market belongs to a settlement: its scenes, a price index (0.5 to 3, default 1) and a supply level (None, Short, Normal, Plenty) for each of the 31 goods categories, and its traders. The numbers are the Storyteller's only, in a Markets window under Upkeep (world setting wodx-storyteller.markets). Every price (api.upkeep.money.price) multiplies by the index of the trader's tile market or of the scene in view. A trader is an NPC plus a container with a stock list: when Interactables draws its stock, the hook wodxStockFilter lets supply thin or fill the draw (Short keeps half the lines at half count, Plenty adds half again), and the NPC's purse pays half the market price for what comes in; a thin till buys only the lines it can afford. Small swings auto-applying with Undo and big ones going to the queue belong to the weekly market turn, which is a later build (steps 3 to 5 of the study). Storyteller 0.26.0, Interactables 0.24.1. House rules.

## B607. Item descriptions by era (2026-11-11)
Ben asked for item descriptions like Cataclysm DDA's and said to implement them (16:23Z). Every one of the 797 everyday goods has a short description in WoDX's own words (modules/wodx-library/data/goods-text.mjs), with a later wording for the 21 goods whose form changed while their name did not (a match becomes a safety match from 1900). When a good becomes an item by any route, Library fills the item's description for the chronicle's year unless it already has one, and marks the item with the good's id. No weight, volume or wear, the Cataclysm parts ruled out on 2026-11-09. Library 0.7.0.

## B608. Examine and a closer look (2026-11-11)
Every item sheet has an Examine button: the description, then the facts WoDX keeps (category, uses, how well it hides, the price here and now when WoDX Storyteller's money is on, else the value tier, how it stacks, how well made). Look closer rolls Perception plus the best of the category's Abilities (both editions' names count), difficulty 6 (a house rule). One success shows how it was made, two where and roughly when, three whether it is false, stolen (the item's own mark or the ownership record) or worn out, four anything uncanny. The Storyteller's Examine notes add the origin, quality, a forgery and its tell, the uncanny and its successes, and their own lines opened at the successes they set. The card goes to the roller and the Storyteller only. Library 0.7.0.

## B609. Plain names; origins and secrets on a closer look (2026-11-11)
Ben (16:48Z): qualifiers such as "Chinese" or "from a Muslim mint" move into examining; a description says plainly what a thing is, and origin or special features come out when the player looks closer. 67 goods are renamed (a gold dinar, a square-holed copper coin, a pair of gaming dice, a passport in a plastic sleeve) and keep their old ids, so marks, stock lists and older items still find them (goods.mjs RENAMED). Descriptions lose origins and hidden facts; each good can carry details (goods-text.mjs DETAIL_RAW) that a closer look opens: special features at 1 success, origin at 2, what is false or hidden at 3. Library 0.7.1.

## B610. Descriptions fold on the Possessions tab (2026-11-11)
Ben worried that descriptions would clutter the inventory. On WoDX Sheets' Possessions tab, an item with a description shows a small info button beside its name; the description sits in a fold under the row, closed whenever the sheet opens, and the button opens or closes it. Items with no description show no button. The container fold now opens only its own contents. Sheets 0.8.2.

## B582. Burgage plots (2026-11-10)
Houses get long plots behind them, by ward: slum 4 to 7 squares deep, market, administration and gate 10 to 14, craftsmen 10 to 16, merchant 12 to 18, patriciate and outside the gates 14 to 20, villages 16 to 24 (a house rule). Chapels, guardhouses and barns get none. Two frontages are not built back to back closer than 16 squares (villages 24) except in slum and craftsmen wards, which keep their courts.

## B583. Rivers (2026-11-10)
Organic places may have a river: villages half the time, towns 60%, cities 75% (a house rule). It runs across the whole map beside the market, never through it, and flows from one end to the other so later steps can tell upstream from downstream. Every way crossing it gets a bridge; a watermill takes the frontage nearest the water and the washing place sits upstream of the town's middle.

## B584. Dirty trades by place (2026-11-10)
About three in ten workshops follow the trades that stink (tanner, dyer, butcher, fuller, chandler), and they take the workshops furthest downstream, by or outside the wall, or furthest from the market. Clean trades take the rest.

## B585. A wealth gradient (2026-11-10)
Rich within about a third of the town's reach from the market (sooner in rich wards), poor beyond three quarters of it, in slums, outside the gates and beside the dirty trades. Walls: stone and timber, timber and plaster, or plain timber; rich houses get boarded floors. A house rule.

## B586. Landmarks (2026-11-10)
A market cross by the market well, public wells at the busier junctions away from the market (towns 2, cities 6), never on a way, and a tower each side of each gate.

## B587. Suburbs outside the gates (2026-11-10)
A walled town's fields at a gate become a suburb 85% of the time, with an inn and (in towns and cities) an almshouse among the cottages and smithies.

## B588. Fire history (2026-11-10)
Villages 20%, towns 40%, cities 60% have had one great fire: one block rebuilt in stone, with one burned-out plot left among the new houses.


## B593. Dates for Encyclopaedia events (2026-11-10)
An event gets a date only where a book near its cited pages gives one; an entry whose book gives no year stays undated rather than taking a date from outside the books. A date from another WoDX source book may stand in when the entry's own book is silent (the Iron Hag's waking, 1990, from Changing Breeds). Decades, centuries and "around" dates are marked approx. Lore entries that tell of one war, battle, fall or treaty were checked too; overviews of whole ages were left undated.
## B589. Ways stop at the river bank; water gates in the wall (2026-11-10)
Ben, 2026-11-10: a river must not lie over a path, and where the river passes the town wall there should be grates to let the water through. The river course is scored so a way that ends in the water, or a gate by the water, costs far more than one crossed by a bridge. Any way that still runs into the water without crossing stops on the bank, with stone river stairs down to the water (sidecar region landing-N, kept clear like a way). Alleys are not cut toward the river. Where the river passes the wall, the wall is cut and an iron grate (Cell-Bars wall texture) spans the water, with a tower on each bank (sidecar region water-gate-N, place kind gate, a note trigger). A self-check stops the generator if any way still runs into the water.
## B600. One client recomputes after a save (2026-11-10)
The system's after-save recompute (totals, wound levels, movement) runs only on the client that made the change, and writes back only the values it changed instead of the whole character. Before, the Storyteller's and the owning player's browsers could both write the full actor after each change.

## B601. No double Core tab (2026-11-10)
When WoDX Sheets shows a line's printed sheet, the system skips drawing its own Core tab, which was thrown away before. The system's layout is unchanged when no WoDX sheet applies.

## B602. Sheet extras on every WoDX sheet (2026-11-10)
WoDX Sheets 0.7.0 adds, in the book's layout and the system's alike: an in-play strip on every tab, a Possessions tab in place of Gear, a Ties tab, the Storyteller's notes, search boxes on long power lists, a History window with Undo, and a Print button.

## B603. Containers and stacks (2026-11-10)
A container is an item with the system's own "is container" switch on. Items record their container (flags.wodx-sheets.in) and count (qty). A container takes things up to a V20 concealment size (pocket, jacket, trench coat or cloak, any). Given, looted or left things take their contents with them. Things left on the map become an open Interactables box at the token, holding world copies in a "things left on maps" item folder.

## B604. Money by era (2026-11-10)
Coins in use by year for the German lands (default), England or the United States, a world setting. Coins of account are listed but never carried. From 2050 every list uses the eurodollar, borrowed from Cyberpunk 2020 for the World of Future Darkness (house rule).

## B605. Storyteller's notes stay off players' computers (2026-11-10)
They live in one journal entry only the Storyteller owns, a page per character, so Foundry never sends them to players.

## B606. Sheet history is kept in memory (2026-11-10)
The History window lists this session's edits on that computer only, so recording costs no saves. A reload clears it.
## B620. One language for "Only when" (2026-11-10)
From the RPG Builder review (https://claude.ai/artifact/MvqiV7QLsQP3KJcd6uukXz), approved by Ben 2026-11-10. Any map piece that asks who, when and in what state uses the same short tests, held in WoDX Chronicle (when-rules.mjs): one test a line or separated by ";", every line must pass, "not" turns a line round, "any of:" or "2 of:" opens a group. The tests cover every era: era, year, before and from, hour, night, moon, church feast, fast and season, the Future Darkness branch. Who: player or not, kind (WoDX Combat's kinds, with the books' names accepted), clan, tribe, Tradition and the other sheet fields, faction, name. State: pools and ratings with a comparison, wounds by health level name, frenzy, Rötschreck, Obfuscate, any WoDX condition. Has: an item, a codex page. A list with a mistake never passes, so a typo cannot open a door.

## B621. "Then" outcomes go through the module that owns them (2026-11-10)
A "Then" list can tell the Storyteller, whisper the Storyteller's own words to the character's players, raise the alarm (WoDX NPC), pass a map event on, play an Atmosphere cue, or add a Ledger entry. Each runs only on the Storyteller's client, and one whose module is off is skipped with a note to the Storyteller. No outcome writes NPC dialogue (standing rule 11).

## B622. WoDX: Trigger regions take the lists first (2026-11-10)
Trigger regions get "Only when" and "Then also" boxes. A region whose list does not fit stays quiet and is not marked as set off. The Region config shows one-line boxes, so ";" separates lines there. Doors, clues and traps (WoDX Interactables) follow in a later step.

## B623. NPC phases (2026-11-10)
In the NPC behaviour window, each phase is a line: a name, a colon, an "Only when" list about the NPC itself, "=>", then changes (template, the temperament numbers, fleeAt, tactics, fears). The first phase that fits is in force each turn, and the plan card names it. The thresholds are the Storyteller's; the books set none for this, so nothing is filled in by default.

## B624. Households answer together (2026-11-10)
An NPC's behaviour window takes a household name. When one of a household is hurt, the others on the scene within call (setting, 40 yards by default, a house figure) and not already fighting are named on a card to the Storyteller, who can bring them into the fight with one button. The call is a voice in every era; past it, Alert zones carry the alarm by the era's own means (B-series alarm carriers).

## B625. Stock lists and restocking (2026-11-10)
A container can hold the Storyteller's own stock list: "always:", "1 in N:" or a percentage, an optional count or range, then the item; a line can start with "when" and WoDX Chronicle tests, so matches turn up only from 1890. Set to draw every dawn, week, month or season, the clock takes away what the last draw left and draws again; the Storyteller's own lines in Inside stay. A count shows in the item's name, as "silver pennies (7)", until the sheets count things.

## B626. Plain names are handed over (2026-11-10)
Taking from a container, a line that is only a name (everyday goods from Fill, a stock list's own words) becomes a simple item of that name on the character, instead of "Not found". A world setting turns it off. A UUID that does not resolve is still reported.

## B627. "Opens for" (2026-11-10)
Doors and containers take an "Opens for" list of WoDX Chronicle tests. Whoever fits it can lock and unlock without a key: a chantry door for its own clan, a gate that opens only by night.

## B628. Mood regions (2026-11-10)
WoDX Atmosphere adds the WoDX: Mood region: the era kit's music for a mood while a player's character is inside, a cue on the way in, and the Storyteller's own line whispered to that character's players; an "Only when" list can limit it. The music goes back when the last of them leaves.

## B629. Ledger objectives (2026-11-10)
A new Ledger kind, Objective, takes steps one a line: "reach" a Trigger region, a state word ("open the reliquary", "found the trapdoor"), or "any". Map events tick them, the log notes each, and the entry is marked kept when every step is done. A due date is the date it fails by. No Experience is awarded (Ben dropped automatic XP on 2026-11-08).

## B630. Faction standing toward characters (2026-11-10)
Each faction keeps how it regards each player's character, -3 Hunted to +3 Honoured, set in the Factions window or by a "standing" outcome, and read by a "standing" test. The Status Background stays as each line's book defines it; this track is a house rule.

## B631. Recipes for long tasks (2026-11-10)
A long task can say what the character must carry, where it is done (a forge or a scriptorium in any era; a printing press from about 1450, a laboratory from 1660, a machine shop from 1800, a darkroom from 1839, an electronics bench from 1920, a computer from 1975, a fabricator from 2010, a gene lab from 2030: history, not the books), and what it makes. A roll that cannot be made pauses the task with the reason; finished, the thing made goes to the character, and Undo takes it back. The dice, difficulty and goal stay the Storyteller's, as V20 p. 251 leaves them.

## B632. Talk sheets (2026-11-10)
An NPC's behaviour window holds the Storyteller's own talk sheet: lines of what they will say or do, each with an optional "Only when" list about the character they talk to. A HUD button shows the lines that fit the targeted character. WoDX writes none of it (standing rule 11).
## B650. Part lines planned before the town is built (2026-11-10)
Ben, 2026-11-10: a town split into part maps must not cut off distinct areas (the market had its tip cut off and houses were split between parts). Now the part lines are chosen first, from the street plan: a line pays most for crossing the market (400), then a park, cemetery or bomb site, a bridge, a well or the cross, and for each stretch of building land it runs through, so lines follow streets and open ground. The cheapest set over the whole side is found exactly, each part 24 to --part squares wide. A house a line still passes over belongs whole to the part its middle is in: that part's map reaches past the line to hold it, and the neighbouring map leaves it out. The plan view draws each part line stepping round such houses. (Forbidding houses on the lines was tried and lost a fifth of the houses.)
## B651. Era layers (2026-11-10)
Ben approved the town planning doc's era layers. ddtown.py --year Y (organic layout) builds the medieval town, then applies each later age up to Y, with dates from London's history (a house rule): 1667 brick rebuilding, 1690 quays and warehouses, 1780 cottages in back plots (courts), 1800 wall pulled down for a ring road, 1832 cemetery, 1838 railway and station (houses pulled down in its way), 1840 public park, 1853 boulevards (cities), 1865 embankment (cities), 1920 suburbs on the farms by the roads out, 1940 bomb sites (car parks from 1960), 1975 warehouses to offices. The stocks go from 1837 and the washing place from 1900. The sidecar era is the Chronicle era for the year (the Wild West left to American maps; a gap year takes the era before it). New regions carry an "area" kind from the area catalogue in eras.py. Buildings stay medieval types until later building packs exist.

## B660. Teleport to the cursor (2026-11-11)
Ben asked for a button that teleports a player or NPC token to where the cursor is. A toolbar button can't read the cursor's spot on the map (the cursor is on the button), so the button arms a click: the next left click on the map is the spot. A key (Alt+Shift+P, rebindable) uses the cursor where it is. Storyteller only. Several selected tokens keep their offsets around the point; tokens stay inside the scene; walls are ignored (displacement move). Nothing goes to the story log.
## B652. Single-site maps: castle, mine, arcology deck (2026-11-11)
Ben asked for sample maps of a castle, a mine and an arcology. tools/mapgen/ddsite.py --kind castle|mine|arcology writes the Dungeondraft map, sidecar and plan like the town generator. Castle: an eight-sided curtain wall with round towers, a gatehouse across the south wall, a moat and drawbridge, and in the bailey a keep to the north, great hall beside it, chapel, kitchen, barracks, stables, smithy, store and well, every door facing into the bailey and the gate-to-keep way kept clear. Mine: a drift mine with the pithead yard (cottages, smithy, store) outside, an adit, a haulage gallery with rails and timber sets, cross-cuts to working faces with two squares of rock between workings, a sump, a miners' rest, a tool and powder store and a shaft bottom with a ladder feature. Arcology deck (future darkness era, the start of the future settlements recommendation): a square hull round a planted atrium with a four-car lift core, ring, axial and perimeter corridors, and four quarters (housing pods, hydroponics, market commons, services) whose rooms all open on a corridor or service lane; a maglev platform on the east axis. The furniture packs are medieval, so later-era kit is stood in for until later packs exist. New regions carry the area kind (park, corridor, transit, gallery, stope, shaft, sump).
## B661. NPC topic menu (2026-11-11)
Ben, 2026-11-11, asked for NPC talk in the manner of Daggerfall and Morrowind: approach someone and pick from a menu of topics. WoDX NPC 0.10.0 does it on the talk sheet NPC 0.9.0 already had (B632). A line that starts with a [topic] is that person's answer when a player asks about it; [greet], [none] and [offer] are the greeting, the answer when nothing fits, and topics the person brings up. Tests before "=>" are WoDX Chronicle's "Only when" list, so the era, the night, standing and what the character carries pick the line. After " | ": teach a topic, codex a page, aloud, or any Chronicle outcome. Household, faction, scene and everyone sheets answer what the NPC's own does not. Every line is the Storyteller's (standing rule 11). Study: https://claude.ai/artifact/Wk9pzdaPmZS4JN76KjdKyC
## B662. Answers come at once (2026-11-11)
Ben picked it from the study's options: the Storyteller's line is sent as soon as a player picks a topic, decided on the active Storyteller's client so no sheet reaches a player. An NPC ticked "Ask me first" waits: the Storyteller gets a card with the lines that fit and sends one, or none and speaks for them. A GM must be logged in for anyone to answer.
## B663. What the topic list holds (2026-11-11)
Ask about lists the topics some sheet in the chain has a line for that the character knows (taught by a talk line, or a codex page of that name, which covers Encyclopaedia pages), plus the topics the sheets offer. News, Rumours, Work and Directions are always there. A topic no sheet mentions stays off the list. Talking needs the character within 2 squares (a world setting) and in sight; answers are whispered to the asking player and the Storyteller unless the line says aloud. Ben, 2026-11-11: with nobody targeted, Talk picks the nearest person the Storyteller plays within reach and in sight.

## B653. Even map parts, no house on a line (2026-11-11)
Ben chose even parts over the stepped part lines of B650. A town split into parts now cuts its width and height into equal parts no wider than --part, and no building may stand on a cut: free() and put() refuse any spot within a fifth of a square of a line, and a second fill pass along the edges near each cut takes back some of the lost houses. The town is shifted on its map, where it can be without an extra part, so a line does not run through the market middle. Ways, the river, the wall and open ground such as the market may still cross a line. Houses lost: about 15% (town seeds 1 to 6: 50 to 46, 51 to 38, 35 to 28, 83 to 69; cities: 157 to 136, 161 to 131). The stepped borders on the plan are now straight.

## B654. Metropolis size (2026-11-11)
Ben asked for a metropolis size. ddtown.py --size metropolis (organic layout only) lays out 60 districts from a longer ward list (more markets, churches, administration and parks), with three times a city's caps on smithies, bakehouses, taverns, guardhouses and stores, more market stalls, a wider river, and the era layers scaled up. It is always walled, and every church ward past the first gets a parish church. Expect about 560 squares across, some 1,400 households after even parts, about 80 part maps of 64 squares, and four to five minutes to make. There is no sample in the repo or a harness run of it, because of its size; the harness checks only that the grid layout refuses it.

## B664. Stock talk (2026-11-11)
Ben, 2026-11-11, asked for a large body of NPC speech that changes with how NPCs regard a character, tied to rumours and news, so NPCs have plenty to say before the Storyteller steps in. WoDX NPC 0.11.0 adds about 370 lines (data/stock-talk.mjs): greetings for six spans of years (1197-1499, 1500-1799, the 1800s, 1900-1979, 1980-2025, 2026 on or the Future branch) and five levels of regard (hate, dislike, neutral, like, love), brush-offs, rumour lead-ins and refusals, everyday gossip, news and work by era, and directions by regard. Regard is the NPC's own attitude toward the character when set (the per-NPC attitude being designed in the Actions-menu thread), else the mean standing of the NPC's factions, else neutral. Rumours: the NPC passes on the newest rumour from the WoDX Storyteller rumour network that it has heard and the character has not, and the character is marked as having heard it; with none, everyday gossip. The Storyteller's own lines (a topic line, then a [none] line, on any sheet in the chain) always come first. A world setting and a per-NPC box switch stock talk off. The Storyteller's copy of a stock answer says it was stock.
## B665. NPC dialogue may be written by WoDX (2026-11-11)
Ben lifted standing rule 11 (no AI-written NPC dialogue) by decision card: WoDX may write stock NPC dialogue, including topic answers. Storyteller-written lines always take precedence.


## B655. Rivers bend like real ones (2026-11-11)
Ben asked for the river to follow the river research doc. pick_river() now lays the middle line with the sine-generated curve (Langbein and Leopold) plus Kinoshita's skew and flattening: bends about 11 water widths apart, the swing set by a sinuosity of 1.5 to 1.7 by size, each bend varied by about 15% so no two match. A loop that grows back to within two widths of itself is cut off across its neck. The old loop is kept as an oxbow lake where no way comes near it, else as a wet-meadow hollow (old river bed) that ways may cross; both are sidecar regions with an area kind. Buildings keep off oxbows as they keep off the river. The floodplain, tributaries, fishponds and mill races from the research doc are not built yet.

## B656. Rivers come from the land (2026-11-11)
Ben pointed out that the B655 river was still a curve drawn first with a town masked around it, and asked for the real order: land first, then the river, then the town. A new land.py makes a height map for each map (layered noise, a valley trough, a gentle tilt down the valley and a low rise where the town stands). The river is the cheapest way across that ground from the high edge to the low edge (least-cost path over the height map), smoothed, then given its bends only where the valley floor is flat, with no turn tighter than about 1.6 water widths. Its width now changes: narrower on straight runs, wider on bends, with ragged banks and gravel bars on the inside of tight bends. A floodplain meadow of about four water widths each side keeps houses off outside the town. Only main streets and roads always get bridges; a lesser street gets one only if no bridge is near, else it ends at a landing on the bank. The plan shows the ground as light shading. The Dungeondraft map still draws the water as a fixed-width river path; tributaries, marsh and fishponds are not built yet.

## B657. Towns stand in real landforms (2026-11-11)
Ben asked for a study of how landforms are made and for the generator to use it (landform study doc). Each map now picks one of six landforms by Moravian odds, or takes one from --land: river plain (30%), rolling hills (35%), upland plateau cut by a deep valley (15%), foothills of parallel ridges (10%), limestone karst (5%) or a mountain valley (5%). Relief runs from 5 m on a plain to 48 m in a mountain valley, since a town map covers only 300 to 850 m. The ground is raised first: layered noise, ridged noise for hard crests, fold ridges for foothills, and valley walls shaped to the landform. Then the river is laid, and the ground is worn for 28 rounds by running water (stream power law, implicit step, hollows filled to their spill point, the river as base level) and by soil creep. Inside the walls the ground is terraced, its rise cut to between a quarter and a half of what it was. Karst gets sinkholes outside the town. Brooks are drawn where enough water gathers and are traced down to the river, another brook, a sinkhole or the map edge. No house stands on a brook, in a sinkhole, or on a slope over 0.3 rise over run (0.38 inside the town). The plan shows hill shading and contours, and the caption names the landform. Brooks go into the Dungeondraft map as water paths, and brooks and sinkholes go into the sidecar as areas. Lone hills with castles, river terraces and cliffs are not built yet.

## B658. Bridges only where needed (2026-11-11)
Ben asked that bridges be made only where they are needed. A road through the town keeps its bridge unless another road's bridge is within half the long walk. A lesser street gets one only when no bridge stands within the long walk: 40 squares in a village, 60 in a town, 90 in a city and 120 in a metropolis. A way that crosses the river twice is weighed at each crossing. This also fixes a fault in B656, where a street cut at the river was split exactly on the water and so kept its bridge. A river must now run at least 0.7 of the map's width inside the map, so it no longer just clips a corner. Also fixed: the oxbow regions in the sidecar no longer break the part window.
## B670. NPC attitude toward each character (2026-11-11)
Ben asked for an attitude track per NPC, in addition to faction standing (03:05Z). Each NPC regards each character on the standing steps (Hunted to Honoured). The first meeting takes the character's standing with the NPC's household (a faction of that name or key), else the first faction the NPC belongs to, else Unknown. After that it moves only on how the characters treat that NPC. Stored on the NPC's world actor, flags["wodx-npc"].attitude {character id: {step, log}}; changes from players go through the approval queue as wodx-npc.attitude. WoDX NPC 0.12.0, attitude-rules.mjs and attitude.mjs.

## B671. "With this person" (2026-11-11)
WoDX Actions 3.20.0 puts "With this person" third in every line's Act group. It deals with the targeted NPC, or the nearest in talking reach: Talk (the topic window), Persuade, Fast-talk, Deceive, Intimidate quietly, Threaten openly, Question them, Bribe, Charm or seduce (the Seduction action) and Use a power (the line's menu with the NPC targeted). The pools are V20's social systems (pp. 265-266; V20 Dark Ages pp. 338-339 agree); the first pool the sheet has dots in is rolled, so later-era Abilities stand in where they fit. Book notes: docs/research/social-book-checks.md.

## B672. The NPC's resisting roll is the Storyteller's (2026-11-11)
Ben's choice (03:06Z). The player's card shows the player's dice and what happened; the NPC's roll, the attitude and its move go to the Storyteller as a blind whisper.

## B673. Attitude and social rolls (2026-11-11)
House rules, in PENDING-REVIEW: attitude moves the difficulty by one a step past Unknown, at most two (intimidation ignores it); each act's outcome may move the attitude (social-rules.js ACTS[].moves); Persuade sets V20's sample pool against Willpower; Bribe is Manipulation + Streetwise (or Finance, Commerce, Hearth Wisdom) against Willpower with 0 to 3 dice for the offer.

## B674. Sway notes and the new "Only when" tests (2026-11-11)
A won roll leaves a note on the character for an hour of game time: flags["wodx-actions"].sways [{kind, npc, npcName, at, until}], kinds persuaded, charmed, intimidated, bribed, fooled. WoDX Chronicle 0.15.0 adds "attitude >= welcome" and "persuaded [by <name>]" (and the other kinds); a bare test means the NPC being dealt with, which WoDX NPC's talk window now passes with every check. Agreed with the topic-menu thread.

## B675. Lift and plant (2026-11-11)
WoDX Actions 3.21.0 adds Lift something and Plant something to "With this person". No book writes a pickpocketing system (V20 lists it under Larceny, p. 105; V20 Dark Ages under Legerdemain, p. 165, with Dexterity + Legerdemain at 8 for a key off a belt, p. 328). House rule: Dexterity + Larceny (Legerdemain, else Subterfuge) at 6; the mark notices only by beating it with Perception + Alertness. Only pocket or jacket sized things (concealment P or J) come off the person. Two net successes take what was gone for; one, the first thing the hand finds; coins come off WoDX Storyteller's purse when it is there (a tenth, a quarter or half). The card names where people keep things by year: a belt purse before 1600, coat pockets to 1900, wallet and phone to 2020, then a cred chip. A player's take, and being caught, wait in the approval queue (wodx-actions.lift, wodx-actions.caught); caught raises the alarm on the scene, costs a step with the NPC's faction, and two steps of the NPC's attitude.

## B676. Charm or seduce with this person (2026-11-11)
"With this person" runs V20's three-stage Seduction (p. 266) with the NPC's attitude shifting each stage's difficulty. A won seduction leaves a "charmed" note and raises the attitude a step; a botch lowers it. For Kindred, a won seduction offers to feed at once, as the Siren hunts (V20 pp. 259-260); feeding opens the usual window, so Masquerade, Humanity and the vessel's blood work as before.


## B700. Travel by distance and the year's ways (2026-11-11)
Ben approved the open world study (all recommendations). A travel place may carry a distance in km and a kind of road (track, country road, main road, motorway, town streets, railway line, water). The trip's time comes from the fastest way the year allows on that road, or the way the player picks: on foot, on horseback, by cart or coach (to 1945), by boat, by tram or bus (from 1869), by train (from 1839, on a railway line), by car (from 1900), and transit pods on the Future Darkness branch (from 2040). A motorway counts as a main road before 1971 and a railway line before 1839. Hand-typed minutes on a route or place still win, so places set up before keep their times. House figures; the books give no travel speeds. Code: Storyteller road-rules.mjs, world-rules.mjs tripPlan.

## B701. The weather and the dark slow the road (2026-11-11)
WoDX Atmosphere's weather for the night slows a trip by distance: mud on unpaved roads in rain, snow lying, deep snow, thick fog for riders and drivers, a gale for walkers and boats. Country roads count as paved from 1950, main roads from 1750, town streets from 1800. Before 1900 the open road is unlit at night, and walkers, riders and carts go at two thirds of their speed (town streets before 1800: four fifths). The factor is capped at 2.5. House figures.

## B702. Encounter odds by road and the dark (2026-11-11)
The encounter chance an hour is scaled by the road: a track 1.5 times, a country road and town streets as set, a main road three quarters, a boat three quarters, a motorway and a railway a quarter. An unlit road at night adds a quarter. Faster ways have fewer hours on the road, so fewer checks.

## B703. The player picks how to travel (2026-11-11)
Out on your own has a How list with the ways open in the year; the default is the fastest way open. A way the road cannot take (a train with no line) goes by the fastest way open instead. Whether the character owns a horse or a car is the Storyteller's call; the log says how they went.

## B704. Routines follow the age (2026-11-11)
Ready routines change with the age of the year: medieval (to 1499, the hours first written), early modern (1500 to 1799), industrial (1800 to 1913), twentieth century (1914 to 1979) and modern (1980 on). An age with no hours of its own for a routine uses the nearest earlier one. The Future Darkness keeps the modern hours. A routine with hours of its own never changes. Code: NPC routine-rules.mjs AGES, presetBlocks.

## B705. The hours of each age (2026-11-11)
House readings for the Czech lands: shops by the town clock after 1500; the twelve-hour workshop and factory day in the nineteenth century; the eight-hour day and the short Saturday from 1918; the five-day week, late bars and fewer at Mass after 1980; the secular priest's day (no Matins at night) from 1800; Cainites hunting the gaslit streets, then clubs. Ghouls, elders, Garou and recluses keep their hours in every age.

## B706. Ready routines for later ages (2026-11-11)
New ready routines: student (from 1348), factory hand (from 1800), police patrol (from 1850), clerk or office worker (from 1850), night-shift worker (from 1900). The routine window lists a ready routine only from its year, and has Hours of the age to fix one age.

## B707. Word travels at the speed of the age (2026-11-11)
One table in WoDX Chronicle (media-rules.mjs) sets how fast word travels, used by the rumour mill and by Masquerade breaches: word of mouth, then printed sheets (1490), the newspapers (1848), the wireless (1923), television (1953), the internet (1995) and the Net on the Future Darkness branch (2026). Each knower tells 2 a night by word of mouth and in the age of print, 3 from the papers, 4 from television, 6 with the internet, 8 on the Net. House figures.

## B708. Big news floods (2026-11-11)
A rumour can be marked big news. In the age of print each knower tells 4 a night; from the papers on, big news reaches everyone it can in one night. A breach reaches its severity times the age's reach of new places a day (1, 2, 3, 4, 5), and from 1848 a breach of severity 2 or more reaches every place in a day. Rising to the Prince and the hunters still waits on the queue as before. In the Dark Ages nothing changes.

## B709. Rumours change in the telling (2026-11-11)
A world setting, off by default: each telling has a 15 percent chance to twist the tale. The rumour mill counts the twists for the Storyteller to play; WoDX never rewrites the words.

## B710. Townsfolk are not all the same age (2026-11-11)
Item 4 of the open world study. Pass the Years (WoDX Creation) already ages every character and offers death by age and an heir; a character with no birth year is taken as 20 when the skip starts, so a long skip took a whole town in the same year. NPCs who keep a WoDX NPC routine or belong to a household, with no birth year, are now taken as 20 to 49, seeded by the actor, so deaths spread over the decades. Player characters and other NPCs keep 20. Code: Creation time.mjs assumedAgeOf, data/time.mjs MORTAL.townSpread.

## B711. The town stays staffed (2026-11-11)
When Pass the Years proposes a certain death (100 years or more) for townsfolk, "An heir inherits" starts ticked. The heir's sheet is copied from the dead one, so it keeps the routine, the household, the places and the talk sheet; the Storyteller can untick it. Deaths themselves still wait for the Storyteller's tick in Pass the Years, never automatic.

## B730. Realm maps: every realm past the near worlds gets a stand-alone map (2026-11-11)
Ben asked (03:33Z, 04:01Z) how Umbral maps are formed and for map logic for every realm outside the Near Umbra; some need not be layers on a physical map. WoDX Otherworlds 0.8.0 keeps the near worlds (Penumbra, Shadowlands, Near Dreaming, Net) as twin levels of the physical map, and draws every realm past them as a scene of its own from a seed and the year in force: 34 realms across eight lines (realm-maps-rules.mjs REALMS). Study: https://claude.ai/artifact/WrAho8YW73inRyAjAVo8Vz.

## B731. Seven layouts for realms (2026-11-11)
Open land, maze, web city, islands, battlefield, sectors and descending rings (SHAPES). Each realm takes the one that fits its law: realms of confinement are mazes, realms in a void or the storm are islands joined by narrow ways (their edges stop movement but not sight), realms of descent are rings down to a pit. Every landmark and way out is checked to join the arrival.

## B732. Realms change by era (2026-11-11)
Each realm lists era spans with notes and map changes (ruin, blight, Weaver web, frost, density, closed). Dates the books give are used (the Net from 1990, the Resurgence of 1969, the Avatar Storm and the Sixth Great Maelstrom of 1999, Autochthonia from 1895); the rest are house rules marked in the note. Spans past 2025 apply only on the World of Future Darkness branch; the Endless Winter freezes the Umbra and the Dreaming from 2090 there.

## B733. Sending travellers into a realm (2026-11-11)
The Storyteller sends the selected tokens into a drawn realm from the Realm maps window: each token is made again on the arrival cells and remembers where it stood (flags.wodx-otherworlds.cameFrom); its owners are pulled to the scene. "Bring them back" returns each to its old scene, spot, level and height. The power or road that carried them is the Storyteller's call; each realm lists its ways in. Inside a realm, Storyteller 0.21.0's teleport moves tokens as on any map.

## B659. Building designs by era (2026-11-11)
Ben asked for building designs for each era, drawn from real models where they exist, and approved them (04:23Z). tools/mapgen/eratypes.py adds 23 building types, each with its model and its years: arcaded house (Telč), sgraffito house (Slavonice), town hall (Olomouc, Brno), house in the Jewish quarter (Mikulov, Třebíč), baroque burgher house (Brno), post inn, cloth manufactory, courtyard tenement with pavlač, textile mill, villa, school, war hut, Baťa house (Zlín, the 6.15 m module), functionalist villa (Tugendhat), department store (Baťa), panel block (Brno-Lesná T06B), house of culture, supermarket, petrol station, entrepreneur's house, printed house, capsule tower (Nakagin) and vertical farm (Despommier). Study: https://claude.ai/artifact/8wr9zkAABKd9Bnoz7tba43.
With --year, eras.py rebuilds the town at each era's start (1450 Renaissance 30%, 1601 Age of Reason 30%, 1837 Victorian 25%, 1919 mid-century 12%, 1990 modern 8%, 2010 Future Darkness 15%): a house or shop comes down and an era type of the same role goes up on its front line. Big types go near the market, on the roads out, or as an estate on open ground (panel blocks, supermarkets). Houses of the Jewish quarter stand in one cluster, in about half of towns. Maps given a year from 1840 get room outside the old town (6, 12, then 18 cells of margin); maps with no year are unchanged. Modern items come from Tyger's packs and future ones from Mog's Sci-Fi pack; their sizes in cells come from each image at 256 px a cell, measured on the PC.
With --year, eras.py rebuilds the town at each era's start (1450 Renaissance 30%, 1601 Age of Reason 30%, 1837 Victorian 25%, 1919 mid-century 12%, 1990 modern 8%, 2010 Future Darkness 15%): a house or shop comes down and an era type of the same role goes up on its front line. Big types go near the market, on the roads out, or as an estate on open ground (panel blocks, supermarkets). Houses of the Jewish quarter stand in one cluster, in about half of towns. Maps given a year from 1840 get room outside the old town (6, 12, then 18 cells of margin); maps with no year are unchanged. Modern items come from Tyger's packs and future ones from Mog's Sci-Fi pack; their sizes in cells are guesses until checked on the PC.
## B740. More stock talk: ten new kinds (2026-11-11)
Ben asked for every suggested kind of NPC line. NPC 0.13.0 adds data/stock-talk-more.mjs (about 500 lines, house writing): what a mortal notices about the character (kind, wounds, frenzy), voices for thirteen kinds of people (clergy, noble, merchant, soldier, criminal, scholar, servant, peasant, corporate from 1980, street from 1900, child, beggar, drunk), small talk on feasts, fasts, the weather and the season, talk of the character when a rumour names them, open Ledger debts, remembering the last visit (within 30 days or after a year), farewells by era, remarks as a routine changes, cries of alarm and pain, and trade and social-roll lines that WoDX Actions reads through api.talk.stock(kind, {npc, pc}).

## B741. How the greeting is put together (2026-11-11)
The greeting is the Storyteller's [greet] line, else a stock one (a remembered visit takes the place of a stock hello, never of the Storyteller's line), then at most one aside, most pressing first: a wound or frenzy, an open debt, what the character is (one time in three), a rumour about them, small talk (one time in two). Only mortal NPCs remark on what the character is. Goodbye says the Storyteller's [farewell] line if one fits, else a stock farewell. A voice is the one chosen in the behaviour window, else the first fitting word in the NPC's factions or household; children, beggars and drunks keep to their own words, other voices mix with the era's.

## B742. Remarks and cries, with limits (2026-11-11)
World setting "NPCs remark and cry out": speech bubbles (default), bubbles and chat, or off. A remark comes one time in three when an NPC's routine moves to a new activity, at most once in 90 seconds per NPC and two in any 10 seconds anywhere. A place alarm makes one or two awake mortals there cry out; a hurt mortal or ghoul NPC cries out. "Quiet" in the behaviour window stops one NPC; "No stock talk" stops all of it for them.
## B734. Umbral twins from the town generator (2026-11-11)
Ben approved (04:27Z) the recommended next step: a map made by the WoDX town generator is reflected in its Penumbra and Shadowlands levels. The generator's file beside the map (name.wodx.json) now records what each place means (type, wealth, dirty trade, rebuilt) and the buildings later ages pulled down, with the year and why. WoDX Otherworlds 0.9.0 reads it and puts one overlay tile on each twin level and regions for the marks that matter in play. A scene with no twin levels gets plain tinted ones. Rules in reflect-rules.mjs.

## B735. What the Penumbra shows (2026-11-11)
Churches, chapels and the market cross loom; taverns and markets less so. Rich wards, workshops, the railway, offices and quays carry the Weaver's webbing, thicker by age (0.2 before 1500, 0.45 to 1850, 0.7 to 1950, then 0.9; full on the future branch after 2025). Dirty trades, burned plots, bomb sites and neglected graveyards sour toward the Wyrm. Brooks, parks and river banks grow with the Wyld. Poor back lots are faint. W20 pdf 314-317 / p. 312-315 gives spiritual weight, webs along streets, Blights and neglected graveyards; that loved places loom, and all the strengths, are house rules.

## B736. What the Shadowlands show (2026-11-11)
Buildings later ages pulled down stand again as relics from the year they went; burned houses and the street before the bombs do too. Churches and cemeteries thin the Shroud (one lower, house rule). Dirty trades rot fastest. Bomb sites may open a Nihil. Wraith 20th pdf 85 / p. 20. A map grown to a later age is never read as an earlier year.

## B737. Page checks for the realm catalogue (2026-11-11)
The page lookups came back and the realm entries now cite them: Flux, the Summer Country and Wolfhome (Umbra: The Velvet Shadow), Autochthonia (Iteration X pdf 69 / p. 67), the Far Shores as an archipelago the empire forbids voyages to (Wraith 20th pdf 84 / p. 91), Stygia's dates (Charon lost in the Fifth Great Maelstrom of 1945, pdf 86 / p. 93) and the Yellow Springs under Yu Huang (pdf 498 / p. 433). Stygia and the Far Shores after the Sixth Great Maelstrom stay house rules: Wraith 20th is set before it.

## B760. The crossover referee (2026-11-11)
Item 1 of "Lines and eras that meet", approved by Ben on 10 November. WoDX Chronicle 0.17.0 adds the referee: one Storyteller window (in the Storyteller's hand, a key binding with no default, and api.referee) that says what happens when one line's power meets a creature of another line. The cases are in data/crossover.mjs, each resting on a row of the rules-clash table: mind and emotion powers (Generation, True Faith by era, Day or Night in the Dark Ages, Garou with Willpower, mages with countermagick), Auspex against Obfuscate by the era's book (the same reading as WoDX NPC, B89), countermagick both ways (M20 pp. 545-546), drinking another line's blood, ghouling, the Delirium, blows between lines, frenzy, Paradox witnesses, possession, wraith powers and the Umbra. The selected token and the first target fill in who acts and on whom; the referee works out what it can from the two sheets and offers the books' rolls, which go to the Storyteller alone. Where no book rules a pair, the power works by its own book against the target's Willpower as for a mortal (house rule). Three cases are drafts until their pages are read on the PC: Dominate on a changeling in later eras, Dominate on a wraith, and Garou or Fera blood fed to a ghoul. Book: Dark Ages books for the classical era, the living gods, the Dark Ages and the Long Night; V20 and its kin after.

## B761. The referee's book checks (2026-11-11)
The PC book lookups came back. Changeling 20th gives the Kithain no defence against vampiric mind powers, so Dominate on a changeling after the Dark Ages goes against Willpower as for a mortal (house rule). No book rules Dominate on a wraith (Wraith 20th p. 410 sends vampire powers back to V20); it needs the wraith seen first, then Willpower (house rule). V20's "Seeing the Unseen" (p. 142) rules Auspex against hiding that is not a Discipline (a wraith, a mage, a fae): a resisted roll at 7, Perception + Awareness against Manipulation + Subterfuge; the referee now uses it for every line but Kindred and ghouls. Ghouls: Fatal Addiction (p. 23) reports, in character, that Garou throw vitae up and ghosts cannot be ghouled while a mage takes it like a mortal; WoDX takes all three as house rules, and Garou or Fera blood gives a ghoul no vitae. An imbued hunter (from 1999, 2023 on the future branch) is immune to supernatural mind and emotion control and sees through concealment, read from the Hunter Players Guide (p. 58); these three cases stay drafts until the Hunter: The Reckoning core has text on the PC. Chronicle 0.17.1.

## B762. The anachronism check (2026-11-11)
Item 2 of "Lines and eras that meet", approved by Ben on 10 November. WoDX Sheets 0.8.0: when the clock jumps a year or more, or the era changes (a time skip included), the Storyteller gets one whispered card naming each player character's possessions that the jump put out of their time, read with the same lists the Possessions tab uses (WoDX Library's gear by era and the era goods): things not made yet, and things no longer made, which are rare antiques now. Only what the jump changed is raised: a thing already out of its time stays quiet. A Keep button marks an item as kept (an heirloom, a relic, a traveller's kit); it is never raised again and the sheet no longer counts it. World setting "Anachronism check": Automatic (on, except in the Live world, as the group's approval asks), On or Off. The Storyteller decides what happens to the rest; nothing is taken off a sheet. Vehicles and tools on the map (Interactables) are not read yet.

## B763. Mage effect keywords (2026-11-11)
Nineteen effect keywords in the Mage 20th Cast window (Sense, Harm, Mend, Ward, Fortune, Hasten or Slow, Light or Dark, Move, Charge or Drain, Veil, Night Sight, Rise, Disarm or Trip, Hold, Fear, Sway, Shape, Step Sideways, Free Effect). Each brings its lowest Sphere (study table; book check of the Sphere lists still open). The need is the largest feat, one more success for each keyword past the first (house rule), at least two on someone else (p. 502), plus the planned extra targets and duration steps. Successes buy extra targets, then duration, the rest goes to strength (p. 504 chart). Results route: applies with Undo (health, Quintessence, timed effects, light, height, sight, knockdown, held), the approval queue (Move, Fear, Sway on NPCs, Shape, Step Sideways, another player's character unless Mend or Ward, more than three tokens, witnessed vulgar magic), or the Storyteller (Free Effects, feats of 10 or more, mind effects on player characters, beyond six months). A story counts as 30 days and six months as 182 (house rule). Move waits in the queue for now: token moves need a target point. World setting "Magic that applies itself": Automatic (off in the Live world), On, Off. WoDX Actions 3.22.0.

## B764. Moves, areas and saved rotes for Mage keywords (2026-11-11)
Move applies inside the scene: the card gives the Storyteller a button, and the next click on the map is where the token goes, with Undo. Moving another player's character still waits in the queue; another scene stays the Storyteller's call. An area (house rule; Mage 20th has no area chart, book check of 9 November 2026) costs two more successes and is a circle with a 15-foot radius that the Storyteller places from the card; Harm, Ward, Fortune, Veil, Hold, Fear and Disarm or Trip can be areas. It works once on each token standing in it when placed and on each token that walks in later, never on the caster for an area meant to hurt or bind, routed per token like a single target. It ends with its duration, or at the end of the scene for a scene or the Storyteller's call; a turn counts as six seconds of world time for an area. Undo removes the circle and what it did. A caster saves a keyword set as a rote by name in the Cast window (up to 40, one per name, a new one replaces the old) and picks it from a list there; the rotes live on the actor, not on a sheet page yet. WoDX Actions 3.23.0.

## B765. Rote items and the WoDX Cast window (2026-11-11)
A Rote item's button, on the system's Mage sheet or on the WoDX sheet's Rotes list, opens the WoDX Cast window for a Mage 20th caster, filled in from the item: its Spheres (capped at what the caster has), coincidental or vulgar, and the keyword set when WoDX saved it. So a rote spends Quintessence, adds Paradox and applies its keywords like any other casting. A Dark Ages mage keeps the system's own dialog until the Dark Ages rotes carry keywords. Saved rotes are now Rote items on the sheet (the whole keyword set on the item's flags), one per name, 40 at most; forgetting one deletes only a Rote item WoDX made, never one made by hand. Rotes kept on the actor by 3.23.0 still show. Fork 7.3.2-wodx.8 (one line in the Rote branch of action-helpers.js), WoDX Actions 3.24.0, WoDX Sheets 0.8.1.

## B766. Countermagick on keyword cards (2026-11-11)
A keyword card keeps what it needs to be worked out again (the successes, keywords, plan, Spheres, targets). When a target is a mage (Arete 1 or more) the card waits: nothing applies until someone counters or the Storyteller presses Apply now. Countermagick from the card's button (the selected token's mage, or the player's character) rolls the usual countermagick (Mage 20th p. 545) and its successes come off the card: what applied is taken back, and the card is worked out again with what is left. Several counters add up. Reflected, any successes beyond the caster's turn the same Effect on its caster with that many. Resisting Mind with Willpower and dispelling a Quiet stay their own cards. WoDX Actions 3.25.0.

## B767. What the 97 Dark Ages rotes do on the table (2026-11-11)
Each Dark Ages rote (Dark Ages: Mage pp. 108-135, Grimoire pp. 20-101) gets one effect keyword and one result, read from its own system: damage where the rote gives levels per success (Verdant Slumber, Tears of Allah; Shattering the Void waits in the queue because it depends on what the target is), a named timed effect on the caster or the target for the rote's own length (the scene, until dawn, turns, days or weeks per success, or the p. 103 ladder), a condition (Battle Smite blinds one foe per success), a move (Closet Dance), or a note of what the caster learns. 51 rotes whose result is a creature, a journey, a long ritual, a curse on a whole place or a judgement stay the Storyteller's call and are only listed on the card. The routes are the keyword routes (mind and fear on others go to the queue). The timed effects carry the rote's words; their numbers (dice, difficulties) are read from the card, not added to rolls. WoDX Actions 3.26.0.

## B768. Path magic and Numina on the table (2026-11-11)
The 70 Thaumaturgy, Necromancy and Koldunic path powers of V20 Dark Ages (pp. 275-302) and the Numina of The Hunters Hunted II (pp. 70-83) use the same effects card as the rotes. Each power was read page by page for its target, what its successes do, soak and resistance. Damage goes on the card where the power gives levels per success (Dust to Dust, Torment, Cauldron of Blood) or a set amount (Ashen Lady's Embrace, Pyrokinesis by level, a thrown object by Telekinesis level); a target who may dodge sends it to the queue. Healing comes from Pontos Euxeinos and Healing 4 and 5. Timed effects on the caster or the target run for the power's own length. 38 powers that summon or raise beings, move blood between bodies, call for a contested roll or roll their own damage dice stay the Storyteller's call and are only listed. Pyrokinesis puts one turn of fire on the card; the fire burns on as ordinary fire. The Discipline's own timed effect is skipped for a power with an entry here, so it is not shown twice. The page check also corrected Pyrokinesis level 3 to a campfire (soak at 5, 2 aggravated). WoDX Actions 3.27.0.

## B769. The Sorcerers Crusade's magic charts on the effects card (2026-11-11)
In the Sorcerers Crusade age (1450 to 1699), keyword cards and the plain "successes go to damage" line read the Crusade's own Damage and Duration chart instead of Mage 20th's. The successes are multiplied: x1 for one, x2 for two to four, x3 for five (pr 230, chart pr 240). Healing and Quintessence use the same chart. Forces adds a success and Mind takes one away (pr 230). The chart cell for six or more could not be read, so WoDX uses x3 there as a house reading. The duration ladder is the chart's (one turn, scene, day, story, six months, then the Storyteller), although two worked examples in the book are one step off. Countermagick stays Arete at 7, one success cancelling one (pr 231), and the reflect choice is gone in the Crusade, since the book has no reflect rule. The Ascension and the Dark Ages are unchanged. WoDX Actions 3.28.0.

## B738. Realm maps checked against their descriptions (2026-11-11)
Ben asked (12:31Z) for every realm map to be checked against how the realm is described and rebuilt where it did not fit. Done in Otherworlds 0.10.0, from the encyclopedia claims and their page refs. House rules where the books give no layout: the Battleground's works by year (camps to 1500, redoubts to 1913, trenches and craters after); Chantries and Amenti's fortress drawn as walled compounds; Ti Yu as Yomi's centre ring; a river two cells wide for Erebus and Duat; the black train line as a straight track to the nearest edge. Sources added: Rage Across the Heavens pdf 25 / p. 24 (Phoebe), Sins of the Blood pdf 181 / p. 180 (Enoch), Dark Kingdom of Jade pdf 90 / p. 89 (Ti Yu) and pdf 45 / p. 44 (the Jade Emperor's court).

## B739. Shadowlands relics: the newest house on each spot (2026-11-11)
Ben accepted (12:31Z) the recommendation to quiet the relics. Where pulled-down buildings overlap (by more than 30% of the smaller one), only the most recent one up to the year shown comes back. The 1960 sample town drops from 178 relics to 66.

## B745. Map keywords for realm maps (2026-11-11)
Ben said (13:04Z) the realms looked too much alike and asked for keywords tied to kinds of map logic, so realms with similar features look similar but not the same. Otherworlds 0.11.0: 22 keywords in three groups (land, built, forces), each a step on the cells plus its own marks in the art; two to four per realm from its description, weights 1 to 3, the seed sets amount and placement. Keywords that change the layout: crystal (angular islands, square city), towers and gardens (square islands; gardens also a square city), shifting (scattered islets), chasm (cracked islands), caves (rock-ringed islands; caverns grown instead of a cut maze). A Great Maelstrom adds storm, the Endless Winter ice; some eras add one (Battleground future machines, Legendary rot from 2000, Wolfhome future towers, Horizon and Shard ruins after the Avatar Storm, Scar future towers). The Storyteller can add more when drawing. Which keywords each realm gets is a house rule drawn from its encyclopedia description.

## B746. A layout of its own for every realm (2026-11-11)
Ben asked (18:10Z) for each realm to have a totally unique layout unless there is a reason to share, capturing the realm's essence, with every proposed layout through a review desk. Otherworlds 0.12.0: 31 new layouts in realm-layouts.mjs, one per realm, each with a comment naming what it draws and where the description is; the three older shapes left in use (trenches, spiral, grid) belong to one realm each. Ben approved all 34 on the Realm Layout Desk (https://claude.ai/artifact/EnzE74VG4yqx87FKzadqA1) at 18:39Z after two were reworked from his notes: the CyberRealm on a grid of tower blocks and skybridges, and Stygia as a city packed to its sea wall. Layout details (counts, spacing, what stands where) are house readings of the descriptions.

## B780. Lazy-loading each line's code is set aside (2026-11-11)
WoDX Actions keeps loading all its line code at start. Loading rare lines on first use would save about 15% of the start-up script (some 50 ms on a slow computer), but it would turn over a hundred synchronous calls in main.js, and parts of the public api, into waits. The release bundler already gives the larger gain: 14 script loads instead of about 250, and a third less code. Logged for Ben to reverse.

## B781. One effect keyword roster for every line's powers (2026-11-11)
Ben approved the keyword coverage review (https://claude.ai/artifact/5Ap3PvqPiEjnKPiFjwGuVP). The effects card's keywords in effects-rules.js are now the one roster that Mage casting and every other line's powers share, 34 in all. New: Know, Speak, Boost or Sap, Summon, Make, Work or Break, Illusion, Possess, Bind, Banish or Bar, Manifest, Imbue, Place, Weather and Time (the Traits With Teeth additions and the review's own). Story is the existing Free Effect. Step Sideways now covers every crossing. Widened: Harm carries a kind of damage (fire, sunlight, silver, Faith) and can last a turn per success of strength; Charge or Drain and Mend move any line's pool (blood, Willpower, Gnosis, Rage, Glamour, Pathos, Faith, Sekhem, Chi, Conviction), with Undo; Ward can stand against one kind and turn blows back; Fear can rouse a frenzy or calm the Beast; Sway as awe is a plain timed effect that applies on NPCs without the queue (never on player characters). Each keyword may name what resists it; a power's own book entry wins. Always-on powers get an outcome with no roll and no end (passive), for the roll modifiers the Traits With Teeth build reads. Ten Dark Ages rotes and six path powers that were bare Storyteller's calls now carry the right keyword; they stay the Storyteller's call. The Sphere options of the new keywords, the resist difficulties, the 5-dice cap on Boost or Sap and the lasting-harm length are house readings until the page check (job keyword-roster-book-check-2026-11-11). WoDX Actions 3.30.0.

The same release labels every power in WoDX's data files with its keywords (power-keywords.js): 259 Dark Ages Disciplines (the 70 path powers read their path-effects keyword), 179 Dark Ages Gifts, 160 Wraith 20th and 103 Great War Arcanoi. Each was read from its summary, and the elder powers from the page check. Always-on powers (Celerity, Fortitude, Potence, Heightened Senses and others) are marked passive. Only six stay a plain Storyteller's call. The labels do not change what a roll card does; the Traits With Teeth build reads them. Power lists for the lines with no data file yet (V20 and W20 cores, Changeling, Demon, Mummy, Kindred of the East, Orpheus, Hunter) come next, from the page check.

## B782. The Storyteller's effect and saved rituals (2026-11-11)
Ben asked for a way to make rituals and rites of the players' own, and documented ones not yet checked, work with the keyword roster. The Storyteller now has an "Apply an effect or ritual" button in the token tools. It opens a window with all 34 keywords, a strength (read as successes, 1 to 10), how long it lasts (a turn, a scene, a day, a story or six months), an area, the same options as the Cast window, a casting time and a note. It works on the targeted or selected tokens with no roll, and its card applies on the Storyteller's client with Undo, like any keyword card. The Storyteller's say is the approval, so nothing goes to the queue; Move, Summon and areas wait for a click on the map. Summon can bring tokens of a chosen actor (up to 12) where the Storyteller clicks, and Make can put a chosen item in each target's inventory; Undo removes both. A keyword set can be saved by name as a ritual for the world (60 at most) and picked again later. The casting time is shown on the card only; a long rite that needs rolls over days still uses the Storyteller's long tasks. WoDX Actions 3.31.0.

## B790. Light-touch mode holds proposals instead of dropping only the era check (2026-11-11)
Light-touch mode said it turned off every WoDX proposal, but only the era check read it. Now the approval queue itself reads it: while it is on, every proposal except a player's own request is held back without a notice, the same way proposals past the NPC cap are held, and the Storyteller puts them in the queue from the approvals window when ready. A kind set to approve on its own is held too, so nothing changes the world quietly on a light night. The era check still skips itself. Whispered NPC plans in combat are cards, not proposals, and still follow the NPC's own mode.

## B791. The years between eras are named in the Chronicle Rules journal (2026-11-11)
Years no era book covers keep the last era's rules (1902 to 1913 keep Victorian; on the Future branch 2004 to 2009 keep Modern). The Era and calendar page now lists each such span and the era it keeps, worked out from the loaded profiles, the region and the branch rules.


## B666. Present-day layouts adapted from Cataclysm (2026-11-11)
Ben asked for Cataclysm: Dark Days Ahead's building code to be used where it helps. Its layouts are converted, not redrawn: tools/mapgen/cdda.py reads the map data and writes cdda_types.json, kept in the repository with Cataclysm's CC BY-SA 3.0 credit (tools/mapgen/CDDA-CREDIT.md), so the source checkout is needed only to convert again. One Cataclysm square (1 m) is 1/1.524 of a WoDX cell (5 ft). The street side is turned to the bottom. A layout whose outer wall has gaps is left out (the first bar, the empty warehouses, the lock-ups, the motel and the mansion). Furniture goes on the squares Cataclysm gives it, from Tyger's modern packs, shrunk to fit where needed; a piece that will not fit is left out. A door or window standing alone inside gets a short wall of its own (a glass screen or a counter door).

## B667. Where the present-day public buildings stand (2026-11-11)
They are present-day buildings, so they appear from 1960. In a town grown to 1960 or later each kind goes up once, in one of its variants: police station, bank, library and bar near the market; funeral home, warehouse and pumping station on the roads out; a music club, museum, gallery and hospital in some towns. No new churches, synagogue or cathedral are placed, since few were built in Czechoslovakia after 1948; those layouts are there for a Storyteller to place. The hospital needs open ground of about 47 by 37 cells and is left out where there is none (most town and city maps).
## B800. One trait effect table for every merit, flaw and background (2026-11-11)
Ben approved the Traits With Teeth design (https://claude.ai/artifact/4QwnLur2u6kmHPQSMjTgn4) as recommended, at priority 2 beside Interactables. WoDX Chronicle 0.18.0 holds the table (data/trait-effects.mjs): all 162 V20 merits and flaws with cost, printed and pdf page, one or more of twenty patterns, the kinds that can hold each one and the kinds it works on; and the 71 backgrounds found across fourteen books, each with the kind of hook it gets. Names come from the PC book checks of 2026-11-11; no book text is copied. Other books' merits and flaws join in step 11 (BOOKS_DONE).

## B801. Traits are matched by name, and a flag on the item overrides it (2026-11-11)
The system keeps merits, flaws and backgrounds as hand-typed Feature items. WoDX matches each by name or alias, without case, quotes or spaces. The Storyteller can set the match by hand in the new "Trait effects" window on the actor sheet header (item flag wodx-chronicle.trait = {key}), or mark a home-made trait "No effect". Unmatched traits are listed there as "no effect yet".

## B802. Both sides' kinds count, for players and NPCs alike (2026-11-11)
Ben, 2026-11-11 11:54Z: the checks must take the supernatural kinds of player characters and NPCs into account. Each entry names holders and against. A trait on a kind that cannot hold it (Cast No Reflection on a mortal) is matched but does nothing, with the reason shown. A ghoul, revenant, Kinfolk, hunter, sorcerer or kinain also counts as a mortal. NPC actors are read exactly as player characters are.

## B803. "Only when" tests for traits (2026-11-11)
Chronicle's "Only when" lists take four new tests: merit <name>, flaw <name>, background <name> [>= 2] and power <name>. A trait that does nothing for its kind does not pass the test.

## B804. Merits and flaws change rolls on their own (2026-11-11)
Step 2 of Traits With Teeth. WoDX Actions 3.29.0 reads the trait table through Chronicle's api.traits on every action, quick check, social roll and frenzy check. Each roll gets tags from its Attribute, Ability, quick check and social act (rollTags in trait-rules.mjs); an effect whose tags match adds dice or difficulty, and the card names each trait that did ("Natural Leader +2"). Effects that need the other side's kind (Eerie Presence, the Masquerade flaws) count only when the target's kind is known. Lunacy reads the moon from WoDX Atmosphere. The world setting "Merits and flaws on rolls" turns it all off.

## B805. Iron Will and Magic Resistance make powers on the holder harder (2026-11-11)
A Discipline roll against a target adds the target's resisting traits to the difficulty (at most 10): Dominate and Dementation count as mind powers; Thaumaturgy, Koldunic sorcery, Necromancy, Obtenebration of the Abyss, paths and rituals as magic. NPCs and player characters are read the same way. Iron Will gives +3 against mind powers and Thaumaturgy (V20 core p. 485 printed, pdf 493); Magic Resistance gives +2 against magic (p. 493 printed, pdf 501), so Thaumaturgy on a target with both is +5. The Willpower spend against level 6 and 7 powers stays the Storyteller's call.

## B806. Tick boxes for facts a roll cannot see (2026-11-11)
Some traits depend on things no roll records: the sense used, speaking aloud, a first meeting, a risky deed, balance, an unplanned act. The action and quick check windows show a tick box for each such fact, but only when the character holds a trait that names it. A social roll ticks "first meeting" by itself when WoDX NPC says the two have not met.

## B807. One starter for every fight that begins by itself (2026-11-11)
WoDX Combat 3.9.0 holds a single fight starter (start.js, start-rules.js) that every trigger calls: it joins a fight already running on the scene, else uses an encounter set up but not started, else makes one, adds the people named and their household within call, and starts it. World setting "Start fights by themselves": Off, Suggest (default, a card with Start the fight) or Auto (at once, with Undo). Light-touch mode holds Auto at Suggest; the Storyteller's own Accept starts it at once unless the setting is Off. The same people for the same reason stay quiet for a minute. The books leave the start of a fight to the Storyteller (VtDA20 pdf p. 344), so this is a house rule.

## B808. Who starts a fight on sight (2026-11-11)
An NPC with Aggression of a half or more starts a fight when it sees a character it regards as Hostile or Hunted, within "A hostile NPC sees this far" (30 yards by day, a third at night), with walls and closed doors blocking the view. Guards (the guard template, or a guard tactic) at a place on alarm do the same for anyone at Unknown or worse. Sneaking and Obfuscate use the Reaction region's noticing roll (V20 Dark Ages pp. 169, 195), at most once every 30 seconds for the same pair. Bystanders never start one.

## B809. Turning hostile, frenzy and an attack outside a fight (2026-11-11)
An NPC whose attitude falls past Hostile while the character is in sight and in range starts a fight. A character who enters frenzy outside a fight starts one with the nearest living person within 20 yards. An attack made outside a fight starts one with attacker and target; the attack already rolled stands as the opening blow of the ambush. What surprise gives beyond that blow (V20 p. 274, Dexterity + Stealth against Perception + Alertness) waits for a book check.

## B810. A "fight" outcome for doors, regions and dated events (2026-11-11)
WoDX Chronicle 0.18.1 adds `fight [names or households]` to the Then outcomes. Blank, it brings in the NPCs within range who regard the character at Distrusted or worse; with names, the NPCs by name or household. A Reaction region's Fight now goes through the starter too, and in Auto it is carried out without waiting when fights start by themselves.
## B668. Older forms of the first group (2026-11-11)
Cataclysm's layouts are present-day, so tools/mapgen/firstgroup.py draws the older forms of the same kinds for WoDX, each after a real Moravian kind: lazar house (1197 to 1786), charnel house (1197 to 1784), town gaol (1197 to 1850), monastery library (1197 to 1782), counting house (1450), synagogue (1550, only in towns with a Jewish quarter), burgher palace (1600), granary (1650), coffeehouse (1700), general hospital (1786), cemetery chapel and mortuary (1784), museum (1817), railway goods shed (1839), gendarmerie post (1849 to 1918), savings bank (1852), public library (1860), grand hotel (1870), waterworks (1872) and dance hall (1880). In a town grown with --year each goes up once, in the first era layer after its first year, and stays up after its kind stops being built; the rarer ones (palace, museum, hotel, waterworks, monastery library, dance hall, granary) stand in some towns only. The Dark Ages forms show only in grown towns: a town map with no year is unchanged.

## B669. The rest of the first group: the layouts that failed, the hospital, cellars and upper floors (2026-11-11)
Ben approved all three (13:36Z). The converter now reads palettes kept beside their maps, sets in chunks of furniture placed by mark or by position (Cataclysm's "nested" rooms), turns the tiles of a big special by the way each faces, and treats floor open to the map's edge (a yard, a car park, a patio) as outside; the first bar, the motel, the mansion (the 3 by 3 tile special) and both empty warehouses now convert, and rooms Cataclysm leaves bare get a kit of tables, beds or crates on fixed spots. The lock-ups are left out: two rows of open garages either side of a drive, not one building.
The hospital: where no open ground takes it, eras.py pulls down up to 30 houses outside the old town for it, never a kept building, a street or the mill; where even that fails (most maps, because roads cross every big enough patch), a hospital entrance block stands on the town map instead, its region carrying site {kind: building, type: cdda-hospital}, and the full hospital is its own map: ddsite.py --kind building --type cdda-hospital draws any building type on its own grounds with a path to the road and, from 1950, a car park.
Cellars and upper floors (floors.py, ddsite.py --kind floors --type KEY): each level keeps the ground floor's outline and inner walls and is its own map, listed in <name>-levels.json, with the stair in the same spot on every level (a corner of the biggest closed room clear of the doors, also drawn on the ground floor of that set) and a climb feature for it. Upper floors: one for each storey up to five; outer doors become windows; rooms become bedrooms (homes), guest rooms (inns) or offices, small ones store rooms; a court or yard stays open. Cellars: under every building but barns, coops, huts, sheds, granaries and warehouses; inner doors become doorways, no windows; a crypt under churches and synagogues, a vault under banks, counting houses and palaces, a morgue under hospitals and funeral homes, else cellars with barrels, crates and sacks (shelves after 1919). House rules.
## B783. Keywords for the lines with no power data yet (2026-11-11)
The page check of 2026-11-11 listed the powers of seven lines this module holds no power data for. Each now names its effect keywords in power-keywords-lines.js, keyed by a slug of the power name: V20 Disciplines and Thaumaturgy paths (150), W20 Gifts (361 by name, gifts that share a name with a Dark Ages Gift take its label), C20 Arts (88; realms are targets, not powers, so they are left out), Hunter Edges (35), Demon Lores (70 whose names came through the scan whole), Mummy Hekau (123) and Orpheus Horrors (10). Kindred of the East waits on a better scan, since the page index came back unreadable. The labels are house readings of what each power does, not book text. api.effects.keywordsOf(set, nameOrSlug) reads them; powersWith(set, key) lists a line's powers by keyword.

## B784. The books' rituals and rites in the Storyteller's effect window (2026-11-11)
The page check of 2026-11-11 listed 314 documented rituals and rites: V20 Thaumaturgy and Necromancy (62), V20 Dark Ages Thaumaturgy, Necromancy and Abyss rituals (66), W20 rites (53), Dark Ages: Werewolf rites (38) and Mummy: The Resurrection Hekau rituals (95). book-rituals.js holds each with its level, casting time, who it works on, what it does in our own words, what resists it, the page and its keywords. Picking one in the Storyteller's window fills in the keywords, strength (the ritual's level, read as successes), the casting time, an area when it works on a place, and a note with what it does and the page. The roll to cast stays the book's (Intelligence + Occult, and so on); long rites over several days use the Storyteller's long tasks. Mage 20th has no named rituals in the core book, so none are listed.

## B820. Natural rivalries between kinds of NPC (2026-11-11)
WoDX NPC 0.18.0 gives every NPC a set of sides (its line, clan, sect, tribe, affiliation, creed, court, kith, house, its NPC factions, and sides the Storyteller writes) and reads a dated table of rivalries (rivalry-rules.mjs, docs/RIVALRIES.md): 61 pairs across every line and the mortal powers of the Czech lands, 1197 to the Future Darkness, each with how A regards B and B regards A on the -3 to +3 scale (-1 Tense, -2 Hostile, -3 Hunts). V20 of each line first, then Revised or 2nd edition; nothing from 5th edition. Steps and years are house readings until the book check (docs/RIVALRIES.md) is done. The Storyteller switches rows off and adds rows in "Rivalries…" on the NPC panel.

## B821. Knowing what the other is (2026-11-11)
A rivalry counts only for sides the NPC can tell. A line shows when the other is obvious (a war form, a power used openly) or to a sense: Auspex 2 (Aura Perception), Kenning, an imbued hunter's Second Sight, Sense Wyrm; a Garou rolls Perception + Primal-Urge at 7 to smell a Leech and a mage Perception + Awareness at 8 (house rules, rolled once per pair until ten minutes of world time pass). Clan, sect, tribe and the like show to a face once met, to one of the same line who can tell what the other is, or when obvious; faction membership to factions with a standing toward it; sides written as worn openly to everyone.

## B822. Flashpoints and fights between NPCs (2026-11-11)
When an NPC moves, the active Storyteller checks it against the other NPCs in sight (the fight starter's sight range). Regard is a Rivals line on the NPC, else the Storyteller's standing between their factions, else the lowest row in force; a ghoul takes its domitor's quarrels one step milder. Tense never fights on sight. Hostile rolls d100 at 35%, Hunts at 85%, +20 on its own ground, +10 at night for Kindred and Garou, +15 outnumbering two to one, -25 outnumbered, -30 before mortal witnesses for sides that keep a secret (-15 for the Sabbat), +15 for Rage 5+ or hunger, times (0.5 + aggression / 2), halved once by the parley tactic, nothing on truce ground (scene flag), capped at 95. Timid NPCs never start one. A fight goes through WoDX Combat's starter as source "rivalry" with each token's side; Combat 3.10.0 stores the sides on the fight (flag wodx-combat.sides, kin taking the side of whoever brought them) and the NPC's enemies follow the sides before disposition. A failed roll is a stand-off: a whispered note and a spoken threat.

## B823. Rivalry seeds first meetings with characters (2026-11-11)
When neither household nor faction standing gives an NPC a first step toward a character, a rival side it recognises in the character does. A Hostile seed then counts as Hostile for the existing sight trigger (B808), so a Suggest card can follow.

## B824. Ten new fighting templates and four new tactics (2026-11-11)
Templates sabbat, sheriff, mage, technocrat, changeling, spectre, fomor, inquisitor, soldier and mob. By line, a Sabbat Cainite starts as sabbat, a mage as mage (technocrat for the Order of Reason or Technocracy), a changeling as changeling (both were the mortal guard), an inquisitor as inquisitor, a Spectre as spectre, a fomor as fomor. Tactics pack (goes for the foe an ally has already hurt), ground (attacks harder and bears one wound more on a place its faction holds), masquerade (no powers and readier to slip away before mortal witnesses while the foe passes for human), alive (aims to take the foe alive), parley (halves the flashpoint once). The behaviour window gains Tactics, Sides, Worn openly and Rivals.

## B825. Twelve new routines (2026-11-11)
Sabbat pack (from 1493), sheriff, Tremere, mage, Technocrat (from 1325, office hours from 1914), changeling, wraith (by a fetter; the ghost template's default), inquisitor (from 1231, the Society's office hours from 1914), soldier, beggar, noble (estates and business from 1914) and monk or nun. House readings of each life.

## B840. Hardship weather from the sky (2026-11-11)
A scene's hardship weather now defaults to "From the sky": WoDX Atmosphere's weather for the day, on an outdoor scene, sets how harsh it is. Bitter cold (-10°C or below) in a gale or heavy snow, or 40°C, is deadly; freezing (-2°C) with snow, sleet or a gale, deep snow, -15°C, or 35°C is severe; a freezing night, a gale, heavy cold rain or 31°C is harsh. A level the Storyteller picks for the scene still wins. The books leave the harshness to the Storyteller (M20 p. 435), so these thresholds are a house rule. hardship-rules.mjs severityFromDay.

## B841. Standing that spills over (2026-11-11)
When a faction's regard for a character moves (Hunted to Honoured), each faction holding it at +2 or more moves the same way by a step and each holding it at -2 or less moves the other way by a step, through the approval queue (it touches a player's character, so it always waits). One step only: a spill does not spill again. Setting "Standing spills over", off by default. faction-rules.mjs spillFrom, op "people" in applyChanges.

## B842. NPCs who call out to passers-by (2026-11-11)
With the setting on (off by default), a player's character who walks within talking distance of an NPC may be greeted out loud, in a speech bubble, at the chance set (default one in two), once a character a day of game time, and not in a fight or while the NPC sleeps. Only a talk-sheet greet line marked aloud is used, since sheet lines are otherwise whispered; else a stock greeting. One NPC speaks a step. talk-rules.mjs mayCallOut, passingLine.

## B843. A clue's first look fills the codex (2026-11-11)
A clue tile can name a journal page and a number of successes (0 to 3, 0 for any look). The first look or examination by a character that reaches it puts a copy of the page in that character's codex through WoDX Storyteller, once a character (flag codexed). interact-rules.mjs codexDue.

## B844. Bodies left behind (2026-11-11)
With the setting on (off by default), an NPC token marked dead becomes a body (token flag wodx-storyteller.remains) that goes fresh, bloated (2 warm days), rotting (6), decayed (20) and bones (60). A warm day is a day at about 15°C; each day counts (mean + 5) / 20, from 0.1 to 2, using WoDX Atmosphere's mean temperature when it is on. Indoors counts 0.8, in water 0.5, buried 0.25. The token takes a tint for its stage. A player's character who first comes within talking distance finds it: the Storyteller gets the stage and what the era's authorities could learn (the priest and neighbours before 1500, a physician to 1840, police surgeons and inquests to 1901, fingerprints and examiners to 1986, DNA laboratories, then scanners from 2023), with a note on what a drained body is taken for. The first finding of a body that still shows how it died adds 2 heat to the hunting ground. Rough figures for play; the books have no rules for corpses. remains-rules.mjs.

## B830. The spheres and kinds of faction for each age (2026-11-11)
Factions now use the sphere list of their year, not only of their morality: the Dark Ages list to 1450, an early modern list to 1799 (the Dark Ages powers plus universities and the occult), an industrial list to 1913 (the modern spheres with the press, railways and mills), the V20 modern list to 2022, and a Future Darkness list from 2023 (the modern list plus the Net and data). Keys carry over where a power lasts, so dots held in one age keep their meaning in the next; a sphere from another age is kept and named. The kinds of faction keep their keys and change their names by period (a guild becomes a union or company, then a corporation). With no year known, the old rule (Roads gives the Dark Ages list) holds. House rule.

## B831. Founding a faction from its founders' Backgrounds (2026-11-11)
A founder pledges up to the dots they hold in Herd, Resources, Status, Retainers, Contacts, Domain and Influence; the new faction holds the sum of the pledges in each, to 5, with its Influence in one chosen sphere and Domain security at 0. This follows the books' pooled Backgrounds (a pack's Totem in W20, a cabal's Chantry in M20); page references are owed from a book check. The founders' sheets are not changed; the founding card lists the pledges for the Storyteller to mark. The Storyteller founds at once with Undo; a player's request goes to the approval queue, and the Storyteller's client reads the dots from the sheets itself, never from the request.

## B832. Ending a faction and folding one into another (2026-11-11)
End: the faction falls quiet, its places are left unheld, and the year is kept. Fold into another: its leader and members join the other faction, its places pass to it, the other gains half its dots in each Background and sphere, rounded down, to 5, and the folded faction ends with a note of where it went. Both apply at once with an Undo card. House rule.

## B833. A strained faction may split (2026-11-11)
A faction is strained when its leader is dead, in torpor or missing, when it botched its move this turn, or when a live rumour of severity 3 or more is blamed on it. A strained faction with at least three living people besides its leader splits on one chance in six at each turn. The first of them leads the breakaway and takes a third of the others (rounded down, the last listed), a dot of each Background the old faction holds two or more of, and a dot of its strongest sphere; the two stand at -2 to each other. A split is always a big change and its own card in the approval queue. Factions players run never split by themselves. A world setting turns splits off.

## B834. New powers from dated events (2026-11-11)
Six of the Chronicle's dated events offer a local faction through the approval queue, once: the Camarilla (Camarilla loyalists), the Convention of Thorns (a Sabbat pack), the Grand Convocation (a Tradition cabal), the Technocracy's naming (Technocratic agents), the Second Anarch Revolt (an Anarch gang) and the Reckoning (a cell of the imbued). The event's own entry gives its book. Any faction may also be set to rise or end with a dated event; that happens at once with Undo, since the Storyteller set it.

## B835. Factions the players run (2026-11-11)
A faction may name player characters as its owners. On "Its players give the orders" it waits at each turn until a player gives one of the six moves (with a rival and a sphere); the move is rolled as any faction's and the orders are spent. A Scheme or Hunt with no rival it can reach becomes Recruit. On "Picked as for any faction" it runs as before. Players may aim only at factions that are not secret or that their faction already has a view of. Untended decay skips player-run factions.

## B861. When two dated events clash, the newer edition wins (2026-11-11)
Ben approved every card on the Era Timelines desk and asked that no two events rule each other out. Where two books date the same event differently, the 20th-anniversary book wins, then Revised, then 2nd edition; where both can stand by a small reading (a change begun in one year and finished in another), the card is reworded instead of dropped. The rulings are in docs/research/era-timelines/deconflict.py and DECONFLICT-2026-11-11.md; the approved timeline is timeline-approved-2026-11-11.json (289 cards). The Encyclopaedia keeps each book's own claim, with a WoDX note where the chronicle follows one of them. Two rivalry spans now follow the books: the Anarch Revolt from 1381 (Guide to the Anarchs p. 19), the Accordance War ending in December 1973 (C20).

## B860. Hardship weather thresholds follow M20 (2026-11-11)
The book check found that M20 p. 435 (pdf p. 436) names what is truly dangerous: below freezing, above about 120°F (49°C), ice storms and hurricane winds. Milder weather gets narration and penalties only. B840's thresholds now follow it: below freezing or 49°C is harsh (a roll an hour); -10°C, or below freezing with a gale, heavy snow or sleet, or 52°C is severe; -20°C, or -10°C with a gale or heavy snow, or 55°C is deadly. A gale or heavy rain above freezing, and heat under 49°C, no longer harm. How often the harm comes is still the Storyteller's call (house rule). A found body's card now names the book roll for examining it, Intelligence + Medicine (HH2 p. 94, pdf p. 95).

## B850. Owning things and places (2026-11-11)
Ben approved the ownership proposal (2026-11-11, 14:19Z). WoDX Storyteller 0.27.0 keeps one owner record, flags.wodx-storyteller.owner, on an item, a container tile, a scene or a Region: an actor uuid, a faction ("faction:<id>") or a name only. Taking from someone else's container (WoDX Interactables sends wodxItemsTaken) marks the things stolen from their owner; they stay marked until they land back on the owner's sheet or the Storyteller marks them fenced or given. A player sees only "yours" or "someone's" on the Interact window. Owning adds no Background dots by itself.

## B851. How a place is held, by age (2026-11-11)
owner-rules.mjs TENURES lists the forms of holding through Moravian history (fief, peasant holding, burgher house, the Church, land tables, rent, deed, personal property, state allotment, land registry, corporate lease, a front), each open for its years. A new holding takes defaultTenure for its year and kind. tradeRightAt says who may keep a workshop: anyone before 1300, guild masters to 1859, licence holders after, nobody privately 1948-1989.

## B852. Recipes from the goods list (2026-11-11)
craft-rules.mjs turns any good into a long task: its category names the craft, the workshop by year and the materials; its value tier the goal and roll time. Nothing is made before its first year; after its last year only hand crafts can still make it, one difficulty harder. Materials come out of the maker's things or are bought at the start. Extra successes make good, fine or masterwork pieces.

## B853. Putting up a building (2026-11-11)
build-rules.mjs holds 41 kinds of building from the cottage to the vertical farm, with years, place kind, method and worth, keyed to the map generator's types. A build is a long task in stages; each stage is paid for as it starts, and the work waits when the money runs out. When the last stage is done a Region tagged with the place kind and its owner appears on the scene, and when the building kit has a map for the kind (a scene flagged wodx-storyteller.kit), a copy becomes the building's own scene.

## B854. Holdings on pay day (2026-11-11)
Each holding (a scene or Region with an owner and a property entry) has a worth, an upkeep and an income from its kind and the wage of the year, or the Storyteller's own figures. The month's pay day pays them with the allowance.

## B855. Workshops keep their markets supplied (2026-11-11)
Working places with a goods category (a smithy tools, a tavern drink, a mill cloth) lift their market's supply of it once a month.

## B856. NPC factions build (2026-11-11)
A faction may propose a building once a month (the approval queue); approved, its leader runs the build, rolling the faction's Resources + Retainers, and the finished place joins the faction's places. Builds for a faction can also be started from the Put up a building window.
## B836. The ambush (2026-11-11)
WoDX Combat 3.11.0. An attacker who is sneaking, Obfuscated or hidden by the Storyteller, striking someone not already in a fight, first rolls Dexterity + Stealth against the target's Perception + Alertness, both at 6. V20 (printed p. 274, pdf 282): more successes give a free attack with no defence and the extra successes as dice; a tie strikes first with a defence; fewer means no blow, and the fight starts on initiative. Before 1450, V20 Dark Ages (printed p. 345): a win is a free action the target cannot oppose, with no extra dice; the book names no tie, so a tie works as in V20 (house rule). An attack in plain sight is not an ambush.


## B826. The rivalry rows after the book check (2026-11-11)
The PC book check (gates/gaterivals-result-2026-11-11-38424b7.md) found no war between the Shadow Lords and the Tzimisce (Werewolf: The Dark Ages only rumours Shadow Lords dealing with Leeches), so that row is gone and the general Garou against Kindred row applies. Sorcerers Crusade puts the official start of the Ascension War at the fall of Mistridge in 1210, so the war row now runs 1210 to 1999 and the quarrel before it to 1209. Sense Wyrm is a Perception + Occult roll (W20 p. 156), not automatic. The years 1394 (Anarch Revolt), 1231 (Inquisition), 1885 (Arcanum) and 1444 (Giovanni) were not found in the books on the PC and stay house readings, marked so in docs/RIVALRIES.md.

## B880. Merits and flaws on the senses (2026-11-11)
Step 3 of Traits With Teeth. WoDX Senses 0.6.0 reads Chronicle's trait table for the one sensing: Acute Sense lowers the difficulty of the sense named on the item, Bad Sight, One Eye and Hard of Hearing raise it, and Blind and Deaf take that sense away (no roll, one line saying so). Medium and Deathsight open two new Senses channels, the restless dead (heard) and decay on the hurt (seen). Both are house readings of V20 core pp. 493-494 printed.

## B881. Signs others can sense (2026-11-11)
A token whose actor holds Smell of the Grave, Cold Breeze, Glowing Eyes, Eerie Presence, Lord of the Flies, Permanent Fangs, Cast No Reflection (indoors only) or Touch of Frost gives off a line in WoDX Senses for whoever looks, listens, smells or feels the air nearby. The lines are in WoDX's own words and never name the character. A kind that cannot hold the flaw gives nothing off.

## B882. The Veil keyword hides a token from WoDX Senses (2026-11-11)
A Veil cast through WoDX Actions keeps its difficulty on the timed effect (Chronicle timed effects take a data field). WoDX Senses leaves a veiled token out of the plain look; on a closer look, Perception + Awareness at the Veil's difficulty finds them.

## B883. A Discipline or Gift roll puts the power's keywords on the effects card (2026-11-11)
Step 4 of Traits With Teeth. The keyword labels from B781 and B783 now act: a Discipline roll (the Dark Ages data, else the V20 list by name) or a Gift roll (the Dark Ages: Werewolf library, else the W20 list by name) with successes puts the power's keywords on the effects card, worked out as the Storyteller's effect window does. The successes are the strength (house rule) and the card's own routing decides the rest: plain keywords on an NPC apply with Undo, mind keywords and anything aimed at a player character wait in the approval queue, the Storyteller's keywords stay the Storyteller's call. A hostile keyword with no target is dropped and named on the card, never turned on the user. Passive powers and powers with their own effects spec (path magic, Numina) are left out. The world setting "Powers on the effects card" turns it off.

## B884. Merits and flaws set the tone of a first meeting with an NPC (2026-11-11)
Step 5 of Traits With Teeth. When an NPC first meets a character, WoDX NPC takes the seed from household, faction or rivalry as before, then moves it by the character's traits (Chronicle's ATTITUDE table): Friendly Face and Harmless one step warmer with anyone, Inoffensive to Animals with beasts, and Disfigured, Deformity, Monstrous (two steps), Smell of the Grave, Glowing Eyes, Eerie Presence, Lord of the Flies and Cold Breeze one step colder with mortals only. The traits move a first meeting two steps at most. The first-meeting log names them. House readings of V20 core pp. 480-495 printed.

## B885. Sway and Fear move an NPC's regard for the caster (2026-11-11)
A Sway keyword (not Awe) applied to an NPC moves its attitude toward the caster one step warmer; a Fear keyword that leaves it Afraid moves it one step colder, and an Afraid NPC flees on its turn in a fight. Undo on the effects card puts the attitude back (or forgets a meeting the power began). Player characters are never moved this way: mind keywords on them stay the Storyteller's call.

## B886. Sleep, feeding, blood costs and Lucky from the trait table (2026-11-11)
Step 6 of Traits With Teeth, in WoDX Actions 3.35.0. Lucky: the action and quick check windows offer a second roll of a failed roll (botches too), three times a story; the count lives on the actor against the story id that End of story renews (V20 p. 493 printed). Efficient Digestion adds one blood point for every two drunk, never past the pool (p. 480). Thin Blood doubles every cost in Spend Blood, and blood given away is not a cost (p. 483). Deep Sleeper makes waking by day 2 harder; Light Sleeper wakes at once and is not held to the Road cap that day (p. 485). Prey Exclusion puts a reminder on every feeding card, naming the group written on the item in brackets. Early Riser, Nine Lives and the other sleep and pool traits stay the Storyteller's call for now.

## B895. Trade with one NPC from "With this person" (2026-11-11)
Ben asked for bartering through the Actions menu. "With this person" gains Trade when WoDX Storyteller's money is on: buy from the NPC, sell to them, or barter one thing for another. Prices are WoDX Storyteller's (the era goods list times the local market's index); a trader's shop is the container their market lists for them, and anyone else trades from what they carry. The NPC's purse is the till, so a trader short of money cannot buy. Restocking at half price stays with the markets (Storyteller 0.24.1 onward). Players' trades wait in the approval queue as wodx-actions.trade; the Storyteller's apply at once.

## B896. Haggling (2026-11-11)
House rule: no V20 haggling system. The roll follows V20 Dark Ages' Commerce example (Manipulation + Commerce, difficulty 6, pdf p. 327), with Finance in the later eras and Streetwise as a fallback. Each success takes a tenth off a purchase or adds a tenth to a sale, up to three tenths, never past what the good sells for new; a botch costs a tenth. The NPC's attitude shifts the difficulty as for the social rolls. Hostile or hunted NPCs refuse to trade; distrusted ones charge a tenth more and pay a tenth less. Barter gives no change.

## B897. Stolen goods sell at the fence's price; stock lines on social and trade cards (2026-11-11)
Anything lifted is marked stolen, and a trader gives the fence's share for it (Storyteller money rules). Buying or selling it through a trade clears the mark. Social and trade cards add one of WoDX NPC's stock lines, coloured by attitude, when stock talk is on for that NPC (rule 11 lifted by Ben 2026-11-11); the Storyteller's own talk lines still come first in the topic menu.

## B898. Cheap goods fetch at least the smallest coin (2026-11-11)
Storyteller's sell price is half the price rounded down, so 340 of the 797 goods sell for nothing. When a character sells or barters a good that has a price, the trader gives at least the smallest coin of the money in use. House rule, in PENDING-REVIEW. Coins themselves are money and are counted into the purse, not sold.
## B887. Flaws on the map, in the night's draw, in the Ledger and on the Storyteller's queue (2026-11-11)
Step 7 of Traits With Teeth (patterns P4, P8, P10, P11). On the map (WoDX Interactables 0.25.0): Can't Cross Running Water, Garlic, Crosses, Light-Sensitive and a Phobia go off when the character's move crosses a tile title or region name holding one of the trait's words (a Phobia uses the words in brackets on the item, as in "Phobia (rats)"). The first three hold a player's move where it began; the Storyteller's own moves go through. Each sends a card to the Storyteller and the character's owners, with the roll the book calls for where the check file names one (Crosses: Willpower at 9, V20 p. 495 printed). World setting "Flaws go off on the map". In the night's draw (WoDX Storyteller 0.29.0): ten flaws such as Hunted, Enemy and Haunted each add a line on a share of nights (a fifth to a third, house rule), and Oracular Ability draws an augury into the queue. In the Ledger: eleven merits and flaws open one entry each, once, with a fixed id (Boon and Prestigious Sire as boons owed to the character, Narc and Infamous Sire as debts the character owes, Dark Secret and Old Flame as consequences with a reveal date 90 to 180 nights out, house rule); an entry the Storyteller deletes stays deleted. Prompts (WoDX Chronicle 0.22.0): thirteen flaws send one queue card a character at their moment (feeding, a social act, a fight starting, the night's draw approved); approving posts the reminder to the Storyteller, dismissing drops it. The reminders are reminders: the Storyteller still decides what the flaw does.


## B888. Backgrounds made into things in the world (2026-11-11)
Step 8 of Traits With Teeth, in WoDX Chronicle 0.23.0. The Trait effects window gives the Storyteller a "Make them real" button when a character's backgrounds call for things the world does not hold yet. People backgrounds (Allies, Contacts, Retainers, Mentor, Followers, Cult, Kinfolk, Pacts, Retinue) make one NPC sheet a dot, five at most (house rule; Mentor makes one, of the holder's own kind), through WoDX Creation's People when it is on. A Kindred's retainers are made ghouls of that Kindred. Each sheet carries flag wodx-chronicle.bound and starts at an attitude toward the character in WoDX NPC: Retainers Honoured, Allies, Mentor, Followers, Cult and Retinue Welcome, Contacts, Kinfolk and Pacts Tolerated. Place backgrounds (Domain, Node, Haunt, Holdings, Sanctum, Chantry, Tomb) make a square region on the scene the character is on, two squares plus two a dot across, owned by the character in WoDX Storyteller. What was made is kept on the background item, so a grown background makes only the new ones, and a sheet deleted since is made again. Demesne stays out: it is a realm of the mind, not a place on a map.

## B889. Passive Attribute and Ability hooks (2026-11-11)
Step 9 of Traits With Teeth, in WoDX Storyteller 0.30.0. Codex thresholds: a journal or page named with a tag in square brackets, as "The Tremere Pyramid [Occult 5]", needs Intelligence + that Ability at the number or more ("or" gives alternatives). Reveal to a codex ticks the characters who reach it, says who does not, and the copy in the codex drops the tag; the Storyteller still chooses. The weather roll in Hardship is Stamina + Survival (house reading of M20 p. 435 printed). Already in place and left as they were: forcing a door with no roll when Strength reaches the lifting chart (Interactables), thirst, hunger and sleep held off by Stamina (Hardship), haggling in Trade (Actions 3.36.0), each long task's own Attribute (Storyteller tasks). Carry limits wait on weights in the Library goods list, which has none yet.

## B890. Queued keywords that change the world (2026-11-11)
Step 10 of Traits With Teeth, in WoDX Actions 3.38.0 and WoDX Otherworlds 0.13.0. These keywords still go to the approval queue, and approving one now does the thing, with an Undo card for the Storyteller: Step Sideways or Cross moves the token across the Gauntlet, or the Shroud, through Otherworlds with no second roll (the power's own roll was the test); Shape puts a timed "Shaped" effect on the target, naming the form when the power gives one; Summon asks the Storyteller who answers (any actor in the world) and where, and places one to five tokens (half the strength, rounded up); Make makes a plain item of the name the Storyteller types, or the chosen item, in the target's things; Weather sets tonight's weather in WoDX Atmosphere to calm, gale, heavy rain, thick fog, snow or storm, and Undo puts back what was set before; a Move on someone else asks for the spot when it is approved. The Storyteller's own effect window gets the same, with no queue.

## B891. The other lines' merits and flaws in the trait table (2026-11-11)
Step 11 of Traits With Teeth, in WoDX Chronicle 0.24.0. 335 merits and flaws from V20 Dark Ages, W20 and Changing Breeds, M20 Book of Secrets, C20, Hunters Hunted II, Mummy: The Resurrection, Mummy 2nd and Kindred of the East join the table (data/trait-lines.mjs), with name, cost, type, printed and pdf pages from the PC book checks and the draft's first patterns and holders. Each belongs to its own line's kinds (a Werewolf merit works on Garou and Kinfolk, not a mage). A V20 entry another line shares, such as Garlic in Dark Ages, takes that line's holders too. None has automatic effects yet: they match by name, show their pattern in the Trait effects window, and wait for effects line by line, the way the V20 rows did. Left out: rows the OCR could not read cleanly, Wraith 20 p. 80 (no merit or flaw label on the page) and Hunter: the Reckoning (no OCR text yet). Three rows have no pattern yet (P20, the Storyteller's call).

## B905. Goods are named without their container (2026-11-11)
Ben, 2026-11-11 20:35 UTC: a good is named as the thing itself, and it is found in its container. "Claret" is found in a bottle; "hickory nuts" in a bag. WoDX Library's goods list keeps its rows as written ("a bottle of claret"). The list splits off any of the words in CONTAINER_WORDS, so good.name is "claret", good.container is "a bottle" and good.former is the written form. The tables keyed by the written form (stack sizes, overrides, descriptions and details) still work, and older items named the old way are still recognised. 121 of the 797 goods hold a container. A can of pepper spray and a sack of coarse cloth are left as written (CONTAINER_KEEP), because there the container is the thing. A container's list shows "claret (in a bottle)" or "claret (in 3 bottles)". An item made from that line is named "claret" and keeps its container in flags.wodx-library.container. The money lookup, Examine and the sheet extras all read the new lines and the old names. Crafting now asks for "lye" rather than "a pot of lye". To reverse: empty CONTAINER_WORDS in modules/wodx-library/data/goods.mjs.

## B906. 1,134 new everyday goods from the New Items Desk (2026-11-11)

Ben approved all 1,136 items on the New Items Desk, picked from the item list of Cataclysm: Dark Days Ahead as a reference for what exists. Two were already goods (a shoulder holster, sardines), so 1,134 rows join ROWS in modules/wodx-library/data/goods.mjs with source "cdda", each with its own short description in goods-text.mjs. Names, years, values and text are our own; nothing of CDDA's weight, volume or wear rules comes across. "Chinese checkers" became "a star checkers set" under the plain-names rule. Bowl, plate, cup, glass and tank join the container words of B905, so "a glass of gin and tonic" is "gin and tonic (in a glass)". Library 0.8.0.

Reverse: delete the rows after the "ADDED FROM THE NEW ITEMS DESK" comment and their description lines.


## B910. Chases and pursuit (2026-11-11, book check 2026-11-11)
WoDX Interactables 0.26.0, aligned with the book in 0.26.1 (scripts/chase-rules.mjs, scripts/chase.mjs). A chase is the books' pursuit (V20 core printed pp. 261-262, pdf 269-270; V20 Dark Ages printed p. 335, pdf 336): an extended roll each turn, the totals racing. The quarry starts with one free success for each 2 yards of lead on foot, or each 10 yards on horseback or in a vehicle. A pursuer whose total passes the quarry's has caught up. A pursuer's botch loses the quarry at once; a quarry's botch is a stumble or a dead end (its total goes to nothing). Pools: Dexterity + Athletics on foot or on a bicycle, Dexterity + Ride (Animal Ken when the sheet has no Ride) mounted or with a team, Dexterity + Drive in a motor vehicle, capped at the vehicle's Maneuver (V20 core printed p. 259), Stamina + Athletics at the oars. Difficulty 6 (the books give none); riding or driving fast to lose pursuers +3, rough ground +1. The Storyteller rolls for everyone from the Chase window in the Storyteller's hand. Revised was not checked (no Revised core text on the PC). W20's own pursuit (printed p. 272) is not used: one rule for every line.

Reverse: remove chase.mjs, chase-rules.mjs, their import and API line in main.mjs, and tools/harness/chase.test.mjs.

## B911. The speed edge in a chase (2026-11-11)
House rule. The book skips the roll when one side is plainly faster; WoDX keeps rolling and gives the faster racer one free success each turn for every 10 yards a turn faster, three at most, so a slower racer can still win on a good night. Against several pursuers, each faster pursuer gains its own; the quarry's edge is counted once, against the fastest pursuer still in the chase. Running speed comes from WoDX Combat (20 + 3 x Dexterity, V20 core printed p. 258, with Celerity, wounds and Shape of the Beast), and Garou forms change it (W20 printed p. 269): Hispo half as fast again, Lupus twice as fast, Crinos +2 yards on all fours. Cars and motorcycles have a safe speed, a top speed and a Maneuver by year (1 mph is about 1.47 yards a turn): cars 20/30 mph Maneuver 3 from 1900, 35/55 Maneuver 4 from 1920, 50/80 Maneuver 4 from 1940, 60/100 Maneuver 5 from 1960, 70/120 Maneuver 5 from 1990 (the V20 chart's sedan), 85/155 Maneuver 7 from 2040 (the chart's luxury sedan); motorcycles 25/45 Maneuver 5 from 1910, 45/80 6 from 1930, 65/110 7 from 1960, 75/130 7 from 1990, 90/160 8 from 2040. Before 1990 these are house figures; the chart is modern only. The rest are house figures in yards a three-second turn, with no book source: horse 50 (no gallop speed in V20 Dark Ages), mule 30, cart 15, carriage 25, rowing boat 6; bicycle 20 from 1885 (25 from 1950); motorboat 20 from 1910, 35 from 1950, 45 from 2040. Carts end in 1960 and carriages in 1945, as in the travel rules.

Reverse: EDGE_PER and EDGE_MAX in chase-rules.mjs (EDGE_MAX 0 turns it off); the figures are in WAYS.

## B912. The ground a chase crosses (2026-11-11)
House rule. The Storyteller picks the ground each turn: open country, a road, town streets, a crowd or market, rough ground or woods, indoors or alleys or rooftops, a river or lake. A crowd adds +1 difficulty on foot and +2 for wheels (the book's heavy traffic is +1, at breakneck pace +3); rough ground (the book's rough terrain for riders) and indoors +1. Streets hold hooves to 30 yards a turn and wheels to 40; a crowd holds both to 10; rough ground holds hooves to 25 and bicycles and motorcycles to 15. Carts, carriages and cars cannot enter rough ground; only feet go indoors; only boats go on water. A racer whose way cannot enter the ground is out of the chase (a quarry who cannot go on makes no ground that turn). Before 1900, a chase at night is +1 for hooves and wheels, as the unlit roads of the travel rules.

Reverse: GROUNDS and LIT_FROM in chase-rules.mjs.

## B913. Flat out, falls and crashes in a chase (2026-11-11)
Going flat out is +3 difficulty, the books' "fast while losing pursuers" (V20 core printed p. 258, V20 Dark Ages printed p. 335). A motor vehicle flat out goes 30 mph past its safe speed, never past its top: the book's +1 difficulty for each 10 mph over the safe speed is taken as the same +3, not added to it (house reading). Anything else flat out is half as fast again (house rule). The books give no crash damage. A botch on a horse, a mule, a bicycle or a motorcycle throws the rider; in a car or a motorboat it is a crash; both roll as falling (V20 core printed p. 296): one die of bashing for each 10 mph, one to ten, and ten dice are lethal, as a fall of 100 feet (house reading). The Storyteller applies the damage from a button on the card. A rider who catches someone gets +1 damage die for each turn spent at speed, five at most, on the first blow (mounted combat, V20 Dark Ages printed p. 398); the card says so.

Reverse: OVER_SAFE, crashDice and crashType in chase-rules.mjs; FLAT_OUT for the difficulty.

## B914. Keeping sight in a chase (2026-11-11)
As the book (V20 core printed p. 262): the Storyteller may call a Perception roll, at most once a turn, for each pursuer to keep the quarry in sight; every success the quarry leads by (as the turn starts) is +1 difficulty. WoDX rolls Perception + Alertness, and adds +1 where there is cover about (streets, a crowd, rough ground, indoors): house rule. A pursuer who scores no success, or botches, has lost the quarry. 0.26.0's Dexterity + Stealth roll is gone.

Reverse: sightDiff in chase-rules.mjs, and the Call for sight box in the Chase window.

## B915. How a chase ends (2026-11-11)
A catch, or the last pursuer losing the quarry, ends it. A catch puts Start a fight on the Storyteller's card, which hands the quarry and whoever caught up to WoDX Combat's fight start. The book has no fixed lead that ends a chase; as a fallback when nobody calls for sight, WoDX lets the quarry get away with a lead of 10 successes over every pursuer (house rule). The Storyteller can end a chase at any time. Players' cards say who is gaining in words; the dice and totals of every racer are on the Storyteller's copy, with an Undo for the last turn, so a Storyteller character's rolls stay hidden.

Reverse: AWAY_LEAD in chase-rules.mjs (a large number turns it off).

## B916. Things can be used: abilities on every good (2026-11-11)

Ben asked for items with real uses. modules/wodx-library/scripts/use-rules.mjs gives each good its abilities from its category and its name (abilitiesOf): a journal can be written and drawn in, a fiddle played, a candle lit, a bedroll slept in, a fountain pen writes a letter, a map can be marked. About 1,580 of 1,931 goods have one; coins, arms, keys, containers and materials already work through money, combat, Interactables and crafting. Use opens from a hand button on the Possessions row and a Use button on the item sheet (Library 0.9.0, Sheets 0.9.0). Pages written, drawn, marked, recorded or photographed are kept on the item (flags.wodx-library.pages) and shown by Read. Ben reviews the list on the Item Uses Desk.

Reverse: drop the Use button from extras-html.mjs and the setupUse call from Library main.mjs.

## B917. Eating, drinking and drugs touch each line its own way (2026-11-11)

What a substance does is a table of substance by line (EFFECTS). Food and drink feed and water the living through Storyteller hardship (M20 pp. 435-436). A vampire cannot keep food or drink down without the Eat Food merit, and drugs and drink reach the Kindred only through a vessel's blood (V20 printed pp. 301-302). A wraith has no body to take anything. Changelings are drunk or high like anyone (Ben, 2026-11-11). A drink or drug on a living character also sets the vessel state a feeding vampire meets (wodx-actions vesselState). The intoxication effects on the living (drunk, wired, dulled, drowsy, seeing things, mellow) are house rules after V20's drugged-blood notes; nothing applies them to dice by itself, the card says what to apply. Werewolves, mummies and demons, hallucinogens on changelings, holy water on vampires and first aid on the dead are left to Ben on the desk; until then the Storyteller decides each time. Bagged blood: a pint is one blood point (house rule, as a body of ten pints holds ten points).

Reverse: set every cell in EFFECTS to {does: "storyteller"}.

## B918. First aid with supplies, carried light from owned lights, a Perform check (2026-11-11)

Treat with supplies opens the First aid common check one easier (house rule); bandages, dressings and salves are spent, instruments and kits are kept. Light it starts the token's carried light of that kind (candle, torch, lantern, electric), and lamp oil or a battery refills it (Interactables api.carry from setupCarry, read as a function or its carry member; Library 0.9.1, Interactables 0.26.3). Instruments open Any roll on the Performance dramatic system (Charisma + Performance, difficulty 7). Common checks take a preset difficulty change, bonus and description (Actions 3.39.0).

Reverse: remove the treat, light and system cases from use.mjs.

## B940. Who may fly, swim, climb, crawl, jump, go into the ground or pass through walls (2026-11-11)
Foundry's own movement actions carry the ways of moving. Anyone may walk, climb, crawl, jump and swim. Fly needs Rise or a power, form or wings that grant flight (Phantom Wings, Wings of Rage, Wings of Pegasus, Chiropteran Marauder, a bat or bird shape, Demon wings, and the like). Through walls needs Tenebrous Form, Mist Form, Spectral Body, Incorporeal Passage or a power like them. Into the ground needs Earth Meld. The leap and wall powers that carry the Rise keyword (Hare's Leap, Great Leap, Surface Attunement, Monkey Tail, Manipulate Adhesion, Grip the Water) do not fly. The Storyteller may move any token any way, and may give a creature a way of moving for good with the actor flag wodx-combat.moves (fly, swim, wallwalk, waterwalk, waterbreath, phase, burrow, flySpeed). A player's token may not rise off the ground without flight, a climb or a jump.

Reverse: setting "Flying, swimming, climbing and other ways of moving" off, or GRANTS in movement-rules.js.

## B941. How fast each way of moving goes in a fight (2026-11-11)
House rules, on top of walk 7, jog 12 + Dexterity, run 20 + 3 x Dexterity (VtDA20 p. 333): flying at the running speed, or the power's own (flySpeed); swimming at half the jog, the full jog with a swimming power, 1 yard with no Athletics; climbing 3 yards a turn (one success of an average climb, as the Climbing check says), walking pace for wall-walkers; crawling 3 yards; a jump as far as the last Jumping roll reached (1 yard across or 20 inches up a success), doubled by Hare's Leap or Great Leap; Earth Meld does not travel; passing through walls at walking pace. Height climbed or flown counts toward the yards.

Reverse: speedFor in movement-rules.js.

## B942. Breath and drowning (2026-11-11)
Drowning is one lethal level a turn, not soaked (Hunter: The Reckoning pdf 208); the V20 books searched so far have no drowning rule. House rule: breath lasts Stamina x 10 turns, halved in a fight. A swimmer with Athletics stays up; with none they go under (a Stamina + Athletics roll at 8 brings the head up for a turn, the Storyteller's call). Kindred, wraiths, spirits and Kuei-jin do not breathe. Water-walkers stand on the water and water-breathers never run short. Breath is counted each round of a fight; outside a fight the card on entering the water gives the turns and the Storyteller counts.

Reverse: breathTurns, underWater, waterTurn and NO_BREATH in movement-rules.js.

## B943. Water regions (2026-11-11)
A region holds deep water when its name says so ("WoDX: Deep water", a river, a lake, the sea, a pond, a canal, a moat, a well) and shallow water for a ford, marsh or shallows; the region flag wodx-combat.water ("deep", "shallow", "none") wins over the name. Shallow water costs double movement. A fall into deep water does no falling damage.

Reverse: waterOf and SHALLOW_COST in movement-rules.js.

## B944. A fall when flight ends (2026-11-11)
When a flight effect ends (its time runs out, or the Storyteller removes it) and nothing else keeps the token up, the token drops to the ground under it (the highest region floor it stands in, else 0) and the Storyteller gets a card with the falling damage (VtDA20 p. 355) and a button that opens the fall window at that height. An Undo of the Rise effect is not a fall: it puts the token back where it was.

Reverse: the deleteActiveEffect hook in movement.js.

## B945. Height in range and reach, and Earth Meld (2026-11-11)
Range and reach measure straight through the air: a flier 20 feet up is out of a sword's reach. Earth Meld hides the token while it lasts.

Reverse: withHeightOf in wodx-combat main.js; the createActiveEffect hook in movement.js.

## B946. What each way of moving does to rolls (2026-11-11)
House rules, shown on the attack card and the check card; minus is easier:
- Prone or crawling (also knocked down): own Stealth -2, melee and brawl +2, a braced shot -1, dodge +2, footing +1; up close they are struck at -2, shot from afar at +2, and noticed at +1.
- Flying: own sight -1, dodge -1, shots +1, Stealth +1 (a shape against the sky); struck and shot at +1. Two fliers meet on even terms.
- Swimming: own melee, shots and dodge +2, footing +1; shot at +1.
- Under the water: own melee and dodge +2, shots +3 (guns do not fire, bows are useless), sight +2, Stealth -2; shot at +2 and noticed at +2.
- Shallow water: own melee, dodge and footing +1, Stealth +1 (splashing).
- Climbing: own melee and shots +2, dodge +3 (block and parry only), footing +1; struck and shot at -1; a botch means a fall.
- After a jump this turn: a leaping strike -1, dodge +1.
- Higher ground (a few feet above the target): melee -1.
- In the earth: cannot act on the world, and cannot be struck. Passing through walls: cannot strike physically; the power's own rules say what touches them.

Reverse: STANCES and attackStance in movement-rules.js.

## B947. Ways of moving after the book check (2026-11-12)
The book check (project files movement-book-check.md) replaces these house rules in B941, B942 and B946:
- Breath: by Stamina at rest, 30 seconds up to an hour (W20 pdf 261, M20 pdf 441-442); in a fight, 2 x Stamina turns. Out of breath, one level a turn, not rolled or soaked: lethal (W20, M20), bashing for changelings (C20 pdf 294).
- Swimming: 12 + Dexterity yards a turn with Athletics (M20 pdf 402), the jog; a swimming power doubles it to the run.
- Flying: bat form 20 mph, about 29 yards a turn, and +2 to hit it (V20 pdf 208); Chiropteran Marauder and Dark Ages wings 25 mph (V20 pdf 250, V20 Dark Ages pdf 271); Wings of Pegasus 50 mph (W20 pdf 176); Spirit of the Bird 20 mph with its own maneuvers +1 (W20 pdf 200); Phantom Wings up to jogging speed (Wraith 20th pdf 217); Demon wings glide at up to three times the run; any other flight 15 yards (M20 pdf 402 gives 10 to 20). Wings of Rage is not flight (Wraith 20th pdf 266).
- Prone: light cover, +1 to be shot (V20 pdf 286), and no change to fire from prone.
- Climbing: 10 feet a success on an average climb, 15 easy, 5 hard (V20 pdf 266).
- Jumping: 2 feet up or 3 feet across a success (V20 pdf 268).
Still house rules, with no book rule found: an easier close attack on someone prone, the Stealth bonus for crawling, higher ground, fighting in water or while climbing, and the leaping strike.

A flight power now sets the token's way of moving to Fly before it rises, and a fall sets it back to Walk; the token lookup finds unlinked tokens too.

Reverse: FLY_SPEEDS, BREATH_SECONDS, drownType and STANCES in wodx-combat movement-rules.js; jumpReach in wodx-actions checks-rules.js.
## B1000. Animal archetypes (2026-11-12)
Ben asked for NPC behaviour archetypes by kind and era and approved the brainstorm, animals first. WoDX NPC 0.21.0 adds 16 animals in animal-rules.mjs: stray dog, guard dog, hunting hound, cat, rats, pigeons and town birds, crows and ravens, horse, cattle, pigs, sheep and goats, poultry, wolf, bear, boar and bats. Each is a template beside the line templates and a ready routine of the same name. Years and places follow Moravia: wolves gone from about 1850 and back in the hills from 1995, bears to 1800, hounds to 1914, horses in town streets to 1950, cattle at town markets to 1900, pigs in the lanes to 1850, poultry in town yards to 1900, strays fewer after 1900. Blood follows the passers-by crowd (rats and birds a quarter point, cats 1, dogs and wolves 2, livestock and bears 5); boar 3 is a house reading. All house readings, in PENDING-REVIEW.

Reverse: drop the spread of ANIMAL_TEMPLATES in npc-rules TEMPLATES and of ANIMAL_PRESETS in routine-rules PRESETS.

## B1001. Herd, territory and hunger; swarm, scatter, scavenge and stalk (2026-11-12)
Three new temperament traits, 0 to 2, read by the fight scorer and the reactions: herd (runs when outnumbered or when the others run; weaker alone), territory (fights harder and bears one more wound on its own patch, fights trespassers), hunger (bolder in the lean months, December to March). Four new tactics: swarm, scatter, scavenge and stalk. Animals bark or raise a racket only when they have the call tactic (guard dogs, poultry), never send for the watch, and take no fright at the supernatural as such: Ben ruled (2026-11-12) that animals do not shy from Kindred but do shy from wraiths, so every animal fears "wraith" and an intruder or foe who is a wraith counts as that fear.

Reverse: the new lines in scoreOptions and pickReaction are marked NPC 0.21.0.

## B1002. More kinds of place and roles (2026-11-12)
PLACE_KINDS gains alley, yard, docks and park (the same four the passers-by work adds) and sewer, hospital and station. Routines gain the roles yard, alley, sewer, docks and park, and the activities grazing and roosting. A routine block can name the months it runs in.

Reverse: remove the kinds; old scenes keep their tags.

## B1003. Which animal a beast is (2026-11-12)
A beast's archetype comes from its passers-by token flag (archetype, else the crowd's animal kind mapped by place and year), else the actor flag wodx-npc.animal, else a guess from its name. Nothing found keeps the plain beast template.

Reverse: animalOf() in main.mjs.

## B1004. The other lines wait (2026-11-12)
Ben approved the whole brainstorm and asked for animals first. Criminals, combatants, townsfolk and the supernatural lines follow in later versions. Ben's rulings for them: Orpheus travellers only in the World of Future Darkness; Kuei-jin travellers only in Asia.

## B960. Feeding harms the vessel (2026-11-12)

Each blood point a living vessel loses is one lethal level (V20 printed p. 57: a Giovanni Kiss does twice the damage of another vampire's, one point costing two levels; the Nagaraja entry on p. 407 reads the other way, and Ben chose this reading). A living vessel has the lower of its blood and (full blood less damage), the wounds rule of p. 269 read both ways, so the same loss is never counted twice. A mortal's blood is kept on the vessel (flag wodx-actions.vesselBlood, as the sheet's own pool is 0 on mortals) and comes back one point a day (p. 270); the damage heals by the healing chart. Passing out sets Unconscious, a botch on the vessel's roll also sets a "dying" flag, a vessel drained dry is marked dead, and a card button undoes the harm. The drink or drugs in a vessel's blood go when the blood does. Kindred vessels lose blood, not health. WoDX Actions 3.41.0.

Reverse: kissDamage returns 0 in feeding-rules.js and feedResolve reads the sheet's pool again.

## B961. Clan and bloodline feeding rules (2026-11-12)

One table (CLAN_FEEDING in feeding-rules.js) for Ventrue, Nagaraja, Giovanni, Salubri (healers and warriors), Salubri antitribu, Noiad, Danava, Lamia, Assamite antitribu and Dark Ages Tremere, with the V20 Dark Ages version in the Dark Ages and Long Night eras or before 1450, and V20's after. The clan is read from the sheet (a custom clan's words, or a flag wodx-actions.bloodline). Feed and Hunt apply each rule: no nourishment (Ventrue miss, animals for Noiad and Danava, blood not taken by force), half without the Danava offering, a Willpower point or a Willpower roll and -2 dice for the night (a timed effect until dawn), two lethal levels a point for the Giovanni, the Seed of Lilith, the Assamite antitribu addiction roll, and the Dark Ages Tremere first drink counted twice toward the Blood Oath (WoDX Creation 0.10.2 giveVitae firstDouble). Readings: Dark Ages Giovanni take V20's two levels a point; Salubri warriors in modern nights follow the antitribu; the Lamia resist is 7 when the vessel's sex isn't known.

Reverse: remove the clan's entry from CLAN_FEEDING.

## B962. Ventrue palates and vessel tags (2026-11-12)

A Ventrue's palate is saved on the character (flag wodx-actions.palate: words, tags, broad or narrow), set in the Feed or Hunt window. A vessel's tags come from its own flag wodx-actions.vesselTags (editable in the Feed window) and a passer-by's flags["wodx-npc"].passerby.tags. Matching tags tick "fits the palate"; with no tags on either side the Storyteller ticks it. Hunting with a palate is +1 difficulty for a broad one and +2 for a narrow one (house rule); Herd is taken to fit. Prey Exclusion reads the same tags: a match calls the frenzy at once.

Reverse: palateHuntDifficulty returns 0; drop the palate fields from feedingFields.

## B963. Nagaraja flesh (2026-11-12)

The Feed window takes flesh points as well as blood (V20 printed p. 407): each gives a blood point and does one unsoakable lethal level; a human body has 10, a child 5, an animal its blood points (house reading). New Night adds a point of flesh debt for a night without flesh, shown as one less on Strength, Dexterity and Stamina per point (their bonus, as Quickening uses), and flesh eaten pays it back.

Reverse: drop the flesh lines in feedResolve and newNight; nagarajaPenalty(actor, 0) clears the bonus.

## B964. Feeding habits (2026-11-12)

V20's argot for how a vampire feeds (printed pp. 35-36) becomes a saved "usual hunt" in the Hunt window: Alleycat or Slummer, Banker (from 1937, cold blood), Butterfly, Casanova or Tease, Farmer, Head, Headhunter, Rake, Sandman. Each fills in the hunting ground, prey, pool and what is in the blood, and warns when it clashes with the clan's rule. The pools, grounds and years are house readings; V20 gives none.

Reverse: remove HUNT_STYLES entries.

## B965. A fight on record (2026-11-12)

When WoDX Combat applies a vampire's blow, the target gets flags wodx-actions.fought.<vampire id> = the clock time, and Feed ticks "fought and beaten first" for an hour after. Seduction that leads to Feed passes the vessel as willing.

Reverse: remove the second wodxDamageApplied hook in main.js.

## B1005. Criminals, combatants and townsfolk (2026-11-12)
The second step of the approved archetypes brainstorm. WoDX NPC 0.23.0 adds 39 mortal archetypes in mortal-rules.mjs: 13 criminals (cutpurse, footpad, burglar, bandit to 1850, highwayman 1600 to 1850, smuggler, fence, con artist, street gang from 1850, organised crime from 1900, dealer from 1960, informer, fixer from 1990), 15 combatants (militia to 1700, knight and man-at-arms to 1550, Hussite wagon crew 1419 to 1434, mercenary 1480 to 1650, musketeer 1620 to 1870, hussar 1650 to 1918, rifleman 1914 to 1945, occupation trooper 1939 to 1945, partisan from 1939, riot police from 1948, armed police from 1970, private security from 1990, duellist 1550 to 1900, bodyguard), and 11 townsfolk (child, gossip, drunk, physician, executioner to 1850, pilgrim, servant, lamplighter 1700 to 1930, journalist from 1850, prophet, orderly from 1780). Each is a template and a routine; the routine picker leaves out presets past their years. A mortal's archetype comes from the actor flag wodx-npc.archetype, else its name. House readings, in PENDING-REVIEW.

Reverse: drop the spread of MORTAL_TEMPLATES and MORTAL_PRESETS.

## B1006. Morale, cover, formation, surrender, hostage and lead (2026-11-12)
Morale (0 to 2) is carried only by the 0.23.0 archetypes. It wavers when a fallen ally of the same side had the lead tactic, or when half the side is down: fleeing rises by 2.5 for each point under 2, and attacks drop by 1. Cover adds 1.5 to shooting a foe out of reach. Formation adds 0.8 to attacks with two or more allies and not outnumbered, and takes 1.5 off fleeing while the line holds. Surrender is a new action the NPC can carry out itself (Auto, with Undo): it is offered when beaten, wavering, or outnumbered and hurt, and once yielded the NPC only waits for the rest of that fight. Hostage is offered when cornered with a bystander near, and waits for the Storyteller.

Reverse: the NPC 0.23.0 lines in scoreOptions; SELF_ACTING without surrender.

## B1007. Tell someone later (2026-11-12)
A new reaction for the report tactic (informers, children, gossips, servants, journalists, prophets): the NPC lets it pass now and, two hours of world time later, the place goes on alarm as if raised, with a card and Undo. Stored on the scene flag wodx-npc.reports.

Reverse: REPORT_HOURS in mortal-rules.mjs; drop report from SELF_RESPONSES.

## B1008. The supernatural lines are next (2026-11-12)
Third and last step: supernatural NPCs by line, with Ben's rulings (Orpheus travellers only in the World of Future Darkness, Kuei-jin travellers only in Asia).

## B1009. Supernatural NPCs by line (2026-11-12)
The third step of the approved archetypes brainstorm. WoDX NPC 0.24.0 adds 29 archetypes in supernatural-rules.mjs under the line templates, picked by the sheet's clan, tribe, kith, Tradition, legion or creed: Nosferatu, Toreador, Gangrel, the old Lasombra and Tzimisce lords (to 1493, generation 8 or lower), Anarchs (from 1381), revenant families; Bone Gnawers and Glass Walkers in towns (from 1500), caern warders, Black Spiral Dancers, Kinfolk, Fera watchers; Hollow Ones (from 1900), Marauders, Nephandi; Hierarchy legionnaires, Renegades and Heretics; sidhe nobles, redcaps and trolls (to 1400 and from 1969), Dauntain (from 1969); the Arcanum (from 1885), the imbued by creed (Zeal, shielding, Mercy or Vision; from 1999, from 2023 in the World of Future Darkness); mummies (from 1990), the Fallen (from 1999); Kuei-jin and Orpheus travellers. The Sabbat, the Technocracy and the Inquisition keep their 0.18.0 templates. Spectres gain hunger and swarm. House readings, in PENDING-REVIEW.

Reverse: drop the spread of SUPERNATURAL_TEMPLATES and SUPERNATURAL_PRESETS, and the pickSupernatural call in templateFor.

## B1010. Orpheus only in the Future Darkness, Kuei-jin only in Asia (2026-11-12)
Ben's rulings. An archetype can name the eras (future-darkness, time-of-future-judgement) or regions (asia) it belongs to; outside them the NPC keeps its line template. A scene's region is its flag wodx-npc.region, else WoDX Storyteller's money region, else Moravia, so no Kuei-jin appears until a scene is set in Asia.

Reverse: eras and regions in supernatural-rules.mjs.

## B1011. A Marauder's Quiet (2026-11-12)
A Marauder's turn takes one of its scored options by chance (the same for the same round), so it acts as its madness takes it. The card says so.

Reverse: erratic on the marauder template.



## B980. Who an act startles: breach, startled or calm, for every line (2026-11-12)

Ben asked that Masquerade witnesses depend on who is looking: a Cainite is calm at another Cainite's Discipline, but startled by a Crinos or an apocalyptic form. modules/wodx-actions/scripts/witness-rules.js names the secret an act shows (the actor's profile) and sorts each onlooker. Mortals and hunters who do not know are breach witnesses; creatures of another kind are startled; their own kind, Kindred and ghouls for each other, Kinfolk for the Garou, and anyone the Storyteller has marked as knowing are calm. Ben ruled on the uncertain pairs on the witness desk (2026-11-12): animals are startled rather than breach witnesses (calm at vulgar magick), and wraiths, demons, mummies and spirits are never startled.

Reverse: give witnessesOf back its profiles filter in the feeding card and let recordBreach skip sortOnlookers.

## B981. Only Sleepers make vulgar magick witnessed (2026-11-12)

For a mage, only mortals and hunters are breach witnesses (M20, Paradox and witnesses); an animal does not count, and other kinds are startled. The Cast window names the Sleepers who can see and sets the Effect to "with witnesses" when one does.

Reverse: drop observersOf from the M20 ctx in main.js.

## B982. The place decides how far word goes: open, guarded, closed (2026-11-12)

A scene or region's WoDX NPC place tag gets a Masquerade setting. Left blank, its kind decides: a haven, caern or chantry is closed, an Elysium guarded, anywhere else open. Open places work as before. In a guarded or closed place the breach is still recorded, so the Storyteller can deal with the witnesses, but no rumour goes out to the town (entry.spread false; WoDX NPC skips it). New kinds of place: Elysium and Chantry or Horizon. House rule.

Reverse: set MODE_OF_KIND to {} in witness-rules.js.

## B983. Feeding or violence in Elysium breaks the Prince's peace (2026-11-12)

In a guarded place, feeding, biting, frenzy or violence by a Cainite or ghoul gets a card line saying it breaks the Prince's peace and the Keeper of Elysium and the Prince will hear of it (V20, the Traditions and Elysium). Other Disciplines only note that the Kindred present keep the secret. House rule.

Reverse: make breaksPeace return false.

## B984. A Discipline used in sight asks; a startled onlooker can be marked as knowing (2026-11-12)

Not every Discipline shows, so after one is used where breach witnesses or other kinds can see, the Storyteller gets a card asking whether it showed, with a button to record who saw (setting "Ask who saw a Discipline", on by default). Feeding, a Crinos, the apocalyptic form and vulgar magick tell at once. A startled card has a button that marks those onlookers as knowing that kind from then on (world flag wodx.knows); unlinked tokens such as passers-by are skipped, since they share an actor. Each onlooker is startled by the same creature once a scene. Hook wodxSecretSeen {by, secret, seen, event}.

Reverse: set witnessAsk off; drop the knows button.
## B970. Passers-by: who walks the street, by year and hour (2026-11-11)
Ben asked whether WoDX can spawn simple NPCs for flavour, such as a crowd a vampire can hunt in. WoDX NPC 0.27.0 fills a scene the Storyteller turns on with people of the year: six ages of the street (medieval to 1499, early modern, industrial from 1800, twentieth century from 1914, modern from 1980, the Future Darkness from 2025), each with its own kinds of people and clothes. Crowd sizes by part of the day are house readings: medieval nights are nearly empty under the curfew, gaslight and then late bars fill the night more and more, and the Future Darkness street is a little thinner and warier than the modern one. The scene's hunting ground (V20 p. 334, through WoDX Storyteller) sets how busy it is, from slums to patrolled streets.

Reverse: CROWD, PEOPLE and AREA_CROWD in wodx-npc/scripts/passerby-rules.mjs.

## B971. Passers-by are mortal vessels and witnesses (2026-11-11)
Each passer-by is an ordinary adult mortal of ten blood points, so WoDX Actions' Feed works on them as on anyone. Some are drunk or high after dark, and some carry the outbreak when one is on in town, using the vessel states Feed already reads (V20 pp. 295, 301-302). No children are among them. Everyone else in the crowd in sight counts as a Masquerade witness.

Reverse: makePasserby in passerby-rules.mjs.

## B972. Simple routines (2026-11-11)
In from one edge, out by another; three in ten stop a while inside first. People stop when a character comes within about a square and a half. The Storyteller can tell one to follow a character (into an alley, say), hold one in place, let one go, or keep one for good as an NPC of its own. When a fight starts or the Masquerade is breached, everyone runs for the nearest edge, except someone already fed on. Passers-by never start fights and set off no WoDX Reaction or Trigger regions, effect areas or Interactables noise.

Reverse: tick and scatter in wodx-npc/scripts/passersby.mjs.

## B973. Animals (Ben 2026-11-11)
Animals join the crowd: strays, cats, rats and pigeons in every age, plus pigs, goats, geese, cattle and horses where the age had them in town (pigs to the 1800s slums, cab horses to 1913, dray horses to 1960). Their blood follows the vessel table WoDX Actions uses: rat a quarter point, bird a half, cat 1, dog 2, cow or horse 5. Pigs and cattle count as a cow and a goat as a dog (house reading). Towns had more animals before the motor car, so the share of animals to people falls from 0.6 in the Middle Ages to 0.15 in the modern age. Draining an animal is not the killing of a person, and an animal is never a Masquerade witness.

Reverse: ANIMALS and ANIMAL_SHARE in passerby-rules.mjs; pbAnimal in wodx-actions/scripts/main.js.

## B974. Kinds of place (Ben 2026-11-11)
The crowd reads the scene's own place tag (flags.wodx-npc.place.kind, PLACE_KINDS in routine-rules.mjs, the tag Interactables, Atmosphere and the Masquerade read), which gains four kinds: back alley or courtyard, farmyard or village, docks or riverside, park or churchyard. Each kind draws its own crowd: a market is a busy square, a castle or court is a great house indoors, woods and caerns a country road, a sewer mostly rats and the desperate, a hospital its nuns, staff and patients, a station a busy crowd with pigeons, and a haven draws nobody. Each sets how busy it is and which people and animals are found there. No livestock or poultry in a back alley; only cats and the odd rat inside a palace or church; servants and gentry, not beggars or lamplighters, in a great house; livestock thick in a farmyard.

Reverse: PLACES in passerby-rules.mjs. Elysium draws a thin, well-dressed crowd of guests and servants; a chantry draws nobody, like a haven.

## B975. Light on the world and on Live (2026-11-11)
Every passer-by is an unlinked token of one of two hidden actors (a person, an animal) in the folder "WoDX passers-by", so no actor is made per passer-by. They live only on the scene the Storyteller is viewing; they are deleted when they walk off, after fifteen minutes, when the scene is turned off or left, and at startup. One fed on, hurt or led away is kept until let go, and startup clears even those after a day. At most 8 a scene by default (16 at most), one batched update every 5 seconds, nothing while paused, during a time skip or (except those running away) during a fight. Every scene starts off, so nothing changes on Live until the Storyteller turns a scene on.

Reverse: settings passersby, passersbyMax, passersbyEvery.

## B947. Recipes for food, drink, medicine and drugs (2026-11-12)
Ben asked for recipes and crafting for consumables after the way Cataclysm: Dark Days Ahead runs them, and approved the design (doc "Recipes and crafting for food, drink, medicine and drugs") with all four recommendations. Mechanics only, WoDX's own methods and words.
Library data/recipes.mjs holds 60 methods. Each names what it makes by a pattern on the goods' names, the ingredients by group (any grain, any fruit, a strong spirit), the kit by what it does (a fire, a kitchen, a brewhouse, a still, a herbalist's table, a laboratory from 1660, a pharmaceutical laboratory from 1900, a food printer from 2040), the roll, the time, the batch and any time the result must stand. A catch-all dish method reads the dish's name for its ingredients ("fish soup" needs any fish). Goods that are grown, gathered or caught, and goods made in a factory, are not made by hand. Every method carries its years.
Rolls on V20: Dexterity + Crafts or the secondary Skill Cooking (V20 pdf 115, printed 107) for cooking and baking, Intelligence + Crafts for brewing and distilling, Intelligence + Medicine, Herbalism or Hearth Wisdom for remedies, Intelligence + Science or Medicine for the laboratory. Goals, times and dots are house rules. Eleven raw goods and middle products added to goods.mjs (raw meat, a plucked fowl, grapes, malt, rennet, lard, sugar, juniper berries, tobacco leaves, coca paste, wash).
Reverse: delete data/recipes.mjs and scripts/recipe-rules.mjs, the cookery.mjs file in Storyteller and its calls; the old category recipes in craft-rules.mjs still work.

## B948. Everyday food needs no roll (2026-11-12)
Everyday dishes (cooking, baking, mixing a drink) are made at once when the cook's dice pool is at least the difficulty (Ben, recommendation 2). Brewing, curing, distilling, remedies and drugs always roll as a long task.
Reverse: noRoll in recipe-rules.mjs returns false.

## B949. Knowing a recipe (2026-11-12)
A character knows a method by dots in its Ability (everyday food 1, cheese and wine 2, laudanum 3, laboratory work 4, designer drugs 5), by carrying a book that teaches its family (a cookery book, a guild's book, a herbal, a home medical guide), or by being taught (actor flag wodx-storyteller.recipes, set by the Storyteller in the window or by a training task with teaches). The Storyteller may start any recipe regardless.
Reverse: knows in recipe-rules.mjs returns ok.

## B950. Strength of made drugs and medicine (2026-11-12)
Successes past the goal set a made drug's or medicine's strength: none weak, 1-2 usual, 3 or more strong. A botch while making one does not ruin the work; it makes the batch impure, which only the Storyteller is told when it is taken. Food and drink keep plain, good, fine and masterwork (B852).
Reverse: STRENGTHS in recipe-rules.mjs; tasks.mjs sets impure on a botch.

## B951. Kindred can taste (2026-11-12)
Vampires can taste food; they just cannot eat it (Ben, 2026-11-12). A vampire cooks and brews at the usual difficulty. The first draft gave one more difficulty below 3 dots; Ben overruled it. The PC book check found no V20 rule on vampires tasting or cooking (2026-11-12). Dark Ages Hearth Wisdom has the specialties Home Remedies and Poisons (pdf 173, printed 172), so it serves for remedies.
Reverse: KINDRED_TASTE in recipe-rules.mjs.

## B952. Batches and things that stand (2026-11-12)
A batch's goal grows by half the base for each one past the first, up to the method's batch size, after Cataclysm's batch savings. A method with a wait (ale a week, wine three months, cheese a month, whiskey a year in the cask) makes the thing under a standing name ("ale (fermenting)"), which takes its own name when the clock passes the ready time (Storyteller ripen on world time). House rules on historical times.
Reverse: batchGoal in recipe-rules.mjs; wait values in data/recipes.mjs.

## B1100. Politics inside factions: one engine, a polity per line and era (2026-11-12)

Ben asked for politics inside every faction built around one game line, with the Camarilla and Sabbat given their own (design: https://claude.ai/artifact/EZBB2z3C51nyucxriHpQHp; Ben approved the build and every review-desk recommendation on 2026-11-12). modules/wodx-npc/scripts/politics-rules.mjs holds the polities: offices, a rank for each member, blocs, law, favours and a gathering. NPC 0.25.0 ships the four Kindred polities (Dark Ages court, Camarilla from 1435, Sabbat from 1493, Anarchs from 1381); Garou, Changeling, Wraith, Mage, hunters, mummies, demons and Kuei-jin follow in later PRs. Setting "Politics inside factions", off by default.

Reverse: turn the setting off; nothing else runs.

## B1101. Which factions keep a polity (2026-11-12)

The Storyteller picks one in the faction window. Left on the default, a Kindred faction of three or more members keeps a court of its age: the feudal court before 1435, the Camarilla court after. A sect picked before its founding year (the Sabbat before 1493) runs as the court of its age until then. House rule.

Reverse: polityFor returns f.polity only.

## B1102. The inner turn (2026-11-12)

Each faction turn, up to three NPC members of a faction with a polity act, highest standing first, each picking one move by weight: Petition (Charisma + standing, difficulty 6, gains favour), Court a bloc (Manipulation + standing, difficulty 7, a clan leans their way), Accuse (Manipulation + standing against the target's Wits + standing; a charge for the next gathering), Call in a favour (an open Ledger boon owed to them by another member), Bid for office, Lie in wait (+1 difficulty to moves against them next turn). Player characters never act on their own. House rule.

Reverse: set ACTORS_PER_TURN to 0.

## B1103. Seats and how they are won (2026-11-12)

Appointed seats are claimed and given at the gathering by the judge (the top seat). Primogen seats go one per clan present, to that clan's highest standing. Challenged seats (Prince, Archbishop, Bishop, Ductus) are won by an opposed Strength + Dexterity roll between NPCs (monomacy in the Sabbat, V20 pdf 517); the loser drops a dot of standing. Anarch seats go to whoever has more favour plus standing than the holder (V20 pdf 53). A Vinculum of 7 or more toward the holder makes a Sabbat challenge 1 harder. The top seat changing, and anything that touches a player character, waits in the approval queue. House rule. Staging a challenge as a fight through WoDX Combat's fight starter comes with the Garou challenges (PR 2).

Reverse: drop the "challenge" and "backing" branches in innerTurn.

## B1104. The gathering and standing (2026-11-12)

Elysium and the esbat meet every second inner turn, the feudal court and the gangs every fourth. A gathering hears the charges (favour + standing + a die each, the judge's own charge leaning 3; guilty costs a dot of standing), fills empty seats, and grants a dot of standing to the member with 3 or more favour (favour spent). A Sabbat esbat shares the Vaulderie: a die per packmate the first time, then +1 when a die beats the rating, to 10 (V20 pdf 297). A boon marked broken in the Ledger costs the debtor a dot in every court they belong to (Guide to the Camarilla pdf 148-150); a major, blood or life boon marked kept earns one (house rule).

Reverse: set every gathering's "every" very high, and PAID_GAINS to an empty set.

## B1105. Standing kept beside the sheet (2026-11-12)

A member's standing inside a polity is kept on the faction (0 to 5) and starts from the Status Background on the sheet. The sheet itself is never changed by politics; the Storyteller copies a change across when it should stick. House rule.

Reverse: write politics.ranks back to the Status item when a pol-rank change applies.

## B1200. The body plan (2026-11-12)

Ben approved a light body plan, modelled as a small tree of parts after Caves of Qud's bodies (review desk, 12 November 2026). WoDX Combat body-rules.js keeps the trees (person, four-legged beast, winged, bird, serpent, fish, spider, winged person, formless) and the shapes that pick them. Gear slots, natural weapons, moves and senses come from the parts. Parts have no health of their own; the health track stays as the books have it. House rule in its details.

Reverse: remove body.js and body-rules.js and the calls to them in main.js and movement.js.

## B1201. Which shape a body is in (2026-11-12)

The Storyteller's flag wodx-combat.shape wins, then a shape power's effect (Shape of the Beast is a wolf unless the effect names a bat or a rat; Mist Form, Earth Meld, Horrid Form, Chiropteran Marauder, a Shape keyword effect), then a shapechanger's form. Only shape powers count, so a Gift that names a wolf changes nothing. Corax, Camazotz, Nagah, Rokea and Ananasi take their animal's tree in Lupus and Hispo. House rule.

Reverse: shapeOf in body-rules.js.

## B1202. Claws need growing (2026-11-12)

Protean 2 no longer means claws at all times: picking "Claws (grow them)" in the attack dialog spends 1 blood and makes a Feral Claws effect for the scene (V20 p. 199; VtDA20 p. 240). Vicissitude needs bone talons on the lasting changes record (Bonecraft, V20 p. 242). The automatic attack never grows claws, since that costs blood.

Reverse: the claw branch of weaponList and attackUsable in wodx-combat main.js.

## B1203. Hit locations (2026-11-12)

Ben chose hit locations on every attack. A hit lands on a part: the one aimed at (Aim at, which sets the book's targeting size: limbs +1, head and hands +2, eyes and heart +3, V20 p. 274; VtDA20 p. 346), a random part of the size picked, or at random by weight (body 4, each leg 1.5, each arm 1, head 1, wings 1, tail and fins 0.5). The card says where it landed. Setting "Hit locations", on by default. House rule.

Reverse: turn the setting off, or change HIT_WEIGHTS.

## B1204. Maiming is offered, never automatic (2026-11-12)

A hit of 3 or more lethal or aggravated levels after soak on a limb, hand, eye, wing, tail or fin whispers the Storyteller a card: crippled until those levels heal (+2 difficulty on actions with it, VtDA20 p. 348) or lost for good, which adds a lasting change in WoDX Storyteller. Three matches the stake (V20 Dark Ages p. 347). House rule for the threshold.

Reverse: maimOffer in body-rules.js.

## B1205. Gear in a shape that cannot use it (2026-11-12)

When the shape changes, weapons in hand come off in a shape with no hands, and armor in a shape that cannot wear it (a vampire's shapes carry it along instead, B1210) (Crinos, Hispo, Lupus and the animal shapes, Mist, Earth Meld, the Zulo and Chiropteran shapes). Dedicated items stay (W20 p. 211; DA:W p. 149). W20 p. 286 has undedicated clothes shred in the bigger forms; no book says what Shape of the Beast or Earth Meld does to gear, so for those this is a house rule. An Undo card puts everything back. Setting "Gear comes off", on by default.

Reverse: turn the setting off.

## B1206. Features on lasting changes (2026-11-12)

A lasting change in WoDX Storyteller can say what it does: bone talons, spikes or armor, an extra pair of arms, wings, gills, a tail, fangs, changed looks, a false limb, or a part lost. The Storyteller can still write anything as free text. Numbers from the books where they exist (talons Strength + 1 lethal, V20 p. 242; bone plates +1 soak each for 1 Dexterity or 1 health level, VtDA20 p. 268); the rest the Storyteller sets.

Reverse: drop feature and lostPart in normChange.

## B1207. What a lost part stops (2026-11-12)

A lost leg halves speed (W20 p. 260); with no legs, only crawling (house rule). A lost eye: +3 difficulty on depth, shooting and throwing, +2 on sight Perception (W20 p. 259). A lost hand holds nothing. Lost wings ground a flier. Regrowth follows each line's book (Kindred VtDA20 p. 340, ghouls V20 p. 501, Garou W20 p. 259) and is done by removing the change.

Reverse: LOSS_TEXT and the mobility count in body-rules.js.

## B1208. Garou teeth and claws by form, W20 (2026-11-12)

The book check moved three W20 forms: Glabro bites at difficulty 8 for Strength - 1 lethal and claws for Strength + 1 bashing (W20 p. 296); Crinos bites at difficulty 5. W20 gives Lupus claws as lethal in the form text (p. 287) and bashing in the maneuver list (p. 296): the form text wins. Dark Ages: Werewolf is unchanged.

Reverse: naturalWeapons in wodx-actions garou.js.

## B1209. The Body tab (2026-11-12)

Every WoDX sheet gets a Body tab after Ties: the shape and why, the parts as a tree with what each hand holds and the natural weapons, added and lost parts, what the body can do, where blows land, and the lasting changes. The Storyteller can set the shape by hand and add a lasting change from it. Players see only the changes that show.

Reverse: the Body tab block in wodx-sheets extras.mjs.

## B1210. What goes along into a vampire's shape (2026-11-12)

Ben approved the light helper's recommendation after the book check found no rule: in Shape of the Beast, Mist Form and Earth Meld, worn clothes, armor, jewellery and what is in pockets and pouches go with the vampire and come back with the change back; held things, and anything bigger than a small pack, drop. Armor that goes along gives no soak in the shape. WoDX does not know item sizes, so a large pack is left for the Storyteller to drop by hand.

Reverse: carries in SHAPES (body-rules.js) and the shaped check in armor() (wodx-combat main.js).

## B1110. Garou, Changeling and Wraith polities (2026-11-12)

Politics inside factions now covers three more lines. A Garou faction of three or more keeps a sept: a sept leader, a Truthcatcher who judges, a Warder and Master of the Challenge won or kept by challenge, the rest appointed; Rank from the sheet (system.renown.rank), tribes as blocs, the Litany as law (W20 pdf 52-53, 253-254). A Fae faction keeps the court of its age: a noble court before the Shattering (to 1349), a commoner freehold whose keeper is chosen by backing from 1350 to 1968, and a noble fief again from the Resurgence of 1969, with Title from the sheet, houses (or courts, for commoners) as blocs and the Escheat as law (C20 pdf 51-52, 58-59, 65-66, 74-76, 169-172). A Wraith necropolis (Anacreon, Regents, a Marshal, Centurions, legions as blocs; Wraith 20th pdf 126-136) is never a default, because "Spirits or the dead" also covers Umbral spirits; the Storyteller picks it. A sect picked out of its years runs as the polity of its kind and age.

Reverse: drop the four new keys from DEFAULTS and the five templates from POLITIES.

## B1111. Challenges with a player's character are staged, not rolled (2026-11-12)

When a challenge for a seat or for Rank involves a player's character, nothing is rolled: the turn proposes a challenge (big, through the approval queue), and on approval WoDX Combat's fight starter brings both tokens into a fight if both are on the scene and the contest is physical; otherwise a card tells the Storyteller who challenges whom. The Storyteller records the winner in the Factions window. Garou challenges end at submission, never a killing blow. Between NPCs a challenge is still rolled; in a sept the challenged Garou picks the contest they are best at (strength, riddles or a staring contest; W20 pdf 253-254). At each moot one Garou with 2 or more favour challenges the nearest Garou of higher Rank and rises a dot on a win (favour spent). House rule for the exact pools.

Reverse: remove the pol-fight branches in innerTurn and gather, and the riseByChallenge block.

## B1112. A Great Maelstrom empties necropolis seats (2026-11-12)

When one of the Chronicle's Great Maelstrom events fires, each seat but the Anacreon's in a faction run as a necropolis is lost on a die of 1 to 5, with an Undo card. House rule.

Reverse: drop the isMaelstrom call in onEventFired.

## B1113. Mage polities (2026-11-12)

A Mage faction of three or more keeps the polity of its side and age. On the Traditions' side: a fellowship of the Arts before 1466, then a chantry of the Traditions with a master chosen by backing, a voice for each Tradition present (filled like the Primogen), a keeper of the node, a librarian and sentinels; Arete stands in for standing (M20 pdf 25, 30, 42, 78-80, 127-128, 141-143). On Reason's side (the faction's name or notes name the Order, the Union or a Convention): the Order of Reason's guildhouse from 1325 to 1896, then a Technocratic Construct from 1897, both with a head who appoints and a master or manager for each Convention present, standing from the Rank Background (M20 pdf 128-131, 174-180). A Reason polity picked out of its years runs as the other Reason polity. Seat names and standing are house rules.

Reverse: drop mages from DEFAULTS and the four templates.

## B1114. Hunter polities (2026-11-12, Inquisition revised the same day after the book check)

A Hunter faction of three or more keeps a cell of the Inquisition to 1499, a society of hunters (a chapter head, archivist and cell leaders) from 1500 to 1998 (Hunters Hunted 2 pdf 118-124, 137-141), and a cell of the imbued from 1999, with no hierarchy: the cell follows the one it backs, and creeds are its blocs (HtR pdf 35-36, 64, 89-91, 130).

The Inquisition follows Dark Ages: Inquisitor and its Companion. Cardinal Marzone and the Supreme Council of Faith stand over local Councils of Faith, and those stand over cells, bypassing the bishops (Companion pr 73-75). A cell's rector is appointed from above, and the cell elects its sub-rector, treasurer, archivist and cellarer, subject to the rector's veto (Companion pr 74-75). Its chapter meets every faction turn (the Rule's three chapters a week, Companion pr 72), its blocs are the five orders, and standing is the Rank Background (DA:I pr 157). A Council of Faith can be picked by hand: a head, a Procurator Fiscalis, and a councillor for each order present. The Sicae Dei council of ten, two from each order with unanimous verdicts (Companion pr 83), is noted but not run. Neither book has rules for these seats, so the charges, votes and Council seats beyond the Procurator are house rules. The imbued polity follows the year alone, so in a Future Darkness chronicle where the imbued wake in 2023 the Storyteller sets No politics until then.

Reverse: drop hunters from DEFAULTS and the four templates; for the old tribunal, the inquisition template before NPC 0.40.3.

## B1115. Mummies, demons and the Kuei-jin, picked by hand (2026-11-12)

Three polities are never a default and the Storyteller picks them: the Shemsu-heru of a city with a priest to the Cult of Isis (Mummy 2nd pdf 27-29, 35-46, 136-140); a congregation of the Fallen from 1999, its first seat won by challenge and a speaker for each faction (Demon: The Fallen pdf 25, 109-118); and a Kuei-jin court with an Ancestor, mandarins and a voice for each wu (KotE pdf 24, 28-30, 39-41, 88-89). WoDX has no faction kind for mummies or demons, so those two fit factions of the kind Other.

Reverse: drop the three templates.

## B1116. What players see of the politics (2026-11-12)

When politics inside factions is on, the player's "Your factions" window lists each active faction one of their characters belongs to, with its polity, who holds each seat, how many faction turns until it next gathers, and its law. For their own characters it shows standing, the seats they hold, their favour, the seats they have a claim on and any charges they face. Others' favour, claims, leanings and Vinculum, and the charges others face, stay with the Storyteller. A player sees this for a secret faction too, because their character belongs to it. Players cannot make inner moves from the window; a player character's politics are played at the table.

Reverse: drop courtRows from openPlayer in founding.mjs.

## B1012. Nothing starts in a container (2026-11-12)
Ben asked that no item start inside a container. A good once written "a bottle of claret" is just claret: Fill and stock lines read "claret" or "claret (3)", never "claret (in a bottle)", and a made item carries no container. good.container stays as data (what it is usually kept in) and older "(in 3 bottles)" lines still read. 22 names that held a container ("a fiddle in a case", "a quiver of arrows", "a pyx of consecrated hosts") now name the thing, with old ids kept through RENAMED, and 140 descriptions no longer describe the bottle, sack or tin. Arrows, shotgun shells, hosts, blank CDs and pizza slices now stack. Library 0.11.0, Interactables 0.26.6.

Reverse: put the "(in ...)" branch back in stackLine and goodsLine, and the old names back from RENAMED.

## B1013. Item words match whole words (2026-11-12)
The word lists that sort goods into substances and abilities match whole words, with an optional plural. Crackers and cracklins are food, not a stimulant, and a speed loader, cracked screens, methanol and methylated spirits are no longer drugs.

Reverse: the R() helper in wodx-library/scripts/use-rules.mjs.

## B1014. How things work together (2026-11-12)
After a study of how Cataclysm DDA links its items (Ben approved all seven recommendations), Library 0.11.0 adds scripts/link-rules.mjs:
- Qualities read from a thing's name (cuts, hammers, pries, sews, thread, boils, cooks, lights a fire, writes, ink, holds a liquid, picks locks, digs, injects, pipe), for goods and Gear alike. The recipes work can ask for a quality instead of a named tool.
- Needs: smoking needs a light, and loose tobacco, opium, hashish or crack also need a pipe; heroin and morphine need a syringe; a candle, lamp or torch needs a flame; writing, drawing and marking need something to write with; a quill needs ink. When nothing in Possessions meets a need, the Use window says so and the user may go ahead; a player's go-ahead is whispered to the Storyteller, who has the last word.
- Liquids: a liquid coming into Possessions with nothing to carry it in (bottle, flask, skin, canteen, jug, cup) gets a private note that the Storyteller decides whether it can be carried. Nothing is blocked.
- Full or empty: lamps, petrol lighters, disposable lighters, fountain pens, needle cases, flashlights and phones carry flags.wodx-library.empty. "It has run out" marks one empty; "Refill it" spends one matching good (lamp oil, petrol, ink, thread, a battery) and "Charge it" uses a power bank or charger without spending it. No amounts. An empty lighter does not count as a light.
- The five kits are separate goods: a glass syringe and a bent spoon; a needle case and a hank of thread; a toothbrush and toothpaste; a quill pen, a penknife and ink; a sling and sling stones. Old ids stay on the first part.
- Later: parts fitted to guns (scopes, silencers), only where a V20 book gives a rule, after a PC book check. Taking things apart goes to the recipes work.

Reverse: drop the whatIsMissing check and supply buttons in use.mjs; the kits through RENAMED in goods.mjs.

## B1120. Signature features live in one table per line (2026-11-12)
Ben approved the Splat Features Desk (https://claude.ai/artifact/Wy4A2X3qjJ88t5QTddhsk5). Each clan, tribe, kith and the like gets one feature of its own. The table is modules/wodx-chronicle/data/signatures.mjs, the pure rules scripts/signature-rules.mjs, the Foundry side scripts/signatures.mjs. Each line gets its own world setting, off by default. Vampire comes first: Toreador, Followers of Set, Brujah and Gangrel in Chronicle 0.25.0.

Reverse: turn off "Clan features (Vampire)".

## B1121. A Muse's Obsession (2026-11-12)
V20 pdf 75 gives the Toreador a scene-long trance when beauty strikes. House rule: a Muse they pick keeps a pull between scenes. Obsession rises a point for each week unseen, to 5, and adds to the difficulty of the next roll to resist beauty. Seeing the Muse lowers it by 1, owning it or making something for it by 2. Harm to a Muse who is a person raises it by 2 and calls for a frenzy check.

Reverse: museTick and museSeen in signature-rules.mjs.

## B1122. The Corruption ledger (2026-11-12)
The Followers of Set work on their victims through the acts WoDX already has (V20 pdf 61, Path of Typhon pdf 346). A won charm, persuasion, deceit, fast-talk or bribe moves the victim's track up 1 and a botch moves it down 1; a gift that feeds the victim's named vice moves it up 1. The track adds to the difficulty of the victim's own resistance. At 3 the victim does small wrongs for the Setite; at 5 the victim is theirs, as a retainer or ghoul bought with experience, or as leverage. A move made on a player's client goes to the approval queue.

Reverse: CORRUPTING_ACTS, stepFromTrade.

## B1123. Brujah causes and the Rant (2026-11-12)
Ben's note: a list to pick from, the player's own cause allowed with the Storyteller's approval, and NPCs draw from the list. Causes carry the year they can first be held. A temper kept against the Cause (the clan's +2 frenzy difficulty, V20 pdf 59) gives a Rant point, and three make a Rant, a gathering that can turn a crowd into a mob.

Reverse: CAUSES, RANT_POINTS.

## B1124. Gangrel marks heal after a month (2026-11-12)
Each frenzy leaves an animal mark (V20 pdf 63). Ben's note: not permanent, a month and then it heals as a wound would, and worth having. Each mark has an edge and a cost on rolls. Claws from a mark do Strength + 1 lethal, a house rule. Wild animals treat a Gangrel as one of their own, which comes in the next step.

Reverse: MARK_LASTS, MARKS.

## B1125. Malkavian glimpses and what the derangement hears (2026-11-12)
V20 pdf 69 gives one derangement that never heals. House rule from the desk: once a night a Malkavian may ask for a glimpse, a riddle about the next live dated event, picked by what the event is about (plague, war, fire, a death, the Church, the Kindred, the spirit world), with only a rough "when". The event's own words are never shown to the player; the Storyteller's note names it. When the event fires, the Storyteller is told who saw it coming and may give back a Willpower point. On WoDX NPC talk cards, a Malkavian's derangement (read from the sheet's derangement field) adds one line of what they hear, from eight to ten lines for each of eleven derangements (Ben asked for variety), under the true reply.

Reverse: DERANGEMENTS and GLIMPSE_THEMES in data/signatures.mjs; the hearAs call in wodx-npc talk.mjs.


## B1126. Tzimisce native soil (2026-11-12)
V20 pdf 79 and V20 Dark Ages pdf 66: a Tzimisce must rest with two handfuls of native soil, or every dice pool is halved (pdf 447) until they do. Built: carrying an item flagged as soil (or named native soil or earth) counts as resting on it; each night without it posts a card and the trait effects show pools halved. "Take native soil" in the clan feature window makes the item. A thief who lifts it makes the next night hard.

Reverse: soilNight and isSoil in signature-rules.mjs; soilTick in signatures.mjs.

## B1127. The Lasombra's empty frame (2026-11-12)
V20 pdf 67 names mirrors only, so cameras are a house rule (book check flag). The camera of the year: a photograph from 1839, film from 1895, video and closed-circuit television from 1970, digital from 2000. A scene the Storyteller marks as watched gives one card a night for each Lasombra token in it: a breach found later by whoever studies the picture. From 2023 (the Future Darkness) every scene counts as watched unless marked otherwise.

Reverse: CAMERAS and CAMERAS_EVERYWHERE in data/signatures.mjs; setCamera in signatures.mjs.

## B1128. The Ravnos vice (2026-11-12)
V20 pdf 73: a Ravnos must roll Self-Control to resist the vice when the chance comes. The sheet keeps one: lying (fed by deceit and fast-talk), theft (a lift, or taking from someone else's container), cheating (any trade) or a dare (marked by hand). Any other talk or trade is a chance, with one prompt a night. House reading of the difficulty: 6, +1 for each week unfed to +2, and +1 after a month in one domain, never above 9. "Moved on to a new domain" resets the stay.

Reverse: RAVNOS_VICES in data/signatures.mjs; ravnosDifficulty in signature-rules.mjs.

## B1129. Caitiff odd gifts (2026-11-12)
V20 pdf 40: Caitiff have no clan weakness. House rule from the desk: a Caitiff with the Thin Blood flaw rolls once a year, one chance in ten, for an odd gift (walks at dusk and dawn, keeps down a little food, passes for mortal for a scene, one less die from sunlight). The card goes to the Storyteller with an Undo. Status that needs a sponsor in Camarilla courts waits for faction politics.

Reverse: ODD_GIFTS and ODD_GIFT_CHANCE in data/signatures.mjs.
## B1130. Ben's Item Uses desk picks applied (2026-11-12)
The 53 cells Ben decided on the Item Uses desk are rulings (PICKS and RULINGS in wodx-library/scripts/use-rules.mjs), and no cell asks the Storyteller any more:
- "As for a mortal": demons and mummies eat, drink, sleep, take drugs and get first aid as mortals do.
- "Weaker": werewolves feel alcohol and drugs at half the dice and half the time; ghouls and revenants feel an unknown drug the same way.
- "Stronger": hallucinogens and unknown drugs hit changelings one die harder and last twice as long.
- "None": bagged blood does nothing for demons, mummies or werewolves; first aid does nothing for vampires; an unknown drug does nothing to a vampire.
- "Cannot": a wraith cannot take an unknown drug.
Medicine for a mummy was left blank and follows the other mummy picks (as for a mortal). Library 0.12.0.

Reverse: empty PICKS.

## B1131. Holy water burns the damned; Ben's item notes (2026-11-12)
Holy water harms demons and vampires of the Baali and the Followers of Set (read from the sheet's clan). The book check (item-uses/holy-water-book-check.md) set the numbers. Baali and Followers of Set take one aggravated level on contact, soaked only with Fortitude, from Dark Ages: Vampire pdf 293; V20 pdf 403 has the Baali burned on touch with no amount, and no book gives Setites anything special, so for them it is Ben's house rule. Demons take lethal damage each turn it stays on the skin, one level for ordinary holy water and up to five for strongly blessed water, and nothing at Torment 3 or less unless they have the Cannot Enter Holy Ground Flaw (Demon: the Fallen pdf 256, Demon Players Guide pdf 86). All three also get +1 difficulty for the scene, which is a house rule. Other vampires and mummies take it as water, as Ben picked, even though Dark Ages: Vampire burns all the unliving (V20 has no such rule).
From Ben's notes on the desk: a patch is put on the skin and its drug is taken (a dermal patch of street stims is a stimulant); the syringe's Inject picks something held (heroin, morphine, ketamine, penicillin and the like) and takes it; heroin needs a spoon and a flame as well as the syringe. From the food marked Fix: milk and shakes are drunk, so they feed and quench thirst; sauces, honey and grapes can be eaten as they are; anything a recipe uses also gets Cook with it.

Reverse: HOLY_HARM and DAMNED_CLANS in use-rules.mjs; the inject case in use.mjs.
## B953. Taking things apart for parts (2026-11-12)
Ben approved the item-links study, which puts Cataclysm's reversible recipes on the recipe machine. A thing is taken apart through Use ("Take apart for parts"). Rules in Library data/recipes.mjs SALVAGE: by name and category, what parts come out (metal, wood, hide, wire, scrap electronics, a chip, plastic, wax, a hinge, a buckle, cordage, tubing), each the first good in use in the year (steel bar stock after 1850, iron bar stock before). One more of each part at value tier 3 and up. Food, drink, drugs, medicine, coin, papers, books, maps, seeds, fuel, materials, valuables, faith, occult and hygiene goods are not taken apart.
It needs a tool that cuts, pries or hammers (for electronics, one that turns screws or solders; Library link-rules qualities serve too), and a V20 simple action: Dexterity + Crafts, or Technology for electronics from 1900, difficulty 6 (7 at tier 4 and up). Cheap things need no roll when the pool is at least the difficulty (as B948). No successes: still whole. A botch: spoiled, nothing kept. House rule.
Reverse: empty SALVAGE in data/recipes.mjs.

## B1150. The Nosferatu trade in secrets (2026-11-12)
V20 pdf 71: a Nosferatu's Appearance is 0, and the clan trades in what it overhears (pdf 28). When a Nosferatu deals with a mortal face to face, the Storyteller gets one card a night for each mortal, with a button that records a Masquerade breach (unless Obfuscate held). A page of secrets is an item. Handed over in a trade, it buys a minor boon while fresh and a trivial one when stale. Freshness follows how fast word travels in the age (media-rules): 60 days by word of mouth, 30 in print, 14 with newspapers, 7 with the wireless, 3 with television and 1 with the internet. The under-town map layer waits for map generation.

Reverse: SECRET_FRESH in data/signatures.mjs; trueFace and secretSold in signatures.mjs.

## B1151. The Tremere Pyramid (2026-11-12)
The book check found no rank ladder in V20 core, so the ranks are a house reading: the seven circles of apprentice, then Regent, Lord, Pontifex and the Inner Council. An order may only come down the Pyramid. Refusing it costs 1 Willpower, or 2 when the order comes from three or more ranks above, and the Storyteller hears of it. Rituals as recipes wait for the recipe work.

Reverse: TREMERE_RANKS; refuseCost in signature-rules.mjs.

## B1152. Ventrue influence (2026-11-12)
Once a month, a Ventrue may take a minor boon from a mortal institution of the age instead of that month's holdings income. The Storyteller logs the boon in the Ledger from the card and skips the income. A Ventrue who loses a holding answers to the clan, through a card.

Reverse: INSTITUTIONS in data/signatures.mjs.

## B1153. Assamite contracts (2026-11-12)
A contract has a target, a price and a deadline. Keeping it raises standing at Alamut by one (0 to 5, starting at 1) and sends a tenth of the fee to the clan as a tithe. A contract still open at its deadline fails at the daily tick and lowers standing by one.

Reverse: settleContract and TITHE.

## B1154. The Giovanni's bound dead (2026-11-12)
A ledger of bound wraiths, each held by a fetter. Calling one sends a card to the Storyteller. Before 1444 (a house reading of the date, as the book check flagged) the window names the line as the Cappadocians, whose deathly look is a Masquerade sign up close.

Reverse: giovanniName in signature-rules.mjs.

## B1900. One list of relationships, read from both ends (2026-11-12)
Ben picked "Build it as described" for Relationships on the sheet and the family tree on the Improvement Desk. WoDX NPC's ties-rules.mjs reads every place WoDX keeps a tie: the lineage (sire, domitor, blood bonds, formerly and became, heirs from Pass the Years), Allies and Retainers bought as Backgrounds, a vampire sheet's Sire box matched by name, the hand-made list on the sheet, and open debts, boons and oaths in the Ledger. Each tie is drawn at both ends, so a sire's record makes a childe on the other sheet. A tie made in two places is kept once, with the hand-made note. WoDX Sheets' Ties tab becomes Relationships, grouped by kind. The old roles still read.

Reverse: relationsOf in wodx-sheets extras.mjs (null falls back to the old Ties tab); edges in ties-rules.mjs.

## B1901. What players see of a tie (2026-11-12)
Players see the ties of characters they own and of sheets they can open, except a hand-made tie the Storyteller marked hidden (Storyteller only, at both ends) and a tie a secret hides. A tie a secret hides shows to the owners of either end, who know it, and to anyone whose character found the secret out. House rule.

Reverse: visibleTo in ties-rules.mjs.

## B1902. The family and lineage tree (2026-11-12)
A window from the sheet's Relationships tab and the People window. For one person it draws each line that has someone in it: sires and childer, domitors and ghouls, family, heirs, mentors and students, patrons and retainers, plus bonds, kin and changes of state on the side. Up to 13 steps up and 6 generations down. Going up, a tie the viewer may not see shows as Unknown; going down it is left out, so a hidden childe is not given away. A vampire with no sire recorded shows an Unknown sire. Any name can redraw the tree from there.

Reverse: treeFor in ties-rules.mjs, openTree in people.mjs.

## B1903. Secrets, and the hook a find makes (2026-11-12)
Any actor can hold secrets (flags["wodx-npc"].secrets): a kind, the words, how much it matters (It matters, Grave), and a tie it hides. When someone finds one out, WoDX Storyteller's Ledger gets a major boon owed by the holder to the finder (a "hook"), spent like any boon. The Storyteller writes secrets in a Secrets window from the sheet; players never see it, but the Relationships tab shows a character's own secrets and those they found. House rule: CK3's hooks put into V20's prestation.

Reverse: hookEntry in secrets-rules.mjs; reveal in people.mjs.

## B1904. How a secret is found (2026-11-12)
The Storyteller lets someone dig in the Secrets window, or tells them outright. Investigation: Perception + Investigation at 7. Auspex 4 Telepathy: Intelligence + Subterfuge against the holder's Willpower (the V20 Telepathy roll). Spies or Contacts: Manipulation + Streetwise at 7. Auspex 2 Aura Perception: Perception + Empathy at 8, and it only sees diablerie, infernal and Wyrm marks on the soul. One success finds a secret that matters, three a grave one, one fewer for Telepathy and Aura Perception. A botch tells the holder someone is asking. The oldest secret still hidden is found first. A clue's "secret <words>" outcome (WoDX Chronicle) hands over the best match. The dice, difficulties (except Telepathy) and successes are house rules.

Reverse: METHODS and successesNeeded in secrets-rules.mjs.

## B1905. Who cares about a secret, and the charge it makes (2026-11-12)
Each kind of secret has the courts that care, by age: heresy to the Inquisition, and to any court up to 1650; infernalism always; diablerie to the Camarilla and Dark Ages courts, less to the Anarchs, not to the Sabbat; a tie to the other side from 1493 for the Camarilla; a Technocracy defection from 1897. In the faction politics turn an NPC who holds a hook on another member accuses them of that secret, with proof, when the court cares. At the gathering the proof adds 3 a point the court cares, and the secret is laid bare whatever the verdict: everyone knows it, and the hook in the Ledger is cancelled. Laying a player's character's secret bare waits for the Storyteller. House rules.

Reverse: SECRET_KINDS and hooksFor in secrets-rules.mjs; the accuse move and the charges in politics-rules.mjs; pol-expose.

## B1906. "Only when" reads any rated trait (2026-11-12)
WoDX Chronicle's "Only when" lists take a trait name and dots: "Dominate 2", "Etiquette >= 3", "rating Animal Ken 2", "not Occult 1". A bare number means at least that. The trait is found among Attributes, Abilities, Virtues, Spheres and rated items (Disciplines and other powers, Spheres, Realms, Backgrounds); a name that starts the item's name counts.

Reverse: the rating test in when-rules.mjs.

## B1907. Talk lines that need a trait (2026-11-12)
Ben picked "Build it as described". A talk line whose "Only when" asks about the character's own traits (a rated trait, a merit, flaw or background, a power, a clan, tribe, Tradition, kith or other sheet field, Generation, Arete, True Faith) is tried before the plain lines on the same sheet, the way Bloodlines offers its clan and Discipline lines. The talk card and the Storyteller's "ask me first" card mark it with what unlocked it, in brackets. A not-test unlocks nothing; being Kindred is not a trait line.

Reverse: fitting and gateOf in talk-rules.mjs.

## B1908. Why an NPC feels as they do (2026-11-12)
Ben picked "Build it as described". For the Storyteller only, under each talk card and on an NPC's Relationships tab: the first meeting and each change since, summed by cause, so the steps add up to the attitude; then what else is on the NPC's mind: boons kept or broken between them, debts still open, a fight between them (WoDX NPC now notes on the NPC who fought them when a combat ends), a tie (sire, childe, bond, kin, rival), a secret one found on the other, the same clan, tribe or Tradition, and a rival side. These do not move the attitude by themselves.

Reverse: reasonsFor in opinion-rules.mjs; onRenderMessage and onCombatEnd in people.mjs.
## B1155. Bloodlines come before clans in the table (2026-11-12)
The bloodlines, castes and Laibon legacies have rows of their own, placed before the clans so that "True Brujah", "Salubri antitribu", "Old Clan Tzimisce" and "Assamite vizier" each find their own row first. Each is a "line" feature with three possible parts:
- roll effects (for example True Brujah Empathy -1 die, Daughters of Cacophony Perception +1 difficulty, Gargoyles resisting Dominate +2 difficulty, Osebo and Akunanse resisting frenzy +1 difficulty, Guruhi deceit +1 difficulty)
- a Masquerade sign card when a mortal deals with them (Gargoyles, Samedi, Harbingers, Salubri, Lhiannan, Xi Dundu)
- engines borrowed from a clan: a vizier's Muse; contracts for Assamite sorcerers, a Baali pact and an Ahrimane spirit pact; bound dead for Harbingers and Nagaraja; the Ishtarri vice; soil for the Old Clan and the Naglopers

Reverse: BLOODLINES in data/signatures.mjs; rowHas in signatures.mjs.

## B1156. The Old Clan holds out a night longer without soil (2026-11-12)
House reading from the desk: an Old Clan Tzimisce's pools halve only after a second night without native soil.

Reverse: grace on the koldun row.

## B1157. Laibon legacies (2026-11-12)
Eight legacies from Kindred of the Ebony Kingdom (pdf 48-64) have rows: Akunanse, Guruhi, Ishtarri, Kinyonyi, Naglopers, Osebo, Shango and Xi Dundu. The Vipers are the Followers of Set and use their row. Weaknesses come from the book check; the features are our own.

Reverse: the Laibon rows in BLOODLINES.

## B1158. Ghouls (2026-11-12)
Ghouls follow the V20 Dark Ages rules in every era (standing rule 12; V20 DA pdf 38). A ghoul's feature is the fix. Each whole month without a drink from the domitor posts a card that takes away a blood point; with none left, the years held off start to come back. "Drank from the domitor" in the clan feature window starts the month again. A ghoul now gets the ghoul row, never the row of the domitor's clan.

Reverse: GHOUL in data/signatures.mjs; ghoulTick in signatures.mjs.

## B1159. Revenant families, old and new (2026-11-12)
The four families from the books (Guide to the Sabbat pdf 219) are the Bratovitch (beasts), the Grimaldi (money), the Obertus (learning) and the Zantosa (vice). Ben asked how families founded in play would work, and the answer on the desk is now built. A new family has a founder, one trait from the list (beasts, money, faith or learning, vice, war, craft), two or three family Disciplines, a flaw and a year it was founded. The Storyteller's family is kept at once; a player's waits in the approval queue. A family's trait gives a die to its field or lends the vice engine. Revenants are born ghouls, so the monthly fix doesn't apply to them.

Reverse: FAMILY_TRAITS and REVENANT_FAMILIES in data/signatures.mjs; the sigFamilies world setting.

## B1160. Werewolf features stack: tribe, auspice and breed (2026-11-12)
Splat Features Desk, all items approved by Ben (03:29 UTC). A Garou has three rows at once, read from the sheet's tribe, auspice and breed (through WoDX Actions where it is on). Any other Changing Breed has the row of its breed and its breed form (homid, metis or lupus). Kinfolk (the Kinfolk flag WoDX Actions sets) have a row of their own. A new world setting, "Tribe, auspice and breed features (Werewolf)", is off by default and works apart from the Vampire switch. The window on the sheet header is now called "Signature feature".

Reverse: rowsOf in signatures.mjs (rowOf is its first row); TRIBES, AUSPICES, BREEDS, FERA and KINFOLK in data/signatures.mjs; the sigWerewolf setting.

## B1161. Signature roll effects reach the dice (2026-11-12)
The roll effects on the signature rows (the bloodlines' since 0.29.0, and now the tribes', breeds' and Fera's) were shown in the window but never reached a roll. The traits api now adds them to the merits and flaws on each roll, so WoDX Actions picks them up with no change of its own. Survival, Medicine, Etiquette, Occult and the other ability keys these rows name became roll tags of their own; lifting and planting gained the tag lift, cons and fast talk con and fasttalk. "resist-frenzy" reads as the frenzy roll and "resist-dominate" as a resist on mind powers. An effect can name a condition: crinos (the form the sheet shows) or a weather tag (cold, thunder). Soil halving stays a note in the window.

Reverse: rollEffects in signatures.mjs and its use in traits.mjs effects; RAW_TAGS in trait-rules.mjs.

## B1162. The tribes' engines (2026-11-12)
Black Furies guard the scene they stand in: a fight breaking out there, or someone taking things from it, sends the Fury a card with the hour, and the Storyteller's button gives one Rage point for the hunt. Children of Gaia offer a truce in a fight; the Storyteller's button takes every NPC out of it (the roll, Charisma + Empathy, is a house reading). Shadow Lords keep failures they learn as leverage and spend one as a minor favour in the Ledger. Silver Fangs hear NPCs through their derangement, as Malkavians do. Stargazers read a riddle from the stars once a lunar month, only under a clear sky. Fianna tales and Get of Fenris scars go to the Storyteller as a Glory card. Wendigo gain a die to Survival and attacks in cold weather; Shadow Lords to Intimidation in a thunderstorm. Croatan (to 1590) and Bunyip (to 1890) carry an end year; both years are house readings. White Howlers and the Black Spiral Dancers are for NPCs and stories.

Reverse: guardPlace, desecrated, offerTruce, leverage, spendLeverage, readSky, tale in signatures.mjs.

## B1163. The auspices and breeds (2026-11-12)
Rage at the auspice's moon is already built in WoDX Actions, so the auspices add their own work. A Philodox posts a ruling for everyone to see. A Galliard's tale goes to the Storyteller, whose button gives Glory to its hero and Wisdom to the teller. An Ahroun goes first when a fight with a creature of the Wyrm begins (a Black Spiral Dancer, or a name with wyrm, fomor, bane or Pentex in it). The extra soak die in Crinos is a house reading the Storyteller adds. Ragabash and Theurge get a die on lifting and on Occult. Metis pick one deformity from six, and it works on the rolls. Lupus perceive one easier by smell and hearing.

Reverse: AUSPICES, BREEDS and DEFORMITIES in data/signatures.mjs; ruling, setDeformity and onCombatStart in signatures.mjs.

## B1164. The other Changing Breeds and the Beast Courts (2026-11-12)
Each of the eleven Fera of W20 Changing Breeds has a row. Bastet borrow the Nosferatu's pages of secrets, without the true face. A Nagah verdict goes to the Storyteller alone. The Hengeyokai breeds (Hakken, Khan, Nezumi, Same-Bito, Zhong Lung, Tengu, Kumo, Okuma, with the Kitsune and Nagah) also say that rank in the Beast Courts is a faction standing of its own. Apis, Camazotz and Grondr are gone before 1197 and are met only as relics. Their extinction is a house reading, because no book in the store dates it. Harm to Kinfolk sends a card for each player's Garou of that tribe, once a day.

Reverse: FERA and COURTS_TEXT in data/signatures.mjs; kinHarmed in signatures.mjs.

## B1165. Mage features: the group and the House (2026-11-12)
Splat Features Desk, approved by Ben. A mage's row comes from the sheet's sect (the system keys: akashic, speakers, ether, adepts, batin, iterationx, engineers and the rest) or its custom sect. A Hermetic House named in the custom sect, or in the house flag, adds a second row. Each row carries the older names of its age: the Dark Ages fellowships to 1465 (Old Faith, Messianic Voices, Spirit-Talkers, the Batini, the Ecstatics), and the Order of Reason's conventions to 1896 (the Artificers, the Cabal of Pure Thought, the Hippocratic Circle, the High Guild, the Void Seekers). Some groups have their own years: the Sons of Ether from 1904, the Virtual Adepts from 1961 (a house reading), the Hollow Ones from 1890 (a house reading), and the Celestial Masters and Craftmasons from 1325 to 1896 (a house reading). The new world setting "Tradition, Craft and Convention features (Mage)" is off by default.

Reverse: MAGE and HOUSES in data/signatures.mjs; mageRows, nameAt and notYet in signature-rules.mjs; the sigMage setting.

## B1166. The Mage engines (2026-11-12)
The Akashic Brotherhood meditate at dawn for a Willpower point, once a day. The Euthanatos gain a Willpower point for a Good Death and a point of Jhor for a death in anger. The Order of Hermes and House Flambeau call a certámen: a public card whose button logs the stake as a minor favour. The Sisters of Hippolyta keep oaths, and breaking one costs a Willpower point. The New World Order hear of every breach of the Masquerade first, through the records of the age. Some groups borrow an engine: the Taftani bind djinn in the Giovanni's servant ledger, the Syndicate use the Shadow Lords' leverage, the Celestial Masters use the Stargazers' reading of the sky, House Quaesitor posts rulings, and the Nephandi use the Followers of Set's Corruption ledger. Science became a roll tag, for the Sons of Ether.

Reverse: meditate, death, certamen, oath, breakOath and onBreach in signatures.mjs.

## B1167. The Houses (2026-11-12)
Bonisagus, Flambeau, Quaesitor, Shaea, Ex Miscellanea, Janissary, Diedne and Tremere have rows. Janissary ends in 1700 (a house reading). Diedne were gone before 1197. House Tremere leaves the Order in 1199 (a house reading) and is the clan from then on. The other Houses (Tytalus, Verditius, Criamon, Merinita, Jerbiton, Bjornaer, Guernicus, Mercere, Fortunae) share one row until Houses of Hermes is in the store.

Reverse: HOUSES in data/signatures.mjs.

## B1500. Changeling features stack: kith, seeming, court and House (2026-11-12)
Splat Features Desk, approved by Ben. A changeling's rows come from the sheet's kith (the system's keys or the custom kith), seeming, court and House, all at once. The system's longer kith list is grouped: every Thallain kith reads as the Thallain row, the Inanimae kinds as the Inanimae, the Nunnehi tribes as the Nunnehi, and the Dark-Kin as one row (its feature is a house reading). The Dauntain and the Hsien have rows, the Hsien by their shinma. The new world setting "Kith, seeming and court features (Changeling)" is off by default.

Reverse: KITHS, SEEMINGS, COURTS and FAE_HOUSES in data/signatures.mjs; faeRows in signature-rules.mjs; the sigChangeling setting.

## B1501. The Changeling engines (2026-11-12)
A Satyr or Clurichaun holds a revel: a public card whose button gives a point of Glamour to each changeling on the scene, and two to a Satyr. A Pooka who tells the plain truth loses a Willpower point. A Selkie's seal coat is an item, and the Storyteller hears when it leaves the pack. Trolls and sidhe keep oaths with the Hippolyta engine, and breaking one costs a Willpower point. The extra soak die for a troll's cause is the Storyteller's to add.

Reverse: revel, toldTruth, giveCoat and onItemGone in signatures.mjs.

## B1502. Courts by the season, seemings by the years (2026-11-12)
From Samhain (1 November) to Beltaine (1 May) the Unseelie Court holds power, and the Seelie Court holds it for the rest of the year. The court in power gains a die on its own social rolls (Etiquette and Leadership for the Seelie, Intimidation and Subterfuge for the Unseelie). In the Dark Ages the text reads the courts as the seasonal Courts. A childling resists Banality one easier and a grump one harder, and a grump gains a die to lore. Banality became a roll tag, and an effect can name dark (a scene at half darkness or more) as its condition.

Reverse: COURTS, SEEMINGS and UNSEELIE_MONTHS in data/signatures.mjs; whenNow in signatures.mjs.

## B1503. The sidhe Houses (2026-11-12)
Each of the fourteen Houses has a row with a seat in the fae courts and a one-line theme. Ailil, Dougal, Eiluned, Gwydion and Scathach gain a die to the field of their theme. The Storyteller applies each House's boon and flaw from the book (C20 pdf 10, 51), because they are not written out here. A Fianna Galliard now gains Wisdom for a tale, as any Galliard does: the gate found that the tribe's row hid the auspice's.

Reverse: FAE_HOUSES in data/signatures.mjs; isScarOnly and tale in signatures.mjs.

## B1504. Wraith features: Guild, legion and faction, picked on the actor (2026-11-12)
Splat Features Desk, approved by Ben. The wraith sheet has no field for a Guild or a legion, so the feature window picks them, and the picks are kept in the actor flag wodx-chronicle.wraith. Rows stack in the order Guild, legion, faction. A legion is suggested from the sheet's death field by the manner of death: violence for the Grim Legion, illness for the Skeletal, old age for the Iron, despair for the Silent, madness for the Penitent, mystery for the Paupers, chance for the Emerald and fate for the Fate Legion. Joining by the manner of death is a house reading, because the books do not say it outright. The new world setting "Guild and legion features (Wraith)" is off by default.

Reverse: GUILDS, LEGIONS and WRAITH_FACTIONS in data/signatures.mjs; wraithRows and legionFor in signature-rules.mjs; the sigWraith setting.

## B1505. The Wraith engines (2026-11-12)
Several rows borrow engines already built. The Oracles and the Fate Legion read the Malkavian riddle of the next event, once a night. The Pardoners keep confessions as Shadow Lord leverage. The Penitent Legion hear through a derangement. The Emerald Legion's luck allows a reroll on a roll of chance once a week, a house reading of "once a story". The Guilds' Arcanoi name their rows too, so "Keening" finds the Chanteurs. Investigation, Angst and the Harrowing became roll tags.

Reverse: setWraith and luck in signatures.mjs.

## B1506. Factions of the dead (2026-11-12)
Heretics, Renegades, Ferrymen, Spectres (NPCs) and the Risen have rows. A wraith takes at most one, as the faction pick.

Reverse: WRAITH_FACTIONS in data/signatures.mjs.

## B1507. Signature features for Hunter, Mummy, Demon, Kuei-jin and Orpheus (2026-11-12)
Splat Features Desk, approved by Ben. Each line has its own table and its own world setting, all off by default. The rows come from the sheet's own field where it has one: the Hunter's creed, the Mummy's Amenti, and the Demon's House and faction, which stack. Kuei-jin and Orpheus sheets have no field, so the group is picked in the feature window and kept in the actor flag wodx-chronicle.splat. A Kuei-jin is a Vampire whose variant or profile names kuei-jin; an Orpheus character is one whose profile names Orpheus, a projector or a Shade.

Reverse: SMALL_LINES and its tables in data/signatures.mjs; smallRows in signature-rules.mjs; smallLineOf and setSplat in signatures.mjs.

## B1508. The hunters by era (2026-11-12)
Standing rule 12 sets the eras. Inquisitors and the Society of Leopold play in every era. Mortal hunters (Hunters Hunted II) run from 1500 to 1998, and the imbued creeds from 1999. Government agencies run from 1900, a house reading. The Avengers' and Waywards' fight die counts only against a target that is not mortal, when the roll knows its target; with no target it gives nothing. The Inquisition and the agencies hear of breaches as the New World Order does, and the Watchers card now names whichever groups heard.

Reverse: HUNTER in data/signatures.mjs; the "monster" condition in sigRollEffects.

## B1509. Borrowed engines across the small lines (2026-11-12)
Defenders and the Kher-minu guard a place, with the Black Fury engine. Judges give a hidden verdict, and the Crane posts a ruling. Hermits, Fiends and the Banshee read the riddle of the next event, and the Mesektet read the stars. The Sefekhi bind the dead. Ishmaelites trade pages of secrets. Defilers use the Corruption ledger. Faustian pacts are leverage.

Reverse: the also and feature fields on each row.

## B1510. Lines with NPCs only (2026-11-12)
Bane mummies, the Earthbound, the Wan Xian and the Cabiri have rows for the Storyteller's NPCs, with a lore page or a card where the desk asked for one.

Reverse: those rows in data/signatures.mjs.
## B1511. City Masquerade exposure (2026-11-12)
Each city keeps one exposure track. A breach recorded by the witness rules adds 1, plus 1 for each witness past the first (2 more at most), plus 1 from 1605 when printed news carries it, plus 2 when the scene is marked watched by a camera. A breach kept in a closed place (spread off) gets no print point. Each 7 quiet days take 1 off. The bands are Quiet 0, Whispers 3, Talk 6, Watched 10 and Hunted 15. A Storyteller card comes when a band is crossed upward. Hunted starts a big rumour through the Storyteller module. Idea from the Princes of Darkness mod; numbers are a house rule.

Reverse: setting podExposure off; EXPOSURE_BANDS and breachPoints in pod-rules.mjs.

## B1512. Each sect's law and bringing a culprit to heel (2026-11-12)
A Camarilla court (and the Church of Caine before 1435) acts at Watched; Sabbat, Anarch and sectless cities act only at Hunted. The court card names the culprit and the V20 means of enforcement (Dominate or Presence against Willpower, or an accusation before the court). Its button lowers the city's exposure by 3. The Storyteller sets each city's law in the window.

Reverse: SECT_LAW and HEEL_DROP in data/pod.mjs.

## B1513. The city of a scene (2026-11-12)
A scene's flag wodx-chronicle.city names its city; otherwise the world setting podCity (Rothenstein by default).

Reverse: cityOf in pod.mjs.

## B1514. Great cities that change with history (2026-11-12)
Constantinople, Rome, Paris, Baghdad, Cairo, Jerusalem, Prague, Brno and Olomouc have dated states taken from history (sackings, occupations, rebuildings, changes of ruler). Each state has tags, a smell and a sound. Senses adds the smell and sound to every answer in that city through wodxSensesGather. Map generation reads api.pod.cityState(scene or name, year).

Reverse: setting podCities off; CITIES in data/pod.mjs.

## B1515. Raising or restoring a building (2026-11-12)
The window's Raise or restore posts a card. Its button logs a minor boon in the Storyteller's Ledger, owed by the faction that gains to the patron. Money and holdings stay with the Storyteller's holdings window.

Reverse: raiseBuilding in pod.mjs.

## B1516. Golconda as a long road (2026-11-12)
A Kindred seeker has a road of 10 steps, kept on the actor. Taking a life (lethal and aggravated damage reaching seven levels from the seeker's attack) costs 2 steps. Frenzy, a won pickpocket lift, and feeding of 3 or more blood points or by force each cost 1 step. A mentor teaches one step for each 30 days on the clock, through the approval queue. The Storyteller adds a step for a test passed. At 10 a card offers Grant Golconda, which sets WoDX Actions' own golconda flag. V20 p. 30 (pdf 38); the road's steps and costs are a house rule.

Reverse: setting podGolconda off; GOLCONDA_SETBACKS and MENTOR_DAYS in data/pod.mjs.

## B1517. Story chains (2026-11-12)
Six dated chains: a Setite corrupting a faith, the Anarch Revolt (1381 to 1493), the Black Death (1347 to 1353), the Inquisition coming to town (1231 to 1834), a hunt for an Antediluvian (1493 to 1999) and the Week of Nightmares (1999). The Storyteller starts one in the window, at a place. The clock deals each step as a Storyteller card after its gap in days. These are different from the lifepath chains of B1311: they run in play, not in creation.

Reverse: setting podChains off; CHAINS in data/pod.mjs.

## B1518. Opening goals (2026-11-12)
Each line has three opening goals for before 1800 and three from 1800, and mortals and other kinds use the mortal list. A character with a player owner and no goal gets the goals as buttons in the feature window. Signing off before the first night posts the list to the owner.

Reverse: GOALS in data/pod.mjs; section in pod.mjs.

## B1519. Anda marks heal like the Gangrel's (2026-11-12)
Ben's note on the Splat Features Desk: an Anda takes the same animal marks from frenzy as any Gangrel, each lasting a month before it heals.

Reverse: also on the anda row in data/signatures.mjs.

## B1310. Lifepaths: a chain of scenes before points are spent (2026-11-12)
Improvement Desk cr1, approved by Ben. A lifepath is optional and spends nothing: birth, youth and adult life by era band, then the turn into the line, the splat's own scene and the first years after. Each choice suggests Backgrounds, Abilities, Merits, Flaws or a note, and may name someone from the past. At the end the player keeps or drops each suggestion and ticks who becomes an NPC (the Storyteller's at once, a player's through the approval queue). Kept on the actor as flags["wodx-creation"].lifepath; a change of state carries it to the new sheet. The Storyteller's prelude journal (Storyteller 0.34.1) shows it, so the one-on-one prelude builds on it rather than a second prelude being made.

Reverse: remove the Lifepath button (apps.mjs, registerSheetButton) and lifepathPart in wodx-storyteller/scripts/prelude.mjs.

## B1311. The chain follows Princes of Darkness's event chains, nothing else of it (2026-11-12)
The CK3 mod runs a childe's education as an opening choice (strict, lenient, free) whose result weights a pool of follow-up events, rules some out (factor 0) and sometimes names the next one, ending in a closing event. WoDX's lifepath does the same with flags, weight factors (more) and named next scenes (n). The mod's V5 material (blood potency, resonance, predator types) is not used.

Reverse: drop more and n from the tables; draws are then plain weighted picks.

## B1312. Lifepath era windows (2026-11-12)
Fourteen era bands from 1197 to the World of Future Darkness. Lines open by year: the Fallen from 1999, projectors from 1848 (the spiritualist mediums); every other line every era. Splats open by year where the setting fixes it: Cappadocians to 1444 and Giovanni from 1444, the Council's Traditions from 1466 with the Dark Ages Fellowships before, the Order of Reason's Conventions 1325 to 1896 and the Technocratic Union's from 1897, Sons of Ether from 1904, Virtual Adepts from 1961, Sidhe to 1400 and from 1969, imbued creeds from 1999 with mortal hunters 1500 to 1998, Amenti from 1999 with the old Immortals before. Rows the books give no clear year for are marked house: true and listed in PENDING-REVIEW.

Reverse: the spans on each row in data/lifepaths-splats.mjs.

## B1313. People from the past (2026-11-12)
Up to three named people are ticked by default. Anyone more than 70 years before the chronicle's year is a name only, as most are long dead, unless the scene marks them lasting (a ghost, someone who shares the night). NPCs come from the People generator for the chronicle's own era, with a note of who they were to the character.

Reverse: PEOPLE_DEFAULT and PEOPLE_ALIVE_SPAN in lifepath-rules.mjs.


## B1300. Area shapes and their sizes (2026-11-12)
Ben approved the Improvement Desk item "Area shapes for powers". An area power's tag may carry a shape and size in yards after a colon (a.v:b10): a burst round the user, a circle where it is aimed, a cone (60 degrees) or a line (1 yard wide). With none in the tag, a size named in the power's own text is used; with none there, the range band sets it: touch a 1-yard burst, reach 2, voice the voice range, sight a 5-yard circle. House rule: the books give few sizes.
Reverse: areaShape() in wodx-targeting target-rules.mjs; the area branch of attach() in main.mjs.

## B1301. The odds before a roll (2026-11-12)
Ben approved "Show the odds before a roll". The chances are worked out exactly from the same rules countSuccesses() rolls by (a specialty counts a 10 twice, Willpower adds a success and stops a botch). The resisting side's odds show to the Storyteller only. A client setting turns the line off.
Reverse: oddsPanel() in wodx-actions main.js; setting showOdds.

## B1302. Pinned and lately used actions (2026-11-12)
Ben approved "Pinned and recent actions": the last five actions and up to eight pinned ones are kept on the character (flags.wodx-actions.quick); right-click or Alt+P pins or unpins. A player who does not own the character sees their own recent list as before.
Reverse: quick rows in profile-menus.js menuFor and main.js menu().

## B1340. The after-action card and how far a fight's tale travels (2026-11-12)
Ben approved "An after-action card". When a started fight is ended, the Storyteller gets a whispered card: levels taken and dealt, blood, Willpower and other pools spent, Actions cards seen, and who outside the fight saw it (WoDX Actions' onlooker rules). House rule: a witness carries only their word before 1888, a snapshot camera is possible from 1888, a camcorder from 1985, a phone camera in most pockets from 2005, and in the Future Darkness everything is recorded. A breach is severity 2 when pictures are likely or five or more saw it. The button records the breach (the place may keep it) and starts a rumour, big at severity 2.
Reverse: setting afterAction off; aftermath.js and aftermath-rules.js in wodx-combat.

## B1320. Using the room in a fight: sizes (2026-11-12)
Ben approved "Use the room in a fight". Fire, falling and sunlight follow the books (fire V20 Dark Ages pp. 355-360; falling V20 core printed p. 296; sunlight VtDA20 p. 359). House readings: knocked-over candles or a torch start a torch-sized fire; an oil lamp or lantern breaks and its oil burns as a bonfire (lamp) or torch-sized (lantern), at a torch's heat.
Reverse: SPILL in wodx-interactables interact-rules.mjs.

## B1321. A falling chandelier (2026-11-12)
House rule: the falling dice for its drop (15 feet unless set) plus 4 for its weight, lethal; each success on Dexterity + Dodge at 7 takes a die away, as stepping carefully does on broken glass. Lit candles start a torch-sized fire.
Reverse: CHANDELIER_MASS, DROP_DODGE, dropDice in interact-rules.mjs.

## B1322. Sunlight let in through a window or curtain (2026-11-12)
By day only. A window or shutter thrown open, or a pane smashed, makes a WoDX: Sunlight region of direct sun 4 yards deep on the character's side; a curtain torn from a closed window gives indirect sun (through glass, soak 7) 4 yards round it. Closing the window removes the region. WoDX Actions' sun then burns any Cainite inside.
Reverse: SUN_YARDS and the letSun and tearCurtain cases in interact-rules.mjs; roomEffects() in main.mjs.

## B1323. Sprinklers (2026-11-12)
Fire sprinklers from 1874 (the first automatic sprinkler). Setting them off puts out every torch-sized fire and bonfire on the scene; an inferno burns on. Saving the tile's settings resets them.
Reverse: WATCHES.sprinkler and douses() in interact-rules.mjs.

## B1324. Electric light by era (2026-11-12)
A light switch offers nothing before 1880. Oil lamps, candles, torches and chandeliers are offered in every era.
Reverse: ELECTRIC_FROM in interact-rules.mjs.

## B1330. Colour-blind safe colours (2026-11-12)
Ben approved "Colours readable by everyone". A player setting in WoDX Senses swaps the sight rings to the Okabe and Ito palette with a thicker line, and every ring shows its words on the map (a second setting can hide them). The aura overlay of Read the Soul names its colour. V20's aura colours keep their names; only the drawing changes.
Reverse: settings colourSafe and ringWords; SAFE in sight-rules.mjs.
## B1400. Made things keep their quality in trade, Examine and use (2026-11-12)
A made thing's quality tag ("a sword (fine work)") no longer hides the good from price lookups. Traders buy and sell it at its quality price (x1.25 good, x1.5 fine, x2 masterwork). Examine reads the crafted quality and the maker's name unless the Storyteller's notes say otherwise. A fine or masterwork thing gives -1 difficulty on its Use checks.

Reverse: stripQuality in Storyteller money.mjs; withQuality in Actions trade-rules.js; withMade in Library examine-rules.mjs; extraDiff in use.mjs.

## B1401. The look (2026-11-12)
WoDX Library reads a character the way a stranger does: station 0 to 5 from the best worn dress (its value tier this era, a step for worn valuables of tier 4 or more), dress or shown gear out of its time, condition (blood, wounds, filth, wet, torn, a weapon drawn), Appearance, Status, sides shown by worn habits, uniforms and liveries, and a disguise. House rule throughout. Appearance, Status and Resources are V20's: Appearance p. 98 (pdf 106), first sight and bearing, dress included; Status p. 118 (pdf 126), standing among the Kindred, not mortal rank; Resources p. 116 (pdf 124), the means to dress well, not dress itself (book check 2026-11-12, /mnt/project-files/look/book-check.md). No book ties dress to station: that link is a house rule.

Reverse: look-rules.mjs and look.mjs; api.look in Library main.mjs.

## B1402. The look at a first meeting (2026-11-12)
Mortal NPCs: dress the era's gap above their station +1, below -1; strange dress -1; blood or wounds -1; filth or wet -1 with station 3 or more. All NPCs: Appearance 4 to 5 +1; fine work worn +1 with an NPC who has the craft. Mortals only: Appearance 0 -1 unless Monstrous (V20 Dark Ages p. 55, pdf 56: Appearance 0 fails first impressions except to intimidate; V20 p. 63, pdf 71). Supernatural NPCs: Status 3 or more +1 with their own kind. The look is held to 2 steps, traits to 2, the two together to 3 (Ben's pick). NPC station: worn dress, else Resources, else template, else 1.

Reverse: lookSeed and TEMPLATE_STATION in look-rules.mjs; seedFor in NPC attitude.mjs.

## B1403. How loudly dress speaks, by era (2026-11-12)
No sumptuary or dress-by-rank rule in V20 Dark Ages (book check 2026-11-12); these weights are a history-based house rule. Gap needed: 2 until 1913 (from 1800, a gap of 1 also counts with NPCs of station 4 or 5); 3 from 1914. Worn dress always shows; carried things show only when they can't be hidden (conceal N).

Reverse: ERA_WEIGHTS and seen in look-rules.mjs.

## B1404. Blood at later meetings (2026-11-12)
After a first meeting, blood or wounds lower a mortal NPC's attitude by 1 for that scene only. Nothing is stored. Kindred NPCs notice blood in talk tests, with no attitude step (Ben's pick).

Reverse: sceneStep in look-rules.mjs; withScene in attitude-rules.mjs.

## B1405. Pass as someone else (2026-11-12)
A disguise roll in With this person: Manipulation + Subterfuge (or Performance) against the NPC's Perception + Alertness, difficulty 6; the watcher must beat the disguise's successes. The result is kept per NPC on the character (flags wodx-actions.disguise). While it holds, that NPC reads the disguise's station and sides. A disguise is set on a worn item in its Examine notes (station and sides). House rule: neither core book has a mundane disguise roll (book check 2026-11-12). The nearest is Mask of a Thousand Faces, Manipulation + Performance (V20 p. 185, pdf 193), which is why Performance counts too.

Reverse: the disguise act and disguiseNpc preset in social-rules.js.

## B1406. Talk tests and notices on the look (2026-11-12)
New "Only when" tests: dressed fine/poor/even (against the NPC being dealt with), wears, station, out of time, bloody, disguised, seen through. Mortals' first remark can now be about blood, a disguise seen through, strange dress, or rich or poor dress, with three stock lines each.

Reverse: the look tests in when-rules.mjs; NOTICE_ORDER and NOTICE_TEST in talk-rules.mjs; NOTICE in stock-talk-more.mjs.

## B1407. Guards and worn sides (2026-11-12)
Blood on an intruder adds "blood on them" to the alarm and makes a challenge or a call for the watch likelier. A private place's allowed list may name a side (kind:church, livery, kind:watch); someone wearing it is not trespassing. A side worn openly shows to every NPC, whether or not it is the wearer's own. Added 2026-11-12 (NPC 0.43.0): a disguise that held with a keeper of the place (any NPC if none of the keepers has met it) counts its sides as worn there; one a keeper saw through adds "dressed as one of us" to the alarm, as the design asked.

Reverse: sit.bloody, sit.seenThrough and disguiseAt in routine-rules.mjs; wornPass and dz in routines.mjs; wornSides in rivalry.mjs; worn in knownSides.

## B1380. What an NPC can tell of a character (2026-11-12)
An NPC can tell what someone is only when it is plainly inhuman (a war form, Horrid Form, a spirit or wraith that shows itself, or the Storyteller's "obvious" tick), when one of its senses shows that line (Auspex 2 and up, Second Sight, Kenning; Garou scent, Sense Wyrm and mage Awareness by roll, as for rivalries), or when the Masquerade records list it as a witness who saw that character and was not made to forget. The same check now runs for player characters as for NPCs. A hunter NPC's "goes for the monster first" and "take them alive" use it, not the sheet's kind.

Reverse: canTell in wodx-npc/scripts/main.mjs back to supernatural(t.actor).

## B1381. Mortals noticing a tell (2026-11-12)
A mortal NPC's greeting remark on a character's oddness ("Your hands are like ice") needs the NPC to tell what the character is (B1380), or one success on Perception + Alertness at difficulty 7, seeded by the day so it stays the same all day. An NPC with no sheet numbers rolls three dice. Wounds and frenzy anyone sees. House rule.

Reverse: noticesTell in talk-rules.mjs returns true.

## B1382. Strangers in chat and the combat tracker (2026-11-12)
With "Faces you have met" on, each player's chat and combat tracker show the stranger's words in place of the name of any NPC on the scene or in the fight whose face that player has not met. Names of the player's own characters are never swapped. Sheets are not changed.

Reverse: remove the renderChatMessageHTML and renderCombatTracker hooks in faces.mjs.

## B1383. Creatures of another kind remember what they saw (2026-11-12)
When WoDX Actions reports that a creature of another kind saw someone for what they are (the "Seen by another kind" card), the active Storyteller's WoDX NPC keeps it on that witness (flags.wodx-npc.seenAs). From then on that NPC can tell what the other is (B1380). Mortal witnesses are already kept in the Masquerade records. Player characters are not marked. At most 200 sightings are kept per NPC. Missed Connections Desk item x9, first half; the fed-on vessel waits on Actions adding the vessel to the hunt hook.

Reverse: remove the wodxSecretSeen hook in wodx-npc rivalry.mjs.
## B1408. The stranger line (2026-11-12)
With Faces on, an unmet NPC's nameplate reads what a character can see before they meet: dress by station ("a well dressed stranger"), a side worn openly ("in livery"), blood or wounds, a weapon drawn, what their routine has them doing, and their manner toward the viewer's character as words ("wary of you"). Animals read as their kind. The Storyteller's own stranger text wins. House rule.

Reverse: autoStranger and the auto argument of nameFor in faces-rules.mjs; autoFor in faces.mjs.

## B1409. Look them over (2026-11-12)
A roll in With this person: Perception + Empathy (or Etiquette, or Awareness), difficulty 6. One success gives their mood and condition, two their station and trade, three who they belong with, four what they hide (a concealed weapon, or a disguise that doesn't fit). Only a mortal's trade shows. A botch misreads them. The result goes to the player and the Storyteller only. House rule.

Reverse: LOOKOVER and lookOverFacts in social-rules.js; lookOver in social.js.

## B1410. Ask around about them (2026-11-12)
Wits + Streetwise (or Charisma or Manipulation + Streetwise), difficulty 6, with a die for each dot of Contacts. One success: what people say of them; two: their name. Learning a name does not introduce the face: the Storyteller still does that from the token HUD. House rule.

Reverse: askFacts in social-rules.js.

## B1411. Players dress as someone else (2026-11-12)
Worn clothes have a Dress as someone else use: the player sets the station and sides it passes for, and puts it on. The Storyteller can still set one in the Examine notes.

Reverse: the dressas ability in use-rules.mjs; dressAs in use.mjs.

## B1384. A fed-on NPC remembers (2026-11-12)
When a Kindred feeds on a named NPC through WoDX Actions (drinking at least one point), the NPC keeps it (flags.wodx-npc.fedOn). A mortal vessel keeps a swoon and a lost hour, not who or what: the Kiss leaves little more (V20 core, the Kiss). One who fought it, a Kindred or ghoul vessel, or one already marked as knowing the Kindred saw what fed, and from then on can tell that one (B1380). A willing vessel learns nothing new. House reading. Missed Connections Desk x9, second half.

Reverse: remove the wodxFed hook in wodx-npc rivalry.mjs (Actions may keep sending it).

## B1385. One name lookup (2026-11-12)
WoDX NPC's api.nameFor(actor, viewer) answers what a viewer calls an NPC: the name for the Storyteller and when "Faces you have met" is off, else the stranger's words until one of the viewer's characters has met them. Chat and the combat tracker are masked per viewer at render (B1382), so cards keep the real name for the Storyteller; windows a player opens (With this person, Trade) ask nameFor. Missed Connections Desk x1.

Reverse: viewName in wodx-actions social.js back to nameFor.

## B1600. Before the First Night lives in WoDX Creation (2026-11-12)
The guided start for player characters is a hub inside WoDX Creation (first-night.mjs, first-night-rules.mjs), with buttons on the character sheet header, the Creation window and the Chronicle Clock, and the Storyteller's setup wizard opens it when done. No new module. Chronicle Start Desk items c1 to c6, approved by Ben 2026-11-12 04:46Z.

Reverse: remove first-night*.mjs and their lines in main.mjs, apps.mjs, clock-app.mjs and setup.mjs.

## B1601. Steps, approval and sign-off (2026-11-12)
Ten steps in any order, sign-off last; the lifepath is optional. A player marks a step done through the approval queue (type wodx-first-night-step); the Storyteller ticks or unticks directly. Concept, lifepath, build (the creation check matches the book's totals) and Merits and Flaws tick themselves from the sheet. Kept on flags.wodx-creation.firstNight, and carried through a change of state with the lifepath.

Reverse: STEPS and autoDone in first-night-rules.mjs.

## B1602. Flaw cap (2026-11-12)
Flaw points are counted against V20's cap of 7 freebies; over the cap the step stays open. Each flaw shows a one-line cost from the trait effect tables while building.

Reverse: FLAW_CAP in first-night-rules.mjs.

## B1603. The trouble forecast (2026-11-12)
Read from the systems WoDX has: trait effect tables (PULLS, LEDGER, PROMPTS, TRIGGERS, BG_WORLD), the splat feature row (even when that line's features are off), Generation 14 or more (thin blood) and 8 or less (envied blood, Storyteller only), Humanity or Road 4 or less, lifepath people whose role reads as hostile, flaws kept from the lifepath but not bought, faction standing below 0, rivalries at Hostile or worse toward the character's sides, dated events for the line up to five years ahead or the first year of the next era, no language shared with the troupe, and gear out of its time. A secret's clock, envied blood and coming events are for the Storyteller only; the rest the player sees. House rule.

Reverse: forecast in first-night-rules.mjs.

## B1604. The trouble dial and the story hook (2026-11-12)
Each character's dial (Quiet 0.5, Normal 1, Often 1.5) scales the chance that their own flaws turn up in WoDX Storyteller's night draw (capped at 0.9). One story hook per character; once the Storyteller agrees (approval type wodx-first-night-hook), a reminder comes after four ended sessions if it has not been marked as brought in. House rules after Hero System's frequency and Ars Magica's story flaws.

Reverse: DIAL and HOOK_SESSIONS in first-night-rules.mjs; dialOf in Storyteller night.mjs.

## B1605. Seed cards at sign-off (2026-11-12)
Sign-off posts the forecast (the player's view to the owners, all of it to the Storyteller) and one Storyteller card per seed: a living enemy from the lifepath made as an NPC at Hostile, the flaws' Ledger entries (one card), the Backgrounds made real (one card), a Ledger consequence dated to each coming event, and a starting faction standing. Make it, Skip, and Undo once made (Undo removes what the card made).

Reverse: first-night-seed.mjs.

## B1606. Starting faction standing (2026-11-12)
A faction whose name carries one of the character's own sides starts at Tolerated, one step more per two dots of Status, up to Honoured; one named for a side that hates the character's kind starts at Distrusted, or Hostile when the enmity hunts on sight. Standing already set is left alone. House rule.

Reverse: suggestStanding in first-night-rules.mjs.

## B1610. The guided builder (2026-11-12)
Creation 0.13.0's Build window sets Attributes (1 to 5), Abilities (0 to 5) and the Virtues in use (1 to 5) on the sheet and shows the creation check's count live, for every line with creation totals. Backgrounds, powers, Merits and Flaws are added on the sheet and counted. Chronicle Start Desk b1.

Reverse: first-night-build.mjs, first-night-build-rules.mjs.

## B1611. The prelude runner (2026-11-12)
Scenes: the lifepath's life-before scenes, then the line's Before, The turn and After from WoDX Storyteller's templates; a short prelude keeps the turn and after. A roll with stakes is the Storyteller's pool against a difficulty (6 by default), ones cancel (V20); on no successes the stake is paid. House rule.

Reverse: buildScenes, STAKES in first-night-prelude-rules.mjs.

## B1612. What a prelude may change (2026-11-12)
Flaws earned in play are added at 0 points, so they give no freebies and do not count against the cap: Enemy (with a Hostile NPC), Dark Secret, Nightmares, Hunted. Gains: up to 3 freebie points, priced by the book's costs (an Ability, a Background or Willpower dot). Each change has Undo in the runner's log. House rule until the book check finds V20's own advice. Desk p3.

Reverse: PRELUDE_BUDGET, REWARDS in first-night-prelude-rules.mjs.

## B1613. Troupe ties (2026-11-12)
Six questions in any era's words; each character asks about the next in a ring of the player characters by name. Answers go on the Group actor (flags.wodx-creation.ties) and tick the ties step; a player's answer reaches the Storyteller by socket. How they met makes an observer journal of the answers. Desk t1.

Reverse: TIE_QUESTIONS, ring; sendTies, saveTie in first-night-prelude.mjs.

## B1614. Late joiners (2026-11-12)
Once any character in the world is signed off, a new character's hub says the chronicle is under way, and the prelude runner starts in short mode. The forecast reads the current year as for everyone. Desk t2.

Reverse: underWay in first-night-prelude-rules.mjs.
## B2100. NPC voices: the engine (2026-11-12)
Ben picked the recommendations on the NPC Voices Desk (12 November 2026). NPCs are voiced by a new module, WoDX Voices. The engine is Kokoro (Apache 2.0 model, run in the Storyteller's browser, no network), rendered once and played to the people who see the line; the browser's own speech is the fallback and is the whole of the first build. Cloud services are not used.

Reverse: turn off the Voices world setting, or disable wodx-voices.

## B2101. Who hears a line (2026-11-12)
Whoever sees the talk card hears it: a whispered answer only its recipients, a line said aloud everyone. The Storyteller hears every line unless the world setting says otherwise. Each player has a volume and a mute.

Reverse: shouldSpeak in modules/wodx-voices/scripts/voice-rules.mjs.

## B2102. What is spoken (2026-11-12)
Talk answers, greetings and farewells (WoDX NPC talk cards). Barks and cries stay silent in the first build; a setting to voice them comes with the Kokoro build.

Reverse: onTalkCard in modules/wodx-voices/scripts/main.mjs.

## B2103. A voice per NPC (2026-11-12)
Each NPC keeps one voice, worked out from its seed (the actor id; each unlinked token has its own), its sex only when the Storyteller or the people generator recorded it, its age when given (60 and over speaks slower and lower), and its WoDX NPC Voice (noble, clergy, street and the rest, small shifts in speed and pitch). With no sex known the voice is picked by seed from every voice, so nothing is assumed. The Storyteller's choice in flags.wodx-voices.override wins. Voices on the computer come before network voices. English voices only for now; Czech and German come later for lines in those languages.

Reverse: profileFor and pickVoice in voice-rules.mjs.

## B2104. The supernatural in the voice (2026-11-12)
Only when it shows: forms, powers in use, wraiths, a demon's true voice. Laid over the rendered sound in the effects build; the browser's own speech can't carry effects.

Reverse: not built yet.

## B2105. Build order (2026-11-12)
Three PRs: (1) this one, the browser speech fallback, voice profiles and the talk-card hook; (2) Kokoro, a cache in a Data folder outside every world (size cap, Clear button) and playback from the token; (3) the effects and the Storyteller's voice picker with Preview. Priority 2, after the talk generator's first PR. On in the testbed, off on Live until Ben says.

Reverse: n/a.

## B1960. Game time: one world clock for every scene (2026-11-12)
Ben approved every recommendation on the Game Time Desk. Foundry's one world time stays the only clock; scenes get no clocks of their own. Every timed part of WoDX (about thirty) reads it, and separate clocks would make dated events, eras and routines disagree between maps. Groups that are apart use personal time instead (B1961).

Reverse: nothing to undo; per-scene clocks were not built.

## B1961. Work done apart goes on the character's own time (2026-11-12)
WoDX Storyteller 0.40.0, api.time.spend. The main group is the scene holding more than half of the player characters present tonight (players marked away are left out). A long roll, an interaction, a fight or a journey by characters who share a scene that is not the main group's, while someone else is elsewhere, moves their personal time instead of the world clock. With no main group (a party split two and two) every half is apart. Convene lines them up as before. World setting timeApart, on.

Reverse: set timeApart off; everything moves the world clock.

## B1962. A player's long roll asks for its time (2026-11-12)
Move the clock on an extended roll, a Garou meditation or rite, a Hunter's prayer, Kindred downtime and Wraith mending works for players: the player's client sends the seconds to the Storyteller's client by socket, which makes a "Time for a long action" proposal itself (B12 still holds: players send no typed proposals). Approving spends it under B1961 and tells the player. Capped at 90 days a request.

Reverse: spendTime in wodx-actions spend-time.js back to the GM-only game.time.advance.

## B1963. The Time row on the Clock (2026-11-12)
The Storyteller's Chronicle Clock lists each player character's own time against the clock (with the clock, so long ahead, so long behind) and the scene they are on, with a Convene button. Drawn by WoDX Storyteller (api.time.clockRow) when it is on.

Reverse: drop the clockRow call in clock-app.mjs.

## B1964. Otherworld journeys let their time pass (2026-11-12)
The approved journey card says how much time passes outside and, on the Storyteller's copy, has "Let the journey's time pass", which spends it once for the travellers under B1961. The journey itself never moves the clock on its own.

Reverse: drop the button in journey.mjs approveJourney.

## B1965. Realms where time runs differently (2026-11-12)
Otherworlds journey-rules REALM_TIME: the Tempest, the Labyrinth, the Umbral roads and Moon Paths keep the world's time; a Moon Bridge takes a thousandth (W20 pdf 209 / p. 207); a trod slips (C20 pdf 53 / p. 52, house figures). After the book check (Otherworlds 0.15.1): the Labyrinth is the Storyteller's call (WR20 pdf 307); the Far Dreaming and Arcadia are the Storyteller's call, time running at random against the world (C20 pdf 53, W20 pdf 331); the Deep Umbra is the Storyteller's call, with no M20 or W20 rate (the Computer Web runs faster than the CyberRealm, W20 pdf 332; Horizon's double speed in 1456, Horizon pdf 43, was a spell, not the realm). The trod slip stays a house figure: C20 pdf 53 gives no table. The Shadowlands and the Tempest keep the world's time as a house rule, since WR20 gives no rate. A Storyteller's-call realm keeps the plain clock and the card says so.

Reverse: remove REALM_TIME and timeOutside.

## B1966. A fight takes time when it ends (2026-11-12)
WoDX Combat 3.18.0. Foundry adds no seconds for a round unless a system sets it, and none did, so fights took no time. When a started fight is ended, the time moves once by its turns times the world setting turnSeconds (3 seconds, the books' own figure: V20 pdf 262 and 277, V20 Dark Ages pdf 344, W20 pdf 241 and 290; V20 lets a slow scene stretch a turn up to 3 minutes, so a Storyteller can raise it, up to 60 here; 0 turns it off): the clock, or the fighters' own time when they are apart. One step at the end wakes the timed parts once instead of every round. The after-action card names the length.

Reverse: set turnSeconds to 0.

## B1967. The clock that runs with the table (2026-11-12)
WoDX Chronicle 0.39.0, off by default. World settings paceMinutes (game minutes a step, 0 off) and paceEvery (real minutes, 10). The Storyteller's client checks every 30 seconds; it waits while the game is paused, during a fight, while the world is held or a skip runs, and when no player is connected. Moving the clock by hand starts the count again. The same for every scene.

Reverse: leave paceMinutes at 0.

## B1968. Off-screen NPCs settle when their scene opens (2026-11-12)
Kept as built: NPCs on scenes nobody is viewing are placed by their routine when the scene opens. The result is the same as moving them all the time, at no cost while nobody watches.

Reverse: nothing to undo.

## B1969. A scene's own place for the sun (2026-11-12)
WoDX Chronicle 0.39.0: scene flag wodx-chronicle.place {latitude, offset in hours from home}, set from the Clock's "The sun on this scene". Sunlight (WoDX Actions), the sky (WoDX Atmosphere) and day and night for the senses (WoDX Senses) read it for the scene being viewed; the Clock shows the scene's hour, sunrise and sunset under home time. The world clock, the Clock's dusk and dawn buttons, routines, healing and every timed rule keep home time. Before standard time zones the offset is the sun-time difference, rounded to the half hour.

Reverse: unset the scene flags; describeAt falls back to the chronicle latitude.

## B1970. The guides say how time passes (2026-11-12)
The Storyteller guide's clock section now covers personal time, Convene, time apart, fights, journeys, a scene's own place and the table's clock.

Reverse: nothing to undo.
## B1700. The Legends book (2026-11-12)
Ben approved the Improvement Desk item "A Legends book for this chronicle" as described. WoDX Chronicle 0.40.0 keeps a book of what has really happened, in the world setting wodx-chronicle.legends, written from records WoDX already keeps and never changing them: dated events that fired, deaths on actors' chronologies and in Creation's archive, Embraces and ghoulings with the sire or domitor, seats in WoDX NPC courts won and lost, havens and holdings (WoDX Storyteller owner records, and the older NPC place tags) that changed hands, and boons, oaths and debts the Ledger marked kept or broken. Rules in legends-rules.mjs.
Players see a new line of each kind as follows (a house rule, line by line in the window): dated events, deaths, seats, holdings and boons are shown; Embraces, ghoulings, oaths and debts, and the seats of a secret faction, wait for the Storyteller. Lines dated after today's date are the Storyteller's only.
Reverse: SHOWN_BY_DEFAULT in legends-rules.mjs.
## B1701. When the book is written (2026-11-12)
The book is brought up to date when a session ends in WoDX Storyteller (its session setting changes), just before each time skip moves the clock and again when it ends, the first time the world loads, and when the Storyteller presses Bring it up to date. Seats and holdings have no history of their own, so each build compares them with the last build and dates a change to the day of the build; the first build records who holds each seat and place "when this book began", dated by the owner record's own year where it has one.
Reverse: the hooks in Chronicle main.mjs (updateSetting, wodxSkipStart, wodxSkipEnd, ready).
## B1702. The book across the eras (2026-11-12)
One chapter (journal page) per century that has lines, oldest first, from 1197 to the World of Future Darkness, dated on the Chronicle Clock's calendar. Setting the clock back takes a dated event out again, as the dated events do; other lines stay but count as after today's date, so players stop seeing them until the clock passes them again. The book keeps 5000 lines, dropping the oldest.
Reverse: LEGENDS_CAP and merge() in legends-rules.mjs.
## B1710. Progress clocks (2026-11-12)
Ben approved the Improvement Desk item "Progress clocks" as described. WoDX Storyteller 0.41.0 shows long work and slow threats as segmented clocks (after Blades in the Dark). Clocks read from records WoDX keeps: long tasks (successes of the goal), heat on a hunting ground (of 10), ties that need tending (shown once half the time has gone), Ledger objectives (steps done) and open Ledger entries with a due date (time gone between made and due). The Storyteller makes clocks of their own (4, 6, 8, 10 or 12 segments) for a faction's plan or a hunter closing in. Rules in clock-rules.mjs; stored in the world setting wodx-storyteller.clocks.
Reverse: remove the Clocks tool and the dashboard section.
## B1711. Who sees a clock (2026-11-12)
Every clock starts as the Storyteller's only. The Storyteller shows a clock to everyone or to the players of chosen characters, read clocks included. A house rule.
Reverse: normClock's shown default in clock-rules.mjs.
## B1712. Clocks that fill by themselves (2026-11-12)
An own clock can fill by hand only (the default), one segment each faction turn, one each session's end, or one each full week of game time (counted from when the setting is chosen; setting the clock back starts the count again). When a clock fills, the Storyteller gets a whispered card; what happens is theirs to decide.
Reverse: TICKS and tickAll in clock-rules.mjs.
## B1713. A fight goes in the Storyteller's log (2026-11-12)
When WoDX Combat starts a fight (wodxFightStarted), the Storyteller's log gets a note "A fight began on <scene>." It feeds the pacing note and the session report.
Reverse: the wodxFightStarted listener in night.mjs registerNight.
## B1714. The pacing note on the night's draw (2026-11-12)
Ben chose the lighter version of the pacing dial: a note for the Storyteller only, on the night's draw window and its queue entry, that never changes what the draw picks. It reads the last seven nights of the log (a night runs noon to noon): a night is hard when it had a fight, a frenzy, a death or torpor, a Masquerade breach, Diablerie or a road encounter. The note says, first that matches: three or more hard nights of the last four; a hard night just past; three or more quiet nights in a row. Rules in pacing-rules.mjs.
Reverse: pacingNow in night.mjs.
## B1720. Standing with the spirit courts (2026-11-12)
Ben approved the Improvement Desk item "Standing with the spirit courts" as described. WoDX Otherworlds 0.16.0 keeps, on each character who deals with spirits (Garou and the other Changing Breeds, Kinfolk, mages, mortal shamans), a standing from -5 to +5 with seven courts: Bird, Beast, Elementals, Wyld, Weaver, Wyrm and the character's totem. The books give chiminage, Bans and spirits who remember; the number is a house rule. Stored on flags.wodx-otherworlds.spirits; rules in spirit-rules.mjs.
Reverse: remove the Spirits tool; the flag can stay.
## B1721. What moves standing (2026-11-12)
House rule: chiminage paid +1 with the spirit's court; chiminage owed and not paid -2; a Bane destroyed +1 with the Wyld and the totem and -1 with the Wyrm; a spirit bound or slain against its will -2 with its court; the totem's Ban kept through a hard test +1; the Ban broken -3; a favour +1 and a slight -1 with a chosen court; or the Storyteller moves a court by hand. WoDX Actions' Chiminage, when the Storyteller records a debt paid with a court picked, moves it by itself.
Reverse: MOVES in spirit-rules.mjs.
## B1722. What standing does (2026-11-12)
House rule: +3 or more is -1 difficulty to summon a spirit of the court, to be taught a Gift by one, or to bind one into a fetish or talen; +5 is -2. -3 or less is +1 difficulty, -5 is +2 and the court may refuse outright. WoDX Actions applies it to Summon a spirit and Perform a rite when a court is picked, and shows the standing when learning a Gift.
Reverse: effect() in spirit-rules.mjs; courtField in Actions garou.js.
## B1723. What players see of standing (2026-11-12)
Players see their own characters' standing in words (honoured, well regarded, known kindly, unknown, mistrusted, resented, scorned), not the number or what moved it.
Reverse: spiritsDialog in Otherworlds spirits.mjs.
## B1724. The courts across the eras (2026-11-12)
The Storyteller's window gives a house note for the era from the clock's year: the Weaver's spirits gather where people build before 1800, spread with mills, rail and wire after, and take the Net from 1990; the Wyrm's feed on war and plague, then on industry; the Wyld's draw back from the cities. In the World of Future Darkness the courts of the machines and the Net are the Storyteller's to name, kept under Weaver spirits.
Reverse: eraNotes in spirit-rules.mjs.
## B1800. One tie for followers (2026-11-12)
An NPC serves every character named by any of four ties: flags.wodx-npc.serves, flags.wodx-chronicle.bound.actor (a background made real), flags.wodx-creation.lineage.domitor (a ghoul, {id, name}) and flags.wodx-creation.ally.patron. Each tie stays with the module that keeps it; the orders tool reads all four.

Reverse: servesFrom in wodx-npc/scripts/order-rules.mjs.

## B1801. Hard orders WoDX spots (2026-11-12)
Any order but Wait given while a fight is on the scene, and a Go-to order toward a hostile token or one plainly not human, counts as hard even unticked, and goes to the approval queue with the reasons.

Reverse: hardReasons in order-rules.mjs.

## B1802. The suggested refusal roll (2026-11-12, house rule)
A ghoul blood bound to the leader obeys; only an order that means near-certain death lets it try to refuse, Willpower difficulty 8. Anyone else refuses on any success of Willpower at 6, plus its attitude step toward the leader and its bond stage, held to 4-9. The Storyteller still decides.

Reverse: loyaltyCheck in order-rules.mjs; loyaltyFor in orders.mjs.

## B1803. Sentries (2026-11-12)
A follower on Keep watch or Guard rolls to notice anyone who moves on the scene who is not a player's character, a passer-by or a follower of the same master, at most once every 30 seconds for each pair, with the reaction regions' sight range, walls and notice roll. Watch whispers a warning to the master's players and the Storyteller. Guard, within 10 yards, steps beside the stranger and challenges them; farther off it warns.

Reverse: sentryAct, isIntruder, GUARD_YARDS in order-rules.mjs; sentries in orders.mjs; noticeBy in routines.mjs.

## B1804. Orders in a fight (2026-11-12)
Two new orders, Attack the one I point at and Hold back. The fight AI lays the standing order over its choices: +5 on striking the ordered target; Hold back takes 6 off every blow and adds a full defence; Guard and Wait take 2 off running. Fear, frenzy and Rötschreck still win. Every follower also counts its masters (B1800) as a ghoul counts its domitor when choosing whom to strike. Attack is a hard order outside a fight or against something plainly not human; the other orders in a fight are not hard (B1801 narrowed to sending a follower across a fight).

Reverse: fightShift in order-rules.mjs; masters and OR.fightShift in main.mjs readFight and planTurn.

## B1810. Errands (2026-11-12, house rule)
A new order, Go and do this, sends a follower on one of six errands (buy, carry a message, find, ask around, bring someone to feed on, watch a rival). It leaves the scene (its tokens hidden) and works the errand as a long task on its own sheet: the named Attribute and the first of the named Abilities its sheet carries, difficulty 6, 2 to 4 successes, by the hour (watching a rival: by the day). When the task ends the follower comes back and a card tells its master's players and the Storyteller how it went. Calling it back drops the task.

Reverse: ERRANDS, errandTask, errandResult in wodx-npc/scripts/order-rules.mjs; startErrand, endErrand, onTaskDone in orders.mjs; the wodxTaskDone hook in wodx-storyteller/scripts/tasks.mjs.

## B1811. Helpers on long tasks (2026-11-12, house rule)
Help me with a long task adds the follower to one open long task of its master's. Each helper adds its own dots in the task's Ability, at least one die, as workers do. V20 teamwork pools successes instead; dice keep one roll per interval.

Reverse: helperDice and helpers in wodx-storyteller/scripts/tasks-rules.mjs; poolFor in tasks.mjs; setHelper in orders.mjs.

## B1812. Shopping with the master's purse (2026-11-12)
A buying errand carries a price in the smallest coin. When the errand ends, done or botched, the price comes from the master's purse through WoDX Storyteller's money; a purse that cannot pay means nothing was bought.

Reverse: onTaskDone in orders.mjs.

## B1813. Witnesses and breaches (2026-11-12)
Deal with that witness rolls the follower's Manipulation + Subterfuge at 6 on the targeted witness: a success marks them talked round in the Masquerade records, a botch marks that they told others. A breach recorded against a follower posts a card to the Storyteller naming its masters, for their standing; nothing changes on its own.

Reverse: cleanupOutcome in order-rules.mjs; doCleanup and onBreach in orders.mjs.

## B1814. Chases (2026-11-12)
When a chase starts, a follower on Follow whose master is a pursuer, and one told to Cut them off the quarry, join as pursuers, level with the slowest pursuer still in it.

Reverse: joinChase in wodx-interactables/scripts/chase-rules.mjs; join in chase.mjs; onChase in orders.mjs.

## B1815. Spying for politics (2026-11-12)
Watching a rival is an errand (B1810): on success the Storyteller tells the master the rival's comings and goings and what it plans at the next faction turn. Followers hold no seat or office.

Reverse: ERRANDS.spy in order-rules.mjs.

## B1816. Loyalty drift (2026-11-12, house rule)
A follower's attitude toward its master moves one step through WoDX NPC's attitude track: up when a ghoul drinks from its domitor, down for each month a ghoul goes without, when its master feeds on it, and when it is made to carry out a hard order. Drift never takes it below Distrusted, so it never starts a fight; at Distrusted the Storyteller is told it may refuse, leave or turn.

Reverse: drift in order-rules.mjs; driftFor in orders.mjs; the wodxGhoulFix hook in wodx-chronicle/scripts/signatures.mjs; WoDX Actions' wodxFed hook (by, vessel).

## B1820. One Followers window per character (2026-11-12, improvement desk fo1)
WoDX NPC 0.41.0 lists everyone who serves a character in one window, opened from the Relationships tab's Followers button, the token tools (the people icon) or api.openFollowers(actor). A follower is any NPC that serves the character through one of the four ties order-rules.servesFrom reads (B1800). Each row gives its kind (Ghoul from the domitor tie; Retainer, Ally, Herd, Contact or Mentor from the Background made real; Ally from a Creation ally; else Follower), where it is (here, another scene, away on an errand, not on any map), its order, its loyalty with the last change and the reason from the attitude log, the blood bond step (V20's three drinks) and open trouble. Players see their own characters' followers only, and only those they are allowed to see in Foundry.

Reverse: drop followers.mjs and followers-rules.mjs from wodx-npc, the wodxFollowers token tool and openFollowers in main.mjs, and the tie-followers button in wodx-sheets extras.

## B1821. Orders from the Followers window (2026-11-12)
A follower on the scene being viewed gets buttons for the everyday orders (Follow, Wait, Guard, Keep watch, Hold back, No order) and "Give an order…", which opens the full order window with that follower and master picked. The buttons go through the same path as the order window (orders.send: carried out on the active Storyteller's client, else by socket), so a hard order still waits in the approval queue. Followers elsewhere get no buttons, since an order needs the token on the map.

Reverse: quickFor in followers-rules.mjs returns [] always.

## B1822. What counts as trouble on a follower's row (2026-11-12)
Dealing with a witness, set to cut someone off or attack, under a hard order, wavering in its loyalty (at Distrusted, the floor of loyalty drift, B1816), and a description of it going round (B1823). The reason for the last loyalty change is shown to the player whose character it serves: loyalty drift writes reasons from the player's own acts (kept fed, a hard order). A Storyteller's own reason typed into the attitude log shows too.

Reverse: troubles and lastText in followers-rules.mjs; hide r.last for players in followers.mjs.

## B1823. A description that spreads and fades (2026-11-12, house rule, improvement desk cw1)
When WoDX Actions records a breach with witnesses, when WoDX Interactables reports a theft, break-in, fire, desecration or fight that someone on the map sees (WoDX NPC's noticing roll), or when a fight ends with foes alive or onlookers who see a player character, WoDX NPC 0.41.0 writes a description of the culprit (a player character, or an NPC who serves one) from WoDX Library's look. A second sighting of the same culprit at the same place within ten minutes of world time freshens the same description. The Storyteller gets a card with the words, Drop it, and the Descriptions abroad list (token tools, the question-mark figure). Players never see a description. World setting "Descriptions that spread" (on by default) turns it off. V20 has no rules for this.

Reverse: world setting culpritDescriptions off, or drop wanted.mjs and wanted-rules.mjs.

## B1824. How word gets round, by year (2026-11-12, house figures)
1197-1499 the hue and cry and the town crier (the rest of town in 24 hours, forgotten in 14 days); 1500-1849 a printed notice and the constable's word (48 hours, 30 days); 1850-1979 a police sketch and the telegraph wire (12 hours, 60 days); 1980-1999 a police sketch on the evening news (6 hours, 90 days); 2000-2022 camera footage and phone photos (3 hours, 180 days); from 2023, the World of Future Darkness, cameras and face matching (1 hour, 365 days). The place where it happened hears at once, and the place's Alert zones carry it on by bell, telephone, radio or runner, as they carry the alarm (NPC 0.23.0). Word stops at the Shroud and the Gauntlet: an Umbral or Underworld map (wodx-otherworlds layer other than physical) hears only what a carrier takes there.

Reverse: MEANS in wanted-rules.mjs.

## B1825. When a description still matches (2026-11-12, house rule)
Strong when the clothes, uniform and station still fit; none once the culprit has changed clothes, put on a disguise, or a disguise roll held against that NPC. Size (from the token: big, huge, small) and a face people remember, an ugly face or a monstrous one still give a partial match through new clothes. From 2000 photographs keep the face, so new clothes only make it partial; from 2023 face matching keeps the face whatever the clothes, and a held disguise only makes it partial. V20 sheets have no height, so the token's size stands in.

Reverse: matchOf in wanted-rules.mjs; marksOf and sizeOf in wodx-library look-rules.mjs.

## B1826. Who tests a description, and the roll (2026-11-12, house rule)
When a player character moves where word has reached, NPCs there who see them (the noticing roll) test it: the watch, soldiers, sheriffs, hunters, inquisitors, Technocrats, ghouls, ordinary townsfolk and passers-by, never animals, spirits or the culprit's own followers, at most four a move and once a minute for each pair. The Storyteller gets a card: the match, its reason, and a roll of Perception + Alertness at difficulty 6 for a strong match or 8 for a partial one, 1 harder once the description is half forgotten, with a button to raise the alarm at that place. Nothing happens by itself.

Reverse: TESTERS and recogniseRoll in wanted-rules.mjs; test in wanted.mjs.

## B1827. Whether witnesses know the culprit's name (2026-11-12)
A description carries the culprit's name when any witness has already met them (WoDX NPC's attitude: met). Otherwise the card says "someone", and only the Storyteller sees who it was.

Reverse: namedBy in wanted.mjs.

## B2200. Battles and sieges as two abstract forces (2026-11-12, house rule)
The Master Plan item "Battles and sieges" (Lines and eras that meet, priority 3) is built in WoDX Storyteller 0.43.0 as a Storyteller tool, "Battles and sieges" in the Storyteller's hand (api.battles). A battle is fought between two forces, not token by token: each has a name, a faction (optional), men, a quality (1 levies to 5 the best of the age), the supernatural in its ranks (0 to 5), where it stands, and a commander (a sheet, or a name and a pool). Players see a card in words each step; the Storyteller's card has the dice. Every step has an Undo. The book search (12 November 2026, /mnt/project-files/battle-book-check.md) found war rules only in two Dark Ages: Vampire books, Spoils of War (pp. 40-45 printed, pdf = printed + 1) and the Dark Ages Companion (pp. 42-48 printed, pdf = printed - 25); no V20 book has them. Their rolls are used where they fit (B2202 to B2205); the forces' weight, resolve, the breach clock and the ages after 1500 are house rules. Spoils of War's full Right of Command army (Centre, Wings and Reserve, units by type) is not built: its troop table is garbled in the scan and needs reading from the book.

Reverse: remove the hand tool and the battles api in wodx-storyteller/scripts/main.mjs.

## B2201. The ages of war (2026-11-12, house rule)
How war is fought follows the year: knights, levies and crossbows (1197-1418); wagon forts, handguns and the first cannon (1419-1499, the Hussite wars that open in Bohemia and Moravia); pike and shot (1500-1649); the musket line and the star fort (1650-1789); columns, cannon and cavalry (1790-1859); rifles, rail and the telegraph (1860-1913); trenches, machine guns and gas (1914-1918); tanks, aircraft and radio (1919-1945); helicopters, rockets and the bomb (1946-1999); drones, satellites and the network (2000 on); on the Future Darkness branch from 2026, powered armour, swarms and orbital eyes. Each age sets how long a phase takes (an hour in 1197, a day in the trenches), the share of men who fall, whether guns can breach walls, and the dice the battle throws at a character in the thick of it (4 to 8). Bastion forts exist from 1530 and concrete bunkers from 1914.

Reverse: AGES and POSITIONS in wodx-storyteller/scripts/battle-rules.mjs.

## B2202. Weight, difficulty and resolve (2026-11-12, house rule)
A side's weight is its size step (one for each tenfold: up to 10, 100, 1,000, 10,000, 100,000, more) plus its quality, the supernatural in its ranks and, for the defender, its position (high ground or field works 1, a walled town 2, a castle, bastion fort or bunker 3). Old stone walls count one less once guns can breach them, and half once breached. Each phase both commanders roll Perception + Leadership at difficulty 6 (Spoils of War p. 44), and the heavier side adds a die for each point it outweighs the other (a house stand-in for the book's troop dice). A commander from a sheet brings four pools: Perception + Leadership to direct, Charisma + Leadership for morale, Intelligence + Leadership for siege works, Wits + Medicine against disease; one without a sheet has numbers. Resolve, the house rule for when a side breaks, starts at 3 + quality, plus 1 or 2 for a defender behind works or walls.

Reverse: weightOf, difficultyFor, phaseSetup, startResolve in battle-rules.mjs; commandPools in battles.mjs.

## B2203. A phase and its losses (2026-11-12, house rule)
The side with more successes, deeds included, takes the difference from the other's resolve and counts that many units lost. A botch hands the other side 2 net successes (Spoils of War p. 44). Wavering (p. 45): a side that loses by 3 or more rolls its commander's Charisma + Leadership at difficulty equal to the loss (3 to 10); a failure costs it 2 dice next phase and a botch breaks it. A character who kills more than 10 in a phase shakes the enemy the same way at 6 (p. 44). Demoralised (p. 45): each unit lost past the commander's Charisma + Leadership costs a die. The losing side loses its age's share of its men for each net success (at least one man), the winner a third of that; an even phase costs both half a share. A side at 0 resolve breaks (a rout); both at 0 leave the field to the dead. A side may draw off in good order and lose a tenth of its men to the pursuit; the Storyteller may stop the fighting with no winner (night, a truce, a storm).

Reverse: settlePhase, withdraw, stalemate in battle-rules.mjs.

## B2204. Sieges by the week (2026-11-12, house rule)
A siege is rolled once a week: the besieging commander's Intelligence + Leadership (the Spoils of War p. 41 roll for mines and siege engines) at 6 plus the walls' bonus (one less with a strong supernatural force, 3 or more), plus the camp's disease, from 3 to 10. Each success fills a segment of the breach (8 segments, mirrored on a progress clock named after the walls; a house rule); guns fill two. Disease (p. 41): each side rolls Wits + Medicine each week at its men / 1,000 (4 to 10); a failure adds 1 to the difficulty of its army rolls, a success as big as the penalty takes 1 off, and at 3 or more a side loses a point of resolve that week (a house rule). The garrison eats a week of its stores; once they are gone, hunger costs it a point of resolve a week. Maintaining order and foraging (p. 40), sapping and countermining in yards (pp. 41-42), and naval battle (pp. 42-43) are not built yet. A garrison at 0 gives up the walls; besiegers at 0 lift the siege. Storm the walls turns the siege into a field battle with the walls at half (when the breach is full, the walls are open).

Reverse: siegeSetup, settleWeek, assault, clockFor in battle-rules.mjs.

## B2205. The characters in a battle (2026-11-12, house rule)
Characters join a side in the thick of it, at the rear or in command. Their deeds are any roll the Storyteller asks for (cutting down the standard bearer, a Discipline on the enemy captain, a Gift on the guns); the successes go into the Deeds box for that phase, count for their side, and take that many foes out of the fight (Dark Ages Companion p. 45; a Discipline counts twice its dots, entered by the Storyteller). "The battle turns on" a character is the counterattack (pp. 46-47): 5 dice at 6 in the Dark Ages (6 from 1500, 7 from 1860, 8 from 1914, 9 from 2000, house rules), 2 more if they drew attention, 2 fewer at the rear or in command; double the successes is the damage, not dodged, aggravated every third phase, soaked through WoDX Combat with its Undo; five successes stake a Cainite (others just take the damage, Spoils of War p. 44). Nothing is thrown by itself.

Reverse: hazardFor in battle-rules.mjs; hazard in battles.mjs.

## B2206. Factions after a battle (2026-11-12, house rule)
When a battle ends and a side names a WoDX NPC faction, WoDX NPC 0.39.0 puts a proposal in the approval queue (never applied by itself): the winner gains a dot of Status; the loser thinks one step worse of the winner, loses a dot of Retainers when it has any (not when it drew off or lifted a siege) and a dot of Status when it broke or surrendered. A battle with no winner costs both sides a step of standing toward each other. Faction mode Off turns it off.

Reverse: battleChanges in wodx-npc/scripts/faction-rules.mjs; onBattle in factions.mjs.

## B2207. Battles in the Legends book (2026-11-12)
WoDX Chronicle 0.42.0's Legends book has a new kind, Battles and sieges, shown to players by default, with a line for each battle that has ended, dated when it ended. A line once in the book stays there after an Undo, as other Legends lines do; the Storyteller hides or removes it in the book.

Reverse: battleLines in wodx-chronicle/scripts/legends-rules.mjs and its line in legends.mjs gather().

## B2208. Time in a battle (2026-11-12)
A battle does not move the clock by itself. "Let the time pass" moves the world clock once by the time it took: its phases times the age's phase length, plus a week for each siege week. The chronicle's dated events that look like wars (war, battle, siege, crusade, uprising and the like, within five years of the clock) are offered as a quick start when a battle is set up.

Reverse: passTime in battles.mjs; warEvents in battle-rules.mjs.

## B2209. Wars outside the living world (2026-11-12, house rule)
A battle can be set in the Umbra (Garou, Fera and spirits against the Wyrm's hosts) or the Underworld (Legions against Spectres or Renegades). Those ignore the year: a phase is an hour, no guns breach walls, and the counterattack is 5 dice. The damage type of "The battle hits" stays lethal; the Storyteller changes it by hand where a realm calls for it.

Reverse: REALM_AGES in battle-rules.mjs.

## B2210. The book's army when both sides list units (2026-11-12, Spoils of War pp. 44-45 printed)
The Troop Types table of Spoils of War (p. 44 printed, pdf 45) was read from the page images (/mnt/project-files/book-checks-2026-11-12b.md, item 2); its figures give the book's example army exactly (Maneuver 19, Melee 20, Ranged 5, Defense 20). When both sides list units, a battle is fought with the book's Right of Command in place of the house weight of B2200 and B2203: the commanders' opposed Perception + Leadership (difficulty 6, a botch gives the other side 2) adds the net successes to the winner's four pools and takes them from the loser's; then each army takes one action, Close and fight (Melee against the foe's Defense, the winner takes a unit a net success either way), Shoot (Ranged against half the foe's Defense, only the shooters do harm) or Withdraw (Maneuver against Maneuver; a win keeps the foe's melee off and leaves the field, a loss adds the net successes to the foe's blow). Losing 3 or more units in a turn makes an army waver at that many; losses past the commander's Charisma + Leadership cost a die a unit (demoralised); an army with no units left is beaten. WoDX readings: the army is one line, so Flank, the wings, the Reserve and the turned flank are not used; units fall from the type with the most units, mortal troops before the supernatural ones; a defender adds its position's bonus to Defense; a character's deed adds its successes to its side's action; a book army drawing off leaves a tenth of its units; in a siege a book army's hunger and disease wear its resolve, not its men. Without units on both sides, and in every age the book's troop types do not fit, the house frame of B2200 stays.

Amended 2026-11-12 (Storyteller 0.45.1): when both armies close and fight, each counts only the units its own blow takes; the book's rule that a beaten attack costs the attackers applies only when the foe stood to receive it (shooting or withdrawing). Counting both ways doubled every clash, and a small army was gone in the first hour more than half the time (a run of 2,000 faction-war battles in the harness).

Amended 2026-11-12 (Storyteller 0.48.2): an army loses at most a third of the units it began with in one turn (at least one), deeds included; a WoDX reading, since an army brings only part of itself to blows in an hour. The faction armies of B2216 are five to nine units, and with pools of about three dice a unit a single turn's net, plus a leader's deed, took the whole army two times in three in a supernatural war (2,000 runs in the harness). With the cap, faction wars run three phases or more (median 3 for Kindred against Garou, 4 for a margrave against an abbey).

Reverse: clear the units on both sides (the battle then uses men and quality), or drop the isBook branch in fight() in wodx-storyteller/scripts/battles.mjs.

## B2211. Factions go to war by themselves (2026-11-12, Ben's pick, house rule)
Ben asked on 12 November 2026 for battles and sieges that happen without the Storyteller, mainly from disputes between factions, and picked "Yes, fought off the screen" on the decision card. WoDX NPC 0.44.0 adds a step after each faction turn (world setting "Factions go to war by themselves", on): a faction that is awake, has Retainers to field (Herd for Kindred), is not run by players and not at war already, and stands Hostile (-2) or Hunted (-3) toward a rival that holds a place, takes up arms for one of the rival's places on a roll of 1 in 6 (Hostile) or 1 in 3 (Hunted). At most one new war a turn, the factions taken by Status as in the turn.

Reverse: turn the setting off, or remove the warTurn call in runTurns (wodx-npc/scripts/factions.mjs).

## B2212. Off the screen, and where the characters are (2026-11-12, house rule)
A war is a WoDX Storyteller battle that remembers its war (who, for what place, mortal or supernatural). A battle in the field is fought to its end in the turn it starts, up to 30 phases and then a draw; a siege goes one week each faction turn (about seven days of game time) and is stormed once its walls are breached. No cards go to the players; the Storyteller gets one card when a war starts and one when it ends, and the Storyteller's log has the outcome. What it changes waits in the approval queue (B2206 and B2215). A war at a place where a player character's token stands is made but not fought: it waits in Battles and sieges for the Storyteller to fight with the players, or to remove.

An army fought off the screen picks its action each turn (Storyteller 0.45.2, chooseActions): it closes when its Melee is above the foe's Defense, shoots when its Ranged does better against half that Defense, and withdraws once it has lost half its units and neither blow can tell. A much weaker army still loses; it is no longer made to close every turn.

Reverse: call api.factions.warTurn by hand only, with the setting off.

## B2213. Mortal wars and supernatural wars (2026-11-12, house rule on Ben's two kinds)
Both kinds begin for the same reasons. A war is supernatural when both sides are of a hidden kind (Kindred, Garou, mages, fae, spirits or the dead), or when hunters fight one of them; otherwise it is mortal, and a hidden faction fighting a mortal one does it through its mortal followers, as the Masquerade (and its like) demands, with no powers and no breach. In a supernatural war the hidden side fields its own (Kindred: ghoul knights and Cainite cavalry; Garou: a pack and Kinfolk wolves, Spoils of War p. 44), the supernatural in its ranks counts in later ages, and its leader's powers add to each phase (B2214).

## B2214. The leaders' powers in a phase (2026-11-12, house rule until the battle deeds table)
In a supernatural war, each phase the leader of each hidden side (and hunters) rolls Status + 3 dice (3 to 10) at 6, and the successes count as that side's deed for the phase (one foe out of the fight a success, or extra successes on its action with the book's army). Since NPC 0.45.2 the deed comes from WoDX Storyteller's battle deeds table (B2350s): leaderDeed picks a command deed for the leader's kind of being (from the leader's sheet, else from the faction's kind) and age, with Status + 3 dice, and its `seen` goes with the deed so the aftermath counts it against the Masquerade. The plain Status + 3 roll is kept for when the table is not there.

## B2215. What a war changes (2026-11-12, house rule)
Beside a battle's Status, Retainers and standing (B2206): when the attacker wins, the place it fought for goes to it (a big change, so it always waits for the Storyteller); a supernatural war in the living world starts a rumour of what was seen at the place (a breach of severity 1, 2 after more than six phases), on the beaten hidden side, whose flight is what people saw. No breach in the Umbra or the Underworld.

## B2216. How a faction's dots become an army (2026-11-12, house rule)
Up to 1499, in the living world and in the realms, a side is the book's units (B2210): its strength r is Retainers (or Herd for Kindred), its Status s. Mortal powers and the Church: r peasants, r/2 spearmen, r/2 archers, s heavy cavalry; mercenaries: swordsmen, crossbowmen and light cavalry; village folk: peasants and archers; hunters: spearmen, crossbowmen and some heavy horse; Kindred in a supernatural war: r ghoul knights, s/2 Cainite cavalry and their herd as peasants; Garou: s/2 packs and r Kinfolk wolves; mages, fae and the dead field mortal followers (their powers come as deeds). From 1500, men are 100 times 3 for each dot past the first, and quality comes from Status and Resources (mercenaries one better). A defender with Domain 3 or more holds walls, so the war is a siege (a castle, a bastion fort from 1650, bunkers from 1914) with 14 days of stores for each dot of Resources and one more; otherwise it fights on high ground with Domain 1, else in the open. A leader on the sheet commands, else a captain with Status + 2.

## B2220. The crowd as a resource (2026-11-12, house rule)
The passers-by leftovers of the Master Plan (Passers-by and animals, priority 2) are built in WoDX NPC 0.40.0 and Actions 3.52.0. Each person in the street now carries a feeling and a spark (crowd-rules.mjs), kept on the token's passer-by flag. WoDX Actions reads them through api.passersby.mindOf and offers the mortals in sight to a wraith's Passion roll and a changeling's Epiphany. What a supernatural takes from a mortal is written on the mortal's token actor as flags.wodx-actions.crowdUse, by the Storyteller's client.

Reverse: crowdNear and crowdRules in wodx-actions/scripts/main.js; the crowd rows in wraith.js passion() and c20.js epiphany().

## B2221. What a crowd feels (2026-11-12, house rule)
A passer-by's feeling is drawn when they walk on, weighted by the kind of place (a church devout and grieving, a tavern merry, lustful and quarrelsome, a hospital afraid), the kind of person (the devout, the poor, drinkers, the young), the part of the day and the age: faith fills the medieval street and thins toward the Future Darkness, which is warier and lonelier. Drunk and sick vessels lean to joy, anger, fear and despair.

Reverse: PLACE_FEELINGS, CAT_FEELINGS, BAND_FEELINGS, AGE_FEELINGS in wodx-npc crowd-rules.mjs.

## B2222. Pathos from the crowd (2026-11-12, house rule on W20 p. 305)
Wraith 20th lets a wraith gain Pathos at second hand from a mortal who feels a Passion's emotion in the same context, at difficulty 8; the Passion window already had that roll. Now it lists the mortals in sight with what each feels. The Passion's feeling is read from its name, the bracketed emotion first ("Protect my daughter (Love)"); a passer-by who feels something else gives nothing. A name with no feeling in it leaves the match to the Storyteller. Each wraith can draw on each mortal once a scene, on top of the book's once a scene for each Passion.

Reverse: passionFeeling, pathosCandidates, markPathos in crowd-rules.mjs.

## B2223. The spark and Dreamers (2026-11-12, house rule on C20 pp. 259-264)
Each passer-by keeps a spark from 0 to 3, rolled from the Banality of the age (high in 1197, low in the Future Darkness) and the kind of person (the young keep most). A spark of 2 or more is a Dreamer, the only passer-by a Reverie can start on. A Reverie picked from the crowd keeps the passer-by on the map for the Storyteller, who can make them an NPC of their own for the long work the book describes.

Reverse: AGE_SPARK, CAT_SPARK, DREAMER in crowd-rules.mjs; the Reverie check in c20.js epiphany().

## B2224. Ravaging once a night (2026-11-12, house rule)
A mortal picked from the crowd can be Ravaged once a night (noon to noon); after that there is nothing left to take. A Ravaged passer-by is left dull and listless for the night and stays on the map, so the Storyteller can see the cost. The Ravaging roll, its Banality and its trigger are unchanged.

Reverse: nightOf, ravagedTonight, markRavaged in crowd-rules.mjs; touched in passerby-rules.mjs keepIf.

## B2225. Doors for passers-by on large maps (2026-11-12, house rule)
On a large map passers-by can walk in from and out by regions instead of the edge of the map: the Storyteller ticks regions in the Passers-by window, and a region named "Passers-by" or "Crowd door" always counts. With one door they come and go by it; with several they cross from one to another. Someone running from a fight or a breach heads for the nearest door. With no doors the edge of the map is used, as before.

Reverse: doorsOf, exitFor, walkFor in wodx-npc passersby.mjs; planDoorWalk, nearestDoor in crowd-rules.mjs.

## B2226. Mage witnesses from passers-by (2026-11-12)
The Master Plan asked for the Mage Cast to fill in "with witnesses" from passers-by in sight. That already happens: since Actions 3.42.0 the Cast window asks the Masquerade sight check who can see the caster, passers-by are ordinary mortals to it, and only animals in the street are left out. A harness test now holds this in place.

Reverse: nothing to reverse.

## B2300. Lifepath threads become story chains (2026-11-12, house rule)
Improvement Desk 2026-11-12b item cr2, approved by Ben. V20 asks for a prelude that sets up the character's past (V20 pp. 352-353, pdf 360-361), but gives no table for when that past comes back. With WoDX Chronicle's Story chains setting on, each player character's kept lifepath is read by WoDX Creation for open threads: a person from the past whose role or note leaves something open (an enemy, a rival, a debt either way, a secret someone knows, someone lost, a promise), or a kept Flaw (Enemy, Clan Enmity, Hunted, Dark Secret) that no person already carries. At most four per character, sharpest first. Each kind has a three-step chain of its own; the person the lifepath made as an NPC is named in it.

Reverse: turn off Story chains, or reject the thread in the approval queue.

## B2301. When a thread falls due (2026-11-12, house rule)
The first thread comes to the approval queue 14 days of game time after Chronicle first sees the character's lifepath, each next one 30 days after the last, one at a time per character. Approved, it runs as a story chain from the scene's city; rejected, it is left in the past and never put again. The Storyteller can also start any thread at once from Threads from the past in the story chains window.

Reverse: change LP_DAYS in wodx-chronicle/data/pod-lifepath.mjs.

## B2302. A thread in the year of play (2026-11-12, house rule)
The chain is written for the year it fires, not the year of the scene. A mortal from more than 70 years back is long dead, and a descendant carries the thread. The undying (Kindred, the dead, spirits) from more than 150 years back come back far stronger, and an enemy, rival, creditor or keeper of a secret among them may now be the pawn of something older. A mortal from 40 to 70 years back is old. News and searching follow the era: a pedlar or inn talk before 1500, a sealed letter to 1799, telegrams and newspapers to 1945, a phone call or a private investigator to 2022, a filtered message or a data broker in the World of Future Darkness.

Reverse: change LP_ALIVE_SPAN, LP_OLD_SPAN or MEANS in Chronicle's pod rules and data.

## B2303. Who counts as undying in a lifepath (2026-11-12, house rule)
A person's role and note are read for the Kindred and others who do not age: a sire, a vampire, a prince, a harpy, a domitor, an anarch, the dead, spirits and monsters; for a vampire's lifepath, an elder or a member of the court too. Everyone else ages and dies in a lifetime. When the Storyteller links a different NPC, its name is used, but its age is still judged from the role.

Reverse: edit UNDYING in wodx-creation/scripts/lifepath-threads-rules.mjs.

## B2304. Lifepath threads speak of the character, not to them (2026-11-12)
Lifepath roles are written to the player ("your sire's rival, who would see you destroyed"). On the Storyteller's chain cards and the approval queue they are turned around to name the character ("Jana's sire's rival, who would see Jana destroyed").

Reverse: drop third() in Chronicle's pod rules.

## B2305. A guest in another character's prelude (2026-11-12, house rule)
Improvement Desk 2026-11-12b item bf1, approved by Ben. In the prelude runner, the Storyteller can ask another player's character into the current scene. It is offered only where the guest's lifepath years allow: at least 8 years old, and alive. Mortals, hunters, Garou, changelings and other lines with a mortal span live 100 years; ghouls and revenants 200; mages 150. The Kindred, the dead, mummies, Kuei-jin and the fallen do not age once turned; a guest turned 100 years or more before the scene comes only as an elder, a wraith only as a ghost. A guest with no lifepath is the Storyteller's call. Places are not checked: every lifepath is set in the chronicle's own lands of the Bohemian crown, so the Storyteller rules out a guest who was abroad.

Reverse: change UNDYING_LINES, SPAN, GUEST_MIN_AGE or ELDER_YEARS in first-night-prelude-rules.mjs.

## B2306. The guest's beat (2026-11-12)
The Storyteller picks one beat question for how the guest was there (as a mortal, turned, an elder or a ghost), then asks the guest's player on a chat card, or writes what happened at the table. The answer goes to troupe ties on the Group actor as a guest tie (one per scene, beside the ring's questions, which it never replaces), into the host's prelude log with Undo, and ticks the guest's ties step. How they met lists it as "the guest in the host's prelude".

Reverse: Undo in the prelude log removes the tie.

## B2307. A guest beat costs and gives nothing (2026-11-12)
The beat is story only. It spends none of the host's 3 prelude freebie points and gives the guest no points; a roll with stakes in the same scene still costs the host as before.

Reverse: none needed; give a reward from the runner by hand.

## B2310. The case board (2026-11-12)
From the improvement desk (item i1, approved by Ben 2026-11-12). Each case board is a journal in the "WoDX case boards" folder, owned by every player so anyone can pin, move and join cards. Cards are clues, people, places, Encyclopaedia entries or journal pages, items, and notes; lines between two cards carry a few words. The Storyteller starts boards, picks the open case, and can hide a card until it is earned. Players do not see hidden cards or the lines to them, but the card is in the journal's data, so this only hides; real secrets stay in the Storyteller's own notes. Anyone opens a board from the token tools; the Storyteller also has it in the Storyteller's hand.

Reverse: case.mjs and case-rules.mjs in wodx-interactables; setupCase and registerCaseSettings in main.mjs.

## B2311. Found clues go on the open case (2026-11-12)
A clue looked at or examined through Interact is pinned to the open case board on the Storyteller's client, with the texts the finder's best successes reached. Examining it again with more successes adds the new words to the same card. A botched examine pins nothing. World setting "Found clues go on the case board", on by default.

Reverse: the pinClue call after clueCodex in wodx-interactables main.mjs; setting caseClues.

## B2312. The case board by era (2026-11-12, house rule)
The board keeps its era's look and name: parchment and red thread to 1449 ("The findings"), a commonplace board of pinned leaves to 1799, the detective's pinboard and string to 1945, the corkboard to 2022, and a lit case display in the World of Future Darkness from 2023.

Reverse: LOOKS and lookFor in case-rules.mjs.

## B2313. What they could know (2026-11-12, house rule)
From the improvement desk (item l1, lighter version: a Storyteller-only view). The books give no general table for what a character knows, so WoDX Library suggests from the Encyclopaedia: an entry that has not happened by the clock's year (its date, or the first year of its earliest era) is never suggested; the character's own line's terms, rules, powers and factions are known; its people and factions need Intelligence + Politics 4, events Intelligence + Academics 4, places and lore Intelligence + Occult 4; another line's entries need Intelligence + Occult 6; a ghoul or revenant reads vampire entries as its own at 2 more. Ticked entries go into the character's codex (WoDX Storyteller), which only that character's players read. The Storyteller's call always wins.

Reverse: know.mjs and know-rules.mjs in wodx-library (ERA_FROM, OWN, OWN_NEED, OTHER_NEED).

## B1640. A talk generator with no AI model (2026-11-12)
When the Storyteller has written no line that fits, WoDX NPC makes one from a grammar (scripts/talk-grammar.mjs, data/grammar/house.mjs). Rules say what they need ({era, regard}, {voice, warmth}, {clan: "ventrue"}, {traits: {Dominate: 2}}, {year: [1300, 1526]}); of the rules that fit, those with the most tests speak, their lines pooled. #symbols# expand from an era lexicon (address, greetings, oaths, coin, who keeps order, light, drink, landmarks), so one template speaks in every century. Pronoun slots are always they, them and their. House writing, not from any book. Ben approved the desk 2026-11-12.

Reverse: turn the world setting "Talk generator" off.

## B1641. Where generated lines sit (2026-11-12)
Storyteller talk sheet lines (trait-gated ones first) always come first. The generator answers only after them. The hand-written stock pools are now grammar rules, with the same pools for the same era, regard and voice; children, beggars and drunks keep to their own lines; someone who hates the character shares no gossip. A line is steady for one NPC, character and day, and a line just said is passed over while another fits. Talk cards mark a made line with flags.wodx-npc.talk.generated, so WoDX Voices leaves it as text.

Reverse: setting off, which goes back to the old stock picker.

## B1642. Era words by year (2026-11-12)
Lexicon entries carry an era band or exact years: coin follows WoDX Storyteller's Moravian money rows (denars to 1299, groschen and heller 1300-1526, kreuzer 1527-1891, heller and kronen 1892-1918, korun 1919-2019, eurobucks and credits from 2020); gendarmes from 1849; no railway station before 1839; coffee from 1700.

Reverse: edit SYMBOLS in data/grammar/house.mjs.

## B1643. Who is speaking: clans, tribes, Traditions, Conventions and kiths (2026-11-12)
The talk generator reads the NPC's sides (clan, tribe, Tradition or Convention, kith, sect and the like, from the sheet and factions) and adds a few greetings and brush-offs for each group: 15 clans and bloodlines, 13 tribes, 9 Traditions, 5 Conventions, 9 kiths. They pool with the era's lines, so the group colours the talk without taking it over. Every line keeps the Masquerade and the Veil: manner only, nothing that names what the speaker is. House writing. Ben approved on the desk 2026-11-12.

Reverse: remove a group's rows from data/grammar/groups.mjs.

## B1644. Mood (2026-11-12)
An NPC talks in a mood: the one the Storyteller sets in the behaviour window wins; else a place in alarm makes them afraid, wounds make them hurt, a fight with the character or a fall in regard in the last day makes them angry, a wary place makes them wary. Afraid and hurt crowd out other lines; the rest pool with them. Moods: afraid, hurt, angry, grieving, wary, weary, cheerful.

Reverse: set the mood in the behaviour window, or edit moodOf in scripts/talk-grammar.mjs.

## B1645. Asking about a name with no answer written (2026-11-12)
When a character asks about a person, place or faction they have heard of and nobody wrote an answer, the generator answers by regard and mood, naming the topic ("The old mill? I know the name. Not much more."). Before, it was a plain brush-off.

Reverse: setting "Talk generator" off.

## B1646. The Storyteller's own grammar (2026-11-12)
A journal, "WoDX talk grammar", holds the Storyteller's grammar, one entry a line (greet [clan: ventrue, warmth: cold] => "You are not expected."; #coin# [year: 1300-1526] => groschen | heller). It adds to the house grammar; an entry with the id of a house rule replaces it; boost lets a line win. It is read again whenever a page changes, and lines it cannot read are listed to the Storyteller by line number. The talk API opens it (api.talk.openGrammar), making it with a help page the first time.

Reverse: delete the journal.

## B1647. Reroll and Keep (2026-11-12)
A talk card with a made line shows the Storyteller, and only the Storyteller, which rule made it, with Reroll (another line from the same facts, replacing the one on the card) and Keep (the line goes onto the NPC's own talk sheet under the topic, where it becomes the Storyteller's line and always comes first).

Reverse: none needed; a kept line can be deleted from the talk sheet.

## B2320. The features card on the sheet (2026-11-12, Improvement Desk sg1)
Under the in-play strip, a folded card lists every line feature the character has (clan or bloodline, tribe, auspice, breed, kith, seeming, court, Tradition, Guild, legion, House, creed and the rest), each with what it does, when it fires and when it last fired in play. The owner and the Storyteller see it; players only ever open their own sheets. "When it fires" is one line for each engine (Chronicle FEATURE_WHEN) plus the rolls it changes. "Last fired" is the in-game date of the feature's latest card (flags.wodx-chronicle.sigFired), so a feature with no card (a plain roll bonus) reads "not yet in play".

Reverse: remove featuresHtml from decorate in wodx-sheets extras.mjs; cardFor back to card in signatures.mjs.

## B2321. A feature set aside for a story (2026-11-12, Improvement Desk sg1)
The Storyteller unticks "In force" on the features card to set one feature aside for this character (flags.wodx-chronicle.sigOff, by row key). A set-aside feature stops working everywhere: its engines, cards and roll changes leave rowsOf, while the card still lists it, marked as set aside. Ticking it again puts it back. It is the Storyteller's call how long "a story" lasts; nothing clears it by itself.

Reverse: clear the flag, or drop the off filter in rowsOf.

## B2322. What changed since last session (2026-11-12, Improvement Desk sh3)
At each session's end (WoDX Storyteller's End the session) every player character's numbers and lists are kept as a snapshot (flags.wodx-sheets.snap, a JSON string), and the strip under the in-play strip lists what moved since: the year, experience earned and spent, Attributes and Abilities, health and healing, Willpower and its rating, the line's pools, Merits and Flaws gained or lost, possessions gained, lost or counted, hand ties and the domitor, and faction membership, rank and office. A jump of decades is one year line, since the strip compares two moments rather than adding up each change. A character with no snapshot gets one when the Storyteller next loads the world. Mark as read starts the list again from now. Ties the Storyteller hides are never compared, so nothing hidden shows up.

Reverse: remove changesHtml from decorate and installChanges from setup in extras.mjs.

## B2323. The cause of each change (2026-11-12, Improvement Desk sh3)
Each line names its causes, up to four: "a card: <its title>" when a chat card button was pressed in the four seconds before, "the time skip" while Chronicle's time skip runs, "Undo", "the Storyteller" for the Storyteller's own edits, or "<player>, by hand". The client that makes a change tags it and the active Storyteller's client keeps the causes by kind of change, saving at most once for each new cause, so play costs almost no extra saves.

Reverse: drop the tag hooks; lines then show without causes.
## B2106. Kokoro runs offline from the Data folder (2026-11-12)
WoDX Voices loads kokoro-js 1.2.1 (its web build), the ONNX runtime wasm and the Kokoro-82M model (quantized) from Data/wodx-voices-engine, which tools/voices/fetch-engine.mjs fills once on the PC. The library asks for its files at their online home; a narrow fetch shim on the Storyteller's client answers only those requests from the folder. Nothing goes in the module bundle. Licences in the folder's NOTICE.txt (Apache 2.0; the phonemizer is espeak-ng, GPL 3, fine for private use).

Reverse: set Voice engine to the browser's own speech.

## B2107. One render, shared by file (2026-11-12)
Only the active Storyteller's client renders. It saves the line as a WAV in Data/wodx-voices-cache/g<n>/ (a name from the voice, speed and words, so a line said twice is rendered once) and sends the path over the module socket to the people who see the line. Players play the file. With no Storyteller online, players fall back to their own speech.

Reverse: engine setting.

## B2108. A Kokoro voice per NPC (2026-11-12)
Two of Kokoro's 27 English voices of one accent (American or British, by seed), matched to a known sex, blended 50:50 to 80:20 by seed, with the speed from the profile. The Storyteller can name one voice or a blend in flags.wodx-voices.override.kokoro ("bm_george" or "bm_george*0.6+bm_lewis").

Reverse: kokoroVoiceFor in voice-rules.mjs.

## B2109. The Storyteller's own lines (2026-11-12)
Improvement Desk vo1 (Ben approved 12 November 2026): chat in character from a Storyteller, as a token whose actor has no player owner, with no dice, can be read in that NPC's voice to the people who see it. Off by default since B2111: Ben asked the same day that only prewritten lines be voiced.

Reverse: the "Read the Storyteller's lines" setting.

## B2110. Sound from the token (2026-11-12)
When the NPC's scene is in view, the line plays at the token through Foundry's positional sound, fading over the set range (30 grid units by default) and muffled by walls; the Storyteller always hears. Otherwise it plays plainly.

Reverse: the "Sound from the token" setting.

## B2111. Plot NPCs and prewritten lines only (2026-11-12)
Ben (12 November 2026), after Fallout 1 and 2 and Baldur's Gate 1 and 2: an NPC is voiced only when the Storyteller marks it as a plot NPC (Voiced (plot NPC) on the right-click menu in the Actors list, flags.wodx-voices.plot), and only the lines written beforehand on its WoDX NPC talk sheet are read. Stock lines, generated lines, barks and every unmarked NPC stay text. The world setting "Who speaks aloud" can open it to every NPC.

Reverse: the "Who speaks aloud" setting; prewritten and voiced in voice-rules.mjs.

## B2112. A voice server on the Storyteller's PC (2026-11-12)
Ben found the Kokoro samples flat and chose Chatterbox on his own PC (12 November 2026). tools/voices/chatterbox_server.py runs Chatterbox (MIT) on the PC's graphics card, listening on 127.0.0.1 only, and answers the Storyteller's browser with a WAV per line. It is the default engine: the line is cached and shared exactly as with Kokoro. When the server is not running, Kokoro reads the line, and without Kokoro the browser's own speech. A stopped server is tried once a minute, not once a line.

Reverse: the "Voice engine" setting.

## B2113. Human reference voices, chosen for lively reading (2026-11-12)
Chatterbox copies the cadence of its reference clip, so the clips decide how natural an NPC sounds. tools/voices/fetch_voices.py takes readers from LibriTTS-R (CC BY 4.0, from LibriVox public-domain recordings), prefers lines read as dialogue (quotes, exclamations, questions) and lines whose pitch moves, builds 8 to 14 second clips, and keeps 48 readers spread widest over pitch, pace and liveliness so no two voices sit close. Credits stay in voices.json and NOTICE.txt. The Storyteller may add clips of their own.

Reverse: --count, --splits, --local.

## B2114. Delivery from the line and the mood (2026-11-12)
Each line's emotion, pace and variety come from the line itself (exclamations, shouted words, questions, trailing off), how the NPC regards the character it speaks to (WoDX NPC's attitude step), its wounds, and a temper the Storyteller may set (calm, warm, cold, fiery, nervous, weary). Figures are house ones, rounded to steps of 0.05 so a line in the same mood is rendered once; the server lifts an exclaimed sentence a little more and pauses longer after questions and trailing lines.

Reverse: deliveryFor and TEMPERS in voice-rules.mjs.

## B2115. A server voice per NPC (2026-11-12)
Each NPC keeps one server voice, picked from its seed among the voices the server lists. A known sex narrows the pick by speaking pitch (male: low or mid; female: high or mid); with no known sex every voice is open. Slow speakers (old age, a slow speaking style) lean to the slower readers. The Storyteller's choice (override.chatterbox) wins.

Reverse: serverVoiceFor in voice-rules.mjs.

## B2116. The server's address and key stay in the Storyteller's browser (2026-11-12)
The address and the key are client settings, so they never reach the world database or a player. The server makes its key on first start and keeps it in server-key.txt beside the voices; every request needs it, and browsers may call only from the Foundry addresses it allows (localhost:30000 and 127.0.0.1:30000 over http or https, and wodx.online, by default).

Reverse: --origin on the server; the two client settings.

## B2330. A country map behind the travel sum (2026-11-12)
Ben approved all eight items of the Daggerfall study desk on 12 November 2026. Moravia and its neighbours are laid on a grid of 5 km squares (117 by 85): each square has its ground (plain, river meadows, hills, uplands, mountains), any river, and the best road in it in a given year. The ground comes from 41 rough shapes, 13 rivers, 62 towns and the links between them, written for WoDX from general geography; no game's data and no book's is in it. A place sits on the map as a town plus an optional distance and direction. When both ends of a trip sit on the map and no minutes are typed, the trip finds its cheapest way across the squares; one end off the map keeps the older sums. The idea of a coarse stored map with roads as layers comes from Daggerfall Unity and its Basic Roads mod; the code and data are our own.

Reverse: clear Near on the Travel places window; the map branch in tripPlan in world-rules.mjs.

## B2331. The going by one's own means (2026-11-12)
On foot, on horseback, by one's own cart and by car use the speeds road-rules.mjs already had, now by the road in each square. Roads wind (1.15 times the straight distance) and climb (hills 1.1, uplands 1.25, mountains 1.5; half that on a motorway). Off the road the going is a track's speed over 1.3 times the distance, slowed 1.3 in river meadows (1.1 from 1850, once the rivers are banked) and hills, 1.7 in uplands and 2.6 in mountains; carts and cars cannot leave the road in mountains. A big river away from a road costs 40 minutes for a ferry or ford before 1850 and 15 after. House figures.

Reverse: step() in country-rules.mjs.

## B2332. Paid rides run only between their stops (2026-11-12)
A hired cart or coach (to 1945), a river boat, a train (each line from the year it opens, 1839 on), a bus (1925 on), a flight (airfields from 1920 on) and, on the Future Darkness branch, a transit pod each run only between towns their network joins in that year. The traveller first goes to the stop in the nearest town that has one, waits (10 minutes to 2 hours), rides, and goes on from the last stop. Ben's ruling of 13:09 UTC: travel from anywhere stays, and hired travel is added beside it. With no way asked for, the fastest way open is taken, but never a flight under 300 km. The idea of rides bound to their stops comes from the Travel Options and Immersive Travel mods for Daggerfall Unity.

Reverse: HIRED in country-rules.mjs.

## B2333. Fares (2026-11-12)
A fare is a share of a month's plain wage (the money rules' wage for the year) for each km ridden: coach 1/500, boat 1/1500, train 1/1500 and 1/3000 from 1900, bus 1/3000, air 1/150 falling to 1/600 in 1950 and 1/2500 in 1980, pod 1/2000. So 100 km by post coach costs six days' wages and by a twentieth-century train one day's. House figures; no book prices travel.

Reverse: the fare functions in HIRED.

## B2334. Pace (2026-11-12)
Careful: a quarter slower, 8 hours on the move a day, half the chance of an encounter. Steady: 10 hours. Forced: 15 percent faster and 14 hours a day, a quarter more encounters, and for each day a Stamina roll (difficulty 7) or a level of bashing harm, for mounts too; WoDX only tells the Storyteller, who calls for the rolls. Pace changes one's own going, not a paid ride. House rule; the careful and reckless choice is Daggerfall's, the numbers are ours.

Reverse: PACES in country-rules.mjs.

## B2335. Nights on the way (2026-11-12)
After the day's hours the living rest until 24 hours have passed. With Inns and lodgings they sleep under a roof wherever the road is a road, for a thirtieth of a month's wage each night, and camp where there is only a track; with Camp by the road they always camp, free, with a quarter more encounters. A trip shorter than the day's hours has no night in it, and the last hour of a day is pushed through to arrive.

Reverse: LODGINGS and schedule() in country-rules.mjs.

## B2336. Day shelter for those the sun burns (2026-11-12)
On the map, a Kindred or Kuei-jin moves only between dusk and dawn. The trip is cut at the towns it passes; before each stretch, if it could not be finished half an hour before dawn, the traveller waits out the day in that town and leaves at dusk. The dark slows such a trip in the years before roads were lit. A trip planned this way no longer goes to the Storyteller for arriving after dawn. A stretch between two towns that is longer than a whole night cannot be sheltered, and that trip still asks the Storyteller. Off the map the older dawn check stands.

Amended 2026-11-12 (Storyteller 0.47.1, after the testbed gate): along a road there is a village within reach wherever dawn comes, so a ride on a road breaks for the day wherever the night runs out (a village on the way to the next town). Only a stretch off the roads, or a paid ride, must be finished in one night, and only such a stretch longer than a whole night leaves the travellers with no shelter. Before this a road stretch between two towns that was longer than a short summer night was wrongly called shelterless.

Reverse: schedule() in country-rules.mjs; the plan branch of travelNeedsAsk in world-rules.mjs.

## B2337. Paying for the trip (2026-11-12)
Fares and inn nights are taken from the purse before anyone moves. A purse that is short stops the trip and says the price and the shortfall. A trip the Storyteller approves from the queue goes ahead unpaid and the log says so.

Reverse: the payment block in travel() in core.mjs.

## B2338. An encounter knows its ground (2026-11-12)
On a map trip the hour an encounter falls in is matched to the leg being travelled, so the proposal says where (in the wooded uplands between Jihlava and Třebíč) and carries the ground and the road for a map to be drawn there. Encounter hours count hours on the move, not hours asleep.

Reverse: spotAt in country-rules.mjs; the encounter block in travel().

## B2339. A generated map takes its land from where it sits (2026-11-12)
tools/mapgen/ddtown.py takes --at town or town:km:DIR, the same way a place is put on the country map in Foundry. The landform the town is drawn on and whether a river crosses the map then come from the country at that spot (river meadows and plain draw as plain, the Drahany Highlands as karst, a river within 5 km puts a river on the map), unless --land or --river says otherwise. The sidecar gains a country block and a transit list naming where a paid ride is taken from on that map in that year: the tavern as the coach stand to 1945, the railway station once the town has one. Without --at nothing changes, so earlier maps come out byte for byte as before. The grid reaches Python as tools/mapgen/country.json, written by export_country.mjs; the harness fails when it is out of date.

Reverse: leave --at off; the block after parse_args in ddtown.py.


## B2340. Warrens are put together from our own kit of pieces (2026-11-12, Ben's pick, house rule)
tools/mapgen/ddwarren.py --kind warren lays a warren from a kit of 24 square pieces drawn for WoDX (PIECES in that file; nothing is taken from any game's data): passages, bends, junctions, chambers, a store vault, two dens, four flooded pieces, a fall, two ways up and two caps. A piece is ten squares a side and opens only through the middle two squares of a side, so any two fit. The pieces go on a grid as one connected run: the ways up first, joined by wandering ways, then side runs until the count asked for (--pieces; 10 under a village, 18 a town, 28 a city) and a few ways round. A chamber may be laid where fewer ways are needed than it has, and the way that leads nowhere is capped. Dens fall farthest from the ways up. A den holds a nest to hide in and a hoard filled as a den of thieves; a vault holds a chest filled as a home; the fall is a crawl. The check in check_kit() stops the run if a piece opens anywhere it does not say.

Reverse: delete ddwarren.py and tools/harness/warren.test.mjs; nothing else reads them.

## B2341. A warren under a town uses the town's own squares (2026-11-12, Ben's pick)
With --under <town sidecar> the warren's map has the same squares as the town map, so a square below is the same square above. The grid of pieces is shifted (by up to four squares either way) to the place where the most stairs come out wholly inside a building, the ways up are picked from those and spread apart, and each one records the building it comes up in (waysUp in the sidecar, and the stair's own label). Pieces under the river, a brook or an oxbow are the flooded ones nine times in ten. With no town above, the lowest corner of the warren stands in water.

Reverse: run without --under.

## B2342. What a warren is called and built of follows the year (2026-11-12, house rule)
The same kit is dressed by the year (DRESS in ddwarren.py): to 1499 joined cellars and old workings; 1500 to 1849 brick vaults and casemates; 1850 to 2039 service tunnels, coal cellars and shelters; from 2040 the under-levels. Only the names, the wall and the kind of way up change (a stair before 1850, rungs after). --dress picks one whatever the year. Jihlava, Znojmo and Brno have real medieval undergrounds of this joined-cellar kind, which is why the first dress is the default for the early eras.

Reverse: edit DRESS.

## B2343. Sewers are laid from the town's street plan (2026-11-12, Ben's pick)
ddtown.py --plan adds the centre lines of the ways, the river and the brooks to each sidecar (a new "plan" block, written only when asked, so maps made without it are unchanged). ddwarren.py --kind sewer --under <that sidecar> lays a main under every main street and road and a side sewer under every street and quay (never an alley or the railway), a round chamber wherever runs meet (a junction chamber where three or more meet on a main), and a manhole at each chamber as the way up to the same square of the street. No run passes under the river: each bank drains by itself to its nearest point on the river and leaves by a grated outfall, and every run records which way it falls. A run that reaches the map's edge goes on under the next part. Reflect needs nothing new on the map.

Reverse: leave --plan off; delete the sewer() function.

## B2344. When a place gets sewers, and what was there before (2026-11-12, house rule)
Cities and the metropolis have sewers from 1850, towns from 1890, villages from 1950 (SEWER_FROM), and for the first thirty years only the mains. These are round figures for the Bohemian crown lands, not any one town's dates. Before that there are no sewers: a brook through the built-up part of the town runs under a cover from 1500 (a culvert wherever a house stands within eight squares of it, with its own mouth on the river) and open before then, and up to 24 houses with a yard have a cesspit under it, reached by the privy shaft. Once the sewers are in, a few cesspits remain.

Reverse: change SEWER_FROM or COVERED_BROOKS_FROM in ddwarren.py.

## B2345. Reflect reads a map from under the ground (2026-11-12, Ben's pick, house rule)
Otherworlds 0.17.0: a sidecar marked "underground" (every warren and sewer map) is read piece by piece and run by run (underMarks in reflect-rules.mjs) instead of as a town. In the Penumbra a sewer carries the Weaver's webbing of its year and sours toward the Wyrm along the filth, most at the outfall and the cesspits; a covered brook still runs with the Wyld; a den is a lair that draws Banes; plain passages and chambers are faint. In the Shadowlands a fall and a closed way stand again as they were, a fall may open a Nihil, a den thins the Shroud, and filth rots fastest. The realm layouts themselves are untouched.

Reverse: remove the underground branch at the top of reflect().

## B2346. Two dresses of no year: the Labyrinth and a Black Spiral cavern (2026-11-12, Ben's pick, house rule)
The warren kit has two more dresses picked only by name (--dress labyrinth, --dress spiral). They change the names, the wall and what stands in the flooded pieces (the dark between, or balefire), and the way up is a Nihil or a shaft to the pit. Reflect reads a Labyrinth map with no Penumbra at all and only decay and Nihils among the dead, and a Black Spiral cavern as a Blight all through. Whether a given night's Labyrinth looks like this stays the Storyteller's call, as before.

Reverse: drop the two entries from DRESS and the two branches in underMarks.

## B2347. Wild land with no edge for the open Umbra and the Tempest (2026-11-12, Ben's pick, house rule)
Ben changed the realm-maps pick on the study desk at 13:55 UTC to add endless seeded wild land beside the small uses. Otherworlds 0.17.0, scripts/wild-rules.mjs: the open Umbra between the realms and the Tempest's storm sea are drawn a piece at a time. A piece is a realm map of the usual size at a place (x east, y south) in the wild; its ground is read off one unbroken field of smooth noise fixed by the seed, so pieces side by side meet square for square and a piece is the same every time. One trail winds across the whole wild from west to east and one from north to south (a moon path in the Umbra, a Byway in the Tempest). The Umbra is land, water, growth and rock, with ground soured toward the Wyrm that spreads by the age (nothing before 1500, most after 1950 and on the Future Darkness branch); the Tempest is open storm water with islets of rock and shoals. Each piece has an arrival, a way on at every side the travellers can walk off, and none, one or two things in it (a glen, standing stones, a soured hollow, webbing from 1850; an islet, a wreck, a maelstrom, a Nihil's mouth). The 34 realm layouts are untouched.

In Foundry (realm-maps.mjs): Realm maps has a Wild land section. Draw wild land makes the piece at a place, or finds it if it is already drawn; Walk on draws or finds the piece beside the open one and sets the selected tokens down where they walk in. Tokens keep the record of where they first came from, so Bring them back still returns them to the living world. A piece of wild land cannot be redrawn with another seed. Travel time is still the journey card's, in hours; the pieces are for the scenes on the way.

Reverse: remove wild-rules.mjs, the wild block in realm-maps.mjs and the Wild land section of realmMapsDialog.

## B2350. A deed offered to each character, each phase (2026-11-12, house rule; Improvement Desk bt1)
Ben approved desk item bt1 on 12 November 2026. WoDX Storyteller 0.47.0 offers each character in a battle one deed per phase, picked from a table by their post (in the line, with the commander, scouting, on the walls, at the gate or the breach), the age group of the year (medieval, pike and musket, the 19th century, the world wars, the modern age, the World of Future Darkness) and the realm (the Umbra and the Underworld have their own). The pick is stable for a phase (a hash of the battle, phase and character), and Swap goes through the rest without repeats. Each deed is an Attribute plus the better of one or two Abilities at 6 to 8, and its successes join the Deeds the battle already counts (Dark Ages Companion pp. 44-45 printed: each success takes a foe out of the fight). The table, the posts and the picking are house rules.

Reverse: DEEDS, POSTS and pickDeed in wodx-storyteller battle-deeds.mjs; the offers on a battle are dropped by setting offers to null.

## B2351. The post a character stands at (2026-11-12, house rule)
With no post picked, a character in command is with the commander, one at the rear is scouting, and one in the thick of it is in the line; in a siege that has been breached or stormed the defenders are on the walls and the attackers at the breach. No deeds are offered during the weeks of a siege, only when it is fought.

Reverse: postFor in battle-deeds.mjs.

## B2352. Deeds of their own kind and the Masquerade (2026-11-12, house rule)
A supernatural character (by WoDX Combat's kind of being) is offered a deed of their own kind about one time in three: a vampire commanding the enemy captain, showing what they are, or feeding in the press; a Garou in war form; a mage's vulgar or coincidental Effect; a changeling waking dreams of glory; a wraith reaching through the Shroud; a hunter finding the monster in the ranks; spirits of war called. Deeds that the living can see as more than human are marked seen; in a battle in the living world each seen deed that succeeded is counted by the aftermath, and sending the feeding line to the Ledger lets the Veil slip one point for each (at most 3), with an Undo.

Reverse: the kinds and seen fields in DEEDS; seenDeeds in battle-aftermath.mjs.

## B2353. Off-screen deeds for faction wars (2026-11-12, house rule)
For battles fought with no window (factions at war), leaderDeed() picks a command deed for a side's leader, or a deed of the leader's kind when the side has supernatural help of 2 or more, with the commander's Perception + Leadership as the pool; deedSuccessesFor() rolls it with any random source (V20: successes at the difficulty less 1s, a botch when nothing succeeded and a 1 came up). Exposed as api.battleDeeds.leaderDeed and deedSuccessesFor.

Reverse: leaderDeed, deedSuccessesFor in battle-deeds.mjs.

## B2354. Deeds roll from the sheet, by the Storyteller (2026-11-12)
The Storyteller rolls each deed from the window (the dice go to the Storyteller's card; the player gets a card with the deed when it is offered). A botched deed adds nothing. Rolling again replaces the roll. Offers belong to one phase: fighting the phase uses them and clears them; Undo of the phase does not bring them back.

Reverse: rollDeed and offer in battle-extras.mjs.

## B2355. What a battlefield leaves behind (2026-11-12, house rule; Improvement Desk bt2)
Ben approved desk item bt2 on 12 November 2026. When a battle ends, the Battles window lists the field's harvest by line: spoils, prisoners (a tenth of a routed side) and the wounded (twice the dead) by age; feeding among the dying for 3 nights (7 after 1,000 dead), 2 easier on the field; new wraiths among the fallen (one in a hundred of the dead, at least one from 20 dead) and a thinner Shroud; Banes and Wyrm taint from 100 dead; Entropy in the Resonance and nightmares from 50 dead; the Yin rising for the Kindred of the East; and the name the place keeps. All of it is a house rule; the counts are not from a book.

Reverse: aftermathFor in wodx-storyteller battle-aftermath.mjs.

## B2356. Each aftermath line goes to the Ledger, the Legends book or the place, with Undo (2026-11-12)
A line with a lasting effect can go to the Ledger as a consequence that comes due (the feeding ends, the Shroud heals after a year and a day, the Resonance fades), to the Legends book (Chronicle 0.42.2 adds the sent lines to the battle's entry), or to a place picked as a scene (WoDX Otherworlds drift). Each sent line is kept on the battle with an Undo that removes the Ledger entry, takes the drift back, or drops the Legends text.

Reverse: send and unsend in battle-extras.mjs.

## B2357. Mass death thins the Shroud (2026-11-12, house rule on Wraith 20th)
The desk wording said "a stronger Shroud"; Wraith 20th puts the Shroud lowest where death and grief are, so a battle thins it instead (logged in PENDING-REVIEW). WoDX Otherworlds 0.18.0 adds a Shroud track to drift: massdeath -1, shroudheals +1, inside -3 to +3, and a place with a Shroud rating reads it with the drift inside 4 to 10. A battle thins it 1, or 2 after 10,000 dead.

Reverse: the massdeath and shroudheals kinds and shroudWithDrift in wodx-otherworlds drift-rules.mjs.

## B2358. Old fields are felt in later years (2026-11-12, house rule)
A field of 10 or more dead in the living world appears under Old fields in the Battles list in later years: fresh graves in its first year, the survivors' memory for 40 years, then by the clock's year a chapel or a cross before 1800, a monument and walks from 1800, battlefield tourists by rail from 1860, a memorial and museum from 1914, a visitor centre, re-enactors and detectorists from 1960, and on the Future Darkness branch from 2026 a memorial seen through the lens. Fields of 1,000 dead (or 100 within 200 years) are still haunted; 10,000 dead keep the Shroud thin. The Legends book's battle entry carries any lines sent to it.

Reverse: fieldEcho and oldFields in battle-aftermath.mjs.

## B2359. Decision numbers kept for this work
B2350 to B2359 are this work's block, all used.

## B2370. The weekly market turn (2026-11-12, house rule)
The living economy study's step 3, which Ben approved on 2026-11-11. Once a week of world time every market that is not cut off takes one turn: making, recovery, trade along its links, then prices. It runs on the active Storyteller's client when the clock passes a week by itself (checked at most once a game hour, never during a skip) and when a time skip ends. World setting Markets move each week: Auto (the default), Suggest or Off. With no market set up nothing runs, so the Live world is untouched until a market exists there.

Reverse: set Markets move each week to Off.

## B2371. Supply comes back, prices follow it (2026-11-12, house rule)
A supply that is not normal comes back one step toward normal after standing 2 weeks (empty or plenty) or 3 weeks (short). Each kind's price index drifts toward what its supply calls for (empty 2.2, short 1.4, normal 1, plenty 0.8) plus the season, closing 35% of the gap a week and never more than 0.2: a small swing, as the study set.

Reverse: change RECOVER, SUPPLY_PRICE, DRIFT and SMALL in market-turn-rules.mjs.

## B2372. What a town makes (2026-11-12, house rule)
The working places that already lift a market's supply each month (B855) also hold it up each week: one or two keep a kind from staying below normal, three or more keep it at plenty, and a turn lifts it one step toward that. Recovery never takes a kind below what its workshops keep up. Owners.workshopCounts now serves both.

Reverse: pass works: {} to runTurns in market-turn.mjs.

## B2373. Seasons by era (2026-11-12, house rule)
Winter (December to February) puts food 0.25 dearer and the lean months before harvest (March to June) 0.15; the harvest (August to October) makes it 0.2 cheaper. Fuel is 0.3 dearer from November to March and 0.1 cheaper in summer; light 0.15 dearer in the long nights; drink cheaper after the vintage; seed dearer at sowing. The pull is full before 1850, half from 1850 to 1949 (railways and canned goods) and 0.15 from 1950, when goods come from far away, so the World of Future Darkness barely feels a winter in its prices.

Reverse: edit SEASON and seasonDamp in market-turn-rules.mjs.

## B2374. Trade between markets (2026-11-12, house rule)
A market lists the markets it trades with in the Markets window; a link goes both ways. Each week, where one linked market has two supply steps more of a kind than the other, goods move: the richer steps down and the poorer up. Their price indexes close part of the gap: 15% a week before 1830 (carts and the river), 30% to 1919 (railways), 50% after (lorries), and never more than 0.2. A market ticked Cut off (a siege, a quarantine) is left as it is and does not trade.

Reverse: untick the links, or edit tradeShare.

## B2375. Big swings wait where the players are (2026-11-12, house rule)
A change that takes a kind from normal toward want (normal to short, or anything to empty) is big. In a market where a player character's token stands, it waits in the approval queue (Markets) and is left out of the turn until approved; elsewhere it goes through quietly, as the study's "markets nobody visits run quietly". Every applied turn posts one card to the Storyteller: the changes in markets with a player character there in full, a count of the quiet ones, and an Undo that puts every market back as it was before the turn. Suggest mode sends every change to the queue instead.

Reverse: setting Suggest sends everything to the queue.

## B2376. Long skips and talk of dear goods (2026-11-12, house rule)
A skip plays twelve weekly turns, with each turn's own month for the season; the weeks past twelve settle at once: supply back to normal (or plenty where three workshops stand) and prices where the season of the skip's end puts them. When two linked markets' prices for a kind part by 0.6 or more, a rumour starts in the rumour network from both markets' traders: "Food is dear in Rothenstein and cheap in Brno." It is not told again until the gap has closed below 0.3. Traders who go broke, faction moves on markets (taxes, raids, monopolies) and caravans on the map are not built yet.

Reverse: turn off Rumours spread between people, or raise RUMOUR_GAP.

## B2380. Factions act on markets (2026-11-12, house rule)
The living economy study, approved on 2026-11-11, left faction moves on markets, traders going broke and caravans after the weekly turn. The books give no rules for any of them; the nearest is Influence standing in for an Ability on a roll to sway the mortal world (V20 p. 115, printed). Four moves are built. Tax: a faction that holds a place in the market, or rules the domain, with 2 dots of Influence over the law (crown, political, bureaucracy, legal or the Church). Monopoly: a faction that holds a place there, with 3 dots over trade (guild, finance, industry or transport) and Resources 3, on one kind of goods. Smuggling: a faction with 2 dots in the underworld or the street, where another faction's tax or monopoly stands. Raid: a faction with 2 dots of Retainers, or of military or police Influence, against a market held by a faction it stands badly with. The moves go by the words of the year, from a market toll and robber knights in 1197 to a corporate levy and road gangs in the World of Future Darkness. The market code reads factions from WoDX NPC and never changes them: no dots and no standing move by themselves.

Reverse: set Factions act on markets to Off.

## B2381. What a tax and a monopoly do (2026-11-12, house rule)
A tax is light, heavy or crushing: it adds 0.1, 0.2 or 0.3 to the price index its goods would otherwise settle at. A tax on every sale leaves money itself alone. A monopoly adds 0.3 to its kind. Smuggling by another faction halves what they add. Together they add no more than 0.6. The weekly turn drifts each price toward that goal at its usual pace, so a new tax takes some weeks to be felt in full.

Reverse: edit MONOPOLY_SHIFT and SHIFT_CAP in market-moves-rules.mjs, TAX_RATES in market-rules.mjs.

## B2382. Raids (2026-11-12, house rule)
The raiders roll their force (the better of Retainers and armed Influence, 1 to 10 dice) at difficulty 6; ones take successes away. The guard takes more: the caravan's own guard, or the best Domain security among the factions that hold the market. With a success left, a caravan on the road to or from the market is taken. With no caravan out, a kind of goods on the stalls drops a step, one open trader loses a quarter of the carried till for each success (three quarters at most) and one road is closed a week for each success (four at most). Nothing trades along a closed road, and no caravan leaves on it.

Reverse: edit RAID_DIFF and UNSAFE_MAX in market-moves-rules.mjs.

## B2383. When factions move, and when they wait (2026-11-12, house rule)
With the weekly turn, each active faction that runs itself has one chance in six to make one move, in this order: tax a market it holds (heavy when its Resources are 2 or less, else light), corner the dearest kind it can, raid a rival's market, smuggle past a rival's tax. No market takes more than one new move a week. A move waits in the approval queue when a player character stands in the market or belongs to the faction; in Suggest every move waits. Other moves apply with one card and an Undo. Factions the players run make no market moves by themselves. A standing move lapses when its faction is gone or idle or has lost the place or the dots it needed. A move the Storyteller sets by hand stands whatever the dots, until the Storyteller ends it or the faction is gone. A heavy or crushing tax that has stood eight weeks starts talk in the rumour network, once.

Reverse: set Factions act on markets to Suggest or Off; edit CHANCE in market-moves-rules.mjs.

## B2384. A shop's week (2026-11-12, house rule)
Each week a trader's shop costs a quarter of the month's plain wage to keep, and in a normal week takes three tenths more than that. Takings follow the supply of the kinds the shop's stock list sells (none 0.2, short 0.7, normal 1, plenty 1.1), less the taxes on them, and less 15% under a monopoly held by a faction the trader does not belong to. So a heavy tax can be borne in good times, and a crushing tax or a lean season cannot. A gain goes into the till, up to six months' wages; a loss comes out of it.

Reverse: turn off Traders can go broke; edit KEEP_SHARE, MARGIN and SUPPLY_TAKE in market-moves-rules.mjs.

## B2385. Going broke and opening again (2026-11-12, house rule)
A week the till cannot cover puts the shop a week behind; a good week pays off a week of arrears before it fills the till. At four weeks behind the shop shuts and draws no new stock. Where a player character stands in that market the shop stops a week short and waits for the Storyteller in the approval queue. A shut shop opens again once it has stood shut eight weeks and trade is good (a factor of 0.95 or better), with its arrears cleared; a faction there with 2 dots over trade is named as its backer, a hook the Storyteller may use. The Storyteller can shut or open any shop by hand in the Markets window.

Reverse: edit BROKE_AT, REOPEN_AFTER and GOOD_TRADE.

## B2386. Caravans (2026-11-12, house rule)
With one week played as it happens, the goods linked markets trade leave as a caravan, one for each direction of a link. It ships the kinds that will lift a supply where it is two steps short, and carries up to three kinds that are dear at the far end. The sender gives up its goods at once; the market in want gets them when the caravan arrives, and no more of a kind is sent there while one is on the way. Over a longer span (a skip, several weeks at once) goods arrive at once as before, since the caravans have come and gone. Off, the turn is as it was in 0.48.

Reverse: turn off Caravans carry the trade between markets.

## B2387. Freight by era (2026-11-12, house rule)
A pack train makes 25 km a day until 1499, a wagon train 30 km until 1839, a goods train 250 km until 1919 (wagons under 20 km), a lorry convoy 500 km until 2019, an automated freight convoy 700 km after that and in the Future Darkness branch. The distance is the way across the country map when both markets have a place on it, else the place's own distance, else 40 km. A caravan is on the road at least a day and at most twelve. It hires one guard, two when its sender is held by a faction with 3 dots of armed followers.

Reverse: edit FREIGHT, DEFAULT_KM and MAX_DAYS in caravan-rules.mjs.

## B2388. Lost caravans (2026-11-12, house rule)
A caravan a raid takes, or one the Storyteller marks lost, delivers nothing. Every kind it carried grows dearer by 0.1 where it was bound, and the traders there start talk of it. It stays on the Caravans list for a week.

Reverse: edit LOSS_SHIFT in caravan-rules.mjs.

## B2389. Caravans on the map (2026-11-12, house rule)
A caravan has a place on the road at every hour: the ground it is crossing where the road runs over the country map, else how far along it is. A character who travels between two markets while a caravan is on that road gets a line in the Storyteller's log, with which way it is going and its guard; what happens when they meet is play at the table. A caravan stands in its market of arrival for two days, and WoDX Interactables 0.33.0 gives living tiles the condition "a caravan in town" for the scenes of that market.

Reverse: clear the condition on the tile; the log line goes with the Caravans setting.

## B2400. Playing alone: who holds the Storyteller's seat (2026-11-12, Ben's pick)
WoDX works things out on the active Storyteller's browser, so one person playing alone needs something in that seat. A hidden browser on the PC signs in as the Storyteller (tools/solo/seat.mjs) and the person logs in as a player, so Foundry's own permissions keep whispers, sheets and hidden rolls from them. A curtain over a Gamemaster login was turned down: it hides nothing that a click cannot show. In the game the mode is called The Lone Chronicle. Study and picks: https://claude.ai/artifact/GDP2Z5nHQ9ZbDjyJbnQtFy.

Reverse: do not start the seat; the module is off everywhere but where it is switched on.

## B2401. Its own module, and never the Live world (2026-11-12, Ben's pick)
The mode lives in wodx-solo, enabled only in a world played alone (a new world, rothenstein-solo, made from wodx-template; the testbed for tests). The module refuses to act in rothenstein-live whatever its setting says, and in any world that is not a WoDX world. The release bundle carries its files like any other module; it stays off in the Live world's module list.

Reverse: leave the module off.

## B2402. One switch for the automation (2026-11-12, Ben's pick)
The setting The Lone Chronicle sets NPCs in combat, routines and factions to Auto, turns to end for everyone, fights to start by themselves, New Night at dusk, sunlight rolled and applied, the night drawn at dusk, light-touch mode off and no cap on NPC proposals, and gives every kind of approval but a player's request a standing rule. The values it replaced are kept and put back when the switch goes off; a setting changed by hand in the meantime is left as it is.

Reverse: turn the setting off.

## B2403. A choice nobody is there to make (2026-11-12, Ben's pick; the picking rule is a house rule)
After a short wait (4 seconds; a setting) the seat answers a card whispered to the Storyteller or a window opened there. It presses the button that goes ahead (Accept, Approve, Start the fight, Apply, a "Let ... pass", New Night, Yes, Continue, Roll, OK), or the only button that is not a way back. It never presses Undo, Reject, Delete, Cancel, "Do this instead" or the like, and with several unknown choices it presses nothing. Everything that waited goes in a log the player is not shown. A player's request stays in the queue until the oracle is built.

Reverse: turn off "The seat makes the choice"; the seat then only writes down what waited.

## B2404. The seat follows the player (2026-11-12, Ben's pick)
The seat views whichever scene the player views, because who an NPC can see and reach is read from the Storyteller's map.

Reverse: none needed; it only changes what the hidden browser looks at.

## B2405. Order of the rest (2026-11-12, recommendation taken; Ben left these three unanswered)
Step 2: the solo world, the player's panel (time, travel, stuck, the curtain), fights that end by themselves. Step 3: the oracle, leads, encounters on the map, card scenes. Step 4: the director, experience, the recap. Step 5: frenzy, torpor, death and heirs, sleeping through the years. A copy of the solo world is kept each time it closes; none is deleted without Ben's word. West Marches stays on hold; the seat is noted there as the missing piece for downtime. Priority: step 1 now as a test tool, the rest as priority 3 after Interactables.

Reverse: reorder in the Master Plan.

## B2406. The solo world is updated with Live (2026-11-12, Ben)
Once The Lone Chronicle is complete, the solo world gets each release at the same time as the Live world, from the same bundle, and nothing in between. Every world in the PC's Foundry data folder shares one set of modules, which are the testbed's builds, so the solo world gets a Foundry user-data folder of its own with its own modules, on another port, under the same license. It never runs while the testbed runs. Until the mode is complete it is built and tested on the testbed like everything else.

Reverse: point the solo world back at the shared data folder.

## B2420. The anachronism check reads the maps (2026-11-12, Master Plan leftover, priority 1)
The check built in Sheets 0.8.0 read only what player characters carry; the plan left "vehicles and tools placed on the map" open. Sheets 0.14.0 reads every scene's walls and tiles through WoDX Interactables' own tables (datedParts in interact-rules.mjs), so the years stay in one place: mounts and vehicles, telephones, radios and sprinklers, electric light switches, live wires, keypads and alarms on doors and containers, and each line inside a container, looked up as the Possessions tab looks up an item (Gear by era by link or name, a world item, the everyday goods). As on the sheets, only what the jump changed is raised. The card groups the rows by scene and shows at most 60; the rest are counted. Traps, clues, hiding places, climbs, targets and sacred things carry no year and are left alone: a relic is meant to be old. NPCs' own possessions are not read; Pass the Years is where they change.

Reverse: turn the world setting "Anachronism check" off, or pass maps: false to report.

## B2421. Kept on the map (2026-11-12, house rule)
Keep it on a map row writes flags.wodx-sheets.keepOutOfEra on the wall or tile, or adds the line to flags.wodx-sheets.keptGoods for one line inside a container. Sheets writes only its own flags. Interactables reads the first: a kept thing works in any year, so a time-lost motor car can be driven in 1850, a kept telephone rings and a kept keypad can be worked. Before this, a thing before its year offered only a note.

Reverse: clear the flag on the tile; drop the kept test in characterFor.

## B2422. Antiques and keypads by year (2026-11-12, house readings)
The books give no years for these. A carriage or coach on a map is a rare antique after 1930 and an oil or gas lamp after 1950 (ANTIQUE_AFTER); keypads, card readers and electronic alarms appear in 1970 (ELECTRONIC_FROM), the year Interactables already used for them. Horses, carts, rowing boats, torches, candles, lanterns, bells, mirrors and windows belong to every year.

Reverse: edit ANTIQUE_AFTER or ELECTRONIC_FROM in interact-rules.mjs.

## B2423. Out of their time, on demand (2026-11-12)
The Storyteller's hand gets "Out of their time": one card of everything on the sheets and the maps that does not belong to the year now, whether or not the clock moved. It is for a map brought in from another age or a scene dressed by hand. It works in the Live world too, since it only runs when pressed and changes nothing until Keep it is pressed.

Reverse: remove the addTool call in anachronism.mjs.

## B2430. Era kit music comes from free sources only (2026-11-12, Ben)
Ben chose free sources only and took every recommendation on the music sources desk. Dark Ages and Renaissance: Scott Buckley (CC BY 4.0) beside the project's own tracks. Places and weather: Tabletop Audio (CC BY-NC-ND 4.0). Victorian to Long Night: Scott Buckley, Soundimage.org and Kevin MacLeod, picked per mood. Music heard in the scene: Musopen public domain recordings, checked track by track. Future Darkness: Soundimage sci-fi and looping synth. Freesound sounds under CC0, CC BY or CC BY-NC (the game is non-commercial). No paid libraries and no subscriptions. The sorter in tools/atmosphere refuses any other source. Sources and terms: docs/MUSIC-SOURCES.md.

Reverse: add a source to SOURCES in tools/atmosphere/sort-downloads.py after reading its terms.

## B2431. Audio files live in the Data folder only (2026-11-12, Ben)
Downloaded music and ambience go in the Data folder's wodx-kits folders, never in the repo or a release bundle, since most of these licences forbid passing the files on. Copying kits to Live is a Live change and waits for Ben.

Reverse: none needed; files can be added to the repo later if a licence allows it.

## B2432. The credits journal is open to every player (2026-11-12, Ben)
WoDX · Asset credits is readable by everyone at the table, and only the Storyteller edits it. It also lists files a kit's credits.json names that no playlist holds, such as music heard in the scene.

Reverse: set the journal's default ownership back to None.
## B2440. Riding and driving in a fight (2026-11-12, Master Plan leftover, priority 3; house rule)
Ways of moving left three things open; this is the first. Outside a chase a token at the reins of a mount or vehicle tile now moves at the mount's pace in a fight, not its own: the same full pace a chase gives that way in that year (a horse 50 yards a turn, a car by its chart), held by the ground's caps (30 for hooves in town streets). The ground is the scene's last chase ground, else flags.wodx-interactables.ground on the scene, else town streets; a boat is always on the water. With no dot in Ride, Drive or (for oars) Athletics the limit is half. The rider's wounds do not slow the mount, and the walk-and-attack limit does not apply. A passenger is carried and spends none of their own movement; moving on their own is getting off, as before. The books give speeds only for chases, so the fight figures are a house reading of them.

Reverse: remove the ride branch in movement.js moveCheck; turn the whole feature off with the world setting for ways of moving.

## B2441. In the saddle, aboard a vehicle (2026-11-12, house rule)
Two new stances. In the saddle (a horse, a mule, a motorcycle): shots from it +1 difficulty, Stealth +2, a hand-to-hand blow down at someone on foot -1, and someone on foot striking up at the rider +1; two riders meet level, and the saddle's edge is never added to higher ground. Aboard a vehicle (a cart, a carriage, a car, a boat): blows and shots +1, dodging +2, Stealth +2, and shots at those aboard +1 for the sides. A rider who is knocked down counts as prone; the Storyteller takes them off the mount. The books have no table for this; the mounted-combat pages of V20 Dark Ages are on the book check list.

Reverse: delete the mounted and aboard rows of STANCES in movement-rules.js.

## B2442. The mounted charge on a map (2026-11-12, house reading)
V20 Dark Ages p. 399 gives a rider who catches someone at speed one more damage die for each turn spent building speed, five at most; WoDX already uses it for the first blow after a chase. A map has no turns of building speed, so in a fight the count is ground covered: a rider on hooves, at the reins, adds one damage die to a hand-to-hand blow for each full 10 yards ridden this turn before it, five at most. A passenger, a cart, a motorcycle and a car add none.

Reverse: set CHARGE_MAX to 0 in movement-rules.js.

## B2443. Weight that slows a swimmer (2026-11-12, house rule)
WoDX keeps no weights on things (ruled out with the Cataclysm study), so a swimmer's load is counted in steps: one for each point of Dexterity penalty on worn armor, plus a burden of 0 to 3 set from the token HUD (nothing that matters, a pack or a long weapon, a heavy load, all they can lift). Strength and Potence together of 4 or more take one step off, 7 or more two. Each step takes a quarter off the swimming speed and adds 1 to the difficulty of blows, dodges and footing in the water (3 at most). At four steps there is no swimming: the character goes under, breath runs as for anyone under the water, and those who do not breathe walk the bottom. Water-walkers and bodies of mist carry nothing. Implants weigh nothing. The burden does nothing on dry land.

Reverse: remove the load arguments in movement.js; the burden flag is flags.wodx-combat.load on the actor.

## B2444. The senses read how a character moves (2026-11-12, house rule)
A look, a listen or a smell now starts from where the character is. Flying: sight 1 easier and the eye reaches twice as far, hearing and smell 1 harder. Low to the ground or swimming: the eye reaches half as far (swimming also hearing +1, smell +2). Under the water: sight and hearing +2, the eye reaches 8 yards, no smell. Wading: hearing +1. In the saddle: the eye reaches half as far again, hearing +1. Aboard a vehicle: hearing and smell +1. Inside the earth: no sight or smell, hearing +3. The sight numbers are the ones WoDX Combat already gives a Perception check, and a test keeps the two in step. One authored line for the stance comes first in the answer. Someone prone or under the water is no longer counted among the people in view at a glance: a closer look with 1 success (2 under the water) picks them out. Who sees them rolls each watcher at 6 plus their own sight change plus the hider's, and the hider at 6 plus their own Stealth change. The 28 new lines (25 for the stances, 3 for someone keeping low) wait for Ben's reading with the other line tables.

Reverse: have stanceOf in the Senses main.mjs return "standing".

## B2445. The book check on riding and loads (2026-11-12)
The PC read the books (project-files ride-load-book-check.md). Taken up: in the saddle no Ability counts for more dots than the rider has in Ride (V20 Dark Ages p. 399), applied to attack pools on hooves with a saddle, using the Ability the chase uses for that mount. The mounted charge's page is 399, not 398. Left as they are: the charge by yards (the book counts turns of building speed, which a map does not have); the saddle's -1 down and +1 up (no book gives a height figure for a rider); the swimmer's load (no book has swimming in armor; V20 p. 259 and V20 Dark Ages p. 334 count pounds per Strength dot, and WoDX items carry no weights); the senses by stance (no book has senses under water). Not built, for Ben to say: the mount dodging once a turn for its rider and the rider using the mount's Attributes (V20 Dark Ages p. 399), Stamina + Ride to keep the saddle when hit and the lance rules (Dark Ages: Vampire pp. 244-245), a moving shooter at +1 (M20 p. 419) in place of the house +1.

Reverse: have rideCapOf in movement.js return its plain answer.


## B2470. The campaign around a siege (2026-11-12, Master Plan leftover of Battles and sieges, priority 3)
Battles and sieges left foraging, keeping order, sapping in yards and the siege engines open. WoDX Storyteller 0.50.0 adds them as a campaign a siege can carry (Set up the campaign in the Battles window; nothing changes for a siege without one). Everything is rolled with the week of siege and comes back with its Undo. Book basis: Spoils of War pp. 40-42 (printed; pdf = printed + 1) for foraging, order, sapping, countermining and building and using engines, and pp. 33-34 (printed) for the siege weapon and fortification tables, read on the PC on 12 November 2026 (project files battle-book-check.md, book-checks-2026-11-12b.md). Naval battle waits on a reading of the ship table.

Reverse: remove the campaign field from normBattle and the W.week call in battles.mjs week(); old sieges keep working.


## B2471. A week's foraging and the besiegers' food (2026-11-12, house reading)
The book has each foraging team's leader roll Perception + Survival twice a day; WoDX rolls one leader's pool 14 times a week for all the foragers, each success times the foragers being man-days of food, at the book's 4 to 9 by the land. The besiegers need 7 man-days a man a week. A supply line carries a share of that by the year (house rule): wagon trains half, boats three quarters, the railway from 1840, lorries from 1915, an airlift from 1940 and drone convoys on the Future Darkness branch all of it. A surplus fills the camp's stores in days; a shortfall eats them; with none left the camp is hungry and loses a point of resolve that week, as the garrison does.

Reverse: set the supply line to nothing and turn foraging off in the campaign.


## B2472. Keeping order by pay and supply (2026-11-12)
Spoils of War p. 40: a weekly Charisma + Leadership (or Manipulation + Intimidation, typed in as the pool) at 6, needing 1 success well paid and supplied, 2 normal, 4 poorly; each success short adds 1 to every army roll the next week. WoDX keeps that as the side's unrest, added to the commanders' battle rolls and the siege works. Rolled at the end of each week for the week to come. By default the supply follows how the side was fed that week (a hungry camp or an empty storehouse is poorly supplied) and the pay box; the Storyteller can set it. A botch counts as no success (house rule).

Reverse: turn order off in the campaign; unrest goes back to 0 with Undo.


## B2473. Mines and countermines in yards (2026-11-12)
Spoils of War pp. 41-42 as read: planning on Intelligence + Leadership at 6 (7 or 8 for bad ground), digging Strength + Crafts weekly at 50, 25 or 10 yards a success by ground, the charge rolling Intelligence + Leadership plus a die per planning success for 3 unsoakable health levels a success; listening each day at 2 per 10 yards; countermining as sapping, twice as fast without shoring when any failure brings it down. House readings: the dig roll is at 6 (the book gives none); a botch in a mine loses a quarter of it, at least a week's worth; a mine fires by itself when it reaches the walls; the countermine has to cover the yards between the wall and the mine's head; powder adds 2 dice to the charge from the Hussite age and high explosive 4 from 1860.

Reverse: give up the mine in the window; the charge dice are chargeDice() in siege-works-rules.mjs.


## B2474. Siege engines and guns (2026-11-12)
Building and using follow Spoils of War p. 41: materials Perception + Crafts at 7 each day until the successes reach the engine's damage, then Intelligence + Crafts at 7 each week to the same number, a botch wrecking it; an engine shoots with Intelligence + Leadership at 6 plus its step, damage its dice plus the extra successes, against the walls' soak where each soak success counts as 2. House readings: one telling attack a day per engine (the book's turns are too fine for a week of siege); a Greek fire spigot against a wooden wall meets half soak; an engine can be marked ready when it was brought in built. The engines of the book stay to 1450-1650; the bombard (1380), siege cannon (1500), mortar (1550), rifled siege gun (1860), heavy howitzer (1914), bombers (1936), guided missiles (1990) and the Future Darkness railgun battery (2030) are WoDX figures.

Reverse: remove the engine from the list; the figures are ENGINES in siege-works-rules.mjs.


## B2475. Walls and the breach clock (2026-11-12, house rule)
The walls come from the fortification table of Spoils of War p. 34 (soak and health levels), and the siege starts with walls by where the garrison stands: field works a palisade, a walled town a medium wall, a castle a heavy wall, a bastion fort the star fort's bastion and curtain, bunkers a concrete bunker line. The bastion trace (1530), earth ramparts (1600), concrete bunkers (1914) and reinforced concrete (1940) are WoDX figures. Damage from engines and mines fills the breach clock in proportion to the walls' health levels, on top of the works roll the siege already had.

Reverse: pick no walls in the campaign; the breach then moves by the works roll alone.


## B2476. A ditch or moat (2026-11-12, house rule)
The book says a ditch or moat stops engines and troops until it is filled. WoDX has the first 4 successes of the works go into the ditch before the breach moves, and keeps rams, mice and crows from the walls until it is full. Mines go under it.

Reverse: untick the ditch in the campaign.


## B2477. What the campaign leaves for later (2026-11-12)
Not built: scouting and the campaign strategy roll (pp. 40-41), siege towers, the defenders' boiling oil, quicklime and sand at the walls during an assault (p. 33), and filled towers. Logged in PENDING-REVIEW.md. Naval battle was built afterwards as Ships at sea (B2480-B2487).

Reverse: nothing to reverse.


## B2480. Ships at sea, its own window (2026-11-12)
A fight between two ships is its own window, "Ships at sea", on the Storyteller's hand, kept in the world setting wodx-storyteller.naval, and not a kind of battle: the steps are minutes and hours, not phases and weeks, and the numbers are a ship's, not an army's. Each step posts a card in words for everyone and the dice for the Storyteller, keeps a snapshot for Undo, and nothing moves the world clock until "Let the time pass". Rules in naval-rules.mjs (pure), window in naval.mjs.

Reverse: remove the hand tool; stored fights stay in the setting.


## B2481. The ships (2026-11-12, book and house rule)
The seven ships of Spoils of War p. 40 (longship, the small and large cog, dromon, sagitta, tarida, qayiq) with the book's Speed, Maneuverability, crew, arms, soak and health levels, offered until 1300 to 1450. After them WoDX figures: a gun galley with a ram (1450-1720), carrack, galleon, ship of the line, frigate, steam ironclad with a ram, torpedo boat, destroyer, dreadnought, cruiser, motor torpedo or patrol boat, missile frigate, a small boat for every era, and a drone corvette on the Future Darkness branch from 2030. Guns are sized to the Great War's: culverins, broadsides and carronades roll by the bank, shell guns and turrets by the barrel.

Reverse: change SHIPS and GUNS in naval-rules.mjs.


## B2482. The chase and the turn for position (2026-11-12, book)
Every 4 hours each captain rolls Wits + Seamanship at 7 and adds the ship's Speed; each point the chaser wins by closes 500 yards (Spoils of War p. 42). Oars are rowed at most 12 hours a day, each point of extra oar Speed costing 3 more hours (p. 40). The turn for position is resisted Intelligence + Seamanship at 8 less Maneuverability, the net going to initiative. Navigation is Intelligence + Seamanship at 6 in sight of land and 9 out of it, 1 less each for a compass and a pilot's book. House rule: a quarry 5,000 yards off is lost from sight and gets away.

Reverse: change PURSUIT_YARDS or LOST_AT.


## B2483. Shooting (2026-11-12, book and house rule)
The book's engines on a ship shoot with Dexterity + Archery at 6 plus the engine's step, with its damage from the siege table of p. 33. Guns follow Wraith: The Great War p. 77 read for the living world: Heavy Weaponry at 6, 7 or 8 for short, medium and long range, one roll per bank or barrel, 1 easier with central fire direction (destroyers and later). Torpedoes hit at 7, the target dodges with Wits + Seamanship at 8, and their damage rolls at 4 (p. 78). Damage is the weapon's dice plus the extra successes; the ship soaks at 6 (house rule), and fire from an engine with aggravated damage is not soaked.

Reverse: change GUNS, or the soak line in fire().


## B2484. Damage, flooding and sinking (2026-11-12, book)
Each health level lost costs a point of Speed and of Maneuverability. Below 0 Speed the ship floods a level every quarter hour; at 0 health levels it sinks and the fight ends (Spoils of War pp. 40, 43).

Reverse: nothing to reverse; these are the book's.


## B2485. Ramming and breaking away (2026-11-12, book and house rule)
From Wraith: The Great War p. 79-80: only from alongside, opposed Wits + Seamanship at 6 (the book's helm Ability read as Seamanship for ships of the living world); the rammed ship takes 3 dice a net success, 5 from a ship built to ram; damage rolls at 5. The rammer takes 3 dice a net success, or 1 when built to ram (house rule; the book only says such ships suffer badly). Breaking away or holding alongside is the first to 5 successes at 6. Spoils of War has no ramming: the galley's beak is a boarding hook, so only the gun galley and the ironclad are built to ram.

Reverse: change the ram flags in SHIPS.


## B2486. Repair and boarding (2026-11-12, book and house rule)
Repair is an extended roll every quarter hour, needing successes equal to the damage, and mends a level when it gets there (Spoils of War p. 43); WoDX rolls it at 6 with the carpenter's dice and a die for each of up to 6 helpers. Boarding is fought with the usual combat; the Storyteller enters who is down, and the defenders yield once half of them are out and they are outnumbered two to one (pp. 42-43).

Reverse: change the repair roll in quarter().


## B2487. What ships at sea leaves for later (2026-11-12)
Not built: fleets (more than two ships, moving at the slowest ship's speed, split pools), spotting range and the watch, special shot (chain shot, fire), the Shadowlands' relic ships of the Tempest, Umbral ships, and ships tied to battle maps or tokens. Logged in PENDING-REVIEW.md.

Reverse: nothing to reverse.

## B2490. The line actor types are not deprecated here (2026-11-12, Ben's request)
The World of Darkness system names seven of its actor types "(deprecated)" (Vampire, Werewolf, Mage, Changeling, Hunter, Demon, Changing Breed) because its author is moving to one PC type. WoDX builds every line sheet on those types, so the fork's English type names drop the word. Nothing else about the types changes. Fork 7.3.2-wodx.9.

Reverse: put the seven TYPES.Actor lines in system/worldofdarkness/lang/en.json back.

## B2491. One arrangement for every character and item sheet (2026-11-12, Ben's request; house layout)
Ben asked for the arrangement to be fixed and the look left alone. A snapshot of 57 testbed sheets (tools/gate/gateuisnap.mjs) showed four things. The title bar held up to ten worded buttons, so the character's name had 2 pixels left and one button wrapped: the buttons are now icons that keep their words as a tooltip, and the name always has room. The Possessions, Relationships, Body and Storyteller's notes sections lay on the bare sheet background while the system's sections sit in panels: they take the same panel. WoDX fields and buttons there were darker than the system's fields, and four buttons had dark words on a dark sheet: they take one shade and the sheet's own ink, in light and dark mode. Item sheets kept every field 200 pixels wide in a 650 pixel window and drew a white text editor on a dark sheet: fields share the width in columns, and the editor follows dark mode. All of it is in modules/wodx-sheets/styles/wodx-layout.css, loaded after the line skins; no colour, font or ornament of a skin changes. Sheets 0.15.0.

Reverse: take styles/wodx-layout.css out of the module's styles list and remove nameHeaderButtons in main.mjs.

## B2492. List headings and section titles keep to their own space (2026-11-12, house layout)
In the lines whose heading font is wide (Wraith, Dark Ages: Werewolf, Demon) the narrow column headings of the weapon, armor and effect lists ran into each other, and a long section title wrapped over the first row under it. Narrow column headings are 14 pixels in every line; a section title's plate grows with its words.

Reverse: remove section 5 of wodx-layout.css.

## B2493. A pick shows its chosen entry (2026-11-12, house layout)
In 70 WoDX dialogs the label took two thirds of a row and the pick one third, so the chosen entry was cut off ("Automatic: from the tokens' fa"). In every WoDX window a pick is now as wide as its entries need and drops under its label when both do not fit; a pick in a table column keeps room for a short entry. Chronicle 0.45.2 (the shared stylesheet).

Reverse: remove the last block of modules/wodx-chronicle/styles/wodx-chronicle.css.

## B2494. The UI fit check looks for six more things (2026-11-12)
tools/gate/fit-audit.mjs holds checks that run on any drawn window: a control cut off with no way to scroll to it, words that do not fit their box, two controls drawn over each other, words over words, a field or button of another shade than the rest of its kind, and words too close to the shade behind them. tools/harness/ui-fit.mjs runs them on every module window at three screen sizes; tools/gate/gateuisnap.mjs runs them on every kind of sheet in Foundry and saves the drawn sheets. A pick wider than 400 pixels, or as wide as its row, passes even when its entry is longer, because the layout has no more to give.

Reverse: remove the audit call in ui-fit.mjs.


## B2495. WoDX tab buttons take the line's tile colours (2026-11-12)
The Relationships and Body tab buttons were plain glyphs beside the line's own tab buttons, which are a white glyph on a tile in the line's colour, so they read as darker. WoDX Sheets 0.15.1 reads the tile and glyph colours from the sheet's own first tab button and gives them to its buttons, so every line and skin matches without a list of colours. The fit check reports a module tab button whose tile differs from the sheet's own.

Reverse: remove section 6 of wodx-layout.css and the colour lines in extras.mjs.


## B2500. The residents of a generated town (2026-11-12, Master Plan leftover of maps and a town generator)
A map adopted from the town or village generator keeps each building's household as roles only (B620s, Interactables 0.21.0). WoDX NPC 0.46.0 turns them into people: "Seed the residents" on the scene's right-click menu or in the Storyteller's hand shows every household with the names it would give, the Storyteller ticks the ones to make, and each person gets a sheet from WoDX Creation's People generator, a routine and their household. The routines then put each resident where the hour says, by the same engine as every other NPC. Names follow the year and homeland in play, so the same town seeded in 1197 and in 1995 gives other people. Households already seeded are skipped; Draw again gives other names.

Reverse: leave the menu entries unused, or take "residents" out of main.mjs.


## B2501. The routine each role keeps (2026-11-12, house reading)
The first person is the master and keeps the routine of the trade: a priest the canonical hours, an innkeeper the tavern, a merchant or shopkeeper the market day, a guard the watch, a nurse the hospital shift (from 1780), a physician the rounds, a pensioner stays at home, everyone else the labourer's or craftsman's day. A trade kept at home (the crafts, farming, a tavern, a shop, or any building tagged a workplace) has the building as workplace too; later trades such as factory hand, clerk, driver or teacher go out to work at a place of the fitting kind. A partner keeps the master's shop or tavern, else works in the house or goes out; children keep the child's day (school from 1500); elders stay at home; servants keep the household's hours; apprentices and farmhands work in the building; lodgers live there and work elsewhere. Every routine follows the year's hours (B704 to B706).

Reverse: change presetForTrade and planRole in resident-rules.mjs.


## B2502. Names in a household (2026-11-12, house reading)
The household's family name is drawn as a man's, so its male form is known, and each member of the family takes the form for their sex: Czech and Slovak -ý to -á and -ová otherwise (Novák and Nováková, Černý and Černá, Jelínek and Jelínková), a German medieval byname "der Schmied" to "die Schmiedin", others unchanged. Servants, apprentices, farmhands, lodgers and clerks keep their own names. In a medieval Jewish household the master is ben or bat the household's name and the children ben or bat the master, when the master is a man. A partner is of the other sex nine times in ten. Only names follow sex; every text about a resident stays gender-neutral (B48).

Reverse: change nameHousehold, kinFamily and czechFeminine in resident-rules.mjs.


## B2503. Ghoul households and the building's owner (2026-11-12)
Any household can be made the ghouls of one Cainite in the Actors list, through WoDX Creation's ghoul change (V20 Dark Ages ghoul rules in every era, rule 12). The master's name is written as the owner of the building's place when it had none, so trespass, ownership and Match owners read it.

Reverse: pick Mortals for every household; clear the owner on the place.


## B2504. Remove the residents (2026-11-12)
"Remove the residents" deletes the sheets one seeding made on that scene and their tokens on every scene, clears the regions' record and an owner it filled in, after a confirmation that names how many. Only actors carrying the scene's resident record are touched.

Reverse: nothing to reverse.


## B2505. Clergy fit their church (2026-11-12, house reading)
The testbed seeded a chapel's priest as "Bella bat David", because the People generator draws any origin and sex. Residents now draw again, up to eight times, until the person fits the role: Catholic priests, monks, friars, deacons and canons are Christian men; nuns, abbesses and prioresses Christian women; rabbis Jewish (men before 1990); Protestant parsons, vicars and ministers men before 1950, either after. The household's name comes from a man of the master's own origin, and kin keep the household's faith (Jewish or Christian) until 1946. When no draw fits, the last one stands.

Amended 2026-11-12 (NPC 0.47.2, Creation 0.15.1, after the testbed gate): drawing again did not always find a Jewish partner, since the generator draws few Jewish people, so a Jewish weaver was paired with a Christian. Before 1946 the kin of a Jewish household are now asked of the generator by origin; from 1946 a mixed household may still be drawn.

Reverse: change wantsFor and the sameFaith test in resident-rules.mjs; drop the origin asked in nameHousehold.

## B2450. How much runs by itself: three levels (2026-11-12, Ben's desk sa1, sb1, sb2)
WoDX Chronicle 0.46.0 adds one choice in the approval queue window: Hands on, Balanced or Hands off. Hands on is whatever the Storyteller had set; nothing changes until another level is picked. Balanced turns on the Auto choices that come with an undo card (NPCs in combat, routines, faction turns, fights starting and ending, the weekly market turn and faction market moves) and the queue table of B2451. Hands off is the Lone Chronicle's preset without its seat, plus targeting for everyone. The window lists every change before it is made. The values from before the first move are kept and Hands on puts them back, except a setting changed by hand since, which stays. While the Lone Chronicle is on the level is left alone. Lists in automation-rules.mjs. Priority 3, with the Lone Chronicle.

Reverse: pick Hands on; or remove automation.mjs from Chronicle's main.mjs.

## B2451. A "when small" standing rule per kind of proposal (2026-11-12, desk sa2, q1 to q32)
A kind in the approval queue can wait, pass on its own, or pass on its own when small. Each kind's own handler says what small means (a small() function). At Balanced: on its own for walls broken through, people from a lifepath and new people, a step before the First Night, the night's draw, solo results and beats, between nights and a Gauntlet that moves; when small for a merit or flaw coming into play, magic, NPC attitude, factions, XP spends, markets, time for a long action, travel, downtime and Otherworld journeys; every story choice waits. A proposal that passes on its own under a small rule, or of a kind with an undo, gets a Storyteller card saying so, with Undo where the kind has one.

Reverse: set each kind back to Waits in the queue window.

## B2452. The Waiting tray (2026-11-12, desk sa3, sa8)
One window (the hourglass on the token tools, and Waiting on the Chronicle Clock) lists every queue entry and every card whispered to the Storytellers in the last twelve hours that still has a button nobody pressed, oldest first. Take the recommended approves a queue entry or presses the card's safe button, chosen as the Lone Chronicle's seat chooses (the rules moved from WoDX Solo to waiting-rules.mjs). It never presses Undo, Reject, Delete or Edit. The end-of-night wrap-up names what is still open. No clock passes anything on its own.

Reverse: remove waiting.mjs from Chronicle's main.mjs.

## B2453. What small means, kind by kind (2026-11-12, house rule)
Merit or flaw: every trait in it only changes dice or difficulty. NPC attitude: one step, not down to Hostile or Hunted. Factions: what the faction Auto mode already counts as small (B86). Markets: no change the Auto mode would hold back. Time for a long action: a day or a night at most, nobody in a fight. Downtime: a listed kind, a week or less. Otherworld journey: no storm, not a great journey, no hazard or Maelstrom on a leg. Magic and travel: never, because only what is already past their own Auto rules reaches the queue (witnessed vulgar magic, mind effects, another player's character, more than three targets; a place marked ask first, or a trip into daylight for one the sun burns).

Reverse: change the small() function on that kind's handler.

## B2454. XP spends by the book (2026-11-12, desk sa7, q13)
An Attribute, an Ability (new or raised), Willpower, or a Discipline of the character's own clan (any for a Caitiff), at the cost the sheet gives now and with the points there, passes on its own at Balanced. A new Discipline (it needs a teacher), a Virtue and the Road or Humanity (they need a reason in the story) wait. XP awards are untouched: Ben dropped automatic awards on 8 November.

Reverse: set Experience to Waits in the queue window, or edit byTheBook in wodx-creation/scripts/rules.mjs.

## B2455. Fights end by themselves (2026-11-12, desk sa4)
WoDX Combat 3.21.0, setting "End fights by themselves" (off, Suggest, Auto; Suggest by default, Auto at Balanced and Hands off). A fight is over when one side has nobody standing: down, or gone from the scene. Once that has held for a full turn, Suggest gives the Storyteller a card with End the fight and Auto ends it; the after-action card, the clock and the NPCs' memories follow as when it is ended by hand. A hidden token still counts as there, because an ambusher waits hidden, so a foe that fled while hidden is not counted gone. A fight with one side only never ends this way. This is also Lone Chronicle step 2's "fights end".

Reverse: set the setting to Off.

## B2456. An "ask me first" NPC answers after a wait (2026-11-12, desk sa6)
WoDX NPC 0.47.0, setting in seconds (60; 0 waits for ever). With no pick in time the NPC says the first written line that fits. The Storyteller can still pick once afterwards and that line goes out too.

Reverse: set the wait to 0.

## B2457. Players ask for time to pass (2026-11-12, desk sa5)
WoDX Storyteller 0.52.0, a player button: wait an hour, four hours, rest eight hours or sleep the day through (twelve hours). Every player here tonight who plays a present character is asked; when all agree and no fight is running, the time passes through the same spend the Storyteller's buttons use, so dawn, sunlight and dated events fire as always. One Not now ends it; an unfinished ask lapses after ten minutes. The Storyteller's Agree speaks for the table. The fixed spans work the same in every era. A player may be hidden from the button in Player toolbar buttons.

Reverse: hide the button for every player.

## B2458. Targeting for everyone, at Hands off (2026-11-12, desk sa10)
WoDX Targeting 0.4.0 adds "Automatic for everyone", so players get automatic targets too. Only Hands off sets it; Automatic stays the Storyteller's only.

Reverse: set Targeting back to Suggest.

## B2459. Only a fight where the characters are holds time back (2026-11-12, testbed finding)
WoDX Storyteller 0.52.1. Letting time pass, and the small rule for time for a long action, count a fight only when it has started, one of the waiting characters is in it, and that character is on the fight's scene now. A fight forgotten on another scene no longer stops time everywhere; the Storyteller still ends it by hand or with "End fights by themselves".

Reverse: change fightHolds in spend-rules.mjs.

## B2460. Letting time pass is for the party on the asker's scene (2026-11-12, testbed finding)
WoDX Storyteller 0.52.2. The party is every present character on the asker's scene: a player's own character's scene, else the scene they look at; the Storyteller's is the scene in view. Only those players are asked and only those characters' time passes, so a party split across scenes waits apart, each on its own time (B1961). A fight elsewhere, or characters elsewhere, no longer stop it.

Reverse: change partyAt in spend-rules.mjs, or have table() in pass-time.mjs ignore the scene.

## B2510. The two prologues become seven eras (2026-11-12, Ben picked seven real eras)
WoDX Chronicle 0.47.0. Before the Flood (10,000 to 3101 BCE), The Age of Living Gods (3100 to 1178 BCE), The Age of Burning Palaces (1177 to 801 BCE), The Age of Oracles (800 to 28 BCE), The Age of Silk and Eagles (27 BCE to 476 CE), The Age of Fallen Thrones (477 to 907) and The Age of Gathering Darkness (908 to 1196). Each keeps the prologue rule: chosen only with the era lock, never by date. Each carries the old group (living-gods or classical), the old group's upstream ability set and its music kit.

Reverse: put the two old profiles back in data/eras.json and drop the seven.

## B2511. Old prologue ids open the era that replaced them (2026-11-12)
WoDX Chronicle 0.47.0. eras.json "legacy" maps living-gods to The Age of Living Gods and classical to The Age of Silk and Eagles; getProfile reads it, so a saved lock or active era still works. Modules that key on era ids list both the old and the new ids.

Reverse: remove "legacy" and the fallback in getProfile.

## B2512. Every era takes a World of Darkness name (2026-11-12, Ben asked; naming desk https://claude.ai/artifact/XZE9pqoyZxuy7n54ky8beV)
WoDX Chronicle 0.47.0, Atmosphere 0.13.1. The era ids stay; only the names change, to Ben's picks on the desk (final 2026-11-12 23:38Z): The Dark Medieval, The Long Night, The Burning Times, The Age of Revolutions, The Age of Steam and Shadow, The Wyld West, The Iron Harvest, The Age of Ashes, The Final Nights, The Time of Judgment, The Age of Future Darkness, Time of Future Judgement, and the seven prologue names above. The timeline desk's tabs read the same names.

Reverse: put the old names back in data/eras.json and the kits.

## B2513. The prologue looks at the whole world (2026-11-12, Ben: WoDX is global, not only Moravia)
WoDX Storyteller 0.53.0. The prologue primers name the Americas, Africa and Asia as well as Europe, and Moravia only as one place among many. The prologue timeline adds 70 events outside Europe and the Middle East (China, Japan, India, south-east Asia, the Pacific, Africa and the Americas).

Reverse: restore the old primer lines in setup-rules.mjs.

## B2514. Lifting the lock from a prologue era goes straight back (2026-11-13, testbed finding)
WoDX Chronicle 0.47.1. No date reaches a prologue, so when the Storyteller clears the era lock while a prologue is in force, the chronicle moves to the date's era at once, even with era proposals on. Before, it waited in the approval queue.

Reverse: drop the prologue test in checkEra (eras.mjs).

## B2515. Every prologue era holds at least 300 events (2026-11-13, Ben)
The timeline's 300-event floor applies to each of the seven prologue eras: Before the Flood 303, The Age of Living Gods 302, The Age of Burning Palaces 302, The Age of Oracles 312, The Age of Silk and Eagles 312, The Age of Fallen Thrones 300, The Age of Gathering Darkness 303. The new events are mostly real history from every region, with house readings for the lines where they fit.

Reverse: remove the blocks marked "to 300 events" in r3/living-gods.txt and r3/classical.txt.
## B2520. Building types for the later ages (2026-11-12, Master Plan leftover of maps and a town generator)
tools/mapgen/latertypes.py adds sixteen building types so that every age from 1650 to World of Future Darkness has a house, a shop and an inn of its own being built, with the public buildings a town of the age needs: the passage house, the tolerance prayer house, the workers' colony house, the shop house, the pub with its hall, the bus station, the co-operative store, the family house built to one plan, the corner shop, the distribution shed, and for the future the vending hall, counter bar, street clinic, security post, pod station and data hall. Each is modelled on a kind of building that stood in Moravia in its years, drawn from general knowledge of the type, not from any one plan. The era layers place the public ones from their first year.

Reverse: drop the import of latertypes in eratypes.py.

## B2521. One command makes a settlement for a year (2026-11-12)
tools/mapgen/ddsettle.py runs the town generator for a name, seed, size and year from 1197 to 2099 and writes the maps, their sidecars, the plan and a settlement record beside them: every household with its trade, standing and people, the offices of the age, and the ties between households. The same seed gives the same place. The map side stays in Python because the Dungeondraft maps are made there; Foundry only reads the record.

Reverse: nothing to undo; the older ddtown.py call works as before.

## B2522. Households follow the year from 1781 (2026-11-12, house rule)
Up to 1780 the households stay as the medieval generator made them. From 1781 each household's trade, size and make-up are drawn for the age the year falls in: reform (1781), industrial (1851), republic (1919), socialist (1948), modern (1990), future (2030). The boundaries follow the turns in Moravian life (the patents of 1781, the end of the guilds and the railway age, the republic, February 1948, November 1989). Trades by standing, the size of a household and who lives in it (servants and apprentices early, lodgers in the industrial age, small families late) are a house rule from general history, not from a book.

Reverse: remove the repeople call in organic.py.

## B2523. Public buildings have keepers, not families (2026-11-12, house rule)
A school, station, clinic, post or hall is held by its keeper and staff (a teacher, a station master, a clerk), not by a family with children. A railway station keeps the household the era layer gave it.

Reverse: empty KEEPER in settle.py.

## B2524. Ties between households (2026-11-12, house rule)
The record gives about one tie for every four households: kin in another house, a grown child's house, friends, rivals, debts, and who goes out to work at which building. The draw favours neighbours and like standing. Once residents are seeded, a tie is written on the first household head's sheet as a hand-made relationship (WoDX Sheets' ties), only when both heads exist; a worker's routine takes the workplace when it stands on the same map.

Reverse: untick the kinds of tie at review; they are then never written.

## B2525. Hidden folk are drawn at review, by game line (2026-11-12, house rule)
The record holds only mortals. At review WoDX NPC proposes who is more than they seem, from the number of people: a household of ghouls for about every 300, a vampire's haven for 800 (none under 150 people), Kinfolk for 200 (twice as likely in a village), a hunter for 600, a mage for 1000, a haunted building for 250, a changeling for 700, one of the Fallen for 1500 and only from 1999. The numbers are a house rule, set so that a village has one or two and a city a handful; no book gives them. The Storyteller unticks any or draws again. Nothing is built from them: a seeded sheet or building carries a note only the Storyteller sees, and the splat, tribe or Tradition is the Storyteller's to make.

Reverse: untick them all at review.

## B2526. A block of flats keeps every household (2026-11-12, fix)
Adopting a map kept one household on each building, so a panel block of 48 flats seeded one family. WoDX Interactables 0.35.2 keeps the list on the region and WoDX NPC 0.48.0 seeds each flat's household; such a building gets no one owner.

Reverse: nothing to undo.

## B2527. Household ids carry the settlement (2026-11-12)
With --settle each household id starts with the settlement's id and a full stop (steinfeld-1995-7.cottage-3-household), so a map adopted later is matched to its entered settlement without any setting. A map made without --settle seeds as before.

Reverse: nothing to undo.

## B2528. A settlement enters the world as a journal (2026-11-12)
Entering a reviewed record makes one journal in the folder "WoDX settlements" that no player can read: the place, its households, its ties and its hidden folk. No sheets or tokens are made until a map is adopted and its residents seeded. Removing a settlement deletes only that journal, after asking.

Reverse: remove the settlement under Settlements.

## B2529. Left open (2026-11-12)
The generator's building types, ages, trades and offices are those of Moravia and the Bohemian crown lands; the record says so (region) and the review tells the Storyteller. WoDX covers the whole world (Ben, 2026-11-12), so other regions are open work: each needs its own building types, ages and trade tables in tools/mapgen, chosen with --region. Also not built: the generator's markets and factions for a new settlement (WoDX Storyteller's markets read hand-set scenes), sheets for the hidden folk themselves, and ties inside one block of flats beyond those the record gives. The population the generator reaches still falls short of the figure it aims at for small places; that is the older layout's behaviour and is left as it is.


## B2530. A global World of Darkness: the world's regions (2026-11-12, Ben's rule)
Ben: the whole world is within WoDX's scope, and no work may look only at Moravia, Germany or Europe. WoDX Chronicle 0.48.0 adds world-rules.mjs: 44 regions on every inhabited continent, each with a typical city (latitude and longitude), a climate, a money region and the peoples who live there by age. A Homeland setting picks the chronicle's region and sets the latitude, the part of the world and the people's culture; money is left alone because purses hold sums in the old money. A scene's place flag may name a region; the scene then takes its latitude, and the people generator and the weather follow it there. The rule, the audit and what is still open are in docs/GLOBAL.md.

Reverse: set the Homeland back to Moravia and clear the regions on scenes; the older settings (latitude, chronicle region, where the people come from) still work by themselves.

## B2531. Peoples and names of the world (2026-11-12, house reading)
WoDX Creation 0.16.0, data/people-world.mjs: 39 peoples with given and family names in WoDX's own lists, from history and common use, no book text. Name tables carry no culture, so any region whose mix names a people draws them; a region may also borrow a neighbour's tables (the German lands draw Bohemia's medieval German names). The family name comes first for Chinese, Japanese, Korean, Vietnamese and Hungarian names. Arabic, Malay and Swahili names may be "son of" or "daughter of" a father's name, an Amharic second name is the father's given name, and Turkish names are "-oğlu" until the modern age. Peoples who used no family name have the given name alone. Who lives in each region in each age is a rounded house mix. Regions settled or recorded late (Australia from 1788, Brazil from 1500, the Caribbean from 1492, the American West from 1598, eastern North America from 1607) say from which year WoDX has names; before it the generator borrows the later names and the Homeland notice tells the Storyteller to name people by hand.

Reverse: remove WORLD_PEOPLE_TABLES from PEOPLE_TABLES; edit any list in the WoDX tables folder in the world.

## B2532. Money of the world (2026-11-12, house figures)
WoDX Storyteller 0.54.0: 20 more money regions (France, Italy, Spain and Portugal, the Low Countries, Scandinavia, Poland, Russia, the Ottoman lands, Egypt with the Levant and Arabia, Persia, India, China, Japan, West, East and Southern Africa, Spanish America, Brazil, Australia, the Pacific). Units and their worth follow the coins of each land; wages are rounded house figures on the same footing as the older four (a one-dot worker's month). Lands without coin reckon in goods (cacao beans and cotton cloaks in Mexico, cattle, hoes and beads in southern Africa, plain trade goods elsewhere). North America has no coin before 1607. The books give none of this.

Reverse: change MONIES and COINS in money-rules.mjs.

## B2533. Climates of the world (2026-11-12, house figures)
WoDX Atmosphere 0.14.0: 22 more climates, with southern ones whose summer falls at the turn of the year. With the climate set to follow the region, the weather is the homeland's, or that of the region the viewed scene stands in. The Little Ice Age and the cold summer of 1816 still apply everywhere as Europe felt them.

Reverse: pick a climate by hand in the settings.

## B2534. Tongues and households of the world (2026-11-12)
The list of tongues to learn grows from 30 to 71, speech a character cannot follow has 21 sound sets, and spoken lines look for 37 browser languages (Voices 0.3.2). NPC 0.48.1: a household's women take the listed feminine family name of their people, and kin of a household named "son of" are named for its master in that people's words.

Reverse: trim LANGUAGES and SOUNDS in languages-rules.mjs; drop the FEMININE lookup in kinFamily.

## B2535. Ben's picks on the Global World Desk (2026-11-13, 00:10 UTC)
Ben took the recommended option on all eight scope calls. Money abroad: a money changer with a cut (B2536). Calendars: the holy days of the great faiths by region (B2537). Peoples without names: added one at a time with source notes, each shown on a desk before it ships. The hidden world outside Europe: by the book, V20 line books first, then Revised and 2nd edition; a region the books leave empty stays empty. The 519 new timeline events: the plain history is approved; the eight cards with a World of Darkness reading wait for the book check. Future Darkness outside Europe and Asia: from the Cyberpunk 2020 timeline, after a book check. Finer regions: added only when a chronicle goes there. Weather abroad: each scene far from home has its region's own weather (B2538).

Reverse: answer the desk again (https://claude.ai/artifact/HoDkSxow9oYA5GttPzn1Nn); each build below has its own way back.

## B2536. Money changers abroad (2026-11-13)
Storyteller 0.56.0. Purses keep the home money. A price asked on a scene that stands in another region is worked in the local money by what a day's unskilled labour earns in each place, and the money changer's cut is added on top: 6 in the hundred to 1499, 4 to 1799, 2 to 1913, 3 after, and 5 more on a scene flagged troubled (war, a debased coin), never above 15. Two regions that share a money pay no cut. The cuts are house figures; the books give none.

Reverse: world setting Money changers abroad off; the figures are CHANGER in money-rules.mjs.

## B2537. The holy days of the great faiths (2026-11-13)
Chronicle 0.49.0, faith-rules.mjs. Eight years beside the Western church's: the Eastern church, the Muslim year, the Jewish year, the Hindu year, the Buddhist years of the south and of Tibet, the lunar year of China (under Korean and Japanese names there; Japan on the civil calendar from 1873) and "a count of their own" for peoples whose holy days the Storyteller names. Each region keeps one by the year (REGION_FAITH: New Spain turns to the church year in 1521, the Malay world to the Muslim year about 1500). A scene far from home follows its region, or the year picked for it; the world setting overrides the homeland's. Every faith answers in the shape of the church year, so the house rule Feast and fast days reads all of them: nights of celebration move the curfew to midnight and make hunting in town 1 easier, a fast or mourning kept strictly makes it 1 harder. The nights of Ramadan count as nights of celebration. How strictly each is kept by year (KEPT) is a house reading.

The Orthodox and Jewish years are right to the day. The Muslim year is the counted one and can stand a day off the sighted moon. The Hindu, Buddhist and Chinese years are worked from the true new moon and the sun's place with the modern rules for every age, so an old date can stand a day off, or a month where the old calendars leapt elsewhere.

Reverse: set Whose holy days the chronicle keeps to The Western church and leave scenes' own blank; or turn Feast and fast days off.

## B2538. Weather by region (2026-11-13)
Atmosphere 0.15.0. A scene that stands in another region has that region's weather for the night, rolled with its own seed, so Cairo is dry while Rothenstein has snow. The table's weather (posts, hunting, travel) is that of the active scene; each viewed scene shows and sounds its own. Weather the Storyteller sets on a scene abroad is kept for that region and night only.

Reverse: clear the scene's region in Where this scene stands.
## B2540. The whole Earth as one coarse grid (2026-11-12, Ben asked for a rough map of the Earth made the way Daggerfall makes its land)
WoDX Storyteller 0.55.0 carries the world as 360 by 180 squares, one for each degree (about 100 km at the equator): each square's ground (sea, lake, ice, mountains, plateau, desert, tundra, plain, wetland, other land), the great rivers, and the named ranges, deserts and seas. tools/mapgen/world/build_world.py makes it from Natural Earth, which is in the public domain; nothing comes from a game. It is the far view only. WoDX is global (Ben, 2026-11-12), so this is the base every region's maps and trips can stand on.

Reverse: remove "The world map" from the hand; nothing else reads the grid yet.

## B2541. Every land square has a world region (2026-11-12)
Each land square carries one of 44 region ids, the ids of WoDX Chronicle's world regions. That list gives a region one city and no borders, so the grid is the one place borders are kept. Modern countries are used only to cut the land up, with the large ones split where their regions part (Russia at the Urals, the United States at 100 west, Canada and Alaska's north to the Arctic, Tibet out of China, northern Chile to the Andes). A house reading; the squares can be re-cut in build_world.py.

Reverse: nothing to undo.

## B2542. Journeys across the world by year (2026-11-12, house rule)
A journey between two spots takes the quickest way over the squares. By land: 40 km a day on horseback or with a caravan, 55 by coach and post road from 1650, 350 by motor road from 1925 and 650 from 1960, slowed by the ground (mountains to 45 percent, desert 70, tundra and wetland 50, ice 12). By rail where the railway has reached the region (from 1830 in Britain to 1930 in Persia; 550 km a day, 900 from 1950; a third of that where lines are few). By sea: 90 km a day coasting, 150 under sail from 1450, 380 by steam from 1840, 650 by liner from 1900, with a day lost each time a journey takes ship or lands, and no road through the pack ice. By air from 1935 in hops (3,200 km a day) and by jet from 1958, with two days for the ends. All of it is a house reading of history rounded for a journey told in a sentence; no book gives it. Trips inside Moravia keep the country map (B2330s), which knows its roads.

Reverse: change waysIn, RAIL_FROM and GROUND_PACE in world-map-rules.mjs.

## B2543. The closer view of one square (2026-11-12)
Any square can be looked at closer: 22 by 22 small squares of about 5 km, made from the square and its eight neighbours plus steady noise, so coasts and ranges run on across squares and the same square is the same every time. It uses the country map's lands (plain, vale, hills, upland, mountain) plus sea, lake, ice, desert, tundra and marsh, and a great river's course. It is shown in the window only: feeding it to the trip planner and to the town generator's --at outside Moravia is the next step, not built.

Reverse: nothing to undo.

## B2544. Maps are drawn as night (2026-11-12)
The world map and the closer view use the night palette, as every WoDX top-down map does.

Reverse: change NIGHT in world-map-rules.mjs.

## B2545. The otherworlds that lie over the Earth (2026-11-12, house reading)
The Penumbra, the Shadowlands and the Near Dreaming are the living world seen from the other side, so WoDX Otherworlds 0.20.0 draws them as the world map in another dress. The Penumbra is bright where the ground is wild and dim where it is ploughed and built over; the Shadowlands are grey with black rivers; the Near Dreaming is bright. The dress follows the ground only: the grid does not know cities, battlefields or caerns, so those are not marked.

Reverse: remove a row from MIRRORS in worlds-chart-rules.mjs.

## B2546. The chart of the worlds (2026-11-12, our own arrangement)
Realms with no place on the globe sit on one chart: rings from the living world outward (lying over the world, the near realms, the far realms, the deep) and four sides (the spirit wilds, the high and far reaches, the Dreaming, the lands of the dead), each behind its barrier (the Gauntlet, the Mists, the Shroud). All 34 realms of the realm maps catalogue have a spot. The books describe these places from inside each game line and give no one geography, so which ring and side a realm takes is our own arrangement for a readable chart, with the usual order where lines clash (Wraith, then Werewolf, then Mage). It is not a rule and nothing reads it for play.

Reverse: move rows in CHART.

## B2547. Steps on the chart (2026-11-12, house rule)
"How far" between two places on the chart is one step for each ring crossed, going back through the living world when the two lie on different sides. It is for the Storyteller's sense of distance only.

Reverse: nothing to undo.

## B2548. Left open (2026-11-12)
Not built: the closer view feeding trips and town maps outside Moravia; towns, ports and borders by era on the world grid; sea lanes; the lesser canals (Kiel, Corinth, Erie, the Saint Lawrence Seaway, Volga to Don) and the old Nile to Red Sea canal of antiquity; clicking the map to pick a spot; the Yin and Yang Worlds, Arcadia and the High Umbra's own realms, which have no realm map yet; cities and haunted ground on the mirrored maps.

## B2549. Canals and straits by year (2026-11-13)
Ben: the Suez and Panama Canals did not exist in earlier eras, and travel paths must keep to that. A journey on the world map sails the Suez Canal only from 1869, and not from 1967 to 1974 when it lay shut; the Panama Canal only from 1914. Before those years, and while Suez is shut, the neck of land is land: the quickest way lands there, crosses and takes ship again, or goes the long way round, whichever is shorter in that year. The journey names any canal it passes with its opening year. The list (CANALS in world-map-rules.mjs) takes more canals as a line each. Found while checking: the one-degree grid left Panama open to ships in every year and closed Gibraltar, the Dardanelles and the mouth of the Gulf of Suez, so the Mediterranean, the Black Sea and the Red Sea's head were cut off. Those straits are now a ship's road in every age and Panama is land without its canal. The drawn map is unchanged.
Reverse: empty CANALS, STRAITS and ISTHMUS; journeys then follow the bare grid.

## B2550. The known world, by homeland and year (2026-11-13)
Ben: simulate the discovery of India and the Americas the way the Europa Universalis games handle the ages of discovery, so that players who begin in Europe cannot travel to the Americas at once unless they find a way of their own. Each world region belongs to one of ten circles of knowledge (Europe; North Africa, the Near East and Central Asia; India; East Asia and the islands; Africa south of the desert; North America and the far north; Mexico and the Caribbean; South America; the Pacific islands; Australia). A circle knows its own regions from of old and each other region from a year on: for Europe the Caribbean from 1492, the North American coast and Canada 1497, the Cape 1488 and the East African coast 1498, Brazil 1500, Mexico 1517, the Pacific islands 1521, the Andes 1526, Japan 1543, Australia 1606, Aotearoa 1642, the southern ice 1820; China from 1245 and the Indies from 1292 by the old roads. It runs every way round: Mexico knows nothing of Europe before 1492, the Andes before 1500, the Pacific islands before 1767, Australia before 1788. A circle that has met Europe's ships learns what they find some years after them (20 to 70). From 1900 every part of the world knows every other. The years are a house reading of history, coarse on purpose, in one table (CIRCLES in discovery-rules.mjs). No game book is the source and nothing is taken from the computer games but the idea. Following the global rule, the homeland decides whose knowledge counts: a chronicle that begins in Mexico or China has its own unknown world.
Reverse: choose "The whole world, known or not" in the world map window, or empty CIRCLES' years.

## B2551. Charted land and water (2026-11-13)
On the world map a land square is charted when its region is known. A square of sea is charted when a known region's shore lies no more than six squares further off than the nearest shore of all. So the waters along an unknown coast are closed (no ship rounds the Cape before 1488, and the coast of West Africa closes a few days' sail south of Morocco before 1444), while the open sea between a known coast and a newly found one is open (the Atlantic in 1492). A journey cannot end in an uncharted land and cannot cross uncharted squares; it says so in plain words, with the year the land becomes commonly known. India is known to Europe from of old and is reached by the Levant and the Red Sea; what 1498 opens is the sea road round Africa. The map draws the uncharted world dark.
Reverse: pass no knowledge to journey() and it crosses the whole world as before.

## B2552. The chronicle's own discoveries (2026-11-13)
"Discoveries" in the world map window lists the lands still beyond the known world in the year, each with a tick. A ticked land is known to the chronicle whatever the year: found by a voyage, a map, a spirit's word or any other way the story gives. The list is kept in the world (setting "discovered") and only the Storyteller can change it. A land found alone may still have no way to it, when the coasts and islands before it are unknown; the window says so and the Storyteller ticks those too. Nothing rolls for discovery: it is the story's to give.
Reverse: untick the land.

## B2553. Left open (2026-11-13)
Not built: years before 1197 use the same from-of-old lists, so the prologue eras show too much as known; the Norse voyages to Vinland and other finds that were lost again; a share of the map for the players (the window is the Storyteller's); an expedition as a thing to play (ships, crews, a roll to find a coast); knowledge by faction or by supernatural kind rather than by homeland; Travel places inside one country, which needs no such rule.


## B2554. India is hidden from Europe until 1498; lands open by year (2026-11-13, Ben's call)
Ben decided the two questions B2550 and B2551 left with him. India is beyond Europe's known world until 1498, as in the games, and not reachable by the Levant and the Red Sea before then; with it, the lands reached past it by sea open only when Europe's ships get there (Southeast Asia 1509, the islands of Nusantara 1511). China stays known from 1245 by the roads across Asia. India in turn learns of Europe in 1498, as before. North Africa, the Near East, East Asia and Africa keep their own old knowledge of India. Lands open by their exact year as the chronicle's clock moves, not in a block at the start of an era. This replaces the sentence on India in B2551.
Reverse: put india, southeast-asia and nusantara back to their earlier years in Europe's row of CIRCLES.


## B2555. Nothing beyond India opens before India (2026-11-13, Ben's call)
Ben: China and the lands with it should not open to Europe until India opens. China is beyond Europe's known world until 1513, when Europe's ships first reach it, and Tibet and the Himalaya until 1624; with Southeast Asia 1509, Nusantara 1511, Japan 1543 and Korea 1593, every land east of India now opens after 1498. The roads across Asia no longer carry a chronicle from Europe to China before then. East Asia in turn learns of Europe in 1513, not 1290. North Africa, the Near East and Central Asia stay known to Europe from of old, and keep their own old knowledge of India and China. A chronicle that travels the old roads early marks the land found under Discoveries. This replaces the years for China and Tibet in B2550 and the sentence on China in B2554.
Reverse: put china back to 1245 and tibet-himalaya to 1330 in Europe's row of CIRCLES, and Europe to 1290 in East Asia's.

## B2560. Sprite tokens, a prototype (2026-11-13)
Ben chose on the sprite desk (12 November): whole drawn figures on the map, busts kept for sheets and chat, facing and a walk cycle, drawn by our own code in the paperdoll module, and a testbed prototype first. Paperdoll 0.7.0 holds six sheets (Kindred elder 1888, Garou in Homid, Crinos and Lupus, a townsman and a lady of 1888), each 8 walk frames by 4 facings at 96 by 112 pixels, drawn outside the game by our own rig and shaded with five tones, a dark outline and one light. No outside art. A token that carries the flag "sprite" shows the frame for its facing and for the ground it has covered: one square is one walk cycle. The Storyteller gives or removes a sprite from the walking-figure button among the token's own buttons; the token's old picture is kept and put back. The figure is drawn twice the square, so a person stands a little over one square tall with the feet low in the square. The world setting "Sprite tokens walk and turn" turns the movement off.
Reverse: remove the sprite from each token with the same button, or turn the setting off; delete modules/wodx-paperdoll/sprites and scripts/sprites.mjs with sprite-rules.mjs.

## B2561. Baked busts leave sprite tokens alone (2026-11-13)
When a look is baked, placed tokens that carry a sprite keep their sprite. The bust still goes to the character's sheet picture and to new tokens.
Reverse: drop the sprite test in bake().

## B2562. Left open (2026-11-13)
Not built: sprites made in the game from a character's look and worn items (the wardrobe of 479 items exists only as drawings outside the game); weapons in the hand only when drawn; animals; the other Garou forms and each line's true forms switching with the character's state; a standing pose of its own; players choosing their own sprite.

## B2570. How fast word travels, by region (2026-11-13)
The years of the ways word travels (print, the papers, the wireless, television, the internet) were Moravia's for the whole world. Each of the 44 world regions now has its own row (Chronicle media-rules.mjs REGION_MEDIA), rounded to when each became common there: China's court gazette and small news sheets before 1197, Japan's tile-block sheets from 1615, the Ottoman press from 1727, Brazil with no press before 1808, television in South Africa only in 1976. Where a stronger way came before a weaker one, it stands from its own year. The rumour mill, Masquerade breaches and a secret's freshness read the chronicle's homeland. A house reading of history; the books give no such table. Global rule, docs/GLOBAL.md.
Reverse: delete a region's row (it then keeps Moravia's years) or change its years.

## B2571. Travel years, by region (2026-11-13)
The railway, tram, motorway and car years, the lit roads and streets, paved country roads and the post roads were Moravia's everywhere. Each region now has its own (Storyteller road-rules.mjs REGION_ROADS): the railway in England in 1825 and in Cuba in 1837, none in Lhasa before 2006 and none on the ice, the autostrada in 1924, lamps in London's streets from the 1740s. A trip by distance, the ways offered when a character acts alone and the road's encounter chance read the region of the scene the trip starts from, else the homeland. The Moravian country map keeps its own dated lines.
Reverse: delete a region's row or change its years.

## B2572. Routines by faith (2026-11-13)
The ready routines were written for a Western Christian town. A ready routine now follows the faith its people keep (forFaith in NPC routine-rules.mjs): the week turns so its rest day lands on the faith's own (Friday prayer at noon for Islam, the Sabbath for the Jewish year, the Liturgy for the Eastern church), and the faiths with no weekly rest day work every day and worship on their holy days until the Sunday week took hold (SUNDAY_FROM). The clergy's offices take that faith's prayers. Holy days come from Chronicle's faith years. The faith is the routine's own pick, else the faith a resident's origin points to (ORIGIN_FAITH), else the faith of the scene they live on. Kindred, Garou and the other night folk keep their own nights, and hours the Storyteller typed are never changed. The church place kind is renamed "Church, chapel, mosque, synagogue or temple"; no new kind was added.
Reverse: pick "The Western church" in the routine window, or have blocksOf skip forFaith.

## B2573. Left open (2026-11-13)
Not built: daily prayer times for every Muslim (only the clergy keep the five); the Soviet weeks of 1929 to 1940; Ramadan's night hours in the routines; a separate place kind for mosques, synagogues and temples; the Moravian country map's rails for other regions (the maps thread owns it).

## B2580. Sprite tokens attack (2026-11-13, Ben's ask)
Each sprite has attack sheets beside its walk sheet, one per move it knows, six frames by the four facings (Paperdoll sprite-rules.mjs ACTS, files `<name>.<move>.png`). The moves so far: a strike with the hand, a thrust, a shot, a bite, the Crinos claws (a lunge with claw marks) and a worked power with a drawn effect. `api.sprites.play(token, move, toward)` writes a small flag on the token; every computer that sees the token plays the frames once from its own clock, turned toward the target, and a token that walks drops the attack. The drawing side is tools/sprites (wear.py ACTS, FACT and fx, beast.py bite, proto_attacks.py); the effects by kind of power are first sketches in twelve colours and seven shapes.
Reverse: turn off the world setting "Sprite tokens walk and turn", or remove the attack sheets and the ACTS table.

## B2581. A blow that lands plays the attack (2026-11-13, house rule of presentation)
When WoDX Combat applies damage that names an attacker, the attacker's sprite token on the viewed scene plays its first move toward the one struck. Only the active Storyteller's computer sends it. Misses, powers rolled outside a fight and the choice of move by weapon are not wired yet.
Reverse: remove the `wodxDamageApplied` listener in sprites.mjs.


## B2582. Every attack rolled plays, with the move that fits the weapon (2026-11-13)
WoDX Combat 3.22.0 calls `wodxAttackRolled` after each attack card (attacker, target, the weapon's name, ranged, brawl, bite, hit, botch). Paperdoll 0.9.0 plays the attacker's sprite move for it, hit or miss: a bite for a bite, a shot for a ranged weapon, hand or claw for brawling, a thrust for a pointed weapon by name, a swing for the rest; a sprite that lacks the move plays the nearest it knows. Harm applied with an attacker but no attack roll in the last four seconds still plays the first move (B2581). Any module can show a power being worked with `Hooks.callAll("wodxPowerShown", actor, {target})`; no module calls it yet, so powers rolled from the sheet do not play.
Reverse: remove the hook call in Combat's attack and the two listeners in sprites.mjs.

## B2583. Powers rolled from the sheet play the casting move (2026-11-13, Ben's ask)

A power rolled from any line's power window in Actions sends wodxPowerShown with who worked it and at whom, once its card is posted. The power window is recognised by its aiming panel, which every line's power and casting window carries, so no line needs its own call. A cancelled window, or a roll that posts nothing, sends nothing. Paperdoll plays the sprite's casting move toward the target. The colour and shape of the effect still come from the sprite's own sheet; choosing them from the power rolled is open.

## B2584. The computer that rolled sends the move (2026-11-13)

wodxAttackRolled and wodxPowerShown are heard only on the computer that rolled. That computer writes the move to the token when its user owns the token, so a player's own attacks and powers play on every screen. Harm applied without an attack roll is still sent by the active Storyteller's computer.

## B2585. A power's effect fits the power (2026-11-13, Ben's ask on supernatural attacks)

The effect of a power is no longer drawn into a figure's casting sheet. It is its own sheet, a colour and a shape (twelve colours, seven shapes, 84 sheets drawn by tools/sprites/proto_fx.py), laid over the token while the casting move plays. The look is chosen in sprite-rules.mjs (fxFor): first from telling words in the power's name and its group (fire, shadow, the mind, blood, the dead, dreams and so on), then from the power's kind (a Discipline, a Gift, an Arcanos, an Evocation, Hekau, a Horror, an Edge, Numina), then from the character's line. A module may name a look outright in wodxPowerShown as fx. These looks are a first rule of presentation, not book text; any of them can be changed in the one table.
Reverse: drop the fx field from the token's act flag in play(), and restore the elder's casting sheet from tools/sprites/proto_attacks.py with its power set.

## B2586. A sprite for every character, drawn in batches on the PC (2026-11-13, Ben's choice)

Ben chose batches on the PC over rewriting the drawing rig to run inside Foundry. The game writes a roster to the world's wodx-sprites folder (Paperdoll api.sprites.saveRoster): each actor's id, name, skin and hair from its portrait look, the things it has on, the weapons it has out, and whether its kind works powers. tools/sprites/batch.py reads the roster and draws, for each actor, a walk sheet, a still and its attack sheets into the same folder, with a manifest. People are dressed from their worn things by the matcher in items.py; a creature is drawn as the animal its name says. An actor whose roster entry has not changed is not drawn again. The game learns the manifest when it starts (api.sprites.loadOwn), names each sprite own- and the actor's id, offers it on that actor's tokens, and api.sprites.dress(scene) gives it to every token of a scene that has none.
Not yet: dress by era and region for characters with nothing on, hair styles and beards from the portrait, Garou forms other than Homid, the other lines' true forms, and drawing a new batch without a job on the PC.
Reverse: delete the world's wodx-sprites folder and clear the sprites from the tokens (api.sprites.clear).

## B2587. The figure menu: players put their own figure together (2026-11-13, Ben's ask)

A Figure button on any character sheet its player owns opens a window with three parts: the figure so far with skin, hair colour and how the hair is worn; the twelve places a piece can go (body, legs, feet, over all, head, face, neck, hands, belt, pinned on, in the hand, on the other arm); and the pieces for the chosen place, with a search box. Pieces are the wardrobe items the rig can draw (tools/sprites/catalogue.py writes the list and one small layer per piece to sprites/figure). The list shows the pieces in use in the chronicle's year, with a tick box for every age; clothing uses its own years, gear is offered from the first year of its earliest era on. Any piece can be dyed.
The picture in the window is quick: ready layers laid over each other and tinted. Because Ben chose sprites drawn in batches on the PC (B2586), the walking sprite itself follows with the next batch; the window says so. The choice is kept on the actor as the flag figure, and the roster then describes that figure in place of the things marked as worn.
Not yet: build and height, beards, a facing other than the front in the quick picture, and asking for a batch from inside the game.
Reverse: remove the two header buttons in main.mjs; a kept figure is the flag figure on the actor.

## B2600. The mortal years of a lifepath are a drill-down (2026-11-13, Ben's ask and desk picks)
The lifepath window opens on continent, then region (all 44 world regions), then "your people" where more than one people lives there or none is named, then origin, then one pair of steps per life stage: how those years were spent and what marked them. The drill is stored inside the path (path.drill), so the summary, the prelude scenes, the lifepath threads and the first-night forecast read it without change. The old birth, youth, adult and later scenes step aside when a drill is present; the turn, the splat's scene and the first years after follow as before. Records kept before 0.17.0 read as they did.
Reverse: in LifepathApp, start with R.newPath without a drill; stagesOf then returns every stage again.

## B2601. Coming of age moves with the era and the region (2026-11-13, Ben's pick on lp6; house reading of history)
Adult life starts at 14 before 1500, 15 to 1788, 16 to 1945 and 18 after; the teenage years start at 10 where adult life starts at 14, else at 12. Japan keeps 15 before 1789. Regions may set their own in REGION_COMING_OF_AGE. These ages are WoDX's own reading, not a book rule.
Reverse: set every value of COMING_OF_AGE to 18 and empty REGION_COMING_OF_AGE in data/lifepath-drill.mjs.

## B2602. Five things marked those years (2026-11-13, Ben's note on lp5)
Each stage has two picks. The second shows five options drawn from that stage's list: two good, two hard, one neither, with "Five others" to draw again. This is Claude's reading of "five choices per life stage, two positive, two negative, one neutral". Ben, 13 November 2026 02:25Z: "The first choice should also get five choices", so since Creation 0.17.1 the first pick of each stage shows five the same way; a path of the land and age takes the "neither" place on the first draw.
Reverse: change MARK_SHAPE in lifepath-drill-rules.mjs.

## B2603. Adult chapters (2026-11-13, desk lp7)
A new chapter of adult life opens at coming of age, 30, 45 and 60. Each chapter is a calling and a mark.
Reverse: change CHAPTERS in data/lifepath-drill.mjs.

## B2604. Rewards go on the sheet at the book's cost (2026-11-13, desk lp12 and lp13; V20 creation totals and each line's own)
At the end the ticked picks are written to the sheet: an Ability up one dot and never past the book's creation cap, a Background at one dot or up one, a Merit or Flaw at the cost in the book table (the least cost where the book gives a range), Flaws only up to the book's cap. Nothing is free: the creation check counts every dot and point. Flaws start unticked. Names not in the book table are left off and listed. The tongue of the land of birth costs nothing.
Reverse: untick "Put what is ticked above on the sheet"; features made this way carry flags.wodx-creation.lifepath.

## B2605. Own answers and young characters pass the Storyteller (2026-11-13, desk lp10 and lp23)
A player's own answer on any step except continent and region, or a character younger than 12, sends the lifepath to the approval queue; the sheet changes when the Storyteller approves. A Storyteller's own lifepath waits for no one.
Reverse: return [] from reviewReasons.

## B2606. Births of a line's own kind (2026-11-13, desk lp19)
Origins of a line (born a wolf, metis, Kinfolk family, revenant family, a ghoul household, a hunter's family and the like) are offered only when the character's line fits.
Reverse: drop the rows with a line in ORIGINS.

## B2607. A life lived elsewhere (2026-11-13, desk lp9 and lp11)
Every stage after childhood can be set in another region. When the last home is not the chronicle's homeland, a last step asks what brought the character here.
Reverse: drop the movable flag in stepsOf and the arrival step.

## B2608. Local content comes region by region (2026-11-13, desk lp15, lp16 and lp22)
The shared lists serve all 44 regions in every age. Local origins, teenage paths and callings exist for France, Japan, West Africa, the Andes, the Levant and western North America as samples; since Creation 0.18.0 (13 November 2026, Ben: "Continue") every one of the 44 regions has them for every age, in data/lifepath-local-europe.mjs, -asia.mjs and -world.mjs, written from general history in WoDX's own words. Since Creation 0.19.0 the older Bohemian scenes are sorted into Moravia's dated content (data/lifepath-local-events.mjs: origins by span of birth years, marks by the years they happened); the generic older scenes (a mentor, a sibling, a first love, a fire) were already covered by the shared marks. data/lifepaths.mjs is unchanged and still serves records without a drill. Nothing was deleted.
Reverse: empty LOCAL in data/lifepath-drill.mjs.

## B2609. People from a life abroad carry that land's names (2026-11-13, desk lp14)
A person from the past made into an NPC is named by the culture of the region where that part of life happened.
Reverse: drop the culture argument in makePeople.
