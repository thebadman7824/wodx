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
| Dark Ages: Fae | 226 pdf | read by OCR (`dafae-ocr.txt`; pdf page = printed page + 1). Ch. 2 Origins (pdf 58–65: Birthright and Frailty); Ch. 3 Characters (pdf 79–116: creation, Mists, Weaving, imbalance, Lost and Locked, Features, Oaths, Echoes, experience); Ch. 4 Dominions (pdf 120–163: casting, Unleashing, countering, the four Dominions and their cantrips); Ch. 5 (pdf 181–183: fae and the other lines; fae blood) |
| Changeling 20th | 503 pdf | the book's own bookmarks (`c20.toc.txt`), by PDF page: Ch. 2 Kithain pp. 83–138 (Seemings 84–87, kith 88–114, kith creation 115–118, Houses 120–137); Ch. 3 creation and Traits pp. 139–190 (Legacies 157–161, Abilities 163–169, Backgrounds 169–172, Glamour 173–174, Banality 174–175, Merits and Flaws 177–190); Ch. 4 Arts and Realms pp. 193–240 (cantrips 194, bunks 195, Unleashing 197, eighteen Arts 198–232, Realms 233–236); Ch. 6 Systems pp. 251–296 (Tempers 258–264, the Wyrd 260, Epiphany 261, Oaths 265–267, Banality and the Mists 268–274, Nightmare 275, combat 276–290, Cold Iron 291, Bedlam 295) |

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

## Dark Ages: Mage, Quintessence and Backlash (pp. 136–141)

- **Quintessence and Tass (p. 136).** Tass is Quintessence held in matter (dew, sap, roots, potions, candles) and
  released by drinking, eating or burning it. Quintessence carries the flavour of its source; the Storyteller may
  rule a source unfit for a kind of magic. Every Quintessence point spent on a spell that goes wrong counts as an
  extra 1 for Backlash (p. 136).
- **Kinds of Backlash:** Branding, Manifestation, Scourging, Twilight (pp. 137–140). The Storyteller picks the kind to
  suit the spell; WoDX offers the choice on the botch card.
- **Branding (pp. 137–138):** severity = the 1s rolled × the highest Pillar in the spell. 1–5 a small sign (a glint, a
  pallor, warmth); 6–12 a clear mark, often +1 or +2 difficulty on Appearance or Charisma (rarely a Physical
  Attribute); 13–20 a serious change, +2 or +3 to Social difficulties and some physical hindrance, perhaps a small
  benefit (+1 soak on the part); 21–30 a monstrous change, Appearance near zero, heavy Social penalties except to
  intimidate; 31+ utterly inhuman. Brandings add up: every third Branding at one level merges into one of the next
  level.
- **Manifestation (pp. 138–139):** strength = (highest Pillar + 1 per extra Pillar) × the 1s. Each point buys 3
  Attribute dots, or 2 dots of Willpower, Quintessence or a Pillar, or 1 Foundation dot, for the being that answers.
  Most likely after a botched summoning, or for a mage who often calls on the otherworldly.
- **Scourging (p. 139):** damage per 1 rolled, by the highest Pillar: 1–2 one lethal; 3 two lethal; 4 one aggravated;
  5 two aggravated. Only the caster's own soak applies (Fortitude and armour that are part of the body). Very large
  Scourgings can spread to bystanders.
- **Twilight (pp. 139–140):** temporary Twilight per 1 rolled, by the highest Pillar: 1–2 one; 3–4 two; 5 three. Ten
  temporary roll over into one permanent (any excess starts the new pool). No symptoms below 2 permanent. Stages:
  Shallow at 2, Median at 4, Deep at 7, Final at 9; the change is gradual, not stepwise. Final Twilight ends with the
  mage vanishing from the world.
- **Mitigating (p. 140):** after a botch, Quintessence cancels 1s: 1 point for the first, then doubling (3 total for
  two, 7 for three, and so on); all of a 1's cost or none of it; more than 2 points a turn needs Fount (pp. 86–87).
  Cancelling every 1 turns the botch into a plain failure.
- **Losing it (pp. 140–141):** only by not using magic (quicker cures exist per fellowship, the Order's the most
  reliable, but the quicker the less safe). Twilight fades one temporary point a day through the 2nd permanent
  point; three days a point at 3–4; a week at 5–6; a month in the 7th; four months in the 8th; a year in the 9th.
  Branding: a 1st-level mark fades in a week of abstinence; a 2nd-level one in two weeks, becoming two 1st-level; a
  3rd in a month, becoming two 2nd; a 4th in four months, becoming two 3rd; a 5th is usually permanent. Higher marks
  break down before lower ones fade. Both kinds fade at the same time when a mage has both.

### What WoDX needs from this (for the 6f build)
- A Dark Ages mage sheet: the fellowship, its Foundation and four Pillars with their names and foci, Quintessence and
  Fount, Twilight (temporary and permanent) and Brandings (a list with levels and the date gained).
