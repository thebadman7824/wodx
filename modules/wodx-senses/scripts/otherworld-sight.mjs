/**
 * WoDX Senses (B3540-B3547): the sights that open another world on the player's own map. Rules in
 * otherworld-sight-rules.mjs. Each is drawn only on the screen of the player whose character uses it.
 *
 *   The Penumbra    turned on by a successful peek across the Gauntlet (WoDX Otherworlds): the map's own reflection
 *                   (its .wodx.json beside the picture), Banes from the scene's Wyrm corruption, a web veil for the
 *                   era when the map has no file, and the spirits there marked by their standing toward the peeker.
 *   Mage sights     Prime (places of power, vulgar strain, Tass carried), Time (echoes of what happened here),
 *                   Entropy (the hurt and frail), Correspondence (the ways from here to other places). Turning one on
 *                   rolls the casting roll; the successes set how long it holds.
 *   Chimerical      changelings and the enchanted see other changelings' fae mien, freeholds and the Dreaming
 *                   dressed, and Banality greying the dull.
 *   Shadowlands     a wraith sees the living scene worn down, Fetters lit, other wraiths plain.
 * The active Storyteller's client keeps the scene's echoes (flags.wodx-senses.echoes) and strain marks
 * (flags.wodx-senses.strain) from map events, wounds, crossings and vulgar magick (hook wodxMagickWorked).
 */
import * as O from "./otherworld-sight-rules.mjs";
import {detectProfile} from "../../wodx-actions/scripts/profiles.js";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const MOD = "wodx-senses", SOCKET = `module.${MOD}`;
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };
const now = () => game.time?.worldTime ?? 0;
const ow = () => game.modules.get("wodx-otherworlds")?.active ? game.modules.get("wodx-otherworlds")?.api ?? null : null;
const st = () => game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller")?.api ?? null : null;
const pd = () => game.modules.get("wodx-paperdoll")?.active ? game.modules.get("wodx-paperdoll")?.api ?? null : null;
const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 2000; } catch (e) { return 2000; } };
const futureOn = () => { try { return !!chron()?.rule?.("futureBranch"); } catch (e) { return false; } };
const profileOf = a => { try { return detectProfile(a); } catch (e) { return "mortal"; } };
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
let castPlan = null;

export function registerOtherSight() {
  game.settings.register(MOD, "otherAuto", {
    name: "My character's own eyes", hint: "A wraith sees the living scene from the Shadowlands and a changeling (or an enchanted mortal) sees the chimerical world without pressing My sight. Off: only the sights I choose.",
    scope: "client", config: true, type: Boolean, default: true, onChange: () => Hooks.callAll("sightRefresh")
  });
}

/* ---------------- what the character has ---------------- */

export function traitsOf(a) {
  if ( !a ) return {};
  const s = a.system ?? {}, f = a.flags?.[MOD] ?? {}, da = a.flags?.["wodx-actions"]?.daMage ?? null, t = now();
  const spheres = Object.fromEntries(O.MAGE_SIGHTS.map(k => [k, num(s.spheres?.[k]?.value)]));
  return {profile: profileOf(a), spheres, arete: num(s.advantages?.arete?.permanent),
    da: da?.fellowship ? {fellowship: da.fellowship, foundation: num(da.foundation) || 1, pillars: {...(da.pillars ?? {})}} : null,
    peeking: !!f.peek && num(f.peek.until) >= t && (!f.peek.scene || f.peek.scene === canvas?.scene?.id),
    enchanted: O.isEnchanted(f.enchanted, t)};
}
export const otherSightsOf = a => O.otherSightsFor(traitsOf(a));
/** The sight in use: one chosen and still held, else the character's own eyes. */
export function sightNow(a, chosen) {
  const tr = traitsOf(a);
  if ( chosen && O.OTHER[chosen] ) {
    if ( O.OTHER[chosen].roll ) { if ( O.holding(a?.flags?.[MOD]?.hold, chosen, now()) ) return chosen; }
    else if ( O.otherSightsFor(tr).includes(chosen) ) return chosen;
    return setting("otherAuto") === false && !tr.peeking ? null : O.autoSight(tr);
  }
  if ( chosen ) return chosen;
  return setting("otherAuto") === false && !tr.peeking ? null : O.autoSight(tr);
}

