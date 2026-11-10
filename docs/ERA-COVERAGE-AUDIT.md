# Era coverage audit, 10 November 2026

Ben's rule (2026-11-10): anything that touches the passage of time must work in every WoDX era, 1197 to the World of Future Darkness, and change as the centuries pass. This audit checked all 14 modules on main at cb1823e.

## Fixed in this change

| What was wrong | Fix |
|---|---|
| Mage: The Dark Ages, Dark Ages: Fae, voice, Senses (Auspex against Obfuscate) and NPC routines treated the Long Night (1347 to 1449) as a modern era, so their Dark Ages rules switched off in 1347. | All six checks take the Long Night as the Dark Ages, as the era profile's basis says. |
| The First Change gave a Renaissance werewolf the modern ability set, and Wild West and Great War werewolves the modern set instead of the Victorian. | It reads the ability set from the era profile. |
| Fill by place and era drew no gear in 2099 (no gear carries that era's tag). | 2099 draws Future Darkness gear, as the Library already does. |
| The Library's "this era only" showed no Encyclopaedia entries in the Long Night and one in the Time of Judgment. | The Long Night also shows Dark Ages entries, the Time of Judgment modern ones (house rule, in PENDING-REVIEW). |
| Wraith used the Great War book's Arcanoi until 1989, because no era covers 1919 to 1989. | The Great War Arcanoi serve 1914 to 1918 only. |
| Generators (people, the night's draw, symbols) gave Future Darkness the 1990s tables, and 1919 to 1989 the Victorian ones: lamplit constables in 1975, phones in 1950. Prologues found no people tables at all. | Two new era groups, mid-century (1919 to 1989) and future (2010 on), with their own encounters in town and the wilds, rumours, symbols, trades and common Abilities. A group with no table of its own borrows the nearest one (future from modern, mid-century from industrial, the prologues from medieval). |

## Gaps still open, by priority

1. **Years no era covers.** Chronicle has no profile for 1601 to 1836, 1902 to 1913, 1919 to 1989 or 2005 to 2009, so those years keep the last era. 1950 runs the Great War kit (sepia grade, field drums, telegram and field-order handouts), and Great War gear and goods; 1750 runs the Renaissance kit and gear. Fix proposed: two bridge profiles (Age of Reason 1601 to 1836, Mid-century 1919 to 1989) whose rules copy the era before, plus a fallback chain on every lookup keyed by era. Touches every module, so it waits for Ben's choice.
2. **Dated events on the classic timeline.** 25 events between 1197 and 2025: none before 1347 and none from 1601 to 1896. The future branch has about 418 for 1990 to 2099. Fix: an events pass built from the Encyclopaedia's dated entries, which already carry page references, then book checks on the PC.
3. **Encyclopaedia era tags.** 1846 entries are tagged modern, 6 Future Darkness, none the Long Night. A tagging pass should mark which modern entries still hold after the Masquerade falls in 2025, using the approved Future Darkness timeline.
4. **Gear by era is thin late.** Modern 22 items, Victorian 28, nothing written for 1919 to 1989 beyond Great War and V20 firearms.
5. **Map generation** (its own thread is on it): every building type is medieval and towns are written as Dark Ages; later eras need other asset packs and building types, and a town should grow from village to city as the years pass.
6. **Paperdoll** (its own thread is on it): grounds, dyes and headwear are medieval only (gold leaf, woad and madder, veil and wimple). No clothes for later eras.
7. **NPC factions.** Two sphere lists only, the Dark Ages one and the modern one. Future Darkness has no corporate or Net spheres; the Victorian age gets the modern list.
8. **Otherworlds journeys.** Tempest landmarks assume Stygia and the Hierarchy in every year, including after the Sixth Great Maelstrom (1999) and in Future Darkness.
9. **Interactables.** Carried light stops at the electric torch, mounts at the motorboat, locks at the keypad: nothing for Future Darkness.
10. **Languages.** One list for every era: no sense of which tongues a table meets in 1200 or 2080.

## Checked and sound

Senses (lines banded by year from medieval to future), Atmosphere (a kit per era with fallbacks), Chronicle's calendar, reckoning, church year and era advancement, Storyteller letters and money (by year up to the euro and the Net), Hunter line by year, Otherworlds Maelstroms, Avatar Storm and the Net, Wraith's Great War library in 1914 to 1918. Combat, Targeting, Sheets, hardship and havens use the same book rules in every era and need no era data.
