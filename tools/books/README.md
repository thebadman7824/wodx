# Book text tools

`books.mjs` lets a cloud thread read book pages and run the 8-word overlap check (rule 5) itself, against the OCR and
text-layer texts. Decision B3085.

The texts are Ben's own extracted copies of his books. They live on the PC in `wodx-repo\tools-env\text` and are
copied to the project files folder, `/mnt/project-files/book-text/`, one file per book. They never go into this
repository (it is public), and nothing from them is pasted into WoDX: page refs and own words only.

    node tools/books/books.mjs list --grep v20
    node tools/books/books.mjs page v20 266 --around 1
    node tools/books/books.mjs page v20 264 --offset 2          printed page 264 when pdf = printed + 2
    node tools/books/books.mjs find "blood bond" --book v20
    node tools/books/books.mjs overlap modules/wodx-npc docs/research
    node tools/books/books.mjs overlap modules --max 500 > /tmp/hits.txt
    node tools/books/books.mjs pack <folder>                     one <id>.txt per page folder, with "=== pNNNN" markers

One file per book (B3950). The shared folder holds at most 50,000 files, so it keeps each book as one
`<batch>/<id>.txt`, its pages marked by `=== pNNNN` lines, plus the optional `<id>.toc.txt` contents list. Page refs
stay exact: `page`, `find` and `overlap` read the markers and report the same pdf page numbers. The one-file-per-page
folders (`<id>/pNNNN.txt`) stay on the PC in tools-env\text, where OCR writes them; run `pack` on a batch before copying
it, and copy only the `.txt` files at the batch's top level.

`overlap` exits 1 when a WoDX file shares a run of 8 words with a book, and prints file, line, the words and the
book's pdf page. It reads the WoDX files first and then walks each book once, so a check of the whole modules folder
against every book takes a minute or two rather than needing the PC. On the PC the same tool runs with
`--text <wodx-repo>\tools-env\text`.

## Keeping the copy current (PC job)

A PC job packs each batch (`node tools/books/books.mjs pack <batch folder>`), zips the `<id>.txt` and `<id>.toc.txt` files of the batches changed since the last copy (never the page folders), hands the zips to a cloud session and unpacks them into
`/mnt/project-files/book-text/`. The job file is `/mnt/project-files/jobs/book-text-sync-2026-11-13.md`; run it again
after each OCR batch. `/mnt/project-files/book-text/SYNCED.md` says when each batch was last copied.