/** A mage's sight costs the casting roll. Returns true when it holds. */
export async function rollFor(a, sight) {
  if ( !castPlan ) { try { castPlan = (await import("../../wodx-actions/scripts/mage-da-rules.js")).castPlan; } catch (e) { castPlan = null; } }
  const plan = O.mageRoll(traitsOf(a), sight, {castPlan});
  if ( !plan || plan.dice <= 0 ) { ui.notifications.warn(`${a.name} has no dice for ${O.OTHER[sight].label}.`); return false; }
  const ok = await foundry.applications.api.DialogV2.confirm({window: {title: O.OTHER[sight].label},
    content: `<p>${esc(a.name)} opens ${esc(O.OTHER[sight].label.toLowerCase())}: ${esc(plan.label)}.</p><p class="wodx-quiet">${esc(plan.ref)}</p>`, rejectClose: false});
  if ( !ok ) return false;
  const roll = await new Roll(`${plan.dice}d10`).evaluate();
  const faces = roll.dice[0]?.results.map(r => r.result) ?? [];
  const hits = faces.filter(f => f >= plan.difficulty).length, ones = faces.filter(f => f === 1).length;
  const net = Math.max(0, hits - ones), botch = !hits && ones > 0;
  const hold = O.holdFor(net, plan.system);
  if ( net ) await a.update({[`flags.${MOD}.hold`]: {sight, until: now() + hold.seconds, successes: net}, [`flags.${MOD}.sight`]: sight});
  const gms = game.users.filter(u => u.isGM).map(u => u.id);
  await ChatMessage.create({whisper: [...new Set([game.user.id, ...gms])], speaker: ChatMessage.getSpeaker({actor: a}), rolls: [roll],
    content: `<div class="wodx-card"><h3>${esc(O.OTHER[sight].label)}</h3><p>${esc(plan.label)}: ${faces.join(", ")}.</p><p><b>${net ? `${net} success${net === 1 ? "" : "es"}: the sight holds for ${hold.words}.` : botch ? "A botch: the sight fails, and the Storyteller may call for Paradox." : "No successes: the sight does not open."}</b></p><p class="wodx-quiet">${esc(plan.ref)}</p></div>`});
  return net > 0;
}

/* ---------------- the look ---------------- */

/** The board's CSS filter for a sight, or null to leave it as it is. */
export function filterFor(sight, a) {
  const tok = a?.getActiveTokens?.()?.[0]?.document ?? null;
  let place = null; try { place = tok ? ow()?.placeOf?.(tok) : null; } catch (e) { place = null; }
  if ( sight === "penumbra" ) return O.PEEK_FILTER;
  if ( sight === "chimerical" ) return O.chimericalFilter({banality: place?.ratings?.banality ?? 5, dressed: dressed(a).yes});
  if ( sight === "shroud" ) {
    let decay = ""; try { decay = ow()?.decayCss?.() ?? ""; } catch (e) { decay = ""; }
    if ( decay ) return null; // already in the Shadowlands: WoDX Otherworlds draws the decay
    return O.shroudFilter({shroud: place?.ratings?.shroud ?? 7, year: yearNow()});
  }
  if ( O.MAGE_SIGHTS.includes(sight) ) return "saturate(0.8) brightness(0.92)";
  return null;
}

const powerHere = () => { try { return (st()?.power?.state?.()?.list ?? []).filter(p => p.scene && p.scene === canvas?.scene?.id); } catch (e) { return []; } };
function dressed(a) {
  const fh = powerHere().find(p => p.kind === "freehold" && !p.destroyed);
  let dream = false; try { const id = ow()?.STATUS?.dreaming?.id; dream = !!id && !!a?.statuses?.has?.(id); } catch (e) { dream = false; }
  return {yes: !!fh || dream, words: fh ? `The freehold ${fh.name}` : dream ? "The Near Dreaming" : ""};
}

const SIDE = new Map();
async function sidecarOf(scene) {
  const path = ow()?.reflect?.guessPath?.(scene) ?? "";
  if ( !path ) return null;
  if ( SIDE.has(path) ) return SIDE.get(path);
  SIDE.set(path, null);
  try {
    const res = await fetch(foundry.utils.getRoute?.(path) ?? path, {cache: "no-store"});
    const j = res.ok ? await res.json() : null;
    SIDE.set(path, j?.format === "wodx-map" ? j : null);
  } catch (e) { SIDE.set(path, null); }
  Hooks.callAll("sightRefresh");
  return SIDE.get(path);
}
const TEX = new Map();
function svgTexture(key, svg) {
  if ( TEX.has(key) ) return TEX.get(key);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const tex = PIXI.Texture.from(url);
  TEX.set(key, tex);
  if ( TEX.size > 12 ) { const k = TEX.keys().next().value; TEX.get(k)?.destroy?.(true); TEX.delete(k); }
  return tex;
}

