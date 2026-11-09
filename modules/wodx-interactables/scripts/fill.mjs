/**
 * WoDX Interactables 0.17.0: fill a container by place and era. The rules are in fill-rules.mjs.
 *
 * Storyteller only, and only when asked: a button in the tile's config window ("Fill by place and era…") reads the
 * index of WoDX Library's compendium "WoDX · Gear by era", draws for the chronicle's era, and shows the draw to keep,
 * drop or draw again. What is kept is added to the container's "Inside" list as compendium links; nothing is saved
 * until the config window is saved. Nothing runs on players' machines.
 */
import * as F from "./fill-rules.mjs";

const MOD = "wodx-interactables";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const eraNow = () => game.modules.get("wodx-chronicle")?.api?.eras?.activeEra?.()?.profile?.id ?? null;
const eraName = id => game.modules.get("wodx-chronicle")?.api?.eras?.getProfile?.(id)?.name ?? id ?? "any era";
const opt = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${k}"${k === sel ? " selected" : ""}>${esc(v.label ?? v)}</option>`).join("");

/** The gear compendium's index, as plain items with their links. Empty when WoDX Library has not made it. */
export async function gearIndex() {
  const pack = game.packs.get("world.wodx-gear") ?? game.packs.find(p => p.metadata?.name === "wodx-gear");
  if ( !pack ) return [];
  const idx = await pack.getIndex({fields: ["flags.wodx-library", "system.conceal", "type"]});
  return [...idx].map(e => ({name: e.name, type: e.type, uuid: e.uuid ?? `Compendium.${pack.collection}.Item.${e._id}`, flags: e.flags ?? {}, system: e.system ?? {}}));
}

/** Draw for a container. opts: {place, count, era, container, items, rng}. Returns the drawn items. */
export async function drawFor(opts = {}) {
  const items = opts.items ?? await gearIndex();
  return F.draw(items, {era: opts.era === undefined ? eraNow() : opts.era, place: opts.place, container: opts.container, count: opts.count, rng: opts.rng});
}

/**
 * The Storyteller's window. tile: the TileDocument; field: the "Inside" textarea of an open config window, which
 * gets the kept lines (else they go straight on the tile). Returns the links kept, or null.
 */
export async function fillDialog(tile, field = null) {
  if ( !game.user.isGM ) return null;
  const items = await gearIndex();
  if ( !items.length ) { ui.notifications.warn("Gear by era isn't installed yet. Open Gear by era once (WoDX Library) and try again."); return null; }
  const container = field?.form?.querySelector?.(`[name="flags.${MOD}.kind"]`)?.value ?? tile?.flags?.[MOD]?.kind ?? "chest";
  const era = eraNow();
  const ask = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 460}, window: {title: "Fill by place and era"}, classes: ["wodx-dialog", "wix-fill"],
    content: `<p>Draws from Gear by era for ${esc(eraName(era))}. You see the draw before anything goes in.</p>
      <div class="form-group"><label>The place</label><select name="place" data-fixed>${opt(F.PLACES, "home")}</select></div>
      <div class="form-group"><label>How many things</label><input type="number" name="count" value="3" min="1" max="12"></div>
      ${F.SMALL.has(container) ? "<p class=\"hint\">A small container: only what hides in a coat or smaller.</p>" : ""}`,
    buttons: [{action: "draw", label: "Draw", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "cancel", label: "Cancel"}]});
  if ( !ask || ask === "cancel" ) return null;
  for ( let tries = 0; tries < 20; tries++ ) {
    const got = F.draw(items, {era, place: ask.place, container, count: Number(ask.count) || 3});
    if ( !got.length ) { ui.notifications.info("Nothing in Gear by era fits that place and era."); return null; }
    const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 520}, window: {title: "The draw"}, classes: ["wodx-dialog", "wix-fill-review"],
      content: `<p>Untick what doesn't belong here.</p><ul class="wix-fill-list" data-fixed>${got.map((g, i) => `<li><label><input type="checkbox" name="k${i}" checked> ${esc(g.name)}</label></li>`).join("")}</ul>`,
      buttons: [{action: "keep", label: "Put these in", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "again", label: "Draw again"}, {action: "cancel", label: "Cancel"}]});
    if ( res === "again" ) continue;
    if ( !res || res === "cancel" ) return null;
    const kept = got.filter((g, i) => res[`k${i}`]).map(g => g.uuid);
    if ( !kept.length ) return [];
    if ( field ) field.value = F.mergeLines(field.value, kept);
    else if ( tile ) await tile.update({[`flags.${MOD}.items`]: F.mergeLines(tile.flags?.[MOD]?.items, kept)});
    return kept;
  }
  return null;
}
