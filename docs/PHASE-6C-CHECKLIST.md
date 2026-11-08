# Phase 6c checklist: mortals, hunters with True Faith, and wraiths

Batch 1, second half (B38). Rules basis:

- Hunters follow the era (B42): Dark Ages: Inquisitor in the Dark Ages, with V20 Dark Ages' True Faith; The Hunters Hunted II from the Renaissance to 1998; Hunter: The Reckoning from 1999.
- Wraiths use Wraith 20th in every era (B43).
- The Shadow is played by another player or the Storyteller (B44).
- Numina, hedge magic and V20 ghouls follow B45 and B49.
- Every card carries its page reference; no book text is copied. In-game text is gender-neutral (B48).

## Done by Claude (2026-11-08)

- [x] **Research**, as mechanics notes with pages (`docs/research/6c-notes.md`):
  - Wraith 20th.
  - True Faith (V20 Dark Ages).
  - The Hunters Hunted II.
  - Dark Ages: Inquisitor, Sorcerer (Revised), Hunter: The Reckoning and V20 Ghouls and Revenants. These were OCR'd on Ben's PC (B37's go-ahead; a uv environment in `wodx-repo/tools-env`).
- [x] **Data** (WoDX Actions `data/`):
  - `arcanoi-w20.json`: 160 arts, each with its cost, pool, difficulty code and page.
  - `wraith-w20.json`: Thorns, the Shroud, Corpus, healing, fire, falling and creation.
  - The hunter, edge and hedge-magic tables live in the rules files.
- [x] **WoDX Actions 3.4.0**, wraiths (`wraith.js`, `wraith-rules.js`):
  - Use an Arcanos. The arts follow the sheet's ratings. The difficulty comes from the target, from the local Shroud (WoDX Otherworlds, with Hysteria) or from the realm. Pathos, Corpus and Willpower are paid. Outrage and Pandemonium give the Shadow Angst by realm.
  - Passions (once a scene, secondhand at 8), neglect and Resolution. Fetters (a scene, Slumber), neglect and loss. Memoriam once a session.
  - Heal Corpus with Pathos, with rest, or for aggravated damage (3 Pathos and 8 hours).
  - The Shadow:
    - The Storyteller assigns a Shadowguide.
    - A private whisper channel between the Shadow and the wraith.
    - Starting Angst, Catharsis, Shadow Dice, Dark Passions, and the Thorns with their costs.
  - Harrowings: the escape roll, Eidolon, Willpower, and what is lost.
  - Automatic prompts: the last Willpower spent, a Passion or Fetter at 0, and a Corpus wavering or torn apart.
  - The Caul (one's own, or a Reaper's help). Hysteria (GM). End of scene resets the Passions and Hysteria.
- [x] **WoDX Actions 3.4.0**, hunters and the faithful (`hunter.js`, `hunter-rules.js`, `reckoning.js`, `reckoning-rules.js`):
  - Inquisitors (Dark Ages):
    - Order, Superior Virtues and stage.
    - Piety and the Hierarchy of Sins against God.
    - Conviction: spent, risked once a scene, won by victory, prayer (never above Piety), relics and a new story; banked to buy Superior Virtues and Blessings.
    - Callousness.
    - Virtue rolls: terror, thralldom, memory and the Impulse.
  - True Faith by era: repel, resist (Dark Ages: Faith comes off the power's successes, doubled against Daimoinon), the powers by dot, and losing it.
  - Numina (The Hunters Hunted II): seven psychic and hedge paths, with pool, difficulty, Willpower and what each level does.
  - Hedge magic (Sorcerer, B49):
    - Fifteen Paths with their aspects; difficulty 4 + the highest aspect, and successes by aspect.
    - Rituals, fast casting, trading skill for power, and counterspells.
  - The imbued (Hunter: The Reckoning):
    - Creeds; second sight and self-control for a Conviction point; reacting to a warning; the Storyteller's prerogative.
    - 35 edges in seven paths, each with roll, difficulty, cost and page.
    - Risking Conviction, with the Storyteller's award of 1–3; regaining it; cashing in 10 Conviction for a Virtue.
    - Derangements at Virtue 7 and above.
    - The Imbuing (GM, 1999 on): a Hunter sheet is made from a mortal's, and the mortal sheet is kept and linked.
  - The hunter menu follows the era: Hunter traits, Blessing or Edge, and Virtue roll or second sight.
  - Ghouls outside the Dark Ages (V20 Ghouls and Revenants): overfeeding, withdrawal, and elder ghouls by day.
  - The menus have new sections:
    - Wraith: Passions and Fetters, Corpus, The Shadow.
    - Hunter.
    - Mortal: faith and the uncanny.
    - Mage: sorcery and Numina.
    - Ghoul.
- [x] **WoDX Combat 3.6.0:** a wraith's damage goes on its Corpus track (the PC's Corpus Advantage or the Wraith sheet's), with wavering and Harrowed states.
- [x] **Quality gate, automatic part:**
  - Harness: 185 tests (24 new, in `phase6c.test.mjs`).
  - UI fit passes for every window, with 24 new dialogs.
  - `quality-check.sh` passes.
- [x] **Installed** on 2026-11-08 and checked by MD5. The files replaced are in `FoundryVTT\Backups\wodx-6c-pre-deploy-20261108`. The gate script is in `Data/wodx-gate/gate6c.mjs`.
- [ ] **Still reading:** The Great War (Wraith) core, for the Great War profile (B43). It is a scan, being OCR'd on Ben's PC. Its differences go in after.

## For you

1. Setup → Backups: snapshot **rothenstein-wodx**.
2. Restart Foundry fully (the module versions are read at start-up), open rothenstein-wodx and log in as Gamemaster. Manage Modules should show WoDX Actions 3.4.0 and WoDX Combat 3.6.0.
3. **The automatic gate.** Press F12 and run `await (await import(`/wodx-gate/gate6c.mjs?${Date.now()}`)).run()`. It makes a "WoDX 6c test pack" folder and works through the steps below by itself, then saves `Data/wodx-gate/gate6c-result.json`. Tell Claude when it says "… passed".
4. **A wraith by hand.** Drag "Ada Brandt (wraith)" onto a night scene → WoDX Actions:
   - Use an Arcanos. The list has a search box, and the art's cost, roll and page show as you pick.
   - Passion, then Passion again: the second time it says the Passion was already tapped this scene. End the scene and it can be tapped again.
   - The Shadow → Catharsis (needs Angst above Willpower).
5. **The Shadowguide.** Assign the Shadowguide (GM) → pick a player. As that player, Whisper: only Ada's owner, the guide and you see it.
6. **Combat.** Attack Ada with a weapon: the damage marks the Corpus boxes on the wraith sheet, not Health. Fill the track with lethal damage and a Harrowing card appears.
7. **An inquisitor** (Dark Ages): "Brother Anselm" → Hunter traits, then Blessing or Edge, risking Conviction; then A sin (Piety) and Prayer.
8. **True Faith and Numina:** "Sister Agnes" → True Faith (repel a targeted vampire), Psychic Numina, Hedge magic (Hellfire).
9. **The Imbuing** (only from 1999). Set the Chronicle Clock to 2003 (or use a modern world). Then Mortal → The Imbuing → pick a creed, Virtues and edges. A new Hunter sheet appears, and the mortal sheet is kept.
10. Look at the console (F12) for red lines starting with "WoDX", then tell Claude you're done. Keep or delete the test pack as you like.

## Gate result

### Ben's first run, 2026-11-08: 14 of 17

- The three failures were all Sister Agnes: True Faith, Psychic Numina and Hedge magic. Each spends Willpower, and her Willpower was 0. The system's create helper resets a new sheet's permanent Willpower, and its temporary is then clamped to it. This was test data, not a rules bug. The gate now sets Willpower after creating the test actors.
- Found on the way: the wraith's "last Willpower spent" prompt fired after an Arcanos that spent no Willpower (Ada was at 0 for the same reason). It now fires only when the action spent Willpower. Fixed in `wraith.js` and installed (MD5 checked).
- To run again: press F5 in Foundry, then run the same gate command. It reuses the test pack.

### Ben's second run, 2026-11-08: 9 of 17

All eight failures were in the gate script itself, not WoDX:

- **Reusing the test pack** carried over the first run's state. Ada's Pathos was already spent. The once-a-scene uses (Passion, risking Conviction, second sight) still counted as used this scene. Greta's blood was already raised. The gate now resets the pack's resources and flags at the start, and starts a new scene for the once-a-scene rules.
- **Another module's chat messages** were taken as WoDX cards (the "d10 Roll Tracker" streak message). That shifted True Faith, Numina and Hedge magic one card each. The gate now waits for the WoDX card itself.

### Ben's third run, 2026-11-08: 17 of 17

The automatic gate passes. One item is still open: the Great War wraith profile (B43), to be added once its OCR is read.
