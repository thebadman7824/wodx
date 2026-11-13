/**
 * WoDX Senses 0.5.0: supernatural sight on the map. The player's character keeps the sight in use in a flag
 * (flags.wodx-senses.sight); each player's own map shows their own character's sight, and only if their setting
 * allows. The button "My sight" on the token tools steps through the sights the character has, then off.
 */
import * as S from "./sight-rules.mjs";
import {detectProfile} from "../../wodx-actions/scripts/profiles.js";
import * as O from "./otherworld-sight-rules.mjs";
import * as OW from "./otherworld-sight.mjs";

const MOD = "wodx-senses";
const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };
let H = null, layer = null, pending = null, lastFilter = null;

export function registerSight() {
  OW.registerOtherSight();
  game.settings.register(MOD, "sightMap", {
    name: "Supernatural sight on my map", hint: "While my character uses Heightened Senses, Aura Perception or Lifesight, my own map shows it. Turn this off on a slow machine; chat answers are the same either way.",
    scope: "client", config: true, type: Boolean, default: true, onChange: () => drawSight()
  });
  game.settings.register(MOD, "colourSafe", {
    name: "Colour-blind safe colours", hint: "Aura and Lifesight rings, and the other WoDX tints that carry meaning, use colours that stay apart for colour-blind eyes. Every ring also shows its words on the map either way.",
    scope: "client", config: true, type: Boolean, default: false, onChange: () => { drawSight(); Hooks.callAll("wodxColourSafe", !!setting("colourSafe")); }
  });
  game.settings.register(MOD, "ringWords", {
    name: "Words under the sight rings", hint: "Each Aura Perception or Lifesight ring on my map says what it shows (pale, bright and wild, sparkling ...), so the colour is never the only sign.",
    scope: "client", config: true, type: Boolean, default: true, onChange: () => drawSight()
  });
  game.settings.register(MOD, "auraNeedsRead", {
    name: "Aura Perception needs Read the Soul", hint: "A ring shows round a creature only after the character has read that token's soul (WoDX Otherworlds), and only as much as the successes showed. A reading holds for an hour of game time. Off: every creature in view shows its ring.",
    scope: "world", config: true, type: Boolean, default: true, onChange: () => drawSight()
  });
  game.settings.register(MOD, "overload", {
    name: "Loud noise overwhelms Heightened Senses", hint: "When a character with Heightened Senses in use hears a loud noise or a gun fired near them, the Storyteller gets a card asking for a Willpower roll.",
    scope: "world", config: true, type: Boolean, default: true
  });
}
/** Is this player's colour-blind palette on? Other WoDX modules read it through the Senses api. */
export const colourSafe = () => !!setting("colourSafe");

function myCharacter() {
  const tok = (canvas?.tokens?.controlled ?? []).find(t => t.actor?.isOwner);
  return tok?.actor ?? game.user?.character ?? null;
}
const profileOf = a => { try { return detectProfile(a); } catch (e) { return "mortal"; } };
export function sightsOf(a) {
  if ( !a ) return [];
  return [...S.sightsFor({auspex: H?.powerDots?.(a, /^(auspex|aura perception)$/i) ?? 0,
    heightenedGift: profileOf(a) === "lupine" && (H?.powerDots?.(a, /^heightened senses$/i) ?? 0) > 0, profile: profileOf(a)}), ...OW.otherSightsOf(a)];
}
const chosenOf = a => { const s = a?.flags?.[MOD]?.sight; return S.SIGHTS[s] || O.OTHER[s] ? s : null; };
/** The sight in use: the one chosen (a mage's only while it holds), else the character's own eyes (B3540). */
export const sightOf = a => (a ? OW.sightNow(a, chosenOf(a)) : null);

