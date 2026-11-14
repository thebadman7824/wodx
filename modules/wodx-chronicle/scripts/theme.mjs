/**
 * The WoDX look (Phase 6e, B51): each player's own choice of look, text size and motion, and the marks on <body> that
 * styles/wodx-theme.css reads. The era kit itself is set by eras.applyProfile (body[data-wodx-kit]).
 *
 *   body.wodx-look            the look is on (off for "Plain")
 *   body[data-wodx-look]      era | light | dark
 *   body[data-wodx-tone]      light | dark: which line accents to use (from the kit, or from the look chosen)
 *   body[data-wodx-motion]    auto | reduce | full
 *   --wx-scale                text size (1, 1.15, 1.3, 1.5)
 */
import {MODULE_ID} from "./util.mjs";

/** The look's version (the module's own version is read by Foundry only when its server starts). */
export const LOOK_VERSION = "0.4.0";

/** The paper each era kit is printed on. */
export const KIT_TONE = {
  "dark-ages": "light", "long-night": "light", "renaissance": "light", "age-of-reason": "light", "classical": "light", "living-gods": "light",
  "mythic-age": "light", "bronze-kings": "light", "iron-dawn": "light", "greece-republic": "light", "roman-empire": "light", "migration-age": "light", "premyslid-duchy": "light",
  "victorian": "light", "wild-west": "light", "great-war": "light", "mid-century": "light",
  "modern": "dark", "time-of-judgment": "dark", "future-darkness": "dark", "time-of-future-judgement": "dark"
};
export const LOOKS = {era: "The era's own look", light: "Light paper, the era's type", dark: "Dark paper, the era's type", plain: "Plain (Foundry's own look)"};
export const SIZES = {"1": "Normal", "1.15": "Large", "1.3": "Larger", "1.5": "Largest"};
export const MOTION = {auto: "Follow the computer's setting", reduce: "Reduce motion", full: "Full motion"};

/** Which accents a kit and a look call for. Pure. */
export function toneFor(kit, look, foundryDark = true) {
  if ( look === "light" || look === "dark" ) return look;
  if ( look === "plain" ) return foundryDark ? "dark" : "light";
  return KIT_TONE[kit] ?? "dark";
}

const get = key => { try { return game.settings.get(MODULE_ID, key); } catch { return undefined; } };

/**
 * Foundry reads a module's list of stylesheets when its server starts, so after an update the new sheet can be missing
 * until the next restart. Add it to the page if it is not there.
 */
export function ensureStyles(doc = globalThis.document) {
  if ( !doc?.head || [...doc.styleSheets].some(s => /wodx-theme\.css/.test(s.href ?? "")) || doc.getElementById("wodx-theme-css") ) return false;
  const link = doc.createElement("link");
  link.id = "wodx-theme-css";
  link.rel = "stylesheet";
  link.href = `modules/${MODULE_ID}/styles/wodx-theme.css`;
  doc.head.append(link);
  return true;
}

/** Write the marks on <body>. Safe to call at any time. */
export function applyLook(doc = globalThis.document) {
  const body = doc?.body;
  if ( !body ) return;
  try { ensureStyles(doc); } catch (e) { console.warn("WoDX | theme styles", e); }
  const look = get("look") ?? "era";
  const size = Number(get("textSize") ?? 1) || 1;
  const motion = get("motion") ?? "auto";
  body.classList.toggle("wodx-look", look !== "plain");
  body.dataset.wodxLook = look;
  body.dataset.wodxTone = toneFor(body.dataset.wodxKit, look, body.classList.contains("theme-dark") || !body.classList.contains("theme-light"));
  body.dataset.wodxMotion = motion;
  body.style.setProperty("--wx-scale", String(size));
}

/** Client settings: each player picks for themselves. Runs inside init. */
export function registerThemeSettings() {
  const onChange = () => applyLook();
  game.settings.register(MODULE_ID, "look", {
    name: "WoDX look", hint: "How WoDX windows and chat cards look on this computer. The era's own look follows the chronicle's era (manuscript for the Dark Ages, typewriter for the Great War, neon for the Modern nights). Plain leaves Foundry's own look.",
    scope: "client", config: true, type: String, choices: LOOKS, default: "era", onChange
  });
  game.settings.register(MODULE_ID, "textSize", {
    name: "WoDX text size", hint: "Text size in WoDX windows and chat cards on this computer.",
    scope: "client", config: true, type: String, choices: SIZES, default: "1", onChange
  });
  game.settings.register(MODULE_ID, "motion", {
    name: "WoDX motion", hint: "Fades and highlights in WoDX windows. Reduce turns them off.",
    scope: "client", config: true, type: String, choices: MOTION, default: "auto", onChange
  });
  Hooks.on("wodxEraApplied", () => applyLook());
}
