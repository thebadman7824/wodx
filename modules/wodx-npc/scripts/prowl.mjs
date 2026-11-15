/**
 * WoDX NPC (NPC Motives Desk r2, B5688): a footpad, burglar, bandit or highwayman out on the prowl picks a lone
 * player's character as a mark, closes in on the map and demands money. The player answers on the card: pay, talk or
 * fight, and the criminal acts on the answer. prowl-rules.mjs has the rules.
 */
import * as PW from "./prowl-rules.mjs";
import * as MR from "./mortal-rules.mjs";

export function build({MOD, esc, gmIds, isActiveGM, C, chron, routines, profileFor, yardsBetween}) {
  const SOCKET = `module.${MOD}`;
  const ST = () => game.modules.get("wodx-storyteller")?.api ?? null;
  const mem = () => game.modules.get(MOD)?.api?.memory ?? null;
  const num = v => Number(v) || 0;
  const on = () => { try { return game.settings.get(MOD, "routineMode") !== "off"; } catch (e) { return false; } };
  const base = a => (a?.isToken ? (a.baseActor ?? game.actors.get(a.id)) : a);
  const keyOf = a => { const own = base(a)?.getFlag?.(MOD, "archetype"); return MR.MORTALS[own] ? own : MR.guessMortal(a?.token?.name ?? a?.name); };
  const attr = (a, k) => num(a?.system?.attributes?.[k]?.total ?? a?.system?.attributes?.[k]?.value);
  const abil = (a, k) => {
    const flat = a?.system?.abilities?.[k];
    if ( flat?.value !== undefined ) return num(flat.value);
    return num([...(a?.items ?? [])].find(i => ["Ability", "Trait"].includes(i.type) && (i.system?.id === k || String(i.name).toLowerCase() === k))?.system?.value);
  };
  const isGuard = a => profileFor?.(a)?.template === "guard";
  const armed = a => [...(a?.items ?? [])].some(i => ["Melee", "Ranged", "Weapon"].includes(i.type) && i.system?.equipped !== false);

  async function night() {
    try { await routines.loadCalendar(); return !!routines.describer()(game.time.worldTime)?.isNight; } catch (e) { const h = new Date(game.time.worldTime * 1000).getUTCHours(); return h < 6 || h >= 20; }
  }

  /** Every prowler on this map looks for a mark. Returns the cards posted. */
  async function check(scene = canvas?.scene) {
    if ( !isActiveGM() || !scene || !canvas?.ready || canvas.scene?.id !== scene.id || !on() ) return [];
    const t = game.time.worldTime, dark = await night(), posted = [];
    const toks = canvas.tokens.placeables.filter(o => o.actor && !o.document.hidden);
    for ( const tok of toks ) {
      const a = base(tok.actor);
      if ( !a || a.hasPlayerOwner || routines.downState?.(a) || game.combat?.combatants?.some?.(c => c.tokenId === tok.id) ) continue;
      const w = routines.whereOf(a);
      const key = keyOf(a);
      if ( !PW.prowling(key, w?.activity, dark) ) continue;
      const tried = a.getFlag(MOD, "prowl") ?? {};
      const cands = toks.filter(o => o.actor.hasPlayerOwner).map(o => ({id: o.id, player: true, yards: yardsBetween(tok, o),
        side: toks.filter(x => x.id !== tok.id && (x.actor.hasPlayerOwner || x.document.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) && yardsBetween(o, x) <= PW.ALONE_YARDS).length,
        guards: toks.filter(x => x.id !== tok.id && !x.actor.hasPlayerOwner && isGuard(x.actor) && armed(x.actor) && yardsBetween(o, x) <= PW.NOTICE_YARDS).length,
        tried: tried[o.actor.id] ?? null}));
      const markId = PW.pickMark(cands, t);
      if ( !markId ) continue;
      const mark = canvas.tokens.get(markId);
      await a.setFlag(MOD, "prowl", {...tried, [mark.actor.id]: t});
      await routines.goTo(tok, mark, null);
      posted.push(await card(tok, mark, key));
    }
    return posted;
  }

  async function card(tok, mark, key) {
    const owners = game.users.filter(u => !u.isGM && mark.actor.testUserPermission(u, "OWNER")).map(u => u.id);
    const line = PW.PROWLERS[key]?.line ?? "Your purse.";
    return ChatMessage.create({speaker: {alias: tok.name}, whisper: [...new Set([...owners, ...gmIds()])],
      flags: {[MOD]: {prowl: {scene: canvas.scene.uuid, prowler: tok.document.uuid, mark: mark.document.uuid, key, done: null}}},
      content: `<div class="vta-card wodx-x wnpc"><header class="vta-head"><h3>${esc(tok.name)} steps out in front of ${esc(mark.name)}</h3></header><div class="vta-body">
        <p>"${esc(line)}"</p><p class="wodx-quiet">Pay what is asked, try to talk your way past, or fight.</p>
        <div class="wnpc-done"><button type="button" class="wnpc-pw" data-a="pay">Pay</button> <button type="button" class="wnpc-pw" data-a="talk">Talk</button> <button type="button" class="wnpc-pw" data-a="fight">Fight</button></div></div></div>`});
  }

  /** Carry out the player's answer (on the Storyteller's side). */
  async function answer(msg, choice, {userId = game.user.id} = {}) {
    msg = typeof msg === "string" ? game.messages.get(msg) : msg;
    const d = msg?.flags?.[MOD]?.prowl;
    if ( !d || d.done || !isActiveGM() ) return d?.done ?? null;
    const p = (await fromUuid(d.prowler))?.object, m = (await fromUuid(d.mark))?.object;
    if ( !p || !m ) return null;
    const u = game.users.get(userId);
    if ( u && !u.isGM && !m.actor.testUserPermission(u, "OWNER") ) return null;
    let talked = false, paid = true, extra = "";
    if ( choice === "pay" ) {
      const purse = (() => { try { return ST()?.upkeep?.money?.purse?.(m.actor); } catch (e) { return null; } })();
      const amount = PW.demandOf(purse?.carried);
      if ( amount ) {
        const r = await ST()?.upkeep?.money?.transfer?.(m.actor, base(p.actor), amount, {note: `Robbed by ${p.name}`}).catch(() => null);
        paid = r?.ok !== false;
        if ( paid ) extra = ` (${(() => { try { return ST().upkeep.money.format(amount); } catch (e) { return amount; } })()})`;
      } else paid = !purse; // no purse system: the money changes hands off the books
    } else if ( choice === "talk" ) {
      const tr = PW.talkRoll({manipulation: attr(m.actor, "manipulation"), charisma: attr(m.actor, "charisma"), intimidation: abil(m.actor, "intimidation"), persuasion: abil(m.actor, "persuasion")}, profileFor?.(p.actor) ?? {});
      const roll = await new Roll(`${tr.pool}d10cs>=${tr.difficulty}`).evaluate();
      const ones = roll.dice[0]?.results?.filter(x => x.result === 1).length ?? 0;
      talked = roll.total - ones > 0;
      await roll.toMessage({speaker: ChatMessage.getSpeaker({token: m.document}), flavor: `${tr.ability} to talk ${p.name} down, difficulty ${tr.difficulty}`});
    }
    const out = PW.after(choice, {talked, paid});
    try { await mem()?.remember?.(base(p.actor), m.actor, {kind: out.memory, text: `${choice === "pay" ? "Paid up when stopped" : choice === "talk" ? "Talked back when stopped" : "Fought when stopped"}`, seen: true}); } catch (e) { /* memory off */ }
    let fight = "";
    if ( out.go ) await routines.goAway(p, m, null);
    else if ( out.fight ) {
      const starter = C()?.fight?.start;
      if ( starter ) { const r = await starter({scene: canvas.scene, tokens: [p.document, m.document], source: "region", why: `${p.name} robs ${m.name}`, byHand: true}); fight = r?.done === "off" ? " Start the fight from the combat tracker." : " The fight begins."; }
      else fight = " Start the fight from the combat tracker.";
    }
    const text = `${p.name} ${out.text}${extra}.${fight}`;
    await msg.update({[`flags.${MOD}.prowl.done`]: choice, content: String(msg.content).replace(/<div class="wnpc-done">[\s\S]*?<\/div>/, `<p><b>${esc(text)}</b></p>`)});
    return {choice, ...out, text};
  }

  function hooks() {
    let wait = null;
    Hooks.on("updateWorldTime", () => {
      if ( !isActiveGM() || !on() ) return;
      clearTimeout(wait);
      wait = setTimeout(() => routines.idle().then(() => check()).catch(e => console.error(`${MOD} | prowl`, e)), 900);
    });
    Hooks.on("renderChatMessageHTML", (msg, el) => {
      if ( !msg.flags?.[MOD]?.prowl ) return;
      el.querySelectorAll("button.wnpc-pw").forEach(b => b.addEventListener("click", ev => {
        ev.preventDefault(); b.disabled = true;
        if ( isActiveGM() ) answer(msg, b.dataset.a).catch(e => console.error(`${MOD} | prowl`, e));
        else game.socket.emit(SOCKET, {type: "prowl.answer", msgId: msg.id, choice: b.dataset.a, userId: game.user.id});
      }));
    });
    Hooks.once("ready", () => game.socket.on(SOCKET, m => {
      if ( !isActiveGM() || m?.type !== "prowl.answer" ) return;
      answer(m.msgId, m.choice, {userId: m.userId}).catch(e => console.error(`${MOD} | prowl`, e));
    }));
  }

  return {check, answer, hooks, rules: PW};
}
