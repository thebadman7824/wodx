/**
 * WoDX NPC 0.8.0: followers who take orders. The rules are in order-rules.mjs.
 *
 *   flags.wodx-npc.serves  [actor ids]  the player characters this NPC serves (set by the Storyteller)
 *   NPC 0.34.0: an NPC also serves its domitor (a ghoul), the character whose background made it (Make them real)
 *   and its patron (a Creation ally); order-rules servesFrom reads all four. Keep watch and Guard now notice
 *   whoever comes and warn the master or step into the way; WoDX spots a hard order itself and suggests the roll.
 *   flags.wodx-npc.order   {kind, by, leader, target, at, hard, note, stage}
 *
 * A player picks one of their followers on the scene and an order; the request goes by socket to the active
 * Storyteller, whose client checks it and carries it out, then whispers a card to both with Cancel. A hard order goes
 * to the approval queue instead. While an order holds, the NPC's routine is paused (reason "order"). Followers walk
 * after their leader stops moving, on the Storyteller's client only; players' clients do nothing but send the request.
 */
import * as O from "./order-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

export const T_ORDER = "wodx-npc.order";

export function build(ctx) {
  const {MOD, esc, gmIds, isActiveGM, chron, routines, cellOf, cellsAt, besideFor, yardsBetween, obvious, attitude} = ctx;
  const SOCKET = `module.${MOD}`;
  const flag = (doc, k) => doc?.flags?.[MOD]?.[k];
  const unsetKey = path => {
    const Del = globalThis.foundry?.data?.operators?.ForcedDeletion;
    return Del ? {[path]: new Del()} : {[path.replace(/\.([^.]+)$/, ".-=$1")]: null};
  };
  const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };
  const owned = user => game.actors.filter(a => a.testUserPermission?.(user, "OWNER") && a.hasPlayerOwner).map(a => a.id);
  const servesOf = a => O.servesFrom(a?.flags);
  const inFightOn = scene => !!game.combats?.some?.(c => c.started && c.scene?.id === scene?.id);
  /** The roll WoDX suggests for a hard order: Willpower against the bond and the follower's attitude to the leader. */
  function loyaltyFor(npc, leaderId) {
    const drinks = npc?.flags?.["wodx-creation"]?.lineage?.bonds?.[leaderId]?.drinks ?? 0;
    let step = 0;
    try { step = Number(attitude?.()?.of?.(npc, game.actors.get(leaderId))?.step) || 0; } catch (e) { step = 0; }
    return O.loyaltyCheck({bondStage: Math.min(3, Number(drinks) || 0), step, willpower: npc?.system?.advantages?.willpower?.permanent ?? 3});
  }
  const orderOf = a => O.normOrder(flag(a, "order"));
  const names = () => Object.fromEntries(Array.from(game.actors ?? [], a => [a.id, a.name]));
  const timers = new Map();

  function registerSettings() {
    game.settings.register(MOD, "followerOrders", {name: "Followers take orders", hint: "Players can tell the NPCs that serve their characters to follow, wait, guard, keep watch or go to someone. A hard order waits for the Storyteller.",
      scope: "world", config: true, type: Boolean, default: true});
  }

  /** Followers on this scene the user may order. */
  function followersFor(user = game.user, scene = canvas?.scene) {
    const mine = owned(user);
    return (scene?.tokens?.contents ?? []).filter(t => t.actor && !t.hidden).filter(t => {
      const a = t.actor;
      return O.canOrder({isGM: user.isGM, npcHasPlayerOwner: a.hasPlayerOwner, serves: servesOf(a), ownedActorIds: mine}).ok && (user.isGM ? servesOf(a).length > 0 : true);
    });
  }

  /** The active Storyteller: check and carry out an order. */
  async function give(req, {userId = game.user.id} = {}) {
    if ( !isActiveGM() || !setting("followerOrders") ) return {ok: false, why: "Orders are off."};
    const user = game.users.get(userId) ?? game.user;
    const scene = game.scenes.get(req.sceneId) ?? canvas?.scene;
    const tok = scene?.tokens?.get(req.tokenId);
    const npc = tok?.actor;
    if ( !npc ) return {ok: false, why: "That follower is not on the scene."};
    const mine = owned(user);
    const can = O.canOrder({isGM: user.isGM, npcHasPlayerOwner: npc.hasPlayerOwner, serves: servesOf(npc), ownedActorIds: mine});
    if ( !can.ok ) return can;
    if ( req.kind === "none" ) return clear(npc, {by: user, scene, tok});
    if ( !O.ORDERS[req.kind] ) return {ok: false, why: "No such order."};
    const leader = O.leaderFor({picked: req.leader, serves: servesOf(npc), ownedActorIds: mine, isGM: user.isGM});
    if ( req.kind === "follow" && !leader ) return {ok: false, why: "Pick the character it should follow."};
    const order = O.normOrder({kind: req.kind, by: user.id, leader, target: req.target ?? null, at: game.time?.worldTime ?? 0, hard: !!req.hard, note: req.note});
    if ( O.NEEDS_TARGET.has(order.kind) && !scene.tokens.get(order.target) ) return {ok: false, why: "Target the one it should go to or attack first."};
    const tgt = order.target ? scene.tokens.get(order.target) : null;
    const why = O.hardReasons({kind: order.kind, inFight: inFightOn(scene), target: tgt ? {hostile: tgt.disposition === -1, obvious: !!obvious?.(tgt.actor)} : null});
    if ( why.length ) order.hard = true;
    if ( order.hard && !user.isGM ) {
      const loyal = loyaltyFor(npc, leader);
      await chron()?.approvals?.propose?.({type: T_ORDER, key: `order:${npc.id}`, title: `A hard order for ${npc.name}: ${O.ORDERS[order.kind].label.toLowerCase()}`,
        detail: `${user.name} orders ${npc.name}: ${O.ORDERS[order.kind].label}.${order.note ? ` "${order.note}"` : ""}${why.length ? ` Hard because ${why.join(" and ")}.` : ""} ${loyal.text} Weigh the bond and loyalty before you agree.`,
        data: {sceneId: scene.id, tokenId: tok.id, order}});
      return {ok: true, waiting: true};
    }
    await apply(npc, order, {scene, tok, by: user});
    return {ok: true};
  }

  async function apply(npc, order, {scene, tok, by}) {
    const prevPause = flag(npc, "paused") ?? null;
    const prevOrder = flag(npc, "order") ?? null;
    const upd = {[`flags.${MOD}.order`]: order};
    if ( routines?.routineOf?.(npc)?.on && (!prevPause || prevPause.reason === "order") ) upd[`flags.${MOD}.paused`] = {reason: "order"};
    await npc.update(upd);
    const n = names();
    await ChatMessage.create({content: `<div class="wodx-card wnpc-order"><p><b>${esc(npc.name)}</b>: ${esc(O.describeOrder(order, n))}${order.note ? `. <i>${esc(order.note)}</i>` : ""}.</p>
      <p class="wodx-quiet">${esc(O.ORDERS[order.kind].hint)}</p><button type="button" data-action="wnpc-order-cancel" data-actor="${npc.id}">Cancel the order</button></div>`,
      whisper: [...new Set([...gmIds(), by?.id].filter(Boolean))], speaker: {alias: "An order"},
      flags: {[MOD]: {order: {actor: npc.id, prevOrder, prevPause}}}});
    if ( order.kind === "follow" ) { const l = leaderToken(npc, scene); if ( l ) queueFollow(l); }
    if ( order.kind === "fetch" ) await doFetch(npc, scene, tok);
  }

  async function clear(npc, {by = game.user} = {}) {
    if ( !flag(npc, "order") ) return {ok: true};
    const upd = unsetKey(`flags.${MOD}.order`);
    if ( flag(npc, "paused")?.reason === "order" ) Object.assign(upd, unsetKey(`flags.${MOD}.paused`));
    await npc.update(upd);
    await ChatMessage.create({content: `<div class="wodx-card wnpc-order"><p><b>${esc(npc.name)}</b> has no order now${routines?.routineOf?.(npc)?.on ? " and goes back to its routine" : ""}.</p></div>`,
      whisper: [...new Set([...gmIds(), by?.id].filter(Boolean))], speaker: {alias: "An order"}});
    return {ok: true};
  }

  function leaderToken(npc, scene) {
    const o = orderOf(npc);
    return o?.leader ? scene?.tokens?.find(t => t.actorId === o.leader && !t.hidden) ?? null : null;
  }

  /** Walk one follower beside its leader (both on the scene in view). */
  async function stepBeside(followerDoc, leaderDoc) {
    const f = followerDoc.object, l = leaderDoc.object;
    if ( !f || !l || canvas?.scene?.id !== followerDoc.parent?.id ) return false;
    const busy = new Set();
    for ( const t of canvas.tokens.placeables ) {
      if ( t.id === f.id || t.document.hidden ) continue;
      for ( const c of cellsAt(t, cellOf(t)) ) busy.add(`${c.i},${c.j}`);
    }
    const start = cellOf(f);
    const goal = O.followCell(cellOf(l), start, besideFor(f, l, start), c => !busy.has(`${c.i},${c.j}`));
    if ( !goal ) return false;
    await routines.walkTo(f, goal);
    return true;
  }

  /** After the leader stops (a short wait), every follower on its scene walks beside it. */
  function queueFollow(leaderDoc) {
    // In a fight a follower moves on its own turn, not after its leader
    if ( game.combats?.some?.(c => c.started && c.scene?.id === leaderDoc.parent?.id) ) return;
    clearTimeout(timers.get(leaderDoc.id));
    timers.set(leaderDoc.id, setTimeout(async () => {
      timers.delete(leaderDoc.id);
      try {
        for ( const t of leaderDoc.parent?.tokens ?? [] ) {
          if ( !t.actor || t.id === leaderDoc.id ) continue;
          const o = orderOf(t.actor);
          if ( !o || o.leader !== leaderDoc.actorId || !(o.kind === "follow" || (o.kind === "fetch" && o.stage === "back")) ) continue;
          if ( routines?.downState?.(t.actor) ) continue;
          await stepBeside(t, leaderDoc);
        }
      } catch (e) { console.error(`${MOD} | orders`, e); }
    }, 600));
  }

  async function doFetch(npc, scene, tok) {
    const o = orderOf(npc);
    const target = scene.tokens.get(o?.target);
    if ( target && tok ) await stepBeside(tok, target);
    await npc.update({[`flags.${MOD}.order.stage`]: "back"});
    await ChatMessage.create({content: `<div class="wodx-card wnpc-order"><p><b>${esc(npc.name)}</b> reaches ${esc(target?.name ?? "the one pointed at")}. What it learns or brings back is the Storyteller's to say.</p></div>`,
      whisper: gmIds(), speaker: {alias: "An order"}});
    const l = leaderToken(npc, scene);
    if ( l ) queueFollow(l);
  }

  async function cancelFromCard(message) {
    if ( !game.user.isGM ) return;
    const f = message.flags?.[MOD]?.order;
    const npc = game.actors.get(f?.actor);
    if ( !npc ) return;
    await clear(npc);
    await message.update({content: message.content.replace(/<button type="button" data-action="wnpc-order-cancel"[^>]*>[^<]*<\/button>/, "<p><i>Cancelled.</i></p>")});
  }

  /* ---------------- Sentries (NPC 0.34.0) ---------------- */

  const lastLook = new Map();
  const LOOK_EVERY = 30 * 1000;
  /** Active Storyteller: someone moved; followers on Keep watch or Guard on that scene may notice them. */
  async function sentries(doc) {
    const scene = doc?.parent;
    if ( !isActiveGM() || !setting("followerOrders") || scene?.id !== canvas?.scene?.id || !doc.actor ) return [];
    const iTok = canvas.tokens.get(doc.id);
    if ( !iTok ) return [];
    const out = [];
    for ( const t of scene.tokens ) {
      if ( !t.actor || t.id === doc.id || t.hidden ) continue;
      const o = orderOf(t.actor);
      if ( !o || !(o.kind === "watch" || o.kind === "guard") || routines?.downState?.(t.actor) ) continue;
      const mine = servesOf(t.actor);
      const theirs = servesOf(doc.actor);
      if ( !O.isIntruder({pc: !!doc.actor.hasPlayerOwner, passerby: !!doc.flags?.[MOD]?.passerby, down: !!routines?.downState?.(doc.actor),
        sharesMaster: theirs.some(id => mine.includes(id)) || mine.includes(doc.actorId)}) ) continue;
      const k = `${t.id}:${doc.id}`;
      if ( (lastLook.get(k) ?? 0) > Date.now() - LOOK_EVERY ) continue;
      lastLook.set(k, Date.now());
      const wTok = canvas.tokens.get(t.id);
      const seen = await routines?.noticeBy?.(wTok, iTok) ?? {noticed: false};
      const act = O.sentryAct(o.kind, seen);
      if ( !act ) continue;
      out.push({follower: t.id, act});
      const leader = game.actors.get(o.leader);
      const tell = [...new Set([...gmIds(), ...game.users.filter(u => !u.isGM && leader?.testUserPermission?.(u, "OWNER")).map(u => u.id)])];
      if ( act === "challenge" ) await stepBeside(t, doc);
      const text = act === "challenge" ? `<b>${esc(t.name)}</b> steps into <b>${esc(doc.name)}</b>'s way and challenges them.`
        : `<b>${esc(t.name)}</b> sees <b>${esc(doc.name)}</b> and warns ${esc(leader?.name ?? "its master")}.`;
      await ChatMessage.create({content: `<div class="wodx-card wnpc-order"><p>${text}</p><p class="wodx-quiet">${esc(seen.why ?? "")}</p></div>`,
        whisper: tell, speaker: {alias: o.kind === "guard" ? "On guard" : "On watch"}});
    }
    return out;
  }
  const sentryWait = new Map();

  /* ---------------- The window ---------------- */

  /** Give an order: pick a follower on this scene, the order, and who it serves. */
  async function openOrders() {
    if ( !setting("followerOrders") ) return ui.notifications.info("Followers taking orders is off in this world.");
    const list = followersFor();
    const pcs = game.user.isGM ? game.actors.filter(a => a.hasPlayerOwner) : game.actors.filter(a => a.isOwner && a.hasPlayerOwner);
    const gmList = game.user.isGM ? (canvas?.scene?.tokens?.contents ?? []).filter(t => t.actor && !t.actor.hasPlayerOwner) : [];
    if ( !list.length && !game.user.isGM ) return ui.notifications.info("None of your followers is on this scene. The Storyteller marks who serves whom.");
    const n = names();
    const opt = (v, l, s) => `<option value="${esc(v)}"${s ? " selected" : ""}>${esc(l)}</option>`;
    const followers = (game.user.isGM ? gmList : list).map(t => opt(t.id, `${t.name}: ${O.describeOrder(flag(t.actor, "order"), n)}`, false)).join("");
    const nFollow = (game.user.isGM ? gmList : list).length;
    const target = [...(game.user.targets ?? [])][0]?.document ?? null;
    const lead = (canvas?.tokens?.controlled ?? []).map(t => t.actor?.id).find(id => pcs.some(a => a.id === id)) ?? game.user.character?.id ?? pcs[0]?.id;
    const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 480}, window: {title: "Give an order"}, classes: ["wodx-dialog", "wnpc-orders"],
      content: `${nFollow > 5 ? searchBox("select[name=token]", "Search followers…", "Search followers") : ""}
        <div class="form-group"><label>Follower</label><select name="token">${followers || opt("", "No NPC on this scene", true)}</select></div>
        <div class="form-group"><label>Order</label><select name="kind" data-fixed>${Object.entries(O.ORDERS).map(([k, v]) => opt(k, v.label, k === "follow")).join("")}${opt("none", "No order (back to its routine)", false)}</select></div>
        ${pcs.length > 5 ? searchBox("select[name=leader]", "Search characters…", "Search characters") : ""}
        <div class="form-group"><label>For</label><select name="leader">${pcs.map(a => opt(a.id, a.name, a.id === lead)).join("")}</select></div>
        <div class="form-group"><label>A hard order (dangerous, or against its nature)</label><input type="checkbox" name="hard"></div>
        <div class="form-group"><label>In your words</label><input type="text" name="note" maxlength="200"></div>
        ${game.user.isGM ? `<div class="form-group"><label>It serves</label><input type="checkbox" name="setServes"> <small>Make it serve the character above</small></div>` : ""}
        <p class="hint">${target ? `Go to: ${esc(target.name)}.` : "To send it to someone or set it on them, target that token first."} A hard order waits for the Storyteller, who weighs the bond and loyalty.</p>`,
      buttons: [{action: "go", label: "Give the order", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "cancel", label: "Cancel"}]});
    if ( !res || !res.token ) return null;
    const tok = canvas.scene.tokens.get(res.token);
    if ( game.user.isGM && res.setServes && tok?.actor && res.leader ) {
      const cur = servesOf(tok.actor);
      if ( !cur.includes(res.leader) ) await tok.actor.update({[`flags.${MOD}.serves`]: [...cur, res.leader]});
    }
    const req = {sceneId: canvas.scene.id, tokenId: res.token, kind: res.kind, leader: res.leader, target: target?.id ?? null, hard: !!res.hard, note: res.note};
    if ( isActiveGM() ) { const r = await give(req); if ( !r.ok ) ui.notifications.warn(r.why); return r; }
    game.socket.emit(SOCKET, {type: "order", payload: {...req, userId: game.user.id}});
    ui.notifications.info(req.hard ? "The hard order goes to the Storyteller." : "Order sent.");
    return {ok: true, sent: true};
  }

  function registerHandler() {
    chron()?.approvals?.registerHandler?.(T_ORDER, {label: "A hard order for a follower", approve: async entry => {
      const d = entry?.data ?? {};
      const scene = game.scenes.get(d.sceneId), tok = scene?.tokens?.get(d.tokenId);
      if ( tok?.actor && d.order ) await apply(tok.actor, O.normOrder(d.order), {scene, tok, by: game.users.get(entry.from) ?? null});
    }});
  }

  function hooks() {
    Hooks.once("ready", () => {
      game.socket.on(SOCKET, async m => {
        if ( m?.type !== "order" || !isActiveGM() ) return;
        const r = await give(m.payload, {userId: m.payload?.userId}).catch(e => { console.error(`${MOD} | orders`, e); return {ok: false, why: "The order failed."}; });
        if ( !r.ok ) await ChatMessage.create({content: `<div class="wodx-card wnpc-order"><p>The order was not given: ${esc(r.why)}</p></div>`, whisper: [m.payload?.userId].filter(Boolean), speaker: {alias: "An order"}});
      });
      if ( chron()?.approvals?.registerHandler ) registerHandler();
    });
    Hooks.on("wodxChronicleReady", () => registerHandler());
    Hooks.on("updateToken", (doc, change) => {
      if ( !isActiveGM() || !setting("followerOrders") || !("x" in (change ?? {}) || "y" in (change ?? {})) ) return;
      clearTimeout(sentryWait.get(doc.id));
      sentryWait.set(doc.id, setTimeout(() => { sentryWait.delete(doc.id); sentries(doc).catch(e => console.error(`${MOD} | sentries`, e)); }, 900));
      if ( !doc.actor?.hasPlayerOwner ) return;
      if ( !(doc.parent?.tokens ?? []).some(t => orderOf(t.actor)?.leader === doc.actorId) ) return;
      queueFollow(doc);
    });
    Hooks.on("renderChatMessageHTML", (message, el) => {
      const html = el?.[0] ?? el;
      if ( !message.flags?.[MOD]?.order ) return;
      const b = html?.querySelector?.("[data-action=wnpc-order-cancel]");
      if ( !b ) return;
      if ( !game.user.isGM ) { b.remove(); return; }
      b.addEventListener("click", () => cancelFromCard(message));
    });
  }

  return {registerSettings, hooks, registerHandler, give, clear, openOrders, followersFor, orderOf, servesOf, stepBeside, sentries, loyaltyFor, rules: O};
}