- The casting card: simple or complex, difficulty 4 + level or 5 + level + 1 per extra Pillar, the cap at 9 with
  extra successes, hurried casting (Spontaneity 4 and 5 change it), Quintessence to lower difficulty and to steady a
  Pillar above the Foundation, foci, belief cancelling a 1, the failure and botch penalties in the scene; the
  duration and distance tables; resisting.
- The botch card: the 1s (and Quintessence spent) with Quintessence to cancel them, then Branding, Manifestation,
  Scourging or Twilight worked out from the numbers above; Scourging damage through WoDX Combat; Twilight and
  Branding recorded with their fading clocks on the Chronicle clock (abstinence counted from the last casting).
- The fellowships' Foundation perks as automatic modifiers (Al-Ikhlas Alertness, Divinity Expression and a Social
  Attribute, Spontaneity hurried casting, Modus two Willpower a turn, Sensitivity Umbral sight and Quintessence,
  Blot's damage as focus and life for dice).
- Pillar effects stay the Storyteller's to judge, but the numbers above go in as presets on the casting card (healing,
  damage, Attribute boosts, ward successes, Gauntlet changes, cray creation).
- The rotes as ready spells with their Pillar levels and systems.

## Dark Ages: Mage, characters (Ch. 3, pp. 77–93)

- **Creation (pp. 79–81):** as Dark Ages: Vampire for concept, Nature and Demeanor (Willpower from Nature as usual),
  Attributes 7/5/3 and Abilities 13/9/5 (none above 3). No Disciplines, Road or Virtues. 5 Background dots; Foundation
  starts at 1 and 3 dots go among the Pillars; nothing above 3 at the start; a Pillar may exceed the Foundation
  (at a Quintessence cost when cast). Willpower 5. Quintessence = the higher of 5 and Fount + Cray. 15 bonus points:
  Attribute 5, Ability 2, Specialty 1 (at most 3 per Ability), Background 1, Foundation 5, Pillar 3, Willpower 1.
- **Backgrounds allowed from Dark Ages: Vampire:** Allies, Contacts, Influence, Mentor, Resources (not Generation or
  Status). New: Chantry, Cray, Destiny, Familiar, Fount, Library, Sanctum, Servants, Talisman. Pooling as DAV pp.
  157–158; Destiny, Fount and Familiar cannot be pooled (p. 79).
- **New Abilities (pp. 82–83):** Awareness (Talent: sensing the supernatural, usually with Perception), Cosmology
  (Knowledge: the Umbrae), Enigmas (Knowledge: riddles and spirits). They replace other Abilities on the mage sheet;
  any DAV Ability can still be learned. (Our worldofdarkness system already has awareness, cosmology and enigmas
  keys, seen in 7a.)
- **Chantry (pp. 83–84):** each dot: size (1: a small home for 1–2 up to 5: a castle for a score), +1 difficulty to
  break in, −1 Foundation-equivalent Aura for cabal members on the grounds, or acceptance by the neighbours. No cray or
  sanctum included. Optional flaws trade one area down for another.
- **Cray (pp. 84–85):** holds 5 × rating Quintessence; regains 1 a day on any day it is not tapped. Harvest as Tass, or
  absorb directly: Wits + Foundation, difficulty 10 − rating, 1 Quintessence per success. Overdraw: past empty, a
  further rating's worth can be drawn, at once −1 to the rating, then roll the new rating at difficulty 8: success,
  refills as normal; failure, dormant (1 a year); botch, dead. Pooled points can hide it (+1 difficulty per point to
  find it by magic). Maximums 5/10/15/20/25.
- **Destiny (p. 85):** once a story, against danger to the destiny, roll the rating at difficulty 7: one spent
  Willpower back per success. Gone when the destiny is fulfilled (the Storyteller may give a permanent Willpower).
- **Familiar (pp. 85–86):** a Pact (term, duties, prohibitions). Eats Quintessence each week equal to its rating, or
  weakens and dies. Boons bought with its dots: Backlash negation (once per dot per story), communication (1: speaks
  the mage's languages; 2: mental speech with anyone in sight; always telepathic with the mage), Knowledge (3 dots of
  a Knowledge per dot, or one answer per dot per story), protection (1: +1 die to soak, dodge or an escaping spell; 2:
  an extra defensive action; 3: once a story, carry the mage to safety for 1 Quintessence).
- **Fount (pp. 86–87):** without it a mage holds 10 Quintessence and spends 2 a turn. By rating: 1 holds 12, spends 2;
  2 holds 14, spends 3; 3: 16, 4; 4: 18, 5; 5: 20, 6. Refills its rating each month by the mage's own rite. (p. 89
  says three a turn without Fount; WoDX follows the Fount table and p. 140, which agree on two.)
- **Library (p. 87):** 2 points a dot. Intelligence + Library to find lore; when buying a Pillar dot, roll Library
  at difficulty 8: −1 experience per success.