/** Step to the next sight the character has, or off. */
export async function cycleSight(a = myCharacter()) {
  if ( !a?.isOwner ) { ui.notifications.warn("Select your character's token first."); return null; }
  const have = sightsOf(a);
  if ( !have.length ) { ui.notifications.info(`${a.name} has no sight to use.`); return null; }
  const cur = chosenOf(a), next = S.nextSight(cur, have);
  // Stepping off the Penumbra ends the peek (B3540)
  const up = {[`flags.${MOD}.sight`]: next};
  if ( cur === "penumbra" || (next !== "penumbra" && a.flags?.[MOD]?.peek) ) up[`flags.${MOD}.-=peek`] = null;
  await a.update(up);
  // A mage's sight costs the casting roll unless it still holds (B3541)
  if ( O.OTHER[next]?.roll && !O.holding(a.flags?.[MOD]?.hold, next, game.time.worldTime) ) await OW.rollFor(a, next);
  const label = S.SIGHTS[next]?.label ?? O.OTHER[next]?.label;
  const own = sightOf(a);
  ui.notifications.info(next ? `${a.name}: ${label}` : `${a.name}: ${own && O.OTHER[own] ? O.OTHER[own].label.toLowerCase() : "ordinary sight"}`);
  return next;
}

/** Draw this player's sight: the map's tint and the rings. Off for the Storyteller unless a token of theirs uses it. */
export function drawSight() {
  if ( pending ) return;
  pending = setTimeout(() => {
    pending = null;
    try {
      const board = document.getElementById("board");
      const a = myCharacter(), sight = setting("sightMap") === false ? null : sightOf(a);
      // Only put back a filter this sight set, so WoDX Otherworlds' own looks stay
      const want = !sight ? "" : S.SIGHTS[sight]?.filter ?? OW.filterFor(sight, a);
      if ( board && want !== null && (want || board.style.filter === lastFilter) ) { board.style.filter = want; lastFilter = want; }
      if ( !canvas?.ready ) return;
      const parent = canvas.interface ?? canvas.stage;
      if ( !layer || layer.destroyed || layer.parent !== parent ) { layer = new PIXI.Graphics(); layer.eventMode = "none"; layer.zIndex = 49; parent.addChild(layer); }
      layer.clear();
      for ( const c of [...layer.children] ) c.destroy();
      if ( sight && O.OTHER[sight] ) { const lines = OW.drawOther(layer, sight, a); OW.sayLines(sight, a, lines).catch(e => console.warn(`${MOD} | sight lines`, e)); return; }
      if ( !sight || !S.SIGHTS[sight].rings ) return;
      const safe = !!setting("colourSafe"), words = setting("ringWords") !== false;
      const needsRead = sight === "aura" && setting("auraNeedsRead") !== false, reads = a?.flags?.[MOD]?.auraReads ?? {};
      for ( const t of canvas.tokens?.placeables ?? [] ) {
        if ( !t.actor || !t.isVisible || t.actor === a ) continue;
        const ring = S.ringFor(sight, profileOf(t.actor), {safe, needsRead, read: needsRead ? S.readFor(reads, t.document?.id, game.time.worldTime) : null});
        if ( !ring ) continue;
        const rad = Math.max(t.w, t.h) * 0.58;
        layer.lineStyle(Math.max(safe ? 4 : 3, t.w / (safe ? 10 : 14)), ring.colour, ring.alpha);
        layer.drawCircle(t.center.x, t.center.y, rad);
        if ( words && ring.words ) {
          const style = {fontFamily: "Signika, sans-serif", fontSize: Math.max(12, Math.round(t.h / 6)), fill: S.css(ring.colour), stroke: {color: "#000000", width: 3}, strokeThickness: 3};
          const label = typeof layer.circle === "function" ? new PIXI.Text({text: ring.words, style}) : new PIXI.Text(ring.words, style);
          label.anchor?.set?.(0.5, 0);
          label.x = t.center.x; label.y = t.center.y + rad + 2;
          layer.addChild(label);
        }
      }
      layer.lineStyle(0);
    } catch (e) { console.warn(`${MOD} | sight`, e); }
  }, 150);
}

