# Quality gate: error and bug check

**Rule (Ben, 2026-11-06):** every phase completion and every major version change gets a thorough error and bug check before it is called done. A major version change means a new major or minor version of Foundry core, of the upstream `worldofdarkness` system, or of any WoDX module.

Nothing ships while an item below fails. Each problem found is fixed and the check is run again. The results go in BUILD-LOG.md under the phase.

## 1. Automatic checks (`tools/quality-check.sh`)

- [ ] Every `.js` and `.mjs` file parses (`node --check`).
- [ ] Every JSON file parses; every `module.json` has an id, version, compatibility and existing script paths.
- [ ] Unit tests pass (`node --test`).
- [ ] The script lists every call that writes or deletes documents, settings or files, for review in step 2.

## 2. Review

- [ ] Every Foundry API the code uses is checked against the installed Foundry source (`resources/app/client`), not from memory.
- [ ] Every upstream system API is checked against the installed system source.
- [ ] Each write or delete in the list from step 1 is safe: GM-only where it must be, guarded, and never destroys data without a confirmation.
- [ ] Setting registrations happen synchronously in `init`; nothing reads a setting before it is registered.
- [ ] Player-to-GM actions work when no GM is online (a clear message, no error).
- [ ] The diff since the last gate has been read in full.

## 3. Install and smoke test

- [ ] Backups first: the worlds touched and the packages replaced, in `FoundryVTT\Backups\wodx-<phase>`.
- [ ] Foundry restarted; every WoDX world opens.
- [ ] The phase's own gate test passes (see the roadmap).
- [ ] The browser console (F12) shows no errors from WoDX packages.

## 4. Logs

- [ ] Foundry's `Logs\error.<date>.log` and `debug.<date>.log` are read after the smoke test; every new error is explained or fixed.

## 5. Record

- [ ] BUILD-LOG.md lists what was checked, what was found, what was fixed, and anything left open with a reason.
