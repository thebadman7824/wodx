import {MODULE_ID, esc, lineOf, xpTotals, recheck, applyPurchase, kindLabel, payerOf, canSpendFor} from "./actor-data.mjs";
import {byTheBook} from "./rules.mjs";
import {dateLabel} from "./lineage.mjs";

/**
 * The experience log. Awards and spends are upstream Experience items (so the sheet's totals stay right), each
 * marked with the in-game date in flags["wodx-creation"]. Players request spends; the Storyteller approves them
 * in the WoDX approval queue. The cost is worked out again on approval, from the sheet as it is then.
 */

export const XP_TYPE = "xp-spend";
const SOCKET = `module.${MODULE_ID}`;
const chronicle = () => game.modules.get("wodx-chronicle")?.api;
const isActiveGM = () => !!game.user?.isGM && game.users.activeGM?.id === game.user.id;

const describe = p => (p.kind === "newDiscipline" || p.kind === "newAbility")
  ? `${kindLabel(p.kind)}: ${p.label}` : `${p.label} ${p.current} → ${p.next}`;

/** GM: give experience to characters. */
export async function award(actors, amount, note = "", time = game.time.worldTime) {
  if ( !game.user.isGM ) return [];
  const n = Math.trunc(Number(amount));
  if ( !Number.isFinite(n) || n <= 0 ) throw new Error("Give a whole number of experience points above 0");
  const name = (String(note).trim() || "Experience award").slice(0, 120);
  for ( const actor of actors ) {
    await actor.createEmbeddedDocuments("Item", [{name, type: "Experience", system: {amount: n, isspent: false},
      flags: {[MODULE_ID]: {time, kind: "award", by: game.user.name}}}]);
    await writeLogPage(actor);
  }
  await ChatMessage.create({
    content: `<div class="wodx-card wodx-xp"><h3>Experience</h3><p>${esc(actors.map(a => a.name).join(", "))}: +${n} (${esc(name)}).</p>
      <p class="wodx-quiet">${esc(dateLabel(time))}</p></div>`,
    speaker: {alias: "Storyteller"}
  });
  return actors;
}

/** Record a spend and raise the trait. Re-checks the cost first. Returns false if it no longer holds. */
export async function spend(actor, purchase, {by = game.user.name, time = game.time.worldTime} = {}) {
  const now = recheck(actor, purchase);
  if ( !now || !now.ok ) return {ok: false, reason: now?.reason ?? "That trait is no longer on the sheet"};
  if ( now.cost !== purchase.cost || now.current !== purchase.current ) {
    return {ok: false, reason: `The sheet changed since the request (now ${now.current} dots, ${now.cost} experience). Ask again.`};
  }
  const payer = payerOf(actor);
  await applyPurchase(actor, now);
  // An ally paid for by its patron: the spend is recorded on the patron, named for the ally
  const name = payer === actor ? describe(now) : `${actor.name}: ${describe(now)}`;
  await payer.createEmbeddedDocuments("Item", [{name, type: "Experience", system: {amount: now.cost, isspent: true},
    flags: {[MODULE_ID]: {time, kind: now.kind, key: now.key, from: now.current, to: now.next, by, for: actor.id}}}]);
  await writeLogPage(payer);
  return {ok: true, option: now};
}

/** Any client: ask for a spend. The GM spends at once; a player's request goes to the approval queue. */
export async function requestSpend(actor, purchase) {
  const refuse = reason => { ui.notifications.warn(reason); return {ok: false, reason}; };
  if ( !purchase?.ok ) return refuse(purchase?.reason ?? "That cannot be bought.");
  if ( game.user.isGM ) {
    const r = await spend(actor, purchase);
    if ( r.ok ) ui.notifications.info(`${actor.name}: ${describe(r.option)} for ${r.option.cost} experience.`);
    else ui.notifications.warn(r.reason);
    return r;
  }
  if ( !canSpendFor(actor, game.user) ) return refuse("You can only spend experience for your own character or its allies.");
  if ( !game.users.activeGM ) return refuse("No Storyteller is connected, so this could not be sent.");
  game.socket.emit(SOCKET, {type: "xp.request", payload: {userId: game.user.id, actorId: actor.id, purchase: slim(purchase)}});
  ui.notifications.info("Sent to the Storyteller for approval.");
  return {ok: true, sent: true};
}

const slim = p => ({kind: p.kind, key: p.key, label: p.label, current: p.current, next: p.next, cost: p.cost, group: p.group});

