/**
 * WoDX Library: what a made supernatural item does when used (B3690-B3692). Pure rules, no Foundry calls; the Foundry
 * side is scripts/wonder-use.mjs and the Use window (use.mjs) shows one button per power.
 *
 * Ben's Item Crafting Desk (2026-11-13, g2): powers become Use buttons, charges and pools are counted, drawbacks apply
 * on their own, each with a card and Undo. Every line's kit fills the same flag, so a Thaumaturge's vitae bauble, a
 * Treasure, a Mummy's amulet, a Fallen's enchanted object and a Mage's Wonder all behave alike.
 *
 * The flag, flags["wodx-library"].wonder (the registry's kits add these beside key, line, kind, maker, ref):
 *   pool: {label, value, max}          what the item holds (blood points, Glamour, Faith, Sekhem, Quintessence)
 *   uses: {value, max}                 charges for the whole item; at 0 the item is spent
 *   oneUse: true                       spent after any power runs (charms, talens, a Splinter Servant)
 *   spent: true                        set by WoDX when it has nothing left
 *   used: {powerId: n}                 how often a power with its own `uses` has run
 *   worn: [{attr, value, label}]       Attribute bonuses while the item is equipped (the system's bonuslist)
 *   powers: [power]
 * A power: {id, label, text,
 *   roll?: {attr, ability, diff} | {dice, diff} | {path: "actor:<dot path>", diff, label},
 *   spend?: {pool: "item" | "actor:<dot path>", amount},
 *   drawback?: {path, amount, label, max}        added to the user's actor (Paradox, Torment), capped (20 default)
 *   transfer?: {from, to, amount, need?: {path, min}}  from/to: "item" or "actor:<dot path>"
 *   uses?: n (this power's own limit), gm?: true (only the Storyteller runs it), consume?: true (spends the item)}
 * A transfer power gets a reverse button of its own (`<id>~back`) when `back` is set: {label}.
 */

export const FLAG = "wonder";
const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const ITEM_POOL = "flags.wodx-library.wonder.pool.value";

/** Where a reference points: {on: "item"|"actor", path}. */
export function refOf(ref = "") {
  const s = String(ref ?? "");
  if ( s === "item" || s === "" ) return {on: "item", path: ITEM_POOL};
  if ( s.startsWith("actor:") ) return {on: "actor", path: s.slice(6)};
  return {on: "actor", path: s};
}
const keyOf = r => `${r.on}:${r.path}`;

/** The item's pool, cleaned. */
export function poolOf(flag = {}) {
  const p = flag?.pool;
  if ( !p ) return null;
  return {label: String(p.label ?? "points"), value: Math.max(0, n(p.value)), max: Math.max(0, n(p.max ?? p.value))};
}

/** Every power, with reverse buttons for transfers that have one. */
export function powersOf(flag = {}) {
  const out = [];
  for ( const p of flag?.powers ?? [] ) {
    if ( !p?.id ) continue;
    out.push(p);
    if ( p.transfer && p.back ) out.push({...p, id: `${p.id}~back`, label: p.back.label ?? `Put back: ${p.label}`, text: p.back.text ?? "",
      transfer: {...p.transfer, from: p.transfer.to, to: p.transfer.from}, back: null, reverseOf: p.id});
  }
  return out;
}

export const powerOf = (flag, id) => powersOf(flag).find(p => p.id === id) ?? null;

/** The actor paths a power reads (Storyteller-free: the Foundry side fills values from these). */
export function pathsOf(power = {}) {
  const out = new Set();
  const add = ref => { const r = refOf(ref); if ( r.on === "actor" ) out.add(r.path); };
  if ( power.spend ) add(power.spend.pool);
  if ( power.transfer ) { add(power.transfer.from); add(power.transfer.to); if ( power.transfer.need ) out.add(power.transfer.need.path); }
  if ( power.drawback ) out.add(power.drawback.path);
  if ( power.roll?.path ) add(power.roll.path);
  return [...out];
}

