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

Needs WoDX Chronicle 0.2.0 or later.
