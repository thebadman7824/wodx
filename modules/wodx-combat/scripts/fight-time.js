/**
 * WoDX Combat 3.18.0: how long a fight took, the Foundry part (the rules are in fight-time-rules.js).
 * When a started fight is ended, the active Storyteller moves the time once: the clock, or the fighters' own time when
 * they are apart from the main group (WoDX Storyteller's api.time). The after-action card names the length.
 */
import * as FT from "./fight-time-rules.js";

const MOD = "wodx-combat";
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);

export function registerFightTimeSettings() {
  game.settings.register(MOD, "turnSeconds", {name: "Seconds a turn takes (house rule)",
    hint: "When a fight ends, the clock moves by its turns times this. 0 keeps fights from moving the clock.",
    scope: "world", config: true, type: Number, default: FT.DEFAULT_TURN});
}
export const perTurn = () => { try { const v = Number(game.settings.get(MOD, "turnSeconds")); return Number.isFinite(v) ? v : FT.DEFAULT_TURN; } catch (e) { return FT.DEFAULT_TURN; } };
const afterActionOn = () => { try { return game.settings.get(MOD, "afterAction") !== false; } catch (e) { return true; } };

/** The length line for a fight: "3 turns, about 9 seconds", or "" when nothing moves. */
export function lengthOf(combat) {
  const rounds = Number(combat?.round) || 0;
  const s = FT.fightSeconds(rounds, perTurn());
  return s ? FT.fightWords(rounds, s) : "";
}

async function onEnd(combat) {
  if ( !isActiveGM() || !combat?.started ) return;
  const rounds = Number(combat.round) || 0, seconds = FT.fightSeconds(rounds, perTurn());
  if ( !seconds ) return;
  const ids = [...new Set(combat.combatants.map(c => c.actor).filter(a => a?.hasPlayerOwner).map(a => a.id))];
  const time = game.modules.get("wodx-storyteller")?.api?.time;
  let r;
  if ( time?.spend && ids.length ) r = await time.spend({actorIds: ids, seconds, label: "a fight"});
  else { await game.time.advance(seconds); r = {how: "clock", seconds}; }
  // The after-action card names the length; with it off, a short note does
  if ( !afterActionOn() ) {
    const names = ids.map(id => game.actors.get(id)?.name).filter(Boolean).join(", ");
    const line = time?.note ? time.note(r, names) : `The clock moves on ${seconds} seconds.`;
    await ChatMessage.create({content: `<div class="vtc-card"><p>The fight lasted ${FT.fightWords(rounds, seconds)}. ${line}</p></div>`, whisper: gmIds(), speaker: {alias: "WoDX Combat"}});
  }
}

export function setupFightTime() {
  Hooks.on("deleteCombat", c => { onEnd(c).catch(e => console.error(`${MOD} | fight time`, e)); });
}