/** Read a value: values is {"item:<path>": n, "actor:<path>": n}. */
const read = (values, ref) => n(values?.[keyOf(refOf(ref))]);

/**
 * Why the power can't run now; empty when it can.
 * ctx: {flag, values, isGM}
 */
export function blockersOf(power, {flag = {}, values = {}, isGM = false} = {}) {
  const out = [];
  if ( !power ) return ["no such power"];
  if ( flag?.spent ) out.push("it has nothing left in it");
  if ( power.gm && !isGM ) out.push("only the Storyteller sets this off");
  const pool = poolOf(flag);
  if ( power.spend ) {
    const have = read(values, power.spend.pool);
    if ( have < n(power.spend.amount) ) out.push(`needs ${n(power.spend.amount)} ${refOf(power.spend.pool).on === "item" ? (pool?.label ?? "points") : "points"}, has ${have}`);
  }
  if ( power.uses && n(flag?.used?.[power.id]) >= n(power.uses) ) out.push("this power is used up");
  if ( flag?.uses && n(flag.uses.value) <= 0 ) out.push("no charges left");
  if ( power.transfer ) {
    const t = power.transfer, have = read(values, t.from);
    if ( have <= 0 ) out.push("there is nothing to draw");
    if ( t.need && read(values, `actor:${t.need.path}`) < n(t.need.min) ) out.push(t.need.label ?? `needs ${t.need.path.split(".").slice(-2, -1)[0] ?? "it"} ${n(t.need.min)} or more`);
    const toR = refOf(t.to);
    if ( toR.on === "item" && pool && pool.value >= pool.max ) out.push(`the ${pool.label} is full`);
  }
  return out;
}

/** V20 dice: successes at or over the difficulty, each 1 takes one away; no successes and a 1 is a botch. */
export function countSuccesses(faces = [], diff = 6) {
  const d = Math.max(2, Math.min(10, Math.round(n(diff) || 6)));
  let hits = 0, ones = 0;
  for ( const f of faces ) { if ( f === 1 ) ones++; else if ( f >= d ) hits++; }
  const successes = Math.max(0, hits - ones);
  return {successes, botch: hits === 0 && ones > 0, ones, diff: d};
}

/**
 * What running the power changes. values: current numbers; roll: {successes, botch} when the power rolled.
 * Returns {item: {path: v}, actor: {path: v}, undo: {item, actor}, lines, spent, failed}.
 * A failed roll still pays what the power spends (the attempt was made); a botch spends and says so.
 */
