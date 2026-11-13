/**
 * WoDX Combat 3.14.0: the after-action card, the Foundry part (the rules are in aftermath-rules.js).
 *
 * When a fight starts, the active Storyteller notes each fighter's health and pools on the combat. When the fight is
 * ended (the encounter deleted after it started), the Storyteller gets one whispered card: what each fighter took,
 * dealt and spent, the acts seen in chat, who outside the fight could see it, and a button that records the breach in
 * the Masquerade ledger (WoDX Actions) and starts a rumour (WoDX Storyteller). Nothing reaches the players.
 */
import * as AR from "./aftermath-rules.js";
import {lengthOf} from "./fight-time.js";

const MOD = "wodx-combat";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const chron = () => game.modules.get("wodx-chronicle")?.api;
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 0; } catch (e) { return 0; } };
const futureOn = () => { try { return !!game.settings.get("wodx-chronicle", "rule.futureBranch"); } catch (e) { return false; } };

export function registerAftermathSettings() {
  game.settings.register(MOD, "afterAction", {
    name: "After-action card", scope: "world", config: true, type: Boolean, default: true,
    hint: "When a fight ends, the Storyteller gets a card: damage taken and dealt, blood and Willpower spent, powers seen, witnesses in sight, and a button to record a Masquerade breach and start a rumour."
  });
}
/** The start snapshots as {uuid: snap}, from the stored pairs. */
export const startOf = aar => Array.isArray(aar?.start) ? Object.fromEntries(aar.start.filter(e => Array.isArray(e) && e.length === 2)) : {};
const on = () => { try { return game.settings.get(MOD, "afterAction") !== false; } catch (e) { return true; } };

