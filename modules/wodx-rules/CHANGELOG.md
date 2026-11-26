# wodx-rules changelog

Newest first. Add each new release at the top.

- 0.2.0 (Plain words (B8180, #2503): the action descriptions in actions/theme-rules.js, moved here from WoDX Actions, are one plain line each saying what happens when the action is used)
- 0.1.1 (Off-screen lives: a skip of 360 days or more counts as a year (isLongJump, LONG_JUMP_DAYS), so a one-year Pass the years brings the Off-screen lives card (B8161, #2627))
- 0.1.0 (The rules core (B8060-B8065): a new library module, modules/wodx-rules, with the shared terms (terms.mjs), the calendar maths and the pure half of the calendar (the date engine and the clock reading) moved in from WoDX Chronicle, and 347 rules files from 14 modules moved in, one folder per module. A guard test fails any file in it, or any rules file still in its module, that names a Foundry global, imports outside the package unlisted, or does not load in plain Node. The release bundler bundles a rules core file into the one module that uses it, so loading stays as it was)
- 0.0.0 (The rules core folder is made, empty; B8060)
