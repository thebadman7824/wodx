/**
 * The Inheritance step (B3530 to B3533). When a character dies, one approval card offers it; the Storyteller's hand
 * has it too for someone who leaves play alive. Pick the heir, tick what passes: items and fetishes, havens and places
 * held, the money left, the Ledger's boons, debts and oaths, rivals, and ties. A Garou heir of the dead's blood with
 * Ancestors, or a mage heir with Past Lives or Avatar, gets the dead as a past self in WoDX NPC, so a recall can reach
 * them. Money the law divides stays with the estate card (wills.mjs). Rules in inherit-rules.mjs.
 */
import * as IR from "./inherit-rules.mjs";
import * as L from "./ledger-rules.mjs";
import * as Wills from "./wills.mjs";
import * as Led from "./ledger.mjs";
import * as Money from "./money.mjs";
import * as Own from "./owners.mjs";
import {MOD, esc, chron, npc, isActiveGM, log} from "./core.mjs";
import {addTool} from "./hand.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

export const TYPE = `${MOD}.inheritance`;
const SHEETS = "wodx-sheets";
const diedOf = a => a?.flags?.["wodx-creation"]?.chronology?.died;
const alive = a => !!a && (diedOf(a) === undefined || diedOf(a) === null);
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || null; } catch (e) { return null; } };
const homeland = () => { try { return chron()?.world?.homeland?.() || ""; } catch (e) { return ""; } };
const isGroup = a => /group/i.test(String(a?.type ?? ""));
const lineOf = a => { try { return npc()?.hearts?.lineOf?.(a) ?? String(a?.type ?? "").toLowerCase(); } catch (e) { return String(a?.type ?? "").toLowerCase(); } };
const bgNames = a => (a?.items ?? []).filter(i => /background|advantage/i.test(String(i.system?.type ?? i.type ?? "")) || i.type === "Trait" || i.type === "Feature").map(i => i.name);

/** The dead's kin among the living, from WoDX NPC ties. */
function kinOf(dead) {
  try {
    const k = Wills.kinOf(dead);
    return [...(k.children ?? []).map(c => ({id: c.id, why: "child or heir"})), ...(k.spouse ? [{id: k.spouse.id, why: "spouse"}] : []),
      ...(k.siblings ?? []).map(s => ({id: s.id, why: "sibling"})), ...(k.parents ?? []).map(p => ({id: p.id, why: "parent"}))];
  } catch (e) { return []; }
}

/** Heir choices for the dead, best first. */
export function choicesFor(dead) {
  const will = Wills.willHeir(dead.id)?.id ?? null;
  const named = Led.ledger().heirs?.[dead.id] ?? null;
  const made = game.actors.find(a => a.flags?.["wodx-creation"]?.lineage?.family?.heirOf?.id === dead.id && alive(a))?.id ?? null;
  const others = game.actors.filter(a => a.id !== dead.id && alive(a) && !isGroup(a)).sort((a, b) => a.name.localeCompare(b.name)).map(a => ({id: a.id}));
  return IR.heirChoices({dead: dead.id, will, named, made, kin: kinOf(dead), others});
}

/** Move what was ticked from the dead to the heir. Returns the counts of what passed. */
export async function inherit(dead, heir, parts = {}) {
  if ( !game.user.isGM || !dead || !heir || dead.id === heir.id ) return null;
  const done = {};
  if ( parts.items ) {
    const items = dead.items.filter(i => IR.ITEM_TYPES.includes(i.type));
    if ( items.length ) {
      await heir.createEmbeddedDocuments("Item", items.map(i => { const o = i.toObject(); delete o._id; return o; }));
      await dead.deleteEmbeddedDocuments("Item", items.map(i => i.id));
    }
    done.items = items.length;
  }
  if ( parts.places ) {
    let k = 0;
    for ( const h of Own.holdings() ) if ( h.owner?.kind === "actor" && h.owner.id === dead.uuid ) { await Own.setOwner(h.doc, Own.recordFor(heir)); k++; }
    done.places = k;
  }
  if ( parts.purse ) {
    const p = Money.purseOf(dead) ?? {};
    const total = Math.max(0, (Number(p.carried) || 0) + (Number(p.bank) || 0));
    if ( total > 0 ) { await Money.transfer(dead, heir, total, {note: `Inherited from ${dead.name}`, to: "bank"}); done.purse = total; }
  }
  if ( parts.ledger ) {
    // The heir chosen here wins: name them in the Ledger and pass each open entry now; older cards for it are set aside
    let k = 0;
    for ( const row of L.inheritance(Led.ledger(), dead.id, heir) ) { await Led.saveEntry(L.passToHeir(row.entry, row.side, heir, dead.name)); k++; }
    const ap = chron()?.approvals;
    for ( const p of ap?.pending?.() ?? [] ) if ( p.type === Led.T.inherit && p.data?.dead === dead.name ) await ap.decide(p.id, "reject", `Passed in the Inheritance step to ${heir.name}`);
    done.ledger = k;
  }
  if ( parts.rivals ) {
    let k = 0;
    const AT = npc()?.attitude;
    if ( AT?.of && AT?.apply ) for ( const a of game.actors.filter(x => x.id !== dead.id && x.id !== heir.id && !x.hasPlayerOwner) ) {
      const step = AT.of(a, dead)?.step ?? 0;
      if ( step > IR.RIVAL_STEP ) continue;
      const now = AT.of(a, heir)?.step ?? 0;
      if ( now <= step ) continue;
      try { await AT.apply(a, heir, {delta: step - now, why: `The grudge against ${dead.name} passes to the heir`}); k++; } catch (e) { /* NPC may be off */ }
    }
    done.rivals = k;
  }
  if ( parts.ties ) {
    const add = IR.tiesFor(dead.flags?.[SHEETS]?.ties ?? [], {heirUuid: heir.uuid, deadName: dead.name});
    if ( add.length ) await heir.setFlag(SHEETS, "ties", IR.mergeTies(heir.flags?.[SHEETS]?.ties ?? [], add));
    done.ties = add.length;
  }
  // The dead as a past self the heir can recall (W20 Ancestors, M20 Past Lives)
  const kin = kinOf(dead).some(k => k.id === heir.id) || heir.flags?.["wodx-creation"]?.lineage?.family?.heirOf?.id === dead.id;
  const mem = IR.memoryKind({line: lineOf(heir), backgrounds: bgNames(heir), kin});
  const legacy = npc()?.legacy;
  if ( mem && legacy?.addPastLife ) {
    const ties = (dead.flags?.[SHEETS]?.ties ?? []).slice(0, 20).map(t => ({id: t.uuid?.split(".").pop() ?? null, name: t.role ?? "", kind: "tie", note: t.note ?? ""}));
    await legacy.addPastLife(heir, {name: dead.name, year: yearNow(), region: homeland(), ties, from: dead.id});
    done.memory = mem;
  }
  await log({kind: "note", actor: heir.id, name: heir.name, text: IR.summary(done, {dead: dead.name, heir: heir.name})});
  Hooks.callAll("wodxInheritance", {dead, heir, done});
  return done;
}

