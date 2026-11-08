# Phase 6, batch 3: Demon, Kindred of the East, Mummy, Orpheus (research notes)

Mechanics only, in WoDX's words, with printed page numbers. Private use. The books were read on Ben's PC:
Demon: The Fallen and Kindred of the East from their text layers; Mummy: The Resurrection and Orpheus by OCR (the
scans' page numbers drift, so each page was checked against its printed number).

## Demon: The Fallen (6i)

The system has a Demon actor type: House and Faction are Bio lists (keys `wod.bio.demon.<house>`), Visage is text;
Faith and Torment have permanent and temporary values; lores are Power items (`wod.types.lore`) with lore powers;
the apocalyptic form is eight Trait items (`wod.types.apocalypticform`, four flagged high-Torment).

- Houses (pp. 99–112): starting Torment 4 for Devils, Devourers and Slayers; 3 for the others. Each has three
  lores; every demon also knows the Fundament and Humanity paths (p. 170).
- Creation (p. 123): 7/5/3, 13/9/5 (3 at most), Backgrounds 5, lore 3 (none above the primary lore), Virtues 3,
  Faith 3, Willpower the two highest Virtues, 15 freebies (Attribute 5, Ability 2, lore 7, Background 1, Faith 6,
  Virtue 2, Willpower 1).
- Evocations (pp. 169–171): Attribute + Ability at 6. Faith points spent add automatic successes. Ravaged thralls
  add dice up to the permanent Faith (each die is a Willpower point from a thrall, then an unsoakable lethal level;
  p. 251). A botch costs a Faith point. Only one evocation a turn, and no more running than the permanent Faith.
- Torment and evocations: the book says it two ways. P. 161: if any die that scored a success shows a number at or
  below the permanent Torment, the high-Torment effect occurs. P. 169: the high-Torment effect occurs when the
  successes are not more than the Torment. The second would twist almost every evocation of a Torment 3 demon; WoDX
  uses the first and keeps the second as a choice on the actor. Choosing the high-Torment effect costs a temporary
  Torment point.
- The apocalyptic form (p. 170): the current Faith pool at 6, or a Faith point for certainty; a botch costs Faith.
  Four powers always; one high-Torment power for each permanent Torment point from 7 (lost last-in, first-out).
  One more can be called up in peril for a scene, at a Torment point. It lasts the scene; Stamina then soaks lethal.
  How mortals see it (pp. 162, 254): Torment at most half the Willpower, glorious; above the Willpower, a nightmare.
- Revelation (pp. 253–254): mortals roll Perception + Awareness at 10 less the Faith spent in the scene. A witness
  rolls Willpower against the demon's permanent Faith (botch: collapse; failure: rapt; 1–3 successes: how much is
  remembered). Revelation alone never reaps Faith.
- Torment (pp. 159–161): the Hierarchy of Sins has nine rows; a sin counts at or above the demon's own row. A sin's
  Virtue roll is at 8, without Willpower and without a botch; failure adds a temporary point. Ten temporary points
  make a permanent point; permanent 10 takes the demon out of play. An act of kindness: the Virtue resisted by the
  Torment (the book gives no difficulty; WoDX uses 6); the Virtue winning removes a temporary point.
- Faith (pp. 250–253): reaping is Willpower at 7 against the mortal's Willpower at 7; a win takes a point (two if
  the act strikes the mortal's own beliefs). A thrall's Faith potential (0–5) buys gifts; up to half (rounded up) may
  be offered as Faith each dawn instead.
- Also: Faith heals all bashing or one lethal level a point, never aggravated (pp. 171, 248); holy ground and sacred
  objects burn demons of Torment 4 or more (lethal equal to the potential, pp. 254–255); unbelievers' successes add
  difficulty (p. 253); a name spoken (Faith at 7 or 6) and seeing through illusion (p. 171); experience (p. 164).
- The 23 lore paths, their evocations' traits and the visages' powers were taken from Chapter Seven (pp. 171–215).
  A few evocations print no clear pool (Fade, Enchant Object): the dialog asks for the traits.

## Kindred of the East (6j)

