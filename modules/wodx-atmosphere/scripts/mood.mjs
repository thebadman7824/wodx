import {MOODS, CUES} from "./kits-rules.mjs";

/**
 * WoDX Atmosphere 0.11.0: a part of a map with its own mood. A "WoDX: Mood" region changes the music while a player's
 * character is inside, plays a cue on the way in, and whispers the Storyteller's own words to that character's
 * players. A WoDX Chronicle "Only when" list can limit it (the crypt goes quiet only at night; the market hums only
 * before the factories, say). The music goes back to what was playing when the last of them leaves.
 * The music is the era's kit, so the same region sounds right in any era.
 */
const MOD = "wodx-atmosphere";
export const TYPE = "mood";
const chron = () => game.modules.get("wodx-chronicle")?.api;
const isActiveGM = () => !!game.user?.isGM && game.users.activeGM?.id === game.user.id;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);

/** Pure: is anyone the region cares for still inside? inside: [{pc}]. */
export const stillInside = (inside = []) => (inside ?? []).some(t => t?.pc);

export function registerMood({playMood, playCue, getMood}) {
  const Base = foundry.data?.regionBehaviors?.RegionBehaviorType, f = foundry.data?.fields;
  if ( !Base || !f || !CONFIG.RegionBehavior?.dataModels ) return false;
  const E = CONST.REGION_EVENTS ?? {TOKEN_ENTER: "tokenEnter", TOKEN_EXIT: "tokenExit"};
  const moods = {"": "Leave the music as it is", ...MOODS};
  const cues = {"": "No cue", ...CUES};
  class MoodBehavior extends Base {
    static defineSchema() {
      return {
        mood: new f.StringField({required: false, blank: true, initial: "", choices: moods, label: "Music while inside", hint: "The era kit's playlist for this mood. It goes back to what was playing when the last player's character leaves."}),
        cue: new f.StringField({required: false, blank: true, initial: "", choices: cues, label: "Cue on the way in"}),
        text: new f.StringField({required: false, blank: true, initial: "", label: "What they notice", hint: "Your own words, whispered to the character's players as they come in. {name} is the character."}),
        when: new f.StringField({required: false, blank: true, initial: "", label: "Only when", hint: "WoDX Chronicle tests, separated by ;, such as: night; before 1890. Blank: always."}),
        before: new f.StringField({required: false, blank: true, initial: ""})
      };
    }
    static events = {
      [E.TOKEN_ENTER]: async function (event) { await onEnter(this, event); },
      [E.TOKEN_EXIT]: async function (event) { await onExit(this, event); }
    };
  }
  const T = `${MOD}.${TYPE}`;
  CONFIG.RegionBehavior.dataModels[T] = MoodBehavior;
  CONFIG.RegionBehavior.typeLabels[T] = "WoDX: Mood";
  if ( CONFIG.RegionBehavior.typeHints ) CONFIG.RegionBehavior.typeHints[T] = "Music, a cue and a line for the players as a character comes in: a crypt, a chapel, a market.";
  if ( CONFIG.RegionBehavior.typeIcons ) CONFIG.RegionBehavior.typeIcons[T] = "fa-solid fa-music";

  const recent = new Map();
  async function onEnter(system, event) {
    if ( !isActiveGM() ) return null;
    const doc = event?.data?.token, behavior = system.parent, region = behavior?.parent ?? event?.region;
    const actor = doc?.actor;
    if ( !doc || !region || behavior?.disabled || !actor?.hasPlayerOwner ) return null;
    const k = `${behavior.id}:${doc.id}`, t = Date.now();
    if ( recent.get(k) > t - 3000 ) return null;
    recent.set(k, t);
    if ( String(system.when ?? "").trim() ) {
      const W = chron()?.when;
      if ( !W?.check || !W.check(system.when, {token: doc, actor, scene: region.parent}).ok ) return null;
    }
    if ( system.mood ) {
      if ( !system.before ) await behavior.update({"system.before": getMood() || "calm"});
      await playMood(system.mood, {remember: false});
    }
    if ( system.cue ) playCue(system.cue);
    if ( String(system.text ?? "").trim() ) {
      const to = game.users.filter(u => !u.isGM && actor.testUserPermission?.(u, "OWNER")).map(u => u.id);
      const text = String(system.text).replace(/\{name\}/gi, actor.name);
      if ( to.length ) await ChatMessage.create({speaker: {alias: region.name || "WoDX"}, whisper: [...to, ...game.users.filter(u => u.isGM).map(u => u.id)],
        content: `<div class="vta-card wodx-x"><div class="vta-body"><p>${esc(text)}</p></div></div>`});
    }
    return true;
  }
  async function onExit(system, event) {
    if ( !isActiveGM() ) return null;
    const behavior = system.parent, region = behavior?.parent ?? event?.region;
    if ( !region || !system.mood || !system.before ) return null;
    const gone = event?.data?.token?.id;
    const inside = [...(region.tokens ?? [])].filter(d => d.id !== gone).map(d => ({pc: !!d.actor?.hasPlayerOwner}));
    if ( stillInside(inside) ) return null;
    const back = system.before;
    await behavior.update({"system.before": ""});
    await playMood(back, {remember: false});
    return true;
  }
  return {onEnter, onExit};
}
