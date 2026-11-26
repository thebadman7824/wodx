# Features

Written by `node tools/registry/registry.mjs summary --write` from registry/features/ (B7148). Do not edit by hand.
Status is the last step a row has proof for: planned, built, wired, shown, gated, book, verified (registry/features/README.md).

| Module | Seeded | Rows | Verified | Half-built |
| --- | --- | --- | --- | --- |
| system | not yet | 0 | 0 | 0 |
| wodx-actions | yes | 45 | 0 | 4 |
| wodx-atmosphere | not yet | 0 | 0 | 0 |
| wodx-chronicle | not yet | 3 | 0 | 0 |
| wodx-combat | yes | 16 | 0 | 0 |
| wodx-creation | yes | 23 | 0 | 1 |
| wodx-interactables | not yet | 0 | 0 | 0 |
| wodx-library | not yet | 0 | 0 | 0 |
| wodx-npc | yes | 34 | 0 | 15 |
| wodx-otherworlds | not yet | 0 | 0 | 0 |
| wodx-paperdoll | not yet | 0 | 0 | 0 |
| wodx-rothenstein | not yet | 0 | 0 | 0 |
| wodx-senses | not yet | 0 | 0 | 0 |
| wodx-sheets | yes | 20 | 0 | 1 |
| wodx-solo | not yet | 0 | 0 | 0 |
| wodx-storyteller | not yet | 4 | 0 | 1 |
| wodx-targeting | not yet | 0 | 0 | 0 |
| wodx-voices | not yet | 0 | 0 | 0 |

## wodx-actions