- **Sanctum (p. 87):** no Backlash at all inside; 2: −1 to magic difficulties; 3: −2; 4: also 1 Quintessence for
  eight hours' sleep; 5: knows any intrusion; +1 die to Foundation. About a year per dot to attune.
- **Servants (pp. 87–88):** as Retainers; human or magical (bought separately); magical ones do one task, tirelessly.
- **Talisman (p. 88):** level = the highest Pillar used to make it; 1 a focus or one-use item, 3 armour +3B/+3L, 5 a
  legend.
- **Quintessence (pp. 88–89):** lowers difficulty; must be spent for a Pillar above the Foundation; one point makes a
  spell showy, or alone makes a small cosmetic effect (1 a turn to keep it); 3 a turn without Fount (see the
  contradiction above). Regained from crays and Tass, Fount monthly, 1 a day in the Umbra; a vampire's blood is Tass
  (1 point per blood point), with the risk of the blood oath (p. 89).
- **Aura (p. 89):** a modifier to Social rolls by Foundation, like the vampires' Road aura: 0 none; 1–2 ±1; 3 ±1/±2
  (OCR unclear, to confirm); 4 ±2; 5 ±3.
- **Experience (p. 89):** Attribute ×4, Ability ×2, new Ability 3, Specialty = current rating, Foundation ×8 (and the
  Storyteller judges the mage ready), new Pillar 10, Pillar ×6, Willpower ×1. No Maturation (mages age).
- **Merits and Flaws (pp. 90–93):** Elderly (4 Flaw: +1 physical difficulties; a botch risks an Attribute dot), Hale
  (2: −2 to resist disease), Pain Resistant (2: wound penalties −1), Weak Lungs (2 Flaw: +1 on sustained activity),
  Devotion (1–3: once a session, 1–3 temporary Willpower by prayer), Faint of Heart (2 Flaw: Willpower 6 at gore or
  +1 to all for minutes), Indomitable (3: +2 to coerce, +1 to supernatural domination), Arcane Heritage (1, Merit or
  Flaw: ∓2 Social with the impressed), Apprentice (3, Merit or Flaw), Repulsive Practice (3 Flaw), Arcane Madness
  (3 Flaw: spells a story up to permanent Willpower, then Willpower 7 each time or +1 to all for an hour), Chicanery
  (3: cosmetic effects with no spend while holding Quintessence; three turns per point), Inept Channeler (4 Flaw:
  past permanent Willpower in Quintessence in a scene or spell, Willpower 6 per point or a bashing level, lethal on a
  botch), Living Fount (2, needs Fount: once a story, Fount at 6 for a hint), Pillar Natural (5: that Pillar costs
  current ×5, first dot 8), Witchwalk (1–5 Flaw: a superstition that binds the mage; at 5, salt wards for a day and
  does an unsoakable lethal level). Disallowed DAV Merits and Flaws are listed on p. 91 (the vampire-only ones).

## Dark Ages: Fae (pdf pages; read by OCR)

### Characters (pp. 87–91)

- **Creation:** Origin, Court, Nature and Demeanor. Attributes 7/5/3; Abilities 13/9/5 (none above 3 before bonus
  points); 5 Backgrounds; Willpower 4; Mists and Weaving by Origin; Dominion dots by Origin, none above 3 at the start;
  one Echo; Lesser Features equal to Mists (inanimae also one Greater Feature); 15 bonus points (Attribute 5,
  Ability 2, specialty 1 (up to 3 per Ability), Background 1, Dominion 7, Willpower 2, Mists or Weaving 4) (pp. 87–88).
- **Origins (p. 87, Birthright and Frailty pp. 60–64):**
  - Changeling: Mists 2, Weaving 4, Dominions 2. Birthright: Echoes count one level lower (the Echo roll loses a
    success). Frailty: one fewer Dominion dot, and cannot give a sprite faerie form. Can Unleash only in fae mien.
  - Inanimae: Mists 3, Weaving 3, Dominions 3. Birthright: near the element, rebuild the body into mien or human
    shape (Weaving, difficulty 6; a failure locks the form for eight hours). Frailty: one more Echo at the start, and
    a check for a new Echo when the element shows itself to mortals. No blood; refreshed by the element.
  - Firstborn: Mists 4, Weaving 2, Dominions 3. Birthright: three Unleashing dice instead of five. Frailty: Echoes
    count one level higher (the Echo roll gains a success). Always in mien; hides by the Day Dominion or the Mists.
- **Courts (p. 88):** Spring (favoured Dawn), Summer (Day), Autumn (Dusk), Winter (Night), Solstice (none; no Status).
- **New Abilities (pp. 91–93):** Kenning (Talent, replaces Empathy on the sheet; always active, roll any time;
  stands in for Empathy among fae), Enigmas (Knowledge), Gramarye (Knowledge with a field: cantrips, Dominions, flora,
  fauna, magical beasts, oaths, powders and potions, treasures; needed to brew, forge treasures, make cantrips and
  forge oaths: Iron 1, Stone 4, Gold 5). Theology and Academics are off the sheet but allowed.
