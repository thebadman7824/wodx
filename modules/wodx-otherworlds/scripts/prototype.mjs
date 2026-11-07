import {MODULE_ID} from "./ratings.mjs";

const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/**
 * Phase 2 prototype: a copy of a scene with a second Scene Level for the Penumbra, so lighting, sound and sight
 * can be checked per layer before Phase 5 builds twin maps for real. The original scene is never changed.
 * Stepping sideways on a scene with a Penumbra level moves the token onto that level.
 */
export async function buildPenumbraPrototype(scene = canvas?.scene) {
  if ( !game.user.isGM ) return;
  if ( !scene ) return ui.notifications.warn("View the scene to copy first.");
  const {DialogV2} = foundry.applications.api;
  const ok = await DialogV2.confirm({
    window: {title: "Penumbra prototype"},
    content: `<p>Make a copy of <strong>${esc(scene.name)}</strong> with a second level for the Penumbra? The original scene is not changed.</p>
      <p>The copy's Penumbra level reuses the map with a pale silver tint and keeps it at night. It is a test of Foundry's Scene Levels, not the finished Penumbra art (Phase 5).</p>`,
    rejectClose: false
  });
  if ( !ok ) return;

  const copy = await scene.clone({name: `Prototype · Penumbra · ${scene.name}`, active: false, navigation: false,
    flags: {[MODULE_ID]: {prototypeOf: scene.id}}}, {save: true});
  const physical = copy.levels.contents[0] ?? copy.firstLevel;
  if ( !physical ) {
    ui.notifications.error("The copied scene has no level to build on.");
    return copy;
  }
  await physical.setFlag(MODULE_ID, "layer", "physical");
  const src = physical.toObject();
  const fallbackSpan = (copy.grid?.distance ?? 5) * 4;
  const hasTop = Number.isFinite(physical.elevation.top);
  const span = hasTop ? ((physical.elevation.top - (physical.elevation.bottom ?? 0)) || fallbackSpan) : fallbackSpan;
  // A physical level open to the sky would overlap the Penumbra's elevations; give it a ceiling in the copy
  if ( !hasTop ) await physical.update({"elevation.top": (physical.elevation.bottom ?? 0) + span});
  const bottom = 1000;
  await copy.createEmbeddedDocuments("Level", [{
    name: "Penumbra",
    elevation: {bottom, top: bottom + span},
    background: {src: src.background?.src ?? null, color: src.background?.color ?? "#000000", tint: "#a9b8d8"},
    foreground: {src: src.foreground?.src ?? null, tint: "#a9b8d8"},
    textures: src.textures ?? {},
    flags: {[MODULE_ID]: {layer: "penumbra"}}
  }]);
  ui.notifications.info(`Made "${copy.name}". Step sideways there to test moving between levels.`);
  return copy;
}
