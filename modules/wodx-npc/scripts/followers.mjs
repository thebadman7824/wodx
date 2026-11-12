/**
 * WoDX NPC 0.41.0: one window for all of a character's followers (followers-rules.mjs has the rules; B1820-B1822).
 *
 * Opened from the sheet's Relationships tab, from the token tools (the user's own character, or the selected one) or
 * api.openFollowers(actor). Each ghoul, retainer, ally, herd member, contact or follower that serves the character:
 * where it is, its order or errand, loyalty and its last change with the reason, the blood bond step, and open
 * trouble. Followers on the scene being viewed get the everyday orders as buttons; "Give an order" opens the full
 * order window with the follower and the master already picked. A player sees their own characters' followers only.
 */
import * as FR from "./followers-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

export function build(ctx) {
  const {MOD, esc, orders, attitude, wanted} = ctx;
  const worldOf = a => { const x = a?.actor ?? a; return x?.id ? (game.actors.get(x.id) ?? x) : null; };
  const mayView = actor => !!actor && (game.user.isGM || actor.isOwner);

  /** Where a follower's token is: the viewed scene first, else any scene that holds one. */
  function placeOf(npc) {
    const here = canvas?.scene?.tokens?.find?.(t => t.actorId === npc.id && !t.flags?.[MOD]?.errandHidden) ?? null;
    if ( here ) return {sceneName: canvas.scene.name, sameScene: true, tokenId: here.id};
    for ( const sc of game.scenes ?? [] ) {
      if ( sc.id === canvas?.scene?.id ) continue;
      if ( sc.tokens?.some?.(t => t.actorId === npc.id) ) return {sceneName: sc.name, sameScene: false, tokenId: null};
    }
    return {sceneName: null, sameScene: false, tokenId: null};
  }

  /** The followers of a character, as rows. */
  function rowsFor(masterLike) {
    const master = worldOf(masterLike);
    if ( !master ) return [];
    const names = Object.fromEntries([...Array.from(game.actors ?? [], a => [a.id, a.name]), ...(canvas?.scene?.tokens?.contents ?? []).map(t => [t.id, t.name])]);
    const AT = attitude?.();
    const rows = [];
    for ( const a of game.actors ?? [] ) {
      if ( a.id === master.id || a.hasPlayerOwner || !FR.serves(a.flags, master.id) ) continue;
      let now = null;
      try { now = AT?.of?.(a, master) ?? null; } catch (e) { now = null; }
      const described = (() => { try { return wanted?.ofActor?.(a.id)?.length ?? 0; } catch (e) { return 0; } })();
      rows.push(FR.rowFor({id: a.id, name: a.name, flags: a.flags, ...placeOf(a)}, master.id,
        {attitudeEntry: a.flags?.[MOD]?.attitude?.[master.id] ?? null, step: now?.step ?? 0, word: now?.word ?? "", names, described, isGM: game.user.isGM}));
    }
    return FR.sortRows(rows);
  }

  function rowHtml(r) {
    const quick = setting("followerOrders") ? r.quick.map(k => `<button type="button" data-order="${esc(k)}" data-token="${esc(r.tokenId)}">${esc(k === "none" ? "No order" : orders.rules.ORDERS[k]?.label ?? k)}</button>`).join(" ") : "";
    const more = setting("followerOrders") && r.sameScene ? `<button type="button" data-more="${esc(r.tokenId)}"><i class="fa-solid fa-bullhorn"></i> Give an order…</button>` : "";
    return `<div class="wnpc-follower" data-search-item data-id="${esc(r.id)}">
      <p><a data-open="${esc(r.id)}"><b>${esc(r.name)}</b></a> <span class="wodx-quiet">${esc(r.kindLabel)}</span>${r.sameScene ? ` <a data-pan="${esc(r.tokenId)}" title="Show on the map" aria-label="Show ${esc(r.name)} on the map"><i class="fa-solid fa-location-crosshairs"></i></a>` : ""}</p>
      <p>${esc(r.where)}. ${esc(r.order)}${r.note ? `: <i>${esc(r.note)}</i>` : ""}.</p>
      <p>Loyalty: ${esc(r.loyalty || "unknown")}${r.last ? ` <span class="wodx-quiet">(${esc(FR.lastText(r.last))})</span>` : ""}${r.bond.text ? `. ${esc(r.bond.text)}` : ""}.</p>
      ${r.trouble.length ? `<p class="wnpc-follower-trouble"><i class="fa-solid fa-triangle-exclamation"></i> ${r.trouble.map(esc).join("; ")}.</p>` : ""}
      ${quick || more ? `<div class="wnpc-follower-orders">${quick} ${more}</div>` : ""}
    </div>`;
  }
  const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };

  function bodyHtml(master) {
    const rows = rowsFor(master);
    const list = rows.map(rowHtml).join("");
    return `<div class="wnpc-followers-wrap">${rows.length > 5 ? searchBox(".wnpc-followers-rows", "Search followers…", "Search followers") : ""}
      <div class="wnpc-followers-rows">${list || `<p>No one serves ${esc(master.name)} yet. Ghouls, retainers, allies and herd made in Creation or from the sheet's Backgrounds show here, and the Storyteller can mark anyone else in the order window.</p>`}</div>
      <p class="wodx-quiet">Orders from here reach followers on the scene you are looking at. A hard order still waits for the Storyteller.${game.user.isGM ? "" : " A follower shows here once the Storyteller lets you see its sheet."}</p></div>`;
  }

  async function openFollowers(actorLike) {
    let master = worldOf(actorLike) ?? worldOf(canvas?.tokens?.controlled?.[0]?.actor) ?? game.user.character ?? null;
    if ( !master && !game.user.isGM ) master = game.actors.find(a => a.isOwner && a.hasPlayerOwner) ?? null;
    if ( !master ) return ui.notifications.warn("Pick a character: select its token or open this from its sheet.");
    if ( !mayView(master) ) return ui.notifications.warn("You can see the followers of your own characters only.");
    const D = foundry.applications.api.DialogV2;
    const dlg = new D({window: {title: `Followers: ${master.name}`, icon: "fa-solid fa-users", resizable: true}, classes: ["wodx-dialog", "wodx-npc-dialog", "wnpc-followers-dialog"],
      position: {width: 560, height: "auto"}, content: bodyHtml(master), buttons: [{action: "close", label: "Close", default: true}], rejectClose: false});
    await dlg.render(true);
    const redraw = () => { const box = dlg.element?.querySelector(".wnpc-followers-wrap"); if ( box ) box.outerHTML = bodyHtml(master); };
    let wait = null;
    const hook = Hooks.on("updateActor", a => { if ( a.id === master.id || FR.serves(a.flags, master.id) ) { clearTimeout(wait); wait = setTimeout(redraw, 300); } });
    const hook2 = Hooks.on("canvasReady", () => redraw());
    Hooks.once("closeDialogV2", app => { if ( app === dlg ) { Hooks.off("updateActor", hook); Hooks.off("canvasReady", hook2); } });
    dlg.element?.addEventListener("click", async ev => {
      const o = ev.target.closest("[data-open]"), p = ev.target.closest("[data-pan]"), q = ev.target.closest("[data-order]"), m = ev.target.closest("[data-more]");
      if ( !o && !p && !q && !m ) return;
      ev.preventDefault();
      if ( o ) return game.actors.get(o.dataset.open)?.sheet?.render(true);
      if ( p ) { const t = canvas?.tokens?.get(p.dataset.pan); if ( t ) { canvas.animatePan({x: t.center.x, y: t.center.y}); t.control?.({releaseOthers: true}); } return; }
      if ( m ) return orders.openOrders({tokenId: m.dataset.more, leader: master.id});
      if ( q ) {
        q.disabled = true;
        try { await orders.send({sceneId: canvas.scene.id, tokenId: q.dataset.token, kind: q.dataset.order, leader: master.id, target: null, hard: false, note: ""}); }
        finally { q.disabled = false; setTimeout(redraw, 600); }
      }
    });
    return dlg;
  }

  return {openFollowers, rowsFor, rules: FR};
}
