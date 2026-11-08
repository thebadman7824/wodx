/**
 * WoDX Sheets — what each book's character sheet holds, in its order (pure; the harness tests it).
 * A row is [label, key]: a key the system keeps on every actor (system.abilities.<key>), or {second: group} for an
 * Ability the system does not have, kept as a secondary-ability Trait item of that group (talent, skill, knowledge).
 */

const S = group => ({ second: group });

/** Dark Ages: Fae, the character sheet (pdf pp. 224–225). */
export const FAE_DA = {
  book: "Dark Ages: Fae",
  header: [["Court", "court"], ["Origin", "origin"], ["Agenda", "agenda"]],
  abilities: {
    talents: [["Alertness", "alertness"], ["Athletics", "athletics"], ["Brawl", "brawl"], ["Dodge", "dodge"], ["Expression", "expression"],
      ["Intimidation", "intimidation"], ["Kenning", "kenning"], ["Leadership", "leadership"], ["Legerdemain", S("talent")], ["Subterfuge", "subterfuge"]],
    skills: [["Animal Ken", "animalken"], ["Archery", S("skill")], ["Commerce", S("skill")], ["Crafts", "craft"], ["Etiquette", "etiquette"],
      ["Melee", "melee"], ["Performance", "performance"], ["Ride", S("skill")], ["Stealth", "stealth"], ["Survival", "survival"]],
    knowledges: [["Enigmas", "enigmas"], ["Gramarye", "gremayre"], ["Hearth Wisdom", S("knowledge")], ["Investigation", "investigation"], ["Law", "law"],
      ["Linguistics", "linguistics"], ["Medicine", "medicine"], ["Occult", "occult"], ["Politics", "politics"], ["Seneschal", S("knowledge")]]
  },
  dominions: [["Day", "day"], ["Dawn", "dawn"], ["Dusk", "dusk"], ["Night", "night"]],
  page2: ["oaths", "echoes", "features"]
};

const norm = s => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "");

/**
 * The rows of a sheet's Abilities for an actor: [{label, key, id, value, secondary, missing, group}].
 * flat: actor.system.abilities; items: [{id, name, type, system}] (secondary-ability Traits).
 */
export function abilityRows(def, flat = {}, items = []) {
  const out = {};
  for (const [col, rows] of Object.entries(def.abilities)) {
    out[col] = rows.map(([label, key]) => {
      if (typeof key === "string") return { label, key, id: key, value: Number(flat?.[key]?.value) || 0, secondary: false, missing: !flat?.[key] };
      const it = items.find(i => i.type === "Trait" && /secondability$/.test(i.system?.type ?? "") && norm(i.name) === norm(label));
      return { label, key: norm(label), id: it?.id ?? it?._id ?? null, value: Number(it?.system?.value) || 0, secondary: true, missing: !it, group: key.second };
    });
  }
  return out;
}

/** Dots and boxes for a permanent/temporary trait of 10: [{i, dot, box}]. */
export function track(perm = 0, temp = 0, max = 10) {
  return Array.from({ length: max }, (_, k) => ({ i: k + 1, dot: k < Number(perm), box: k < Number(temp) }));
}
/** Five dots for a rating. */
export const dots = (v, max = 5) => Array.from({ length: max }, (_, k) => ({ i: k + 1, on: k < Number(v) }));
/** Click on dot i of value v: the same dot again lowers by one (the system's own habit). */
export const clickValue = (v, i) => (Number(v) === Number(i) ? Number(i) - 1 : Number(i));
