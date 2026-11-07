import {MODULE_ID} from "./ratings.mjs";
import {countRoll} from "./rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

/**
 * Phase 5: Read the Soul, Auspex 2 (V20 Dark Ages p. 195; Aura Perception, V20).
 * Perception + Empathy at difficulty 8; each success shows more. The roll is whispered to the Storyteller only,
 * so a botch looks like any other reading to the player. The reader alone sees the aura drawn around the token.
 */

export const SOUL_DIFFICULTY = 8;
export const SOURCE = "V20 Dark Ages p. 195";

/** Soul colours and what they show (V20 Dark Ages p. 195). Hex values are WoDX's, for the overlay. */
export const MOODS = {
  afraid: {colour: "Orange", hex: "#e8832a", condition: "Afraid"},
  aggressive: {colour: "Purple", hex: "#7b3fa0", condition: "Aggressive"},
  angry: {colour: "Red", hex: "#c8262b", condition: "Angry"},
  bitter: {colour: "Brown", hex: "#7a5233", condition: "Bitter"},
  calm: {colour: "Light Blue", hex: "#8cc4ec", condition: "Calm"},
  compassionate: {colour: "Pink", hex: "#f2a0c0", condition: "Compassionate"},
  conservative: {colour: "Lavender", hex: "#b6a4d8", condition: "Conservative"},
  depressed: {colour: "Gray", hex: "#8b8b8b", condition: "Depressed"},
  desirous: {colour: "Deep Red", hex: "#8a0f1e", condition: "Desirous or Lustful"},
  distrustful: {colour: "Light Green", hex: "#9ed88c", condition: "Distrustful"},
  envious: {colour: "Dark Green", hex: "#2f6b34", condition: "Envious"},
  excited: {colour: "Violet", hex: "#a35de0", condition: "Excited"},
  generous: {colour: "Rose", hex: "#e87a96", condition: "Generous"},
  happy: {colour: "Vermilion", hex: "#e64a2e", condition: "Happy"},
  hateful: {colour: "Black", hex: "#111111", condition: "Hateful"},
  idealistic: {colour: "Yellow", hex: "#ecd84a", condition: "Idealistic"},
  clear: {colour: "White", hex: "#f4f4f4", condition: "Clear of Conscience"},
  lovestruck: {colour: "Blue", hex: "#2f5fd0", condition: "Lovestruck"},
  obsessed: {colour: "Green", hex: "#3caa48", condition: "Obsessed"},
  sad: {colour: "Silver", hex: "#c8ccd4", condition: "Sad"},
  ecstatic: {colour: "Gold", hex: "#d8aa2a", condition: "Taken by Ecstasies"},
  suspicious: {colour: "Dark Blue", hex: "#1c2c70", condition: "Suspicious"}
};

/** What kind of soul an actor has, as the chart names them. */
export const NATURES = {
  human: {label: "Human", shade: "bright", text: null},
  vampire: {label: "Vampire", shade: "pale", text: "The soul is pale"},
  ghoul: {label: "Ghoul", shade: "bright", text: "Pale blotches in the aura"},
  witch: {label: "Witch", shade: "bright", text: "Myriad sparkles in the aura"},
  werebeast: {label: "Werebeast", shade: "bright", text: "A bright, vibrant aura"},
  ghost: {label: "Ghost", shade: "pale", text: "A weak, intermittent aura"},
  fae: {label: "Fae", shade: "bright", text: "Rainbow highlights in the aura"}
};

/**
 * What each number of successes shows (p. 195): 1 the shade, 2 the main colour, 3 the patterns, 4 subtle shifts,
 * 5 mixtures. Which signs count as "patterns" is WoDX's reading: the pale soul, the bright werebeast and the weak
 * ghost are shades (1); blotches, sparkles, rainbow highlights, black veins, rippling and mottling are patterns (3).
 */
export const TIERS = ["Only the shade (pale or bright)", "The main colour", "The colour patterns", "Subtle shifts", "Mixtures of colour and pattern"];

