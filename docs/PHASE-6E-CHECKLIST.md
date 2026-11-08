# Phase 6e checklist: the WoDX look (B51)

- [x] Shared tokens, themed by era (era kits) and line (line accents), in WoDX Chronicle 0.3.0
- [x] Bundled fonts with licences (fonts/licenses)
- [x] The WoDX frame: title bar with the era ornament, dividers, legends, fields, buttons, the default answer
- [x] Menus grouped by intent (Act, Resist, Recover, Storyteller tools), most used first, recent uses, descriptions on hover and focus, keyboard access, search box (B24)
- [x] One card layout: header (line mark, title, verdict), roll, result, what changed with resource pips, page references in the footer; older cards shown in it
- [x] Consistent prompts and empty states (.wodx-prompt, .wodx-empty)
- [x] Accessibility: contrast tested in every kit and both looks; each player's look (era, light, dark, plain), text size (to 150%), motion (follow the computer, reduce, full); forced-colours mode
- [x] UI fit (B17) at 1280x720, 1366x768 and 1920x1080 with the look on; screenshot review sheets (look.mjs)
- [x] Harness: phase6e.test.mjs; all suites pass
- [ ] Gate 6e in Foundry (tools/gate/gate6e.mjs)
- [ ] Ben reviews the Kindred, wraith and hunter menus and cards in play and approves the look
- [ ] Then: roll the look out to the other lines (LINE_LOOK) and group their menus by intent