| Feature | Core | Status | Open | Gate |
| --- | --- | --- | --- | --- |
| A long roll's time moves the clock (`actions.spend-time`) | core | gated |  | gatespendtime 1. an extended roll rolled until done moves the clock by its time |
| A power's effect keywords on the effects card, and powers that apply or reach the world themselves (`actions.power-effects`) | core | gated | 1 | gatepowers 6 V20 Discipline library |
| Building a domain: the manor's aspects, holdings and fealty (`actions.domain`) | core | gated | 1 | gatedadomain2 1. the Domain window saves the manor's aspects |
| Common checks: noticing, reading a person, keeping one's feet, resisting (`actions.common-checks`) | core | gated | 1 | gatechecks 4 notice |
| Day sleep: Cainites sleep while the sun is up and rise at their own hour (`actions.daysleep`) | core | gated | 1 | gatedaysleep 4. rises at the hour, heals with blood |
| Debts and oaths, the Blood Hunt, and the marks of the Beast, low Humanity and diablerie (`actions.debts-marks`) | core | gated | 1 | gatedebtsmarks a. Blood Hunt |
| Disciplines you can see on the map (`actions.discipline-looks`) | core | book |  | gatedalooks 1. Dread Gaze marks the token |
| Feeding: what the Kiss does to the vessel, clan and bloodline palates, and the night's hunt (`actions.feeding`) | core | gated | 1 | gatefeed 2 feed on an unlinked mortal |
| Frenzy and Rötschreck checks, by hand and when provoked (`actions.frenzy`) | core | gated | 3 | gatetruthactions 9. Destiny rolls a failed frenzy check again |
| How often a power may be used, and the costs it pays when it ends (`actions.limits-costs`) | core | gated |  | gategiftused 1. a used once-a-scene Gift is greyed in the Gift window |
| Inquisitors and True Faith: orders, Superior Virtues, Conviction, Piety and Blessings (`actions.inquisitors`) | core | gated | 4 | gateinqblessings 1. Wreathed in Shadows adds the Flock at once |
| Merits, flaws and what other modules leave on a character reach the dice (`actions.trait-hooks`) | core | gated | 1 | gatedamerits 2. Thirteenth Generation makes a Discipline one harder |
| Nature gives Willpower back when the character acts to it (`actions.nature`) | core | gated | 1 | gatetruthsheets 3. the Nature button on a plain mortal |
| Powers that act each turn while they hold (`actions.timed-powers`) | core | gated |  | gatetimedpowers 1. a Heart Claw takes a lethal level on the bearer's next turn |
| Rituals and path magic: Thaumaturgy, Necromancy and Koldunic sorcery on the effects card (`actions.rituals-paths`) | core | gated | 1 | gaterituals 2b. a Ward is armour on a weapon blow's soak too |
| Sins against the Road: the hierarchy of sins, Conscience rolls and the loss of a Road dot (`actions.road-sins`) | core | gated | 2 | gatedasins 1. a lie told through the action window takes a Conscience dot |
| Summoned beings and the rules every summoning lives by (`actions.summons`) | core | shown | 1 |  |
| The action window, the profile menus and the WoDX card (`actions.action-window`) | core | gated | 2 | gate6e a card: header, roll, what changed with pips |
| The actions that make servants: enchantment, oaths, bonds (`actions.servant-actions`) | core | gated |  | gateenchant 1. Enchant from the changeling's Actions menu spends Glamour and binds the mortal |
| The ghosts of V20 Dark Ages: Passion as blood, manifesting (`actions.ghosts-da`) | core | gated | 1 | gateghostmanifest 1. Manifest from the ghost's Actions menu spends Passion and sets Strength |
| The odds of a roll before it is made (`actions.odds`) | core | book |  | gatetable odds in the Action window |
| The sun: where it stands, wall shadows, and damage in sunlight regions (`actions.sunlight`) | core | gated | 1 | gatedaysleep 6. burned in the sun, the marker shows |
| Trade with one NPC: buy, sell and barter at the prices of the time and place (`actions.trade`) | core | shown | 1 |  |
| Trying again: a failed task tried again is one harder each time (`actions.retry`) | core | gated | 1 | gateretrywindow 1. a failed roll tried again in the action window is one harder |
| Using a Discipline from the V20 Dark Ages library (`actions.disciplines`) | core | gated | 3 | gatedapowers 2. Creatio Ignis 3 works Campfire at difficulty 6 |
| Walking a Road as a faith with people in it: rank, Mentor, the Moment of Truth, changing Roads (`actions.road-faith`) | core | gated | 1 | gatedaroad 4. a change of Road to the Road of the Beast |
| Who an act startles and how far word of it goes (`actions.witness`) | core | shown | 2 |  |
| With this person: dealing with one NPC face to face (`actions.social`) | core | gated | 1 | gatesocial 6 window |
| A Dark Ages mage's everyday wonders (charms, elixirs, tools) enchanted as a craft, and Tass from creatures and the fae (`actions.mage-wonders`) |  | gated | 1 | gatemagewonders 1. unbreakable iron from the household window: the sword strikes +3 |
| A Dark Ages mage's household and standing: chantry and its gossip, familiar, Destiny, Library, servants, talismans, degrees, the DA:Mage merits and flaws (`actions.mage-household`) |  | gated | 1 | gatemagehouse 1. the chantry with no community points: the commoners talk |
| Changelings of the later eras: Arts, Realms, Nightmare, Imbalance and Banality (`actions.c20`) |  | gated | 1 | gate6h Nightmare at 10: it clears, an Imbalance is marked and a Glamour point returns |
| Dark Ages fae: Mists, Weaving, Dominions, cantrips and Treasures (`actions.fae-da`) |  | gated | 2 | gate6g cold iron: an aggravated level through WoDX Combat and a Mists point |
| Dark Ages mages: Foundation and Pillars, the Grimoire, and Consensus by era (`actions.mage-da`) |  | gated | 1 | gate6n a Grimoire rote: Revoking the Gift of Adam casts with its Grimoire page |
| Demon: The Fallen: lores, evocations, Faith and Torment, the apocalyptic form (`actions.demon`) |  | gated | 1 | gate6i choosing the dark effect costs a temporary Torment point |
| Demonic pacts, infernal investments and the Supplicium (`actions.infernal-pacts`) |  | gated | 1 | gatedainfernal 1. the window records a pact and buys Armor |
| Fomor powers and spirit Charms (`actions.fomor-charms`) |  | gated | 1 | gatefomor 6. Regeneration closes a lethal level each new round |
| Mages of the later eras: Arete, Spheres, Paradox and the Quiet (`actions.m20`) |  | gated | 1 | gate6m countermagick: Arete at 7 |
| Orpheus: Vitality, Spite and the Horrors (`actions.orpheus`) |  | gated | 1 | gate6l a Willpower point for three Vitality |
| The imbued of Hunter: The Reckoning (1999 on) (`actions.reckoning`) |  | shown | 1 |  |
| The infernal thrall of Dark Ages: Devil's Due: Vice, Resolve, Torment, sins, pacts, rites and Absolution (`actions.thrall`) |  | gated | 1 | gatethrall 2. a planned murder from the window: Conscience fails and a point of Torment |
| The inner voice: the Beast, the Shadow, Rage and the Impulse played by someone (`actions.voice`) |  | parked |  | gate6d a whisper reaches only the character, the voice and the Storyteller |
| The Kuei-jin: Chi, Dharma, the P'o and their Disciplines (`actions.kote`) |  | gated | 1 | gate6j Dharma 3 allows one Chi a turn |
| The Reborn: Balance, Sekhem and Hekau (`actions.mummy`) |  | gated | 1 | gate6k Forbiddance: Balance against Willpower at 6 |
| The wraith line: Arcanoi, Passions, Fetters, Corpus, soulforging (`actions.wraith`) |  | gated | 2 | gate6c use an Arcanos |
| Werewolf and Fera: Rage, frenzy and the moon, Gnosis, forms, Gifts, totems (`actions.garou`) |  | gated | 3 | gate6b change form |