- **Cold iron (p. 89):** pure iron does aggravated damage to fae in every form (soakable) and each wound from it costs a
  temporary Mists point. Alloys do nothing special.
- **In mien (sidebar p. 105):** all fae soak lethal damage in their mien; changelings can Unleash only in mien.
  Changelings take mien with Mists (difficulty 6) and return with Weaving (6); inanimae switch with Weaving (6); a
  botch locks the form for Weaving hours (p. 106).

### Backgrounds (pp. 93–97)

- Allowed from DAV: Allies, Contacts, Influence, Mentor, Resources, Status (Solstice may not take Status).
- **Holdings:** a faerie realm; dots split among Size, Defense (as Domain), Magical Effects and Surroundings, with a
  favoured Dominion (more cost extra). Each Magical Effect: −1 difficulty for its favoured Dominion inside; 1 Mists or
  Weaving point an hour of rest; a household sprite (level 2, no fighting, no Echo shield); servile cantrips last
  indefinitely; −2 to Kenning and to Gramarye with beasts; −1 Unleashing die inside; hidden unless a condition is met.
  Size cottage to large castle; Surroundings a few acres to 80 acres.
- **Library** (2 points a dot): Intelligence + Library (difficulty 8) for lost lore; success makes raising a Dominion
  1 experience cheaper, a botch 1 dearer (until a new understanding).
- **Oaths:** each oath is its own rating (Iron 1–3, Stone 3–5, Gold 4–5); may be bought more than once, pooled, or be
  an Anchor. Shields against Echoes and restores Weaving.
- **Retinue:** mortal servants (1, 2, 4, 8, 16 average; halve for competent, quarter for exceptional). Betrayal needs
  Willpower at 10; harming the master does aggravated damage equal to the master's Mists. Leaving the realm: Willpower
  at master's Mists + 3 each month (for as long as they served) or +3 to Wits and Perception rolls for the month.
- **Sprites:** 2, 4, 6, 8, 10 Charms (or more, weaker sprites). Add dice to Oaths rolls against Echoes (each dot once
  a session, the sprite need not be present); lend 1 Mists point a dot (present).
- **Treasures:** faerie treasures and oathcrafted treasures (the stronger kind); levels 1–5 (made with Gramarye).

### Mists and Weaving (pp. 101–105)

- Both rated 1–10, permanent and temporary like Willpower; rolls use the permanent rating.
- **Mists uses:** Bestow Kenning (1 point a human for a day, 2 for a supernatural being; an unwilling target resists
  Willpower 6 against Mists 6; 1 point for a Prodigal on the Road of Humanity and for a homid Garou, pp. 182–183);
  cloak a cantrip (1 point; onlookers need Perception + Kenning at 8; Unleashings cannot be cloaked); counter
  Dominions (p. 130); enhance the mien (2 points: a Lesser Feature works as a Greater one for the scene, with Echo
  risk); hide from mortals (Mists at 7; the mien is hidden until the fae uses a Dominion uncloaked or chooses to end
  it; hidden more days than Willpower, the fae is Lost).
- **Regaining Mists:** 1 a day in a faerie realm (an hour with Holdings); 1 per two successes on any Unleashing; from
  sprites.
- **Weaving uses:** spend 1 a die to remove Unleashing dice (5 removes the danger entirely; the visible signs stay);
  counter a cantrip (Dominion + Weaving); 2 points per Echo success removed; forge oaths (Weaving equal to the oath's
  rating, from each fae in it); after an Unleashing botch, 2 points per step lower on the scale (never below one).
  **Suppressing the Mists:** spending Weaving more times a day than Mists gives +2 to Mists rolls for each such day;
  more consecutive days than Willpower risks being Locked.
- **Regaining Weaving:** 1 a day in a faerie realm; Holdings; each time the fae fulfils an oath, roll the oath's rating
  (difficulty 6), 1 point a success.
- **Imbalance (p. 103):** Mists or Weaving 3 or more above the other. Mists-imbalanced: +1 to cantrips;
  Weaving-imbalanced: +1 to Unleashing. Avoidable by taking an extra Echo (no Features) each time the higher trait rises.
- **Lost and Locked (pp. 103–105):** Lost = withdrawn into a Mists pocket realm (finding one deliberately needs Kenning
  5 and weeks); Locked = the fae nature dies and the fae becomes human (keeps known cantrips, learns no more). Warning
  signs (more than two means soon): imbalance; Echoes hurt more (Lost) or less (Locked) and no new oaths can be forged;
  Mists spoils cantrips or Weaving spoils Unleashings; an overnight change of personality. Pushes: a botch with
  horrifying effects, Origin (changelings tend to Locked, firstborn to Lost), where the fae lives, desire, curses,
  overusing cantrips (about five castings of one in a scene). Cures: a month of strict routine and no Unleashing, then
  Weaving at 8 (Lost); a month of no routine and many Unleashings, then Mists at 8 (Locked).

