# Quality gate: error and bug check

**Rules (Ben):** B8 (2026-11-06): every phase completion and every major version change gets a thorough error and bug check before it is called done. A major version change means a new major or minor version of Foundry core, of the upstream `worldofdarkness` system, or of any WoDX module.

B17 (2026-11-07): every WoDX window and dialog scrolls, and is laid out so that all its options can be reached and its main buttons stay visible.

B24 (2026-11-07): every WoDX menu that lets you pick entries (a dropdown, a list of checkboxes, a table of rows with buttons) has a search box that filters it as you type. The only exceptions are fixed short choices that never grow, such as the months or Line or Veil; they carry `data-fixed`.

Nothing ships while an item below fails. Each problem found is fixed and the check is run again. The results go in BUILD-LOG.md under the phase.

## 1. Automatic checks (`tools/quality-check.sh`)

- [ ] Every `.js` and `.mjs` file parses (`node --check`).
- [ ] Every JSON file parses; every `module.json` has an id, version, compatibility and existing script paths.
- [ ] Unit tests pass (`node --test`).
- [ ] The script lists every call that writes or deletes documents, settings or files, for review in step 2.

- [ ] UI fit (rule B17): `tools/harness/ui-fit.mjs` renders every WoDX window and dialog with Foundry's own stylesheet in Chromium, at 1280×720, 1366×768 and 1920×1080. Every control must be reachable by scrolling, and footer buttons (Save, OK) must be visible without scrolling.

## 2. Review

- [ ] Every Foundry API the code uses is checked against the installed Foundry source (`resources/app/client`), not from memory.
- [ ] Every upstream system API is checked against the installed system source.
- [ ] Each write or delete in the list from step 1 is safe: GM-only where it must be, guarded, and never destroys data without a confirmation.
- [ ] Setting registrations happen synchronously in `init`; nothing reads a setting before it is registered.
- [ ] Player-to-GM actions work when no GM is online (a clear message, no error).
- [ ] The diff since the last gate has been read in full.
- [ ] Every list a person picks from has a search box (rule B24): `searchBox()` from `wodx-chronicle/scripts/search.mjs`. The UI fit check fails a dropdown of more than five entries, or a pickable list or table of more than five rows, that has no search box over it.
- [ ] Every new window or dialog follows the layout rule (B17): a fixed top, one scrolling middle (`.wodx-scroll`), a fixed footer (`.wodx-footer`). It opens sized to the screen, and dialogs carry the `wodx-dialog` class.

## 3. Install and smoke test

- [ ] Backups first: the worlds touched and the packages replaced, in `FoundryVTT\Backups\wodx-<phase>`.
- [ ] Foundry restarted; every WoDX world opens.
- [ ] The phase's own gate test passes (see the roadmap).
- [ ] Each new window is opened once in Foundry at the screen size Ben plays on, scrolled to the bottom, and its buttons pressed.
- [ ] The browser console (F12) shows no errors from WoDX packages.

## 4. Logs

- [ ] Foundry's `Logs\error.<date>.log` and `debug.<date>.log` are read after the smoke test; every new error is explained or fixed.

## 5. Record

- [ ] BUILD-LOG.md lists what was checked, what was found, what was fixed, and anything left open with a reason.

## The look review (from Phase 6e)
- Run ui-fit.mjs with an output folder for each kit that changed (WODX_KIT=dark-ages, victorian, great-war, modern...), and with WODX_SCALE=1.5 once: every window must pass at the three sizes.
- Run look.mjs on that folder and look at the sheets: the three menus and the chat cards per kit, and the cards across the kits. Check the titles, the accents, the pips and the footers read clearly.
- phase6e.test.mjs checks the contrast of every kit and accent; a new kit or accent must pass it.
