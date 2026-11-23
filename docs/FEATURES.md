# Features

Written by `node tools/registry/registry.mjs summary --write` from registry/features/ (B7148). Do not edit by hand.
Status is the last step a row has proof for: planned, built, wired, shown, gated, book, verified (registry/features/README.md).

| Module | Seeded | Rows | Verified | Half-built |
| --- | --- | --- | --- | --- |
| system | not yet | 0 | 0 | 0 |
| wodx-actions | not yet | 0 | 0 | 0 |
| wodx-atmosphere | not yet | 0 | 0 | 0 |
| wodx-chronicle | not yet | 1 | 0 | 0 |
| wodx-combat | yes | 15 | 0 | 2 |
| wodx-creation | yes | 21 | 0 | 8 |
| wodx-interactables | not yet | 0 | 0 | 0 |
| wodx-library | not yet | 0 | 0 | 0 |
| wodx-npc | not yet | 0 | 0 | 0 |
| wodx-otherworlds | not yet | 0 | 0 | 0 |
| wodx-paperdoll | not yet | 0 | 0 | 0 |
| wodx-rothenstein | not yet | 0 | 0 | 0 |
| wodx-senses | not yet | 0 | 0 | 0 |
| wodx-sheets | yes | 19 | 0 | 3 |
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
| A fight that starts by itself: sight, alarms, regions, frenzy, an attack outside a fight (`combat.fight-start`) | core | book |  | gatefight start the fight |
| An attack: the roll, the defence, damage and soak by the target's kind (`combat.attack-soak`) | core | gated | 1 | gatetruthrelay a. the player's quick attack hits |
| Animal swarms: one token that bites everyone inside it, dodges at 8, overrun at three levels (`combat.swarms`) | core | gated | 1 | gatedach8 5. a rat swarm overruns the one inside it |
| Extra actions (Celerity) in a second pass at the end of the turn (`combat.extra-actions`) | core | gated | 1 | gate7b1 extra actions: a second pass at the end of the turn, in Initiative order, then the next turn |
| Fighting from the saddle: the mount's Strength, its dodge, keeping the saddle, the lance, bows at a trot (`combat.mounted`) | core | gated | 1 | gatemounted 6. a bow at a trot |
| Fights that end by themselves once one side has nobody standing for a full turn (`combat.fight-end`) | core | book |  | gateautomation 8. fight ends |
| How long a fight took: the clock moves by rounds times three seconds (`combat.fight-time`) | core | gated | 1 | gatetime fight length |
| Standing up from a knockdown (`combat.knockdown-stand`) | core | gated | 1 | gateknockdown 4 |
| The after-action card: what each fighter took, dealt and spent, and who saw it (`combat.aftermath`) | core | book |  | gatetable after-action card |
| The ambush: Dexterity + Stealth against Perception + Alertness for a free attack (`combat.ambush`) | core | shown | 2 |  |
| The body plan: shapes, parts, held gear coming off, where blows land, the maiming card (`combat.body-plan`) | core | book |  | gatebody the maiming card |
| Turns that move on by themselves: NPC turns, player turns with a countdown, Hold and Act next (`combat.turn-conductor`) | core | gated | 1 | gate7b1 Everyone: the hero's action is spent, a countdown, then the turn ends with no click |
| Ways of moving: flying, swimming, climbing, into the ground, held breath and drowning, falls (`combat.movement-modes`) | core | gated | 1 | gatemove drowning in a fight |
| Black powder: misfires, wet powder and the lock of the year (`combat.black-powder`) |  | shown | 2 |  |
| Fighting with and around vehicles: shelter, the hull's Durability and Structure, ramming (`combat.vehicles`) |  | gated | 1 | gatetruthcombat 10. a quick attack on a vehicle's token comes off its sheet's Structure |

## wodx-creation

