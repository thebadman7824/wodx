# World of Future Darkness: lore gaps and ways to fill them

Written 2026-11-10 from the PC helper's notes on the books (in project files, notes/wofd/). Page refs give the printed page first, then the pdf page. Offsets: World of Future Darkness printed = pdf + 13; Gehenna pdf - 3; Apocalypse pdf - 4; Ascension pdf - 3 (pdf - 2 after about pdf 60); Time of Judgment pdf - 3 (pdf - 2 after about pdf 150); Ends of Empire pdf - 1; Orpheus End Game pdf - 1.

## What the sources are

The far end of the era span rests on one source: "World of Future Darkness", an 11-page White Wolf Magazine 36 article (pp. 14-24, pdf 1-11). It crosses Vampire second edition with Cyberpunk 2020 and is set in 2020. Everything WoDX has for the era (three dated events, the Net combat rules, cyberware, the Cyberpunks bloodline) comes from it.

The oWoD endings are separate books, written later, and the article never mentions them: Gehenna, Apocalypse and Ascension (2004), Time of Judgment (2004, holding the Changeling, Demon, Hunter, Kindred of the East and Mummy endings), Ends of Empire (Wraith, 1999) and Orpheus End Game (2004). No book in the folder carries any line past 2004 except the article.

## The gaps

### 1. The two timelines do not meet (the root problem)

The article was written before the late-1990s metaplot. It knows nothing of the Week of Nightmares, the Sixth Great Maelstrom, the Reckoning, the Fallen escaping, the Avatar Storm or the Time of Judgment. It contradicts some of them outright: Margali, a 4th Generation Ravnos, is alive and helps make the Cyberpunks in 2016 (p. 19, pdf 6), which cannot happen after the Week of Nightmares in 1999.

In WoDX the timeline split already handles the events (the 1997 and 1999 events and the Time of Judgment are classic only). But the eras do not follow it. The "Time of Judgment" and "Future Darkness branch" house rules can both be on at once, which gives a 2004 ending and then a 2010 future that never heard of it. And the rules switches tied to 1999 (Hunter: The Reckoning from 1999) are dated, not branch-aware, so the future branch gets imbued hunters the article never had.

### 2. Most lines have no future at all

| Line | What the article gives | What is missing |
|---|---|---|
| Vampire | Camarilla, clans, the Venice Conclave of 2009 and the faction it spawned, the Cyberpunks and Technica, Kindred and cyberware (pp. 15-24, pdf 2-11) | The Sabbat gets four lines (p. 18, pdf 5). Nothing after the Masquerade falls in 2024-25 (p. 16, pdf 3). No word on Gehenna, the Antediluvians, thin-bloods or the Assamite and Giovanni changes. |
| Werewolf | Garou and Lupine packs riding with Nomads and raiding corp sites; Net Spiders; a chromed Garou cannot change and pays cyber cost in Gnosis (pp. 16, 18, 20, pdf 3, 5, 7) | Septs, caerns, the Umbra, Pentex, the Wyrm's progress. Apocalypse's endings mostly leave no world to have a future (Ragnarok, Weaver Ascendant; chapters from about pdf 121 and 149). |
| Mage | Magi own megacorp executives; the Order of Hermes; a bloodless Awakening the Flesh (pp. 16, 18, 20, pdf 3, 5, 7) | The Technocracy is never named, in a setting run by megacorps. No Paradox or Consensus rules for a chromed world. No cyber cost for mages. |
| Wraith | Ghost stories about haunted mainframes (p. 18, pdf 5) | The whole Underworld. Ends of Empire destroys Stygia in 1999; the future branch has no account of the dead at all. |
| Changeling | Nothing | Everything. Banality in a surveillance megacity is the obvious question and no book answers it. |
| Hunter | Mortal hunters only: the Society of Leopold, now paramilitary and chromed; FBI Special Affairs cut; the NSA split three ways; the Arcanum (pp. 18-19, pdf 5-6) | No imbued. Which Hunter rules apply is unclear (see gap 1). |
| Demon | Nothing | Everything. The Fallen only escape in the classic timeline. |
| Mummy | Barely changed; a few chromed; cyber cost paid in Ba (pp. 18, 20, pdf 5, 7) | Cults, the Shemsu-heru, the Duat. |
| Kindred of the East | Nothing | Everything. The Sixth Age material lives only in Time of Judgment (pp. 142-175, pdf 145-177). |
| Orpheus | Nothing (it came later) | Everything. |

