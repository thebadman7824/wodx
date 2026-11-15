/**
 * WoDX NPC (NPC Aftercare Desk, B5800-B5806): what comes after. Rules in aftercare-rules.mjs.
 *
 *   n1  law       wodxArrest: held at the watch-house (a duty) or off the maps; wodxVerdict and wodxSentence: let go
 *                 (home first), off the maps for the sentence, gone for good, or put to death
 *   n2  wounds    when a fight ends a hurt NPC goes to be tended (a hospital or house of worship, else home) and mends
 *                 on the healing clock; a Kindred NPC heals with blood first
 *   n3  rivals    rivalry.mjs: the one who backs down walks off and remembers; the next meeting is likelier to come to blows
 *   n4  the Kiss  wodxFed: a mortal NPC vessel is Dazed for ten minutes, then rests at home until morning
 *   n5  mourning  hearts.mjs: an NPC who loses someone close mourns by faith on the map; regard for the killers sours
 *   n6  robbery   prowl.mjs: the robber spends the night at the tavern; the robbed can report it to the watch
 *   n7  marriage  wodxMarried: the spouses share a home; wodxDivorced moves the mover back
 *   Flags: wodx-npc.mend {last}, kissed {until}, standoffs {otherId: at}, gone {why, at}, diedBy [ids], homeBefore.
 */
import * as AC from "./aftercare-rules.mjs";
import {faithFor} from "../../wodx-chronicle/scripts/faith-rules.mjs";
import * as TERMS from "../../wodx-chronicle/scripts/terms.mjs";

