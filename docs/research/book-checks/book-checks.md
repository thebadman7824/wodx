# Book checks for the Master Plan gaps (2026-11-09)

Mechanics and page refs only, written in our own words. Every page is marked pdf or printed.

## 1. V20 core: doors, locks, windows, walls

V20 core: printed page = pdf page − 8.

| Topic | Mechanic | Page |
|---|---|---|
| Opening/Closing (Strength) | Difficulty 6 to 8, set by the door's material. Successes needed: about 1 for a standard interior door, 5 for a reinforced door, 10 or more for a vault door. It can be an extended action. On a botch, the character takes one lethal level (a hurt shoulder). | pdf 269 / printed 261 |
| Strength Feats chart | Feat Strength 3 breaks down a wooden door. 5 forces a metal fire door. 9 punches through a cement wall. 11 punches through 1-inch sheet metal. | pdf 269 / printed 261 |
| Intrusion (Dexterity or Perception + Larceny) | Difficulty 5 for a standard lock, up to 9. Active security has to be beaten on the first try or the alarm goes off. A manual lock can be retried. The Storyteller may require a minimum Larceny. | pdf 268 / printed 260 |
| Larceny Ability | 1 dot picks a simple lock. 3 dots open a standard locked window from outside. | pdf 113 / printed 105 |
| Technology Ability | Covers security systems. | pdf 118 / printed 110 |
| Spotting alarms | Perception + Larceny. | pdf 263 / printed 255 |
| Retrying a failed action | Each retry is +1 difficulty. | pdf 259 / printed 251 |
| Resisted door push | Two characters push against each other on the same door. | pdf 260 / printed 252 |
| Climbing | Climbing rules. | pdf 266 / printed 258 |
| Falling | One die of bashing damage per 10 feet fallen. It can be soaked. This answers the TODO at wodx-interactables interact-rules.mjs:83. | pdf 304 / printed 296 |

## 2. V20 Linguistics

- V20 core has no Linguistics Ability. Languages come from Merits.
- **Language** Merit: 1 point. Each purchase gives one language. pdf 492 / printed 484.
- **Natural Linguist** Merit: 2 points. +3 dice on language rolls, and each Language Merit gives two languages instead of one. pdf 493 / printed 485.
- "Linguistics" also appears as an example specialty of Academics. pdf 116 / printed 108.
- So "languages per dot" does not apply to V20. If WoDX wants a Linguistics trait anyway, that would be a house rule.

## 3. Elder powers and paths (V20 Dark Ages), checked against the Targeting tags

Book: VtDA20. Page = printed, and pdf = printed + 1.

I checked all 192 tagged entries: the 6th-dot-and-up Discipline powers plus the Necromancy, Thaumaturgy, Koldunic and Abyss paths. For most of them the book names a single target and the current tag fits. I list only the tags that look wrong, and the powers where the book fixes the number of targets.

Tag format: intent.range. Intents: h hostile, p helpful, x heal, s self, a area, e either. Ranges: t touch, r reach, v voice, s sight, u unlimited.

### Tags that look wrong

