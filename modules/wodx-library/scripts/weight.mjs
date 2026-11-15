/**
 * WoDX Library: weights on the Foundry side (B6080 to B6089). Rules in weight-rules.mjs.
 *
 * api.weight: {rules, yearNow, itemKg(item), actorKg(actor), linesKg(lines), viewOf(item), words(kg)}. WoDX
 * Interactables reads it for what a container, a pile of loose gear and a body weigh; WoDX Combat reads it for a
 * swimmer's load. Each takes an optional year (the chronicle's year by default).
 */
import * as W from "./weight-rules.mjs";

const MOD = "wodx-library";
let goodsBy = null, plurals = {}, gearBy = null;

export const yearNow = () => {
  try { const y = game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.(); return Number.isFinite(Number(y)) ? Number(y) : 0; } catch (e) { return 0; }
};

/** Load the goods and the gear by name, once. */
export async function loadTables() {
  if ( goodsBy && gearBy ) return;
  goodsBy = new Map(); gearBy = new Map(); plurals = {};
  try {
    const m = await import("../data/goods.mjs");
    for ( const g of m.GOODS ?? [] ) {
      const t = {name: g.name, kind: g.kind, conceal: g.conceal};
      for ( const n of [g.name, g.was, g.former].filter(Boolean) ) if ( !goodsBy.has(n.toLowerCase()) ) goodsBy.set(n.toLowerCase(), t);
      if ( g.stack?.plural ) plurals[g.stack.plural] = g.name;
    }
  } catch (e) { console.warn(`${MOD} | weights: goods did not load`, e); }
  try {
    const r = await fetch(`modules/${MOD}/data/gear.json`);
    const d = r.ok ? await r.json() : {items: []};
    for ( const i of d.items ?? [] ) {
      const k = i.name.toLowerCase();
      if ( !gearBy.has(k) ) gearBy.set(k, {name: i.name, type: i.type, kind: i.flags?.[MOD]?.kind, conceal: i.system?.conceal, soak: i.system?.soak?.lethal});
    }
  } catch (e) { console.warn(`${MOD} | weights: gear did not load`, e); }
}

/** What an item is, as weight-rules reads it. */
export function viewOf(item) {
  if ( !item ) return null;
  const f = item.flags?.[MOD] ?? {}, s = item.system ?? {};
  const known = gearBy?.get(String(item.name ?? "").toLowerCase()) ?? goodsBy?.get(String(item.name ?? "").replace(/\s*\(\d+\)$/, "").toLowerCase()) ?? null;
  const kind = f.kind ?? f.category ?? known?.kind ?? "";
  const count = Number(/\((\d+)\)\s*$/.exec(String(item.name ?? ""))?.[1]) || Number(s.quantity) || 1;
  // Installed cyberware is part of the body (its equipped box ticked, B6080)
  const cyberOn = !!f.installed || (/cyber|implant|bioware/.test(String(kind)) && !!s.isequipped);
  return {name: String(item.name ?? "").replace(/\s*\(\d+\)$/, ""), type: item.type, kind, conceal: s.conceal ?? known?.conceal ?? "",
    soak: s.soak?.lethal ?? known?.soak ?? 0, own: f.kg, installed: cyberOn,
    natural: !!s.isnatural, worn: item.type === "Armor" && !!s.isequipped, count};
}

/** What one item weighs, in kg (all of a counted stack). */
export const itemKg = (item, year = yearNow()) => { const v = viewOf(item); return v ? W.kgOf(v, year).kg * Math.max(1, v.count) : 0; };

/** What a character carries: {kg, worn, carried, rows}. */
export function actorKg(actor, year = yearNow()) {
  const items = [...(actor?.items ?? [])].map(viewOf).filter(Boolean);
  return W.itemsKg(items, year);
}

/** What a container's lines weigh: {kg, rows}. Lines are names, "name (3)", or links to items. */
export function linesKg(lines = [], year = yearNow()) {
  const lookup = name => {
    const n = String(name ?? "").trim();
    if ( /^(Compendium|Item|Actor)\./.test(n) ) {
      let it = null;
      try { it = fromUuidSync(n); } catch (e) { it = null; }
      if ( !it ) return null;
      return it.documentName === "Item" ? viewOf(it) : (gearBy?.get(String(it.name ?? "").toLowerCase()) ?? {name: it.name, type: it.type});
    }
    return gearBy?.get(n.toLowerCase()) ?? goodsBy?.get(n.toLowerCase()) ?? null;
  };
  return W.linesKg(Array.isArray(lines) ? lines : String(lines ?? "").split(/\r?\n/), {lookup, plurals, year});
}

export async function setupWeight() {
  await loadTables();
  return {rules: W, yearNow, itemKg, actorKg, linesKg, viewOf, words: W.kgWords, ready: true};
}
