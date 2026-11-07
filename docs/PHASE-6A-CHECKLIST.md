# Phase 6a checklist: the shared parts

Phase 6 is split (B32). This first part builds what every line uses. Batch 1 (Werewolf and Fera, mortals, hunters with True Faith, wraiths) comes after this gate.

## Done by Claude (2026-11-07)

- [x] **System fork 7.3.2-wodx.2:** the Group actor type (B34). The 7.3.2-wodx.1 files it replaced are backed up in `wodx-repo/backups/system-7.3.2-wodx.1`.
- [x] **WoDX Chronicle 0.2.0:** the conditions registry and timed effects (B35).
  - Conditions: blinded, crippled, dazed, held, completely immobilized, staked, knocked down, incapacitated, torpor, frenzy and Rötschreck, all from V20 Dark Ages. They are listed in Chronicle Rules, "Conditions".
  - Timed effects end on their own by round, scene, night or clock time.
  - The Clock has a new "End the scene" button.
- [x] **WoDX Creation 0.3.0:** the Group sheet, with a roster, pooled Backgrounds, an Anchor, warnings and notes.
- [x] **WoDX Actions 3.0.0 and WoDX Combat 3.0.0**, which replace vtda20-actions and vtda20-combat (B33).
  - The migration goes through the approval queue.
  - Quickening is a timed effect.
  - Conditions show in the attack dialog.
  - A heavy hit applies Dazed automatically (B36).
  - Search boxes are added where lists are long (B24).
- [x] **Quality gate, automatic part:** unit tests, 90 harness tests (13 new) and UI fit all pass. UI fit covers 16 new dialogs and the Group sheet.

## For you

1. Setup → Backups: snapshot **rothenstein-wodx** and **wodx-template**.
2. Restart Foundry. In Setup, the game system should read version 7.3.2-wodx.2.
3. Open **rothenstein-wodx**. In Manage Modules:
   - Turn off **VtDA20 Non-Combat Actions** and **VtDA20 Combat Automation**.
   - Turn on **WoDX Actions** and **WoDX Combat**.
   - Save, and let the world reload.

   If WoDX Actions or WoDX Combat shows a red notice that a VtDA20 module is still enabled, turn that one off.
4. **The move from VtDA20.** Open the approval queue (Clock → Approvals). Approve "Move VtDA20 data to WoDX Actions and WoDX Combat". Then open the "WoDX Migration from VtDA20" journal. You should see:
   - at least 16 actors moved (unlinked tokens with VtDA20 flags count too);
   - 11 macros renamed to "WoDX: …";
   - one "VtDA20: Actor Type" left as it is, because each old module made one with that name. It still works.
5. **Buttons.** On a token's HUD, the book and sword buttons should read "WoDX Actions" and "WoDX Attack". Open the Actions menu for a vampire: it is the same menu as before.
6. **A timed effect.** As a vampire, open Spend blood and put 1 into Dexterity.
   - The token shows a "Quickening: Dexterity +1" effect, and the sheet's Dexterity goes up by 1.
   - Clock → **End the scene**: the effect ends and Dexterity goes back. A whispered card lists what ended.
7. **Conditions.** On one token's HUD, set **Blinded**. On another, set **Held**. Select the blinded one, target the held one, and press Attack.
   - The dialog lists both conditions.
   - Extra dice is filled in as 2 and extra difficulty as 2.
8. **Dazed.** Start a combat. Hit a mortal for more health levels after soak than their Stamina.
   - The card says "Dazed" and the token shows the Dazed status.
   - Advance two rounds: the status ends.
9. **A Group.** In the Actors sidebar, create an actor of type **Group** (a coterie).
   - Add three members with the search box.
   - Pool Domain and Herd. Put dots in from two members and make Domain the Anchor.
   - Give Herd more dots than Domain: a warning should say no pool may have more dots than the Anchor.
   - Press "Leaves" on one member and confirm: they move to former members, and a whispered card lists their dots coming back, one short each.
10. **The original Rothenstein world.** Open it once and close it. It keeps the VtDA20 modules and shares the system fork, so this checks the fork change didn't disturb it.
11. Look at the browser console (F12) for red lines starting with "WoDX", then tell Claude you're done.

## Gate result

- [ ] The migration, a timed effect, the conditions, Dazed and a Group all work end to end in rothenstein-wodx, and the original world still opens.
