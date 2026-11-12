import * as AT from "./attitude-rules.mjs";

/**
 * WoDX NPC 0.12.0: each NPC's attitude toward each character (attitude-rules.mjs has the rules). The NPC's world actor
 * holds it, so every token of that NPC shares it. Changes go through WoDX Chronicle's approval queue as
 * "wodx-npc.attitude" (the Storyteller can approve that type automatically); the Storyteller's own changes apply at once.
 */
export function build({MOD, chron, savedProfile, factions, rivalry = null, profileFor = null}) {
  const TYPE = `${MOD}.attitude`;
  /** The world actor behind an actor or token (an unlinked token's NPC shares one attitude). */
  const worldOf = a => {
    const actor = a?.actor ?? a;
    return actor?.id ? (game.actors.get(actor.id) ?? actor) : null;
  };
  function factionNamesOf(actor) {
    try {
      const st = factions?.state?.();
      return (st?.factions ?? []).filter(f => (f.members ?? []).includes(actor.id) || f.leader === actor.id).flatMap(f => [f.key, f.name]).filter(Boolean);
    } catch (e) { return []; }
  }
  const lookApi = () => game.modules.get("wodx-library")?.api?.look ?? null;
  /** What the NPC is for the look: their station, mortal or not, their Status kind, their abilities (NPC 0.32.0). */
  function npcForLook(npc, ch) {
    const L = lookApi();
    if ( !L ) return null;
    let template = null;
    try { template = profileFor?.(npc, {phases: false})?.template ?? savedProfile(npc)?.template ?? null; } catch (e) { template = null; }
    let kind = null, chKind = null;
    try { kind = chron()?.traits?.kindOf?.(npc) ?? null; chKind = ch ? chron()?.traits?.kindOf?.(ch) ?? null : null; } catch (e) { kind = null; }
    const abilities = {};
    for ( const [k, v] of Object.entries(npc?.system?.abilities ?? {}) ) abilities[k] = Number(v?.total ?? v?.value) || 0;
    let mortal = !kind || kind === "mortal";
    try { if ( kind && !mortal ) mortal = !!chron()?.traits?.rules?.kindsOf?.(kind)?.includes?.("mortal"); } catch (e) { /* as it was */ }
    return {station: L.station(npc, template), mortal, sameKind: !!kind && kind === chKind, abilities};
  }
  /** The look's step at a first meeting, and what still shows at a later one (scene only). */
  function lookFor(npc, ch, {later = false} = {}) {
    try {
      const L = lookApi(), n = ch ? npcForLook(npc, ch) : null;
      if ( !L || !n ) return null;
      const year = Number(chron()?.eras?.currentYear?.()) || null;
      const look = L.asSeen(L.of(ch), heldFor(npc, ch));
      return later ? L.scene(look, {mortal: n.mortal}) : L.seed(look, n, year);
    } catch (e) { return null; }
  }
  /** Did the character's disguise hold against this NPC (WoDX Actions' disguise roll)? */
  function heldFor(npc, ch) {
    const d = ch?.flags?.["wodx-actions"]?.disguise?.[npc?.id];
    return !!d?.held;
  }
  function seedFor(npc, charId) {
    const seed = baseSeed(npc, charId);
    const ch = game.actors.get(charId);
    // Chronicle 0.20.0 (Traits With Teeth step 5): the character's merits and flaws move the first look (Friendly Face, Monstrous)
    let t = null;
    try { t = ch ? chron()?.traits?.attitudeSeed?.(ch, npc) : null; } catch (e) { t = null; }
    // NPC 0.32.0: what they wear and how they are (WoDX Library's look); traits and look each to two steps, together to three
    const lk = lookFor(npc, ch);
    const tD = Number(t?.delta) || 0, lD = Number(lk?.delta) || 0;
    if ( !tD && !lD ) return seed;
    const L = lookApi();
    const delta = L ? L.rules.combine(tD, lD) : tD + lD;
    return AT.withTraits(seed, {delta, names: [...(tD ? t.names ?? [] : []), ...(lD ? lk.names ?? [] : [])]});
  }
  function baseSeed(npc, charId) {
    let standing = {};
    try { standing = factions?.peopleOf?.(charId) ?? {}; } catch (e) { standing = {}; }
    const seed = AT.seedFrom({household: savedProfile(npc)?.household ?? "", factions: factionNamesOf(npc)}, standing);
    if ( seed.from || !rivalry ) return seed;
    // NPC 0.18.0 (B823): nothing from household or faction; a rival side the NPC recognises sets the first meeting
    try {
      const ch = game.actors.get(charId);
      const r = ch ? rivalry.seedFor(npc, ch) : null;
      if ( r ) return r;
    } catch (e) { /* no rivalry */ }
    return seed;
  }
  /** How the NPC regards the character now: {step, word, met, from}. */
  function of(npcLike, charLike) {
    const npc = worldOf(npcLike), ch = worldOf(charLike);
    if ( !npc || !ch ) return null;
    const now = AT.attitudeOf(npc.flags?.[MOD]?.attitude ?? {}, ch.id, seedFor(npc, ch.id));
    if ( !now.met ) return now;
    // NPC 0.32.0: blood or wounds sour a later meeting for this scene only; nothing is stored
    const sc = lookFor(npc, ch, {later: true});
    return sc?.delta ? AT.withScene(now, sc) : now;
  }
  /** Storyteller only: change it now. Returns the new entry. */
  async function apply(npcLike, charLike, change = {}) {
    const npc = worldOf(npcLike), ch = worldOf(charLike);
    if ( !game.user.isGM || !npc || !ch ) return null;
    const all = npc.flags?.[MOD]?.attitude ?? {};
    const entry = AT.changed(all, ch.id, {...change, at: game.time.worldTime}, seedFor(npc, ch.id));
    await npc.update({[`flags.${MOD}.attitude.${ch.id}`]: entry});
    Hooks.callAll("wodxAttitude", {npc, character: ch, entry, change});
    return entry;
  }
  /**
   * Ask for a change. The Storyteller's client applies it at once; a player's goes to the approval queue, where the
   * Storyteller can let this type through on its own. Returns what happened: "applied", "proposed" or null.
   */
  async function propose(npcLike, charLike, change = {}) {
    const npc = worldOf(npcLike), ch = worldOf(charLike);
    if ( !npc || !ch || (!Number(change.delta) && (change.to === null || change.to === undefined)) ) return null;
    if ( game.user.isGM ) { await apply(npc, ch, change); return "applied"; }
    const now = of(npc, ch);
    const next = change.to !== undefined && change.to !== null ? AT.stepOf(change.to) : now.step + Number(change.delta);
    const res = await chron()?.propose?.({type: TYPE, title: `${npc.name} toward ${ch.name}: ${now.word} to ${AT.word(next)}`,
      detail: change.why ?? "", data: {npc: npc.id, char: ch.id, delta: Number(change.delta) || 0, to: change.to ?? null, why: change.why ?? ""}});
    return res === undefined ? null : "proposed";
  }
  function registerHandler() {
    chron()?.registerApprovalHandler?.(TYPE, {
      label: "NPC attitude",
      approve: async entry => {
        const d = entry.data ?? {};
        const npc = game.actors.get(d.npc), ch = game.actors.get(d.char);
        if ( npc && ch ) await apply(npc, ch, {delta: d.delta, to: d.to, why: d.why});
      }
    });
  }
  /** Storyteller only: forget a character (the next meeting seeds again). */
  async function forget(npcLike, charLike) {
    const npc = worldOf(npcLike), ch = worldOf(charLike);
    if ( !game.user.isGM || !npc || !ch ) return null;
    const Del = globalThis.foundry?.data?.operators?.ForcedDeletion;
    return npc.update(Del ? {[`flags.${MOD}.attitude.${ch.id}`]: new Del()} : {[`flags.${MOD}.attitude.-=${ch.id}`]: null});
  }
  return {of, apply, propose, forget, seedFor, lookFor, registerHandler, rules: AT, TYPE};
}
