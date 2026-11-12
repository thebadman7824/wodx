# WoDX Actions 3.0.0

World of Darkness Expanded. Private use only; not for distribution or sale.

WoDX Actions gives every actor type its own menu: hunting, feeding, blood, frenzy, Road, torpor, diablerie, and the other lines' menus. Its API is `game.wodxActions` (also `game.wodx.actions`). Macros are "WoDX: …". The token HUD button reads "WoDX Actions". It began as a port of vtda20-actions 2.2.1; the bridge from that module (old setting values, the `game.vtda20actions` alias and the one-time migration) was removed in 3.44.0.

- **Timed effects** (WoDX Chronicle). Quickening, from Spend blood, is a WoDX timed effect that lasts the scene. When the scene ends it takes back exactly the points it added. The scene ends with the Clock's "End the scene" button, the End of scene action, or a new active scene.
- **Conditions** (WoDX Chronicle). Frenzy, Rötschreck and torpor also show as WoDX condition statuses, which WoDX Combat reads.

## Common checks (3.13.0)

Every line's menu now starts its Act group with **Any roll / dramatic system** (the free Attribute + Ability roller, formerly "Action / Dramatic system") and **Common checks**. Common checks is one searchable list of 41 everyday rolls: noticing (Perception + Alertness), reacting (Wits + Alertness), sensing the uncanny, searching, reading a person, balance and endurance, a feat of strength, recalling lore, first aid, persuading, asking around, a Willpower roll, Courage, Self-Control, Conscience, Stamina to resist, and each Attribute alone. The window shows the pool the character will roll before the roll; each check takes the first of its pools the character has dots in, so a Dark Ages character rolls Ride where a modern one rolls Drive. The same checks are presets in the free roll's list (marked "Common:") for resisted, extended or teamwork rolls. API: `game.wodxActions.quickCheck({actor, check: "notice"})`; the list is `game.wodxActions.checks.CHECKS`. Notes: docs/research/common-rolls-audit.md.

Needs WoDX Chronicle 0.2.0 or later.