| Feature | Core | Status | Open | Gate |
| --- | --- | --- | --- | --- |
| Animals' traits, training and breeds; war ghouls, kennels and household beasts (`creation.animal-training`) | core | gated | 1 | gateanimalstock 5. the wizard offers animal retainers |
| Before the First Night: one hub per character with a card for each step, and the guided builder (`creation.first-night`) | core | book |  | gatefirstnight 4 build |
| Ghouled animals: blood pool by size, the domitor's mark, feeding vitae from the token menu (`creation.animal-ghouls`) | core | gated | 1 | gateanimalghoul 4. Feed vitae on the token menu |
| Giving vitae: a mortal or an animal drinks, ghouls and blood bonds follow (`creation.give-vitae`) | core | gated | 2 | gatedalines 3. a Valkyrje's blood makes no ghoul and no bond |
| Learning from a source: a teacher, a book, a school or practice, with the rise at the end of a long task (`creation.learning`) | core | shown | 2 |  |
| Lifepaths: the mortal years as a drill-down or a short path, and the threads they leave open (`creation.lifepath`) | core | book |  | gateplayercreation 4. short lifepath |
| Spending experience: the cost by line, the Storyteller's approval, Mentors and the Moment of Truth (`creation.xp-spend`) | core | gated | 1 | gatedaroad 2. a Mentor at 9 dots and the Moment of Truth: the Road dot costs 4, and buying it spends the Moment |
| The Creation window: allies, patrons and the tools for each character (`creation.creation-window`) | core | shown | 1 |  |
| The Embrace: a mortal becomes a vampire, keeps their traits and is handed to their player (`creation.embrace`) | core | gated | 1 | gatetruthsheets 4. the Embrace hands the player over |
| The group sheet: a coterie, pack or cabal with its members and pooled Backgrounds (`creation.group-sheet`) | core | shown | 2 |  |
| The People generator: mortals and ghouls for the era and homeland, with ready sheets (`creation.people`) | core | shown | 1 |  |
| The prelude runner, troupe ties, and the world seeded at sign-off (`creation.prelude-seed`) | core | shown | 1 |  |
| The step-by-step character wizard, the quick start and the derived traits (`creation.wizard`) | core | gated | 1 | gatewizard 10 derived traits |
| The Storyteller characters of V20 Dark Ages as ready sheets (`creation.book-people`) | core | shown | 2 |  |
| Changes of state that keep the character: death into a wraith, the Awakening, revenants, the Chrysalis, the Fallen (`creation.changes-of-state`) |  | shown | 1 |  |
| Maturation: a Dark Ages Cainite's years become points, with Tempting Fate, the Sleep of Ages and the Thirst of Caine (`creation.maturation`) |  | gated | 1 | gatedamaturation 2. the Maturation window buys a dot of Strength |
| Pass the Years: era advancement, ages and time awake across the centuries (`creation.pass-years`) |  | shown | 1 |  |
| The archive of the dead, by hand and by itself as the clock moves on (`creation.archive`) |  | book |  | gatetruthsheets 8. the long dead go to the archive by themselves |
| The Dark Ages Companion's demons and the V20 Dark Ages Companion's monsters as sheets (`creation.dac-demons`) |  | gated | 1 | gatedadacdemons 1. the window makes two demons with its Make button |
| The Dark Ages Storytellers Companion's supporting characters as ready sheets, by tier (`creation.supporting-cast`) |  | gated | 1 | gatedasupporting 1. the window makes two experienced templates with its Make button |
| The First Change: a mortal becomes a Garou (`creation.first-change`) |  | gated | 1 | gate6b first change |

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
| Road and domain strip: the Road, Mentor, domain and oaths at a glance on the Bio tab (`sheets.standing-strip`) |  | shown | 1 |  |
| Sheet tools: the title bar's buttons and window controls in one menu (`sheets.sheet-tools`) |  | book |  | gateplayerextras 8. sheet tools |
| The anachronism check: when the clock jumps, possessions and map things out of their time go on one card (`sheets.anachronism-check`) |  | shown | 1 |  |

## wodx-storyteller

| Feature | Core | Status | Open | Gate |
| --- | --- | --- | --- | --- |
| Great events and war at home in the sky over the towns (`storyteller.event-looks`) | core | gated | 1 | gatedatedplay 5 |
| Market news: dated events and trade move the markets, applied from a card (`storyteller.market-news`) | core | gated |  | gatedatedplay 4 |
| The Ledger: a dated debt, oath or boon comes due as the clock passes it (`storyteller.ledger-due`) | core | shown | 2 |  |
