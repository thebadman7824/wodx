# Phase 6c research notes: mortals, hunters, wraiths

Mechanics only, in WoDX's own words, with page references. No book text. Decisions B42–B45.

## Wraith 20th (Wraith: The Oblivion 20th Anniversary Edition core; pdf page = printed + 65)

### Arcanoi (Chapter 5, pp. 149–219)
- An art's pool is an Attribute + the Arcanos rating; most cost temporary Pathos, some also Corpus or Willpower; coercive or destructive arts can give the Shadow temporary Angst (p. 149).
- Each Arcanos has five levels with a Common and an Initiate art at each (some levels differ). Parsed into `wodx-actions/data/arcanoi-w20.json`.
- Flux arts use the local Shroud as difficulty unless stated (p. 172); Outrage across the Shroud uses the Shroud rating (p. 196); Usury needs touch (p. 213).

### Passions (pp. 305–307)
- Acting on a Passion and feeling its emotion: roll the Passion's rating (6); each success 1 Pathos, up to the maximum; once a scene per Passion. Secondhand (a mortal feeling the same thing in the same context): difficulty 8.
- New Passion 3 XP; raising one 3 × current rating (Storyteller's approval).
- Neglect: the Storyteller calls a rating roll at 9; failure −1, botch −2; a Passion at 0 drops the wraith into a Harrowing.
- Resolving: rating rolls at 9 lower it (not to 0); Resolution is Willpower at the original rating + 4 needing successes equal to the original rating; failure raises it by one.

### Fetters (pp. 308–309)
- With Fetters she may stay in the Shadowlands; with none, 1 Willpower a scene there.
- After a scene with real contact with a Fetter: roll its rating (6), 1 Willpower a success. Slumbering in a Fetter: each 8 hours roll its rating (4), 1 Willpower a success.
- Unresolved Fetters: +1 difficulty to everything in the Tempest, +2 in the Labyrinth.
- A Fetter destroyed: immediate Harrowing, the Fetter is gone. Neglect roll at 9 as for Passions. New Fetter or a higher rating: 3 × the rating in XP, all at once, Storyteller's approval.

### Willpower (p. 304)
- Spending the last temporary Willpower drops her into a Harrowing; losing the last permanent dot: the Void (no Fetters) or a Drone.

### The Shadow
- The Shadow gains 1 XP for every 3 the Psyche gains, rounded up; buys Thorns, Angst, Dark Passions (p. 303).
- Starting Angst: roll dice equal to Willpower at 6; ones don't cancel; at least 1 permanent Angst (p. 230).
- Catharsis: when temporary Angst is above her Willpower the Shadow may try; it spends 1 temporary Angst and rolls temporary Angst (6) against the Psyche's permanent Willpower plus Eidolon dice (6); more successes take or keep control (pp. 230, 236).
- Shadow Dice: the Shadow may offer up to 5 extra dice on a roll; every 1 on them is a temporary Angst point (p. 235). Dark Passion: when she indulges its emotion the Shadowguide rolls it (7); evoking it in others (9); 1 Angst a success (p. 235).
- Thorns (pp. 231–234), cost in Shadow points: Spectre Prestige, Dark Allies, Tainted Relic, Infamy (1 a level); Shadow Traits, Nightmares, Aura of Corruption (+2 Social difficulty), Mirror, Shadow Call (spend 1 Angst, roll permanent Angst at 7) (2); Pact of Doom, Trick of the Light, Bad Luck (1 Angst a forced reroll), Shadowed Face (3); Honeyed Tongue (1 Angst, temporary Angst vs Manipulation + Subterfuge), Tainted Touch (3 dice at 6; Willpower 7 to resist) (4); Shadowplay, Shadow Familiar, Freudian Slip (1 Angst; Willpower 7 resists), Shadow Life (5); Whispers, Manifestation (6); Devil's Dare, Vampiric Nature (contested Willpower, Angst drained) (7).
- Harrowing: played out; with no solution the Storyteller calls a permanent Willpower roll at 9 (good play may lower it; no Shadow Dice). Eidolon once a session at 9, a success per change to the Harrowing; Willpower buys an automatic success on the Eidolon or escape roll, not the last point (pp. 242–243). Failing a Passion's Harrowing loses that Passion and risks another (rating at 5, −1 on failure); otherwise permanent Willpower vs the Shadow's permanent Angst (6) (pp. 244–245). Destruction Harrowings take 1–3 temporary Angst off.

### Corpus, damage, healing (pp. 292–297, 328)
- Corpus 10 at the start (p. 114). States: Corporeal, Incorporeal (a Skinlands blow: 1 bashing and Incorporeal for Stamina rounds), Wavering (Corpus full of bashing: 2 bashing each time she goes Incorporeal; lethal or aggravated starts a Harrowing), Material, Harrowed (p. 292).
- Wraiths soak bashing and lethal with Stamina; only armor or Arcanoi (Moliate, Outrage) soak aggravated (p. 328). Bashing past the track becomes lethal.
- Healing: 1 bashing an hour; 1 Pathos heals 2 bashing or 1 lethal (one Pathos a turn); aggravated: 3 Pathos and 8 hours' Slumber or meditation per level, one level per 8 hours (pp. 115, 295).
- Barrow-flame: Stamina soak at the fire's heat (3 candle … 10 molten steel), 1–3 levels a turn by size, aggravated; a botch maims (p. 296). Falls: 5–9 ft 1 bashing, then a lethal level per 10 ft (max 10); Stamina soak at 8, at 10 beyond 50 ft (p. 297).
- Maelstrom hazards: freezing rain (half the storm's damage dice, from Pathos then Willpower), fog (difficulty + rating; Perception + Awareness at 5 + rating vs the storm's dice), searing lightning (highest Fetter at 5 + rating or +2 difficulty for rating turns) (pp. 287–288).

### Pathos, Willpower, Memoriam (pp. 111, 114–115)
- Start: Pathos 5 + Memoriam (max 10 with freebies), Willpower 5 (max 10). Creation: Attributes 7/5/3, Abilities 13/9/5, Arcanoi 5, Backgrounds 7, Passions 10, Fetters 10, 15 freebies.
- Memoriam once a session at 8: 1 Pathos a success. One Willpower a turn: an automatic success.

### The Shroud (pp. 282–284, 288)
- Rated 4–10 (busy afternoon shopping centre 10 … abandoned cemetery at a new moon's midnight 4). −2 near a supernatural creature; Hysteria −1 each (at most −3, until the scene ends); a Haunt lowers it by its rating and keeps it steady. Never under 4.

### Death and the Caul (pp. 280–282)
- Removing her own Caul: 1 Willpower, then Willpower at 4, 1 Pathos a success over the start (may pass 10; above 10 she glows: −1 to Perception rolls to notice her).
- A Reaper guiding it: 1 Willpower to link, Charisma + Empathy at 9 − the Enfant's Memoriam; success gives the Reaper Pathos equal to the Enfant's Memoriam + 2, and −2 to Empathy difficulties with her for the session; teamwork allowed.

## True Faith (V20 Dark Ages pp. 392–395; Dark Ages basis, B42)
- A trait of 1–5 dots, no Merit or XP cost, by the Storyteller's leave; no starting character above 1. Found mostly among mortals; among Cainites only on Humanity (Path of Illumination) or Heaven, others with the Storyteller's approval (p. 392).
- Each dot gives an extra dot of Willpower (p. 393).
- Losing it: an act that builds darkness calls a Conscience roll at 9; failure loses a level for now. Road below 7: no True Faith; back at 7 it restarts at one dot (p. 393).
- Powers (p. 394):
  - Always: spend 1 Willpower to resist a power, Discipline, ghostly manifestation or witchcraft that would hurt or coerce her: her Faith is subtracted from its successes (doubled against Daimoinon).
  - •: repel the dark — 1 Willpower, roll Faith at the creature's current Willpower; no successes: it can't advance on her with ill intent; success: it flees a turn per success; touching it, the successes are aggravated damage.
  - ••: unease near the unnatural (no roll; the Storyteller may name a monster).
  - •••: immune to Chimerstry, Dementation, Dominate, Obfuscate and other mind-clouding powers.
  - ••••: immune to the Blood Oath and ghouling; can't be raised as a ghost or a walking corpse; immune to Presence and emotion powers.
  - •••••: her prayer or kind words: vampires resist Rötschreck at 9 or flee the scene (or harm themselves if trapped); a monster that doesn't redeem itself next story loses a Road dot and its highest Virtue.
  - Miracles: at most once a story, the impossible without a roll.
- Holy Artifacts: True Faith 1–5 of their own; the Faithful add it to theirs (up to 10) while they act for the light (p. 395).

## The Hunters Hunted II (V20 companion; Victorian Age to 1998 hunters, and mortal Numina in every era) — pdf page = printed + 1
- Creation (p. 35): Backgrounds 5, Virtues 7, freebies 21 (Attribute 5, Ability 2, Numina 7, Background 1, Virtue 2, Humanity 2, Willpower 1 a dot). Humanity = Conscience + Self-Control; Willpower = Courage (p. 42). Merits and Flaws pp. 42–44 (Black and White: Willpower at 7 facing brutal or supernatural violence, etc.).
- Numina kinds (p. 70): Hedge Magic, Psychic Phenomena, True Faith.
- Hedge Magic paths:
  - Curses (p. 72–73): Manipulation + Intimidation (7), 1 Willpower; +1 … higher difficulty to the cursed situation by level; breaking a curse Wits + Subterfuge (9), 1 Willpower (botch: suffer it). Humanity rolls for frequent cursing.
  - Divination (p. 74–75): Perception + Occult (7), +1 for others; 1 initiative −1 an hour a success; 2 warnings; 3 short-term outcomes; 4 likely events (1 Willpower, difficulty 8, −1 to −3 with a personal link); 5 concrete futures.
  - Healing (p. 75–77): Manipulation + Medicine (7) (+1 self, +1 unwilling, +2 under stress); 1 diagnosis; 2 ignore wound penalties 10 min a success, minor ailments; 3 broken bones and chronic illness; 4 1 Willpower: a bashing or lethal level, +1 a success (lethal: +1 difficulty migraine an hour); 5 1 Willpower, difficulty 8: aggravated levels, a success each; cures grave illness.
- Psychic Phenomena (pp. 77–83), each 1 Willpower unless noted:
  - Astral Projection: Perception + Awareness (8); 1 astral sight; 2 a minute a success; 3 manifest; 4 an hour a success; 5 hide in the astral (Manipulation + Awareness 8).
  - Cyberkinesis: Manipulation + Technology (7); 1 understand a device; 2 surge or damage by touch; 3 read, encrypt, decrypt data (successes as a penalty to others); 4 control devices in sight, 10 minutes a success (5 bashing if destroyed); 5 operate any device touched.
  - Psychometry: Perception + Empathy (7); 1 the owner or main visitor; 2 the last 24 hours; 3 the full history; 4 watch the owner 10 minutes a success; 5 track the owner's direction and distance.
  - Pyrokinesis: Manipulation + Awareness; 1 candle (soak 3, 1 aggravated a turn); 2 palm of flame (4, 1); 3 torch; 4 bonfire (7, 2); 5 inferno (9, 3); dodge by Dexterity + Athletics against the successes.
  - Telekinesis: Wits + Awareness; weight by level (1 lb, 20 lb, 200 lb, 500 lb, 1,000 lb); a turn a success, five: the scene; sentient targets resist with Willpower each turn; wresting an object: contest with Strength.
- True Faith (pp. 83–85; the modern rules): each dot a Willpower dot; resisting a power: 1 Willpower, roll Faith at 7, successes cancel the power's; repel: 1 Willpower, Faith vs the creature's permanent Willpower (no successes: it may not advance); 2 senses vampires in quiet; 3 immune to mind powers; 4 can't be ghouled, bound or raised; 5 vampires who hear her or are touched resist Rötschreck at 9 or flee the scene. Losing it: failing the faith's mandates, Conscience at 9 or lose a level. Miracles (p. 85).

## Dark Ages: Inquisitor (Dark Ages hunters, B42) — pdf page = printed + 1; OCR'd on Ben's PC
- Creation (pp. 146–151): Attributes 6/4/3, Abilities 11/7/4 (max 3; Theology 1 required), Backgrounds 5, Virtues 7 (Conscience, Self-Control, Courage), one dot in the order's primary Superior Virtue, one Orison, either an Acolyte Endowment (and an Acolyte Curse) or the order's benefit and drawback; bonus 21 (Attribute 5, Ability 2, Specialty 1, Background 1, Virtue 2, Willpower 1, Piety 1, Holy Art 5; never Endowments, Orisons, Superior Virtues or Conviction). No Domain, Generation, Herd or Status.
- Starting traits: Conviction = the primary Superior Virtue + its basic Virtue; Piety = Conscience + Self-Control; Willpower = Courage + Zeal (pp. 147, 150).
- Superior Virtues (p. 157): Faith (on Conscience), Wisdom (on Self-Control), Zeal (on Courage); 1–5, never above the basic Virtue. Stage by their total (p. 151): 0 Servant (Conviction at most 1), 1–4 Acolyte, 5–9 Advocate, 10+ Judge.
- Orders (p. 147): Knights of Acre (Zeal; Sedulitas Filius), Sisters of St John (Boni Spiritus), Red Order (Holy Art: one dot in a path and a Level One ritus), Oculi Dei and House of Murnau (Sophia Patris). Endowments: Benedictions, Investitures, Legacies (Murnau), Psalms; each has a Faith, a Wisdom and a Zeal application, rolled as an Attribute + that Superior Virtue.
- Piety and the Hierarchy of Sins against God (p. 159): 10 impure or angry thoughts; 9 any sexual act; 8 lying or breaking one's word; 7 taking money; 6 acting from anger or another sinful impulse; 5 not trying to teach a heretic or pagan; 4 not trying to redeem a sinner; 3 harming a Christian; 2 aiding or allying with a demon; 1 killing a Christian. A sin at or below Piety: Conscience + Faith at 6 (7 if Callous); success −1 Conviction (confession restores it); failure −1 Piety; botch: a Curse roll.
- Conviction (pp. 159–161), 1–10: spend on Blessings; 1 on a Virtue roll for an automatic success (only Conviction there, never Willpower); 10 banked = a Superior Virtue dot or an Orison, 15 an Acolyte Endowment, 25 an Advocate, 35 a Judge one (p. 173); banking takes an hour of prayer a point.
  - Risking Conviction: once a scene, 1–3 on a Blessing roll, a die each; success: back with +1; failure: lost; botch: all Conviction lost.
  - Victory: primary Superior Virtue + its Virtue at 7: +1; botch −1.
  - Prayer: an hour on Holy Ground, over a Holy Relic or with a Flock; roll that rating at 7, a point a success; each extra hour −1 (min 3); once a day, each later day +1 (max 10); never above Piety.
  - A new story: up to Conscience + Faith.
  - Holy Relics: once a story, the rating at 6, a point a success up to Piety (p. 156).
  - At 0: no Blessings, no Virtue rolls against the enemy (p. 161).
- Callousness (p. 162): Conviction above Piety; Empathy rolls +2 difficulty; when the Impulse applies, Conscience + Faith at 6 to resist it.
- Thralldom (p. 162): Self-Control + Wisdom at 6, opposed (no Wisdom: spend 1 Conviction); memory: Self-Control + Wisdom at 6. Terror (p. 163): Courage + Zeal at 6 to walk into danger (failure: −1 die the scene), at 8 − Exposure facing the overtly supernatural (failure: −2 dice); against fear powers, more successes than the power; a botch: flight. No Zeal: spend 1 Conviction to roll. A mortal with 1 Conviction may resist once.
- Exposure (p. 156): the Storyteller rolls Wits + Exposure in secret on meeting a supernatural being.
- True Faith equivalence (p. 158): Servant 1, Acolyte 2, Advocate 3, Judge 4.
- Experience (p. 161): Attribute ×4, Ability ×2, new Ability 3, new Holy Art path 10, primary path ×5, other path ×7, Virtue ×2, Willpower ×1.

## Hunter: The Reckoning (1999 on, B42) — pdf page = printed + 1; OCR'd on Ben's PC
- Conviction (pp. 132–139), 1–10, only for the imbued. Starting Conviction by creed. Willpower never helps edges; Conviction does.
- Spending 1 Conviction (a reflexive action) gives, for the scene: second sight (hidden supernatural beings show as inhuman; spirits and ghosts look physical; possessors appear over their hosts) and self-control (immune to supernatural fear, mind and emotion control and bodily possession; memories kept). No Conviction spent: a normal person for supernatural effects.
- Optional reactive Conviction (p. 133): on a warning sign, Intelligence, Perception or Wits + the primary Virtue (or Alertness, Awareness, Intuition) at 6, perhaps resisted by the creature's Stealth or power; success lets Conviction be spent in time.
- Storyteller's prerogative (p. 135): against a mighty foe, a primary Virtue roll at 6 (powerful) to 8 (titanic) for second sight and protection to work against it; a botch leaves the hunter helpless against it for the scene.
- Some edges cost Conviction to activate (Chapter 5); that is separate from risking.
- Risking (pp. 136–138): once a scene, any or all current Conviction into one edge roll, a die each; success (and the action must achieve something; a resisted roll must be won): keep it and +1 (the Storyteller may give 2–3 for a momentous gamble, never more than 3); failure: all invested lost; botch: all current Conviction lost.
- Regaining (pp. 138–139): back to the creed's starting level at the next story (or session/scene by the Storyteller); +1 for an amazing or inventive feat (once a session); +1 for fulfilling the creed dramatically (once a session); +1 for convincing a hunter of another creed to follow one's own purpose (once a session); optional loss for straying from the creed.
- Maxing out (p. 139): at 10 Conviction, cash it in for a Virtue point; no Virtue may pass the primary Virtue.

## V20 Ghouls and Revenants (ghouls outside the Dark Ages; Dark Ages ghouls keep V20 Dark Ages p. 399) — pdf page = printed + 1
- Aging (p. 41): a missed monthly feeding within the natural lifespan resumes aging; past it, 100–250 years: ten times the rate (worse beyond).
- Healing and soak (p. 42): heal with blood like vampires; revenants, and ghouls after their third drink, soak lethal with Stamina (+ Fortitude); aggravated as mortals. Elder ghouls may soak bashing as vampires and halve it.
- Frenzy (p. 42): Self-Control (or Instinct), difficulty usually lower than a vampire's; successes needed set by the Storyteller; each a turn of reprieve, five at most.
- Overfeeding (p. 43): Stamina extra blood points above the pool; more than that: Stamina at 8; success, the excess can be used at once; failure, a lethal level per excess point and no blood usable until a scene of vomiting. Overdosed: frenzies like a vampire, +1 Dexterity, Perception + Self-Control each scene or hallucinations.
- Withdrawal (p. 43): from a missed monthly feeding; about a month (or 6 − Stamina weeks); Self-Control (or Instinct) at 7 to resist a chance to feed.
- Elder ghouls by day (p. 44, optional): fed 100+ years, a Willpower check to stay awake by day; dozing off, Stamina + Alertness at 7 to wake.

## Wraith: The Great War (the Great War profile, B43) — printed page = pdf page; OCR'd on Ben's PC, art names and levels checked against the page images
- The Arts of the War Dead (p. 115): the Arcanoi differ from Wraith: The Oblivion. Inhabit is not yet possible (Kinesis stands in its place). At the Storyteller's discretion, standard arts may be bought instead.
- Each Arcanos has Basic Abilities that come with any dot, then five arts (pp. 115–134). The Forbidden Arcanoi (p. 131) are not detailed beyond Mnemosynis being unknown.
- Alternate arts (p. 134): arts of another level, at a cost.
- War arts:
  - haunting a vessel with Lifeweb (p. 74);
  - Argos ship crossings into the Tempest (p. 75);
  - binding a ship's crossing (p. 90).
- The Fourth Great Maelstrom by force (p. 87): damage dice a scene to the exposed, the chance it is aggravated, the outdoor difficulty, and how armor and Haunts protect.
- Creation (p. 100):
  - Attributes 7/5/3, Abilities 13/9/5, Arcanoi 5, Backgrounds 7, Passions 10, Fetters 10, Pathos 5 + Memoriam.
  - Freebies: Arcanoi 5 a dot, Basic Abilities 3 an Arcanos, Willpower 2, Abilities 2, Passions 2, Backgrounds 1, Fetters 1, Pathos 1 per 2 dots.
  - These belong to WoDX Creation's era tables; not built yet.
