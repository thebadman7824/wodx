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
- [x] **Installed** on 2026-11-07. The files replaced are in `wodx-repo/backups/before-6b-3.0.1`.

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
