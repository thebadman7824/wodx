# WoDX Actions 3.0.0

World of Darkness Expanded. Private use only; not for distribution or sale.

WoDX Actions is vtda20-actions 2.2.1 brought into the WoDX project under a new id. Everything in `README-vtda20.md` still applies: the menus for every actor type, hunting, feeding, blood, frenzy, Road, torpor, diablerie, and the other lines' menus. What changed:

- **New names.** The module is `wodx-actions`. Its API is `game.wodxActions` (also `game.wodx.actions`); `game.vtda20actions` still works as an alias. Macros are "WoDX: …". The token HUD button reads "WoDX Actions".
- **Settings** start from the choices you made in vtda20-actions; nothing is written to the old ones.
- **The move from VtDA20.** On first load, the Storyteller gets a proposal in the WoDX approval queue. Approving it:
  - copies the actor flags (actor type, Garou form, elder, frenzy, Blood Oaths, torpor…) from the VtDA20 names to the WoDX names;
  - renames the "VtDA20: …" macros to "WoDX: …".

  Nothing is deleted. The "WoDX Migration from VtDA20" journal lists what moved. You can also run it with `game.wodxActions.migrate()`.
- **Never beside the old module.** While vtda20-actions is enabled, WoDX Actions stays off and tells the Storyteller to disable it.
- **Timed effects** (WoDX Chronicle). Quickening, from Spend blood, is a WoDX timed effect that lasts the scene. When the scene ends it takes back exactly the points it added. The scene ends with the Clock's "End the scene" button, the End of scene action, or a new active scene.
- **Conditions** (WoDX Chronicle). Frenzy, Rötschreck and torpor also show as WoDX condition statuses, which WoDX Combat reads.

## Common checks (3.13.0)

Every line's menu now starts its Act group with **Any roll / dramatic system** (the free Attribute + Ability roller, formerly "Action / Dramatic system") and **Common checks**. Common checks is one searchable list of 41 everyday rolls: noticing (Perception + Alertness), reacting (Wits + Alertness), sensing the uncanny, searching, reading a person, balance and endurance, a feat of strength, recalling lore, first aid, persuading, asking around, a Willpower roll, Courage, Self-Control, Conscience, Stamina to resist, and each Attribute alone. The window shows the pool the character will roll before the roll; each check takes the first of its pools the character has dots in, so a Dark Ages character rolls Ride where a modern one rolls Drive. The same checks are presets in the free roll's list (marked "Common:") for resisted, extended or teamwork rolls. API: `game.wodxActions.quickCheck({actor, check: "notice"})`; the list is `game.wodxActions.checks.CHECKS`. Notes: docs/research/common-rolls-audit.md.

Needs WoDX Chronicle 0.2.0 or later.