### Features (pp. 105–108)

- Lesser Features are cosmetic (five or more risk Echoes when mortals see the mien); Greater Features are inhuman and
  give a bonus (one is enough to risk Echoes). Courtly fae shape their mien by Court; Solstice fae by their highest
  Dominion. Examples of Greater Features: Armored Hide (3 dice cancel damage levels before soak), Beastly Visage,
  Elemental Form (by element), Eyes of the Mists, Faerie Size (giant: 3 Bruised levels and +1 Strength, −1 to be hit;
  tiny: no Hurt level, Strength at most 3, +1 Dexterity, +2 to be hit), Monster's Mien (teeth Strength + 2 aggravated;
  claws Strength + 1 aggravated; horns Strength + 2 lethal and 3 soak dice on the head), Season's Skin, Size of My
  Choice (+2 Dodge dice).
- Each extra Echo taken buys two Lesser or one Greater Feature (p. 91). Raising Mists gives a Lesser Feature (or a
  Greater one for 3 more experience); a Greater Feature alone costs 5 experience (p. 116).

### Oaths (pp. 108–111)

- An oath has five parts: the fae's deal, the human's duty, how the fae breaks it, how the human breaks it, and the
  punishments; the Storyteller rates it (the book's examples run from Iron 1 to Gold 5). Forging needs Gramarye for the
  kind and Weaving equal to the rating from each fae in it; no roll. Iron Oaths last a lifetime, one human and one fae
  (or up to 4 humans and 5 fae), and fall inactive (not broken) while one side cannot keep it. Christian baptism of
  either party washes away Iron and Stone Oaths; Gold Oaths survive. Oaths among fae do not shield from Echoes.
- **Against an Echo (p. 111):** roll the oath's rating (difficulty 7), one roll per oath, each success removing a
  success from the Echo roll; the oath must be actively kept by both sides.

### Echoes (pp. 111–115)

- Every fae has at least one Echo: a trigger (a cross, bells, cold iron, a true name, salt over the shoulder…).
- **The roll:** the mortal's Willpower (difficulty 7), or 5 dice when no one wields it (bells, consecrated ground).
  Firstborn add a success, changelings take one away, then oaths (and sprites) cancel successes. Win, and the fae is
  free of that Echo for the scene. Otherwise the net successes give the effect level, 1 to 5 (a true name is an
  automatic 5, oaths still help). Weaving cancels one success per 2 points (p. 102).
- **Effect levels:** 1 discomfort, keep away, maybe −1 or −2 dice; 2 difficulty penalties to powers; 3 the mien partly
  shows (Mists can cover it), up to 3 bashing; 4 no Dominions on that mortal and no Unleashing while it lasts, up to 4
  lethal; 5 banished from the area for 24 hours and terrible harm (firstborn and changelings: 3 aggravated, then 1
  lethal per two turns in its presence; a changeling gains two permanent Echoes; inanimae fall apart into their
  element until enough of it gathers). The book lists 25 sample effects by level (pp. 112–114); WoDX uses the level
  rules and offers a short pick list in its own words.
- **New Echoes (p. 115):** when mortals see a fae in mien with five or more Lesser or any Greater Feature: 10 dice at
  difficulty 7, −1 per five Lesser and per Greater Feature, −1 for inanimae, −1 per three mortals, −1 for a visible
  cantrip that scene, −2 for an Unleashing (−3 if it went awry). Any success is safe; a failure gives one Echo, a botch
  or no dice two. Kenning-holders, mortals under the Mists and supernatural beings do not count; Messianic, Batini and
  Hermetic mages do (p. 115).
- Inquisitors may risk and spend Conviction on Echo rolls (p. 183).

### Experience (p. 116)

- Attribute current ×4; Ability current ×2; new Ability 3; Mists current ×3; Weaving current ×3; favoured Dominion
  current ×5; other Dominion current ×6; new Dominion 10; Greater Feature 5; Willpower current. Raising a Dominion
  needs a teacher (p. 115); new cantrips are learned from a fae or book, or worked out by Unleashing and spending
  Weaving (p. 130).

### Dominions and cantrips (pp. 120–131)

- Four Dominions, each 1–5: Day (light, fire, faith, minds, leadership, mortal guise), Dawn (senses, body, time,
  healing, shielding minds), Dusk (spirits, travel, gateways, reading minds, air, the past), Night (darkness, fear,
  cold, misery; the most harmful). Elements: Day fire, Night water, Dawn earth, Dusk air (p. 124).
- **Cantrips known:** one per Dominion per permanent Weaving dot, each at most the Dominion's rating; unchosen slots
  can be kept; a higher cantrip may replace a lower one (the old one then needs an Unleashing) (pp. 121, 130).
- **Casting (p. 121):** Dominion + the Attribute or Ability the cantrip names, difficulty 6 unless it says otherwise.
  −1 for the Court's favoured Dominion; −1 in its hour (Day noon, Night midnight, Dawn sunrise, Dusk sunset, each with
  the half hour either side); −1 on its solstice or equinox (summer, winter, vernal, autumnal). Cumulative; never below
  4. No limit on castings, but overuse pushes toward Locked.
