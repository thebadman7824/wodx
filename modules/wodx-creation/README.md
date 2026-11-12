# WoDX Creation

Phase 3 of World of Darkness Expanded. Private use only.

- **The Embrace.** The Storyteller picks a mortal (or a ghoul) and a sire. A new vampire sheet is made from the mortal's, with the sire's clan, one Generation further from Caine, the generation chart's blood pool (V20 Dark Ages p. 340), one blood point on rising, the Road of Humanity at the mortal's rating (p. 111), and the clan Disciplines listed at 0 dots. The mortal sheet is kept in the folder "WoDX · Before the Embrace", and the mortal's tokens show the vampire.
- **Vitae.** A mortal who drinks becomes a ghoul with Potence 1 and a 10-point blood pool (p. 399). Each drink on a new night moves the blood oath on; the third binds (pp. 341–342).
- **Lineage.** Sire, domitor, bonds and the life before the Embrace are kept on each actor (`flags["wodx-creation"]`). The "WoDX Lineage" journal shows the trees, reading the sheets' Sire fields too.
- **Experience log.** The Storyteller awards experience; players ask to spend it from the droplet button. Costs come from each line's book (vampires V20 Dark Ages p. 183 and V20 p. 124; ghouls V20 Dark Ages p. 399 and Ghouls and Revenants p. 139). Requests wait in the WoDX approval queue, and the cost is checked again when approved. Awards and spends are the system's own Experience items, so the sheet's totals stay right; the "WoDX Experience Log" journal lists them by in-game date.

Needs WoDX Chronicle 0.1.7 or later. Werewolf, Mage and the other lines get their change-of-state wizards and costs in Phase 6.

## Phase 4: Pass the Years

- **Allies.** Any NPC can be made the ally of a player character; the patron's owners may then spend experience on it, from its own pool or the patron's.
- **Pass the Years** (Clock or droplet button). Pick a number of years and press "Show what happens". Each character's changes are listed: ageing and death checks, an heir, ghoul feeding or lapse (V20 Dark Ages p. 399), bonds fading (p. 342), voluntary torpor (p. 351), the new era's ability list, and Backgrounds to review. Tick what to accept, then "Pass the years". A plan can be written to the "WoDX Time Skips" journal without changing anything. Nothing is deleted: the dead go to "WoDX · The Dead".
- **Time-skip test.** The Phase 4 gate: it makes test characters and passes the years from 1200 to 2025. It moves the clock, so use it in wodx-template.

## 0.11.0: Lifepaths

- **Lifepath** (character sheet header, or the Creation window). An optional chain of scenes before points are spent: where and when the character was born, a youth, an adult life, the turn into the line (the Embrace, the First Change, the Awakening, a death, the Chrysalis, the calling, the Fall...), a scene for the clan, tribe, Tradition, kith, guild or creed, and the first years after. Every scene fits its year, 1197 to the World of Future Darkness. Choices suggest Backgrounds, Abilities, Merits and Flaws and name people from the past; the player keeps what fits and ticks who becomes an NPC. Nothing is spent. Back, Another scene and Start over are always there.
- The lifepath stays with the character through a change of state, and the Storyteller's prelude journal shows it.

## 0.12.0: Before the First Night

- **The hub** (character sheet header, the Creation window, the Chronicle Clock, or the end of the Storyteller's setup wizard). One card for each step before play: Session Zero, troupe ties, concept, lifepath, build, Merits and Flaws, fit with the year and place, prelude, trouble ahead, sign-off. Steps go in any order. A player marks a step done and the Storyteller approves it; concept, lifepath, build and Merits and Flaws tick themselves when the sheet shows them. The Storyteller sees the whole troupe's progress and signs each character off.
- **Merits and Flaws.** Flaw points are counted against the cap of 7, and each flaw shows what it will bring later.
- **Trouble ahead.** What the character's choices will cost: flaws that come up in the night's draw, open Ledger entries or bite at given moments, the clan or splat feature, Generation and the Road, enemies from the lifepath, Backgrounds still to be made, factions that distrust the character, rivalries in force this year, dated events coming for the line within five years or before the next era, no language shared with the troupe, and gear out of its time. The player sees what the character would know; the Storyteller sees the rest too.
- **The trouble dial.** Quiet, Normal or Often: how often the character's own flaws turn up in the night's draw.
- **The story hook.** The player names one flaw or tie for the story to come back to; the Storyteller agrees, and is reminded after four sessions if it has not come up.
- **Sign-off** sends the forecast to chat, and then one card per thing the world can be given: an enemy from the past made as a Hostile NPC, the Ledger entries, the Backgrounds made real, a dated hook, a starting standing with each faction. Each card has Make it and Skip, and Undo once made.
- World setting "Before the First Night": automatic (on everywhere except the Live world), on, or off.

## 0.13.0: building, the prelude and the troupe

- **Build** (the Build step's button). The book's creation points spent on the sheet with a live count: Attributes, Abilities and Virtues dot by dot; Backgrounds, the line's powers, Merits and Flaws counted from the sheet, each Merit, Flaw and Background with what it will bring later. The count is the creation check's, so the primary, secondary and tertiary groups fall where they cost least.
- **Run the prelude** (Storyteller). The lifepath's scenes, then the line's prelude (before, the turn, after), one scene at a time. A roll with stakes on any beat: a failure costs the stake, a Flaw earned in play at 0 points (Enemy, Dark Secret, Nightmares, Hunted) or a lost tie, and an enemy is made as a Hostile NPC. Up to 3 freebie points of gains (a dot of an Ability, a Background or Willpower). Every change is in the log with Undo. A character joining a chronicle already under way starts with the short prelude (the turn and after).
- **Write my prelude** (player). A journal page of the prelude's questions, the player's own, which the Storyteller reads; the Storyteller's prelude journal links it.
- **Troupe ties.** Each player gets one question about the next character in a ring; the answers go on the Group actor and tick the step. How they met gathers them into a journal for a shared scene.