## wodx-chronicle

| Feature | Core | Status | Open | Gate |
| --- | --- | --- | --- | --- |
| Dated events: history fires on its date as the clock passes it (`chronicle.dated-events`) | core | gated | 2 | gatedatedplay 5 |
| Languages in chat: speech in a language a player's characters lack shows as made-up words (`chronicle.languages-in-chat`) | core | gated | 2 | gateplaylang 4 |
| The Dark Ages line books' merits and flaws: Werewolf, Fae, Devil's Due and the Inquisitor Companion (`chronicle.da-line-traits`) |  | gated | 2 | gatedalists 1 |

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
| The ambush: Dexterity + Stealth against Perception + Alertness for a free attack (`combat.ambush`) | core | gated | 1 | gateambush 1. a hidden attacker's Attack rolls the ambush with the sheets' pools |
| The body plan: shapes, parts, held gear coming off, where blows land, the maiming card (`combat.body-plan`) | core | book |  | gatebody the maiming card |
| Turns that move on by themselves: NPC turns, player turns with a countdown, Hold and Act next (`combat.turn-conductor`) | core | gated | 1 | gate7b1 Everyone: the hero's action is spent, a countdown, then the turn ends with no click |
| Ways of moving: flying, swimming, climbing, into the ground, held breath and drowning, falls (`combat.movement-modes`) | core | gated | 1 | gatemove drowning in a fight |
| Black powder: misfires, wet powder and the lock of the year (`combat.black-powder`) |  | gated | 1 | gatepowder 1. wet powder will not fire from the attack window |
| Fighting with and around vehicles: shelter, the hull's Durability and Structure, ramming (`combat.vehicles`) |  | gated | 1 | gatetruthcombat 10. a quick attack on a vehicle's token comes off its sheet's Structure |
| The Garou maneuvers and pack tactics of Dark Ages: Werewolf (`combat.garou-maneuvers`) |  | gated |  | gatedawfill 2 |