export function plan(power, {flag = {}, values = {}, roll = null, max = {}} = {}) {
  const item = {}, actor = {}, undoItem = {}, undoActor = {}, lines = [];
  const set = (ref, v) => {
    const r = refOf(ref), k = keyOf(r);
    const before = n(values[k]);
    if ( r.on === "item" ) { if ( !(r.path in undoItem) ) undoItem[r.path] = before; item[r.path] = v; }
    else { if ( !(r.path in undoActor) ) undoActor[r.path] = before; actor[r.path] = v; }
    values = {...values, [k]: v};
  };
  const failed = !!roll && (roll.botch || n(roll.successes) <= 0);
  if ( roll ) lines.push(roll.botch ? "A botch." : failed ? "No successes." : `${n(roll.successes)} success${n(roll.successes) === 1 ? "" : "es"}.`);
  if ( power.spend && n(power.spend.amount) ) {
    const from = read(values, power.spend.pool);
    set(power.spend.pool, Math.max(0, from - n(power.spend.amount)));
    const pool = poolOf(flag);
    lines.push(`${n(power.spend.amount)} ${refOf(power.spend.pool).on === "item" ? (pool?.label ?? "points") : "points"} spent.`);
  }
  if ( power.transfer && !failed ) {
    const t = power.transfer, have = read(values, t.from);
    const toR = refOf(t.to), pool = poolOf(flag);
    const room = toR.on === "item" && pool ? Math.max(0, pool.max - read(values, t.to)) : (n(max[toR.path]) ? Math.max(0, n(max[toR.path]) - read(values, t.to)) : Infinity);
    const amt = Math.max(0, Math.min(have, n(t.amount) || have, room));
    if ( amt > 0 ) {
      set(t.from, have - amt);
      set(t.to, read(values, t.to) + amt);
      lines.push(`${amt} moved ${refOf(t.from).on === "item" ? "out of the item" : "into the item"}.`);
    } else lines.push("Nothing moved.");
  }
  if ( power.drawback && n(power.drawback.amount) ) {
    const d = power.drawback, cap = n(d.max) || 20;
    const from = read(values, `actor:${d.path}`);
    set(`actor:${d.path}`, Math.min(cap, from + n(d.amount)));
    lines.push(d.label ?? `${n(d.amount)} added to ${d.path}.`);
  }
  if ( power.uses ) {
    const used = n(flag?.used?.[power.id]);
    const p = `flags.wodx-library.wonder.used.${power.id}`;
    undoItem[p] = used; item[p] = used + 1;
    const left = n(power.uses) - used - 1;
    lines.push(left > 0 ? `${left} use${left === 1 ? "" : "s"} of this left.` : "That was its last use of this.");
  }
  let spent = false;
  if ( flag?.uses ) {
    const left = Math.max(0, n(flag.uses.value) - 1);
    undoItem["flags.wodx-library.wonder.uses.value"] = n(flag.uses.value);
    item["flags.wodx-library.wonder.uses.value"] = left;
    if ( left <= 0 ) spent = true;
    else lines.push(`${left} charge${left === 1 ? "" : "s"} left.`);
  }
  if ( flag?.oneUse || power.consume ) spent = true;
  const pool = poolOf(flag);
  if ( pool && flag?.emptySpent && n(values[keyOf(refOf("item"))]) <= 0 ) spent = true;
  if ( spent ) {
    undoItem["flags.wodx-library.wonder.spent"] = !!flag?.spent;
    item["flags.wodx-library.wonder.spent"] = true;
    lines.push(flag?.spentText ?? "It is spent.");
  }
  return {item, actor, undo: {item: undoItem, actor: undoActor}, lines, spent, failed};
}

/** The item update that sets its pool, clamped to 0..max (for charging a periapt at a node and the like). */
export function setPool(flag = {}, value = 0) {
  const pool = poolOf(flag);
  if ( !pool ) return {};
  return {[ITEM_POOL]: Math.max(0, Math.min(pool.max, Math.round(n(value))))};
}

/**
 * The system's own bonuslist for Attribute bonuses while worn (the worldofdarkness system adds active
 * attribute_buff entries to the Attribute's total). equipped: whether the item is on.
 */
export function wornList(flag = {}, equipped = false, list = []) {
  const keep = (Array.isArray(list) ? list : []).filter(b => !b?.wodxWorn);
  const add = (flag?.worn ?? []).map(w => ({name: w.label ?? `${flag?.name ?? "Worn"}: ${w.attr}`, settingtype: String(w.attr), type: "attribute_buff",
    value: n(w.value), isactive: !!equipped && !flag?.spent, wodxWorn: true}));
  return [...keep, ...add];
}

/** One line for the Use window. */
export function summary(flag = {}) {
  const bits = [];
  const pool = poolOf(flag);
  if ( pool ) bits.push(`${pool.value} of ${pool.max} ${pool.label}`);
  if ( flag?.uses ) bits.push(`${n(flag.uses.value)} of ${n(flag.uses.max ?? flag.uses.value)} charges`);
  if ( flag?.worn?.length ) bits.push(`while worn: ${flag.worn.map(w => `+${n(w.value)} ${w.attr}`).join(", ")}`);
  if ( flag?.spent ) bits.push("spent");
  return bits.join("; ");
}