/** 0.10.0: keep a Read the Soul result on the reader, for the aura rings (B2900). Runs on the reader's client. */
export async function noteAuraRead({reader, token, successes = 0, botch = false} = {}) {
  const a = reader?.actor ?? reader;
  if ( !a?.isOwner || !token ) return null;
  const now = game.time.worldTime;
  const reads = S.pruneReads({...(a.flags?.[MOD]?.auraReads ?? {}), [token]: {n: Math.max(0, Number(successes) || 0), botch: !!botch, at: now}}, now);
  await a.update({[`flags.${MOD}.-=auraReads`]: null}, {render: false});
  await a.update({[`flags.${MOD}.auraReads`]: reads});
  return reads[token] ?? null;
}

/** 0.10.0: Heightened Senses overwhelmed by a loud noise or a gun (B2901). The active Storyteller's client only. */
async function overload(tokens, why) {
  if ( setting("overload") === false || !(game.user?.isGM && game.users?.activeGM?.id === game.user.id) ) return;
  const hit = [...new Set(tokens)].filter(t => t?.actor && sightOf(t.actor) === "heightened");
  if ( !hit.length ) return;
  const gms = game.users.filter(u => u.isGM).map(u => u.id);
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  await ChatMessage.create({whisper: gms, speaker: {alias: "WoDX Senses"},
    content: `<div class="wodx-card"><h3>Senses overwhelmed</h3><p class="wodx-quiet">${esc(why)}</p>${hit.map(t => `<p>${esc(S.overloadText(t.name))}</p>`).join("")}</div>`});
}
function near(a, b, units) {
  const g = canvas?.grid?.distance || 5, px = canvas?.grid?.size || 100;
  return Math.hypot(a.center.x - b.center.x, a.center.y - b.center.y) / px * g <= units;
}

export function setupSight(helpers) {
  H = helpers;
  OW.setupOtherSight();
  Hooks.on("wodxAuraRead", ev => { noteAuraRead(ev).then(() => drawSight()).catch(e => console.warn(`${MOD} | aura read`, e)); });
  Hooks.on("wodxInteractablesNoise", ev => {
    if ( !S.overwhelms(ev) || canvas?.scene?.id !== ev?.scene ) return;
    const toks = (ev.heard ?? []).map(u => { try { return fromUuidSync(u)?.object ?? null; } catch (e) { return null; } });
    overload(toks, "A loud noise nearby.");
  });
  Hooks.on("wodxAttackRolled", (attacker, ev = {}) => {
    if ( !S.overwhelms(ev) || !canvas?.ready ) return;
    let src = null; try { src = ev.attackerToken ? fromUuidSync(ev.attackerToken)?.object : null; } catch (e) { src = null; }
    if ( !src ) return;
    overload((canvas.tokens?.placeables ?? []).filter(t => t !== src && near(t, src, S.OVERLOAD.near)), `${attacker?.name ?? "Someone"} fires ${ev.weapon || "a gun"}.`);
  });
  for ( const h of ["controlToken", "canvasReady", "updateToken", "createToken", "deleteToken", "sightRefresh"] ) Hooks.on(h, () => drawSight());
  Hooks.on("updateActor", (a, ch) => { if ( ch?.flags?.[MOD] !== undefined || a === myCharacter() ) drawSight(); });
  Hooks.on("getSceneControlButtons", controls => {
    const tokens = controls.tokens ?? controls.find?.(c => c.name === "token");
    if ( !tokens?.tools ) return;
    tokens.tools.wodxSight = {name: "wodxSight", title: "My sight (Heightened Senses, Aura Perception, Lifesight, a mage's Sphere sights, the Penumbra while peeking; press again for the next, then off)",
      icon: "fa-solid fa-eye-low-vision", order: 122, button: true, visible: true, onChange: () => cycleSight()};
    tokens.tools.wodxSightTies = {name: "wodxSightTies", title: "Sight: enchant the selected (Storyteller), tie a wraith's Fetters, set a changeling's fae mien",
      icon: "fa-solid fa-link", order: 123, button: true, visible: true, onChange: () => OW.tiesDialog()};
  });
}