export function natureOf(actor) {
  const set = actor?.getFlag?.(MODULE_ID, "aura")?.nature;
  return (set && NATURES[set]) ? set : sheetNature(actor);
}

/** The kind of soul the sheet's type says. Werewolves and other Changing Breeds are werebeasts. */
export function sheetNature(actor) {
  const t = CONFIG.worldofdarkness?.sheettype ?? {};
  if ( actor?.system?.settings?.variant === "ghoul" ) return "ghoul";
  switch ( actor?.type ) {
    case (t.vampire ?? "Vampire"): return "vampire";
    case (t.werewolf ?? "Werewolf"): case (t.changingbreed ?? "Changing Breed"): return "werebeast";
    case (t.mage ?? "Mage"): return "witch";
    case (t.changeling ?? "Changeling"): return "fae";
    case (t.wraith ?? "Wraith"): return "ghost";
    default: return "human";
  }
}

export function auraOf(actor) {
  return {mood: "calm", shift: null, mixture: "", diablerist: false, confused: false, nature: null, note: "",
    ...(actor?.getFlag?.(MODULE_ID, "aura") ?? {})};
}

export function isFrenzied(actor) {
  return !!actor?.system?.conditions?.isfrenzy;
}

/** Auspex rating, from the sheet's Discipline items ("Auspex" or "Aura Perception" counts). */
export function auspexOf(actor) {
  let best = 0;
  for ( const i of actor?.items ?? [] ) {
    if ( i.type !== "Power" || i.system?.type !== "wod.types.discipline" ) continue;
    if ( /auspex/i.test(i.name) ) best = Math.max(best, Number(i.system.value) || 0);
  }
  return best;
}

export function poolOf(actor) {
  const per = actor?.system?.attributes?.perception;
  const emp = actor?.system?.abilities?.empathy;
  return (Number(per?.total ?? per?.value) || 0) + (Number(emp?.value) || 0);
}

/**
 * Everything a reading with this many successes shows. Pure: the overlay and the card both draw from it.
 * @param {Actor} actor           The one being read
 * @param {number} successes      Net successes; 0 for a failure
 * @param {{botch?: boolean, random?: () => number}} [o]
 */
export function reading(actor, successes, {botch = false, random = Math.random} = {}) {
  const aura = auraOf(actor);
  let nature = natureOf(actor);
  let mood = MOODS[aura.mood] ? aura.mood : "calm";
  let frenzied = isFrenzied(actor);
  let diablerist = !!aura.diablerist;
  let confused = !!aura.confused;
  let shift = MOODS[aura.shift] ? aura.shift : null;
  if ( botch ) {
    // Misinformation: a wrong colour and a wrong shade, told as if true
    const keys = Object.keys(MOODS).filter(k => k !== mood);
    mood = keys[Math.floor(random() * keys.length)];
    nature = NATURES[nature].shade === "pale" ? "human" : "vampire";
    frenzied = false; diablerist = false; confused = false; shift = null;
    successes = 2;
  }
  const n = Math.max(0, Math.min(5, successes));
  if ( !n ) return {n: 0, lines: ["The soul will not come clear."], draw: null};
  const N = NATURES[nature];
  const lines = [];
  const draw = {shade: N.shade, nature: null, colour: null, patterns: [], shift: null, mixture: false, weak: nature === "ghost"};
  // 1: the shade
  if ( nature === "vampire" || nature === "ghost" || nature === "werebeast" ) {
    lines.push(`${N.text}.`);
    draw.nature = nature;
  } else lines.push(N.shade === "pale" ? "The soul is pale." : "The soul is bright.");
  // 2: the main colour
  if ( n >= 2 ) {
    const M = MOODS[mood];
    lines.push(`${M.colour}: ${M.condition.toLowerCase()}.`);
    draw.colour = M.hex;
  }
  // 3: patterns
  if ( n >= 3 ) {
    const p = [];
    if ( nature === "ghoul" ) p.push(["blotches", N.text]);
    if ( nature === "witch" ) p.push(["sparkles", N.text]);
    if ( nature === "fae" ) p.push(["rainbow", N.text]);
    if ( diablerist ) p.push(["veins", "Black veins in the soul"]);
    if ( frenzied ) p.push(["ripples", "Rapidly rippling colours"]);
    if ( confused ) p.push(["mottled", "Mottled, shifting colours"]);
    for ( const [k, t] of p ) { draw.patterns.push(k); lines.push(`${t}.`); }
    if ( !p.length ) lines.push("No pattern runs through it.");
  }
  // 4: subtle shifts
  if ( n >= 4 ) {
    if ( shift ) { lines.push(`Beneath it, a shift toward ${MOODS[shift].colour.toLowerCase()}: ${MOODS[shift].condition.toLowerCase()}.`); draw.shift = MOODS[shift].hex; }
    else lines.push("It holds steady; nothing shifts beneath it.");
  }
  // 5: mixtures
  if ( n >= 5 ) {
    draw.mixture = true;
    if ( aura.mixture ) lines.push(String(aura.mixture));
  }
  return {n, lines, draw, nature, mood};
}

