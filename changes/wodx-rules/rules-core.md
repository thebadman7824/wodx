---
bump: minor
what: The rules core: the game's rules as plain code with no Foundry calls, shared by every WoDX module. Holds the shared terms and the calendar so far; each module's rules files move in step by step. Nothing runs at load; install it with the rest, it needs no switching on.
effect: none, a library: every roll, date and rule plays as before, and the harness now fails any rules file that calls Foundry
visible: none, nothing in play looks different; the change is where the rules live
---
The rules core starts (B8060-B8064): a new library module, modules/wodx-rules, with the shared terms (terms.mjs), the calendar maths and the pure half of the calendar (the date engine and the clock reading) moved in from WoDX Chronicle. A guard test fails any file in it, or any rules file still in its module, that names a Foundry global, imports outside the package unlisted, or does not load in plain Node. The release bundler bundles a rules core file into the one module that uses it, so loading stays as it was.
