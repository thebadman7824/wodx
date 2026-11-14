/**
 * WoDX Actions: what each summoning power brings and the rules it lives by, read from its book page (B4820-B4829).
 * Keys are specKey(line, name). The fields are summon-rules.js's spec. Written in WoDX's words with printed pages.
 */
export const slug = s => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const specKey = (line, name) => `${slug(line)}|${slug(String(name ?? "").replace(/^[•\s]+/, ""))}`;

export const SPECS = {};
