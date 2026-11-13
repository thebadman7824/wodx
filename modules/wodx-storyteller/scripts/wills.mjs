/**
 * WoDX Storyteller 0.61.0: wills, estates by the law of the place and year, and wealth held through false heirs
 * (B2773-B2775). The rules are in will-rules.mjs.
 *
 *   A will lives on the testator's sheet, flags["wodx-storyteller"].will {heirs: [{id, name, share}], note, hidden, made}.
 *   When someone dies (ledger.mjs onDeath), one approval card divides their money by the will and the law; approving
 *   it moves the money. The will's main heir is also the heir the Ledger passes open debts and oaths to.
 *   An undying owner whose will says "held through false heirs" must hide each passing: when the clock jumps, one
 *   card asks for the Intelligence + Finance rolls the gap needs.
 */
import * as WR from "./will-rules.mjs";
import {MOD, esc, chron, npc, isActiveGM} from "./core.mjs";
import * as Money from "./money.mjs";
import {getEngine} from "../../wodx-chronicle/scripts/calendar.mjs";
import {ratingsOf, ratingFrom} from "../../wodx-chronicle/scripts/when-rules.mjs";

export const T = {estate: `${MOD}.estate`, falseHeir: `${MOD}.false-heir`};
const yearAt = t => getEngine().timeToDate(Number(t) || 0).year;
const yearNow = () => yearAt(game.time.worldTime);
const homeland = () => { try { return chron()?.world?.homeland?.() ?? "moravia"; } catch (e) { return "moravia"; } };
const sphereOf = (region, year) => { try { return chron()?.world?.rules?.sphereFor?.(region, year) ?? "latin"; } catch (e) { return "latin"; } };
const diedOf = a => a?.flags?.["wodx-creation"]?.chronology?.died;
const aliveActor = id => { const a = id ? game.actors.get(id) : null; return a && (diedOf(a) === undefined || diedOf(a) === null) ? a : null; };
const undying = a => ["Vampire", "Mummy", "Wraith"].includes(a?.type) || !!a?.flags?.["wodx-creation"]?.lineage?.domitor;

export const willOf = a => WR.normWill(a?.flags?.[MOD]?.will ?? {});
export async function saveWill(a, will) {
  if ( !a || !(game.user.isGM || a.isOwner) ) return null;
  const w = WR.normWill(will);
  w.made ??= game.time.worldTime;
  await a.setFlag(MOD, "will", w);
  return w;
}
/** The will's main heir who still lives, for the Ledger's heirs. */
export function willHeir(deadId) {
  const w = willOf(game.actors.get(deadId));
  const best = [...w.heirs].filter(h => aliveActor(h.id)).sort((a, b) => b.share - a.share)[0];
  return best ? game.actors.get(best.id) : null;
}

/** The living kin the law looks at, from the Relationships tab. */
export function kinOf(dead) {
  const ties = npc()?.ties?.of?.(dead) ?? [];
  const pick = kind => ties.filter(t => t.kind === kind && aliveActor(t.to?.id)).map(t => { const a = game.actors.get(t.to.id);
    return {id: a.id, name: a.name, sex: a.flags?.["wodx-creation"]?.chronology?.sex ?? a.system?.sex ?? null, born: a.flags?.["wodx-creation"]?.chronology?.bornYear ?? null}; });
  return {spouse: pick("spouse")[0] ?? null, children: [...pick("child"), ...pick("heir")], parents: pick("parent"), siblings: pick("sibling")};
}

/** The law that holds where and when someone died. */
export function lawAt(region = homeland(), year = yearNow()) { return WR.lawFor(region, year, sphereOf(region, year)); }

/** Work out an estate: {law, shares, free, total, parts}. */
export function estateOf(dead, {year = yearNow(), region = null} = {}) {
  const law = lawAt(region ?? homeland(), year);
  const s = WR.settle({law, kin: kinOf(dead), will: willOf(dead)});
  const p = Money.purseOf(dead) ?? {};
  const total = Math.max(0, (Number(p.carried) || 0) + (Number(p.bank) || 0));
  return {...s, total, parts: WR.splitMoney(total, s.shares)};
}

