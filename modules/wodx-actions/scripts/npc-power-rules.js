/**
 * What a power is for, read from its effect keywords, so an NPC can choose one by itself (B4926). Pure.
 */

/** Each keyword's use. A power may have several. */
export const USE_OF = {
  harm: "attack", fear: "attack", trip: "attack",
  bind: "hold", hold: "hold", possess: "hold", sway: "hold",
  mend: "heal",
  ward: "guard",
  veil: "escape", move: "escape", sideways: "escape",
  summon: "call",
  boost: "boost", hasten: "boost", fortune: "boost", shape: "boost"
};

/** Keywords a mortal onlooker could not miss: the NPC holds these back while mortals watch (B4927). */
export const OBVIOUS = new Set(["harm", "shape", "summon", "manifest", "light", "weather", "place", "make", "rise", "trip", "fear"]);

/** The uses of a power and whether it shows. */
export function tagsOf(keywords = []) {
  const uses = [...new Set(keywords.map(k => USE_OF[k]).filter(Boolean))];
  return {uses, obvious: keywords.some(k => OBVIOUS.has(k))};
}