/* -------------------------------------------- */
/*  The overlay: drawn for the reader only      */
/* -------------------------------------------- */

const overlays = new Map();
export const lastDraw = {ms: null};

/** Draw the aura around a token on this client only. Returns the time it took, in milliseconds. */
export function drawAura(token, draw, {seconds = 20} = {}) {
  if ( !draw || !token || !globalThis.PIXI || !canvas?.interface ) return null;
  const t0 = performance.now();
  clearAura(token.id);
  const g = new PIXI.Graphics();
  g.eventMode = "none";
  const w = token.w ?? token.width ?? 100;
  const h = token.h ?? token.height ?? 100;
  const cx = (token.x ?? 0) + w / 2;
  const cy = (token.y ?? 0) + h / 2;
  const r = Math.max(w, h) * 0.62;
  const hex = s => Number.parseInt(String(s).replace("#", ""), 16);
  const base = draw.colour ?? (draw.shade === "pale" ? "#cfd3da" : "#fff6dc");
  const strength = draw.shade === "pale" ? 0.35 : (draw.nature === "werebeast" ? 0.85 : 0.6);
  // PIXI 7 (lineStyle/drawCircle) and PIXI 8 (circle/stroke) both work
  const v8 = typeof g.circle === "function" && typeof g.stroke === "function";
  const ring = (rad, width, colour, alpha) => {
    if ( v8 ) { g.circle(cx, cy, rad); g.stroke({width, color: hex(colour), alpha}); }
    else { g.lineStyle(width, hex(colour), alpha); g.drawCircle(cx, cy, rad); g.lineStyle(0); }
  };
  // Soft rings: the main colour, fading outward
  for ( let i = 0; i < 6; i++ ) ring(r + i * r * 0.09, r * 0.09, base, strength * (1 - i / 6) * (draw.weak ? 0.45 : 1));
  const dot = (x, y, rad, colour, alpha) => {
    if ( v8 ) { g.circle(x, y, rad); g.fill({color: hex(colour), alpha}); }
    else { g.beginFill(hex(colour), alpha); g.drawCircle(x, y, rad); g.endFill(); }
  };
  const line = (x1, y1, x2, y2, width, colour, alpha) => {
    if ( v8 ) { g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke({width, color: hex(colour), alpha}); }
    else { g.lineStyle(width, hex(colour), alpha); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineStyle(0); }
  };
  const around = (k, f) => { for ( let i = 0; i < k; i++ ) { const a = (i / k) * Math.PI * 2 + i * 0.37; f(a, i); } };
  if ( draw.shift ) around(10, a => dot(cx + Math.cos(a) * r * 1.05, cy + Math.sin(a) * r * 1.05, r * 0.07, draw.shift, 0.45));
  for ( const p of draw.patterns ) {
    if ( p === "blotches" ) around(7, a => dot(cx + Math.cos(a) * r * 1.15, cy + Math.sin(a) * r * 1.15, r * 0.12, "#e6e6e6", 0.55));
    if ( p === "sparkles" ) around(36, (a, i) => dot(cx + Math.cos(a) * r * (0.95 + (i % 5) * 0.08), cy + Math.sin(a) * r * (0.95 + (i % 5) * 0.08), r * 0.025, "#ffffff", 0.9));
    if ( p === "rainbow" ) ["#e64a2e", "#ecd84a", "#3caa48", "#2f5fd0", "#a35de0"].forEach((c, i) => around(4, a => dot(cx + Math.cos(a + i * 0.25) * r * 1.3, cy + Math.sin(a + i * 0.25) * r * 1.3, r * 0.05, c, 0.75)));
    if ( p === "veins" ) around(8, a => line(cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.7, cx + Math.cos(a + 0.2) * r * 1.45, cy + Math.sin(a + 0.2) * r * 1.45, r * 0.03, "#000000", 0.85));
    if ( p === "ripples" ) for ( let i = 1; i <= 3; i++ ) ring(r * (1.25 + i * 0.12), r * 0.02, base, 0.7);
    if ( p === "mottled" ) around(14, (a, i) => dot(cx + Math.cos(a) * r * (0.9 + (i % 3) * 0.15), cy + Math.sin(a) * r * (0.9 + (i % 3) * 0.15), r * 0.09, Object.values(MOODS)[(i * 5) % 22].hex, 0.4));
  }
  canvas.interface.addChild(g);
  const timer = setTimeout(() => clearAura(token.id), seconds * 1000);
  overlays.set(token.id, {g, timer});
  lastDraw.ms = performance.now() - t0;
  return lastDraw.ms;
}