/** Someone died: one card dividing what they had. */
export async function onDeath(dead) {
  if ( !isActiveGM() || !dead?.id ) return;
  const e = estateOf(dead);
  if ( !e.shares.length && !e.total ) return;
  const fmt = v => { try { return game.modules.get(MOD).api.upkeep.money.format(v); } catch (er) { return String(v); } };
  const lines = e.parts.map(p => `${p.name}: ${Math.round(p.share * 100)}%${e.total ? ` (${fmt(p.amount)})` : ""}, ${p.why}`);
  await chron()?.propose?.({type: T.estate, key: `estate:${dead.id}`, title: `The estate of ${dead.name}: ${e.law.label.toLowerCase()}`,
    detail: `${e.law.text}\n${lines.join("\n")}${e.free ? `\n${Math.round(e.free * 100)}% has no heir and goes to the lord, the Church or the state.` : ""}`,
    data: {dead: dead.id, parts: e.parts.filter(p => p.id && p.amount > 0).map(p => ({id: p.id, amount: p.amount}))}});
}

/** On a jump in time: undying owners who hide their wealth through false heirs need a roll for each passing. */
export async function onSkipEnd(info = {}) {
  if ( !isActiveGM() ) return;
  const years = yearAt(info.to) - yearAt(info.from);
  const n = WR.passingsFor(years);
  if ( n < 1 ) return;
  for ( const a of game.actors.filter(x => willOf(x).hidden && undying(x) && !diedOf(x)) ) {
    await chron()?.propose?.({type: T.falseHeir, key: `false-heir:${a.id}:${info.to}`, title: `${a.name} passes their wealth to a false heir ${n === 1 ? "once" : `${n} times`}`,
      detail: `Each passing is Intelligence + Finance at difficulty ${WR.FALSE_HEIR.difficulty}. A failure leaves a trail someone may follow; a botch is a secret someone has found. Approve to roll.`,
      data: {actor: a.id, times: n}});
  }
}

async function rollPassings(a, times) {
  const r = ratingsOf(a);
  const pool = Math.max(1, WR.FALSE_HEIR.pool.reduce((s, k) => s + ratingFrom(r, k), 0));
  const out = [];
  for ( let i = 0; i < times; i++ ) {
    const roll = await new Roll(`${pool}d10`).evaluate();
    const faces = roll.dice[0].results.map(x => x.result);
    const hits = faces.filter(f => f >= WR.FALSE_HEIR.difficulty).length, ones = faces.filter(f => f === 1).length;
    const net = hits - ones;
    out.push(net > 0 ? "clean" : hits === 0 && ones > 0 ? "botch" : "trail");
  }
  const trails = out.filter(x => x === "trail").length, botches = out.filter(x => x === "botch").length;
  if ( botches ) {
    try { await npc()?.secrets?.add?.(a, {kind: "wealth", text: "keeps their fortune through false heirs, and the papers show it", weight: 2}); } catch (e) { /* the NPC module may be off */ }
  }
  await ChatMessage.create({whisper: game.users.filter(u => u.isGM).map(u => u.id), speaker: {alias: "Wills and estates"},
    content: `<div class="vta-card wodx-x"><div class="vta-body"><p><b>${esc(a.name)}</b> hides their wealth (${pool} dice, difficulty ${WR.FALSE_HEIR.difficulty}): ${out.join(", ")}.</p>${trails ? `<p>${trails} passing${trails === 1 ? "" : "s"} left a trail someone may follow.</p>` : ""}${botches ? `<p>A botch: the trail is a secret on ${esc(a.name)} now, waiting to be found.</p>` : ""}</div></div>`});
  return out;
}