## wodx-creation

| Feature | Core | Status | Open | Gate |
| --- | --- | --- | --- | --- |
| Animals' traits, training and breeds; war ghouls, kennels and household beasts (`creation.animal-training`) | core | gated | 1 | gateanimalstock 5. the wizard offers animal retainers |
| Archive of the dead: the long dead leave the world for a compendium, by hand or by the clock, and come back (`creation.archive-of-the-dead`) | core | gated | 1 | gateplaypage 5 |
| Before the First Night: one hub per character with a card for each step, and the guided builder (`creation.first-night`) | core | book |  | gatefirstnight 4 build |
| Ghouled animals: blood pool by size, the domitor's mark, feeding vitae from the token menu (`creation.animal-ghouls`) | core | gated | 1 | gateanimalghoul 4. Feed vitae on the token menu |
| Giving vitae: a mortal or an animal drinks, ghouls and blood bonds follow (`creation.give-vitae`) | core | gated | 1 | gateghoulclicks 2. Drink makes a ghoul |
| Learning from a source: a teacher, a book, a school or practice, with the rise at the end of a long task (`creation.learning`) | core | gated | 1 | gatelearning 3. the study ends and the trait rises |
| Lifepaths: the mortal years as a drill-down or a short path, and the threads they leave open (`creation.lifepath`) | core | book |  | gateplayercreation 4. short lifepath |
| Revenant families in every era: the year's families at birth, their weaknesses in play, aging on their own vitae (`creation.revenant-families`) | core | book |  | gatedarevenants 2. the Khavi in direct sunlight takes bashing damage, soaked with Stamina and Fortitude |
| Spending experience: the cost by line, the Storyteller's approval, Mentors and the Moment of Truth (`creation.xp-spend`) | core | gated | 1 | gatedaroad 2. a Mentor at 9 dots and the Moment of Truth: the Road dot costs 4, and buying it spends the Moment |
| The Creation window: allies, patrons and the tools for each character (`creation.creation-window`) | core | gated |  | gatecreationaward 1. the Creation window's Award button gives the ticked character 3 experience |
| The Embrace: a mortal becomes a vampire, keeps their traits and is handed to their player (`creation.embrace`) | core | gated | 1 | gatetruthsheets 4. the Embrace hands the player over |
| The group sheet: a coterie, pack or cabal with its members and pooled Backgrounds (`creation.group-sheet`) | core | gated | 1 | gategroupsheet 1. a member's dots typed on the Group sheet pool into the coterie |
| The People generator: mortals and ghouls for the era and homeland, with ready sheets (`creation.people`) | core | gated |  | gatepeoplemake 1. Make them now gives the sheet the window's Nature, Demeanor and Willpower |
| The prelude runner, troupe ties, and the world seeded at sign-off (`creation.prelude-seed`) | core | shown | 1 |  |
| The step-by-step character wizard, the quick start and the derived traits (`creation.wizard`) | core | gated | 3 | gatewizard 10 derived traits |
| The Storyteller characters of V20 Dark Ages as ready sheets (`creation.book-people`) | core | gated | 1 | gatebookpeople 1. Make in People of the book gives the sheet the book's numbers |
| Changes of state that keep the character: death into a wraith, the Awakening, revenants, the Chrysalis, the Fallen (`creation.changes-of-state`) |  | gated | 2 | gatemorebuilds 3. HH2: two Numina dots cost 14 freebies |
| Maturation: a Dark Ages Cainite's years become points, with Tempting Fate, the Sleep of Ages and the Thirst of Caine (`creation.maturation`) |  | gated | 1 | gatedamaturation 2. the Maturation window buys a dot of Strength |
| Pass the Years: era advancement, ages and time awake across the centuries (`creation.pass-years`) |  | gated |  | gatepassyears 3. Pass the years |
| The archive of the dead, by hand and by itself as the clock moves on (`creation.archive`) |  | book |  | gatetruthsheets 8. the long dead go to the archive by themselves |
| The Dark Ages Companion's demons and the V20 Dark Ages Companion's monsters as sheets (`creation.dac-demons`) |  | gated | 1 | gatedadacdemons 1. the window makes two demons with its Make button |
| The Dark Ages Storytellers Companion's supporting characters as ready sheets, by tier (`creation.supporting-cast`) |  | gated | 1 | gatedasupporting 1. the window makes two experienced templates with its Make button |
| The First Change: a mortal becomes a Garou (`creation.first-change`) |  | gated | 1 | gate6b first change |

