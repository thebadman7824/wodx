# Features

Written by `node tools/registry/registry.mjs summary --write` from registry/features/ (B7148). Do not edit by hand.
Status is the last step a row has proof for: planned, built, wired, shown, gated, book, verified (registry/features/README.md).

| Module | Seeded | Rows | Verified | Half-built |
| --- | --- | --- | --- | --- |
| system | not yet | 0 | 0 | 0 |
| wodx-actions | not yet | 0 | 0 | 0 |
| wodx-atmosphere | not yet | 0 | 0 | 0 |
| wodx-chronicle | not yet | 1 | 0 | 0 |
| wodx-combat | not yet | 1 | 0 | 0 |
| wodx-creation | not yet | 0 | 0 | 0 |
| wodx-interactables | not yet | 0 | 0 | 0 |
| wodx-library | not yet | 0 | 0 | 0 |
| wodx-npc | not yet | 0 | 0 | 0 |
| wodx-otherworlds | not yet | 0 | 0 | 0 |
| wodx-paperdoll | not yet | 0 | 0 | 0 |
| wodx-rothenstein | not yet | 0 | 0 | 0 |
| wodx-senses | not yet | 0 | 0 | 0 |
| wodx-sheets | yes | 18 | 0 | 2 |
| wodx-solo | not yet | 0 | 0 | 0 |
| wodx-storyteller | not yet | 3 | 0 | 1 |
| wodx-targeting | not yet | 0 | 0 | 0 |
| wodx-voices | not yet | 0 | 0 | 0 |

## wodx-chronicle

| Feature | Core | Status | Open | Gate |
| --- | --- | --- | --- | --- |
| Dated events: history fires on its date as the clock passes it (`chronicle.dated-events`) | core | gated | 2 | gatedatedplay 5 |

## wodx-combat

| Feature | Core | Status | Open | Gate |
| --- | --- | --- | --- | --- |
| Standing up from a knockdown (`combat.knockdown-stand`) | core | gated | 1 | gateknockdown 4 |

## wodx-sheets

| Feature | Core | Status | Open | Gate |
| --- | --- | --- | --- | --- |
| A roll clicked on the sheet counts WoDX's merits, flaws, conditions and powers (`sheets.sheet-roll-mods`) | core | gated | 1 | gatetruthsheets 2. a sheet roll counts WoDX |
| An optional Gender line under the name, in the player's own words (`sheets.gender-line`) | core | book |  | gategender 4. sheet line |
| Beginner view on the sheet: quick rolls, zero Abilities folded, rare tabs behind More, hover help (`sheets.beginner-view`) | core | book |  | gateplayerview 13. quick rolls |
| Changed since last session: each change with its cause, cleared when read (`sheets.changes-since`) | core | book |  | gatesheetchanges Willpower and a new item show, with the Storyteller as cause |
| Line sheets on the newer sheet engine (ApplicationV2), one line at a time (`sheets.appv2-sheets`) | core | book |  | gatesheetv2 6. a dot sets a value |
| Line skins: each line's look loads the first time a sheet of that line opens (`sheets.line-skins`) | core | book |  | gateskinsplit 2. each sheet wears its own line's skin |
| Nature button on every sheet and Set off on the Derangements panel (`sheets.nature-derangement`) | core | gated | 1 | gatetruthsheets 3. the Nature button on a plain mortal |
| Possessions: containers, stacks, concealment, out-of-era flags, money by era, give and leave on the map (`sheets.possessions`) | core | gated | 2 | gatesheetextras containers: things nest, a too-big thing is refused, a stack counts |
| The Body tab: shape, parts, what the body can do, where blows land, lasting changes (`sheets.body-tab`) | core | gated | 1 | gatebody the Body tab |
| The book's character sheet for each line and era (V20 Dark Ages Kindred and ghouls first) (`sheets.book-sheet`) | core | gated | 2 | gatesheet1 a missing Ability: the first dot adds Archery as a skill |
| The damage doll: a pixel figure on the Body tab coloured by the wounds on each part (`sheets.damage-doll`) | core | book |  | gatedoll the Body tab draws the doll |
| The features card: every line feature in force, when it fires and when it last fired (`sheets.features-card`) | core | book |  | gatesheetchanges the features card lists the clan feature with when it fires |
| The in-play strip, the Storyteller's notes and the header buttons on every WoDX sheet (`sheets.in-play-strip`) | core | book |  | gatesheetextras the sheet shows the strip, Possessions, Ties, the Storyteller's notes and the header buttons |
| The Relationships tab: every tie, what it does in play, family news, Followers (`sheets.relationships`) | core | gated | 1 | gatebonds 7. sheet |
| Bring forward: things on the maps swap for their equal in the card's year (`sheets.bring-forward`) |  | book |  | gatebringforward buttons |
| History with Undo for this session's edits, and Print (`sheets.history-print`) |  | shown | 1 |  |
| Sheet tools: the title bar's buttons and window controls in one menu (`sheets.sheet-tools`) |  | book |  | gateplayerextras 8. sheet tools |
| The anachronism check: when the clock jumps, possessions and map things out of their time go on one card (`sheets.anachronism-check`) |  | shown | 1 |  |

## wodx-storyteller

| Feature | Core | Status | Open | Gate |
| --- | --- | --- | --- | --- |
| Great events and war at home in the sky over the towns (`storyteller.event-looks`) | core | gated | 1 | gatedatedplay 5 |
| Market news: dated events and trade move the markets, applied from a card (`storyteller.market-news`) | core | gated |  | gatedatedplay 4 |
| The Ledger: a dated debt, oath or boon comes due as the clock passes it (`storyteller.ledger-due`) | core | shown | 2 |  |