export function registerHandlers() {
  const c = chron();
  c?.registerApprovalHandler?.(T.estate, {label: "Estate divided",
    approve: async entry => {
      const dead = game.actors.get(entry.data.dead);
      if ( !dead ) return "The dead person's sheet is gone";
      let moved = 0;
      for ( const p of entry.data.parts ?? [] ) { const to = game.actors.get(p.id); if ( to && p.amount > 0 ) { await Money.transfer(dead, to, p.amount, {note: `Inherited from ${dead.name}`, to: "bank"}); moved++; } }
      return moved ? `Money passed to ${moved} heir${moved === 1 ? "" : "s"}` : "Nothing to move";
    },
    reject: async () => "Left for the Storyteller to divide"});
  c?.registerApprovalHandler?.(T.falseHeir, {label: "False heirs",
    approve: async entry => { const a = game.actors.get(entry.data.actor); if ( !a ) return "Gone"; const r = await rollPassings(a, entry.data.times); return `Rolled: ${r.join(", ")}`; },
    reject: async () => "No rolls"});
}
export function listen() {
  Hooks.on("wodxSkipEnd", info => { onSkipEnd(info).catch(e => console.error(`${MOD} | false heirs`, e)); });
}

/** The will window: heirs from the Relationships tab or by name, their shares, and the false-heirs box. */
export async function willDialog(actorLike) {
  const a = actorLike?.id ? game.actors.get(actorLike.id) ?? actorLike : game.actors.get(actorLike);
  if ( !a || !(game.user.isGM || a.isOwner) ) return null;
  const w = willOf(a);
  const ties = (npc()?.ties?.of?.(a) ?? []).filter(t => t.to?.id && game.actors.get(t.to.id));
  const options = [...new Map(ties.map(t => [t.to.id, t.to.name])).entries()];
  const row = (h = {}) => `<div class="wodx-row" data-heir><select name="id"><option value="">(by name)</option>${options.map(([id, n]) => `<option value="${esc(id)}" ${h.id === id ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>
    <input type="text" name="name" value="${esc(h.id ? "" : h.name)}" placeholder="or a name"> <input type="number" name="share" min="0" max="100" step="1" value="${Math.round((h.share ?? 0) * 100)}" style="width:5em">%</div>`;
  const law = lawAt();
  const content = `<p class="wodx-quiet">The law now: ${esc(law.label)}. ${esc(law.text)}</p>
    <div data-heirs>${(w.heirs.length ? w.heirs : [{}]).map(row).join("")}</div>
    <p><button type="button" data-add><i class="fa-solid fa-plus"></i> Another heir</button></p>
    <label><input type="checkbox" name="hidden" ${w.hidden ? "checked" : ""}> Held through false heirs (an undying owner passes it to themselves under a new name)</label>
    <label>Note <textarea name="note" rows="2">${esc(w.note)}</textarea></label>`;
  const D = foundry.applications.api.DialogV2;
  const read = el => ({heirs: [...el.querySelectorAll("[data-heir]")].map(r => { const id = r.querySelector("[name=id]").value || null;
    return {id, name: id ? game.actors.get(id)?.name : r.querySelector("[name=name]").value, share: (Number(r.querySelector("[name=share]").value) || 0) / 100}; }),
    hidden: el.querySelector("[name=hidden]").checked, note: el.querySelector("[name=note]").value});
  const dlg = new D({window: {title: `Will: ${a.name}`, icon: "fa-solid fa-scroll"}, classes: ["wodx-dialog"], position: {width: 480},
    content, rejectClose: false,
    buttons: [{action: "save", label: "Save the will", default: true, callback: async (ev, btn, d) => saveWill(a, read(d.element))}, {action: "cancel", label: "Cancel"}]});
  await dlg.render(true);
  dlg.element?.querySelector("[data-add]")?.addEventListener("click", () => dlg.element.querySelector("[data-heirs]").insertAdjacentHTML("beforeend", row()));
  return dlg;
}
