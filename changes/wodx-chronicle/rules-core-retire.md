---
bump: patch
---
scripts/terms.mjs and scripts/calendar-math.mjs are gone, and scripts/calendar.mjs no longer passes the date engine on: it keeps only the Foundry calendar class and config (B8068). Every module imports terms and the calendar from the rules core, modules/wodx-rules/core. Nothing changes in play.