## wodx-npc

| Feature | Core | Status | Open | Gate |
| --- | --- | --- | --- | --- |
| A domain someone else wants: poaching, its signs and tracking the poacher (`npc.poaching`) | core | gated | 1 | gatedadomain 3. the holder tracks the poacher: Perception + Investigation at 4, and finds it |
| A Road's followers in a town as a small Kindred faction (`npc.road-flock`) | core | gated | 1 | gatedaflock 1. the Storyteller gathers the Luminaries of the scene from the Road window |
| Alarms: a place raised to alarm and how NPCs answer what happens on the map (`npc.alerts`) | core | shown | 1 |  |
| An NPC uses its own powers in a fight, and holds back obvious ones while mortals watch (`npc.auto-powers`) | core | book |  | gatetruthnpc 5. Auto: an NPC whose best option is a power uses it on its own turn |
| Bonds from the books as relationships, with what each one does: the blood bond, the Vinculum, Fetters (`npc.bonds`) | core | gated | 1 | gatebonds 7. sheet |
| Courtship, marriage and the law, children, households and loved ones as a weak spot (`npc.hearts`) | core | gated |  | gatewedding 1. Approve on the wedding card marries them, shown as Spouse on the Relationships tab |
| Cults and congregations that gather around a character (`npc.cults`) | core | shown | 1 |  |
| Faces you have met: a stranger's token shows a description until you learn the name (`npc.faces`) | core | shown | 1 |  |
| Factions and domains: members, places held, faction turns, founding, politics and war (`npc.factions`) | core | shown | 1 |  |
| Fear: a Kindred NPC shies from fire in a fight (`npc.fear`) | core | gated | 1 | gate7b fear: a Kindred NPC shies from a torch in the hero's hand |
| Followers who take orders: one window for a character's followers, orders and day jobs (`npc.followers`) | core | book |  | gatefollowers3 3. quick order |
| Footpads, burglars and highwaymen on the prowl pick a mark and demand money (`npc.prowl`) | core | shown | 1 |  |
| How each NPC regards each character, and why (`npc.attitude`) | core | shown | 1 |  |
| Natural rivalries between kinds of NPC, and NPCs who start a fight by themselves (`npc.rivalry`) | core | book |  | gaterivals start the fight |
| NPC archetypes: animals, criminals, combatants, townsfolk and supernatural NPCs by line (`npc.archetypes`) | core | shown | 1 |  |
| NPC combat tactics: each NPC weighs what it could do on its turn and plans the best (`npc.tactics`) | core | book |  | gate7b an NPC's turn: a plan whispered to the Storyteller, best first, each with its reason |
| NPC memory and grudges, and a description of a culprit that spreads and fades (`npc.memory-wanted`) | core | shown | 1 |  |
| NPCs of every line refill their own pools the way their book says (`npc.line-refill`) | core | gated |  | gatenpcrefill 1. a changeling NPC's Sanctuary refills Glamour at the new night |
| NPCs who talk to each other where a character can overhear (`npc.overheard`) | core | shown | 1 |  |
| One ledger for every bond that makes one person serve another, and servants the world makes (`npc.servants`) | core | gated | 1 | gateservants4 6b. the pact gift answers |
| Passers-by and animals on the map, by age and the world's ways of life, and the crowd as a resource (`npc.passersby`) | core | book |  | gateworldways 7. local looks |
| Places, routines on the clock, duties and what an NPC does after its first reaction (`npc.routines`) | core | book |  | gateduties 7. the duty moves the token on the clock |
| Pregnancy and birth by century and place, child sheets and growing up (`npc.family`) | core | gated |  | gatebirth 1. the clock passing the due date brings the birth and the child's sheet |
| Relationships and lineage read from both ends, secrets and hooks (`npc.ties-secrets`) | core | shown | 1 |  |
| Residents of generated towns and settlements (`npc.residents`) | core | shown | 1 |  |
| Standing by community, with news of a deed travelling at the era's speed; social rank and feuds (`npc.standing`) | core | book |  | gatetruthnpc 11. untying a prisoner is a deed: standing in the town rises |
| The faith calendar and the hunt: feast days, fasts and curfews change the hunt (`npc.hunt-calendar`) | core | gated | 1 | gatehuntcalendar 1. the hunt window's calendar step is in the hunt's difficulty |
| The topic menu: walk up to someone and pick a topic, and the talk generator for unwritten answers (`npc.talk`) | core | book |  | gatetalk the window |
| Trust, betrayal, boons in every line, blackmail and hidden loyalties (`npc.trust`) | core | shown | 2 |  |
| What comes after: the law, wounds tended, after the Kiss, mourning, carried home, mended by its own power (`npc.aftercare`) | core | gated | 1 | gateaftercare 3. after the Kiss |
| Family lines that outlive the character, and ties after a jump in time (`npc.kin`) |  | shown | 1 |  |
| Off-screen lives of supernatural NPCs across a jump in time (`npc.fates`) |  | shown | 1 |  |
| Past lives, lines of teaching, the web of every tie and scene ideas from ties (`npc.legacy`) |  | gated |  | gatementorgone 1. the Move button on the teacher's death card puts the Mentor points on another Background |
| Who holds a place, shown on its scene (`npc.faction-looks`) |  | shown | 1 |  |

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
| The sheet's second page: Combat, Possessions, the line's own boxes and its row of actions (`sheets.page-two`) | core | gated | 1 | gateplaypage 4 |
| Bring forward: things on the maps swap for their equal in the card's year (`sheets.bring-forward`) |  | book |  | gatebringforward buttons |
| History with Undo for this session's edits, and Print (`sheets.history-print`) |  | gated |  | gatehistoryundo 1. Undo in the sheet's History window puts Strength back |
| Road and domain strip: the Road, Mentor, domain and oaths at a glance on the Bio tab (`sheets.standing-strip`) |  | gated |  | gatestandingstrip 1. the Bio tab's strip shows the sheet's Road and opens the Road window |
| Sheet tools: the title bar's buttons and window controls in one menu (`sheets.sheet-tools`) |  | book |  | gateplayerextras 8. sheet tools |
| The anachronism check: when the clock jumps, possessions and map things out of their time go on one card (`sheets.anachronism-check`) |  | shown | 1 |  |

## wodx-storyteller

| Feature | Core | Status | Open | Gate |
| --- | --- | --- | --- | --- |
| Great events and war at home in the sky over the towns (`storyteller.event-looks`) | core | gated | 1 | gatedatedplay 5 |
| Market news: dated events and trade move the markets, applied from a card (`storyteller.market-news`) | core | gated |  | gatedatedplay 4 |
| The Ledger: a dated debt, oath or boon comes due as the clock passes it (`storyteller.ledger-due`) | core | shown | 2 |  |
| An inquisitor cell to live in: the daily round and chapter, rector and officers, the chapter-house, the Flock, confession, retreats (`storyteller.inquisitor-cell`) |  | gated | 2 | gateinqcell 3. Holy Ground 2 at the chapter-house: on the sheet, and two Willpower on waking |