- **Unleashing (pp. 121–123):** Mists + Dominion against an Unleashing pool of 5 dice (3 for firstborn), both at the
  base difficulty (Court, hour and season lower only the first). Weaving removes Unleashing dice one for one. Results:
  base ≥ Unleashing successes (and at least one): the effect happens under control; Unleashing more: it happens out
  of control; base none: nothing but the visible signs; a botch on either: the Storyteller's havoc (worse with Day and
  Night). Every Unleashing shows its Dominion's visible signs. Regains 1 Mists per two successes. A fae may Unleash to
  get a cantrip's effect it knows, but bigger and undirected.
- **Countering (pp. 130–131):** against a cantrip, either Dominion + Weaving at 7 (must know that Dominion and act
  first; win by 3 and gain a Mists point; a Weaving point buys an automatic success) or Mists at 5 + the cantrip's
  level (a Mists point buys an automatic success); the higher successes win. Against an Unleashing: Mists at 8, each
  success removing one of the caster's base successes; cancelling them all makes it a botch.
- **Level scope (Day, pp. 132–133, similar for each):** 1 the caster or one touched target, minor; 2 one or two others
  within about five feet, bashing or lethal harm; 3 a small group within about ten feet, aggravated harm possible;
  4 a large group within sight, Saining into the Court; 5 any area the fae has seen and touched.
- **Common cantrips (p. 124):** Call Element (Dominion + Strength), Court Summons, and others shared by all four.

### Fae and the other lines (pp. 181–183)

- **Fae blood for Kindred:** no blood in inanimae. Changeling blood (firstborn doubles it) until spent: Summer +2 soak
  dice against sunlight and fire but a false sunlight that does 1 lethal a turn to other vampires; Spring +1 Charisma
  in good spirits, +1 to resist frenzy; Autumn surface thoughts as Auspex 4 but every mind within fifteen feet
  intrudes; Winter +1 to a Physical Attribute but blood yields half; Solstice nothing.
- **Disciplines:** a vampire's Dominate fails on a fae with equal or higher Day or Night (Day and Night also resist
  Presence and other mind powers); Vicissitude and Grave's Decay work, though inanimae can revert to element.
- **Garou:** fae ignore the Delirium; fetishes call on Gnosis and fae cannot use them.
- **Mages:** fae blood is Tass (firstborn up to 5 Quintessence a week living, 10 from the body; changelings 2 a week,
  5 from the body).

### What WoDX needs from this (for the 6g build)

- Pure rules: ORIGINS (Mists, Weaving, Dominions, Unleashing dice, Echo shift), COURTS (favoured Dominion), the
  Dominion hours and seasons from the Chronicle clock, castPlan (pool, difficulty, floor 4), unleash (two pools and the
  four outcomes, Weaving removal, Mists regained), counterPlan (the three ways), imbalance, echoPlan (pool, Origin
  shift, oaths, Weaving) and echoLevel, newEchoPool, XP costs, fae blood effects.
- Sheet: Origin, Court, Mists, Weaving, Dominions, cantrips (list per Dominion, cap by Weaving), Features (Lesser and
  Greater), Echoes (trigger and note), Oaths (kind, rating, terms, active), and the mien (in mien or human).
- Menu: Cast a cantrip, Unleash, Counter, Face an Echo, Mists (hide, cloak, Bestow Kenning, enhance the mien), Take or
  drop the mien, Keep an oath (regain Weaving), rest in a faerie realm.
- Combat hooks: cold iron aggravated and −1 Mists; lethal soak only in mien; Greater Feature weapons.
- Inner voice: the Mists and the Weave (imbalance, days hidden, Weaving overuse), toward Lost or Locked.

## Changeling 20th, cantrips (Ch. 4, pdf pp. 194–197; printed 193–196)

- **A cantrip** = an Art at a chosen level + at least one Realm (the target or scope) + usually a bunk. Without the
  Realm the Art cannot reach the target, except by Unleashing (p. 194).
- **Kinds and cost:** each Art level says chimerical, Wyrd or either. Chimerical (unseen by the unenchanted) costs no
  Glamour; Wyrd (real in both worlds) costs 1 Glamour. Each Realm or Realm level "cheated" (not known) costs +1
  Glamour. Paid before rolling (p. 194).
- **Pool:** Art + the lowest primary Realm used (Actor, Fae, Nature, Prop). Scene and Time change scope, not the pool.
  Replace dice equal to the Nightmare rating with Nightmare dice (p. 274) (p. 194).
- **Difficulty 8,** modified: +1 target's Banality over 7; +1 location's Banality over 7; +1 Scene; +1 Time; +1 on a
  changeling of higher Title without consent; −1 for volunteering at least 3 Nightmare dice; −1 in a freehold; −1 on
  an enchanted mortal or kinain; −1 to −5 for a bunk; −1 with the kith's affinity Realm (p. 194 table).
