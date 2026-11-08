# Phase 6, batch 2 research notes: mages and changelings

Mechanics only, in WoDX's words, with page references. No book text. Pages are the printed page numbers unless
marked "pdf p." (the PDF page). Text extracted on Ben's PC into `tools-env\text\batch2\` (dafae, damage by OCR,
dagrimoire, m20, c20), joined per book with page markers (`join.py`), headings found with `heads.py`, pages read with
`pages.py`.

## Reading map

| Book | Pages | Chapters that carry the rules |
| --- | --- | --- |
| Dark Ages: Mage (2002, scan, OCR) | 242 pdf | Ch. 3 Characters (pdf 77–95: creation, Awareness, Cosmology, Enigmas, Backgrounds Fount, Sanctum, Talisman, Merits and Flaws); Ch. 4 Magic (pdf 97–143: casting, foci, belief, Foundation and Pillars, duration and distance, resisting, cancelling, rotes; each fellowship's Foundation, Pillars and rotes; hedge magic; Backlash, Branding, Scourging) |
| Dark Ages: Mage Grimoire | 161 pdf | to map: more rotes per fellowship, wonders |
| Mage 20th | 698 pdf | Ch. 6 traits (Avatar essences, Arete, Quintessence and Paradox, pdf 267–340); Ch. 8 rules (384–397); Ch. 10 The Book of Magick (498–618) |
| Dark Ages: Fae | 226 pdf | to map |
| Changeling 20th | 503 pdf | to map (Arts, Realms, Bunk, Glamour, Banality, Nightmare, Bedlam, chimera) |

## Dark Ages: Mage, casting (Ch. 4, pp. 97–105)

- **A spell** is first imagined, then checked against the caster's fellowship's beliefs: an effect outside what that
  school teaches cannot be cast at all, whatever the dots (p. 98).
- **Foundation and Pillars.** Each fellowship has one Foundation (how it works magic) and four Pillars (what it can
  do). A spell must fall within one or more of the caster's Pillars, at the level the effect needs (p. 98).
- **Simple spell** (one Pillar): roll Foundation + that Pillar; difficulty 4 + the Pillar level the effect needs
  (not the caster's rating). One success is the base (p. 98, summary box p. 99).
- **Complex spell** (two or more Pillars): roll Foundation + the highest Pillar involved + 1 die per other Pillar;
  difficulty 5 + the highest level needed + 1 per other Pillar (p. 98–99).
- **Difficulty above 9** stays 9; each point over adds one success needed. Lowering a difficulty first removes
  those extra successes, then lowers it from 9 (pp. 98–99).
- **Quintessence.** If any Pillar used is rated above the caster's Foundation, one Quintessence must be spent to
  steady the spell. Extra Quintessence lowers the difficulty 1 per point, at most 3, to a floor of 4; more than two
  points in a turn needs the Fount Background (pp. 99–100, Fount pp. 86–87).
- **Failure** (no successes, no 1s): no effect; casting the same spell again in the scene is +1 difficulty per
  earlier failure. **Short of successes with one or more 1s**: Backlash, and +2 per earlier failed or botched try in
  the scene (p. 100).
- **Extended spell**: successes add up roll by roll at intervals the Storyteller sets; a botch causes Backlash and
  loses everything gathered; a plain failure adds nothing that interval. Quintessence spent lowers only that roll
  (pp. 100–101).
- **Ongoing (lasting) spell**: an extended spell needing ten times the successes, 1 Quintessence per success, then
  sealed with 5 Quintessence per level of the highest Pillar and 1 Willpower per 10 Quintessence of that seal
  (rounded up) (p. 101). Cancelling one's own lasting spell costs 1 Quintessence per 10 spent on it (p. 104).
- **Foci.** Every Pillar needs its focus until Foundation 2; from then the mage may drop one Pillar's focus per
  Foundation dot after the first (WoDX reading of p. 102: at Foundation 2 one Pillar's focus may be dropped). Using a
  focus that is no longer needed gives -1 difficulty (floor 4) or replaces the Quintessence a too-high Pillar would
  need; once per spell. Spells learned from another fellowship always need their foci (pp. 101–102).
- **Belief.** A spell that works within a place's own superstitions cancels one 1 on the roll (p. 103).
- **Duration by successes** (normal / hurried): 1 turn / 1 turn; scene / 3 turns; day / 5; month / 10; six months /
  20; 6+ Storyteller / +20 turns per success over five (p. 103). Hurried spells take effect the turn after, except
  instant ones (p. 103).
- **Distance by successes** (normal / hurried): self or 20 ft / 3 ft; 100 yd / 20 ft; 10 mi / 100 ft; 500 mi /
  200 yd; across Christendom / 1 mi; then Storyteller / ×5 per success over five (p. 105). One extra success per
  extra target (p. 105).
- **Resisting.** Physical spells can be dodged (Dexterity + Dodge 6, each success removes one of the spell's) if the
  target is aware; mind-binding spells are resisted with Willpower (a roll, and 1 Willpower spent); a mage senses a
  spell coming with Perception + Awareness 8. Physical damage soaks normally; harm to spirit or mind does not (pp.
  104–105).
- **Cancelling** one's own spell: a turn, or one die from the pool if acting too (p. 104).

## Dark Ages: Mage, the fellowships (Ch. 4, from p. 105)

Each fellowship: a Foundation (rated 1–5; each level a lasting perk, not a spell) and four Pillars (1–5; what each
level lets a spell do). Below: the mechanical hooks WoDX needs, in WoDX's words. Pillar levels are listed only where
the book gives numbers; the rest is the scope the Storyteller judges by.

### Ahl-i-Batin (pp. 105–109)
- **Foundation: Al-Ikhlas** (awareness of unity). 1: perceive only. 4: −1 to all Alertness difficulties. 5: a further
  −1 to Alertness, and Perception and Alertness rolls can no longer botch (a botch is a failure). Specialties:
  Communication, Comprehension, Movement, Perception, Stealth (p. 105).
- **Pillars (Ubbadan):** Al-Anbiya (fate), Al-Fatihah (minds), Al-Hajj (space), Al-Layl (secrecy). Foci: chants,
  prayer, the Qur'an, trance, incense, mantras, mirrors, sacred geometry, veils and darkness (pp. 105–108).
- Numbers: Al-Fatihah 1 is a simple-spell mental ward (an intruder must beat its successes first); 5 adds one dot of
  Intelligence or Wits per success. Al-Hajj 2 ward: +1 difficulty per success to view, move or transport the warded;
  3 teleports within the distance table (p. 104); multiple sight up to the lower of Perception or Wits; 4 carries one
  person per dot of Wits or per Quintessence spent; 5 adds a dot of Perception per success. Al-Layl 1: successes add
  to Subterfuge; 2: to Stealth, and unnoticed if Stealth successes beat the onlooker's Perception + Alertness; 3: to
  Alertness, Investigation and Occult, and to sleight of hand; 4: finding the mage is Alertness or Investigation
  against the mage's Al-Ikhlas + Al-Layl; 5: wards are walked through, and an enchantment is unmade by matching its
  successes (pp. 106–108).
- **Rotes (pp. 108–109):** Swift Road (each success cuts the journey by a fifth, compounding; +1 per success to the
  difficulty to notice the traveller, from 5; +1 to both Pillars carries one more person per success or Quintessence).
  Gaze of Suleiman (Al-Anbiya 3, Al-Fatihah 2, Al-Layl 2: each success takes one success off any roll to deceive the
  mage; a deception cut to zero is seen through, and the surplus goes against the deceiver's mental defences). One
  Fights as Many (Al-Fatihah 3, Al-Hajj 4: one Quintessence per duplicate, up to the successes; only one self casts or
  spends Willpower per turn; the mage takes only the highest damage dealt to any self in a turn).

### Messianic Voices (pp. 109–115)
- **Foundation: Divinity** (relationship to the Divine). 4: −1 to all Expression difficulties. 5: −1 permanently to all
  rolls with one chosen Social Attribute. Specialties: Communing with Angels, Healing, Obvious Intercessions,
  Overcoming Dissonance (p. 110). Foci: holy symbols, prayer, scripture, song.
- **Pillars (the Archangels):** Gavri-El (fire, healing, motion, reason), Mikha-El (leadership, light, war), Repha-El
  (creativity, peace, water), Uri-El (darkness, death, fear, earth). The book says names and attributes are the
  player's to vary (p. 111 sidebar).
- Numbers: Gavri-El 2: heal one lethal or two bashing per success on a simple spell; fire of 1–2 levels; successes
  add to Enigmas; 3: −1 Knowledge difficulty per two successes (floor 4), fire of one lethal per success, step into the
  Penumbra, heal aggravated; 4: teleport, near and far Umbrae, +1 Intelligence per success; 5: Astral Umbra, raise the
  dead of up to one minute per Divinity dot (one Health Level, barely conscious), one aggravated per success. Mikha-El
  2: +1 per success to the difficulty of supernatural control and coercion; +1 die per success to Archery, Brawl,
  Melee or damage; 3: +1 Strength or Stamina per success; +1 per success to Leadership; aggravated damage and soak with
  normal weapons and armour; 4: +1 Charisma per success; sunlight; 5: two aggravated per success; authority that
  holds unless a Willpower roll matches the successes; +/− one temporary Willpower per success (resisted by magic or
  Willpower). Repha-El 2: heal any sickness in oneself or a soulless creature; successes add to Crafts, Empathy or
  Performance; 3: a ward that demons must beat with Willpower successes; 4: banish an otherworldly being with
  Divinity + Repha-El against its Willpower; 5: +1 Wits per success. Uri-El 2: successes add to Stealth; reach into
  the Dark Umbra; 3: −1 per success to damage pools of earth, stone or metal weapons; one aggravated per success
  soaked by Willpower, not Stamina; 4: heal one level per two levels drawn from a soul (killing); 5: slay the
  undying; bind or force souls (resisted with Willpower) (pp. 111–114).
- **Rotes (pp. 113–115):** The Word (Mikha-El 2: each success +1 to the difficulty to resist the next short, direct
  command; authority, not mind control, so those immune to such things are immune). Shattering the Void (Gavri-El 3,
  Mikha-El 3: two aggravated per success to beings of the Void, soaked as usual; half, rounded up, to beings with some
  spirit left, such as vampires; nothing to humans however evil; against Willpower above 9 the difficulty stops at 9
  with extra successes needed). Mortal Clay (Repha-El 3, Uri-El 4: a clay body for a dead soul; to read on, p. 115).

- Mortal Clay (Repha-El 3, Uri-El 4): one day of the clay body per success, and more likeness per success; the ghost
  resists with Willpower unless it chooses to go in (p. 115).

### Old Faith (pp. 115–120)
- **Foundation: Spontaneity** (sympathy with life's pulse). 4: hurried spells take effect as cast, not the next turn.
  5: hurried castings count as normal spells (no hurried penalties). Specialties: Blessings, Curses, Living Creatures,
  Weather (p. 115). Foci: blood, chanting, ordeals.
- **Pillars (the Seasons):** Autumn (wisdom, fruition), Spring (life, creation), Summer (fire, passion), Winter (death,
  despair) (p. 115).
- Numbers: Autumn 2: successes add to Stamina to soak attacks on the pattern; 3: a subject limited to one action for
  turns equal to the successes; +1 Stamina per success; the Penumbra at crossroads; 4: one aggravated per success on a
  simple spell; 5: two years of age per success; +1 Intelligence per success; subtract the successes from another's
  roll (against a magical roll, the caster also spends 1 Willpower and 1 Quintessence); a new cray by an extended spell
  of at most 10 daily rolls, 10 successes per level (pp. 116). Spring 1: reveals how many Health Levels of damage
  remain; 2: heal oneself two bashing or one lethal per success; successes add to Awareness; 3: heal others the same;
  heal oneself one aggravated per success; +1 Dexterity or Appearance per success; 4: add one success per success to
  another's spell cast at the same time; walk into the realms of the Fae; −1 Gauntlet per success; heal others'
  aggravated; 5: raise the dead of up to one minute per Spontaneity dot (one Health Level) (pp. 116–117). Summer 2:
  −1 fatigue penalty per success; fists and light blunt weapons do lethal and +1 die of lethal per success; fire of
  1–2 lethal; 3: one aggravated per success, soaked by Willpower or Stamina; 4: an extra −2 Health Level per success
  for the fight; a rage the subject resists with Willpower; reduce an ongoing spell's successes one for one; 5: two
  aggravated per success to all in the area; +1 Strength per success (pp. 117–118). Winter 2: −1 success from an
  Intelligence or Wits roll per two successes; +1 die per success to Stealth; speak with the dead; 3: one lethal per
  success; walk among the dead; 4: compel the dead (intelligent undead resist with Willpower); lull spells and
  talismans dormant for the duration; 5: one aggravated per success soaked only by Willpower; spells lose two
  successes per success; +1 Gauntlet per two successes (pp. 118).
- **Rotes (pp. 118–120):** Donning the Night-Daughter's Skin (Spring 2, Summer 2, Winter 1: each two successes −1
  difficulty on balance, reaction and night-vision rolls, floor 4, and +1 Dexterity for Stealth and +1 Strength for
  jumping; barefoot only; seduction attempts against the caster −1 difficulty). Verdant Slumber (Autumn 4, Spring 2:
  one aggravated per success; a subject killed by it becomes a plant). Ancient Warder of the Land (Spring 5, Summer 2:
  wakes an ancient tree: Strength 8, Dexterity 1, Stamina 8, Wits 1, Brawl 1, Health Levels eight −0, one −1, one −2,
  one −5; soaks anything that does not attack its pattern; one Attribute dot or one more −0 level per three
  successes; it dies if it cannot root at the end).

### Order of Hermes (pp. 120–125)
- **Foundation: Modus** (formidable discipline). 5: up to two Willpower may be spent per turn. Specialties: Control,
  Destruction, Elements, Transmutation (p. 120). Foci: astrology, Enochian, numerology.
- **Pillars (the Formae):** Anima (life), Corona (mind), Primus (Quintessence), Vires (forces). The Order's own bar,
  under Bonisagus's founding doctrine: no raising the dead, no true life, no travel beyond the Lunar Sphere; spirits
  are handled through the energies that sustain them (p. 120).
- Numbers: Anima 1: knows a subject's Health Level; 2: heal or harm lesser life and oneself, two bashing or one lethal
  per success; 3: the same on people; +1 Strength, Dexterity, Stamina or Appearance per success; 4: heal aggravated as
  lethal; shapeshifting; 5: bodies without souls, plagues, rule beasts (pp. 121). Corona 1: a mind ward that adds dice
  to Willpower against intrusion; one parallel thought per success up to Wits; 4: one bashing per success through
  the mind; deep convictions altered (Willpower resists); the Astral Umbra; 5: +1 Intelligence and Wits per success
  (pp. 121–122). Primus 1: senses magic and excess Quintessence; 2: gather and store free Quintessence beyond the
  Fount; weapons or garments that do or ward aggravated damage and touch spirits; 3: drain or bolster a source one
  Quintessence per success; make Tass; attack a spell, removing its successes one for one; 4: unmake nonliving
  enchantment, one unsoakable aggravated per Quintessence drained; ongoing spells and talismans at half the
  Quintessence and Willpower (rounded up); 5: one aggravated per success soaked only by Willpower; Gilgul; a new cray
  by an extended spell with no roll limit, one roll a day, 10 successes per level (pp. 122–123). Vires 3: one lethal
  or two bashing per success; shadows add a die per success to Stealth; flight; 4: true sunlight; two lethal or one
  aggravated per success; 5: two aggravated per success (pp. 123).
- **Rotes (pp. 123–125):** Aegis Magicus (Primus 3: a normal simple casting only; half a day; its successes cancel an
  incoming spell's one for one; each block costs 1 Quintessence, up to three invested at casting; a mage wearing it
  may pay from their own store and may let a spell through; a non-mage cannot). Hermes' Brand (Anima 2, Primus 2,
  Vires 1: each success charges one blood point; a vampire drinking it takes two unsoakable aggravated per charged
  point drunk; it lasts the normal duration even if the mage dies). The Incorruptible Water (Anima 4, Corona 4,
  Primus 3: ten years of no ageing per success; one Quintessence per year of chronological age from a source of
  longevity or health; every 1 rolled is kept on a running tally that counts on every later casting; a permanent
  Willpower point clears the tally by the previous permanent Willpower rating). Wrath of Apollo (Primus 5, Vires 4:
  three aggravated per success to everything within fifty feet per success; to read on, p. 125).

- Wrath of Apollo, continued: centred anywhere within 100 yards per success; the caster is caught unless the centre
  is over 200 yards away; leaves a rift in the area's flow of Quintessence that heals slowly (p. 125).

### Spirit-Talkers (pp. 125–130)
- **Foundation: Sensitivity** (the call of the Invisible World). 1: sees into the Umbra wherever the Gauntlet is at or
  below the Sensitivity rating. 5: regains Quintessence in the Umbra each day: 3 or the Fount rating, whichever is
  higher. Specialties: Awakening Spirits, Dreams, Shades of the Dead, Summoning, Travel (pp. 125–126). Foci: dance,
  drums, chants, prayers to a god or totem.
- **Pillars (Totems):** Chieftain (leadership), Trickster (deception), Warrior (fury), Wise One (ancient power)
  (p. 126).
- Numbers: Chieftain 2: +1 die per success to Leadership; −1 difficulty per success on planning or organizing;
  impulses that must be obeyed (Willpower resists); 3: +1 Charisma per success; +1 per success to Intimidation; ±1 per
  success to the difficulty of another's leadership rolls; 4: commands resisted by Willpower; +1 Manipulation per
  success; 5: +1 per success to Etiquette with spirits (pp. 126–127). Trickster 2: +1 die per success to Legerdemain,
  Stealth or Subterfuge; −1 die per success to another's Leadership, or −1 Wits per two successes; 3: −1 per success
  to sleight-of-hand difficulties; +1 per two successes to a target's difficulty; +1 Manipulation per success; hidden
  from mortal sight unless mystic senses beat the successes; 4: Ability dots equal to half the successes, spread at
  will; 5: +1 to all of a foe's difficulties per three successes; bypass wards and senses with a contested roll;
  shapechange (p. 127). Warrior 1: −1 per success to attack difficulties (floor 4); learn others' Archery, Brawl,
  Dodge and Melee; 2: +1 per two successes to the difficulty to be hit; bashing or lethal blows become aggravated;
  3: +1 to any Physical Attribute per success; soak one aggravated per success; extra actions equal to the lower of
  successes and Wits; 4: −1 die per two successes from foes' combat pools; −1 per success to damage pools against the
  caster; one aggravated per success to an object or creature by touch; 5: two aggravated per success; +1 die to all
  combat pools and initiative per two successes; spells against the caster lose successes one for one (pp. 127–128).
  Wise One 1: successes add to Empathy; contest mystic concealment; 2: +1 per success to Enigmas, Hearth Wisdom or
  Occult; salves heal one lethal or two bashing per success; summon spirits to the Penumbra; 3: +1 to any Mental
  Attribute per success; through the Gauntlet; add or remove casting successes one for one; 4: −1 Gauntlet per
  success; −1 difficulty per success on Enigmas, Hearth Wisdom or Occult (floor 4); 5: a cray as Old Faith Autumn 5;
  each Quintessence spent (up to the successes) removes five casting successes from an enchantment; raise the dead as
  Old Faith Spring 5; no Gauntlet for the caster (pp. 128–129).
- **Rotes (pp. 129–130):** Listening to the Heart-Voice (Trickster 2: Sensitivity + Trickster; one more subject in
  earshot per success past the first; hears what they believe, not the literal truth; scrying and mind-reading wards
  block it). The Dream Within the Blade (Warrior 3, Wise One 3: the weapon does aggravated damage, harms creatures
  immune to mundane weapons, and strikes into the Penumbra and Dark Umbra). The Rightful King (Chieftain 4, Wise One 1:
  the successes go against the Willpower of everyone in the area; the ablest leader for the matter at hand is heeded,
  more strongly with more successes).

### Valdaermen (pp. 130–135)
- **Foundation: Blot** (depth of sacrifice). 2: damage taken from any source can serve as a focus for turns equal to
  the lower of Blot and the Health Levels taken. 5: the mage may take unsoakable lethal damage, healed only by
  mundane means, for +1 die per Health Level to one casting roll. Specialties: Blatant Magic, Divination, Empathy,
  Physical Augmentation (pp. 130–131). Foci: blood, offerings, scarification.
- **Pillars (the Runes):** Fara (travel: Ehwaz, Raidho), Forlog (luck and fortune: Fehu, Gebo, Jera, Othala, Wunjo),
  Galdrar (magic and secrets: Ansuz, Gebo, Iwaz, Perthro, Uruz), Hjaldar (battle: Isa, Kenaz, Naudhiz, Sowilo,
  Thurisaz, Tiwaz) (pp. 131–133).
- Numbers: Fara 3: walk on air or water; +1 die per success to Willpower against mental control or confinement;
  redirect motion; the Penumbra; 4: teleport, carrying one more per success or Quintessence; deeper Umbrae; 5: dreams,
  the realms of the Fae, the Astral and Dark Umbrae; astral travel (pp. 131–132). Forlog 2: +1 die per success to
  Empathy; 3: +1 Manipulation or Subterfuge per success; 4: ±1 die per two successes to a non-mystical Background;
  5: add or remove successes one for one (against magic, also 1 Quintessence and 1 Willpower); −1 difficulty per
  success on friendship and fortune (p. 132). Galdrar 1: −1 die per success from others' Subterfuge or Stealth; 2: +1
  die per success to Empathy or Subterfuge; scrying; 3: the Penumbra; summon nature spirits; ±1 per success to
  difficulties to notice a subject; 4: +1 per success to Enigmas; remove casting successes one for one; +1 per success
  to Stealth; 5: a cray as Old Faith Autumn 5 (pp. 132–133). Hjaldar 2: weapons and armour that do and stop
  aggravated damage to and from incorporeal spirits; 3: fire and ice, one lethal per success; +1 Strength or Stamina
  per success; −1 per success to a foe's damage or soak pools (floor 0); 4: +1 Leadership per success; shapechange to
  a predator (gear does not change; armour falls off); blood feud resisted by Willpower; 5: one aggravated per success
  by lightning; a war form that keeps hands, weapons and armour; +1 Charisma per success (pp. 133–134).
- **Rotes (pp. 134–135):** Revealing the Dwarf-Hoard (Forlog 1, Galdrar 2: finds valuables by what they mean to their
  owner; each success cancels one success of a magical concealment, and all cancelled means found). Unsleeping Swords
  (Fara 3, Galdrar 2 by the heading's dots, to confirm: one Quintessence per corpse raised, up to the successes; a
  corpse has Strength and Stamina 4, Dexterity and Wits 1, Brawl and Melee 2, Health Levels Healthy, Healthy, −1, −1,
  −2, −5; two more successes and Quintessence on one body raise an Attribute or add a −1 level, one per success raises
  an Ability). Curse of Empty and Endless Roads (Fara 4, Galdrar 4: for the standard duration, often cast as an
  ongoing spell).

### Combining fellowships and hedge magic (p. 135)
- Learning another fellowship's Pillars takes study under that fellowship's teachers; such spells always need their
  foci (p. 102, noted above).
- **Hedge magic** in Dark Ages: Mage is any magic without a Foundation and Pillars: fixed charms and rites. It almost
  never causes Backlash; it cannot store Quintessence and uses Tass for those spells that need it. Once a character
  learns a Foundation dot, their hedge magic never succeeds again. Mages do not use it; Storyteller characters may.
  WoDX keeps Sorcerer's hedge magic (B49) for those characters.

## To read next

- DA:Mage pp. 136–143 (all six fellowships and hedge magic done, pp. 105–135): each fellowship's Foundation (with its five levels and Specialties), its four Pillars and
  sample rotes (Ahl-i-Batin, Messianic Voices, Old Faith, Order of Hermes, Spirit-Talkers, Valdaermen; hedge magic);
  Backlash, Branding and Scourging (pp. 136–143).
- DA:Mage pp. 77–95: character creation, Backgrounds (Fount, Sanctum, Servants, Talisman), Merits and Flaws.
- The inner voice for mages (the Avatar): what DA:Mage calls the mage's inner spark and its pressures (Backlash,
  hubris), and M20's Avatar, Seekings and Quiet (pp. 44–46, 267, 339–340, 368–371, 240–243).
- Then Dark Ages: Fae and Changeling 20th.