export function clearAura(tokenId) {
  const o = overlays.get(tokenId);
  if ( !o ) return;
  clearTimeout(o.timer);
  o.g.destroy?.();
  overlays.delete(tokenId);
}

/* -------------------------------------------- */
/*  The action                                  */
/* -------------------------------------------- */

const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/**
 * Read the Soul: the controlled token reads the targeted one.
 * @returns {Promise<object|null>} The reading, or null when nothing was rolled
 */
export async function readTheSoul({reader, target} = {}) {
  reader ??= canvas?.tokens?.controlled?.[0]?.document ?? null;
  target ??= [...(game.user.targets ?? [])][0]?.document ?? null;
  if ( !reader?.actor ) return ui.notifications.warn("Select the reader's token first."), null;
  if ( !target?.actor ) return ui.notifications.warn("Target the one whose soul is read (T over their token)."), null;
  if ( target === reader ) return ui.notifications.warn("Target someone other than the reader."), null;
  const actor = reader.actor;
  const auspex = auspexOf(actor);
  const pool = poolOf(actor);
  const {DialogV2} = foundry.applications.api;
  const choice = await DialogV2.prompt({
    classes: ["wodx", "wodx-dialog"],
    window: {title: "Read the Soul"},
    content: `<p><strong>${esc(reader.name)}</strong> studies <strong>${esc(target.name)}</strong>.</p>
      <p>Auspex ${auspex}${auspex < 2 ? " (Read the Soul needs Auspex 2)" : ""}. Perception + Empathy: ${pool} dice at difficulty ${SOUL_DIFFICULTY} (${SOURCE}).</p>
      ${game.user.isGM ? `<div class="form-group"><label><input type="checkbox" name="override"> Storyteller: allow it without Auspex 2</label></div>` : ""}
      <div class="form-group"><label>Extra dice or penalty</label><input type="number" name="mod" value="0" min="-5" max="5" step="1"></div>
      <p class="wodx-quiet">The roll goes to the Storyteller only. You see what the soul shows you.</p>`,
    ok: {label: "Gaze", callback: (event, button) => ({override: !!button.form.elements.override?.checked, mod: Number(button.form.elements.mod.value) || 0})},
    rejectClose: false
  });
  if ( !choice ) return null;
  if ( auspex < 2 && !choice.override ) return ui.notifications.warn(`${reader.name} needs Auspex 2 to Read the Soul.`), null;
  const dice = Math.max(1, pool + choice.mod);
  const roll = await new Roll(`${dice}d10`).evaluate();
  const faces = roll.dice[0]?.results.map(r => r.result) ?? [];
  const result = countRoll(faces, SOUL_DIFFICULTY);
  const r = reading(target.actor, result.success ? result.net : 0, {botch: result.botch});
  const gms = game.users.filter(u => u.isGM).map(u => u.id);
  await ChatMessage.create({
    whisper: gms, blind: true, speaker: ChatMessage.getSpeaker({token: reader}), rolls: [roll],
    content: `<div class="wodx-card wodx-crossing"><h3>Read the Soul</h3>
      <p><strong>${esc(reader.name)}</strong> reads <strong>${esc(target.name)}</strong>: ${dice} dice at ${SOUL_DIFFICULTY}: ${faces.join(", ")}</p>
      <p>${result.botch ? "<strong>Botch: the player was shown a false reading.</strong>" : `${result.net > 0 ? result.net : 0} success(es)`}</p>
      <ul>${r.lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul></div>`
  });
  if ( !game.user.isGM ) {
    await ChatMessage.create({
      whisper: [game.user.id], speaker: ChatMessage.getSpeaker({token: reader}),
      content: `<div class="wodx-card"><h3>${esc(target.name)}'s soul</h3><ul>${r.lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul></div>`
    });
  }
  r.ms = drawAura(target.object ?? target, r.draw);
  if ( r.ms !== null ) console.debug(`WoDX | aura drawn in ${r.ms.toFixed(2)} ms`);
  return {...r, faces, result};
}

