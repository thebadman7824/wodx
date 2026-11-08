# Phase 6b checklist: Werewolf and Fera

Batch 1, first half (B38). Rules basis by era (B41): Dark Ages: Werewolf in the Dark Ages and Long Night profiles, W20 elsewhere. Every card carries its page reference; no book text is copied.

## Done by Claude (2026-11-07)

- [x] **Research.** DA:W chapters 3–5, W20's Garou rules and each Changing Breeds breed's Traits section, as mechanics notes with page references (`docs/research/6b-werewolf-notes.md`).
- [x] **Data** (WoDX Actions `data/`):
  - `garou.json`: breeds, auspices, tribes, Rank chart, moon Rage, frenzy by Rank, rites, summoning, Battle Scars, the Delirium.
  - `fera.json`: each Changing Breed's bane, Rage, frenzy, regeneration and Renown names.
  - `gifts-daw.json`: the Gift library, 179 Gifts with costs, rolls, difficulties and durations as codes (B39). Entries marked "check" were read from a damaged scan.
- [x] **WoDX Actions 3.1.0** (`garou.js`, `garou-rules.js`):
  - Change form: the system's own forms; one success per form, partway on fewer; Rage for an instant change; back to the breed form at once; losing the wolf. Dark Ages Glabro is Manipulation −1 (an effect offsets the sheet's −2).
  - Rage: Rage roll by era and moon, frenzy and the Thrall with resist / berserk / fox buttons, ending frenzy, spending Rage (extra-action cap, instant change, stun, Dark Ages pain), rising on Rage once a scene, regaining Rage. A warning when Rage and Gnosis are used in the same turn.
  - Gnosis: meditation (once a day, harder each day of the week), fetishes and talens (a spent talen is marked, never deleted).
  - Gifts: use (cost, pool, difficulty from the target or the Gauntlet, a timed effect for its duration) and learn (filtered by Rank, cost by breed / auspice / tribe, search box).
  - Rites (by kind, participants, caern), summoning, chiminage ledger.
  - Renown: award (GM; losses break dots; Rank check; "WoDX Renown" journal), Rite of Accomplishment, Battle Scars.
  - Witnesses: the Delirium (whispered, by Willpower; Kinfolk and the supernatural spared; Ratkin and Occult options), the Curse, Kinfolk.
  - Automatic: moon Rage at nightfall with a whispered card (B40); regeneration each round in a fight; Dark Ages Embrace Pain. Two new settings turn the first two off.
  - The Werewolf / Changing Breed menu is rebuilt around these.
- [x] **WoDX Combat 3.1.0:** silver and gold by era, breed and form (DA:W p. 102, W20 p. 255, Changing Breeds); teeth and claws by form in the weapon list; Dark Ages: no aggravated soak in Homid.
- [x] **WoDX Creation 0.4.0:** the First Change (Creation and experience → The First Change): a Werewolf sheet from a mortal's, the mortal kept and linked. A Dark Ages pack can pool Hunting Grounds.
- [x] **Quality gate, automatic part:** harness 124 tests (33 new, in `phase6b.test.mjs` and `first-change.test.mjs`); UI fit passes for every window, with 21 new dialogs; `quality-check.sh` passes.
- [x] **Installed** on 2026-11-07 (3.1.0), then 3.1.1 / 0.4.1 / fork 7.3.2-wodx.3 after the gate's first run. The files replaced are in `wodx-repo/backups/before-6b-3.0.1`.

## For you

1. Setup → Backups: snapshot **rothenstein-wodx**.
2. Open rothenstein-wodx (or press F5 if it is open). Manage Modules should show WoDX Actions 3.1.0, WoDX Combat 3.1.0 and WoDX Creation 0.4.0.
3. **Test pack.** Press F12, and in the console type `game.wodxActions.makeTestPack()`, then confirm. A folder "WoDX 6b test pack" appears with five Garou, a Bastet, a Corax and three mortals (Hedda is Fenrir Kinfolk). Drag Wilhelm, Thorn, Miller Jost, Father Anselm and Hedda onto a scene.
4. **Change form.** Wilhelm's token → WoDX Actions → Change form → Crinos by roll.
   - One success: Glabro ("Partway"). Two: Crinos. The sheet's Strength and Stamina go up; the card mentions the Delirium.
   - In Glabro the token shows "Glabro (Dark Ages): Manipulation −1"; it goes when he leaves Glabro.
5. **Rage.** Rage roll for Wilhelm. With four or more successes the card offers resist, berserk and fox. Choose berserk: he goes to Crinos and shows Frenzy. Then End frenzy.
6. **Moon Rage.** Spend some of Wilhelm's Rage, then Clock → advance to nightfall. A whispered "Moonrise" card lists the Rage regained (all of it for an Ahroun under a full moon).
7. **Gifts.** Learn a Gift for Wilhelm: the list has a search box, higher-level Gifts are greyed out, the cost is ×3 for his own. Then Use a Gift: Gnosis goes down and the effect shows on the token.
8. **Silver.** Give Miller Jost a melee weapon named "Silver knife". Attack Wilhelm:
   - in Crinos: aggravated, no Stamina in the soak;
   - in Homid: soaked at difficulty 6, the rest lethal.
   - In Wilhelm's own attack dialog in Glabro, Bite is lethal and there is no Claw.
