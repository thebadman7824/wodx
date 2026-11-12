import * as TR from "./ties-rules.mjs";
import * as SX from "./secrets-rules.mjs";
import * as OP from "./opinion-rules.mjs";
import {ratingsOf, ratingFrom} from "../../wodx-chronicle/scripts/when-rules.mjs";
import {describeTime} from "../../wodx-chronicle/scripts/calendar.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

/**
 * WoDX NPC 0.33.0: people and what binds them, on the Foundry side (B1500-B1508).
 *  - ties: every relationship WoDX keeps, read from both ends (ties-rules.mjs), for WoDX Sheets' Relationships tab;
 *  - the family and lineage tree window: sires and childer, domitors and ghouls, family, heirs, mentors, retainers;
 *  - secrets: kept on the holder, found by digging (Investigation, Auspex, spies) or a clue, each find a hook in the
 *    Ledger (secrets-rules.mjs), laid bare in the faction politics turn;
 *  - why an NPC feels as they do: the reasons behind an attitude, on the talk card and the sheet, for the Storyteller.
 */
export function build({MOD, esc, chron, gmIds, isActiveGM, attitude, rivalry}) {
  const st = () => (game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api : null);
  const ledgerEntries = () => { try { return game.settings.get("wodx-storyteller", "ledger")?.entries ?? []; } catch (e) { return []; } };
  const people = () => [...(game.actors ?? [])].filter(a => !a.flags?.[MOD]?.passerbyBase);
  const worldOf = x => { const a = x?.actor ?? x; return typeof a === "string" ? game.actors.get(a) : a?.id ? (game.actors.get(a.id) ?? a) : null; };
  const dateOf = t => { try { return describeTime(Number(t) || 0).dateLabel; } catch (e) { return ""; } };
  const card = html => `<div class="vta-card wodx-x wnpc"><div class="vta-body">${html}</div></div>`;
  const ownersOf = a => game.users.filter(u => !u.isGM && a?.testUserPermission?.(u, "OWNER")).map(u => u.id);

  /* ---------------------------------------------------------------- */
  /*  Ties                                                            */
  /* ---------------------------------------------------------------- */

  function allEdges() {
    return TR.hideBySecrets(TR.edges(people(), {ledger: ledgerEntries()}), id => SX.secretsOf(game.actors.get(id)?.flags));
  }
  /** What a user may see: their own characters, and the secrets those characters found (or that are out). */
  function viewerFor(user = game.user) {
    const mine = new Set(user.isGM ? [] : game.actors.filter(a => a.testUserPermission?.(user, "OWNER")).map(a => a.id));
    const found = new Set();
    for ( const a of game.actors ) for ( const s of SX.secretsOf(a.flags) ) {
      if ( s.public || Object.keys(s.found).some(f => mine.has(f)) ) found.add(`${a.id}:${s.id}`);
    }
    return {gm: !!user.isGM, mine, found};
  }
  /** One actor's links as this user may see them: [{kind, label, group, to, uuid, note, source, hidden, secret, hand}]. */
  function tiesOf(actorLike, {user = game.user, list = null} = {}) {
    const a = worldOf(actorLike);
    if ( !a ) return [];
    const v = viewerFor(user);
    return TR.tiesOf(a.id, list ?? allEdges()).filter(e => TR.visibleTo(e, v))
      .map(e => ({...e, label: TR.KINDS[e.kind]?.label ?? e.kind, group: TR.KINDS[e.kind]?.group ?? "other", groupLabel: TR.GROUPS[TR.KINDS[e.kind]?.group] ?? "Other"}));
  }

  /* ---------------------------------------------------------------- */
  /*  The family and lineage tree                                     */
  /* ---------------------------------------------------------------- */

  const mayOpen = id => { const a = game.actors.get(id); return !!a && (game.user.isGM || a.testUserPermission?.(game.user, "LIMITED")); };
  function nodeHtml(n, {root = false} = {}) {
    if ( n.unknown ) return `<span class="wodx-quiet wnpc-tree-unknown">${esc(n.name)}</span>`;
    const name = n.id && mayOpen(n.id) ? `<a class="wnpc-tree-name" data-open="${esc(n.id)}">${esc(n.name)}</a>` : `<span>${esc(n.name)}</span>`;
    const recentre = n.id && !root && mayOpen(n.id) ? ` <a class="wnpc-tree-root" data-root="${esc(n.id)}" title="Draw the tree from here" aria-label="Draw the tree from ${esc(n.name)}"><i class="fa-solid fa-sitemap"></i></a>` : "";
    const hid = game.user.isGM && n.hidden ? ` <i class="fa-solid fa-eye-slash" title="Hidden from players until found out"></i>` : "";
    return `${root ? `<b>${name}</b>` : name}${n.note ? ` <span class="wodx-quiet">(${esc(n.note)})</span>` : ""}${hid}${recentre}`;
  }
  const kidsHtml = kids => (kids?.length ? `<ul>${kids.map(k => `<li>${nodeHtml(k)}${kidsHtml(k.kids)}</li>`).join("")}</ul>` : "");
  function treeHtml(actor) {
    const names = Object.fromEntries(game.actors.map(x => [x.id, x.name]));
    const t = TR.treeFor(actor.id, allEdges(), {viewer: viewerFor(), names, isVampire: id => game.actors.get(id)?.type === "Vampire"});
    const rootNode = {id: actor.id, name: actor.name};
    const lines = t.lines.map(L => {
      // Oldest first, down to this person, then theirs below
      let inner = `<li>${nodeHtml(rootNode, {root: true})}${kidsHtml(L.down)}</li>`;
      for ( const n of L.up ) inner = `<li>${nodeHtml(n)}<ul>${inner}</ul></li>`;
      return `<section class="wnpc-tree-line"><h3>${esc(L.label)}</h3><ul class="wnpc-tree">${inner}</ul></section>`;
    }).join("");
    const side = t.side?.length ? `<section class="wnpc-tree-line"><h3>Also</h3><ul data-fixed>${t.side.map(s => `<li>${esc(s.label)}: ${nodeHtml(s)}</li>`).join("")}</ul></section>` : "";
    return `<div class="wnpc-tree-wrap">${lines || side ? `${lines}${side}` : `<p>No family, blood or teaching ties are recorded for ${esc(actor.name)} yet.</p>`}
      <p class="wodx-quiet">From the lineage WoDX keeps, each sheet's Sire box and Relationships tab, and Allies and Retainers. A tie that is still a secret shows as Unknown until it is found out.</p></div>`;
  }
  async function openTree(actorLike) {
    let actor = worldOf(actorLike) ?? canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character ?? null;
    if ( !actor ) return ui.notifications.warn("Pick a character: select a token or open the tree from a sheet.");
    if ( !game.user.isGM && !actor.testUserPermission?.(game.user, "LIMITED") ) return null;
    const D = foundry.applications.api.DialogV2;
    const dlg = new D({window: {title: `Family and lineage: ${actor.name}`, icon: "fa-solid fa-sitemap", resizable: true}, classes: ["wodx-dialog", "wodx-npc-dialog", "wnpc-tree-dialog"],
      position: {width: 560, height: "auto"}, content: treeHtml(actor), buttons: [{action: "close", label: "Close", default: true}], rejectClose: false});
    await dlg.render(true);
    dlg.element?.addEventListener("click", ev => {
      const o = ev.target.closest("[data-open]"), r = ev.target.closest("[data-root]");
      if ( o ) { ev.preventDefault(); game.actors.get(o.dataset.open)?.sheet?.render(true); }
      if ( r ) {
        ev.preventDefault();
        const next = game.actors.get(r.dataset.root);
        if ( !next ) return;
        actor = next;
        const box = dlg.element.querySelector(".wnpc-tree-wrap");
        if ( box ) box.outerHTML = treeHtml(next);
        const title = dlg.element.querySelector(".window-title");
        if ( title ) title.textContent = `Family and lineage: ${next.name}`;
      }
    });
    return dlg;
  }

  /* ---------------------------------------------------------------- */
  /*  Secrets                                                         */
  /* ---------------------------------------------------------------- */

  const secretsOf = a => SX.secretsOf(worldOf(a)?.flags);
  async function saveSecrets(actorLike, list) {
    const a = worldOf(actorLike);
    if ( !game.user.isGM || !a ) return null;
    return a.setFlag(MOD, "secrets", (list ?? []).map(SX.normSecret).filter(s => s.text || s.tie));
  }
  async function addSecret(actorLike, data = {}) {
    const a = worldOf(actorLike);
    if ( !game.user.isGM || !a ) return null;
    const s = SX.normSecret(data);
    await saveSecrets(a, [...secretsOf(a), s]);
    return s;
  }
  /** The secrets a character has found: [{holder, secret}]. */
  function knownBy(actorLike) {
    const a = worldOf(actorLike);
    if ( !a ) return [];
    const out = [];
    for ( const h of game.actors ) if ( h.id !== a.id ) for ( const s of SX.secretsOf(h.flags) ) if ( s.found[a.id] || s.public ) out.push({holder: {id: h.id, name: h.name}, secret: s, mine: !!s.found[a.id]});
    return out;
  }
  /** Storyteller: the finder learns the secret. A hook goes into the Ledger. Returns the secret, or null. */
  async function reveal(holderLike, secretId, finderLike, {how = ""} = {}) {
    const holder = worldOf(holderLike), finder = worldOf(finderLike);
    if ( !game.user.isGM || !holder || !finder || holder.id === finder.id ) return null;
    const list = secretsOf(holder), s = list.find(x => x.id === secretId);
    if ( !s ) return null;
    if ( s.found[finder.id] ) return s;
    let entry = null;
    try { entry = (await st()?.ledger?.save?.(SX.hookEntry(s, holder, finder, game.time.worldTime)))?.id ?? null; } catch (e) { entry = null; }
    await holder.setFlag(MOD, "secrets", SX.withFound(list, s.id, finder.id, {at: game.time.worldTime, how, entry}));
    const what = s.text || SX.SECRET_KINDS[s.kind].label;
    await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: [...new Set([...ownersOf(finder), ...gmIds()])],
      content: card(`<p><b>${esc(finder.name)} finds out a secret of ${esc(holder.name)}:</b> ${esc(what)}.</p>${how ? `<p class="wodx-quiet">How: ${esc(how)}.</p>` : ""}`
        + `<p class="wodx-quiet">${entry ? "A hook: the Ledger now holds a major boon owed for it. Spend it, or bring it before the court." : "Keep it, spend it, or bring it before the court."}</p>`)});
    Hooks.callAll("wodxSecretFound", {holder, finder, secret: s, entry});
    return s;
  }
  /** A clue's "secret <words>" outcome: the best match among the secrets the character has not found. */
  async function revealByText(text, finderLike, opts = {}) {
    const finder = worldOf(finderLike);
    if ( !finder ) return null;
    const pool = [];
    for ( const h of game.actors ) if ( h.id !== finder.id ) for ( const s of SX.secretsOf(h.flags) ) if ( !SX.knownBy(s, finder.id) ) pool.push({holder: h, secret: s});
    const hit = SX.matchText(pool, text);
    return hit ? reveal(hit.holder, hit.secret.id, finder, opts) : null;
  }
  /** The faction politics turn laid a secret bare: everyone knows it now, and the hook is spent. */
  async function expose(holderLike, secretId, {by = null, entry = null, why = ""} = {}) {
    const holder = worldOf(holderLike);
    if ( !game.user.isGM || !holder ) return null;
    const list = secretsOf(holder), s = list.find(x => x.id === secretId);
    if ( !s || s.public ) return s ?? null;
    await holder.setFlag(MOD, "secrets", list.map(x => x.id === secretId ? {...x, public: true} : x));
    if ( entry ) { try { await st()?.ledger?.status?.(entry, "void"); } catch (e) { /* Ledger off */ } }
    const who = by ? game.actors.get(by)?.name ?? "Someone" : "Someone";
    await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), content: card(`<p><b>A secret laid bare:</b> ${esc(who)} shows the court that ${esc(holder.name)} is guilty of ${esc(why || SX.SECRET_KINDS[s.kind].law)}${s.text ? ` (${esc(s.text)})` : ""}.</p><p class="wodx-quiet">Everyone knows it now; the hook is spent.</p>`)});
    Hooks.callAll("wodxSecretExposed", {holder, secret: s, by});
    return s;
  }

  /** The dice a character brings to a method of digging. Returns {pool, diff, why} or {why} when they cannot. */
  function digPool(finder, holder, method) {
    const M = SX.METHODS[method];
    if ( !M ) return {why: "No such way to dig."};
    const r = ratingsOf(finder, s => game.i18n.localize(s));
    if ( M.need?.auspex && ratingFrom(r, "auspex") < M.need.auspex ) return {why: `${finder.name} needs Auspex ${M.need.auspex}.`};
    if ( M.need?.background && !M.need.background.some(b => ratingFrom(r, b) > 0) ) return {why: `${finder.name} needs Spies or Contacts.`};
    const pool = M.pool.reduce((n, k) => n + ratingFrom(r, k), 0);
    let diff = M.diff;
    if ( diff === "willpower" ) diff = Number(holder.system?.advantages?.willpower?.temporary ?? holder.system?.advantages?.willpower?.permanent) || 6;
    return {pool, diff, why: `${M.pool.map(k => k[0].toUpperCase() + k.slice(1)).join(" + ")} (${pool} dice), difficulty ${diff}`};
  }
  async function dig(holderLike, finderLike, method = "investigate") {
    const holder = worldOf(holderLike), finder = worldOf(finderLike);
    if ( !game.user.isGM || !holder || !finder ) return null;
    const p = digPool(finder, holder, method);
    if ( p.pool === undefined ) { ui.notifications.warn(p.why); return null; }
    const res = SX.dig({secrets: secretsOf(holder), method, charId: finder.id, pool: p.pool, diff: p.diff});
    const M = SX.METHODS[method];
    const dice = res.roll.dice.join(", ") || "no dice";
    let line;
    if ( !res.secret ) line = `There is nothing more ${M.label.toLowerCase()} can find on ${esc(holder.name)}.`;
    else if ( res.found ) line = `<b>Found.</b>`;
    else if ( res.botch ) line = `<b>A botch:</b> ${esc(holder.name)} hears that someone is asking questions.`;
    else line = `Not enough: ${res.roll.net} of ${res.need} successes.`;
    await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), content: card(`<p>${esc(finder.name)} digs into ${esc(holder.name)} by ${esc(M.label.toLowerCase())} (${esc(M.time)}): ${esc(p.why)}.</p><p class="wodx-quiet">Dice: ${esc(dice)}.</p><p>${line}</p>`)});
    if ( res.found ) await reveal(holder, res.secret.id, finder, {how: M.label});
    return res;
  }

  async function openSecrets(actorLike) {
    const actor = worldOf(actorLike) ?? canvas?.tokens?.controlled?.[0]?.actor ?? null;
    if ( !game.user.isGM ) return null;
    if ( !actor ) return ui.notifications.warn("Select a token or open Secrets from a sheet.");
    const list = secretsOf(actor);
    const links = tiesOf(actor).filter(e => e.to.id);
    const kindOpts = sel => Object.entries(SX.SECRET_KINDS).map(([k, v]) => `<option value="${k}"${k === sel ? " selected" : ""}>${esc(v.label)}</option>`).join("");
    const tieOpts = sel => [`<option value="">No tie</option>`, ...links.map(e => { const v = `${e.kind}|${e.to.id}`; return `<option value="${esc(v)}"${sel === v ? " selected" : ""}>${esc(`${e.label}: ${e.to.name}`)}</option>`; })].join("");
    const name = id => game.actors.get(id)?.name ?? "someone gone";
    const row = (s, i) => `<fieldset class="wnpc-secret" data-search-item><legend>${s.text ? esc(s.text.slice(0, 40)) : "A new secret"}</legend>
      <input type="hidden" name="s.${i}.id" value="${esc(s.id)}">
      <label>What <input type="text" name="s.${i}.text" value="${esc(s.text)}" placeholder="Diablerised their sire in 1403"></label>
      <label>Kind <select name="s.${i}.kind" data-fixed>${kindOpts(s.kind)}</select></label>
      <label>How much <select name="s.${i}.weight" data-fixed><option value="1"${s.weight === 1 ? " selected" : ""}>It matters</option><option value="2"${s.weight === 2 ? " selected" : ""}>Grave</option></select></label>
      <label>Hides a tie <select name="s.${i}.tie" data-fixed>${tieOpts(s.tie ? `${s.tie.kind}|${s.tie.id}` : "")}</select></label>
      <label><input type="checkbox" name="s.${i}.public"${s.public ? " checked" : ""}> Everyone knows</label>
      <label><input type="checkbox" name="s.${i}.drop"> Remove</label>
      <p class="wodx-quiet">${Object.keys(s.found).length ? `Found by ${Object.entries(s.found).map(([f, x]) => `${esc(name(f))}${x.how ? ` (${esc(x.how)})` : ""}`).join(", ")}.` : "Nobody has found it out."}</p></fieldset>`;
    const blank = SX.normSecret({});
    const finders = game.actors.filter(a => a.id !== actor.id && !a.flags?.[MOD]?.passerbyBase).sort((a, b) => (b.hasPlayerOwner - a.hasPlayerOwner) || a.name.localeCompare(b.name));
    const content = `<div class="wnpc-edit-form">
      <p class="wodx-quiet">What ${esc(actor.name)} hides. Whoever finds one holds a hook: a major boon in the Ledger, or a charge that sticks in the faction politics turn. Who cares about which kind changes with the court and the age. Players never see this window.</p>
      ${list.length > 4 ? searchBox(".wnpc-secrets", "Search secrets…", "Search secrets") : ""}
      <div class="wodx-scroll wnpc-secrets" style="max-height:380px">${list.map(row).join("")}${row(blank, list.length)}</div>
      <fieldset><legend>Let someone dig</legend>
        <label>Who <select name="finder" data-fixed>${finders.map(a => `<option value="${a.id}">${esc(a.name)}${a.hasPlayerOwner ? "" : " (NPC)"}</option>`).join("")}</select></label>
        <label>How <select name="method" data-fixed>${Object.entries(SX.METHODS).map(([k, m]) => `<option value="${k}">${esc(m.label)}</option>`).join("")}</select></label>
        <label>Or tell them which <select name="tell" data-fixed><option value="">Roll for it</option>${list.map(s => `<option value="${esc(s.id)}">${esc(s.text || SX.SECRET_KINDS[s.kind].label)}</option>`).join("")}</select></label>
      </fieldset></div>`;
    const data = await foundry.applications.api.DialogV2.wait({window: {title: `Secrets: ${actor.name}`, icon: "fa-solid fa-user-secret", resizable: true}, classes: ["wodx-dialog", "wodx-npc-dialog"],
      position: {width: 620, height: "auto"}, content, rejectClose: false,
      buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => ({act: "save", ...new foundry.applications.ux.FormDataExtended(b.form).object})},
        {action: "dig", label: "Save and dig", callback: (ev, b) => ({act: "dig", ...new foundry.applications.ux.FormDataExtended(b.form).object})},
        {action: "cancel", label: "Cancel"}]});
    if ( !data || typeof data !== "object" ) return null;
    const next = [];
    for ( let i = 0; i <= list.length; i++ ) {
      if ( data[`s.${i}.drop`] ) continue;
      const old = list.find(x => x.id === data[`s.${i}.id`]) ?? {};
      const [tk, tid] = String(data[`s.${i}.tie`] ?? "").split("|");
      const s = SX.normSecret({...old, id: data[`s.${i}.id`], text: data[`s.${i}.text`], kind: data[`s.${i}.kind`], weight: Number(data[`s.${i}.weight`]), tie: tid ? {kind: tk, id: tid} : null, public: !!data[`s.${i}.public`]});
      if ( s.text || s.tie || Object.keys(s.found).length ) next.push(s);
    }
    await saveSecrets(actor, next);
    if ( data.act === "dig" && data.finder ) {
      if ( data.tell ) await reveal(actor, data.tell, data.finder, {how: "told by the Storyteller"});
      else await dig(actor, data.finder, data.method);
    }
    return next;
  }

  /* ---------------------------------------------------------------- */
  /*  Why an NPC feels as they do                                     */
  /* ---------------------------------------------------------------- */

  const SAME = ["clan", "tribe", "tradition", "kith", "house", "sect", "legion", "creed"];
  const fieldOf = (a, k) => { const v = a?.system?.[k]; const t = typeof v === "string" ? v : typeof v?.value === "string" ? v.value : ""; return t.startsWith("wod.") ? game.i18n.localize(t) : t; };
  function reasons(npcLike, charLike) {
    const npc = worldOf(npcLike), ch = worldOf(charLike);
    if ( !npc || !ch || !attitude ) return null;
    const att = attitude.of(npc, ch);
    const entry = attitude.rules.entryFor(npc.flags?.[MOD]?.attitude ?? {}, ch.id);
    const seed = entry ? null : attitude.seedFor(npc, ch.id);
    const links = TR.tiesOf(npc.id, allEdges()).filter(e => e.to.id === ch.id).map(e => ({kind: e.kind, label: TR.KINDS[e.kind]?.label ?? e.kind, note: e.note}));
    const secrets = [...SX.secretsOf(npc.flags).filter(s => s.found[ch.id]).map(s => ({holderIsNpc: true, text: s.text || SX.SECRET_KINDS[s.kind].label})),
      ...SX.secretsOf(ch.flags).filter(s => s.found[npc.id]).map(s => ({holderIsNpc: false, text: s.text || SX.SECRET_KINDS[s.kind].label}))];
    const same = SAME.map(k => [k, fieldOf(npc, k)]).filter(([k, v]) => v && v.toLowerCase() === fieldOf(ch, k).toLowerCase()).map(([k, v]) => `${k} (${v})`);
    let rival = null;
    try {
      const t = id => canvas?.tokens?.placeables?.find(x => x.actor && (x.actor.id === id || x.document.actorId === id));
      const a = t(npc.id), b = t(ch.id);
      if ( a && b && rivalry?.regardOf ) rival = rivalry.regardOf(a, b);
    } catch (e) { rival = null; }
    return OP.reasonsFor({att, entry, seed: seed ?? {step: 0, from: ""}, ledger: ledgerEntries(), npcId: npc.id, pcId: ch.id, links, secrets,
      fought: npc.flags?.[MOD]?.fought?.[ch.id] ?? null, same, rival, date: dateOf});
  }
  function reasonsHtml(r, {name = ""} = {}) {
    if ( !r ) return "";
    const set = r.set.map(x => `<li><b>${esc(x.label)}</b> ${esc(x.why)}</li>`).join("");
    const weigh = r.weigh.map(x => `<li${x.tone ? ` class="wnpc-why-${x.tone}"` : ""}>${esc(x.why)}</li>`).join("");
    return `<div class="wnpc-why">${name ? `<p><b>${esc(name)}</b>: ${esc(r.word)}</p>` : ""}<ul data-fixed>${set}</ul>${weigh ? `<p class="wodx-quiet">Also on their mind:</p><ul data-fixed>${weigh}</ul>` : ""}</div>`;
  }
  /** For WoDX Sheets: every character this NPC has met or has a link to, with the reasons. Storyteller only. */
  function regardHtml(npcLike) {
    const npc = worldOf(npcLike);
    if ( !game.user.isGM || !npc || npc.hasPlayerOwner ) return "";
    const met = Object.keys(npc.flags?.[MOD]?.attitude ?? {});
    const linked = TR.tiesOf(npc.id, allEdges()).map(e => e.to.id).filter(id => game.actors.get(id)?.hasPlayerOwner);
    const ids = [...new Set([...met, ...linked])].filter(id => game.actors.get(id));
    if ( !ids.length ) return `<p class="wodx-quiet">${esc(npc.name)} has not met any player's character yet.</p>`;
    return ids.map(id => reasonsHtml(reasons(npc, id), {name: game.actors.get(id).name})).join("");
  }

  /** On the Storyteller's screen only: the reasons under each talk card. */
  function onRenderMessage(message, html) {
    if ( !game.user.isGM ) return;
    const t = message.flags?.[MOD]?.talk;
    if ( !t?.actor ) return;
    const el = html?.[0] ?? html;
    if ( !el?.querySelector || el.querySelector(".wnpc-why") ) return;
    const scene = game.scenes.get(message.speaker?.scene), tok = scene?.tokens?.get(message.speaker?.token);
    const npc = tok?.actor ? (game.actors.get(tok.actorId) ?? tok.actor) : null;
    if ( !npc || npc.hasPlayerOwner ) return;
    let r = null;
    try { r = reasons(npc, t.actor); } catch (e) { r = null; }
    if ( !r ) return;
    el.querySelector(".vta-body")?.insertAdjacentHTML("beforeend", `<details class="wnpc-why-box"><summary>Why ${esc(npc.name)} feels ${esc(r.word.toLowerCase())} (only you see this)</summary>${reasonsHtml(r)}</details>`);
  }

  /** When a fight ends, each NPC remembers the characters on the other side. */
  async function onCombatEnd(combat) {
    if ( !isActiveGM() || !(combat?.round > 0) ) return;
    const sides = combat.getFlag?.("wodx-combat", "sides") ?? null;
    const cs = combat.combatants?.contents ?? [];
    const now = game.time.worldTime;
    const enemies = (a, b) => {
      if ( sides && sides[a.tokenId] && sides[b.tokenId] ) return sides[a.tokenId] !== sides[b.tokenId];
      const da = a.token?.disposition, db = b.token?.disposition;
      return Number.isFinite(da) && Number.isFinite(db) && da !== db && da !== 0 && db !== 0;
    };
    const writes = new Map();
    for ( const n of cs ) {
      const npc = n.actor ? (game.actors.get(n.token?.actorId ?? n.actor.id) ?? null) : null;
      if ( !npc || npc.hasPlayerOwner ) continue;
      for ( const p of cs ) {
        const pc = p.actor ? game.actors.get(p.actor.id) : null;
        if ( !pc?.hasPlayerOwner || !enemies(n, p) ) continue;
        if ( !writes.has(npc.id) ) writes.set(npc.id, {});
        writes.get(npc.id)[`flags.${MOD}.fought.${pc.id}`] = now;
      }
    }
    for ( const [id, upd] of writes ) await game.actors.get(id)?.update(upd).catch(e => console.warn(`${MOD} | fought`, e));
  }

  function hooks() {
    Hooks.on("renderChatMessageHTML", onRenderMessage);
    Hooks.on("deleteCombat", c => { onCombatEnd(c).catch(e => console.warn(`${MOD} | combat end`, e)); });
  }

  return {
    ties: {of: tiesOf, edges: allEdges, viewerFor, rules: TR},
    openTree,
    secrets: {of: secretsOf, save: saveSecrets, add: addSecret, knownBy, reveal, revealByText, expose, dig, digPool, open: openSecrets, rules: SX},
    opinion: {reasons, html: reasonsHtml, regardHtml, rules: OP},
    hooks
  };
}
