# Tools

- `ldb-check.mjs`: opens every LevelDB store in a world folder (`data/*` and `packs/*`), parses each record as JSON and prints counts by document type. Needs `npm install classic-level@1.4.1`. Run it on a copy, never on a live world: opening a store compacts it.
  `node ldb-check.mjs <world-folder>`
