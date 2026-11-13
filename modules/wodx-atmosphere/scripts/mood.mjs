import {MOODS, CUES} from "./kits-rules.mjs";

/**
 * WoDX Atmosphere 0.11.0: a part of a map with its own mood. A "WoDX: Mood" region changes the music while a player's
 * character is inside, plays a cue on the way in, and whispers the Storyteller's own words to that character's
 * players. A WoDX Chronicle "Only when" list can limit it (the crypt goes quiet only at night; the market hums only
 * before the factories, say). The music goes back to what was playing when the last of them leaves.
 * The music is the era's kit, so the same region sounds right in any era.
 * Atmosphere 0.16.0 (B2913): a mood region can also carry a rule. Steps up or down on the Gauntlet, the Shroud and
 * Banality are read by WoDX Otherworlds when someone crosses or is rated inside it; the fire step (Rotschreck and
 * frenzy near open flame) is kept for the rolls that check fear of fire, through api.mood.ruleAt.
 */
const MOD = "wodx-atmosphere";
export const TYPE = "mood";
const chron = () => game.modules.get("wodx-chronicle")?.api;
const isActiveGM = () => !!game.user?.isGM && game.users.activeGM?.id === game.user.id;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);

/** Pure: a mood region's rule kept clean (steps, each -3 to +3; fire 0 to 3). */
export function moodRule(sys = {}) {
  const step = (v, lo = -3) => Math.max(lo, Math.min(3, Math.round(Number(v) || 0)));
  return {gauntlet: step(sys?.gauntlet), shroud: step(sys?.shroud), banality: step(sys?.banality), fire: step(sys?.fire, 0)};
}
/** The rules of the mood regions holding a token (any level), summed: {gauntlet, shroud, banality, fire, names}. */
export function ruleAt(tokenDoc) {
  const out = {gauntlet: 0, shroud: 0, banality: 0, fire: 0, names: []};
  const scene = tokenDoc?.parent, T = `${MOD}.${TYPE}`;
  if ( !scene?.regions ) return out;
  const gs = scene.grid?.size ?? 100;
  const c = tokenDoc.object?.center ?? {x: (tokenDoc.x ?? 0) + (tokenDoc.width ?? 1) * gs / 2, y: (tokenDoc.y ?? 0) + (tokenDoc.height ?? 1) * gs / 2};
  for ( const r of scene.regions ) {
    let inside = false;
    try { inside = (r.polygonTree ?? r.object?.polygonTree)?.testPoint?.(c) ?? false; } catch (e) { inside = false; }
    if ( !inside ) continue;
    for ( const b of r.behaviors ?? [] ) {
      if ( b.type !== T || b.disabled ) continue;
      if ( String(b.system?.when ?? "").trim() ) { const W = chron()?.when; if ( W?.check && !W.check(b.system.when, {token: tokenDoc, actor: tokenDoc.actor, scene}).ok ) continue; }
      const m = moodRule(b.system);
      if ( !m.gauntlet && !m.shroud && !m.banality && !m.fire ) continue;
      for ( const k of ["gauntlet", "shroud", "banality", "fire"] ) out[k] += m[k];
      out.names.push(r.name || "A mood region");
    }
  }
  return out;
}

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
        before: new f.StringField({required: false, blank: true, initial: ""}),
        gauntlet: new f.NumberField({required: false, nullable: false, initial: 0, integer: true, min: -3, max: 3, label: "Gauntlet step", hint: "Up or down for crossing to the Umbra inside, such as -1 in a holy grove or +1 under factory lights."}),
        shroud: new f.NumberField({required: false, nullable: false, initial: 0, integer: true, min: -3, max: 3, label: "Shroud step", hint: "Up or down for the dead and for those who cross the Shroud inside."}),
        banality: new f.NumberField({required: false, nullable: false, initial: 0, integer: true, min: -3, max: 3, label: "Banality step", hint: "Up or down for the Banality of the place, a dreary office or a fair full of wonder."}),
        fire: new f.NumberField({required: false, nullable: false, initial: 0, integer: true, min: 0, max: 3, label: "Open fire: fear step", hint: "Added to the difficulty of rolls against fear of fire (Rotschreck) and frenzy inside: a burning street, a bonfire."})
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