### 3. The timeline stops in 2025

Dated events end with the Masquerade falling by 2024-25 at the latest (2021 in the article's playtest; p. 16, pdf 3). The era runs to 2099, a placeholder. There is no account of what a world without the Masquerade looks like, how mortals react, or what the sects become. The era's "switches" line names the Fourth Corporate War, which is Cyberpunk 2020's own metaplot, not anything in a WoD book.

### 4. Places

The article's city is Night City, Cyberpunk 2020's own. Beyond it: Venice (the Conclave, the Giovanni), the West Coast, Atlanta (a 1994 Conclave), Transylvania (the Tremere pilgrimage). Europe gets one line: a hint that the Ventrue keep cyberware unpopular there (p. 17, pdf 4). That matters for Rothenstein, which is German: the chronicle's home has no future setting at all.

### 5. Rules that only work for Kindred

The article converts Cyberpunk 2020's Humanity cost for Kindred (Humanity), Garou (Gnosis) and mummies (Ba) only (p. 20, pdf 7). It gives no cost for mages, changelings, wraiths, hunters, demons or Kuei-jin. Its rules are written for Vampire second edition, not V20; WoDX already lays them over V20, but that is a house rule throughout. Cyberpunk 2020 itself is not a WoD book, so anything taken from it straight (guns, the Corporate War) sits outside the source order.

### 6. Small errors found in WoDX

- The Net combat card in wodx-otherworlds cites "scan p. 9". That is pdf 9, printed p. 22, "Vampires in the Net". Fixed in this PR.
- Our Venice Conclave event says the "Children of Carthage" formed; the PC notes read the name as "Children of Carthagos" (p. 17, pdf 4). Needs a look at the scan before either is changed.
- The era table lists only mortal, vampire, werewolf and mage systems for the future era, so the other lines fall back without saying so.

## Options for filling them

**A. One rule for the branch (recommended, and logged).** The Future Darkness branch is the world where the late-1990s metaplot never happened. Nothing from 1997 onward in the classic timeline is true there, so no Week of Nightmares, no Sixth Maelstrom, no Reckoning, no Fallen, no Avatar Storm and no Time of Judgment. This already matches how the events are split, and it removes the Margali contradiction. Follow-up code: the Time of Judgment era is skipped while the branch is on, and the 1999 Hunter switch does not fire in the branch.

Other ways would be to run the future after a quiet Time of Judgment (Gehenna's and Ascension's quietest endings, Ascension pp. 201-204, pdf 203-206), or to treat the future as a separate chronicle with no link. The first means rewriting most of the article, and the second breaks the one-chronicle goal.

**B. Each missing line gets a short house-rule paragraph, built from its own core book's state in 1996.** Each paragraph is held to what the line's books say up to the split, plus one sentence on how the 2020s press on it. Suggested starting points: Wraith keeps Stygia standing (the ghosts in mainframes become Net-haunting wraiths); Changeling treats the megacity as a Banality storm; Hunter stays with Hunters Hunted II mortals; Demon and Orpheus are not in the branch unless the Storyteller adds them; Kindred of the East keeps its 1998 core book's state; Mage gets a Technocracy that owns the megacorps the article gives to the Ventrue and Tremere. Each needs its line's book pages checked on the PC before writing.

**C. Cyber cost for every line, as a house rule.** Follow the article's pattern (the line's core trait pays): changelings gain Banality, hunters and mortals lose Humanity as Kindred do, Kuei-jin pay in Dharma, wraiths cannot carry cyberware, demons pay in Torment, mages pay nothing in Humanity but a chromed body counts as static reality for Paradox. Numbers to be set once the trait scales are checked.

**D. After 2025.** Either end the era at 2030 and leave the rest to the Storyteller, or write five to ten house-rule events (mortal reaction, sect collapse into coteries, the corps' hunters) clearly marked as house rules. Recommended: end the era at 2030 for now and keep the open years as an interlude.

**E. Europe in 2020.** A short house-rule note for Germany and the Rhineland, built on the article's one line about the Ventrue and cyberware, so Rothenstein has a future setting.

## Not used

Mind's Eye Theatre and anything V5 were left out. Trinity and Aeon are a different setting and were not considered.
