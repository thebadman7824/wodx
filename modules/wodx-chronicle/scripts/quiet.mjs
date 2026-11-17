/**
 * Light-touch mode as a quiet night (B6380). With the house rule on, the work that acts by itself waits, as it does
 * through a time skip: timed effects ending, a ghoul's monthly need, time served, a derangement bout running out on
 * the clock, the Clan features tick, the Cities tick (chains, saga, fronts), the watch's patrols and calls for help.
 * Crimes still raise the law's heat, but the warrant's card and the watch it sends wait; a power's lasting damage to
 * the ground and the town's weekly rebuilding wait too. When the switch is turned off, all of it settles once:
 *   wodxLightTouchEnd {from, to, label: "light-touch"}   heard by every ticking handler, like wodxSkipEnd
 * and the held law stages and scars are played out here.
 *
 *   isQuiet()   a time skip, a hold, or Light-touch mode
 */
import {MODULE_ID, rule, setting, setSetting, isActiveGM, log} from "./util.mjs";
import {isSkipping} from "./skip.mjs";

const KEY = "quietHeld";
const now = () => game.time?.worldTime ?? 0;
const empty = () => ({since: null, law: [], scars: [], heal: {}});

export function registerQuietSettings() {
  game.settings.register(MODULE_ID, KEY, {scope: "world", config: false, type: Object, default: empty()});
}

export function isLightTouch() { try { return rule("lightTouch"); } catch (e) { return false; } }
/** Per-tick work waits: a time skip, a hold, or Light-touch mode. */
export function isQuiet() { return isSkipping() || isLightTouch(); }

const held = () => { try { return {...empty(), ...(setting(KEY) ?? {})}; } catch (e) { return empty(); } };
const save = h => setSetting(KEY, h);

/** Keep a law stage (the warrant's card and the watch) for when the quiet ends. */
export async function holdLaw(entry) {
  const h = held();
  h.law = [...h.law.filter(x => !(x.actor === entry.actor && x.region === entry.region)), entry].slice(-50);
  await save(h);
}
/** Keep a scar for when the quiet ends. */
export async function holdScar(args) {
  const h = held();
  h.scars = [...h.scars, {...args, scene: args.scene?.id ?? args.scene ?? null}].slice(-50);
  await save(h);
}
/** Keep a scene's share of rebuilding for when the quiet ends. */
export async function holdHeal(sceneId, share) {
  if ( !sceneId ) return;
  const h = held();
  h.heal = {...h.heal, [sceneId]: Math.min(1, (Number(h.heal[sceneId]) || 0) + (Number(share) || 0))};
  await save(h);
}

let settling = false;
/**
 * The rule changed (every client hears it; the active Storyteller acts). On: note when. Off: everything settles once.
 * `play` gives the law stages and scars back: {law(entry), scar(args), heal({scene, share})}.
 */
export async function onLightTouchChange(play = {}) {
  if ( !isActiveGM() ) return null;
  if ( isLightTouch() ) {
    const h = held();
    if ( h.since === null ) await save({...h, since: now()});
    return {on: true};
  }
  if ( settling ) return null;
  settling = true;
  try {
    const h = held();
    await save(empty());
    const info = {from: h.since ?? now(), to: now(), label: "light-touch"};
    await Hooks.callAll("wodxLightTouchEnd", info);
    for ( const e of h.law ) { try { await play.law?.(e); } catch (err) { console.error("WoDX | light-touch law", err); } }
    for ( const s of h.scars ) { try { await play.scar?.({...s, scene: game.scenes.get(s.scene) ?? null}); } catch (err) { console.error("WoDX | light-touch scar", err); } }
    for ( const [id, share] of Object.entries(h.heal ?? {}) ) {
      const scene = game.scenes.get(id);
      if ( scene ) { try { await play.heal?.({scene, share}); } catch (err) { console.error("WoDX | light-touch heal", err); } }
    }
    log(`Light-touch mode off: settled ${h.law.length} law stage(s), ${h.scars.length} scar(s), ${Object.keys(h.heal ?? {}).length} rebuilding share(s)`);
    return {on: false, ...info, law: h.law.length, scars: h.scars.length};
  } finally { settling = false; }
}

export const quietApi = {isQuiet, isLightTouch, held};
