# Encyclopaedia Tenebrarum: first edition brief

The format and its checks are in the repo (main 10ab6d7 or later): `modules/wodx-library/scripts/ency-rules.mjs` (read its header comment) and `tools/encyclopedia-check.mjs`.

## What to write

One file per book, `modules/wodx-library/data/encyclopedia/<book-id>.json`, an array of entries. List each file in `index.json` under `files`, and each book under `books` as `{"id", "title", "short", "edition"}`.

First edition: the basis core book of each line, from the OCR texts in wodx-repo\tools-env\text. V20 edition where it exists, else Revised or 2nd. Never 5th edition or Chronicles of Darkness. Aim for these, skipping any whose text is missing (say which):

V20, V20 Dark Ages, W20, Werewolf: The Dark Ages, M20, Dark Ages: Mage, Wraith 20th, Wraith: The Great War, Dark Ages: Wraith, C20, Dark Ages: Fae, Hunter: The Reckoning, Hunters Hunted II, Dark Ages: Inquisitor, Mummy 2nd, Demon: The Fallen, Kindred of the East, Victorian Age: Vampire, Orpheus, the Sorcerer's Crusade.

About 40 to 80 entries a book: the sects, clans or tribes or traditions, the main places, the named figures, the key terms, the main events of the setting's history, and the core rules a Storyteller looks up.

## Rules for every entry

- WoDX's own words. Summarise, never paraphrase sentence by sentence. The overlap check refuses any run of eight words shared with the book text.
- Every claim has a tier: `stated` (the book says it), `implied` (the book points to it), `reading` (WoDX's reading where the book is silent; use sparingly).
- Every claim has at least one ref: `{"book", "page", "pdf"}`. `page` is the printed page; add `pdf` when the pdf page differs.
- They/them unless the character's gender is known from the book; then set `"gender"` on the entry.
- Each claim says something about the world or the rules, never where the book puts it ("covered in Chapter Six"); the page reference already says where. The check refuses "the book", "chapter", "section" and "sidebar" in claims.
- No em-dashes. No decision numbers, phase names or notes about the project in the text.
- `lines`: e.g. `["vampire"]`; `eras`: era ids from wodx-chronicle/data/eras.json.
- `see`: ids of other entries that exist. Shared ideas (the Umbra, the Shroud) get one entry, cited from each book.

## Checks before handing back

1. `node tools/encyclopedia-check.mjs --text <wodx-repo\tools-env\text>`: 0 problems.
2. `node tools/encyclopedia-check.mjs --sample 3`: open five of those pages in the books and confirm the page numbers.
3. `cd tools/harness && node --test *.test.mjs`: all pass.

Commit on a branch, push, and report the branch, entry count per book and the check results.