- **Bunks (pp. 194–196):** the Storyteller rates the bunk −1 to −5 by risk, time, how much it brings the Dreaming in,
  and how the table reacts (a laugh or gasp is worth another −1 or −2). A bunk may need its own roll; failing it does
  not always lose the bonus (it depends whether the bunk's point was achieved). A bunk usually takes a turn first, or
  the player splits the pool to bunk and cast in one turn. The book's own scale of examples runs from −1 (a loud
  burp, sunset) to −5 (skydiving without a parachute); WoDX offers the five steps with short era-fitting examples of
  its own.
- **Steps (p. 196):** Art level, Realms, Glamour, pool (with Nightmare dice), bunk, difficulty, roll and read the Art.
- **Unleashing (pp. 196–197):** state a short intent; spend 2 Glamour and +1 Nightmare; no Realm needed; roll
  Glamour + Nightmare at difficulty 7 (an exception to the rule against adding Traits to Tempers). The successes are
  compared with the Art's rating (to read on, p. 197). A botch: an Imbalance (the Nightmare pool is not reduced), one
  turn of havoc, then a Banality trigger, and no Glamour or Arts for the rest of the scene.

## Changeling 20th, systems (printed pages; pdf = printed + 1)

- **The sheet in the system:** Glamour (permanent, temporary), Banality (permanent, temporary; the pool is not capped by
  the rating), Nightmare (a pool 0–10), Willpower with an imbalance count; Arts and Realms as Power items (types art and
  realms); seeming, kith, court, house, antithesis, threshold and revelry as text fields.
- **Tempers (pp. 172–174, 258–259):** a roll uses the rating. With the pool at 0, a Glamour or Willpower dot converts
  into points equal to the new rating. An 11th Banality point empties the pool and adds one Banality dot (never more
  than one dot at a time).
- **Cantrips (pp. 193–196):** Art (at the dot level used) + the lowest primary Realm used (Actor, Fae, Nature, Prop);
  Scene and Time widen or bend it and add +1 difficulty each, never dice. A Wyrd cantrip costs 1 Glamour, and each Realm
  (or level) the caster lacks, "cheated", costs 1 more. Nightmare dice replace dice equal to the Nightmare rating (never
  adding dice); volunteering 3 more Nightmare dice gives −1 (needs 3 normal dice left). Base difficulty 8; +1 a target
  of Banality 8+; +1 a place of Banality 8+; +1 a changeling of higher Title without consent; −1 freehold; −1 an
  enchanted mortal or kinain; −1 the kith's affinity Realm; bunks −1 to −5 (pp. 194–196). A worked example: Wyrd and a
  cheated Time Realm cost 2 Glamour (p. 236).
- **Unleashing (pp. 196–197):** state the intent; 2 Glamour and +1 Nightmare first; no Realms needed; Glamour +
  Nightmare at 7. Botch: an Imbalance (Nightmare not reset), a turn of havoc, then a Banality trigger, and no Glamour or
  Arts for the scene. Failure: a Banality trigger and that Art is closed for the scene. Successes up to the Art's
  rating: controlled, the Wyrd is invoked for Glamour turns (a Willpower point for the scene), the mien shows, the
  player narrates. More than the Art: the intent comes twisted, +1 Nightmare, the Wyrd for the scene, the Storyteller
  narrates.
- **Nightmare and Imbalance (p. 275):** +1 Nightmare on a botched Glamour or cantrip roll, +1 when Unleashing, +1 per 10
  rolled on a Nightmare die (never above 10). At 10, clear it and mark an Imbalance on the rightmost Willpower box;
  marking it regains a Glamour point. Spending an Imbalanced Willpower brings a Bedlam Threshold for as many scenes as
  there are Imbalances (p. 294). All Willpower Imbalanced: lost to Bedlam.
- **Bedlam Thresholds (pp. 294–295):** the Storyteller's pick: whispers and visions (+1 Perception difficulty per
  Imbalance), memories from a dream (+1 Intelligence per Imbalance), thickened air (+1 Dexterity per Imbalance),
  unstable dreams (chimera turn hostile), remove the leash (only Unleashing, no cantrips), to thine own self (the Wyrd
  at once, +2 Nightmare), drowning in Glamour (all Glamour back; a well for others; +1 Nightmare per Glamour spent).
  Invoking the Autumn eases a threshold for a scene; any Epiphany may remove one Imbalance instead of giving Glamour.
- **Invoking the Wyrd (p. 259):** 1 Glamour and 1 Willpower; Glamour against the higher of the place's or the
  character's Banality; for a scene: a Glamour point rerolls a roll once; 10s are rerolled and add; voile and chimera are
  solid; lethal damage soaks; cantrips are Wyrd and cost no Glamour. A failure is a Banality trigger; a botch, a
  Banality point per 1.
