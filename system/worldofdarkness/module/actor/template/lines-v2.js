/**
 * WoDX fork (B6112): the actor types whose line sheet runs on ApplicationV2 (LegacyActorSheetV2) instead of the old
 * sheet engine. Lines move one at a time; each line added here is gated on the testbed before it merges. WoDX Sheets
 * reads the same list, so its sheet for a line follows the system's.
 * To move a line back to the old engine, take its type out of this list.
 */
export const LINES_V2 = new Set(["Mummy", "Mortal", "Vampire"]);

/** Is this actor type's line sheet on ApplicationV2? */
export const onV2 = type => LINES_V2.has(type);