/** The window: pick the heir and tick what passes. */
export async function inheritDialog(deadLike = null) {
  if ( !game.user.isGM ) return;
  let dead = deadLike?.id ? game.actors.get(deadLike.id) ?? deadLike : game.actors.get(deadLike) ?? null;
  if ( !dead ) {
    const list = game.actors.filter(a => !isGroup(a)).sort((a, b) => (alive(a) - alive(b)) || a.name.localeCompare(b.name));
    const pick = await foundry.applications.api.DialogV2.prompt({window: {title: "Inheritance: whose?"}, rejectClose: false,
      content: `${searchBox("select[name=dead]", "Search people…", "Search people")}<div class="form-group"><label>Who died or left play</label><select name="dead" size="8">${list.map(a => `<option value="${a.id}">${esc(a.name)}${alive(a) ? "" : " (dead)"}</option>`).join("")}</select></div>`,
      ok: {label: "Next", callback: (ev, b) => b.form.elements.dead.value}});
    dead = pick ? game.actors.get(pick) : null;
    if ( !dead ) return;
  }
  const choices = choicesFor(dead);
  if ( !choices.length ) return ui.notifications.warn("No living character to inherit.");
  const estate = !!Wills.willOf(dead).heirs.length || Wills.estateOf(dead).total > 0;
  const ticks = IR.defaults({estate});
  const heirOpts = choices.map((c, i) => `<option value="${c.id}"${i === 0 ? " selected" : ""}>${esc(game.actors.get(c.id)?.name ?? c.id)}${c.why ? ` (${esc(c.why)})` : ""}</option>`).join("");
  const rows = IR.PART_KEYS.map(k => `<div class="form-group"><label><input type="checkbox" name="${k}"${ticks[k] ? " checked" : ""}> ${esc(IR.PARTS[k].label)}</label><p class="hint">${esc(IR.PARTS[k].hint)}</p></div>`).join("");
  const res = await foundry.applications.api.DialogV2.prompt({window: {title: `Inheritance: ${dead.name}`}, position: {width: 500}, rejectClose: false,
    content: `${searchBox("select[name=heir]", "Search heirs…", "Search heirs")}<div class="form-group"><label>The heir</label><select name="heir">${heirOpts}</select></div>${rows}
      <p class="hint">${estate ? "The estate card divides the money by the will and the law; the purse box moves only what is left after it. " : ""}A Garou heir of the blood with Ancestors, or a mage with Past Lives or Avatar, keeps ${esc(dead.name)} as a past self to recall.</p>`,
    ok: {label: "Pass it on", callback: (ev, b) => ({heir: b.form.elements.heir.value, ...Object.fromEntries(IR.PART_KEYS.map(k => [k, !!b.form.elements[k]?.checked]))})}});
  const heir = res?.heir ? game.actors.get(res.heir) : null;
  if ( !heir ) return;
  const done = await inherit(dead, heir, res);
  if ( done ) ui.notifications.info(IR.summary(done, {dead: dead.name, heir: heir.name}));
}

/** On a death: one card that opens the step. */
export async function onDeath(dead) {
  if ( !isActiveGM() || !dead?.id ) return;
  await chron()?.propose?.({type: TYPE, key: `inheritance:${dead.id}`, title: `${dead.name} died: the Inheritance step`,
    detail: "Approve to pick the heir and tick what passes on: items, places, money left, the Ledger, rivals and ties.", data: {dead: dead.id}});
}

export function registerInheritance() {
  chron()?.registerApprovalHandler?.(TYPE, {label: "The Inheritance step", small: () => false,
    approve: async e => { const d = game.actors.get(e.data?.dead); if ( d ) await inheritDialog(d); }});
}
export function registerInheritTools() {
  addTool({key: "inherit", label: "Inheritance", icon: "fa-scroll", run: () => inheritDialog()});
}
export const api = () => ({open: inheritDialog, inherit, choicesFor, rules: IR});
