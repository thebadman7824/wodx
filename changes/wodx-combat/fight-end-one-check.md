---
bump: patch
---
Fights that end by themselves run one end check at a time per fight, and none once the fight is being ended, so a quick Next turn no longer lands an update on a fight that is being deleted (B7984, #2675). The API gains fightEnd.idle() for gates.
