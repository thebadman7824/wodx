/**
 * WoDX NPC 0.8.0: followers who take orders. The rules are in order-rules.mjs.
 *
 *   flags.wodx-npc.serves  [actor ids]  the player characters this NPC serves (set by the Storyteller)
 *   NPC 0.37.0: an NPC also serves its domitor (a ghoul), the character whose background made it (Make them real)
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
  const ST = () => game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api : null;
  const AC = () => game.modules.get("wodx-actions")?.active ? (game.modules.get("wodx-actions").api ?? game.wodxActions) : null;
  const IA = () => game.modules.get("wodx-interactables")?.active ? game.modules.get("wodx-interactables").api : null;
  const ownersOf = actor => game.users.filter(u => !u.isGM && actor?.testUserPermission?.(u, "OWNER")).map(u => u.id);
  const tellMaster = (masterId, extra = []) => [...new Set([...gmIds(), ...ownersOf(game.actors.get(masterId)), ...extra].filter(Boolean))];
  const worldActor = a => (a?.isToken ? (a.baseActor ?? game.actors.get(a.id)) : a);
  async function note(html, whisper, alias = "An order") {
    return ChatMessage.create({content: `<div class="wodx-card wnpc-order">${html}</div>`, whisper, speaker: {alias}});
  }
  /** Loyalty drift (B1816): move the follower's attitude toward one master a step, never below Distrusted by drift. */
  async function driftFor(npc, masterId, kind, extra = {}) {
    const AT = attitude?.();
    const master = game.actors.get(masterId);
    if ( !AT?.apply || !npc || !master ) return null;
    const step = Number(AT.of?.(npc, master)?.step) || 0;
    const d = O.drift(kind, {step, ...extra});
    if ( !d ) return null;
    await AT.apply(npc, master, {delta: d.delta, why: d.why});
    if ( d.wavers ) await note(`<p><b>${esc(npc.name)}</b> is wavering in its loyalty to ${esc(master.name)} (${esc(d.why)}). It may refuse an order, leave or turn; the Storyteller decides.</p>`, gmIds(), "Loyalty");
    return d;
  }
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
    const order = O.normOrder({kind: req.kind, by: user.id, leader, target: req.target ?? null, at: game.time?.worldTime ?? 0, hard: !!req.hard, note: req.note,
      errand: req.errand, task: req.task, cost: req.cost});
    // NPC 0.37.0: errands and help need a master, a kind of errand, a task of the master's, and WoDX Storyteller's long tasks
    if ( (order.kind === "errand" || order.kind === "help") && !leader ) return {ok: false, why: "Pick the character it works for."};
    if ( order.kind === "errand" && !order.errand ) return {ok: false, why: "Pick an errand."};
    if ( (order.kind === "errand" || order.kind === "help") && !ST()?.tasks?.save ) return {ok: false, why: "Errands and help need WoDX Storyteller's long tasks."};
    if ( order.kind === "help" && !ST().tasks.of(game.actors.get(leader)).some(t => t.id === order.task && t.status === "open") ) return {ok: false, why: "Pick an open long task of that character's."};
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
    if ( order.kind === "errand" ) await startErrand(npc, order, scene);
    if ( order.kind === "help" ) await setHelper(order.leader, order.task, npc, true);
    if ( order.kind === "cleanup" ) await doCleanup(npc, order, scene);
  }

  /* ---------------- Errands, help, clean-up (NPC 0.37.0) ---------------- */

  /** The follower leaves the scene and works the errand as a long task on its own sheet (B1810). */
  async function startErrand(npc, order, scene) {
    const w = worldActor(npc), master = game.actors.get(order.leader);
    const data = O.errandTask(order.errand, {sheet: w.system?.abilities ?? {}, master: order.leader, masterName: master?.name, note: order.note, cost: order.cost});
    const t = await ST()?.tasks?.save?.(w, data);
    if ( !t ) return null;
    await w.update({[`flags.${MOD}.order.task`]: t.id});
    const hide = (scene?.tokens ?? []).filter(d => (d.actorId === w.id || d.actor?.id === w.id) && !d.hidden);
    for ( const d of hide ) await d.update({hidden: true, [`flags.${MOD}.errandHidden`]: true});
    return t;
  }
  /** Back from an errand (or called back): its tokens show again, the long task is gone or kept as done. */
  async function endErrand(npc, {drop = false} = {}) {
    const w = worldActor(npc), o = orderOf(w);
    if ( drop && o?.task && ST()?.tasks?.remove ) { try { await ST().tasks.remove(w, o.task); } catch (e) { /* gone */ } }
    for ( const sc of game.scenes ) for ( const d of sc.tokens ) {
      if ( (d.actorId === w.id) && d.flags?.[MOD]?.errandHidden ) await d.update({hidden: false, ...unsetKey(`flags.${MOD}.errandHidden`)});
    }
  }
  /** A long task ended: if it was a follower's errand, it comes back and says how it went. Buying pays from the master. */
  async function onTaskDone({actor, task} = {}) {
    if ( !isActiveGM() || !task?.errand || !actor ) return;
    const w = worldActor(actor), o = orderOf(w);
    if ( !o || o.kind !== "errand" || o.task !== task.id ) return;
    const master = game.actors.get(o.leader);
    let paid = "", said = O.errandResult(task.errand, task.status);
    if ( task.errand === "buy" && o.cost > 0 && master ) {
      try {
        const r = await ST()?.upkeep?.money?.pay?.(master, o.cost, {note: `${w.name}'s errand: ${o.note || "a purchase"}`});
        const fmt = v => ST()?.upkeep?.money?.format?.(v) ?? String(v);
        if ( r?.ok === false ) { said = "comes back without it: the purse could not pay."; paid = ` Short by ${r.text ?? "some"}.`; }
        else paid = ` ${fmt(o.cost)} paid from ${master.name}'s purse.`;
      } catch (e) { paid = " The price could not be taken from the purse."; }
    }
    await endErrand(w);
    await clear(w, {quiet: true});
    await note(`<p><b>${esc(w.name)}</b> ${esc(said)}${o.note ? ` <i>${esc(o.note)}</i>` : ""}${esc(paid)}</p>`, tellMaster(o.leader), "An errand");
  }
  /** Add or take away a follower as a helper on one of its master's long tasks (B1811). */
  async function setHelper(masterId, taskId, npc, on) {
    const master = game.actors.get(masterId), w = worldActor(npc);
    const t = master && ST()?.tasks?.of?.(master)?.find(x => x.id === taskId);
    if ( !t ) return null;
    const helpers = on ? [...new Set([...t.helpers, w.id])] : t.helpers.filter(id => id !== w.id);
    return ST().tasks.save(master, {...t, helpers});
  }
  /** Deal with a witness (B1813): Manipulation + Subterfuge at 6; the witness's state follows in the Masquerade records. */
  async function doCleanup(npc, order, scene) {
    const wit = scene?.tokens?.get(order.target)?.actor;
    const w = worldActor(npc);
    if ( !wit ) return null;
    const pool = Math.max(1, Number(w.system?.attributes?.manipulation?.value ?? 0) + Number(w.system?.abilities?.subterfuge?.value ?? 0));
    const roll = await new Roll(`${pool}d10`).evaluate();
    const faces = roll.dice[0]?.results?.map(r => r.result) ?? [];
    const hits = faces.filter(f => f >= 6).length, ones = faces.filter(f => f === 1).length;
    const out = O.cleanupOutcome({successes: Math.max(0, hits - ones), botch: hits === 0 && ones > 0});
    let changed = 0;
    if ( out.state ) { try { changed = await AC()?.setWitnessState?.(worldActor(wit), out.state, `by ${w.name}`) ?? 0; } catch (e) { changed = 0; } }
    await clear(w, {quiet: true});
    await note(`<p><b>${esc(w.name)}</b> ${esc(out.text)} Witness: ${esc(wit.name)}. Rolled ${pool} dice: ${faces.join(", ")}.${out.state && !changed ? " No open Masquerade record names this witness." : ""}</p>`, tellMaster(order.leader), "A witness");
    return {...out, changed};
  }

  async function clear(npc, {by = game.user, quiet = false} = {}) {
    if ( !flag(npc, "order") ) return {ok: true};
    // NPC 0.37.0: a follower called back from an errand returns now; one that was helping stops
    const was = orderOf(npc);
    if ( was?.kind === "errand" && !quiet ) await endErrand(npc, {drop: true});
    if ( was?.kind === "help" ) await setHelper(was.leader, was.task, npc, false);
    const upd = unsetKey(`flags.${MOD}.order`);
    if ( flag(npc, "paused")?.reason === "order" ) Object.assign(upd, unsetKey(`flags.${MOD}.paused`));
    await npc.update(upd);
    if ( quiet ) return {ok: true};
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

  /* ---------------- Chases and breaches (NPC 0.37.0) ---------------- */

  /** A chase starts: followers on Follow behind a pursuing master, and those told to cut off the quarry, join (B1814). */
  async function onChase({kind, scene: sceneId, state} = {}) {
    if ( kind !== "start" || !isActiveGM() || !IA()?.chase?.join ) return [];
    const scene = game.scenes.get(sceneId);
    const chasers = new Set((state?.pursuers ?? []).map(p => p.id));
    const joined = [];
    for ( const t of scene?.tokens ?? [] ) {
      const o = t.actor ? orderOf(t.actor) : null;
      if ( !o || t.hidden || chasers.has(t.id) || t.id === state?.quarry?.id || routines?.downState?.(t.actor) ) continue;
      const lead = o.kind === "follow" && scene.tokens.find(d => d.actorId === o.leader && chasers.has(d.id));
      const cut = o.kind === "cutoff" && o.target === state?.quarry?.id;
      if ( !lead && !cut ) continue;
      const r = await IA().chase.join(scene, t.id, {why: cut ? "told to cut them off" : `with ${lead.name}`});
      if ( r ) joined.push(t.id);
    }
    return joined;
  }
  /** A breach by a follower: the Storyteller is told whose name it may come back to (B1813). */
  async function onBreach({by} = {}) {
    if ( !isActiveGM() || !by?.uuid ) return null;
    const a = worldActor(fromUuidSync?.(by.uuid));
    const masters = a ? servesOf(a).map(id => game.actors.get(id)).filter(Boolean) : [];
    if ( !masters.length ) return null;
    return note(`<p><b>${esc(a.name)}</b> serves ${esc(masters.map(m => m.name).join(" and "))}. Word of this breach may be laid at ${masters.length === 1 ? "that master's" : "their"} door: weigh it against their standing.</p>`, gmIds(), "Masquerade");
  }

  /* ---------------- Sentries (NPC 0.37.0) ---------------- */

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
    const taskOpts = pcs.flatMap(a => (ST()?.tasks?.of?.(a) ?? []).filter(t => t.status === "open").map(t => opt(t.id, `${a.name}: ${t.name}`, false)));
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
        <div class="form-group"><label>Errand</label><select name="errand" data-fixed>${Object.entries(O.ERRANDS).map(([k, v]) => opt(k, v.label, k === "buy")).join("")}</select></div>
        <div class="form-group"><label>Price, for buying (in the smallest coin)</label><input type="number" name="cost" min="0" step="1" value="0"></div>
        ${taskOpts.length > 5 ? searchBox("select[name=task]", "Search long tasks…", "Search long tasks") : ""}
        <div class="form-group"><label>Long task to help with</label><select name="task">${taskOpts.join("") || opt("", "No open long task", true)}</select></div>
        <div class="form-group"><label>A hard order (dangerous, or against its nature)</label><input type="checkbox" name="hard"></div>
        <div class="form-group"><label>In your words</label><input type="text" name="note" maxlength="200"></div>
        ${game.user.isGM ? `<div class="form-group"><label>It serves</label><input type="checkbox" name="setServes"> <small>Make it serve the character above</small></div>` : ""}
        <p class="hint">${target ? `Go to: ${esc(target.name)}.` : "To send it to someone or set it on them, target that token first."} A hard order waits for the Storyteller, who weighs the bond and loyalty.</p>`,
      buttons: [{action: "go", label: "Give the order", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "cancel", label: "Cancel"}]});
    if ( !res || !res.token ) return null;
    const tok = canvas.scene.tokens.get(res.token);
    if ( game.user.isGM && res.setServes && tok?.actor && res.leader ) {
      const cur = Array.isArray(flag(tok.actor, "serves")) ? flag(tok.actor, "serves") : [];
      if ( !servesOf(tok.actor).includes(res.leader) ) await tok.actor.update({[`flags.${MOD}.serves`]: [...cur, res.leader]});
    }
    const req = {sceneId: canvas.scene.id, tokenId: res.token, kind: res.kind, leader: res.leader, target: target?.id ?? null, hard: !!res.hard, note: res.note,
      errand: res.kind === "errand" ? res.errand : null, task: res.kind === "help" ? res.task : null, cost: res.kind === "errand" && res.errand === "buy" ? Number(res.cost) || 0 : 0};
    if ( isActiveGM() ) { const r = await give(req); if ( !r.ok ) ui.notifications.warn(r.why); return r; }
    game.socket.emit(SOCKET, {type: "order", payload: {...req, userId: game.user.id}});
    ui.notifications.info(req.hard ? "The hard order goes to the Storyteller." : "Order sent.");
    return {ok: true, sent: true};
  }

  function registerHandler() {
    chron()?.approvals?.registerHandler?.(T_ORDER, {label: "A hard order for a follower", approve: async entry => {
      const d = entry?.data ?? {};
      const scene = game.scenes.get(d.sceneId), tok = scene?.tokens?.get(d.tokenId);
      if ( tok?.actor && d.order ) {
        await apply(tok.actor, O.normOrder(d.order), {scene, tok, by: game.users.get(entry.from) ?? null});
        await driftFor(worldActor(tok.actor), d.order.leader, "hard");
      }
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
    // NPC 0.37.0: errands come back, followers join chases, loyalty drifts, breaches are traced to masters
    Hooks.on("wodxTaskDone", e => onTaskDone(e).catch(err => console.error(`${MOD} | errand`, err)));
    Hooks.on("wodxChase", e => onChase(e).catch(err => console.error(`${MOD} | chase`, err)));
    Hooks.on("wodxFed", e => { if ( !isActiveGM() ) return; const v = worldActor(fromUuidSync?.(e?.vessel?.uuid)), m = worldActor(fromUuidSync?.(e?.by?.uuid));
      if ( v && m && servesOf(v).includes(m.id) ) driftFor(v, m.id, "fedOn").catch(err => console.error(`${MOD} | loyalty`, err)); });
    Hooks.on("wodxGhoulFix", e => { if ( !isActiveGM() ) return; const g = worldActor(e?.actor);
      const dom = O.servesFrom({"wodx-creation": {lineage: g?.flags?.["wodx-creation"]?.lineage}})[0];
      if ( g && dom ) driftFor(g, dom, e.drank ? "drank" : "unfed", {months: e.months}).catch(err => console.error(`${MOD} | loyalty`, err)); });
    Hooks.on("wodxBreach", e => onBreach(e).catch(err => console.error(`${MOD} | breach`, err)));
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

  return {registerSettings, hooks, registerHandler, give, clear, openOrders, followersFor, orderOf, servesOf, stepBeside, sentries, loyaltyFor,
    onTaskDone, onChase, onBreach, driftFor, setHelper, rules: O};
}