/** Active GM: a player's request arrives. Check it, then queue it. */
export async function onRequest(payload) {
  if ( !isActiveGM() ) return;
  const user = game.users.get(payload?.userId);
  const actor = game.actors.get(payload?.actorId);
  if ( !user || !actor || !payload.purchase ) return;
  if ( !canSpendFor(actor, user) ) return;
  const now = recheck(actor, payload.purchase);
  if ( !now?.ok || now.cost !== payload.purchase.cost ) {
    await ChatMessage.create({content: `<div class="wodx-card"><p>The request for ${esc(actor.name)} could not be queued: ${esc(now?.reason ?? "the trait was not found")}.</p></div>`,
      whisper: [user.id], speaker: {alias: "Storyteller"}});
    return;
  }
  const api = chronicle();
  await api.approvals.addToQueue({
    id: foundry.utils.randomID(), type: XP_TYPE, key: `xp:${actor.id}:${now.kind}:${now.key}`,
    title: `${actor.name}: ${describe(now)} for ${now.cost} experience`,
    detail: `${kindLabel(now.kind)}. ${payerOf(actor) === actor ? actor.name : `Paid by ${payerOf(actor).name}, who`} has ${xpTotals(payerOf(actor)).available} experience to spend. Cost by ${lineOf(actor)} rules.`,
    data: {actorId: actor.id, purchase: slim(now)}, from: user.id, createdAt: Date.now(), worldTime: game.time.worldTime
  });
}

/** Approval handler: re-check and spend. A failed check is reported to the GM and the player. */
export function registerXPHandler() {
  chronicle()?.registerApprovalHandler?.(XP_TYPE, {
    label: "Experience",
    // Small (B2454): a spend by the book, checked again against the sheet as it is now
    small: entry => { const a = game.actors.get(entry.data?.actorId); return !!a && byTheBook(recheck(a, entry.data?.purchase ?? {}), entry.data?.purchase?.cost ?? null); },
    approve: async entry => {
      const actor = game.actors.get(entry.data?.actorId);
      if ( !actor ) throw new Error("The character is gone");
      const r = await spend(actor, entry.data.purchase, {by: game.user.name});
      if ( !r.ok ) {
        ui.notifications.warn(`${actor.name}: ${r.reason}`);
        if ( entry.from ) await ChatMessage.create({content: `<div class="wodx-card"><p>${esc(r.reason)}</p></div>`, whisper: [entry.from], speaker: {alias: "Storyteller"}});
      }
    }
  });
}

/* -------------------------------------------- */
/*  The experience log journal                  */
/* -------------------------------------------- */

export function logRows(actor) {
  const rows = [...(actor.items ?? [])].filter(i => i.type === "Experience").map(i => ({
    name: i.name, amount: parseInt(i.system?.amount) || 0, spent: !!i.system?.isspent,
    time: i.flags?.[MODULE_ID]?.time ?? null, by: i.flags?.[MODULE_ID]?.by ?? "", created: i._stats?.createdTime ?? 0
  }));
  rows.sort((a, b) => ((a.time ?? -Infinity) - (b.time ?? -Infinity)) || (a.created - b.created));
  let balance = 0;
  for ( const r of rows ) { balance += r.spent ? -r.amount : r.amount; r.balance = balance; }
  return rows;
}

export function logHTML(actor) {
  const rows = logRows(actor);
  const t = xpTotals(actor);
  const body = rows.map(r => `<tr><td>${r.time === null ? "–" : esc(dateLabel(r.time))}</td><td>${esc(r.name)}</td>
    <td>${r.spent ? `−${r.amount}` : `+${r.amount}`}</td><td>${r.balance}</td><td>${esc(r.by)}</td></tr>`).join("");
  return `<p>Earned ${t.earned}, spent ${t.spent}, ${t.available} to spend.</p>
    <table><thead><tr><th>In-game date</th><th>Entry</th><th>Points</th><th>Left</th><th>By</th></tr></thead><tbody>${body}</tbody></table>`;
}

/** GM: rewrite one character's page in "WoDX Experience Log". */
export async function writeLogPage(actor) {
  if ( !game.user.isGM ) return null;
  const html = logHTML(actor);
  let journal = game.journal.find(j => j.getFlag?.(MODULE_ID, "kind") === "xp-log");
  if ( !journal ) {
    journal = await JournalEntry.create({name: "WoDX Experience Log", flags: {[MODULE_ID]: {kind: "xp-log"}},
      pages: [{name: actor.name, type: "text", text: {content: html}, flags: {[MODULE_ID]: {actorId: actor.id}}}]});
    return journal;
  }
  const page = journal.pages.find(p => p.getFlag?.(MODULE_ID, "actorId") === actor.id);
  if ( page ) await page.update({name: actor.name, "text.content": html});
  else await journal.createEmbeddedDocuments("JournalEntryPage", [{name: actor.name, type: "text", text: {content: html}, flags: {[MODULE_ID]: {actorId: actor.id}}}]);
  return journal;
}
