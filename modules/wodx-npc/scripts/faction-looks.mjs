/**
 * WoDX NPC: who holds a place, shown on its scene (B4631, show-don't-tell desk v5). Rules in faction-look-rules.mjs.
 *
 * Whenever the factions change (a turn, a move, its Undo, the Factions window), every scene draws its holders' banners
 * again to match, through WoDX Storyteller's townLooks.setLooks (which draws with WoDX Chronicle's shared looks layer
 * when it is there, else plain locked drawings, and draws nothing new when nothing changed). A place that changes
 * hands swaps its banner; a secret faction shows none. World setting factionBanners (on by default).
 */
import * as R from "./faction-look-rules.mjs";

const MOD = "wodx-npc";
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const looksApi = () => game.modules.get("wodx-storyteller")?.api?.upkeep?.townLooks ?? null;
const on = () => { try { return game.settings.get(MOD, "factionBanners") !== false; } catch (e) { return true; } };

export function registerFactionLookSettings() {
  game.settings.register(MOD, "factionBanners", {name: "Show who holds a place on the map", hint: "A place a faction holds shows the faction's banner, in its own colour, at its gates or door. A secret faction shows none. A place that changes hands changes its banner.",
    scope: "world", config: true, type: Boolean, default: true, onChange: () => later()});
}

function rectOf(scene) {
  const d = scene?.dimensions;
  const r = d?.sceneRect ?? {x: d?.sceneX ?? 0, y: d?.sceneY ?? 0, width: d?.sceneWidth ?? scene?.width ?? 2000, height: d?.sceneHeight ?? scene?.height ?? 1500};
  return {x: r.x, y: r.y, width: r.width, height: r.height};
}

/** Every scene's banners again, to match who holds what. Returns how many banners there are. */
export async function syncBanners() {
  const TL = looksApi();
  if ( !game.user.isGM || !TL?.setLooks ) return 0;
  const st = (() => { try { return game.settings.get(MOD, "factions") ?? {}; } catch (e) { return {}; } })();
  const want = new Map(); // scene id -> looks
  if ( on() ) {
    for ( const f of st.factions ?? [] ) {
      if ( f.secret || f.dormant ) continue;
      for ( const pid of f.places ?? [] ) {
        let doc = null;
        try { doc = fromUuidSync(pid); } catch (e) { doc = null; }
        const scene = doc?.documentName === "Scene" ? doc : doc?.documentName === "Region" ? doc.parent : null;
        if ( !scene ) continue;
        const grid = scene.grid?.size ?? 100;
        const looks = doc.documentName === "Scene"
          ? R.bannersFor(f, {rect: rectOf(scene), grid, seed: pid})
          : R.bannersFor(f, {at: R.middleOf(doc.shapes?.[0]?.toObject?.() ?? doc.shapes?.[0] ?? {}), grid, seed: pid});
        want.set(scene.id, [...(want.get(scene.id) ?? []), ...looks]);
      }
    }
  }
  let n = 0;
  for ( const scene of game.scenes ) {
    const looks = want.get(scene.id) ?? [];
    if ( !looks.length && !(scene.flags?.["wodx-storyteller"]?.lookSigs?.["factions"]) ) continue;
    n += await TL.setLooks(scene, "factions", looks);
  }
  return n;
}

let soon = null;
function later() {
  if ( !isActiveGM() ) return;
  clearTimeout(soon);
  soon = setTimeout(() => syncBanners().catch(e => console.error(`${MOD} | faction banners`, e)), 600);
}

export function setupFactionLooks() {
  Hooks.on("updateSetting", s => { if ( s?.key === `${MOD}.factions` ) later(); });
  Hooks.on("createSetting", s => { if ( s?.key === `${MOD}.factions` ) later(); });
  later();
}

export const api = () => ({sync: syncBanners, rules: R});
