# Era advancement: carrying a character across eras (WoDX Creation 0.6.0, B83)

- [x] Ben's choices (B82 to B86): every recommendation in "WoDX: Phase 7 Plan, 7c Onward"
- [x] Book checks: W20 pp. 39–41 (White Howlers fell in the 1st century; the Croatan at Roanoke; the Bunyip in the War of Tears), V20 pp. 500–501 (a ghoul's aging), C20 pp. 35–37 (the Shattering ends with the Black Plague; the Resurgence on 20 July 1969)
- [x] Tables as data (data/advance.mjs): Dark Ages Abilities to later ones, Roads to the system's V20 Paths, lines limited to some years, lost tribes, the fae crossing
- [x] Advancers (advance-rules.mjs, pure): mortal decline, thick blood, morality drift, experience for the years, Backgrounds, Abilities, Roads, Dark Ages mages, fae and inquisitors, out-of-era lines, lost tribes, notes for wraiths, Kuei-jin, demons, mummies and Orpheus
- [x] Pass the Years: the advancers' proposals in the plan, a pick where a change offers one, a snapshot of every changed character in "WoDX · Before the years", an era history and the years awake on each character
- [x] Five house rules in WoDX Chronicle 0.4.1, group "Passing the years": Thick blood (off), Mortal decline (on), Morality drift (off), Experience for the years (on), Convert Dark Ages Abilities (on)
- [x] Harness tests (advance.test.mjs, 11; time.test.mjs counts the snapshots); the in-world time-skip test accepts Theology's dots moved to Religion
- [x] Deployed 2026-11-08 (Backups/wodx-creation-0.5.0-2026-11-08 and Backups/wodx-chronicle-0.4.0-2026-11-08 first; every file checked by MD5)
- [ ] Gate, in **wodx-template** only (it moves the clock to 1840, so never in Rothenstein). Scripted in tools/gate/gateera.mjs, copied to Data/wodx-gate. As a Gamemaster in wodx-template, after a reload, run in the console:
  `await (await import(`/wodx-gate/gateera.mjs?${Date.now()}`)).run()`
  It writes Data/wodx-gate/gateera-result.json and puts the clock, the era and the test characters back. Its seven steps:
  1. House rules shows the five switches under "Passing the years" with the defaults above.
  2. Make a test vampire on the Road of Kings with Archery 3, Embraced in 1150, and a test mortal born 1170. In the Dark Ages, open Pass the Years for 640 years (to the Victorian age).
  3. The vampire's row offers Archery to Firearms, the Road of Kings to Path of Power and the Inner Voice (with Honorable Accord as the other pick) and 10 experience. The mortal's row offers death of age.
  4. Pick Honorable Accord and pass the years. The vampire has Firearms 3, Archery 0, Path of Honorable Accord at the same rating and 10 experience in the log.
  5. "WoDX · Before the years" holds a copy of each changed character as it was, and the copy is not offered in the next plan.
  6. The vampire's sheet is the V20 sheet (WoDX Sheets follows the era), and "WoDX Time Skips" lists what changed with the pick.
  7. Put the era and clock back and delete the test characters and copies.