export function setupAftermath({corpusTrack}) {
  const damageOf = actor => (actor?.type === "Wraith" ? corpusTrack?.(actor)?.damage : null) ?? actor?.system?.health?.damage ?? {};
  const poolsOf = actor => Object.fromEntries(Object.keys(AR.POOLS).map(k => [k, actor?.system?.advantages?.[k]?.temporary]).filter(([, v]) => v !== undefined && v !== null));
  const snap = actor => ({name: actor?.name ?? "?", ...AR.snapshot({damage: damageOf(actor), pools: poolsOf(actor)})});

  async function noteStart(combat) {
    if ( !isActiveGM() || !on() || !combat ) return;
    // Kept as [uuid, snapshot] pairs: a flag key with the dot of "Actor.id" would be split into nested objects (3.15.1)
    const start = startOf(combat.getFlag(MOD, "aar"));
    let added = false;
    for ( const c of combat.combatants ) if ( c.actor && !start[c.actor.uuid] ) { start[c.actor.uuid] = snap(c.actor); added = true; }
    if ( !added && combat.getFlag(MOD, "aar")?.t0 ) return;
    await combat.setFlag(MOD, "aar", {t0: combat.getFlag(MOD, "aar")?.t0 ?? Date.now(), start: Object.entries(start)});
  }

  /** The acts seen in chat while the fight ran: WoDX Actions cards by a fighter, not whispered. */
  function actsSince(t0, uuids) {
    const out = [];
    for ( const m of game.messages?.contents ?? [] ) {
      if ( (m.timestamp ?? 0) < t0 || m.whisper?.length || m.getFlag?.(MOD, "data") ) continue;
      if ( !/vta-card/.test(m.content ?? "") ) continue;
      const a = m.speaker?.actor ? game.actors.get(m.speaker.actor) : null;
      const tokActor = m.speaker?.token ? canvas.scene?.tokens?.get(m.speaker.token)?.actor : null;
      const who = tokActor ?? a;
      if ( !who || !uuids.has(who.uuid) ) continue;
      const t = document.createElement("template");
      t.innerHTML = m.content;
      const head = t.content.querySelector(".vta-head h3, h3")?.textContent?.trim() ?? "";
      const title = head.replace(new RegExp(`^${who.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*`), "").replace(/\s+/g, " ").slice(0, 60);
      if ( title && !/^(any roll|action|rules reminder)$/i.test(title) ) out.push({uuid: who.uuid, title});
    }
    return out;
  }

  async function onEnd(combat) {
    if ( !isActiveGM() || !on() || !combat?.started ) return null;
    const aar = combat.getFlag(MOD, "aar");
    const start = startOf(aar);
    if ( !Object.keys(start).length ) return null;
    const fighters = combat.combatants.map(c => c.actor).filter(Boolean);
    const end = Object.fromEntries(fighters.map(a => [a.uuid, snap(a)]));
    const cards = (game.messages?.contents ?? []).map(m => m.getFlag?.(MOD, "data")).filter(d => d?.combatId === combat.id);
    const uuids = new Set(fighters.map(a => a.uuid));
    const list = AR.rows({start, end, cards, acts: actsSince(aar.t0 ?? 0, uuids)});
    // Who outside the fight saw it: WoDX Actions sorts each onlooker by what each fighter showed
    const ax = game.wodxActions;
    const breach = new Map(), startled = new Map(), kinds = new Set(), by = [];
    let place = null;
    const combatTokens = new Set(combat.combatants.map(c => c.tokenId).filter(Boolean));
    for ( const c of combat.combatants ) {
      const tok = c.token?.object ?? canvas.tokens?.get(c.tokenId);
      if ( !tok?.actor || !ax?.observersOf ) continue;
      let o = null;
      try { o = ax.observersOf(tok, {exclude: [tok.actor.id]}); } catch (e) { o = null; }
      if ( !o?.secret ) continue;
      place ??= o.place;
      const seen = (o.breach ?? []).filter(t => !combatTokens.has(t.id) || (ax.witnessRules?.BREACH_PROFILES ?? ["mortal", "hunter"]).includes(ax.profiles?.detectProfile?.(t.actor)));
      if ( seen.length ) { by.push({actor: tok.actor, witnesses: seen.map(t => t.actor), secret: o.secret}); kinds.add(ax.witnessRules?.SECRETS?.[o.secret] || o.secret); }
      for ( const t of seen ) breach.set(t.actor.uuid, t.actor.name);
      for ( const t of o.startled ?? [] ) if ( !combatTokens.has(t.id) ) startled.set(t.actor.uuid, t.actor.name);
    }
    const ev = AR.evidenceFor(yearNow(), {future: futureOn()});
    const sev = AR.severity(breach.size, ev);
    const sceneName = combat.scene?.navName || combat.scene?.name || canvas.scene?.name || "";
    const rumour = AR.rumourText({place: sceneName, kinds: [...kinds], ev});
    const rowsHtml = list.map(r => `<li><b>${esc(r.name)}</b>: ${esc(AR.rowText(r))}${r.powers.length ? `<br><small>Seen: ${r.powers.map(esc).join(", ")}</small>` : ""}</li>`).join("");
    let html = `<div class="vtc-card wodx-aar"><h3>After the fight${sceneName ? `: ${esc(sceneName)}` : ""}</h3>
      <p>${lengthOf(combat) ? `${lengthOf(combat)}; the time has moved on.` : combat.round ? `${combat.round} turn${combat.round === 1 ? "" : "s"}.` : ""}</p><ul class="wodx-aar-rows">${rowsHtml || "<li>No fighter on record.</li>"}</ul>`;
    if ( breach.size ) {
      html += `<p class="vtc-note"><b>Witnesses:</b> ${[...breach.values()].map(esc).join(", ")} saw what should stay hidden. Severity ${sev}; they carry ${esc(ev.label)}.</p>
        <p class="vtc-note"><i>Rumour:</i> ${esc(rumour)}</p>
        <button type="button" class="vtc-aar-breach"><i class="fa-solid fa-mask" aria-hidden="true"></i> Record the breach and start the rumour</button>`;
    } else html += `<p class="vtc-note">No mortal outside the fight could see it.</p>`;
    if ( startled.size ) html += `<p class="vtc-note">Another kind saw it too: ${[...startled.values()].map(esc).join(", ")}.</p>`;
    html += `</div>`;
    // B3171: the fight goes into the Legends book as a deed, and into the experience draft (WoDX Storyteller)
    try { await recordDeed(combat, list, sceneName); } catch (e) { console.error(`${MOD} | after-action deed`, e); }
    return ChatMessage.create({content: html, whisper: gmIds(), speaker: {alias: "WoDX Combat"},
      flags: {[MOD]: {aar: {by: by.map(b => ({uuid: b.actor.uuid, secret: b.secret, witnesses: b.witnesses.map(w => w.uuid)})), rumour, big: sev >= 2, done: false, scene: sceneName}}}});
  }

  const downOf = (c, a) => !!c.defeated || ["dead", "unconscious", "incapacitated"].some(x => a?.statuses?.has?.(x));
  async function recordDeed(combat, list, place) {
    const fighters = combat.combatants.filter(c => c.actor).map(c => ({id: c.actor.id, name: c.actor.name, uuid: c.actor.uuid, pc: !!c.actor.hasPlayerOwner, down: downOf(c, c.actor)}));
    if ( !fighters.some(f => f.pc) ) return;
    const won = AR.fightWon(fighters);
    const pcs = fighters.filter(f => f.pc), foes = [...new Set(fighters.filter(f => !f.pc).map(f => f.name))];
    const text = AR.deedText({won, place, pcs: pcs.map(f => f.name), foes});
    const at = game.time.worldTime;
    await chron()?.legends?.addDeed?.({id: combat.id, at, text, won, place, people: pcs.map(f => ({id: f.id, name: f.name}))});
    const taken = new Map(list.map(r => [r.uuid, r.taken]));
    await game.modules.get("wodx-storyteller")?.api?.noteFight?.({id: combat.id, at, text, won, rows: pcs.map(f => ({id: f.id, pc: true, taken: taken.get(f.uuid) ?? 0, down: f.down}))});
  }

  async function recordFromCard(msg) {
    const d = msg?.getFlag?.(MOD, "aar");
    if ( !game.user.isGM || !d || d.done ) return;
    const ax = game.wodxActions;
    let spread = false;
    for ( const b of d.by ?? [] ) {
      const by = await fromUuid(b.uuid);
      const witnesses = (await Promise.all((b.witnesses ?? []).map(u => fromUuid(u)))).filter(Boolean);
      if ( !by || !witnesses.length ) continue;
      const entry = await ax?.recordBreach?.({by, event: `a fight${d.scene ? ` at ${d.scene}` : ""}`, witnesses, secret: b.secret});
      if ( entry?.spread !== false ) spread = true;
    }
    // A closed place or Elysium keeps it: no rumour in the town (WoDX Actions' place rules)
    if ( spread ) await game.modules.get("wodx-storyteller")?.api?.rumours?.start?.({text: d.rumour, big: !!d.big});
    await msg.setFlag(MOD, "aar", {...d, done: true});
    ui.notifications.info(spread ? "Breach recorded and the rumour started." : "Breach recorded; the place keeps it, so no rumour goes out.");
  }

  Hooks.on("combatStart", c => { noteStart(c).catch(e => console.error(`${MOD} | after-action`, e)); });
  Hooks.on("createCombatant", cb => { if ( cb.parent?.started ) noteStart(cb.parent).catch(e => console.error(`${MOD} | after-action`, e)); });
  Hooks.on("deleteCombat", c => { onEnd(c).catch(e => console.error(`${MOD} | after-action`, e)); });
  Hooks.on("renderChatMessageHTML", (msg, el) => {
    const d = msg.getFlag?.(MOD, "aar");
    if ( !d ) return;
    const b = (el?.[0] ?? el)?.querySelector?.(".vtc-aar-breach");
    if ( !b ) return;
    if ( d.done || !game.user.isGM ) { b.disabled = true; if ( d.done ) b.textContent = "Recorded"; return; }
    b.addEventListener("click", () => { b.disabled = true; recordFromCard(msg).catch(e => { b.disabled = false; console.error(`${MOD} | after-action`, e); }); });
  });
  return {noteStart, onEnd, recordFromCard, rules: AR};
}
