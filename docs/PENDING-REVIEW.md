# Pending review

Ben's standing rule (9 November 2026): Claude doesn't wait for an answer. It takes the option it recommends, keeps working, and logs each such choice here so Ben can review it later. Deletions and changes to the Live world still wait for Ben.

| Date | Question | Choice made | How to reverse it |
|---|---|---|---|
| 2026-11-09 | Do NPCs set off traps? | Only when the trap tile has "NPCs set it off" ticked. Tokens owned by the Storyteller count as NPCs. | Tick the box on each trap. To change the default, flip the `npc` test in `trapsOnPath` (wodx-interactables/scripts/main.mjs). |
| 2026-11-09 | How much damage does a pit do? | 2 bashing dice, with lethal as an option for spikes. The falling rule's V20 core page ref still needs pinning on the PC. | Set damage dice on the tile, or change `TRAPS.pit.dice` in interact-rules.mjs. |
| 2026-11-09 | How many search successes does each trap grade need? | Crude 1, good 2, excellent 3, masterwork 4, searching within three squares. | `TRAP_GRADES[*].hide` and `SEARCH_SQUARES`. |
| 2026-11-09 | Can a character with no Investigation read a clue? | They can look at it, with no roll, and get the first part. Examining it closely needs Investigation, because an untrained Knowledge can't be rolled. | `clueOptions` in interact-rules.mjs. |
| 2026-11-09 | Does lighting a lamp need a roll? | No. It takes a turn and is silent. A lantern, lamp or bulb can be broken, which is loud. | `lightOptions` in interact-rules.mjs. |
| 2026-11-09 | Delete the stray branch `claude/gate-pit-fix`, which was pushed by mistake? | **Waiting for Ben** (it's a deletion). Nothing uses it. | Leaving it does no harm. |
| 2026-11-09 | How do hidden characters leave sight? | They get the Invisible status, so their own player and the Storyteller still see them. If a world doesn't have that status, WoDX uses the token's hidden switch. | `setConcealed` in wodx-interactables/scripts/main.mjs. |
| 2026-11-09 | Does a failed Stealth roll still hide the character? | Yes, but the hiding is easy to find: one search success is enough in a wardrobe. A botch is loud. | `hideOptions` and the `hide` case in interact-rules.mjs. |
| 2026-11-09 | Is fire lethal or aggravated? | As WoDX Actions' fire check already does: lethal to mortals and ghouls, aggravated to everyone else, and always aggravated to vampires. The tile's damage type can override it for everyone but vampires. | `hazardHit` in interact-rules.mjs. |
| 2026-11-09 | How hard is a fire to put out? | Small: no roll, a turn. Bonfire: Dexterity + Athletics, difficulty 7, a botch burns the one fighting it. Inferno: not by hand. | `hazardOptions` in interact-rules.mjs. |
| 2026-11-09 | How much does a live wire hurt? | 2, 4, 6 or 8 lethal levels a turn (wall socket, fuse box, industrial line, main line), soaked as usual. The V20 core page ref still needs pinning. | `SHOCKS` in interact-rules.mjs. |
| 2026-11-09 | Broken glass and caltrops? | 2 dice of lethal, set per tile; a Dexterity + Athletics roll at 6 first takes a die off for each success. A minute sweeps a path. | `hazardHit`, `carefulRoll` and `hazardOptions`. |
| 2026-11-09 | Do hazards hurt NPCs? | Yes, unless the tile has "Only player characters" ticked (traps are the other way round, since people know their own traps). | Tick the box, or the `pcsOnly` test in `hazardsOnPath`. |