- **Invoking the Autumn (p. 271):** a Willpower point: chimerical effects do not touch the character for an action; it
  is always a Banality trigger.
- **Banality triggers (pp. 174, 269):** Glamour at 8 (higher for severe; automatic for the worst, such as killing a
  changeling with cold iron): a failure gives a point, a botch a point per 1. Common triggers: invoking the Autumn,
  failing to overcome a target's Banality when enchanting (not childlings), destroying a Treasure, killing a
  changeling's chimerical self (wilders mostly immune), ending a changeling's mortal life, killing an enchanted mortal,
  Dreamer or kinain, wielding cold iron, Ravaging or Rhapsody, breaking an oath; each seeming adds one (childling:
  denying a new idea; wilder: refusing adventure; grump: failing someone in their care) and each changeling has an
  antithesis. A Glamour point may instead remove a Banality point when it is gained (p. 174). Quests of Deed,
  Inspiration or Dreaming remove a Banality dot (a failed quest adds one) (pp. 174, 271–273).
- **The Mists (pp. 269–271):** mortals forget by their Banality: 0 a minute, perfect recall; 1 an hour, clarity; 2 six
  hours, partial; 3 twelve hours, disoriented; 4 a day, uncertain; 5 three days, hazy; 6 a week, flashbacks; 7 two weeks,
  dreamlike; 8 a month, distant dream; 9 four months, denial; 10 complete blank. A changeling whose Banality points pass
  the Glamour rating suffers the Mists (lapses, tuned out, confusion, detachment, blackouts, memory gaps, amnesia, at
  the Storyteller's choice); other changelings present count as two steps lower.
- **Epiphany (pp. 259–264):** Reverie: Perception + Kenning (8) sets the time needed (1 success a month … 5 a few
  hours); then Manipulation + a fitting Ability (6), a Glamour point per success; five or more on the Musing Threshold
  gives a Glamour dot. Rapture: the same time roll, then Attribute + Ability at (Banality − Glamour) + 6, a point per
  success; five or more gives a dot and a full pool; a botch, a Banality point. Ravaging: Banality dice (6), a Glamour
  point per success; a failure gives a Banality point, a botch a Banality dot; it is a trigger. Revelry: once a story,
  a scene of the kith's own revelry fills the pool. Rhapsody (forbidden): 1–5 Glamour invested; Manipulation +
  Expression + the invested dice (7); the masterpiece holds 2 Glamour per success, released when destroyed; a failure
  blocks the artist for months equal to the Glamour; a botch, a Banality dot to the artist per 1. Sanctuary: a night in
  a freehold gives its rating in Glamour, shared, at least 1 each.
- **Cold iron (pp. 290–291):** aggravated to the chimerical and physical bodies at once, and a Glamour point per level.
  Chimerical damage marks its own track; the worse penalty of the two applies.

## The inner voice for mages (for the 6d layer)

- **Mage 20th (pp. 338–339):** the Avatar (or Genius) is an inner mentor that never goes away. Its Essence sets how it
  presses: Dynamic ignites passions, Static (Pattern) demands perfection, Questing pulls toward new experience,
  Primal (Primordial) sets enigmas. An Avatar rated 4 or 5 can drive the mage night and day. At crises it can drop the
  mage into a Seeking, an inner journey past an obstacle on the mage's Path; a Seeking is needed to buy a dot of
  Arete, and the mage can fail it and wait. Changing focus keeps Arete but needs seven tools of the new practice and
  halves Spheres (but the affinity Sphere) for a story arc or more; tools are shed again about one per arc (p. 339).
- **Dark Ages: Mage:** no Avatar Trait. Its pressures are Twilight (figments and voices that urge the mage deeper,
  or warn them back; pp. 139–140) and Fount (very high Fount mages hear whispers when channelling much Quintessence;
  p. 87). Arcane Madness (p. 92) and Witchwalk are the Flaws that feed it.
- **WoDX reading for the voice layer:** in Dark Ages chronicles the mage's voice is "the Gift": its pressure rises with
  temporary Twilight and with Quintessence spent past the Fount's turn limit, and it speaks as Twilight's figments
  (Median and deeper) or Fount's whispers. Its proposals: a Twilight-coloured perception the player plays, an urge to
  cast again, a push past abstinence. From the Victorian era on (when the profile has Mage 20th), the voice is the
  Avatar with its Essence; its proposal is a Seeking (the Storyteller plays it out or rules the outcome), triggered at
  crises and when the player buys Arete. Avatar 4–5 raises the pressure floor. B47 to B56 apply as for the other
  voices (opt-in, the Storyteller's switch, the X-card).

## To read next

- M20 for the later eras: Arete, Quintessence and Paradox (pp. 329–335), Quiet, and Ch. 10 the Book of Magick
  (pp. 498–618), to set the Victorian-to-modern mage beside the Dark Ages one.
- Then Dark Ages: Fae and Changeling 20th.