The system shows the Kuei-jin as the Vampire sheet with the variant "kindredeast": Yin and Yang (dots) with Yin
and Yang Chi (boxes), Hun, P'o, Demon Chi, and a Dharma rating with a name box. The page numbers jump in the scan
(pdf 48 is p. 54; pdf 122 is p. 134).

- Dharmas (p. 54): Devil-Tiger (P'o), Resplendent Crane (Hun), Song of the Shadow (Yin), Thousand Whispers
  (Balance: the average of the highest and lowest Virtue, p. 53), Thrashing Dragon (Yang). The Dharma chart gives
  Chi a turn (1, 1, 1, 1, 2, 2, 3, 4, 6, 8 for Dharma 0–9), the Virtue pair maximum and the Trait maximum.
- Dharma rolls (pp. 53–54): the Dharma's Virtue against the P'o, both at the permanent Willpower, no Willpower spent.
  An auspicious occasion: the Virtue wins, +1 Dharma; the P'o wins, it takes the body for a scene. An act of
  blindness: the P'o wins, −1 Dharma.
- Chi (pp. 134–140): at most 10 of each kind. Blood gives the kind held less first, then alternates (the book's
  example); a mood set first (Manipulation + the Virtue at 6) gives one kind. Flesh: fresh both, a cold corpse 8:2
  Yin, the living 2:8 Yang. Breath (Dharma 5): the Chi Virtue at 6 against Stamina. Osmosis (Dharma 6, at least the
  Wall): 10 − Wall. One kind a turn (Equilibrium excepted); three or more show as an aura. Rising costs a point:
  Yin lasts ten nights (a corpse's pallor), Yang one night; with no Chi, a Health Level instead.
- Imbalance (pp. 139–140): permanent at three dots apart (a derangement; Yin: corpse-cold, wound penalties halved,
  the P'o needs one more success for fire soul; Yang: the sun borne longer, one fewer success, ravenous sooner).
  Temporary: more of a kind than its Virtue, or none of one kind. A botched roll that spends Chi while temporarily
  imbalanced: each point over the Virtues is an aggravated level (Stamina at 8), and wave soul is checked.
- Hunger (p. 136): five or less Chi, hungry; two or less, ravenous (the P'o needs one success).
- The soul (pp. 150–151): fire soul (Yin), wave soul (Yang) and shadow soul (Hun), each against the P'o at 6, an
  extended contest of up to five turns; the first to two successes wins. Shadow soul lost: the P'o's Archetype takes
  the body for a scene (a Hun roll at 9 keeps the Hun aware).
- The Demon (pp. 90–91): Demon Chi equals the permanent P'o; evoking it is P'o against Hun + 3; four successes bring
  fire soul. At most Stamina a turn; back at dusk with a P'o roll at 6. Fangs 1, a fanged maw 2 (Strength + 2
  aggravated). A Demon Art is harnessed afterwards by Hun against a difficulty of the P'o.
- The sun (p. 151): (Stamina − Yin Chi) minutes a day, nine at most, then each turn a Health Level (healed as
  aggravated), −1 to the Physical Attributes and Appearance, −1 Yin Chi; Yang spent holds it back a turn a point.
- Also: healing as Kindred with Chi (p. 145; aggravated taken as V20's five points and a day's rest); slumber with
  the higher of Hun and Dharma (p. 151); Willpower at most Hun + 5 (p. 91); Horoscope's lucky numbers (p. 86);
  experience (p. 142: Disciplines × 8, new 10; Yin, Yang, Hun × 3, × 2 if imbalanced toward it; P'o and Willpower
  at the current rating; Dharma is not bought).

## Mummy: The Resurrection (6k)

The system has a Mummy type: Balance (permanent), Sekhem (rating and pool), an Amenti text field, Hekau paths and
spells as Power items. The scan's offsets drift from +4 to +6.

- Amenti (Chapter Two; p. 56): Kher-minu (ka; Amulets), Khri-habi (ba; Alchemy), Mesektet (sahu; Celestial),
  Sakhmu (khu; Effigy), Sefekhi (khaibit; Necromancy), Udja-sen (no favored path).
- Creation (p. 56): the Second Life (6/4/3, 11/7/4, Backgrounds 3, 5 freebies), then the Rebirth (+2 Attributes,
  +5 Abilities, Hekau 3 with one in the Amenti's path, +2 Backgrounds, Balance 1 (3 at most), Willpower 5, Sekhem 1,
  10 freebies; two spells and two rituals of level one, p. 78).
- Hekau (p. 78): the path's rating + the Trait the spell names, at its difficulty. Sekhem is spent whether it works
  or not; more Sekhem before the roll buys automatic successes, no more than the path's rating. Rituals are extended
  up to their Sekhem cost; a botch loses it all. Active amulets and effigies: Balance + the higher of the two paths.
- Sekhem (pp. 143–144): it stands at the Balance. The Gift of Ra: a point each sunrise. Osiris's Blessing: a day in
  the Web of Faith, Balance at the Shroud, a point a success (a botch costs one). A haven outside the Web: Wits +
  Meditation at 8, then the same roll at 9. Semektet: no Sekhem outside the Web; no Ra, no Hekau; after 70 days an
  Attribute a day (Mental first); a Willpower roll a day at 7 (4 bandaged, an Attribute every three days).
- Balance (pp. 141–142): resist a pull against Ma'at (the Storyteller's 4 to 8; added to Willpower on resistance
  rolls); counter magic at 8; Forbiddance, Balance against Willpower at 6. No Hekau and no Attribute above it. The
  offenses chart has ten rows; an offense counts at or below the mummy's Balance. The judges weigh offenses at the
  next judgment: a fall brings Hekau above the new Balance down to it.
- Death (pp. 136–138): five khat levels past Incapacitated. The resurrection: a permanent Sekhem and Willpower + Ba,
  or a permanent Willpower and Sekhem + Ba, at 8; each success mends a level, the khat's first. Failing, a day's
  wait; a botch, the Ba's full time; more than one roll in a year costs an Attribute. What is left counts as
  aggravated. The Ba Background (p. 64) sets the least time dead (a year down to a day).
- Also: lethal heals a level faster than a mortal's (p. 136); the Veil table by Willpower (p. 140); mummy blood
  (p. 145); experience (p. 146).

## Orpheus (6l)

The system shows Orpheus characters as the Mortal sheet with the variant "orpheus": Shade, Lament and role are text
fields; Vitality and Spite each have a permanent and a temporary value; Horrors and Stains are Power items. WoDX
reads the permanent Vitality as the starting Vitality and the temporary as the current, the permanent Spite as the
rating and the temporary as the points. Printed pages are the pdf's less one.

- Shades (p. 122): Banshee (5/3/0, Wail), Haunter (5/4/1, Inhabit), Poltergeist (5/5/2, Helter Skelter), Skinrider
  (4/6/2, Puppetry), Wisp (4/4/0, Unearthly Repose); each has prohibited Horrors. Laments: hue and spirit (ghosts),
  skimmer and sleeper (projectors), each with a bonus and a weakness.
- Creation (pp. 122–130): 6/4/3, 11/7/4, Backgrounds 2 mundane and 2 Orpheus, three Stains; Vitality, Willpower and
  Spite from the Shade plus the Nature's modifiers; Vitality nine at most (seven for hues); 15 freebies (a Horror of
  the Shade 7, another 10; Vitality 5, Willpower 3). The book's Poltergeist Critic checks out (Vitality 6, Spite 4).
- Vitality (pp. 188–192): the spook's body; wounds come off it (a skimmer's come out in the body as bashing). Seven
  or more passes for the living to Spectres; four or less, plain as any ghost. Three spent in a turn is felt three
  blocks off; five draws Spectres from five. Rest: eight hours a point (projectors an hour in the body); a Willpower
  point: three at once; sharing within the crucible. At zero, a Willpower point is spent at once for three; at zero
  of both, the spook dissipates.
- Spite (pp. 191–193): tapping points gives Vitality one for one; tapping the rating fills it to 10; one die a point
  (one for the rating) at 7, each failure adding a point (a rating), a botched die two; ten points make a rating and
  each new rating brings a Stain. Spite equal to the starting Vitality: +1 difficulty and only the violent effects;
  one over: Willpower at the Spite rating when facing a Spectre; two over: that many Stains forced out; 10: a Spectre.
  Severing a ghost's last tether takes a rating away.
- Horrors draw on Vitality from 0 to 5 points, each power with its own effect at each level (p. 190); the dialog
  takes the roll the Horror names.