export function build({MOD, esc, gmIds, isActiveGM, chron, routines, C}) {
  const now = () => game.time?.worldTime ?? 0;
  const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 1197; } catch (e) { return 1197; } };
  const base = a => (a?.isToken ? (a.baseActor ?? game.actors.get(a.id)) : a);
  const isNpc = TERMS.isNPC;
  const mem = () => game.modules.get(MOD)?.api?.memory ?? null;
  const flag = (a, k) => a?.getFlag?.(MOD, k);
  const dmg = a => { const ct = C()?.corpusTrack?.(a); const d = ct?.damage ?? a?.system?.health?.damage ?? {}; return {bashing: Number(d.bashing) || 0, lethal: Number(d.lethal) || 0, aggravated: Number(d.aggravated) || 0}; };
  const card = (title, text) => ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), content: `<div class="vta-card wodx-x wnpc"><div class="vta-body"><p><b>${esc(title)}</b></p><p>${esc(text)}</p></div></div>`});
  const homeOf = a => routines.routineOf(a)?.roles?.home ?? routines.routineOf(a)?.roles?.haven ?? null;
  /**
   * B6173: who a duty goes on. A linked NPC keeps its own; an unlinked token's NPC shares the routine of its world actor
   * (routines move tokens by actor id), so the duty goes there when that actor keeps a routine and this is its only
   * token on the scene (a shared "Thug" with five tokens is left alone, so the routine does not clear the others).
   */
  const dutyHolder = (a, tok = null) => {
    const w = base(a);
    if ( !w || !a?.isToken ) return w;
    if ( routines.routineOf(w)?.on !== true ) return null;
    const sc = tok?.parent ?? a.token?.parent ?? null;
    const same = sc ? [...sc.tokens].filter(d => d.actorId === w.id).length : 0;
    return same === 1 ? w : null;
  };
  /** Unlinked token actors on every scene that carry a flag of this module (their deltas are not in game.actors). */
  const unlinkedWith = k => [...game.scenes].flatMap(s => [...s.tokens].filter(d => !d.actorLink && d.actor?.flags?.[MOD]?.[k]).map(d => d.actor));
  /** The first tagged place of these kinds: on the actor's scene if it has one there, else anywhere. */
  function placeOf(kinds, a = null) {
    const P = routines.listPlaces().filter(p => kinds.includes(p.kind));
    const sc = a ? (a.getActiveTokens?.(false, true)?.[0]?.parent ?? null) : null;
    const pick = kinds.map(k => P.find(p => p.kind === k && sc && p.scene?.id === sc.id) ?? null).find(Boolean) ?? kinds.map(k => P.find(p => p.kind === k)).find(Boolean);
    return pick?.id ?? null;
  }
  const faithHere = a => {
    const sc = a?.getActiveTokens?.(false, true)?.[0]?.parent ?? canvas?.scene;
    let region = null;
    try { region = chron()?.world?.here?.(sc)?.id ?? chron()?.world?.homeland?.() ?? null; } catch (e) { region = null; }
    try { return faithFor(region ?? "moravia", yearNow()) ?? "western"; } catch (e) { return "western"; }
  };

  /* ---- n1: the law ---- */
  async function onArrest(p = {}) {
    const a = game.actors.get(p.actor);
    if ( !isActiveGM() || !isNpc(a) ) return null;
    const watch = placeOf(["gate"], a);
    if ( watch ) await routines.setDuty(a, "law", AC.heldDuty(watch));
    else await a.setFlag(MOD, "paused", {reason: "held", at: now()});
    await card(`${a.name} is held`, watch ? "At the watch-house until the verdict." : "Away from the maps until the verdict.");
    return watch ? "held" : "away";
  }
  async function release(a, why = "Let go") {
    await routines.setDuty(a, "law", null);
    if ( ["held", "sentence"].includes(flag(a, "paused")?.reason) ) await a.unsetFlag(MOD, "paused");
    const home = homeOf(a);
    if ( home ) await routines.setDuty(a, "home-first", AC.homeDuty(home, now()));
    await card(`${a.name}: ${why}`, home ? "They go home first, then back to their day." : "They go back to their day.");
    return "free";
  }
  async function onVerdict(p = {}) {
    const a = game.actors.get(p.actor);
    if ( !isActiveGM() || !isNpc(a) || p.guilty ) return null;
    return release(a, "found not guilty");
  }
  async function onSentence(p = {}) {
    const a = game.actors.get(p.actor);
    if ( !isActiveGM() || !isNpc(a) ) return null;
    const r = AC.lawAfter(p.mercy ? null : p.mark);
    if ( r.do === "free" ) return release(a, p.mercy ? "shown mercy" : "sentence done");
    await routines.setDuty(a, "law", null);
    if ( r.do === "time" ) {
      const until = now() + r.seconds, home = homeOf(a);
      await a.setFlag(MOD, "paused", {reason: "sentence", at: now(), until});
      if ( home ) await routines.setDuty(a, "home-first", {...AC.homeDuty(home, until), after: until});
      await card(`${a.name} serves the sentence`, `Away from the maps for ${Math.round(r.seconds / AC.YEAR)} years; then home.`);
      return "time";
    }
    if ( r.do === "gone" ) {
      await a.update({[`flags.${MOD}.routine.on`]: false, [`flags.${MOD}.gone`]: {why: "banished", at: now()}, [`flags.${MOD}.-=paused`]: null});
      await card(`${a.name} is banished`, "They leave the land; their routine ends.");
      return "gone";
    }
    await a.update({[`flags.${MOD}.routine.on`]: false, [`flags.${MOD}.-=paused`]: null});
    try { await a.toggleStatusEffect("dead", {active: true}); } catch (e) { /* no status */ }
    await card(`${a.name} is put to death`, "The sentence is carried out.");
    return "dead";
  }

  /* ---- n2: wounds ---- */
  async function bloodMend(a) {
    if ( String(a.type) !== "Vampire" ) return 0;
    const pool = a.system?.advantages?.bloodpool;
    const h = AC.bloodHeal(dmg(a), Number(pool?.temporary) || 0);
    if ( !h.spent ) return 0;
    if ( h.bashing ) await C()?.healDamage?.(a, "bashing", h.bashing);
    if ( h.lethal ) await C()?.healDamage?.(a, "lethal", h.lethal);
    await a.update({"system.advantages.bloodpool.temporary": (Number(pool.temporary) || 0) - h.spent});
    return h.spent;
  }
  /** After a fight: each hurt NPC heals with blood (Kindred), then goes to be tended if laid up, and mends on the clock. */
  async function afterFight(combat) {
    if ( !isActiveGM() ) return [];
    const out = [];
    for ( const c of combat?.combatants ?? [] ) {
      const a = c.actor;
      if ( !isNpc(a) || a.statuses?.has?.("dead") ) continue;
      await bloodMend(a);
      const d = dmg(a);
      if ( !AC.nextHeal(d) ) continue;
      await a.setFlag(MOD, "mend", {last: now()});
      const w = dutyHolder(a, c.token);
      if ( AC.laidUp(d) && w && routines.routineOf(w)?.on !== false ) {
        const place = (AC.needsCare(d) ? placeOf(AC.HEALERS, w) : null) ?? homeOf(w);
        if ( place ) { await routines.setDuty(w, "tend", AC.tendDuty(place)); out.push(`${a.name} goes to be tended`); }
      }
    }
    // the dead: who they died fighting, for those who mourn them
    for ( const c of combat?.combatants ?? [] ) {
      const a = c.actor;
      if ( !a?.statuses?.has?.("dead") || !c.token ) continue;
      const foes = (combat.combatants ?? []).filter(x => x.token && x.token.disposition !== c.token.disposition && x.actor).map(x => base(x.actor)?.id).filter(Boolean);
      if ( foes.length ) await base(a)?.setFlag?.(MOD, "diedBy", [...new Set(foes)].slice(0, 8));
    }
    if ( out.length ) await card("After the fight", `${out.join("; ")}.`);
    return out;
  }
  /** Wounds mend as the clock runs. */
  async function mendTick() {
    if ( !isActiveGM() ) return 0;
    const t = now();
    let n = 0;
    const actors = [...game.actors, ...unlinkedWith("mend")];
    for ( const a of actors ) {
      const m = a?.flags?.[MOD]?.mend;
      if ( !m ) continue;
      let last = Number(m.last) || t, guard = 0;
      await bloodMend(a);
      let nh = AC.nextHeal(dmg(a));
      while ( nh && t - last >= nh.seconds && guard++ < 12 ) { await C()?.healDamage?.(a, nh.type, 1); last += nh.seconds; n++; nh = AC.nextHeal(dmg(a)); }
      const d = dmg(a), w = base(a);
      if ( !AC.laidUp(d) && w?.getFlag?.(MOD, "duties")?.tend ) await routines.setDuty(w, "tend", null);
      if ( !nh ) await a.unsetFlag(MOD, "mend");
      else if ( last !== Number(m.last) ) await a.setFlag(MOD, "mend", {last});
    }
    return n;
  }

  /* ---- n4: after the Kiss ---- */
  async function onFed(p = {}) {
    if ( !isActiveGM() ) return null;
    const v = (() => { try { return fromUuidSync(p.vessel?.uuid); } catch (e) { return null; } })();
    const w = base(v);
    if ( !isNpc(v) || !["Mortal"].includes(String(w?.type)) || p.willing ) return null;
    try { await chron()?.conditions?.setCondition?.(v, "dazed", true); } catch (e) { /* no conditions */ }
    const weak = (Number(p.drunk) || 0) >= AC.WEAK_FROM;
    await v.setFlag(MOD, "kissed", {until: weak ? AC.nextMorning(now()) : now() + AC.DAZE_SECONDS, by: base(fromUuidSync(p.by?.uuid))?.id ?? null});
    const h = dutyHolder(v), home = h ? homeOf(h) : null;
    if ( home ) await routines.setDuty(h, "kissed", AC.restDuty(home, now()));
    return {weak, home: !!home};
  }
  /** B6173: the Daze lifts on world actors and on unlinked tokens alike (a passer-by fed on is a token's own actor). */
  async function kissTick() {
    const t = now();
    for ( const a of [...game.actors, ...unlinkedWith("kissed")] ) {
      const k = flag(a, "kissed");
      if ( !k || t < k.until ) continue;
      try { await chron()?.conditions?.setCondition?.(a, "dazed", false); } catch (e) { /* none */ }
      await a.unsetFlag(MOD, "kissed");
    }
  }

  /* ---- n5: mourning ---- */
  /** An NPC who loses someone close mourns by faith; its regard for those the dead fell fighting sours. */
  async function mourn(who, victim) {
    if ( !isActiveGM() || !isNpc(who) ) return null;
    const faith = faithHere(who), m = AC.mourningOf(faith);
    const worship = placeOf(m.place, who), home = homeOf(who);
    const ds = AC.mournDuties(home, worship, now(), faith);
    if ( ds.worship ) await routines.setDuty(who, "mourn-prayer", ds.worship);
    if ( ds.home ) await routines.setDuty(who, "mourn-home", ds.home);
    for ( const id of base(victim)?.getFlag?.(MOD, "diedBy") ?? [] ) {
      const k = game.actors.get(id);
      if ( k && k.id !== who.id ) { try { await mem()?.remember?.(who, k, {kind: "kin", text: `Killed ${victim.name}`, seen: true}); } catch (e) { /* memory off */ } }
    }
    return {days: m.days, words: m.words, worship: !!worship};
  }

  /* ---- n6: after a robbery ---- */
  async function spree(robber) {
    const a = base(robber);
    const tavern = placeOf(["tavern"], a);
    if ( !a || !tavern ) return false;
    await routines.setDuty(a, "spree", AC.spreeDuty(tavern, now()));
    return true;
  }
  async function reportRobbery(robber, victim, scene = canvas?.scene) {
    if ( !isActiveGM() || !robber ) return null;
    let heat = null;
    try { heat = await chron()?.law?.heat?.add?.(base(robber), "theft", {scene, named: false, witnesses: 1}); } catch (e) { /* no law */ }
    try { await game.modules.get("wodx-storyteller")?.api?.rumours?.start?.({text: `${victim?.name ?? "A traveller"} was robbed by ${base(robber)?.name ?? "someone"} and has gone to the watch.`, about: base(robber)?.id ?? null}); } catch (e) { /* none */ }
    return heat;
  }

  /* ---- n7: marriage ---- */
  const sexWord = x => { if ( x?.hasPlayerOwner ) return ""; const g = chron()?.gender; if ( g?.forRules ) { const l = g.rules.letter(g.forRules(x)); return l === "m" ? "male" : l === "f" ? "female" : ""; } const v = String(x?.flags?.["wodx-creation"]?.sex ?? x?.flags?.["wodx-creation"]?.people?.sex ?? x?.system?.sex ?? "").toLowerCase(); return /^m(ale)?$/.test(v) ? "male" : /^f(emale)?$/.test(v) ? "female" : ""; };
  async function onMarried(p = {}) {
    if ( !isActiveGM() ) return null;
    const a = base(p.a), b = base(p.b);
    if ( !a || !b || (!isNpc(a) && !isNpc(b)) ) return null;
    const hh = x => (x.flags?.[MOD]?.household ?? []).length;
    const mv = AC.whoMoves([a, b].map(x => ({id: x.id, home: homeOf(x), sex: sexWord(x), household: hh(x)})));
    if ( !mv ) return null;
    const mover = game.actors.get(mv.moves), host = game.actors.get(mv.to);
    if ( !isNpc(mover) || !routines.routineOf(mover) ) return null;
    const r = routines.routineOf(mover);
    await mover.update({[`flags.${MOD}.homeBefore`]: r.roles?.home ?? null, [`flags.${MOD}.routine.roles.home`]: homeOf(host)});
    await card(`${mover.name} moves in with ${host.name}`, "Their routine's home is the new household.");
    return mv;
  }
  async function onDivorced(p = {}) {
    for ( const x of [base(p.a), base(p.b)] ) {
      const before = x?.getFlag?.(MOD, "homeBefore");
      if ( !isNpc(x) || before === undefined ) continue;
      await x.update({[`flags.${MOD}.routine.roles.home`]: before, [`flags.${MOD}.-=homeBefore`]: null});
    }
  }

  function hooks() {
    Hooks.on("wodxArrest", p => { onArrest(p).catch(e => console.error(`${MOD} | held`, e)); });
    Hooks.on("wodxVerdict", p => { onVerdict(p).catch(e => console.error(`${MOD} | verdict`, e)); });
    Hooks.on("wodxSentence", p => { onSentence(p).catch(e => console.error(`${MOD} | sentence`, e)); });
    Hooks.on("deleteCombat", c => { afterFight(c).catch(e => console.error(`${MOD} | after the fight`, e)); });
    Hooks.on("wodxFed", p => { onFed(p).catch(e => console.error(`${MOD} | the Kiss`, e)); });
    Hooks.on("wodxMarried", p => { onMarried(p).catch(e => console.error(`${MOD} | married`, e)); });
    Hooks.on("wodxDivorced", p => { onDivorced(p).catch(e => console.error(`${MOD} | divorced`, e)); });
    let wait = null;
    Hooks.on("updateWorldTime", () => {
      if ( !isActiveGM() ) return;
      try { if ( chron()?.isSkipping?.() ) return; } catch (e) { /* none */ }
      clearTimeout(wait);
      wait = setTimeout(() => { mendTick().then(kissTick).catch(e => console.error(`${MOD} | aftercare`, e)); }, 800);
    });
    Hooks.on("wodxSkipEnd", () => { if ( isActiveGM() ) mendTick().then(kissTick).catch(e => console.error(`${MOD} | aftercare`, e)); });
  }

  return {hooks, onArrest, onVerdict, onSentence, release, afterFight, mendTick, onFed, kissTick, mourn, spree, reportRobbery, onMarried, onDivorced, rules: AC};
}
