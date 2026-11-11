import * as AT from "./attitude-rules.mjs";

/**
 * WoDX NPC 0.12.0: each NPC's attitude toward each character (attitude-rules.mjs has the rules). The NPC's world actor
 * holds it, so every token of that NPC shares it. Changes go through WoDX Chronicle's approval queue as
 * "wodx-npc.attitude" (the Storyteller can approve that type automatically); the Storyteller's own changes apply at once.
 */
export function build({MOD, chron, savedProfile, factions}) {
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
  function seedFor(npc, charId) {
    let standing = {};
    try { standing = factions?.peopleOf?.(charId) ?? {}; } catch (e) { standing = {}; }
    return AT.seedFrom({household: savedProfile(npc)?.household ?? "", factions: factionNamesOf(npc)}, standing);
  }
  /** How the NPC regards the character now: {step, word, met, from}. */
  function of(npcLike, charLike) {
    const npc = worldOf(npcLike), ch = worldOf(charLike);
    if ( !npc || !ch ) return null;
    return AT.attitudeOf(npc.flags?.[MOD]?.attitude ?? {}, ch.id, seedFor(npc, ch.id));
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
  return {of, apply, propose, forget, seedFor, registerHandler, rules: AT, TYPE};
}
