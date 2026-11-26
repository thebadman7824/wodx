---
bump: patch
---
The shared terms, the calendar maths and the date engine moved to the rules core, modules/wodx-rules/core (B8060). scripts/terms.mjs, scripts/calendar-math.mjs and scripts/calendar.mjs pass the same names on from there, so every existing import works and every module still shares one date engine; calendar.mjs keeps only the Foundry calendar class and config.