/** Storyteller: set what a character's soul shows. */
export async function editAura(actor) {
  if ( !game.user.isGM || !actor ) return null;
  const a = auraOf(actor);
  const moodOptions = sel => `<option value="">None</option>` + Object.entries(MOODS).map(([k, m]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${esc(m.colour)}: ${esc(m.condition)}</option>`).join("");
  const natureOptions = `<option value="">From the sheet (${esc(NATURES[sheetNature(actor)].label)})</option>` +
    Object.entries(NATURES).map(([k, n]) => `<option value="${k}" ${k === a.nature ? "selected" : ""}>${esc(n.label)}</option>`).join("");
  const {DialogV2} = foundry.applications.api;
  const data = await DialogV2.prompt({
    classes: ["wodx", "wodx-dialog"],
    window: {title: `Aura: ${actor.name}`},
    content: `<p class="wodx-quiet">What Read the Soul shows (${SOURCE}). Frenzy is read from the sheet.</p>
      <div class="form-group"><label>Main colour</label>${searchBox("select[name=mood]", "Search colours…", "Search colours")}<select name="mood">${moodOptions(a.mood)}</select></div>
      <div class="form-group"><label>Subtle shift (4 successes)</label>${searchBox("select[name=shift]", "Search colours…", "Search colours")}<select name="shift">${moodOptions(a.shift)}</select></div>
      <div class="form-group"><label>Kind of soul</label><select name="nature" data-fixed>${natureOptions}</select></div>
      <div class="form-group"><label><input type="checkbox" name="diablerist" ${a.diablerist ? "checked" : ""}> Black veins (diablerist)</label></div>
      <div class="form-group"><label><input type="checkbox" name="confused" ${a.confused ? "checked" : ""}> Mottled, shifting (confused)</label></div>
      <div class="form-group"><label>Mixture (5 successes)</label><input type="text" name="mixture" value="${esc(a.mixture)}" placeholder="What the finest reading shows"></div>`,
    ok: {label: "Save", callback: (event, button) => {
      const f = button.form.elements;
      return {mood: f.mood.value || null, shift: f.shift.value || null, nature: f.nature.value || null,
        diablerist: f.diablerist.checked, confused: f.confused.checked, mixture: f.mixture.value.slice(0, 500)};
    }},
    rejectClose: false
  });
  if ( !data ) return null;
  await actor.setFlag(MODULE_ID, "aura", data);
  return data;
}