| id | now | book says | suggest | p. |
|---|---|---|---|---|
| auspex-anticipate-victory | s.t | Rolled against an opponent (difficulty = the target's Manipulation + skill). The bonus dice go to the user. | e.s | 199 |
| auspex-a-gathering-of-souls | s.t | Brings other characters into the flight. The vampire touches them. Willing or unwilling. | e.t | 199 |
| bardo-boon-of-anubis | s.t | Makes the target immune to the Embrace. | p.t | 202 |
| animalism-the-twin-souls | e.s | The vampire touches the animal. | e.t | 193 |
| chimerstry-fabrication | s.t | Can affect conscious targets, up to the user's Willpower in number, anywhere within miles that the user is aware of. | a.u | 207 |
| daimoinon-bring-the-plague | a.s | Touch the first victim (contested). Then it spreads by contagion. | h.t | 210 |
| dementation-prison-of-the-mind | h.s | Touch with vitae first (a Brawl attack), then eye contact. | h.t | 217 |
| dementation-brothers-gift | e.s | A hand on the target's face. Clears derangements and outside mind control. | p.t | 217 |
| dominate-obedience | e.t | A permanent upgrade. Dominate then needs only a skin touch, not eye contact. Not a power used on a target. | s.t (passive) | 220 |
| dominate-loyalty | e.s | Passive. Rivals take +3 difficulty to take control of the user's thralls. | s.t (passive) | 220 |
| auspex-the-hearts-desire | e.s | Read one partner (difficulty = their Willpower). The bonus applies to the user's next Social roll. | e.s (fine), note it is a single target | 198 |
| auspex-brutal-ecstasy | e.s | Passive. Wound penalties become bonus dice. | s.t | 199 |
| chimerstry-blade-of-the-demons | e.s | Makes a weapon in the user's own hand. | s.t | 206 |
| obfuscate-fortress-of-silence | s.t | Has a mode that targets an opponent (Stamina + Occult against the opponent's Willpower). | e.s | 227 |
| presence-pulse-of-the-people | s.t | Broadcasts an emotion to the residents of a place the user is in. | a.u (area = the place) | 239 |
| protean-reversion-to-the-true-form | s.t | Must touch the victim's flesh. Resisted. | h.t | 243 |
| quietus-hematus-songs-of-distant-vitae | e.u | Needs a drop of the target's fresh vitae, and the victim must be in line of sight. | h.s | 251 |
| quietus-hematus-dam-the-hearts-river | h.s | Its first effect is on the user's own blood (defensive, reflexive). | s.t (first effect) | 251 |
| quietus-hematus-condemn-the-sins | h.s | Strikes the target's line of descendants. The user may exempt up to 2 × Wits of them. | a.u | 251 |
| quietus-hematus-blood-awakening | e.s | Reads memories from blood the user has already drunk. | s.t | 250 |
| serpentis-form-of-the-storm | s.t | The user becomes a storm 3 m per Serpentis dot across, which damages everyone inside it each turn. | a.t (area on self) | 254 |
| temporis-kiss-of-lachesis | e.s | A brief touch on the target. | e.t | 258 |
| valeren-healer-heavens-gate | e.s | Works on the subject's head or body (a resurrection). | p.t | 262 |
| valeren-warrior-samiels-vengeance | s.t | Targets any foe who has struck the Salubri. A melee attack. | h.r | 264 |
| valeren-warrior-song-of-the-blooded | a.v | The Salubri goes into a trance (self). | s.t | 265 |
| valeren-watcher-soul-exchange | e.t | Two individuals in line of sight. | e.s (2 targets) | 267 |
| vicissitude-sublimation-of | s.t | Rips the flesh from a subject (Strength + Body Crafts). | h.t | 270 |
| necromancy-corpse-mortuus-in-vultus | s.t | Can also be put on another vampire by touch (a Brawl roll if opposed). | e.t | 282 |
| necromancy-graves-decay-dust-to-dust | h.s | The vampire must be within touch range. The blood can't be flung beyond arm's reach. | h.t | 284 |
| necromancy-twilight-garden-dark-humors | s.t | Affects a target through skin contact with the humor. | h.t | 290 |
| necromancy-twilight-garden-lament-of-dhainu | h.s | Radius around the necromancer, +5 yd per success. Everyone in it except the caster. | a.t (area on self) | 290 |
| necromancy-vitreous-curse-of-the-maelstrom | h.s | Summons Spectres that wreck an area centered on the necromancer. | a.s | 291 |
| necromancy-ash-shroud-mastery | s.t | Changes the difficulty of ghost magic in a half-mile radius. | a.s | 289 |
| thaumaturgy-vitae-blood-awakening | s.t | The user touches the target, and the target spends blood as the user chooses. | e.t | 301 |
| koldunic Transylvanian: burebistas-throne, pietrosus-hospitality, the-banks-of-the-basca, kupalas-exhalation, restless-medias | s.t | All area effects: a radius that grows with successes, a wind around the koldun, a flood path, eruptions, an earthquake. | a.s (pietrosu: a.t) | 275-276 |
| koldunic Black Sea: pontos-axeinos | s.t | Hazards placed for opponents, allotted by successes. | a.s | 278 |

### The book sets how many targets (the house rule still lets the player pick within that)

- **Number set by successes or by points spent**: chimerstry-interrupt-reality (p206, a table by successes), presence-spark-of-rage (p239, 2 / 4 / 8 / 20 / everyone), presence-cooperation (p239), dominate-mass-manipulation (p220, one extra person per success, with eye contact needed only on the strongest), necromancy-bone-seal-of-abamixtra (p279, one corpse per success), necromancy-vitreous-night-cry (p292: the player picks targets and pays 1 blood per extra target).
- **Paid per target**: chimerstry-shared-nightmare (p206, 1 blood per target, compared against each one), valeren-healer-rayzeels-song (p261, 1 Willpower per 3 listeners), animalism-beast-shard (p193, difficulty 5 + the number of targets).
- **Single target or crowd**: chimerstry-synesthesia (p207). One victim at Willpower difficulty, or difficulty 7 against everyone in line of sight.
- **Everyone nearby, no choice**: auspex-omniscience (p199, compared against everyone in the vicinity), obtenebration-ahrimans-demesne (p231, everyone in the darkness), daimoinon-spew-wide-the-pit (p212), necromancy-vitreous-aura-of-decay (p291), necromancy-twilight-garden-lament-of-dhainu (p290).
- **Radius set by successes**: animalism-plague-of-beasts (p194, 1 mile per success; then the animals attack whomever the user directs), koldunic-burebistas-throne (p275, 50 yd up to 3 miles).
- **Fixed range limits**: necromancy-graves-decay-rigor-mortis (p284, 25 yd, visible, one target per success), gift-of-melancholia (p284, 20 yd, line of sight), intimations-of-mortality (p282, a vampire within 20 yd), twilight-garden-whispers-to-the-soul (p289, one target within 100 paces, line of sight), obtenebration-shadow-twin (p230, 50 ft).
- **Contact required**: auspex-souls-sword (p199, physical or eye contact), presence-paralyzing-glance (p238, eye contact), dementation-cobble-the-road and the-sword-of-malkav (p216, eye contact), valeren-warrior-dream-combat (p264, eye contact), valeren-warrior-fiery-agony (p265: touch first, then it keeps working at range).
- **Sight upgrades**: valeren-healer-blissful-gaze (p261) and valeren-watcher-aversion (p266) change their base powers from touch to line of sight.

I did not open these 12 entries one by one. They are self or summon powers, and the tag s.t fits what I could see: the Celerity 6+ powers, the Fortitude and Protean bodily powers, and the Koldunic and Necromancy summoning and sensing powers.

## 4. Dark Ages: Werewolf: figures marked TODO, check or chk

Book: Dark Ages: Werewolf core. The pdf has no text layer, so I OCR'd pdf 78 to 145 on the PC. Page numbers: printed = pdf − 1. The `p` values in gifts-daw.json are already printed pages, and each gift turned up on pdf p + 1.

### Rage roll by moon (6b-werewolf-notes.md:35, "DA:W to check")
- DA:W has **no moon-based difficulty table** for Rage rolls. I read the Rage and Frenzy sections, pdf 90 to 96 / printed 89 to 95. The W20 table (new 8 down to full 4) has no DA:W equivalent, so the notes should say that using it is a house rule.
- What the moon does in DA:W is **regain Rage**. The first time each evening a werewolf sees the moon, it regains 1 Rage under a new moon, 3 under a half or waxing moon, and 4 under a full moon or an eclipse. If the phase matches the auspice, the whole pool comes back. pdf 92 / printed 91.
- Frenzy happens on **4 or more successes** on a Rage roll. pdf 95 / printed 94.
- Thrall of the Wyrm happens on **6 or more successes**, and Willpower can't stop it. pdf 96 / printed 95. The breed versions of the Thrall roll Wits (difficulty 7) after a kill and act on a botch, same page.
- Staying active below Incapacitated is a Rage roll at difficulty 8, with one level healed per success, once per scene. On bashing damage the character frenzies only on 4+ successes. Lethal or aggravated damage means an automatic berserk frenzy plus a Battle Scar. pdf 92 / printed 91.
- The Short Fuse Flaw (2 points) lowers frenzy difficulty by 2, to a minimum of 3, "whatever the moon". pdf 88 / printed 87.

### Metis (garou.json:5, chk)
- Confirmed: Initial Gnosis 3. Beginning Gifts are Create Element, Sense Wyrm and Shed. pdf 81 / printed 80. The page is right, so the chk can come off.
- While I was on that page: the DA:W creation summary gives Attributes 7/5/3, Abilities 13/9/5 (no Ability over 3 at creation, and at least 1 dot of Primal-Urge), 5 Backgrounds (restricted by tribe), 3 Gifts (one each from breed, tribe and auspice), Rage by auspice, Gnosis by breed (homid 1, metis 3, lupus 5), Willpower by tribe, Rank 1, Renown 3 split by auspice, and 15 bonus points. pdf 81 / printed 80. This goes into the creation-totals job as well.

### The 20 gifts marked chk (gifts-daw.json)
"OK" means the stored roll, difficulty and effect match the book, and the chk can come off. Where the book differs, the fix is listed.

| id | p (printed) | finding |
|---|---|---|
| aura-of-confidence | 137 | OK. Charisma + Subterfuge, difficulty 7, one roll per new encounter. Guards against Soulsight only, not stronger mind reading. |
| beast-speech | 124 | Roll OK. The system text gives **no difficulty**, so the stored 6 is the default and not a book figure. One roll per encounter and per kind of animal. Familiar animals may need no roll. |
| call-of-the-wyld | 124 | Roll OK. **No difficulty given** (stored 6 is the default). Successes set how far the howl carries and how strongly it stirs those who hear it. It is used together with a Garou howl. |
| visage-of-fenris | 132 | **Fix d: 6** (now "var"). One success affects non-Garou and Garou of equal rank. Against higher rank, the successes needed are twice the rank difference. For a scene, foes lose 1 initiative and the Fenrir gets −1 difficulty on Social rolls with allies. |
| wolf-at-the-door | 136 | OK. Difficulty is the target's Willpower. Needs eye contact. Works in any form. |
| curse-of-hatred | 114 | **Fix e.** Costs 1 Gnosis, difficulty is the opponent's Willpower. The target loses **2 Willpower and 2 Rage**. Usable once per scene on the same opponent. |
| plague-visage | 130 | Roll OK, lasts a scene. **No difficulty given** (stored 6 is the default). Humans who see it roll Willpower (difficulty 8). |
| warriors-draught | 134 | **Fix e/cost.** The Fianna spends 1 Gnosis brewing it, and it stays potent for a day. The drinker goes into berserk frenzy and gets **+1 Strength and +1 Stamina** while it lasts. |
| mental-speech | 114 | **Fix e.** Range is **10 miles per success**, not any distance. Difficulty 8, plus 1 Willpower, lasts a scene. No mind reading: the other side shares only what they choose to. |
| might-of-thor | 133 | OK, but **add the cost**: 1 Gnosis and 1 Rage. Willpower roll at difficulty 8. Strength doubles for one turn per success. For an hour afterwards, Physical Attributes drop to 1 and Willpower is halved, rounded up. |
| ravens-curse | 138 | OK. A touch with the fingertips, 1 Gnosis, Manipulation + Archery at difficulty 7. Duration comes from a table by successes, starting at one hour for one success. |
| spirit-witness | 122 | OK. A spirit that witnessed the event must be found first. Charisma + Investigation at a variable difficulty. Gaian spirits can't resist. |
| balors-gaze | 135 | **Fix e/cost.** 1 Rage and 1 Gnosis, Perception + Occult at difficulty 8, for the rest of the scene. A foe who meets the gaze rolls Willpower (difficulty 8) and needs at least the user's successes, or takes **−5 dice, as if Crippled**. It gets past frenzy and Resist Pain. |
| claws-of-the-glassblower | 130 | **Clarify e.** 1 Gnosis. After a claw hit the claws break off, and the glass does **1 aggravated level each round** it stays in the wound. It can be removed, but that takes time. |
| dolorous-stroke | 138 | **Check e.** 1 Gnosis, and the attack takes the whole turn. On a hit, +2 damage dice. If it does 3 or more levels after soak, onlookers are dismayed. The OCR stops there, and I couldn't confirm the "lasting wound" in the stored summary. Read the page image before relying on it. |
| earthfriends-pact | 123 | OK. 1 Gnosis, Charisma + Expression at difficulty 8. The ground shakes for 25 yards in every direction, and everyone except the user rolls Dexterity + Athletics. |
| geas | 123 | OK. 1 Gnosis. The roll is against the target's Willpower; against a group, the best Willpower among them. It lasts until the task is done or the target is incapacitated serving it. Only one geas at a time on a target. |
| gift-of-the-spriggan | 135 | **Fix e.** 1 Gnosis, difficulty 8, one hour per success, and the user can return to normal size at will. Growing gives **+1 Strength and +1 Stamina for each 100% increase in size**. Shrinking costs **no** traits. |
| maw-of-the-whale | 130 | OK. Difficulty 8. The target resists with Dexterity + Dodge. Big targets need +1 success per health level over 7, or per 3 feet of size over the user. Swallowed things end up in an Umbral realm. |
| totem-gift | 115 | OK. 1 Gnosis, Charisma + Rituals at difficulty 7. More successes mean a bigger intervention, from a distraction at 1 up to the totem attacking at 5. |

### Not checked
- fera.json chk entries (Ajaba, Ananasi, Gurahl, Kitsune, Nagah, Ratkin, Rokea, Camazotz). They cite Changing Breeds, not DA:W, so they are outside this item. I can do them next if wanted.
- Mage: The Dark Ages: the repo has no TODO or chk entries for it. The grep found them only in garou.json, gifts-daw.json, fera.json and interact-rules.mjs.
