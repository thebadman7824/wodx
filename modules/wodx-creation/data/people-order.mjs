/**
 * How a people's names are put together: who puts the family name first, and the Haudenosaunee clan. A small file of
 * its own so WoDX NPC can read it without loading the name lists, which load on first use (B6242).
 */
export const FAMILY_FIRST = new Set(["chinese", "japanese", "korean", "vietnamese", "hungarian", "khmer"]);
/** A Haudenosaunee family name: the clan, passed from the mother (B3120). */
export const CLAN = /^of the (.+) clan$/;
