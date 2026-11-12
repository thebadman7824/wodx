/**
 * WoDX Library 0.14.0: the look of a character, read off their sheet (look-rules.mjs has the rules).
 * api.look.of(actor) -> the reading; api.look.station(actor) -> an NPC's own station; api.look.rules.
 * Nothing is stored here: WoDX NPC reads it at a meeting, WoDX Chronicle's "Only when" tests read it for talk lines.
 */
import * as L from "./look-rules.mjs";
import * as X from "./examine-rules.mjs";

const MOD = "wodx-library";
let G = null;
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const chron = () => game.modules.get("wodx-chronicle")?.api;
const yearNow = () => { try { return chron()?.eras?.currentYear?.() ?? null; } catch (e) { return null; } };
const eraNow = () => { try { return chron()?.eras?.activeEra?.()?.profile?.id ?? null; } catch (e) { return null; } };

export async function setupLook() { if ( !G ) G = await import("../data/goods.mjs"); }

function goodOf(item) {
  if ( !G ) return null;
  const id = item?.flags?.[MOD]?.good;
  return (id && G.GOODS.find(g => g.id === id)) || X.goodOf(item?.name, G.GOODS);
}
const wornOf = i => !!(i?.system?.isequipped || i?.system?.isactive);
const featureNamed = (a, re) => [...(a?.items ?? [])].find(i => i.type === "Feature" && re.test(i.name ?? ""));

/** One item as the rules read it. */
function itemView(i, era, year) {
  const g = goodOf(i);
  const tier = g ? (era && g.values?.[era] !== undefined ? g.values[era] : (Number.isFinite(year) && G.valueAt ? G.valueAt(g, year) : g.value)) : 0;
  const st = i.flags?.["wodx-storyteller"] ?? {};
  const look = i.flags?.[MOD]?.look ?? {};
  return {name: i.name, worn: wornOf(i), kind: g?.kind ?? (/armou?r/i.test(i.type ?? "") ? "cloth" : null), from: g?.from, to: g?.to,
    conceal: g?.conceal ?? (i.type === "Melee Weapon" || i.type === "Ranged Weapon" ? "J" : null), tier: num(tier),
    quality: st.quality ?? i.flags?.[MOD]?.examine?.quality ?? null, examine: i.flags?.[MOD]?.examine ?? {},
    dressedAs: look.dressedAs ?? null};
}

/** The view the rules take for one actor. */
export function viewOf(actor) {
  const a = actor?.actor ?? actor;
  if ( !a ) return null;
  const era = eraNow(), year = Number(yearNow());
  const ap = a.system?.attributes?.appearance;
  const appearance = ap && typeof ap === "object" ? num(ap.total ?? ap.value) : null;
  const statusFeat = featureNamed(a, /^status\b/i);
  const status = statusFeat ? num(statusFeat.system?.value) : num(a.system?.backgrounds?.status?.value);
  const conds = [...(a.statuses ?? [])].map(s => String(s).replace(/^wodx-/, ""));
  try { for ( const c of chron()?.conditions?.conditionsOf?.(a) ?? [] ) conds.push(String(c?.id ?? c)); } catch (e) { /* none */ }
  let wounds = 0;
  try {
    const ct = game.modules.get("wodx-combat")?.api?.corpusTrack?.(a);
    const d = ct?.damage ?? a.system?.health?.damage ?? {};
    wounds = num(d.bashing) + num(d.lethal) + num(d.aggravated);
  } catch (e) { wounds = 0; }
  const weaponOut = [...(a.items ?? [])].some(i => (i.type === "Melee Weapon" || i.type === "Ranged Weapon") && i.system?.isequipped && !i.system?.isnatural);
  let monstrous = false;
  try { monstrous = !!chron()?.traits?.has?.(a, "monstrous"); } catch (e) { monstrous = false; }
  return {items: [...(a.items ?? [])].map(i => itemView(i, era, year)), year: Number.isFinite(year) ? year : null, appearance, status,
    conditions: conds, wounds, weaponOut, monstrous};
}

/** The look of a character now. */
export function of(actor) { const v = viewOf(actor); return v ? L.lookOf(v) : null; }

/** An NPC's own station: worn dress, else Resources, else template (WoDX NPC's saved profile), else 1. */
export function station(actor, template = null) {
  const a = actor?.actor ?? actor;
  if ( !a ) return null;
  const v = viewOf(a);
  const res = featureNamed(a, /^(resources|wealth)\b/i);
  const resources = res ? num(res.system?.value) : num(a.system?.backgrounds?.resources?.value);
  return L.npcStation({wornStation: v ? L.stationOf(v.items) : null, resources, template});
}

export const api = () => ({of, viewOf, station, seed: L.lookSeed, scene: L.sceneStep, line: L.readLine, dressedVs: L.dressedVs, asSeen: L.asSeen, rules: L});
