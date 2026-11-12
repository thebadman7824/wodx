/**
 * WoDX NPC 0.17.0: founding factions in play, and factions the players run.
 *
 *   Founding   The Storyteller founds a faction from its founders' own Backgrounds (each pledges up to the dots they
 *              hold; the faction holds the sum, to 5). A player may ask to found one from their own characters; the
 *              request goes to the approval queue, and the Storyteller's client checks the dots on the sheets itself.
 *   Orders     A faction run by players on orders waits at each turn for one of the six moves, which its players give
 *              from the Factions button on the token tools. The orders are spent on the turn.
 * The rules are in faction-rules.mjs (foundFaction, normOrders, runTurn).
 */
import * as F from "./faction-rules.mjs";
import * as PO from "./politics-rules.mjs";

export function build(ctx, fx) {
  const {MOD, esc, gmIds, isActiveGM} = ctx;
  const SOCKET = `module.${MOD}`;
  const num = v => Number(v) || 0;
  const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };
  const opt = (map, cur) => Object.entries(map).map(([k, v]) => `<option value="${esc(k)}"${String(k) === String(cur ?? "") ? " selected" : ""}>${esc(v)}</option>`).join("");
  const KEY_LABEL = {herd: "Herd", resources: "Resources", status: "Status", retainers: "Retainers", contacts: "Contacts", domain: "Domain", influence: "Influence"};
  const hasOf = actor => Object.fromEntries(F.PLEDGE_KEYS.map(k => [k, fx.bgValue(actor, k)]));
  const dialog = (title, content, buttons, width = 620) => foundry.applications.api.DialogV2.wait({window: {title, resizable: true}, classes: ["wodx-dialog", "wodx-npc-dialog"],
    position: {width, height: "auto"}, content, buttons, rejectClose: false});
  const formOf = (ev, b) => new foundry.applications.ux.FormDataExtended(b.form).object;
  /** The characters a user may found with or give orders for: those they own (all, for the Storyteller). */
  const mine = (user = game.user) => fx.allActors().filter(a => user.isGM || a.testUserPermission?.(user, "OWNER"));
  const anyGM = () => game.users?.some(u => u.isGM && u.active);

  /* ------------------------------------------------------------------ */
  /*  Founding                                                           */
  /* ------------------------------------------------------------------ */

  /** Ask for a new faction: its name and kind, then each founder's pledges. Returns {spec, founders} or null. */
  async function askFounding() {
    const era = fx.eraInfo(), gm = game.user.isGM;
    const people = mine().filter(a => gm || a.hasPlayerOwner).sort((a, b) => a.name.localeCompare(b.name));
    if ( !people.length ) { ui.notifications.warn("You have no character to found a faction with."); return null; }
    const first = await dialog("Found a faction", `<div class="wnpc-faction-form">
      <div class="wodx-field"><label>Name</label><input type="text" name="name" maxlength="120" placeholder="The faction's name"></div>
      <div class="wodx-field"><label>Kind</label><select name="kind" data-fixed>${opt(era.kinds ?? F.KINDS, "other")}</select></div>
      <div class="wodx-field"><label>Its Influence works in</label><select name="sphere" data-fixed>${opt(era.spheres, Object.keys(era.spheres)[0])}</select></div>
      <p><label class="wnpc-check"><input type="checkbox" name="secret"> Secret (a slip starts a rumour)</label>
        <label class="wnpc-check"><input type="checkbox" name="orders" checked> Its players give the orders at each turn</label></p>
      <fieldset><legend>Founders</legend><div class="wnpc-list">
        ${people.map((a, k) => `<label class="wnpc-check"><input type="checkbox" name="f.${a.id}" ${k === 0 && !gm ? "checked" : ""}> ${esc(a.name)}${gm && a.hasPlayerOwner ? " (player)" : ""}</label>`).join("")}</div></fieldset>
      <p class="wodx-quiet">Next, each founder pledges dots from their own Backgrounds. The faction holds the sum of the pledges in each, to 5 (house rule, after the pooled Backgrounds of a pack or a cabal). The founders' sheets are not changed.</p></div>`,
    [{action: "next", label: "Next", default: true, callback: formOf}, {action: "cancel", label: "Cancel"}]);
    if ( !first || first === "cancel" ) return null;
    const chosen = people.filter(a => first[`f.${a.id}`]);
    if ( !chosen.length ) { ui.notifications.warn("Pick at least one founder."); return null; }
    const grid = chosen.map(a => {
      const has = hasOf(a);
      return `<tr><td>${esc(a.name)}</td>${F.PLEDGE_KEYS.map(k => `<td>${has[k] ? `<input type="number" name="p.${a.id}.${k}" value="0" min="0" max="${has[k]}" title="Holds ${has[k]}">` : "<span class=\"wodx-quiet\">0</span>"}</td>`).join("")}</tr>`;
    }).join("");
    const second = await dialog("Found a faction: the pledges", `<div class="wnpc-faction-form">
      <table class="wodx-table"><thead><tr><th>Founder</th>${F.PLEDGE_KEYS.map(k => `<th>${KEY_LABEL[k]}</th>`).join("")}</tr></thead><tbody>${grid}</tbody></table>
      <div class="wodx-field"><label>Leader</label><select name="leader" data-fixed>${chosen.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select></div>
      <div class="wodx-field"><label>Notes</label><textarea name="notes" rows="2" maxlength="1000"></textarea></div></div>`,
    [{action: "found", label: gm ? "Found it" : "Ask the Storyteller", default: true, callback: formOf}, {action: "cancel", label: "Cancel"}], 760);
    if ( !second || second === "cancel" ) return null;
    const founders = chosen.map(a => ({id: a.id, pledge: Object.fromEntries(F.PLEDGE_KEYS.map(k => [k, num(second[`p.${a.id}.${k}`])]))}));
    const owners = chosen.filter(a => a.hasPlayerOwner).map(a => a.id);
    const spec = {name: String(first.name || "").trim() || "A new faction", kind: first.kind, sphere: first.sphere, secret: !!first.secret,
      owners, run: owners.length && first.orders ? "orders" : "auto", leader: second.leader, notes: second.notes ?? ""};
    return {spec, founders};
  }

  /**
   * The Storyteller's side of a founding: the dots each founder holds are read from the sheets here, never taken from
   * the request. Returns {faction, pledged, changes}.
   */
  function buildFounding(spec, founders, {user = game.user} = {}) {
    const allowed = new Set(mine(user).map(a => a.id));
    const list = (founders ?? []).filter(p => allowed.has(p.id)).map(p => ({id: p.id, pledge: p.pledge ?? {}, has: hasOf(game.actors.get(p.id))}));
    if ( !list.length ) return null;
    const owners = (spec.owners ?? []).filter(id => list.some(p => p.id === id));
    const leader = list.some(p => p.id === spec.leader) ? spec.leader : list[0].id;
    const {faction, pledged} = F.foundFaction({...spec, id: foundry.utils.randomID(), owners, leader, year: fx.eraInfo().year}, list);
    return {faction, pledged, changes: [{op: "faction-add", faction}]};
  }
  const pledgeWords = pledged => pledged.map(p => `${game.actors.get(p.id)?.name ?? "someone"} ${KEY_LABEL[p.key]} ${p.dots}`).join(", ") || "no dots";

  /** The Storyteller founds a faction: it is added at once, with an Undo card. */
  async function foundDialog() {
    if ( !game.user.isGM ) return requestFounding();
    const asked = await askFounding();
    if ( !asked ) return null;
    const built = buildFounding(asked.spec, asked.founders);
    if ( !built ) return null;
    const done = await fx.applyNow(built.changes);
    await fx.mutate(st => { st.lastTurn ??= game.time.worldTime; return {state: st}; });
    await ChatMessage.create({whisper: gmIds(), speaker: {alias: "WoDX factions"}, flags: {[MOD]: {factionEnd: {inverse: done.inverse, undone: false}}},
      content: `<div class="wodx-card wnpc wnpc-faction"><h3>${esc(built.faction.name)} is founded</h3><p>Pledged: ${esc(pledgeWords(built.pledged))}.</p>
        <p class="wodx-quiet">The founders' sheets are unchanged; mark the pledged dots there if they now belong to the faction.</p>
        <div class="wnpc-done"><button type="button" class="wnpc-f-undo" data-key="factionEnd">Undo</button></div></div>`});
    return built.faction;
  }

  /** A player asks to found a faction; the request waits in the Storyteller's approval queue. */
  async function requestFounding() {
    if ( setting("playerFactions") === false ) { ui.notifications.warn("The Storyteller has not opened faction founding to players."); return null; }
    if ( !anyGM() ) { ui.notifications.warn("No Storyteller is here to hear the request."); return null; }
    const asked = await askFounding();
    if ( !asked ) return null;
    game.socket.emit(SOCKET, {type: "faction.found", userId: game.user.id, spec: asked.spec, founders: asked.founders});
    ui.notifications.info("Your request goes to the Storyteller.");
    return {sent: true};
  }
  async function onFoundRequest(m) {
    const user = game.users.get(m.userId);
    if ( !user || setting("playerFactions") === false ) return null;
    const built = buildFounding(m.spec ?? {}, m.founders ?? [], {user});
    if ( !built ) return null;
    return fx.proposeChanges(`${user.name} asks to found ${built.faction.name}`, `Founders: ${built.faction.members.map(id => game.actors.get(id)?.name ?? "someone").join(", ")}. Pledged: ${pledgeWords(built.pledged)}. ${built.faction.notes}`,
      built.changes, {key: `found:${built.faction.id}`, kind: "found", extra: {userId: user.id, pledged: built.pledged}});
  }

  /* ------------------------------------------------------------------ */
  /*  Orders for a faction the players run                               */
  /* ------------------------------------------------------------------ */

  const ownedBy = (s, user = game.user) => { const ids = new Set(mine(user).filter(a => user.isGM || a.hasPlayerOwner).map(a => a.id)); return s.factions.filter(f => f.owners.some(id => ids.has(id))); };
  /** The factions a player may aim at: those not secret, and any their own faction already has a view of. */
  const aimable = (s, f) => s.factions.filter(o => o.id !== f.id && !o.dormant && (!o.secret || o.id in f.standing));

  async function ordersDialog(id) {
    const s = fx.state(), f = s.factions.find(x => x.id === id);
    if ( !f ) return null;
    const era = fx.eraInfo(), targets = aimable(s, f);
    const moves = Object.fromEntries(Object.entries(F.MOVES).map(([k, m]) => [k, `${m.label}: ${m.hint}`]));
    const data = await dialog(`Orders: ${f.name}`, `<div class="wnpc-faction-form">
      <div class="wodx-field"><label>Move</label><select name="move" data-fixed>${opt(moves, f.orders?.move ?? "recruit")}</select></div>
      <div class="wodx-field"><label>Against</label><select name="target"><option value="">No one</option>${targets.map(o => `<option value="${o.id}"${o.id === f.orders?.target ? " selected" : ""}>${esc(o.name)}</option>`).join("")}</select></div>
      <div class="wodx-field"><label>Sphere</label><select name="sphere" data-fixed><option value="">Its strongest</option>${opt(era.spheres, f.orders?.sphere)}</select></div>
      <p class="wodx-quiet">The faction carries these out at its next turn, rolled as any faction's move. Scheme and Hunt need someone to move against; without one it recruits.</p></div>`,
    [{action: "give", label: "Give the orders", default: true, callback: formOf}, {action: "cancel", label: "Cancel"}], 560);
    if ( !data || data === "cancel" ) return null;
    const orders = F.normOrders({move: data.move, target: data.target, sphere: data.sphere, by: game.user.name});
    if ( !orders ) return null;
    if ( isActiveGM() ) return setOrders(f.id, orders, game.user);
    if ( !anyGM() ) { ui.notifications.warn("No Storyteller is here to take the orders."); return null; }
    game.socket.emit(SOCKET, {type: "faction.orders", userId: game.user.id, faction: f.id, orders});
    ui.notifications.info(`Orders sent for ${f.name}.`);
    return {sent: true};
  }
  async function setOrders(factionId, orders, user) {
    const s = fx.state(), f = s.factions.find(x => x.id === factionId);
    if ( !f || !user || !ownedBy(s, user).some(x => x.id === f.id) ) return null;
    const o = F.normOrders(orders);
    if ( o?.target && !aimable(s, f).some(x => x.id === o.target) ) o.target = null;
    const done = await fx.applyNow([{op: "faction-set", faction: f.id, set: {orders: o}}]);
    const label = o ? F.MOVES[o.move].label : "none";
    await ChatMessage.create({whisper: [...new Set([...gmIds(), user.id])], speaker: {alias: "WoDX factions"},
      content: `<div class="wodx-card wnpc wnpc-faction"><p>${esc(f.name)} has its orders from ${esc(user.name)}: ${esc(label)}${o?.target ? ` against ${esc(s.factions.find(x => x.id === o.target)?.name ?? "")}` : ""}.</p></div>`});
    return done;
  }

  /* ------------------------------------------------------------------ */
  /*  The players' window                                                */
  /* ------------------------------------------------------------------ */

  /**
   * NPC 0.29.0: the politics of each faction a player's character belongs to, as that character sees it (B1116):
   * who holds the seats, when it next gathers, and the character's own standing, seats, favour, claims and charges.
   */
  function courtRows(s, n) {
    const ids = mine(game.user).filter(a => game.user.isGM || a.hasPlayerOwner).map(a => a.id), year = fx.eraInfo().year;
    const out = [];
    for ( const f of s.factions.filter(x => !x.dormant && x.members.some(id => ids.includes(id))) ) {
      const v = PO.playerView(f, ids, {year, info: fx.politicsInfo({factions: [f]}), names: n});
      if ( !v ) continue;
      const seats = v.seats.filter(o => o.holders.length).map(o => `${o.title}: ${o.holders.join(", ")}`);
      const people = v.people.map(x => `<li><b>${esc(x.name)}</b>: ${esc(v.rank)} ${x.rank}${x.offices.length ? `; holds ${esc(x.offices.join(", "))}` : ""}${x.favour ? `; favour ${x.favour}` : ""}${x.claims.length ? `; has a claim on ${esc(x.claims.join(", "))}` : ""}${x.charges.length ? `; <b>charged with ${esc(x.charges.join("; "))}</b>` : ""}.</li>`).join("");
      out.push(`<fieldset><legend>${esc(f.name)}: ${esc(v.label)}</legend>
        <p>${seats.length ? esc(seats.join("; ")) + "." : "No seats are held yet."}</p>
        <ul class="wnpc-lines">${people}</ul>
        <p class="wodx-quiet">The ${esc(v.gathering)} meets ${v.nextIn === 1 ? "at the next faction turn" : `in ${v.nextIn} faction turns`}. Its law: ${esc(v.law.join("; "))}.</p></fieldset>`);
    }
    return out.length ? `<h3>Politics inside your factions</h3>${out.join("")}` : "";
  }
  async function openPlayer() {
    const s = fx.state(), own = ownedBy(s), n = fx.names(s);
    const rows = own.map(f => {
      const a = f.assets, bits = ["herd", "resources", "status", "retainers", "contacts", "domain"].filter(k => a[k]).map(k => `${F.ASSETS[k]} ${a[k]}`);
      for ( const [k, v] of Object.entries(a.influence) ) bits.push(`Influence (${n.sphere(k)}) ${v}`);
      return `<li><b>${esc(f.name)}</b>${f.dormant ? " (no longer active)" : ""}: ${esc(bits.join(", ") || "no dots yet")}.<br><span class="wodx-quiet">${f.run === "orders" ? (f.orders ? `Orders for its next turn: ${esc(F.MOVES[f.orders.move].label)}.` : "It waits for your orders.") : "Its turns are picked for it."}</span></li>`;
    }).join("");
    const politics = setting("factionPolitics") ? courtRows(s, n) : "";
    const buttons = [];
    if ( setting("playerFactions") !== false ) buttons.push({action: "found", label: "Found a faction…"});
    for ( const f of own.filter(x => !x.dormant && x.run === "orders") ) buttons.push({action: `o:${f.id}`, label: `Orders: ${f.name}`.slice(0, 60)});
    buttons.push({action: "close", label: "Close", default: true});
    const pick = await dialog("Your factions", `<div class="wnpc-faction-form">${rows ? `<ul class="wnpc-lines">${rows}</ul>` : `<p>None of your characters runs a faction.</p>`}${politics}
      <p class="wodx-quiet">A faction acts once a week of world time. Every founding waits for the Storyteller.</p></div>`, buttons, 560);
    if ( pick === "found" ) return requestFounding();
    if ( typeof pick === "string" && pick.startsWith("o:") ) return ordersDialog(pick.slice(2));
    return null;
  }

  function hooks() {
    Hooks.once("ready", () => {
      game.socket.on(SOCKET, async m => {
        if ( !isActiveGM() || !m?.type?.startsWith?.("faction.") ) return;
        try {
          if ( m.type === "faction.found" ) await onFoundRequest(m);
          else if ( m.type === "faction.orders" ) await setOrders(m.faction, m.orders, game.users.get(m.userId));
        } catch (e) { console.error(`${MOD} | factions`, e); }
      });
    });
  }

  return {foundDialog, requestFounding, onFoundRequest, buildFounding, ordersDialog, setOrders, openPlayer, ownedBy, hooks};
}
