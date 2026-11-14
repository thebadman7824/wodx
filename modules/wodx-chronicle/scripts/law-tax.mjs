/**
 * WoDX Chronicle: taxes on the month's upkeep in the world (B3616-B3617). The rules are in law-tax-rules.mjs.
 *   Month    WoDX Storyteller pays the month's allowances (wodxMonthPaid, with each character's sum). A character who
 *            keeps the taxes back (flag wodx-chronicle.taxDodge) gets the usual share back, and the law may notice
 *            (a "tax" deed on the law's heat). A levy in force takes its share; one that cannot be paid is a deed too.
 *   Collector a character with a seat in a tax office (WoDX Storyteller's institutions) is hard to catch
 *   Towns    WoDX Storyteller's towns read the levy each week (townTaxFrom): a crushing one brings riots and risings
 *   Card     the Law here card tells the player the usual share and lets the owner keep the taxes back or pay
 */
import {MODULE_ID, esc, isActiveGM} from "./util.mjs";
import {currentYear} from "./eras.mjs";
import * as L from "./law-rules.mjs";
import * as T from "./law-tax-rules.mjs";
import * as place from "./place.mjs";
import {addDeed} from "./law-heat.mjs";

const yearNow = () => { try { return currentYear(); } catch (e) { return 1197; } };
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const homeRegion = () => { try { return place.homeland() ?? "moravia"; } catch (e) { return "moravia"; } };
const st = () => game.modules.get("wodx-storyteller")?.api?.upkeep ?? null;
function actorLine(a) {
  const t = String(a?.type ?? "").toLowerCase(), v = String(a?.system?.settings?.variant ?? "").toLowerCase();
  if ( t === "mortal" && (v === "ghoul" || v === "revenant") ) return v;
  if ( t === "changing breed" || t === "changingbreed" ) return "werewolf";
  if ( t === "pc" ) return "vampire";
  return Object.keys(T.LINE_TAX).includes(t) ? t : "mortal";
}
export const dodging = actor => !!actor?.getFlag?.(MODULE_ID, "taxDodge");

/** The best tax-office seat a character holds (0-4), or null. */
function collectorRank(actor) {
  try {
    const seats = (st()?.institutions?.seatsOf?.(actor.id) ?? []).filter(s => s.kind === "tax");
    return seats.length ? Math.max(...seats.map(s => Number(s.rank) || 0)) : null;
  } catch (e) { return null; }
}

/** The taxes where a region stands now. */
export function taxHere(region = homeRegion(), year = yearNow()) {
  const family = L.familyOf(region).id;
  return {...T.taxOf(family, region, year), family, region, year};
}

/** One month: what each paid character keeps back or owes. paid: {actorId: allowance}. */
export async function onMonth({paid = {}} = {}) {
  if ( !isActiveGM() ) return [];
  const money = st()?.money;
  if ( !money ) return [];
  const region = homeRegion(), year = yearNow(), tax = taxHere(region, year), law = L.lawOf(region, year);
  const fmt = v => { try { return money.format(v); } catch (e) { return String(v); } };
  const lines = [];
  for ( const [id, total] of Object.entries(paid) ) {
    const a = game.actors.get(id);
    if ( !a || !(Number(total) > 0) ) continue;
    const dodge = dodging(a), sums = T.monthSums(total, tax, {dodge});
    if ( dodge && sums.kept ) {
      await money.receive(a, sums.kept, {to: "bank", note: "Taxes kept back"});
      const chance = T.catchChance(law, tax.family, year, {collector: collectorRank(a)});
      const caught = Math.random() < chance;
      if ( caught ) await addDeed(a, "tax", {scene: null, named: true});
      lines.push(`${a.name} keeps back ${fmt(sums.kept)} of the taxes.${caught ? ` Noticed: ${T.caughtWords(tax.family, year)}` : ""} (${Math.round(chance * 100)}% a month.)`);
    }
    if ( sums.levy ) {
      const r = await money.pay(a, sums.levy, {credit: true, atHome: true, note: "Levy"});
      if ( r?.ok ) lines.push(`${a.name} pays ${fmt(sums.levy)} to the levy.`);
      else { await addDeed(a, "tax", {scene: null, named: true}); lines.push(`${a.name} cannot pay the levy (${fmt(sums.levy)}), and the collectors take note.`); }
    }
    const rank = collectorRank(a);
    if ( rank != null && tax.levy ) lines.push(`${a.name} collects the levy: squeezing harder fills the purse and the land's anger.`);
  }
  if ( tax.crushing ) lines.push("The levy crushes the common people: every town of the land grows angrier each week it stands.");
  if ( lines.length ) await ChatMessage.create({speaker: {alias: "The collectors"}, whisper: gmIds(),
    content: `<div class="wodx-card wodx-law-tax"><h3>The month's taxes</h3>${tax.levies.length ? `<p>${esc(tax.levies.map(l => l.words).join(". "))}.</p>` : ""}<ul>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul></div>`});
  return lines;
}

/** The player's own line for the Law here card, and the button that keeps the taxes back or pays them. */
export function playerTax(actor, region = homeRegion(), year = yearNow()) {
  if ( !actor ) return "";
  const tax = taxHere(region, year), pct = Math.round(tax.share * 100);
  const levy = tax.levy ? ` A levy takes ${Math.round(tax.levy * 100)} in the hundred more.` : "";
  const hook = T.LINE_TAX[actorLine(actor)] ?? "";
  const label = dodging(actor) ? "Pay the taxes again" : "Keep the taxes back";
  return `<p>The usual taxes here take about ${pct} in the hundred of what you live on.${esc(levy)}${dodging(actor) ? " You are keeping them back." : ""}</p>${hook && game.user.isGM ? `<p><em>${esc(hook)}</em></p>` : ""}
    ${actor.isOwner ? `<button type="button" data-action="wodx-law-taxdodge" data-actor="${esc(actor.id)}">${esc(label)}</button>` : ""}`;
}

export function registerTaxHooks() {
  Hooks.on("wodxMonthPaid", p => { onMonth(p).catch(e => console.error("WoDX | taxes", e)); });
  Hooks.on("renderChatMessageHTML", (message, el) => {
    for ( const b of el.querySelectorAll?.("[data-action='wodx-law-taxdodge']") ?? [] ) b.addEventListener("click", async () => {
      const a = game.actors.get(b.dataset.actor);
      if ( !a?.isOwner ) return;
      b.disabled = true;
      await a.setFlag(MODULE_ID, "taxDodge", !dodging(a));
      ui.notifications?.info(dodging(a) ? `${a.name} keeps the taxes back from next month.` : `${a.name} pays the taxes from next month.`);
    });
  });
}

export {T as rules};
