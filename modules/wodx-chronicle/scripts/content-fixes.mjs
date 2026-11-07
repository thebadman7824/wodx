import {MODULE_ID, isActiveGM, log, setting, setSetting} from "./util.mjs";
import * as approvals from "./approvals.mjs";

/**
 * One-off repairs to world content that WoDX found broken. Each fix is proposed in the approval queue;
 * nothing changes until the Storyteller approves it.
 *
 * tile-anchors-v14: Foundry 14 places a tile by its anchor point (the centre, by default). Foundry 13 and the
 * Rothenstein importers placed tiles by their top-left corner. Tiles written the old way show half their size up
 * and to the left of where they belong (roofs off their houses, effects off their spots, camp and haven modules
 * off their walls). The fix moves each such tile by half its size and marks it, so it is never moved twice.
 */

const FIX = "tile-anchors-v14";
const MARK = "anchored";

/** Tile kinds that the Rothenstein importers and macros placed by their corner. */
const KINDS = [
  ["roof", t => !!t.flags?.world?.tm5?.roof],
  ["effect", t => !!(t.flags?.world?.art5 || t.flags?.world?.landingFx)],
  ["builder module", t => !!t.flags?.world?.builder?.module]
];

/** The builder macros' corner placement, and the centre placement that replaces it. */
const MACRO_EDITS = [
  ["const tile = { x: Math.round(cx - W / 2), y: Math.round(cy - H / 2),", "const tile = { x: Math.round(cx), y: Math.round(cy),"],
  ["flags: { world: { builder: { group, module: mod.key, kit, rot } } } };",
    `flags: { world: { builder: { group, module: mod.key, kit, rot } }, "${MODULE_ID}": { ${MARK}: true } } };`],
  ["const cx = t.x + W / 2, cy = t.y + H / 2;", "const cx = t.x, cy = t.y;"]
];

const kindOf = tile => KINDS.find(([, test]) => test(tile))?.[0] ?? null;

/** Does this tile still sit by its corner? */
export function needsAnchorFix(tile) {
  // Marked by this fix, or by the same fix run on a world without WoDX (the archive world)
  if ( tile.flags?.[MODULE_ID]?.[MARK] || tile.flags?.world?.wodxAnchored ) return false;
  const tex = tile.texture ?? {};
  if ( (tex.anchorX ?? 0.5) !== 0.5 || (tex.anchorY ?? 0.5) !== 0.5 ) return false;
  return !!kindOf(tile);
}

/** The corrected position: the old corner plus half the size. */
export function anchoredPosition(tile) {
  return {x: Math.round(tile.x + (tile.width / 2)), y: Math.round(tile.y + (tile.height / 2))};
}

/** Builder macro source with the corner placement replaced, or null if it has none. */
export function patchMacroCommand(command) {
  if ( typeof command !== "string" ) return null;
  let out = command;
  for ( const [from, to] of MACRO_EDITS ) out = out.replaceAll(from, to);
  return out === command ? null : out;
}

/** What the fix would change right now. */
export function surveyAnchors() {
  const scenes = [];
  const counts = {};
  for ( const scene of game.scenes ?? [] ) {
    const tiles = [...(scene.tiles ?? [])].filter(needsAnchorFix);
    if ( !tiles.length ) continue;
    scenes.push({scene, tiles});
    for ( const t of tiles ) counts[kindOf(t)] = (counts[kindOf(t)] ?? 0) + 1;
  }
  const macros = [...(game.macros ?? [])].filter(m => patchMacroCommand(m.command) !== null);
  const tiles = scenes.reduce((n, s) => n + s.tiles.length, 0);
  return {scenes, tiles, counts, macros};
}

function describe(survey) {
  const parts = Object.entries(survey.counts).map(([k, n]) => `${n} ${k}${n === 1 ? "" : "s"}`);
  const macroText = survey.macros.length
    ? ` It also updates ${survey.macros.length} builder macro${survey.macros.length === 1 ? "" : "s"} (${survey.macros.map(m => m.name).join(", ")}) so new modules are placed the same way.`
    : "";
  return `${survey.tiles} tiles in ${survey.scenes.length} scenes (${parts.join(", ") || "none"}) sit up and to the left of where they belong, `
    + `by half their own size. Foundry 14 places a tile by its centre; these were placed by their corner. `
    + `Approving moves each one by half its size.${macroText} Nothing else changes.`;
}

/** Apply the fix. Returns the number of tiles moved and macros updated. */
export async function applyAnchorFix() {
  const survey = surveyAnchors();
  let moved = 0;
  for ( const {scene, tiles} of survey.scenes ) {
    const updates = tiles.map(t => ({_id: t.id, ...anchoredPosition(t), [`flags.${MODULE_ID}.${MARK}`]: true}));
    await scene.updateEmbeddedDocuments("Tile", updates);
    moved += updates.length;
  }
  let patched = 0;
  for ( const macro of survey.macros ) {
    const command = patchMacroCommand(macro.command);
    if ( command === null ) continue;
    await macro.update({command});
    patched++;
  }
  log(`Tile anchor fix: moved ${moved} tiles, updated ${patched} macros`);
  ui.notifications.info(`WoDX: moved ${moved} tiles into place${patched ? ` and updated ${patched} builder macros` : ""}.`);
  return {moved, patched};
}

export function registerContentFixes() {
  approvals.registerHandler(FIX, {
    label: "Content fix",
    approve: async () => {
      await applyAnchorFix();
      const declined = {...(setting("declinedFixes") ?? {})};
      delete declined[FIX];
      await setSetting("declinedFixes", declined);
    },
    // Not asked again until the number of tiles or macros needing it changes (a re-import, say)
    reject: async req => {
      await setSetting("declinedFixes", {...(setting("declinedFixes") ?? {}), [FIX]: req.data?.signature ?? ""});
    }
  });
}

/** Active GM, on ready: propose the fix if anything needs it. */
export async function checkContentFixes() {
  if ( !isActiveGM() ) return;
  if ( (game.release?.generation ?? 14) < 14 ) return;
  const survey = surveyAnchors();
  if ( !survey.tiles && !survey.macros.length ) return;
  const signature = `${survey.tiles}:${survey.macros.length}`;
  if ( setting("declinedFixes")?.[FIX] === signature ) return;
  await approvals.propose({type: FIX, key: FIX, title: "Fix tile positions for Foundry 14", detail: describe(survey), data: {signature}});
}