9. **Fetish and talen.** Thorn → Fetish or talen → the Moon Bridge Pebble (talen). After it wakes it is marked spent and stays on the sheet.
10. **Renown.** Award Renown (GM) to Wilhelm: +3 Glory. A whispered card and the "WoDX Renown" journal record it.
11. **The Delirium.** With Thorn in Crinos, target Miller Jost, Father Anselm and Hedda, then The Delirium. Hedda is untouched (Kinfolk); the others react by Willpower.
12. **The First Change.** Creation and experience → The First Change → Hedda. Tribe starts as Fenrir; pick three Gifts from those marked at the top.
    - A Werewolf "Hedda" appears; the mortal Hedda moves to "WoDX · Before the First Change"; her token now shows the Garou.
13. **Pack.** Create a Group (pack) and add a Background: Hunting Grounds is accepted without the "not on the book's list" notice.
14. **Regeneration.** Start a combat with Thorn (bruised: give him 2 bashing). On the next round a whispered card shows one level regenerating.
15. Look at the console (F12) for red lines starting with "WoDX", then tell Claude you're done. Delete the test-pack folder whenever you like.

## Gate result

### Gate run by Claude, 2026-11-07 (as Gamemaster Test, B37)

Run in rothenstein-wodx with a script that answers each dialog and records the sheets and cards (`tools/gate/gate6b.mjs`; results in `Data/wodx-gate/gate6b-result.json`). Backup first: "Before Phase 6b gate".

- **First run: 11 of 18 passed.** It found three real bugs, fixed in 3.1.1 / 0.4.1 and the fork's 7.3.2-wodx.3:
  - Changing form never changed the sheet's Attributes. The system works out totals only when an update sets `isupdated` to false, as its own sheet does; WoDX now does too (forms, the test pack, the First Change). The Dark Ages Glabro Manipulation −1 now sets the sheet's own Glabro bonus instead of using an effect.
  - Learn a Gift took the last Gift in the list, not the one picked: dialogs read every radio button (both WoDX modules' form reader).
  - The system's load-time migration threw for any werewolf with an effect (it reads `effect.icon`, gone since Foundry 12), so every reload showed a red error once WoDX Gifts put effects on Garou. Fixed in the fork, deleting nothing.
  - Also: moonrise no longer lists sheets with no Rage set up (the deprecated template tokens); the test pack's tokens are linked.
- **Second run: every rules check passed** (15 of 18; the other three are a version label the server reads only at launch, a talen already spent in the first run, which the dialog now refuses, and the change-form check, which assumed no Curse):
  - Change form: Strength 4 → 6 in Glabro → 8 in Crinos; Glabro Manipulation −1 (sheet bonus −1); the Crinos card mentions the Delirium. By roll: "2 successes needed", partway handled.
  - Rage roll: frenzy card with resist, berserk and fox; berserk set Frenzy and Crinos; End frenzy cleared it.
  - Moonrise card at nightfall, whispered: Rage 1 → 4 under a last-quarter moon (DA:W).
  - Learn a Gift: search box, 103 of 175 greyed out at Rank 1, the picked Gift learned. Use a Gift: Gnosis paid, scene effect on the token, and the Rage-and-Gnosis warning (a fight was running).
  - Silver: in Crinos, 3 aggravated with no soak dice; in Homid, soaked at difficulty 6, the rest lethal. Glabro offers Bite (lethal) and no Claw.
  - Talen marked spent and kept (first run). Renown +3 Glory, journal and whispered card. Delirium: Miller forgets, Father Anselm rationalizes, Hedda (Kinfolk) untouched.
  - First Change (first run): Hedda offered Fenrir; a Werewolf Hedda with three marked Gifts; the mortal moved to "WoDX · Before the First Change"; her token shows the Garou.
  - Hunting Grounds poolable by a Dark Ages pack. Regeneration: Thorn 2 → 1 bashing on the new round, with a whispered card.
  - The Werewolf menu renders with every section and scrolls.
- **Worth knowing:** the system has its own Rage rule (its `wererwolfrageSettings` setting, on in this world) that lowers Charisma and Manipulation by Rage above Willpower on the sheet. WoDX's Curse tool is the DA:W version (dice against one human's Willpower) and only reports; the two don't stack, but the sheet already shows the system's.
- **Left in the world for you:** the "WoDX 6b test pack" folder and its tokens on Dolany Village (plus a Kinfolk Hedda token), the Werewolf Hedda, two test combats on Dolany Village (and the one from 6a), a "Silver knife (test)" on Miller Jost, and the "WoDX Renown" journal. The clock was put back. Nothing was deleted.
- **For you (Ben):** relaunch rothenstein-wodx once (Manage Modules should then read WoDX Actions 3.1.1, WoDX Combat 3.1.1, WoDX Creation 0.4.1, system 7.3.2-wodx.3), glance at the console for red "WoDX" lines, and tell Claude whether the gate passes.

### Ben's run, 2026-11-07

- Ben completed the "For you" steps and reported no problems: **Phase 6b passes.**
- Claude's check afterwards (Gamemaster Test): no WoDX errors in the console; WoDX Actions 3.3.0 and Combat 3.5.0 code is running.
- Manage Modules still shows the versions from when the server started (Actions 3.1.0, Combat 3.1.0, Creation 0.4.0, system 7.3.2-wodx.2): the server reads module and system manifests only when it starts. The new code is already in use; a full restart of Foundry (close the app and open it again) updates the labels and turns on the "WoDX: Sunlight" region behavior (`documentTypes` in the manifest).
- Still in the world, to delete whenever you say: the "WoDX 6b test pack" folder and its tokens, "WoDX · Before the First Change", the Werewolf Hedda, the test combats on Dolany Village, the "Silver knife (test)" on Miller Jost, the "WoDX Renown" journal, the gate files in `Data/wodx-gate`, and the extra file `wodx-repo/last-deploy/wodx-combat-main.js`. "Dolany Village (gridless trial)" stays until you've tried it.