function label(layer, text, x, y, colour, size = 14) {
  const style = {fontFamily: "Signika, sans-serif", fontSize: size, fill: `#${(colour >>> 0).toString(16).padStart(6, "0")}`, stroke: {color: "#000000", width: 3}, strokeThickness: 3, wordWrap: true, wordWrapWidth: 260};
  const t = typeof layer.circle === "function" ? new PIXI.Text({text, style}) : new PIXI.Text(text, style);
  t.anchor?.set?.(0.5, 0); t.x = x; t.y = y;
  layer.addChild(t);
  return t;
}
function ring(layer, t, colour, alpha, words, {scale = 0.58, width = null} = {}) {
  const rad = Math.max(t.w, t.h) * scale;
  layer.lineStyle(width ?? Math.max(3, t.w / 14), colour, alpha);
  layer.drawCircle(t.center.x, t.center.y, rad);
  layer.lineStyle(0);
  if ( words && setting("ringWords") !== false ) label(layer, words, t.center.x, t.center.y + rad + 2, colour, Math.max(12, Math.round(t.h / 6)));
}
const sceneRect = () => { const d = canvas?.dimensions ?? {}; return {x: d.sceneX ?? 0, y: d.sceneY ?? 0, w: d.sceneWidth ?? d.width ?? 0, h: d.sceneHeight ?? d.height ?? 0}; };
const rng = seed => { let s = 0; for ( const c of String(seed) ) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const frac = a => { const d = a?.system?.health?.damage ?? {}; return Math.min(1, (num(d.bashing) + num(d.lethal) + num(d.aggravated)) / 7); };

/** Draw a sight's marks into the player's layer. Returns the lines worth saying in words. */
export function drawOther(layer, sight, a) {
  const scene = canvas?.scene, R = sceneRect(), toks = canvas?.tokens?.placeables ?? [];
  if ( !scene ) return [];
  const lines = [];
  if ( sight === "penumbra" ) {
    const api = ow(), RF = api?.reflect?.rules;
    const path = api?.reflect?.guessPath?.(scene) ?? "";
    if ( path && !SIDE.has(path) ) sidecarOf(scene);
    const side = path ? SIDE.get(path) ?? null : null;
    const web = RF?.webbing ? RF.webbing(yearNow(), {future: futureOn()}) : 0.45;
    let g = null; try { const tok = a?.getActiveTokens?.()?.[0]?.document; g = tok ? api?.placeOf?.(tok)?.gauntlet ?? null : null; } catch (e) { g = null; }
    const P = O.penumbraLayer({place: api?.corruption?.of?.(scene) ?? null, gauntlet: g, web, hasMap: !!side});
    layer.beginFill(0x6a8cff, P.veil); layer.drawRect(R.x, R.y, R.w, R.h); layer.endFill();
    if ( side && RF?.reflect ) {
      const marks = RF.reflect(side, "penumbra", {year: yearNow(), future: futureOn()});
      if ( marks.length ) {
        const spr = new PIXI.Sprite(svgTexture(`${scene.id}:${yearNow()}`, RF.overlaySvg(marks, side.cells, {cell: 50})));
        const gsz = scene.grid?.size ?? 100, [cw, ch] = side.cells ?? [R.w / gsz, R.h / gsz];
        spr.x = R.x; spr.y = R.y; spr.width = cw * gsz; spr.height = ch * gsz;
        layer.addChild(spr);
        lines.push(`The Penumbra here: ${RF.summary?.(marks) ?? `${marks.length} marks`}.`);
      }
    }
    if ( P.webVeil ) {
      layer.lineStyle(1.5, 0xe8f0ff, 0.25 + P.webVeil * 0.35);
      const step = Math.max(60, 220 - P.webVeil * 140);
      for ( let x = R.x - R.h; x < R.x + R.w; x += step ) { layer.moveTo(x, R.y); layer.lineTo(x + R.h, R.y + R.h); }
      for ( let x = R.x; x < R.x + R.w + R.h; x += step ) { layer.moveTo(x, R.y); layer.lineTo(x - R.h, R.y + R.h); }
      layer.lineStyle(0);
    }
    const rand = rng(`${scene.id}:banes`);
    for ( let i = 0; i < Math.min(P.banes, 12); i++ ) {
      const x = R.x + R.w * (0.1 + rand() * 0.8), y = R.y + R.h * (0.1 + rand() * 0.8);
      layer.beginFill(0x3a4a10, 0.55); layer.drawCircle(x, y, 26); layer.endFill();
      layer.lineStyle(3, 0x9acd32, 0.8); layer.drawCircle(x, y, 30); layer.lineStyle(0);
      label(layer, "a Bane", x, y + 32, 0x9acd32, 13);
    }
    for ( const t of toks ) {
      if ( !t.actor || t.actor === a || profileOf(t.actor) !== "spirit" ) continue;
      const court = O.courtOf(t.actor.name, t.actor.flags?.["wodx-otherworlds"]?.court ?? null);
      let eff = {}; try { eff = court ? api?.spirits?.effect?.(a, court) ?? {} : {}; } catch (e) { eff = {}; }
      const w = O.spiritWord(eff);
      ring(layer, t, O.SPIRIT_COLOUR[w], 0.85, `a spirit, ${w}`);
    }
    lines.push(...P.lines);
  }
  if ( sight === "prime" ) {
    powerHere().forEach((p, i) => {
      const x = R.x + R.w / 2 + (i - 0.5) * 160, y = R.y + R.h / 2;
      layer.beginFill(0x9fd3ff, 0.18); layer.drawCircle(x, y, 140); layer.endFill();
      layer.beginFill(0xe6f6ff, 0.35); layer.drawCircle(x, y, 55); layer.endFill();
      const w = O.primeWords(p); label(layer, `${p.name}: ${w}`, x, y + 60, 0xbfe6ff, 15); lines.push(`${p.name}: ${w}.`);
    });
    for ( const m of O.pruneStrain(scene.flags?.[MOD]?.strain, now()) ) {
      const s = O.strainStrength(m, now());
      layer.lineStyle(4, 0xff5a8a, s); layer.drawCircle(m.x, m.y, 60 + 20 * m.highest);
      layer.lineStyle(2, 0xff5a8a, s * 0.8); layer.drawCircle(m.x, m.y, 30 + 10 * m.highest); layer.lineStyle(0);
      label(layer, `strained by vulgar magick, ${O.ago(now() - m.at)}`, m.x, m.y + 64 + 20 * m.highest, 0xff8aa8, 13);
      lines.push(`Vulgar magick strained this place, ${O.ago(now() - m.at)}.`);
    }
    for ( const t of toks ) {
      if ( !t.actor || !t.isVisible ) continue;
      const tass = t.actor.flags?.["wodx-storyteller"]?.tass;
      if ( Array.isArray(tass) && tass.some(x => num(x?.points) > 0) ) ring(layer, t, 0xffd700, 0.8, "carries Tass", {scale: 0.45});
    }
    if ( !powerHere().length ) lines.push("No Node or chantry shows here; Quintessence runs thin.");
  }
  if ( sight === "time" ) {
    const dots = Math.max(num(a?.system?.spheres?.time?.value), 1);
    const seen = O.echoesSeen(scene.flags?.[MOD]?.echoes, now(), dots).slice(0, 25);
    for ( const e of seen ) {
      const age = Math.min(1, (now() - e.at) / (30 * 86400));
      layer.beginFill(0xd8c8ff, 0.3 - age * 0.18); layer.drawCircle(e.x, e.y, 40); layer.endFill();
      label(layer, `${e.text}, ${O.ago(now() - e.at)}`, e.x, e.y + 42, 0xe0d4ff, 13);
      lines.push(`${e.text}, ${O.ago(now() - e.at)}.`);
    }
    if ( !seen.length ) lines.push(dots >= 2 ? "Nothing of note has left its echo here." : "Nothing of note has happened here in the last day.");
  }
  if ( sight === "entropy" ) {
    for ( const t of toks ) {
      if ( !t.actor || !t.isVisible || t.actor === a ) continue;
      const w = O.frailWord(frac(t.actor));
      if ( w ) { ring(layer, t, O.ENTROPY_COLOUR, w.alpha, w.words); lines.push(`${t.name}: ${w.words}.`); }
    }
    if ( !lines.length ) lines.push("Nothing here is close to failing.");
  }
  if ( sight === "correspondence" ) {
    const links = [];
    for ( const r of scene.regions ?? [] ) for ( const b of r.behaviors ?? [] ) {
      if ( b.type !== "teleportToken" || b.disabled ) continue;
      let to = null; try { const dest = fromUuidSync(b.system?.destination); to = dest?.parent?.name ?? dest?.name ?? null; } catch (e) { to = null; }
      const s = r.shapes?.[0]; if ( !to || !s ) continue;
      links.push({x: num(s.x) + num(s.width) / 2 || num(s.points?.[0]), y: num(s.y) + num(s.height) / 2 || num(s.points?.[1]), to});
    }
    const cor = ow()?.corruption?.of?.(scene)?.links ?? [];
    cor.forEach((id, i) => { const sc = game.scenes.get(id); if ( sc ) links.push({x: R.x + R.w * ((i + 1) / (cor.length + 1)), y: R.y + 40, to: sc.navName || sc.name}); });
    for ( const l of O.linkWords(links) ) {
      layer.lineStyle(3, O.CORR_COLOUR, 0.8); layer.drawCircle(l.x, l.y, 36); layer.moveTo(l.x, l.y); layer.lineTo(l.x, l.y - 70); layer.lineStyle(0);
      label(layer, l.words, l.x, l.y + 38, O.CORR_COLOUR, 13); lines.push(`Here: ${l.words}.`);
    }
    if ( !lines.length ) lines.push("No way from here runs anywhere but the road.");
  }
  if ( sight === "chimerical" ) {
    const d = dressed(a);
    if ( d.yes ) {
      const rand = rng(`${scene.id}:fae`);
      for ( let i = 0; i < 40; i++ ) { layer.beginFill([0xffe08a, 0xd08cff, 0x8fe3ff][i % 3], 0.5); layer.drawStar?.(R.x + rand() * R.w, R.y + rand() * R.h, 5, 8, 3) ?? layer.drawCircle(R.x + rand() * R.w, R.y + rand() * R.h, 4); layer.endFill(); }
      lines.push(`${d.words} wears its chimerical dress.`);
    }
    for ( const t of toks ) {
      if ( !t.actor || !t.isVisible || t.actor === a ) continue;
      const p = profileOf(t.actor);
      if ( p === "fae" ) { mien(layer, t); lines.push(`${t.name} shows a fae mien.`); continue; }
      const b = t.actor.system?.advantages?.banality;
      const bv = b && (num(b.temporary) || num(b.permanent)) ? num(b.temporary) || num(b.permanent) : null;
      if ( bv !== null && O.dullPerson(bv) ) ring(layer, t, 0x9a9a9a, 0.7, "dull and grey");
    }
  }
  if ( sight === "shroud" ) {
    const fetters = (a?.items ?? []).filter(i => i.type === "Trait" && i.system?.type === "wod.types.fetter").map(i => ({id: i.id, name: i.name, link: i.flags?.[MOD]?.link ?? null}));
    const things = [...toks.filter(t => t.actor && t.actor !== a).map(t => ({uuid: t.document.uuid, name: t.actor.name, obj: t})),
      ...toks.filter(t => t.actor && t.actor !== a && t.name !== t.actor.name).map(t => ({uuid: t.document.uuid, name: t.name, obj: t})),
      ...(canvas.tiles?.placeables ?? []).map(t => ({uuid: t.document.uuid, name: t.document.flags?.["wodx-interactables"]?.name ?? t.document.flags?.["wodx-library"]?.name ?? "", obj: t})),
      ...(canvas.notes?.placeables ?? []).map(n => ({uuid: n.document.uuid, name: n.document.text || n.document.entry?.name || "", obj: n}))];
    for ( const m of O.fetterMatches(fetters, things) ) {
      const obj = things.find(x => x.uuid === m.uuid)?.obj; if ( !obj ) continue;
      const c = obj.center ?? {x: obj.x, y: obj.y}, rad = Math.max(obj.w ?? 100, obj.h ?? 100) * 0.6;
      layer.beginFill(O.FETTER_COLOUR, 0.18); layer.drawCircle(c.x, c.y, rad * 1.2); layer.endFill();
      layer.lineStyle(4, O.FETTER_COLOUR, 0.9); layer.drawCircle(c.x, c.y, rad); layer.lineStyle(0);
      label(layer, `your Fetter: ${m.name}`, c.x, c.y + rad + 2, O.FETTER_COLOUR, 14); lines.push(`Your Fetter ${m.name} burns bright.`);
    }
    for ( const t of toks ) {
      if ( !t.actor || t.actor === a || profileOf(t.actor) !== "wraith" ) continue;
      if ( !t.isVisible && t.mesh?.texture ) {
        const g = new PIXI.Sprite(t.mesh.texture); g.anchor?.set?.(0.5); g.x = t.center.x; g.y = t.center.y; g.width = t.w; g.height = t.h; g.alpha = 0.45; g.tint = O.WRAITH_COLOUR;
        layer.addChild(g);
      }
      ring(layer, t, O.WRAITH_COLOUR, 0.6, "a wraith");
    }
  }
  return lines;
}

/** A changeling's fae mien over the token: a picture set for it, else the pixel face drawn as the fae see it. */
const MIEN = new Map();
function mien(layer, t) {
  const src = t.actor.flags?.[MOD]?.mien;
  if ( src ) {
    const s = PIXI.Sprite.from(src); s.anchor?.set?.(0.5); s.x = t.center.x; s.y = t.center.y; s.width = t.w; s.height = t.h; layer.addChild(s);
    ring(layer, t, 0xd08cff, 0.6, null); return;
  }
  const F = pd()?.faces;
  let tex = MIEN.get(t.actor.id);
  if ( !tex && F?.rules?.drawFace && F.spec ) {
    try {
      const S = F.spec(t.actor, t.document);
      if ( S ) {
        const c = Object.assign(document.createElement("canvas"), {width: F.rules.N ?? 64, height: F.rules.N ?? 64});
        c.getContext("2d").putImageData(new ImageData(F.rules.drawFace(S, {sees: {fae: true, sigil: false}}).rgba, F.rules.N ?? 64, F.rules.N ?? 64), 0, 0);
        tex = PIXI.Texture.from(c); MIEN.set(t.actor.id, tex);
        if ( MIEN.size > 40 ) { const k = MIEN.keys().next().value; MIEN.get(k)?.destroy?.(true); MIEN.delete(k); }
      }
    } catch (e) { tex = null; }
  }
  if ( tex ) {
    const s = new PIXI.Sprite(tex); s.anchor?.set?.(0.5, 1); s.x = t.center.x; s.y = t.center.y; s.width = t.w * 0.7; s.height = t.w * 0.7;
    if ( tex.baseTexture ) tex.baseTexture.scaleMode = PIXI.SCALE_MODES?.NEAREST ?? 0;
    layer.addChild(s);
  }
  ring(layer, t, 0xd08cff, 0.7, "fae mien");
}

/** Say the sight's lines to the player once each time the sight or the scene changes. */
let said = "";
export async function sayLines(sight, a, lines) {
  const key = `${a?.id}:${sight}:${canvas?.scene?.id}:${lines.join("|").replace(/\d+/g, "")}`;
  if ( !lines.length || key === said ) return;
  said = key;
  await ChatMessage.create({whisper: [game.user.id], speaker: {alias: "WoDX Senses"},
    content: `<div class="wodx-card"><h3>${esc(O.OTHER[sight]?.label ?? "Sight")}</h3>${lines.slice(0, 20).map(l => `<p>${esc(l)}</p>`).join("")}</div>`});
}

/* ---------------- echoes and strain (the active Storyteller keeps them) ---------------- */

async function keep(scene, {echo = null, strain = null} = {}) {
  if ( !isActiveGM() || !scene ) return;
  const f = scene.flags?.[MOD] ?? {}, up = {};
  if ( echo ) up[`flags.${MOD}.echoes`] = O.addEcho(f.echoes, echo);
  if ( strain ) up[`flags.${MOD}.strain`] = O.addStrain(f.strain, strain, now());
  if ( Object.keys(up).length ) await scene.update(up);
}
function send(payload) {
  if ( isActiveGM() ) return onKeep(payload);
  try { game.socket.emit(SOCKET, {type: "keep", payload}); } catch (e) { /* alone */ }
}
export async function onKeep(p = {}) {
  if ( !isActiveGM() ) return;
  try { await keep(game.scenes.get(p.scene), p); } catch (e) { console.warn(`${MOD} | echoes`, e); }
}
const where = actor => { const t = actor?.getActiveTokens?.(false, true)?.[0]; return t ? {scene: t.parent?.id, x: t.x + (t.width * (t.parent?.grid?.size ?? 100)) / 2, y: t.y + (t.height * (t.parent?.grid?.size ?? 100)) / 2} : null; };

/* ---------------- enchantment, Fetters, the mien picture ---------------- */

export async function enchant(actor, points = 1, {kinain = false, off = false} = {}) {
  if ( !game.user.isGM || !actor ) return null;
  const v = off ? null : {until: O.enchantUntil(points, now()), kinain: !!kinain};
  await actor.update({[`flags.${MOD}.enchanted`]: v});
  return v;
}
export async function tieFetter(actor, itemId, uuid) {
  const it = actor?.items?.get(itemId);
  if ( !it || !(actor.isOwner || game.user.isGM) ) return null;
  await it.update({[`flags.${MOD}.link`]: uuid || null});
  Hooks.callAll("sightRefresh");
  return uuid || null;
}

/** One window: the Storyteller enchants the selected mortals; a wraith ties Fetters; a changeling sets a mien picture. */
export async function tiesDialog() {
  const toks = canvas?.tokens?.controlled ?? [], a = toks.find(t => t.actor?.isOwner)?.actor ?? game.user?.character ?? null;
  const parts = [];
  if ( game.user.isGM && toks.length ) parts.push(`<fieldset><legend>Enchant the selected (${toks.length})</legend><p>Glamour spent: one day each (C20 pdf 47).</p>
    <div class="form-group"><label>Glamour</label><input type="number" name="pts" value="1" min="1" max="10"></div>
    <div class="form-group"><label><input type="checkbox" name="kinain"> Kinain: always sees the fae</label></div>
    <div class="form-group"><label><input type="checkbox" name="off"> Take the enchantment away</label></div></fieldset>`);
  const fet = (a?.items ?? []).filter(i => i.type === "Trait" && i.system?.type === "wod.types.fetter");
  if ( a && fet.length ) {
    const things = [...(canvas.tokens?.placeables ?? []).filter(t => t.actor && t.actor !== a).map(t => [t.document.uuid, `${t.name} (token)`]),
      ...(canvas.tiles?.placeables ?? []).map((t, i) => [t.document.uuid, `${t.document.flags?.["wodx-interactables"]?.name ?? t.document.flags?.["wodx-library"]?.name ?? `Tile ${i + 1}`} (tile)`]),
      ...(canvas.notes?.placeables ?? []).map(n => [n.document.uuid, `${n.document.text || n.document.entry?.name || "Note"} (note)`])];
    const opts = sel => `<option value="">Not tied (match by name)</option>${things.map(([u, n]) => `<option value="${esc(u)}"${u === sel ? " selected" : ""}>${esc(n)}</option>`).join("")}`;
    const box = things.length > 5 ? searchBox("select[name^=f-]", "Search the map…", "Search the things on the map") : "";
    parts.push(`<fieldset><legend>${esc(a.name)}'s Fetters on this map</legend>${box}${fet.map(f => `<div class="form-group"><label>${esc(f.name)}</label><select name="f-${f.id}">${opts(f.flags?.[MOD]?.link ?? "")}</select></div>`).join("")}</fieldset>`);
  }
  if ( a && profileOf(a) === "fae" ) parts.push(`<fieldset><legend>${esc(a.name)}'s fae mien</legend><p>A picture the fae and the enchanted see in place of the token. Empty: the pixel face, drawn as the fae see it.</p>
    <div class="form-group"><label>Picture</label><input type="text" name="mien" value="${esc(a.flags?.[MOD]?.mien ?? "")}" placeholder="path to an image"><button type="button" data-pick="mien"><i class="fa-solid fa-file-image"></i></button></div></fieldset>`);
  if ( !parts.length ) { ui.notifications.info(game.user.isGM ? "Select tokens to enchant, or a wraith or changeling of yours." : "Select your wraith or changeling's token first."); return null; }
  const r = await foundry.applications.api.DialogV2.prompt({window: {title: "Sight: enchantment, Fetters and mien"}, content: `<form>${parts.join("")}</form>`,
    ok: {label: "Save", callback: (ev, btn) => Object.fromEntries(new FormData(btn.form).entries())}, rejectClose: false,
    render: (ev, d) => { const el = d?.element ?? ev?.target?.element; el?.querySelector?.("[data-pick=mien]")?.addEventListener("click", () => {
      const FP = foundry.applications.apps.FilePicker.implementation; new FP({type: "image", callback: p => { const i = el.querySelector("input[name=mien]"); if ( i ) i.value = p; }}).render(true); }); }});
  if ( !r ) return null;
  if ( game.user.isGM && toks.length && ("pts" in r) ) for ( const t of toks ) if ( t.actor ) await enchant(t.actor, num(r.pts) || 1, {kinain: !!r.kinain, off: !!r.off});
  for ( const f of fet ) if ( `f-${f.id}` in r && (r[`f-${f.id}`] || null) !== (f.flags?.[MOD]?.link ?? null) ) await tieFetter(a, f.id, r[`f-${f.id}`]);
  if ( "mien" in r && a?.isOwner ) await a.update({[`flags.${MOD}.mien`]: String(r.mien || "").trim() || null});
  Hooks.callAll("sightRefresh");
  return r;
}

/* ---------------- hooks ---------------- */

export function setupOtherSight() {
  // A peek that worked opens the Penumbra on the peeker's own screen (W20 pdf 313: only one success, no time)
  Hooks.on("wodxCrossing", ev => {
    const t = now();
    if ( ev?.mode === "peek" && ev.outcome?.outcome === "peek" ) {
      for ( const tok of ev.travelers ?? [] ) {
        const a = tok?.actor;
        if ( a?.isOwner && !game.user.isGM ) a.update({[`flags.${MOD}.peek`]: {until: t + O.PEEK_SECONDS, scene: tok.parent?.id ?? canvas?.scene?.id ?? null}, [`flags.${MOD}.sight`]: "penumbra"}).catch(e => console.warn(`${MOD} | peek`, e));
      }
    }
    if ( ev?.outcome?.outcome === "success" || ev?.outcome?.outcome === "peek" ) {
      const first = ev.travelers?.[0], w = first ? {scene: first.parent?.id, x: first.object?.center?.x ?? first.x, y: first.object?.center?.y ?? first.y} : null;
      if ( w?.scene ) send({scene: w.scene, echo: {x: w.x, y: w.y, at: t, kind: "crossing", text: ev.mode === "peek" ? `${first.name} looked across the Gauntlet` : `${first.name} crossed the Gauntlet`}});
    }
  });
  Hooks.on("wodxMapEvent", ev => { if ( !isActiveGM() ) return; const e = O.echoOfMapEvent(ev); if ( e ) keep(game.scenes.get(ev.scene), {echo: e}).catch(err => console.warn(`${MOD} | echo`, err)); });
  Hooks.on("wodxDamageApplied", (actor, d = {}) => {
    if ( !isActiveGM() || !(num(d.levels) > 0) ) return;
    const w = where(actor); if ( !w?.scene ) return;
    const fell = num(d.after) >= 7 || /incap|dead|torpor/i.test(String(d.condition ?? ""));
    keep(game.scenes.get(w.scene), {echo: {...w, at: now(), kind: "wound", text: fell ? `${actor.name} fell here` : `${actor.name} was hurt (${d.type ?? "harm"})`}}).catch(err => console.warn(`${MOD} | echo`, err));
  });
  // B3545: WoDX Actions says when magick is worked; vulgar magick strains the place for Prime to see
  Hooks.on("wodxMagickWorked", (actor, ev = {}) => {
    if ( !actor?.isOwner && !game.user.isGM ) return;
    const w = where(actor); if ( !w?.scene ) return;
    const vulgar = ["vulgar", "witnessed"].includes(ev.kind);
    send({scene: w.scene, echo: {...w, at: now(), kind: "magick", text: `${actor.name} worked ${vulgar ? "vulgar " : ""}magick`},
      strain: vulgar ? {...w, at: now(), kind: ev.kind, botch: !!ev.botch, by: actor.name, highest: ev.highest} : null});
  });
  // A held sight that runs out turns itself off when the clock passes it
  Hooks.on("updateWorldTime", () => Hooks.callAll("sightRefresh"));
}
